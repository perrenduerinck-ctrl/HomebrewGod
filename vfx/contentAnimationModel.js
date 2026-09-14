import { normalizeSpellAnimationReference, normalizeSpellAnimations } from "./animationReferences.js";
export const ATTACK_ANIMATION_STAGES = Object.freeze({ melee: ["attack"], ranged: ["prepare", "projectile", "impact"] });
export function normalizeAttackAnimation(value) {
  if (!value) return null;
  if (!Object.hasOwn(ATTACK_ANIMATION_STAGES, value.family)) throw new Error("Choose a melee or ranged attack family.");
  const stages = {};
  for (const stage of ATTACK_ANIMATION_STAGES[value.family]) {
    const reference = normalizeSpellAnimationReference(value.stages?.[stage]);
    if (reference) stages[stage] = reference;
  }
  return { family: value.family, stages };
}
export function attackAnimationToSpellStages(value) {
  const animation = normalizeAttackAnimation(value);
  if (!animation) return {};
  const map = animation.family === "melee" ? { attack: "cast" } : { prepare: "cast", projectile: "travel", impact: "impact" };
  return Object.fromEntries(Object.entries(animation.stages).map(([stage, ref]) => [map[stage], ref]));
}
export function spellStagesToAttackAnimation(family, stages) {
  const normalized = normalizeSpellAnimations(stages, { strict: true });
  const map = family === "melee" ? { cast: "attack" } : { cast: "prepare", travel: "projectile", impact: "impact" };
  return normalizeAttackAnimation({ family, stages: Object.fromEntries(Object.entries(normalized).filter(([stage]) => map[stage]).map(([stage, ref]) => [map[stage], ref])) });
}
