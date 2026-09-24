import test from "node:test";
import assert from "node:assert/strict";

import { normalizeAnimation } from "../vfx/animationLibrary.js";
import { getSpriteFrameStyle } from "../vfx/spriteAnimator.js";
import { createUniformSpriteAtlas, getSpriteAtlasFrameBounds, resetSpriteAtlasAlignment } from "../vfx/spriteAtlas.js";

const atlas = createUniformSpriteAtlas(100, 100, 2, 2);
const definition = {
  id: "aligned_sheet",
  name: "Aligned sheet",
  sprite: "aligned.png",
  grid: { columns: 2, rows: 2 },
  frameCount: 4
};

test("grid Y offset corrects a frame positioned too low", () => {
  const original = getSpriteAtlasFrameBounds(atlas, 0, 0);
  const corrected = getSpriteAtlasFrameBounds({ ...atlas, offsetY: -3 }, 0, 0);
  assert.equal(original.y, 0);
  assert.equal(corrected.y, 0, "the image edge clips safely");
  assert.equal(getSpriteAtlasFrameBounds({ ...atlas, offsetY: -3 }, 0, 1).y, 47);
});

test("grid X offset moves every sampled frame on the shared atlas", () => {
  assert.equal(getSpriteAtlasFrameBounds({ ...atlas, offsetX: 3 }, 0, 0).x, 3);
  assert.equal(getSpriteAtlasFrameBounds({ ...atlas, offsetX: 3 }, 1, 0).x, 53);
});

test("axis inset prevents an offset sample from bleeding into its neighbor", () => {
  const shifted = getSpriteAtlasFrameBounds({ ...atlas, offsetX: 4 }, 0, 0);
  assert.equal(shifted.bleed.right, 4);
  const inset = getSpriteAtlasFrameBounds({ ...atlas, offsetX: 4, insetX: 4 }, 0, 0);
  assert.equal(inset.bleed.right, 0);
  assert.equal(inset.width, 42);
});

test("reset restores the original grid and legacy inset", () => {
  const reset = resetSpriteAtlasAlignment({ ...atlas, inset: 2, offsetX: 7, offsetY: -5, insetX: 9, insetY: 4 });
  assert.deepEqual({ offsetX: reset.offsetX, offsetY: reset.offsetY, insetX: reset.insetX, insetY: reset.insetY },
    { offsetX: 0, offsetY: 0, insetX: 2, insetY: 2 });
  assert.deepEqual(reset.columns, atlas.columns);
  assert.deepEqual(reset.rows, atlas.rows);
});

test("save and reload normalization retains frame alignment and unrelated animation data", () => {
  const saved = normalizeAnimation({ ...definition, frames: { start: 0, end: 3, sequence: [0, 2, 1, 2] },
    layers: [{ animationId: "spark_layer", startDelay: .2 }], atlas: { ...atlas, offsetX: 2, offsetY: -3, insetX: 4, insetY: 5 } });
  const reloaded = normalizeAnimation(JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(reloaded.atlas, saved.atlas);
  assert.deepEqual(reloaded.frames.sequence, [0, 2, 1, 2]);
  assert.deepEqual(reloaded.layers, saved.layers);
  assert.equal(reloaded.sprite, saved.sprite);
  assert.equal(reloaded.id, saved.id);
});

test("animations without alignment metadata keep their previous frame boxes", () => {
  const oldOptions = { src: "legacy.png", frameCount: 4, columns: 2, rows: 2, preserveGrid: true, frameWidth: 50, frameHeight: 50 };
  assert.deepEqual(getSpriteFrameStyle(oldOptions, 3), {
    width: "50px", height: "50px", backgroundPosition: "-50px -50px"
  });
  const oldAtlas = { ...atlas, inset: 1 };
  const style = getSpriteFrameStyle({ ...oldOptions, atlas: oldAtlas }, 3);
  assert.equal(style.backgroundPosition, "-53.125px -53.125px");
  assert.equal(style.width, "50px");
  assert.equal(style.height, "50px");
});
