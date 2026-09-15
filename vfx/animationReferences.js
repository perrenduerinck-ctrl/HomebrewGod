export const ANIMATION_SLOTS = Object.freeze(["cast", "travel", "impact", "sustain", "end"]);
const id = value => typeof value === "string" && /^[a-z][\w.-]{0,119}$/i.test(value) ? value : null;
const clone = value => JSON.parse(JSON.stringify(value));
const overrideKeys = ["fps", "scale", "rotation", "offsetX", "offsetY", "anchorX", "anchorY", "flipX", "flipY", "tint", "speedMultiplier", "scaleMultiplier", "opacityMultiplier", "rotationOffset", "projectileSpeedMultiplier", "appearance", "timing", "transform", "direction", "placement", "projectile", "beam", "behavior", "area"];
export function normalizeSpellAnimationReference(value) {
  if (value == null || value === "") return null;
  const raw = typeof value === "string" ? { animationId: value } : value;
  if (!id(raw.animationId)) throw new Error("Choose a valid Animation ID.");
  const overrides = {};
  for (const key of overrideKeys) if (raw.overrides?.[key] !== undefined) overrides[key] = clone(raw.overrides[key]);
  if (JSON.stringify(overrides).length > 12000 || /data:/.test(JSON.stringify(overrides))) throw new Error("Spell overrides cannot contain uploaded assets.");
  const trigger = raw.trigger || "afterPrevious";
  if (!["immediate", "afterPrevious", "onArrival", "onImpact", "durationStart", "durationEnd"].includes(trigger)) throw new Error("Choose a valid stage trigger.");
  const delay = Number(raw.delay || 0);
  if (!Number.isFinite(delay) || delay < 0 || delay > 10000) throw new Error("Stage delay must be between 0 and 10000 milliseconds.");
  return { animationId: raw.animationId, overrides, trigger, delay, waitForCompletion: raw.waitForCompletion !== false };
}
export function normalizeSpellAnimations(value, { strict = false } = {}) {
  const slots = {};
  for (const slot of ANIMATION_SLOTS) {
    try { const ref = normalizeSpellAnimationReference(value?.[slot]); if (ref) slots[slot] = typeof value[slot] === "string" ? ref.animationId : ref; }
    catch (error) { if (strict) throw error; }
  }
  return slots;
}
export function getSpellAnimationDependencies(spell) {
  const variants = Array.isArray(spell?.animationSelection?.ids) ? spell.animationSelection.ids : [];
  const attackStages = Object.values(spell?.animation?.stages || {}).map(ref => id(typeof ref === "string" ? ref : ref?.animationId));
  const directStages = Object.values(spell?.stages || {}).map(ref => id(typeof ref === "string" ? ref : ref?.animationId));
  const layerStages = (Array.isArray(spell?.layers) ? spell.layers : []).flatMap(layer => (
    Object.values(layer?.stages || layer?.animations || {}).map(ref => id(typeof ref === "string" ? ref : ref?.animationId))
  ));
  return [...new Set([id(spell?.animationId), ...attackStages, ...directStages, ...layerStages, ...variants.map(id), ...Object.values(normalizeSpellAnimations(spell?.animations)).map(ref => typeof ref === "string" ? ref : ref.animationId)].filter(Boolean))];
}
export function replaceAnimationReferences(spell, oldId, newId) {
  if (newId != null && !id(newId)) throw new Error("Choose a valid replacement Animation ID.");
  if (spell.animationId === oldId) { if (newId) spell.animationId = newId; else delete spell.animationId; }
  if (Array.isArray(spell.animationSelection?.ids)) spell.animationSelection.ids = [...new Set(spell.animationSelection.ids.flatMap(value => value === oldId ? newId ? [newId] : [] : [value]))];
  for (const [slot, ref] of Object.entries(spell.animations || {})) {
    if ((typeof ref === "string" ? ref : ref?.animationId) !== oldId) continue;
    if (!newId) delete spell.animations[slot];
    else spell.animations[slot] = typeof ref === "string" ? newId : { ...ref, animationId: newId };
  }
  for (const [slot, ref] of Object.entries(spell.animation?.stages || {})) {
    if ((typeof ref === "string" ? ref : ref?.animationId) !== oldId) continue;
    if (!newId) delete spell.animation.stages[slot];
    else spell.animation.stages[slot] = typeof ref === "string" ? newId : { ...ref, animationId: newId };
  }
  for (const [slot, ref] of Object.entries(spell.stages || {})) {
    if ((typeof ref === "string" ? ref : ref?.animationId) !== oldId) continue;
    if (!newId) delete spell.stages[slot];
    else spell.stages[slot] = typeof ref === "string" ? newId : { ...ref, animationId: newId };
  }
  for (const layer of Array.isArray(spell.layers) ? spell.layers : []) {
    replaceAnimationReferences(layer, oldId, newId);
  }
}

// Saving content must not turn a preview/session copy into a dangling durable
// reference. Missing legacy refs remain editable and use the existing fallback.
export function assertPersistentAnimationReferences(content, { library, allowMissing = true, allowRoom = false } = {}) {
  if (!library?.getContext().ownerId) return;
  const pending = [content], visited = new WeakSet(), ids = new Set();
  while (pending.length) {
    const value = pending.pop();
    if (!value || typeof value !== "object" || visited.has(value)) continue;
    visited.add(value);
    for (const animationId of getSpellAnimationDependencies(value)) ids.add(animationId);
    for (const child of Object.values(value)) if (child && typeof child === "object") pending.push(child);
  }
  const reject = message => { throw Object.assign(new Error(message), { code: "animation/unsaved-reference" }); };
  for (const animationId of ids) {
    const definition = library.getAnimation(animationId);
    if (!definition) { if (!allowMissing) throw new Error("The selected animation is unavailable for this account."); continue; }
    if (definition.ownership.scope === "session") reject(`${definition.name} is temporary. Open Edit settings and Save Animation to your personal library before saving this setup.`);
    if (definition.ownership.scope === "room" && !allowRoom) reject("Account spell appearance needs an animation saved in your personal library, not a room-only animation.");
  }
}

// Optional host-controlled variants. Cycle position belongs to the action,
// not the reusable immutable appearance definition.
export function normalizeAnimationSelection(value) {
  if (!value) return null;
  if (!["specific", "random", "cycle"].includes(value.mode)) throw new Error("Choose specific, random or cycle animation selection.");
  if (!Array.isArray(value.ids) || !value.ids.length || value.ids.length > 32 || value.ids.some(value => !id(value))) throw new Error("Choose between 1 and 32 valid Animation IDs.");
  return { mode: value.mode, ids: [...new Set(value.ids)] };
}
export function chooseAnimationSelection(value, { index = 0, random = Math.random } = {}) {
  const selection = normalizeAnimationSelection(value); if (!selection) return null;
  const position = selection.mode === "random" ? Math.floor(Math.max(0, Math.min(.999999, Number(random()) || 0)) * selection.ids.length) : selection.mode === "cycle" ? Math.max(0, Math.floor(Number(index) || 0)) % selection.ids.length : 0;
  return selection.ids[position];
}
