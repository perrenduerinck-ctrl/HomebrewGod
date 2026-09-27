const typeIcons = Object.freeze({
  monster: "🐉", animation: "✨", spell: "📜", "magic-item": "⚔️",
  npc: "🧙", map: "🗺️", encounter: "🎲", summon: "🜲", feat: "◆", other: "✦"
});

function element(document, tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function renderWorkshopCards(container, assets, handlers = {}) {
  const document = container.ownerDocument || globalThis.document;
  container.replaceChildren();
  if (!assets.length) {
    container.append(element(document, "div", "workshop-empty", handlers.emptyMessage || "No Workshop creations match these filters."));
    return;
  }
  for (const asset of assets) {
    const card = element(document, "article", "workshop-card");
    card.dataset.workshopAssetId = asset.assetId;
    const thumb = element(document, "div", "workshop-card-thumb");
    if (asset.thumbnailUrl) {
      const image = document.createElement("img");
      image.src = asset.thumbnailUrl;
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      thumb.append(image);
    } else thumb.append(element(document, "span", "", typeIcons[asset.assetType] || typeIcons.other));
    const body = element(document, "div", "workshop-card-body");
    body.append(
      element(document, "h3", "", asset.name || "Unnamed creation"),
      element(document, "p", "workshop-card-meta", `${asset.assetType} · ${asset.authorName || "Unknown author"} · v${asset.version || 1}${asset.saveCount ? ` · ${asset.saveCount} saved` : ""}`),
      element(document, "p", "workshop-card-description", asset.description || "No description yet."),
      element(document, "p", "workshop-card-tags", (asset.tags || []).map((tag) => `#${tag}`).join(" "))
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
    addButton("Preview", "preview");
    if (asset.imported && asset.latestVersion > asset.sourceWorkshopVersion) {
      addButton("View Changes", "viewChanges");
      addButton("Keep My Version", "keepVersion");
      addButton("Update My Copy", "updateCopy");
    }
    if (!asset.imported) addButton("Add to My Library", "importAsset");
    if (!asset.imported) addButton(asset.favorite ? "★ Favorited" : "☆ Favorite", "favorite");
    if (!asset.imported) addButton("Collection", "collection");
    if (handlers.activeCollection) addButton("Remove from Collection", "removeFromCollection");
    if (!asset.imported) addButton("Duplicate / Remix", "remix");
    if (!asset.imported && handlers.canRemoveFromRoom && asset.visibility === "ROOM") addButton("Remove from Room", "removeFromRoom");
    if (asset.authorUid === handlers.currentUserId) addButton("Delete", "deleteAsset");
    body.append(actions);
    card.append(thumb, body);
    container.append(card);
  }
}
