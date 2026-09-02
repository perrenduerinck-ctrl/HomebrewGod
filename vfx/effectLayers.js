export const EFFECT_LAYER_ORDER = Object.freeze([
  "ground",
  "shadows",
  "tokens",
  "airborne",
  "overhead",
  "ui"
]);

export const EFFECT_LAYERS = Object.freeze({
  ground: Object.freeze({ id: "ground", zIndex: 100 }),
  shadows: Object.freeze({ id: "shadows", zIndex: 200 }),
  tokens: Object.freeze({ id: "tokens", zIndex: 300 }),
  airborne: Object.freeze({ id: "airborne", zIndex: 400 }),
  overhead: Object.freeze({ id: "overhead", zIndex: 500 }),
  ui: Object.freeze({ id: "ui", zIndex: 600 })
});

export const MAP_DEPTH_Z_INDEX = 0;

const cleanLayer = (value) => String(value || "")
  .trim()
  .toLowerCase();

export function normalizeEffectLayer(value, fallback = "airborne") {
  const requested = cleanLayer(value);
  if (EFFECT_LAYERS[requested]) return requested;
  const safeFallback = cleanLayer(fallback);
  return EFFECT_LAYERS[safeFallback] ? safeFallback : "airborne";
}

export function getEffectLayer(value, fallback) {
  return EFFECT_LAYERS[normalizeEffectLayer(value, fallback)];
}

export function getDepthSortValue({
  layer = "airborne",
  y = 0,
  z = 0,
  elevation = 0
} = {}) {
  const definition = getEffectLayer(layer);
  return definition.zIndex * 1000 + getLocalDepthSortValue({
    y, z, elevation
  });
}

export function getLocalDepthSortValue({
  y = 0,
  z = 0,
  elevation = 0
} = {}) {
  const safeY = Number.isFinite(Number(y)) ? Number(y) : 0;
  const safeZ = Number.isFinite(Number(z)) ? Number(z) : 0;
  const safeElevation = Number.isFinite(Number(elevation))
    ? Number(elevation)
    : 0;
  const localDepth = Math.max(0, Math.min(899, Math.round(
    safeY - safeZ * 0.2 + safeElevation * 0.02
  )));
  return localDepth;
}

export function getTokenDepthSortValue({ y = 0, elevation = 0 } = {}) {
  const safeY = Number.isFinite(Number(y)) ? Number(y) : 0;
  const safeElevation = Number.isFinite(Number(elevation))
    ? Number(elevation)
    : 0;
  return Math.max(0, Math.min(9999, Math.round(
    safeY * 10 - safeElevation * 0.1
  )));
}
