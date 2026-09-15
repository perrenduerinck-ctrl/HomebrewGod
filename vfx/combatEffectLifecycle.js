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
  return {
    combatActive: source.combatActive === true,
    roundNumber: Math.max(1, Math.round(number(source.roundNumber, 1))),
    currentTurnIndex: Math.max(0, Math.round(number(source.currentTurnIndex, 0))),
    initiativeOrder: Array.isArray(source.initiativeOrder)
      ? source.initiativeOrder.map((entry) => text(entry?.tokenId || entry?.id)).filter(Boolean)
      : []
  };
}

function turnOrdinal(initiative) {
  const state = initiativeSnapshot(initiative);
  const turnsPerRound = Math.max(1, state.initiativeOrder.length);
  return (state.roundNumber - 1) * turnsPerRound + state.currentTurnIndex;
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
    createdAtMillis: record.createdAtMillis
  };
}

/**
 * Reconciles visual Sustain/End stages with the authoritative campaign clock,
 * initiative cursor, concentration, statuses and token existence. The host may
 * persist getSnapshot(); controller handles deliberately stay local.
 */
export function createCombatEffectLifecycle({
  onChange = () => {},
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
      createdAtMillis: number(input.createdAtMillis, Date.now())
    };
    records.set(id, record);
    emit("started", record);
    return Object.freeze({ ...serializable(record) });
  }

  function endEffect(id, reason = "manual") {
    const record = records.get(text(id));
    if (!record) return false;
    records.delete(record.id);
    try { record.controller?.end?.(); } catch {}
    emit(reason, record);
    return true;
  }

  function reconcile(context = {}) {
    const worldTime = number(context.worldTime, 0);
    const initiative = initiativeSnapshot(context.initiative);
    const currentTurn = turnOrdinal(initiative);
    const concentrationKeys = context.concentrationKeys == null
      ? null
      : new Set(Array.from(context.concentrationKeys, (entry) => text(entry)));
    const concentrationByActor = context.concentrationByActor || null;
    const tokenIds = context.tokenIds == null
      ? null
      : new Set(Array.from(context.tokenIds, (entry) => text(entry)));
    const statusesByTokenId = context.statusesByTokenId || null;
    const ended = [];

    for (const record of records.values()) {
      let reason = "";
      if (record.concentrationKey && concentrationKeys && !concentrationKeys.has(record.concentrationKey)) {
        reason = "concentration-ended";
      } else if (record.concentrationKey && concentrationByActor) {
        const actorId = record.concentrationKey.split(":", 1)[0];
        if (
          Object.prototype.hasOwnProperty.call(concentrationByActor, actorId) &&
          text(concentrationByActor[actorId]) !== record.concentrationKey
        ) {
          reason = "concentration-ended";
        }
      } else if (tokenIds && record.sourceTokenId && !tokenIds.has(record.sourceTokenId)) {
        reason = "source-removed";
      } else if (record.requiredStatus && statusesByTokenId) {
        const statusTargets = record.targetTokenIds.length
          ? record.targetTokenIds
          : [record.sourceTokenId];
        const knownTargets = statusTargets.filter((tokenId) => (
          Object.prototype.hasOwnProperty.call(statusesByTokenId, tokenId)
        ));
        const remains = knownTargets.some((tokenId) => {
          const statuses = statusesByTokenId[tokenId] || [];
          return Array.from(statuses, (entry) => text(entry).toLowerCase())
            .includes(record.requiredStatus);
        });
        if (knownTargets.length && !remains) reason = "status-ended";
      }

      if (!reason && ["seconds", "minutes", "hours"].includes(record.duration.unit)) {
        const endAt = record.startedAtWorldTime +
          record.duration.value * multiplier(record.duration.unit);
        if (worldTime >= endAt) reason = "duration-ended";
      } else if (!reason && record.duration.unit === "rounds" && initiative.combatActive) {
        if (initiative.roundNumber >= record.startedAtRound + record.duration.value) {
          reason = "rounds-ended";
        }
      } else if (!reason && record.duration.unit === "turns" && initiative.combatActive) {
        if (currentTurn >= record.startedAtTurnOrdinal + record.duration.value) {
          reason = "turns-ended";
        }
      }

      if (reason) {
        ended.push({ id: record.id, reason });
      }
    }

    ended.forEach(({ id, reason }) => endEffect(id, reason));
    return ended;
  }

  function hydrate(values = [], { restoreController = null } = {}) {
    for (const value of Array.isArray(values) ? values.slice(0, 128) : []) {
      const duration = normalizeEffectDuration(value?.duration);
      const id = text(value?.id);
      if (!id || !duration) continue;
      records.set(id, {
        id,
        controller: typeof restoreController === "function"
          ? restoreController(value)
          : null,
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
        createdAtMillis: number(value.createdAtMillis, Date.now())
      });
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
    clear(reason = "cleared") {
      [...records.keys()].forEach((id) => endEffect(id, reason));
    }
  });
}
