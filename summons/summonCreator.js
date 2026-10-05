import {
  duplicateSummonPreset,
  normalizeSummonPreset,
  normalizeSummonSource,
  summonPresetAutomation
} from "./summonPresetModel.js";

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);

function ensureStyles(document) {
  if (document.getElementById("summonCreatorStyles")) return;
  const link = document.createElement("link");
  link.id = "summonCreatorStyles";
  link.rel = "stylesheet";
  link.href = new URL("./summonCreator.css", import.meta.url).href;
  document.head.append(link);
}

export function createSummonCreator({
  screen,
  persistence,
  onBack = () => {},
  onPublishToWorkshop = () => {},
  onBrowseLibrary = () => {},
  onUsePreset = async () => null,
  listLibraryRecords = async () => [],
  loadLibraryRecord = async (record) => ({ ...record, content: {} }),
  getUserId = () => ""
} = {}) {
  if (!screen || !persistence) throw new Error("Summon Creator needs a screen and persistence.");
  const document = screen.ownerDocument || globalThis.document;
  ensureStyles(document);
  screen.innerHTML = `<section class="box summon-creator">
    <header class="summon-header"><div><span class="summon-eyebrow">HOMEBREW LIBRARY</span><h2>Summon Presets</h2><p>Save reusable token sources, placement, ownership, initiative, duration, and dismissal behavior. The existing summon runtime remains authoritative.</p></div><button type="button" data-summon-creator-action="back">Back to Battle Map</button></header>
    <div class="summon-actions">
      <button type="button" data-summon-creator-action="new">New Preset</button>
      <button type="button" class="summon-primary" data-summon-creator-action="save">Save to My Library</button>
      <button type="button" data-summon-creator-action="use">Use in Spell / Ability</button>
      <details class="hg-overflow-menu">
        <summary>More</summary>
        <div class="hg-overflow-menu-panel">
          <button type="button" data-summon-creator-action="duplicate">Duplicate</button>
          <button type="button" data-summon-creator-action="publish">Publish to Workshop</button>
          <button type="button" data-summon-creator-action="browse">Open Summon Library</button>
          <button type="button" data-summon-creator-action="delete">Delete</button>
        </div>
      </details>
    </div>
    <p class="summon-status" role="status" data-summon-creator-status>Summon presets ready.</p>
    <div class="summon-workspace">
      <form class="summon-editor" data-summon-creator-form>
        <section class="summon-panel"><h3>Preset</h3>
          <label>Name<input required maxlength="120" data-summon-creator-field="name" placeholder="Conjure Forest Wolves"></label>
          <label>Description<textarea rows="3" maxlength="2000" data-summon-creator-field="description"></textarea></label>
          <label>Tags<input maxlength="1000" data-summon-creator-field="tags" placeholder="beast, forest, concentration"></label>
        </section>
        <section class="summon-panel"><h3>Summoned Token Source</h3>
          <p class="summon-help">Sources come from the Unified Library. Cross-campaign Monsters are copied safely into the current room when used.</p>
          <label>Monster / NPC<select data-summon-creator-source><option value="">Choose from My Library</option></select></label>
          <p class="summon-reference" data-summon-creator-source-summary>No source selected.</p>
        </section>
        <section class="summon-panel"><h3>Spawn</h3>
          <div class="summon-grid">
            <label>Count<input type="number" min="1" max="20" value="1" data-summon-creator-field="count"></label>
            <label>Location<select data-summon-creator-field="placementMode"><option value="target">At Target</option><option value="caster">At Caster</option><option value="around-target">Around Target</option><option value="around-caster">Around Caster</option><option value="manual">User Places</option></select></label>
            <label>Radius (squares)<input type="number" min="0" max="100" value="1" data-summon-creator-field="radius"></label>
            <label>Spawn Timing<select data-summon-creator-field="spawnTiming"><option value="start">Animation Start</option><option value="event">Animation Event</option><option value="end">Animation End</option></select></label>
            <label data-summon-creator-event-row>Event Name<input maxlength="80" value="impact" data-summon-creator-field="eventName"></label>
            <label>Summon Animation ID<input maxlength="180" data-summon-creator-field="summonAnimationId" placeholder="Optional"></label>
          </div>
          <div class="summon-checks"><label><input type="checkbox" checked data-summon-creator-field="preventOverlap"> Prevent overlap</label><label><input type="checkbox" checked data-summon-creator-field="nearestFree"> Find nearest free space</label><label><input type="checkbox" checked data-summon-creator-field="allowDmOverride"> Allow DM override</label></div>
        </section>
        <section class="summon-panel"><h3>Control & Initiative</h3>
          <div class="summon-grid">
            <label>Ownership<select data-summon-creator-field="ownershipMode"><option value="dm">DM Controlled</option><option value="caster">Caster Controlled</option><option value="player">Specific Player</option></select></label>
            <label data-summon-creator-player-row>Player UID<input maxlength="180" data-summon-creator-field="playerUid" placeholder="Player account ID"></label>
            <label>Initiative<select data-summon-creator-field="initiativeMode"><option value="after-caster">Immediately after caster</option><option value="roll">Roll initiative</option><option value="shared">Shared initiative</option><option value="none">Do not add automatically</option></select></label>
          </div>
        </section>
        <section class="summon-panel"><h3>Duration & End</h3>
          <div class="summon-grid">
            <label>Duration<select data-summon-creator-field="durationMode"><option value="permanent">Permanent</option><option value="dismissed">Manual Dismiss</option><option value="rounds">Rounds</option><option value="turns">Turns</option><option value="world-time">World Time</option><option value="concentration">Concentration Linked</option></select></label>
            <label data-summon-creator-duration-value-row>Amount<input type="number" min="1" max="1000000" value="1" data-summon-creator-field="durationValue"></label>
            <label data-summon-creator-duration-unit-row>World-time unit<select data-summon-creator-field="durationUnit"><option value="seconds">Seconds</option><option value="minutes">Minutes</option><option value="hours">Hours</option></select></label>
            <label>On End<select data-summon-creator-field="endMode"><option value="remove">Disappear</option><option value="dismiss">Play animation then delete</option><option value="leave">Leave token</option></select></label>
            <label data-summon-creator-end-animation-row>Dismiss Animation ID<input maxlength="180" data-summon-creator-field="endAnimationId"></label>
          </div>
        </section>
      </form>
      <aside class="summon-sidebar">
        <section class="summon-panel"><h3>Live Preview</h3><div data-summon-creator-preview></div></section>
        <section class="summon-panel"><div class="summon-section-heading"><h3>My Summons</h3><button type="button" data-summon-creator-action="refresh">Refresh</button></div><label>Search<input type="search" data-summon-creator-search placeholder="Name, source, tags"></label><div class="summon-library" data-summon-creator-library></div></section>
      </aside>
    </div>
  </section>`;

  const field = (name) => screen.querySelector(`[data-summon-creator-field="${name}"]`);
  const sourceSelect = screen.querySelector("[data-summon-creator-source]");
  const sourceSummary = screen.querySelector("[data-summon-creator-source-summary]");
  const statusRoot = screen.querySelector("[data-summon-creator-status]");
  const previewRoot = screen.querySelector("[data-summon-creator-preview]");
  const libraryRoot = screen.querySelector("[data-summon-creator-library]");
  const searchInput = screen.querySelector("[data-summon-creator-search]");
  const form = screen.querySelector("[data-summon-creator-form]");
  const listeners = [];
  let selectedId = "";
  let createdAtMillis = 0;
  let source = null;
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
    const placementMode = field("placementMode").value;
    return {
      id: selectedId,
      createdAtMillis,
      name: field("name").value,
      description: field("description").value,
      tags: field("tags").value,
      sourceLibraryId: source?.libraryId || "",
      source: source ? { ...source } : {},
      count: field("count").value,
      placement: {
        mode: placementMode,
        radius: field("radius").value,
        userPlaces: placementMode === "manual",
        preventOverlap: field("preventOverlap").checked,
        nearestFree: field("nearestFree").checked,
        allowDmOverride: field("allowDmOverride").checked
      },
      ownership: { mode: field("ownershipMode").value, playerUid: field("playerUid").value },
      initiative: { mode: field("initiativeMode").value },
      duration: { mode: field("durationMode").value, value: field("durationValue").value, unit: field("durationUnit").value },
      endBehavior: { mode: field("endMode").value, animationId: field("endAnimationId").value },
      spawnTiming: field("spawnTiming").value,
      eventName: field("eventName").value,
      summonAnimationId: field("summonAnimationId").value,
      ...provenance
    };
  }

  function syncConditionalFields() {
    screen.querySelector("[data-summon-creator-player-row]").hidden = field("ownershipMode").value !== "player";
    screen.querySelector("[data-summon-creator-event-row]").hidden = field("spawnTiming").value !== "event";
    screen.querySelector("[data-summon-creator-duration-value-row]").hidden = !["rounds", "turns", "world-time"].includes(field("durationMode").value);
    screen.querySelector("[data-summon-creator-duration-unit-row]").hidden = field("durationMode").value !== "world-time";
    screen.querySelector("[data-summon-creator-end-animation-row]").hidden = field("endMode").value !== "dismiss";
  }

  function renderSourceSummary() {
    sourceSummary.textContent = source
      ? `${source.name} · ${source.assetType.toUpperCase()} · ${source.sourceRoomName || source.sourceRoomCode || "Personal"}`
      : "No source selected.";
  }

  function renderPreview() {
    const preset = normalizeSummonPreset(rawDraft());
    const duration = preset.duration.mode === "world-time" ? `${preset.duration.value} ${preset.duration.unit}`
      : ["rounds", "turns"].includes(preset.duration.mode) ? `${preset.duration.value} ${preset.duration.mode}`
        : preset.duration.mode.replaceAll("-", " ");
    previewRoot.innerHTML = `<article class="summon-preview-card">${preset.source.thumbnailUrl ? `<img src="${escapeHtml(preset.source.thumbnailUrl)}" alt="">` : ""}<div><h4>${escapeHtml(preset.name)}</h4><p>${escapeHtml(preset.description || "Reusable summon preset")}</p><dl><dt>Source</dt><dd>${escapeHtml(preset.source.name)}</dd><dt>Count</dt><dd>${preset.count}</dd><dt>Placement</dt><dd>${escapeHtml(preset.placement.mode.replaceAll("-", " "))}</dd><dt>Ownership</dt><dd>${escapeHtml(preset.ownership.mode)}</dd><dt>Initiative</dt><dd>${escapeHtml(preset.initiative.mode)}</dd><dt>Duration</dt><dd>${escapeHtml(duration)}</dd><dt>End</dt><dd>${escapeHtml(preset.endBehavior.mode)}</dd></dl></div></article>`;
  }

  function renderSourceOptions() {
    const choices = libraryRecords.filter((record) => ["monster", "npc"].includes(record.assetType));
    sourceSelect.innerHTML = `<option value="">Choose from My Library</option>${choices.map((record) => `<option value="${escapeHtml(record.libraryId)}">${record.assetType === "npc" ? "NPC" : "Monster"} — ${escapeHtml(record.name)}${record.sourceRoomName || record.sourceRoomCode ? ` — ${escapeHtml(record.sourceRoomName || record.sourceRoomCode)}` : ""}</option>`).join("")}`;
    sourceSelect.value = source?.libraryId || "";
  }

  function renderLibrary() {
    const search = searchInput.value.trim().toLowerCase();
    const filtered = records.filter((entry) => !search || [entry.name, entry.description, entry.source.name, ...entry.tags].join(" ").toLowerCase().includes(search));
    libraryRoot.innerHTML = filtered.length ? filtered.map((entry) => `<button type="button" class="summon-library-card" data-summon-library-id="${escapeHtml(entry.id)}"><strong>${escapeHtml(entry.name)}</strong><span>${escapeHtml(entry.source.name)} · ×${entry.count}</span></button>`).join("") : `<p class="summon-empty">No summon presets found.</p>`;
  }

  function applyPreset(value = {}) {
    const preset = normalizeSummonPreset(value);
    const empty = !value?.id && !value?.name;
    selectedId = empty ? "" : preset.id;
    createdAtMillis = empty ? 0 : preset.createdAtMillis;
    source = value?.sourceLibraryId || value?.source?.libraryId ? { ...preset.source } : null;
    provenance = Object.fromEntries(["sourceWorkshopAssetId", "sourceWorkshopVersion", "sourceAuthorUid", "copiedFromLibraryId", "copiedFromSummonId"]
      .map((key) => [key, preset[key]]).filter(([, item]) => item));
    field("name").value = empty ? "" : preset.name;
    field("description").value = empty ? "" : preset.description;
    field("tags").value = empty ? "" : preset.tags.join(", ");
    field("count").value = preset.count;
    field("placementMode").value = preset.placement.userPlaces ? "manual" : preset.placement.mode;
    field("radius").value = preset.placement.radius;
    field("preventOverlap").checked = preset.placement.preventOverlap;
    field("nearestFree").checked = preset.placement.nearestFree;
    field("allowDmOverride").checked = preset.placement.allowDmOverride;
    field("ownershipMode").value = preset.ownership.mode;
    field("playerUid").value = preset.ownership.playerUid;
    field("initiativeMode").value = preset.initiative.mode;
    field("durationMode").value = preset.duration.mode;
    field("durationValue").value = preset.duration.value;
    field("durationUnit").value = preset.duration.unit;
    field("endMode").value = preset.endBehavior.mode;
    field("endAnimationId").value = preset.endBehavior.animationId;
    field("spawnTiming").value = preset.spawnTiming;
    field("eventName").value = preset.eventName;
    field("summonAnimationId").value = preset.summonAnimationId;
    renderSourceOptions(); renderSourceSummary(); syncConditionalFields(); renderPreview();
  }

  async function refresh() {
    if (busy) return records;
    try {
      [records, libraryRecords] = await Promise.all([persistence.list(), listLibraryRecords()]);
      renderLibrary(); renderSourceOptions();
      return records;
    } catch (error) { setStatus(`Summon Library could not load: ${error.message}`); return []; }
  }

  async function save() {
    if (busy) return null;
    setBusy(true);
    try {
      if (!source) throw new Error("Choose a Monster or NPC from My Library.");
      const selectedRecord = libraryRecords.find((entry) => entry.libraryId === source.libraryId);
      if (selectedRecord) {
        const loaded = await loadLibraryRecord(selectedRecord);
        source = { ...normalizeSummonSource({ ...selectedRecord, ...(loaded.content || {}) }) };
      }
      const saved = await persistence.save(rawDraft());
      applyPreset(saved); await refresh(); setStatus("Summon preset saved to My Library."); return saved;
    } catch (error) { setStatus(`Summon preset could not be saved: ${error.message}`); return null; }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!selectedId || busy) { setStatus("Choose a saved summon preset first."); return false; }
    setBusy(true);
    try { await persistence.remove(selectedId); applyPreset({}); await refresh(); setStatus("Summon preset deleted. Its source content was left unchanged."); return true; }
    catch (error) { setStatus(`Summon preset could not be deleted: ${error.message}`); return false; }
    finally { setBusy(false); }
  }

  function duplicate() {
    const copied = duplicateSummonPreset(rawDraft());
    applyPreset({ ...copied, id: "", createdAtMillis: 0 });
    provenance = { copiedFromSummonId: selectedId, copiedFromLibraryId: selectedId ? `summon:${selectedId}` : "" };
    setStatus("Independent copy ready. Save it to add it to My Library.");
  }

  function publish() {
    if (!selectedId) { setStatus("Save the summon preset before publishing it."); return null; }
    const content = normalizeSummonPreset(rawDraft());
    const request = { assetType: "summon", sourceRecordId: selectedId, sourceScope: `user:${String(getUserId() || "")}`, name: content.name, description: content.description, thumbnailUrl: content.source.thumbnailUrl, tags: content.tags, content };
    onPublishToWorkshop(request);
    return request;
  }

  async function usePreset() {
    const preset = selectedId ? normalizeSummonPreset(rawDraft()) : await save();
    if (!preset) return null;
    setBusy(true); setStatus("Preparing the summon source for this campaign…");
    try {
      const result = await onUsePreset({ ...preset, automation: summonPresetAutomation(preset) });
      setStatus(result?.message || "Summon preset is ready in the animation automation panel.");
      return result;
    } catch (error) { setStatus(`Summon preset could not be prepared: ${error.message}`); return null; }
    finally { setBusy(false); }
  }

  on(form, "input", () => { syncConditionalFields(); renderPreview(); });
  on(sourceSelect, "change", () => {
    const record = libraryRecords.find((entry) => entry.libraryId === sourceSelect.value);
    source = record ? { ...normalizeSummonSource(record) } : null;
    renderSourceSummary(); renderPreview();
  });
  on(searchInput, "input", renderLibrary);
  on(libraryRoot, "click", async (event) => {
    const button = event.target.closest("[data-summon-library-id]");
    if (!button) return;
    try { applyPreset(await persistence.load(button.dataset.summonLibraryId)); setStatus("Saved summon preset loaded."); }
    catch (error) { setStatus(error.message); }
  });
  on(screen, "click", (event) => {
    const button = event.target.closest("[data-summon-creator-action]");
    if (!button) return;
    const action = button.dataset.summonCreatorAction;
    if (action === "back") onBack();
    if (action === "new") { applyPreset({}); setStatus("New summon preset ready."); }
    if (action === "save") void save();
    if (action === "duplicate") duplicate();
    if (action === "delete") void remove();
    if (action === "use") void usePreset();
    if (action === "publish") publish();
    if (action === "browse") onBrowseLibrary({ assetType: "summon", tab: "library" });
    if (action === "refresh") void refresh();
  });

  applyPreset({});
  void refresh();
  return Object.freeze({
    refresh, save, remove, usePreset, getDraft: rawDraft,
    openPreset(preset, { duplicate: makeCopy = false } = {}) {
      if (makeCopy) {
        const copy = duplicateSummonPreset(preset);
        applyPreset({ ...copy, id: "", createdAtMillis: 0 });
      } else applyPreset(preset);
      setStatus(makeCopy ? "Independent copy opened. Save it to My Library." : "Summon preset opened.");
    },
    destroy() { listeners.forEach((removeListener) => removeListener()); }
  });
}
