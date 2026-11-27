import {isSupportedSpellDice} from './spellDice.js';
import {SPELL_FAMILY_BY_ID,SPELL_BEHAVIOR_FAMILIES} from '../data/spellBehaviorCatalog.js';
import {SPELL_EXECUTION_RECIPES} from '../data/spellExecutionRecipes.js';

export const SPELL_BEHAVIOR_VERSION=1;
export const SPELL_BEHAVIOR_PRESETS=Object.freeze({
 'attack-damage': {label:'Spell attack damage',damage:true,gate:'attack'},
 'save-damage': {label:'Saving throw damage',damage:true,gate:'save'},
 'automatic-damage': {label:'Automatic damage',damage:true,gate:'automatic'},
 'projectile-attack': {label:'Separate projectile attacks',damage:true,gate:'attack',projectiles:true},
 'projectile-automatic': {label:'Automatic projectiles',damage:true,gate:'automatic',projectiles:true},
 healing: {label:'Immediate healing',healing:true,gate:'automatic'},
 restoration: {label:'Remove conditions',restoration:true,gate:'automatic'},
 'condition-on-hit': {label:'Condition after a hit',condition:'hit',gate:'attack'},
 'condition-on-save': {label:'Condition after a failed save',condition:'failed-save',gate:'save'},
 'condition-always': {label:'Apply a condition',condition:'always',gate:'automatic'},
 'recurring-area': {label:'Persistent area with turn triggers',area:true,gate:'area'},
 manual: {label:'Manual or special rules',gate:'manual'}
});
export const CREATOR_BEHAVIOR_PRESETS=Object.freeze(['attack-damage','save-damage','automatic-damage','healing','condition-on-save','condition-always','manual']);
const clone=v=>structuredClone(v);
const abilities=new Set(['str','dex','con','int','wis','cha']);
const conditions=new Set('blinded charmed deafened frightened grappled incapacitated invisible paralyzed petrified poisoned prone restrained stunned unconscious'.split(' '));
const damageTypes=new Set('acid bludgeoning cold fire force lightning necrotic piercing poison psychic radiant slashing thunder'.split(' '));
const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);
const records=v=>Array.isArray(v)?v:plain(v)?[v]:[];
const hasAmount=(entries)=>entries.some(e=>e?.dice||e?.amount||Object.keys(e?.atSlotLevel||{}).length||Object.keys(e?.atCharacterLevel||{}).length);
const hasSave=s=>abilities.has(s.targeting?.save?.ability||s.save?.ability||s.saveAbility);
const hasAttack=s=>['melee','ranged'].includes(s.targeting?.attack?.type||s.attack?.type||s.attackType);

export function getSpellBehaviorSpec(spell={}) {
 if(spell.behavior!=null)return clone(spell.behavior);
 const spec=clone((Object.hasOwn(SPELL_EXECUTION_RECIPES,spell.id)?SPELL_EXECUTION_RECIPES[spell.id]:null)||{version:1,presets:['manual'],params:{}});
 if(Object.hasOwn(SPELL_FAMILY_BY_ID,spell.id))spec.family=SPELL_FAMILY_BY_ID[spell.id];return spec;
}
export function spellBehaviorDurationSeconds(spell={}) {
 const duration=spell.targeting?.duration,units={second:1,seconds:1,round:6,rounds:6,minute:60,minutes:60,hour:3600,hours:3600,day:86400,days:86400};
 if(duration?.type==='timed'&&Number(duration.amount)>0&&units[duration.unit])return Number(duration.amount)*units[duration.unit];
 const match=String(spell.duration||'').match(/(\d+)\s*(second|round|minute|hour|day)s?/i);return match?Number(match[1])*units[match[2].toLowerCase()]:null;
}
export function normalizeSpellBehavior(value) {return value==null?null:clone(value);}
function compiledConditions(spell,spec){
 if(Array.isArray(spec?.params?.conditions))return clone(spec.params.conditions);
 const preset=(Array.isArray(spec?.presets)?spec.presets:[]).map(id=>SPELL_BEHAVIOR_PRESETS[id]).find(p=>p?.condition);
 if(!preset)return [];
 return records(spell.effects).filter(e=>e.type==='condition').map(e=>({id:e.condition||e.id,when:preset.condition}));
}
export function validateSpellBehavior(spell={}) {
 const spec=getSpellBehaviorSpec(spell),errors=[];
 if(!plain(spec)||spec.version!==1||!Array.isArray(spec.presets)||!spec.presets.length||spec.presets.length>5)return ['Choose a valid spell behavior preset (version 1).'];
 if(spec.presets.some(id=>!Object.hasOwn(SPELL_BEHAVIOR_PRESETS,id)))return ['The spell uses an unknown behavior preset.'];
 if(spec.family!=null&&!Object.hasOwn(SPELL_BEHAVIOR_FAMILIES,spec.family))errors.push('Choose a known spell behavior family.');
 if(new Set(spec.presets).size!==spec.presets.length)errors.push('A behavior preset can appear only once.');
 const presets=spec.presets.map(id=>SPELL_BEHAVIOR_PRESETS[id]),params=spec.params??{};
 if(!plain(params))return ['Spell preset settings must be an object.'];
 if(spec.presets.includes('manual'))return spec.presets.length===1?errors:['Manual handling cannot be combined with automated presets.'];
 const gates=new Set(presets.map(p=>p.gate));if(gates.size>1)errors.push('Combine presets with the same hit, save, or automatic resolution rule.');
 if(presets.some(p=>p.gate==='attack')&&!hasAttack(spell)&&!presets.some(p=>p.projectiles))errors.push('This preset requires a melee or ranged spell attack.');
 if(presets.some(p=>p.gate==='save')&&!hasSave(spell))errors.push('This preset requires a saving throw ability.');
 if(gates.has('attack')&&hasSave(spell)||gates.has('save')&&hasAttack(spell))errors.push('Choose one attack or saving-throw rule, or use manual handling for a multi-step spell.');
 if(gates.has('save')&&!['none','half'].includes(spell.targeting?.save?.success||spell.save?.success||spell.saveSuccess||'none'))errors.push('A successful save must cause half damage or no effect.');
 if(gates.has('automatic')&&(hasSave(spell)||hasAttack(spell)))errors.push('Automatic spells cannot also require an attack or saving throw.');
 if(presets.some(p=>p.damage)&&!presets.some(p=>p.projectiles)&&!hasAmount(records(spell.damage).concat(spell.damageDice?[{dice:spell.damageDice}]:[])))errors.push('This preset requires a damage amount or scaling table.');
 if(presets.some(p=>p.damage)&&!presets.some(p=>p.projectiles)){const entries=records(spell.damage).length?records(spell.damage):spell.damageDice?[{damageType:spell.damageType}]:[];if(entries.some(e=>!damageTypes.has(String(e.damageType||e.type||'').toLowerCase())))errors.push('Damage presets require a supported damage type for each component.');}
 const amountRecords=[...(presets.some(p=>p.damage)&&!presets.some(p=>p.projectiles)?records(spell.damage).concat(spell.damageDice?[{dice:spell.damageDice}]:[]):[]),...(presets.some(p=>p.healing)?records(spell.healing):[])];
 for(const entry of amountRecords){const formulas=[entry.dice||entry.amount,...Object.values(entry.atSlotLevel||{}),...Object.values(entry.atCharacterLevel||{})].filter(v=>v!=null&&v!=='');if(formulas.some(f=>!isSupportedSpellDice(f,{allowModifier:true})))errors.push('Preset amounts must use bounded dice formulas such as 2d6 + MOD.');}
 if(presets.some(p=>p.healing)&&!hasAmount(records(spell.healing)))errors.push('This preset requires a healing amount or scaling table.');
 if(presets.some(p=>p.healing||p.damage&&!params.initialDamage)&&spell.duration&&!/^instantaneous$/i.test(spell.duration))errors.push('Immediate damage or healing presets require Instantaneous duration. Use a recurring preset for later effects.');
 if(params.maxTargets!=null&&(!Number.isInteger(params.maxTargets)||params.maxTargets<1||params.maxTargets>24))errors.push('Preset target count must be between 1 and 24.');
 for(const key of Object.keys(params))if(!['conditions','removesConditions','chooseRemoval','maxTargets','projectiles','area','initialDamage','healingExcludedCreatureTypes','allowedCreatureTypes'].includes(key))errors.push('Unknown spell preset setting: '+key+'.');
 const creatureTypes=new Set('aberration beast celestial construct dragon elemental fey fiend giant humanoid monstrosity ooze plant undead'.split(' '));
 for(const key of ['healingExcludedCreatureTypes','allowedCreatureTypes'])if(params[key]!=null&&(!Array.isArray(params[key])||params[key].some(v=>!creatureTypes.has(v))))errors.push('Use known creature types in '+key+'.');
 const entries=compiledConditions(spell,spec);
 if(presets.some(p=>p.condition)&&!entries.length)errors.push('This preset requires a condition.');
 if(entries.length>8||entries.some(c=>!plain(c)||!conditions.has(c.id)||!presets.some(p=>p.condition===c.when)||c.choice&&(!Array.isArray(c.choice)||!c.choice.length||c.choice.some(id=>!conditions.has(id)))||c.repeatSave&&!abilities.has(c.repeatSave)))errors.push('Use supported conditions and the trigger required by the preset.');
 if(entries.length&&/^instantaneous$/i.test(spell.duration||'')&&entries.some(c=>!c?.duration))errors.push('An instantaneous spell must specify when its condition ends.');
 if(presets.some(p=>p.restoration)&&(!Array.isArray(params.removesConditions)||!params.removesConditions.length||params.removesConditions.some(id=>!conditions.has(id))))errors.push('Restoration requires a list of conditions it can remove.');
 if(presets.some(p=>p.projectiles)){
  const p=params.projectiles,tables=p?[p.countBySlotLevel,p.countByCharacterLevel].filter(Boolean):[];
  if(!p||!['shared','independent'].includes(p.roll)||!/^\d+d\d+(?:\s*\+\s*\d+)?\s+\w+$/.test(p.damage||'')||!damageTypes.has(String(p.damage||'').split(/\s+/).at(-1))||tables.length!==1||!tables.every(t=>plain(t)&&Object.keys(t).length>0&&Object.entries(t).every(([level,count])=>Number.isInteger(Number(level))&&Number(level)>=1&&Number(level)<=20&&Number.isInteger(count)&&count>=1&&count<=24)))errors.push('Projectile presets require valid damage and one bounded projectile-count table.');
 }
 if(presets.some(p=>p.area)){
  const area=params.area;
  if(!area||!Number.isInteger(area.durationSeconds)||area.durationSeconds<1||area.durationSeconds>86400||!['turn','phase'].includes(area.receiptGroup)||!plain(area.triggers)||!Object.keys(area.triggers).length||Object.entries(area.triggers).some(([phase,t])=>!['start','end','enter'].includes(phase)||!Number.isInteger(t.die)||t.die<2||t.die>1000||!Number.isInteger(t.baseDice)||t.baseDice<1||t.baseDice>100||!damageTypes.has(t.damageType)||t.dicePerSlot!=null&&(!Number.isInteger(t.dicePerSlot)||t.dicePerSlot<0||t.baseDice+9*t.dicePerSlot>100)||t.baseLevel!=null&&(!Number.isInteger(t.baseLevel)||t.baseLevel<0||t.baseLevel>9)||t.saveAbility&&!abilities.has(t.saveAbility)||t.saveAbility&&!['none','half'].includes(t.saveSuccess)))errors.push('Area presets require supported turn triggers, damage, duration, and receipt rules.');
  if(area?.moveFeet!=null&&(!Number.isFinite(area.moveFeet)||area.moveFeet<=0||area.moveFeet>1000))errors.push('Area movement must have a positive, bounded distance.');
  const seconds=spellBehaviorDurationSeconds(spell);if(seconds==null||seconds!==area?.durationSeconds)errors.push('The area preset duration must match the spell duration.');
  if(!spell.concentration&&!spell.targeting?.duration?.concentration)errors.push('The current recurring-area preset requires concentration.');
  if(!['sphere','cylinder'].includes(spell.targeting?.area?.shape||spell.areaOfEffect?.type))errors.push('The current recurring-area preset requires a sphere or cylinder.');
 }
 return errors;
}
export function getSpellBehavior(spell={}) {
 const spec=getSpellBehaviorSpec(spell),errors=validateSpellBehavior(spell),ids=Array.isArray(spec?.presets)?spec.presets:['manual'];
 const presets=ids.map(id=>SPELL_BEHAVIOR_PRESETS[id]).filter(Boolean),params=plain(spec?.params)?spec.params:{};
 const family=(Object.hasOwn(SPELL_BEHAVIOR_FAMILIES,spec?.family)?spec.family:null)|| (presets.some(p=>p.area)?'recurring-area':presets.some(p=>p.healing||p.restoration)?'healing-restoration':presets.some(p=>p.condition)?'condition-control':presets.some(p=>p.damage)?'direct-damage':'special');
 return {version:1,family,familyLabel:SPELL_BEHAVIOR_FAMILIES[family].label,presets:ids,spec,errors,
  supported:errors.length===0&&!ids.includes('manual'),damage:presets.some(p=>p.damage),healing:presets.some(p=>p.healing),temporaryHp:false,
  conditions:compiledConditions(spell,spec).filter(plain),removesConditions:clone(params.removesConditions||[]),chooseRemoval:params.chooseRemoval===true,maxTargets:params.maxTargets||24,
  area:clone(params.area||null),projectiles:clone(params.projectiles||null),rules:{healingExcludedCreatureTypes:clone(params.healingExcludedCreatureTypes||[]),allowedCreatureTypes:clone(params.allowedCreatureTypes||[])}};
}

export function getPresetProjectileProfile(spell,slotLevel,characterLevel){
 const behavior=getSpellBehavior(spell),p=behavior.projectiles;if(!behavior.supported||!p)return null;
 const table=p.countBySlotLevel||p.countByCharacterLevel,level=p.countBySlotLevel?Math.min(9,Math.max(1,Number(slotLevel)||1)):Math.max(1,Number(characterLevel)||1);
 const thresholds=Object.keys(table).map(Number).sort((a,b)=>a-b);const threshold=thresholds.filter(n=>n<=level).at(-1)??thresholds[0];
 return Object.freeze({count:table[threshold],label:p.label||'Projectile',damage:p.damage,separateAttacks:behavior.presets.includes('projectile-attack'),roll:p.roll});
}
