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
    runTransaction,
    writeBatch,
    serverTimestamp,
    storage = globalThis.localStorage,
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
    savePromise: null,
    saveQueued: false,
    dirty: false,
    editRevision: 0,
    contextVersion: 0,
    deletingKey: "",
    pendingDeletes: new Set(),
    conflict: false,
    statusMessage: "",
    statusKind: ""
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
            <button type="button" data-journal-retry hidden>Retry save</button>
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
    retry: root.querySelector("[data-journal-retry]"),
    timestamp: root.querySelector("[data-journal-timestamp]"),
    status: root.querySelector("[data-journal-status]")
  };

  function setStatus(message, kind = "") {
    state.statusMessage = message || "";
    state.statusKind = kind;
    elements.status.textContent = state.statusMessage;
    elements.status.dataset.state = state.statusKind;
    elements.retry.hidden = !["error", "conflict"].includes(kind);
    elements.retry.textContent = kind === "conflict" ? "Save draft as copy" : "Retry save";
  }

  const RECOVERY_PREFIX = "homebrew-god:journal-draft:v1";

  function recoveryContextKey(roomCode = state.roomCode, userId = state.userId) {
    return `${RECOVERY_PREFIX}:${encodeURIComponent(userId)}:${encodeURIComponent(roomCode)}`;
  }

  function recoveryEntryKey(entry) {
    return `${recoveryContextKey(entry.roomCode, entry._recoveryUserId || state.userId)}:${encodeURIComponent(entry.id)}`;
  }

  function readStorage(key) {
    try {
      return storage?.getItem?.(key) || "";
    } catch {
      return "";
    }
  }

  function writeStorage(key, value) {
    try {
      storage?.setItem?.(key, value);
      return true;
    } catch {
      return false;
    }
  }

  function removeStorage(key) {
    try {
      storage?.removeItem?.(key);
    } catch {
      // Recovery is best-effort when browser storage is unavailable.
    }
  }

  function recoveryIds(roomCode = state.roomCode, userId = state.userId) {
    try {
      const parsed = JSON.parse(readStorage(`${recoveryContextKey(roomCode, userId)}:index`) || "[]");
      return Array.isArray(parsed) ? parsed.filter(Boolean).slice(-100) : [];
    } catch {
      return [];
    }
  }

  function persistRecovery(entry) {
    if (!entry?.id || !state.roomCode || !state.userId) return false;
    const record = {
      ...entry,
      roomCode: state.roomCode,
      _recoveryUserId: state.userId,
      _persistedVisibility: entry._persistedVisibility || entry.visibility,
      _isNew: entry._isNew === true,
      _recovered: true,
      recoveredAtMillis: Date.now()
    };
    const key = recoveryEntryKey(record);
    if (!writeStorage(key, JSON.stringify(record))) return false;
    const ids = recoveryIds();
    if (!ids.includes(entry.id)) ids.push(entry.id);
    writeStorage(`${recoveryContextKey()}:index`, JSON.stringify(ids.slice(-100)));
    return true;
  }

  function clearRecovery(entry) {
    if (!entry?.id || !entry?.roomCode || !state.userId) return;
    removeStorage(recoveryEntryKey(entry));
    const ids = recoveryIds(entry.roomCode, state.userId).filter((id) => id !== entry.id);
    const indexKey = `${recoveryContextKey(entry.roomCode, state.userId)}:index`;
    if (ids.length) writeStorage(indexKey, JSON.stringify(ids));
    else removeStorage(indexKey);
  }

  function loadRecoveries() {
    if (!state.roomCode || !state.userId) return;
    recoveryIds().forEach((id) => {
      try {
        const raw = readStorage(`${recoveryContextKey()}:${encodeURIComponent(id)}`);
        const record = raw ? JSON.parse(raw) : null;
        if (
          !record
          || record.roomCode !== state.roomCode
          || record._recoveryUserId !== state.userId
          || record.id !== id
        ) return;
        const entry = normalizeJournalEntry(record, { ...state, document });
        const recovered = {
          ...entry,
          _persistedVisibility: record._persistedVisibility || entry.visibility,
          _isNew: record._isNew === true,
          _recovered: true,
          _recoveryUserId: state.userId
        };
        state.entriesByVisibility.get(recovered.visibility)?.set(recovered.id, recovered);
      } catch {
        // Ignore a single damaged recovery record without hiding healthy notes.
      }
    });
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
    const mutable = canMutateJournalEntry(entry, state)
      && state.deletingKey !== entryKey(entry);
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
    setStatus(
      state.statusMessage || (state.dirty ? "Unsaved changes" : "Saved"),
      state.statusKind || (state.dirty ? "pending" : "saved")
    );
  }

  function applySelection(entry) {
    clearTimeout(state.saveTimer);
    state.saveTimer = null;
    state.current = entry ? {
      ...entry,
      _persistedVisibility: entry._persistedVisibility || entry.visibility
    } : null;
    state.dirty = entry?._recovered === true;
    state.conflict = false;
    state.editRevision += 1;
    state.statusMessage = state.dirty ? "Recovered unsaved changes" : "";
    state.statusKind = state.dirty ? "pending" : "";
    renderList();
    renderEditor();
  }

  async function selectEntry(entry) {
    if (state.current && entry && entryKey(entry) === entryKey(state.current)) {
      return true;
    }
    if (state.current && (!entry || entryKey(entry) !== entryKey(state.current))) {
      const saved = state.dirty ? await saveCurrent({ immediate: true }) : true;
      if (!saved) {
        setStatus("Save or resolve this note before switching.", "error");
        return false;
      }
    }
    applySelection(entry);
    return true;
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
      revision: entry.revision,
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

  function captureEditorDraft() {
    if (!state.current || elements.editor.hidden) return null;
    const draft = collectEditorEntry();
    if (!draft) return null;
    state.current = {
      ...draft,
      _persistedVisibility: state.current._persistedVisibility || state.current.visibility,
      _persistedRevision: Number(
        state.current._persistedRevision ?? state.current.revision ?? 0
      ),
      _isNew: state.current._isNew === true,
      _recovered: true,
      _recoveryUserId: state.userId
    };
    state.entriesByVisibility.forEach((records) => records.delete(state.current.id));
    state.entriesByVisibility.get(state.current.visibility)?.set(
      state.current.id,
      state.current
    );
    state.editRevision += 1;
    state.dirty = true;
    persistRecovery(state.current);
    return state.current;
  }

  function conflictError(message = "This note changed in another tab.") {
    const error = new Error(message);
    error.code = "journal/conflict";
    return error;
  }

  async function persistEntry(entry, previous) {
    const oldVisibility = previous._persistedVisibility || previous.visibility;
    const moved = oldVisibility !== entry.visibility;
    const expectedRevision = Math.max(0, Number(
      previous._persistedRevision ?? previous.revision ?? 0
    ) || 0);
    let committed = { ...entry, revision: expectedRevision + 1 };

    if (typeof runTransaction === "function") {
      await runTransaction(db, async (transaction) => {
        const oldReference = entryRef(previous, oldVisibility);
        const oldSnapshot = await transaction.get(oldReference);
        const oldExists = oldSnapshot.exists();
        const remoteRevision = oldExists
          ? Math.max(0, Number(oldSnapshot.data()?.revision) || 0)
          : 0;
        const expectedExisting = previous._isNew !== true;
        if (oldExists !== expectedExisting || remoteRevision !== expectedRevision) {
          throw conflictError();
        }

        let destinationReference = oldReference;
        if (moved) {
          destinationReference = entryRef(entry);
          const destinationSnapshot = await transaction.get(destinationReference);
          if (destinationSnapshot.exists()) {
            throw conflictError("A note already exists at the requested access level.");
          }
        }

        committed = { ...entry, revision: remoteRevision + 1 };
        transaction.set(
          destinationReference,
          payloadFor(committed, { create: !oldExists || moved }),
          { merge: !moved }
        );
        if (moved) transaction.delete(oldReference);
      });
      return committed;
    }

    if (moved) {
      const batch = writeBatch(db);
      batch.set(entryRef(committed), payloadFor(committed, { create: true }));
      batch.delete(entryRef(previous, oldVisibility));
      await batch.commit();
    } else {
      await setDoc(
        entryRef(committed),
        payloadFor(committed, { create: previous._isNew === true }),
        { merge: true }
      );
    }
    return committed;
  }

  async function saveCurrent({ immediate = false } = {}) {
    clearTimeout(state.saveTimer);
    state.saveTimer = null;
    if (!state.current || !canMutateJournalEntry(state.current, state)) return false;
    const contextVersion = state.contextVersion;
    const activeSession = state.savePromise;
    if (activeSession?.contextVersion === contextVersion) {
      activeSession.queued = true;
      activeSession.immediate ||= immediate;
      return activeSession.promise;
    }

    const session = {
      contextVersion,
      queued: true,
      immediate,
      promise: null
    };
    session.promise = (async () => {
      while (
        session.queued
        && session.contextVersion === state.contextVersion
        && state.current
        && state.deletingKey !== entryKey(state.current)
      ) {
        session.queued = false;
        if (!state.dirty) continue;
        const previous = { ...state.current };
        const entry = normalizeJournalEntry(previous, { ...state, document });
        const capturedEditRevision = state.editRevision;
        const capturedKey = entryKey(entry);
        state.saving = true;
        setStatus(session.immediate ? "Saving…" : "Auto-saving…", "saving");

        try {
          const committed = await persistEntry(entry, previous);
          if (
            session.contextVersion !== state.contextVersion
            || state.deletingKey === capturedKey
          ) continue;

          state.entriesByVisibility.forEach((records) => records.delete(committed.id));
          if (state.current && entryKey(state.current) === capturedKey) {
            const hasNewerEdits = state.editRevision !== capturedEditRevision;
            state.current = hasNewerEdits
              ? {
                  ...state.current,
                  revision: committed.revision,
                  _persistedRevision: committed.revision,
                  _persistedVisibility: committed.visibility,
                  _isNew: false,
                  _recovered: true
                }
              : {
                  ...committed,
                  _persistedRevision: committed.revision,
                  _persistedVisibility: committed.visibility,
                  _isNew: false
                };
            state.entriesByVisibility.get(state.current.visibility)?.set(
              state.current.id,
              state.current
            );
            state.dirty = hasNewerEdits;
            if (hasNewerEdits) {
              persistRecovery(state.current);
              session.queued = true;
              session.immediate = true;
              setStatus("Saving newer changes…", "saving");
            } else {
              state.conflict = false;
              clearRecovery(state.current);
              setStatus("Saved", "saved");
              elements.timestamp.textContent = `Last modified ${timestampLabel(state.current)}`;
            }
          }
          renderList();
        } catch (error) {
          if (session.contextVersion !== state.contextVersion) return false;
          state.dirty = true;
          state.conflict = error?.code === "journal/conflict";
          persistRecovery(state.current);
          setStatus(
            error?.code === "journal/conflict"
              ? `${error.message} Your draft is safe in this browser.`
              : `Save failed: ${error.message}. Your draft is safe in this browser.`,
            error?.code === "journal/conflict" ? "conflict" : "error"
          );
          return false;
        }
      }
      return session.contextVersion === state.contextVersion && !state.dirty;
    })().finally(() => {
      if (state.savePromise === session) {
        state.savePromise = null;
        state.saving = false;
      }
    });
    state.savePromise = session;
    return session.promise;
  }

  function scheduleSave() {
    if (!state.current || !canMutateJournalEntry(state.current, state)) return;
    captureEditorDraft();
    setStatus(
      state.conflict
        ? "This note changed in another tab. Your local draft is safe."
        : "Unsaved changes",
      state.conflict ? "conflict" : "pending"
    );
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(() => { void saveCurrent(); }, 700);
    if (state.savePromise?.contextVersion === state.contextVersion) {
      state.savePromise.queued = true;
    }
  }

  async function createEntry(seed = {}, { skipCurrentSave = false } = {}) {
    if (!state.roomCode || !state.userId) return null;
    if (!skipCurrentSave && state.current && state.dirty) {
      const saved = await saveCurrent({ immediate: true });
      if (!saved) return null;
    }
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
    applySelection(entry);
    state.current._isNew = true;
    state.current._persistedRevision = 0;
    state.current._recovered = true;
    state.dirty = true;
    state.editRevision += 1;
    persistRecovery(state.current);
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
    clearTimeout(state.saveTimer);
    state.saveTimer = null;
    const key = entryKey(entry);
    state.deletingKey = key;
    state.pendingDeletes.add(key);
    renderEditor();
    try {
      const activeSave = state.savePromise?.contextVersion === state.contextVersion
        ? state.savePromise.promise
        : null;
      if (activeSave) await activeSave;
      const latest = state.current && entryKey(state.current) === key
        ? state.current
        : entry;
      if (latest._isNew !== true || Number(latest._persistedRevision ?? latest.revision) > 0) {
        await deleteDoc(entryRef(latest, latest._persistedVisibility || latest.visibility));
      }
      state.entriesByVisibility.forEach((records) => records.delete(entry.id));
      clearRecovery(latest);
      applySelection(null);
      renderList();
      return true;
    } catch (error) {
      state.pendingDeletes.delete(key);
      setStatus(`Delete failed: ${error.message}`, "error");
      return false;
    } finally {
      state.deletingKey = "";
      if (state.current) renderEditor();
    }
  }

  async function duplicateCurrent() {
    if (!state.current) return null;
    const source = { ...state.current };
    if (state.dirty && !await saveCurrent({ immediate: true })) return null;
    return createEntry({
      ...source,
      title: `${source.title} (Copy)`,
      ownerUid: state.userId,
      ownerName: state.userName,
      visibility: source.visibility === "dm" && !state.isDm
        ? "personal"
        : source.visibility,
      revision: 0
    });
  }

  async function saveConflictAsCopy() {
    if (!state.current || !state.conflict) return null;
    const source = { ...state.current };
    return createEntry({
      ...source,
      title: `${source.title} (Conflict Copy)`,
      ownerUid: state.userId,
      ownerName: state.userName,
      visibility: source.visibility === "dm" && !state.isDm
        ? "personal"
        : source.visibility,
      revision: 0
    }, { skipCurrentSave: true });
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
    const localRecords = state.entriesByVisibility.get(visibility) || new Map();
    localRecords.forEach((entry, id) => {
      if (entry?._recovered && !records.has(id)) records.set(id, entry);
      if (
        entry?._recovered
        && records.has(id)
        && Number(entry.updatedAtMillis || 0) > Number(records.get(id)?.updatedAtMillis || 0)
      ) records.set(id, entry);
    });
    state.pendingDeletes.forEach((key) => {
      const [pendingVisibility, id] = key.split("/");
      if (pendingVisibility !== visibility) return;
      const deletionStillVisibleRemotely = records.has(id);
      records.delete(id);
      if (!deletionStillVisibleRemotely) state.pendingDeletes.delete(key);
    });
    state.entriesByVisibility.set(visibility, records);
    if (state.current && state.current.visibility === visibility && !state.dirty && !state.saving) {
      const fresh = records.get(state.current.id);
      if (fresh) state.current = {
        ...fresh,
        _persistedRevision: fresh.revision,
        _persistedVisibility: visibility
      };
      else state.current = null;
    }
    renderList();
    if (!state.dirty && !state.saving) renderEditor();
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
      state.deletingKey = "";
      state.pendingDeletes.clear();
      state.conflict = false;
      state.statusMessage = "";
      state.statusKind = "";
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
    if (changed) {
      if (state.current && state.dirty) {
        captureEditorDraft();
        persistRecovery(state.current);
      }
      state.contextVersion += 1;
      disconnect();
      Object.assign(state, nextContext);
      loadRecoveries();
      connect();
      renderList();
    } else {
      Object.assign(state, nextContext);
    }
    elements.dmOption.hidden = !state.isDm;
    return getState();
  }

  root.addEventListener("click", (event) => {
    const listButton = event.target.closest("[data-journal-key]");
    if (listButton) {
      const entry = findEntry(listButton.dataset.journalKey);
      if (entry) void selectEntry(entry);
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
    if (event.target.closest("[data-journal-retry]")) {
      if (state.conflict) void saveConflictAsCopy();
      else void saveCurrent({ immediate: true });
    }
    if (event.target.closest("[data-journal-reveal]") && state.current) {
      elements.visibility.value = state.current.visibility === "dm" ? "shared" : "dm";
      scheduleSave();
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
  elements.content.addEventListener("blur", (event) => {
    if (event.relatedTarget?.closest?.("[data-journal-retry]")) return;
    globalThis.setTimeout(() => {
      if (state.dirty && !state.saving) void saveCurrent({ immediate: true });
    }, 0);
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
      saving: state.saving,
      conflict: state.conflict,
      statusKind: state.statusKind,
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
