import { sortWorkshopAssets, workshopSourceKey } from "./workshopModel.js";
import { compareWorkshopVersions } from "./workshopVersioning.js";
import { renderWorkshopCards } from "./workshopBrowser.js";
import { createWorkshopPreview } from "./workshopPreview.js";
import { ensureWorkshopStyles } from "./workshopStyles.js";
import { filterWorkshopAssets } from "./workshopFilters.js";
import { applyWorkshopFavorites, updateWorkshopFavoriteState } from "./workshopFavorites.js";
import { applyWorkshopRecent, createWorkshopRecentStore } from "./workshopRecent.js";
import {
  WORKSHOP_TYPE_FILTERS,
  getWorkshopTypeDefinition
} from "./workshopTypeRegistry.js";

const tabs = Object.freeze([
  ["browse", "Browse"], ["library", "My Library"], ["my", "My Creations"],
  ["room", "Room"], ["favorites", "Favorites"], ["collections", "Collections"],
  ["friends", "Friends / Group"]
]);

export function createWorkshop({
  screen,
  persistence,
  importAsset,
  updateImportedAsset,
  loadImportedAsset,
  onQuickAction = async () => null,
  getCurrentUserId = () => "",
  getCurrentRoomCode = () => "",
  getCurrentIsDM = () => false,
  onNavigate = () => {}
} = {}) {
  if (!screen || !persistence) return { open() {}, refresh() {}, destroy() {} };
  const document = screen.ownerDocument || globalThis.document;
  ensureWorkshopStyles(document);
  screen.innerHTML = `<div class="workshop-shell">
    <header class="workshop-header"><div><span class="workshop-eyebrow">HOME BREW LIBRARY</span><h1>Homebrew Workshop</h1><p>One library for reusable monsters, items, spells, animations, maps, encounters, and future homebrew.</p></div><button type="button" data-workshop-back>Back to Battle</button></header>
    <nav class="workshop-tabs" aria-label="Workshop sections">${tabs.map(([id, label]) => `<button type="button" data-workshop-tab="${id}" aria-selected="false">${label}</button>`).join("")}</nav>
    <section class="workshop-toolbar" data-workshop-toolbar>
      <label>Search<input type="search" data-workshop-search placeholder="Name, description, tags, author"></label>
      <label>Content Type<select data-workshop-type><option value="">All</option>${WORKSHOP_TYPE_FILTERS.map(([id, label]) => `<option value="${id}">${label}</option>`).join("")}</select></label>
      <label>Owner / Source<select data-workshop-source><option value="">All sources</option><option value="mine">Created by me</option><option value="imported">Imported copies</option><option value="room">Room shared</option><option value="friends">Friends / Group</option><option value="public">Public</option></select></label>
      <label>Visibility<select data-workshop-visibility><option value="">All sources</option><option>PRIVATE</option><option>ROOM</option><option>FRIENDS</option><option>PUBLIC</option></select></label>
      <label>Author<input data-workshop-author placeholder="Author"></label>
      <label>Tags<input data-workshop-tag placeholder="undead, boss"></label>
      <label>Collection<select data-workshop-collection><option value="">All collections</option></select></label>
      <label class="workshop-check"><input type="checkbox" data-workshop-recent> Recently Used</label>
      <label>Sort<select data-workshop-sort><option value="updated">Recently Updated</option><option value="created">Recently Added</option><option value="saved">Most Saved</option><option value="name">Name</option></select></label>
      <div class="workshop-specific-filters" data-workshop-specific-filters></div>
    </section>
    <p class="workshop-status" data-workshop-status role="status"></p>
    <section class="workshop-grid" data-workshop-grid aria-live="polite"></section>
    <button type="button" class="workshop-load-more" data-workshop-more hidden>Load More</button>
    <section class="workshop-collections workshop-hidden" data-workshop-collections></section>
  </div>
  <dialog class="workshop-dialog" data-workshop-preview-dialog></dialog>
  <dialog class="workshop-dialog" data-workshop-publish-dialog>
    <div class="workshop-dialog-heading"><div><span class="workshop-eyebrow">PUBLISH CREATION</span><h2 data-workshop-publish-title>Publish to Workshop</h2></div><button type="button" data-workshop-publish-close>Close</button></div>
    <form class="workshop-publish-form" data-workshop-publish-form>
      <label>Name<input required maxlength="120" data-workshop-publish-name></label>
      <label>Description<textarea maxlength="2000" data-workshop-publish-description></textarea></label>
      <label>Tags<input maxlength="400" data-workshop-publish-tags placeholder="undead, boss, dungeon"></label>
      <label>Visibility<select data-workshop-publish-visibility><option value="PRIVATE">Private</option><option value="ROOM">Current Room</option><option value="FRIENDS">Friends / Group</option><option value="PUBLIC">Public (schema ready)</option></select></label>
      <p data-workshop-publish-existing></p>
      <div class="workshop-publish-actions"><button type="submit" data-workshop-publish-mode="publish">Publish</button><button type="button" data-workshop-publish-mode="update">Update Published Version</button><button type="button" data-workshop-publish-mode="new-version">Create New Version</button><button type="button" data-workshop-publish-mode="unchanged">Leave Published Version Unchanged</button></div>
      <p data-workshop-publish-status role="status"></p>
    </form>
  </dialog>`;

  const field = (name) => screen.querySelector(`[data-workshop-${name}]`) || document.querySelector(`[data-workshop-${name}]`);
  const grid = field("grid");
  const status = (message) => { field("status").textContent = message; };
  let scope = "browse";
  let entries = [];
  let cursors = {};
  let hasMore = false;
  let loading = false;
  let destroyed = false;
  let publishRequest = null;
  let activeCollection = null;
  let searchTimer = 0;
  let libraryState = { favoriteIds: new Set(), imports: new Map(), collections: [] };
  const recent = createWorkshopRecentStore({ getUserId: getCurrentUserId });
  const listeners = [];
  const on = (element, event, handler) => {
    element?.addEventListener(event, handler);
    if (element) listeners.push(() => element.removeEventListener(event, handler));
  };

  function filters() {
    const current = {
      search: field("search").value,
      assetType: field("type").value,
      source: field("source").value,
      visibility: field("visibility").value,
      author: field("author").value,
      tags: field("tag").value,
      collectionId: field("collection").value,
      recentOnly: field("recent").checked,
      sort: field("sort").value,
      currentUserId: getCurrentUserId()
    };
    for (const input of field("specific-filters").querySelectorAll("[data-workshop-specific-filter]")) {
      current[input.dataset.workshopSpecificFilter] = input.value;
    }
    return current;
  }

  function visibleEntries() {
    const current = filters();
    return sortWorkshopAssets(filterWorkshopAssets(entries, current), current.sort);
  }

  function renderTypeFilters() {
    const root = field("specific-filters");
    root.replaceChildren();
    const selected = field("type").value;
    if (!selected) return;
    const definitions = selected === "item"
      ? [getWorkshopTypeDefinition("magic-item")]
      : [getWorkshopTypeDefinition(selected)];
    for (const definition of definitions) {
      for (const descriptor of definition.filters) {
        const label = document.createElement("label");
        label.textContent = descriptor.label;
        const input = descriptor.options?.length ? document.createElement("select") : document.createElement("input");
        input.dataset.workshopSpecificFilter = descriptor.id;
        if (descriptor.options?.length) {
          input.append(new Option("Any", ""));
          for (const [optionValue, optionLabel] of descriptor.options) input.append(new Option(optionLabel, optionValue));
        } else input.placeholder = `Any ${descriptor.label.toLowerCase()}`;
        input.addEventListener("input", render);
        label.append(input);
        root.append(label);
      }
    }
  }

  function syncCollectionFilter() {
    const select = field("collection");
    const selected = select.value;
    select.replaceChildren(new Option("All collections", ""));
    for (const item of libraryState.collections || []) select.append(new Option(item.name, item.collectionId));
    select.value = [...select.options].some((option) => option.value === selected) ? selected : "";
  }

  function decorateEntries(items) {
    const collectionByAsset = new Map();
    for (const item of libraryState.collections || []) {
      for (const assetId of item.assetIds || []) {
        const current = collectionByAsset.get(assetId) || { ids: [], names: [] };
        current.ids.push(item.collectionId); current.names.push(item.name);
        collectionByAsset.set(assetId, current);
      }
    }
    const imported = (items || []).map((entry) => {
      const importRecord = libraryState.imports?.get?.(entry.assetId);
      const collections = collectionByAsset.get(entry.assetId) || { ids: [], names: [] };
      return {
        ...entry,
        ...(importRecord ? {
          imported: true,
          localRecordId: importRecord.localRecordId,
          sourceWorkshopVersion: importRecord.sourceWorkshopVersion || entry.version || 1
        } : {}),
        collectionIds: [...new Set([...(entry.collectionIds || []), ...collections.ids])],
        collectionNames: collections.names
      };
    });
    return applyWorkshopRecent(applyWorkshopFavorites(imported, libraryState.favoriteIds), recent.list());
  }

  async function loadFull(asset) {
    if (asset.imported && typeof loadImportedAsset === "function") {
      const owned = await loadImportedAsset(asset);
      if (owned?.content) return { ...asset, ...owned, imported: true };
    }
    if (asset.imported) return persistence.loadAsset(asset.assetId, asset.sourceWorkshopVersion);
    return persistence.loadAsset(asset.assetId);
  }

  async function importFull(asset, output = field("status"), replaceRecordId = "") {
    const full = asset.content ? asset : await persistence.loadAsset(asset.assetId);
    output.textContent = `Adding ${full.name} to your library…`;
    const result = replaceRecordId
      ? await updateImportedAsset?.(full, replaceRecordId)
      : await importAsset?.(full);
    if (!result?.recordId) throw new Error("This asset type does not have a library importer yet.");
    await persistence.recordImport(full, result.recordId);
    recent.record(full, replaceRecordId ? "update-copy" : "import");
    output.textContent = replaceRecordId
      ? `Updated your independent copy of ${full.name}.`
      : `Added an independent copy of ${full.name} to your library.`;
    return result;
  }

  const preview = createWorkshopPreview({
    dialog: field("preview-dialog"),
    onImport: async (asset, output) => { try { await importFull(asset, output); } catch (error) { output.textContent = error.message; } },
    onRemix: async (asset, output) => { try { await remixAsset(asset); output.textContent = "Remix created in My Creations."; } catch (error) { output.textContent = error.message; } }
  });

  async function previewAsset(asset) {
    try { status("Loading full preview…"); preview.open(await loadFull(asset)); recent.record(asset, "preview"); entries = decorateEntries(entries); status("Preview loaded. Nothing was imported."); }
    catch (error) { status(asset.imported ? `${error.message} Your independent library copy remains available.` : error.message); }
  }

  async function favoriteAsset(asset, button) {
    try {
      asset.favorite = !asset.favorite;
      await persistence.toggleFavorite(asset, asset.favorite);
      if (asset.favorite) libraryState.favoriteIds.add(asset.assetId); else libraryState.favoriteIds.delete(asset.assetId);
      entries = updateWorkshopFavoriteState(entries, asset.assetId, asset.favorite);
      button.textContent = asset.favorite ? "★ Favorited" : "☆ Favorite";
      status(asset.favorite ? "Added to Saved favorites." : "Removed from Saved favorites.");
    } catch (error) { status(error.message); }
  }

  async function addToCollection(asset) {
    try {
      let collections = await persistence.listCollections();
      if (!collections.length) {
        const name = globalThis.prompt?.("Name your first collection:", "My Homebrew Pack");
        if (!name) return;
        collections = [await persistence.saveCollection({ name, description: "", visibility: "PRIVATE", assetIds: [] })];
      }
      const promptText = collections.map((entry, index) => `${index + 1}. ${entry.name}`).join("\n");
      const choice = Number(globalThis.prompt?.(`Add to which collection?\n${promptText}`, "1")) - 1;
      if (!collections[choice]) return;
      await persistence.setCollectionAsset(collections[choice], asset.assetId, true);
      status(`Added ${asset.name} to ${collections[choice].name}.`);
    } catch (error) { status(error.message); }
  }

  async function remixAsset(asset) {
    const full = asset.content ? asset : await persistence.loadAsset(asset.assetId);
    const name = globalThis.prompt?.("Name your remix:", `${full.name} Remix`);
    if (!name) return null;
    const remixed = await persistence.remix(full.assetId, { name });
    status(`Created ${remixed.name}.`);
    return remixed;
  }

  async function runQuickAction(asset, actionId) {
    try {
      status(`Preparing ${asset.name}…`);
      let localRecordId = asset.localRecordId || "";
      let full = await loadFull(asset);
      if (["edit-copy", "create-token", "add-to-character", "use-map", "use-encounter", "use-summon"].includes(actionId) && !asset.imported) {
        const imported = await importFull(full);
        localRecordId = imported.recordId;
        if (typeof loadImportedAsset === "function") {
          full = await loadImportedAsset({ ...asset, imported: true, localRecordId, sourceWorkshopVersion: full.version });
        }
      }
      recent.record(asset, actionId);
      entries = decorateEntries(entries);
      const result = await onQuickAction({ actionId, asset: full, localRecordId });
      status(result?.message || `${getWorkshopTypeDefinition(asset.assetType).singular} action ready: ${actionId.replace(/-/g, " ")}.`);
    } catch (error) { status(error.message || "That library action is unavailable."); }
  }

  async function deleteAsset(asset) {
    if (!globalThis.confirm?.(`Delete “${asset.name}” from the Workshop? Imported copies will not be deleted.`)) return;
    try { await persistence.deleteAsset(asset.assetId); entries = entries.filter((entry) => entry.assetId !== asset.assetId); render(); status("Workshop asset deleted. Existing imported copies were not changed."); }
    catch (error) { status(error.message); }
  }

  async function viewChanges(asset) {
    try {
      const [previous, latest] = await Promise.all([
        persistence.loadAsset(asset.assetId, asset.sourceWorkshopVersion),
        persistence.loadAsset(asset.assetId, asset.latestVersion)
      ]);
      const changes = compareWorkshopVersions(previous.content, latest.content);
      const copy = { ...latest, assetType: "other", name: `Changes: ${asset.name}`, content: changes.length ? changes : [{ path: "metadata", before: `v${asset.sourceWorkshopVersion}`, after: `v${asset.latestVersion}` }] };
      preview.open(copy);
    } catch (error) { status(error.message); }
  }

  async function updateCopy(asset) {
    try {
      const latest = await persistence.loadAsset(asset.assetId, asset.latestVersion);
      await importFull(latest, field("status"), asset.localRecordId);
      await refresh();
    } catch (error) { status(error.message); }
  }

  function render() {
    if (scope === "collections") return renderCollections();
    const emptyMessage = scope === "friends"
      ? "No Friends / Group assets are available."
      : scope === "room" && !getCurrentRoomCode()
        ? "Open a room to browse its shared library."
        : scope === "library"
          ? "Your library is empty. Create homebrew or add an independent copy from Browse."
          : scope === "favorites"
            ? "No favorites yet. Favoriting keeps a shortcut without importing the asset."
            : "No library assets match these filters.";
    renderWorkshopCards(grid, visibleEntries(), {
      currentUserId: getCurrentUserId(),
      canRemoveFromRoom: getCurrentIsDM() && scope === "room",
      activeCollection,
      emptyMessage,
      preview: previewAsset,
      importAsset: async (asset) => { try { await importFull(asset); } catch (error) { status(error.message); } },
      favorite: favoriteAsset,
      collection: addToCollection,
      removeFromCollection: async (asset) => {
        if (!activeCollection) return;
        try {
          activeCollection = await persistence.setCollectionAsset(activeCollection, asset.assetId, false);
          entries = entries.filter((entry) => entry.assetId !== asset.assetId);
          render(); status(`Removed ${asset.name} from ${activeCollection.name}.`);
        } catch (error) { status(error.message); }
      },
      remix: async (asset) => { try { await remixAsset(asset); } catch (error) { status(error.message); } },
      deleteAsset,
      removeFromRoom: async (asset) => {
        try {
          if (!globalThis.confirm?.(`Remove “${asset.name}” from this room library?`)) return;
          await persistence.removeFromRoom(asset.assetId);
          entries = entries.filter((entry) => entry.assetId !== asset.assetId);
          render(); status("Asset removed from the room library. The author's asset and imported copies remain intact.");
        } catch (error) { status(error.message); }
      },
      viewChanges,
      keepVersion: (asset) => status(`Kept your independent version ${asset.sourceWorkshopVersion} copy.`),
      updateCopy,
      quickAction: (asset, actionId) => void runQuickAction(asset, actionId)
    });
    field("more").hidden = !hasMore;
  }

  async function augmentSavedVersions(items) {
    if (scope !== "library") return items;
    await Promise.all(items.filter((entry) => entry.imported).map(async (entry) => {
      try { const latest = await persistence.getSummary(entry.assetId); entry.latestVersion = latest?.version || entry.sourceWorkshopVersion; }
      catch { entry.latestVersion = entry.sourceWorkshopVersion; }
    }));
    return items;
  }

  async function refresh({ append = false } = {}) {
    if (loading || destroyed) return;
    loading = true;
    status("Loading Workshop summaries…");
    try {
      if (typeof persistence.listLibraryState === "function") {
        libraryState = await persistence.listLibraryState();
      }
      syncCollectionFilter();
      const result = await persistence.listAssets({ scope, cursors: append ? cursors : {} });
      const next = await augmentSavedVersions(result.entries);
      const merged = append ? [...new Map([...entries, ...next].map((entry) => [entry.assetId, entry])).values()] : next;
      entries = decorateEntries(merged);
      cursors = result.cursors; hasMore = result.hasMore;
      render(); status(`${visibleEntries().length} asset${visibleEntries().length === 1 ? "" : "s"} shown. Full content loads only when you preview or use it.`);
    } catch (error) {
      entries = [];
      render();
      status(error.message || "The Workshop could not be loaded.");
    }
    finally { loading = false; }
  }

  async function renderCollections() {
    field("toolbar").classList.add("workshop-hidden");
    grid.classList.add("workshop-hidden");
    field("more").hidden = true;
    const root = field("collections"); root.classList.remove("workshop-hidden"); root.replaceChildren();
    const create = document.createElement("button"); create.type = "button"; create.textContent = "Create Collection";
    create.addEventListener("click", async () => {
      const name = globalThis.prompt?.("Collection name:", "New Collection"); if (!name) return;
      await persistence.saveCollection({ name, description: "", visibility: "PRIVATE", assetIds: [] }); await renderCollections();
    });
    root.append(create);
    try {
      const collections = await persistence.listCollections();
      for (const item of collections) {
        const card = document.createElement("article"); card.className = "workshop-collection";
        const title = document.createElement("h3"); title.textContent = item.name;
        const meta = document.createElement("p"); meta.textContent = `${item.assetIds.length} assets · ${item.visibility}`;
        const actions = document.createElement("div"); actions.className = "workshop-collection-actions";
        const browse = document.createElement("button"); browse.type = "button"; browse.textContent = "Browse Collection";
        browse.addEventListener("click", async () => {
          activeCollection = item;
          scope = "collection";
          entries = decorateEntries(await persistence.listCollectionAssets(item));
          field("toolbar").classList.remove("workshop-hidden"); grid.classList.remove("workshop-hidden"); root.classList.add("workshop-hidden");
          for (const button of screen.querySelectorAll("[data-workshop-tab]")) button.setAttribute("aria-selected", "false");
          render(); status(`Browsing ${item.name}: ${entries.length} accessible asset${entries.length === 1 ? "" : "s"}.`);
        });
        const rename = document.createElement("button"); rename.type = "button"; rename.textContent = "Rename";
        rename.addEventListener("click", async () => { const name = globalThis.prompt?.("Collection name:", item.name); if (name) { await persistence.saveCollection({ ...item, name }); await renderCollections(); } });
        const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "Delete";
        remove.addEventListener("click", async () => { if (globalThis.confirm?.(`Delete collection “${item.name}”? Assets are not deleted.`)) { await persistence.deleteCollection(item.collectionId); await renderCollections(); } });
        actions.append(browse, rename, remove); card.append(title, meta, actions); root.append(card);
      }
      if (!collections.length) { const empty = document.createElement("p"); empty.textContent = "Create a collection to group mixed Workshop assets without duplicating them."; root.append(empty); }
      status(`${collections.length} collection${collections.length === 1 ? "" : "s"}.`);
    } catch (error) { status(error.message); }
  }

  function setScope(next) {
    const requested = next === "saved" ? "library" : next;
    scope = tabs.some(([id]) => id === requested) ? requested : "browse";
    activeCollection = null;
    for (const button of screen.querySelectorAll("[data-workshop-tab]")) button.setAttribute("aria-selected", String(button.dataset.workshopTab === scope));
    field("toolbar").classList.toggle("workshop-hidden", scope === "collections");
    grid.classList.toggle("workshop-hidden", scope === "collections");
    field("collections").classList.toggle("workshop-hidden", scope !== "collections");
    entries = []; cursors = {}; hasMore = false;
    void refresh();
  }

  function showPublishDialog(request, existing) {
    publishRequest = { request, existing };
    field("publish-name").value = request.name || request.content?.name || "";
    field("publish-description").value = request.description || request.content?.description || request.content?.notes || "";
    field("publish-tags").value = (request.tags || []).join(", ");
    field("publish-visibility").value = request.visibility || (getCurrentRoomCode() ? "ROOM" : "PRIVATE");
    field("publish-existing").textContent = existing ? `Published version ${existing.version} already exists. Choose how to handle your edits.` : "Publishing creates a reusable copy; the original creator record is not changed.";
    field("publish-status").textContent = "";
    const submit = field("publish-form").querySelector('[data-workshop-publish-mode="publish"]');
    submit.hidden = Boolean(existing);
    for (const mode of ["update", "new-version", "unchanged"]) field("publish-form").querySelector(`[data-workshop-publish-mode="${mode}"]`).hidden = !existing;
    if (!field("publish-dialog").open) field("publish-dialog").showModal?.();
  }

  async function publishWithMode(mode) {
    if (!publishRequest) return;
    if (mode === "unchanged") { field("publish-dialog").close(); status("Published version left unchanged."); return; }
    const { request, existing } = publishRequest;
    field("publish-status").textContent = "Publishing…";
    try {
      const published = await persistence.publish({
        ...request,
        assetId: existing?.assetId || request.assetId,
        sourceKey: request.sourceKey || workshopSourceKey(request.assetType, request.sourceRecordId, request.sourceScope),
        name: field("publish-name").value,
        description: field("publish-description").value,
        tags: field("publish-tags").value,
        visibility: field("publish-visibility").value,
        roomCode: getCurrentRoomCode(),
        content: request.content
      }, { assetId: existing?.assetId || "", mode: mode === "new-version" ? "new-version" : "update" });
      field("publish-dialog").close();
      status(`Published ${published.name} version ${published.version}.`);
      onNavigate("workshop"); setScope("my");
    } catch (error) { field("publish-status").textContent = error.message; }
  }

  async function publishFromCreator(request) {
    try {
      const sourceKey = request.sourceKey || workshopSourceKey(request.assetType, request.sourceRecordId, request.sourceScope);
      const existing = sourceKey ? await persistence.findOwnedSource(sourceKey) : null;
      showPublishDialog({ ...request, sourceKey }, existing);
    } catch (error) { status(error.message); onNavigate("workshop"); }
  }

  function open({ tab = "browse", assetType = "" } = {}) {
    onNavigate("workshop");
    const requestedType = assetType ? getWorkshopTypeDefinition(assetType) : null;
    field("type").value = requestedType?.group === "item" ? "item" : requestedType?.id || "";
    renderTypeFilters();
    setScope(tab);
  }

  for (const button of screen.querySelectorAll("[data-workshop-tab]")) on(button, "click", () => setScope(button.dataset.workshopTab));
  on(field("back"), "click", () => onNavigate("battle"));
  on(field("more"), "click", () => refresh({ append: true }));
  on(field("type"), "input", () => { renderTypeFilters(); render(); });
  for (const name of ["source", "visibility", "author", "tag", "collection", "recent", "sort"]) on(field(name), "input", render);
  on(field("search"), "input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(render, 250); });
  on(field("publish-close"), "click", () => field("publish-dialog").close());
  on(field("publish-form"), "submit", (event) => { event.preventDefault(); void publishWithMode("publish"); });
  for (const mode of ["update", "new-version", "unchanged"]) on(field("publish-form").querySelector(`[data-workshop-publish-mode="${mode}"]`), "click", () => void publishWithMode(mode));
  setScope("browse");

  return Object.freeze({
    open, refresh, publishFromCreator,
    destroy() { destroyed = true; clearTimeout(searchTimer); preview.destroy(); listeners.forEach((remove) => remove()); }
  });
}
