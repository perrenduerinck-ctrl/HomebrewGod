import { createAnimationLibrary } from "./animationLibrary.js";
import { createAnimationPlayer } from "./animationPlayer.js";
import { SWORD_SLASH_ANIMATION } from "./animationBuiltins.js";

export const COMBAT_ANIMATIONS = Object.freeze({
  "melee.swordSlash": Object.freeze({
    src: SWORD_SLASH_ANIMATION.sprite, columns: 6, rows: 6, frameCount: 36, fps: 30,
    size: 160, scale: 1, loop: false, inset: 4, rotationOffset: 0, flipX: false, flipY: false
  })
});
const number = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

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

// Compatibility/placement adapter. All preparation and playback use the shared player.
export function createCombatEffectSystem({ engine, assetCache, animations = COMBAT_ANIMATIONS,
  library = createAnimationLibrary(), bindings, onError } = {}) {
  const catalog = new Map();
  const swordId = library.getAnimation("sword_slash_01") ? "sword_slash_01" : "melee.swordSlash";
  function register(id, options = {}) {
    const definition = { ...options, id, name: id, sprite: options.src,
      grid: { columns: options.columns, rows: options.rows }, category: id.split(".")[0],
      rotation: options.rotationOffset || 0 };
    if (library.getAnimation(id)) library.updateAnimation(id, definition);
    else library.registerAnimation(definition);
    catalog.set(id, options); return options;
  }
  Object.entries(animations).forEach(([id, options]) => {
    if (id === "melee.swordSlash" && swordId === "sword_slash_01") catalog.set(id, options);
    else register(id, options);
  });
  const player = createAnimationPlayer({ engine, library, assetCache, onError });
  const lookup = id => ["swordSlash", "melee.swordSlash"].includes(id)
    ? bindings?.getAssignment("attack:sword-slash")?.animationId || swordId : id;
  function overrides(options = {}) {
    const result = { ...options };
    if (options.src !== undefined) result.sprite = options.src;
    if (options.columns !== undefined || options.rows !== undefined) result.grid = {
      ...(options.columns === undefined ? {} : { columns: options.columns }),
      ...(options.rows === undefined ? {} : { rows: options.rows })
    };
    return result;
  }
  async function playCombatSequence(steps, attacker, target, options = {}) {
    if (!Array.isArray(steps) || !steps.length || steps.length > 32) return { ok: false, skipped: true, reason: "invalid-sequence" };
    // Snapshot geometry only after decode, so a moving/raised token uses its current center.
    const ids = steps.map(step => lookup(typeof step === "string" ? step : step?.animation));
    const placementOptions = () => resolveCombatPlacement(attacker, target, {
      overlayRect: engine.getOverlayElement()?.getBoundingClientRect?.(), position: options.position });
    let placement = null;
    const result = await player.playSequence(steps.map((step, i) => {
      const entry = typeof step === "string" ? {} : step;
      const settings = overrides({ ...options, ...entry });
      return { ...settings, animationId: ids[i],
        metadata: { combatAnimation: typeof step === "string" ? step : step.animation } };
    }), { resolvePlacement(settings) {
      placement = placementOptions();
      return { x: placement.position.x, y: placement.position.y, rotation: placement.angle +
        number(settings.rotationOffset, library.getAnimation(settings.animationId)?.rotation || 0) + number(settings.rotation, 0) };
    } });
    return { ...result, placement };
  }
  return Object.freeze({ register, preload: (id = "melee.swordSlash") => player.preload(lookup(id)),
    playCombatSequence, playCombatEffect: (id, attacker, target, options) => playCombatSequence([id], attacker, target, options),
    clear: player.clear, destroy: player.destroy, list: () => [...catalog.keys()] });
}
