// Presentation-only compositions for the remainder of the level-two catalog.
// These profiles reuse bounded procedural effects and the owner's status atlases.
// They never apply conditions, healing, movement, targeting, or spell costs.
const self = Object.freeze({ mode: "self", label: "Self (visual preview)" });
const touch = Object.freeze({ mode: "target", rangeFeet: 5, label: "Touch (5-ft preview reach)" });
const target = (rangeFeet) => Object.freeze({
  mode: "target", rangeFeet, label: `${rangeFeet} feet`
});

function profile(spellId, label, family, targetEffect, options = {}) {
  return {
    spellId,
    label,
    family,
    targetEffect,
    impactDuration: 1100,
    aftermathDuration: 560,
    scale: .78,
    particleMultiplier: 1,
    ...options,
    specialOptions: {
      particles: targetEffect.startsWith("status-") ? 0 : 5,
      scaleWithLevel: false,
      ...options.specialOptions
    }
  };
}

const geometry = Object.freeze({
  geometryScale: true,
  geometryBasePixels: 160,
  fitGeometry: true
});

export const LEVEL_TWO_SPELL_PROFILES = Object.freeze([
  profile("aid", "Aid", "aura", "status-buff-power-up", {
    palette: "healing", preview: target(30), scale: .72
  }),
  profile("alter-self", "Alter Self", "self", "profile-shimmer", {
    palette: "arcane", aftermathEffect: "profile-sparkles", preview: self,
    specialOptions: { particles: 6 }
  }),
  profile("animal-messenger", "Animal Messenger", "target-impact", "profile-glyph", {
    palette: "nature", aftermathEffect: "profile-leaves", preview: target(30),
    scale: .68, specialOptions: { variant: "voice", particles: 4 }
  }),
  profile("arcane-lock", "Arcane Lock", "touch", "profile-glyph", {
    palette: "arcane", aftermathEffect: "profile-ripple", preview: touch,
    scale: .7, specialOptions: { variant: "lock", particles: 3 }
  }),
  profile("arcanists-magic-aura", "Arcanist's Magic Aura", "touch", "profile-glyph", {
    palette: "arcane", aftermathEffect: "profile-shimmer", preview: touch,
    scale: .7, specialOptions: { variant: "rune", particles: 4 }
  }),
  profile("augury", "Augury", "self", "profile-glyph", {
    palette: "radiant", aftermathEffect: "profile-sparkles", preview: self,
    scale: .7, specialOptions: { variant: "eye", particles: 5 }
  }),
  profile("barkskin", "Barkskin", "touch", "status-buff-armor", {
    palette: "nature", aftermathEffect: "profile-leaves", preview: touch, scale: .72
  }),
  profile("blindness-deafness", "Blindness/Deafness", "target-impact", "status-debuff-ominous-eye", {
    palette: "psychic", aftermathEffect: "profile-mist", preview: target(30), scale: .72
  }),
  profile("blur", "Blur", "self", "profile-shimmer", {
    palette: "arcane", aftermathEffect: "profile-ripple", preview: self,
    scale: .74, specialOptions: { particles: 4 }
  }),
  profile("branding-smite", "Branding Smite", "self", "status-buff-radiant-weapon", {
    palette: "radiant", preview: self, scale: .76
  }),
  profile("calm-emotions", "Calm Emotions", "ground-effect", "profile-ripple", {
    palette: "rose", aftermathEffect: "profile-sparkles", scale: .9,
    specialOptions: { ...geometry, particles: 5 }
  }),
  profile("continual-flame", "Continual Flame", "touch", "fire-flames", {
    damageType: "fire", palette: "fire", aftermathEffect: "fire-embers",
    preview: touch, scale: .58, specialOptions: { particles: 0 }
  }),
  profile("darkness", "Darkness", "ground-effect", "profile-mist", {
    palette: "necrotic", aftermathEffect: "profile-ground",
    impactDuration: 1500, scale: .9, specialOptions: { ...geometry, particles: 6 }
  }),
  profile("darkvision", "Darkvision", "touch", "status-buff-truesight", {
    palette: "psychic", preview: touch, scale: .7
  }),
  profile("detect-thoughts", "Detect Thoughts", "self", "status-buff-truesight", {
    palette: "psychic", preview: self, scale: .7
  }),
  profile("enlarge-reduce", "Enlarge/Reduce", "target-impact", "profile-rays", {
    palette: "arcane", aftermathEffect: "profile-shimmer", preview: target(30),
    scale: .72, specialOptions: { particles: 6 }
  }),
  profile("enthrall", "Enthrall", "target-impact", "profile-glyph", {
    palette: "rose", aftermathEffect: "profile-ripple", preview: target(60),
    scale: .72, specialOptions: { variant: "voice", particles: 4 }
  }),
  profile("find-steed", "Find Steed", "utility-glyph", "profile-glyph", {
    palette: "radiant", aftermathEffect: "profile-sparkles", preview: target(30),
    scale: .76, specialOptions: { variant: "portal", particles: 7 }
  }),
  profile("find-traps", "Find Traps", "target-impact", "status-buff-truesight", {
    palette: "arcane", preview: target(120), scale: .7
  }),
  profile("flame-blade", "Flame Blade", "self", "profile-slash", {
    damageType: "fire", palette: "fire", casterEffect: "profile-glyph",
    aftermathEffect: "fire-embers", preview: self, scale: .72,
    specialOptions: { variant: "blade", anchor: "caster", particles: 4 }
  }),
  profile("flaming-sphere", "Flaming Sphere", "target-impact", "fire-flames", {
    damageType: "fire", palette: "fire", aftermathEffect: "fire-embers",
    preview: target(60), scale: .72, impactDuration: 1350,
    specialOptions: { particles: 0 }
  }),
  profile("gentle-repose", "Gentle Repose", "touch", "profile-glyph", {
    palette: "necrotic", aftermathEffect: "profile-mist", preview: touch,
    scale: .68, specialOptions: { variant: "rune", particles: 3 }
  }),
  profile("gust-of-wind", "Gust of Wind", "line", "profile-ripple", {
    palette: "wind", projectileEffect: "profile-wind", aftermathEffect: "profile-mist",
    travelDuration: 360, scale: .9,
    specialOptions: { ...geometry, impactAtPath: true, aftermathAtPath: true, particles: 7 }
  }),
  profile("heat-metal", "Heat Metal", "target-impact", "fire-flames", {
    damageType: "fire", palette: "fire", aftermathEffect: "fire-embers",
    preview: target(60), scale: .62, specialOptions: { particles: 0 }
  }),
  profile("hold-person", "Hold Person", "target-impact", "profile-glyph", {
    palette: "psychic", aftermathEffect: "status-debuff-power-down",
    preview: target(60), scale: .72,
    specialOptions: { variant: "chain", particles: 4 }
  }),
  profile("invisibility", "Invisibility", "touch", "profile-shimmer", {
    palette: "arcane", aftermathEffect: "profile-sparkles", preview: touch,
    scale: .74, specialOptions: { particles: 5 }
  }),
  profile("knock", "Knock", "target-impact", "profile-glyph", {
    palette: "thunder", aftermathEffect: "profile-ripple", preview: target(60),
    scale: .72, specialOptions: { variant: "lock", particles: 5 }
  }),
  profile("lesser-restoration", "Lesser Restoration", "touch", "status-buff-regeneration", {
    palette: "healing", aftermathEffect: "profile-sparkles", preview: touch, scale: .72
  }),
  profile("levitate", "Levitate", "target-impact", "profile-wind", {
    palette: "wind", aftermathEffect: "profile-sparkles", preview: target(60),
    scale: .72, specialOptions: { particles: 6 }
  }),
  profile("locate-animals-or-plants", "Locate Animals or Plants", "self", "status-buff-truesight", {
    palette: "nature", aftermathEffect: "profile-leaves", preview: self, scale: .7
  }),
  profile("locate-object", "Locate Object", "self", "status-buff-truesight", {
    palette: "arcane", aftermathEffect: "profile-glyph", preview: self, scale: .7,
    specialOptions: { variant: "target", particles: 0 }
  }),
  profile("magic-mouth", "Magic Mouth", "target-impact", "profile-glyph", {
    palette: "arcane", aftermathEffect: "profile-message", preview: target(30),
    scale: .7, specialOptions: { variant: "voice", particles: 4 }
  }),
  profile("mirror-image", "Mirror Image", "self", "profile-shimmer", {
    palette: "arcane", aftermathEffect: "profile-sparkles", preview: self,
    impactCount: 3, scale: .7, specialOptions: { particles: 7 }
  }),
  profile("misty-step", "Misty Step", "self", "profile-wind", {
    palette: "arcane", aftermathEffect: "profile-shimmer", preview: self,
    scale: .72, specialOptions: { particles: 7 }
  }),
  profile("pass-without-trace", "Pass without Trace", "self", "profile-ground", {
    palette: "nature", aftermathEffect: "profile-shimmer", preview: self,
    scale: .82, specialOptions: { anchor: "caster", particles: 4 }
  }),
  profile("prayer-of-healing", "Prayer of Healing", "aura", "status-buff-regeneration", {
    palette: "healing", aftermathEffect: "profile-sparkles", preview: target(30), scale: .74
  }),
  profile("protection-from-poison", "Protection from Poison", "touch", "status-buff-elemental-ward", {
    palette: "nature", preview: touch, scale: .74
  }),
  profile("rope-trick", "Rope Trick", "touch", "profile-glyph", {
    palette: "arcane", aftermathEffect: "profile-shimmer", preview: touch,
    scale: .74, specialOptions: { variant: "portal", particles: 5 }
  }),
  profile("see-invisibility", "See Invisibility", "self", "status-buff-truesight", {
    palette: "arcane", preview: self, scale: .7
  }),
  profile("spider-climb", "Spider Climb", "touch", "status-buff-haste", {
    palette: "nature", aftermathEffect: "profile-leaves", preview: touch, scale: .72
  }),
  profile("spike-growth", "Spike Growth", "ground-effect", "profile-ground", {
    palette: "nature", aftermathEffect: "profile-leaves",
    impactDuration: 1450, scale: .92,
    specialOptions: { ...geometry, particles: 7 }
  }),
  profile("spiritual-weapon", "Spiritual Weapon", "target-impact", "profile-blades", {
    damageType: "force", palette: "force", aftermathEffect: "profile-sparkles",
    preview: target(60), scale: .72, specialOptions: { particles: 5 }
  }),
  profile("suggestion", "Suggestion", "target-impact", "profile-glyph", {
    palette: "psychic", aftermathEffect: "profile-shimmer", preview: target(30),
    scale: .7, specialOptions: { variant: "voice", particles: 4 }
  }),
  profile("warding-bond", "Warding Bond", "touch", "profile-glyph", {
    palette: "radiant", aftermathEffect: "status-buff-shield", preview: touch,
    scale: .74, specialOptions: { variant: "chain", particles: 3 }
  }),
  profile("web", "Web", "ground-effect", "profile-glyph", {
    palette: "wind", aftermathEffect: "profile-ground",
    impactDuration: 1350, scale: .9,
    specialOptions: { ...geometry, variant: "web", particles: 4 }
  }),
  profile("zone-of-truth", "Zone of Truth", "ground-effect", "profile-glyph", {
    palette: "radiant", aftermathEffect: "profile-ripple",
    scale: .9, specialOptions: { ...geometry, variant: "eye", particles: 5 }
  })
]);
