import { normalizeEncounter, validateEncounter } from "./encounterModel.js";

const docsOf = (snapshot) => Array.isArray(snapshot?.docs) ? snapshot.docs : [];
const mutableEncounter = (encounter) => ({
  ...encounter,
  tags: [...encounter.tags],
  mapRef: encounter.mapRef ? { ...encounter.mapRef } : null,
  combatants: encounter.combatants.map((entry) => ({ ...entry })),
  lighting: { ...encounter.lighting }
});

export function createEncounterPersistence({
  db, collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, orderBy, limit, startAfter, serverTimestamp,
  getUserId = () => "", now = () => Date.now()
} = {}) {
  const requireUid = () => {
    const uid = String(getUserId() || "");
    if (!uid) throw new Error("Sign in to use your Encounter Library.");
    return uid;
  };
  const encounterRef = (uid, encounterId) => doc(db, "users", uid, "encounters", encounterId);

  async function save(raw) {
    const uid = requireUid();
    const errors = validateEncounter(raw);
    if (errors.length) throw new Error(errors.join(" "));
    const timestamp = now();
    const encounter = normalizeEncounter(raw, { now: timestamp });
    const record = {
      ...mutableEncounter(encounter),
      ownerUid: uid,
      updatedAt: serverTimestamp?.() || new Date(),
      updatedAtMillis: timestamp
    };
    if (!raw.createdAt && !raw.createdAtMillis) record.createdAt = serverTimestamp?.() || new Date();
    await setDoc(encounterRef(uid, encounter.id), record, { merge: true });
    return normalizeEncounter(record, { now: timestamp });
  }

  async function load(encounterId) {
    const snapshot = await getDoc(encounterRef(requireUid(), String(encounterId)));
    if (!snapshot.exists()) throw new Error("That encounter no longer exists.");
    return normalizeEncounter({ ...snapshot.data(), id: snapshot.id });
  }

  async function remove(encounterId) {
    await deleteDoc(encounterRef(requireUid(), String(encounterId)));
    return true;
  }

  async function listPage({ cursor = null, pageSize = 50 } = {}) {
    const count = Math.max(1, Math.min(100, Math.trunc(Number(pageSize) || 50)));
    const constraints = [orderBy("updatedAtMillis", "desc"), limit(count)];
    if (cursor) constraints.splice(1, 0, startAfter(cursor));
    const snapshot = await getDocs(query(collection(db, "users", requireUid(), "encounters"), ...constraints));
    const documents = docsOf(snapshot);
    return {
      entries: documents.map((entry) => normalizeEncounter({ ...entry.data(), id: entry.id })),
      cursor: documents.at(-1) || null,
      hasMore: documents.length === count,
      readCount: documents.length
    };
  }

  async function list() {
    const snapshot = await getDocs(collection(db, "users", requireUid(), "encounters"));
    return docsOf(snapshot).map((entry) => normalizeEncounter({ ...entry.data(), id: entry.id }))
      .sort((left, right) => right.updatedAtMillis - left.updatedAtMillis || left.name.localeCompare(right.name));
  }

  return Object.freeze({ save, load, remove, list, listPage });
}
