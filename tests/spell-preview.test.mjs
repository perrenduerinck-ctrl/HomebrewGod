import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createSpellPreviewSession, formatSpellPreviewStatus } from "../battleMap/spellPreview.js";
import { createSpellTemplateInstruction } from "../battleMap/spellTemplates.js";
import { getDefaultSpellById } from "../data/defaultSpells.js";
import { createSpellVfxEvent, inferSpellVfxDeliveryType } from "../vfx/castEvent.js";
import { normalizeEffectRequest } from "../vfx/effectEngine.js";
import { createDefaultEffectRegistry } from "../vfx/effectRegistry.js";

const definition = createDefaultEffectRegistry().get("procedural-pulse");

function preview(id, getMetrics = () => ({ pixelsPerSquare: 5, feetPerSquare: 5 })) {
  const spell = getDefaultSpellById(id);
  return createSpellPreviewSession({
    spell, instruction: createSpellTemplateInstruction(spell), getMetrics
  });
}

test("preview has two-click lock, live aim, ignored third click, and complete reset", () => {
  const session = preview("fire-bolt");
  assert.match(formatSpellPreviewStatus(session.getState()), /Click caster position/);
  assert.equal(session.aimAt({ x: 300, y: 200 }).previewTargetPoint, null);
  assert.equal(session.pickPoint({ x: 20, y: 30 }).phase, "aiming");
  assert.match(formatSpellPreviewStatus(session.getState()), /Caster set. Click target. 0 ft \/ 120 ft/);
  assert.equal(session.aimAt({ x: 50, y: 70 }).rangeFeet, 50);
  assert.equal(session.getState().canPlay, false);
  const locked = session.pickPoint({ x: 80, y: 110 });
  assert.equal(locked.rangeFeet, 100);
  assert.equal(locked.canPlay, true);
  assert.match(formatSpellPreviewStatus(locked), /Target locked/);
  assert.deepEqual(session.pickPoint({ x: 999, y: 999 }), locked);
  assert.deepEqual(session.aimAt({ x: 999, y: 999 }), locked);
  const reset = session.reset();
  assert.equal(reset.previewCasterPoint, null);
  assert.equal(reset.previewTargetPoint, null);
  assert.equal(reset.previewGeometry, null);
  assert.equal(reset.previewLocked, false);
  assert.equal(reset.phase, "caster");
});

test("Fire Bolt retains actual coordinates in every direction through VFX normalization", () => {
  const spell = getDefaultSpellById("fire-bolt");
  for (const [dx, dy] of [[80,0],[-80,0],[0,80],[0,-80],[60,60],[-60,60],[60,-60],[-60,-60]]) {
    const session = preview("fire-bolt");
    session.pickPoint({ x: 200, y: 200 });
    const state = session.pickPoint({ x: 200 + dx, y: 200 + dy });
    assert.equal(state.canPlay, true);
    const event = createSpellVfxEvent({
      spell, casterPoint: state.previewCasterPoint,
      targetPoint: state.previewTargetPoint, geometry: state.previewGeometry, preview: true
    });
    const effect = normalizeEffectRequest({
      type: "projectile", startPoint: event.casterPoint, endPoint: event.targetPoint
    }, { definition });
    assert.equal(effect.endPosition.x - effect.startPosition.x, dx);
    assert.equal(effect.endPosition.y - effect.startPosition.y, dy);
    assert.equal(effect.endPosition.xRatio, null);
    assert.equal(effect.endPosition.yRatio, null);
    assert.equal(event.preview, true);
    assert.equal(event.casterTokenId, "");
  }
  const origin = normalizeEffectRequest({ type: "projectile", endPoint: { x: 0, y: 0, xRatio: 0, yRatio: 0 } }, { definition });
  assert.equal(origin.endPosition.xRatio, 0);
});

test("point areas center on the second point using their actual dimensions", () => {
  for (const [id, shape, size, height] of [
    ["fireball", "sphere", 20, 40],
    ["flame-strike", "cylinder", 10, 40],
    ["ice-storm", "cylinder", 20, 40]
  ]) {
    const session = preview(id);
    session.pickPoint({ x: 20, y: 30 });
    const state = session.pickPoint({ x: 50, y: 70 });
    assert.equal(state.canPlay, true);
    assert.deepEqual(state.previewGeometry.anchor, { x: 50, y: 70 });
    assert.equal(state.previewGeometry.shape, shape);
    assert.equal(state.previewGeometry.sizeFeet, size);
    assert.equal(state.previewGeometry.heightFeet, height);
  }
});

test("cone/line second click chooses direction, not template length", () => {
  for (const [id, length] of [["burning-hands", 15], ["lightning-bolt", 100]]) {
    const session = preview(id);
    session.pickPoint({ x: 300, y: 300 });
    const state = session.pickPoint({ x: 300, y: 100 });
    assert.equal(state.canPlay, true);
    assert.equal(state.maxRangeFeet, null);
    assert.deepEqual(state.previewGeometry.anchor, { x: 300, y: 300 });
    assert.equal(state.previewGeometry.directionRadians, -Math.PI / 2);
    assert.equal(state.previewGeometry.sizeFeet, length);
    assert.deepEqual(state.previewGeometry.directionPoint, { x: 300, y: 300 - length });
  }
});

test("range uses live map scale and true elevation, including after lock", () => {
  const metrics = { pixelsPerSquare: 5, feetPerSquare: 5, startElevationFeet: 0, endElevationFeet: 0 };
  const session = preview("fire-bolt", () => metrics);
  session.pickPoint({ x: 0, y: 0 });
  assert.equal(session.aimAt({ x: 120, y: 0 }).inRange, true);
  assert.equal(session.aimAt({ x: 121, y: 0 }).inRange, false);
  assert.match(formatSpellPreviewStatus(session.getState()), /121 ft \/ 120 ft — Out of range/);
  assert.equal(session.pickPoint({ x: 72, y: 0 }).canPlay, true);
  metrics.endElevationFeet = 96;
  assert.equal(session.getState().rangeFeet, 120);
  assert.equal(session.getState().canPlay, true);
  metrics.endElevationFeet = 100;
  assert.equal(session.getState().canPlay, false);
  metrics.endElevationFeet = 0;
  metrics.feetPerSquare = 10;
  assert.equal(session.getState().rangeFeet, 144);
  assert.equal(session.getState().canPlay, false);
});

test("target-only and self-centered previews share the controller without projectile fallback", () => {
  const session = preview("sacred-flame");
  session.pickPoint({ x: 40, y: 40 });
  const point = session.pickPoint({ x: 40, y: 40 });
  assert.equal(point.canPlay, true);
  assert.equal(inferSpellVfxDeliveryType({ spell: getDefaultSpellById("sacred-flame") }), "impact");
  const spell = { id: "self-fixture", targeting: { range: { type: "self" }, target: { type: "self" }, area: { shape: "sphere", radius: 10 } } };
  const self = createSpellPreviewSession({ spell, instruction: createSpellTemplateInstruction(spell) });
  const state = self.pickPoint({ x: 100, y: 120 });
  assert.equal(state.canPlay, true);
  assert.deepEqual(state.previewCasterPoint, state.previewTargetPoint);
});

test("invalid points and zero-direction projectile targets never enable playback", () => {
  const session = preview("fire-bolt");
  for (const point of [null, { x: Infinity, y: 2 }, { x: NaN, y: 2 }]) {
    assert.equal(session.pickPoint(point).phase, "caster");
  }
  session.pickPoint({ x: 20, y: 20 });
  assert.equal(session.pickPoint({ x: 20, y: 20 }).canPlay, false);
});

test("preview points remain anchored when the rendered map resizes", () => {
  const metrics = { width: 400, height: 300, pixelsPerSquare: 64, feetPerSquare: 5 };
  const session = preview("fire-bolt", () => metrics);
  session.pickPoint({ x: 100, y: 150, xRatio: 0.25, yRatio: 0.5 });
  session.pickPoint({ x: 300, y: 150, xRatio: 0.75, yRatio: 0.5 });
  metrics.width = 800;
  metrics.height = 600;
  assert.equal(session.getState().previewCasterPoint.x, 200);
  assert.equal(session.getState().previewTargetPoint.x, 600);
  assert.equal(session.getState().previewTargetPoint.y, 300);
});

test("preview controller has no gameplay, persistence, or character dependencies", () => {
  const source = readFileSync(new URL("../battleMap/spellPreview.js", import.meta.url), "utf8");
  const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1]);
  assert.deepEqual(imports, ["./templateGeometry.js", "./measurement.js", "./elevation.js"]);
  assert.doesNotMatch(source, /dispatchEvent|fetch\(|setDoc|updateDoc|onConfirmCast|Math\.random/);
});
