import { normalizeNpcRelationship, validateNpcRelationship } from "./relationshipModel.js";

const docsOf = (snapshot) => Array.isArray(snapshot?.docs) ? snapshot.docs : [];
const mutableRelationship = (relationship) => ({ ...relationship, tags: [...relationship.tags] });

export function createNpcRelationshipPersistence({
  db, collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, orderBy, limit, startAfter, serverTimestamp,
  getUserId = () => "", now = () => Date.now()
} = {}) {
  const requireUid = () => {
    const uid = String(getUserId() || "");
    if (!uid) throw new Error("Sign in to use NPC relationships.");
    return uid;
  };
  const relationshipRef = (uid, relationshipId) => doc(db, "users", uid, "npcRelationships", relationshipId);

  async function save(raw) {
    const uid = requireUid();
    const errors = validateNpcRelationship(raw);
    if (errors.length) throw new Error(errors.join(" "));
    const timestamp = now();
    const relationship = normalizeNpcRelationship(raw, { now: timestamp });
    const record = {
      ...mutableRelationship(relationship),
      ownerUid: uid,
      updatedAt: serverTimestamp?.() || new Date(),
      updatedAtMillis: timestamp
    };
    if (!raw.createdAt && !raw.createdAtMillis) record.createdAt = serverTimestamp?.() || new Date();
    await setDoc(relationshipRef(uid, relationship.id), record, { merge: true });
    return normalizeNpcRelationship(record, { now: timestamp });
  }

  async function load(relationshipId) {
    const snapshot = await getDoc(relationshipRef(requireUid(), String(relationshipId)));
    if (!snapshot.exists()) throw new Error("That NPC relationship no longer exists.");
    return normalizeNpcRelationship({ ...snapshot.data(), id: snapshot.id });
  }

  async function remove(relationshipId) {
    await deleteDoc(relationshipRef(requireUid(), String(relationshipId)));
    return true;
  }

  async function listPage({ cursor = null, pageSize = 100 } = {}) {
    const count = Math.max(1, Math.min(100, Math.trunc(Number(pageSize) || 100)));
    const constraints = [orderBy("updatedAtMillis", "desc"), limit(count)];
    if (cursor) constraints.splice(1, 0, startAfter(cursor));
    const snapshot = await getDocs(query(collection(db, "users", requireUid(), "npcRelationships"), ...constraints));
    const documents = docsOf(snapshot);
    return {
      entries: documents.map((entry) => normalizeNpcRelationship({ ...entry.data(), id: entry.id })),
      cursor: documents.at(-1) || null,
      hasMore: documents.length === count,
      readCount: documents.length
    };
  }

  async function list() {
    const snapshot = await getDocs(collection(db, "users", requireUid(), "npcRelationships"));
    return docsOf(snapshot).map((entry) => normalizeNpcRelationship({ ...entry.data(), id: entry.id }))
      .sort((left, right) => right.updatedAtMillis - left.updatedAtMillis);
  }

  return Object.freeze({ save, load, remove, list, listPage });
}
