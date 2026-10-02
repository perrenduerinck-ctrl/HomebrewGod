import { normalizeEffectDuration } from "./effectModel.js";

const number = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const text = (value) => String(value ?? "").trim();
const worldMultiplier = Object.freeze({ seconds: 1, minutes: 60, hours: 3600, days: 86400 });

function initiativeSnapshot(value = {}) {
  const source = value?.initiativeState || value || {};
  const initiativeOrder = (Array.isArray(source.initiativeOrder) ? source.initiativeOrder : [])
    .map((entry) => text(entry?.tokenId || entry?.id)).filter(Boolean);
  return Object.freeze({
    combatActive: source.combatActive === true && initiativeOrder.length > 0,
    turnCounter: Math.max(0, Math.round(number(source.turnCounter, 0))),
    currentCombatantId: text(source.currentCombatantId),
    currentTurnIndex: Math.max(0, Math.round(number(source.currentTurnIndex, 0))),
    initiativeOrder
  });
}

function turnsUntilStart(initiative, tokenId) {
  const targetIndex = initiative.initiativeOrder.indexOf(text(tokenId));
  if (targetIndex < 0) throw new Error("That duration requires its token to be in initiative.");
  const currentIndex = Math.min(
    initiative.initiativeOrder.length - 1,
    Math.max(0, initiative.initiativeOrder.indexOf(initiative.currentCombatantId))
  );
  const distance = (targetIndex - currentIndex + initiative.initiativeOrder.length) %
    initiative.initiativeOrder.length;
  return distance === 0 ? initiative.initiativeOrder.length : distance;
}

export function prepareEffectDuration(value, {
  initiative = {},
  worldTime = 0,
  sourceTokenId = "",
  targetTokenId = ""
} = {}) {
  const duration = normalizeEffectDuration(value);
  const state = initiativeSnapshot(initiative);
  let expiresAtTurnCounter = duration.expiresAtTurnCounter;
  let expiresAtWorldTime = duration.expiresAtWorldTime;

  if (["rounds", "turns", "until-start-source-turn", "until-end-source-turn",
    "until-start-target-turn", "until-end-target-turn"].includes(duration.mode)) {
    if (!state.combatActive) throw new Error("Start initiative before applying a turn-based effect.");
    if (duration.mode === "rounds") {
      expiresAtTurnCounter = state.turnCounter +
        duration.value * Math.max(1, state.initiativeOrder.length);
    } else if (duration.mode === "turns") {
      expiresAtTurnCounter = state.turnCounter + duration.value;
    } else {
      const usesSource = duration.mode.includes("source");
      const tokenId = usesSource ? sourceTokenId : targetTokenId;
      if (!text(tokenId)) throw new Error("That duration requires a source and target token.");
      let distance = turnsUntilStart(state, tokenId);
      if (duration.mode.includes("end")) {
        if (state.currentCombatantId === text(tokenId)) distance = 1;
        else distance += 1;
      }
      expiresAtTurnCounter = state.turnCounter + distance;
    }
  } else if (duration.mode === "world-time") {
    expiresAtWorldTime = Math.max(0, number(worldTime, 0)) +
      duration.value * (worldMultiplier[duration.unit] || 60);
  }

  return Object.freeze({
    ...duration,
    remaining: duration.value,
    expiresAtTurnCounter,
    expiresAtWorldTime
  });
}

export function getEffectExpirationReason(effect = {}, context = {}) {
  const duration = normalizeEffectDuration(effect.duration);
  if (["permanent", "until-removed"].includes(duration.mode)) return "";
  if (duration.mode === "world-time") {
    return duration.expiresAtWorldTime != null &&
      number(context.worldTime, 0) >= duration.expiresAtWorldTime
      ? "world-time-expired"
      : "";
  }
  const state = initiativeSnapshot(context.initiative);
  return duration.expiresAtTurnCounter != null &&
    state.turnCounter >= duration.expiresAtTurnCounter
    ? "turn-duration-expired"
    : "";
}

export function getEffectRemaining(effect = {}, context = {}) {
  const duration = normalizeEffectDuration(effect.duration);
  if (duration.mode === "world-time") {
    return Math.max(0, number(duration.expiresAtWorldTime, 0) - number(context.worldTime, 0));
  }
  if (duration.expiresAtTurnCounter != null) {
    return Math.max(0, duration.expiresAtTurnCounter - initiativeSnapshot(context.initiative).turnCounter);
  }
  return null;
}

export function formatEffectDuration(value = {}) {
  const duration = normalizeEffectDuration(value);
  const labels = {
    permanent: "Permanent",
    "until-removed": "Until removed",
    rounds: `${duration.value} round${duration.value === 1 ? "" : "s"}`,
    turns: `${duration.value} turn${duration.value === 1 ? "" : "s"}`,
    "until-start-source-turn": "Until start of source turn",
    "until-end-source-turn": "Until end of source turn",
    "until-start-target-turn": "Until start of target turn",
    "until-end-target-turn": "Until end of target turn",
    "world-time": `${duration.value} ${duration.unit}`
  };
  return labels[duration.mode] || "Until removed";
}
