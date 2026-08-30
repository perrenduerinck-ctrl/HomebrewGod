import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getDefaultSpellById } from "../data/defaultSpells.js";
import { createSpellVfxEvent } from "../vfx/castEvent.js";
import { createDefaultCastingSequenceRegistry, createCastingSequenceSystem } from "../vfx/castingSequence.js";
import { createDefaultEffectRegistry } from "../vfx/effectRegistry.js";
import { createEffectEngine } from "../vfx/effectEngine.js";
import { createTemplateGeometry } from "../battleMap/templateGeometry.js";
import { normalizeSpriteOptions, createSpriteAnimator } from "../vfx/spriteAnimator.js";
import { STORM_EFFECT_DEFINITIONS, STORM_ASSETS, stormParticleLayout } from "../vfx/stormEffects.js";
import { getCantripSpritePaths } from "../vfx/cantripEffects.js";

function harness(mode = "full", fail = false) {
  let time = 0, id = 0;
  const tasks = new Map(), requests = [], visible = new Map();
  const scheduler = { now: () => time,
    setTimeout(fn, ms) { const key = ++id; tasks.set(key, { fn, at: time + ms }); return key; },
    clearTimeout(key) { tasks.delete(key); } };
  const engine = createEffectEngine({ mode, scheduler, renderer: {
    render(effect) { requests.push(effect); if (fail) throw Error("visual failure"); visible.set(effect.id, effect); },
    remove(key) { visible.delete(key); }, clear() { visible.clear(); }
  } });
  const system = createCastingSequenceSystem({ effectEngine: engine, scheduler });
  return { requests, visible, tasks, engine, system,
    finish() {
      let limit = 10000;
      while (tasks.size && --limit) {
        const [key, task] = [...tasks].sort((a,b) => a[1].at - b[1].at)[0];
        tasks.delete(key); time = task.at; task.fn();
      }
      assert.ok(limit > 0);
    } };
}

function eventFor(id, pointer = { x: 230, y: 160 }) {
  const spell = getDefaultSpellById(id), casterPoint = { x: 200, y: 160 };
  const geometry = createTemplateGeometry({ shape: id === "lightning-bolt" ? "line" : "cylinder",
    anchor: casterPoint, pointer, sizeFeet: id === "lightning-bolt" ? 100 : 20,
    widthFeet: 5, heightFeet: id === "ice-storm" ? 40 : 0,
    pixelsPerSquare: 50, feetPerSquare: 5 });
  return createSpellVfxEvent({ spell, casterPoint, targetPoint: pointer, geometry, preview: true });
}

test("storm spells resolve through profiles and preload only their required artwork", () => {
  const registry = createDefaultCastingSequenceRegistry(), effects = createDefaultEffectRegistry();
  for (const id of ["lightning-bolt", "ice-storm"]) {
    const sequence = registry.resolve(eventFor(id));
    assert.equal(sequence.source, "profile");
    assert.equal(sequence.id, "profile-" + id);
    assert.ok(sequence.totalDuration < 5000);
    for (const phase of sequence.phases) for (const effect of phase.effects) assert.ok(effects.has(effect.type));
  }
  assert.deepEqual(getCantripSpritePaths("lightning-bolt").sort(), [STORM_ASSETS.charge, STORM_ASSETS.impact].sort());
  assert.deepEqual(getCantripSpritePaths("ice-storm"), [STORM_ASSETS.ice]);
  for (const path of Object.values(STORM_ASSETS)) {
    const png = readFileSync(new URL("../" + path, import.meta.url));
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert.equal(png.readUInt32BE(16), 1254);
  }
  assert.equal(STORM_EFFECT_DEFINITIONS.find(d => d.id === "storm-lightning-impact").blendMode, "screen");
  const bolt = STORM_EFFECT_DEFINITIONS.find(d => d.id === "storm-lightning-beam");
  assert.equal(bolt.sprite.startFrame, 4);
  assert.equal(bolt.sprite.endFrame, 11);
  assert.equal(bolt.blendMode, "screen");
});

test("Lightning Bolt follows the full 100-ft line in all eight directions, not the aiming distance", () => {
  for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]) {
    const event = eventFor("lightning-bolt", { x: 200 + dx * 30, y: 160 + dy * 30 });
    const before = JSON.stringify(event), h = harness();
    h.system.play(event); h.finish();
    const beam = h.requests.find(r => r.type === "storm-lightning-beam");
    const echo = h.requests.find(r => r.type === "storm-lightning-echo");
    const impact = h.requests.find(r => r.type === "storm-lightning-impact");
    assert.deepEqual(beam.startPosition, event.casterPoint);
    assert.deepEqual(beam.endPosition, event.geometry.directionPoint);
    assert.deepEqual(impact.position, beam.endPosition);
    assert.deepEqual(echo.endPosition, beam.endPosition);
    assert.ok(Math.abs(Math.hypot(beam.endPosition.x - beam.startPosition.x,
      beam.endPosition.y - beam.startPosition.y) - 1000) < .01);
    assert.equal(JSON.stringify(event), before);
  }
});

test("Ice Storm gathers, rains hail, and leaves frost at the template center with exact area scale", () => {
  const event = eventFor("ice-storm", { x: 340, y: 260 }), h = harness();
  h.system.play(event); h.finish();
  for (const type of ["storm-cloud", "storm-hail", "storm-frost"]) {
    const effect = h.requests.find(r => r.type === type);
    assert.deepEqual(effect.position, event.targetPoint);
    assert.equal(effect.scale * 160, 400, "level intensity must not expand the gameplay radius");
    assert.equal(effect.startPosition, null, "hail falls locally, never flies from caster");
    assert.equal(effect.persistent, false);
  }
  assert.ok(h.requests.every(r => r.metadata.preview && !r.metadata.casterTokenId));
});

test("storm particles stay inside the footprint and Full / Reduced / Off and failures clean up", () => {
  assert.equal(stormParticleLayout(999).length, 32);
  for (const point of stormParticleLayout(32)) assert.ok(Math.hypot(point.x - 50, point.y - 50) < 40);
  for (const mode of ["full", "reduced", "off"]) for (const fail of [false,true]) {
    const h = harness(mode, fail);
    for (let i = 0; i < 60; i++) h.system.play(eventFor(i % 2 ? "ice-storm" : "lightning-bolt"));
    assert.ok(h.system.getState().activeCount <= 16);
    assert.ok(h.engine.getState().activeCount <= 64);
    h.finish();
    assert.equal(h.visible.size, 0); assert.equal(h.tasks.size, 0);
    assert.equal(h.system.getState().activeCount, 0);
    if (mode === "off") assert.equal(h.requests.length, 0);
    if (mode === "reduced") assert.ok(h.requests.every(r => r.duration <= 1000 && r.intensity <= 2));
    h.system.play(eventFor("ice-storm")); h.system.clearPreviews(); h.finish();
    assert.equal(h.visible.size, 0);
  }
});

test("sprite frame windows reuse the animator without ever playing unrelated sheet rows", () => {
  const options = normalizeSpriteOptions({ frameCount: 16, columns: 4, rows: 4,
    startFrame: 4, endFrame: 7, framesPerSecond: 10, frameWidth: 160, frameHeight: 160 });
  const frames = new Map(); let next = 0;
  const element = { style: {}, remove() {} };
  const animator = createSpriteAnimator({ element, options,
    requestFrame(fn) { frames.set(++next, fn); return next; },
    cancelFrame(id) { frames.delete(id); } });
  const step = time => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn(time)); };
  animator.start(); step(0);
  assert.equal(element.style.backgroundPosition, "0px -160px");
  step(300); assert.equal(element.style.backgroundPosition, "-480px -160px");
  step(400); assert.equal(animator.getState().completed, true); assert.equal(frames.size, 0);
  const clamped = normalizeSpriteOptions({ frameCount: 16, startFrame: 999, endFrame: -10 });
  assert.equal(clamped.startFrame, 15); assert.equal(clamped.endFrame, 15);
});
