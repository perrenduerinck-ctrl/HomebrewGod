import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  applyActionEconomyCommand,
  createFreshActionEconomy,
  synchronizeActionEconomy,
  synchronizeReactionEconomy
} from "../combat/actionEconomy.js";
import {
  applyMovementDash,
  applyMovementMode,
  normalizeMovementState
} from "../combat/movementSystem.js";
import {
  buildCombatActionBarModel,
  getCharacterMovementModes,
  getLegacyJumpProfile
} from "../combat/actionBarModel.js";
import {
  isCombatActionTurnUsable
} from "../combat/actionBar.js";
import {
  applyConfirmedSpellCast,
  consumeCharacterInventoryItem,
  getCharacterSpellSlotOptions,
  setCombatActionBarFavorite
} from "../combat/characterCombatCommands.js";

const initiative = {
  combatActive: true,
  roundNumber: 2,
  turnCounter: 7,
  currentCombatantId: "hero"
};

test("turn economy survives reconnect and resets on a new initiative turn", () => {
  const fresh = createFreshActionEconomy(initiative, "hero");
  const spent = applyActionEconomyCommand(fresh, {
    type: "dodge",
    resource: "action",
    actorUid: "owner"
  });
  assert.equal(spent.actionsRemaining, 0);
  assert.equal(spent.dodging, true);
  assert.equal(synchronizeActionEconomy(spent, initiative, "hero").actionsRemaining, 0);
  const reset = synchronizeActionEconomy(spent, {
    ...initiative,
    roundNumber: 3,
    turnCounter: 9
  }, "hero");
  assert.equal(reset.actionsRemaining, 1);
  assert.equal(reset.bonusActionsRemaining, 1);
  assert.equal(reset.reactionAvailable, true);
  assert.equal(reset.dodging, false);
  assert.equal(reset.revision, spent.revision);
});
test("Extra Attack uses one Action and Action Surge cannot repeat", () => {
  let state = createFreshActionEconomy(initiative, "hero");
  state = applyActionEconomyCommand(state, {
    type: "weapon-attack",
    resource: "action",
    numberOfAttacks: 2
  });
  assert.equal(state.actionsRemaining, 0);
  assert.equal(state.attacksRemaining, 1);
  state = applyActionEconomyCommand(state, {
    type: "weapon-attack",
    resource: "action",
    numberOfAttacks: 2
  });
  assert.equal(state.actionsRemaining, 0);
  assert.equal(state.attacksRemaining, 0);
  state = applyActionEconomyCommand(state, { type: "action-surge", resource: "free" });
  assert.equal(state.actionsRemaining, 1);
  assert.throws(
    () => applyActionEconomyCommand(state, { type: "action-surge", resource: "free" }),
    /already used/i
  );
});

test("an off-turn reaction spends once and refreshes at the token's next turn", () => {
  const enemyTurn = {
    combatActive: true,
    roundNumber: 2,
    turnCounter: 8,
    currentCombatantId: "goblin",
    initiativeOrder: [
      { tokenId: "hero" },
      { tokenId: "goblin" }
    ]
  };
  const available = synchronizeReactionEconomy({}, enemyTurn, "hero");
  assert.equal(available.actionsRemaining, 0);
  assert.equal(available.bonusActionsRemaining, 0);
  assert.equal(available.reactionAvailable, true);
  assert.equal(
    isCombatActionTurnUsable(
      { resource: "reaction" },
      enemyTurn,
      "hero"
    ),
    true
  );
  assert.equal(
    isCombatActionTurnUsable(
      { resource: "action" },
      enemyTurn,
      "hero"
    ),
    false
  );

  const spent = applyActionEconomyCommand(available, {
    type: "shield",
    resource: "reaction",
    actorUid: "owner"
  });
  assert.equal(spent.reactionAvailable, false);
  assert.throws(
    () => applyActionEconomyCommand(spent, {
      type: "opportunity-attack",
      resource: "reaction"
    }),
    /already been used/i
  );
  assert.equal(
    synchronizeReactionEconomy(spent, enemyTurn, "hero").reactionAvailable,
    false
  );

  const heroTurn = synchronizeReactionEconomy(spent, {
    ...enemyTurn,
    roundNumber: 3,
    turnCounter: 9,
    currentCombatantId: "hero"
  }, "hero");
  assert.equal(heroTurn.actionsRemaining, 1);
  assert.equal(heroTurn.bonusActionsRemaining, 1);
  assert.equal(heroTurn.reactionAvailable, true);
});

test("Dash increases only the turn budget and cannot stack", () => {
  const base = normalizeMovementState({
    combatActive: true,
    activeTokenId: "hero",
    activeTokenName: "Hero",
    baseSpeed: 30,
    movementMode: "walk",
    movementModeBaseSpeed: 30,
    dashCount: 0,
    movementRemaining: 20,
    movementSpent: 10,
    movementTurnKey: "2:hero",
    turnRoundNumber: 2
  });
  const dashed = applyMovementDash(base);
  assert.equal(dashed.baseSpeed, 60);
  assert.equal(dashed.movementRemaining, 50);
  assert.equal(dashed.movementModeBaseSpeed, 30);
  assert.throws(() => applyMovementDash(dashed), /already/i);
});

test("movement mode selection uses only available character speeds", () => {
  const character = {
    combat: { baseSpeed: { walk: 30, fly: 60, swim: 0 } }
  };
  assert.deepEqual(
    getCharacterMovementModes(character).map(({ id, speed }) => [id, speed]),
    [["walk", 30], ["fly", 60]]
  );
  const state = normalizeMovementState({
    combatActive: true,
    activeTokenId: "hero",
    baseSpeed: 30,
    movementModeBaseSpeed: 30,
    movementRemaining: 30,
    movementSpent: 0,
    movementTurnKey: "2:hero",
    turnRoundNumber: 2
  });
  const flying = applyMovementMode(state, { mode: "fly", speed: 60 });
  assert.equal(flying.movementMode, "fly");
  assert.equal(flying.baseSpeed, 60);
});

test("Legacy 2014 jump distances derive from Strength", () => {
  assert.deepEqual(getLegacyJumpProfile({ abilities: { scores: { str: 16 } } }), {
    strength: 16,
    modifier: 3,
    runningLong: 16,
    standingLong: 8,
    runningHigh: 6,
    standingHigh: 3
  });
});

test("character model adapts existing weapons, spells, items and stable favorites", () => {
  const character = {
    identity: { name: "Mira" },
    combat: { attacksPerAction: 2, baseSpeed: { walk: 30 } },
    equipment: { items: [
      { id: "sword", name: "Longsword", category: "weapon", equipped: true, damageDice: "1d8", quantity: 1 },
      { id: "potion", name: "Potion of Healing", category: "consumable", quantity: 2 }
    ] },
    magic: { knownSpellIds: ["fire-bolt"] },
    uiPreferences: { combatActionBarFavorites: [{ key: "weapon:sword" }] }
  };
  const model = buildCombatActionBarModel({ token: { id: "hero" }, actor: character, actorKind: "character" });
  assert.ok(model.weapons.some((entry) => entry.name === "Longsword" && entry.numberOfAttacks === 2));
  assert.ok(model.items.some((entry) => entry.name === "Potion of Healing"));
  assert.ok(model.favorites.some((entry) => entry.name === "Longsword"));
});

test("spell slots, cancellation-safe mutations, item use and favorites retain source data", () => {
  const character = {
    magic: { slots: { 1: 2 }, slotUsage: { normal: { 1: 1 } } },
    equipment: { items: [{ id: "potion", name: "Potion", quantity: 2 }] },
    customUntouched: { safe: true }
  };
  const options = getCharacterSpellSlotOptions(character, { id: "shield", level: 1 });
  assert.equal(options[0].remaining, 1);
  const cast = applyConfirmedSpellCast(character, { id: "shield", name: "Shield", level: 1 }, options[0]);
  assert.equal(cast.magic.slotUsage.normal[1], 2);
  assert.equal(character.magic.slotUsage.normal[1], 1);
  const pactCharacter = {
    magic: {
      pactMagicSources: [{ classEntryId: "warlock", className: "Warlock", slots: 1, slotLevel: 2 }],
      slotUsage: { pactSources: { warlock: 0 }, pact: 0 }
    }
  };
  const pactOption = getCharacterSpellSlotOptions(pactCharacter, { id: "hex", level: 1 })[0];
  assert.equal(pactOption.kind, "pact");
  const concentrated = applyConfirmedSpellCast(
    pactCharacter,
    { id: "hex", name: "Hex", level: 1, concentration: true },
    pactOption
  );
  assert.equal(concentrated.magic.slotUsage.pactSources.warlock, 1);
  assert.equal(concentrated.combat.concentration.spellId, "hex");
  const consumed = consumeCharacterInventoryItem(character, { id: "potion" });
  assert.equal(consumed.equipment.items[0].quantity, 1);
  assert.equal(consumed.customUntouched.safe, true);
  const pinned = setCombatActionBarFavorite(character, { key: "spell:shield", kind: "spell", id: "shield" }, true);
  assert.deepEqual(pinned.uiPreferences.combatActionBarFavorites[0], {
    key: "spell:shield",
    kind: "spell",
    id: "shield"
  });
});

test("legacy saved spell-slot records remain castable without rewriting their character", () => {
  const legacyCharacter = {
    schemaVersion: 12,
    magic: {
      spellSlots: {
        1: { maximum: 4, used: 2 },
        2: { maximum: 2, used: 0 }
      }
    },
    futureData: { preserved: true }
  };

  const options = getCharacterSpellSlotOptions(
    legacyCharacter,
    { id: "magic-missile", name: "Magic Missile", level: 1 }
  );
  assert.deepEqual(
    options.map(({ level, remaining }) => [level, remaining]),
    [[1, 2], [2, 2]]
  );

  const cast = applyConfirmedSpellCast(
    legacyCharacter,
    { id: "magic-missile", name: "Magic Missile", level: 1 },
    options[0]
  );
  assert.equal(cast.magic.slotUsage.normal[1], 3);
  assert.equal(cast.magic.spellSlots[1].used, 3);
  assert.equal(cast.magic.spellSlots[1].maximum, 4);
  assert.equal(cast.futureData.preserved, true);
  assert.equal(legacyCharacter.magic.spellSlots[1].used, 2);

  assert.throws(
    () => applyConfirmedSpellCast(
      legacyCharacter,
      { id: "fireball", name: "Fireball", level: 3 },
      { kind: "normal", level: 1 }
    ),
    /too low/i
  );
  assert.throws(
    () => applyConfirmedSpellCast(
      legacyCharacter,
      { id: "shield", name: "Shield", level: 1 },
      { kind: "unknown", level: 1 }
    ),
    /valid spell slot/i
  );

  const exhausted = {
    magic: { spellSlots: { 1: { maximum: 1, used: 1 } } }
  };
  assert.equal(
    getCharacterSpellSlotOptions(exhausted, { level: 1 })[0].remaining,
    0
  );
  assert.throws(
    () => applyConfirmedSpellCast(
      exhausted,
      { id: "shield", name: "Shield", level: 1 },
      { kind: "normal", level: 1 }
    ),
    /no longer available/i
  );
});

test("navigation, controller reuse and Firestore ownership contracts are wired", async () => {
  const [app, html, rules, policy] = await Promise.all([
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../firestore.rules", import.meta.url), "utf8"),
    readFile(new URL("../rooms/roomDeletionPolicy.js", import.meta.url), "utf8")
  ]);
  assert.match(app, /openBattleMapButton[\s\S]*requestMainScreenNavigation\("battle"\)/);
  assert.match(app, /openBattleMapSeparateButton[\s\S]*openToolTab\("battle"\)/);
  assert.match(app, /beginCharacterSpellTargeting/);
  assert.match(app, /beginCombatActionTargeting/);
  assert.match(app, /movementSystem\.previewMove/);
  assert.match(html, /Open Battle Map in Separate Window/);
  assert.match(rules, /match \/combatTurns\/\{tokenId\}/);
  assert.match(rules, /ownsRoomToken\(roomCode, tokenId\)/);
  assert.match(rules, /validPlayerTurnAdvanceRequest/);
  assert.match(policy, /combatTurns/);
});

