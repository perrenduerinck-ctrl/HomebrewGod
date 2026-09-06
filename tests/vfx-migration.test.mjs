import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import test from "node:test";
import { createSpriteAnimator } from "../vfx/spriteAnimator.js";
import { createVfxClipController } from "../vfx/clipController.js";
import { getVfxAssetMode, resolveVfxClipDefinition } from "../vfx/assetVersions.js";
import { createVfxAssetCache, getVfxClipSet, VFX_ASSET_MANIFEST,
  validateVfxAssetManifest, validateVfxClipDefinition } from "../vfx/vfxAssetManifest.js";
import { VFX_MIGRATION_MANIFEST, VFX_MIGRATION_LABELS } from "../vfx/vfxMigrationManifest.js";

const legacy = { src: "old.png", columns: 4, rows: 4, frameCount: 16,
  frameWidth: 160, frameHeight: 160, startFrame: 0, endFrame: 15,
  framesPerSecond: 16, loop: false, events: [{ id: "burst", progress: .2 }] };
const modern6x6 = { ...legacy, src: "new.png", columns: 6, rows: 6,
  frameCount: 36, endFrame: 35, framesPerSecond: 36 };
const versioned = { preferred: "modern6x6", legacy, modern6x6 };

function fixture(clips = { impact: versioned }, extra = {}) {
  let time = 0;
  const images = new Map();
  const errors = [];
  const events = [];
  const assetCache = createVfxAssetCache({ createImage: () => {
    const image = {};
    Object.defineProperty(image, "src", { set(src) { images.set(src, image); } });
    return image;
  }, onError: error => errors.push(error) });
  const element = { style: {}, dataset: {} };
  const controller = createVfxClipController({ element, clips, initialClip: "impact",
    manual: true, now: () => time, assetCache, onEvent: event => events.push(event), ...extra });
  return { controller, element, images, errors, events, assetCache,
    seek(timestamp) { time = timestamp; controller.seek(timestamp); },
    async finish(src, ok) { images.get(src)[ok ? "onload" : "onerror"]();
      await new Promise(resolve => setImmediate(resolve)); }
  };
}

test("unversioned, missing, disabled and invalid modern entries safely select legacy", () => {
  assert.equal(resolveVfxClipDefinition(legacy), legacy);
  assert.equal(resolveVfxClipDefinition(versioned).src, modern6x6.src);
  for (const modern of [undefined, { ...modern6x6, src: "" },
    { ...modern6x6, enabled: false }, { ...modern6x6, frameCount: 35 }]) {
    assert.equal(resolveVfxClipDefinition({ ...versioned, modern6x6: modern }).src, legacy.src);
  }
  assert.equal(resolveVfxClipDefinition(versioned, {
    assetAvailable: src => src !== modern6x6.src
  }).src, legacy.src);
  assert.equal(resolveVfxClipDefinition({ ...versioned, preferred: "legacy" }).src, legacy.src);
  assert.equal(resolveVfxClipDefinition(versioned, { mode: "legacy" }).src, legacy.src);
  assert.equal(resolveVfxClipDefinition({ ...versioned, preferred: "legacy" }, {
    mode: "modern6x6"
  }).src, modern6x6.src);
});

test("4x4, 5x5, 6x7, single frames and partial atlases retain playback options", () => {
  for (const [columns, rows, frameCount] of [[4,4,16],[5,5,25],[6,7,42],[1,1,1],[4,3,10]]) {
    const clip = { ...legacy, columns, rows, frameCount, endFrame: frameCount - 1 };
    assert.deepEqual(validateVfxClipDefinition(clip), []);
    const controller = createVfxClipController({ element: { style: {}, dataset: {} },
      clips: { impact: clip }, manual: true, now: () => 0, assetMode: "modern6x6" });
    const options = controller.getState().options;
    assert.deepEqual([options.columns, options.rows, options.frameCount], [columns, rows, frameCount]);
    controller.seek(0);
    controller.seek((frameCount - 1) / clip.framesPerSecond * 1000);
    assert.equal(controller.getState().currentFrame, frameCount - 1);
    controller.destroy();
  }
  const element = { style: {} };
  const animator = createSpriteAnimator({ element, manual: true, options: {
    ...legacy, columns: 2, rows: 2, frameCount: 4, startFrame: 1, endFrame: 2, loop: true,
    atlas: { width: 140, height: 126, columns: [0,63,140], rows: [0,59,126] }
  } });
  animator.start(0); animator.seek(2000);
  assert.equal(animator.getState().running, true);
  assert.equal(animator.getState().currentFrame, 1);
  assert.ok(element.style.backgroundSize);
  animator.destroy();
});

test("cold modern load shows legacy, then changes sheets without resetting progress or events", async () => {
  const f = fixture();
  await f.finish("old.png", true);
  assert.match(f.element.style.backgroundImage, /old\.png/);
  f.seek(300);
  assert.equal(f.events.filter(event => event.id === "burst").length, 1);
  await f.finish("new.png", true);
  assert.match(f.element.style.backgroundImage, /new\.png/);
  assert.equal(f.element.dataset.spriteFrames, "36");
  assert.equal(f.controller.getState().currentFrame, 10);
  f.seek(700);
  assert.equal(f.events.filter(event => event.id === "burst").length, 1);
  f.controller.destroy();
});

test("a failed modern image leaves the real legacy animation playing", async () => {
  const f = fixture();
  await f.finish("old.png", true);
  await f.finish("new.png", false);
  f.seek(500);
  assert.equal(f.assetCache.getStatus("new.png"), "failed");
  assert.match(f.element.style.backgroundImage, /old\.png/);
  assert.equal(f.controller.getState().currentFrame, 8);
  assert.equal(f.element.dataset.vfxAssetVersion, "legacy");
  f.controller.playClip("impact");
  assert.equal(f.element.dataset.spriteColumns, "4");
  assert.equal(f.errors.length, 1);
  f.controller.destroy();
});

test("late loads cannot replace a new clip, restart stopped playback or recreate destroyed sprites", async () => {
  for (const action of ["change", "stop", "destroy", "complete"]) {
    const f = fixture({ impact: versioned, charge: { ...legacy, src: "charge.png" } });
    if (action === "change") f.controller.playClip("charge");
    if (action === "stop") f.controller.stop();
    if (action === "destroy") f.controller.destroy();
    if (action === "complete") f.seek(1500);
    const before = f.element.style.backgroundImage;
    await f.finish("new.png", true);
    assert.equal(f.element.style.backgroundImage, before, action);
    if (action === "stop") assert.equal(f.controller.getState().running, false);
    f.controller.destroy();
  }
});

test("forcing legacy or disabling modern does not request the modern sheet", () => {
  for (const extra of [{ assetMode: "legacy" }, {}]) {
    const clip = extra.assetMode ? versioned : {
      ...versioned, modern6x6: { ...modern6x6, enabled: false }
    };
    const f = fixture({ impact: clip }, extra);
    assert.deepEqual([...f.images.keys()], ["old.png"]);
    f.controller.destroy();
  }
});

test("unversioned clip events retain exact progress instead of rounding to a new frame", () => {
  const f = fixture({ impact: { ...legacy, events: [{ id: "exact-progress", progress: .55 }] } });
  f.seek(540);
  assert.equal(f.events.length, 0);
  f.seek(550);
  assert.equal(f.events.length, 1);
  f.controller.destroy();
});

test("developer selection is ignored on player hosts", () => {
  for (const hostname of ["localhost", "127.0.0.1", "[::1]"]) {
    assert.equal(getVfxAssetMode({ hostname, search: "?vfxAssets=legacy" }), "legacy");
  }
  assert.equal(getVfxAssetMode({ hostname: "game.example", search: "?vfxAssets=legacy" }), "auto");
  assert.equal(getVfxAssetMode({ hostname: "localhost", search: "?vfxAssets=invalid" }), "auto");
});

test("both real Fireball versions validate, and only the major upgraded clips change", () => {
  assert.deepEqual(validateVfxAssetManifest(VFX_ASSET_MANIFEST, {
    assetExists: src => existsSync(new URL(src.replace(/^\.\//, "../"), import.meta.url))
  }), []);
  const current = getVfxClipSet("fireball");
  const previous = getVfxClipSet("fireball", { mode: "legacy" });
  for (const name of ["charge", "release", "travel"]) assert.deepEqual(current[name], previous[name]);
  for (const name of ["impact", "aftermath"]) {
    assert.equal(current[name].frameCount, 36);
    assert.equal(previous[name].frameCount, 16);
    assert.ok(existsSync(new URL(previous[name].src.replace(/^\.\//, "../"), import.meta.url)));
  }
  const errors = validateVfxAssetManifest({ example: { clips: { impact: {
    ...versioned, modern6x6: { ...modern6x6, rows: 5 }
  } } } });
  assert.ok(errors.some(error => error.includes("modern6x6") && error.includes("6x6")));
});

test("every existing PNG has a migration classification without changing its registry", () => {
  const assetRoot = new URL("../assets/vfx/", import.meta.url);
  for (const path of readdirSync(assetRoot, { recursive: true }).filter(path => path.endsWith(".png"))) {
    const src = `./assets/vfx/${path.replaceAll("\\", "/")}`;
    const entry = VFX_MIGRATION_MANIFEST[src];
    assert.ok(entry, src);
    assert.ok(VFX_MIGRATION_LABELS[entry.classification], src);
    assert.ok(entry.references.length && entry.reason, src);
  }
});
