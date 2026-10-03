const text = (value, fallback = "") => String(value ?? "").trim() || fallback;
const ABILITIES = Object.freeze(["int", "wis", "cha", "str", "dex", "con"]);
const USAGES = Object.freeze([
  ["atWill", "At Will"],
  ["daily", "X / Day"],
  ["slot", "Spell Slot"],
  ["innate", "Innate Spellcasting"]
]);

function numberOrBlank(value) {
  if (value === "" || value == null) return "";
  const number = Number(value);
  return Number.isFinite(number) ? number : "";
}

export function normalizeMonsterSpellReference(value, index = 0) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const name = text(value.name || value.label);
  const sourceId = text(value.sourceId || value.spellId || value.id);
  if (!name && !sourceId) return null;
  const source = value.source === "custom" ? "custom" : "library";
  const usage = USAGES.some(([key]) => key === value.usage) ? value.usage : "atWill";
  return {
    id: text(value.id, `monster-spell-${sourceId || name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || index}`),
    source,
    sourceId,
    name: name || sourceId || "Unnamed Spell",
    usage,
    uses: Math.max(1, Math.round(Number(value.uses) || 1)),
    level: Math.max(0, Math.min(9, Math.round(Number(value.level) || 0))),
    slots: Math.max(1, Math.round(Number(value.slots) || 1))
  };
}

export function normalizeMonsterSpellcasting(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const spells = (Array.isArray(source.spells) ? source.spells : [])
    .map(normalizeMonsterSpellReference)
    .filter(Boolean);
  return {
    enabled: source.enabled == null
      ? Boolean(spells.length || source.saveDc !== undefined || source.attackBonus !== undefined || source.casterLevel !== undefined)
      : Boolean(source.enabled),
    ability: ABILITIES.includes(text(source.ability).toLowerCase()) ? text(source.ability).toLowerCase() : "int",
    saveDc: numberOrBlank(source.saveDc),
    attackBonus: numberOrBlank(source.attackBonus),
    casterLevel: numberOrBlank(source.casterLevel),
    spells
  };
}

function uniqueId(spells) {
  let index = spells.length + 1;
  while (spells.some((spell) => spell.id === `monster-spell-${index}`)) index += 1;
  return `monster-spell-${index}`;
}

function labeled(document, labelText, control) {
  const label = document.createElement("label");
  const span = document.createElement("span");
  span.textContent = labelText;
  label.append(span, control);
  return label;
}

function makeSelect(document, values, selected) {
  const select = document.createElement("select");
  for (const [value, label] of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.append(option);
  }
  select.value = selected;
  return select;
}

export function createMonsterSpellcastingEditor({
  root,
  onChange = () => {},
  listSpellReferences = null
} = {}) {
  if (!root) return null;
  const document = root.ownerDocument || globalThis.document;
  let state = normalizeMonsterSpellcasting();
  let disabled = false;
  let libraryRecords = [];
  let libraryStatus = "";
  const listeners = [];
  const listen = (event, handler) => {
    root.addEventListener(event, handler);
    listeners.push(() => root.removeEventListener(event, handler));
  };

  function render() {
    root.replaceChildren();
    root.className = "monster-advanced-card monster-spellcasting-editor";
    const details = document.createElement("details");
    details.open = state.enabled;
    const summary = document.createElement("summary");
    summary.textContent = "Monster Spellcasting";
    const basics = document.createElement("div");
    basics.className = "monster-spellcasting-basics";

    const enabled = document.createElement("input");
    enabled.type = "checkbox";
    enabled.checked = state.enabled;
    enabled.dataset.spellcastingField = "enabled";
    const ability = makeSelect(document, ABILITIES.map((key) => [key, key.toUpperCase()]), state.ability);
    ability.dataset.spellcastingField = "ability";
    const fields = [
      ["Spellcasting Creature", enabled],
      ["Ability", ability]
    ];
    for (const [name, value, type] of [
      ["Spell Save DC", state.saveDc, "number"],
      ["Spell Attack Bonus", state.attackBonus, "number"],
      ["Caster Level", state.casterLevel, "number"]
    ]) {
      const input = document.createElement("input");
      input.type = type;
      input.value = value;
      input.dataset.spellcastingField = name === "Spell Save DC" ? "saveDc" : name === "Spell Attack Bonus" ? "attackBonus" : "casterLevel";
      fields.push([name, input]);
    }
    fields.forEach(([label, control]) => basics.append(labeled(document, label, control)));

    const heading = document.createElement("div");
    heading.className = "monster-spell-list-heading";
    const title = document.createElement("strong");
    title.textContent = "Spell References";
    const add = document.createElement("button");
    add.type = "button";
    add.dataset.spellAction = "add";
    add.textContent = "Add Spell";
    const loadLibrary = document.createElement("button");
    loadLibrary.type = "button";
    loadLibrary.dataset.spellAction = "load-library";
    loadLibrary.dataset.requiresSpellLibrary = "true";
    loadLibrary.textContent = libraryRecords.length ? "Refresh Spell Library" : "Browse Spell Library";
    loadLibrary.disabled = typeof listSpellReferences !== "function";
    heading.append(title, add, loadLibrary);
    if (libraryRecords.length) {
      const picker = makeSelect(
        document,
        [["", "Choose a Library spell…"], ...libraryRecords.map((record) => [record.sourceRecordId, record.name])],
        ""
      );
      picker.dataset.spellLibraryChoice = "true";
      const addSelected = document.createElement("button");
      addSelected.type = "button";
      addSelected.dataset.spellAction = "add-library";
      addSelected.textContent = "Add Selected Spell";
      heading.append(picker, addSelected);
    }
    const list = document.createElement("div");
    list.className = "monster-spell-reference-list";

    state.spells.forEach((spell) => {
      const row = document.createElement("article");
      row.className = "monster-spell-reference";
      row.dataset.spellId = spell.id;
      const source = makeSelect(document, [["library", "Spell Library"], ["custom", "Custom Homebrew"]], spell.source);
      source.dataset.spellField = "source";
      const name = document.createElement("input");
      name.value = spell.name;
      name.placeholder = "Spell name";
      name.dataset.spellField = "name";
      const sourceId = document.createElement("input");
      sourceId.value = spell.sourceId;
      sourceId.placeholder = "Stable spell ID";
      sourceId.dataset.spellField = "sourceId";
      const usage = makeSelect(document, USAGES, spell.usage);
      usage.dataset.spellField = "usage";
      const uses = document.createElement("input");
      uses.type = "number";
      uses.min = "1";
      uses.value = spell.uses;
      uses.title = "Uses per day";
      uses.dataset.spellField = "uses";
      const level = document.createElement("input");
      level.type = "number";
      level.min = "0";
      level.max = "9";
      level.value = spell.level;
      level.title = "Spell level";
      level.dataset.spellField = "level";
      const slots = document.createElement("input");
      slots.type = "number";
      slots.min = "1";
      slots.value = spell.slots;
      slots.title = "Slots";
      slots.dataset.spellField = "slots";
      const remove = document.createElement("button");
      remove.type = "button";
      remove.dataset.spellAction = "delete";
      remove.textContent = "Delete";
      row.append(source, name, sourceId, usage, uses, level, slots, remove);
      list.append(row);
    });
    if (!state.spells.length) {
      const empty = document.createElement("p");
      empty.className = "monster-entry-empty";
      empty.textContent = "No spell references yet.";
      list.append(empty);
    }
    details.append(summary, basics, heading, list);
    if (libraryStatus) {
      const status = document.createElement("small");
      status.className = "monster-spell-library-status";
      status.textContent = libraryStatus;
      details.append(status);
    }
    root.append(details);
    root.querySelectorAll("input, select, button").forEach((control) => {
      control.disabled = disabled || (
        control.dataset.requiresSpellLibrary === "true" &&
        typeof listSpellReferences !== "function"
      );
    });
  }

  function notify() {
    onChange(normalizeMonsterSpellcasting(state));
  }

  listen("input", (event) => {
    const basic = event.target.closest("[data-spellcasting-field]");
    if (basic) {
      const key = basic.dataset.spellcastingField;
      state[key] = basic.type === "checkbox" ? basic.checked : basic.value;
      state = normalizeMonsterSpellcasting(state);
      notify();
      return;
    }
    const input = event.target.closest("[data-spell-field]");
    const row = input?.closest("[data-spell-id]");
    const spell = state.spells.find((entry) => entry.id === row?.dataset.spellId);
    if (!spell) return;
    spell[input.dataset.spellField] = input.value;
    state = normalizeMonsterSpellcasting(state);
    notify();
  });
  listen("change", (event) => {
    if (event.target.matches("select")) event.target.dispatchEvent(new Event("input", { bubbles: true }));
  });
  listen("click", async (event) => {
    const action = event.target.closest("[data-spell-action]");
    if (!action || disabled) return;
    if (action.dataset.spellAction === "load-library") {
      libraryStatus = "Loading Spell Library…";
      render();
      try {
        const records = await listSpellReferences();
        libraryRecords = (Array.isArray(records) ? records : [])
          .map((record) => ({
            sourceRecordId: text(record.sourceRecordId || record.id),
            name: text(record.name, "Unnamed Spell")
          }))
          .filter((record) => record.sourceRecordId);
        libraryStatus = libraryRecords.length
          ? `${libraryRecords.length} Spell Library reference${libraryRecords.length === 1 ? "" : "s"} ready.`
          : "No personal Spell Library records were found.";
      } catch (error) {
        libraryStatus = error?.message || "Spell Library could not be loaded.";
      }
      render();
      return;
    }
    if (action.dataset.spellAction === "add-library") {
      const sourceId = root.querySelector("[data-spell-library-choice]")?.value;
      const selected = libraryRecords.find((record) => record.sourceRecordId === sourceId);
      if (!selected) return;
      state.spells.push(normalizeMonsterSpellReference({
        id: uniqueId(state.spells),
        source: "library",
        sourceId: selected.sourceRecordId,
        name: selected.name,
        usage: "atWill"
      }, state.spells.length));
    } else if (action.dataset.spellAction === "add") {
      state.spells.push(normalizeMonsterSpellReference({ id: uniqueId(state.spells), name: "New Spell" }, state.spells.length));
    } else {
      const id = action.closest("[data-spell-id]")?.dataset.spellId;
      state.spells = state.spells.filter((spell) => spell.id !== id);
    }
    render();
    notify();
  });

  render();
  return Object.freeze({
    read: () => normalizeMonsterSpellcasting(state),
    write(value, { silent = false } = {}) {
      state = normalizeMonsterSpellcasting(value);
      render();
      if (!silent) notify();
    },
    setDisabled(value) {
      disabled = Boolean(value);
      render();
    },
    destroy() {
      listeners.splice(0).forEach((remove) => remove());
    }
  });
}
