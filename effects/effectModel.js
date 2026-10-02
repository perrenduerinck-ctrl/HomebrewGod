export const EFFECT_TYPES = Object.freeze(["condition", "buff", "debuff", "other"]);
export const EFFECT_DURATION_MODES = Object.freeze([
  "permanent",
  "until-removed",
  "rounds",
  "turns",
  "until-start-source-turn",
  "until-end-source-turn",
  "until-start-target-turn",
  "until-end-target-turn",
  "world-time"
]);
export const EFFECT_MODIFIER_KINDS = Object.freeze([
  "ac",
  "speed",
  "attack-roll",
  "ability-check",
  "saving-throw",
  "damage-bonus",
  "damage-resistance",
  "damage-immunity",
  "damage-vulnerability",
  "movement-restriction",
  "action-restriction",
  "reaction-restriction"
]);
export const EFFECT_MODIFIER_MODES = Object.freeze([
  "bonus",
  "penalty",
  "set",
  "minimum",
  "maximum",
  "advantage",
  "disadvantage",
  "restricted"
]);

const text = (value, maximum = 240) => String(value ?? "").trim().slice(0, maximum);
const number = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const identifier = (value, maximum = 180) => text(value, maximum)
  .replace(/[^a-zA-Z0-9:_-]/g, "-")
  .replace(/-+/g, "-");

export function createEffectId(prefix = "effect") {
  return `${identifier(prefix, 32) || "effect"}-${globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

export function normalizeEffectAnimation(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  return Object.freeze({
    startAnimationId: text(source.startAnimationId, 180),
    sustainAnimationId: text(source.sustainAnimationId, 180),
    endAnimationId: text(source.endAnimationId, 180)
  });
}

export function normalizeEffectModifier(value = {}) {
  const kind = text(value.kind, 60).toLowerCase();
  const mode = text(value.mode, 40).toLowerCase();
  if (!EFFECT_MODIFIER_KINDS.includes(kind) || !EFFECT_MODIFIER_MODES.includes(mode)) {
    return null;
  }
  const modifier = {
    kind,
    mode,
    value: Math.max(-9999, Math.min(9999, number(value.value, 0))),
    ability: text(value.ability, 20).toLowerCase(),
    damageType: text(value.damageType, 40).toLowerCase(),
    priority: Math.max(-100, Math.min(100, Math.round(number(value.priority, 0))))
  };
  if (["advantage", "disadvantage", "restricted"].includes(mode)) {
    modifier.value = 0;
  }
  return Object.freeze(modifier);
}

export function normalizeEffectDuration(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  const mode = EFFECT_DURATION_MODES.includes(text(source.mode, 60).toLowerCase())
    ? text(source.mode, 60).toLowerCase()
    : "until-removed";
  const unit = ["seconds", "minutes", "hours", "days"].includes(text(source.unit, 20).toLowerCase())
    ? text(source.unit, 20).toLowerCase()
    : "minutes";
  return Object.freeze({
    mode,
    value: Math.max(1, Math.min(9999, Math.round(number(source.value, 1)))),
    unit,
    remaining: Math.max(0, number(source.remaining, number(source.value, 1))),
    expiresAtTurnCounter: source.expiresAtTurnCounter == null
      ? null
      : Math.max(0, Math.round(number(source.expiresAtTurnCounter, 0))),
    expiresAtWorldTime: source.expiresAtWorldTime == null
      ? null
      : Math.max(0, number(source.expiresAtWorldTime, 0))
  });
}

export function normalizeEffectDefinition(value = {}) {
  const id = identifier(value.id || value.definitionId, 180);
  const name = text(value.name, 120);
  if (!id || !name) throw new Error("Effect definitions require a stable ID and name.");
  const type = EFFECT_TYPES.includes(text(value.type, 40).toLowerCase())
    ? text(value.type, 40).toLowerCase()
    : "other";
  return Object.freeze({
    id,
    name,
    type,
    icon: text(value.icon, 12) || "◆",
    description: text(value.description, 1200),
    tags: Object.freeze((Array.isArray(value.tags) ? value.tags : [])
      .map((entry) => text(entry, 40).toLowerCase()).filter(Boolean).slice(0, 20)),
    modifiers: Object.freeze((Array.isArray(value.modifiers) ? value.modifiers : [])
      .map(normalizeEffectModifier).filter(Boolean).slice(0, 24)),
    animation: normalizeEffectAnimation(value.animation)
  });
}

export function normalizeEffectInstance(value = {}) {
  const id = identifier(value.id, 180);
  const definitionId = identifier(value.definitionId || "custom", 180);
  const name = text(value.name, 120);
  const roomCode = text(value.roomCode, 32).toUpperCase();
  const targetTokenId = text(value.targetTokenId, 180);
  if (!id || !definitionId || !name || !roomCode || !targetTokenId) {
    return null;
  }
  const type = EFFECT_TYPES.includes(text(value.type, 40).toLowerCase())
    ? text(value.type, 40).toLowerCase()
    : "other";
  return Object.freeze({
    id,
    definitionId,
    name,
    type,
    icon: text(value.icon, 12) || "◆",
    description: text(value.description, 1200),
    roomCode,
    sourceId: text(value.sourceId, 180),
    sourceType: text(value.sourceType, 40) || "token",
    targetTokenId,
    targetCharacterId: text(value.targetCharacterId, 180),
    duration: normalizeEffectDuration(value.duration),
    timing: Object.freeze({
      apply: text(value.timing?.apply, 40) || "immediate",
      startOfTurn: value.timing?.startOfTurn === true,
      endOfTurn: value.timing?.endOfTurn === true
    }),
    modifiers: Object.freeze((Array.isArray(value.modifiers) ? value.modifiers : [])
      .map(normalizeEffectModifier).filter(Boolean).slice(0, 24)),
    tags: Object.freeze((Array.isArray(value.tags) ? value.tags : [])
      .map((entry) => text(entry, 40).toLowerCase()).filter(Boolean).slice(0, 20)),
    animation: normalizeEffectAnimation(value.animation),
    createdByUid: text(value.createdByUid, 180),
    createdAtMillis: Math.max(0, number(value.createdAtMillis, Date.now())),
    updatedAtMillis: Math.max(0, number(value.updatedAtMillis, Date.now()))
  });
}
