import {
  SPELL_CLASSES,
  SPELL_DAMAGE_TYPES,
  SPELL_SCHOOLS,
  normalizeHomebrewSpell,
  spellLevelLabel,
  validateHomebrewSpell
} from "./spellModel.js";
import { spellAnimationSummary } from "../vfx/spellAnimationSection.js";
import { requestAppConfirmation } from "../ui/visualPolish.js";

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);
const optionMarkup = (values) => values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value || "None")}</option>`).join("");
const levelOptions = () => Array.from({ length: 10 }, (_, level) => `<option value="${level}">${spellLevelLabel(level)}</option>`).join("");

function ensureStyles(document) {
  if (document.getElementById("spellCreatorStyles")) return;
  const link = document.createElement("link");
  link.id = "spellCreatorStyles";
  link.rel = "stylesheet";
  link.href = new URL("./spellCreator.css", import.meta.url).href;
  document.head.append(link);
}

function normalizedSearch(value) {
  return String(value || "").trim().toLowerCase();
}

export function createSpellCreator({
  screen,
  persistence,
  onBack = () => {},
  onPublishToWorkshop = () => {},
  onBrowseWorkshop = () => {},
  onEditAnimations = async () => null,
  onAddToCharacter = async () => null,
  getUserId = () => ""
} = {}) {
  if (!screen || !persistence) throw new Error("Spell Creator needs a screen and persistence.");
  const document = screen.ownerDocument || globalThis.document;
  ensureStyles(document);
  screen.innerHTML = `
    <section class="box spell-creator">
      <header class="spell-creator-header">
        <div><span class="spell-creator-eyebrow">HOMEBREW LIBRARY</span><h2>Spell Library</h2><p>Create reusable homebrew spells, attach one animation sequence, and safely copy spells into characters or the Workshop.</p></div>
        <button type="button" data-spell-action="back">Back to Battle Map</button>
      </header>
      <div class="spell-creator-actions">
        <button type="button" data-spell-action="new">New Spell</button>
        <button type="button" class="spell-creator-primary" data-spell-action="save">Save to My Library</button>
        <button type="button" data-spell-action="add-character">Add to Character</button>
        <details class="hg-overflow-menu">
          <summary>More</summary>
          <div class="hg-overflow-menu-panel">
            <button type="button" data-spell-action="duplicate">Duplicate</button>
            <button type="button" data-spell-action="publish">Publish to Workshop</button>
            <button type="button" data-spell-action="browse">Browse Workshop Spells</button>
            <button type="button" data-spell-action="delete">Delete</button>
          </div>
        </details>
      </div>
      <p class="spell-creator-status" role="status" data-spell-status>Spell Library ready.</p>
      <div class="spell-creator-workspace">
        <form class="spell-creator-editor" data-spell-form>
          <section class="spell-creator-panel">
            <h3>Spell Identity</h3>
            <label>Name<input required maxlength="120" data-spell-field="name" placeholder="Cinder Lance"></label>
            <div class="spell-creator-row">
              <label>Level<select data-spell-field="level">${levelOptions()}</select></label>
              <label>School<select data-spell-field="school">${optionMarkup(SPELL_SCHOOLS)}</select></label>
            </div>
            <label>Classes<input maxlength="800" data-spell-field="classes" placeholder="Wizard, Sorcerer"></label>
            <label>Tags<input maxlength="800" data-spell-field="tags" placeholder="fire, projectile, control"></label>
          </section>
          <section class="spell-creator-panel">
            <h3>Casting</h3>
            <div class="spell-creator-row">
              <label>Casting Time<input maxlength="160" data-spell-field="castingTime" placeholder="1 action"></label>
              <label>Range<input maxlength="160" data-spell-field="range" placeholder="120 feet"></label>
            </div>
            <div class="spell-creator-row">
              <label>Duration<input maxlength="160" data-spell-field="duration" placeholder="Instantaneous"></label>
              <label>Components<input maxlength="500" data-spell-field="components" placeholder="V, S, M"></label>
            </div>
            <label>Material Component<input maxlength="1000" data-spell-field="material" placeholder="Optional material details"></label>
            <div class="spell-creator-checks">
              <label><input type="checkbox" data-spell-field="concentration"> Concentration</label>
              <label><input type="checkbox" data-spell-field="ritual"> Ritual</label>
            </div>
          </section>
          <section class="spell-creator-panel">
            <h3>Resolution</h3>
            <div class="spell-creator-row">
              <label>Damage Type<select data-spell-field="damageType">${optionMarkup(SPELL_DAMAGE_TYPES)}</select></label>
              <label>Damage Dice<input maxlength="120" data-spell-field="damageDice" placeholder="4d6"></label>
            </div>
            <div class="spell-creator-row">
              <label>Attack Type<select data-spell-field="attackType"><option value="">None</option><option value="melee">Melee spell attack</option><option value="ranged">Ranged spell attack</option></select></label>
              <label>Saving Throw<select data-spell-field="saveAbility"><option value="">None</option>${["str", "dex", "con", "int", "wis", "cha"].map((ability) => `<option value="${ability}">${ability.toUpperCase()}</option>`).join("")}</select></label>
            </div>
          </section>
          <section class="spell-creator-panel">
            <h3>Rules Text</h3>
            <label>Description<textarea rows="8" maxlength="12000" data-spell-field="description"></textarea></label>
            <label>At Higher Levels<textarea rows="4" maxlength="6000" data-spell-field="higherLevel"></textarea></label>
          </section>
          <section class="spell-creator-panel">
            <div class="spell-creator-section-heading"><div><h3>Animation Sequence</h3><p data-spell-animation-summary>None</p></div><div>
              <button type="button" data-spell-action="animations">Attach / Edit Animations</button>
              <button type="button" data-spell-action="preview-animations">Preview Animation</button>
            </div></div>
            <p class="spell-creator-help">Uses the shared Cast → Travel → Impact → Sustain → End runtime. Only animation IDs and stage overrides are saved with the spell.</p>
          </section>
        </form>
        <aside class="spell-creator-sidebar">
          <section class="spell-creator-panel"><h3>Live Spell Card</h3><div data-spell-preview></div></section>
          <section class="spell-creator-panel">
            <div class="spell-creator-section-heading"><h3>My Spells</h3><button type="button" data-spell-action="refresh">Refresh</button></div>
            <div class="spell-creator-filters">
              <label>Search<input type="search" data-spell-filter="search" placeholder="Name or text"></label>
              <label>Level<select data-spell-filter="level"><option value="">All levels</option>${levelOptions()}</select></label>
              <label>School<select data-spell-filter="school"><option value="">All schools</option>${optionMarkup(SPELL_SCHOOLS)}</select></label>
              <label>Class<select data-spell-filter="className"><option value="">All classes</option>${optionMarkup(SPELL_CLASSES)}</select></label>
              <label>Damage<select data-spell-filter="damageType"><option value="">All damage</option>${optionMarkup(SPELL_DAMAGE_TYPES.filter(Boolean))}</select></label>
            </div>
            <div class="spell-creator-library" data-spell-library></div>
          </section>
        </aside>
      </div>
    </section>`;

  const field = (name) => screen.querySelector(`[data-spell-field="${name}"]`);
  const filter = (name) => screen.querySelector(`[data-spell-filter="${name}"]`);
  const form = screen.querySelector("[data-spell-form]");
  const previewRoot = screen.querySelector("[data-spell-preview]");
  const libraryRoot = screen.querySelector("[data-spell-library]");
  const statusRoot = screen.querySelector("[data-spell-status]");
  const animationSummaryRoot = screen.querySelector("[data-spell-animation-summary]");
  const listeners = [];
  let selectedId = "";
  let createdAtMillis = 0;
  let animations = {};
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
      level: field("level").value,
      school: field("school").value,
      classes: field("classes").value,
      tags: field("tags").value,
      castingTime: field("castingTime").value,
      range: field("range").value,
      duration: field("duration").value,
      components: field("components").value,
      material: field("material").value,
      concentration: field("concentration").checked,
      ritual: field("ritual").checked,
      damageType: field("damageType").value,
      damageDice: field("damageDice").value,
      attackType: field("attackType").value,
      saveAbility: field("saveAbility").value,
      description: field("description").value,
      higherLevel: field("higherLevel").value,
      animations: structuredClone(animations)
    };
  }

  function renderPreview() {
    const draft = rawDraft();
    const spell = normalizeHomebrewSpell({ ...draft, name: draft.name || "Unnamed Spell" });
    const metadata = [spellLevelLabel(spell.level), spell.school, spell.ritual ? "ritual" : ""].filter(Boolean).join(" · ");
    const resolution = [spell.damageDice, spell.damageType, spell.attackType ? `${spell.attackType} spell attack` : "", spell.saveAbility ? `${spell.saveAbility.toUpperCase()} save` : ""].filter(Boolean).join(" · ");
    previewRoot.innerHTML = `<article class="spell-card">
      <h4>${escapeHtml(spell.name)}</h4><p class="spell-card-meta">${escapeHtml(metadata)}</p>
      <dl><div><dt>Casting Time</dt><dd>${escapeHtml(spell.castingTime)}</dd></div><div><dt>Range</dt><dd>${escapeHtml(spell.range)}</dd></div><div><dt>Components</dt><dd>${escapeHtml(spell.components || "—")}</dd></div><div><dt>Duration</dt><dd>${escapeHtml(`${spell.concentration ? "Concentration, " : ""}${spell.duration}`)}</dd></div></dl>
      ${spell.classes.length ? `<p><strong>Classes:</strong> ${escapeHtml(spell.classes.join(", "))}</p>` : ""}
      ${resolution ? `<p><strong>Resolution:</strong> ${escapeHtml(resolution)}</p>` : ""}
      <p class="spell-card-description">${escapeHtml(spell.description || "No description yet.").replace(/\n/g, "<br>")}</p>
      ${spell.higherLevel ? `<p><strong>At Higher Levels.</strong> ${escapeHtml(spell.higherLevel).replace(/\n/g, "<br>")}</p>` : ""}
      <p><strong>Animations:</strong> ${escapeHtml(spellAnimationSummary(spell.animations))}</p>
      <p class="spell-card-tags">${spell.tags.map((tag) => `#${escapeHtml(tag)}`).join(" ")}</p>
    </article>`;
    animationSummaryRoot.textContent = spellAnimationSummary(spell.animations);
  }

  function applySpell(raw = {}) {
    const spell = normalizeHomebrewSpell(raw);
    selectedId = raw.id ? spell.id : "";
    createdAtMillis = raw.createdAtMillis ? spell.createdAtMillis : 0;
    field("name").value = raw.name || "";
    field("level").value = String(spell.level);
    field("school").value = spell.school;
    field("classes").value = spell.classes.join(", ");
    field("tags").value = spell.tags.join(", ");
    field("castingTime").value = spell.castingTime;
    field("range").value = spell.range;
    field("duration").value = spell.duration;
    field("components").value = spell.components;
    field("material").value = spell.material;
    field("concentration").checked = spell.concentration;
    field("ritual").checked = spell.ritual;
    field("damageType").value = SPELL_DAMAGE_TYPES.includes(spell.damageType) ? spell.damageType : "";
    field("damageDice").value = spell.damageDice;
    field("attackType").value = ["melee", "ranged"].includes(spell.attackType) ? spell.attackType : "";
    field("saveAbility").value = ["str", "dex", "con", "int", "wis", "cha"].includes(spell.saveAbility) ? spell.saveAbility : "";
    field("description").value = spell.description;
    field("higherLevel").value = spell.higherLevel;
    animations = structuredClone(spell.animations);
    renderPreview();
  }

  function visibleRecords() {
    const search = normalizedSearch(filter("search").value);
    const level = filter("level").value;
    const school = normalizedSearch(filter("school").value);
    const className = normalizedSearch(filter("className").value);
    const damageType = normalizedSearch(filter("damageType").value);
    return records.filter((spell) => {
      if (level !== "" && String(spell.level) !== level) return false;
      if (school && normalizedSearch(spell.school) !== school) return false;
      if (className && !spell.classes.some((entry) => normalizedSearch(entry) === className)) return false;
      if (damageType && normalizedSearch(spell.damageType) !== damageType) return false;
      if (search && ![spell.name, spell.description, spell.tags.join(" ")].some((entry) => normalizedSearch(entry).includes(search))) return false;
      return true;
    });
  }

  function renderLibrary() {
    const visible = visibleRecords();
    libraryRoot.innerHTML = visible.length ? visible.map((spell) => `<button type="button" data-library-spell-id="${escapeHtml(spell.id)}" class="${spell.id === selectedId ? "selected" : ""}">
      <span aria-hidden="true">${spell.level || "C"}</span><span><strong>${escapeHtml(spell.name)}</strong><small>${escapeHtml(spellLevelLabel(spell.level))} · ${escapeHtml(spell.school)}${spell.damageType ? ` · ${escapeHtml(spell.damageType)}` : ""}</small></span>
    </button>`).join("") : `<p class="spell-creator-empty">No personal spells match these filters.</p>`;
  }

  async function refresh() {
    try {
      records = await persistence.list();
      renderLibrary();
      return records;
    } catch (error) {
      records = [];
      renderLibrary();
      setStatus(`Spell Library could not load: ${error.message}`);
      return [];
    }
  }

  async function save() {
    if (busy) return null;
    const draft = rawDraft();
    const errors = validateHomebrewSpell(draft);
    if (errors.length) { setStatus(errors.join(" ")); return null; }
    setBusy(true); setStatus("Saving to My Library…");
    try {
      const saved = await persistence.save(draft);
      applySpell(saved); await refresh();
      setStatus(`${saved.name} saved to My Library.`);
      return saved;
    } catch (error) { setStatus(`Spell could not be saved: ${error.message}`); return null; }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!selectedId) { setStatus("Select a saved spell to delete."); return false; }
    if (!await requestAppConfirmation("Delete this spell from My Library?", { title: "Delete spell", confirmLabel: "Delete" })) return false;
    setBusy(true);
    try {
      await persistence.remove(selectedId);
      applySpell({}); await refresh(); setStatus("Spell deleted."); return true;
    } catch (error) { setStatus(`Spell could not be deleted: ${error.message}`); return false; }
    finally { setBusy(false); }
  }

  function duplicate() {
    const draft = rawDraft();
    applySpell({ ...draft, id: "", createdAtMillis: 0, name: `${draft.name || "Spell"} Copy` });
    setStatus("Independent copy ready. Save it to add it to My Library.");
  }

  function publish() {
    if (!selectedId) { setStatus("Save the spell before publishing it."); return null; }
    const content = normalizeHomebrewSpell(rawDraft());
    const request = {
      assetType: "spell",
      sourceRecordId: selectedId,
      sourceScope: `user:${String(getUserId() || "")}`,
      name: content.name,
      description: content.description,
      tags: content.tags,
      content
    };
    onPublishToWorkshop(request);
    return request;
  }

  async function editAnimations(previewOnly = false) {
    setBusy(true);
    try {
      const result = await onEditAnimations({ name: field("name").value || "Unnamed Spell", animations: structuredClone(animations), previewOnly });
      if (!previewOnly && result) {
        animations = structuredClone(result);
        renderPreview();
        setStatus("Animation sequence attached. Save the spell to keep it.");
      }
    } catch (error) { setStatus(`Animations could not be opened: ${error.message}`); }
    finally { setBusy(false); }
  }

  on(form, "input", renderPreview);
  for (const control of screen.querySelectorAll("[data-spell-filter]")) on(control, "input", renderLibrary);
  on(libraryRoot, "click", async (event) => {
    const button = event.target.closest("[data-library-spell-id]");
    if (!button) return;
    try { applySpell(await persistence.load(button.dataset.librarySpellId)); renderLibrary(); setStatus("Saved spell loaded."); }
    catch (error) { setStatus(error.message); }
  });
  on(screen, "click", (event) => {
    const button = event.target.closest("[data-spell-action]");
    if (!button) return;
    const action = button.dataset.spellAction;
    if (action === "back") onBack();
    if (action === "new") { applySpell({}); setStatus("New spell ready."); }
    if (action === "save") void save();
    if (action === "duplicate") duplicate();
    if (action === "delete") void remove();
    if (action === "publish") publish();
    if (action === "browse") onBrowseWorkshop({ assetType: "spell", tab: "browse" });
    if (action === "refresh") void refresh();
    if (action === "animations") void editAnimations(false);
    if (action === "preview-animations") void editAnimations(true);
    if (action === "add-character") void (async () => {
      const spell = selectedId ? normalizeHomebrewSpell(rawDraft()) : await save();
      if (!spell) return;
      const result = await onAddToCharacter(spell);
      setStatus(result?.message || `${spell.name} is ready for Character Creator.`);
    })();
  });

  applySpell({});
  void refresh();
  return Object.freeze({
    refresh,
    save,
    remove,
    getDraft: rawDraft,
    async editAnimations(previewOnly = false) { return editAnimations(previewOnly); },
    openSpell(spell, { duplicate: makeCopy = false } = {}) {
      applySpell(makeCopy ? { ...spell, id: "", createdAtMillis: 0, name: `${spell?.name || "Spell"} Copy` } : spell);
      setStatus(makeCopy ? "Independent copy opened. Save it to My Library." : "Spell opened.");
    },
    destroy() { listeners.forEach((removeListener) => removeListener()); }
  });
}
