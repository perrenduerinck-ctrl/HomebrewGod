import { createSpriteAnimator, normalizeSpriteOptions } from "./spriteAnimator.js?v=clip-vfx-20260902";

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
    const options = normalizeSpriteOptions({ ...clip, removeOnComplete: false });
    return [clean(name), Object.freeze({
      ...options,
      events: normalizeClipEvents(clip?.events, options),
      nextClip: clean(clip?.nextClip)
    })];
  }).filter(([name]) => Boolean(name))));
}

export function createVfxClipController({
  element,
  clips = {},
  initialClip = "",
  assetCache = null,
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
  let animator = null;
  let startedAt = 0;
  let firedEvents = new Set();
  let destroyed = false;

  function emit(event) {
    try { onEvent(Object.freeze({ ...event, clipName: activeName })); } catch {
      // Clip observers are presentation-only.
    }
  }

  function playClip(name, { restart = true } = {}) {
    const nextName = clean(name);
    const clip = normalized[nextName];
    if (destroyed || !clip || nextName === activeName && !restart) return false;
    animator?.destroy?.();
    activeName = nextName;
    firedEvents = new Set();
    startedAt = now();
    element.dataset.vfxClip = nextName;
    element.dataset.spriteColumns = String(clip.columns);
    element.dataset.spriteRows = String(clip.rows);
    element.dataset.spriteFrames = String(clip.frameCount);
    assetCache?.preload?.(clip.src, `VFX clip ${nextName}`)?.catch?.(() => {});
    animator = createSpriteAnimator({
      element,
      options: clip,
      manual,
      requestFrame,
      cancelFrame,
      now,
      onComplete: () => {
        if (destroyed || activeName !== nextName) return;
        emit({ id: `${nextName}-complete`, type: "complete", progress: 1,
          frame: clip.endFrame - clip.startFrame });
        try { onComplete(Object.freeze({ clipName: nextName, options: clip })); } catch {
          // Completion observers cannot break cleanup.
        }
        if (clip.nextClip && normalized[clip.nextClip]) playClip(clip.nextClip);
      }
    });
    animator.start();
    return true;
  }

  function fireDueEvents(timestamp) {
    const clip = normalized[activeName];
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
