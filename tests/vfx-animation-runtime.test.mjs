import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAnimationPoint, normalizeAnimationRuntimeContext, animationAreaSize, normalizeAnimationGrid } from "../vfx/animationRuntime.js";
import { normalizeAnimationDefinition } from "../vfx/animationDefinition.js";
import { sampleAnimation, animationTiming, chooseAnimationVariation } from "../vfx/animationPlayback.js";
import { createAnimationLibrary, createAnimationBindings } from "../vfx/animationLibrary.js";
import { normalizeSpellAnimations, chooseAnimationSelection, getSpellAnimationDependencies } from "../vfx/animationReferences.js";
import { createAnimationSequenceController } from "../vfx/animationSequence.js";
import { createAnimationPlayer } from "../vfx/animationPlayer.js";
import { createEffectEngine } from "../vfx/effectEngine.js";

const base = { id: "sprite", name: "Sprite", sprite: "sprite.png", grid: { columns: 6, rows: 6 } };
const flush = async () => { for (let i=0;i<12;i++) await Promise.resolve(); };
function sequenceFixture() {
  const played = [];
  const player = { prepareAnimation: async () => {}, async playAnimation(id, options) {
    let finish; const finished = new Promise(resolve => { finish = resolve; });
    const result = { ok: true, id, options, finished, arrived: finished, finish, cancel: () => finish(["cancelled"]), pause() {}, resume() {}, instances: [{ animationId: id }] };
    played.push(result); return result;
  } };
  return { player, played };
}
test("runtime multipliers change only the prepared play and preserve its saved ID and definition", async () => {
  const library=createAnimationLibrary(); const saved=library.registerAnimation({...base,scale:2,rotation:12,appearance:{opacity:.8}});
  const engine=createEffectEngine({renderer:{render(){},remove(){},clear(){}}}), player=createAnimationPlayer({engine,library,assetCache:{preload:async()=>true,getDimensions:()=>({width:60,height:60})}});
  const play=await player.prepareAnimation(saved.id,{scaleMultiplier:1.5,speedMultiplier:1.25,opacityMultiplier:.5,rotationOffset:30});
  assert.equal(play.definition.scale,3);assert.equal(play.definition.timing.speed,1.25);assert.equal(play.definition.appearance.opacity,.4);assert.equal(play.definition.rotation,42);
  assert.equal(library.getAnimation(saved.id),saved);assert.equal(saved.scale,2);assert.equal(saved.rotation,12);player.destroy();engine.destroy();
});
test("impact-triggered stages can overlap the remaining attack frames", async () => {
  const {player,played}=sequenceFixture();let impact;
  const play=player.playAnimation;player.playAnimation=async(...args)=>{const result=await play(...args);if(args[0]==="slash")result.impacted=new Promise(resolve=>{impact=resolve;});return result;};
  const controller=createAnimationSequenceController({player});const run=await controller.playAnimationSequence({stages:[{slot:"cast",animationId:"slash"},{slot:"impact",animationId:"hit",trigger:"onImpact"}]});
  await flush();assert.equal(played.length,1);impact("impact");await flush();assert.equal(played[1].id,"hit");
  played[0].finish(["completed"]);played[1].finish(["completed"]);assert.equal((await run.finished).ok,true);
});
test("Effects Off releases a manual aura without launching its end stage", async () => {
  const { player, played } = sequenceFixture(), controller = createAnimationSequenceController({ player });
  const run = await controller.startEffect({ animations: { sustain: "aura", end: "fade" }, duration: { unit: "manual" } });
  await flush(); played[0].finish(["effects-off"]);
  assert.equal((await run.finished).reason, "cancelled"); assert.equal(played.length, 1); assert.deepEqual(controller.getInstances(), []);
});
test("ending during a pending stage cancels that stage and plays only the end", async () => {
  const { player, played } = sequenceFixture(); let decode;
  const play = player.playAnimation; player.playAnimation = async (...args) => {
    if (args[0] === "aura") await new Promise(resolve => { decode = resolve; });
    return play(...args);
  };
  const controller = createAnimationSequenceController({ player });
  const run = await controller.startEffect({ animations: { sustain: "aura", end: "fade" }, duration: { unit: "manual" } });
  await flush(); run.end(); decode(); await flush();
  assert.equal(played[1].id, "fade"); assert.deepEqual(await played[0].finished, ["cancelled"]);
  played[1].finish(["completed"]); assert.equal((await run.finished).ok, true);
});
test("duration timers pause, resume and clean up while updated actors remain live", async () => {
  const { player, played } = sequenceFixture(); const timers = new Map(); let next = 0;
  const scheduler = { setTimeout(fn, ms) { timers.set(++next, {fn, ms}); return next; }, clearTimeout(id) { timers.delete(id); } };
  const controller = createAnimationSequenceController({ player, scheduler });
  const run = await controller.startEffect({ source: {x:1,y:2}, target: {x:3,y:4}, animations: { sustain:"aura",end:"fade" }, duration:{unit:"minutes",value:2} });
  await flush(); assert.equal([...timers.values()][0].ms,120000);
  run.pause(); assert.equal(timers.size,0); run.update({target:{x:90,y:40}}); assert.deepEqual(played[0].options.target(),{x:90,y:40});
  run.resume(); assert.equal(timers.size,1); const timer=[...timers.values()][0]; timers.clear(); timer.fn(); await flush();
  assert.equal(played[1].id,"fade"); played[1].finish(["completed"]); assert.equal((await run.finished).ok,true); assert.equal(timers.size,0);
});
test("visual area sizing and optional variants stay independent of spell rules", () => {
  assert.deepEqual(animationAreaSize({shape:"circle",radius:20,unit:"ft"},{pixelsPerSquare:50,feetPerSquare:5}),{width:400,height:400});
  assert.deepEqual(animationAreaSize({shape:"circle",radius:20,unit:"ft"},normalizeAnimationGrid({pixelsPerFoot:20,coordinateSpace:"layer"},2)),{width:400,height:400});
  assert.equal(animationAreaSize({shape:"circle",radius:20,unit:"ft"}),null);
  assert.deepEqual(animationAreaSize({shape:"rectangle",length:90,width:30,unit:"px"}),{width:90,height:30});
  const selection={mode:"cycle",ids:["slash_1","slash_2"]}; assert.equal(chooseAnimationSelection(selection,{index:3}),"slash_2");
  assert.equal(chooseAnimationSelection({...selection,mode:"random"},{random:()=>0}),"slash_1");
  assert.deepEqual(getSpellAnimationDependencies({animationSelection:selection,animations:{impact:"hit"}}),["slash_1","slash_2","hit"]);
  assert.throws(()=>normalizeAnimationDefinition({...base,events:[null]}),/event/);
  assert.deepEqual(normalizeAnimationRuntimeContext({source:"missing",world:{x:NaN,y:NaN}}).sample().source,{x:0,y:0});
});
test("Fireball waits for cast and projectile arrival, and sustain ends with an end animation", async () => {
  const played=[];
  const player={prepareAnimation:async()=>{},playAnimation:async(id,options)=>{
    let finish,arrive;const finished=new Promise(r=>{finish=r;}),arrived=new Promise(r=>{arrive=r;});
    const handle={ok:true,id,options,finished,arrived,cancel(){finish("cancelled");arrive("cancelled");},pause(){},resume(){},finish,arrive};played.push(handle);return handle;
  }};
  const controller=createAnimationSequenceController({player});
  const run=await controller.playAnimationSequence({source:{x:20,y:30},target:{x:200,y:80},duration:{unit:"manual"},animations:{cast:"cast_sprite",travel:"travel_sprite",impact:"impact_sprite",sustain:"sustain_sprite",end:"end_sprite"}});
  await flush();assert.deepEqual(played.map(x=>x.id),["cast_sprite"]);assert.equal(played[0].options.placement.mode,"SOURCE");
  played[0].finish("completed");await flush();assert.equal(played[1].options.behavior,"projectile");
  played[1].arrive("arrived");await flush();assert.equal(played[2].id,"impact_sprite");assert.equal(played[2].options.placement.mode,"TARGET");
  played[2].finish("completed");await flush();assert.equal(played[3].id,"sustain_sprite");assert.equal(played[3].options.placement.persist,true);
  run.end();await flush();assert.equal(played[4].id,"end_sprite");played[4].finish("completed");assert.equal((await run.finished).ok,true);assert.equal(controller.getInstances().length,0);
});
test("clearing a sequence while assets decode cannot launch a late stage", async()=>{
  let finish,plays=0;const controller=createAnimationSequenceController({player:{prepareAnimation:()=>new Promise(r=>{finish=r;}),playAnimation:()=>{plays++;}}});
  const pending=controller.playAnimationSequence({animations:{impact:"sprite"}});controller.clear();finish();assert.equal((await pending).reason,"cancelled");assert.equal(plays,0);
});
test("one normalizer centers DOM tokens, boxes, coordinates and mouse positions through zoom and pan", () => {
  const layer = { clientWidth: 400, clientHeight: 200, getBoundingClientRect: () => ({ left: 100, top: 50, width: 800, height: 400 }) };
  const body = { getBoundingClientRect: () => ({ left: 180, top: 90, width: 80, height: 40 }) };
  const token = { dataset: { tokenId: "source" }, querySelector: () => body, getBoundingClientRect: body.getBoundingClientRect };
  for (const input of [token, { id: "source" }, { element: token }]) {
    const point = normalizeAnimationPoint(input, { layer, getTokenElement: () => token });
    assert.equal(point.centerX, 60); assert.equal(point.centerY, 30); assert.equal(point.width, 40);
  }
  assert.equal(normalizeAnimationPoint({ x: 40, y: 20, width: 40, height: 20 }).centerX, 60);
  assert.equal(normalizeAnimationPoint({ x: 60, y: 30 }).centerX, 60);
  assert.equal(normalizeAnimationPoint({ clientX: 220, clientY: 110 }, { layer }).centerX, 60);
  assert.equal(normalizeAnimationPoint({ x: 0, y: 0, xRatio: .5, yRatio: .5 }, { layer }).centerX, 200);
});
test("fixed points resize with the map while followSource re-reads the runtime actor", () => {
  const layer = { clientWidth: 400, clientHeight: 200 }; let source = { x: 40, y: 50 };
  const context = normalizeAnimationRuntimeContext({ source: () => source, target: { x: 200, y: 60 } }, { layer });
  source = { x: 80, y: 90 };
  assert.deepEqual(context.sample({}).source, { x: 40, y: 50 });
  assert.deepEqual(context.sample({ followSource: true }).source, source);
  layer.clientWidth = 800; layer.clientHeight = 400;
  assert.deepEqual(context.sample({}).target, { x: 400, y: 120 });
  assert.deepEqual(context.sample({ followSource: true }).source, source);
});
test("sword, spear, self healing, other healing, ground and beam share centered placement and facing", () => {
  const source = { x: 50, y: 100 }, target = { x: 250, y: 100 }, map = { x: 130, y: 200 };
  for (const [mode, expected] of [["SOURCE",source],["TARGET",target],["MIDPOINT",{x:150,y:100}],["WORLD",map],["SOURCE_TO_TARGET",source],["SOURCE_TOWARD_TARGET",{x:90,y:100}]]) {
    const d = normalizeAnimationDefinition({ ...base, placement: { mode }, direction: { mode: "face-target", sourceDirection: "up" } });
    const v = chooseAnimationVariation(d), timing = animationTiming(d,v,source,target);
    const sample = sampleAnimation(d,0,{source,target,map},v,timing);
    assert.equal(sample.x,expected.x); assert.equal(sample.y,expected.y); assert.equal(sample.rotation,90);
    const self = sampleAnimation(d,0,{source,target:source,map},v,timing); assert.equal(self.rotation,0);
  }
  const missing = normalizeAnimationRuntimeContext({ source }); assert.deepEqual(missing.sample().source, missing.sample().target);
});
test("spell stage overrides survive normalization and dependencies prevent silent deletes", () => {
  const library = createAnimationLibrary(); library.registerAnimation(base); library.registerAnimation({...base,id:"replacement"});
  const bindings = createAnimationBindings({library});
  bindings.setAnimation("spell:fireball", { animations: { cast: null, impact: { animationId: "sprite", overrides: { tint: "#ff5500", scale: 1.5 } } } });
  assert.equal(bindings.getAssignment("spell:fireball").animations.impact.overrides.scale,1.5);
  assert.equal(library.getAnimationUsage("sprite").length,1);
  assert.throws(()=>library.deleteAnimation("sprite"),/used by 1/);
  library.deleteAnimation("sprite",{replaceWith:"replacement"});
  assert.equal(bindings.getAssignment("spell:fireball").animations.impact.animationId,"replacement");
  assert.deepEqual(normalizeSpellAnimations({impact:"missing",cast:null}),{impact:"missing"});
});
test("room definitions stay private to their selected room and replacement preserves identity", () => {
  const library=createAnimationLibrary(); library.setContext({roomId:"room-a"});
  library.registerAnimation({...base,ownership:{scope:"room"},collections:["Sword Pack"]});
  library.updateAnimation("sprite",{sprite:"next.png"});
  assert.equal(library.getAnimation("sprite").id,"sprite"); assert.equal(library.getAnimation("sprite").revision,2);
  assert.equal(library.query({collection:"sword pack"}).length,1);
  library.setContext({roomId:"room-b"}); assert.equal(library.getAnimation("sprite"),null); assert.equal(library.list().length,0);
});
