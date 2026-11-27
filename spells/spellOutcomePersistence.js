import {getSpellAreaProfile,spellAreaActive} from './spellAreas.js';
import {applyGameplayAction} from '../characterSheet/gameplayState.js';
import {applyMonsterConcentrationEvent} from '../combat/monsterSpellcasting.js';
import {getSpellcasterBlockReason} from './spellCastingRules.js';
import {getSpellTargetAmounts,isSpellOutcomeRequest} from './spellOutcomes.js';
import {defaultEffectRegistry} from '../effects/effectRegistry.js';
import {normalizeEffectInstance,serializeEffectInstance} from '../effects/effectModel.js';
import {prepareEffectDuration,getEffectExpirationReason} from '../effects/effectDuration.js';

const clone=v=>structuredClone(v);
const actorKey=t=>t.linkedCharacterId?'characters:'+t.linkedCharacterId:(t.linkedMonsterId||t.linkedMonster?.id)?'monsters:'+(t.linkedMonsterId||t.linkedMonster.id):'';
const stateFor=(actor,kind)=>kind==='characters'?(actor.combat ||= {}):(actor.spellcasting ||= {});
function spellDuration(request,condition){
 const special=condition.duration;
 if(special==='until-removed')return {mode:'until-removed'};
 const match=String(request.spellDuration).match(/(\d+)\s*(round|minute|hour|day|second)/i);
 const seconds=match?Number(match[1])*({round:6,minute:60,hour:3600,day:86400,second:1}[match[2].toLowerCase()]):60;
 const context=request.castingContext||{};
 if(special?.startsWith('until-'))return context.initiative?.combatActive?{mode:special,expiresAtWorldTime:(context.worldTime||0)+6}:{mode:'world-time',value:6,unit:'seconds'};
 return context.initiative?.combatActive?{mode:'rounds',value:Math.max(1,Math.ceil(seconds/6)),expiresAtWorldTime:(context.worldTime||0)+seconds}:{mode:'world-time',value:seconds,unit:'seconds'};
}

export async function applySpellOutcome({db,doc,runTransaction,serverTimestamp,roomCode,userUid,sourceKind,sourceActorId,requestId,decisions={},dismiss=false,getCurrentScope=()=>({roomCode,userUid}),context={}}){
 if(!['characters','monsters'].includes(sourceKind)||!sourceActorId||!requestId)throw new Error('Select a saved spell result.');
 const assertScope=()=>{const now=getCurrentScope();if(now.roomCode!==roomCode||now.userUid!==userUid)throw new Error('The room or account changed. Spell results were not applied.');};
 decisions=clone(decisions);
 let committed;
 await runTransaction(db,async transaction=>{
  assertScope();
  const roomRef=doc(db,'rooms',roomCode),sourceRef=doc(db,'rooms',roomCode,sourceKind,sourceActorId);
  const [roomSnap,sourceSnap]=await Promise.all([transaction.get(roomRef),transaction.get(sourceRef)]);
  if(!roomSnap.exists()||roomSnap.data().dmUid!==userUid)throw new Error('Only the current room DM can apply spell results.');
  if(!sourceSnap.exists())throw new Error('The spellcaster no longer exists.');
  const source=clone(sourceSnap.data()),sourceState=stateFor(source,sourceKind);
  const request=(Array.isArray(sourceState.spellOutcomes)?sourceState.spellOutcomes:[]).find(r=>r?.id===requestId);
  if(!request)throw new Error('This spell result is no longer pending.');
  if(request.status!=='pending'){committed={alreadyApplied:true,actors:[],results:request.results||[]};return;}
  if(dismiss){request.status='dismissed';request.resolvedAtMillis=Date.now();transaction.update(sourceRef,{[sourceKind==='characters'?'combat':'spellcasting']:sourceState,revision:(Number(sourceSnap.data().revision)||0)+1,updatedAtMillis:Date.now(),updatedAt:serverTimestamp()});committed={dismissed:true,actors:[],results:[]};return;}
  if(!isSpellOutcomeRequest(request))throw new Error('This saved spell result needs manual resolution. Dismiss it after resolving with the DM.');
  if(request.concentration&&(sourceState.concentration?.spellId!==request.spellId||sourceState.concentration?.startedAtMillis!==request.concentrationStartedAtMillis))throw new Error('Concentration has ended or changed. Dismiss this pending spell.');
  if(request.mapId && String(roomSnap.data().currentMap?.id||roomSnap.data().currentMapId||'')!==request.mapId)throw new Error('The current map changed. Dismiss this result and resolve it with the DM.');
  if(!Array.isArray(request.targets)||request.targets.length<1||request.targets.length>24)throw new Error('This cast has invalid targets.');
  const sourceTokenRef=doc(db,'rooms',roomCode,request.sourceCollection,request.sourceTokenId);
  const targetRefs=request.targets.map(t=>{if(t.collection!=='tokens')throw new Error('Private targets require their existing DM controls.');return doc(db,'rooms',roomCode,t.collection,t.tokenId);});
  if(!['tokens','dmTokens'].includes(request.sourceCollection))throw new Error('Invalid caster token collection.');
  const [sourceTokenSnap,...targetSnaps]=await Promise.all([transaction.get(sourceTokenRef),...targetRefs.map(ref=>transaction.get(ref))]);
  if(!sourceTokenSnap.exists()||actorKey(sourceTokenSnap.data())!==sourceKind+':'+sourceActorId||String(sourceTokenSnap.data().sceneId||'')!==request.sceneId||String(sourceTokenSnap.data().floorId||'')!==request.floorId)throw new Error('The caster token was removed or relinked.');
  const tokenEntries=targetSnaps.map((snap,i)=>{if(!snap.exists())throw new Error('A spell target no longer exists.');const token=clone(snap.data()),captured=request.targets[i];
   const expected=captured.characterId?'characters:'+captured.characterId:captured.monsterId?'monsters:'+captured.monsterId:'';
   if(actorKey(token)!==expected||String(token.sceneId||'')!==captured.sceneId||String(token.floorId||'')!==captured.floorId)throw new Error('A spell target changed map, floor, or linked actor. Dismiss this result and resolve it with the DM.');
   return {ref:targetRefs[i],token,id:captured.tokenId,captured};
  });
  const actors=new Map([[sourceKind+':'+sourceActorId,{ref:sourceRef,value:source,kind:sourceKind,id:sourceActorId,revision:Number(sourceSnap.data().revision)||0}]]);
  for(const entry of tokenEntries){const key=actorKey(entry.token);if(!key||actors.has(key))continue;const split=key.indexOf(':'),kind=key.slice(0,split),id=key.slice(split+1);const ref=doc(db,'rooms',roomCode,kind,id),snap=await transaction.get(ref);if(!snap.exists())throw new Error('A linked spell target no longer exists.');actors.set(key,{ref,value:clone(snap.data()),kind,id,revision:Number(snap.data().revision)||0});}
  const activeTargets=tokenEntries.filter(e=>{const units=request.units.length?request.units.filter(u=>u.targetId===e.id):[{id:e.id}];return units.some(u=>decisions[u.id]?.outcome!=='skip');});
  if(activeTargets.length>(request.maxTargets||24))throw new Error('Choose no more than '+request.maxTargets+' affected targets.');
  const effectRefs=new Map();for(const entry of tokenEntries){const actor=actors.get(actorKey(entry.token));const ids=new Set([...Object.keys(entry.token.effectConditions||{}),...Object.keys(actor?stateFor(actor.value,actor.kind).effectConditions||{}:{})]);for(const id of ids)effectRefs.set(id,doc(db,'rooms',roomCode,'effects',id));}
  if(effectRefs.size>100)throw new Error('Too many existing conditions to resolve this cast together.');
  const effects=new Map();for(const [id,ref] of effectRefs){const snap=await transaction.get(ref);if(snap.exists())effects.set(id,{ref,value:{...snap.data(),spell:snap.data().spell||snap.data().timing?.spell}});}
  const extraTokens=[];const selectedIds=new Set(tokenEntries.map(e=>e.id));
  for(const id of new Set([...effects.values()].map(e=>e.value.targetTokenId).filter(id=>id&&!selectedIds.has(id)))) {
    for(const collection of ['tokens','dmTokens']) {const ref=doc(db,'rooms',roomCode,collection,id),snap=await transaction.get(ref);if(snap.exists())extraTokens.push({ref,token:clone(snap.data()),id});}
  }
  if(request.areaTrigger && !sourceState.spellAreas?.some(z=>z.id===request.areaTrigger.areaId&&spellAreaActive(z,sourceState,{...context,worldTime:roomSnap.data().worldTime??context.worldTime,initiative:roomSnap.data().initiativeState||context.initiative})))throw new Error('This spell area has ended. Dismiss its pending result.');
  if(request.areaPlacement) {
   const areaBehavior=getSpellAreaProfile(request);if(!areaBehavior)throw new Error('Unknown spell area preset.');
   const initiative=roomSnap.data().initiativeState || {};
   const existing=Array.isArray(sourceState.spellAreas)?sourceState.spellAreas:[];
   sourceState.spellAreas=[...existing.filter(z=>z.status==='active'&&z.concentrationStartedAtMillis===sourceState.concentration?.startedAtMillis).slice(-7),{
    id:request.id,status:'active',spellId:request.spellId,spellName:request.spellName,sourceTokenId:request.sourceTokenId,sourceCollection:request.sourceCollection,
    sceneId:request.sceneId,floorId:request.floorId,mapId:request.mapId,area:request.areaPlacement,areaBehavior,radiusFeet:request.areaRadiusFeet||5,slotLevel:request.slotLevel,
    saveDc:request.areaSaveDc ?? null,
    concentrationStartedAtMillis:request.concentrationStartedAtMillis,createdAtMillis:request.createdAtMillis,
    expiresAtWorldTime:(request.castingContext.worldTime||0)+areaBehavior.durationSeconds,
    expiresAtTurnCounter:request.castingContext.initiative.combatActive?request.castingContext.initiative.turnCounter+Math.ceil(areaBehavior.durationSeconds/6)*Math.max(1,request.castingContext.initiative.initiativeOrder.length):null,
    cursor:{turnCounter:initiative.turnCounter||0,tokenId:initiative.currentCombatantId||'',combatActive:initiative.combatActive===true},receipts:[]
   }];
   if(!spellAreaActive(sourceState.spellAreas.at(-1),sourceState,{...context,worldTime:roomSnap.data().worldTime??context.worldTime,initiative}))throw new Error('This spell area expired before activation. Dismiss its saved placement.');
  }
  const writes=[],deletes=new Map(),results=[];
  for(const [index,entry] of tokenEntries.entries()){
   const linked=actors.get(actorKey(entry.token)),actor=linked?.value||{},amounts=getSpellTargetAmounts(request,entry.id,decisions,actor,entry.token);
   if(request.areaPlacement)amounts.notes="Area placed. Damage is queued on its turn triggers; casting deals no immediate damage.";
   const targetConditions={...(entry.token.effectConditions||{})};let actorState=linked?stateFor(actor,linked.kind):null;if(actorState)actorState.effectConditions={...(actorState.effectConditions||{})};
   for(const [id,effect] of effects){if(effect.value.targetTokenId!==entry.id&&effect.value.spell?.targetActorKey!==actorKey(entry.token))continue;
    if(amounts.removesConditions.includes(effect.value.definitionId)||amounts.damage>0&&effect.value.spell?.endsOnDamage){deletes.set(id,effect.ref);delete targetConditions[id];if(actorState)delete actorState.effectConditions[id];}
   }
   if(amounts.removesConditions.length){const keep=v=>!amounts.removesConditions.includes(String(v).toLowerCase());if(Array.isArray(entry.token.conditions))entry.token.conditions=entry.token.conditions.filter(keep);if(Array.isArray(actorState?.conditions))actorState.conditions=actorState.conditions.filter(keep);}
   let previousHp,nextHp;
   if(amounts.damage||amounts.healing||amounts.temporaryHp){
    if(linked?.kind==='characters'){
     previousHp=Number(actor.combat?.currentHp);if(!Number.isFinite(previousHp)||!(Number(actor.combat?.maxHp)>0))throw new Error('Set target HP before applying this spell.');
     for(const hit of amounts.results)if(hit.damage)applyGameplayAction(actor,{type:'damage',amount:hit.damage});
     if(amounts.healing)applyGameplayAction(actor,{type:'heal',amount:amounts.healing});
     if(amounts.temporaryHp)applyGameplayAction(actor,{type:'set-temp-hp',amount:Math.max(Number(actor.combat.temporaryHp)||0,amounts.temporaryHp)});
     nextHp=actor.combat.currentHp;actor.currentHp=nextHp;entry.token.currentHp=nextHp;entry.token.hp={...(entry.token.hp||{}),current:nextHp};
    }else{
     previousHp=Number(entry.token.currentHp??entry.token.hp?.current);const maximum=Number(entry.token.maxHp??entry.token.hp?.maximum);
     if(!Number.isFinite(previousHp)||!Number.isFinite(maximum)||maximum<1)throw new Error('Set target HP before applying this spell.');
     nextHp=previousHp;let temporaryHp=Math.max(0,Number(entry.token.temporaryHp)||0);
     for(const hit of amounts.results){if(!hit.damage)continue;const absorbed=Math.min(temporaryHp,hit.damage);temporaryHp-=absorbed;nextHp=Math.max(0,nextHp-hit.damage+absorbed);if(linked){const next=applyMonsterConcentrationEvent(actor,{type:'damage',amount:hit.damage,currentHp:nextHp});actor.spellcasting=next.spellcasting;}}
     nextHp=Math.min(maximum,nextHp+amounts.healing);temporaryHp=Math.max(temporaryHp,amounts.temporaryHp);
     entry.token.currentHp=nextHp;entry.token.hp={...(entry.token.hp||{}),current:nextHp};entry.token.temporaryHp=temporaryHp;
    }
   }
   actorState=linked?stateFor(actor,linked.kind):null;
   for(const conditionId of amounts.conditions){
    const condition=request.conditions.find(c=>c.id===conditionId||c.choice?.includes(conditionId));const definition=defaultEffectRegistry.get(conditionId);if(!definition)throw new Error('That condition is unavailable.');
    let duration=prepareEffectDuration(spellDuration(request,condition),{...request.castingContext,sourceTokenId:request.sourceTokenId,targetTokenId:entry.id});
    if(condition.nextSourceTurn && request.castingContext?.initiative?.combatActive && request.castingContext.initiative.currentCombatantId===request.sourceTokenId)duration={...duration,expiresAtTurnCounter:duration.expiresAtTurnCounter+request.castingContext.initiative.initiativeOrder.length};
    const record=normalizeEffectInstance({...definition,definitionId:conditionId,id:'spell-'+request.id+'-'+index+'-'+conditionId,name:definition.name+' · '+request.spellName,roomCode,sourceId:request.sourceTokenId,targetTokenId:entry.id,targetCharacterId:entry.captured.characterId,createdByUid:userUid,createdAtMillis:request.createdAtMillis,duration,spell:{id:request.spellId,castId:request.id,targetActorKey:actorKey(entry.token),concentrationActorKey:request.concentration&&condition.duration!=='until-removed'?sourceKind+':'+sourceActorId:'',concentrationStartedAtMillis:request.concentrationStartedAtMillis||0,repeatSave:condition.repeatSave||'',saveDc:request.save?.dc??null,endsOnDamage:condition.endsOnDamage===true}});
    if(getEffectExpirationReason(record,context))continue;
    targetConditions[record.id]=conditionId;if(actorState)actorState.effectConditions[record.id]=conditionId;
    if(getSpellcasterBlockReason({conditions:[conditionId]})){
     if(linked?.kind==='characters')applyGameplayAction(actor,{type:'end-concentration'});
     else if(linked){actor.spellcasting=applyMonsterConcentrationEvent(actor,{type:'condition',condition:conditionId}).spellcasting;}
    }
    writes.push({ref:doc(db,'rooms',roomCode,'effects',record.id),value:{...serializeEffectInstance(record),updatedAt:serverTimestamp()}});
   }
   entry.token.effectConditions=targetConditions;
   results.push({tokenId:entry.id,name:entry.token.name||entry.captured.name,...amounts,...(previousHp===undefined?{}:{previousHp,nextHp})});
  }
  for(const entry of [...tokenEntries,...extraTokens]){entry.token.effectConditions={...(entry.token.effectConditions||{})};for(const id of deletes.keys())delete entry.token.effectConditions[id];}
  // HP, every condition, and the completion marker commit together; retries never roll again.
  const completedRequest=stateFor(actors.get(sourceKind+':'+sourceActorId).value,sourceKind).spellOutcomes.find(r=>r.id===requestId);
  completedRequest.status='applied';completedRequest.resolvedAtMillis=Date.now();completedRequest.results=results;
  assertScope();
  for(const entry of tokenEntries)transaction.update(entry.ref,{...(entry.token.currentHp===undefined?{}:{currentHp:entry.token.currentHp}),...(entry.token.hp?{hp:entry.token.hp}:{}),...(entry.token.temporaryHp===undefined?{}:{temporaryHp:entry.token.temporaryHp}),...(entry.token.conditions?{conditions:entry.token.conditions}:{}),effectConditions:entry.token.effectConditions,updatedAtMillis:Date.now(),updatedAt:serverTimestamp()});
  for(const entry of extraTokens)transaction.update(entry.ref,{effectConditions:entry.token.effectConditions,updatedAtMillis:Date.now(),updatedAt:serverTimestamp()});
  for(const actor of actors.values())transaction.update(actor.ref,{[actor.kind==='characters'?'combat':'spellcasting']:actor.kind==='characters'?actor.value.combat:actor.value.spellcasting,...(actor.kind==='characters'&&actor.value.currentHp!==undefined?{currentHp:actor.value.currentHp}:{}),revision:actor.revision+1,updatedAtMillis:Date.now(),updatedAt:serverTimestamp()});
  for(const ref of deletes.values())transaction.delete(ref);
  for(const entry of writes)transaction.set(entry.ref,entry.value);
  committed={alreadyApplied:false,actors:[...actors.values()].map(a=>({kind:a.kind,id:a.id,value:a.value})),results};
 });
 return committed;
}
