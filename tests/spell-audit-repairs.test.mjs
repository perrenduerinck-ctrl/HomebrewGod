import {getDefaultSubclassesForClass} from "../data/defaultSubclasses.js";
import test from "node:test";
import assert from "node:assert/strict";
import {reconcileClassOwnedSpellSources,getSpellSourceOwnership} from "../characterCreator/classSpellReconciliation.js";
import {previewSpellSourceRepair,previewSpellSourceRestore,applySpellRepairPreview} from "../characterCreator/spellRecovery.js";
import {getSpellbookProgress,chooseSpellbookAcquisition,normalizeSpellbookAcquisitions} from "../characterCreator/spellbookProgression.js";
import {evaluateSpellChoices} from "../characterCreator/spellChoices.js";
const spell=(id)=>({id,name:id,level:id.startsWith("second")?2:1,classes:["wizard"]});
const wizard=(level=1)=>({classId:"wizard",className:"Wizard",classEntryId:"wiz",classLevel:level,preparationMode:"spellbook-prepared",maxSpellLevel:Math.min(9,Math.ceil(level/2)),cantripsKnownLimit:0,spellsKnownLimit:0,preparedLimit:1,spellbookSpellIds:[],preparedSpellIds:["one"],spellbookAcquisitions:{}});

test("matching entry IDs cannot bypass conflicting class and subclass identities",()=>{
  const fighter={entryId:"primary",classId:"fighter",className:"Fighter"};
  assert.equal(getSpellSourceOwnership({sourceType:"class",classEntryId:"primary",classId:"wizard"},[fighter]).active,false);
  const light={entryId:"primary",classId:"cleric",subclassId:"light"};
  assert.equal(getSpellSourceOwnership({sourceType:"subclass",classEntryId:"primary",classId:"cleric",subclassId:"life"},[light]).active,false);
  assert.equal(getSpellSourceOwnership({sourceType:"class",classEntryId:"primary",classId:"cleric",subclassId:"life"},[light]).active,true);
});

test("mismatched raw and canonical grants are archived once without dropping manual choices",()=>{
 const c={classProgression:{classes:[{entryId:"cleric",classId:"cleric",subclassId:"light"}]},magic:{classSources:{cleric:{classEntryId:"cleric",classId:"cleric",subclassId:"life",preparedSpellIds:["healing-word"],alwaysPreparedSpellIds:["cure-wounds"],subclassSpellIds:["cure-wounds"]}},spellSources:[{sourceId:"subclass:cleric:life",sourceType:"subclass",classEntryId:"cleric",classId:"cleric",subclassId:"life",fixedSpellIds:["cure-wounds"]}],knownSpellIds:["cure-wounds","healing-word"],preparedSpellIds:["cure-wounds","healing-word"]}};
 reconcileClassOwnedSpellSources(c);
 assert.deepEqual(c.magic.classSources.cleric.preparedSpellIds,["healing-word"]);assert.deepEqual(c.magic.classSources.cleric.alwaysPreparedSpellIds,[]);
 assert.deepEqual(c.magic.preparedSpellIds,["healing-word"]);assert.equal(c.builder.archivedClassSpellSources.length,1);
 const warnings=c.builder.validation.classChangeReviewWarnings.slice();reconcileClassOwnedSpellSources(c);assert.deepEqual(c.builder.validation.classChangeReviewWarnings,warnings);
});

test("source repair previews are read-only, require confirmation, and reject stale plans",()=>{
 const c={classProgression:{classes:[]},magic:{classSources:{},spellSources:[{sourceId:"legacy",sourceType:"class",selectedSpellIds:["one"]}],knownSpellIds:["one"]}};
 const before=JSON.stringify(c);const plan=previewSpellSourceRepair(c);assert.equal(JSON.stringify(c),before);assert.equal(plan.after.magic.spellSources.length,0);
 c.magic.knownSpellIds.push("two");assert.throws(()=>applySpellRepairPreview(c,plan),/changed/);
});

test("restoration rejects wrong classes and restores compatible archived sources",()=>{
 const c={classProgression:{classes:[{entryId:"wiz-new",classId:"wizard",className:"Wizard"},{entryId:"cleric",classId:"cleric",className:"Cleric"}]},builder:{archivedClassSpellSources:[{sourceId:"class:wiz-old",sourceType:"class",classEntryId:"wiz-old",classId:"wizard",selectedSpellIds:["one"],spellStates:{one:{spellbook:true,known:true,prepared:true}},spellbookAcquisitions:{one:{kind:"level",classLevel:1}}}]},magic:{classSources:{},spellSources:[]}};
 assert.equal(previewSpellSourceRestore(c,0,"cleric").allowed,false);
 const plan=previewSpellSourceRestore(c,0,"wiz-new");assert.equal(plan.allowed,true);const restored=applySpellRepairPreview(c,plan);
 assert.deepEqual(restored.magic.classSources["wiz-new"].spellbookSpellIds,["one"]);assert.deepEqual(restored.magic.classSources["wiz-new"].preparedSpellIds,["one"]);assert.equal(restored.builder.archivedClassSpellSources.length,0);
 assert.equal(c.builder.archivedClassSpellSources.length,1);
});

test("Wizard free choices use Wizard levels and copied spells do not spend them",()=>{
 const entry=wizard(3);entry.spellbookSpellIds=Array.from({length:7},(_,i)=>"one"+i);entry.spellbookAcquisitions=Object.fromEntries(entry.spellbookSpellIds.map((id,i)=>[id,i<6?{kind:"level",classLevel:1}:{kind:"copied"}]));
 const p=getSpellbookProgress(entry,spell);assert.equal(p.remaining,4);assert.equal(p.copied.length,1);
 assert.deepEqual(chooseSpellbookAcquisition(entry,spell("second-spell"),null,spell),{kind:"level",classLevel:3});
 assert.throws(()=>chooseSpellbookAcquisition(entry,spell("second-spell"),"level:2",spell),/eligible/);
});

test("legacy spellbook history is proposed without silently changing the book",()=>{
 const entry=wizard(1);entry.spellbookSpellIds=Array.from({length:8},(_,i)=>"one"+i);const before=JSON.stringify(entry);const p=getSpellbookProgress(entry,spell);
 assert.equal(p.unclassified.length,8);assert.equal(Object.values(p.proposals).filter(a=>a.kind==="level").length,6);assert.equal(Object.values(p.proposals).filter(a=>a.kind==="copied").length,2);assert.equal(JSON.stringify(entry),before);
 assert.equal(Object.getPrototypeOf(normalizeSpellbookAcquisitions(JSON.parse('{"__proto__":{"kind":"copied"}}'))),null);
});

test("valid drafts and readiness are distinct, and preparation capacity need not be full",()=>{
 const bard={classId:"bard",className:"Bard",preparationMode:"known",maxSpellLevel:1,cantripsKnownLimit:2,spellsKnownLimit:4,preparedLimit:null};
 const draft=evaluateSpellChoices({classSelections:[bard]});assert.equal(draft.validDraft,true);assert.equal(draft.isReady,false);assert.match(draft.readinessIssues.join(" "),/4 Bard/);
 const cleric={classId:"cleric",className:"Cleric",preparationMode:"prepared",maxSpellLevel:1,cantripsKnownLimit:0,spellsKnownLimit:0,preparedLimit:5,preparedSpellIds:["one"]};
 assert.equal(evaluateSpellChoices({classSelections:[cleric],resolveSpell:id=>({...spell(id),classes:["cleric"]})}).isReady,true);
 const w=wizard(1);const empty=evaluateSpellChoices({classSelections:[w],resolveSpell:spell});assert.equal(empty.isReady,false);assert.match(empty.readinessIssues.join(" "),/6 free spellbook/);
});


test("applying a repair preserves unrelated edits made after its preview",()=>{
 const c={identity:{name:"Before"},classProgression:{classes:[]},magic:{spellSources:[{sourceId:"legacy",sourceType:"class",selectedSpellIds:["one"]}]}};
 const plan=previewSpellSourceRepair(c);c.identity.name="After";
 assert.equal(applySpellRepairPreview(c,plan).identity.name,"After");
});
test("archive retains independent Magical Secrets instances and shared active spell access",()=>{
 const c={classProgression:{classes:[{entryId:"cleric",classId:"cleric"}]},magic:{classSources:{cleric:{classId:"cleric",preparedSpellIds:["one"]}},spellSources:[{sourceType:"magical-secrets",sourceId:"secrets:10",classId:"bard",classEntryId:"old",selectedSpellIds:["one"]},{sourceType:"magical-secrets",sourceId:"secrets:14",classId:"bard",classEntryId:"old",selectedSpellIds:["two"]}],preparedSpellIds:["one"],knownSpellIds:["one","two"]}};
 reconcileClassOwnedSpellSources(c);assert.equal(c.builder.archivedClassSpellSources.length,2);assert.deepEqual(c.magic.preparedSpellIds,["one"]);
});
test("copied books remain uncapped and overspent free choices remain reviewable",()=>{
 const e=wizard(1);e.spellbookSpellIds=Array.from({length:30},(_,i)=>"one"+i);e.spellbookAcquisitions=Object.fromEntries(e.spellbookSpellIds.map(id=>[id,{kind:"copied"}]));
 assert.deepEqual(getSpellbookProgress(e,spell).errors,[]);assert.equal(getSpellbookProgress(e,spell).remaining,6);
 for(const id of e.spellbookSpellIds.slice(0,7))e.spellbookAcquisitions[id]={kind:"level",classLevel:1};
 assert.match(getSpellbookProgress(e,spell).errors.join(" "),/too many free/);assert.equal(e.spellbookSpellIds.length,30);
});

test("every catalog Paladin Channel Divinity option supplies its shared use budget",()=>{
 const options=getDefaultSubclassesForClass("paladin").flatMap(subclass=>Object.values(subclass.featuresByLevel || {}).flat()).filter(feature=>/^channel divinity(?:\s*:|$)/i.test(feature.name));
 assert.ok(options.length>10);
 for(const option of options)assert.equal(option.resource?.uses,1,option.name);
});
