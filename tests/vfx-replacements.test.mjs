import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { MODERN_SPRITE_ASSETS, MODERN_SPRITE_REPLACEMENTS, getVersionedSprite } from '../vfx/spriteReplacements.js';
import { createDefaultEffectRegistry } from '../vfx/effectRegistry.js';
import { resolveVfxClipDefinition, validateModernSprite } from '../vfx/assetVersions.js';
import { STORM_EFFECT_DEFINITIONS } from '../vfx/stormEffects.js';

test('seven alpha replacements retain every original and all 36 nonempty frames without edge bleed',()=>{
 const reports=JSON.parse(readFileSync(new URL('../assets/vfx/audit/priority-seven-alpha.json',import.meta.url)));
 const originals=JSON.parse(readFileSync(new URL('../assets/vfx/audit/alpha-report.json',import.meta.url)));
 assert.equal(Object.keys(MODERN_SPRITE_ASSETS).length,7);
 for(const asset of Object.values(MODERN_SPRITE_ASSETS)){
  assert.deepEqual(validateModernSprite(asset),[]);
  const file=readFileSync(new URL('../'+asset.src,import.meta.url));assert.equal(file[25],6);
  const report=reports.find(r=>r.source===asset.src.slice(2));
  assert.equal(createHash('sha256').update(file).digest('hex'),report.sha256);
  assert.equal(report.frames.length,36);assert.equal(report.opaqueBlack,0);assert.ok(report.transparent>.5);
  assert.deepEqual(report.review.emptyFrames,[]);assert.deepEqual(report.review.edgeFrames,[]);
  const old=readFileSync(new URL('../'+asset.original,import.meta.url));
  assert.equal(createHash('sha256').update(old).digest('hex'),originals.find(r=>r.source===asset.original.slice(2)).sha256);
 }
});

test('only the requested active sources are migrated and every role retains a usable legacy fallback',()=>{
 const registry=createDefaultEffectRegistry();
 for(const [id,modern] of Object.entries(MODERN_SPRITE_REPLACEMENTS)){
  const legacy=registry.get(id).sprite;assert.equal(legacy.src,modern.original);
  const versions=getVersionedSprite(id,legacy);
  assert.equal(resolveVfxClipDefinition(versions).src,modern.src);
  for(const assetAvailable of [()=>true,src=>src!==modern.src]){
   assert.equal(resolveVfxClipDefinition(versions,{mode:'legacy',assetAvailable}).src,legacy.src);
  }
  assert.equal(resolveVfxClipDefinition(versions,{assetAvailable:src=>src!==modern.src}).frameCount,legacy.frameCount);
 }
 assert.ok(!MODERN_SPRITE_REPLACEMENTS['storm-lightning-charge']);
 assert.ok(!Object.keys(MODERN_SPRITE_REPLACEMENTS).some(id=>id.startsWith('status-')));
});

test('Ice Storm uses decoded modern frost frames and cancels all native child animations',()=>{
 for(const loaded of [false,true]){
  const nodes=[],animations=[];const document={createElement(){return{dataset:{},style:{setProperty(){}},animate(frames){const a={frames,cancelled:false,cancel(){this.cancelled=true;}};animations.push(a);return a;}};}};
  const assetCache={preload(){return Promise.resolve(loaded);},getStatus(){return loaded?'loaded':'failed';}};
  const dispose=STORM_EFFECT_DEFINITIONS.find(d=>d.id==='storm-hail').configureElement({document,assetCache,element:{appendChild(n){nodes.push(n);}},effect:{effectsMode:'reduced',duration:1800,intensity:1}});
  const sprites=nodes.filter(n=>n.className==='hg-storm-ice-burst');assert.equal(sprites.length,2);
  assert.ok(sprites.every(n=>n.dataset.vfxAssetVersion===(loaded?'modern6x6':'legacy')));
  assert.equal(animations[0].frames[0].backgroundPosition,loaded?'-800px -160px':'-640px -160px');
  assert.equal(animations[0].frames.at(-1).backgroundPosition,loaded?'-800px -800px':'-640px -640px');
  dispose();assert.ok(animations.every(a=>a.cancelled));
 }
});
