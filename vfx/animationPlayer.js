import { mergeAnimationDefinition } from "./animationLibrary.js";
import { createVfxAssetCache } from "./vfxAssetManifest.js";
import { chooseAnimationVariation, animationTiming, sampleAnimation } from "./animationPlayback.js";
import { elevationToVisualPixels } from "../battleMap/elevation.js";

let nextOwner = 0;
const failed = (reason, message = "") => ({ ok: false, skipped: true, reason, message });
function finite(value, fallback, label) {
  if (value === undefined) return fallback;
  if (value === null || value === "" || !Number.isFinite(Number(value))) throw new Error(`${label} must be a number.`);
  return Number(value);
}
function configureElement({ element, effect, document }) {
  const m = effect.metadata;
  element.dataset.animationId = m.animationId;
  element.style.width = `${effect.sprite.frameWidth}px`; element.style.height = `${effect.sprite.frameHeight}px`;
  element.style.transformOrigin = "50% 50%";
  const sprite = element.querySelector(".hg-vfx-sprite");
  sprite.style.left = "50%"; sprite.style.top = "50%";
  sprite.style.transformOrigin = `${m.anchorX * 100}% ${m.anchorY * 100}%`;
  sprite.style.transform = `translate(${-m.anchorX * 100}%, ${-m.anchorY * 100}%) scale(${m.flipX ? -1 : 1}, ${m.flipY ? -1 : 1})`;
  element.style.mixBlendMode = effect.sprite.blendMode;
  const runtime = m.animationRuntime, a = runtime.definition.appearance;
  let filter = "";
  if (a.tint && a.tintStrength > 0) {
    const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg"), defs = document.createElementNS(ns, "defs");
    const color = document.createElementNS(ns, "filter"), matrix = document.createElementNS(ns, "feColorMatrix");
    const id = `${effect.type}-${effect.id}-tint`, strength = a.tintStrength;
    const rgb = [1, 3, 5].map(i => parseInt(a.tint.slice(i, i + 2), 16) / 255);
    color.id = id; color.setAttribute("color-interpolation-filters", "sRGB");
    // Mix the original channels with a luminance-colored copy. Alpha is unchanged.
    const values = rgb.flatMap((channel, row) => [...[.2126, .7152, .0722].map((luma, col) => (row === col ? 1 - strength : 0) + channel * luma * strength * 1.8), 0, 0]);
    matrix.setAttribute("type", "matrix"); matrix.setAttribute("values", [...values, 0, 0, 0, 1, 0].join(" "));
    color.appendChild(matrix); defs.appendChild(color); svg.appendChild(defs);
    svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.style.position = "absolute"; element.appendChild(svg);
    filter = `url(#${id}) `;
  }
  sprite.style.filter = `${filter}brightness(${a.brightness}) contrast(${a.contrast}) saturate(${a.saturation}) hue-rotate(${a.hue}deg)`;
  const pivot = document.createElement("i"); pivot.className = "hg-animation-pivot"; element.appendChild(pivot);
  let audio = null;
  if (runtime.definition.sound && runtime.isSoundEnabled() && document.defaultView?.Audio) {
    try {
      audio = new document.defaultView.Audio(runtime.definition.sound.src); audio.preload = "none";
      audio.volume = runtime.definition.sound.volume; audio.playbackRate = runtime.definition.sound.playbackRate;
      const play = () => { try { Promise.resolve(audio.play()).catch(() => {}); } catch { /* Optional audio. */ } };
      const mute = () => { try { audio.pause(); } catch { /* Optional audio. */ } };
      runtime.onPause = paused => { if (paused || !runtime.isSoundEnabled()) mute(); else if (runtime.soundStarted) play(); };
      runtime.playSound = play; runtime.muteSound = mute;
    } catch { /* A sound device or file failure must never block the visual. */ }
  }
  if (m.combatAnimation) {
    element.classList.add("hg-vfx-combat-sprite");
    element.dataset.combatAnimation = m.combatAnimation;
  }
  if (m.debug) {
    sprite.style.outline = "1px dashed #ffdf60";
    const label = document.createElement("span"); label.className = "hg-animation-debug";
    label.textContent = `+ ${Math.round(effect.rotation)}° · ${effect.sprite.framesPerSecond} FPS`;
    element.appendChild(label);
  }
  return () => { runtime.playSound = null; runtime.onPause = null; runtime.muteSound = null; try { if (audio) { audio.pause(); audio.removeAttribute("src"); audio.load(); } } catch { /* Continue sprite disposal if media cleanup fails. */ } };
}

function updateElement({ element, effect, elapsed, mapScale, bounds, frame, getActorPoint }) {
  const runtime = effect.metadata.animationRuntime;
  if (!runtime) return null;
  const d = runtime.definition, points = { ...runtime.points };
  // Snapshot locations use the same proportional map coordinates as legacy
  // effects. Live token providers below already return current overlay pixels.
  const previousBounds = runtime.bounds;
  if (previousBounds && bounds.width > 0 && bounds.height > 0) {
    for (const key of ["source", "target", "map"]) points[key] = {
      x: points[key].x * bounds.width / previousBounds.width,
      y: points[key].y * bounds.height / previousBounds.height
    };
  }
  if (bounds.width > 0 && bounds.height > 0) runtime.bounds = { width: bounds.width, height: bounds.height };
  for (const [key, follow, tokenId, provider] of [["source", d.placement.followSource, runtime.sourceTokenId, runtime.getSourcePoint], ["target", d.placement.followTarget, runtime.targetTokenId, runtime.getTargetPoint]]) {
    if (!follow) continue;
    try { const point = provider?.() || (tokenId ? getActorPoint(tokenId) : null); if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) points[key] = point; } catch { /* Retain the last valid visual location. */ }
  }
  runtime.points = points;
  const state = sampleAnimation(d, elapsed, points, runtime.variation, runtime.timing);
  element.style.left = `${state.x}px`; element.style.top = `${state.y}px`; element.style.opacity = String(state.opacity);
  element.style.setProperty("--hg-vfx-rotation", `${state.rotation}deg`); element.style.setProperty("--hg-vfx-scale", String(state.scale * mapScale));
  element.dataset.vfxX = String(state.x); element.dataset.vfxY = String(state.y); element.dataset.animationFrame = String(frame ?? d.frames.start);
  const sprite = element.querySelector(".hg-vfx-sprite");
  if (sprite) {
    let sx = d.transform.lockProportions ? 1 : d.transform.scaleX, sy = d.transform.lockProportions ? 1 : d.transform.scaleY;
    if (d.behavior === "beam" && d.beam.stretchToTarget) {
      const vertical = ["up", "down"].includes(d.direction.sourceDirection), factor = Math.max(.0001, state.scale * mapScale);
      sx = (vertical ? d.beam.thickness : state.distance) / (effect.sprite.frameWidth * factor);
      sy = (vertical ? state.distance : d.beam.thickness) / (effect.sprite.frameHeight * factor);
    }
    sprite.style.transform = `translate(${-d.anchorX * 100}%, ${-d.anchorY * 100}%) scale(${sx * (d.flipX ? -1 : 1)}, ${sy * (d.flipY ? -1 : 1)})`;
  }
  if (!runtime.isSoundEnabled() && runtime.playSound) { runtime.muteSound?.(); runtime.playSound = null; runtime.soundStarted = true; }
  if (!runtime.soundStarted && runtime.playSound && elapsed >= runtime.soundAt) { runtime.soundStarted = true; runtime.playSound(); }
  try { runtime.onFrame?.({ frame, total: d.frameCount, elapsed, ...state }); } catch { /* Preview observers do not control playback. */ }
  return { x: state.x, y: state.y, screenY: state.y, frame, rotation: state.rotation };
}

function resolvePoints(options) {
  const map = { x: finite(options.x ?? options.position?.x, 0, "X"), y: finite(options.y ?? options.position?.y, 0, "Y") - elevationToVisualPixels(options.elevation || 0) };
  const liveSource = options.getSourcePoint?.(), liveTarget = options.getTargetPoint?.();
  const source = liveSource || options.sourcePoint || map;
  const target = liveTarget || options.targetPoint || { x: options.targetX ?? map.x, y: options.targetY ?? map.y };
  return { source: { x: finite(source.x, map.x, "Source X"), y: finite(source.y, map.y, "Source Y") - (liveSource ? 0 : elevationToVisualPixels(options.sourceElevation || 0)) }, target: { x: finite(target.x, map.x, "Target X"), y: finite(target.y, map.y, "Target Y") - (liveTarget ? 0 : elevationToVisualPixels(options.targetElevation || 0)) }, map };
}

// This adapter creates requests for the existing engine/renderer. There is no
// second frame loop, drawing implementation, or image per animation frame.
export function createAnimationPlayer({ engine, library, assetCache, isSoundEnabled = () => true,
  onError = message => console.error(message) } = {}) {
  if (!engine?.play || !engine?.registry || !library?.getAnimation) throw new TypeError("Animations require a library and effect engine.");
  const cache = assetCache || createVfxAssetCache({ maximumEntries: 32, onError: () => {} });
  const effectType = `animation-${++nextOwner}-sprite`;
  engine.registry.register({ id: effectType, kind: "sprite", className: "animation-sprite", canPause: true, allowIndefinite: true, configureElement, updateElement });
  let revision = 0, destroyed = false;
  const pending = new Set();

  async function prepareAnimation(idOrDefinition, overrides = {}) {
    const original = typeof idOrDefinition === "string" ? library.getAnimation(idOrDefinition) : idOrDefinition;
    if (!original) throw new Error("That animation is unavailable. Choose another animation.");
    const definition = mergeAnimationDefinition(original, overrides);
    if (!await cache.preload(definition.sprite, "Animation")) throw new Error(`Unable to load animation sprite: ${definition.name}.`);
    const dimensions = cache.getDimensions(definition.sprite);
    if (!dimensions || ![dimensions.width, dimensions.height].every(n => Number.isFinite(n) && n > 0 && n <= 16384) ||
        dimensions.width * dimensions.height > 64 * 1024 * 1024) throw new Error("The image dimensions are unavailable or too large.");
    const { columns, rows } = definition.grid;
    if (definition.atlas && (definition.atlas.width !== dimensions.width || definition.atlas.height !== dimensions.height)) {
      throw new Error("The sprite dimensions no longer match its measured cells. Update its grid settings.");
    }
    const atlas = definition.atlas || { ...dimensions,
      columns: Array.from({ length: columns + 1 }, (_, i) => i * dimensions.width / columns),
      rows: Array.from({ length: rows + 1 }, (_, i) => i * dimensions.height / rows) };
    const widths = atlas.columns.slice(1).map((n, i) => n - atlas.columns[i]);
    const heights = atlas.rows.slice(1).map((n, i) => n - atlas.rows[i]);
    if (Math.min(...widths, ...heights) < Math.max(4, definition.inset * 2 + 2)) throw new Error("The grid cells are too small for this sheet.");
    const width = Math.max(...widths) - definition.inset * 2, height = Math.max(...heights) - definition.inset * 2;
    const factor = definition.size / Math.max(width, height);
    const variation = { ...chooseAnimationVariation(definition, overrides.random) };
    const previewSpeed = finite(overrides.previewSpeed, 1, "Preview speed");
    if (previewSpeed <= 0 || previewSpeed > 4) throw new Error("Preview speed must be between 0 and 4.");
    variation.speed *= previewSpeed;
    const points = resolvePoints(overrides), timing = animationTiming(definition, variation, points.source, points.target, overrides.duration);
    if (definition.sound && !timing.frames.includes(definition.sound.startFrame)) throw new Error("The sound start frame must be in the frames being played.");
    return { definition, variation, timing, points, dimensions, duration: timing.duration, untilCancelled: timing.indefinite,
      sprite: { src: definition.sprite, columns, rows, preserveGrid: true, frameCount: Math.max(definition.frames.end + 1, ...timing.frames.map(n => n + 1)),
        frameWidth: width * factor, frameHeight: height * factor, framesPerSecond: definition.fps,
        startFrame: definition.frames.start, endFrame: definition.frames.end, frameSequence: timing.frames, playbackRate: timing.speed,
        loops: Math.max(1, definition.timing.loopCount), loop: definition.loop || definition.behavior === "projectile" && definition.playback !== "hold",
        removeOnComplete: !timing.indefinite && definition.timing.endDelay === 0 && definition.behavior !== "projectile" && definition.playback !== "hold" && !definition.placement.duration,
        blendMode: definition.blendMode, atlas: { ...atlas, inset: definition.inset } } };
  }

  function startRequest(item, options, delay) {
    const { definition: d, sprite, duration, untilCancelled } = item;
    const state = sampleAnimation(d, 0, item.points, item.variation, item.timing);
    const runtime = { definition: d, points: item.points, variation: item.variation, timing: item.timing,
      getSourcePoint: options.getSourcePoint, getTargetPoint: options.getTargetPoint, sourceTokenId: options.sourceTokenId, targetTokenId: options.targetTokenId, onFrame: options.onFrame, soundStarted: false,
      isSoundEnabled, soundAt: d.sound ? item.timing.frames.indexOf(d.sound.startFrame) * 1000 / (d.fps * item.timing.speed) : Infinity };
    let finish;
    const finished = new Promise(resolve => { finish = resolve; });
    const handle = engine.play({ type: effectType,
      position: { x: state.x, y: state.y }, opacity: state.opacity,
      rotation: state.rotation, scale: state.scale, sprite, duration, untilCancelled, delay,
      layer: options.layer || "airborne", elevation: options.elevation || 0, shadow: false, particles: { count: 0 },
      metadata: { ...options.metadata, animationId: d.id, anchorX: d.anchorX, anchorY: d.anchorY,
        flipX: d.flipX, flipY: d.flipY, debug: options.debug === true, animationRuntime: runtime }
    }, { onFinish: finish });
    if (!handle.ok || handle.skipped) finish(handle.reason || "unavailable");
    return { ...handle, finished };
  }

  async function playSequence(steps, options = {}) {
    if (destroyed) return failed("destroyed");
    if (engine.getState().mode === "off") return failed("effects-off");
    if (!Array.isArray(steps) || !steps.length || steps.length > 32) return failed("invalid-sequence");
    const token = { revision, cancelled: false }; pending.add(token);
    const cancelPending = () => { token.cancelled = true; };
    options.signal?.addEventListener("abort", cancelPending, { once: true });
    const handles = [];
    try {
      const prepared = await Promise.all(steps.map(async step => {
        const entry = typeof step === "string" ? { animationId: step } : step;
        const settings = { ...options, ...entry };
        return { entry, settings, ...await prepareAnimation(entry.definition || entry.animationId, settings) };
      }));
      if (destroyed || token.cancelled || token.revision !== revision || options.signal?.aborted) return failed("cancelled");
      if (engine.getState().mode === "off") return failed("effects-off");
      if (typeof options.resolvePlacement === "function") {
        for (const item of prepared) {
          const placement = options.resolvePlacement(item.settings);
          item.settings = { ...item.settings, ...placement };
          if (placement.rotation !== undefined) item.definition = { ...item.definition, rotation: finite(placement.rotation, 0, "Rotation") };
        }
      }
      for (const item of prepared) {
        item.points = resolvePoints(item.settings);
        item.timing = animationTiming(item.definition, item.variation, item.points.source, item.points.target, item.settings.duration);
        item.duration = item.timing.duration; item.untilCancelled = item.timing.indefinite;
      }
      let cursor = 0;
      const requests = prepared.map(item => {
        const delay = finite(item.entry.at, cursor, "Sequence offset") + item.definition.timing.startDelay * 1000;
        if (delay < 0 || delay > 10000) throw new Error("Sequence offsets must be between 0 and 10000 milliseconds.");
        cursor = item.untilCancelled ? Infinity : Math.max(cursor, delay + item.duration);
        return { item, delay };
      });
      // Validate coordinates before starting any member of the sequence.
      for (const { item } of requests) {
        for (const key of ["x", "y", "targetX", "targetY"]) finite(item.settings[key], 0, key);
      }
      for (const { item, delay } of requests) {
        const handle = startRequest(item, item.settings, delay); handles.push(handle);
        if (!handle.ok || handle.skipped) {
          handles.forEach(h => h.cancel?.()); return failed(handle.reason || "effect-limit");
        }
      }
      const cancel = () => handles.forEach(h => h.cancel?.());
      options.signal?.addEventListener("abort", cancel, { once: true });
      const finished = Promise.all(handles.map(h => h.finished)).finally(() => options.signal?.removeEventListener("abort", cancel));
      return { ok: true, handles, cancel, finished, pause: () => handles.forEach(h => h.pause?.()), resume: () => handles.forEach(h => h.resume?.()) };
    } catch (error) {
      handles.forEach(h => h.cancel?.());
      onError(`[Animation] ${error.message}`); return failed("sprite-unavailable", error.message);
    } finally { pending.delete(token); options.signal?.removeEventListener("abort", cancelPending); }
  }
  function clear() {
    revision++; pending.forEach(t => { t.cancelled = true; });
    engine.getState().effects.filter(e => e.type === effectType).forEach(e => engine.cancel(e.id));
  }
  return Object.freeze({ prepareAnimation, playSequence, getMode: () => engine.getState().mode,
    playAnimation: (animationId, options) => playSequence([{ animationId }], options),
    previewAnimation: (definition, options) => playSequence([{ definition }], options),
    async preload(id) { if (destroyed) return false; try { await prepareAnimation(id); return true; } catch (e) { onError(`[Animation] ${e.message}`); return false; } },
    clear, destroy() { if (destroyed) return; clear(); destroyed = true; if (!assetCache) cache.clear(); engine.registry.unregister(effectType); }
  });
}
