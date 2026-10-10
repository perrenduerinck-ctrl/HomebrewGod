import assert from "node:assert/strict";
import test from "node:test";

import {
  assertEncounterOperationCurrent,
  buildEncounterBattleResetFields,
  createEncounterOperationContext,
  preflightEncounterReplacement,
  runRecoverableEncounterStaging
} from "../encounters/battleReplacement.js";

test("encounter preflight rejects an unavailable map before staging", () => {
  assert.throws(() => preflightEncounterReplacement({
    map: { content: { url: "" } },
    combatants: []
  }), /map image is unavailable/i);
});

test("failed token staging cleans new tokens and never activates replacement", async () => {
  const staged = [];
  const cleaned = [];
  let activated = false;
  await assert.rejects(runRecoverableEncounterStaging({
    entries: [{ id: "one" }, { id: "two" }],
    stageToken: async (entry) => {
      if (entry.id === "two") throw new Error("second token failed");
      const token = { id: "new-one", activationState: "pending" };
      staged.push(token);
      return token;
    },
    activate: async () => { activated = true; },
    cleanupToken: async (token) => { cleaned.push(token.id); }
  }), /second token failed/);
  assert.equal(activated, false);
  assert.deepEqual(staged.map((token) => token.id), ["new-one"]);
  assert.deepEqual(cleaned, ["new-one"]);
});

test("battle reset clears combat-only state while preserving world time", () => {
  const fields = buildEncounterBattleResetFields({
    worldTime: 123456,
    timeMode: "combat",
    combatStartedAt: 123000,
    combatRoundsCompleted: 76,
    movementState: {
      combatActive: true,
      activeTokenId: "old-token",
      baseSpeed: 30,
      movementRemaining: 10
    }
  }, [{ tokenId: "new-token", name: "New" }]);
  assert.equal(fields.worldTime, 123456);
  assert.equal(fields.timeMode, "exploration");
  assert.equal(fields.combatRoundsCompleted, 0);
  assert.equal(fields.movementState.combatActive, false);
  assert.equal(fields.initiativeState.combatActive, false);
  assert.equal(fields.initiativeState.initiativeOrder[0].tokenId, "new-token");
});

test("room/account changes invalidate an in-flight encounter operation", () => {
  const context = createEncounterOperationContext({
    roomCode: "room-a",
    roomData: { dmUid: "dm-1" },
    userId: "dm-1",
    isDm: true,
    operationId: "operation-1"
  });
  assert.equal(assertEncounterOperationCurrent(context, {
    roomCode: "ROOM-A", userId: "dm-1", isDm: true
  }), true);
  assert.throws(() => assertEncounterOperationCurrent(context, {
    roomCode: "ROOM-B", userId: "dm-1", isDm: true
  }), /original battle was left in place/i);
});
