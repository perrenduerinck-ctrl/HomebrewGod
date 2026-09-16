import { normalizeEffectDuration } from "./combatPresentationSystem.js";

function text(value, fallback = "") {
  return String(value ?? fallback).trim() || fallback;
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function initiativeSnapshot(value = {}) {
  const source = value.initiativeState || value;
  const derivedTurn = (Math.max(1, Math.round(number(source.roundNumber, 1))) - 1) *
    Math.max(1, Array.isArray(source.initiativeOrder) ? source.initiativeOrder.length : 0) +
    Math.max(0, Math.round(number(source.currentTurnIndex, 0)));
  return {
    combatActive: source.combatActive === true,
    roundNumber: Math.max(1, Math.round(number(source.roundNumber, 1))),
    currentTurnIndex: Math.max(0, Math.round(number(source.currentTurnIndex, 0))),
    turnCounter: Math.max(0, Math.round(number(source.turnCounter, derivedTurn))),
    initiativeOrder: Array.isArray(source.initiativeOrder)
      ? source.initiativeOrder.map((entry) => text(entry?.tokenId || entry?.id)).filter(Boolean)
      : []
  };
}

function turnOrdinal(initiative) {
  const state = initiativeSnapshot(initiative);
  return state.turnCounter;
}

function multiplier(unit) {
  return {
    seconds: 1,
    minutes: 60,
    hours: 3600
  }[unit] || 1;
}

function serializable(record) {
  return {
    id: record.id,
    contentId: record.contentId,
    contentName: record.contentName,
    sourceTokenId: record.sourceTokenId,
    targetTokenIds: [...record.targetTokenIds],
    duration: record.duration,
    startedAtWorldTime: record.startedAtWorldTime,
    startedAtRound: record.startedAtRound,
    startedAtTurnOrdinal: record.startedAtTurnOrdinal,
    concentrationKey: record.concentrationKey,
    requiredStatus: record.requiredStatus,
    createdAtMillis: record.createdAtMillis,
    createdByUid: record.createdByUid,
    roomCode: record.roomCode,
    animation: record.animation ? structuredClone(record.animation) : null,
    automationState: record.automationState ? structuredClone(record.automationState) : null,
    sourcePoint: record.sourcePoint ? { ...record.sourcePoint } : null,
    targetPoints: record.targetPoints.map((point) => ({ ...point }))
  };
}

export function getCombatEffectEndReason(record = {}, context = {}) {
  const duration = normalizeEffectDuration(record.duration);
  if (!duration) return "invalid-duration";
  const worldTime = number(context.worldTime, 0);
  const initiative = initiativeSnapshot(context.initiative);
  const concentrationKeys = context.concentrationKeys == null
    ? null
    : new Set(Array.from(context.concentrationKeys, (entry) => text(entry)));
  const concentrationByActor = context.concentrationByActor || null;
  const tokenIds = context.tokenIds == null
    ? null
    : new Set(Array.from(context.tokenIds, (entry) => text(entry)));
  const statusesByTokenId = context.statusesByTokenId || null;

  if (record.concentrationKey && concentrationKeys && !concentrationKeys.has(record.concentrationKey)) {
    return "concentration-ended";
  }
  if (record.concentrationKey && concentrationByActor) {
    const actorId = record.concentrationKey.split(":", 1)[0];
    if (
      Object.prototype.hasOwnProperty.call(concentrationByActor, actorId) &&
      text(concentrationByActor[actorId]) !== record.concentrationKey
    ) return "concentration-ended";
  }
  if (tokenIds && record.sourceTokenId && !tokenIds.has(record.sourceTokenId)) {
    return "source-removed";
  }
  if (record.requiredStatus && statusesByTokenId) {
    const statusTargets = record.targetTokenIds?.length
      ? record.targetTokenIds
      : [record.sourceTokenId];
    const knownTargets = statusTargets.filter((tokenId) => (
      Object.prototype.hasOwnProperty.call(statusesByTokenId, tokenId)
    ));
    const remains = knownTargets.some((tokenId) => (
      Array.from(statusesByTokenId[tokenId] || [], (entry) => text(entry).toLowerCase())
        .includes(record.requiredStatus)
    ));
    if (knownTargets.length && !remains) return "status-ended";
  }
  if (["seconds", "minutes", "hours"].includes(duration.unit)) {
    const endAt = number(record.startedAtWorldTime, 0) + duration.value * multiplier(duration.unit);
    if (worldTime >= endAt) return "duration-ended";
  } else if (duration.unit === "rounds" && initiative.combatActive) {
    if (initiative.roundNumber >= number(record.startedAtRound, 1) + duration.value) {
      return "rounds-ended";
    }
  } else if (duration.unit === "turns" && initiative.combatActive) {
    if (turnOrdinal(initiative) >= number(record.startedAtTurnOrdinal, 0) + duration.value) {
      return "turns-ended";
    }
  }
  return "";
}

/**
 * Reconciles visual Sustain/End stages with the authoritative campaign clock,
 * initiative cursor, concentration, statuses and token existence. The host may
 * persist getSnapshot(); controller handles deliberately stay local.
 */
export function createCombatEffectLifecycle({
  onChange = () => {},
  onEnd = () => {},
  idFactory = () => `combat-effect-${globalThis.crypto?.randomUUID?.() || Date.now()}`
} = {}) {
  const records = new Map();

  function emit(reason, record = null) {
    const snapshot = getSnapshot();
    try { onChange(snapshot, reason, record ? serializable(record) : null); } catch {}
    return snapshot;
  }

  function startEffect(input = {}) {
    const duration = normalizeEffectDuration(input.duration);
    if (!duration) return null;
    const initiative = initiativeSnapshot(input.initiative);
    const id = text(input.id, idFactory());
    if (records.has(id)) endEffect(id, "replaced");
    const record = {
      id,
      controller: input.controller || null,
      contentId: text(input.contentId),
      contentName: text(input.contentName, "Effect"),
      sourceTokenId: text(input.sourceTokenId),
      targetTokenIds: (Array.isArray(input.targetTokenIds) ? input.targetTokenIds : [])
        .map((entry) => text(entry)).filter(Boolean).slice(0, 32),
      duration,
      startedAtWorldTime: number(input.worldTime, 0),
      startedAtRound: initiative.roundNumber,
      startedAtTurnOrdinal: turnOrdinal(initiative),
      concentrationKey: text(input.concentrationKey),
      requiredStatus: text(input.requiredStatus || duration.status).toLowerCase(),
      createdAtMillis: number(input.createdAtMillis, Date.now()),
      createdByUid: text(input.createdByUid),
      roomCode: text(input.roomCode),
      animation: input.animation ? structuredClone(input.animation) : null,
      automationState: input.automationState ? structuredClone(input.automationState) : null,
      sourcePoint: input.sourcePoint && typeof input.sourcePoint === "object"
        ? { x: number(input.sourcePoint.x), y: number(input.sourcePoint.y) }
        : null,
      targetPoints: (Array.isArray(input.targetPoints) ? input.targetPoints : [])
        .filter((point) => point && typeof point === "object")
        .map((point) => ({ x: number(point.x), y: number(point.y) }))
        .slice(0, 32)
    };
    records.set(id, record);
    emit("started", record);
    return Object.freeze({ ...serializable(record) });
  }

  function endEffect(id, reason = "manual", options = {}) {
    const record = records.get(text(id));
    if (!record) return false;
    records.delete(record.id);
    try {
      if (options.playEnd === false) record.controller?.cancel?.();
      else record.controller?.end?.();
    } catch {}
    if (options.cleanup !== false) {
      try { onEnd(serializable(record), reason); } catch {}
    }
    if (options.emit !== false) emit(reason, record);
    return true;
  }

  function reconcile(context = {}) {
    const ended = [];

    for (const record of records.values()) {
      const reason = getCombatEffectEndReason(record, context);

      if (reason) {
        ended.push({ id: record.id, reason });
      }
    }

    ended.forEach(({ id, reason }) => endEffect(id, reason));
    return ended;
  }

  function hydrate(values = [], { restoreController = null, replace = true } = {}) {
    const incoming = new Set();
    for (const value of Array.isArray(values) ? values.slice(0, 128) : []) {
      const duration = normalizeEffectDuration(value?.duration);
      const id = text(value?.id);
      if (!id || !duration) continue;
      incoming.add(id);
      const previous = records.get(id);
      const record = {
        id,
        controller: previous?.controller || null,
        contentId: text(value.contentId),
        contentName: text(value.contentName, "Effect"),
        sourceTokenId: text(value.sourceTokenId),
        targetTokenIds: (Array.isArray(value.targetTokenIds) ? value.targetTokenIds : [])
          .map((entry) => text(entry)).filter(Boolean).slice(0, 32),
        duration,
        startedAtWorldTime: number(value.startedAtWorldTime, 0),
        startedAtRound: Math.max(1, number(value.startedAtRound, 1)),
        startedAtTurnOrdinal: Math.max(0, number(value.startedAtTurnOrdinal, 0)),
        concentrationKey: text(value.concentrationKey),
        requiredStatus: text(value.requiredStatus).toLowerCase(),
        createdAtMillis: number(value.createdAtMillis, Date.now()),
        createdByUid: text(value.createdByUid),
        roomCode: text(value.roomCode),
        animation: value.animation ? structuredClone(value.animation) : null,
        automationState: value.automationState ? structuredClone(value.automationState) : null,
        sourcePoint: value.sourcePoint && typeof value.sourcePoint === "object"
          ? { x: number(value.sourcePoint.x), y: number(value.sourcePoint.y) }
          : null,
        targetPoints: (Array.isArray(value.targetPoints) ? value.targetPoints : [])
          .filter((point) => point && typeof point === "object")
          .map((point) => ({ x: number(point.x), y: number(point.y) }))
          .slice(0, 32)
      };
      if (!record.controller && typeof restoreController === "function") {
        record.controller = restoreController(serializable(record)) || null;
      }
      records.set(id, record);
    }
    if (replace) {
      for (const id of [...records.keys()]) {
        if (!incoming.has(id)) {
          endEffect(id, "remote-ended", { emit: false, cleanup: false });
        }
      }
    }
    return emit("hydrated");
  }

  function getSnapshot() {
    return [...records.values()].map(serializable);
  }

  return Object.freeze({
    startEffect,
    endEffect,
    reconcile,
    hydrate,
    getSnapshot,
    releaseControllers() {
      for (const record of records.values()) {
        try { record.controller?.cancel?.(); } catch {}
        record.controller = null;
      }
    },
    restoreControllers(restoreController) {
      if (typeof restoreController !== "function") return getSnapshot();
      for (const record of records.values()) {
        if (!record.controller) {
          record.controller = restoreController(serializable(record)) || null;
        }
      }
      return getSnapshot();
    },
    clear(reason = "cleared", options = {}) {
      [...records.keys()].forEach((id) => endEffect(id, reason, options));
    }
  });
}
