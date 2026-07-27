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



export const SRD_2014_FULL_CASTER_SLOTS = Object.freeze({
    1: [2, 0, 0, 0, 0, 0, 0, 0, 0],
    2: [3, 0, 0, 0, 0, 0, 0, 0, 0],
    3: [4, 2, 0, 0, 0, 0, 0, 0, 0],
    4: [4, 3, 0, 0, 0, 0, 0, 0, 0],
    5: [4, 3, 2, 0, 0, 0, 0, 0, 0],
    6: [4, 3, 3, 0, 0, 0, 0, 0, 0],
    7: [4, 3, 3, 1, 0, 0, 0, 0, 0],
    8: [4, 3, 3, 2, 0, 0, 0, 0, 0],
    9: [4, 3, 3, 3, 1, 0, 0, 0, 0],
    10: [4, 3, 3, 3, 2, 0, 0, 0, 0],
    11: [4, 3, 3, 3, 2, 1, 0, 0, 0],
    12: [4, 3, 3, 3, 2, 1, 0, 0, 0],
    13: [4, 3, 3, 3, 2, 1, 1, 0, 0],
    14: [4, 3, 3, 3, 2, 1, 1, 0, 0],
    15: [4, 3, 3, 3, 2, 1, 1, 1, 0],
    16: [4, 3, 3, 3, 2, 1, 1, 1, 0],
    17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
    18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
    19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
    20: [4, 3, 3, 3, 3, 2, 2, 1, 1]
  });

export const SRD_2014_PACT_MAGIC = Object.freeze({
    1: { slots: 1, slotLevel: 1 },
    2: { slots: 2, slotLevel: 1 },
    3: { slots: 2, slotLevel: 2 },
    4: { slots: 2, slotLevel: 2 },
    5: { slots: 2, slotLevel: 3 },
    6: { slots: 2, slotLevel: 3 },
    7: { slots: 2, slotLevel: 4 },
    8: { slots: 2, slotLevel: 4 },
    9: { slots: 2, slotLevel: 5 },
    10: { slots: 2, slotLevel: 5 },
    11: { slots: 3, slotLevel: 5 },
    12: { slots: 3, slotLevel: 5 },
    13: { slots: 3, slotLevel: 5 },
    14: { slots: 3, slotLevel: 5 },
    15: { slots: 3, slotLevel: 5 },
    16: { slots: 3, slotLevel: 5 },
    17: { slots: 4, slotLevel: 5 },
    18: { slots: 4, slotLevel: 5 },
    19: { slots: 4, slotLevel: 5 },
    20: { slots: 4, slotLevel: 5 }
  });

export function slotsArrayToObject(slots) {
    const result = {};

    (slots || []).forEach((count, index) => {
      if (count > 0) {
        result[index + 1] = count;
      }
    });

    return result;
  }

export function getSrd2014SpellSlots(
    progressionType,
    classLevel
  ) {
    const level = clampLevel(classLevel);
    let casterLevel = 0;

    if (progressionType === "full-caster") {
      casterLevel = level;
    } else if (progressionType === "artificer") {
      casterLevel = Math.ceil(level / 2);
    } else if (progressionType === "half-caster") {
      casterLevel =
        level < 2
          ? 0
          : Math.ceil(level / 2);
    } else if (progressionType === "third-caster") {
      casterLevel =
        level < 3
          ? 0
          : Math.ceil(level / 3);
    }

    if (casterLevel < 1) {
      return {};
    }

    return slotsArrayToObject(
      SRD_2014_FULL_CASTER_SLOTS[
        Math.max(1, Math.min(20, casterLevel))
      ]
    );
  }

export function getSrd2014PactMagic(classLevel) {
    return {
      ...(SRD_2014_PACT_MAGIC[
        clampLevel(classLevel)
      ] || { slots: 0, slotLevel: 0 })
    };
  }

export function calculateSrd2014MulticlassSpellcasting(
    classEntries = []
  ) {
    const entries =
      Array.isArray(classEntries)
        ? classEntries
        : [];

    const casterLevel =
      entries.reduce((total, entry) => {
        const level =
          Math.max(
            0,
            Math.round(
              safeNumber(entry?.level, 0)
            )
          );

        const progression =
          entry?.spellcastingProgression ||
          entry?.progressionType ||
          "none";

        if (progression === "full-caster") {
          return total + level;
        }

        if (progression === "half-caster") {
          return total + Math.floor(level / 2);
        }

        if (progression === "artificer") {
          return total + Math.ceil(level / 2);
        }

        if (progression === "third-caster") {
          return total + Math.floor(level / 3);
        }

        return total;
      }, 0);

    const pactMagic =
      entries
        .filter((entry) => {
          return (
            (
              entry?.spellcastingProgression ||
              entry?.progressionType
            ) === "pact-magic"
          );
        })
        .map((entry) => {
          const pact =
            getSrd2014PactMagic(
              entry?.level
            );
          const classEntryId =
            cleanString(
              entry?.classEntryId ||
              entry?.entryId
            );
          const classId =
            cleanString(entry?.classId);
          const className =
            cleanString(entry?.className);

          return {
            ...pact,
            ...(
              classEntryId
                ? { classEntryId }
                : {}
            ),
            ...(
              classId
                ? { classId }
                : {}
            ),
            ...(
              className
                ? { className }
                : {}
            )
          };
        });

    return {
      casterLevel:
        Math.max(0, Math.min(20, casterLevel)),
      spellSlots:
        casterLevel > 0
          ? slotsArrayToObject(
              SRD_2014_FULL_CASTER_SLOTS[
                Math.max(
                  1,
                  Math.min(20, casterLevel)
                )
              ]
            )
          : {},
      pactMagic
    };
  }

