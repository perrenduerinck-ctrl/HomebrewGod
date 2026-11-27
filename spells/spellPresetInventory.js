import {SPELL_BEHAVIOR_FAMILIES} from '../data/spellBehaviorCatalog.js';
import {getSpellBehavior,SPELL_BEHAVIOR_PRESETS} from './spellBehaviorPresets.js';
const remaining={
 'direct-damage':'Damage recipe needs a review of special targets, mixed damage, and secondary effects.',
 'weapon-rider':'Needs weapon-hit linkage, delayed triggers, and attack/action integration.',
 'recurring-area':'Needs entry/turn/exit triggers, area lifecycle, and spell-specific effects.',
 'recurring-action':'Needs later action or delayed-event tracking and resource/action checks.',
 'healing-restoration':'Needs healing/restoration choices, pools, consumption, or special recovery rules.',
 'temporary-hp':'Needs temporary/max HP duration, refresh/retaliation rules, and cleanup.',
 resurrection:'Needs death state, time limits, components, and recovery penalties.',
 'condition-control':'Needs target restrictions, conditions, repeat saves/contests, and ending triggers.',
 'buff-defense':'Needs bonuses/defenses, stacking, duration, and ending triggers.',
 aura:'Needs moving aura membership, exclusions, turn triggers, and modifiers.',
 retaliation:'Needs incoming-hit events, damage choices, and retaliation timing.',
 movement:'Needs destinations, distance/path checks, passenger choices, and movement modes.',
 summon:'Needs creature selection, tokens, stat blocks, initiative, control, and cleanup.',
 transformation:'Needs replacement/restoration of statistics and form-specific options.',
 illusion:'Needs illusion placement, investigation/saves, visibility, and ending rules.',
 information:'Needs targets, range, information/communication outcomes, and DM adjudication.',
 environment:'Needs object/terrain creation or manipulation and duration/persistence rules.',
 'ward-trigger':'Needs stored trigger conditions, delayed outcomes, and dispelling/cleanup.',
 'spell-interference':'Needs spell/action identification, level checks, and cancellation/removal.',
 special:'Needs an explicit sequence of special rules and choices.'
};
const notes={
 'flame-strike':'Fire and radiant components need separate structured amounts.',
 'meteor-swarm':'Fire and bludgeoning components need separate structured amounts.',
 disintegrate:'Slot scaling and disintegration/zero-HP rules need a reviewed recipe.',
 'acid-arrow':'Initial hit, miss damage, and delayed acid damage are separate triggers.',
 'spirit-guardians':'Catalog lacks structured damage/save/aura fields; exclusions and moving-aura effects also need implementation.',
 'flaming-sphere':'The catalog currently targets a creature; sphere placement, movement, ram, and end-turn triggers need a reviewed recipe.',
 'hypnotic-pattern':'Conditions are supported; the catalog currently lacks its cube geometry. Harm/wake-up and other ending rules need adjudication.',
 'mass-heal':'Healing is a distributed pool, not the full amount for every selected target.',
 'armor-of-agathys':'Temporary HP, duration, and retaliation are linked; direct cold damage on cast is incorrect.',
 'aura-of-vitality':'Healing uses later bonus actions, not an immediate cast-wide heal.'
};
const shapeExpectations={'hypnotic-pattern':'cube','spirit-guardians':'sphere','flaming-sphere':'sphere','create-bonfire':'cube','major-image':'cube'};
const familyTrigger={ 'weapon-rider':'weapon hit / later event','recurring-area':'area entry / turn / exit','recurring-action':'later action / delayed event',aura:'aura membership / turn','ward-trigger':'stored trigger',retaliation:'incoming hit',summon:'placement / creature lifecycle',resurrection:'revival sequence',information:'cast / adjudicated information',environment:'cast / object or terrain lifecycle',illusion:'cast / interaction',transformation:'cast / form lifecycle',movement:'cast / movement or destination',special:'special sequence'};
export function classifySpellPreset(spell){
 const b=getSpellBehavior(spell),params=b.spec?.params||{};
 const shape=spell.targeting?.area?.shape||spell.areaOfEffect?.type||spell.targeting?.target?.type||'unspecified';
 const triggers=b.area?Object.keys(b.area.triggers):b.presets.includes('manual')?[familyTrigger[b.family]||((spell.attackType||spell.targeting?.attack)?'attack / hit':(spell.saveAbility||spell.targeting?.save)?'saving throw':'cast / ongoing effect')]:b.presets.map(id=>SPELL_BEHAVIOR_PRESETS[id]?.condition||SPELL_BEHAVIOR_PRESETS[id]?.gate).filter(Boolean);
 const outcomes=[...(b.damage||spell.damage?.length?['damage']:[]),...(b.healing||spell.healing?.length?['healing']:[]),...(b.conditions.length?['conditions: '+b.conditions.map(c=>c.id).join(', ')]:[]),...(b.removesConditions.length?['restoration']:[])];
 if(b.family==='temporary-hp')outcomes.splice(0,outcomes.length,'temporary / maximum HP');
 if(!outcomes.length)outcomes.push(SPELL_BEHAVIOR_FAMILIES[b.family].label.toLowerCase());
 const scaling=[];
 const components=[...(spell.damage||[]),...(spell.healing||[])];
 if(components.some(c=>Object.keys(c.atSlotLevel||{}).length>1)||Object.keys(spell.scaling?.atSlotLevel||{}).length>1||params.projectiles?.countBySlotLevel||b.area&&Object.values(b.area.triggers).some(t=>t.dicePerSlot))scaling.push('slot level');
 if(components.some(c=>Object.keys(c.atCharacterLevel||{}).length>1)||Object.keys(spell.scaling?.atCharacterLevel||{}).length>1||params.projectiles?.countByCharacterLevel)scaling.push('character level');
 const warnings=[...b.errors];if(shapeExpectations[spell.id]&&shape!==shapeExpectations[spell.id])warnings.push('Structured targeting needs review: expected '+shapeExpectations[spell.id]+', currently '+shape+'.');
 return {id:spell.id,name:spell.name,level:spell.level,family:b.family,familyLabel:b.familyLabel,shape,triggers:[...new Set(triggers)],outcomes,duration:spell.duration||'Unspecified',concentration:Boolean(spell.concentration),scaling:scaling.length?scaling:['fixed / text rules'],classes:[...(spell.classes||[])],presets:b.presets,coverage:b.supported?'supported-results':'manual',remaining:notes[spell.id]||(b.supported?'HP/listed conditions or area triggers are supported. Attack/save adjudication and unlisted special rules remain manual.':remaining[b.family]),warnings};
}
export function buildSpellPresetInventory(spells){
 const rows=spells.map(classifySpellPreset).sort((a,b)=>a.level-b.level||a.name.localeCompare(b.name));
 const groups=Object.entries(SPELL_BEHAVIOR_FAMILIES).map(([id,f])=>({id,label:f.label,total:rows.filter(r=>r.family===id).length,supported:rows.filter(r=>r.family===id&&r.coverage==='supported-results').length}));
 return {schemaVersion:1,total:rows.length,supportedResults:rows.filter(r=>r.coverage==='supported-results').length,manual:rows.filter(r=>r.coverage==='manual').length,groups,spells:rows};
}
