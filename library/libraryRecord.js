import { createWorkshopTypeMetadata } from "../workshop/workshopTypeRegistry.js";

const clean = (value, maximum = 2000) => String(value ?? "").trim().slice(0, maximum);
const unique = (value, maximum = 16) => [...new Set((Array.isArray(value) ? value : String(value ?? "").split(","))
  .map((entry) => clean(entry, 80).toLowerCase()).filter(Boolean))].slice(0, maximum);

export function libraryIdFor(assetType, sourceRecordId) {
  const type = clean(assetType, 80).toLowerCase().replace(/[^a-z0-9._-]/g, "-") || "other";
  const id = clean(sourceRecordId, 160).replace(/[^A-Za-z0-9._-]/g, "_");
  if (!id) throw new Error("A source record ID is required for a library record.");
  return `${type}:${id}`;
}

export function libraryTimestampMillis(value, fallback = 0) {
  if (Number.isFinite(Number(value))) return Math.max(0, Number(value));
  if (typeof value?.toMillis === "function") return Math.max(0, Number(value.toMillis()) || 0);
  if (value instanceof Date) return Math.max(0, value.getTime());
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : Math.max(0, Number(fallback) || 0);
}

export function createLibraryRecord(input = {}) {
  const assetType = clean(input.assetType || input.sourceType || "other", 80).toLowerCase();
  const sourceRecordId = clean(input.sourceRecordId || input.id, 160);
  const libraryId = clean(input.libraryId, 241) || libraryIdFor(assetType, sourceRecordId);
  const sourceType = clean(input.sourceType || assetType, 80).toLowerCase();
  const name = clean(input.name, 120) || "Unnamed creation";
  const ownerUid = clean(input.ownerUid || input.authorUid, 160);
  const importedFromWorkshop = input.importedFromWorkshop === true || Boolean(input.sourceWorkshopAssetId);
  const metadata = input.metadata && typeof input.metadata === "object" ? { ...input.metadata } : {};
  return Object.freeze({
    libraryId,
    assetId: libraryId,
    assetType,
    sourceType,
    sourceRecordId,
    sourceKey: clean(input.sourceKey, 241) || libraryId,
    sourceScope: clean(input.sourceScope, 160),
    sourceKind: clean(input.sourceKind, 40) || (sourceType === "animation" ? "personal" : "campaign"),
    sourceRoomCode: clean(input.sourceRoomCode || input.roomCode, 40).toUpperCase(),
    sourceRoomName: clean(input.sourceRoomName, 120),
    name,
    nameSearch: name.toLowerCase(),
    description: clean(input.description, 2000),
    thumbnailUrl: clean(input.thumbnailUrl, 2048),
    tags: unique(input.tags),
    ownerUid,
    authorUid: ownerUid,
    authorName: clean(input.ownerName || input.authorName, 120) || "Homebrew God Creator",
    createdAt: input.createdAt || null,
    updatedAt: input.updatedAt || null,
    createdAtMillis: libraryTimestampMillis(input.createdAtMillis ?? input.createdAt),
    updatedAtMillis: libraryTimestampMillis(input.updatedAtMillis ?? input.updatedAt ?? input.createdAtMillis ?? input.createdAt),
    visibility: ["ROOM", "PUBLIC", "FRIENDS"].includes(input.visibility) ? input.visibility : "PRIVATE",
    roomCode: clean(input.roomCode, 40).toUpperCase(),
    publishedAssetId: clean(input.publishedAssetId, 160),
    publicationVisibility: clean(input.publicationVisibility, 20),
    workshopAssetId: clean(input.workshopAssetId || input.sourceWorkshopAssetId || input.publishedAssetId, 160),
    importedFromWorkshop,
    imported: importedFromWorkshop,
    sourceWorkshopAssetId: clean(input.sourceWorkshopAssetId, 160),
    sourceWorkshopVersion: Math.max(0, Math.trunc(Number(input.sourceWorkshopVersion) || 0)),
    sourceAuthorUid: clean(input.sourceAuthorUid, 160),
    copiedFromLibraryId: clean(input.copiedFromLibraryId, 241),
    copiedFromRoomCode: clean(input.copiedFromRoomCode, 40).toUpperCase(),
    copiedFromRecordId: clean(input.copiedFromRecordId, 160),
    latestVersion: Math.max(0, Math.trunc(Number(input.latestVersion) || 0)),
    metadata: Object.freeze(metadata),
    typeMetadata: createWorkshopTypeMetadata(assetType, metadata, input.typeMetadata),
    nativeRecord: input.nativeRecord !== false,
    libraryRecord: true,
    unavailable: input.unavailable === true,
    unavailableReason: clean(input.unavailableReason, 240),
    origin: clean(input.origin, 40) || "native",
    version: Math.max(1, Math.trunc(Number(input.version) || 1)),
    saveCount: Math.max(0, Math.trunc(Number(input.saveCount) || 0))
  });
}

export function attachLibraryPublication(record, publication = null) {
  if (!publication) return record;
  return createLibraryRecord({
    ...record,
    publishedAssetId: publication.assetId,
    workshopAssetId: record.workshopAssetId || publication.assetId,
    publicationVisibility: publication.visibility,
    latestVersion: publication.version,
    version: publication.version,
    saveCount: publication.saveCount,
    nativeRecord: record.nativeRecord,
    origin: record.origin
  });
}
