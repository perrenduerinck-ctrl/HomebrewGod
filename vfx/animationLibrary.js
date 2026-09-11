import { normalizeAnimation, mergeAnimationDefinition, freezeAnimation as freeze, animationText as text } from "./animationDefinition.js";
import { normalizeSpellAnimations, getSpellAnimationDependencies, replaceAnimationReferences } from "./animationReferences.js";
export { normalizeAnimation, normalizeAnimationDefinition, mergeAnimationDefinition, ANIMATION_TYPES, ANIMATION_TAGS, ANIMATION_CATEGORIES, MAX_ANIMATION_FRAMES, MAX_UPLOAD_BYTES } from "./animationDefinition.js";

export function createAnimationLibrary({ builtins = [], idFactory = () => `custom_${globalThis.crypto.randomUUID()}` } = {}) {
  const entries = new Map(), originals = new Map(), listeners = new Set(), usage = new Map();
  const references = new Map(); let ownerId = null, roomId = null;
  const visible = a => a && (a.ownership.scope !== "room" || roomId && a.ownership.ownerId === roomId) && (a.ownership.scope !== "user" || !a.ownership.ownerId || a.ownership.ownerId === ownerId);
  let order = 0;
  const stats = id => usage.get(id) || { favorite: false, used: 0, recent: 0, created: 0 };
  const emit = () => { for (const fn of listeners) { try { fn(); } catch { /* UI observers cannot change data. */ } } };
  function put(animation) {
    if (!entries.has(animation.id) && entries.size >= 5000) throw new Error("This library is full (5,000 definitions).");
    // Bound embedded uploads without counting shared sheets repeatedly.
    const sheets = new Set([...entries.values()].filter(a => a.id !== animation.id).flatMap(a => [a.sprite, a.sound?.src || ""]));
    sheets.add(animation.sprite); sheets.add(animation.sound?.src || "");
    if ([...sheets].reduce((sum, src) => sum + (src.startsWith("data:") ? src.length : 0), 0) > 48 * 1024 * 1024) {
      throw new Error("This session's uploaded sheets are full. Remove an unused custom animation first.");
    }
    if (!usage.has(animation.id)) usage.set(animation.id, { ...stats(animation.id), created: ++order });
    entries.set(animation.id, animation); emit(); return animation;
  }
  for (const definition of builtins) {
    const a = normalizeAnimation({ ...definition, ownership: { kind: "builtin", scope: "global", ownerId: null } });
    if (entries.has(a.id)) throw new Error(`Duplicate built-in animation ID: ${a.id}`);
    entries.set(a.id, a); originals.set(a.id, a); usage.set(a.id, { ...stats(a.id), created: ++order });
  }
  function getAnimation(id) { const a = entries.get(id); return visible(a) ? a : null; }
  function requireAnimation(id) {
    const a = getAnimation(id); if (!a) throw new Error("That animation is no longer available."); return a;
  }
  function registerAnimation(input) {
    const scope = input?.ownership?.scope || "session";
    if (scope === "room" && (!roomId || input.ownership.ownerId && input.ownership.ownerId !== roomId)) throw new Error("Select the owning room before adding a room animation.");
    const a = normalizeAnimation({ ...input, id: input?.id || idFactory(),
      ownership: { kind: "user", scope, ownerId: scope === "room" ? roomId : input?.ownership?.ownerId ?? ownerId } });
    if (entries.has(a.id)) throw new Error("That animation ID already exists. Update or duplicate it instead.");
    return put(a);
  }
  function updateAnimation(id, changes) {
    const old = requireAnimation(id);
    return put(mergeAnimationDefinition(old, { ...changes, id: old.id, ownership: old.ownership, revision: old.revision + 1 }));
  }
  function duplicateAnimation(id) {
    const a = requireAnimation(id);
    return registerAnimation({ ...a, id: idFactory(), name: `${a.name} copy`, ownership: { scope: "session" } });
  }
  function getAnimationUsage(id) { return [...references].filter(([, ref]) => getSpellAnimationDependencies(ref.get()).includes(id)).map(([key, ref]) => ({ key, name: ref.name || key })); }
  function deleteAnimation(id, { replaceWith, removeReferences = false } = {}) {
    if (requireAnimation(id).ownership.kind === "builtin") throw new Error("Built-in animations cannot be deleted. Duplicate one to customize it.");
    const used = getAnimationUsage(id);
    if (used.length && !replaceWith && !removeReferences) throw new Error(`This animation is used by ${used.length} abilities. Replace or remove its references first.`);
    if (replaceWith) { requireAnimation(replaceWith); if (replaceWith === id) throw new Error("Choose a different replacement animation."); }
    for (const { key } of used) references.get(key).replace(id, replaceWith || null);
    entries.delete(id); usage.delete(id); emit(); return true;
  }
  function resetAnimation(id) {
    if (!originals.has(id)) throw new Error("Only built-in animations have original settings.");
    return put(originals.get(id));
  }
  return Object.freeze({ getAnimation, registerAnimation, updateAnimation, duplicateAnimation, deleteAnimation, resetAnimation,
    getAnimationUsage,
    trackReferences(key, reference) { references.set(key, reference); return () => references.delete(key); },
    setContext(context = {}) { ownerId = context.ownerId || null; roomId = context.roomId || null; emit(); },
    getContext: () => ({ ownerId, roomId }),
    getCollections: () => [...new Set([...entries.values()].filter(visible).flatMap(a => a.collections))].sort(),
    getUsage: id => Object.freeze({ ...stats(id) }),
    toggleFavorite(id) { requireAnimation(id); const next = { ...stats(id), favorite: !stats(id).favorite }; usage.set(id, next); emit(); return next.favorite; },
    markUsed(id) { if (!entries.has(id)) return; usage.set(id, { ...stats(id), used: stats(id).used + 1, recent: ++order }); emit(); },
    query({ search = "", type = "", tags = "", origin = "", collection = "", favorites = false, recent = false, sort = "name" } = {}) {
      const words = `${search} ${tags}`.toLowerCase().split(/[\s,]+/).filter(Boolean);
      return [...entries.values()].filter(a => visible(a) && (!collection || a.collections.includes(collection)) && (!type || a.type === type) && (!origin || (origin === "room" ? a.ownership.scope === "room" : origin === "user" ? a.ownership.kind === "user" && a.ownership.scope !== "room" : a.ownership.kind === origin)) &&
        (!favorites || stats(a.id).favorite) && (!recent || stats(a.id).recent > 0) && words.every(w => `${a.name} ${a.description} ${a.type} ${a.tags.join(" ")} ${a.id}`.toLowerCase().includes(w)))
        .sort((a, b) => (sort === "newest" ? stats(b.id).created - stats(a.id).created : sort === "used" ? stats(b.id).used - stats(a.id).used : recent ? stats(b.id).recent - stats(a.id).recent : 0) || a.name.localeCompare(b.name));
    },
    list: () => [...entries.values()].filter(visible), getAnimationsByCategory: category => [...entries.values()].filter(a => visible(a) && a.category.toLowerCase() === category.toLowerCase()),
    searchAnimations: query => {
      const words = text(query).toLowerCase().split(/\s+/).filter(Boolean);
      return [...entries.values()].filter(a => visible(a) && words.every(w => `${a.name} ${a.description} ${a.type} ${a.category} ${a.tags.join(" ")} ${a.id}`.toLowerCase().includes(w)));
    },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    exportAnimation: id => ({ version: 1, type: "homebrewgod-animation", animation: JSON.parse(JSON.stringify(requireAnimation(id))) }),
    importAnimation(envelope) {
      if (envelope?.version !== 1 || envelope?.type !== "homebrewgod-animation") throw new Error("Unsupported animation export.");
      return registerAnimation({ ...envelope.animation, id: idFactory(), ownership: { scope: "session" } });
    }
  });
}

// Separate presentation assignments. Export this map alongside user definitions
// when persistence is attached; do not merge it into combat rules or spell stats.
export function createAnimationBindings({ library } = {}) {
  const assignments = new Map();
  function setAnimation(key, reference) {
    if (typeof key !== "string" || !key.trim() || key.length > 200) throw new Error("Choose an action to assign.");
    if (reference == null || reference === "") { assignments.delete(key); return null; }
    const ref = typeof reference === "string" ? { animationId: reference } : reference;
    const stages = ref.animations ? normalizeSpellAnimations(ref.animations, { strict: true }) : null;
    if (!ref.animationId && (!stages || !Object.keys(stages).length)) throw new Error("Choose an animation first.");
    for (const id of getSpellAnimationDependencies({ animationId: ref.animationId, animations: stages })) {
      if (!library.getAnimation(id)) throw new Error("The assigned animation is unavailable.");
    }
    const value = freeze({ ...(ref.animationId ? { animationId: ref.animationId } : {}), ...(stages ? { animations: stages } : {}) });
    assignments.set(key, value);
    library.trackReferences(`binding:${key}`, { name: key, get: () => assignments.get(key), replace(oldId, newId) { const copy = JSON.parse(JSON.stringify(assignments.get(key) || {})); replaceAnimationReferences(copy, oldId, newId); assignments.set(key, freeze(copy)); } });
    return value;
  }
  return Object.freeze({ setAnimation, getAssignment: key => assignments.get(key) || null,
    exportAssignments: () => Object.fromEntries(assignments) });
}
