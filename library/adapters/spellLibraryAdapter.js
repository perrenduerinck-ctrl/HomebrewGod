import { createLibraryRecord } from "../libraryRecord.js";
import { normalizeHomebrewSpell } from "../../spells/spellModel.js";

const dataOf = (entry) => typeof entry?.data === "function" ? entry.data() || {} : entry?.data || {};

export function createSpellLibraryAdapter({
  db, collection, doc, getDoc, getDocs, query, orderBy, limit, startAfter,
  getUserId = () => "", getUserName = () => ""
} = {}) {
  const normalize = (entry) => {
    const spell = normalizeHomebrewSpell({ ...dataOf(entry), id: entry.id });
    return createLibraryRecord({
      assetType: "spell",
      sourceType: "spell",
      sourceRecordId: spell.id,
      sourceScope: `user:${String(getUserId() || "")}`,
      sourceKind: "personal",
      name: spell.name,
      description: spell.description,
      tags: spell.tags,
      ownerUid: String(getUserId() || ""),
      ownerName: getUserName(),
      createdAtMillis: spell.createdAtMillis,
      updatedAtMillis: spell.updatedAtMillis,
      sourceWorkshopAssetId: spell.sourceWorkshopAssetId,
      sourceWorkshopVersion: spell.sourceWorkshopVersion,
      sourceAuthorUid: spell.sourceAuthorUid,
      metadata: {
        level: spell.level,
        school: spell.school,
        classNames: spell.classes,
        damageType: spell.damageType,
        concentration: spell.concentration,
        ritual: spell.ritual
      }
    });
  };

  async function getSummariesByIds(libraryIds = []) {
    const uid = String(getUserId() || "");
    if (!uid) return { entries: [], readCount: 0 };
    const ids = [...new Set(libraryIds.map(String).filter((id) => id.startsWith("spell:")).map((id) => id.slice(6)).filter(Boolean))];
    const snapshots = await Promise.all(ids.map((id) => getDoc(doc(db, "users", uid, "spells", id))));
    return { entries: snapshots.filter((snapshot) => snapshot.exists()).map(normalize), readCount: snapshots.length };
  }

  return Object.freeze({
    sourceType: "spell",
    async listPage({ cursor = null, pageSize = 50 } = {}) {
      const uid = String(getUserId() || "");
      if (!uid) return { entries: [], cursor: null, hasMore: false, readCount: 0 };
      const count = Math.max(1, Math.min(100, Number(pageSize) || 50));
      const constraints = [orderBy("updatedAtMillis", "desc"), limit(count)];
      if (cursor) constraints.splice(1, 0, startAfter(cursor));
      const snapshot = await getDocs(query(collection(db, "users", uid, "spells"), ...constraints));
      const documents = snapshot.docs || [];
      return { entries: documents.map(normalize), cursor: documents.at(-1) || null, hasMore: documents.length === count, readCount: documents.length };
    },
    getSummariesByIds,
    async listSummaries() {
      const uid = String(getUserId() || "");
      if (!uid) return [];
      const snapshot = await getDocs(collection(db, "users", uid, "spells"));
      return (snapshot.docs || []).map(normalize);
    },
    async load(sourceRecordId) {
      const uid = String(getUserId() || "");
      if (!uid) throw new Error("Sign in to load this spell.");
      const snapshot = await getDoc(doc(db, "users", uid, "spells", String(sourceRecordId)));
      if (!snapshot.exists()) throw new Error("That spell no longer exists.");
      return normalizeHomebrewSpell({ ...snapshot.data(), id: snapshot.id });
    }
  });
}
