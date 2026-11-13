import { createSpellComponentEditor } from "./spellComponentEditor.js";
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
import { setCreatorControlsBusy } from "../shared/creatorFormState.js";
import { createCreatorDraftLifecycle } from "../shared/creatorDraftLifecycle.js";
import { creatorSaveRefreshMessage } from "../shared/creatorRefreshState.js";
import { createPaginatedCreatorLibrary } from "../shared/paginatedCreatorLibrary.js";
import { createSpellTargetingData } from "../data/spellTargeting.js";

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

const cloneData = (value) => value == null
  ? value
  : typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));

function changed(editable, baseline, key) {
  return JSON.stringify(editable?.[key]) !== JSON.stringify(baseline?.[key]);
}

function mergeStructuredDamage(baseDamage, editable, baseline) {
  const diceChanged = changed(editable, baseline, "damageDice");
  const typeChanged = changed(editable, baseline, "damageType");
  if (!diceChanged && !typeChanged) return cloneData(baseDamage);

  const records = Array.isArray(baseDamage)
    ? cloneData(baseDamage)
    : baseDamage && typeof baseDamage === "object"
      ? [cloneData(baseDamage)]
      : [];
  if (!records.length && (editable.damageDice || editable.damageType)) records.push({});
  if (!records.length) return [];

  if (diceChanged) {
    if (editable.damageDice) records[0].dice = editable.damageDice;
    else {
      delete records[0].dice;
      delete records[0].amount;
    }
  }
  if (typeChanged) {
    if (editable.damageType) records[0].damageType = editable.damageType;
    else {
      delete records[0].damageType;
      delete records[0].type;
    }
  }
  return records;
}

export function mergeSpellCreatorDraft(base = {}, editable = {}, baseline = {}) {
  const preserved = base && typeof base === "object" ? cloneData(base) : {};
  const merged = { ...preserved, ...cloneData(editable) };
  if (changed(editable, baseline, "components")) delete merged.componentLetters;
  if (changed(editable, baseline, "materialCostGp")) merged.materialCostly = Number(editable.materialCostGp) > 0;
  const generatedTargeting = createSpellTargetingData(merged);
  const originalTargeting = preserved.targeting && typeof preserved.targeting === "object"
    ? cloneData(preserved.targeting)
    : null;

  if (originalTargeting) {
    merged.targeting = originalTargeting;
    if (changed(editable, baseline, "range")) {
      merged.targeting.range = generatedTargeting.range;
      merged.targeting.target = generatedTargeting.target;
    }
    if (
      changed(editable, baseline, "duration") ||
      changed(editable, baseline, "concentration")
    ) {
      merged.targeting.duration = generatedTargeting.duration;
    }
    if (changed(editable, baseline, "attackType")) {
      merged.targeting.attack = generatedTargeting.attack;
    }
    if (
      changed(editable, baseline, "saveAbility") ||
      changed(editable, baseline, "saveSuccess")
    ) {
      merged.targeting.save = generatedTargeting.save;
    }
  }

  merged.damage = mergeStructuredDamage(preserved.damage, editable, baseline);
  if (changed(editable, baseline, "healingDice")) {
    merged.healing = cloneData(preserved.healing || []);
    if (editable.healingDice) merged.healing[0] = { ...(merged.healing[0] || {}), dice: editable.healingDice };
    else merged.healing.shift();
  }
  if (changed(editable, baseline, "slotScaling")) {
    if (merged.damage.length) merged.damage[0] = { ...merged.damage[0], atSlotLevel: cloneData(editable.slotScaling) };
    else merged.scaling = { ...(preserved.scaling || {}), atSlotLevel: cloneData(editable.slotScaling) };
  }
  if (changed(editable, baseline, "targetType")) {
    merged.targeting = { ...(merged.targeting || generatedTargeting), target: { type: editable.targetType } };
  }
  if (changed(editable, baseline, "areaShape") || changed(editable, baseline, "areaSize")) {
    const shape = editable.areaShape;
    const dimension = ["sphere", "cylinder"].includes(shape) ? "radius" : shape === "cube" ? "side" : "length";
    merged.targeting = { ...(merged.targeting || generatedTargeting), area: shape ? { ...(preserved.targeting?.area?.shape === shape ? preserved.targeting.area : {}), shape, [dimension]: Number(editable.areaSize) } : null };
    merged.areaOfEffect = shape ? { type: shape, size: Number(editable.areaSize) } : null;
  }
  for (const [field, target] of [["characterScaling", "atCharacterLevel"], ["healingScaling", "atSlotLevel"]]) {
    if (!changed(editable, baseline, field)) continue;
    const records = field === "healingScaling" ? merged.healing : merged.damage;
    if (records?.length) records[0] = { ...records[0], [target]: cloneData(editable[field]) };
    else merged.scaling = { ...(merged.scaling || {}), [field === "healingScaling" ? "healingAtSlotLevel" : "atCharacterLevel"]: cloneData(editable[field]) };
  }
  for (const [field, target] of [["extraDamage", "damage"], ["extraHealing", "healing"]]) {
    if (!changed(editable, baseline, field)) continue;
    const primary = merged[target]?.[0];
    merged[target] = [...(primary ? [primary] : []), ...cloneData(editable[field] || [])];
  }
  if (merged.targeting?.area) {
    for (const dimension of ["width", "height"]) {
      if (changed(editable, baseline, `area${dimension}`)) merged.targeting.area[dimension] = Number(editable[`area${dimension}`]);
    }
  }
  if (changed(editable, baseline, "condition")) {
    merged.effects = cloneData(preserved.effects || []);
    const index = merged.effects.findIndex((effect) => effect.type === "condition");
    if (editable.condition) {
      const effect = { ...(index >= 0 ? merged.effects[index] : {}), type: "condition", condition: editable.condition };
      if (index >= 0) merged.effects[index] = effect; else merged.effects.push(effect);
    } else if (index >= 0) merged.effects.splice(index, 1);
  }
  for (const key of ["healingDice", "slotScaling", "targetType", "areaShape", "areaSize", "condition", "characterScaling", "healingScaling", "extraDamage", "extraHealing", "areawidth", "areaheight"]) delete merged[key];
  return merged;
}

export function createIndependentSpellCopy(raw = {}) {
  return {
    ...cloneData(raw),
    id: "",
    revision: 0,
    createdAtMillis: 0,
    updatedAtMillis: 0,
    name: `${raw.name || "Spell"} Copy`
  };
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
          <details class="spell-creator-panel">
            <summary>Advanced mechanics</summary>
            <p class="spell-creator-help">These fields describe mechanics; the DM resolves rolls and continuing effects. Unedited advanced data is preserved.</p>
            <label>Healing dice<input data-spell-field="healingDice" placeholder="1d8 + MOD"></label>
            <div class="spell-creator-row">
              <label>Material cost (gp)<input data-spell-field="materialCostGp" type="number" min="0" step="0.01"></label>
              <label><input data-spell-field="materialConsumed" type="checkbox"> Material is consumed</label>
            </div>
            <label>Target type<select data-spell-field="targetType">${optionMarkup(["creature", "object", "self", "point", "direction", "special"])}</select></label>
            <div class="spell-creator-row">
              <label>Area shape<select data-spell-field="areaShape">${optionMarkup(["", "sphere", "cylinder", "cone", "line", "cube", "wall"])}</select></label>
              <label>Radius, length, or side (ft)<input data-spell-field="areaSize" type="number" min="0"></label>
            </div>
            <div class="spell-creator-row">
              <label>Area width (ft)<input data-spell-field="areawidth" type="number" min="0"></label>
              <label>Area height (ft)<input data-spell-field="areaheight" type="number" min="0"></label>
            </div>
            <label>Condition<select data-spell-field="condition">${optionMarkup(["", "blinded", "charmed", "deafened", "frightened", "grappled", "incapacitated", "invisible", "paralyzed", "petrified", "poisoned", "prone", "restrained", "stunned", "unconscious"])}</select></label>
            <p>Damage formula by slot level (complete formula; blank keeps the base formula)</p>
            <div class="spell-creator-row">${Array.from({ length: 9 }, (_, index) => `<label>Slot level ${index + 1}<input data-spell-scale="${index + 1}" placeholder="4d6 + MOD"></label>`).join("")}</div>
            <details><summary>Damage by character level</summary><div class="spell-creator-row">${[5,11,17].map((level) => `<label>Character level ${level}<input data-spell-character-scale="${level}"></label>`).join("")}</div></details>
            <details><summary>Healing by slot level</summary><div class="spell-creator-row">${Array.from({length:9}, (_, index) => `<label>Healing slot level ${index+1}<input data-spell-healing-scale="${index+1}"></label>`).join("")}</div></details>
            <div data-spell-extra-damage></div>
            <div data-spell-extra-healing></div>
          </details>
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
            <div class="spell-creator-filters">
              <label>Concentration<select data-spell-filter="concentration"><option value="">All spells</option><option value="true">Concentration</option><option value="false">No concentration</option></select></label>
              <label>Ritual<select data-spell-filter="ritual"><option value="">All spells</option><option value="true">Ritual</option><option value="false">Not a ritual</option></select></label>
              <label>Sort<select data-spell-filter="sort"><option value="recent">Recently updated</option><option value="name">Name</option><option value="level">Level, then name</option></select></label>
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
  let loadedRevision = 0;
  let animations = {};
  let preservedSpellData = {};
  let loadedEditableBaseline = {};
  let records = [];
  let busy = false;
  let refreshError = null;
  const libraryPager = createPaginatedCreatorLibrary({ persistence });

  const on = (element, event, handler) => {
    element?.addEventListener(event, handler);
    if (element) listeners.push(() => element.removeEventListener(event, handler));
  };
  const setStatus = (message) => { statusRoot.textContent = message; };
  const setBusy = (value) => {
    busy = value;
    setCreatorControlsBusy(screen, value);
  };

  const damageComponents = createSpellComponentEditor({ root: screen.querySelector("[data-spell-extra-damage]"), kind: "damage", onChange: renderPreview });
  const healingComponents = createSpellComponentEditor({ root: screen.querySelector("[data-spell-extra-healing]"), kind: "healing", onChange: renderPreview });
  const scalingDraft = (attribute, base) => {
    const result = cloneData(base || {});
    for (const input of screen.querySelectorAll(`[${attribute}]`)) {
      const level = input.getAttribute(attribute);
      if (input.value.trim()) result[level] = input.value.trim(); else delete result[level];
    }
    return result;
  };

  function readEditableDraft() {
    return {
      id: selectedId,
      revision: loadedRevision,
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
      healingDice: field("healingDice").value,
      materialCostGp: Number(field("materialCostGp").value),
      materialConsumed: field("materialConsumed").checked,
      targetType: field("targetType").value,
      areaShape: field("areaShape").value,
      areaSize: field("areaSize").value,
      condition: field("condition").value,
      areawidth: field("areawidth").value,
      areaheight: field("areaheight").value,
      characterScaling: scalingDraft("data-spell-character-scale", preservedSpellData.damage?.[0]?.atCharacterLevel || preservedSpellData.scaling?.atCharacterLevel),
      healingScaling: scalingDraft("data-spell-healing-scale", preservedSpellData.healing?.[0]?.atSlotLevel || preservedSpellData.scaling?.healingAtSlotLevel),
      extraDamage: damageComponents.read(),
      extraHealing: healingComponents.read(),
      slotScaling: Object.fromEntries([...screen.querySelectorAll("[data-spell-scale]")].filter((input) => input.value.trim()).map((input) => [input.dataset.spellScale, input.value.trim()])),
      animations: structuredClone(animations)
    };
  }

  function rawDraft() {
    return mergeSpellCreatorDraft(
      preservedSpellData,
      readEditableDraft(),
      loadedEditableBaseline
    );
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
    loadedRevision = raw.id ? spell.revision : 0;
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
    field("healingDice").value = spell.healing?.[0]?.dice || spell.healing?.[0]?.amount || "";
    field("materialCostGp").value = String(spell.materialCostGp);
    field("materialConsumed").checked = spell.materialConsumed;
    field("targetType").value = spell.targeting?.target?.type || "creature";
    field("areaShape").value = spell.targeting?.area?.shape || "";
    field("areaSize").value = String(spell.targeting?.area?.radius ?? spell.targeting?.area?.length ?? spell.targeting?.area?.side ?? 0);
    field("areawidth").value = String(spell.targeting?.area?.width ?? 0);
    field("areaheight").value = String(spell.targeting?.area?.height ?? 0);
    for (const input of screen.querySelectorAll("[data-spell-character-scale]")) input.value = (spell.damage?.[0]?.atCharacterLevel || spell.scaling?.atCharacterLevel)?.[input.dataset.spellCharacterScale] || "";
    for (const input of screen.querySelectorAll("[data-spell-healing-scale]")) input.value = (spell.healing?.[0]?.atSlotLevel || spell.scaling?.healingAtSlotLevel)?.[input.dataset.spellHealingScale] || "";
    damageComponents.write(spell.damage.slice(1));
    healingComponents.write(spell.healing.slice(1));
    field("condition").value = spell.effects?.find((effect) => effect.type === "condition")?.condition || "";
    for (const input of screen.querySelectorAll("[data-spell-scale]")) input.value = (spell.damage?.[0]?.atSlotLevel || spell.scaling?.atSlotLevel)?.[input.dataset.spellScale] || "";
    animations = structuredClone(spell.animations);
    preservedSpellData = cloneData(spell);
    loadedEditableBaseline = readEditableDraft();
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
      if (damageType && ![spell.damageType, ...(spell.damage || []).map((entry) => entry.damageType || entry.type)].some((value) => normalizedSearch(value) === damageType)) return false;
      const concentration = filter("concentration").value;
      const ritual = filter("ritual").value;
      if (concentration && String(Boolean(spell.concentration || spell.targeting?.duration?.concentration)) !== concentration) return false;
      if (ritual && String(spell.ritual === true) !== ritual) return false;
      if (search && ![spell.name, spell.description, spell.tags.join(" ")].some((entry) => normalizedSearch(entry).includes(search))) return false;
      return true;
    }).sort((left, right) => {
      const sort = filter("sort").value;
      if (sort === "level") return left.level - right.level || left.name.localeCompare(right.name);
      if (sort === "name") return left.name.localeCompare(right.name);
      return Number(right.updatedAtMillis || 0) - Number(left.updatedAtMillis || 0) || left.name.localeCompare(right.name);
    });
  }

  function renderLibrary() {
    const visible = visibleRecords();
    const pageState = libraryPager.getState();
    const entries = visible.length ? visible.map((spell) => `<button type="button" data-library-spell-id="${escapeHtml(spell.id)}" class="${spell.id === selectedId ? "selected" : ""}">
      <span aria-hidden="true">${spell.level || "C"}</span><span><strong>${escapeHtml(spell.name)}</strong><small>${escapeHtml(spellLevelLabel(spell.level))} · ${escapeHtml(spell.school)}${spell.damageType ? ` · ${escapeHtml(spell.damageType)}` : ""}</small></span>
    </button>`).join("") : `<p class="spell-creator-empty">${refreshError ? "Saved spells remain unavailable. Use Refresh to retry." : "No personal spells match these filters."}</p>`;
    libraryRoot.innerHTML = entries + (records.length ? `<div class="spell-creator-library-more"><small>${records.length} spell${records.length === 1 ? "" : "s"} loaded${pageState.hasMore ? "; filters apply to loaded spells" : ""}</small>${pageState.hasMore ? `<button type="button" data-spell-action="load-more">Load more</button>` : ""}</div>` : "");
  }

  async function refresh() {
    refreshError = null;
    try {
      records = (await libraryPager.refresh()).records;
      renderLibrary();
      return records;
    } catch (error) {
      refreshError = error;
      records = libraryPager.getState().records;
      renderLibrary();
      setStatus(`Spell Library could not load: ${error.message}`);
      return records;
    }
  }

  async function loadMore() {
    if (!libraryPager.getState().hasMore) return records;
    setStatus("Loading more spells…");
    try {
      records = (await libraryPager.loadMore()).records;
      renderLibrary();
      setStatus(`${records.length} spells loaded.`);
    } catch (error) {
      records = libraryPager.getState().records;
      renderLibrary();
      setStatus(`More spells could not load: ${error.message}`);
    }
    return records;
  }

  async function save() {
    if (busy) return null;
    const draft = rawDraft();
    const errors = validateHomebrewSpell(draft);
    if (errors.length) { setStatus(errors.join(" ")); return null; }
    setBusy(true); setStatus("Saving to My Library…");
    try {
      const saved = await persistence.save(draft);
      records = libraryPager.retain(saved).records;
      applySpell(saved); draftLifecycle.markClean(); renderLibrary(); await refresh();
      setStatus(refreshError ? creatorSaveRefreshMessage(saved.name, refreshError) : `${saved.name} saved to My Library.`);
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
      libraryPager.remove(selectedId);
      applySpell({}); draftLifecycle.markClean(); await refresh(); setStatus("Spell deleted."); return true;
    } catch (error) { setStatus(`Spell could not be deleted: ${error.message}`); return false; }
    finally { setBusy(false); }
  }

  function duplicate() {
    applySpell(createIndependentSpellCopy(rawDraft()));
    draftLifecycle.markChanged();
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

  const draftLifecycle = createCreatorDraftLifecycle({
    root: screen,
    creatorId: "spell",
    getUserId,
    getDraft: rawDraft,
    applyDraft: applySpell,
    requestConfirmation: requestAppConfirmation,
    onStatus: setStatus
  });

  on(form, "input", renderPreview);
  for (const control of screen.querySelectorAll("[data-spell-filter]")) on(control, "input", renderLibrary);
  on(libraryRoot, "click", async (event) => {
    const button = event.target.closest("[data-library-spell-id]");
    if (!button) return;
    if (!await draftLifecycle.confirmReplacement("open the selected spell")) return;
    try { applySpell(await persistence.load(button.dataset.librarySpellId)); draftLifecycle.markClean(); renderLibrary(); setStatus("Saved spell loaded."); }
    catch (error) { setStatus(error.message); }
  });
  on(screen, "click", async (event) => {
    const button = event.target.closest("[data-spell-action]");
    if (!button) return;
    const action = button.dataset.spellAction;
    if (action === "back" && await draftLifecycle.confirmReplacement("return to the battle map", { restoreBaseline: true })) onBack();
    if (action === "new" && await draftLifecycle.confirmReplacement("start a new spell")) { applySpell({}); draftLifecycle.markClean(); setStatus("New spell ready."); }
    if (action === "save") void save();
    if (action === "duplicate") duplicate();
    if (action === "delete") void remove();
    if (action === "publish") publish();
    if (action === "browse") onBrowseWorkshop({ assetType: "spell", tab: "browse" });
    if (action === "refresh") void refresh();
    if (action === "load-more") void loadMore();
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
  draftLifecycle.markClean();
  draftLifecycle.recover();
  void refresh();
  return Object.freeze({
    refresh,
    save,
    remove,
    getDraft: rawDraft,
    async editAnimations(previewOnly = false) { return editAnimations(previewOnly); },
    async openSpell(spell, { duplicate: makeCopy = false } = {}) {
      if (!await draftLifecycle.confirmReplacement("open another spell")) return false;
      applySpell(makeCopy ? createIndependentSpellCopy(spell) : spell);
      if (makeCopy) draftLifecycle.markChanged();
      else draftLifecycle.markClean();
      setStatus(makeCopy ? "Independent copy opened. Save it to My Library." : "Spell opened.");
      return true;
    },
    confirmNavigation() {
      return draftLifecycle.confirmReplacement("navigate away", { restoreBaseline: true });
    },
    destroy() { draftLifecycle.destroy(); listeners.forEach((removeListener) => removeListener()); }
  });
}
