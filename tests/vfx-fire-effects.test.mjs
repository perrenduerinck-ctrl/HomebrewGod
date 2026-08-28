import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  createSpellVfxEvent
} from "../vfx/castEvent.js";
import {
  createCastingSequenceSystem,
  createDefaultCastingSequenceRegistry
} from "../vfx/castingSequence.js";
import {
  createDefaultEffectRegistry
} from "../vfx/effectRegistry.js";
import {
  FIRE_CASTING_SEQUENCE_DEFINITIONS,
  FIRE_EFFECT_DEFINITIONS,
  FIRE_EFFECT_IDS,
  FIRE_OPTIONAL_ASSET_PATHS,
  FIRE_SPRITE_EFFECT_ID
} from "../vfx/fireEffects.js";
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

function createEffectEngine() {
  const requests = [];
  const cancelled = [];

  return {
    getState: () => ({ mode: "full" }),
    getStats: () => ({
      cancelled: [...cancelled],
      requests: [...requests]
    }),
    play(request) {
      requests.push(request);
      const id = `fire-effect-${requests.length}`;
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

test("the fire vertical slice registers every required procedural effect", () => {
  assert.deepEqual(FIRE_EFFECT_IDS, [
    "fire-glow",
    "fire-embers",
    "fire-flames",
    "fire-smoke",
    "fire-explosion",
    "fire-trail",
    "fire-scorch"
  ]);
  assert.deepEqual(
    FIRE_EFFECT_DEFINITIONS
      .filter(({ kind }) => kind === "procedural")
      .map(({ id }) => id),
    FIRE_EFFECT_IDS
  );
  assert.equal(
    FIRE_EFFECT_DEFINITIONS
      .filter(({ id }) => id !== FIRE_SPRITE_EFFECT_ID)
      .every(({ kind }) => kind === "procedural"),
    true
  );

  const registry = createDefaultEffectRegistry();
  FIRE_EFFECT_IDS.forEach((id) => {
    assert.equal(registry.get(id)?.kind, "procedural");
  });
  assert.deepEqual(FIRE_OPTIONAL_ASSET_PATHS, {
    ember: "assets/vfx/fire/ember.webp",
    smoke: "assets/vfx/fire/smoke.webp",
    glow: "assets/vfx/fire/glow.webp",
    impact: "assets/vfx/fire/fire-impact.webp",
    impactSheet: "assets/vfx/fire/fire-impact-spritesheet.png",
    scorch: "assets/vfx/fire/scorch.webp"
  });
  assert.equal(
    registry.get(FIRE_SPRITE_EFFECT_ID)?.kind,
    "sprite"
  );
  assert.equal(
    registry.get(FIRE_SPRITE_EFFECT_ID)?.sprite.columns,
    4
  );
});

test("the supplied fire artwork is used as an optional 4 by 4 impact sheet", () => {
  const asset = readFileSync(
    new URL(
      `../${FIRE_OPTIONAL_ASSET_PATHS.impactSheet}`,
      import.meta.url
    )
  );
  assert.ok(asset.byteLength > 0);
  assert.deepEqual(
    Array.from(asset.subarray(0, 8)),
    [137, 80, 78, 71, 13, 10, 26, 10]
  );

  const sprite = FIRE_EFFECT_DEFINITIONS.find(
    ({ id }) => id === FIRE_SPRITE_EFFECT_ID
  );
  assert.equal(sprite.sprite.frameCount, 16);
  assert.equal(sprite.sprite.columns, 4);
  assert.equal(sprite.sprite.rows, 4);
  assert.equal(sprite.sprite.loops, 1);
  assert.equal(sprite.sprite.loop, false);
  assert.equal(sprite.sprite.removeOnComplete, true);
});

test("the fire slice has procedural styles without mandatory image assets", () => {
  const css = readFileSync(
    new URL("../assets/styles/app.css", import.meta.url),
    "utf8"
  );

  FIRE_EFFECT_IDS.forEach((id) => {
    assert.match(css, new RegExp(`\\.hg-vfx-${id}`));
  });
  [
    "hg-vfx-fire-glow-ring",
    "hg-vfx-fire-ember",
    "hg-vfx-fire-flame",
    "hg-vfx-fire-smoke",
    "hg-vfx-fire-explosion-ring",
    "hg-vfx-fire-trail",
    "hg-vfx-fire-scorch"
  ].forEach((animation) => {
    assert.match(css, new RegExp(`@keyframes ${animation}`));
  });
  assert.doesNotMatch(css, /assets\/vfx\/fire\//);
});

test("fire sequences are generic by delivery type and damage type", () => {
  assert.deepEqual(
    FIRE_CASTING_SEQUENCE_DEFINITIONS.map(({ id }) => id),
    [
      "fire-projectile",
      "fire-burst",
      "fire-directional",
      "fire-impact"
    ]
  );

  const registry = createDefaultCastingSequenceRegistry();
  assert.equal(registry.resolve({
    damageTypes: ["fire"],
    deliveryType: "projectile"
  }).id, "fire-projectile");
  assert.equal(registry.resolve({
    damageTypes: ["fire"],
    deliveryType: "burst"
  }).id, "fire-burst");
  assert.equal(registry.resolve({
    damageTypes: ["fire"],
    deliveryType: "cone"
  }).id, "fire-directional");
  assert.equal(registry.resolve({
    damageTypes: ["fire"],
    deliveryType: "self"
  }).id, "fire-impact");
  assert.equal(registry.resolve({
    damageTypes: ["cold"],
    deliveryType: "projectile"
  }).id, "generic-projectile");
});

test("a confirmed fire burst composes all seven visuals and cleans up", () => {
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
    casterPoint: { x: 15, y: 25 },
    targetPoint: { x: 150, y: 125 },
    casterElevation: 5,
    targetElevation: 15,
    intensity: 3
  });
  const result = system.play(event);

  assert.equal(result.ok, true);
  assert.equal(result.definition.id, "fire-burst");
  assert.deepEqual(
    effectEngine.getStats().requests.map(({ type }) => type),
    ["fire-glow", "fire-embers"]
  );

  scheduler.advance(result.definition.totalDuration);
  const requests = effectEngine.getStats().requests;
  const types = new Set(requests.map(({ type }) => type));
  FIRE_EFFECT_IDS.forEach((id) => assert.equal(types.has(id), true));
  assert.deepEqual(phases, [
    "charge",
    "release",
    "travel",
    "impact",
    "aftermath",
    "cleanup"
  ]);

  const trail = requests.find(({ type }) => type === "fire-trail");
  assert.deepEqual(trail.startPosition, event.casterPoint);
  assert.deepEqual(trail.endPosition, event.targetPoint);
  assert.equal(
    requests.every(({ metadata }) => (
      metadata.damageType === "fire" &&
      metadata.eventType === "confirmed-cast-sequence"
    )),
    true
  );
  assert.equal(system.getState().activeCount, 0);
  assert.equal(scheduler.pending(), 0);
  assert.equal(effectEngine.getStats().cancelled.length, requests.length);
});

test("fire effect and sequence collections stay immutable and bounded", () => {
  assert.equal(Object.isFrozen(FIRE_EFFECT_DEFINITIONS), true);
  assert.equal(Object.isFrozen(FIRE_CASTING_SEQUENCE_DEFINITIONS), true);
  FIRE_EFFECT_DEFINITIONS
    .filter(({ kind }) => kind === "procedural")
    .forEach((definition) => {
    assert.equal(Object.isFrozen(definition), true);
    assert.ok(definition.particles.count <= 24);
    assert.ok((definition.particles.distance ?? 0) <= 92);
    assert.ok((definition.particles.duration ?? 0) <= 1500);
    });
  FIRE_CASTING_SEQUENCE_DEFINITIONS.forEach((definition) => {
    assert.equal(Object.isFrozen(definition), true);
    assert.equal(Object.isFrozen(definition.phases), true);
    assert.ok(definition.phases.aftermath.duration <= 1400);
  });

  const fireBurst = FIRE_CASTING_SEQUENCE_DEFINITIONS.find(
    ({ id }) => id === "fire-burst"
  );
  assert.equal(
    fireBurst.phases.impact.effects.some(
      ({ type }) => type === FIRE_SPRITE_EFFECT_ID
    ),
    true
  );
  assert.equal(
    fireBurst.phases.impact.effects.some(
      ({ type }) => type === "fire-explosion"
    ),
    true
  );
});
