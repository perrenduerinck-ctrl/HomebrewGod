const ids = (values) => [...new Set((Array.isArray(values) ? values : []).filter((id) => typeof id === "string" && id))];
export function normalizeSpellbookAcquisitions(raw = {}) {
  const result = Object.create(null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return result;
  for (const [id, value] of Object.entries(raw).slice(0,2048)) {
    if (value?.kind === "copied") result[id] = { kind:"copied" };
    else if (value?.kind === "level" && Number.isInteger(Number(value.classLevel)) && Number(value.classLevel)>=1 && Number(value.classLevel)<=20) result[id] = { kind:"level", classLevel:Number(value.classLevel) };
  }
  return result;
}
export function getSpellbookProgress(entry = {}, resolveSpell = () => null) {
  const level = Math.max(1,Math.min(20,Math.round(Number(entry.classLevel ?? entry.level) || 1)));
  const book = ids(entry.spellbookSpellIds);
  const acquisitions = normalizeSpellbookAcquisitions(entry.spellbookAcquisitions);
  const enabled = String(entry.classId || "").toLowerCase() === "wizard";
  const buckets = (enabled ? Array.from({length:level},(_,i)=>({classLevel:i+1,maximum:i===0?6:2,selected:0,spellIds:[]})) : []);
  const errors = [], unclassified = [], copied = [];
  for (const id of book) {
    const spell = resolveSpell(id), acquired = acquisitions[id];
    if (!acquired) { unclassified.push(id); continue; }
    if (acquired.kind === "copied") { copied.push(id); continue; }
    const bucket = buckets[acquired.classLevel-1];
    if (!bucket || !spell || Number(spell.level)<1 || Number(spell.level)>Math.min(9,Math.ceil(acquired.classLevel/2))) {
      errors.push((spell?.name || id)+" has an invalid Wizard level-up acquisition. Review its spellbook history."); continue;
    }
    bucket.selected++; bucket.spellIds.push(id);
  }
  for (const bucket of buckets) if(bucket.selected>bucket.maximum) errors.push("Wizard level "+bucket.classLevel+" has too many free spellbook choices ("+bucket.selected+"/"+bucket.maximum+"). Reclassify extra found/copied spells instead of deleting them.");
  const proposals = Object.create(null);
  const proposedCounts = buckets.map((b)=>b.selected);
  // Read-only suggestion: lower-level existing spells fill the earliest legal free choices.
  for (const id of unclassified.slice().sort((a,b)=>(Number(resolveSpell(a)?.level)||99)-(Number(resolveSpell(b)?.level)||99)||a.localeCompare(b))) {
    const spellLevel = Number(resolveSpell(id)?.level);
    const index = buckets.findIndex((b,i)=>spellLevel>=1 && spellLevel<=Math.min(9,Math.ceil(b.classLevel/2)) && proposedCounts[i]<b.maximum);
    proposals[id] = index<0 ? {kind:"copied"} : {kind:"level",classLevel:index+1};
    if(index>=0) proposedCounts[index]++;
  }
  return {level,book,acquisitions,buckets,errors,unclassified,copied,proposals,remaining:buckets.reduce((n,b)=>n+Math.max(0,b.maximum-b.selected),0)};
}
export function chooseSpellbookAcquisition(entry, spell, requested, resolveSpell) {
  const progress = getSpellbookProgress(entry,resolveSpell);
  if (requested === "copied") return {kind:"copied"};
  const target = requested?.startsWith("level:") ? Number(requested.slice(6)) : null;
  const bucket = progress.buckets.find((b)=>(target===null || b.classLevel===target) && b.selected<b.maximum && Number(spell?.level)>=1 && Number(spell.level)<=Math.ceil(b.classLevel/2));
  if (!bucket && target!==null) throw new Error("That Wizard level has no eligible free spellbook choice remaining. Choose another eligible level or mark this as copied/found.");
  return bucket ? {kind:"level",classLevel:bucket.classLevel} : {kind:"copied"};
}
