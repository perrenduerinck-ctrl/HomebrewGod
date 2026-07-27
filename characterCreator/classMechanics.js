function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number)
    ? number
    : fallback;
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

function cloneFeature(feature) {
  return (
    feature &&
    typeof feature === "object" &&
    !Array.isArray(feature)
  )
    ? { ...feature }
    : feature;
}

export function getClassFeaturesThroughLevel(
  featuresByLevel,
  level,
  normalizeFeature = cloneFeature
) {
  const totalLevel = clampLevel(level);
  const progression =
    featuresByLevel &&
    typeof featuresByLevel === "object" &&
    !Array.isArray(featuresByLevel)
      ? featuresByLevel
      : {};

  return Object.entries(progression)
    .sort((a, b) => {
      return (
        safeNumber(a[0]) -
        safeNumber(b[0])
      );
    })
    .flatMap(([levelKey, features]) => {
      const unlockedLevel = Math.max(
        1,
        Math.round(
          safeNumber(levelKey, 1)
        )
      );

      if (
        unlockedLevel > totalLevel ||
        !Array.isArray(features)
      ) {
        return [];
      }

      return features.map((feature) => {
        return normalizeFeature(
          feature,
          unlockedLevel
        );
      });
    });
}

export function getClassResourceMaximum(
  resource,
  classLevel
) {
  if (
    !resource ||
    typeof resource !== "object"
  ) {
    return 0;
  }

  if (
    resource.maximumByLevel &&
    typeof resource.maximumByLevel === "object"
  ) {
    const eligibleLevel = Object.keys(
      resource.maximumByLevel
    ).map((value) => {
      return Math.round(
        safeNumber(value, 0)
      );
    }).filter((value) => {
      return (
        value > 0 &&
        value <= clampLevel(classLevel)
      );
    }).sort((a, b) => b - a)[0];

    if (eligibleLevel) {
      return Math.max(
        0,
        safeNumber(
          resource.maximumByLevel[
            eligibleLevel
          ],
          0
        )
      );
    }
  }

  return Math.max(
    0,
    safeNumber(
      resource.maximum ??
      resource.max,
      0
    )
  );
}
