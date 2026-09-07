import { createDefaultEffectRegistry } from "../vfx/effectRegistry.js";
import { VFX_ASSET_MANIFEST } from "../vfx/vfxAssetManifest.js";
import { VFX_MIGRATION_MANIFEST } from "../vfx/vfxMigrationManifest.js";
const assets = {};
for (const [src, metadata] of Object.entries(VFX_MIGRATION_MANIFEST)) {
  assets[src] = metadata;
}
function add(asset) {
  if (asset?.src) assets[asset.src.split("?")[0]] = asset;
}
for (const effect of createDefaultEffectRegistry().list()) add(effect.sprite);
for (const spell of Object.values(VFX_ASSET_MANIFEST)) for (const clip of Object.values(spell.clips)) {
  add(clip); add(clip.legacy); add(clip.modern6x6);
}
process.stdout.write(JSON.stringify(assets));
