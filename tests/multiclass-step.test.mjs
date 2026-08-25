import test from "node:test";
import assert from "node:assert/strict";
import {
  createMulticlassStep
} from "../characterCreator/steps/multiclassStep.js";
import {
  planMulticlassLevelSplit
} from "../characterCreator/multiclassing.js";

function createTestStep() {
  const creatorState = {
    draft: {}
  };

  return createMulticlassStep({
    cleanString: (value) =>
      String(value ?? "").trim(),
    getCreatorState: () => creatorState,
    getPrimaryClassEntry: (character) =>
      character?.classes?.[0] || null,
    getSafeClassName: (character) =>
      String(character?.classes?.[0]?.name || "").trim(),
    isMulticlassDraft: (character) =>
      character?.multiclass === true,
    getCharacterClassEntries: (character) =>
      character?.classes || [],
    getClassEntryLevel: (entry, fallback = 0) =>
      Number.isFinite(Number(entry?.level))
        ? Number(entry.level)
        : fallback,
    getMulticlassPrerequisiteResults: (character) =>
      character?.prerequisites || [],
    getClassProgressionPendingChoiceWarnings: (character) =>
      character?.pendingChoices || []
  });
}

test("multiclass completion preserves level and choice rules while ability prerequisites are deferred", () => {
  const step = createTestStep();

  assert.equal(step.isStepComplete({ classes: [] }), false);
  assert.equal(
    step.isStepComplete({
      classes: [{ name: "Fighter", level: 1 }]
    }),
    true
  );
  assert.equal(
    step.isStepComplete({
      multiclass: true,
      classes: [
        { name: "Fighter", level: 2 },
        { name: "Wizard", level: 3 }
      ],
      prerequisites: [{ met: true }],
      pendingChoices: []
    }),
    true
  );
  assert.equal(
    step.isStepComplete({
      multiclass: true,
      classes: [{ name: "Fighter", level: 21 }],
      prerequisites: [{ met: true }],
      pendingChoices: []
    }),
    false
  );
  assert.equal(
    step.isStepComplete({
      multiclass: true,
      classes: [{ name: "Fighter", level: 2 }],
      prerequisites: [{ met: false, label: "Strength 13" }],
      pendingChoices: []
    }),
    true
  );
  assert.equal(
    step.isStepComplete({
      multiclass: true,
      classes: [{ name: "Fighter", level: 2 }],
      prerequisites: [{ met: true }],
      pendingChoices: ["Choose a multiclass skill"]
    }),
    false
  );
});

test("multiclass warnings and normalization follow the step interface", () => {
  const step = createTestStep();
  const character = {
    multiclass: true,
    classes: [{ name: "Fighter", level: 2 }],
    prerequisites: [{
      met: false,
      label: "Strength 13 is required"
    }],
    pendingChoices: ["Choose a multiclass skill"]
  };
  const warnings = step.getStepWarnings(character);
  const validation = step.validateStep(character);

  assert.deepEqual(warnings, [
    "Choose a multiclass skill",
    "Strength 13 is required"
  ]);
  assert.equal(validation.valid, false);
  assert.deepEqual(validation.blockingErrors, [
    "Choose a multiclass skill"
  ]);
  assert.deepEqual(validation.reminders, [
    "Strength 13 is required"
  ]);
  assert.equal(step.normalizeStepData(character), character);
  assert.equal(step.handleStepInput({}), false);
});

test("multiclass level splitting preserves the chosen total level", () => {
  assert.deepEqual(
    planMulticlassLevelSplit([2]),
    {
      allowed: true,
      reason: "split-existing-level",
      totalLevel: 2,
      donorIndex: 0,
      nextLevels: [1]
    }
  );
  assert.equal(
    planMulticlassLevelSplit([1]).reason,
    "minimum-total-level"
  );
  assert.equal(
    planMulticlassLevelSplit([1, 1]).reason,
    "no-level-to-split"
  );
  assert.deepEqual(
    planMulticlassLevelSplit([3, 2]).nextLevels,
    [3, 1]
  );
});
