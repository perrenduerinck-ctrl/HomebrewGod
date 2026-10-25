const CLASS_OWNED_SOURCE_TYPES = new Set([
  "class",
  "subclass",
  "magical-secrets",
  "mystic-arcanum"
]);

function isRecord(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function uniqueText(values = []) {
  return [...new Set(
    (Array.isArray(values) ? values : [])
      .map(cleanText)
      .filter(Boolean)
  )];
}

function getClassIdentitySets(classEntries = []) {
  const entryIds = new Set();
  const classIds = new Set();

  (Array.isArray(classEntries) ? classEntries : [])
    .forEach((entry) => {
      [
        entry?.entryId,
        entry?.classEntryId
      ].map(cleanText).filter(Boolean)
        .forEach((id) => entryIds.add(id));
      [
        entry?.classId,
        entry?.className
      ].map(cleanText).filter(Boolean)
        .forEach((id) => classIds.add(id));
    });

  return { entryIds, classIds };
}

function getSourceSpellIds(source = {}) {
  return uniqueText([
    ...(Array.isArray(source?.selectedSpellIds)
      ? source.selectedSpellIds
      : []),
    ...(Array.isArray(source?.fixedSpellIds)
      ? source.fixedSpellIds
      : []),
    ...(Array.isArray(source?.cantripIds)
      ? source.cantripIds
      : []),
    ...(Array.isArray(source?.knownSpellIds)
      ? source.knownSpellIds
      : []),
    ...(Array.isArray(source?.preparedSpellIds)
      ? source.preparedSpellIds
      : []),
    ...(Array.isArray(source?.spellbookSpellIds)
      ? source.spellbookSpellIds
      : []),
    ...(Array.isArray(source?.alwaysPreparedSpellIds)
      ? source.alwaysPreparedSpellIds
      : []),
    ...Object.values(
      isRecord(source?.mysticArcanumSpellIds)
        ? source.mysticArcanumSpellIds
        : {}
    )
  ]);
}

function evaluateClassSource(
  source,
  fallbackEntryId,
  identities
) {
  const sourceType = cleanText(
    source?.sourceType
  );
  const classEntryId = cleanText(
    source?.classEntryId || fallbackEntryId
  );
  const classId = cleanText(source?.classId);

  if (
    sourceType &&
    !CLASS_OWNED_SOURCE_TYPES.has(sourceType)
  ) {
    return { classOwned: false, active: true, uncertain: false };
  }

  if (classEntryId && identities.entryIds.has(classEntryId)) {
    return { classOwned: true, active: true, uncertain: false };
  }

  if (classId && identities.classIds.has(classId)) {
    return { classOwned: true, active: true, uncertain: false };
  }

  if (classEntryId || classId) {
    return { classOwned: true, active: false, uncertain: false };
  }

  return {
    classOwned: CLASS_OWNED_SOURCE_TYPES.has(sourceType),
    active: true,
    uncertain: CLASS_OWNED_SOURCE_TYPES.has(sourceType)
  };
}

function archiveRemovedSources(
  character,
  removedSources
) {
  if (!removedSources.length) {
    return;
  }

  character.builder = isRecord(character.builder)
    ? character.builder
    : {};
  const previousArchive = Array.isArray(
    character.builder.archivedClassSpellSources
  )
    ? character.builder.archivedClassSpellSources
    : [];
  const byId = new Map(
    previousArchive.map((source, index) => [
      cleanText(
        source?.sourceId ||
        source?.classEntryId ||
        `archive-${index}`
      ),
      source
    ])
  );

  removedSources.forEach((source, index) => {
    const key = cleanText(
      source?.sourceId ||
      source?.classEntryId ||
      source?.classId ||
      `removed-${index}`
    );
    byId.set(key, {
      ...source,
      archivedReason: "class-removed"
    });
  });

  character.builder.archivedClassSpellSources = [
    ...byId.values()
  ].slice(-64);
}

export function reconcileClassOwnedSpellSources(
  character,
  classEntries = character?.classProgression?.classes
) {
  if (!isRecord(character)) {
    return {
      changed: false,
      removedSourceIds: [],
      deactivatedSpellIds: [],
      reviewWarnings: []
    };
  }

  character.magic = isRecord(character.magic)
    ? character.magic
    : {};
  const magic = character.magic;
  const identities = getClassIdentitySets(classEntries);
  const removedSources = [];
  const reviewWarnings = [];
  let changed = false;

  const classSources = isRecord(magic.classSources)
    ? magic.classSources
    : {};
  const retainedClassSources = {};

  Object.entries(classSources)
    .forEach(([sourceKey, rawSource]) => {
      const source = isRecord(rawSource)
        ? rawSource
        : {};
      const result = evaluateClassSource(
        { ...source, sourceType: "class" },
        sourceKey,
        identities
      );

      if (result.active) {
        retainedClassSources[sourceKey] = source;
        if (result.uncertain) {
          reviewWarnings.push(
            `Spell source ${sourceKey} has unknown class ownership and was preserved for review.`
          );
        }
      } else {
        removedSources.push({
          ...source,
          sourceId: cleanText(source.sourceId) || sourceKey,
          classEntryId: cleanText(
            source.classEntryId || sourceKey
          ),
          sourceType: "class"
        });
        changed = true;
      }
    });

  magic.classSources = retainedClassSources;

  const canonicalSources = Array.isArray(
    magic.spellSources
  )
    ? magic.spellSources
    : [];
  const retainedCanonicalSources = [];

  canonicalSources.forEach((source) => {
    const result = evaluateClassSource(
      source,
      "",
      identities
    );

    if (result.active) {
      retainedCanonicalSources.push(source);
      if (result.uncertain) {
        reviewWarnings.push(
          `${cleanText(source?.sourceName) || "A legacy spell source"} has unknown class ownership and was preserved for review.`
        );
      }
    } else {
      removedSources.push(source);
      changed = true;
    }
  });

  if (canonicalSources.length) {
    magic.spellSources = retainedCanonicalSources;
  }

  const removedSpellIds = new Set(
    removedSources.flatMap(getSourceSpellIds)
  );
  const retainedSpellIds = new Set([
    ...Object.values(retainedClassSources)
      .flatMap(getSourceSpellIds),
    ...retainedCanonicalSources
      .flatMap(getSourceSpellIds),
    ...Object.entries(magic)
      .filter(([key, value]) => {
        return (
          key !== "classSources" &&
          key !== "spellSources" &&
          /Sources$/.test(key) &&
          isRecord(value)
        );
      })
      .flatMap(([, sourceStore]) => {
        return Object.values(sourceStore)
          .flatMap(getSourceSpellIds);
      })
  ]);
  const deactivatedSpellIds = [...removedSpellIds]
    .filter((spellId) => {
      return !retainedSpellIds.has(spellId);
    });
  const deactivatedSet = new Set(deactivatedSpellIds);

  [
    "knownSpellIds",
    "preparedSpellIds",
    "unassignedKnownSpellIds",
    "unassignedPreparedSpellIds"
  ].forEach((field) => {
    const before = uniqueText(magic[field]);
    const after = before.filter((spellId) => {
      return !deactivatedSet.has(spellId);
    });
    if (after.length !== before.length) {
      changed = true;
    }
    magic[field] = after;
  });

  if (Array.isArray(magic.customSpells)) {
    magic.customSpells.forEach((spell) => {
      const result = evaluateClassSource(
        {
          sourceType: "class",
          classEntryId:
            spell?.classEntryId ||
            spell?.spellcastingSourceId,
          classId: spell?.classId
        },
        "",
        identities
      );

      if (
        !result.active &&
        cleanText(
          spell?.classEntryId ||
          spell?.spellcastingSourceId ||
          spell?.classId
        )
      ) {
        const inactiveClassSourceId = cleanText(
          spell.classEntryId ||
          spell.spellcastingSourceId ||
          spell.classId
        );
        if (
          spell.known !== false ||
          spell.prepared !== false ||
          spell.inactiveClassSourceId !== inactiveClassSourceId
        ) {
          changed = true;
        }
        spell.known = false;
        spell.prepared = false;
        spell.inactiveClassSourceId = inactiveClassSourceId;
      }
    });
  }

  archiveRemovedSources(character, removedSources);

  character.builder = isRecord(character.builder)
    ? character.builder
    : {};
  character.builder.validation = isRecord(
    character.builder.validation
  )
    ? character.builder.validation
    : {};
  character.builder.validation.classChangeReviewWarnings =
    uniqueText(reviewWarnings);

  return {
    changed,
    removedSourceIds: uniqueText(
      removedSources.map((source) => {
        return source?.sourceId ||
          source?.classEntryId ||
          source?.classId;
      })
    ),
    deactivatedSpellIds,
    reviewWarnings: uniqueText(reviewWarnings)
  };
}
