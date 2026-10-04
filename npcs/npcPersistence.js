import { normalizeNpc, validateNpc } from "./npcModel.js";

const docsOf = (snapshot) => Array.isArray(snapshot?.docs) ? snapshot.docs : [];
const mutableNpc = (npc) => ({
  ...npc,
  tags: [...npc.tags],
  relationshipIds: [...npc.relationshipIds],
  factionIds: [...npc.factionIds],
  knowledge: npc.knowledge.map((entry) => ({
    ...entry,
    tags: [...entry.tags],
    knownByNpcIds: [...entry.knownByNpcIds]
  })),
  combat: {
    ...npc.combat,
    abilities: { ...npc.combat.abilities },
    actions: npc.combat.actions.map((action) => ({ ...action }))
  }
});

export function createNpcPersistence({
  db, collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, orderBy, limit, startAfter, serverTimestamp,
  getUserId = () => "", now = () => Date.now()
} = {}) {
  const requireUid = () => {
    const uid = String(getUserId() || "");
    if (!uid) throw new Error("Sign in to use your NPC Library.");
    return uid;
  };
  const npcRef = (uid, npcId) => doc(db, "users", uid, "npcs", npcId);

  async function save(raw) {
    const uid = requireUid();
    const errors = validateNpc(raw);
    if (errors.length) throw new Error(errors.join(" "));
    const npc = normalizeNpc(raw, { now: now() });
    const record = {
      ...mutableNpc(npc),
      ownerUid: uid,
      updatedAt: serverTimestamp?.() || new Date(),
      updatedAtMillis: now()
    };
    if (!raw.createdAt && !raw.createdAtMillis) record.createdAt = serverTimestamp?.() || new Date();
    await setDoc(npcRef(uid, npc.id), record, { merge: true });
    return normalizeNpc(record, { now: record.updatedAtMillis });
  }

  async function load(npcId) {
    const snapshot = await getDoc(npcRef(requireUid(), String(npcId)));
    if (!snapshot.exists()) throw new Error("That NPC no longer exists.");
    return normalizeNpc({ ...snapshot.data(), id: snapshot.id });
  }

  async function remove(npcId) {
    await deleteDoc(npcRef(requireUid(), String(npcId)));
    return true;
  }

  async function listPage({ cursor = null, pageSize = 50 } = {}) {
    const count = Math.max(1, Math.min(100, Math.trunc(Number(pageSize) || 50)));
    const constraints = [orderBy("updatedAtMillis", "desc"), limit(count)];
    if (cursor) constraints.splice(1, 0, startAfter(cursor));
    const snapshot = await getDocs(query(collection(db, "users", requireUid(), "npcs"), ...constraints));
    const documents = docsOf(snapshot);
    return {
      entries: documents.map((entry) => normalizeNpc({ ...entry.data(), id: entry.id })),
      cursor: documents.at(-1) || null,
      hasMore: documents.length === count,
      readCount: documents.length
    };
  }

  async function list() {
    const snapshot = await getDocs(collection(db, "users", requireUid(), "npcs"));
    return docsOf(snapshot).map((entry) => normalizeNpc({ ...entry.data(), id: entry.id }))
      .sort((left, right) => right.updatedAtMillis - left.updatedAtMillis || left.name.localeCompare(right.name));
  }

  return Object.freeze({ save, load, remove, list, listPage });
}
