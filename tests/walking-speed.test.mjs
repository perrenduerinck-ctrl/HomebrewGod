import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_WALKING_SPEED,
  MAXIMUM_WALKING_SPEED,
  MINIMUM_WALKING_SPEED,
  applyDerivedMovementSpeeds,
  normalizeCharacterWalkingSpeed,
  normalizeMovementSpeed,
  normalizeWalkingSpeed
} from "../characterCreator/walkingSpeed.js";

test(
  "walking speed is a whole number clamped between zero and one hundred",
  () => {
    assert.equal(
      MINIMUM_WALKING_SPEED,
      0
    );
    assert.equal(
      MAXIMUM_WALKING_SPEED,
      100
    );
    assert.equal(
      normalizeWalkingSpeed(
        30000000000000000000
      ),
      100
    );
    assert.equal(
      normalizeWalkingSpeed(-20),
      0
    );
    assert.equal(
      normalizeWalkingSpeed(
        42.6
      ),
      43
    );
    assert.equal(
      normalizeMovementSpeed(
        30000000000000000000,
        0
      ),
      100
    );
  }
);

test(
  "species base, class movement effects, and feat bonuses combine once and cap at one hundred",
  () => {
    const character = {
      combat: {
        baseSpeed: {
          walk: 30,
          climb: 5,
          swim: 0,
          fly: 90,
          burrow: 0
        },
        speed: {}
      }
    };
    const effects = [
      {
        id: "class-walk",
        type: "speedBonus",
        movement: "walk",
        value: 10
      },
      {
        id: "class-climb",
        type: "speedBonus",
        movement: "climb",
        value: 15
      },
      {
        id: "class-fly",
        type: "speedBonus",
        movement: "fly",
        value: 20
      },
      {
        id: "class-walk",
        type: "speedBonus",
        movement: "walk",
        value: 10
      },
      {
        id: "temporary-walk",
        type: "speedBonus",
        movement: "walk",
        value: 50,
        duration: "1 hour"
      }
    ];

    applyDerivedMovementSpeeds(
      character,
      {
        classEffects: effects,
        featWalkBonus: 10
      }
    );

    assert.deepEqual(
      {
        walk:
          character.combat
            .speed.walk,
        climb:
          character.combat
            .speed.climb,
        fly:
          character.combat
            .speed.fly
      },
      {
        walk: 50,
        climb: 20,
        fly: 100
      }
    );

    applyDerivedMovementSpeeds(
      character,
      {
        classEffects: effects,
        featWalkBonus: 10
      }
    );

    assert.equal(
      character.combat.speed.walk,
      50
    );
  }
);

test(
  "custom class movement speeds replace the matching base before bonuses",
  () => {
    const character = {
      combat: {
        baseSpeed: {
          walk: 25,
          climb: 0,
          swim: 0,
          fly: 0,
          burrow: 0
        },
        speed: {}
      }
    };

    applyDerivedMovementSpeeds(
      character,
      {
        classEffects: [
          {
            id: "custom-walk",
            type: "speedBonus",
            mode: "replace",
            movement: "walk",
            value: 30
          },
          {
            id: "custom-climb",
            type: "speedBonus",
            mode: "replace",
            movement: "climb",
            value: 20
          },
          {
            id: "class-walk-bonus",
            type: "speedBonus",
            movement: "walk",
            value: 5
          }
        ],
        featWalkBonus: 10
      }
    );

    assert.deepEqual(
      character.combat.speed,
      {
        walk: 45,
        climb: 20,
        swim: 0,
        fly: 0,
        burrow: 0,
        special: ""
      }
    );
  }
);

test(
  "invalid walking speeds use the default of thirty",
  () => {
    assert.equal(
      DEFAULT_WALKING_SPEED,
      30
    );

    [
      Infinity,
      -Infinity,
      Number.NaN,
      "",
      "   ",
      null,
      undefined
    ].forEach((value) => {
      assert.equal(
        normalizeWalkingSpeed(
          value
        ),
        30
      );
    });
  }
);

test(
  "loading and saving character data corrects walking speed and its legacy alias",
  () => {
    const character = {
      speed:
        "30000000000000000000 ft.",
      combat: {
        speed: {
          walk:
            30000000000000000000,
          climb: Infinity,
          swim: Number.NaN,
          fly: 120,
          burrow: -20
        }
      }
    };
    const result =
      normalizeCharacterWalkingSpeed(
        character
      );

    assert.equal(
      result,
      character
    );
    assert.equal(
      character.combat
        .speed.walk,
      100
    );
    assert.equal(
      character.combat
        .baseSpeed.walk,
      100
    );
    assert.equal(
      character.speed,
      "100 ft."
    );
    assert.equal(
      character.combat
        .speed.fly,
      100
    );
    assert.equal(
      character.combat
        .speed.climb,
      0
    );
    assert.equal(
      character.combat
        .speed.swim,
      0
    );
    assert.equal(
      character.combat
        .speed.burrow,
      0
    );

    const legacyOnly = {
      speed:
        "30000000000000000000 ft."
    };
    normalizeCharacterWalkingSpeed(
      legacyOnly
    );
    assert.equal(
      legacyOnly.combat
        .speed.walk,
      100
    );
    assert.equal(
      legacyOnly.speed,
      "100 ft."
    );

    const featureAdjusted = {
      speed: "40 ft.",
      combat: {
        speed: {
          walk: 30
        }
      }
    };
    normalizeCharacterWalkingSpeed(
      featureAdjusted
    );
    assert.equal(
      featureAdjusted.combat
        .speed.walk,
      30
    );
    assert.equal(
      featureAdjusted.speed,
      "40 ft."
    );

    character.combat.baseSpeed.walk =
      Number.NaN;
    character.combat.speed.walk =
      Number.NaN;
    normalizeCharacterWalkingSpeed(
      character
    );
    assert.equal(
      character.combat
        .speed.walk,
      30
    );
    assert.equal(
      character.speed,
      "30 ft."
    );
  }
);
