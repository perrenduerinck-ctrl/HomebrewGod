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
  FIRE_BOLT_IMPACT_EFFECT_ID,
  FIRE_BOLT_PROJECTILE_EFFECT_ID,
  FIREBALL_CLIP_EFFECT_ID,
  FIREBALL_PROJECTILE_EFFECT_ID,
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
    "fire-impact-flash",
    "fire-shock-ring",
    "fire-debris-burst",
    "fire-trail",
    "fire-scorch"
  ]);
  assert.deepEqual(
    FIRE_EFFECT_DEFINITIONS
      .filter(({ kind }) => kind === "procedural")
      .map(({ id }) => id),
    FIRE_EFFECT_IDS
  );
  assert.deepEqual(
    FIRE_EFFECT_DEFINITIONS
      .filter(({ kind }) => kind === "sprite")
      .map(({ id }) => id),
    [
      FIRE_SPRITE_EFFECT_ID,
      FIRE_BOLT_PROJECTILE_EFFECT_ID,
      FIRE_BOLT_IMPACT_EFFECT_ID,
      FIREBALL_PROJECTILE_EFFECT_ID,
      FIREBALL_CLIP_EFFECT_ID
    ]
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
    fireBoltProjectile: "assets/vfx/fire/fire-bolt-projectile.png",
    fireBoltImpact: "assets/vfx/fire/fire-bolt-impact.png",
    fireballProjectile: "assets/vfx/fire/fireball-projectile.png",
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
  assert.equal(
    registry.get(FIRE_BOLT_PROJECTILE_EFFECT_ID)?.kind,
    "sprite"
  );
  assert.equal(
    registry.get(FIRE_BOLT_IMPACT_EFFECT_ID)?.kind,
    "sprite"
  );
  assert.equal(
    registry.get(FIREBALL_CLIP_EFFECT_ID)?.kind,
    "sprite"
  );
});

test("the supplied fire artwork includes bounded spell sprites", () => {
  const impactSheet = readFileSync(
    new URL(
      `../${FIRE_OPTIONAL_ASSET_PATHS.impactSheet}`,
      import.meta.url
    )
  );
  const projectile = readFileSync(new URL(
    `../${FIRE_OPTIONAL_ASSET_PATHS.fireBoltProjectile}`,
    import.meta.url
  ));
  const impact = readFileSync(new URL(
    `../${FIRE_OPTIONAL_ASSET_PATHS.fireBoltImpact}`,
    import.meta.url
  ));
  const fireballProjectile = readFileSync(new URL(
    `../${FIRE_OPTIONAL_ASSET_PATHS.fireballProjectile}`,
    import.meta.url
  ));

  [impactSheet, projectile, impact, fireballProjectile].forEach((asset) => {
    assert.ok(asset.byteLength > 0);
    assert.deepEqual(
      Array.from(asset.subarray(0, 8)),
      [137, 80, 78, 71, 13, 10, 26, 10]
    );
  });
  assert.deepEqual(
    [projectile.readUInt32BE(16), projectile.readUInt32BE(20)],
    [512, 192]
  );
  assert.deepEqual(
    [impact.readUInt32BE(16), impact.readUInt32BE(20)],
    [512, 512]
  );
  assert.deepEqual(
    [
      fireballProjectile.readUInt32BE(16),
      fireballProjectile.readUInt32BE(20)
    ],
    [1254, 1254]
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

  const projectileDefinition = FIRE_EFFECT_DEFINITIONS.find(
    ({ id }) => id === FIRE_BOLT_PROJECTILE_EFFECT_ID
  );
  assert.equal(projectileDefinition.sprite.frameCount, 1);
  assert.equal(projectileDefinition.sprite.removeOnComplete, false);
  assert.match(
    projectileDefinition.sprite.src,
    /fire-bolt-projectile\.png$/
  );

  const impactDefinition = FIRE_EFFECT_DEFINITIONS.find(
    ({ id }) => id === FIRE_BOLT_IMPACT_EFFECT_ID
  );
  assert.equal(impactDefinition.sprite.frameCount, 1);
  assert.equal(impactDefinition.sprite.removeOnComplete, false);
  assert.match(
    impactDefinition.sprite.src,
    /fire-bolt-impact\.png$/
  );

  const fireballProjectileDefinition = FIRE_EFFECT_DEFINITIONS.find(
    ({ id }) => id === FIREBALL_PROJECTILE_EFFECT_ID
  );
  assert.equal(fireballProjectileDefinition.sprite.frameCount, 1);
  assert.equal(
    fireballProjectileDefinition.sprite.removeOnComplete,
    false
  );
  assert.match(
    fireballProjectileDefinition.sprite.src,
    /fireball-projectile\.png$/
  );

  const fireballClipDefinition = FIRE_EFFECT_DEFINITIONS.find(
    ({ id }) => id === FIREBALL_CLIP_EFFECT_ID
  );
  assert.deepEqual(Object.keys(fireballClipDefinition.clips), [
    "charge", "release", "travel", "impact", "aftermath"
  ]);
  assert.equal(fireballClipDefinition.clips.travel.loop, true);
  assert.equal(fireballClipDefinition.clips.impact.frameCount, 36);
  assert.equal(fireballClipDefinition.clips.impact.columns, 6);
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
      "fire-bolt",
      "fireball",
      "fire-projectile",
      "fire-burst",
      "fire-directional",
      "fire-impact"
    ]
  );

  const registry = createDefaultCastingSequenceRegistry();
  assert.equal(registry.resolve({
    spellId: "fire-bolt",
    damageTypes: ["fire"],
    deliveryType: "projectile"
  }).id, "fire-bolt");
  assert.equal(registry.resolve({
    spellId: "fireball",
    damageTypes: ["fire"],
    deliveryType: "burst"
  }).id, "fireball");
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

test("Fire Bolt follows spell geometry from charge through ember fade", () => {
  const scheduler = createScheduler();
  const effectEngine = createEffectEngine();
  const system = createCastingSequenceSystem({
    effectEngine,
    scheduler
  });
  const event = createSpellVfxEvent({
    spell: getDefaultSpellById("fire-bolt"),
    casterPoint: { x: 24, y: 36 },
    targetPoint: { x: 214, y: 136 },
    intensity: 1
  });
  const result = system.play(event);

  assert.equal(result.ok, true);
  assert.equal(result.definition.id, "fire-bolt");
  scheduler.advance(result.definition.totalDuration);

  const requests = effectEngine.getStats().requests;
  const roles = new Set(
    requests.map(({ metadata }) => metadata.role)
  );
  [
    "fire-bolt-charge",
    "fire-bolt-projectile",
    "fire-bolt-trail",
    "fire-bolt-impact-sprite",
    "fire-bolt-impact-fallback",
    "fire-bolt-ember-fade"
  ].forEach((role) => assert.equal(roles.has(role), true));

  const projectile = requests.find(
    ({ type }) => type === FIRE_BOLT_PROJECTILE_EFFECT_ID
  );
  assert.deepEqual(projectile.startPosition, event.casterPoint);
  assert.deepEqual(projectile.endPosition, event.targetPoint);
  assert.equal(
    requests.some(({ type }) => type === "fire-trail"),
    true
  );
  assert.equal(
    requests.some(({ type }) => type === "fire-smoke"),
    false
  );
  assert.equal(
    requests.some(({ type }) => type === "fire-scorch"),
    false
  );
  assert.equal(system.getState().activeCount, 0);
  assert.equal(scheduler.pending(), 0);
});

test("Fireball composes named clips, 2.5D travel, impact layers and aftermath", () => {
  const scheduler = createScheduler(), effectEngine = createEffectEngine();
  const system = createCastingSequenceSystem({ effectEngine, scheduler });
  const event = createSpellVfxEvent({
    spell: getDefaultSpellById("fireball"), casterPoint: { x: 15, y: 25 },
    targetPoint: { x: 150, y: 125 },
    geometry: { shape: "sphere", sizeFeet: 20, sizePixels: 256,
      bounds: { width: 512, height: 512 } },
    affectedTokens: Array.from({length:100}, (_, i) => ({id: "token-" + i, center:{x:150,y:125}}))
  });
  const before = JSON.stringify(event), result = system.play(event);
  assert.equal(result.ok, true);
  assert.equal(result.definition.id, "fireball");
  scheduler.advance(result.definition.totalDuration);
  const requests = effectEngine.getStats().requests;
  assert.deepEqual(requests.map(r => r.type), [
    FIREBALL_CLIP_EFFECT_ID, "fire-glow", FIREBALL_CLIP_EFFECT_ID,
    FIREBALL_CLIP_EFFECT_ID, FIREBALL_CLIP_EFFECT_ID, "fire-explosion",
    "fire-debris-burst", FIREBALL_CLIP_EFFECT_ID, "fire-embers", "fire-scorch"
  ]);
  assert.deepEqual(requests[3].startPosition, event.casterPoint);
  assert.deepEqual(requests[3].endPosition, event.targetPoint);
  assert.equal(requests[3].clip, "travel");
  assert.equal(requests[3].preset, "projectile");
  assert.equal(requests[3].motion.type, "arc");
  assert.equal(requests[3].motion.maxZ, 88);
  assert.equal(requests[3].motion.arcPower, 1.22);
  assert.equal(requests[3].trail.enabled, true);
  assert.equal(requests[3].heightGlow.enabled, true);
  assert.equal(requests[3].shadow.enabled, true);
  assert.equal(requests[0].scale, .38);
  assert.equal(requests[2].scale, .44);
  assert.equal(requests[3].scale, .32);
  assert.equal(requests[4].clip, "impact");
  assert.equal(requests[4].scale, .86);
  assert.equal(requests[6].debris.count, 10);
  assert.equal(requests[7].clip, "aftermath");
  assert.equal(requests[7].scale, .7);
  assert.equal(requests[9].layer, "ground");
  assert.equal(requests[9].persistent, false);
  assert.ok(requests.every(r => !r.affectedTokenId));
  assert.equal(JSON.stringify(event), before);
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
    ({ id }) => id === "fireball"
  );
  assert.equal(
    fireBurst.phases.impact.effects.some(
      ({ type, clip }) => type === FIREBALL_CLIP_EFFECT_ID && clip === "impact"
    ),
    true
  );
  assert.equal(
    fireBurst.phases.impact.effects.some(
      ({ anchor }) => anchor === "affected-tokens"
    ),
    false
  );
});
