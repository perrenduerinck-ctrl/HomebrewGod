const SOURCE_TYPES = new Set(["monster", "character", "custom"]);
const SPAWN_LOCATIONS = new Set(["target", "caster", "around-caster", "around-target", "manual"]);
const SPAWN_TIMINGS = new Set(["start", "event", "end"]);
const OWNERSHIP_MODES = new Set(["dm", "caster", "player"]);
const INITIATIVE_MODES = new Set(["after-caster", "roll", "shared", "none"]);
const DURATION_MODES = new Set(["permanent", "dismissed", "rounds", "minutes", "concentration"]);
const END_MODES = new Set(["remove", "dismiss", "leave"]);
const TOKEN_TYPES = new Set(["player", "enemy", "npc", "object"]);
const SIZE_CATEGORIES = new Set(["tiny", "small", "medium", "large", "huge", "gargantuan"]);

const text = (value, fallback = "", maximum = 240) =>
  String(value ?? fallback).trim().slice(0, maximum) || fallback;

const choice = (value, choices, fallback) => {
  const candidate = text(value).toLowerCase();
  return choices.has(candidate) ? candidate : fallback;
};

const boundedInteger = (value, fallback, minimum, maximum) => {
  const parsed = Number(value);
  return Math.min(maximum, Math.max(minimum,
    Number.isFinite(parsed) ? Math.round(parsed) : fallback));
};

const safeHttps = (value) => {
  const candidate = text(value, "", 2048);
  return !candidate || /^https:\/\//i.test(candidate) ? candidate : "";
};

const point = (value, fallback = { x: 50, y: 50 }) => ({
  x: Math.min(100, Math.max(0, Number.isFinite(Number(value?.x)) ? Number(value.x) : fallback.x)),
  y: Math.min(100, Math.max(0, Number.isFinite(Number(value?.y)) ? Number(value.y) : fallback.y))
});

function legacyDuration(value = {}) {
  if (!value || typeof value !== "object") return null;
  if (value.concentration === true || value.requiresConcentration === true) {
    return { mode: "concentration", value: 1 };
  }
  const unit = text(value.unit || value.type).toLowerCase().replace(/s$/, "");
  if (unit === "round") return { mode: "rounds", value: boundedInteger(value.value ?? value.amount, 1, 1, 1000) };
  if (unit === "minute") return { mode: "minutes", value: boundedInteger(value.value ?? value.amount, 1, 1, 1000000) };
  if (unit === "manual") return { mode: "dismissed", value: 1 };
  return null;
}

/** Optional summon metadata stored on the existing combat animation attachment. */
export function normalizeSummonAutomation(value = {}) {
  const legacy = legacyDuration(value.duration);
  const requestedDuration = value.duration && typeof value.duration === "object"
    ? value.duration
    : {};
  const durationMode = choice(
    requestedDuration.mode || value.durationMode || legacy?.mode,
    DURATION_MODES,
    "permanent"
  );
  const durationValue = ["rounds", "minutes"].includes(durationMode)
    ? boundedInteger(requestedDuration.value ?? value.durationValue ?? legacy?.value, 1, 1, 1000000)
    : 1;
  const onEnd = choice(
    value.onEnd?.mode || value.onEnd || value.endMode,
    END_MODES,
    durationMode === "permanent" ? "leave" : "remove"
  );

  return Object.freeze({
    type: "summon-token",
    sourceType: choice(value.sourceType || value.tokenSource, SOURCE_TYPES, "custom"),
    sourceId: text(value.sourceId || value.monsterId || value.characterId, "", 180),
    name: text(value.name, "Summon", 120),
    imageUrl: safeHttps(value.imageUrl),
    sizeCategory: choice(value.sizeCategory, SIZE_CATEGORIES, "medium"),
    tokenType: choice(value.tokenType, TOKEN_TYPES, "npc"),
    spawnLocation: choice(value.spawnLocation || value.location, SPAWN_LOCATIONS, "target"),
    count: boundedInteger(value.count, 1, 1, 20),
    spawnTiming: choice(value.spawnTiming || value.timing, SPAWN_TIMINGS, "event"),
    eventName: text(value.eventName || value.animationEvent, "impact", 80).toLowerCase(),
    ownership: Object.freeze({
      mode: choice(value.ownership?.mode || value.ownership, OWNERSHIP_MODES, "dm"),
      playerUid: text(value.ownership?.playerUid || value.playerUid || value.ownerUid, "", 180)
    }),
    initiative: choice(value.initiative?.mode || value.initiative, INITIATIVE_MODES, "none"),
    duration: Object.freeze({ mode: durationMode, value: durationValue }),
    onEnd: Object.freeze({
      mode: onEnd,
      dismissAnimationId: text(
        value.onEnd?.dismissAnimationId || value.dismissAnimationId,
        "",
        180
      )
    }),
    placement: Object.freeze({
      preventOverlap: value.placement?.preventOverlap !== false,
      nearestFree: value.placement?.nearestFree !== false,
      allowDmOverride: value.placement?.allowDmOverride !== false
    })
  });
}

export function summonEffectDuration(value) {
  const summon = normalizeSummonAutomation(value);
  if (summon.duration.mode === "permanent") return null;
  if (summon.duration.mode === "dismissed") return { unit: "manual", value: 1, concentration: false };
  if (summon.duration.mode === "concentration") return { unit: "manual", value: 1, concentration: true };
  return {
    unit: summon.duration.mode,
    value: summon.duration.value,
    concentration: false
  };
}

function sameSurface(left = {}, right = {}) {
  if (left.mapMode && right.mapMode && left.mapMode !== right.mapMode) return false;
  if ((left.tileKey || right.tileKey) && left.tileKey !== right.tileKey) return false;
  return true;
}

function spiralOffsets(limit = 400) {
  const offsets = [{ x: 0, y: 0 }];
  for (let radius = 1; offsets.length < limit; radius += 1) {
    for (let x = -radius; x <= radius; x += 1) offsets.push({ x, y: -radius });
    for (let y = -radius + 1; y <= radius; y += 1) offsets.push({ x: radius, y });
    for (let x = radius - 1; x >= -radius; x -= 1) offsets.push({ x, y: radius });
    for (let y = radius - 1; y > -radius; y -= 1) offsets.push({ x: -radius, y });
  }
  return offsets.slice(0, limit);
}

const OFFSETS = spiralOffsets();

function originFor(summon, context) {
  if (["caster", "around-caster"].includes(summon.spawnLocation)) {
    return point(context.source || context.caster || context.point);
  }
  return point(context.target || context.targets?.[0] || context.point || context.source);
}

function occupied(candidate, tokens, step, surface) {
  return tokens.some((token) => sameSurface(token, surface) &&
    Math.abs(Number(token.x) - candidate.x) < step.x * 0.55 &&
    Math.abs(Number(token.y) - candidate.y) < step.y * 0.55);
}

export function findNearestFreeSummonPoint(requested, {
  tokens = [],
  grid = {},
  surface = {},
  includeOrigin = true
} = {}) {
  const base = point(requested);
  const step = {
    x: Math.max(0.5, Math.min(25, Number(grid.xPercent ?? grid.x) || Number(grid.percent) || 5)),
    y: Math.max(0.5, Math.min(25, Number(grid.yPercent ?? grid.y) || Number(grid.percent) || 5))
  };
  for (const offset of OFFSETS.slice(includeOrigin ? 0 : 1)) {
    const candidate = point({ x: base.x + offset.x * step.x, y: base.y + offset.y * step.y }, base);
    if (!occupied(candidate, tokens, step, surface)) return candidate;
  }
  return null;
}

/** Builds deterministic percent-based map positions without touching artwork or tokens. */
export function buildSummonPlacements(value, context = {}) {
  const summon = normalizeSummonAutomation(value);
  if (summon.spawnLocation === "manual") return [];
  const origin = originFor(summon, context);
  const step = {
    x: Math.max(0.5, Math.min(25, Number(context.grid?.xPercent) || Number(context.grid?.percent) || 5)),
    y: Math.max(0.5, Math.min(25, Number(context.grid?.yPercent) || Number(context.grid?.percent) || 5))
  };
  const surface = context.target || context.source || {};
  const tokens = (Array.isArray(context.tokens) ? context.tokens : []).map((token) => ({ ...token }));
  const positions = [];
  const startsAround = summon.spawnLocation.startsWith("around-");

  for (let index = 0; index < summon.count; index += 1) {
    const offset = OFFSETS[index + (startsAround ? 1 : 0)] || OFFSETS.at(-1);
    const requested = point({ x: origin.x + offset.x * step.x, y: origin.y + offset.y * step.y }, origin);
    let placement = requested;
    if (summon.placement.preventOverlap && occupied(placement, [...tokens, ...positions], step, surface)) {
      placement = summon.placement.nearestFree
        ? findNearestFreeSummonPoint(requested, {
            tokens: [...tokens, ...positions], grid: step, surface
          })
        : null;
    }
    if (!placement && summon.placement.allowDmOverride) placement = requested;
    if (!placement) {
      throw new Error("No free square was available for every summoned token.");
    }
    positions.push({ ...placement, mapMode: surface.mapMode, tileKey: surface.tileKey ?? null });
  }
  return positions;
}

export const SUMMON_AUTOMATION_OPTIONS = Object.freeze({
  sourceTypes: [...SOURCE_TYPES],
  spawnLocations: [...SPAWN_LOCATIONS],
  spawnTimings: [...SPAWN_TIMINGS],
  ownershipModes: [...OWNERSHIP_MODES],
  initiativeModes: [...INITIATIVE_MODES],
  durationModes: [...DURATION_MODES],
  endModes: [...END_MODES]
});
