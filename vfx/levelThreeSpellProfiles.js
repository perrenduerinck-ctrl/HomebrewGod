// Presentation-only compositions for the remainder of the level-three catalog.
// No profile applies conditions, creates creatures, moves tokens, restores hit
// points, or spends resources; those mechanics remain outside the VFX system.
const self = Object.freeze({ mode: "self", label: "Self (visual preview)" });
const touch = Object.freeze({ mode: "target", rangeFeet: 5, label: "Touch (5-ft preview reach)" });
const target = (rangeFeet, label = `${rangeFeet} feet`) => Object.freeze({
  mode: "target", rangeFeet, label
});

function profile(spellId, label, family, targetEffect, options = {}) {
  return {
    spellId,
    label,
    family,
    targetEffect,
    impactDuration: 1150,
    aftermathDuration: 600,
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

export const LEVEL_THREE_SPELL_PROFILES = Object.freeze([
  profile("animate-dead", "Animate Dead", "target-impact", "profile-glyph", {
    palette: "necrotic", aftermathEffect: "profile-mist", preview: target(10),
    scale: .72, specialOptions: { variant: "skull", particles: 5 }
  }),
  profile("beacon-of-hope", "Beacon of Hope", "aura", "status-buff-blessing", {
    palette: "healing", aftermathEffect: "profile-sparkles", preview: target(30), scale: .76
  }),
  profile("blink", "Blink", "self", "profile-glyph", {
    palette: "arcane", aftermathEffect: "profile-shimmer", preview: self,
    scale: .72, specialOptions: { variant: "portal", anchor: "caster", particles: 6 }
  }),
  profile("clairvoyance", "Clairvoyance", "target-impact", "profile-glyph", {
    palette: "psychic", aftermathEffect: "profile-ripple", scale: .72,
    specialOptions: { variant: "eye", particles: 5 }
  }),
  profile("conjure-animals", "Conjure Animals", "utility-glyph", "profile-glyph", {
    palette: "nature", aftermathEffect: "profile-leaves", preview: target(60),
    scale: .78, specialOptions: { variant: "portal", particles: 8 }
  }),
  profile("counterspell", "Counterspell", "target-impact", "profile-glyph", {
    palette: "arcane", aftermathEffect: "profile-ripple", preview: target(60),
    scale: .72, specialOptions: { variant: "cancel", particles: 5 }
  }),
  profile("create-food-and-water", "Create Food and Water", "utility-glyph", "profile-glyph", {
    palette: "healing", aftermathEffect: "profile-sparkles", preview: target(30),
    scale: .72, specialOptions: { variant: "heart", particles: 7 }
  }),
  profile("daylight", "Daylight", "ground-effect", "profile-rays", {
    palette: "radiant", aftermathEffect: "profile-sparkles", impactDuration: 1500,
    scale: .92, specialOptions: { ...geometry, maxGeometryScale: 6, particles: 8 }
  }),
  profile("dispel-magic", "Dispel Magic", "target-impact", "profile-glyph", {
    palette: "arcane", aftermathEffect: "profile-shimmer", preview: target(120),
    scale: .72, specialOptions: { variant: "cancel", particles: 6 }
  }),
  profile("fear", "Fear", "cone", "profile-mist", {
    palette: "psychic", projectileEffect: "profile-cone", aftermathEffect: "profile-ripple",
    travelDuration: 260, scale: .9,
    specialOptions: { ...geometry, impactAtPath: true, aftermathAtPath: true, particles: 7 }
  }),
  profile("fly", "Fly", "touch", "status-buff-haste", {
    palette: "wind", aftermathEffect: "profile-wind", preview: touch, scale: .74
  }),
  profile("gaseous-form", "Gaseous Form", "touch", "profile-mist", {
    palette: "wind", aftermathEffect: "profile-shimmer", preview: touch,
    impactDuration: 1400, scale: .76, specialOptions: { particles: 6 }
  }),
  profile("glyph-of-warding", "Glyph of Warding", "touch", "profile-glyph", {
    palette: "arcane", aftermathEffect: "profile-ripple", preview: touch,
    scale: .76, specialOptions: { variant: "ward", particles: 6 }
  }),
  profile("hypnotic-pattern", "Hypnotic Pattern", "target-impact", "profile-glyph", {
    palette: "psychic", aftermathEffect: "profile-ripple", preview: target(120),
    impactDuration: 1450, scale: .82, specialOptions: { variant: "spiral", particles: 8 }
  }),
  profile("magic-circle", "Magic Circle", "ground-effect", "profile-glyph", {
    palette: "radiant", aftermathEffect: "profile-ripple", impactDuration: 1450,
    scale: .9, specialOptions: { ...geometry, variant: "ward", particles: 6 }
  }),
  profile("major-image", "Major Image", "utility-glyph", "profile-shimmer", {
    palette: "arcane", aftermathEffect: "profile-sparkles", preview: target(120),
    impactDuration: 1450, scale: .82, specialOptions: { particles: 7 }
  }),
  profile("mass-healing-word", "Mass Healing Word", "aura", "status-buff-regeneration", {
    palette: "healing", aftermathEffect: "profile-sparkles", preview: target(60), scale: .76
  }),
  profile("meld-into-stone", "Meld into Stone", "touch", "profile-stones", {
    palette: "earth", aftermathEffect: "profile-ground", preview: touch,
    scale: .78, specialOptions: { particles: 4 }
  }),
  profile("nondetection", "Nondetection", "touch", "status-buff-barrier", {
    palette: "arcane", preview: touch, scale: .74
  }),
  profile("phantom-steed", "Phantom Steed", "utility-glyph", "profile-glyph", {
    palette: "arcane", aftermathEffect: "profile-wind", preview: target(30),
    scale: .78, specialOptions: { variant: "horse", particles: 7 }
  }),
  profile("plant-growth", "Plant Growth", "target-impact", "profile-leaves", {
    palette: "nature", aftermathEffect: "profile-ground", preview: target(150),
    impactDuration: 1450, scale: .88, specialOptions: { particles: 9 }
  }),
  profile("remove-curse", "Remove Curse", "touch", "profile-glyph", {
    palette: "radiant", aftermathEffect: "status-buff-blessing", preview: touch,
    scale: .72, specialOptions: { variant: "cancel", particles: 4 }
  }),
  profile("revivify", "Revivify", "touch", "status-buff-regeneration", {
    palette: "healing", aftermathEffect: "profile-rays", preview: touch, scale: .76
  }),
  profile("sending", "Sending", "utility-ripple", "profile-glyph", {
    palette: "psychic", projectileEffect: "profile-message", aftermathEffect: "profile-ripple",
    preview: target(300, "Remote recipient (visual preview)"), scale: .68,
    specialOptions: { variant: "voice", particles: 3 }
  }),
  profile("speak-with-dead", "Speak with Dead", "target-impact", "profile-glyph", {
    palette: "necrotic", aftermathEffect: "profile-message", preview: target(10),
    scale: .74, specialOptions: { variant: "skull", particles: 5 }
  }),
  profile("speak-with-plants", "Speak with Plants", "ground-effect", "profile-leaves", {
    palette: "nature", aftermathEffect: "profile-ripple", impactDuration: 1400,
    scale: .9, specialOptions: { ...geometry, particles: 8 }
  }),
  profile("spirit-guardians", "Spirit Guardians", "self", "profile-glyph", {
    palette: "radiant", aftermathEffect: "profile-sparkles", preview: self,
    impactCount: 3, scale: .78,
    specialOptions: { variant: "shield", anchor: "caster", particles: 8 }
  }),
  profile("tiny-hut", "Tiny Hut", "ground-effect", "profile-glyph", {
    palette: "arcane", aftermathEffect: "profile-shimmer", impactDuration: 1450,
    scale: .9, specialOptions: { ...geometry, variant: "shield", anchor: "caster", particles: 5 }
  }),
  profile("tongues", "Tongues", "touch", "profile-glyph", {
    palette: "psychic", aftermathEffect: "profile-message", preview: touch,
    scale: .7, specialOptions: { variant: "voice", particles: 4 }
  }),
  profile("water-breathing", "Water Breathing", "aura", "status-buff-elemental-ward", {
    palette: "water", aftermathEffect: "profile-ripple", preview: target(30), scale: .74
  }),
  profile("water-walk", "Water Walk", "aura", "profile-glyph", {
    palette: "water", aftermathEffect: "profile-ripple", preview: target(30),
    scale: .76, specialOptions: { variant: "waves", particles: 5 }
  }),
  profile("wind-wall", "Wind Wall", "line", "profile-wind", {
    palette: "wind", projectileEffect: "profile-wind", aftermathEffect: "profile-mist",
    preview: target(120, "120 feet (wall preview anchor)"), travelDuration: 320,
    impactDuration: 1400, scale: .9,
    specialOptions: { impactAtPath: true, aftermathAtPath: true, particles: 8 }
  })
]);
