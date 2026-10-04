import {
  NPC_RELATIONSHIP_DIRECTIONS,
  NPC_RELATIONSHIP_TYPES,
  normalizeNpcRelationship,
  relationshipLabel,
  validateNpcRelationship
} from "./relationshipModel.js";
import { applyNpcKnowledgeShare, knowledgeKnownByNpc } from "./knowledgeSharing.js";

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);

function ensureStyles(document) {
  if (document.getElementById("npcRelationshipNetworkStyles")) return;
  const link = document.createElement("link");
  link.id = "npcRelationshipNetworkStyles";
  link.rel = "stylesheet";
  link.href = new URL("./npcRelationshipNetwork.css", import.meta.url).href;
  document.head.append(link);
}

const optionList = (entries, selected = "") => entries.map(([value, label]) =>
  `<option value="${escapeHtml(value)}" ${String(value) === String(selected) ? "selected" : ""}>${escapeHtml(label)}</option>`
).join("");

export function createNpcRelationshipNetwork({
  root,
  npcPersistence,
  relationshipPersistence,
  getWorldTime = () => 0,
  onOpenNpc = () => {},
  onStatus = () => {}
} = {}) {
  if (!root || !npcPersistence || !relationshipPersistence) throw new Error("NPC Relationship Network needs a root and both persistence systems.");
  const document = root.ownerDocument || globalThis.document;
  ensureStyles(document);
  root.innerHTML = `
    <section class="npc-network" aria-label="NPC Relationship Network">
      <header class="npc-network-header"><div><span class="npc-eyebrow">WORLD CONNECTIONS</span><h3>NPC Relationship Network</h3><p>Relationships and knowledge move only when you explicitly save or share them.</p></div><button type="button" data-network-action="refresh">Refresh Network</button></header>
      <div class="npc-network-filters">
        <label>Search<input type="search" data-network-filter="search" placeholder="Find an NPC"></label>
        <label>Faction<select data-network-filter="faction"><option value="">All factions</option></select></label>
        <label>Campaign<select data-network-filter="campaign"><option value="">All campaigns</option></select></label>
        <label>Location<select data-network-filter="location"><option value="">All locations</option></select></label>
      </div>
      <div class="npc-network-layout">
        <section class="npc-network-canvas-panel">
          <div class="npc-network-toolbar"><span>Drag NPCs to arrange · drag empty space to pan · scroll to zoom</span><button type="button" data-network-action="reset-view">Reset View</button></div>
          <svg class="npc-network-canvas" data-network-canvas viewBox="0 0 1000 560" role="img" aria-label="NPC relationship graph"><g data-network-scene></g></svg>
          <div class="npc-network-card-list" data-network-card-list aria-label="Filtered NPCs"></div>
        </section>
        <aside class="npc-network-sidebar">
          <section class="npc-panel" data-network-selection><p class="npc-empty">Select an NPC or relationship.</p></section>
          <form class="npc-panel npc-network-form" data-network-form>
            <div class="npc-section-heading"><div><h4>Relationship</h4><p>Create or edit an explicit link.</p></div><button type="button" data-network-action="clear-relationship">New</button></div>
            <input type="hidden" data-relationship-field="id">
            <div class="npc-row"><label>Source NPC<select required data-relationship-field="sourceNpcId"></select></label><label>Target NPC<select required data-relationship-field="targetNpcId"></select></label></div>
            <div class="npc-row"><label>Type<select data-relationship-field="relationshipType">${NPC_RELATIONSHIP_TYPES.map((type) => `<option>${type}</option>`).join("")}</select></label><label>Direction<select data-relationship-field="direction">${NPC_RELATIONSHIP_DIRECTIONS.map((direction) => `<option value="${direction}">${direction === "mutual" ? "Mutual ↔" : "Source → Target"}</option>`).join("")}</select></label></div>
            <div class="npc-row"><label>Trust <output data-trust-output>50</output><input type="range" min="0" max="100" value="50" data-relationship-field="trust"></label><label>Hostility <output data-hostility-output>0</output><input type="range" min="0" max="100" value="0" data-relationship-field="hostility"></label></div>
            <label>Notes<textarea rows="3" maxlength="5000" data-relationship-field="notes"></textarea></label>
            <label>Tags<input maxlength="1000" data-relationship-field="tags" placeholder="political, secret, family"></label>
            <div class="npc-entry-actions"><button type="submit" class="npc-primary">Save Relationship</button><button type="button" data-network-action="delete-relationship" disabled>Delete</button></div>
          </form>
          <form class="npc-panel npc-network-form" data-knowledge-share-form>
            <h4>Share Knowledge</h4><p class="npc-help">One explicit transfer. Nothing propagates automatically.</p>
            <label>From NPC<select required data-share-field="sourceNpcId"></select></label>
            <label>Knowledge<select required data-share-field="knowledgeId"></select></label>
            <label>To NPC<select required data-share-field="targetNpcId"></select></label>
            <button type="submit" class="npc-primary">Share Knowledge</button>
          </form>
        </aside>
      </div>
    </section>`;

  const filter = (name) => root.querySelector(`[data-network-filter="${name}"]`);
  const relationshipField = (name) => root.querySelector(`[data-relationship-field="${name}"]`);
  const shareField = (name) => root.querySelector(`[data-share-field="${name}"]`);
  const canvas = root.querySelector("[data-network-canvas]");
  const scene = root.querySelector("[data-network-scene]");
  const cardList = root.querySelector("[data-network-card-list]");
  const selectionRoot = root.querySelector("[data-network-selection]");
  const relationshipForm = root.querySelector("[data-network-form]");
  const shareForm = root.querySelector("[data-knowledge-share-form]");
  const listeners = [];
  const positions = new Map();
  let npcs = [];
  let relationships = [];
  let selectedNpcId = "";
  let selectedRelationshipId = "";
  let transform = { x: 0, y: 0, scale: 1 };
  let gesture = null;

  const on = (element, event, handler, options) => {
    element?.addEventListener(event, handler, options);
    if (element) listeners.push(() => element.removeEventListener(event, handler, options));
  };
  const npcById = () => new Map(npcs.map((npc) => [npc.id, npc]));

  function visibleNpcs() {
    const search = filter("search").value.trim().toLowerCase();
    const faction = filter("faction").value;
    const campaign = filter("campaign").value;
    const location = filter("location").value;
    return npcs.filter((npc) => {
      const text = [npc.name, npc.description, npc.species, npc.occupation, npc.faction, npc.location, ...npc.tags].join(" ").toLowerCase();
      return (!search || text.includes(search))
        && (!faction || npc.faction === faction || npc.factionIds.includes(faction))
        && (!campaign || npc.roomCode === campaign)
        && (!location || npc.location === location || npc.locationId === location);
    });
  }

  function initializePositions() {
    const count = Math.max(npcs.length, 1);
    npcs.forEach((npc, index) => {
      if (positions.has(npc.id)) return;
      const angle = (Math.PI * 2 * index) / count;
      const ring = 120 + Math.floor(index / 12) * 80;
      positions.set(npc.id, { x: 500 + Math.cos(angle) * ring, y: 280 + Math.sin(angle) * ring });
    });
  }

  function renderFilterOptions() {
    const previous = Object.fromEntries(["faction", "campaign", "location"].map((name) => [name, filter(name).value]));
    const factions = [...new Set(npcs.flatMap((npc) => [npc.faction, ...npc.factionIds]).filter(Boolean))].sort();
    const campaigns = [...new Map(npcs.filter((npc) => npc.roomCode).map((npc) => [npc.roomCode, npc.roomName || npc.roomCode]))].sort((a, b) => a[1].localeCompare(b[1]));
    const locations = [...new Set(npcs.flatMap((npc) => [npc.location, npc.locationId]).filter(Boolean))].sort();
    filter("faction").innerHTML = `<option value="">All factions</option>${optionList(factions.map((value) => [value, value]), previous.faction)}`;
    filter("campaign").innerHTML = `<option value="">All campaigns</option>${optionList(campaigns, previous.campaign)}`;
    filter("location").innerHTML = `<option value="">All locations</option>${optionList(locations.map((value) => [value, value]), previous.location)}`;
  }

  function renderNpcOptions() {
    const options = optionList(npcs.map((npc) => [npc.id, npc.name]));
    for (const element of [relationshipField("sourceNpcId"), relationshipField("targetNpcId"), shareField("sourceNpcId"), shareField("targetNpcId")]) {
      const current = element.value;
      element.innerHTML = `<option value="">Choose an NPC</option>${options}`;
      if (npcs.some((npc) => npc.id === current)) element.value = current;
    }
    if (!relationshipField("sourceNpcId").value && npcs[0]) relationshipField("sourceNpcId").value = npcs[0].id;
    if (!relationshipField("targetNpcId").value && npcs[1]) relationshipField("targetNpcId").value = npcs[1].id;
    if (!shareField("sourceNpcId").value && npcs[0]) shareField("sourceNpcId").value = npcs[0].id;
    if (!shareField("targetNpcId").value && npcs[1]) shareField("targetNpcId").value = npcs[1].id;
    renderKnowledgeOptions();
  }

  function renderKnowledgeOptions() {
    const source = npcById().get(shareField("sourceNpcId").value);
    const current = shareField("knowledgeId").value;
    shareField("knowledgeId").innerHTML = `<option value="">Choose knowledge</option>${optionList((source?.knowledge || []).map((entry) => [entry.id, entry.title]), current)}`;
  }

  function renderSelection() {
    const byId = npcById();
    const relationship = relationships.find((entry) => entry.id === selectedRelationshipId);
    if (relationship) {
      selectionRoot.innerHTML = `<h4>Selected Relationship</h4><strong>${escapeHtml(relationshipLabel(relationship, byId))}</strong><p>Trust ${relationship.trust} · Hostility ${relationship.hostility}</p>${relationship.notes ? `<p>${escapeHtml(relationship.notes)}</p>` : ""}`;
      return;
    }
    const npc = byId.get(selectedNpcId);
    if (!npc) {
      selectionRoot.innerHTML = `<p class="npc-empty">Select an NPC or relationship.</p>`;
      return;
    }
    const known = knowledgeKnownByNpc(npcs, npc.id);
    selectionRoot.innerHTML = `<div class="npc-section-heading"><div><h4>${escapeHtml(npc.name)}</h4><p>${escapeHtml([npc.faction, npc.location, npc.roomName].filter(Boolean).join(" · ") || "Personal NPC")}</p></div><button type="button" data-network-open-npc="${escapeHtml(npc.id)}">Open NPC</button></div><p>${escapeHtml(npc.description || "No description yet.")}</p><h5>Knowledge (${known.length})</h5>${known.length ? `<ul>${known.map((entry) => `<li><strong>${escapeHtml(entry.title)}</strong>${entry.secret ? " · Secret" : ""}</li>`).join("")}</ul>` : `<p class="npc-empty">No known information.</p>`}`;
  }

  function renderGraph() {
    initializePositions();
    const shown = visibleNpcs();
    const visibleIds = new Set(shown.map((npc) => npc.id));
    const byId = npcById();
    const edgeMarkup = relationships.filter((entry) => visibleIds.has(entry.sourceNpcId) && visibleIds.has(entry.targetNpcId)).map((entry) => {
      const source = positions.get(entry.sourceNpcId);
      const target = positions.get(entry.targetNpcId);
      if (!source || !target) return "";
      const middleX = (source.x + target.x) / 2;
      const middleY = (source.y + target.y) / 2;
      return `<g class="npc-network-edge ${entry.id === selectedRelationshipId ? "selected" : ""}" data-network-edge-id="${escapeHtml(entry.id)}"><line x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}"></line><text x="${middleX}" y="${middleY - 8}">${escapeHtml(entry.relationshipType)}${entry.direction === "mutual" ? " ↔" : " →"}</text></g>`;
    }).join("");
    const nodeMarkup = shown.map((npc) => {
      const position = positions.get(npc.id);
      const initials = npc.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
      return `<g class="npc-network-node ${npc.id === selectedNpcId ? "selected" : ""}" transform="translate(${position.x} ${position.y})" data-network-node-id="${escapeHtml(npc.id)}" tabindex="0" role="button" aria-label="${escapeHtml(npc.name)}"><circle r="38"></circle><text class="npc-network-initials" y="5">${escapeHtml(initials || "NPC")}</text><text class="npc-network-name" y="58">${escapeHtml(npc.name.slice(0, 24))}</text></g>`;
    }).join("");
    scene.setAttribute("transform", `translate(${transform.x} ${transform.y}) scale(${transform.scale})`);
    scene.innerHTML = `${edgeMarkup}${nodeMarkup}`;
    cardList.innerHTML = shown.length ? shown.map((npc) => `<button type="button" data-network-card-id="${escapeHtml(npc.id)}" class="${npc.id === selectedNpcId ? "selected" : ""}"><strong>${escapeHtml(npc.name)}</strong><small>${escapeHtml([npc.faction, npc.location].filter(Boolean).join(" · ") || "No faction or location")}</small></button>`).join("") : `<p class="npc-empty">No NPCs match these filters.</p>`;
    renderSelection();
  }

  function clearRelationshipForm() {
    selectedRelationshipId = "";
    relationshipField("id").value = "";
    relationshipField("relationshipType").value = "Knows";
    relationshipField("direction").value = "directed";
    relationshipField("trust").value = "50";
    relationshipField("hostility").value = "0";
    relationshipField("notes").value = "";
    relationshipField("tags").value = "";
    root.querySelector("[data-trust-output]").value = "50";
    root.querySelector("[data-hostility-output]").value = "0";
    root.querySelector('[data-network-action="delete-relationship"]').disabled = true;
    renderGraph();
  }

  function selectRelationship(relationshipId) {
    const relationship = relationships.find((entry) => entry.id === relationshipId);
    if (!relationship) return;
    selectedRelationshipId = relationship.id;
    selectedNpcId = "";
    for (const key of ["id", "sourceNpcId", "targetNpcId", "relationshipType", "direction", "trust", "hostility", "notes"]) relationshipField(key).value = relationship[key] ?? "";
    relationshipField("tags").value = relationship.tags.join(", ");
    root.querySelector("[data-trust-output]").value = String(relationship.trust);
    root.querySelector("[data-hostility-output]").value = String(relationship.hostility);
    root.querySelector('[data-network-action="delete-relationship"]').disabled = false;
    renderGraph();
  }

  function relationshipDraft() {
    return {
      id: relationshipField("id").value,
      sourceNpcId: relationshipField("sourceNpcId").value,
      targetNpcId: relationshipField("targetNpcId").value,
      relationshipType: relationshipField("relationshipType").value,
      direction: relationshipField("direction").value,
      trust: relationshipField("trust").value,
      hostility: relationshipField("hostility").value,
      notes: relationshipField("notes").value,
      tags: relationshipField("tags").value,
      createdAtMillis: relationships.find((entry) => entry.id === relationshipField("id").value)?.createdAtMillis
    };
  }

  async function syncRelationshipReference(relationshipId, previousNpcIds, nextNpcIds) {
    const previous = new Set(previousNpcIds);
    const next = new Set(nextNpcIds);
    const impacted = new Set([...previous, ...next]);
    for (const npcId of impacted) {
      const npc = npcs.find((entry) => entry.id === npcId);
      if (!npc) continue;
      const relationshipIds = npc.relationshipIds.filter((id) => id !== relationshipId);
      if (next.has(npcId)) relationshipIds.push(relationshipId);
      const saved = await npcPersistence.save({ ...npc, relationshipIds });
      npcs = npcs.map((entry) => entry.id === saved.id ? saved : entry);
    }
  }

  async function saveRelationship(event) {
    event.preventDefault();
    const draft = relationshipDraft();
    const errors = validateNpcRelationship(draft);
    if (errors.length) { onStatus(errors.join(" ")); return; }
    const previous = relationships.find((entry) => entry.id === draft.id);
    try {
      const saved = await relationshipPersistence.save(draft);
      relationships = relationships.filter((entry) => entry.id !== saved.id).concat(saved);
      await syncRelationshipReference(saved.id, previous ? [previous.sourceNpcId, previous.targetNpcId] : [], [saved.sourceNpcId, saved.targetNpcId]);
      selectRelationship(saved.id);
      onStatus(`${relationshipLabel(saved, npcById())} saved.`);
    } catch (error) { onStatus(`Relationship could not be saved: ${error.message}`); }
  }

  async function deleteRelationship() {
    const relationship = relationships.find((entry) => entry.id === selectedRelationshipId);
    if (!relationship) return;
    if (globalThis.confirm && !globalThis.confirm("Delete this NPC relationship?")) return;
    try {
      await relationshipPersistence.remove(relationship.id);
      await syncRelationshipReference(relationship.id, [relationship.sourceNpcId, relationship.targetNpcId], []);
      relationships = relationships.filter((entry) => entry.id !== relationship.id);
      clearRelationshipForm();
      onStatus("NPC relationship deleted.");
    } catch (error) { onStatus(`Relationship could not be deleted: ${error.message}`); }
  }

  async function shareKnowledge(event) {
    event.preventDefault();
    const source = npcs.find((npc) => npc.id === shareField("sourceNpcId").value);
    const target = npcs.find((npc) => npc.id === shareField("targetNpcId").value);
    if (!source || !target) { onStatus("Choose both NPCs for the knowledge transfer."); return; }
    try {
      const updated = applyNpcKnowledgeShare(source, target, shareField("knowledgeId").value, getWorldTime());
      const saved = await npcPersistence.save(updated);
      npcs = npcs.map((npc) => npc.id === saved.id ? saved : npc);
      renderKnowledgeOptions();
      renderGraph();
      const knowledge = saved.knowledge.find((entry) => entry.id === shareField("knowledgeId").value);
      onStatus(`${knowledge?.title || "Knowledge"} shared from ${source.name} to ${target.name}.`);
    } catch (error) { onStatus(`Knowledge could not be shared: ${error.message}`); }
  }

  async function refresh() {
    try {
      [npcs, relationships] = await Promise.all([npcPersistence.list(), relationshipPersistence.list()]);
      renderFilterOptions();
      renderNpcOptions();
      renderGraph();
      onStatus(`Relationship Network loaded ${npcs.length} NPCs and ${relationships.length} links.`);
      return { npcs, relationships };
    } catch (error) {
      onStatus(`Relationship Network could not load: ${error.message}`);
      return { npcs: [], relationships: [] };
    }
  }

  for (const control of root.querySelectorAll("[data-network-filter]")) on(control, "input", renderGraph);
  on(relationshipField("trust"), "input", () => { root.querySelector("[data-trust-output]").value = relationshipField("trust").value; });
  on(relationshipField("hostility"), "input", () => { root.querySelector("[data-hostility-output]").value = relationshipField("hostility").value; });
  on(shareField("sourceNpcId"), "change", renderKnowledgeOptions);
  on(relationshipForm, "submit", saveRelationship);
  on(shareForm, "submit", shareKnowledge);
  on(root, "click", (event) => {
    const action = event.target.closest("[data-network-action]")?.dataset.networkAction;
    if (action === "refresh") void refresh();
    if (action === "clear-relationship") clearRelationshipForm();
    if (action === "delete-relationship") void deleteRelationship();
    if (action === "reset-view") { transform = { x: 0, y: 0, scale: 1 }; renderGraph(); }
    const card = event.target.closest("[data-network-card-id]");
    const node = event.target.closest("[data-network-node-id]");
    const edge = event.target.closest("[data-network-edge-id]");
    const open = event.target.closest("[data-network-open-npc]");
    if (card || node) {
      selectedNpcId = (card?.dataset.networkCardId || node?.dataset.networkNodeId || "");
      selectedRelationshipId = "";
      renderGraph();
    }
    if (edge) selectRelationship(edge.dataset.networkEdgeId);
    if (open) onOpenNpc(npcById().get(open.dataset.networkOpenNpc));
  });
  on(canvas, "dblclick", (event) => {
    const node = event.target.closest("[data-network-node-id]");
    if (node) onOpenNpc(npcById().get(node.dataset.networkNodeId));
  });
  on(canvas, "wheel", (event) => {
    event.preventDefault();
    transform.scale = Math.max(0.45, Math.min(2.5, transform.scale * (event.deltaY < 0 ? 1.1 : 0.9)));
    renderGraph();
  }, { passive: false });
  on(canvas, "pointerdown", (event) => {
    const node = event.target.closest("[data-network-node-id]");
    gesture = node
      ? { type: "node", id: node.dataset.networkNodeId, x: event.clientX, y: event.clientY, start: { ...positions.get(node.dataset.networkNodeId) } }
      : { type: "pan", x: event.clientX, y: event.clientY, start: { ...transform } };
    canvas.setPointerCapture?.(event.pointerId);
  });
  on(canvas, "pointermove", (event) => {
    if (!gesture) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (gesture.type === "node") positions.set(gesture.id, { x: gesture.start.x + dx / transform.scale, y: gesture.start.y + dy / transform.scale });
    else transform = { ...transform, x: gesture.start.x + dx, y: gesture.start.y + dy };
    renderGraph();
  });
  const endGesture = () => { gesture = null; };
  on(canvas, "pointerup", endGesture);
  on(canvas, "pointercancel", endGesture);

  return Object.freeze({
    refresh,
    getState: () => ({ npcs: [...npcs], relationships: [...relationships], selectedNpcId, selectedRelationshipId }),
    destroy() { listeners.forEach((removeListener) => removeListener()); }
  });
}
