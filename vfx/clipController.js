import { createSpriteAnimator, normalizeSpriteOptions } from "./spriteAnimator.js?v=clip-vfx-20260902";
import { getVfxAssetMode, getVfxAssetVersions, resolveVfxClipDefinition } from "./assetVersions.js";

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const clean = (value) => String(value || "").trim().toLowerCase();

function normalizeClipEvents(events, options) {
  const frameTotal = options.endFrame - options.startFrame + 1;
  return Object.freeze((Array.isArray(events) ? events : []).slice(0, 32)
    .map((event, index) => {
      const requestedFrame = Number(event?.frame ?? event?.atFrame);
      const requestedProgress = Number(event?.progress ?? event?.at);
      const progress = Number.isFinite(requestedFrame)
        ? clamp(Math.round(requestedFrame) / Math.max(1, frameTotal - 1), 0, 1)
        : clamp(Number.isFinite(requestedProgress) ? requestedProgress : 0, 0, 1);
      return Object.freeze({
        id: clean(event?.id) || `clip-event-${index + 1}`,
        type: clean(event?.type || (event?.effect ? "spawn" : "marker")),
        progress,
        frame: Math.round(progress * Math.max(0, frameTotal - 1)),
        clip: clean(event?.clip || event?.nextClip),
        effect: event?.effect && typeof event.effect === "object"
          ? Object.freeze({ ...event.effect }) : null,
        metadata: Object.freeze({ ...(event?.metadata || {}) })
      });
    }).sort((left, right) => left.progress - right.progress));
}

export function normalizeVfxClips(clips = {}) {
  return Object.freeze(Object.fromEntries(Object.entries(clips || {}).map(([name, clip]) => {
    const selected = resolveVfxClipDefinition(clip);
    const options = normalizeSpriteOptions({ ...selected, removeOnComplete: false });
    return [clean(name), Object.freeze({
      ...options,
      ...(selected?.assetVersions ? {
        assetVersions: selected.assetVersions, assetVersion: selected.assetVersion
      } : {}),
      events: normalizeClipEvents(selected?.events, options),
      nextClip: clean(selected?.nextClip)
    })];
  }).filter(([name]) => Boolean(name))));
}

export function createVfxClipController({
  element,
  clips = {},
  initialClip = "",
  assetCache = null,
  assetMode = () => getVfxAssetMode(),
  requestFrame = globalThis.requestAnimationFrame,
  cancelFrame = globalThis.cancelAnimationFrame,
  now = () => globalThis.performance?.now?.() ?? Date.now(),
  manual = false,
  onEvent = () => {},
  onComplete = () => {}
} = {}) {
  if (!element?.style) throw new TypeError("VFX clips require a styled sprite element.");
  const normalized = normalizeVfxClips(clips);
  const names = Object.keys(normalized);
  if (!names.length) throw new TypeError("VFX clips require at least one named clip.");
  let activeName = "";
  let activeClip = null;
  let animator = null;
  let startedAt = 0;
  let firedEvents = new Set();
  let destroyed = false;
  let playback = 0;

  const mode = () => typeof assetMode === "function" ? assetMode() : assetMode;
  const available = (src) => assetCache?.getStatus?.(src) !== "failed";
  const preload = (src, label) => {
    try { return Promise.resolve(assetCache?.preload?.(src, label)).catch(() => false); }
    catch { return Promise.resolve(false); }
  };
  // Warm only this effect's versioned sheets so its charge/travel can hide I/O.
  if (assetCache) {
    const sources = new Set();
    Object.values(clips).forEach((clip) => {
      if (!getVfxAssetVersions(clip)) return;
      const selected = resolveVfxClipDefinition(clip, { mode: mode(), assetAvailable: available });
      if (selected) sources.add(selected.src);
      const legacy = resolveVfxClipDefinition(clip, { mode: "legacy", assetAvailable: available });
      if (legacy) sources.add(legacy.src);
    });
    sources.forEach(src => preload(src, "VFX versioned clip"));
  }

  function emit(event) {
    try { onEvent(Object.freeze({ ...event, clipName: activeName })); } catch {
      // Clip observers are presentation-only.
    }
  }

  function playClip(name, { restart = true } = {}) {
    const nextName = clean(name);
    const definition = normalized[nextName];
    if (destroyed || !definition || nextName === activeName && !restart) return false;
    const desired = resolveVfxClipDefinition(definition, { mode: mode(), assetAvailable: available });
    if (!desired) return false;
    const revision = ++playback;
    activeName = nextName;
    firedEvents = new Set();
    startedAt = now();

    function install(selected, preserveProgress = false) {
      const timestamp = now();
      const previousDuration = activeClip
        ? (activeClip.endFrame - activeClip.startFrame + 1) / activeClip.framesPerSecond * 1000 : 0;
      const progress = preserveProgress && previousDuration > 0
        ? Math.max(0, timestamp - startedAt) / previousDuration : 0;
      const clip = selected.assetVersions ? normalizeVfxClips({ [nextName]: {
        ...selected, assetVersions: undefined
      } })[nextName] : selected;
      if (preserveProgress && !clip.loop && progress >= 1) return;
      animator?.destroy?.();
      activeClip = clip;
      if (preserveProgress) startedAt = timestamp - progress *
        (clip.endFrame - clip.startFrame + 1) / clip.framesPerSecond * 1000;
      element.dataset.vfxClip = nextName;
      element.dataset.vfxAssetVersion = selected.assetVersion || "legacy";
      element.dataset.spriteColumns = String(clip.columns);
      element.dataset.spriteRows = String(clip.rows);
      element.dataset.spriteFrames = String(clip.frameCount);
      animator = createSpriteAnimator({
        element,
        options: clip,
        manual,
        requestFrame,
        cancelFrame,
        now,
        onComplete: () => {
          if (destroyed || playback !== revision) return;
          emit({ id: `${nextName}-complete`, type: "complete", progress: 1,
            frame: clip.endFrame - clip.startFrame });
          try { onComplete(Object.freeze({ clipName: nextName, options: clip })); } catch {
            // Completion observers cannot break cleanup.
          }
          if (clip.nextClip && normalized[clip.nextClip]) playClip(clip.nextClip);
        }
      });
      animator.start(startedAt);
      if (preserveProgress) animator.seek(timestamp);
    }

    // A cold modern request displays the legacy sheet while it loads. Switching
    // sheets preserves timeline progress, frame events, scale and the same node.
    const legacy = desired.assetVersion === "modern6x6" && assetCache
      ? resolveVfxClipDefinition(definition, { mode: "legacy", assetAvailable: available }) : null;
    const waiting = legacy?.assetVersion === "legacy" &&
      assetCache?.getStatus?.(desired.src) !== "loaded";
    install(waiting ? legacy : desired);
    if (assetCache) {
      if (waiting) preload(legacy.src, `VFX clip ${nextName} legacy`);
      preload(desired.src, `VFX clip ${nextName}`).then((loaded) => {
        if (destroyed || playback !== revision) return;
        if (loaded && waiting) install(desired, true);
        else if (!loaded && !waiting && desired.assetVersion === "modern6x6") {
          const fallback = resolveVfxClipDefinition(definition, { mode: "legacy",
            assetAvailable: src => src !== desired.src && available(src) });
          if (fallback) { preload(fallback.src, `VFX clip ${nextName} legacy`); install(fallback, true); }
        }
      });
    }
    return true;
  }

  function fireDueEvents(timestamp) {
    const clip = activeClip;
    if (!clip) return;
    const frameTotal = clip.endFrame - clip.startFrame + 1;
    const duration = frameTotal / clip.framesPerSecond * 1000;
    const progress = clip.loop
      ? clamp(((timestamp - startedAt) % Math.max(1, duration)) / Math.max(1, duration), 0, 1)
      : clamp((timestamp - startedAt) / Math.max(1, duration), 0, 1);
    clip.events.forEach((event) => {
      if (firedEvents.has(event.id) || progress < event.progress) return;
      firedEvents.add(event.id);
      emit(event);
      if (event.type === "clip" && event.clip) playClip(event.clip);
    });
  }

  function seek(timestamp) {
    if (!animator || destroyed) return false;
    const value = Number.isFinite(Number(timestamp)) ? Number(timestamp) : now();
    fireDueEvents(value);
    return animator.seek(value);
  }

  function stop() {
    playback++;
    animator?.stop?.();
    return Boolean(animator);
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    animator?.destroy?.();
    animator = null;
    delete element.dataset.vfxClip;
    delete element.dataset.spriteColumns;
    delete element.dataset.spriteRows;
    delete element.dataset.spriteFrames;
    delete element.dataset.vfxAssetVersion;
  }

  const requestedInitial = clean(initialClip);
  playClip(normalized[requestedInitial] ? requestedInitial : names[0]);

  return Object.freeze({
    destroy,
    getState: () => {
      const state = animator?.getState?.() || {};
      return Object.freeze({
        ...state,
        clipName: activeName,
        clips: Object.freeze(names),
        destroyed,
        currentFrame: state.currentFrame ?? normalized[activeName]?.startFrame ?? 0
      });
    },
    playClip,
    seek,
    stop
  });
}
