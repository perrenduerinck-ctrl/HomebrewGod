import assert from "node:assert/strict";
import test from "node:test";

import { createEffectEngine, normalizeEffectRequest } from "../vfx/effectEngine.js";
import { resolveAttachmentGroundPoint } from "../vfx/effectRenderer.js";
import { createEffectRegistry } from "../vfx/effectRegistry.js";
import {
  EFFECT_LAYER_ORDER,
  getDepthSortValue,
  normalizeEffectLayer
} from "../vfx/effectLayers.js";
import { applyEffectPreset } from "../vfx/effectPresets.js";
import { normalizeEffectTimeline } from "../vfx/effectTimeline.js";
import {
  calculateHeightScale,
  calculateMotion25d,
  calculateShadow25d,
  normalizeMotion25d,
  resolveMotionDuration
} from "../vfx/motion25d.js";
import {
  createSpriteAnimator,
  normalizeSpriteOptions
} from "../vfx/spriteAnimator.js";

function createScheduler() {
  let timestamp = 0;
  let nextHandle = 1;
  const tasks = new Map();
  return {
    now: () => timestamp,
    setTimeout(callback, delay) {
      const handle = nextHandle++;
      tasks.set(handle, { callback, dueAt: timestamp + Math.max(0, Number(delay) || 0) });
      return handle;
    },
    clearTimeout: (handle) => tasks.delete(handle),
    advance(milliseconds) {
      const target = timestamp + milliseconds;
      while (true) {
        const next = [...tasks.entries()]
          .filter(([, task]) => task.dueAt <= target)
          .sort((left, right) => left[1].dueAt - right[1].dueAt || left[0] - right[0])[0];
        if (!next) break;
        const [handle, task] = next;
        tasks.delete(handle);
        timestamp = task.dueAt;
        task.callback();
      }
      timestamp = target;
    },
    pending: () => tasks.size
  };
}

test("fake Z projects screenY as world Y minus Z without changing XY", () => {
  const state = calculateMotion25d({
    progress: 0.5,
    start: { x: 10, y: 100 },
    end: { x: 110, y: 100 },
    motion: { type: "arc", maxZ: 40, rotationMode: "direction" }
  });
  assert.equal(state.x, 60);
  assert.equal(state.y, 100);
  assert.equal(state.z, 40);
  assert.equal(state.screenY, 60);
  assert.equal(state.rotation, 0);
});

test("movement, scale, rotation and shadow helpers cover reusable 2.5D modes", () => {
  for (const type of [
    "straight", "arc", "lob", "falling", "rising", "hovering", "homing"
  ]) {
    assert.equal(normalizeMotion25d({ type }).type, type);
  }
  const spin = calculateMotion25d({
    progress: 0.5,
    start: { x: 0, y: 0 },
    end: { x: 20, y: 0 },
    motion: { type: "straight", rotationMode: "spin", spins: 1 }
  });
  assert.equal(spin.rotation, 180);
  assert.equal(calculateHeightScale(100, {
    enabled: true, amount: 0.002, maximum: 2
  }), 1.2);
  assert.deepEqual(calculateShadow25d(90, {
    opacity: 0.6, fadeDistance: 180, shrinkDistance: 180
  }), { opacity: 0.3, scale: 0.5 });
  assert.equal(resolveMotionDuration({
    speed: 100,
    start: { x: 0, y: 0 },
    end: { x: 100, y: 0 }
  }), 1000);
});

test("token attachments recover ground Y so elevation is projected exactly once", () => {
  const point = resolveAttachmentGroundPoint({
    tokenRect: { left: 100, top: 140, width: 40, height: 40 },
    overlayRect: { left: 20, top: 30 },
    visualZ: 24,
    mapScale: 1.5
  });
  assert.equal(point.x, 100);
  assert.equal(point.y, 166);
  assert.equal(point.z, 36);
  assert.equal(point.y - point.z, 130);
});

test("effect layers and presets remain explicit and reusable", () => {
  assert.deepEqual(EFFECT_LAYER_ORDER, [
    "ground", "shadows", "tokens", "airborne", "overhead", "ui"
  ]);
  assert.equal(normalizeEffectLayer("OVERHEAD"), "overhead");
  assert.equal(normalizeEffectLayer("unknown"), "airborne");
  assert.ok(getDepthSortValue({ layer: "ground", y: 900 }) <
    getDepthSortValue({ layer: "airborne", y: 0 }));
  const projectile = applyEffectPreset({
    preset: "projectile",
    motion: { maxZ: 144 }
  });
  assert.equal(projectile.layer, "airborne");
  assert.equal(projectile.motion.type, "arc");
  assert.equal(projectile.motion.maxZ, 144);
  assert.equal(projectile.shadow.enabled, true);
  for (const preset of [
    "projectile", "explosion", "aura", "ground-effect", "overhead",
    "attached-status", "beam", "weather"
  ]) {
    assert.ok(applyEffectPreset({ preset }).layer, preset);
  }
});

test("timeline accepts percentages and timestamps in deterministic order", () => {
  const events = normalizeEffectTimeline([
    { id: "impact", type: "spawn", at: 1, effect: { type: "impact" } },
    { id: "layer", type: "layer", atMs: 50, layer: "overhead" }
  ], 100);
  assert.deepEqual(events.map(({ id, atMilliseconds }) => [id, atMilliseconds]), [
    ["layer", 50], ["impact", 100]
  ]);
});

test("normalized projectile requests support speed, attachment and generic sprite options", () => {
  const effect = normalizeEffectRequest({
    preset: "projectile",
    startPosition: { x: 0, y: 0 },
    endPosition: { x: 200, y: 0 },
    motion: { speed: 200, maxZ: 80 },
    attachment: { tokenId: "hero", position: "orbit", cycles: 2 },
    sprite: { columns: 6, rows: 7, frameCount: 42, startFrame: 3, endFrame: 30 }
  }, {
    id: "test-1",
    definition: { id: "projectile", kind: "sprite" },
    mode: "full"
  });
  assert.equal(effect.duration, 1000);
  assert.equal(effect.motion.type, "arc");
  assert.equal(effect.motion.maxZ, 80);
  assert.equal(effect.attachment.position, "orbit");
  assert.equal(effect.sprite.frameCount, 42);
});

test("impact timeline events spawn follow-ups and change layers without leaking timers", () => {
  const scheduler = createScheduler();
  const rendered = [];
  const removed = [];
  const updated = [];
  const renderer = {
    connect() {},
    setMode() {},
    render(effect) { rendered.push(effect); },
    remove(id) { removed.push(id); },
    update(id, changes) { updated.push([id, changes]); },
    clear() {},
    destroy() {}
  };
  const registry = createEffectRegistry([
    { id: "projectile", kind: "procedural" },
    { id: "impact", kind: "procedural" }
  ]);
  const engine = createEffectEngine({ renderer, registry, scheduler });
  const result = engine.play({
    type: "projectile",
    startPosition: { x: 0, y: 0 },
    endPosition: { x: 100, y: 0 },
    duration: 100,
    motion: { type: "arc", maxZ: 30 },
    timeline: [
      { id: "rise", type: "layer", at: 0.5, layer: "overhead" },
      { id: "hit", type: "spawn", at: 1,
        effect: { type: "impact", duration: 25 } }
    ]
  });
  assert.equal(result.ok, true);
  scheduler.advance(50);
  assert.deepEqual(updated, [[result.id, { layer: "overhead" }]]);
  scheduler.advance(50);
  assert.deepEqual(rendered.map(({ type }) => type), ["projectile", "impact"]);
  assert.equal(engine.getState().activeCount, 1);
  scheduler.advance(25);
  assert.equal(engine.getState().activeCount, 0);
  assert.equal(scheduler.pending(), 0);
  assert.equal(removed.length, 2);
});

test("zero-time follow-ups at the effect cap do not leave an orphan timer", () => {
  const scheduler = createScheduler();
  const renderer = {
    connect() {}, setMode() {}, render() {}, remove() {}, clear() {}, destroy() {}
  };
  const registry = createEffectRegistry([
    { id: "parent", kind: "procedural" },
    { id: "child", kind: "procedural" }
  ]);
  const engine = createEffectEngine({
    renderer, registry, scheduler, maximumActiveEffects: 1
  });
  engine.play({
    type: "parent",
    duration: 100,
    timeline: [{ at: 0, type: "spawn", effect: { type: "child", duration: 25 } }]
  });
  assert.equal(engine.getState().activeCount, 1);
  assert.equal(scheduler.pending(), 1);
  scheduler.advance(25);
  assert.equal(engine.getState().activeCount, 0);
  assert.equal(scheduler.pending(), 0);
});

test("manual sprite playback uses a shared caller frame instead of its own RAF", () => {
  let scheduled = 0;
  const style = {};
  const element = { style, remove() {} };
  const animator = createSpriteAnimator({
    element,
    options: {
      src: "sheet.png", frameWidth: 32, frameHeight: 32,
      frameCount: 4, columns: 2, rows: 2, framesPerSecond: 10
    },
    manual: true,
    requestFrame() { scheduled += 1; return scheduled; }
  });
  animator.start();
  animator.seek(0);
  animator.seek(100);
  assert.equal(scheduled, 0);
  assert.equal(animator.getState().currentFrame, 1);
  assert.equal(style.backgroundPosition, "-32px 0px");
  animator.destroy();
});

test("sprite sheets accept future grids and either FPS or frame duration", () => {
  const sprite = normalizeSpriteOptions({
    src: "future-sheet.png",
    columns: 6,
    rows: 7,
    frameCount: 42,
    frameDuration: 50,
    startFrame: 4,
    endFrame: 39
  });
  assert.equal(sprite.columns, 6);
  assert.equal(sprite.rows, 7);
  assert.equal(sprite.frameCount, 42);
  assert.equal(sprite.framesPerSecond, 20);
});
