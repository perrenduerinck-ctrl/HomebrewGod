import test from "node:test";
import assert from "node:assert/strict";
import { applyLongCastingCommand, getLongCastingRounds, getLongCastingStatus, supportsTrackedLongCasting } from "../combat/longCasting.js";
import { getCharacterSpellSlotOptions } from "../combat/characterCombatCommands.js";
import { applyGameplayAction } from "../characterSheet/gameplayState.js";
const spell = { id: "long-spell", name: "Long spell", level: 1, castingTime: "1 minute", range: "Self", known: true };
const hero = () => ({ combat: { currentHp: 20, maxHp: 20 }, magic: { knownSpellIds: [spell.id], slots: { 1: 1 } } });
const context = (round = 1, extra = {}) => ({ roomCode: "demo", room: { currentMap: { id: "map" } }, token: { id: "hero", currentHp: 20 }, initiative: { combatActive: true, currentCombatantId: "hero", roundNumber: round, turnCounter: round - 1 }, ...extra });
function start(actor = hero(), extra = {}) { return applyLongCastingCommand(actor, { type: "start", attemptId: "attempt", spell, selection: getCharacterSpellSlotOptions(actor, spell)[0], ...extra }, context()); }
function advance(actor, from = 2, to = 10) {
  let next = actor;
  for (let round = from; round <= to; round += 1) next = applyLongCastingCommand(next, { type: "advance", attemptId: "attempt" }, context(round));
  return next;
}
test("fixed minute/hour casting times have explicit round counts; ambiguous times stay manual", () => {
  assert.equal(getLongCastingRounds(spell), 10);
  assert.equal(getLongCastingRounds({ ...spell, castingTime: "2 hours" }), 1200);
  assert.equal(getLongCastingRounds({ ...spell, castingTime: "1 action or 1 hour" }), null);
  assert.equal(supportsTrackedLongCasting({ ...spell, range: "Special" }), false);
});
test("long casts spend their slot once at completion and release temporary concentration", () => {
  const original = hero(); const started = start(original);
  assert.equal(original.combat.longCasting, undefined);
  assert.equal(started.magic.slotUsage, undefined);
  assert.match(started.combat.concentration.spellId, /^casting:/);
  assert.throws(() => applyLongCastingCommand(started, { type: "complete", attemptId: "attempt" }, context()), /finish.*casting time/i);
  const ready = advance(JSON.parse(JSON.stringify(started)));
  assert.equal(ready.combat.longCasting.status, "ready");
  assert.equal(ready.magic.slotUsage, undefined);
  const done = applyLongCastingCommand(ready, { type: "complete", attemptId: "attempt" }, context(10));
  assert.equal(done.magic.slotUsage.normal[1], 1);
  assert.equal(done.combat.concentration, null);
  assert.equal(done.combat.longCasting.status, "completed");
  assert.throws(() => applyLongCastingCommand(done, { type: "complete", attemptId: "attempt" }, context(10)), /no longer active/i);
});
test("one turn cannot contribute twice and missed turns, map changes and source removal block completion", () => {
  const started = start();
  assert.throws(() => applyLongCastingCommand(started, { type: "advance", attemptId: "attempt" }, context(1)), /once per consecutive turn/i);
  assert.equal(getLongCastingStatus(started, "character", context(3)).status, "interrupted");
  const changedMap = context(2, { room: { currentMap: { id: "elsewhere" } } });
  assert.throws(() => applyLongCastingCommand(started, { type: "advance", attemptId: "attempt" }, changedMap), /map or floor changed/i);
  const ready = advance(started); ready.magic.knownSpellIds = [];
  assert.throws(() => applyLongCastingCommand(ready, { type: "complete", attemptId: "attempt" }, context(10)), /no longer available/i);
});
test("interrupted or cancelled long casts never spend the slot and can be restarted", () => {
  const damaged = start();
  applyGameplayAction(damaged, { type: "damage", amount: 11 });
  assert.equal(damaged.combat.pendingConcentrationCheck.dc, 10);
  assert.throws(() => applyLongCastingCommand(damaged, { type: "advance", attemptId: "attempt" }, context(2)), /pending concentration save/i);
  applyGameplayAction(damaged, { type: "resolve-concentration-check", succeeded: false });
  assert.equal(getLongCastingStatus(damaged, "character", context(2)).status, "interrupted");
  assert.equal(damaged.magic.slotUsage, undefined);
  const cancelled = applyLongCastingCommand(start(), { type: "cancel", attemptId: "attempt" }, context());
  assert.equal(cancelled.combat.concentration, null);
  assert.equal(cancelled.magic.slotUsage, undefined);
  const restarted = applyLongCastingCommand(cancelled, { type: "start", attemptId: "new", spell, selection: getCharacterSpellSlotOptions(cancelled, spell)[0] }, context());
  assert.equal(restarted.combat.longCasting.completedRounds, 1);
});
test("monster long casts use the same progression and spend their actual resource", () => {
  const actor = { spellcasting: { enabled: true, spells: [{ id: "entry", sourceId: spell.id, usage: "daily", uses: 1, level: 1 }] } };
  const reference = { id: "entry", sourceId: spell.id };
  let next = start(actor, { actorKind: "monster", reference, selection: { kind: "special", level: 1, sourceId: "entry" } });
  for (let round = 2; round <= 10; round += 1) next = applyLongCastingCommand(next, { actorKind: "monster", type: "advance", attemptId: "attempt" }, context(round));
  next = applyLongCastingCommand(next, { actorKind: "monster", type: "complete", attemptId: "attempt" }, context(10));
  assert.equal(next.spellcasting.spells[0].usesUsed, 1);
  assert.equal(next.spellcasting.concentration, null);
});

test("turn-ledger serialization matches current rules and companion spell restrictions reset by the actual active turn", async () => {
  const { createFreshActionEconomy, applyActionEconomyCommand, toCombatTurnDocument, hydrateActorSpellTurnState, toActorSpellTurnState } = await import("../combat/actionEconomy.js");
  const fresh = createFreshActionEconomy(context().initiative, "hero");
  const bonus = applyActionEconomyCommand(fresh, { type: "spell", resource: "bonus", spellLevel: 1 });
  const document = toCombatTurnDocument(bonus);
  assert.equal(document.schemaVersion, 1);
  assert.equal(document.spellCastCount, undefined);
  const companion = toActorSpellTurnState(bonus, "1:0:hero");
  const sameTurn = hydrateActorSpellTurnState(document, companion, "1:0:hero");
  assert.throws(() => applyActionEconomyCommand(sameTurn, { type: "spell", resource: "reaction", spellLevel: 1 }), /Bonus Action spell/i);
  const otherTurn = hydrateActorSpellTurnState(document, companion, "1:1:enemy");
  assert.doesNotThrow(() => applyActionEconomyCommand(otherTurn, { type: "spell", resource: "reaction", spellLevel: 1 }));
});

test("lowering tracked character HP starts a concentration check and zero HP interrupts a long cast", () => {
  const actor = start();
  applyGameplayAction(actor, { type: "set-current-hp", amount: 10 });
  assert.equal(actor.combat.pendingConcentrationCheck.dc, 10);
  applyGameplayAction(actor, { type: "set-current-hp", amount: 0 });
  assert.equal(actor.combat.concentration, null);
  assert.equal(getLongCastingStatus(actor, "character", context()).status, "interrupted");
  assert.equal(actor.magic.slotUsage, undefined);
});

test("a long-casting cantrip cannot bypass the one-action cantrip exception after a bonus-action spell", async () => {
  const { createFreshActionEconomy, applyActionEconomyCommand } = await import("../combat/actionEconomy.js");
  const bonus = applyActionEconomyCommand(createFreshActionEconomy(context().initiative, "hero"), { type: "spell", resource: "bonus", spellLevel: 1 });
  assert.throws(() => applyActionEconomyCommand(bonus, { type: "spell", resource: "action", spellLevel: 0, castingKind: "long-cast-progress" }), /only a cantrip with a casting time of 1 Action/i);
});


test("long casting uses canonical character HP even while its token is stale", () => {
  const unconscious = hero(); unconscious.combat.currentHp = 0;
  assert.throws(() => start(unconscious), /unconscious/i);
  const active = start(); active.combat.currentHp = 0;
  assert.equal(getLongCastingStatus(active, "character", context(2)).status, "interrupted");
  assert.throws(() => applyLongCastingCommand(active, { type: "advance", attemptId: "attempt" }, context(2)), /unconscious/i);
  assert.equal(active.magic.slotUsage, undefined);
});


const exploration = (worldTime = 0) => ({ ...context(), initiative: { combatActive: false }, room: { currentMap: { id: "map" }, worldTime } });
function timedStart(actor = hero(), definition = spell, selection = getCharacterSpellSlotOptions(actor, definition)[0]) {
  return applyLongCastingCommand(actor, { type: "start", mode: "elapsed", attemptId: "timed", spell: definition, selection }, exploration());
}
test("exploration casts use campaign time, persist progress, and spend only on completion", () => {
  const started = timedStart();
  assert.equal(started.magic.slotUsage, undefined);
  assert.equal(started.combat.longCasting.requiredSeconds, 60);
  assert.throws(() => applyLongCastingCommand(started, { type: "complete", attemptId: "timed" }, exploration(59)), /finish.*casting time/i);
  const restored = JSON.parse(JSON.stringify(started));
  assert.equal(getLongCastingStatus(restored, "character", exploration(60)).status, "ready");
  const done = applyLongCastingCommand(restored, { type: "complete", attemptId: "timed" }, exploration(60));
  assert.equal(done.magic.slotUsage.normal[1], 1);
  assert.equal(done.combat.concentration, null);
  assert.throws(() => applyLongCastingCommand(done, { type: "complete", attemptId: "timed" }, exploration(61)), /no longer active/i);
});
test("timed casts reject combat, lost concentration, pending saves, clock reversal and stale resources", () => {
  const started = timedStart();
  assert.throws(() => applyLongCastingCommand(started, { type: "complete", attemptId: "timed" }, context(2)), /unavailable during combat/i);
  const damaged = structuredClone(started); applyGameplayAction(damaged, { type: "damage", amount: 1 });
  assert.throws(() => applyLongCastingCommand(damaged, { type: "complete", attemptId: "timed" }, exploration(60)), /pending concentration/i);
  applyGameplayAction(damaged, { type: "resolve-concentration-check", succeeded: false });
  assert.throws(() => applyLongCastingCommand(damaged, { type: "complete", attemptId: "timed" }, exploration(60)), /Concentration was lost/i);
  const unavailable = structuredClone(started); unavailable.magic.knownSpellIds = [];
  assert.throws(() => applyLongCastingCommand(unavailable, { type: "complete", attemptId: "timed" }, exploration(60)), /no longer available/i);
  const moved = structuredClone(started); moved.combat.longCasting.startedWorldTime = 10;
  assert.match(getLongCastingStatus(moved, "character", exploration(9)).reason, /backwards/i);
  const cancelled = applyLongCastingCommand(started, { type: "cancel", attemptId: "timed" }, exploration(60));
  assert.equal(cancelled.magic.slotUsage, undefined);
});
test("Wizard book rituals take the additional ten minutes and spend no slot", () => {
  const ritual = { id: "ritual", name: "Ritual", ritual: true, level: 1, castingTime: "1 action", range: "Self" };
  const actor = { combat: { currentHp: 20, maxHp: 20 }, magic: { classSources: { wizard: { classId: "wizard", className: "Wizard", spellbookSpellIds: [ritual.id] } } } };
  const selection = getCharacterSpellSlotOptions(actor, ritual).find((option) => option.kind === "ritual");
  assert(selection);
  const started = timedStart(actor, ritual, selection);
  assert.equal(started.combat.longCasting.requiredSeconds, 606);
  assert.throws(() => applyLongCastingCommand(started, { type: "complete", attemptId: "timed" }, exploration(600)), /finish.*casting time/i);
  const done = applyLongCastingCommand(started, { type: "complete", attemptId: "timed" }, exploration(606));
  assert.deepEqual(done.magic.slotUsage?.normal || {}, {});
  assert.equal(done.combat.longCasting.status, "completed");
});


test("casting another spell interrupts exploration casting without spending its reserved slot", async () => {
  const { applyConfirmedSpellCast } = await import("../combat/characterCombatCommands.js");
  const actor = timedStart();
  actor.magic.knownSpellIds.push("instant"); actor.magic.slots[1] = 2;
  const instant = { id: "instant", name: "Instant", level: 1, castingTime: "1 action", range: "Self", known: true };
  const next = applyConfirmedSpellCast(actor, instant, getCharacterSpellSlotOptions(actor, instant)[0]);
  assert.equal(next.combat.longCasting.status, "interrupted");
  assert.equal(next.combat.concentration, null);
  assert.equal(next.magic.slotUsage.normal[1], 1);
  assert.throws(() => applyLongCastingCommand(next, { type: "complete", attemptId: "timed" }, exploration(60)), /interrupted/i);
});
