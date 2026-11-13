import { clearConcentrationChecks } from "./concentrationChecks.js";
import { getSpellcasterBlockReason, getSpellActionKind } from "../spells/spellCastingRules.js";
import { createSpellTemplateInstruction } from "../battleMap/spellTemplates.js";
import { applyConfirmedSpellCast, getCharacterSpellSlotOptions } from "./characterCombatCommands.js";
import { applyConfirmedMonsterSpellCast, getMonsterSpellAvailability } from "./monsterSpellcasting.js";

const copy = (value) => JSON.parse(JSON.stringify(value));
const text = (value) => String(value ?? "").trim();
const activeStatuses = new Set(["casting", "ready"]);
const stateOf = (actor, kind) => kind === "monster" ? actor.spellcasting || {} : actor.combat || {};
const stateOn = (actor, kind) => kind === "monster" ? (actor.spellcasting ||= {}) : (actor.combat ||= {});
const concentrationId = (attempt) => `casting:${attempt.id}`;

export function getLongCastingRounds(spell = {}) {
  if (getSpellActionKind(spell) !== "long-cast") return null;
  const match = text(spell.castingTime).toLowerCase().match(/^(\d+)\s*(minute|hour)s?\.?$/);
  if (!match || Number(match[1]) < 1) return null;
  const rounds = Number(match[1]) * (match[2] === "hour" ? 600 : 10);
  return Number.isSafeInteger(rounds) && rounds <= 14400 ? rounds : null;
}

export function supportsTrackedLongCasting(spell = {}) {
  return getLongCastingRounds(spell) !== null && createSpellTemplateInstruction(spell).supported;
}

export function getTimedCastingSeconds(spell = {}, selection = {}) {
  const rounds = getLongCastingRounds(spell);
  const kind = getSpellActionKind(spell);
  const base = rounds !== null ? rounds * 6 : ["action", "bonus-action"].includes(kind) ? 6 : null;
  if (base === null || !createSpellTemplateInstruction(spell).supported) return null;
  if (selection.kind === "ritual") return spell.ritual === true ? base + 600 : null;
  return rounds !== null ? base : null;
}

function scope(context = {}) {
  return JSON.stringify([context.roomCode || "", context.room?.currentMap?.id || context.room?.currentMapId || "", context.token?.sceneId || "", context.token?.floorId || ""]);
}

export function getLongCastingStatus(actor = {}, actorKind = "character", context = {}) {
  const state = stateOf(actor, actorKind);
  const attempt = state.longCasting;
  if (!attempt?.id) return null;
  let reason = attempt.status === "interrupted" ? attempt.interruptionReason || "Casting was interrupted." : "";
  if (activeStatuses.has(attempt.status)) {
    if (state.concentration?.spellId !== concentrationId(attempt)) reason = "Concentration was lost. Start the spell again.";
    if (attempt.mode === "elapsed" && context.initiative?.combatActive === true) reason = "Combat interrupted the timed casting. Start again after combat.";
    if (attempt.mode === "elapsed" && context.room && Number(context.room.worldTime || 0) < attempt.startedWorldTime) reason = "The campaign clock moved backwards. Start casting again.";
    if (attempt.mode !== "elapsed" && context.initiative && (context.initiative.combatActive !== true || Number(context.initiative.roundNumber) > attempt.lastRound + 1)) reason = "Casting was interrupted because a turn's casting action was missed or combat ended.";
    if (context.room && scope(context) !== attempt.scope) reason = "The caster's map or floor changed. Start the spell again.";
    const blocked = getSpellcasterBlockReason(actor, { token: context.token, actorKind });
    if (blocked) reason = blocked;
  }
  const elapsedSeconds = attempt.mode === "elapsed" ? Math.max(0, Number(context.room?.worldTime || 0) - attempt.startedWorldTime) : 0;
  const status = reason ? "interrupted" : attempt.mode === "elapsed" && activeStatuses.has(attempt.status) && elapsedSeconds >= attempt.requiredSeconds ? "ready" : attempt.status;
  return { ...attempt, elapsedSeconds, status, reason,
    pendingSave: Boolean(state.pendingConcentrationCheck),
    canAdvance: !reason && activeStatuses.has(attempt.status) && !state.pendingConcentrationCheck && Number(context.initiative?.roundNumber) > attempt.lastRound };
}

function validateResource(actor, kind, spell, selection, reference, allowRitual = false) {
  if (kind === "monster") {
    const availability = getMonsterSpellAvailability(actor, reference, selection);
    if (!availability.available || (availability.kind === "slot" && selection.level < spell.level)) throw new Error(availability.reason || "The chosen monster resource is unavailable.");
    if (reference?.sourceId && reference.sourceId !== spell.id) throw new Error("The monster spell reference changed.");
    return;
  }
  if (actor.combat?.classFeatureStates?.rageActive) throw new Error("Spellcasting is blocked while Rage is active.");
  const matches = getCharacterSpellSlotOptions(actor, spell).filter((option) => (allowRitual || option.kind !== "ritual") && option.remaining > 0 &&
    option.kind === selection.kind && option.level === selection.level && text(option.sourceId) === text(selection.sourceId) &&
    text(option.castingSourceId) === text(selection.castingSourceId));
  if (matches.length !== 1) throw new Error("That spell or resource is no longer available. Check known and prepared spells.");
}

// This reducer runs against the latest actor inside the existing Firestore transaction.
// Action economy is spent by the caller in that same transaction; slots are spent only on complete.
export function applyLongCastingCommand(actor = {}, command = {}, context = {}) {
  const kind = command.actorKind === "monster" ? "monster" : "character";
  let next = copy(actor);
  let state = stateOn(next, kind);
  const previous = state.longCasting;
  const current = getLongCastingStatus(next, kind, context);
  const action = command.type;
  if (action === "cancel") {
    if (!current || current.id !== command.attemptId || !["casting", "ready", "interrupted"].includes(previous.status)) throw new Error("That casting attempt is no longer active.");
    state.longCasting = { ...previous, status: "cancelled", interruptionReason: "Casting cancelled." };
    if (state.concentration?.spellId === concentrationId(previous)) { state.concentration = null; clearConcentrationChecks(state); }
    return next;
  }
  const elapsed = action === "start" ? command.mode === "elapsed" : previous?.mode === "elapsed";
  if (elapsed) {
    if (context.initiative?.combatActive === true) throw new Error("Timed casting is unavailable during combat.");
    if (!Number.isSafeInteger(context.room?.worldTime) || context.room.worldTime < 0) throw new Error("The campaign clock is unavailable.");
  } else {
    if (context.initiative?.combatActive !== true) throw new Error("Tracked long casting requires active initiative. Resolve exploration casting manually.");
    if (context.initiative.currentCombatantId !== context.token?.id) throw new Error("It is not this caster's turn.");
  }
  const round = Number(context.initiative?.roundNumber);
  if (!elapsed && (!Number.isSafeInteger(round) || round < 1)) throw new Error("The combat round is unavailable.");
  if (action === "start") {
    if (!command.attemptId || command.attemptId === previous?.id) throw new Error("A new casting attempt ID is required.");
    if (current && activeStatuses.has(current.status)) throw new Error("Finish or cancel the current casting attempt first.");
    const duration = elapsed ? getTimedCastingSeconds(command.spell, command.selection) : null;
    if (elapsed ? duration === null : !supportsTrackedLongCasting(command.spell)) throw new Error("This casting time or targeting requires manual resolution.");
    const selection = copy({ kind: command.selection?.kind, level: command.selection?.level, sourceId: text(command.selection?.sourceId), castingSourceId: text(command.selection?.castingSourceId) });
    validateResource(next, kind, command.spell, selection, command.reference, elapsed);
    const blocked = getSpellcasterBlockReason(next, { token: context.token, actorKind: kind });
    if (blocked) throw new Error(blocked);
    const attempt = { id: text(command.attemptId), spell: copy(command.spell), selection,
      reference: copy(command.reference || {}), ...(elapsed ? { mode: "elapsed", startedWorldTime: context.room.worldTime, requiredSeconds: duration } : {}), requiredRounds: getLongCastingRounds(command.spell), completedRounds: 1,
      lastRound: elapsed ? 0 : round, lastTurnCounter: Number(context.initiative?.turnCounter) || 0, scope: scope(context), status: "casting" };
    state.longCasting = attempt;
    state.concentration = { spellId: concentrationId(attempt), spellName: `Casting ${command.spell.name || "spell"}`, startedAtMillis: command.now ?? Date.now() };
    clearConcentrationChecks(state);
    return next;
  }
  if (!current || current.id !== command.attemptId || !activeStatuses.has(current.status)) throw new Error(current?.reason || "That casting attempt is no longer active.");
  if (current.pendingSave) throw new Error("Resolve the pending concentration save before continuing.");
  validateResource(next, kind, current.spell, current.selection, current.reference, elapsed);
  if (action === "advance") {
    if (elapsed) throw new Error("Timed casting advances only with the campaign clock.");
    if (round !== current.lastRound + 1) throw new Error("Casting can advance only once per consecutive turn.");
    const completedRounds = Math.min(current.requiredRounds, current.completedRounds + 1);
    state.longCasting = { ...previous, completedRounds, lastRound: round, lastTurnCounter: Number(context.initiative.turnCounter) || 0,
      status: completedRounds >= current.requiredRounds ? "ready" : "casting" };
    return next;
  }
  if (action === "complete") {
    if (current.status !== "ready" || (!elapsed && (round !== current.lastRound || Number(context.initiative.turnCounter || 0) !== current.lastTurnCounter))) throw new Error("Spend this turn's casting action and finish the required casting time before confirming.");
    next = kind === "monster" ? applyConfirmedMonsterSpellCast(next, current.reference, current.spell, current.selection, { completingTrackedCast: true }) : applyConfirmedSpellCast(next, current.spell, current.selection, { completingTrackedCast: true });
    state = stateOn(next, kind);
    if (state.concentration?.spellId === concentrationId(current)) state.concentration = null;
    clearConcentrationChecks(state);
    state.longCasting = { ...previous, status: "completed" };
    return next;
  }
  throw new Error("Unknown long casting command.");
}
