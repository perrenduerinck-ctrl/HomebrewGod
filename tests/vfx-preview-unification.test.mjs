import test from "node:test";
import assert from "node:assert/strict";
import { createAnimationPreviewStage } from "../vfx/animationPreviewStage.js";
import { buildSpellAnimationPreviewContext, createSpellPreviewSession } from "../battleMap/spellPreview.js";
import { createSpellTemplateInstruction } from "../battleMap/spellTemplates.js";
import { getDefaultSpellById } from "../data/defaultSpells.js";
import { createSpellVfxEvent } from "../vfx/castEvent.js";
import { buildSpellAnimationContext } from "../vfx/animationSpellAdapter.js";

function element(rect = { left: 10, top: 20, width: 400, height: 200 }) {
  const listeners = new Map();
  return {
    style: {}, dataset: {}, clientWidth: rect.width, clientHeight: rect.height,
    addEventListener(type, fn) { const list = listeners.get(type) || []; list.push(fn); listeners.set(type, list); },
    removeEventListener(type, fn) { listeners.set(type, (listeners.get(type) || []).filter(item => item !== fn)); },
    getBoundingClientRect: () => ({ ...rect }),
    setPointerCapture() {}, hasPointerCapture: () => true,
    fire(type, event = {}) { for (const fn of listeners.get(type) || []) fn({ preventDefault() {}, ...event }); },
  };
}

function stageFixture() {
  const surface = element(), source = element(), target = element(), swap = element(), reset = element(), distance = element();
  distance.value = "150";
  const stage = createAnimationPreviewStage({ surface, source, target, swapButton: swap, resetButton: reset, distanceSelect: distance, ResizeObserverClass: null });
  return { stage, surface, source, target, swap, reset, distance };
}

function preview(id) {
  const spell = getDefaultSpellById(id);
  const session = createSpellPreviewSession({
    spell,
    instruction: createSpellTemplateInstruction(spell),
    getMetrics: () => ({ width: 400, height: 200, pixelsPerSquare: 50, feetPerSquare: 5 }),
  });
  return { spell, session };
}

test("shared preview stage exposes the same Source and Target elements to the runtime", () => {
  const f = stageFixture();
  const context = f.stage.getContext({ debugPoints: true });
  assert.equal(context.source, f.source);
  assert.equal(context.target, f.target);
  assert.equal(context.debugPoints, true);
  assert.equal(context.grid.pixelsPerFoot, 400 / 150);
  f.stage.destroy();
});

test("shared preview Source drag updates normalized and pixel coordinates", () => {
  const f = stageFixture();
  f.source.fire("pointerdown", { pointerId: 1, clientX: 110, clientY: 120 });
  assert.equal(f.stage.getState().source.xRatio, 0.25);
  assert.equal(f.stage.getState().source.yRatio, 0.5);
  assert.equal(f.stage.getState().source.x, 100);
  assert.equal(f.stage.getState().source.y, 100);
  f.stage.destroy();
});

test("shared preview Target keyboard movement supports fine and shifted steps", () => {
  const f = stageFixture();
  const before = f.stage.getState().target.xRatio;
  f.target.fire("keydown", { key: "ArrowLeft", shiftKey: false });
  assert.equal(f.stage.getState().target.xRatio, before - 0.015);
  f.target.fire("keydown", { key: "ArrowRight", shiftKey: true });
  assert.equal(f.stage.getState().target.xRatio, before + 0.035);
  f.stage.destroy();
});

test("shared preview swaps Source and Target without changing their distance", () => {
  const f = stageFixture();
  const before = f.stage.getState();
  f.swap.fire("click");
  const after = f.stage.getState();
  assert.deepEqual(after.source.xRatio, before.target.xRatio);
  assert.deepEqual(after.target.xRatio, before.source.xRatio);
  f.stage.destroy();
});

test("shared preview reset restores canonical anchors", () => {
  const f = stageFixture();
  f.source.fire("pointerdown", { pointerId: 1, clientX: 350, clientY: 170 });
  f.reset.fire("click");
  assert.equal(f.stage.getState().source.xRatio, 0.24);
  assert.equal(f.stage.getState().target.xRatio, 0.76);
  f.stage.destroy();
});

test("shared preview distance sets exact actor separation without changing grid scale", () => {
  const f = stageFixture();
  f.stage.setDistance(40);
  const state = f.stage.getState();
  assert.equal(f.stage.getContext().grid.pixelsPerFoot, 400 / 150);
  assert.equal(state.widthFeet, 150);
  assert.ok(Math.abs(Math.hypot(state.target.x - state.source.x, state.target.y - state.source.y) / state.pixelsPerFoot - 40) < 1e-9);
  f.stage.destroy();
});

test("single-target spell preview retains selected caster and target token IDs", () => {
  const { spell, session } = preview("fire-bolt");
  session.pickPoint({ x: 50, y: 60, tokenId: "caster-large" });
  const state = session.pickPoint({ x: 250, y: 60, tokenId: "target-small" });
  const context = buildSpellAnimationPreviewContext({ spell, state });
  assert.equal(context.source.tokenId, "caster-large");
  assert.equal(context.target.tokenId, "target-small");
  assert.equal(context.source.anchor, "center");
  assert.equal(context.target.anchor, "center");
});

test("AOE spell preview keeps its selected map center instead of the token underneath", () => {
  const { spell, session } = preview("fireball");
  session.pickPoint({ x: 40, y: 80, tokenId: "caster" });
  const state = session.pickPoint({ x: 220, y: 100, tokenId: "first-token-in-area" });
  const context = buildSpellAnimationPreviewContext({ spell, state });
  assert.equal(context.target.tokenId, null);
  assert.equal(context.target.anchor, "map-point");
  assert.deepEqual(context.target.point, state.previewTargetPoint);
  assert.deepEqual(context.affectedTokens, []);
});

test("self-target spell preview uses the same token as Source and Target", () => {
  const spell = { id: "self-test", name: "Self Test", targeting: { range: { type: "self" }, target: { type: "self" }, area: { shape: "sphere", radius: 10 } } };
  const session = createSpellPreviewSession({ spell, instruction: createSpellTemplateInstruction(spell), getMetrics: () => ({ width: 400, height: 200, pixelsPerSquare: 50, feetPerSquare: 5 }) });
  const state = session.pickPoint({ x: 160, y: 80, tokenId: "caster" });
  const context = buildSpellAnimationPreviewContext({ spell, state });
  assert.equal(context.source.tokenId, "caster");
  assert.equal(context.target.tokenId, "caster");
  assert.deepEqual(context.source.point, context.target.point);
});

test("directional self spell uses the caster token only for Source", () => {
  const { spell, session } = preview("burning-hands");
  session.pickPoint({ x: 100, y: 100, tokenId: "caster" });
  const state = session.pickPoint({ x: 200, y: 100, tokenId: "aimed-over-token" });
  const context = buildSpellAnimationPreviewContext({ spell, state });
  assert.equal(context.source.tokenId, "caster");
  assert.equal(context.target.tokenId, null);
});

test("preview token IDs survive the immutable cast event boundary", () => {
  const event = createSpellVfxEvent({
    spell: { id: "bolt", name: "Bolt" },
    casterTokenId: "caster",
    targetTokenId: "target",
    casterPoint: { x: 10, y: 20 },
    targetPoint: { x: 80, y: 90 },
    preview: true,
  });
  assert.equal(event.casterTokenId, "caster");
  assert.equal(event.targetTokenId, "target");
  assert.equal(Object.isFrozen(event), true);
});

test("intentional map targets retain explicit null across cast event normalization", () => {
  const event = createSpellVfxEvent({ targetTokenId: null, geometry: { shape: "sphere", anchor: { x: 120, y: 140 } }, affectedTokens: [{ id: "inside" }] });
  assert.equal(Object.hasOwn(event, "targetTokenId"), true);
  assert.equal(buildSpellAnimationContext(event).targetTokenId, null);
  assert.equal(Object.hasOwn(createSpellVfxEvent({}), "targetTokenId"), false);
});

test("animation adapter gives explicit preview target IDs priority over affected tokens", () => {
  const context = buildSpellAnimationContext({
    casterTokenId: "caster",
    targetTokenId: "chosen-target",
    casterPoint: { x: 10, y: 20 },
    targetPoint: { x: 80, y: 90 },
    affectedTokens: [{ id: "wrong-target" }],
  });
  assert.equal(context.sourceTokenId, "caster");
  assert.equal(context.targetTokenId, "chosen-target");
});

test("animation adapter treats an explicit null target as a map point", () => {
  const context = buildSpellAnimationContext({
    casterTokenId: "caster",
    targetTokenId: null,
    casterPoint: { x: 10, y: 20 },
    targetPoint: { x: 80, y: 90 },
    affectedTokens: [{ id: "token-inside-area" }],
  });
  assert.equal(context.targetTokenId, null);
  assert.deepEqual(context.targetPoint, { x: 80, y: 90 });
});

test("animation adapter retains legacy affected-token fallback for old cast events", () => {
  const context = buildSpellAnimationContext({ casterTokenId: "caster", affectedTokens: [{ id: "legacy-target" }] });
  assert.equal(context.targetTokenId, "legacy-target");
});

test("animation adapter prevents AOE events from snapping to the first affected token", () => {
  const context = buildSpellAnimationContext({
    geometry: { shape: "sphere", pixelsPerFoot: 10 },
    affectedTokens: [{ id: "inside" }],
    targetPoint: { x: 120, y: 140 },
  });
  assert.equal(context.targetTokenId, null);
  assert.deepEqual(context.targetPoint, { x: 120, y: 140 });
});

test("animation adapter preserves elevations, grid, debug points and preview duration bounds", () => {
  const context = buildSpellAnimationContext({
    preview: true,
    casterElevation: 15,
    targetElevation: 35,
    geometry: { pixelsPerFoot: 12 },
  }, { debugPoints: true, maximumDuration: 3200 });
  assert.equal(context.sourceElevation, 15);
  assert.equal(context.targetElevation, 35);
  assert.equal(context.grid.pixelsPerFoot, 12);
  assert.equal(context.debugPoints, true);
  assert.equal(context.maximumDuration, 3200);
});

test("map resize reprojects selected token centers from stored ratios", () => {
  const spell = getDefaultSpellById("fire-bolt");
  const metrics = { width: 400, height: 200, pixelsPerSquare: 50, feetPerSquare: 5 };
  const session = createSpellPreviewSession({ spell, instruction: createSpellTemplateInstruction(spell), getMetrics: () => metrics });
  session.pickPoint({ x: 100, y: 50, xRatio: .25, yRatio: .25, tokenId: "caster" });
  session.pickPoint({ x: 300, y: 150, xRatio: .75, yRatio: .75, tokenId: "target" });
  metrics.width = 800; metrics.height = 400;
  const context = buildSpellAnimationPreviewContext({ spell, state: session.getState() });
  assert.deepEqual([context.source.point.x, context.source.point.y], [200, 100]);
  assert.deepEqual([context.target.point.x, context.target.point.y], [600, 300]);
  assert.equal(context.target.tokenId, "target");
});
