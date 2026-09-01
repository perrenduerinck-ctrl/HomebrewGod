export const MOTION_25D_TYPES = Object.freeze([
  "stationary",
  "straight",
  "arc",
  "lob",
  "falling",
  "rising",
  "hovering",
  "homing"
]);

export const ROTATION_25D_MODES = Object.freeze([
  "fixed",
  "direction",
  "spin",
  "custom"
]);

const finiteNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const clamp = (value, minimum, maximum) => (
  Math.min(maximum, Math.max(minimum, value))
);

const clean = (value) => String(value || "").trim().toLowerCase();

const mix = (start, end, progress) => (
  start + (end - start) * progress
);

export function normalizeMotion25d(raw = {}, defaults = {}) {
  const source = raw === true ? {} : (raw || {});
  const fallback = defaults || {};
  const requestedType = clean(source.type || fallback.type || "stationary");
  const type = MOTION_25D_TYPES.includes(requestedType)
    ? requestedType
    : "stationary";
  const requestedRotation = clean(
    source.rotationMode || source.rotation ||
    fallback.rotationMode || fallback.rotation || "fixed"
  );
  const rotationMode = ROTATION_25D_MODES.includes(requestedRotation)
    ? requestedRotation
    : "fixed";

  return Object.freeze({
    type,
    maxZ: clamp(finiteNumber(source.maxZ, finiteNumber(fallback.maxZ, 0)), 0, 4096),
    startZ: clamp(finiteNumber(source.startZ, finiteNumber(fallback.startZ, 0)), -4096, 4096),
    endZ: clamp(finiteNumber(source.endZ, finiteNumber(fallback.endZ, 0)), -4096, 4096),
    hoverAmplitude: clamp(finiteNumber(
      source.hoverAmplitude,
      finiteNumber(fallback.hoverAmplitude, 10)
    ), 0, 512),
    hoverCycles: clamp(finiteNumber(
      source.hoverCycles,
      finiteNumber(fallback.hoverCycles, 1)
    ), 0, 20),
    speed: clamp(finiteNumber(source.speed, finiteNumber(fallback.speed, 0)), 0, 10000),
    easing: clean(source.easing || fallback.easing || "linear"),
    rotationMode,
    rotationOffset: clamp(finiteNumber(
      source.rotationOffset,
      finiteNumber(fallback.rotationOffset, 0)
    ), -3600, 3600),
    spins: clamp(finiteNumber(source.spins, finiteNumber(fallback.spins, 1)), -20, 20),
    customRotation: Object.freeze(
      (Array.isArray(source.customRotation) ? source.customRotation : [])
        .slice(0, 32)
        .map((keyframe) => Object.freeze({
          at: clamp(finiteNumber(keyframe?.at, 0), 0, 1),
          degrees: clamp(finiteNumber(keyframe?.degrees, 0), -3600, 3600)
        }))
        .sort((left, right) => left.at - right.at)
    )
  });
}

function ease(progress, name) {
  if (name === "ease-in") return progress * progress;
  if (name === "ease-out") return 1 - (1 - progress) ** 2;
  if (name === "ease-in-out") {
    return progress < 0.5
      ? 2 * progress * progress
      : 1 - (-2 * progress + 2) ** 2 / 2;
  }
  return progress;
}

function customRotationAt(keyframes, progress, fallback) {
  if (!keyframes.length) return fallback;
  const nextIndex = keyframes.findIndex(({ at }) => at >= progress);
  if (nextIndex === 0) return keyframes[0].degrees;
  if (nextIndex < 0) return keyframes.at(-1).degrees;
  const left = keyframes[nextIndex - 1];
  const right = keyframes[nextIndex];
  const span = Math.max(0.0001, right.at - left.at);
  return mix(left.degrees, right.degrees, (progress - left.at) / span);
}

export function resolveMotionDuration({
  duration,
  speed = 0,
  start,
  end,
  fallback = 900
} = {}) {
  const requested = Number(duration);
  if (Number.isFinite(requested)) return requested;
  const requestedSpeed = finiteNumber(speed, 0);
  if (requestedSpeed > 0 && start && end) {
    const distance = Math.hypot(
      finiteNumber(end.x) - finiteNumber(start.x),
      finiteNumber(end.y) - finiteNumber(start.y)
    );
    return distance / requestedSpeed * 1000;
  }
  return fallback;
}

export function calculateMotion25d({
  progress = 0,
  start = { x: 0, y: 0 },
  end = start,
  motion = {},
  baseRotation = 0
} = {}) {
  const normalized = normalizeMotion25d(motion);
  const rawProgress = clamp(finiteNumber(progress, 0), 0, 1);
  const travelProgress = ease(rawProgress, normalized.easing);
  const startX = finiteNumber(start?.x);
  const startY = finiteNumber(start?.y);
  const endX = finiteNumber(end?.x, startX);
  const endY = finiteNumber(end?.y, startY);
  const linearZ = mix(normalized.startZ, normalized.endZ, travelProgress);
  let z = linearZ;

  if (normalized.type === "arc") {
    z += Math.sin(rawProgress * Math.PI) * normalized.maxZ;
  } else if (normalized.type === "lob") {
    z += Math.sin(rawProgress * Math.PI) ** 0.72 * normalized.maxZ;
  } else if (normalized.type === "falling") {
    z = mix(normalized.startZ, normalized.endZ, rawProgress ** 2);
  } else if (normalized.type === "rising") {
    z = mix(normalized.startZ, normalized.endZ, 1 - (1 - rawProgress) ** 2);
  } else if (normalized.type === "hovering") {
    z = linearZ + Math.sin(
      rawProgress * Math.PI * 2 * normalized.hoverCycles
    ) * normalized.hoverAmplitude;
  }

  const direction = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
  let rotation = finiteNumber(baseRotation) + normalized.rotationOffset;
  if (normalized.rotationMode === "direction") {
    rotation += direction;
  } else if (normalized.rotationMode === "spin") {
    rotation += rawProgress * 360 * normalized.spins;
  } else if (normalized.rotationMode === "custom") {
    rotation = customRotationAt(
      normalized.customRotation,
      rawProgress,
      rotation
    );
  }

  const movesXY = normalized.type !== "stationary" &&
    normalized.type !== "falling" &&
    normalized.type !== "rising" &&
    normalized.type !== "hovering";
  return Object.freeze({
    progress: rawProgress,
    x: movesXY ? mix(startX, endX, travelProgress) : startX,
    y: movesXY ? mix(startY, endY, travelProgress) : startY,
    z,
    screenX: movesXY ? mix(startX, endX, travelProgress) : startX,
    screenY: (movesXY ? mix(startY, endY, travelProgress) : startY) - z,
    rotation,
    direction
  });
}

export function calculateHeightScale(z, raw = {}) {
  if (raw !== true && raw?.enabled !== true) return 1;
  const options = raw === true ? {} : raw;
  const amount = clamp(finiteNumber(options.amount, 0.0025), -0.1, 0.1);
  return clamp(
    1 + finiteNumber(z) * amount,
    clamp(finiteNumber(options.minimum, 0.55), 0.05, 20),
    clamp(finiteNumber(options.maximum, 1.45), 0.05, 20)
  );
}

export function calculateShadow25d(z, raw = {}) {
  const options = raw === true ? {} : (raw || {});
  const fadeDistance = Math.max(1, finiteNumber(options.fadeDistance, 180));
  const shrinkDistance = Math.max(1, finiteNumber(options.shrinkDistance, 260));
  return Object.freeze({
    opacity: clamp(
      finiteNumber(options.opacity, 0.55) * (1 - Math.abs(z) / fadeDistance),
      0,
      1
    ),
    scale: clamp(1 - Math.abs(z) / shrinkDistance, 0.18, 1)
  });
}
