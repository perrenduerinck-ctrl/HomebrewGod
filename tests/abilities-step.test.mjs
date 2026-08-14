import test from "node:test";
import assert from "node:assert/strict";
import {
  createAbilitiesStep
} from "../characterCreator/steps/abilitiesStep.js";

const ABILITIES = [
  ["str", "Strength"],
  ["dex", "Dexterity"],
  ["con", "Constitution"],
  ["int", "Intelligence"],
  ["wis", "Wisdom"],
  ["cha", "Charisma"]
].map(([id, name]) => ({ id, name }));

function createScoreMap(value) {
  return Object.fromEntries(
    ABILITIES.map((ability) => [ability.id, value])
  );
}

function createTestStep() {
  let changed = 0;
  const creatorState = {
    currentStepId: "basics",
    draft: {
      abilities: {
        method: "manual",
        base: createScoreMap(10),
        scores: createScoreMap(10),
        bonuses: createScoreMap(0),
        assignmentPool: []
      },
      builder: {
        validation: {},
        completedSteps: []
      },
      magic: {
        spellcastingAbility: ""
      }
    }
  };

  const step = createAbilitiesStep({
    ABILITY_DEFINITIONS: ABILITIES,
    ABILITY_SCORE_METHODS: [
      { id: "manual", name: "Manual" },
      { id: "standard-array", name: "Standard Array" },
      { id: "point-buy", name: "Point Buy" },
      { id: "rolled", name: "Rolled" }
    ],
    applyCompatibilityAliases: () => {},
    cleanString: (value) => String(value ?? "").trim(),
    getCreatorState: () => creatorState,
    markDraftChanged: () => {
      changed += 1;
    },
    recalculateAbilityTotals: (character) => {
      character.abilities.scores = Object.fromEntries(
        ABILITIES.map((ability) => [
          ability.id,
          character.abilities.base[ability.id] +
            (character.abilities.bonuses[ability.id] || 0)
        ])
      );
    },
    safeNumber: (value, fallback = 0) => (
      Number.isFinite(Number(value)) ? Number(value) : fallback
    ),
    setStatus: () => {}
  });

  return {
    creatorState,
    getChangedCount: () => changed,
    step
  };
}

test("abilities completion requires confirmation and bounded final scores", () => {
  const { creatorState, step } = createTestStep();

  assert.equal(step.isStepComplete(), false);
  assert.deepEqual(step.getStepWarnings(), [
    "Review and confirm the ability scores before finishing."
  ]);

  creatorState.draft.builder.validation.abilitiesTouched = true;
  assert.equal(step.isStepComplete(), true);

  creatorState.draft.abilities.scores.str = 31;
  assert.equal(step.isStepComplete(), false);

  creatorState.draft.abilities.scores.str = 0;
  assert.equal(step.isStepComplete(), false);

  creatorState.draft.abilities.scores.str = 10;
  assert.equal(step.validateStep().valid, true);
});

test("standard array and point buy remain owned by the abilities module", () => {
  const { creatorState, getChangedCount, step } = createTestStep();
  const api = step.compatibility;

  api.applySection13StandardArray();
  assert.equal(creatorState.draft.abilities.method, "standard-array");
  assert.deepEqual(creatorState.draft.abilities.base, {
    str: 15,
    dex: 14,
    con: 13,
    int: 12,
    wis: 10,
    cha: 8
  });
  assert.equal(creatorState.draft.builder.validation.abilitiesTouched, true);
  assert.equal(step.isStepComplete(), true);

  api.applySection13PointBuyDefaults();
  assert.equal(creatorState.draft.abilities.method, "point-buy");
  assert.deepEqual(creatorState.draft.abilities.base, createScoreMap(8));
  assert.equal(api.getSection13PointBuySpent(), 0);

  assert.equal(api.changeSection13PointBuyScore("str", 1), true);
  assert.equal(creatorState.draft.abilities.base.str, 9);
  assert.equal(api.getSection13PointBuySpent(), 1);
  assert.equal(api.changeSection13PointBuyScore("str", -1), true);
  assert.equal(api.changeSection13PointBuyScore("str", -1), false);
  assert.ok(getChangedCount() >= 4);
});

test("abilities module exposes the consistent step interface", () => {
  const { step } = createTestStep();
  const character = {};

  assert.equal(step.id, "abilities");
  assert.deepEqual(step.actions, [
    "refresh-level-progression",
    "calculate-character-hp",
    "reset-standard-array",
    "point-buy-decrease",
    "point-buy-increase",
    "reset-point-buy",
    "roll-ability-scores",
    "apply-rolled-scores"
  ]);
  assert.equal(typeof step.renderLevelStep, "function");
  assert.equal(step.handleStepClick({ action: "unknown" }), false);
  assert.equal(step.handleStepInput({ target: {} }), false);
  assert.equal(step.handleStepChange({ target: {} }), false);
  assert.equal(step.normalizeStepData(character), character);
});
