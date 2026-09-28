import { matchesWorkshopFilters } from "./workshopFilters.js";
import {
  WORKSHOP_ASSET_TYPES,
  createWorkshopTypeMetadata
} from "./workshopTypeRegistry.js";

export { WORKSHOP_ASSET_TYPES } from "./workshopTypeRegistry.js";

export const WORKSHOP_VISIBILITIES = Object.freeze([
  "PRIVATE", "ROOM", "FRIENDS", "PUBLIC"
]);

export const WORKSHOP_PAGE_SIZE = 40;
export const WORKSHOP_MAX_CONTENT_BYTES = 500 * 1024;

const text = (value, maximum = 2000) => String(value ?? "")
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
  .trim()
  .slice(0, maximum);

const safeId = (value, label = "ID") => {
  const result = text(value, 160);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/.test(result)) {
    throw new Error(`${label} is invalid.`);
  }
  return result;
};

export function sanitizeWorkshopUrl(value) {
  const url = text(value, 2048);
  if (!url) return "";
  if (!/^https:\/\//i.test(url)) throw new Error("Workshop image URLs must use HTTPS.");
  return url;
}

export function sanitizeWorkshopTags(value) {
  const source = Array.isArray(value) ? value : String(value ?? "").split(",");
  return [...new Set(source.map((entry) => text(entry, 32).toLowerCase()).filter(Boolean))].slice(0, 16);
}

export function sanitizeStructuredContent(value) {
  let nodes = 0;
  const visit = (entry, depth = 0) => {
    if (++nodes > 12000 || depth > 32) throw new Error("Workshop content is too complex.");
    if (entry == null || typeof entry === "boolean") return entry;
    if (typeof entry === "number") {
      if (!Number.isFinite(entry)) throw new Error("Workshop content contains an invalid number.");
      return entry;
    }
    if (typeof entry === "string") {
      if (entry.length > 100000) throw new Error("Workshop content is too large.");
      return entry;
    }
    if (Array.isArray(entry)) {
      if (entry.length > 2000) throw new Error("Workshop content contains too many list entries.");
      return entry.map((item) => visit(item, depth + 1));
    }
    if (typeof entry !== "object") throw new Error("Workshop content contains an unsupported value.");
    const output = {};
    const entries = Object.entries(entry);
    if (entries.length > 2000) throw new Error("Workshop content contains too many fields.");
    for (const [rawKey, item] of entries) {
      const key = text(rawKey, 120);
      if (!key || ["__proto__", "prototype", "constructor"].includes(key)) continue;
      output[key] = visit(item, depth + 1);
    }
    return output;
  };
  const result = visit(value && typeof value === "object" ? value : {});
  const bytes = new TextEncoder().encode(JSON.stringify(result)).byteLength;
  if (bytes > WORKSHOP_MAX_CONTENT_BYTES) {
    throw new Error("Workshop content is too large (500 KB maximum).");
  }
  return result;
}

export function normalizeWorkshopAsset(input = {}, context = {}) {
  const assetType = WORKSHOP_ASSET_TYPES.includes(input.assetType) ? input.assetType : "other";
  const visibility = WORKSHOP_VISIBILITIES.includes(input.visibility) ? input.visibility : "PRIVATE";
  const authorUid = text(context.authorUid, 160);
  if (!authorUid) throw new Error("Sign in before publishing to the Workshop.");
  const name = text(input.name, 120);
  if (!name) throw new Error("Give the Workshop asset a name.");
  const roomCode = visibility === "ROOM" ? text(input.roomCode || context.roomCode, 40).toUpperCase() : "";
  if (visibility === "ROOM" && !roomCode) throw new Error("Open a room before publishing a room asset.");
  const version = Math.max(1, Math.min(1000000, Math.trunc(Number(input.version) || 1)));
  return Object.freeze({
    assetId: safeId(input.assetId, "Workshop asset ID"),
    assetType,
    name,
    nameSearch: name.toLowerCase(),
    description: text(input.description, 2000),
    authorUid,
    authorName: text(context.authorName, 120) || "Homebrew God Creator",
    visibility,
    roomCode,
    tags: sanitizeWorkshopTags(input.tags),
    thumbnailUrl: sanitizeWorkshopUrl(input.thumbnailUrl),
    version,
    forkedFrom: input.forkedFrom ? safeId(input.forkedFrom, "Fork source") : null,
    sourceKey: text(input.sourceKey, 240),
    sourceRecordId: text(input.sourceRecordId, 160),
    typeMetadata: createWorkshopTypeMetadata(assetType, input.content, input.typeMetadata),
    collectionIds: Array.isArray(input.collectionIds)
      ? [...new Set(input.collectionIds.map((entry) => text(entry, 160)).filter(Boolean))].slice(0, 50)
      : [],
    saveCount: Math.max(0, Math.trunc(Number(input.saveCount) || 0)),
    content: sanitizeStructuredContent(input.content)
  });
}

export function createWorkshopSummary(asset, timestamps = {}) {
  const { content: _content, ...summary } = asset;
  return Object.freeze({
    ...summary,
    createdAt: timestamps.createdAt ?? null,
    updatedAt: timestamps.updatedAt ?? null,
    createdAtMillis: Math.max(0, Number(timestamps.createdAtMillis) || Date.now()),
    updatedAtMillis: Math.max(0, Number(timestamps.updatedAtMillis) || Date.now())
  });
}

export function canAccessWorkshopAsset(asset, context = {}) {
  if (!asset || !context.uid) return false;
  if (asset.authorUid === context.uid) return true;
  if (asset.visibility === "PUBLIC") return true;
  if (asset.visibility === "ROOM") return Boolean(context.roomCode && asset.roomCode === context.roomCode);
  if (asset.visibility === "FRIENDS") return Array.isArray(context.friendUids) && context.friendUids.includes(asset.authorUid);
  return false;
}

export function matchesWorkshopAsset(asset, filters = {}) {
  return matchesWorkshopFilters(asset, filters);
}

export function sortWorkshopAssets(assets, sort = "updated") {
  return [...assets].sort((left, right) => {
    if (sort === "created") return (right.createdAtMillis || 0) - (left.createdAtMillis || 0);
    if (sort === "saved") return (right.saveCount || 0) - (left.saveCount || 0) || String(left.name || "").localeCompare(String(right.name || ""));
    if (sort === "name") return String(left.name || "").localeCompare(String(right.name || ""));
    return (right.updatedAtMillis || 0) - (left.updatedAtMillis || 0);
  });
}

export function workshopSourceKey(assetType, sourceRecordId, scope = "") {
  return [assetType, scope, text(sourceRecordId, 160)].filter(Boolean).join(":");
}
