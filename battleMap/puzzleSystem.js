import { getMapObjectStates, getNextMapObjectState } from "./objectModel.js";
import {
  buildPuzzleResetActions,
  createPuzzleAction,
  createPuzzleTrigger,
  describePuzzleObject,
  normalizePuzzle,
  validatePuzzleReferences
} from "./puzzleModel.js";

const text = (value) => String(value ?? "").trim();
const title = (value) => text(value).split("-").map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : "").join(" ");

export function createPuzzleSystem({
  document = globalThis.document,
  surface,
  quickActions,
  store,
  engine,
  getRoomContext = () => ({}),
  getObjects = () => [],
  requestConfirmation = async () => true,
  onStatus = () => {}
} = {}) {
  if (!document || !surface || !store || !engine) throw new Error("Puzzle interactions require UI, persistence, and an engine.");

  const toggle = document.createElement("button");
  toggle.id = "mapPuzzlesToggleButton";
  toggle.type = "button";
  toggle.textContent = "Puzzles";
  toggle.title = "Link interactive objects into puzzles";
  toggle.setAttribute("aria-pressed", "false");
  quickActions?.appendChild(toggle);

  const panel = document.createElement("section");
  panel.className = "hg-puzzle-toolbar";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Puzzle connection editor");
  panel.innerHTML = `
    <header><div><small>Battle map</small><strong>Puzzle Connections</strong></div><button type="button" data-puzzle-close aria-label="Close puzzle editor">×</button></header>
    <div class="hg-puzzle-picker">
      <label>Saved Puzzle <select data-puzzle-select></select></label>
      <button type="button" data-puzzle-new>New Puzzle</button>
    </div>
    <form data-puzzle-form>
      <div class="hg-puzzle-fields">
        <label>Name <input name="name" maxlength="120" required></label>
        <label>Trigger Rule <select name="triggerMode"><option value="all">All switches</option><option value="any">Any trigger</option><option value="sequence">Correct sequence</option></select></label>
        <label class="hg-puzzle-wide">Description <textarea name="description" maxlength="2000" rows="2"></textarea></label>
      </div>
      <div class="hg-puzzle-options">
        <label><input name="enabled" type="checkbox" checked> Enabled</label>
        <label><input name="allowCrossFloor" type="checkbox"> Allow explicit cross-floor links</label>
        <label title="Puzzle configuration and progress always use the DM-only Firestore collection"><input name="hiddenState" type="checkbox" checked> Keep progress DM-private</label>
      </div>
      <section class="hg-puzzle-link-section">
        <div><strong>Trigger objects</strong><small>Choose the state each input must reach.</small></div>
        <div data-puzzle-triggers></div>
        <button type="button" data-puzzle-add-trigger>Add Trigger</button>
      </section>
      <section class="hg-puzzle-link-section">
        <div><strong>Target actions</strong><small>Applied after the trigger rule succeeds.</small></div>
        <div data-puzzle-actions></div>
        <button type="button" data-puzzle-add-action>Add Target Action</button>
      </section>
      <section class="hg-puzzle-connections" aria-label="Puzzle connection summary">
        <strong>Connection Map</strong>
        <div data-puzzle-summary></div>
      </section>
      <p class="hg-puzzle-runtime" data-puzzle-runtime></p>
      <div class="hg-puzzle-actions">
        <button type="submit">Save Puzzle</button>
        <button type="button" data-puzzle-reset>Reset Puzzle</button>
        <button type="button" data-puzzle-delete>Delete Puzzle</button>
      </div>
    </form>
    <p class="status" data-puzzle-status aria-live="polite"></p>
  `;
  surface.appendChild(panel);

  const form = panel.querySelector("[data-puzzle-form]");
  const picker = panel.querySelector("[data-puzzle-select]");
  const triggerRoot = panel.querySelector("[data-puzzle-triggers]");
  const actionRoot = panel.querySelector("[data-puzzle-actions]");
  const summaryRoot = panel.querySelector("[data-puzzle-summary]");
  const runtime = panel.querySelector("[data-puzzle-runtime]");
  const status = panel.querySelector("[data-puzzle-status]");
  let puzzles = [];
  let objects = [];
  let selectedId = "";
  let draft = normalizePuzzle({ id: "", triggers: [], actions: [], resetActions: [] });
  let screen = "";
  let open = false;
  let connectedRoom = "";

  function roomContext() {
    return getRoomContext() || {};
  }

  function setStatus(message, tone = "") {
    status.textContent = message || "";
    status.dataset.state = tone;
    onStatus(message, tone);
  }

  function objectById(id) {
    return objects.find((object) => object.id === id) || null;
  }

  function createObjectOptions(selected) {
    const fragment = document.createDocumentFragment();
    objects.forEach((object) => {
      const option = document.createElement("option");
      option.value = object.id;
      option.textContent = describePuzzleObject(object);
      option.selected = object.id === selected;
      fragment.appendChild(option);
    });
    return fragment;
  }

  function fillStateSelect(select, objectId, selected) {
    const object = objectById(objectId);
    const states = getMapObjectStates(object?.type || "custom");
    select.replaceChildren(...states.map((stateId) => {
      const option = document.createElement("option");
      option.value = stateId;
      option.textContent = title(stateId);
      option.selected = stateId === selected;
      return option;
    }));
    if (!states.includes(selected)) select.value = states[0];
  }

  function readTopFields() {
    draft = normalizePuzzle({
      ...draft,
      name: form.elements.name.value,
      description: form.elements.description.value,
      triggerMode: form.elements.triggerMode.value,
      enabled: form.elements.enabled.checked,
      allowCrossFloor: form.elements.allowCrossFloor.checked,
      hiddenState: form.elements.hiddenState.checked
    }, draft.id);
  }

  function updateTrigger(index, patch) {
    readTopFields();
    const triggers = draft.triggers.map((entry, entryIndex) => entryIndex === index ? { ...entry, ...patch } : entry);
    draft = normalizePuzzle({ ...draft, triggers }, draft.id);
    renderEditor();
  }

  function updateAction(index, patch) {
    readTopFields();
    const actions = draft.actions.map((entry, entryIndex) => entryIndex === index ? { ...entry, ...patch } : entry);
    draft = normalizePuzzle({ ...draft, actions }, draft.id);
    renderEditor();
  }

  function rowButton(label, action) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", action);
    return button;
  }

  function renderTriggers() {
    triggerRoot.replaceChildren();
    draft.triggers.forEach((trigger, index) => {
      const row = document.createElement("div");
      row.className = "hg-puzzle-link-row";
      const order = document.createElement("strong");
      order.textContent = draft.triggerMode === "sequence" ? String(index + 1) : "IF";
      const objectSelect = document.createElement("select");
      objectSelect.setAttribute("aria-label", `Trigger ${index + 1} object`);
      objectSelect.appendChild(createObjectOptions(trigger.objectId));
      objectSelect.value = trigger.objectId;
      const stateSelect = document.createElement("select");
      stateSelect.setAttribute("aria-label", `Trigger ${index + 1} state`);
      fillStateSelect(stateSelect, trigger.objectId, trigger.stateId);
      objectSelect.addEventListener("change", () => {
        const object = objectById(objectSelect.value);
        updateTrigger(index, { objectId: objectSelect.value, stateId: getNextMapObjectState(object || {}) });
      });
      stateSelect.addEventListener("change", () => updateTrigger(index, { stateId: stateSelect.value }));
      const controls = document.createElement("span");
      controls.className = "hg-puzzle-row-actions";
      if (draft.triggerMode === "sequence") {
        controls.append(
          rowButton("↑", () => moveTrigger(index, -1)),
          rowButton("↓", () => moveTrigger(index, 1))
        );
      }
      controls.appendChild(rowButton("Remove", () => {
        readTopFields();
        draft = normalizePuzzle({ ...draft, triggers: draft.triggers.filter((_, entryIndex) => entryIndex !== index) }, draft.id);
        renderEditor();
      }));
      row.append(order, objectSelect, stateSelect, controls);
      triggerRoot.appendChild(row);
    });
    if (!draft.triggers.length) {
      const empty = document.createElement("p");
      empty.className = "status";
      empty.textContent = "Add a lever, button, pressure plate, trap, or other object as an input.";
      triggerRoot.appendChild(empty);
    }
  }

  function moveTrigger(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= draft.triggers.length) return;
    readTopFields();
    const triggers = [...draft.triggers];
    [triggers[index], triggers[target]] = [triggers[target], triggers[index]];
    draft = normalizePuzzle({ ...draft, triggers }, draft.id);
    renderEditor();
  }

  function renderActions() {
    actionRoot.replaceChildren();
    draft.actions.forEach((action, index) => {
      const row = document.createElement("div");
      row.className = "hg-puzzle-link-row";
      const order = document.createElement("strong");
      order.textContent = "THEN";
      const objectSelect = document.createElement("select");
      objectSelect.setAttribute("aria-label", `Action ${index + 1} object`);
      objectSelect.appendChild(createObjectOptions(action.objectId));
      objectSelect.value = action.objectId;
      const stateSelect = document.createElement("select");
      stateSelect.setAttribute("aria-label", `Action ${index + 1} state`);
      fillStateSelect(stateSelect, action.objectId, action.stateId);
      const lockSelect = document.createElement("select");
      lockSelect.setAttribute("aria-label", `Action ${index + 1} lock behavior`);
      lockSelect.innerHTML = '<option value="keep">Keep lock</option><option value="lock">Lock</option><option value="unlock">Unlock</option>';
      lockSelect.value = action.lockMode;
      objectSelect.addEventListener("change", () => {
        const object = objectById(objectSelect.value);
        updateAction(index, { objectId: objectSelect.value, stateId: getNextMapObjectState(object || {}) });
      });
      stateSelect.addEventListener("change", () => updateAction(index, { stateId: stateSelect.value }));
      lockSelect.addEventListener("change", () => updateAction(index, { lockMode: lockSelect.value }));
      row.append(order, objectSelect, stateSelect, lockSelect, rowButton("Remove", () => {
        readTopFields();
        draft = normalizePuzzle({ ...draft, actions: draft.actions.filter((_, entryIndex) => entryIndex !== index) }, draft.id);
        renderEditor();
      }));
      actionRoot.appendChild(row);
    });
    if (!draft.actions.length) {
      const empty = document.createElement("p");
      empty.className = "status";
      empty.textContent = "Add one or more doors, traps, or other target objects.";
      actionRoot.appendChild(empty);
    }
  }

  function renderSummary() {
    summaryRoot.replaceChildren();
    if (!draft.triggers.length || !draft.actions.length) {
      summaryRoot.textContent = "Add trigger and target rows to see the puzzle flow.";
      return;
    }
    const triggerText = draft.triggers.map((entry, index) => {
      const prefix = draft.triggerMode === "sequence" ? `${index + 1}. ` : "";
      return `${prefix}${objectById(entry.objectId)?.name || "Missing object"} = ${title(entry.stateId)}`;
    }).join(draft.triggerMode === "any" ? " OR " : draft.triggerMode === "all" ? " + " : " → ");
    const actionText = draft.actions.map((entry) => `${objectById(entry.objectId)?.name || "Missing object"} → ${title(entry.stateId)}${entry.lockMode === "keep" ? "" : ` + ${title(entry.lockMode)}`}`).join("; ");
    const source = document.createElement("span");
    source.textContent = triggerText;
    const arrow = document.createElement("strong");
    arrow.textContent = "⇒";
    const target = document.createElement("span");
    target.textContent = actionText;
    summaryRoot.append(source, arrow, target);
  }

  function renderEditor() {
    form.elements.name.value = draft.name;
    form.elements.description.value = draft.description;
    form.elements.triggerMode.value = draft.triggerMode;
    form.elements.enabled.checked = draft.enabled;
    form.elements.allowCrossFloor.checked = draft.allowCrossFloor;
    form.elements.hiddenState.checked = draft.hiddenState;
    form.elements.hiddenState.disabled = true;
    panel.querySelector("[data-puzzle-reset]").disabled = !draft.id;
    panel.querySelector("[data-puzzle-delete]").disabled = !draft.id;
    runtime.textContent = `Status: ${title(draft.runtime.status)}${draft.triggerMode === "sequence" ? ` · Step ${draft.runtime.sequenceIndex}/${draft.triggers.length}` : ""}${draft.runtime.message ? ` · ${draft.runtime.message}` : ""}`;
    renderTriggers();
    renderActions();
    renderSummary();
  }

  function renderPicker() {
    picker.replaceChildren();
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = puzzles.length ? "Choose a puzzle" : "No saved puzzles";
    picker.appendChild(empty);
    puzzles.forEach((puzzle) => {
      const option = document.createElement("option");
      option.value = puzzle.id;
      option.textContent = `${puzzle.name} · ${title(puzzle.runtime.status)}`;
      picker.appendChild(option);
    });
    picker.value = selectedId;
  }

  function selectPuzzle(id) {
    const puzzle = puzzles.find((entry) => entry.id === id);
    selectedId = puzzle?.id || "";
    draft = puzzle
      ? normalizePuzzle(puzzle, puzzle.id)
      : normalizePuzzle({ id: "", name: "New Puzzle", triggers: [], actions: [], resetActions: [] });
    renderPicker();
    renderEditor();
  }

  function setOpen(next) {
    if (next && roomContext().isDm !== true) return false;
    open = next === true;
    panel.hidden = !open || screen !== "battle";
    toggle.classList.toggle("is-active", open);
    toggle.setAttribute("aria-pressed", String(open));
    document.body.classList.toggle("hg-editing-puzzles", open);
    if (open) {
      objects = getObjects();
      if (!selectedId && puzzles.length) selectPuzzle(puzzles[0].id);
      else renderEditor();
    }
    return open;
  }

  function connect() {
    const context = roomContext();
    toggle.hidden = screen !== "battle" || context.isDm !== true;
    if (screen !== "battle" || !context.roomCode || context.isDm !== true) {
      store.stop();
      connectedRoom = "";
      puzzles = [];
      engine.resetContext();
      setOpen(false);
      renderPicker();
      return;
    }
    if (connectedRoom === context.roomCode) return;
    connectedRoom = context.roomCode;
    store.connect(context.roomCode, {
      isDm: true,
      onData: (records) => {
        puzzles = records;
        engine.syncPuzzles(puzzles);
        if (selectedId) {
          const selected = puzzles.find((entry) => entry.id === selectedId);
          if (selected) draft = normalizePuzzle(selected, selected.id);
          else selectedId = "";
        }
        renderPicker();
        if (open) renderEditor();
      },
      onError: (error) => setStatus(error?.message || "Puzzles could not be loaded.", "error")
    });
  }

  async function savePuzzle(event) {
    event.preventDefault();
    readTopFields();
    const prepared = normalizePuzzle({
      ...draft,
      resetActions: buildPuzzleResetActions(draft, objects)
    }, draft.id);
    const validation = validatePuzzleReferences(prepared, objects);
    if (!validation.ok) {
      setStatus(validation.reason, "error");
      return;
    }
    const room = roomContext();
    try {
      const saved = prepared.id
        ? await store.save(room.roomCode, prepared, prepared, room.userUid)
        : await store.create(room.roomCode, prepared, room.userUid);
      selectedId = saved.id;
      draft = saved;
      setStatus(`${saved.name} saved.`, "saved");
      renderPicker();
      renderEditor();
    } catch (error) {
      setStatus(error?.message || "The puzzle could not be saved.", "error");
    }
  }

  toggle.addEventListener("click", () => setOpen(!open));
  panel.querySelector("[data-puzzle-close]").addEventListener("click", () => setOpen(false));
  panel.querySelector("[data-puzzle-new]").addEventListener("click", () => selectPuzzle(""));
  picker.addEventListener("change", () => selectPuzzle(picker.value));
  form.addEventListener("submit", savePuzzle);
  form.elements.triggerMode.addEventListener("change", () => {
    readTopFields();
    renderEditor();
  });
  panel.querySelector("[data-puzzle-add-trigger]").addEventListener("click", () => {
    readTopFields();
    const object = objects[0];
    if (!object) return setStatus("Place an interactive map object first.", "error");
    draft = normalizePuzzle({ ...draft, triggers: [...draft.triggers, createPuzzleTrigger({ objectId: object.id, stateId: getNextMapObjectState(object) })] }, draft.id);
    renderEditor();
  });
  panel.querySelector("[data-puzzle-add-action]").addEventListener("click", () => {
    readTopFields();
    const object = objects[0];
    if (!object) return setStatus("Place an interactive map object first.", "error");
    draft = normalizePuzzle({ ...draft, actions: [...draft.actions, createPuzzleAction({ objectId: object.id, stateId: getNextMapObjectState(object) })] }, draft.id);
    renderEditor();
  });
  panel.querySelector("[data-puzzle-reset]").addEventListener("click", async () => {
    if (!draft.id) return;
    if (!await requestConfirmation(`Reset “${draft.name}” and all linked objects?`)) return;
    try {
      draft = await engine.resetPuzzle(draft);
      setStatus(`${draft.name} reset.`, "saved");
      renderEditor();
    } catch (error) {
      setStatus(error?.message || "The puzzle could not be reset.", "error");
    }
  });
  panel.querySelector("[data-puzzle-delete]").addEventListener("click", async () => {
    if (!draft.id) return;
    if (!await requestConfirmation(`Delete puzzle “${draft.name}”? Linked objects will remain unchanged.`)) return;
    try {
      await store.remove(roomContext().roomCode, draft);
      const name = draft.name;
      selectPuzzle("");
      setStatus(`${name} deleted.`, "saved");
    } catch (error) {
      setStatus(error?.message || "The puzzle could not be deleted.", "error");
    }
  });

  return Object.freeze({
    root: panel,
    syncContext: connect,
    syncObjects(nextObjects = []) {
      objects = nextObjects;
      engine.syncObjects(objects);
      if (open) renderEditor();
    },
    setScreen(value) {
      screen = text(value);
      if (screen !== "battle") setOpen(false);
      connect();
    },
    setOpen,
    getPuzzles: () => puzzles.map((puzzle) => normalizePuzzle(puzzle, puzzle.id)),
    getListenerSnapshot: () => store.getListenerSnapshot?.() || null,
    getState: () => ({ screen, open, roomCode: connectedRoom, selectedId, puzzleCount: puzzles.length }),
    disconnect() {
      setOpen(false);
      store.stop();
      connectedRoom = "";
      puzzles = [];
      engine.resetContext();
      renderPicker();
    },
    destroy() {
      this.disconnect?.();
      toggle.remove();
      panel.remove();
    }
  });
}
