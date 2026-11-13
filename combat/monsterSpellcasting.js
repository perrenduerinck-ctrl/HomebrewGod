import { getSpellcasterBlockReason } from "../spells/spellCastingRules.js";
import { enqueueConcentrationCheck, clearConcentrationChecks, resolveConcentrationCheck, interruptElapsedCasting } from "./concentrationChecks.js";
import { normalizeMonsterSpellcasting, normalizeMonsterSpellReference } from "../monsters/spellcastingEditor.js";

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
  // An explicit entry ID must never fall through to another grant.
  const exact = id ? spellcasting.spells.filter((entry) => entry.id === id) : [];
  const legacy = !id && sourceId ? spellcasting.spells.filter((entry, index) => entry.sourceId === sourceId && !text(monster.spellcasting?.spells?.[index]?.id)) : [];
  const matches = id ? exact : legacy;
  const spell = matches.length === 1 ? matches[0] : null;
  // Compare only fields supplied by the targeting snapshot, retaining ID-only legacy callers.
  const fields = ["source", "usage", "level", "castingTime", "range"];
  const snapshot = normalizeMonsterSpellReference(reference) || reference;
  const changed = Boolean(spell && (
    (sourceId && sourceId !== spell.sourceId) ||
    fields.some((key) => Object.hasOwn(reference, key) &&
      (key === "level" ? snapshot[key] !== spell[key] : text(snapshot[key]) !== text(spell[key])))
  ));
  return { spellcasting, spell, changed };
}

export function getMonsterSpellAvailability(monster = {}, reference = {}, selection = {}) {
  const blocked = getSpellcasterBlockReason(monster, { actorKind: "monster" });
  if (blocked) return Object.freeze({ available: false, remaining: 0, reason: blocked });
  const { spellcasting, spell, changed } = findReference(monster, reference);
  if (changed) return Object.freeze({ available: false, remaining: 0, reason: "That monster spell reference changed. Select it again." });
  if (!spell || !spellcasting.enabled) {
    return Object.freeze({ available: false, remaining: 0, reason: "This monster spell reference no longer exists." });
  }
  if (spell.usage === "atWill") {
    return Object.freeze({ available: true, remaining: Number.POSITIVE_INFINITY, reason: "", kind: "atWill" });
  }
  if (spell.usage === "slot") {
    const options = Object.entries(spellcasting.slotPools)
      .filter(([level]) => Number(level) >= Math.max(1, spell.level))
      .map(([level, pool]) => ({ kind: "slot", level: Number(level), remaining: Math.max(0, pool.maximum - pool.used), label: `Level ${level} shared slot (${Math.max(0, pool.maximum - pool.used)} remaining)` }))
      .sort((left, right) => left.level - right.level);
    const selected = selection.level != null ? options.find((option) => option.level === Number(selection.level)) : options.find((option) => option.remaining > 0);
    return Object.freeze({ available: Boolean(selected?.remaining > 0), remaining: selected?.remaining || 0, reason: selected?.remaining > 0 ? "" : "No monster spell slots remain.", kind: "slot", options, level: selected?.level });
  }
  const maximum = spell.uses;
  const used = spell.usesUsed;
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

export function applyConfirmedMonsterSpellCast(monster = {}, reference = {}, spellDefinition = {}, selection = {}, { completingTrackedCast = false } = {}) {
  const next = clone(monster);
  const blocked = getSpellcasterBlockReason(next, { actorKind: "monster" });
  if (blocked) throw new Error(blocked);
  if (!completingTrackedCast) interruptElapsedCasting(next.spellcasting);
  const { spellcasting, spell, changed } = findReference(next, reference);
  if (changed) throw new Error("That monster spell reference changed. Select it again.");
  if (!spell) throw new Error("This monster spell reference no longer exists.");
  if (!spellcasting.enabled) throw new Error("Monster spellcasting is disabled.");
  if (reference.sourceId && text(reference.sourceId) !== spell.sourceId) throw new Error("That monster spell reference changed. Select it again.");
  const availability = getMonsterSpellAvailability({ spellcasting }, spell, selection);
  if (spell.usage === "slot" && availability.level < Number(spellDefinition.level || 0)) throw new Error("That monster slot is too low for the saved spell definition.");
  if (!availability.available) throw new Error(availability.reason);

  const stored = spellcasting.spells.find((entry) => entry.id === spell.id);
  if (stored.usage === "slot") spellcasting.slotPools[availability.level].used += 1;
  else if (stored.usage !== "atWill") stored.usesUsed += 1;

  if (
    spellDefinition.concentration === true ||
    spellDefinition.targeting?.duration?.concentration === true
  ) {
    const replacedSpellName = text(spellcasting.concentration?.spellName);
    clearConcentrationChecks(spellcasting);
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
  Object.values(spellcasting.slotPools).forEach((pool) => { pool.used = 0; });
  spellcasting.spells.forEach((spell) => {
    if (spell.usage === "slot") spell.slotsUsed = 0;
    if (spell.usage === "daily" || spell.usage === "innate") {
      spell.usesUsed = 0;
    }
  });
  next.spellcasting = spellcasting;
  return next;
}

export function applyMonsterConcentrationEvent(monster = {}, event = {}) {
  const next = clone(monster);
  next.spellcasting = normalizeMonsterSpellcasting(next.spellcasting);
  const state = next.spellcasting;
  if (!state.concentration) return next;
  const endingConditions = ["incapacitated", "paralyzed", "petrified", "stunned", "unconscious", "dead"];
  if (event.type === "end" || event.currentHp === 0 ||
    (event.type === "condition" && endingConditions.includes(text(event.condition).toLowerCase()))) {
    state.concentration = null;
    clearConcentrationChecks(state);
  } else if (event.type === "damage" && Number(event.amount) > 0) {
    enqueueConcentrationCheck(state, { dc: Math.max(10, Math.floor(Number(event.amount) / 2)), damage: Number(event.amount) });
  } else if (event.type === "save" && state.pendingConcentrationCheck) {
    if (!Number.isFinite(Number(event.total))) throw new Error("Enter the Constitution save total.");
    resolveConcentrationCheck(state, Number(event.total) >= state.pendingConcentrationCheck.dc);
  }
  return next;
}
