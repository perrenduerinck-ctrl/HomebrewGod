function isRecord(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function defaultClone(value) {
  if (Array.isArray(value)) {
    return value.map(defaultClone);
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(
        ([key, entry]) => [
          key,
          defaultClone(entry)
        ]
      )
    );
  }

  return value;
}

export function mergeSubclassFeatureLevels(
  rawSubclass,
  cloneValue = defaultClone
) {
  const raw = isRecord(rawSubclass)
    ? rawSubclass
    : {};
  const levels = isRecord(raw.levels)
    ? cloneValue(raw.levels)
    : {};
  const featuresByLevel =
    isRecord(raw.featuresByLevel)
      ? raw.featuresByLevel
      : {};

  Object.entries(
    featuresByLevel
  ).forEach(([level, features]) => {
    const existingLevel =
      isRecord(levels[level])
        ? levels[level]
        : {};

    levels[level] = {
      ...existingLevel,
      features:
        Array.isArray(features)
          ? cloneValue(features)
          : Array.isArray(
              existingLevel.features
            )
            ? existingLevel.features
            : []
    };
  });

  return levels;
}

export function getSubclassFeaturesThroughLevel(
  subclass,
  level
) {
  const maximumLevel = Math.max(
    1,
    Math.min(
      20,
      Math.round(
        Number(level) || 1
      )
    )
  );
  const levels = mergeSubclassFeatureLevels(
    subclass
  );

  return Object.entries(levels)
    .map(([levelKey, entry]) => {
      return {
        level: Math.max(
          1,
          Math.round(
            Number(levelKey) || 1
          )
        ),
        features:
          Array.isArray(entry?.features)
            ? entry.features
            : []
      };
    })
    .filter((entry) => {
      return entry.level <= maximumLevel;
    })
    .sort((a, b) => {
      return a.level - b.level;
    })
    .flatMap((entry) => {
      return entry.features.map(
        (feature) => ({
          ...(
            isRecord(feature)
              ? feature
              : { name: String(feature) }
          ),
          level: entry.level
        })
      );
    });
}
