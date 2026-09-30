import {
  getWorkshopCardTypeSummary,
  getWorkshopTypeDefinition
} from "./workshopTypeRegistry.js";

function element(document, tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function createWorkshopCardModel(asset = {}) {
  const type = getWorkshopTypeDefinition(asset.assetType);
  const source = asset.unavailable
    ? "Unavailable"
    : asset.sourceKind === "personal"
      ? "Personal"
      : asset.sourceKind === "campaign" && (asset.sourceRoomName || asset.sourceRoomCode)
        ? `Campaign: ${asset.sourceRoomName || asset.sourceRoomCode}`
        : asset.imported
    ? "My Library"
    : asset.visibility === "ROOM"
      ? "Room"
      : asset.visibility === "PUBLIC"
        ? "Public"
        : asset.visibility === "FRIENDS"
          ? "Friends / Group"
          : "Private";
  const updated = Number(asset.updatedAtMillis) || 0;
  const badges = [type.singular];
  if (asset.unavailable) badges.push("Unavailable");
  else {
    if (asset.sourceKind === "personal") badges.push("Personal");
    if (asset.sourceKind === "campaign") badges.push("Campaign");
    if (asset.publishedAssetId) badges.push("Published");
    if (asset.importedFromWorkshop || asset.imported) badges.push("Imported");
    if (asset.libraryRecord && !asset.publishedAssetId && !asset.imported && asset.visibility === "ROOM" && asset.sourceKind !== "campaign") badges.push("Room");
    if (asset.libraryRecord && !asset.publishedAssetId && !asset.imported && asset.visibility !== "ROOM" && asset.sourceKind !== "personal") badges.push("Private");
  }
  return Object.freeze({
    asset,
    assetId: asset.assetId,
    name: asset.name || "Unnamed creation",
    description: asset.description || "No description yet.",
    author: asset.authorName || "Unknown author",
    typeId: type.id,
    typeLabel: type.singular,
    icon: type.icon,
    thumbnailUrl: asset.thumbnailUrl || "",
    tags: [...(Array.isArray(asset.tags) ? asset.tags : [])],
    favorite: asset.favorite === true,
    source,
    badges,
    updatedLabel: updated ? new Date(updated).toLocaleDateString() : "",
    typeSummary: getWorkshopCardTypeSummary(asset),
    quickActions: [...type.quickActions]
  });
}

export function renderWorkshopCards(container, assets, handlers = {}) {
  const document = container.ownerDocument || globalThis.document;
  container.replaceChildren();
  if (!assets.length) {
    container.append(element(document, "div", "workshop-empty", handlers.emptyMessage || "No Workshop creations match these filters."));
    return;
  }
  for (const asset of assets) {
    const model = createWorkshopCardModel(asset);
    const card = element(document, "article", "workshop-card");
    card.dataset.workshopAssetId = asset.assetId;
    card.dataset.workshopAssetType = model.typeId;
    const thumb = element(document, "div", "workshop-card-thumb");
    if (model.thumbnailUrl) {
      const image = document.createElement("img");
      image.src = model.thumbnailUrl;
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      image.addEventListener("error", () => {
        image.remove();
        thumb.append(element(document, "span", "", model.icon));
      }, { once: true });
      thumb.append(image);
    } else thumb.append(element(document, "span", "", model.icon));
    const body = element(document, "div", "workshop-card-body");
    const badges = element(document, "div", "workshop-card-badges");
    for (const badge of model.badges) badges.append(element(document, "span", "workshop-card-badge", badge));
    body.append(
      badges,
      element(document, "h3", "", model.name),
      element(document, "p", "workshop-card-meta", `${model.author} · ${model.source}${asset.libraryRecord ? "" : ` · v${asset.version || 1}`}${asset.saveCount ? ` · ${asset.saveCount} saved` : ""}`),
      element(document, "p", "workshop-card-type-summary", model.typeSummary),
      element(document, "p", "workshop-card-description", model.description),
      element(document, "p", "workshop-card-tags", model.tags.map((tag) => `#${tag}`).join(" ")),
      element(document, "p", "workshop-card-updated", model.updatedLabel ? `Updated ${model.updatedLabel}` : "")
    );
    if (asset.latestVersion && asset.latestVersion > asset.sourceWorkshopVersion) {
      body.append(element(document, "p", "workshop-version-notice", `Version ${asset.latestVersion} available`));
    }
    const actions = element(document, "div", "workshop-card-actions");
    const addButton = (label, action, title = "") => {
      const button = element(document, "button", "", label);
      button.type = "button";
      button.dataset.workshopAction = action;
      if (title) button.title = title;
      button.addEventListener("click", () => handlers[action]?.(asset, button));
      actions.append(button);
    };
    if (asset.unavailable) {
      if (handlers.activeCollection) addButton("Remove from Collection", "removeFromCollection");
      body.append(actions);
      card.append(thumb, body);
      container.append(card);
      continue;
    }
    addButton("Preview", "preview");
    if (asset.imported && asset.latestVersion > asset.sourceWorkshopVersion) {
      addButton("View Changes", "viewChanges");
      addButton("Keep My Version", "keepVersion");
      addButton("Update My Copy", "updateCopy");
    }
    if (!asset.imported && !asset.libraryRecord) addButton("Add to My Library", "importAsset");
    if (!asset.imported && !asset.libraryRecord) addButton(asset.favorite ? "★ Favorited" : "☆ Favorite", "favorite");
    if (asset.libraryRecord || asset.imported || asset.authorUid === handlers.currentUserId) addButton("Add to Collections", "collection");
    if (asset.libraryRecord && asset.nativeRecord) addButton(asset.publishedAssetId ? "Update Published" : "Publish to Workshop", "publishLibrary");
    if (handlers.activeCollection) addButton("Remove from Collection", "removeFromCollection");
    if (!asset.imported && !asset.libraryRecord) addButton("Duplicate / Remix", "remix");
    if (!asset.imported && !asset.libraryRecord && handlers.canRemoveFromRoom && asset.visibility === "ROOM") addButton("Remove from Room", "removeFromRoom");
    if (!asset.libraryRecord && asset.authorUid === handlers.currentUserId) addButton("Delete", "deleteAsset");
    const crossCampaign = asset.sourceKind === "campaign"
      && Boolean(asset.sourceRoomCode)
      && String(asset.sourceRoomCode).toUpperCase() !== String(handlers.currentRoomCode || "").toUpperCase();
    if (crossCampaign && ["monster", "map"].includes(asset.assetType)) {
      addButton("Copy to Current Room", "copyToCurrentRoom");
    } else if (typeof handlers.quickAction === "function") {
      for (const quickAction of model.quickActions) {
        const button = element(document, "button", "workshop-card-quick-action", quickAction.label);
        button.type = "button";
        button.dataset.workshopAction = "quickAction";
        button.dataset.workshopQuickAction = quickAction.id;
        button.addEventListener("click", () => handlers.quickAction(asset, quickAction.id, button));
        actions.append(button);
      }
    }
    body.append(actions);
    card.append(thumb, body);
    container.append(card);
  }
}
