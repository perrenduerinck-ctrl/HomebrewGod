import test from "node:test";
import assert from "node:assert/strict";
import {
  createFeatsStep
} from "../characterCreator/steps/featsStep.js";

function createTestStep() {
  const creatorState = {
    draft: {},
    slots: [],
    states: {},
    prerequisiteReasons: []
  };
  const feats = [{
    id: "test-feat",
    name: "Test Feat",
    choices: [{
      id: "test-choice",
      label: "Test Choice",
      choose: 1
    }]
  }];

  const step = createFeatsStep({
    DEFAULT_FEATS: feats,
    cleanString: (value) => String(value ?? "").trim(),
    getCreatorState: () => creatorState,
    getUnlockedFeatChoiceSlots: () => creatorState.slots,
    getSection12AsiChoiceState: (slotId) => (
      creatorState.states[slotId] || {
        mode: "",
        abilities: [],
        featId: "",
        featChoices: {}
      }
    ),
    getFeatPrerequisiteResult: () => ({
      met: creatorState.prerequisiteReasons.length === 0,
      reasons: creatorState.prerequisiteReasons,
      advisories: [],
      settingRequirements: []
    }),
    getSection12FeatChoiceLimit: (choice) => choice.choose || 1,
    getFeatSpellcastingValidationWarnings: () => [],
    uniqueCleanArray: (values) => [
      ...new Set(
        (Array.isArray(values) ? values : [])
          .map((value) => String(value ?? "").trim())
          .filter(Boolean)
      )
    ],
    findSection12ActionElement: () => null,
    setSection12AsiMode: () => false,
    adjustSection12AsiAbility: () => false,
    setSection12AsiFeat: () => false,
    setSection12FeatChoiceValues: () => false,
    setFeatRestChoice: () => false,
    setStatus: () => {},
    renderCreatorView: () => {}
  });

  return { creatorState, feats, step };
}

test("feat completion covers ASIs, prerequisites, and required feat choices", () => {
  const { creatorState, step } = createTestStep();

  assert.equal(step.isStepComplete(), true);

  creatorState.slots = [{
    id: "fighter-level-4-asi",
    className: "Fighter",
    classLevel: 4,
    label: "Fighter level 4"
  }];
  assert.equal(step.isStepComplete(), false);

  creatorState.states["fighter-level-4-asi"] = {
    mode: "asi",
    abilities: ["str"],
    featId: "",
    featChoices: {}
  };
  assert.match(step.getStepWarnings()[0], /two ability-score increases/);

  creatorState.states["fighter-level-4-asi"].abilities.push("dex");
  assert.equal(step.isStepComplete(), true);

  creatorState.states["fighter-level-4-asi"] = {
    mode: "feat",
    abilities: [],
    featId: "test-feat",
    featChoices: {}
  };
  assert.match(step.getStepWarnings()[0], /Test Choice \(0\/1\)/);

  creatorState.states["fighter-level-4-asi"]
    .featChoices["test-choice"] = ["choice-a"];
  assert.equal(step.isStepComplete(), true);

  creatorState.prerequisiteReasons = ["Requires Strength 13"];
  assert.match(step.getStepWarnings()[0], /Requires Strength 13/);
});

test("feat module exposes the consistent embedded-step interface", async () => {
  const { creatorState, step } = createTestStep();
  const character = {};

  creatorState.slots = [{
    id: "wizard-level-4-asi",
    className: "Wizard",
    classLevel: 4
  }];

  assert.equal(step.id, "feats");
  assert.deepEqual(step.actions, [
    "set-asi-mode",
    "adjust-asi-ability",
    "choose-asi-feat",
    "show-more-asi-feats"
  ]);
  assert.equal(await step.handleStepClick({ action: "unknown" }), false);
  assert.equal(step.handleStepInput({ target: {} }), false);
  assert.equal(step.handleStepChange({ target: {} }), false);
  assert.equal(step.normalizeStepData(character), character);
  assert.equal(step.validateStep().valid, false);
});
