// Opt-in Animation ID assignments wrap the existing spell presentation boundary.
// Unassigned, missing and failed custom assets fall back to the legacy sequence.
import { createAnimationSequenceController } from "./animationSequence.js";
import { getSpellAnimationDependencies } from "./animationReferences.js";

export function buildSpellAnimationContext(event = {}, options = {}) {
  const point = event.targetPoint || event.casterPoint || { x: 0, y: 0 };
  const hasExplicitTarget = Object.prototype.hasOwnProperty.call(event, "targetTokenId");
  const targetTokenId = hasExplicitTarget ? event.targetTokenId || null :
    ["self", "aura"].includes(event.deliveryType) ? event.casterTokenId :
      event.geometry && !["point", "single"].includes(event.geometry.shape) ? null :
        event.affectedTokens?.[0]?.tokenId || event.affectedTokens?.[0]?.id || null;
  return {
    x: point.x,
    y: point.y,
    sourcePoint: event.casterPoint || point,
    targetPoint: event.targetPoint || point,
    sourceElevation: event.casterElevation || 0,
    targetElevation: event.targetElevation || 0,
    sourceTokenId: event.casterTokenId || null,
    targetTokenId,
    elevation: event.targetElevation || 0,
    grid: options.grid || { pixelsPerFoot: event.geometry?.pixelsPerFoot, coordinateSpace: "layer" },
    debugPoints: options.debugPoints === true,
    onEvent: options.onEvent,
    maximumDuration: Number(options.maximumDuration) || (event.preview ? 5000 : 8000),
    ...(options.duration ? { duration: options.duration } : {}),
  };
}

export function createAnimationSpellAdapter({ legacy, player, library, bindings, onStateChange = () => {} }) {
  const sequence = createAnimationSequenceController({ player });
  const active = new Map(); let nextId = 0, destroyed = false;
  const emit = () => { try { onStateChange(active.size); } catch { /* presentation observer */ } };
  function cancel(record) {
    record.controller.abort(); record.result?.cancel?.(); record.fallback?.cancel?.();
    active.delete(record.id); emit();
  }
  function play(event = {}, options = {}) {
    if (destroyed) return { ok: false, skipped: true, reason: "sequence-system-destroyed" };
    // Preserve the casting-sequence contract: Off is an intentional successful skip.
    if (player.getMode() === "off") return { ok: true, skipped: true, reason: "effects-off" };
    const reference = event.animationId ? { animationId: event.animationId } :
      event.animations ? { animations: event.animations } : bindings.getAssignment(`spell:${event.spellId}`);
    if (!reference || options.sequenceId) return legacy.play(event, options);
    const ids = getSpellAnimationDependencies(reference);
    if (!ids.length || ids.some(id => !library.getAnimation(id))) return legacy.play(event, options);
    const record = { id: `animation-cast-${++nextId}`, event, controller: new AbortController() };
    while (active.size >= 16) cancel(active.values().next().value);
    active.set(record.id, record); emit();
    const hasSustain = Boolean(reference.animations?.sustain);
    const context = { ...buildSpellAnimationContext(event, {
      ...options,
      ...(event.preview && hasSustain && !options.duration ? { duration: { unit: "seconds", value: 2 } } : {}),
    }), signal: record.controller.signal };
    const run = reference.animationId
      ? player.playSequence(ids.map(animationId => ({ animationId, duration: context.maximumDuration })), context)
      : sequence.playAnimationSequence({ ...context, animations: reference.animations });
    const ready = Promise.resolve(run).then(result => {
      if (!active.has(record.id)) { result.cancel?.(); return result; }
      record.result = result;
      if (!result.ok) {
        active.delete(record.id); emit();
        if (!["cancelled", "destroyed", "effects-off"].includes(result.reason)) {
          record.fallback = legacy.play(event, options);
          return record.fallback;
        }
      } else result.finished.finally(() => { active.delete(record.id); emit(); });
      return result;
    }).catch(error => {
      active.delete(record.id); emit();
      if (!record.controller.signal.aborted) {
        record.fallback = legacy.play(event, options);
        return record.fallback;
      }
      return { ok: false, reason: "cancelled", error };
    });
    return { ok: true, id: record.id, ready, cancel: () => cancel(record), animationId: reference.animationId || null };
  }
  return Object.freeze({ ...legacy, play,
    cancel(id, reason) { const record = active.get(id); if (record) { cancel(record); return true; } return legacy.cancel?.(id, reason) || false; },
    clear(reason) { [...active.values()].forEach(cancel); legacy.clear(reason); },
    clearPreviews() { [...active.values()].filter(r => r.event.preview).forEach(cancel); legacy.clearPreviews(); },
    getState() { const old = legacy.getState(); return { ...old, activeCount: old.activeCount + active.size,
      sequences: [...old.sequences, ...[...active.values()].map(r => ({ id: r.id, definitionId: "animation-id", phase: "animation" }))] }; },
    destroy() { if (destroyed) return; destroyed = true; [...active.values()].forEach(cancel); sequence.clear(); legacy.destroy(); }
  });
}
