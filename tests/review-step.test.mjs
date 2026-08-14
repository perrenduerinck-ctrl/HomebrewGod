import test from "node:test";
import assert from "node:assert/strict";
import { createReviewStep } from "../characterCreator/steps/reviewStep.js";

function createTestStep() {
  let opened = 0;
  let rendered = 0;
  const statuses = [];
  const draft = {
    identity: {
      name: "Mira",
      size: "medium",
      age: "29",
      pronouns: "she/her",
      alignment: "Neutral Good",
      deity: "Mystra",
      appearance: "Silver hair"
    },
    classProgression: {
      totalLevel: 1,
      classes: []
    },
    classData: { hitDie: "d8" },
    background: { backstory: "Raised by sages" },
    combat: {
      armorClassMode: "automatic",
      selectedArmorClassMethod: "",
      currentHp: 10,
      maxHp: 10,
      temporaryHp: 0,
      speed: { walk: 30, climb: 0, swim: 0, fly: 0 }
    },
    abilities: {
      base: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      bonuses: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
      scores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      bonusSources: {}
    },
    proficiencies: {
      savingThrows: [],
      armor: [],
      weapons: [],
      tools: [],
      languages: [],
      skills: {}
    },
    equipment: {
      items: [],
      currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
      currencySources: {}
    },
    magic: {
      customSpells: [],
      knownSpellIds: [],
      preparedSpellIds: [],
      spellcastingAbility: "",
      featSources: {},
      classSources: {}
    },
    featMechanics: { spellcasting: [] },
    features: {
      classFeatures: [],
      speciesTraits: [],
      backgroundFeatures: [],
      customFeatures: []
    },
    builder: {
      completedSteps: [],
      validation: { migrationWarnings: [] }
    },
    notes: "Carries a blue journal"
  };

  const step = createReviewStep({
    ABILITY_DEFINITIONS: [
      { id: "str", name: "Strength" },
      { id: "dex", name: "Dexterity" },
      { id: "con", name: "Constitution" },
      { id: "int", name: "Intelligence" },
      { id: "wis", name: "Wisdom" },
      { id: "cha", name: "Charisma" }
    ],
    BUILDER_STEPS: [],
    DEFAULT_FEATS: [],
    DEFAULT_SPELLS: [],
    SKILL_DEFINITIONS: [],
    abilitiesStep: { getStepWarnings: () => [] },
    applyCompatibilityAliases: () => {},
    backgroundStep: { getStepWarnings: () => [] },
    beginnerNote: (title, body) => `<aside>${title}: ${body}</aside>`,
    calculateAbilityModifier: () => 0,
    calculateArmorClassOptions: () => ({
      options: [],
      selected: { total: 10, label: "Unarmored", breakdown: "10" }
    }),
    calculateCharacterCarryingCapacity: () => ({ carryingCapacity: 150 }),
    calculateCharacterHitDice: () => [],
    calculateCharacterHp: () => ({
      maximumHp: 10,
      mode: "fixed",
      hitDie: "d8",
      constitutionModifier: 0,
      rolls: [],
      level: 1,
      manualOverride: null
    }),
    calculateCharacterInitiative: () => ({
      total: 0,
      dexterityModifier: 0,
      proficiencyBonus: 0,
      bonus: 0,
      featBonus: 0
    }),
    calculateCharacterPassiveScores: () => ({
      perception: { name: "Perception", total: 10, bonus: 0 }
    }),
    calculateCharacterSavingThrows: () => [],
    calculateCharacterSkillModifier: () => 0,
    calculateEquippedWeaponAttacks: () => [],
    calculateInventoryWeightSummary: (items = []) => ({
      knownWeight: items.reduce((total, item) => {
        return total + Number(item.weight || 0) * Number(item.quantity || 1);
      }, 0),
      unknownCount: 0
    }),
    clampLevel: (value) => Math.max(1, Math.min(20, Number(value) || 1)),
    cleanArray: (value) => Array.isArray(value) ? value.filter(Boolean) : [],
    cleanString: (value, fallback = "") => String(value ?? fallback).trim(),
    countValidClassEntrySkillChoices: () => 0,
    ensureEquipmentCurrencySources: () => ({}),
    escapeHtml: (value) => String(value ?? ""),
    formatMulticlassPrerequisiteFailure: () => "requirements not met",
    formatSection12ClassChoiceValues: () => "",
    formatSection12List: (values) => (Array.isArray(values) ? values.join(", ") : ""),
    formatSection14CurrencySummary: () => "0 GP",
    formatSection17ClassEntryLabel: () => "No class",
    formatSection17ClassLevelSummary: () => "No class (Level 1)",
    formatSection17Modifier: (value) => Number(value) >= 0 ? `+${Number(value)}` : String(value),
    getCharacterAttunementLimit: () => 3,
    getCharacterBusyLabel: () => "Saving",
    getCharacterProficiencyBonus: () => 2,
    getClassEntryLevel: () => 1,
    getClassEntrySkillChoiceConfig: () => ({ choose: 0 }),
    getClassProgressionEntries: () => [],
    getContainerSummaries: () => [],
    getCreatorState: () => ({ currentCharacterId: null, draft }),
    getFeatPrerequisiteResult: () => ({ met: true, reasons: [] }),
    getFeatSpellcastingValidationWarnings: () => [],
    getMulticlassPendingSkillChoiceWarnings: () => [],
    getMulticlassPendingToolChoiceWarnings: () => [],
    getMulticlassPrerequisiteResults: () => [],
    getMulticlassSummaryEntries: () => [],
    getPendingClassFeatureChoiceWarnings: () => [],
    getPrimaryClassEntry: () => ({}),
    getSafeBackgroundName: () => "Sage",
    getSafeCharacterName: () => "Mira",
    getSafeClassName: () => "Wizard",
    getSafeSpeciesName: () => "Human",
    getSafeSubclassName: () => "",
    getSection12ClassFeaturesThroughLevel: () => [],
    getSection12FeatureChoiceKey: (feature) => feature?.id || "feature",
    getSection12FeatureStoredChoices: () => [],
    getSection13AbilityName: (ability) => ability || "None",
    getSection14BackgroundSourceValues: () => [],
    getSection15AttunedItemCount: () => 0,
    getSection15Inventory: () => [],
    getSection16ClassSourceStore: () => ({}),
    getSection16InnateSpells: () => [],
    getSection16SelectedFeats: () => [],
    getSection16SourceKey: () => "",
    getSection17ClassProgressionEntries: () => [],
    getSection17SpellChoiceValidation: () => ({
      blockingErrors: [],
      reminders: []
    }),
    getSelectedClassTemplate: () => ({ hitDie: "d8", subclasses: [] }),
    getSelectedDefaultFeatInstances: () => [],
    getSpellcastingClassOptions: () => [],
    getSpellcastingEntryForSpell: () => null,
    getSpellSlotCastingOptions: () => null,
    getSpellSourceId: () => "",
    getSpellSourceWarning: () => "",
    getUnlockedFeatChoiceSlots: () => [],
    getValidationWarnings: () => [],
    hasCurrencyValue: () => false,
    isCharacterCreatorBusy: () => false,
    isMulticlassDraft: () => false,
    isPlainObject: (value) => Boolean(value && typeof value === "object" && !Array.isArray(value)),
    isSection17ClassComplete: () => true,
    isStepComplete: () => true,
    migrateSection16LegacySpellSelections: () => {},
    openCharacterSheet: () => { opened += 1; },
    persistDraftToSession: () => {},
    renderClassFeatureMetadata: () => "",
    renderCreatorView: () => { rendered += 1; },
    renderInnateSpellCards: () => '<div class="innate-empty">None</div>',
    renderMulticlassAdvancementChoiceSummary: () => "",
    renderMulticlassClassSummary: () => "",
    renderMulticlassLevelBreakdown: () => "",
    renderSection17SpellcastingSummary: () => '<div class="spell-summary">None</div>',
    renderSelectedClassMechanicsSummary: () => "",
    renderSelectedFeatSummary: () => "",
    safeDisplayString: (value, fallback = "") => String(value ?? fallback),
    safeNumber: (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback,
    setStatus: (message) => { statuses.push(message); },
    skillsStep: { getStepWarnings: () => [] },
    speciesStep: { getStepWarnings: () => [] },
    syncSection16ClassSourceMetadata: () => {},
    uniqueCleanArray: (value) => [...new Set(Array.isArray(value) ? value.filter(Boolean) : [])],
    validateContainerState: () => []
  });

  return {
    draft,
    getOpened: () => opened,
    getRendered: () => rendered,
    statuses,
    step
  };
}

test("Review renders the full summary and all existing action links", () => {
  const { step } = createTestStep();
  const html = step.renderStep();

  [
    "Review Your Character",
    "Character Identity",
    "Combat Summary",
    "Ability Scores",
    "Saving Throws",
    "Skills",
    "Equipment",
    "Spells and Features",
    "Character Story",
    'data-cc-action="save-character"',
    'data-cc-action="finalize-character"',
    'data-cc-action="open-character-sheet"',
    'data-cc-action="refresh-review"',
    'data-step-id="basics"',
    'data-step-id="abilities"',
    'data-step-id="equipment"',
    'data-step-id="spells"',
    'data-step-id="save"'
  ].forEach((text) => assert.match(html, new RegExp(text)));
});

test("Review keeps blocking and optional finalization issues separate", () => {
  const { draft, step } = createTestStep();

  assert.equal(step.isStepComplete(), true);
  assert.deepEqual(step.getStepWarnings(), []);

  draft.combat.maxHp = 0;
  assert.equal(step.isStepComplete(), false);
  assert.match(step.validateStep().blockingErrors[0], /Maximum hit points/);

  draft.combat.maxHp = 10;
  draft.equipment.items.push({ name: "Anvil", weight: 200, quantity: 1 });
  const validation = step.compatibility.getSection17FinalizationValidation();
  assert.equal(validation.canFinalize, true);
  assert.deepEqual(validation.optionalWarnings, [
    "Inventory weight exceeds carrying capacity."
  ]);
});

test("Review owns refresh and open-sheet actions through the standard interface", () => {
  const { getOpened, getRendered, statuses, step } = createTestStep();

  assert.equal(step.handleStepClick({ action: "refresh-review" }), true);
  assert.equal(getRendered(), 1);
  assert.deepEqual(statuses, ["Character review refreshed."]);

  assert.equal(step.handleStepClick({ action: "open-character-sheet" }), true);
  assert.equal(getOpened(), 1);
  assert.equal(step.handleStepClick({ action: "unknown" }), false);
  assert.equal(step.handleStepInput({}), false);
  assert.equal(step.handleStepChange({}), false);
  assert.equal(Object.isFrozen(step), true);
});
