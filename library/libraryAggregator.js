import { attachLibraryPublication, createLibraryRecord, libraryIdFor } from "./libraryRecord.js";
import { createLibraryRegistry } from "./libraryRegistry.js";

const valuesOf = (value) => value instanceof Map ? [...value.values()] : Array.isArray(value) ? value : [];
const sourceIdentity = (value = {}) => `${value.assetType || value.sourceType || "other"}:${value.sourceRecordId || ""}`;

export function createLibraryAggregator({ adapters = [], persistence = null, loadImportedRecord = null, getUserId = () => "" } = {}) {
  const registry = createLibraryRegistry(adapters);

  async function ownedPublications() {
    if (typeof persistence?.listOwnedSummaries === "function") return persistence.listOwnedSummaries();
    const result = await persistence?.listAssets?.({ scope: "my", pageSize: 100, cursors: {} });
    return result?.entries || [];
  }

  async function state() {
    return typeof persistence?.listLibraryState === "function"
      ? persistence.listLibraryState()
      : { favoriteIds: new Set(), imports: new Map(), collections: [] };
  }

  async function nativeRecords() {
    const groups = await Promise.all(registry.list().map((adapter) => adapter.listSummaries()));
    return groups.flat().map((record) => createLibraryRecord(record));
  }

  function fallbackPublication(publication) {
    const sourceRecordId = publication.sourceRecordId || `workshop_${publication.assetId}`;
    return createLibraryRecord({
      ...publication,
      libraryId: libraryIdFor(publication.assetType, sourceRecordId),
      sourceType: "workshop",
      sourceRecordId,
      sourceKey: publication.sourceKey || libraryIdFor(publication.assetType, sourceRecordId),
      ownerUid: publication.authorUid,
      ownerName: publication.authorName,
      publishedAssetId: publication.assetId,
      workshopAssetId: publication.assetId,
      publicationVisibility: publication.visibility,
      metadata: publication.typeMetadata,
      typeMetadata: publication.typeMetadata,
      nativeRecord: false,
      origin: "workshop"
    });
  }

  function fallbackImport(importRecord) {
    const summary = importRecord.summary || {};
    const assetType = importRecord.assetType || summary.assetType || "other";
    const sourceRecordId = importRecord.localRecordId || `workshop_${importRecord.assetId || summary.assetId}`;
    return createLibraryRecord({
      ...summary,
      libraryId: libraryIdFor(assetType, sourceRecordId),
      assetType,
      sourceType: "workshop-import",
      sourceRecordId,
      ownerUid: getUserId(),
      ownerName: "My Library",
      sourceWorkshopAssetId: importRecord.assetId || summary.assetId,
      sourceWorkshopVersion: importRecord.sourceWorkshopVersion || summary.version,
      sourceAuthorUid: importRecord.sourceAuthorUid || summary.authorUid,
      workshopAssetId: importRecord.assetId || summary.assetId,
      importedFromWorkshop: true,
      metadata: summary.typeMetadata,
      typeMetadata: summary.typeMetadata,
      nativeRecord: false,
      origin: "workshop-import"
    });
  }

  async function list({ scope = "library" } = {}) {
    const [native, publications, libraryState] = await Promise.all([nativeRecords(), ownedPublications(), state()]);
    const imports = valuesOf(libraryState.imports);
    const publicationsBySource = new Map();
    for (const publication of publications) {
      if (publication.sourceKey) publicationsBySource.set(publication.sourceKey, publication);
      if (publication.sourceRecordId) publicationsBySource.set(sourceIdentity(publication), publication);
    }
    const importsByLocal = new Map(imports.filter((entry) => entry.localRecordId)
      .map((entry) => [`${entry.assetType || entry.summary?.assetType || "other"}:${entry.localRecordId}`, entry]));
    const importsByAsset = new Map(imports.map((entry) => [entry.assetId || entry.id, entry]));
    const matchedPublications = new Set();
    const matchedImports = new Set();
    const merged = new Map();

    for (const nativeRecord of native) {
      const publication = publicationsBySource.get(nativeRecord.sourceKey) || publicationsBySource.get(sourceIdentity(nativeRecord));
      if (publication) matchedPublications.add(publication.assetId);
      const importRecord = importsByAsset.get(nativeRecord.sourceWorkshopAssetId) || importsByLocal.get(sourceIdentity(nativeRecord));
      if (importRecord) matchedImports.add(importRecord.assetId || importRecord.id);
      const imported = importRecord || nativeRecord.importedFromWorkshop ? createLibraryRecord({
        ...nativeRecord,
        sourceWorkshopAssetId: nativeRecord.sourceWorkshopAssetId || importRecord?.assetId || importRecord?.id,
        sourceWorkshopVersion: nativeRecord.sourceWorkshopVersion || importRecord?.sourceWorkshopVersion,
        sourceAuthorUid: nativeRecord.sourceAuthorUid || importRecord?.sourceAuthorUid,
        workshopAssetId: nativeRecord.workshopAssetId || importRecord?.assetId || importRecord?.id,
        importedFromWorkshop: true,
        nativeRecord: true,
        origin: "native"
      }) : nativeRecord;
      merged.set(imported.libraryId, attachLibraryPublication(imported, publication));
    }

    for (const publication of publications) {
      if (matchedPublications.has(publication.assetId)) continue;
      const fallback = fallbackPublication(publication);
      if (!merged.has(fallback.libraryId)) merged.set(fallback.libraryId, fallback);
    }
    for (const importRecord of imports) {
      const importId = importRecord.assetId || importRecord.id;
      if (matchedImports.has(importId)) continue;
      const fallback = fallbackImport(importRecord);
      if (!merged.has(fallback.libraryId)) merged.set(fallback.libraryId, fallback);
    }

    const uid = String(getUserId() || "");
    const records = [...merged.values()];
    return scope === "my"
      ? records.filter((record) => !record.importedFromWorkshop && (!uid || record.ownerUid === uid))
      : records;
  }

  async function load(record) {
    if (!record?.libraryRecord) throw new Error("Choose an owned library record.");
    const adapter = registry.get(record.sourceType);
    if (adapter) {
      const content = await adapter.load(record.sourceRecordId, record);
      return { ...record, content };
    }
    if (record.origin === "workshop-import" && typeof loadImportedRecord === "function") {
      return loadImportedRecord({
        ...record,
        assetId: record.workshopAssetId,
        localRecordId: record.sourceRecordId,
        imported: true
      });
    }
    const workshopAssetId = record.publishedAssetId || record.workshopAssetId;
    if (workshopAssetId && typeof persistence?.loadAsset === "function") {
      const loaded = await persistence.loadAsset(workshopAssetId, record.sourceWorkshopVersion || null);
      return { ...record, ...loaded, assetId: record.libraryId, libraryId: record.libraryId, libraryRecord: true };
    }
    throw new Error("That owned library record is unavailable.");
  }

  return Object.freeze({ list, load, registry });
}
