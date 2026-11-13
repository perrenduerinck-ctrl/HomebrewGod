import { clearConcentrationChecks, interruptElapsedCasting } from "./concentrationChecks.js";
import {
  adjustCanonicalSpellResource,
  getCanonicalSpellSources
} from "../characterCreator/spellSources.js?v=canonical-spell-sources-20260802";
import { getSpellcasterBlockReason, resolveCharacterSpellcastingStats } from "../spells/spellCastingRules.js";

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

export function getPactSpellSlotLedger(character = {}) {
  const magic = object(character.magic);
  const pactUsage = object(object(magic.slotUsage).pactSources);
  const sources = Array.isArray(magic.pactMagicSources)
    ? magic.pactMagicSources.map((source, index) => ({
        sourceId: text(source?.classEntryId) || `pact-source-${index + 1}`,
        source,
        index
      }))
    : Object.entries(object(magic.pactMagicSources))
        .map(([sourceId, source], index) => ({ sourceId, source, index }));
  if (!sources.length && magic.pactMagic) {
    sources.push({ sourceId: "legacy:pact-magic", source: magic.pactMagic, index: 0 });
  }
  return sources.map(({ sourceId, source, index }) => {
    const slotLevel = count(source?.slotLevel ?? source?.level, 0);
    const maximum = count(source?.slots ?? source?.maximumSlots ?? source?.maximumUses, 0);
    const legacyUsed = index === 0 ? count(object(magic.slotUsage).pact, 0) : 0;
    const used = Math.min(maximum, count(pactUsage[sourceId], legacyUsed));
    return {
      sourceId,
      sourceName: text(source?.className || source?.sourceName) || "Pact Magic",
      slotLevel,
      maximum,
      used,
      remaining: Math.max(0, maximum - used),
      index
    };
  }).filter((entry) => entry.slotLevel > 0 && entry.maximum > 0);
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

function sourceSpellState(source, spellId) {
  return object(source?.spellStates)[spellId] || object(sourceSpellRecord(source, spellId)?.spellState);
}

function sourceCanRitualCast(character, spell, source) {
  if (spell.ritual !== true) return false;
  const magic = object(character.magic);
  if (magic.ritualCasting === true) return true;
  const spellId = spellReferenceId(spell);
  if (!sourceContainsSpell(source, spellId)) return false;
  if (source?.ritualCasting === true) return true;
  const classId = text(source?.classId).toLowerCase();
  const state = sourceSpellState(source, spellId);
  const record = sourceSpellRecord(source, spellId) || {};
  const prepared = (state.prepared ?? record.prepared) === true || (state.alwaysPrepared ?? record.alwaysPrepared) === true || source.alwaysPrepared === true;
  const known = (state.known ?? record.known) === true || (!Object.keys(state).length && source.grantsKnown === true);
  const spellbook = (state.spellbook ?? record.spellbook) === true ||
    (Array.isArray(source?.spellbookSpellIds) && source.spellbookSpellIds.map(spellReferenceId).includes(spellId));

  if (classId === "wizard") return spellbook || prepared;
  if (classId === "bard") return known || prepared;
  if (["artificer", "cleric", "druid"].includes(classId)) return prepared;
  return false;
}

function sourceCanCast(spell, source) {
  const id = spellReferenceId(spell);
  const state = sourceSpellState(source, id);
  const record = sourceSpellRecord(source, id) || {};
  if (record.manualOverride === true) return true;
  if (source.ritualOnly === true) return false;
  const prepared = (state.prepared ?? record.prepared) === true || (state.alwaysPrepared ?? record.alwaysPrepared) === true || source.alwaysPrepared === true;
  if (prepared) return true;
  if (count(spell.level) > 0 && ["wizard", "cleric", "druid", "paladin", "artificer"].includes(text(source.classId).toLowerCase())) return false;
  return (state.known ?? record.known) === true || (count(spell.level) === 0 && state.cantrip === true) || state.innate === true ||
    (!Object.keys(state).length && (source.grantsKnown === true || source.grantsPrepared === true)) ||
    (count(spell.level) === 0 && !Object.keys(state).length && sourceContainsSpell(source, id)) ||
    (["feat", "species", "innate"].includes(source.sourceType) && sourceContainsSpell(source, id));
}

export function getCharacterSpellcastingSourceOptions(character = {}, spell = {}, { includeUnavailable = false } = {}) {
  const spellId = spellReferenceId(spell);
  if (!spellId) return [];
  const seen = new Set();
  return getCanonicalSpellSources(character)
    .filter((source) => sourceContainsSpell(source, spellId))
    .map((source) => {
      const sourceId = text(source?.sourceId || source?.classEntryId);
      if (!sourceId || seen.has(sourceId)) return null;
      seen.add(sourceId);
      const sourceRecord = sourceSpellRecord(source, spellId) || {};
      const normal = sourceCanCast(spell, source);
      const ritual = sourceCanRitualCast(character, spell, source);
      if (!includeUnavailable && !normal && !ritual) return null;
      const stats = resolveCharacterSpellcastingStats(character, spell, { sourceId });
      return {
        spellSaveDc: stats.spellSaveDc,
        spellAttackBonus: stats.spellAttackBonus,
        sourceId,
        sourceName: text(source?.sourceName || source?.className || source?.name) || "Spellcasting",
        sourceType: text(source?.sourceType),
        spellcastingAbility: text(sourceRecord.spellcastingAbility || source?.spellcastingAbility).toLowerCase(),
        normal,
        reason: normal ? "" : ritual ? "Prepare this spell for normal casting; ritual casting is available outside combat." : "This source does not currently know or have this spell prepared. Prepare or select it in the character sheet.",
        canUseSpellSlots: sourceRecord.canUseSpellSlots !== false && (source.sourceType === "class" || source.canUseSpellSlots === true),
        ritual
      };
    })
    .filter(Boolean);
}

function canCharacterRitualCast(character, spell, sourceId = "") {
  const sources = getCanonicalSpellSources(character)
    .filter((source) => sourceContainsSpell(source, spellReferenceId(spell)));
  const requestedSourceId = text(sourceId);
  const eligibleSources = requestedSourceId
    ? sources.filter((source) => text(source?.sourceId || source?.classEntryId) === requestedSourceId)
    : sources;
  return eligibleSources.some((source) => sourceCanRitualCast(character, spell, source)) ||
    (spell.ritual === true && sources.length > 0 && object(character.magic).ritualCasting === true);
}

function attachCastingSources(character, spell, options) {
  const castingSources = getCharacterSpellcastingSourceOptions(character, spell);
  if (!castingSources.length) return [];
  return options.flatMap((option) => castingSources
    .filter((source) => option.kind === "ritual" ? source.ritual : source.normal)
    .filter((source) => option.kind !== "special" || option.sourceId === source.sourceId)
    .filter((source) => !["normal", "pact"].includes(option.kind) || source.canUseSpellSlots)
    .map((source) => ({
      ...option,
      castingSourceId: source.sourceId,
      castingSourceName: source.sourceName,
      spellcastingAbility: source.spellcastingAbility,
      spellSaveDc: source.spellSaveDc,
      spellAttackBonus: source.spellAttackBonus,
      label: `${option.label} · Cast via ${source.sourceName}`
    })));
}

export function getCharacterSpellSlotOptions(character = {}, spell = {}) {
  const level = count(spell.level, 0);
  if (level === 0) {
    return attachCastingSources(character, spell, [
      { kind: "cantrip", level: 0, sourceId: "", label: "Cantrip — no spell slot", remaining: Infinity }
    ]);
  }
  const magic = object(character.magic);
  const options = [];

  const specialSources = getSpecialSpellSources(character, spell);
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
  normalSpellSlotLedger(magic).forEach(({ level: slotLevel, maximum, used }) => {
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
  const pactSources = getPactSpellSlotLedger(character);
  pactSources.forEach(({ sourceId, slotLevel, remaining }) => {
    if (slotLevel < level) return;
    options.push({
      kind: "pact",
      level: slotLevel,
      sourceId,
      label: `Pact level ${slotLevel} slot (${remaining} remaining)`,
      remaining
    });
  });
  return attachCastingSources(character, spell, options)
    .sort((left, right) => left.level - right.level || left.kind.localeCompare(right.kind) ||
      left.castingSourceName.localeCompare(right.castingSourceName));
}

export function applyConfirmedSpellCast(character = {}, spell = {}, selection = {}, { completingTrackedCast = false } = {}) {
  const next = clone(character);
  const blocked = getSpellcasterBlockReason(next);
  if (blocked) throw new Error(blocked);
  if (!completingTrackedCast) interruptElapsedCasting(next.combat);
  const level = count(spell.level, 0);
  const castingSourceId = text(selection.castingSourceId);
  const castingSources = getCharacterSpellcastingSourceOptions(next, spell);
  if (castingSourceId && !castingSources.some((source) => source.sourceId === castingSourceId)) {
    throw new Error("That spellcasting source is no longer available for this spell.");
  }
  if (castingSources.length > 1 && !castingSourceId) {
    throw new Error("Choose which spellcasting source is casting this spell.");
  }
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
    const currentOptions = getCharacterSpellSlotOptions(next, spell);
    const kind = text(selection.kind) || (level === 0 ? "cantrip" : "normal");
    if (!currentOptions.some((option) => option.kind === kind &&
      option.level === count(selection.level, level) &&
      text(option.sourceId) === text(selection.sourceId) &&
      (!castingSourceId || option.castingSourceId === castingSourceId))) {
      throw new Error("That spell or source/resource combination is no longer available. Check known and prepared spells.");
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
      if (!canCharacterRitualCast(next, spell, castingSourceId)) {
        throw new Error("This character cannot cast that spell as a ritual.");
      }
    } else if (selectionKind === "pact") {
      next.magic.slotUsage.pactSources = object(next.magic.slotUsage.pactSources);
      const sourceId = text(selection.sourceId);
      if (!sourceId) throw new Error("A pact slot source is required.");
      const selectedSource = getPactSpellSlotLedger(next)
        .find((entry) => entry.sourceId === sourceId);
      if (!selectedSource || selectedSource.slotLevel !== selectedLevel ||
        selectedSource.slotLevel < level || selectedSource.remaining < 1) {
        throw new Error("That pact slot is no longer available.");
      }
      next.magic.slotUsage.pactSources[sourceId] = selectedSource.used + 1;
      if (selectedSource.index === 0) next.magic.slotUsage.pact = selectedSource.used + 1;
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
  if (level === 0 && !getCharacterSpellSlotOptions(next, spell).some((option) => option.kind === "cantrip" && (!castingSourceId || option.castingSourceId === castingSourceId))) {
    throw new Error("That cantrip is no longer available on this character.");
  }
  if (spell.concentration === true || spell.targeting?.duration?.concentration === true) {
    next.combat = object(next.combat);
    const replacedSpellName = text(next.combat.concentration?.spellName);
    clearConcentrationChecks(next.combat);
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

