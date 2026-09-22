export const MAX_ANIMATION_LAYERS = 8;

export const ANIMATION_LAYER_PLACEMENTS = Object.freeze([
  "inherit", "source", "target", "between", "map", "source-to-target", "source-toward-target"
]);

const BLEND_MODES = Object.freeze(["normal", "screen", "plus-lighter", "multiply"]);
const id = value => typeof value === "string" && /^[a-z][\w.-]{0,119}$/i.test(value.trim()) ? value.trim() : null;
const number = (value, fallback, min, max, label) => {
  const result = value === undefined ? fallback : Number(value);
  if (value === null || value === "" || !Number.isFinite(result) || result < min || result > max) {
    throw new Error(`${label} must be a number between ${min} and ${max}.`);
  }
  return result;
};
const choice = (value, fallback, choices, label) => {
  const result = value ?? fallback;
  if (!choices.includes(result)) throw new Error(`Choose a valid ${label}.`);
  return result;
};

export function normalizeAnimationLayer(value = {}) {
  const animationId = id(value.animationId);
  if (!animationId) throw new Error("Each layer needs a valid Animation ID.");
  const placement = typeof value.placement === "string"
    ? value.placement
    : value.placement?.spawnAt || "inherit";
  return {
    animationId,
    // `at` was the reserved pre-creator spelling and used milliseconds.
    startDelay: number(value.startDelay, value.at === undefined ? 0 : Number(value.at) / 1000, 0, 10, "Layer start delay"),
    duration: number(value.duration, 0, 0, 60, "Layer duration"),
    scale: number(value.scale, 1, .1, 8, "Layer scale"),
    opacity: number(value.opacity, 1, 0, 1, "Layer opacity"),
    offsetX: number(value.offsetX, 0, -10000, 10000, "Layer horizontal offset"),
    offsetY: number(value.offsetY, 0, -10000, 10000, "Layer vertical offset"),
    rotation: number(value.rotation, 0, -3600, 3600, "Layer rotation"),
    blendMode: choice(value.blendMode, "normal", BLEND_MODES, "layer blend mode"),
    placement: choice(placement, "inherit", ANIMATION_LAYER_PLACEMENTS, "layer placement"),
    followSource: value.followSource === true || value.placement?.followSource === true,
    followTarget: value.followTarget === true || value.placement?.followTarget === true
  };
}

export function normalizeAnimationLayers(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_ANIMATION_LAYERS || JSON.stringify(value).length > 16000) {
    throw new Error(`Animations can contain at most ${MAX_ANIMATION_LAYERS} layers.`);
  }
  return value.map(normalizeAnimationLayer);
}

export function getAnimationLayerDependencies(definition) {
  return [...new Set((Array.isArray(definition?.layers) ? definition.layers : [])
    .map(layer => id(layer?.animationId)).filter(Boolean))];
}

export function replaceAnimationLayerReferences(layers, oldId, newId) {
  if (newId != null && !id(newId)) throw new Error("Choose a valid replacement Animation ID.");
  return (Array.isArray(layers) ? layers : []).flatMap(layer => {
    if (layer?.animationId !== oldId) return [layer];
    return newId ? [{ ...layer, animationId: newId }] : [];
  });
}

export function animationLayerOverrides(layer) {
  const overrides = {
    scale: layer.scale,
    rotation: layer.rotation,
    offsetX: layer.offsetX,
    offsetY: layer.offsetY,
    appearance: { opacity: layer.opacity, blendMode: layer.blendMode },
    blendMode: layer.blendMode
  };
  if (layer.placement !== "inherit" || layer.followSource || layer.followTarget) overrides.placement = {
    ...(layer.placement === "inherit" ? {} : { spawnAt: layer.placement }),
    override: true,
    followSource: layer.followSource,
    followTarget: layer.followTarget,
    fixedToMap: layer.placement === "map"
  };
  if (layer.duration > 0) overrides.placement = { ...overrides.placement, override: true, duration: layer.duration };
  return overrides;
}
