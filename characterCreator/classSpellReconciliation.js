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
  const entries = (Array.isArray(classEntries) ? classEntries : []).filter(isRecord);
  const byEntry = new Map();
  for (const entry of entries) for (const id of uniqueText([entry.entryId, entry.classEntryId])) byEntry.set(id, entry);
  return { entries, byEntry };
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

function evaluateClassSource(source, fallbackEntryId, identities) {
  const sourceType = cleanText(source?.sourceType);
  if (sourceType && !CLASS_OWNED_SOURCE_TYPES.has(sourceType)) return { classOwned: false, active: true, uncertain: false };
  const entryId = cleanText(source?.classEntryId || fallbackEntryId);
  const classId = cleanText(source?.classId).toLowerCase();
  const matchesClass = (entry) => !classId || [entry.classId, entry.className].some((id) => cleanText(id).toLowerCase() === classId);
  let entry = identities.byEntry.get(entryId);
  if (entry && !matchesClass(entry)) return { classOwned: true, active: false, uncertain: false, reason: "class-identity-conflict" };
  if (!entry && entryId) {
    // Older sources sometimes used the class ID itself as their entry key.
    if (classId && entryId.toLowerCase() === classId) entry = identities.entries.find(matchesClass);
    if (!entry) return { classOwned: true, active: false, uncertain: false, reason: "class-removed" };
  }
  entry ||= classId ? identities.entries.find(matchesClass) : null;
  if (!entry) return { classOwned: CLASS_OWNED_SOURCE_TYPES.has(sourceType), active: !classId, uncertain: !classId, reason: "unassigned-ownership" };
  if (sourceType === "subclass") {
    const subclassId = cleanText(source?.subclassId).toLowerCase();
    if (subclassId && subclassId !== cleanText(entry.subclassId).toLowerCase()) return { classOwned: true, active: false, uncertain: false, reason: "subclass-identity-conflict" };
    if (!subclassId) return { classOwned: true, active: true, uncertain: true, reason: "unassigned-subclass" };
  }
  return { classOwned: true, active: true, uncertain: !entryId, reason: !entryId ? "unassigned-entry" : "" };
}

export function getSpellSourceOwnership(source, classEntries = [], fallbackEntryId = "") {
  return evaluateClassSource(source, fallbackEntryId, getClassIdentitySets(classEntries));
}

function archiveRemovedSources(character, removedSources) {
  character.builder = isRecord(character.builder) ? character.builder : {};
  const previousArchive = Array.isArray(character.builder.archivedClassSpellSources) ? character.builder.archivedClassSpellSources.filter(isRecord).slice(-64) : [];
  if (!removedSources.length) {
    if (character.builder.archivedClassSpellSources) character.builder.archivedClassSpellSources = previousArchive;
    return;
  }
  const archive = new Map();
  for (const source of [...previousArchive, ...removedSources]) {
    const type = source.sourceType || "class";
    const key = [type, source.classEntryId || source.classId || source.sourceId || "unknown", source.subclassId || "", ["class","subclass"].includes(type) ? "" : source.sourceId || ""].join(":");
    const previous = archive.get(key) || {};
    const merged = {...previous,...source,archivedReason:source.archivedReason || previous.archivedReason || "class-removed",spellStates:{...(previous.spellStates || {}),...(source.spellStates || {})}};
    for (const field of ["selectedSpellIds","fixedSpellIds","cantripIds","knownSpellIds","preparedSpellIds","spellbookSpellIds","alwaysPreparedSpellIds"]) if(previous[field] || source[field]) merged[field]=uniqueText([...(previous[field] || []),...(source[field] || [])]);
    merged.spellbookAcquisitions = {...(previous.spellbookAcquisitions || {}),...(source.spellbookAcquisitions || {})};
    archive.set(key,merged);
  }
  character.builder.archivedClassSpellSources = [...archive.values()].slice(-64);
}

export function reconcileClassOwnedSpellSources(
  character,
  classEntries = character?.classProgression?.classes,
  { quarantineUncertain = false } = {}
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

      if (result.active && !(quarantineUncertain && result.uncertain)) {
        let retained = source;
        const grantOwnership = source.subclassId ? evaluateClassSource({...source,sourceType:"subclass"},sourceKey,identities) : null;
        if (grantOwnership && !grantOwnership.active) {
          const grants=uniqueText([...(source.alwaysPreparedSpellIds || []),...(source.subclassSpellIds || [])]);
          if(grants.length) removedSources.push({...source,sourceType:"subclass",sourceId:"subclass:"+sourceKey+":"+source.subclassId,fixedSpellIds:grants,selectedSpellIds:[],knownSpellIds:[],preparedSpellIds:[],spellbookSpellIds:[],cantripIds:[],alwaysPreparedSpellIds:grants,archivedReason:grantOwnership.reason});
          const owner=identities.byEntry.get(source.classEntryId || sourceKey);
          retained={...source,alwaysPreparedSpellIds:[],subclassSpellIds:[],subclassId:owner?.subclassId || "",subclassName:owner?.subclassName || ""};
          changed=true;
        }
        retainedClassSources[sourceKey] = retained;
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
          sourceType: "class",
          archivedReason: result.reason || "class-removed"
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

    if (result.active && !(quarantineUncertain && result.uncertain)) {
      retainedCanonicalSources.push(source);
      if (result.uncertain) {
        reviewWarnings.push(
          `${cleanText(source?.sourceName) || "A legacy spell source"} has unknown class ownership and was preserved for review.`
        );
      }
    } else {
      removedSources.push({ ...source, archivedReason: result.reason || "class-removed" });
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
  const removalWarnings = removedSources.map((source) => `${source.sourceName || source.className || source.classId || "A spell source"} was archived because its class or subclass ownership no longer matches. Review archived spell sources in Spells / Features.`);
  character.builder.validation.classChangeReviewWarnings = uniqueText([...(character.builder.validation.classChangeReviewWarnings || []), ...reviewWarnings, ...removalWarnings]);
  character.builder.validation.unresolvedSpellSourceWarnings = uniqueText(reviewWarnings);

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
