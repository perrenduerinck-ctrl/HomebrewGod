// Presentation-only compositions for the previously unmapped level 7-9 catalog.
// These records never resolve rolls, movement, conditions, healing, summons,
// persistence, or resources; they only drive the bounded preview renderer.
const self = Object.freeze({ mode: "self", label: "Self (visual preview)" });
const touch = Object.freeze({
  mode: "target", rangeFeet: 5, label: "Touch (5-ft preview reach)"
});
const target = (rangeFeet, label = `${rangeFeet} feet`) => Object.freeze({
  mode: "target", rangeFeet, label
});
const symbolPreview = Object.freeze({
  mode: "target", rangeFeet: 5, shape: "cube", sizeFeet: 10,
  label: "Touch (10-ft symbol preview)"
});
const wallAnchor = Object.freeze({
  mode: "target", rangeFeet: 60, label: "60 feet (wall preview anchor)"
});

function profile(spellId, label, family, targetEffect, options = {}) {
  return {
    spellId,
    label,
    family,
    targetEffect,
    impactDuration: 1500,
    aftermathDuration: 760,
    scale: .9,
    particleMultiplier: 1,
    ...options,
    specialOptions: {
      particles: targetEffect.startsWith("status-") ? 0 : 9,
      scaleWithLevel: false,
      ...options.specialOptions
    }
  };
}

const geometry = Object.freeze({
  geometryScale: true,
  geometryBasePixels: 160,
  fitGeometry: true,
  maxGeometryScale: 6
});

export const LEVEL_SEVEN_SPELL_PROFILES = Object.freeze([
  profile("conjure-celestial", "Conjure Celestial", "utility-glyph", "profile-glyph", {
    palette: "radiant", aftermathEffect: "profile-rays", preview: target(90),
    impactDuration: 1650, specialOptions: { variant: "wings", particles: 12 }
  }),
  profile("etherealness", "Etherealness", "self", "profile-shimmer", {
    palette: "psychic", aftermathEffect: "profile-mist", preview: self,
    impactDuration: 1700, specialOptions: { anchor: "caster", particles: 10 }
  }),
  profile("magnificent-mansion", "Magnificent Mansion", "ground-effect", "profile-glyph", {
    palette: "radiant", aftermathEffect: "profile-shimmer", impactDuration: 1700,
    specialOptions: { ...geometry, variant: "door", particles: 11 }
  }),
  profile("mirage-arcane", "Mirage Arcane", "ground-effect", "profile-shimmer", {
    palette: "arcane", aftermathEffect: "profile-sparkles", impactDuration: 1800,
    specialOptions: { ...geometry, particles: 13 }
  }),
  profile("prismatic-spray", "Prismatic Spray", "cone", "profile-rays", {
    palette: "radiant", projectileEffect: "profile-prismatic-cone",
    aftermathEffect: "profile-sparkles", travelDuration: 480, impactDuration: 1550,
    scale: 1, specialOptions: { ...geometry, impactAtPath: true, particles: 12 }
  }),
  profile("project-image", "Project Image", "utility-glyph", "profile-glyph", {
    palette: "psychic", aftermathEffect: "profile-shimmer", impactDuration: 1650,
    specialOptions: { variant: "mirror", particles: 10 }
  }),
  profile("resurrection", "Resurrection", "touch", "status-buff-regeneration", {
    palette: "healing", aftermathEffect: "profile-rays", preview: touch,
    impactDuration: 1700, scale: .86
  }),
  profile("sequester", "Sequester", "touch", "profile-glyph", {
    palette: "arcane", aftermathEffect: "profile-mist", preview: touch,
    impactDuration: 1650, specialOptions: { variant: "lock", particles: 8 }
  }),
  profile("simulacrum", "Simulacrum", "touch", "profile-glyph", {
    palette: "cold", aftermathEffect: "profile-shimmer", preview: touch,
    impactDuration: 1700, specialOptions: { variant: "twins", particles: 11 }
  }),
  profile("symbol", "Symbol", "ground-effect", "profile-glyph", {
    palette: "arcane", aftermathEffect: "profile-rays", preview: symbolPreview,
    impactDuration: 1750, specialOptions: { ...geometry, variant: "ward", particles: 12 }
  })
]);

export const LEVEL_EIGHT_SPELL_PROFILES = Object.freeze([
  profile("animal-shapes", "Animal Shapes", "target-impact", "profile-glyph", {
    palette: "nature", aftermathEffect: "profile-leaves", preview: target(30),
    impactDuration: 1650, specialOptions: { variant: "paw", particles: 11 }
  }),
  profile("antipathy-sympathy", "Antipathy/Sympathy", "ground-effect", "profile-glyph", {
    palette: "psychic", aftermathEffect: "profile-ripple", impactDuration: 1800,
    specialOptions: { ...geometry, variant: "magnet", particles: 13 }
  }),
  profile("clone", "Clone", "touch", "profile-glyph", {
    palette: "healing", aftermathEffect: "profile-shimmer", preview: touch,
    impactDuration: 1700, specialOptions: { variant: "twins", particles: 10 }
  }),
  profile("control-weather", "Control Weather", "self", "profile-weather", {
    palette: "lightning", aftermathEffect: "profile-wind", preview: self,
    impactDuration: 1900, scale: 1.05,
    specialOptions: { anchor: "caster", particles: 10 }
  }),
  profile("glibness", "Glibness", "self", "profile-glyph", {
    palette: "radiant", aftermathEffect: "profile-sparkles", preview: self,
    impactDuration: 1600, specialOptions: { variant: "voice", anchor: "caster", particles: 9 }
  }),
  profile("mind-blank", "Mind Blank", "touch", "status-buff-barrier", {
    palette: "psychic", aftermathEffect: "profile-shimmer", preview: touch,
    impactDuration: 1700, scale: .9
  })
]);

export const LEVEL_NINE_SPELL_PROFILES = Object.freeze([
  profile("astral-projection", "Astral Projection", "aura", "profile-glyph", {
    palette: "psychic", aftermathEffect: "profile-shimmer", preview: target(10),
    impactDuration: 1800, specialOptions: { variant: "astral", particles: 13 }
  }),
  profile("foresight", "Foresight", "touch", "status-buff-truesight", {
    palette: "radiant", aftermathEffect: "profile-rays", preview: touch,
    impactDuration: 1750, scale: .9
  }),
  profile("prismatic-wall", "Prismatic Wall", "line", "profile-prismatic-wall", {
    palette: "radiant", projectileEffect: "profile-prismatic-wall",
    aftermathEffect: "profile-sparkles", preview: wallAnchor,
    travelDuration: 480, impactDuration: 1900, scale: 1.05,
    specialOptions: { impactAtPath: true, aftermathAtPath: true, particles: 13 }
  }),
  profile("shapechange", "Shapechange", "self", "profile-glyph", {
    palette: "nature", aftermathEffect: "profile-mist", preview: self,
    impactDuration: 1800,
    specialOptions: { variant: "transmute", anchor: "caster", particles: 12 }
  }),
  profile("true-polymorph", "True Polymorph", "target-impact", "profile-glyph", {
    palette: "arcane", aftermathEffect: "profile-shimmer", preview: target(30),
    impactDuration: 1800, specialOptions: { variant: "transmute", particles: 12 }
  }),
  profile("true-resurrection", "True Resurrection", "touch", "status-buff-regeneration", {
    palette: "healing", aftermathEffect: "profile-rays", preview: touch,
    impactDuration: 1900, scale: .94
  })
]);

export const HIGH_LEVEL_SPELL_PROFILES = Object.freeze([
  ...LEVEL_SEVEN_SPELL_PROFILES,
  ...LEVEL_EIGHT_SPELL_PROFILES,
  ...LEVEL_NINE_SPELL_PROFILES
]);
