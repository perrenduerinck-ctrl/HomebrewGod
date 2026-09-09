import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { COMBAT_ANIMATIONS, createCombatEffectSystem, resolveCombatPlacement } from "../vfx/combatEffects.js";
import { createEffectEngine } from "../vfx/effectEngine.js";
import { createSpriteAnimator, getSpriteFrameStyle } from "../vfx/spriteAnimator.js";

function fixture(cacheOverrides = {}) {
  let time = 0, next = 0;
  const timers = new Map(), visible = new Map(), errors = [];
  const engine = createEffectEngine({ renderer: {
    render: e => visible.set(e.id, e), remove: id => visible.delete(id), clear: () => visible.clear()
  }, scheduler: { now: () => time,
    setTimeout(fn, ms) { timers.set(++next, { fn, at: time + ms }); return next; },
    clearTimeout: id => timers.delete(id) } });
  const cache = { preload: async () => true, getDimensions: () => ({ width: 1254, height: 1254 }), clear() {}, ...cacheOverrides };
  const player = createCombatEffectSystem({ engine, assetCache: cache, onError: e => errors.push(e) });
  function advance(ms) {
    const end = time + ms;
    while (true) {
      const next = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      time = next[1].at; timers.delete(next[0]); next[1].fn();
    }
    time = end;
  }
  return { player, engine, cache, timers, visible, errors, advance };
}

test("combat sprite is the supplied RGBA file and uses an inset within every 6x6 cell", async () => {
  const config = COMBAT_ANIMATIONS["melee.swordSlash"];
  const bytes = readFileSync(new URL("../" + config.src, import.meta.url));
  assert.equal(bytes.readUInt32BE(16), 1254); assert.equal(bytes.readUInt32BE(20), 1254);
  assert.equal(bytes[25], 6);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), "8b7514fe6739c31b059077eb27c3447c9029cd1c9ceee9d981f34b8ee5546e3d");
  const f = fixture(); const result = await f.player.playCombatEffect("swordSlash", { x: 0, y: 0 });
  const sprite = result.handles[0].effect.sprite;
  for (let frame = 0; frame < 36; frame++) {
    const style = getSpriteFrameStyle(sprite, frame);
    const scale = 160 / 201;
    const [x, y] = style.backgroundPosition.split(" ").map(parseFloat);
    assert.ok(Math.abs(x + ((frame % 6) * 209 + 4) * scale) < .001);
    assert.ok(Math.abs(y + (Math.floor(frame / 6) * 209 + 4) * scale) < .001);
    assert.equal(style.width, style.height);
  }
  f.player.destroy(); f.engine.destroy();
});

test("all 36 combat frames play forward at 18/24/30/36 FPS independently of display refresh", async () => {
  for (const fps of [18, 24, 30, 36]) {
    const f = fixture(); const result = await f.player.playCombatEffect("swordSlash", null, null, { fps });
    const effect = result.handles[0].effect;
    assert.equal(effect.duration, 36000 / fps);
    const element = { style: {}, remove() { this.removed = true; } };
    const animator = createSpriteAnimator({ element, options: effect.sprite, manual: true });
    animator.start(0);
    const frames = [];
    for (let t = 0; t < effect.duration; t += 1000 / 144) {
      animator.seek(t); const frame = animator.getState().currentFrame;
      if (frames.at(-1) !== frame) frames.push(frame);
    }
    assert.deepEqual(frames, Array.from({ length: 36 }, (_, i) => i));
    animator.seek(effect.duration + 1); assert.equal(element.removed, true);
    f.advance(effect.duration); assert.equal(f.engine.getState().activeCount, 0);
    assert.equal(f.timers.size, 0); assert.equal(f.visible.size, 0);
    f.player.destroy(); f.engine.destroy();
  }
});

test("combat placement handles eight directions, raised token bodies and fallback without mutations", () => {
  const attacker = Object.freeze({ x: 100, y: 100, width: 64 });
  for (const [dx, dy, angle] of [[1,0,0],[1,1,45],[0,1,90],[-1,1,135],[-1,0,180],[-1,-1,-135],[0,-1,-90],[1,-1,-45]]) {
    const target = Object.freeze({ x: 100 + dx * 80, y: 100 + dy * 80 });
    const result = resolveCombatPlacement(attacker, target);
    assert.equal(result.angle, angle);
    assert.deepEqual(result.position, { x: 100 + dx * 40, y: 100 + dy * 40 });
  }
  const body = { getBoundingClientRect: () => ({ left: 150, top: 70, width: 64, height: 64 }) };
  const token = { getBoundingClientRect: () => ({ left: 150, top: 130, width: 64, height: 64 }), querySelector: () => body };
  assert.deepEqual(resolveCombatPlacement(token, null, { overlayRect: { left: 50, top: 20 } }).attacker,
    { x: 132, y: 82, width: 64 });
  assert.equal(resolveCombatPlacement(attacker).angle, 0);
});

test("decode gating, failed images and cancellation never create late combat effects", async () => {
  let finish;
  const f = fixture({ preload: () => new Promise(resolve => { finish = resolve; }) });
  const pending = f.player.playCombatEffect("swordSlash");
  assert.equal(f.engine.getState().activeCount, 0);
  f.player.clear(); finish(true);
  assert.equal((await pending).reason, "cancelled"); assert.equal(f.visible.size, 0);
  const broken = fixture({ preload: async () => false });
  assert.equal((await broken.player.playCombatEffect("swordSlash")).ok, false);
  assert.match(broken.errors[0], /Unable to load combat sprite/);
  assert.equal(broken.timers.size, 0);
  f.player.destroy(); f.engine.destroy(); broken.player.destroy(); broken.engine.destroy();
});

test("invalid combat grids fail before loading and leave the engine usable", async () => {
  let loads = 0;
  const f = fixture({ preload: async () => { loads++; return true; } });
  for (const options of [{ columns: 0 }, { rows: 1.5 }, { frameCount: 37 },
    { src: " " }, { columns: 1000000000 }, { frameCount: 1 }]) {
    const result = await f.player.playCombatEffect("swordSlash", null, null, options);
    assert.equal(result.reason, "sprite-unavailable");
  }
  assert.equal(loads, 0);
  assert.equal(f.engine.getState().activeCount, 0);
  assert.equal(f.timers.size, 0);
  const definitions = f.engine.registry.list().length;
  assert.throws(() => createCombatEffectSystem({ engine: f.engine, assetCache: f.cache,
    animations: { broken: { ...COMBAT_ANIMATIONS["melee.swordSlash"], columns: 0 } } }), /Invalid sprite grid/);
  assert.equal(f.engine.registry.list().length, definitions);
  assert.equal((await f.player.playCombatEffect("swordSlash")).ok, true);
  assert.equal(loads, 1);
  f.player.destroy(); f.engine.destroy();
});

test("registered arbitrary grids, flips, simultaneous and sequential effects share cleanup without cancelling spells", async () => {
  const f = fixture({ getDimensions: src => src === "future.png"
    ? { width: 1000, height: 500 } : { width: 1254, height: 1254 } });
  f.player.register("defense.parry", { src: "future.png", columns: 5, rows: 5, frameCount: 25, fps: 25 });
  const other = createCombatEffectSystem({ engine: f.engine, assetCache: f.cache });
  await other.playCombatEffect("swordSlash");
  f.engine.play({ type: "procedural-pulse", duration: 5000 });
  const sequence = await f.player.playCombatSequence([
    { animation: "swordSlash", at: 0, flipX: true, rotationOffset: 45 },
    { animation: "defense.parry", at: 0, flipY: true }, "swordSlash"
  ], { x: 20, y: 20 }, { x: 80, y: 20 });
  assert.equal(sequence.ok, true);
  assert.deepEqual(sequence.handles.map(h => h.effect.delay), [0, 0, 1200]);
  assert.equal(sequence.handles[0].effect.rotation, 45);
  assert.equal(sequence.handles[1].effect.sprite.columns, 5);
  const parryStyle = getSpriteFrameStyle(sequence.handles[1].effect.sprite, 24);
  assert.equal(parryStyle.width, "160px"); assert.equal(parryStyle.height, "80px");
  assert.equal(sequence.handles[1].effect.metadata.flipY, true);
  assert.equal(f.engine.getState().activeCount, 5);
  f.player.clear(); assert.equal(f.engine.getState().activeCount, 2);
  f.advance(5000); assert.equal(f.visible.size, 0); assert.equal(f.timers.size, 0);
  f.engine.setMode("off"); assert.equal((await f.player.playCombatEffect("swordSlash")).reason, "effects-off");
  f.player.destroy(); other.destroy(); f.engine.destroy();
});
