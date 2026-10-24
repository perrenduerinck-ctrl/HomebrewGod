import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { createPuzzleEngine } from "../battleMap/puzzleEngine.js";
import {
  buildPuzzleResetActions,
  evaluatePuzzleChange,
  normalizePuzzle,
  puzzleActionPatch,
  validatePuzzleReferences
} from "../battleMap/puzzleModel.js";
import { normalizeMapObject } from "../battleMap/objectModel.js";

const object = (id, type, stateId, overrides = {}) => normalizeMapObject({
  id,
  roomCode: "ROOM-1",
  name: id.replaceAll("-", " "),
  type,
  stateId,
  sceneId: "keep",
  floorId: "ground",
  mapId: "scene:keep:floor:ground",
  transform: { x: 20, y: 20, width: 8, height: 8, rotation: 0 },
  revision: 1,
  ...overrides
}, id);

const puzzle = (overrides = {}) => normalizePuzzle({
  id: "puzzle-1",
  roomCode: "ROOM-1",
  name: "Vault controls",
  triggerMode: "all",
  triggers: [{ id: "t1", objectId: "lever-1", stateId: "active" }],
  actions: [{ id: "a1", objectId: "door-1", stateId: "open", lockMode: "unlock" }],
  resetActions: [],
  runtime: { status: "idle", sequenceIndex: 0 },
  revision: 1,
  ...overrides
}, overrides.id || "puzzle-1");

test("lever, button, and pressure-plate triggers produce reusable object actions", () => {
  const lever = object("lever-1", "lever", "active");
  const door = object("door-1", "door", "closed", { locked: true });
  const result = evaluatePuzzleChange(puzzle(), { changedObject: lever, objects: [lever, door], executionId: "run-1", now: 50 });
  assert.equal(result.solved, true);
  assert.equal(result.actions.length, 1);
  assert.deepEqual(puzzleActionPatch(result.actions[0], door, { executionId: "run-1" }), {
    stateId: "open",
    locked: false,
    lastPuzzleExecutionId: "run-1",
    lastInteractedByUid: "",
    lastInteractorTokenId: ""
  });

  for (const type of ["button", "pressure-plate"]) {
    const trigger = object("lever-1", type, "active");
    assert.equal(evaluatePuzzleChange(puzzle(), { changedObject: trigger, objects: [trigger, door] }).solved, true);
  }
});

test("multi-switch puzzles wait for every configured source", () => {
  const lever = object("lever-1", "lever", "active");
  const button = object("button-1", "button", "inactive");
  const door = object("door-1", "door", "closed");
  const record = puzzle({ triggers: [
    { id: "t1", objectId: "lever-1", stateId: "active" },
    { id: "t2", objectId: "button-1", stateId: "active" }
  ] });
  assert.equal(evaluatePuzzleChange(record, { changedObject: lever, objects: [lever, button, door] }).solved, false);
  const activeButton = object("button-1", "button", "active", { revision: 2 });
  assert.equal(evaluatePuzzleChange(record, { changedObject: activeButton, objects: [lever, activeButton, door] }).solved, true);
});

test("sequence puzzles persist progress and reset on an incorrect activated input", () => {
  const first = object("lever-1", "lever", "active");
  const second = object("button-1", "button", "active");
  const door = object("door-1", "door", "closed");
  const record = puzzle({ triggerMode: "sequence", triggers: [
    { id: "t1", objectId: "lever-1", stateId: "active" },
    { id: "t2", objectId: "button-1", stateId: "active" }
  ] });
  const stepOne = evaluatePuzzleChange(record, { changedObject: first, objects: [first, second, door], executionId: "seq-1" });
  assert.equal(stepOne.solved, false);
  assert.equal(stepOne.runtime.sequenceIndex, 1);
  const progressed = puzzle({ ...record, runtime: stepOne.runtime });
  const solved = evaluatePuzzleChange(progressed, { changedObject: second, objects: [first, second, door], executionId: "seq-2" });
  assert.equal(solved.solved, true);
  assert.equal(solved.runtime.sequenceIndex, 2);
  const wrong = evaluatePuzzleChange(record, { changedObject: second, objects: [first, second, door] });
  assert.equal(wrong.runtime.sequenceIndex, 0);
});

test("actions support multiple targets and disabling traps", () => {
  const lever = object("lever-1", "lever", "active");
  const trap = object("trap-1", "trap", "armed");
  const door = object("door-1", "door", "closed");
  const record = puzzle({ actions: [
    { id: "a1", objectId: "door-1", stateId: "open", lockMode: "unlock" },
    { id: "a2", objectId: "trap-1", stateId: "disabled", lockMode: "keep" }
  ] });
  const result = evaluatePuzzleChange(record, { changedObject: lever, objects: [lever, trap, door] });
  assert.deepEqual(result.actions.map((entry) => entry.stateId), ["open", "disabled"]);
});

test("reset baselines preserve linked object state and lock values", () => {
  const lever = object("lever-1", "lever", "inactive");
  const door = object("door-1", "door", "closed", { locked: true });
  const actions = buildPuzzleResetActions(puzzle(), [lever, door]);
  assert.deepEqual(actions.map((entry) => [entry.objectId, entry.stateId, entry.lockMode]), [
    ["lever-1", "inactive", "unlock"],
    ["door-1", "closed", "lock"]
  ]);
});

test("cross-floor links require an explicit DM opt-in", () => {
  const lever = object("lever-1", "lever", "inactive");
  const upperDoor = object("door-1", "door", "closed", { floorId: "upper", mapId: "scene:keep:floor:upper" });
  assert.equal(validatePuzzleReferences(puzzle(), [lever, upperDoor]).ok, false);
  assert.equal(validatePuzzleReferences(puzzle({ allowCrossFloor: true }), [lever, upperDoor]).ok, true);
});

test("execution IDs prevent a reactive puzzle chain from looping", async () => {
  let objects = [
    object("lever-1", "lever", "inactive"),
    object("button-1", "button", "inactive")
  ];
  let puzzles = [
    puzzle({ id: "p1", triggers: [{ objectId: "lever-1", stateId: "active" }], actions: [{ objectId: "button-1", stateId: "active" }] }),
    puzzle({ id: "p2", triggers: [{ objectId: "button-1", stateId: "active" }], actions: [{ objectId: "lever-1", stateId: "inactive" }] })
  ];
  const writes = [];
  let engine;
  const puzzleStore = {
    async save(_room, source, patch) {
      const saved = normalizePuzzle({ ...source, ...patch, revision: source.revision + 1 }, source.id);
      puzzles = puzzles.map((entry) => entry.id === saved.id ? saved : entry);
      engine.syncPuzzles(puzzles);
      return saved;
    }
  };
  const objectStore = {
    async save(_room, source, patch) {
      const saved = normalizeMapObject({ ...source, ...patch, revision: source.revision + 1 }, source.id);
      writes.push(saved);
      objects = objects.map((entry) => entry.id === saved.id ? saved : entry);
      engine.syncObjects(objects);
      return saved;
    }
  };
  engine = createPuzzleEngine({ puzzleStore, objectStore, getRoomContext: () => ({ roomCode: "ROOM-1", userUid: "dm-1", isDm: true }) });
  engine.syncPuzzles(puzzles);
  engine.syncObjects(objects);
  objects = objects.map((entry) => entry.id === "lever-1" ? normalizeMapObject({ ...entry, stateId: "active", revision: 2, lastPuzzleExecutionId: "" }, entry.id) : entry);
  engine.syncObjects(objects);
  for (let index = 0; index < 5; index += 1) await engine.getState().pending;
  assert.equal(writes.length, 2);
  assert.equal(objects.find((entry) => entry.id === "lever-1").stateId, "inactive");
  assert.equal(objects.find((entry) => entry.id === "button-1").stateId, "active");
});

test("integration keeps puzzle state private and reuses object animation playback", () => {
  const rules = fs.readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const objectSystem = fs.readFileSync(new URL("../battleMap/objectSystem.js", import.meta.url), "utf8");
  const deletion = fs.readFileSync(new URL("../rooms/roomDeletionPolicy.js", import.meta.url), "utf8");
  assert.match(rules, /match \/dmPuzzles\/\{puzzleId\}/);
  assert.match(rules.slice(rules.indexOf("match /dmPuzzles/{puzzleId}")), /allow read:\s*if isRoomDm\(roomCode\)/);
  assert.match(app, /createPuzzleEngine/);
  assert.match(app, /battleMapAnimations\?\.player\?\.playAnimation/);
  assert.match(objectSystem, /changed\.forEach/);
  assert.match(deletion, /name: "dmPuzzles"/);
});
