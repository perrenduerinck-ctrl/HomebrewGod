import {
  MAX_TOKEN_ELEVATION_FEET,
  MIN_TOKEN_ELEVATION_FEET,
  normalizeElevation
} from "./elevation.js?v=2d5-vfx-polish-20260902";

export const SCENE_SCHEMA_VERSION = 1;
export const FLOOR_SCHEMA_VERSION = 1;
export const CONNECTION_SCHEMA_VERSION = 1;
export const FLOOR_CONNECTION_TYPES = Object.freeze([
  "stairs",
  "ladder",
  "trapdoor",
  "elevator",
  "portal",
  "custom"
]);

const cleanText = (value, fallback = "") => (
  String(value ?? "").trim() || fallback
);

const finiteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clampPercent = (value, fallback = 50) => (
  Math.max(0, Math.min(100, finiteNumber(value, fallback)))
);

export function createStableMapScopeId(sceneId, floorId) {
  const safeSceneId = cleanText(sceneId);
  const safeFloorId = cleanText(floorId);
  return safeSceneId && safeFloorId
    ? `scene:${safeSceneId}:floor:${safeFloorId}`
    : "";
}

export function normalizeScene(value = {}, id = value?.id) {
  const sceneId = cleanText(id ?? value?.id);
  return Object.freeze({
    ...value,
    id: sceneId,
    name: cleanText(value?.name, "Untitled Location").slice(0, 120),
    description: cleanText(value?.description).slice(0, 4000),
    roomCode: cleanText(value?.roomCode),
    schemaVersion: SCENE_SCHEMA_VERSION,
    createdAtMillis: Math.max(0, finiteNumber(value?.createdAtMillis, Date.now())),
    updatedAtMillis: Math.max(0, finiteNumber(value?.updatedAtMillis, Date.now()))
  });
}

export function normalizeFloor(value = {}, id = value?.id) {
  const floorId = cleanText(id ?? value?.id);
  const sourceMap = value?.map && typeof value.map === "object"
    ? value.map
    : {};
  const url = cleanText(sourceMap.url ?? value?.mapUrl ?? value?.url);
  const map = Object.freeze({
    id: cleanText(sourceMap.id ?? value?.mapId) || null,
    name: cleanText(sourceMap.name ?? value?.mapName, "Floor Map"),
    url,
    publicId: cleanText(sourceMap.publicId ?? value?.publicId) || null,
    savedToLibrary: sourceMap.savedToLibrary === true || Boolean(sourceMap.id ?? value?.mapId),
    timeVariants: sourceMap.timeVariants && typeof sourceMap.timeVariants === "object"
      ? { ...sourceMap.timeVariants }
      : {}
  });
  return Object.freeze({
    ...value,
    id: floorId,
    sceneId: cleanText(value?.sceneId),
    roomCode: cleanText(value?.roomCode),
    name: cleanText(value?.name, "Floor").slice(0, 120),
    description: cleanText(value?.description).slice(0, 4000),
    baseElevation: normalizeElevation(value?.baseElevation ?? value?.elevationFeet),
    order: Math.round(finiteNumber(value?.order, 0)),
    grid: value?.grid && typeof value.grid === "object" ? { ...value.grid } : {},
    lighting: value?.lighting && typeof value.lighting === "object" ? { ...value.lighting } : {},
    map,
    schemaVersion: FLOOR_SCHEMA_VERSION,
    createdAtMillis: Math.max(0, finiteNumber(value?.createdAtMillis, Date.now())),
    updatedAtMillis: Math.max(0, finiteNumber(value?.updatedAtMillis, Date.now()))
  });
}

export function sortFloors(floors = []) {
  return [...floors]
    .map((floor) => normalizeFloor(floor, floor?.id))
    .sort((left, right) => (
      right.baseElevation - left.baseElevation ||
      left.order - right.order ||
      left.name.localeCompare(right.name) ||
      left.id.localeCompare(right.id)
    ));
}

export function normalizeConnection(value = {}, id = value?.id) {
  const type = FLOOR_CONNECTION_TYPES.includes(value?.type)
    ? value.type
    : "custom";
  const normalizeEndpoint = (endpoint = {}) => Object.freeze({
    floorId: cleanText(endpoint.floorId),
    x: clampPercent(endpoint.x),
    y: clampPercent(endpoint.y)
  });
  return Object.freeze({
    ...value,
    id: cleanText(id ?? value?.id),
    sceneId: cleanText(value?.sceneId),
    roomCode: cleanText(value?.roomCode),
    name: cleanText(value?.name, type === "custom" ? "Floor transition" : type),
    description: cleanText(value?.description).slice(0, 1000),
    type,
    source: normalizeEndpoint(value?.source),
    destination: normalizeEndpoint(value?.destination),
    bidirectional: value?.bidirectional !== false,
    allowPlayers: value?.allowPlayers !== false,
    movementCost: Math.max(0, Math.min(1000, finiteNumber(value?.movementCost, 0))),
    schemaVersion: CONNECTION_SCHEMA_VERSION,
    createdAtMillis: Math.max(0, finiteNumber(value?.createdAtMillis, Date.now())),
    updatedAtMillis: Math.max(0, finiteNumber(value?.updatedAtMillis, Date.now()))
  });
}

export function resolveConnectionDestination(connectionValue, currentFloorId) {
  const connection = normalizeConnection(connectionValue, connectionValue?.id);
  const floorId = cleanText(currentFloorId);
  if (connection.source.floorId === floorId) {
    return Object.freeze({
      from: connection.source,
      to: connection.destination,
      reverse: false
    });
  }
  if (connection.bidirectional && connection.destination.floorId === floorId) {
    return Object.freeze({
      from: connection.destination,
      to: connection.source,
      reverse: true
    });
  }
  return null;
}

export function getConnectionsForFloor(connections = [], floorId) {
  return connections
    .map((entry) => normalizeConnection(entry, entry?.id))
    .filter((entry) => resolveConnectionDestination(entry, floorId));
}

export function tokenMatchesFloor(token = {}, context = {}) {
  const sceneId = cleanText(context.sceneId);
  const floorId = cleanText(context.floorId);
  const tokenSceneId = cleanText(token.sceneId);
  const tokenFloorId = cleanText(token.floorId);
  if (!sceneId || !floorId) {
    return !tokenSceneId && !tokenFloorId;
  }
  return tokenSceneId === sceneId && tokenFloorId === floorId;
}

export function getTokenHeightAboveFloor(token = {}, floor = {}) {
  return normalizeElevation(token.elevation ?? token.elevationFeet) -
    normalizeElevation(floor.baseElevation);
}

export function buildFloorTransitionPatch({
  token,
  sceneId,
  floor,
  connection = null,
  fromFloorId = token?.floorId,
  dmOverride = false,
  now = Date.now()
} = {}) {
  const destinationFloor = normalizeFloor(floor, floor?.id);
  const safeSceneId = cleanText(sceneId);
  if (!safeSceneId || !destinationFloor.id) {
    throw new Error("A scene and destination floor are required.");
  }

  let position = {
    x: clampPercent(token?.x),
    y: clampPercent(token?.y)
  };
  let connectionId = "";
  if (connection) {
    const normalized = normalizeConnection(connection, connection?.id);
    const route = resolveConnectionDestination(normalized, fromFloorId);
    if (!route || route.to.floorId !== destinationFloor.id) {
      throw new Error("This connection does not lead to the selected floor.");
    }
    position = { x: route.to.x, y: route.to.y };
    connectionId = normalized.id;
  } else if (!dmOverride) {
    throw new Error("A valid floor connection is required.");
  }

  const requestedHeight = Number.isFinite(Number(token?.heightAboveFloor))
    ? normalizeElevation(token.heightAboveFloor)
    : 0;
  const heightAboveFloor = Math.max(
    MIN_TOKEN_ELEVATION_FEET - destinationFloor.baseElevation,
    Math.min(
      MAX_TOKEN_ELEVATION_FEET - destinationFloor.baseElevation,
      requestedHeight
    )
  );
  const elevation = normalizeElevation(
    destinationFloor.baseElevation + heightAboveFloor
  );

  return Object.freeze({
    sceneId: safeSceneId,
    floorId: destinationFloor.id,
    x: position.x,
    y: position.y,
    elevation,
    elevationFeet: elevation,
    heightAboveFloor,
    lastFloorConnectionId: connectionId,
    floorChangedAtMillis: Math.max(0, finiteNumber(now, Date.now())),
    movedAtMillis: Math.max(0, finiteNumber(now, Date.now())),
    updatedAtMillis: Math.max(0, finiteNumber(now, Date.now()))
  });
}

export function validateFloorElevation(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error("Floor elevation must be a number.");
  }
  if (parsed < MIN_TOKEN_ELEVATION_FEET || parsed > MAX_TOKEN_ELEVATION_FEET) {
    throw new Error(
      `Floor elevation must be between ${MIN_TOKEN_ELEVATION_FEET} and ${MAX_TOKEN_ELEVATION_FEET} feet.`
    );
  }
  return normalizeElevation(parsed);
}

export function createLegacyFloor({ sceneId, roomCode, currentMap } = {}) {
  return normalizeFloor({
    sceneId,
    roomCode,
    name: "Ground Floor",
    baseElevation: 0,
    order: 0,
    map: currentMap?.url ? { ...currentMap } : {},
    createdAtMillis: Date.now(),
    updatedAtMillis: Date.now()
  });
}
