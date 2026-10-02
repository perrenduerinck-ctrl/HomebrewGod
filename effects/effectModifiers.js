import { normalizeEffectModifier } from "./effectModel.js";

function matchingModifiers(effects = [], kind, { ability = "", damageType = "" } = {}) {
  return (Array.isArray(effects) ? effects : []).flatMap((effect) =>
    (Array.isArray(effect?.modifiers) ? effect.modifiers : []).map((modifier, index) => ({
      modifier: normalizeEffectModifier(modifier),
      effectId: String(effect?.id || effect?.definitionId || ""),
      index
    })))
    .filter(({ modifier }) => modifier && modifier.kind === kind)
    .filter(({ modifier }) => !ability || !modifier.ability || modifier.ability === ability)
    .filter(({ modifier }) => !damageType || !modifier.damageType ||
      modifier.damageType === damageType || modifier.damageType === "all");
}

export function resolveNumericEffectValue(kind, baseValue, effects = [], context = {}) {
  const candidates = matchingModifiers(effects, kind, context);
  const sets = candidates.filter(({ modifier }) => modifier.mode === "set")
    .sort((left, right) =>
      right.modifier.priority - left.modifier.priority ||
      left.effectId.localeCompare(right.effectId) ||
      left.index - right.index);
  let value = sets.length ? sets[0].modifier.value : Number(baseValue) || 0;
  for (const { modifier } of candidates) {
    if (modifier.mode === "bonus") value += modifier.value;
    else if (modifier.mode === "penalty") value -= Math.abs(modifier.value);
    else if (modifier.mode === "minimum") value = Math.max(value, modifier.value);
    else if (modifier.mode === "maximum") value = Math.min(value, modifier.value);
  }
  return value;
}

export function resolveRollMode(kind, effects = [], context = {}) {
  const modes = new Set(matchingModifiers(effects, kind, context)
    .map(({ modifier }) => modifier.mode));
  if (modes.has("advantage") && modes.has("disadvantage")) return "normal";
  if (modes.has("advantage")) return "advantage";
  if (modes.has("disadvantage")) return "disadvantage";
  return "normal";
}

export function hasEffectRestriction(kind, effects = []) {
  return matchingModifiers(effects, kind)
    .some(({ modifier }) => modifier.mode === "restricted");
}

export function collectDamageResponses(effects = []) {
  const response = { resistance: new Set(), immunity: new Set(), vulnerability: new Set() };
  const map = {
    "damage-resistance": "resistance",
    "damage-immunity": "immunity",
    "damage-vulnerability": "vulnerability"
  };
  for (const kind of Object.keys(map)) {
    for (const { modifier } of matchingModifiers(effects, kind)) {
      if (modifier.damageType) response[map[kind]].add(modifier.damageType);
    }
  }
  return Object.freeze(Object.fromEntries(
    Object.entries(response).map(([key, values]) => [key, Object.freeze([...values].sort())])
  ));
}

export function calculateEffectModifiers({ base = {}, effects = [], ability = "" } = {}) {
  return Object.freeze({
    ac: resolveNumericEffectValue("ac", base.ac, effects),
    speed: Math.max(0, resolveNumericEffectValue("speed", base.speed, effects)),
    damageBonus: resolveNumericEffectValue("damage-bonus", base.damageBonus, effects),
    attackRoll: resolveRollMode("attack-roll", effects),
    abilityCheck: resolveRollMode("ability-check", effects, { ability }),
    savingThrow: resolveRollMode("saving-throw", effects, { ability }),
    movementRestricted: hasEffectRestriction("movement-restriction", effects),
    actionRestricted: hasEffectRestriction("action-restriction", effects),
    reactionRestricted: hasEffectRestriction("reaction-restriction", effects),
    damage: collectDamageResponses(effects)
  });
}
