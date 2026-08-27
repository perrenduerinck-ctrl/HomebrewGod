const finiteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed
    : 0;
};

const clamp = (value, minimum, maximum) => (
  Math.min(maximum, Math.max(minimum, value))
);

const EPSILON = 0.000001;

function normalizePoint(point = {}) {
  return Object.freeze({
    x: finiteNumber(point.x),
    y: finiteNumber(point.y)
  });
}

export function normalizeTokenFootprint(token = {}) {
  const left = finiteNumber(token.left ?? token.x);
  const top = finiteNumber(token.top ?? token.y);
  const width = Math.max(
    0,
    finiteNumber(token.width)
  );
  const height = Math.max(
    0,
    finiteNumber(token.height)
  );

  return Object.freeze({
    id: String(token.id || "").trim(),
    name: String(token.name || "Token").trim() || "Token",
    type: String(token.type || "token").trim() || "token",
    elevation: finiteNumber(
      token.elevation ?? token.elevationFeet
    ),
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    center: Object.freeze({
      x: left + width / 2,
      y: top + height / 2
    })
  });
}

function rectanglePoints(rectangle) {
  return [
    { x: rectangle.left, y: rectangle.top },
    { x: rectangle.right, y: rectangle.top },
    { x: rectangle.right, y: rectangle.bottom },
    { x: rectangle.left, y: rectangle.bottom }
  ];
}

function pointInsideRectangle(point, rectangle) {
  return (
    point.x >= rectangle.left - EPSILON &&
    point.x <= rectangle.right + EPSILON &&
    point.y >= rectangle.top - EPSILON &&
    point.y <= rectangle.bottom + EPSILON
  );
}

function pointOnSegment(point, start, end) {
  const cross = (
    (point.y - start.y) * (end.x - start.x) -
    (point.x - start.x) * (end.y - start.y)
  );
  if (Math.abs(cross) > EPSILON) return false;

  const dot = (
    (point.x - start.x) * (end.x - start.x) +
    (point.y - start.y) * (end.y - start.y)
  );
  if (dot < -EPSILON) return false;

  const squaredLength = (
    (end.x - start.x) ** 2 +
    (end.y - start.y) ** 2
  );
  return dot <= squaredLength + EPSILON;
}

function orientation(first, second, third) {
  const value = (
    (second.y - first.y) * (third.x - second.x) -
    (second.x - first.x) * (third.y - second.y)
  );
  if (Math.abs(value) <= EPSILON) return 0;
  return value > 0 ? 1 : 2;
}

function segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd) {
  const firstOrientation = orientation(
    firstStart,
    firstEnd,
    secondStart
  );
  const secondOrientation = orientation(
    firstStart,
    firstEnd,
    secondEnd
  );
  const thirdOrientation = orientation(
    secondStart,
    secondEnd,
    firstStart
  );
  const fourthOrientation = orientation(
    secondStart,
    secondEnd,
    firstEnd
  );

  if (
    firstOrientation !== secondOrientation &&
    thirdOrientation !== fourthOrientation
  ) {
    return true;
  }

  return (
    (
      firstOrientation === 0 &&
      pointOnSegment(secondStart, firstStart, firstEnd)
    ) ||
    (
      secondOrientation === 0 &&
      pointOnSegment(secondEnd, firstStart, firstEnd)
    ) ||
    (
      thirdOrientation === 0 &&
      pointOnSegment(firstStart, secondStart, secondEnd)
    ) ||
    (
      fourthOrientation === 0 &&
      pointOnSegment(firstEnd, secondStart, secondEnd)
    )
  );
}

function pointInsidePolygon(point, polygon) {
  let inside = false;

  for (
    let index = 0, previous = polygon.length - 1;
    index < polygon.length;
    previous = index++
  ) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];

    if (
      pointOnSegment(
        point,
        previousPoint,
        currentPoint
      )
    ) {
      return true;
    }

    const crosses = (
      (currentPoint.y > point.y) !==
        (previousPoint.y > point.y) &&
      point.x < (
        (previousPoint.x - currentPoint.x) *
        (point.y - currentPoint.y) /
        (previousPoint.y - currentPoint.y) +
        currentPoint.x
      )
    );

    if (crosses) inside = !inside;
  }

  return inside;
}

function polygonIntersectsRectangle(polygon, rectangle) {
  if (!polygon.length) return false;
  if (
    polygon.some((point) => (
      pointInsideRectangle(point, rectangle)
    ))
  ) {
    return true;
  }

  const rectPoints = rectanglePoints(rectangle);
  if (
    rectPoints.some((point) => (
      pointInsidePolygon(point, polygon)
    ))
  ) {
    return true;
  }

  for (let polygonIndex = 0; polygonIndex < polygon.length; polygonIndex += 1) {
    const polygonStart = polygon[polygonIndex];
    const polygonEnd = polygon[
      (polygonIndex + 1) % polygon.length
    ];

    for (let rectIndex = 0; rectIndex < rectPoints.length; rectIndex += 1) {
      const rectStart = rectPoints[rectIndex];
      const rectEnd = rectPoints[
        (rectIndex + 1) % rectPoints.length
      ];
      if (
        segmentsIntersect(
          polygonStart,
          polygonEnd,
          rectStart,
          rectEnd
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

function circleIntersectsRectangle(
  center,
  radius,
  rectangle
) {
  const closestX = clamp(
    center.x,
    rectangle.left,
    rectangle.right
  );
  const closestY = clamp(
    center.y,
    rectangle.top,
    rectangle.bottom
  );
  const deltaX = center.x - closestX;
  const deltaY = center.y - closestY;
  return (
    deltaX * deltaX + deltaY * deltaY <=
    radius * radius + EPSILON
  );
}

function horizontalDistanceSquared(
  center,
  rectangle
) {
  const closestX = clamp(
    center.x,
    rectangle.left,
    rectangle.right
  );
  const closestY = clamp(
    center.y,
    rectangle.top,
    rectangle.bottom
  );
  return (
    (center.x - closestX) ** 2 +
    (center.y - closestY) ** 2
  );
}

function elevationInsideVolume(geometry, elevation) {
  const bounds = geometry.verticalBounds;
  if (!bounds) return true;
  return (
    elevation >= bounds.minFeet - EPSILON &&
    elevation <= bounds.maxFeet + EPSILON
  );
}

export function templateGeometryToPolygon(
  geometry,
  { coneArcSegments = 24 } = {}
) {
  if (!geometry) return Object.freeze([]);

  if (
    geometry.shape === "line" ||
    geometry.shape === "square" ||
    geometry.shape === "cube"
  ) {
    return Object.freeze(
      (geometry.points || []).map(normalizePoint)
    );
  }

  if (geometry.shape !== "cone") {
    return Object.freeze([]);
  }

  const origin = normalizePoint(geometry.anchor);
  const radius = Math.max(
    0,
    finiteNumber(geometry.sizePixels)
  );
  const direction = finiteNumber(
    geometry.directionRadians
  );
  const angleRadians = clamp(
    finiteNumber(geometry.angleDegrees),
    1,
    359
  ) * Math.PI / 180;
  const segmentCount = clamp(
    Math.round(finiteNumber(coneArcSegments)),
    8,
    96
  );
  const points = [origin];

  for (let index = 0; index <= segmentCount; index += 1) {
    const progress = index / segmentCount;
    const radians = (
      direction - angleRadians / 2 +
      angleRadians * progress
    );
    points.push(
      Object.freeze({
        x: origin.x + Math.cos(radians) * radius,
        y: origin.y + Math.sin(radians) * radius
      })
    );
  }

  return Object.freeze(points);
}

export function tokenIntersectsTemplate(
  geometry,
  token
) {
  if (!geometry) return false;
  const footprint = normalizeTokenFootprint(token);

  if (
    footprint.width <= 0 ||
    footprint.height <= 0
  ) {
    return false;
  }

  if (geometry.shape === "circle") {
    return circleIntersectsRectangle(
      normalizePoint(geometry.anchor),
      Math.max(
        0,
        finiteNumber(geometry.sizePixels)
      ),
      footprint
    );
  }


  if (geometry.shape === "sphere") {
    const radius = Math.max(
      0,
      finiteNumber(geometry.sizePixels)
    );
    const verticalPixels = (
      footprint.elevation -
      finiteNumber(geometry.elevationFeet)
    ) * Math.max(
      0,
      finiteNumber(geometry.pixelsPerFoot)
    );
    return (
      horizontalDistanceSquared(
        normalizePoint(geometry.anchor),
        footprint
      ) + verticalPixels ** 2 <=
      radius ** 2 + EPSILON
    );
  }

  if (geometry.shape === "cylinder") {
    return (
      elevationInsideVolume(
        geometry,
        footprint.elevation
      ) &&
      circleIntersectsRectangle(
        normalizePoint(geometry.anchor),
        Math.max(
          0,
          finiteNumber(geometry.sizePixels)
        ),
        footprint
      )
    );
  }

  if (
    geometry.shape === "cube" &&
    !elevationInsideVolume(
      geometry,
      footprint.elevation
    )
  ) {
    return false;
  }

  return polygonIntersectsRectangle(
    templateGeometryToPolygon(geometry),
    footprint
  );
}

export function findAffectedTokens(
  geometry,
  tokens = []
) {
  if (!geometry || !Array.isArray(tokens)) {
    return Object.freeze([]);
  }

  return Object.freeze(
    tokens
      .map(normalizeTokenFootprint)
      .filter((token) => (
        tokenIntersectsTemplate(
          geometry,
          token
        )
      ))
  );
}
