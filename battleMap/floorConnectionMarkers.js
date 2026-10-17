import { resolveConnectionDestination } from "./sceneModel.js";

export const DEFAULT_CONNECTION_INTERACTION_FEET = 10;

const ICONS = Object.freeze({
  stairs: "▰",
  ladder: "╫",
  trapdoor: "▣",
  portal: "◉",
  elevator: "↕",
  custom: "◆"
});

const text = (value) => String(value ?? "").trim();
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export function getFloorConnectionIcon(type) {
  return ICONS[text(type).toLowerCase()] || ICONS.custom;
}

export function measureConnectionDistanceFeet(token = {}, endpoint = {}, options = {}) {
  const width = Math.max(1, number(options.viewportWidth, 1));
  const height = Math.max(1, number(options.viewportHeight, 1));
  const pixelsPerSquare = Math.max(1, number(options.pixelsPerSquare, 64));
  const feetPerSquare = Math.max(1, number(options.feetPerSquare, 5));
  const dx = (number(token.x, 50) - number(endpoint.x, 50)) / 100 * width;
  const dy = (number(token.y, 50) - number(endpoint.y, 50)) / 100 * height;
  const horizontal = Math.hypot(dx, dy) / pixelsPerSquare * feetPerSquare;
  const vertical = Math.abs(number(token.elevation ?? token.elevationFeet) - number(options.floorElevation));
  return Math.round(Math.hypot(horizontal, vertical) * 10) / 10;
}

export function validateFloorConnectionUse({
  connection,
  token,
  sceneId,
  floorId,
  isDm = false,
  canControl = false,
  combatActive = false,
  distanceFeet = Infinity,
  interactionDistanceFeet = DEFAULT_CONNECTION_INTERACTION_FEET
} = {}) {
  if (!connection || !token) return Object.freeze({ ok: false, reason: "Select a token first." });
  if (connection.enabled === false) return Object.freeze({ ok: false, reason: "This connection is disabled." });
  if (!isDm && connection.hidden === true) return Object.freeze({ ok: false, reason: "This connection is not available." });
  if (text(token.sceneId) !== text(sceneId) || text(token.floorId) !== text(floorId)) {
    return Object.freeze({ ok: false, reason: "The selected token is not on this floor." });
  }
  const route = resolveConnectionDestination(connection, floorId);
  if (!route) return Object.freeze({ ok: false, reason: "This connection cannot be used in that direction." });
  if (!isDm && connection.allowPlayers === false) {
    return Object.freeze({ ok: false, reason: "The DM has not enabled this connection for players." });
  }
  if (!isDm && !canControl) return Object.freeze({ ok: false, reason: "You do not control the selected token." });
  if (!isDm && combatActive) {
    return Object.freeze({ ok: false, reason: "Player floor transitions during initiative require DM adjudication." });
  }
  if (!isDm && number(distanceFeet, Infinity) > interactionDistanceFeet) {
    return Object.freeze({
      ok: false,
      reason: `Move within ${interactionDistanceFeet} ft of this connection first. Current distance: ${number(distanceFeet).toFixed(1)} ft.`
    });
  }
  return Object.freeze({ ok: true, reason: "", route });
}

export function createFloorConnectionMarkers({
  floorSystem,
  tokenSystem,
  interactionController = null,
  getContainer = () => null,
  getContext = () => ({}),
  onUse = async () => {},
  onEdit = async () => {},
  onStatus = () => {}
} = {}) {
  if (!floorSystem || !tokenSystem) {
    throw new Error("Floor connection markers require the floor and token systems.");
  }
  const overlay = document.createElement("div");
  overlay.className = "hg-floor-marker-layer";
  overlay.setAttribute("aria-label", "Floor connections");
  let screen = "";
  let interaction = interactionController?.getState?.() || null;
  let busy = false;

  function ensureContainer() {
    const container = getContainer();
    if (!container) return null;
    if (getComputedStyle(container).position === "static") container.style.position = "relative";
    if (overlay.parentElement !== container) container.appendChild(overlay);
    return container;
  }

  function connectionDetails(connection, state, route) {
    const destination = state.floors.find((floor) => floor.id === route?.to?.floorId);
    return {
      destination,
      label: `${connection.name || "Connection"}. Destination: ${destination?.name || "Unavailable"}${destination ? ` (${destination.baseElevation > 0 ? "+" : ""}${destination.baseElevation} ft)` : ""}.`
    };
  }

  function getAvailability(connection, state, token) {
    const route = resolveConnectionDestination(connection, state.floorId);
    const context = getContext(token, connection, state) || {};
    const container = ensureContainer();
    const rect = container?.getBoundingClientRect?.() || { width: 1, height: 1 };
    const distanceFeet = token && route
      ? measureConnectionDistanceFeet(token, route.from, {
          viewportWidth: rect.width,
          viewportHeight: rect.height,
          pixelsPerSquare: context.pixelsPerSquare,
          feetPerSquare: context.feetPerSquare,
          floorElevation: state.floor?.baseElevation
        })
      : Infinity;
    const validation = validateFloorConnectionUse({
      connection,
      token,
      sceneId: state.sceneId,
      floorId: state.floorId,
      isDm: context.isDm,
      canControl: context.canControl,
      combatActive: context.combatActive,
      distanceFeet,
      interactionDistanceFeet: context.interactionDistanceFeet || DEFAULT_CONNECTION_INTERACTION_FEET
    });
    return { ...validation, distanceFeet, context, route };
  }

  function render() {
    const container = ensureContainer();
    const state = floorSystem.getState();
    overlay.replaceChildren();
    overlay.classList.toggle("hidden", screen !== "battle" || !state.active);
    overlay.classList.toggle("is-interaction-blocked", Boolean(interaction));
    if (!container || screen !== "battle" || !state.active) return;
    const context = getContext(null, null, state) || {};
    const activeConnections = state.connections.filter((connection) => {
      if (!resolveConnectionDestination(connection, state.floorId)) return false;
      if (connection.hidden === true && !context.isDm) return false;
      return true;
    });
    activeConnections.forEach((connection) => {
      const route = resolveConnectionDestination(connection, state.floorId);
      const details = connectionDetails(connection, state, route);
      const marker = document.createElement("button");
      marker.type = "button";
      marker.className = "hg-floor-marker";
      marker.dataset.connectionId = connection.id;
      marker.dataset.connectionType = connection.type || "custom";
      marker.style.left = `${number(route.from.x, 50)}%`;
      marker.style.top = `${number(route.from.y, 50)}%`;
      marker.classList.toggle("is-hidden-marker", connection.hidden === true);
      marker.classList.toggle("is-disabled", connection.enabled === false);
      marker.innerHTML = `<span aria-hidden="true"></span>`;
      marker.firstElementChild.textContent = getFloorConnectionIcon(connection.type);
      marker.title = `${details.label} ${connection.description || "Select to travel."}`;
      marker.setAttribute("aria-label", marker.title);
      marker.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (busy || interaction) {
          onStatus(interaction ? `${interaction.label} is active. Finish or cancel it before using a floor connection.` : "Floor transition is already in progress.", "error");
          return;
        }
        const token = tokenSystem.getSelectedToken?.();
        const availability = getAvailability(connection, state, token);
        if (!availability.ok) {
          onStatus(availability.reason, "error");
          return;
        }
        busy = true;
        marker.dataset.busy = "true";
        try {
          await onUse({ connection, token, state, route, destination: details.destination, distanceFeet: availability.distanceFeet });
        } catch (error) {
          onStatus(error?.message || "The floor transition could not be completed.", "error");
        } finally {
          busy = false;
          marker.removeAttribute("data-busy");
        }
      });
      marker.addEventListener("contextmenu", (event) => {
        if (!context.isDm) return;
        event.preventDefault();
        event.stopPropagation();
        void onEdit({ connection, state, route, destination: details.destination });
      });
      overlay.appendChild(marker);
    });
  }

  const stopFloor = floorSystem.subscribe?.(render);
  const stopSelection = tokenSystem.subscribeSelection?.(render);
  const stopInteraction = interactionController?.subscribe?.((state) => {
    interaction = state;
    render();
  });
  const onTokensRendered = () => render();
  document.addEventListener("homebrewgod:tokens-rendered", onTokensRendered);

  return Object.freeze({
    root: overlay,
    render,
    getConnectionOptions(token) {
      const state = floorSystem.getState();
      if (!state.active) return [];
      return state.connections
        .filter((connection) => resolveConnectionDestination(connection, state.floorId))
        .map((connection) => {
          const availability = getAvailability(connection, state, token);
          return {
            id: connection.id,
            name: connection.name,
            available: availability.ok,
            reason: availability.reason
          };
        });
    },
    setScreen(nextScreen) {
      screen = text(nextScreen);
      render();
    },
    destroy() {
      stopFloor?.();
      stopSelection?.();
      stopInteraction?.();
      document.removeEventListener("homebrewgod:tokens-rendered", onTokensRendered);
      overlay.remove();
    }
  });
}

