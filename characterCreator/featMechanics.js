import {
  DEFAULT_FEAT_ABILITY_SCORE_MAXIMUM
} from "../defaultFeats.js";

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

