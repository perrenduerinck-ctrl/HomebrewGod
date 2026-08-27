import assert from "node:assert/strict";
import test from "node:test";

import {
  DAMAGE_TYPE_IDS,
  DEFAULT_DAMAGE_TYPE_VISUALS,
  createDefaultDamageTypeRegistry,
  getDamageTypeVisual,
  listDamageTypeVisuals,
  resolveDamageTypeVisual,
  scaleDamageTypeVisual
} from "../vfx/damageTypes/index.js";
import {
  createDamageTypeRegistry,
  defineDamageTypeVisual,
  normalizeDamageTypeIntensity
} from "../vfx/damageTypes/registry.js";

function assertDeeplyFrozen(value) {
  if (!value || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true);
  Object.values(value).forEach(assertDeeplyFrozen);
}

test("the default registry contains every requested damage type exactly once", () => {
  assert.deepEqual(DAMAGE_TYPE_IDS, [
    "fire",
    "cold",
    "lightning",
    "thunder",
    "acid",
    "poison",
    "necrotic",
    "radiant",
    "psychic",
    "force",
    "bludgeoning",
    "piercing",
    "slashing"
  ]);
  assert.equal(DEFAULT_DAMAGE_TYPE_VISUALS.length, 13);
  assert.deepEqual(
    listDamageTypeVisuals().map(({ id }) => id),
    DAMAGE_TYPE_IDS
  );
  assert.equal(
    new Set(listDamageTypeVisuals().map(({ id }) => id)).size,
    13
  );
});

test("every damage type has a complete reusable visual identity", () => {
  listDamageTypeVisuals().forEach((profile) => {
    assert.equal(profile.schemaVersion, 1);
    assert.equal(typeof profile.label, "string");
    assert.ok(profile.label.length > 0);
    assert.match(profile.palette.primary, /^#[0-9a-f]{3,8}$/);
    assert.match(profile.palette.secondary, /^#[0-9a-f]{3,8}$/);
    assert.match(profile.palette.glow, /^#[0-9a-f]{3,8}$/);
    assert.match(profile.palette.aftermath, /^#[0-9a-f]{3,8}$/);
    assert.ok(profile.particleStyle.style);
    assert.ok(profile.particleStyle.behavior);
    assert.ok(profile.glowBehavior.style);
    assert.ok(profile.impactBehavior.style);
    assert.ok(profile.trailBehavior.style);
    assert.ok(profile.aftermathBehavior.style);
    assert.ok(profile.preferredFeedback.screenEffect);
    assert.ok(profile.preferredFeedback.cameraEffect);
    assert.deepEqual(
      Object.keys(profile.sprites),
      ["particle", "glow", "impact", "trail", "aftermath"]
    );
    assert.deepEqual(
      Object.values(profile.sprites),
      [null, null, null, null, null]
    );
    Object.values(profile.intensityScaling).forEach((multipliers) => {
      assert.equal(multipliers.length, 5);
      assert.ok(multipliers.every(Number.isFinite));
    });
    assertDeeplyFrozen(profile);
  });
});

test("damage visual intensity scales predictably and stays hard-capped", () => {
  const fire = getDamageTypeVisual(" FIRE ");
  const minor = scaleDamageTypeVisual(fire, 1);
  const cinematic = scaleDamageTypeVisual(fire, 5);

  assert.equal(minor.damageType, "fire");
  assert.equal(minor.intensity, 1);
  assert.equal(cinematic.intensity, 5);
  assert.ok(cinematic.particleCount > minor.particleCount);
  assert.ok(cinematic.glowStrength > minor.glowStrength);
  assert.ok(cinematic.impactScale > minor.impactScale);
  assert.ok(cinematic.aftermathDuration > minor.aftermathDuration);
  assert.ok(cinematic.particleCount <= 240);
  assert.ok(cinematic.glowStrength <= 4);
  assert.ok(cinematic.impactScale <= 20);
  assert.ok(cinematic.trailDensity <= 1);
  assert.ok(cinematic.aftermathDuration <= 60000);
  assert.ok(cinematic.feedbackStrength <= 1);
  assert.equal(Object.isFrozen(cinematic), true);
  assert.equal(normalizeDamageTypeIntensity(Infinity), 1);
  assert.equal(normalizeDamageTypeIntensity(999), 5);
  assert.equal(scaleDamageTypeVisual(null, 3), null);
});

test("registry normalization rejects unsafe values and duplicate ids", () => {
  const custom = defineDamageTypeVisual({
    id: " Homebrew Plasma ",
    label: "Homebrew Plasma",
    palette: {
      primary: "#12345"
    },
    particleStyle: {
      count: 999999,
      size: -10
    },
    aftermathBehavior: {
      duration: 999999
    },
    sprites: {
      impact: "https://unsafe.example/impact.webp",
      trail: "assets/vfx/plasma/trail.webp"
    },
    intensityScaling: {
      particleCount: [999, 999, 999, 999, 999]
    }
  });

  assert.equal(custom.id, "homebrew-plasma");
  assert.equal(custom.palette.primary, "#ffffff");
  assert.equal(
    defineDamageTypeVisual({
      id: "empty-label",
      label: ""
    }).label,
    "Empty Label"
  );
  assert.equal(custom.particleStyle.count, 64);
  assert.equal(custom.particleStyle.size, 1);
  assert.equal(custom.aftermathBehavior.duration, 60000);
  assert.equal(custom.sprites.impact, null);
  assert.equal(
    custom.sprites.trail,
    "assets/vfx/plasma/trail.webp"
  );
  assert.deepEqual(
    custom.intensityScaling.particleCount,
    [4, 4, 4, 4, 4]
  );

  const registry = createDamageTypeRegistry([custom]);
  assert.equal(registry.has("HOMEbrew Plasma"), true);
  assert.deepEqual(registry.get("homebrew-plasma"), custom);
  assert.throws(
    () => registry.register(custom),
    /already exists/i
  );
  const replaced = registry.register({
    ...custom,
    label: "Replaced Plasma"
  }, { replace: true });
  assert.equal(registry.get(custom.id), replaced);
  assert.equal(replaced.label, "Replaced Plasma");
  assert.equal(registry.unregister(custom.id), true);
  assert.equal(registry.get(custom.id), null);
  assert.throws(
    () => createDamageTypeRegistry([{}]),
    /stable id/i
  );
});

test("resolution selects known types and uses a presentation-only fallback", () => {
  const registry = createDefaultDamageTypeRegistry();
  assert.equal(
    resolveDamageTypeVisual(["unknown", "cold"], { registry }).id,
    "cold"
  );
  assert.equal(
    resolveDamageTypeVisual("homebrew", { registry }).id,
    "force"
  );
  assert.equal(
    resolveDamageTypeVisual("homebrew", {
      fallback: null,
      registry
    }),
    null
  );

  const forbiddenAuthorityKeys = new Set([
    "affectedTokens",
    "damage",
    "damageDice",
    "range",
    "save",
    "spellSlot",
    "targetPoint"
  ]);
  function inspect(value) {
    if (!value || typeof value !== "object") return;
    Object.entries(value).forEach(([key, child]) => {
      assert.equal(
        forbiddenAuthorityKeys.has(key),
        false,
        `visual profile must not own ${key}`
      );
      inspect(child);
    });
  }
  listDamageTypeVisuals().forEach(inspect);
});
