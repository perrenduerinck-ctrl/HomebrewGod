import { normalizeAnimation } from "./animationLibrary.js";
import { createVfxAssetCache } from "./vfxAssetManifest.js";

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
}

// This adapter creates requests for the existing engine/renderer. There is no
// second frame loop, drawing implementation, or image per animation frame.
export function createAnimationPlayer({ engine, library, assetCache,
  onError = message => console.error(message) } = {}) {
  if (!engine?.play || !engine?.registry || !library?.getAnimation) throw new TypeError("Animations require a library and effect engine.");
  const cache = assetCache || createVfxAssetCache({ maximumEntries: 32, onError: () => {} });
  const effectType = `animation-${++nextOwner}-sprite`;
  engine.registry.register({ id: effectType, kind: "sprite", className: "animation-sprite", configureElement });
  let revision = 0, destroyed = false;
  const pending = new Set();

  async function prepareAnimation(idOrDefinition, overrides = {}) {
    const original = typeof idOrDefinition === "string" ? library.getAnimation(idOrDefinition) : idOrDefinition;
    if (!original) throw new Error("That animation is unavailable. Choose another animation.");
    const definition = normalizeAnimation({ ...original, ...overrides, id: original.id,
      grid: { ...original.grid, ...overrides.grid },
      playback: overrides.playback ?? (overrides.loop === undefined ? original.playback : overrides.loop ? "loop" : "once") });
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
    const duration = definition.frameCount / definition.fps * 1000;
    if (!definition.loop && duration > 60000) throw new Error("A once-only animation must finish within 60 seconds. Increase FPS or reduce its frame count.");
    const loopDuration = overrides.duration === undefined ? null : finite(overrides.duration, null, "Loop duration");
    if (loopDuration !== null && (loopDuration <= 0 || loopDuration > 60000)) throw new Error("Loop duration must be between 1 and 60000 milliseconds.");
    return { definition, duration: definition.loop ? loopDuration ?? Math.min(60000, duration) : duration,
      untilCancelled: definition.loop && loopDuration === null,
      sprite: { src: definition.sprite, columns, rows, preserveGrid: true, frameCount: definition.frameCount,
        frameWidth: width * factor, frameHeight: height * factor, framesPerSecond: definition.fps,
        startFrame: 0, endFrame: definition.frameCount - 1, loop: definition.loop, removeOnComplete: true,
        blendMode: definition.blendMode, atlas: { ...atlas, inset: definition.inset } } };
  }

  function startRequest(item, options, delay) {
    const { definition: d, sprite, duration, untilCancelled } = item;
    const x = finite(options.x ?? options.position?.x, 0, "X"), y = finite(options.y ?? options.position?.y, 0, "Y");
    const hasTarget = options.targetX !== undefined && options.targetY !== undefined;
    const direction = hasTarget ? Math.atan2(finite(options.targetY, y, "Target Y") - y,
      finite(options.targetX, x, "Target X") - x) * 180 / Math.PI : 0;
    let finish;
    const finished = new Promise(resolve => { finish = resolve; });
    const handle = engine.play({ type: effectType,
      position: { x: x + d.offsetX, y: y + d.offsetY },
      rotation: d.rotation + direction, scale: d.scale, sprite, duration, untilCancelled, delay,
      layer: options.layer || "airborne", elevation: options.elevation || 0, shadow: false, particles: { count: 0 },
      metadata: { ...options.metadata, animationId: d.id, anchorX: d.anchorX, anchorY: d.anchorY,
        flipX: d.flipX, flipY: d.flipY, debug: options.debug === true }
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
      let cursor = 0;
      const requests = prepared.map(item => {
        const delay = finite(item.entry.at, cursor, "Sequence offset");
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
      return { ok: true, handles, cancel, finished };
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
