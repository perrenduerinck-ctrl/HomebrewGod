export const MONSTER_ENTRY_FIELDS = Object.freeze([
  "traits",
  "actions",
  "bonusActions",
  "reactions",
  "legendaryActions",
  "lairActions"
]);

export const MONSTER_ENTRY_LABELS = Object.freeze({
  traits: "Traits",
  actions: "Actions",
  bonusActions: "Bonus Actions",
  reactions: "Reactions",
  legendaryActions: "Legendary Actions",
  lairActions: "Lair Actions"
});

const text = (value, fallback = "") => String(value ?? "").trim() || fallback;
const slug = value => text(value, "entry").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "entry";

function normalizeSequence(sequence) {
  return Array.isArray(sequence) ? JSON.parse(JSON.stringify(sequence)) : undefined;
}

function parseNamedEntry(value) {
  if (value && typeof value === "object") {
    const name = text(value.name || value.title);
    const description = text(value.description || value.text || value.details);
    if (!name && !description) return null;
    return {
      id: text(value.id),
      name: name || "Feature",
      description,
      ...(Array.isArray(value.sequence) ? { sequence: normalizeSequence(value.sequence) } : {})
    };
  }
  const source = text(value);
  if (!source) return null;
  const separator = source.indexOf("|");
  return separator < 0
    ? { name: source, description: "" }
    : { name: text(source.slice(0, separator), "Feature"), description: text(source.slice(separator + 1)) };
}

export function parseMonsterNamedEntries(value) {
  const entries = Array.isArray(value) ? value : String(value ?? "").split(/\r?\n/);
  return entries.map(parseNamedEntry).filter(Boolean);
}

export function stableMonsterActionId(field, name, index = 0) {
  return `monster-action-${slug(field)}-${slug(name)}-${Math.max(0, Number(index) || 0)}`;
}

export function formatMonsterNamedEntries(entries) {
  return parseMonsterNamedEntries(entries).map(entry => entry.description
    ? `${entry.name} | ${entry.description}`
    : entry.name).join("\n");
}

function uniqueId(field, name, entries, preferred = "") {
  const used = new Set(entries.map(entry => entry.id).filter(Boolean));
  if (preferred && !used.has(preferred)) return preferred;
  const base = stableMonsterActionId(field, name, entries.length);
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix++;
  return `${base}-${suffix}`;
}

function cloneEntry(entry) {
  return { id: entry.id, name: entry.name, description: entry.description,
    ...(entry.sequence ? { sequence: normalizeSequence(entry.sequence) } : {}) };
}

export function createMonsterEntryEditor({ root, legacyControls = {}, onChange = () => {} } = {}) {
  if (!root) return null;
  const document = root.ownerDocument || globalThis.document;
  root.replaceChildren();
  const state = new Map();
  const collapsed = new Set();
  const listeners = [];
  let disabled = false, dragged = null;
  const listen = (element, event, handler) => {
    element?.addEventListener(event, handler);
    listeners.push(() => element?.removeEventListener(event, handler));
  };

  function entriesFor(field) {
    return state.get(field) || [];
  }

  function syncLegacy(field) {
    const control = legacyControls[field];
    const value = formatMonsterNamedEntries(entriesFor(field));
    if (control) control.value = value;
    const section = root.querySelector(`[data-monster-entry-section="${field}"]`);
    if (section) section.dataset.legacyValue = value;
  }

  function ingestLegacy(field) {
    const control = legacyControls[field];
    const section = root.querySelector(`[data-monster-entry-section="${field}"]`);
    if (!control || control.value === (section?.dataset.legacyValue || "")) return false;
    const current = entriesFor(field), used = new Set();
    const next = parseMonsterNamedEntries(control.value).map((entry, index, parsed) => {
      let match = current.findIndex((candidate, candidateIndex) => !used.has(candidateIndex) && candidate.name === entry.name);
      if (match < 0 && current[index] && !used.has(index)) match = index;
      if (match >= 0) used.add(match);
      const id = entry.id || current[match]?.id || uniqueId(field, entry.name, [...current, ...parsed.slice(0, index)]);
      return { ...entry, id };
    });
    state.set(field, next); renderSection(field); return true;
  }

  function button(label, action, title = label) {
    const element = document.createElement("button");
    element.type = "button"; element.dataset.entryAction = action; element.textContent = label; element.title = title;
    if (title !== label) element.setAttribute("aria-label", title);
    return element;
  }

  function renderSection(field) {
    const section = root.querySelector(`[data-monster-entry-section="${field}"]`);
    if (!section) return;
    const entries = entriesFor(field), list = section.querySelector("[data-entry-list]");
    section.querySelector("[data-entry-count]").textContent = `${entries.length}`;
    list.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement("p"); empty.className = "monster-entry-empty";
      empty.textContent = `No ${MONSTER_ENTRY_LABELS[field].toLowerCase()} yet.`; list.append(empty);
    }
    entries.forEach((entry, index) => {
      const card = document.createElement("article"); card.className = "monster-entry-card";
      card.dataset.entryId = entry.id; card.draggable = !disabled;
      const header = document.createElement("header"); header.className = "monster-entry-card-header";
      const drag = document.createElement("span"); drag.className = "monster-entry-drag"; drag.textContent = "⋮⋮"; drag.title = "Drag to reorder";
      const title = document.createElement("strong"); title.dataset.entryTitle = "true"; title.textContent = entry.name || "Untitled entry";
      const controls = document.createElement("div"); controls.className = "monster-entry-card-actions";
      const toggle = button(collapsed.has(entry.id) ? "Expand" : "Collapse", "toggle"); toggle.setAttribute("aria-expanded", String(!collapsed.has(entry.id)));
      const up = button("↑", "up", "Move up"); up.disabled = disabled || index === 0;
      const down = button("↓", "down", "Move down"); down.disabled = disabled || index === entries.length - 1;
      const duplicate = button("Duplicate", "duplicate"); const remove = button("Delete", "delete");
      controls.append(toggle, up, down, duplicate, remove); header.append(drag, title, controls); card.append(header);
      const body = document.createElement("div"); body.className = "monster-entry-card-body"; body.hidden = collapsed.has(entry.id);
      const nameLabel = document.createElement("label"); nameLabel.textContent = "Name";
      const name = document.createElement("input"); name.type = "text"; name.value = entry.name; name.dataset.entryField = "name"; name.disabled = disabled; nameLabel.append(name);
      const descriptionLabel = document.createElement("label"); descriptionLabel.textContent = "Description";
      const description = document.createElement("textarea"); description.value = entry.description; description.dataset.entryField = "description"; description.disabled = disabled; descriptionLabel.append(description);
      body.append(nameLabel, descriptionLabel); card.append(body); list.append(card);
      for (const control of [toggle, duplicate, remove]) control.disabled = disabled;
    });
    section.querySelector('[data-entry-action="add"]').disabled = disabled;
    syncLegacy(field);
  }

  function notify(field) {
    syncLegacy(field); onChange(field, entriesFor(field).map(cloneEntry));
  }

  function move(field, from, to) {
    const entries = entriesFor(field);
    if (from < 0 || to < 0 || from === to || from >= entries.length || to >= entries.length) return;
    const [entry] = entries.splice(from, 1); entries.splice(to, 0, entry);
    renderSection(field); notify(field);
  }

  for (const field of MONSTER_ENTRY_FIELDS) {
    const section = document.createElement("section"); section.className = "monster-entry-section"; section.dataset.monsterEntrySection = field;
    const heading = document.createElement("header"); heading.className = "monster-entry-section-heading";
    const title = document.createElement("h4"); title.textContent = MONSTER_ENTRY_LABELS[field];
    const count = document.createElement("span"); count.dataset.entryCount = "true";
    const add = button(`Add ${MONSTER_ENTRY_LABELS[field].replace(/s$/, "")}`, "add");
    heading.append(title, count, add);
    const list = document.createElement("div"); list.className = "monster-entry-list"; list.dataset.entryList = "true";
    section.append(heading, list); root.append(section); state.set(field, []);
    const legacy = legacyControls[field]; if (legacy) { legacy.hidden = true; legacy.classList.add("monster-entry-legacy"); }
    renderSection(field);
  }

  listen(root, "input", event => {
    const input = event.target.closest("[data-entry-field]"); if (!input) return;
    const section = input.closest("[data-monster-entry-section]"), card = input.closest("[data-entry-id]");
    const field = section.dataset.monsterEntrySection, entry = entriesFor(field).find(item => item.id === card.dataset.entryId);
    if (!entry) return;
    entry[input.dataset.entryField] = input.value;
    if (input.dataset.entryField === "name") card.querySelector("[data-entry-title]").textContent = input.value.trim() || "Untitled entry";
    notify(field);
  });
  listen(root, "click", event => {
    const action = event.target.closest("[data-entry-action]"); if (!action || disabled) return;
    const section = action.closest("[data-monster-entry-section]"), field = section.dataset.monsterEntrySection;
    const entries = entriesFor(field), card = action.closest("[data-entry-id]"), index = card ? entries.findIndex(entry => entry.id === card.dataset.entryId) : -1;
    if (action.dataset.entryAction === "add") {
      const entry = { id: uniqueId(field, "New Entry", entries), name: "New Entry", description: "" };
      entries.push(entry); collapsed.delete(entry.id); renderSection(field); notify(field);
      root.querySelector(`[data-entry-id="${entry.id}"] [data-entry-field="name"]`)?.focus();
    } else if (index >= 0 && action.dataset.entryAction === "delete") {
      entries.splice(index, 1); renderSection(field); notify(field);
    } else if (index >= 0 && action.dataset.entryAction === "duplicate") {
      const copy = { ...cloneEntry(entries[index]), id: uniqueId(field, `${entries[index].name} Copy`, entries), name: `${entries[index].name} Copy` };
      entries.splice(index + 1, 0, copy); renderSection(field); notify(field);
    } else if (index >= 0 && action.dataset.entryAction === "toggle") {
      if (collapsed.has(entries[index].id)) collapsed.delete(entries[index].id); else collapsed.add(entries[index].id); renderSection(field);
    } else if (index >= 0 && action.dataset.entryAction === "up") move(field, index, index - 1);
    else if (index >= 0 && action.dataset.entryAction === "down") move(field, index, index + 1);
  });
  listen(root, "dragstart", event => {
    const card = event.target.closest("[data-entry-id]"); if (!card || disabled) return;
    dragged = { field: card.closest("[data-monster-entry-section]").dataset.monsterEntrySection, id: card.dataset.entryId };
    card.classList.add("is-dragging"); event.dataTransfer?.setData("text/plain", dragged.id);
  });
  listen(root, "dragover", event => { if (event.target.closest("[data-entry-id]")) event.preventDefault(); });
  listen(root, "drop", event => {
    const target = event.target.closest("[data-entry-id]"); if (!dragged || !target) return;
    event.preventDefault(); const field = target.closest("[data-monster-entry-section]").dataset.monsterEntrySection;
    if (field !== dragged.field) return;
    const entries = entriesFor(field); move(field, entries.findIndex(entry => entry.id === dragged.id), entries.findIndex(entry => entry.id === target.dataset.entryId)); dragged = null;
  });
  listen(root, "dragend", () => { root.querySelector(".is-dragging")?.classList.remove("is-dragging"); dragged = null; });
  for (const field of MONSTER_ENTRY_FIELDS) listen(legacyControls[field], "input", () => {
    if (ingestLegacy(field)) onChange(field, entriesFor(field).map(cloneEntry));
  });

  function write(field, entries, { silent = false } = {}) {
    const next = [];
    for (const entry of parseMonsterNamedEntries(entries)) next.push({ ...entry, id: uniqueId(field, entry.name, next, entry.id) });
    state.set(field, next); renderSection(field); if (!silent) notify(field);
  }

  return Object.freeze({
    read(field) { ingestLegacy(field); return entriesFor(field).map(cloneEntry); },
    readAll() {
      return Object.fromEntries(MONSTER_ENTRY_FIELDS.map((field) => {
        ingestLegacy(field);
        return [field, entriesFor(field).map(cloneEntry)];
      }));
    },
    write,
    writeAll(monster, options = {}) { for (const field of MONSTER_ENTRY_FIELDS) write(field, monster?.[field], options); },
    setDisabled(value) { disabled = Boolean(value); for (const field of MONSTER_ENTRY_FIELDS) renderSection(field); },
    getControls() { return [...root.querySelectorAll("input, textarea, button")]; },
    destroy() { listeners.splice(0).forEach(remove => remove()); }
  });
}
