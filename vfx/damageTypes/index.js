import {
  ELEMENTAL_DAMAGE_TYPE_VISUALS
} from "./elemental.js";
import {
  MYSTIC_DAMAGE_TYPE_VISUALS
} from "./mystic.js";
import {
  PHYSICAL_DAMAGE_TYPE_VISUALS
} from "./physical.js";
import {
  createDamageTypeRegistry
} from "./registry.js";

export const DEFAULT_DAMAGE_TYPE_ID = "force";
export const DAMAGE_TYPE_IDS = Object.freeze([
  "fire",
  "cold",
  "lightning",
  "thunder",
  "acid",
  "poison",
  "necrotic",
  "radiant",
  "psychic",
  "force",
  "bludgeoning",
  "piercing",
  "slashing"
]);

export const DEFAULT_DAMAGE_TYPE_VISUALS = Object.freeze([
  ...ELEMENTAL_DAMAGE_TYPE_VISUALS,
  ...MYSTIC_DAMAGE_TYPE_VISUALS,
  ...PHYSICAL_DAMAGE_TYPE_VISUALS
]);

const defaultRegistry = createDamageTypeRegistry(
  DEFAULT_DAMAGE_TYPE_VISUALS
);

export function createDefaultDamageTypeRegistry() {
  return createDamageTypeRegistry(
    DEFAULT_DAMAGE_TYPE_VISUALS
  );
}

export function getDamageTypeVisual(damageType) {
  return defaultRegistry.get(damageType);
}

export function listDamageTypeVisuals() {
  return defaultRegistry.list();
}

export function resolveDamageTypeVisual(
  damageTypes,
  {
    fallback = DEFAULT_DAMAGE_TYPE_ID,
    registry = defaultRegistry
  } = {}
) {
  const requested = Array.isArray(damageTypes)
    ? damageTypes
    : [damageTypes];

  for (const damageType of requested) {
    const match = registry?.get?.(damageType);
    if (match) return match;
  }

  return fallback === null || fallback === false
    ? null
    : registry?.get?.(fallback) || null;
}

export {
  DAMAGE_TYPE_INTENSITY_LEVELS,
  DAMAGE_TYPE_VISUAL_SCHEMA_VERSION,
  createDamageTypeRegistry,
  defineDamageTypeVisual,
  normalizeDamageTypeIntensity,
  scaleDamageTypeVisual
} from "./registry.js";
