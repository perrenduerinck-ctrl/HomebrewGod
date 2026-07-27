function cleanText(value, fallback = "") {
  const text = String(
    value == null
      ? ""
      : value
  ).trim();
  return text || fallback;
}

function firstText(...values) {
  for (const value of values) {
    const text = cleanText(value);

    if (text) {
      return text;
    }
  }

  return "";
}

function normalizeKey(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleFromId(value, fallback) {
  const text = cleanText(value);
  return text
    ? text
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\b\w/g, (letter) => {
        return letter.toUpperCase();
      })
    : fallback;
}

function safeImageUrl(value) {
  const url = cleanText(value);
  return (
    /^(https?:|blob:)/i.test(url) ||
    /^data:image\/(?:png|jpe?g|gif|webp|avif);base64,/i.test(url)
  )
    ? url
    : "";
}

export function getPresentationClassEntries(
  character
) {
  const rawEntries =
    Array.isArray(
      character?.classProgression?.classes
    )
      ? character.classProgression.classes
      : [];

  if (rawEntries.length) {
    return rawEntries.map(
      (entry, index) => ({
        className: cleanText(
          entry?.className,
          titleFromId(
            entry?.classId,
            "Class"
          )
        ),
        level: Math.max(
          1,
          Math.round(
            Number(entry?.level) || 1
          )
        ),
        subclassName: cleanText(
          entry?.subclassName
        ),
        entryId: cleanText(
          entry?.entryId,
          `class-${index + 1}`
        )
      })
    );
  }

  return [{
    className: cleanText(
      character?.className ??
      character?.classData?.className,
      "No Class"
    ),
    level: Math.max(
      1,
      Math.round(
        Number(character?.level) || 1
      )
    ),
    subclassName: cleanText(
      character?.subclassName
    ),
    entryId: "legacy-class-1"
  }];
}

export function formatPresentationClass(
  entry
) {
  const className = cleanText(
    entry?.className,
    "Class"
  );

  if (
    normalizeKey(className) ===
    "no-class"
  ) {
    return "No Class";
  }

  const level = Math.max(
    1,
    Math.round(
      Number(entry?.level) || 1
    )
  );
  const subclass = cleanText(
    entry?.subclassName
  );

  return (
    `${className} ${level}` +
    (
      subclass
        ? ` \u2014 ${subclass}`
        : ""
    )
  );
}

export function buildCharacterSheetPresentation(
  character
) {
  const safeCharacter =
    character &&
    typeof character === "object" &&
    !Array.isArray(character)
      ? character
      : {};
  const name = cleanText(
    firstText(
      safeCharacter?.identity?.name,
      safeCharacter?.name
    ),
    "Unnamed Character"
  );
  const classEntries =
    getPresentationClassEntries(
      safeCharacter
    );

  return {
    name,
    initial:
      name.charAt(0).toUpperCase() ||
      "?",
    speciesName: cleanText(
      firstText(
        safeCharacter?.species?.name,
        safeCharacter?.race
      ),
      "No Species"
    ),
    backgroundName: cleanText(
      firstText(
        safeCharacter?.background?.name,
        safeCharacter?.backgroundName
      ),
      "No Background"
    ),
    portraitUrl: safeImageUrl(
      firstText(
        safeCharacter?.identity?.image?.url,
        safeCharacter?.image?.url
      )
    ),
    classEntries,
    classLine: classEntries
      .map(formatPresentationClass)
      .join(" / ")
  };
}
