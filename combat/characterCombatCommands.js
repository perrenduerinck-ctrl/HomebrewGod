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

export function getCharacterSpellSlotOptions(character = {}, spell = {}) {
  const level = count(spell.level, 0);
  if (level === 0) {
    return [{ kind: "cantrip", level: 0, sourceId: "", label: "Cantrip — no spell slot", remaining: Infinity }];
  }
  const magic = object(character.magic);
  const options = [];
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
  const pactUsage = object(object(magic.slotUsage).pactSources);
  const pactSources = Array.isArray(magic.pactMagicSources)
    ? magic.pactMagicSources.map((source, index) => [
        text(source?.classEntryId) || `pact-source-${index + 1}`,
        source
      ])
    : Object.entries(object(magic.pactMagicSources));
  if (!pactSources.length && magic.pactMagic) pactSources.push(["legacy:pact-magic", magic.pactMagic]);
  pactSources.forEach(([sourceId, source]) => {
    const slotLevel = count(source?.slotLevel ?? source?.level, 0);
    const maximum = count(source?.slots ?? source?.maximumSlots ?? source?.maximumUses, 0);
    if (slotLevel < level || maximum < 1) return;
    const remaining = Math.max(0, maximum - count(pactUsage[sourceId], 0));
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
  if (level > 0) {
    const selectionKind = text(selection.kind) || "normal";
    const selectedLevel = count(selection.level, level);
    if (!["normal", "pact"].includes(selectionKind)) {
      throw new Error("Choose a valid spell slot before confirming the cast.");
    }
    if (selectedLevel < level) {
      throw new Error("That spell slot is too low for this spell.");
    }
    next.magic = object(next.magic);
    next.magic.slotUsage = object(next.magic.slotUsage);
    if (selectionKind === "pact") {
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
    next.combat.concentration = {
      spellId: text(spell.id),
      spellName: text(spell.name) || "Spell",
      startedAtMillis: Date.now()
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

