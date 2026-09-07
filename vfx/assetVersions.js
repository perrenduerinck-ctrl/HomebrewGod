export const VFX_ASSET_MODES = Object.freeze(["auto", "legacy", "modern6x6"]);

export function validateModernSprite(asset) {
  const errors = [];
  if (!asset || asset.columns !== 6 || asset.rows !== 6 || asset.frameCount !== 36) errors.push("requires 6x6 / 36 frames");
  if (!asset?.src) errors.push("missing source");
  if (!(asset?.framesPerSecond > 0 && asset.framesPerSecond <= 60)) errors.push("invalid FPS");
  for (const key of ["frameWidth", "frameHeight"]) {
    if (!Number.isInteger(asset?.[key]) || asset[key] <= 0) errors.push("invalid " + key);
  }
  const start = asset?.startFrame ?? 0, end = asset?.endFrame ?? 35;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > 35 || start > end) errors.push("invalid frame window");
  if (asset?.atlas) {
    for (const [axis, extent] of [["columns", asset.atlas.width], ["rows", asset.atlas.height]]) {
      const values = asset.atlas[axis];
      if (!(extent > 0) || !Array.isArray(values) || values.length !== 7 ||
          values.some((v, i) => !Number.isFinite(v) || v < 0 || v > extent || i > 0 && v <= values[i - 1])) errors.push("invalid atlas " + axis);
    }
  }
  return errors;
}

// Comparison controls are local development tools, never player preferences.
export function getVfxAssetMode(location = globalThis.location) {
  if (!["localhost", "127.0.0.1", "[::1]"].includes(location?.hostname)) return "auto";
  const mode = new URLSearchParams(location.search || "").get("vfxAssets");
  return VFX_ASSET_MODES.includes(mode) ? mode : "auto";
}

export function getVfxAssetVersions(clip) {
  return clip?.assetVersions || (clip?.legacy || clip?.modern6x6 ? clip : null);
}

export function resolveVfxClipDefinition(clip, {
  mode = "auto",
  assetAvailable = () => true
} = {}) {
  if (!clip) return null;
  const versions = getVfxAssetVersions(clip);
  if (!versions) return clip; // Old, unversioned definitions keep their exact metadata.
  const preferred = mode === "auto" ? versions.preferred || "modern6x6" : mode;
  const order = preferred === "legacy" ? ["legacy", "modern6x6"] : ["modern6x6", "legacy"];
  for (const version of order) {
    const candidate = versions[version];
    if (!candidate?.src || candidate.enabled === false || !assetAvailable(candidate.src)) continue;
    // The content standard applies only to explicitly upgraded assets.
    if (version === "modern6x6" && validateModernSprite(candidate).length) continue;
    return Object.freeze({ ...candidate, assetVersion: version, assetVersions: versions });
  }
  return null;
}
