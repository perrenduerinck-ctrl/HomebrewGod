import { normalizeSummonPreset, validateSummonPreset } from "./summonPresetModel.js";

const docsOf = (snapshot) => Array.isArray(snapshot?.docs) ? snapshot.docs : [];
const mutable = (preset) => ({
  ...preset,
  source: { ...preset.source },
  placement: { ...preset.placement },
  ownership: { ...preset.ownership },
  initiative: { ...preset.initiative },
  duration: { ...preset.duration },
  endBehavior: { ...preset.endBehavior },
  tags: [...preset.tags]
});

export function createSummonPersistence({
  db, collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, orderBy, limit, startAfter, serverTimestamp,
  getUserId = () => "", now = () => Date.now()
} = {}) {
  const requireUid = () => {
    const uid = String(getUserId() || "");
    if (!uid) throw new Error("Sign in to use your Summon Library.");
    return uid;
  };
  const summonRef = (uid, summonId) => doc(db, "users", uid, "summons", summonId);

  async function save(raw) {
    const uid = requireUid();
    const errors = validateSummonPreset(raw);
    if (errors.length) throw new Error(errors.join(" "));
    const timestamp = now();
    const preset = normalizeSummonPreset(raw, { now: timestamp });
    const record = {
      ...mutable(preset),
      ownerUid: uid,
      updatedAt: serverTimestamp?.() || new Date(),
      updatedAtMillis: timestamp
    };
    if (!raw.createdAt && !raw.createdAtMillis) record.createdAt = serverTimestamp?.() || new Date();
    await setDoc(summonRef(uid, preset.id), record, { merge: true });
    return normalizeSummonPreset(record, { now: timestamp });
  }

  async function load(summonId) {
    const snapshot = await getDoc(summonRef(requireUid(), String(summonId)));
    if (!snapshot.exists()) throw new Error("That summon preset no longer exists.");
    return normalizeSummonPreset({ ...snapshot.data(), id: snapshot.id });
  }

  async function remove(summonId) {
    await deleteDoc(summonRef(requireUid(), String(summonId)));
    return true;
  }

  async function listPage({ cursor = null, pageSize = 50 } = {}) {
    const count = Math.max(1, Math.min(100, Math.trunc(Number(pageSize) || 50)));
    const constraints = [orderBy("updatedAtMillis", "desc"), limit(count)];
    if (cursor) constraints.splice(1, 0, startAfter(cursor));
    const snapshot = await getDocs(query(collection(db, "users", requireUid(), "summons"), ...constraints));
    const documents = docsOf(snapshot);
    return {
      entries: documents.map((entry) => normalizeSummonPreset({ ...entry.data(), id: entry.id })),
      cursor: documents.at(-1) || null,
      hasMore: documents.length === count,
      readCount: documents.length
    };
  }

  async function list() {
    const snapshot = await getDocs(collection(db, "users", requireUid(), "summons"));
    return docsOf(snapshot).map((entry) => normalizeSummonPreset({ ...entry.data(), id: entry.id }))
      .sort((left, right) => right.updatedAtMillis - left.updatedAtMillis || left.name.localeCompare(right.name));
  }

  return Object.freeze({ save, load, remove, list, listPage });
}
