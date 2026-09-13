import { normalizeSpellAnimations, getSpellAnimationDependencies, replaceAnimationReferences } from "./animationReferences.js";
const validId = id => typeof id === "string" && /^[a-z][\w-]{0,119}$/i.test(id) && !["constructor", "prototype", "__proto__"].includes(id);
const copy = value => JSON.parse(JSON.stringify(value));

// Private user document already has owner-only access. mergeFields updates one
// spell's appearance without overwriting profile data or another spell setup.
export function createSpellAnimationPresentation({ db, doc, getDoc, setDoc, serverTimestamp, getUserId, library, bindings }) {
  let owner = null, generation = 0, loaded = false, loading = null;
  const records = new Map(), tracked = new Map(), listeners = new Set();
  const emit = () => listeners.forEach(fn => { try { fn(); } catch { /* presentation observers cannot control persistence */ } });
  function clear() {
    for (const id of records.keys()) bindings.setAnimation("spell:" + id, null);
    for (const untrack of tracked.values()) untrack();
    tracked.clear(); records.clear(); loaded = false; loading = null; generation++; emit();
  }
  function context() {
    const next = getUserId?.() || null;
    if (next !== owner) { owner = next; clear(); }
    return owner;
  }
  function put(id, animations) {
    const record = { spellId: id, animations: normalizeSpellAnimations(animations, { strict: true }) };
    records.set(id, record);
    bindings.setAnimation("spell:" + id, Object.keys(record.animations).length ? { animations: record.animations } : null, { allowUnavailable: true, trackReference: false });
    tracked.get(id)?.();
    const recordOwner = owner;
    tracked.set(id, library.trackReferences("presentation:" + id, { name: id + " · saved account presentation", get: () => owner === recordOwner ? records.get(id) : null,
      replace(oldId, newId) { const current = records.get(id); if (!current || owner !== recordOwner) return; replaceAnimationReferences(current, oldId, newId); current.pendingSave = true; bindings.setAnimation("spell:" + id, Object.keys(current.animations).length ? { animations: current.animations } : null, { allowUnavailable: true, trackReference: false }); emit(); } }));
    return record;
  }
  async function load({ force = false } = {}) {
    const uid = context(), current = generation;
    if (!uid) return { ok: false, message: "Sign in to save spell presentation overrides." };
    if (loaded && !force) return { ok: true };
    if (loading) return loading;
    const request = (async () => {
      try {
        const snapshot = await getDoc(doc(db, "users", uid));
        if (context() !== uid || generation !== current) return { ok: false, message: "Account changed while loading spell appearance." };
        const saved = snapshot.data()?.spellAnimationOverrides || {};
        for (const id of records.keys()) bindings.setAnimation("spell:" + id, null);
        for (const untrack of tracked.values()) untrack();
        tracked.clear(); records.clear();
        for (const [id, record] of Object.entries(saved)) if (validId(id) && record?.spellId === id && (!record.ownerId || record.ownerId === uid)) {
          try { put(id, record.animations); } catch { /* invalid old presentation must not break the spell catalog */ }
        }
        loaded = true; emit(); return { ok: true };
      } catch (error) { return { ok: false, message: "Saved spell appearance could not be loaded: " + error.message }; }
      finally { if (generation === current) loading = null; }
    })();
    loading = request; return request;
  }
  async function save(spellId, animations) {
    if (!validId(spellId)) throw new Error("Choose a valid built-in spell.");
    const uid = context(), current = generation;
    if (!uid) throw new Error("Sign in to save spell presentation overrides.");
    const ready = await load(); if (!ready.ok) throw new Error(ready.message);
    const normalized = normalizeSpellAnimations(animations, { strict: true });
    for (const id of getSpellAnimationDependencies({ animations: normalized })) if (!library.getAnimation(id)) throw new Error("The selected animation is unavailable for this account.");
    const proposed = Object.fromEntries([...records].map(([id, record]) => [id, record])); proposed[spellId] = { spellId, animations: normalized };
    if (new TextEncoder().encode(JSON.stringify(proposed)).byteLength > 384 * 1024) throw new Error("Saved spell appearance is full. Clear an unused setup first.");
    if (context() !== uid || generation !== current) throw new Error("Account changed before saving spell appearance.");
    const record = { spellId, animations: copy(normalized), ownerId: uid, updatedAt: serverTimestamp() };
    await setDoc(doc(db, "users", uid), { spellAnimationOverrides: { [spellId]: record } }, { mergeFields: ["spellAnimationOverrides." + spellId] });
    if (context() !== uid || generation !== current) throw new Error("Account changed while saving. Reopen your spell appearance.");
    put(spellId, normalized); emit(); return copy(record);
  }
  return { load, save, setContext: () => { context(); return load(); }, get(spellId) { context(); return records.has(spellId) ? copy(records.get(spellId)) : null; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }, destroy() { clear(); listeners.clear(); } };
}
