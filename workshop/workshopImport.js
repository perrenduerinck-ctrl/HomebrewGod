import { sanitizeStructuredContent } from "./workshopModel.js";

export function createWorkshopProvenance(asset) {
  return Object.freeze({
    sourceWorkshopAssetId: String(asset.assetId),
    sourceWorkshopVersion: Math.max(1, Number(asset.version) || 1),
    sourceAuthorUid: String(asset.authorUid || ""),
    importedAtMillis: Date.now()
  });
}

export function prepareWorkshopCopy(asset, { idFactory = () => globalThis.crypto.randomUUID() } = {}) {
  if (!asset?.content || !asset.assetId) throw new Error("Load the Workshop asset before importing it.");
  const content = sanitizeStructuredContent(asset.content);
  const provenance = createWorkshopProvenance(asset);
  if (asset.assetType === "monster") {
    return { assetType: "monster", recordId: idFactory(), content: { ...content, id: null, ...provenance }, provenance };
  }
  if (asset.assetType === "animation") {
    return {
      assetType: "animation",
      recordId: `workshop_${String(idFactory()).replace(/[^A-Za-z0-9._-]/g, "_")}`,
      content: { ...content, ...provenance },
      provenance
    };
  }
  return { assetType: asset.assetType, recordId: idFactory(), content: { ...content, ...provenance }, provenance };
}
