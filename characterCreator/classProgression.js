function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number)
    ? number
    : fallback;
}

function cleanString(value, fallback = "") {
  const text = String(
    value == null
      ? ""
      : value
  ).trim();
  return text || fallback;
}

function clampLevel(value) {
  return Math.max(
    1,
    Math.min(
      20,
      Math.round(
        safeNumber(value, 1)
      )
    )
  );
}



export const SRD_2014_STANDARD_ASI_LEVELS =
    Object.freeze([4, 8, 12, 16, 19]);

export const SRD_2014_FIGHTER_ASI_LEVELS =
    Object.freeze([4, 6, 8, 12, 14, 16, 19]);

export const SRD_2014_ROGUE_ASI_LEVELS =
    Object.freeze([4, 8, 10, 12, 16, 19]);

export function getProgressionValueByLevel(
    values,
    level,
    fallback = 0
  ) {
    if (!values || typeof values !== "object") {
      return fallback;
    }

    const cleanLevel = clampLevel(level);

    const readValue = (key) => {
      const value = values[key];

      if (value === undefined || value === null) {
        return fallback;
      }

      if (
        typeof fallback === "number" &&
        typeof value === "string" &&
        value.trim() !== "" &&
        Number.isFinite(Number(value))
      ) {
        return Number(value);
      }

      return value;
    };

    if (
      values[cleanLevel] !== undefined
    ) {
      return readValue(cleanLevel);
    }

    const previousLevel =
      Object.keys(values)
        .map((key) => {
          return safeNumber(key, 0);
        })
        .filter((key) => {
          return key > 0 && key <= cleanLevel;
        })
        .sort((a, b) => {
          return b - a;
        })[0];

    if (previousLevel) {
      return readValue(previousLevel);
    }

    return fallback;
  }

export const MAX_CHARACTER_LEVEL = 20;

export function calculateClassProgressionLevel(
  classEntries = []
) {
  return Math.min(
    MAX_CHARACTER_LEVEL,
    (Array.isArray(classEntries)
      ? classEntries
      : []
    ).reduce((total, entry) => {
      return (
        total +
        Math.max(
          0,
          Math.round(
            safeNumber(
              entry?.level,
              0
            )
          )
        )
      );
    }, 0)
  );
}

export function buildClassLevelOrder(
  classEntries = []
) {
  return (Array.isArray(classEntries)
    ? classEntries
    : []
  ).flatMap((entry, index) => {
    const key =
      cleanString(
        entry?.entryId ||
        entry?.classEntryId ||
        entry?.classId,
        `class-${index + 1}`
      );
    const level = Math.max(
      0,
      Math.round(
        safeNumber(
          entry?.level,
          0
        )
      )
    );

    return Array.from(
      { length: level },
      () => key
    );
  }).slice(0, MAX_CHARACTER_LEVEL);
}

