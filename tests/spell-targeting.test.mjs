import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SPELLS,
  getDefaultSpellById,
  validateDefaultSpellCollection
} from "../data/defaultSpells.js";
import {
  createSpellTargetingData,
  SPELL_TARGETING_SCHEMA_VERSION,
  validateSpellTargetingData
} from "../data/spellTargeting.js";

test("every catalog spell has valid structured targeting data", () => {
  const validation = validateDefaultSpellCollection(
    DEFAULT_SPELLS
  );

  assert.equal(validation.valid, true);
  assert.deepEqual(validation.errors, []);
  assert.equal(DEFAULT_SPELLS.length, 340);
  assert.equal(
    DEFAULT_SPELLS.every((spell) => (
      spell.targeting?.schemaVersion ===
      SPELL_TARGETING_SCHEMA_VERSION
    )),
    true
  );
});

test("Fireball targets a point in range and creates a separate sphere", () => {
  const spell = getDefaultSpellById("fireball");

  assert.deepEqual(spell.targeting.range, {
    type: "distance",
    feet: 150,
    text: "150 feet"
  });
  assert.deepEqual(spell.targeting.target, {
    type: "point"
  });
  assert.deepEqual(spell.targeting.area, {
    shape: "sphere",
    radius: 20
  });
  assert.deepEqual(spell.targeting.save, {
    ability: "dex",
    success: "half"
  });
  assert.equal(
    spell.targeting.duration.type,
    "instantaneous"
  );
  assert.equal(
    spell.targeting.duration.concentration,
    false
  );
});

test("Burning Hands and Lightning Bolt use caster-origin directions", () => {
  const burningHands =
    getDefaultSpellById("burning-hands");
  const lightningBolt =
    getDefaultSpellById("lightning-bolt");

  assert.deepEqual(burningHands.targeting.range, {
    type: "self",
    feet: null,
    text: "Self"
  });
  assert.equal(
    burningHands.targeting.target.type,
    "direction"
  );
  assert.deepEqual(burningHands.targeting.area, {
    shape: "cone",
    length: 15
  });
  assert.equal(
    lightningBolt.targeting.target.type,
    "direction"
  );
  assert.deepEqual(lightningBolt.targeting.area, {
    shape: "line",
    length: 100,
    width: 5
  });
});

test("range, duration, save, and attack metadata are normalized", () => {
  const meteorSwarm =
    getDefaultSpellById("meteor-swarm");
  const cureWounds =
    getDefaultSpellById("cure-wounds");
  const acidArrow =
    getDefaultSpellById("acid-arrow");
  const bless = getDefaultSpellById("bless");

  assert.equal(
    meteorSwarm.targeting.range.feet,
    5280
  );
  assert.equal(
    cureWounds.targeting.range.type,
    "touch"
  );
  assert.equal(
    cureWounds.targeting.target.type,
    "creature"
  );
  assert.deepEqual(acidArrow.targeting.attack, {
    type: "ranged"
  });
  assert.equal(
    bless.targeting.duration.type,
    "timed"
  );
  assert.equal(bless.targeting.duration.amount, 1);
  assert.equal(bless.targeting.duration.unit, "minute");
  assert.equal(bless.targeting.duration.upTo, true);
  assert.equal(
    bless.targeting.duration.concentration,
    true
  );
});

test("self-radius cantrips distinguish auras from creature attacks", () => {
  assert.deepEqual(
    getDefaultSpellById("sword-burst")
      .targeting.area,
    { shape: "sphere", radius: 5 }
  );
  assert.equal(
    getDefaultSpellById("sword-burst")
      .targeting.target.type,
    "self"
  );
  assert.equal(
    getDefaultSpellById("booming-blade")
      .targeting.target.type,
    "creature"
  );
  assert.equal(
    getDefaultSpellById("booming-blade")
      .targeting.area,
    null
  );
});

test("targeting validation rejects unsafe or incomplete geometry", () => {
  const invalid = createSpellTargetingData({
    id: "test-spell",
    range: "60 feet",
    duration: "1 minute",
    areaOfEffect: {
      type: "sphere",
      size: Number.POSITIVE_INFINITY
    }
  });
  const validation = validateSpellTargetingData({
    ...invalid,
    area: {
      shape: "sphere",
      radius: Number.POSITIVE_INFINITY
    }
  });

  assert.equal(validation.valid, false);
  assert.match(
    validation.errors.join(" "),
    /finite non-negative number/
  );
});

