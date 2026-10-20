import { FLOOR_CONNECTION_TYPES } from "./sceneModel.js";

const cleanText = (value) => String(value ?? "").trim();

function requireNumber(value, label, { min = -Infinity, max = Infinity } = {}) {
  if (value === "" || value === null || value === undefined) {
    throw new Error(`${label} is required.`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be a number.`);
  if (parsed < min || parsed > max) {
    throw new Error(`${label} must be between ${min} and ${max}.`);
  }
  return parsed;
}

export function validateFloorConnectionDraft(value = {}, { floors = [] } = {}) {
  const floorIds = new Set(floors.map((floor) => cleanText(floor?.id)).filter(Boolean));
  const name = cleanText(value.name);
  const type = cleanText(value.type).toLowerCase();
  const sourceFloorId = cleanText(value.source?.floorId);
  const destinationFloorId = cleanText(value.destination?.floorId);
  if (!name) throw new Error("Connection name is required.");
  if (name.length > 120) throw new Error("Connection name must be 120 characters or fewer.");
  if (!FLOOR_CONNECTION_TYPES.includes(type)) {
    throw new Error("Choose a valid connection type.");
  }
  if (!sourceFloorId || !floorIds.has(sourceFloorId)) throw new Error("Choose a valid source floor.");
  if (!destinationFloorId || !floorIds.has(destinationFloorId)) throw new Error("Choose a valid destination floor.");
  if (sourceFloorId === destinationFloorId) throw new Error("Source and destination floors must be different.");

  return Object.freeze({
    ...value,
    name,
    type,
    source: Object.freeze({
      floorId: sourceFloorId,
      x: requireNumber(value.source?.x, "Source X", { min: 0, max: 100 }),
      y: requireNumber(value.source?.y, "Source Y", { min: 0, max: 100 })
    }),
    destination: Object.freeze({
      floorId: destinationFloorId,
      x: requireNumber(value.destination?.x, "Destination X", { min: 0, max: 100 }),
      y: requireNumber(value.destination?.y, "Destination Y", { min: 0, max: 100 })
    }),
    movementCost: requireNumber(value.movementCost, "Movement cost", { min: 0, max: 1000 }),
    bidirectional: value.bidirectional === true,
    allowPlayers: value.allowPlayers === true,
    enabled: value.enabled === true,
    hidden: value.hidden === true
  });
}

function optionMarkup(floors, selectedId) {
  return floors.map((floor) => (
    `<option value="${String(floor.id).replaceAll("&", "&amp;").replaceAll('"', "&quot;")}"${floor.id === selectedId ? " selected" : ""}>${String(floor.name || "Floor").replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</option>`
  )).join("");
}

export function createFloorConnectionEditor({
  mount = document.body,
  placeEndpoint = null
} = {}) {
  const root = document.createElement("section");
  root.className = "hg-floor-connection-editor hidden";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", "floorConnectionEditorTitle");
  root.innerHTML = `
    <button class="hg-floor-connection-editor-backdrop" type="button" data-connection-cancel aria-label="Cancel connection editing"></button>
    <form class="hg-floor-connection-editor-card" data-connection-form novalidate>
      <header>
        <div><span class="hg-floor-eyebrow">Battle map</span><h2 id="floorConnectionEditorTitle" data-connection-title>Floor Connection</h2></div>
        <button type="button" data-connection-cancel aria-label="Cancel connection editing" title="Cancel">×</button>
      </header>
      <div class="hg-floor-connection-editor-fields">
        <label class="is-wide"><span>Name</span><input name="name" maxlength="120" required></label>
        <label><span>Type</span><select name="type">${FLOOR_CONNECTION_TYPES.map((type) => `<option value="${type}">${type[0].toUpperCase()}${type.slice(1)}</option>`).join("")}</select></label>
        <label><span>Movement cost (ft)</span><input name="movementCost" type="number" min="0" max="1000" step="0.5" required></label>
        <fieldset class="hg-floor-connection-endpoint">
          <legend>Source</legend>
          <label class="is-wide"><span>Floor</span><select name="sourceFloorId"></select></label>
          <label><span>X %</span><input name="sourceX" type="number" min="0" max="100" step="0.01" required></label>
          <label><span>Y %</span><input name="sourceY" type="number" min="0" max="100" step="0.01" required></label>
          <button type="button" data-place-endpoint="source">Place on map</button>
        </fieldset>
        <fieldset class="hg-floor-connection-endpoint">
          <legend>Destination</legend>
          <label class="is-wide"><span>Floor</span><select name="destinationFloorId"></select></label>
          <label><span>X %</span><input name="destinationX" type="number" min="0" max="100" step="0.01" required></label>
          <label><span>Y %</span><input name="destinationY" type="number" min="0" max="100" step="0.01" required></label>
          <button type="button" data-place-endpoint="destination">Place on map</button>
        </fieldset>
        <div class="hg-floor-connection-flags is-wide">
          <label><input name="bidirectional" type="checkbox"> Two-way</label>
          <label><input name="allowPlayers" type="checkbox"> Players may use</label>
          <label><input name="enabled" type="checkbox"> Enabled</label>
          <label><input name="hidden" type="checkbox"> Hide marker</label>
        </div>
      </div>
      <p class="hg-floor-connection-editor-status" data-connection-status role="alert"></p>
      <footer><button type="button" data-connection-cancel>Cancel</button><button type="submit" data-connection-save>Save Connection</button></footer>
    </form>`;
  mount.appendChild(root);
  const form = root.querySelector("[data-connection-form]");
  const status = root.querySelector("[data-connection-status]");
  const title = root.querySelector("[data-connection-title]");
  let session = null;
  let resolveSession = null;
  let placing = false;
  let cancelAfterPlacement = false;

  function read() {
    const data = new FormData(form);
    return {
      ...(session?.original || {}),
      name: data.get("name"),
      type: data.get("type"),
      movementCost: data.get("movementCost"),
      source: { floorId: data.get("sourceFloorId"), x: data.get("sourceX"), y: data.get("sourceY") },
      destination: { floorId: data.get("destinationFloorId"), x: data.get("destinationX"), y: data.get("destinationY") },
      bidirectional: data.get("bidirectional") === "on",
      allowPlayers: data.get("allowPlayers") === "on",
      enabled: data.get("enabled") === "on",
      hidden: data.get("hidden") === "on"
    };
  }

  function setValue(name, value) {
    const control = form.elements.namedItem(name);
    if (!control) return;
    if (control.type === "checkbox") control.checked = value === true;
    else control.value = String(value ?? "");
  }

  function finish(value) {
    if (!session || placing) return false;
    root.classList.add("hidden");
    root.classList.remove("is-placing");
    const resolver = resolveSession;
    session = null;
    resolveSession = null;
    status.textContent = "";
    resolver?.(value);
    return true;
  }

  function cancel() {
    if (placing) {
      cancelAfterPlacement = true;
      return false;
    }
    return finish(null);
  }

  root.querySelectorAll("[data-connection-cancel]").forEach((button) => button.addEventListener("click", cancel));
  root.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || root.classList.contains("hidden")) return;
    event.preventDefault();
    if (!placing) cancel();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const value = validateFloorConnectionDraft(read(), { floors: session?.floors || [] });
      finish(value);
    } catch (error) {
      status.textContent = error?.message || "Check the connection fields and try again.";
    }
  });
  root.querySelectorAll("[data-place-endpoint]").forEach((button) => button.addEventListener("click", async () => {
    if (!session || placing || typeof placeEndpoint !== "function") return;
    const endpoint = button.dataset.placeEndpoint;
    const floorId = cleanText(form.elements.namedItem(`${endpoint}FloorId`)?.value);
    status.textContent = "Click the intended point on the map, or press Escape to cancel placement.";
    placing = true;
    root.classList.add("is-placing");
    try {
      const point = await placeEndpoint({ floorId, endpoint });
      if (point) {
        setValue(`${endpoint}X`, Math.round(Number(point.x) * 100) / 100);
        setValue(`${endpoint}Y`, Math.round(Number(point.y) * 100) / 100);
        status.textContent = `${endpoint === "source" ? "Source" : "Destination"} marker placed.`;
      } else {
        status.textContent = "Placement canceled. Existing coordinates were kept.";
      }
    } catch (error) {
      status.textContent = error?.message || "The marker could not be placed.";
    } finally {
      placing = false;
      root.classList.remove("is-placing");
      if (cancelAfterPlacement) {
        cancelAfterPlacement = false;
        finish(null);
      } else {
        button.focus();
      }
    }
  }));

  return Object.freeze({
    root,
    open({ connection = {}, floors = [], mode = "edit", sourceFloorId = "", destinationFloorId = "" } = {}) {
      if (session) cancel();
      cancelAfterPlacement = false;
      const original = { ...connection };
      session = { original, floors: [...floors] };
      title.textContent = mode === "create" ? "Add Floor Connection" : "Edit Floor Connection";
      const sourceSelect = form.elements.namedItem("sourceFloorId");
      const destinationSelect = form.elements.namedItem("destinationFloorId");
      sourceSelect.innerHTML = optionMarkup(floors, connection.source?.floorId || sourceFloorId);
      destinationSelect.innerHTML = optionMarkup(floors, connection.destination?.floorId || destinationFloorId);
      setValue("name", connection.name || "Stairs");
      setValue("type", connection.type || "stairs");
      setValue("movementCost", connection.movementCost ?? 0);
      setValue("sourceFloorId", connection.source?.floorId || sourceFloorId);
      setValue("sourceX", connection.source?.x ?? 50);
      setValue("sourceY", connection.source?.y ?? 50);
      setValue("destinationFloorId", connection.destination?.floorId || destinationFloorId);
      setValue("destinationX", connection.destination?.x ?? 50);
      setValue("destinationY", connection.destination?.y ?? 50);
      setValue("bidirectional", connection.bidirectional !== false);
      setValue("allowPlayers", connection.allowPlayers !== false);
      setValue("enabled", connection.enabled !== false);
      setValue("hidden", connection.hidden === true);
      status.textContent = "Changes are saved only after Save Connection.";
      root.classList.remove("hidden");
      queueMicrotask(() => form.elements.namedItem("name")?.focus());
      return new Promise((resolve) => { resolveSession = resolve; });
    },
    cancel,
    destroy() {
      if (session && !placing) finish(null);
      root.remove();
    }
  });
}
