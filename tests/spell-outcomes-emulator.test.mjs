import test,{before,after,beforeEach} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,deleteDoc,updateDoc,runTransaction,serverTimestamp} from 'firebase/firestore';
import {getDefaultSpellById as spell} from '../data/defaultSpells.js';
import {createSpellOutcomeRequest} from '../spells/spellOutcomes.js';import {applySpellOutcome} from '../spells/spellOutcomePersistence.js';
import {applyConfirmedSpellCast} from '../combat/characterCombatCommands.js';import {prepareConditionMutation} from '../effects/conditionPersistence.js';
import {getSpellcasterBlockReason} from '../spells/spellCastingRules.js';
let environment;const ROOM='SPELL-OUTCOMES';
before(async()=>{assert(process.env.FIRESTORE_EMULATOR_HOST);environment=await initializeTestEnvironment({projectId:'demo-homebrew-god',firestore:{rules:await readFile(new URL('../firestore.rules',import.meta.url),'utf8')}});});
after(async()=>{await environment?.cleanup();});beforeEach(async()=>{await environment.clearFirestore();});
const client=(uid='outcome-dm')=>environment.authenticatedContext(uid).firestore();
const read=async(path,db=client())=>(await getDoc(doc(db,'rooms',ROOM,...path))).data();
async function seed(id='fireball'){
 const request=createSpellOutcomeRequest({id:'outcome-test',spell:spell(id),slot:{level:Math.max(1,spell(id).level),spellcastingModifier:4,spellSaveDc:15,spellAttackBonus:7},target:{affectedTokens:[{id:'target'}]},casterToken:{id:'caster'},tokens:[{id:'target',name:'Target',linkedCharacterId:'victim'}],castingContext:{worldTime:100},random:()=>.5});
 request.concentrationStartedAtMillis=request.concentration?1:0;
 await environment.withSecurityRulesDisabled(async context=>{const db=context.firestore();for(const [path,value] of [
  [[],{roomCode:ROOM,dmUid:'outcome-dm'}],
  [['players','outcome-player'],{uid:'outcome-player',role:'player'}],
  [['characters','source'],{roomCode:ROOM,ownerUid:'outcome-player',revision:1,magic:{knownSpellIds:[id],slots:{3:1}},combat:{currentHp:40,maxHp:40,spellOutcomes:[request],concentration:request.concentration?{spellId:id,startedAtMillis:1}:null}}],
  [['characters','victim'],{roomCode:ROOM,ownerUid:'other-owner',revision:1,combat:{currentHp:40,maxHp:40,temporaryHp:5,concentration:{spellId:'bless',spellName:'Bless',startedAtMillis:2}}}],
  [['tokens','caster'],{id:'caster',ownerUid:'outcome-player',linkedCharacterId:'source',visibility:'shared',currentHp:40,maxHp:40}],
  [['tokens','target'],{id:'target',name:'Target',ownerUid:'other-owner',linkedCharacterId:'victim',visibility:'shared',currentHp:40,maxHp:40}]
 ])await setDoc(doc(db,'rooms',ROOM,...path),value);});
 return request;
}
const apply=(db=client(),overrides={})=>applySpellOutcome({db,doc,runTransaction,serverTimestamp,roomCode:ROOM,userUid:'outcome-dm',sourceKind:'characters',sourceActorId:'source',requestId:'outcome-test',decisions:{target:{outcome:'failed-save'}},context:{worldTime:100},...overrides});

test('two independent DM clients apply a spell once, atomically with its durable completion record',async()=>{
 await seed();const results=await Promise.allSettled([apply(client()),apply(client())]);assert.equal(results.filter(r=>r.status==='fulfilled'&&!r.value.alreadyApplied).length,1);for(const result of results)if(result.status==='rejected')assert.match(result.reason.message,/PERMISSION_DENIED|contention|ABORTED/i);assert.equal((await read(['characters','victim'])).combat.currentHp,13);assert.equal((await read(['tokens','target'])).currentHp,13);assert.equal((await read(['characters','victim'])).combat.pendingConcentrationCheck.dc,16);assert.equal((await read(['characters','source'])).combat.spellOutcomes[0].status,'applied');
 await apply(client(),{decisions:{target:{outcome:'saved'}}});assert.equal((await read(['characters','victim'])).combat.currentHp,13);
});

test('players cannot apply another actor HP or create spell conditions',async()=>{
 await seed('hold-person');const db=client('outcome-player');await assert.rejects(apply(db,{userUid:'outcome-player'}),/Only the current room DM/);
 await assertFails(updateDoc(doc(db,'rooms',ROOM,'characters','victim'),{combat:{currentHp:0,maxHp:40},revision:2}));
 await assertFails(updateDoc(doc(db,'rooms',ROOM,'tokens','target'),{currentHp:0}));
 await apply();const condition=(await read(['tokens','target'])).effectConditions;const id=Object.keys(condition)[0],effect=await read(['effects',id]);assert.equal(effect.timing.spell.repeatSave,'wis');assert.equal(effect.timing.spell.saveDc,15);
 await assertFails(setDoc(doc(db,'rooms',ROOM,'effects','forged'),{...effect,id:'forged',createdByUid:'outcome-player'}));
 await assertFails(setDoc(doc(client(),'rooms',ROOM,'effects','invalid-spell'),{...effect,id:'invalid-spell',spell:{unsupported:true}}));
});

test('conditions update both target and actor; removal clears the actor even if its token was deleted',async()=>{
 await seed('hold-person');await apply();let target=await read(['characters','victim']);assert.equal(target.combat.concentration,null);assert.match(getSpellcasterBlockReason(target),/incapacitated/);
 const token=await read(['tokens','target']),id=Object.keys(token.effectConditions)[0],record=await read(['effects',id]);
 const db=client();await deleteDoc(doc(db,'rooms',ROOM,'tokens','target'));
 await runTransaction(db,async transaction=>{const prepared=await prepareConditionMutation(transaction,{db,doc,roomCode:ROOM,userUid:'outcome-dm',record,remove:true,serverTimestamp});transaction.delete(doc(db,'rooms',ROOM,'effects',id));prepared.write();});
 target=await read(['characters','victim']);assert.deepEqual(target.combat.effectConditions,{});assert.equal(getSpellcasterBlockReason(target),'');assert.equal(await read(['effects',id]),undefined);
});

test('a removed or relinked target aborts the entire spell and leaves the request pending',async()=>{
 await seed();await updateDoc(doc(client(),'rooms',ROOM,'tokens','target'),{linkedCharacterId:'someone-else'});await assert.rejects(apply(),/changed map/);assert.equal((await read(['characters','victim'])).combat.currentHp,40);assert.equal((await read(['characters','source'])).combat.spellOutcomes[0].status,'pending');
});

test('a player cast saves the pending request in the same character write that spends the slot',async()=>{
 const request=await seed();await environment.withSecurityRulesDisabled(async context=>{await updateDoc(doc(context.firestore(),'rooms',ROOM,'characters','source'),{'combat.spellOutcomes':[]});});
 const db=client('outcome-player'),ref=doc(db,'rooms',ROOM,'characters','source');
 await runTransaction(db,async transaction=>{const actor=(await transaction.get(ref)).data();const next=applyConfirmedSpellCast(actor,{...spell('fireball'),known:true},{kind:'normal',level:3,outcomeRequest:request});transaction.update(ref,{magic:next.magic,combat:next.combat,revision:actor.revision+1});});
 const actor=await read(['characters','source']);assert.equal(actor.magic.slotUsage.normal[3],1);assert.equal(actor.combat.spellOutcomes[0].id,request.id);assert.equal(actor.combat.spellOutcomes[0].status,'pending');
 await apply();assert.equal((await read(['characters','source'])).magic.slotUsage.normal[3],1);
});

test('a full 24-target area resolves atomically under real room permissions',async()=>{
 const request=await seed();request.targets=Array.from({length:24},(_,i)=>({tokenId:'area-'+i,name:'Area target '+i,collection:'tokens',characterId:'',monsterId:'',sceneId:'',floorId:''}));
 await environment.withSecurityRulesDisabled(async context=>{const db=context.firestore();await updateDoc(doc(db,'rooms',ROOM,'characters','source'),{'combat.spellOutcomes':[request]});for(const target of request.targets)await setDoc(doc(db,'rooms',ROOM,'tokens',target.tokenId),{id:target.tokenId,visibility:'shared',name:target.name,currentHp:100,maxHp:100});});
 const decisions=Object.fromEntries(request.targets.map(t=>[t.tokenId,{outcome:'failed-save'}]));await apply(client(),{decisions});
 for(const target of request.targets)assert.equal((await read(['tokens',target.tokenId])).currentHp,68);assert.equal((await read(['characters','source'])).combat.spellOutcomes[0].status,'applied');
});

test('a monster spell result keeps its completion marker through self damage and concentration checks',async()=>{
 const request=await seed();request.sourceTokenId='monster-caster';request.targets=[{tokenId:'monster-caster',name:'Monster caster',collection:'tokens',characterId:'',monsterId:'mage',sceneId:'',floorId:''}];
 await environment.withSecurityRulesDisabled(async context=>{const db=context.firestore();await setDoc(doc(db,'rooms',ROOM,'monsters','mage'),{roomCode:ROOM,ownerUid:'outcome-dm',revision:1,name:'Mage',spellcasting:{spellOutcomes:[request],concentration:{spellId:'bless',spellName:'Bless',startedAtMillis:2}}});await setDoc(doc(db,'rooms',ROOM,'tokens','monster-caster'),{id:'monster-caster',name:'Mage',visibility:'shared',linkedMonsterId:'mage',currentHp:40,maxHp:40});});
 const result=await apply(client(),{sourceKind:'monsters',sourceActorId:'mage',decisions:{'monster-caster':{outcome:'failed-save'}}});assert.equal(result.alreadyApplied,false);assert.equal((await read(['tokens','monster-caster'])).currentHp,8);let mage=await read(['monsters','mage']);assert.equal(mage.spellcasting.pendingConcentrationCheck.dc,16);assert.equal(mage.spellcasting.spellOutcomes[0].status,'applied');
 const again=await apply(client(),{sourceKind:'monsters',sourceActorId:'mage',decisions:{'monster-caster':{outcome:'failed-save'}}});assert.equal(again.alreadyApplied,true);assert.equal((await read(['tokens','monster-caster'])).currentHp,8);
});

import {advanceSpellArea} from '../spells/spellAreaPersistence.js';
async function seedArea(id='moonbeam'){
 await seed();const db=client();
 const request=createSpellOutcomeRequest({id:'area-cast',spell:spell(id),slot:{level:3,spellSaveDc:15},target:{geometry:{shape:id==='moonbeam'?'cylinder':'sphere',anchor:{x:500,y:300},sizePixels:50},affectedTokens:[]},areaMetrics:{width:1000,height:600,tokenPixels:50},casterToken:{id:'caster'},tokens:[{id:'caster',linkedCharacterId:'source'}],castingContext:{worldTime:100,initiative:{combatActive:true,turnCounter:1,currentCombatantId:'caster',initiativeOrder:[{tokenId:'caster'},{tokenId:'target'}]}}});request.concentrationStartedAtMillis=1;
 await updateDoc(doc(db,'rooms',ROOM),{initiativeState:{combatActive:true,turnCounter:1,currentCombatantId:'caster',initiativeOrder:[{tokenId:'caster'},{tokenId:'target'}]}});
 await updateDoc(doc(db,'rooms',ROOM,'tokens','caster'),{x:10,y:50});await updateDoc(doc(db,'rooms',ROOM,'tokens','target'),{x:50,y:50});
 const source=await read(['characters','source']);await updateDoc(doc(db,'rooms',ROOM,'characters','source'),{combat:{...source.combat,concentration:{spellId:id,startedAtMillis:1},spellOutcomes:[request]},revision:source.revision+1});
 await apply(db,{requestId:'area-cast'});
 const advance=(overrides={})=>advanceSpellArea({db,doc,runTransaction,serverTimestamp,roomCode:ROOM,userUid:'outcome-dm',sourceKind:'characters',sourceActorId:'source',areaId:'area-cast',context:{worldTime:100},random:()=>.5,...overrides});
 return {db,advance};
}
test('real permissions: two DM clients queue one area trigger and the saved damage applies once',async()=>{
 const {db,advance}=await seedArea();await updateDoc(doc(db,'rooms',ROOM),{'initiativeState.turnCounter':2,'initiativeState.currentCombatantId':'target'});
 const results=await Promise.allSettled([advance(),advance({db:client()})]);assert.equal(results.filter(r=>r.status==='fulfilled').flatMap(r=>r.value).length,1);
 const source=await read(['characters','source']),pending=source.combat.spellOutcomes.filter(r=>r.status==='pending');assert.equal(pending.length,1);assert.equal(pending[0].damage[0].total,18);assert.equal((await read(['characters','victim'])).combat.currentHp,40);
 await apply(db,{requestId:pending[0].id});await apply(db,{requestId:pending[0].id});assert.equal((await read(['characters','victim'])).combat.currentHp,27);assert.deepEqual(await advance(),[]);
});
test('real permissions: Hunger of Hadar queues separate turn phases and players cannot trigger or move areas',async()=>{
 const {db,advance}=await seedArea('hunger-of-hadar');await assert.rejects(advance({db:client('outcome-player'),userUid:'outcome-player'}),/Only the room DM/);
 await updateDoc(doc(db,'rooms',ROOM),{'initiativeState.turnCounter':2,'initiativeState.currentCombatantId':'target'});const [start]=await advance();let request=(await read(['characters','source'])).combat.spellOutcomes.find(r=>r.id===start);assert.equal(request.save,null);assert.equal(request.damage[0].damageType,'cold');
 await updateDoc(doc(db,'rooms',ROOM),{'initiativeState.turnCounter':3,'initiativeState.currentCombatantId':'caster'});const [end]=await advance();request=(await read(['characters','source'])).combat.spellOutcomes.find(r=>r.id===end);assert.equal(request.save.ability,'dex');assert.equal(request.damage[0].damageType,'acid');assert.equal((await read(['characters','victim'])).combat.currentHp,40);
});
