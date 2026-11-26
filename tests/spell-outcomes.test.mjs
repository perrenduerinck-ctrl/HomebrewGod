import test from 'node:test';import assert from 'node:assert/strict';
import {DEFAULT_SPELLS,getDefaultSpellById as spell} from '../data/defaultSpells.js';
import {rollSpellDice,createSpellOutcomeRequest,getSpellOutcomeSupport,getSpellTargetAmounts,queueSpellOutcome} from '../spells/spellOutcomes.js';
import {applySpellOutcome} from '../spells/spellOutcomePersistence.js';
import {applyConfirmedSpellCast} from '../combat/characterCombatCommands.js';
import {applyMonsterConcentrationEvent,resolveMonsterSpellcastingStats} from '../combat/monsterSpellcasting.js';
import {normalizeEffectInstance} from '../effects/effectModel.js';import {getEffectExpirationReason} from '../effects/effectDuration.js';
import {createEffectRuntime} from '../effects/effectRuntime.js';import {defaultEffectRegistry} from '../effects/effectRegistry.js';
import {getSpellcasterBlockReason} from '../spells/spellCastingRules.js';
const clone=v=>structuredClone(v);
const makeRequest=(id='fireball',extra={})=>createSpellOutcomeRequest({id:'cast-1',spell:spell(id),slot:{level:Math.max(1,spell(id).level),spellcastingModifier:4,spellSaveDc:15,spellAttackBonus:7},target:{affectedTokens:[{id:'target'}]},casterToken:{id:'caster'},tokens:[{id:'target',name:'Target',linkedCharacterId:'victim'}],characterLevel:5,castingContext:{worldTime:100},random:()=>.5,...extra});
function fixture(request=makeRequest(),{retry=false,targetOverrides={},victimOverrides={}}={}){
 const caster={roomCode:'OUTCOME',ownerUid:'player',revision:1,combat:{currentHp:40,maxHp:40,concentration:request.concentration?{spellId:request.spellId,startedAtMillis:1}:null,spellOutcomes:[{...request,concentrationStartedAtMillis:request.concentration?1:0}]}};
 const store=new Map(Object.entries({
  'rooms/OUTCOME':{dmUid:'dm'},
  'rooms/OUTCOME/characters/source':caster,
  'rooms/OUTCOME/characters/victim':{roomCode:'OUTCOME',ownerUid:'player',revision:1,combat:{currentHp:40,maxHp:40,temporaryHp:5,concentration:{spellId:'bless',spellName:'Bless',startedAtMillis:2}},...victimOverrides},
  'rooms/OUTCOME/tokens/caster':{linkedCharacterId:'source'},
  'rooms/OUTCOME/tokens/target':{name:'Target',linkedCharacterId:'victim',currentHp:40,maxHp:40,...targetOverrides}
 }));
 const deps={db:{},doc:(_, ...parts)=>parts.join('/'),serverTimestamp:()=>0,roomCode:'OUTCOME',userUid:'dm',sourceKind:'characters',sourceActorId:'source',requestId:request.id,decisions:{target:{outcome:request.attack?'hit':request.save?'failed-save':'automatic'}},context:{worldTime:100},runTransaction:async(_,fn)=>{
  const run=async commit=>{let writing=false;const writes=[];const transaction={get:async ref=>{assert.equal(writing,false,'all reads must precede every write');return {exists:()=>store.has(ref),data:()=>clone(store.get(ref))};},update:(ref,data)=>{writing=true;writes.push(()=>store.set(ref,{...store.get(ref),...clone(data)}));},set:(ref,data)=>{writing=true;writes.push(()=>store.set(ref,clone(data)));},delete:ref=>{writing=true;writes.push(()=>store.delete(ref));}};await fn(transaction);if(commit)writes.forEach(fn=>fn());};if(retry)await run(false);await run(true);
 }};
 return {deps,store,apply:overrides=>applySpellOutcome({...deps,...overrides}),caster:()=>store.get('rooms/OUTCOME/characters/source'),victim:()=>store.get('rooms/OUTCOME/characters/victim'),token:()=>store.get('rooms/OUTCOME/tokens/target'),effects:()=>[...store].filter(([k])=>k.includes('/effects/')).map(([,v])=>v)};
}

test('spell dice accept bounded formulas, preserve rolls, and reject unsupported expressions',()=>{
 assert.deepEqual(rollSpellDice('2d8 + 4',()=>.5),{formula:'2d8 + 4',total:14,rolls:[5,5]});assert.equal(rollSpellDice('1d8 - 3',()=>0).total,0);
 for(const f of ['1d8 + MOD','2d6 + 2d6 fire','101d6','1d1001','-10 + nope'])assert.throws(()=>rollSpellDice(f));
});

test('all supported built-in spells build valid persisted outcomes across slot levels and cantrip tiers',()=>{
 const supported=DEFAULT_SPELLS.filter(s=>getSpellOutcomeSupport(s).supported);assert.equal(supported.length,38);
 for(const s of supported)for(const level of [Math.max(1,s.level),9])for(const characterLevel of [1,5,11,17]){
  const r=makeRequest(s.id,{slot:{level,spellcastingModifier:-1,spellSaveDc:12,spellAttackBonus:4},characterLevel});assert.ok(r,s.id);assert.doesNotThrow(()=>getSpellTargetAmounts(r,'target',{target:{outcome:r.attack?'hit':r.save?'failed-save':'automatic'}}),s.id);
 }
 assert.equal(getSpellOutcomeSupport(spell('hunger-of-hadar')).supported,false);assert.equal(getSpellOutcomeSupport(spell('mass-heal')).supported,false);
});

test('saved casts include their result request and duplicate queueing spends nothing twice',()=>{
 const s={...spell('fireball'),known:true},r=makeRequest(),caster={combat:{currentHp:40,maxHp:40},magic:{knownSpellIds:['fireball'],slots:{3:2}}};
 const next=applyConfirmedSpellCast(caster,s,{kind:'normal',level:3,outcomeRequest:r});assert.equal(next.magic.slotUsage.normal[3],1);assert.equal(next.combat.spellOutcomes[0].id,r.id);assert.equal(caster.combat.spellOutcomes,undefined);
 assert.throws(()=>applyConfirmedSpellCast(next,s,{kind:'normal',level:3,outcomeRequest:r}),/already recorded/);assert.equal(next.magic.slotUsage.normal[3],1);
});

test('saves, criticals, misses, resistance, immunity, and healing restrictions resolve without rerolling',()=>{
 const r=makeRequest();assert.equal(r.damage[0].total,32);
 assert.equal(getSpellTargetAmounts(r,'target',{target:{outcome:'saved'}},{damageResistances:['fire']}).damage,8);
 assert.equal(getSpellTargetAmounts(r,'target',{target:{outcome:'failed-save'}},{damageImmunities:['fire']}).damage,0);
 const ray=makeRequest('ray-of-sickness');assert.equal(getSpellTargetAmounts(ray,'target',{target:{outcome:'miss'}}).damage,0);assert.deepEqual(getSpellTargetAmounts(ray,'target',{target:{outcome:'hit'}},{conditionImmunities:['poisoned']}).conditions,[]);assert.equal(getSpellTargetAmounts(ray,'target',{target:{outcome:'critical'}}).damage,20);
 assert.throws(()=>getSpellTargetAmounts(r,'target'),/Choose/);
 const cure=makeRequest('cure-wounds');assert.equal(getSpellTargetAmounts(cure,'target',{}, {type:'undead'}).healing,0);
 const invalid=clone(r);invalid.damage[0].total=Infinity;assert.throws(()=>getSpellTargetAmounts(invalid,'target'),/Invalid stored/);
});

test('split projectiles retain independent hit decisions and damage; magic missiles share their simultaneous damage roll',()=>{
 const targets=[{id:'target'},{id:'other'}],tokens=[{id:'target'},{id:'other'}];
 const rays=makeRequest('scorching-ray',{tokens,target:{affectedTokens:targets,projectiles:[{targetId:'target',damage:'2d6 fire',label:'Ray'},{targetId:'target',damage:'2d6 fire',label:'Ray'},{targetId:'other',damage:'2d6 fire',label:'Ray'}]}});
 const decisions={'projectile-0':{outcome:'hit'},'projectile-1':{outcome:'miss'},'projectile-2':{outcome:'critical'}};
 assert.equal(getSpellTargetAmounts(rays,'target',decisions).damage,8);assert.equal(getSpellTargetAmounts(rays,'other',decisions).damage,16);
 const missiles=makeRequest('magic-missile',{tokens,target:{affectedTokens:targets,projectiles:Array.from({length:3},(_,i)=>({targetId:i===2?'other':'target',damage:'1d4 + 1 force',label:'Dart'}))}});
 assert.deepEqual(missiles.units.map(u=>u.damage[0].total),[4,4,4]);assert.equal(getSpellTargetAmounts(missiles,'target').damage,8);
});

test('HP, temporary HP absorption, concentration, and the receipt are atomic and apply once through retries',async()=>{
 const f=fixture(makeRequest(),{retry:true});const result=await f.apply();assert.equal(result.alreadyApplied,false);assert.equal(f.victim().combat.currentHp,13);assert.equal(f.victim().combat.temporaryHp,0);assert.equal(f.victim().combat.pendingConcentrationCheck.dc,16);assert.equal(f.token().currentHp,13);assert.equal(f.caster().combat.spellOutcomes[0].status,'applied');
 const again=await f.apply();assert.equal(again.alreadyApplied,true);assert.equal(f.victim().combat.currentHp,13);
});

test('failed writes, wrong DM, stale links, moved rooms, and unresolved saves change nothing',async()=>{
 for(const overrides of [{userUid:'player'},{decisions:{}},{getCurrentScope:()=>({roomCode:'OTHER',userUid:'dm'})}]){const f=fixture();const before=clone([...f.store]);await assert.rejects(f.apply(overrides));assert.deepEqual([...f.store],before);}
 const f=fixture(undefined,{targetOverrides:{linkedCharacterId:'relinked'}});await assert.rejects(f.apply(),/changed map/);assert.equal(f.caster().combat.spellOutcomes[0].status,'pending');
 const missing=fixture();missing.store.delete('rooms/OUTCOME/tokens/target');await assert.rejects(missing.apply(),/no longer exists/);assert.equal(missing.victim().combat.currentHp,40);
});

test('paralysis is persisted as a real condition, ends target concentration, and follows the caster concentration instance',async()=>{
 const f=fixture(makeRequest('hold-person'));await f.apply();assert.equal(f.effects().length,1);const raw=f.effects()[0];assert.equal(raw.spell,undefined);assert.ok(raw.timing.spell);const effect=normalizeEffectInstance(raw);assert.equal(effect.definitionId,'paralyzed');assert.equal(effect.spell.repeatSave,'wis');assert.equal(effect.spell.saveDc,15);assert.equal(f.victim().combat.concentration,null);assert.equal(getSpellcasterBlockReason(f.victim()),'The caster is incapacitated and cannot cast spells.');
 assert.equal(getEffectExpirationReason(effect,{worldTime:100,concentrationByActor:{'characters:source':{spellId:'hold-person',startedAtMillis:1}}}),'');
 assert.equal(getEffectExpirationReason(effect,{worldTime:100,concentrationByActor:{'characters:source':null}}),'concentration-ended');
 assert.equal(getEffectExpirationReason(effect,{worldTime:100,concentrationByActor:{'characters:source':{spellId:'hold-person',startedAtMillis:2}}}),'concentration-ended');
 assert.ok(normalizeEffectInstance(effect).spell);const runtime=createEffectRuntime({registry:defaultEffectRegistry});runtime.hydrate([effect]);assert.equal(runtime.getForActor('characters:victim').length,1);runtime.removeEffect(effect.id);assert.equal(runtime.getForActor('characters:victim').length,0);
});

test('restoration removes only the selected condition and keeps other sources intact',async()=>{
 const r=makeRequest('lesser-restoration'),f=fixture(r,{victimOverrides:{roomCode:'OUTCOME',ownerUid:'player',revision:1,combat:{currentHp:40,maxHp:40,conditions:['Poisoned','Blinded'],effectConditions:{poison:'poisoned',blind:'blinded'}}},targetOverrides:{effectConditions:{poison:'poisoned',blind:'blinded'}}});
 for(const [id,definitionId] of [['poison','poisoned'],['blind','blinded']])f.store.set('rooms/OUTCOME/effects/'+id,{id,definitionId,targetTokenId:'target',type:'condition'});
 await f.apply({decisions:{target:{outcome:'automatic',removeCondition:'poisoned'}}});assert.deepEqual(f.victim().combat.conditions,['Blinded']);assert.deepEqual(f.victim().combat.effectConditions,{blind:'blinded'});assert.deepEqual(f.token().effectConditions,{blind:'blinded'});assert.equal(f.store.has('rooms/OUTCOME/effects/poison'),false);assert.equal(f.store.has('rooms/OUTCOME/effects/blind'),true);
});

test('monster normalization preserves pending spell requests and actor-linked condition sources',()=>{
 const monster={spellcasting:{concentration:{spellId:'bless',startedAtMillis:1},spellOutcomes:[makeRequest()],effectConditions:{spell:'poisoned'}}};const next=applyMonsterConcentrationEvent(monster,{type:'damage',amount:10,currentHp:20});assert.equal(next.spellcasting.spellOutcomes[0].id,'cast-1');assert.equal(next.spellcasting.effectConditions.spell,'poisoned');assert.equal(next.spellcasting.pendingConcentrationCheck.dc,10);
});

test('Ray of Sickness poison lasts through the caster next turn, not only the casting turn',async()=>{
 const r=makeRequest('ray-of-sickness',{castingContext:{worldTime:100,initiative:{combatActive:true,turnCounter:4,currentCombatantId:'caster',initiativeOrder:[{tokenId:'caster'},{tokenId:'target'}]}}}),f=fixture(r);await f.apply({decisions:{target:{outcome:'hit'}}});const effect=normalizeEffectInstance(f.effects()[0]);assert.equal(effect.duration.expiresAtTurnCounter,7);
 assert.equal(getEffectExpirationReason(effect,{initiative:{combatActive:true,turnCounter:5}}),'');assert.equal(getEffectExpirationReason(effect,{initiative:{combatActive:true,turnCounter:6}}),'');assert.equal(getEffectExpirationReason(effect,{initiative:{combatActive:true,turnCounter:7}}),'turn-duration-expired');
});

test('condition immunity can be adjudicated without suppressing a spell damage',()=>{
 const r=makeRequest('ray-of-sickness');const result=getSpellTargetAmounts(r,'target',{target:{outcome:'hit',conditionStatus:'immune'}});assert.equal(result.damage,10);assert.deepEqual(result.conditions,[]);assert.equal(result.results[0].conditionStatus,'immune');
 const hold=makeRequest('hold-person');assert.deepEqual(getSpellTargetAmounts(hold,'target',{target:{outcome:'failed-save'}},{type:'undead'}).conditions,[]);
});

test('self healing keeps the saved completion marker and clamps to maximum HP',async()=>{
 const r=makeRequest('cure-wounds',{target:{affectedTokens:[{id:'target'}]},tokens:[{id:'target',linkedCharacterId:'source'}]}),f=fixture(r,{targetOverrides:{linkedCharacterId:'source'}});f.store.get('rooms/OUTCOME/characters/source').combat.currentHp=35;
 await f.apply({decisions:{}});assert.equal(f.caster().combat.currentHp,40);assert.equal(f.caster().combat.spellOutcomes[0].status,'applied');assert.equal((await f.apply({decisions:{}})).alreadyApplied,true);
});

test('damage clears damage-ending spell conditions across linked token aliases',async()=>{
 const f=fixture();f.store.get('rooms/OUTCOME/characters/victim').combat.effectConditions={pattern:'incapacitated'};f.store.set('rooms/OUTCOME/tokens/original',{linkedCharacterId:'victim',effectConditions:{pattern:'incapacitated'}});f.store.set('rooms/OUTCOME/effects/pattern',{id:'pattern',definitionId:'incapacitated',targetTokenId:'original',spell:{targetActorKey:'characters:victim',endsOnDamage:true}});
 await f.apply();assert.deepEqual(f.store.get('rooms/OUTCOME/tokens/original').effectConditions,{});assert.deepEqual(f.victim().combat.effectConditions,{});assert.equal(f.store.has('rooms/OUTCOME/effects/pattern'),false);
});


test('monster healing uses its chosen casting ability instead of an unresolved MOD placeholder',()=>{
 const stats=resolveMonsterSpellcastingStats({abilities:{wis:18,int:8},spellcasting:{ability:'wis',saveDc:15,attackBonus:7}});assert.equal(stats.spellcastingModifier,4);
 const r=makeRequest('cure-wounds',{slot:{level:2,...stats}});assert.equal(r.healing[0].formula,'2d8 + 4');
 assert.equal(resolveMonsterSpellcastingStats({spellcasting:{ability:'wis'}}).spellcastingModifier,null);
});
