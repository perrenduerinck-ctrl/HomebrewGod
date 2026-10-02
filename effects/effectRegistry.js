import { normalizeEffectDefinition } from "./effectModel.js";

const condition = (id, name, icon, description, modifiers = [], startAnimationId = "") => ({
  id, name, icon, description, type: "condition", tags: ["condition"],
  modifiers,
  animation: { startAnimationId }
});

export const CORE_CONDITION_DEFINITIONS = Object.freeze([
  condition("blinded", "Blinded", "◉", "Sight-based checks fail and attacks are hindered.", [
    { kind: "attack-roll", mode: "disadvantage" },
    { kind: "ability-check", mode: "disadvantage", ability: "sight" }
  ], "status-debuff-ominous-eye"),
  condition("charmed", "Charmed", "♥", "The creature is charmed by its source.", [], "status-buff-blessing"),
  condition("deafened", "Deafened", "◌", "The creature cannot hear.", []),
  condition("frightened", "Frightened", "!", "The creature is frightened of its source.", [
    { kind: "ability-check", mode: "disadvantage" }
  ], "status-debuff-ominous-eye"),
  condition("grappled", "Grappled", "⌁", "Speed becomes 0 while grappled.", [
    { kind: "speed", mode: "set", value: 0 },
    { kind: "movement-restriction", mode: "restricted" }
  ], "status-debuff-entangle"),
  condition("incapacitated", "Incapacitated", "×", "Actions and reactions are restricted.", [
    { kind: "action-restriction", mode: "restricted" },
    { kind: "reaction-restriction", mode: "restricted" }
  ]),
  condition("invisible", "Invisible", "◇", "The creature cannot be seen without special senses.", []),
  condition("paralyzed", "Paralyzed", "ϟ", "Speed is 0 and actions and reactions are restricted.", [
    { kind: "speed", mode: "set", value: 0 },
    { kind: "action-restriction", mode: "restricted" },
    { kind: "reaction-restriction", mode: "restricted" }
  ], "status-debuff-shock"),
  condition("petrified", "Petrified", "▣", "The creature is transformed and cannot move or act.", [
    { kind: "speed", mode: "set", value: 0 },
    { kind: "action-restriction", mode: "restricted" },
    { kind: "reaction-restriction", mode: "restricted" },
    { kind: "damage-resistance", mode: "set", damageType: "all" }
  ], "status-buff-armor"),
  condition("poisoned", "Poisoned", "☠", "Attacks and ability checks are made with disadvantage.", [
    { kind: "attack-roll", mode: "disadvantage" },
    { kind: "ability-check", mode: "disadvantage" }
  ], "status-debuff-poison"),
  condition("prone", "Prone", "↘", "Standing movement and attacks are hindered.", [
    { kind: "attack-roll", mode: "disadvantage" },
    { kind: "movement-restriction", mode: "restricted" }
  ]),
  condition("restrained", "Restrained", "⌗", "Speed is 0; attacks and Dexterity saves are hindered.", [
    { kind: "speed", mode: "set", value: 0 },
    { kind: "attack-roll", mode: "disadvantage" },
    { kind: "saving-throw", mode: "disadvantage", ability: "dex" }
  ], "status-debuff-entangle"),
  condition("stunned", "Stunned", "✦", "Speed is 0 and actions and reactions are restricted.", [
    { kind: "speed", mode: "set", value: 0 },
    { kind: "action-restriction", mode: "restricted" },
    { kind: "reaction-restriction", mode: "restricted" }
  ], "status-debuff-confusion"),
  condition("unconscious", "Unconscious", "☾", "The creature cannot move, act, or react.", [
    { kind: "speed", mode: "set", value: 0 },
    { kind: "action-restriction", mode: "restricted" },
    { kind: "reaction-restriction", mode: "restricted" }
  ], "status-debuff-sleep")
].map(normalizeEffectDefinition));

export function createEffectRegistry(definitions = CORE_CONDITION_DEFINITIONS) {
  const entries = new Map();
  for (const value of definitions) {
    const definition = normalizeEffectDefinition(value);
    if (entries.has(definition.id)) throw new Error(`Duplicate effect definition: ${definition.id}`);
    entries.set(definition.id, definition);
  }
  return Object.freeze({
    get: (id) => entries.get(String(id || "").trim()) || null,
    list: ({ type = "" } = {}) => [...entries.values()]
      .filter((entry) => !type || entry.type === type)
      .sort((left, right) => left.name.localeCompare(right.name)),
    register(value) {
      const definition = normalizeEffectDefinition(value);
      entries.set(definition.id, definition);
      return definition;
    }
  });
}

export const defaultEffectRegistry = createEffectRegistry();
