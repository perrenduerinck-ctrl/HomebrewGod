export const DEFAULT_TOKEN_ELEVATION_FEET = 0;
export const MIN_TOKEN_ELEVATION_FEET = -1000;
export const MAX_TOKEN_ELEVATION_FEET = 1000;
export const DEFAULT_VISUAL_PIXELS_PER_FOOT = 0.6;
export const MAX_VISUAL_ELEVATION_PIXELS = 240;

const finiteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed
    : null;
};

const clamp = (value, minimum, maximum) => (
  Math.min(maximum, Math.max(minimum, value))
);

export function normalizeElevation(
  value,
  fallback = DEFAULT_TOKEN_ELEVATION_FEET
) {
  const parsed = finiteNumber(value);
  const safeFallback = finiteNumber(fallback) ??
    DEFAULT_TOKEN_ELEVATION_FEET;

  return clamp(
    Math.round(parsed ?? safeFallback),
    MIN_TOKEN_ELEVATION_FEET,
    MAX_TOKEN_ELEVATION_FEET
  );
}

export function getTokenElevation(token = {}) {
  return normalizeElevation(
    token.elevation ?? token.elevationFeet,
    DEFAULT_TOKEN_ELEVATION_FEET
  );
}

export function measureSpatialDistance({
  horizontalFeet = 0,
  startElevationFeet = 0,
  endElevationFeet = 0
} = {}) {
  const horizontal = Math.max(
    0,
    finiteNumber(horizontalFeet) ?? 0
  );
  const startElevation = normalizeElevation(
    startElevationFeet
  );
  const endElevation = normalizeElevation(
    endElevationFeet
  );
  const verticalFeet = Math.abs(
    endElevation - startElevation
  );

  return Object.freeze({
    horizontalFeet: horizontal,
    verticalFeet,
    startElevationFeet: startElevation,
    endElevationFeet: endElevation,
    distanceFeet: Math.hypot(
      horizontal,
      verticalFeet
    )
  });
}

export function formatElevation(value) {
  const elevation = normalizeElevation(value);

  if (elevation === 0) return "Ground";
  return `${elevation > 0 ? "+" : ""}${elevation} ft`;
}

export function elevationToVisualPixels(
  value,
  pixelsPerFoot = DEFAULT_VISUAL_PIXELS_PER_FOOT
) {
  const elevation = normalizeElevation(value);
  const scale = clamp(
    finiteNumber(pixelsPerFoot) ?? DEFAULT_VISUAL_PIXELS_PER_FOOT,
    0,
    10
  );
  return clamp(
    elevation * scale,
    -MAX_VISUAL_ELEVATION_PIXELS,
    MAX_VISUAL_ELEVATION_PIXELS
  );
}
