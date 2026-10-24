import {
  MAP_OBJECT_ICONS,
  MAP_OBJECT_TYPES,
  findBlockingMapObject,
  findBlockingMapObjectOnPath,
  getDefaultMapObjectState,
  getMapObjectStates,
  mapObjectToVisionWalls,
  mapObjectMatchesContext,
  measureMapObjectDistanceFeet,
  normalizeMapObject,
  validateMapObjectInteraction
} from "./objectModel.js";

const text = (value) => String(value ?? "").trim();
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function typeLabel(type) {
  return String(type || "custom").split("-").map((part) => (
    part ? `${part[0].toUpperCase()}${part.slice(1)}` : ""
  )).join(" ");
}

export function createMapObjectSystem({
  document = globalThis.document,
  surface,
  quickActions,
  store,
  getRoomContext = () => ({}),
  getMapContext = () => ({}),
  getSelectedToken = () => null,
  canControlToken = () => false,
  getMeasurementOptions = () => ({}),
  acquireInteraction = null,
  requestConfirmation = async () => true,
  onStatus = () => {},
  onObjectsChanged = () => {},
  onInteraction = () => {}
} = {}) {
  if (!document || !surface || !store) throw new Error("Map objects require a surface and persistence store.");

  const toggle = document.createElement("button");
  toggle.id = "mapObjectsToggleButton";
  toggle.type = "button";
  toggle.textContent = "Objects";
  toggle.title = "Edit interactive map objects";
  toggle.setAttribute("aria-pressed", "false");
  quickActions?.appendChild(toggle);

  const toolbar = document.createElement("section");
  toolbar.className = "hg-object-toolbar";
  toolbar.hidden = true;
  toolbar.setAttribute("aria-label", "Interactive map object editor");
  toolbar.innerHTML = `
    <header><div><small>Battle map</small><strong>Interactive Objects</strong></div><button type="button" data-object-close aria-label="Close object editor">×</button></header>
    <div class="hg-object-add-row">
      <label>Type <select data-object-add-type>${MAP_OBJECT_TYPES.map((type) => `<option value="${type}">${typeLabel(type)}</option>`).join("")}</select></label>
      <button type="button" data-object-place title="Choose a type, then select its position on the map">Place Object</button>
    </div>
    <p class="hg-object-help">Choose a type, then click the map. Select an object to move or edit it.</p>
    <form class="hg-object-inspector" data-object-inspector hidden>
      <div class="hg-object-fields">
        <label>Name <input name="name" maxlength="120" required></label>
        <label>Type <select name="type">${MAP_OBJECT_TYPES.map((type) => `<option value="${type}">${typeLabel(type)}</option>`).join("")}</select></label>
        <label>State <select name="stateId"></select></label>
        <label>Icon <input name="icon" maxlength="16"></label>
        <label>Width % <input name="width" type="number" min="1" max="100" step="0.25"></label>
        <label>Height % <input name="height" type="number" min="1" max="100" step="0.25"></label>
        <label>Rotation° <input name="rotation" type="number" min="-360" max="360" step="1"></label>
        <label>Interact within ft <input name="interactionDistanceFeet" type="number" min="5" max="120" step="5"></label>
        <label>Current HP <input name="currentHp" type="number" min="0" max="100000" step="1"></label>
        <label>Maximum HP <input name="maximumHp" type="number" min="0" max="100000" step="1"></label>
        <label class="hg-object-wide">Animation ID <input name="animationId" maxlength="180" placeholder="Optional interaction animation"></label>
        <label class="hg-object-wide">Image URL <input name="imageUrl" type="url" maxlength="2000" placeholder="https://…"></label>
        <label class="hg-object-wide">Description <textarea name="description" maxlength="2000" rows="2"></textarea></label>
      </div>
      <div class="hg-object-toggles">
        <label><input name="locked" type="checkbox"> Locked</label>
        <label><input name="allowPlayers" type="checkbox"> Players may interact</label>
        <label><input name="blocksMovement" type="checkbox"> Blocks movement</label>
        <label><input name="blocksVision" type="checkbox"> Blocks vision</label>
        <label><input name="dmOnly" type="checkbox"> DM-only private</label>
      </div>
      <div class="hg-object-actions">
        <button type="submit">Save</button>
        <button type="button" data-object-toggle-state>Toggle State</button>
        <button type="button" data-object-duplicate>Duplicate</button>
        <button type="button" data-object-delete>Delete</button>
      </div>
    </form>
    <p class="status" data-object-status aria-live="polite"></p>
  `;
  surface.appendChild(toolbar);

  const layer = document.createElement("div");
  layer.className = "hg-map-object-layer";
  layer.setAttribute("aria-label", "Interactive map objects");

  const inspector = toolbar.querySelector("[data-object-inspector]");
  const status = toolbar.querySelector("[data-object-status]");
  const addType = toolbar.querySelector("[data-object-add-type]");
  let allObjects = [];
  let selectedId = "";
  let screen = "";
  let editing = false;
  let placingType = "";
  let connectedRoom = "";
  let connectedAsDm = false;
  let mapTarget = null;
  let releaseInteraction = null;
  let drag = null;
  let snapshotReady = false;
  const renderedObjects = new Map();
  const renderMetrics = {
    passes: 0,
    created: 0,
    replaced: 0,
    reused: 0,
    removed: 0
  };

  function roomContext() {
    return getRoomContext() || {};
  }

  function mapContext() {
    return getMapContext() || {};
  }

  function setStatus(message, tone = "") {
    status.textContent = message || "";
    status.dataset.state = tone;
    onStatus(message, tone);
  }

  function currentObjects() {
    const context = mapContext();
    return allObjects.filter((object) => mapObjectMatchesContext(object, context));
  }

  function selectedObject() {
    return allObjects.find((object) => object.id === selectedId) || null;
  }

  function mountLayer() {
    const context = mapContext();
    const target = context.target;
    if (!target) {
      layer.remove();
      mapTarget = null;
      return null;
    }
    if (getComputedStyle(target).position === "static") target.style.position = "relative";
    if (layer.parentElement !== target) target.appendChild(layer);
    if (context.mode === "single") {
      layer.style.transform = `scale(${number(context.zoom, 1)})`;
      layer.style.transformOrigin = "center center";
    } else {
      layer.style.transform = "none";
      layer.style.transformOrigin = "top left";
    }
    mapTarget = target;
    return target;
  }

  function interactionRadius(distanceFeet) {
    const rect = mapTarget?.getBoundingClientRect?.() || { width: 1, height: 1 };
    const measurement = getMeasurementOptions() || {};
    const feetPerSquare = Math.max(1, number(measurement.feetPerSquare, 5));
    const pixelsPerSquare = Math.max(1, number(measurement.pixelsPerSquare, 64));
    const radiusPixels = Math.max(1, number(distanceFeet, 10) / feetPerSquare * pixelsPerSquare);
    return {
      x: Math.max(0.1, Math.min(100, radiusPixels / Math.max(1, rect.width) * 100)),
      y: Math.max(0.1, Math.min(100, radiusPixels / Math.max(1, rect.height) * 100))
    };
  }

  function fillInspector(object) {
    inspector.hidden = !object;
    if (!object) return;
    const fields = inspector.elements;
    fields.name.value = object.name;
    fields.type.value = object.type;
    fields.stateId.replaceChildren(...getMapObjectStates(object.type).map((stateId) => {
      const option = document.createElement("option");
      option.value = stateId;
      option.textContent = typeLabel(stateId);
      return option;
    }));
    fields.stateId.value = object.stateId;
    fields.icon.value = object.icon;
    fields.width.value = String(object.transform.width);
    fields.height.value = String(object.transform.height);
    fields.rotation.value = String(object.transform.rotation);
    fields.interactionDistanceFeet.value = String(object.interactionDistanceFeet);
    fields.currentHp.value = String(object.hitPoints.current);
    fields.maximumHp.value = String(object.hitPoints.maximum);
    fields.animationId.value = object.animationId;
    fields.imageUrl.value = object.imageUrl;
    fields.description.value = object.description;
    fields.locked.checked = object.locked;
    fields.allowPlayers.checked = object.allowPlayers;
    fields.blocksMovement.checked = object.blocksMovement;
    fields.blocksVision.checked = object.blocksVision;
    fields.dmOnly.checked = object.visibility === "dm";
  }

  function positionElement(element, object) {
    element.style.left = `${object.transform.x}%`;
    element.style.top = `${object.transform.y}%`;
    element.style.width = `${object.transform.width}%`;
    element.style.height = `${object.transform.height}%`;
    element.style.transform = `translate(-50%, -50%) rotate(${object.transform.rotation}deg)`;
    element.style.zIndex = String(240 + Math.round(object.transform.y));
  }

  function render() {
    const target = mountLayer();
    const context = roomContext();
    toggle.hidden = screen !== "battle" || context.isDm !== true;
    toolbar.hidden = !editing || screen !== "battle" || context.isDm !== true;
    toggle.classList.toggle("is-active", editing);
    toggle.setAttribute("aria-pressed", String(editing));
    layer.classList.toggle("is-editing", editing);
    renderMetrics.passes += 1;
    if (!target || screen !== "battle") {
      renderedObjects.forEach((element) => element.remove());
      renderMetrics.removed += renderedObjects.size;
      renderedObjects.clear();
      return;
    }
    const visible = currentObjects();
    const visibleIds = new Set(visible.map((object) => object.id));
    renderedObjects.forEach((element, objectId) => {
      if (visibleIds.has(objectId) && element.parentElement === layer) return;
      element.remove();
      renderedObjects.delete(objectId);
      renderMetrics.removed += 1;
    });
    if (selectedId && !visible.some((object) => object.id === selectedId)) {
      selectedId = "";
      fillInspector(null);
    }
    visible.forEach((object) => {
      const renderKey = JSON.stringify(object);
      const existing = renderedObjects.get(object.id);
      if (existing?.__homebrewGodRenderKey === renderKey) {
        existing.classList.toggle("is-selected", selectedId === object.id);
        renderMetrics.reused += 1;
        return;
      }
      if (existing) {
        existing.remove();
        renderedObjects.delete(object.id);
        renderMetrics.replaced += 1;
      }
      const element = document.createElement("button");
      element.type = "button";
      element.className = "hg-map-object";
      element.dataset.objectId = object.id;
      element.dataset.objectType = object.type;
      element.dataset.objectState = object.stateId;
      element.__homebrewGodRenderKey = renderKey;
      element.classList.toggle("is-selected", selectedId === object.id);
      element.classList.toggle("is-locked", object.locked);
      element.classList.toggle("is-dm-only", object.visibility === "dm");
      element.classList.toggle("is-open", object.stateId === "open");
      element.classList.toggle("is-disabled", object.stateId === "disabled" || object.stateId === "destroyed");
      element.title = `${object.name} · ${typeLabel(object.stateId)}${object.locked ? " · Locked" : ""}${object.visibility === "dm" ? " · DM-only" : ""}`;
      element.setAttribute("aria-label", `${object.name}, ${typeLabel(object.stateId)}`);
      if (object.imageUrl) {
        const image = document.createElement("img");
        image.src = object.imageUrl;
        image.alt = "";
        image.draggable = false;
        element.appendChild(image);
      } else {
        const icon = document.createElement("span");
        icon.textContent = object.icon || MAP_OBJECT_ICONS[object.type];
        icon.setAttribute("aria-hidden", "true");
        element.appendChild(icon);
      }
      const badge = document.createElement("small");
      badge.textContent = object.locked ? "🔒" : typeLabel(object.stateId);
      element.appendChild(badge);
      positionElement(element, object);
      element.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (drag) return;
        if (editing && roomContext().isDm) {
          selectedId = object.id;
          fillInspector(object);
          render();
          return;
        }
        void interactWithObject(object);
      });
      element.addEventListener("pointerdown", (event) => beginDrag(event, object, element));
      renderedObjects.set(object.id, element);
      renderMetrics.created += 1;
      layer.appendChild(element);
    });
  }

  function setEditing(next) {
    const context = roomContext();
    if (next && context.isDm !== true) return false;
    editing = next === true;
    placingType = "";
    document.body.classList.toggle("hg-editing-map-objects", editing);
    if (editing) {
      releaseInteraction?.();
      releaseInteraction = acquireInteraction?.(() => setEditing(false)) || null;
      setStatus("Select an object, or place a new one.", "active");
    } else {
      releaseInteraction?.();
      releaseInteraction = null;
      selectedId = "";
      fillInspector(null);
      setStatus("");
    }
    render();
    return editing;
  }

  function beginPlacement() {
    if (!editing || roomContext().isDm !== true) return;
    placingType = text(addType.value) || "custom";
    setStatus(`Click the map to place a ${typeLabel(placingType).toLowerCase()}.`, "active");
  }

  async function handlePlacement(event) {
    if (!placingType || !editing || !mapTarget || !mapTarget.contains(event.target)) return;
    if (event.target.closest?.(".hg-map-object, .hg-object-toolbar, .hg-token, .hg-floor-marker")) return;
    event.preventDefault();
    event.stopPropagation();
    const room = roomContext();
    const map = mapContext();
    const rect = mapTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, (event.clientX - rect.left) / Math.max(1, rect.width) * 100));
    const y = Math.max(0, Math.min(100, (event.clientY - rect.top) / Math.max(1, rect.height) * 100));
    const type = placingType;
    placingType = "";
    try {
      const object = await store.create(room.roomCode, {
        type,
        name: typeLabel(type),
        icon: MAP_OBJECT_ICONS[type],
        sceneId: map.sceneId || "",
        floorId: map.floorId || "",
        mapId: map.mapId,
        transform: { x, y, width: 8, height: 8, rotation: 0 },
        stateId: getDefaultMapObjectState(type),
        visibility: "shared",
        allowPlayers: true,
        interactionDistanceFeet: 10,
        interactionRadius: interactionRadius(10)
      }, room.userUid);
      selectedId = object.id;
      fillInspector(object);
      setStatus(`${object.name} placed.`, "saved");
    } catch (error) {
      setStatus(error?.message || "The object could not be placed.", "error");
    }
  }

  function beginDrag(event, object, element) {
    if (!editing || roomContext().isDm !== true || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    selectedId = object.id;
    fillInspector(object);
    const rect = mapTarget?.getBoundingClientRect();
    if (!rect?.width || !rect?.height) return;
    drag = {
      pointerId: event.pointerId,
      object,
      element,
      rect,
      x: object.transform.x,
      y: object.transform.y
    };
    element.setPointerCapture?.(event.pointerId);
    element.classList.add("is-dragging");
  }

  function moveDrag(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.preventDefault();
    drag.x = Math.max(0, Math.min(100, (event.clientX - drag.rect.left) / drag.rect.width * 100));
    drag.y = Math.max(0, Math.min(100, (event.clientY - drag.rect.top) / drag.rect.height * 100));
    positionElement(drag.element, normalizeMapObject({
      ...drag.object,
      transform: { ...drag.object.transform, x: drag.x, y: drag.y }
    }, drag.object.id));
  }

  async function endDrag(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const active = drag;
    drag = null;
    active.element.classList.remove("is-dragging");
    try {
      const room = roomContext();
      await store.save(room.roomCode, active.object, {
        transform: { ...active.object.transform, x: active.x, y: active.y }
      }, room.userUid);
      setStatus(`${active.object.name} moved.`, "saved");
    } catch (error) {
      setStatus(error?.message || "The object could not be moved.", "error");
      render();
    }
  }

  async function interactWithObject(object) {
    const room = roomContext();
    const map = mapContext();
    const token = getSelectedToken();
    if (!room.isDm && token && !canControlToken(token)) {
      setStatus("Select one of your own tokens first.", "error");
      return;
    }
    const rect = mapTarget?.getBoundingClientRect?.() || { width: 1, height: 1 };
    const distanceFeet = token ? measureMapObjectDistanceFeet(object, token, {
      viewportWidth: rect.width,
      viewportHeight: rect.height,
      ...getMeasurementOptions()
    }) : Infinity;
    const validation = validateMapObjectInteraction({
      object,
      token,
      isDm: room.isDm,
      context: { ...map, distanceFeet }
    });
    if (!validation.ok) {
      setStatus(validation.reason, "error");
      return;
    }
    try {
      const updated = await store.interact(room.roomCode, object, {
        token,
        isDm: room.isDm,
        userUid: room.userUid,
        context: { ...map, distanceFeet }
      });
      setStatus(`${updated.name} is now ${typeLabel(updated.stateId).toLowerCase()}.`, "saved");
      document.dispatchEvent(new CustomEvent("homebrewgod:object-state-changed", {
        detail: { object: updated, previousStateId: object.stateId, tokenId: token?.id || "" }
      }));
    } catch (error) {
      setStatus(error?.message || "The interaction could not be completed.", "error");
    }
  }

  async function saveInspector(event) {
    event.preventDefault();
    const object = selectedObject();
    if (!object) return;
    const fields = inspector.elements;
    const room = roomContext();
    try {
      const saved = await store.save(room.roomCode, object, {
        name: fields.name.value,
        type: fields.type.value,
        stateId: fields.stateId.value,
        icon: fields.icon.value,
        imageUrl: fields.imageUrl.value,
        description: fields.description.value,
        transform: {
          ...object.transform,
          width: number(fields.width.value, object.transform.width),
          height: number(fields.height.value, object.transform.height),
          rotation: number(fields.rotation.value, object.transform.rotation)
        },
        interactionDistanceFeet: number(fields.interactionDistanceFeet.value, 10),
        interactionRadius: interactionRadius(number(fields.interactionDistanceFeet.value, 10)),
        hitPoints: {
          current: number(fields.currentHp.value, 0),
          maximum: number(fields.maximumHp.value, 0)
        },
        animationId: fields.animationId.value,
        locked: fields.locked.checked,
        allowPlayers: fields.allowPlayers.checked,
        blocksMovement: fields.blocksMovement.checked,
        blocksVision: fields.blocksVision.checked,
        visibility: fields.dmOnly.checked ? "dm" : "shared"
      }, room.userUid);
      selectedId = saved.id;
      fillInspector(saved);
      setStatus(`${saved.name} saved.`, "saved");
    } catch (error) {
      setStatus(error?.message || "The object could not be saved.", "error");
    }
  }

  function connect() {
    const context = roomContext();
    if (screen !== "battle" || !context.roomCode) {
      store.stop();
      connectedRoom = "";
      allObjects = [];
      snapshotReady = false;
      render();
      return;
    }
    if (connectedRoom === context.roomCode && connectedAsDm === (context.isDm === true)) {
      render();
      return;
    }
    snapshotReady = false;
    connectedRoom = context.roomCode;
    connectedAsDm = context.isDm === true;
    store.connect(context.roomCode, {
      isDm: context.isDm,
      onData: (objects) => {
        const previousById = new Map(allObjects.map((object) => [object.id, object]));
        const changed = snapshotReady ? objects.filter((object) => {
          const previous = previousById.get(object.id);
          return previous && (
            previous.stateId !== object.stateId ||
            previous.locked !== object.locked
          );
        }) : [];
        allObjects = objects;
        const selected = selectedObject();
        if (selected) fillInspector(selected);
        render();
        snapshotReady = true;
        changed.forEach((object) => {
          const previous = previousById.get(object.id);
          const tokenId = object.lastInteractorTokenId || "";
          onInteraction({
            object,
            previousStateId: previous?.stateId || "",
            token: tokenId ? { id: tokenId } : null,
            element: layer.querySelector(`[data-object-id="${CSS.escape(object.id)}"]`)
          });
        });
        onObjectsChanged(allObjects);
      },
      onError: (error) => setStatus(error?.message || "Map objects could not be loaded.", "error")
    });
  }

  toggle.addEventListener("click", () => setEditing(!editing));
  toolbar.querySelector("[data-object-close]").addEventListener("click", () => setEditing(false));
  toolbar.querySelector("[data-object-place]").addEventListener("click", beginPlacement);
  inspector.addEventListener("submit", saveInspector);
  inspector.elements.type.addEventListener("change", () => {
    const states = getMapObjectStates(inspector.elements.type.value);
    inspector.elements.stateId.replaceChildren(...states.map((stateId) => {
      const option = document.createElement("option");
      option.value = stateId;
      option.textContent = typeLabel(stateId);
      return option;
    }));
    inspector.elements.icon.value = MAP_OBJECT_ICONS[inspector.elements.type.value] || MAP_OBJECT_ICONS.custom;
  });
  toolbar.querySelector("[data-object-toggle-state]").addEventListener("click", () => {
    const object = selectedObject();
    if (object) void interactWithObject(object);
  });
  toolbar.querySelector("[data-object-duplicate]").addEventListener("click", async () => {
    const object = selectedObject();
    if (!object) return;
    const room = roomContext();
    try {
      const copy = await store.duplicate(room.roomCode, object, {}, room.userUid);
      selectedId = copy.id;
      fillInspector(copy);
      setStatus(`${copy.name} created.`, "saved");
    } catch (error) {
      setStatus(error?.message || "The object could not be duplicated.", "error");
    }
  });
  toolbar.querySelector("[data-object-delete]").addEventListener("click", async () => {
    const object = selectedObject();
    if (!object) return;
    if (!await requestConfirmation(`Delete “${object.name}”?`)) return;
    try {
      await store.remove(roomContext().roomCode, object);
      selectedId = "";
      fillInspector(null);
      setStatus(`${object.name} deleted.`, "saved");
    } catch (error) {
      setStatus(error?.message || "The object could not be deleted.", "error");
    }
  });
  surface.addEventListener("click", handlePlacement, true);
  document.addEventListener("pointermove", moveDrag);
  document.addEventListener("pointerup", endDrag);
  document.addEventListener("pointercancel", endDrag);

  return Object.freeze({
    root: layer,
    toolbar,
    syncContext: connect,
    refresh: render,
    setScreen(value) {
      screen = text(value);
      if (screen !== "battle") setEditing(false);
      connect();
    },
    setEditing,
    getObjects: () => allObjects.map((object) => normalizeMapObject(object, object.id)),
    getVisionWalls: () => currentObjects().flatMap(mapObjectToVisionWalls),
    getListenerSnapshot: () => store.getListenerSnapshot?.() || null,
    getRenderMetrics: () => ({
      ...renderMetrics,
      mounted: renderedObjects.size
    }),
    getState: () => ({
      screen,
      editing,
      placingType,
      roomCode: connectedRoom,
      selectedId,
      visibleCount: currentObjects().length
    }),
    assertMovementAllowed(preview = {}) {
      const blocker = preview.startPosition
        ? findBlockingMapObjectOnPath(
            allObjects,
            preview.startPosition,
            preview.endPosition || preview.startPosition,
            mapContext()
          )
        : findBlockingMapObject(allObjects, preview.endPosition || {}, mapContext());
      if (blocker) throw new Error(`${blocker.name} blocks that destination.`);
      return true;
    },
    disconnect() {
      setEditing(false);
      store.stop();
      connectedRoom = "";
      allObjects = [];
      snapshotReady = false;
      render();
      onObjectsChanged(allObjects);
    },
    destroy() {
      setEditing(false);
      store.stop();
      connectedRoom = "";
      allObjects = [];
      snapshotReady = false;
      onObjectsChanged(allObjects);
      surface.removeEventListener("click", handlePlacement, true);
      document.removeEventListener("pointermove", moveDrag);
      document.removeEventListener("pointerup", endDrag);
      document.removeEventListener("pointercancel", endDrag);
      toggle.remove();
      toolbar.remove();
      renderedObjects.clear();
      layer.remove();
    }
  });
}
