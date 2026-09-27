import { WORKSHOP_VISIBILITIES, sanitizeWorkshopTags } from "./workshopModel.js";

const clean = (value, maximum) => String(value ?? "").trim().slice(0, maximum);

export function normalizeWorkshopCollection(input = {}, ownerUid = "") {
  const collectionId = clean(input.collectionId, 160);
  const name = clean(input.name, 120);
  if (!collectionId || !name || !ownerUid) throw new Error("Collection ID, name, and owner are required.");
  const visibility = WORKSHOP_VISIBILITIES.includes(input.visibility) ? input.visibility : "PRIVATE";
  return Object.freeze({
    collectionId,
    name,
    description: clean(input.description, 1000),
    ownerUid: String(ownerUid),
    visibility,
    tags: sanitizeWorkshopTags(input.tags),
    assetIds: [...new Set((Array.isArray(input.assetIds) ? input.assetIds : []).map((entry) => clean(entry, 160)).filter(Boolean))].slice(0, 500)
  });
}

export function updateCollectionAssets(collection, assetId, included) {
  const assets = new Set(collection.assetIds || []);
  if (included) assets.add(String(assetId)); else assets.delete(String(assetId));
  return normalizeWorkshopCollection({ ...collection, assetIds: [...assets] }, collection.ownerUid);
}
