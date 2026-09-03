import {
  FIRE_EFFECT_DEFINITIONS
} from "./fireEffects.js?v=fireball-blend-20260902";
import { CANTRIP_EFFECT_DEFINITIONS } from "./cantripEffects.js?v=level-four-spells-20260903";
import { PROFILE_EFFECT_DEFINITIONS } from "./profileEffects.js?v=level-four-spells-20260903";
import { STORM_EFFECT_DEFINITIONS } from "./stormEffects.js?v=status-sprites-20260831";
import { LIGHTNING_5X5_EFFECTS } from "./lightning5x5.js?v=status-sprites-20260831";
import { TIER_EFFECT_DEFINITIONS } from "./tierEffects.js?v=status-sprites-20260831";
import { STATUS_EFFECT_DEFINITIONS } from "./statusEffects.js?v=level-four-spells-20260903";

const EFFECT_KINDS = Object.freeze([
  "procedural",
  "sprite"
]);

function cleanId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeDefinition(definition = {}) {
  const id = cleanId(definition.id);
  const kind = String(
    definition.kind || "procedural"
  ).toLowerCase();

  if (!id) {
    throw new TypeError(
      "VFX definitions require a stable id."
    );
  }
  if (!EFFECT_KINDS.includes(kind)) {
    throw new TypeError(
      `Unsupported VFX kind: ${kind}`
    );
  }

  return Object.freeze({
    ...definition,
    id,
    kind,
    className: cleanId(
      definition.className || id
    )
  });
}

export function createEffectRegistry(
  initialDefinitions = []
) {
  const definitions = new Map();

  function register(
    definition,
    { replace = false } = {}
  ) {
    const normalized = normalizeDefinition(
      definition
    );
    if (
      definitions.has(normalized.id) &&
      !replace
    ) {
      throw new Error(
        `VFX definition already exists: ${normalized.id}`
      );
    }
    definitions.set(
      normalized.id,
      normalized
    );
    return normalized;
  }

  function unregister(id) {
    return definitions.delete(cleanId(id));
  }

  function get(id) {
    return definitions.get(cleanId(id)) || null;
  }

  function list() {
    return Object.freeze(
      Array.from(definitions.values())
    );
  }

  initialDefinitions.forEach((definition) => {
    register(definition);
  });

  return Object.freeze({
    get,
    has: (id) => definitions.has(cleanId(id)),
    list,
    register,
    unregister
  });
}

export function createDefaultEffectRegistry() {
  return createEffectRegistry([
    {
      id: "procedural-pulse",
      kind: "procedural",
      className: "pulse",
      particles: {
        count: 12,
        distance: 48,
        size: 5
      }
    },
    {
      id: "sprite",
      kind: "sprite",
      className: "sprite"
    },
    ...FIRE_EFFECT_DEFINITIONS,
    ...CANTRIP_EFFECT_DEFINITIONS,
    ...PROFILE_EFFECT_DEFINITIONS,
    ...STORM_EFFECT_DEFINITIONS,
    ...LIGHTNING_5X5_EFFECTS,
    ...TIER_EFFECT_DEFINITIONS,
    ...STATUS_EFFECT_DEFINITIONS
  ]);
}

export { EFFECT_KINDS };
