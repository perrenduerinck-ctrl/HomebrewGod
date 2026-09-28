import { renderMonsterStatBlock } from "../monsters/statBlockPreview.js";
import { createAnimationLibrary } from "../vfx/animationLibrary.js";
import { createAnimationPlayer } from "../vfx/animationPlayer.js";
import { createBattleMapEffectEngine } from "../vfx/effectEngine.js";
import { getWorkshopTypeDefinition } from "./workshopTypeRegistry.js";

export function createWorkshopPreview({ dialog, onImport, onRemix } = {}) {
  if (!dialog) return { open() {}, close() {}, destroy() {} };
  const document = dialog.ownerDocument || globalThis.document;
  let cleanupAnimation = () => {};
  let current = null;
  dialog.innerHTML = `
    <div class="workshop-dialog-heading"><div><span class="workshop-eyebrow">WORKSHOP PREVIEW</span><h2 data-workshop-preview-title></h2></div><button type="button" data-workshop-preview-close>Close</button></div>
    <p data-workshop-preview-meta></p><div class="workshop-preview-content" data-workshop-preview-content></div>
    <div class="workshop-preview-actions"><button type="button" data-workshop-preview-import>Add to My Library</button><button type="button" data-workshop-preview-remix>Duplicate / Remix</button></div>
    <p data-workshop-preview-status role="status"></p>`;
  const field = (name) => dialog.querySelector(`[data-workshop-preview-${name}]`);

  function close() {
    cleanupAnimation(); cleanupAnimation = () => {}; current = null;
    if (dialog.open) dialog.close();
  }

  function animationPreview(asset, container) {
    const surface = document.createElement("div");
    surface.className = "workshop-animation-preview";
    const controls = document.createElement("div");
    controls.className = "workshop-preview-actions";
    const play = document.createElement("button");
    play.type = "button"; play.textContent = "▶ Play Animation";
    controls.append(play); container.append(surface, controls);
    const library = createAnimationLibrary();
    let definition;
    try { definition = library.hydrateAnimation(asset.content); }
    catch (error) { field("status").textContent = error.message; return; }
    const engine = createBattleMapEffectEngine({ surface });
    const player = createAnimationPlayer({ engine, library, isSoundEnabled: () => false, onError: (message) => { field("status").textContent = message; } });
    play.addEventListener("click", async () => {
      player.clear();
      const result = await player.previewAnimation(definition, { x: 90, y: 125, targetX: 330, targetY: 125, grid: { squareSize: 32, feetPerSquare: 5 } });
      if (!result.ok) field("status").textContent = result.message || "The animation preview is unavailable.";
    });
    cleanupAnimation = () => { player.destroy(); engine.destroy(); };
  }

  function cardPreview(asset, container) {
    const article = document.createElement("article");
    article.className = "workshop-content-card-preview";
    const description = document.createElement("p");
    description.textContent = asset.description || asset.content?.description || "No description yet.";
    const details = document.createElement("dl");
    const entries = Object.entries(asset.typeMetadata || {}).filter(([, value]) => value !== "" && value != null && value !== false).slice(0, 12);
    for (const [key, rawValue] of entries) {
      const term = document.createElement("dt");
      term.textContent = key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
      const value = document.createElement("dd");
      value.textContent = Array.isArray(rawValue) ? rawValue.join(", ") : String(rawValue);
      details.append(term, value);
    }
    article.append(description, details);
    container.append(article);
  }

  function imagePreview(asset, container) {
    const source = asset.content?.imageUrl || asset.content?.url || asset.thumbnailUrl || "";
    if (/^https:\/\//i.test(source)) {
      const image = document.createElement("img");
      image.className = "workshop-map-preview";
      image.src = source;
      image.alt = `${asset.name} preview`;
      image.loading = "lazy";
      container.append(image);
    } else cardPreview(asset, container);
  }

  function open(asset) {
    cleanupAnimation(); cleanupAnimation = () => {}; current = asset;
    field("title").textContent = asset.name;
    field("meta").textContent = `${asset.assetType} · ${asset.authorName} · version ${asset.version}`;
    field("status").textContent = "Preview only. Nothing has been imported.";
    const container = field("content");
    container.replaceChildren();
    const type = getWorkshopTypeDefinition(asset.assetType);
    container.dataset.workshopPreviewKind = type.preview;
    if (type.preview === "monster") renderMonsterStatBlock(container, asset.content);
    else if (type.preview === "animation") animationPreview(asset, container);
    else if (type.preview === "image") imagePreview(asset, container);
    else if (type.preview === "card") cardPreview(asset, container);
    else {
      const pre = document.createElement("pre");
      pre.className = "workshop-structured-preview";
      pre.textContent = JSON.stringify(asset.content, null, 2);
      container.append(pre);
    }
    if (!dialog.open) dialog.showModal?.();
  }

  field("close").addEventListener("click", close);
  field("import").addEventListener("click", async () => { if (current) await onImport?.(current, field("status")); });
  field("remix").addEventListener("click", async () => { if (current) await onRemix?.(current, field("status")); });
  dialog.addEventListener("close", () => { cleanupAnimation(); cleanupAnimation = () => {}; });
  return Object.freeze({ open, close, destroy: close });
}
