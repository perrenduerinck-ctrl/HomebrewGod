import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_WALKING_SPEED,
  MAXIMUM_WALKING_SPEED,
  MINIMUM_WALKING_SPEED,
  normalizeCharacterWalkingSpeed,
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
          fly: 120
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
      character.speed,
      "100 ft."
    );
    assert.equal(
      character.combat
        .speed.fly,
      120
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
