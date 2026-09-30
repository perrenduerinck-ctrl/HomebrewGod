import { normalizeMagicItem, validateMagicItem } from "./magicItemModel.js";

const docsOf = (snapshot) => Array.isArray(snapshot?.docs) ? snapshot.docs : [];

export function createMagicItemPersistence({
  db, collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, orderBy, limit, startAfter, serverTimestamp,
  getUserId = () => "", now = () => Date.now()
} = {}) {
  const uid = () => String(getUserId() || "");
  const requireUid = () => {
    const value = uid();
    if (!value) throw new Error("Sign in to use your Magic Item Library.");
    return value;
  };
  const itemRef = (userId, itemId) => doc(db, "users", userId, "magicItems", itemId);

  async function save(raw) {
    const userId = requireUid();
    const errors = validateMagicItem(raw);
    if (errors.length) throw new Error(errors.join(" "));
    const item = normalizeMagicItem(raw, { now: now() });
    const record = {
      ...item,
      charges: { ...item.charges },
      effects: item.effects.map((effect) => ({ ...effect })),
      ownerUid: userId,
      updatedAt: serverTimestamp?.() || new Date(),
      updatedAtMillis: now()
    };
    if (!raw.createdAt && !raw.createdAtMillis) record.createdAt = serverTimestamp?.() || new Date();
    await setDoc(itemRef(userId, item.id), record, { merge: true });
    return normalizeMagicItem(record, { now: record.updatedAtMillis });
  }

  async function load(itemId) {
    const snapshot = await getDoc(itemRef(requireUid(), String(itemId)));
    if (!snapshot.exists()) throw new Error("That magic item no longer exists.");
    return normalizeMagicItem({ ...snapshot.data(), id: snapshot.id });
  }

  async function remove(itemId) {
    await deleteDoc(itemRef(requireUid(), String(itemId)));
    return true;
  }

  async function listPage({ cursor = null, pageSize = 50 } = {}) {
    const userId = requireUid();
    const count = Math.max(1, Math.min(100, Math.trunc(Number(pageSize) || 50)));
    const constraints = [orderBy("updatedAtMillis", "desc"), limit(count)];
    if (cursor) constraints.splice(1, 0, startAfter(cursor));
    const snapshot = await getDocs(query(collection(db, "users", userId, "magicItems"), ...constraints));
    const documents = docsOf(snapshot);
    return {
      entries: documents.map((entry) => normalizeMagicItem({ ...entry.data(), id: entry.id })),
      cursor: documents.at(-1) || null,
      hasMore: documents.length === count,
      readCount: documents.length
    };
  }

  async function list() {
    const snapshot = await getDocs(collection(db, "users", requireUid(), "magicItems"));
    return docsOf(snapshot).map((entry) => normalizeMagicItem({ ...entry.data(), id: entry.id }))
      .sort((left, right) => right.updatedAtMillis - left.updatedAtMillis || left.name.localeCompare(right.name));
  }

  return Object.freeze({ save, load, remove, list, listPage });
}
