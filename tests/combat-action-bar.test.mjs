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
  getCharacterSpellcastingSourceOptions,
  getCharacterSpellSlotOptions,
  getPactSpellSlotLedger,
  setCombatActionBarFavorite
} from "../combat/characterCombatCommands.js";
import {
  getSpellActionKind,
  getSpellCastEligibility,
  resolveCharacterSpellcastingStats
} from "../spells/spellCastingRules.js";
import {
  applyConfirmedMonsterSpellCast,
  getMonsterSpellAvailability,
  restoreMonsterSpellResources
} from "../combat/monsterSpellcasting.js";
import { SPELL_SOURCE_MODEL_VERSION } from "../characterCreator/spellSources.js";

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

test("spell casting uses one shared eligibility and action-resource rule", () => {
  const character = {
    magic: {
      knownSpellIds: ["misty-step"],
      classSources: {
        wizard: {
          className: "Wizard",
          spellbookSpellIds: ["shield"]
        }
      }
    }
  };
  const model = buildCombatActionBarModel({ actor: character, actorKind: "character" });
  const mistyStep = model.spells.find((spell) => spell.id === "misty-step");
  assert.equal(mistyStep.resource, "bonus");
  assert.equal(model.spells.some((spell) => spell.id === "shield"), false);
  assert.equal(
    getSpellCastEligibility({ level: 1, statuses: ["Spellbook"] }).eligible,
    false
  );
  assert.equal(
    getSpellCastEligibility({ level: 1, ritual: true, statuses: ["Spellbook"] }).eligible,
    true
  );
  const reactionCharacter = {
    magic: { knownSpellIds: ["shield"] }
  };
  const reaction = buildCombatActionBarModel({
    actor: reactionCharacter,
    actorKind: "character"
  }).spells.find((spell) => spell.id === "shield");
  assert.equal(reaction.resource, "reaction");
  assert.match(reaction.summary, /Trigger:/i);
});

test("2014 Bonus Action spell restriction is tracked across the turn", () => {
  let state = createFreshActionEconomy(initiative, "hero");
  state = applyActionEconomyCommand(state, {
    type: "spell",
    resource: "bonus",
    spellLevel: 2
  });
  assert.equal(state.bonusActionsRemaining, 0);
  assert.equal(state.bonusActionSpellCast, true);
  state = applyActionEconomyCommand(state, {
    type: "spell",
    resource: "action",
    spellLevel: 0
  });
  assert.equal(state.actionsRemaining, 0);
  assert.throws(() => applyActionEconomyCommand(state, {
    type: "spell",
    resource: "reaction",
    spellLevel: 1
  }), /Bonus Action spell/i);

  let reverse = createFreshActionEconomy(initiative, "hero");
  reverse = applyActionEconomyCommand(reverse, {
    type: "spell",
    resource: "action",
    spellLevel: 1
  });
  assert.throws(() => applyActionEconomyCommand(reverse, {
    type: "spell",
    resource: "bonus",
    spellLevel: 1
  }), /cannot be cast/i);
});

test("ritual and long-cast workflows do not masquerade as ordinary combat actions", () => {
  const identify = {
    id: "identify",
    name: "Identify",
    level: 1,
    ritual: true,
    statuses: ["Spellbook"]
  };
  const wizard = {
    magic: {
      slots: { 1: 2 },
      slotUsage: { normal: { 1: 0 } },
      classSources: {
        wizard: {
          classId: "wizard",
          spellbookSpellIds: ["identify"]
        }
      }
    }
  };
  assert.equal(
    getCharacterSpellSlotOptions(wizard, identify).some((option) => option.kind === "ritual"),
    true
  );
  assert.deepEqual(
    getCharacterSpellSlotOptions(wizard, identify).map((option) => option.kind),
    ["ritual"]
  );
  assert.throws(
    () => applyConfirmedSpellCast(wizard, identify, { kind: "normal", level: 1 }),
    /no longer available/i
  );
  const sorcerer = {
    magic: {
      classSources: {
        sorcerer: {
          classId: "sorcerer",
          knownSpellIds: ["identify"]
        }
      }
    }
  };
  assert.equal(
    getCharacterSpellSlotOptions(
      sorcerer,
      { ...identify, statuses: ["Known"] }
    ).some((option) => option.kind === "ritual"),
    false
  );
  assert.equal(getSpellActionKind({ castingTime: "10 minutes" }), "long-cast");
});

test("spell slots, cancellation-safe mutations, item use and favorites retain source data", () => {
  const character = {
    magic: { knownSpellIds: ["shield"], slots: { 1: 2 }, slotUsage: { normal: { 1: 1 } } },
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
      knownSpellIds: ["hex"],
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

test("Pact slot display and confirmation share one legacy-compatible ledger", () => {
  const character = {
    magic: {
      knownSpellIds: ["hex"],
      pactMagicSources: [{
        classEntryId: "warlock-main",
        className: "Warlock",
        slotLevel: 2,
        maximumUses: 2
      }],
      slotUsage: { pactSources: { "warlock-main": 1 }, pact: 1 }
    }
  };
  const ledger = getPactSpellSlotLedger(character);
  assert.deepEqual(ledger.map(({ sourceId, slotLevel, maximum, used, remaining }) => ({
    sourceId, slotLevel, maximum, used, remaining
  })), [{ sourceId: "warlock-main", slotLevel: 2, maximum: 2, used: 1, remaining: 1 }]);
  const option = getCharacterSpellSlotOptions(character, { id: "hex", level: 1 })[0];
  assert.equal(option.remaining, 1);
  const cast = applyConfirmedSpellCast(character, { id: "hex", level: 1 }, option);
  assert.equal(cast.magic.slotUsage.pactSources["warlock-main"], 2);
  assert.throws(() => applyConfirmedSpellCast(cast, { id: "hex", level: 1 }, option), /no longer available/i);
});

test("legacy saved spell-slot records remain castable without rewriting their character", () => {
  const legacyCharacter = {
    schemaVersion: 12,
    magic: {
      knownSpellIds: ["magic-missile"],
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
    magic: { knownSpellIds: ["shield"], spellSlots: { 1: { maximum: 1, used: 1 } } }
  };
  assert.equal(
    getCharacterSpellSlotOptions(exhausted, { id: "shield", level: 1 })[0].remaining,
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

test("Rage, special spell uses, legacy Pact use, and concentration replacement are enforced", () => {
  assert.throws(() => applyConfirmedSpellCast(
    { combat: { classFeatureStates: { rageActive: true } } },
    { id: "fire-bolt", name: "Fire Bolt", level: 0 },
    { kind: "cantrip", level: 0 }
  ), /Rage/i);

  const granted = {
    magic: {
      spellSourceModelVersion: 3,
      spellSources: [{
        sourceId: "species:tiefling",
        sourceType: "species",
        sourceName: "Infernal Legacy",
        selectedSpellIds: ["darkness"],
        canUseSpellSlots: false,
        spellRecords: [{
          spellId: "darkness",
          maximumUses: 1,
          currentUses: 1,
          canUseSpellSlots: false,
          recharge: "longRest"
        }]
      }],
      slots: { 2: 2 },
      slotUsage: { normal: { 2: 0 } }
    }
  };
  const specialOptions = getCharacterSpellSlotOptions(granted, {
    id: "darkness",
    name: "Darkness",
    level: 2
  });
  assert.deepEqual(specialOptions.map((option) => option.kind), ["special"]);
  const specialCast = applyConfirmedSpellCast(
    granted,
    { id: "darkness", name: "Darkness", level: 2 },
    specialOptions[0]
  );
  assert.equal(
    specialCast.magic.spellSources[0].spellRecords[0].currentUses,
    0
  );
  assert.equal(specialCast.magic.slotUsage.normal[2], 0);

  const legacyPact = {
    magic: {
      knownSpellIds: ["hex"],
      pactMagic: { slots: 2, slotLevel: 3 },
      slotUsage: { pact: 1 }
    }
  };
  assert.equal(
    getCharacterSpellSlotOptions(legacyPact, { id: "hex", level: 1 })[0].remaining,
    1
  );

  const replacement = applyConfirmedSpellCast(
    {
      magic: { knownSpellIds: ["web"], slots: { 2: 1 }, slotUsage: { normal: { 2: 0 } } },
      combat: { concentration: { spellId: "bless", spellName: "Bless" } }
    },
    { id: "web", name: "Web", level: 2, concentration: true },
    { kind: "normal", level: 2, sourceId: "" }
  );
  assert.equal(replacement.combat.concentration.replacedSpellName, "Bless");
});

test("spellcasting stats use the source that granted a multiclass spell", () => {
  const character = {
    classProgression: [{ level: 5 }, { level: 3 }],
    abilities: { scores: { int: 18, wis: 12 } },
    combat: { proficiencyBonus: 3 },
    magic: {
      spellSaveDc: 99,
      spellAttackBonus: 99,
      spellSources: [{
        sourceId: "wizard-main",
        sourceName: "Wizard",
        spellcastingAbility: "int",
        selectedSpellIds: ["fireball"]
      }]
    }
  };
  const stats = resolveCharacterSpellcastingStats(character, { id: "fireball" });
  assert.equal(stats.ability, "int");
  assert.equal(stats.spellSaveDc, 15);
  assert.equal(stats.spellAttackBonus, 7);
  assert.equal(stats.characterLevel, 8);
});

test("shared multiclass spells expose and enforce an explicit casting source", () => {
  const character = {
    classProgression: [{ level: 5 }, { level: 5 }],
    abilities: { scores: { int: 18, wis: 14 } },
    combat: { proficiencyBonus: 4 },
    magic: {
      slots: { 3: 2 },
      slotUsage: { normal: { 3: 0 } },
      spellSourceModelVersion: SPELL_SOURCE_MODEL_VERSION,
      spellSources: [{
        sourceId: "wizard-main",
        sourceName: "Wizard",
        sourceType: "class",
        classId: "wizard",
        spellcastingAbility: "int",
        selectedSpellIds: ["fireball"],
        spellStates: { fireball: { spellbook: true } }
      }, {
        sourceId: "cleric-main",
        sourceName: "Light Cleric",
        sourceType: "class",
        classId: "cleric",
        spellcastingAbility: "wis",
        selectedSpellIds: ["fireball"],
        spellStates: { fireball: { prepared: true } }
      }]
    }
  };
  const spell = { id: "fireball", name: "Fireball", level: 3 };
  const sources = getCharacterSpellcastingSourceOptions(character, spell);
  assert.deepEqual(sources.map((source) => source.sourceId), ["cleric-main"]);
  const options = getCharacterSpellSlotOptions(character, spell);
  assert.deepEqual(options.map((option) => option.castingSourceId), ["cleric-main"]);
  assert.equal(applyConfirmedSpellCast(character, spell, { kind: "normal", level: 3 }).magic.slotUsage.normal[3], 1);
  const cast = applyConfirmedSpellCast(character, spell, options[0]);
  assert.equal(cast.magic.slotUsage.normal[3], 1);
  assert.throws(
    () => applyConfirmedSpellCast(character, spell, { ...options[0], castingSourceId: "removed-source" }),
    /no longer available/i
  );
});

test("prepared ritual casters cannot ritual-cast an unprepared class spell", () => {
  const cleric = {
    magic: {
      spellSourceModelVersion: SPELL_SOURCE_MODEL_VERSION,
      spellSources: [{
        sourceId: "cleric-main",
        sourceName: "Cleric",
        sourceType: "class",
        classId: "cleric",
        spellcastingAbility: "wis",
        selectedSpellIds: ["detect-magic"],
        spellStates: { "detect-magic": { known: true, prepared: false } }
      }]
    }
  };
  const spell = { id: "detect-magic", name: "Detect Magic", level: 1, ritual: true };
  assert.equal(getCharacterSpellSlotOptions(cleric, spell).some((option) => option.kind === "ritual"), false);
  cleric.magic.spellSources[0].spellStates["detect-magic"].prepared = true;
  assert.equal(getCharacterSpellSlotOptions(cleric, spell).some((option) => option.kind === "ritual"), true);
});

test("monster spell references appear in the normal combat hotbar", () => {
  const model = buildCombatActionBarModel({
    actorKind: "monster",
    actor: {
      spellcasting: {
        enabled: true,
        spells: [
          { id: "monster-fireball", sourceId: "fireball", name: "Fireball", usage: "daily", uses: 1 },
          { id: "monster-misty-step", sourceId: "misty-step", name: "Misty Step", usage: "daily", uses: 1 }
        ]
      }
    }
  });
  assert.equal(model.spells.some((entry) => entry.kind === "monster-spell"), true);
  assert.equal(model.abilities.some((entry) => entry.kind === "monster-spell"), false);
  const mistyStep = model.spells.find((entry) => entry.id === "monster-misty-step");
  assert.equal(mistyStep.resource, "bonus");
  assert.match(mistyStep.raw.range, /self/i);
});

test("monster daily, slot, at-will, concentration, and rest resources are authoritative", () => {
  const monster = {
    name: "Mage",
    spellcasting: {
      enabled: true,
      saveDc: 15,
      attackBonus: 7,
      spells: [
        { id: "at-will", sourceId: "fire-bolt", name: "Fire Bolt", usage: "atWill", level: 0 },
        { id: "daily", sourceId: "misty-step", name: "Misty Step", usage: "daily", uses: 1, level: 2 },
        { id: "slot", sourceId: "fireball", name: "Fireball", usage: "slot", slots: 2, level: 3 }
      ]
    }
  };

  assert.equal(getMonsterSpellAvailability(monster, { id: "at-will" }).remaining, Infinity);
  const dailyCast = applyConfirmedMonsterSpellCast(
    monster,
    { id: "daily" },
    { id: "misty-step", name: "Misty Step", level: 2 }
  );
  assert.equal(getMonsterSpellAvailability(dailyCast, { id: "daily" }).remaining, 0);
  assert.throws(
    () => applyConfirmedMonsterSpellCast(dailyCast, { id: "daily" }, { id: "misty-step" }),
    /No uses/i
  );

  const slotCast = applyConfirmedMonsterSpellCast(
    monster,
    { id: "slot" },
    { id: "fireball", name: "Fireball", level: 3, concentration: true }
  );
  assert.equal(getMonsterSpellAvailability(slotCast, { id: "slot" }).remaining, 1);
  assert.equal(slotCast.spellcasting.concentration.spellName, "Fireball");
  assert.equal(
    getMonsterSpellAvailability(restoreMonsterSpellResources(slotCast, "short"), { id: "slot" }).remaining,
    1
  );
  assert.equal(
    getMonsterSpellAvailability(restoreMonsterSpellResources(slotCast, "long"), { id: "slot" }).remaining,
    2
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

