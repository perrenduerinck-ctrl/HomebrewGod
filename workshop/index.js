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
  ["friends", "Friends / Group — Coming Soon", true]
]);

export function createWorkshop({
  screen,
  persistence,
  libraryAggregator = null,
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
    <nav class="workshop-tabs" aria-label="Workshop sections">${tabs.map(([id, label, disabled]) => `<button type="button" data-workshop-tab="${id}" aria-selected="false" ${disabled ? "disabled aria-disabled=\"true\"" : ""}>${label}</button>`).join("")}</nav>
    <section class="workshop-toolbar" data-workshop-toolbar>
      <label>Search<input type="search" data-workshop-search placeholder="Name, description, tags, author"></label>
      <label>Content Type<select data-workshop-type><option value="">All</option>${WORKSHOP_TYPE_FILTERS.map(([id, label]) => `<option value="${id}">${label}</option>`).join("")}</select></label>
      <label>Owner / Source<select data-workshop-source><option value="">All sources</option><option value="mine">Created by me</option><option value="imported">Imported copies</option><option value="room">Room shared</option><option value="friends">Friends / Group</option><option value="public">Public</option></select></label>
      <label>Campaign<select data-workshop-campaign><option value="">All Sources</option><option value="campaigns">All Campaigns</option><option value="personal">Personal</option><option value="current">Current Room</option></select></label>
      <label>Visibility<select data-workshop-visibility><option value="">All sources</option><option>PRIVATE</option><option>ROOM</option><option>FRIENDS</option><option>PUBLIC</option></select></label>
      <label>Author<input data-workshop-author placeholder="Author"></label>
      <label>Tags<input data-workshop-tag placeholder="undead, boss"></label>
      <label>Collection<select data-workshop-collection><option value="">All collections</option></select></label>
      <label class="workshop-check"><input type="checkbox" data-workshop-recent> Recently Used</label>
      <label>Sort<select data-workshop-sort><option value="updated">Recently Updated</option><option value="recent">Recently Used</option><option value="name">Name</option><option value="created">Recently Added</option></select></label>
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
  </dialog>
  <dialog class="workshop-dialog workshop-collection-dialog" data-workshop-collection-dialog>
    <div class="workshop-dialog-heading"><div><span class="workshop-eyebrow">COLLECTION</span><h2 data-workshop-collection-dialog-title>New Collection</h2></div><button type="button" data-workshop-collection-cancel>Close</button></div>
    <form class="workshop-collection-form" data-workshop-collection-form>
      <label>Collection Name<input required maxlength="120" data-workshop-collection-name></label>
      <label>Description<textarea maxlength="1000" rows="4" data-workshop-collection-description></textarea></label>
      <label>Visibility<select data-workshop-collection-visibility><option value="PRIVATE">Private</option><option value="ROOM">Room</option></select></label>
      <div class="workshop-publish-actions"><button type="submit">Save Collection</button><button type="button" data-workshop-collection-cancel>Cancel</button></div>
      <p data-workshop-collection-status role="status"></p>
    </form>
  </dialog>
  <dialog class="workshop-dialog workshop-collection-dialog" data-workshop-membership-dialog>
    <div class="workshop-dialog-heading"><div><span class="workshop-eyebrow">ORGANIZE</span><h2>Add to Collections</h2><p data-workshop-membership-asset></p></div><button type="button" data-workshop-membership-cancel>Close</button></div>
    <form data-workshop-membership-form>
      <div class="workshop-collection-membership" data-workshop-membership-list></div>
      <button type="button" data-workshop-membership-create>+ Create New Collection</button>
      <div class="workshop-publish-actions"><button type="submit">Save</button><button type="button" data-workshop-membership-cancel>Cancel</button></div>
      <p data-workshop-membership-status role="status"></p>
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
  let editingCollection = null;
  let membershipAsset = null;
  let afterCollectionSave = null;
  let campaigns = [];
  let summaryReads = 0;
  let loadError = "";
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
      campaign: field("campaign").value,
      currentRoomCode: getCurrentRoomCode(),
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

  function syncCampaignFilter() {
    const select = field("campaign");
    const selected = select.value;
    select.replaceChildren(
      new Option("All Sources", ""),
      new Option("All Campaigns", "campaigns"),
      new Option("Personal", "personal"),
      new Option("Current Room", "current")
    );
    for (const campaign of campaigns) select.append(new Option(campaign.roomName, `room:${campaign.roomCode}`));
    select.value = [...select.options].some((option) => option.value === selected) ? selected : "";
  }

  function decorateEntries(items) {
    const collectionByAsset = new Map();
    for (const item of libraryState.collections || []) {
      for (const assetId of [...new Set([...(item.entries || []), ...(item.assetIds || [])])]) {
        const current = collectionByAsset.get(assetId) || { ids: [], names: [] };
        current.ids.push(item.collectionId); current.names.push(item.name);
        collectionByAsset.set(assetId, current);
      }
    }
    const imported = (items || []).map((entry) => {
      const importRecord = libraryState.imports?.get?.(entry.workshopAssetId || entry.assetId);
      const collectionKeys = [entry.libraryId, entry.assetId, entry.publishedAssetId, entry.workshopAssetId, entry.sourceWorkshopAssetId].filter(Boolean);
      const collections = collectionKeys.reduce((result, key) => {
        const match = collectionByAsset.get(key);
        if (match) { result.ids.push(...match.ids); result.names.push(...match.names); }
        return result;
      }, { ids: [], names: [] });
      return {
        ...entry,
        ...(importRecord ? {
          imported: true,
          localRecordId: importRecord.localRecordId,
          sourceWorkshopVersion: importRecord.sourceWorkshopVersion || entry.version || 1
        } : {}),
        collectionIds: [...new Set([...(entry.collectionIds || []), ...collections.ids])],
        collectionNames: [...new Set(collections.names)]
      };
    });
    return applyWorkshopRecent(applyWorkshopFavorites(imported, libraryState.favoriteIds), recent.list());
  }

  function includeUnavailableCollectionEntries(items) {
    const collectionId = field("collection").value;
    if (!collectionId) return items;
    const selected = (libraryState.collections || []).find((entry) => entry.collectionId === collectionId);
    if (!selected) return items;
    const available = new Set(items.flatMap((entry) => [entry.libraryId, entry.assetId, entry.publishedAssetId, entry.workshopAssetId, entry.sourceWorkshopAssetId].filter(Boolean)));
    const missing = [...new Set([...(selected.entries || []), ...(selected.assetIds || [])])].filter((entry) => !available.has(entry));
    return [...items, ...missing.map((libraryId) => ({
      libraryId,
      assetId: libraryId,
      assetType: String(libraryId).includes(":") ? String(libraryId).split(":", 1)[0] : "other",
      sourceType: "unavailable",
      sourceKind: "campaign",
      sourceRecordId: String(libraryId),
      name: "Unavailable asset",
      description: "This collection reference no longer resolves. Remove it from the collection or let account repair restore its index entry.",
      authorName: "Source unavailable",
      tags: [],
      libraryRecord: true,
      nativeRecord: false,
      unavailable: true,
      visibility: "PRIVATE",
      collectionIds: [collectionId],
      collectionNames: [selected.name]
    }))];
  }

  async function loadFull(asset) {
    if (asset.libraryRecord && libraryAggregator) return libraryAggregator.load(asset);
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
      membershipAsset = asset;
      const collections = await persistence.listCollections();
      renderMembershipChoices(collections, asset);
      field("membership-asset").textContent = asset.name;
      field("membership-status").textContent = collections.length ? "Choose one or more collections." : "Create a collection to organize this asset.";
      if (!field("membership-dialog").open) field("membership-dialog").showModal?.();
    } catch (error) { status(error.message); }
  }

  function openCollectionEditor(collectionRecord = null, onSaved = null) {
    editingCollection = collectionRecord;
    afterCollectionSave = onSaved;
    field("collection-dialog-title").textContent = collectionRecord ? "Edit Collection" : "New Collection";
    field("collection-name").value = collectionRecord?.name || "";
    field("collection-description").value = collectionRecord?.description || "";
    field("collection-visibility").value = collectionRecord?.visibility === "ROOM" ? "ROOM" : "PRIVATE";
    field("collection-status").textContent = "";
    if (!field("collection-dialog").open) field("collection-dialog").showModal?.();
  }

  function renderMembershipChoices(collections, asset) {
    const root = field("membership-list");
    root.replaceChildren();
    const keys = new Set([asset.libraryId, asset.assetId, asset.publishedAssetId, asset.workshopAssetId, asset.sourceWorkshopAssetId].filter(Boolean));
    for (const item of collections) {
      const label = document.createElement("label");
      label.className = "workshop-collection-choice";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = item.collectionId;
      input.dataset.workshopMembershipCollection = item.collectionId;
      input.checked = [...(item.entries || []), ...(item.assetIds || [])].some((entry) => keys.has(entry));
      const text = document.createElement("span");
      text.textContent = item.name;
      label.append(input, text);
      root.append(label);
    }
    if (!collections.length) {
      const empty = document.createElement("p");
      empty.textContent = "No collections yet.";
      root.append(empty);
    }
  }

  function collectionKeysForAsset(asset) {
    return [...new Set([
      asset.libraryId,
      asset.assetId,
      asset.publishedAssetId,
      asset.workshopAssetId,
      asset.sourceWorkshopAssetId
    ].filter(Boolean))];
  }

  async function updateCollectionMembership(collection, asset, included) {
    const libraryId = asset.libraryId || asset.assetId;
    let updated = collection;
    if (typeof persistence.setCollectionEntry === "function") {
      updated = await persistence.setCollectionEntry(updated, libraryId, included);
    } else {
      updated = await persistence.setCollectionAsset(updated, libraryId, included);
    }
    if (!included && typeof persistence.setCollectionAsset === "function") {
      for (const legacyId of collectionKeysForAsset(asset)) {
        if ((updated.assetIds || []).includes(legacyId)) {
          updated = await persistence.setCollectionAsset(updated, legacyId, false);
        }
      }
    }
    return updated;
  }

  async function saveMembership() {
    if (!membershipAsset) return;
    const collections = await persistence.listCollections();
    const selected = new Set([...field("membership-list").querySelectorAll("[data-workshop-membership-collection]:checked")].map((input) => input.value));
    for (const item of collections) {
      const existing = new Set([...(item.entries || []), ...(item.assetIds || [])]);
      const included = selected.has(item.collectionId);
      const currentlyIncluded = collectionKeysForAsset(membershipAsset).some((key) => existing.has(key));
      if (included === currentlyIncluded) continue;
      await updateCollectionMembership(item, membershipAsset, included);
    }
    field("membership-dialog").close();
    libraryState = await persistence.listLibraryState();
    syncCollectionFilter();
    entries = decorateEntries(entries);
    render();
    status(`Updated collections for ${membershipAsset.name}.`);
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
      if (["edit-copy", "create-token", "add-to-character", "use-map", "use-encounter", "use-summon"].includes(actionId) && !asset.imported && !asset.libraryRecord) {
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

  async function publishLibraryAsset(asset) {
    try {
      const full = await loadFull(asset);
      await publishFromCreator({
        assetType: asset.assetType,
        sourceType: asset.sourceType || asset.assetType,
        sourceRecordId: asset.sourceRecordId,
        sourceScope: asset.sourceScope,
        sourceKey: asset.sourceKey || asset.libraryId,
        name: asset.name,
        description: asset.description,
        thumbnailUrl: asset.thumbnailUrl,
        tags: asset.tags,
        content: full.content || full
      });
    } catch (error) { status(error.message || "That library record could not be published."); }
  }

  async function deleteAsset(asset) {
    if (!globalThis.confirm?.(`Delete “${asset.name}” from the Workshop? Imported copies will not be deleted.`)) return;
    try { await persistence.deleteAsset(asset.assetId); entries = entries.filter((entry) => entry.assetId !== asset.assetId); render(); status("Workshop asset deleted. Existing imported copies were not changed."); }
    catch (error) { status(error.message); }
  }

  async function viewChanges(asset) {
    try {
      const [previous, latest] = await Promise.all([
        persistence.loadAsset(asset.workshopAssetId || asset.assetId, asset.sourceWorkshopVersion),
        persistence.loadAsset(asset.workshopAssetId || asset.assetId, asset.latestVersion)
      ]);
      const changes = compareWorkshopVersions(previous.content, latest.content);
      const copy = { ...latest, assetType: "other", name: `Changes: ${asset.name}`, content: changes.length ? changes : [{ path: "metadata", before: `v${asset.sourceWorkshopVersion}`, after: `v${asset.latestVersion}` }] };
      preview.open(copy);
    } catch (error) { status(error.message); }
  }

  async function updateCopy(asset) {
    try {
      const latest = await persistence.loadAsset(asset.workshopAssetId || asset.assetId, asset.latestVersion);
      await importFull(latest, field("status"), asset.localRecordId);
      await refresh();
    } catch (error) { status(error.message); }
  }

  function render() {
    if (scope === "collections") return renderCollections();
    const emptyMessage = loadError
      ? `Library unavailable: ${loadError}`
      : scope === "friends"
      ? "No Friends / Group assets are available."
      : scope === "room" && !getCurrentRoomCode()
        ? "Open a room to browse its shared library."
        : scope === "library" && entries.length === 0
          ? "Your library is empty. Create a monster, animation, map, or import something from the Workshop."
          : scope === "favorites"
            ? "No favorites yet. Favoriting keeps a shortcut without importing the asset."
            : "No library assets match these filters.";
    renderWorkshopCards(grid, visibleEntries(), {
      currentUserId: getCurrentUserId(),
      currentRoomCode: getCurrentRoomCode(),
      canRemoveFromRoom: getCurrentIsDM() && scope === "room",
      activeCollection,
      emptyMessage,
      preview: previewAsset,
      importAsset: async (asset) => { try { await importFull(asset); } catch (error) { status(error.message); } },
      favorite: favoriteAsset,
      collection: addToCollection,
      publishLibrary: publishLibraryAsset,
      copyToCurrentRoom: (asset) => void runQuickAction(asset, "copy-to-current-room"),
      removeFromCollection: async (asset) => {
        if (!activeCollection) return;
        try {
          const libraryId = asset.libraryId || asset.assetId;
          activeCollection = await updateCollectionMembership(activeCollection, asset, false);
          entries = entries.filter((entry) => (entry.libraryId || entry.assetId) !== libraryId);
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
    return Promise.all(items.map(async (entry) => {
      if (!entry.imported) return entry;
      try {
        const latest = await persistence.getSummary(entry.workshopAssetId || entry.assetId);
        return { ...entry, latestVersion: latest?.version || entry.sourceWorkshopVersion };
      } catch { return { ...entry, latestVersion: entry.sourceWorkshopVersion }; }
    }));
  }

  async function refresh({ append = false } = {}) {
    if (loading || destroyed) return;
    loading = true;
    loadError = "";
    status(append ? "Loading more lightweight summaries…" : ["library", "my"].includes(scope) ? "Loading your account-wide library…" : "Loading Workshop summaries…");
    try {
      if (typeof persistence.listLibraryState === "function") {
        libraryState = await persistence.listLibraryState();
      }
      syncCollectionFilter();
      if (!append && ["library", "my"].includes(scope) && libraryAggregator) {
        libraryAggregator.invalidate?.();
        campaigns = await libraryAggregator.listCampaigns?.({ refresh: true }) || [];
        syncCampaignFilter();
      }
      const result = ["library", "my"].includes(scope) && libraryAggregator
        ? typeof libraryAggregator.listPage === "function"
          ? await libraryAggregator.listPage({ scope, cursors: append ? cursors : {}, pageSize: 50 })
          : { entries: await libraryAggregator.list({ scope }), cursors: {}, hasMore: false, metrics: {} }
        : await persistence.listAssets({ scope, cursors: append ? cursors : {} });
      const selectedCollection = (libraryState.collections || []).find((entry) => entry.collectionId === field("collection").value);
      const collectionIds = selectedCollection ? [...new Set([...(selectedCollection.entries || []), ...(selectedCollection.assetIds || [])])] : [];
      const resolved = !append && ["library", "my"].includes(scope) && collectionIds.length && typeof libraryAggregator?.resolveLibraryIds === "function"
        ? await libraryAggregator.resolveLibraryIds(collectionIds, { scope })
        : { entries: [], metrics: {} };
      const pageAndCollection = [...new Map([...(result.entries || []), ...(resolved.entries || [])]
        .map((entry) => [entry.libraryId || entry.assetId, entry])).values()];
      const next = await augmentSavedVersions(pageAndCollection);
      const merged = append ? [...new Map([...entries, ...next].map((entry) => [entry.libraryId || entry.assetId, entry])).values()] : next;
      entries = decorateEntries(includeUnavailableCollectionEntries(merged));
      cursors = result.cursors; hasMore = result.hasMore;
      const currentReads = (result.metrics?.summaryReads || 0) + (resolved.metrics?.summaryReads || 0);
      summaryReads = append ? summaryReads + currentReads : currentReads;
      render(); status(`${visibleEntries().length} asset${visibleEntries().length === 1 ? "" : "s"} shown. ${summaryReads ? `${summaryReads} lightweight summary read${summaryReads === 1 ? "" : "s"}. ` : ""}Full content loads only when you preview or use it.`);
    } catch (error) {
      entries = [];
      loadError = error.message || "The library could not be loaded.";
      render();
      status(`Library could not load: ${loadError}`);
    }
    finally { loading = false; }
  }

  async function renderCollections() {
    field("toolbar").classList.add("workshop-hidden");
    grid.classList.add("workshop-hidden");
    field("more").hidden = true;
    const root = field("collections"); root.classList.remove("workshop-hidden"); root.replaceChildren();
    const heading = document.createElement("div"); heading.className = "workshop-collections-heading";
    const title = document.createElement("h2"); title.textContent = "Collections";
    const create = document.createElement("button"); create.type = "button"; create.textContent = "+ New Collection";
    create.addEventListener("click", () => openCollectionEditor(null, () => renderCollections()));
    heading.append(title, create); root.append(heading);
    try {
      const collections = await persistence.listCollections();
      libraryState = { ...libraryState, collections };
      syncCollectionFilter();
      for (const item of collections) {
        const card = document.createElement("article"); card.className = "workshop-collection";
        const title = document.createElement("h3"); title.textContent = item.name;
        const description = document.createElement("p"); description.textContent = item.description || "No description.";
        const count = new Set([...(item.entries || []), ...(item.assetIds || [])]).size;
        const meta = document.createElement("p"); meta.textContent = `${count} asset${count === 1 ? "" : "s"} · ${item.visibility === "ROOM" ? "Room" : "Private"}`;
        const actions = document.createElement("div"); actions.className = "workshop-collection-actions";
        const browse = document.createElement("button"); browse.type = "button"; browse.textContent = "Open";
        browse.addEventListener("click", async () => {
          activeCollection = item;
          scope = "library";
          field("toolbar").classList.remove("workshop-hidden"); grid.classList.remove("workshop-hidden"); root.classList.add("workshop-hidden");
          for (const button of screen.querySelectorAll("[data-workshop-tab]")) button.setAttribute("aria-selected", String(button.dataset.workshopTab === "library"));
          field("collection").value = item.collectionId;
          entries = []; cursors = {}; hasMore = false;
          await refresh();
          status(`Collection: ${item.name} · ${visibleEntries().length} asset${visibleEntries().length === 1 ? "" : "s"}.`);
        });
        const rename = document.createElement("button"); rename.type = "button"; rename.textContent = "Rename";
        rename.addEventListener("click", () => openCollectionEditor(item, () => renderCollections()));
        const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "Delete";
        remove.addEventListener("click", async () => {
          if (!globalThis.confirm?.("Delete this collection?\nThe assets inside it will not be deleted.")) return;
          await persistence.deleteCollection(item.collectionId);
          await renderCollections();
        });
        actions.append(browse, rename, remove); card.append(title, description, meta, actions); root.append(card);
      }
      if (!collections.length) { const empty = document.createElement("p"); empty.textContent = "Create a collection to organize monsters, animations, maps, and other owned content."; root.append(empty); }
      status(`${collections.length} collection${collections.length === 1 ? "" : "s"}.`);
    } catch (error) { status(error.message); }
  }

  function setScope(next) {
    const requested = next === "saved" ? "library" : next;
    scope = tabs.some(([id, , disabled]) => id === requested && !disabled) ? requested : "browse";
    activeCollection = null;
    field("collection").value = "";
    field("campaign").value = "";
    for (const button of screen.querySelectorAll("[data-workshop-tab]")) button.setAttribute("aria-selected", String(button.dataset.workshopTab === scope));
    field("toolbar").classList.toggle("workshop-hidden", scope === "collections");
    grid.classList.toggle("workshop-hidden", scope === "collections");
    field("collections").classList.toggle("workshop-hidden", scope !== "collections");
    entries = []; cursors = {}; hasMore = false;
    if (scope === "collections") void renderCollections(); else void refresh();
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
        sourceType: request.sourceType || request.assetType,
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
      const existing = sourceKey ? await persistence.findOwnedSource(sourceKey, {
        assetType: request.assetType,
        sourceRecordId: request.sourceRecordId
      }) : null;
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
  for (const name of ["source", "campaign", "visibility", "author", "tag", "recent", "sort"]) on(field(name), "input", render);
  on(field("collection"), "input", () => {
    if (["library", "my"].includes(scope)) void refresh();
    else render();
  });
  on(field("search"), "input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(render, 250); });
  on(field("publish-close"), "click", () => field("publish-dialog").close());
  on(field("publish-form"), "submit", (event) => { event.preventDefault(); void publishWithMode("publish"); });
  for (const mode of ["update", "new-version", "unchanged"]) on(field("publish-form").querySelector(`[data-workshop-publish-mode="${mode}"]`), "click", () => void publishWithMode(mode));
  on(field("collection-form"), "submit", async (event) => {
    event.preventDefault();
    const name = field("collection-name").value.trim();
    if (!name) { field("collection-status").textContent = "Give the collection a name."; return; }
    try {
      const saved = await persistence.saveCollection({
        ...(editingCollection || {}),
        name,
        description: field("collection-description").value,
        visibility: field("collection-visibility").value,
        entries: editingCollection?.entries || [],
        assetIds: editingCollection?.assetIds || []
      });
      field("collection-dialog").close();
      editingCollection = null;
      libraryState = await persistence.listLibraryState();
      syncCollectionFilter();
      const callback = afterCollectionSave; afterCollectionSave = null;
      if (typeof callback === "function") await callback(saved);
      status(`Saved collection ${saved.name}.`);
    } catch (error) { field("collection-status").textContent = error.message; }
  });
  for (const cancel of screen.querySelectorAll("[data-workshop-collection-cancel]")) on(cancel, "click", () => {
    field("collection-dialog").close(); editingCollection = null; afterCollectionSave = null;
  });
  on(field("membership-form"), "submit", (event) => {
    event.preventDefault();
    void saveMembership().catch((error) => { field("membership-status").textContent = error.message; });
  });
  for (const cancel of screen.querySelectorAll("[data-workshop-membership-cancel]")) on(cancel, "click", () => {
    field("membership-dialog").close(); membershipAsset = null;
  });
  on(field("membership-create"), "click", () => {
    const asset = membershipAsset;
    field("membership-dialog").close();
    openCollectionEditor(null, async () => {
      membershipAsset = asset;
      const collections = await persistence.listCollections();
      renderMembershipChoices(collections, asset);
      field("membership-asset").textContent = asset.name;
      field("membership-status").textContent = "Choose one or more collections.";
      field("membership-dialog").showModal?.();
    });
  });
  setScope("browse");

  return Object.freeze({
    open, refresh, publishFromCreator,
    destroy() { destroyed = true; clearTimeout(searchTimer); preview.destroy(); listeners.forEach((remove) => remove()); }
  });
}
