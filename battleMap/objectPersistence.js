import { createRealtimeListenerRegistry } from "../shared/realtimeListeners.js";
import {
  buildMapObjectInteractionPatch,
  normalizeMapObject,
  objectCollectionForRecord,
  objectCollectionForVisibility,
  validateMapObjectInteraction
} from "./objectModel.js";

const required = (value, message) => {
  const result = String(value || "").trim();
  if (!result) throw new Error(message);
  return result;
};

export function createMapObjectStore({
  db,
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  runTransaction,
  writeBatch,
  serverTimestamp
} = {}) {
  if (!db || !collection || !doc || !onSnapshot || !setDoc || !runTransaction) {
    throw new Error("Map object persistence requires the Firestore document tools.");
  }

  const listeners = createRealtimeListenerRegistry();
  let roomCode = "";
  let readsPrivate = false;
  let shared = [];
  let privateObjects = [];
  let emit = () => {};
  let reportError = console.error;

  const collectionRef = (room, name) => collection(db, "rooms", room, name);
  const objectRef = (room, name, id) => doc(db, "rooms", room, name, id);

  function publish() {
    const byId = new Map();
    shared.forEach((entry) => byId.set(entry.id, entry));
    privateObjects.forEach((entry) => byId.set(entry.id, entry));
    emit([...byId.values()]);
  }

  function stop() {
    listeners.stopAll();
    roomCode = "";
    readsPrivate = false;
    shared = [];
    privateObjects = [];
    publish();
  }

  function connect(roomValue, { isDm = false, onData = () => {}, onError = console.error } = {}) {
    const nextRoom = String(roomValue || "").trim();
    const shouldReadPrivate = isDm === true;
    emit = onData;
    reportError = onError;
    if (!nextRoom) {
      stop();
      return stop;
    }
    if (roomCode === nextRoom && readsPrivate === shouldReadPrivate && listeners.has("objects", nextRoom)) {
      publish();
      return stop;
    }
    stop();
    roomCode = nextRoom;
    readsPrivate = shouldReadPrivate;
    listeners.connect("objects", nextRoom, ({ isCurrent, fail }) => onSnapshot(
      collectionRef(nextRoom, "objects"),
      (snapshot) => {
        if (!isCurrent() || roomCode !== nextRoom) return;
        shared = snapshot.docs.map((entry) => normalizeMapObject({ ...entry.data(), id: entry.id, visibility: "shared" }, entry.id));
        publish();
      },
      (error) => {
        if (!isCurrent()) return;
        fail(error);
        reportError(error);
      }
    ));
    if (shouldReadPrivate) listeners.connect("dmObjects", nextRoom, ({ isCurrent, fail }) => onSnapshot(
      collectionRef(nextRoom, "dmObjects"),
      (snapshot) => {
        if (!isCurrent() || roomCode !== nextRoom) return;
        privateObjects = snapshot.docs.map((entry) => normalizeMapObject({ ...entry.data(), id: entry.id, visibility: "dm" }, entry.id));
        publish();
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
    const reference = doc(collectionRef(room, objectCollectionForVisibility(value.visibility)));
    const now = Date.now();
    const record = normalizeMapObject({
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
      ...record,
      transform: { ...record.transform },
      hitPoints: { ...record.hitPoints },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return record;
  }

  async function save(roomValue, objectValue, patch = {}, userUid = "") {
    const room = required(roomValue, "A room is required.");
    const id = required(objectValue?.id, "A map object is required.");
    const sourceCollection = objectCollectionForRecord(objectValue);
    const requestedVisibility = patch.visibility ?? objectValue.visibility;
    const targetCollection = objectCollectionForVisibility(requestedVisibility);
    if (targetCollection !== sourceCollection) {
      return moveVisibility(room, objectValue, requestedVisibility, patch, userUid);
    }
    const reference = objectRef(room, sourceCollection, id);
    let saved = null;
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new Error("That map object no longer exists.");
      const remote = normalizeMapObject({ ...snapshot.data(), id, visibility: objectValue.visibility }, id);
      const puzzleOrigin = Object.hasOwn(patch, "stateId") && !Object.hasOwn(patch, "lastPuzzleExecutionId")
        ? { lastPuzzleExecutionId: "" }
        : {};
      saved = normalizeMapObject({
        ...remote,
        ...patch,
        ...puzzleOrigin,
        transform: { ...remote.transform, ...(patch.transform || {}) },
        hitPoints: { ...remote.hitPoints, ...(patch.hitPoints || {}) },
        revision: remote.revision + 1,
        updatedByUid: userUid,
        updatedAtMillis: Date.now()
      }, id);
      transaction.set(reference, {
        ...saved,
        transform: { ...saved.transform },
        hitPoints: { ...saved.hitPoints },
        updatedAt: serverTimestamp()
      });
    });
    return saved;
  }

  async function moveVisibility(roomValue, objectValue, visibility, patch = {}, userUid = "") {
    const room = required(roomValue, "A room is required.");
    const id = required(objectValue?.id, "A map object is required.");
    const sourceCollection = objectCollectionForRecord(objectValue);
    const targetCollection = objectCollectionForVisibility(visibility);
    const now = Date.now();
    const record = normalizeMapObject({
      ...objectValue,
      ...patch,
      transform: { ...objectValue.transform, ...(patch.transform || {}) },
      hitPoints: { ...objectValue.hitPoints, ...(patch.hitPoints || {}) },
      visibility,
      revision: Math.max(1, Number(objectValue.revision) || 1) + 1,
      updatedByUid: userUid,
      updatedAtMillis: now
    }, id);
    if (sourceCollection === targetCollection) return save(room, objectValue, patch, userUid);
    const batch = writeBatch(db);
    batch.set(objectRef(room, targetCollection, id), {
      ...record,
      transform: { ...record.transform },
      hitPoints: { ...record.hitPoints },
      updatedAt: serverTimestamp()
    });
    batch.delete(objectRef(room, sourceCollection, id));
    await batch.commit();
    return record;
  }

  async function interact(roomValue, objectValue, {
    token = null,
    context = {},
    isDm = false,
    userUid = ""
  } = {}) {
    const room = required(roomValue, "A room is required.");
    const id = required(objectValue?.id, "A map object is required.");
    const collectionName = objectCollectionForRecord(objectValue);
    const reference = objectRef(room, collectionName, id);
    let result = null;
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new Error("That map object no longer exists.");
      const remote = normalizeMapObject({ ...snapshot.data(), id, visibility: objectValue.visibility }, id);
      const validation = validateMapObjectInteraction({ object: remote, token, context, isDm });
      if (!validation.ok) throw new Error(validation.reason);
      const patch = buildMapObjectInteractionPatch(remote, {
        nextStateId: validation.nextStateId,
        userUid,
        tokenId: token?.id || ""
      });
      transaction.update(reference, { ...patch, updatedAt: serverTimestamp() });
      result = normalizeMapObject({ ...remote, ...patch }, id);
    });
    return result;
  }

  async function duplicate(room, object, overrides = {}, userUid = "") {
    return create(room, {
      ...object,
      ...overrides,
      id: undefined,
      name: overrides.name || `${object.name || "Object"} Copy`,
      transform: {
        ...(object.transform || {}),
        x: Math.min(100, Number(object.transform?.x || 50) + 2),
        y: Math.min(100, Number(object.transform?.y || 50) + 2),
        ...(overrides.transform || {})
      }
    }, userUid);
  }

  return Object.freeze({
    connect,
    stop,
    create,
    save,
    duplicate,
    interact,
    moveVisibility,
    remove(room, object) {
      return deleteDoc(objectRef(room, objectCollectionForRecord(object), required(object?.id, "A map object is required.")));
    },
    getListenerSnapshot: () => listeners.getSnapshot()
  });
}
