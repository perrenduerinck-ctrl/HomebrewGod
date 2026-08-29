import {
  FIRE_EFFECT_DEFINITIONS
} from "./fireEffects.js?v=vfx-fireball-20260829";

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
    ...FIRE_EFFECT_DEFINITIONS
  ]);
}

export { EFFECT_KINDS };
