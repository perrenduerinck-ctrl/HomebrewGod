import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createSpriteAnimator, getSpriteFrameStyle } from "../vfx/spriteAnimator.js";
import { createCastingSequenceSystem, createDefaultCastingSequenceRegistry } from "../vfx/castingSequence.js";
import { createEffectEngine } from "../vfx/effectEngine.js";
import { createSpellVfxEvent } from "../vfx/castEvent.js";
import { createTemplateGeometry } from "../battleMap/templateGeometry.js";
import { getDefaultSpellById } from "../data/defaultSpells.js";
import { getCantripSpritePaths } from "../vfx/cantripEffects.js";
import { LIGHTNING_5X5_ASSET, LIGHTNING_5X5_EFFECTS } from "../vfx/lightning5x5.js";

function harness(mode, fail = false) {
  let time = 0, next = 0;
  const timers = new Map(), visible = new Set(), requests = [];
  const scheduler = { now: () => time,
    setTimeout(fn, delay) { const id = ++next; timers.set(id, { fn, at: time + delay }); return id; },
    clearTimeout(id) { timers.delete(id); } };
  const engine = createEffectEngine({ mode, scheduler, renderer: {
    render(effect) { requests.push(effect); if (fail) throw Error("visual failure"); visible.add(effect.id); },
    remove(id) { visible.delete(id); }, clear() { visible.clear(); }
  } });
  const system = createCastingSequenceSystem({ effectEngine: engine, scheduler });
  return { timers, visible, requests, engine, system, finish() {
    let limit = 10000;
    while (timers.size && --limit) {
      const [id, timer] = [...timers].sort((a,b) => a[1].at - b[1].at)[0];
      timers.delete(id); time = timer.at; timer.fn();
    }
    assert.ok(limit > 0);
  } };
}
function bolt(dx = 1, dy = 0, preview = true) {
  const casterPoint = { x: 200, y: 200 }, targetPoint = { x: 200 + dx * 30, y: 200 + dy * 30 };
  return createSpellVfxEvent({ spell: getDefaultSpellById("lightning-bolt"), casterPoint, targetPoint, preview,
    geometry: createTemplateGeometry({ shape: "line", anchor: casterPoint, pointer: targetPoint,
      sizeFeet: 100, widthFeet: 5, pixelsPerSquare: 50, feetPerSquare: 5 }),
    affectedTokens: Array.from({length: 300}, (_, i) => ({ id: String(i), center: { x: 200 + i, y: 200 } })) });
}

test("5x5 plays all 25 frames, 4x4 retains all 16, and repeated RAFs do not rewrite a frame", () => {
  for (const grid of [5, 4]) {
    let next = 0, removed = false, writes = 0;
    const callbacks = new Map(), seen = new Set();
    const style = new Proxy({}, { set(target, key, value) { target[key] = value; if (key === "backgroundPosition") writes++; return true; } });
    const options = { columns: grid, rows: grid, frameCount: grid * grid,
      frameWidth: 160, frameHeight: 160, framesPerSecond: 24, loop: false };
    const animator = createSpriteAnimator({ element: { style, remove() { removed = true; } }, options,
      requestFrame(fn) { callbacks.set(++next, fn); return next; }, cancelFrame(id) { callbacks.delete(id); } });
    const tick = time => { const work = [...callbacks.values()]; callbacks.clear(); work.forEach(fn => fn(time)); };
    animator.start(); tick(0); tick(1); tick(2);
    assert.equal(writes, 1);
    for (let frame = 0; frame < grid * grid; frame++) {
      tick(frame * 1000 / 24 + .01);
      seen.add(style.backgroundPosition);
      assert.equal(style.backgroundPosition, getSpriteFrameStyle(options, frame).backgroundPosition);
    }
    assert.equal(seen.size, grid * grid);
    assert.equal(style.backgroundSize, `${160 * grid}px ${160 * grid}px`);
    tick(grid * grid * 1000 / 24 + 1);
    assert.equal(animator.getState().completed, true); assert.equal(removed, true);
    assert.equal(callbacks.size, 0); assert.equal(writes, grid * grid);
  }
});

test("one supplied 5x5 texture is lazy-loaded; the 4x4 comparison remains available", () => {
  const options = LIGHTNING_5X5_EFFECTS.find(d => d.id === "lightning5-main").sprite;
  assert.equal(options.columns, 5); assert.equal(options.rows, 5); assert.equal(options.frameCount, 25);
  assert.equal(options.loop, false); assert.equal(options.framesPerSecond, 24);
  const png = readFileSync(new URL("../" + LIGHTNING_5X5_ASSET, import.meta.url));
  assert.equal(png.readUInt32BE(16), 1254); assert.ok(png.length < 2100000);
  assert.deepEqual(getCantripSpritePaths("lightning-bolt"), [LIGHTNING_5X5_ASSET]);
  assert.equal(getCantripSpritePaths("lightning-bolt", { lightningVariant: "4x4" }).length, 2);
  const registry = createDefaultCastingSequenceRegistry();
  assert.equal(registry.resolve(bolt()).id, "lightning-bolt-5x5-test");
  assert.equal(registry.get("profile-lightning-bolt", bolt()).id, "profile-lightning-bolt");
  for (const id of ["fire-bolt", "fireball", "ray-of-frost", "ice-storm"]) {
    assert.notEqual(registry.resolve(createSpellVfxEvent({spell:getDefaultSpellById(id)})).id, "lightning-bolt-5x5-test");
  }
});

test("preview and confirmed casts align in eight directions without per-target effects or event mutation", () => {
  for (const preview of [true, false]) for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]) {
    const event = bolt(dx,dy,preview), before = JSON.stringify(event), h = harness("full");
    h.system.play(event); h.finish();
    assert.equal(h.requests.length, 2);
    const main = h.requests.find(r => r.type === "lightning5-main");
    assert.deepEqual(main.startPosition, event.casterPoint);
    assert.deepEqual(main.endPosition, event.geometry.directionPoint);
    assert.equal(Math.sign(main.endPosition.x - main.startPosition.x), dx);
    assert.equal(Math.sign(main.endPosition.y - main.startPosition.y), dy);
    assert.ok(Math.abs(Math.hypot(main.endPosition.x - main.startPosition.x, main.endPosition.y - main.startPosition.y) - 1000) < .001);
    assert.ok(h.requests.every(r => !r.persistent && !r.metadata.affectedTokenId && r.particles.count === 0));
    assert.equal(JSON.stringify(event), before);
    assert.equal(h.visible.size, 0); assert.equal(h.timers.size, 0);
  }
});

test("Full=2 / Reduced=1 / Off=0, and repeated playback, cancellation, and failures clean up", () => {
  for (const [mode, count] of [["full",2],["reduced",1],["off",0]]) for (const fail of [false,true]) {
    const h = harness(mode, fail); h.system.play(bolt()); h.finish();
    assert.equal(h.requests.length, count);
    if (mode === "reduced") assert.equal(h.requests[0].type, "lightning5-main");
    for (let i=0; i<100; i++) h.system.play(bolt());
    assert.ok(h.system.getState().activeCount <= 16); assert.ok(h.engine.getState().activeCount <= 64);
    h.system.clearPreviews(); h.finish();
    assert.equal(h.visible.size, 0); assert.equal(h.timers.size, 0);
    assert.equal(h.system.getState().activeCount, 0);
  }
});
