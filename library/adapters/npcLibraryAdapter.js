import { createLibraryRecord } from "../libraryRecord.js";
import { normalizeNpc } from "../../npcs/npcModel.js";

const dataOf = (entry) => typeof entry?.data === "function" ? entry.data() || {} : entry?.data || {};

export function createNpcLibraryAdapter({
  db, collection, doc, getDoc, getDocs, query, orderBy, limit, startAfter,
  getUserId = () => "", getUserName = () => ""
} = {}) {
  const normalize = (entry) => {
    const npc = normalizeNpc({ ...dataOf(entry), id: entry.id });
    return createLibraryRecord({
      assetType: "npc",
      sourceType: "npc",
      sourceRecordId: npc.id,
      sourceScope: `user:${String(getUserId() || "")}`,
      sourceKind: npc.roomCode ? "campaign" : "personal",
      sourceRoomCode: npc.roomCode,
      sourceRoomName: npc.roomName,
      name: npc.name,
      description: npc.description || npc.personality || npc.notes,
      thumbnailUrl: npc.portraitUrl,
      tags: npc.tags,
      ownerUid: String(getUserId() || ""),
      ownerName: getUserName(),
      createdAtMillis: npc.createdAtMillis,
      updatedAtMillis: npc.updatedAtMillis,
      sourceWorkshopAssetId: npc.sourceWorkshopAssetId,
      sourceWorkshopVersion: npc.sourceWorkshopVersion,
      sourceAuthorUid: npc.sourceAuthorUid,
      copiedFromLibraryId: npc.copiedFromLibraryId,
      metadata: {
        creatureType: npc.species,
        role: npc.occupation,
        disposition: npc.disposition,
        faction: npc.faction,
        combatEnabled: npc.combat.enabled,
        roomCode: npc.roomCode
      }
    });
  };

  async function getSummariesByIds(libraryIds = []) {
    const uid = String(getUserId() || "");
    if (!uid) return { entries: [], readCount: 0 };
    const ids = [...new Set(libraryIds.map(String).filter((id) => id.startsWith("npc:")).map((id) => id.slice(4)).filter(Boolean))];
    const snapshots = await Promise.all(ids.map((id) => getDoc(doc(db, "users", uid, "npcs", id))));
    return { entries: snapshots.filter((snapshot) => snapshot.exists()).map(normalize), readCount: snapshots.length };
  }

  async function listDocuments() {
    const uid = String(getUserId() || "");
    if (!uid) return [];
    const snapshot = await getDocs(collection(db, "users", uid, "npcs"));
    return snapshot.docs || [];
  }

  return Object.freeze({
    sourceType: "npc",
    async listPage({ cursor = null, pageSize = 50 } = {}) {
      const uid = String(getUserId() || "");
      if (!uid) return { entries: [], cursor: null, hasMore: false, readCount: 0 };
      const count = Math.max(1, Math.min(100, Number(pageSize) || 50));
      const constraints = [orderBy("updatedAtMillis", "desc"), limit(count)];
      if (cursor) constraints.splice(1, 0, startAfter(cursor));
      const snapshot = await getDocs(query(collection(db, "users", uid, "npcs"), ...constraints));
      const documents = snapshot.docs || [];
      return { entries: documents.map(normalize), cursor: documents.at(-1) || null, hasMore: documents.length === count, readCount: documents.length };
    },
    getSummariesByIds,
    async listSummaries() { return (await listDocuments()).map(normalize); },
    async listCampaigns() {
      const records = (await listDocuments()).map((entry) => normalizeNpc({ ...dataOf(entry), id: entry.id }));
      return [...new Map(records.filter((npc) => npc.roomCode).map((npc) => [npc.roomCode, {
        roomCode: npc.roomCode,
        roomName: npc.roomName || npc.roomCode
      }])).values()];
    },
    async load(sourceRecordId) {
      const uid = String(getUserId() || "");
      if (!uid) throw new Error("Sign in to load this NPC.");
      const snapshot = await getDoc(doc(db, "users", uid, "npcs", String(sourceRecordId)));
      if (!snapshot.exists()) throw new Error("That NPC no longer exists.");
      return normalizeNpc({ ...snapshot.data(), id: snapshot.id });
    }
  });
}
