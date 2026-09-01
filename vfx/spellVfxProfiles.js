// Intentional compositions, not game rules. Adding a spell requires data here,
// not another animation engine. Fire Bolt/Fireball and the first five sprite
// cantrips remain higher-priority bespoke overrides in castingSequence.js.
import { LIGHTNING_BOLT_SOUND, normalizeSoundCue } from "./spellAudio.js?v=lightning-sound-20260830";
import { TIER_SPELL_PROFILES } from "./tierSpellProfiles.js?v=status-sprites-20260831";
export const SPELL_VFX_FAMILIES = Object.freeze([
  "projectile-impact", "target-impact", "beam", "line", "cone", "burst",
  "aura", "self", "touch", "weapon-strike", "ground-effect", "utility-glyph",
  "utility-hand", "utility-ripple"
]);

const id = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
export function vfxNumber(value, fallback, min, max) {
  const n = value == null || value === "" ? NaN : Number(value);
  return Math.min(max, Math.max(min, Number.isFinite(n) ? n : fallback));
}
const freeze = (value) => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

export function defineSpellVfxProfile(raw = {}) {
  const spellId = id(raw.spellId);
  if (!spellId || !SPELL_VFX_FAMILIES.includes(raw.family)) {
    throw new TypeError("Spell VFX profiles require a spellId and supported family.");
  }
  const profile = {
    spellId, family: raw.family, label: String(raw.label || spellId).slice(0, 80),
    sound: normalizeSoundCue(raw.sound),
    damageType: id(raw.damageType), palette: id(raw.palette || raw.damageType || "arcane"),
    scale: vfxNumber(raw.scale, 1, 0.1, 8),
    intensity: vfxNumber(raw.intensity, 1, 1, 5),
    particleMultiplier: vfxNumber(raw.particleMultiplier, 1, 0, 4),
    impactCount: Math.round(vfxNumber(raw.impactCount, 1, 1, 3)),
    aftershockCount: Math.round(vfxNumber(raw.aftershockCount, 0, 0, 2)),
    travelSpeed: vfxNumber(raw.travelSpeed, 0, 0, 4000),
    travelDuration: vfxNumber(raw.travelDuration, 440, 80, 2000),
    impactDuration: vfxNumber(raw.impactDuration, 800, 160, 2400),
    chargeDuration: vfxNumber(raw.chargeDuration, 180, 0, 1200),
    aftermathDuration: vfxNumber(raw.aftermathDuration, 420, 0, 2400),
    screenShakeIntensity: vfxNumber(raw.screenShakeIntensity, 0, 0, 1),
    specialOptions: {
      variant: id(raw.specialOptions?.variant || "rune"),
      anchor: raw.specialOptions?.anchor === "caster" ? "caster" : "target",
      geometryScale: raw.specialOptions?.geometryScale === true,
      geometryBasePixels: vfxNumber(raw.specialOptions?.geometryBasePixels, 72, 16, 512),
      fitGeometry: raw.specialOptions?.fitGeometry === true,
      maxGeometryScale: vfxNumber(raw.specialOptions?.maxGeometryScale, 20, .1, 20),
      chargeAtTarget: raw.specialOptions?.chargeAtTarget === true,
      aftermathAtPath: raw.specialOptions?.aftermathAtPath === true,
      impactAtPath: raw.specialOptions?.impactAtPath === true,
      chargeFullOnly: raw.specialOptions?.chargeFullOnly === true,
      scaleWithLevel: raw.specialOptions?.scaleWithLevel !== false,
      particles: Math.round(vfxNumber(raw.specialOptions?.particles, 7, 0, 24))
    },
    assetTodo: String(raw.assetTodo || "").slice(0, 200),
    // Only DM preview reads this; real casting/targeting never does.
    preview: raw.preview ? {
      mode: raw.preview.mode === "self" ? "self" : "target",
      rangeFeet: vfxNumber(raw.preview.rangeFeet, 5, 0, 300),
      shape: raw.preview.shape === "cube" ? "cube" : "circle",
      sizeFeet: vfxNumber(raw.preview.sizeFeet, 2.5, 1, 30),
      label: String(raw.preview.label || "").slice(0, 100)
    } : null
  };
  for (const key of ["projectileEffect", "impactEffect", "casterEffect", "targetEffect", "aftermathEffect"]) {
    profile[key] = id(raw[key]);
  }
  return freeze(profile);
}

const p = (spellId, label, family, targetEffect, options = {}) =>
  defineSpellVfxProfile({ spellId, label, family, targetEffect, ...options });
const self = { mode: "self", label: "Self (visual preview)" };
const melee = { mode: "target", rangeFeet: 5, label: "5-ft weapon preview reach" };
const ground = { mode: "target", rangeFeet: 60, shape: "cube", sizeFeet: 5, label: "60 feet" };

export const SPELL_VFX_PROFILES = Object.freeze([
  ...TIER_SPELL_PROFILES.map(defineSpellVfxProfile),
  p("lightning-bolt", "Lightning Bolt", "line", "storm-lightning-impact", {
    sound: LIGHTNING_BOLT_SOUND,
    damageType: "lightning", casterEffect: "storm-lightning-charge",
    projectileEffect: "storm-lightning-beam", aftermathEffect: "storm-lightning-echo",
    scale: 0.85, chargeDuration: 420, travelDuration: 720, impactDuration: 1000,
    aftermathDuration: 620, specialOptions: { particles: 0, aftermathAtPath: true }
  }),
  p("ice-storm", "Ice Storm", "ground-effect", "storm-hail", {
    damageType: "cold", casterEffect: "storm-cloud", aftermathEffect: "storm-frost",
    chargeDuration: 520, impactDuration: 1800, aftermathDuration: 1200,
    specialOptions: { particles: 0, geometryScale: true, geometryBasePixels: 160,
      fitGeometry: true, chargeAtTarget: true }
  }),
  p("acid-splash", "Acid Splash", "projectile-impact", "lesser-acid-burst", {
    damageType: "acid", projectileEffect: "lesser-acid-flight", scale: .55,
    specialOptions: { particles: 0 } }),
  p("poison-spray", "Poison Spray", "target-impact", "lesser-poison-cloud", {
    damageType: "poison", casterEffect: "profile-mist", impactDuration: 1100, scale: .65,
    specialOptions: { particles: 0, chargeFullOnly: true } }),
  p("chill-touch", "Chill Touch", "utility-hand", "profile-hand", { damageType: "necrotic", aftermathEffect: "dark-impact-sprite", assetTodo: "Optional skeletal hand art; vector hand is intentional." }),
  p("toll-the-dead", "Toll the Dead", "target-impact", "profile-glyph", { damageType: "necrotic", specialOptions: { variant: "bell" }, aftermathEffect: "profile-ripple", aftershockCount: 1 }),
  p("mind-sliver", "Mind Sliver", "target-impact", "profile-shard", { damageType: "psychic", aftermathEffect: "profile-ripple", specialOptions: { variant: "mind" }, assetTodo: "Optional psychic fracture sheet." }),
  p("vicious-mockery", "Vicious Mockery", "target-impact", "profile-glyph", { damageType: "psychic", specialOptions: { variant: "voice" }, aftermathEffect: "profile-ripple" }),
  p("sapping-sting", "Sapping Sting", "target-impact", "dark-impact-sprite", { damageType: "necrotic", scale: 0.55, aftermathEffect: "profile-ground", specialOptions: { variant: "drain" } }),
  p("infestation", "Infestation", "target-impact", "profile-swarm", { damageType: "poison", impactDuration: 1400, assetTodo: "Optional insect sprites; bounded vector swarm is intentional." }),
  p("produce-flame", "Produce Flame", "projectile-impact", "fire-flames", { damageType: "fire", casterEffect: "fire-glow", projectileEffect: "profile-orb", scale: 0.75, preview: { mode: "target", rangeFeet: 30, label: "Hurl flame (30-ft preview)" } }),
  p("create-bonfire", "Create Bonfire", "ground-effect", "fire-flames", { damageType: "fire", aftermathEffect: "fire-embers", impactDuration: 1500, preview: ground, specialOptions: { geometryScale: true } }),
  p("control-flames", "Control Flames", "ground-effect", "fire-glow", { damageType: "fire", aftermathEffect: "fire-flames", scale: 0.6, impactDuration: 1000 }),
  p("booming-blade", "Booming Blade", "weapon-strike", "profile-slash", { damageType: "thunder", casterEffect: "profile-glyph", aftermathEffect: "profile-ripple", preview: melee, specialOptions: { variant: "blade" } }),
  p("green-flame-blade", "Green-Flame Blade", "weapon-strike", "profile-slash", { damageType: "fire", palette: "verdant", casterEffect: "profile-glyph", aftermathEffect: "profile-mist", preview: melee, specialOptions: { variant: "blade" } }),
  p("lightning-lure", "Lightning Lure", "beam", "lightning-impact-sprite", { damageType: "lightning", projectileEffect: "profile-beam", scale: 0.55, preview: { mode: "target", rangeFeet: 15, label: "15-ft lure preview reach" } }),
  p("primal-savagery", "Primal Savagery", "weapon-strike", "profile-slash", { damageType: "acid", impactCount: 3, scale: 0.65, preview: melee, specialOptions: { variant: "claw" } }),
  p("sword-burst", "Sword Burst", "burst", "profile-blades", { damageType: "force", specialOptions: { anchor: "caster", geometryScale: true }, aftermathEffect: "profile-ripple" }),
  p("thunderclap", "Thunderclap", "burst", "profile-ripple", { damageType: "thunder", aftershockCount: 2, specialOptions: { anchor: "caster", geometryScale: true } }),
  p("word-of-radiance", "Word of Radiance", "burst", "profile-rays", { damageType: "radiant", specialOptions: { anchor: "caster", geometryScale: true }, aftermathEffect: "profile-sparkles" }),
  p("magic-stone", "Magic Stone", "touch", "profile-stones", { palette: "earth", aftermathEffect: "profile-sparkles", specialOptions: { particles: 3 } }),
  p("blade-ward", "Blade Ward", "self", "status-buff-armor", { palette: "arcane", preview: self, specialOptions: { variant: "shield", particles: 0 } }),
  p("dancing-lights", "Dancing Lights", "utility-glyph", "profile-lights", { palette: "radiant", impactDuration: 1500, specialOptions: { particles: 0 } }),
  p("druidcraft", "Druidcraft", "utility-glyph", "profile-leaves", { palette: "nature", aftermathEffect: "profile-sparkles", scale: 0.75 }),
  p("encode-thoughts", "Encode Thoughts", "self", "profile-ripple", { palette: "psychic", preview: self, specialOptions: { variant: "thought", particles: 4 } }),
  p("friends", "Friends", "self", "profile-glyph", { palette: "rose", preview: self, specialOptions: { variant: "heart", particles: 3 }, scale: 0.75 }),
  p("guidance", "Guidance", "aura", "status-buff-blessing", { palette: "radiant", specialOptions: { variant: "star", particles: 0 }, scale: 0.8 }),
  p("gust", "Gust", "utility-ripple", "profile-wind", { palette: "wind", specialOptions: { particles: 4 }, scale: 0.85 }),
  p("light", "Light", "touch", "profile-glow", { palette: "radiant", impactDuration: 1600, scale: 0.65, specialOptions: { particles: 3 } }),
  p("mage-hand", "Mage Hand", "utility-hand", "profile-hand", { palette: "arcane", impactDuration: 1400, specialOptions: { particles: 3 }, assetTodo: "Optional spectral hand sprite; vector manifestation is intentional." }),
  p("mending", "Mending", "touch", "profile-glyph", { palette: "radiant", specialOptions: { variant: "repair", particles: 6 }, aftermathEffect: "profile-sparkles", scale: 0.65 }),
  p("message", "Message", "utility-ripple", "profile-glyph", { palette: "wind", projectileEffect: "profile-message", specialOptions: { variant: "voice", particles: 0 }, scale: 0.55 }),
  p("minor-illusion", "Minor Illusion", "utility-glyph", "profile-shimmer", { palette: "arcane", impactDuration: 1400, specialOptions: { particles: 3 } }),
  p("mold-earth", "Mold Earth", "ground-effect", "profile-ground", { palette: "earth", aftermathEffect: "profile-mist", scale: 0.9 }),
  p("prestidigitation", "Prestidigitation", "utility-glyph", "profile-glyph", { palette: "arcane", specialOptions: { variant: "star", particles: 8 }, aftermathEffect: "profile-sparkles", scale: 0.75 }),
  p("resistance", "Resistance", "aura", "status-buff-elemental-ward", { palette: "radiant", specialOptions: { variant: "shield", particles: 0 }, scale: 0.85 }),
  p("shape-water", "Shape Water", "utility-ripple", "profile-ripple", { palette: "water", aftershockCount: 1, specialOptions: { particles: 4 } }),
  p("shillelagh", "Shillelagh", "touch", "profile-glyph", { palette: "nature", specialOptions: { variant: "staff", particles: 3 }, aftermathEffect: "profile-leaves" }),
  p("spare-the-dying", "Spare the Dying", "touch", "profile-glyph", { palette: "healing", specialOptions: { variant: "heart", particles: 2 }, aftermathEffect: "profile-glow", scale: 0.65 }),
  p("thaumaturgy", "Thaumaturgy", "utility-glyph", "profile-glyph", { palette: "radiant", specialOptions: { variant: "rune", particles: 5 }, aftermathEffect: "profile-ripple" }),
  p("true-strike", "True Strike", "utility-glyph", "status-buff-power-up", { palette: "arcane", specialOptions: { variant: "target", particles: 0 }, scale: 0.8 })
]);

const profiles = new Map(SPELL_VFX_PROFILES.map((profile) => [profile.spellId, profile]));
if (profiles.size !== SPELL_VFX_PROFILES.length) throw new Error("Duplicate spell VFX profile.");
export const getSpellVfxProfile = (spellId) => profiles.get(id(spellId)) || null;
export const getProfileEffectIds = (profile) => [...new Set([
  profile?.projectileEffect, profile?.impactEffect, profile?.casterEffect,
  profile?.targetEffect, profile?.aftermathEffect
].filter(Boolean))];
