import { NPC_ABILITY_KEYS, normalizeNpc, validateNpc } from "./npcModel.js";
import { renderNpcPreview } from "./npcPreview.js";
import { createNpcRelationshipNetwork } from "./npcRelationshipNetwork.js";

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);

const newId = (prefix) => globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const blankKnowledge = (index = 0) => ({
  id: newId("knowledge"), title: `Knowledge ${index + 1}`, description: "", tags: [], secret: false,
  learnedAt: "", knownByNpcIds: [], sourceNpcId: "", sharedAtWorldTime: null
});
const blankAction = (index = 0) => ({ id: newId("action"), name: `Action ${index + 1}`, description: "", attackBonus: null, damage: "" });

function ensureStyles(document) {
  if (document.getElementById("npcCreatorStyles")) return;
  const link = document.createElement("link");
  link.id = "npcCreatorStyles";
  link.rel = "stylesheet";
  link.href = new URL("./npcCreator.css", import.meta.url).href;
  document.head.append(link);
}

export function createNpcCreator({
  screen,
  persistence,
  relationshipPersistence = null,
  onBack = () => {},
  onPublishToWorkshop = () => {},
  onBrowseLibrary = () => {},
  onCreateToken = async () => null,
  getUserId = () => "",
  getCurrentRoomCode = () => "",
  getCurrentRoomName = () => "",
  getWorldTime = () => 0,
  uploadImage = null
} = {}) {
  if (!screen || !persistence) throw new Error("NPC Creator needs a screen and persistence.");
  const document = screen.ownerDocument || globalThis.document;
  ensureStyles(document);
  screen.innerHTML = `
    <section class="box npc-creator">
      <header class="npc-creator-header"><div><span class="npc-eyebrow">HOMEBREW LIBRARY</span><h2>NPC Creator</h2><p>Build reusable people, campaign contacts, secrets, knowledge, and optional combat-ready tokens.</p></div><button type="button" data-npc-action="back">Back to Battle Map</button></header>
      <div class="npc-creator-actions">
        <button type="button" data-npc-action="new">New NPC</button>
        <button type="button" class="npc-primary" data-npc-action="save">Save to My Library</button>
        <button type="button" data-npc-action="duplicate">Duplicate</button>
        <button type="button" data-npc-action="delete">Delete</button>
        <button type="button" data-npc-action="token">Create Token</button>
        <button type="button" data-npc-action="publish">Publish to Workshop</button>
        <button type="button" data-npc-action="browse">Open NPC Library</button>
        <button type="button" data-npc-action="network" ${relationshipPersistence ? "" : "disabled"}>Relationship Network</button>
      </div>
      <p class="npc-status" role="status" data-npc-status>NPC Creator ready.</p>
      <div class="npc-network-shell hidden" data-npc-network></div>
      <div class="npc-workspace" data-npc-workspace>
        <form class="npc-editor" data-npc-form>
          <section class="npc-panel"><h3>Identity</h3>
            <label>Name<input required maxlength="120" data-npc-field="name" placeholder="Captain Elara Voss"></label>
            <div class="npc-row"><label>Species / Ancestry<input maxlength="120" data-npc-field="species" placeholder="Human"></label><label>Occupation / Role<input maxlength="160" data-npc-field="occupation" placeholder="Harbor captain"></label></div>
            <div class="npc-row"><label>Gender<input maxlength="80" data-npc-field="gender"></label><label>Pronouns<input maxlength="80" data-npc-field="pronouns" placeholder="she/her"></label><label>Age<input maxlength="80" data-npc-field="age"></label></div>
            <div class="npc-row"><label>Alignment<input maxlength="120" data-npc-field="alignment"></label><label>Disposition<input maxlength="120" data-npc-field="disposition" placeholder="Friendly, wary, hostile"></label></div>
            <label>Description<textarea rows="5" maxlength="8000" data-npc-field="description"></textarea></label>
          </section>
          <section class="npc-panel"><h3>Appearance</h3>
            <label>Portrait URL<input type="url" maxlength="2048" data-npc-field="portraitUrl" placeholder="https://..."></label>
            ${typeof uploadImage === "function" ? `<label class="npc-file">Upload portrait<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" data-npc-image-upload></label>` : ""}
          </section>
          <section class="npc-panel"><h3>Personality</h3><label>Personality<textarea rows="4" maxlength="5000" data-npc-field="personality"></textarea></label><label>Motivations<textarea rows="3" maxlength="5000" data-npc-field="motivations"></textarea></label><label>Fears<textarea rows="3" maxlength="5000" data-npc-field="fears"></textarea></label></section>
          <section class="npc-panel"><h3>Goals</h3><label>Goals<textarea rows="4" maxlength="5000" data-npc-field="goals"></textarea></label><label>Secrets<textarea rows="4" maxlength="8000" data-npc-field="secrets"></textarea></label></section>
          <section class="npc-panel"><h3>Campaign</h3>
            <label>Library Scope<select data-npc-field="scope"><option value="personal">Personal</option><option value="campaign">Current Campaign</option></select></label>
            <p class="npc-help" data-npc-campaign-help>Personal NPCs are account-wide and private until published.</p>
            <div class="npc-row"><label>Faction<input maxlength="160" data-npc-field="faction"></label><label>Location<input maxlength="200" data-npc-field="location"></label></div>
            <label>Tags<input maxlength="1000" data-npc-field="tags" placeholder="merchant, ally, harbor"></label>
          </section>
          <details class="npc-panel"><summary><h3>Relationships</h3><span>Stable references for future world links</span></summary>
            <label>Relationship IDs<input maxlength="4000" data-npc-field="relationshipIds" placeholder="npc-id-1, npc-id-2"></label>
            <label>Faction IDs<input maxlength="2000" data-npc-field="factionIds" placeholder="faction-id"></label>
            <label>Location ID<input maxlength="160" data-npc-field="locationId"></label>
          </details>
          <section class="npc-panel"><div class="npc-section-heading"><div><h3>Knowledge</h3><p>Track public clues and DM-only secrets without adding dialogue automation.</p></div><button type="button" data-npc-action="add-knowledge">+ Add Knowledge</button></div>
            <label>General Known Information<textarea rows="4" maxlength="8000" data-npc-field="knownInformation"></textarea></label><div data-npc-knowledge></div>
          </section>
          <details class="npc-panel" data-npc-combat-panel><summary><h3>Combat</h3><span>Optional stat block and basic actions</span></summary>
            <label class="npc-check"><input type="checkbox" data-npc-field="combatEnabled"> Enable combat statistics</label>
            <div class="npc-row"><label>Armor Class<input type="number" min="0" max="99" data-npc-field="ac"></label><label>Hit Points<input type="number" min="1" max="9999" data-npc-field="hp"></label><label>Speed<input maxlength="160" data-npc-field="speed" placeholder="30 ft."></label></div>
            <div class="npc-abilities">${NPC_ABILITY_KEYS.map((key) => `<label>${key.toUpperCase()}<input type="number" min="1" max="30" value="10" data-npc-ability="${key}"></label>`).join("")}</div>
            <label>Linked Monster / Stat Block ID<input maxlength="160" data-npc-field="monsterId" placeholder="Optional stable ID"></label>
            <div class="npc-section-heading"><h4>Basic Actions</h4><button type="button" data-npc-action="add-combat-action">+ Add Action</button></div><div data-npc-combat-actions></div>
          </details>
          <section class="npc-panel"><h3>Notes</h3><label>Private Campaign Notes<textarea rows="8" maxlength="12000" data-npc-field="notes"></textarea></label></section>
        </form>
        <aside class="npc-sidebar">
          <section class="npc-panel"><h3>Live NPC Preview</h3><div data-npc-preview></div></section>
          <section class="npc-panel"><div class="npc-section-heading"><h3>My NPCs</h3><button type="button" data-npc-action="refresh">Refresh</button></div>
            <div class="npc-filters"><label>Search<input type="search" data-npc-filter="search" placeholder="Name, description, tags"></label><label>Scope<select data-npc-filter="scope"><option value="">All</option><option value="personal">Personal</option><option value="campaign">Campaign</option></select></label><label>Species<input data-npc-filter="species"></label><label>Role<input data-npc-filter="occupation"></label></div>
            <div class="npc-library" data-npc-library></div>
          </section>
        </aside>
      </div>
    </section>`;

  const field = (name) => screen.querySelector(`[data-npc-field="${name}"]`);
  const filter = (name) => screen.querySelector(`[data-npc-filter="${name}"]`);
  const form = screen.querySelector("[data-npc-form]");
  const previewRoot = screen.querySelector("[data-npc-preview]");
  const knowledgeRoot = screen.querySelector("[data-npc-knowledge]");
  const actionsRoot = screen.querySelector("[data-npc-combat-actions]");
  const libraryRoot = screen.querySelector("[data-npc-library]");
  const statusRoot = screen.querySelector("[data-npc-status]");
  const campaignHelp = screen.querySelector("[data-npc-campaign-help]");
  const workspaceRoot = screen.querySelector("[data-npc-workspace]");
  const networkRoot = screen.querySelector("[data-npc-network]");
  const listeners = [];
  let selectedId = "";
  let createdAtMillis = 0;
  let assignedRoomCode = "";
  let assignedRoomName = "";
  let knowledge = [];
  let combatActions = [];
  let records = [];
  let busy = false;
  let provenance = {};
  let networkOpen = false;
  let relationshipNetwork = null;

  const on = (element, event, handler) => {
    element?.addEventListener(event, handler);
    if (element) listeners.push(() => element.removeEventListener(event, handler));
  };
  const setStatus = (message) => { statusRoot.textContent = message; };
  const setBusy = (value) => {
    busy = value;
    for (const button of screen.querySelectorAll("button")) button.disabled = value;
  };

  function syncCampaign() {
    const campaign = field("scope").value === "campaign";
    if (campaign) {
      assignedRoomCode = assignedRoomCode || String(getCurrentRoomCode() || "").toUpperCase();
      assignedRoomName = assignedRoomName || String(getCurrentRoomName() || assignedRoomCode);
      if (!assignedRoomCode) field("scope").value = "personal";
    } else {
      assignedRoomCode = "";
      assignedRoomName = "";
    }
    campaignHelp.textContent = field("scope").value === "campaign"
      ? `Associated with ${assignedRoomName || assignedRoomCode}. The NPC remains one private account record.`
      : "Personal NPCs are account-wide and private until published.";
  }

  function rawDraft() {
    syncCampaign();
    return {
      id: selectedId,
      createdAtMillis,
      name: field("name").value,
      portraitUrl: field("portraitUrl").value,
      description: field("description").value,
      species: field("species").value,
      gender: field("gender").value,
      pronouns: field("pronouns").value,
      age: field("age").value,
      occupation: field("occupation").value,
      alignment: field("alignment").value,
      disposition: field("disposition").value,
      faction: field("faction").value,
      location: field("location").value,
      roomCode: assignedRoomCode,
      roomName: assignedRoomName,
      personality: field("personality").value,
      goals: field("goals").value,
      fears: field("fears").value,
      motivations: field("motivations").value,
      secrets: field("secrets").value,
      knownInformation: field("knownInformation").value,
      notes: field("notes").value,
      tags: field("tags").value,
      relationshipIds: field("relationshipIds").value,
      factionIds: field("factionIds").value,
      locationId: field("locationId").value,
      knowledge: knowledge.map((entry) => ({
        ...entry,
        tags: [...(entry.tags || [])],
        knownByNpcIds: [...(entry.knownByNpcIds || [])]
      })),
      combat: {
        enabled: field("combatEnabled").checked,
        ac: field("ac").value,
        hp: field("hp").value,
        speed: field("speed").value,
        monsterId: field("monsterId").value,
        abilities: Object.fromEntries(NPC_ABILITY_KEYS.map((key) => [key, screen.querySelector(`[data-npc-ability="${key}"]`).value])),
        actions: combatActions.map((action) => ({ ...action }))
      },
      ...provenance
    };
  }

  function renderPreview() { renderNpcPreview(previewRoot, rawDraft()); }

  function renderKnowledge() {
    knowledgeRoot.innerHTML = knowledge.length ? knowledge.map((entry, index) => `<details class="npc-entry" data-npc-knowledge-index="${index}" open><summary><strong>${escapeHtml(entry.title || `Knowledge ${index + 1}`)}</strong><span>${entry.secret ? "Secret" : "Known"}</span></summary><div class="npc-entry-actions"><button type="button" data-entry-action="up" ${index === 0 ? "disabled" : ""}>↑</button><button type="button" data-entry-action="down" ${index === knowledge.length - 1 ? "disabled" : ""}>↓</button><button type="button" data-entry-action="duplicate">Duplicate</button><button type="button" data-entry-action="delete">Delete</button></div><label>Title<input maxlength="160" data-knowledge-field="title" value="${escapeHtml(entry.title)}"></label><label>Description<textarea rows="4" maxlength="5000" data-knowledge-field="description">${escapeHtml(entry.description)}</textarea></label><div class="npc-row"><label>Tags<input maxlength="500" data-knowledge-field="tags" value="${escapeHtml((entry.tags || []).join(", "))}"></label><label>Learned At<input maxlength="240" data-knowledge-field="learnedAt" value="${escapeHtml(entry.learnedAt)}"></label></div><details class="npc-knowledge-links"><summary>Knowledge references</summary><label>Known By NPC IDs<input maxlength="4000" data-knowledge-field="knownByNpcIds" value="${escapeHtml((entry.knownByNpcIds || []).join(", "))}"></label><div class="npc-row"><label>Source NPC ID<input maxlength="160" data-knowledge-field="sourceNpcId" value="${escapeHtml(entry.sourceNpcId || "")}"></label><label>Shared at World Time<input type="number" min="0" data-knowledge-field="sharedAtWorldTime" value="${entry.sharedAtWorldTime ?? ""}"></label></div></details><label class="npc-check"><input type="checkbox" data-knowledge-field="secret" ${entry.secret ? "checked" : ""}> DM-only secret</label></details>`).join("") : `<p class="npc-empty">No knowledge entries yet.</p>`;
  }

  function renderCombatActions() {
    actionsRoot.innerHTML = combatActions.length ? combatActions.map((entry, index) => `<details class="npc-entry" data-npc-action-index="${index}" open><summary><strong>${escapeHtml(entry.name || `Action ${index + 1}`)}</strong></summary><div class="npc-entry-actions"><button type="button" data-combat-action="up" ${index === 0 ? "disabled" : ""}>↑</button><button type="button" data-combat-action="down" ${index === combatActions.length - 1 ? "disabled" : ""}>↓</button><button type="button" data-combat-action="duplicate">Duplicate</button><button type="button" data-combat-action="delete">Delete</button></div><label>Name<input maxlength="120" data-combat-field="name" value="${escapeHtml(entry.name)}"></label><div class="npc-row"><label>Attack Bonus<input type="number" min="-20" max="30" data-combat-field="attackBonus" value="${entry.attackBonus ?? ""}"></label><label>Damage<input maxlength="160" data-combat-field="damage" value="${escapeHtml(entry.damage)}" placeholder="1d8 + 3 slashing"></label></div><label>Description<textarea rows="3" maxlength="4000" data-combat-field="description">${escapeHtml(entry.description)}</textarea></label></details>`).join("") : `<p class="npc-empty">No combat actions yet.</p>`;
  }

  function applyNpc(raw = {}) {
    const npc = normalizeNpc(raw);
    selectedId = raw.id ? npc.id : "";
    createdAtMillis = raw.id ? npc.createdAtMillis : 0;
    assignedRoomCode = npc.roomCode;
    assignedRoomName = npc.roomName;
    provenance = {
      sourceWorkshopAssetId: npc.sourceWorkshopAssetId,
      sourceWorkshopVersion: npc.sourceWorkshopVersion,
      sourceAuthorUid: npc.sourceAuthorUid,
      copiedFromLibraryId: npc.copiedFromLibraryId,
      copiedFromNpcId: npc.copiedFromNpcId
    };
    for (const name of ["name", "portraitUrl", "description", "species", "gender", "pronouns", "age", "occupation", "alignment", "disposition", "faction", "location", "personality", "goals", "fears", "motivations", "secrets", "knownInformation", "notes", "locationId"]) field(name).value = raw[name] ?? npc[name] ?? "";
    field("tags").value = npc.tags.join(", ");
    field("relationshipIds").value = npc.relationshipIds.join(", ");
    field("factionIds").value = npc.factionIds.join(", ");
    field("scope").value = npc.roomCode ? "campaign" : "personal";
    field("combatEnabled").checked = npc.combat.enabled;
    field("ac").value = npc.combat.ac ?? "";
    field("hp").value = npc.combat.hp ?? "";
    field("speed").value = npc.combat.speed;
    field("monsterId").value = npc.combat.monsterId;
    for (const key of NPC_ABILITY_KEYS) screen.querySelector(`[data-npc-ability="${key}"]`).value = npc.combat.abilities[key];
    knowledge = npc.knowledge.map((entry) => ({
      ...entry,
      tags: [...entry.tags],
      knownByNpcIds: [...entry.knownByNpcIds]
    }));
    combatActions = npc.combat.actions.map((entry) => ({ ...entry }));
    renderKnowledge(); renderCombatActions(); syncCampaign(); renderPreview();
  }

  function filteredRecords() {
    const search = filter("search").value.trim().toLowerCase();
    const species = filter("species").value.trim().toLowerCase();
    const occupation = filter("occupation").value.trim().toLowerCase();
    const scope = filter("scope").value;
    return records.filter((npc) => {
      const text = [npc.name, npc.description, npc.species, npc.occupation, npc.faction, npc.location, ...npc.tags].join(" ").toLowerCase();
      return (!search || text.includes(search)) && (!species || npc.species.toLowerCase().includes(species)) && (!occupation || npc.occupation.toLowerCase().includes(occupation)) && (!scope || npc.scope === scope);
    });
  }

  function renderLibrary() {
    const shown = filteredRecords();
    libraryRoot.innerHTML = shown.length ? shown.map((npc) => `<button type="button" data-library-npc-id="${escapeHtml(npc.id)}" class="${npc.id === selectedId ? "selected" : ""}">${npc.portraitUrl ? `<img src="${escapeHtml(npc.portraitUrl)}" alt="">` : `<span aria-hidden="true">🧙</span>`}<span><strong>${escapeHtml(npc.name)}</strong><small>${escapeHtml([npc.species, npc.occupation, npc.roomCode ? npc.roomName || npc.roomCode : "Personal"].filter(Boolean).join(" · "))}</small></span></button>`).join("") : `<p class="npc-empty">No NPCs match these filters.</p>`;
  }

  async function refresh() {
    try { records = await persistence.list(); renderLibrary(); return records; }
    catch (error) { records = []; renderLibrary(); setStatus(`NPC Library could not load: ${error.message}`); return []; }
  }

  async function save() {
    if (busy) return null;
    const draft = rawDraft();
    const errors = validateNpc(draft);
    if (errors.length) { setStatus(errors.join(" ")); return null; }
    setBusy(true); setStatus("Saving to My Library…");
    try {
      const saved = await persistence.save(draft);
      applyNpc(saved); await refresh(); setStatus(`${saved.name} saved to My Library.`); return saved;
    } catch (error) { setStatus(`NPC could not be saved: ${error.message}`); return null; }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!selectedId) { setStatus("Select a saved NPC to delete."); return false; }
    if (globalThis.confirm && !globalThis.confirm("Delete this NPC from My Library?")) return false;
    setBusy(true);
    try { await persistence.remove(selectedId); applyNpc({}); await refresh(); setStatus("NPC deleted."); return true; }
    catch (error) { setStatus(`NPC could not be deleted: ${error.message}`); return false; }
    finally { setBusy(false); }
  }

  function duplicate() {
    const draft = rawDraft();
    applyNpc({ ...draft, id: "", createdAtMillis: 0, name: `${draft.name || "NPC"} Copy`, copiedFromNpcId: selectedId, copiedFromLibraryId: selectedId ? `npc:${selectedId}` : "" });
    setStatus("Independent copy ready. Save it to add it to My Library.");
  }

  function publish() {
    if (!selectedId) { setStatus("Save the NPC before publishing it."); return null; }
    const content = normalizeNpc(rawDraft());
    const request = { assetType: "npc", sourceRecordId: selectedId, sourceScope: `user:${String(getUserId() || "")}`, name: content.name, description: content.description, thumbnailUrl: content.portraitUrl, tags: content.tags, content };
    onPublishToWorkshop(request);
    return request;
  }

  async function createToken() {
    const npc = selectedId ? normalizeNpc(rawDraft()) : await save();
    if (!npc) return null;
    setBusy(true);
    try { const result = await onCreateToken(npc); setStatus(result?.message || `${npc.name} token created.`); return result; }
    catch (error) { setStatus(`Token could not be created: ${error.message}`); return null; }
    finally { setBusy(false); }
  }

  function updateEntry(input, kind) {
    const root = input.closest(kind === "knowledge" ? "[data-npc-knowledge-index]" : "[data-npc-action-index]");
    const index = Number(kind === "knowledge" ? root?.dataset.npcKnowledgeIndex : root?.dataset.npcActionIndex);
    const list = kind === "knowledge" ? knowledge : combatActions;
    const key = kind === "knowledge" ? input.dataset.knowledgeField : input.dataset.combatField;
    if (!Number.isInteger(index) || !list[index] || !key) return;
    let value = input.type === "checkbox" ? input.checked : input.value;
    if (key === "tags" || key === "knownByNpcIds") value = value.split(",").map((entry) => entry.trim()).filter(Boolean);
    if (key === "attackBonus") value = value === "" ? null : Number(value);
    if (key === "sharedAtWorldTime") value = value === "" ? null : Number(value);
    list[index] = { ...list[index], [key]: value };
    renderPreview();
  }

  function entryAction(button, kind) {
    const root = button.closest(kind === "knowledge" ? "[data-npc-knowledge-index]" : "[data-npc-action-index]");
    const index = Number(kind === "knowledge" ? root?.dataset.npcKnowledgeIndex : root?.dataset.npcActionIndex);
    const list = kind === "knowledge" ? knowledge : combatActions;
    const action = kind === "knowledge" ? button.dataset.entryAction : button.dataset.combatAction;
    if (!Number.isInteger(index) || !list[index]) return;
    if (action === "delete") list.splice(index, 1);
    if (action === "duplicate") list.splice(index + 1, 0, { ...list[index], id: newId(kind), title: kind === "knowledge" ? `${list[index].title} Copy` : undefined, name: kind === "combat" ? `${list[index].name} Copy` : undefined });
    if (action === "up" && index > 0) [list[index - 1], list[index]] = [list[index], list[index - 1]];
    if (action === "down" && index < list.length - 1) [list[index + 1], list[index]] = [list[index], list[index + 1]];
    kind === "knowledge" ? renderKnowledge() : renderCombatActions();
    renderPreview();
  }

  on(form, "input", (event) => {
    if (event.target.matches("[data-knowledge-field]")) updateEntry(event.target, "knowledge");
    else if (event.target.matches("[data-combat-field]")) updateEntry(event.target, "combat");
    else { if (event.target === field("scope")) { assignedRoomCode = ""; assignedRoomName = ""; } renderPreview(); }
  });
  for (const control of screen.querySelectorAll("[data-npc-filter]")) on(control, "input", renderLibrary);
  on(knowledgeRoot, "click", (event) => { const button = event.target.closest("[data-entry-action]"); if (button) entryAction(button, "knowledge"); });
  on(actionsRoot, "click", (event) => { const button = event.target.closest("[data-combat-action]"); if (button) entryAction(button, "combat"); });
  on(screen.querySelector('[data-npc-action="add-knowledge"]'), "click", (event) => {
    event.stopPropagation();
    knowledge.push(blankKnowledge(knowledge.length));
    renderKnowledge(); renderPreview();
  });
  on(screen.querySelector('[data-npc-action="add-combat-action"]'), "click", (event) => {
    event.stopPropagation();
    combatActions.push(blankAction(combatActions.length));
    renderCombatActions(); renderPreview();
  });
  on(libraryRoot, "click", async (event) => {
    const button = event.target.closest("[data-library-npc-id]");
    if (!button) return;
    try { applyNpc(await persistence.load(button.dataset.libraryNpcId)); renderLibrary(); setStatus("Saved NPC loaded."); }
    catch (error) { setStatus(error.message); }
  });
  on(screen, "click", (event) => {
    const button = event.target.closest("[data-npc-action]");
    if (!button) return;
    const action = button.dataset.npcAction;
    if (action === "back") onBack();
    if (action === "new") { applyNpc({}); setStatus("New NPC ready."); }
    if (action === "save") void save();
    if (action === "duplicate") duplicate();
    if (action === "delete") void remove();
    if (action === "token") void createToken();
    if (action === "publish") publish();
    if (action === "browse") onBrowseLibrary({ assetType: "npc", tab: "library" });
    if (action === "refresh") void refresh();
    if (action === "network" && relationshipNetwork) {
      networkOpen = !networkOpen;
      workspaceRoot.classList.toggle("hidden", networkOpen);
      networkRoot.classList.toggle("hidden", !networkOpen);
      button.textContent = networkOpen ? "Back to NPC Editor" : "Relationship Network";
      if (networkOpen) void relationshipNetwork.refresh();
    }
  });
  const upload = screen.querySelector("[data-npc-image-upload]");
  on(upload, "change", async () => {
    const file = upload.files?.[0];
    if (!file) return;
    setBusy(true); setStatus("Uploading NPC portrait…");
    try { const result = await uploadImage(file); field("portraitUrl").value = result.secure_url || result.secureUrl || result.url || ""; renderPreview(); setStatus("Portrait uploaded. Save the NPC to keep it."); }
    catch (error) { setStatus(`Portrait upload failed: ${error.message}`); }
    finally { upload.value = ""; setBusy(false); }
  });

  if (relationshipPersistence) {
    relationshipNetwork = createNpcRelationshipNetwork({
      root: networkRoot,
      npcPersistence: persistence,
      relationshipPersistence,
      getWorldTime,
      onOpenNpc: (npc) => {
        applyNpc(npc);
        networkOpen = false;
        workspaceRoot.classList.remove("hidden");
        networkRoot.classList.add("hidden");
        const button = screen.querySelector('[data-npc-action="network"]');
        if (button) button.textContent = "Relationship Network";
        setStatus(`${npc.name} opened from the relationship network.`);
      },
      onStatus: setStatus
    });
  }

  applyNpc({});
  void refresh();
  return Object.freeze({
    refresh, save, remove, createToken, getDraft: rawDraft,
    openNpc(npc, { duplicate: makeCopy = false } = {}) {
      applyNpc(makeCopy ? { ...npc, id: "", createdAtMillis: 0, name: `${npc?.name || "NPC"} Copy`, copiedFromNpcId: npc?.id || "" } : npc);
      setStatus(makeCopy ? "Independent copy opened. Save it to My Library." : "NPC opened.");
    },
    destroy() { relationshipNetwork?.destroy(); listeners.forEach((removeListener) => removeListener()); }
  });
}
