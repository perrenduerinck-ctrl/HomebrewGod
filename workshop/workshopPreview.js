import { renderMonsterStatBlock } from "../monsters/statBlockPreview.js";
import { createAnimationLibrary } from "../vfx/animationLibrary.js";
import { createAnimationPlayer } from "../vfx/animationPlayer.js";
import { createBattleMapEffectEngine } from "../vfx/effectEngine.js";

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

  function open(asset) {
    cleanupAnimation(); cleanupAnimation = () => {}; current = asset;
    field("title").textContent = asset.name;
    field("meta").textContent = `${asset.assetType} · ${asset.authorName} · version ${asset.version}`;
    field("status").textContent = "Preview only. Nothing has been imported.";
    const container = field("content");
    container.replaceChildren();
    if (asset.assetType === "monster") renderMonsterStatBlock(container, asset.content);
    else if (asset.assetType === "animation") animationPreview(asset, container);
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
