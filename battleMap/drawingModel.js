export const DRAWING_TOOLS = Object.freeze([
  "pen",
  "eraser",
  "line",
  "rectangle",
  "circle",
  "arrow"
]);

export const DRAWING_LAYERS = Object.freeze([
  "shared",
  "dm"
]);

export const DRAWING_COLLECTIONS = Object.freeze({
  shared: "sharedDrawings",
  dm: "dmDrawings"
});

export const MAX_DRAWING_POINTS = 512;

function boundedNumber(value, minimum, maximum, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, number));
}

function cleanId(value, fallback = "") {
  const cleaned = String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 180);
  return cleaned || fallback;
}

export function drawingCollectionForLayer(layer) {
  return DRAWING_COLLECTIONS[layer] || DRAWING_COLLECTIONS.shared;
}

export function normalizeDrawingPoint(point = {}) {
  return {
    x: boundedNumber(point.x, 0, 1000),
    y: boundedNumber(point.y, 0, 1000)
  };
}

export function clientPointToDrawingSpace(rect, clientX, clientY) {
  const width = Math.max(1, Number(rect?.width) || 1);
  const height = Math.max(1, Number(rect?.height) || 1);
  return normalizeDrawingPoint({
    x: ((Number(clientX) - (Number(rect?.left) || 0)) / width) * 1000,
    y: ((Number(clientY) - (Number(rect?.top) || 0)) / height) * 1000
  });
}

export function normalizeDrawingStroke(value = {}, context = {}) {
  const now = Number(context.now ?? Date.now());
  const requestedLayer = DRAWING_LAYERS.includes(value.layer) ? value.layer : "shared";
  const layer = requestedLayer === "dm" && context.isDm !== true ? "shared" : requestedLayer;
  const tool = DRAWING_TOOLS.includes(value.tool) && value.tool !== "eraser"
    ? value.tool
    : "pen";
  const color = /^#[0-9a-fA-F]{6}$/.test(String(value.color || ""))
    ? String(value.color).toLowerCase()
    : "#ff3b5c";
  const points = Array.isArray(value.points)
    ? value.points.slice(0, MAX_DRAWING_POINTS).map(normalizeDrawingPoint)
    : [];
  const start = normalizeDrawingPoint(value.start || points[0]);
  const end = normalizeDrawingPoint(value.end || points[points.length - 1] || start);

  return {
    id: cleanId(value.id),
    roomCode: cleanId(value.roomCode || context.roomCode),
    mapId: cleanId(value.mapId || context.mapId, "current-map"),
    authorUid: cleanId(value.authorUid || context.userId),
    authorName: String(value.authorName || context.userName || "Player").slice(0, 160),
    layer,
    tool,
    color,
    size: Math.round(boundedNumber(value.size, 1, 48, 4)),
    points,
    start,
    end,
    createdAtMillis: Number(value.createdAtMillis) || now,
    updatedAtMillis: Number(value.updatedAtMillis) || now,
    createdAt: value.createdAt || null,
    updatedAt: value.updatedAt || null
  };
}

export function simplifyDrawingPoints(points, minimumDistance = 3) {
  const normalized = Array.isArray(points) ? points.map(normalizeDrawingPoint) : [];
  if (normalized.length <= 2) return normalized;
  const kept = [normalized[0]];
  for (let index = 1; index < normalized.length - 1; index += 1) {
    const previous = kept[kept.length - 1];
    const next = normalized[index];
    const distance = Math.hypot(next.x - previous.x, next.y - previous.y);
    if (distance >= minimumDistance) kept.push(next);
    if (kept.length >= MAX_DRAWING_POINTS - 1) break;
  }
  kept.push(normalized[normalized.length - 1]);
  return kept.slice(0, MAX_DRAWING_POINTS);
}

export function stableDrawingMapId(value) {
  const source = String(value || "current-map").trim();
  const direct = cleanId(source);
  if (source === direct && source.length <= 180) return direct;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const prefix = direct.slice(0, 140) || "map";
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}

export function canDeleteDrawingStroke(stroke, { userId = "", isDm = false } = {}) {
  return Boolean(stroke && (isDm === true || stroke.authorUid === userId));
}
