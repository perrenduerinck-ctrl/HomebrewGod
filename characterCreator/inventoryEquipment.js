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
