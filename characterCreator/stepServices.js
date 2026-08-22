const SHARED_SERVICE_KEYS = Object.freeze([
  "$",
  "applyCompatibilityAliases",
  "beginnerNote",
  "clampLevel",
  "cleanArray",
  "cleanString",
  "cloneData",
  "createEmptyCharacter",
  "escapeHtml",
  "getCreatorState",
  "markDraftChanged",
  "renderCreatorView",
  "safeDisplayString",
  "safeNumber",
  "setStatus",
  "uniqueCleanArray",
  "wizardChoiceCard",
  "wizardField",
  "wizardSelect"
]);

export function createCreatorSharedServices(
  dependencies = {}
) {
  const services = {};

  SHARED_SERVICE_KEYS.forEach((key) => {
    if (key in dependencies) {
      services[key] = dependencies[key];
    }
  });

  return Object.freeze(services);
}

export function createStepWarningCollector(
  warningGetters = {}
) {
  const entries = Object.entries(
    warningGetters
  ).filter(([, getWarnings]) => {
    return typeof getWarnings === "function";
  });

  return function getStepWarnings(
    stepIds,
    character
  ) {
    const requestedIds = Array.isArray(stepIds)
      ? new Set(stepIds)
      : new Set([stepIds]);

    return entries.flatMap(
      ([stepId, getWarnings]) => {
        if (!requestedIds.has(stepId)) {
          return [];
        }

        const warnings = getWarnings(character);

        return Array.isArray(warnings)
          ? warnings
          : [];
      }
    );
  };
}

export function createCharacterReviewServices(
  dependencies = {}
) {
  return Object.freeze({
    ...dependencies
  });
}
