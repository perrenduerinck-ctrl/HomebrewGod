import test from "node:test";
import assert from "node:assert/strict";
import {
  createSpeciesStep
} from "../characterCreator/steps/speciesStep.js";

function createTestStep() {
  const creatorState = {
    draft: {
      species: {
        id: "",
        name: "",
        choices: {}
      }
    }
  };

  const step = createSpeciesStep({
    ABILITY_DEFINITIONS: [
      { id: "str", name: "Strength" },
      { id: "dex", name: "Dexterity" },
      { id: "cha", name: "Charisma" }
    ],
    DEFAULT_SPECIES_TEMPLATES: [{
      id: "elf",
      name: "Elf",
      subraces: [
        { id: "high-elf", name: "High Elf" },
        { id: "wood-elf", name: "Wood Elf" }
      ]
    }],
    DWARF_TOOL_CHOICES: ["Smith's tools"],
    SECTION11_DRAGONBORN_ANCESTRIES: [
      { id: "red", name: "Red", damageType: "Fire" }
    ],
    SKILL_DEFINITIONS: [
      { id: "arcana", name: "Arcana" },
      { id: "perception", name: "Perception" }
    ],
    STANDARD_LANGUAGE_OPTIONS: [
      "Common",
      "Elvish",
      "Dwarvish"
    ],
    WIZARD_CANTRIP_CHOICES_2014: ["Fire Bolt"],
    cleanArray: (values) => Array.isArray(values) ? values : [],
    cleanString: (value) => String(value ?? "").trim(),
    getCreatorState: () => creatorState,
    getSafeSpeciesName: (character) => (
      String(character?.species?.name ?? "").trim()
    )
  });

  return { creatorState, step };
}

test("species completion covers species, lineage, and required choices", () => {
  const { creatorState, step } = createTestStep();

  assert.equal(step.isStepComplete(), false);
  assert.deepEqual(step.getStepWarnings(), [
    "Choose a species before finishing."
  ]);

  creatorState.draft.species = {
    id: "custom-species",
    name: "Cloudling",
    choices: {}
  };
  assert.equal(step.isStepComplete(), true);

  creatorState.draft.species = {
    id: "dragonborn",
    name: "Dragonborn",
    choices: {}
  };
  assert.deepEqual(step.getStepWarnings(), [
    "Choose a Dragonborn ancestry."
  ]);
  creatorState.draft.species.choices.draconicAncestry = "red";
  assert.equal(step.isStepComplete(), true);

  creatorState.draft.species = {
    id: "elf",
    name: "Elf",
    choices: { subraceId: "high-elf" }
  };
  assert.equal(step.isStepComplete(), false);
  assert.match(step.getStepWarnings()[0], /subrace/);

  Object.assign(creatorState.draft.species.choices, {
    highElfLanguage: "Dwarvish",
    highElfCantrip: "Fire Bolt"
  });
  assert.equal(step.isStepComplete(), true);
});

test("species module exposes the consistent step interface", () => {
  const { step } = createTestStep();
  const character = {};

  assert.equal(step.id, "species");
  assert.deepEqual(step.actions, [
    "choose-species",
    "choose-subrace",
    "apply-species-choices",
    "use-custom-species",
    "add-species-trait",
    "remove-species-trait"
  ]);
  assert.equal(step.handleStepClick({ action: "unknown" }), false);
  assert.equal(step.handleStepInput({ target: {} }), false);
  assert.equal(step.handleStepChange({ target: {} }), false);
  assert.equal(step.normalizeStepData(character), character);
  assert.equal(step.validateStep().valid, false);
});
