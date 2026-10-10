import { createRealtimeListenerRegistry } from "../shared/realtimeListeners.js";
import {
  DRAWING_COLLECTIONS,
  DRAWING_TOOLS,
  canDeleteDrawingStroke,
  clientPointToDrawingSpace,
  drawingCollectionForLayer,
  normalizeDrawingStroke,
  simplifyDrawingPoints,
  stableDrawingMapId
} from "./drawingModel.js";

const SVG_NS = "http://www.w3.org/2000/svg";

function makeId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID().replace(/[^a-zA-Z0-9_-]/g, "-");
  }
  return `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function makeSvgElement(document, name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
  return element;
}

function pointsAttribute(points) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

export function createMapDrawingSystem(options = {}) {
  const {
    document,
    surface,
    quickActions,
    mapViewer,
    mapImage,
    puzzleBoard,
    db,
    collection,
    doc,
    query,
    where,
    onSnapshot,
    setDoc,
    deleteDoc,
    updateDoc,
    writeBatch,
    serverTimestamp,
    requestConfirmation = async (message) => globalThis.confirm?.(message) === true,
    getMapContext = () => ({})
  } = options;
  const listeners = createRealtimeListenerRegistry({
    onStopError: (error) => console.warn("Drawing listener cleanup failed:", error)
  });
  const state = {
    roomCode: "",
    userId: "",
    userName: "Player",
    isDm: false,
    playersEnabled: false,
    mapId: "",
    target: null,
    mode: "single",
    zoom: 1,
    space: null,
    active: false,
    visible: true,
    tool: "pen",
    layer: "shared",
    color: "#ff3b5c",
    size: 4,
    drawing: null,
    strokesByLayer: new Map([
      ["shared", new Map()],
      ["dm", new Map()]
    ]),
    pendingStrokes: new Map(),
    undoStack: [],
    redoStack: [],
    historyBusy: false,
    pointerId: null
  };

  const toggleButton = document.createElement("button");
  toggleButton.id = "drawingToggleButton";
  toggleButton.type = "button";
  toggleButton.textContent = "Draw";
  toggleButton.setAttribute("aria-pressed", "false");
  toggleButton.title = "Toggle map drawing tools";
  quickActions?.append(toggleButton);

  const toolbar = document.createElement("section");
  toolbar.className = "hg-drawing-toolbar";
  toolbar.hidden = true;
  toolbar.setAttribute("aria-label", "Battle map drawing tools");
  toolbar.innerHTML = `
    <header><strong>Drawing</strong><button type="button" data-drawing-close aria-label="Close drawing tools">×</button></header>
    <div class="hg-drawing-tools" role="toolbar" aria-label="Drawing shape">
      <button type="button" data-drawing-tool="pen">Pen</button>
      <button type="button" data-drawing-tool="eraser" title="Click one complete stroke to erase it">Erase stroke</button>
      <button type="button" data-drawing-tool="line">Line</button>
      <button type="button" data-drawing-tool="rectangle">Rectangle</button>
      <button type="button" data-drawing-tool="circle">Circle</button>
      <button type="button" data-drawing-tool="arrow">Arrow</button>
    </div>
    <div class="hg-drawing-options">
      <label>Color <input type="color" value="#ff3b5c" data-drawing-color></label>
      <label>Brush <input type="range" min="1" max="48" step="1" value="4" data-drawing-size> <output data-drawing-size-output>4 px</output></label>
      <label data-drawing-layer-wrap>Layer <select data-drawing-layer>
        <option value="shared">Shared</option>
        <option value="dm">DM only</option>
      </select></label>
    </div>
    <div class="hg-drawing-actions">
      <button type="button" data-drawing-undo disabled>Undo</button>
      <button type="button" data-drawing-redo disabled>Redo</button>
      <button type="button" data-drawing-clear>Clear</button>
      <button type="button" data-drawing-retry hidden>Retry failed</button>
      <label><input type="checkbox" checked data-drawing-visible> Show drawings</label>
    </div>
    <label class="hg-drawing-player-permission" data-drawing-player-wrap hidden>
      <input type="checkbox" data-drawing-player-enabled> Allow players to draw
    </label>
    <p class="status" role="status" aria-live="polite" data-drawing-status></p>
  `;
  surface?.append(toolbar);

  const overlay = makeSvgElement(document, "svg", {
    class: "hg-map-drawing-layer",
    viewBox: "0 0 1000 1000",
    preserveAspectRatio: "none",
    "aria-label": "Map drawings"
  });
  const defs = makeSvgElement(document, "defs");
  const marker = makeSvgElement(document, "marker", {
    id: "hgDrawingArrowhead",
    markerWidth: 7,
    markerHeight: 7,
    refX: 6,
    refY: 3.5,
    orient: "auto",
    markerUnits: "strokeWidth"
  });
  marker.append(makeSvgElement(document, "path", {
    d: "M0,0 L7,3.5 L0,7 z",
    fill: "context-stroke"
  }));
  defs.append(marker);
  overlay.append(defs);
  surface?.append(overlay);

  const elements = {
    close: toolbar.querySelector("[data-drawing-close]"),
    color: toolbar.querySelector("[data-drawing-color]"),
    size: toolbar.querySelector("[data-drawing-size]"),
    sizeOutput: toolbar.querySelector("[data-drawing-size-output]"),
    layer: toolbar.querySelector("[data-drawing-layer]"),
    layerWrap: toolbar.querySelector("[data-drawing-layer-wrap]"),
    undo: toolbar.querySelector("[data-drawing-undo]"),
    redo: toolbar.querySelector("[data-drawing-redo]"),
    clear: toolbar.querySelector("[data-drawing-clear]"),
    retry: toolbar.querySelector("[data-drawing-retry]"),
    visible: toolbar.querySelector("[data-drawing-visible]"),
    playerWrap: toolbar.querySelector("[data-drawing-player-wrap]"),
    playerEnabled: toolbar.querySelector("[data-drawing-player-enabled]"),
    status: toolbar.querySelector("[data-drawing-status]")
  };
  let previewElement = null;
  let previewFrame = 0;
  let resizeObserver = null;
  const renderedStrokes = new Map();

  function setStatus(message, kind = "") {
    elements.status.textContent = message || "";
    elements.status.dataset.state = kind;
  }

  function canDraw() {
    return state.isDm || state.playersEnabled;
  }

  function strokeRef(stroke) {
    return doc(
      db,
      "rooms",
      stroke.roomCode,
      drawingCollectionForLayer(stroke.layer),
      stroke.id
    );
  }

  function strokePayload(stroke, { create = false } = {}) {
    const payload = {
      id: stroke.id,
      roomCode: stroke.roomCode,
      mapId: stroke.mapId,
      authorUid: stroke.authorUid,
      authorName: stroke.authorName,
      originalAuthorUid: stroke.originalAuthorUid || "",
      originalAuthorName: stroke.originalAuthorName || "",
      restoredByUid: stroke.restoredByUid || "",
      layer: stroke.layer,
      tool: stroke.tool,
      color: stroke.color,
      size: stroke.size,
      points: stroke.points,
      start: stroke.start,
      end: stroke.end,
      createdAtMillis: stroke.createdAtMillis,
      updatedAtMillis: stroke.updatedAtMillis,
      updatedAt: serverTimestamp()
    };
    if (create) payload.createdAt = stroke.createdAt || serverTimestamp();
    return payload;
  }

  function createStrokeElement(stroke, { preview = false, pending = false, failed = false } = {}) {
    const common = {
      stroke: stroke.color,
      "stroke-width": stroke.size,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "vector-effect": "non-scaling-stroke",
      fill: "none",
      "pointer-events": "none"
    };
    let element;
    if (stroke.tool === "pen") {
      element = makeSvgElement(document, "polyline", {
        ...common,
        points: pointsAttribute(stroke.points)
      });
    } else if (stroke.tool === "rectangle") {
      element = makeSvgElement(document, "rect", {
        ...common,
        x: Math.min(stroke.start.x, stroke.end.x),
        y: Math.min(stroke.start.y, stroke.end.y),
        width: Math.abs(stroke.end.x - stroke.start.x),
        height: Math.abs(stroke.end.y - stroke.start.y)
      });
    } else if (stroke.tool === "circle") {
      element = makeSvgElement(document, "ellipse", {
        ...common,
        cx: (stroke.start.x + stroke.end.x) / 2,
        cy: (stroke.start.y + stroke.end.y) / 2,
        rx: Math.abs(stroke.end.x - stroke.start.x) / 2,
        ry: Math.abs(stroke.end.y - stroke.start.y) / 2
      });
    } else {
      element = makeSvgElement(document, "line", {
        ...common,
        x1: stroke.start.x,
        y1: stroke.start.y,
        x2: stroke.end.x,
        y2: stroke.end.y,
        ...(stroke.tool === "arrow" ? { "marker-end": "url(#hgDrawingArrowhead)" } : {})
      });
    }
    if (!preview) {
      element.dataset.drawingStrokeId = stroke.id;
      element.dataset.drawingLayer = stroke.layer;
      element.dataset.drawingAuthorUid = stroke.authorUid;
      if (pending) element.classList.add("is-pending");
      if (failed) element.classList.add("is-failed");
    } else {
      element.classList.add("is-preview");
    }
    return element;
  }

  function currentScopeKey() {
    return `${state.roomCode}/${state.userId}/${state.isDm}/${state.mapId}`;
  }

  function strokeRenderKey(stroke) {
    return `${stroke.layer}/${stroke.id}`;
  }

  function strokeSignature(stroke, status = "saved") {
    return JSON.stringify([
      status, stroke.tool, stroke.color, stroke.size, stroke.points,
      stroke.start, stroke.end, stroke.authorUid
    ]);
  }

  function renderPreview() {
    previewElement?.remove();
    previewElement = null;
    if (!state.visible || !state.drawing) return;
    previewElement = createStrokeElement(state.drawing, { preview: true });
    overlay.append(previewElement);
  }

  function schedulePreviewRender() {
    if (previewFrame) return;
    const requestFrame = globalThis.requestAnimationFrame || ((callback) => globalThis.setTimeout(callback, 0));
    previewFrame = requestFrame(() => {
      previewFrame = 0;
      renderPreview();
    });
  }

  function render() {
    const desired = new Map();
    const strokes = [
      ...state.strokesByLayer.get("shared").values(),
      ...(state.isDm ? state.strokesByLayer.get("dm").values() : [])
    ].filter((stroke) => stroke.mapId === state.mapId)
      .sort((left, right) => left.createdAtMillis - right.createdAtMillis);
    strokes.forEach((stroke) => desired.set(strokeRenderKey(stroke), {
      stroke,
      status: "saved"
    }));
    for (const pending of state.pendingStrokes.values()) {
      if (pending.scopeKey !== currentScopeKey()) continue;
      desired.set(strokeRenderKey(pending.stroke), {
        stroke: pending.stroke,
        status: pending.status
      });
    }

    for (const [key, record] of renderedStrokes) {
      if (!state.visible || !desired.has(key)) {
        record.element.remove();
        renderedStrokes.delete(key);
      }
    }
    if (state.visible) {
      for (const [key, item] of desired) {
        const signature = strokeSignature(item.stroke, item.status);
        const existing = renderedStrokes.get(key);
        if (existing?.signature === signature) continue;
        existing?.element.remove();
        const element = createStrokeElement(item.stroke, {
          pending: item.status !== "saved",
          failed: item.status === "failed"
        });
        overlay.insertBefore(element, previewElement);
        renderedStrokes.set(key, { element, signature });
      }
    }
    renderPreview();
  }

  function updateControls() {
    toolbar.querySelectorAll("[data-drawing-tool]").forEach((button) => {
      const selected = button.dataset.drawingTool === state.tool;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    toggleButton.setAttribute("aria-pressed", String(state.active));
    toggleButton.classList.toggle("is-active", state.active);
    const drawingEnabled = state.active && canDraw();
    overlay.classList.toggle("is-active", drawingEnabled);
    overlay.style.pointerEvents = drawingEnabled ? "auto" : "none";
    overlay.style.touchAction = drawingEnabled ? "none" : "auto";
    overlay.style.visibility = state.visible ? "visible" : "hidden";
    elements.layerWrap.hidden = !state.isDm;
    elements.playerWrap.hidden = !state.isDm;
    elements.playerEnabled.checked = state.playersEnabled;
    elements.layer.value = state.isDm ? state.layer : "shared";
    elements.undo.disabled = state.historyBusy || !canDraw() || state.undoStack.length === 0;
    elements.redo.disabled = state.historyBusy || !canDraw() || state.redoStack.length === 0;
    elements.visible.checked = state.visible;
    elements.clear.textContent = state.isDm ? "Clear all layers" : "Clear my strokes";
    elements.clear.title = state.isDm
      ? "Remove every shared and DM-only stroke on this map"
      : "Remove only strokes you created on this map";
    toolbar.querySelectorAll("[data-drawing-tool]").forEach((button) => {
      button.disabled = !canDraw();
    });
    elements.color.disabled = !canDraw();
    elements.size.disabled = !canDraw();
    elements.clear.disabled = state.historyBusy || !canDraw();
    const failedCount = [...state.pendingStrokes.values()].filter((entry) => (
      entry.scopeKey === currentScopeKey() && entry.status === "failed"
    )).length;
    elements.retry.hidden = failedCount === 0;
    elements.retry.disabled = state.historyBusy || failedCount === 0;
    elements.retry.textContent = failedCount > 1 ? `Retry failed (${failedCount})` : "Retry failed";
  }

  function setActive(active) {
    const next = active === true;
    if (next && !state.mapId) {
      setStatus("Load a battle map before drawing.", "error");
      return false;
    }
    state.active = next;
    toolbar.hidden = !next;
    if (next) {
      state.visible = true;
      setStatus(
        canDraw()
          ? "Draw mode is active on empty map space. Token controls remain available."
          : "The DM has disabled player drawing. You can still show or hide drawings.",
        canDraw() ? "active" : "error"
      );
    }
    state.drawing = null;
    if (state.pointerId != null) {
      try { overlay.releasePointerCapture?.(state.pointerId); } catch {}
    }
    state.pointerId = null;
    updateControls();
    render();
    return true;
  }

  function open() {
    syncContext();
    return setActive(true);
  }

  function syncOverlayGeometry() {
    if (!state.target || !overlay) return;
    if (overlay.parentNode !== state.target) state.target.append(overlay);
    const computed = globalThis.getComputedStyle?.(state.target);
    if (computed?.position === "static") state.target.style.position = "relative";

    if (state.mode === "single" && mapImage?.offsetWidth && mapImage?.offsetHeight) {
      overlay.setAttribute("viewBox", "0 0 1000 1000");
      overlay.style.left = `${mapImage.offsetLeft}px`;
      overlay.style.top = `${mapImage.offsetTop}px`;
      overlay.style.width = `${mapImage.offsetWidth}px`;
      overlay.style.height = `${mapImage.offsetHeight}px`;
      overlay.style.transform = `scale(${state.zoom || 1})`;
      overlay.style.transformOrigin = "center center";
    } else {
      const space = state.space || { x: 0, y: 0, width: 1000, height: 1000 };
      overlay.setAttribute("viewBox", `${space.x} ${space.y} ${space.width} ${space.height}`);
      overlay.style.left = "0";
      overlay.style.top = "0";
      overlay.style.width = "100%";
      overlay.style.height = "100%";
      overlay.style.transform = "none";
      overlay.style.transformOrigin = "top left";
    }
  }

  function applySnapshot(layer, snapshot, isCurrent) {
    if (!isCurrent()) return;
    const records = new Map();
    snapshot.docs.forEach((snapshotDoc) => {
      const stroke = normalizeDrawingStroke({
        ...snapshotDoc.data(),
        id: snapshotDoc.id,
        layer
      }, state);
      if (stroke.mapId === state.mapId) records.set(stroke.id, stroke);
    });
    state.strokesByLayer.set(layer, records);
    render();
  }

  function connectLayer(layer) {
    const source = query(
      collection(db, "rooms", state.roomCode, DRAWING_COLLECTIONS[layer]),
      where("mapId", "==", state.mapId)
    );
    const scope = `${state.roomCode}/${state.mapId}/${state.userId}/${state.isDm}/${layer}`;
    listeners.connect(`drawings-${layer}`, scope, ({ fail, isCurrent }) => onSnapshot(
      source,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (snapshot.metadata?.hasPendingWrites) return;
        applySnapshot(layer, snapshot, isCurrent);
      },
      (error) => {
        if (!isCurrent()) return;
        const failure = fail(error);
        if (failure.terminal) {
          state.strokesByLayer.set(layer, new Map());
          render();
        }
        setStatus(`Drawing sync failed: ${error.message}`, "error");
      }
    ));
  }

  function connect() {
    if (!state.roomCode || !state.userId || !state.mapId) return false;
    connectLayer("shared");
    if (state.isDm) connectLayer("dm");
    else {
      listeners.stop("drawings-dm");
      state.strokesByLayer.set("dm", new Map());
    }
    return true;
  }

  function disconnect({ clear = true } = {}) {
    listeners.stopAll();
    state.drawing = null;
    state.active = false;
    toolbar.hidden = true;
    if (clear) {
      state.strokesByLayer.forEach((records) => records.clear());
      state.undoStack = [];
      state.redoStack = [];
      state.mapId = "";
    }
    updateControls();
    render();
  }

  function syncContext() {
    const context = getMapContext() || {};
    const mapId = context.mapId
      ? stableDrawingMapId(context.mapId)
      : "";
    const target = context.target || null;
    const changed = mapId !== state.mapId || target !== state.target;
    state.mapId = mapId;
    state.target = target;
    state.mode = context.mode === "puzzle" ? "puzzle" : "single";
    state.zoom = Number(context.zoom) || 1;
    state.space = context.space && typeof context.space === "object"
      ? {
          x: Number(context.space.x) || 0,
          y: Number(context.space.y) || 0,
          width: Math.max(0.0001, Number(context.space.width) || 1000),
          height: Math.max(0.0001, Number(context.space.height) || 1000)
        }
      : null;
    if (changed) {
      listeners.stopAll();
      state.strokesByLayer.forEach((records) => records.clear());
      state.undoStack = [];
      state.redoStack = [];
      state.drawing = null;
      state.pointerId = null;
      state.historyBusy = false;
    }
    if (state.mapId && state.target) connect();
    syncOverlayGeometry();
    updateControls();
    render();
    return getState();
  }

  function setContext(next = {}) {
    const previousScope = `${state.roomCode}/${state.userId}/${state.isDm}`;
    const previouslyAllowed = canDraw();
    state.roomCode = String(next.roomCode || "");
    state.userId = String(next.userId || "");
    state.userName = String(next.userName || "Player");
    state.isDm = next.isDm === true;
    state.playersEnabled = next.playersEnabled === true;
    if (!state.isDm) state.layer = "shared";
    const nextScope = `${state.roomCode}/${state.userId}/${state.isDm}`;
    if (previousScope !== nextScope) {
      listeners.stopAll();
      state.strokesByLayer.forEach((records) => records.clear());
      state.undoStack = [];
      state.redoStack = [];
      state.drawing = null;
      state.pointerId = null;
      state.historyBusy = false;
    }
    if (!canDraw() && state.active) {
      state.drawing = null;
      setStatus(
        "The DM has disabled player drawing. You can still show or hide drawings.",
        "error"
      );
    } else if (!previouslyAllowed && canDraw() && state.active) {
      setStatus(
        "Draw mode is active on empty map space. Token controls remain available.",
        "active"
      );
    }
    return syncContext();
  }

  async function persistStroke(stroke, { restore = false, scopeKey = currentScopeKey() } = {}) {
    const normalized = normalizeDrawingStroke(stroke, state);
    if (!restore) {
      state.pendingStrokes.set(normalized.id, {
        stroke: normalized,
        scopeKey,
        status: "saving",
        error: ""
      });
      updateControls();
      render();
    }
    try {
      await setDoc(strokeRef(normalized), strokePayload(normalized, { create: true }));
      state.pendingStrokes.delete(normalized.id);
      if (scopeKey === currentScopeKey()) {
        state.strokesByLayer.get(normalized.layer).set(normalized.id, normalized);
      }
      if (!restore && scopeKey === currentScopeKey()) {
        state.undoStack.push({ type: "create", stroke: normalized });
        state.redoStack = [];
      }
      if (scopeKey === currentScopeKey()) setStatus("Drawing saved.", "saved");
      updateControls();
      render();
      return normalized;
    } catch (error) {
      if (!restore) {
        state.pendingStrokes.set(normalized.id, {
          stroke: normalized,
          scopeKey,
          status: "failed",
          error: error.message || "Drawing save failed."
        });
      }
      if (scopeKey === currentScopeKey()) {
        setStatus(`Drawing save failed: ${error.message}. Use Retry failed to try again.`, "error");
        updateControls();
        render();
      }
      return null;
    }
  }

  async function removeStroke(stroke, { record = true, scopeKey = currentScopeKey() } = {}) {
    if (!canDeleteDrawingStroke(stroke, state)) {
      setStatus("You can only erase your own shared drawings.", "error");
      return false;
    }
    try {
      await deleteDoc(strokeRef(stroke));
      if (scopeKey === currentScopeKey()) {
        state.strokesByLayer.get(stroke.layer)?.delete(stroke.id);
      }
      if (record && scopeKey === currentScopeKey()) {
        const restoreStroke = state.isDm && stroke.authorUid !== state.userId
          ? normalizeDrawingStroke({
              ...stroke,
              id: makeId(),
              authorUid: state.userId,
              authorName: state.userName,
              originalAuthorUid: stroke.originalAuthorUid || stroke.authorUid,
              originalAuthorName: stroke.originalAuthorName || stroke.authorName,
              restoredByUid: state.userId,
              createdAt: null,
              createdAtMillis: Date.now(),
              updatedAt: null,
              updatedAtMillis: Date.now()
            }, state)
          : stroke;
        state.undoStack.push({ type: "delete", stroke: restoreStroke });
        state.redoStack = [];
      }
      if (scopeKey === currentScopeKey()) {
        setStatus("Drawing removed.", "saved");
        updateControls();
        render();
      }
      return true;
    } catch (error) {
      if (scopeKey === currentScopeKey()) {
        setStatus(`Could not remove drawing: ${error.message}`, "error");
      }
      return false;
    }
  }

  async function undo() {
    if (state.historyBusy) return false;
    state.historyBusy = true;
    updateControls();
    const scopeKey = currentScopeKey();
    const action = state.undoStack.pop();
    try {
      if (!action) return false;
      let succeeded = false;
      if (action.type === "create") succeeded = await removeStroke(action.stroke, { record: false, scopeKey });
      else succeeded = Boolean(await persistStroke(action.stroke, { restore: true, scopeKey }));
      if (scopeKey === currentScopeKey()) {
        if (succeeded) state.redoStack.push(action);
        else state.undoStack.push(action);
      }
      return succeeded;
    } finally {
      state.historyBusy = false;
      updateControls();
    }
  }

  async function redo() {
    if (state.historyBusy) return false;
    state.historyBusy = true;
    updateControls();
    const scopeKey = currentScopeKey();
    const action = state.redoStack.pop();
    try {
      if (!action) return false;
      let succeeded = false;
      if (action.type === "create") succeeded = Boolean(await persistStroke(action.stroke, { restore: true, scopeKey }));
      else succeeded = await removeStroke(action.stroke, { record: false, scopeKey });
      if (scopeKey === currentScopeKey()) {
        if (succeeded) state.undoStack.push(action);
        else state.redoStack.push(action);
      }
      return succeeded;
    } finally {
      state.historyBusy = false;
      updateControls();
    }
  }

  async function clearDrawings() {
    if (state.historyBusy) return false;
    const scopeKey = currentScopeKey();
    const candidates = [
      ...state.strokesByLayer.get("shared").values(),
      ...(state.isDm ? state.strokesByLayer.get("dm").values() : [])
    ].filter((stroke) => (
      stroke.mapId === state.mapId
      && (state.isDm || stroke.authorUid === state.userId)
    ));
    if (!candidates.length) return false;
    const confirmed = await requestConfirmation(
      state.isDm
        ? "Clear every shared and DM-only drawing on this map? Other users' strokes will also be removed."
        : "Clear only the drawings you created on this map?",
      { title: state.isDm ? "Clear all drawing layers" : "Clear my drawings", confirmLabel: "Clear" }
    );
    if (!confirmed) return false;
    state.historyBusy = true;
    updateControls();
    try {
      for (let offset = 0; offset < candidates.length; offset += 400) {
        const batch = writeBatch(db);
        candidates.slice(offset, offset + 400).forEach((stroke) => batch.delete(strokeRef(stroke)));
        await batch.commit();
      }
      if (scopeKey === currentScopeKey()) {
        candidates.forEach((stroke) => state.strokesByLayer.get(stroke.layer)?.delete(stroke.id));
        state.undoStack = [];
        state.redoStack = [];
        setStatus("Drawings cleared.", "saved");
        render();
      }
      return true;
    } catch (error) {
      if (scopeKey === currentScopeKey()) {
        setStatus(`Could not clear drawings: ${error.message}`, "error");
      }
      return false;
    } finally {
      state.historyBusy = false;
      updateControls();
    }
  }

  function pointFromEvent(event) {
    return clientPointToDrawingSpace(
      overlay.getBoundingClientRect(),
      event.clientX,
      event.clientY,
      state.space
    );
  }

  function startDrawing(event) {
    if (!state.active || !state.visible || state.historyBusy || event.isPrimary === false || (event.button ?? 0) !== 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (state.tool === "eraser") {
      const target = event.target.closest?.("[data-drawing-stroke-id]");
      if (!target) return;
      const layer = target.dataset.drawingLayer;
      const stroke = state.strokesByLayer.get(layer)?.get(target.dataset.drawingStrokeId);
      if (stroke) {
        state.historyBusy = true;
        updateControls();
        void removeStroke(stroke).finally(() => {
          state.historyBusy = false;
          updateControls();
        });
      }
      return;
    }
    if (!canDraw()) {
      setActive(false);
      return;
    }
    const point = pointFromEvent(event);
    overlay.setPointerCapture?.(event.pointerId);
    state.pointerId = event.pointerId;
    state.drawing = normalizeDrawingStroke({
      id: makeId(),
      roomCode: state.roomCode,
      mapId: state.mapId,
      authorUid: state.userId,
      authorName: state.userName,
      layer: state.isDm ? state.layer : "shared",
      tool: state.tool,
      color: state.color,
      size: state.size,
      points: [point],
      start: point,
      end: point,
      createdAtMillis: Date.now(),
      updatedAtMillis: Date.now()
    }, state);
    render();
  }

  function continueDrawing(event) {
    if (!state.drawing || event.pointerId !== state.pointerId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const point = pointFromEvent(event);
    state.drawing.end = point;
    if (state.drawing.tool === "pen") {
      const last = state.drawing.points[state.drawing.points.length - 1];
      if (!last || Math.hypot(point.x - last.x, point.y - last.y) >= 2) {
        state.drawing.points.push(point);
        if (state.drawing.points.length > 700) {
          state.drawing.points = simplifyDrawingPoints(state.drawing.points, 4);
        }
      }
    }
    schedulePreviewRender();
  }

  function finishDrawing(event) {
    if (!state.drawing || event.pointerId !== state.pointerId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const finalPoint = pointFromEvent(event);
    state.drawing.end = finalPoint;
    if (state.drawing.tool === "pen") {
      const last = state.drawing.points[state.drawing.points.length - 1];
      if (!last || last.x !== finalPoint.x || last.y !== finalPoint.y) {
        state.drawing.points.push(finalPoint);
      }
    }
    try { overlay.releasePointerCapture?.(event.pointerId); } catch {}
    const stroke = normalizeDrawingStroke({
      ...state.drawing,
      points: simplifyDrawingPoints(state.drawing.points, 2.5),
      updatedAtMillis: Date.now()
    }, state);
    state.drawing = null;
    state.pointerId = null;
    render();
    const hasLength = stroke.tool === "pen"
      ? stroke.points.length > 1
      : Math.hypot(stroke.end.x - stroke.start.x, stroke.end.y - stroke.start.y) > 2;
    if (hasLength) void persistStroke(stroke);
  }

  function cancelDrawing(event) {
    if (!state.drawing || event.pointerId !== state.pointerId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try { overlay.releasePointerCapture?.(event.pointerId); } catch {}
    state.drawing = null;
    state.pointerId = null;
    render();
    setStatus("Drawing cancelled.", "active");
  }

  async function retryFailedStrokes() {
    if (state.historyBusy) return false;
    const failed = [...state.pendingStrokes.values()].filter((entry) => (
      entry.scopeKey === currentScopeKey() && entry.status === "failed"
    ));
    if (!failed.length) return false;
    for (const entry of failed) {
      await persistStroke(entry.stroke, { scopeKey: entry.scopeKey });
    }
    return failed.every((entry) => !state.pendingStrokes.has(entry.stroke.id));
  }

  toolbar.addEventListener("click", (event) => {
    const toolButton = event.target.closest("[data-drawing-tool]");
    if (toolButton) {
      state.tool = DRAWING_TOOLS.includes(toolButton.dataset.drawingTool)
        ? toolButton.dataset.drawingTool
        : "pen";
      if (state.tool === "eraser") {
        setStatus("Click a complete stroke to erase it. Each erased stroke can be undone.", "active");
      }
      updateControls();
      return;
    }
    if (event.target.closest("[data-drawing-close]")) setActive(false);
    if (event.target.closest("[data-drawing-undo]")) void undo();
    if (event.target.closest("[data-drawing-redo]")) void redo();
    if (event.target.closest("[data-drawing-clear]")) void clearDrawings();
    if (event.target.closest("[data-drawing-retry]")) void retryFailedStrokes();
  });

  toggleButton.addEventListener("click", () => setActive(!state.active));
  elements.color.addEventListener("input", () => { state.color = elements.color.value; });
  elements.size.addEventListener("input", () => {
    state.size = Number(elements.size.value) || 4;
    elements.sizeOutput.value = `${state.size} px`;
  });
  elements.layer.addEventListener("change", () => {
    state.layer = state.isDm && elements.layer.value === "dm" ? "dm" : "shared";
  });
  elements.visible.addEventListener("change", () => {
    state.visible = elements.visible.checked;
    if (!state.visible) state.drawing = null;
    updateControls();
    render();
  });
  elements.playerEnabled.addEventListener("change", async () => {
    if (!state.isDm || !state.roomCode) return;
    const enabled = elements.playerEnabled.checked;
    elements.playerEnabled.disabled = true;
    try {
      await updateDoc(doc(db, "rooms", state.roomCode), {
        "drawingSettings.playersEnabled": enabled,
        updatedAt: serverTimestamp()
      });
      state.playersEnabled = enabled;
      setStatus(enabled ? "Players can draw on shared layers." : "Player drawing disabled.", "saved");
    } catch (error) {
      elements.playerEnabled.checked = state.playersEnabled;
      setStatus(`Permission update failed: ${error.message}`, "error");
    } finally {
      elements.playerEnabled.disabled = false;
    }
  });

  overlay.addEventListener("pointerdown", startDrawing, true);
  overlay.addEventListener("pointermove", continueDrawing, true);
  overlay.addEventListener("pointerup", finishDrawing, true);
  overlay.addEventListener("pointercancel", cancelDrawing, true);

  if (globalThis.ResizeObserver && surface) {
    resizeObserver = new ResizeObserver(() => syncOverlayGeometry());
    resizeObserver.observe(surface);
    if (mapViewer) resizeObserver.observe(mapViewer);
    if (mapImage) resizeObserver.observe(mapImage);
    if (puzzleBoard && puzzleBoard !== mapViewer) resizeObserver.observe(puzzleBoard);
  }

  function destroy() {
    disconnect();
    const cancelFrame = globalThis.cancelAnimationFrame || globalThis.clearTimeout;
    if (previewFrame) cancelFrame(previewFrame);
    previewFrame = 0;
    state.pendingStrokes.clear();
    renderedStrokes.clear();
    resizeObserver?.disconnect();
    overlay.remove();
    toolbar.remove();
    toggleButton.remove();
  }

  function getState() {
    return {
      roomCode: state.roomCode,
      mapId: state.mapId,
      isDm: state.isDm,
      playersEnabled: state.playersEnabled,
      active: state.active,
      visible: state.visible,
      tool: state.tool,
      layer: state.layer,
      sharedCount: state.strokesByLayer.get("shared").size,
      dmCount: state.strokesByLayer.get("dm").size,
      undoCount: state.undoStack.length,
      redoCount: state.redoStack.length,
      pendingCount: [...state.pendingStrokes.values()].filter((entry) => entry.scopeKey === currentScopeKey()).length,
      failedCount: [...state.pendingStrokes.values()].filter((entry) => entry.scopeKey === currentScopeKey() && entry.status === "failed").length,
      historyBusy: state.historyBusy,
      listeners: listeners.getSnapshot()
    };
  }

  updateControls();
  render();

  return Object.freeze({
    root: toolbar,
    overlay,
    open,
    setActive,
    setContext,
    syncContext,
    connect,
    disconnect,
    undo,
    redo,
    clearDrawings,
    getState,
    destroy
  });
}
