import assert from "node:assert/strict";
import test from "node:test";

import {
  createEffectEngine,
  normalizeEffectRequest,
  normalizeEffectsMode
} from "../vfx/effectEngine.js";
import {
  createDefaultEffectRegistry,
  createEffectRegistry
} from "../vfx/effectRegistry.js";
import {
  createParticleDescriptors,
  normalizeParticleCount
} from "../vfx/particles.js";
import {
  createPersistentEffectStore
} from "../vfx/persistentEffects.js";
import {
  createSpriteAnimator,
  getSpriteFrameStyle,
  normalizeSpriteOptions
} from "../vfx/spriteAnimator.js";

function createScheduler() {
  let timestamp = 0;
  let nextHandle = 1;
  const tasks = new Map();

  function setTimeout(callback, delay) {
    const handle = nextHandle++;
    tasks.set(handle, {
      callback,
      dueAt: timestamp + Math.max(0, Number(delay) || 0)
    });
    return handle;
  }

  function advance(milliseconds) {
    const target = timestamp + milliseconds;
    while (true) {
      const next = Array.from(tasks.entries())
        .filter(([, task]) => task.dueAt <= target)
        .sort((left, right) => (
          left[1].dueAt - right[1].dueAt ||
          left[0] - right[0]
        ))[0];
      if (!next) break;
      const [handle, task] = next;
      tasks.delete(handle);
      timestamp = task.dueAt;
      task.callback();
    }
    timestamp = target;
  }

  return {
    advance,
    clearTimeout: (handle) => tasks.delete(handle),
    now: () => timestamp,
    pending: () => tasks.size,
    setTimeout
  };
}

function createFrameHarness() {
  let nextHandle = 1;
  const callbacks = new Map();

  return {
    cancel: (handle) => callbacks.delete(handle),
    pending: () => callbacks.size,
    request(callback) {
      const handle = nextHandle++;
      callbacks.set(handle, callback);
      return handle;
    },
    step(timestamp) {
      const scheduled = Array.from(
        callbacks.values()
      );
      callbacks.clear();
      scheduled.forEach((callback) => {
        callback(timestamp);
      });
    }
  };
}

function createRenderer({
  failConnect = false,
  failRemove = false,
  failRender = false
} = {}) {
  const rendered = new Map();
  const removed = [];
  const modes = [];
  let connected = 0;
  let destroyed = 0;

  return {
    clear: () => rendered.clear(),
    connect: () => {
      if (failConnect) {
        throw new Error("expected connection failure");
      }
      connected += 1;
    },
    destroy: () => {
      destroyed += 1;
    },
    getStats: () => ({
      connected,
      destroyed,
      modes: [...modes],
      removed: [...removed],
      rendered: [...rendered.keys()]
    }),
    remove: (id) => {
      if (failRemove) {
        throw new Error("expected removal failure");
      }
      removed.push(id);
      return rendered.delete(id);
    },
    render: (effect) => {
      if (failRender) {
        throw new Error("expected renderer failure");
      }
      rendered.set(effect.id, effect);
    },
    setMode: (mode) => modes.push(mode)
  };
}

test("effect requests normalize every shared visual property", () => {
  const definition = createDefaultEffectRegistry()
    .get("procedural-pulse");
  const effect = normalizeEffectRequest({
    position: { x: "25", y: 40 },
    startPosition: { x: 1, y: 2 },
    endPosition: { x: 90, y: 80 },
    scale: 99,
    rotation: 99999,
    opacity: -4,
    duration: 999999,
    delay: -10,
    elevation: 2000,
    startElevation: -2000,
    endElevation: 17.7,
    intensity: 99
  }, {
    id: "test-effect",
    definition,
    mode: "reduced"
  });

  assert.deepEqual(effect.position, {
    x: 25,
    y: 40,
    xRatio: null,
    yRatio: null
  });
  assert.equal(effect.scale, 20);
  assert.equal(effect.rotation, 3600);
  assert.equal(effect.opacity, 0);
  assert.equal(effect.duration, 1000);
  assert.equal(effect.delay, 0);
  assert.equal(effect.elevation, 1000);
  assert.equal(effect.startElevation, -1000);
  assert.equal(effect.endElevation, 18);
  assert.equal(effect.intensity, 2);
  assert.equal(effect.effectsMode, "reduced");
  assert.equal(normalizeEffectsMode("OFF"), "off");
  assert.equal(normalizeEffectsMode("invalid"), "full");
});

test("delayed effects render, finish, and clean themselves up", () => {
  const scheduler = createScheduler();
  const renderer = createRenderer();
  const engine = createEffectEngine({
    renderer,
    scheduler
  });
  const result = engine.play({
    type: "procedural-pulse",
    delay: 50,
    duration: 100,
    position: { x: 10, y: 20 }
  });

  assert.equal(result.ok, true);
  assert.equal(engine.getState().effects[0].phase, "pending");
  assert.deepEqual(renderer.getStats().rendered, []);
  scheduler.advance(49);
  assert.deepEqual(renderer.getStats().rendered, []);
  scheduler.advance(1);
  assert.deepEqual(renderer.getStats().rendered, [result.id]);
  assert.equal(engine.getState().effects[0].phase, "active");
  scheduler.advance(100);
  assert.equal(engine.getState().activeCount, 0);
  assert.equal(scheduler.pending(), 0);
  assert.deepEqual(renderer.getStats().removed, [result.id]);
});

test("cancelling and destroying effects clears every timer and renderer record", () => {
  const scheduler = createScheduler();
  const renderer = createRenderer();
  const engine = createEffectEngine({ renderer, scheduler });
  const pending = engine.play({
    type: "procedural-pulse",
    delay: 100,
    duration: 100
  });
  const active = engine.play({
    type: "procedural-pulse",
    duration: 100
  });

  assert.equal(pending.cancel(), true);
  assert.equal(engine.getState().activeCount, 1);
  engine.destroy();
  assert.equal(engine.getState().activeCount, 0);
  assert.equal(scheduler.pending(), 0);
  assert.equal(renderer.getStats().destroyed, 1);
  assert.equal(engine.play({ type: "procedural-pulse" }).reason, "engine-destroyed");
  assert.ok(renderer.getStats().removed.includes(active.id));
});

test("off mode skips safely and changing to off clears active effects", () => {
  const scheduler = createScheduler();
  const renderer = createRenderer();
  const engine = createEffectEngine({ renderer, scheduler });
  const active = engine.play({
    type: "procedural-pulse",
    duration: 5000
  });

  assert.equal(engine.setMode("off"), "off");
  assert.equal(engine.getState().activeCount, 0);
  assert.ok(renderer.getStats().removed.includes(active.id));
  assert.deepEqual(
    engine.play({ type: "procedural-pulse" }),
    {
      ok: true,
      skipped: true,
      reason: "effects-off"
    }
  );
});

test("procedural and sprite render failures never escape the engine", () => {
  const renderer = createRenderer({ failRender: true });
  const engine = createEffectEngine({ renderer });

  ["procedural-pulse", "sprite"].forEach((type) => {
    assert.doesNotThrow(() => {
      const failed = engine.play({ type });
      assert.equal(failed.ok, false);
      assert.equal(failed.skipped, true);
    });
  });
  assert.equal(engine.getState().activeCount, 0);
  assert.equal(
    engine.play({ type: "missing" }).reason,
    "unknown-effect"
  );
});

test("renderer connection and cleanup failures remain presentation-only", () => {
  const unavailable = createEffectEngine({
    renderer: createRenderer({ failConnect: true })
  });
  assert.deepEqual(
    unavailable.play({ type: "procedural-pulse" }),
    {
      ok: false,
      skipped: true,
      reason: "renderer-unavailable"
    }
  );

  const scheduler = createScheduler();
  const cleanupFailure = createEffectEngine({
    renderer: createRenderer({ failRemove: true }),
    scheduler
  });
  const active = cleanupFailure.play({
    type: "procedural-pulse",
    duration: 10
  });
  assert.equal(active.ok, true);
  assert.doesNotThrow(() => scheduler.advance(10));
  assert.equal(cleanupFailure.getState().activeCount, 0);
});

test("the active-effect limit evicts the oldest visual safely", () => {
  const scheduler = createScheduler();
  const renderer = createRenderer();
  const engine = createEffectEngine({
    renderer,
    scheduler,
    maximumActiveEffects: 2
  });
  const first = engine.play({
    type: "procedural-pulse",
    duration: 5000
  });
  const second = engine.play({
    type: "procedural-pulse",
    duration: 5000
  });
  const third = engine.play({
    type: "procedural-pulse",
    duration: 5000
  });

  assert.equal(engine.getState().activeCount, 2);
  assert.deepEqual(
    engine.getState().effects.map(({ id }) => id),
    [second.id, third.id]
  );
  assert.ok(renderer.getStats().removed.includes(first.id));
});

test("particle helpers enforce full, reduced, and off caps", () => {
  assert.equal(normalizeParticleCount(Infinity), 0);
  assert.equal(normalizeParticleCount(9999), 240);
  assert.equal(
    normalizeParticleCount(9999, { mode: "reduced" }),
    24
  );
  assert.equal(
    normalizeParticleCount(12, { mode: "off" }),
    0
  );
  const particles = createParticleDescriptors({
    count: 4,
    distance: 20,
    size: 3
  }, {
    random: () => 0.5
  });
  assert.equal(particles.length, 4);
  assert.ok(particles.every(({ size }) => size === 3));
});

test("registries reject duplicates and keep procedural and sprite definitions", () => {
  const registry = createEffectRegistry([{
    id: "spark",
    kind: "procedural"
  }, {
    id: "sprite-sheet",
    kind: "sprite"
  }]);

  assert.equal(registry.get("SPARK").id, "spark");
  assert.equal(registry.get("sprite-sheet").kind, "sprite");
  assert.throws(
    () => registry.register({ id: "spark" }),
    /already exists/
  );
  assert.equal(registry.unregister("spark"), true);
  assert.equal(registry.get("spark"), null);
});

test("persistent effects are bounded and expire predictably", () => {
  let timestamp = 100;
  const store = createPersistentEffectStore({
    maximum: 2,
    now: () => timestamp
  });
  store.add({ id: "one" }, { lifetimeMs: 20 });
  store.add({ id: "two" }, { lifetimeMs: 40 });
  store.add({ id: "three" }, { lifetimeMs: 60 });
  assert.deepEqual(
    store.list().map(({ effect }) => effect.id),
    ["two", "three"]
  );
  timestamp = 141;
  assert.deepEqual(store.prune(), ["two"]);
  assert.equal(store.size(), 1);
});

test("single images and sprite sheets share bounded sprite animation options", () => {
  const normalized = normalizeSpriteOptions({
    src: "spell.png",
    frameWidth: 64,
    frameHeight: 32,
    frameCount: 999,
    framesPerSecond: 999,
    loops: 999
  });
  assert.equal(normalized.src, "spell.png");
  assert.equal(normalized.frameCount, 240);
  assert.equal(normalized.framesPerSecond, 60);
  assert.equal(normalized.loops, 100);
  assert.equal(normalized.columns, 240);
  assert.equal(normalized.rows, 1);
  assert.equal(normalized.loop, false);
  assert.deepEqual(
    getSpriteFrameStyle(normalized, 2),
    {
      width: "64px",
      height: "32px",
      backgroundPosition: "-128px 0px"
    }
  );

  const grid = normalizeSpriteOptions({
    src: "fire-impact.png",
    frameWidth: 160,
    frameHeight: 160,
    frameCount: 16,
    columns: 4,
    rows: 4,
    loop: false
  });
  assert.equal(grid.columns, 4);
  assert.equal(grid.rows, 4);
  assert.equal(grid.removeOnComplete, true);
  assert.deepEqual(
    getSpriteFrameStyle(grid, 6),
    {
      width: "160px",
      height: "160px",
      backgroundPosition: "-320px -160px"
    }
  );
  assert.equal(
    normalizeSpriteOptions({
      frameCount: 3,
      columns: 999
    }).columns,
    3
  );
  assert.deepEqual(
    normalizeSpriteOptions({
      frameCount: 15,
      rows: 3
    }),
    {
      src: "",
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 15,
      startFrame: 0,
      endFrame: 14,
      columns: 5,
      rows: 3,
      framesPerSecond: 24,
      loops: 1,
      loop: false,
      removeOnComplete: true
    }
  );
});

test("multi-row sprite playback advances rows and cleans up one-shots", () => {
  const frames = createFrameHarness();
  let removed = 0;
  let completed = 0;
  const element = {
    style: {},
    remove: () => {
      removed += 1;
    }
  };
  const animator = createSpriteAnimator({
    element,
    options: {
      src: "transparent-fire.png",
      frameWidth: 160,
      frameHeight: 160,
      frameCount: 16,
      columns: 4,
      rows: 4,
      framesPerSecond: 10,
      loop: false
    },
    requestFrame: (callback) => (
      frames.request(callback)
    ),
    cancelFrame: (handle) => frames.cancel(handle),
    onComplete: () => {
      completed += 1;
      throw new Error("observer failures stay presentation-only");
    }
  });

  assert.equal(
    element.style.backgroundImage,
    'url("transparent-fire.png")'
  );
  assert.equal(element.style.backgroundSize, "640px 640px");
  assert.equal(animator.start(), true);
  frames.step(0);
  assert.equal(element.style.backgroundPosition, "0px 0px");
  frames.step(600);
  assert.equal(
    element.style.backgroundPosition,
    "-320px -160px"
  );
  assert.doesNotThrow(() => frames.step(1600));
  assert.equal(animator.getState().running, false);
  assert.equal(animator.getState().completed, true);
  assert.equal(animator.start(), false);
  assert.equal(element.style.backgroundImage, "none");
  assert.equal(element.style.backgroundSize, "auto");
  assert.equal(removed, 1);
  assert.equal(completed, 1);
  assert.equal(frames.pending(), 0);
});

test("looping WebP sprites stay bounded by explicit engine cleanup", () => {
  const frames = createFrameHarness();
  let removed = 0;
  let completed = 0;
  const element = {
    style: {},
    remove: () => {
      removed += 1;
    }
  };
  const animator = createSpriteAnimator({
    element,
    options: {
      src: "neutral-glow.webp",
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 4,
      columns: 2,
      rows: 2,
      framesPerSecond: 10,
      loop: true,
      removeOnComplete: true
    },
    requestFrame: (callback) => (
      frames.request(callback)
    ),
    cancelFrame: (handle) => frames.cancel(handle),
    onComplete: () => {
      completed += 1;
    }
  });

  assert.equal(animator.getState().options.loop, true);
  assert.equal(
    animator.getState().options.removeOnComplete,
    false
  );
  animator.start();
  frames.step(0);
  frames.step(1000);
  assert.equal(
    element.style.backgroundPosition,
    "0px -64px"
  );
  assert.equal(animator.getState().running, true);
  assert.equal(removed, 0);
  assert.equal(completed, 0);
  animator.destroy();
  assert.equal(animator.getState().running, false);
  assert.equal(animator.getState().destroyed, true);
  assert.equal(animator.start(), false);
  assert.equal(element.style.backgroundImage, "none");
  assert.equal(frames.pending(), 0);
});
