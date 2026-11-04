function text(value) {
  return String(value ?? "").trim();
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function record(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function values(value) {
  return Array.isArray(value) ? value : [];
}

function normalizedStatusSet(spell = {}) {
  return new Set(
    values(spell.statuses)
      .map((status) => text(status).toLowerCase())
      .filter(Boolean)
  );
}

export function getSpellActionKind(spellOrCastingTime = {}) {
  const spell = typeof spellOrCastingTime === "object"
    ? spellOrCastingTime
    : {};
  const explicit = text(spell.actionKind)
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
  const castingTime = text(
    typeof spellOrCastingTime === "string"
      ? spellOrCastingTime
      : spell.castingTime
  ).toLowerCase();

  if (["bonus", "bonusaction", "bonus-action"].includes(explicit)) {
    return "bonus-action";
  }
  if (explicit === "reaction") return "reaction";
  if (explicit === "action") return "action";
  if (castingTime.includes("bonus action")) return "bonus-action";
  if (castingTime.includes("reaction")) return "reaction";
  if (/\b1\s+action\b|\ban\s+action\b/.test(castingTime)) return "action";
  return "long-cast";
}

export function getSpellActionResource(spell = {}) {
  const kind = getSpellActionKind(spell);
  if (kind === "bonus-action") return "bonus";
  if (kind === "reaction") return "reaction";
  return kind === "action" ? "action" : "free";
}

export function getSpellReactionTrigger(spell = {}) {
  if (getSpellActionKind(spell) !== "reaction") return "";
  const explicit = text(spell.reactionTrigger || spell.trigger);
  if (explicit) return explicit;
  const castingTime = text(spell.castingTime);
  const detailed = castingTime.match(/reaction\s*,?\s*(?:which you take\s*)?(.*)$/i)?.[1];
  if (text(detailed)) return text(detailed);
  const known = {
    shield: "when you are hit by an attack or targeted by magic missile",
    counterspell: "when you see a creature within 60 feet casting a spell",
    "feather-fall": "when you or a creature within 60 feet falls"
  };
  return known[text(spell.id).toLowerCase()] || "when the spell's reaction trigger occurs";
}

export function getSpellCastEligibility(spell = {}) {
  const level = Math.max(0, Math.round(number(spell.level, 0)));
  const statuses = normalizedStatusSet(spell);
  const override = spell.manualOverride === true;

  if (level === 0) {
    return Object.freeze({ eligible: true, reason: "", override, ritualOnly: false });
  }

  const standardEligible = Boolean(
    spell.prepared === true ||
    spell.known === true ||
    override ||
    [
      "prepared",
      "always prepared",
      "known",
      "innate",
      "feat-granted",
      "species-granted",
      "mystic arcanum"
    ].some((status) => statuses.has(status))
  );
  const ritualOnly = !standardEligible && spell.ritual === true && statuses.has("spellbook");
  const eligible = standardEligible || ritualOnly;

  return Object.freeze({
    eligible,
    override,
    ritualOnly,
    reason: eligible
      ? ""
      : statuses.has("spellbook")
        ? "Prepare this spell before casting it."
        : statuses.has("custom spell")
          ? "Select Known or Prepared, or enable the visible DM override."
          : "This spell is not currently known, prepared, or granted."
  });
}

export function isSpellCastEligible(spell = {}) {
  return getSpellCastEligibility(spell).eligible;
}

export function getCharacterLevel(character = {}) {
  const progression = values(character.classProgression);
  const progressionTotal = progression.reduce((total, entry) => (
    total + Math.max(0, Math.round(number(entry?.level, 0)))
  ), 0);
  return Math.max(
    1,
    progressionTotal ||
      Math.round(number(character.level ?? character.combat?.level, 1))
  );
}

function spellReferenceId(value) {
  return text(
    typeof value === "string"
      ? value
      : value?.spellId || value?.id || value?.key || value?.name
  );
}

function sourceContainsSpell(source, spellId) {
  const candidates = [
    ...values(source?.selectedSpellIds),
    ...values(source?.fixedSpellIds),
    ...values(source?.spellRecords),
    ...values(source?.cantripIds),
    ...values(source?.knownSpellIds),
    ...values(source?.preparedSpellIds),
    ...values(source?.spellbookSpellIds),
    ...values(source?.alwaysPreparedSpellIds),
    ...Object.values(record(source?.mysticArcanumSpellIds)),
    ...Object.keys(record(source?.spellStates))
  ];
  if (spellReferenceId(source) === spellId && (source.innate === true || source.sourceType)) {
    return true;
  }
  return candidates.some((candidate) => spellReferenceId(candidate) === spellId);
}

function abilityScore(character, ability) {
  if (!ability) return null;
  const scores = record(character.abilities?.scores);
  const value = scores[ability] ?? character.abilities?.[ability];
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function numericOrNull(value) {
  if (value === null || value === undefined || text(value) === "") return null;
  return Number.isFinite(Number(value)) ? Math.round(Number(value)) : null;
}

export function resolveCharacterSpellcastingStats(
  character = {},
  spell = {},
  { sourceId = "" } = {}
) {
  const magic = record(character.magic);
  const spellId = spellReferenceId(spell);
  const legacyClassSources = Object.entries(record(magic.classSources))
    .map(([key, source]) => ({
      ...record(source),
      sourceId: text(source?.sourceId || source?.classEntryId || key),
      sourceName: text(source?.sourceName || source?.className || key)
    }));
  const legacyFeatSources = Object.entries(record(magic.featSources))
    .map(([key, source]) => ({
      ...record(source),
      sourceId: text(source?.sourceId || source?.featId || key),
      sourceName: text(source?.sourceName || source?.featName || key),
      selectedSpellIds: [
        ...values(source?.selectedSpellIds),
        ...values(source?.spellIds),
        ...values(source?.grants)
      ]
    }));
  const legacyInnateSources = values(magic.innateSpells).map((source, index) => ({
    ...record(source),
    sourceId: text(source?.sourceId || source?.source || `innate-${index + 1}`),
    sourceName: text(source?.sourceName || source?.sourceFeatureName || source?.source || "Innate magic"),
    sourceType: text(source?.sourceType || "innate"),
    selectedSpellIds: [spellReferenceId(source)]
  }));
  const sources = [
    ...values(magic.spellSources),
    ...legacyClassSources,
    ...legacyFeatSources,
    ...legacyInnateSources
  ];
  const matchingSources = sources.filter((source) => (
    sourceContainsSpell(source, spellId)
  ));
  const source = matchingSources.find((entry) => text(entry?.sourceId) === text(sourceId)) ||
    matchingSources[0] || null;
  const sourceRecord = values(source?.spellRecords)
    .find((entry) => spellReferenceId(entry) === spellId);
  const ability = text(
    sourceRecord?.spellcastingAbility ||
    source?.spellcastingAbility ||
    spell.spellcastingAbility ||
    magic.spellcastingAbility
  ).toLowerCase();
  const score = abilityScore(character, ability);
  const modifier = score === null ? null : Math.floor((score - 10) / 2);
  const level = getCharacterLevel(character);
  const proficiencyBonus = Math.max(
    2,
    Math.round(number(character.combat?.proficiencyBonus, 2 + Math.floor((level - 1) / 4)))
  );
  const explicitSaveDc = sourceRecord?.spellSaveDc ?? source?.spellSaveDc;
  const explicitAttackBonus = sourceRecord?.spellAttackBonus ?? source?.spellAttackBonus;
  const sourceSaveDc = numericOrNull(explicitSaveDc);
  const sourceAttackBonus = numericOrNull(explicitAttackBonus);
  const fallbackSaveDc = numericOrNull(magic.spellSaveDc);
  const fallbackAttackBonus = numericOrNull(magic.spellAttackBonus);
  const saveDc = sourceSaveDc !== null
    ? sourceSaveDc
    : modifier === null
      ? fallbackSaveDc
      : 8 + proficiencyBonus + modifier;
  const attackBonus = sourceAttackBonus !== null
    ? sourceAttackBonus
    : modifier === null
      ? fallbackAttackBonus
      : proficiencyBonus + modifier;

  return Object.freeze({
    sourceId: text(source?.sourceId),
    sourceName: text(source?.sourceName || source?.name || "Spellcasting"),
    ability,
    characterLevel: level,
    proficiencyBonus,
    spellSaveDc: saveDc,
    spellAttackBonus: attackBonus
  });
}
