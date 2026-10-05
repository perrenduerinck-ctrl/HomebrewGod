import {
  encounterReferenceFromLibraryRecord,
  normalizeEncounter,
  normalizeEncounterCombatant,
  validateEncounter
} from "./encounterModel.js";
import { renderEncounterPreview } from "./encounterPreview.js";
import { requestAppConfirmation } from "../ui/visualPolish.js";

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);
const newId = () => globalThis.crypto?.randomUUID?.() || `combatant-${Date.now()}-${Math.random().toString(36).slice(2)}`;

function ensureStyles(document) {
  if (document.getElementById("encounterCreatorStyles")) return;
  const link = document.createElement("link");
  link.id = "encounterCreatorStyles";
  link.rel = "stylesheet";
  link.href = new URL("./encounterCreator.css", import.meta.url).href;
  document.head.append(link);
}

export function createEncounterCreator({
  screen,
  persistence,
  onBack = () => {},
  onPublishToWorkshop = () => {},
  onBrowseLibrary = () => {},
  onLoadEncounter = async () => null,
  onCaptureCurrentBattle = async () => ({}),
  listLibraryRecords = async () => [],
  getUserId = () => "",
  getCurrentRoomCode = () => "",
  getCurrentRoomName = () => ""
} = {}) {
  if (!screen || !persistence) throw new Error("Encounter Creator needs a screen and persistence.");
  const document = screen.ownerDocument || globalThis.document;
  ensureStyles(document);
  screen.innerHTML = `
    <section class="box encounter-creator">
      <header class="encounter-header"><div><span class="encounter-eyebrow">HOMEBREW LIBRARY</span><h2>Encounter Creator</h2><p>Reference reusable Monsters, NPCs, and Maps without duplicating their full records.</p></div><button type="button" data-encounter-action="back">Back to Battle Map</button></header>
      <div class="encounter-actions">
        <button type="button" data-encounter-action="new">New Encounter</button>
        <button type="button" data-encounter-action="capture">Capture Current Battle</button>
        <button type="button" class="encounter-primary" data-encounter-action="save">Save to My Library</button>
        <button type="button" data-encounter-action="load">Load Encounter</button>
        <details class="hg-overflow-menu">
          <summary>More</summary>
          <div class="hg-overflow-menu-panel">
            <button type="button" data-encounter-action="duplicate">Duplicate</button>
            <button type="button" data-encounter-action="publish">Publish to Workshop</button>
            <button type="button" data-encounter-action="browse">Open Encounter Library</button>
            <button type="button" data-encounter-action="delete">Delete</button>
          </div>
        </details>
      </div>
      <p class="encounter-status" role="status" data-encounter-status>Encounter Creator ready.</p>
      <div class="encounter-workspace">
        <form class="encounter-editor" data-encounter-form>
          <section class="encounter-panel"><h3>Encounter Details</h3>
            <label>Name<input required maxlength="120" data-encounter-field="name" placeholder="Ambush at Glass Harbor"></label>
            <div class="encounter-row"><label>Difficulty<input maxlength="60" data-encounter-field="difficulty" placeholder="Hard"></label><label>Environment<input maxlength="2000" data-encounter-field="environment" placeholder="Moonlit docks"></label></div>
            <label>Description<textarea rows="4" maxlength="5000" data-encounter-field="description"></textarea></label>
            <label>Tags<input maxlength="1000" data-encounter-field="tags" placeholder="harbor, undead, level-5"></label>
          </section>
          <section class="encounter-panel"><div class="encounter-section-heading"><div><h3>Map Reference</h3><p>The map stays independent in its original Library.</p></div><button type="button" data-encounter-action="clear-map">Clear Map</button></div>
            <label>Choose Map<select data-encounter-map-select><option value="">No map</option></select></label>
            <p class="encounter-reference" data-encounter-map-reference>No map selected.</p>
          </section>
          <section class="encounter-panel"><div class="encounter-section-heading"><div><h3>Combatants & Starting Positions</h3><p>Add multiple placements of the same Monster or NPC when needed.</p></div></div>
            <div class="encounter-picker"><label>Library Monster / NPC<select data-encounter-combatant-select><option value="">Choose content</option></select></label><button type="button" data-encounter-action="add-combatant">+ Add Combatant</button></div>
            <div data-encounter-combatants></div>
          </section>
          <section class="encounter-panel"><h3>Battle Notes</h3><label>DM Notes<textarea rows="8" maxlength="12000" data-encounter-field="notes"></textarea></label></section>
        </form>
        <aside class="encounter-sidebar">
          <section class="encounter-panel"><h3>Live Encounter Preview</h3><div data-encounter-preview></div></section>
          <section class="encounter-panel"><div class="encounter-section-heading"><h3>My Encounters</h3><button type="button" data-encounter-action="refresh">Refresh</button></div>
            <label>Search<input type="search" data-encounter-search placeholder="Name, tags, environment"></label>
            <div class="encounter-library" data-encounter-library></div>
          </section>
        </aside>
      </div>
    </section>`;

  const field = (name) => screen.querySelector(`[data-encounter-field="${name}"]`);
  const statusRoot = screen.querySelector("[data-encounter-status]");
  const form = screen.querySelector("[data-encounter-form]");
  const previewRoot = screen.querySelector("[data-encounter-preview]");
  const mapSelect = screen.querySelector("[data-encounter-map-select]");
  const combatantSelect = screen.querySelector("[data-encounter-combatant-select]");
  const mapReferenceRoot = screen.querySelector("[data-encounter-map-reference]");
  const combatantsRoot = screen.querySelector("[data-encounter-combatants]");
  const libraryRoot = screen.querySelector("[data-encounter-library]");
  const searchInput = screen.querySelector("[data-encounter-search]");
  const listeners = [];
  let selectedId = "";
  let createdAtMillis = 0;
  let mapRef = null;
  let combatants = [];
  let records = [];
  let libraryRecords = [];
  let provenance = {};
  let busy = false;

  const on = (element, event, handler) => {
    element?.addEventListener(event, handler);
    if (element) listeners.push(() => element.removeEventListener(event, handler));
  };
  const setStatus = (message) => { statusRoot.textContent = message; };
  const setBusy = (value) => {
    busy = value;
    for (const button of screen.querySelectorAll("button")) button.disabled = value;
  };

  function rawDraft() {
    return {
      id: selectedId,
      createdAtMillis,
      name: field("name").value,
      description: field("description").value,
      difficulty: field("difficulty").value,
      environment: field("environment").value,
      notes: field("notes").value,
      tags: field("tags").value,
      roomCode: getCurrentRoomCode(),
      roomName: getCurrentRoomName(),
      mapRef: mapRef ? { ...mapRef } : null,
      combatants: combatants.map((entry) => ({ ...entry })),
      ...provenance
    };
  }

  function renderPreview() { renderEncounterPreview(previewRoot, rawDraft()); }

  function renderMapReference() {
    mapReferenceRoot.textContent = mapRef
      ? `${mapRef.name} · ${mapRef.sourceRoomName || mapRef.sourceRoomCode || "Personal source"} · ${mapRef.libraryId}`
      : "No map selected.";
  }

  function renderCombatants() {
    combatantsRoot.innerHTML = combatants.length ? combatants.map((entry, index) => `<details class="encounter-entry" data-encounter-combatant-index="${index}" open>
      <summary><strong>${escapeHtml(entry.name)}</strong><span>${entry.assetType === "npc" ? "NPC" : "Monster"}</span></summary>
      <div class="encounter-entry-actions"><button type="button" data-combatant-action="up" ${index === 0 ? "disabled" : ""}>↑</button><button type="button" data-combatant-action="down" ${index === combatants.length - 1 ? "disabled" : ""}>↓</button><button type="button" data-combatant-action="duplicate">Duplicate</button><button type="button" data-combatant-action="delete">Delete</button></div>
      <p class="encounter-reference">${escapeHtml(entry.libraryId)}${entry.sourceRoomName || entry.sourceRoomCode ? ` · ${escapeHtml(entry.sourceRoomName || entry.sourceRoomCode)}` : ""}</p>
      <div class="encounter-row"><label>X Position %<input type="number" min="0" max="100" step="0.1" data-combatant-field="x" value="${entry.x}"></label><label>Y Position %<input type="number" min="0" max="100" step="0.1" data-combatant-field="y" value="${entry.y}"></label></div>
      <div class="encounter-row"><label>Elevation (ft.)<input type="number" min="-1000" max="1000" data-combatant-field="elevation" value="${entry.elevation}"></label><label>Initiative Preset<input type="number" min="-999" max="999" data-combatant-field="initiativePreset" value="${entry.initiativePreset ?? ""}" placeholder="Optional"></label></div>
    </details>`).join("") : `<p class="encounter-empty">No combatants added.</p>`;
  }

  function renderLibraryOptions() {
    const maps = libraryRecords.filter((record) => record.assetType === "map");
    const combatantSources = libraryRecords.filter((record) => ["monster", "npc"].includes(record.assetType));
    mapSelect.innerHTML = `<option value="">No map</option>${maps.map((record) => `<option value="${escapeHtml(record.libraryId)}">${escapeHtml(record.name)}${record.sourceRoomName || record.sourceRoomCode ? ` — ${escapeHtml(record.sourceRoomName || record.sourceRoomCode)}` : ""}</option>`).join("")}`;
    combatantSelect.innerHTML = `<option value="">Choose content</option>${combatantSources.map((record) => `<option value="${escapeHtml(record.libraryId)}">${record.assetType === "npc" ? "NPC" : "Monster"} — ${escapeHtml(record.name)}</option>`).join("")}`;
    mapSelect.value = mapRef?.libraryId || "";
  }

  function renderLibrary() {
    const search = searchInput.value.trim().toLowerCase();
    const shown = records.filter((encounter) => !search || [encounter.name, encounter.description, encounter.environment, ...encounter.tags].join(" ").toLowerCase().includes(search));
    libraryRoot.innerHTML = shown.length ? shown.map((encounter) => `<button type="button" data-library-encounter-id="${escapeHtml(encounter.id)}" class="${encounter.id === selectedId ? "selected" : ""}"><span aria-hidden="true">🎲</span><span><strong>${escapeHtml(encounter.name)}</strong><small>${escapeHtml([encounter.difficulty, `${encounter.combatants.length} combatant${encounter.combatants.length === 1 ? "" : "s"}`, encounter.mapRef?.name].filter(Boolean).join(" · "))}</small></span></button>`).join("") : `<p class="encounter-empty">No encounters match this search.</p>`;
  }

  function applyEncounter(raw = {}) {
    const encounter = normalizeEncounter(raw);
    selectedId = raw.id ? encounter.id : "";
    createdAtMillis = raw.id ? encounter.createdAtMillis : 0;
    mapRef = encounter.mapRef ? { ...encounter.mapRef } : null;
    combatants = encounter.combatants.map((entry) => ({ ...entry }));
    provenance = {
      sourceWorkshopAssetId: encounter.sourceWorkshopAssetId,
      sourceWorkshopVersion: encounter.sourceWorkshopVersion,
      sourceAuthorUid: encounter.sourceAuthorUid,
      copiedFromLibraryId: encounter.copiedFromLibraryId,
      copiedFromEncounterId: encounter.copiedFromEncounterId
    };
    for (const name of ["name", "description", "difficulty", "environment", "notes"]) field(name).value = raw[name] ?? encounter[name] ?? "";
    field("tags").value = encounter.tags.join(", ");
    renderMapReference(); renderCombatants(); renderLibraryOptions(); renderPreview(); renderLibrary();
  }

  async function refreshSources() {
    try {
      libraryRecords = (await listLibraryRecords()).filter((record) => ["monster", "npc", "map"].includes(record.assetType));
      renderLibraryOptions();
      return libraryRecords;
    } catch (error) {
      setStatus(`Reusable content could not load: ${error.message}`);
      libraryRecords = [];
      renderLibraryOptions();
      return [];
    }
  }

  async function refresh() {
    try {
      [records] = await Promise.all([persistence.list(), refreshSources()]);
      renderLibrary();
      return records;
    } catch (error) {
      records = [];
      renderLibrary();
      setStatus(`Encounter Library could not load: ${error.message}`);
      return [];
    }
  }

  async function save() {
    if (busy) return null;
    const draft = rawDraft();
    const errors = validateEncounter(draft);
    if (errors.length) { setStatus(errors.join(" ")); return null; }
    setBusy(true); setStatus("Saving to My Library…");
    try {
      const saved = await persistence.save(draft);
      applyEncounter(saved); await refresh(); setStatus(`${saved.name} saved to My Library.`); return saved;
    } catch (error) { setStatus(`Encounter could not be saved: ${error.message}`); return null; }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!selectedId) { setStatus("Select a saved encounter to delete."); return false; }
    if (!await requestAppConfirmation("Delete this encounter from My Library? Referenced content will not be deleted.", { title: "Delete encounter", confirmLabel: "Delete" })) return false;
    setBusy(true);
    try { await persistence.remove(selectedId); applyEncounter({}); await refresh(); setStatus("Encounter deleted. Referenced content was left unchanged."); return true; }
    catch (error) { setStatus(`Encounter could not be deleted: ${error.message}`); return false; }
    finally { setBusy(false); }
  }

  function duplicate() {
    const draft = rawDraft();
    applyEncounter({ ...draft, id: "", createdAtMillis: 0, name: `${draft.name || "Encounter"} Copy`, copiedFromEncounterId: selectedId, copiedFromLibraryId: selectedId ? `encounter:${selectedId}` : "" });
    setStatus("Independent copy ready. Save it to add it to My Library.");
  }

  function publish() {
    if (!selectedId) { setStatus("Save the encounter before publishing it."); return null; }
    const content = normalizeEncounter(rawDraft());
    const request = { assetType: "encounter", sourceRecordId: selectedId, sourceScope: `user:${String(getUserId() || "")}`, name: content.name, description: content.description, tags: content.tags, content };
    onPublishToWorkshop(request);
    return request;
  }

  async function load() {
    const encounter = selectedId ? normalizeEncounter(rawDraft()) : await save();
    if (!encounter) return null;
    setBusy(true); setStatus("Resolving encounter references…");
    try {
      const result = await onLoadEncounter(encounter);
      setStatus(result?.cancelled ? "Encounter load cancelled. The current battle was not changed." : result?.message || `${encounter.name} loaded on the Battle Map.`);
      return result;
    } catch (error) { setStatus(`Encounter could not be loaded: ${error.message}`); return null; }
    finally { setBusy(false); }
  }

  async function capture() {
    setBusy(true); setStatus("Capturing current battle references…");
    try {
      const captured = await onCaptureCurrentBattle();
      applyEncounter({ ...rawDraft(), ...captured, id: selectedId, createdAtMillis });
      setStatus("Current map, positions, elevation, and initiative values captured. Save to keep this encounter.");
    } catch (error) { setStatus(`Current battle could not be captured: ${error.message}`); }
    finally { setBusy(false); }
  }

  function updateCombatant(input) {
    const root = input.closest("[data-encounter-combatant-index]");
    const index = Number(root?.dataset.encounterCombatantIndex);
    const key = input.dataset.combatantField;
    if (!Number.isInteger(index) || !combatants[index] || !key) return;
    const value = key === "initiativePreset" && input.value === "" ? null : Number(input.value);
    combatants[index] = { ...normalizeEncounterCombatant({ ...combatants[index], [key]: value }, index) };
    renderPreview();
  }

  function combatantAction(button) {
    const root = button.closest("[data-encounter-combatant-index]");
    const index = Number(root?.dataset.encounterCombatantIndex);
    const action = button.dataset.combatantAction;
    if (!Number.isInteger(index) || !combatants[index]) return;
    if (action === "delete") combatants.splice(index, 1);
    if (action === "duplicate") combatants.splice(index + 1, 0, { ...combatants[index], id: newId(), name: `${combatants[index].name} Copy` });
    if (action === "up" && index > 0) [combatants[index - 1], combatants[index]] = [combatants[index], combatants[index - 1]];
    if (action === "down" && index < combatants.length - 1) [combatants[index + 1], combatants[index]] = [combatants[index], combatants[index + 1]];
    renderCombatants(); renderPreview();
  }

  on(form, "input", (event) => {
    if (event.target.matches("[data-combatant-field]")) updateCombatant(event.target);
    else renderPreview();
  });
  on(mapSelect, "change", () => {
    const record = libraryRecords.find((entry) => entry.libraryId === mapSelect.value);
    mapRef = record ? { ...encounterReferenceFromLibraryRecord(record) } : null;
    renderMapReference(); renderPreview();
  });
  on(searchInput, "input", renderLibrary);
  on(combatantsRoot, "click", (event) => { const button = event.target.closest("[data-combatant-action]"); if (button) combatantAction(button); });
  on(libraryRoot, "click", async (event) => {
    const button = event.target.closest("[data-library-encounter-id]");
    if (!button) return;
    try { applyEncounter(await persistence.load(button.dataset.libraryEncounterId)); setStatus("Saved encounter loaded."); }
    catch (error) { setStatus(error.message); }
  });
  on(screen, "click", (event) => {
    const button = event.target.closest("[data-encounter-action]");
    if (!button) return;
    const action = button.dataset.encounterAction;
    if (action === "back") onBack();
    if (action === "new") { applyEncounter({}); setStatus("New encounter ready."); }
    if (action === "capture") void capture();
    if (action === "save") void save();
    if (action === "duplicate") duplicate();
    if (action === "delete") void remove();
    if (action === "load") void load();
    if (action === "publish") publish();
    if (action === "browse") onBrowseLibrary({ assetType: "encounter", tab: "library" });
    if (action === "refresh") void refresh();
    if (action === "clear-map") { mapRef = null; mapSelect.value = ""; renderMapReference(); renderPreview(); }
    if (action === "add-combatant") {
      const record = libraryRecords.find((entry) => entry.libraryId === combatantSelect.value);
      if (!record) { setStatus("Choose a Monster or NPC from My Library first."); return; }
      combatants.push({ ...encounterReferenceFromLibraryRecord(record, { id: newId(), x: 50, y: 50, elevation: 0 }) });
      renderCombatants(); renderPreview(); setStatus(`${record.name} added. Set its starting position.`);
    }
  });

  applyEncounter({});
  void refresh();
  return Object.freeze({
    refresh, save, remove, load, getDraft: rawDraft,
    openEncounter(encounter, { duplicate: makeCopy = false } = {}) {
      applyEncounter(makeCopy ? { ...encounter, id: "", createdAtMillis: 0, name: `${encounter?.name || "Encounter"} Copy`, copiedFromEncounterId: encounter?.id || "" } : encounter);
      setStatus(makeCopy ? "Independent copy opened. Save it to My Library." : "Encounter opened.");
    },
    destroy() { listeners.forEach((removeListener) => removeListener()); }
  });
}
