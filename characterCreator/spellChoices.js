// =====================================================
// OPTIONAL SPELL CHOICES AND FINALIZATION VALIDATION
// Pure calculations shared by creator review and, later, the playable sheet.
// =====================================================

function isRecord(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function cleanText(value, fallback = "") {
  const text = String(
    value == null ? "" : value
  ).trim();

  return text || fallback;
}

function cleanIds(value) {
  return (Array.isArray(value) ? value : [])
    .map((entry) => cleanText(
      isRecord(entry)
        ? entry.spellId || entry.id || entry.name
        : entry
    ))
    .filter(Boolean);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function plural(count, singular, pluralValue = `${singular}s`) {
  return count === 1 ? singular : pluralValue;
}

function sourceLabel(source) {
  return cleanText(
    source?.sourceName || source?.sourceFeatureName,
    source?.sourceType === "magical-secrets"
      ? "Magical Secrets"
      : "Spell source"
  );
}

function selectedDuplicates(values) {
  const ids = cleanIds(values);
  const seen = new Set();

  return unique(ids.filter((id) => {
    if (seen.has(id)) {
      return true;
    }
    seen.add(id);
    return false;
  }));
}

function normalizeLevel(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const level = Number(value);
  return Number.isInteger(level) && level >= 0 && level <= 9
    ? level
    : null;
}

function isAttackRollSpell(spell) {
  return spell?.attackRoll === true ||
    spell?.requiresAttackRoll === true ||
    Boolean(cleanText(spell?.attackType));
}

function spellRestrictionError(spell, rules, label) {
  if (!spell) {
    return `${label} contains an invalid spell reference.`;
  }

  if (spell.manualOverride === true) {
    return "";
  }

  const spellId = cleanText(spell.id || spell.spellId);
  const level = normalizeLevel(spell.level);
  const allowedIds = cleanIds(rules?.allowedSpellIds);
  const allowedLists = cleanIds(rules?.allowedClassLists)
    .map((entry) => entry.toLowerCase());
  const allowedSchools = cleanIds(rules?.allowedSchools)
    .map((entry) => entry.toLowerCase());
  const spellLists = cleanIds(spell.classes)
    .map((entry) => entry.toLowerCase());
  const spellSchool = cleanText(spell.school).toLowerCase();
  const levels = (Array.isArray(rules?.levels) ? rules.levels : [])
    .map(normalizeLevel)
    .filter((entry) => entry !== null);
  const minimum = normalizeLevel(rules?.minimumSpellLevel);
  const maximum = normalizeLevel(rules?.maximumSpellLevel);

  if (allowedIds.length && !allowedIds.includes(spellId)) {
    return `${cleanText(spell.name, spellId)} is outside ${label}'s permitted spell list.`;
  }
  if (
    allowedLists.length &&
    !allowedLists.some((classId) => spellLists.includes(classId))
  ) {
    return `${cleanText(spell.name, spellId)} is outside ${label}'s permitted class list.`;
  }
  if (allowedSchools.length && !allowedSchools.includes(spellSchool)) {
    return `${cleanText(spell.name, spellId)} is outside ${label}'s permitted schools.`;
  }
  if (level === null) {
    return `${cleanText(spell.name, spellId)} has an invalid spell level.`;
  }
  if (levels.length && !levels.includes(level)) {
    return `${cleanText(spell.name, spellId)} is outside ${label}'s permitted spell levels.`;
  }
  if (minimum !== null && level < minimum) {
    return `${cleanText(spell.name, spellId)} is below ${label}'s permitted spell level.`;
  }
  if (maximum !== null && level > maximum) {
    return `${cleanText(spell.name, spellId)} is above ${label}'s permitted spell level.`;
  }
  if (rules?.ritualOnly === true && spell.ritual !== true) {
    return `${cleanText(spell.name, spellId)} is not a ritual spell permitted by ${label}.`;
  }
  if (rules?.attackRollOnly === true && !isAttackRollSpell(spell)) {
    return `${cleanText(spell.name, spellId)} does not use the spell attack required by ${label}.`;
  }

  return "";
}

function addRemaining(result, choice) {
  if (choice.remaining < 1) {
    return;
  }

  result.remainingChoices.push(choice);
  result.reminders.push(choice.message);
}

function evaluateClassChoices(result, entry, resolveSpell) {
  const className = cleanText(entry?.className, entry?.classId || "Class");
  const sourceId = cleanText(entry?.classEntryId, entry?.classId);
  const expandedIds = new Set(cleanIds(entry?.expandedSpellIds));
  const classLists = unique([
    cleanText(entry?.spellListClassId).toLowerCase(),
    cleanText(entry?.classId).toLowerCase()
  ]);
  const maxLevel = normalizeLevel(entry?.maxSpellLevel) ?? 0;
  const validateClassIds = (values, kind, expectedLevel = null) => {
    const ids = cleanIds(values);
    const validIds = [];
    selectedDuplicates(values).forEach((spellId) => {
      result.blockingErrors.push(
        `${className} has duplicate ${kind} selection ${spellId}.`
      );
    });

    ids.forEach((spellId) => {
      const spell = resolveSpell(spellId);
      if (!spell) {
        result.blockingErrors.push(
          `${className} has an invalid ${kind} spell reference: ${spellId}.`
        );
        return;
      }
      if (spell.manualOverride === true) {
        validIds.push(spellId);
        return;
      }

      const level = normalizeLevel(spell.level);
      const spellLists = cleanIds(spell.classes)
        .map((value) => value.toLowerCase());
      let invalid = false;
      if (level === null) {
        result.blockingErrors.push(
          `${cleanText(spell.name, spellId)} has an invalid spell level.`
        );
        invalid = true;
      } else if (
        (expectedLevel === "leveled" && level === 0) ||
        (typeof expectedLevel === "number" && level !== expectedLevel)
      ) {
        result.blockingErrors.push(
          `${cleanText(spell.name, spellId)} is not a valid ${className} ${kind} selection.`
        );
        invalid = true;
      } else if (
        level !== null &&
        level > maxLevel &&
        kind !== "Mystic Arcanum"
      ) {
        result.blockingErrors.push(
          `${cleanText(spell.name, spellId)} is above ${className}'s permitted spell level.`
        );
        invalid = true;
      }
      if (
        spellLists.length &&
        !expandedIds.has(spellId) &&
        !classLists.some((classId) => spellLists.includes(classId))
      ) {
        result.blockingErrors.push(
          `${cleanText(spell.name, spellId)} is outside ${className}'s permitted spell list.`
        );
        invalid = true;
      }
      if (!invalid) {
        validIds.push(spellId);
      }
    });

    return {
      ids: unique(ids),
      validIds: unique(validIds)
    };
  };

  const cantripSelection = validateClassIds(
    entry?.cantripIds,
    "cantrip",
    0
  );
  const knownSelection = validateClassIds(
    entry?.knownSpellIds,
    "known spell",
    "leveled"
  );
  const spellbookSelection = validateClassIds(
    entry?.spellbookSpellIds,
    "spellbook spell",
    "leveled"
  );
  const preparedSelection = validateClassIds(
    entry?.preparedSpellIds,
    "prepared spell",
    "leveled"
  );
  const cantrips = cantripSelection.validIds;
  const known = knownSelection.validIds;
  const spellbook = spellbookSelection.validIds;
  const prepared = preparedSelection.validIds;
  const cantripLimit = Math.max(0, Number(entry?.cantripsKnownLimit) || 0);
  const knownLimit = Math.max(0, Number(entry?.spellsKnownLimit) || 0);
  const preparedLimit = entry?.preparedLimit == null
    ? null
    : Math.max(0, Number(entry.preparedLimit) || 0);

  if (entry?.requiresSpellcastingAbility === true && !cleanText(entry?.spellcastingAbility)) {
    result.blockingErrors.push(
      `${className} needs a spellcasting ability choice.`
    );
  }
  if (cantripSelection.ids.length > cantripLimit) {
    result.blockingErrors.push(
      `${className} cantrips exceed the calculated limit.`
    );
  }
  if (knownSelection.ids.length > knownLimit) {
    result.blockingErrors.push(
      `${className} known spells exceed the calculated limit.`
    );
  }
  if (preparedLimit !== null && preparedSelection.ids.length > preparedLimit) {
    result.blockingErrors.push(
      `${className} prepared spells exceed the calculated limit.`
    );
  }
  if (preparedLimit === null && preparedSelection.ids.length) {
    result.blockingErrors.push(
      `${className} does not have ordinary prepared-spell capacity.`
    );
  }
  if (entry?.preparationMode === "spellbook-prepared") {
    const available = new Set([
      ...spellbook,
      ...cleanIds(entry?.alwaysPreparedSpellIds)
    ]);
    prepared.filter((spellId) => !available.has(spellId))
      .forEach((spellId) => {
        result.blockingErrors.push(
          `${className} cannot prepare ${cleanText(resolveSpell(spellId)?.name, spellId)} because it is not in the spellbook.`
        );
      });
  }

  addRemaining(result, {
    id: `${sourceId}:cantrips`,
    sourceId,
    sourceType: "class",
    sourceName: className,
    choiceType: "cantrip",
    maximum: cantripLimit,
    selected: Math.min(cantrips.length, cantripLimit),
    remaining: Math.max(0, cantripLimit - cantrips.length),
    message: `${className} can still learn ${Math.max(0, cantripLimit - cantrips.length)} ${plural(Math.max(0, cantripLimit - cantrips.length), "cantrip")}.`
  });
  addRemaining(result, {
    id: `${sourceId}:known`,
    sourceId,
    sourceType: "class",
    sourceName: className,
    choiceType: "known",
    maximum: knownLimit,
    selected: Math.min(known.length, knownLimit),
    remaining: Math.max(0, knownLimit - known.length),
    message: `You can still learn ${Math.max(0, knownLimit - known.length)} ${className} ${plural(Math.max(0, knownLimit - known.length), "spell")}.`
  });
  addRemaining(result, {
    id: `${sourceId}:prepared`,
    sourceId,
    sourceType: "class",
    sourceName: className,
    choiceType: "prepared",
    maximum: preparedLimit || 0,
    selected: preparedLimit === null ? 0 : Math.min(prepared.length, preparedLimit),
    remaining: preparedLimit === null ? 0 : Math.max(0, preparedLimit - prepared.length),
    message: `You may prepare ${preparedLimit === null ? 0 : Math.max(0, preparedLimit - prepared.length)} more ${className} ${plural(preparedLimit === null ? 0 : Math.max(0, preparedLimit - prepared.length), "spell")}.`
  });

  const arcanumLevels = unique(
    (Array.isArray(entry?.mysticArcanumLevels) ? entry.mysticArcanumLevels : [])
      .map(normalizeLevel)
      .filter((level) => level !== null)
  );
  const arcanum = isRecord(entry?.mysticArcanumSpellIds)
    ? entry.mysticArcanumSpellIds
    : {};
  const selectedArcanum = [];
  Object.entries(arcanum).forEach(([levelText, spellIdValue]) => {
    const level = normalizeLevel(levelText);
    const spellId = cleanText(spellIdValue);
    if (!spellId || level === null || !arcanumLevels.includes(level)) {
      result.blockingErrors.push(
        `${className} has corrupt Mystic Arcanum source data.`
      );
      return;
    }
    const validation = validateClassIds(
      [spellId],
      "Mystic Arcanum",
      level
    );
    if (validation.validIds.length) {
      selectedArcanum.push(spellId);
    }
  });
  selectedDuplicates(selectedArcanum).forEach((spellId) => {
    result.blockingErrors.push(
      `${className} has duplicate Mystic Arcanum selection ${spellId}.`
    );
  });
  const arcanumRemaining = Math.max(
    0,
    arcanumLevels.length - unique(selectedArcanum).length
  );
  addRemaining(result, {
    id: `${sourceId}:mystic-arcanum`,
    sourceId,
    sourceType: "mystic-arcanum",
    sourceName: "Mystic Arcanum",
    choiceType: "mystic-arcanum",
    maximum: arcanumLevels.length,
    selected: unique(selectedArcanum).length,
    remaining: arcanumRemaining,
    message: `You have ${arcanumRemaining} Mystic Arcanum ${plural(arcanumRemaining, "choice")} available.`
  });
}

function validateRawSources(result, rawSources) {
  if (rawSources == null) {
    return;
  }
  if (!Array.isArray(rawSources)) {
    result.blockingErrors.push(
      "Spell-source data is corrupt: canonical sources must be a list."
    );
    return;
  }

  rawSources.forEach((source, index) => {
    if (!isRecord(source)) {
      result.blockingErrors.push(
        `Spell-source data is corrupt at entry ${index + 1}.`
      );
      return;
    }
    const label = sourceLabel(source);
    ["selectedSpellIds", "fixedSpellIds", "selectionGroups", "spellRecords"]
      .forEach((field) => {
        if (source[field] != null && !Array.isArray(source[field])) {
          result.blockingErrors.push(
            `${label} has corrupt ${field} data.`
          );
        }
      });
    selectedDuplicates(source.selectedSpellIds)
      .forEach((spellId) => {
        result.blockingErrors.push(
          `${label} contains duplicate spell selection ${spellId}.`
        );
      });
    (Array.isArray(source.selectionGroups) ? source.selectionGroups : [])
      .forEach((group) => {
        selectedDuplicates(group?.selectedSpellIds)
          .forEach((spellId) => {
            result.blockingErrors.push(
              `${label} contains duplicate spell selection ${spellId}.`
            );
          });
      });
  });
}

function evaluateSourceChoices(result, source, resolveSpell) {
  if (!isRecord(source) || source.sourceType === "class") {
    return;
  }
  const label = sourceLabel(source);
  const fixedIds = unique(cleanIds(source.fixedSpellIds));
  const selectedIds = unique(cleanIds(source.selectedSpellIds));
  const groups = Array.isArray(source.selectionGroups)
    ? source.selectionGroups
    : [];
  const resolveSourceSpell = (spellId) => {
    return resolveSpell(spellId) ||
      (Array.isArray(source.spellRecords)
        ? source.spellRecords.find((record) => {
            return cleanText(
              record?.spellId || record?.id || record?.name
            ) === spellId;
          })
        : null);
  };

  fixedIds.forEach((spellId) => {
    if (!resolveSourceSpell(spellId)) {
      result.blockingErrors.push(
        `${label} has an invalid fixed spell reference: ${spellId}.`
      );
    }
  });
  selectedIds.filter((spellId) => fixedIds.includes(spellId))
    .forEach((spellId) => {
      result.blockingErrors.push(
        `${label} contains duplicate fixed and selected spell ${spellId}.`
      );
    });

  const evaluateChoiceSet = (choice, fallbackName) => {
    const choiceLabel = cleanText(choice?.sourceFeatureName, fallbackName);
    const ids = unique(cleanIds(choice?.selectedSpellIds));
    const limit = Math.max(0, Number(choice?.choiceCount) || 0);
    let validCount = 0;

    if (ids.length > limit) {
      result.blockingErrors.push(
        `${choiceLabel} has more spells selected than allowed (${ids.length}/${limit}).`
      );
    }
    ids.forEach((spellId) => {
      const spell = resolveSourceSpell(spellId);
      const error = spellRestrictionError(
        spell,
        choice,
        choiceLabel
      );
      if (error) {
        result.blockingErrors.push(
          spell ? error : `${choiceLabel} has an invalid spell reference: ${spellId}.`
        );
      } else {
        validCount += 1;
      }
    });

    const remaining = Math.max(0, limit - validCount);
    addRemaining(result, {
      id: cleanText(choice?.sourceFeatureId, `${source.sourceId}:choices`),
      sourceId: source.sourceId,
      sourceType: source.sourceType,
      sourceName: label,
      choiceType: source.sourceType,
      maximum: limit,
      selected: validCount,
      remaining,
      message: source.sourceType === "magical-secrets"
        ? `You have ${remaining} ${label} ${plural(remaining, "choice")} available.`
        : `${label} still has ${remaining} spell ${plural(remaining, "choice")} available.`
    });
  };

  if (groups.length) {
    groups.forEach((group) => {
      evaluateChoiceSet(group, label);
    });
    const groupedIds = groups.flatMap((group) => cleanIds(group.selectedSpellIds));
    selectedIds.filter((spellId) => !groupedIds.includes(spellId))
      .forEach((spellId) => {
        result.blockingErrors.push(
          `${label} has untracked spell choice ${spellId}.`
        );
      });
    if (source.allowDuplicateSpellSelections !== true) {
      selectedDuplicates(groupedIds).forEach((spellId) => {
        result.blockingErrors.push(
          `${label} selects ${spellId} more than once across its spell choices.`
        );
      });
    }
    return;
  }

  if (source.selectionMode !== "fixed" || Number(source.choiceCount) > 0) {
    evaluateChoiceSet(source, label);
  } else {
    selectedIds.forEach((spellId) => {
      if (!resolveSourceSpell(spellId)) {
        result.blockingErrors.push(
          `${label} has an invalid spell reference: ${spellId}.`
        );
      }
    });
  }
}

export function evaluateSpellChoices({
  classSelections = [],
  spellSources = [],
  rawSpellSources = null,
  resolveSpell = () => null
} = {}) {
  const result = {
    remainingChoices: [],
    reminders: [],
    blockingErrors: []
  };

  validateRawSources(result, rawSpellSources);
  (Array.isArray(classSelections) ? classSelections : [])
    .forEach((entry) => {
      evaluateClassChoices(result, entry, resolveSpell);
    });
  (Array.isArray(spellSources) ? spellSources : [])
    .forEach((source) => {
      evaluateSourceChoices(result, source, resolveSpell);
    });

  result.reminders = unique(result.reminders);
  result.blockingErrors = unique(result.blockingErrors);
  return result;
}
