import {
  DEFAULT_FEAT_ABILITY_SCORE_MAXIMUM
} from "../data/defaultFeats.js";

function cleanString(value, fallback = "") {
  const text = String(
    value == null
      ? ""
      : value
  ).trim();
  return text || fallback;
}

function uniqueCleanArray(value) {
  return [
    ...new Set(
      (Array.isArray(value)
        ? value
        : []
      ).map((entry) => {
        return cleanString(entry);
      }).filter(Boolean)
    )
  ];
}

function cleanId(value) {
  return cleanString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isRecord(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function readSpellIds(value) {
  return uniqueCleanArray(
    (Array.isArray(value) ? value : [value])
      .map((entry) => {
        return isRecord(entry)
          ? entry.spellId ||
            entry.id ||
            entry.name
          : entry;
      })
  )
    .map(cleanId)
    .filter(Boolean);
}



export const FEAT_CHOICE_VALUE_PREFIX = "feat-choice:";

export function normalizeFeatChoiceSelections(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(value)
        .map(([choiceId, selectedValues]) => {
          const cleanChoiceId = cleanString(choiceId);
          const values = uniqueCleanArray(
            Array.isArray(selectedValues)
              ? selectedValues
              : [selectedValues]
          );

          return [cleanChoiceId, values];
        })
        .filter(([choiceId, selectedValues]) => {
          return choiceId && selectedValues.length;
        })
    );
  }

export function encodeFeatChoiceValue(choiceId, value) {
    const cleanChoiceId = cleanString(choiceId);
    const cleanValue = cleanString(value);

    if (!cleanChoiceId || !cleanValue) {
      return "";
    }

    return (
      FEAT_CHOICE_VALUE_PREFIX +
      encodeURIComponent(cleanChoiceId) +
      ":" +
      encodeURIComponent(cleanValue)
    );
  }

export function decodeFeatChoiceValue(value) {
    const cleanValue = cleanString(value);

    if (!cleanValue.startsWith(FEAT_CHOICE_VALUE_PREFIX)) {
      return null;
    }

    const encoded = cleanValue.slice(FEAT_CHOICE_VALUE_PREFIX.length);
    const separatorIndex = encoded.indexOf(":");

    if (separatorIndex < 1) {
      return null;
    }

    try {
      const choiceId = decodeURIComponent(encoded.slice(0, separatorIndex));
      const selectedValue = decodeURIComponent(encoded.slice(separatorIndex + 1));

      return choiceId && selectedValue
        ? { choiceId, value: selectedValue }
        : null;
    } catch (error) {
      return null;
    }
  }

export function parseFeatChoiceSelections(values) {
    const selections = {};

    (Array.isArray(values) ? values : [])
      .forEach((value) => {
        const decoded = decodeFeatChoiceValue(value);

        if (!decoded) {
          return;
        }

        selections[decoded.choiceId] = uniqueCleanArray([
          ...(selections[decoded.choiceId] || []),
          decoded.value
        ]);
      });

    return selections;
  }

export function getFeatAbilityEffectMaximum(
  effect
) {
  const maximum = Number(
    effect?.maximum ??
    DEFAULT_FEAT_ABILITY_SCORE_MAXIMUM
  );

  return Number.isFinite(maximum)
    ? Math.max(
        1,
        Math.min(
          30,
          Math.round(maximum)
        )
      )
    : DEFAULT_FEAT_ABILITY_SCORE_MAXIMUM;
}

export function getFeatSpellChoiceLimit(
  choice,
  proficiencyBonus = 2
) {
  const bonus = Math.max(
    1,
    Math.round(Number(proficiencyBonus) || 2)
  );

  if (
    choice?.chooseFormula ===
    "halfProficiencyBonus"
  ) {
    return Math.max(1, Math.floor(bonus / 2));
  }

  if (
    choice?.chooseFormula ===
    "proficiencyBonus"
  ) {
    return bonus;
  }

  return Math.max(
    1,
    Math.round(Number(choice?.choose) || 1)
  );
}

function getAlignmentGroup(value) {
  const alignment = cleanString(value).toLowerCase();

  if (alignment.includes("evil")) {
    return "evil";
  }
  if (alignment.includes("good")) {
    return "good";
  }
  if (alignment) {
    return "neutral";
  }

  return "";
}

function getMappedValue(map, key) {
  if (!isRecord(map) || !key) {
    return null;
  }

  const normalizedKey = cleanId(key);
  const entry = Object.entries(map)
    .find(([candidate]) => {
      return cleanId(candidate) === normalizedKey;
    });

  return entry ? entry[1] : null;
}

export function resolveFeatSpellChoiceRestrictions(
  choice,
  {
    selections = {},
    alignment = ""
  } = {}
) {
  const normalizedSelections =
    normalizeFeatChoiceSelections(selections);
  const classChoiceId = cleanString(
    choice?.classChoiceId
  );
  const optionChoiceId = cleanString(
    choice?.optionChoiceId ||
    choice?.moonChoiceId
  );
  const selectedClassId = cleanId(
    classChoiceId
      ? normalizedSelections[classChoiceId]?.[0]
      : choice?.classId
  );
  const selectedOption = cleanString(
    optionChoiceId
      ? normalizedSelections[optionChoiceId]?.[0]
      : ""
  );
  const alignmentGroup = getAlignmentGroup(
    alignment
  );
  const alignmentClassId = cleanId(
    getMappedValue(
      choice?.classIdByAlignment,
      alignmentGroup
    )
  );
  const mappedSpellIds = getMappedValue(
    choice?.allowedSpellIdsByChoice,
    selectedOption
  );
  const allowedSpellIds = readSpellIds([
    ...uniqueCleanArray(
      choice?.allowedSpellIds
    ),
    ...uniqueCleanArray(mappedSpellIds)
  ]);
  const levels = [
    ...new Set(
      (Array.isArray(choice?.levels)
        ? choice.levels
        : []
      ).map((level) => {
        return Number(level);
      }).filter((level) => {
        return (
          Number.isInteger(level) &&
          level >= 0 &&
          level <= 9
        );
      })
    )
  ];
  const allowedClassLists = uniqueCleanArray([
    selectedClassId,
    alignmentClassId
  ]).map(cleanId).filter(Boolean);
  const unresolvedReason =
    classChoiceId && !selectedClassId
      ? "Choose the spell list first."
      : optionChoiceId &&
        isRecord(
          choice?.allowedSpellIdsByChoice
        ) &&
        (!selectedOption || mappedSpellIds === null)
        ? !selectedOption
          ? `Choose ${cleanString(optionChoiceId).replace(/-/g, " ")} first.`
          : `The selected ${cleanString(optionChoiceId).replace(/-/g, " ")} option is not valid.`
        : isRecord(
            choice?.classIdByAlignment
          ) &&
          !alignmentGroup
          ? "Enter an alignment or outlook in Basics first."
          : "";
  const selectionMode =
    choice?.ritualOnly === true
      ? "ritual-only"
      : allowedClassLists.length
        ? "class-list"
        : allowedSpellIds.length ||
          cleanString(choice?.list)
          ? "choose-from-list"
          : "choose-from-catalog";

  return {
    selectionMode,
    allowedSpellIds,
    allowedClassLists,
    allowedSchools: uniqueCleanArray(
      choice?.schools
    ).map(cleanId).filter(Boolean),
    levels,
    minimumSpellLevel:
      levels.length ? Math.min(...levels) : null,
    maximumSpellLevel:
      levels.length ? Math.max(...levels) : null,
    ritualOnly: choice?.ritualOnly === true,
    attackRollOnly:
      choice?.attackRollOnly === true,
    unresolvedReason
  };
}

export function getFeatSpellIneligibilityReasons(
  spell,
  choice,
  context = {}
) {
  const restrictions =
    resolveFeatSpellChoiceRestrictions(
      choice,
      context
    );
  const reasons = [];
  const spellId = cleanId(
    spell?.id || spell?.spellId || spell?.name
  );
  const level = Number(spell?.level);
  const classes = uniqueCleanArray(
    spell?.classes
  ).map(cleanId);
  const school = cleanId(spell?.school);
  const attackType = cleanId(
    spell?.attackType
  );

  if (restrictions.unresolvedReason) {
    reasons.push(restrictions.unresolvedReason);
  }
  if (
    restrictions.allowedSpellIds.length &&
    !restrictions.allowedSpellIds.includes(
      spellId
    )
  ) {
    reasons.push("Not on this feat's allowed spell list.");
  }
  if (
    restrictions.allowedClassLists.length &&
    !restrictions.allowedClassLists.some(
      (classId) => classes.includes(classId)
    )
  ) {
    reasons.push("Not on the selected class spell list.");
  }
  if (
    restrictions.levels.length &&
    !restrictions.levels.includes(level)
  ) {
    reasons.push("Outside the allowed spell level.");
  }
  if (
    restrictions.allowedSchools.length &&
    !restrictions.allowedSchools.includes(school)
  ) {
    reasons.push("Outside the allowed spell schools.");
  }
  if (
    restrictions.ritualOnly &&
    spell?.ritual !== true
  ) {
    reasons.push("This feat allows ritual spells only.");
  }
  if (
    restrictions.attackRollOnly &&
    !["melee", "ranged", "melee-weapon", "ranged-weapon"]
      .includes(attackType)
  ) {
    reasons.push("This feat requires a spell attack roll.");
  }

  return uniqueCleanArray(reasons);
}

export function isSpellEligibleForFeatChoice(
  spell,
  choice,
  context = {}
) {
  return !getFeatSpellIneligibilityReasons(
    spell,
    choice,
    context
  ).length;
}

export function describeFeatSpellChoiceRestrictions(
  choice,
  context = {}
) {
  const restrictions =
    resolveFeatSpellChoiceRestrictions(
      choice,
      context
    );

  if (restrictions.unresolvedReason) {
    return restrictions.unresolvedReason;
  }

  const details = [];

  if (restrictions.allowedSpellIds.length) {
    details.push(
      `${restrictions.allowedSpellIds.length} named spell option${restrictions.allowedSpellIds.length === 1 ? "" : "s"}`
    );
  }
  if (restrictions.allowedClassLists.length) {
    details.push(
      `${restrictions.allowedClassLists.join(" or ")} spell list`
    );
  }
  if (restrictions.levels.length) {
    details.push(
      restrictions.levels.length === 1 &&
      restrictions.levels[0] === 0
        ? "cantrips only"
        : `level ${restrictions.levels.join(" or ")}`
    );
  }
  if (restrictions.allowedSchools.length) {
    details.push(
      `${restrictions.allowedSchools.join(" or ")} school`
    );
  }
  if (restrictions.ritualOnly) {
    details.push("rituals only");
  }
  if (restrictions.attackRollOnly) {
    details.push("spell-attack cantrips only");
  }

  return `Eligible: ${details.join(", ") || "the feat's spell catalog"}. Other spells are hidden because they do not meet these restrictions.`;
}

export function createFeatSpellSourceMetadata({
  feat,
  sourceId,
  selections = {},
  spellRecords = [],
  spellGrants = [],
  alignment = "",
  proficiencyBonus = 2
}) {
  const choices = Array.isArray(feat?.choices)
    ? feat.choices.filter((choice) => {
        return cleanString(choice?.type)
          .toLowerCase() === "spell";
      })
    : [];
  const normalizedSelections =
    normalizeFeatChoiceSelections(selections);
  const records = Array.isArray(spellRecords)
    ? spellRecords
    : [];
  const selectionGroups = choices.map(
    (choice) => {
      const restrictions =
        resolveFeatSpellChoiceRestrictions(
          choice,
          {
            selections:
              normalizedSelections,
            alignment
          }
        );

      return {
        sourceFeatureId:
          `${sourceId}:${choice.id}`,
        sourceFeatureName:
          cleanString(choice.label, choice.id),
        selectionMode:
          restrictions.selectionMode,
        choiceCount:
          getFeatSpellChoiceLimit(
            choice,
            proficiencyBonus
          ),
        selectedSpellIds: readSpellIds(
          records.filter((record) => {
            return (
              cleanString(record?.origin) ===
                "choice" &&
              cleanString(record?.choiceId) ===
                cleanString(choice.id)
            );
          })
        ),
        ...restrictions
      };
    }
  );
  const fixedSpellIds = readSpellIds([
    ...spellGrants.flatMap((grant) => {
      return readSpellIds(
        grant?.spellIds || grant?.spellId
      );
    }),
    ...records.filter((record) => {
      return (
        record?.fixed === true ||
        cleanString(record?.origin) !==
          "choice"
      );
    })
  ]);
  const selectedSpellIds = readSpellIds([
    ...selectionGroups.flatMap((group) => {
      return group.selectedSpellIds;
    }),
    ...records.filter((record) => {
      return cleanString(record?.origin) ===
        "choice";
    })
  ]).filter((spellId) => {
    return !fixedSpellIds.includes(spellId);
  });
  const sourceAbilities = uniqueCleanArray(
    records.map((record) => {
      return record?.spellcastingAbility;
    })
  );
  const rechargeTypes = uniqueCleanArray(
    records.map((record) => record?.recharge)
  );
  const resourceIds = uniqueCleanArray(
    records.map((record) => record?.resourceId)
  );
  const levels = selectionGroups.flatMap(
    (group) => group.levels
  );
  const modes = uniqueCleanArray(
    selectionGroups.map((group) => {
      return group.selectionMode;
    })
  );

  return {
    sourceId,
    sourceType: "feat",
    sourceName: cleanString(
      feat?.name,
      feat?.id || "Feat"
    ),
    sourceFeatureId: sourceId,
    sourceFeatureName: cleanString(
      feat?.name,
      "Feat spells"
    ),
    featId: cleanString(feat?.id),
    selectionMode:
      modes.length === 1
        ? modes[0]
        : selectionGroups.length
          ? "choose-from-catalog"
          : "fixed",
    choiceCount: selectionGroups.reduce(
      (total, group) => {
        return total + group.choiceCount;
      },
      0
    ),
    selectedSpellIds,
    fixedSpellIds,
    allowedSpellIds: readSpellIds(
      selectionGroups.flatMap((group) => {
        return group.allowedSpellIds;
      })
    ),
    allowedClassLists: uniqueCleanArray(
      selectionGroups.flatMap((group) => {
        return group.allowedClassLists;
      })
    ),
    allowedSchools: uniqueCleanArray(
      selectionGroups.flatMap((group) => {
        return group.allowedSchools;
      })
    ),
    minimumSpellLevel:
      levels.length ? Math.min(...levels) : null,
    maximumSpellLevel:
      levels.length ? Math.max(...levels) : null,
    spellcastingAbility:
      sourceAbilities.length === 1
        ? sourceAbilities[0]
        : "",
    grantsKnown:
      records.some((record) => {
        return record?.known !== false;
      }) || selectionGroups.length > 0,
    grantsPrepared: records.some(
      (record) => record?.prepared === true
    ),
    alwaysPrepared: records.some(
      (record) => {
        return record?.alwaysPrepared === true;
      }
    ),
    ritualOnly:
      selectionGroups.length > 0 &&
      selectionGroups.every((group) => {
        return group.ritualOnly === true;
      }),
    freeCastUses: Math.max(
      0,
      ...records.map((record) => {
        return Number(
          record?.freeCastUses ??
          record?.maximumUses ??
          0
        ) || 0;
      })
    ),
    recharge:
      rechargeTypes.length === 1
        ? rechargeTypes[0]
        : "",
    canUseSpellSlots: records.some(
      (record) => {
        return record?.canUseSpellSlots === true;
      }
    ),
    resourceId:
      resourceIds.length === 1
        ? resourceIds[0]
        : "",
    rulesSource: cleanString(
      feat?.sourceLabel || feat?.source
    ),
    selectionGroups
  };
}
