import { createLibraryRecord } from "../libraryRecord.js";
import { normalizeEncounter } from "../../encounters/encounterModel.js";

const dataOf = (entry) => typeof entry?.data === "function" ? entry.data() || {} : entry?.data || {};

export function createEncounterLibraryAdapter({
  db, collection, doc, getDoc, getDocs, query, orderBy, limit, startAfter,
  getUserId = () => "", getUserName = () => ""
} = {}) {
  const normalize = (entry) => {
    const encounter = normalizeEncounter({ ...dataOf(entry), id: entry.id });
    return createLibraryRecord({
      assetType: "encounter",
      sourceType: "encounter",
      sourceRecordId: encounter.id,
      sourceScope: `user:${String(getUserId() || "")}`,
      sourceKind: "personal",
      sourceRoomCode: encounter.roomCode,
      sourceRoomName: encounter.roomName,
      name: encounter.name,
      description: encounter.description || encounter.environment || encounter.notes,
      tags: encounter.tags,
      ownerUid: String(getUserId() || ""),
      ownerName: getUserName(),
      createdAtMillis: encounter.createdAtMillis,
      updatedAtMillis: encounter.updatedAtMillis,
      sourceWorkshopAssetId: encounter.sourceWorkshopAssetId,
      sourceWorkshopVersion: encounter.sourceWorkshopVersion,
      sourceAuthorUid: encounter.sourceAuthorUid,
      copiedFromLibraryId: encounter.copiedFromLibraryId,
      metadata: {
        difficulty: encounter.difficulty,
        combatantCount: encounter.combatants.length,
        mapName: encounter.mapRef?.name || ""
      }
    });
  };
  const uid = () => String(getUserId() || "");

  async function getSummariesByIds(libraryIds = []) {
    if (!uid()) return { entries: [], readCount: 0 };
    const ids = [...new Set(libraryIds.map(String).filter((id) => id.startsWith("encounter:"))
      .map((id) => id.slice("encounter:".length)).filter(Boolean))];
    const snapshots = await Promise.all(ids.map((id) => getDoc(doc(db, "users", uid(), "encounters", id))));
    return { entries: snapshots.filter((snapshot) => snapshot.exists()).map(normalize), readCount: snapshots.length };
  }

  return Object.freeze({
    sourceType: "encounter",
    async listPage({ cursor = null, pageSize = 50 } = {}) {
      if (!uid()) return { entries: [], cursor: null, hasMore: false, readCount: 0 };
      const count = Math.max(1, Math.min(100, Number(pageSize) || 50));
      const constraints = [orderBy("updatedAtMillis", "desc"), limit(count)];
      if (cursor) constraints.splice(1, 0, startAfter(cursor));
      const snapshot = await getDocs(query(collection(db, "users", uid(), "encounters"), ...constraints));
      const documents = snapshot.docs || [];
      return { entries: documents.map(normalize), cursor: documents.at(-1) || null, hasMore: documents.length === count, readCount: documents.length };
    },
    getSummariesByIds,
    async listSummaries() {
      if (!uid()) return [];
      const snapshot = await getDocs(collection(db, "users", uid(), "encounters"));
      return (snapshot.docs || []).map(normalize);
    },
    async load(sourceRecordId) {
      if (!uid()) throw new Error("Sign in to load this encounter.");
      const snapshot = await getDoc(doc(db, "users", uid(), "encounters", String(sourceRecordId)));
      if (!snapshot.exists()) throw new Error("That encounter no longer exists.");
      return normalizeEncounter({ ...snapshot.data(), id: snapshot.id });
    }
  });
}
