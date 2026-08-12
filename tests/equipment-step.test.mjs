import test from "node:test";
import assert from "node:assert/strict";
import {
  createEquipmentStep
} from "../characterCreator/steps/equipmentStep.js";

function createTestStep() {
  const creatorState = {
    draft: {
      equipment: {
        startingPackageId: "",
        currency: {},
        items: [],
        notes: ""
      }
    },
    showContainedItems: false,
    openContainerId: ""
  };

  return createEquipmentStep({
    getCreatorState: () => creatorState,
    cleanString: (value) =>
      String(value ?? "").trim(),
    safeDisplayString: (value) =>
      String(value ?? "").trim(),
    safeNumber: (value, fallback = 0) => {
      const number = Number(value);
      return Number.isFinite(number)
        ? number
        : fallback;
    }
  });
}

test("equipment completion preserves every existing completion path", () => {
  const step = createTestStep();
  const empty = {
    equipment: {
      startingPackageId: "",
      currency: {},
      items: [],
      notes: ""
    }
  };

  assert.equal(step.isStepComplete(empty), false);
  assert.equal(
    step.isStepComplete({
      equipment: {
        ...empty.equipment,
        startingPackageId: "none"
      }
    }),
    true
  );
  assert.equal(
    step.isStepComplete({
      equipment: {
        ...empty.equipment,
        startingPackageId: "explorer-pack"
      }
    }),
    true
  );
  assert.equal(
    step.isStepComplete({
      equipment: {
        ...empty.equipment,
        currency: { gp: 1 }
      }
    }),
    true
  );
  assert.equal(
    step.isStepComplete({
      equipment: {
        ...empty.equipment,
        notes: "Family heirloom"
      }
    }),
    true
  );
  assert.equal(
    step.isStepComplete({
      equipment: {
        ...empty.equipment,
        items: [{ id: "rope" }]
      }
    }),
    true
  );
});

test("equipment validation and normalization follow the step interface", () => {
  const step = createTestStep();
  const character = {
    equipment: {
      startingPackageId: "",
      currency: {},
      items: [],
      notes: ""
    }
  };
  const validation = step.validateStep(character);

  assert.equal(validation.valid, false);
  assert.equal(validation.blockingErrors.length, 1);
  assert.deepEqual(
    step.getStepWarnings(character),
    validation.blockingErrors
  );
  assert.equal(step.normalizeStepData(character), character);
  assert.equal(step.handleStepInput({}), false);
});
