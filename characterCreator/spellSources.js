// =====================================================
// CANONICAL CHARACTER SPELL SOURCES
// One source-owned record for every way a character gains a spell.
// =====================================================

export const SPELL_SOURCE_MODEL_VERSION = 3;

export const SPELL_SOURCE_TYPES = Object.freeze([
  "class",
  "subclass",
  "magical-secrets",
  "feat",
  "species",
  "background",
  "innate",
  "mystic-arcanum",
  "custom-feature",
  "custom-spell"
]);

export const SPELL_SELECTION_MODES = Object.freeze([
  "fixed",
  "choose-from-list",
  "choose-from-catalog",
  "class-list",
  "ritual-only"
]);

const SOURCE_TYPE_SET = new Set(
  SPELL_SOURCE_TYPES
);
const SELECTION_MODE_SET = new Set(
  SPELL_SELECTION_MODES
);

function isRecord(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function cleanText(value, fallback = "") {
  const text = String(
    value == null
      ? ""
      : value
  ).trim();

  return text || fallback;
}

function stablePart(value, fallback = "") {
  const text = cleanText(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return text || fallback;
}

function uniqueText(values) {
  const entries = Array.isArray(values)
    ? values
    : values == null || values === ""
      ? []
      : [values];

  return [
    ...new Set(
      entries
        .map((value) => {
          return cleanText(
            isRecord(value)
              ? value.spellId ||
                value.id ||
                value.name
              : value
          );
        })
        .filter(Boolean)
    )
  ];
}

function optionalWholeNumber(value) {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? Math.max(0, Math.round(number))
    : null;
}

function wholeNumber(value, fallback = 0) {
  return optionalWholeNumber(value) ?? fallback;
}

function spellReferenceId(reference) {
  return cleanText(
    isRecord(reference)
      ? reference.spellId ||
        reference.id ||
        reference.name
      : reference
  );
}

function normalizeSpellRecords(records) {
  const byId = new Map();

  (Array.isArray(records) ? records : [])
    .forEach((record) => {
      const id = spellReferenceId(record);

      if (!id) {
        return;
      }

      byId.set(
        id,
        isRecord(record)
          ? { ...record }
          : { spellId: id }
      );
    });

  return [...byId.values()];
}

function normalizeSpellStates(value) {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([spellId, state]) => {
        const cleanId = cleanText(spellId);

        if (!cleanId || !isRecord(state)) {
          return null;
        }

        return [
          cleanId,
          {
            ...state,
            cantrip: state.cantrip === true,
            known: state.known === true,
            prepared: state.prepared === true,
            spellbook: state.spellbook === true,
            alwaysPrepared:
              state.alwaysPrepared === true,
            innate: state.innate === true,
            mysticArcanum:
              state.mysticArcanum === true,
            mysticArcanumLevel:
              optionalWholeNumber(
                state.mysticArcanumLevel
              )
          }
        ];
      })
      .filter(Boolean)
  );
}

function normalizeSelectionGroups(value) {
  return (Array.isArray(value) ? value : [])
    .filter(isRecord)
    .map((group, index) => {
      const selectedSpellIds = uniqueText(
        group.selectedSpellIds
      );
      const levels = uniqueText(group.levels)
        .map(Number)
        .filter((level) => {
          return (
            Number.isInteger(level) &&
            level >= 0 &&
            level <= 9
          );
        });

      return {
        ...group,
        sourceFeatureId: cleanText(
          group.sourceFeatureId,
          `spell-choice-${index + 1}`
        ),
        sourceFeatureName: cleanText(
          group.sourceFeatureName,
          "Spell choice"
        ),
        selectionMode: normalizeSelectionMode(
          group.selectionMode,
          group
        ),
        choiceCount: wholeNumber(
          group.choiceCount,
          0
        ),
        selectedSpellIds,
        allowedSpellIds: uniqueText(
          group.allowedSpellIds
        ),
        allowedClassLists: uniqueText(
          group.allowedClassLists
        ),
        allowedSchools: uniqueText(
          group.allowedSchools
        ),
        levels,
        ritualOnly:
          group.ritualOnly === true,
        attackRollOnly:
          group.attackRollOnly === true,
        unresolvedReason: cleanText(
          group.unresolvedReason
        )
      };
    });
}

function normalizeSourceType(value) {
  const type = cleanText(value)
    .toLowerCase()
    .replace(/[\s_]+/g, "-");

  return SOURCE_TYPE_SET.has(type)
    ? type
    : "custom-feature";
}

function inferSelectionMode(source) {
  if (source?.ritualOnly === true) {
    return "ritual-only";
  }

  if (uniqueText(source?.allowedClassLists).length) {
    return "class-list";
  }

  if (uniqueText(source?.allowedSpellIds).length) {
    return "choose-from-list";
  }

  if (wholeNumber(source?.choiceCount, 0) > 0) {
    return "choose-from-catalog";
  }

  return "fixed";
}

function normalizeSelectionMode(value, source) {
  const mode = cleanText(value)
    .toLowerCase()
    .replace(/[\s_]+/g, "-");

  return SELECTION_MODE_SET.has(mode)
    ? mode
    : inferSelectionMode(source);
}

export function createStableSpellSourceId(
  source = {},
  options = {}
) {
  const explicitId = cleanText(
    options.sourceId || source?.sourceId
  );

  if (explicitId) {
    return explicitId;
  }

  const sourceType = normalizeSourceType(
    options.sourceType || source?.sourceType
  );
  const typedIdentity =
    sourceType === "class"
      ? source?.classEntryId ||
        source?.classId
      : source?.sourceFeatureId ||
        source?.featureInstanceId ||
        source?.featureId ||
        source?.featId ||
        source?.subclassId ||
        source?.speciesId ||
        source?.backgroundId ||
        source?.classEntryId;
  const featureIdentity = cleanText(
    options.instanceId ||
    source?.instanceId ||
    source?.sourceInstanceId ||
    source?.featInstanceId ||
    typedIdentity ||
    source?.resourceId ||
    source?.sourceName
  );
  const featurePart = stablePart(
    featureIdentity,
    "source"
  );

  return `${sourceType}:${featurePart}`;
}

export function normalizeSpellSource(
  source,
  options = {}
) {
  const raw = isRecord(source)
    ? source
    : {};
  const sourceType = normalizeSourceType(
    options.sourceType || raw.sourceType
  );
  const selectedSpellIds = uniqueText(
    raw.selectedSpellIds
  );
  const fixedSpellIds = uniqueText(
    raw.fixedSpellIds
  );
  const minimumSpellLevel =
    optionalWholeNumber(
      raw.minimumSpellLevel
    );
  const maximumSpellLevel =
    optionalWholeNumber(
      raw.maximumSpellLevel
    );

  return {
    ...raw,
    sourceId: createStableSpellSourceId(
      {
        ...raw,
        sourceType
      },
      options
    ),
    sourceType,
    sourceName: cleanText(
      raw.sourceName,
      cleanText(
        raw.sourceFeatureName,
        "Spell source"
      )
    ),
    sourceFeatureId: cleanText(
      raw.sourceFeatureId || raw.featureId
    ),
    sourceFeatureName: cleanText(
      raw.sourceFeatureName || raw.featureName
    ),
    classId: cleanText(raw.classId),
    classEntryId: cleanText(raw.classEntryId),
    featId: cleanText(raw.featId),
    speciesId: cleanText(raw.speciesId),
    subclassId: cleanText(raw.subclassId),
    selectionMode: normalizeSelectionMode(
      raw.selectionMode,
      raw
    ),
    choiceCount: wholeNumber(
      raw.choiceCount,
      0
    ),
    selectedSpellIds,
    fixedSpellIds,
    allowedSpellIds: uniqueText(
      raw.allowedSpellIds
    ),
    allowedClassLists: uniqueText(
      raw.allowedClassLists
    ),
    allowedSchools: uniqueText(
      raw.allowedSchools
    ),
    minimumSpellLevel:
      minimumSpellLevel === null
        ? null
        : Math.min(9, minimumSpellLevel),
    maximumSpellLevel:
      maximumSpellLevel === null
        ? null
        : Math.min(9, maximumSpellLevel),
    spellcastingAbility: cleanText(
      raw.spellcastingAbility
    ),
    grantsKnown: raw.grantsKnown === true,
    grantsPrepared:
      raw.grantsPrepared === true,
    alwaysPrepared:
      raw.alwaysPrepared === true,
    ritualOnly: raw.ritualOnly === true,
    freeCastUses: wholeNumber(
      raw.freeCastUses,
      0
    ),
    recharge: cleanText(raw.recharge),
    canUseSpellSlots:
      raw.canUseSpellSlots === true,
    resourceId: cleanText(raw.resourceId),
    rulesSource: cleanText(raw.rulesSource),
    spellRecords: normalizeSpellRecords(
      raw.spellRecords
    ),
    spellStates: normalizeSpellStates(
      raw.spellStates
    ),
    selectionGroups:
      normalizeSelectionGroups(
        raw.selectionGroups
      )
  };
}

export function normalizeSpellSources(sources) {
  const entries = Array.isArray(sources)
    ? sources.map((source, index) => {
        return [String(index), source];
      })
    : isRecord(sources)
      ? Object.entries(sources)
      : [];
  const usedIds = new Set();

  return entries.map(([key, source], index) => {
    const normalized = normalizeSpellSource(
      source,
      {
        sourceId:
          cleanText(source?.sourceId) ||
          (
            Array.isArray(sources)
              ? ""
              : cleanText(key)
          ),
        instanceId:
          source?.instanceId ||
          source?.sourceInstanceId ||
          source?.featInstanceId ||
          source?.featureInstanceId ||
          source?.classEntryId ||
          key
      }
    );
    let uniqueId = normalized.sourceId;

    if (usedIds.has(uniqueId)) {
      const instancePart = stablePart(
        source?.instanceId ||
        source?.sourceInstanceId ||
        source?.featInstanceId ||
        source?.featureInstanceId ||
        source?.classEntryId ||
        index + 1,
        String(index + 1)
      );
      uniqueId = `${uniqueId}:instance-${instancePart}`;

      let duplicateNumber = 2;
      while (usedIds.has(uniqueId)) {
        uniqueId = `${normalized.sourceId}:instance-${instancePart}-${duplicateNumber}`;
        duplicateNumber += 1;
      }
    }

    usedIds.add(uniqueId);
    return {
      ...normalized,
      sourceId: uniqueId
    };
  });
}

function mergeSpellStates(first, second) {
  const result = {
    ...normalizeSpellStates(first)
  };

  Object.entries(
    normalizeSpellStates(second)
  ).forEach(([spellId, state]) => {
    const previous = result[spellId] || {};
    result[spellId] = {
      ...previous,
      ...state,
      cantrip:
        previous.cantrip === true ||
        state.cantrip === true,
      known:
        previous.known === true ||
        state.known === true,
      prepared:
        previous.prepared === true ||
        state.prepared === true,
      spellbook:
        previous.spellbook === true ||
        state.spellbook === true,
      alwaysPrepared:
        previous.alwaysPrepared === true ||
        state.alwaysPrepared === true,
      innate:
        previous.innate === true ||
        state.innate === true,
      mysticArcanum:
        previous.mysticArcanum === true ||
        state.mysticArcanum === true
    };
  });

  return result;
}

function mergeSourceRecords(first, second) {
  return normalizeSpellSource({
    ...first,
    ...second,
    sourceId: first.sourceId,
    sourceName:
      first.sourceName || second.sourceName,
    sourceFeatureName:
      first.sourceFeatureName ||
      second.sourceFeatureName,
    choiceCount: Math.max(
      wholeNumber(first.choiceCount, 0),
      wholeNumber(second.choiceCount, 0)
    ),
    selectedSpellIds: uniqueText([
      ...first.selectedSpellIds,
      ...second.selectedSpellIds
    ]),
    fixedSpellIds: uniqueText([
      ...first.fixedSpellIds,
      ...second.fixedSpellIds
    ]),
    allowedSpellIds: uniqueText([
      ...first.allowedSpellIds,
      ...second.allowedSpellIds
    ]),
    allowedClassLists: uniqueText([
      ...first.allowedClassLists,
      ...second.allowedClassLists
    ]),
    allowedSchools: uniqueText([
      ...first.allowedSchools,
      ...second.allowedSchools
    ]),
    grantsKnown:
      first.grantsKnown || second.grantsKnown,
    grantsPrepared:
      first.grantsPrepared ||
      second.grantsPrepared,
    alwaysPrepared:
      first.alwaysPrepared ||
      second.alwaysPrepared,
    ritualOnly:
      first.ritualOnly || second.ritualOnly,
    canUseSpellSlots:
      first.canUseSpellSlots ||
      second.canUseSpellSlots,
    freeCastUses: Math.max(
      wholeNumber(first.freeCastUses, 0),
      wholeNumber(second.freeCastUses, 0)
    ),
    spellRecords: [
      ...first.spellRecords,
      ...second.spellRecords
    ],
    selectionGroups: [
      ...first.selectionGroups,
      ...second.selectionGroups
    ],
    spellStates: mergeSpellStates(
      first.spellStates,
      second.spellStates
    )
  });
}

function addSource(sourceMap, rawSource) {
  const source = normalizeSpellSource(
    rawSource
  );
  const existing = sourceMap.get(
    source.sourceId
  );

  sourceMap.set(
    source.sourceId,
    existing
      ? mergeSourceRecords(existing, source)
      : source
  );
}

function classSpellStates(source) {
  const states = {};
  const apply = (values, patch) => {
    uniqueText(values).forEach((spellId) => {
      states[spellId] = {
        ...(states[spellId] || {}),
        ...patch
      };
    });
  };

  apply(source?.cantripIds, {
    cantrip: true,
    known: true
  });
  apply(source?.knownSpellIds, {
    known: true
  });
  apply(source?.preparedSpellIds, {
    prepared: true
  });
  apply(source?.spellbookSpellIds, {
    known: true,
    spellbook: true
  });
  apply(source?.alwaysPreparedSpellIds, {
    prepared: true,
    alwaysPrepared: true
  });
  apply(source?.subclassSpellIds, {
    prepared: true,
    alwaysPrepared: true
  });
  Object.entries(
    isRecord(source?.mysticArcanumSpellIds)
      ? source.mysticArcanumSpellIds
      : {}
  ).forEach(([level, spellId]) => {
    const id = cleanText(spellId);
    if (id) {
      states[id] = {
        ...(states[id] || {}),
        known: true,
        mysticArcanum: true,
        mysticArcanumLevel:
          optionalWholeNumber(level)
      };
    }
  });

  return states;
}

function getInnateSourceType(spell) {
  const sourceText = [
    spell?.sourceType,
    spell?.source,
    spell?.sourceName,
    spell?.sourceLabel,
    spell?.innateSource
  ].map((value) => {
    return cleanText(value);
  }).join(" ").toLowerCase();

  if (/species|ancestry|race/.test(sourceText)) {
    return "species";
  }
  if (/background/.test(sourceText)) {
    return "background";
  }
  if (/subclass/.test(sourceText)) {
    return "subclass";
  }

  return "innate";
}

function getFeatSpellIds(grant) {
  if (!isRecord(grant)) {
    return uniqueText(grant);
  }

  return uniqueText(
    grant.spellIds ||
    grant.spellId ||
    grant.id ||
    grant.name
  );
}

export function collectLegacySpellSources(character) {
  const magic = isRecord(character?.magic)
    ? character.magic
    : {};
  const sourceMap = new Map();

  Object.entries(
    isRecord(magic.classSources)
      ? magic.classSources
      : {}
  ).forEach(([sourceKey, sourceValue]) => {
    const source = isRecord(sourceValue)
      ? sourceValue
      : {};
    const classEntryId = cleanText(
      source.classEntryId,
      sourceKey
    );
    const className = cleanText(
      source.className || source.classId,
      "Spellcasting"
    );
    const selectedSpellIds = uniqueText([
      ...uniqueText(source.cantripIds),
      ...uniqueText(source.knownSpellIds),
      ...uniqueText(source.preparedSpellIds),
      ...uniqueText(source.spellbookSpellIds)
    ]);

    if (selectedSpellIds.length) {
      addSource(sourceMap, {
        sourceId: `class:${classEntryId}`,
        sourceType: "class",
        sourceName: className,
        classId: cleanText(source.classId),
        classEntryId,
        subclassId: cleanText(source.subclassId),
        selectionMode: "class-list",
        choiceCount: Math.max(
          wholeNumber(source.cantripsKnown, 0) +
            wholeNumber(source.spellsKnown, 0),
          wholeNumber(source.preparedLimit, 0)
        ),
        selectedSpellIds,
        allowedClassLists: uniqueText([
          source.spellListClassId ||
          source.classId
        ]),
        spellcastingAbility: cleanText(
          source.spellcastingAbility
        ),
        grantsKnown: true,
        grantsPrepared:
          uniqueText(
            source.preparedSpellIds
          ).length > 0,
        canUseSpellSlots: true,
        rulesSource: cleanText(
          source.rulesSource || source.source
        ),
        spellStates: classSpellStates(source)
      });
    }

    const subclassSpellIds = uniqueText([
      ...uniqueText(
        source.alwaysPreparedSpellIds
      ),
      ...uniqueText(source.subclassSpellIds)
    ]);

    if (subclassSpellIds.length) {
      const subclassName = cleanText(
        source.subclassName,
        "Subclass"
      );
      addSource(sourceMap, {
        sourceId:
          `subclass:${classEntryId}:${stablePart(
            source.subclassId || subclassName,
            "spells"
          )}`,
        sourceType: "subclass",
        sourceName:
          `${className} — ${subclassName}`,
        sourceFeatureName:
          `${subclassName} spells`,
        classId: cleanText(source.classId),
        classEntryId,
        subclassId: cleanText(source.subclassId),
        selectionMode: "fixed",
        fixedSpellIds: subclassSpellIds,
        spellcastingAbility: cleanText(
          source.spellcastingAbility
        ),
        grantsPrepared: true,
        alwaysPrepared: true,
        canUseSpellSlots: true,
        rulesSource: cleanText(
          source.rulesSource || source.source
        ),
        spellStates: classSpellStates(source)
      });
    }

    const arcanumEntries = Object.entries(
      isRecord(source.mysticArcanumSpellIds)
        ? source.mysticArcanumSpellIds
        : {}
    ).filter(([, spellId]) => {
      return Boolean(cleanText(spellId));
    });

    if (arcanumEntries.length) {
      addSource(sourceMap, {
        sourceId:
          `mystic-arcanum:${classEntryId}`,
        sourceType: "mystic-arcanum",
        sourceName: "Mystic Arcanum",
        sourceFeatureName: "Mystic Arcanum",
        classId: cleanText(source.classId),
        classEntryId,
        selectionMode: "choose-from-catalog",
        choiceCount: arcanumEntries.length,
        selectedSpellIds:
          arcanumEntries.map(([, spellId]) => {
            return cleanText(spellId);
          }),
        minimumSpellLevel: 6,
        maximumSpellLevel: 9,
        spellcastingAbility: cleanText(
          source.spellcastingAbility
        ),
        grantsKnown: true,
        canUseSpellSlots: false,
        rulesSource: cleanText(
          source.rulesSource || source.source
        ),
        spellStates: classSpellStates(source)
      });
    }
  });

  Object.entries(
    isRecord(magic.featSources)
      ? magic.featSources
      : {}
  ).forEach(([sourceKey, sourceValue]) => {
    const source = isRecord(sourceValue)
      ? sourceValue
      : {};
    const grantRecords = Array.isArray(source.grants)
      ? source.grants
      : [];
    const spellRecords = Array.isArray(
      source.spellRecords
    )
      ? source.spellRecords
      : [];
    const fixedSpellIds = uniqueText([
      ...uniqueText(source.fixedSpellIds),
      ...grantRecords.flatMap(
        getFeatSpellIds
      ),
      ...spellRecords.filter((record) => {
        return (
          record?.fixed === true ||
          cleanText(record?.origin) !==
            "choice"
        );
      })
    ]);
    const selectedSpellIds = uniqueText([
      ...uniqueText(
        source.selectedSpellIds
      ),
      ...uniqueText(source.spellIds),
      ...spellRecords.filter((record) => {
        return (
          record?.fixed !== true &&
          cleanText(record?.origin) ===
            "choice"
        );
      })
    ]).filter((spellId) => {
      return !fixedSpellIds.includes(spellId);
    });
    const featName = cleanText(
      source.featName || source.sourceName,
      cleanText(source.featId, "Feat")
    );
    const sourceType =
      /magical secrets/i.test(featName) ||
      cleanText(source.sourceType) ===
        "magical-secrets"
        ? "magical-secrets"
        : "feat";

    if (
      !selectedSpellIds.length &&
      !fixedSpellIds.length &&
      wholeNumber(source.choiceCount, 0) < 1
    ) {
      return;
    }

    addSource(sourceMap, {
      sourceId: cleanText(
        source.sourceId,
        sourceKey
      ),
      sourceType,
      sourceName: featName,
      sourceFeatureId: cleanText(
        source.sourceFeatureId ||
        source.featureId
      ),
      sourceFeatureName: cleanText(
        source.sourceFeatureName ||
        source.featureName,
        featName
      ),
      classId: cleanText(source.classId),
      classEntryId: cleanText(
        source.classEntryId
      ),
      featId: cleanText(source.featId),
      selectionMode:
        source.selectionMode ||
        (
          selectedSpellIds.length
            ? "choose-from-catalog"
            : "fixed"
        ),
      choiceCount: Math.max(
        wholeNumber(source.choiceCount, 0),
        selectedSpellIds.length
      ),
      selectedSpellIds,
      fixedSpellIds,
      allowedSpellIds: uniqueText(
        source.allowedSpellIds
      ),
      allowedClassLists: uniqueText(
        source.allowedClassLists ||
        source.classLists
      ),
      allowedSchools: uniqueText(
        source.allowedSchools
      ),
      minimumSpellLevel:
        source.minimumSpellLevel,
      maximumSpellLevel:
        source.maximumSpellLevel,
      spellcastingAbility: cleanText(
        source.spellcastingAbility
      ),
      grantsKnown:
        source.grantsKnown !== false,
      grantsPrepared:
        source.grantsPrepared === true,
      alwaysPrepared:
        source.alwaysPrepared === true,
      ritualOnly:
        source.ritualOnly === true,
      freeCastUses: source.freeCastUses,
      recharge: source.recharge,
      canUseSpellSlots:
        source.canUseSpellSlots === true,
      resourceId: source.resourceId,
      rulesSource: source.rulesSource,
      spellRecords: [
        ...spellRecords,
        ...grantRecords
      ],
      selectionGroups:
        source.selectionGroups
    });
  });

  (Array.isArray(
    character?.featMechanics?.spellcasting
  )
    ? character.featMechanics.spellcasting
    : []
  ).forEach((record, index) => {
    const spellId = spellReferenceId(record);

    if (!spellId) {
      return;
    }

    const featId = cleanText(record?.featId);
    const featName = cleanText(
      record?.featName,
      featId || "Feat"
    );
    addSource(sourceMap, {
      sourceId: cleanText(
        record?.sourceId,
        `feat:${stablePart(
          record?.featInstanceId ||
          record?.featureId ||
          featId || index,
          String(index)
        )}`
      ),
      sourceType:
        /magical secrets/i.test(featName)
          ? "magical-secrets"
          : "feat",
      sourceName: featName,
      sourceFeatureId: cleanText(
        record?.featureId
      ),
      sourceFeatureName: featName,
      featId,
      selectionMode:
        record?.fixed === true
          ? "fixed"
          : "choose-from-catalog",
      choiceCount:
        record?.fixed === true ? 0 : 1,
      selectedSpellIds:
        record?.fixed === true
          ? []
          : [spellId],
      fixedSpellIds:
        record?.fixed === true
          ? [spellId]
          : [],
      spellcastingAbility: cleanText(
        record?.spellcastingAbility
      ),
      grantsKnown:
        record?.known !== false,
      grantsPrepared:
        record?.prepared === true,
      alwaysPrepared:
        record?.alwaysPrepared === true,
      freeCastUses: record?.freeCastUses,
      recharge: record?.recharge,
      canUseSpellSlots:
        record?.canUseSpellSlots === true,
      resourceId: record?.resourceId,
      rulesSource: record?.rulesSource,
      spellRecords: [record]
    });
  });

  const innateGroups = new Map();
  (Array.isArray(magic.innateSpells)
    ? magic.innateSpells
    : []
  ).forEach((spell, index) => {
    const spellId = spellReferenceId(spell);
    if (!spellId) {
      return;
    }

    const sourceType = getInnateSourceType(spell);
    const sourceName = cleanText(
      spell?.sourceLabel ||
      spell?.sourceName ||
      spell?.innateSource ||
      spell?.source,
      "Innate magic"
    );
    const groupId = cleanText(
      spell?.sourceId,
      `${sourceType}:${stablePart(
        spell?.sourceFeatureId ||
        spell?.resourceId ||
        sourceName || index,
        String(index)
      )}`
    );
    const existing = innateGroups.get(groupId) || {
      sourceId: groupId,
      sourceType,
      sourceName,
      sourceFeatureId: cleanText(
        spell?.sourceFeatureId
      ),
      sourceFeatureName: cleanText(
        spell?.sourceFeatureName
      ),
      speciesId: cleanText(spell?.speciesId),
      subclassId: cleanText(spell?.subclassId),
      selectionMode: "fixed",
      fixedSpellIds: [],
      spellcastingAbility: cleanText(
        spell?.spellcastingAbility
      ),
      grantsKnown: true,
      grantsPrepared:
        spell?.prepared === true,
      alwaysPrepared:
        spell?.alwaysPrepared === true,
      freeCastUses: wholeNumber(
        spell?.freeCastUses,
        0
      ),
      recharge: cleanText(spell?.recharge),
      canUseSpellSlots:
        spell?.canUseSpellSlots === true,
      resourceId: cleanText(spell?.resourceId),
      rulesSource: cleanText(
        spell?.rulesSource
      ),
      spellRecords: [],
      spellStates: {}
    };

    existing.fixedSpellIds.push(spellId);
    existing.spellRecords.push(spell);
    existing.spellStates[spellId] = {
      known: true,
      prepared: spell?.prepared === true,
      alwaysPrepared:
        spell?.alwaysPrepared === true,
      innate: true
    };
    innateGroups.set(groupId, existing);
  });
  innateGroups.forEach((source) => {
    addSource(sourceMap, source);
  });

  (Array.isArray(magic.customSpells)
    ? magic.customSpells
    : []
  ).forEach((spell, index) => {
    const spellId = spellReferenceId(spell);
    if (!spellId) {
      return;
    }

    addSource(sourceMap, {
      sourceId: cleanText(
        spell?.sourceId,
        `custom-spell:${stablePart(
          spellId,
          String(index)
        )}`
      ),
      sourceType: "custom-spell",
      sourceName: cleanText(
        spell?.sourceLabel ||
        spell?.sourceName ||
        spell?.source,
        "Custom spell"
      ),
      selectionMode: "fixed",
      fixedSpellIds: [spellId],
      spellcastingAbility: cleanText(
        spell?.spellcastingAbility
      ),
      grantsKnown:
        spell?.known !== false,
      grantsPrepared:
        spell?.prepared === true,
      alwaysPrepared:
        spell?.alwaysPrepared === true,
      canUseSpellSlots:
        spell?.canUseSpellSlots !== false,
      rulesSource: cleanText(
        spell?.rulesSource || spell?.source
      ),
      spellRecords: [spell],
      spellStates: {
        [spellId]: {
          known: spell?.known !== false,
          prepared: spell?.prepared === true,
          alwaysPrepared:
            spell?.alwaysPrepared === true
        }
      }
    });
  });

  const representedIds = new Set(
    [...sourceMap.values()].flatMap((source) => {
      return [
        ...source.selectedSpellIds,
        ...source.fixedSpellIds
      ];
    })
  );
  const unassignedKnown = uniqueText([
    ...uniqueText(magic.unassignedKnownSpellIds),
    ...uniqueText(magic.knownSpellIds)
      .filter((spellId) => {
        return !representedIds.has(spellId);
      })
  ]);
  const unassignedPrepared = uniqueText([
    ...uniqueText(
      magic.unassignedPreparedSpellIds
    ),
    ...uniqueText(magic.preparedSpellIds)
      .filter((spellId) => {
        return !representedIds.has(spellId);
      })
  ]);

  if (
    unassignedKnown.length ||
    unassignedPrepared.length
  ) {
    const selectedSpellIds = uniqueText([
      ...unassignedKnown,
      ...unassignedPrepared
    ]);
    const spellStates = {};
    selectedSpellIds.forEach((spellId) => {
      spellStates[spellId] = {
        known: unassignedKnown.includes(spellId),
        prepared:
          unassignedPrepared.includes(spellId)
      };
    });
    addSource(sourceMap, {
      sourceId: "class:legacy-spellcasting",
      sourceType: "class",
      sourceName: "Legacy spellcasting",
      selectionMode: "class-list",
      selectedSpellIds,
      spellcastingAbility: cleanText(
        magic.spellcastingAbility
      ),
      grantsKnown:
        unassignedKnown.length > 0,
      grantsPrepared:
        unassignedPrepared.length > 0,
      canUseSpellSlots: true,
      rulesSource: "legacy-import",
      spellStates
    });
  }

  return [...sourceMap.values()];
}

export function getCanonicalSpellSources(character) {
  const magic = isRecord(character?.magic)
    ? character.magic
    : {};

  if (
    Number(magic.spellSourceModelVersion) >=
      SPELL_SOURCE_MODEL_VERSION &&
    Array.isArray(magic.spellSources)
  ) {
    return normalizeSpellSources(
      magic.spellSources
    );
  }

  return collectLegacySpellSources(character);
}

function getSourceSpellIds(source) {
  return uniqueText([
    ...source.selectedSpellIds,
    ...source.fixedSpellIds
  ]);
}

function getSourceSpellRecord(source, spellId) {
  return source.spellRecords.find((record) => {
    return spellReferenceId(record) === spellId;
  }) || {
    id: spellId,
    spellId,
    name: spellId
  };
}

export function populateSpellSourceCompatibility(
  character,
  sources = getCanonicalSpellSources(character)
) {
  if (!isRecord(character)) {
    return character;
  }

  character.magic = isRecord(character.magic)
    ? character.magic
    : {};
  const magic = character.magic;
  const canonicalSources =
    normalizeSpellSources(sources);
  const knownSpellIds = [];
  const preparedSpellIds = [];
  const addCompatibilityState = (
    source,
    spellId
  ) => {
    const state = source.spellStates[spellId] || {};
    const hasSpellState =
      Object.keys(state).length > 0;

    if (
      state.known === true ||
      (
        !hasSpellState &&
        source.grantsKnown === true
      )
    ) {
      knownSpellIds.push(spellId);
    }

    if (
      state.prepared === true ||
      state.alwaysPrepared === true ||
      (
        !hasSpellState &&
        (
          source.grantsPrepared === true ||
          source.alwaysPrepared === true
        )
      )
    ) {
      preparedSpellIds.push(spellId);
    }
  };

  canonicalSources.forEach((source) => {
    getSourceSpellIds(source)
      .forEach((spellId) => {
        addCompatibilityState(
          source,
          spellId
        );
      });
  });

  magic.knownSpellIds = uniqueText(
    knownSpellIds
  );
  magic.preparedSpellIds = uniqueText(
    preparedSpellIds
  );

  const legacySource = canonicalSources.find(
    (source) => {
      return source.sourceId ===
        "class:legacy-spellcasting";
    }
  );
  magic.unassignedKnownSpellIds = legacySource
    ? getSourceSpellIds(legacySource)
        .filter((spellId) => {
          return (
            legacySource.spellStates[spellId]
              ?.known === true
          );
        })
    : [];
  magic.unassignedPreparedSpellIds = legacySource
    ? getSourceSpellIds(legacySource)
        .filter((spellId) => {
          return (
            legacySource.spellStates[spellId]
              ?.prepared === true
          );
        })
    : [];

  const classSources = isRecord(
    magic.classSources
  )
    ? Object.fromEntries(
        Object.entries(magic.classSources)
          .map(([key, value]) => {
            return [
              key,
              {
                ...(isRecord(value) ? value : {}),
                cantripIds: [],
                knownSpellIds: [],
                preparedSpellIds: [],
                spellbookSpellIds: [],
                alwaysPreparedSpellIds: [],
                subclassSpellIds: [],
                mysticArcanumSpellIds: {}
              }
            ];
          })
      )
    : {};
  const getClassCompatibilitySource = (source) => {
    const classEntryId = cleanText(
      source.classEntryId
    );

    if (!classEntryId) {
      return null;
    }

    classSources[classEntryId] = {
      ...(classSources[classEntryId] || {}),
      classEntryId,
      classId: source.classId,
      subclassId:
        source.subclassId ||
        classSources[classEntryId]
          ?.subclassId || "",
      spellcastingAbility:
        source.spellcastingAbility ||
        classSources[classEntryId]
          ?.spellcastingAbility || ""
    };

    return classSources[classEntryId];
  };

  canonicalSources.forEach((source) => {
    const compatibilitySource =
      getClassCompatibilitySource(source);

    if (!compatibilitySource) {
      return;
    }

    getSourceSpellIds(source)
      .forEach((spellId) => {
        const state =
          source.spellStates[spellId] || {};
        const add = (field) => {
          compatibilitySource[field] =
            uniqueText([
              ...(compatibilitySource[field] || []),
              spellId
            ]);
        };

        if (source.sourceType === "subclass") {
          add("alwaysPreparedSpellIds");
          add("subclassSpellIds");
          return;
        }

        if (
          source.sourceType ===
          "mystic-arcanum"
        ) {
          const level =
            state.mysticArcanumLevel ??
            wholeNumber(
              getSourceSpellRecord(
                source,
                spellId
              )?.level,
              0
            );

          if (level > 0) {
            compatibilitySource
              .mysticArcanumSpellIds[
                String(level)
              ] = spellId;
          }
          return;
        }

        if (state.cantrip === true) {
          add("cantripIds");
        } else if (state.spellbook === true) {
          add("spellbookSpellIds");
        } else if (state.prepared === true) {
          add("preparedSpellIds");
        } else if (
          state.known === true ||
          source.grantsKnown === true
        ) {
          add("knownSpellIds");
        }
      });
  });
  magic.classSources = classSources;

  const existingFeatSources = isRecord(
    magic.featSources
  )
    ? magic.featSources
    : {};
  magic.featSources = {};
  const featSpellcastingRecords = [];
  canonicalSources
    .filter((source) => {
      return [
        "feat",
        "magical-secrets"
      ].includes(source.sourceType);
    })
    .forEach((source) => {
      const spellIds = getSourceSpellIds(source);
      const records = spellIds.map((spellId) => {
        const sourceRecord =
          getSourceSpellRecord(
            source,
            spellId
          );

        return {
          ...sourceRecord,
          spellId,
          sourceId: source.sourceId,
          featId: source.featId,
          featName: source.sourceName,
          spellcastingAbility:
            cleanText(
              sourceRecord
                ?.spellcastingAbility,
              source.spellcastingAbility
            ),
          fixed:
            source.fixedSpellIds
              .includes(spellId),
          known:
            source.spellStates[spellId]
              ?.known === true ||
            sourceRecord?.known === true ||
            source.grantsKnown,
          prepared:
            source.spellStates[spellId]
              ?.prepared === true ||
            sourceRecord?.prepared === true ||
            source.grantsPrepared,
          alwaysPrepared:
            source.spellStates[spellId]
              ?.alwaysPrepared === true ||
            sourceRecord
              ?.alwaysPrepared === true ||
            source.alwaysPrepared,
          freeCastUses:
            sourceRecord?.freeCastUses ??
            source.freeCastUses,
          recharge: cleanText(
            sourceRecord?.recharge,
            source.recharge
          ),
          canUseSpellSlots:
            sourceRecord
              ?.canUseSpellSlots === true ||
            source.canUseSpellSlots,
          resourceId: cleanText(
            sourceRecord?.resourceId,
            source.resourceId
          )
        };
      });

      magic.featSources[source.sourceId] = {
        ...(isRecord(
          existingFeatSources[source.sourceId]
        )
          ? existingFeatSources[source.sourceId]
          : {}),
        sourceId: source.sourceId,
        sourceType: source.sourceType,
        sourceName: source.sourceName,
        featId: source.featId,
        featName: source.sourceName,
        sourceFeatureId:
          source.sourceFeatureId,
        sourceFeatureName:
          source.sourceFeatureName,
        selectionMode: source.selectionMode,
        choiceCount: source.choiceCount,
        spellIds,
        selectedSpellIds:
          source.selectedSpellIds,
        fixedSpellIds:
          source.fixedSpellIds,
        grants: source.fixedSpellIds.map(
          (spellId) => {
            return getSourceSpellRecord(
              source,
              spellId
            );
          }
        ),
        spellRecords: records,
        allowedSpellIds:
          source.allowedSpellIds,
        allowedClassLists:
          source.allowedClassLists,
        allowedSchools:
          source.allowedSchools,
        minimumSpellLevel:
          source.minimumSpellLevel,
        maximumSpellLevel:
          source.maximumSpellLevel,
        spellcastingAbility:
          source.spellcastingAbility,
        grantsKnown: source.grantsKnown,
        grantsPrepared:
          source.grantsPrepared,
        alwaysPrepared:
          source.alwaysPrepared,
        ritualOnly: source.ritualOnly,
        freeCastUses: source.freeCastUses,
        recharge: source.recharge,
        canUseSpellSlots:
          source.canUseSpellSlots,
        resourceId: source.resourceId,
        rulesSource: source.rulesSource,
        selectionGroups:
          source.selectionGroups
      };
      featSpellcastingRecords.push(
        ...records
      );
    });

  character.featMechanics = isRecord(
    character.featMechanics
  )
    ? character.featMechanics
    : {};
  character.featMechanics.spellcasting =
    featSpellcastingRecords;

  const recordForSource = (source) => {
    return getSourceSpellIds(source)
      .map((spellId) => {
        return {
          ...getSourceSpellRecord(
            source,
            spellId
          ),
          id: spellId,
          spellId,
          sourceId: source.sourceId,
          sourceType: source.sourceType,
          sourceName: source.sourceName,
          sourceLabel: source.sourceName,
          spellcastingAbility:
            source.spellcastingAbility,
          freeCastUses: source.freeCastUses,
          recharge: source.recharge,
          canUseSpellSlots:
            source.canUseSpellSlots,
          resourceId: source.resourceId
        };
      });
  };
  magic.innateSpells = canonicalSources
    .filter((source) => {
      return [
        "species",
        "background",
        "innate"
      ].includes(source.sourceType);
    })
    .flatMap(recordForSource);
  magic.customSpells = canonicalSources
    .filter((source) => {
      return source.sourceType ===
        "custom-spell";
    })
    .flatMap(recordForSource);
  magic.innateSpellIds = uniqueText(
    magic.innateSpells
  );
  magic.customSpellIds = uniqueText(
    magic.customSpells
  );

  return character;
}

export function synchronizeCanonicalSpellSources(
  character,
  {
    fromCompatibility = false,
    populateCompatibility =
      !fromCompatibility
  } = {}
) {
  if (!isRecord(character)) {
    return [];
  }

  character.magic = isRecord(character.magic)
    ? character.magic
    : {};
  const sources = fromCompatibility
    ? collectLegacySpellSources(character)
    : getCanonicalSpellSources(character);

  character.magic.spellSources = sources;
  character.magic.spellSourceModelVersion =
    SPELL_SOURCE_MODEL_VERSION;

  if (populateCompatibility) {
    populateSpellSourceCompatibility(
      character,
      sources
    );
  }

  return sources;
}

export function buildSpellLibraryFromSources(sources) {
  const records = new Map();

  normalizeSpellSources(sources)
    .forEach((source) => {
      const spellRecords = new Map(
        source.spellRecords.map((record) => {
          return [
            spellReferenceId(record),
            record
          ];
        })
      );

      uniqueText([
        ...source.selectedSpellIds,
        ...source.fixedSpellIds
      ]).forEach((spellId) => {
        const existing = records.get(spellId) || {
          spellId,
          spell: spellRecords.get(spellId) || null,
          sourceIds: [],
          sourceNames: [],
          sourceTypes: [],
          sources: []
        };

        if (!existing.spell) {
          existing.spell =
            spellRecords.get(spellId) || null;
        }

        if (!existing.sourceIds.includes(
          source.sourceId
        )) {
          existing.sourceIds.push(
            source.sourceId
          );
          existing.sourceNames.push(
            source.sourceName
          );
          existing.sourceTypes.push(
            source.sourceType
          );
          existing.sources.push({
            sourceId: source.sourceId,
            sourceType: source.sourceType,
            sourceName: source.sourceName,
            selected:
              source.selectedSpellIds.includes(
                spellId
              ),
            fixed:
              source.fixedSpellIds.includes(
                spellId
              ),
            spellState:
              source.spellStates[spellId] || {},
            spellcastingAbility:
              source.spellcastingAbility,
            grantsKnown: source.grantsKnown,
            grantsPrepared:
              source.grantsPrepared,
            alwaysPrepared:
              source.alwaysPrepared,
            ritualOnly: source.ritualOnly,
            freeCastUses: source.freeCastUses,
            recharge: source.recharge,
            canUseSpellSlots:
              source.canUseSpellSlots,
            resourceId: source.resourceId
          });
        }

        records.set(spellId, existing);
      });
    });

  return [...records.values()];
}

export function removeCanonicalSpellSource(
  sources,
  sourceId
) {
  const cleanSourceId = cleanText(sourceId);

  return normalizeSpellSources(sources)
    .filter((source) => {
      return source.sourceId !== cleanSourceId;
    });
}
