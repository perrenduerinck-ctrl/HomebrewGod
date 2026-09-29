import { createLibraryRecord } from "../libraryRecord.js";

const dataOf = (entry) => typeof entry?.data === "function" ? entry.data() || {} : entry?.data || {};

export function createMonsterLibraryAdapter({ db, collection, doc, getDoc, getDocs, getRoomCode = () => "", getUserId = () => "", getUserName = () => "", getIsDM = () => false } = {}) {
  return Object.freeze({
    sourceType: "monster",
    async listSummaries() {
      const roomCode = String(getRoomCode() || "").toUpperCase();
      const uid = String(getUserId() || "");
      if (!roomCode || !uid || !getIsDM()) return [];
      const snapshot = await getDocs(collection(db, "rooms", roomCode, "monsters"));
      return (snapshot.docs || []).map((entry) => {
        const value = dataOf(entry);
        return createLibraryRecord({
          assetType: "monster",
          sourceType: "monster",
          sourceRecordId: entry.id,
          sourceScope: `room:${roomCode}`,
          name: value.name,
          description: value.notes || value.description,
          thumbnailUrl: value.imageUrl || value.image?.url,
          tags: value.tags || [value.type, value.size, value.cr ? `cr-${value.cr}` : ""],
          ownerUid: value.ownerUid || uid,
          ownerName: value.ownerName || getUserName(),
          roomCode,
          visibility: "ROOM",
          createdAt: value.createdAt,
          updatedAt: value.updatedAt,
          updatedAtMillis: value.updatedAtMillis,
          sourceWorkshopAssetId: value.sourceWorkshopAssetId,
          sourceWorkshopVersion: value.sourceWorkshopVersion,
          sourceAuthorUid: value.sourceAuthorUid,
          metadata: { cr: value.cr, size: value.size, type: value.type || value.creatureType }
        });
      });
    },
    async load(sourceRecordId) {
      const roomCode = String(getRoomCode() || "").toUpperCase();
      if (!roomCode) throw new Error("Open the room that owns this monster.");
      const snapshot = await getDoc(doc(db, "rooms", roomCode, "monsters", String(sourceRecordId)));
      if (!snapshot.exists()) throw new Error("That monster no longer exists.");
      return { ...snapshot.data(), id: snapshot.id };
    }
  });
}
