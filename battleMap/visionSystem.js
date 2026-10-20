import { createRealtimeListenerRegistry } from "../shared/realtimeListeners.js";
import { clientPointToDrawingSpace } from "./drawingModel.js";
import {
  EXPLORATION_RESOLUTION,
  buildVisibilityPolygon,
  createExplorationGrid,
  effectiveVisionDistance,
  explorationGridToPath,
  markExploredPolygons,
  normalizeTokenVision,
  normalizeVisionWall,
  stableVisionDocumentId,
  wallHasLength
} from "./visionModel.js";

const SVG_NS = "http://www.w3.org/2000/svg";

function makeId(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function svg(document, name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
  return element;
}

function pointsValue(points = []) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function tokenMatchesContext(token, context) {
  if (context.sceneId && String(token?.sceneId || "") !== String(context.sceneId)) return false;
  if (context.floorId && String(token?.floorId || "") !== String(context.floorId)) return false;
  if (context.mode === "puzzle" && context.tileKey && String(token?.tileKey || "") !== String(context.tileKey)) return false;
  return token?.activationState !== "pending";
}

function permittedVisionToken(token, state) {
  const ownerUid = String(token?.ownerUid || "");
  if (ownerUid && ownerUid === state.userId) return true;
  if (!state.isDm) return false;
  return token?.type === "player" || Boolean(token?.linkedCharacterId);
}

export function createVisionSystem(options = {}) {
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
    serverTimestamp,
    requestConfirmation = async (message) => globalThis.confirm?.(message) === true,
    getMapContext = () => ({}),
    getFogEnabled = () => false,
    setFogVisionState = () => {},
    acquireInteraction = null
  } = options;
  if (!document || !db || !collection || !doc || !onSnapshot || !setDoc) {
    throw new Error("Vision requires the map and Firestore tools.");
  }

  const listeners = createRealtimeListenerRegistry({
    onStopError: (error) => console.warn("Vision listener cleanup failed:", error)
  });
  let releaseInteraction = null;
  let resizeObserver = null;
  let renderFrame = 0;
  let saveTimer = 0;
  let tokenSignature = "";
  const state = {
    roomCode: "",
    userId: "",
    isDm: false,
    mapId: "",
    target: null,
    mode: "single",
    zoom: 1,
    space: null,
    sceneId: "",
    floorId: "",
    tileKey: "",
    unitsPerFoot: 10,
    active: false,
    showWalls: true,
    walls: new Map(),
    drawing: null,
    pointerId: null,
    tokens: [],
    currentPolygons: [],
    exploration: createExplorationGrid(),
    explorationSavedCells: createExplorationGrid().cells,
    saveStatus: "idle"
  };

  const toggleButton = document.createElement("button");
  toggleButton.id = "visionToolsToggleButton";
  toggleButton.type = "button";
  toggleButton.textContent = "Vision";
  toggleButton.title = "Edit sight-blocking walls";
  toggleButton.hidden = true;
  quickActions?.append(toggleButton);

  const toolbar = document.createElement("section");
  toolbar.className = "hg-vision-toolbar";
  toolbar.hidden = true;
  toolbar.setAttribute("aria-label", "Vision and exploration controls");
  toolbar.innerHTML = `
    <header><div><strong>Vision &amp; Exploration</strong><small>DM wall editor</small></div><button type="button" data-vision-close aria-label="Close vision controls">×</button></header>
    <p>Drag solid wall lines over doors and room boundaries. Token vision stops at each saved line.</p>
    <label><input type="checkbox" data-vision-show-walls checked> Show wall guides</label>
    <div class="hg-vision-actions">
      <button type="button" data-vision-wall-mode>Add walls</button>
      <button type="button" data-vision-clear-walls>Clear map walls</button>
    </div>
    <div class="hg-vision-legend"><span><i data-kind="current"></i>Current</span><span><i data-kind="explored"></i>Explored</span></div>
    <p class="status" role="status" aria-live="polite" data-vision-status></p>
  `;
  surface?.append(toolbar);

  const overlay = svg(document, "svg", {
    class: "hg-vision-wall-layer",
    viewBox: "0 0 1000 1000",
    preserveAspectRatio: "none",
    "aria-hidden": "true"
  });
  const savedGroup = svg(document, "g", { class: "hg-vision-saved-walls" });
  const previewGroup = svg(document, "g", { class: "hg-vision-preview-wall" });
  overlay.append(savedGroup, previewGroup);
  surface?.append(overlay);

  const controls = {
    showWalls: toolbar.querySelector("[data-vision-show-walls]"),
    wallMode: toolbar.querySelector("[data-vision-wall-mode]"),
    clearWalls: toolbar.querySelector("[data-vision-clear-walls]"),
    status: toolbar.querySelector("[data-vision-status]")
  };

  function setStatus(message, kind = "") {
    controls.status.textContent = String(message || "");
    controls.status.dataset.state = kind;
  }

  function wallCollection() {
    return collection(db, "rooms", state.roomCode, "visionWalls");
  }

  function wallReference(wallId) {
    return doc(db, "rooms", state.roomCode, "visionWalls", wallId);
  }

  function explorationReference(mapId = state.mapId, userId = state.userId) {
    return doc(
      db,
      "rooms",
      state.roomCode,
      "visionExploration",
      stableVisionDocumentId(userId, mapId)
    );
  }

  function wallPayload(wall) {
    return {
      id: wall.id,
      roomCode: wall.roomCode,
      mapId: wall.mapId,
      authorUid: wall.authorUid,
      start: wall.start,
      end: wall.end,
      createdAtMillis: wall.createdAtMillis,
      updatedAtMillis: wall.updatedAtMillis,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
  }

  function applyFogVision() {
    const enabled = Boolean(state.mapId && getFogEnabled());
    setFogVisionState({
      enabled,
      currentPolygons: enabled ? state.currentPolygons : [],
      exploredPath: enabled ? explorationGridToPath(state.exploration) : ""
    });
  }

  function syncOverlayGeometry() {
    if (!state.target) return;
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

  function renderWalls() {
    const visible = state.isDm && state.showWalls && Boolean(state.mapId);
    savedGroup.replaceChildren(...[...state.walls.values()].map((wall) => svg(document, "line", {
      x1: wall.start.x,
      y1: wall.start.y,
      x2: wall.end.x,
      y2: wall.end.y,
      "data-wall-id": wall.id
    })));
    previewGroup.replaceChildren();
    if (state.drawing) {
      previewGroup.append(svg(document, "line", {
        x1: state.drawing.start.x,
        y1: state.drawing.start.y,
        x2: state.drawing.end.x,
        y2: state.drawing.end.y
      }));
    }
    overlay.style.visibility = visible || state.active ? "visible" : "hidden";
    overlay.classList.toggle("is-editing", state.active);
    overlay.style.pointerEvents = state.active ? "auto" : "none";
    overlay.style.touchAction = state.active ? "none" : "auto";
  }

  function updateControls() {
    toggleButton.hidden = !state.isDm;
    toggleButton.disabled = !state.isDm || !state.mapId;
    toggleButton.classList.toggle("is-active", state.active);
    toggleButton.setAttribute("aria-pressed", String(state.active));
    controls.showWalls.checked = state.showWalls;
    controls.wallMode.classList.toggle("is-active", state.active);
    controls.wallMode.textContent = state.active ? "Finish walls" : "Add walls";
    controls.clearWalls.disabled = state.walls.size === 0;
    renderWalls();
  }

  function releaseMapInteraction() {
    const release = releaseInteraction;
    releaseInteraction = null;
    release?.();
  }

  function setActive(active, { release = true } = {}) {
    const next = active === true;
    if (next && (!state.isDm || !state.mapId)) return false;
    if (next && !state.active && typeof acquireInteraction === "function") {
      releaseInteraction = acquireInteraction(() => setActive(false, { release: false }));
    }
    state.active = next;
    toolbar.hidden = !state.isDm || (!next && toolbar.hidden);
    if (!next) {
      state.drawing = null;
      state.pointerId = null;
      if (release) releaseMapInteraction();
    } else {
      toolbar.hidden = false;
      setStatus("Drag on the map to add solid sight-blocking walls.", "active");
    }
    updateControls();
    return true;
  }

  function open() {
    if (!state.isDm || !state.mapId) return false;
    toolbar.hidden = false;
    setStatus("Token vision is automatic. Choose Add walls to edit blockers.", "saved");
    updateControls();
    return true;
  }

  function close() {
    setActive(false);
    toolbar.hidden = true;
  }

  function relevantTokens() {
    return state.tokens.filter((token) => (
      tokenMatchesContext(token, state) && permittedVisionToken(token, state)
    ));
  }

  function computeVision() {
    renderFrame = 0;
    const unitsPerFoot = Math.max(0.01, Number(state.unitsPerFoot) || 10);
    const walls = [...state.walls.values()];
    state.currentPolygons = relevantTokens().flatMap((token) => {
      const distance = effectiveVisionDistance(token);
      if (distance <= 0) return [];
      const polygon = buildVisibilityPolygon({
        origin: { x: Number(token.x) * 10, y: Number(token.y) * 10 },
        radius: distance * unitsPerFoot,
        walls
      });
      return polygon.length >= 3 ? [polygon] : [];
    });
    const nextExploration = markExploredPolygons(state.exploration, state.currentPolygons);
    const changed = nextExploration.cells !== state.exploration.cells;
    state.exploration = nextExploration;
    applyFogVision();
    if (changed) scheduleExplorationSave();
  }

  function scheduleVision() {
    if (renderFrame) return;
    const requestFrame = globalThis.requestAnimationFrame || ((callback) => globalThis.setTimeout(callback, 0));
    renderFrame = requestFrame(computeVision);
  }

  function explorationPayload(scope) {
    return {
      roomCode: scope.roomCode,
      mapId: scope.mapId,
      ownerUid: scope.userId,
      resolution: scope.exploration.resolution,
      cells: scope.exploration.cells,
      updatedAtMillis: Date.now(),
      updatedAt: serverTimestamp()
    };
  }

  async function persistExplorationNow() {
    if (saveTimer) {
      globalThis.clearTimeout(saveTimer);
      saveTimer = 0;
    }
    if (!state.roomCode || !state.userId || !state.mapId) return false;
    if (state.exploration.cells === state.explorationSavedCells) return true;
    const scope = {
      roomCode: state.roomCode,
      userId: state.userId,
      mapId: state.mapId,
      exploration: state.exploration
    };
    state.saveStatus = "saving";
    try {
      await setDoc(explorationReference(scope.mapId, scope.userId), explorationPayload(scope));
      if (scope.roomCode === state.roomCode && scope.userId === state.userId && scope.mapId === state.mapId) {
        state.explorationSavedCells = scope.exploration.cells;
        state.saveStatus = "saved";
      }
      return true;
    } catch (error) {
      if (scope.roomCode === state.roomCode && scope.mapId === state.mapId) {
        state.saveStatus = "error";
        setStatus(`Exploration save failed: ${error.message}`, "error");
      }
      return false;
    }
  }

  function scheduleExplorationSave() {
    if (saveTimer) globalThis.clearTimeout(saveTimer);
    saveTimer = globalThis.setTimeout(() => void persistExplorationNow(), 700);
  }

  function applyWallsSnapshot(snapshot, isCurrent) {
    if (!isCurrent() || snapshot.metadata?.hasPendingWrites) return;
    const walls = new Map();
    snapshot.docs.forEach((entry) => {
      const wall = normalizeVisionWall({ ...entry.data(), id: entry.id }, state);
      if (wall.mapId === state.mapId && wallHasLength(wall)) walls.set(wall.id, wall);
    });
    state.walls = walls;
    updateControls();
    scheduleVision();
  }

  function applyExplorationSnapshot(snapshot, isCurrent) {
    if (!isCurrent() || snapshot.metadata?.hasPendingWrites) return;
    const entry = Array.isArray(snapshot.docs) ? snapshot.docs[0] : null;
    const data = entry ? entry.data() : {};
    if (data?.mapId && data.mapId !== state.mapId) return;
    state.exploration = createExplorationGrid(data);
    state.explorationSavedCells = state.exploration.cells;
    scheduleVision();
  }

  function connect() {
    if (!state.roomCode || !state.userId || !state.mapId) return false;
    const scope = `${state.roomCode}/${state.mapId}/${state.userId}`;
    listeners.connect("vision-walls", scope, ({ fail, isCurrent }) => onSnapshot(
      query(wallCollection(), where("mapId", "==", state.mapId)),
      { includeMetadataChanges: true },
      (snapshot) => applyWallsSnapshot(snapshot, isCurrent),
      (error) => {
        if (!isCurrent()) return;
        fail(error);
        setStatus(`Wall sync failed: ${error.message}`, "error");
      }
    ));
    listeners.connect("vision-exploration", scope, ({ fail, isCurrent }) => onSnapshot(
      query(
        collection(db, "rooms", state.roomCode, "visionExploration"),
        where("ownerUid", "==", state.userId),
        where("mapId", "==", state.mapId)
      ),
      { includeMetadataChanges: true },
      (snapshot) => applyExplorationSnapshot(snapshot, isCurrent),
      (error) => {
        if (!isCurrent()) return;
        fail(error);
        setStatus(`Exploration sync failed: ${error.message}`, "error");
      }
    ));
    return true;
  }

  function syncContext() {
    const context = getMapContext() || {};
    const mapId = String(context.mapId || "").trim();
    const target = context.target || null;
    const changed = mapId !== state.mapId || target !== state.target;
    if (changed) {
      void persistExplorationNow();
      listeners.stopAll();
      state.walls.clear();
      state.currentPolygons = [];
      state.exploration = createExplorationGrid();
      state.explorationSavedCells = state.exploration.cells;
      tokenSignature = "";
      setActive(false);
    }
    state.mapId = mapId;
    state.target = target;
    state.mode = context.mode === "puzzle" ? "puzzle" : "single";
    state.zoom = Number(context.zoom) || 1;
    state.space = context.space || null;
    state.sceneId = String(context.sceneId || "");
    state.floorId = String(context.floorId || "");
    state.tileKey = String(context.tileKey || "");
    state.unitsPerFoot = Math.max(0.01, Number(context.unitsPerFoot) || 10);
    if (state.mapId && state.target) connect();
    syncOverlayGeometry();
    updateControls();
    scheduleVision();
    return getState();
  }

  function setContext(next = {}) {
    const previous = `${state.roomCode}/${state.userId}/${state.isDm}`;
    state.roomCode = String(next.roomCode || "");
    state.userId = String(next.userId || "");
    state.isDm = next.isDm === true;
    if (!state.isDm) close();
    if (previous !== `${state.roomCode}/${state.userId}/${state.isDm}`) {
      listeners.stopAll();
      state.exploration = createExplorationGrid();
      state.explorationSavedCells = state.exploration.cells;
      tokenSignature = "";
    }
    return syncContext();
  }

  function updateTokens(tokens = []) {
    const normalized = Array.isArray(tokens) ? tokens : [];
    const signature = normalized
      .filter((token) => tokenMatchesContext(token, state))
      .map((token) => {
        const vision = normalizeTokenVision(token);
        return [token.id, token.x, token.y, token.ownerUid, token.type, token.sceneId, token.floorId,
          vision.distance, vision.darkvision, vision.brightLight, vision.dimLight].join(":");
      })
      .sort()
      .join("|");
    state.tokens = normalized;
    if (signature === tokenSignature) return false;
    tokenSignature = signature;
    scheduleVision();
    return true;
  }

  function pointFromEvent(event) {
    return clientPointToDrawingSpace(
      overlay.getBoundingClientRect(),
      event.clientX,
      event.clientY,
      state.space
    );
  }

  function startWall(event) {
    if (!state.active || !state.isDm || event.isPrimary === false || (event.button ?? 0) !== 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const point = pointFromEvent(event);
    overlay.setPointerCapture?.(event.pointerId);
    state.pointerId = event.pointerId;
    state.drawing = normalizeVisionWall({
      id: makeId("vision-wall"),
      roomCode: state.roomCode,
      mapId: state.mapId,
      authorUid: state.userId,
      start: point,
      end: point,
      createdAtMillis: Date.now(),
      updatedAtMillis: Date.now()
    }, state);
    renderWalls();
  }

  function moveWall(event) {
    if (!state.drawing || event.pointerId !== state.pointerId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    state.drawing = normalizeVisionWall({ ...state.drawing, end: pointFromEvent(event) }, state);
    renderWalls();
  }

  async function finishWall(event) {
    if (!state.drawing || event.pointerId !== state.pointerId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const wall = normalizeVisionWall({
      ...state.drawing,
      end: pointFromEvent(event),
      updatedAtMillis: Date.now()
    }, state);
    try { overlay.releasePointerCapture?.(event.pointerId); } catch {}
    state.drawing = null;
    state.pointerId = null;
    if (!wallHasLength(wall)) {
      renderWalls();
      return;
    }
    state.walls.set(wall.id, wall);
    updateControls();
    scheduleVision();
    try {
      await setDoc(wallReference(wall.id), wallPayload(wall));
      setStatus("Sight-blocking wall saved.", "saved");
    } catch (error) {
      state.walls.delete(wall.id);
      updateControls();
      scheduleVision();
      setStatus(`Wall save failed: ${error.message}`, "error");
    }
  }

  async function clearWalls() {
    if (!state.isDm || !state.mapId || !state.walls.size) return false;
    const confirmed = await requestConfirmation(
      "Clear every sight-blocking wall on this map?",
      { title: "Clear vision walls", confirmLabel: "Clear Walls" }
    );
    if (!confirmed) return false;
    const snapshot = await getDocs(query(wallCollection(), where("mapId", "==", state.mapId)));
    for (let offset = 0; offset < snapshot.docs.length; offset += 400) {
      const batch = writeBatch(db);
      snapshot.docs.slice(offset, offset + 400).forEach((entry) => batch.delete(entry.ref));
      await batch.commit();
    }
    state.walls.clear();
    updateControls();
    scheduleVision();
    setStatus("Vision walls cleared for this map.", "saved");
    return true;
  }

  function disconnect({ clear = true } = {}) {
    void persistExplorationNow();
    listeners.stopAll();
    close();
    if (clear) {
      state.mapId = "";
      state.target = null;
      state.walls.clear();
      state.currentPolygons = [];
      state.exploration = createExplorationGrid();
      state.explorationSavedCells = state.exploration.cells;
    }
    applyFogVision();
    updateControls();
  }

  function getState() {
    return {
      roomCode: state.roomCode,
      userId: state.userId,
      mapId: state.mapId,
      isDm: state.isDm,
      active: state.active,
      wallCount: state.walls.size,
      visionTokenCount: relevantTokens().length,
      currentPolygonCount: state.currentPolygons.length,
      exploredCellCount: [...state.exploration.cells].filter((cell) => cell === "1").length,
      explorationResolution: state.exploration.resolution,
      saveStatus: state.saveStatus,
      listeners: listeners.getSnapshot()
    };
  }

  toggleButton.addEventListener("click", () => {
    if (toolbar.hidden) open();
    else close();
  });
  toolbar.querySelector("[data-vision-close]").addEventListener("click", close);
  controls.wallMode.addEventListener("click", () => setActive(!state.active));
  controls.clearWalls.addEventListener("click", () => void clearWalls());
  controls.showWalls.addEventListener("change", () => {
    state.showWalls = controls.showWalls.checked;
    renderWalls();
  });
  overlay.addEventListener("pointerdown", startWall, true);
  overlay.addEventListener("pointermove", moveWall, true);
  overlay.addEventListener("pointerup", (event) => void finishWall(event), true);
  overlay.addEventListener("pointercancel", () => {
    state.drawing = null;
    state.pointerId = null;
    renderWalls();
  }, true);

  if (globalThis.ResizeObserver && surface) {
    resizeObserver = new ResizeObserver(syncOverlayGeometry);
    resizeObserver.observe(surface);
    if (mapViewer) resizeObserver.observe(mapViewer);
    if (mapImage) resizeObserver.observe(mapImage);
    if (puzzleBoard && puzzleBoard !== mapViewer) resizeObserver.observe(puzzleBoard);
  }

  updateControls();
  return Object.freeze({
    root: toolbar,
    overlay,
    open,
    close,
    setActive,
    setContext,
    syncContext,
    updateTokens,
    persistExplorationNow,
    clearWalls,
    getState,
    disconnect,
    destroy() {
      disconnect();
      if (saveTimer) globalThis.clearTimeout(saveTimer);
      const cancelFrame = globalThis.cancelAnimationFrame || globalThis.clearTimeout;
      if (renderFrame) cancelFrame(renderFrame);
      resizeObserver?.disconnect();
      toolbar.remove();
      overlay.remove();
      toggleButton.remove();
    }
  });
}
