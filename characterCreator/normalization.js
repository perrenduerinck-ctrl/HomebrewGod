function isRecord(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function cleanText(value) {
  return String(
    value == null
      ? ""
      : value
  ).trim();
}

export function normalizeCharacterEnvelope(
  rawCharacter
) {
  return isRecord(rawCharacter)
    ? rawCharacter
    : {};
}

export function buildLegacyMigrationReport(
  rawCharacter
) {
  const raw = normalizeCharacterEnvelope(
    rawCharacter
  );
  const legacyFields = [
    ["name", raw.name],
    ["race", raw.race],
    ["className", raw.className],
    ["level", raw.level],
    ["stats", raw.stats],
    ["spells", raw.spells],
    ["featuresText", raw.featuresText],
    ["equipmentText", raw.equipmentText]
  ].filter(([, value]) => {
    if (isRecord(value)) {
      return Object.keys(value).length > 0;
    }

    return (
      Array.isArray(value)
        ? value.length > 0
        : cleanText(value) !== ""
    );
  }).map(([field]) => field);

  return {
    requiresMigration:
      legacyFields.length > 0,
    legacyFields,
    hasCanonicalIdentity:
      isRecord(raw.identity),
    hasCanonicalProgression:
      isRecord(raw.classProgression)
  };
}
