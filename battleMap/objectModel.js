export const MAP_OBJECT_SCHEMA_VERSION = 1;

export const MAP_OBJECT_TYPES = Object.freeze([
  "door",
  "chest",
  "lever",
  "button",
  "pressure-plate",
  "trap",
  "destructible",
  "furniture",
  "custom"
]);

export const MAP_OBJECT_ICONS = Object.freeze({
  door: "🚪",
  chest: "🧰",
  lever: "↕",
  button: "●",
  "pressure-plate": "▣",
  trap: "⚠",
  destructible: "◫",
  furniture: "▤",
  custom: "◆"
});

export const MAP_OBJECT_STATES = Object.freeze({
  door: Object.freeze(["closed", "open"]),
  chest: Object.freeze(["closed", "open", "looted"]),
  lever: Object.freeze(["inactive", "active"]),
  button: Object.freeze(["inactive", "active"]),
  "pressure-plate": Object.freeze(["inactive", "active"]),
  trap: Object.freeze(["armed", "activated", "disabled"]),
  destructible: Object.freeze(["intact", "damaged", "destroyed"]),
  furniture: Object.freeze(["intact", "moved", "destroyed"]),
  custom: Object.freeze(["inactive", "active"])
});

const cleanText = (value, fallback = "") => String(value ?? "").trim() || fallback;
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, min, max, fallback) => Math.max(min, Math.min(max, finite(value, fallback)));

export function normalizeObjectType(value) {
  const type = cleanText(value).toLowerCase();
  return MAP_OBJECT_TYPES.includes(type) ? type : "custom";
}

export function getMapObjectStates(typeValue) {
  return MAP_OBJECT_STATES[normalizeObjectType(typeValue)] || MAP_OBJECT_STATES.custom;
}

export function getDefaultMapObjectState(typeValue) {
  return getMapObjectStates(typeValue)[0];
}

export function normalizeMapObjectVisibility(value) {
  return cleanText(value).toLowerCase() === "dm" ? "dm" : "shared";
}

export function objectCollectionForVisibility(value) {
  return normalizeMapObjectVisibility(value) === "dm" ? "dmObjects" : "objects";
}

export function objectCollectionForRecord(value = {}) {
  return objectCollectionForVisibility(value.visibility);
}

export function normalizeMapObject(value = {}, id = value?.id) {
  const type = normalizeObjectType(value.type);
  const allowedStates = getMapObjectStates(type);
  const requestedState = cleanText(value.stateId).toLowerCase();
  let stateId = allowedStates.includes(requestedState)
    ? requestedState
    : getDefaultMapObjectState(type);
  const maximumHp = Math.round(clamp(value?.hitPoints?.maximum ?? value.maxHp, 0, 100000, 0));
  const currentHp = Math.round(clamp(
    value?.hitPoints?.current ?? value.currentHp,
    0,
    maximumHp || 100000,
    maximumHp
  ));
  if (["destructible", "furniture"].includes(type) && maximumHp > 0) {
    if (currentHp === 0) stateId = "destroyed";
    else if (type === "destructible" && currentHp < maximumHp) stateId = "damaged";
  }
  const destroyed = stateId === "destroyed";
  const closedDoor = type === "door" && stateId === "closed";
  const imageUrl = cleanText(value.imageUrl);
  return Object.freeze({
    ...value,
    id: cleanText(id ?? value.id),
    roomCode: cleanText(value.roomCode),
    kind: "object",
    type,
    name: cleanText(value.name, type.replaceAll("-", " ")).slice(0, 120),
    description: cleanText(value.description).slice(0, 2000),
    imageUrl: imageUrl.startsWith("https://") ? imageUrl.slice(0, 2000) : "",
    imagePublicId: cleanText(value.imagePublicId).slice(0, 500),
    icon: cleanText(value.icon, MAP_OBJECT_ICONS[type]).slice(0, 16),
    sceneId: cleanText(value.sceneId),
    floorId: cleanText(value.floorId),
    mapId: cleanText(value.mapId).slice(0, 300),
    transform: Object.freeze({
      x: clamp(value?.transform?.x ?? value.x, 0, 100, 50),
      y: clamp(value?.transform?.y ?? value.y, 0, 100, 50),
      width: clamp(value?.transform?.width ?? value.width, 1, 100, 8),
      height: clamp(value?.transform?.height ?? value.height, 1, 100, 8),
      rotation: clamp(value?.transform?.rotation ?? value.rotation, -360, 360, 0)
    }),
    stateId,
    locked: value.locked === true,
    allowPlayers: value.allowPlayers !== false,
    visibility: normalizeMapObjectVisibility(value.visibility),
    interactionDistanceFeet: clamp(value.interactionDistanceFeet, 5, 120, 10),
    interactionRadius: Object.freeze({
      x: clamp(value?.interactionRadius?.x, 0.1, 100, 5),
      y: clamp(value?.interactionRadius?.y, 0.1, 100, 5)
    }),
    blocksMovement: destroyed ? false : (type === "door" ? closedDoor : value.blocksMovement === true),
    blocksVision: destroyed ? false : (type === "door" ? closedDoor : value.blocksVision === true),
    hitPoints: Object.freeze({ current: currentHp, maximum: maximumHp }),
    animationId: cleanText(value.animationId).slice(0, 180),
    revision: Math.max(1, Math.round(finite(value.revision, 1))),
    createdByUid: cleanText(value.createdByUid).slice(0, 180),
    updatedByUid: cleanText(value.updatedByUid).slice(0, 180),
    lastInteractedByUid: cleanText(value.lastInteractedByUid).slice(0, 180),
    lastInteractorTokenId: cleanText(value.lastInteractorTokenId).slice(0, 180),
    lastPuzzleExecutionId: cleanText(value.lastPuzzleExecutionId).slice(0, 180),
    createdAtMillis: Math.max(0, finite(value.createdAtMillis, Date.now())),
    updatedAtMillis: Math.max(0, finite(value.updatedAtMillis, Date.now())),
    schemaVersion: MAP_OBJECT_SCHEMA_VERSION
  });
}

export function mapObjectToVisionWalls(objectValue = {}) {
  const object = normalizeMapObject(objectValue, objectValue?.id);
  if (!object.blocksVision || object.stateId === "destroyed") return [];
  const center = { x: object.transform.x * 10, y: object.transform.y * 10 };
  const halfWidth = object.transform.width * 5;
  const halfHeight = object.transform.height * 5;
  const angle = object.transform.rotation * Math.PI / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rotate = ({ x, y }) => ({
    x: center.x + x * cos - y * sin,
    y: center.y + x * sin + y * cos
  });
  const corners = [
    rotate({ x: -halfWidth, y: -halfHeight }),
    rotate({ x: halfWidth, y: -halfHeight }),
    rotate({ x: halfWidth, y: halfHeight }),
    rotate({ x: -halfWidth, y: halfHeight })
  ];
  return corners.map((start, index) => Object.freeze({
    id: `object-${object.id}-${index}`,
    start: Object.freeze(start),
    end: Object.freeze(corners[(index + 1) % corners.length])
  }));
}

export function mapObjectMatchesContext(objectValue = {}, context = {}) {
  const object = normalizeMapObject(objectValue, objectValue?.id);
  const sceneId = cleanText(context.sceneId);
  const floorId = cleanText(context.floorId);
  if (sceneId || floorId) {
    return object.sceneId === sceneId && object.floorId === floorId;
  }
  if (object.sceneId || object.floorId) return false;
  return Boolean(context.mapId) && object.mapId === cleanText(context.mapId);
}

export function measureMapObjectDistanceFeet(objectValue = {}, token = {}, options = {}) {
  const object = normalizeMapObject(objectValue, objectValue?.id);
  const width = Math.max(1, finite(options.viewportWidth, 1));
  const height = Math.max(1, finite(options.viewportHeight, 1));
  const pixelsPerSquare = Math.max(1, finite(options.pixelsPerSquare, 64));
  const feetPerSquare = Math.max(1, finite(options.feetPerSquare, 5));
  const dx = (finite(token.x, 50) - object.transform.x) / 100 * width;
  const dy = (finite(token.y, 50) - object.transform.y) / 100 * height;
  return Math.round((Math.hypot(dx, dy) / pixelsPerSquare * feetPerSquare) * 10) / 10;
}

export function getNextMapObjectState(objectValue = {}) {
  const object = normalizeMapObject(objectValue, objectValue?.id);
  const states = getMapObjectStates(object.type);
  const index = Math.max(0, states.indexOf(object.stateId));
  if (object.type === "trap" && object.stateId === "activated") return "disabled";
  if (["destructible", "furniture"].includes(object.type)) return object.stateId;
  return states[(index + 1) % states.length];
}

export function validateMapObjectInteraction({ object: value, token, context = {}, isDm = false } = {}) {
  if (!value?.id) return Object.freeze({ ok: false, reason: "That map object is unavailable." });
  const object = normalizeMapObject(value, value.id);
  if (!mapObjectMatchesContext(object, context)) {
    return Object.freeze({ ok: false, reason: "That object is on another map or floor." });
  }
  if (!isDm) {
    if (object.visibility === "dm") return Object.freeze({ ok: false, reason: "That object is not available." });
    if (!object.allowPlayers) return Object.freeze({ ok: false, reason: "The DM has disabled player interaction." });
    if (!token?.id) return Object.freeze({ ok: false, reason: "Select one of your tokens first." });
    if (cleanText(token.sceneId) !== object.sceneId || cleanText(token.floorId) !== object.floorId) {
      return Object.freeze({ ok: false, reason: "Your token is on another floor." });
    }
    const distanceFeet = finite(context.distanceFeet, Infinity);
    if (distanceFeet > object.interactionDistanceFeet) {
      return Object.freeze({
        ok: false,
        reason: `Move within ${object.interactionDistanceFeet} ft first. Current distance: ${distanceFeet.toFixed(1)} ft.`
      });
    }
  }
  if (object.locked && !isDm) return Object.freeze({ ok: false, reason: `${object.name} is locked.` });
  const nextStateId = getNextMapObjectState(object);
  if (nextStateId === object.stateId) {
    return Object.freeze({ ok: false, reason: `${object.name} does not have a toggle interaction.` });
  }
  return Object.freeze({ ok: true, reason: "", object, nextStateId });
}

export function buildMapObjectInteractionPatch(objectValue, {
  nextStateId,
  userUid = "",
  tokenId = "",
  now = Date.now()
} = {}) {
  const object = normalizeMapObject(objectValue, objectValue?.id);
  if (!getMapObjectStates(object.type).includes(nextStateId)) {
    throw new Error("That state is not valid for this object type.");
  }
  return Object.freeze({
    stateId: nextStateId,
    blocksMovement: object.type === "door" ? nextStateId === "closed" : object.blocksMovement,
    blocksVision: object.type === "door" ? nextStateId === "closed" : object.blocksVision,
    revision: object.revision + 1,
    lastInteractedByUid: cleanText(userUid),
    lastInteractorTokenId: cleanText(tokenId),
    lastPuzzleExecutionId: "",
    updatedByUid: cleanText(userUid),
    updatedAtMillis: Math.max(0, finite(now, Date.now()))
  });
}

export function findBlockingMapObject(objects = [], position = {}, context = {}) {
  const x = clamp(position.x, 0, 100, 50);
  const y = clamp(position.y, 0, 100, 50);
  return objects.find((value) => {
    const object = normalizeMapObject(value, value?.id);
    if (!object.blocksMovement || object.stateId === "destroyed") return false;
    if (!mapObjectMatchesContext(object, context)) return false;
    return Math.abs(x - object.transform.x) <= object.transform.width / 2 &&
      Math.abs(y - object.transform.y) <= object.transform.height / 2;
  }) || null;
}

function segmentCrossesObject(startValue, endValue, object) {
  const angle = -object.transform.rotation * Math.PI / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const local = (value) => {
    const dx = finite(value?.x, 50) - object.transform.x;
    const dy = finite(value?.y, 50) - object.transform.y;
    return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
  };
  const start = local(startValue);
  const end = local(endValue);
  const halfWidth = object.transform.width / 2;
  const halfHeight = object.transform.height / 2;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const p = [-dx, dx, -dy, dy];
  const q = [start.x + halfWidth, halfWidth - start.x, start.y + halfHeight, halfHeight - start.y];
  let enter = 0;
  let leave = 1;
  for (let index = 0; index < p.length; index += 1) {
    if (Math.abs(p[index]) < 1e-9) {
      if (q[index] < 0) return false;
      continue;
    }
    const ratio = q[index] / p[index];
    if (p[index] < 0) enter = Math.max(enter, ratio);
    else leave = Math.min(leave, ratio);
    if (enter > leave) return false;
  }
  return true;
}

export function findBlockingMapObjectOnPath(objects = [], startPosition = {}, endPosition = {}, context = {}) {
  return objects.find((value) => {
    const object = normalizeMapObject(value, value?.id);
    return object.blocksMovement &&
      object.stateId !== "destroyed" &&
      mapObjectMatchesContext(object, context) &&
      segmentCrossesObject(startPosition, endPosition, object);
  }) || null;
}
