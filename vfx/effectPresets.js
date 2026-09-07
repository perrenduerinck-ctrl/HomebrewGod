const freeze = (value) => Object.freeze(value);

export const EFFECT_PRESETS = freeze({
  projectile: freeze({
    layer: "airborne",
    motion: freeze({ type: "arc", maxZ: 96, rotationMode: "direction" }),
    shadow: freeze({ enabled: true, opacity: 0.52, minimumOpacity: .07, minimumScale: .2,
      blur: 2, heightBlur: 5 }),
    heightScaling: freeze({ enabled: true, amount: 0.0022, maximum: 1.35 })
  }),
  explosion: freeze({
    layer: "airborne",
    motion: freeze({ type: "stationary" }),
    heightScaling: freeze({ enabled: false })
  }),
  impact: freeze({ layer: "airborne", motion: freeze({ type: "stationary" }) }),
  aura: freeze({ layer: "airborne", attachment: freeze({ position: "centered" }) }),
  ground: freeze({ layer: "ground", motion: freeze({ type: "stationary" }) }),
  "ground-effect": freeze({
    layer: "ground",
    motion: freeze({ type: "stationary" })
  }),
  overhead: freeze({
    layer: "overhead",
    motion: freeze({ type: "stationary" })
  }),
  vertical: freeze({
    layer: "airborne",
    motion: freeze({ type: "rising", startZ: 0, endZ: 120 })
  }),
  attached: freeze({
    layer: "airborne",
    attachment: freeze({ position: "centered" })
  }),
  "attached-status": freeze({
    layer: "airborne",
    attachment: freeze({ position: "centered" })
  }),
  beam: freeze({
    layer: "airborne",
    motion: freeze({ type: "straight", rotationMode: "direction" })
  }),
  weather: freeze({
    layer: "overhead",
    motion: freeze({ type: "falling", startZ: 180, endZ: 0 })
  })
});

export function getEffectPreset(name) {
  return EFFECT_PRESETS[String(name || "").trim().toLowerCase()] || null;
}

export function applyEffectPreset(request = {}) {
  const preset = getEffectPreset(request.preset);
  if (!preset) return { ...request };
  return {
    ...preset,
    ...request,
    layer: request.layer || preset.layer,
    motion: { ...(preset.motion || {}), ...(request.motion || {}) },
    shadow: request.shadow === false
      ? false
      : { ...(preset.shadow || {}), ...(request.shadow || {}) },
    heightScaling: request.heightScaling === false
      ? false
      : { ...(preset.heightScaling || {}), ...(request.heightScaling || {}) },
    attachment: { ...(preset.attachment || {}), ...(request.attachment || {}) }
  };
}
