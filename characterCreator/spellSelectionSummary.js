import { getSpellbookProgress } from "./spellbookProgression.js";
// Class-owned choices stay separate from automatic grants and other classes.
const ids = (values) => [...new Set((Array.isArray(values) ? values : []).filter(Boolean))];
export function getManualPreparedSpellIds(source = {}) {
  const automatic = new Set(ids(source.alwaysPreparedSpellIds));
  return ids(source.preparedSpellIds).filter((id) => !automatic.has(id));
}
export function renderClassSpellChoices(entries, resolveSpell, escapeHtml) {
  const names = (values) => ids(values).map((id) => resolveSpell(id)?.name || id).map(escapeHtml).join(", ");
  return (entries || []).map((entry) => {
    const automatic = ids(entry.alwaysPreparedSpellIds);
    const expanded = ids(entry.expandedSpellIds).filter((id) => !automatic.includes(id));
    const mode = entry.preparationMode;
    const progress = entry.classId === "wizard" && mode === "spellbook-prepared" ? getSpellbookProgress(entry, resolveSpell) : null;
    const description = mode === "prepared"
      ? "Choose spells to prepare from this class’s spell list. You do not need to learn them separately."
      : mode === "spellbook-prepared"
        ? "Add spells to your spellbook, then prepare the ones you want ready."
        : "Learn spells for this class. Learned spells are ready without a separate preparation step.";
    return `<article class="hg-character-current-choice" data-cc-class-spell-choices="${escapeHtml(entry.classEntryId)}">
      <h3>${escapeHtml(entry.className)} spell choices</h3><p>${description}</p>
      <p>Cantrips chosen: ${ids(entry.cantripIds).length} / ${Number(entry.cantripsKnownLimit) || 0}.
      ${mode === "known" ? `Spells learned: ${ids(entry.knownSpellIds).length} / ${Number(entry.spellsKnownLimit) || 0}.` : ""}
      ${mode === "spellbook-prepared" ? `Spells in spellbook: ${ids(entry.spellbookSpellIds).length}.` : ""}
      ${mode !== "known" ? `Prepared choices: ${getManualPreparedSpellIds(entry).length} / ${Number(entry.preparedLimit) || 0}.` : ""}</p>
      ${progress ? `<details data-cc-spellbook-progress><summary>Wizard spellbook progression: ${6 + 2 * (progress.level - 1) - progress.remaining} / ${6 + 2 * (progress.level - 1)} free choices recorded</summary>
        <p>Starting Wizard level: six 1st-level spells. Each later Wizard level: two free spells eligible at that Wizard level. Copied/found spells are separate and do not use those free choices.</p>
        <ul>${progress.buckets.map((bucket) => `<li>Wizard level ${bucket.classLevel}: ${bucket.selected} / ${bucket.maximum} free choices.</li>`).join("")}</ul>
        <p>Copied/found spells: ${progress.copied.length}. Unreviewed entries: ${progress.unclassified.length}.</p>
        <ul>${progress.book.map((id) => {const value=progress.acquisitions[id]; const spell=resolveSpell(id); return `<li>${escapeHtml(spell?.name || id)} <label>Acquired through <select data-cc-spellbook-history="${escapeHtml(id)}" data-class-entry-id="${escapeHtml(entry.classEntryId)}"><option value="" disabled ${value ? "" : "selected"}>Unreviewed acquisition</option>${progress.buckets.filter((bucket)=>Number(spell?.level)<=Math.min(9,Math.ceil(bucket.classLevel/2))).map((bucket)=>`<option value="level:${bucket.classLevel}" ${value?.kind==="level" && value.classLevel===bucket.classLevel?"selected":""}>Wizard level ${bucket.classLevel}: free choice</option>`).join("")}<option value="copied" ${value?.kind==="copied"?"selected":""}>Copied / found spell</option></select></label></li>`; }).join("")}</ul>
        ${progress.unclassified.length ? `<section data-cc-spellbook-history-preview><b>Proposed history for older entries (review before applying)</b><ul>${Object.entries(progress.proposals).map(([id,value])=>`<li>${escapeHtml(resolveSpell(id)?.name || id)}: ${value.kind==="level"?"free choice at Wizard level "+value.classLevel:"copied/found"}</li>`).join("")}</ul><button type="button" data-cc-action="confirm-spellbook-history" data-class-entry-id="${escapeHtml(entry.classEntryId)}">Confirm proposed spellbook history</button></section>` : ""}
      </details>` : ""}
      ${automatic.length ? `<p><b>Automatically prepared from ${escapeHtml(entry.subclassName || entry.className)}:</b> ${names(automatic)}. These do not use your prepared choices.</p>` : ""}
      ${expanded.length ? `<details><summary>Additional spells available to choose</summary><p>${names(expanded)}. These are extra options on this class’s spell list; choose or prepare them normally.</p></details>` : ""}
    </article>`;
  }).join("");
}

export function getSpellChoiceActions(mode = "known", level = 0, cantripLimit = Infinity) {
  const cantrip = Number(level) === 0;
  return {
    canLearn: cantrip ? Number(cantripLimit) > 0 : mode !== "prepared",
    noLearningLabel: cantrip && Number(cantripLimit) <= 0 ? "This class has no cantrip choices" : "No separate learning step for this class",
    canPrepare: !cantrip && mode !== "known",
    learnLabel: cantrip ? "Learn cantrip" : mode === "spellbook-prepared" ? "Add to spellbook" : "Learn spell"
  };
}
