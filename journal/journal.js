import { createRealtimeListenerRegistry } from "../shared/realtimeListeners.js";
import {
  JOURNAL_CATEGORIES,
  JOURNAL_COLLECTIONS,
  canMutateJournalEntry,
  journalCollectionForVisibility,
  journalEntryMatches,
  normalizeJournalEntry,
  sanitizeJournalHtml
} from "./journalModel.js";

function makeId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID().replace(/[^a-zA-Z0-9_-]/g, "-");
  }
  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function timestampLabel(entry) {
  const value = Number(entry?.updatedAtMillis || entry?.createdAtMillis || 0);
  if (!value) return "Not saved yet";
  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function visibilityLabel(value) {
  if (value === "dm") return "DM only";
  if (value === "shared") return "Shared";
  return "Personal";
}

export function createJournalSystem(options = {}) {
  const {
    document,
    db,
    collection,
    doc,
    query,
    where,
    onSnapshot,
    setDoc,
    deleteDoc,
    writeBatch,
    serverTimestamp,
    requestConfirmation = async (message) => globalThis.confirm?.(message) === true
  } = options;
  const listeners = createRealtimeListenerRegistry({
    onStopError: (error) => console.warn("Journal listener cleanup failed:", error)
  });
  const state = {
    roomCode: "",
    userId: "",
    userName: "Player",
    isDm: false,
    entriesByVisibility: new Map([
      ["shared", new Map()],
      ["personal", new Map()],
      ["dm", new Map()]
    ]),
    current: null,
    saveTimer: null,
    saving: false,
    dirty: false
  };

  const root = document.createElement("section");
  root.className = "hg-journal";
  root.setAttribute("aria-label", "Campaign journal");
  root.innerHTML = `
    <header class="hg-journal-header">
      <div>
        <span class="hg-eyebrow">Campaign knowledge</span>
        <h3>Journal</h3>
      </div>
      <button type="button" class="hg-button-primary" data-journal-new>New note</button>
    </header>
    <div class="hg-journal-filters">
      <input type="search" maxlength="160" placeholder="Search titles and notes" aria-label="Search journal" data-journal-search>
      <select aria-label="Filter journal category" data-journal-filter>
        <option value="all">All categories</option>
        ${JOURNAL_CATEGORIES.map((category) => `<option value="${category}">${category}</option>`).join("")}
      </select>
    </div>
    <div class="hg-journal-workspace">
      <aside class="hg-journal-list" aria-label="Journal notes" data-journal-list></aside>
      <section class="hg-journal-editor" data-journal-editor hidden>
        <div class="hg-journal-editor-grid">
          <label>Title <input type="text" maxlength="160" data-journal-title></label>
          <label>Category <select data-journal-category>
            ${JOURNAL_CATEGORIES.map((category) => `<option value="${category}">${category}</option>`).join("")}
          </select></label>
          <label class="hg-journal-custom-category" data-journal-custom-wrap hidden>
            Custom category <input type="text" maxlength="80" data-journal-custom-category>
          </label>
          <label>Access <select data-journal-visibility>
            <option value="personal">Personal</option>
            <option value="shared">Shared</option>
            <option value="dm" data-journal-dm-option>DM only</option>
          </select></label>
        </div>
        <div class="hg-journal-formatting" role="toolbar" aria-label="Note formatting">
          <button type="button" data-journal-command="bold" title="Bold"><b>B</b></button>
          <button type="button" data-journal-command="italic" title="Italic"><i>I</i></button>
          <button type="button" data-journal-command="underline" title="Underline"><u>U</u></button>
          <button type="button" data-journal-command="insertUnorderedList" title="Bulleted list">• List</button>
          <button type="button" data-journal-command="insertOrderedList" title="Numbered list">1. List</button>
          <button type="button" data-journal-command="removeFormat" title="Clear formatting">Clear format</button>
        </div>
        <div class="hg-journal-content" contenteditable="true" role="textbox" aria-multiline="true" data-journal-content></div>
        <footer class="hg-journal-editor-footer">
          <div class="hg-journal-actions">
            <button type="button" data-journal-duplicate>Duplicate</button>
            <button type="button" data-journal-reveal hidden></button>
            <button type="button" class="hg-button-danger" data-journal-delete>Delete</button>
          </div>
          <div>
            <small data-journal-timestamp></small>
            <p class="status" role="status" aria-live="polite" data-journal-status></p>
          </div>
        </footer>
      </section>
    </div>
    <p class="hg-journal-empty" data-journal-empty>Select a note or create a new one.</p>
  `;

  const elements = {
    list: root.querySelector("[data-journal-list]"),
    editor: root.querySelector("[data-journal-editor]"),
    empty: root.querySelector("[data-journal-empty]"),
    search: root.querySelector("[data-journal-search]"),
    filter: root.querySelector("[data-journal-filter]"),
    title: root.querySelector("[data-journal-title]"),
    category: root.querySelector("[data-journal-category]"),
    customWrap: root.querySelector("[data-journal-custom-wrap]"),
    customCategory: root.querySelector("[data-journal-custom-category]"),
    visibility: root.querySelector("[data-journal-visibility]"),
    dmOption: root.querySelector("[data-journal-dm-option]"),
    content: root.querySelector("[data-journal-content]"),
    reveal: root.querySelector("[data-journal-reveal]"),
    delete: root.querySelector("[data-journal-delete]"),
    duplicate: root.querySelector("[data-journal-duplicate]"),
    timestamp: root.querySelector("[data-journal-timestamp]"),
    status: root.querySelector("[data-journal-status]")
  };

  function setStatus(message, kind = "") {
    elements.status.textContent = message || "";
    elements.status.dataset.state = kind;
  }

  function allEntries() {
    return [...state.entriesByVisibility.values()]
      .flatMap((records) => [...records.values()])
      .sort((left, right) => (
        Number(right.updatedAtMillis || 0) - Number(left.updatedAtMillis || 0)
      ));
  }

  function entryKey(entry) {
    return `${entry.visibility}/${entry.id}`;
  }

  function findEntry(key) {
    const [visibility, id] = String(key || "").split("/");
    return state.entriesByVisibility.get(visibility)?.get(id) || null;
  }

  function categoryChoice(category) {
    return JOURNAL_CATEGORIES.includes(category) ? category : "Custom";
  }

  function renderList() {
    const search = elements.search.value;
    const requestedCategory = elements.filter.value;
    const entries = allEntries().filter((entry) => {
      const categoryMatches = requestedCategory === "all"
        || entry.category === requestedCategory
        || (
          requestedCategory === "Custom"
          && !JOURNAL_CATEGORIES.includes(entry.category)
        );
      return categoryMatches && journalEntryMatches(entry, { search });
    });
    elements.list.replaceChildren();

    entries.forEach((entry) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "hg-journal-list-item";
      button.dataset.journalKey = entryKey(entry);
      button.classList.toggle("is-active", state.current && entryKey(state.current) === entryKey(entry));
      const title = document.createElement("strong");
      title.textContent = entry.title;
      const meta = document.createElement("span");
      meta.textContent = `${entry.category} · ${visibilityLabel(entry.visibility)}`;
      const time = document.createElement("small");
      time.textContent = timestampLabel(entry);
      button.append(title, meta, time);
      elements.list.append(button);
    });

    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "status";
      empty.textContent = search ? "No notes match this search." : "No notes in this view yet.";
      elements.list.append(empty);
    }
  }

  function renderEditor() {
    const entry = state.current;
    elements.editor.hidden = !entry;
    elements.empty.hidden = Boolean(entry);
    if (!entry) return;
    const choice = categoryChoice(entry.category);
    elements.title.value = entry.title;
    elements.category.value = choice;
    elements.customWrap.hidden = choice !== "Custom";
    elements.customCategory.value = choice === "Custom" ? entry.category : "";
    elements.visibility.value = entry.visibility;
    elements.dmOption.hidden = !state.isDm;
    elements.content.innerHTML = sanitizeJournalHtml(entry.contentHtml, document);
    const mutable = canMutateJournalEntry(entry, state);
    [elements.title, elements.category, elements.customCategory, elements.visibility]
      .forEach((control) => { control.disabled = !mutable; });
    elements.content.contentEditable = mutable ? "true" : "false";
    root.querySelectorAll("[data-journal-command]").forEach((button) => {
      button.disabled = !mutable;
    });
    elements.delete.disabled = !mutable;
    elements.duplicate.disabled = false;
    elements.visibility.querySelector('option[value="personal"]').disabled =
      entry.ownerUid !== state.userId;
    elements.visibility.querySelector('option[value="dm"]').disabled = !state.isDm;
    elements.reveal.hidden = !state.isDm || !["shared", "dm"].includes(entry.visibility);
    elements.reveal.textContent = entry.visibility === "dm" ? "Reveal to players" : "Hide from players";
    elements.timestamp.textContent = `Last modified ${timestampLabel(entry)}`;
    setStatus(state.dirty ? "Unsaved changes" : "Saved", state.dirty ? "pending" : "saved");
  }

  function selectEntry(entry) {
    clearTimeout(state.saveTimer);
    state.saveTimer = null;
    state.current = entry ? { ...entry, _persistedVisibility: entry.visibility } : null;
    state.dirty = false;
    renderList();
    renderEditor();
  }

  function payloadFor(entry, { create = false } = {}) {
    const payload = {
      id: entry.id,
      roomCode: entry.roomCode,
      ownerUid: entry.ownerUid,
      ownerName: entry.ownerName,
      title: entry.title,
      category: entry.category,
      visibility: entry.visibility,
      contentHtml: entry.contentHtml,
      searchText: entry.searchText,
      createdAtMillis: entry.createdAtMillis,
      updatedAtMillis: entry.updatedAtMillis,
      updatedAt: serverTimestamp()
    };
    if (create) payload.createdAt = entry.createdAt || serverTimestamp();
    return payload;
  }

  function entryRef(entry, visibility = entry.visibility) {
    return doc(
      db,
      "rooms",
      entry.roomCode,
      journalCollectionForVisibility(visibility),
      entry.id
    );
  }

  function collectEditorEntry() {
    if (!state.current) return null;
    const choice = elements.category.value;
    const category = choice === "Custom"
      ? (elements.customCategory.value.trim() || "Custom")
      : choice;
    return normalizeJournalEntry({
      ...state.current,
      title: elements.title.value,
      category,
      visibility: elements.visibility.value,
      contentHtml: elements.content.innerHTML,
      updatedAtMillis: Date.now()
    }, {
      roomCode: state.roomCode,
      userId: state.userId,
      userName: state.userName,
      isDm: state.isDm,
      document
    });
  }

  async function saveCurrent({ immediate = false } = {}) {
    clearTimeout(state.saveTimer);
    state.saveTimer = null;
    if (!state.current || state.saving) return false;
    const previous = state.current;
    const entry = collectEditorEntry();
    if (!entry || !canMutateJournalEntry(previous, state)) return false;
    const oldVisibility = previous._persistedVisibility || previous.visibility;
    const moved = oldVisibility !== entry.visibility;
    state.saving = true;
    setStatus(immediate ? "Saving…" : "Auto-saving…", "saving");

    try {
      if (moved) {
        const batch = writeBatch(db);
        batch.set(entryRef(entry), payloadFor(entry, { create: true }));
        batch.delete(entryRef(entry, oldVisibility));
        await batch.commit();
        state.entriesByVisibility.get(oldVisibility)?.delete(entry.id);
      } else {
        const existing = state.entriesByVisibility.get(entry.visibility)?.has(entry.id)
          && previous._isNew !== true;
        await setDoc(entryRef(entry), payloadFor(entry, { create: !existing }), { merge: true });
      }
      const saved = { ...entry, _persistedVisibility: entry.visibility };
      state.entriesByVisibility.get(entry.visibility).set(entry.id, saved);
      state.current = saved;
      state.dirty = false;
      setStatus("Saved", "saved");
      elements.timestamp.textContent = `Last modified ${timestampLabel(saved)}`;
      renderList();
      return true;
    } catch (error) {
      state.dirty = true;
      setStatus(`Save failed: ${error.message}`, "error");
      return false;
    } finally {
      state.saving = false;
    }
  }

  function scheduleSave() {
    if (!state.current || !canMutateJournalEntry(state.current, state)) return;
    state.dirty = true;
    setStatus("Unsaved changes", "pending");
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(() => { void saveCurrent(); }, 700);
  }

  async function createEntry(seed = {}) {
    if (!state.roomCode || !state.userId) return null;
    const visibility = seed.visibility || (state.isDm ? "dm" : "personal");
    const entry = normalizeJournalEntry({
      ...seed,
      id: makeId(),
      roomCode: state.roomCode,
      ownerUid: state.userId,
      ownerName: state.userName,
      visibility,
      createdAtMillis: Date.now(),
      updatedAtMillis: Date.now()
    }, { ...state, document });
    state.entriesByVisibility.get(entry.visibility).set(entry.id, entry);
    selectEntry(entry);
    state.current._isNew = true;
    state.dirty = true;
    await saveCurrent({ immediate: true });
    elements.title.focus();
    elements.title.select();
    return state.current;
  }

  async function deleteCurrent() {
    const entry = state.current;
    if (!entry || !canMutateJournalEntry(entry, state)) return false;
    const confirmed = await requestConfirmation(
      `Delete “${entry.title}”? This cannot be undone.`,
      { title: "Delete journal note", confirmLabel: "Delete" }
    );
    if (!confirmed) return false;
    try {
      await deleteDoc(entryRef(entry));
      state.entriesByVisibility.get(entry.visibility)?.delete(entry.id);
      selectEntry(null);
      renderList();
      return true;
    } catch (error) {
      setStatus(`Delete failed: ${error.message}`, "error");
      return false;
    }
  }

  async function duplicateCurrent() {
    if (!state.current) return null;
    return createEntry({
      ...state.current,
      title: `${state.current.title} (Copy)`,
      ownerUid: state.userId,
      ownerName: state.userName,
      visibility: state.current.visibility === "dm" && !state.isDm
        ? "personal"
        : state.current.visibility
    });
  }

  function applySnapshot(visibility, snapshot, isCurrent) {
    if (!isCurrent()) return;
    const records = new Map();
    snapshot.docs.forEach((snapshotDoc) => {
      const entry = normalizeJournalEntry({
        ...snapshotDoc.data(),
        id: snapshotDoc.id,
        visibility
      }, { ...state, document });
      records.set(entry.id, entry);
    });
    state.entriesByVisibility.set(visibility, records);
    if (state.current && state.current.visibility === visibility && !state.dirty) {
      const fresh = records.get(state.current.id);
      if (fresh) state.current = { ...fresh, _persistedVisibility: visibility };
      else state.current = null;
    }
    renderList();
    renderEditor();
  }

  function connectVisibility(visibility) {
    const collectionName = JOURNAL_COLLECTIONS[visibility];
    const base = collection(db, "rooms", state.roomCode, collectionName);
    const source = visibility === "personal"
      ? query(base, where("ownerUid", "==", state.userId))
      : base;
    const scope = `${state.roomCode}/${state.userId}/${state.isDm}/${visibility}`;
    listeners.connect(`journal-${visibility}`, scope, ({ isCurrent }) => onSnapshot(
      source,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (snapshot.metadata?.hasPendingWrites) return;
        applySnapshot(visibility, snapshot, isCurrent);
      },
      (error) => {
        if (isCurrent()) setStatus(`Journal sync failed: ${error.message}`, "error");
      }
    ));
  }

  function connect() {
    if (!state.roomCode || !state.userId) return false;
    connectVisibility("shared");
    connectVisibility("personal");
    if (state.isDm) connectVisibility("dm");
    else {
      listeners.stop("journal-dm");
      state.entriesByVisibility.set("dm", new Map());
    }
    return true;
  }

  function disconnect({ clear = true } = {}) {
    listeners.stopAll();
    clearTimeout(state.saveTimer);
    state.saveTimer = null;
    state.saving = false;
    if (clear) {
      state.entriesByVisibility.forEach((records) => records.clear());
      state.current = null;
      state.dirty = false;
      renderList();
      renderEditor();
    }
  }

  function setContext(next = {}) {
    const nextContext = {
      roomCode: String(next.roomCode || ""),
      userId: String(next.userId || ""),
      userName: String(next.userName || "Player"),
      isDm: next.isDm === true
    };
    const changed = nextContext.roomCode !== state.roomCode
      || nextContext.userId !== state.userId
      || nextContext.isDm !== state.isDm;
    Object.assign(state, nextContext);
    elements.dmOption.hidden = !state.isDm;
    if (changed) {
      disconnect();
      connect();
    }
    return getState();
  }

  root.addEventListener("click", (event) => {
    const listButton = event.target.closest("[data-journal-key]");
    if (listButton) {
      const entry = findEntry(listButton.dataset.journalKey);
      if (entry) selectEntry(entry);
      return;
    }
    const commandButton = event.target.closest("[data-journal-command]");
    if (commandButton && state.current) {
      event.preventDefault();
      elements.content.focus();
      document.execCommand?.(commandButton.dataset.journalCommand, false, null);
      scheduleSave();
      return;
    }
    if (event.target.closest("[data-journal-new]")) void createEntry();
    if (event.target.closest("[data-journal-delete]")) void deleteCurrent();
    if (event.target.closest("[data-journal-duplicate]")) void duplicateCurrent();
    if (event.target.closest("[data-journal-reveal]") && state.current) {
      elements.visibility.value = state.current.visibility === "dm" ? "shared" : "dm";
      void saveCurrent({ immediate: true });
    }
  });

  [elements.title, elements.customCategory, elements.visibility].forEach((control) => {
    control.addEventListener("input", scheduleSave);
    control.addEventListener("change", scheduleSave);
  });
  elements.category.addEventListener("change", () => {
    elements.customWrap.hidden = elements.category.value !== "Custom";
    scheduleSave();
  });
  elements.content.addEventListener("input", scheduleSave);
  elements.content.addEventListener("blur", () => {
    if (state.dirty) void saveCurrent({ immediate: true });
  });
  elements.search.addEventListener("input", renderList);
  elements.filter.addEventListener("change", renderList);

  function getState() {
    return {
      roomCode: state.roomCode,
      userId: state.userId,
      isDm: state.isDm,
      entryCount: allEntries().length,
      currentId: state.current?.id || "",
      dirty: state.dirty,
      listeners: listeners.getSnapshot()
    };
  }

  renderList();
  renderEditor();

  return Object.freeze({
    root,
    setContext,
    connect,
    disconnect,
    createEntry,
    saveCurrent,
    getState
  });
}
