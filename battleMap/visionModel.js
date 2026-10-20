export const VISION_SPACE_SIZE = 1000;
export const EXPLORATION_RESOLUTION = 64;
export const MAX_VISION_DISTANCE = 1000;
export const MAX_VISION_WALLS = 1200;

const number = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, number(value, min)));

export function normalizeVisionPoint(point = {}) {
  return Object.freeze({
    x: clamp(point.x, 0, VISION_SPACE_SIZE),
    y: clamp(point.y, 0, VISION_SPACE_SIZE)
  });
}

function senseRangeFromList(list = []) {
  return (Array.isArray(list) ? list : []).reduce((largest, entry) => {
    const name = String(entry?.sense || entry?.type || entry?.name || "").toLowerCase();
    if (!name.includes("darkvision")) return largest;
    return Math.max(largest, number(entry?.range ?? entry?.distance ?? entry?.value, 0));
  }, 0);
}

function textDarkvisionRange(value) {
  const match = String(value || "").match(/darkvision[^0-9]{0,20}(\d{1,4})/i);
  return match ? number(match[1], 0) : 0;
}

export function inferCharacterDarkvision(character = {}) {
  const speciesTraits = [
    ...(Array.isArray(character?.species?.traits) ? character.species.traits : []),
    ...(Array.isArray(character?.species?.templateSnapshot?.traits)
      ? character.species.templateSnapshot.traits
      : [])
  ];
  return Math.max(
    number(character?.darkvision, 0),
    number(character?.senses?.darkvision, 0),
    number(character?.species?.darkvision, 0),
    number(character?.species?.templateSnapshot?.darkvision, 0),
    senseRangeFromList(character?.senses),
    senseRangeFromList(character?.featMechanics?.senses),
    ...speciesTraits.map((trait) => Math.max(
      number(trait?.darkvision, 0),
      number(trait?.range, 0) && String(trait?.id || trait?.name || "").toLowerCase().includes("darkvision")
        ? number(trait.range, 0)
        : 0,
      textDarkvisionRange(`${trait?.name || ""} ${trait?.summary || ""} ${trait?.description || ""}`),
      String(trait?.id || "").toLowerCase().includes("darkvision") ? 60 : 0
    ))
  );
}

export function normalizeTokenVision(token = {}) {
  const vision = token?.vision && typeof token.vision === "object" ? token.vision : {};
  const linkedDarkvision = Math.max(
    inferCharacterDarkvision(token?.linkedCharacter),
    senseRangeFromList(token?.linkedCharacter?.senses),
    senseRangeFromList(token?.linkedCharacter?.featMechanics?.senses)
  );
  const fallbackDistance = token?.type === "player" || token?.linkedCharacterId ? 30 : 0;
  return Object.freeze({
    distance: clamp(vision.distance ?? token.visionDistance ?? fallbackDistance, 0, MAX_VISION_DISTANCE),
    darkvision: clamp(
      vision.darkvision ?? token.darkvisionDistance ?? linkedDarkvision,
      0,
      MAX_VISION_DISTANCE
    ),
    brightLight: clamp(vision.brightLight ?? token.lightBrightRadius, 0, MAX_VISION_DISTANCE),
    dimLight: clamp(vision.dimLight ?? token.lightDimRadius, 0, MAX_VISION_DISTANCE)
  });
}

export function effectiveVisionDistance(token = {}) {
  const vision = normalizeTokenVision(token);
  return Math.max(vision.distance, vision.darkvision, vision.brightLight, vision.dimLight);
}

export function normalizeVisionWall(raw = {}, context = {}) {
  return Object.freeze({
    id: String(raw.id || "").trim(),
    roomCode: String(raw.roomCode || context.roomCode || "").trim(),
    mapId: String(raw.mapId || context.mapId || "").trim(),
    authorUid: String(raw.authorUid || context.userId || "").trim(),
    start: normalizeVisionPoint(raw.start),
    end: normalizeVisionPoint(raw.end),
    createdAtMillis: Math.max(0, Math.floor(number(raw.createdAtMillis, context.now || Date.now()))),
    updatedAtMillis: Math.max(0, Math.floor(number(raw.updatedAtMillis, context.now || Date.now())))
  });
}

export function wallHasLength(wall = {}) {
  const normalized = normalizeVisionWall(wall);
  return Math.hypot(
    normalized.end.x - normalized.start.x,
    normalized.end.y - normalized.start.y
  ) >= 2;
}

const cross = (a, b) => a.x * b.y - a.y * b.x;

function rayWallDistance(origin, direction, wall, maximum) {
  const segment = {
    x: wall.end.x - wall.start.x,
    y: wall.end.y - wall.start.y
  };
  const offset = {
    x: wall.start.x - origin.x,
    y: wall.start.y - origin.y
  };
  const denominator = cross(direction, segment);
  if (Math.abs(denominator) < 1e-9) return maximum;
  const rayDistance = cross(offset, segment) / denominator;
  const wallPosition = cross(offset, direction) / denominator;
  if (rayDistance < 0 || wallPosition < 0 || wallPosition > 1) return maximum;
  return Math.min(maximum, rayDistance);
}

export function buildVisibilityPolygon({
  origin,
  radius,
  walls = [],
  rayCount = 72
} = {}) {
  const center = normalizeVisionPoint(origin);
  const maximum = clamp(radius, 0, VISION_SPACE_SIZE * 2);
  if (maximum <= 0) return [];
  const angles = [];
  const count = Math.max(24, Math.min(180, Math.floor(number(rayCount, 72))));
  for (let index = 0; index < count; index += 1) {
    angles.push((index / count) * Math.PI * 2);
  }
  const normalizedWalls = (Array.isArray(walls) ? walls : [])
    .slice(0, MAX_VISION_WALLS)
    .map((wall) => normalizeVisionWall(wall))
    .filter(wallHasLength);
  normalizedWalls.forEach((wall) => {
    [wall.start, wall.end].forEach((point) => {
      const distance = Math.hypot(point.x - center.x, point.y - center.y);
      if (distance > maximum + 2) return;
      const angle = Math.atan2(point.y - center.y, point.x - center.x);
      angles.push(angle - 0.00008, angle, angle + 0.00008);
    });
  });
  return angles
    .sort((left, right) => left - right)
    .map((angle) => {
      const direction = { x: Math.cos(angle), y: Math.sin(angle) };
      let distance = maximum;
      normalizedWalls.forEach((wall) => {
        distance = rayWallDistance(center, direction, wall, distance);
      });
      return normalizeVisionPoint({
        x: center.x + direction.x * Math.max(0, distance - 0.12),
        y: center.y + direction.y * Math.max(0, distance - 0.12)
      });
    });
}

export function pointInPolygon(point, polygon = []) {
  let inside = false;
  const sample = normalizeVisionPoint(point);
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const crosses = (currentPoint.y > sample.y) !== (previousPoint.y > sample.y)
      && sample.x < ((previousPoint.x - currentPoint.x) * (sample.y - currentPoint.y))
        / ((previousPoint.y - currentPoint.y) || 1e-9) + currentPoint.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function createExplorationGrid(value = {}) {
  const resolution = Math.max(16, Math.min(128, Math.floor(number(value.resolution, EXPLORATION_RESOLUTION))));
  const expected = resolution * resolution;
  const source = String(value.cells || "").replace(/[^01]/g, "").slice(0, expected);
  return Object.freeze({
    resolution,
    cells: source.padEnd(expected, "0")
  });
}

export function markExploredPolygons(gridValue, polygons = []) {
  const grid = createExplorationGrid(gridValue);
  const cells = grid.cells.split("");
  const size = VISION_SPACE_SIZE / grid.resolution;
  const validPolygons = (Array.isArray(polygons) ? polygons : []).filter((polygon) => polygon.length >= 3);
  if (!validPolygons.length) return grid;
  for (let row = 0; row < grid.resolution; row += 1) {
    for (let column = 0; column < grid.resolution; column += 1) {
      const index = row * grid.resolution + column;
      if (cells[index] === "1") continue;
      const point = { x: (column + 0.5) * size, y: (row + 0.5) * size };
      if (validPolygons.some((polygon) => pointInPolygon(point, polygon))) cells[index] = "1";
    }
  }
  return Object.freeze({ resolution: grid.resolution, cells: cells.join("") });
}

export function explorationGridToPath(gridValue) {
  const grid = createExplorationGrid(gridValue);
  const size = VISION_SPACE_SIZE / grid.resolution;
  const commands = [];
  for (let row = 0; row < grid.resolution; row += 1) {
    let column = 0;
    while (column < grid.resolution) {
      const index = row * grid.resolution + column;
      if (grid.cells[index] !== "1") {
        column += 1;
        continue;
      }
      const start = column;
      while (column < grid.resolution && grid.cells[row * grid.resolution + column] === "1") {
        column += 1;
      }
      commands.push(`M${start * size} ${row * size}h${(column - start) * size}v${size}h-${(column - start) * size}Z`);
    }
  }
  return commands.join("");
}

export function stableVisionDocumentId(userId, mapId) {
  const source = `${String(userId || "")}\u0000${String(mapId || "")}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `vision-${String(userId || "anonymous").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80)}-${(hash >>> 0).toString(36)}`;
}
