import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSummonPlacements,
  normalizeSummonAutomation,
  summonEffectDuration
} from "../vfx/summonAutomation.js";
import { createTokenAutomation } from "../vfx/tokenAutomation.js";
import { createCombatPresentationSystem } from "../vfx/combatPresentationSystem.js";

test("summon settings normalize every requested control and remain bounded", () => {
  const summon = normalizeSummonAutomation({
    sourceType: "monster", sourceId: "wolf", spawnLocation: "around-caster",
    count: 99, spawnTiming: "event", eventName: "summon-now",
    ownership: { mode: "player", playerUid: "player-2" }, initiative: "shared",
    duration: { mode: "rounds", value: 3 },
    onEnd: { mode: "dismiss", dismissAnimationId: "poof" },
    placement: { preventOverlap: true, nearestFree: true, allowDmOverride: false }
  });
  assert.equal(summon.sourceType, "monster");
  assert.equal(summon.sourceId, "wolf");
  assert.equal(summon.count, 20);
  assert.equal(summon.spawnLocation, "around-caster");
  assert.equal(summon.ownership.playerUid, "player-2");
  assert.equal(summon.initiative, "shared");
  assert.deepEqual(summonEffectDuration(summon), { unit: "rounds", value: 3, concentration: false });
  assert.equal(summon.onEnd.dismissAnimationId, "poof");
  assert.equal(summon.placement.allowDmOverride, false);
  assert.equal(summonEffectDuration({ duration: { mode: "concentration" } }).concentration, true);
  assert.equal(summonEffectDuration({ duration: { mode: "permanent" } }), null);
});

test("automatic placement creates up to twenty non-overlapping nearest squares", () => {
  const placements = buildSummonPlacements({
    count: 20,
    spawnLocation: "target",
    placement: { preventOverlap: true, nearestFree: true, allowDmOverride: false }
  }, {
    target: { x: 50, y: 50, mapMode: "single" },
    tokens: [{ x: 50, y: 50, mapMode: "single" }],
    grid: { xPercent: 5, yPercent: 5 }
  });
  assert.equal(placements.length, 20);
  assert.equal(new Set(placements.map((entry) => `${entry.x}:${entry.y}`)).size, 20);
  assert.ok(!placements.some((entry) => entry.x === 50 && entry.y === 50));
  assert.deepEqual(buildSummonPlacements({ count: 3, spawnLocation: "manual" }), []);
});

test("token automation batches placements and preserves runtime policies", async () => {
  const created = [], initiative = [];
  const automation = createTokenAutomation({
    canMutate: () => true,
    requestPlacements: async () => [{ x: 10, y: 20 }, { x: 20, y: 20 }],
    createToken: async (command) => {
      const token = { id: `token-${created.length + 1}`, ...command };
      created.push(token); return token;
    },
    afterSummon: async (results, summon) => initiative.push({ results, summon })
  });
  const results = await automation.execute({ summon: {
    sourceType: "character", sourceId: "hero", spawnLocation: "manual", count: 2,
    ownership: { mode: "caster" }, initiative: "after-caster",
    duration: { mode: "minutes", value: 10 }, onEnd: { mode: "remove" }
  } }, { source: { id: "caster", ownerUid: "player-1" }, effectId: "effect-1" });
  assert.equal(results.filter((entry) => entry.ok).length, 2);
  assert.deepEqual(created.map((entry) => [entry.x, entry.y]), [[10, 20], [20, 20]]);
  assert.equal(created[0].sourceId, "hero");
  assert.equal(created[0].casterOwnerUid, "player-1");
  assert.equal(initiative.length, 1);
});

test("summons run at animation start, named events, or animation end", async () => {
  const player = {
    prepareAnimation: async () => true,
    async playAnimation(_id, options) {
      options.onEvent?.({ type: "summon-now" });
      return {
        ok: true, cancel() {}, pause() {}, resume() {},
        arrived: Promise.resolve("arrived"), impacted: Promise.resolve("impact"),
        finished: Promise.resolve("completed"), instances: []
      };
    }
  };
  for (const [timing, eventName, expected] of [
    ["start", "impact", "animation-start"],
    ["event", "summon-now", "summon-now"],
    ["end", "impact", "animation-end"]
  ]) {
    const triggers = [];
    const system = createCombatPresentationSystem({
      player,
      library: { getAnimation: () => ({ id: "hit" }) },
      onAutomation: async ({ trigger }) => { triggers.push(trigger.type); return []; }
    });
    const result = await system.play({
      animation: {
        family: "magic", stages: { impact: "hit" },
        automation: { summon: { spawnTiming: timing, eventName } }
      },
      source: { x: 0, y: 0 }, target: { x: 10, y: 10 }, commit: () => true
    });
    await result.committed; await result.finished; await result.automationReady;
    assert.deepEqual(triggers, [expected]);
  }
});
