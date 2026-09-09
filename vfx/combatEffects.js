import { createVfxAssetCache } from "./vfxAssetManifest.js";

export const COMBAT_ANIMATIONS = Object.freeze({
  "melee.swordSlash": Object.freeze({
    src: "./assets/vfx/combat/melee/sword-slash-test.png",
    columns: 6, rows: 6, frameCount: 36, fps: 30,
    size: 160, scale: 1, loop: false, inset: 4,
    rotationOffset: 0, flipX: false, flipY: false
  })
});

const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
let nextOwner = 0;

function validateGrid(id, options) {
  const { columns, rows, frameCount, src } = options || {};
  if (typeof src !== "string" || !src.trim() ||
      ![columns, rows, frameCount].every(n => Number.isInteger(n) && n > 0) ||
      frameCount > columns * rows || frameCount > 240 ||
      columns > frameCount || rows > frameCount) throw new TypeError(`Invalid sprite grid: ${id}`);
}

// Points use pixels relative to the VFX overlay. DOM tokens use their visible
// body, including elevation; reading them never changes token state or position.
export function getCombatActorPoint(actor, overlayRect = { left: 0, top: 0 }) {
  if (!actor) return null;
  if (actor.getBoundingClientRect) {
    const body = actor.querySelector?.(":scope > img, :scope > .hg-token-fallback") || actor;
    const rect = body.getBoundingClientRect();
    return { x: rect.left + rect.width / 2 - overlayRect.left,
      y: rect.top + rect.height / 2 - overlayRect.top, width: rect.width };
  }
  return Number.isFinite(actor.x) && Number.isFinite(actor.y)
    ? { x: actor.x, y: actor.y, width: number(actor.width, 64) } : null;
}

export function resolveCombatPlacement(attacker, target, { overlayRect, position } = {}) {
  const start = getCombatActorPoint(attacker, overlayRect) || position || { x: 0, y: 0, width: 64 };
  const end = getCombatActorPoint(target, overlayRect) ||
    { x: start.x + Math.max(80, number(start.width, 64) * 1.5), y: start.y };
  return { attacker: start, target: end,
    position: position || { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
    angle: Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI };
}

function configureCombatElement({ element, effect, document }) {
  element.dataset.combatAnimation = effect.metadata.combatAnimation;
  element.style.width = `${effect.sprite.frameWidth}px`;
  element.style.height = `${effect.sprite.frameHeight}px`;
  const sprite = element.querySelector(".hg-vfx-sprite");
  sprite.style.transform = `translate(-50%, -50%) scale(${effect.metadata.flipX ? -1 : 1}, ${effect.metadata.flipY ? -1 : 1})`;
  if (effect.metadata.debug) {
    element.classList.add("hg-combat-debug");
    const label = document.createElement("span");
    label.className = "hg-combat-angle";
    label.textContent = `${Math.round(effect.rotation)}° · ${effect.sprite.framesPerSecond} FPS`;
    element.appendChild(label);
  }
}

export function createCombatEffectSystem({ engine, assetCache = createVfxAssetCache(),
  animations = COMBAT_ANIMATIONS, onError = message => console.error(message) } = {}) {
  if (!engine?.play || !engine?.registry) throw new TypeError("Combat sprites require an effect engine.");
  const catalog = new Map();
  const owner = `combat-${++nextOwner}`;
  const effectType = `${owner}-sprite`;
  let revision = 0, destroyed = false;
  function register(id, options) {
    if (!/^[a-z][\w.-]*$/i.test(id)) throw new TypeError("A combat animation needs a stable category/name.");
    validateGrid(id, options);
    const entry = Object.freeze({ fps: 30, size: 160, scale: 1, loop: false, inset: 0, ...options });
    catalog.set(id, entry);
    return entry;
  }
  Object.entries(animations).forEach(([id, options]) => register(id, options));
  engine.registry.register({
    id: effectType, kind: "sprite", className: "combat-sprite",
    blendMode: "normal", layer: "airborne", configureElement: configureCombatElement
  });
  const lookup = id => catalog.get(id === "swordSlash" ? "melee.swordSlash" : id);
  const failure = reason => ({ ok: false, skipped: true, reason });

  async function prepare(id, overrides = {}) {
    const definition = lookup(id);
    if (!definition) throw new Error(`Unknown combat animation: ${id}`);
    const config = { ...definition, ...overrides };
    validateGrid(id, config);
    if (!await assetCache.preload(config.src, `Combat animation ${id}`)) throw new Error(`Unable to load combat sprite: ${config.src}`);
    const dimensions = assetCache.getDimensions(config.src);
    if (!dimensions || ![dimensions.width, dimensions.height].every(n => Number.isFinite(n) && n > 0 && n <= 16384)) {
      throw new Error(`Combat sprite has invalid decoded dimensions: ${config.src}`);
    }
    const fps = clamp(number(config.fps, 30), 1, 60);
    const inset = clamp(Math.round(number(config.inset, 0)), 0, 64);
    const cellWidth = dimensions.width / config.columns;
    const cellHeight = dimensions.height / config.rows;
    if (cellWidth < 4 || cellHeight < 4 || cellWidth <= inset * 2 + 1 || cellHeight <= inset * 2 + 1) {
      throw new Error(`Combat crop is too small: ${id}`);
    }
    const size = clamp(number(config.size, 160), 8, 1024);
    const ratio = (cellWidth - inset * 2) / (cellHeight - inset * 2);
    const sprite = { src: config.src, columns: config.columns, rows: config.rows,
      frameCount: config.frameCount, framesPerSecond: fps, loop: config.loop === true,
      frameWidth: Math.round(size * Math.min(1, ratio)), frameHeight: Math.round(size / Math.max(1, ratio)),
      startFrame: 0, endFrame: config.frameCount - 1, blendMode: "normal", removeOnComplete: true,
      atlas: { ...dimensions, inset,
        columns: Array.from({ length: config.columns + 1 }, (_, i) => i * cellWidth),
        rows: Array.from({ length: config.rows + 1 }, (_, i) => i * cellHeight) } };
    return { config, sprite, duration: config.loop === true
      ? clamp(number(config.duration, config.frameCount / fps * 1000), 1, 60000)
      : config.frameCount / fps * 1000 };
  }

  async function preload(id = "melee.swordSlash") {
    try { await prepare(id); return true; }
    catch (error) { onError(`[Combat VFX] ${error.message}`); return false; }
  }

  // Strings play sequentially. { animation, at: milliseconds } permits overlap
  // and independent layers. The existing engine owns every delay and cleanup.
  async function playCombatSequence(steps, attacker, target, options = {}) {
    if (destroyed) return failure("destroyed");
    if (engine.getState().mode === "off") return failure("effects-off");
    if (!Array.isArray(steps) || !steps.length || steps.length > 32) return failure("invalid-sequence");
    const startedRevision = revision;
    try {
      const prepared = await Promise.all(steps.map(async step => {
        const entry = typeof step === "string" ? { animation: step } : step;
        return { entry, ...await prepare(entry.animation, { ...options, ...entry }) };
      }));
      if (destroyed || startedRevision !== revision) return failure("cancelled");
      if (engine.getState().mode === "off") return failure("effects-off");
      const overlay = engine.getOverlayElement();
      const placement = resolveCombatPlacement(attacker, target, {
        overlayRect: overlay?.getBoundingClientRect?.(), position: options.position });
      let cursor = 0;
      const requests = prepared.map(({ entry, config, sprite, duration }) => {
        const delay = entry.at == null ? cursor : number(entry.at, -1);
        if (delay < 0 || delay > 10000) throw new Error("Combat sequence offsets must be within 0–10000 ms.");
        cursor = Math.max(cursor, delay + duration);
        return { type: effectType, position: placement.position,
          rotation: placement.angle + number(config.rotationOffset, 0) + number(config.rotation, 0),
          scale: clamp(number(config.scale, 1), .1, 8), duration, delay, sprite,
          layer: config.layer || "airborne", particles: { count: 0 }, shadow: false,
          metadata: { combatOwner: owner, combatAnimation: entry.animation,
            flipX: config.flipX === true, flipY: config.flipY === true, debug: config.debug === true } };
      });
      const handles = requests.map(request => engine.play(request));
      return { ok: handles.every(h => h.ok && !h.skipped), handles, placement,
        cancel: () => handles.forEach(h => h.cancel?.()) };
    } catch (error) { onError(`[Combat VFX] ${error.message}`); return failure("sprite-unavailable"); }
  }

  // Cancellation also invalidates pending image decodes, preventing late playback.
  function clear() {
    revision++;
    engine.getState().effects.filter(e => e.type === effectType)
      .forEach(e => engine.cancel(e.id));
  }

  return Object.freeze({ register, preload, playCombatSequence,
    playCombatEffect: (id, attacker, target, options) => playCombatSequence([id], attacker, target, options),
    clear, destroy() { clear(); destroyed = true; assetCache.clear(); engine.registry.unregister(effectType); },
    list: () => [...catalog.keys()] });
}
