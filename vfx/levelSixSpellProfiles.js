// Presentation-only compositions for the remainder of the level-six catalog.
// These profiles never resolve rolls, movement, conditions, healing, summons,
// persistence, or resources; they only drive the bounded preview renderer.
const self = Object.freeze({ mode: "self", label: "Self (visual preview)" });
const touch = Object.freeze({
  mode: "target", rangeFeet: 5, label: "Touch (5-ft preview reach)"
});
const target = (rangeFeet, label = `${rangeFeet} feet`) => Object.freeze({
  mode: "target", rangeFeet, label
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
    impactDuration: 1300,
    aftermathDuration: 720,
    scale: .84,
    particleMultiplier: 1,
    ...options,
    specialOptions: {
      particles: targetEffect.startsWith("status-") ? 0 : 8,
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

export const LEVEL_SIX_SPELL_PROFILES = Object.freeze([
  profile("blade-barrier", "Blade Barrier", "line", "profile-blade-wall", {
    palette: "slashing", projectileEffect: "profile-blade-wall",
    aftermathEffect: "profile-blades", preview: target(90, "90 feet (wall preview anchor)"),
    travelDuration: 420, impactDuration: 1700,
    scale: .98, specialOptions: { impactAtPath: true, aftermathAtPath: true, particles: 10 }
  }),
  profile("conjure-fey", "Conjure Fey", "utility-glyph", "profile-glyph", {
    palette: "nature", aftermathEffect: "profile-leaves", preview: target(90),
    impactDuration: 1550, scale: .9, specialOptions: { variant: "wings", particles: 11 }
  }),
  profile("contingency", "Contingency", "self", "profile-glyph", {
    palette: "force", aftermathEffect: "status-buff-barrier", preview: self,
    impactDuration: 1500, specialOptions: { variant: "ward", anchor: "caster", particles: 8 }
  }),
  profile("create-undead", "Create Undead", "target-impact", "profile-glyph", {
    palette: "necrotic", aftermathEffect: "profile-mist", preview: target(10),
    impactDuration: 1550, specialOptions: { variant: "skull", particles: 9 }
  }),
  profile("eyebite", "Eyebite", "self", "profile-glyph", {
    palette: "necrotic", aftermathEffect: "status-debuff-ominous-eye", preview: self,
    impactDuration: 1500, specialOptions: { variant: "eye", anchor: "caster", particles: 8 }
  }),
  profile("find-the-path", "Find the Path", "self", "profile-glyph", {
    palette: "radiant", aftermathEffect: "profile-sparkles", preview: self,
    impactDuration: 1450, specialOptions: { variant: "path", anchor: "caster", particles: 7 }
  }),
  profile("flesh-to-stone", "Flesh to Stone", "target-impact", "status-buff-armor", {
    palette: "earth", aftermathEffect: "profile-stones", preview: target(60),
    impactDuration: 1550, scale: .82
  }),
  profile("forbiddance", "Forbiddance", "ground-effect", "profile-glyph", {
    palette: "radiant", aftermathEffect: "profile-rays", impactDuration: 1700,
    scale: .96, specialOptions: { ...geometry, variant: "ward", particles: 12 }
  }),
  profile("guards-and-wards", "Guards and Wards", "ground-effect", "profile-glyph", {
    palette: "arcane", aftermathEffect: "profile-shimmer", impactDuration: 1700,
    scale: .96, specialOptions: { ...geometry, variant: "lock", particles: 12 }
  }),
  profile("heal", "Heal", "target-impact", "status-buff-regeneration", {
    palette: "healing", aftermathEffect: "profile-rays", preview: target(60),
    impactDuration: 1550, scale: .82
  }),
  profile("heroes-feast", "Heroes' Feast", "aura", "profile-glyph", {
    palette: "healing", aftermathEffect: "status-buff-blessing", preview: target(30),
    impactDuration: 1550, scale: .88, specialOptions: { variant: "feast", particles: 10 }
  }),
  profile("instant-summons", "Instant Summons", "touch", "profile-glyph", {
    palette: "arcane", aftermathEffect: "profile-sparkles", preview: touch,
    impactDuration: 1500, specialOptions: { variant: "objects", particles: 9 }
  }),
  profile("irresistible-dance", "Irresistible Dance", "target-impact", "profile-glyph", {
    palette: "psychic", aftermathEffect: "status-debuff-confusion", preview: target(30),
    impactDuration: 1550, specialOptions: { variant: "music", particles: 10 }
  }),
  profile("magic-jar", "Magic Jar", "self", "profile-glyph", {
    palette: "necrotic", aftermathEffect: "profile-mist", preview: self,
    impactDuration: 1550, specialOptions: { variant: "jar", anchor: "caster", particles: 9 }
  }),
  profile("move-earth", "Move Earth", "cone", "profile-stones", {
    palette: "earth", projectileEffect: "profile-cone", aftermathEffect: "profile-ground",
    travelDuration: 320, impactDuration: 1600, scale: .94,
    specialOptions: { ...geometry, impactAtPath: true, aftermathAtPath: true, particles: 11 }
  }),
  profile("planar-ally", "Planar Ally", "utility-glyph", "profile-glyph", {
    palette: "radiant", aftermathEffect: "profile-rays", preview: target(60),
    impactDuration: 1600, scale: .9,
    specialOptions: { variant: "portal", particles: 11 }
  }),
  profile("programmed-illusion", "Programmed Illusion", "ground-effect", "profile-shimmer", {
    palette: "arcane", aftermathEffect: "profile-sparkles", impactDuration: 1650,
    scale: .94, specialOptions: { ...geometry, particles: 11 }
  }),
  profile("transport-via-plants", "Transport via Plants", "utility-glyph", "profile-glyph", {
    palette: "nature", aftermathEffect: "profile-leaves", preview: target(10),
    impactDuration: 1550, scale: .9, specialOptions: { variant: "tree", particles: 10 }
  }),
  profile("wall-of-ice", "Wall of Ice", "line", "profile-ice-wall", {
    palette: "cold", projectileEffect: "profile-ice-wall", aftermathEffect: "profile-shard",
    preview: wallAnchor, travelDuration: 420, impactDuration: 1700, scale: .98,
    specialOptions: { impactAtPath: true, aftermathAtPath: true, particles: 10 }
  }),
  profile("wall-of-thorns", "Wall of Thorns", "line", "profile-thorn-wall", {
    palette: "nature", projectileEffect: "profile-thorn-wall", aftermathEffect: "profile-leaves",
    preview: wallAnchor, travelDuration: 420, impactDuration: 1700, scale: .98,
    specialOptions: { impactAtPath: true, aftermathAtPath: true, particles: 11 }
  }),
  profile("wind-walk", "Wind Walk", "aura", "profile-wind", {
    palette: "wind", aftermathEffect: "status-buff-haste", preview: target(30),
    impactDuration: 1550, scale: .9, specialOptions: { particles: 10 }
  }),
  profile("word-of-recall", "Word of Recall", "ground-effect", "profile-glyph", {
    palette: "radiant", aftermathEffect: "profile-shimmer", impactDuration: 1550,
    scale: .92, specialOptions: { ...geometry, variant: "portal", particles: 10 }
  })
]);
