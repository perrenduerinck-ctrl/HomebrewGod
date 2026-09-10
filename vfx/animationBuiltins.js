import { getVfxClip } from "./vfxAssetManifest.js";
import { STATUS_EFFECT_DEFINITIONS } from "./statusEffects.js";

const fire = getVfxClip("fireball", "impact", { mode: "modern6x6" });
const healing = STATUS_EFFECT_DEFINITIONS.find(a => a.id === "status-buff-regeneration").sprite;
export const SWORD_SLASH_ANIMATION = Object.freeze({
  id: "sword_slash_01", name: "Sword slash", category: "Sword", type: "Melee Attack", tags: ["sword", "melee", "weapon", "slash"],
  sprite: "./assets/vfx/combat/melee/sword-slash-test.png", grid: { columns: 6, rows: 6 },
  frameCount: 36, fps: 30, inset: 4
});
export const BUILTIN_ANIMATIONS = Object.freeze([
  SWORD_SLASH_ANIMATION,
  { id: "fireball_explosion_01", name: "Fireball explosion", category: "Fire", type: "Explosion", tags: ["fire", "magic", "spell", "impact"],
    sprite: fire.src, grid: { columns: fire.columns, rows: fire.rows }, frameCount: fire.frameCount,
    fps: 30, atlas: fire.atlas, inset: fire.atlas?.inset || 0 },
  { id: "healing_burst_01", name: "Healing burst", category: "Healing", type: "Healing", tags: ["healing", "magic", "buff"],
    sprite: healing.src, grid: { columns: 5, rows: 5 }, frameCount: 25, fps: 20, atlas: healing.atlas },
  { id: "cold_burst_01", name: "Cold burst", category: "Cold", type: "Impact", tags: ["cold", "magic", "impact"],
    sprite: "./assets/vfx/modern6x6/cold-cast-6x6.png", grid: { columns: 6, rows: 6 }, frameCount: 36, fps: 24 },
  { id: "fire_legacy_4x4", name: "Fire impact (classic)", category: "Fire", type: "Impact", tags: ["fire", "magic", "impact", "legacy"],
    sprite: "./assets/vfx/fire/fire-impact-spritesheet.png", grid: { columns: 4, rows: 4 }, frameCount: 16, fps: 18, blendMode: "screen" },
  { id: "radiant_spear_01", name: "Radiant spear (single frame)", category: "Spear", type: "Weapon Attack", tags: ["spear", "radiant", "weapon", "projectile"],
    sprite: "./assets/vfx/library/radiant-spear.png", grid: { columns: 1, rows: 1 }, frameCount: 1, fps: 1 }
]);
