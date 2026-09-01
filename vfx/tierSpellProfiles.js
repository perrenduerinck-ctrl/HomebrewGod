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

function epic(spellId, label, theme, family, options = {}) {
  const result = profile(spellId, label, theme, family, {
    impactDuration: 1100, ...options,
    specialOptions: { maxGeometryScale: 6, ...options.specialOptions }
  });
  for (const key of ["targetEffect", "projectileEffect", "casterEffect"]) {
    result[key] = result[key]?.replace(/^tier-/, "epic-");
  }
  return result;
}

export const TIER_SPELL_PROFILES = Object.freeze([
  lesser("bane", "Bane", "necrotic", "ground-effect", {
    targetEffect: "status-debuff-power-down"
  }),
  lesser("bless", "Bless", "radiant", "aura", {
    targetEffect: "status-buff-blessing"
  }),
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
  lesser("entangle", "Entangle", "poison", "ground-effect", {
    targetEffect: "status-debuff-entangle"
  }),
  lesser("mage-armor", "Mage Armor", "force", "self", {
    targetEffect: "status-buff-armor",
    specialOptions: { anchor: "caster" },
    preview: { mode: "self", label: "Self (visual preview)" }
  }),
  lesser("shield", "Shield", "force", "self", {
    targetEffect: "status-buff-shield",
    specialOptions: { anchor: "caster" },
    preview: { mode: "self", label: "Self (visual preview)" }
  }),
  lesser("shield-of-faith", "Shield of Faith", "radiant", "aura", {
    targetEffect: "status-buff-shield"
  }),
  lesser("sleep", "Sleep", "psychic", "ground-effect", {
    targetEffect: "status-debuff-sleep"
  }),
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
    projectileEffect: "tier-necrotic-beam", targetEffect: "status-debuff-power-down",
    scale: .65
  }),
  lesser("silence", "Silence", "psychic", "ground-effect", {
    targetEffect: "status-debuff-silence"
  }),
  lesser("magic-weapon", "Magic Weapon", "radiant", "touch", {
    targetEffect: "status-buff-radiant-weapon"
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
  profile("confusion", "Confusion", "psychic", "ground-effect", {
    targetEffect: "status-debuff-confusion"
  }),
  profile("bestow-curse", "Bestow Curse", "necrotic", "touch", {
    targetEffect: "status-debuff-ominous-eye"
  }),
  profile("enhance-ability", "Enhance Ability", "force", "aura", {
    targetEffect: "status-buff-power-up"
  }),
  profile("haste", "Haste", "force", "aura", {
    targetEffect: "status-buff-haste"
  }),
  profile("protection-from-energy", "Protection from Energy", "force", "aura", {
    targetEffect: "status-buff-elemental-ward"
  }),
  profile("slow", "Slow", "cold", "ground-effect", {
    targetEffect: "status-debuff-chill"
  }),
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
    targetEffect: "status-buff-barrier", scale: 1,
    specialOptions: { anchor: "caster", geometryScale: true, fitGeometry: true }
  }),
  profile("regenerate", "Regenerate", "radiant", "touch", {
    targetEffect: "status-buff-regeneration"
  }),
  profile("true-seeing", "True Seeing", "psychic", "touch", {
    targetEffect: "status-buff-truesight"
  }),
  profile("sunbeam", "Sunbeam", "radiant", "line", {
    scale: 1, projectileEffect: "tier-radiant-beam", travelDuration: 500
  }),
  profile("mass-suggestion", "Mass Suggestion", "psychic", "target-impact", {
    targetEffect: "tier-psychic-cloud", scale: .6
  }),
  epic("arcane-sword", "Arcane Sword", "force", "weapon-strike", {
    targetEffect: "epic-slashing-burst", scale: .65
  }),
  epic("delayed-blast-fireball", "Delayed Blast Fireball", "fire", "projectile-impact", {
    projectileEffect: "epic-fire-flight", scale: 1,
    specialOptions: { geometryScale: true, fitGeometry: true }
  }),
  epic("divine-word", "Divine Word", "radiant", "target-impact", { targetEffect: "epic-radiant-rune" }),
  epic("finger-of-death", "Finger of Death", "necrotic", "beam", { projectileEffect: "epic-necrotic-beam" }),
  epic("fire-storm", "Fire Storm", "fire", "ground-effect"),
  epic("forcecage", "Forcecage", "force", "ground-effect", { targetEffect: "epic-force-rune" }),
  epic("plane-shift", "Plane Shift", "force", "touch", { targetEffect: "epic-psychic-portal" }),
  epic("reverse-gravity", "Reverse Gravity", "force", "ground-effect", { targetEffect: "epic-force-rune" }),
  epic("teleport", "Teleport", "force", "ground-effect", { targetEffect: "epic-psychic-portal" }),
  epic("antimagic-field", "Antimagic Field", "force", "aura", {
    targetEffect: "epic-force-rune", scale: 1,
    specialOptions: { anchor: "caster", geometryScale: true, fitGeometry: true }
  }),
  epic("demiplane", "Demiplane", "force", "utility-glyph", { targetEffect: "epic-psychic-portal" }),
  epic("dominate-monster", "Dominate Monster", "psychic", "target-impact", { targetEffect: "epic-psychic-rune" }),
  epic("earthquake", "Earthquake", "bludgeoning", "ground-effect", { targetEffect: "epic-earth-burst" }),
  epic("feeblemind", "Feeblemind", "psychic", "target-impact"),
  epic("holy-aura", "Holy Aura", "radiant", "aura", {
    targetEffect: "epic-radiant-rune", scale: 1,
    specialOptions: { anchor: "caster", geometryScale: true, fitGeometry: true }
  }),
  epic("incendiary-cloud", "Incendiary Cloud", "fire", "ground-effect", {
    targetEffect: "epic-fire-cloud", impactDuration: 1500
  }),
  epic("maze", "Maze", "force", "utility-glyph", { targetEffect: "epic-psychic-portal" }),
  epic("power-word-stun", "Power Word Stun", "psychic", "target-impact", {
    targetEffect: "status-debuff-shock"
  }),
  epic("sunburst", "Sunburst", "radiant", "ground-effect"),
  epic("gate", "Gate", "force", "utility-glyph", { targetEffect: "epic-psychic-portal", scale: 1.2 }),
  epic("imprisonment", "Imprisonment", "force", "utility-glyph", { targetEffect: "epic-force-rune" }),
  epic("mass-heal", "Mass Heal", "radiant", "target-impact", { targetEffect: "epic-radiant-rune" }),
  // One representative impact at the selected center; no per-target meteor fan-out.
  epic("meteor-swarm", "Meteor Swarm", "fire", "projectile-impact", {
    projectileEffect: "epic-fire-flight", scale: 1,
    specialOptions: { geometryScale: true, fitGeometry: true }
  }),
  epic("power-word-kill", "Power Word Kill", "necrotic", "target-impact"),
  epic("storm-of-vengeance", "Storm of Vengeance", "thunder", "ground-effect", {
    casterEffect: "epic-lightning-cloud", chargeDuration: 420,
    specialOptions: { chargeAtTarget: true }
  }),
  epic("time-stop", "Time Stop", "force", "self", {
    targetEffect: "epic-force-rune", preview: { mode: "self", label: "Self (visual preview)" }
  }),
  epic("weird", "Weird", "psychic", "ground-effect", { targetEffect: "epic-psychic-cloud" }),
  epic("wish", "Wish", "force", "self", {
    targetEffect: "epic-force-rune", preview: { mode: "self", label: "Self (visual preview)" }
  })
]);
