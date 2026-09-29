import { WORKSHOP_VISIBILITIES, sanitizeWorkshopTags } from "./workshopModel.js";

const clean = (value, maximum) => String(value ?? "").trim().slice(0, maximum);

export function normalizeWorkshopCollection(input = {}, ownerUid = "") {
  const collectionId = clean(input.collectionId, 160);
  const name = clean(input.name, 120);
  if (!collectionId || !name || !ownerUid) throw new Error("Collection ID, name, and owner are required.");
  const visibility = WORKSHOP_VISIBILITIES.includes(input.visibility) ? input.visibility : "PRIVATE";
  const entries = [...new Set((Array.isArray(input.entries) ? input.entries : []).map((entry) => clean(entry, 241)).filter(Boolean))].slice(0, 500);
  const assetIds = [...new Set((Array.isArray(input.assetIds) ? input.assetIds : []).map((entry) => clean(entry, 160)).filter(Boolean))].slice(0, 500);
  return Object.freeze({
    collectionId,
    name,
    description: clean(input.description, 1000),
    ownerUid: String(ownerUid),
    visibility,
    tags: sanitizeWorkshopTags(input.tags),
    entries,
    assetIds
  });
}

export function updateCollectionAssets(collection, assetId, included) {
  const assets = new Set(collection.assetIds || []);
  if (included) assets.add(String(assetId)); else assets.delete(String(assetId));
  return normalizeWorkshopCollection({ ...collection, assetIds: [...assets] }, collection.ownerUid);
}

export function updateCollectionEntries(collection, libraryId, included) {
  const entries = new Set(collection.entries || []);
  if (included) entries.add(String(libraryId)); else entries.delete(String(libraryId));
  return normalizeWorkshopCollection({ ...collection, entries: [...entries] }, collection.ownerUid);
}

export function collectionEntryIds(collection = {}) {
  return [...new Set([...(collection.entries || []), ...(collection.assetIds || [])])];
}
