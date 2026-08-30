import { defineSpellVfxProfile, vfxNumber } from "./spellVfxProfiles.js?v=all-cantrips-20260830";

// Pure compiler: no DOM, timers, characters, rolls, or persistence. The existing
// sequence system owns scheduling and the existing engine owns all cleanup.
export function compileSpellVfxProfile(rawProfile, event = {}) {
  const profile = defineSpellVfxProfile(rawProfile);
  const level = Math.round(vfxNumber(event.spellLevel, 0, 0, 9));
  const scale = vfxNumber(profile.scale * (1 + level * 0.22), 1, 0.1, 12);
  const intensity = Math.round(vfxNumber(Math.max(profile.intensity,
    vfxNumber(event.intensity, 1, 1, 5), 1 + Math.floor(level / 2)), 1, 1, 5));
  const particleCount = Math.round(vfxNumber(profile.specialOptions.particles *
    profile.particleMultiplier * (1 + level * 0.15), 7, 0, 48));
  const distance = Math.hypot(
    (event.targetPoint?.x || 0) - (event.casterPoint?.x || 0),
    (event.targetPoint?.y || 0) - (event.casterPoint?.y || 0));
  const travelDuration = Math.round(profile.travelSpeed > 0 && Number.isFinite(distance)
    ? vfxNumber(distance / profile.travelSpeed * 1000, 440, 80, 2000)
    : profile.travelDuration);
  const impactDuration = Math.round(vfxNumber(profile.impactDuration *
    (1 + level * 0.04), 800, 160, 2800));
  const self = profile.family === "self" || profile.specialOptions.anchor === "caster";
  const anchor = self ? "caster" : "target";
  const pathFamily = ["projectile-impact", "beam", "line", "cone"].includes(profile.family);
  const traveling = pathFamily || Boolean(profile.projectileEffect);
  const pathType = profile.projectileEffect || (
    profile.family === "cone" ? "profile-cone" :
    ["beam", "line"].includes(profile.family) ? "profile-beam" : "profile-orb");
  const defaults = { "utility-hand": "profile-hand", "utility-ripple": "profile-ripple",
    "weapon-strike": "profile-slash", "ground-effect": "profile-ground",
    burst: "profile-ripple", aura: "profile-glyph", self: "profile-glyph",
    touch: "profile-glow", "utility-glyph": "profile-glyph" };
  const impactType = profile.impactEffect || profile.targetEffect ||
    defaults[profile.family] || "profile-splash";
  function effect(type, at, duration, factor = 1, extra = {}) {
    return { type, anchor: at, duration, scale: scale * factor, intensity,
      particles: { count: particleCount, size: 3, distance: 24, duration },
      metadata: { profileId: profile.spellId, family: profile.family, spellLevel: level,
        palette: profile.palette, variant: profile.specialOptions.variant }, ...extra };
  }
  const geometryScaleBasePixels = profile.specialOptions.geometryScale ? 72 : null;
  const phases = {
    charge: { duration: profile.casterEffect ? 180 : 0,
      effects: profile.casterEffect ? [effect(profile.casterEffect, "caster", 180, 0.55)] : [] },
    release: { duration: 0, effects: [] },
    travel: { duration: traveling ? travelDuration : 0,
      effects: traveling ? [effect(pathType, "path", travelDuration, 1,
        { particles: { count: 0 } })] : [] },
    impact: { duration: impactDuration,
      effects: Array.from({ length: profile.impactCount }, (_, index) =>
        effect(impactType, anchor, impactDuration, 1 - index * 0.12,
          { rotation: index * 32, geometryScaleBasePixels })) },
    aftermath: { duration: profile.aftermathEffect || profile.aftershockCount ? 420 : 0,
      effects: [
        ...(profile.aftermathEffect ? [effect(profile.aftermathEffect, anchor, 420, 0.7)] : []),
        ...Array.from({ length: profile.aftershockCount }, (_, index) =>
          effect("profile-ripple", anchor, 420, 1.1 + index * 0.3,
            { opacity: 0.5, geometryScaleBasePixels }))
      ] },
    cleanup: { duration: 0, effects: [] }
  };
  return { id: `profile-${profile.spellId}`, label: profile.label,
    source: "profile", family: profile.family, spellLevel: level,
    scaling: { scale, intensity, particleCount, travelDuration, impactDuration,
      impactCount: profile.impactCount, aftershockCount: profile.aftershockCount,
      screenShakeIntensity: profile.screenShakeIntensity },
    match: { spellIds: [profile.spellId] }, phases };
}
