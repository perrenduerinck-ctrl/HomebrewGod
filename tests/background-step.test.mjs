import test from "node:test";
import assert from "node:assert/strict";
import {
  createBackgroundStep
} from "../characterCreator/steps/backgroundStep.js";

function createTestStep() {
  let validBackgroundSkillCount = 0;
  const creatorState = {
    roomBackgroundCache: [],
    draft: {
      background: {
        id: "",
        name: "",
        source: "",
        featureChoices: {}
      },
      features: {
        backgroundFeatures: []
      },
      proficiencies: {
        skills: {},
        tools: [],
        languages: [],
        sources: {
          tools: {},
          languages: {}
        }
      }
    }
  };

  const cleanArray = (values) => (
    Array.isArray(values) ? values.filter(Boolean) : []
  );
  const cleanString = (value) => String(value ?? "").trim();
  const cloneData = (value) => JSON.parse(JSON.stringify(value));
  const safeDisplayString = (value, fallback = "") => (
    cleanString(value) || fallback
  );
  const uniqueCleanArray = (values) => (
    [...new Set(cleanArray(values).map(cleanString).filter(Boolean))]
  );

  const step = createBackgroundStep({
    ARTISAN_TOOL_OPTIONS: [],
    DEFAULT_BACKGROUND_EQUIPMENT_PACKAGES: [],
    DEFAULT_BACKGROUND_TEMPLATES: [],
    GAMING_SET_OPTIONS: [],
    GENERAL_TOOL_OPTIONS: ["Thieves' tools"],
    MUSICAL_INSTRUMENT_OPTIONS: [],
    STANDARD_LANGUAGE_OPTIONS: ["Common", "Elvish"],
    cleanArray,
    cleanString,
    cloneData,
    countSection14ValidSkillSource: () => validBackgroundSkillCount,
    ensureProficiencySources: (character) => character.proficiencies.sources,
    getBackgroundSourceLabel: () => "background",
    getCreatorState: () => creatorState,
    getLegacy2014Metadata: () => ({}),
    getSafeBackgroundName: (character) => (
      cleanString(character?.background?.name)
    ),
    getStoredSources: (sourceMap, value, fallback) => (
      sourceMap?.[value] || fallback
    ),
    isActiveRulesetEntry: () => true,
    makeSafeId: (value, fallback) => cleanString(value) || fallback,
    normalizeSpeciesBackgroundChoices: (background) => ({
      skillChoices: background.skillChoices || { choose: 0, from: [] },
      toolChoices: background.toolChoices || { choose: 0, from: [] },
      languageChoices: background.languageChoices || { choose: 0, from: [] }
    }),
    safeDisplayString,
    safeNumber: (value, fallback = 0) => (
      Number.isFinite(Number(value)) ? Number(value) : fallback
    ),
    uniqueCleanArray
  });

  return {
    creatorState,
    setValidBackgroundSkillCount(value) {
      validBackgroundSkillCount = value;
    },
    step
  };
}

test("background completion supports skipped, custom, and empty backgrounds", () => {
  const { creatorState, step } = createTestStep();

  assert.equal(step.isStepComplete(), false);
  assert.deepEqual(step.validateStep().blockingErrors, [
    "Choose a background before finishing."
  ]);

  creatorState.draft.background = {
    id: "custom-background",
    name: "Sky Sailor",
    source: "custom",
    featureChoices: {}
  };
  assert.equal(step.isStepComplete(), true);

  creatorState.draft.background = {
    id: "",
    name: "",
    source: "skipped",
    featureChoices: { skipped: true }
  };
  assert.equal(step.isStepComplete(), true);
  assert.deepEqual(step.getStepWarnings(), []);
});

test("background requirements keep skill, exact tool, and language validation together", () => {
  const {
    creatorState,
    setValidBackgroundSkillCount,
    step
  } = createTestStep();
  const template = {
    id: "scholar",
    name: "Scholar",
    source: "template",
    skillChoices: { choose: 1, from: ["Arcana"] },
    toolChoices: { choose: 1, from: ["Thieves' tools"] },
    languageChoices: { choose: 1, from: ["Elvish"] }
  };

  creatorState.draft.background = {
    id: "scholar",
    name: "Scholar",
    source: "template",
    templateSnapshot: template,
    featureChoices: {
      toolProficiencies: []
    }
  };

  assert.equal(step.isStepComplete(), false);
  assert.deepEqual(step.getStepWarnings(), [
    "Choose exactly 1 valid background skill proficiencies.",
    "Choose exactly 1 exact background tool proficiency.",
    "Choose exactly 1 background language."
  ]);

  setValidBackgroundSkillCount(1);
  creatorState.draft.background.featureChoices.toolProficiencies = [
    "Thieves' tools"
  ];
  creatorState.draft.proficiencies.tools = ["Thieves' tools"];
  creatorState.draft.proficiencies.languages = ["Elvish"];
  creatorState.draft.proficiencies.sources.tools["Thieves' tools"] = [
    "background"
  ];
  creatorState.draft.proficiencies.sources.languages.Elvish = ["background"];

  assert.deepEqual(step.getStepWarnings(), []);
  assert.equal(step.isStepComplete(), true);
  assert.equal(step.validateStep().valid, true);
});

test("background module exposes the consistent step interface", () => {
  const { step } = createTestStep();
  const character = {};

  assert.equal(step.id, "background");
  assert.deepEqual(step.actions, [
    "choose-background",
    "skip-background",
    "use-custom-background",
    "apply-background-choices",
    "apply-background-package",
    "add-background-feature",
    "remove-background-feature"
  ]);
  assert.equal(step.handleStepClick({ action: "unknown" }), false);
  assert.equal(step.handleStepInput({ target: {} }), false);
  assert.equal(step.handleStepChange({ target: {} }), false);
  assert.equal(step.normalizeStepData(character), character);
});
