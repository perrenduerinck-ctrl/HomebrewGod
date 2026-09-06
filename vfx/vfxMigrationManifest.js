import { createDefaultEffectRegistry } from "./effectRegistry.js";
import { VFX_ASSET_CLASSES, VFX_ASSET_MANIFEST } from "./vfxAssetManifest.js";
import { getVfxAssetVersions } from "./assetVersions.js";

export const VFX_MIGRATION_PRIORITY = Object.freeze([
  "fireball", "lightning-bolt", "ice-frost", "acid", "poison-necrotic",
  "healing", "buffs", "debuffs", "remaining"
]);

export const VFX_MIGRATION_LABELS = Object.freeze({
  [VFX_ASSET_CLASSES.KEEP]: "KEEP",
  [VFX_ASSET_CLASSES.UPGRADE_LATER]: "UPGRADE LATER",
  [VFX_ASSET_CLASSES.REPLACE_WITH_6X6]: "REPLACE WITH 6×6",
  [VFX_ASSET_CLASSES.ALREADY_MODERN]: "ALREADY MODERN"
});

function classify(src, frameCount) {
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
      : "Existing projectile/status role does not require a 36-frame showcase upgrade."
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
    const entry = assets.get(src) || { src, ...classify(src, clip.frameCount), references: [] };
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
  })) add({ src: `./assets/vfx/${name}.png`, frameCount }, "reserved-artwork");
  return Object.freeze(Object.fromEntries([...assets].sort(([a], [b]) => a.localeCompare(b))
    .map(([src, entry]) => [src, Object.freeze({ ...entry,
      references: Object.freeze(entry.references) })])));
}

export const VFX_MIGRATION_MANIFEST = buildInventory();
