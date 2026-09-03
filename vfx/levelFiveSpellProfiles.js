// Presentation-only compositions for the remainder of the level-five catalog.
// Profiles preview a spell's visual identity without moving tokens, creating
// creatures, applying conditions, changing hit points, or spending resources.
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
    impactDuration: 1250,
    aftermathDuration: 700,
    scale: .82,
    particleMultiplier: 1,
    ...options,
    specialOptions: {
      particles: targetEffect.startsWith("status-") ? 0 : 7,
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

export const LEVEL_FIVE_SPELL_PROFILES = Object.freeze([
  profile("animate-objects", "Animate Objects", "utility-glyph", "profile-glyph", {
    palette: "force", aftermathEffect: "profile-sparkles", preview: target(120),
    impactDuration: 1500, specialOptions: { variant: "objects", particles: 10 }
  }),
  profile("antilife-shell", "Antilife Shell", "self", "profile-glyph", {
    palette: "nature", aftermathEffect: "profile-ripple",
    impactDuration: 1550, scale: .92,
    specialOptions: { ...geometry, variant: "shield", anchor: "caster", particles: 8 }
  }),
  profile("arcane-hand", "Arcane Hand", "utility-hand", "profile-hand", {
    palette: "force", aftermathEffect: "profile-ripple", preview: target(120),
    impactDuration: 1500, scale: .9, specialOptions: { particles: 9 }
  }),
  profile("awaken", "Awaken", "touch", "profile-leaves", {
    palette: "nature", aftermathEffect: "status-buff-blessing", preview: touch,
    impactDuration: 1500, scale: .8, specialOptions: { particles: 8 }
  }),
  profile("commune", "Commune", "self", "profile-glyph", {
    palette: "radiant", aftermathEffect: "profile-rays", preview: self,
    scale: .78, specialOptions: { variant: "eye", anchor: "caster", particles: 7 }
  }),
  profile("commune-with-nature", "Commune With Nature", "self", "profile-leaves", {
    palette: "nature", aftermathEffect: "profile-ripple", preview: self,
    impactDuration: 1500, specialOptions: { anchor: "caster", particles: 9 }
  }),
  profile("conjure-elemental", "Conjure Elemental", "utility-glyph", "profile-glyph", {
    palette: "arcane", aftermathEffect: "profile-sparkles",
    impactDuration: 1550, scale: .9,
    specialOptions: { ...geometry, variant: "elements", particles: 11 }
  }),
  profile("contact-other-plane", "Contact Other Plane", "self", "profile-glyph", {
    palette: "psychic", aftermathEffect: "profile-shimmer", preview: self,
    impactDuration: 1500, specialOptions: { variant: "portal", anchor: "caster", particles: 9 }
  }),
  profile("contagion", "Contagion", "touch", "status-debuff-poison", {
    palette: "poison", aftermathEffect: "profile-mist", preview: touch, scale: .78
  }),
  profile("creation", "Creation", "utility-glyph", "profile-glyph", {
    palette: "arcane", aftermathEffect: "profile-sparkles",
    impactDuration: 1450, specialOptions: { ...geometry, variant: "objects", particles: 8 }
  }),
  profile("dispel-evil-and-good", "Dispel Evil and Good", "self", "status-buff-elemental-ward", {
    palette: "radiant", aftermathEffect: "profile-rays", preview: self,
    impactDuration: 1450, specialOptions: { anchor: "caster", particles: 0 }
  }),
  profile("dominate-person", "Dominate Person", "target-impact", "status-debuff-ominous-eye", {
    palette: "psychic", aftermathEffect: "profile-ripple", preview: target(60), scale: .8
  }),
  profile("dream", "Dream", "self", "status-debuff-sleep", {
    palette: "psychic", aftermathEffect: "profile-shimmer", preview: self,
    impactDuration: 1500, specialOptions: { anchor: "caster", particles: 0 }
  }),
  profile("geas", "Geas", "target-impact", "profile-glyph", {
    palette: "psychic", aftermathEffect: "status-debuff-power-down", preview: target(60),
    scale: .8, specialOptions: { variant: "chain", particles: 7 }
  }),
  profile("greater-restoration", "Greater Restoration", "touch", "status-buff-regeneration", {
    palette: "healing", aftermathEffect: "profile-rays", preview: touch, scale: .8
  }),
  profile("hallow", "Hallow", "ground-effect", "profile-glyph", {
    palette: "radiant", aftermathEffect: "profile-rays",
    impactDuration: 1650, scale: .96,
    specialOptions: { ...geometry, variant: "ward", particles: 10 }
  }),
  profile("hold-monster", "Hold Monster", "target-impact", "status-debuff-entangle", {
    palette: "psychic", aftermathEffect: "profile-ripple", preview: target(90), scale: .8
  }),
  profile("insect-plague", "Insect Plague", "ground-effect", "profile-swarm", {
    palette: "nature", aftermathEffect: "profile-mist",
    impactDuration: 1650, scale: .94, specialOptions: { ...geometry, particles: 12 }
  }),
  profile("legend-lore", "Legend Lore", "self", "profile-glyph", {
    palette: "radiant", aftermathEffect: "profile-sparkles", preview: self,
    impactDuration: 1450, specialOptions: { variant: "book", anchor: "caster", particles: 8 }
  }),
  profile("mass-cure-wounds", "Mass Cure Wounds", "ground-effect", "profile-rays", {
    palette: "healing", aftermathEffect: "profile-sparkles",
    impactDuration: 1550, scale: .94, specialOptions: { ...geometry, particles: 12 }
  }),
  profile("mislead", "Mislead", "self", "profile-shimmer", {
    palette: "arcane", aftermathEffect: "profile-sparkles", preview: self,
    impactDuration: 1500, specialOptions: { anchor: "caster", particles: 8 }
  }),
  profile("modify-memory", "Modify Memory", "target-impact", "profile-glyph", {
    palette: "psychic", aftermathEffect: "status-debuff-confusion", preview: target(30),
    impactDuration: 1500, specialOptions: { variant: "mind", particles: 8 }
  }),
  profile("passwall", "Passwall", "utility-glyph", "profile-glyph", {
    palette: "earth", aftermathEffect: "profile-shimmer", preview: target(30),
    impactDuration: 1500, specialOptions: { variant: "portal", particles: 8 }
  }),
  profile("planar-binding", "Planar Binding", "target-impact", "profile-glyph", {
    palette: "arcane", aftermathEffect: "profile-ripple", preview: target(60),
    impactDuration: 1500, specialOptions: { variant: "chain", particles: 9 }
  }),
  profile("raise-dead", "Raise Dead", "touch", "status-buff-regeneration", {
    palette: "radiant", aftermathEffect: "profile-rays", preview: touch,
    impactDuration: 1550, scale: .82
  }),
  profile("reincarnate", "Reincarnate", "touch", "profile-leaves", {
    palette: "nature", aftermathEffect: "status-buff-regeneration", preview: touch,
    impactDuration: 1550, scale: .82, specialOptions: { particles: 9 }
  }),
  profile("scrying", "Scrying", "self", "status-buff-truesight", {
    palette: "psychic", aftermathEffect: "profile-ripple", preview: self,
    impactDuration: 1500, specialOptions: { anchor: "caster", particles: 0 }
  }),
  profile("seeming", "Seeming", "aura", "profile-shimmer", {
    palette: "arcane", aftermathEffect: "profile-sparkles", preview: target(30),
    impactDuration: 1500, scale: .88, specialOptions: { particles: 9 }
  }),
  profile("telekinesis", "Telekinesis", "utility-hand", "profile-hand", {
    palette: "force", aftermathEffect: "profile-ripple",
    impactDuration: 1550, scale: .9, specialOptions: { particles: 10 }
  }),
  profile("telepathic-bond", "Telepathic Bond", "aura", "profile-glyph", {
    palette: "psychic", aftermathEffect: "profile-message", preview: target(30),
    impactDuration: 1450, specialOptions: { variant: "mind", particles: 8 }
  }),
  profile("teleportation-circle", "Teleportation Circle", "ground-effect", "profile-glyph", {
    palette: "arcane", aftermathEffect: "profile-shimmer",
    impactDuration: 1650, scale: .94,
    specialOptions: { ...geometry, variant: "portal", particles: 11 }
  }),
  profile("tree-stride", "Tree Stride", "self", "profile-glyph", {
    palette: "nature", aftermathEffect: "profile-leaves", preview: self,
    impactDuration: 1500, specialOptions: { variant: "tree", anchor: "caster", particles: 9 }
  }),
  profile("wall-of-force", "Wall of Force", "line", "profile-force-wall", {
    palette: "force", projectileEffect: "profile-force-wall", aftermathEffect: "profile-shimmer",
    preview: wallAnchor, travelDuration: 360, impactDuration: 1600, scale: .96,
    specialOptions: { impactAtPath: true, aftermathAtPath: true, particles: 9 }
  }),
  profile("wall-of-stone", "Wall of Stone", "line", "profile-stone-wall", {
    palette: "earth", projectileEffect: "profile-stone-wall", aftermathEffect: "profile-stones",
    preview: wallAnchor, travelDuration: 360, impactDuration: 1650, scale: .96,
    specialOptions: { impactAtPath: true, aftermathAtPath: true, particles: 8 }
  })
]);
