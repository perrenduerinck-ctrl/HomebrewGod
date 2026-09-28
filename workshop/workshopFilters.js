import { matchesWorkshopSearch } from "./workshopSearch.js";
import { matchesWorkshopType } from "./workshopTypeRegistry.js";

const value = (entry) => String(entry ?? "").trim().toLowerCase();
const tags = (entry) => (Array.isArray(entry) ? entry : String(entry ?? "").split(/[\s,]+/)).map(value).filter(Boolean);

function matchesSource(asset, source, currentUserId) {
  if (!source) return true;
  if (source === "mine") return asset.authorUid === currentUserId;
  if (source === "imported") return asset.imported === true;
  if (source === "room") return asset.visibility === "ROOM";
  if (source === "public") return asset.visibility === "PUBLIC";
  if (source === "friends") return asset.visibility === "FRIENDS";
  return true;
}

function matchesTypeSpecific(asset, filters) {
  const metadata = asset.typeMetadata && typeof asset.typeMetadata === "object" ? asset.typeMetadata : {};
  const fields = ["cr", "size", "creatureType", "itemType", "rarity", "level", "school", "damageType", "family", "style", "mapType", "difficulty", "sourceType", "role"];
  for (const field of fields) {
    const expected = value(filters[field]);
    if (!expected) continue;
    if (!value(metadata[field]).includes(expected)) return false;
  }
  const className = value(filters.className);
  if (className && !(metadata.classNames || []).some((entry) => value(entry).includes(className))) return false;
  if (filters.attunement === "required" && metadata.attunement !== true) return false;
  if (filters.attunement === "not-required" && metadata.attunement === true) return false;
  return true;
}

export function matchesWorkshopFilters(asset, filters = {}) {
  if (!matchesWorkshopSearch(asset, filters.search)) return false;
  if (!matchesWorkshopType(asset.assetType, filters.assetType)) return false;
  if (filters.visibility && asset.visibility !== filters.visibility) return false;
  if (!matchesSource(asset, filters.source, String(filters.currentUserId || ""))) return false;
  if (filters.favoritesOnly && asset.favorite !== true) return false;
  if (filters.recentOnly && asset.recentlyUsed !== true) return false;
  if (filters.collectionId && !(Array.isArray(asset.collectionIds) ? asset.collectionIds : []).includes(filters.collectionId)) return false;
  if (filters.author && !value(asset.authorName).includes(value(filters.author))) return false;
  const requiredTags = tags(filters.tags ?? filters.tag);
  const assetTags = (Array.isArray(asset.tags) ? asset.tags : []).map(value);
  if (requiredTags.some((required) => !assetTags.some((entry) => entry.includes(required)))) return false;
  return matchesTypeSpecific(asset, filters);
}

export function filterWorkshopAssets(assets, filters = {}) {
  return (Array.isArray(assets) ? assets : []).filter((asset) => matchesWorkshopFilters(asset, filters));
}
