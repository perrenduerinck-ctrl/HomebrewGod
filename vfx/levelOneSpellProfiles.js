// Presentation-only compositions for the rest of the level-one catalog.
// These reuse the owner's status atlases and the bounded procedural accents;
// they never apply conditions, healing, movement, targeting, or spell costs.
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
    impactDuration: 1050,
    aftermathDuration: 520,
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

export const LEVEL_ONE_SPELL_PROFILES = Object.freeze([
  profile("alarm", "Alarm", "ground-effect", "profile-glyph", {
    palette: "arcane", aftermathEffect: "profile-ripple",
    specialOptions: { variant: "bell", geometryScale: true, geometryBasePixels: 160,
      fitGeometry: true, particles: 3 }
  }),
  profile("animal-friendship", "Animal Friendship", "target-impact", "profile-glyph", {
    palette: "nature", aftermathEffect: "profile-leaves", preview: target(30),
    scale: .68, specialOptions: { variant: "heart", particles: 4 }
  }),
  profile("charm-person", "Charm Person", "target-impact", "profile-glyph", {
    palette: "rose", aftermathEffect: "profile-sparkles", preview: target(30),
    scale: .68, specialOptions: { variant: "heart", particles: 5 }
  }),
  profile("color-spray", "Color Spray", "cone", "profile-rays", {
    palette: "arcane", projectileEffect: "profile-cone", travelDuration: 220,
    impactDuration: 900, scale: .9,
    specialOptions: { impactAtPath: true, geometryScale: true, geometryBasePixels: 160,
      fitGeometry: true, particles: 10 }
  }),
  profile("command", "Command", "target-impact", "status-debuff-power-down", {
    palette: "psychic", preview: target(60), scale: .72
  }),
  profile("comprehend-languages", "Comprehend Languages", "self", "status-buff-truesight", {
    palette: "psychic", preview: self, scale: .68
  }),
  profile("create-or-destroy-water", "Create or Destroy Water", "ground-effect", "profile-ripple", {
    palette: "water", aftermathEffect: "profile-mist", scale: .9,
    specialOptions: { geometryScale: true, geometryBasePixels: 160, fitGeometry: true, particles: 6 }
  }),
  profile("cure-wounds", "Cure Wounds", "touch", "status-buff-regeneration", {
    palette: "healing", preview: touch, scale: .72
  }),
  profile("detect-evil-and-good", "Detect Evil and Good", "self", "status-buff-truesight", {
    palette: "radiant", preview: self, scale: .68
  }),
  profile("detect-magic", "Detect Magic", "self", "status-buff-truesight", {
    palette: "arcane", preview: self, scale: .68
  }),
  profile("detect-poison-and-disease", "Detect Poison and Disease", "self", "status-buff-truesight", {
    palette: "nature", preview: self, scale: .68
  }),
  profile("disguise-self", "Disguise Self", "self", "profile-shimmer", {
    palette: "arcane", aftermathEffect: "profile-sparkles", preview: self,
    specialOptions: { particles: 6 }
  }),
  profile("divine-favor", "Divine Favor", "self", "status-buff-radiant-weapon", {
    palette: "radiant", preview: self, scale: .74
  }),
  profile("expeditious-retreat", "Expeditious Retreat", "self", "status-buff-haste", {
    palette: "arcane", preview: self, scale: .74
  }),
  profile("faerie-fire", "Faerie Fire", "ground-effect", "status-debuff-ominous-eye", {
    palette: "arcane", aftermathEffect: "profile-shimmer", scale: .72,
    specialOptions: { particles: 0 }
  }),
  profile("false-life", "False Life", "self", "status-buff-barrier", {
    palette: "necrotic", preview: self, scale: .74
  }),
  profile("feather-fall", "Feather Fall", "aura", "status-buff-blessing", {
    palette: "wind", preview: target(60), scale: .7
  }),
  profile("find-familiar", "Find Familiar", "utility-glyph", "profile-glyph", {
    palette: "arcane", aftermathEffect: "profile-sparkles", preview: target(10), scale: .72,
    specialOptions: { variant: "rune", particles: 7 }
  }),
  profile("floating-disk", "Floating Disk", "ground-effect", "profile-ripple", {
    palette: "arcane", preview: target(30), scale: .72,
    specialOptions: { particles: 2 }
  }),
  profile("fog-cloud", "Fog Cloud", "ground-effect", "profile-mist", {
    palette: "wind", impactDuration: 1500, scale: .9,
    specialOptions: { geometryScale: true, geometryBasePixels: 160, fitGeometry: true, particles: 5 }
  }),
  profile("goodberry", "Goodberry", "touch", "status-buff-regeneration", {
    palette: "nature", aftermathEffect: "profile-leaves", preview: touch, scale: .66
  }),
  profile("grease", "Grease", "ground-effect", "profile-ground", {
    palette: "earth", aftermathEffect: "profile-ripple", scale: .84,
    specialOptions: { geometryScale: true, geometryBasePixels: 160, fitGeometry: true, particles: 2 }
  }),
  profile("healing-word", "Healing Word", "target-impact", "status-buff-regeneration", {
    palette: "healing", preview: target(60), scale: .7
  }),
  profile("heroism", "Heroism", "touch", "status-buff-power-up", {
    palette: "radiant", preview: touch, scale: .72
  }),
  profile("hideous-laughter", "Hideous Laughter", "target-impact", "status-debuff-confusion", {
    palette: "psychic", preview: target(30), scale: .72
  }),
  profile("hunters-mark", "Hunter's Mark", "target-impact", "status-debuff-ominous-eye", {
    palette: "nature", preview: target(90), scale: .72
  }),
  profile("identify", "Identify", "touch", "status-buff-truesight", {
    palette: "arcane", preview: touch, scale: .68
  }),
  profile("illusory-script", "Illusory Script", "touch", "profile-glyph", {
    palette: "arcane", aftermathEffect: "profile-shimmer", preview: touch, scale: .68,
    specialOptions: { variant: "rune", particles: 3 }
  }),
  profile("jump", "Jump", "touch", "status-buff-haste", {
    palette: "arcane", preview: touch, scale: .7
  }),
  profile("longstrider", "Longstrider", "touch", "status-buff-haste", {
    palette: "nature", preview: touch, scale: .7
  }),
  profile("protection-from-evil-and-good", "Protection from Evil and Good", "touch", "status-buff-elemental-ward", {
    palette: "radiant", preview: touch, scale: .74
  }),
  profile("purify-food-and-drink", "Purify Food and Drink", "ground-effect", "profile-ripple", {
    palette: "healing", aftermathEffect: "profile-sparkles", preview: target(10), scale: .65,
    specialOptions: { particles: 7 }
  }),
  profile("sanctuary", "Sanctuary", "aura", "status-buff-shield", {
    palette: "radiant", preview: target(30), scale: .74
  }),
  profile("silent-image", "Silent Image", "utility-glyph", "profile-shimmer", {
    palette: "arcane", aftermathEffect: "profile-sparkles", scale: .84,
    specialOptions: { geometryScale: true, geometryBasePixels: 160, fitGeometry: true, particles: 4 }
  }),
  profile("speak-with-animals", "Speak with Animals", "self", "profile-glyph", {
    palette: "nature", aftermathEffect: "profile-leaves", preview: self, scale: .7,
    specialOptions: { variant: "voice", particles: 3 }
  }),
  profile("unseen-servant", "Unseen Servant", "utility-hand", "profile-hand", {
    palette: "arcane", aftermathEffect: "profile-shimmer", preview: target(60), scale: .72,
    specialOptions: { particles: 4 }
  })
]);
