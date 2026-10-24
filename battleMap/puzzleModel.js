import { getMapObjectStates } from "./objectModel.js";

export const PUZZLE_SCHEMA_VERSION = 1;
export const PUZZLE_TRIGGER_MODES = Object.freeze(["all", "any", "sequence"]);
export const PUZZLE_LOCK_MODES = Object.freeze(["keep", "lock", "unlock"]);
export const PUZZLE_RUNTIME_STATES = Object.freeze(["idle", "progress", "solved", "error"]);

const clean = (value, fallback = "") => String(value ?? "").trim() || fallback;
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const boundedList = (value, maximum) => Array.isArray(value) ? value.slice(0, maximum) : [];

function makeId(prefix) {
  const cryptoId = globalThis.crypto?.randomUUID?.();
  if (cryptoId) return `${prefix}-${cryptoId}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeTrigger(value = {}, index = 0) {
  return Object.freeze({
    id: clean(value.id, `trigger-${index + 1}`).slice(0, 180),
    objectId: clean(value.objectId).slice(0, 180),
    stateId: clean(value.stateId, "active").toLowerCase().slice(0, 80)
  });
}

function normalizeAction(value = {}, index = 0) {
  const requestedLock = clean(value.lockMode, "keep").toLowerCase();
  return Object.freeze({
    id: clean(value.id, `action-${index + 1}`).slice(0, 180),
    objectId: clean(value.objectId).slice(0, 180),
    stateId: clean(value.stateId).toLowerCase().slice(0, 80),
    lockMode: PUZZLE_LOCK_MODES.includes(requestedLock) ? requestedLock : "keep"
  });
}

export function createPuzzleTrigger(value = {}) {
  return normalizeTrigger({ id: makeId("trigger"), ...value });
}

export function createPuzzleAction(value = {}) {
  return normalizeAction({ id: makeId("action"), ...value });
}

export function normalizePuzzle(value = {}, id = value?.id) {
  const requestedMode = clean(value.triggerMode, "all").toLowerCase();
  const runtimeValue = value.runtime && typeof value.runtime === "object" ? value.runtime : {};
  const requestedRuntimeState = clean(runtimeValue.status, "idle").toLowerCase();
  const triggers = boundedList(value.triggers, 20)
    .map(normalizeTrigger)
    .filter((entry) => entry.objectId);
  const actions = boundedList(value.actions, 20)
    .map(normalizeAction)
    .filter((entry) => entry.objectId && entry.stateId);
  const resetActions = boundedList(value.resetActions, 40)
    .map(normalizeAction)
    .filter((entry) => entry.objectId && entry.stateId);
  return Object.freeze({
    ...value,
    id: clean(id ?? value.id).slice(0, 180),
    roomCode: clean(value.roomCode).slice(0, 40),
    name: clean(value.name, "New Puzzle").slice(0, 120),
    description: clean(value.description).slice(0, 2000),
    enabled: value.enabled !== false,
    hiddenState: value.hiddenState !== false,
    allowCrossFloor: value.allowCrossFloor === true,
    triggerMode: PUZZLE_TRIGGER_MODES.includes(requestedMode) ? requestedMode : "all",
    triggers: Object.freeze(triggers),
    actions: Object.freeze(actions),
    resetActions: Object.freeze(resetActions),
    runtime: Object.freeze({
      status: PUZZLE_RUNTIME_STATES.includes(requestedRuntimeState) ? requestedRuntimeState : "idle",
      sequenceIndex: Math.max(0, Math.min(triggers.length, Math.round(finite(runtimeValue.sequenceIndex, 0)))),
      executionId: clean(runtimeValue.executionId).slice(0, 180),
      lastObjectId: clean(runtimeValue.lastObjectId).slice(0, 180),
      solvedAtMillis: Math.max(0, finite(runtimeValue.solvedAtMillis, 0)),
      message: clean(runtimeValue.message).slice(0, 500)
    }),
    revision: Math.max(1, Math.round(finite(value.revision, 1))),
    createdByUid: clean(value.createdByUid).slice(0, 180),
    updatedByUid: clean(value.updatedByUid).slice(0, 180),
    createdAtMillis: Math.max(0, finite(value.createdAtMillis, Date.now())),
    updatedAtMillis: Math.max(0, finite(value.updatedAtMillis, Date.now())),
    schemaVersion: PUZZLE_SCHEMA_VERSION
  });
}

export function objectLocationKey(object = {}) {
  const sceneId = clean(object.sceneId);
  const floorId = clean(object.floorId);
  if (sceneId || floorId) return `scene:${sceneId}:floor:${floorId}`;
  return `map:${clean(object.mapId)}`;
}

export function describePuzzleObject(object = {}) {
  const name = clean(object.name, "Missing object");
  const scene = clean(object.sceneId);
  const floor = clean(object.floorId);
  if (scene || floor) return `${name} · ${scene || "legacy"}/${floor || "base"}`;
  return `${name} · ${clean(object.mapId, "legacy map")}`;
}

export function validatePuzzleReferences(puzzleValue, objects = []) {
  const puzzle = normalizePuzzle(puzzleValue, puzzleValue?.id);
  const byId = new Map(objects.map((object) => [clean(object?.id), object]));
  if (!puzzle.triggers.length) return Object.freeze({ ok: false, reason: "Add at least one trigger object." });
  if (!puzzle.actions.length) return Object.freeze({ ok: false, reason: "Add at least one target action." });
  const references = [...puzzle.triggers, ...puzzle.actions, ...puzzle.resetActions];
  const missing = references.find((entry) => !byId.has(entry.objectId));
  if (missing) return Object.freeze({ ok: false, reason: "A linked object is no longer available." });
  const invalidState = references.find((entry) => !getMapObjectStates(byId.get(entry.objectId)?.type).includes(entry.stateId));
  if (invalidState) return Object.freeze({ ok: false, reason: "A linked object uses a state that is no longer valid for its type." });
  if (!puzzle.allowCrossFloor) {
    const locations = new Set(references.map((entry) => objectLocationKey(byId.get(entry.objectId))));
    if (locations.size > 1) {
      return Object.freeze({ ok: false, reason: "Linked objects are on different floors. Enable cross-floor links explicitly." });
    }
  }
  return Object.freeze({ ok: true, reason: "", puzzle, byId });
}

function stateMatches(entry, object) {
  return clean(object?.stateId).toLowerCase() === entry.stateId;
}

export function evaluatePuzzleChange(puzzleValue, {
  changedObject,
  objects = [],
  now = Date.now(),
  executionId = ""
} = {}) {
  const puzzle = normalizePuzzle(puzzleValue, puzzleValue?.id);
  const validation = validatePuzzleReferences(puzzle, objects);
  if (!validation.ok) {
    return Object.freeze({
      matched: false,
      solved: false,
      shouldPersist: true,
      reason: validation.reason,
      actions: Object.freeze([]),
      runtime: Object.freeze({ ...puzzle.runtime, status: "error", message: validation.reason })
    });
  }
  if (!puzzle.enabled || puzzle.runtime.status === "solved" || !changedObject?.id) {
    return Object.freeze({ matched: false, solved: puzzle.runtime.status === "solved", shouldPersist: false, reason: "", actions: Object.freeze([]), runtime: puzzle.runtime });
  }
  const triggerIndexes = puzzle.triggers
    .map((entry, index) => entry.objectId === changedObject.id ? index : -1)
    .filter((index) => index >= 0);
  if (!triggerIndexes.length) {
    return Object.freeze({ matched: false, solved: false, shouldPersist: false, reason: "", actions: Object.freeze([]), runtime: puzzle.runtime });
  }

  let sequenceIndex = puzzle.runtime.sequenceIndex;
  let matched = false;
  let solved = false;
  if (puzzle.triggerMode === "any") {
    matched = triggerIndexes.some((index) => stateMatches(puzzle.triggers[index], changedObject));
    solved = matched;
  } else if (puzzle.triggerMode === "all") {
    matched = triggerIndexes.some((index) => stateMatches(puzzle.triggers[index], changedObject));
    solved = matched && puzzle.triggers.every((entry) => stateMatches(entry, validation.byId.get(entry.objectId)));
  } else {
    const expected = puzzle.triggers[sequenceIndex];
    if (expected && expected.objectId === changedObject.id && stateMatches(expected, changedObject)) {
      matched = true;
      sequenceIndex += 1;
    } else if (triggerIndexes.some((index) => stateMatches(puzzle.triggers[index], changedObject))) {
      matched = true;
      sequenceIndex = puzzle.triggers[0]?.objectId === changedObject.id &&
        stateMatches(puzzle.triggers[0], changedObject) ? 1 : 0;
    } else {
      return Object.freeze({ matched: false, solved: false, shouldPersist: false, reason: "", actions: Object.freeze([]), runtime: puzzle.runtime });
    }
    solved = sequenceIndex >= puzzle.triggers.length;
  }

  if (!matched) {
    return Object.freeze({ matched: false, solved: false, shouldPersist: false, reason: "", actions: Object.freeze([]), runtime: puzzle.runtime });
  }
  const runtime = Object.freeze({
    status: solved ? "solved" : (sequenceIndex > 0 ? "progress" : "idle"),
    sequenceIndex: solved ? puzzle.triggers.length : sequenceIndex,
    executionId: clean(executionId),
    lastObjectId: clean(changedObject.id),
    solvedAtMillis: solved ? Math.max(0, finite(now, Date.now())) : 0,
    message: solved ? "Puzzle solved." : `Sequence ${sequenceIndex}/${puzzle.triggers.length}.`
  });
  return Object.freeze({
    matched: true,
    solved,
    shouldPersist: true,
    reason: "",
    actions: solved ? puzzle.actions : Object.freeze([]),
    runtime
  });
}

export function buildPuzzleResetActions(puzzleValue, objects = []) {
  const puzzle = normalizePuzzle(puzzleValue, puzzleValue?.id);
  const byId = new Map(objects.map((object) => [clean(object?.id), object]));
  const existing = new Map(puzzle.resetActions.map((entry) => [entry.objectId, entry]));
  const ids = [...new Set([...puzzle.triggers, ...puzzle.actions].map((entry) => entry.objectId))];
  return Object.freeze(ids.map((objectId, index) => {
    if (existing.has(objectId)) return existing.get(objectId);
    const object = byId.get(objectId) || {};
    return normalizeAction({
      id: `reset-${index + 1}`,
      objectId,
      stateId: clean(object.stateId, "inactive"),
      lockMode: object.locked === true ? "lock" : "unlock"
    }, index);
  }));
}

export function puzzleActionPatch(actionValue = {}, targetObject = {}, {
  executionId = ""
} = {}) {
  const action = normalizeAction(actionValue);
  const patch = {
    stateId: action.stateId,
    lastPuzzleExecutionId: clean(executionId),
    lastInteractedByUid: "",
    lastInteractorTokenId: ""
  };
  if (action.lockMode === "lock") patch.locked = true;
  if (action.lockMode === "unlock") patch.locked = false;
  return Object.freeze(patch);
}

export function idlePuzzleRuntime(message = "Puzzle reset.") {
  return Object.freeze({
    status: "idle",
    sequenceIndex: 0,
    executionId: "",
    lastObjectId: "",
    solvedAtMillis: 0,
    message: clean(message).slice(0, 500)
  });
}
