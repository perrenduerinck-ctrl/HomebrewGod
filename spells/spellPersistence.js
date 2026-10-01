import { normalizeHomebrewSpell, validateHomebrewSpell } from "./spellModel.js";

const docsOf = (snapshot) => Array.isArray(snapshot?.docs) ? snapshot.docs : [];
const mutableSpell = (spell) => ({
  ...spell,
  classes: [...spell.classes],
  componentLetters: [...spell.componentLetters],
  tags: [...spell.tags],
  animations: structuredClone(spell.animations),
  targeting: structuredClone(spell.targeting),
  areaOfEffect: structuredClone(spell.areaOfEffect),
  damage: structuredClone(spell.damage)
});

export function createSpellPersistence({
  db, collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, orderBy, limit, startAfter, serverTimestamp,
  getUserId = () => "", now = () => Date.now()
} = {}) {
  const requireUid = () => {
    const uid = String(getUserId() || "");
    if (!uid) throw new Error("Sign in to use your Spell Library.");
    return uid;
  };
  const spellRef = (uid, spellId) => doc(db, "users", uid, "spells", spellId);

  async function save(raw) {
    const uid = requireUid();
    const errors = validateHomebrewSpell(raw);
    if (errors.length) throw new Error(errors.join(" "));
    const spell = normalizeHomebrewSpell(raw, { now: now() });
    const record = {
      ...mutableSpell(spell),
      ownerUid: uid,
      updatedAt: serverTimestamp?.() || new Date(),
      updatedAtMillis: now()
    };
    if (!raw.createdAt && !raw.createdAtMillis) record.createdAt = serverTimestamp?.() || new Date();
    await setDoc(spellRef(uid, spell.id), record, { merge: true });
    return normalizeHomebrewSpell(record, { now: record.updatedAtMillis });
  }

  async function load(spellId) {
    const snapshot = await getDoc(spellRef(requireUid(), String(spellId)));
    if (!snapshot.exists()) throw new Error("That spell no longer exists.");
    return normalizeHomebrewSpell({ ...snapshot.data(), id: snapshot.id });
  }

  async function remove(spellId) {
    await deleteDoc(spellRef(requireUid(), String(spellId)));
    return true;
  }

  async function listPage({ cursor = null, pageSize = 50 } = {}) {
    const count = Math.max(1, Math.min(100, Math.trunc(Number(pageSize) || 50)));
    const constraints = [orderBy("updatedAtMillis", "desc"), limit(count)];
    if (cursor) constraints.splice(1, 0, startAfter(cursor));
    const snapshot = await getDocs(query(collection(db, "users", requireUid(), "spells"), ...constraints));
    const documents = docsOf(snapshot);
    return {
      entries: documents.map((entry) => normalizeHomebrewSpell({ ...entry.data(), id: entry.id })),
      cursor: documents.at(-1) || null,
      hasMore: documents.length === count,
      readCount: documents.length
    };
  }

  async function list() {
    const snapshot = await getDocs(collection(db, "users", requireUid(), "spells"));
    return docsOf(snapshot).map((entry) => normalizeHomebrewSpell({ ...entry.data(), id: entry.id }))
      .sort((left, right) => right.updatedAtMillis - left.updatedAtMillis || left.name.localeCompare(right.name));
  }

  return Object.freeze({ save, load, remove, list, listPage });
}
