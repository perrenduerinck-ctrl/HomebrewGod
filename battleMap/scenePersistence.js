import {
  normalizeConnection,
  normalizeFloor,
  normalizeScene
} from "./sceneModel.js";

function requireValue(value, message) {
  const clean = String(value || "").trim();
  if (!clean) throw new Error(message);
  return clean;
}

export function createScenePersistence({
  db,
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  serverTimestamp
} = {}) {
  if (!db || !collection || !doc || !setDoc || !onSnapshot) {
    throw new Error("Scene persistence requires the Firestore document tools.");
  }

  const sceneCollection = (roomCode) => collection(db, "rooms", roomCode, "scenes");
  const sceneReference = (roomCode, sceneId) => doc(db, "rooms", roomCode, "scenes", sceneId);
  const floorCollection = (roomCode, sceneId) => collection(
    db, "rooms", roomCode, "scenes", sceneId, "floors"
  );
  const floorReference = (roomCode, sceneId, floorId) => doc(
    db, "rooms", roomCode, "scenes", sceneId, "floors", floorId
  );
  const connectionCollection = (roomCode, sceneId) => collection(
    db, "rooms", roomCode, "scenes", sceneId, "connections"
  );
  const connectionReference = (roomCode, sceneId, connectionId) => doc(
    db, "rooms", roomCode, "scenes", sceneId, "connections", connectionId
  );
  const dmFloorNotesCollection = (roomCode, sceneId) => collection(
    db, "rooms", roomCode, "scenes", sceneId, "dmFloorNotes"
  );
  const dmFloorNotesReference = (roomCode, sceneId, floorId) => doc(
    db, "rooms", roomCode, "scenes", sceneId, "dmFloorNotes", floorId
  );

  function listenCollection(reference, normalize, onData, onError = console.error) {
    return onSnapshot(reference, (snapshot) => {
      onData(snapshot.docs.map((entry) => normalize(entry.data(), entry.id)));
    }, onError);
  }

  async function createScene(roomCodeValue, value = {}) {
    const roomCode = requireValue(roomCodeValue, "A room is required.");
    const reference = doc(sceneCollection(roomCode));
    const now = Date.now();
    const record = normalizeScene({
      ...value,
      id: reference.id,
      roomCode,
      createdAtMillis: now,
      updatedAtMillis: now
    }, reference.id);
    await setDoc(reference, {
      ...record,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return record;
  }

  async function saveScene(roomCodeValue, sceneIdValue, patch = {}) {
    const roomCode = requireValue(roomCodeValue, "A room is required.");
    const sceneId = requireValue(sceneIdValue, "A location is required.");
    const record = normalizeScene({
      ...patch,
      id: sceneId,
      roomCode,
      updatedAtMillis: Date.now()
    }, sceneId);
    await updateDoc(sceneReference(roomCode, sceneId), {
      name: record.name,
      description: record.description,
      updatedAtMillis: record.updatedAtMillis,
      updatedAt: serverTimestamp()
    });
    return record;
  }

  async function createFloor(roomCodeValue, sceneIdValue, value = {}) {
    const roomCode = requireValue(roomCodeValue, "A room is required.");
    const sceneId = requireValue(sceneIdValue, "A location is required.");
    const reference = doc(floorCollection(roomCode, sceneId));
    const now = Date.now();
    const record = normalizeFloor({
      ...value,
      id: reference.id,
      sceneId,
      roomCode,
      createdAtMillis: now,
      updatedAtMillis: now
    }, reference.id);
    await setDoc(reference, {
      ...record,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return record;
  }

  async function saveFloor(roomCodeValue, sceneIdValue, floorIdValue, patch = {}) {
    const roomCode = requireValue(roomCodeValue, "A room is required.");
    const sceneId = requireValue(sceneIdValue, "A location is required.");
    const floorId = requireValue(floorIdValue, "A floor is required.");
    const record = normalizeFloor({
      ...patch,
      id: floorId,
      sceneId,
      roomCode,
      updatedAtMillis: Date.now()
    }, floorId);
    await setDoc(floorReference(roomCode, sceneId, floorId), {
      ...record,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return record;
  }

  async function duplicateFloor(roomCode, sceneId, floor, overrides = {}) {
    const source = normalizeFloor(floor, floor?.id);
    return createFloor(roomCode, sceneId, {
      ...source,
      ...overrides,
      id: undefined,
      name: overrides.name || `${source.name} Copy`,
      order: Number.isFinite(Number(overrides.order)) ? overrides.order : source.order + 1
    });
  }

  async function createConnection(roomCodeValue, sceneIdValue, value = {}) {
    const roomCode = requireValue(roomCodeValue, "A room is required.");
    const sceneId = requireValue(sceneIdValue, "A location is required.");
    const reference = doc(connectionCollection(roomCode, sceneId));
    const now = Date.now();
    const record = normalizeConnection({
      ...value,
      id: reference.id,
      sceneId,
      roomCode,
      createdAtMillis: now,
      updatedAtMillis: now
    }, reference.id);
    await setDoc(reference, {
      ...record,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return record;
  }

  async function saveConnection(roomCodeValue, sceneIdValue, connectionIdValue, patch = {}) {
    const roomCode = requireValue(roomCodeValue, "A room is required.");
    const sceneId = requireValue(sceneIdValue, "A location is required.");
    const connectionId = requireValue(connectionIdValue, "A connection is required.");
    const record = normalizeConnection({
      ...patch,
      id: connectionId,
      sceneId,
      roomCode,
      updatedAtMillis: Date.now()
    }, connectionId);
    await setDoc(connectionReference(roomCode, sceneId, connectionId), {
      ...record,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return record;
  }

  async function deleteFloor(roomCode, sceneId, floorId) {
    const connections = await getDocs(connectionCollection(roomCode, sceneId));
    const batch = writeBatch(db);
    connections.docs.forEach((entry) => {
      const connection = normalizeConnection(entry.data(), entry.id);
      if (
        connection.source.floorId === floorId ||
        connection.destination.floorId === floorId
      ) {
        batch.delete(entry.ref);
      }
    });
    batch.delete(dmFloorNotesReference(roomCode, sceneId, floorId));
    batch.delete(floorReference(roomCode, sceneId, floorId));
    await batch.commit();
  }

  async function deleteScene(roomCode, sceneId) {
    const [floors, connections, dmNotes] = await Promise.all([
      getDocs(floorCollection(roomCode, sceneId)),
      getDocs(connectionCollection(roomCode, sceneId)),
      getDocs(dmFloorNotesCollection(roomCode, sceneId))
    ]);
    const documents = [
      ...floors.docs,
      ...connections.docs,
      ...dmNotes.docs,
      { ref: sceneReference(roomCode, sceneId) }
    ];
    for (let index = 0; index < documents.length; index += 400) {
      const batch = writeBatch(db);
      documents.slice(index, index + 400).forEach((entry) => batch.delete(entry.ref));
      await batch.commit();
    }
  }

  return Object.freeze({
    listenScenes(roomCode, onData, onError) {
      return listenCollection(sceneCollection(roomCode), normalizeScene, onData, onError);
    },
    listenFloors(roomCode, sceneId, onData, onError) {
      return listenCollection(floorCollection(roomCode, sceneId), normalizeFloor, onData, onError);
    },
    listenConnections(roomCode, sceneId, onData, onError) {
      return listenCollection(connectionCollection(roomCode, sceneId), normalizeConnection, onData, onError);
    },
    listenDmFloorNotes(roomCode, sceneId, onData, onError) {
      return onSnapshot(dmFloorNotesCollection(roomCode, sceneId), (snapshot) => {
        onData(snapshot.docs.map((entry) => ({
          id: entry.id,
          ...(entry.data() || {})
        })));
      }, onError);
    },
    createScene,
    saveScene,
    deleteScene,
    createFloor,
    saveFloor,
    duplicateFloor,
    deleteFloor,
    saveFloorDmNotes(roomCode, sceneId, floorId, notes) {
      return setDoc(dmFloorNotesReference(roomCode, sceneId, floorId), {
        floorId,
        sceneId,
        roomCode,
        notes: String(notes || "").slice(0, 12000),
        updatedAtMillis: Date.now(),
        updatedAt: serverTimestamp()
      });
    },
    createConnection,
    saveConnection,
    deleteConnection(roomCode, sceneId, connectionId) {
      return deleteDoc(connectionReference(roomCode, sceneId, connectionId));
    }
  });
}
