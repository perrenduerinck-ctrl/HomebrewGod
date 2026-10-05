import {
  MAGIC_ITEM_RARITIES,
  MAGIC_ITEM_TYPES,
  magicItemRarityLabel,
  magicItemTypeLabel,
  normalizeMagicItem,
  validateMagicItem
} from "./magicItemModel.js";
import { requestAppConfirmation } from "../ui/visualPolish.js";

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);

const optionMarkup = (values, labeler) => values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(labeler(value))}</option>`).join("");

function ensureStyles(document) {
  if (document.getElementById("magicItemCreatorStyles")) return;
  const link = document.createElement("link");
  link.id = "magicItemCreatorStyles";
  link.rel = "stylesheet";
  link.href = "./items/magicItemCreator.css";
  document.head.append(link);
}

function newEffect(index = 0) {
  return { id: globalThis.crypto?.randomUUID?.() || `effect-${Date.now()}-${index}`, name: `Effect ${index + 1}`, description: "", activation: "", chargeCost: null };
}

export function createMagicItemCreator({
  screen,
  persistence,
  onBack = () => {},
  onPublishToWorkshop = () => {},
  onBrowseWorkshop = () => {},
  getUserId = () => "",
  uploadImage = null
} = {}) {
  if (!screen || !persistence) throw new Error("Magic Item Creator needs a screen and persistence.");
  const document = screen.ownerDocument || globalThis.document;
  ensureStyles(document);
  screen.innerHTML = `
    <section class="box magic-item-creator">
      <header class="magic-item-header">
        <div><span class="magic-item-eyebrow">HOMEBREW LIBRARY</span><h2>Magic Item Creator</h2><p>Create weapons, armor, consumables, and wondrous items as reusable personal Library assets.</p></div>
        <button type="button" data-item-action="back">Back to Battle Map</button>
      </header>
      <div class="magic-item-actions">
        <button type="button" data-item-action="new">New Item</button>
        <button type="button" class="magic-item-primary" data-item-action="save">Save to My Library</button>
        <details class="hg-overflow-menu">
          <summary>More</summary>
          <div class="hg-overflow-menu-panel">
            <button type="button" data-item-action="duplicate">Duplicate</button>
            <button type="button" data-item-action="publish">Publish to Workshop</button>
            <button type="button" data-item-action="browse">Browse Workshop Items</button>
            <button type="button" data-item-action="delete">Delete</button>
          </div>
        </details>
      </div>
      <p class="magic-item-status" role="status" data-item-status>Magic Item Creator ready.</p>
      <div class="magic-item-workspace">
        <form class="magic-item-editor" data-item-form>
          <section class="magic-item-panel">
            <h3>Identity</h3>
            <label>Name<input required maxlength="120" data-item-field="name" placeholder="Flame Tongue"></label>
            <div class="magic-item-row">
              <label>Item Type<select data-item-field="itemType">${optionMarkup(MAGIC_ITEM_TYPES, magicItemTypeLabel)}</select></label>
              <label>Rarity<select data-item-field="rarity">${optionMarkup(MAGIC_ITEM_RARITIES, magicItemRarityLabel)}</select></label>
            </div>
            <label>Description<textarea rows="6" maxlength="8000" data-item-field="description" placeholder="Describe the item's appearance, rules, and lore."></textarea></label>
            <label>Tags<input maxlength="600" data-item-field="tags" placeholder="fire, sword, dragon"></label>
            <label>Weight<input min="0" step="0.1" type="number" data-item-field="weight" placeholder="Optional"></label>
          </section>
          <section class="magic-item-panel">
            <h3>Attunement &amp; Charges</h3>
            <label class="magic-item-check"><input type="checkbox" data-item-field="requiresAttunement"> Requires attunement</label>
            <label data-item-attunement-requirements>Attunement requirements<input maxlength="500" data-item-field="attunementRequirements" placeholder="By a spellcaster, by a dwarf, etc."></label>
            <div class="magic-item-row magic-item-charges">
              <label>Maximum Charges<input min="0" step="1" type="number" data-item-field="maximumCharges"></label>
              <label>Current Charges<input min="0" step="1" type="number" data-item-field="currentCharges"></label>
            </div>
            <label>Recharge<input maxlength="240" data-item-field="recharge" placeholder="Regains 1d6 + 1 charges daily at dawn"></label>
          </section>
          <section class="magic-item-panel">
            <h3>Image</h3>
            <label>HTTPS Image URL<input type="url" maxlength="2048" data-item-field="imageUrl" placeholder="https://..."></label>
            ${typeof uploadImage === "function" ? `<label class="magic-item-file">Upload image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" data-item-image-upload></label>` : ""}
          </section>
          <section class="magic-item-panel magic-item-effects-panel">
            <div class="magic-item-section-heading"><h3>Effects</h3><button type="button" data-item-action="add-effect">+ Add Effect</button></div>
            <div class="magic-item-effects" data-item-effects></div>
          </section>
        </form>
        <aside class="magic-item-sidebar">
          <section class="magic-item-panel"><h3>Live Item Card</h3><div data-item-preview></div></section>
          <section class="magic-item-panel"><div class="magic-item-section-heading"><h3>My Magic Items</h3><button type="button" data-item-action="refresh">Refresh</button></div><div class="magic-item-library" data-item-library></div></section>
        </aside>
      </div>
    </section>`;

  const field = (name) => screen.querySelector(`[data-item-field="${name}"]`);
  const form = screen.querySelector("[data-item-form]");
  const effectsRoot = screen.querySelector("[data-item-effects]");
  const previewRoot = screen.querySelector("[data-item-preview]");
  const libraryRoot = screen.querySelector("[data-item-library]");
  const statusRoot = screen.querySelector("[data-item-status]");
  const listeners = [];
  let selectedId = "";
  let createdAtMillis = 0;
  let effects = [];
  let records = [];
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
      itemType: field("itemType").value,
      rarity: field("rarity").value,
      description: field("description").value,
      imageUrl: field("imageUrl").value,
      tags: field("tags").value,
      weight: field("weight").value,
      requiresAttunement: field("requiresAttunement").checked,
      attunementRequirements: field("attunementRequirements").value,
      charges: {
        maximum: field("maximumCharges").value,
        current: field("currentCharges").value,
        recharge: field("recharge").value
      },
      effects: effects.map((effect) => ({ ...effect }))
    };
  }

  function renderEffects() {
    effectsRoot.innerHTML = effects.length ? effects.map((effect, index) => `
      <article class="magic-item-effect" data-effect-index="${index}">
        <div class="magic-item-effect-heading"><strong>Effect ${index + 1}</strong><div>
          <button type="button" data-effect-action="up" aria-label="Move effect up" ${index === 0 ? "disabled" : ""}>↑</button>
          <button type="button" data-effect-action="down" aria-label="Move effect down" ${index === effects.length - 1 ? "disabled" : ""}>↓</button>
          <button type="button" data-effect-action="duplicate">Duplicate</button>
          <button type="button" data-effect-action="remove">Delete</button>
        </div></div>
        <label>Effect Name<input maxlength="120" data-effect-field="name" value="${escapeHtml(effect.name)}"></label>
        <div class="magic-item-row"><label>Activation<input maxlength="80" data-effect-field="activation" value="${escapeHtml(effect.activation)}" placeholder="Action, bonus action, passive"></label><label>Charge Cost<input min="0" step="1" type="number" data-effect-field="chargeCost" value="${effect.chargeCost ?? ""}"></label></div>
        <label>Rules Text<textarea rows="4" maxlength="4000" data-effect-field="description">${escapeHtml(effect.description)}</textarea></label>
      </article>`).join("") : `<p class="magic-item-empty">No effects yet. Add an effect for bonuses, activations, spells, or other rules.</p>`;
  }

  function renderPreview() {
    const draft = rawDraft();
    const item = normalizeMagicItem({ ...draft, name: draft.name || "Unnamed Magic Item" });
    const charges = item.charges.maximum === null ? "" : `${item.charges.current ?? item.charges.maximum}/${item.charges.maximum} charges${item.charges.recharge ? ` · ${item.charges.recharge}` : ""}`;
    previewRoot.innerHTML = `
      <article class="magic-item-card">
        ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="">` : `<div class="magic-item-card-placeholder" aria-hidden="true">⚔</div>`}
        <div><h4>${escapeHtml(item.name)}</h4><p class="magic-item-card-meta">${escapeHtml(magicItemRarityLabel(item.rarity))} ${escapeHtml(magicItemTypeLabel(item.itemType))}${item.requiresAttunement ? " · Requires Attunement" : ""}</p>
        ${item.attunementRequirements ? `<p><em>${escapeHtml(item.attunementRequirements)}</em></p>` : ""}
        <p>${escapeHtml(item.description || "No description yet.")}</p>
        ${charges ? `<p><strong>${escapeHtml(charges)}</strong></p>` : ""}
        ${item.effects.length ? `<div class="magic-item-card-effects">${item.effects.map((effect) => `<section><h5>${escapeHtml(effect.name)}</h5><p>${escapeHtml(effect.description || "No rules text.")}</p></section>`).join("")}</div>` : ""}
        <p class="magic-item-card-tags">${item.tags.map((tag) => `#${escapeHtml(tag)}`).join(" ")}</p></div>
      </article>`;
  }

  function syncConditionalFields() {
    screen.querySelector("[data-item-attunement-requirements]").hidden = !field("requiresAttunement").checked;
  }

  function applyItem(raw = {}) {
    const item = normalizeMagicItem(raw);
    selectedId = raw.id ? item.id : "";
    createdAtMillis = item.createdAtMillis;
    field("name").value = raw.name || "";
    field("itemType").value = item.itemType;
    field("rarity").value = item.rarity;
    field("description").value = item.description;
    field("imageUrl").value = item.imageUrl;
    field("tags").value = item.tags.join(", ");
    field("weight").value = item.weight ?? "";
    field("requiresAttunement").checked = item.requiresAttunement;
    field("attunementRequirements").value = item.attunementRequirements;
    field("maximumCharges").value = item.charges.maximum ?? "";
    field("currentCharges").value = item.charges.current ?? "";
    field("recharge").value = item.charges.recharge;
    effects = item.effects.map((effect) => ({ ...effect }));
    renderEffects(); syncConditionalFields(); renderPreview();
  }

  function renderLibrary() {
    if (!records.length) {
      libraryRoot.innerHTML = `<p class="magic-item-empty">No saved magic items yet.</p>`;
      return;
    }
    libraryRoot.innerHTML = records.map((item) => `
      <button type="button" data-library-item-id="${escapeHtml(item.id)}" class="${item.id === selectedId ? "selected" : ""}">
        ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="">` : `<span aria-hidden="true">⚔</span>`}
        <span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(magicItemRarityLabel(item.rarity))} · ${escapeHtml(magicItemTypeLabel(item.itemType))}</small></span>
      </button>`).join("");
  }

  async function refresh() {
    try {
      records = await persistence.list();
      renderLibrary();
      return records;
    } catch (error) {
      setStatus(`Magic Item Library could not load: ${error.message}`);
      records = []; renderLibrary(); return [];
    }
  }

  async function save() {
    if (busy) return null;
    const draft = rawDraft();
    const errors = validateMagicItem(draft);
    if (errors.length) { setStatus(errors.join(" ")); return null; }
    setBusy(true); setStatus("Saving to My Library…");
    try {
      const saved = await persistence.save(draft);
      applyItem(saved); await refresh();
      setStatus(`${saved.name} saved to My Library.`);
      return saved;
    } catch (error) { setStatus(`Item could not be saved: ${error.message}`); return null; }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!selectedId) { setStatus("Select a saved item to delete."); return false; }
    if (!await requestAppConfirmation("Delete this magic item from My Library?", { title: "Delete magic item", confirmLabel: "Delete" })) return false;
    setBusy(true);
    try {
      await persistence.remove(selectedId);
      applyItem({}); await refresh(); setStatus("Magic item deleted."); return true;
    } catch (error) { setStatus(`Item could not be deleted: ${error.message}`); return false; }
    finally { setBusy(false); }
  }

  function duplicate() {
    const draft = rawDraft();
    applyItem({ ...draft, id: "", createdAtMillis: 0, name: `${draft.name || "Magic Item"} Copy` });
    setStatus("Independent copy ready. Save it to add it to My Library.");
  }

  function publish() {
    if (!selectedId) { setStatus("Save the magic item before publishing it."); return null; }
    const content = normalizeMagicItem(rawDraft());
    const request = {
      assetType: "magic-item",
      sourceRecordId: selectedId,
      sourceScope: `user:${String(getUserId() || "")}`,
      name: content.name,
      description: content.description,
      thumbnailUrl: content.imageUrl,
      tags: content.tags,
      content
    };
    onPublishToWorkshop(request);
    return request;
  }

  function updateEffectFromInput(input) {
    const index = Number(input.closest("[data-effect-index]")?.dataset.effectIndex);
    const key = input.dataset.effectField;
    if (!Number.isInteger(index) || !effects[index] || !key) return;
    effects[index] = { ...effects[index], [key]: key === "chargeCost" ? (input.value === "" ? null : Math.max(0, Math.round(Number(input.value) || 0))) : input.value };
    renderPreview();
  }

  on(form, "input", (event) => {
    if (event.target.matches("[data-effect-field]")) updateEffectFromInput(event.target);
    else { syncConditionalFields(); renderPreview(); }
  });
  on(effectsRoot, "click", (event) => {
    const button = event.target.closest("[data-effect-action]");
    if (!button) return;
    const index = Number(button.closest("[data-effect-index]")?.dataset.effectIndex);
    const action = button.dataset.effectAction;
    if (!Number.isInteger(index) || !effects[index]) return;
    if (action === "remove") effects.splice(index, 1);
    if (action === "duplicate") effects.splice(index + 1, 0, { ...effects[index], id: globalThis.crypto?.randomUUID?.() || `effect-${Date.now()}`, name: `${effects[index].name} Copy` });
    if (action === "up" && index > 0) [effects[index - 1], effects[index]] = [effects[index], effects[index - 1]];
    if (action === "down" && index < effects.length - 1) [effects[index + 1], effects[index]] = [effects[index], effects[index + 1]];
    renderEffects(); renderPreview();
  });
  on(libraryRoot, "click", async (event) => {
    const button = event.target.closest("[data-library-item-id]");
    if (!button) return;
    try { applyItem(await persistence.load(button.dataset.libraryItemId)); renderLibrary(); setStatus("Saved magic item loaded."); }
    catch (error) { setStatus(error.message); }
  });
  on(screen, "click", (event) => {
    const button = event.target.closest("[data-item-action]");
    if (!button) return;
    const action = button.dataset.itemAction;
    if (action === "back") onBack();
    if (action === "new") { applyItem({}); setStatus("New magic item ready."); }
    if (action === "save") void save();
    if (action === "duplicate") duplicate();
    if (action === "delete") void remove();
    if (action === "publish") publish();
    if (action === "browse") onBrowseWorkshop({ assetType: "magic-item", tab: "browse" });
    if (action === "refresh") void refresh();
    if (action === "add-effect") { effects.push(newEffect(effects.length)); renderEffects(); renderPreview(); }
  });
  const upload = screen.querySelector("[data-item-image-upload]");
  on(upload, "change", async () => {
    const file = upload.files?.[0];
    if (!file) return;
    setBusy(true); setStatus("Uploading item image…");
    try {
      const result = await uploadImage(file);
      field("imageUrl").value = result.secure_url || result.secureUrl || result.url || "";
      renderPreview(); setStatus("Item image uploaded. Save the item to keep it.");
    } catch (error) { setStatus(`Image upload failed: ${error.message}`); }
    finally { upload.value = ""; setBusy(false); }
  });

  applyItem({});
  void refresh();
  return Object.freeze({
    refresh,
    save,
    remove,
    getDraft: rawDraft,
    openItem(item, { duplicate: makeCopy = false } = {}) {
      applyItem(makeCopy ? { ...item, id: "", createdAtMillis: 0, name: `${item?.name || "Magic Item"} Copy` } : item);
      setStatus(makeCopy ? "Independent copy opened. Save it to My Library." : "Magic item opened.");
    },
    destroy() { listeners.forEach((removeListener) => removeListener()); }
  });
}
