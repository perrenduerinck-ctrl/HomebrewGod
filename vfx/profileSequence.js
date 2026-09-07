import { defineSpellVfxProfile, vfxNumber } from "./spellVfxProfiles.js?v=complete-spell-vfx-20260903";
import { FAMILY_PRESENTATION, profileEffectPresentation } from "./profilePresentation.js";
import { getProfileImpactFeedback, VFX_AFTERMATH } from "./impactFeedback.js";

// Pure compiler: no DOM, timers, characters, rolls, or persistence. The existing
// sequence system owns scheduling and the existing engine owns all cleanup.
export function compileSpellVfxProfile(rawProfile, event = {}) {
  const profile = defineSpellVfxProfile(rawProfile);
  const level = Math.round(vfxNumber(event.spellLevel, 0, 0, 9));
  const presentation = FAMILY_PRESENTATION[profile.family];
  const feedback = getProfileImpactFeedback(profile, level);
  const scale = vfxNumber(profile.scale *
    (profile.specialOptions.scaleWithLevel ? 1 + level * 0.06 : 1), 1, 0.1, presentation.maximumScale);
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
    const fitted = extra.geometryScaleBasePixels && profile.specialOptions.fitGeometry;
    const placement = profileEffectPresentation(profile, type, at, event);
    const maximumScale = at === "path" && profile.family === "projectile-impact" ? 1.3 : presentation.maximumScale;
    return { type, anchor: at, duration,
      scale: Math.min(maximumScale, (fitted ? profile.scale : scale) * factor), intensity,
      ...placement,
      particles: { count: particleCount, size: 3, distance: 24, duration },
      maxGeometryScale: Math.min(profile.specialOptions.maxGeometryScale,
        placement.layer === "ground" || placement.layer === "overhead" ? 6 : 3),
      metadata: { profileId: profile.spellId, family: profile.family, spellLevel: level,
        palette: profile.palette, variant: profile.specialOptions.variant,
        qualityRole: "fallback-or-accent" }, ...extra };
  }
  const geometryScaleBasePixels = profile.specialOptions.geometryScale
    ? profile.specialOptions.geometryBasePixels : null;
  const fieldGeometry = profile.specialOptions.fitGeometry ? { geometryScaleBasePixels } : {};
  const chargeAnchor = profile.specialOptions.chargeAtTarget ? anchor : "caster";
  const aftermathAnchor = profile.specialOptions.aftermathAtPath ? "path" : anchor;
  const phases = {
    charge: { duration: profile.casterEffect ? profile.chargeDuration : 0,
      effects: profile.casterEffect ? [effect(profile.casterEffect, chargeAnchor,
        profile.chargeDuration, profile.specialOptions.chargeAtTarget ? 1 : 0.55,
        { ...(profile.specialOptions.chargeAtTarget ? fieldGeometry : {}),
          fullOnly: profile.specialOptions.chargeFullOnly })] : [] },
    release: { duration: 0, effects: [] },
    travel: { duration: traveling ? travelDuration : 0,
      effects: traveling ? [effect(pathType, "path", travelDuration, 1,
        { particles: { count: 0 }, importance: "core" })] : [] },
    impact: { duration: impactDuration + (feedback?.hitStopMs || 0),
      effects: Array.from({ length: profile.impactCount }, (_, index) =>
        effect(impactType, profile.specialOptions.impactAtPath ? "path" : anchor, impactDuration, 1 - index * 0.12,
          { rotation: index * 32, geometryScaleBasePixels, importance: index ? "secondary" : "core",
            ...(feedback && index === 0 ? { impactPunch: feedback.impactPunch, shake: feedback.shake,
              hitStopMs: feedback.hitStopMs } : {}) })) },
    aftermath: { duration: profile.aftermathEffect || profile.aftershockCount ? profile.aftermathDuration : 0,
      effects: [
        ...(profile.aftermathEffect ? [effect(profile.aftermathEffect, aftermathAnchor,
          profile.aftermathDuration, profile.specialOptions.fitGeometry ? 1 : 0.7, fieldGeometry)] : []),
        ...Array.from({ length: profile.aftershockCount }, (_, index) =>
          effect("profile-ripple", anchor, profile.aftermathDuration, 1.1 + index * 0.3,
            { opacity: 0.5, geometryScaleBasePixels }))
      ] },
    cleanup: { duration: 0, effects: [] }
  };
  if (feedback) {
    phases.impact.effects.push(effect("profile-glow", anchor, 220, .8, {
      preset: "ground", layer: "ground", opacity: feedback.flash, fullOnly: true,
      importance: "secondary", particles: { count: 0 },
      metadata: { palette: profile.palette, role: "impact-light-splash" }
    }));
    if (feedback.ring) phases.impact.effects.push(effect("profile-ripple", anchor, 380, 1.1, {
      preset: "ground", layer: "ground", opacity: .35, geometryScaleBasePixels,
      fullOnly: true, importance: "secondary", particles: { count: feedback.particles }
    }));
    if (!profile.aftermathEffect) {
      const aftermath = VFX_AFTERMATH[profile.damageType] || [];
      if (aftermath.length) phases.aftermath.duration = profile.aftermathDuration;
      phases.aftermath.effects.push(...aftermath.map(([type, layer]) => effect(type, anchor,
        profile.aftermathDuration, .7, { layer, preset: layer === "ground" ? "ground" : "impact",
          opacity: .45, fullOnly: true, importance: "secondary",
          particles: { count: layer === "ground" ? 0 : Math.min(5, feedback.particles) } })));
    }
  }
  return { id: `profile-${profile.spellId}`, label: profile.label,
    source: "profile", family: profile.family, spellLevel: level, sound: profile.sound,
    scaling: { scale, intensity, particleCount, travelDuration, impactDuration,
      impactCount: profile.impactCount, aftershockCount: profile.aftershockCount,
      screenShakeIntensity: feedback ? feedback.shake.amplitude / 6 : 0 },
    match: { spellIds: [profile.spellId] }, phases };
}
