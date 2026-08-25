import {
  DEFAULT_FEET_PER_SQUARE,
  DEFAULT_GRID_PIXEL_SIZE,
  normalizeFeetPerSquare,
  normalizeGridPixelSize
} from "./measurement.js";

export const TEMPLATE_SHAPES = Object.freeze([
  "circle",
  "cone",
  "line",
  "square"
]);

export const DEFAULT_TEMPLATE_OPTIONS = Object.freeze({
  circle: Object.freeze({
    sizeFeet: 20,
    widthFeet: 5,
    angleDegrees: 360
  }),
  cone: Object.freeze({
    sizeFeet: 15,
    widthFeet: 5,
    angleDegrees: 53.130102
  }),
  line: Object.freeze({
    sizeFeet: 100,
    widthFeet: 5,
    angleDegrees: 0
  }),
  square: Object.freeze({
    sizeFeet: 10,
    widthFeet: 10,
    angleDegrees: 0
  })
});

const finiteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed
    : null;
};

const clamp = (value, minimum, maximum) => (
  Math.min(maximum, Math.max(minimum, value))
);

const cleanCoordinate = (value) => (
  Math.round(value * 1000) / 1000
);

function normalizePoint(point = {}) {
  return Object.freeze({
    x: finiteNumber(point.x) ?? 0,
    y: finiteNumber(point.y) ?? 0
  });
}

function freezePoint(point) {
  return Object.freeze({
    x: cleanCoordinate(point.x),
    y: cleanCoordinate(point.y)
  });
}

function freezeBounds({
  minX,
  minY,
  maxX,
  maxY
}) {
  return Object.freeze({
    minX: cleanCoordinate(minX),
    minY: cleanCoordinate(minY),
    maxX: cleanCoordinate(maxX),
    maxY: cleanCoordinate(maxY),
    width: cleanCoordinate(maxX - minX),
    height: cleanCoordinate(maxY - minY)
  });
}

function boundsFromPoints(points) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  return freezeBounds({
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys)
  });
}

function pathFromPoints(points) {
  return points.map((point, index) => (
    `${index === 0 ? "M" : "L"} ${cleanCoordinate(point.x)} ${cleanCoordinate(point.y)}`
  )).join(" ") + " Z";
}

function pointAt(origin, radians, distance) {
  return freezePoint({
    x: origin.x + Math.cos(radians) * distance,
    y: origin.y + Math.sin(radians) * distance
  });
}

function formatFeet(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1);
}

export function normalizeTemplateShape(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return TEMPLATE_SHAPES.includes(normalized)
    ? normalized
    : "circle";
}

export function getDefaultTemplateOptions(shape) {
  const normalizedShape = normalizeTemplateShape(shape);
  return DEFAULT_TEMPLATE_OPTIONS[normalizedShape];
}

export function normalizeTemplateDistance(
  value,
  fallback = 5
) {
  const parsed = finiteNumber(value);
  const safeFallback = finiteNumber(fallback) ?? 5;
  return clamp(
    parsed === null
      ? safeFallback
      : parsed,
    1,
    1000
  );
}

export function normalizeTemplateAngle(
  value,
  fallback = 53.130102
) {
  const parsed = finiteNumber(value);
  const safeFallback = finiteNumber(fallback) ?? 53.130102;
  return clamp(
    parsed === null
      ? safeFallback
      : parsed,
    1,
    359
  );
}

export function feetToMapPixels(
  feet,
  {
    pixelsPerSquare = DEFAULT_GRID_PIXEL_SIZE,
    feetPerSquare = DEFAULT_FEET_PER_SQUARE
  } = {}
) {
  const safePixelsPerSquare = normalizeGridPixelSize(
    pixelsPerSquare
  );
  const safeFeetPerSquare = normalizeFeetPerSquare(
    feetPerSquare
  );
  const safeFeet = normalizeTemplateDistance(feet);
  return safeFeet / safeFeetPerSquare * safePixelsPerSquare;
}

export function getTemplateDirection(
  originPoint,
  pointerPoint,
  fallbackRadians = 0
) {
  const origin = normalizePoint(originPoint);
  const pointer = normalizePoint(pointerPoint);
  const deltaX = pointer.x - origin.x;
  const deltaY = pointer.y - origin.y;

  if (
    Math.abs(deltaX) < Number.EPSILON &&
    Math.abs(deltaY) < Number.EPSILON
  ) {
    return finiteNumber(fallbackRadians) ?? 0;
  }

  return Math.atan2(deltaY, deltaX);
}

export function formatTemplateLabel(geometry) {
  if (!geometry) return "";

  const size = formatFeet(geometry.sizeFeet);
  switch (geometry.shape) {
    case "circle":
      return `Circle · ${size}-ft radius`;
    case "cone":
      return `Cone · ${size} ft`;
    case "line":
      return `Line · ${size} ft × ${formatFeet(geometry.widthFeet)} ft`;
    case "square":
      return `Square · ${size} ft`;
    default:
      return `${size} ft`;
  }
}

export function createTemplateGeometry({
  shape = "circle",
  anchor = { x: 0, y: 0 },
  pointer = anchor,
  sizeFeet,
  widthFeet,
  angleDegrees,
  pixelsPerSquare = DEFAULT_GRID_PIXEL_SIZE,
  feetPerSquare = DEFAULT_FEET_PER_SQUARE
} = {}) {
  const normalizedShape = normalizeTemplateShape(shape);
  const defaults = getDefaultTemplateOptions(normalizedShape);
  const safeSizeFeet = normalizeTemplateDistance(
    sizeFeet,
    defaults.sizeFeet
  );
  const safeWidthFeet = normalizeTemplateDistance(
    widthFeet,
    defaults.widthFeet
  );
  const safeAngleDegrees = normalizeTemplateAngle(
    angleDegrees,
    defaults.angleDegrees || 53.130102
  );
  const safeAnchor = normalizePoint(anchor);
  const safePointer = normalizePoint(pointer);
  const sizePixels = feetToMapPixels(safeSizeFeet, {
    pixelsPerSquare,
    feetPerSquare
  });
  const widthPixels = feetToMapPixels(safeWidthFeet, {
    pixelsPerSquare,
    feetPerSquare
  });

  if (normalizedShape === "circle") {
    const center = freezePoint(safePointer);
    const radius = sizePixels;
    const path = [
      `M ${cleanCoordinate(center.x - radius)} ${center.y}`,
      `A ${cleanCoordinate(radius)} ${cleanCoordinate(radius)} 0 1 0 ${cleanCoordinate(center.x + radius)} ${center.y}`,
      `A ${cleanCoordinate(radius)} ${cleanCoordinate(radius)} 0 1 0 ${cleanCoordinate(center.x - radius)} ${center.y}`,
      "Z"
    ].join(" ");

    return Object.freeze({
      shape: normalizedShape,
      sizeFeet: safeSizeFeet,
      widthFeet: safeWidthFeet,
      angleDegrees: 360,
      sizePixels,
      widthPixels,
      anchor: center,
      pointer: center,
      directionRadians: 0,
      path,
      labelPoint: center,
      bounds: freezeBounds({
        minX: center.x - radius,
        minY: center.y - radius,
        maxX: center.x + radius,
        maxY: center.y + radius
      })
    });
  }

  if (normalizedShape === "square") {
    const center = freezePoint(safePointer);
    const half = sizePixels / 2;
    const points = [
      freezePoint({ x: center.x - half, y: center.y - half }),
      freezePoint({ x: center.x + half, y: center.y - half }),
      freezePoint({ x: center.x + half, y: center.y + half }),
      freezePoint({ x: center.x - half, y: center.y + half })
    ];

    return Object.freeze({
      shape: normalizedShape,
      sizeFeet: safeSizeFeet,
      widthFeet: safeSizeFeet,
      angleDegrees: 0,
      sizePixels,
      widthPixels: sizePixels,
      anchor: center,
      pointer: center,
      directionRadians: 0,
      points: Object.freeze(points),
      path: pathFromPoints(points),
      labelPoint: center,
      bounds: boundsFromPoints(points)
    });
  }

  const directionRadians = getTemplateDirection(
    safeAnchor,
    safePointer
  );

  if (normalizedShape === "cone") {
    const halfAngle = safeAngleDegrees * Math.PI / 360;
    const startPoint = pointAt(
      safeAnchor,
      directionRadians - halfAngle,
      sizePixels
    );
    const endPoint = pointAt(
      safeAnchor,
      directionRadians + halfAngle,
      sizePixels
    );
    const largeArc = safeAngleDegrees > 180 ? 1 : 0;
    const path = [
      `M ${safeAnchor.x} ${safeAnchor.y}`,
      `L ${startPoint.x} ${startPoint.y}`,
      `A ${cleanCoordinate(sizePixels)} ${cleanCoordinate(sizePixels)} 0 ${largeArc} 1 ${endPoint.x} ${endPoint.y}`,
      "Z"
    ].join(" ");
    const extremePoints = [
      freezePoint(safeAnchor),
      startPoint,
      endPoint,
      pointAt(safeAnchor, directionRadians, sizePixels)
    ];

    return Object.freeze({
      shape: normalizedShape,
      sizeFeet: safeSizeFeet,
      widthFeet: safeWidthFeet,
      angleDegrees: safeAngleDegrees,
      sizePixels,
      widthPixels,
      anchor: freezePoint(safeAnchor),
      pointer: freezePoint(safePointer),
      directionRadians,
      startPoint,
      endPoint,
      path,
      labelPoint: pointAt(
        safeAnchor,
        directionRadians,
        sizePixels * 0.58
      ),
      bounds: boundsFromPoints(extremePoints)
    });
  }

  const halfWidth = widthPixels / 2;
  const directionX = Math.cos(directionRadians);
  const directionY = Math.sin(directionRadians);
  const perpendicularX = -directionY * halfWidth;
  const perpendicularY = directionX * halfWidth;
  const end = {
    x: safeAnchor.x + directionX * sizePixels,
    y: safeAnchor.y + directionY * sizePixels
  };
  const points = [
    freezePoint({
      x: safeAnchor.x + perpendicularX,
      y: safeAnchor.y + perpendicularY
    }),
    freezePoint({
      x: end.x + perpendicularX,
      y: end.y + perpendicularY
    }),
    freezePoint({
      x: end.x - perpendicularX,
      y: end.y - perpendicularY
    }),
    freezePoint({
      x: safeAnchor.x - perpendicularX,
      y: safeAnchor.y - perpendicularY
    })
  ];

  return Object.freeze({
    shape: normalizedShape,
    sizeFeet: safeSizeFeet,
    widthFeet: safeWidthFeet,
    angleDegrees: 0,
    sizePixels,
    widthPixels,
    anchor: freezePoint(safeAnchor),
    pointer: freezePoint(safePointer),
    directionRadians,
    points: Object.freeze(points),
    path: pathFromPoints(points),
    labelPoint: pointAt(
      safeAnchor,
      directionRadians,
      sizePixels / 2
    ),
    bounds: boundsFromPoints(points)
  });
}
