import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getDefaultSpellById } from "../data/defaultSpells.js";
import { TIER_SPELL_PROFILES } from "../vfx/tierSpellProfiles.js";
import { getSpellVfxProfile } from "../vfx/spellVfxProfiles.js";
import { TIER_EFFECT_DEFINITIONS, LESSER_SPRITE_ASSETS, TIER_SPRITE_ASSETS, EPIC_SPRITE_ASSETS,
  getSpellSpriteTier, getTierSpriteAsset, getTierFrameWindow } from "../vfx/tierEffects.js";
import { getCantripSpritePaths } from "../vfx/cantripEffects.js";
import { createSpellVfxEvent } from "../vfx/castEvent.js";
import { createCastingSequenceSystem } from "../vfx/castingSequence.js";
import { createEffectEngine } from "../vfx/effectEngine.js";
import { createTemplateGeometry } from "../battleMap/templateGeometry.js";
import { createSpriteAnimator, getSpriteFrameStyle, normalizeSpriteOptions } from "../vfx/spriteAnimator.js";
import { createSpellTemplateInstruction } from "../battleMap/spellTemplates.js";
import { createSpellPreviewSession } from "../battleMap/spellPreview.js";
import { STORM_EFFECT_DEFINITIONS } from "../vfx/stormEffects.js";

const ids = [...TIER_SPELL_PROFILES.map(p => p.spellId), "fireball", "ice-storm"];
function harness(mode = "full", fail = false) {
  let time = 0, next = 0;
  const tasks = new Map(), visible = new Map(), requests = [];
  const scheduler = { now: () => time,
    setTimeout(fn, ms) { const id = ++next; tasks.set(id, { fn, at: time + ms }); return id; },
    clearTimeout(id) { tasks.delete(id); } };
  const engine = createEffectEngine({ mode, scheduler, renderer: {
    render(e) { requests.push(e); if (fail) throw Error("missing art"); visible.set(e.id, e); },
    remove(id) { visible.delete(id); }, clear() { visible.clear(); }
  } });
  const system = createCastingSequenceSystem({ effectEngine: engine, scheduler });
  return { tasks, visible, requests, engine, system, finish() {
    let limit = 10000;
    while (tasks.size && --limit) {
      const [id, task] = [...tasks].sort((a,b) => a[1].at - b[1].at)[0];
      tasks.delete(id); time = task.at; task.fn();
    }
    assert.ok(limit > 0);
  } };
}

test("base-level grid policy is 4x4 / 5x5 / 6x6 and missing art never downgrades silently", () => {
  for (let level = 0; level <= 9; level++) {
    const grid = level <= 2 ? 4 : level <= 6 ? 5 : 6;
    assert.deepEqual(getSpellSpriteTier(level), { rows: grid, columns: grid, frameCount: grid ** 2 });
  }
  for (const invalid of [-1, 10, 1.5, NaN, Infinity, null, "", true, false]) assert.equal(getSpellSpriteTier(invalid), null);
  assert.equal(getTierSpriteAsset("fire", 7).frameCount, 36);
  assert.equal(getTierSpriteAsset("lightning", 9).frameCount, 36, "use the final corrected lightning sheet");
  assert.equal(getTierSpriteAsset("lightning", 9).rows, 6);
  assert.equal(getTierSpriteAsset("unknown", 3), null);
});

test("all supplied atlases exist; frame windows and dimensions match each actual layout", () => {
  assert.equal(Object.keys(LESSER_SPRITE_ASSETS).length, 10);
  assert.equal(Object.keys(TIER_SPRITE_ASSETS).length, 13);
  assert.equal(Object.keys(EPIC_SPRITE_ASSETS).length, 13);
  for (const [theme, path] of [...Object.entries(LESSER_SPRITE_ASSETS), ...Object.entries(TIER_SPRITE_ASSETS), ...Object.entries(EPIC_SPRITE_ASSETS)]) {
    const png = readFileSync(new URL("../" + path, import.meta.url));
    assert.equal(png.subarray(1,4).toString(), "PNG");
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)],
      theme === "acid-ground" ? [1402, 1122] : [1254, 1254]);
  }
  for (const effect of TIER_EFFECT_DEFINITIONS) {
    const sprite = effect.sprite, grid = effect.id.startsWith("lesser-") ? 4 : effect.id.startsWith("tier-") ? 5 : 6;
    const rows = grid;
    assert.equal(sprite.columns, grid); assert.equal(sprite.rows, rows);
    assert.equal(sprite.frameCount, grid * rows);
    if (grid === 6) assert.equal(effect.blendMode, "screen");
    assert.ok(sprite.startFrame <= sprite.endFrame && sprite.endFrame < sprite.frameCount);
    assert.equal(sprite.loop, false); assert.equal(sprite.fitDuration, true);
    assert.equal(sprite.removeOnComplete, true);
  }
  assert.deepEqual(getTierFrameWindow("fire", 3, "flight"), [0,8]);
  assert.deepEqual(getTierFrameWindow("lightning", 3, "burst"), [7,24]);
  assert.deepEqual(getTierFrameWindow("necrotic", 3, "burst"), [10,24]);
  assert.deepEqual(getTierFrameWindow("acid", 1, "burst"), [5,15]);
  assert.deepEqual(getTierFrameWindow("lightning", 7, "cloud"), [24,35]);
  assert.deepEqual(getTierFrameWindow("force", 8, "rune"), [24,29]);
  assert.deepEqual(getTierFrameWindow("psychic", 9, "portal"), [18,23]);
});

test("4x4, 5x5 and 6x6 playback reaches its last cell and cancels all RAF work", () => {
  for (const grid of [getSpellSpriteTier(0), getSpellSpriteTier(3), getSpellSpriteTier(7)]) {
    const callbacks = new Map(); let next = 0, removed = 0;
    const sprite = { ...grid, src: "./test.png", frameWidth: 160, frameHeight: 160, framesPerSecond: 24 };
    const element = { style: {}, remove() { removed++; } };
    const animator = createSpriteAnimator({ element, options: sprite,
      requestFrame(fn) { callbacks.set(++next, fn); return next; },
      cancelFrame(id) { callbacks.delete(id); } });
    const step = time => { const pending = [...callbacks.values()]; callbacks.clear(); pending.forEach(fn => fn(time)); };
    animator.start(); step(0);
    step((grid.frameCount - 1) / 24 * 1000 + .01);
    assert.equal(element.style.backgroundPosition, getSpriteFrameStyle(sprite, grid.frameCount - 1).backgroundPosition);
    step(grid.frameCount / 24 * 1000 + 1);
    assert.equal(animator.getState().completed, true); assert.equal(callbacks.size, 0); assert.equal(removed, 1);
  }
});

test("upper-tier source rectangles preserve aspect ratio and never sample a neighboring cell", () => {
  for (const effect of TIER_EFFECT_DEFINITIONS.filter(e => e.id.startsWith("epic-"))) {
    const sprite = normalizeSpriteOptions(effect.sprite), atlas = sprite.atlas;
    assert.equal(atlas.columns.length, 7); assert.equal(atlas.rows.length, 7);
    for (let frame = 0; frame < 36; frame++) {
      const style = getSpriteFrameStyle(sprite, frame), col = frame % 6, row = Math.floor(frame / 6);
      const scale = parseFloat(style.backgroundSize) / atlas.width;
      const [x,y] = style.backgroundPosition.split(" ").map(parseFloat);
      const sourceX = -x/scale, sourceY = -y/scale;
      const sourceWidth = parseFloat(style.width)/scale, sourceHeight = parseFloat(style.height)/scale;
      assert.ok(sourceX >= atlas.columns[col] + .99 && sourceY >= atlas.rows[row] + .99);
      assert.ok(sourceX + sourceWidth <= atlas.columns[col+1] - .99);
      assert.ok(sourceY + sourceHeight <= atlas.rows[row+1] - .99);
      assert.ok(parseFloat(style.width) <= 160 && parseFloat(style.height) <= 160);
      assert.ok(Math.abs(sourceWidth/sourceHeight - parseFloat(style.width)/parseFloat(style.height)) < .001);
    }
  }
  for (const bounds of [[0,100,90,300,400,500,600], [0,100], [0,100,200,300,400,500,Infinity]]) {
    const sprite = normalizeSpriteOptions({frameCount:36,columns:6,rows:6,
      atlas:{width:600,height:600,columns:bounds,rows:[0,100,200,300,400,500,600]}});
    assert.equal(sprite.atlas, undefined, "malformed metadata safely falls back to the regular grid");
  }
});

test("every mapped spell keeps its real rules and has a working DM-only preview entry", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  for (const id of ids) {
    const spell = getDefaultSpellById(id), before = JSON.stringify(spell);
    assert.ok(spell.level >= 1 && spell.level <= 9, id);
    assert.ok(html.includes('value="' + id + '"'), id);
    const real = createSpellTemplateInstruction(spell);
    const instruction = createSpellTemplateInstruction(spell, {
      allowTouchPreview: true, vfxPreview: getSpellVfxProfile(id)?.preview
    });
    assert.equal(instruction.supported, true, id);
    const session = createSpellPreviewSession({ spell, instruction,
      getMetrics: () => ({ pixelsPerSquare: 50, feetPerSquare: 5 }) });
    session.pickPoint({x:100,y:100});
    if (!session.getState().previewLocked) session.pickPoint({x:130,y:100});
    assert.equal(session.getState().canPlay, true, id);
    assert.deepEqual(createSpellTemplateInstruction(spell), real);
    assert.equal(JSON.stringify(spell), before);
  }
});

test("preview and cast stay under three effects, independent of target count, with complete cleanup", () => {
  for (const id of ids) for (const preview of [false, true]) {
    const counts = {};
    for (const mode of ["full", "reduced", "off"]) {
      const h = harness(mode), spell = getDefaultSpellById(id);
      const event = createSpellVfxEvent({ spell, preview,
        casterPoint: {x:100,y:100}, targetPoint: {x:200,y:150},
        affectedTokens: Array.from({length:100}, (_, i) => ({id:"t"+i, center:{x:200,y:150}})) });
      const before = JSON.stringify(event);
      assert.equal(h.system.play(event).ok, true, id); h.finish();
      counts[mode] = h.requests.length;
      assert.ok(h.requests.length <= 3, id);
      assert.ok(h.requests.every(e => !e.affectedTokenId && !e.persistent && e.particles?.count === 0), id);
      assert.equal(JSON.stringify(event), before);
      assert.equal(h.tasks.size, 0); assert.equal(h.visible.size, 0);
      assert.equal(h.system.getState().activeCount, 0); assert.equal(h.engine.getState().activeCount, 0);
      for (const e of h.requests.filter(e => e.definition.kind === "sprite")) {
        assert.equal(e.definition.sprite.columns,
          e.definition.id.startsWith("status-") ? 5 : getSpellSpriteTier(spell.level).columns, id);
        assert.ok(getCantripSpritePaths(id).includes(e.definition.sprite.src), "selected-only preload: " + id);
      }
    }
    assert.equal(counts.off, 0);
    // Existing Ice Storm uses the same 3 phases but fewer hail nodes in Reduced.
    assert.ok(id === "ice-storm" ? counts.reduced === counts.full : counts.reduced < counts.full, id);
  }
});

test("upper-tier area effects cap visual scale without modifying targeting geometry", () => {
  for (const id of ["meteor-swarm", "earthquake", "storm-of-vengeance"]) {
    const spell = getDefaultSpellById(id);
    const geometry = createTemplateGeometry({shape:"sphere",anchor:{x:100,y:100},
      pointer:{x:200,y:100},sizeFeet:360,pixelsPerSquare:50,feetPerSquare:5});
    const event = createSpellVfxEvent({spell,geometry,casterPoint:{x:100,y:100},targetPoint:{x:200,y:100}});
    const before = JSON.stringify(event.geometry), h = harness();
    h.system.play(event); h.finish();
    assert.ok(h.requests.length <= 3);
    assert.ok(h.requests.every(e => e.scale <= 6), id);
    assert.equal(JSON.stringify(event.geometry), before);
  }
});

test("beams and cones use the full aimed geometry in eight directions without changing it", () => {
  for (const id of ["sunbeam", "cone-of-cold", "burning-hands"]) for (const [dx,dy] of
    [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]) {
    const spell = getDefaultSpellById(id), casterPoint = {x:300,y:300};
    const pointer = {x:300+dx*20,y:300+dy*20};
    const geometry = createTemplateGeometry({shape:id === "sunbeam" ? "line" : "cone",
      anchor:casterPoint,pointer,sizeFeet:60,widthFeet:5,pixelsPerSquare:50,feetPerSquare:5});
    const event = createSpellVfxEvent({spell,casterPoint,targetPoint:pointer,geometry});
    const h = harness(); h.system.play(event); h.finish();
    const paths = h.requests.filter(e=>e.startPosition);
    assert.ok(paths.length);
    for (const path of paths) {
      assert.deepEqual(path.startPosition, event.casterPoint);
      assert.deepEqual(path.endPosition, event.geometry.directionPoint);
    }
  }
});

test("Ice Storm child frames use five columns and dispose native animations", () => {
  const animations = [], nodes = [];
  const element = { appendChild(node) { nodes.push(node); } };
  const document = { createElement() { return { style: {setProperty(){}},
    animate(frames) { const a = { frames, cancelled:false, cancel(){this.cancelled=true;} }; animations.push(a); return a; } }; } };
  const dispose = STORM_EFFECT_DEFINITIONS.find(e=>e.id==="storm-hail")
    .configureElement({document,element,effect:{effectsMode:"full",intensity:3,duration:1800}});
  assert.equal(animations.length, 7);
  assert.equal(animations[0].frames[0].backgroundPosition, "-640px -160px", "cold impact begins in cell 9");
  assert.equal(animations[0].frames.at(-1).backgroundPosition, "-640px -640px");
  assert.ok(nodes.filter(n=>n.className==="hg-storm-ice-burst").every(n=>n.style.backgroundSize==="800px 800px"));
  dispose(); assert.ok(animations.every(a=>a.cancelled));
});

test("repeated, failed and cancelled previews leave no effects or scheduled work", () => {
  for (const fail of [false,true]) {
    const h = harness("full",fail);
    for (let i=0;i<80;i++) h.system.play(createSpellVfxEvent({spell:getDefaultSpellById(ids[i%ids.length]),preview:true}));
    assert.ok(h.system.getState().activeCount<=16); assert.ok(h.engine.getState().activeCount<=64);
    h.system.clearPreviews(); h.finish();
    assert.equal(h.tasks.size,0); assert.equal(h.visible.size,0);
  }
});
