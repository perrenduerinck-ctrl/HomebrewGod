import { getWorkshopTypeDefinition } from "./workshopTypeRegistry.js";

function words(value) {
  return String(value ?? "").toLowerCase().split(/\s+/).filter(Boolean);
}

export function createWorkshopSearchText(asset = {}) {
  const type = getWorkshopTypeDefinition(asset.assetType);
  const assetTags = Array.isArray(asset.tags) ? asset.tags : [];
  const collectionNames = Array.isArray(asset.collectionNames) ? asset.collectionNames : [];
  const metadata = asset.typeMetadata && typeof asset.typeMetadata === "object" ? asset.typeMetadata : {};
  return [
    asset.name,
    asset.description,
    asset.authorName,
    asset.sourceRoomName,
    asset.sourceRoomCode,
    type.label,
    ...assetTags,
    ...collectionNames,
    ...Object.values(metadata).flatMap((value) => Array.isArray(value) ? value : [value])
  ].filter((value) => value != null).join(" ").toLowerCase();
}

export function matchesWorkshopSearch(asset, search = "") {
  const terms = words(search);
  if (!terms.length) return true;
  const haystack = createWorkshopSearchText(asset);
  return terms.every((term) => haystack.includes(term));
}
