import {rollSpellDice,queueSpellOutcome} from './spellOutcomes.js';
import {getSpellAreaProfile,spellAreaActive,spellAreaTrigger,spellAreaEventKey,tokenInsideSpellArea} from './spellAreas.js';

// The source cursor and each queued roll commit together. Two open DM tabs cannot
// create two results for one turn, and reconnecting does not replay a whole fight.
export async function advanceSpellArea({db,doc,runTransaction,serverTimestamp,roomCode,userUid,sourceKind,sourceActorId,areaId,context={},manualEntryTokenId='',movePoint=null,getCurrentScope=()=>({roomCode,userUid}),random=Math.random}) {
  if(!['characters','monsters'].includes(sourceKind))throw new Error('Invalid spellcaster.');
  return runTransaction(db,async tx=>{
    const scope=getCurrentScope();if(scope.roomCode!==roomCode||scope.userUid!==userUid)throw new Error('The room or account changed.');
    const roomRef=doc(db,'rooms',roomCode),sourceRef=doc(db,'rooms',roomCode,sourceKind,sourceActorId);
    const [roomSnap,sourceSnap]=await Promise.all([tx.get(roomRef),tx.get(sourceRef)]);
    if(!roomSnap.exists()||roomSnap.data().dmUid!==userUid)throw new Error('Only the room DM can resolve spell areas.');
    if(!sourceSnap.exists())return [];
    const actor=structuredClone(sourceSnap.data()),state=sourceKind==='characters'?(actor.combat||={}):(actor.spellcasting||={});
    const zone=state.spellAreas?.find(z=>z.id===areaId);if(!zone||zone.status!=='active')return [];
    const room=roomSnap.data(),initiative=room.initiativeState||{},now={...context,worldTime:room.worldTime??context.worldTime,initiative};
    const persist=()=>{const current=getCurrentScope();if(current.roomCode!==roomCode||current.userUid!==userUid)throw new Error('The room or account changed.');return tx.update(sourceRef,{[sourceKind==='characters'?'combat':'spellcasting']:state,revision:(Number(sourceSnap.data().revision)||0)+1,updatedAtMillis:Date.now(),updatedAt:serverTimestamp()});};
    if(!spellAreaActive(zone,state,now)){zone.status='ended';persist();return [];}
    if(String(room.currentMap?.id||room.currentMapId||'')!==zone.mapId)return [];
    const caster=await tx.get(doc(db,'rooms',roomCode,zone.sourceCollection,zone.sourceTokenId));
    const sourceLink=sourceKind==='characters'?'linkedCharacterId':'linkedMonsterId';
    if(!caster.exists()||String(caster.data()[sourceLink]||caster.data().linkedMonster?.id||'')!==sourceActorId||String(caster.data().sceneId||'')!==zone.sceneId||String(caster.data().floorId||'')!==zone.floorId){zone.status='ended';persist();return [];}
    if(movePoint) {
      const profile=getSpellAreaProfile(zone);if(!profile?.moveFeet)throw new Error('This area cannot be moved.');
      if(![movePoint.x,movePoint.y].every(v=>Number.isFinite(v)&&v>=0&&v<=100))throw new Error('Choose a point on the map.');
      const feet=Math.hypot((movePoint.x-zone.area.x)/zone.area.radiusX*(zone.radiusFeet||5),(movePoint.y-zone.area.y)/zone.area.radiusY*(zone.radiusFeet||5));
      if(feet>profile.moveFeet+.001)throw new Error('This spell area can move up to '+profile.moveFeet+' feet per '+(profile.moveAction||'action')+'.');
      zone.area={...zone.area,x:movePoint.x,y:movePoint.y};persist();return [];
    }
    zone.receipts=Array.isArray(zone.receipts)?zone.receipts:[];
    const counter=Number(initiative.turnCounter)||0,old=zone.cursor||{},events=[];
    const newCombat=initiative.combatActive&&(!old.combatActive||counter<old.turnCounter);
    if(newCombat){zone.combatEpoch=(Number(zone.combatEpoch)||0)+1;zone.expiresAtTurnCounter=counter+Math.max(1,Math.ceil((zone.expiresAtWorldTime-Number(now.worldTime||0))/6))*Math.max(1,initiative.initiativeOrder?.length||1);}
    if(manualEntryTokenId){
      if(!initiative.combatActive)throw new Error('Start initiative to resolve a once-per-turn entry trigger.');
      if(!spellAreaTrigger(zone,'enter'))throw new Error('This area has no entry damage trigger.');
      events.push({tokenId:manualEntryTokenId,phase:'enter',counter});
    } else if(initiative.combatActive && old.combatActive && counter===old.turnCounter+1){
      events.push({tokenId:old.tokenId,phase:'end',counter:old.turnCounter},{tokenId:initiative.currentCombatantId,phase:'start',counter});
    } else if(initiative.combatActive && (newCombat||counter>old.turnCounter)) {
      events.push({tokenId:initiative.currentCombatantId,phase:'start',counter});
    }
    const supported=events.filter(e=>e.tokenId&&spellAreaTrigger(zone,e.phase));
    const snapshots=await Promise.all(supported.map(e=>tx.get(doc(db,'rooms',roomCode,'tokens',e.tokenId))));
    const queued=[];
    for(const [i,event] of supported.entries()){
      if(!snapshots[i].exists())continue;
      const token={...snapshots[i].data(),id:event.tokenId};if(!tokenInsideSpellArea(zone,token))continue;
      const receipt=spellAreaEventKey(zone,token,event.phase,event.counter);
      if(zone.receipts.includes(receipt))continue;
      const trigger=spellAreaTrigger(zone,event.phase),id=globalThis.crypto.randomUUID();
      const request={schemaVersion:1,id,status:'pending',spellId:zone.spellId,spellName:zone.spellName+' · '+(event.phase==='end'?'end of turn':event.phase==='enter'?'entering area':'start of turn'),sourceTokenId:zone.sourceTokenId,sourceCollection:zone.sourceCollection,sceneId:zone.sceneId,floorId:zone.floorId,mapId:zone.mapId,
        createdAtMillis:Date.now(),slotLevel:zone.slotLevel,maxTargets:1,targets:[{tokenId:token.id,name:token.name||'Target',collection:'tokens',characterId:token.linkedCharacterId||'',monsterId:token.linkedMonsterId||token.linkedMonster?.id||'',sceneId:zone.sceneId,floorId:zone.floorId}],
        damage:[{...rollSpellDice(trigger.formula,random),damageType:trigger.damageType,criticalBonus:0}],healing:[],temporaryHp:0,conditions:[],removesConditions:[],chooseRemoval:false,castingContext:{worldTime:Number(context.worldTime)||0,initiative},save:trigger.save,attack:null,units:[],concentration:true,concentrationStartedAtMillis:zone.concentrationStartedAtMillis,spellDuration:'Instantaneous',rules:{},notes:getSpellAreaProfile(zone)?.notes||'Saved area trigger.',areaTrigger:{areaId:zone.id,phase:event.phase,turnCounter:event.counter}};
      queueSpellOutcome(actor,request,sourceKind);zone.receipts.push(receipt);queued.push(id);
    }
    zone.receipts=zone.receipts.slice(-128);
    const next={turnCounter:counter,tokenId:initiative.currentCombatantId||'',combatActive:initiative.combatActive===true};
    const changed=JSON.stringify(old)!==JSON.stringify(next);
    // Manual entry must not swallow an unprocessed start/end transition.
    if(!manualEntryTokenId)zone.cursor=next;
    if(queued.length||(!manualEntryTokenId&&changed))persist();
    const finalScope=getCurrentScope();if(finalScope.roomCode!==roomCode||finalScope.userUid!==userUid)throw new Error('The room or account changed.');
    return queued;
  });
}
