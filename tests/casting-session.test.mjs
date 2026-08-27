import assert from "node:assert/strict";
import test from "node:test";

import {
  createCastResolution,
  createSpellCastingSession
} from "../battleMap/castingSession.js";
import {
  getDefaultSpellById
} from "../data/defaultSpells.js";
import {
  applyGameplayAction,
  ensureGameplayState
} from "../characterSheet/gameplayState.js";

test("previewing and cancellation never spend a spell slot", async () => {
  let confirmations = 0;
  const session = createSpellCastingSession({
    onConfirm: () => {
      confirmations += 1;
      return true;
    }
  });

  session.begin({
    spell: getDefaultSpellById("fireball"),
    characterId: "wizard-1",
    characterName: "Aster",
    casterToken: {
      id: "token-1",
      name: "Aster"
    },
    slotOptions: [{
      kind: "normal",
      level: 3,
      sourceId: "",
      remaining: 1
    }]
  });
  session.updateTarget({
    locked: false,
    validRange: true,
    distanceFeet: 80,
    affectedTokens: [{
      id: "goblin-1",
      name: "Goblin"
    }]
  });

  assert.equal(confirmations, 0);
  assert.equal(
    session.getState().phase,
    "previewing"
  );
  session.cancel();
  assert.equal(confirmations, 0);
  assert.equal(
    session.getState().phase,
    "cancelled"
  );
});

test("only a locked in-range target can confirm and spend a slot", async () => {
  const spent = [];
  const session = createSpellCastingSession({
    onConfirm: ({ slot }) => {
      spent.push(slot);
      return {
        saved: true
      };
    }
  });

  session.begin({
    spell: getDefaultSpellById("fireball"),
    characterId: "wizard-1",
    slotOptions: [{
      kind: "normal",
      level: 4,
      sourceId: "",
      label: "Level 4 slot",
      remaining: 1
    }],
    spellSaveDc: 15
  });
  session.updateTarget({
    locked: true,
    validRange: false,
    distanceFeet: 155,
    affectedTokens: []
  });

  const invalid = await session.confirm({
    kind: "normal",
    level: 4,
    sourceId: ""
  });
  assert.equal(invalid.ok, false);
  assert.equal(spent.length, 0);

  session.updateTarget({
    locked: true,
    validRange: true,
    distanceFeet: 85,
    affectedTokens: [{
      id: "goblin-1",
      name: "Goblin"
    }]
  });
  const confirmed = await session.confirm({
    kind: "normal",
    level: 4,
    sourceId: ""
  });

  assert.equal(confirmed.ok, true);
  assert.equal(spent.length, 1);
  assert.equal(spent[0].level, 4);
  assert.equal(
    confirmed.resolution.damage[0],
    "9d6 fire"
  );
  assert.deepEqual(
    confirmed.resolution.save,
    {
      ability: "dex",
      dc: 15,
      success: "half"
    }
  );
  assert.equal(
    confirmed.resolution
      .affectedTokens[0].name,
    "Goblin"
  );
});

test("failed persistence returns to target-selected without consuming resources", async () => {
  let confirmedEvents = 0;
  const session = createSpellCastingSession({
    onConfirm: () => false,
    onConfirmed: () => {
      confirmedEvents += 1;
    }
  });

  session.begin({
    spell: getDefaultSpellById(
      "burning-hands"
    ),
    slotOptions: [{
      kind: "normal",
      level: 1,
      sourceId: "",
      remaining: 1
    }]
  });
  session.updateTarget({
    locked: true,
    validRange: true
  });
  const result = await session.confirm({
    kind: "normal",
    level: 1,
    sourceId: ""
  });

  assert.equal(result.ok, false);
  assert.equal(
    session.getState().phase,
    "target-selected"
  );
  assert.match(
    session.getState().confirmationError,
    /no resource was spent/i
  );
  assert.equal(confirmedEvents, 0);
});

test("presentation runs once after confirmation and cannot break the cast", async () => {
  const calls = [];
  const session = createSpellCastingSession({
    onConfirm: () => ({ saved: true }),
    onConfirmed: (confirmed) => {
      calls.push(confirmed);
      throw new Error("expected presentation failure");
    }
  });

  session.begin({
    spell: getDefaultSpellById("burning-hands"),
    characterId: "wizard-1",
    casterToken: { id: "wizard-token" },
    slotOptions: [{
      kind: "normal",
      level: 1,
      sourceId: "",
      remaining: 1
    }]
  });
  session.updateTarget({
    locked: false,
    validRange: true
  });
  assert.equal(calls.length, 0);
  session.updateTarget({
    locked: true,
    validRange: true,
    geometry: {
      shape: "cone"
    }
  });
  assert.equal(calls.length, 0);

  const result = await session.confirm({
    kind: "normal",
    level: 1,
    sourceId: ""
  });

  assert.equal(result.ok, true);
  assert.equal(result.state.phase, "confirmed");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].state.phase, "confirmed");
  assert.equal(calls[0].spell.id, "burning-hands");
  assert.equal(calls[0].casterToken.id, "wizard-token");

  const repeated = await session.confirm({
    kind: "normal",
    level: 1,
    sourceId: ""
  });
  assert.equal(repeated.ok, false);
  assert.equal(calls.length, 1);
});

test("resolution reports concentration and attack/save mechanics without rolling", () => {
  const resolution = createCastResolution({
    spell: {
      id: "test-ray",
      name: "Test Ray",
      level: 2,
      concentration: true,
      targeting: {
        attack: {
          type: "ranged"
        }
      },
      damage: [{
        dice: "3d8",
        damageType: "radiant"
      }]
    },
    slotLevel: 2,
    spellAttackBonus: 7
  });

  assert.deepEqual(
    resolution.attack,
    {
      type: "ranged",
      bonus: 7
    }
  );
  assert.deepEqual(
    resolution.damage,
    ["3d8 radiant"]
  );
  assert.equal(
    resolution.concentration,
    true
  );
});

test("active concentration is normalized and can be ended explicitly", () => {
  const character = {
    combat: {
      maxHp: 20,
      currentHp: 20,
      concentration: {
        spellId: "web",
        spellName: "Web",
        startedAtMillis: 42
      }
    }
  };

  const combat = ensureGameplayState(
    character
  );
  assert.equal(
    combat.concentration.spellName,
    "Web"
  );

  const result = applyGameplayAction(
    character,
    {
      type: "end-concentration"
    }
  );
  assert.equal(result.changed, true);
  assert.equal(
    character.combat.concentration,
    null
  );
  assert.match(
    result.message,
    /Web ended/i
  );
});
