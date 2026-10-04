import { createLibraryRecord } from "../libraryRecord.js";
import { normalizeSummonPreset } from "../../summons/summonPresetModel.js";

const dataOf = (entry) => typeof entry?.data === "function" ? entry.data() || {} : entry?.data || {};

export function createSummonLibraryAdapter({
  db, collection, doc, getDoc, getDocs, query, orderBy, limit, startAfter,
  getUserId = () => "", getUserName = () => ""
} = {}) {
  const uid = () => String(getUserId() || "");
  const normalize = (entry) => {
    const preset = normalizeSummonPreset({ ...dataOf(entry), id: entry.id });
    return createLibraryRecord({
      assetType: "summon",
      sourceType: "summon",
      sourceRecordId: preset.id,
      sourceScope: `user:${uid()}`,
      sourceKind: "personal",
      name: preset.name,
      description: preset.description,
      thumbnailUrl: preset.source.thumbnailUrl,
      tags: preset.tags,
      ownerUid: uid(),
      ownerName: getUserName(),
      createdAtMillis: preset.createdAtMillis,
      updatedAtMillis: preset.updatedAtMillis,
      sourceWorkshopAssetId: preset.sourceWorkshopAssetId,
      sourceWorkshopVersion: preset.sourceWorkshopVersion,
      sourceAuthorUid: preset.sourceAuthorUid,
      copiedFromLibraryId: preset.copiedFromLibraryId,
      metadata: {
        sourceType: preset.source.assetType,
        sourceName: preset.source.name,
        count: preset.count,
        placement: preset.placement.mode,
        duration: preset.duration.mode
      }
    });
  };

  async function getSummariesByIds(libraryIds = []) {
    if (!uid()) return { entries: [], readCount: 0 };
    const ids = [...new Set(libraryIds.map(String).filter((id) => id.startsWith("summon:"))
      .map((id) => id.slice("summon:".length)).filter(Boolean))];
    const snapshots = await Promise.all(ids.map((id) => getDoc(doc(db, "users", uid(), "summons", id))));
    return { entries: snapshots.filter((snapshot) => snapshot.exists()).map(normalize), readCount: snapshots.length };
  }

  return Object.freeze({
    sourceType: "summon",
    async listPage({ cursor = null, pageSize = 50 } = {}) {
      if (!uid()) return { entries: [], cursor: null, hasMore: false, readCount: 0 };
      const count = Math.max(1, Math.min(100, Number(pageSize) || 50));
      const constraints = [orderBy("updatedAtMillis", "desc"), limit(count)];
      if (cursor) constraints.splice(1, 0, startAfter(cursor));
      const snapshot = await getDocs(query(collection(db, "users", uid(), "summons"), ...constraints));
      const documents = snapshot.docs || [];
      return { entries: documents.map(normalize), cursor: documents.at(-1) || null, hasMore: documents.length === count, readCount: documents.length };
    },
    getSummariesByIds,
    async listSummaries() {
      if (!uid()) return [];
      const snapshot = await getDocs(collection(db, "users", uid(), "summons"));
      return (snapshot.docs || []).map(normalize);
    },
    async load(sourceRecordId) {
      if (!uid()) throw new Error("Sign in to load this summon preset.");
      const snapshot = await getDoc(doc(db, "users", uid(), "summons", String(sourceRecordId)));
      if (!snapshot.exists()) throw new Error("That summon preset no longer exists.");
      return normalizeSummonPreset({ ...snapshot.data(), id: snapshot.id });
    }
  });
}
