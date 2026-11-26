import {createCastResolution} from '../battleMap/castingSession.js';
import {CORE_CONDITION_DEFINITIONS} from '../effects/effectRegistry.js';

const DIRECT_DAMAGE = new Set(('acid-splash chill-touch eldritch-blast fire-bolt frostbite poison-spray ray-of-frost sacred-flame shocking-grasp thorn-whip vicious-mockery burning-hands chromatic-orb dissonant-whispers guiding-bolt inflict-wounds magic-missile ray-of-sickness scorching-ray shatter thunderwave fireball lightning-bolt cone-of-cold finger-of-death').split(' '));
const DIRECT_HEALING = new Set(['cure-wounds','healing-word','mass-cure-wounds','mass-healing-word','heal']);
const condition = (id, when='failed-save', extra={}) => ({id,when,...extra});
const CONDITIONS = {
 'ray-of-sickness':[condition('poisoned','hit',{duration:'until-end-source-turn',nextSourceTurn:true})],
 'hold-person':[condition('paralyzed','failed-save',{repeatSave:'wis'})],
 'hold-monster':[condition('paralyzed','failed-save',{repeatSave:'wis'})],
 'blindness-deafness':[condition('blinded','failed-save',{choice:['blinded','deafened'],repeatSave:'con'})],
 'charm-person':[condition('charmed')], 'charm-monster':[condition('charmed')],
 'entangle':[condition('restrained')], 'grease':[condition('prone','failed-save',{duration:'until-removed'})],
 'hypnotic-pattern':[condition('charmed','failed-save',{endsOnDamage:true}),condition('incapacitated','failed-save',{endsOnDamage:true})],
 'hideous-laughter':[condition('prone','failed-save',{duration:'until-removed'}),condition('incapacitated','failed-save',{repeatSave:'wis'})],
 'greater-invisibility':[condition('invisible','always')],
};
const knownConditions = new Set(CORE_CONDITION_DEFINITIONS.map(c=>c.id));
const clone = value => structuredClone(value);
const key = token => token.linkedCharacterId ? 'characters:'+token.linkedCharacterId : (token.linkedMonsterId || token.linkedMonster?.id) ? 'monsters:'+(token.linkedMonsterId || token.linkedMonster.id) : 'token:'+token.id;

export function rollSpellDice(formula, random=Math.random) {
 const source=String(formula).replace(/\s/g,'').toLowerCase();
 if(!/^[+-]?(?:\d+d\d+|\d+)(?:[+-](?:\d+d\d+|\d+))*$/.test(source))throw new Error('This formula needs manual resolution: '+formula);
 let total=0,dice=0;const rolls=[];
 for(const term of source.match(/[+-]?[^+-]+/g)||[]){const sign=term[0]==='-'?-1:1,part=term.replace(/^[+-]/,'');
  if(part.includes('d')){const [count,faces]=part.split('d').map(Number);dice+=count;if(count<1||dice>100||faces<2||faces>1000)throw new Error('Spell dice are outside supported limits.');for(let i=0;i<count;i++){const value=random();if(!Number.isFinite(value)||value<0||value>=1)throw new Error('Invalid dice source.');const roll=1+Math.floor(value*faces);rolls.push(roll);total+=sign*roll;}}
  else total+=sign*Number(part);
 }
 if(!Number.isSafeInteger(total)||Math.abs(total)>100000)throw new Error('Spell amount is too large.');
 return {formula:String(formula),total:Math.max(0,total),rolls};
}

export function getSpellOutcomeSupport(spell={}) {
 const conditions=CONDITIONS[spell.id] || [];
 const removesConditions=spell.id==='lesser-restoration'?['blinded','deafened','paralyzed','poisoned']:spell.id==='heal'?['blinded','deafened']:[];
 const damage=DIRECT_DAMAGE.has(spell.id), healing=DIRECT_HEALING.has(spell.id),temporaryHp=false;
 return {supported:damage||healing||temporaryHp||conditions.length>0||removesConditions.length>0,damage,healing,temporaryHp,conditions,removesConditions};
}

export function createSpellOutcomeRequest({id,spell,slot,target,casterToken,tokens=[],characterLevel=1,spellcastingModifier=null,spellSaveDc=null,spellAttackBonus=null,castingContext={},mapId='',random=Math.random}={}) {
 const support=getSpellOutcomeSupport(spell);if(!support.supported||casterToken?.visibility==='dm')return null;
 const resolution=createCastResolution({spell,slotLevel:slot.level,characterLevel,spellcastingModifier:slot.spellcastingModifier??spellcastingModifier,spellSaveDc:slot.spellSaveDc??spellSaveDc,spellAttackBonus:slot.spellAttackBonus??spellAttackBonus,affectedTokens:target.affectedTokens,projectiles:target.projectiles||[]});
 const footprints=target.affectedTokens||[];if(!footprints.length)return null;
 const selected=new Map();const actorKeys=new Set();const projectiles=target.projectiles||[];
 for(const f of footprints){const token=tokens.find(t=>t.id===f.id);if(token?.visibility==='dm')return null;if(!token)throw new Error('A spell target is no longer on this map.');if(!projectiles.length&&actorKeys.has(key(token)))continue;actorKeys.add(key(token));selected.set(f.id,{tokenId:f.id,name:token.name||f.name||'Target',collection:token.visibility==='dm'?'dmTokens':'tokens',characterId:token.linkedCharacterId||'',monsterId:token.linkedMonsterId||token.linkedMonster?.id||'',sceneId:token.sceneId||'',floorId:token.floorId||''});}
 if(selected.size>24)return null;
 if(support.healing&&resolution.healing.some(f=>!/^[0-9d+\s-]+$/i.test(f)))return null;
 if(support.damage&&resolution.damage.some(f=>!/^\d+(?:d\d+)?(?:\s*[+-]\s*\d+)?\s+(acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder)$/i.test(f)))return null;
 const damage=support.damage&&!projectiles.length?resolution.damage.map(text=>{const match=text.match(/^(\d+(?:d\d+)?(?:\s*[+-]\s*\d+)?)(?:\s+(.+))?$/i);if(!match||!['acid','bludgeoning','cold','fire','force','lightning','necrotic','piercing','poison','psychic','radiant','slashing','thunder'].includes(match[2]||''))throw new Error('This damage formula needs manual resolution.');return {...rollSpellDice(match[1],random),criticalBonus:resolution.attack?rollSpellDice((match[1].match(/\d+d\d+/i)||['0'])[0],random).total:0,damageType:match[2]||''};}):[];
 const healing=support.healing?resolution.healing.map(f=>rollSpellDice(f,random)):[];
 let sharedMissileRoll=null;
 const units=projectiles.length?projectiles.filter(p=>selected.has(p.targetId)).map((p,i)=>({id:'projectile-'+i,label:(p.label||'Projectile')+' '+(i+1),targetId:p.targetId,damage:(()=>{const m=String(p.damage).match(/^(\d+d\d+(?:\s*[+-]\s*\d+)?)\s+(\w+)$/);if(!m)throw new Error('Unsupported projectile formula.');if(spell.id==='magic-missile'&&sharedMissileRoll)return [clone(sharedMissileRoll)];const component={...rollSpellDice(m[1],random),criticalBonus:resolution.attack?rollSpellDice(m[1].match(/\d+d\d+/)[0],random).total:0,damageType:m[2]};if(spell.id==='magic-missile')sharedMissileRoll=component;return [component];})()})):[];
 return {schemaVersion:1,id,status:'pending',spellId:spell.id,spellName:spell.name,sourceTokenId:casterToken.id,sourceCollection:casterToken.visibility==='dm'?'dmTokens':'tokens',sceneId:casterToken.sceneId||'',floorId:casterToken.floorId||'',mapId:String(mapId||''),createdAtMillis:Date.now(),slotLevel:slot.level,maxTargets:['mass-cure-wounds','mass-healing-word'].includes(spell.id)?6:24,targets:[...selected.values()],damage,healing,temporaryHp:support.temporaryHp?Number(resolution.temporaryHp)||0:0,conditions:clone(support.conditions),removesConditions:support.removesConditions,chooseRemoval:spell.id==='lesser-restoration',castingContext:{worldTime:Number(castingContext.worldTime)||0,initiative:{combatActive:castingContext.initiative?.combatActive===true,currentCombatantId:castingContext.initiative?.currentCombatantId||'',turnCounter:Number(castingContext.initiative?.turnCounter)||0,initiativeOrder:(castingContext.initiative?.initiativeOrder||[]).map(t=>({tokenId:t.tokenId||t.id||t}))}},save:resolution.save,attack:resolution.attack,units,concentration:resolution.concentration,spellDuration:spell.duration||'',notes:spell.resolutionNotes||''};
}

export function queueSpellOutcome(actor, request, kind='characters') {
 if(!request)return actor;
 if(!isSpellOutcomeRequest(request))throw new Error('Invalid spell results request.');
 const state=kind==='monsters'?(actor.spellcasting ||= {}):(actor.combat ||= {});
 const previous=Array.isArray(state.spellOutcomes)?state.spellOutcomes.filter(r=>r&&typeof r==='object'&&typeof r.id==='string'):[];
 if(previous.some(r=>r.id===request.id))throw new Error('This spell cast was already recorded.');
 const pending=previous.filter(r=>r.status==='pending');if(pending.length>=24)throw new Error('Resolve the pending spell results before casting another automated spell.');
 state.spellOutcomes=[...previous.filter(r=>r.status!=='pending').slice(-7),...pending,{...clone(request),concentrationStartedAtMillis:request.concentration?state.concentration?.startedAtMillis||0:0}];
 return actor;
}

const list = (actor,field) => [actor?.[field],actor?.combat?.[field],actor?.derived?.[field],actor?.defenses?.[field]].flatMap(v=>Array.isArray(v)?v:typeof v==='string'?v.split(','):[]).map(v=>String(v).trim().toLowerCase());
export function getSpellTargetAmounts(request, targetId, decisions={}, actor={},token={}) {
 const validComponent=c=>Number.isSafeInteger(c.total)&&c.total>=0&&c.total<=100000&&Number.isSafeInteger(c.criticalBonus??0)&&(c.criticalBonus??0)>=0&&(c.criticalBonus??0)<=100000;
 if(!Array.isArray(request.damage)||!Array.isArray(request.healing)||!Array.isArray(request.units)||!request.damage.every(validComponent)||!request.healing.every(validComponent)||!request.units.every(u=>Array.isArray(u.damage)&&u.damage.every(validComponent)))throw new Error('Invalid stored spell amounts.');
 const units=request.units.length?request.units.filter(u=>u.targetId===targetId):[{id:targetId,damage:request.damage}];
 let damage=0;const appliedConditions=new Set();const results=[];
 for(const unit of units){const outcome=decisions[unit.id]?.outcome||(!request.attack&&!request.save?'automatic':'');
  const allowed=request.attack?['hit','critical','miss','skip']:request.save?['failed-save','saved','skip']:['automatic','skip'];
  if(!allowed.includes(outcome))throw new Error('Choose the hit or saving throw result for every target.');
  const success=outcome==='automatic'||outcome==='hit'||outcome==='critical'||outcome==='failed-save';
  const adjustment=decisions[unit.id]?.adjustment||'normal';if(!['normal','resistant','vulnerable','immune'].includes(adjustment))throw new Error('Choose a valid damage adjustment.');
  const conditionStatus=decisions[unit.id]?.conditionStatus||'normal';if(!['normal','immune'].includes(conditionStatus))throw new Error('Choose a valid condition immunity option.');
  let amount=0;
  for(const component of unit.damage){let value=component.total+(outcome==='critical'?component.criticalBonus||0:0);
   if(outcome==='skip'||outcome==='miss'||outcome==='saved'&&request.save?.success!=='half')value=0;
   else if(outcome==='saved')value=Math.floor(value/2);
   const type=component.damageType.toLowerCase();const immune=list(actor,'damageImmunities').includes(type)||list(token,'damageImmunities').includes(type)||adjustment==='immune';
   const resist=list(actor,'damageResistances').includes(type)||list(token,'damageResistances').includes(type)||adjustment==='resistant';
   const vulnerable=list(actor,'damageVulnerabilities').includes(type)||list(token,'damageVulnerabilities').includes(type)||adjustment==='vulnerable';
   if(immune)value=0;else {if(resist)value=Math.floor(value/2);if(vulnerable)value*=2;}
   amount+=value;
  }
  damage+=amount;results.push({unitId:unit.id,outcome,adjustment,conditionStatus,damage:amount});
  for(const c of request.conditions){if(conditionStatus==='immune'||outcome==='skip'||c.when==='hit'&&!['hit','critical'].includes(outcome)||c.when==='failed-save'&&outcome!=='failed-save'||c.when==='always'&&!success)continue;const id=c.choice?decisions[unit.id]?.condition||c.id:c.id;if(!knownConditions.has(id)||c.choice&&!c.choice.includes(id))throw new Error('Choose a valid spell condition.');if(!list(actor,'conditionImmunities').includes(id)&&!list(token,'conditionImmunities').includes(id))appliedConditions.add(id);}
 }
 const any=results.some(r=>r.outcome!=='skip');const creatureType=String(actor.creatureType||actor.type?.type||actor.type||actor.species?.creatureType||'').toLowerCase();const cannotHeal=request.healing.length>0&&['undead','construct'].includes(creatureType);const canHeal=any&&!cannotHeal;let notes=cannotHeal?'This healing spell has no effect on '+creatureType+' creatures.':'';const knownTypes=new Set('aberration beast celestial construct dragon elemental fey fiend giant humanoid monstrosity ooze plant undead'.split(' '));if(['hold-person','charm-person'].includes(request.spellId)&&knownTypes.has(creatureType)&&creatureType!=='humanoid'){appliedConditions.clear();notes='This spell only affects humanoids.';}const removal=request.chooseRemoval?[decisions[targetId]?.removeCondition||request.removesConditions[0]]:request.removesConditions;
 if(removal.some(id=>!request.removesConditions.includes(id)))throw new Error('Choose a condition this spell can end.');
 return {damage,notes,removesConditions:(any&&!cannotHeal)?removal:[],healing:(canHeal?1:0)*request.healing.reduce((sum,e)=>sum+e.total,0),temporaryHp:any?request.temporaryHp:0,conditions:[...appliedConditions],results};
}


export function isSpellOutcomeRequest(value) {
 const amount=c=>c&&Number.isSafeInteger(c.total)&&c.total>=0&&c.total<=100000&&typeof c.formula==='string'&&Number.isSafeInteger(c.criticalBonus??0)&&(c.criticalBonus??0)>=0&&(c.criticalBonus??0)<=100000;
 return Boolean(value&&value.schemaVersion===1&&typeof value.id==='string'&&value.id.length>0&&value.id.length<=180&&['pending','applied','dismissed'].includes(value.status)
  &&Array.isArray(value.targets)&&value.targets.length>0&&value.targets.length<=24&&value.targets.every(t=>t&&typeof t.tokenId==='string'&&t.tokenId.length>0)
  &&Array.isArray(value.damage)&&value.damage.length<=8&&value.damage.every(c=>amount(c)&&typeof c.damageType==='string')
  &&Array.isArray(value.healing)&&value.healing.length<=4&&value.healing.every(amount)
  &&Array.isArray(value.units)&&value.units.length<=24&&value.units.every(u=>u&&typeof u.id==='string'&&value.targets.some(t=>t.tokenId===u.targetId)&&Array.isArray(u.damage)&&u.damage.length<=8&&u.damage.every(c=>amount(c)&&typeof c.damageType==='string'))
  &&Array.isArray(value.conditions)&&value.conditions.length<=8&&value.conditions.every(c=>c&&knownConditions.has(c.id)&&['hit','failed-save','always'].includes(c.when)&&(!c.choice||Array.isArray(c.choice)&&c.choice.every(id=>knownConditions.has(id))))
  &&Array.isArray(value.removesConditions)&&value.removesConditions.every(id=>knownConditions.has(id)));
}
