import {
  createLegacyFloor,
  createStableMapScopeId,
  getConnectionsForFloor,
  normalizeFloor,
  resolveConnectionDestination,
  sortFloors,
  validateFloorElevation
} from "./sceneModel.js";
import {
  DEFAULT_CONNECTION_INTERACTION_FEET,
  validateFloorConnectionUse
} from "./floorConnectionMarkers.js";
import { createFloorConnectionEditor } from "./floorConnectionEditor.js";

const cleanText = (value) => String(value ?? "").trim();

function floorLabel(floor) {
  const elevation = floor.baseElevation;
  return `${floor.name} — ${elevation > 0 ? "+" : ""}${elevation} ft`;
}

function readMapRecord(value = {}) {
  const data = typeof value?.data === "function" ? value.data() : value;
  return {
    id: cleanText(value?.id ?? data?.id) || null,
    name: cleanText(data?.name) || "Saved Map",
    url: cleanText(data?.url),
    publicId: cleanText(data?.publicId) || null,
    savedToLibrary: true,
    timeVariants: data?.timeVariants && typeof data.timeVariants === "object"
      ? { ...data.timeVariants }
      : {}
  };
}

export function createFloorSystem({
  root,
  persistence,
  storage = globalThis.localStorage,
  requestConfirmation = async (message) => globalThis.confirm(message),
  getCurrentMap = () => null,
  getSavedMaps = () => [],
  getGridSettings = () => ({}),
  getLightingSettings = () => ({}),
  getTokens = () => [],
  getSelectedToken = () => null,
  canControlToken = () => false,
  getInitiativeState = () => ({}),
  getConnectionDistanceFeet = () => Infinity,
  getPlacementSurface = () => null,
  onPlacementModeChange = () => {},
  onViewChanged = () => {},
  onBroadcast = async () => {},
  onUseConnection = async () => {},
  onDmTransfer = async () => {},
  onAdoptLegacyTokens = async () => {}
} = {}) {
  if (!root || !persistence) {
    throw new Error("The floor system requires a root element and persistence adapter.");
  }

  const elements = {
    location: root.querySelector("[data-floor-location]"),
    jump: root.querySelector("[data-floor-jump]"),
    active: root.querySelector("[data-floor-active]"),
    list: root.querySelector("[data-floor-list]"),
    connections: root.querySelector("[data-floor-connections]"),
    follow: root.querySelector("[data-floor-follow]"),
    dmControls: root.querySelector("[data-floor-dm-controls]"),
    status: root.querySelector("[data-floor-status]"),
    manageToggle: root.querySelector("[data-floor-manage-toggle]"),
    drawer: root.querySelector("[data-floor-drawer]")
  };
  let roomCode = "";
  let userId = "";
  let isDm = false;
  let roomSnapshot = {};
  let scenes = [];
  let floors = [];
  let connections = [];
  let dmFloorNotes = new Map();
  let viewSceneId = "";
  let viewFloorId = "";
  let followDm = true;
  let stopScenes = null;
  let stopFloors = null;
  let stopConnections = null;
  let stopDmFloorNotes = null;
  let generation = 0;
  let busy = false;
  let drawerOpen = false;
  let cancelActivePlacement = null;
  const subscribers = new Set();

  async function placeConnectionEndpoint({ floorId } = {}) {
    const placementRoomCode = roomCode;
    const placementSceneId = viewSceneId;
    const placementGeneration = generation;
    if (!isDm) throw new Error("Only the room DM can place floor connections.");
    if (!floors.some((floor) => floor.id === floorId)) throw new Error("Choose a valid floor before placing the marker.");
    if (floorId !== viewFloorId) {
      await selectFloor(floorId, { reason: "connection-placement", broadcast: false });
    }
    const surface = getPlacementSurface();
    if (!surface) throw new Error("The current map is not ready for marker placement.");
    setDrawerOpen(false, { focus: false });
    onPlacementModeChange(true);
    return new Promise((resolve) => {
      let settled = false;
      const cleanup = (point = null) => {
        if (settled) return;
        settled = true;
        surface.removeEventListener("pointerdown", onPointerDown, true);
        document.removeEventListener("keydown", onKeyDown, true);
        cancelActivePlacement = null;
        onPlacementModeChange(false);
        resolve(point);
      };
      const onPointerDown = (event) => {
        if (
          roomCode !== placementRoomCode ||
          viewSceneId !== placementSceneId ||
          generation !== placementGeneration ||
          viewFloorId !== floorId
        ) {
          cleanup(null);
          return;
        }
        const rect = surface.getBoundingClientRect();
        if (!rect.width || !rect.height) {
          cleanup(null);
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        cleanup({
          x: Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100)),
          y: Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100))
        });
      };
      const onKeyDown = (event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        cleanup(null);
      };
      cancelActivePlacement = () => cleanup(null);
      surface.addEventListener("pointerdown", onPointerDown, true);
      document.addEventListener("keydown", onKeyDown, true);
    });
  }

  const connectionEditor = createFloorConnectionEditor({
    mount: document.body,
    placeEndpoint: placeConnectionEndpoint
  });

  const storageKey = () => `homebrewGodFloorView:${userId}:${roomCode}`;

  function setStatus(message, tone = "") {
    if (!elements.status) return;
    elements.status.textContent = message || "";
    elements.status.dataset.tone = tone;
  }

  function readPreference() {
    if (!roomCode || !userId || !storage) return null;
    try {
      const value = JSON.parse(storage.getItem(storageKey()) || "null");
      return value && typeof value === "object" ? value : null;
    } catch {
      return null;
    }
  }

  function savePreference() {
    if (!roomCode || !userId || !storage) return;
    try {
      storage.setItem(storageKey(), JSON.stringify({
        followDm,
        sceneId: viewSceneId,
        floorId: viewFloorId
      }));
    } catch {
      // A blocked storage area must not prevent map use.
    }
  }

  function setDrawerOpen(open, { focus = true } = {}) {
    drawerOpen = open === true;
    if (drawerOpen) {
      root.parentElement?.querySelectorAll(".battleToolbarMenu[open]").forEach((menu) => {
        menu.open = false;
      });
    }
    root.classList.toggle("is-managing", drawerOpen);
    elements.manageToggle?.setAttribute("aria-expanded", String(drawerOpen));
    elements.drawer?.setAttribute("aria-hidden", String(!drawerOpen));
    if (focus) {
      if (drawerOpen) elements.drawer?.querySelector("[data-floor-manage-close]")?.focus();
      else elements.manageToggle?.focus();
    }
  }

  function getActiveScene() {
    return scenes.find((scene) => scene.id === viewSceneId) || null;
  }

  function getActiveFloor() {
    return floors.find((floor) => floor.id === viewFloorId) || null;
  }

  function getState() {
    const scene = getActiveScene();
    const floor = getActiveFloor();
    return Object.freeze({
      roomCode,
      isDm,
      followDm,
      scenes: [...scenes],
      floors: [...floors],
      connections: [...connections],
      scene,
      floor,
      sceneId: scene?.id || "",
      floorId: floor?.id || "",
      mapScopeId: createStableMapScopeId(scene?.id, floor?.id),
      active: Boolean(scene && floor)
    });
  }

  function notifyView(reason) {
    savePreference();
    onViewChanged(getState(), reason);
  }

  function stopSceneChildren() {
    stopFloors?.();
    stopConnections?.();
    stopDmFloorNotes?.();
    stopFloors = null;
    stopConnections = null;
    stopDmFloorNotes = null;
    floors = [];
    connections = [];
    dmFloorNotes = new Map();
  }

  function startSceneChildren(sceneId) {
    stopSceneChildren();
    if (!roomCode || !sceneId) {
      viewFloorId = "";
      render();
      notifyView("legacy-map");
      return;
    }
    const expected = generation;
    stopFloors = persistence.listenFloors(roomCode, sceneId, (records) => {
      if (expected !== generation || sceneId !== viewSceneId) return;
      floors = sortFloors(records);
      const requested = followDm
        ? cleanText(roomSnapshot.activeFloorId)
        : cleanText(readPreference()?.floorId);
      if (!floors.some((floor) => floor.id === viewFloorId)) {
        viewFloorId = floors.some((floor) => floor.id === requested)
          ? requested
          : floors[0]?.id || "";
      }
      render();
      notifyView("floors-snapshot");
      if (
        isDm &&
        viewFloorId &&
        (
          cleanText(roomSnapshot.activeSceneId) !== sceneId ||
          cleanText(roomSnapshot.activeFloorId) !== viewFloorId
        )
      ) {
        void onBroadcast({ sceneId, floorId: viewFloorId });
      }
    }, (error) => setStatus(error?.message || "Could not load floors.", "error"));
    stopConnections = persistence.listenConnections(roomCode, sceneId, (records) => {
      if (expected !== generation || sceneId !== viewSceneId) return;
      connections = records;
      render();
    }, (error) => setStatus(error?.message || "Could not load floor connections.", "error"));
    if (isDm && typeof persistence.listenDmFloorNotes === "function") {
      stopDmFloorNotes = persistence.listenDmFloorNotes(roomCode, sceneId, (records) => {
        if (expected !== generation || sceneId !== viewSceneId) return;
        dmFloorNotes = new Map(records.map((entry) => [entry.id, String(entry.notes || "")]));
      }, (error) => setStatus(error?.message || "Could not load private floor notes.", "error"));
    }
  }

  function selectScene(sceneId, { reason = "scene-selected", broadcast = isDm } = {}) {
    const cleanId = cleanText(sceneId);
    if (cleanId === viewSceneId && floors.length) return;
    viewSceneId = cleanId;
    viewFloorId = "";
    startSceneChildren(cleanId);
    render();
    if (broadcast && cleanId) {
      const firstFloorId = floors[0]?.id || "";
      void onBroadcast({ sceneId: cleanId, floorId: firstFloorId });
    }
    notifyView(reason);
  }

  async function selectFloor(floorId, { reason = "floor-selected", broadcast = isDm } = {}) {
    const floor = floors.find((entry) => entry.id === floorId);
    if (!floor) return false;
    viewFloorId = floor.id;
    render();
    notifyView(reason);
    if (broadcast) {
      await onBroadcast({ sceneId: viewSceneId, floorId: viewFloorId });
      setStatus(`Party view moved to ${floor.name}.`, "success");
    }
    return true;
  }

  function renderLocationOptions() {
    if (!elements.location) return;
    const prior = viewSceneId;
    elements.location.replaceChildren();
    const legacy = document.createElement("option");
    legacy.value = "";
    legacy.textContent = scenes.length ? "Legacy single map" : "No multi-floor location";
    elements.location.appendChild(legacy);
    scenes.forEach((scene) => {
      const option = document.createElement("option");
      option.value = scene.id;
      option.textContent = scene.name;
      elements.location.appendChild(option);
    });
    elements.location.value = scenes.some((scene) => scene.id === prior) ? prior : "";
    elements.location.disabled = !isDm && followDm;
  }

  function renderJumpOptions() {
    if (!elements.jump) return;
    elements.jump.replaceChildren();
    if (!floors.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = viewSceneId ? "No floors" : "Legacy single map";
      elements.jump.appendChild(option);
      elements.jump.disabled = true;
      return;
    }
    floors.forEach((floor) => {
      const option = document.createElement("option");
      option.value = floor.id;
      option.textContent = floorLabel(floor);
      elements.jump.appendChild(option);
    });
    elements.jump.value = floors.some((floor) => floor.id === viewFloorId)
      ? viewFloorId
      : floors[0]?.id || "";
    elements.jump.disabled = !isDm && followDm;
  }

  function appendFloorAction(container, label, action, floorId, title = "") {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.dataset.floorAction = action;
    button.dataset.floorId = floorId;
    if (title) button.title = title;
    container.appendChild(button);
  }

  function renderFloors() {
    elements.list?.replaceChildren();
    if (!elements.list) return;
    if (!viewSceneId) {
      const empty = document.createElement("p");
      empty.className = "hg-floor-empty";
      empty.textContent = isDm
        ? "Create a location to connect several maps as floors."
        : "This room is using its legacy single map.";
      elements.list.appendChild(empty);
      return;
    }
    if (!floors.length) {
      const empty = document.createElement("p");
      empty.className = "hg-floor-empty";
      empty.textContent = isDm ? "Add the first floor." : "This location has no floors yet.";
      elements.list.appendChild(empty);
      return;
    }
    floors.forEach((floor) => {
      const row = document.createElement("div");
      row.className = "hg-floor-row";
      row.classList.toggle("is-active", floor.id === viewFloorId);
      const choose = document.createElement("button");
      choose.type = "button";
      choose.className = "hg-floor-choice";
      choose.dataset.floorAction = "select";
      choose.dataset.floorId = floor.id;
      choose.textContent = floorLabel(floor);
      choose.disabled = !isDm && followDm;
      row.appendChild(choose);
      if (isDm) {
        const menu = document.createElement("details");
        menu.className = "hg-floor-row-menu";
        const summary = document.createElement("summary");
        summary.textContent = "•••";
        summary.title = `Options for ${floor.name}`;
        summary.setAttribute("aria-label", summary.title);
        const actions = document.createElement("span");
        actions.className = "hg-floor-row-actions";
        appendFloorAction(actions, "Select floor", "select", floor.id);
        appendFloorAction(actions, "Edit", "edit", floor.id);
        appendFloorAction(actions, "Duplicate", "duplicate", floor.id);
        appendFloorAction(actions, "Move token here", "move-token", floor.id, "Move the selected token here without using a connection");
        appendFloorAction(actions, "Move up", "up", floor.id, "Move earlier within this elevation");
        appendFloorAction(actions, "Move down", "down", floor.id, "Move later within this elevation");
        appendFloorAction(actions, "Delete", "delete", floor.id);
        menu.append(summary, actions);
        row.appendChild(menu);
      }
      elements.list.appendChild(row);
    });
  }

  function renderConnections() {
    elements.connections?.replaceChildren();
    if (!elements.connections || !viewFloorId) return;
    const available = getConnectionsForFloor(connections, viewFloorId);
    if (!available.length) {
      const empty = document.createElement("p");
      empty.className = "hg-floor-empty";
      empty.textContent = "No stairs, ladders, or portals connect from this floor.";
      elements.connections.appendChild(empty);
      return;
    }
    available.forEach((connection) => {
      const route = resolveConnectionDestination(connection, viewFloorId);
      const destination = floors.find((floor) => floor.id === route?.to.floorId);
      const row = document.createElement("div");
      row.className = "hg-floor-connection";
      const label = document.createElement("span");
      label.textContent = `${connection.name} → ${destination?.name || "Missing floor"}${connection.movementCost ? ` · ${connection.movementCost} ft` : ""}`;
      if (connection.enabled === false) label.textContent += " · Disabled";
      if (connection.hidden === true && isDm) label.textContent += " · Marker hidden";
      const use = document.createElement("button");
      use.type = "button";
      use.textContent = "Use with selected token";
      use.dataset.floorAction = "use-connection";
      use.dataset.connectionId = connection.id;
      use.disabled = !destination || connection.enabled === false || (!isDm && !connection.allowPlayers);
      row.append(label, use);
      if (isDm) {
        const edit = document.createElement("button");
        edit.type = "button";
        edit.textContent = "Edit";
        edit.dataset.floorAction = "edit-connection";
        edit.dataset.connectionId = connection.id;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "Delete";
        remove.dataset.floorAction = "delete-connection";
        remove.dataset.connectionId = connection.id;
        const visibility = document.createElement("button");
        visibility.type = "button";
        visibility.textContent = connection.hidden === true ? "Show marker" : "Hide marker";
        visibility.dataset.floorAction = "toggle-connection-marker";
        visibility.dataset.connectionId = connection.id;
        row.append(edit, visibility, remove);
      }
      elements.connections.appendChild(row);
    });
  }

  function render() {
    root.classList.toggle("hidden", !roomCode);
    root.dataset.hasScene = String(Boolean(viewSceneId));
    root.dataset.isDm = String(isDm);
    elements.dmControls?.classList.toggle("hidden", !isDm);
    if (elements.follow) {
      elements.follow.checked = isDm || followDm;
      elements.follow.disabled = isDm;
    }
    renderLocationOptions();
    renderJumpOptions();
    renderFloors();
    renderConnections();
    const floor = getActiveFloor();
    if (elements.active) {
      elements.active.textContent = floor
        ? floorLabel(floor)
        : "Legacy single map";
    }
    const activeIndex = floors.findIndex((entry) => entry.id === viewFloorId);
    const previous = root.querySelector('[data-floor-action="previous-floor"]');
    const next = root.querySelector('[data-floor-action="next-floor"]');
    if (previous) previous.disabled = activeIndex <= 0 || (!isDm && followDm);
    if (next) next.disabled = activeIndex < 0 || activeIndex >= floors.length - 1 || (!isDm && followDm);
    const state = getState();
    subscribers.forEach((subscriber) => subscriber(state));
  }

  function chooseMap() {
    const current = getCurrentMap();
    const maps = getSavedMaps().map(readMapRecord).filter((entry) => entry.url);
    const choices = [
      { id: "current", label: current?.url ? `Current: ${current.name || "Battle Map"}` : "Current: no map", map: current?.url ? { ...current } : {} },
      ...maps.map((map, index) => ({ id: String(index + 1), label: `${index + 1}: ${map.name}`, map })),
      { id: "none", label: "none: Configure the map later", map: {} }
    ];
    const answer = globalThis.prompt(
      `Choose a map for this floor:\n${choices.map((entry) => entry.label).join("\n")}`,
      current?.url ? "current" : (maps.length ? "1" : "none")
    );
    if (answer === null) return null;
    return choices.find((entry) => entry.id === cleanText(answer).toLowerCase())?.map || {};
  }

  async function createLocation() {
    const name = cleanText(globalThis.prompt("Location name", "New Location"));
    if (!name) return;
    const scene = await persistence.createScene(roomCode, { name });
    const map = getCurrentMap();
    const floor = await persistence.createFloor(roomCode, scene.id, {
      ...createLegacyFloor({
      sceneId: scene.id,
      roomCode,
      currentMap: map
      }),
      grid: getGridSettings(),
      lighting: getLightingSettings()
    });
    viewSceneId = scene.id;
    viewFloorId = floor.id;
    startSceneChildren(scene.id);
    await onBroadcast({ sceneId: scene.id, floorId: floor.id });
    const legacyTokens = getTokens().filter((token) => !token.sceneId && !token.floorId);
    if (legacyTokens.length && await requestConfirmation(
      `Assign ${legacyTokens.length} current-map token${legacyTokens.length === 1 ? "" : "s"} to Ground Floor?`,
      { title: "Keep current tokens", confirmLabel: "Assign tokens" }
    )) {
      await onAdoptLegacyTokens({ scene, floor, tokens: legacyTokens });
    }
    setStatus(`${scene.name} created.`, "success");
  }

  async function addFloor() {
    if (!viewSceneId) return;
    const name = cleanText(globalThis.prompt("Floor name", `Floor ${floors.length + 1}`));
    if (!name) return;
    const elevationAnswer = globalThis.prompt("Base elevation in feet", String((floors[0]?.baseElevation || 0) + 10));
    if (elevationAnswer === null) return;
    const baseElevation = validateFloorElevation(elevationAnswer);
    const map = chooseMap();
    if (map === null) return;
    const floor = await persistence.createFloor(roomCode, viewSceneId, {
      name,
      baseElevation,
      order: floors.length,
      map,
      grid: getGridSettings(),
      lighting: getLightingSettings()
    });
    setStatus(`${floor.name} added.`, "success");
  }

  async function editFloor(floor) {
    const name = cleanText(globalThis.prompt("Floor name", floor.name));
    if (!name) return;
    const elevationAnswer = globalThis.prompt("Base elevation in feet", String(floor.baseElevation));
    if (elevationAnswer === null) return;
    const baseElevation = validateFloorElevation(elevationAnswer);
    const feetPerSquare = Math.max(1, Number(globalThis.prompt(
      "Feet per square",
      String(floor.grid?.feetPerSquare || getGridSettings().feetPerSquare || 5)
    )) || 5);
    const pixelsPerSquare = Math.max(1, Number(globalThis.prompt(
      "Grid size in pixels",
      String(floor.grid?.pixelsPerSquare || getGridSettings().pixelsPerSquare || 64)
    )) || 64);
    const changeMap = globalThis.confirm("Change this floor's map too?");
    const map = changeMap ? chooseMap() : floor.map;
    if (map === null) return;
    await persistence.saveFloor(roomCode, viewSceneId, floor.id, {
      ...floor,
      name,
      baseElevation,
      grid: { ...floor.grid, feetPerSquare, pixelsPerSquare },
      map
    });
    if (typeof persistence.saveFloorDmNotes === "function") {
      const notes = globalThis.prompt(
        "Private DM notes for this floor (players cannot read these)",
        dmFloorNotes.get(floor.id) || ""
      );
      if (notes !== null) {
        await persistence.saveFloorDmNotes(roomCode, viewSceneId, floor.id, notes);
      }
    }
    setStatus(`${name} updated.`, "success");
  }

  async function deleteFloor(floor) {
    const dependent = getTokens().filter((token) => token.sceneId === viewSceneId && token.floorId === floor.id);
    if (dependent.length) {
      throw new Error(`Move ${dependent.length} token${dependent.length === 1 ? "" : "s"} off ${floor.name} before deleting it.`);
    }
    if (!await requestConfirmation(
      `Delete ${floor.name}? Its floor-specific connections will also be removed. The saved map image is not deleted.`,
      { title: "Delete floor", confirmLabel: "Delete" }
    )) return;
    await persistence.deleteFloor(roomCode, viewSceneId, floor.id);
    setStatus(`${floor.name} deleted.`, "success");
  }

  async function deleteLocation() {
    const scene = getActiveScene();
    if (!scene) return;
    const dependent = getTokens().filter((token) => token.sceneId === scene.id);
    if (dependent.length) {
      throw new Error(`Move ${dependent.length} token${dependent.length === 1 ? "" : "s"} out of ${scene.name} before deleting it.`);
    }
    if (!await requestConfirmation(
      `Delete ${scene.name} and all of its floor definitions and connections? Saved map images remain in the map library.`,
      { title: "Delete location", confirmLabel: "Delete" }
    )) return;
    await persistence.deleteScene(roomCode, scene.id);
    await onBroadcast({ sceneId: "", floorId: "" });
    viewSceneId = "";
    viewFloorId = "";
    stopSceneChildren();
    render();
    notifyView("location-deleted");
  }

  async function addConnection() {
    const source = getActiveFloor();
    if (!source || floors.length < 2) {
      throw new Error("Add at least two floors before creating a connection.");
    }
    const editRoomCode = roomCode;
    const editSceneId = viewSceneId;
    const editGeneration = generation;
    const destination = floors.find((floor) => floor.id !== source.id);
    const draft = await connectionEditor.open({
      mode: "create",
      floors,
      sourceFloorId: source.id,
      destinationFloorId: destination?.id || "",
      connection: {
        name: "Stairs",
        type: "stairs",
        source: { floorId: source.id, x: 50, y: 50 },
        destination: { floorId: destination?.id || "", x: 50, y: 50 },
        bidirectional: true,
        allowPlayers: true,
        enabled: true,
        hidden: false,
        movementCost: 0
      }
    });
    if (!draft) {
      setStatus("Connection creation canceled. No changes were saved.");
      return false;
    }
    if (roomCode !== editRoomCode || viewSceneId !== editSceneId || generation !== editGeneration || !isDm) {
      throw new Error("The room or account changed while the connection was being edited. Nothing was saved.");
    }
    await persistence.createConnection(roomCode, viewSceneId, draft);
    const savedDestination = floors.find((floor) => floor.id === draft.destination.floorId);
    setStatus(`${draft.name} connected to ${savedDestination?.name || "the destination floor"}.`, "success");
    return true;
  }

  async function editConnection(connection) {
    if (!connection || typeof persistence.saveConnection !== "function") return;
    const editRoomCode = roomCode;
    const editSceneId = viewSceneId;
    const editGeneration = generation;
    const draft = await connectionEditor.open({ mode: "edit", floors, connection });
    if (!draft) {
      setStatus("Connection edit canceled. Existing values were kept.");
      return false;
    }
    if (roomCode !== editRoomCode || viewSceneId !== editSceneId || generation !== editGeneration || !isDm) {
      throw new Error("The room or account changed while the connection was being edited. Nothing was saved.");
    }
    const latest = connections.find((entry) => entry.id === connection.id);
    if (!latest) throw new Error("That floor connection was deleted while it was being edited.");
    await persistence.saveConnection(roomCode, viewSceneId, connection.id, {
      ...latest,
      ...draft,
      source: { ...latest.source, ...draft.source },
      destination: { ...latest.destination, ...draft.destination }
    });
    setStatus(`${draft.name} updated.`, "success");
    return true;
  }

  async function runAction(action) {
    if (busy) return;
    busy = true;
    root.setAttribute("aria-busy", "true");
    try {
      await action();
    } catch (error) {
      console.error(error);
      setStatus(error?.message || "The floor operation failed.", "error");
    } finally {
      busy = false;
      root.removeAttribute("aria-busy");
    }
  }

  async function useConnection(connectionOrId, { token = getSelectedToken(), confirm = true } = {}) {
    const operationRoomCode = roomCode;
    const operationUserId = userId;
    const operationGeneration = generation;
    const connectionId = cleanText(typeof connectionOrId === "string" ? connectionOrId : connectionOrId?.id);
    const connection = connections.find((entry) => entry.id === connectionId);
    if (!connection) throw new Error("That floor connection is unavailable.");
    const tokenId = cleanText(token?.id);
    token = getTokens().find((entry) => cleanText(entry.id) === tokenId);
    if (!token) throw new Error("The selected token no longer exists.");
    const route = resolveConnectionDestination(connection, token.floorId || viewFloorId);
    const destination = floors.find((entry) => entry.id === route?.to.floorId);
    if (!destination) throw new Error("The destination floor is unavailable.");
    const distanceFeet = getConnectionDistanceFeet({
      token,
      connection,
      route,
      scene: getActiveScene(),
      floor: getActiveFloor()
    });
    const validation = validateFloorConnectionUse({
      connection,
      token,
      sceneId: viewSceneId,
      floorId: viewFloorId,
      isDm,
      canControl: canControlToken(token),
      combatActive: getInitiativeState()?.combatActive === true,
      distanceFeet,
      interactionDistanceFeet: DEFAULT_CONNECTION_INTERACTION_FEET
    });
    if (!validation.ok) throw new Error(validation.reason);
    if (confirm && !await requestConfirmation(
      `Move ${token.name || "the selected token"} through ${connection.name} to ${destination.name}?`,
      { title: `Travel to ${destination.name}?`, confirmLabel: "Travel" }
    )) return false;
    if (
      roomCode !== operationRoomCode ||
      userId !== operationUserId ||
      generation !== operationGeneration
    ) {
      throw new Error("The room or account changed. Reopen the connection and try again.");
    }
    if (confirm) return useConnection(connection.id, { token: { id: token.id }, confirm: false });
    await onUseConnection({ token, scene: getActiveScene(), floor: destination, connection });
    if (
      roomCode !== operationRoomCode ||
      userId !== operationUserId ||
      generation !== operationGeneration
    ) {
      return true;
    }
    await selectFloor(destination.id, { broadcast: false, reason: "connection-used" });
    setStatus(`${token.name || "Token"} traveled to ${destination.name}.`, "success");
    return true;
  }

  root.addEventListener("change", (event) => {
    if (event.target === elements.location) {
      selectScene(elements.location.value, { broadcast: isDm });
    } else if (event.target === elements.jump) {
      void runAction(() => selectFloor(elements.jump.value));
    } else if (event.target === elements.follow) {
      followDm = elements.follow.checked;
      if (followDm) {
        const sceneId = cleanText(roomSnapshot.activeSceneId);
        if (sceneId !== viewSceneId) selectScene(sceneId, { broadcast: false, reason: "follow-dm" });
        else void selectFloor(cleanText(roomSnapshot.activeFloorId), { broadcast: false, reason: "follow-dm" });
      }
      render();
      savePreference();
    }
  });

  root.addEventListener("click", (event) => {
    if (event.target.closest("[data-floor-manage-toggle]")) {
      setDrawerOpen(!drawerOpen);
      return;
    }
    if (event.target.closest("[data-floor-manage-close]")) {
      setDrawerOpen(false);
      return;
    }
    const button = event.target.closest("[data-floor-action]");
    if (!button || !root.contains(button)) return;
    const action = button.dataset.floorAction;
    const floor = floors.find((entry) => entry.id === button.dataset.floorId);
    const connection = connections.find((entry) => entry.id === button.dataset.connectionId);
    if (action === "previous-floor" || action === "next-floor") {
      const currentIndex = floors.findIndex((entry) => entry.id === viewFloorId);
      const offset = action === "previous-floor" ? -1 : 1;
      const destination = floors[currentIndex + offset];
      if (destination) void runAction(() => selectFloor(destination.id));
      return;
    }
    if (action === "select") return void runAction(() => selectFloor(floor.id));
    if (action === "create-location" && isDm) return void runAction(createLocation);
    if (action === "rename-location" && isDm) return void runAction(async () => {
      const scene = getActiveScene();
      if (!scene) return;
      const name = cleanText(globalThis.prompt("Location name", scene.name));
      if (name) await persistence.saveScene(roomCode, scene.id, { ...scene, name });
    });
    if (action === "delete-location" && isDm) return void runAction(deleteLocation);
    if (action === "add-floor" && isDm) return void runAction(addFloor);
    if (action === "add-connection" && isDm) return void runAction(addConnection);
    if (action === "broadcast" && isDm) return void runAction(async () => {
      await onBroadcast({ sceneId: viewSceneId, floorId: viewFloorId });
      setStatus("Current floor broadcast to the party.", "success");
    });
    if (!floor && !connection) return;
    if (action === "edit" && isDm) return void runAction(() => editFloor(floor));
    if (action === "duplicate" && isDm) return void runAction(async () => {
      await persistence.duplicateFloor(roomCode, viewSceneId, floor);
      setStatus(`${floor.name} duplicated.`, "success");
    });
    if ((action === "up" || action === "down") && isDm) return void runAction(() => (
      persistence.saveFloor(roomCode, viewSceneId, floor.id, {
        ...floor,
        order: floor.order + (action === "up" ? -1 : 1)
      })
    ));
    if (action === "delete" && isDm) return void runAction(() => deleteFloor(floor));
    if (action === "move-token" && isDm) return void runAction(async () => {
      const token = getSelectedToken();
      if (!token) throw new Error("Select a token on the battle map first.");
      await onDmTransfer({ token, scene: getActiveScene(), floor });
      await selectFloor(floor.id, { broadcast: false, reason: "dm-token-transfer" });
    });
    if (action === "use-connection") return void runAction(() => useConnection(connection));
    if (action === "delete-connection" && isDm) return void runAction(async () => {
      if (!await requestConfirmation(`Delete ${connection.name}?`, { title: "Delete connection", confirmLabel: "Delete" })) return;
      await persistence.deleteConnection(roomCode, viewSceneId, connection.id);
    });
    if (action === "edit-connection" && isDm) return void runAction(() => editConnection(connection));
    if (action === "toggle-connection-marker" && isDm) return void runAction(async () => {
      await persistence.saveConnection(roomCode, viewSceneId, connection.id, {
        ...connection,
        hidden: connection.hidden !== true
      });
      setStatus(`${connection.name} marker ${connection.hidden === true ? "shown" : "hidden"}.`, "success");
    });
  });

  function handleKeydown(event) {
    if (event.key !== "Escape" || !drawerOpen) return;
    event.preventDefault();
    event.stopPropagation();
    setDrawerOpen(false);
  }

  document.addEventListener("keydown", handleKeydown, true);

  function setContext(context = {}) {
    const nextRoomCode = cleanText(context.roomCode);
    const roomChanged = nextRoomCode !== roomCode || cleanText(context.userId) !== userId;
    if (isDm && context.isDm !== true) {
      cancelActivePlacement?.();
      connectionEditor.cancel();
    }
    roomSnapshot = context.room || roomSnapshot || {};
    isDm = context.isDm === true;
    if (!roomChanged) {
      applyRoomSnapshot(roomSnapshot);
      render();
      return;
    }
    disconnect();
    roomCode = nextRoomCode;
    userId = cleanText(context.userId);
    isDm = context.isDm === true;
    roomSnapshot = context.room || {};
    const preference = readPreference();
    followDm = isDm || preference?.followDm !== false;
    viewSceneId = followDm
      ? cleanText(roomSnapshot.activeSceneId)
      : cleanText(preference?.sceneId);
    viewFloorId = followDm
      ? cleanText(roomSnapshot.activeFloorId)
      : cleanText(preference?.floorId);
    if (!roomCode) {
      render();
      notifyView("disconnected");
      return;
    }
    const expected = generation;
    stopScenes = persistence.listenScenes(roomCode, (records) => {
      if (expected !== generation) return;
      scenes = records.sort((a, b) => a.name.localeCompare(b.name));
      if (!scenes.some((scene) => scene.id === viewSceneId)) {
        const requested = followDm
          ? cleanText(roomSnapshot.activeSceneId)
          : cleanText(readPreference()?.sceneId);
        viewSceneId = scenes.some((scene) => scene.id === requested) ? requested : "";
      }
      startSceneChildren(viewSceneId);
      render();
    }, (error) => setStatus(error?.message || "Could not load locations.", "error"));
    render();
  }

  function applyRoomSnapshot(room = {}) {
    roomSnapshot = room || {};
    if (!followDm || isDm) return;
    const nextSceneId = cleanText(roomSnapshot.activeSceneId);
    const nextFloorId = cleanText(roomSnapshot.activeFloorId);
    if (nextSceneId !== viewSceneId) {
      selectScene(nextSceneId, { reason: "dm-broadcast", broadcast: false });
    } else if (nextFloorId && nextFloorId !== viewFloorId && floors.some((floor) => floor.id === nextFloorId)) {
      void selectFloor(nextFloorId, { reason: "dm-broadcast", broadcast: false });
    }
  }

  function disconnect() {
    cancelActivePlacement?.();
    connectionEditor.cancel();
    generation += 1;
    stopScenes?.();
    stopScenes = null;
    stopSceneChildren();
    scenes = [];
    connections = [];
    viewSceneId = "";
    viewFloorId = "";
    roomCode = "";
    userId = "";
    isDm = false;
    roomSnapshot = {};
    setDrawerOpen(false, { focus: false });
    render();
    notifyView("disconnected");
  }

  render();
  return Object.freeze({
    setContext,
    applyRoomSnapshot,
    disconnect,
    destroy() {
      document.removeEventListener("keydown", handleKeydown, true);
      disconnect();
      connectionEditor.destroy();
    },
    getState,
    subscribe(subscriber) {
      if (typeof subscriber !== "function") return () => {};
      subscribers.add(subscriber);
      subscriber(getState());
      return () => subscribers.delete(subscriber);
    },
    getFloorLabel(token = {}) {
      if (!token?.floorId) return "";
      const floor = floors.find((entry) => entry.id === token.floorId);
      if (floor) return floor.name;
      const scene = scenes.find((entry) => entry.id === token.sceneId);
      return scene ? `${scene.name} · another floor` : "Another floor";
    },
    selectFloor,
    useConnection,
    editConnection(connectionOrId) {
      if (!isDm) throw new Error("Only the room DM can edit floor connections.");
      const connection = typeof connectionOrId === "string"
        ? connections.find((entry) => entry.id === connectionOrId)
        : connectionOrId;
      if (!connection) throw new Error("That floor connection is unavailable.");
      return runAction(() => editConnection(connection));
    },
    render
  });
}
