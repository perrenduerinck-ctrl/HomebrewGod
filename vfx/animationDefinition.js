// Appearance metadata only. Types, tags and events never resolve game rules.
export const ANIMATION_TYPES = Object.freeze([
  "Spell Effect", "Melee Attack", "Projectile", "Impact", "Explosion", "Beam", "Aura",
  "Persistent Effect", "Buff", "Debuff", "Healing", "Summoning", "Transformation", "Movement",
  "Environment", "Trap", "Monster Attack", "Weapon Attack", "UI / Marker", "Other"
]);
export const ANIMATION_TAGS = Object.freeze(("fire cold acid lightning poison necrotic radiant psychic force thunder healing magic holy shadow blood water wind earth ice sword spear axe hammer dagger bow arrow crossbow claw bite tail melee ranged projectile explosion impact slash stab swing thrust beam cone circle aura ground overhead buff debuff status monster environment").split(" "));
export const ANIMATION_CATEGORIES = Object.freeze(["Magic", "Fire", "Cold", "Lightning", "Healing", "Buff", "Debuff", "Sword", "Axe", "Spear", "Bow", "Projectile", "Impact", "Monster", "Environment", "Other"]);
export const MAX_ANIMATION_FRAMES = 240;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const freezeAnimation = value => {
  if (value && typeof value === "object") { Object.values(value).forEach(freezeAnimation); Object.freeze(value); }
  return value;
};
export const animationText = (value, limit = 120) => String(value ?? "").trim().slice(0, limit);
const num = (value, fallback, min, max, label, integer = false) => {
  const n = value === undefined ? fallback : Number(value);
  if (value === null || value === "" || !Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n)))
    throw new Error(`${label} must be ${integer ? "a whole number" : "a number"} between ${min} and ${max}.`);
  return n;
};
const choice = (value, fallback, choices, label) => {
  const result = value ?? fallback;
  if (!choices.includes(result)) throw new Error(`Choose a valid ${label}.`);
  return result;
};
export function normalizeTags(value) {
  return [...new Set((Array.isArray(value) ? value : String(value || "").split(","))
    .map(t => animationText(t, 48).toLowerCase()).filter(Boolean))].slice(0, 32);
}
function asset(value, kind = "image") {
  const src = String(value ?? "").trim();
  if (!src) throw new Error(kind === "image" ? "Choose a sprite sheet first." : "Choose a sound file.");
  if (src.length > MAX_UPLOAD_BYTES * 1.4) throw new Error("The uploaded file is too large (8 MB maximum).");
  if (/^data:/i.test(src)) {
    const valid = kind === "image" ? /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i : /^data:audio\/(mpeg|mp3|wav|x-wav|ogg|webm|mp4);base64,[a-z0-9+/=]+$/i;
    if (!valid.test(src)) throw new Error(kind === "image" ? "Use a PNG, JPEG or WebP sprite sheet." : "Use an MP3, WAV, OGG or WebM sound.");
  } else if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(src) && !/^https?:\/\//i.test(src)) throw new Error("Use a local asset path or an HTTP(S) URL.");
  return src;
}
const legacyType = category => ({ Sword: "Weapon Attack", Axe: "Weapon Attack", Spear: "Weapon Attack", Bow: "Projectile", Monster: "Monster Attack", Magic: "Spell Effect", Fire: "Spell Effect", Cold: "Spell Effect", Lightning: "Spell Effect" }[category] || (ANIMATION_TYPES.includes(category) ? category : "Other"));

export function normalizeAnimationDefinition(input = {}) {
  const id = animationText(input.id), name = animationText(input.name);
  if (!/^[a-z][\w.-]{0,119}$/i.test(id)) throw new Error("Choose a valid animation ID.");
  if (!name) throw new Error("Give the animation a name.");
  const sprite = asset(input.sprite), columns = num(input.grid?.columns, 1, 1, 240, "Columns", true), rows = num(input.grid?.rows, 1, 1, 240, "Rows", true);
  const f = input.frames || {}, p = typeof input.playback === "object" ? input.playback : input.timing || {}, t = input.transform || {};
  const start = num(f.start, 0, 0, columns * rows - 1, "Starting frame", true);
  const count = num(input.frameCount ?? f.count, f.end === undefined ? Math.min(columns * rows - start, MAX_ANIMATION_FRAMES) : Number(f.end) - start + 1, 1, Math.min(columns * rows - start, MAX_ANIMATION_FRAMES), "Frame count", true);
  const end = num(f.end, start + count - 1, start, columns * rows - 1, "Ending frame", true);
  if (end - start + 1 !== count) throw new Error("Starting frame, ending frame and frames to play must describe the same range.");
  const mode = typeof input.playback === "string" ? input.playback : p.mode ?? (input.loop ? "loop" : "once");
  if (!["once", "loop", "pingpong", "hold"].includes(mode)) throw new Error("Choose Once or Loop, Ping Pong or Hold Last Frame playback.");
  const loopCount = p.loopCount === "infinite" || p.loopCount === 0 ? 0 : num(p.loopCount, mode === "loop" ? 0 : 1, 0, 100, "Loop count", true);
  const timing = { fps: num(input.fps ?? p.fps, 24, 1, 60, "FPS"), mode, speed: num(p.speed, 1, .05, 8, "Playback speed"), loopCount,
    startDelay: num(p.startDelay, 0, 0, 10, "Start delay"), endDelay: num(p.endDelay, 0, 0, 10, "End delay") };
  const transform = { scale: num(input.scale ?? t.scale, 1, .1, 8, "Scale"), lockProportions: t.lockProportions !== false,
    scaleX: num(t.scaleX, 1, .1, 8, "Width scale"), scaleY: num(t.scaleY, 1, .1, 8, "Height scale"),
    rotation: num(input.rotation ?? t.rotation, 0, -3600, 3600, "Rotation"),
    offsetX: num(input.offsetX ?? t.offsetX, 0, -10000, 10000, "Horizontal offset"), offsetY: num(input.offsetY ?? t.offsetY, 0, -10000, 10000, "Vertical offset"),
    anchorX: num(input.anchorX ?? t.anchorX, .5, 0, 1, "Horizontal pivot"), anchorY: num(input.anchorY ?? t.anchorY, .5, 0, 1, "Vertical pivot"),
    flipX: (input.flipX ?? t.flipX) === true, flipY: (input.flipY ?? t.flipY) === true };
  const a = input.appearance || {}, direction = input.direction || {}, placement = input.placement || {}, projectile = input.projectile || {}, beam = input.beam || {}, variation = input.variation || {}, motion = input.motionEffects || {};
  const tint = a.tint == null || a.tint === "" ? null : String(a.tint);
  if (tint && !/^#[0-9a-f]{6}$/i.test(tint)) throw new Error("Choose a valid tint color.");
  const appearance = { opacity: num(a.opacity, 1, 0, 1, "Opacity"), tint, tintStrength: num(a.tintStrength, .5, 0, 1, "Tint strength"),
    brightness: num(a.brightness, 1, 0, 4, "Brightness"), contrast: num(a.contrast, 1, 0, 4, "Contrast"), saturation: num(a.saturation, 1, 0, 4, "Saturation"), hue: num(a.hue, 0, -360, 360, "Hue rotation"),
    blendMode: choice(input.blendMode ?? a.blendMode, "normal", ["normal", "screen", "plus-lighter", "multiply"], "blend mode"),
    fadeIn: num(a.fadeIn, 0, 0, 10, "Fade in"), fadeOut: num(a.fadeOut, 0, 0, 10, "Fade out") };
  let atlas = null;
  if (input.atlas) {
    const at = input.atlas, width = num(at.width, undefined, 1, 16384, "Atlas width"), height = num(at.height, undefined, 1, 16384, "Atlas height");
    for (const [axis, cells, extent] of [["columns", columns, width], ["rows", rows, height]]) {
      if (!Array.isArray(at[axis]) || at[axis].length !== cells + 1 || !at[axis].every((n, i) => Number.isFinite(n) && n >= 0 && n <= extent && (!i || n - at[axis][i - 1] >= 4))) throw new Error("The measured sprite cells do not match this grid.");
    }
    atlas = { width, height, columns: [...at.columns], rows: [...at.rows] };
  }
  const ownership = input.ownership || { kind: "user", scope: "session", ownerId: null };
  if (!["builtin", "user"].includes(ownership.kind) || !["global", "session", "user", "room"].includes(ownership.scope)) throw new Error("Invalid animation ownership.");
  const category = animationText(input.category || input.type || "Other", 48);
  const type = choice(input.type, legacyType(category), ANIMATION_TYPES, "animation type");
  const behavior = choice(input.behavior, projectile.enabled ? "projectile" : beam.enabled ? "beam" : "static", ["static", "projectile", "beam"], "animation behavior");
  const sound = input.sound?.src ? { src: asset(input.sound.src, "audio"), volume: num(input.sound.volume, .5, 0, 1, "Sound volume"), startFrame: num(input.sound.startFrame, start, 0, columns * rows - 1, "Sound start frame", true), playbackRate: num(input.sound.playbackRate, 1, .25, 4, "Sound playback rate") } : null;
  const reserved = (value, limit, label) => {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > limit || JSON.stringify(value).length > 16000) throw new Error(`Too many ${label}.`);
    return JSON.parse(JSON.stringify(value));
  };
  return freezeAnimation({ version: 2, id, name, description: animationText(input.description, 1000), type, category,
    tags: normalizeTags(input.tags), sprite, grid: { columns, rows }, frames: { start, end, count, reverse: f.reverse === true, sequence: reserved(f.sequence, 240, "custom frames") },
    // Flat aliases keep the first Animation ID API compatible. Nested input is also accepted.
    frameCount: count, fps: timing.fps, playback: mode, loop: ["loop", "pingpong"].includes(mode) && loopCount === 0, timing,
    ...transform, transform, size: num(input.size, 160, 8, 1024, "Display size"),
    direction: { mode: choice(direction.mode, "face-target", ["fixed", "face-target", "face-away", "token-facing"], "direction mode"), sourceDirection: choice(direction.sourceDirection, "right", ["up", "right", "down", "left"], "source direction") },
    placement: { spawnAt: choice(placement.spawnAt, "map", ["source", "target", "between", "map"], "spawn position"), followSource: placement.followSource === true, followTarget: placement.followTarget === true, persist: placement.persist === true, duration: num(placement.duration, 0, 0, 60, "Effect duration") },
    behavior,
    projectile: { enabled: behavior === "projectile", speed: num(projectile.speed, 300, 10, 5000, "Travel speed"), startOffset: num(projectile.startOffset, 0, 0, 1000, "Start offset"), endOffset: num(projectile.endOffset, 0, 0, 1000, "End offset"), arcHeight: num(projectile.arcHeight, 0, -1000, 1000, "Arc height") },
    beam: { enabled: behavior === "beam", stretchToTarget: beam.stretchToTarget !== false, thickness: num(beam.thickness, 24, 1, 512, "Beam thickness") },
    appearance, blendMode: appearance.blendMode,
    motionEffects: { spin: num(motion.spin, 0, -1440, 1440, "Spin speed"), pulseScale: num(motion.pulseScale, 0, 0, 1, "Scale pulse"), pulseOpacity: num(motion.pulseOpacity, 0, 0, 1, "Opacity pulse"), pulsePeriod: num(motion.pulsePeriod, 1, .1, 10, "Pulse period") },
    variation: { rotation: num(variation.rotation, 0, 0, 180, "Rotation variation"), scale: num(variation.scale, 0, 0, .9, "Scale variation"), offsetX: num(variation.offsetX, 0, 0, 1000, "Horizontal variation"), offsetY: num(variation.offsetY, 0, 0, 1000, "Vertical variation"), speed: num(variation.speed, 0, 0, .9, "Speed variation") },
    sound, layers: reserved(input.layers, 16, "layers"), events: reserved(input.events, 64, "events"),
    inset: num(input.inset ?? input.atlas?.inset, 0, 0, 64, "Cell inset", true), atlas,
    ownership: { kind: ownership.kind, scope: ownership.scope, ownerId: ownership.ownerId == null ? null : animationText(ownership.ownerId) }
  });
}
export const normalizeAnimation = normalizeAnimationDefinition;

// Merge nested edits without allowing old compatibility aliases to undo them.
export function mergeAnimationDefinition(original, changes = {}) {
  const result = { ...original, ...changes };
  if (changes.behavior === undefined) {
    if (changes.projectile?.enabled === true) result.behavior = "projectile";
    else if (changes.beam?.enabled === true) result.behavior = "beam";
    else if (changes.projectile?.enabled === false && original.behavior === "projectile" || changes.beam?.enabled === false && original.behavior === "beam") result.behavior = "static";
  }
  for (const key of ["grid", "frames", "timing", "transform", "direction", "placement", "projectile", "beam", "appearance", "variation", "motionEffects"]) result[key] = { ...original[key], ...changes[key] };
  if (typeof changes.playback === "object") { result.timing = { ...result.timing, ...changes.playback }; result.playback = result.timing.mode; }
  const aliases = { transform: ["scale", "rotation", "offsetX", "offsetY", "anchorX", "anchorY", "flipX", "flipY"], timing: ["fps"], appearance: ["blendMode"] };
  for (const [group, keys] of Object.entries(aliases)) for (const key of keys) {
    const nested = group === "timing" ? { ...changes.timing, ...(typeof changes.playback === "object" ? changes.playback : {}) } : changes[group];
    if (changes[key] !== undefined) result[group][key] = changes[key];
    else if (nested?.[key] !== undefined) result[key] = nested[key];
  }
  if (changes.loop !== undefined && changes.playback === undefined && changes.timing?.mode === undefined) { result.playback = changes.loop ? "loop" : "once"; result.timing.loopCount = changes.loop ? 0 : 1; }
  if (typeof changes.playback === "string") { result.timing.mode = changes.playback; if (changes.timing?.loopCount === undefined && original.playback !== changes.playback) result.timing.loopCount = changes.playback === "loop" ? 0 : 1; }
  if (changes.timing?.mode !== undefined) result.playback = changes.timing.mode;
  if (changes.frameCount !== undefined) result.frames.count = changes.frameCount;
  else if (changes.frames?.count !== undefined) result.frameCount = changes.frames.count;
  else if (changes.frames?.end !== undefined || changes.frames?.start !== undefined) result.frameCount = result.frames.end - result.frames.start + 1;
  if (changes.frames?.end === undefined && (changes.frameCount !== undefined || changes.frames?.count !== undefined)) result.frames.end = result.frames.start + Number(result.frameCount) - 1;
  const resetCrop = changes.sprite !== undefined && changes.sprite !== original.sprite || changes.grid && (result.grid.columns !== original.grid.columns || result.grid.rows !== original.grid.rows);
  if (resetCrop) { result.atlas = changes.atlas ?? null; result.inset = changes.inset ?? 0; }
  return normalizeAnimationDefinition(result);
}
