import { normalizeMonsterSpellcasting } from "../monsters/spellcastingEditor.js";

function text(value) {
  return String(value ?? "").trim();
}

function clone(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function findReference(monster = {}, reference = {}) {
  const spellcasting = normalizeMonsterSpellcasting(monster.spellcasting);
  const id = text(reference.id);
  const sourceId = text(reference.sourceId || reference.spellId);
  const spell = spellcasting.spells.find((entry) => (
    (id && entry.id === id) ||
    (sourceId && entry.sourceId === sourceId)
  ));
  return { spellcasting, spell };
}

export function getMonsterSpellAvailability(monster = {}, reference = {}) {
  const { spell } = findReference(monster, reference);
  if (!spell) {
    return Object.freeze({ available: false, remaining: 0, reason: "This monster spell reference no longer exists." });
  }
  if (spell.usage === "atWill") {
    return Object.freeze({ available: true, remaining: Number.POSITIVE_INFINITY, reason: "", kind: "atWill" });
  }
  const maximum = spell.usage === "slot" ? spell.slots : spell.uses;
  const used = spell.usage === "slot" ? spell.slotsUsed : spell.usesUsed;
  const remaining = Math.max(0, maximum - used);
  return Object.freeze({
    available: remaining > 0,
    remaining,
    reason: remaining > 0
      ? ""
      : spell.usage === "slot"
        ? "No monster spell slots remain."
        : "No uses of this monster spell remain.",
    kind: spell.usage
  });
}

export function applyConfirmedMonsterSpellCast(monster = {}, reference = {}, spellDefinition = {}) {
  const next = clone(monster);
  const { spellcasting, spell } = findReference(next, reference);
  if (!spell) throw new Error("This monster spell reference no longer exists.");
  const availability = getMonsterSpellAvailability({ spellcasting }, spell);
  if (!availability.available) throw new Error(availability.reason);

  const stored = spellcasting.spells.find((entry) => entry.id === spell.id);
  if (stored.usage === "slot") stored.slotsUsed += 1;
  else if (stored.usage !== "atWill") stored.usesUsed += 1;

  if (
    spellDefinition.concentration === true ||
    spellDefinition.targeting?.duration?.concentration === true
  ) {
    const replacedSpellName = text(spellcasting.concentration?.spellName);
    spellcasting.concentration = {
      spellId: text(spellDefinition.id || stored.sourceId || stored.id),
      spellName: text(spellDefinition.name || stored.name) || "Spell",
      startedAtMillis: Date.now(),
      ...(replacedSpellName && replacedSpellName !== text(spellDefinition.name || stored.name)
        ? { replacedSpellName }
        : {})
    };
  }

  next.spellcasting = spellcasting;
  return next;
}

export function restoreMonsterSpellResources(monster = {}, restType = "long") {
  const next = clone(monster);
  const spellcasting = normalizeMonsterSpellcasting(next.spellcasting);
  if (restType !== "long") {
    next.spellcasting = spellcasting;
    return next;
  }
  spellcasting.spells.forEach((spell) => {
    if (spell.usage === "slot") spell.slotsUsed = 0;
    if (spell.usage === "daily" || spell.usage === "innate") {
      spell.usesUsed = 0;
    }
  });
  next.spellcasting = spellcasting;
  return next;
}
