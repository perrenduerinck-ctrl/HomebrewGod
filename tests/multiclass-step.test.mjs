import test from "node:test";
import assert from "node:assert/strict";
import {
  createMulticlassStep
} from "../characterCreator/steps/multiclassStep.js";

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

test("multiclass completion preserves level, prerequisite, and choice rules", () => {
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
    false
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
    "Strength 13 is required",
    "Choose a multiclass skill"
  ]);
  assert.equal(validation.valid, false);
  assert.deepEqual(validation.blockingErrors, warnings);
  assert.equal(step.normalizeStepData(character), character);
  assert.equal(step.handleStepInput({}), false);
});
