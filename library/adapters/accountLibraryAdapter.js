import { createLibraryRecord } from "../libraryRecord.js";

const docsOf = (snapshot) => Array.isArray(snapshot?.docs) ? snapshot.docs : [];
const dataOf = (entry) => typeof entry?.data === "function" ? entry.data() || {} : entry?.data || {};

export function createAccountLibraryAdapter({
  db, collection, doc, getDoc, getDocs, query, orderBy, limit, startAfter,
  getUserId = () => "", ensureIndex = async () => null
} = {}) {
  const normalize = (entry) => {
    const value = dataOf(entry);
    return createLibraryRecord({
      ...value,
      libraryId: value.libraryId || entry.id,
      sourceRecordId: value.sourceRecordId,
      sourceType: value.assetType,
      sourceKind: "campaign",
      sourceRoomCode: value.sourceRoomCode || value.roomCode,
      sourceRoomName: value.sourceRoomName,
      ownerName: value.ownerName,
      metadata: value.metadata,
      nativeRecord: true,
      origin: "native"
    });
  };

  async function listPage({ cursor = null, pageSize = 50 } = {}) {
    const uid = String(getUserId() || "");
    if (!uid) return { entries: [], cursor: null, hasMore: false, readCount: 0 };
    await ensureIndex();
    const base = collection(db, "users", uid, "libraryIndex");
    const constraints = [orderBy("updatedAtMillis", "desc"), limit(Math.max(1, Math.min(100, Number(pageSize) || 50)))];
    if (cursor) constraints.splice(1, 0, startAfter(cursor));
    const snapshot = await getDocs(query(base, ...constraints));
    const documents = docsOf(snapshot);
    return {
      entries: documents.map(normalize),
      cursor: documents.at(-1) || null,
      hasMore: documents.length === Math.max(1, Math.min(100, Number(pageSize) || 50)),
      readCount: documents.length
    };
  }

  async function getSummariesByIds(libraryIds = []) {
    const uid = String(getUserId() || "");
    if (!uid) return { entries: [], readCount: 0 };
    const ids = [...new Set((libraryIds || []).map(String).filter((id) => id.startsWith("monster:") || id.startsWith("map:")))];
    const snapshots = await Promise.all(ids.map((id) => getDoc(doc(db, "users", uid, "libraryIndex", id))));
    return {
      entries: snapshots.filter((snapshot) => snapshot.exists()).map(normalize),
      readCount: snapshots.length
    };
  }

  return Object.freeze({
    sourceType: "account-index",
    sourceTypes: Object.freeze(["monster", "map"]),
    listPage,
    getSummariesByIds,
    async listSummaries() {
      const uid = String(getUserId() || "");
      if (!uid) return [];
      await ensureIndex();
      const snapshot = await getDocs(collection(db, "users", uid, "libraryIndex"));
      return docsOf(snapshot).map(normalize);
    },
    async listCampaigns() {
      const uid = String(getUserId() || "");
      if (!uid) return [];
      const snapshot = await getDocs(collection(db, "users", uid, "rooms"));
      return docsOf(snapshot).map((entry) => ({
        roomCode: String(dataOf(entry).roomCode || entry.id || "").toUpperCase(),
        roomName: String(dataOf(entry).roomName || dataOf(entry).name || entry.id || "Unnamed Campaign"),
        role: String(dataOf(entry).role || "player")
      })).filter((entry) => entry.role.toLowerCase() === "dm" && entry.roomCode);
    },
    async load(sourceRecordId, record = {}) {
      const roomCode = String(record.sourceRoomCode || record.roomCode || "").toUpperCase();
      const assetType = String(record.assetType || "");
      const collectionName = assetType === "monster" ? "monsters" : assetType === "map" ? "maps" : "";
      if (!roomCode || !collectionName) throw new Error("That campaign source is unavailable.");
      const snapshot = await getDoc(doc(db, "rooms", roomCode, collectionName, String(sourceRecordId)));
      if (!snapshot.exists()) throw new Error("That source record is no longer available. The library index will repair automatically.");
      return { ...snapshot.data(), id: snapshot.id };
    }
  });
}
