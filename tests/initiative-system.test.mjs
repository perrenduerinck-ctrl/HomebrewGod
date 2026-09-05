import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  applyInitiativeCommand,
  createInitiativeSystem,
  normalizeInitiativeState,
  prepareInitiativeCommand,
  sortInitiativeOrder,
  toRoomInitiativeFields
} from "../combat/initiativeSystem.js";
import {
  buildInitiativeRoomTransition,
  reconcileInitiativeTimeState
} from "../combat/initiativeTimeIntegration.js";
import { createTokenSystem } from "../tokens/index.js";
import {
  DAY_PHASES,
  getCrossedTimeBoundaries,
  getDayPhase,
  getPhaseProgress
} from "../timeOfDay.js";
import {
  COMBAT_ROUND_SECONDS,
  DAY,
  HOUR,
  TIME_MODES,
  createTimeSystem,
  getTimeComponents
} from "../timeSystem.js";
import {
  getMapVariantUrl,
  normalizeMapTimeVariants
} from "../battleMap/mapLighting.js";

function combatant(id, initiative, bonus = 0) {
  return {
    tokenId: id,
    name: `Combatant ${id}`,
    tokenType: id.startsWith("p") ? "player" : "enemy",
    initiativeRoll: initiative - bonus,
    initiativeBonus: bonus,
    totalInitiative: initiative,
    dexterity: 10 + (bonus * 2),
    ownerUid: id.startsWith("p") ? `owner-${id}` : null
  };
}

async function encounterWith(count, options = {}) {
  const system = createInitiativeSystem(options);
  for (let index = 0; index < count; index += 1) {
    await system.addCombatant(
      combatant(`c${index + 1}`, count - index)
    );
  }
  return system;
}

function createTokenTestSystem(options = {}) {
  return createTokenSystem({
    autoInit: false,
    serverTimestamp: () => "timestamp",
    ...options
  });
}

test("linked character tokens use canonical initiative and owner data when rolled", async () => {
  const tokens = createTokenTestSystem();
  const token = {
    id: "hero-token",
    type: "player",
    ...tokens.buildCharacterLinkedTokenPatch(
      {
        id: "hero-sheet",
        ownerUid: "player-7",
        identity: {
          name: "Quick Hero"
        },
        abilities: {
          scores: {
            dex: 14
          }
        },
        combat: {
          maxHp: 20,
          currentHp: 20,
          armorClass: 15,
          initiative: 7,
          initiativeBonus: 1
        }
      },
      {}
    )
  };
  const initiative = createInitiativeSystem({
    rollDie: () => 11
  });

  await initiative.addToken(token);
  await initiative.rollInitiative();
  const combatant =
    initiative.getState().initiativeOrder[0];

  assert.equal(token.dexterity, 14);
  assert.equal(token.initiativeBonus, 7);
  assert.equal(combatant.initiativeBonus, 7);
  assert.equal(combatant.totalInitiative, 18);
  assert.equal(combatant.ownerUid, "player-7");
});

test("linked monster tokens use actual Dexterity and owner data when rolled", async () => {
  const tokens = createTokenTestSystem();
  const token = {
    id: "wolf-token",
    type: "enemy",
    ...tokens.buildMonsterLinkedTokenPatch(
      {
        id: "wolf-sheet",
        name: "Dire Wolf",
        ownerUid: "dm-1",
        hp: 37,
        ac: 14,
        abilities: {
          dex: 18
        }
      },
      {}
    )
  };
  const initiative = createInitiativeSystem({
    rollDie: () => 9
  });

  await initiative.addToken(token);
  await initiative.rollInitiative();
  const combatant =
    initiative.getState().initiativeOrder[0];

  assert.equal(token.dexterity, 18);
  assert.equal(token.initiativeBonus, 4);
  assert.equal(combatant.initiativeBonus, 4);
  assert.equal(combatant.totalInitiative, 13);
  assert.equal(combatant.ownerUid, "dm-1");
});

test("initiative sorts highest to lowest and preserves stable tie order", () => {
  const sorted = sortInitiativeOrder([
    combatant("low", 4),
    combatant("tie-a", 18),
    combatant("high", 22),
    combatant("tie-b", 18)
  ]);
  assert.deepEqual(
    sorted.map((entry) => entry.tokenId),
    ["high", "tie-a", "tie-b", "low"]
  );
});

test("manual initiative values work and editable values re-sort", async () => {
  const system = await encounterWith(3);
  await system.setInitiative("c3", 30);
  const state = system.getState();
  assert.equal(state.initiativeOrder[0].tokenId, "c3");
  assert.equal(state.initiativeOrder[0].initiativeRoll, null);
  assert.equal(state.initiativeOrder[0].totalInitiative, 30);
});

test("current turn advances and previous turn reverses an accidental advance", async () => {
  const system = await encounterWith(3);
  await system.startCombat();
  assert.equal(system.getState().currentCombatantId, "c1");
  await system.nextTurn();
  assert.equal(system.getState().currentCombatantId, "c2");
  await system.previousTurn();
  assert.equal(system.getState().currentCombatantId, "c1");
});

test("initiative wraps from last to first and starts exactly one new round", async () => {
  let completedRounds = 0;
  const system = await encounterWith(3, {
    onRoundComplete() {
      completedRounds += 1;
    }
  });
  await system.startCombat();
  await system.nextTurn();
  await system.nextTurn();
  assert.equal(system.getState().roundNumber, 1);
  await system.nextTurn();
  assert.equal(system.getState().roundNumber, 2);
  assert.equal(system.getState().currentCombatantId, "c1");
  assert.equal(completedRounds, 1);
});

test("one full initiative round advances campaign time exactly six seconds", async () => {
  const clock = createTimeSystem({
    initialState: { worldTime: 12 * HOUR }
  });
  const system = await encounterWith(4, {
    onCombatStart: () => clock.startCombatTime(),
    onRoundComplete: () => clock.advanceCombatRound(),
    onCombatEnd: () => clock.endCombatTime()
  });
  await system.startCombat();
  for (let turn = 0; turn < 4; turn += 1) {
    await system.nextTurn();
  }
  assert.equal(clock.getWorldTime(), (12 * HOUR) + 6);
  assert.equal(clock.getCombatRound(), 2);
});

test("previous turn after a wrap fully undoes the accidental round advance", async () => {
  const clock = createTimeSystem();
  const system = await encounterWith(2, {
    onCombatStart: () => clock.startCombatTime(),
    onRoundComplete: () => clock.advanceCombatRound(),
    onRoundRevert: () => clock.rewindCombatRound()
  });
  await system.startCombat();
  await system.nextTurn();
  await system.nextTurn();
  assert.equal(clock.getWorldTime(), 6);
  assert.equal(system.getState().roundNumber, 2);
  await system.previousTurn();
  assert.equal(clock.getWorldTime(), 0);
  assert.equal(clock.getCombatRound(), 1);
  assert.equal(system.getState().roundNumber, 1);
  assert.equal(system.getState().currentCombatantId, "c2");
});

for (const count of [10, 20]) {
  test(`${count} combatants still advance only six seconds after all turns`, async () => {
    const clock = createTimeSystem();
    const system = await encounterWith(count, {
      onCombatStart: () => clock.startCombatTime(),
      onRoundComplete: () => clock.advanceCombatRound()
    });
    await system.startCombat();
    for (let turn = 0; turn < count - 1; turn += 1) {
      await system.nextTurn();
      assert.equal(clock.getWorldTime(), 0);
    }
    await system.nextTurn();
    assert.equal(clock.getWorldTime(), COMBAT_ROUND_SECONDS);
  });
}

test("removing the active combatant selects the logical next turn without corruption", async () => {
  const system = await encounterWith(4);
  await system.startCombat();
  await system.nextTurn();
  assert.equal(system.getState().currentCombatantId, "c2");
  await system.removeCombatant("c2");
  const state = system.getState();
  assert.equal(state.currentCombatantId, "c3");
  assert.equal(state.currentTurnIndex, 1);
  assert.equal(state.initiativeOrder.length, 3);
});

test("removing the final active combatant completes the round and advances six seconds", async () => {
  const clock = createTimeSystem();
  const system = await encounterWith(3, {
    onCombatStart: () => clock.startCombatTime(),
    onRoundComplete: () => clock.advanceCombatRound()
  });
  await system.startCombat();
  await system.nextTurn();
  await system.nextTurn();
  await system.removeCombatant("c3");
  assert.equal(system.getState().currentCombatantId, "c1");
  assert.equal(system.getState().roundNumber, 2);
  assert.equal(clock.getWorldTime(), 6);
});

test("deleting the active final map token cannot leave initiative invalid or stuck", async () => {
  const clock = createTimeSystem();
  const initiative = await encounterWith(3, {
    onCombatStart: () => clock.startCombatTime(),
    onRoundComplete: () => clock.advanceCombatRound()
  });
  await initiative.startCombat();
  await initiative.nextTurn();
  await initiative.nextTurn();

  const deleted = [];
  const tokens = createTokenTestSystem({
    getCurrentRoomCode: () => "ROOM",
    getCurrentIsDM: () => true,
    doc: (...parts) => parts.join("/"),
    deleteDoc: async (reference) => {
      deleted.push(reference);
    },
    removeTokenFromInitiative: async (tokenId) => {
      const isPresent = initiative
        .getState()
        .initiativeOrder
        .some((entry) => entry.tokenId === tokenId);
      if (isPresent) {
        await initiative.removeCombatant(tokenId);
      }
    }
  });
  const originalConfirm = globalThis.confirm;
  globalThis.confirm = () => true;
  try {
    await tokens.deleteToken("c3");
  } finally {
    globalThis.confirm = originalConfirm;
  }

  const state = initiative.getState();
  assert.deepEqual(
    state.initiativeOrder.map((entry) => entry.tokenId),
    ["c1", "c2"]
  );
  assert.equal(state.currentCombatantId, "c1");
  assert.equal(state.currentTurnIndex, 0);
  assert.equal(state.roundNumber, 2);
  assert.equal(clock.getWorldTime(), 6);
  assert.equal(deleted.length, 1);
});

test("initiative rolls are generated once and remain deterministic across persistence retries", async () => {
  let rollCalls = 0;
  let persistedCommand = null;
  const system = createInitiativeSystem({
    rollDie: () => {
      rollCalls += 1;
      return rollCalls === 1 ? 17 : 8;
    },
    commit(command, context) {
      if (command.type !== "roll-initiative") {
        return context.previewState;
      }
      persistedCommand = command;
      const failIfRerolled = () => {
        throw new Error(
          "A transaction retry attempted another roll."
        );
      };
      const firstAttempt = applyInitiativeCommand(
        context.previousState,
        command,
        { rollDie: failIfRerolled }
      );
      const retryAttempt = applyInitiativeCommand(
        context.previousState,
        command,
        { rollDie: failIfRerolled }
      );
      assert.deepEqual(retryAttempt, firstAttempt);
      return retryAttempt;
    }
  });
  await system.addCombatant(combatant("a", 0, 2));
  await system.addCombatant(combatant("b", 0, 1));
  await system.rollInitiative();

  assert.equal(rollCalls, 2);
  assert.deepEqual(
    persistedCommand.rollsByTokenId,
    { a: 17, b: 8 }
  );
  assert.equal(
    system.getState().initiativeOrder
      .find((entry) => entry.tokenId === "a")
      .totalInitiative,
    19
  );
});

test("prepared initiative rolls can be reused without touching randomness", () => {
  const state = {
    initiativeOrder: [combatant("fixed", 0, 3)]
  };
  const command = prepareInitiativeCommand(
    state,
    { type: "roll-initiative" },
    { rollDie: () => 12 }
  );
  const result = applyInitiativeCommand(
    {
      initiativeOrder: [
        ...state.initiativeOrder,
        combatant("late-retry-entry", 6, 1)
      ]
    },
    command,
    {
      rollDie: () => {
        throw new Error("Unexpected reroll");
      }
    }
  );
  assert.equal(
    result.state.initiativeOrder
      .find((entry) => entry.tokenId === "fixed")
      .totalInitiative,
    15
  );
  assert.equal(
    result.state.initiativeOrder
      .find((entry) =>
        entry.tokenId === "late-retry-entry"
      )
      .totalInitiative,
    6
  );
});

test("initiative round and campaign seconds are composed as one room transition", () => {
  const room = {
    worldTime: 100,
    timeMode: TIME_MODES.EXPLORATION,
    initiativeState: {
      combatActive: true,
      roundNumber: 1,
      initiativeOrder: [
        combatant("goblin", 20),
        combatant("wolf", 10)
      ],
      currentTurnIndex: 1,
      currentCombatantId: "wolf"
    }
  };
  const transition = buildInitiativeRoomTransition(
    room,
    { type: "next-turn" }
  );

  assert.equal(
    transition.roomFields.initiativeState
      .roundNumber,
    2
  );
  assert.equal(transition.roomFields.worldTime, 106);
  assert.equal(
    transition.roomFields.combatRoundsCompleted,
    1
  );
  assert.equal(
    transition.roomFields.timeMode,
    TIME_MODES.COMBAT
  );
  assert.equal(room.worldTime, 100);
  assert.equal(
    room.initiativeState.roundNumber,
    1
  );
});

test("initiative time reconciliation repairs a mismatched room through canonical time commands", () => {
  const reconciled = reconcileInitiativeTimeState(
    {
      worldTime: 600,
      timeMode: TIME_MODES.COMBAT,
      combatStartedAt: 570,
      combatRoundsCompleted: 0
    },
    {
      combatActive: true,
      roundNumber: 4,
      initiativeOrder: [combatant("a", 10)],
      currentTurnIndex: 0,
      currentCombatantId: "a"
    }
  );

  assert.equal(reconciled.worldTime, 618);
  assert.equal(reconciled.combatRoundsCompleted, 3);
});

test("adding a creature mid-combat preserves round and current combatant", async () => {
  const system = await encounterWith(3);
  await system.startCombat();
  await system.nextTurn();
  await system.addCombatant(combatant("late", 99));
  const state = system.getState();
  assert.equal(state.roundNumber, 1);
  assert.equal(state.currentCombatantId, "c2");
  assert.equal(state.initiativeOrder[0].tokenId, "late");
});

test("DM can manually resolve ties without changing initiative values", async () => {
  const system = createInitiativeSystem();
  await system.addCombatant(combatant("a", 15));
  await system.addCombatant(combatant("b", 15));
  await system.moveTie("b", "up");
  assert.deepEqual(
    system.getState().initiativeOrder.map((entry) => entry.tokenId),
    ["b", "a"]
  );
});

test("refresh and rejoin restore the authoritative active turn and round", async () => {
  const dm = await encounterWith(3);
  await dm.startCombat();
  await dm.nextTurn();
  await dm.nextTurn();
  await dm.nextTurn();
  await dm.nextTurn();
  const room = {
    roomName: "Persisted encounter",
    ...toRoomInitiativeFields(dm.getState())
  };
  const player = createInitiativeSystem({
    initialState: room,
    canMutate: () => false
  });
  assert.deepEqual(player.getState(), dm.getState());
  assert.equal(player.getState().roundNumber, 2);
  assert.equal(player.getState().currentCombatantId, "c2");
});

test("only the DM can mutate initiative while players can apply snapshots", async () => {
  let isDm = false;
  const system = createInitiativeSystem({
    canMutate: () => isDm
  });
  system.applyRoomSnapshot({
    initiativeState: {
      initiativeOrder: [combatant("visible", 12)]
    }
  });
  assert.equal(system.getState().initiativeOrder.length, 1);
  await assert.rejects(
    system.addCombatant(combatant("blocked", 8)),
    (error) => error.code === "initiative/permission-denied"
  );
  isDm = true;
  await system.addCombatant(combatant("allowed", 8));
  assert.equal(system.getState().initiativeOrder.length, 2);
});

test("starting and ending initiative start and end combat time without extra seconds", async () => {
  const clock = createTimeSystem({
    initialState: { worldTime: 1234 }
  });
  const system = await encounterWith(1, {
    onCombatStart: () => clock.startCombatTime(),
    onCombatEnd: () => clock.endCombatTime()
  });
  await system.startCombat();
  assert.equal(clock.getTimeMode(), TIME_MODES.COMBAT);
  assert.equal(clock.getWorldTime(), 1234);
  await system.endCombat();
  assert.equal(clock.getTimeMode(), TIME_MODES.EXPLORATION);
  assert.equal(clock.getWorldTime(), 1234);
});

test("pure initiative commands report a round completion only on wrap", () => {
  let state = normalizeInitiativeState({
    initiativeState: {
      combatActive: true,
      roundNumber: 1,
      initiativeOrder: [combatant("a", 2), combatant("b", 1)],
      currentTurnIndex: 0,
      currentCombatantId: "a"
    }
  });
  let result = applyInitiativeCommand(state, { type: "next-turn" });
  assert.deepEqual(result.effects, []);
  result = applyInitiativeCommand(result.state, { type: "next-turn" });
  assert.deepEqual(result.effects, ["round-completed"]);
});

test("time of day detects Dawn, Day, Dusk, and Night with useful progress", () => {
  assert.equal(getDayPhase(5 * HOUR), DAY_PHASES.DAWN);
  assert.equal(getDayPhase(8 * HOUR), DAY_PHASES.DAY);
  assert.equal(getDayPhase(18 * HOUR), DAY_PHASES.DUSK);
  assert.equal(getDayPhase(21 * HOUR), DAY_PHASES.NIGHT);
  assert.equal(getDayPhase(2 * HOUR), DAY_PHASES.NIGHT);
  assert.equal(getPhaseProgress(5 * HOUR), 0);
  assert.equal(getPhaseProgress(8 * HOUR), 0);
  assert.ok(getPhaseProgress(19 * HOUR) > 0);
});

test("crossing 18:00 detects Day to Dusk immediately", () => {
  const boundaries = getCrossedTimeBoundaries(
    (17 * HOUR) + (55 * 60),
    (18 * HOUR) + (55 * 60)
  );
  assert.equal(boundaries.length, 1);
  assert.equal(boundaries[0].fromPhase, DAY_PHASES.DAY);
  assert.equal(boundaries[0].toPhase, DAY_PHASES.DUSK);
  assert.equal(boundaries[0].worldTime, 18 * HOUR);
});

test("crossing midnight advances campaign day without breaking the clock", async () => {
  const clock = createTimeSystem({
    initialState: { worldTime: DAY - 300 }
  });
  const boundaries = getCrossedTimeBoundaries(
    clock.getWorldTime(),
    clock.getWorldTime() + 600
  );
  await clock.advanceMinutes(10);
  const current = getTimeComponents(clock.getState());
  assert.equal(current.day, 2);
  assert.equal(current.hour, 0);
  assert.equal(current.minute, 5);
  assert.equal(boundaries.some((entry) => entry.kind === "day"), true);
});

test("optional map variants select by phase and always fall back to the base map", () => {
  const map = {
    url: "base.webp",
    timeVariants: {
      dawn: "dawn.webp",
      NIGHT: "night.webp"
    },
    duskUrl: "dusk.webp"
  };
  assert.deepEqual(normalizeMapTimeVariants(map), {
    dawn: "dawn.webp",
    dusk: "dusk.webp",
    night: "night.webp"
  });
  assert.equal(getMapVariantUrl(map, DAY_PHASES.DAWN), "dawn.webp");
  assert.equal(getMapVariantUrl(map, DAY_PHASES.DAY), "base.webp");
  assert.equal(getMapVariantUrl(map, DAY_PHASES.NIGHT), "night.webp");
});

test("room integration reuses one listener and disables manual round completion", async () => {
  const [appSource, indexSource, styleSource] = await Promise.all([
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../assets/styles/app.css", import.meta.url), "utf8")
  ]);
  assert.match(
    appSource,
    /campaignTimeSystem\.applyRoomSnapshot\(\s*room[\s\S]{0,120}initiativeSystem\.applyRoomSnapshot\(\s*room/
  );
  assert.match(appSource, /initiativeCombatActive/);
  assert.match(
    appSource,
    /!isCombat \|\| initiativeCombatActive/
  );
  assert.match(indexSource, /id="battleInitiativePanel"/);
  assert.match(styleSource, /pointer-events: none !important/);
  assert.doesNotMatch(
    appSource,
    /setInterval\([\s\S]{0,200}(?:initiative|dayPhase|mapLighting)/
  );
  assert.match(
    appSource,
    /buildInitiativeRoomTransition\([\s\S]{0,500}transaction\.update\(roomRef, \{[\s\S]{0,120}committedTransition\.roomFields/
  );
});
