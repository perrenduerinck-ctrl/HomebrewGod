import {advanceSpellArea} from './spellAreaPersistence.js';
import {getSpellAreaProfile,spellAreaActive,tokenInsideSpellArea} from './spellAreas.js';
import {isSpellOutcomeRequest} from './spellOutcomes.js';
import {applySpellOutcome} from './spellOutcomePersistence.js';
const escape = value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const title = value=>String(value||'').replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());

export function createSpellOutcomePanel({root,db,collection,doc,onSnapshot,runTransaction,serverTimestamp,getRoomCode,getUserUid,getIsDm,getContext,getTokens=()=>[],getAreaScope=()=>({}),getAreaMovePoint=async()=>null,onCommitted=()=>{},onActorsChanged=()=>{}}){
 const document=root.ownerDocument;
 if(!document.getElementById('spellOutcomeStyles')){const link=document.createElement('link');link.id='spellOutcomeStyles';link.rel='stylesheet';link.href=new URL('./spellOutcomePanel.css',import.meta.url).href;document.head.append(link);}
 root.innerHTML='<summary>Spell results <span data-spell-outcome-count></span></summary><p>Spell amounts are rolled once. The DM confirms hits or saves, then applies HP and conditions together.</p><div data-spell-outcome-list></div><div data-spell-area-list></div><p data-spell-outcome-status role="status"></p>';
 const list=root.querySelector('[data-spell-outcome-list]'),status=root.querySelector('[data-spell-outcome-status]');
 let revealId='',scope='',generation=0,unsubscribers=[],actors=new Map(),ready=new Set(),entries=new Map(),choices=new Map(),signature='';
 const identity=()=>JSON.stringify([getRoomCode()||'',getUserUid()||'',getIsDm()===true]);
 const say=message=>{status.textContent=message;root.hidden=!entries.size&&!getAreas().length&&!message;};
 function render(){
  renderAreas();
  const pending=[];for(const [key,source] of actors){const state=source.kind==='characters'?source.value.combat:source.value.spellcasting;for(const request of Array.isArray(state?.spellOutcomes)?state.spellOutcomes:[])if(request?.status==='pending'&&typeof request.id==='string'&&request.id)pending.push({key:JSON.stringify([source.kind,source.id,request.id]),source,request});}
  const next=JSON.stringify([pending.map(e=>[e.key,e.source.value.identity?.name||e.source.value.name,e.request]),getIsDm()]);if(next===signature)return;signature=next;entries=new Map(pending.map(e=>[e.key,e]));
  for(const key of choices.keys())if(!entries.has(key))choices.delete(key);
  root.hidden=!pending.length&&!getAreas().length&&!status.textContent;root.querySelector('[data-spell-outcome-count]').textContent=pending.length?'('+pending.length+')':'';if(revealId&&pending.some(e=>e.request.id===revealId)){root.open=true;revealId='';}list.innerHTML=pending.map(({key,source,request:r})=>{
   if(!isSpellOutcomeRequest(r))return `<article data-spell-outcome="${escape(key)}"><h4>${escape(r.spellName||'Saved spell')}</h4><p>This result needs manual resolution.</p>${getIsDm()?'<button type="button" data-spell-outcome-dismiss>Dismiss</button>':''}</article>`;
   const decisions=choices.get(key)||{};const units=r.areaPlacement?[]:r.units?.length?r.units:r.targets.map(t=>({id:t.tokenId,targetId:t.tokenId,damage:r.damage}));
   const select=(id,field,options)=>`<select data-spell-outcome-field="${field}" data-spell-outcome-unit="${escape(id)}" ${getIsDm()?'':'disabled'}>${options.map(([value,label])=>`<option value="${value}" ${(decisions[id]?.[field]??(field==='outcome'&&!r.attack&&!r.save?'automatic':''))===value?'selected':''}>${escape(label)}</option>`).join('')}</select>`;
   return `<article data-spell-outcome="${escape(key)}" data-spell-outcome-id="${escape(r.id)}"><h4>${escape(r.spellName)} · ${escape(source.value.identity?.name||source.value.name||'Caster')}</h4><p>${escape(r.healing?.map(h=>h.formula+' = '+h.total+' healing').join(' · ')||'')}${r.temporaryHp?' '+r.temporaryHp+' temporary HP':''}${r.save?' '+escape(r.save.ability.toUpperCase())+' save DC '+escape(r.save.dc??'—'):''}${r.attack?' Spell attack '+escape(r.attack.bonus??'—'):''}</p>
   ${r.areaPlacement?'<p>Place the saved area. Casting deals no immediate damage; turn damage will appear here separately.</p>':''}${units.map(u=>{const target=r.targets.find(t=>t.tokenId===u.targetId);const outcomes=r.attack?[['','Choose hit result'],['hit','Hit'],['critical','Critical hit'],['miss','Miss'],['skip','Unaffected']]:r.save?[['','Choose save result'],['failed-save','Failed save'],['saved','Successful save'],['skip','Unaffected']]:[['automatic','Apply'],['skip','Unaffected']];
    return `<div class="hg-spell-outcome-row"><strong>${escape(target?.name||u.targetId)}${r.units?.length?' · '+escape(u.label||'Projectile'):''}</strong><span>${escape((u.damage||[]).map(d=>d.formula+' '+d.damageType+' = '+d.total).join(' · '))}</span>${select(u.id,'outcome',outcomes)}
    ${r.conditions.filter(c=>c.choice).map(c=>select(u.id,'condition',c.choice.map(id=>[id,title(id)]))).join('')}
    ${r.conditions.length?`<details><summary>Condition immunity</summary>${select(u.id,'conditionStatus',[['normal','Known immunities only'],['immune','Do not apply conditions']])}</details>`:''}
    ${r.chooseRemoval?select(u.id,'removeCondition',r.removesConditions.map(id=>[id,'End '+title(id)])):''}
    ${u.damage?.length?`<details><summary>Damage adjustment</summary>${select(u.id,'adjustment',[['normal','Known defenses only'],['resistant','Apply resistance'],['vulnerable','Apply vulnerability'],['immune','Immune']])}</details>`:''}</div>`;}).join('')}
   ${r.conditions.length?`<p>Conditions: ${escape(r.conditions.map(c=>title(c.id)).join(', '))}. Immunities and duration are checked when applied.</p>`:''}
   ${r.removesConditions.length&&!r.chooseRemoval?`<p>Ends: ${escape(r.removesConditions.map(title).join(', '))}.</p>`:''}
   <details><summary>Other spell rules</summary><p>These controls apply HP and listed conditions. Resolve movement, targeting restrictions, and other special rules using the spell details.</p>${r.notes?`<p>${escape(r.notes)}</p>`:''}</details><div class="hg-spell-outcome-actions">${getIsDm()?'<button type="button" data-spell-outcome-apply>Apply spell results</button><button type="button" data-spell-outcome-dismiss>Dismiss</button>':'Waiting for the DM to resolve this cast.'}</div></article>`;
  }).join('');
 }
 function stop(){generation++;areaSignature='';root.querySelector('[data-spell-area-list]').replaceChildren();for(const stop of unsubscribers)stop();unsubscribers=[];actors.clear();ready.clear();entries.clear();choices.clear();signature='';scope='';revealId='';root.open=false;list.replaceChildren();root.hidden=true;say('');}
 function connect(){const next=identity();if(next===scope)return;stop();scope=next;const [roomCode,userUid,isDm]=JSON.parse(next);if(!roomCode||!userUid)return;const current=generation;
  for(const kind of isDm?['characters','monsters']:['characters'])unsubscribers.push(onSnapshot(collection(db,'rooms',roomCode,kind),{includeMetadataChanges:true},snapshot=>{
   if(current!==generation||identity()!==scope||snapshot.metadata?.hasPendingWrites)return;
   for(const [key,actor] of actors)if(actor.kind===kind)actors.delete(key);
   for(const record of snapshot.docs)actors.set(kind+':'+record.id,{kind,id:record.id,value:record.data()});ready.add(kind);render();onActorsChanged();
  },error=>{if(current===generation)say(error.message||'Spell results could not be synchronized.');}));
 }
 root.addEventListener('change',event=>{const field=event.target.closest('[data-spell-outcome-field]'),card=field?.closest('[data-spell-outcome]');if(!card)return;const value=choices.get(card.dataset.spellOutcome)||{};const unit=field.dataset.spellOutcomeUnit;value[unit]={...value[unit],[field.dataset.spellOutcomeField]:field.value};choices.set(card.dataset.spellOutcome,value);});
 root.addEventListener('click',async event=>{
  const button=event.target.closest('[data-spell-outcome-apply],[data-spell-outcome-dismiss]'),card=button?.closest('[data-spell-outcome]');if(!card||!getIsDm())return;
  const entry=entries.get(card.dataset.spellOutcome);if(!entry)return;const operationScope=scope;const [roomCode,userUid]=JSON.parse(scope);for(const b of card.querySelectorAll('button,select'))b.disabled=true;
  try{const result=await applySpellOutcome({db,doc,runTransaction,serverTimestamp,roomCode,userUid,sourceKind:entry.source.kind,sourceActorId:entry.source.id,requestId:entry.request.id,decisions:structuredClone(choices.get(entry.key)||{}),dismiss:button.hasAttribute('data-spell-outcome-dismiss'),getCurrentScope:()=>({roomCode:getRoomCode(),userUid:getUserUid()}),context:getContext()});
   if(scope!==operationScope)return;let refreshNote='';try{await onCommitted(result,roomCode);}catch{refreshNote=' Results saved; the view could not refresh yet.';}if(scope!==operationScope)return;say(result.alreadyApplied?'This cast was already resolved.':result.dismissed?'Spell results dismissed.':result.results.map(r=>`${r.name}: ${r.damage?r.damage+' damage. ':''}${r.healing?r.healing+' healing. ':''}${r.temporaryHp?r.temporaryHp+' temporary HP. ':''}${r.conditions.length?r.conditions.map(title).join(', ')+'. ':''}${r.removesConditions.length?'Ended '+r.removesConditions.map(title).join(', ')+'. ':''}${r.nextHp===undefined?'':'HP '+r.nextHp+'.'} ${r.notes||''}`).join(' '));if(refreshNote)status.textContent+=refreshNote;
  }catch(error){if(scope===operationScope)say(error.message||'Spell results were not saved.');}
  finally{if(scope===operationScope)for(const b of card.querySelectorAll('button,select'))b.disabled=false;}
 });
 let areaBusy=false,areaAgain=false,areaSignature='';
 function getAreas(){const result=[];for(const source of actors.values()){const state=source.kind==='characters'?source.value.combat:source.value.spellcasting;for(const zone of state?.spellAreas||[])if(spellAreaActive(zone,state,getContext()))result.push({source,zone});}return result;}
 function renderAreas(){
  const scope=getAreaScope();const areas=getAreas().filter(e=>e.zone.mapId===scope.mapId&&e.zone.sceneId===(scope.sceneId||'')&&e.zone.floorId===(scope.floorId||''));
  const options=areas.map(e=>getTokens().filter(t=>tokenInsideSpellArea(e.zone,t)).map(t=>[t.id,t.name||'Target']));
  const next=JSON.stringify([areas.map(({source,zone})=>[source.kind,source.id,zone]),options,getIsDm()]);if(next===areaSignature)return;areaSignature=next;
  root.querySelector('[data-spell-area-list]').innerHTML=areas.map(({source,zone},i)=>`<article data-spell-area="${escape(zone.id)}" data-source-kind="${source.kind}" data-source-id="${escape(source.id)}"><h4>${escape(zone.spellName)} · active area</h4><p>Turn damage is queued automatically while the DM is connected. Saves and HP are resolved in Spell results.</p>${getSpellAreaProfile(zone)?.triggers?.enter&&getIsDm()?`<label>Creature entering the area<select data-spell-area-target><option value="">Choose a creature</option>${options[i].map(([id,name])=>`<option value="${escape(id)}">${escape(name)}</option>`).join('')}</select></label><button type="button" data-spell-area-enter>Resolve entering area</button>${getSpellAreaProfile(zone)?.moveFeet?`<button type="button" data-spell-area-move>Move area (${escape(getSpellAreaProfile(zone).moveAction||'action')})</button>`:''}<p>Confirm entry when the creature moves into the area. Moving or casting the area onto a creature does not cause entry damage.</p>`:`<p>${escape(getSpellAreaProfile(zone)?.notes||'Resolve the listed area triggers.')}</p>`}</article>`).join('');
 }
 async function reconcileAreas(){
  renderAreas();if(!getIsDm()||!getRoomCode())return;if(areaBusy){areaAgain=true;return;}areaBusy=true;const current=generation;
  try{for(const {source,zone} of getAreas()){
   if(current!==generation)break;
   await advanceSpellArea({db,doc,runTransaction,serverTimestamp,roomCode:getRoomCode(),userUid:getUserUid(),sourceKind:source.kind,sourceActorId:source.id,areaId:zone.id,context:getContext(),getCurrentScope:()=>({roomCode:getRoomCode(),userUid:getUserUid()})});
  }}catch(error){if(current===generation)say(error.message||'Spell area triggers could not synchronize.');}finally{areaBusy=false;if(areaAgain){areaAgain=false;queueMicrotask(reconcileAreas);}}
 }
 root.addEventListener('click',async event=>{
  const button=event.target.closest('[data-spell-area-enter],[data-spell-area-move]'),card=button?.closest('[data-spell-area]');if(!card||!getIsDm())return;
  const operationScope=scope;button.disabled=true;
  try{const moving=button.hasAttribute('data-spell-area-move');const zone=getAreas().find(e=>e.zone.id===card.dataset.spellArea&&e.source.id===card.dataset.sourceId)?.zone;const movePoint=moving?await getAreaMovePoint(zone):null;if(moving&&!movePoint)return;if(scope!==operationScope)return;
   const tokenId=card.querySelector('[data-spell-area-target]')?.value;if(!moving&&!tokenId)throw new Error('Choose the creature entering this area.');
   const ids=await advanceSpellArea({db,doc,runTransaction,serverTimestamp,roomCode:getRoomCode(),userUid:getUserUid(),sourceKind:card.dataset.sourceKind,sourceActorId:card.dataset.sourceId,areaId:card.dataset.spellArea,context:getContext(),manualEntryTokenId:moving?'':tokenId,movePoint,getCurrentScope:()=>({roomCode:getRoomCode(),userUid:getUserUid()})});
   if(scope===operationScope)say(moving?(zone?.spellName||'Spell area')+' moved. Use the action required by its preset.':ids.length?'Entry damage queued.':'That creature was already resolved this turn, or is outside the area.');
  }catch(error){if(scope===operationScope)say(error.message);}finally{button.disabled=false;}
 });
 function getConcentrationState(){const concentrationByActor={};for(const [key,actor] of actors)concentrationByActor[key]=(actor.kind==='characters'?actor.value.combat:actor.value.spellcasting)?.concentration||null;return {concentrationByActor,concentrationLoadedKinds:[...ready]};}
 return {connect,stop,getConcentrationState,getAreas,reconcileAreas,refresh:render,collapse(){root.open=false;},revealRequest(id){if(!getIsDm()||!id)return;revealId=id;for(const entry of entries.values())if(entry.request.id===id){root.open=true;revealId='';break;}}};
}
