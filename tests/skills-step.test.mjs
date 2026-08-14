import test from "node:test";
import assert from "node:assert/strict";
import { createSkillsStep } from "../characterCreator/steps/skillsStep.js";

const SKILLS = [
  { id: "athletics", name: "Athletics", ability: "str" },
  { id: "acrobatics", name: "Acrobatics", ability: "dex" },
  { id: "insight", name: "Insight", ability: "wis" }
];

function cleanArray(value) {
  return Array.isArray(value)
    ? value.map((entry) => String(entry || "").trim()).filter(Boolean)
    : [];
}

function uniqueCleanArray(value) {
  return [...new Set(cleanArray(value))];
}

function createTestStep({ multiclass = false } = {}) {
  let changed = 0;
  const manualLists = {};
  const fields = {
    ccSavingThrowProficiencies: { value: "Strength, Constitution" },
    ccArmorProficiencies: { value: "Light armor" },
    ccWeaponProficiencies: { value: "Simple weapons" },
    ccToolProficiencies: { value: "Thieves' tools" },
    ccLanguageProficiencies: { value: "Common, Draconic" }
  };
  const primaryClass = {
    className: "Fighter",
    choices: { skillProficiencyIds: [] }
  };
  const selectedClass = {
    skillChoices: {
      choose: 2,
      from: ["Athletics", "Acrobatics"]
    }
  };
  const selectedBackground = {
    skillChoices: {
      choose: 1,
      from: ["Insight"]
    }
  };
  const creatorState = {
    draft: {
      abilities: {
        scores: { str: 16, dex: 14, wis: 12 }
      },
      background: {
        name: "Acolyte",
        featureChoices: { skillProficiencyIds: [] }
      },
      proficiencies: { skills: {} }
    }
  };

  const step = createSkillsStep({
    $: (id) => fields[id] || null,
    SKILL_DEFINITIONS: SKILLS,
    applyCompatibilityAliases: () => {},
    calculateAbilityModifier: (score) => Math.floor((Number(score) - 10) / 2),
    cleanArray,
    cleanString: (value, fallback = "") => String(value ?? fallback).trim(),
    escapeHtml: (value) => String(value ?? ""),
    formatSection14List: (value) => cleanArray(value).join(", "),
    getBackgroundSourceLabel: () => "Acolyte",
    getCharacterProficiencyBonus: () => 2,
    getClassSourceLabel: () => "Fighter",
    getCreatorState: () => creatorState,
    getManualProficiencyList: (key) => manualLists[key] || [],
    getPrimaryClassEntry: () => primaryClass,
    getSelectedClassTemplate: () => selectedClass,
    getSelectedSection14Background: () => selectedBackground,
    isMulticlassDraft: () => multiclass,
    isSection17ClassComplete: () => true,
    markDraftChanged: () => {
      changed += 1;
    },
    parseSection14List: (value) => String(value || "")
      .split(/[\n,]+/)
      .map((entry) => entry.trim())
      .filter(Boolean),
    renderCreatorView: () => {},
    safeNumber: (value, fallback = 0) => (
      Number.isFinite(Number(value)) ? Number(value) : fallback
    ),
    setManualProficiencyList: (key, value) => {
      manualLists[key] = value;
    },
    setStatus: () => {},
    uniqueCleanArray,
    wizardField: (label) => `<label>${label}</label>`
  });

  return {
    creatorState,
    getChangedCount: () => changed,
    manualLists,
    primaryClass,
    step
  };
}

test("skill sources remain independent and duplicate proficiency is retained", () => {
  const { creatorState, getChangedCount, primaryClass, step } = createTestStep();
  const api = step.compatibility;

  assert.equal(api.toggleSection14Skill("athletics", "class"), true);
  assert.equal(api.toggleSection14Skill("athletics", "manual"), true);
  assert.deepEqual(
    creatorState.draft.proficiencies.skills.athletics.source,
    ["Fighter", "manual"]
  );
  assert.deepEqual(primaryClass.choices.skillProficiencyIds, ["athletics"]);

  assert.equal(api.toggleSection14Skill("athletics", "class"), true);
  assert.equal(creatorState.draft.proficiencies.skills.athletics.proficient, true);
  assert.deepEqual(
    creatorState.draft.proficiencies.skills.athletics.source,
    ["manual"]
  );
  assert.deepEqual(primaryClass.choices.skillProficiencyIds, []);
  assert.ok(getChangedCount() >= 3);
});

test("skills completion validates class, background, and expertise choices", () => {
  const { creatorState, step } = createTestStep();
  const api = step.compatibility;

  assert.equal(step.isStepComplete(), false);
  assert.deepEqual(step.getStepWarnings(), [
    "Choose exactly 2 valid class skill proficiencies."
  ]);

  api.toggleSection14Skill("athletics", "class");
  api.toggleSection14Skill("acrobatics", "class");
  api.toggleSection14Skill("insight", "background");
  assert.equal(step.isStepComplete(), true);
  assert.equal(api.countSection14ValidSkillSource("class"), 2);
  assert.equal(api.countSection14ValidSkillSource("background"), 1);

  creatorState.draft.proficiencies.skills.invalid = {
    proficient: false,
    expertise: true,
    source: []
  };
  assert.equal(step.isStepComplete(), false);
  assert.deepEqual(step.getStepWarnings(), [
    "Expertise cannot exist without proficiency."
  ]);
  assert.equal(step.validateStep().valid, false);
});

test("tools and languages remain part of the Skills module interface", () => {
  const { manualLists, step } = createTestStep();

  step.compatibility.applySection14ProficiencyLists();
  assert.deepEqual(manualLists, {
    savingThrows: ["Strength", "Constitution"],
    armor: ["Light armor"],
    weapons: ["Simple weapons"],
    tools: ["Thieves' tools"],
    languages: ["Common", "Draconic"]
  });

  assert.equal(step.id, "skills");
  assert.deepEqual(step.actions, [
    "toggle-skill-proficiency",
    "toggle-skill-expertise",
    "apply-proficiency-lists"
  ]);
  assert.equal(step.handleStepClick({ action: "unknown" }), false);
  assert.equal(step.handleStepInput({ target: {} }), false);
  assert.equal(step.handleStepChange({ target: {} }), false);
  const character = {};
  assert.equal(step.normalizeStepData(character), character);
  assert.equal(Object.isFrozen(step), true);
});
