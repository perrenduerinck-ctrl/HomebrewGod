import test from 'node:test';
import assert from 'node:assert/strict';
import {getDefaultSpellById as spell} from '../data/defaultSpells.js';
import {createSpellOutcomeRequest,isSpellOutcomeRequest} from '../spells/spellOutcomes.js';
import {applySpellOutcome} from '../spells/spellOutcomePersistence.js';
import {captureSpellArea,tokenInsideSpellArea,spellAreaTrigger,spellAreaActive} from '../spells/spellAreas.js';
import {advanceSpellArea} from '../spells/spellAreaPersistence.js';
const clone=v=>structuredClone(v);
function fixture(id='moonbeam',level=3){
 const geometry={shape:id==='moonbeam'?'cylinder':'sphere',anchor:{x:500,y:300},sizePixels:50,verticalBounds:{minFeet:0,maxFeet:40}};
 const metrics={width:1000,height:600,tokenPixels:50};
 const request=createSpellOutcomeRequest({id:'cast',spell:spell(id),slot:{level,spellSaveDc:15},target:{geometry,affectedTokens:[]},areaMetrics:metrics,casterToken:{id:'caster'},tokens:[{id:'caster',linkedCharacterId:'source'}],castingContext:{worldTime:100,initiative:{combatActive:true,turnCounter:4,currentCombatantId:'caster',initiativeOrder:[{tokenId:'caster'},{tokenId:'target'}]}}});
 request.concentrationStartedAtMillis=1;
 const store=new Map(Object.entries({'rooms/R':{dmUid:'dm',currentMap:{id:''},initiativeState:{combatActive:true,turnCounter:4,currentCombatantId:'caster',initiativeOrder:[{tokenId:'caster'},{tokenId:'target'}]}},'rooms/R/characters/source':{revision:1,combat:{currentHp:40,maxHp:40,concentration:{spellId:id,startedAtMillis:1},spellOutcomes:[request]}},'rooms/R/tokens/caster':{id:'caster',linkedCharacterId:'source',x:10,y:10},'rooms/R/tokens/target':{id:'target',name:'Target',currentHp:40,maxHp:40,x:50,y:50,visibility:'shared'}}));
 const deps={db:{},doc:(_, ...parts)=>parts.join('/'),serverTimestamp:()=>0,roomCode:'R',userUid:'dm',sourceKind:'characters',sourceActorId:'source',context:{worldTime:100},runTransaction:async(_,fn)=>{
  let writing=false;const writes=[];const tx={get:async ref=>{assert(!writing,'all reads precede writes');return {exists:()=>store.has(ref),data:()=>clone(store.get(ref))};},update:(ref,v)=>{writing=true;writes.push(()=>store.set(ref,{...store.get(ref),...clone(v)}));},set:(ref,v)=>{writing=true;writes.push(()=>store.set(ref,clone(v)));},delete:ref=>{writing=true;writes.push(()=>store.delete(ref));}};const result=await fn(tx);writes.forEach(fn=>fn());return result;
 }};
 const state=()=>store.get('rooms/R/characters/source').combat;
 const transition=(counter,tokenId)=>Object.assign(store.get('rooms/R').initiativeState,{turnCounter:counter,currentCombatantId:tokenId});
 return {store,deps,state,request,transition,place:()=>applySpellOutcome({...deps,requestId:'cast'}),advance:extra=>advanceSpellArea({...deps,areaId:'cast',random:()=>.5,...extra}),apply:(requestId,decisions={})=>applySpellOutcome({...deps,requestId,decisions})};
}

test('area coordinates survive map resize, include token footprints, and reject other floors and elevations',()=>{
 const area=captureSpellArea({shape:'cylinder',anchor:{x:500,y:300},sizePixels:50,verticalBounds:{minFeet:0,maxFeet:40}},{width:1000,height:600,tokenPixels:50});
 assert.equal(area.x,50);assert.equal(area.y,50);const zone={area,sceneId:'',floorId:''};
 assert(tokenInsideSpellArea(zone,{x:57,y:50}));assert(!tokenInsideSpellArea(zone,{x:60,y:50}));assert(!tokenInsideSpellArea(zone,{x:50,y:50,elevation:50}));assert(!tokenInsideSpellArea(zone,{x:50,y:50,floorId:'upstairs'}));assert(!tokenInsideSpellArea(zone,{x:50,y:50,visibility:'dm'}));
});

test('empty Moonbeam placements save an area without immediate damage or a saving throw',async()=>{
 const f=fixture();assert.deepEqual(f.request.damage,[]);assert.equal(f.request.save,null);await f.place();assert.equal(f.state().currentHp,40);assert.equal(f.store.get('rooms/R/tokens/target').currentHp,40);assert.equal(f.state().spellAreas[0].saveDc,15);assert.deepEqual(await f.advance(),[]);
 assert.equal(spellAreaTrigger(f.state().spellAreas[0],'start').formula,'3d10');
});

test('Moonbeam turn damage rolls once, applies once, and shares entry receipts across token aliases',async()=>{
 const f=fixture();await f.place();f.transition(5,'target');const ids=await f.advance();assert.equal(ids.length,1);const pending=f.state().spellOutcomes.find(r=>r.id===ids[0]);assert.equal(pending.damage[0].total,18);assert.equal(pending.save.dc,15);
 assert.deepEqual(await f.advance(),[]);assert.deepEqual(await f.advance({manualEntryTokenId:'target'}),[]);
 await f.apply(ids[0],{target:{outcome:'saved'}});await f.apply(ids[0]);assert.equal(f.store.get('rooms/R/tokens/target').currentHp,31);
});

test('Hunger of Hadar separates automatic cold start damage from acid end-save damage',async()=>{
 const f=fixture('hunger-of-hadar');await f.place();f.transition(5,'target');let ids=await f.advance();assert.equal(ids.length,1);let r=f.state().spellOutcomes.find(r=>r.id===ids[0]);assert.equal(r.save,null);assert.equal(r.damage[0].damageType,'cold');await f.apply(r.id);assert.equal(f.store.get('rooms/R/tokens/target').currentHp,32);
 f.transition(6,'caster');ids=await f.advance();assert.equal(ids.length,1);r=f.state().spellOutcomes.find(r=>r.id===ids[0]);assert.equal(r.save.ability,'dex');assert.equal(r.save.success,'none');assert.equal(r.damage[0].damageType,'acid');await f.apply(r.id,{target:{outcome:'saved'}});assert.equal(f.store.get('rooms/R/tokens/target').currentHp,32);assert.deepEqual(await f.advance(),[]);
});

test('moving Moonbeam uses a bounded action move and does not create entry damage',async()=>{
 const f=fixture();await f.place();assert.deepEqual(await f.advance({movePoint:{x:60,y:50}}),[]);assert.equal(f.state().spellAreas[0].area.x,60);assert.equal(f.state().spellOutcomes.length,1);
 await assert.rejects(f.advance({movePoint:{x:200,y:50}}),/point on the map/);await assert.rejects(f.advance({movePoint:{x:0,y:0}}),/60 feet/);
});

test('expiry, concentration recasts, stale casters, and DM permissions prevent new triggers',async()=>{
 for(const mode of ['expiry','concentration','floor','permission']){const f=fixture();await f.place();f.transition(5,'target');if(mode==='expiry'){await f.advance({context:{worldTime:160}});assert.equal(f.state().spellAreas[0].status,'ended');}if(mode==='concentration'){f.state().concentration.startedAtMillis=2;assert.deepEqual(await f.advance(),[]);}if(mode==='floor'){f.store.get('rooms/R/tokens/caster').floorId='other';assert.deepEqual(await f.advance(),[]);}if(mode==='permission')await assert.rejects(f.advance({userUid:'player'}),/Only the room DM/);assert.equal(f.state().spellOutcomes.length,1);}
});

test('reconnecting after missed turns queues only the current start, without inventing old end events',async()=>{
 const f=fixture('hunger-of-hadar');await f.place();f.transition(12,'target');const ids=await f.advance();assert.equal(ids.length,1);assert.equal(f.state().spellOutcomes.find(r=>r.id===ids[0]).areaTrigger.phase,'start');assert.deepEqual(await f.advance(),[]);
});

test('linked aliases cannot duplicate Moonbeam entry damage, and restarting combat has a new receipt scope',async()=>{
 const f=fixture();f.store.get('rooms/R/tokens/target').linkedCharacterId='victim';await f.place();f.transition(5,'target');assert.equal((await f.advance()).length,1);
 f.store.set('rooms/R/tokens/alias',{...f.store.get('rooms/R/tokens/target'),id:'alias'});assert.deepEqual(await f.advance({manualEntryTokenId:'alias'}),[]);
 f.store.get('rooms/R').initiativeState.combatActive=false;await f.advance();f.store.get('rooms/R').initiativeState.combatActive=true;f.transition(5,'target');assert.equal((await f.advance()).length,1);
});
test('pending area damage cannot apply after expiry and invalid area metadata is rejected',async()=>{
 const f=fixture();await f.place();f.transition(5,'target');const [id]=await f.advance();f.store.get('rooms/R').worldTime=160;await assert.rejects(f.apply(id,{target:{outcome:'failed-save'}}),/ended/);delete f.store.get('rooms/R').worldTime;const invalid=clone(f.request);invalid.areaPlacement.radiusX=-1;assert.equal(isSpellOutcomeRequest(invalid),false);
 const source=f.store.get('rooms/R/characters/source');source.combat.spellAreas[0].status='ended';await assert.rejects(f.apply(id,{target:{outcome:'failed-save'}}),/ended/);assert.equal(f.store.get('rooms/R/tokens/target').currentHp,40);
});
