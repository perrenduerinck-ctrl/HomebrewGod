import test from "node:test";
import assert from "node:assert/strict";
import {
  createRealtimeListenerRegistry
} from "../realtimeListeners.js";
import {
  createCharacterRealtimePersistence
} from "../characterCreator/realtimePersistence.js";

function createHarness() {
  const callbacks = new Map();
  const stopped = [];
  const state = {
    viewMode: "library",
    currentStepId: "basics",
    characterRoomCode: null,
    characterCache: [],
    classRoomCode: null,
    roomClassCache: []
  };
  let roomCode = "ROOM-A";
  const listeners =
    createRealtimeListenerRegistry();
  const deps = {
    db: {},
    collection(
      _db,
      _rooms,
      scopedRoomCode,
      collectionName
    ) {
      return {
        roomCode: scopedRoomCode,
        collectionName
      };
    },
    onSnapshot(reference, next, error) {
      const key =
        `${reference.roomCode}:${reference.collectionName}`;
      callbacks.set(key, { next, error });

      return () => {
        stopped.push(key);
      };
    }
  };
  const changedCaches = [];
  const service =
    createCharacterRealtimePersistence({
      deps,
      listeners,
      getRoomCode: () => roomCode,
      hasFirestoreTools: () => true,
      getState: () => state,
      onCacheChanged: (cacheKey) => {
        changedCaches.push(cacheKey);
      }
    });
  const descriptors = [
    {
      id: "characters",
      label: "characters",
      listenerName: "characters",
      collectionName: "characters",
      roomKey: "characterRoomCode",
      cacheKey: "characterCache",
      normalizeRecord: (record) => record
    },
    {
      id: "classes",
      label: "classes",
      listenerName: "classes",
      collectionName: "classes",
      roomKey: "classRoomCode",
      cacheKey: "roomClassCache",
      normalizeRecord: (record) => record,
      optional: true
    }
  ];

  return {
    callbacks,
    changedCaches,
    descriptors,
    service,
    state,
    stopped,
    setRoomCode(value) {
      roomCode = value;
    }
  };
}

function snapshot(id, data = {}) {
  return {
    docs: [
      {
        id,
        data: () => data
      }
    ]
  };
}

test("creator realtime persistence listens only for the active view", () => {
  const harness = createHarness();

  harness.service.sync(
    harness.descriptors,
    {
      viewMode: "library",
      currentStepId: "basics"
    }
  );

  assert.deepEqual(
    harness.service.getSnapshot().active.map(
      (entry) => entry.name
    ),
    ["characters"]
  );

  harness.callbacks
    .get("ROOM-A:characters")
    .next(snapshot("hero", { name: "Hero" }));

  assert.deepEqual(
    harness.state.characterCache,
    [
      {
        id: "hero",
        docId: "hero",
        name: "Hero"
      }
    ]
  );

  harness.service.sync(
    harness.descriptors,
    {
      viewMode: "builder",
      currentStepId: "class"
    }
  );

  assert.deepEqual(
    harness.service.getSnapshot().active.map(
      (entry) => entry.name
    ),
    ["classes"]
  );
  assert.deepEqual(
    harness.state.characterCache,
    [
      {
        id: "hero",
        docId: "hero",
        name: "Hero"
      }
    ]
  );
  assert.deepEqual(
    harness.stopped,
    ["ROOM-A:characters"]
  );
});

test("switching rooms stops the old scope and blocks its late callback", () => {
  const harness = createHarness();

  harness.service.sync(
    harness.descriptors,
    {
      viewMode: "builder",
      currentStepId: "class"
    }
  );

  const oldCallback = harness.callbacks.get(
    "ROOM-A:classes"
  ).next;

  harness.setRoomCode("ROOM-B");
  harness.service.sync(
    harness.descriptors,
    {
      viewMode: "builder",
      currentStepId: "class"
    }
  );

  oldCallback(
    snapshot("old-class", {
      name: "Old Class"
    })
  );

  assert.deepEqual(
    harness.state.roomClassCache,
    []
  );
  assert.deepEqual(
    harness.stopped,
    ["ROOM-A:classes"]
  );

  harness.callbacks
    .get("ROOM-B:classes")
    .next(
      snapshot("new-class", {
        name: "New Class"
      })
    );

  assert.equal(
    harness.state.roomClassCache[0].name,
    "New Class"
  );
});

test("cleanup unsubscribes and clears room-scoped caches", () => {
  const harness = createHarness();

  harness.service.sync(
    harness.descriptors,
    {
      viewMode: "library",
      currentStepId: "basics"
    }
  );
  harness.callbacks
    .get("ROOM-A:characters")
    .next(snapshot("hero"));

  const result = harness.service.cleanup(
    harness.descriptors
  );

  assert.equal(result.activeCount, 0);
  assert.equal(
    harness.state.characterRoomCode,
    null
  );
  assert.deepEqual(
    harness.state.characterCache,
    []
  );
});
