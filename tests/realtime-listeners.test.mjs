import test from "node:test";
import assert from "node:assert/strict";
import {
  createRealtimeListenerRegistry
} from "../realtimeListeners.js";

test("realtime listeners reuse one subscription for the same scope", () => {
  const registry =
    createRealtimeListenerRegistry();
  let subscriptions = 0;
  let unsubscriptions = 0;

  const subscribe = () => {
    subscriptions += 1;
    return () => {
      unsubscriptions += 1;
    };
  };

  assert.equal(
    registry.connect("characters", "ROOM-A", subscribe),
    true
  );
  assert.equal(
    registry.connect("characters", "ROOM-A", subscribe),
    false
  );
  assert.equal(subscriptions, 1);
  assert.equal(unsubscriptions, 0);
  assert.equal(registry.getSnapshot().activeCount, 1);
});

test("switching scope unsubscribes the old listener and blocks late callbacks", () => {
  const registry =
    createRealtimeListenerRegistry();
  const guards = [];
  let unsubscriptions = 0;

  function subscribe({ isCurrent }) {
    guards.push(isCurrent);
    return () => {
      unsubscriptions += 1;
    };
  }

  registry.connect("maps", "ROOM-A", subscribe);
  registry.connect("maps", "ROOM-B", subscribe);

  assert.equal(unsubscriptions, 1);
  assert.equal(guards[0](), false);
  assert.equal(guards[1](), true);
  assert.equal(
    registry.has("maps", "ROOM-B"),
    true
  );
  assert.equal(
    registry.getSnapshot().metrics
      .staleCallbacksBlocked,
    1
  );
});

test("stop and stopAll unsubscribe each active listener exactly once", () => {
  const stopErrors = [];
  const registry =
    createRealtimeListenerRegistry({
      onStopError: (error, context) => {
        stopErrors.push({ error, context });
      }
    });
  const stopped = [];

  registry.connect("room", "ROOM-A", () => {
    return () => stopped.push("room");
  });
  registry.connect("tokens", "ROOM-A", () => {
    return () => stopped.push("tokens");
  });

  assert.equal(registry.stop("room"), true);
  assert.equal(registry.stop("room"), false);
  registry.stopAll();

  assert.deepEqual(stopped, ["room", "tokens"]);
  assert.deepEqual(stopErrors, []);
  assert.equal(registry.getSnapshot().activeCount, 0);
});
