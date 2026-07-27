function cleanArray(value) {
  return (
    Array.isArray(value)
      ? value
      : []
  ).map((entry) => {
    return String(
      entry == null
        ? ""
        : entry
    ).trim();
  }).filter(Boolean);
}

export function normalizeContentChoiceGroup(
  rawChoice
) {
  const choice =
    rawChoice &&
    typeof rawChoice === "object" &&
    !Array.isArray(rawChoice)
      ? rawChoice
      : {};

  return {
    choose: Math.max(
      0,
      Math.round(
        Number(choice.choose) || 0
      )
    ),
    from: cleanArray(choice.from)
  };
}

export function normalizeSpeciesBackgroundChoices(
  content
) {
  const raw =
    content &&
    typeof content === "object" &&
    !Array.isArray(content)
      ? content
      : {};

  return {
    skillChoices:
      normalizeContentChoiceGroup(
        raw.skillChoices
      ),
    toolChoices:
      normalizeContentChoiceGroup(
        raw.toolChoices
      ),
    languageChoices:
      normalizeContentChoiceGroup(
        raw.languageChoices
      )
  };
}

export function countRequiredContentChoices(
  content
) {
  return Object.values(
    normalizeSpeciesBackgroundChoices(
      content
    )
  ).reduce((total, choice) => {
    return total + choice.choose;
  }, 0);
}
