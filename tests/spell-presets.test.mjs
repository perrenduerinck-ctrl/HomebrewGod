import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_SPELLS,getDefaultSpellById as spell} from '../data/defaultSpells.js';
import {SPELL_BEHAVIOR_FAMILIES,SPELL_FAMILY_BY_ID} from '../data/spellBehaviorCatalog.js';
import {getSpellBehavior,getSpellBehaviorSpec,validateSpellBehavior,getPresetProjectileProfile} from '../spells/spellBehaviorPresets.js';
import {buildSpellPresetInventory} from '../spells/spellPresetInventory.js';
import {normalizeHomebrewSpell,homebrewSpellToCharacterCopy,validateHomebrewSpell} from '../spells/spellModel.js';
import {createIndependentSpellCopy,mergeSpellCreatorDraft} from '../spells/spellCreator.js';
import {createSpellOutcomeRequest,getSpellTargetAmounts} from '../spells/spellOutcomes.js';
import {spellAreaTrigger,spellAreaEventKey} from '../spells/spellAreas.js';
const spec=(...presets)=>({version:1,presets,params:{}});
const cast=(s,extra={})=>createSpellOutcomeRequest({id:'test-cast',spell:s,slot:{level:Math.max(1,s.level),spellSaveDc:15,spellAttackBonus:7,spellcastingModifier:4},target:{affectedTokens:[{id:'target'}]},casterToken:{id:'caster'},tokens:[{id:'target',linkedCharacterId:'victim'}],random:()=>.5,...extra});

test('every catalog spell belongs to exactly one of 20 primary families; manual is distinct from supported results',()=>{
 const ids=Object.values(SPELL_BEHAVIOR_FAMILIES).flatMap(f=>f.spells.split(/\s+/));assert.equal(ids.length,new Set(ids).size);assert.equal(ids.length,368);assert.deepEqual([...ids].sort(),DEFAULT_SPELLS.map(s=>s.id).sort());
 const inventory=buildSpellPresetInventory(DEFAULT_SPELLS);assert.equal(inventory.groups.length,20);assert.equal(inventory.total,368);assert.equal(inventory.supportedResults,40);assert.equal(inventory.manual,328);assert.equal(inventory.groups.reduce((n,g)=>n+g.total,0),368);
 assert.equal(SPELL_FAMILY_BY_ID['armor-of-agathys'],'temporary-hp');assert.equal(SPELL_FAMILY_BY_ID['acid-arrow'],'recurring-action');assert.equal(SPELL_FAMILY_BY_ID['summon-elemental'],'summon');assert.equal(inventory.spells.find(s=>s.id==='mass-heal').coverage,'manual');assert.match(inventory.spells.find(s=>s.id==='spirit-guardians').remaining,/lacks structured/);
});

test('all 40 configured catalog spells satisfy shared contracts and report geometry gaps separately',()=>{
 for(const s of DEFAULT_SPELLS)assert.deepEqual(validateSpellBehavior(s),[],s.id);
 const row=buildSpellPresetInventory(DEFAULT_SPELLS).spells.find(s=>s.id==='hypnotic-pattern');assert.equal(row.coverage,'supported-results');assert.match(row.warnings[0],/cube/);
});

test('an independently named Fireball template retains its recipe, scaling, and save behavior',()=>{
 const copied=createIndependentSpellCopy(spell('fireball'));copied.id='cinder-globe';copied.name='Cinder Globe';const normalized=normalizeHomebrewSpell(copied);
 assert.deepEqual(validateHomebrewSpell(normalized),[]);assert(getSpellBehavior(normalized).supported);
 const r=cast(normalized,{slot:{level:4,spellSaveDc:15}});assert.equal(r.damage[0].formula,'9d6');assert.equal(r.damage[0].damageType,'fire');assert.equal(r.save.ability,'dex');assert.equal(getSpellTargetAmounts(r,'target',{target:{outcome:'saved'}}).damage,18);
 const copy=homebrewSpellToCharacterCopy(normalized,{idFactory:()=> 'character-spell'});assert(getSpellBehavior(copy).supported);assert.deepEqual(copy.behavior,normalized.behavior);assert.equal(copy.id,'character-spell');
});

test('new custom presets execute with independent IDs and normalized damage types',()=>{
 const s=normalizeHomebrewSpell({id:'custom-cold-cone',name:'Cold Cone',level:1,range:'60 feet',duration:'Instantaneous',saveAbility:'dex',saveSuccess:'half',damageDice:'2d6',damageType:'Cold',behavior:spec('save-damage')});assert.deepEqual(validateHomebrewSpell(s),[]);
 const r=cast(s);assert.equal(r.damage[0].damageType,'cold');assert.equal(getSpellTargetAmounts(r,'target',{target:{outcome:'failed-save'}}).damage,8);assert.equal(getSpellTargetAmounts(r,'target',{target:{outcome:'saved'}}).damage,4);
});

test('projectile recipes control count and shared rolls without matching spell names',()=>{
 const s={...spell('magic-missile'),id:'silver-darts',behavior:getSpellBehaviorSpec(spell('magic-missile'))};assert.equal(getPresetProjectileProfile(s,4,1).count,6);
 let rolls=0;const r=cast(s,{slot:{level:1},target:{affectedTokens:[{id:'target'}],projectiles:[{targetId:'target',damage:'1d4 + 1 force'},{targetId:'target',damage:'1d4 + 1 force'},{targetId:'target',damage:'1d4 + 1 force'}]},random:()=>{rolls++;return .5;}});assert.equal(rolls,1);assert.equal(getSpellTargetAmounts(r,'target').damage,12);
 const beam={...spell('eldritch-blast'),id:'starlight-beam',behavior:getSpellBehaviorSpec(spell('eldritch-blast'))};assert.equal(getPresetProjectileProfile(beam,0,17).count,4);
});

test('custom conditions and restoration follow their preset trigger and selection rules',()=>{
 const s=normalizeHomebrewSpell({id:'custom-snare',name:'Snare',duration:'1 minute',range:'60 feet',saveAbility:'wis',saveSuccess:'none',effects:[{type:'condition',condition:'restrained'}],behavior:spec('condition-on-save')});assert.deepEqual(validateHomebrewSpell(s),[]);const r=cast(s);assert.deepEqual(getSpellTargetAmounts(r,'target',{target:{outcome:'failed-save'}}).conditions,['restrained']);assert.deepEqual(getSpellTargetAmounts(r,'target',{target:{outcome:'saved'}}).conditions,[]);
 const rest={...spell('lesser-restoration'),id:'custom-cleanse',behavior:getSpellBehaviorSpec(spell('lesser-restoration'))};assert.deepEqual(getSpellTargetAmounts(cast(rest),'target',{target:{removeCondition:'poisoned'}}).removesConditions,['poisoned']);
});

test('area recipes carry slot scaling, separate phases, and receipt rules to independent copies',()=>{
 const moon=getSpellBehaviorSpec(spell('moonbeam')).params.area,hadar=getSpellBehaviorSpec(spell('hunger-of-hadar')).params.area;
 const zone={spellId:'silver-moon',areaBehavior:moon,slotLevel:4,saveDc:16};assert.equal(spellAreaTrigger(zone,'start').formula,'4d10');assert.equal(spellAreaEventKey(zone,{id:'victim'},'enter',2),spellAreaEventKey(zone,{id:'victim'},'start',2));
 const dark={spellId:'void-area',areaBehavior:hadar,slotLevel:9,saveDc:16};assert.equal(spellAreaTrigger(dark,'start').damageType,'cold');assert.equal(spellAreaTrigger(dark,'end').damageType,'acid');assert.equal(spellAreaTrigger(dark,'end').save.success,'none');
});

test('preset restrictions are saved rules and do not depend on the original spell ID',()=>{
 const heal={...spell('cure-wounds'),id:'custom-cure',behavior:getSpellBehaviorSpec(spell('cure-wounds'))};const r=cast(heal);assert.equal(getSpellTargetAmounts(r,'target',{}, {type:'undead'}).healing,0);
 const hold={...spell('hold-person'),id:'custom-hold',behavior:getSpellBehaviorSpec(spell('hold-person'))};assert.deepEqual(getSpellTargetAmounts(cast(hold),'target',{target:{outcome:'failed-save'}},{type:'dragon'}).conditions,[]);
});

test('invalid or incompatible presets cannot silently enable results',()=>{
 const base={id:'custom',name:'Custom',level:1,range:'60 feet',duration:'Instantaneous',damageDice:'2d6',damageType:'fire',saveAbility:'dex',saveSuccess:'half'};
 for(const behavior of [{version:999,presets:['save-damage']},spec('not-a-preset'),spec('save-damage','attack-damage'),{version:1,presets:['save-damage'],params:{typo:true}}, {version:1,presets:['restoration'],params:{removesConditions:['not-a-condition']}}, {version:1,presets:['condition-on-save'],params:{conditions:[null]}}, {version:1,presets:['save-damage'],params:{maxTargets:25}}]){assert(validateSpellBehavior({...base,behavior}).length);assert.equal(getSpellBehavior({...base,behavior}).supported,false);}
 assert(validateSpellBehavior({...base,damageType:'',behavior:spec('save-damage')}).length);assert(validateSpellBehavior({...base,saveAbility:'',behavior:spec('save-damage')}).length);assert(validateSpellBehavior({...base,duration:'1 minute',behavior:spec('save-damage')}).length);
 assert.equal(getSpellBehavior({id:'constructor'}).supported,false);assert.equal(getSpellBehavior({...base,behavior:spec('manual')}).supported,false);
});

test('recipe reads are independent and legacy pending results still use the same restrictions',()=>{
 const specA=getSpellBehaviorSpec(spell('hold-person'));specA.params.allowedCreatureTypes.push('dragon');assert.deepEqual(getSpellBehaviorSpec(spell('hold-person')).params.allowedCreatureTypes,['humanoid']);
 const legacy=cast(spell('hold-person'));delete legacy.rules;assert.deepEqual(getSpellTargetAmounts(legacy,'target',{target:{outcome:'failed-save'}},{type:'dragon'}).conditions,[]);
});

test('editing a copied area duration updates its shared recipe without changing the source',()=>{
 const source={...spell('moonbeam'),behavior:getSpellBehaviorSpec(spell('moonbeam'))};
 const merged=mergeSpellCreatorDraft(source,{duration:'Up to 2 minutes',concentration:true},{duration:source.duration,concentration:true});
 assert.equal(merged.behavior.params.area.durationSeconds,120);assert.equal(source.behavior.params.area.durationSeconds,60);assert.deepEqual(validateSpellBehavior(merged),[]);
});

test('shared damage presets support mixed dice and criticals without doubling flat modifiers',()=>{
 const s=normalizeHomebrewSpell({id:'mixed-bolt',name:'Mixed Bolt',level:1,duration:'Instantaneous',range:'60 feet',attackType:'ranged',damageDice:'2d6 + 1d4 + 4',damageType:'Force',behavior:spec('attack-damage')});
 assert.deepEqual(validateHomebrewSpell(s),[]);const request=cast(s);assert.equal(request.damage[0].total,15);assert.equal(request.damage[0].criticalBonus,11);assert.equal(getSpellTargetAmounts(request,'target',{target:{outcome:'critical'}}).damage,26);
 assert(validateSpellBehavior({...s,damage:[],damageDice:'101d6'}).length);
});
