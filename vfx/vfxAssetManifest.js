import { EPIC_ATLAS_BOUNDS } from "./tierEffects.js?v=status-sprites-20260831";

export const VFX_CLIP_NAMES = Object.freeze([
  "charge",
  "release",
  "travel",
  "impact",
  "aftermath",
  "persistent"
]);

export const VFX_ASSET_CLASSES = Object.freeze({
  KEEP: "keep",
  UPGRADE_LATER: "upgrade-later",
  REPLACE: "replace",
  PREMIUM_6X6: "6x6-premium"
});

export const VFX_ASSET_STANDARDS = Object.freeze({
  major: Object.freeze({ columns: 6, rows: 6, frameCount: 36,
    framesPerSecond: Object.freeze([24, 30]) }),
  projectile: Object.freeze({ minimumFrames: 8, maximumFrames: 20, loop: true }),
  status: Object.freeze({ minimumFrames: 12, maximumFrames: 24, loop: true }),
  persistent: Object.freeze({ minimumFrames: 12, maximumFrames: 24, loop: true })
});

const deepFreeze = (value) => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
};

// The source 6x6 sheet is opaque RGB. This alpha-unmatted copy preserves its
// additive color while making black pixels truly transparent inside isolated
// depth-layer stacking contexts.
const FIREBALL_FIRE_IMPACT =
  "./assets/vfx/tiers7-9/fireball-impact-alpha-6x6.png";

export const VFX_ASSET_MANIFEST = deepFreeze({
  fireball: {
    classification: VFX_ASSET_CLASSES.PREMIUM_6X6,
    notes: "Clip migration showcase; motion remains code-driven.",
    clips: {
      charge: {
        src: "./assets/vfx/fire/fire-impact-spritesheet.png",
        frameCount: 16,
        columns: 4,
        rows: 4,
        frameWidth: 160,
        frameHeight: 160,
        framesPerSecond: 20,
        startFrame: 0,
        endFrame: 5,
        loop: false,
        loops: 1,
        events: [
          { id: "charge-glow", frame: 4, type: "marker",
            metadata: { action: "increase-glow" } }
        ]
      },
      release: {
        src: "./assets/vfx/fire/fire-impact-spritesheet.png",
        frameCount: 16,
        columns: 4,
        rows: 4,
        frameWidth: 160,
        frameHeight: 160,
        framesPerSecond: 30,
        startFrame: 4,
        endFrame: 7,
        loop: false,
        loops: 1,
        events: [
          { id: "launch-projectile", frame: 2, type: "marker",
            metadata: { action: "launch-projectile" } }
        ]
      },
      travel: {
        src: "./assets/vfx/tiers3-6/fire-cast-5x5.png",
        frameCount: 25,
        columns: 5,
        rows: 5,
        frameWidth: 160,
        frameHeight: 160,
        framesPerSecond: 24,
        startFrame: 0,
        endFrame: 8,
        loop: true,
        loops: 1
      },
      impact: {
        src: FIREBALL_FIRE_IMPACT,
        frameCount: 36,
        columns: 6,
        rows: 6,
        atlas: { width: 1254, height: 1254, ...EPIC_ATLAS_BOUNDS.fire },
        frameWidth: 160,
        frameHeight: 160,
        framesPerSecond: 30,
        startFrame: 9,
        endFrame: 35,
        loop: false,
        loops: 1,
        events: [
          { id: "impact-shake", frame: 2, type: "spawn", effect: {
            type: "fire-impact-flash", duration: 120, scale: 1.22,
            shake: { enabled: true, amplitude: 3, duration: 110 },
            metadata: { role: "fireball-frame-shake" }
          } },
          { id: "impact-shockwave", frame: 5, type: "spawn", effect: {
            type: "fire-shock-ring", duration: 420, scale: 1.45,
            layer: "ground", metadata: { role: "fireball-frame-shockwave" }
          } },
          { id: "impact-smoke", frame: 12, type: "spawn", effect: {
            type: "fire-smoke", duration: 900, scale: 1.3, opacity: 0.68,
            particles: { count: 8 }, layer: "airborne",
            motion: { type: "rising", startZ: 0, endZ: 82, easing: "float" },
            heightScaling: { enabled: true, amount: 0.0015, maximum: 1.18 },
            heightGlow: { enabled: true },
            metadata: { role: "fireball-frame-smoke" }
          } }
        ]
      },
      aftermath: {
        src: FIREBALL_FIRE_IMPACT,
        frameCount: 36,
        columns: 6,
        rows: 6,
        atlas: { width: 1254, height: 1254, ...EPIC_ATLAS_BOUNDS.fire },
        frameWidth: 160,
        frameHeight: 160,
        framesPerSecond: 16,
        startFrame: 24,
        endFrame: 35,
        loop: false,
        loops: 1
      }
    }
  }
});

const finiteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

function validateAtlas(atlas, columns, rows) {
  if (!atlas) return [];
  const errors = [];
  const validAxis = (values, count, extent) => Array.isArray(values) &&
    values.length === count + 1 && values.every((value, index) => (
      Number.isFinite(value) && value >= 0 && value <= extent &&
      (!index || value > values[index - 1])
    ));
  if (!Number.isFinite(atlas.width) || !Number.isFinite(atlas.height)) {
    errors.push("atlas width and height must be finite");
  } else {
    if (!validAxis(atlas.columns, columns, atlas.width)) {
      errors.push(`atlas requires ${columns + 1} valid column boundaries`);
    }
    if (!validAxis(atlas.rows, rows, atlas.height)) {
      errors.push(`atlas requires ${rows + 1} valid row boundaries`);
    }
  }
  return errors;
}

export function validateVfxClipDefinition(clip = {}, {
  spellId = "effect",
  clipName = "clip",
  assetExists = null
} = {}) {
  const label = `${spellId}.${clipName}`;
  const errors = [];
  const src = String(clip.src || "").trim();
  const frameCount = finiteNumber(clip.frameCount);
  const columns = finiteNumber(clip.columns);
  const rows = finiteNumber(clip.rows);
  const framesPerSecond = finiteNumber(clip.framesPerSecond);
  const startFrame = finiteNumber(clip.startFrame) ?? 0;
  const endFrame = finiteNumber(clip.endFrame) ?? (frameCount ?? 1) - 1;
  if (!src) errors.push(`${label}: source is required`);
  if (src && typeof assetExists === "function" && !assetExists(src)) {
    errors.push(`${label}: source does not exist: ${src}`);
  }
  if (!Number.isInteger(frameCount) || frameCount <= 0) {
    errors.push(`${label}: frameCount must be a positive integer`);
  }
  if (!Number.isInteger(columns) || columns <= 0 ||
      !Number.isInteger(rows) || rows <= 0) {
    errors.push(`${label}: rows and columns must be positive integers`);
  } else if (Number.isInteger(frameCount) && rows * columns < frameCount) {
    errors.push(`${label}: rows × columns must cover frameCount`);
  }
  if (framesPerSecond === null || framesPerSecond < 1 || framesPerSecond > 60) {
    errors.push(`${label}: framesPerSecond must be between 1 and 60`);
  }
  if (!Number.isInteger(startFrame) || !Number.isInteger(endFrame) ||
      startFrame < 0 || endFrame < startFrame ||
      Number.isInteger(frameCount) && endFrame >= frameCount) {
    errors.push(`${label}: startFrame/endFrame are outside the sheet`);
  }
  errors.push(...validateAtlas(clip.atlas, columns, rows).map((error) => `${label}: ${error}`));
  if (clip.loop === true && framesPerSecond > 0 && endFrame >= startFrame) {
    const loopDuration = (endFrame - startFrame + 1) / framesPerSecond;
    if (loopDuration < 0.12 || loopDuration > 10) {
      errors.push(`${label}: looping duration ${loopDuration.toFixed(2)}s is not sensible`);
    }
  }
  return Object.freeze(errors);
}

export function validateVfxAssetManifest(manifest = VFX_ASSET_MANIFEST, options = {}) {
  const errors = [];
  Object.entries(manifest || {}).forEach(([spellId, definition]) => {
    const clips = definition?.clips;
    if (!clips || typeof clips !== "object") {
      errors.push(`${spellId}: clips registry is required`);
      return;
    }
    Object.entries(clips).forEach(([clipName, clip]) => {
      if (!VFX_CLIP_NAMES.includes(clipName)) {
        errors.push(`${spellId}.${clipName}: unsupported clip name`);
      }
      errors.push(...validateVfxClipDefinition(clip, { ...options, spellId, clipName }));
    });
  });
  return Object.freeze(errors);
}

export function getVfxClipSet(id) {
  return VFX_ASSET_MANIFEST[String(id || "").trim().toLowerCase()]?.clips || null;
}

export function getVfxClip(id, clipName) {
  return getVfxClipSet(id)?.[String(clipName || "").trim().toLowerCase()] || null;
}

export function getVfxClipSources(id) {
  const clips = getVfxClipSet(id) || {};
  return Object.freeze([...new Set(Object.values(clips).map(({ src }) => src).filter(Boolean))]);
}

export function createVfxAssetCache({
  createImage = () => new globalThis.Image(),
  maximumEntries = 8,
  onError = (message) => globalThis.console?.error?.(message)
} = {}) {
  const cache = new Map();
  const maximum = Math.max(1, Math.min(32, Math.round(Number(maximumEntries) || 8)));

  function preload(src, label = "VFX clip") {
    const key = String(src || "").trim();
    if (!key) return Promise.resolve(false);
    if (cache.has(key)) {
      const entry = cache.get(key);
      cache.delete(key);
      cache.set(key, entry);
      return entry.promise;
    }
    let image;
    try { image = createImage(); } catch (error) {
      onError(`${label}: unable to create image loader for ${key}`);
      return Promise.resolve(false);
    }
    const promise = new Promise((resolve) => {
      image.onload = () => resolve(true);
      image.onerror = () => {
        onError(`${label}: unable to load sprite source ${key}`);
        resolve(false);
      };
    });
    cache.set(key, { image, promise });
    while (cache.size > maximum) cache.delete(cache.keys().next().value);
    image.src = key;
    return promise;
  }

  return Object.freeze({
    clear: () => cache.clear(),
    getState: () => Object.freeze({ size: cache.size, sources: Object.freeze([...cache.keys()]) }),
    preload
  });
}

const manifestErrors = validateVfxAssetManifest();
if (manifestErrors.length && globalThis.location?.hostname === "127.0.0.1") {
  manifestErrors.forEach((error) => globalThis.console?.error?.(`[VFX manifest] ${error}`));
}
