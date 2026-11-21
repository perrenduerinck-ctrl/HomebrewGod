import { reconcileClassOwnedSpellSources, getSpellSourceOwnership } from "./classSpellReconciliation.js";
import { normalizeSpellSources, populateSpellSourceCompatibility, synchronizeCanonicalSpellSources, getSpellSourceCompatibilityAliases } from "./spellSources.js?v=spell-system-20261120";
const clone = (value) => JSON.parse(JSON.stringify(value));
const unique = (values) => [...new Set(values.filter(Boolean))];
export function spellRepairFingerprint(character) { return JSON.stringify({magic:character.magic,classes:character.classProgression?.classes,archive:character.builder?.archivedClassSpellSources}); }
export function previewSpellSourceRepair(character) {
  const after = clone(character); const result = reconcileClassOwnedSpellSources(after, after.classProgression?.classes, {quarantineUncertain:true});
  synchronizeCanonicalSpellSources(after,{fromCompatibility:true});
  Object.assign(after.magic,getSpellSourceCompatibilityAliases(after));
  return {before:spellRepairFingerprint(character),after,allowed:true,description:"Archive unresolved spell ownership",removedSpellIds:result.deactivatedSpellIds,errors:[]};
}
export function previewSpellSourceRestore(character, archiveIndex, targetEntryId) {
  const after = clone(character);
  const source = after.builder?.archivedClassSpellSources?.[archiveIndex];
  const target = after.classProgression?.classes?.find((entry)=>(entry.entryId || entry.classEntryId)===targetEntryId);
  const error = (message) => ({before:spellRepairFingerprint(character),after,allowed:false,errors:[message],description:"Restore archived spell source"});
  if(!source || !target) return error("Choose an archived source and a current spellcasting class.");
  const restored = {...source,classEntryId:targetEntryId};
  if(!getSpellSourceOwnership(restored,[target]).active || getSpellSourceOwnership(restored,[target]).uncertain) return error("This source does not match the selected class and subclass. Restore the matching class/subclass first.");
  restored.classId = target.classId;
  restored.className = target.className;
  const magic = after.magic ||= {};
  if(Array.isArray(restored.selectedSpellIds) || Array.isArray(restored.fixedSpellIds)) {
    const previousId = restored.sourceId;
    restored.sourceId = (restored.sourceType || "class")+":"+targetEntryId+(restored.sourceType==="subclass"?":"+restored.subclassId:restored.sourceType!=="class"?":"+previousId:"");
    magic.spellSources = normalizeSpellSources([...(magic.spellSources || []),restored]);
    populateSpellSourceCompatibility(after,magic.spellSources);
  } else {
    magic.classSources ||= {};
    const current = magic.classSources[targetEntryId] || {};
    const merged = {...restored,...current,classEntryId:targetEntryId,classId:target.classId,className:target.className};
    for(const key of ["cantripIds","knownSpellIds","preparedSpellIds","spellbookSpellIds","alwaysPreparedSpellIds","magicalSecretSpellIds"]) merged[key]=unique([...(current[key] || []),...(restored[key] || [])]);
    merged.spellbookAcquisitions={...(restored.spellbookAcquisitions || {}),...(current.spellbookAcquisitions || {})};
    merged.mysticArcanumSpellIds={...(restored.mysticArcanumSpellIds || {}),...(current.mysticArcanumSpellIds || {})};
    magic.classSources[targetEntryId]=merged;
    synchronizeCanonicalSpellSources(after,{fromCompatibility:true});
  }
  const restoredIds = new Set([...(restored.selectedSpellIds || []),...(restored.fixedSpellIds || []),...(restored.knownSpellIds || []),...(restored.preparedSpellIds || []),...(restored.spellbookSpellIds || []),...(restored.cantripIds || [])]);
  for (const spell of magic.customSpells || []) {
    if (!restoredIds.has(spell.id) || ![source.classEntryId,source.classId].filter(Boolean).includes(spell.inactiveClassSourceId)) continue;
    spell.classEntryId=targetEntryId; spell.spellcastingSourceId=targetEntryId; spell.classId=target.classId; delete spell.inactiveClassSourceId;
    const state=restored.spellStates?.[spell.id];
    spell.known=Boolean(state?.known || restored.knownSpellIds?.includes(spell.id) || restored.cantripIds?.includes(spell.id) || restored.spellbookSpellIds?.includes(spell.id));
    spell.prepared=Boolean(state?.prepared || restored.preparedSpellIds?.includes(spell.id));
  }
  Object.assign(magic,getSpellSourceCompatibilityAliases(after));
  after.builder.archivedClassSpellSources.splice(archiveIndex,1);
  return {before:spellRepairFingerprint(character),after,allowed:true,errors:[],description:"Restore "+(source.sourceName || source.className || source.classId || "archived spells")+" to "+(target.className || target.classId),removedSpellIds:[]};
}
export function applySpellRepairPreview(character, preview) {
  if(!preview?.allowed) throw new Error(preview?.errors?.join(" ") || "Review a valid repair preview first.");
  if(spellRepairFingerprint(character)!==preview.before) throw new Error("The character changed. Create a fresh repair preview before applying it.");
  const result = clone(character);
  result.magic = clone(preview.after.magic);
  result.builder ||= {};
  result.builder.archivedClassSpellSources = clone(preview.after.builder?.archivedClassSpellSources || []);
  result.builder.validation ||= {};
  for (const key of ["classChangeReviewWarnings", "unresolvedSpellSourceWarnings"]) result.builder.validation[key] = clone(preview.after.builder?.validation?.[key] || []);
  return result;
}
