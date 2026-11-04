import {
  adjustCanonicalSpellResource,
  getCanonicalSpellSources
} from "../characterCreator/spellSources.js?v=canonical-spell-sources-20260802";
import { getSpellCastEligibility } from "../spells/spellCastingRules.js";

function clone(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}
function text(value) {
  return String(value ?? "").trim();
}

function count(value, fallback = 0) {
  const number = Number(value);
  return Math.max(0, Math.floor(Number.isFinite(number) ? number : fallback));
}

function object(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function pathValue(root, path = []) {
  return path.reduce((value, key) => value?.[key], root);
}

function normalSpellSlotLedger(magic = {}) {
  const canonicalSlots = object(magic.slots);
  const canonicalUsage = object(object(magic.slotUsage).normal);
  const legacySlots = object(magic.spellSlots);
  const levels = new Set([
    ...Object.keys(canonicalSlots),
    ...Object.keys(legacySlots)
  ]);

  return [...levels]
    .map((slotLevel) => {
      const canonical = canonicalSlots[slotLevel];
      const canonicalRecord = object(canonical);
      const legacy = legacySlots[slotLevel];
      const legacyRecord = object(legacy);
      const maximum = count(
        canonicalRecord.maximum ??
          canonicalRecord.max ??
          canonical ??
          legacyRecord.maximum ??
          legacyRecord.max ??
          legacy,
        0
      );
      const used = count(
        canonicalUsage[slotLevel] ??
          canonicalRecord.used ??
          legacyRecord.used,
        0
      );

      return {
        level: count(slotLevel, 0),
        maximum,
        used: Math.min(maximum, used),
        legacyRecord:
          legacy && typeof legacy === "object" && !Array.isArray(legacy)
            ? legacyRecord
            : null
      };
    })
    .filter((entry) => entry.level > 0 && entry.maximum > 0)
    .sort((left, right) => left.level - right.level);
}

function spellReferenceId(value) {
  return text(
    typeof value === "string"
      ? value
      : value?.spellId || value?.id || value?.key || value?.name
  );
}

function sourceSpellRecord(source, spellId) {
  const records = Array.isArray(source?.spellRecords) ? source.spellRecords : [];
  return records.find((entry) => spellReferenceId(entry) === spellId) || null;
}

function sourceContainsSpell(source, spellId) {
  return Boolean(
    sourceSpellRecord(source, spellId) ||
    (Array.isArray(source?.selectedSpellIds) && source.selectedSpellIds.includes(spellId)) ||
    (Array.isArray(source?.fixedSpellIds) && source.fixedSpellIds.includes(spellId)) ||
    Object.hasOwn(object(source?.spellStates), spellId)
  );
}

function getSpecialSpellSources(character, spell) {
  const spellId = spellReferenceId(spell);
  if (!spellId) return [];
  return getCanonicalSpellSources(character)
    .filter((source) => sourceContainsSpell(source, spellId))
    .map((source) => {
      const record = sourceSpellRecord(source, spellId) || {};
      const atWill = record.atWill === true || source.atWill === true;
      const maximum = count(
        record.maximumUses ?? record.freeCastUses ??
        source.maximumUses ?? source.freeCastUses,
        0
      );
      const remaining = atWill
        ? Number.POSITIVE_INFINITY
        : Math.min(maximum, count(record.currentUses ?? source.currentUses, maximum));
      return { source, record, atWill, maximum, remaining };
    })
    .filter((entry) => entry.atWill || entry.maximum > 0);
}

function canCharacterRitualCast(character, spell) {
  if (spell.ritual !== true) return false;
  const magic = object(character.magic);
  if (magic.ritualCasting === true || spell.manualOverride === true) return true;
  const ritualClasses = new Set(["artificer", "bard", "cleric", "druid", "wizard"]);
  const spellId = spellReferenceId(spell);
  const canonicalMatch = getCanonicalSpellSources(character).some((source) => (
    sourceContainsSpell(source, spellId) &&
    (
      source.ritualCasting === true ||
      ritualClasses.has(text(source.classId).toLowerCase())
    )
  ));
  if (canonicalMatch) return true;
  const legacyMatch = Object.values(object(magic.classSources)).some((source) => {
    const references = [
      ...(Array.isArray(source?.cantripIds) ? source.cantripIds : []),
      ...(Array.isArray(source?.knownSpellIds) ? source.knownSpellIds : []),
      ...(Array.isArray(source?.preparedSpellIds) ? source.preparedSpellIds : []),
      ...(Array.isArray(source?.spellbookSpellIds) ? source.spellbookSpellIds : [])
    ];
    return references.map(spellReferenceId).includes(spellId) &&
      (source?.ritualCasting === true || ritualClasses.has(text(source?.classId).toLowerCase()));
  });
  if (legacyMatch) return true;
  return (Array.isArray(spell.statuses) ? spell.statuses : [])
    .some((status) => text(status).toLowerCase() === "spellbook");
}

export function getCharacterSpellSlotOptions(character = {}, spell = {}) {
  const level = count(spell.level, 0);
  if (level === 0) {
    return [{ kind: "cantrip", level: 0, sourceId: "", label: "Cantrip — no spell slot", remaining: Infinity }];
  }
  const magic = object(character.magic);
  const options = [];
  const castEligibility = getSpellCastEligibility(spell);
  const specialSources = getSpecialSpellSources(character, spell);
  const canUseSpellSlots = specialSources.length === 0 || specialSources.some(({ source, record }) => (
    (record.canUseSpellSlots ?? source.canUseSpellSlots) !== false
  ));
  specialSources.forEach(({ source, record, atWill, remaining }) => {
    const sourceId = text(source.sourceId);
    const sourceName = text(source.sourceName || source.name) || "Granted spell";
    options.push({
      kind: "special",
      level,
      sourceId,
      label: atWill
        ? `${sourceName} — at will`
        : `${sourceName} — special use (${remaining} remaining)`,
      remaining,
      recharge: text(record.recharge || source.recharge)
    });
  });
  if (canCharacterRitualCast(character, spell)) {
    options.push({
      kind: "ritual",
      level,
      sourceId: "",
      label: "Ritual cast — no spell slot (+10 minutes)",
      remaining: 1,
      castingTime: "+10 minutes"
    });
  }
  if (canUseSpellSlots && !castEligibility.ritualOnly) normalSpellSlotLedger(magic).forEach(({ level: slotLevel, maximum, used }) => {
    if (slotLevel < level) return;
    const remaining = Math.max(0, maximum - used);
    options.push({
      kind: "normal",
      level: slotLevel,
      sourceId: "",
      label: `Level ${slotLevel} slot (${remaining} remaining)`,
      remaining
    });
  });
  const pactUsage = object(object(magic.slotUsage).pactSources);
  const pactSources = castEligibility.ritualOnly
    ? []
    : Array.isArray(magic.pactMagicSources)
    ? magic.pactMagicSources.map((source, index) => [
        text(source?.classEntryId) || `pact-source-${index + 1}`,
        source
      ])
    : Object.entries(object(magic.pactMagicSources));
  if (!castEligibility.ritualOnly && !pactSources.length && magic.pactMagic) {
    pactSources.push(["legacy:pact-magic", magic.pactMagic]);
  }
  pactSources.forEach(([sourceId, source]) => {
    const slotLevel = count(source?.slotLevel ?? source?.level, 0);
    const maximum = count(source?.slots ?? source?.maximumSlots ?? source?.maximumUses, 0);
    if (slotLevel < level || maximum < 1) return;
    const legacyPactUsed = sourceId === "legacy:pact-magic"
      ? count(object(magic.slotUsage).pact, 0)
      : 0;
    const remaining = Math.max(0, maximum - count(pactUsage[sourceId], legacyPactUsed));
    options.push({
      kind: "pact",
      level: slotLevel,
      sourceId,
      label: `Pact level ${slotLevel} slot (${remaining} remaining)`,
      remaining
    });
  });
  return options.sort((left, right) => left.level - right.level || left.kind.localeCompare(right.kind));
}

export function applyConfirmedSpellCast(character = {}, spell = {}, selection = {}) {
  const next = clone(character);
  const level = count(spell.level, 0);
  if (next.combat?.classFeatureStates?.rageActive === true) {
    throw new Error("Spellcasting is blocked while Rage is active.");
  }
  if (level > 0) {
    const selectionKind = text(selection.kind) || "normal";
    const selectedLevel = count(selection.level, level);
    if (!["normal", "pact", "special", "ritual"].includes(selectionKind)) {
      throw new Error("Choose a valid spell slot before confirming the cast.");
    }
    if (selectedLevel < level) {
      throw new Error("That spell slot is too low for this spell.");
    }
    if (getSpellCastEligibility(spell).ritualOnly && selectionKind !== "ritual") {
      throw new Error("This unprepared spellbook spell can only be cast as a ritual.");
    }
    next.magic = object(next.magic);
    next.magic.slotUsage = object(next.magic.slotUsage);
    if (selectionKind === "special") {
      const sourceId = text(selection.sourceId);
      const specialSource = getSpecialSpellSources(next, spell)
        .find((entry) => text(entry.source.sourceId) === sourceId);
      if (!specialSource || specialSource.remaining < 1) {
        throw new Error("That special spell use is no longer available.");
      }
      if (
        !specialSource.atWill &&
        !adjustCanonicalSpellResource(next, sourceId, spellReferenceId(spell), -1)
      ) {
        throw new Error("That special spell use could not be spent.");
      }
    } else if (selectionKind === "ritual") {
      if (!canCharacterRitualCast(next, spell)) {
        throw new Error("This character cannot cast that spell as a ritual.");
      }
    } else if (selectionKind === "pact") {
      next.magic.slotUsage.pactSources = object(next.magic.slotUsage.pactSources);
      const sourceId = text(selection.sourceId);
      if (!sourceId) throw new Error("A pact slot source is required.");
      const sources = Array.isArray(next.magic.pactMagicSources)
        ? next.magic.pactMagicSources.map((source, index) => ({
            id: text(source?.classEntryId) || `pact-source-${index + 1}`,
            source,
            index
          }))
        : Object.entries(object(next.magic.pactMagicSources)).map(([id, source], index) => ({ id, source, index }));
      if (!sources.length && next.magic.pactMagic) sources.push({ id: "legacy:pact-magic", source: next.magic.pactMagic, index: 0 });
      const selectedSource = sources.find((entry) => entry.id === sourceId);
      const sourceLevel = count(selectedSource?.source?.slotLevel ?? selectedSource?.source?.level, 0);
      const maximum = count(selectedSource?.source?.slots ?? selectedSource?.source?.maximumSlots, 0);
      const used = count(next.magic.slotUsage.pactSources[sourceId], selectedSource?.index === 0 ? next.magic.slotUsage.pact : 0);
      if (!selectedSource || sourceLevel !== selectedLevel || sourceLevel < level || maximum < 1 || used >= maximum) {
        throw new Error("That pact slot is no longer available.");
      }
      next.magic.slotUsage.pactSources[sourceId] = used + 1;
      if (selectedSource.index === 0) next.magic.slotUsage.pact = used + 1;
    } else {
      next.magic.slotUsage.normal = object(next.magic.slotUsage.normal);
      const slotLevel = String(selectedLevel);
      const ledger = normalSpellSlotLedger(next.magic)
        .find((entry) => String(entry.level) === slotLevel);
      const maximum = count(ledger?.maximum, 0);
      const used = count(
        next.magic.slotUsage.normal[slotLevel],
        ledger?.used || 0
      );
      if (maximum < 1 || used >= maximum) throw new Error("That spell slot is no longer available.");
      next.magic.slotUsage.normal[slotLevel] = used + 1;
      if (ledger?.legacyRecord) {
        next.magic.spellSlots = object(next.magic.spellSlots);
        next.magic.spellSlots[slotLevel] = {
          ...ledger.legacyRecord,
          maximum,
          used: used + 1
        };
      }
    }
  }
  if (spell.concentration === true || spell.targeting?.duration?.concentration === true) {
    next.combat = object(next.combat);
    const replacedSpellName = text(next.combat.concentration?.spellName);
    next.combat.concentration = {
      spellId: text(spell.id),
      spellName: text(spell.name) || "Spell",
      startedAtMillis: Date.now(),
      ...(replacedSpellName && replacedSpellName !== text(spell.name)
        ? { replacedSpellName }
        : {})
    };
  }
  return next;
}

export function applyCharacterActionResource(character = {}, action = {}) {
  const resource = action.resource;
  const path = Array.isArray(resource?._actionSourcePath)
    ? resource._actionSourcePath
    : Array.isArray(action.resourcePath)
      ? action.resourcePath
      : null;
  if (!path?.length || resource?.maximumUses == null) return clone(character);
  const next = clone(character);
  const target = pathValue(next, path);
  if (!target || typeof target !== "object") {
    throw new Error("That action resource no longer exists on the character.");
  }
  const maximum = count(target.maximumUses ?? resource.maximumUses, 0);
  const current = Math.min(maximum, count(target.currentUses, maximum));
  if (current < 1) throw new Error(`${text(resource.name) || text(action.name) || "That resource"} has no uses remaining.`);
  target.currentUses = current - 1;
  return next;
}

export function consumeCharacterInventoryItem(character = {}, itemReference = {}) {
  const next = clone(character);
  const items = Array.isArray(next.equipment?.items) ? next.equipment.items : [];
  const id = text(itemReference.id);
  const index = Number.isInteger(itemReference.index) ? itemReference.index : -1;
  const itemIndex = items.findIndex((item, candidateIndex) => (
    (id && text(item?.id) === id) || (!id && candidateIndex === index)
  ));
  if (itemIndex < 0) throw new Error("That inventory item no longer exists.");
  const quantity = Math.max(1, count(items[itemIndex].quantity, 1));
  if (quantity <= 1) items.splice(itemIndex, 1);
  else items[itemIndex].quantity = quantity - 1;
  return next;
}

export function setCombatActionBarFavorite(character = {}, reference = {}, pinned = true) {
  const next = clone(character);
  next.uiPreferences = object(next.uiPreferences);
  const current = Array.isArray(next.uiPreferences.combatActionBarFavorites)
    ? next.uiPreferences.combatActionBarFavorites
    : [];
  const key = text(reference.key);
  const filtered = current.filter((entry) => text(entry?.key) !== key);
  next.uiPreferences.combatActionBarFavorites = pinned && key
    ? [...filtered, { key, kind: text(reference.kind), id: text(reference.id) }].slice(-24)
    : filtered;
  return next;
}

