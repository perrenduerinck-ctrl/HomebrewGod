import test from "node:test";
import assert from "node:assert/strict";
import {
  readFile
} from "node:fs/promises";
import path from "node:path";

const root =
  path.resolve(
    import.meta.dirname,
    ".."
  );

async function read(relativePath) {
  return readFile(
    path.join(
      root,
      relativePath
    ),
    "utf8"
  );
}

test(
  "package scripts expose every release gate",
  async () => {
    const packageJson =
      JSON.parse(
        await read(
          "package.json"
        )
      );
    const requiredScripts = [
      "audit:phases",
      "check:syntax",
      "check:imports",
      "validate:data",
      "test:unit",
      "test:browser",
      "test:deployed",
      "test:ci",
      "build:pages"
    ];

    requiredScripts.forEach(
      (scriptName) => {
        assert.equal(
          typeof packageJson
            .scripts[scriptName],
          "string",
          scriptName
        );
      }
    );
  }
);

test("creator spell selection uses bounded, incremental rendering", async () => {
  const creatorMain = await read("characterCreator.fixed.js");
  const spellsStep = await read("characterCreator/steps/spellsStep.js");
  const creator = `${creatorMain}\n${spellsStep}`;
  const picker = await read("characterCreator/spellPicker.js");
  const actionStart = spellsStep.indexOf("function handleSection16SpellAction");
  const actionEnd = spellsStep.indexOf("function handleSection16DefaultSpellSearch", actionStart);
  const actionSource = spellsStep.slice(actionStart, actionEnd);

  assert.match(creatorMain, /import \{ createSpellsStep \}/);
  assert.doesNotMatch(creatorMain, /function renderSpellsStep\s*\(/);
  assert.match(spellsStep, /function renderStep\s*\(/);
  assert.match(spellsStep, /function handleStepClick\s*\(/);
  assert.match(spellsStep, /function handleStepInput\s*\(/);
  assert.match(spellsStep, /function handleStepChange\s*\(/);
  assert.match(spellsStep, /function validateStep\s*\(/);
  assert.match(spellsStep, /function normalizeStepData\s*\(/);
  assert.match(spellsStep, /function getStepWarnings\s*\(/);
  assert.match(spellsStep, /function isStepComplete\s*\(/);
  assert.match(creator, /data-cc-spell-picker-managed/);
  assert.match(creator, /data-cc-default-spell-results/);
  assert.match(creator, /toggle-default-spell-details/);
  assert.match(creator, /CREATOR_SPELL_SEARCH_DEBOUNCE_MS/);
  assert.match(actionSource, /refreshSection16SpellPicker/);
  assert.doesNotMatch(actionSource, /renderCreatorView\(\)/);
  assert.match(creator, /toggle-spell-level[\s\S]{0,400}refreshSection16SpellPicker\(\)/);
  assert.match(picker, /CREATOR_SPELL_BATCH_SIZE = 25/);
  assert.match(picker, /visibleSpells/);
  assert.match(picker, /show-more-default-spells/);
});

test("creator equipment step owns its visible UI and handlers", async () => {
  const creatorMain = await read("characterCreator.fixed.js");
  const equipmentStep = await read("characterCreator/steps/equipmentStep.js");

  assert.match(creatorMain, /import \{ createEquipmentStep \}/);
  assert.doesNotMatch(creatorMain, /function renderEquipmentStep\s*\(/);
  assert.doesNotMatch(creatorMain, /function handleSection15\w*\s*\(/);
  assert.match(creatorMain, /equipmentStep\.actions\.forEach/);
  assert.match(equipmentStep, /function renderStep\s*\(/);
  assert.match(equipmentStep, /function handleStepClick\s*\(/);
  assert.match(equipmentStep, /function handleStepInput\s*\(/);
  assert.match(equipmentStep, /function handleStepChange\s*\(/);
  assert.match(equipmentStep, /function validateStep\s*\(/);
  assert.match(equipmentStep, /function normalizeStepData\s*\(/);
  assert.match(equipmentStep, /function getStepWarnings\s*\(/);
  assert.match(equipmentStep, /function isStepComplete\s*\(/);
  assert.match(equipmentStep, /data-cc-action="add-custom-item"/);
  assert.match(equipmentStep, /data-cc-action="skip-equipment"/);
  assert.match(equipmentStep, /"update-inventory-item"/);
});

test("creator class step owns class UI while multiclass remains independently extractable", async () => {
  const creatorMain = await read("characterCreator.fixed.js");
  const normalizedCreatorMain = creatorMain.replace(/\r/g, "");
  const classStep = await read("characterCreator/steps/classStep.js");
  const compatibilityStart = normalizedCreatorMain.indexOf(
    "const {\n    renderClassStep"
  );
  const compatibilityEnd = normalizedCreatorMain.indexOf(
    "} = classStep.compatibility;",
    compatibilityStart
  );
  const compatibilitySource = normalizedCreatorMain.slice(
    compatibilityStart,
    compatibilityEnd
  );

  assert.match(creatorMain, /import \{ createClassStep \}/);
  assert.doesNotMatch(creatorMain, /function renderClassStep\s*\(/);
  assert.doesNotMatch(creatorMain, /function renderSubclassStep\s*\(/);
  assert.doesNotMatch(creatorMain, /function handleSection12CustomClass\s*\(/);
  assert.doesNotMatch(creatorMain, /function handleSection12ChooseSubclass\s*\(/);
  assert.match(creatorMain, /classStep\.actions\.forEach/);
  [
    "handleSection12ArtificerInfusion",
    "handleSection12ChooseClass",
    "handleSection12ChooseSubclass",
    "handleSection12ClassFeatureChoice",
    "handleSection12CustomClass"
  ].forEach((handlerName) => {
    assert.match(
      compatibilitySource,
      new RegExp(`\\b${handlerName}\\b`),
      handlerName
    );
  });
  assert.match(classStep, /function renderStep\s*\(/);
  assert.match(classStep, /function handleStepClick\s*\(/);
  assert.match(classStep, /function handleStepInput\s*\(/);
  assert.match(classStep, /function handleStepChange\s*\(/);
  assert.match(classStep, /function validateStep\s*\(/);
  assert.match(classStep, /function normalizeStepData\s*\(/);
  assert.match(classStep, /function getStepWarnings\s*\(/);
  assert.match(classStep, /function isStepComplete\s*\(/);
  assert.match(classStep, /"choose-class"/);
  assert.match(classStep, /data-cc-action="use-custom-class"/);
  assert.match(classStep, /"choose-subclass"/);
  assert.doesNotMatch(classStep, /"choose-asi-feat"/);
  assert.doesNotMatch(classStep, /function handleSection12FeatSearch\s*\(/);
});

test("creator multiclass module owns its embedded editor and handlers", async () => {
  const creatorMain = await read("characterCreator.fixed.js");
  const normalizedCreatorMain = creatorMain.replace(/\r/g, "");
  const multiclassStep = await read(
    "characterCreator/steps/multiclassStep.js"
  );
  const compatibilityStart = normalizedCreatorMain.indexOf(
    "const {\n    renderMulticlassStoredChoices"
  );
  const compatibilityEnd = normalizedCreatorMain.indexOf(
    "} = multiclassStep.compatibility;",
    compatibilityStart
  );
  const compatibilitySource = normalizedCreatorMain.slice(
    compatibilityStart,
    compatibilityEnd
  );

  assert.match(creatorMain, /import \{ createMulticlassStep \}/);
  assert.doesNotMatch(creatorMain, /function renderMulticlass\w*\s*\(/);
  assert.doesNotMatch(
    creatorMain,
    /function handleSection12(?:Add|Adjust|Remove|Move|Toggle)Multiclass\w*\s*\(/
  );
  assert.doesNotMatch(
    creatorMain,
    /function handleSection12MulticlassChange\s*\(/
  );
  assert.match(creatorMain, /multiclassStep\.actions\.forEach/);
  assert.match(
    normalizedCreatorMain,
    /createMulticlassStep\(\{[\s\S]*?formatMulticlassPrerequisiteFailure,/
  );
  assert.match(
    normalizedCreatorMain,
    /createMulticlassStep\(\{[\s\S]*?getSkillDefinitionByIdOrName,/
  );
  assert.match(creatorMain, /function addMulticlassClass\s*\(/);
  assert.match(creatorMain, /function getMulticlassPrerequisiteResults\s*\(/);
  [
    "renderMulticlassProgressionEditor",
    "renderMulticlassLevelBreakdown",
    "handleSection12AddMulticlassClass",
    "handleSection12RemoveMulticlassClass",
    "handleSection12MulticlassChange"
  ].forEach((name) => {
    assert.match(
      compatibilitySource,
      new RegExp(`\\b${name}\\b`),
      name
    );
  });
  assert.match(multiclassStep, /function renderStep\s*\(/);
  assert.match(multiclassStep, /function handleStepClick\s*\(/);
  assert.match(multiclassStep, /function handleStepInput\s*\(/);
  assert.match(multiclassStep, /function handleStepChange\s*\(/);
  assert.match(multiclassStep, /function validateStep\s*\(/);
  assert.match(multiclassStep, /function normalizeStepData\s*\(/);
  assert.match(multiclassStep, /function getStepWarnings\s*\(/);
  assert.match(multiclassStep, /function isStepComplete\s*\(/);
  assert.match(multiclassStep, /formatMulticlassPrerequisiteFailure,/);
  assert.match(multiclassStep, /getSkillDefinitionByIdOrName,/);
  assert.match(multiclassStep, /data-cc-action="add-multiclass-class"/);
  assert.match(multiclassStep, /data-cc-action="remove-multiclass-class"/);
  assert.match(multiclassStep, /data-cc-action="move-character-level-order"/);
  assert.match(multiclassStep, /data-cc-action="toggle-multiclass-skill"/);
});

test("creator feats module owns the embedded feat UI and handlers", async () => {
  const creatorMain = await read("characterCreator.fixed.js");
  const normalizedCreatorMain = creatorMain.replace(/\r/g, "");
  const classStep = await read("characterCreator/steps/classStep.js");
  const featsStep = await read("characterCreator/steps/featsStep.js");
  const compatibilityStart = normalizedCreatorMain.indexOf(
    "const {\n    formatSection12FeatEffect"
  );
  const compatibilityEnd = normalizedCreatorMain.indexOf(
    "} = featsStep.compatibility;",
    compatibilityStart
  );
  const compatibilitySource = normalizedCreatorMain.slice(
    compatibilityStart,
    compatibilityEnd
  );

  assert.match(creatorMain, /import \{ createFeatsStep \}/);
  assert.doesNotMatch(
    creatorMain,
    /function (?:formatSection12FeatEffect|renderSection12FeatChoices|renderSection12CompactAsiChoice|renderSection12AsiChoice)\s*\(/
  );
  assert.doesNotMatch(
    creatorMain,
    /function handleSection12(?:AsiAction|AsiChange|ChooseAsiFeat|FeatSearch)\s*\(/
  );
  assert.match(creatorMain, /featsStep\.actions\.forEach/);
  assert.match(creatorMain, /function getFeatPrerequisiteResult\s*\(/);
  assert.match(creatorMain, /function applySelectedFeatMechanics\s*\(/);
  assert.doesNotMatch(classStep, /function handleSection12AsiAction\s*\(/);
  [
    "renderSection12FeatChoices",
    "renderSection12AsiChoice",
    "handleSection12AsiAction",
    "handleSection12FeatSearch"
  ].forEach((name) => {
    assert.match(
      compatibilitySource,
      new RegExp(`\\b${name}\\b`),
      name
    );
  });
  assert.match(featsStep, /function renderStep\s*\(/);
  assert.match(featsStep, /function handleStepClick\s*\(/);
  assert.match(featsStep, /function handleStepInput\s*\(/);
  assert.match(featsStep, /function handleStepChange\s*\(/);
  assert.match(featsStep, /function validateStep\s*\(/);
  assert.match(featsStep, /function normalizeStepData\s*\(/);
  assert.match(featsStep, /function getStepWarnings\s*\(/);
  assert.match(featsStep, /function isStepComplete\s*\(/);
  assert.match(featsStep, /data-cc-action="choose-asi-feat"/);
  assert.match(featsStep, /data-cc-action-input="filter-asi-feats"/);
  assert.match(featsStep, /data-cc-action-change="set-asi-feat-choice"/);
  assert.match(featsStep, /feat\.repeatable === true/);
});

test("creator species module owns species UI, mechanics, and validation", async () => {
  const creatorMain = await read("characterCreator.fixed.js");
  const normalizedCreatorMain = creatorMain.replace(/\r/g, "");
  const reviewStep = await read("characterCreator/steps/reviewStep.js");
  const speciesStep = await read("characterCreator/steps/speciesStep.js");
  const compatibilityStart = normalizedCreatorMain.indexOf(
    "const {\n    getAllSpeciesTemplates"
  );
  const compatibilityEnd = normalizedCreatorMain.indexOf(
    "} = speciesStep.compatibility;",
    compatibilityStart
  );
  const compatibilitySource = normalizedCreatorMain.slice(
    compatibilityStart,
    compatibilityEnd
  );

  assert.match(creatorMain, /import \{ createSpeciesStep \}/);
  assert.doesNotMatch(
    creatorMain,
    /function (?:getAllSpeciesTemplates|renderSpeciesStep|applySection11SpeciesMechanics|handleChooseSpeciesAction|isSection17SpeciesComplete)\s*\(/
  );
  assert.match(creatorMain, /speciesStep\.actions\.forEach/);
  assert.match(reviewStep, /speciesStep\.getStepWarnings\(draft\)/);
  assert.match(creatorMain, /speciesStep\.isStepComplete/);
  assert.match(creatorMain, /function normalizeCharacter\s*\(/);
  [
    "getAllSpeciesTemplates",
    "applySection11SpeciesMechanics",
    "chooseSpeciesFromTemplate",
    "renderSpeciesStep",
    "handleChooseSpeciesAction",
    "isSection17SpeciesComplete"
  ].forEach((name) => {
    assert.match(
      compatibilitySource,
      new RegExp(`\\b${name}\\b`),
      name
    );
  });
  assert.match(speciesStep, /function renderStep\s*\(/);
  assert.match(speciesStep, /function handleStepClick\s*\(/);
  assert.match(speciesStep, /function handleStepInput\s*\(/);
  assert.match(speciesStep, /function handleStepChange\s*\(/);
  assert.match(speciesStep, /function validateStep\s*\(/);
  assert.match(speciesStep, /function normalizeStepData\s*\(/);
  assert.match(speciesStep, /function getStepWarnings\s*\(/);
  assert.match(speciesStep, /function isStepComplete\s*\(/);
  assert.match(
    speciesStep,
    /"choose-species",\s*\{\s*"species-id":/
  );
  assert.match(
    speciesStep,
    /"choose-subrace",\s*\{\s*"subrace-id":/
  );
  assert.match(speciesStep, /data-cc-action="apply-species-choices"/);
  assert.match(speciesStep, /data-cc-action="use-custom-species"/);
  assert.match(speciesStep, /function setInnateSpellsForSource\s*\(/);
  assert.match(speciesStep, /function addSpeciesTrait\s*\(/);
});

test("creator background module owns background UI, mechanics, and validation", async () => {
  const creatorMain = await read("characterCreator.fixed.js");
  const normalizedCreatorMain = creatorMain.replace(/\r/g, "");
  const backgroundStep = await read("characterCreator/steps/backgroundStep.js");
  const reviewStep = await read("characterCreator/steps/reviewStep.js");
  const compatibilityStart = normalizedCreatorMain.indexOf(
    "const {\n    normalizeSection14Background"
  );
  const compatibilityEnd = normalizedCreatorMain.indexOf(
    "} = backgroundStep.compatibility;",
    compatibilityStart
  );
  const compatibilitySource = normalizedCreatorMain.slice(
    compatibilityStart,
    compatibilityEnd
  );

  assert.match(creatorMain, /import \{ createBackgroundStep \}/);
  assert.doesNotMatch(
    creatorMain,
    /function (?:normalizeSection14Background|renderBackgroundStep|handleSection14ChooseBackground|isSection17BackgroundComplete)\s*\(/
  );
  assert.match(creatorMain, /backgroundStep\.actions\.forEach/);
  assert.match(reviewStep, /backgroundStep\.getStepWarnings\(draft\)/);
  assert.match(creatorMain, /backgroundStep\.isStepComplete/);
  assert.match(creatorMain, /const skillsStep = createSkillsStep\(/);
  assert.match(creatorMain, /skillsStep\.compatibility\.getSection14SkillEntry/);
  [
    "normalizeSection14Background",
    "getSelectedSection14Background",
    "applySection14BackgroundChoices",
    "applySection14BackgroundPackage",
    "renderBackgroundStep",
    "handleSection14ChooseBackground",
    "isSection17BackgroundComplete"
  ].forEach((name) => {
    assert.match(
      compatibilitySource,
      new RegExp(`\\b${name}\\b`),
      name
    );
  });
  assert.match(backgroundStep, /function renderStep\s*\(/);
  assert.match(backgroundStep, /function handleStepClick\s*\(/);
  assert.match(backgroundStep, /function handleStepInput\s*\(/);
  assert.match(backgroundStep, /function handleStepChange\s*\(/);
  assert.match(backgroundStep, /function validateStep\s*\(/);
  assert.match(backgroundStep, /function normalizeStepData\s*\(/);
  assert.match(backgroundStep, /function getStepWarnings\s*\(/);
  assert.match(backgroundStep, /function isStepComplete\s*\(/);
  assert.match(
    backgroundStep,
    /"choose-background",\s*\{\s*"background-id":/
  );
  assert.match(backgroundStep, /data-cc-action="use-custom-background"/);
  assert.match(backgroundStep, /data-cc-action="apply-background-choices"/);
  assert.match(backgroundStep, /"apply-background-package"/);
  assert.match(backgroundStep, /data-cc-action="add-background-feature"/);
  assert.match(backgroundStep, /function addSection14BackgroundCurrency\s*\(/);
  assert.match(backgroundStep, /function removeSection14BackgroundEquipment\s*\(/);
});

test("creator abilities module owns score methods, derived UI, and validation", async () => {
  const creatorMain = await read("characterCreator.fixed.js");
  const normalizedCreatorMain = creatorMain.replace(/\r/g, "");
  const abilitiesStep = await read("characterCreator/steps/abilitiesStep.js");
  const reviewStep = await read("characterCreator/steps/reviewStep.js");
  const compatibilityStart = normalizedCreatorMain.indexOf(
    "const {\n    getSection13AbilityName"
  );
  const compatibilityEnd = normalizedCreatorMain.indexOf(
    "} = abilitiesStep.compatibility;",
    compatibilityStart
  );
  const compatibilitySource = normalizedCreatorMain.slice(
    compatibilityStart,
    compatibilityEnd
  );

  assert.match(creatorMain, /import \{ createAbilitiesStep \}/);
  assert.doesNotMatch(
    creatorMain,
    /function (?:getSection13AbilityName|applySection13StandardArray|renderAbilitiesStep|handleSection13Change|isSection17AbilitiesComplete)\s*\(/
  );
  assert.match(creatorMain, /abilitiesStep\.actions\.forEach/);
  assert.match(reviewStep, /abilitiesStep\.getStepWarnings\(draft\)/);
  assert.match(creatorMain, /abilitiesStep\.isStepComplete/);
  assert.match(creatorMain, /abilitiesStep\.renderLevelStep/);
  assert.match(
    normalizedCreatorMain,
    /createClassStep\(\{[\s\S]*?renderLevelStep:\s*\(\.\.\.args\)\s*=>\s*\{\s*return abilitiesStep\.renderLevelStep\(\.\.\.args\);/
  );
  assert.match(creatorMain, /const skillsStep = createSkillsStep\(/);
  [
    "SECTION13_POINT_BUY_COSTS",
    "getSection13AbilityName",
    "applySection13StandardArray",
    "applySection13PointBuyDefaults",
    "applySection13RolledScores",
    "renderLevelStep",
    "renderAbilitiesStep",
    "handleSection13Change",
    "isSection17AbilitiesComplete"
  ].forEach((name) => {
    assert.match(
      compatibilitySource,
      new RegExp(`\\b${name}\\b`),
      name
    );
  });
  assert.match(abilitiesStep, /function renderStep\s*\(/);
  assert.match(abilitiesStep, /function handleStepClick\s*\(/);
  assert.match(abilitiesStep, /function handleStepInput\s*\(/);
  assert.match(abilitiesStep, /function handleStepChange\s*\(/);
  assert.match(abilitiesStep, /function validateStep\s*\(/);
  assert.match(abilitiesStep, /function normalizeStepData\s*\(/);
  assert.match(abilitiesStep, /function getStepWarnings\s*\(/);
  assert.match(abilitiesStep, /function isStepComplete\s*\(/);
  assert.match(abilitiesStep, /function applySection13StandardArray\s*\(/);
  assert.match(abilitiesStep, /function applySection13PointBuyDefaults\s*\(/);
  assert.match(abilitiesStep, /function rollSection13ScorePool\s*\(/);
  assert.match(abilitiesStep, /function renderSection13ManualAbilities\s*\(/);
  assert.match(abilitiesStep, /data-cc-action="point-buy-decrease"/);
  assert.match(abilitiesStep, /data-cc-action="roll-ability-scores"/);
  assert.match(abilitiesStep, /change-ability-method/);
  assert.match(abilitiesStep, /function renderSection13DerivedMechanics\s*\(/);
  assert.match(abilitiesStep, /function renderLevelStep\s*\(/);
});

test("creator Skills module owns proficiencies, expertise, and validation", async () => {
  const creatorMain = await read("characterCreator.fixed.js");
  const normalizedCreatorMain = creatorMain.replace(/\r/g, "");
  const reviewStep = await read("characterCreator/steps/reviewStep.js");
  const skillsStep = await read("characterCreator/steps/skillsStep.js");
  const compatibilityStart = normalizedCreatorMain.indexOf(
    "const {\n    getSection14SkillEntry"
  );
  const compatibilityEnd = normalizedCreatorMain.indexOf(
    "} = skillsStep.compatibility;",
    compatibilityStart
  );
  const compatibilitySource = normalizedCreatorMain.slice(
    compatibilityStart,
    compatibilityEnd
  );

  assert.match(creatorMain, /import \{ createSkillsStep \}/);
  assert.doesNotMatch(
    creatorMain,
    /function (?:getSection14SkillEntry|toggleSection14Skill|renderSkillsStep|handleSection14ToggleSkill|isSection17SkillsComplete)\s*\(/
  );
  assert.match(creatorMain, /skillsStep\.actions\.forEach/);
  assert.match(reviewStep, /skillsStep\.getStepWarnings\(draft\)/);
  assert.match(creatorMain, /skillsStep\.isStepComplete/);
  assert.match(creatorMain, /skillsStep\.renderStep/);
  [
    "getSection14SkillEntry",
    "setSection14SkillEntry",
    "countSection14ValidSkillSource",
    "toggleSection14Skill",
    "toggleSection14Expertise",
    "applySection14ProficiencyLists",
    "renderSection14ProficiencyGuide",
    "renderSection14SourceSkillChoices",
    "renderSection14ExpertiseChoices",
    "renderSkillsStep",
    "isSection17SkillsComplete"
  ].forEach((name) => {
    assert.match(
      compatibilitySource,
      new RegExp(`\\b${name}\\b`),
      name
    );
  });
  assert.match(
    normalizedCreatorMain,
    /createSpeciesStep\(\{[\s\S]*?getSection14SkillEntry:\s*\(\.\.\.args\)\s*=>\s*\{\s*return skillsStep\.compatibility\.getSection14SkillEntry\(\.\.\.args\);/
  );
  assert.match(
    normalizedCreatorMain,
    /createBackgroundStep\(\{[\s\S]*?countSection14ValidSkillSource:\s*\(\.\.\.args\)\s*=>\s*\{\s*return skillsStep\.compatibility\.countSection14ValidSkillSource\(\.\.\.args\);/
  );
  assert.match(skillsStep, /function renderStep\s*\(/);
  assert.match(skillsStep, /function handleStepClick\s*\(/);
  assert.match(skillsStep, /function handleStepInput\s*\(/);
  assert.match(skillsStep, /function handleStepChange\s*\(/);
  assert.match(skillsStep, /function validateStep\s*\(/);
  assert.match(skillsStep, /function normalizeStepData\s*\(/);
  assert.match(skillsStep, /function getStepWarnings\s*\(/);
  assert.match(skillsStep, /function isStepComplete\s*\(/);
  assert.match(skillsStep, /data-cc-action="toggle-skill-proficiency"/);
  assert.match(skillsStep, /data-cc-action="toggle-skill-expertise"/);
  assert.match(skillsStep, /data-cc-action="apply-proficiency-lists"/);
  assert.match(skillsStep, /ccToolProficiencies/);
  assert.match(skillsStep, /ccLanguageProficiencies/);
});

test("creator Description module owns identity, story, notes, and portrait behavior", async () => {
  const creatorMain = await read("characterCreator.fixed.js");
  const backgroundStep = await read("characterCreator/steps/backgroundStep.js");
  const basicsStep = await read("characterCreator/steps/basicsStep.js");
  const descriptionStep = await read("characterCreator/steps/descriptionStep.js");

  assert.match(creatorMain, /import \{ createDescriptionStep \}/);
  assert.match(creatorMain, /const descriptionStep = createDescriptionStep\(/);
  assert.doesNotMatch(
    creatorMain,
    /function (?:getSection11Portrait|setSection11Portrait|clearSection11Portrait|replaceSection11Portrait|removeSection11Portrait|renderSection11PortraitPanel|handleSection11PortraitChange)\s*\(/
  );
  assert.match(basicsStep, /renderDescriptionNameField\(\)/);
  assert.match(basicsStep, /renderDescriptionAppearanceField\(\)/);
  assert.match(basicsStep, /renderDescriptionNotesField\(\)/);
  assert.match(backgroundStep, /renderDescriptionStoryFields\(\)/);
  assert.doesNotMatch(backgroundStep, /ccBackground(?:Traits|Ideals|Bonds|Flaws|Backstory)/);

  [
    "Character Name",
    "Appearance / Identity Notes",
    "Personality Traits",
    "Ideals",
    "Bonds",
    "Flaws",
    "Backstory",
    "General Notes",
    "Portrait Image URL"
  ].forEach((label) => assert.match(descriptionStep, new RegExp(label)));

  assert.match(descriptionStep, /function renderStep\s*\(/);
  assert.match(descriptionStep, /function handleStepClick\s*\(/);
  assert.match(descriptionStep, /function handleStepInput\s*\(/);
  assert.match(descriptionStep, /function handleStepChange\s*\(/);
  assert.match(descriptionStep, /function validateStep\s*\(/);
  assert.match(descriptionStep, /function normalizeStepData\s*\(/);
  assert.match(descriptionStep, /function getStepWarnings\s*\(/);
  assert.match(descriptionStep, /function isStepComplete\s*\(/);

  const builderDefinition = creatorMain.slice(
    creatorMain.indexOf("const BUILDER_STEPS"),
    creatorMain.indexOf("const BUILDER_STEP_INDEX")
  );
  assert.doesNotMatch(builderDefinition, /id:\s*"description"/);
});

test("creator Basics module owns the Basics screen and composes Description fields", async () => {
  const creatorMain = await read("characterCreator.fixed.js");
  const basicsStep = await read("characterCreator/steps/basicsStep.js");

  assert.match(creatorMain, /import \{ createBasicsStep \}/);
  assert.match(creatorMain, /const basicsStep = createBasicsStep\(/);
  assert.doesNotMatch(creatorMain, /function renderBasicsStep\s*\(/);
  assert.doesNotMatch(creatorMain, /function isSection17BasicsComplete\s*\(/);
  assert.match(
    creatorMain,
    /registerCharacterStepRenderer\(\s*"basics",\s*basicsStep\.renderStep\s*\)/
  );
  assert.match(
    creatorMain,
    /registerCharacterStepCompletion\(\s*"basics",\s*basicsStep\.isStepComplete\s*\)/
  );

  [
    "ccPronouns",
    "ccAlignment",
    "ccDeity",
    "ccAge",
    "ccIdentitySize"
  ].forEach((fieldId) => {
    assert.match(basicsStep, new RegExp(fieldId));
  });

  [
    "renderSection11PortraitPanel",
    "renderDescriptionNameField",
    "renderDescriptionAppearanceField",
    "renderDescriptionNotesField"
  ].forEach((renderHelper) => {
    assert.match(basicsStep, new RegExp(`${renderHelper}\\(\\)`));
  });

  assert.doesNotMatch(basicsStep, /id="ccCharacterName"/);
  assert.doesNotMatch(basicsStep, /id="ccAppearance"/);
  assert.doesNotMatch(basicsStep, /id="ccGeneralNotes"/);
  assert.doesNotMatch(basicsStep, /Portrait Image URL/);
  assert.match(basicsStep, /function renderStep\s*\(/);
  assert.match(basicsStep, /function handleStepClick\s*\(/);
  assert.match(basicsStep, /function handleStepInput\s*\(/);
  assert.match(basicsStep, /function handleStepChange\s*\(/);
  assert.match(basicsStep, /function validateStep\s*\(/);
  assert.match(basicsStep, /function normalizeStepData\s*\(/);
  assert.match(basicsStep, /function getStepWarnings\s*\(/);
  assert.match(basicsStep, /function isStepComplete\s*\(/);
});

test("creator Review module owns final validation, summaries, and review actions", async () => {
  const creatorMain = await read("characterCreator.fixed.js");
  const reviewStep = await read("characterCreator/steps/reviewStep.js");

  assert.match(creatorMain, /import \{ createReviewStep \}/);
  assert.match(creatorMain, /const reviewStep = createReviewStep\(/);
  assert.doesNotMatch(creatorMain, /function renderReviewStep\s*\(/);
  assert.doesNotMatch(creatorMain, /function getSection17Warnings\s*\(/);
  assert.doesNotMatch(creatorMain, /function getSection17FinalizationValidation\s*\(/);
  assert.doesNotMatch(creatorMain, /function isSection17ReviewComplete\s*\(/);
  assert.doesNotMatch(creatorMain, /function handleSection17RefreshReview\s*\(/);
  assert.match(
    creatorMain,
    /registerCharacterStepRenderer\(\s*"review",\s*reviewStep\.renderStep\s*\)/
  );
  assert.match(
    creatorMain,
    /registerCharacterStepCompletion\(\s*"review",\s*reviewStep\.isStepComplete\s*\)/
  );
  assert.match(creatorMain, /reviewStep\.actions\.forEach/);

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
    'data-step-id="save"'
  ].forEach((contract) => {
    assert.match(reviewStep, new RegExp(contract));
  });

  assert.match(reviewStep, /function renderStep\s*\(/);
  assert.match(reviewStep, /function handleStepClick\s*\(/);
  assert.match(reviewStep, /function handleStepInput\s*\(/);
  assert.match(reviewStep, /function handleStepChange\s*\(/);
  assert.match(reviewStep, /function validateStep\s*\(/);
  assert.match(reviewStep, /function normalizeStepData\s*\(/);
  assert.match(reviewStep, /function getStepWarnings\s*\(/);
  assert.match(reviewStep, /function isStepComplete\s*\(/);

  assert.match(creatorMain, /function formatSection17Modifier\s*\(/);
  assert.match(creatorMain, /function formatSection17ClassLevelSummary\s*\(/);
  assert.match(creatorMain, /function renderSection17SpellcastingSummary\s*\(/);
});

test(
  "GitHub Actions tests every push before deploying Pages",
  async () => {
    const workflow =
      await read(
        ".github/workflows/release-readiness.yml"
      );

    assert.match(
      workflow,
      /\bpush:/
    );
    assert.match(
      workflow,
      /needs:\s*test/
    );
    assert.match(
      workflow,
      /npm run test:ci/
    );
    assert.match(
      workflow,
      /npm run test:deployed/
    );
    assert.match(
      workflow,
      /actions\/deploy-pages@/
    );
  }
);

test(
  "release gates cover missing imports, placeholders, and unsupported effects",
  async () => {
    const importCheck =
      await read(
        "scripts/check-imports.mjs"
      );
    const dataCheck =
      await read(
        "scripts/validate-data.mjs"
      );

    assert.match(
      importCheck,
      /references missing file/
    );
    assert.match(
      dataCheck,
      /placeholderPattern/
    );
    assert.match(
      dataCheck,
      /unsupported type/
    );
  }
);

test(
  "the Phase 20 release marker is wired through the application",
  async () => {
    const index =
      await read("index.html");
    const smoke =
      await read(
        "ai-testing/app-smoke-test.html"
      );

    assert.match(
      index,
      /phase20-20260727/
    );
    assert.match(
      smoke,
      /phase20-20260727/
    );
  }
);

test(
  "character choice cards keep their natural height",
  async () => {
    const creator =
      await read(
        "characterCreator.fixed.js"
      );

    assert.match(
      creator,
      /\.hg-character-choice-grid\s*\{[^}]*align-items:\s*start;/s
    );
    assert.match(
      creator,
      /\.hg-character-choice-card\s*\{[^}]*align-self:\s*start;/s
    );
  }
);

test(
  "multiclass details preserve explicit class ownership",
  async () => {
    const creator =
      await read(
        "characterCreator.fixed.js"
      );

    assert.match(
      creator,
      /data-class-profile-entry-id=/
    );
    assert.match(
      creator,
      /data-class-feature-group-entry-id=/
    );
    assert.match(
      creator,
      /data-feature-card-class-id=/
    );
    assert.match(
      creator,
      /Only .* class and subclass features are shown in this group\./
    );
  }
);

test(
  "existing gameplay saves use guarded update-only persistence",
  async () => {
    const creatorPersistence =
      await read(
        "characterCreator/persistenceGuard.js"
      );
    const gameplayPersistence =
      await read(
        "characterSheet/persistence.js"
      );
    const index =
      await read("index.html");

    assert.match(
      creatorPersistence,
      /mergeCharacterRecordPreservingUnknownFields/
    );
    assert.match(
      creatorPersistence,
      /persistence\.base\.js/
    );
    assert.match(
      gameplayPersistence,
      /assertCharacterMutationAccess/
    );
    assert.match(
      gameplayPersistence,
      /assertNoStaleRevision/
    );
    assert.match(
      gameplayPersistence,
      /await updateDoc/
    );
    assert.doesNotMatch(
      gameplayPersistence,
      /\baddDoc\b/
    );
    assert.match(
      index,
      /"\.\/characterCreator\/persistence\.js":\s*"\.\/characterCreator\/(?:persistence|persistenceGuard)\.js\?v=/
    );
  }
);

test(
  "character movement speeds are guarded at input, load, and save boundaries",
  async () => {
    const walkingSpeed =
      await read(
        "characterCreator/walkingSpeed.js"
      );
    const persistenceGuard =
      await read(
        "characterCreator/persistenceGuard.js"
      );
    const packageJson =
      JSON.parse(
        await read("package.json")
      );

    assert.match(
      walkingSpeed,
      /MINIMUM_WALKING_SPEED\s*=\s*\n?\s*0/
    );
    assert.match(
      walkingSpeed,
      /MAXIMUM_WALKING_SPEED\s*=\s*\n?\s*100/
    );
    assert.match(
      walkingSpeed,
      /DEFAULT_WALKING_SPEED\s*=\s*\n?\s*30/
    );
    assert.match(
      walkingSpeed,
      /setAttribute\(\s*"min"/
    );
    assert.match(
      walkingSpeed,
      /setAttribute\(\s*"max"/
    );
    assert.match(
      walkingSpeed,
      /setAttribute\(\s*"step"/
    );
    [
      "ccCustomSpeciesSpeed",
      "ccWalkSpeed",
      "ccClimbSpeed",
      "ccSwimSpeed",
      "ccFlySpeed",
      "ccBurrowSpeed"
    ].forEach((inputId) => {
      assert.match(
        walkingSpeed,
        new RegExp(inputId)
      );
    });
    assert.match(
      walkingSpeed,
      /normalizeMovementSpeed/
    );
    assert.match(
      persistenceGuard,
      /guardCharacterDraftWalkingSpeed/
    );
    assert.match(
      persistenceGuard,
      /normalizeCharacterWalkingSpeed/
    );
    assert.match(
      packageJson.scripts[
        "test:browser"
      ],
      /walking-speed\.spec\.mjs/
    );
    assert.match(
      packageJson.scripts[
        "test:deployed"
      ],
      /walking-speed\.spec\.mjs/
    );
  }
);

test(
  "character creator UI uses compact searchable and focused selection controls",
  async () => {
    const enhancements =
      await read(
        "characterCreator/uiEnhancements.js"
      );
    const styles =
      await read(
        "characterCreator/uiEnhancements.css"
      );
    const persistenceGuard =
      await read(
        "characterCreator/persistenceGuard.js"
      );
    const packageJson =
      JSON.parse(
        await read("package.json")
      );

    assert.match(
      enhancements,
      /data-hg-spell-level/
    );
    assert.match(
      enhancements,
      /selected-spells-only/
    );
    assert.match(
      enhancements,
      /Add Another Class/
    );
    assert.match(
      enhancements,
      /remove-multiclass-class/
    );
    assert.match(
      enhancements,
      /data-hg-feat-filter/
    );
    assert.match(
      enhancements,
      /CORE_STEPS/
    );
    assert.match(
      styles,
      /\.hg-character-step-footer\s*\{[^}]*position:\s*sticky/s
    );
    assert.match(
      persistenceGuard,
      /uiEnhancements\.js/
    );
    assert.match(
      packageJson.scripts[
        "test:browser"
      ],
      /character-creator-ui\.spec\.mjs/
    );
    assert.match(
      packageJson.scripts[
        "test:deployed"
      ],
      /character-creator-ui\.spec\.mjs/
    );
  }
);
