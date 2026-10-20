import {
  MAX_DRAWING_POINTS,
  normalizeDrawingPoint,
  simplifyDrawingPoints,
  stableDrawingMapId
} from "./drawingModel.js";

export const FOG_TOOLS = Object.freeze(["brush", "rectangle", "circle"]);
export const FOG_MODES = Object.freeze(["reveal", "hide"]);
export const FOG_BASE_STATES = Object.freeze(["hidden", "revealed"]);
export const MAX_FOG_POINTS = MAX_DRAWING_POINTS;

function cleanId(value, fallback = "") {
  const cleaned = String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 180);
  return cleaned || fallback;
}

function boundedNumber(value, minimum, maximum, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, number));
}

export function stableFogMapId(value) {
  return stableDrawingMapId(value);
}

export function createDefaultFogSettings(mapId = "") {
  return Object.freeze({
    mapId: cleanId(mapId),
    roomCode: "",
    enabled: false,
    baseState: "hidden",
    revision: 0,
    updatedByUid: "",
    updatedAtMillis: 0,
    updatedAt: null
  });
}

export function normalizeFogSettings(value = {}, context = {}) {
  const mapId = cleanId(value.mapId || context.mapId);
  const baseState = FOG_BASE_STATES.includes(value.baseState)
    ? value.baseState
    : "hidden";
  return Object.freeze({
    mapId,
    roomCode: cleanId(value.roomCode || context.roomCode),
    enabled: value.enabled === true,
    baseState,
    revision: Math.max(0, Math.round(boundedNumber(value.revision, 0, 1000000))),
    updatedByUid: cleanId(value.updatedByUid || context.userId),
    updatedAtMillis: Math.max(0, Number(value.updatedAtMillis) || 0),
    updatedAt: value.updatedAt || null
  });
}

export function normalizeFogOperation(value = {}, context = {}) {
  const now = Number(context.now ?? Date.now());
  const tool = FOG_TOOLS.includes(value.tool) ? value.tool : "brush";
  const mode = FOG_MODES.includes(value.mode) ? value.mode : "reveal";
  const rawPoints = Array.isArray(value.points)
    ? value.points.map(normalizeDrawingPoint)
    : [];
  const points = tool === "brush"
    ? simplifyDrawingPoints(rawPoints, 2.5).slice(0, MAX_FOG_POINTS)
    : [];
  const start = normalizeDrawingPoint(value.start || points[0]);
  const end = normalizeDrawingPoint(value.end || points[points.length - 1] || start);

  return Object.freeze({
    id: cleanId(value.id),
    roomCode: cleanId(value.roomCode || context.roomCode),
    mapId: cleanId(value.mapId || context.mapId, "current-map"),
    revision: Math.max(1, Math.round(boundedNumber(value.revision ?? context.revision, 1, 1000000, 1))),
    authorUid: cleanId(value.authorUid || context.userId),
    mode,
    tool,
    size: Math.round(boundedNumber(value.size, 4, 400, 60)),
    points,
    start,
    end,
    order: Math.max(0, boundedNumber(value.order, 0, Number.MAX_SAFE_INTEGER, now * 1000)),
    createdAtMillis: Math.max(0, Number(value.createdAtMillis) || now),
    createdAt: value.createdAt || null
  });
}

export function fogOperationHasArea(operation = {}) {
  const normalized = normalizeFogOperation(operation);
  if (normalized.tool === "brush") {
    return normalized.points.length > 1;
  }
  return Math.hypot(
    normalized.end.x - normalized.start.x,
    normalized.end.y - normalized.start.y
  ) > 2;
}

export function sortFogOperations(operations = []) {
  return [...operations].sort((left, right) => (
    Number(left.order || 0) - Number(right.order || 0)
    || Number(left.createdAtMillis || 0) - Number(right.createdAtMillis || 0)
    || String(left.id || "").localeCompare(String(right.id || ""))
  ));
}
