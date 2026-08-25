import test from "node:test";
import assert from "node:assert/strict";
import {
  createClassStep
} from "../characterCreator/steps/classStep.js";

function createTestStep() {
  const creatorState = {
    draft: {}
  };

  return createClassStep({
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

test("class completion defers multiclass ability prerequisites but preserves progression rules", () => {
  const step = createTestStep();

  assert.equal(step.isStepComplete({ classes: [] }), false);
  assert.equal(
    step.isStepComplete({
      classes: [{ name: "Wizard", level: 1 }]
    }),
    true
  );
  assert.equal(
    step.isStepComplete({
      multiclass: true,
      classes: [
        { name: "Wizard", level: 3 },
        { name: "Fighter", level: 2 }
      ],
      prerequisites: [{ met: true }],
      pendingChoices: []
    }),
    true
  );
  assert.equal(
    step.isStepComplete({
      multiclass: true,
      classes: [{ name: "Wizard", level: 21 }],
      prerequisites: [{ met: true }],
      pendingChoices: []
    }),
    false
  );
  assert.equal(
    step.isStepComplete({
      multiclass: true,
      classes: [{ name: "Wizard", level: 2 }],
      prerequisites: [{ met: false }],
      pendingChoices: []
    }),
    true
  );
  assert.equal(
    step.isStepComplete({
      multiclass: true,
      classes: [{ name: "Wizard", level: 2 }],
      prerequisites: [{ met: true }],
      pendingChoices: ["Choose a class feature"]
    }),
    false
  );
});

test("class validation and normalization follow the step interface", () => {
  const step = createTestStep();
  const character = { classes: [] };
  const validation = step.validateStep(character);

  assert.equal(validation.valid, false);
  assert.equal(validation.blockingErrors.length, 1);
  assert.deepEqual(
    step.getStepWarnings(character),
    validation.blockingErrors
  );
  assert.equal(step.normalizeStepData(character), character);
});
