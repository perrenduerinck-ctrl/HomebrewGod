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
