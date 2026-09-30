import { createLibraryRecord } from "../libraryRecord.js";

const dataOf = (entry) => typeof entry?.data === "function" ? entry.data() || {} : entry?.data || {};

export function createAnimationLibraryAdapter({ db, collection, doc, getDoc, getDocs, query, orderBy, limit, startAfter, getUserId = () => "", getUserName = () => "" } = {}) {
  const normalize = (entry) => {
    const record = dataOf(entry);
    const value = record.definition || record.animation || record;
    return createLibraryRecord({
      assetType: "animation",
      sourceType: "animation",
      sourceRecordId: entry.id,
      sourceScope: `user:${String(getUserId() || "")}`,
      sourceKind: "personal",
      name: value.name,
      description: value.description,
      thumbnailUrl: value.thumbnailUrl,
      tags: [...(value.tags || []), value.family, value.style].filter(Boolean),
      ownerUid: value.ownership?.ownerId || String(getUserId() || ""),
      ownerName: getUserName(),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      updatedAtMillis: record.updatedAtMillis,
      sourceWorkshopAssetId: record.sourceWorkshopAssetId || value.sourceWorkshopAssetId,
      sourceWorkshopVersion: record.sourceWorkshopVersion || value.sourceWorkshopVersion,
      sourceAuthorUid: record.sourceAuthorUid || value.sourceAuthorUid,
      metadata: { family: value.family || value.type, style: value.style }
    });
  };
  return Object.freeze({
    sourceType: "animation",
    async listPage({ cursor = null, pageSize = 50 } = {}) {
      const uid = String(getUserId() || "");
      if (!uid) return { entries: [], cursor: null, hasMore: false, readCount: 0 };
      const count = Math.max(1, Math.min(100, Number(pageSize) || 50));
      const constraints = [orderBy("updatedAt", "desc"), limit(count)];
      if (cursor) constraints.splice(1, 0, startAfter(cursor));
      const snapshot = await getDocs(query(collection(db, "users", uid, "animations"), ...constraints));
      const documents = snapshot.docs || [];
      return { entries: documents.map(normalize), cursor: documents.at(-1) || null, hasMore: documents.length === count, readCount: documents.length };
    },
    async getSummariesByIds(libraryIds = []) {
      const uid = String(getUserId() || "");
      if (!uid) return { entries: [], readCount: 0 };
      const ids = [...new Set((libraryIds || []).map(String).filter((id) => id.startsWith("animation:"))
        .map((id) => id.slice("animation:".length)).filter(Boolean))];
      const snapshots = await Promise.all(ids.map((id) => getDoc(doc(db, "users", uid, "animations", id))));
      return { entries: snapshots.filter((snapshot) => snapshot.exists()).map(normalize), readCount: snapshots.length };
    },
    async listSummaries() {
      const uid = String(getUserId() || "");
      if (!uid) return [];
      const snapshot = await getDocs(collection(db, "users", uid, "animations"));
      return (snapshot.docs || []).map(normalize);
    },
    async load(sourceRecordId) {
      const uid = String(getUserId() || "");
      if (!uid) throw new Error("Sign in to load this animation.");
      const snapshot = await getDoc(doc(db, "users", uid, "animations", String(sourceRecordId)));
      if (!snapshot.exists()) throw new Error("That animation no longer exists.");
      const record = snapshot.data() || {};
      return { ...(record.definition || record.animation || record), id: snapshot.id };
    }
  });
}
