import test from 'node:test';
import assert from 'node:assert/strict';
import {ADDITIONAL_SPELL_DETAILS} from '../data/additionalSpellDetails.js';
import {DEFAULT_SPELLS,getDefaultSpellById,validateDefaultSpellCatalog} from '../data/defaultSpells.js';
import {SUBCLASS_SPELL_CATALOG} from '../data/defaultSubclassCatalog.js';
import {SPELL_REFERENCE_ALIASES,SPELL_SOURCE_MODEL_VERSION} from '../characterCreator/spellSources.js';
import {collectCharacterSpells} from '../characterSheet/index.js';
import {getCharacterSpellSlotOptions,applyConfirmedSpellCast} from '../combat/characterCombatCommands.js';
import {createCastResolution} from '../battleMap/castingSession.js';
import {createSpellTemplateInstruction} from '../battleMap/spellTemplates.js';
import {getSpellActionKind,getSpellCastEligibility} from '../spells/spellCastingRules.js';
import {normalizeHomebrewSpell} from '../spells/spellModel.js';

test('every subclass spell reference resolves to a complete definition',()=>{
 assert.equal(ADDITIONAL_SPELL_DETAILS.length,28);assert.equal(DEFAULT_SPELLS.length,368);
 for(const reference of Object.values(SUBCLASS_SPELL_CATALOG).flatMap(levels=>Object.values(levels).flat())){
  const spell=getDefaultSpellById(SPELL_REFERENCE_ALIASES[reference.id]||reference.id);assert.ok(spell,reference.id);assert.ok(spell.description.length>40,reference.id);assert.ok(spell.castingTime,reference.id);assert.equal(spell.requiresSpellDefinition,undefined,reference.id);
 }
 const audit=validateDefaultSpellCatalog(DEFAULT_SPELLS);assert.equal(audit.valid,true,JSON.stringify(audit.errors));assert.equal(audit.counts.srd,319);assert.equal(audit.counts.additionalCantrips,21);assert.equal(audit.counts.additionalSpells,28);
});

test('all added spells replace old placeholders and consume a levelled slot exactly once per cast',()=>{
 for(const raw of ADDITIONAL_SPELL_DETAILS){
  const character={combat:{maxHp:30,currentHp:30},magic:{slots:{[raw.level]:1},spellSourceModelVersion:SPELL_SOURCE_MODEL_VERSION,spellSources:[{sourceId:'grant',sourceName:'Subclass',sourceType:'subclass',classId:raw.classes[0],fixedSpellIds:[raw.id],alwaysPrepared:true,grantsPrepared:true,canUseSpellSlots:true,spellRecords:[{id:raw.id,level:0,requiresSpellDefinition:true}]}]}};
  const [spell]=collectCharacterSpells(character);assert.equal(spell.level,raw.level,raw.id);assert.equal(getSpellCastEligibility(spell).eligible,true,raw.id);assert.ok(createSpellTemplateInstruction(spell).supported,raw.id);
  const options=getCharacterSpellSlotOptions(character,spell);const slot=options.find(s=>s.kind==='normal');assert.ok(slot,raw.id);assert.equal(slot.level,raw.level,raw.id);
  const saved=applyConfirmedSpellCast(character,spell,slot);assert.equal(saved.magic.slotUsage.normal[raw.level],1,raw.id);assert.throws(()=>applyConfirmedSpellCast(saved,spell,slot),/available|remaining|exhausted/i,raw.id);
  if(raw.concentration)assert.equal(saved.combat.concentration.spellId,raw.id);else assert.equal(saved.combat.concentration,undefined);
 }
});

test('selected newer mechanics are explicit and triggered spells use bonus actions',()=>{
 for(const id of ['ray-of-sickness','searing-smite','ensnaring-strike','phantasmal-force','dragons-breath','summon-draconic-spirit']){const s=getDefaultSpellById(id);assert.equal(s.mechanicsEdition,'2024');assert.match(s.sourceLabel,/Homebrew God.*2024/);assert.ok(s.mechanicsReason);}
 const ray=getDefaultSpellById('ray-of-sickness');assert.equal(ray.saveAbility,'');assert.equal(ray.attackType,'ranged');assert.deepEqual(createCastResolution({spell:ray,slotLevel:3}).damage,['4d8 poison']);
 const searing=getDefaultSpellById('searing-smite');assert.equal(searing.concentration,false);assert.equal(getSpellActionKind(searing),'bonus-action');assert.match(searing.castingTrigger,/after.*hit/);
 const ensnaring=getDefaultSpellById('ensnaring-strike');assert.equal(ensnaring.concentration,true);assert.match(ensnaring.castingTrigger,/after.*hit/);
});

test('multi-component and delayed effects retain their individual timing and scaling',()=>{
 const wave=createCastResolution({spell:getDefaultSpellById('destructive-wave'),slotLevel:5});assert.deepEqual(wave.damage,['5d6 thunder','Choose one type: 5d6 radiant or necrotic']);
 const hunger=createCastResolution({spell:getDefaultSpellById('hunger-of-hadar'),slotLevel:5});assert.equal(hunger.damage.length,2);assert.match(hunger.damage[0],/Start.*2d6 cold/);assert.match(hunger.damage[1],/End.*2d6 acid/);assert.match(hunger.resolutionNotes,/Neither.*immediate/);
 const weapon=createCastResolution({spell:getDefaultSpellById('elemental-weapon'),slotLevel:7});assert.match(weapon.damage[0],/On weapon hit: 3d4/);
 const aura=createCastResolution({spell:getDefaultSpellById('aura-of-vitality'),slotLevel:5});assert.match(aura.healing[0],/bonus action.*2d6/);
 const armor=createCastResolution({spell:getDefaultSpellById('armor-of-agathys'),slotLevel:5});assert.equal(armor.temporaryHp,'25');assert.match(armor.damage[0],/25 cold/);
});

test('summoning places a point and custom spell copies retain its controls and costly material',()=>{
 for(const id of ['summon-elemental','summon-aberration','summon-construct','summon-draconic-spirit','grasping-vine']){const s=getDefaultSpellById(id),instruction=createSpellTemplateInstruction(s);assert.equal(instruction.placementOnly,true,id);assert.equal(instruction.singleTarget,false,id);assert.equal(instruction.sourceTargetType,'point',id);}
 const copy=normalizeHomebrewSpell(getDefaultSpellById('summon-draconic-spirit'));assert.equal(copy.materialCostGp,500);assert.equal(copy.materialConsumed,false);assert.equal(copy.placementOnly,true);assert.equal(copy.mechanicsEdition,'2024');assert.ok(copy.summonForms.length);assert.match(copy.resolutionNotes,/Rend/);
});
