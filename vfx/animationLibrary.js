// Serializable appearance data only. Rules, damage and targeting never belong here.
export const ANIMATION_CATEGORIES = Object.freeze([
  "Magic", "Fire", "Cold", "Lightning", "Healing", "Buff", "Debuff", "Sword", "Axe",
  "Spear", "Bow", "Projectile", "Impact", "Monster", "Environment", "Other"
]);
export const MAX_ANIMATION_FRAMES = 240;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const freeze = value => {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const text = (value, limit = 120) => String(value ?? "").trim().slice(0, limit);
function numeric(value, fallback, min, max, label, integer = false) {
  const n = value === undefined ? fallback : Number(value);
  if (value === null || value === "" || !Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) {
    throw new Error(`${label} must be ${integer ? "a whole number" : "a number"} between ${min} and ${max}.`);
  }
  return n;
}
export function normalizeAnimation(input = {}) {
  const id = text(input.id);
  if (!/^[a-z][\w.-]{0,119}$/i.test(id)) throw new Error("Choose a valid animation ID.");
  const name = text(input.name);
  if (!name) throw new Error("Give the animation a name.");
  const sprite = String(input.sprite ?? "").trim();
  if (!sprite) throw new Error("Choose a sprite sheet first.");
  if (sprite.length > MAX_UPLOAD_BYTES * 1.4) throw new Error("The sprite sheet is too large (8 MB maximum).");
  if (/^data:/i.test(sprite)) {
    if (!/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(sprite)) throw new Error("Use a PNG, JPEG or WebP sprite sheet.");
  } else if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(sprite) && !/^https?:\/\//i.test(sprite)) {
    throw new Error("Use a local asset path or an HTTP(S) image URL.");
  }
  const columns = numeric(input.grid?.columns, 1, 1, 240, "Columns", true);
  const rows = numeric(input.grid?.rows, 1, 1, 240, "Rows", true);
  const frameCount = numeric(input.frameCount, columns * rows, 1, Math.min(columns * rows, MAX_ANIMATION_FRAMES), "Frame count", true);
  const playback = input.playback ?? (input.loop === true ? "loop" : "once");
  if (!["once", "loop"].includes(playback)) throw new Error("Choose Once or Loop playback.");
  let atlas = null;
  if (input.atlas) {
    const a = input.atlas;
    const width = numeric(a.width, undefined, 1, 16384, "Atlas width");
    const height = numeric(a.height, undefined, 1, 16384, "Atlas height");
    for (const [axis, count, extent] of [["columns", columns, width], ["rows", rows, height]]) {
      if (!Array.isArray(a[axis]) || a[axis].length !== count + 1 || !a[axis].every((n, i) =>
        Number.isFinite(n) && n >= 0 && n <= extent && (!i || n - a[axis][i - 1] >= 4))) {
        throw new Error("The measured sprite cells do not match this grid.");
      }
    }
    atlas = { width, height, columns: [...a.columns], rows: [...a.rows] };
  }
  const ownership = input.ownership || { kind: "user", scope: "session", ownerId: null };
  if (!["builtin", "user"].includes(ownership.kind) || !["global", "session", "user", "room"].includes(ownership.scope)) {
    throw new Error("Invalid animation ownership.");
  }
  return freeze({ version: 1, id, name, category: text(input.category || "Other", 48),
    tags: [...new Set((Array.isArray(input.tags) ? input.tags : []).map(t => text(t, 48)).filter(Boolean))].slice(0, 24),
    sprite, grid: { columns, rows }, frameCount,
    fps: numeric(input.fps, 24, 1, 60, "FPS"),
    scale: numeric(input.scale, 1, .1, 8, "Scale"),
    size: numeric(input.size, 160, 8, 1024, "Display size"),
    rotation: numeric(input.rotation, 0, -3600, 3600, "Rotation"),
    offsetX: numeric(input.offsetX, 0, -10000, 10000, "Horizontal offset"),
    offsetY: numeric(input.offsetY, 0, -10000, 10000, "Vertical offset"),
    anchorX: numeric(input.anchorX, .5, 0, 1, "Horizontal pivot"),
    anchorY: numeric(input.anchorY, .5, 0, 1, "Vertical pivot"),
    flipX: input.flipX === true, flipY: input.flipY === true,
    playback, loop: playback === "loop", sound: input.sound == null ? null : { src: text(input.sound.src, 1024) },
    inset: numeric(input.inset ?? input.atlas?.inset, 0, 0, 64, "Cell inset", true), atlas,
    blendMode: ["normal", "screen", "plus-lighter"].includes(input.blendMode) ? input.blendMode : "normal",
    ownership: { kind: ownership.kind, scope: ownership.scope, ownerId: ownership.ownerId == null ? null : text(ownership.ownerId) }
  });
}

export function createAnimationLibrary({ builtins = [], idFactory = () => `custom_${globalThis.crypto.randomUUID()}` } = {}) {
  const entries = new Map(), originals = new Map(), listeners = new Set();
  const emit = () => { for (const fn of listeners) { try { fn(); } catch { /* UI observers cannot change data. */ } } };
  function put(animation) {
    if (!entries.has(animation.id) && entries.size >= 5000) throw new Error("This library is full (5,000 definitions).");
    // Bound embedded uploads without counting shared sheets repeatedly.
    const sheets = new Set([...entries.values()].filter(a => a.id !== animation.id).map(a => a.sprite));
    sheets.add(animation.sprite);
    if ([...sheets].reduce((sum, src) => sum + (src.startsWith("data:") ? src.length : 0), 0) > 48 * 1024 * 1024) {
      throw new Error("This session's uploaded sheets are full. Remove an unused custom animation first.");
    }
    entries.set(animation.id, animation); emit(); return animation;
  }
  for (const definition of builtins) {
    const a = normalizeAnimation({ ...definition, ownership: { kind: "builtin", scope: "global", ownerId: null } });
    if (entries.has(a.id)) throw new Error(`Duplicate built-in animation ID: ${a.id}`);
    entries.set(a.id, a); originals.set(a.id, a);
  }
  function getAnimation(id) { return entries.get(id) || null; }
  function requireAnimation(id) {
    const a = getAnimation(id); if (!a) throw new Error("That animation is no longer available."); return a;
  }
  function registerAnimation(input) {
    const a = normalizeAnimation({ ...input, id: input?.id || idFactory(),
      ownership: { kind: "user", scope: input?.ownership?.scope || "session", ownerId: input?.ownership?.ownerId ?? null } });
    if (entries.has(a.id)) throw new Error("That animation ID already exists. Update or duplicate it instead.");
    return put(a);
  }
  function updateAnimation(id, changes) {
    const old = requireAnimation(id);
    const resetCrop = (changes.sprite !== undefined && changes.sprite !== old.sprite) ||
      (changes.grid && (changes.grid.columns !== undefined && changes.grid.columns !== old.grid.columns ||
        changes.grid.rows !== undefined && changes.grid.rows !== old.grid.rows));
    const playback = changes.playback ?? (changes.loop === undefined ? old.playback : changes.loop ? "loop" : "once");
    return put(normalizeAnimation({ ...old, ...(resetCrop ? { atlas: null, inset: 0 } : {}), ...changes,
      grid: { ...old.grid, ...changes.grid }, playback, id: old.id, ownership: old.ownership }));
  }
  function duplicateAnimation(id) {
    const a = requireAnimation(id);
    return registerAnimation({ ...a, id: idFactory(), name: `${a.name} copy`, ownership: { scope: "session" } });
  }
  function deleteAnimation(id) {
    if (requireAnimation(id).ownership.kind === "builtin") throw new Error("Built-in animations cannot be deleted. Duplicate one to customize it.");
    entries.delete(id); emit(); return true;
  }
  function resetAnimation(id) {
    if (!originals.has(id)) throw new Error("Only built-in animations have original settings.");
    return put(originals.get(id));
  }
  return Object.freeze({ getAnimation, registerAnimation, updateAnimation, duplicateAnimation, deleteAnimation, resetAnimation,
    list: () => [...entries.values()], getAnimationsByCategory: category => [...entries.values()].filter(a => a.category.toLowerCase() === category.toLowerCase()),
    searchAnimations: query => {
      const words = text(query).toLowerCase().split(/\s+/).filter(Boolean);
      return [...entries.values()].filter(a => words.every(w => `${a.name} ${a.category} ${a.tags.join(" ")} ${a.id}`.toLowerCase().includes(w)));
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
    const stages = ref.animations ? { ...ref.animations } : null;
    if (stages && Object.entries(stages).some(([stage, id]) =>
      !["cast", "travel", "impact", "sustain", "end"].includes(stage) || typeof id !== "string" || !id)) {
      throw new Error("Choose valid Animation IDs for cast, travel, impact, sustain or end.");
    }
    if (!ref.animationId && (!stages || !Object.keys(stages).length)) throw new Error("Choose an animation first.");
    for (const id of [ref.animationId, ...Object.values(stages || {})].filter(Boolean)) {
      if (!library.getAnimation(id)) throw new Error("The assigned animation is unavailable.");
    }
    const value = freeze({ ...(ref.animationId ? { animationId: ref.animationId } : {}), ...(stages ? { animations: stages } : {}) });
    assignments.set(key, value); return value;
  }
  return Object.freeze({ setAnimation, getAssignment: key => assignments.get(key) || null,
    exportAssignments: () => Object.fromEntries(assignments) });
}
