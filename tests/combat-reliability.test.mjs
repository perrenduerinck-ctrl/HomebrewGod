import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createCombatPresentationSystem
} from "../vfx/combatPresentationSystem.js";
import {
  createCombatEffectLifecycle,
  getCombatEffectEndReason
} from "../vfx/combatEffectLifecycle.js";
import { createCombatEffectPersistence } from "../vfx/combatEffectPersistence.js";
import {
  buildCombatPresentationSteps,
  resolveMonsterMultiattackSequence,
  selectCombatTargets
} from "../combat/combatActionPlan.js";
import {
  normalizeMonsterRecord
} from "../monsters/creator.js";
import {
  buildTransformationRestorePatch,
  createTokenSystem,
  isMatchingAutomationSummon
} from "../tokens/index.js";

const definitions = new Set(["cast", "travel", "impact", "sustain", "end"]);

function createImmediatePlayer(events = []) {
  return {
    async prepareAnimation() { return true; },
    async playAnimation(animationId, options = {}) {
      events.push(animationId);
      if (animationId === "travel") options.onEvent?.({ type: "arrived" });
      if (animationId === "impact") options.onEvent?.({ type: "impact" });
      return {
        ok: true,
        cancel() {},
        pause() {},
        resume() {},
        finished: Promise.resolve("completed"),
        arrived: Promise.resolve("arrived"),
        impacted: Promise.resolve("impact"),
        instances: []
      };
    }
  };
}

async function playStages(stages, options = {}) {
  let commits = 0;
  const events = [];
  const system = createCombatPresentationSystem({
    player: createImmediatePlayer(events),
    library: { getAnimation: (id) => definitions.has(id) ? { id } : null }
  });
  const result = await system.play({
    animation: { family: "magic", stages, duration: options.duration },
    source: { id: "source", x: 0, y: 0 },
    target: { id: "target", x: 10, y: 10 },
    targets: [{ id: "target", x: 10, y: 10 }],
    manageDurationExternally: Boolean(options.duration),
    presentationOnly: options.presentationOnly === true,
    commit: () => { commits += 1; }
  });
  await result.committed;
  return { result, commits, events };
}

test("Cast-only and Cast + Sustain commit immediately and exactly once", async () => {
  const castOnly = await playStages({ cast: "cast" });
  assert.equal(castOnly.commits, 1);
  assert.equal(await castOnly.result.impactReady, "stage");

  const castSustain = await playStages(
    { cast: "cast", sustain: "sustain", end: "end" },
    { duration: { unit: "manual", value: 1 } }
  );
  assert.equal(castSustain.commits, 1);
  castSustain.result.end();
  await castSustain.result.finished;
  assert.deepEqual(castSustain.events, ["cast", "sustain", "end"]);
});

test("Travel/Impact and full stage sequences retain one impact commit", async () => {
  for (const stages of [
    { travel: "travel", impact: "impact" },
    { cast: "cast", travel: "travel", impact: "impact" },
    { cast: "cast", travel: "travel", impact: "impact", sustain: "sustain", end: "end" }
  ]) {
    const duration = stages.sustain ? { unit: "manual", value: 1 } : null;
    const playback = await playStages(stages, { duration });
    assert.equal(playback.commits, 1);
    if (duration) playback.result.end();
    await playback.result.finished;
  }
});

test("presentation-only playback never commits gameplay or automation", async () => {
  const playback = await playStages({ cast: "cast" }, { presentationOnly: true });
  assert.equal(playback.commits, 0);
  assert.equal(await playback.result.committed, false);
  assert.deepEqual(await playback.result.automationReady, []);
});

test("melee, ranged, magic, all, chain, self and single targeting preserve semantics", () => {
  const source = { id: "source" };
  const selected = [{ id: "a" }, { id: "b" }, { id: "c" }];
  for (const family of ["melee", "ranged", "magic"]) {
    assert.deepEqual(selectCombatTargets("single", source, selected).map((x) => x.id), ["a"], family);
  }
  assert.deepEqual(selectCombatTargets("all", source, selected).map((x) => x.id), ["a", "b", "c"]);
  assert.deepEqual(selectCombatTargets("chain", source, selected).map((x) => x.id), ["a", "b", "c"]);
  assert.deepEqual(selectCombatTargets("self", source, selected).map((x) => x.id), ["source"]);
});

test("Multiattack wrapper is presentation-only and explicit counts expand correctly", () => {
  const monster = {
    actions: [
      { id: "bite-id", name: "Bite" },
      { id: "claw-id", name: "Claw" }
    ],
    actionAnimations: {
      "bite-id": { animation: { family: "melee", stages: { impact: "impact" } } },
      "claw-id": { animation: { family: "melee", stages: { impact: "impact" } } }
    }
  };
  const children = resolveMonsterMultiattackSequence({
    sequence: [{ actionId: "bite-id", count: 1 }, { actionId: "claw-id", count: 2 }]
  }, monster);
  assert.deepEqual(children.map((entry) => entry.name), ["Bite", "Claw", "Claw"]);
  const withWrapper = buildCombatPresentationSteps({ name: "Multiattack", animation: {} }, children);
  assert.equal(withWrapper[0].presentationOnly, true);
  assert.equal(withWrapper.filter((entry) => !entry.presentationOnly).length, 3);
  const withoutWrapperAnimation = buildCombatPresentationSteps({ name: "Multiattack" }, children);
  assert.equal(withoutWrapperAnimation.filter((entry) => !entry.presentationOnly).length, 3);
});

test("legacy monster actions load while stable IDs survive later display-name changes", () => {
  const legacy = normalizeMonsterRecord({
    actions: ["Bite | Melee attack"],
    actionAnimations: { "actions:bite": { animation: { family: "melee", stages: { impact: "impact" } } } }
  });
  const stableId = legacy.actions[0].id;
  const renamed = normalizeMonsterRecord({ ...legacy, actions: [{ ...legacy.actions[0], name: "Fang" }] });
  assert.equal(renamed.actions[0].id, stableId);
  const legacyChildren = resolveMonsterMultiattackSequence(
    { sequence: ["actions:bite"] },
    legacy
  );
  assert.equal(legacyChildren[0].name, "Bite");
});

test("all supported duration endings reconcile from serializable state", () => {
  const base = {
    duration: { unit: "seconds", value: 2 },
    startedAtWorldTime: 10,
    startedAtRound: 2,
    startedAtTurnOrdinal: 4,
    targetTokenIds: [],
    sourceTokenId: "source"
  };
  assert.equal(getCombatEffectEndReason(base, { worldTime: 12 }), "duration-ended");
  assert.equal(getCombatEffectEndReason({ ...base, duration: { unit: "minutes", value: 1 } }, { worldTime: 70 }), "duration-ended");
  assert.equal(getCombatEffectEndReason({ ...base, duration: { unit: "hours", value: 1 } }, { worldTime: 3610 }), "duration-ended");
  assert.equal(getCombatEffectEndReason({ ...base, duration: { unit: "rounds", value: 2 } }, {
    initiative: { combatActive: true, roundNumber: 4, turnCounter: 9 }
  }), "rounds-ended");
  assert.equal(getCombatEffectEndReason({ ...base, duration: { unit: "turns", value: 2 } }, {
    initiative: { combatActive: true, roundNumber: 2, turnCounter: 6 }
  }), "turns-ended");
  assert.equal(getCombatEffectEndReason({ ...base, duration: { unit: "manual", concentration: true }, concentrationKey: "a:spell" }, {
    concentrationKeys: []
  }), "concentration-ended");
  assert.equal(getCombatEffectEndReason({ ...base, duration: { unit: "manual", status: "poisoned" }, requiredStatus: "poisoned", targetTokenIds: ["target"] }, {
    statusesByTokenId: { target: [] }
  }), "status-ended");
  assert.equal(getCombatEffectEndReason({ ...base, duration: { unit: "manual" } }, {}), "");
});

test("reload/reconnect restores Sustain once, never gameplay, and ends once", () => {
  const first = createCombatEffectLifecycle({ idFactory: () => "effect-1" });
  first.startEffect({
    duration: { unit: "seconds", value: 30 },
    worldTime: 100,
    sourceTokenId: "source",
    animation: { family: "magic", stages: { sustain: "sustain", end: "end" } }
  });
  const serialized = JSON.parse(JSON.stringify(first.getSnapshot()));
  let restores = 0;
  let ends = 0;
  const restored = createCombatEffectLifecycle();
  const restoreController = () => {
    restores += 1;
    return { end: () => { ends += 1; }, cancel() {} };
  };
  restored.hydrate(serialized, { restoreController });
  restored.hydrate(serialized, { restoreController });
  assert.equal(restores, 1);
  assert.equal(restored.reconcile({ worldTime: 129, tokenIds: ["source"] }).length, 0);
  assert.equal(restored.reconcile({ worldTime: 130, tokenIds: ["source"] }).length, 1);
  assert.equal(restored.reconcile({ worldTime: 131, tokenIds: ["source"] }).length, 0);
  assert.equal(ends, 1);

  let expiredRestores = 0;
  const expired = createCombatEffectLifecycle();
  const expiredContext = { worldTime: 200, tokenIds: ["source"] };
  expired.hydrate(serialized, {
    restoreController: (record) => {
      if (getCombatEffectEndReason(record, expiredContext)) return null;
      expiredRestores += 1;
      return {};
    }
  });
  expired.reconcile(expiredContext);
  assert.equal(expiredRestores, 0);
});

test("room effect persistence saves only serializable state and reloads the same stable ID", async () => {
  const writes = [];
  const deletes = [];
  let publishSnapshot = null;
  const persistence = createCombatEffectPersistence({
    db: {},
    collection: (...parts) => parts,
    doc: (...parts) => parts,
    setDoc: async (path, value) => writes.push({ path, value }),
    deleteDoc: async (path) => deletes.push(path),
    onSnapshot: (_path, _options, next) => {
      publishSnapshot = next;
      return () => {};
    },
    serverTimestamp: () => "server-time",
    getRoomId: () => "ROOM-1",
    getUserId: () => "user-1",
    getIsDm: () => true
  });
  const record = {
    id: "effect-1",
    duration: { unit: "rounds", value: 3 },
    contentName: "Aura",
    sourceTokenId: "source",
    targetTokenIds: ["target"],
    animation: { family: "magic", stages: { sustain: { animationId: "sustain" } } }
  };
  await persistence.save(record);
  assert.deepEqual(writes[0].path.slice(-4), ["rooms", "ROOM-1", "combatEffects", "effect-1"]);
  assert.equal(writes[0].value.createdByUid, "user-1");
  assert.equal("controller" in writes[0].value, false);
  let loaded = [];
  persistence.listen("ROOM-1", (records) => { loaded = records; });
  publishSnapshot({
    metadata: { hasPendingWrites: false },
    docs: [{ id: "effect-1", data: () => writes[0].value }]
  });
  assert.equal(loaded[0].id, "effect-1");
  assert.deepEqual(loaded[0].animation.stages.sustain, { animationId: "sustain" });
  await persistence.remove({ ...loaded[0], createdByUid: "user-1" });
  assert.equal(deletes.length, 1);
});

test("summon deletion is effect-scoped and transformation restore preserves newer edits", () => {
  assert.equal(isMatchingAutomationSummon({ automation: { kind: "summon", effectId: "effect-1" } }, "effect-1"), true);
  assert.equal(isMatchingAutomationSummon({ automation: { kind: "summon", effectId: "effect-2" } }, "effect-1"), false);
  assert.equal(isMatchingAutomationSummon({ name: "Normal token" }, "effect-1"), false);

  const current = {
    name: "Manually renamed",
    imageUrl: "wolf.png",
    sizeCategory: "large",
    automationTransformation: {
      effectId: "effect-1",
      original: { name: "Hero", imageUrl: "hero.png", sizeCategory: "medium" },
      applied: { name: "Wolf", imageUrl: "wolf.png", sizeCategory: "large" }
    }
  };
  const patch = buildTransformationRestorePatch(current, "effect-1", "DELETE");
  assert.equal("name" in patch, false, "a newer unrelated rename is preserved");
  assert.equal(patch.imageUrl, "hero.png");
  assert.equal(patch.sizeCategory, "medium");
  assert.equal(patch.automationTransformation, "DELETE");
});

test("timed automation creates and removes its summon and safely restores a transform", async () => {
  const deleted = Symbol("deleted");
  const records = new Map([
    ["hero", {
      name: "Hero",
      imageUrl: "hero.png",
      sizeCategory: "medium",
      creatureSize: "medium"
    }]
  ]);
  let createdId = 0;
  const idFromReference = (reference) => reference.at(-1);
  const tokens = createTokenSystem({
    autoInit: false,
    db: {},
    doc: (...parts) => parts,
    collection: (...parts) => parts,
    addDoc: async (_path, value) => {
      const id = `created-${++createdId}`;
      records.set(id, structuredClone(value));
      return { id };
    },
    runTransaction: async (_db, work) => work({
      get: async (reference) => {
        const value = records.get(idFromReference(reference));
        return {
          exists: () => Boolean(value),
          data: () => structuredClone(value)
        };
      },
      update(reference, patch) {
        const id = idFromReference(reference);
        const next = { ...records.get(id) };
        for (const [key, value] of Object.entries(patch)) {
          if (value === deleted) delete next[key];
          else next[key] = structuredClone(value);
        }
        records.set(id, next);
      },
      delete(reference) {
        records.delete(idFromReference(reference));
      }
    }),
    deleteField: () => deleted,
    serverTimestamp: () => "server-time",
    getCurrentRoomCode: () => "ROOM-1",
    getCurrentRoomData: () => ({}),
    getCurrentIsDM: () => true,
    getCurrentUserUid: () => "dm-1",
    buildMapFromRoomFields: () => ({ url: "https://example.invalid/map.png" })
  });

  const summon = await tokens.createAutomationToken({
    name: "Wolf",
    effectId: "summon-effect",
    sourceTokenId: "hero"
  });
  assert.equal(records.get(summon.id).automation.effectId, "summon-effect");
  const cleanup = [];
  const lifecycle = createCombatEffectLifecycle({
    onEnd: (record) => {
      for (const tokenId of record.automationState?.summonTokenIds || []) {
        cleanup.push(tokens.deleteAutomationSummon(tokenId, record.id));
      }
    }
  });
  lifecycle.startEffect({
    id: "summon-effect",
    duration: { unit: "seconds", value: 1 },
    worldTime: 10,
    automationState: { summonTokenIds: [summon.id], transformations: [] }
  });
  lifecycle.reconcile({ worldTime: 11 });
  await Promise.all(cleanup);
  assert.equal(records.has(summon.id), false);

  records.set("normal", { name: "Normal token" });
  assert.equal(await tokens.deleteAutomationSummon("normal", "summon-effect"), false);
  assert.equal(records.has("normal"), true);

  await tokens.transformAutomationToken("hero", {
    effectId: "transform-effect",
    name: "Wolf",
    imageUrl: "https://example.invalid/wolf.png",
    sizeCategory: "large"
  });
  assert.equal(records.get("hero").name, "Wolf");
  records.get("hero").name = "Manually renamed";
  assert.equal(await tokens.restoreAutomationTransform("hero", "transform-effect"), true);
  assert.equal(records.get("hero").name, "Manually renamed");
  assert.equal(records.get("hero").imageUrl, "hero.png");
  assert.equal(records.get("hero").sizeCategory, "medium");
  assert.equal("automationTransformation" in records.get("hero"), false);
});

test("Firestore rules scope active effects to room members and immutable creators", () => {
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  assert.match(rules, /match \/combatEffects\/\{effectId\}/);
  assert.match(rules, /request\.resource\.data\.get\('createdByUid',[\s\S]*request\.auth\.uid/);
  assert.match(rules, /request\.resource\.data\.get\('createdByUid',[\s\S]*resource\.data\.get\('createdByUid'/);
});
