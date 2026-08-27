export const SPELL_VFX_EVENT_SCHEMA_VERSION = 1;
export const CONFIRMED_SPELL_VFX_EVENT =
  "homebrewgod:spell-cast-confirmed";
export const SPELL_VFX_DELIVERY_TYPES = Object.freeze([
  "projectile",
  "beam",
  "burst",
  "cone",
  "line",
  "aura",
  "self",
  "point",
  "impact"
]);

const MAX_AFFECTED_TOKENS = 256;
const MAX_DAMAGE_TYPES = 16;

function cleanText(value, fallback = "", maximum = 160) {
  return String(value ?? fallback)
    .trim()
    .slice(0, maximum);
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number)
    ? number
    : null;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function rounded(value, precision = 1000) {
  return Math.round(value * precision) / precision;
}

function normalizePoint(value) {
  if (!value || typeof value !== "object") return null;
  const x = finiteNumber(value.x);
  const y = finiteNumber(value.y);
  if (x === null || y === null) return null;
  const xRatio = finiteNumber(value.xRatio);
  const yRatio = finiteNumber(value.yRatio);

  return Object.freeze({
    x: rounded(x),
    y: rounded(y),
    xRatio: xRatio === null ? null : rounded(xRatio, 1000000),
    yRatio: yRatio === null ? null : rounded(yRatio, 1000000)
  });
}

function normalizeElevation(value, fallback = 0) {
  const elevation = finiteNumber(value);
  const safeFallback = finiteNumber(fallback) ?? 0;
  return clamp(
    Math.round(elevation ?? safeFallback),
    -1000,
    1000
  );
}

function normalizeNumericRecord(value, keys) {
  if (!value || typeof value !== "object") return null;
  const normalized = {};
  keys.forEach((key) => {
    const number = finiteNumber(value[key]);
    if (number !== null) {
      normalized[key] = rounded(number);
    }
  });
  return Object.keys(normalized).length
    ? Object.freeze(normalized)
    : null;
}

function normalizeGeometry(value) {
  if (!value || typeof value !== "object") return null;
  const points = (Array.isArray(value.points) ? value.points : [])
    .slice(0, 32)
    .map(normalizePoint)
    .filter(Boolean);
  const geometry = {
    shape: cleanText(value.shape, "point", 32).toLowerCase(),
    sizeFeet: finiteNumber(value.sizeFeet),
    widthFeet: finiteNumber(value.widthFeet),
    heightFeet: finiteNumber(value.heightFeet),
    elevationFeet: finiteNumber(value.elevationFeet),
    angleDegrees: finiteNumber(value.angleDegrees),
    sizePixels: finiteNumber(value.sizePixels),
    widthPixels: finiteNumber(value.widthPixels),
    pixelsPerFoot: finiteNumber(value.pixelsPerFoot),
    directionRadians: finiteNumber(value.directionRadians),
    anchor: normalizePoint(value.anchor),
    pointer: normalizePoint(value.pointer),
    startPoint: normalizePoint(value.startPoint),
    endPoint: normalizePoint(value.endPoint),
    labelPoint: normalizePoint(value.labelPoint),
    points: Object.freeze(points),
    verticalBounds: normalizeNumericRecord(
      value.verticalBounds,
      ["minFeet", "maxFeet", "heightFeet"]
    ),
    bounds: normalizeNumericRecord(
      value.bounds,
      ["minX", "minY", "maxX", "maxY", "width", "height"]
    )
  };

  [
    "sizeFeet",
    "widthFeet",
    "heightFeet",
    "elevationFeet",
    "angleDegrees",
    "sizePixels",
    "widthPixels",
    "pixelsPerFoot",
    "directionRadians"
  ].forEach((key) => {
    if (geometry[key] !== null) {
      geometry[key] = rounded(geometry[key]);
    }
  });

  return Object.freeze(geometry);
}

function normalizeAffectedTokens(value) {
  const seen = new Set();
  const tokens = [];

  for (const token of Array.isArray(value) ? value : []) {
    if (tokens.length >= MAX_AFFECTED_TOKENS) break;
    const id = cleanText(token?.id, "", 160);
    const name = cleanText(token?.name, "Token", 160) || "Token";
    const key = id || `name:${name.toLowerCase()}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);

    tokens.push(Object.freeze({
      id,
      name,
      type: cleanText(token?.type, "token", 48) || "token",
      elevation: finiteNumber(token?.elevation) === null
        ? null
        : normalizeElevation(token.elevation),
      center: normalizePoint(token?.center)
    }));
  }

  return Object.freeze(tokens);
}

function getDamageTypes(spell, requestedTypes) {
  const candidates = Array.isArray(requestedTypes)
    ? requestedTypes
    : [
        ...(Array.isArray(spell?.damage) ? spell.damage : [])
          .map((entry) => (
            entry?.damageType ??
            entry?.damage_type?.index ??
            entry?.damage_type?.name
          )),
        ...(Array.isArray(spell?.effects) ? spell.effects : [])
          .filter((entry) => (
            entry?.type === "damage" ||
            Boolean(entry?.damageType)
          ))
          .map((entry) => entry?.damageType)
      ];
  const seen = new Set();
  const result = [];

  for (const candidate of candidates) {
    const damageType = cleanText(candidate, "", 48).toLowerCase();
    if (!damageType || damageType === "damage" || seen.has(damageType)) {
      continue;
    }
    seen.add(damageType);
    result.push(damageType);
    if (result.length >= MAX_DAMAGE_TYPES) break;
  }

  return Object.freeze(result);
}

function getSpellLevel(value, spell) {
  const requested = finiteNumber(value);
  const base = finiteNumber(spell?.level) ?? 0;
  return clamp(Math.round(requested ?? base), 0, 9);
}

export function inferSpellVfxDeliveryType({
  spell = {},
  geometry = null,
  deliveryType = ""
} = {}) {
  const requested = cleanText(deliveryType, "", 32).toLowerCase();
  if (SPELL_VFX_DELIVERY_TYPES.includes(requested)) {
    return requested;
  }

  const shape = cleanText(
    geometry?.shape ?? spell?.targeting?.area?.shape ?? spell?.areaOfEffect?.type,
    "",
    32
  ).toLowerCase();
  const targetType = cleanText(
    spell?.targeting?.target?.type,
    "",
    32
  ).toLowerCase();
  const attackType = cleanText(
    spell?.targeting?.attack?.type ?? spell?.attackType,
    "",
    32
  ).toLowerCase();
  const hasArea = Boolean(
    geometry || spell?.targeting?.area || spell?.areaOfEffect
  );

  if (shape === "cone") return "cone";
  if (shape === "line") return "line";
  if (targetType === "self") return hasArea ? "aura" : "self";
  if (targetType === "point") return hasArea ? "burst" : "point";
  if (attackType.includes("ranged")) return "projectile";
  if (attackType.includes("melee") || targetType === "touch") {
    return "impact";
  }
  if (targetType === "direction") return "beam";
  if (hasArea) return "burst";
  if (["creature", "object"].includes(targetType)) return "impact";
  return "point";
}

function inferTargetPoint({
  targetPoint,
  casterPoint,
  geometry,
  deliveryType
}) {
  const requested = normalizePoint(targetPoint);
  if (requested) return requested;
  if (["self", "aura"].includes(deliveryType)) {
    return casterPoint;
  }
  if (["cone", "line", "beam", "projectile"].includes(deliveryType)) {
    return geometry?.pointer || geometry?.endPoint || geometry?.labelPoint ||
      geometry?.anchor || casterPoint;
  }
  return geometry?.anchor || geometry?.pointer || geometry?.labelPoint ||
    casterPoint;
}

export function createSpellVfxEvent({
  spell = {},
  spellId = spell?.id,
  spellName = spell?.name,
  casterToken = null,
  casterTokenId = casterToken?.id,
  casterPoint = null,
  casterElevation = casterToken?.elevation,
  targetPoint = null,
  targetElevation = null,
  geometry = null,
  affectedTokens = [],
  damageTypes = null,
  spellLevel = null,
  slot = null,
  intensity = null,
  deliveryType = ""
} = {}) {
  const normalizedCasterPoint = normalizePoint(casterPoint);
  const normalizedGeometry = normalizeGeometry(geometry);
  const normalizedSpellLevel = getSpellLevel(
    spellLevel ?? slot?.level,
    spell
  );
  const normalizedDeliveryType = inferSpellVfxDeliveryType({
    spell,
    geometry: normalizedGeometry,
    deliveryType
  });
  const requestedIntensity = finiteNumber(intensity);
  const normalizedIntensity = clamp(
    Math.round(
      requestedIntensity ?? Math.max(1, Math.ceil(normalizedSpellLevel / 2))
    ),
    1,
    5
  );

  return Object.freeze({
    schemaVersion: SPELL_VFX_EVENT_SCHEMA_VERSION,
    spellId: cleanText(spellId, "", 160),
    spellName: cleanText(spellName, "Spell", 160) || "Spell",
    casterTokenId: cleanText(casterTokenId, "", 160),
    casterPoint: normalizedCasterPoint,
    casterElevation: normalizeElevation(casterElevation),
    targetPoint: inferTargetPoint({
      targetPoint,
      casterPoint: normalizedCasterPoint,
      geometry: normalizedGeometry,
      deliveryType: normalizedDeliveryType
    }),
    targetElevation: normalizeElevation(
      targetElevation,
      normalizedGeometry?.elevationFeet ?? casterElevation
    ),
    geometry: normalizedGeometry,
    affectedTokens: normalizeAffectedTokens(affectedTokens),
    damageTypes: getDamageTypes(spell, damageTypes),
    spellLevel: normalizedSpellLevel,
    intensity: normalizedIntensity,
    deliveryType: normalizedDeliveryType
  });
}

export function dispatchConfirmedSpellVfxEvent(
  event,
  {
    eventTarget = globalThis.document,
    CustomEventClass = globalThis.CustomEvent
  } = {}
) {
  if (
    !eventTarget?.dispatchEvent ||
    typeof CustomEventClass !== "function"
  ) {
    return false;
  }

  try {
    return eventTarget.dispatchEvent(
      new CustomEventClass(
        CONFIRMED_SPELL_VFX_EVENT,
        { detail: event }
      )
    );
  } catch {
    return false;
  }
}
