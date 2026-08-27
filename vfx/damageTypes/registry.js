import {
  MAX_PARTICLES_PER_EFFECT
} from "../particles.js";

export const DAMAGE_TYPE_VISUAL_SCHEMA_VERSION = 1;
export const DAMAGE_TYPE_INTENSITY_LEVELS = 5;

const MAX_STYLE_TEXT = 64;
const MAX_BASE_PARTICLES = 64;
const MAX_AFTERMATH_DURATION_MS = 60000;
const DEFAULT_MULTIPLIERS = Object.freeze([
  0.55,
  0.8,
  1,
  1.35,
  1.75
]);

function cleanId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanText(value, fallback = "") {
  return String(value ?? fallback)
    .trim()
    .slice(0, MAX_STYLE_TEXT);
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

function boundedNumber(value, fallback, minimum, maximum) {
  return clamp(
    finiteNumber(value) ?? fallback,
    minimum,
    maximum
  );
}

function normalizeColor(value, fallback) {
  const color = String(value || "")
    .trim()
    .toLowerCase();
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(color)
    ? color
    : fallback;
}

function normalizeAssetPath(value) {
  const path = String(value || "").trim();
  if (
    !path ||
    path.includes("..") ||
    !/^assets\/vfx\/[a-z0-9_./-]+\.(?:png|webp)$/i.test(path)
  ) {
    return null;
  }
  return path;
}

function normalizeMultiplierList(
  value,
  {
    minimum = 0,
    maximum = 4,
    fallback = DEFAULT_MULTIPLIERS
  } = {}
) {
  const requested = Array.isArray(value)
    ? value
    : [];
  return Object.freeze(
    Array.from(
      { length: DAMAGE_TYPE_INTENSITY_LEVELS },
      (_, index) => boundedNumber(
        requested[index],
        fallback[index] ?? 1,
        minimum,
        maximum
      )
    )
  );
}

export function normalizeDamageTypeIntensity(
  value,
  fallback = 1
) {
  return clamp(
    Math.round(
      finiteNumber(value) ??
      finiteNumber(fallback) ??
      1
    ),
    1,
    DAMAGE_TYPE_INTENSITY_LEVELS
  );
}

export function defineDamageTypeVisual(
  definition = {}
) {
  const id = cleanId(definition.id);
  if (!id) {
    throw new TypeError(
      "Damage-type VFX definitions require a stable id."
    );
  }

  const defaultLabel = id.replace(
    /(^|-)([a-z])/g,
    (_, separator, letter) => (
      `${separator ? " " : ""}${letter.toUpperCase()}`
    )
  );

  const palette = definition.palette || {};
  const particleStyle = definition.particleStyle || {};
  const glowBehavior = definition.glowBehavior || {};
  const impactBehavior = definition.impactBehavior || {};
  const trailBehavior = definition.trailBehavior || {};
  const aftermathBehavior = definition.aftermathBehavior || {};
  const preferredFeedback = definition.preferredFeedback || {};
  const sprites = definition.sprites || {};
  const intensityScaling = definition.intensityScaling || {};

  return Object.freeze({
    schemaVersion: DAMAGE_TYPE_VISUAL_SCHEMA_VERSION,
    id,
    label: cleanText(definition.label) || defaultLabel,
    family: cleanId(definition.family || "other") || "other",
    palette: Object.freeze({
      primary: normalizeColor(palette.primary, "#ffffff"),
      secondary: normalizeColor(palette.secondary, "#cbd5e1"),
      glow: normalizeColor(palette.glow, "#ffffff"),
      aftermath: normalizeColor(palette.aftermath, "#64748b")
    }),
    particleStyle: Object.freeze({
      style: cleanId(particleStyle.style || "motes") || "motes",
      behavior: cleanId(
        particleStyle.behavior || "radial-drift"
      ) || "radial-drift",
      color: normalizeColor(
        particleStyle.color,
        normalizeColor(palette.primary, "#ffffff")
      ),
      secondaryColor: normalizeColor(
        particleStyle.secondaryColor,
        normalizeColor(palette.secondary, "#cbd5e1")
      ),
      count: Math.round(boundedNumber(
        particleStyle.count,
        12,
        0,
        MAX_BASE_PARTICLES
      )),
      size: boundedNumber(particleStyle.size, 5, 1, 64),
      distance: boundedNumber(
        particleStyle.distance,
        48,
        0,
        1000
      ),
      duration: Math.round(boundedNumber(
        particleStyle.duration,
        700,
        16,
        5000
      ))
    }),
    glowBehavior: Object.freeze({
      style: cleanId(glowBehavior.style || "radial") || "radial",
      color: normalizeColor(
        glowBehavior.color,
        normalizeColor(palette.glow, "#ffffff")
      ),
      strength: boundedNumber(
        glowBehavior.strength,
        1,
        0,
        2
      ),
      pulse: glowBehavior.pulse !== false
    }),
    impactBehavior: Object.freeze({
      style: cleanId(impactBehavior.style || "burst") || "burst",
      color: normalizeColor(
        impactBehavior.color,
        normalizeColor(palette.primary, "#ffffff")
      ),
      scale: boundedNumber(impactBehavior.scale, 1, 0.1, 10),
      duration: Math.round(boundedNumber(
        impactBehavior.duration,
        650,
        16,
        10000
      ))
    }),
    trailBehavior: Object.freeze({
      style: cleanId(trailBehavior.style || "fading-ribbon") ||
        "fading-ribbon",
      color: normalizeColor(
        trailBehavior.color,
        normalizeColor(palette.primary, "#ffffff")
      ),
      enabled: trailBehavior.enabled !== false,
      density: boundedNumber(trailBehavior.density, 0.5, 0, 1),
      width: boundedNumber(trailBehavior.width, 1, 0.1, 10),
      fadeDuration: Math.round(boundedNumber(
        trailBehavior.fadeDuration,
        450,
        16,
        5000
      ))
    }),
    aftermathBehavior: Object.freeze({
      style: cleanId(aftermathBehavior.style || "fade") || "fade",
      color: normalizeColor(
        aftermathBehavior.color,
        normalizeColor(palette.aftermath, "#64748b")
      ),
      opacity: boundedNumber(
        aftermathBehavior.opacity,
        0.4,
        0,
        1
      ),
      duration: Math.round(boundedNumber(
        aftermathBehavior.duration,
        1200,
        0,
        MAX_AFTERMATH_DURATION_MS
      )),
      persistent: aftermathBehavior.persistent === true
    }),
    preferredFeedback: Object.freeze({
      screenEffect: cleanId(
        preferredFeedback.screenEffect || "none"
      ) || "none",
      cameraEffect: cleanId(
        preferredFeedback.cameraEffect || "none"
      ) || "none",
      strength: boundedNumber(
        preferredFeedback.strength,
        0,
        0,
        1
      )
    }),
    sprites: Object.freeze({
      particle: normalizeAssetPath(sprites.particle),
      glow: normalizeAssetPath(sprites.glow),
      impact: normalizeAssetPath(sprites.impact),
      trail: normalizeAssetPath(sprites.trail),
      aftermath: normalizeAssetPath(sprites.aftermath)
    }),
    intensityScaling: Object.freeze({
      particleCount: normalizeMultiplierList(
        intensityScaling.particleCount
      ),
      glowStrength: normalizeMultiplierList(
        intensityScaling.glowStrength
      ),
      impactScale: normalizeMultiplierList(
        intensityScaling.impactScale
      ),
      trailDensity: normalizeMultiplierList(
        intensityScaling.trailDensity
      ),
      aftermathDuration: normalizeMultiplierList(
        intensityScaling.aftermathDuration
      ),
      feedbackStrength: normalizeMultiplierList(
        intensityScaling.feedbackStrength,
        {
          minimum: 0,
          maximum: 2,
          fallback: Object.freeze([
            0.25,
            0.5,
            0.75,
            1,
            1.25
          ])
        }
      )
    })
  });
}

export function scaleDamageTypeVisual(
  profile,
  intensity = 1
) {
  if (!profile?.id || !profile?.intensityScaling) {
    return null;
  }
  const level = normalizeDamageTypeIntensity(intensity);
  const index = level - 1;
  const scaling = profile.intensityScaling;

  return Object.freeze({
    damageType: profile.id,
    intensity: level,
    particleCount: clamp(
      Math.round(
        profile.particleStyle.count * scaling.particleCount[index]
      ),
      0,
      MAX_PARTICLES_PER_EFFECT
    ),
    glowStrength: clamp(
      profile.glowBehavior.strength * scaling.glowStrength[index],
      0,
      4
    ),
    impactScale: clamp(
      profile.impactBehavior.scale * scaling.impactScale[index],
      0.1,
      20
    ),
    trailDensity: clamp(
      profile.trailBehavior.density * scaling.trailDensity[index],
      0,
      1
    ),
    aftermathDuration: Math.round(clamp(
      profile.aftermathBehavior.duration *
        scaling.aftermathDuration[index],
      0,
      MAX_AFTERMATH_DURATION_MS
    )),
    feedbackStrength: clamp(
      profile.preferredFeedback.strength *
        scaling.feedbackStrength[index],
      0,
      1
    )
  });
}

export function createDamageTypeRegistry(
  initialDefinitions = []
) {
  const definitions = new Map();

  function register(
    definition,
    { replace = false } = {}
  ) {
    const normalized = defineDamageTypeVisual(definition);
    if (definitions.has(normalized.id) && replace !== true) {
      throw new Error(
        `Damage-type VFX definition already exists: ${normalized.id}`
      );
    }
    definitions.set(normalized.id, normalized);
    return normalized;
  }

  function get(id) {
    return definitions.get(cleanId(id)) || null;
  }

  initialDefinitions.forEach((definition) => {
    register(definition);
  });

  return Object.freeze({
    get,
    has: (id) => definitions.has(cleanId(id)),
    list: () => Object.freeze(
      Array.from(definitions.values())
    ),
    register,
    unregister: (id) => definitions.delete(cleanId(id))
  });
}
