import test from "node:test";
import assert from "node:assert/strict";
import { createAnimationLibrary, createAnimationBindings, normalizeAnimation } from "../vfx/animationLibrary.js";
import { BUILTIN_ANIMATIONS } from "../vfx/animationBuiltins.js";
import { createAnimationPlayer } from "../vfx/animationPlayer.js";
import { createAnimationSpellAdapter } from "../vfx/animationSpellAdapter.js";
import { createEffectEngine } from "../vfx/effectEngine.js";
import { createSpriteAnimator, getSpriteFrameStyle } from "../vfx/spriteAnimator.js";
import { createSpellVfxEvent } from "../vfx/castEvent.js";
import { getAnimationActions } from "../vfx/animationWorkspace.js";

const definition = { id: "test_sheet", name: "Sheet", sprite: "test.png", grid: { columns: 6, rows: 6 }, frameCount: 36 };
test("the assignment selector includes dedicated spell sequences as well as profiles and the sword test", () => {
  const keys = getAnimationActions().map(a => a.key);
  for (const key of ["spell:fireball", "spell:fire-bolt", "spell:lightning-bolt", "attack:sword-slash"]) assert.ok(keys.includes(key), key);
  assert.equal(new Set(keys).size, keys.length);
});
function fixture(cacheOptions = {}) {
  let time = 0, id = 0;
  const timers = new Map(), visible = new Map(), errors = [];
  const engine = createEffectEngine({ renderer: { render: e => visible.set(e.id, e), remove: id => visible.delete(id), clear: () => visible.clear() },
    scheduler: { now: () => time, setTimeout(fn, ms) { timers.set(++id, { fn, at: time + ms }); return id; }, clearTimeout: id => timers.delete(id) } });
  const library = createAnimationLibrary({ builtins: BUILTIN_ANIMATIONS });
  library.registerAnimation(definition);
  const cache = { preload: async () => true, getDimensions: () => ({ width: 1200, height: 600 }), ...cacheOptions };
  const player = createAnimationPlayer({ engine, library, assetCache: cache, onError: e => errors.push(e) });
  function advance(ms) {
    const end = time + ms;
    while (true) { const t = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!t) break; timers.delete(t[0]); time = t[1].at; t[1].fn(); }
    time = end;
  }
  return { library, player, engine, errors, timers, visible, cache, advance, destroy() { player.destroy(); engine.destroy(); } };
}

test("library IDs separate appearance, ownership and assignments, with independent copies and export", () => {
  const library = createAnimationLibrary({ builtins: BUILTIN_ANIMATIONS });
  const bindings = createAnimationBindings({ library });
  const original = library.getAnimation("sword_slash_01");
  const duplicate = library.duplicateAnimation(original.id);
  assert.notEqual(duplicate.id, original.id); assert.equal(duplicate.ownership.kind, "user");
  assert.throws(() => library.deleteAnimation(original.id), /cannot be deleted/);
  assert.throws(() => library.registerAnimation(original), /already exists/);
  library.updateAnimation(duplicate.id, { name: original.name, fps: 12 });
  assert.equal(library.getAnimation(original.id).fps, 30);
  bindings.setAnimation("spell:fireball", original.id);
  bindings.setAnimation("spell:fireball", duplicate.id);
  assert.equal(bindings.getAssignment("spell:fireball").animationId, duplicate.id);
  library.updateAnimation(duplicate.id, { sprite: "replacement.png" });
  assert.equal(library.getAnimation(duplicate.id).inset, 0);
  assert.equal(library.getAnimation(duplicate.id).atlas, null);
  assert.equal(library.searchAnimations("sword weapon").length, 2);
  assert.equal(library.getAnimationsByCategory("Sword").length, 2);
  const imported = library.importAnimation(JSON.parse(JSON.stringify(library.exportAnimation(duplicate.id))));
  assert.notEqual(imported.id, duplicate.id); assert.equal(imported.fps, 12);
  assert.equal(imported.ownership.scope, "session");
  bindings.setAnimation("spell:fireball", { animations: { cast: original.id, impact: imported.id } });
  assert.deepEqual(JSON.parse(JSON.stringify(bindings.exportAssignments()))["spell:fireball"].animations, { cast: original.id, impact: imported.id });
  library.updateAnimation(original.id, { fps: 18 }); library.resetAnimation(original.id);
  assert.equal(library.getAnimation(original.id).fps, 30);
  assert.equal(library.deleteAnimation(duplicate.id), true);
});

test("configured animations report readable errors and never silently clamp invalid input", () => {
  for (const [changes, message] of [[{ sprite: "" }, /sheet/], [{ grid: { columns: 0, rows: 6 } }, /Columns/],
    [{ grid: { columns: 6, rows: -1 } }, /Rows/], [{ fps: 0 }, /FPS/], [{ scale: -1 }, /Scale/],
    [{ frameCount: 37 }, /Frame count/], [{ frameCount: 0 }, /Frame count/], [{ playback: "reverse" }, /Once or Loop/],
    [{ anchorY: 2 }, /pivot/], [{ sprite: "javascript:alert(1)" }, /asset path/]]) {
    assert.throws(() => normalizeAnimation({ ...definition, ...changes }), message);
  }
});

test("metadata grids preserve every crop, rectangular aspect and partial rows including a single used cell", async () => {
  const f = fixture();
  for (const [columns, rows, count] of [[4,4,16],[5,5,25],[6,6,36],[7,7,49],[8,4,30],[6,6,30],[6,6,1]]) {
    f.library.updateAnimation("test_sheet", { grid: { columns, rows }, frameCount: count, fps: 30 });
    const result = await f.player.playAnimation("test_sheet", { x: 50, y: 90 });
    assert.equal(result.ok, true);
    const sprite = result.handles[0].effect.sprite;
    const frame = getSpriteFrameStyle(sprite, count - 1);
    assert.ok(Math.abs(parseFloat(frame.width) / parseFloat(frame.height) - (1200 / columns) / (600 / rows)) < .0001);
    const element = { style: {}, remove() { this.removed = true; } };
    const animator = createSpriteAnimator({ element, options: sprite, manual: true }); animator.start(0);
    const seen = [];
    for (let i = 0; i < count; i++) { animator.seek((i + .1) * 1000 / 30); seen.push(animator.getState().currentFrame); }
    assert.deepEqual(seen, Array.from({ length: count }, (_, i) => i));
    assert.equal(animator.getState().options.columns, columns);
    assert.equal(animator.getState().options.rows, rows);
    animator.seek(count / 30 * 1000 + 1); assert.equal(element.removed, true);
    f.advance(count / 30 * 1000 + 1); assert.equal(f.engine.getState().activeCount, 0);
    assert.deepEqual(await result.finished, ["completed"]);
  }
  f.destroy();
});

test("hot updates affect new plays; looping, rotation, offsets, flips and cancellation share the engine", async () => {
  const f = fixture();
  const first = await f.player.playAnimation("test_sheet", { fps: 18 });
  f.library.updateAnimation("test_sheet", { fps: 36, playback: "loop", offsetX: 8, offsetY: -4, anchorX: 0, anchorY: 1 });
  const loop = await f.player.playAnimation("test_sheet", { x: 50, y: 50, targetX: 50, targetY: 100, rotation: 15, flipX: true, scale: 2 });
  const effect = loop.handles[0].effect;
  assert.equal(first.handles[0].effect.sprite.framesPerSecond, 18);
  assert.equal(effect.sprite.framesPerSecond, 36); assert.equal(effect.rotation, 105); assert.equal(effect.scale, 2);
  assert.equal(effect.position.x, 58); assert.equal(effect.position.y, 46);
  assert.equal(effect.metadata.anchorX, 0); assert.equal(effect.metadata.anchorY, 1); assert.equal(effect.metadata.flipX, true);
  f.advance(90000); assert.equal(f.engine.getState().activeCount, 1); assert.equal(f.timers.size, 0);
  loop.cancel(); assert.deepEqual(await loop.finished, ["cancelled"]);
  assert.equal(f.visible.size, 0);
  await f.player.playAnimation("test_sheet"); f.engine.setMode("off");
  assert.equal(f.visible.size, 0); assert.equal((await f.player.playAnimation("test_sheet")).reason, "effects-off");
  f.destroy();
});

test("late decode, missing images, invalid overrides and capacity cannot leak partial sequences", async () => {
  let finish;
  const f = fixture({ preload: () => new Promise(resolve => { finish = resolve; }) });
  const controller = new AbortController(); const pending = f.player.playAnimation("test_sheet", { signal: controller.signal });
  controller.abort(); finish(true); assert.equal((await pending).reason, "cancelled");
  assert.equal(f.visible.size, 0); f.destroy();
  const bad = fixture({ preload: async () => false });
  assert.equal((await bad.player.playAnimation("test_sheet")).reason, "sprite-unavailable");
  assert.equal(bad.errors.length, 1); assert.equal(bad.timers.size, 0); bad.destroy();
  const full = fixture();
  for (let i = 0; i < 63; i++) full.engine.play({ type: "sprite", duration: 5000 });
  const result = await full.player.playSequence([{ animationId: "test_sheet", at: 0 }, { animationId: "test_sheet", at: 0 }]);
  assert.equal(result.reason, "core-capacity"); assert.equal(full.engine.getState().activeCount, 63);
  full.destroy();
});

test("spell assignments are optional, replace only visuals, and restore legacy playback on asset failure", async () => {
  const f = fixture(); const bindings = createAnimationBindings({ library: f.library });
  let oldPlays = 0;
  const legacy = { play: () => { oldPlays++; return { ok: true, old: true }; }, clear() {}, clearPreviews() {}, destroy() {}, getState: () => ({ activeCount: 0, sequences: [] }) };
  const adapter = createAnimationSpellAdapter({ legacy, player: f.player, library: f.library, bindings });
  const event = Object.freeze({ spellId: "fireball", targetPoint: Object.freeze({ x: 80, y: 90 }), preview: true });
  assert.equal(adapter.play(event).old, true);
  bindings.setAnimation("spell:fireball", "test_sheet");
  const custom = await adapter.play(event).ready;
  assert.equal(custom.handles[0].effect.metadata.animationId, "test_sheet"); assert.equal(oldPlays, 1);
  adapter.clearPreviews(); assert.equal(f.visible.size, 0); assert.equal(adapter.getState().activeCount, 0);
  bindings.setAnimation("spell:fireball", null); assert.equal(adapter.play(event).old, true);
  f.cache.preload = async () => false;
  bindings.setAnimation("spell:fireball", "test_sheet"); assert.equal((await adapter.play(event).ready).old, true);
  assert.equal(oldPlays, 3); assert.equal(f.visible.size, 0);
  const spell = Object.freeze({ id: "test", name: "Test", animationId: "test_sheet", animations: Object.freeze({ impact: "test_sheet" }) });
  const cast = createSpellVfxEvent({ spell }); assert.equal(cast.animationId, "test_sheet"); assert.ok(Object.isFrozen(cast.animations));
  adapter.destroy(); f.destroy();
});
