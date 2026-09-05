import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  applyInitiativeCommand,
  createInitiativeSystem,
  normalizeInitiativeState,
  sortInitiativeOrder,
  toRoomInitiativeFields
} from "../combat/initiativeSystem.js";
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

test("removing the last active combatant safely wraps to the first remaining entry", async () => {
  const system = await encounterWith(3);
  await system.startCombat();
  await system.nextTurn();
  await system.nextTurn();
  await system.removeCombatant("c3");
  assert.equal(system.getState().currentCombatantId, "c1");
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
});
