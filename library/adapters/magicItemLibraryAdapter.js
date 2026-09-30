import { createLibraryRecord } from "../libraryRecord.js";
import { normalizeMagicItem } from "../../items/magicItemModel.js";

const dataOf = (entry) => typeof entry?.data === "function" ? entry.data() || {} : entry?.data || {};

export function createMagicItemLibraryAdapter({
  db, collection, doc, getDoc, getDocs, query, orderBy, limit, startAfter,
  getUserId = () => "", getUserName = () => ""
} = {}) {
  const normalize = (entry) => {
    const item = normalizeMagicItem({ ...dataOf(entry), id: entry.id });
    return createLibraryRecord({
      assetType: "magic-item",
      sourceType: "magic-item",
      sourceRecordId: item.id,
      sourceScope: `user:${String(getUserId() || "")}`,
      sourceKind: "personal",
      name: item.name,
      description: item.description,
      thumbnailUrl: item.imageUrl,
      tags: item.tags,
      ownerUid: String(getUserId() || ""),
      ownerName: getUserName(),
      createdAtMillis: item.createdAtMillis,
      updatedAtMillis: item.updatedAtMillis,
      sourceWorkshopAssetId: item.sourceWorkshopAssetId,
      sourceWorkshopVersion: item.sourceWorkshopVersion,
      sourceAuthorUid: item.sourceAuthorUid,
      metadata: {
        itemType: item.itemType,
        rarity: item.rarity,
        attunement: item.requiresAttunement,
        charges: item.charges.maximum
      }
    });
  };

  async function getSummariesByIds(libraryIds = []) {
    const uid = String(getUserId() || "");
    if (!uid) return { entries: [], readCount: 0 };
    const ids = [...new Set(libraryIds.map(String).filter((id) => id.startsWith("magic-item:")).map((id) => id.slice(11)).filter(Boolean))];
    const snapshots = await Promise.all(ids.map((id) => getDoc(doc(db, "users", uid, "magicItems", id))));
    return { entries: snapshots.filter((snapshot) => snapshot.exists()).map(normalize), readCount: snapshots.length };
  }

  return Object.freeze({
    sourceType: "magic-item",
    async listPage({ cursor = null, pageSize = 50 } = {}) {
      const uid = String(getUserId() || "");
      if (!uid) return { entries: [], cursor: null, hasMore: false, readCount: 0 };
      const count = Math.max(1, Math.min(100, Number(pageSize) || 50));
      const constraints = [orderBy("updatedAtMillis", "desc"), limit(count)];
      if (cursor) constraints.splice(1, 0, startAfter(cursor));
      const snapshot = await getDocs(query(collection(db, "users", uid, "magicItems"), ...constraints));
      const documents = snapshot.docs || [];
      return { entries: documents.map(normalize), cursor: documents.at(-1) || null, hasMore: documents.length === count, readCount: documents.length };
    },
    getSummariesByIds,
    async listSummaries() {
      const uid = String(getUserId() || "");
      if (!uid) return [];
      const snapshot = await getDocs(collection(db, "users", uid, "magicItems"));
      return (snapshot.docs || []).map(normalize);
    },
    async load(sourceRecordId) {
      const uid = String(getUserId() || "");
      if (!uid) throw new Error("Sign in to load this magic item.");
      const snapshot = await getDoc(doc(db, "users", uid, "magicItems", String(sourceRecordId)));
      if (!snapshot.exists()) throw new Error("That magic item no longer exists.");
      return normalizeMagicItem({ ...snapshot.data(), id: snapshot.id });
    }
  });
}
