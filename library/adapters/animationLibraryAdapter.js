import { createLibraryRecord } from "../libraryRecord.js";

const dataOf = (entry) => typeof entry?.data === "function" ? entry.data() || {} : entry?.data || {};

export function createAnimationLibraryAdapter({ db, collection, doc, getDoc, getDocs, getUserId = () => "", getUserName = () => "" } = {}) {
  return Object.freeze({
    sourceType: "animation",
    async listSummaries() {
      const uid = String(getUserId() || "");
      if (!uid) return [];
      const snapshot = await getDocs(collection(db, "users", uid, "animations"));
      return (snapshot.docs || []).map((entry) => {
        const record = dataOf(entry);
        const value = record.definition || record.animation || record;
        return createLibraryRecord({
          assetType: "animation",
          sourceType: "animation",
          sourceRecordId: entry.id,
          sourceScope: `user:${uid}`,
          name: value.name,
          description: value.description,
          thumbnailUrl: value.thumbnailUrl,
          tags: [...(value.tags || []), value.family, value.style].filter(Boolean),
          ownerUid: value.ownership?.ownerId || uid,
          ownerName: getUserName(),
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          updatedAtMillis: record.updatedAtMillis,
          sourceWorkshopAssetId: record.sourceWorkshopAssetId || value.sourceWorkshopAssetId,
          sourceWorkshopVersion: record.sourceWorkshopVersion || value.sourceWorkshopVersion,
          sourceAuthorUid: record.sourceAuthorUid || value.sourceAuthorUid,
          metadata: { family: value.family || value.type, style: value.style }
        });
      });
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
