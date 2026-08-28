import assert from "node:assert/strict";
import test from "node:test";

import {
  CASTING_SEQUENCE_PHASES,
  DEFAULT_CASTING_SEQUENCES,
  MAX_EFFECT_INSTANCES_PER_SEQUENCE_PHASE,
  createCastingSequenceRegistry,
  createCastingSequenceSystem,
  createDefaultCastingSequenceRegistry,
  defineCastingSequence
} from "../vfx/castingSequence.js";
import {
  createSpellVfxEvent
} from "../vfx/castEvent.js";
import {
  getDefaultSpellById
} from "../data/defaultSpells.js";

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

function createEffectEngine({
  failAt = -1,
  mode = "full"
} = {}) {
  const requests = [];
  const cancelled = [];

  return {
    getState: () => ({ mode }),
    getStats: () => ({
      cancelled: [...cancelled],
      requests: [...requests]
    }),
    play(request) {
      const index = requests.length;
      requests.push(request);
      if (index === failAt) {
        throw new Error("expected visual failure");
      }
      const id = `effect-${index + 1}`;
      return {
        ok: true,
        id,
        cancel() {
          cancelled.push(id);
          return true;
        }
      };
    }
  };
}

test("every default casting sequence exposes the six reusable phases", () => {
  assert.equal(DEFAULT_CASTING_SEQUENCES.length, 6);
  DEFAULT_CASTING_SEQUENCES.forEach((definition) => {
    assert.deepEqual(
      definition.phases.map(({ phase }) => phase),
      CASTING_SEQUENCE_PHASES
    );
    assert.equal(definition.schemaVersion, 1);
    assert.ok(definition.totalDuration > 0);
    assert.equal(Object.isFrozen(definition), true);
    assert.equal(Object.isFrozen(definition.phases), true);
  });
});

test("Fireball, Lightning Bolt, and Burning Hands resolve declaratively", () => {
  const registry = createDefaultCastingSequenceRegistry();
  const fireball = createSpellVfxEvent({
    spell: getDefaultSpellById("fireball")
  });
  const lightningBolt = createSpellVfxEvent({
    spell: getDefaultSpellById("lightning-bolt")
  });
  const burningHands = createSpellVfxEvent({
    spell: getDefaultSpellById("burning-hands")
  });

  assert.equal(registry.resolve(fireball).id, "generic-burst");
  assert.equal(registry.resolve(lightningBolt).id, "generic-line");
  assert.equal(registry.resolve(burningHands).id, "generic-cone");
  assert.deepEqual(
    registry.resolve(fireball).phases.map(({ phase }) => phase),
    ["charge", "release", "travel", "impact", "aftermath", "cleanup"]
  );
});

test("a casting sequence advances in order and uses authoritative event points", () => {
  const scheduler = createScheduler();
  const effectEngine = createEffectEngine();
  const phases = [];
  const system = createCastingSequenceSystem({
    effectEngine,
    scheduler,
    onPhase: ({ phase }) => phases.push(phase)
  });
  const event = createSpellVfxEvent({
    spell: getDefaultSpellById("fireball"),
    casterPoint: { x: 10, y: 20 },
    targetPoint: { x: 100, y: 120 },
    casterElevation: 5,
    targetElevation: 15,
    intensity: 3
  });
  const result = system.play(event);

  assert.equal(result.ok, true);
  assert.deepEqual(phases, ["charge"]);
  assert.equal(system.getState().sequences[0].phase, "charge");
  assert.deepEqual(
    effectEngine.getStats().requests[0].position,
    event.casterPoint
  );

  scheduler.advance(result.definition.totalDuration);
  assert.deepEqual(phases, CASTING_SEQUENCE_PHASES);
  const requests = effectEngine.getStats().requests;
  assert.deepEqual(requests[2].startPosition, event.casterPoint);
  assert.deepEqual(requests[2].endPosition, event.targetPoint);
  assert.equal(requests[2].metadata.phase, "travel");
  assert.equal(requests[3].metadata.phase, "impact");
  assert.deepEqual(requests[3].position, event.targetPoint);
  assert.equal(requests.every(({ intensity }) => intensity === 3), true);
  assert.equal(system.getState().activeCount, 0);
  assert.equal(scheduler.pending(), 0);
  assert.equal(effectEngine.getStats().cancelled.length, 5);
});

test("custom phases compose multiple bounded effects and affected-token impacts", () => {
  const affectedTokens = Array.from({ length: 100 }, (_, index) => ({
    id: `token-${index}`,
    name: `Token ${index}`,
    center: { x: index, y: index + 1 }
  }));
  const definition = defineCastingSequence({
    id: "many-impacts",
    match: { spellIds: ["test-spell"] },
    phases: {
      impact: {
        duration: Infinity,
        effects: Array.from({ length: 20 }, () => ({
          type: "procedural-pulse",
          anchor: "affected-tokens",
          intensityOffset: 999,
          scale: Infinity
        }))
      }
    }
  });
  const registry = createCastingSequenceRegistry([definition]);
  const scheduler = createScheduler();
  const effectEngine = createEffectEngine();
  const system = createCastingSequenceSystem({
    effectEngine,
    registry,
    scheduler
  });
  const result = system.play({
    spellId: "test-spell",
    deliveryType: "impact",
    intensity: 5,
    targetPoint: { x: 0, y: 0 },
    affectedTokens
  });

  scheduler.advance(
    definition.phases
      .slice(0, 3)
      .reduce((sum, phase) => sum + phase.delay + phase.duration, 0)
  );
  const requests = effectEngine.getStats().requests;
  assert.equal(result.ok, true);
  assert.equal(
    requests.length,
    MAX_EFFECT_INSTANCES_PER_SEQUENCE_PHASE
  );
  assert.equal(requests.every(({ intensity }) => intensity === 5), true);
  assert.equal(requests.every(({ scale }) => scale === 1), true);
  assert.ok(requests.every(({ metadata }) => metadata.affectedTokenId));
});

test("cancellation, capacity, and visual failures remain cleanup-safe", () => {
  const scheduler = createScheduler();
  const effectEngine = createEffectEngine({ failAt: 0 });
  const system = createCastingSequenceSystem({
    effectEngine,
    scheduler,
    maximumActiveSequences: 1
  });
  const event = createSpellVfxEvent({
    spell: getDefaultSpellById("fire-bolt"),
    casterPoint: { x: 1, y: 2 },
    targetPoint: { x: 3, y: 4 }
  });

  const first = system.play(event);
  assert.equal(first.ok, true);
  assert.equal(system.getState().sequences[0].failures, 1);
  const second = system.play(event);
  assert.equal(second.ok, true);
  assert.equal(system.getState().activeCount, 1);
  assert.equal(first.cancel(), false);
  assert.equal(second.cancel(), true);
  assert.equal(system.getState().activeCount, 0);
  assert.equal(scheduler.pending(), 0);
  assert.doesNotThrow(() => system.destroy());
  assert.equal(
    system.play(event).reason,
    "sequence-system-destroyed"
  );
});

test("off mode skips sequences and registry overrides stay generic", () => {
  const offSystem = createCastingSequenceSystem({
    effectEngine: createEffectEngine({ mode: "off" })
  });
  assert.deepEqual(
    offSystem.play({ deliveryType: "point" }),
    {
      ok: true,
      skipped: true,
      reason: "effects-off"
    }
  );

  const registry = createCastingSequenceRegistry();
  registry.register({
    id: "spell-specific",
    priority: 1,
    match: { spellIds: ["homebrew-spell"] }
  });
  registry.register({
    id: "generic-point",
    priority: 100,
    match: { deliveryTypes: ["point"] }
  });
  assert.equal(
    registry.resolve({
      spellId: "homebrew-spell",
      deliveryType: "point"
    }).id,
    "spell-specific"
  );
  assert.throws(
    () => registry.register({ id: "spell-specific" }),
    /already exists/i
  );
});
