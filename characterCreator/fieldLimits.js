export const CHARACTER_FIELD_LIMITS =
  Object.freeze({
    search: 100,
    name: 100,
    compact: 120,
    list: 500,
    summary: 1000,
    longText: 2000,
    itemDescription: 4000,
    featureDescription: 5000,
    spellDescription: 6000,
    backstory: 10000,
    url: 2048
  });

export const CHARACTER_IMPORT_MAX_BYTES =
  2 * 1024 * 1024;
export const CHARACTER_SERIALIZED_MAX_BYTES =
  900000;

const UTF8_ENCODER =
  typeof TextEncoder === "function"
    ? new TextEncoder()
    : null;
const guardedRoots = new WeakMap();

function cleanToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isMetadataPath(path) {
  return (
    /(^|\.)(?:id|docid|uid|owneruid|dmuid|roomcode|roomid|publicid|schema(?:version)?|rulesetid|createdat|updatedat|timestamp|finalizedatmillis|lastsavedatmillis|persistedatmillis)$/i
      .test(path)
  );
}

export function countUnicodeCharacters(value) {
  return Array.from(String(value ?? "")).length;
}

export function truncateUnicode(value, maximum) {
  const text = String(value ?? "");
  const limit = Math.max(
    0,
    Math.floor(Number(maximum) || 0)
  );

  if (!limit) {
    return "";
  }

  let result = "";
  let count = 0;

  for (const character of text) {
    if (count >= limit) {
      break;
    }

    result += character;
    count += 1;
  }

  return result;
}

export function getCharacterFieldLimit({
  id = "",
  path = "",
  type = "text",
  category = "",
  maxLength
} = {}) {
  if (
    Number.isFinite(Number(maxLength)) &&
    Number(maxLength) > 0
  ) {
    return Math.floor(Number(maxLength));
  }

  const requestedCategory =
    cleanToken(category);

  if (
    Object.hasOwn(
      CHARACTER_FIELD_LIMITS,
      requestedCategory
    )
  ) {
    return CHARACTER_FIELD_LIMITS[
      requestedCategory
    ];
  }

  const key =
    `${cleanToken(path)}.${cleanToken(id)}`;
  const inputType = cleanToken(type);

  if (
    inputType === "search" ||
    /\bsearch\b/.test(key)
  ) {
    return CHARACTER_FIELD_LIMITS.search;
  }

  if (
    inputType === "url" ||
    /(?:url|href|link)(?:$|[._-])/.test(key)
  ) {
    return CHARACTER_FIELD_LIMITS.url;
  }

  if (/backstory|biography/.test(key)) {
    return CHARACTER_FIELD_LIMITS.backstory;
  }

  if (
    /spell/.test(key) &&
    /description|details|text|notes/.test(key)
  ) {
    return CHARACTER_FIELD_LIMITS.spellDescription;
  }

  if (
    /feature|trait/.test(key) &&
    /description|details|summary|text|notes/.test(key)
  ) {
    return CHARACTER_FIELD_LIMITS.featureDescription;
  }

  if (
    /(?:equipment|inventory|item)/.test(key) &&
    /description|details|text|notes/.test(key)
  ) {
    return CHARACTER_FIELD_LIMITS.itemDescription;
  }

  if (/summary/.test(key)) {
    return CHARACTER_FIELD_LIMITS.summary;
  }

  if (
    /appearance|personality|ideals?|bonds?|flaws?|notes?/.test(key)
  ) {
    return CHARACTER_FIELD_LIMITS.longText;
  }

  if (
    /(?:name|title|label)(?:$|[._-])/.test(key)
  ) {
    return CHARACTER_FIELD_LIMITS.name;
  }

  if (
    /(?:list|proficien|languages?|components?|tags?|aliases?)/.test(key)
  ) {
    return CHARACTER_FIELD_LIMITS.list;
  }

  return inputType === "textarea"
    ? CHARACTER_FIELD_LIMITS.longText
    : CHARACTER_FIELD_LIMITS.compact;
}

function getObjectStringLimit(path, key, value) {
  const joinedPath =
    [...path, key].join(".");

  if (isMetadataPath(joinedPath)) {
    return null;
  }

  return getCharacterFieldLimit({
    path: joinedPath,
    type:
      /description|details|summary|appearance|personality|ideals?|bonds?|flaws?|backstory|notes?|text/i
        .test(key)
        ? "textarea"
        : "text"
  });
}

export function normalizeCharacterTextFields(
  value,
  path = []
) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      if (
        typeof entry === "string"
      ) {
        const parentKey =
          String(
            path[path.length - 1] ||
            ""
          );

        if (
          !/(?:id|ids|feats|levelorder|completedsteps|visitedsteps)$/i
            .test(parentKey)
        ) {
          value[index] =
            truncateUnicode(
              entry,
              CHARACTER_FIELD_LIMITS
                .list
            );
        }

        return;
      }

      if (
        entry &&
        typeof entry === "object"
      ) {
        normalizeCharacterTextFields(
          entry,
          [...path, String(index)]
        );
      }
    });

    return value;
  }

  if (
    !value ||
    typeof value !== "object"
  ) {
    return value;
  }

  Object.entries(value)
    .forEach(([key, entry]) => {
      if (typeof entry === "string") {
        const limit =
          getObjectStringLimit(
            path,
            key,
            entry
          );

        if (limit) {
          value[key] =
            truncateUnicode(
              entry,
              limit
            );
        }

        return;
      }

      if (
        entry &&
        typeof entry === "object"
      ) {
        normalizeCharacterTextFields(
          entry,
          [...path, key]
        );
      }
    });

  return value;
}

export function getUtf8ByteLength(value) {
  const text = String(value ?? "");

  if (UTF8_ENCODER) {
    return UTF8_ENCODER.encode(text).length;
  }

  return unescape(
    encodeURIComponent(text)
  ).length;
}

export function assertCharacterImportSize(
  value
) {
  const size =
    typeof value === "number"
      ? value
      : getUtf8ByteLength(value);

  if (size > CHARACTER_IMPORT_MAX_BYTES) {
    throw new Error(
      "Character import is too large. The maximum import size is 2 MB."
    );
  }

  return size;
}

export function assertCharacterSerializedSize(
  character
) {
  const text =
    typeof character === "string"
      ? character
      : JSON.stringify(character);
  const size = getUtf8ByteLength(text);

  if (size > CHARACTER_SERIALIZED_MAX_BYTES) {
    throw new Error(
      "This character is too large to save safely. Shorten large notes or descriptions and try again."
    );
  }

  return size;
}

function getElementLimit(element) {
  const explicit =
    Number(
      element.dataset
        ?.characterFieldLimit
    );

  return getCharacterFieldLimit({
    id: element.id,
    path:
      element.dataset?.draftPath ||
      element.name,
    type:
      element.tagName === "TEXTAREA"
        ? "textarea"
        : element.type,
    category:
      element.dataset
        ?.fieldLimitCategory,
    maxLength:
      Number.isFinite(explicit) &&
      explicit > 0
        ? explicit
        : undefined
  });
}

function shouldShowCounter(element) {
  if (element.tagName !== "TEXTAREA") {
    return false;
  }

  const key =
    `${
      element.dataset?.draftPath || ""
    } ${element.id || ""}`.toLowerCase();

  return /appearance|personality|traits?|ideals?|bonds?|flaws?|backstory|description|summary|notes?/
    .test(key);
}

function updateCounter(element) {
  if (!shouldShowCounter(element)) {
    return;
  }

  const id = element.id;

  if (!id) {
    return;
  }

  const counter =
    Array.from(
      element.parentElement
        ?.querySelectorAll(
          "[data-character-counter-for]"
        ) || []
    ).find((candidate) => {
      return (
        candidate.dataset
          .characterCounterFor === id
      );
    });

  if (counter) {
    counter.textContent =
      `${countUnicodeCharacters(element.value)} / ${getElementLimit(element)}`;
  }
}

export function applyCharacterCreatorFieldLimits(
  root =
    typeof document !== "undefined"
      ? document
      : null
) {
  if (
    !root ||
    typeof root.querySelectorAll !==
      "function"
  ) {
    return root;
  }

  root.querySelectorAll(
    'input[type="text"], input[type="search"], input[type="url"], textarea'
  ).forEach((element) => {
    const limit = getElementLimit(
      element
    );

    element.setAttribute(
      "maxlength",
      String(limit)
    );
    element.dataset
      .characterFieldLimit =
        String(limit);

    if (
      shouldShowCounter(element) &&
      element.id &&
      !Array.from(
        element.parentElement
          ?.querySelectorAll(
            "[data-character-counter-for]"
          ) || []
      ).some((candidate) => {
        return (
          candidate.dataset
            .characterCounterFor ===
          element.id
        );
      })
    ) {
      const counter =
        element.ownerDocument
          .createElement("span");

      counter.className =
        "hg-character-text-counter";
      counter.dataset
        .characterCounterFor =
          element.id;
      counter.setAttribute(
        "aria-live",
        "polite"
      );
      element.insertAdjacentElement(
        "afterend",
        counter
      );
    }

    updateCounter(element);
  });

  return root;
}

export function installCharacterCreatorTextInputGuard({
  root =
    typeof document !== "undefined"
      ? document
      : null
} = {}) {
  if (
    !root ||
    typeof root.addEventListener !==
      "function"
  ) {
    return null;
  }

  if (guardedRoots.has(root)) {
    const existing =
      guardedRoots.get(root);

    applyCharacterCreatorFieldLimits(
      root
    );
    return existing;
  }

  const composing = new WeakSet();
  const isLimitedField = (element) => {
    return (
      element?.matches?.(
        'input[type="text"], input[type="search"], input[type="url"], textarea'
      ) === true
    );
  };
  const correct = (element) => {
    if (!isLimitedField(element)) {
      return;
    }

    const limit = getElementLimit(
      element
    );
    const corrected =
      truncateUnicode(
        element.value,
        limit
      );

    if (corrected !== element.value) {
      element.value = corrected;
    }

    updateCounter(element);
  };
  const onCompositionStart = (event) => {
    if (isLimitedField(event.target)) {
      composing.add(event.target);
    }
  };
  const onCompositionEnd = (event) => {
    composing.delete(event.target);
    correct(event.target);
  };
  const onInput = (event) => {
    if (!composing.has(event.target)) {
      correct(event.target);
    }
  };

  root.addEventListener(
    "compositionstart",
    onCompositionStart,
    true
  );
  root.addEventListener(
    "compositionend",
    onCompositionEnd,
    true
  );
  root.addEventListener(
    "input",
    onInput,
    true
  );

  const installation = {
    disconnect() {
      root.removeEventListener(
        "compositionstart",
        onCompositionStart,
        true
      );
      root.removeEventListener(
        "compositionend",
        onCompositionEnd,
        true
      );
      root.removeEventListener(
        "input",
        onInput,
        true
      );
      guardedRoots.delete(root);
    }
  };

  guardedRoots.set(
    root,
    installation
  );
  applyCharacterCreatorFieldLimits(
    root
  );

  return installation;
}
