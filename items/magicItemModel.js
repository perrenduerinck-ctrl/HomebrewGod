export const MAGIC_ITEM_TYPES = Object.freeze([
  "weapon",
  "armor",
  "consumable",
  "wondrous-item"
]);

export const MAGIC_ITEM_RARITIES = Object.freeze([
  "common",
  "uncommon",
  "rare",
  "very-rare",
  "legendary",
  "artifact",
  "varies"
]);

const clean = (value, maximum = 2000) => String(value ?? "").trim().slice(0, maximum);

function numberOrNull(value, { integer = false } = {}) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, integer ? Math.round(number) : number);
}

function normalizeUrl(value) {
  const url = clean(value, 2048);
  return !url || /^https:\/\//i.test(url) ? url : "";
}

function normalizeTags(value) {
  const source = Array.isArray(value) ? value : String(value ?? "").split(",");
  return [...new Set(source.map((entry) => clean(entry, 60).toLowerCase()).filter(Boolean))].slice(0, 16);
}

function normalizeType(value) {
  const type = clean(value, 40).toLowerCase().replace(/\s+/g, "-");
  if (["wondrous", "wondrous-items"].includes(type)) return "wondrous-item";
  return MAGIC_ITEM_TYPES.includes(type) ? type : "wondrous-item";
}

function normalizeRarity(value) {
  const rarity = clean(value, 40).toLowerCase().replace(/\s+/g, "-");
  return MAGIC_ITEM_RARITIES.includes(rarity) ? rarity : "uncommon";
}

export function normalizeMagicItemEffect(raw = {}, index = 0) {
  const effect = raw && typeof raw === "object" ? raw : {};
  return Object.freeze({
    id: clean(effect.id, 100) || `effect-${index + 1}`,
    name: clean(effect.name, 120) || `Effect ${index + 1}`,
    description: clean(effect.description, 4000),
    activation: clean(effect.activation, 80),
    chargeCost: numberOrNull(effect.chargeCost, { integer: true })
  });
}

export function normalizeMagicItem(raw = {}, { idFactory = () => globalThis.crypto?.randomUUID?.() || `item-${Date.now()}`, now = Date.now() } = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const id = clean(source.id, 160) || clean(idFactory(), 160);
  const maximumCharges = numberOrNull(source.charges?.maximum ?? source.maximumCharges, { integer: true });
  const currentCharges = numberOrNull(source.charges?.current ?? source.currentCharges, { integer: true });
  const effects = (Array.isArray(source.effects) ? source.effects : []).slice(0, 30)
    .map((effect, index) => normalizeMagicItemEffect(effect, index));
  const createdAtMillis = Number(source.createdAtMillis) || now;

  return Object.freeze({
    id,
    name: clean(source.name, 120) || "Unnamed Magic Item",
    itemType: normalizeType(source.itemType || source.type),
    rarity: normalizeRarity(source.rarity),
    description: clean(source.description || source.notes, 8000),
    imageUrl: normalizeUrl(source.imageUrl || source.thumbnailUrl),
    tags: normalizeTags(source.tags),
    requiresAttunement: source.requiresAttunement === true || source.attunement === true,
    attunementRequirements: clean(source.attunementRequirements, 500),
    charges: Object.freeze({
      maximum: maximumCharges,
      current: maximumCharges === null ? null : Math.min(maximumCharges, currentCharges ?? maximumCharges),
      recharge: clean(source.charges?.recharge ?? source.recharge, 240)
    }),
    effects: Object.freeze(effects),
    weight: numberOrNull(source.weight),
    createdAtMillis,
    updatedAtMillis: Number(source.updatedAtMillis) || now,
    sourceWorkshopAssetId: clean(source.sourceWorkshopAssetId, 200),
    sourceWorkshopVersion: numberOrNull(source.sourceWorkshopVersion, { integer: true }),
    sourceAuthorUid: clean(source.sourceAuthorUid, 200),
    copiedFromLibraryId: clean(source.copiedFromLibraryId, 240)
  });
}

export function validateMagicItem(raw = {}) {
  const errors = [];
  if (!clean(raw.name, 120)) errors.push("Give the item a name.");
  if (raw.imageUrl && !/^https:\/\//i.test(clean(raw.imageUrl, 2048))) errors.push("Item images must use an HTTPS URL.");
  const maximum = numberOrNull(raw.charges?.maximum ?? raw.maximumCharges, { integer: true });
  const current = numberOrNull(raw.charges?.current ?? raw.currentCharges, { integer: true });
  if (maximum !== null && current !== null && current > maximum) errors.push("Current charges cannot exceed maximum charges.");
  return Object.freeze(errors);
}

export function magicItemTypeLabel(value) {
  return ({ weapon: "Weapon", armor: "Armor", consumable: "Consumable", "wondrous-item": "Wondrous Item" })[normalizeType(value)];
}

export function magicItemRarityLabel(value) {
  return normalizeRarity(value).split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
}

export function magicItemToInventoryCopy(raw, { idFactory = () => globalThis.crypto?.randomUUID?.() || `inventory-${Date.now()}` } = {}) {
  const item = normalizeMagicItem(raw);
  return {
    id: clean(idFactory(), 160),
    name: item.name,
    category: ["weapon", "armor", "consumable"].includes(item.itemType)
      ? item.itemType
      : "magic-item",
    itemType: item.itemType,
    rarity: item.rarity,
    description: item.description,
    imageUrl: item.imageUrl,
    tags: [...item.tags],
    quantity: 1,
    weight: item.weight,
    isMagical: true,
    requiresAttunement: item.requiresAttunement,
    attunementRequirements: item.attunementRequirements,
    attuned: false,
    equipped: false,
    charges: { ...item.charges },
    effects: item.effects.map((effect) => ({ ...effect })),
    source: "library",
    sourceLibraryItemId: item.id,
    copiedFromLibraryItemId: item.id,
    sourceWorkshopAssetId: item.sourceWorkshopAssetId,
    sourceWorkshopVersion: item.sourceWorkshopVersion,
    sourceAuthorUid: item.sourceAuthorUid,
    copiedFromLibraryId: item.copiedFromLibraryId
  };
}
