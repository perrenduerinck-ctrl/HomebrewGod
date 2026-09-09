import { createDefaultEffectRegistry } from "./effectRegistry.js";
import { VFX_ASSET_CLASSES, VFX_ASSET_MANIFEST } from "./vfxAssetManifest.js";
import { getVfxAssetVersions } from "./assetVersions.js";
import { VFX_ALPHA_COPIES } from "./alphaAssets.js";
import { MODERN_SPRITE_ASSETS, MODERN_SPRITE_REPLACEMENTS } from "./spriteReplacements.js";
import { COMBAT_ANIMATIONS } from "./combatEffects.js";

export const VFX_MIGRATION_PRIORITY = Object.freeze([
  "fireball", "lightning-bolt", "ice-frost", "acid", "poison", "necrotic",
  "radiant", "force", "thunder", "psychic", "healing", "buffs", "debuffs", "remaining"
]);

export const VFX_MIGRATION_LABELS = Object.freeze({
  [VFX_ASSET_CLASSES.KEEP]: "KEEP",
  [VFX_ASSET_CLASSES.UPGRADE_LATER]: "UPGRADE LATER",
  [VFX_ASSET_CLASSES.REPLACE_WITH_6X6]: "REPLACE WITH 6×6",
  [VFX_ASSET_CLASSES.ALREADY_MODERN]: "ALREADY MODERN"
});

function classify(src, frameCount) {
  if (src.includes("/modern6x6/")) return {
    classification: VFX_ASSET_CLASSES.ALREADY_MODERN,
    reason: "Reviewed 36-frame alpha replacement; original remains available as fallback."
  };
  if (src.endsWith("fireball-impact-alpha-6x6.png")) return {
    classification: VFX_ASSET_CLASSES.ALREADY_MODERN,
    reason: "Fireball showcase: existing alpha 6x6 sheet, with explicit legacy fallback."
  };
  if (src.includes("meteor-impact") || src.includes("/storms/lightning-impact") ||
      src.includes("/lightning/lightning-bolt-main") ||
      /\/tiers3-6\/(cold|acid|poison|necrotic)-cast/.test(src)) return {
    classification: VFX_ASSET_CLASSES.REPLACE_WITH_6X6,
    reason: src.includes("meteor-impact") ? "Reserved sheet has documented grid seams."
      : "Major spell artwork queued in migration priority order; current mapping stays active."
  };
  if (frameCount === 1 || src.includes("/status/") || src.includes("fire-impact-spritesheet")) return {
    classification: VFX_ASSET_CLASSES.KEEP,
    reason: src.includes("fire-impact-spritesheet") ? "Retained Fireball fallback and shared legacy fire sheet."
      : "Keep the original for compatibility; animated replacements still require 6x6."
  };
  return {
    classification: VFX_ASSET_CLASSES.UPGRADE_LATER,
    reason: "Keep current playback; review alpha, alignment and motion before a per-effect upgrade."
  };
}

// Developer inventory only: importing it does not preload textures or change
// spell mappings. Reusing definitions prevents a second, drifting grid registry.
function buildInventory() {
  const assets = new Map();
  const add = (clip, reference) => {
    if (!clip?.src) return;
    const src = clip.src.split("?")[0];
    const entry = assets.get(src) || { src, ...classify(src, clip.frameCount),
      frameCount: clip.frameCount, columns: clip.columns, rows: clip.rows, atlas: clip.atlas,
      legacyStatus: "KEEP_AS_FALLBACK",
      modernReplacementStatus: src.endsWith("fireball-impact-alpha-6x6.png")
        ? "READY" : clip.frameCount === 1 ? "STATIC_REVIEW" : "NEEDS_6X6",
      references: [] };
    entry.references.push(reference);
    assets.set(src, entry);
  };
  for (const definition of createDefaultEffectRegistry().list()) {
    add(definition.sprite, definition.id);
  }
  for (const [spellId, definition] of Object.entries(VFX_ASSET_MANIFEST)) {
    for (const [name, clip] of Object.entries(definition.clips)) {
      const versions = getVfxAssetVersions(clip);
      if (!versions) add(clip, `${spellId}.${name}`);
      else for (const version of ["legacy", "modern6x6"]) {
        add(versions[version], `${spellId}.${name}.${version}`);
      }
    }
  }
  // Reserved owner-supplied files and the storm's custom-rendered ice sheet.
  for (const [name, frameCount] of Object.entries({
    "cantrips/lightning-projectile": 1,
    "library/void-projectile": 1, "library/void-impact": 16,
    "library/meteor-projectile": 1, "library/meteor-impact": 16,
    "library/lightning-spear": 1, "library/lightning-storm-impact": 16,
    "library/ice-spear": 1, "library/ice-burst": 16, "library/radiant-spear": 1
  })) add({ src: `./assets/vfx/${name}.png`, frameCount,
    columns: frameCount === 16 ? 4 : 1, rows: frameCount === 16 ? 4 : 1 }, "reserved-artwork");
  for (const [original, copy] of Object.entries(VFX_ALPHA_COPIES)) {
    const entry = assets.get(original);
    assets.set(copy, { ...entry, src: copy, original,
      classification: VFX_ASSET_CLASSES.KEEP, legacyStatus: "KEEP_AS_FALLBACK",
      modernReplacementStatus: "NEEDS_6X6",
      reason: "Alpha-only compatibility copy; original grid and motion are unchanged.",
      references: [`alpha-copy:${original}`] });
  }
  for (const [name, clip] of Object.entries(MODERN_SPRITE_ASSETS)) {
    add(clip, name === "meteorImpact" ? "reserved-artwork.modern6x6" : `${name}.modern6x6`);
    const current = assets.get(clip.src);
    current.modernReplacementStatus = "READY";
    current.original = clip.original;
    const previous = assets.get(clip.original);
    if (previous) {
      previous.modernReplacementStatus = "READY";
      previous.replacement = clip.src;
      previous.reason = "Retained legacy fallback for reviewed 6x6 alpha replacement.";
    }
  }
  for (const [id, clip] of Object.entries(MODERN_SPRITE_REPLACEMENTS)) add(clip, `${id}.modern6x6`);
  for (const [id, clip] of Object.entries(COMBAT_ANIMATIONS)) {
    add(clip, `combat.${id}`);
    Object.assign(assets.get(clip.src), { classification: VFX_ASSET_CLASSES.KEEP,
      modernReplacementStatus: "READY", reason: "Owner-supplied 36-frame combat test; original alpha preserved, grid gutters cropped during playback." });
  }
  return Object.freeze(Object.fromEntries([...assets].sort(([a], [b]) => a.localeCompare(b))
    .map(([src, entry]) => [src, Object.freeze({ ...entry,
      references: Object.freeze(entry.references) })])));
}

export const VFX_MIGRATION_MANIFEST = buildInventory();
