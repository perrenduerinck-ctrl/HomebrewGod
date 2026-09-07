import { EPIC_ATLAS_BOUNDS } from "./tierEffects.js?v=status-sprites-20260831";
import { getVfxAssetVersions, resolveVfxClipDefinition } from "./assetVersions.js";
import { resolveVfxAlphaSource } from "./alphaAssets.js";

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
  PREMIUM_6X6: "6x6-premium",
  REPLACE_WITH_6X6: "replace",
  ALREADY_MODERN: "6x6-premium"
});

export const VFX_ASSET_STANDARDS = Object.freeze({
  major: Object.freeze({ columns: 6, rows: 6, frameCount: 36,
    framesPerSecond: Object.freeze([24, 30]) }),
  projectile: Object.freeze({ columns: 6, rows: 6, frameCount: 36, loop: true }),
  status: Object.freeze({ columns: 6, rows: 6, frameCount: 36, loop: true }),
  persistent: Object.freeze({ columns: 6, rows: 6, frameCount: 36, loop: true })
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

const FIREBALL_LEGACY_IMPACT = {
  blendMode: "screen", anchor: "impact-center", artAngle: 0,
  src: "./assets/vfx/fire/fire-impact-spritesheet.png",
  frameCount: 16, columns: 4, rows: 4,
  frameWidth: 160, frameHeight: 160, framesPerSecond: 18,
  startFrame: 0, endFrame: 15, loop: false, loops: 1
};

function fireballVersion(modern6x6, legacy = FIREBALL_LEGACY_IMPACT) {
  modern6x6 = { blendMode: "normal", anchor: "impact-center", artAngle: 0, ...modern6x6 };
  return { preferred: "modern6x6", legacy: {
    ...legacy,
    // Preserve composition cues at the same progress through either sheet.
    events: (modern6x6.events || []).map(({ frame, ...event }) => ({
      ...event, progress: frame / (modern6x6.endFrame - modern6x6.startFrame)
    }))
  }, modern6x6 };
}

function versionUnmigratedClips(manifest) {
  for (const spell of Object.values(manifest)) for (const [name, clip] of Object.entries(spell.clips)) {
    if (!getVfxAssetVersions(clip)) spell.clips[name] = {
      preferred: "modern6x6", legacy: { blendMode: "screen", ...clip }, modern6x6: null
    };
  }
  return manifest;
}

export const VFX_ASSET_MANIFEST = deepFreeze(versionUnmigratedClips({
  fireball: {
    classification: VFX_ASSET_CLASSES.PREMIUM_6X6,
    notes: "Existing alpha 6x6 Fireball preferred; original 4x4 remains the fallback. Motion remains code-driven.",
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
      impact: fireballVersion({
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
      }),
      aftermath: fireballVersion({
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
      }, { ...FIREBALL_LEGACY_IMPACT, startFrame: 10, endFrame: 15, framesPerSecond: 8 })
    }
  }
}));

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
      const versions = getVfxAssetVersions(clip);
      if (!versions) {
        errors.push(...validateVfxClipDefinition(clip, { ...options, spellId, clipName }));
        return;
      }
      if (!["legacy", "modern6x6"].includes(versions.preferred)) {
        errors.push(`${spellId}.${clipName}: preferred must be legacy or modern6x6`);
      }
      if (!versions.legacy) errors.push(`${spellId}.${clipName}: legacy fallback is required`);
      for (const version of ["legacy", "modern6x6"]) {
        const candidate = versions[version];
        if (!candidate) continue;
        errors.push(...validateVfxClipDefinition(candidate, {
          ...options, spellId, clipName: `${clipName}.${version}`
        }));
        if (version === "modern6x6" && (candidate.columns !== 6 || candidate.rows !== 6 ||
            candidate.frameCount !== 36)) {
          errors.push(`${spellId}.${clipName}.${version}: upgraded sheets must be 6x6 / 36 frames`);
        }
      }
    });
  });
  return Object.freeze(errors);
}

export function getVfxClipSet(id, options = {}) {
  const clips = VFX_ASSET_MANIFEST[String(id || "").trim().toLowerCase()]?.clips;
  return clips ? Object.freeze(Object.fromEntries(Object.entries(clips).map(([name, clip]) =>
    [name, resolveVfxClipDefinition(clip, options)]))) : null;
}

export function getVfxClip(id, clipName, options = {}) {
  return getVfxClipSet(id, options)?.[String(clipName || "").trim().toLowerCase()] || null;
}

export function getVfxClipSources(id, options = {}) {
  const clips = getVfxClipSet(id, options) || {};
  return Object.freeze([...new Set(Object.values(clips).map(clip => clip?.src).filter(Boolean))]);
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
    const entry = { image, promise: null, status: "loading" };
    const promise = new Promise((resolve) => {
      image.onload = async () => {
        try {
          if (typeof image.decode === "function") {
            entry.status = "decoding";
            await image.decode();
          }
          entry.status = "loaded"; resolve(true);
        } catch { image.onerror(); }
      };
      image.onerror = () => {
        entry.status = "failed";
        onError(`${label}: unable to load sprite source ${key}`);
        resolve(false);
      };
    });
    entry.promise = promise;
    cache.set(key, entry);
    while (cache.size > maximum) cache.delete(cache.keys().next().value);
    try { image.src = resolveVfxAlphaSource(key); } catch { image.onerror(); }
    return promise;
  }

  return Object.freeze({
    clear: () => cache.clear(),
    getStatus: (src) => cache.get(String(src || "").trim())?.status || "unknown",
    getState: () => Object.freeze({ size: cache.size, sources: Object.freeze([...cache.keys()]) }),
    preload
  });
}

const manifestErrors = validateVfxAssetManifest();
if (manifestErrors.length && globalThis.location?.hostname === "127.0.0.1") {
  manifestErrors.forEach((error) => globalThis.console?.error?.(`[VFX manifest] ${error}`));
}
