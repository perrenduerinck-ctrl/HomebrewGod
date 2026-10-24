import { createRealtimeListenerRegistry } from "../shared/realtimeListeners.js";
import { clientPointToDrawingSpace, simplifyDrawingPoints } from "./drawingModel.js";
import {
  FOG_MODES,
  FOG_TOOLS,
  createDefaultFogSettings,
  fogOperationHasArea,
  normalizeFogOperation,
  normalizeFogSettings,
  sortFogOperations,
  stableFogMapId
} from "./fogModel.js";

const SVG_NS = "http://www.w3.org/2000/svg";

function makeId(prefix = "fog") {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`.replace(/[^a-zA-Z0-9_-]/g, "-");
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function makeSvgElement(document, name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
  return element;
}

function pointsAttribute(points = []) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

export function createFogOfWarSystem(options = {}) {
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
    getDocs,
    writeBatch,
    runTransaction,
    serverTimestamp,
    requestConfirmation = async (message) => globalThis.confirm?.(message) === true,
    getMapContext = () => ({}),
    acquireInteraction = null,
    onSettingsChanged = null
  } = options;
  if (!document || !db || !collection || !doc || !onSnapshot || !setDoc) {
    throw new Error("Fog of War requires the map and Firestore tools.");
  }

  const listeners = createRealtimeListenerRegistry({
    onStopError: (error) => console.warn("Fog listener cleanup failed:", error)
  });
  const maskId = makeId("hgFogMask");
  const memoryMaskId = makeId("hgFogMemoryMask");
  let resizeObserver = null;
  let previewFrame = 0;
  let releaseInteraction = null;
  let localOrderSequence = 0;
  let lastMaskSignature = "";
  let lastPreviewSignature = "";
  const renderMetrics = {
    passes: 0,
    maskRebuilds: 0,
    maskReuses: 0,
    previewRebuilds: 0
  };
  const state = {
    roomCode: "",
    userId: "",
    isDm: false,
    mapId: "",
    target: null,
    mode: "single",
    zoom: 1,
    space: null,
    active: false,
    previewAsPlayer: false,
    paintMode: "reveal",
    tool: "brush",
    size: 60,
    settings: createDefaultFogSettings(),
    operations: new Map(),
    pendingOperations: new Map(),
    vision: {
      enabled: false,
      currentPolygons: [],
      exploredPath: ""
    },
    drawing: null,
    pointerId: null,
    busy: false
  };

  const toggleButton = document.createElement("button");
  toggleButton.id = "fogOfWarToggleButton";
  toggleButton.type = "button";
  toggleButton.textContent = "Fog";
  toggleButton.title = "Open Fog of War controls";
  toggleButton.setAttribute("aria-pressed", "false");
  toggleButton.hidden = true;
  quickActions?.append(toggleButton);

  const toolbar = document.createElement("section");
  toolbar.className = "hg-fog-toolbar";
  toolbar.hidden = true;
  toolbar.setAttribute("aria-label", "Fog of War controls");
  toolbar.innerHTML = `
    <header>
      <div><strong>Fog of War</strong><small>DM controls</small></div>
      <button type="button" data-fog-close aria-label="Close Fog of War controls">×</button>
    </header>
    <label class="hg-fog-enabled"><input type="checkbox" data-fog-enabled> Enable fog on this map</label>
    <div class="hg-fog-segmented" role="toolbar" aria-label="Fog paint mode">
      <button type="button" data-fog-mode="reveal" title="Make painted areas visible to players">Reveal</button>
      <button type="button" data-fog-mode="hide" title="Cover painted areas with fog">Hide</button>
    </div>
    <div class="hg-fog-tools" role="toolbar" aria-label="Fog shape">
      <button type="button" data-fog-tool="brush" title="Paint fog freehand">Brush</button>
      <button type="button" data-fog-tool="rectangle" title="Paint a rectangular area">Rectangle</button>
      <button type="button" data-fog-tool="circle" title="Paint an elliptical area">Circle</button>
    </div>
    <label class="hg-fog-size">Brush size
      <input type="range" min="10" max="300" step="5" value="60" data-fog-size>
      <output data-fog-size-output>60</output>
    </label>
    <div class="hg-fog-actions">
      <button type="button" data-fog-reveal-all>Reveal All</button>
      <button type="button" data-fog-hide-all>Hide All</button>
      <button type="button" data-fog-retry hidden>Retry failed</button>
    </div>
    <label class="hg-fog-preview-toggle"><input type="checkbox" data-fog-player-preview> Preview as player</label>
    <p class="status" role="status" aria-live="polite" data-fog-status></p>
  `;
  surface?.append(toolbar);

  const overlay = makeSvgElement(document, "svg", {
    class: "hg-fog-layer",
    viewBox: "0 0 1000 1000",
    preserveAspectRatio: "none",
    "aria-hidden": "true"
  });
  const defs = makeSvgElement(document, "defs");
  const mask = makeSvgElement(document, "mask", {
    id: maskId,
    maskUnits: "userSpaceOnUse",
    x: 0,
    y: 0,
    width: 1000,
    height: 1000
  });
  const memoryMask = makeSvgElement(document, "mask", {
    id: memoryMaskId,
    maskUnits: "userSpaceOnUse",
    x: 0,
    y: 0,
    width: 1000,
    height: 1000
  });
  defs.append(mask, memoryMask);
  const fogFill = makeSvgElement(document, "rect", {
    class: "hg-fog-fill",
    x: 0,
    y: 0,
    width: 1000,
    height: 1000,
    mask: `url(#${maskId})`
  });
  const memoryFill = makeSvgElement(document, "rect", {
    class: "hg-fog-memory-fill",
    x: 0,
    y: 0,
    width: 1000,
    height: 1000,
    mask: `url(#${memoryMaskId})`
  });
  const previewGroup = makeSvgElement(document, "g", { class: "hg-fog-preview" });
  overlay.append(defs, fogFill, memoryFill, previewGroup);
  surface?.append(overlay);

  const elements = {
    enabled: toolbar.querySelector("[data-fog-enabled]"),
    size: toolbar.querySelector("[data-fog-size]"),
    sizeOutput: toolbar.querySelector("[data-fog-size-output]"),
    revealAll: toolbar.querySelector("[data-fog-reveal-all]"),
    hideAll: toolbar.querySelector("[data-fog-hide-all]"),
    retry: toolbar.querySelector("[data-fog-retry]"),
    playerPreview: toolbar.querySelector("[data-fog-player-preview]"),
    status: toolbar.querySelector("[data-fog-status]")
  };

  function currentScopeKey() {
    return `${state.roomCode}/${state.userId}/${state.isDm}/${state.mapId}`;
  }

  function settingsReference() {
    return doc(db, "rooms", state.roomCode, "fogSettings", state.mapId);
  }

  function operationReference(operation) {
    return doc(db, "rooms", operation.roomCode, "fogOperations", operation.id);
  }

  function operationCollection() {
    return collection(db, "rooms", state.roomCode, "fogOperations");
  }

  function settingsPayload(settings) {
    return {
      mapId: settings.mapId,
      roomCode: settings.roomCode,
      enabled: settings.enabled,
      baseState: settings.baseState,
      revision: settings.revision,
      updatedByUid: settings.updatedByUid,
      updatedAtMillis: settings.updatedAtMillis,
      updatedAt: serverTimestamp()
    };
  }

  function operationPayload(operation) {
    return {
      id: operation.id,
      roomCode: operation.roomCode,
      mapId: operation.mapId,
      revision: operation.revision,
      authorUid: operation.authorUid,
      mode: operation.mode,
      tool: operation.tool,
      size: operation.size,
      points: operation.points,
      start: operation.start,
      end: operation.end,
      order: operation.order,
      createdAtMillis: operation.createdAtMillis,
      createdAt: operation.createdAt || serverTimestamp()
    };
  }

  function setStatus(message, kind = "") {
    elements.status.textContent = message || "";
    elements.status.dataset.state = kind;
  }

  function createOperationShape(operation, { preview = false } = {}) {
    const maskColor = operation.mode === "hide" ? "white" : "black";
    const previewColor = operation.mode === "hide" ? "#ff8c9f" : "#63e6be";
    if (operation.tool === "brush") {
      return makeSvgElement(document, "polyline", {
        points: pointsAttribute(operation.points),
        fill: "none",
        stroke: preview ? previewColor : maskColor,
        "stroke-width": operation.size,
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
      });
    }
    const x = Math.min(operation.start.x, operation.end.x);
    const y = Math.min(operation.start.y, operation.end.y);
    const width = Math.abs(operation.end.x - operation.start.x);
    const height = Math.abs(operation.end.y - operation.start.y);
    if (operation.tool === "circle") {
      return makeSvgElement(document, "ellipse", {
        cx: x + width / 2,
        cy: y + height / 2,
        rx: width / 2,
        ry: height / 2,
        fill: preview ? `${previewColor}55` : maskColor,
        ...(preview ? { stroke: previewColor, "stroke-width": 4 } : {})
      });
    }
    return makeSvgElement(document, "rect", {
      x,
      y,
      width,
      height,
      fill: preview ? `${previewColor}55` : maskColor,
      ...(preview ? { stroke: previewColor, "stroke-width": 4 } : {})
    });
  }

  function currentOperations() {
    const desired = new Map();
    state.operations.forEach((operation) => {
      if (operation.mapId === state.mapId && operation.revision === state.settings.revision) {
        desired.set(operation.id, operation);
      }
    });
    state.pendingOperations.forEach((entry) => {
      if (entry.scopeKey === currentScopeKey() && entry.operation.revision === state.settings.revision) {
        desired.set(entry.operation.id, entry.operation);
      }
    });
    return sortFogOperations(desired.values());
  }

  function render() {
    const visionEnabled = state.vision.enabled && state.settings.enabled;
    const operations = currentOperations();
    const maskSignature = JSON.stringify({
      mapId: state.mapId,
      baseState: state.settings.baseState,
      revision: state.settings.revision,
      operations,
      visionEnabled,
      exploredPath: state.vision.exploredPath,
      currentPolygons: state.vision.currentPolygons,
      drawing: state.drawing
    });
    renderMetrics.passes += 1;
    if (maskSignature !== lastMaskSignature) {
      lastMaskSignature = maskSignature;
      renderMetrics.maskRebuilds += 1;
      mask.replaceChildren(makeSvgElement(document, "rect", {
        x: 0,
        y: 0,
        width: 1000,
        height: 1000,
        fill: state.settings.baseState === "hidden" ? "white" : "black"
      }));
      operations.forEach((operation) => mask.append(createOperationShape(operation)));
      if (visionEnabled && state.vision.exploredPath) {
        mask.append(makeSvgElement(document, "path", {
          class: "hg-fog-explored-mask",
          d: state.vision.exploredPath,
          fill: "black"
        }));
      }
      if (visionEnabled) {
        state.vision.currentPolygons.forEach((polygon) => {
          if (!Array.isArray(polygon) || polygon.length < 3) return;
          mask.append(makeSvgElement(document, "polygon", {
            class: "hg-fog-current-vision-mask",
            points: pointsAttribute(polygon),
            fill: "black"
          }));
        });
      }
      memoryMask.replaceChildren(makeSvgElement(document, "rect", {
        x: 0,
        y: 0,
        width: 1000,
        height: 1000,
        fill: "black"
      }));
      if (visionEnabled && state.vision.exploredPath) {
        memoryMask.append(makeSvgElement(document, "path", {
          d: state.vision.exploredPath,
          fill: "white"
        }));
        state.vision.currentPolygons.forEach((polygon) => {
          if (!Array.isArray(polygon) || polygon.length < 3) return;
          memoryMask.append(makeSvgElement(document, "polygon", {
            points: pointsAttribute(polygon),
            fill: "black"
          }));
        });
      }
      if (state.drawing && state.isDm) {
        mask.append(createOperationShape(state.drawing));
      }
    } else {
      renderMetrics.maskReuses += 1;
    }
    memoryFill.style.display = visionEnabled && state.vision.exploredPath ? "" : "none";
    const previewSignature = JSON.stringify({
      drawing: state.drawing,
      isDm: state.isDm
    });
    if (previewSignature !== lastPreviewSignature) {
      lastPreviewSignature = previewSignature;
      renderMetrics.previewRebuilds += 1;
      previewGroup.replaceChildren();
      if (state.drawing && state.isDm) {
        previewGroup.append(createOperationShape(state.drawing, { preview: true }));
      }
    }

    const visible = Boolean(state.mapId && state.settings.enabled);
    overlay.style.visibility = visible ? "visible" : "hidden";
    overlay.classList.toggle("is-enabled", visible);
    overlay.classList.toggle("is-editing", visible && state.active && state.isDm && !state.busy);
    overlay.classList.toggle("is-dm-view", state.isDm && !state.previewAsPlayer);
    overlay.style.pointerEvents = visible && state.active && state.isDm && !state.busy ? "auto" : "none";
    overlay.style.touchAction = visible && state.active && state.isDm ? "none" : "auto";
  }

  function scheduleRender() {
    if (previewFrame) return;
    const requestFrame = globalThis.requestAnimationFrame || ((callback) => globalThis.setTimeout(callback, 0));
    previewFrame = requestFrame(() => {
      previewFrame = 0;
      render();
    });
  }

  function updateControls() {
    toggleButton.hidden = !state.isDm;
    toggleButton.disabled = !state.isDm || !state.mapId;
    toggleButton.setAttribute("aria-pressed", String(state.active));
    toggleButton.classList.toggle("is-active", state.active);
    toggleButton.classList.toggle("has-fog", state.settings.enabled);
    toggleButton.title = state.settings.enabled
      ? "Fog is enabled on this map"
      : "Fog is off on this map";
    elements.enabled.checked = state.settings.enabled;
    elements.enabled.disabled = state.busy || !state.mapId;
    elements.size.value = String(state.size);
    elements.sizeOutput.value = String(state.size);
    elements.playerPreview.checked = state.previewAsPlayer;
    toolbar.querySelectorAll("[data-fog-mode]").forEach((button) => {
      const selected = button.dataset.fogMode === state.paintMode;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
      button.disabled = state.busy || !state.settings.enabled;
    });
    toolbar.querySelectorAll("[data-fog-tool]").forEach((button) => {
      const selected = button.dataset.fogTool === state.tool;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
      button.disabled = state.busy || !state.settings.enabled;
    });
    elements.size.disabled = state.busy || !state.settings.enabled;
    elements.revealAll.disabled = state.busy || !state.mapId;
    elements.hideAll.disabled = state.busy || !state.mapId;
    const failedCount = [...state.pendingOperations.values()].filter((entry) => (
      entry.scopeKey === currentScopeKey() && entry.status === "failed"
    )).length;
    elements.retry.hidden = failedCount === 0;
    elements.retry.disabled = state.busy || failedCount === 0;
    elements.retry.textContent = failedCount > 1 ? `Retry failed (${failedCount})` : "Retry failed";
    render();
  }

  function releaseMapInteraction() {
    const release = releaseInteraction;
    releaseInteraction = null;
    release?.();
  }

  function setActive(active, { release = true } = {}) {
    const next = active === true;
    if (next && (!state.isDm || !state.mapId)) {
      setStatus(state.isDm ? "Load a battle map before editing fog." : "Only the room DM can edit fog.", "error");
      return false;
    }
    if (next && !state.active && typeof acquireInteraction === "function") {
      releaseInteraction = acquireInteraction(() => setActive(false, { release: false }));
    }
    state.active = next;
    toolbar.hidden = !next || !state.isDm;
    if (!next) {
      state.drawing = null;
      if (state.pointerId != null) {
        try { overlay.releasePointerCapture?.(state.pointerId); } catch {}
      }
      state.pointerId = null;
      if (release) releaseMapInteraction();
    } else {
      setStatus(
        state.settings.enabled
          ? "Paint on empty map space. Tokens remain selectable above the fog layer."
          : "Enable fog on this map to begin revealing areas.",
        "active"
      );
    }
    updateControls();
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

  function applySettingsSnapshot(snapshot, isCurrent) {
    if (!isCurrent() || snapshot.metadata?.hasPendingWrites) return;
    state.settings = snapshot.exists()
      ? normalizeFogSettings(snapshot.data(), state)
      : createDefaultFogSettings(state.mapId);
    state.drawing = null;
    updateControls();
    onSettingsChanged?.(getState());
  }

  function applyOperationsSnapshot(snapshot, isCurrent) {
    if (!isCurrent() || snapshot.metadata?.hasPendingWrites) return;
    const operations = new Map();
    snapshot.docs.forEach((entry) => {
      const operation = normalizeFogOperation({ ...entry.data(), id: entry.id }, state);
      if (operation.mapId === state.mapId) operations.set(operation.id, operation);
    });
    state.operations = operations;
    render();
  }

  function connect() {
    if (!state.roomCode || !state.userId || !state.mapId) return false;
    const scope = `${state.roomCode}/${state.mapId}/${state.userId}/${state.isDm}`;
    listeners.connect("fog-settings", scope, ({ fail, isCurrent }) => onSnapshot(
      settingsReference(),
      { includeMetadataChanges: true },
      (snapshot) => applySettingsSnapshot(snapshot, isCurrent),
      (error) => {
        if (!isCurrent()) return;
        fail(error);
        setStatus(`Fog settings sync failed: ${error.message}`, "error");
      }
    ));
    const source = query(operationCollection(), where("mapId", "==", state.mapId));
    listeners.connect("fog-operations", scope, ({ fail, isCurrent }) => onSnapshot(
      source,
      { includeMetadataChanges: true },
      (snapshot) => applyOperationsSnapshot(snapshot, isCurrent),
      (error) => {
        if (!isCurrent()) return;
        fail(error);
        setStatus(`Fog exploration sync failed: ${error.message}`, "error");
      }
    ));
    return true;
  }

  function disconnect({ clear = true } = {}) {
    listeners.stopAll();
    setActive(false);
    toolbar.hidden = true;
    if (clear) {
      state.mapId = "";
      state.target = null;
      state.settings = createDefaultFogSettings();
      state.operations.clear();
      state.pendingOperations.clear();
    }
    updateControls();
  }

  function syncContext() {
    const context = getMapContext() || {};
    const mapId = context.mapId ? stableFogMapId(context.mapId) : "";
    const target = context.target || null;
    const changed = mapId !== state.mapId || target !== state.target;
    if (changed) {
      listeners.stopAll();
      setActive(false);
      state.settings = createDefaultFogSettings(mapId);
      state.operations.clear();
      state.pendingOperations.clear();
      state.drawing = null;
      state.pointerId = null;
      state.vision = { enabled: false, currentPolygons: [], exploredPath: "" };
    }
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
    if (state.mapId && state.target) connect();
    syncOverlayGeometry();
    updateControls();
    return getState();
  }

  function setContext(next = {}) {
    const previousScope = `${state.roomCode}/${state.userId}/${state.isDm}`;
    state.roomCode = String(next.roomCode || "");
    state.userId = String(next.userId || "");
    state.isDm = next.isDm === true;
    if (!state.isDm) {
      state.previewAsPlayer = false;
      setActive(false);
    }
    const nextScope = `${state.roomCode}/${state.userId}/${state.isDm}`;
    if (previousScope !== nextScope) {
      listeners.stopAll();
      state.settings = createDefaultFogSettings(state.mapId);
      state.operations.clear();
      state.pendingOperations.clear();
    }
    return syncContext();
  }

  function setVisionState(next = {}) {
    state.vision = {
      enabled: next.enabled === true,
      currentPolygons: (Array.isArray(next.currentPolygons) ? next.currentPolygons : [])
        .filter((polygon) => Array.isArray(polygon) && polygon.length >= 3)
        .map((polygon) => polygon.map((point) => ({
          x: Math.max(0, Math.min(1000, Number(point?.x) || 0)),
          y: Math.max(0, Math.min(1000, Number(point?.y) || 0))
        }))),
      exploredPath: String(next.exploredPath || "")
    };
    scheduleRender();
    return {
      enabled: state.vision.enabled,
      polygonCount: state.vision.currentPolygons.length,
      hasExploration: Boolean(state.vision.exploredPath)
    };
  }

  async function commitSettings(mutator) {
    if (!state.isDm || !state.roomCode || !state.mapId || state.busy) return null;
    const scopeKey = currentScopeKey();
    const reference = settingsReference();
    state.busy = true;
    updateControls();
    try {
      let nextSettings;
      if (typeof runTransaction === "function") {
        nextSettings = await runTransaction(db, async (transaction) => {
          const snapshot = await transaction.get(reference);
          const current = snapshot.exists()
            ? normalizeFogSettings(snapshot.data(), state)
            : createDefaultFogSettings(state.mapId);
          const mutated = mutator(current);
          const normalized = normalizeFogSettings({
            ...mutated,
            mapId: state.mapId,
            roomCode: state.roomCode,
            updatedByUid: state.userId,
            updatedAtMillis: Date.now()
          }, state);
          transaction.set(reference, settingsPayload(normalized));
          return normalized;
        });
      } else {
        const mutated = mutator(state.settings);
        nextSettings = normalizeFogSettings({
          ...mutated,
          mapId: state.mapId,
          roomCode: state.roomCode,
          updatedByUid: state.userId,
          updatedAtMillis: Date.now()
        }, state);
        await setDoc(reference, settingsPayload(nextSettings));
      }
      if (scopeKey === currentScopeKey()) {
        state.settings = nextSettings;
        state.drawing = null;
        updateControls();
        onSettingsChanged?.(getState());
      }
      return nextSettings;
    } catch (error) {
      if (scopeKey === currentScopeKey()) setStatus(`Fog update failed: ${error.message}`, "error");
      return null;
    } finally {
      if (scopeKey === currentScopeKey()) {
        state.busy = false;
        updateControls();
      }
    }
  }

  async function setEnabled(enabled) {
    const result = await commitSettings((current) => ({
      ...current,
      enabled: enabled === true,
      revision: current.revision || 1
    }));
    if (result) setStatus(result.enabled ? "Fog enabled. This map starts covered." : "Fog disabled on this map.", "saved");
    return Boolean(result);
  }

  async function deleteOperationsOutsideRevision(revision, mapId, roomCode) {
    if (typeof getDocs !== "function" || typeof writeBatch !== "function") return;
    try {
      const snapshot = await getDocs(query(
        collection(db, "rooms", roomCode, "fogOperations"),
        where("mapId", "==", mapId)
      ));
      const stale = snapshot.docs.filter((entry) => Number(entry.data()?.revision) !== revision);
      for (let offset = 0; offset < stale.length; offset += 400) {
        const batch = writeBatch(db);
        stale.slice(offset, offset + 400).forEach((entry) => batch.delete(entry.ref));
        await batch.commit();
      }
    } catch (error) {
      console.warn("Fog reset succeeded, but stale operations could not be cleaned up:", error);
    }
  }

  async function resetFog(baseState) {
    if (!state.isDm || state.busy) return false;
    const verb = baseState === "revealed" ? "Reveal" : "Hide";
    const confirmed = await requestConfirmation(
      `${verb} the entire current map? This replaces its saved fog exploration.`,
      { title: `${verb} entire map`, confirmLabel: `${verb} All` }
    );
    if (!confirmed) return false;
    const mapId = state.mapId;
    const roomCode = state.roomCode;
    const result = await commitSettings((current) => ({
      ...current,
      enabled: true,
      baseState,
      revision: Math.min(1000000, Math.max(0, current.revision) + 1)
    }));
    if (!result) return false;
    state.operations.clear();
    state.pendingOperations.clear();
    render();
    setStatus(`${verb} All saved for this map.`, "saved");
    void deleteOperationsOutsideRevision(result.revision, mapId, roomCode);
    return true;
  }

  async function persistOperation(operation, { scopeKey = currentScopeKey() } = {}) {
    const normalized = normalizeFogOperation(operation, state);
    state.pendingOperations.set(normalized.id, {
      operation: normalized,
      scopeKey,
      status: "saving",
      error: ""
    });
    updateControls();
    try {
      await setDoc(operationReference(normalized), operationPayload(normalized));
      state.pendingOperations.delete(normalized.id);
      if (scopeKey === currentScopeKey()) {
        state.operations.set(normalized.id, normalized);
        setStatus(`${normalized.mode === "hide" ? "Hidden" : "Revealed"} area saved.`, "saved");
        updateControls();
      }
      return normalized;
    } catch (error) {
      state.pendingOperations.set(normalized.id, {
        operation: normalized,
        scopeKey,
        status: "failed",
        error: error.message || "Fog save failed."
      });
      if (scopeKey === currentScopeKey()) {
        setStatus(`Fog save failed: ${error.message}. Use Retry failed to try again.`, "error");
        updateControls();
      }
      return null;
    }
  }

  async function retryFailed() {
    if (state.busy) return false;
    const failed = [...state.pendingOperations.values()].filter((entry) => (
      entry.scopeKey === currentScopeKey() && entry.status === "failed"
    ));
    for (const entry of failed) {
      await persistOperation(entry.operation, { scopeKey: entry.scopeKey });
    }
    return failed.every((entry) => !state.pendingOperations.has(entry.operation.id));
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
    if (!state.active || !state.isDm || !state.settings.enabled || state.busy || event.isPrimary === false || (event.button ?? 0) !== 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const point = pointFromEvent(event);
    overlay.setPointerCapture?.(event.pointerId);
    state.pointerId = event.pointerId;
    const now = Date.now();
    localOrderSequence = (localOrderSequence + 1) % 1000;
    state.drawing = normalizeFogOperation({
      id: makeId("fog-op"),
      roomCode: state.roomCode,
      mapId: state.mapId,
      revision: state.settings.revision,
      authorUid: state.userId,
      mode: state.paintMode,
      tool: state.tool,
      size: state.size,
      points: [point],
      start: point,
      end: point,
      order: now * 1000 + localOrderSequence,
      createdAtMillis: now
    }, state);
    render();
  }

  function continueDrawing(event) {
    if (!state.drawing || event.pointerId !== state.pointerId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const point = pointFromEvent(event);
    const points = state.drawing.tool === "brush"
      ? [...state.drawing.points]
      : state.drawing.points;
    if (state.drawing.tool === "brush") {
      const last = points[points.length - 1];
      if (!last || Math.hypot(point.x - last.x, point.y - last.y) >= 2) points.push(point);
      if (points.length > 700) points.splice(0, points.length, ...simplifyDrawingPoints(points, 4));
    }
    state.drawing = normalizeFogOperation({ ...state.drawing, points, end: point }, state);
    scheduleRender();
  }

  function finishDrawing(event) {
    if (!state.drawing || event.pointerId !== state.pointerId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const point = pointFromEvent(event);
    const points = [...state.drawing.points];
    if (state.drawing.tool === "brush") {
      const last = points[points.length - 1];
      if (!last || last.x !== point.x || last.y !== point.y) points.push(point);
    }
    const operation = normalizeFogOperation({
      ...state.drawing,
      points: simplifyDrawingPoints(points, 2.5),
      end: point
    }, state);
    try { overlay.releasePointerCapture?.(event.pointerId); } catch {}
    state.drawing = null;
    state.pointerId = null;
    render();
    if (fogOperationHasArea(operation)) void persistOperation(operation);
  }

  function cancelDrawing(event) {
    if (!state.drawing || event.pointerId !== state.pointerId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try { overlay.releasePointerCapture?.(event.pointerId); } catch {}
    state.drawing = null;
    state.pointerId = null;
    render();
    setStatus("Fog edit cancelled.", "active");
  }

  toolbar.addEventListener("click", (event) => {
    const modeButton = event.target.closest("[data-fog-mode]");
    if (modeButton) {
      state.paintMode = FOG_MODES.includes(modeButton.dataset.fogMode) ? modeButton.dataset.fogMode : "reveal";
      updateControls();
      return;
    }
    const toolButton = event.target.closest("[data-fog-tool]");
    if (toolButton) {
      state.tool = FOG_TOOLS.includes(toolButton.dataset.fogTool) ? toolButton.dataset.fogTool : "brush";
      updateControls();
      return;
    }
    if (event.target.closest("[data-fog-close]")) setActive(false);
    if (event.target.closest("[data-fog-reveal-all]")) void resetFog("revealed");
    if (event.target.closest("[data-fog-hide-all]")) void resetFog("hidden");
    if (event.target.closest("[data-fog-retry]")) void retryFailed();
  });
  toggleButton.addEventListener("click", () => setActive(!state.active));
  elements.enabled.addEventListener("change", () => void setEnabled(elements.enabled.checked));
  elements.size.addEventListener("input", () => {
    state.size = Number(elements.size.value) || 60;
    elements.sizeOutput.value = String(state.size);
  });
  elements.playerPreview.addEventListener("change", () => {
    state.previewAsPlayer = elements.playerPreview.checked;
    render();
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

  function getState() {
    return {
      roomCode: state.roomCode,
      mapId: state.mapId,
      isDm: state.isDm,
      active: state.active,
      enabled: state.settings.enabled,
      baseState: state.settings.baseState,
      revision: state.settings.revision,
      paintMode: state.paintMode,
      tool: state.tool,
      size: state.size,
      operationCount: currentOperations().length,
      failedCount: [...state.pendingOperations.values()].filter((entry) => (
        entry.scopeKey === currentScopeKey() && entry.status === "failed"
      )).length,
      visionEnabled: state.vision.enabled,
      currentVisionPolygonCount: state.vision.currentPolygons.length,
      hasExploredVision: Boolean(state.vision.exploredPath),
      renderMetrics: { ...renderMetrics },
      listeners: listeners.getSnapshot()
    };
  }

  function destroy() {
    disconnect();
    const cancelFrame = globalThis.cancelAnimationFrame || globalThis.clearTimeout;
    if (previewFrame) cancelFrame(previewFrame);
    resizeObserver?.disconnect();
    toolbar.remove();
    overlay.remove();
    toggleButton.remove();
  }

  updateControls();
  return Object.freeze({
    root: toolbar,
    overlay,
    open,
    setActive,
    setContext,
    syncContext,
    connect,
    disconnect,
    setEnabled,
    resetFog,
    retryFailed,
    setVisionState,
    getState,
    destroy
  });
}
