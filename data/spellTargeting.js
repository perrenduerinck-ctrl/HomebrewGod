export const SPELL_TARGETING_SCHEMA_VERSION = 1;

export const SPELL_RANGE_TYPES = Object.freeze([
  "distance",
  "self",
  "touch",
  "sight",
  "unlimited",
  "special"
]);

export const SPELL_TARGET_TYPES = Object.freeze([
  "creature",
  "point",
  "direction",
  "self",
  "special"
]);

export const SPELL_AREA_SHAPES = Object.freeze([
  "sphere",
  "cone",
  "line",
  "cube",
  "cylinder",
  "wall"
]);

const DURATION_TYPES = Object.freeze([
  "instantaneous",
  "timed",
  "until-dispelled",
  "special"
]);

const DURATION_UNITS = Object.freeze([
  "round",
  "minute",
  "hour",
  "day"
]);

const SAVE_ABILITIES = Object.freeze([
  "str",
  "dex",
  "con",
  "int",
  "wis",
  "cha"
]);

const ATTACK_TYPES = Object.freeze([
  "melee",
  "ranged",
  "melee-weapon",
  "ranged-weapon"
]);

const TARGET_OVERRIDES = Object.freeze({
  "booming-blade": "creature",
  "burning-hands": "direction",
  fireball: "point",
  "green-flame-blade": "creature",
  "lightning-bolt": "direction",
  "lightning-lure": "creature",
  "sword-burst": "self",
  thunderclap: "self",
  "word-of-radiance": "self"
});

const AREA_OVERRIDES = Object.freeze({
  "blade-barrier": Object.freeze({
    shape: "wall",
    length: 100,
    height: 20,
    width: 5
  }),
  "booming-blade": null,
  "burning-hands": Object.freeze({
    shape: "cone",
    length: 15
  }),
  fireball: Object.freeze({
    shape: "sphere",
    radius: 20
  }),
  "flame-strike": Object.freeze({
    shape: "cylinder",
    radius: 10,
    height: 40
  }),
  "green-flame-blade": null,
  "gust-of-wind": Object.freeze({
    shape: "line",
    length: 60,
    width: 10
  }),
  "ice-storm": Object.freeze({
    shape: "cylinder",
    radius: 20,
    height: 40
  }),
  "lightning-bolt": Object.freeze({
    shape: "line",
    length: 100,
    width: 5
  }),
  "lightning-lure": null,
  "magic-circle": Object.freeze({
    shape: "cylinder",
    radius: 10,
    height: 20
  }),
  moonbeam: Object.freeze({
    shape: "cylinder",
    radius: 5,
    height: 40
  }),
  "prismatic-wall": Object.freeze({
    shape: "wall",
    length: 90,
    height: 30,
    width: 1
  }),
  "reverse-gravity": Object.freeze({
    shape: "cylinder",
    radius: 50,
    height: 100
  }),
  "sleet-storm": Object.freeze({
    shape: "cylinder",
    radius: 40,
    height: 20
  }),
  "spike-growth": Object.freeze({
    shape: "cylinder",
    radius: 20,
    height: 0
  }),
  sunbeam: Object.freeze({
    shape: "line",
    length: 60,
    width: 5
  }),
  sunburst: Object.freeze({
    shape: "sphere",
    radius: 60
  }),
  "sword-burst": Object.freeze({
    shape: "sphere",
    radius: 5
  }),
  thunderclap: Object.freeze({
    shape: "sphere",
    radius: 5
  }),
  "wall-of-fire": Object.freeze({
    shape: "wall",
    length: 60,
    height: 20,
    width: 1
  }),
  "wall-of-thorns": Object.freeze({
    shape: "wall",
    length: 60,
    height: 10,
    width: 5
  }),
  "wind-wall": Object.freeze({
    shape: "wall",
    length: 50,
    height: 15,
    width: 1
  }),
  "word-of-radiance": Object.freeze({
    shape: "sphere",
    radius: 5
  })
});

const normalizeId = (value) => String(value || "")
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

const finiteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const freezeNullableRecord = (value) => value
  ? Object.freeze({ ...value })
  : null;

function normalizeRange(rangeText) {
  const text = String(rangeText || "").trim();
  const normalized = text.toLowerCase();
  const distance = normalized.match(
    /^(\d+(?:\.\d+)?)\s*(feet|foot|miles?|mile)$/
  );

  if (distance) {
    const amount = finiteNumber(distance[1]);
    const isMiles = distance[2].startsWith("mile");

    return Object.freeze({
      type: "distance",
      feet: isMiles ? amount * 5280 : amount,
      text
    });
  }

  let type = "special";
  if (normalized.startsWith("self")) type = "self";
  else if (normalized === "touch") type = "touch";
  else if (normalized === "sight") type = "sight";
  else if (normalized === "unlimited") type = "unlimited";

  return Object.freeze({
    type,
    feet: null,
    text
  });
}

function normalizeDuration(durationText, concentration) {
  const text = String(durationText || "").trim();
  const normalized = text
    .replace(/^concentration,\s*/i, "")
    .trim();
  const timed = normalized.match(
    /^(up to\s+)?(\d+)\s+(rounds?|minutes?|hours?|days?)$/i
  );

  if (/^instantaneous$/i.test(normalized)) {
    return Object.freeze({
      type: "instantaneous",
      amount: null,
      unit: null,
      upTo: false,
      concentration: concentration === true,
      text
    });
  }

  if (/^until dispelled$/i.test(normalized)) {
    return Object.freeze({
      type: "until-dispelled",
      amount: null,
      unit: null,
      upTo: false,
      concentration: concentration === true,
      text
    });
  }

  if (timed) {
    return Object.freeze({
      type: "timed",
      amount: Number(timed[2]),
      unit: timed[3].toLowerCase().replace(/s$/, ""),
      upTo: Boolean(timed[1]),
      concentration: concentration === true,
      text
    });
  }

  return Object.freeze({
    type: "special",
    amount: null,
    unit: null,
    upTo: false,
    concentration: concentration === true,
    text
  });
}

function normalizeLegacyArea(areaOfEffect) {
  if (
    !areaOfEffect ||
    typeof areaOfEffect !== "object"
  ) {
    return null;
  }

  const shape = normalizeId(areaOfEffect.type);
  const size = finiteNumber(areaOfEffect.size);
  if (
    !SPELL_AREA_SHAPES.includes(shape) ||
    size === null ||
    size <= 0
  ) {
    return null;
  }

  if (shape === "sphere") {
    return { shape, radius: size };
  }
  if (shape === "cone") {
    return { shape, length: size };
  }
  if (shape === "line") {
    return { shape, length: size };
  }
  if (shape === "cube") {
    return { shape, side: size };
  }
  if (shape === "cylinder") {
    return { shape, radius: size };
  }

  return { shape, length: size };
}

function normalizeArea(spellId, areaOfEffect) {
  if (Object.hasOwn(AREA_OVERRIDES, spellId)) {
    return freezeNullableRecord(
      AREA_OVERRIDES[spellId]
    );
  }

  return freezeNullableRecord(
    normalizeLegacyArea(areaOfEffect)
  );
}

function inferTargetType({
  spellId,
  range,
  area
}) {
  if (TARGET_OVERRIDES[spellId]) {
    return TARGET_OVERRIDES[spellId];
  }

  if (range.type === "special") {
    return "special";
  }

  if (range.type === "self") {
    if (
      area &&
      ["cone", "line", "cube", "wall"]
        .includes(area.shape)
    ) {
      return "direction";
    }
    return "self";
  }

  return area ? "point" : "creature";
}

export function createSpellTargetingData(rawSpell = {}) {
  const spellId = normalizeId(
    rawSpell.id || rawSpell.name
  );
  const range = normalizeRange(rawSpell.range);
  const area = normalizeArea(
    spellId,
    rawSpell.areaOfEffect
  );
  const target = Object.freeze({
    type: inferTargetType({
      spellId,
      range,
      area
    })
  });
  const duration = normalizeDuration(
    rawSpell.duration,
    rawSpell.concentration
  );
  const saveAbility = normalizeId(
    rawSpell.saveAbility
  );
  const attackType = normalizeId(
    rawSpell.attackType
  );

  return Object.freeze({
    schemaVersion:
      SPELL_TARGETING_SCHEMA_VERSION,
    range,
    target,
    area,
    duration,
    save: SAVE_ABILITIES.includes(saveAbility)
      ? Object.freeze({
          ability: saveAbility,
          success: String(
            rawSpell.saveSuccess || ""
          ).trim().toLowerCase()
        })
      : null,
    attack: ATTACK_TYPES.includes(attackType)
      ? Object.freeze({ type: attackType })
      : null
  });
}

function isFiniteNonNegative(value) {
  return Number.isFinite(value) && value >= 0;
}

export function validateSpellTargetingData(
  targeting,
  label = "Spell targeting"
) {
  const errors = [];
  const add = (condition, message) => {
    if (!condition) errors.push(`${label} ${message}`);
  };

  add(
    targeting && typeof targeting === "object",
    "must be an object."
  );
  if (!targeting || typeof targeting !== "object") {
    return { valid: false, errors };
  }

  add(
    targeting.schemaVersion ===
      SPELL_TARGETING_SCHEMA_VERSION,
    `must use schema version ${SPELL_TARGETING_SCHEMA_VERSION}.`
  );
  add(
    SPELL_RANGE_TYPES.includes(targeting.range?.type),
    "has an invalid range type."
  );
  add(
    typeof targeting.range?.text === "string" &&
      Boolean(targeting.range.text.trim()),
    "is missing its original range text."
  );
  if (targeting.range?.type === "distance") {
    add(
      Number.isFinite(targeting.range.feet) &&
        targeting.range.feet > 0,
      "must have a positive finite range in feet."
    );
  } else {
    add(
      targeting.range?.feet === null,
      "must not assign feet to a non-distance range."
    );
  }
  add(
    SPELL_TARGET_TYPES.includes(targeting.target?.type),
    "has an invalid target type."
  );

  if (targeting.area !== null) {
    add(
      targeting.area && typeof targeting.area === "object",
      "area must be null or an object."
    );
    add(
      SPELL_AREA_SHAPES.includes(targeting.area?.shape),
      "has an invalid area shape."
    );
    const dimensions = [
      "radius",
      "length",
      "width",
      "height",
      "side"
    ].filter((field) => (
      Object.hasOwn(targeting.area || {}, field)
    ));
    add(
      dimensions.length > 0,
      "area must have at least one dimension."
    );
    dimensions.forEach((field) => {
      add(
        isFiniteNonNegative(targeting.area[field]),
        `area ${field} must be a finite non-negative number.`
      );
    });
  }

  add(
    DURATION_TYPES.includes(targeting.duration?.type),
    "has an invalid duration type."
  );
  add(
    typeof targeting.duration?.text === "string" &&
      Boolean(targeting.duration.text.trim()),
    "is missing its original duration text."
  );
  add(
    typeof targeting.duration?.concentration === "boolean",
    "concentration must be a boolean."
  );
  if (targeting.duration?.type === "timed") {
    add(
      Number.isInteger(targeting.duration.amount) &&
        targeting.duration.amount > 0,
      "timed duration must have a positive whole-number amount."
    );
    add(
      DURATION_UNITS.includes(targeting.duration.unit),
      "timed duration has an invalid unit."
    );
  }

  if (targeting.save !== null) {
    add(
      SAVE_ABILITIES.includes(targeting.save?.ability),
      "has an invalid save ability."
    );
    add(
      typeof targeting.save?.success === "string",
      "save success must be a string."
    );
  }
  if (targeting.attack !== null) {
    add(
      ATTACK_TYPES.includes(targeting.attack?.type),
      "has an invalid attack type."
    );
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
