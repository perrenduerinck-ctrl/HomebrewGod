import assert from "node:assert/strict";
import test from "node:test";

import {
  CONFIRMED_SPELL_VFX_EVENT,
  SPELL_VFX_DELIVERY_TYPES,
  createSpellVfxEvent,
  dispatchConfirmedSpellVfxEvent,
  inferSpellVfxDeliveryType
} from "../vfx/castEvent.js";
import {
  getDefaultSpellById
} from "../data/defaultSpells.js";

test("confirmed-cast events expose the complete immutable VFX contract", () => {
  const event = createSpellVfxEvent({
    spell: getDefaultSpellById("burning-hands"),
    slot: { level: 2 },
    casterToken: {
      id: "wizard-token",
      elevation: 10
    },
    casterPoint: {
      x: 40,
      y: 50,
      xRatio: 0.2,
      yRatio: 0.25
    },
    targetElevation: 15,
    geometry: {
      shape: "cone",
      sizeFeet: 15,
      anchor: { x: 40, y: 50 },
      pointer: { x: 190, y: 50 },
      directionRadians: 0,
      bounds: {
        minX: 40,
        minY: 10,
        maxX: 190,
        maxY: 90
      }
    },
    affectedTokens: [{
      id: "goblin-1",
      name: "Goblin",
      type: "monster",
      elevation: 15,
      center: { x: 150, y: 50 }
    }]
  });

  assert.deepEqual(
    Object.keys(event),
    [
      "schemaVersion",
      "preview",
      "spellId",
      "spellName",
      "casterTokenId",
      "casterPoint",
      "casterElevation",
      "targetPoint",
      "targetElevation",
      "geometry",
      "affectedTokens",
      "damageTypes",
      "spellLevel",
      "intensity",
      "deliveryType"
    ]
  );
  assert.equal(event.preview, false);
  assert.equal(event.spellId, "burning-hands");
  assert.equal(event.spellName, "Burning Hands");
  assert.equal(event.casterTokenId, "wizard-token");
  assert.equal(event.casterElevation, 10);
  assert.equal(event.targetElevation, 15);
  assert.deepEqual(event.targetPoint, {
    x: 190,
    y: 50,
    xRatio: null,
    yRatio: null
  });
  assert.equal(event.geometry.shape, "cone");
  assert.deepEqual(event.damageTypes, ["fire"]);
  assert.equal(event.spellLevel, 2);
  assert.equal(event.intensity, 1);
  assert.equal(event.deliveryType, "cone");
  assert.equal(event.affectedTokens[0].id, "goblin-1");
  assert.equal(Object.isFrozen(event), true);
  assert.equal(Object.isFrozen(event.geometry), true);
  assert.equal(Object.isFrozen(event.geometry.bounds), true);
  assert.equal(Object.isFrozen(event.affectedTokens), true);
  assert.equal(Object.isFrozen(event.affectedTokens[0]), true);
});

test("preview events are explicit immutable presentation-only events", () => {
  const event = createSpellVfxEvent({
    spell: getDefaultSpellById("fire-bolt"),
    casterPoint: { x: 20, y: 30 },
    targetPoint: { x: 220, y: 130 },
    affectedTokens: [{ id: "ignored-by-caller" }],
    preview: true
  });

  assert.equal(event.preview, true);
  assert.equal(event.spellId, "fire-bolt");
  assert.deepEqual(event.casterPoint, {
    x: 20,
    y: 30,
    xRatio: null,
    yRatio: null
  });
  assert.deepEqual(event.targetPoint, {
    x: 220,
    y: 130,
    xRatio: null,
    yRatio: null
  });
  assert.equal(Object.isFrozen(event), true);
});

test("delivery inference supports every initial VFX geometry", () => {
  assert.deepEqual(
    SPELL_VFX_DELIVERY_TYPES,
    [
      "projectile",
      "beam",
      "burst",
      "cone",
      "line",
      "aura",
      "self",
      "point",
      "impact"
    ]
  );
  assert.equal(
    inferSpellVfxDeliveryType({
      spell: getDefaultSpellById("fire-bolt")
    }),
    "projectile"
  );
  assert.equal(
    inferSpellVfxDeliveryType({
      spell: getDefaultSpellById("fireball")
    }),
    "burst"
  );
  assert.equal(
    inferSpellVfxDeliveryType({
      spell: getDefaultSpellById("lightning-bolt")
    }),
    "line"
  );
  assert.equal(
    inferSpellVfxDeliveryType({
      spell: {
        targeting: {
          target: { type: "self" },
          area: { shape: "sphere" }
        }
      }
    }),
    "aura"
  );
  assert.equal(
    inferSpellVfxDeliveryType({
      deliveryType: "BEAM"
    }),
    "beam"
  );
});

test("event inputs are bounded and invalid numbers cannot escape", () => {
  const event = createSpellVfxEvent({
    spell: {
      id: "unsafe-spell",
      name: "Unsafe Spell",
      level: Infinity,
      damage: [{ damageType: "Force" }]
    },
    casterPoint: { x: Infinity, y: 5 },
    casterElevation: Infinity,
    targetElevation: -5000,
    spellLevel: 300,
    intensity: Infinity
  });

  assert.equal(event.casterPoint, null);
  assert.equal(event.targetPoint, null);
  assert.equal(event.casterElevation, 0);
  assert.equal(event.targetElevation, -1000);
  assert.equal(event.spellLevel, 9);
  assert.equal(event.intensity, 5);
  assert.deepEqual(event.damageTypes, ["force"]);
});

test("confirmed-cast dispatch is generic and failure-safe", () => {
  const events = [];
  class TestCustomEvent {
    constructor(type, options) {
      this.type = type;
      this.detail = options.detail;
    }
  }
  const event = createSpellVfxEvent({
    spellId: "test-spell",
    spellName: "Test Spell"
  });

  assert.equal(
    dispatchConfirmedSpellVfxEvent(event, {
      CustomEventClass: TestCustomEvent,
      eventTarget: {
        dispatchEvent(dispatched) {
          events.push(dispatched);
          return true;
        }
      }
    }),
    true
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].type, CONFIRMED_SPELL_VFX_EVENT);
  assert.equal(events[0].detail, event);
  assert.equal(
    dispatchConfirmedSpellVfxEvent(event, {
      CustomEventClass: TestCustomEvent,
      eventTarget: {
        dispatchEvent() {
          throw new Error("presentation unavailable");
        }
      }
    }),
    false
  );
});
