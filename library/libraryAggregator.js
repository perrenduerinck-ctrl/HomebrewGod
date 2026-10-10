import { attachLibraryPublication, createLibraryRecord, libraryIdFor } from "./libraryRecord.js";
import { createLibraryRegistry } from "./libraryRegistry.js";

const valuesOf = (value) => value instanceof Map ? [...value.values()] : Array.isArray(value) ? value : [];
const sourceIdentity = (value = {}) => `${value.assetType || value.sourceType || "other"}:${value.sourceRecordId || ""}`;
const COMPLETE_CURSOR = "complete";

export function createLibraryAggregator({ adapters = [], persistence = null, loadImportedRecord = null, getUserId = () => "" } = {}) {
  const registry = createLibraryRegistry(adapters);
  let metadataCache = null;
  let campaignCache = null;

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

  async function metadata(refresh = false) {
    if (!metadataCache || refresh) {
      metadataCache = Promise.all([ownedPublications(), state()]).then(([publications, libraryState]) => ({ publications, libraryState }));
    }
    return metadataCache;
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
      sourceKind: "personal",
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
      sourceKind: "personal",
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

  function mergeRecords(native, publications, libraryState, { includeFallbacks = true } = {}) {
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

    for (const source of native) {
      const nativeRecord = createLibraryRecord(source);
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

    if (includeFallbacks) {
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
    }
    return [...merged.values()];
  }

  function applyScope(records, scope) {
    const uid = String(getUserId() || "");
    return scope === "my"
      ? records.filter((record) => !record.importedFromWorkshop && (!uid || record.ownerUid === uid))
      : records;
  }

  async function list({ scope = "library" } = {}) {
    const [native, details] = await Promise.all([nativeRecords(), metadata(true)]);
    return applyScope(mergeRecords(native, details.publications, details.libraryState), scope);
  }

  async function listPage({ scope = "library", cursors = {}, pageSize = 50 } = {}) {
    const firstPage = !Object.values(cursors || {}).some(Boolean);
    const [pages, details] = await Promise.all([
      Promise.all(registry.list().map(async (adapter) => {
        const key = adapter.sourceType;
        if (cursors?.[key] === COMPLETE_CURSOR) {
          return { key, entries: [], cursor: COMPLETE_CURSOR, hasMore: false, readCount: 0 };
        }
        if (typeof adapter.listPage === "function") {
          const page = await adapter.listPage({ cursor: cursors?.[key] || null, pageSize });
          const hasMore = page?.hasMore === true && Boolean(page?.cursor);
          return {
            key,
            ...page,
            cursor: hasMore ? page.cursor : COMPLETE_CURSOR,
            hasMore
          };
        }
        const entries = await adapter.listSummaries();
        return { key, entries, cursor: COMPLETE_CURSOR, hasMore: false, readCount: entries.length };
      })),
      metadata(firstPage)
    ]);
    const native = pages.flatMap((page) => page.entries || []);
    const records = applyScope(mergeRecords(native, details.publications, details.libraryState, { includeFallbacks: firstPage }), scope);
    return {
      entries: records,
      cursors: Object.fromEntries(pages.map((page) => [page.key, page.cursor || COMPLETE_CURSOR])),
      hasMore: pages.some((page) => page.hasMore),
      metrics: {
        summaryReads: pages.reduce((total, page) => total + (Number(page.readCount) || 0), 0)
          + (firstPage ? details.publications.length + valuesOf(details.libraryState.imports).length : 0),
        loadedSummaries: native.length,
        pageSize
      }
    };
  }

  async function listCampaigns({ refresh = false } = {}) {
    if (!campaignCache || refresh) {
      campaignCache = Promise.all(registry.list().map((adapter) => typeof adapter.listCampaigns === "function" ? adapter.listCampaigns() : []))
        .then((groups) => [...new Map(groups.flat().map((entry) => [entry.roomCode, entry])).values()]
          .sort((left, right) => left.roomName.localeCompare(right.roomName)));
    }
    return campaignCache;
  }

  async function resolveLibraryIds(libraryIds = [], { scope = "library" } = {}) {
    const requested = new Set((libraryIds || []).map(String).filter(Boolean));
    if (!requested.size) return { entries: [], metrics: { summaryReads: 0 } };
    const [groups, details] = await Promise.all([
      Promise.all(registry.list().map((adapter) => typeof adapter.getSummariesByIds === "function"
        ? adapter.getSummariesByIds([...requested])
        : { entries: [], readCount: 0 })),
      metadata()
    ]);
    const merged = applyScope(mergeRecords(
      groups.flatMap((group) => group.entries || []),
      details.publications,
      details.libraryState
    ), scope);
    return {
      entries: merged.filter((record) => [record.libraryId, record.assetId, record.publishedAssetId, record.workshopAssetId, record.sourceWorkshopAssetId]
        .some((id) => id && requested.has(id))),
      metrics: { summaryReads: groups.reduce((total, group) => total + (Number(group.readCount) || 0), 0) }
    };
  }

  async function load(record) {
    if (!record?.libraryRecord) throw new Error("Choose an owned library record.");
    if (record.unavailable) throw new Error("That collection entry is unavailable.");
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

  function invalidate() {
    metadataCache = null;
    campaignCache = null;
  }

  return Object.freeze({ list, listPage, listCampaigns, resolveLibraryIds, load, invalidate, registry });
}
