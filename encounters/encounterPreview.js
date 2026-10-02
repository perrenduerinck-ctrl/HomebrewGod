import { normalizeEncounter } from "./encounterModel.js";

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);

export function renderEncounterPreview(container, raw = {}) {
  if (!container) return null;
  const encounter = normalizeEncounter({ ...raw, name: raw.name || "Unnamed Encounter" });
  container.innerHTML = `<article class="encounter-preview-card">
    <header><span aria-hidden="true">🎲</span><div><h3>${escapeHtml(encounter.name)}</h3><p>${escapeHtml([encounter.difficulty, encounter.environment].filter(Boolean).join(" · ") || "Prepared encounter")}</p></div></header>
    ${encounter.description ? `<p>${escapeHtml(encounter.description)}</p>` : ""}
    <dl><div><dt>Map</dt><dd>${escapeHtml(encounter.mapRef?.name || "No map")}</dd></div><div><dt>Combatants</dt><dd>${encounter.combatants.length}</dd></div><div><dt>Initiative presets</dt><dd>${encounter.combatants.filter((entry) => entry.initiativePreset != null).length}</dd></div></dl>
    <ol>${encounter.combatants.map((entry) => `<li><strong>${escapeHtml(entry.name)}</strong><span>${escapeHtml(`${entry.assetType === "npc" ? "NPC" : "Monster"} · ${Math.round(entry.x)}%, ${Math.round(entry.y)}% · Elev. ${entry.elevation} ft.${entry.initiativePreset == null ? "" : ` · Init. ${entry.initiativePreset}`}`)}</span></li>`).join("") || `<li class="encounter-empty">No combatants added.</li>`}</ol>
    ${encounter.notes ? `<section><h4>Notes</h4><p>${escapeHtml(encounter.notes)}</p></section>` : ""}
    ${encounter.tags.length ? `<footer>${encounter.tags.map((tag) => `#${escapeHtml(tag)}`).join(" ")}</footer>` : ""}
  </article>`;
  return encounter;
}
