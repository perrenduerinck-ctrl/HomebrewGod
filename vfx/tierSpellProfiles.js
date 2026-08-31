// Presentation data only. No spell rules, damage, targets or spell slots change.
// Utility spells deliberately do not receive generic meteor explosions.
function profile(spellId, label, theme, family, options = {}) {
  const area = ["ground-effect", "burst"].includes(family);
  return {
    spellId, label, family, damageType: theme, palette: theme,
    casterEffect: "profile-glow", targetEffect: `tier-${theme}-burst`,
    chargeDuration: 140, travelDuration: 320, impactDuration: 800,
    particleMultiplier: 0, scale: area ? 1 : .8,
    ...options,
    specialOptions: {
      particles: 0, chargeFullOnly: true, scaleWithLevel: false,
      geometryScale: area, geometryBasePixels: 160, fitGeometry: area,
      ...options.specialOptions
    }
  };
}

function lesser(spellId, label, theme, family, options = {}) {
  const result = profile(spellId, label, theme, family, options);
  for (const key of ["targetEffect", "projectileEffect", "casterEffect"]) {
    result[key] = result[key]?.replace(/^tier-/, "lesser-");
  }
  return result;
}

export const TIER_SPELL_PROFILES = Object.freeze([
  lesser("burning-hands", "Burning Hands", "fire", "cone", {
    scale: 1, projectileEffect: "profile-cone", travelDuration: 140,
    targetEffect: "tier-fire-cone", specialOptions: { impactAtPath: true }
  }),
  lesser("guiding-bolt", "Guiding Bolt", "radiant", "projectile-impact", {
    projectileEffect: "tier-radiant-flight"
  }),
  lesser("hellish-rebuke", "Hellish Rebuke", "fire", "target-impact"),
  lesser("inflict-wounds", "Inflict Wounds", "necrotic", "touch", { scale: .6 }),
  lesser("magic-missile", "Magic Missile", "force", "projectile-impact", {
    projectileEffect: "tier-force-flight", scale: .6
  }),
  lesser("sleep", "Sleep", "psychic", "ground-effect", { targetEffect: "tier-psychic-cloud" }),
  lesser("thunderwave", "Thunderwave", "thunder", "burst"),
  lesser("acid-arrow", "Acid Arrow", "acid", "projectile-impact", {
    projectileEffect: "tier-acid-flight", scale: .65
  }),
  lesser("scorching-ray", "Scorching Ray", "fire", "beam", {
    projectileEffect: "tier-fire-beam"
  }),
  lesser("shatter", "Shatter", "thunder", "ground-effect"),
  lesser("moonbeam", "Moonbeam", "radiant", "ground-effect"),
  lesser("ray-of-enfeeblement", "Ray of Enfeeblement", "necrotic", "beam", {
    projectileEffect: "tier-necrotic-beam", scale: .65
  }),
  profile("call-lightning", "Call Lightning", "lightning", "ground-effect", {
    casterEffect: "storm-cloud", specialOptions: { chargeAtTarget: true }
  }),
  profile("sleet-storm", "Sleet Storm", "cold", "ground-effect", {
    casterEffect: "storm-cloud", targetEffect: "tier-cold-cloud", impactDuration: 1200,
    specialOptions: { chargeAtTarget: true }
  }),
  profile("stinking-cloud", "Stinking Cloud", "poison", "ground-effect", {
    targetEffect: "tier-poison-comet-cloud", impactDuration: 1400
  }),
  profile("vampiric-touch", "Vampiric Touch", "necrotic", "touch", {
    scale: .6, preview: { mode: "target", rangeFeet: 5, label: "5-ft touch preview reach" }
  }),
  profile("blight", "Blight", "necrotic", "target-impact"),
  profile("phantasmal-killer", "Phantasmal Killer", "psychic", "target-impact"),
  profile("confusion", "Confusion", "psychic", "ground-effect"),
  profile("guardian-of-faith", "Guardian of Faith", "radiant", "ground-effect", {
    targetEffect: "tier-radiant-cloud", impactDuration: 1200
  }),
  profile("cloudkill", "Cloudkill", "poison", "ground-effect", {
    targetEffect: "tier-poison-cloud", impactDuration: 1600
  }),
  profile("cone-of-cold", "Cone of Cold", "cold", "cone", {
    scale: 1, projectileEffect: "profile-cone", travelDuration: 140,
    targetEffect: "tier-cold-cone", specialOptions: { impactAtPath: true }
  }),
  profile("flame-strike", "Flame Strike", "fire", "ground-effect", {
    casterEffect: "tier-radiant-cloud", chargeDuration: 220,
    specialOptions: { chargeAtTarget: true }
  }),
  profile("chain-lightning", "Chain Lightning", "lightning", "beam", {
    scale: 1, projectileEffect: "tier-lightning-beam", travelDuration: 360
  }),
  profile("circle-of-death", "Circle of Death", "necrotic", "ground-effect"),
  profile("disintegrate", "Disintegrate", "force", "beam", {
    scale: 1, projectileEffect: "tier-acid-stream-beam", targetEffect: "tier-acid-stream-burst",
    travelDuration: 360
  }),
  profile("freezing-sphere", "Freezing Sphere", "cold", "projectile-impact", {
    scale: 1, projectileEffect: "tier-cold-flight",
    specialOptions: { geometryScale: true, fitGeometry: true }
  }),
  profile("harm", "Harm", "necrotic", "target-impact"),
  profile("globe-of-invulnerability", "Globe of Invulnerability", "force", "aura", {
    targetEffect: "tier-force-cloud", scale: 1,
    specialOptions: { anchor: "caster", geometryScale: true, fitGeometry: true }
  }),
  profile("sunbeam", "Sunbeam", "radiant", "line", {
    scale: 1, projectileEffect: "tier-radiant-beam", travelDuration: 500
  }),
  profile("mass-suggestion", "Mass Suggestion", "psychic", "target-impact", {
    targetEffect: "tier-psychic-cloud", scale: .6
  })
]);
