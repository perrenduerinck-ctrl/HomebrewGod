import {
  createEffectId,
  normalizeEffectAnimation,
  normalizeEffectInstance,
  normalizeEffectModifier
} from "./effectModel.js";
import {
  getEffectExpirationReason,
  prepareEffectDuration
} from "./effectDuration.js";

const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
const text = (value) => String(value ?? "").trim();

export function createEffectRuntime({
  registry,
  onChange = () => {},
  onVisual = () => {}
} = {}) {
  if (!registry?.get) throw new Error("Effect runtime requires an effect registry.");
  const records = new Map();
  const pendingExpirations = new Map();

  function snapshot() {
    return [...records.values()]
      .filter((record) => !pendingExpirations.has(record.id))
      .map((record) => clone(record));
  }

  function emit(reason, detail = null) {
    const value = snapshot();
    try { onChange(value, reason, detail ? clone(detail) : null); } catch {}
    return value;
  }

  function visual(record, phase) {
    try {
      Promise.resolve(onVisual(clone(record), phase)).catch(() => {});
    } catch {
      // Presentation failure never changes authoritative gameplay state.
    }
  }

  function applyEffect(input = {}, context = {}) {
    const definition = registry.get(input.definitionId);
    const definitionId = text(definition?.id || input.definitionId || `custom:${createEffectId("definition")}`);
    const modifiers = [
      ...(definition?.modifiers || []),
      ...(Array.isArray(input.modifiers) ? input.modifiers : [])
    ].map(normalizeEffectModifier).filter(Boolean).slice(0, 24);
    const animation = normalizeEffectAnimation({
      ...(definition?.animation || {}),
      ...(input.animation || {})
    });
    const targetTokenId = text(input.targetTokenId);
    const sourceId = text(input.sourceId);
    const duration = prepareEffectDuration(input.duration, {
      initiative: context.initiative,
      worldTime: context.worldTime,
      sourceTokenId: sourceId,
      targetTokenId
    });
    const record = normalizeEffectInstance({
      ...input,
      id: input.id || createEffectId(),
      definitionId,
      name: input.name || definition?.name,
      type: input.type || definition?.type,
      icon: input.icon || definition?.icon,
      description: input.description || definition?.description,
      tags: [...(definition?.tags || []), ...(Array.isArray(input.tags) ? input.tags : [])],
      modifiers,
      animation,
      duration,
      createdAtMillis: input.createdAtMillis || Date.now(),
      updatedAtMillis: Date.now()
    });
    if (!record) throw new Error("Choose a named effect, room, and target token.");
    pendingExpirations.delete(record.id);
    records.set(record.id, record);
    emit("applied", record);
    visual(record, "start");
    if (record.animation.sustainAnimationId) visual(record, "sustain");
    return clone(record);
  }

  function removeEffect(id, reason = "removed", { visualPhase = true, emitChange = true } = {}) {
    const record = records.get(text(id));
    if (!record) return false;
    pendingExpirations.delete(record.id);
    records.delete(record.id);
    if (visualPhase) visual(record, "end");
    if (emitChange) emit(reason, record);
    return true;
  }

  function hydrate(values = [], { replace = true } = {}) {
    const incoming = new Map();
    for (const value of Array.isArray(values) ? values : []) {
      const record = normalizeEffectInstance(value);
      if (record) incoming.set(record.id, record);
    }
    const added = [];
    const removed = [];
    for (const [id, record] of incoming) {
      const previous = records.get(id);
      if (
        !pendingExpirations.has(id) &&
        (!previous || JSON.stringify(previous) !== JSON.stringify(record))
      ) added.push(record);
      records.set(id, record);
    }
    if (replace) {
      for (const [id, record] of [...records]) {
        if (incoming.has(id)) continue;
        records.delete(id);
        if (pendingExpirations.has(id)) pendingExpirations.delete(id);
        else removed.push(record);
      }
    }
    for (const record of added) {
      if (record.animation.sustainAnimationId) visual(record, "sustain");
    }
    for (const record of removed) visual(record, "end");
    return emit("hydrated", { added, removed });
  }

  function reconcile(context = {}, { canExpire = true } = {}) {
    if (!canExpire) return [];
    const expired = [];
    for (const record of records.values()) {
      if (pendingExpirations.has(record.id)) continue;
      const reason = getEffectExpirationReason(record, context);
      if (reason) expired.push({ record, reason });
    }
    for (const { record, reason } of expired) {
      pendingExpirations.set(record.id, { record, reason });
      visual(record, "end");
      emit("expiration-pending", { ...record, expirationReason: reason });
    }
    return expired.map(({ record, reason }) => ({ id: record.id, reason }));
  }

  return Object.freeze({
    applyEffect,
    removeEffect,
    confirmExpiration(id, reason = "duration-expired") {
      if (!pendingExpirations.has(text(id))) return false;
      return removeEffect(id, reason, { visualPhase: false, emitChange: true });
    },
    getPendingExpirations: () => [...pendingExpirations.values()].map(({ record, reason }) => ({
      record: clone(record),
      reason
    })),
    hydrate,
    reconcile,
    getSnapshot: snapshot,
    getById: (id) => clone(records.get(text(id)) || null),
    getForToken: (tokenId) => snapshot().filter((record) => record.targetTokenId === text(tokenId)),
    clear(reason = "cleared", { visualPhase = false, emitChange = false } = {}) {
      for (const id of [...records.keys()]) {
        removeEffect(id, reason, { visualPhase, emitChange: false });
      }
      pendingExpirations.clear();
      if (emitChange) emit(reason);
    }
  });
}
