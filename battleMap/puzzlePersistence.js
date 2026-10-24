import { createRealtimeListenerRegistry } from "../shared/realtimeListeners.js";
import { normalizePuzzle } from "./puzzleModel.js";

const required = (value, message) => {
  const result = String(value || "").trim();
  if (!result) throw new Error(message);
  return result;
};

function serializePuzzle(value) {
  const puzzle = normalizePuzzle(value, value?.id);
  return {
    ...puzzle,
    triggers: puzzle.triggers.map((entry) => ({ ...entry })),
    actions: puzzle.actions.map((entry) => ({ ...entry })),
    resetActions: puzzle.resetActions.map((entry) => ({ ...entry })),
    runtime: { ...puzzle.runtime }
  };
}

export function createPuzzleStore({
  db,
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  runTransaction,
  serverTimestamp
} = {}) {
  if (!db || !collection || !doc || !onSnapshot || !setDoc || !deleteDoc || !runTransaction) {
    throw new Error("Puzzle persistence requires the Firestore document tools.");
  }

  const listeners = createRealtimeListenerRegistry();
  let roomCode = "";
  let emit = () => {};
  let reportError = console.error;

  const collectionRef = (room) => collection(db, "rooms", room, "dmPuzzles");
  const puzzleRef = (room, id) => doc(db, "rooms", room, "dmPuzzles", id);

  function stop() {
    listeners.stopAll();
    roomCode = "";
    emit([]);
  }

  function connect(roomValue, { isDm = false, onData = () => {}, onError = console.error } = {}) {
    const room = String(roomValue || "").trim();
    emit = onData;
    reportError = onError;
    if (!room || isDm !== true) {
      stop();
      return stop;
    }
    if (roomCode === room && listeners.has("dm-puzzles", room)) return stop;
    stop();
    roomCode = room;
    listeners.connect("dm-puzzles", room, ({ isCurrent, fail }) => onSnapshot(
      collectionRef(room),
      (snapshot) => {
        if (!isCurrent() || roomCode !== room) return;
        emit(snapshot.docs.map((entry) => normalizePuzzle({ ...entry.data(), id: entry.id }, entry.id)));
      },
      (error) => {
        if (!isCurrent()) return;
        fail(error);
        reportError(error);
      }
    ));
    return stop;
  }

  async function create(roomValue, value = {}, userUid = "") {
    const room = required(roomValue, "A room is required.");
    const reference = doc(collectionRef(room));
    const now = Date.now();
    const puzzle = normalizePuzzle({
      ...value,
      id: reference.id,
      roomCode: room,
      revision: 1,
      createdByUid: userUid,
      updatedByUid: userUid,
      createdAtMillis: now,
      updatedAtMillis: now
    }, reference.id);
    await setDoc(reference, {
      ...serializePuzzle(puzzle),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return puzzle;
  }

  async function save(roomValue, puzzleValue, patch = {}, userUid = "") {
    const room = required(roomValue, "A room is required.");
    const id = required(puzzleValue?.id, "A puzzle is required.");
    const reference = puzzleRef(room, id);
    let saved = null;
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new Error("That puzzle no longer exists.");
      const remote = normalizePuzzle({ ...snapshot.data(), id }, id);
      saved = normalizePuzzle({
        ...remote,
        ...patch,
        runtime: { ...remote.runtime, ...(patch.runtime || {}) },
        revision: remote.revision + 1,
        updatedByUid: userUid,
        updatedAtMillis: Date.now()
      }, id);
      transaction.set(reference, {
        ...serializePuzzle(saved),
        updatedAt: serverTimestamp()
      });
    });
    return saved;
  }

  return Object.freeze({
    connect,
    stop,
    create,
    save,
    remove(roomValue, puzzleValue) {
      const room = required(roomValue, "A room is required.");
      const id = required(puzzleValue?.id, "A puzzle is required.");
      return deleteDoc(puzzleRef(room, id));
    },
    getListenerSnapshot: () => listeners.getSnapshot()
  });
}
