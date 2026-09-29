import { createLibraryRecord } from "../libraryRecord.js";

const dataOf = (entry) => typeof entry?.data === "function" ? entry.data() || {} : entry?.data || {};

export function createMapLibraryAdapter({ db, collection, doc, getDoc, getDocs, getRoomCode = () => "", getUserId = () => "", getUserName = () => "", getIsDM = () => false } = {}) {
  return Object.freeze({
    sourceType: "map",
    async listSummaries() {
      const roomCode = String(getRoomCode() || "").toUpperCase();
      const uid = String(getUserId() || "");
      if (!roomCode || !uid || !getIsDM()) return [];
      const snapshot = await getDocs(collection(db, "rooms", roomCode, "maps"));
      return (snapshot.docs || []).map((entry) => {
        const value = dataOf(entry);
        return createLibraryRecord({
          assetType: "map",
          sourceType: "map",
          sourceRecordId: entry.id,
          sourceScope: `room:${roomCode}`,
          name: value.name,
          description: value.description,
          thumbnailUrl: value.thumbnailUrl || value.url,
          tags: value.tags || [value.mapType || value.type].filter(Boolean),
          ownerUid: value.ownerUid || uid,
          ownerName: value.ownerName || getUserName(),
          roomCode,
          visibility: "ROOM",
          createdAt: value.createdAt,
          updatedAt: value.updatedAt || value.createdAt,
          updatedAtMillis: value.updatedAtMillis,
          sourceWorkshopAssetId: value.sourceWorkshopAssetId,
          sourceWorkshopVersion: value.sourceWorkshopVersion,
          sourceAuthorUid: value.sourceAuthorUid,
          metadata: { mapType: value.mapType || value.type, width: value.width, height: value.height }
        });
      });
    },
    async load(sourceRecordId) {
      const roomCode = String(getRoomCode() || "").toUpperCase();
      if (!roomCode) throw new Error("Open the room that owns this map.");
      const snapshot = await getDoc(doc(db, "rooms", roomCode, "maps", String(sourceRecordId)));
      if (!snapshot.exists()) throw new Error("That map no longer exists.");
      return { ...snapshot.data(), id: snapshot.id };
    }
  });
}
