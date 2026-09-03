// Presentation-only compositions for the remainder of the level-four catalog.
// These profiles never move tokens, create creatures, apply conditions, change
// hit points, or spend resources; game rules remain outside the VFX system.
const self = Object.freeze({ mode: "self", label: "Self (visual preview)" });
const touch = Object.freeze({
  mode: "target", rangeFeet: 5, label: "Touch (5-ft preview reach)"
});
const wallAnchor = Object.freeze({
  mode: "target", rangeFeet: 120, label: "120 feet (wall preview anchor)"
});

function profile(spellId, label, family, targetEffect, options = {}) {
  return {
    spellId,
    label,
    family,
    targetEffect,
    impactDuration: 1200,
    aftermathDuration: 650,
    scale: .8,
    particleMultiplier: 1,
    ...options,
    specialOptions: {
      particles: targetEffect.startsWith("status-") ? 0 : 6,
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

export const LEVEL_FOUR_SPELL_PROFILES = Object.freeze([
  profile("arcane-eye", "Arcane Eye", "target-impact", "profile-glyph", {
    palette: "arcane", aftermathEffect: "profile-ripple", scale: .74,
    specialOptions: { variant: "eye", particles: 5 }
  }),
  profile("banishment", "Banishment", "target-impact", "profile-glyph", {
    palette: "arcane", aftermathEffect: "profile-shimmer", scale: .78,
    specialOptions: { variant: "portal", particles: 7 }
  }),
  profile("black-tentacles", "Black Tentacles", "ground-effect", "status-debuff-entangle", {
    palette: "necrotic", aftermathEffect: "profile-mist", impactDuration: 1550,
    scale: .62, specialOptions: { ...geometry, particles: 0 }
  }),
  profile("compulsion", "Compulsion", "target-impact", "status-debuff-confusion", {
    palette: "psychic", aftermathEffect: "profile-ripple", scale: .76
  }),
  profile("conjure-minor-elementals", "Conjure Minor Elementals", "utility-glyph", "profile-glyph", {
    palette: "arcane", aftermathEffect: "profile-sparkles", impactDuration: 1450,
    scale: .82, specialOptions: { variant: "elements", particles: 9 }
  }),
  profile("conjure-woodland-beings", "Conjure Woodland Beings", "utility-glyph", "profile-glyph", {
    palette: "nature", aftermathEffect: "profile-leaves", impactDuration: 1450,
    scale: .82, specialOptions: { variant: "portal", particles: 9 }
  }),
  profile("control-water", "Control Water", "ground-effect", "profile-ripple", {
    palette: "water", aftermathEffect: "profile-shimmer", impactDuration: 1600,
    scale: .94, specialOptions: { ...geometry, variant: "waves", particles: 10 }
  }),
  profile("death-ward", "Death Ward", "touch", "profile-glyph", {
    palette: "radiant", aftermathEffect: "status-buff-barrier", preview: touch,
    scale: .74, specialOptions: { variant: "ward", particles: 5 }
  }),
  profile("dimension-door", "Dimension Door", "utility-glyph", "profile-glyph", {
    palette: "arcane", aftermathEffect: "profile-shimmer", impactDuration: 1450,
    scale: .8, specialOptions: { variant: "portal", particles: 8 }
  }),
  profile("divination", "Divination", "self", "profile-glyph", {
    palette: "radiant", aftermathEffect: "profile-ripple", preview: self,
    scale: .74, specialOptions: { variant: "eye", anchor: "caster", particles: 5 }
  }),
  profile("dominate-beast", "Dominate Beast", "target-impact", "status-debuff-ominous-eye", {
    palette: "psychic", aftermathEffect: "profile-ripple", scale: .76
  }),
  profile("fabricate", "Fabricate", "utility-glyph", "profile-glyph", {
    palette: "earth", aftermathEffect: "profile-sparkles", scale: .76,
    specialOptions: { variant: "repair", particles: 7 }
  }),
  profile("faithful-hound", "Faithful Hound", "utility-glyph", "profile-glyph", {
    palette: "arcane", aftermathEffect: "profile-ripple", scale: .78,
    specialOptions: { variant: "paw", particles: 6 }
  }),
  profile("fire-shield", "Fire Shield", "self", "status-buff-elemental-ward", {
    palette: "fire", aftermathEffect: "fire-flames", preview: self,
    impactDuration: 1450, scale: .78,
    specialOptions: { variant: "shield", anchor: "caster", particles: 0 }
  }),
  profile("freedom-of-movement", "Freedom of Movement", "touch", "status-buff-haste", {
    palette: "wind", aftermathEffect: "profile-wind", preview: touch, scale: .74
  }),
  profile("giant-insect", "Giant Insect", "target-impact", "profile-swarm", {
    palette: "nature", aftermathEffect: "profile-leaves", impactDuration: 1450,
    scale: .82, specialOptions: { particles: 8 }
  }),
  profile("greater-invisibility", "Greater Invisibility", "touch", "profile-shimmer", {
    palette: "arcane", aftermathEffect: "profile-sparkles", preview: touch,
    impactDuration: 1450, scale: .76, specialOptions: { particles: 5 }
  }),
  profile("hallucinatory-terrain", "Hallucinatory Terrain", "ground-effect", "profile-shimmer", {
    palette: "psychic", aftermathEffect: "profile-ground", impactDuration: 1600,
    scale: .94, specialOptions: { ...geometry, particles: 8 }
  }),
  profile("locate-creature", "Locate Creature", "self", "status-buff-truesight", {
    palette: "wind", aftermathEffect: "profile-ripple", preview: self,
    scale: .74, specialOptions: { anchor: "caster", particles: 0 }
  }),
  profile("polymorph", "Polymorph", "target-impact", "profile-glyph", {
    palette: "nature", aftermathEffect: "profile-shimmer", impactDuration: 1450,
    scale: .8, specialOptions: { variant: "paw", particles: 8 }
  }),
  profile("private-sanctum", "Private Sanctum", "ground-effect", "profile-glyph", {
    palette: "arcane", aftermathEffect: "profile-shimmer", impactDuration: 1550,
    scale: .94, specialOptions: { ...geometry, variant: "lock", particles: 6 }
  }),
  profile("resilient-sphere", "Resilient Sphere", "target-impact", "status-buff-barrier", {
    palette: "force", aftermathEffect: "profile-ripple", scale: .8
  }),
  profile("secret-chest", "Secret Chest", "touch", "profile-glyph", {
    palette: "arcane", aftermathEffect: "profile-sparkles", preview: touch,
    scale: .76, specialOptions: { variant: "chest", particles: 6 }
  }),
  profile("stone-shape", "Stone Shape", "touch", "profile-stones", {
    palette: "earth", aftermathEffect: "profile-ground", preview: touch,
    scale: .8, specialOptions: { particles: 5 }
  }),
  profile("stoneskin", "Stoneskin", "touch", "status-buff-armor", {
    palette: "earth", aftermathEffect: "profile-stones", preview: touch, scale: .76
  }),
  profile("wall-of-fire", "Wall of Fire", "line", "profile-fire-wall", {
    palette: "fire", projectileEffect: "profile-fire-wall", aftermathEffect: "fire-embers",
    preview: wallAnchor, travelDuration: 360, impactDuration: 1550, scale: .94,
    specialOptions: { impactAtPath: true, aftermathAtPath: true, particles: 10 }
  })
]);
