// Read-only explanations of spell ownership; never add spells or change choices.
const ids = (values) => [...new Set((Array.isArray(values) ? values : []).filter(Boolean))];
export function createSpellOriginIndex(sources = [], classes = []) {
  const index = new Map();
  const byClass = new Map(classes.map((entry) => [entry.classEntryId, entry]));
  const add = (id, origin) => { const list = index.get(id) || []; if (!list.some((entry) => entry.sourceId === origin.sourceId)) list.push(origin); index.set(id, list); };
  for (const source of sources) {
    const owner = byClass.get(source.classEntryId);
    const label = source.sourceName || source.sourceFeatureName || owner?.className || source.sourceType || "Unassigned source";
    for (const id of ids([...(source.selectedSpellIds || []), ...(source.fixedSpellIds || [])])) {
      if (source.sourceType === "subclass" && Array.isArray(owner?.alwaysPreparedSpellIds) && !owner.alwaysPreparedSpellIds.includes(id)) continue;
      const state = source.spellStates?.[id] || {};
      let explanation;
      if (source.sourceType === "class" && !source.classEntryId) {
        explanation = "Imported spell without an assigned class source. Choose its class source in Spells / Features before counting it as a class choice.";
      } else if (source.sourceType === "class") {
        const name = owner?.className || label;
        const automatic = owner?.alwaysPreparedSpellIds?.includes(id);
        explanation = state.cantrip ? "Chosen cantrip. Uses one " + name + " cantrip choice."
          : state.spellbook ? "In the " + name + " spellbook. " + (state.prepared ? "Prepared; uses one prepared choice." : "Not prepared; uses no prepared choice.")
          : state.prepared ? "Prepared for " + name + ". " + (automatic ? "Also granted automatically; uses no prepared choice." : "Uses one " + name + " prepared choice.")
          : "Learned for " + name + "; uses one learned-spell choice. No separate preparation step.";
      } else if (source.sourceType === "subclass" || source.alwaysPrepared || state.alwaysPrepared) {
        explanation = "Granted automatically and always prepared. Does not use a manual class prepared choice.";
      } else if (source.sourceType === "custom-spell") {
        explanation = "Custom spell record. Its class source determines learning and preparation.";
      } else {
        explanation = "Chosen or granted through this " + (source.sourceType || "spell source").replaceAll("-", " ") + ". Tracked separately from ordinary class spell choices.";
      }
      add(id, { sourceId: source.sourceId, classEntryId: source.classEntryId, kind: source.sourceType, label, explanation, owned: true });
    }
  }
  // Automatic grants can be calculated while rendering, before canonical persistence is refreshed.
  for (const entry of classes) for (const id of ids(entry.alwaysPreparedSpellIds)) {
    if (index.get(id)?.some((origin) => origin.kind === "subclass" && origin.classEntryId === entry.classEntryId)) continue;
    add(id, { sourceId: "automatic:" + entry.classEntryId, classEntryId: entry.classEntryId, kind: "subclass", label: (entry.className || "Class") + " — " + (entry.subclassName || "automatic spell grant"), explanation: "Granted automatically and always prepared. Does not use a manual class prepared choice.", owned: true });
  }
  for (const entry of classes) for (const id of ids(entry.expandedSpellIds)) {
    if (entry.alwaysPreparedSpellIds?.includes(id)) continue;
    add(id, { sourceId: "available:" + entry.classEntryId, label: (entry.subclassName || entry.className) + " expanded spell list",
      explanation: "An extra option for " + entry.className + ". It is not granted automatically; learn or prepare it using that class’s normal choices.", owned: false });
  }
  return index;
}
export function renderSpellOriginDetails(origins = [], escapeHtml, candidateName = "") {
  const entries = origins.length ? origins : [{label: candidateName || "Spell catalogue", explanation: "Available to choose; not currently learned, prepared, or granted by a recorded source.", owned:false}];
  return `<details class="hg-spell-provenance" data-spell-provenance><summary>${entries.some((entry) => entry.owned) ? "Why do I have this spell?" : "Why is this spell available?"}</summary><ul>${entries.map((entry) => `<li><b>${escapeHtml(entry.label)}:</b> ${escapeHtml(entry.explanation)}</li>`).join("")}</ul></details>`;
}
