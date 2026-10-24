import {
  evaluatePuzzleChange,
  idlePuzzleRuntime,
  normalizePuzzle,
  puzzleActionPatch,
  validatePuzzleReferences
} from "./puzzleModel.js";

const clean = (value) => String(value || "").trim();

function executionId(prefix = "puzzle") {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`}`;
}

export function createPuzzleEngine({
  puzzleStore,
  objectStore,
  getRoomContext = () => ({}),
  onStatus = () => {}
} = {}) {
  if (!puzzleStore || !objectStore) throw new Error("The puzzle engine requires puzzle and object persistence.");

  let puzzles = [];
  let objects = [];
  let previousObjects = new Map();
  let objectsReady = false;
  let queue = Promise.resolve();
  const executions = new Map();
  const suppressedExecutions = new Set();
  const MAX_CHAIN_STEPS = 32;
  const MAX_EXECUTIONS = 100;

  function rememberExecution(id) {
    const key = clean(id) || executionId();
    if (!executions.has(key)) executions.set(key, { visited: new Set(), steps: 0 });
    while (executions.size > MAX_EXECUTIONS) executions.delete(executions.keys().next().value);
    return { id: key, record: executions.get(key) };
  }

  function currentObject(id) {
    return objects.find((entry) => entry.id === id) || null;
  }

  function actionChangesObject(action, object) {
    if (!object) return false;
    if (clean(object.stateId).toLowerCase() !== action.stateId) return true;
    if (action.lockMode === "lock" && object.locked !== true) return true;
    if (action.lockMode === "unlock" && object.locked !== false) return true;
    return false;
  }

  async function applyActions(puzzle, actions, id) {
    const room = getRoomContext() || {};
    for (const action of actions) {
      const target = currentObject(action.objectId);
      if (!target) throw new Error("A linked target object is no longer available.");
      const execution = rememberExecution(id);
      execution.record.steps += 1;
      if (execution.record.steps > MAX_CHAIN_STEPS) {
        throw new Error("Puzzle chain stopped after 32 object changes to prevent a trigger loop.");
      }
      if (!actionChangesObject(action, target)) continue;
      await objectStore.save(room.roomCode, target, puzzleActionPatch(action, target, {
        executionId: execution.id
      }), room.userUid);
    }
  }

  async function processChange(changedObject) {
    const room = getRoomContext() || {};
    if (!room.roomCode || room.isDm !== true) return;
    const inheritedId = clean(changedObject.lastPuzzleExecutionId);
    if (inheritedId && suppressedExecutions.has(inheritedId)) return;
    const execution = rememberExecution(inheritedId || executionId());
    const candidates = puzzles.filter((puzzle) => puzzle.enabled && puzzle.triggers.some((entry) => entry.objectId === changedObject.id));
    for (const source of candidates) {
      const puzzle = normalizePuzzle(source, source.id);
      if (execution.record.visited.has(puzzle.id)) continue;
      execution.record.visited.add(puzzle.id);
      const outcome = evaluatePuzzleChange(puzzle, {
        changedObject,
        objects,
        executionId: execution.id
      });
      if (!outcome.shouldPersist) continue;
      try {
        if (outcome.solved) await applyActions(puzzle, outcome.actions, execution.id);
        await puzzleStore.save(room.roomCode, puzzle, { runtime: outcome.runtime }, room.userUid);
        onStatus(outcome.solved
          ? `${puzzle.name} solved.`
          : `${puzzle.name}: ${outcome.runtime.message}`,
        outcome.solved ? "saved" : "active");
      } catch (error) {
        const message = error?.message || "The puzzle action could not be completed.";
        try {
          await puzzleStore.save(room.roomCode, puzzle, {
            runtime: { ...outcome.runtime, status: "error", message }
          }, room.userUid);
        } catch (saveError) {
          console.warn("Puzzle failure state could not be saved:", saveError);
        }
        onStatus(`${puzzle.name}: ${message}`, "error");
      }
    }
  }

  function syncPuzzles(nextPuzzles = []) {
    puzzles = nextPuzzles.map((puzzle) => normalizePuzzle(puzzle, puzzle.id));
  }

  function syncObjects(nextObjects = []) {
    const next = nextObjects.map((object) => ({ ...object }));
    const nextById = new Map(next.map((object) => [object.id, object]));
    if (!objectsReady) {
      objects = next;
      previousObjects = nextById;
      objectsReady = true;
      return;
    }
    const changes = next.filter((object) => {
      const previous = previousObjects.get(object.id);
      return previous && (
        previous.stateId !== object.stateId ||
        previous.locked !== object.locked ||
        Number(previous.revision) !== Number(object.revision)
      );
    });
    objects = next;
    previousObjects = nextById;
    changes.forEach((object) => {
      queue = queue.then(() => processChange(object)).catch((error) => {
        console.error("Puzzle processing failed:", error);
        onStatus(error?.message || "Puzzle processing failed.", "error");
      });
    });
  }

  async function resetPuzzle(puzzleValue) {
    const room = getRoomContext() || {};
    if (!room.roomCode || room.isDm !== true) throw new Error("Only the room DM can reset a puzzle.");
    const puzzle = normalizePuzzle(puzzleValue, puzzleValue?.id);
    const validation = validatePuzzleReferences(puzzle, objects);
    if (!validation.ok) throw new Error(validation.reason);
    const id = executionId("reset");
    suppressedExecutions.add(id);
    while (suppressedExecutions.size > MAX_EXECUTIONS) suppressedExecutions.delete(suppressedExecutions.values().next().value);
    const execution = rememberExecution(id);
    execution.record.visited.add(puzzle.id);
    await applyActions(puzzle, puzzle.resetActions, id);
    const saved = await puzzleStore.save(room.roomCode, puzzle, {
      runtime: idlePuzzleRuntime()
    }, room.userUid);
    onStatus(`${puzzle.name} reset.`, "saved");
    return saved;
  }

  return Object.freeze({
    syncPuzzles,
    syncObjects,
    resetPuzzle,
    getState: () => ({
      puzzleCount: puzzles.length,
      objectCount: objects.length,
      objectsReady,
      pending: queue
    }),
    resetContext() {
      puzzles = [];
      objects = [];
      previousObjects = new Map();
      objectsReady = false;
      executions.clear();
      suppressedExecutions.clear();
      queue = Promise.resolve();
    }
  });
}
