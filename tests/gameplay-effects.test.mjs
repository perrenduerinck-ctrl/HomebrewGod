import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createEffectRegistry } from "../effects/effectRegistry.js";
import { createEffectRuntime } from "../effects/effectRuntime.js";
import {
  getEffectExpirationReason,
  getEffectRemaining,
  prepareEffectDuration
} from "../effects/effectDuration.js";
import {
  calculateEffectModifiers,
  resolveNumericEffectValue,
  resolveRollMode
} from "../effects/effectModifiers.js";
import { createEffectPersistence } from "../effects/effectPersistence.js";

const roomCode = "TEST-ROOM";
const initiative = (turnCounter = 10, order = ["caster", "target", "third"], current = "caster") => ({
  combatActive: true,
  turnCounter,
  currentCombatantId: current,
  initiativeOrder: order.map((tokenId) => ({ tokenId }))
});

const effectInput = (overrides = {}) => ({
  roomCode,
  definitionId: "poisoned",
  sourceId: "caster",
  targetTokenId: "target",
  createdByUid: "dm-1",
  duration: { mode: "rounds", value: 2 },
  ...overrides
});

test("registry contains every required built-in condition", () => {
  const registry = createEffectRegistry();
  assert.deepEqual(
    registry.list().map((entry) => entry.name).sort(),
    [
      "Blinded", "Charmed", "Deafened", "Frightened", "Grappled",
      "Incapacitated", "Invisible", "Paralyzed", "Petrified", "Poisoned",
      "Prone", "Restrained", "Stunned", "Unconscious"
    ].sort()
  );
});

test("effects apply and remove even when optional VFX throws", () => {
  const phases = [];
  const runtime = createEffectRuntime({
    registry: createEffectRegistry(),
    onVisual(_record, phase) {
      phases.push(phase);
      throw new Error("renderer unavailable");
    }
  });
  const applied = runtime.applyEffect(effectInput(), { initiative: initiative() });
  assert.equal(applied.name, "Poisoned");
  assert.equal(runtime.getForToken("target").length, 1);
  assert.equal(runtime.removeEffect(applied.id), true);
  assert.equal(runtime.getSnapshot().length, 0);
  assert.deepEqual(phases, ["start", "end"]);
});

test("round and turn deadlines use the monotonic turn counter", () => {
  const rounds = prepareEffectDuration(
    { mode: "rounds", value: 2 },
    { initiative: initiative(10) }
  );
  assert.equal(rounds.expiresAtTurnCounter, 16);
  const effect = { duration: rounds };
  assert.equal(getEffectRemaining(effect, { initiative: initiative(15, ["third", "caster", "target"]) }), 1);
  assert.equal(getEffectExpirationReason(effect, { initiative: initiative(15, ["third", "caster", "target"]) }), "");
  assert.equal(getEffectExpirationReason(effect, { initiative: initiative(16, ["target", "third", "caster"]) }), "turn-duration-expired");

  const turns = prepareEffectDuration(
    { mode: "turns", value: 3 },
    { initiative: initiative(41) }
  );
  assert.equal(turns.expiresAtTurnCounter, 44);
});

test("source and target boundary durations become stable absolute deadlines", () => {
  const sourceStart = prepareEffectDuration(
    { mode: "until-start-source-turn" },
    { initiative: initiative(5, ["target", "third", "caster"], "target"), sourceTokenId: "caster", targetTokenId: "target" }
  );
  const targetEnd = prepareEffectDuration(
    { mode: "until-end-target-turn" },
    { initiative: initiative(5, ["target", "third", "caster"], "target"), sourceTokenId: "caster", targetTokenId: "target" }
  );
  assert.equal(sourceStart.expiresAtTurnCounter, 7);
  assert.equal(targetEnd.expiresAtTurnCounter, 6);
  assert.equal(
    getEffectExpirationReason({ duration: sourceStart }, { initiative: initiative(7, ["caster", "target", "third"], "caster") }),
    "turn-duration-expired"
  );
});

test("world-time and permanent effects reconcile and survive reload", () => {
  const registry = createEffectRegistry();
  const runtime = createEffectRuntime({ registry });
  const timed = runtime.applyEffect(effectInput({
    duration: { mode: "world-time", value: 2, unit: "minutes" }
  }), { worldTime: 100 });
  const permanent = runtime.applyEffect(effectInput({
    id: "permanent-effect",
    definitionId: "invisible",
    duration: { mode: "permanent" }
  }));
  assert.equal(timed.duration.expiresAtWorldTime, 220);
  assert.deepEqual(runtime.reconcile({ worldTime: 219 }), []);
  assert.deepEqual(runtime.reconcile({ worldTime: 220 }), [{ id: timed.id, reason: "world-time-expired" }]);

  const restored = createEffectRuntime({ registry });
  restored.hydrate([permanent]);
  assert.equal(restored.getById("permanent-effect").duration.mode, "permanent");
  assert.deepEqual(restored.reconcile({ worldTime: 999999 }), []);
});

test("generic modifiers stack and resolve conflicts deterministically", () => {
  const effects = [
    { id: "bless", modifiers: [
      { kind: "ac", mode: "bonus", value: 2 },
      { kind: "speed", mode: "bonus", value: 10 },
      { kind: "attack-roll", mode: "advantage" },
      { kind: "damage-resistance", mode: "set", damageType: "fire" }
    ] },
    { id: "slow", modifiers: [
      { kind: "ac", mode: "penalty", value: 1 },
      { kind: "speed", mode: "set", value: 5, priority: 10 },
      { kind: "attack-roll", mode: "disadvantage" },
      { kind: "action-restriction", mode: "restricted" }
    ] },
    { id: "alternate-set", modifiers: [
      { kind: "speed", mode: "set", value: 20, priority: 5 },
      { kind: "damage-immunity", mode: "set", damageType: "poison" },
      { kind: "damage-vulnerability", mode: "set", damageType: "cold" }
    ] }
  ];
  const result = calculateEffectModifiers({ base: { ac: 15, speed: 30 }, effects });
  assert.equal(result.ac, 16);
  assert.equal(result.speed, 15);
  assert.equal(result.attackRoll, "normal");
  assert.equal(result.actionRestricted, true);
  assert.deepEqual(result.damage.resistance, ["fire"]);
  assert.deepEqual(result.damage.immunity, ["poison"]);
  assert.deepEqual(result.damage.vulnerability, ["cold"]);
  assert.equal(resolveNumericEffectValue("speed", 30, [...effects].reverse()), 15);
  assert.equal(resolveRollMode("attack-roll", effects), "normal");
});

test("persistence uses room effects and refuses non-DM writes", async () => {
  const writes = [];
  let isDm = true;
  const persistence = createEffectPersistence({
    db: {},
    collection: (...parts) => parts.join("/"),
    doc: (...parts) => parts.slice(1).join("/"),
    setDoc: async (path, value) => writes.push({ operation: "set", path, value }),
    deleteDoc: async (path) => writes.push({ operation: "delete", path }),
    onSnapshot: () => () => {},
    serverTimestamp: () => "server-time",
    getRoomId: () => roomCode,
    getUserId: () => "dm-1",
    getIsDm: () => isDm
  });
  const runtime = createEffectRuntime({ registry: createEffectRegistry() });
  const record = runtime.applyEffect(effectInput({ duration: { mode: "until-removed" } }));
  await persistence.save(record);
  assert.equal(writes[0].path, `rooms/${roomCode}/effects/${record.id}`);
  assert.equal(writes[0].value.updatedAt, "server-time");
  await persistence.remove(record);
  assert.equal(writes[1].operation, "delete");
  isDm = false;
  await assert.rejects(() => persistence.save(record), /Only the room DM/);
  assert.equal(await persistence.remove(record), false);
});

test("application, token badges, movement, build and Firestore contracts are wired", async () => {
  const [app, tokens, movement, rules, build] = await Promise.all([
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../tokens/index.js", import.meta.url), "utf8"),
    readFile(new URL("../combat/movementSystem.js", import.meta.url), "utf8"),
    readFile(new URL("../firestore.rules", import.meta.url), "utf8"),
    readFile(new URL("../scripts/build-pages.mjs", import.meta.url), "utf8")
  ]);
  assert.match(app, /createEffectRuntime/);
  assert.match(app, /hasEffectRestriction/);
  assert.match(tokens, /hg-token-effect-badge/);
  assert.match(tokens, /effectiveArmorClass/);
  assert.match(movement, /getEffectiveBaseSpeed/);
  assert.match(build, /"effects"/);
  assert.match(rules, /match \/effects\/\{effectId\}/);
  assert.match(rules, /allow read:\s*if isRoomMember\(roomCode\)/);
  assert.match(rules, /allow create:\s*if isRoomDm\(roomCode\)/);
  assert.match(rules, /allow delete:\s*if isRoomDm\(roomCode\)/);
});
