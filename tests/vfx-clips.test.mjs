import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  createVfxAssetCache,
  getVfxClipSet,
  validateVfxAssetManifest,
  validateVfxClipDefinition,
  VFX_ASSET_MANIFEST,
  VFX_ASSET_STANDARDS
} from "../vfx/vfxAssetManifest.js";
import { createVfxClipController } from "../vfx/clipController.js";
import { createEffectEngine } from "../vfx/effectEngine.js";
import { createEffectRegistry } from "../vfx/effectRegistry.js";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));

function sprite({ columns, rows, frameCount = columns * rows, atlas } = {}) {
  return {
    src: "./test.png",
    columns,
    rows,
    frameCount,
    frameWidth: 64,
    frameHeight: 64,
    framesPerSecond: 24,
    startFrame: 0,
    endFrame: frameCount - 1,
    loop: false,
    ...(atlas ? { atlas } : {})
  };
}

test("clip validation preserves arbitrary grids and measured atlas boundaries", () => {
  for (const [columns, rows] of [[4,4],[5,5],[6,6],[6,4],[4,3],[6,7]]) {
    assert.deepEqual(validateVfxClipDefinition(sprite({ columns, rows })), []);
  }
  const measured = sprite({ columns: 2, rows: 2, frameCount: 4, atlas: {
    width: 140, height: 126,
    columns: [0, 63, 140], rows: [0, 59, 126]
  } });
  assert.deepEqual(validateVfxClipDefinition(measured), []);
  assert.match(validateVfxClipDefinition({ ...sprite({ columns: 4, rows: 3 }),
    frameCount: 13 })[0], /rows × columns/);
});

test("the central Fireball manifest points to real bounded clip assets", () => {
  const errors = validateVfxAssetManifest(VFX_ASSET_MANIFEST, {
    assetExists: (src) => existsSync(new URL(src.replace(/^\.\//, "../"), import.meta.url))
  });
  assert.deepEqual(errors, []);
  const clips = getVfxClipSet("fireball");
  assert.deepEqual(Object.keys(clips), ["charge", "release", "travel", "impact", "aftermath"]);
  assert.equal(clips.travel.loop, VFX_ASSET_STANDARDS.projectile.loop);
  assert.ok(clips.travel.endFrame - clips.travel.startFrame + 1 >= 8);
  assert.deepEqual(
    [clips.impact.columns, clips.impact.rows, clips.impact.frameCount],
    [6, 6, 36]
  );
  assert.equal(clips.charge.framesPerSecond, 20);
  assert.equal(clips.travel.framesPerSecond, 24);
  assert.equal(clips.impact.framesPerSecond, 30);
  assert.equal(clips.aftermath.framesPerSecond, 16);
  assert.equal(repositoryRoot.endsWith("HomebrewGod-large-lists\\") ||
    repositoryRoot.endsWith("HomebrewGod-large-lists/"), true);
});

test("one clip controller reuses its element, emits frame events and cancels old RAF work", () => {
  let time = 0;
  let nextHandle = 1;
  const pending = new Map();
  const requestFrame = (callback) => {
    const handle = nextHandle++;
    pending.set(handle, callback);
    return handle;
  };
  const cancelFrame = (handle) => pending.delete(handle);
  const events = [];
  const element = { style: {}, dataset: {} };
  const clips = getVfxClipSet("fireball");
  const controller = createVfxClipController({
    element, clips, initialClip: "charge", manual: true,
    requestFrame, cancelFrame, now: () => time,
    onEvent: (event) => events.push(event)
  });
  const identity = element;
  controller.seek(0);
  time = 250;
  controller.seek(time);
  assert.equal(events.some(({ id }) => id === "charge-glow"), true);
  assert.equal(controller.playClip("travel"), true);
  controller.seek(time);
  time = 500;
  controller.seek(time);
  assert.equal(element, identity);
  assert.equal(element.dataset.vfxClip, "travel");
  assert.equal(controller.getState().clipName, "travel");
  assert.equal(controller.getState().options.loop, true);
  controller.destroy();
  assert.equal(controller.getState().destroyed, true);

  const automaticElement = { style: {}, dataset: {} };
  const automatic = createVfxClipController({
    element: automaticElement, clips, initialClip: "charge", manual: false,
    requestFrame, cancelFrame, now: () => time
  });
  assert.equal(pending.size, 1);
  automatic.playClip("travel");
  assert.equal(pending.size, 1);
  automatic.destroy();
  assert.equal(pending.size, 0);
});

test("clip frame events can compose independent child effects through the engine", () => {
  const rendered = [];
  const hooks = new Map();
  const removed = [];
  const timers = new Map();
  let nextTimer = 1;
  const renderer = {
    connect() {}, setMode() {},
    render(effect, callbacks = {}) { rendered.push(effect); hooks.set(effect.id, callbacks); },
    remove(id) { removed.push(id); hooks.delete(id); },
    update() { return true; }, notifyTimelineEvent() {}
  };
  const registry = createEffectRegistry([
    { id: "clip-parent", kind: "sprite", className: "clip-parent",
      clips: { impact: sprite({ columns: 6, rows: 6 }) }, initialClip: "impact" },
    { id: "child-flash", kind: "procedural", className: "child-flash",
      particles: { count: 0 } }
  ]);
  const engine = createEffectEngine({ renderer, registry, scheduler: {
    now: () => 0,
    setTimeout(callback) { const id = nextTimer++; timers.set(id, callback); return id; },
    clearTimeout: (id) => timers.delete(id)
  } });
  const parent = engine.play({ type: "clip-parent", clip: "impact", duration: 900,
    position: { x: 40, y: 50 }, metadata: { spellId: "fireball" } });
  hooks.get(parent.id).onClipEvent({ id: "frame-flash", type: "spawn",
    clipName: "impact", effect: { type: "child-flash", duration: 120 } });
  assert.equal(rendered.length, 2);
  assert.equal(rendered[1].type, "child-flash");
  assert.deepEqual(rendered[1].position, { x: 40, y: 50, xRatio: null, yRatio: null });
  assert.equal(rendered[1].metadata.parentEffectId, parent.id);
  assert.equal(rendered[1].metadata.clipName, "impact");
  engine.clear();
  assert.equal(timers.size, 0);
  assert.equal(removed.length, 2);
});

test("the recently-used asset cache stays bounded and loads only requested clips", async () => {
  const requested = [];
  const cache = createVfxAssetCache({ maximumEntries: 2, createImage: () => {
    const image = {};
    Object.defineProperty(image, "src", { set(value) {
      requested.push(value);
      queueMicrotask(() => image.onload());
    } });
    return image;
  } });
  await cache.preload("one.png");
  await cache.preload("two.png");
  await cache.preload("three.png");
  assert.deepEqual(requested, ["one.png", "two.png", "three.png"]);
  assert.deepEqual(cache.getState().sources, ["two.png", "three.png"]);
});
