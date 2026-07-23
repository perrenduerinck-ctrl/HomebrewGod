// =====================================================
// HOMEBREW GOD — ACTIVE RULESET AND CATALOG POLICY
// =====================================================

export const ACTIVE_RULESET = Object.freeze({
  id: "dnd5e-2014",
  edition: "2014",
  mode: "legacy-2014",
  label: "Legacy 5e (2014)",
  srdLabel: "SRD 5.1 (CC BY 4.0)",
  nonSrdLabel: "Legacy 5e supplement (non-SRD)",
  customLabel: "Custom / homebrew (2014 rules mode)",
  catalogPolicy: "srd-plus-labeled-legacy",
  futureMode: "dnd5e-2024"
});

export const SUPPORTED_RULESET_IDS = Object.freeze([
  ACTIVE_RULESET.id
]);

const SRD_CLASS_IDS = new Set([
  "barbarian", "bard", "cleric", "druid", "fighter", "monk",
  "paladin", "ranger", "rogue", "sorcerer", "warlock", "wizard"
]);

const SRD_SUBCLASS_KEYS = new Set([
  "barbarian:berserker",
  "bard:lore",
  "cleric:life",
  "druid:land",
  "fighter:champion",
  "monk:open-hand",
  "paladin:devotion",
  "ranger:hunter",
  "rogue:thief",
  "sorcerer:draconic-bloodline",
  "warlock:fiend",
  "wizard:evocation"
]);

const SRD_FEAT_IDS = new Set(["grappler"]);

const SRD_SPECIES_IDS = new Set([
  "dragonborn", "dwarf", "elf", "gnome", "half-elf",
  "half-orc", "halfling", "human", "tiefling"
]);

const SRD_BACKGROUND_IDS = new Set(["acolyte"]);

function normalizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hasSrdSource(record) {
  return /(?:^|\s)srd(?:\s|$)|srd\s*5\.1/i.test(
    String(record?.sourceLabel || record?.source || "")
  );
}

function hasCustomSource(record) {
  return (
    /custom|homebrew|character|import/i.test(
      String(record?.sourceLabel || record?.source || "")
    ) ||
    /custom|homebrew/i.test(String(record?.sourceType || ""))
  );
}

export function isActiveRulesetEntry(record) {
  const rulesetId = String(record?.rulesetId || "").trim();
  const edition = String(record?.rulesEdition || record?.edition || "").trim();

  if (!rulesetId && !edition) {
    return true;
  }

  return (
    (!rulesetId || rulesetId === ACTIVE_RULESET.id) &&
    (!edition || edition === ACTIVE_RULESET.edition)
  );
}

export function getLegacy2014Metadata(kind, id, record = {}, parentId = "") {
  const normalizedKind = normalizeId(kind);
  const normalizedId = normalizeId(id || record?.id || record?.name);
  const normalizedParentId = normalizeId(parentId || record?.classId);
  const explicitSourceType = String(record?.sourceType || "").trim();
  const isCustom = hasCustomSource(record);
  let isSrd = explicitSourceType === "srd" || hasSrdSource(record);

  if (!explicitSourceType && !hasSrdSource(record)) {
    if (normalizedKind === "class") {
      isSrd = SRD_CLASS_IDS.has(normalizedId);
    } else if (normalizedKind === "subclass") {
      isSrd = SRD_SUBCLASS_KEYS.has(`${normalizedParentId}:${normalizedId}`);
    } else if (normalizedKind === "feat") {
      isSrd = SRD_FEAT_IDS.has(normalizedId);
    } else if (normalizedKind === "species" || normalizedKind === "subrace") {
      isSrd = SRD_SPECIES_IDS.has(normalizedParentId || normalizedId);
    } else if (normalizedKind === "background") {
      isSrd = SRD_BACKGROUND_IDS.has(normalizedId);
    } else if (normalizedKind === "spell") {
      isSrd = hasSrdSource(record);
    }
  }

  return Object.freeze({
    rulesetId: ACTIVE_RULESET.id,
    rulesEdition: ACTIVE_RULESET.edition,
    rulesMode: ACTIVE_RULESET.mode,
    sourceType: isCustom ? "custom" : isSrd ? "srd" : "legacy-non-srd",
    sourceLabel: isCustom
      ? ACTIVE_RULESET.customLabel
      : isSrd
        ? ACTIVE_RULESET.srdLabel
        : ACTIVE_RULESET.nonSrdLabel
  });
}

export function formatRulesetLabel(record, kind = "", parentId = "") {
  const metadata = getLegacy2014Metadata(
    kind,
    record?.id || record?.name,
    record,
    parentId
  );

  return `${ACTIVE_RULESET.label} · ${metadata.sourceLabel}`;
}
