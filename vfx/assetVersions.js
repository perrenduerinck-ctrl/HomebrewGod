export const VFX_ASSET_MODES = Object.freeze(["auto", "legacy", "modern6x6"]);

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
    if (version === "modern6x6" && (candidate.columns !== 6 || candidate.rows !== 6 ||
        candidate.frameCount !== 36)) continue;
    return Object.freeze({ ...candidate, assetVersion: version, assetVersions: versions });
  }
  return null;
}
