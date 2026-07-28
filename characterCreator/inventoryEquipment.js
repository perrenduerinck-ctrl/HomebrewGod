function cleanText(value, fallback = "") {
  const text = String(
    value == null
      ? ""
      : value
  ).trim();
  return text || fallback;
}

function optionalNonNegativeNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number)
    ? Math.max(0, number)
    : 0;
}

function normalizeMechanicKey(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function nonNegativeInteger(
  value,
  fallback = null
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? Math.max(
        0,
        Math.round(number)
      )
    : fallback;
}

const ATTUNEMENT_FEATURE_LIMITS =
  Object.freeze({
    magicitemadept: 4,
    magicitemsavant: 5,
    magicitemmaster: 6
  });

export function getCharacterAttunementLimit(
  character
) {
  const limitFields = [
    "attunementLimit",
    "maximumAttunedItems",
    "maxAttunedItems",
    "attunementSlots"
  ];
  const bonusFields = [
    "attunementLimitBonus",
    "attunementSlotBonus",
    "additionalAttunementSlots"
  ];
  const overrideFields = [
    "attunementLimitOverride",
    "maximumAttunedItemsOverride"
  ];
  const limitTypes = new Set([
    "attunementlimit",
    "maximumattuneditems",
    "maxattuneditems",
    "attunementslots"
  ]);
  const bonusTypes = new Set([
    "attunementlimitbonus",
    "attunementslotbonus",
    "additionalattunementslots"
  ]);
  const visited = new Set();
  let featureLimit = 3;
  let bonus = 0;
  let override = null;

  function applyLimit(value) {
    const limit =
      nonNegativeInteger(value);

    if (limit !== null) {
      featureLimit = Math.max(
        featureLimit,
        limit
      );
    }
  }

  function applyBonus(value) {
    const amount = Number(value);

    if (Number.isFinite(amount)) {
      bonus += Math.round(amount);
    }
  }

  function applyOverride(value) {
    const limit =
      nonNegativeInteger(value);

    if (limit !== null) {
      override = limit;
    }
  }

  function visit(value) {
    if (
      !value ||
      typeof value !== "object" ||
      visited.has(value)
    ) {
      return;
    }

    visited.add(value);

    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    if (value.enabled === false) {
      return;
    }

    const type =
      normalizeMechanicKey(
        value.type ||
        value.mechanicType ||
        value.effectType
      );
    const featureKeys = [
      normalizeMechanicKey(
        value.id
      ),
      normalizeMechanicKey(
        value.name
      )
    ].filter(Boolean);
    let typedValueApplied = false;

    if (limitTypes.has(type)) {
      applyLimit(
        value.value ??
        value.limit ??
        value.maximum
      );
      typedValueApplied = true;
    } else if (bonusTypes.has(type)) {
      applyBonus(
        value.value ??
        value.bonus
      );
      typedValueApplied = true;
    }

    featureKeys.forEach((featureKey) => {
      if (
        ATTUNEMENT_FEATURE_LIMITS[
          featureKey
        ]
      ) {
        applyLimit(
          ATTUNEMENT_FEATURE_LIMITS[
            featureKey
          ]
        );
      }
    });

    if (!typedValueApplied) {
      limitFields.forEach((field) => {
        if (
          value[field] !== undefined
        ) {
          applyLimit(value[field]);
        }
      });
      bonusFields.forEach((field) => {
        if (
          value[field] !== undefined
        ) {
          applyBonus(value[field]);
        }
      });
    }

    overrideFields.forEach((field) => {
      if (value[field] !== undefined) {
        applyOverride(value[field]);
      }
    });

    Object.values(value).forEach(visit);
  }

  [
    character?.mechanics,
    character?.classMechanics,
    character?.featMechanics,
    character?.features,
    character?.feats,
    character?.species,
    character?.classProgression,
    character?.homebrew,
    character?.rules
  ].forEach(visit);

  const artificerLevel = (
    Array.isArray(
      character?.classProgression
        ?.classes
    )
      ? character.classProgression
          .classes
      : []
  ).reduce((total, entry) => {
    const classKey =
      normalizeMechanicKey(
        entry?.classId ||
        entry?.className
      );

    return classKey === "artificer"
      ? total +
          Math.max(
            0,
            Math.round(
              Number(entry?.level) || 0
            )
          )
      : total;
  }, 0);

  if (artificerLevel >= 18) {
    applyLimit(6);
  } else if (artificerLevel >= 14) {
    applyLimit(5);
  } else if (artificerLevel >= 10) {
    applyLimit(4);
  }

  [
    character,
    character?.equipment
  ].forEach((source) => {
    if (
      !source ||
      typeof source !== "object"
    ) {
      return;
    }

    limitFields.forEach((field) => {
      if (source[field] !== undefined) {
        applyLimit(source[field]);
      }
    });
    bonusFields.forEach((field) => {
      if (source[field] !== undefined) {
        applyBonus(source[field]);
      }
    });
    overrideFields.forEach((field) => {
      if (source[field] !== undefined) {
        applyOverride(source[field]);
      }
    });
  });

  return override === null
    ? Math.max(0, featureLimit + bonus)
    : override;
}

export function countCharacterAttunedItems(
  character
) {
  const items =
    Array.isArray(
      character?.equipment?.items
    )
      ? character.equipment.items
      : [];

  return items.filter((item) => {
    return (
      item?.requiresAttunement === true &&
      item?.attuned === true
    );
  }).length;
}

export function normalizeInventoryItemBase(
  rawItem,
  fallbackSource = "custom"
) {
  const raw =
    rawItem &&
    typeof rawItem === "object" &&
    !Array.isArray(rawItem)
      ? rawItem
      : {};
  const name = cleanText(
    raw.name,
    "Unnamed Item"
  );
  const category = cleanText(
    raw.category,
    "miscellaneous"
  );
  const isMagical =
    raw.isMagical === true ||
    category.toLowerCase() ===
      "magic-item";
  const isContainer =
    raw.isContainer === true;

  return {
    raw,
    name,
    category,
    quantity: Math.max(
      1,
      Math.round(
        Number(raw.quantity) || 1
      )
    ),
    weight:
      optionalNonNegativeNumber(
        raw.weight
      ),
    source: cleanText(
      raw.source,
      fallbackSource
    ),
    isMagical,
    requiresAttunement:
      isMagical &&
      (
        raw.requiresAttunement === true ||
        raw.attuned === true
      ),
    isContainer,
    capacityWeight:
      optionalNonNegativeNumber(
        raw.capacityWeight
      )
  };
}

export function calculateInventoryLineWeight(
  item
) {
  const normalized =
    normalizeInventoryItemBase(item);

  return normalized.weight === null
    ? null
    : normalized.weight *
      normalized.quantity;
}
