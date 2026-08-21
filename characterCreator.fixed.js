// =====================================================
// CHARACTER CREATOR.JS — HOMEBREW GOD CHARACTER CREATOR
// Batch 1 of 4: permanent foundation sections 1 through 5.
// Plain HTML/CSS/JS module — no React.
// =====================================================


// =====================================================
// CHARACTER CREATOR SECTION 1 — MODULE / DEPENDENCIES
// =====================================================

import {
  DEFAULT_CLASSES,
  DEFAULT_CLASS_SCHEMA_VERSION,
  validateDefaultClassCollection
} from "./defaultClasses.js";
import {
  DEFAULT_FIGHTING_STYLE_EFFECTS,
  DEFAULT_INVOCATION_DETAILS,
  DEFAULT_MANEUVER_DETAILS,
  DEFAULT_METAMAGIC_DETAILS
} from "./defaultClassFeatureRules.js";
import {
  DEFAULT_FEATS,
  DEFAULT_FEAT_ABILITY_SCORE_MAXIMUM,
  validateDefaultFeatCollection,
  validateFeatPrerequisiteDefinitions
} from "./defaultFeats.js";
import {
  ADDITIONAL_CANTRIP_EXPECTATIONS_2014,
  ADDITIONAL_CANTRIP_IDS_2014,
  ADDITIONAL_CANTRIP_COUNT_2014,
  DEFAULT_SPELLS,
  SRD_SPELL_COUNT_2014,
  validateDefaultSpellCatalog,
  validateDefaultSpellReferences
} from "./defaultSpells.js?v=phase15-20260726";
import {
  DEFAULT_SUBCLASSES,
  validateDefaultSubclassCollection
} from "./defaultSubclasses.js";
import {
  createCharacterSheetJson,
  createCharacterSheetView
} from "./characterSheet.js";
import {
  ACTIVE_RULESET,
  getLegacy2014Metadata,
  isActiveRulesetEntry
} from "./ruleset2014.js?v=phase15-20260726";
import {
  BUILTIN_BACKGROUND_2014_EXPECTATIONS,
  BUILTIN_BACKGROUND_IDS_2014,
  BUILTIN_SPECIES_2014_EXPECTATIONS,
  BUILTIN_SPECIES_IDS_2014,
  BUILTIN_SUBRACE_2014_EXPECTATIONS,
  enrichBuiltinBackgroundTemplate,
  enrichBuiltinSpeciesTemplate,
  validateBuiltinSpeciesBackgroundCatalog
} from "./defaultSpeciesBackgroundContent.js?v=phase14-20260726";
import {
  assertCharacterMutationAccess,
  friendlyServiceError
} from "./securityPersistence.js";

import { createCharacterCatalogs } from "./characterCreator/catalogs.js";
import { createCharacterPersistence } from "./characterCreator/persistence.js";
import { runCharacterCreatorSelfTests } from "./characterCreator/selfTests.js";
import {
  getProgressionValueByLevel,
  SRD_2014_FIGHTER_ASI_LEVELS,
  SRD_2014_ROGUE_ASI_LEVELS,
  SRD_2014_STANDARD_ASI_LEVELS
} from "./characterCreator/classProgression.js";
import {
  getClassFeaturesThroughLevel
} from "./characterCreator/classMechanics.js";
import {
  createFeatSpellSourceMetadata, decodeFeatChoiceValue, describeFeatSpellChoiceRestrictions,
  encodeFeatChoiceValue, FEAT_CHOICE_VALUE_PREFIX, getFeatAbilityEffectMaximum,
  getFeatSpellChoiceLimit, isSpellEligibleForFeatChoice, normalizeFeatChoiceSelections,
  parseFeatChoiceSelections
} from "./characterCreator/featMechanics.js";
import {
  MULTICLASS_PREREQUISITES,
  MULTICLASS_PROFICIENCY_GRANTS
} from "./characterCreator/multiclassing.js";
import {
  normalizeCharacterEnvelope
} from "./characterCreator/normalization.js";
import { renderInnateSpellCards } from "./characterCreator/innateSpellPresentation.js";
import { renderMagicalSecretsPanels } from "./characterCreator/magicalSecrets.js";
import { escapeHtml } from "./characterCreator/rendering.js";
import { getCreatorSpellSearchText, renderCreatorSpellPickerResults } from "./characterCreator/spellPicker.js";
import {
  createCatalogPage,
  CREATOR_CATALOG_BATCH_SIZE
} from "./characterCreator/catalogPagination.js";
import { createClassStep } from "./characterCreator/steps/classStep.js?v=class-step-extraction-20260812";
import { createMulticlassStep } from "./characterCreator/steps/multiclassStep.js?v=multiclass-step-extraction-20260813";
import { createFeatsStep } from "./characterCreator/steps/featsStep.js?v=feats-step-extraction-20260813";
import { createSpeciesStep } from "./characterCreator/steps/speciesStep.js?v=species-step-extraction-20260813";
import { createBackgroundStep } from "./characterCreator/steps/backgroundStep.js?v=background-step-extraction-20260813";
import { createAbilitiesStep } from "./characterCreator/steps/abilitiesStep.js?v=abilities-step-extraction-20260813";
import { createSkillsStep } from "./characterCreator/steps/skillsStep.js?v=skills-step-extraction-20260813";
import { createDescriptionStep } from "./characterCreator/steps/descriptionStep.js?v=description-step-extraction-20260813";
import { createBasicsStep } from "./characterCreator/steps/basicsStep.js?v=basics-step-extraction-20260814";
import { createReviewStep } from "./characterCreator/steps/reviewStep.js?v=review-step-extraction-20260814";
import { createFinishStep } from "./characterCreator/steps/finishStep.js?v=finish-step-extraction-20260814";
import { createEquipmentStep } from "./characterCreator/steps/equipmentStep.js?v=equipment-step-extraction-20260812";
import { createSpellsStep } from "./characterCreator/steps/spellsStep.js?v=spells-step-extraction-20260803";
import {
  calculateCharacterCarryingCapacity,
  calculateRuleCarryingCapacity,
  calculateRuleFixedAverageHp,
  calculateRulePassiveScore,
  calculateRuleSkillModifier,
  calculateRuleSpellAttackBonus,
  calculateRuleSpellSaveDc,
  SRD_2014_SIZE_CARRY_MULTIPLIERS
} from "./characterCreator/rulesMath.js";
import {
  calculateSrd2014MulticlassSpellcasting,
  getSrd2014PactMagic,
  getSrd2014SpellSlots,
  slotsArrayToObject,
  SRD_2014_FULL_CASTER_SLOTS,
  SRD_2014_PACT_MAGIC
} from "./characterCreator/spellcasting.js";
import { adjustCanonicalSpellResource, clearMagicalSecretsCompatibilitySources, getCanonicalSpellSources, normalizeSpellSources, restoreCanonicalSpellResources, SPELL_SOURCE_MODEL_VERSION, storeMagicalSecretsCompatibilitySource, synchronizeCanonicalSpellSources } from "./characterCreator/spellSources.js?v=canonical-spell-sources-20260802";
import {
  mergeSubclassFeatureLevels
} from "./characterCreator/subclassMechanics.js";
import {
  normalizeSpeciesBackgroundChoices
} from "./characterCreator/speciesBackgrounds.js";
import {
  applyCharacterCreatorFieldLimits,
  getCharacterFieldLimit,
  installCharacterCreatorTextInputGuard,
  normalizeCharacterTextFields,
  truncateUnicode
} from "./characterCreator/fieldLimits.js?v=creator-fix-pass-20260730";
import { applyDerivedMovementSpeeds, normalizeCharacterWalkingSpeed, normalizeMovementSpeed }
  from "./characterCreator/walkingSpeed.js?v=creator-fix-pass-20260730";
import { deleteSelectedRoomClass, readCustomClassMovementEffects, renderCustomClassMovementFields }
  from "./characterCreator/customClassTools.js?v=creator-fix-pass-20260730";
import {
  countCharacterAttunedItems,
  getCharacterAttunementLimit,
  normalizeInventoryItemBase
} from "./characterCreator/inventoryEquipment.js";
import {
  createDerivedSignature,
  createScopedDerivedCache,
  getDerivedObjectIdentity
} from "./characterCreator/derivedCache.js";
import {
  applyGameplayAction,
  ensureGameplayState
} from "./characterSheet/gameplayState.js";
export function createCharacterCreator(options = {}) {
  const deps = {
    db: options.db,
    doc: options.doc,
    collection: options.collection,
    getDoc: options.getDoc,
    addDoc: options.addDoc,
    updateDoc: options.updateDoc,
    deleteDoc: options.deleteDoc,
    onSnapshot: options.onSnapshot,
    serverTimestamp: options.serverTimestamp,

    getCurrentRoomCode: options.getCurrentRoomCode,
    getCurrentRoomData: options.getCurrentRoomData,
    getCurrentIsDM: options.getCurrentIsDM,
    getCurrentUserUid: options.getCurrentUserUid,

    createCharacterLinkedToken:
      options.createCharacterLinkedToken,

    syncLinkedCharacterTokens:
      options.syncLinkedCharacterTokens,

    uploadCharacterPortrait:
      options.uploadCharacterPortrait ||
      options.uploadPortrait ||
      options.uploadImage,

    deleteCharacterPortrait:
      options.deleteCharacterPortrait ||
      options.deletePortrait ||
      options.deleteImage
  };

  const derivedCache = createScopedDerivedCache({
    maximumEntriesPerScope: 384
  });

  const CHARACTER_SCHEMA_VERSION = 13;
  const CLASS_SCHEMA_VERSION =
    DEFAULT_CLASS_SCHEMA_VERSION;
  const SPECIES_SCHEMA_VERSION = 1;
  const BACKGROUND_SCHEMA_VERSION = 1;

  const $ = (id) => document.getElementById(id);

  function hasFirestoreTools() {
    return Boolean(
      deps.db &&
      deps.doc &&
      deps.collection &&
      deps.addDoc &&
      deps.updateDoc &&
      deps.deleteDoc &&
      deps.onSnapshot &&
      deps.serverTimestamp
    );
  }

  function getRoomCode() {
    const roomCode = deps.getCurrentRoomCode
      ? deps.getCurrentRoomCode()
      : "";

    return String(roomCode || "").trim().toUpperCase();
  }

  function getSection18MutationIdentity() {
    const roomData =
      deps.getCurrentRoomData
        ? deps.getCurrentRoomData() || {}
        : {};

    return {
      actorUid:
        deps.getCurrentUserUid
          ? deps.getCurrentUserUid()
          : "",
      roomDmUid:
        roomData.dmUid || ""
    };
  }


// =====================================================
// CHARACTER CREATOR SECTION 2 — BUILDER STEP DEFINITIONS
// =====================================================

  const BUILDER_STEPS = Object.freeze([
    {
      id: "basics",
      label: "Character Basics",
      shortLabel: "Basics",
      description: "Name, portrait, identity, appearance, and general character details.",
      required: true
    },
    {
      id: "class",
      label: "Class",
      shortLabel: "Class",
      description: "Choose a class from default, room, or imported templates.",
      required: true
    },
    {
      id: "background",
      label: "Background",
      shortLabel: "Background",
      description: "Choose or create a background and its narrative details.",
      required: false
    },
    {
      id: "species",
      label: "Species / Race",
      shortLabel: "Species",
      description: "Choose an ancestry template and make any ancestry-based choices.",
      required: true
    },
    {
      id: "abilities",
      label: "Ability Scores",
      shortLabel: "Abilities",
      description: "Use manual entry, standard array, point buy, or rolled scores.",
      required: true
    },
    {
      id: "equipment",
      label: "Equipment",
      shortLabel: "Equipment",
      description: "Choose starting gear and manage inventory and currency.",
      required: false
    },
    {
      id: "spells",
      label: "Spells / Features",
      shortLabel: "Spells",
      description: "Review class features, ancestry traits, spells, and custom abilities.",
      required: false
    },
    {
      id: "review",
      label: "Review Sheet",
      shortLabel: "Review",
      description: "Review calculated values, warnings, and unfinished selections.",
      required: true
    },
    {
      id: "save",
      label: "Save / Export / Token",
      shortLabel: "Finish",
      description: "Save, finalize, back up, and create a character-linked token.",
      required: true
    }
  ]);

  const BUILDER_STEP_INDEX = new Map(
    BUILDER_STEPS.map((step, index) => [step.id, index])
  );

  function getStepById(stepId) {
    return BUILDER_STEPS.find((step) => step.id === stepId) || BUILDER_STEPS[0];
  }

  function getExactBuilderStepById(stepId) {
    const cleanStepId = String(stepId || "").trim();
    return BUILDER_STEPS.find((step) => step.id === cleanStepId) || null;
  }

  function getStepIndex(stepId) {
    return BUILDER_STEP_INDEX.has(stepId)
      ? BUILDER_STEP_INDEX.get(stepId)
      : 0;
  }

  function clampStepIndex(index) {
    const number = Number(index);

    if (!Number.isFinite(number)) {
      return 0;
    }

    return Math.max(
      0,
      Math.min(BUILDER_STEPS.length - 1, Math.round(number))
    );
  }


// =====================================================
// CHARACTER CREATOR SECTION 3 — CHARACTER DATA SCHEMA
// =====================================================

  const CURRENCY_DENOMINATIONS = Object.freeze([
    "cp",
    "sp",
    "ep",
    "gp",
    "pp"
  ]);

  function createAbilityMap(defaultValue = 0) {
    return {
      str: defaultValue,
      dex: defaultValue,
      con: defaultValue,
      int: defaultValue,
      wis: defaultValue,
      cha: defaultValue
    };
  }

  function createEmptyCharacter() {
    const baseScores = createAbilityMap(10);

    return {
      id: null,
      sheetType: "character",
      schemaVersion: CHARACTER_SCHEMA_VERSION,
      rulesetId: ACTIVE_RULESET.id,
      rulesEdition: ACTIVE_RULESET.edition,
      rulesMode: ACTIVE_RULESET.mode,

      identity: {
        name: "",
        pronouns: "",
        alignment: "",
        deity: "",
        age: "",
        size: "medium",
        appearance: "",
        image: {
          url: "",
          publicId: ""
        }
      },

      species: {
        id: "",
        name: "",
        source: "custom",
        templateSnapshot: null,
        choices: {},
        traits: []
      },

      classProgression: {
        totalLevel: 1,
        classes: [],
        levelOrder: [],
        unarmoredDefenseSource: null
      },

      classData: null,
      classChoices: {},
      classMechanics: {
        schemaVersion: 1,
        resources: [],
        armorClassFormulas: [],
        armorClassModifiers: [],
        attackModifiers: [],
        spellModifiers: [],
        combatProfiles: [],
        classSaveDcs: [],
        attackAction: {
          attacks: 1,
          sourceIds: [],
          sourceNames: []
        },
        spellcastingBlocked: false,
        spellcastingBlockReasons: [],
        passiveEffects: [],
        restrictions: [],
        infusions: []
      },
      feats: [],
      selectedFeats: [],
      advancementChoices: [],
      featMechanics: {
        schemaVersion: 4,
        hpBonus: 0,
        initiativeBonus: 0,
        speedBonus: 0,
        resistances: [],
        resistanceSources: [],
        naturalWeapons: [],
        armorClassModifiers: [],
        attackModifiers: [],
        selectedFeatures: [],
        elementalAdepts: [],
        damageReductions: [],
        senses: [],
        restChoices: [],
        ritualBooks: [],
        actions: [],
        combatProfiles: [],
        telepathy: [],
        healingBonuses: [],
        resources: [],
        spellcasting: [],
        situationalEffects: [],
        passiveEffects: [],
        instances: []
      },

      abilities: {
        method: "manual",
        base: { ...baseScores },
        bonuses: createAbilityMap(0),
        bonusSources: {},
        scores: { ...baseScores },
        modifiers: createAbilityMap(0),
        assignmentPool: []
      },

      background: {
        id: "",
        name: "",
        source: "custom",
        templateSnapshot: null,
        featureChoices: {},
        traits: "",
        ideals: "",
        bonds: "",
        flaws: "",
        backstory: ""
      },

      proficiencies: {
        skills: {},
        savingThrows: [],
        armor: [],
        weapons: [],
        tools: [],
        languages: []
      },

      combat: {
        gameplaySchemaVersion: 1,
        armorClass: 10,
        armorClassMode: "auto",
        selectedArmorClassMethod: "",
        manualArmorClass: null,
        armorClassBonus: 0,
        armorClassOptions: {
          selected: null,
          options: []
        },
        maxHp: 1,
        currentHp: 1,
        temporaryHp: 0,
        inspiration: false,
        conditions: [],
        deathSaves: {
          successes: 0,
          failures: 0
        },
        initiative: 0,
        initiativeBonus: 0,
        initiativeProficient: false,
        proficiencyBonus: 2,
        attacksPerAction: 1,
        classFeatureStates: {
          rageActive: false
        },
        hpCalculation: {
          schemaVersion: 2,
          mode: "fixed",
          levelOneValue: null,
          laterLevelValues: [],
          manualOverride: null,
          lastCalculatedConModifier: 0
        },

        baseSpeed: {
          walk: 30,
          climb: 0,
          swim: 0,
          fly: 0,
          burrow: 0,
          special: ""
        },

        speed: {
          walk: 30,
          climb: 0,
          swim: 0,
          fly: 0,
          burrow: 0,
          special: ""
        },

        hitDice: [],
        hitDiceUsage: {}
      },

      equipment: {
        startingPackageId: "",

        currency: {
          cp: 0,
          sp: 0,
          ep: 0,
          gp: 0,
          pp: 0
        },

        currencySources: {},

        items: [],
        notes: ""
      },

      magic: {
        spellcastingAbility: "",
        spellcastingProgression: "none",
        spellPreparation: "none",
        spellSaveDc: null,
        spellAttackBonus: null,
        knownSpellIds: [],
        preparedSpellIds: [],
        unassignedKnownSpellIds: [],
        unassignedPreparedSpellIds: [],
        spellSourceModelVersion: SPELL_SOURCE_MODEL_VERSION,
        spellSources: [],
        classSources: {},
        featSources: {},
        customSpells: [],
        innateSpells: [],
        slots: {},
        slotUsage: {
          normal: {},
          pact: 0,
          pactSources: {}
        },
        pactMagic: {
          slots: 0,
          slotLevel: 0
        },
        pactMagicSources: [],
        notes: ""
      },

      features: {
        classFeatures: [],
        speciesTraits: [],
        backgroundFeatures: [],
        customFeatures: [],
        notes: ""
      },

      builder: {
        currentStep: "basics",
        visitedSteps: ["basics"],
        completedSteps: [],
        validation: {},
        status: "draft",
        finalizedAtMillis: null,
        lastSavedAtMillis: null
      },

      notes: "",

      // Temporary compatibility aliases.
      // These allow old saved characters and the current HTML to work
      // until Sections 6–20 are installed.
      name: "",
      race: "",
      classId: "",
      className: "",
      selectedClassSnapshot: null,
      subclassName: "",
      level: 1,
      armorClass: 10,
      maxHp: 1,
      currentHp: 1,
      speed: "30 ft.",
      stats: { ...baseScores },
      skills: [],
      equipmentText: "",
      spells: "",
      featuresText: "",
      backgroundName: ""
    };
  }

  function cloneData(value) {
    if (value === undefined) {
      return undefined;
    }

    return JSON.parse(JSON.stringify(value));
  }

  function safeNumber(value, fallback = 0) {
    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : fallback;
  }

  function clampLevel(value) {
    return Math.max(
      1,
      Math.min(20, Math.round(safeNumber(value, 1)))
    );
  }

  function cleanString(value, fallback = "") {
    const clean = String(value ?? "").trim();

    return clean || fallback;
  }

  function normalizeCharacterImageValue(
    rawImage,
    owner = {}
  ) {
    const emptyImage = {
      url: "",
      publicId: ""
    };

    if (typeof rawImage === "string") {
      return {
        ...emptyImage,
        url: cleanString(rawImage)
      };
    }

    const imageObject =
      rawImage &&
      typeof rawImage === "object" &&
      !Array.isArray(rawImage)
        ? rawImage
        : {};

    const legacyOwner =
      owner &&
      typeof owner === "object"
        ? owner
        : {};

    return {
      ...emptyImage,

      url: cleanString(
        imageObject.url ||
        imageObject.downloadUrl ||
        imageObject.downloadURL ||
        imageObject.download_url ||
        imageObject.secureUrl ||
        imageObject.secure_url ||
        imageObject.src ||
        legacyOwner.imageUrl ||
        legacyOwner.imageURL ||
        legacyOwner.portraitUrl ||
        legacyOwner.portraitURL ||
        legacyOwner.avatarUrl ||
        legacyOwner.avatarURL
      ),

      publicId: cleanString(
        imageObject.publicId ||
        imageObject.publicID ||
        imageObject.public_id ||
        imageObject.storagePath ||
        imageObject.path
      )
    };
  }

  function cleanArray(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => cleanString(item))
      .filter(Boolean);
  }

  function uniqueCleanArray(value) {
    return [
      ...new Set(
        cleanArray(value)
      )
    ];
  }

  function normalizeClassChoiceMap(value) {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      return {};
    }

    return Object.entries(value).reduce(
      (choices, [featureId, selectedValues]) => {
        const id = cleanString(featureId);
        const values = uniqueCleanArray(
          Array.isArray(selectedValues)
            ? selectedValues
            : [selectedValues]
        );

        if (id && values.length) {
          choices[id] = values;
        }

        return choices;
      },
      {}
    );
  }

  function normalizeFeatIds(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    return [
      ...new Set(
        value
          .map((feat) => {
            const rawId = cleanString(
              typeof feat === "string"
                ? feat
                : feat?.id || feat?.name
            );

            if (!rawId) {
              return "";
            }

            const knownFeat = DEFAULT_FEATS.find((entry) => {
              return (
                entry.id === rawId ||
                entry.name.toLowerCase() === rawId.toLowerCase()
              );
            });

            return knownFeat?.id || rawId;
          })
          .filter(Boolean)
      )
    ];
  }

  function normalizeAdvancementChoices(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    const choices = new Map();

    value.forEach((choice) => {
      if (!choice || typeof choice !== "object") {
        return;
      }

      const classId = makeSafeId(choice.classId, "");
      const classEntryId = cleanString(
        choice.classEntryId ||
          choice.entryId
      );
      const classLevel = Math.max(
        0,
        Math.round(safeNumber(choice.classLevel, 0))
      );
      const id = cleanString(
        choice.id,
        (classEntryId || classId) && classLevel
          ? `${classEntryId || classId}-level-${classLevel}-asi`
          : ""
      );

      if (
        !id ||
        (!classId && !classEntryId) ||
        !classLevel
      ) {
        return;
      }

      const mode = ["asi", "feat"].includes(
        cleanString(choice.mode || choice.selectedMode).toLowerCase()
      )
        ? cleanString(
            choice.mode || choice.selectedMode
          ).toLowerCase()
        : "";
      const featId = cleanString(
        choice.featId || choice.selectedFeatId
      );
      const knownFeat = DEFAULT_FEATS.find((feat) => {
        return feat.id === featId;
      });

      choices.set(id, {
        id,
        type: "asi-or-feat",
        classEntryId,
        classId,
        classLevel,
        mode,
        featId: mode === "feat" ? featId : "",
        featName:
          mode === "feat"
            ? cleanString(choice.featName, knownFeat?.name || "")
            : "",
        featChoices:
          mode === "feat"
            ? normalizeFeatChoiceSelections(choice.featChoices)
            : {}
      });
    });

    return [...choices.values()];
  }

  function findDefaultClassDefinition(classId, className = "") {
    const normalizedId = makeSafeId(
      classId || className,
      ""
    );

    return (
      DEFAULT_CLASSES[normalizedId] ||
      Object.values(DEFAULT_CLASSES).find((classData) => {
        return (
          classData.name.toLowerCase() ===
          cleanString(className).toLowerCase()
        );
      }) ||
      null
    );
  }

  function getDefaultClassFeaturesThroughLevel(
    classData,
    level
  ) {
    if (!classData) {
      return [];
    }

    return getClassFeaturesThroughLevel(
      classData.featuresByLevel,
      level,
      (feature, unlockedLevel) => {
        const name = cleanString(
          typeof feature === "string"
            ? feature
            : feature?.name,
          "Unnamed Feature"
        );

        return {
          ...(typeof feature === "object"
            ? cloneData(feature)
            : {}),
          id: makeSafeId(
            typeof feature === "object"
              ? feature?.id || name
              : name,
            "class-feature"
          ),
          name,
          level: unlockedLevel
        };
      }
    );
  }

  function addMigrationWarning(
    character,
    warning
  ) {
    const message =
      cleanString(warning);

    if (!message) {
      return;
    }

    character.builder =
      character.builder || {};

    character.builder.validation =
      character.builder.validation || {};

    const warnings =
      cleanArray(
        character.builder
          .validation
          .migrationWarnings
      );

    character.builder
      .validation
      .migrationWarnings = [
        ...new Set([
          ...warnings,
          message
        ])
      ];
  }

  function isPlainObject(value) {
    return (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }

  function normalizeImportSourceList(value) {
    if (Array.isArray(value)) {
      return uniqueCleanArray(value);
    }

    if (typeof value === "string") {
      return uniqueCleanArray([value]);
    }

    return [];
  }

  function hasMalformedSourceValue(value) {
    return (
      value !== null &&
      value !== undefined &&
      value !== "" &&
      !Array.isArray(value) &&
      typeof value !== "string"
    );
  }

  function cleanImportSourceLabel(
    value,
    fallback = "import"
  ) {
    const sources =
      normalizeImportSourceList(value);

    return (
      sources[0] ||
      cleanString(fallback, "import")
    );
  }

  function addLegacyImportWarning(
    character,
    warning
  ) {
    addMigrationWarning(
      character,
      `Import audit: ${warning}`
    );
  }

  function collectMalformedSourceValues(
    value,
    path = "source",
    results = []
  ) {
    if (hasMalformedSourceValue(value)) {
      results.push(path);
      return results;
    }

    if (Array.isArray(value)) {
      value.forEach((entry, index) => {
        if (hasMalformedSourceValue(entry)) {
          results.push(`${path}[${index}]`);
        }
      });
    }

    return results;
  }

  function auditLegacyImportedCharacter(
    raw,
    character
  ) {
    if (
      !raw ||
      typeof raw !== "object" ||
      Array.isArray(raw)
    ) {
      return;
    }

    const idValues =
      uniqueCleanArray([
        raw.id,
        raw.docId,
        raw.firestoreDocumentId
      ]);

    if (idValues.length > 1) {
      addLegacyImportWarning(
        character,
        "conflicting saved character IDs were found; this draft should be reviewed before updating an existing saved character."
      );
    }

    const rawClassProgression =
      raw.classProgression;

    if (
      rawClassProgression &&
      !isPlainObject(rawClassProgression)
    ) {
      addLegacyImportWarning(
        character,
        "class progression was not an object, so legacy class fields were used where possible."
      );
    }

    const rawClassesValue =
      rawClassProgression?.classes;

    if (
      rawClassesValue !== undefined &&
      !Array.isArray(rawClassesValue)
    ) {
      addLegacyImportWarning(
        character,
        "class progression classes were not a list and were ignored."
      );
    }

    const rawClassEntries =
      Array.isArray(rawClassesValue)
        ? rawClassesValue
        : [];

    const validClassEntries =
      rawClassEntries.filter((entry) => {
        return isPlainObject(entry);
      });

    if (
      rawClassEntries.length >
      validClassEntries.length
    ) {
      addLegacyImportWarning(
        character,
        "one or more malformed class records were ignored."
      );
    }

    const legacyClassFields =
      Boolean(
        raw.classId ||
        raw.className ||
        raw.subclassName ||
        raw.selectedClassSnapshot ||
        raw.builder?.selectedClassId ||
        raw.builder?.selectedClassSnapshot
      );

    if (
      !validClassEntries.length &&
      legacyClassFields
    ) {
      addLegacyImportWarning(
        character,
        "legacy class fields were migrated into the current class progression format."
      );
    }

    const classLevelTotal =
      validClassEntries.reduce(
        (sum, classEntry) => {
          return (
            sum +
            Math.max(
              0,
              Math.round(
                safeNumber(
                  classEntry?.level,
                  0
                )
              )
            )
          );
        },
        0
      );

    const rawTotalLevel =
      Math.round(
        safeNumber(
          rawClassProgression?.totalLevel,
          0
        )
      );

    if (
      validClassEntries.length > 1 &&
      classLevelTotal > 0 &&
      rawTotalLevel > 0 &&
      rawTotalLevel !== classLevelTotal
    ) {
      character.classProgression.totalLevel =
        clampLevel(classLevelTotal);

      addLegacyImportWarning(
        character,
        "multiclass total level did not match the class levels and was recalculated from the preserved class records."
      );
    }

    if (
      validClassEntries.some((classEntry) => {
        return (
          !cleanString(
            classEntry.classId ||
            classEntry.id
          ) &&
          !cleanString(
            classEntry.className ||
            classEntry.name
          ) &&
          !classEntry.templateSnapshot
        );
      })
    ) {
      addLegacyImportWarning(
        character,
        "one or more class records were missing class identity details."
      );
    }

    if (
      validClassEntries.some((classEntry) => {
        return hasMalformedSourceValue(
          classEntry.source
        );
      })
    ) {
      character.classProgression.classes =
        character.classProgression.classes.map(
          (classEntry) => {
            return {
              ...classEntry,
              source:
                cleanImportSourceLabel(
                  classEntry.source,
                  "import"
                )
            };
          }
        );

      addLegacyImportWarning(
        character,
        "malformed class source data was replaced with import-safe source labels."
      );
    }

    const equipment =
      raw.equipment;

    if (typeof equipment === "string") {
      addLegacyImportWarning(
        character,
        "legacy free-text equipment was moved into equipment notes."
      );
    } else if (
      equipment !== undefined &&
      equipment !== null &&
      !isPlainObject(equipment)
    ) {
      addLegacyImportWarning(
        character,
        "equipment data was malformed and only recoverable fields were kept."
      );
    }

    if (raw.equipmentText) {
      addLegacyImportWarning(
        character,
        "legacy equipment text was preserved in equipment notes."
      );
    }

    const rawItems =
      equipment?.items;

    if (
      rawItems !== undefined &&
      !Array.isArray(rawItems)
    ) {
      addLegacyImportWarning(
        character,
        "equipment items were not a list and were ignored."
      );
    }

    const validItems =
      Array.isArray(rawItems)
        ? rawItems.filter((item) => {
            return isPlainObject(item);
          })
        : [];

    if (
      Array.isArray(rawItems) &&
      rawItems.length > validItems.length
    ) {
      addLegacyImportWarning(
        character,
        "one or more malformed equipment items were ignored."
      );
    }

    if (
      validItems.some((item) => {
        return !cleanString(item.id);
      })
    ) {
      addLegacyImportWarning(
        character,
        "one or more equipment items had missing IDs, so new stable import IDs were generated."
      );
    }

    const itemIds =
      validItems
        .map((item) => {
          return cleanString(item.id);
        })
        .filter(Boolean);

    if (
      new Set(itemIds).size !== itemIds.length
    ) {
      addLegacyImportWarning(
        character,
        "duplicate equipment item IDs were found; container links and equipped states should be reviewed."
      );
    }

    const itemIdSet =
      new Set(itemIds);

    if (
      validItems.some((item) => {
        const containerId =
          cleanString(item.containerId);

        return (
          containerId &&
          !itemIdSet.has(containerId)
        );
      })
    ) {
      addLegacyImportWarning(
        character,
        "one or more equipment container references pointed to missing items and were repaired."
      );
    }

    if (
      validItems.some((item) => {
        return hasMalformedSourceValue(
          item.source
        );
      })
    ) {
      character.equipment.items =
        character.equipment.items.map((item) => {
          return {
            ...item,
            source:
              cleanImportSourceLabel(
                item.source,
                "import"
              )
          };
        });

      addLegacyImportWarning(
        character,
        "malformed equipment source data was replaced with import-safe source labels."
      );
    }

    if (
      validItems.some((item) => {
        return (
          item.source === undefined ||
          item.source === null ||
          item.source === ""
        );
      })
    ) {
      addLegacyImportWarning(
        character,
        "one or more equipment items had no source and were tagged as imported items."
      );
    }

    const proficiencySources =
      raw.proficiencies?.sources;

    if (
      proficiencySources !== undefined &&
      !isPlainObject(proficiencySources)
    ) {
      addLegacyImportWarning(
        character,
        "proficiency source data was malformed and was normalized where possible."
      );
    }

    if (isPlainObject(proficiencySources)) {
      const malformedPaths = [];
      const stringPaths = [];

      Object.entries(proficiencySources)
        .forEach(([category, sourceMap]) => {
          if (!isPlainObject(sourceMap)) {
            malformedPaths.push(category);
            return;
          }

          Object.entries(sourceMap)
            .forEach(([value, sources]) => {
              if (typeof sources === "string") {
                stringPaths.push(
                  `${category}.${value}`
                );
              }

              collectMalformedSourceValues(
                sources,
                `${category}.${value}`,
                malformedPaths
              );
            });
        });

      if (stringPaths.length) {
        addLegacyImportWarning(
          character,
          "legacy string proficiency sources were migrated to source lists."
        );
      }

      if (malformedPaths.length) {
        addLegacyImportWarning(
          character,
          "malformed proficiency source entries were ignored or replaced with safe defaults."
        );
      }
    }

    const skillEntries =
      raw.proficiencies?.skills &&
      isPlainObject(raw.proficiencies.skills)
        ? Object.values(raw.proficiencies.skills)
        : [];

    if (
      skillEntries.some((entry) => {
        return (
          isPlainObject(entry) &&
          typeof entry.source === "string"
        );
      })
    ) {
      addLegacyImportWarning(
        character,
        "legacy string skill sources were migrated to source lists."
      );
    }

    if (
      skillEntries.some((entry) => {
        return (
          isPlainObject(entry) &&
          hasMalformedSourceValue(entry.source)
        );
      })
    ) {
      addLegacyImportWarning(
        character,
        "malformed skill source data was replaced with safe legacy source tags."
      );
    }
  }

  function ensureProficiencySources(character) {
    const proficiencies =
      character.proficiencies ||
      {};

    if (
      !proficiencies.sources ||
      typeof proficiencies.sources !== "object" ||
      Array.isArray(proficiencies.sources)
    ) {
      proficiencies.sources = {};
    }

    return proficiencies.sources;
  }

  function sourceMatches(source, sourceName) {
    const cleanSource =
      cleanString(source);

    return cleanSource === sourceName;
  }

  function getClassSourceLabel(classEntry) {
    const classId =
      cleanString(
        classEntry?.classId ||
        classEntry?.id
      );

    const className =
      cleanString(
        classEntry?.className ||
        classEntry?.name
      );

    const sourceId =
      classId ||
      (
        className
          ? makeSafeId(
              className,
              "class"
            )
          : ""
      );

    return sourceId
      ? `class:${sourceId}`
      : "";
  }

  function getBackgroundSourceLabel(background) {
    const backgroundId =
      cleanString(
        background?.id ||
        background?.docId
      );

    const backgroundName =
      cleanString(background?.name);

    const sourceId =
      backgroundId ||
      (
        backgroundName
          ? makeSafeId(
              backgroundName,
              "background"
            )
          : ""
      );

    return sourceId
      ? `background:${sourceId}`
      : "";
  }

  function getSpeciesSourceLabel(species) {
    const speciesId =
      cleanString(
        species?.id ||
        species?.docId
      );

    const speciesName =
      cleanString(species?.name);

    const sourceId =
      speciesId ||
      (
        speciesName
          ? makeSafeId(
              speciesName,
              "species"
            )
          : ""
      );

    return sourceId
      ? `species:${sourceId}`
      : "";
  }

  function getSubraceSourceLabel(subrace) {
    const subraceId =
      cleanString(
        subrace?.id ||
        subrace?.docId
      );

    const subraceName =
      cleanString(subrace?.name);

    const sourceId =
      subraceId ||
      (
        subraceName
          ? makeSafeId(
              subraceName,
              "subrace"
            )
          : ""
      );

    return sourceId
      ? `subrace:${sourceId}`
      : "";
  }

  function ensureAbilityBonusSources(character) {
    if (
      !character.abilities ||
      typeof character.abilities !== "object"
    ) {
      character.abilities = {};
    }

    if (
      !character.abilities.bonusSources ||
      typeof character.abilities.bonusSources !== "object" ||
      Array.isArray(
        character.abilities.bonusSources
      )
    ) {
      character.abilities.bonusSources = {};
    }

    return character.abilities.bonusSources;
  }

  function recalculateAbilityTotals(character) {
    const abilities =
      character.abilities ||
      {};

    const base =
      normalizeAbilityMap(
        abilities.base,
        10
      );

    const bonusSources =
      ensureAbilityBonusSources(
        character
      );

    const bonuses =
      createAbilityMap(0);

    Object.values(bonusSources)
      .forEach((bonusMap) => {
        ABILITY_DEFINITIONS.forEach(
          (ability) => {
            bonuses[ability.id] +=
              safeNumber(
                bonusMap?.[ability.id],
                0
              );
          }
        );
      });

    const scores =
      createAbilityMap(10);

    ABILITY_DEFINITIONS.forEach(
      (ability) => {
        scores[ability.id] =
          Math.max(
            1,
            Math.min(
              30,
              Math.round(
                safeNumber(
                  base[ability.id],
                  10
                ) +
                safeNumber(
                  bonuses[ability.id],
                  0
                )
              )
            )
          );
      }
    );

    character.abilities = {
      ...abilities,
      base,
      bonuses,
      scores,
      modifiers:
        calculateAbilityModifiers(scores),
      bonusSources
    };

    return character.abilities;
  }

  function setAbilityBonusSource(
    sourceName,
    bonusMap
  ) {
    const cleanSource =
      cleanString(sourceName);

    if (!cleanSource) {
      return;
    }

    const sources =
      ensureAbilityBonusSources(
        creatorState.draft
      );

    const cleaned =
      createAbilityMap(0);

    ABILITY_DEFINITIONS.forEach(
      (ability) => {
        cleaned[ability.id] =
          safeNumber(
            bonusMap?.[ability.id],
            0
          );
      }
    );

    const hasBonus =
      Object.values(cleaned)
        .some((value) => {
          return value !== 0;
        });

    if (hasBonus) {
      sources[cleanSource] = cleaned;
    } else {
      delete sources[cleanSource];
    }

    recalculateAbilityTotals(
      creatorState.draft
    );
  }

  function removeAbilityBonusSourcesByPrefix(
    prefixes
  ) {
    const cleanPrefixes =
      cleanArray(prefixes);

    if (!cleanPrefixes.length) {
      return;
    }

    const sources =
      ensureAbilityBonusSources(
        creatorState.draft
      );

    Object.keys(sources)
      .forEach((sourceName) => {
        if (
          cleanPrefixes.some((prefix) => {
            return sourceName.startsWith(
              prefix
            );
          })
        ) {
          delete sources[sourceName];
        }
      });

    recalculateAbilityTotals(
      creatorState.draft
    );
  }

  const POST_CAP_ABILITY_SOURCE_PREFIXES =
    Object.freeze([
      "magic:",
      "manual-override:"
    ]);

  function getNormalAbilityScoreForCap(
    character,
    abilityId,
    {
      excludedSource = ""
    } = {}
  ) {
    const ability =
      ABILITY_DEFINITIONS.find(
        (entry) => {
          return entry.id === abilityId;
        }
      );

    if (!ability) {
      return 10;
    }

    const base = safeNumber(
      character?.abilities?.base
        ?.[abilityId],
      10
    );
    const sources =
      character?.abilities?.bonusSources;
    const ordinaryBonus = Object.entries(
      sources &&
      typeof sources === "object" &&
      !Array.isArray(sources)
        ? sources
        : {}
    ).reduce(
      (total, [sourceName, bonusMap]) => {
        if (
          sourceName === excludedSource ||
          POST_CAP_ABILITY_SOURCE_PREFIXES
            .some((prefix) => {
              return sourceName.startsWith(
                prefix
              );
            })
        ) {
          return total;
        }

        return (
          total +
          safeNumber(
            bonusMap?.[abilityId],
            0
          )
        );
      },
      0
    );

    return Math.max(
      1,
      Math.min(
        30,
        Math.round(
          base + ordinaryBonus
        )
      )
    );
  }

  function createNormalAbilityCapScoreMap(
    character,
    options = {}
  ) {
    return Object.fromEntries(
      ABILITY_DEFINITIONS.map(
        (ability) => {
          return [
            ability.id,
            getNormalAbilityScoreForCap(
              character,
              ability.id,
              options
            )
          ];
        }
      )
    );
  }

  function addCappedNormalAbilityIncrease({
    bonusMap,
    scoreMap,
    abilityId,
    amount = 1,
    maximum =
      DEFAULT_FEAT_ABILITY_SCORE_MAXIMUM
  }) {
    if (
      !Object.hasOwn(bonusMap, abilityId) ||
      !Object.hasOwn(scoreMap, abilityId)
    ) {
      return 0;
    }

    const requested = Math.max(
      0,
      Math.round(
        safeNumber(amount, 0)
      )
    );
    const cleanMaximum = Math.max(
      1,
      Math.min(
        30,
        Math.round(
          safeNumber(
            maximum,
            DEFAULT_FEAT_ABILITY_SCORE_MAXIMUM
          )
        )
      )
    );
    const granted = Math.max(
      0,
      Math.min(
        requested,
        cleanMaximum -
          safeNumber(
            scoreMap[abilityId],
            10
          )
      )
    );

    bonusMap[abilityId] += granted;
    scoreMap[abilityId] += granted;

    return granted;
  }

  function removeSkillProficiencySourcesByPrefix(
    prefixes
  ) {
    const cleanPrefixes =
      cleanArray(prefixes);

    if (!cleanPrefixes.length) {
      return;
    }

    const skills =
      creatorState.draft
        .proficiencies
        .skills || {};

    Object.keys(skills)
      .forEach((skillKey) => {
        const entry =
          skills[skillKey];

        if (
          !entry ||
          typeof entry !== "object"
        ) {
          return;
        }

        const keptSources =
          cleanArray(entry.source)
            .filter((source) => {
              return !cleanPrefixes.some(
                (prefix) => {
                  return source.startsWith(
                    prefix
                  );
                }
              );
            });
        const rawExpertiseSources = cleanArray(
          entry.expertiseSources
        );
        const keptExpertiseSources =
          rawExpertiseSources.filter((source) => {
            return !cleanPrefixes.some((prefix) => {
              return source.startsWith(prefix);
            });
          });

        if (rawExpertiseSources.length) {
          entry.expertiseSources =
            keptExpertiseSources;
          entry.expertise =
            keptExpertiseSources.length > 0;
        }

        if (!keptSources.length) {
          delete skills[skillKey];
        } else {
          entry.source = keptSources;
        }
      });
  }

  function removeListProficiencySourcesByPrefix(
    prefixes
  ) {
    const cleanPrefixes =
      cleanArray(prefixes);

    if (!cleanPrefixes.length) {
      return;
    }

    const proficiencies =
      creatorState.draft
        .proficiencies;

    const allSources =
      ensureProficiencySources(
        creatorState.draft
      );

    [
      "savingThrows",
      "armor",
      "weapons",
      "tools",
      "languages"
    ].forEach((category) => {
      const currentValues =
        uniqueCleanArray(
          proficiencies[category]
        );

      const categorySources =
        allSources[category] &&
        typeof allSources[category] === "object" &&
        !Array.isArray(allSources[category])
          ? allSources[category]
          : {};

      const nextValues = [];
      const nextSources = {};

      currentValues.forEach((value) => {
        const keptSources =
          getStoredSources(
            categorySources,
            value
          ).filter((source) => {
            return !cleanPrefixes.some(
              (prefix) => {
                return source.startsWith(
                  prefix
                );
              }
            );
          });

        if (keptSources.length) {
          nextValues.push(value);
          nextSources[value] =
            keptSources;
        }
      });

      proficiencies[category] =
        nextValues;

      allSources[category] =
        nextSources;
    });
  }

  function getStoredSources(
    sourceMap,
    value,
    fallback = ["manual"]
  ) {
    const sources =
      cleanArray(
        sourceMap?.[value]
      );

    return sources.length
      ? sources
      : cleanArray(fallback);
  }

  function removeSkillProficiencySource(sourceName) {
    if (!cleanString(sourceName)) {
      return;
    }

    const skills =
      creatorState.draft
        .proficiencies
        .skills || {};

    Object.keys(skills)
      .forEach((skillKey) => {
        const entry =
          skills[skillKey];

        if (
          !entry ||
          typeof entry !== "object"
        ) {
          return;
        }

        const sources =
          cleanArray(entry.source);

        if (
          !sources.some((source) => {
            return sourceMatches(
              source,
              sourceName
            );
          })
        ) {
          return;
        }

        const keptSources =
          sources.filter((source) => {
            return !sourceMatches(
              source,
              sourceName
            );
          });

        if (!keptSources.length) {
          delete skills[skillKey];
          return;
        }

        entry.source =
          keptSources;
      });
  }

  function setSourceProficiencyList(
    category,
    values,
    sourceName
  ) {
    if (!cleanString(sourceName)) {
      return;
    }

    const proficiencies =
      creatorState.draft
        .proficiencies;

    const currentValues =
      uniqueCleanArray(
        proficiencies[category]
      );

    const incomingValues =
      uniqueCleanArray(values);

    const allSources =
      ensureProficiencySources(
        creatorState.draft
      );

    const categorySources =
      allSources[category] &&
      typeof allSources[category] === "object" &&
      !Array.isArray(allSources[category])
        ? allSources[category]
        : {};

    const nextValues = [];
    const nextSources = {};

    currentValues.forEach((value) => {
      const keptSources =
        getStoredSources(
          categorySources,
          value
        ).filter((source) => {
          return !sourceMatches(
            source,
            sourceName
          );
        });

      if (keptSources.length) {
        nextValues.push(value);
        nextSources[value] =
          keptSources;
      }
    });

    incomingValues.forEach((value) => {
      if (!nextValues.includes(value)) {
        nextValues.push(value);
      }

      nextSources[value] = [
        ...new Set([
          ...cleanArray(
            nextSources[value]
          ),
          sourceName
        ])
      ];
    });

    proficiencies[category] =
      nextValues;

    allSources[category] =
      nextSources;
  }

  function setManualProficiencyList(
    category,
    values
  ) {
    const incomingValues =
      uniqueCleanArray(values);

    const allSources =
      ensureProficiencySources(
        creatorState.draft
      );

    const proficiencies =
      creatorState.draft
        .proficiencies;

    const currentValues =
      uniqueCleanArray(
        proficiencies[category]
      );

    const categorySources =
      allSources[category] &&
      typeof allSources[category] === "object" &&
      !Array.isArray(allSources[category])
        ? allSources[category]
        : {};

    const nextValues = [];
    const nextSources = {};

    currentValues.forEach((value) => {
      const keptSources =
        getStoredSources(
          categorySources,
          value
        ).filter((source) => {
          return !sourceMatches(
            source,
            "manual"
          );
        });

      if (keptSources.length) {
        nextValues.push(value);
        nextSources[value] =
          keptSources;
      }
    });

    incomingValues.forEach((value) => {
      if (!nextValues.includes(value)) {
        nextValues.push(value);
      }

      nextSources[value] = [
        ...new Set([
          ...cleanArray(
            nextSources[value]
          ),
          "manual"
        ])
      ];
    });

    creatorState.draft
      .proficiencies[category] =
        nextValues;

    allSources[category] =
      nextSources;
  }

  function getManualProficiencyList(
    category
  ) {
    const proficiencies =
      creatorState.draft
        .proficiencies || {};

    const allSources =
      ensureProficiencySources(
        creatorState.draft
      );

    const categorySources =
      allSources[category] &&
      typeof allSources[category] === "object" &&
      !Array.isArray(allSources[category])
        ? allSources[category]
        : {};

    return uniqueCleanArray(
      proficiencies[category]
    ).filter((value) => {
      return getStoredSources(
        categorySources,
        value,
        []
      ).some((source) => {
        return sourceMatches(
          source,
          "manual"
        );
      });
    });
  }

  function removeListProficiencySource(sourceName) {
    if (!cleanString(sourceName)) {
      return;
    }

    const proficiencies =
      creatorState.draft
        .proficiencies;

    const allSources =
      ensureProficiencySources(
        creatorState.draft
      );

    [
      "savingThrows",
      "armor",
      "weapons",
      "tools",
      "languages"
    ].forEach((category) => {
      const currentValues =
        uniqueCleanArray(
          proficiencies[category]
        );

      const categorySources =
        allSources[category] &&
        typeof allSources[category] === "object" &&
        !Array.isArray(allSources[category])
          ? allSources[category]
          : {};

      const nextValues = [];
      const nextSources = {};

      currentValues.forEach((value) => {
        const keptSources =
          getStoredSources(
            categorySources,
            value
          ).filter((source) => {
            return !sourceMatches(
              source,
              sourceName
            );
          });

        if (keptSources.length) {
          nextValues.push(value);
          nextSources[value] =
            keptSources;
        }
      });

      proficiencies[category] =
        nextValues;

      allSources[category] =
        nextSources;
    });
  }

  function normalizeAbilityMap(value, fallbackValue = 10) {
    const raw = value || {};

    return {
      str: safeNumber(raw.str, fallbackValue),
      dex: safeNumber(raw.dex, fallbackValue),
      con: safeNumber(raw.con, fallbackValue),
      int: safeNumber(raw.int, fallbackValue),
      wis: safeNumber(raw.wis, fallbackValue),
      cha: safeNumber(raw.cha, fallbackValue)
    };
  }

  function normalizeCurrencyMap(value) {
    const raw =
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
        ? value
        : {};

    return CURRENCY_DENOMINATIONS
      .reduce((currency, coin) => {
        currency[coin] = Math.max(
          0,
          safeNumber(raw[coin], 0)
        );

        return currency;
      }, {});
  }

  function hasCurrencyValue(currency) {
    const clean =
      normalizeCurrencyMap(currency);

    return CURRENCY_DENOMINATIONS
      .some((coin) => {
        return clean[coin] > 0;
      });
  }

  function addCurrencyMaps(...maps) {
    const total =
      normalizeCurrencyMap({});

    maps.forEach((map) => {
      const clean =
        normalizeCurrencyMap(map);

      CURRENCY_DENOMINATIONS
        .forEach((coin) => {
          total[coin] += clean[coin];
        });
    });

    return total;
  }

  function subtractCurrencyMaps(
    left,
    right
  ) {
    const cleanLeft =
      normalizeCurrencyMap(left);

    const cleanRight =
      normalizeCurrencyMap(right);

    return CURRENCY_DENOMINATIONS
      .reduce((currency, coin) => {
        currency[coin] = Math.max(
          0,
          cleanLeft[coin] -
          cleanRight[coin]
        );

        return currency;
      }, {});
  }

  function normalizeCurrencySourceMap(value) {
    const raw =
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
        ? value
        : {};

    const normalized = {};

    Object.entries(raw)
      .forEach(([sourceName, packageMap]) => {
        const cleanSource =
          cleanString(sourceName);

        if (!cleanSource) {
          return;
        }

        const rawPackages =
          packageMap &&
          typeof packageMap === "object" &&
          !Array.isArray(packageMap)
            ? packageMap
            : {};

        const looksLikeCurrency =
          CURRENCY_DENOMINATIONS.some(
            (coin) => {
              return rawPackages[coin] !==
                undefined;
            }
          );

        const cleanPackages = {};

        if (looksLikeCurrency) {
          const currency =
            normalizeCurrencyMap(
              rawPackages
            );

          if (hasCurrencyValue(currency)) {
            cleanPackages.legacy =
              currency;
          }
        } else {
          Object.entries(rawPackages)
            .forEach(
              ([
                packageId,
                currency
              ]) => {
                const cleanPackageId =
                  cleanString(
                    packageId,
                    "package"
                  );

                const cleanCurrency =
                  normalizeCurrencyMap(
                    currency
                  );

                if (
                  cleanPackageId &&
                  hasCurrencyValue(
                    cleanCurrency
                  )
                ) {
                  cleanPackages[
                    cleanPackageId
                  ] = cleanCurrency;
                }
              }
            );
        }

        if (
          Object.keys(cleanPackages)
            .length
        ) {
          normalized[cleanSource] =
            cleanPackages;
        }
      });

    return normalized;
  }

  function getCurrencySourceTotals(
    sourceMap
  ) {
    const sources =
      normalizeCurrencySourceMap(
        sourceMap
      );

    return Object.values(sources)
      .reduce((total, packageMap) => {
        return addCurrencyMaps(
          total,
          ...Object.values(packageMap)
        );
      }, normalizeCurrencyMap({}));
  }

  function ensureEquipmentCurrencySources(
    equipment =
      creatorState.draft.equipment
  ) {
    if (!equipment.currencySources) {
      equipment.currencySources = {};
    }

    equipment.currencySources =
      normalizeCurrencySourceMap(
        equipment.currencySources
      );

    return equipment.currencySources;
  }

  function getManualCurrencyBalance(
    equipment =
      creatorState.draft.equipment
  ) {
    return subtractCurrencyMaps(
      equipment.currency,
      getCurrencySourceTotals(
        ensureEquipmentCurrencySources(
          equipment
        )
      )
    );
  }

  function syncEquipmentCurrencyFromSources(
    equipment =
      creatorState.draft.equipment,
    manualCurrency =
      getManualCurrencyBalance(equipment)
  ) {
    equipment.currency =
      addCurrencyMaps(
        manualCurrency,
        getCurrencySourceTotals(
          ensureEquipmentCurrencySources(
            equipment
          )
        )
      );

    return equipment.currency;
  }

  function backfillBackgroundCurrencySources(
    character
  ) {
    const equipment =
      character?.equipment;

    const background =
      character?.background;

    if (!equipment || !background) {
      return;
    }

    const sourceName =
      getBackgroundSourceLabel(
        background
      );

    const appliedPackageIds =
      cleanArray(
        background
          .featureChoices
          ?.appliedEquipmentPackageIds
      );

    if (
      !sourceName ||
      !appliedPackageIds.length
    ) {
      return;
    }

    const sources =
      ensureEquipmentCurrencySources(
        equipment
      );

    sources[sourceName] =
      sources[sourceName] || {};

    appliedPackageIds.forEach(
      (packageId) => {
        const cleanPackageId =
          cleanString(packageId);

        if (
          !cleanPackageId ||
          sources[sourceName][
            cleanPackageId
          ]
        ) {
          return;
        }

        const pack =
          DEFAULT_BACKGROUND_EQUIPMENT_PACKAGES
            .find((candidate) => {
              return candidate.id ===
                cleanPackageId;
            });

        const currency =
          normalizeCurrencyMap(
            pack?.currency
          );

        if (hasCurrencyValue(currency)) {
          sources[sourceName][
            cleanPackageId
          ] = currency;
        }
      }
    );

    if (
      !Object.keys(sources[sourceName])
        .length
    ) {
      delete sources[sourceName];
    }
  }

  function hasAbilityMapValues(value) {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      return false;
    }

    return ABILITY_DEFINITIONS.some((ability) => {
      const raw = value[ability.id];

      return (
        raw !== undefined &&
        raw !== null &&
        raw !== ""
      );
    });
  }

  function getAbilityBonusTotalsFromSources(sources) {
    const totals =
      createAbilityMap(0);

    Object.values(
      sources &&
      typeof sources === "object" &&
      !Array.isArray(sources)
        ? sources
        : {}
    ).forEach((bonusMap) => {
      const normalizedBonusMap =
        normalizeAbilityMap(
          bonusMap,
          0
        );

      ABILITY_DEFINITIONS.forEach(
        (ability) => {
          totals[ability.id] +=
            safeNumber(
              normalizedBonusMap[
                ability.id
              ],
              0
            );
        }
      );
    });

    return totals;
  }

  function deriveAbilityBaseFromFinalScores(
    finalScores,
    bonusTotals,
    fallbackValue = 10
  ) {
    const scores =
      normalizeAbilityMap(
        finalScores,
        fallbackValue
      );

    const bonuses =
      normalizeAbilityMap(
        bonusTotals,
        0
      );

    const base =
      createAbilityMap(fallbackValue);

    ABILITY_DEFINITIONS.forEach(
      (ability) => {
        base[ability.id] =
          Math.max(
            1,
            Math.min(
              30,
              Math.round(
                safeNumber(
                  scores[ability.id],
                  fallbackValue
                ) -
                safeNumber(
                  bonuses[ability.id],
                  0
                )
              )
            )
          );
      }
    );

    return base;
  }

  function calculateAbilityModifier(score) {
    const cleanScore = safeNumber(score, 10);

    return derivedCache.get(
      "ability-modifier",
      cleanScore,
      () => Math.floor((cleanScore - 10) / 2)
    );
  }

  function calculateAbilityModifiers(scores) {
    const cleanScores = normalizeAbilityMap(scores, 10);

    return {
      str: calculateAbilityModifier(cleanScores.str),
      dex: calculateAbilityModifier(cleanScores.dex),
      con: calculateAbilityModifier(cleanScores.con),
      int: calculateAbilityModifier(cleanScores.int),
      wis: calculateAbilityModifier(cleanScores.wis),
      cha: calculateAbilityModifier(cleanScores.cha)
    };
  }

  function getGenericProficiencyBonus(level) {
    const safeLevel = clampLevel(level);

    return derivedCache.get(
      "proficiency-bonus",
      safeLevel,
      () => {
        if (safeLevel >= 17) return 6;
        if (safeLevel >= 13) return 5;
        if (safeLevel >= 9) return 4;
        if (safeLevel >= 5) return 3;

        return 2;
      }
    );
  }

  function getStartingClassEntry(character) {
    const classes = character?.classProgression?.classes;

    if (!Array.isArray(classes) || !classes.length) {
      return null;
    }

    const levelOrder = normalizeClassLevelOrder(
      character?.classProgression?.levelOrder,
      classes
    );

    return (
      findClassEntryForLevelOrderKey(
        levelOrder[0],
        classes
      ) ||
      classes[0] ||
      null
    );
  }

  function getPrimaryClassEntry(character) {
    return getStartingClassEntry(character);
  }

  function isStartingClassEntry(
    classEntry,
    character = creatorState.draft,
    fallbackIndex = 0
  ) {
    const startingClass =
      getStartingClassEntry(character);

    if (!classEntry || !startingClass) {
      return false;
    }

    if (classEntry === startingClass) {
      return true;
    }

    return (
      getClassProgressionEntryKey(
        classEntry,
        fallbackIndex
      ) ===
      getClassProgressionEntryKey(
        startingClass,
        getCharacterClassEntries(
          character
        ).indexOf(startingClass)
      )
    );
  }

  function applyCompatibilityAliases(character) {
    const clean = character;
    const primaryClass = getPrimaryClassEntry(clean);
    const classEntries = getCharacterClassEntries(
      clean
    );

    applyDerivedMovementSpeeds(clean, {
      classEffects:
        clean.classMechanics
          ?.passiveEffects || [],
      featWalkBonus: Math.max(
        calculateSelectedFeatNumericEffect(
          clean,
          "speedBonus"
        ),
        safeNumber(
          clean.featMechanics
            ?.speedBonus,
          0
        )
      )
    });

    const walkSpeed = safeNumber(
      clean.combat?.speed?.walk,
      30
    );

    clean.classChoices = normalizeClassChoiceMap(
      clean.classChoices ||
      primaryClass?.choices?.classFeatures ||
      clean.classData?.selectedChoices
    );

    clean.feats = normalizeFeatIds([
      ...(Array.isArray(clean.feats) ? clean.feats : []),
      ...(Array.isArray(clean.selectedFeats)
        ? clean.selectedFeats
        : [])
    ]);
    clean.selectedFeats = [...clean.feats];
    clean.advancementChoices = normalizeAdvancementChoices(
      clean.advancementChoices
    );

    clean.name = cleanString(clean.identity?.name);
    clean.race = cleanString(clean.species?.name);

    clean.classId = cleanString(
      primaryClass?.classId
    );

    clean.className = cleanString(
      primaryClass?.className
    );

    clean.selectedClassSnapshot = primaryClass?.templateSnapshot
      ? cloneData(primaryClass.templateSnapshot)
      : null;

    clean.subclassName = cleanString(
      primaryClass?.subclassName
    );

    clean.level = clampLevel(
      clean.classProgression?.totalLevel ||
      primaryClass?.level ||
      1
    );

    const defaultClass = findDefaultClassDefinition(
      primaryClass?.classId,
      primaryClass?.className
    );

    if (primaryClass) {
      const otherClassChoicePrefixes =
        classEntries
          .filter((classEntry) => {
            return !isStartingClassEntry(
              classEntry,
              clean
            );
          })
          .flatMap((classEntry, index) => {
            return [
              cleanString(classEntry?.entryId),
              makeSafeId(
                classEntry?.classId ||
                  classEntry?.className,
                `class-${index + 2}`
              )
            ];
          })
          .filter(Boolean);
      const belongsToOtherClass = (choiceId) => {
        return otherClassChoicePrefixes.some(
          (prefix) => {
            return choiceId.startsWith(
              `${prefix}-level-`
            );
          }
        );
      };
      const primaryStoredChoices =
        normalizeClassChoiceMap(
          primaryClass.choices?.classFeatures
        );
      const primaryCompatibilityChoices =
        Object.fromEntries(
          Object.entries(clean.classChoices)
            .filter(([choiceId]) => {
              return !belongsToOtherClass(
                choiceId
              );
            })
        );

      primaryClass.choices = {
        ...(primaryClass.choices || {}),
        classFeatures: {
          ...Object.fromEntries(
            Object.entries(primaryStoredChoices)
              .filter(([choiceId]) => {
                return !belongsToOtherClass(
                  choiceId
                );
              })
          ),
          ...cloneData(
            primaryCompatibilityChoices
          )
        }
      };

      if (defaultClass) {
        primaryClass.classId = defaultClass.id;
        primaryClass.className = defaultClass.name;
        primaryClass.source = "template";
        primaryClass.hitDie =
          normalizeClassEntryHitDie(
            primaryClass.hitDie,
            defaultClass.hitDie
          );
        primaryClass.templateSnapshot = null;

        clean.classId = defaultClass.id;
        clean.className = defaultClass.name;
        clean.selectedClassSnapshot = null;
      }
    }

    const collectedFeatureIds = defaultClass
      ? getDefaultClassFeaturesThroughLevel(
          defaultClass,
          clean.level
        ).map((feature) => feature.id)
      : (
          Array.isArray(clean.features?.classFeatures)
            ? clean.features.classFeatures
            : []
        )
          .filter((feature) => feature?.source !== "subclass")
          .map((feature) => cleanString(feature?.id))
          .filter(Boolean);

    clean.classData = primaryClass
      ? {
          classId: clean.classId,
          className: clean.className,
          level: clean.level,
          hitDie: defaultClass
            ? defaultClass.hitDie
            : cleanString(
                primaryClass?.templateSnapshot?.hitDie,
                "d8"
              ),
          selectedChoices: cloneData(clean.classChoices),
          features: collectedFeatureIds
        }
      : null;

    clean.armorClass = safeNumber(
      clean.combat?.armorClass,
      10
    );

    clean.maxHp = Math.max(
      1,
      safeNumber(clean.combat?.maxHp, 1)
    );

    clean.currentHp = safeNumber(
      clean.combat?.currentHp,
      clean.maxHp
    );

    clean.speed = `${walkSpeed} ft.`;
    clean.stats = normalizeAbilityMap(clean.abilities?.scores, 10);
    clean.backgroundName = cleanString(clean.background?.name);

    clean.skills = Object.entries(
      clean.proficiencies?.skills || {}
    )
      .filter(([, value]) => {
        return value && value.proficient === true;
      })
      .map(([skillName]) => skillName);

    clean.equipmentText = cleanString(
      clean.equipment?.notes
    );

    clean.spells = cleanString(
      clean.magic?.notes
    );

    clean.featuresText = cleanString(
      clean.features?.notes
    );

    return clean;
  }

  function normalizeCharacter(rawCharacter) {
    const raw =
      normalizeCharacterEnvelope(
        rawCharacter
      );
    const empty = createEmptyCharacter();

    const rawStats =
      raw.stats ||
      raw.abilities?.scores ||
      {};

    const rawBonuses =
      raw.abilities?.bonuses ||
      {};

    const rawScores =
      raw.abilities?.scores ||
      rawStats;

    const rawBuilder =
      raw.builder ||
      {};

    const rawClassEntries =
      Array.isArray(raw.classProgression?.classes)
        ? raw.classProgression.classes
            .filter((entry) => {
              return (
                entry &&
                typeof entry === "object"
              );
            })
        : [];

    const rawClassEntry =
      findClassEntryForLevelOrderKey(
        raw.classProgression?.levelOrder?.[0],
        rawClassEntries
      ) ||
      rawClassEntries[0] ||
      null;

    const legacyClassSnapshot =
      raw.selectedClassSnapshot ||
      rawBuilder.selectedClassSnapshot ||
      null;

    const legacyClassName =
      cleanString(
        raw.className ||
        raw.classData?.className ||
        legacyClassSnapshot?.name
      );

    const legacyClassId =
      cleanString(
        raw.classId ||
        raw.classData?.classId ||
        rawBuilder.selectedClassId ||
        legacyClassSnapshot?.id ||
        (
          legacyClassName
            ? makeSafeId(
                legacyClassName,
                "custom-class"
              )
            : ""
        )
      );

    const hasLegacyClassData =
      Boolean(
        rawClassEntries.length ||
        legacyClassId ||
        legacyClassName ||
        legacyClassSnapshot
      );

    const fallbackClassId =
      cleanString(
        rawClassEntry?.classId ||
        legacyClassId
      );

    const fallbackClassName =
      cleanString(
        rawClassEntry?.className ||
        legacyClassName
      );

    const rawClassList =
      rawClassEntries.length
        ? rawClassEntries
        : hasLegacyClassData
          ? [
            {
              classId: fallbackClassId,
              className:
                fallbackClassName ||
                "Custom Class",
              source: "template",
              level:
                raw.classData?.level ||
                raw.level ||
                1,
              subclassId: "",
              subclassName: raw.subclassName,
              templateSnapshot:
                legacyClassSnapshot,
              choices: {}
            }
          ]
          : [];

    const rawStartingClassEntry =
      rawClassEntry ||
      rawClassList[0] ||
      null;

    const classLevelTotal =
      rawClassList.reduce(
        (sum, classEntry) => {
          return (
            sum +
            Math.max(
              0,
              safeNumber(
                classEntry?.level,
                0
              )
            )
          );
        },
        0
      );

    const savedTotalLevel =
      raw.classProgression?.totalLevel ||
      raw.classData?.level ||
      raw.level ||
      rawClassEntry?.level ||
      1;

    const totalLevel = clampLevel(
      rawClassList.length > 1
        ? classLevelTotal || savedTotalLevel
        : savedTotalLevel || classLevelTotal
    );

    const existingClassEntryIds = new Set();

    const normalizedClassList =
      rawClassList.map(
        (classEntry, index) => {
          const isPrimary =
            classEntry ===
            rawStartingClassEntry;

          const classId = cleanString(
            classEntry?.classId ||
            (
              isPrimary
                ? raw.classId ||
                  rawBuilder.selectedClassId
                : ""
            ),
            isPrimary
              ? fallbackClassId
              : makeSafeId(
                  classEntry?.className,
                  "custom-class"
                )
          );

          const className = cleanString(
            classEntry?.className ||
            (
              isPrimary
                ? raw.className
                : ""
            ),
            isPrimary
              ? fallbackClassName
              : "Custom Class"
          );

          const defaultClass =
            findDefaultClassDefinition(
              classId,
              className
            );

          const templateSnapshot = cloneData(
            classEntry?.templateSnapshot ||
            (
              isPrimary
                ? raw.selectedClassSnapshot ||
                  rawBuilder.selectedClassSnapshot
                : null
            ) ||
            null
          );

          return {
            entryId: createClassEntryId(
              classId || className,
              index,
              existingClassEntryIds,
              classEntry?.entryId
            ),

            classId,

            className,

            source: cleanString(
              cleanImportSourceLabel(
                classEntry?.source,
                "template"
              ),
              "template"
            ),

            level:
              rawClassList.length === 1
                ? totalLevel
                : clampLevel(
                    classEntry?.level ||
                    1
                  ),

            subclassId: cleanString(
              classEntry?.subclassId
            ),

            subclassName: cleanString(
              classEntry?.subclassName ||
              (
                isPrimary
                  ? raw.subclassName
                  : ""
              )
            ),

            hitDie: normalizeClassEntryHitDie(
              classEntry?.hitDie,
              defaultClass?.hitDie ||
                templateSnapshot?.hitDie ||
                8
            ),

            templateSnapshot,

            choices: cloneData(
              classEntry?.choices || {}
            )
          };
        }
      );

    const speciesObject =
      raw.species &&
      typeof raw.species === "object"
        ? raw.species
        : null;

    const speciesName = cleanString(
      speciesObject?.name ||
      raw.species ||
      raw.race
    );

    const backgroundObject =
      raw.background &&
      typeof raw.background === "object"
        ? raw.background
        : null;

    const backgroundName = cleanString(
      backgroundObject?.name ||
      raw.backgroundName ||
      (
        typeof raw.background === "string"
          ? raw.background
          : ""
      )
    );

    const walkSpeed = safeNumber(
      raw.combat?.speed?.walk,
      safeNumber(
        String(raw.speed || "")
          .replace(/[^0-9.-]/g, ""),
        30
      )
    );

    const normalizedRawBonuses =
      normalizeAbilityMap(
        rawBonuses,
        0
      );

    const hasLegacyAbilityBonuses =
      Object.values(normalizedRawBonuses)
        .some((value) => {
          return value !== 0;
        });

    const rawAbilityBonusSources =
      raw.abilities?.bonusSources &&
      typeof raw.abilities.bonusSources === "object" &&
      !Array.isArray(raw.abilities.bonusSources)
        ? cloneData(raw.abilities.bonusSources)
        : hasLegacyAbilityBonuses
          ? {
              legacy:
                normalizedRawBonuses
            }
          : {};

    const rawAbilityBonusTotals =
      getAbilityBonusTotalsFromSources(
        rawAbilityBonusSources
      );

    const rawBase =
      hasAbilityMapValues(
        raw.abilities?.base
      )
        ? raw.abilities.base
        : deriveAbilityBaseFromFinalScores(
            rawScores,
            rawAbilityBonusTotals,
            10
          );

    const normalized = {
      ...empty,

      id: raw.id || null,
      schemaVersion: CHARACTER_SCHEMA_VERSION,
      rulesetId: ACTIVE_RULESET.id,
      rulesEdition: ACTIVE_RULESET.edition,
      rulesMode: ACTIVE_RULESET.mode,

      identity: {
        ...empty.identity,
        ...(raw.identity || {}),

        name: cleanString(
          raw.identity?.name ||
          raw.name
        ),

        image: normalizeCharacterImageValue(
          raw.identity?.image ||
          raw.image,
          {
            ...(raw || {}),
            ...(raw.identity || {})
          }
        )
      },

      species: {
        ...empty.species,
        ...(speciesObject || {}),

        id: cleanString(
          speciesObject?.id
        ),

        name: speciesName,

        source: cleanString(
          cleanImportSourceLabel(
            speciesObject?.source,
            speciesObject
              ? "template"
              : "custom"
          ),
          speciesObject
            ? "template"
            : "custom"
        ),

        templateSnapshot: speciesObject?.templateSnapshot
          ? cloneData(speciesObject.templateSnapshot)
          : null,

        choices: cloneData(
          speciesObject?.choices || {}
        ),

        traits: Array.isArray(speciesObject?.traits)
          ? cloneData(speciesObject.traits)
          : []
      },

      classProgression: {
        totalLevel,

        classes:
          normalizedClassList,

        levelOrder:
          normalizeClassLevelOrder(
            raw.classProgression?.levelOrder,
            normalizedClassList
          ),

        unarmoredDefenseSource:
          raw.classProgression
            ?.unarmoredDefenseSource &&
          typeof raw.classProgression
            .unarmoredDefenseSource === "object" &&
          !Array.isArray(
            raw.classProgression
              .unarmoredDefenseSource
          )
            ? cloneData(
                raw.classProgression
                  .unarmoredDefenseSource
              )
            : null
      },

      classData:
        raw.classData &&
        typeof raw.classData === "object"
          ? cloneData(raw.classData)
          : null,

      classChoices: normalizeClassChoiceMap(
        raw.classChoices ||
        raw.classData?.selectedChoices ||
        rawClassEntry?.choices?.classFeatures
      ),

      classMechanics: {
        ...cloneData(empty.classMechanics),
        ...(
          raw.classMechanics &&
          typeof raw.classMechanics === "object" &&
          !Array.isArray(raw.classMechanics)
            ? cloneData(raw.classMechanics)
            : {}
        )
      },

      feats: normalizeFeatIds([
        ...(Array.isArray(raw.feats) ? raw.feats : []),
        ...(Array.isArray(raw.selectedFeats)
          ? raw.selectedFeats
          : [])
      ]),

      selectedFeats: normalizeFeatIds([
        ...(Array.isArray(raw.feats) ? raw.feats : []),
        ...(Array.isArray(raw.selectedFeats)
          ? raw.selectedFeats
          : [])
      ]),

      advancementChoices: normalizeAdvancementChoices(
        raw.advancementChoices
      ),

      featMechanics: {
        ...cloneData(empty.featMechanics),
        ...(
          raw.featMechanics &&
          typeof raw.featMechanics === "object" &&
          !Array.isArray(raw.featMechanics)
            ? cloneData(raw.featMechanics)
            : {}
        ),
        resources:
          Array.isArray(raw.featMechanics?.resources)
            ? cloneData(raw.featMechanics.resources)
            : [],
        resistanceSources:
          Array.isArray(raw.featMechanics?.resistanceSources)
            ? cloneData(raw.featMechanics.resistanceSources)
            : [],
        naturalWeapons:
          Array.isArray(raw.featMechanics?.naturalWeapons)
            ? cloneData(raw.featMechanics.naturalWeapons)
            : [],
        armorClassModifiers:
          Array.isArray(raw.featMechanics?.armorClassModifiers)
            ? cloneData(raw.featMechanics.armorClassModifiers)
            : [],
        attackModifiers:
          Array.isArray(raw.featMechanics?.attackModifiers)
            ? cloneData(raw.featMechanics.attackModifiers)
            : [],
        selectedFeatures:
          Array.isArray(raw.featMechanics?.selectedFeatures)
            ? cloneData(raw.featMechanics.selectedFeatures)
            : [],
        elementalAdepts:
          Array.isArray(raw.featMechanics?.elementalAdepts)
            ? cloneData(raw.featMechanics.elementalAdepts)
            : [],
        damageReductions:
          Array.isArray(raw.featMechanics?.damageReductions)
            ? cloneData(raw.featMechanics.damageReductions)
            : [],
        senses:
          Array.isArray(raw.featMechanics?.senses)
            ? cloneData(raw.featMechanics.senses)
            : [],
        restChoices:
          Array.isArray(raw.featMechanics?.restChoices)
            ? cloneData(raw.featMechanics.restChoices)
            : [],
        ritualBooks:
          Array.isArray(raw.featMechanics?.ritualBooks)
            ? cloneData(raw.featMechanics.ritualBooks)
            : [],
        actions:
          Array.isArray(raw.featMechanics?.actions)
            ? cloneData(raw.featMechanics.actions)
            : [],
        combatProfiles:
          Array.isArray(raw.featMechanics?.combatProfiles)
            ? cloneData(raw.featMechanics.combatProfiles)
            : [],
        telepathy:
          Array.isArray(raw.featMechanics?.telepathy)
            ? cloneData(raw.featMechanics.telepathy)
            : [],
        healingBonuses:
          Array.isArray(raw.featMechanics?.healingBonuses)
            ? cloneData(raw.featMechanics.healingBonuses)
            : [],
        spellcasting:
          Array.isArray(raw.featMechanics?.spellcasting)
            ? cloneData(raw.featMechanics.spellcasting)
            : [],
        situationalEffects:
          Array.isArray(raw.featMechanics?.situationalEffects)
            ? cloneData(raw.featMechanics.situationalEffects)
            : [],
        passiveEffects:
          Array.isArray(raw.featMechanics?.passiveEffects)
            ? cloneData(raw.featMechanics.passiveEffects)
            : [],
        instances:
          Array.isArray(raw.featMechanics?.instances)
            ? cloneData(raw.featMechanics.instances)
            : []
      },

      abilities: {
        method: cleanString(
          raw.abilities?.method,
          "manual"
        ),

        base: normalizeAbilityMap(
          rawBase,
          10
        ),

        bonuses: normalizeAbilityMap(
          rawBonuses,
          0
        ),

        bonusSources:
          rawAbilityBonusSources,

        scores: normalizeAbilityMap(
          rawScores,
          10
        ),

        modifiers: calculateAbilityModifiers(
          rawScores
        ),

        assignmentPool:
          Array.isArray(raw.abilities?.assignmentPool)
            ? raw.abilities.assignmentPool.map((value) => {
                return safeNumber(value, 10);
              })
            : []
      },

      background: {
        ...empty.background,
        ...(backgroundObject || {}),

        id: cleanString(
          backgroundObject?.id
        ),

        name: backgroundName,

        source: cleanString(
          cleanImportSourceLabel(
            backgroundObject?.source,
            backgroundObject
              ? "template"
              : "custom"
          ),
          backgroundObject
            ? "template"
            : "custom"
        ),

        templateSnapshot:
          backgroundObject?.templateSnapshot
            ? cloneData(backgroundObject.templateSnapshot)
            : null,

        featureChoices: cloneData(
          backgroundObject?.featureChoices || {}
        ),

        traits: cleanString(
          backgroundObject?.traits
        ),

        ideals: cleanString(
          backgroundObject?.ideals
        ),

        bonds: cleanString(
          backgroundObject?.bonds
        ),

        flaws: cleanString(
          backgroundObject?.flaws
        ),

        backstory: cleanString(
          backgroundObject?.backstory
        )
      },

      proficiencies: {
        skills: cloneData(
          raw.proficiencies?.skills || {}
        ),

        savingThrows: cleanArray(
          raw.proficiencies?.savingThrows
        ),

        armor: cleanArray(
          raw.proficiencies?.armor
        ),

        weapons: cleanArray(
          raw.proficiencies?.weapons
        ),

        tools: cleanArray(
          raw.proficiencies?.tools
        ),

        languages: cleanArray(
          raw.proficiencies?.languages
        ),

        sources: cloneData(
          raw.proficiencies?.sources ||
          {}
        )
      },

      combat: {
        ...empty.combat,
        ...(raw.combat || {}),

        armorClass: safeNumber(
          raw.combat?.armorClass ??
          raw.armorClass,
          10
        ),

        armorClassMode:
          cleanString(
            raw.combat?.armorClassMode,
            "auto"
          ) === "manual"
            ? "manual"
            : "auto",

        selectedArmorClassMethod:
          cleanString(
            raw.combat?.selectedArmorClassMethod
          ),

        manualArmorClass:
          raw.combat?.manualArmorClass === null ||
          raw.combat?.manualArmorClass === undefined
            ? null
            : safeNumber(
                raw.combat.manualArmorClass,
                null
              ),

        armorClassBonus:
          safeNumber(
            raw.combat?.armorClassBonus,
            0
          ),

        armorClassOptions:
          raw.combat?.armorClassOptions &&
          typeof raw.combat
            .armorClassOptions === "object" &&
          !Array.isArray(
            raw.combat
              .armorClassOptions
          )
            ? cloneData(
                raw.combat
                  .armorClassOptions
              )
            : cloneData(
                empty.combat
                  .armorClassOptions
              ),

        maxHp: Math.max(
          1,
          safeNumber(
            raw.combat?.maxHp ??
            raw.maxHp,
            1
          )
        ),

        currentHp: safeNumber(
          raw.combat?.currentHp ??
          raw.currentHp,

          Math.max(
            1,
            safeNumber(
              raw.combat?.maxHp ??
              raw.maxHp,
              1
            )
          )
        ),

        temporaryHp: Math.max(
          0,
          safeNumber(
            raw.combat?.temporaryHp,
            0
          )
        ),

        initiative: safeNumber(
          raw.combat?.initiative,
          0
        ),

        initiativeBonus: safeNumber(
          raw.combat?.initiativeBonus,
          raw.combat?.initiative || 0
        ),

        initiativeProficient:
          raw.combat?.initiativeProficient === true,

        proficiencyBonus: safeNumber(
          raw.combat?.proficiencyBonus,
          getGenericProficiencyBonus(totalLevel)
        ),

        attacksPerAction: Math.max(
          1,
          Math.round(
            safeNumber(
              raw.combat?.attacksPerAction,
              1
            )
          )
        ),

        classFeatureStates: {
          ...empty.combat.classFeatureStates,
          ...(
            raw.combat?.classFeatureStates &&
            typeof raw.combat.classFeatureStates === "object" &&
            !Array.isArray(raw.combat.classFeatureStates)
              ? raw.combat.classFeatureStates
              : {}
          ),
          rageActive:
            raw.combat?.classFeatureStates?.rageActive === true
        },

        hpCalculation:
          normalizeHpCalculation(
            raw.combat?.hpCalculation,
            raw.combat?.maxHp ??
            raw.maxHp
          ),

        baseSpeed: {
          ...empty.combat.baseSpeed,
          ...(
            raw.combat?.baseSpeed ||
            raw.combat?.speed ||
            {}
          ),
          walk: safeNumber(
            raw.combat?.baseSpeed
              ?.walk,
            walkSpeed
          )
        },

        speed: {
          ...empty.combat.speed,
          ...(raw.combat?.speed || {}),
          walk: walkSpeed
        },

        hitDice: Array.isArray(raw.combat?.hitDice)
          ? cloneData(raw.combat.hitDice)
          : [],

        hitDiceUsage:
          raw.combat?.hitDiceUsage &&
          typeof raw.combat
            .hitDiceUsage === "object" &&
          !Array.isArray(
            raw.combat
              .hitDiceUsage
          )
            ? Object.fromEntries(
                Object.entries(
                  raw.combat
                    .hitDiceUsage
                ).map(([key, value]) => {
                  return [
                    cleanString(key),
                    Math.max(
                      0,
                      Math.round(
                        safeNumber(
                          value,
                          0
                        )
                      )
                    )
                  ];
                }).filter(([key]) => {
                  return Boolean(key);
                })
              )
            : {}
      },

      equipment: {
        ...empty.equipment,

        ...(
          raw.equipment &&
          typeof raw.equipment === "object"
            ? raw.equipment
            : {}
        ),

        currency: {
          ...empty.equipment.currency,
          ...normalizeCurrencyMap(
            raw.equipment?.currency
          )
        },

        currencySources:
          normalizeCurrencySourceMap(
            raw.equipment?.currencySources
          ),

        items: Array.isArray(raw.equipment?.items)
          ? raw.equipment.items.map((item) => {
              return normalizeSection15Item(
                item,
                cleanImportSourceLabel(
                  item?.source,
                  "import"
                )
              );
            })
          : [],

        notes: cleanString(
          raw.equipment?.notes ||
          raw.equipmentText ||
          (
            typeof raw.equipment === "string"
              ? raw.equipment
              : ""
          )
        )
      },

      magic: {
        ...empty.magic,
        ...(raw.magic || {}),

        knownSpellIds: cleanArray(
          raw.magic?.knownSpellIds
        ),

        preparedSpellIds: cleanArray(
          raw.magic?.preparedSpellIds
        ),

        unassignedKnownSpellIds: cleanArray(
          raw.magic?.unassignedKnownSpellIds
        ),

        unassignedPreparedSpellIds: cleanArray(
          raw.magic?.unassignedPreparedSpellIds
        ),

        spellSourceModelVersion: [1, 2, SPELL_SOURCE_MODEL_VERSION].includes(safeNumber(raw.magic?.spellSourceModelVersion, 0)) ? safeNumber(raw.magic?.spellSourceModelVersion, 0) : 0,

        spellSources: normalizeSpellSources(raw.magic?.spellSources),

        classSources:
          raw.magic?.classSources &&
          typeof raw.magic.classSources === "object" &&
          !Array.isArray(raw.magic.classSources)
            ? Object.fromEntries(
                Object.entries(raw.magic.classSources)
                  .map(([sourceKey, rawSource]) => {
                    const source =
                      rawSource &&
                      typeof rawSource === "object" &&
                      !Array.isArray(rawSource)
                        ? rawSource
                        : {};

                    return [
                      cleanString(sourceKey),
                      {
                        ...cloneData(source),
                        classEntryId: cleanString(
                          source.classEntryId ||
                          sourceKey
                        ),
                        classId: cleanString(
                          source.classId
                        ),
                        spellListClassId: cleanString(
                          source.spellListClassId ||
                          source.classId
                        ),
                        spellcastingAbility: cleanString(
                          source.spellcastingAbility
                        ),
                        spellSaveDc:
                          source.spellSaveDc === null ||
                          source.spellSaveDc === undefined
                            ? null
                            : safeNumber(
                                source.spellSaveDc,
                                null
                              ),
                        spellAttackBonus:
                          source.spellAttackBonus === null ||
                          source.spellAttackBonus === undefined
                            ? null
                            : safeNumber(
                                source.spellAttackBonus,
                                null
                              ),
                        cantripIds: cleanArray(
                          source.cantripIds
                        ),
                        knownSpellIds: cleanArray(
                          source.knownSpellIds
                        ),
                        preparedSpellIds: cleanArray(
                          source.preparedSpellIds
                        ),
                        spellbookSpellIds: cleanArray(
                          source.spellbookSpellIds
                        ),
                        alwaysPreparedSpellIds: cleanArray(
                          source.alwaysPreparedSpellIds
                        ),
                        mysticArcanumSpellIds:
                          source.mysticArcanumSpellIds &&
                          typeof source.mysticArcanumSpellIds === "object" &&
                          !Array.isArray(source.mysticArcanumSpellIds)
                            ? Object.fromEntries(
                                Object.entries(
                                  source.mysticArcanumSpellIds
                                )
                                  .map(([level, spellId]) => {
                                    return [
                                      cleanString(level),
                                      cleanString(spellId)
                                    ];
                                  })
                                  .filter(([, spellId]) => {
                                    return Boolean(spellId);
                                  })
                              )
                            : {}
                      }
                    ];
                  })
                  .filter(([sourceKey]) => {
                    return Boolean(sourceKey);
                  })
              )
            : {},

        slotUsage: {
          normal:
            raw.magic?.slotUsage?.normal &&
            typeof raw.magic.slotUsage.normal === "object" &&
            !Array.isArray(raw.magic.slotUsage.normal)
              ? Object.fromEntries(
                  Object.entries(raw.magic.slotUsage.normal)
                    .map(([level, used]) => [
                      cleanString(level),
                      Math.max(0, Math.round(safeNumber(used, 0)))
                    ])
                )
              : {},
          pact: Math.max(
            0,
            Math.round(
              safeNumber(raw.magic?.slotUsage?.pact, 0)
            )
          ),
          pactSources:
            raw.magic?.slotUsage?.pactSources &&
            typeof raw.magic.slotUsage
              .pactSources === "object" &&
            !Array.isArray(
              raw.magic.slotUsage.pactSources
            )
              ? Object.fromEntries(
                  Object.entries(
                    raw.magic.slotUsage
                      .pactSources
                  ).map(([sourceId, used]) => {
                    return [
                      cleanString(sourceId),
                      Math.max(
                        0,
                        Math.round(
                          safeNumber(used, 0)
                        )
                      )
                    ];
                  }).filter(([sourceId]) => {
                    return Boolean(sourceId);
                  })
                )
              : {}
        },

        customSpells:
          Array.isArray(raw.magic?.customSpells)
            ? cloneData(raw.magic.customSpells)
            : [],

        innateSpells:
          Array.isArray(raw.magic?.innateSpells)
            ? cloneData(raw.magic.innateSpells)
            : [],

        slots: cloneData(
          raw.magic?.slots || {}
        ),

        pactMagic: {
          ...empty.magic.pactMagic,
          ...(
            raw.magic?.pactMagic &&
            typeof raw.magic.pactMagic === "object"
              ? raw.magic.pactMagic
              : {}
          )
        },

        pactMagicSources:
          Array.isArray(
            raw.magic?.pactMagicSources
          )
            ? raw.magic.pactMagicSources
                .map((source) => {
                  return {
                    classEntryId: cleanString(
                      source?.classEntryId
                    ),
                    classId: cleanString(
                      source?.classId
                    ),
                    className: cleanString(
                      source?.className
                    ),
                    slots: Math.max(
                      0,
                      Math.round(
                        safeNumber(
                          source?.slots,
                          0
                        )
                      )
                    ),
                    slotLevel: Math.max(
                      0,
                      Math.round(
                        safeNumber(
                          source?.slotLevel,
                          0
                        )
                      )
                    )
                  };
                })
                .filter((source) => {
                  return (
                    source.slots > 0 &&
                    source.slotLevel > 0
                  );
                })
            : [],

        spellcastingProgression:
          cleanString(
            raw.magic?.spellcastingProgression,
            "none"
          ),

        spellPreparation:
          cleanString(
            raw.magic?.spellPreparation,
            "none"
          ),

        notes: cleanString(
          raw.magic?.notes ||
          raw.spells
        )
      },

      features: {
        ...empty.features,

        ...(
          raw.features &&
          typeof raw.features === "object"
            ? raw.features
            : {}
        ),

        classFeatures:
          Array.isArray(raw.features?.classFeatures)
            ? cloneData(raw.features.classFeatures)
            : [],

        speciesTraits:
          Array.isArray(raw.features?.speciesTraits)
            ? cloneData(raw.features.speciesTraits)
            : [],

        backgroundFeatures:
          Array.isArray(raw.features?.backgroundFeatures)
            ? cloneData(raw.features.backgroundFeatures)
            : [],

        customFeatures:
          Array.isArray(raw.features?.customFeatures)
            ? cloneData(raw.features.customFeatures)
            : [],

        notes: cleanString(
          raw.features?.notes ||
          raw.featuresText ||
          (
            typeof raw.features === "string"
              ? raw.features
              : ""
          )
        )
      },

      builder: {
        currentStep: getStepById(
          rawBuilder.currentStep
        ).id,

        visitedSteps:
          cleanArray(rawBuilder.visitedSteps).length
            ? cleanArray(rawBuilder.visitedSteps)
            : ["basics"],

        completedSteps: cleanArray(
          rawBuilder.completedSteps
        ),

        validation: cloneData(
          rawBuilder.validation || {}
        ),

        status:
          cleanString(
            rawBuilder.status ||
            rawBuilder.finalizationStatus
          ).toLowerCase() === "finalized"
            ? "finalized"
            : "draft",

        finalizedAtMillis:
          rawBuilder.finalizedAtMillis === null ||
          rawBuilder.finalizedAtMillis === undefined
            ? null
            : safeNumber(
                rawBuilder.finalizedAtMillis,
                null
              ),

        lastSavedAtMillis:
          rawBuilder.lastSavedAtMillis === null ||
          rawBuilder.lastSavedAtMillis === undefined
            ? null
            : safeNumber(
                rawBuilder.lastSavedAtMillis,
                null
              )
      },

      notes: cleanString(raw.notes)
    };

    ensureGameplayState(normalized);

    // Old characters sometimes stored skills as an array.
    if (
      Object.keys(normalized.proficiencies.skills).length === 0 &&
      Array.isArray(raw.skills)
    ) {
      raw.skills.forEach((skillName) => {
        const cleanName = cleanString(skillName);

        if (!cleanName) {
          return;
        }

        normalized.proficiencies.skills[cleanName] = {
          proficient: true,
          expertise: false,
          source: ["legacy"]
        };
      });
    }

    auditLegacyImportedCharacter(
      raw,
      normalized
    );

    syncClassLevelOrderToClassLevels(
      normalized,
      {
        rawOrder:
          raw.classProgression?.levelOrder,
        addMigrationWarning:
          normalized.classProgression
            .classes.length > 0
      }
    );

    enforceClassProgressionLevelCap(
      normalized,
      {
        addMigrationWarning: true
      }
    );

    syncFirstUnarmoredDefenseSource(
      normalized,
      {
        addMigrationWarning:
          normalized.classProgression
            .classes.length > 1
      }
    );

    migrateClassEntryAdvancementData(
      normalized,
      {
        addMigrationWarning: true
      }
    );

    cleanupDuplicateNonRepeatableAdvancementFeats(
      normalized,
      {
        addMigrationWarning: true
      }
    );

    if (
      !isPlainObject(
        normalized.proficiencies.skills
      )
    ) {
      normalized.proficiencies.skills = {};
    }

    Object.keys(
      normalized.proficiencies.skills
    ).forEach((skillName) => {
      const entry =
        normalized.proficiencies
          .skills[skillName];

      if (isPlainObject(entry)) {
        return;
      }

      normalized.proficiencies
        .skills[skillName] = {
          proficient: Boolean(entry),
          expertise: false,
          source:
            entry ? ["legacy"] : []
        };
    });

    const primaryClassSource =
      getClassSourceLabel(
        getPrimaryClassEntry(
          normalized
        )
      );

    const backgroundSource =
      getBackgroundSourceLabel(
        normalized.background
      );

    Object.values(
      normalized.proficiencies
        .skills || {}
    ).forEach((entry) => {
      if (
        !entry ||
        typeof entry !== "object"
      ) {
        return;
      }

      const sources =
        normalizeImportSourceList(
          entry.source
        );

      entry.source =
        sources.length
          ? sources.map((source) => {
              if (
                source === "class" &&
                primaryClassSource
              ) {
                return primaryClassSource;
              }

              if (
                source === "background" &&
                backgroundSource
              ) {
                return backgroundSource;
              }

              return source;
            })
          : entry.proficient === true
            ? ["legacy"]
            : [];
    });

    if (
      !isPlainObject(
        normalized.proficiencies.sources
      )
    ) {
      normalized.proficiencies.sources = {};
    }

    [
      "savingThrows",
      "armor",
      "weapons",
      "tools",
      "languages"
    ].forEach((category) => {
      const sourceMap =
        normalized.proficiencies
          .sources?.[category];

      if (
        !sourceMap ||
        typeof sourceMap !== "object" ||
        Array.isArray(sourceMap)
      ) {
        if (sourceMap !== undefined) {
          normalized.proficiencies
            .sources[category] = {};
        }

        return;
      }

      Object.keys(sourceMap).forEach((value) => {
        sourceMap[value] =
          normalizeImportSourceList(
            sourceMap[value]
          ).map((source) => {
            if (
              source === "class" &&
              primaryClassSource
            ) {
              return primaryClassSource;
            }

            if (
              source === "background" &&
              backgroundSource
            ) {
              return backgroundSource;
            }

            return source;
          });
      });
    });

    if (
      normalized.species.id ===
      "custom-species"
    ) {
      normalized.species.id =
        makeSafeId(
          normalized.species.name ||
          "custom-species",
          "custom-species"
        );

      normalized.species.source =
        "custom";

      normalized.species.templateSnapshot =
        null;
    }

    if (
      normalized.background.id ===
      "custom-background"
    ) {
      normalized.background.id =
        makeSafeId(
          normalized.background.name ||
          "custom-background",
          "custom-background"
        );

      normalized.background.source =
        "custom";

      normalized.background.templateSnapshot =
        null;
    }

    recordRawEquipmentMigrationWarnings(
      raw.equipment?.items,
      normalized
    );

    normalized.equipment.items =
      repairContainerState(
        normalized.equipment.items,
        normalized
      );

    if (
      normalized.combat
        .hpCalculation
        .mode === "rolled"
    ) {
      normalized.combat
        .hpCalculation
        .laterLevelValues =
          normalizeHpRollRecordsForCharacter(
            normalized.combat
              .hpCalculation
              .laterLevelValues,
            normalized
          );
    }

    backfillBackgroundCurrencySources(
      normalized
    );

    recalculateAbilityTotals(
      normalized
    );

    synchronizeCanonicalSpellSources(normalized, { fromCompatibility: !(safeNumber(raw.magic?.spellSourceModelVersion, 0) >= SPELL_SOURCE_MODEL_VERSION && Array.isArray(raw.magic?.spellSources)) });

    return applyCompatibilityAliases(normalized);
  }

  function createCharacterPayload(character) {
    const sourceCharacter = cloneData(character);

    synchronizeCanonicalSpellSources(sourceCharacter, { fromCompatibility: true });

    const normalized = normalizeCharacter(sourceCharacter);

    normalized.id = null;

    syncSection18DerivedValues(
      normalized
    );

    applyCompatibilityAliases(normalized);

    delete normalized.id;

    return normalized;
  }


// =====================================================
// CHARACTER CREATOR SECTION 4 — DEFAULT TEMPLATE DATA
// =====================================================

  const ABILITY_DEFINITIONS = Object.freeze([
    {
      id: "str",
      name: "Strength"
    },
    {
      id: "dex",
      name: "Dexterity"
    },
    {
      id: "con",
      name: "Constitution"
    },
    {
      id: "int",
      name: "Intelligence"
    },
    {
      id: "wis",
      name: "Wisdom"
    },
    {
      id: "cha",
      name: "Charisma"
    }
  ]);

  const SKILL_DEFINITIONS = Object.freeze([
    {
      id: "acrobatics",
      name: "Acrobatics",
      ability: "dex"
    },
    {
      id: "animal-handling",
      name: "Animal Handling",
      ability: "wis"
    },
    {
      id: "arcana",
      name: "Arcana",
      ability: "int"
    },
    {
      id: "athletics",
      name: "Athletics",
      ability: "str"
    },
    {
      id: "deception",
      name: "Deception",
      ability: "cha"
    },
    {
      id: "history",
      name: "History",
      ability: "int"
    },
    {
      id: "insight",
      name: "Insight",
      ability: "wis"
    },
    {
      id: "intimidation",
      name: "Intimidation",
      ability: "cha"
    },
    {
      id: "investigation",
      name: "Investigation",
      ability: "int"
    },
    {
      id: "medicine",
      name: "Medicine",
      ability: "wis"
    },
    {
      id: "nature",
      name: "Nature",
      ability: "int"
    },
    {
      id: "perception",
      name: "Perception",
      ability: "wis"
    },
    {
      id: "performance",
      name: "Performance",
      ability: "cha"
    },
    {
      id: "persuasion",
      name: "Persuasion",
      ability: "cha"
    },
    {
      id: "religion",
      name: "Religion",
      ability: "int"
    },
    {
      id: "sleight-of-hand",
      name: "Sleight of Hand",
      ability: "dex"
    },
    {
      id: "stealth",
      name: "Stealth",
      ability: "dex"
    },
    {
      id: "survival",
      name: "Survival",
      ability: "wis"
    }
  ]);

  const ABILITY_SCORE_METHODS = Object.freeze([
    {
      id: "manual",
      name: "Manual Entry",
      description: "Enter each score directly."
    },
    {
      id: "standard-array",
      name: "Standard Array",
      description: "Assign a fixed score pool.",
      values: [15, 14, 13, 12, 10, 8]
    },
    {
      id: "point-buy",
      name: "Point Buy",
      description: "Spend a controlled pool of points."
    },
    {
      id: "rolled",
      name: "Rolled Scores",
      description: "Enter or assign rolled scores."
    }
  ]);

  function getAbilityDefinition(
    abilityId
  ) {
    return (
      ABILITY_DEFINITIONS.find((ability) => {
        return ability.id === abilityId;
      }) ||
      ABILITY_DEFINITIONS.find((ability) => {
        return (
          ability.name.toLowerCase() ===
          String(abilityId || "").toLowerCase()
        );
      }) ||
      null
    );
  }

  function getAbilityScore(
    character,
    abilityId
  ) {
    return safeNumber(
      character
        ?.abilities
        ?.scores
        ?.[abilityId],
      10
    );
  }

  function getCharacterProficiencyBonus(
    character
  ) {
    return getGenericProficiencyBonus(
      character
        ?.classProgression
        ?.totalLevel
    );
  }

  function calculateRuleSavingThrowModifier({
    abilityModifier = 0,
    proficiencyBonus = 0,
    proficient = false,
    bonus = 0
  } = {}) {
    return (
      safeNumber(abilityModifier, 0) +
      (
        proficient
          ? safeNumber(proficiencyBonus, 0)
          : 0
      ) +
      safeNumber(bonus, 0)
    );
  }

  function isSavingThrowProficient(
    character,
    abilityId
  ) {
    const ability =
      getAbilityDefinition(abilityId);

    const values =
      cleanArray(
        character
          ?.proficiencies
          ?.savingThrows
      ).map((value) => {
        return value.toLowerCase();
      });

    return Boolean(
      ability &&
      (
        values.includes(ability.id.toLowerCase()) ||
        values.includes(ability.name.toLowerCase())
      )
    );
  }

  function calculateCharacterSavingThrowsUncached(
    character
  ) {
    const proficiencyBonus =
      getCharacterProficiencyBonus(character);

    const bonuses =
      character
        ?.combat
        ?.savingThrowBonuses || {};

    return ABILITY_DEFINITIONS.map((ability) => {
      const abilityModifier =
        calculateAbilityModifier(
          getAbilityScore(
            character,
            ability.id
          )
        );

      const proficient =
        isSavingThrowProficient(
          character,
          ability.id
        );

      return {
        id: ability.id,
        name: ability.name,
        abilityModifier,
        proficient,
        bonus:
          safeNumber(
            bonuses[ability.id],
            0
          ),
        total:
          calculateRuleSavingThrowModifier({
            abilityModifier,
            proficiencyBonus,
            proficient,
            bonus:
              safeNumber(
                bonuses[ability.id],
                0
              )
          })
      };
    });
  }

  function calculateCharacterSavingThrows(
    character
  ) {
    const dependencyKey = createDerivedSignature({
      scores: character?.abilities?.scores,
      totalLevel:
        character?.classProgression
          ?.totalLevel,
      proficiencies:
        character?.proficiencies
          ?.savingThrows,
      bonuses:
        character?.combat
          ?.savingThrowBonuses
    });

    return derivedCache.get(
      "saving-throws",
      dependencyKey,
      () => calculateCharacterSavingThrowsUncached(
        character
      )
    );
  }

  function getCharacterSkillEntry(
    character,
    skill
  ) {
    const skills =
      character
        ?.proficiencies
        ?.skills || {};

    return (
      skills[skill.id] ||
      skills[skill.name] ||
      null
    );
  }

  function calculateCharacterSkillModifier(
    character,
    skill
  ) {
    const entry =
      getCharacterSkillEntry(
        character,
        skill
      );

    const abilityModifier =
      calculateAbilityModifier(
        getAbilityScore(
          character,
          skill.ability
        )
      );

    return calculateRuleSkillModifier({
      abilityModifier,
      proficiencyBonus:
        getCharacterProficiencyBonus(character),
      proficient:
        entry?.proficient === true,
      expertise:
        entry?.expertise === true &&
        entry?.proficient === true
    });
  }

  function calculateCharacterPassiveScoresUncached(
    character
  ) {
    const wanted = [
      "perception",
      "investigation",
      "insight"
    ];

    const passiveState =
      character
        ?.proficiencies
        ?.passiveState || {};

    return wanted.reduce((result, skillId) => {
      const skill =
        SKILL_DEFINITIONS.find((item) => {
          return item.id === skillId;
        });

      if (!skill) {
        return result;
      }

      const state =
        passiveState[skillId] || {};
      const featBonus = getSelectedDefaultFeatInstances(character)
        .flatMap((instance) => {
          return Array.isArray(instance.feat?.effects)
            ? instance.feat.effects
            : [];
        })
        .filter((effect) => {
          return (
            effect?.type === "passiveSkillBonus" &&
            uniqueCleanArray(effect.skills)
              .map((value) => makeSafeId(value, ""))
              .includes(skillId)
          );
        })
        .reduce((total, effect) => {
          return total + safeNumber(effect.value, 0);
        }, 0);

      result[skillId] = {
        name: `Passive ${skill.name}`,
        skillModifier:
          calculateCharacterSkillModifier(
            character,
            skill
          ),
        total:
          calculateRulePassiveScore(
            calculateCharacterSkillModifier(
              character,
              skill
            ),
            state
          ) + featBonus,
        featBonus,
        advantage:
          state.advantage === true,
        disadvantage:
          state.disadvantage === true
      };

      return result;
    }, {});
  }

  function calculateCharacterPassiveScores(
    character
  ) {
    const dependencyKey = createDerivedSignature({
      scores: character?.abilities?.scores,
      totalLevel:
        character?.classProgression
          ?.totalLevel,
      skills:
        character?.proficiencies?.skills,
      passiveState:
        character?.proficiencies
          ?.passiveState,
      classChoices:
        character?.classChoices,
      advancementChoices:
        character?.advancementChoices,
      feats: character?.feats
    });

    return derivedCache.get(
      "passive-scores",
      dependencyKey,
      () => calculateCharacterPassiveScoresUncached(
        character
      )
    );
  }

  function calculateCharacterInitiativeUncached(
    character
  ) {
    const dexterityModifier =
      calculateAbilityModifier(
        getAbilityScore(character, "dex")
      );

    const proficiencyBonus =
      character
        ?.combat
        ?.initiativeProficient === true
        ? getCharacterProficiencyBonus(character)
        : 0;

    const bonus =
      safeNumber(
        character
          ?.combat
          ?.initiativeBonus,
        character
          ?.combat
          ?.initiative || 0
      );
    const featBonus =
      calculateSelectedFeatNumericEffect(
        character,
        "initiativeBonus"
      );

    return {
      dexterityModifier,
      proficiencyBonus,
      bonus,
      featBonus,
      total:
        dexterityModifier +
        proficiencyBonus +
        bonus +
        featBonus
    };
  }

  function calculateCharacterInitiative(
    character
  ) {
    const dependencyKey = createDerivedSignature({
      dexterity:
        character?.abilities?.scores?.dex,
      totalLevel:
        character?.classProgression
          ?.totalLevel,
      initiativeProficient:
        character?.combat
          ?.initiativeProficient,
      initiativeBonus:
        character?.combat
          ?.initiativeBonus,
      initiative:
        character?.combat?.initiative,
      classChoices:
        character?.classChoices,
      advancementChoices:
        character?.advancementChoices,
      feats: character?.feats
    });

    return derivedCache.get(
      "initiative",
      dependencyKey,
      () => calculateCharacterInitiativeUncached(
        character
      )
    );
  }

  function normalizeHpCalculation(
    rawCalculation,
    fallbackManualValue = null
  ) {
    const raw =
      rawCalculation &&
      typeof rawCalculation === "object"
        ? rawCalculation
        : {};

    const mode =
      ["fixed", "rolled", "manual"].includes(
        raw.mode
      )
        ? raw.mode
        : "fixed";

    return {
      schemaVersion: 2,
      mode,
      levelOneValue:
        raw.levelOneValue === null ||
        raw.levelOneValue === undefined
          ? null
          : Math.max(
              1,
              safeNumber(raw.levelOneValue, 1)
            ),
      laterLevelValues:
        Array.isArray(raw.laterLevelValues)
          ? raw.laterLevelValues.map((value) => {
              if (
                value &&
                typeof value === "object" &&
                !Array.isArray(value)
              ) {
                return {
                  characterLevel:
                    Math.max(
                      2,
                      Math.round(
                        safeNumber(
                          value.characterLevel,
                          2
                        )
                      )
                    ),
                  classId:
                    cleanString(value.classId),
                  classEntryId:
                    cleanString(
                      value.classEntryId ||
                      value.entryId
                    ),
                  className:
                    cleanString(value.className),
                  hitDie:
                    cleanString(value.hitDie),
                  roll:
                    Math.max(
                      1,
                      Math.round(
                        safeNumber(
                          value.roll,
                          1
                        )
                      )
                    )
                };
              }

              return Math.max(
                1,
                Math.round(
                  safeNumber(value, 1)
                )
              );
            })
          : [],
      manualOverride:
        raw.manualOverride === null ||
        raw.manualOverride === undefined
          ? (
              mode === "manual" &&
              fallbackManualValue !== null &&
              fallbackManualValue !== undefined
                ? Math.max(
                    1,
                    safeNumber(
                      fallbackManualValue,
                      1
                    )
                  )
                : null
            )
          : Math.max(
              1,
              safeNumber(raw.manualOverride, 1)
            ),
      lastCalculatedConModifier:
        safeNumber(
          raw.lastCalculatedConModifier,
          0
        )
    };
  }

  function calculateRuleRolledHp({
    hitDie,
    level,
    constitutionModifier,
    rolls = [],
    levelOneValue = null
  }) {
    const dieSize =
      Math.max(
        1,
        safeNumber(
          String(hitDie || "d8").replace(/[^0-9]/g, ""),
          8
        )
      );

    const cleanLevel = clampLevel(level);
    const conModifier =
      safeNumber(constitutionModifier, 0);

    let total =
      Math.max(
        1,
        levelOneValue === null ||
        levelOneValue === undefined
          ? dieSize + conModifier
          : safeNumber(
              levelOneValue,
              dieSize + conModifier
            )
      );

    for (let index = 2; index <= cleanLevel; index += 1) {
      const roll =
        Math.max(
          1,
          Math.min(
            dieSize,
            safeNumber(
              rolls[index - 2],
              Math.floor(dieSize / 2) + 1
            )
          )
        );

      total += Math.max(1, roll + conModifier);
    }

    return total;
  }

  function calculateRuleManualHp({
    manualOverride
  }) {
    return Math.max(
      1,
      safeNumber(manualOverride, 1)
    );
  }

  function resolveClassTemplateForEntry(
    classEntry
  ) {
    if (!classEntry) {
      return null;
    }

    const classId =
      cleanString(classEntry.classId);

    const className =
      cleanString(classEntry.className);

    const defaultTemplates =
      DEFAULT_CLASS_TEMPLATES.map((template) => {
        return normalizeClassTemplate(
          template,
          template?.source || "template"
        );
      });

    const defaultTemplate =
      defaultTemplates.find((template) => {
        return template.id === classId;
      }) ||
      defaultTemplates.find((template) => {
        return (
          template.name.toLowerCase() ===
          className.toLowerCase()
        );
      }) ||
      null;

    if (
      defaultTemplate &&
      findDefaultClassDefinition(
        classId,
        className
      )
    ) {
      return defaultTemplate;
    }

    if (classEntry.templateSnapshot) {
      return normalizeClassTemplate(
        classEntry.templateSnapshot,
        classEntry.source || "character"
      );
    }

    const roomTemplates =
      (
        Array.isArray(
          creatorState?.roomClassCache
        )
          ? creatorState.roomClassCache
          : []
      ).map((template) => {
        return normalizeClassTemplate(
          template,
          template?.source || "homebrew"
        );
      });

    return (
      roomTemplates.find((template) => {
        return template.id === classId;
      }) ||
      roomTemplates.find((template) => {
        return (
          template.name.toLowerCase() ===
          className.toLowerCase()
        );
      }) ||
      defaultTemplate ||
      null
    );
  }

  function normalizeClassEntryHitDie(
    value,
    fallback = 8
  ) {
    const parsed = Math.round(
      safeNumber(
        String(value ?? "")
          .replace(/[^0-9]/g, ""),
        0
      )
    );
    const fallbackParsed = Math.round(
      safeNumber(
        String(fallback ?? 8)
          .replace(/[^0-9]/g, ""),
        8
      )
    );

    return Math.max(
      1,
      parsed || fallbackParsed || 8
    );
  }

  function formatClassEntryHitDie(
    classEntry,
    classTemplate = null
  ) {
    return `d${normalizeClassEntryHitDie(
      classEntry?.hitDie,
      classTemplate?.hitDie || 8
    )}`;
  }

  function createClassEntryId(
    classId,
    index,
    existingIds = new Set(),
    existingEntryId = ""
  ) {
    const ids = existingIds instanceof Set
      ? existingIds
      : new Set();
    const savedId = cleanString(existingEntryId);

    if (savedId && !ids.has(savedId)) {
      ids.add(savedId);
      return savedId;
    }

    const base = makeSafeId(
      classId || "class",
      "class"
    );
    const baseIndex = Math.max(
      1,
      Math.round(safeNumber(index, 0)) + 1
    );
    let suffix = baseIndex;
    let id = `${base}-${suffix}`;

    while (ids.has(id)) {
      suffix += 1;
      id = `${base}-${suffix}`;
    }

    ids.add(id);
    return id;
  }

  function ensureClassProgressionEntryData(
    character
  ) {
    const entries = Array.isArray(
      character?.classProgression?.classes
    )
      ? character.classProgression.classes
      : [];
    const existingIds = new Set();

    entries.forEach((classEntry, index) => {
      const template =
        resolveClassTemplateForEntry(classEntry);

      classEntry.entryId = createClassEntryId(
        classEntry?.classId ||
          classEntry?.className,
        index,
        existingIds,
        classEntry?.entryId
      );

      classEntry.hitDie =
        normalizeClassEntryHitDie(
          classEntry?.hitDie,
          template?.hitDie || 8
        );
    });

    return entries;
  }

  function getCharacterClassEntries(
    character
  ) {
    return Array.isArray(
      character
        ?.classProgression
        ?.classes
    )
      ? character.classProgression.classes
      : [];
  }

  function getClassProgressionEntryKey(
    classEntry,
    fallbackIndex = 0
  ) {
    return (
      cleanString(classEntry?.entryId) ||
      makeSafeId(
        classEntry?.classId ||
        classEntry?.className,
        `class-${fallbackIndex + 1}`
      )
    );
  }

  function getClassLevelOrderEntryKey(
    rawEntry
  ) {
    if (typeof rawEntry === "string") {
      return cleanString(rawEntry);
    }

    if (
      rawEntry &&
      typeof rawEntry === "object" &&
      !Array.isArray(rawEntry)
    ) {
      return cleanString(
        rawEntry.entryId ||
        rawEntry.classEntryId ||
        rawEntry.classId ||
        rawEntry.className ||
        rawEntry.id ||
        rawEntry.name,
        ""
      );
    }

    return "";
  }

  function normalizeClassLevelOrder(
    rawOrder,
    classEntries
  ) {
    const entries =
      Array.isArray(classEntries)
        ? classEntries
        : [];
    const entryRecords = entries
      .map((classEntry, index) => {
        const key = getClassProgressionEntryKey(
          classEntry,
          index
        );
        const aliases = new Set(
          [
            key,
            makeSafeId(key, ""),
            makeSafeId(
              classEntry?.classId,
              ""
            ),
            makeSafeId(
              classEntry?.className,
              ""
            )
          ].filter(Boolean)
        );

        return {
          key,
          aliases,
          remaining: Math.max(
            0,
            Math.round(
              safeNumber(
                classEntry?.level,
                0
              )
            )
          )
        };
      })
      .filter((record) => {
        return record.key && record.remaining > 0;
      });

    const normalized = [];

    (
      Array.isArray(rawOrder)
        ? rawOrder
        : []
    ).forEach((rawEntry) => {
      const rawKey =
        getClassLevelOrderEntryKey(
          rawEntry
        );
      const safeRawKey = makeSafeId(
        rawKey,
        ""
      );
      const record =
        entryRecords.find((entry) => {
          return (
            entry.remaining > 0 &&
            entry.key === rawKey
          );
        }) ||
        entryRecords.find((entry) => {
          return (
            entry.remaining > 0 &&
            (
              entry.aliases.has(rawKey) ||
              entry.aliases.has(safeRawKey)
            )
          );
        });

      if (!record) {
        return;
      }

      normalized.push(record.key);
      record.remaining -= 1;
    });

    entryRecords.forEach((record) => {
      while (record.remaining > 0) {
        normalized.push(record.key);
        record.remaining -= 1;
      }
    });

    return normalized;
  }

  function syncClassLevelOrderToClassLevels(
    character = creatorState.draft,
    options = {}
  ) {
    if (
      !character.classProgression ||
      typeof character.classProgression !== "object"
    ) {
      return [];
    }

    const entries =
      getCharacterClassEntries(
        character
      );

    const rawOrder = Object.hasOwn(
      options,
      "rawOrder"
    )
      ? (
          Array.isArray(options.rawOrder)
            ? options.rawOrder
            : []
        )
      : character.classProgression.levelOrder;
    const levelOrder =
      normalizeClassLevelOrder(
        rawOrder,
        entries
      );
    const rawKeys = (Array.isArray(rawOrder)
      ? rawOrder
      : []
    )
      .map(getClassLevelOrderEntryKey)
      .filter(Boolean);
    const changed =
      rawKeys.length !== levelOrder.length ||
      rawKeys.some((key, index) => {
        return key !== levelOrder[index];
      });

    character.classProgression.levelOrder =
      levelOrder;

    if (
      changed &&
      options.addMigrationWarning === true
    ) {
      addMigrationWarning(
        character,
        "Class level order was migrated to stable class entry IDs and repaired to match the saved class levels."
      );
    }

    return levelOrder;
  }

  function enforceClassProgressionLevelCap(
    character = creatorState.draft,
    options = {}
  ) {
    const progression =
      character?.classProgression;

    if (
      !progression ||
      typeof progression !== "object"
    ) {
      return 1;
    }

    const classes =
      getCharacterClassEntries(character);

    if (!classes.length) {
      progression.totalLevel = 1;
      progression.levelOrder = [];
      return 1;
    }

    const completeOrder =
      normalizeClassLevelOrder(
        progression.levelOrder,
        classes
      );

    const wasOverMaximum =
      completeOrder.length > 20;

    const cappedOrder =
      completeOrder.slice(0, 20);

    const levelCounts = new Map();

    cappedOrder.forEach((entryKey) => {
      levelCounts.set(
        entryKey,
        (levelCounts.get(entryKey) || 0) + 1
      );
    });

    const retainedClasses =
      classes.filter((classEntry, index) => {
        const entryKey =
          getClassProgressionEntryKey(
            classEntry,
            index
          );

        classEntry.level =
          levelCounts.get(entryKey) || 0;

        return classEntry.level > 0;
      });

    classes.splice(
      0,
      classes.length,
      ...retainedClasses
    );

    progression.levelOrder =
      cappedOrder.filter((entryKey) => {
        return retainedClasses.some(
          (classEntry, index) => {
            return (
              getClassProgressionEntryKey(
                classEntry,
                index
              ) === entryKey
            );
          }
        );
      });

    progression.totalLevel =
      Math.max(
        1,
        progression.levelOrder.length
      );

    if (
      wasOverMaximum &&
      options.addMigrationWarning === true
    ) {
      addMigrationWarning(
        character,
        "Class progression exceeded total character level 20 and was trimmed in saved level order."
      );
    }

    return progression.totalLevel;
  }

  const UNARMORED_DEFENSE_CLASS_RULES =
    Object.freeze({
      barbarian: Object.freeze({
        featureId:
          "unarmored-defense-barbarian",
        className: "Barbarian"
      }),
      monk: Object.freeze({
        featureId:
          "unarmored-defense-monk",
        className: "Monk"
      })
    });

  function syncFirstUnarmoredDefenseSource(
    character = creatorState.draft,
    options = {}
  ) {
    const progression =
      character?.classProgression;

    if (
      !progression ||
      typeof progression !== "object"
    ) {
      return null;
    }

    const classes =
      getCharacterClassEntries(character);

    const findEligibleRecord = (
      classEntry,
      fallbackIndex = 0,
      acquiredAtCharacterLevel = 1
    ) => {
      if (!classEntry) {
        return null;
      }

      const classId = makeSafeId(
        classEntry.classId ||
          classEntry.className,
        ""
      );
      const rule =
        UNARMORED_DEFENSE_CLASS_RULES[
          classId
        ];

      if (
        !rule ||
        getClassEntryLevel(
          classEntry,
          0
        ) < 1
      ) {
        return null;
      }

      return {
        classEntryId:
          getClassProgressionEntryKey(
            classEntry,
            fallbackIndex
          ),
        classId,
        className:
          safeDisplayString(
            classEntry.className,
            rule.className
          ),
        featureId: rule.featureId,
        featureName:
          "Unarmored Defense",
        acquiredAtCharacterLevel:
          Math.max(
            1,
            Math.round(
              safeNumber(
                acquiredAtCharacterLevel,
                1
              )
            )
          )
      };
    };

    const savedSource =
      progression
        .unarmoredDefenseSource &&
      typeof progression
        .unarmoredDefenseSource ===
        "object" &&
      !Array.isArray(
        progression
          .unarmoredDefenseSource
      )
        ? progression
            .unarmoredDefenseSource
        : null;

    const savedClassEntry =
      savedSource
        ? (
            classes.find(
              (classEntry, index) => {
                return (
                  getClassProgressionEntryKey(
                    classEntry,
                    index
                  ) ===
                  cleanString(
                    savedSource
                      .classEntryId
                  )
                );
              }
            ) ||
            classes.find((classEntry) => {
              return (
                makeSafeId(
                  classEntry.classId ||
                    classEntry.className,
                  ""
                ) ===
                makeSafeId(
                  savedSource.classId,
                  ""
                )
              );
            })
          )
        : null;

    const preserved =
      findEligibleRecord(
        savedClassEntry,
        classes.indexOf(
          savedClassEntry
        ),
        savedSource
          ?.acquiredAtCharacterLevel
      );

    if (preserved) {
      progression
        .unarmoredDefenseSource =
          preserved;

      return preserved;
    }

    const levelOrder =
      normalizeClassLevelOrder(
        progression.levelOrder,
        classes
      );

    let derived = null;

    levelOrder.some(
      (entryKey, levelIndex) => {
        const classEntry =
          findClassEntryForLevelOrderKey(
            entryKey,
            classes
          );

        derived =
          findEligibleRecord(
            classEntry,
            classes.indexOf(
              classEntry
            ),
            levelIndex + 1
          );

        return Boolean(derived);
      }
    );

    if (!derived) {
      classes.some(
        (classEntry, index) => {
          derived =
            findEligibleRecord(
              classEntry,
              index,
              1
            );

          return Boolean(derived);
        }
      );
    }

    progression
      .unarmoredDefenseSource =
        derived;

    if (
      savedSource &&
      !preserved &&
      options.addMigrationWarning === true
    ) {
      addMigrationWarning(
        character,
        "The saved Unarmored Defense source was no longer valid and was repaired from the character's class-level history."
      );
    }

    return derived;
  }

  function findClassEntryForLevelOrderKey(
    key,
    classEntries
  ) {
    const entries =
      Array.isArray(classEntries)
        ? classEntries
        : [];

    const rawKey = getClassLevelOrderEntryKey(
      key
    );
    const safeKey = makeSafeId(rawKey, "");

    return (
      entries.find((classEntry, index) => {
        return (
          getClassProgressionEntryKey(
            classEntry,
            index
          ) === rawKey
        );
      }) ||
      entries.find((classEntry) => {
        return (
          makeSafeId(
            classEntry?.classId ||
              classEntry?.className,
            ""
          ) === safeKey
        );
      }) ||
      null
    );
  }

  function isAsiOrFeatChoiceFeature(feature) {
    if (typeof feature === "string") {
      return (
        cleanString(feature).toLowerCase() ===
        "ability score improvement"
      );
    }

    if (!feature || typeof feature !== "object") {
      return false;
    }

    const name = cleanString(feature.name).toLowerCase();
    const type = cleanString(feature.type).toLowerCase();
    const optionSource = cleanString(
      feature.optionSource
    ).toLowerCase();
    const options = uniqueCleanArray(feature.options)
      .map((option) => option.toLowerCase());

    return (
      name === "ability score improvement" ||
      ["asi", "asi-or-feat", "asiorfeat"].includes(type) ||
      optionSource === "asiorfeat" ||
      (
        type === "choice" &&
        options.includes("ability score improvement") &&
        options.includes("feat")
      )
    );
  }

  function getClassAsiLevels(classTemplate) {
    if (!classTemplate) {
      return [];
    }

    const levels = new Set();

    const collectFeatureLevels = (progression) => {
      if (
        !progression ||
        typeof progression !== "object" ||
        Array.isArray(progression)
      ) {
        return;
      }

      Object.entries(progression).forEach(
        ([levelKey, levelData]) => {
          const classLevel = Math.max(
            1,
            Math.round(safeNumber(levelKey, 1))
          );
          const features = Array.isArray(levelData)
            ? levelData
            : Array.isArray(levelData?.features)
              ? levelData.features
              : [];

          if (features.some(isAsiOrFeatChoiceFeature)) {
            levels.add(classLevel);
          }
        }
      );
    };

    collectFeatureLevels(classTemplate.featuresByLevel);
    collectFeatureLevels(classTemplate.levels);

    uniqueCleanArray(classTemplate.asiLevels)
      .forEach((level) => {
        const classLevel = Math.round(safeNumber(level, 0));

        if (classLevel > 0) {
          levels.add(classLevel);
        }
      });

    return [...levels].sort((a, b) => a - b);
  }

  function calculateUnlockedFeatChoiceSlots(
    character = creatorState.draft
  ) {
    const classEntries = getCharacterClassEntries(character);
    const savedAdvancementChoices = Array.isArray(
      character?.advancementChoices
    )
      ? character.advancementChoices
      : [];

    return classEntries.flatMap((classEntry, classIndex) => {
      const classTemplate = resolveClassTemplateForEntry(classEntry);
      const isStartingClass =
        isStartingClassEntry(
          classEntry,
          character,
          classIndex
        );
      const classId = makeSafeId(
        classEntry?.classId ||
        classTemplate?.id ||
        classEntry?.className,
        `class-${classIndex + 1}`
      );
      const classEntryId = cleanString(
        classEntry?.entryId,
        getClassProgressionEntryKey(
          classEntry,
          classIndex
        )
      );
      const className = cleanString(
        classEntry?.className || classTemplate?.name,
        `Class ${classIndex + 1}`
      );
      const rawClassLevel = Number(classEntry?.level);
      const fallbackLevel = classEntries.length === 1
        ? safeNumber(
            character?.classProgression?.totalLevel ||
            character?.level,
            1
          )
        : 0;
      const classLevel = Math.max(
        0,
        Math.min(
          20,
          Math.round(
            Number.isFinite(rawClassLevel)
              ? rawClassLevel
              : fallbackLevel
          )
        )
      );
      const entryChoices = normalizeClassChoiceMap(
        classEntry?.choices?.classFeatures
      );
      const compatibilityChoices = normalizeClassChoiceMap(
        character?.classChoices
      );
      const classChoices = {
        ...entryChoices,
        ...Object.fromEntries(
          Object.entries(compatibilityChoices)
            .filter(([choiceId]) => {
              return (
                choiceId.startsWith(`${classEntryId}-level-`) ||
                choiceId.startsWith(`${classId}-level-`) ||
                isStartingClass
              );
            })
        )
      };

      const getAsiFeatureAtLevel = (level) => {
        const featureSources = [
          classTemplate?.featuresByLevel?.[level],
          classTemplate?.featuresByLevel?.[String(level)],
          classTemplate?.levels?.[level]?.features,
          classTemplate?.levels?.[String(level)]?.features
        ];

        return featureSources
          .filter(Array.isArray)
          .flat()
          .find(isAsiOrFeatChoiceFeature) || null;
      };

      return getClassAsiLevels(classTemplate)
        .filter((level) => level <= classLevel)
        .map((level) => {
          const slotId = `${classEntryId}-level-${level}-asi`;
          const legacySlotId = `${classId}-level-${level}-asi`;
          const feature = getAsiFeatureAtLevel(level);
          const featureId = makeSafeId(
            typeof feature === "object"
              ? feature?.id || feature?.name
              : feature,
            slotId
          );
          const selectedValues =
            entryChoices[slotId] ||
            entryChoices[legacySlotId] ||
            entryChoices[featureId] ||
            compatibilityChoices[slotId] ||
            compatibilityChoices[legacySlotId] ||
            (
              isStartingClass
                ? compatibilityChoices[featureId]
                : null
            ) ||
            [];
          const savedChoice = savedAdvancementChoices.find(
            (choice) => {
              return (
                cleanString(choice?.id) === slotId ||
                cleanString(choice?.id) === legacySlotId ||
                cleanString(
                  choice?.classEntryId ||
                    choice?.entryId
                ) === classEntryId &&
                  safeNumber(choice?.classLevel, 0) === level ||
                (
                  makeSafeId(choice?.classId, "") === classId &&
                  safeNumber(choice?.classLevel, 0) === level
                )
              );
            }
          );
          const selectedMode = cleanString(
            savedChoice?.selectedMode || savedChoice?.mode ||
            (
              selectedValues.includes("mode:feat")
                ? "feat"
                : selectedValues.includes("mode:asi")
                  ? "asi"
                  : ""
            )
          );
          const selectedFeatId = cleanString(
            savedChoice?.selectedFeatId || savedChoice?.featId ||
            cleanString(
              selectedValues.find((value) => {
                return value.startsWith("feat:");
              })
            ).slice("feat:".length)
          );
          const featChoices = {
            ...normalizeFeatChoiceSelections(
              savedChoice?.featChoices
            ),
            ...parseFeatChoiceSelections(
              selectedValues
            )
          };

          return {
            id: slotId,
            legacyId: legacySlotId,
            featureId,
            classIndex,
            classEntryId,
            classId,
            className,
            classLevel: level,
            label: `Advancement Choice — ${className} Level ${level}`,
            selectedMode,
            selectedFeatId,
            featChoices
          };
        });
    });
  }

  function getUnlockedFeatChoiceSlots(
    character = creatorState.draft
  ) {
    const dependencyKey = createDerivedSignature({
      classProgression:
        character?.classProgression,
      classChoices:
        character?.classChoices,
      advancementChoices:
        character?.advancementChoices,
      roomClasses:
        getDerivedObjectIdentity(
          creatorState.roomClassCache
        )
    });

    return derivedCache.get(
      "unlocked-feat-slots",
      dependencyKey,
      () => calculateUnlockedFeatChoiceSlots(
        character
      )
    );
  }

  function getSection12UnlockedAsiSlot(
    slotId,
    character = creatorState.draft
  ) {
    const cleanSlotId =
      cleanString(slotId);

    if (!cleanSlotId) {
      return null;
    }

    return (
      getUnlockedFeatChoiceSlots(character)
        .find((slot) => {
          return (
            cleanString(slot.id) === cleanSlotId ||
            cleanString(slot.legacyId) === cleanSlotId ||
            cleanString(slot.featureId) === cleanSlotId
          );
        }) ||
      null
    );
  }

  function migrateClassEntryAdvancementData(
    character,
    options = {}
  ) {
    const slots = getUnlockedFeatChoiceSlots(
      character
    );

    if (!slots.length) {
      return false;
    }

    const classEntries =
      getCharacterClassEntries(character);
    const compatibilityChoices =
      normalizeClassChoiceMap(
        character?.classChoices
      );
    let changed = false;

    slots.forEach((slot) => {
      const classEntry =
        classEntries[slot.classIndex];

      if (!classEntry) {
        return;
      }

      const isStartingClass =
        isStartingClassEntry(
          classEntry,
          character,
          slot.classIndex
        );

      const compatibilityLegacyIds = [
        slot.legacyId,
        isStartingClass
          ? slot.featureId
          : ""
      ].filter((choiceId, index, values) => {
        return (
          choiceId &&
          choiceId !== slot.id &&
          values.indexOf(choiceId) === index
        );
      });

      compatibilityLegacyIds.forEach(
        (legacyChoiceId) => {
          const legacyValues =
            compatibilityChoices[
              legacyChoiceId
            ];

          if (!legacyValues) {
            return;
          }

          if (
            !uniqueCleanArray(
              compatibilityChoices[
                slot.id
              ]
            ).length
          ) {
            compatibilityChoices[
              slot.id
            ] = legacyValues;
          }

          delete compatibilityChoices[
            legacyChoiceId
          ];

          changed = true;
        }
      );

      classEntry.choices = {
        ...(classEntry.choices || {})
      };

      const entryChoices =
        normalizeClassChoiceMap(
          classEntry.choices.classFeatures
        );

      [
        slot.legacyId,
        slot.featureId
      ]
        .filter((choiceId, index, values) => {
          return (
            choiceId &&
            choiceId !== slot.id &&
            values.indexOf(choiceId) === index
          );
        })
        .forEach((legacyChoiceId) => {
          const legacyValues =
            entryChoices[
              legacyChoiceId
            ];

          if (!legacyValues) {
            return;
          }

          if (
            !uniqueCleanArray(
              entryChoices[slot.id]
            ).length
          ) {
            entryChoices[slot.id] =
              legacyValues;
          }

          delete entryChoices[
            legacyChoiceId
          ];

          changed = true;
        });

      classEntry.choices.classFeatures =
        entryChoices;
    });

    character.classChoices =
      compatibilityChoices;

    const normalizedAdvancementChoices =
      normalizeAdvancementChoices(
        character?.advancementChoices
      );

    const usedAdvancementChoices =
      new Set();

    const migratedAdvancementChoices = [];

    const mergeAdvancementChoice = (
      preferred,
      fallback
    ) => {
      const preferredMode = cleanString(
        preferred?.mode ||
          preferred?.selectedMode
      ).toLowerCase();

      const fallbackMode = cleanString(
        fallback?.mode ||
          fallback?.selectedMode
      ).toLowerCase();

      const mode =
        ["asi", "feat"].includes(
          preferredMode
        )
          ? preferredMode
          : ["asi", "feat"].includes(
              fallbackMode
            )
            ? fallbackMode
            : "";

      const preferredFeatId =
        cleanString(
          preferred?.featId ||
            preferred?.selectedFeatId
        );

      const fallbackFeatId =
        cleanString(
          fallback?.featId ||
            fallback?.selectedFeatId
        );

      const featId =
        mode === "feat"
          ? preferredFeatId ||
            fallbackFeatId
          : "";

      const knownFeat =
        DEFAULT_FEATS.find((feat) => {
          return feat.id === featId;
        });

      return {
        ...(fallback || {}),
        ...(preferred || {}),
        mode,
        featId,
        featName:
          mode === "feat"
            ? cleanString(
                preferred?.featName,
                cleanString(
                  fallback?.featName,
                  knownFeat?.name || ""
                )
              )
            : "",
        featChoices:
          mode === "feat"
            ? {
                ...normalizeFeatChoiceSelections(
                  fallback?.featChoices
                ),
                ...normalizeFeatChoiceSelections(
                  preferred?.featChoices
                )
              }
            : {}
      };
    };

    slots.forEach((slot) => {
      const matches =
        normalizedAdvancementChoices
          .filter((choice) => {
            if (
              usedAdvancementChoices.has(
                choice
              )
            ) {
              return false;
            }

            return (
              choice.id === slot.id ||
              choice.id === slot.legacyId ||
              choice.id === slot.featureId ||
              (
                cleanString(
                  choice.classEntryId
                ) === slot.classEntryId &&
                safeNumber(
                  choice.classLevel,
                  0
                ) === slot.classLevel
              ) ||
              (
                makeSafeId(
                  choice.classId,
                  ""
                ) === slot.classId &&
                safeNumber(
                  choice.classLevel,
                  0
                ) === slot.classLevel
              )
            );
          });

      if (!matches.length) {
        return;
      }

      const preferred =
        matches.find((choice) => {
          return choice.id === slot.id;
        }) ||
        matches.find((choice) => {
          return (
            cleanString(
              choice.classEntryId
            ) === slot.classEntryId
          );
        }) ||
        matches[0];

      const merged = matches
        .filter((choice) => {
          return choice !== preferred;
        })
        .reduce(
          (result, fallback) => {
            return mergeAdvancementChoice(
              result,
              fallback
            );
          },
          preferred
        );

      matches.forEach((choice) => {
        usedAdvancementChoices.add(
          choice
        );
      });

      if (
        matches.length > 1 ||
        merged.id !== slot.id ||
        cleanString(
          merged.classEntryId
        ) !== slot.classEntryId
      ) {
        changed = true;
      }

      migratedAdvancementChoices.push({
        ...merged,
        id: slot.id,
        classEntryId: slot.classEntryId,
        classId: slot.classId,
        classLevel: slot.classLevel
      });
    });

    normalizedAdvancementChoices
      .filter((choice) => {
        return !usedAdvancementChoices.has(
          choice
        );
      })
      .forEach((choice) => {
        migratedAdvancementChoices.push(
          choice
        );
      });

    character.advancementChoices =
      migratedAdvancementChoices;

    character.advancementChoices =
      normalizeAdvancementChoices(
        character.advancementChoices
      );

    if (
      changed &&
      options.addMigrationWarning === true
    ) {
      addMigrationWarning(
        character,
        "Class advancement choice IDs were migrated to stable class entry IDs."
      );
    }

    return changed;
  }

  function cleanupDuplicateNonRepeatableAdvancementFeats(
    character,
    options = {}
  ) {
    const slots =
      getUnlockedFeatChoiceSlots(
        character
      );

    if (!slots.length) {
      return [];
    }

    const classEntries =
      getCharacterClassEntries(
        character
      );

    const seenFeatSlots =
      new Map();
    const seenFeatChoiceValues =
      new Map();

    const duplicateSlots = [];

    slots.forEach((slot) => {
      if (
        slot.selectedMode !== "feat" ||
        !slot.selectedFeatId
      ) {
        return;
      }

      const feat =
        DEFAULT_FEATS.find((entry) => {
          return (
            entry.id ===
            slot.selectedFeatId
          );
        });

      if (!feat) {
        return;
      }

      if (
        feat.repeatable === true
      ) {
        if (
          feat.repeatByChoice !==
            true
        ) {
          return;
        }

        const seenByChoice =
          seenFeatChoiceValues.get(
            feat.id
          ) ||
          new Map();
        const selectedByChoice =
          Object.entries(
            normalizeFeatChoiceSelections(
              slot.featChoices
            )
          ).map(
            ([choiceId, values]) => {
              return {
                choiceId,
                values:
                  uniqueCleanArray(
                    values
                  )
                    .map((value) => {
                      return {
                        id:
                          makeSafeId(
                            value,
                            ""
                          ),
                        value
                      };
                    })
                    .filter(
                      (entry) => {
                        return entry.id;
                      }
                    )
              };
            }
          );
        const duplicateChoiceValues =
          selectedByChoice
            .flatMap(
              ({ choiceId, values }) => {
                const seenValues =
                  seenByChoice.get(
                    choiceId
                  ) ||
                  new Set();

                return values
                  .filter((entry) => {
                    return seenValues
                      .has(entry.id);
                  })
                  .map((entry) => {
                    return entry.value;
                  });
              }
            );

        if (
          duplicateChoiceValues.length
        ) {
          duplicateSlots.push({
            slot,
            feat,
            duplicateChoiceValues
          });
          return;
        }

        selectedByChoice.forEach(
          ({ choiceId, values }) => {
            const seenValues =
              seenByChoice.get(
                choiceId
              ) ||
              new Set();

            values.forEach(
              (entry) => {
                seenValues.add(
                  entry.id
                );
              }
            );
            seenByChoice.set(
              choiceId,
              seenValues
            );
          }
        );
        seenFeatChoiceValues.set(
          feat.id,
          seenByChoice
        );
        return;
      }

      if (
        seenFeatSlots.has(feat.id)
      ) {
        duplicateSlots.push({
          slot,
          feat
        });

        return;
      }

      seenFeatSlots.set(
        feat.id,
        slot.id
      );
    });

    if (!duplicateSlots.length) {
      return [];
    }

    const duplicateSlotIds =
      new Set(
        duplicateSlots.map(({ slot }) => {
          return slot.id;
        })
      );

    const choiceMatchesDuplicateSlot = (
      choice,
      slot
    ) => {
      return (
        choice.id === slot.id ||
        choice.id === slot.legacyId ||
        choice.id === slot.featureId ||
        (
          cleanString(
            choice.classEntryId
          ) === slot.classEntryId &&
          safeNumber(
            choice.classLevel,
            0
          ) === slot.classLevel
        ) ||
        (
          makeSafeId(
            choice.classId,
            ""
          ) === slot.classId &&
          safeNumber(
            choice.classLevel,
            0
          ) === slot.classLevel
        )
      );
    };

    character.advancementChoices =
      normalizeAdvancementChoices(
        character?.advancementChoices
      ).filter((choice) => {
        return !duplicateSlots.some(
          ({ slot }) => {
            return choiceMatchesDuplicateSlot(
              choice,
              slot
            );
          }
        );
      });

    const compatibilityChoices =
      normalizeClassChoiceMap(
        character?.classChoices
      );

    duplicateSlots.forEach(
      ({
        slot,
        feat,
        duplicateChoiceValues = []
      }) => {
        const classEntry =
          classEntries[
            slot.classIndex
          ];

        const isStartingClass =
          classEntry &&
          isStartingClassEntry(
            classEntry,
            character,
            slot.classIndex
          );

        [
          slot.id,
          slot.legacyId,
          isStartingClass
            ? slot.featureId
            : ""
        ]
          .filter(Boolean)
          .forEach((choiceId) => {
            delete compatibilityChoices[
              choiceId
            ];
          });

        if (classEntry) {
          classEntry.choices = {
            ...(classEntry.choices || {})
          };

          const entryChoices =
            normalizeClassChoiceMap(
              classEntry.choices
                .classFeatures
            );

          [
            slot.id,
            slot.legacyId,
            slot.featureId
          ]
            .filter(Boolean)
            .forEach((choiceId) => {
              delete entryChoices[
                choiceId
              ];
            });

          classEntry.choices
            .classFeatures =
              entryChoices;
        }

        if (
          options.addMigrationWarning ===
          true
        ) {
          addMigrationWarning(
            character,
            duplicateChoiceValues.length
              ? `Duplicate feat choice detected: ${feat.name} (${uniqueCleanArray(duplicateChoiceValues).join(", ")}). Repeatable instances require different choices.`
              : `Duplicate feat detected: ${feat.name}. Non-repeatable feats should only be selected once.`
          );
        }
      }
    );

    character.classChoices =
      compatibilityChoices;

    return [
      ...duplicateSlotIds
    ];
  }

  function calculateCharacterHitDiceUncached(
    character
  ) {
    return getCharacterClassEntries(character)
      .map((classEntry) => {
        const template =
          resolveClassTemplateForEntry(
            classEntry
          );

        const level =
          Math.max(
            0,
            Math.round(
              safeNumber(
                classEntry?.level,
                0
              )
            )
          );

        return {
          classEntryId:
            classEntry.entryId || "",
          classId:
            classEntry.classId ||
            template?.id ||
            "",
          className:
            classEntry.className ||
            template?.name ||
            "Class",
          die: formatClassEntryHitDie(
            classEntry,
            template
          ),
          count: level
        };
      })
      .filter((entry) => {
        return entry.count > 0;
      });
  }

  function calculateCharacterHitDice(
    character
  ) {
    const dependencyKey = createDerivedSignature({
      classProgression:
        character?.classProgression,
      roomClasses:
        getDerivedObjectIdentity(
          creatorState.roomClassCache
        )
    });

    return derivedCache.get(
      "character-hit-dice",
      dependencyKey,
      () => calculateCharacterHitDiceUncached(
        character
      )
    );
  }

  function getHitDieSize(hitDie) {
    return Math.max(
      1,
      safeNumber(
        String(hitDie || "d8")
          .replace(/[^0-9]/g, ""),
        8
      )
    );
  }

  function getHpRollRawRecords(rawRolls) {
    return (Array.isArray(rawRolls)
      ? rawRolls
      : []
    ).map((raw, index) => {
      const isRecord =
        raw &&
        typeof raw === "object" &&
        !Array.isArray(raw);

      const characterLevel =
        isRecord
          ? Math.max(
              2,
              Math.round(
                safeNumber(
                  raw.characterLevel,
                  index + 2
                )
              )
            )
          : index + 2;

      const roll =
        isRecord
          ? raw.roll
          : raw;

      return {
        rawIndex: index,
        legacy:
          !isRecord,
        characterLevel,
        classId:
          isRecord
            ? cleanString(raw.classId)
            : "",
        classEntryId:
          isRecord
            ? cleanString(
                raw.classEntryId ||
                raw.entryId
              )
            : "",
        className:
          isRecord
            ? cleanString(raw.className)
            : "",
        hitDie:
          isRecord
            ? cleanString(raw.hitDie)
            : "",
        roll:
          Math.max(
            1,
            Math.round(
              safeNumber(roll, 1)
            )
          )
      };
    });
  }

  function hpRollRawHasAssociation(
    rawRecord
  ) {
    return Boolean(
      cleanString(
        rawRecord?.classEntryId
      ) ||
      cleanString(rawRecord?.classId) ||
      cleanString(rawRecord?.className) ||
      cleanString(rawRecord?.hitDie)
    );
  }

  function hpRollRawMatchesLevel(
    rawRecord,
    levelRecord
  ) {
    if (!rawRecord || !levelRecord) {
      return false;
    }

    const rawClassEntryId = cleanString(
      rawRecord.classEntryId
    );
    const levelClassEntryId = cleanString(
      levelRecord.classEntryId
    );

    if (
      rawClassEntryId &&
      levelClassEntryId &&
      rawClassEntryId !== levelClassEntryId
    ) {
      return false;
    }

    const rawHitDie =
      cleanString(rawRecord.hitDie);

    if (
      rawHitDie &&
      rawHitDie !== cleanString(
        levelRecord.hitDie
      )
    ) {
      return false;
    }

    const rawClassId =
      cleanString(rawRecord.classId);

    const levelClassId =
      cleanString(levelRecord.classId);

    if (
      rawClassId &&
      levelClassId &&
      rawClassId !== levelClassId
    ) {
      return false;
    }

    const rawClassName =
      cleanString(rawRecord.className)
        .toLowerCase();

    const levelClassName =
      cleanString(levelRecord.className)
        .toLowerCase();

    if (
      rawClassName &&
      levelClassName &&
      rawClassName !== levelClassName
    ) {
      return false;
    }

    return true;
  }

  function findHpRollRawRecordForLevel({
    rawRecords,
    usedIndexes,
    levelRecord,
    laterLevelIndex
  }) {
    const unusedRecords =
      rawRecords.filter((record) => {
        return !usedIndexes.has(
          record.rawIndex
        );
      });

    return (
      unusedRecords.find((record) => {
        return (
          record.characterLevel ===
            levelRecord.characterLevel &&
          hpRollRawMatchesLevel(
            record,
            levelRecord
          )
        );
      }) ||
      unusedRecords.find((record) => {
        return hpRollRawMatchesLevel(
          record,
          levelRecord
        );
      }) ||
      unusedRecords.find((record) => {
        return (
          !hpRollRawHasAssociation(
            record
          ) &&
          record.characterLevel ===
          levelRecord.characterLevel
        );
      }) ||
      unusedRecords.find((record) => {
        return (
          !hpRollRawHasAssociation(
            record
          ) &&
          record.rawIndex ===
          laterLevelIndex
        );
      }) ||
      null
    );
  }

  function getCharacterLevelHitDieRecords(
    character
  ) {
    const classEntries =
      getCharacterClassEntries(
        character
      );

    const levelOrder =
      normalizeClassLevelOrder(
        character?.classProgression
          ?.levelOrder,
        classEntries
      );

    if (levelOrder.length) {
      const classLevelCounts = {};

      return levelOrder
        .map((classKey, index) => {
          const classEntry =
            findClassEntryForLevelOrderKey(
              classKey,
              classEntries
            );

          const template =
            resolveClassTemplateForEntry(
              classEntry
            );

          classLevelCounts[classKey] =
            (classLevelCounts[classKey] || 0) + 1;

          return {
            characterLevel:
              index + 1,
            classLevel:
              classLevelCounts[classKey],
            classEntryId:
              classEntry?.entryId ||
              classKey,
            classId:
              classEntry?.classId ||
              template?.id ||
              classKey,
            className:
              classEntry?.className ||
              template?.name ||
              "Class",
            hitDie: formatClassEntryHitDie(
              classEntry,
              template
            )
          };
        })
        .slice(
          0,
          clampLevel(
            character
              ?.classProgression
              ?.totalLevel ||
            levelOrder.length ||
            1
          )
        );
    }

    const records = [];

    classEntries.forEach((classEntry) => {
        const template =
          resolveClassTemplateForEntry(
            classEntry
          );

        const classLevel =
          Math.max(
            0,
            Math.round(
              safeNumber(
                classEntry?.level,
                0
              )
            )
          );

        const hitDie =
          formatClassEntryHitDie(
            classEntry,
            template
          );

        for (
          let index = 0;
          index < classLevel;
          index += 1
        ) {
          records.push({
            characterLevel:
              records.length + 1,
            classEntryId:
              classEntry.entryId || "",
            classId:
              classEntry.classId ||
              template?.id ||
              "",
            className:
              classEntry.className ||
              template?.name ||
              "Class",
            hitDie
          });
        }
      });

    return records.slice(
      0,
      clampLevel(
        character
          ?.classProgression
          ?.totalLevel ||
        records.length ||
        1
      )
    );
  }

  function normalizeHpRollRecordsForCharacter(
    rawRolls,
    character
  ) {
    const levelRecords =
      getCharacterLevelHitDieRecords(
        character
      );

    const laterLevels =
      levelRecords.slice(1);

    const rawRecords =
      getHpRollRawRecords(rawRolls);

    const hasMulticlass =
      getCharacterClassEntries(character)
        .length > 1;

    let migratedNumericRolls = false;
    const usedIndexes = new Set();

    const records =
      laterLevels.map((levelRecord, index) => {
        const raw =
          findHpRollRawRecordForLevel({
            rawRecords,
            usedIndexes,
            levelRecord,
            laterLevelIndex: index
          });

        if (
          raw &&
          raw.legacy
        ) {
          migratedNumericRolls = true;
        }

        if (raw) {
          usedIndexes.add(raw.rawIndex);
        }

        const dieSize =
          getHitDieSize(
            levelRecord.hitDie
          );

        return {
          characterLevel:
            levelRecord.characterLevel,
          classEntryId:
            levelRecord.classEntryId || "",
          classId:
            levelRecord.classId,
          className:
            levelRecord.className,
          hitDie:
            levelRecord.hitDie,
          roll:
            Math.max(
              1,
              Math.min(
                dieSize,
                Math.round(
                  safeNumber(
                    raw?.roll,
                    Math.floor(dieSize / 2) + 1
                  )
                )
              )
            )
        };
      });

    if (migratedNumericRolls) {
      addMigrationWarning(
        character,
        "Old rolled HP values were migrated to per-level roll records."
      );

      if (hasMulticlass) {
        addMigrationWarning(
          character,
          "Legacy multiclass numeric HP rolls cannot be assigned to classes with certainty. They were matched to the saved level order and must be reviewed."
        );
      }
    }

    return records;
  }

  function getSpeciesHpBonus(
    character
  ) {
    const species =
      character?.species || {};

    const subraceId =
      cleanString(
        species.choices?.subraceId
      );

    if (
      species.id === "dwarf" &&
      subraceId === "hill-dwarf"
    ) {
      return clampLevel(
        character
          ?.classProgression
          ?.totalLevel || 1
      );
    }

    return 0;
  }

  function calculateCharacterRolledHp(
    character,
    hpCalculation,
    constitutionModifier
  ) {
    const levelRecords =
      getCharacterLevelHitDieRecords(
        character
      );

    if (!levelRecords.length) {
      return 1;
    }

    const firstDieSize =
      getHitDieSize(
        levelRecords[0].hitDie
      );

    const rollRecords =
      normalizeHpRollRecordsForCharacter(
        hpCalculation.laterLevelValues,
        character
      );

    let total =
      Math.max(
        1,
        hpCalculation.levelOneValue === null ||
        hpCalculation.levelOneValue === undefined
          ? firstDieSize +
            constitutionModifier
          : safeNumber(
              hpCalculation.levelOneValue,
              firstDieSize +
                constitutionModifier
            )
      );

    rollRecords.forEach((record) => {
      total += Math.max(
        1,
        record.roll +
          constitutionModifier
      );
    });

    return total;
  }

  function calculateCharacterHpUncached(
    character
  ) {
    const classEntries =
      getCharacterClassEntries(
        character
      );

    const primaryClass =
      getStartingClassEntry(
        character
      ) ||
      classEntries[0];

    const template =
      resolveClassTemplateForEntry(
        primaryClass
      );

    const level =
      clampLevel(
        character
          ?.classProgression
          ?.totalLevel ||
        primaryClass?.level ||
        1
      );

    const hitDie =
      formatClassEntryHitDie(
        primaryClass,
        template
      );

    const constitutionModifier =
      calculateAbilityModifier(
        getAbilityScore(character, "con")
      );

    const hpCalculation =
      normalizeHpCalculation(
        character?.combat?.hpCalculation,
        character?.combat?.maxHp
      );

    let maximumHp;
    const speciesHpBonus =
      getSpeciesHpBonus(character);
    const featHpBonus =
      calculateSelectedFeatNumericEffect(
        character,
        "hpBonus"
      );

    if (hpCalculation.mode === "manual") {
      maximumHp =
        calculateRuleManualHp({
          manualOverride:
            hpCalculation.manualOverride ??
            character?.combat?.maxHp
        });
    } else if (hpCalculation.mode === "rolled") {
      maximumHp =
        calculateCharacterRolledHp(
          character,
          hpCalculation,
          constitutionModifier
        ) +
        speciesHpBonus +
        featHpBonus;
    } else if (classEntries.length > 1) {
      const levelRecords =
        getCharacterLevelHitDieRecords(
          character
        );

      maximumHp =
        levelRecords.reduce(
          (total, levelRecord, index) => {
            const dieSize =
              getHitDieSize(
                levelRecord.hitDie ||
                "d8"
              );

            return (
              total +
              (
                index === 0
                  ? Math.max(
                      1,
                      dieSize +
                      constitutionModifier
                    )
                  : Math.max(
                      1,
                      Math.floor(
                        dieSize / 2
                      ) +
                      1 +
                      constitutionModifier
                    )
              )
            );
          },
          0
        ) + speciesHpBonus + featHpBonus;
    } else {
      maximumHp =
        calculateRuleFixedAverageHp({
          hitDie,
          level,
          constitutionModifier,
          levelOneValue:
            hpCalculation.levelOneValue
        }) +
        speciesHpBonus +
        featHpBonus;
    }

    return {
      mode: hpCalculation.mode,
      maximumHp,
      hitDie,
      level,
      constitutionModifier,
      speciesHpBonus,
      featHpBonus,
      manualOverride:
        hpCalculation.manualOverride,
      levelOneValue:
        hpCalculation.levelOneValue,
      rolls:
        hpCalculation.mode === "rolled"
          ? normalizeHpRollRecordsForCharacter(
              hpCalculation.laterLevelValues,
              character
            )
          : hpCalculation.laterLevelValues
    };
  }

  function calculateCharacterHp(
    character
  ) {
    const dependencyKey = createDerivedSignature({
      constitution:
        character?.abilities?.scores?.con,
      classProgression:
        character?.classProgression,
      hpCalculation:
        character?.combat?.hpCalculation,
      maximumHp:
        character?.combat?.maxHp,
      species: character?.species,
      classChoices:
        character?.classChoices,
      advancementChoices:
        character?.advancementChoices,
      feats: character?.feats,
      roomClasses:
        getDerivedObjectIdentity(
          creatorState.roomClassCache
        )
    });

    return derivedCache.get(
      "character-hp",
      dependencyKey,
      () => calculateCharacterHpUncached(
        character
      )
    );
  }

  function characterHasClass(
    character,
    classId
  ) {
    return getCharacterClassEntries(character)
      .some((classEntry) => {
        const template =
          resolveClassTemplateForEntry(
            classEntry
          );

        return (
          classEntry?.classId === classId ||
          template?.id === classId ||
          String(
            classEntry?.className ||
            template?.name ||
            ""
          ).toLowerCase() ===
            classId.toLowerCase()
        );
      });
  }

  function calculateArmorClassOptionsUncached(
    character
  ) {
    const featEffects = getSelectedDefaultFeatInstances(character)
      .flatMap((instance) => {
        return Array.isArray(instance.feat?.effects)
          ? instance.feat.effects
          : [];
      });
    const featMediumArmorCap = featEffects
      .filter((effect) => effect?.type === "mediumArmorDexterityCap")
      .reduce((maximum, effect) => {
        return Math.max(maximum, safeNumber(effect.value, 2));
      }, 2);
    const featUnarmoredOptions = featEffects
      .filter((effect) => effect?.type === "unarmoredArmorClass");
    const dexModifier =
      calculateAbilityModifier(
        getAbilityScore(character, "dex")
      );

    const conModifier =
      calculateAbilityModifier(
        getAbilityScore(character, "con")
      );

    const wisModifier =
      calculateAbilityModifier(
        getAbilityScore(character, "wis")
      );

    const inventory =
      Array.isArray(
        character?.equipment?.items
      )
        ? character.equipment.items
        : [];

    const equippedArmor =
      inventory.filter((item) => {
        return (
          item.equipped === true &&
          !cleanString(item.containerId) &&
          item.baseArmorClass &&
          item.isShield !== true
        );
      });

    const equippedShields =
      inventory.filter((item) => {
        return (
          item.equipped === true &&
          !cleanString(item.containerId) &&
          item.isShield === true
        );
      });
    const classArmorClassBonus = (
      Array.isArray(
        character?.classMechanics
          ?.armorClassModifiers
      )
        ? character.classMechanics
            .armorClassModifiers
        : []
    ).reduce((total, modifier) => {
      const requires = modifier.requires || {};
      const targetItemId = cleanString(
        modifier.targetItemId
      );
      const targetItem = targetItemId
        ? inventory.find((item) => {
            return (
              item.id === targetItemId &&
              item.equipped === true &&
              !cleanString(item.containerId)
            );
          })
        : null;

      if (
        requires.wearingArmor === true &&
        !equippedArmor.length
      ) {
        return total;
      }

      if (
        modifier.requiresItemTarget === true &&
        !targetItem
      ) {
        return total;
      }

      if (
        modifier.target === "armorOrShield" &&
        targetItem &&
        !(
          targetItem.isShield === true ||
          targetItem.baseArmorClass
        )
      ) {
        return total;
      }

      if (
        modifier.target === "shield" &&
        targetItem?.isShield !== true
      ) {
        return total;
      }

      return total + safeNumber(modifier.value, 0);
    }, 0);
    const equippedWeapons =
      inventory.filter((item) => {
        return (
          item.equipped === true &&
          !cleanString(item.containerId) &&
          (
            item.category === "weapon" ||
            item.weaponType ||
            item.damageDice
          ) &&
          item.isShield !== true
        );
      });
    const featArmorClassBonus = (
      Array.isArray(
        character?.featMechanics
          ?.armorClassModifiers
      )
        ? character.featMechanics
            .armorClassModifiers
        : []
    ).reduce((total, modifier) => {
      const condition =
        cleanString(
          modifier.condition
        ).toLowerCase();
      const requires =
        modifier.requires || {};

      if (
        (
          requires.wearingArmor === true ||
          condition === "wearing-armor"
        ) &&
        !equippedArmor.length
      ) {
        return total;
      }

      if (
        condition ===
          "dual-wielding-melee-weapons"
      ) {
        const oneHandedMeleeWeapons =
          equippedWeapons.filter((item) => {
            return (
              item.ranged !== true &&
              item.twoHanded !== true
            );
          });

        if (
          oneHandedMeleeWeapons.length < 2
        ) {
          return total;
        }
      }

      if (
        condition ===
          "wielding-double-bladed-scimitar-two-handed"
      ) {
        const hasDoubleBladedScimitar =
          equippedWeapons.some((item) => {
            return (
              makeSafeId(
                item.name || item.id,
                ""
              ) ===
                "double-bladed-scimitar" &&
              (
                item.twoHanded === true ||
                cleanString(
                  item.properties
                ).toLowerCase()
                  .includes("two-handed")
              )
            );
          });

        if (!hasDoubleBladedScimitar) {
          return total;
        }
      }

      return (
        total +
        safeNumber(
          modifier.value,
          0
        )
      );
    }, 0);
    const classUnarmoredFormulas = Array.isArray(
      character?.classMechanics?.armorClassFormulas
    )
      ? character.classMechanics.armorClassFormulas
      : [];
    const firstUnarmoredDefenseSource =
      syncFirstUnarmoredDefenseSource(
        character
      );

    const shieldBonus =
      equippedShields.length
        ? (
          2 +
          safeNumber(
            equippedShields[0]
              .magicalArmorClassBonus,
            0
          )
        )
        : 0;

    const generalArmorClassBonus =
      inventory.reduce((total, item) => {
        if (
          item.equipped !== true ||
          cleanString(item.containerId)
        ) {
          return total;
        }

        if (
          item.isShield === true ||
          item.baseArmorClass
        ) {
          return total;
        }

        return (
          total +
          safeNumber(
            item.magicalArmorClassBonus,
            0
          )
        );
      }, 0) +
      safeNumber(
        character?.combat?.armorClassBonus,
        0
      ) +
      classArmorClassBonus +
      featArmorClassBonus;

    const options = [];

    const addOption = (
      id,
      label,
      base,
      details,
      methodBonus = 0
    ) => {
      const extraBonus =
        generalArmorClassBonus +
        safeNumber(methodBonus, 0);

      options.push({
        id,
        label,
        total:
          base +
          shieldBonus +
          extraBonus,
        breakdown: [
          details,
          shieldBonus
            ? `Shield +${shieldBonus}`
            : "",
          extraBonus
            ? `Other AC bonus +${extraBonus}`
            : ""
        ].filter(Boolean).join(", ")
      });
    };

    if (!equippedArmor.length) {
      addOption(
        "unarmored",
        "Unarmored",
        10 + dexModifier,
        `10 + Dex ${formatSignedNumber(dexModifier)}`
      );

      featUnarmoredOptions.forEach((effect) => {
        const abilityId = makeSafeId(effect.ability, "dex").slice(0, 3);
        const abilityModifier = calculateAbilityModifier(
          getAbilityScore(character, abilityId)
        );

        addOption(
          `feat-unarmored:${effect.id || "feat"}`,
          "Feat Unarmored Defense",
          safeNumber(effect.base, 10) + abilityModifier,
          `${safeNumber(effect.base, 10)} + ${cleanString(effect.ability, "ability")} ${formatSignedNumber(abilityModifier)}`
        );
      });

      if (classUnarmoredFormulas.length) {
        classUnarmoredFormulas.forEach((formula) => {
          const requires = formula.requires || {};

          if (
            requires.noShield === true &&
            shieldBonus > 0
          ) {
            return;
          }

          const abilities = uniqueCleanArray(
            formula.abilities
          ).map((ability) => {
            const abilityId = makeSafeId(
              ability,
              ""
            ).slice(0, 3);
            const modifier = calculateAbilityModifier(
              getAbilityScore(character, abilityId)
            );

            return {
              id: abilityId,
              modifier
            };
          });
          const base = safeNumber(formula.base, 10);

          addOption(
            `class-unarmored:${cleanString(formula.classEntryId, "class")}:${cleanString(formula.featureId, "formula")}`,
            cleanString(
              formula.featureName,
              `${formula.className || "Class"} Unarmored Defense`
            ),
            base + abilities.reduce((total, ability) => {
              return total + ability.modifier;
            }, 0),
            [
              String(base),
              ...abilities.map((ability) => {
                return `${ability.id.toUpperCase()} ${formatSignedNumber(ability.modifier)}`;
              })
            ].join(" + ")
          );
        });
      } else {
        if (
          firstUnarmoredDefenseSource
            ?.classId === "barbarian" ||
          (
            !firstUnarmoredDefenseSource &&
            characterHasClass(
              character,
              "barbarian"
            )
          )
        ) {
          addOption(
            "barbarian-unarmored-defense",
            "Barbarian Unarmored Defense",
            10 + dexModifier + conModifier,
            `10 + Dex ${formatSignedNumber(dexModifier)} + Con ${formatSignedNumber(conModifier)}`
          );
        }

        if (
          (
            firstUnarmoredDefenseSource
              ?.classId === "monk" ||
            (
              !firstUnarmoredDefenseSource &&
              characterHasClass(
                character,
                "monk"
              )
            )
          ) &&
          shieldBonus === 0
        ) {
          addOption(
            "monk-unarmored-defense",
            "Monk Unarmored Defense",
            10 + dexModifier + wisModifier,
            `10 + Dex ${formatSignedNumber(dexModifier)} + Wis ${formatSignedNumber(wisModifier)}`
          );
        }
      }
    }

    equippedArmor.forEach((armor) => {
      const armorCategory =
        cleanString(
          armor.armorCategory ||
          armor.category
        ).toLowerCase();

      const base =
        Math.max(
          1,
          safeNumber(
            armor.baseArmorClass,
            10
          )
        );

      let dexBonus = 0;
      let label = "Armor";
      let details = "";

      if (armorCategory.includes("light")) {
        dexBonus = dexModifier;
        label = "Light Armor";
        details =
          `${base} + Dex ${formatSignedNumber(dexBonus)}`;
      } else if (armorCategory.includes("medium")) {
        const baseCap =
          armor.dexterityCap === null ||
          armor.dexterityCap === undefined
            ? 2
            : safeNumber(
                armor.dexterityCap,
                2
              );
        const cap = Math.max(baseCap, featMediumArmorCap);
        dexBonus =
          Math.min(dexModifier, cap);
        label = "Medium Armor";
        details =
          `${base} + Dex ${formatSignedNumber(dexBonus)} (maximum +${cap})`;
      } else if (armorCategory.includes("heavy")) {
        dexBonus = 0;
        label = "Heavy Armor";
        details = `${base} (no Dex modifier)`;
      } else {
        dexBonus = dexModifier;
        details =
          `${base} + Dex ${formatSignedNumber(dexBonus)}`;
      }

      addOption(
        `armor:${armor.id}`,
        `${label}: ${armor.name}`,
        base + dexBonus,
        details,
        safeNumber(
          armor.magicalArmorClassBonus,
          0
        )
      );
    });

    const manualValue =
      character?.combat?.manualArmorClass ??
      character?.combat?.armorClass;

    if (
      character?.combat?.armorClassMode ===
      "manual"
    ) {
      options.push({
        id: "manual",
        label: "Manual Override",
        total:
          Math.max(
            0,
            safeNumber(manualValue, 10)
          ),
        breakdown: "Manual AC override"
      });
    }

    const selectedId =
      character?.combat?.armorClassMode ===
      "manual"
        ? "manual"
        : cleanString(
            character
              ?.combat
              ?.selectedArmorClassMethod
          );

    const sorted =
      options.sort((a, b) => {
        return b.total - a.total;
      });

    const selected =
      sorted.find((option) => {
        return option.id === selectedId;
      }) ||
      sorted[0] ||
      {
        id: "unarmored",
        label: "Unarmored",
        total: 10 + dexModifier,
        breakdown:
          `10 + Dex ${formatSignedNumber(dexModifier)}`
      };

    return {
      selected,
      options: sorted
    };
  }

  function calculateArmorClassOptions(
    character
  ) {
    const dependencyKey = createDerivedSignature({
      scores: character?.abilities?.scores,
      classProgression:
        character?.classProgression,
      classChoices:
        character?.classChoices,
      advancementChoices:
        character?.advancementChoices,
      feats: character?.feats,
      equipment:
        character?.equipment?.items,
      armorClassOptions:
        character?.combat
          ?.armorClassOptions,
      selectedArmorClassMethod:
        character?.combat
          ?.selectedArmorClassMethod,
      armorClassModifiers:
        character?.classMechanics
          ?.armorClassModifiers
    });

    return derivedCache.get(
      "armor-class-options",
      dependencyKey,
      () => calculateArmorClassOptionsUncached(
        character
      )
    );
  }

  function formatSignedNumber(value) {
    const number =
      safeNumber(value, 0);

    return number >= 0
      ? `+${number}`
      : String(number);
  }

  function getInventoryItemKnownWeight(item) {
    if (
      item?.weight === null ||
      item?.weight === undefined ||
      item?.weight === ""
    ) {
      return null;
    }

    return (
      Math.max(0, safeNumber(item.weight, 0)) *
      Math.max(
        1,
        Math.round(
          safeNumber(item.quantity, 1)
        )
      )
    );
  }

  function calculateInventoryWeightSummaryUncached(
    items = []
  ) {
    return (Array.isArray(items) ? items : [])
      .reduce(
        (summary, item) => {
          const weight =
            getInventoryItemKnownWeight(item);

          if (weight === null) {
            summary.unknownCount += 1;
          } else {
            summary.knownWeight += weight;
          }

          return summary;
        },
        {
          knownWeight: 0,
          unknownCount: 0
        }
      );
  }

  function getInventoryWeightDependencyKey(items) {
    return createDerivedSignature(
      (Array.isArray(items) ? items : [])
        .map((item) => ({
          id: item?.id,
          weight: item?.weight,
          quantity: item?.quantity,
          containerId: item?.containerId,
          isContainer:
            item?.isContainer,
          capacityWeight:
            item?.capacityWeight
        }))
    );
  }

  function calculateInventoryWeightSummary(
    items = []
  ) {
    return derivedCache.get(
      "inventory-weight",
      getInventoryWeightDependencyKey(items),
      () => calculateInventoryWeightSummaryUncached(
        items
      )
    );
  }

  function getContainerContents(
    items,
    containerId
  ) {
    return (Array.isArray(items) ? items : [])
      .filter((item) => {
        return (
          cleanString(item.containerId) ===
          cleanString(containerId)
        );
      });
  }

  function wouldCreateContainerCycle(
    items,
    itemId,
    targetContainerId
  ) {
    const cleanItemId =
      cleanString(itemId);

    let currentId =
      cleanString(targetContainerId);

    const visited = new Set();

    while (currentId) {
      if (currentId === cleanItemId) {
        return true;
      }

      if (visited.has(currentId)) {
        return true;
      }

      visited.add(currentId);

      const parent =
        (Array.isArray(items) ? items : [])
          .find((item) => {
            return item.id === currentId;
          });

      currentId =
        cleanString(parent?.containerId);
    }

    return false;
  }

  function calculateContainerContentWeight(
    items,
    containerId,
    visited = new Set()
  ) {
    const cleanId =
      cleanString(containerId);

    if (!cleanId || visited.has(cleanId)) {
      return {
        knownWeight: 0,
        unknownCount: 0
      };
    }

    visited.add(cleanId);

    return getContainerContents(
      items,
      cleanId
    ).reduce(
      (summary, item) => {
        const weight =
          getInventoryItemKnownWeight(item);

        if (weight === null) {
          summary.unknownCount += 1;
        } else {
          summary.knownWeight += weight;
        }

        if (item.isContainer === true) {
          const nested =
            calculateContainerContentWeight(
              items,
              item.id,
              new Set(visited)
            );

          summary.knownWeight +=
            nested.knownWeight;

          summary.unknownCount +=
            nested.unknownCount;
        }

        return summary;
      },
      {
        knownWeight: 0,
        unknownCount: 0
      }
    );
  }

  function calculateContainerSummaries(items = []) {
    const inventory =
      Array.isArray(items) ? items : [];

    return inventory
      .filter((item) => {
        return item.isContainer === true;
      })
      .map((container) => {
        const contents =
          getContainerContents(
            inventory,
            container.id
          );

        const weight =
          calculateContainerContentWeight(
            inventory,
            container.id
          );

        const capacity =
          container.capacityWeight === null ||
          container.capacityWeight === undefined
            ? null
            : Math.max(
                0,
                safeNumber(
                  container.capacityWeight,
                  0
                )
              );

        return {
          id: container.id,
          name: container.name,
          contents,
          capacityWeight: capacity,
          knownWeight:
            weight.knownWeight,
          unknownCount:
            weight.unknownCount,
          overCapacity:
            capacity !== null &&
            weight.unknownCount === 0 &&
            weight.knownWeight > capacity,
          uncertain:
            weight.unknownCount > 0
        };
      });
  }

  function getContainerSummaries(items = []) {
    return derivedCache.get(
      "container-summaries",
      getInventoryWeightDependencyKey(items),
      () => calculateContainerSummaries(items)
    );
  }

  function validateContainerState(items = []) {
    const inventory =
      Array.isArray(items) ? items : [];

    const ids =
      new Set(
        inventory.map((item) => {
          return item.id;
        })
      );

    const warnings = [];

    inventory.forEach((item) => {
      const containerId =
        cleanString(item.containerId);

      if (!containerId) {
        return;
      }

      if (!ids.has(containerId)) {
        warnings.push(
          `${item.name || "Item"} references a missing container.`
        );
      }

      if (
        wouldCreateContainerCycle(
          inventory,
          item.id,
          containerId
        )
      ) {
        warnings.push(
          `${item.name || "Item"} has an invalid container loop.`
        );
      }
    });

    getContainerSummaries(inventory)
      .forEach((container) => {
        if (container.overCapacity) {
          warnings.push(
            `${container.name || "Container"} is over capacity.`
          );
        }
      });

    return warnings;
  }

  function repairContainerState(
    items = [],
    character = null
  ) {
    const inventory =
      cloneData(
        Array.isArray(items) ? items : []
      );

    const ids =
      new Set(
        inventory.map((item) => {
          return item.id;
        })
      );

    inventory.forEach((item) => {
      if (
        item.isContainer === true &&
        item.equipped === true
      ) {
        item.equipped = false;

        if (character) {
          addMigrationWarning(
            character,
            `${item.name || "Container"} was imported as equipped and was repaired to carried container state.`
          );
        }
      }

      const containerId =
        cleanString(item.containerId);

      if (!containerId) {
        return;
      }

      if (!ids.has(containerId)) {
        if (character) {
          addMigrationWarning(
            character,
            `${item.name || "Item"} referenced missing container ${containerId}; the container reference was cleared.`
          );
        }

        item.containerId = "";
        return;
      }

      if (
        wouldCreateContainerCycle(
          inventory,
          item.id,
          containerId
        )
      ) {
        if (character) {
          addMigrationWarning(
            character,
            `${item.name || "Item"} had an invalid container loop; the container reference was cleared.`
          );
        }

        item.containerId = "";
        return;
      }

      if (character) {
        if (item.equipped === true) {
          addMigrationWarning(
            character,
            `${item.name || "Item"} was equipped while stored in a container and was repaired to unequipped.`
          );
        }

        if (item.attuned === true) {
          addMigrationWarning(
            character,
            `${item.name || "Item"} was attuned while stored in a container and was repaired to unattuned.`
          );
        }
      }

      item.equipped = false;
      item.attuned = false;
    });

    return inventory;
  }

  function recordRawEquipmentMigrationWarnings(
    rawItems,
    character
  ) {
    if (
      !Array.isArray(rawItems) ||
      !character
    ) {
      return;
    }

    rawItems.forEach((rawItem) => {
      const raw =
        rawItem &&
        typeof rawItem === "object"
          ? rawItem
          : {};

      const name =
        safeDisplayString(
          raw.name,
          "Item"
        );

      const containerId =
        cleanString(raw.containerId);

      if (
        raw.isContainer === true &&
        raw.equipped === true
      ) {
        addMigrationWarning(
          character,
          `${name} was imported as an equipped container and was repaired to carried container state.`
        );
      }

      if (
        containerId &&
        raw.equipped === true
      ) {
        addMigrationWarning(
          character,
          `${name} was imported as equipped while stored in container ${containerId} and was repaired to unequipped.`
        );
      }

      if (
        containerId &&
        raw.attuned === true
      ) {
        addMigrationWarning(
          character,
          `${name} was imported as attuned while stored in container ${containerId} and was repaired to unattuned.`
        );
      }
    });
  }

  function splitInventoryStack(
    items,
    itemId,
    quantity,
    targetContainerId
  ) {
    const inventory =
      cloneData(Array.isArray(items) ? items : []);

    const index =
      inventory.findIndex((item) => {
        return item.id === itemId;
      });

    if (index < 0) {
      return inventory;
    }

    const item =
      inventory[index];

    const currentQuantity =
      Math.max(
        1,
        Math.round(
          safeNumber(item.quantity, 1)
        )
      );

    const moveQuantity =
      Math.max(
        1,
        Math.min(
          currentQuantity,
          Math.round(
            safeNumber(quantity, 1)
          )
        )
      );

    if (moveQuantity >= currentQuantity) {
      item.containerId =
        cleanString(targetContainerId);

      if (item.containerId) {
        item.equipped = false;
        item.attuned = false;
      }

      return inventory;
    }

    item.quantity =
      currentQuantity - moveQuantity;

    inventory.push({
      ...cloneData(item),
      id:
        makeSafeId(
          `${item.id}-${Date.now()}-${Math.random()}`,
          "split-item"
      ),
      quantity: moveQuantity,
      containerId:
        cleanString(targetContainerId),
      equipped:
        cleanString(targetContainerId)
          ? false
          : item.equipped === true,
      attuned:
        cleanString(targetContainerId)
          ? false
          : item.attuned === true
    });

    return inventory;
  }

  function removeContainerPreserveContents(
    items,
    containerId
  ) {
    const cleanId =
      cleanString(containerId);

    return cloneData(
      Array.isArray(items) ? items : []
    )
      .filter((item) => {
        return item.id !== cleanId;
      })
      .map((item) => {
        if (item.containerId === cleanId) {
          return {
            ...item,
            containerId: ""
          };
        }

        return item;
      });
  }

  function removeContainerAndContents(
    items,
    containerId
  ) {
    const inventory =
      cloneData(
        Array.isArray(items) ? items : []
      );

    const cleanId =
      cleanString(containerId);

    const removedIds =
      new Set([cleanId]);

    let changed = true;

    while (changed) {
      changed = false;

      inventory.forEach((item) => {
        if (
          item.containerId &&
          removedIds.has(item.containerId) &&
          !removedIds.has(item.id)
        ) {
          removedIds.add(item.id);
          changed = true;
        }
      });
    }

    return inventory.filter((item) => {
      return !removedIds.has(item.id);
    });
  }

  function isWeaponProficient(
    character,
    item
  ) {
    if (item.proficient === true) {
      return true;
    }

    const proficiencies =
      cleanArray(
        character
          ?.proficiencies
          ?.weapons
      ).map((value) => {
        return value.toLowerCase();
      });

    const itemName =
      cleanString(item.name).toLowerCase();

    const weaponType =
      cleanString(
        item.weaponType
      ).toLowerCase();

    return (
      proficiencies.includes(itemName) ||
      (
        weaponType.includes("simple") &&
        proficiencies.includes("simple weapons")
      ) ||
      (
        weaponType.includes("martial") &&
        proficiencies.includes("martial weapons")
      )
    );
  }

  function calculateWeaponAttack(
    character,
    item
  ) {
    const strengthModifier =
      calculateAbilityModifier(
        getAbilityScore(character, "str")
      );

    const dexterityModifier =
      calculateAbilityModifier(
        getAbilityScore(character, "dex")
      );

    const inventory = Array.isArray(
      character?.equipment?.items
    )
      ? character.equipment.items
      : [];
    const equippedArmor = inventory.filter((candidate) => {
      return (
        candidate.equipped === true &&
        !cleanString(candidate.containerId) &&
        candidate.isShield !== true &&
        Boolean(
          candidate.baseArmorClass ||
          cleanString(candidate.armorCategory)
        )
      );
    });
    const equippedShields = inventory.filter((candidate) => {
      return (
        candidate.equipped === true &&
        !cleanString(candidate.containerId) &&
        candidate.isShield === true
      );
    });
    const wearingHeavyArmor = equippedArmor.some((candidate) => {
      return cleanString(
        candidate.armorCategory ||
        candidate.category
      ).toLowerCase().includes("heavy");
    });

    const martialArtsProfile = (
      Array.isArray(
        character?.classMechanics?.combatProfiles
      )
        ? character.classMechanics.combatProfiles
        : []
    ).find((profile) => profile.type === "martialArts");
    const weaponTypeText = cleanString(
      item.weaponType
    ).toLowerCase();
    const martialArtsRequirementsMet = Boolean(
      martialArtsProfile &&
      equippedArmor.length === 0 &&
      equippedShields.length === 0
    );
    const isMonkWeapon = Boolean(
      martialArtsRequirementsMet &&
      (
        makeSafeId(item.name, "") === "unarmed-strike" ||
        makeSafeId(item.name, "") === "shortsword" ||
        (
          weaponTypeText.includes("simple melee") &&
          item.heavy !== true &&
          item.twoHanded !== true
        )
      )
    );
    const sneakAttackProfile = (
      Array.isArray(
        character?.classMechanics?.combatProfiles
      )
        ? character.classMechanics.combatProfiles
        : []
    ).find((profile) => profile.type === "sneakAttack");
    const sneakAttackEligible = Boolean(
      sneakAttackProfile &&
      (
        item.finesse === true ||
        item.ranged === true
      )
    );
    const rageProfile = (
      Array.isArray(
        character?.classMechanics?.combatProfiles
      )
        ? character.classMechanics.combatProfiles
        : []
    ).find((profile) => profile.type === "rage");
    const rageActive = Boolean(
      rageProfile &&
      character?.combat?.classFeatureStates?.rageActive === true
    );
    let abilityId =
      cleanString(item.attackAbility);

    if (!abilityId) {
      if (item.finesse === true || isMonkWeapon) {
        abilityId =
          dexterityModifier >= strengthModifier
            ? "dex"
            : "str";
      } else if (item.ranged === true) {
        abilityId = "dex";
      } else {
        abilityId = "str";
      }
    }

    const abilityModifier =
      abilityId === "dex"
        ? dexterityModifier
        : strengthModifier;
    const rageDamageBonus =
      rageActive &&
      abilityId === "str" &&
      item.ranged !== true &&
      !wearingHeavyArmor
        ? safeNumber(
            getProgressionValueByLevel(
              rageProfile.damageBonusByLevel,
              rageProfile.classLevel,
              0
            ),
            0
          )
        : 0;

    const proficient =
      isWeaponProficient(character, item);

    const proficiencyBonus =
      proficient
        ? getCharacterProficiencyBonus(character)
        : 0;

    const magicalAttackBonus =
      safeNumber(
        item.magicalAttackBonus ??
        item.magicalBonus,
        0
      );

    const magicalDamageBonus =
      safeNumber(
        item.magicalDamageBonus ??
        item.magicalBonus,
        0
      );
    const equippedWeapons = inventory.filter((candidate) => {
      return (
        candidate.equipped === true &&
        !cleanString(candidate.containerId) &&
        (
          candidate.category === "weapon" ||
          candidate.weaponType ||
          candidate.damageDice
        )
      );
    });
    const attackModifiers = [
      ...(
        Array.isArray(
          character?.classMechanics?.attackModifiers
        )
          ? character.classMechanics.attackModifiers
          : []
      ),
      ...(
        Array.isArray(
          character?.featMechanics?.attackModifiers
        )
          ? character.featMechanics.attackModifiers
          : []
      )
    ];
    const featureBonuses = attackModifiers
      .reduce((totals, modifier) => {
      const requires = modifier.requires || {};
      const targetItemId = cleanString(
        modifier.targetItemId
      );

      if (
        modifier.requiresItemTarget === true &&
        targetItemId !== item.id
      ) {
        return totals;
      }

      if (
        modifier.target === "weapon" &&
        targetItemId &&
        targetItemId !== item.id
      ) {
        return totals;
      }

      if (
        requires.rangedWeapon === true &&
        item.ranged !== true
      ) {
        return totals;
      }

      if (
        requires.oneHandedMeleeWeapon === true &&
        (
          item.ranged === true ||
          item.twoHanded === true
        )
      ) {
        return totals;
      }

      if (
        requires.noOtherWeapon === true &&
        equippedWeapons.some((candidate) => {
          return candidate.id !== item.id;
        })
      ) {
        return totals;
      }

      if (modifier.type === "weaponAttackBonus") {
        totals.attack += safeNumber(modifier.value, 0);
      }

      if (modifier.type === "weaponDamageBonus") {
        totals.damage += safeNumber(modifier.value, 0);
      }

      if (modifier.type === "weaponMagicBonus") {
        totals.attack += safeNumber(modifier.value, 0);
        totals.damage += safeNumber(modifier.value, 0);
      }

      return totals;
      }, { attack: 0, damage: 0 });

    const martialArtsDie = isMonkWeapon
      ? cleanString(
          getProgressionValueByLevel(
            martialArtsProfile.dieByLevel,
            martialArtsProfile.classLevel,
            "d4"
          ),
          "d4"
        )
      : "";
    const featUnarmedDie =
      makeSafeId(
        item.name || item.id,
        ""
      ) === "unarmed-strike"
        ? cleanString(
            (
              Array.isArray(
                character?.featMechanics
                  ?.combatProfiles
              )
                ? character.featMechanics
                    .combatProfiles
                : []
            ).find((profile) => {
              return profile.type ===
                "unarmedDamage";
            })?.die
          )
        : "";
    const baseDamageDice = cleanString(item.damageDice);
    const getPrimaryDieSize = (dice) => {
      const match = cleanString(dice).match(/(?:\d+)?d(\d+)/i);
      return match ? safeNumber(match[1], 0) : 0;
    };
    const bestUnarmedDieSize =
      Math.max(
        getPrimaryDieSize(
          martialArtsDie
        ),
        getPrimaryDieSize(
          featUnarmedDie
        )
      );
    const damageDice =
      bestUnarmedDieSize >
        getPrimaryDieSize(baseDamageDice)
        ? `1d${bestUnarmedDieSize}`
        : baseDamageDice ||
          (
            bestUnarmedDieSize
              ? `1d${bestUnarmedDieSize}`
              : ""
          );

    return {
      itemId: item.id,
      name: item.name,
      abilityId,
      proficient,
      attacksPerAction: Math.max(
        1,
        safeNumber(
          character?.classMechanics?.attackAction?.attacks ??
          character?.combat?.attacksPerAction,
          1
        )
      ),
      attackBonus:
        abilityModifier +
        proficiencyBonus +
        magicalAttackBonus +
        featureBonuses.attack,
      damageModifier:
        abilityModifier +
        magicalDamageBonus +
        featureBonuses.damage +
        rageDamageBonus,
      damageDice:
        damageDice,
      versatileDamageDice:
        cleanString(item.versatileDamageDice),
      martialArtsEligible: isMonkWeapon,
      martialArtsApplied:
        Boolean(martialArtsDie) &&
        damageDice !== baseDamageDice,
      martialArtsRestriction:
        martialArtsProfile &&
        !martialArtsRequirementsMet
          ? "Martial Arts is unavailable while wearing armor or wielding a shield."
          : martialArtsProfile &&
            !isMonkWeapon
              ? "Martial Arts requires an unarmed strike, shortsword, or eligible simple melee weapon."
              : "",
      sneakAttackEligible,
      sneakAttackDice: sneakAttackEligible
        ? getProgressionValueByLevel(
            sneakAttackProfile.diceByLevel,
            sneakAttackProfile.classLevel,
            "1d6"
          )
        : "",
      sneakAttackRestriction:
        sneakAttackProfile &&
        !sneakAttackEligible
          ? "Sneak Attack requires a finesse or ranged weapon."
          : "",
      rageDamageBonus,
      rageRestriction:
        rageActive && !rageDamageBonus
          ? "Rage damage requires a Strength-based melee attack and no heavy armor."
          : "",
      breakdown:
        `${abilityId.toUpperCase()} ${formatSignedNumber(abilityModifier)}${proficient ? ` + proficiency ${formatSignedNumber(proficiencyBonus)}` : ""}${magicalAttackBonus ? ` + magic ${formatSignedNumber(magicalAttackBonus)}` : ""}${featureBonuses.attack ? ` + feature ${formatSignedNumber(featureBonuses.attack)}` : ""}${rageDamageBonus ? `; rage damage ${formatSignedNumber(rageDamageBonus)}` : ""}`
    };
  }

  function calculateEquippedWeaponAttacksUncached(
    character
  ) {
    return (
      Array.isArray(
        character?.equipment?.items
      )
        ? character.equipment.items
        : []
    )
      .filter((item) => {
        return (
          item.equipped === true &&
          !cleanString(item.containerId) &&
          (
            item.category === "weapon" ||
            item.weaponType ||
            item.damageDice
          )
        );
      })
      .map((item) => {
        return calculateWeaponAttack(
          character,
          item
        );
      });
  }

  function calculateEquippedWeaponAttacks(
    character
  ) {
    const dependencyKey = createDerivedSignature({
      scores: character?.abilities?.scores,
      totalLevel:
        character?.classProgression
          ?.totalLevel,
      weaponProficiencies:
        character?.proficiencies?.weapons,
      equipment:
        character?.equipment?.items,
      combat: {
        attacksPerAction:
          character?.combat
            ?.attacksPerAction,
        classFeatureStates:
          character?.combat
            ?.classFeatureStates
      },
      classMechanics: {
        attackAction:
          character?.classMechanics
            ?.attackAction,
        attackModifiers:
          character?.classMechanics
            ?.attackModifiers,
        combatProfiles:
          character?.classMechanics
            ?.combatProfiles
      },
      featMechanics: {
        attackModifiers:
          character?.featMechanics
            ?.attackModifiers,
        combatProfiles:
          character?.featMechanics
            ?.combatProfiles
      }
    });

    return derivedCache.get(
      "weapon-attacks",
      dependencyKey,
      () => calculateEquippedWeaponAttacksUncached(
        character
      )
    );
  }

  function calculateCharacterSpellcastingInfo(
    character
  ) {
    return getCharacterClassEntries(character)
      .map((classEntry, classIndex) => {
        const template =
          resolveClassTemplateForEntry(
            classEntry
          );

        const subclass =
          getClassEntrySubclassTemplate(
            classEntry
          );

        const level =
          Math.max(
            0,
            Math.round(
              safeNumber(
                classEntry?.level,
                0
              )
            )
          );

        const subclassProgression =
          cleanString(
            subclass?.spellcastingProgression ||
            subclass?.progressionType
          );

        const subclassSpellcastingActive =
          Boolean(subclassProgression) &&
          level >= Math.max(
            1,
            safeNumber(
              subclass?.unlockLevel ||
              template?.subclassLevel,
              1
            )
          );

        const progression =
          cleanString(
            (
              subclassSpellcastingActive
                ? subclassProgression
                : ""
            ) ||
            classEntry?.spellcastingProgression ||
            template?.spellcastingProgression ||
            template?.progressionType,
            "none"
          );

        const spellcastingAbility =
          cleanString(
            (
              subclassSpellcastingActive
                ? subclass?.spellcastingAbility
                : ""
            ) ||
            classEntry?.spellcastingAbility ||
            template?.spellcastingAbility ||
            character?.magic?.spellcastingAbility
          );

        const levelData =
          template
            ? getSection12LevelData(
                template,
                Math.max(1, level)
              )
            : null;

        return {
          classEntryId:
            getClassProgressionEntryKey(
              classEntry,
              classIndex
            ),
          classId:
            classEntry.classId ||
            template?.id ||
            "",
          className:
            classEntry.className ||
            template?.name ||
            "Class",
          subclassId:
            cleanString(
              classEntry.subclassId ||
              subclass?.id
            ),
          subclassName:
            cleanString(
              classEntry.subclassName ||
              subclass?.name
            ),
          level,
          progressionType: progression,
          spellcastingAbility,
          spellListClassId:
            cleanString(
              (
                subclassSpellcastingActive
                  ? subclass?.spellListClassId
                  : ""
              ) ||
              classEntry?.spellListClassId ||
              template?.spellListClassId ||
              classEntry.classId ||
              template?.id
            ),
          spellPreparation:
            (
              subclassSpellcastingActive
                ? subclass?.spellPreparation
                : ""
            ) ||
            classEntry?.spellPreparation ||
            template?.spellPreparation ||
            "none",
          preparedSpellsFormula:
            cloneData(
              classEntry?.preparedSpellsFormula ||
              template?.preparedSpellsFormula ||
              null
            ),
          cantripsKnown:
            subclassSpellcastingActive
              ? getProgressionValueByLevel(
                  subclass?.cantripsKnown,
                  level,
                  0
                )
              : levelData?.cantripsKnown ??
                getProgressionValueByLevel(
                  template?.cantripsKnown,
                  level,
                  0
                ),
          spellsKnown:
            subclassSpellcastingActive
              ? getProgressionValueByLevel(
                  subclass?.spellsKnown,
                  level,
                  0
                )
              : levelData?.spellsKnown ??
                getProgressionValueByLevel(
                  template?.spellsKnown,
                  level,
                  0
                ),
          spellSlots:
            (
              subclassSpellcastingActive
                ? null
                : levelData?.spellSlots
            ) ||
            getSrd2014SpellSlots(
              progression,
              level
            ),
          expandedSpells:
            cloneData(
              subclass?.expandedSpells || {}
            ),
          spellSchoolRestrictions:
            cloneData(
              subclassSpellcastingActive
                ? subclass?.spellSchoolRestrictions || null
                : null
            ),
          pactMagic:
            levelData?.pactMagic ||
            (
              progression === "pact-magic"
                ? getSrd2014PactMagic(level)
                : { slots: 0, slotLevel: 0 }
            )
        };
      });
  }

  function getSpellcastingProgressionDependencyKey(
    character
  ) {
    return createDerivedSignature({
      classProgression:
        character?.classProgression,
      spellcastingAbility:
        character?.magic
          ?.spellcastingAbility,
      roomClasses:
        getDerivedObjectIdentity(
          creatorState.roomClassCache
        )
    });
  }

  function getCharacterSpellcastingInfo(
    character
  ) {
    return derivedCache.get(
      "spellcasting-progression",
      getSpellcastingProgressionDependencyKey(
        character
      ),
      () => calculateCharacterSpellcastingInfo(
        character
      )
    );
  }

  function getPreparedSpellLimit(
    character,
    spellcastingInfo
  ) {
    const abilityModifier =
      spellcastingInfo.spellcastingAbility
        ? calculateAbilityModifier(
            getAbilityScore(
              character,
              spellcastingInfo.spellcastingAbility
            )
          )
        : 0;

    const formula =
      spellcastingInfo.preparedSpellsFormula;

    if (
      formula &&
      typeof formula === "object"
    ) {
      const levelValue =
        spellcastingInfo.level *
        safeNumber(formula.levelFactor, 0);
      const roundedLevel =
        formula.round === "ceil"
          ? Math.ceil(levelValue)
          : Math.floor(levelValue);

      return Math.max(
        safeNumber(formula.minimum, 1),
        abilityModifier + roundedLevel
      );
    }

    if (
      ["cleric", "druid", "wizard"].includes(
        spellcastingInfo.classId
      )
    ) {
      return Math.max(
        1,
        abilityModifier +
        spellcastingInfo.level
      );
    }

    if (spellcastingInfo.classId === "paladin") {
      return Math.max(
        1,
        abilityModifier +
        Math.floor(
          spellcastingInfo.level / 2
        )
      );
    }

    return null;
  }

  function calculateSpellcastingSummary(
    character
  ) {
    const info =
      getCharacterSpellcastingInfo(character);

    const multiclass =
      calculateSrd2014MulticlassSpellcasting(
        info
      );

    const proficiencyBonus =
      getCharacterProficiencyBonus(character);
    const castingBlocked = Boolean(
      character?.classMechanics?.spellcastingBlocked
    );
    const castingBlockReasons = uniqueCleanArray(
      character?.classMechanics?.spellcastingBlockReasons
    );

    return {
      castingBlocked,
      castingBlockReasons,
      classes:
        info.map((entry) => {
          const abilityModifier =
            entry.spellcastingAbility
              ? calculateAbilityModifier(
                  getAbilityScore(
                    character,
                    entry.spellcastingAbility
                  )
                )
              : null;
          const classSpellAttackBonus = (
            Array.isArray(
              character?.classMechanics?.spellModifiers
            )
              ? character.classMechanics.spellModifiers
              : []
          ).reduce((total, modifier) => {
            if (
              modifier.type !== "spellAttackBonus" ||
              (
                modifier.classEntryId &&
                modifier.classEntryId !== entry.classEntryId
              )
            ) {
              return total;
            }

            const targetItemId = cleanString(
              modifier.targetItemId
            );
            const targetActive = !modifier.requiresItemTarget ||
              (
                targetItemId &&
                (character.equipment?.items || [])
                  .some((item) => {
                    return (
                      item.id === targetItemId &&
                      item.equipped === true &&
                      !cleanString(item.containerId)
                    );
                  })
              );

            return targetActive
              ? total + safeNumber(modifier.value, 0)
              : total;
          }, 0);

          return {
            ...entry,
            canCast: !castingBlocked,
            castingBlockReasons,
            spellSaveDc:
              abilityModifier === null
                ? null
                : calculateRuleSpellSaveDc({
                    proficiencyBonus,
                    abilityModifier
                  }),
            spellAttackBonus:
              abilityModifier === null
                ? null
                : calculateRuleSpellAttackBonus({
                    proficiencyBonus,
                    abilityModifier
                  }) + classSpellAttackBonus,
            preparedLimit:
              getPreparedSpellLimit(
                character,
                entry
              ),
            maxSpellLevel:
              Math.max(
                0,
                ...Object.keys(entry.spellSlots || {})
                  .map((key) => {
                    return safeNumber(key, 0);
                  }),
                safeNumber(
                  entry.pactMagic?.slotLevel,
                  0
                )
              )
          };
        }),
      multiclass
    };
  }

  function getSpellcastingSummary(
    character
  ) {
    const dependencyKey = createDerivedSignature({
      progression:
        getSpellcastingProgressionDependencyKey(
          character
        ),
      abilities:
        character?.abilities?.scores,
      classMechanics: {
        spellcastingBlocked:
          character?.classMechanics
            ?.spellcastingBlocked,
        spellcastingBlockReasons:
          character?.classMechanics
            ?.spellcastingBlockReasons,
        spellModifiers:
          character?.classMechanics
            ?.spellModifiers
      },
      equippedItems:
        (character?.equipment?.items || [])
          .map((item) => ({
            id: item?.id,
            equipped: item?.equipped,
            containerId:
              item?.containerId
          }))
    });

    return derivedCache.get(
      "spellcasting-summary",
      dependencyKey,
      () => calculateSpellcastingSummary(
        character
      )
    );
  }

  function getSpellSelectionLimits(
    character
  ) {
    const summary =
      getSpellcastingSummary(character);

    const customSpells = Array.isArray(
      character?.magic?.customSpells
    )
      ? character.magic.customSpells
      : [];

    const storedClassSources =
      character?.magic?.classSources &&
      typeof character.magic.classSources === "object" &&
      !Array.isArray(character.magic.classSources)
        ? Object.values(
            character.magic.classSources
          )
        : [];

    const activeSourceKeys = new Set(
      getSpellcastingClassOptions(character)
        .map((entry) => {
          return getSection16SourceKey(entry);
        })
        .filter(Boolean)
    );

    const classSources =
      storedClassSources.filter((source) => {
        return activeSourceKeys.has(
          cleanString(source?.classEntryId)
        );
      });

    const sourceModelActive =
      safeNumber(
        character?.magic
          ?.spellSourceModelVersion,
        0
      ) >= 2 &&
      classSources.length > 0;

    const knownIds = [...new Set([
      ...(
        sourceModelActive
          ? []
          : cleanArray(
              character?.magic?.knownSpellIds
            )
      ),
      ...classSources.flatMap((source) => {
        return [
          ...cleanArray(source?.cantripIds),
          ...cleanArray(source?.knownSpellIds),
          ...cleanArray(source?.spellbookSpellIds),
          ...Object.values(
            source?.mysticArcanumSpellIds ||
            {}
          )
        ];
      })
    ])];

    const preparedIds = [...new Set([
      ...(
        sourceModelActive
          ? []
          : cleanArray(
              character?.magic?.preparedSpellIds
            )
      ),
      ...classSources.flatMap((source) => {
        return cleanArray(
          source?.preparedSpellIds
        );
      })
    ])];

    const alwaysPreparedIds = [...new Set(
      classSources.flatMap((source) => {
        return cleanArray(
          source?.alwaysPreparedSpellIds
        );
      })
    )];

    const mysticArcanumIds = [...new Set(
      classSources.flatMap((source) => {
        return Object.values(
          source?.mysticArcanumSpellIds ||
          {}
        ).filter(Boolean);
      })
    )];

    const magicalSecretIds = [...new Set(classSources.flatMap(
      (source) => cleanArray(source?.magicalSecretSpellIds)
    ))];

    const knownIdsForLimits =
      knownIds.filter((spellId) => {
        return !mysticArcanumIds.includes(spellId) &&
          !magicalSecretIds.includes(spellId);
      });

    const spellById = new Map(
      [
        ...DEFAULT_SPELLS,
        ...customSpells
      ].map((spell) => {
        return [spell.id, spell];
      })
    );

    const countByLevel = (ids, levelTest) => {
      return ids.reduce((total, id) => {
        const spell =
          spellById.get(id);

        if (!spell) {
          return total;
        }

        return levelTest(
          safeNumber(spell.level, 0)
        )
          ? total + 1
          : total;
      }, 0);
    };

    const cantripsKnownLimit =
      summary.classes.reduce((total, entry) => {
        return (
          total +
          Math.max(
            0,
            safeNumber(
              entry.cantripsKnown,
              0
            )
          )
        );
      }, 0);

    const spellsKnownLimit =
      summary.classes.reduce((total, entry) => {
        return (
          total +
          Math.max(
            0,
            safeNumber(
              entry.spellsKnown,
              0
            )
          )
        );
      }, 0);

    const preparedLimit =
      summary.classes.reduce((total, entry) => {
        return entry.preparedLimit === null
          ? total
          : total +
              Math.max(
                0,
                safeNumber(
                  entry.preparedLimit,
                  0
                )
              );
      }, 0);

    const maxSpellLevel =
      Math.max(
        0,
        ...summary.classes.map((entry) => {
          return safeNumber(
            entry.maxSpellLevel,
            0
          );
        })
      );

    return {
      cantripsKnownLimit:
        cantripsKnownLimit || null,
      spellsKnownLimit:
        spellsKnownLimit || null,
      preparedLimit:
        preparedLimit || null,
      maxSpellLevel:
        maxSpellLevel || null,
      knownCantripCount:
        countByLevel(
          knownIdsForLimits,
          (level) => level === 0
        ),
      knownLeveledCount:
        countByLevel(
          knownIdsForLimits,
          (level) => level > 0
        ),
      preparedCount:
        preparedIds.length,
      alwaysPreparedCount:
        alwaysPreparedIds.length,
      mysticArcanumCount:
        mysticArcanumIds.length,
      knownIds,
      preparedIds,
      alwaysPreparedIds,
      mysticArcanumIds,
      magicalSecretIds
    };
  }

  function getPerClassSpellSelectionSummary(
    character
  ) {
    const spellcasting = {
      classes:
        getSpellcastingClassOptions(character)
    };
    const sourceStore =
      character?.magic?.classSources &&
      typeof character.magic.classSources === "object" &&
      !Array.isArray(character.magic.classSources)
        ? character.magic.classSources
        : {};

    return spellcasting.classes.map((entry) => {
      const sourceId =
        getSection16SourceKey(entry);
      const source =
        sourceStore[sourceId] || {};

      return {
        classEntryId: sourceId,
        classId: cleanString(entry.classId),
        className:
          cleanString(
            entry.className,
            entry.classId
          ),
        spellListClassId: cleanString(
          entry.spellListClassId || entry.classId
        ),
        spellcastingAbility: cleanString(
          entry.spellcastingAbility
        ),
        requiresSpellcastingAbility: true,
        preparationMode:
          getSection16PreparationMode(entry),
        maxSpellLevel: Math.max(
          0,
          safeNumber(entry.maxSpellLevel, 0)
        ),
        expandedSpellIds:
          getSection16ExpandedSpellGrants(entry)
            .map((grant) => grant.spellId),
        cantripIds:
          cleanArray(source.cantripIds),
        knownSpellIds: cleanArray(source.knownSpellIds).filter(
          (spellId) => !cleanArray(source.magicalSecretSpellIds).includes(spellId)
        ),
        magicalSecretSpellIds: cleanArray(source.magicalSecretSpellIds),
        preparedSpellIds:
          cleanArray(source.preparedSpellIds),
        spellbookSpellIds:
          cleanArray(
            source.spellbookSpellIds
          ),
        alwaysPreparedSpellIds:
          cleanArray(
            source.alwaysPreparedSpellIds
          ),
        mysticArcanumSpellIds:
          source.mysticArcanumSpellIds || {},
        mysticArcanumLevels:
          getSection16MysticArcanumLevels(entry),
        cantripsKnownLimit:
          Math.max(
            0,
            safeNumber(
              entry.cantripsKnown,
              0
            )
          ),
        spellsKnownLimit:
          Math.max(
            0,
            safeNumber(
              entry.spellsKnown,
              0
            )
          ),
        preparedLimit:
          entry.preparedLimit
      };
    });
  }

  function getSection17SpellChoiceValidation(
    character = creatorState.draft
  ) {
    return spellsStep.validateStep(
      character
    );
  }

  function getSpellcastingClassOptions(
    character
  ) {
    return getSpellcastingSummary(character)
      .classes
      .filter((entry) => {
        return (
          cleanString(
            entry.progressionType,
            "none"
          ) !== "none" ||
          safeNumber(
            entry.pactMagic?.slots,
            0
          ) > 0 ||
          safeNumber(
            entry.cantripsKnown,
            0
          ) > 0 ||
          safeNumber(
            entry.spellsKnown,
            0
          ) > 0
        );
      });
  }

  function getSpellSourceId(spell) {
    return cleanString(
      spell?.classEntryId ||
      spell?.spellcastingSourceId ||
      spell?.classId
    );
  }

  function getSpellSourceContexts(
    character,
    spell
  ) {
    const spellId = cleanString(spell?.id);
    const sourceId = getSpellSourceId(spell);
    const spellcasters =
      getSpellcastingClassOptions(character);
    const activeEntriesBySourceId =
      new Map(
        spellcasters.map((entry) => {
          return [
            getSection16SourceKey(entry),
            entry
          ];
        })
      );
    const contexts = [];
    const classSources =
      character?.magic?.classSources &&
      typeof character.magic.classSources === "object" &&
      !Array.isArray(character.magic.classSources)
        ? Object.values(
            character.magic.classSources
          )
        : [];

    classSources.forEach((source) => {
      const classEntryId = cleanString(
        source?.classEntryId
      );
      const entry =
        activeEntriesBySourceId.get(
          classEntryId
        );

      if (!entry || !spellId) {
        return;
      }

      const selectedSpellIds = [
        ...cleanArray(source?.cantripIds),
        ...cleanArray(source?.knownSpellIds),
        ...cleanArray(source?.preparedSpellIds),
        ...cleanArray(source?.spellbookSpellIds),
        ...cleanArray(
          source?.alwaysPreparedSpellIds
        ),
        ...Object.values(
          source?.mysticArcanumSpellIds ||
          {}
        )
      ];

      if (!selectedSpellIds.includes(spellId)) {
        return;
      }

      contexts.push({
        kind: "class",
        sourceId: classEntryId,
        sourceName:
          cleanString(
            entry.className,
            entry.classId
          ),
        spellcastingAbility:
          cleanString(
            entry.spellcastingAbility
          ),
        spellSaveDc:
          entry.spellSaveDc ?? null,
        spellAttackBonus:
          entry.spellAttackBonus ?? null,
        entry
      });
    });

    const featSources =
      character?.magic?.featSources &&
      typeof character.magic.featSources === "object" &&
      !Array.isArray(character.magic.featSources)
        ? Object.entries(
            character.magic.featSources
          )
        : [];

    featSources.forEach(([featSourceId, source]) => {
      const grantSpellIds =
        (
          Array.isArray(source?.grants)
            ? source.grants
            : []
        )
          .map((grant) => {
            return getSection16SpellReferenceId(
              grant
            );
          })
          .filter(Boolean);
      const selectedSpellIds =
        uniqueCleanArray([
          ...cleanArray(source?.spellIds),
          ...grantSpellIds
        ]);

      if (
        spellId &&
        selectedSpellIds.includes(spellId)
      ) {
        const spellRecord =
          (
            Array.isArray(
              source?.spellRecords
            )
              ? source.spellRecords
              : []
          ).find((record) => {
            return (
              cleanString(
                record?.spellId
              ) === spellId
            );
          });

        contexts.push({
          kind: "feat",
          sourceId: cleanString(
            featSourceId
          ),
          sourceName:
            cleanString(
              source?.featName,
              source?.featId ||
              "Feat"
            ),
          spellcastingAbility:
            cleanString(
              spellRecord
                ?.spellcastingAbility ||
              source?.spellcastingAbility
            ),
          spellSaveDc: null,
          spellAttackBonus: null,
          entry: null
        });
      }
    });

    if (
      !contexts.length &&
      sourceId
    ) {
      const entry =
        spellcasters.find((candidate) => {
          return (
            getSection16SourceKey(
              candidate
            ) === sourceId ||
            cleanString(
              candidate.classId
            ) === sourceId
          );
        });

      if (entry) {
        contexts.push({
          kind: "class",
          sourceId:
            getSection16SourceKey(entry),
          sourceName:
            cleanString(
              entry.className,
              entry.classId
            ),
          spellcastingAbility:
            cleanString(
              entry.spellcastingAbility
            ),
          spellSaveDc:
            entry.spellSaveDc ?? null,
          spellAttackBonus:
            entry.spellAttackBonus ?? null,
          entry
        });
      } else {
        const featSource =
          featSources.find(
            ([featSourceId, source]) => {
              return (
                cleanString(featSourceId) ===
                  sourceId ||
                cleanString(source?.featId) ===
                  sourceId
              );
            }
          );

        if (featSource) {
          contexts.push({
            kind: "feat",
            sourceId:
              cleanString(featSource[0]),
            sourceName:
              cleanString(
                featSource[1]?.featName,
                featSource[1]?.featId ||
                "Feat"
              ),
            spellcastingAbility:
              cleanString(
                featSource[1]
                  ?.spellcastingAbility
              ),
            spellSaveDc: null,
            spellAttackBonus: null,
            entry: null
          });
        }
      }
    }

    return contexts.filter(
      (context, index, values) => {
        return (
          values.findIndex((candidate) => {
            return (
              candidate.kind ===
                context.kind &&
              candidate.sourceId ===
                context.sourceId
            );
          }) === index
        );
      }
    );
  }

  function getSpellcastingEntryForSpell(
    character,
    spell
  ) {
    const spellcasters =
      getSpellcastingClassOptions(
        character
      );

    const sourceId =
      getSpellSourceId(spell);

    const storedSourceEntry =
      getSpellSourceContexts(
        character,
        spell
      ).find((context) => {
        return (
          context.kind === "class" &&
          Boolean(context.entry)
        );
      })?.entry;

    if (storedSourceEntry) {
      return storedSourceEntry;
    }

    if (!sourceId) {
      return spellcasters.length === 1
        ? spellcasters[0]
        : null;
    }

    return (
      spellcasters.find((entry) => {
        return (
          cleanString(entry.classEntryId) ===
            sourceId ||
          cleanString(entry.classId) ===
          sourceId
        );
      }) ||
      null
    );
  }

  function getSpellSourceWarning(
    character,
    spell
  ) {
    if (
      spell?.innate === true ||
      cleanString(spell?.innateSource) ||
      cleanString(spell?.source)
        .startsWith("species:") ||
      cleanString(spell?.source)
        .startsWith("species-choice:")
    ) {
      return "";
    }

    const spellcasters =
      getSpellcastingClassOptions(
        character
      );
    const sourceContexts =
      getSpellSourceContexts(
        character,
        spell
      );
    const featSource =
      sourceContexts.find((context) => {
        return context.kind === "feat";
      });

    if (featSource) {
      return "";
    }

    if (!spellcasters.length) {
      return "";
    }

    const sourceId =
      getSpellSourceId(spell);

    if (
      !sourceId &&
      !sourceContexts.some((context) => {
        return context.kind === "class";
      })
    ) {
      return `${spell?.name || "A spell"} needs a class source.`;
    }

    const entry =
      getSpellcastingEntryForSpell(
        character,
        spell
      );

    if (!entry) {
      return `${spell?.name || "A spell"} has an invalid class source.`;
    }

    const spellLevel =
      safeNumber(spell?.level, 0);

    const spellClassIds = cleanArray(
      spell?.classes
    ).map((classId) => {
      return makeSafeId(classId, "class");
    });

    const sourceListClassId =
      makeSafeId(
        entry.spellListClassId ||
        entry.classId,
        "class"
      );

    const expandedGrant =
      getSection16ExpandedSpellGrant(
        entry,
        spell
      );

    if (
      spellClassIds.length &&
      !spellClassIds.includes(
        sourceListClassId
      ) &&
      !expandedGrant &&
      spell?.manualOverride !== true
    ) {
      return `${spell?.name || "A spell"} is not available from ${entry.className || "its class"}'s spell list.`;
    }

    const isMysticArcanum =
      isSection16MysticArcanumSpell(
        entry,
        spell
      );

    if (
      spellLevel > 0 &&
      spellLevel >
        safeNumber(entry.maxSpellLevel, 0) &&
      !isMysticArcanum &&
      spell?.manualOverride !== true
    ) {
      return `${spell?.name || "A spell"} is above ${entry.className || "its class"}'s available spell level.`;
    }

    return "";
  }

  function getSpellSlotCastingOptions(
    character,
    spell,
    sourceId = ""
  ) {
    const summary =
      getSpellcastingSummary(character);
    const spellLevel = Math.max(
      0,
      safeNumber(spell?.level, 0)
    );
    const sourceEntry =
      (
        sourceId
          ? summary.classes.find((entry) => {
              return (
                getSection16SourceKey(entry) ===
                  sourceId ||
                cleanString(entry.classId) ===
                  sourceId
              );
            })
          : null
      ) ||
      getSpellcastingEntryForSpell(
        character,
        spell
      );

    if (
      spellLevel < 1 ||
      !sourceEntry ||
      spellLevel >
        safeNumber(
          sourceEntry.maxSpellLevel,
          0
        )
    ) {
      return {
        canCast: false,
        baseSpellLevel: spellLevel,
        sourceClassMaxSpellLevel:
          sourceEntry
            ? safeNumber(
                sourceEntry.maxSpellLevel,
                0
              )
            : null,
        normalSlotLevels: [],
        pactMagic: [],
        canUpcast: false
      };
    }

    const normalSlotLevels =
      Object.entries(
        summary.multiclass?.spellSlots || {}
      )
        .filter(([level, slots]) => {
          return (
            safeNumber(level, 0) >=
              spellLevel &&
            safeNumber(slots, 0) > 0
          );
        })
        .map(([level]) => {
          return safeNumber(level, 0);
        });
    const pactMagic =
      (
        summary.multiclass?.pactMagic ||
        []
      ).filter((source) => {
        return (
          safeNumber(
            source?.slots,
            0
          ) > 0 &&
          safeNumber(
            source?.slotLevel,
            0
          ) >= spellLevel
        );
      });

    return {
      canCast:
        summary.castingBlocked !== true &&
        (
          normalSlotLevels.length > 0 ||
          pactMagic.length > 0
        ),
      baseSpellLevel: spellLevel,
      sourceClassMaxSpellLevel:
        safeNumber(
          sourceEntry.maxSpellLevel,
          0
        ),
      normalSlotLevels,
      pactMagic:
        cloneData(pactMagic),
      canUpcast:
        normalSlotLevels.some((level) => {
          return level > spellLevel;
        }) ||
        pactMagic.some((source) => {
          return (
            safeNumber(
              source.slotLevel,
              0
            ) > spellLevel
          );
        })
    };
  }

  function isCharacterNonSpellcaster(
    character
  ) {
    const spellcasting =
      getSpellcastingSummary(character);

    const classes =
      Array.isArray(spellcasting.classes)
        ? spellcasting.classes
        : [];

    if (!classes.length) {
      return false;
    }

    return classes.every((entry) => {
      return (
        cleanString(
          entry.progressionType,
          "none"
        ) === "none" &&
        safeNumber(
          entry.pactMagic?.slots,
          0
        ) === 0 &&
        safeNumber(
          entry.cantripsKnown,
          0
        ) === 0 &&
        safeNumber(
          entry.spellsKnown,
          0
        ) === 0
      );
    });
  }

  function createSrdFeature(
    classId,
    level,
    name
  ) {
    return {
      id: `${classId}-${makeSafeId(name, "feature")}-${level}`,
      name,
      level,
      summary:
        `${name} is part of the SRD 5.1 ${classId} progression at level ${level}.`
    };
  }

  function createSrdFeatureLevels({
    classId,
    featuresByLevel = {},
    asiLevels = SRD_2014_STANDARD_ASI_LEVELS,
    progressionType = "none",
    cantripsKnown = {},
    spellsKnown = {}
  }) {
    const levels = {};

    for (let level = 1; level <= 20; level += 1) {
      const featureDefinitions = [
        ...(featuresByLevel[level] || [])
      ];

      if (
        asiLevels.includes(level) &&
        !featureDefinitions.some((feature) => {
          return (
            typeof feature === "string"
              ? feature
              : feature?.name
          ) === "Ability Score Improvement";
        })
      ) {
        featureDefinitions.push(
          "Ability Score Improvement"
        );
      }

      levels[level] = {
        proficiencyBonus:
          getGenericProficiencyBonus(level),
        features:
          featureDefinitions.map((feature) => {
            if (typeof feature === "string") {
              return createSrdFeature(
                classId,
                level,
                feature
              );
            }

            const name = cleanString(
              feature?.name,
              "Unnamed Feature"
            );

            return {
              ...cloneData(feature),
              id: makeSafeId(
                feature?.id ||
                `${classId}-${name}`,
                "class-feature"
              ),
              name,
              level,
              type: cleanString(
                feature?.type,
                "feature"
              ),
              summary: cleanString(
                feature?.summary ||
                feature?.description,
                `${name} is gained at level ${level}.`
              )
            };
          })
      };

      const slots =
        getSrd2014SpellSlots(
          progressionType,
          level
        );

      if (Object.keys(slots).length) {
        levels[level].spellSlots = slots;
      }

      if (progressionType === "pact-magic") {
        levels[level].pactMagic =
          getSrd2014PactMagic(level);
      }

      const cantripCount =
        getProgressionValueByLevel(
          cantripsKnown,
          level,
          null
        );

      if (cantripCount !== null) {
        levels[level].cantripsKnown =
          cantripCount;
      }

      const spellsKnownCount =
        getProgressionValueByLevel(
          spellsKnown,
          level,
          null
        );

      if (spellsKnownCount !== null) {
        levels[level].spellsKnown =
          spellsKnownCount;
      }
    }

    return levels;
  }

  function createSrdSubclass({
    id,
    name,
    summary,
    featuresByLevel = {}
  }) {
    return {
      id,
      name,
      source: "template",
      summary,
      levels:
        createSrdFeatureLevels({
          classId: id,
          featuresByLevel,
          asiLevels: [],
          progressionType: "none"
        })
    };
  }

  function createSrdClassTemplate(config) {
    return {
      schemaVersion: CLASS_SCHEMA_VERSION,
      source: "template",
      spellcastingProgression:
        config.progressionType || "none",
      spellcastingAbility:
        config.spellcastingAbility || "",
      spellPreparation:
        config.spellPreparation || "none",
      cantripsKnown:
        cloneData(config.cantripsKnown || {}),
      spellsKnown:
        cloneData(config.spellsKnown || {}),
      ...config,
      levels:
        createSrdFeatureLevels({
          classId: config.id,
          featuresByLevel:
            config.featuresByLevel || {},
          asiLevels:
            config.asiLevels ||
            SRD_2014_STANDARD_ASI_LEVELS,
          progressionType:
            config.progressionType || "none",
          cantripsKnown:
            config.cantripsKnown || {},
          spellsKnown:
            config.spellsKnown || {}
        }),
      subclasses:
        Array.isArray(config.subclasses)
          ? config.subclasses
        : []
    };
  }

  function createDefaultClassTemplate(classData) {
    const raw = classData || {};

    return createSrdClassTemplate({
      ...getLegacy2014Metadata("class", raw.id, raw),
      id: raw.id,
      name: raw.name,
      summary:
        raw.summary ||
        `${raw.name || "This class"} progression and proficiencies.`,
      hitDie: `d${safeNumber(raw.hitDie, 8)}`,
      primaryAbilities: cloneData(
        raw.primaryAbility || []
      ),
      savingThrows: cloneData(
        raw.savingThrows || []
      ),
      armorProficiencies: cloneData(
        raw.armorProficiencies || []
      ),
      weaponProficiencies: cloneData(
        raw.weaponProficiencies || []
      ),
      toolProficiencies: cloneData(
        raw.toolProficiencies || []
      ),
      skillChoices: cloneData(
        raw.skillChoices || {}
      ),
      multiclassPrerequisites: cloneData(
        raw.multiclassPrerequisites || {
          all: [],
          any: []
        }
      ),
      multiclassProficiencies: cloneData(
        raw.multiclassProficiencies || {}
      ),
      subclassLevel: safeNumber(
        raw.subclassLevel,
        3
      ),
      progressionType:
        raw.progressionType || "none",
      spellcastingAbility:
        raw.spellcastingAbility || "",
      spellPreparation:
        raw.spellPreparation || "none",
      cantripsKnown: cloneData(
        raw.cantripsKnown || {}
      ),
      spellsKnown: cloneData(
        raw.spellsKnown || {}
      ),
      preparedSpellsFormula: cloneData(
        raw.preparedSpellsFormula || null
      ),
      infusionsKnownByLevel: cloneData(
        raw.infusionsKnownByLevel || {}
      ),
      infusedItemsByLevel: cloneData(
        raw.infusedItemsByLevel || {}
      ),
      infusions: cloneData(
        raw.infusions || []
      ),
      featuresByLevel: cloneData(
        raw.featuresByLevel || {}
      ),
      asiLevels: cloneData(
        raw.asiLevels || []
      ),
      subclasses: cloneData(
        raw.subclasses || []
      )
    });
  }

  function runSrd2014RulesSelfTests() {
    return runCharacterCreatorSelfTests({
      $, ABILITY_DEFINITIONS, ABILITY_SCORE_METHODS, ACTIVE_RULESET, ADDITIONAL_CANTRIP_COUNT_2014, ADDITIONAL_CANTRIP_EXPECTATIONS_2014,
      ADDITIONAL_CANTRIP_IDS_2014, ARTISAN_TOOL_OPTIONS, BACKGROUND_SCHEMA_VERSION, BUILDER_STEPS, BUILDER_STEP_INDEX, BUILTIN_BACKGROUND_2014_EXPECTATIONS,
      BUILTIN_BACKGROUND_IDS_2014, BUILTIN_SPECIES_2014_EXPECTATIONS, BUILTIN_SPECIES_IDS_2014, BUILTIN_SUBRACE_2014_EXPECTATIONS, C, CHARACTER_BUSY_ACTIONS,
      CHARACTER_SAVE_BUSY_ACTIONS, CHARACTER_SCHEMA_VERSION, CLASS_SCHEMA_VERSION, CURRENCY_DENOMINATIONS, DARK_ELF_INNATE_SPELLS_2014, DEFAULT_BACKGROUND_EQUIPMENT_PACKAGES,
      DEFAULT_BACKGROUND_TEMPLATES, DEFAULT_CLASSES, DEFAULT_CLASS_SCHEMA_VERSION, DEFAULT_CLASS_TEMPLATES, DEFAULT_EQUIPMENT_CATALOG, DEFAULT_FEATS,
      DEFAULT_FEAT_ABILITY_SCORE_MAXIMUM, DEFAULT_FIGHTING_STYLE_EFFECTS, DEFAULT_INVOCATION_DETAILS, DEFAULT_MANEUVER_DETAILS, DEFAULT_METAMAGIC_DETAILS, DEFAULT_SPECIES_TEMPLATES,
      DEFAULT_SPELLS, DEFAULT_SUBCLASSES, DRAFT_AUTOSAVE_DEBOUNCE_MS, DWARF_TOOL_CHOICES, FEAT_CHOICE_VALUE_PREFIX, FEAT_FEATURE_OPTIONS,
      FEAT_TOOL_OPTIONS, FEAT_WEAPON_OPTIONS, FOREST_GNOME_INNATE_SPELLS_2014, GAMING_SET_OPTIONS, GENERAL_TOOL_OPTIONS, MULTICLASS_PREREQUISITES,
      MULTICLASS_PROFICIENCY_GRANTS, MUSICAL_INSTRUMENT_OPTIONS, POST_CAP_ABILITY_SOURCE_PREFIXES, RAW_DEFAULT_BACKGROUND_TEMPLATES, RAW_DEFAULT_SPECIES_TEMPLATES, SECTION11_DRAGONBORN_ANCESTRIES,
      SECTION11_EMBEDDED_PORTRAIT_MAX_BYTES, SECTION11_UPLOADED_PORTRAIT_MAX_BYTES, SECTION12_CLASS_FEATURE_SAVE_ABILITIES, SECTION13_POINT_BUY_COSTS, SECTION16_SPELL_REFERENCE_ALIASES, SKILL_DEFINITIONS,
      SPECIES_SCHEMA_VERSION, SRD_2014_FIGHTER_ASI_LEVELS, SRD_2014_FULL_CASTER_SLOTS, SRD_2014_PACT_MAGIC, SRD_2014_ROGUE_ASI_LEVELS, SRD_2014_SIZE_CARRY_MULTIPLIERS,
      SRD_2014_STANDARD_ASI_LEVELS, SRD_SPELL_COUNT_2014, STANDARD_LANGUAGE_OPTIONS, TIEFLING_INNATE_SPELLS_2014, UNARMORED_DEFENSE_CLASS_RULES, W,
      WIZARD_CANTRIP_CHOICES_2014, addCappedNormalAbilityIncrease, addCharacterLevelToClass, addCurrencyMaps, addLegacyImportWarning, addMigrationWarning,
      addMulticlassClass, addSection11SkillProficiencies, addSection14BackgroundCurrency, addSection14BackgroundFeature, addSection15CatalogItem, addSection15CustomItem,
      addSection16CustomFeature, addSection16CustomSpell, addSpeciesTrait, adjustMulticlassClassLevel, adjustSection12AsiAbility, adjustSection12SpellSlotUsage,
      adjustSection16HitDieUsage, adjustSelectedClassResource, adjustSelectedFeatResource, applyClassProgressionProficiencies, applyCompatibilityAliases, applyCustomSpecies,
      applyInitialRoute, applySection11MechanicBlock, applySection11SpeciesChoiceMechanics, applySection11SpeciesChoices, applySection11SpeciesMechanics, applySection12ClassDefaults,
      applySection12CustomClass, applySection12CustomSubclass, applySection13PointBuyDefaults, applySection13RolledScores, applySection13Scores, applySection13StandardArray,
      applySection13SuggestedHp, applySection14BackgroundChoices, applySection14BackgroundPackage, applySection14CustomBackground, applySection14ProficiencyLists, applySelectedClassFeatureMechanics,
      applySelectedFeatMechanics, applyStoredClassSkillProficiencies, assertCharacterMutationAccess, assignSection13StandardScore, auditLegacyImportedCharacter, backfillBackgroundCurrencySources,
      beginCharacterBusyAction, beginnerNote, blockCharacterBusyAction, blockMulticlassEdit, blockSection18Finalization, bootSection20WhenReady,
      calculateAbilityModifier, calculateAbilityModifiers, calculateArmorClassOptions, calculateCharacterHitDice, calculateCharacterHp, calculateCharacterInitiative,
      calculateCharacterPassiveScores, calculateCharacterRolledHp, calculateCharacterSavingThrows, calculateCharacterSkillModifier, calculateClassProgressionTotalLevel, calculateContainerContentWeight,
      calculateEquippedWeaponAttacks, calculateInventoryWeightSummary, calculateRuleCarryingCapacity, calculateRuleFixedAverageHp, calculateRuleManualHp, calculateRulePassiveScore,
      calculateRuleRolledHp, calculateRuleSavingThrowModifier, calculateRuleSkillModifier, calculateRuleSpellAttackBonus, calculateRuleSpellSaveDc, calculateSection13SuggestedHp,
      calculateSection16SpellcastingValues, calculateSelectedFeatNumericEffect, calculateSrd2014MulticlassSpellcasting, calculateWeaponAttack, changeSection13PointBuyScore, changeSection15Quantity,
      characterCreatorActions, characterCreatorChangeHandlers, characterCreatorInputHandlers, characterHasClass, characterLibraryRenderer, characterSheetView,
      characterStepCompletionChecks, characterStepRenderers, chooseSection11Subrace, chooseSection12Class, chooseSection12Subclass, chooseSection14Background,
      chooseSpeciesFromTemplate, chooseStoredDraftRecord, clampLevel, clampStepIndex, cleanArray, cleanImportSourceLabel,
      cleanString, cleanupDuplicateNonRepeatableAdvancementFeats, cleanupSection11PreviousPortrait, cleanupSection19PermanentListeners, cleanupSection20CharacterCreator, clearPendingDraftPersistence,
      clearSection11Portrait, clearSection11SpeciesMechanics, clearSection12Subclass, clearStoredDraft, cloneData, collectMalformedSourceValues,
      collectSection12Features, collectSection12FeaturesForClassEntry, confirmDiscardUnsavedDraft, connectDraftPersistenceLifecycle, connectPopstateRouting, connectSection19Backgrounds,
      connectSection19Characters, connectSection19Classes, connectSection19Listener, connectSection19PermanentListeners, connectSection19Species, connectWizardEvents,
      copySection18Json, countSection14BackgroundSourceList, countSection14SkillSource, countSection14ValidBackgroundToolChoices, countSection14ValidSkillSource, countValidClassEntrySkillChoices,
      createAbilityMap, createCharacterLibraryCard, createCharacterPayload, createCharacterSheetView, createClassEntryId, createClassProgressionEntry,
      createDefaultClassTemplate, createDraftStorageRecord, createEmptyCharacter, createNormalAbilityCapScoreMap, createSection11PortraitFromFile, createSection13HpRollRecord,
      createSrdClassTemplate, createSrdFeature, createSrdFeatureLevels, createSrdSubclass, creatorState, debugSection12MulticlassAdd,
      decodeFeatChoiceValue, deleteSection18Character, deps, deriveAbilityBaseFromFinalScores, disconnectDraftPersistenceLifecycle, disconnectSection20Routing,
      disconnectWizardEvents, draftPersistenceRuntime, duplicateCharacterFromLibrary, duplicateIntoDraft, encodeFeatChoiceValue, endCharacterBusyAction,
      enforceClassProgressionLevelCap, enrichBuiltinBackgroundTemplate, enrichBuiltinSpeciesTemplate, ensureAbilityBonusSources, ensureClassProgressionEntryData, ensureEquipmentCurrencySources,
      ensureProficiencySources, ensureWizardShell, ensureWizardStyles, escapeHtml, evaluateSection12ClassLevelFormula, evaluateSection12ClassResourceMaximum,
      expandSection14ToolChoice, exportSection18Json, filterRepeatedFeatChoiceOptions, findCachedCharacter, findClassEntryForLevelOrderKey, findDefaultClassDefinition,
      findHpRollRawRecordForLevel, findSection11ActionElement, findSection12ActionElement, findSection13ActionElement, findSection14ActionElement, findSection15ActionElement,
      findSection16ActionElement, flushPendingDraftPersistence, formatClassEntryHitDie, formatClassEntryProficiencySummary, formatDefaultSpellLevelLabel, formatMulticlassPrerequisiteFailure,
      formatMulticlassRequirementItem, formatMulticlassStoredChoiceKey, formatMulticlassStoredChoiceValue, formatSection11PortraitBytes, formatSection12ClassChoiceValues, formatSection12FeatEffect,
      formatSection12List, formatSection12Recharge, formatSection13HpRolls, formatSection14CurrencySummary, formatSection14List, formatSection16ProgressionLabel,
      formatSection16SpellComponents, formatSection16SpellResolution, formatSection16SpellScaling, formatSection17ClassEntryLabel, formatSection17ClassLevelSummary, formatSection17Modifier,
      formatSection18SavedTime, formatSelectedClassMechanicEffect, formatSignedNumber, friendlyServiceError, getAbilityBonusTotalsFromSources, getAbilityDefinition,
      getAbilityScore, getAllClassTemplates, getAllSection14Backgrounds, getAllSpeciesTemplates, getBackgroundSourceLabel, getBrowserStorage,
      getCharacterBusyLabel, getCharacterClassEntries, getCharacterLevelHitDieRecords, getCharacterLibraryClassName, getCharacterLibraryDisplayName, getCharacterLibraryImageUrl,
      getCharacterLibraryLevel, getCharacterLibrarySpeciesName, getCharacterProficiencyBonus, getCharacterSkillEntry, getCharacterSnapshot, getCharacterSpellcastingInfo,
      getClassAsiLevels, getClassEntryAtIndex, getClassEntryLevel, getClassEntrySkillChoiceConfig, getClassEntryStoredSkillIds, getClassEntryStoredToolChoices,
      getClassEntrySubclassTemplate, getClassEntryToolChoiceConfig, getClassEntryToolChoiceOptions, getClassIndexForLevelRecord, getClassLevelOrderEntryKey, getClassProgressionEntries,
      getClassProgressionEntryKey, getClassProgressionPendingChoiceWarnings, getClassSourceLabel, getContainerContents, getContainerSummaries, getCurrencySourceTotals,
      getDefaultClassFeaturesThroughLevel, getDefaultLevelUpClassIndex, getDraftStorageKey, getDraftStorageTargets, getExactBuilderStepById, getFeatAbilityEffectMaximum,
      getFeatPrerequisiteLabel, getFeatPrerequisiteResult, getFeatSpellcastingValidationWarnings, getGenericProficiencyBonus, getHitDieSize, getHpRollRawRecords,
      getInventoryItemKnownWeight, getLatestLevelUpContext, getLegacy2014Metadata, getManualCurrencyBalance, getManualProficiencyList, getMulticlassClassId,
      getMulticlassPendingSkillChoiceWarnings, getMulticlassPendingToolChoiceWarnings, getMulticlassPrerequisiteRequirements, getMulticlassPrerequisiteResultForClass, getMulticlassPrerequisiteResults, getMulticlassProficiencyRule,
      getMulticlassRequirementLabel, getMulticlassSummaryEntries, getNormalAbilityScoreForCap, getPendingClassFeatureChoiceWarnings, getPerClassSpellSelectionSummary, getPersistentDraftStorageKey,
      getPreparedSpellLimit, getPrimaryClassEntry, getProgressionValueByLevel, getRoomCode, getRouteFromUrl, getSafeBackgroundName,
      getSafeCharacterName, getSafeClassName, getSafeSpeciesName, getSafeSubclassName, getSection11ChoiceSource, getSection11DragonbornAncestry,
      getSection11HalfElfAbilityChoices, getSection11LanguageChoices, getSection11Portrait, getSection11SelectedSpeciesTemplate, getSection11SelectedSubrace, getSection11SkillChoices,
      getSection12ArtificerInfusionContext, getSection12ArtificerInfusionState, getSection12AsiChoiceState, getSection12AsiFeature, getSection12CanonicalResourceId, getSection12ClassFeatureSaveDc,
      getSection12ClassFeaturesThroughLevel, getSection12CustomClassSkillNames, getSection12DivineSmiteSlotOptions, getSection12FeatChoiceLimit, getSection12FeatChoiceOptions, getSection12FeatureChoiceKey,
      getSection12FeatureChoiceOptionRecords, getSection12FeatureChoiceOptions, getSection12FeatureChooseCount, getSection12FeatureMechanicLines, getSection12FeatureStoredChoices, getSection12FutureClassFeatures,
      getSection12InfusionTargetOptions, getSection12LevelData, getSection12MulticlassAddStatus, getSection12PrimaryClass, getSection12SkillPickerChoices, getSection12SpellSlotUsageState,
      getSection12SubclassTemplates, getSection12UnlockedAsiSlot, getSection13AbilityBonus, getSection13AbilityName, getSection13AbilityScore, getSection13BaseAbilityScore,
      getSection13HitDieSize, getSection13HpRollState, getSection13PointBuySpent, getSection14AllExactToolOptions, getSection14BackgroundChoiceList, getSection14BackgroundCurrencyGrant,
      getSection14BackgroundLanguageOptions, getSection14BackgroundPackages, getSection14BackgroundRemovalSummary, getSection14BackgroundSourceValues, getSection14BackgroundToolOptions, getSection14BackgroundToolOptionsForIndex,
      getSection14SkillChoiceList, getSection14SkillEntry, getSection14SkillModifier, getSection14SkillSourceLabel, getSection15ActionIndex, getSection15AttunedItemCount,
      getSection15Catalog, getSection15Inventory, getSection15InventoryCount, getSection15TotalWeight, getSection15UnknownWeightCount, getSection16ClassSourceStore,
      getSection16CustomFeatures, getSection16CustomSpells, getSection16EligibleSpellcasters, getSection16EntryForSource, getSection16ExpandedSpellGrant, getSection16ExpandedSpellGrants,
      getSection16HitDieKey, getSection16InnateSpells, getSection16KnownLimitWarning, getSection16KnownSpellIds, getSection16MysticArcanumLevels, getSection16PreparationMode,
      getSection16PreparedLimitWarning, getSection16PreparedSpellIds, getSection16SelectedFeats, getSection16SourceKey, getSection16SourceState, getSection16SpellById,
      getSection16SpellReferenceId, getSection17AbilityName, getSection17CarryingCapacity, getSection17CharacterSheetView, getSection17ClassProgressionEntries, getSection17CompletedStepIds,
      getSection17FeatureCount, getSection17FinalizationValidation, getSection17Initiative, getSection17InventoryWeight, getSection17MigrationWarnings, getSection17PassivePerception,
      getSection17ProficiencyBonus, getSection17SkillEntry, getSection17SkillModifier, getSection17SpellCount, getSection17Warnings, getSection18CharacterCollection,
      getSection18CharacterCollectionName, getSection18CharacterDocument, getSection18CharacterPortraitUrl, getSection18DocumentSnapshotData, getSection18JsonText, getSection18MutationIdentity,
      getSection18RecordRevisionMillis, getSection18RecordRoomCode, getSection18RecordType, getSection18TimestampMillis, getSection19CollectionName, getSection19RoomCollection,
      getSelectedClassTemplate, getSelectedDefaultFeatInstances, getSelectedSection12Subclass, getSelectedSection14Background, getSkillDefinitionByIdOrName, getSpeciesHpBonus,
      getSpeciesSourceLabel, getSpellSelectionLimits, getSpellSlotCastingOptions, getSpellSourceContexts, getSpellSourceId, getSpellSourceWarning,
      getSpellcastingClassOptions, getSpellcastingEntryForSpell, getSpellcastingFocusClassIds, getSpellcastingFocusSummary, getSpellcastingSummary, getSrd2014PactMagic,
      getSrd2014SpellSlots, getStartingClassEntry, getStepById, getStepIndex, getStoredSources, getSubraceSourceLabel,
      getUnlockedFeatChoiceSlots, getValidClassEntrySkillIds, getValidClassEntryToolChoices, getValidatedSection18CharacterDocument, getValidationWarnings, handleAddSpeciesTraitAction,
      handleApplySpeciesChoicesAction, handleBrowserRouteChange, handleChooseSpeciesAction, handleChooseSubraceAction, handleDraftBeforeUnload, handleRemoveSpeciesTraitAction,
      handleSection11PortraitChange, handleSection11RemovePortrait, handleSection11SetPortraitUrl, handleSection12AddCharacterLevel, handleSection12AddMulticlassClass, handleSection12AdjustMulticlassLevel,
      handleSection12ArtificerInfusion, handleSection12ArtificerInfusionTargetChange, handleSection12AsiAction, handleSection12AsiChange, handleSection12ChooseAsiFeat, handleSection12ChooseClass,
      handleSection12ChooseSubclass, handleSection12ClassFeatureChoice, handleSection12ClassFeatureSelectChange, handleSection12ClearSubclass, handleSection12CustomClass, handleSection12CustomClassSkillPicker,
      handleSection12CustomSubclass, handleSection12FeatSearch, handleSection12MoveCharacterLevelOrder, handleSection12MoveMulticlassClass, handleSection12MulticlassChange, handleSection12RemoveLastCharacterLevel,
      handleSection12RemoveMulticlassClass, handleSection12ToggleMulticlassSkill, handleSection12ToggleMulticlassTool, handleSection13ApplyRolls, handleSection13CalculateHp, handleSection13Change,
      handleSection13PointBuy, handleSection13RefreshLevel, handleSection13ResetPointBuy, handleSection13ResetStandardArray, handleSection13RollScores, handleSection14AddFeature,
      handleSection14ApplyBackgroundChoices, handleSection14ApplyBackgroundPackage, handleSection14ApplyLists, handleSection14ChooseBackground, handleSection14CustomBackground, handleSection14OldBackgroundEquipment,
      handleSection14RemoveFeature, handleSection14SkipBackground, handleSection14ToggleExpertise, handleSection14ToggleSkill, handleSection15AddCatalogItem, handleSection15AddCustomItem,
      handleSection15Change, handleSection15ChangeQuantity, handleSection15CloseContainer, handleSection15MoveItemOut, handleSection15OpenContainer, handleSection15RemoveItem,
      handleSection15ResolveContainerRemoval, handleSection15SkipEquipment, handleSection15ToggleContainedItems, handleSection15ToggleState, handleSection16AddFeature, handleSection16AddSpell,
      handleSection16CalculateSpellcasting, handleSection16DefaultSpellSearch, handleSection16RemoveFeature, handleSection16SpellAction, handleSection16SpellSourceChange, handleSection16ToggleFeat,
      handleSection17AdjustClassResource, handleSection17AdjustDivineSmiteSlot, handleSection17AdjustFeatResource, handleSection17OpenCharacterSheet, handleSection17RefreshReview, handleSection17ToggleRageState,
      handleSection18Change, handleSection18CopyJson, handleSection18CreateLinkedToken, handleSection18Delete, handleSection18DownloadDraftBackup, handleSection18ExportJson,
      handleSection18Finalize, handleSection18ImportFile, handleSection18ImportText, handleSection18Save, handleSection18SaveCopy, handleUseCustomSpeciesAction,
      handleWizardChange, handleWizardClick, handleWizardImport, handleWizardInput, hasAbilityMapValues, hasCurrencyValue,
      hasFirestoreTools, hasMalformedSourceValue, hasSection11PortraitUploadHook, hasSection14BackgroundCurrency, hasSection18FirestoreReadTool, hpRollRawHasAssociation,
      hpRollRawMatchesLevel, importSection18File, importSection18JsonText, isActiveRulesetEntry, isAsiOrFeatChoiceFeature, isCharacterBusyAction,
      isCharacterCreatorBusy, isCharacterCreatorRoute, isCharacterNonSpellcaster, isDraftStorageQuotaError, isMulticlassDraft, isMulticlassRequirementMet,
      isPlainObject, isSavingThrowProficient, isSection11AbilityChoiceValid, isSection11LanguageChoiceValid, isSection11PortraitFile, isSection11PortraitUrlAllowed,
      isSection11SkillChoiceValid, isSection16MysticArcanumSpell, isSection16SpellKnown, isSection16SpellPrepared, isSection17AbilitiesComplete, isSection17BackgroundComplete,
      isSection17BasicsComplete, isSection17ClassComplete, isSection17EquipmentComplete, isSection17LevelComplete, isSection17OptionalFinalizationWarning, isSection17ReviewComplete,
      isSection17SkillsComplete, isSection17SpeciesComplete, isSection17SpellsComplete, isSection17SubclassComplete, isSection18CharacterRecordData, isSection18SaveComplete,
      isStartingClassEntry, isStepComplete, isWeaponProficient, makeSafeFileName, makeSafeId, markCharacterBuilderAsDraft,
      markDraftChanged, migrateClassEntryAdvancementData, migrateSection16LegacySpellSelections, moveCharacterLevelOrder, moveMulticlassClass, moveSection15ItemToContainer,
      navigateByStepOffset, navigateToLibrary, navigateToStep, normalizeAbilityMap, normalizeAdvancementChoices, normalizeCharacter,
      normalizeCharacterImageValue, normalizeClassChoiceMap, normalizeClassEntryHitDie, normalizeClassLevelOrder, normalizeClassTemplate, normalizeCurrencyMap,
      normalizeCurrencySourceMap, normalizeFeatChoiceSelections, normalizeFeatIds, normalizeHpCalculation, normalizeHpRollRecordsForCharacter, normalizeImportSourceList,
      normalizeSection12Subclass, normalizeSection14Background, normalizeSection15Item, normalizeSection16Feature, normalizeSection16Spell, normalizeSection19BackgroundRecord,
      normalizeSection19CharacterRecord, normalizeSection19ClassRecord, normalizeSection19SpeciesRecord, openCharacterFromLibrary, parseFeatChoiceSelections, parseSection12List,
      parseSection13HpRolls, parseSection14List, parseSection15ItemEditValue, parseSection18ImportedCharacter, performSection16Rest, persistDraftToSession,
      prepareSection18Character, pruneAbandonedClassFeatureChoices, pruneRemovedClassSpellSources, readDraftStorageRecord, readSection11PortraitFileAsDataUrl, readSection19SnapshotRecords,
      recalculateAbilityTotals, recalculateClassTotalLevel, recordRawEquipmentMigrationWarnings, refreshBuilderChrome, refreshClassProgressionDerivedValues, refreshElements,
      refreshLoadedClassDerivedValues, refreshSection13AbilitySummary, refreshSection13LevelProgression, refreshSection20CharacterCreator, refreshSelectedClassFeatures, refreshWizardElements,
      registerCharacterCreatorAction, registerCharacterCreatorChangeHandler, registerCharacterCreatorInputHandler, registerCharacterLibraryRenderer, registerCharacterStepCompletion, registerCharacterStepRenderer,
      removeAbilityBonusSourcesByPrefix, removeContainerAndContents, removeContainerPreserveContents, removeInnateSpellsBySourcePrefixes, removeLastCharacterLevel, removeListProficiencySource,
      removeListProficiencySourcesByPrefix, removeMulticlassClass, removeSection11Portrait, removeSection12AsiFeatIfUnused, removeSection14BackgroundCurrency, removeSection14BackgroundEquipment,
      removeSection14BackgroundFeature, removeSection15Item, removeSection16CustomFeature, removeSection16CustomSpell, removeSkillProficiencySource, removeSkillProficiencySourcesByPrefix,
      removeSpeciesTrait, renderAbilitiesStep, renderActionBar, renderBackgroundStep, renderBasicsStep, renderBuilderView,
      renderCatalogEntryDetails, renderCharacterLibraryEmptyState, renderCharacterLibraryView, renderClassFeatureMetadata, renderClassStep, renderCreatorView,
      renderEquipmentStep, renderFullCatalogDescription, renderLatestLevelAsiUnlock, renderLatestLevelFeatureUnlocks, renderLatestLevelSubclassUnlock, renderLatestLevelUnlockSummary,
      renderLevelStep, renderLevelUpWorkflow, renderMissingStep, renderMulticlassAdvancementChoiceSummary, renderMulticlassClassSummary, renderMulticlassLevelBreakdown,
      renderMulticlassProgressionEditor, renderMulticlassReadOnlyNotice, renderMulticlassSkillChoices, renderMulticlassStoredChoices, renderMulticlassToolChoices, renderReviewStep,
      renderRulesetMetadata, renderSaveStep, renderSection11PortraitPanel, renderSection12ArtificerInfusions, renderSection12AsiChoice, renderSection12CompactAsiChoice,
      renderSection12DivineSmiteSlotUsage, renderSection12FeatChoices, renderSection12FeatureMechanics, renderSection12FutureFeatures, renderSection12MulticlassAddStatus, renderSection12SelectedClassDetails,
      renderSection13AbilityScoreDetails, renderSection13AbilitySummary, renderSection13ArmorClassGuide, renderSection13DerivedMechanics, renderSection13HitDice, renderSection13HpGuide,
      renderSection13ManualAbilities, renderSection13MechanicsGuide, renderSection13PointBuy, renderSection13RolledAbilities, renderSection13RolledHpInputs, renderSection13StandardArray,
      renderSection14ExpertiseChoices, renderSection14ProficiencyGuide, renderSection14SourceSkillChoices, renderSection15Catalog, renderSection15ContainerDestinationSelect, renderSection15Inventory,
      renderSection15ItemEditCheckbox, renderSection15ItemEditControls, renderSection15ItemEditInput, renderSection15ItemEditTextarea, renderSection15OpenContainerPanel, renderSection16BeginnerGuide,
      renderSection16CustomSpells, renderSection16DefaultSpellViewer, renderSection16FeatPicker, renderSection16FeatureCards, renderSection16InnateSpells, renderSection16SpellSlots,
      renderSection17Abilities, renderSection17BackgroundChoices, renderSection17BackgroundGrants, renderSection17ClassAndFeatSummary, renderSection17ClassSpells, renderSection17ContainerSummary,
      renderSection17FeatureReviewItem, renderSection17FeatureSummary, renderSection17HitDice, renderSection17InnateSpells, renderSection17Inventory, renderSection17List,
      renderSection17MigrationWarnings, renderSection17PassiveScores, renderSection17SavingThrows, renderSection17Skills, renderSection17SpellcastingSummary, renderSection17Warnings,
      renderSection17WeaponAttacks, renderSection18BackupNotice, renderSection18LinkedTokenPanel, renderSection18Warnings, renderSelectedClassMechanicsSummary, renderSelectedFeatSummary,
      renderSkillsStep, renderSpeciesStep, renderSpellsStep, renderStepContent, renderStepRail, renderSubclassStep,
      repairContainerState, replaceDraft, replaceSection11Portrait, replaceSection20Draft, resolveClassTemplateForEntry, restoreDraftFromSession,
      restoreSection16ResourceList, retiredCharacterStepIds, rollSection13AbilityScore, rollSection13ScorePool, runCharacterCreatorAction, runCharacterStepRegistrationAudit,
      runWizardHandlers, safeDisplayString, safeNumber, sanitizeDraftStrings, saveSection12ArtificerInfusionState, saveSection18Character,
      scheduleDraftPersistence, section16RechargeMatchesRest, section16SelectedSpellSourceIds, section18SnapshotExists, selectClassTemplate, setAbilityBonusSource,
      setAbilityScore, setCharacterLevel, setCurrentStep, setDraftValue, setFeatRestChoice, setInnateSpellsForSource,
      setManualProficiencyList, setMulticlassClassLevel, setMulticlassSubclass, setSection11Portrait, setSection12ArtificerInfusionTarget, setSection12AsiBonusSource,
      setSection12AsiChoiceValues, setSection12AsiFeat, setSection12AsiMode, setSection12CustomClassSkillNames, setSection12FeatChoiceValues, setSection12FeatureStoredChoices,
      setSection12MulticlassAddStatus, setSection13AbilityMethod, setSection13HpRollValue, setSection14BackgroundChoiceList, setSection14SkillEntry, setSection14StoredSkillChoice,
      setSimpleDraftField, setSourceProficiencyList, setStatus, skipSection14Background, slotsArrayToObject, sourceMatches,
      splitInventoryStack, startNewDraft, startSection20CharacterCreator, startSection20NewCharacter, stopSection19Listener, subtractCurrencyMaps,
      syncClassLevelOrderToClassLevels, syncEquipmentCurrencyFromSources, syncFirstUnarmoredDefenseSource, syncSection12AdvancementChoice, syncSection12ArtificerInfusionsForLevel, syncSection12AsiChoicesForLevel,
      syncSection14BackgroundFeatures, syncSection16ClassSourceMetadata, syncSection16LegacySpellAliases, syncSection17CompletedSteps, syncSection18DerivedValues, toggleMulticlassSkillChoice,
      toggleMulticlassToolChoice, toggleSection12ArtificerInfusion, toggleSection12ClassFeatureChoice, toggleSection12RageState, toggleSection14Expertise, toggleSection14Skill,
      toggleSection15ItemState, toggleSection16Feat, toggleSection16MysticArcanum, toggleSection16SpellKnown, toggleSection16SpellPrepared, tryAddMulticlassClass,
      uniqueCleanArray, updateSection12CustomClassSkillPicker, updateSection15InventoryItem, uploadSection11PortraitFile, useCustomClassName, useCustomSpeciesName,
      useSection18ImportedCharacter, useSpeciesTemplate, validateBuiltinSpeciesBackgroundCatalog, validateContainerState, validateDefaultClassCollection, validateDefaultFeatCollection,
      validateDefaultSpellCatalog, validateDefaultSpellReferences, validateDefaultSubclassCollection, validateFeatPrerequisiteDefinitions, validateSection18FirestoreRecord, validateSection18NoRemoteConflict,
      warnDraftStorageFailure, wizardChoiceCard, wizardField, wizardRuntime, wizardSelect, wouldCreateContainerCycle,
      writeRouteToUrl
    });
  }

  const {
    ARTISAN_TOOL_OPTIONS, DARK_ELF_INNATE_SPELLS_2014, DEFAULT_BACKGROUND_EQUIPMENT_PACKAGES, DEFAULT_BACKGROUND_TEMPLATES, DEFAULT_CLASS_TEMPLATES, DEFAULT_EQUIPMENT_CATALOG,
    DEFAULT_SPECIES_TEMPLATES, DWARF_TOOL_CHOICES, FOREST_GNOME_INNATE_SPELLS_2014, GAMING_SET_OPTIONS, GENERAL_TOOL_OPTIONS, MUSICAL_INSTRUMENT_OPTIONS,
    RAW_DEFAULT_BACKGROUND_TEMPLATES, RAW_DEFAULT_SPECIES_TEMPLATES, STANDARD_LANGUAGE_OPTIONS, TIEFLING_INNATE_SPELLS_2014, WIZARD_CANTRIP_CHOICES_2014
  } = createCharacterCatalogs({
    $, ABILITY_DEFINITIONS, ABILITY_SCORE_METHODS, ACTIVE_RULESET, ADDITIONAL_CANTRIP_COUNT_2014, ADDITIONAL_CANTRIP_EXPECTATIONS_2014,
    ADDITIONAL_CANTRIP_IDS_2014, BACKGROUND_SCHEMA_VERSION, BUILDER_STEPS, BUILDER_STEP_INDEX, BUILTIN_BACKGROUND_2014_EXPECTATIONS, BUILTIN_BACKGROUND_IDS_2014,
    BUILTIN_SPECIES_2014_EXPECTATIONS, BUILTIN_SPECIES_IDS_2014, BUILTIN_SUBRACE_2014_EXPECTATIONS, CHARACTER_SCHEMA_VERSION, CLASS_SCHEMA_VERSION, CURRENCY_DENOMINATIONS,
    DEFAULT_CLASSES, DEFAULT_CLASS_SCHEMA_VERSION, DEFAULT_FEATS, DEFAULT_FEAT_ABILITY_SCORE_MAXIMUM, DEFAULT_FIGHTING_STYLE_EFFECTS, DEFAULT_INVOCATION_DETAILS,
    DEFAULT_MANEUVER_DETAILS, DEFAULT_METAMAGIC_DETAILS, DEFAULT_SPELLS, DEFAULT_SUBCLASSES, FEAT_CHOICE_VALUE_PREFIX, POST_CAP_ABILITY_SOURCE_PREFIXES,
    SKILL_DEFINITIONS, SPECIES_SCHEMA_VERSION, SRD_2014_FIGHTER_ASI_LEVELS, SRD_2014_FULL_CASTER_SLOTS, SRD_2014_PACT_MAGIC, SRD_2014_ROGUE_ASI_LEVELS,
    SRD_2014_SIZE_CARRY_MULTIPLIERS, SRD_2014_STANDARD_ASI_LEVELS, SRD_SPELL_COUNT_2014, UNARMORED_DEFENSE_CLASS_RULES, addCappedNormalAbilityIncrease, addCurrencyMaps,
    addLegacyImportWarning, addMigrationWarning, applyCompatibilityAliases, assertCharacterMutationAccess, auditLegacyImportedCharacter, backfillBackgroundCurrencySources,
    calculateAbilityModifier, calculateAbilityModifiers, calculateArmorClassOptions, calculateCharacterHitDice, calculateCharacterHp, calculateCharacterInitiative,
    calculateCharacterPassiveScores, calculateCharacterRolledHp, calculateCharacterSavingThrows, calculateCharacterSkillModifier, calculateContainerContentWeight, calculateEquippedWeaponAttacks,
    calculateInventoryWeightSummary, calculateRuleCarryingCapacity, calculateRuleFixedAverageHp, calculateRuleManualHp, calculateRulePassiveScore, calculateRuleRolledHp,
    calculateRuleSavingThrowModifier, calculateRuleSkillModifier, calculateRuleSpellAttackBonus, calculateRuleSpellSaveDc, calculateSrd2014MulticlassSpellcasting, calculateWeaponAttack,
    characterHasClass, clampLevel, clampStepIndex, cleanArray, cleanImportSourceLabel, cleanString,
    cleanupDuplicateNonRepeatableAdvancementFeats, cloneData, collectMalformedSourceValues, createAbilityMap, createCharacterPayload, createCharacterSheetView,
    createClassEntryId, createDefaultClassTemplate, createEmptyCharacter, createNormalAbilityCapScoreMap, createSrdClassTemplate, createSrdFeature,
    createSrdFeatureLevels, createSrdSubclass, decodeFeatChoiceValue, deps, deriveAbilityBaseFromFinalScores, encodeFeatChoiceValue,
    enforceClassProgressionLevelCap, enrichBuiltinBackgroundTemplate, enrichBuiltinSpeciesTemplate, ensureAbilityBonusSources, ensureClassProgressionEntryData, ensureEquipmentCurrencySources,
    ensureProficiencySources, findClassEntryForLevelOrderKey, findDefaultClassDefinition, findHpRollRawRecordForLevel, formatClassEntryHitDie, formatSignedNumber,
    friendlyServiceError, getAbilityBonusTotalsFromSources, getAbilityDefinition, getAbilityScore, getBackgroundSourceLabel, getCharacterClassEntries,
    getCharacterLevelHitDieRecords, getCharacterProficiencyBonus, getCharacterSkillEntry, getCharacterSpellcastingInfo, getClassAsiLevels, getClassLevelOrderEntryKey,
    getClassProgressionEntryKey, getClassSourceLabel, getContainerContents, getContainerSummaries, getCurrencySourceTotals, getDefaultClassFeaturesThroughLevel,
    getExactBuilderStepById, getFeatAbilityEffectMaximum, getGenericProficiencyBonus, getHitDieSize, getHpRollRawRecords, getInventoryItemKnownWeight,
    getLegacy2014Metadata, getManualCurrencyBalance, getManualProficiencyList, getNormalAbilityScoreForCap, getPerClassSpellSelectionSummary, getPreparedSpellLimit,
    getPrimaryClassEntry, getProgressionValueByLevel, getRoomCode, getSection12UnlockedAsiSlot, getSection18MutationIdentity, getSpeciesHpBonus,
    getSpeciesSourceLabel, getSpellSelectionLimits, getSpellSlotCastingOptions, getSpellSourceContexts, getSpellSourceId, getSpellSourceWarning,
    getSpellcastingClassOptions, getSpellcastingEntryForSpell, getSpellcastingSummary, getSrd2014PactMagic, getSrd2014SpellSlots, getStartingClassEntry,
    getStepById, getStepIndex, getStoredSources, getSubraceSourceLabel, getUnlockedFeatChoiceSlots, hasAbilityMapValues,
    hasCurrencyValue, hasFirestoreTools, hasMalformedSourceValue, hpRollRawHasAssociation, hpRollRawMatchesLevel, isActiveRulesetEntry,
    isAsiOrFeatChoiceFeature, isCharacterNonSpellcaster, isPlainObject, isSavingThrowProficient, isStartingClassEntry, isWeaponProficient,
    migrateClassEntryAdvancementData, normalizeAbilityMap, normalizeAdvancementChoices, normalizeCharacter, normalizeCharacterImageValue, normalizeClassChoiceMap,
    normalizeClassEntryHitDie, normalizeClassLevelOrder, normalizeCurrencyMap, normalizeCurrencySourceMap, normalizeFeatChoiceSelections, normalizeFeatIds,
    normalizeHpCalculation, normalizeHpRollRecordsForCharacter, normalizeImportSourceList, parseFeatChoiceSelections, recalculateAbilityTotals, recordRawEquipmentMigrationWarnings,
    removeAbilityBonusSourcesByPrefix, removeContainerAndContents, removeContainerPreserveContents, removeListProficiencySource, removeListProficiencySourcesByPrefix, removeSkillProficiencySource,
    removeSkillProficiencySourcesByPrefix, repairContainerState, resolveClassTemplateForEntry, safeNumber, setAbilityBonusSource, setManualProficiencyList,
    setSourceProficiencyList, slotsArrayToObject, sourceMatches, splitInventoryStack, subtractCurrencyMaps, syncClassLevelOrderToClassLevels,
    syncEquipmentCurrencyFromSources, syncFirstUnarmoredDefenseSource, uniqueCleanArray, validateBuiltinSpeciesBackgroundCatalog, validateContainerState, validateDefaultClassCollection,
    validateDefaultFeatCollection, validateDefaultSpellCatalog, validateDefaultSpellReferences, validateDefaultSubclassCollection, validateFeatPrerequisiteDefinitions, wouldCreateContainerCycle
  });

// =====================================================
// CHARACTER CREATOR SECTION 5 — CREATOR STATE / DRAFT MANAGEMENT
// =====================================================

  const C = {
    screen: null,
    actionBar: null,
    grid: null,
    subtitle: null,
    status: null,

    newButton: null,
    saveButton: null,
    saveAsNewButton: null,
    copyJsonButton: null,
    exportJsonButton: null,
    importJsonInput: null,

    nameInput: null,
    raceInput: null,
    classInput: null,
    levelInput: null,
    imageInput: null,

    acInput: null,
    maxHpInput: null,
    currentHpInput: null,
    speedInput: null,

    strInput: null,
    dexInput: null,
    conInput: null,
    intInput: null,
    wisInput: null,
    chaInput: null,

    notesInput: null,
    libraryList: null
  };

  const creatorState = {
    viewMode: "library",
    currentStepId: "basics",
    currentStepIndex: 0,
    currentCharacterId: null,
    draft: createEmptyCharacter(),
    reviewRevision: 0,
    dirty: false,
    isSaving: false,
    busyAction: "",
    statusMessage: "Character creator foundation ready.",
    multiclassAddStatus: {
      message: "",
      tone: "warning"
    },
    pendingContainerRemovalId: "",
    openContainerId: "",
    showContainedItems: false,

    characterCache: [],
    characterRoomCode: null,
    characterUnsubscribe: null,

    roomClassCache: [],
    classRoomCode: null,
    classUnsubscribe: null,

    roomSpeciesCache: [],
    roomBackgroundCache: []
  };

  let characterSheetView = null;

  const CREATOR_INPUT_DEBOUNCE_MS = 250;
  const DRAFT_AUTOSAVE_DEBOUNCE_MS = 300;

  const creatorInputDebounceRuntime = {
    entries: new Map(),
    scheduleCount: 0,
    flushCount: 0
  };

  const draftPersistenceRuntime = {
    timerId: null,
    targets: null,
    scheduleCount: 0,
    flushCount: 0,
    storageWriteCount: 0
  };

  const CHARACTER_BUSY_ACTIONS = new Set([
    "new-character",
    "edit-character",
    "duplicate-character",
    "delete-character",
    "save-character",
    "finalize-character",
    "save-copy",
    "create-linked-token",
    "import-json-file",
    "import-json-text",
    "upload-portrait"
  ]);

  const CHARACTER_SAVE_BUSY_ACTIONS =
    new Set([
      "save-character",
      "finalize-character",
      "save-copy"
    ]);

  function getCharacterBusyLabel(
    action = creatorState.busyAction
  ) {
    switch (action) {
      case "new-character":
        return "Starting a new character";

      case "edit-character":
        return "Opening character";

      case "duplicate-character":
        return "Duplicating character";

      case "delete-character":
        return "Deleting character";

      case "save-copy":
        return "Saving character copy";

      case "finalize-character":
        return "Finalizing character";

      case "create-linked-token":
        return "Creating linked token";

      case "import-json-file":
      case "import-json-text":
        return "Importing character";

      case "upload-portrait":
        return "Uploading portrait";

      case "save-character":
      default:
        return "Saving character";
    }
  }

  function isCharacterCreatorBusy() {
    return Boolean(
      creatorState.busyAction ||
      creatorState.isSaving
    );
  }

  function isCharacterBusyAction(action) {
    return CHARACTER_BUSY_ACTIONS.has(
      String(action || "").trim()
    );
  }

  function blockCharacterBusyAction(action) {
    if (
      !isCharacterCreatorBusy() ||
      !isCharacterBusyAction(action)
    ) {
      return false;
    }

    setStatus(
      `${getCharacterBusyLabel()} is already in progress.`
    );

    if (typeof document !== "undefined") {
      renderCurrentStep();
    }

    return true;
  }

  function beginCharacterBusyAction(action) {
    const cleanAction =
      String(action || "").trim();

    if (blockCharacterBusyAction(cleanAction)) {
      return false;
    }

    creatorState.busyAction =
      cleanAction;

    creatorState.isSaving =
      CHARACTER_SAVE_BUSY_ACTIONS.has(
        cleanAction
      );

    setStatus(
      `${getCharacterBusyLabel(cleanAction)}...`
    );

    if (typeof document !== "undefined") {
      renderCurrentStep();
    }

    return true;
  }

  function endCharacterBusyAction(action) {
    const cleanAction =
      String(action || "").trim();

    if (
      !cleanAction ||
      creatorState.busyAction === cleanAction
    ) {
      creatorState.busyAction = "";
    }

    if (
      !creatorState.busyAction ||
      CHARACTER_SAVE_BUSY_ACTIONS.has(
        cleanAction
      )
    ) {
      creatorState.isSaving = false;
    }

    if (typeof document !== "undefined") {
      renderCurrentStep();
    }
  }

  function refreshElements() {
    C.screen = $("characterCreatorScreen");

    C.actionBar = C.screen
      ? C.screen.querySelector(".creatorActionBar")
      : null;

    C.grid = C.screen
      ? C.screen.querySelector(".creatorFullGrid")
      : null;

    C.subtitle = C.screen
      ? C.screen.querySelector(".creatorTopBar .small")
      : null;

    C.status = $("characterCreatorStatus");

    C.newButton = $("newCharacterButton");
    C.saveButton = $("saveCharacterButton");
    C.saveAsNewButton = $("saveAsNewCharacterButton");
    C.copyJsonButton = $("copyCharacterJsonButton");
    C.exportJsonButton = $("exportCharacterJsonButton");
    C.importJsonInput = $("importCharacterJsonInput");

    C.nameInput = $("characterNameInput");
    C.raceInput = $("characterRaceInput");
    C.classInput = $("characterClassInput");
    C.levelInput = $("characterLevelInput");
    C.imageInput = $("characterImageUploadInput");

    C.acInput = $("characterAcInput");
    C.maxHpInput = $("characterMaxHpInput");
    C.currentHpInput = $("characterCurrentHpInput");
    C.speedInput = $("characterSpeedInput");

    C.strInput = $("characterStrInput");
    C.dexInput = $("characterDexInput");
    C.conInput = $("characterConInput");
    C.intInput = $("characterIntInput");
    C.wisInput = $("characterWisInput");
    C.chaInput = $("characterChaInput");

    C.notesInput = $("characterNotesInput");
    C.libraryList = $("characterLibraryList");
  }

  function setStatus(message) {
    creatorState.statusMessage = String(message || "");

    if (typeof document === "undefined") {
      return;
    }

    refreshElements();

    if (C.status) {
      C.status.textContent = creatorState.statusMessage;
    }
  }

  function makeSafeId(value, fallback = "custom") {
    const clean = String(value || fallback)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return clean || fallback;
  }

  function makeSafeFileName(name) {
    return String(name || "character")
      .trim()
      .replace(/[^a-z0-9_-]/gi, "_")
      .replace(/_+/g, "_")
      .slice(0, 80) || "character";
  }

  function normalizeClassTemplate(
    rawClass,
    fallbackSource = "template"
  ) {
    const raw = rawClass || {};
    const name = cleanString(
      raw.name,
      "Custom Class"
    );
    const classId = makeSafeId(
      raw.id || name,
      "custom-class"
    );

    const skillChoices =
      raw.skillChoices ||
      {};

    return {
      schemaVersion: CLASS_SCHEMA_VERSION,
      ...getLegacy2014Metadata("class", classId, raw),

      id: classId,

      docId: raw.docId || null,
      name,

      source: cleanString(
        raw.source,
        fallbackSource
      ),

      summary: cleanString(
        raw.summary ||
        raw.description,
        "No summary yet."
      ),

      hitDie: cleanString(
        raw.hitDie,
        "d8"
      ),

      primaryAbilities: cleanArray(
        raw.primaryAbilities
      ),

      savingThrows: cleanArray(
        raw.savingThrows
      ),

      armorProficiencies: cleanArray(
        raw.armorProficiencies
      ),

      weaponProficiencies: cleanArray(
        raw.weaponProficiencies
      ),

      toolProficiencies: cleanArray(
        raw.toolProficiencies
      ),

      effects:
        Array.isArray(raw.effects)
          ? raw.effects.filter((effect) => {
              return effect &&
                typeof effect === "object";
            }).map(cloneData)
          : [],

      skillChoices: {
        choose: Math.max(
          0,
          Math.round(
            safeNumber(
              skillChoices.choose,
              0
            )
          )
        ),

        from: cleanArray(
          skillChoices.from
        )
      },

      multiclassPrerequisites:
        raw.multiclassPrerequisites &&
        typeof raw.multiclassPrerequisites === "object" &&
        !Array.isArray(raw.multiclassPrerequisites)
          ? cloneData(raw.multiclassPrerequisites)
          : {
              all: [],
              any: []
            },

      multiclassProficiencies:
        raw.multiclassProficiencies &&
        typeof raw.multiclassProficiencies === "object" &&
        !Array.isArray(raw.multiclassProficiencies)
          ? cloneData(raw.multiclassProficiencies)
          : {},

      subclassLevel: Math.max(
        1,
        Math.round(
          safeNumber(
            raw.subclassLevel,
            3
          )
        )
      ),

      spellcastingProgression:
        cleanString(
          raw.spellcastingProgression ||
          raw.progressionType,
          "none"
        ),

      progressionType:
        cleanString(
          raw.progressionType ||
          raw.spellcastingProgression,
          "none"
        ),

      spellcastingAbility:
        cleanString(
          raw.spellcastingAbility
        ),

      spellPreparation:
        cleanString(
          raw.spellPreparation,
          "none"
        ),

      cantripsKnown:
        raw.cantripsKnown &&
        typeof raw.cantripsKnown === "object" &&
        !Array.isArray(raw.cantripsKnown)
          ? cloneData(raw.cantripsKnown)
          : {},

      spellsKnown:
        raw.spellsKnown &&
        typeof raw.spellsKnown === "object" &&
        !Array.isArray(raw.spellsKnown)
          ? cloneData(raw.spellsKnown)
          : {},

      preparedSpellsFormula:
        raw.preparedSpellsFormula &&
        typeof raw.preparedSpellsFormula === "object" &&
        !Array.isArray(raw.preparedSpellsFormula)
          ? cloneData(raw.preparedSpellsFormula)
          : null,

      infusionsKnownByLevel:
        raw.infusionsKnownByLevel &&
        typeof raw.infusionsKnownByLevel === "object"
          ? cloneData(raw.infusionsKnownByLevel)
          : {},

      infusedItemsByLevel:
        raw.infusedItemsByLevel &&
        typeof raw.infusedItemsByLevel === "object"
          ? cloneData(raw.infusedItemsByLevel)
          : {},

      infusions:
        Array.isArray(raw.infusions)
          ? cloneData(raw.infusions)
          : [],

      levels:
        raw.levels &&
        typeof raw.levels === "object" &&
        !Array.isArray(raw.levels)
          ? cloneData(raw.levels)
          : {
              1: {
                proficiencyBonus: 2,
                features: []
              }
            },

      subclasses:
        Array.isArray(raw.subclasses)
          ? cloneData(raw.subclasses)
          : []
    };
  }

  function getAllClassTemplates() {
    const classMap = new Map();

    DEFAULT_CLASS_TEMPLATES.forEach((classData) => {
      const normalized = normalizeClassTemplate(
        classData,
        "template"
      );

      classMap.set(
        normalized.id,
        normalized
      );
    });

    creatorState.roomClassCache.forEach((classData) => {
      if (!isActiveRulesetEntry(classData)) {
        return;
      }

      const normalized = normalizeClassTemplate(
        classData,
        "homebrew"
      );

      if (classMap.has(normalized.id)) {
        return;
      }

      classMap.set(
        normalized.id,
        normalized
      );
    });

    const primaryClass = getPrimaryClassEntry(
      creatorState.draft
    );

    if (
      primaryClass?.templateSnapshot &&
      isActiveRulesetEntry(primaryClass.templateSnapshot) &&
      !classMap.has(primaryClass.classId)
    ) {
      const normalized = normalizeClassTemplate(
        primaryClass.templateSnapshot,
        "character"
      );

      classMap.set(
        normalized.id,
        normalized
      );
    }

    return Array.from(classMap.values())
      .sort((a, b) => {
        if (
          a.source === "template" &&
          b.source !== "template"
        ) {
          return -1;
        }

        if (
          a.source !== "template" &&
          b.source === "template"
        ) {
          return 1;
        }

        return a.name.localeCompare(b.name);
      });
  }

  function getSelectedClassTemplate() {
    const primaryClass = getPrimaryClassEntry(
      creatorState.draft
    );

    if (
      !primaryClass ||
      (
        !cleanString(primaryClass.classId) &&
        !cleanString(primaryClass.className) &&
        !primaryClass.templateSnapshot
      )
    ) {
      return null;
    }

    return resolveClassTemplateForEntry(
      primaryClass
    );
  }

  function isMulticlassDraft(
    character = creatorState.draft
  ) {
    return (
      Array.isArray(
        character
          ?.classProgression
          ?.classes
      ) &&
      character
        .classProgression
        .classes
        .length > 1
    );
  }

  function getMulticlassPrerequisiteRequirements(
    classId,
    template
  ) {
    const configured =
      template?.multiclassPrerequisites &&
      typeof template.multiclassPrerequisites === "object" &&
      !Array.isArray(template.multiclassPrerequisites)
        ? template.multiclassPrerequisites
        : {};

    const all = Array.isArray(configured.all)
      ? configured.all.filter(Boolean)
      : [];

    const any = Array.isArray(configured.any)
      ? configured.any.filter(Boolean)
      : [];

    const requirements = [
      ...all,
      ...(any.length
        ? [{ any }]
        : [])
    ];

    return requirements.length
      ? requirements
      : MULTICLASS_PREREQUISITES[classId] || [];
  }

  function getMulticlassClassId(
    classEntryOrId
  ) {
    if (typeof classEntryOrId === "string") {
      return makeSafeId(
        classEntryOrId,
        ""
      );
    }

    const template =
      resolveClassTemplateForEntry(
        classEntryOrId
      );

    return makeSafeId(
      classEntryOrId?.classId ||
      template?.id ||
      classEntryOrId?.className,
      ""
    );
  }

  function formatMulticlassRequirementItem(
    item
  ) {
    const abilityName =
      getSection13AbilityName(
        item?.ability
      );

    return `${abilityName} ${Math.max(
      1,
      Math.round(
        safeNumber(
          item?.minimum,
          13
        )
      )
    )}`;
  }

  function getMulticlassRequirementLabel(
    requirement
  ) {
    if (Array.isArray(requirement?.any)) {
      return requirement.any
        .map(formatMulticlassRequirementItem)
        .join(" or ");
    }

    return formatMulticlassRequirementItem(
      requirement
    );
  }

  function isMulticlassRequirementMet(
    requirement,
    character = creatorState.draft
  ) {
    const meetsItem = (item) => {
      return (
        getAbilityScore(
          character,
          item?.ability
        ) >=
        Math.max(
          1,
          Math.round(
            safeNumber(
              item?.minimum,
              13
            )
          )
        )
      );
    };

    if (Array.isArray(requirement?.any)) {
      return requirement.any.some(
        meetsItem
      );
    }

    return meetsItem(requirement);
  }

  function getMulticlassPrerequisiteResultForClass(
    classEntryOrId,
    character = creatorState.draft
  ) {
    const classId =
      getMulticlassClassId(
        classEntryOrId
      );

    const template =
      typeof classEntryOrId === "string"
        ? getAllClassTemplates().find((entry) => {
            return entry.id === classId;
          })
        : resolveClassTemplateForEntry(
            classEntryOrId
          );

    const className =
      safeDisplayString(
        template?.name,
        classId || "Class"
      );

    const requirements =
      getMulticlassPrerequisiteRequirements(
        classId,
        template
      );

    if (!requirements.length) {
      return {
        classId,
        className,
        met: true,
        label:
          "No listed multiclass prerequisite",
        failed: []
      };
    }

    const failed =
      requirements.filter((requirement) => {
        return !isMulticlassRequirementMet(
          requirement,
          character
        );
      });

    return {
      classId,
      className,
      met: failed.length === 0,
      label:
        requirements
          .map(getMulticlassRequirementLabel)
          .join(" and "),
      failed
    };
  }

  function getMulticlassPrerequisiteResults(
    character = creatorState.draft,
    extraClassId = ""
  ) {
    const seen = new Set();
    const entries = [
      ...getCharacterClassEntries(
        character
      ),
      cleanString(extraClassId)
    ].filter(Boolean);

    return entries
      .map((entry) => {
        const classId =
          getMulticlassClassId(entry);

        if (
          !classId ||
          seen.has(classId)
        ) {
          return null;
        }

        seen.add(classId);

        return getMulticlassPrerequisiteResultForClass(
          entry,
          character
        );
      })
      .filter(Boolean);
  }

  function formatMulticlassPrerequisiteFailure(
    result
  ) {
    return `${result.className} requires ${result.label}`;
  }

  function getMulticlassProficiencyRule(
    classEntry
  ) {
    const classId =
      getMulticlassClassId(
        classEntry
      );

    const template =
      resolveClassTemplateForEntry(
        classEntry
      );

    const configured =
      template?.multiclassProficiencies &&
      typeof template.multiclassProficiencies === "object" &&
      !Array.isArray(template.multiclassProficiencies)
        ? template.multiclassProficiencies
        : null;

    if (
      configured &&
      Object.keys(configured).length
    ) {
      return {
        armor: cleanArray(
          configured.armor ||
          configured.armorProficiencies
        ),
        weapons: cleanArray(
          configured.weapons ||
          configured.weaponProficiencies
        ),
        tools: cleanArray(
          configured.tools ||
          configured.toolProficiencies
        ),
        skillChoices: {
          choose: Math.max(
            0,
            Math.round(
              safeNumber(
                configured.skillChoices?.choose,
                0
              )
            )
          ),
          from: cleanArray(
            configured.skillChoices?.from
          )
        },
        toolChoices: {
          choose: Math.max(
            0,
            Math.round(
              safeNumber(
                configured.toolChoices?.choose,
                0
              )
            )
          ),
          label: cleanString(
            configured.toolChoices?.label,
            "tool proficiency"
          ),
          from: cleanArray(
            configured.toolChoices?.from
          )
        }
      };
    }

    return (
      MULTICLASS_PROFICIENCY_GRANTS[
        classId
      ] || {
        armor: [],
        weapons: [],
        tools: []
      }
    );
  }

  function getMulticlassSummaryEntries(
    character = creatorState.draft
  ) {
    return getCharacterClassEntries(character)
      .map((classEntry, index) => {
        const template =
          resolveClassTemplateForEntry(
            classEntry
          );

        const className =
          safeDisplayString(
            classEntry?.className,
            safeDisplayString(
              template?.name,
              `Class ${index + 1}`
            )
          );

        return {
          classEntry,
          template,
          className,
          classLevel:
            Math.max(
              0,
              Math.round(
                safeNumber(
                  classEntry?.level,
                  0
                )
              )
            ),
          subclassName:
            safeDisplayString(
              classEntry?.subclassName,
              ""
            ),
          hitDie: formatClassEntryHitDie(
            classEntry,
            template
          ),
          source:
            safeDisplayString(
              classEntry?.source,
              safeDisplayString(
                template?.source,
                "character"
              )
            ),
          primaryAbilities:
            formatSection12List(
              template?.primaryAbilities ||
              classEntry?.primaryAbilities
            ) ||
            "Not specified",
          savingThrows:
            formatSection12List(
              template?.savingThrows ||
              classEntry?.savingThrows
            ) ||
            "Not specified",
          subclassLevel:
            Math.max(
              1,
              Math.round(
                safeNumber(
                  template?.subclassLevel ||
                  classEntry?.subclassLevel,
                  3
                )
              )
            )
        };
      });
  }

  function formatMulticlassStoredChoiceKey(key) {
    const labels = {
      classFeatures: "Class Features",
      fightingStyle: "Fighting Style",
      skillProficiencyIds: "Skill Proficiencies",
      spellbook: "Spellbook",
      toolProficiencyChoices: "Tool Proficiencies"
    };

    if (labels[key]) {
      return labels[key];
    }

    const spaced = cleanString(key)
      .replace(/Ids$/i, "")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[-_]+/g, " ")
      .trim();

    return spaced
      ? `${spaced.charAt(0).toUpperCase()}${spaced.slice(1)}`
      : "Choice";
  }

  function formatMulticlassStoredChoiceValue(value) {
    if (Array.isArray(value)) {
      return value
        .map((item) => {
          return formatMulticlassStoredChoiceValue(
            item
          );
        })
        .filter(Boolean)
        .join(", ");
    }

    if (
      value &&
      typeof value === "object"
    ) {
      return Object.entries(value)
        .filter(([key]) => {
          return ![
            "subclassSnapshot",
            "templateSnapshot",
            "classSnapshot"
          ].includes(key);
        })
        .map(([key, entryValue]) => {
          const formattedValue =
            formatMulticlassStoredChoiceValue(
              entryValue
            );

          return formattedValue
            ? `${formatMulticlassStoredChoiceKey(key)}: ${formattedValue}`
            : "";
        })
        .filter((text) => {
          return cleanString(text);
        })
        .join("; ");
    }

    return safeDisplayString(value, "");
  }

  function adjustSelectedFeatResource(resourceId, delta) {
    const resources = Array.isArray(
      creatorState.draft.featMechanics?.resources
    )
      ? creatorState.draft.featMechanics.resources
      : [];
    const resourceEntry = resources.find((entry) => {
      return entry.id === cleanString(resourceId);
    });

    if (!resourceEntry) {
      return false;
    }

    resourceEntry.currentUses = Math.max(
      0,
      Math.min(
        safeNumber(resourceEntry.maximumUses, 0),
        safeNumber(resourceEntry.currentUses, 0) +
          Math.sign(safeNumber(delta, 0))
      )
    );

    if (resourceEntry.kind === "featSpell") {
      const matchingSpellRecord =
        (
          Array.isArray(
            creatorState.draft
              .featMechanics
              ?.spellcasting
          )
            ? creatorState.draft
                .featMechanics
                .spellcasting
            : []
        ).find((entry) => {
          return entry.id === resourceEntry.id;
        });
      const matchingSourceRecord =
        Object.values(
          creatorState.draft
            .magic
            ?.featSources || {}
        )
          .flatMap((source) => {
            return Array.isArray(
              source?.spellRecords
            )
              ? source.spellRecords
              : [];
          })
          .find((entry) => {
            return entry.id === resourceEntry.id;
          });

      [
        matchingSpellRecord,
        matchingSourceRecord
      ]
        .filter(Boolean)
        .forEach((entry) => {
          entry.currentUses =
            resourceEntry.currentUses;
        });
    }

    applyCompatibilityAliases(creatorState.draft);
    markDraftChanged();

    return true;
  }

  function adjustSelectedClassResource(resourceId, delta) {
    const resources = Array.isArray(
      creatorState.draft.classMechanics?.resources
    )
      ? creatorState.draft.classMechanics.resources
      : [];
    const resourceEntry = resources.find((entry) => {
      return entry.id === cleanString(resourceId);
    });

    if (
      !resourceEntry ||
      resourceEntry.maximumUses === null
    ) {
      return false;
    }

    resourceEntry.currentUses = Math.max(
      0,
      Math.min(
        safeNumber(resourceEntry.maximumUses, 0),
        safeNumber(resourceEntry.currentUses, 0) +
          Math.sign(safeNumber(delta, 0))
      )
    );
    applyCompatibilityAliases(creatorState.draft);
    markDraftChanged();

    return true;
  }

  function getSection16HitDieKey(
    entry,
    index = 0
  ) {
    return cleanString(
      entry?.classEntryId ||
      entry?.entryId ||
      entry?.classId ||
      entry?.className,
      `hit-die-${index + 1}`
    );
  }

  function adjustSection16HitDieUsage(
    hitDieId,
    delta
  ) {
    const hitDice =
      calculateCharacterHitDice(
        creatorState.draft
      );
    const key =
      cleanString(hitDieId);
    const index =
      hitDice.findIndex(
        (entry, entryIndex) => {
          return (
            getSection16HitDieKey(
              entry,
              entryIndex
            ) === key
          );
        }
      );
    const hitDie =
      hitDice[index];

    if (!hitDie) {
      return false;
    }

    creatorState.draft.combat
      .hitDice = hitDice;
    creatorState.draft.combat
      .hitDiceUsage = {
        ...(
          creatorState.draft
            .combat
            .hitDiceUsage || {}
        )
      };

    const used =
      Math.min(
        safeNumber(
          hitDie.count,
          0
        ),
        Math.max(
          0,
          safeNumber(
            creatorState.draft
              .combat
              .hitDiceUsage[key],
            0
          )
        )
      );
    const nextUsed =
      Math.max(
        0,
        Math.min(
          safeNumber(
            hitDie.count,
            0
          ),
          used +
            Math.sign(
              safeNumber(
                delta,
                0
              )
            )
        )
      );

    if (nextUsed === used) {
      return false;
    }

    creatorState.draft.combat
      .hitDiceUsage[key] =
        nextUsed;

    applyCompatibilityAliases(
      creatorState.draft
    );
    markDraftChanged();
    return true;
  }

  function section16RechargeMatchesRest(
    recharge,
    restType
  ) {
    const normalized =
      cleanString(recharge)
        .toLowerCase()
        .replace(/[^a-z]/g, "");
    const longRest =
      restType === "longRest";

    if (
      normalized ===
      "shortorlongrest"
    ) {
      return true;
    }

    if (normalized === "shortrest") {
      return true;
    }

    return (
      longRest &&
      normalized === "longrest"
    );
  }

  function restoreSection16ResourceList(
    resources,
    restType
  ) {
    let changed = false;

    (
      Array.isArray(resources)
        ? resources
        : []
    ).forEach((resource) => {
      if (
        resource.maximumUses === null ||
        !section16RechargeMatchesRest(
          resource.recharge,
          restType
        )
      ) {
        return;
      }

      const maximum =
        Math.max(
          0,
          safeNumber(
            resource.maximumUses,
            0
          )
        );

      if (
        safeNumber(
          resource.currentUses,
          0
        ) !== maximum
      ) {
        resource.currentUses =
          maximum;
        changed = true;
      }
    });

    return changed;
  }

  function performSection16Rest(
    restType
  ) {
    const type =
      restType === "longRest"
        ? "longRest"
        : "shortRest";
    const draft =
      creatorState.draft;
    let changed = false;

    changed =
      restoreSection16ResourceList(
        draft.classMechanics
          ?.resources,
        type
      ) || changed;
    changed =
      restoreSection16ResourceList(
        draft.featMechanics
          ?.resources,
        type
      ) || changed;

    const featResourceUses =
      new Map(
        (
          Array.isArray(
            draft.featMechanics
              ?.resources
          )
            ? draft.featMechanics
                .resources
            : []
        ).map((resource) => {
          return [
            resource.id,
            resource.currentUses
          ];
        })
      );
    const syncFeatSpellRecord =
      (record) => {
        if (
          !record ||
          !featResourceUses
            .has(record.id)
        ) {
          return;
        }

        const restored =
          featResourceUses
            .get(record.id);

        if (
          record.currentUses !==
          restored
        ) {
          record.currentUses =
            restored;
          changed = true;
        }
      };

    (
      Array.isArray(
        draft.featMechanics
          ?.spellcasting
      )
        ? draft.featMechanics
            .spellcasting
        : []
    ).forEach(syncFeatSpellRecord);
    Object.values(
      draft.magic
        ?.featSources || {}
    ).forEach((source) => {
      (
        Array.isArray(
          source?.spellRecords
        )
          ? source.spellRecords
          : []
      ).forEach(
        syncFeatSpellRecord
      );
    });

    changed =
      restoreCanonicalSpellResources(
        draft,
        type
      ) || changed;

    const slotUsage =
      getSection12SpellSlotUsageState(
        draft
      );

    if (type === "longRest") {
      Object.keys(
        slotUsage.normal
      ).forEach((level) => {
        if (
          safeNumber(
            draft.magic
              .slotUsage
              .normal[level],
            0
          ) !== 0
        ) {
          draft.magic
            .slotUsage
            .normal[level] = 0;
          changed = true;
        }
      });
    }

    slotUsage.pactSources
      .forEach((source) => {
        if (
          safeNumber(
            draft.magic
              .slotUsage
              .pactSources[
                source.sourceId
              ],
            0
          ) !== 0
        ) {
          draft.magic
            .slotUsage
            .pactSources[
              source.sourceId
            ] = 0;
          changed = true;
        }
      });

    if (
      safeNumber(
        draft.magic
          .slotUsage.pact,
        0
      ) !== 0
    ) {
      draft.magic
        .slotUsage.pact = 0;
      changed = true;
    }

    if (type === "longRest") {
      const maximumHp =
        Math.max(
          1,
          safeNumber(
            draft.combat.maxHp,
            1
          )
        );

      if (
        safeNumber(
          draft.combat.currentHp,
          0
        ) !== maximumHp
      ) {
        draft.combat.currentHp =
          maximumHp;
        changed = true;
      }

      if (
        safeNumber(
          draft.combat.temporaryHp,
          0
        ) !== 0
      ) {
        draft.combat.temporaryHp = 0;
        changed = true;
      }

      const hitDice =
        calculateCharacterHitDice(
          draft
        );
      draft.combat.hitDice =
        hitDice;
      draft.combat.hitDiceUsage = {
        ...(
          draft.combat
            .hitDiceUsage || {}
        )
      };
      let recovery =
        Math.max(
          1,
          Math.floor(
            calculateClassProgressionTotalLevel(
              draft
            ) / 2
          )
        );

      hitDice.forEach(
        (entry, index) => {
          if (recovery <= 0) {
            return;
          }

          const key =
            getSection16HitDieKey(
              entry,
              index
            );
          const used =
            Math.min(
              safeNumber(
                entry.count,
                0
              ),
              Math.max(
                0,
                safeNumber(
                  draft.combat
                    .hitDiceUsage[key],
                  0
                )
              )
            );
          const restored =
            Math.min(
              used,
              recovery
            );

          if (restored > 0) {
            draft.combat
              .hitDiceUsage[key] =
                used - restored;
            recovery -=
              restored;
            changed = true;
          }
        }
      );
    }

    if (
      draft.combat
        .classFeatureStates
        ?.rageActive === true
    ) {
      draft.combat
        .classFeatureStates
        .rageActive = false;
      draft.classMechanics
        .spellcastingBlocked =
          false;
      draft.classMechanics
        .spellcastingBlockReasons =
          [];
      changed = true;
    }

    applyCompatibilityAliases(
      draft
    );

    if (changed) {
      markDraftChanged();
    }

    return true;
  }

  function toggleSection12RageState(resourceId) {
    const resources = Array.isArray(
      creatorState.draft.classMechanics?.resources
    )
      ? creatorState.draft.classMechanics.resources
      : [];
    const rageResource = resources.find((entry) => {
      return (
        entry.id === cleanString(resourceId) &&
        entry.canonicalId === "rage"
      );
    });

    if (!rageResource) {
      return false;
    }

    creatorState.draft.combat.classFeatureStates = {
      ...(creatorState.draft.combat.classFeatureStates || {})
    };

    const currentlyActive =
      creatorState.draft.combat
        .classFeatureStates.rageActive === true;

    if (
      !currentlyActive &&
      rageResource.maximumUses !== null &&
      safeNumber(rageResource.currentUses, 0) <= 0
    ) {
      return false;
    }

    if (
      !currentlyActive &&
      rageResource.maximumUses !== null
    ) {
      rageResource.currentUses = Math.max(
        0,
        safeNumber(rageResource.currentUses, 0) - 1
      );
    }

    creatorState.draft.combat
      .classFeatureStates.rageActive =
        !currentlyActive;

    applySelectedClassFeatureMechanics();
    applyCompatibilityAliases(creatorState.draft);
    markDraftChanged();

    return true;
  }

  function getSection12SpellSlotUsageState(
    character = creatorState.draft
  ) {
    character.magic = character.magic || {};
    character.magic.slotUsage =
      character.magic.slotUsage &&
      typeof character.magic.slotUsage === "object"
        ? character.magic.slotUsage
        : {
            normal: {},
            pact: 0,
            pactSources: {}
          };
    character.magic.slotUsage.normal =
      character.magic.slotUsage.normal &&
      typeof character.magic.slotUsage.normal === "object"
        ? character.magic.slotUsage.normal
        : {};
    character.magic.slotUsage.pactSources =
      character.magic.slotUsage
        .pactSources &&
      typeof character.magic.slotUsage
        .pactSources === "object" &&
      !Array.isArray(
        character.magic.slotUsage
          .pactSources
      )
        ? character.magic.slotUsage
            .pactSources
        : {};

    const normal = Object.fromEntries(
      Object.entries(character.magic.slots || {})
        .filter(([level, maximum]) => {
          return safeNumber(level, 0) > 0 && safeNumber(maximum, 0) > 0;
        })
        .map(([level, maximum]) => {
          const cleanMaximum = Math.max(0, safeNumber(maximum, 0));
          const used = Math.min(
            cleanMaximum,
            Math.max(
              0,
              safeNumber(
                character.magic.slotUsage.normal[level],
                0
              )
            )
          );
          character.magic.slotUsage.normal[level] = used;

          return [level, {
            level: safeNumber(level, 0),
            maximum: cleanMaximum,
            used,
            remaining: cleanMaximum - used
          }];
        })
    );
    const pactSourceRecords =
      (
        Array.isArray(
          character.magic
            .pactMagicSources
        ) &&
        character.magic
          .pactMagicSources.length
          ? character.magic
              .pactMagicSources
          : [
              {
                classEntryId:
                  "legacy:pact-magic",
                className: "Pact Magic",
                slots:
                  character.magic
                    .pactMagic?.slots,
                slotLevel:
                  character.magic
                    .pactMagic?.slotLevel
              }
            ]
      )
        .map((source, index) => {
          const sourceId = cleanString(
            source?.classEntryId,
            `pact-source-${index + 1}`
          );
          const maximum = Math.max(
            0,
            safeNumber(
              source?.slots,
              0
            )
          );
          const level = Math.max(
            0,
            safeNumber(
              source?.slotLevel,
              0
            )
          );
          const legacyUsed =
            index === 0
              ? safeNumber(
                  character.magic
                    .slotUsage.pact,
                  0
                )
              : 0;
          const used = Math.min(
            maximum,
            Math.max(
              0,
              safeNumber(
                character.magic
                  .slotUsage
                  .pactSources[
                    sourceId
                  ],
                legacyUsed
              )
            )
          );

          character.magic.slotUsage
            .pactSources[sourceId] =
              used;

          return {
            sourceId,
            classEntryId: sourceId,
            classId:
              cleanString(
                source?.classId
              ),
            className:
              cleanString(
                source?.className,
                "Pact Magic"
              ),
            level,
            maximum,
            used,
            remaining:
              maximum - used
          };
        })
        .filter((source) => {
          return (
            source.maximum > 0 &&
            source.level > 0
          );
        });
    const pact =
      pactSourceRecords[0] || {
        sourceId: "",
        classEntryId: "",
        classId: "",
        className: "Pact Magic",
        level: 0,
        maximum: 0,
        used: 0,
        remaining: 0
      };
    character.magic.slotUsage.pact =
      pact.used;

    return {
      normal,
      pact,
      pactSources:
        pactSourceRecords
    };
  }

  function getSection12DivineSmiteSlotOptions(
    character = creatorState.draft
  ) {
    const usage =
      getSection12SpellSlotUsageState(
        character
      );

    return [
      ...Object.values(usage.normal)
        .map((slot) => {
          return {
            kind: "normal",
            sourceId: "",
            level: slot.level,
            label:
              `Level ${slot.level} slot`,
            maximum: slot.maximum,
            used: slot.used,
            remaining: slot.remaining
          };
        }),
      ...usage.pactSources.map((slot) => {
        return {
          kind: "pact",
          sourceId: slot.sourceId,
          level: slot.level,
          label:
            `${slot.className} Pact slot (level ${slot.level})`,
          maximum: slot.maximum,
          used: slot.used,
          remaining: slot.remaining
        };
      })
    ].filter((slot) => {
      return (
        slot.level > 0 &&
        slot.maximum > 0
      );
    });
  }

  function adjustSection12SpellSlotUsage(
    kind,
    level,
    delta,
    sourceId = ""
  ) {
    const state = getSection12SpellSlotUsageState();
    const change = Math.sign(safeNumber(delta, 0));

    if (kind === "pact") {
      const pactSource =
        state.pactSources.find(
          (source) => {
            return (
              source.sourceId ===
                cleanString(sourceId) ||
              (
                !cleanString(sourceId) &&
                source ===
                  state.pactSources[0]
              )
            );
          }
        );

      if (!pactSource?.maximum) {
        return false;
      }

      const nextUsed = Math.max(
        0,
        Math.min(
          pactSource.maximum,
          pactSource.used + change
        )
      );
      creatorState.draft.magic
        .slotUsage.pactSources[
          pactSource.sourceId
        ] = nextUsed;

      if (
        pactSource ===
        state.pactSources[0]
      ) {
        creatorState.draft.magic
          .slotUsage.pact =
            nextUsed;
      }
    } else {
      const slot = state.normal[String(level)];

      if (!slot) {
        return false;
      }

      creatorState.draft.magic.slotUsage.normal[String(level)] =
        Math.max(
          0,
          Math.min(
            slot.maximum,
            slot.used + change
          )
        );
    }

    applyCompatibilityAliases(creatorState.draft);
    markDraftChanged();
    return true;
  }

  function renderSection12DivineSmiteSlotUsage(
    character,
    options = {}
  ) {
    const readonly =
      options.readonly === true;
    const hasDivineSmite = (
      Array.isArray(character?.classMechanics?.combatProfiles)
        ? character.classMechanics.combatProfiles
        : []
    ).some((profile) => profile.type === "divineSmite");

    if (!hasDivineSmite) {
      return "";
    }

    const slotCards =
      getSection12DivineSmiteSlotOptions(
        character
      );

    if (!slotCards.length) {
      return `<p class="small">Divine Smite is available, but this character currently has no spell slots to spend.</p>`;
    }

    return `
      <h4>Divine Smite Slot Usage</h4>
      <div class="hg-character-choice-grid">
        ${slotCards.map((slot) => {
          const smiteDice = Math.min(5, slot.level + 1);

          return `
            <article class="hg-character-choice-card">
              <h3>${escapeHtml(slot.label)}</h3>
              <p class="small">
                Remaining ${slot.remaining} / ${slot.maximum}
                <br>Smite damage: ${smiteDice}d8${smiteDice < 5 ? "" : " (maximum before creature-type bonus)"}
              </p>
              ${readonly
                ? ""
                : `
                  <div class="hg-character-inline-actions">
                    <button
                      type="button"
                      data-cc-action="adjust-divine-smite-slot"
                      data-slot-kind="${slot.kind}"
                      data-slot-level="${slot.level}"
                      data-slot-source-id="${escapeHtml(slot.sourceId || "")}"
                      data-delta="1"
                      ${slot.remaining <= 0 ? "disabled" : ""}
                    >Spend for Smite</button>
                    <button
                      type="button"
                      data-cc-action="adjust-divine-smite-slot"
                      data-slot-kind="${slot.kind}"
                      data-slot-level="${slot.level}"
                      data-slot-source-id="${escapeHtml(slot.sourceId || "")}"
                      data-delta="-1"
                      ${slot.used <= 0 ? "disabled" : ""}
                    >Restore Slot</button>
                  </div>
                `}
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  function formatSelectedClassMechanicEffect(effect) {
    if (!effect) {
      return "";
    }

    if (effect.summary) {
      return effect.summary;
    }

    if (effect.type === "sneakAttack") {
      return `Sneak Attack ${getProgressionValueByLevel(
        effect.diceByLevel,
        effect.classLevel,
        "1d6"
      )}, once per turn with an eligible finesse or ranged attack.`;
    }

    if (effect.type === "rage") {
      return `Rage adds +${getProgressionValueByLevel(
        effect.damageBonusByLevel,
        effect.classLevel,
        2
      )} Strength-melee damage and grants its recorded resistances while its restrictions are met.`;
    }

    if (effect.type === "martialArts") {
      return `Martial Arts die ${getProgressionValueByLevel(
        effect.dieByLevel,
        effect.classLevel,
        "d4"
      )}; eligible attacks may use Dexterity.`;
    }

    if (effect.type === "wildShape") {
      return `Wild Shape maximum CR ${getProgressionValueByLevel(
        effect.maxCrByLevel,
        effect.classLevel,
        "1/4"
      )}; duration ${Math.max(
        1,
        Math.floor(safeNumber(effect.classLevel, 2) / 2)
      )} hour(s).`;
    }

    if (effect.type === "divineSmite") {
      return "Divine Smite spends one spell slot after an eligible melee weapon hit; damage scales with slot level.";
    }

    if (effect.type === "metamagic") {
      return "Selected Metamagic options spend Sorcery Points using their listed costs.";
    }

    if (effect.type === "maneuverSaveDc") {
      return `Maneuver save DC ${safeNumber(
        effect.saveDc,
        8
      )} (${cleanString(
        effect.saveAbility,
        "str"
      ).toUpperCase()}).`;
    }

    if (effect.type === "subclassFeature") {
      const actionLabels = {
        action: "Action",
        bonusAction: "Bonus action",
        reaction: "Reaction",
        attack: "Attack",
        passive: "Passive"
      };
      const actionLabel =
        actionLabels[
          effect.actionEconomy
        ] || "Passive";
      const saveLabel =
        effect.saveDc
          ? ` Save DC ${effect.saveDc} (${String(effect.saveAbility || "").toUpperCase()}).`
          : "";

      return `${effect.featureName} — ${actionLabel}.${saveLabel}`;
    }

    if (effect.type === "armorClassFormula") {
      const abilities = uniqueCleanArray(
        effect.abilities
      ).map((ability) => {
        return String(ability).toUpperCase();
      });

      return `${effect.featureName}: ${safeNumber(effect.base, 10)}${abilities.length ? ` + ${abilities.join(" + ")}` : ""}. Select this formula separately; unarmored formulas do not stack.`;
    }

    return cleanString(
      effect.option
        ? `${effect.featureName}: ${effect.option}`
        : effect.featureName
    );
  }

  function renderSelectedClassMechanicsSummary(
    character = creatorState.draft,
    options = {}
  ) {
    const readonly =
      options.readonly === true;
    const mechanics = character?.classMechanics || {};
    const resources = Array.isArray(mechanics.resources)
      ? mechanics.resources
      : [];
    const classSaveDcLines =
      (
        Array.isArray(
          mechanics.classSaveDcs
        )
          ? mechanics.classSaveDcs
          : []
      )
        .filter((entry) => {
          return (
            entry.saveDc !== null &&
            entry.saveDc !== undefined
          );
        })
        .map((entry) => {
          return `${entry.className || entry.classId || "Class"} feature save DC ${entry.saveDc} (${String(entry.abilityId || "").toUpperCase()}).`;
        });
    const effectLines = [
      ...(Array.isArray(mechanics.combatProfiles)
        ? mechanics.combatProfiles
        : []),
      ...(Array.isArray(mechanics.passiveEffects)
        ? mechanics.passiveEffects
        : []),
      ...(Array.isArray(mechanics.attackModifiers)
        ? mechanics.attackModifiers
        : []),
      ...(Array.isArray(mechanics.armorClassModifiers)
        ? mechanics.armorClassModifiers
        : []),
      ...(Array.isArray(mechanics.armorClassFormulas)
        ? mechanics.armorClassFormulas
        : []),
      ...(Array.isArray(mechanics.spellModifiers)
        ? mechanics.spellModifiers
        : [])
    ]
      .map(formatSelectedClassMechanicEffect)
      .concat(classSaveDcLines)
      .filter(Boolean)
      .filter((line, index, values) => {
        return values.indexOf(line) === index;
      });
    const restrictionEntries = Array.isArray(mechanics.restrictions)
      ? mechanics.restrictions
      : [];
    const restrictions = restrictionEntries.map((entry) => {
      const labels = {
        cannotCastSpells: "Cannot cast spells while this state is active",
        cannotConcentrate: "Cannot concentrate on spells while this state is active"
      };
      const label = labels[entry.restriction] || entry.restriction;
      return entry.active === true
        ? `ACTIVE: ${label}`
        : label;
    });
    const attacksPerAction = Math.max(
      1,
      safeNumber(
        mechanics.attackAction?.attacks,
        1
      )
    );
    const attackActionLine = attacksPerAction > 1
      ? `Attacks per Attack action: ${attacksPerAction}. Extra Attack features do not stack; the highest available version is used.`
      : "";

    if (
      !resources.length &&
      !effectLines.length &&
      !attackActionLine &&
      !restrictions.length
    ) {
      return "";
    }

    return `
      <h3>Class Feature Mechanics</h3>
      ${resources.length
        ? `
          <div class="hg-character-choice-grid">
            ${resources.map((resourceEntry) => {
              const unlimited = resourceEntry.maximumUses === null;

              return `
                <article class="hg-character-choice-card">
                  <h3>${escapeHtml(resourceEntry.name)}</h3>
                  <p class="small">
                    ${escapeHtml(resourceEntry.className)}
                    ${resourceEntry.shared ? "<br>Shared multiclass pool" : ""}
                    ${resourceEntry.die ? `<br>Die: ${escapeHtml(resourceEntry.die)}` : ""}
                    ${resourceEntry.recharge ? `<br>Recharges: ${escapeHtml(formatSection12Recharge(resourceEntry.recharge))}` : ""}
                  </p>
                  <div class="hg-character-current-choice">
                    <b>Available:</b>
                    ${unlimited
                      ? "Unlimited"
                      : `${safeNumber(resourceEntry.currentUses, 0)} / ${safeNumber(resourceEntry.maximumUses, 0)}`}
                    ${unlimited || readonly
                      ? ""
                      : `
                        <div class="hg-character-inline-actions">
                          <button
                            type="button"
                            data-cc-action="adjust-class-resource"
                            data-resource-id="${escapeHtml(resourceEntry.id)}"
                            data-delta="-1"
                            ${safeNumber(resourceEntry.currentUses, 0) <= 0 ? "disabled" : ""}
                          >Spend</button>
                          <button
                            type="button"
                            data-cc-action="adjust-class-resource"
                            data-resource-id="${escapeHtml(resourceEntry.id)}"
                            data-delta="1"
                            ${safeNumber(resourceEntry.currentUses, 0) >= safeNumber(resourceEntry.maximumUses, 0) ? "disabled" : ""}
                          >Restore</button>
                        </div>
                      `}
                  </div>
                  ${
                    Array.isArray(
                      resourceEntry.spendOptions
                    ) &&
                    resourceEntry
                      .spendOptions.length
                      ? `
                        <p class="small">
                          <b>Options:</b>
                          ${resourceEntry
                            .spendOptions
                            .map((option) => {
                              return `${
                                option.name
                              } (${
                                option.className ||
                                "Class"
                              }${
                                option.saveDc
                                  ? `, DC ${option.saveDc} ${String(option.saveAbility || "").toUpperCase()}`
                                  : ""
                              })`;
                            })
                            .map((label) => {
                              return escapeHtml(label);
                            })
                            .join("; ")}
                        </p>
                      `
                      : ""
                  }
                  ${
                    resourceEntry.canonicalId === "rage" &&
                    !readonly
                      ? `
                        <div class="hg-character-inline-actions">
                          <button
                            type="button"
                            data-cc-action="toggle-rage-state"
                            data-resource-id="${escapeHtml(resourceEntry.id)}"
                            ${
                              character?.combat?.classFeatureStates?.rageActive === true ||
                              safeNumber(resourceEntry.currentUses, 0) > 0
                                ? ""
                                : "disabled"
                            }
                          >${
                            character?.combat?.classFeatureStates?.rageActive === true
                              ? "End Rage"
                              : "Begin Rage (spend 1)"
                          }</button>
                        </div>
                      `
                      : ""
                  }
                </article>
              `;
            }).join("")}
          </div>
        `
        : ""}

      ${renderSection12DivineSmiteSlotUsage(
        character,
        options
      )}

      ${mechanics.spellcastingBlocked
        ? `
          <div class="hg-character-warning">
            <b>Spellcasting blocked:</b> Rage is active. End Rage before casting or concentrating on a spell.
          </div>
        `
        : ""}

      ${attackActionLine || effectLines.length
        ? `
          <ul class="small">
            ${attackActionLine ? `<li>${escapeHtml(attackActionLine)}</li>` : ""}
            ${effectLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
          </ul>
        `
        : ""}
      ${restrictions.length
        ? `<p class="small"><b>Conditional restrictions:</b> ${escapeHtml(restrictions.join("; "))}</p>`
        : ""}
    `;
  }

  function renderSelectedFeatSummary(
    character = creatorState.draft,
    options = {}
  ) {
    const readonly =
      options.readonly === true;
    const instances = getSelectedDefaultFeatInstances(character);
    const resources = Array.isArray(character?.featMechanics?.resources)
      ? character.featMechanics.resources
      : [];
    const spellcasting = Array.isArray(
      character?.featMechanics?.spellcasting
    )
      ? character.featMechanics.spellcasting
      : [];
    const restChoices = Array.isArray(
      character?.featMechanics
        ?.restChoices
    )
      ? character.featMechanics
          .restChoices
      : [];
    const situationalEffects =
      Array.isArray(
        character?.featMechanics
          ?.situationalEffects
      )
        ? character.featMechanics
            .situationalEffects
        : [];

    if (!instances.length) {
      return "";
    }

    return `
      <h3>Feats</h3>
      <div class="hg-character-choice-grid">
        ${instances.map((instance) => {
          const featResources = resources.filter((entry) => {
            return entry.id.startsWith(`${instance.id}:`);
          });
          const featSpellRecords = spellcasting.filter((entry) => {
            return entry.sourceId === instance.id;
          });
          const featRestChoices =
            restChoices.filter((entry) => {
              return entry.sourceId ===
                instance.id;
            });
          const featSituationalEffects =
            situationalEffects.filter(
              (entry) => {
                return entry.sourceId ===
                  instance.id;
              }
            );
          const choiceSummaries = (Array.isArray(instance.feat.choices)
            ? instance.feat.choices
            : []
          ).map((featChoice) => {
            const values = uniqueCleanArray(
              instance.featChoices?.[featChoice.id]
            ).map((value) => {
              return DEFAULT_SPELLS.find((spell) => spell.id === value)?.name || value;
            });

            return values.length
              ? `${featChoice.label || featChoice.id}: ${values.join(", ")}`
              : "";
          }).filter(Boolean);

          return `
            <article class="hg-character-choice-card">
              <h3>${escapeHtml(instance.feat.name)}</h3>
              <p>
                ${escapeHtml(instance.feat.summary || "")}
                <br><span class="small">${escapeHtml(instance.feat.description || "")}</span>
              </p>

              ${choiceSummaries.length
                ? `<ul class="small">${choiceSummaries.map((summary) => {
                    return `<li>${escapeHtml(summary)}</li>`;
                  }).join("")}</ul>`
                : ""}

              ${featSpellRecords.length
                ? `
                  <ul class="small">
                    ${featSpellRecords.map((record) => {
                      const usage = record.atWill === true
                        ? "At will"
                        : record.maximumUses === null
                          ? "Known"
                          : `${safeNumber(record.currentUses, 0)} / ${safeNumber(record.maximumUses, 0)}; recharges ${record.recharge}`;

                      return `
                        <li>
                          ${escapeHtml(record.spellName || record.spellId)}
                          — ${escapeHtml(String(record.spellcastingAbility || "").toUpperCase())};
                          ${escapeHtml(usage)}
                          ${record.canUseSpellSlots === true ? "; may also use spell slots" : ""}
                        </li>
                      `;
                    }).join("")}
                  </ul>
                `
                : ""}

              ${featSituationalEffects.length
                ? `
                  <ul
                    class="small"
                    data-feat-situational-effects="${escapeHtml(instance.feat.id)}"
                  >
                    ${featSituationalEffects.map((entry) => {
                      const handlingLabel = {
                        automatic: "Automatic",
                        tracked: "Tracked",
                        manual: "Manual"
                      }[entry.handling] || "Manual";
                      const economyLabel = {
                        action: "Action",
                        bonusAction: "Bonus action",
                        reaction: "Reaction",
                        passive: "Passive"
                      }[entry.actionEconomy] || "Passive";
                      const timingLabel =
                        cleanString(
                          entry.activationTime
                        );
                      const rechargeLabel =
                        entry.recharge === "none"
                          ? "No separate recharge"
                          : formatSection12Recharge(
                              entry.recharge
                            );
                      const usageLabel =
                        entry.usage?.scope === "perTarget"
                          ? cleanString(
                              entry.usage.label,
                              "Once per target"
                            )
                          : "";

                      return `
                        <li data-feat-situational-effect="${escapeHtml(entry.effectId)}">
                          <b>${escapeHtml(`${handlingLabel} · ${economyLabel}${timingLabel ? ` (${timingLabel})` : ""}`)}</b>
                          — ${escapeHtml(entry.summary)}
                          <br><span>${escapeHtml(`Recharge: ${rechargeLabel}${usageLabel ? ` · ${usageLabel}` : ""}`)}</span>
                          ${entry.condition ? `<br><span><b>When:</b> ${escapeHtml(entry.condition)}</span>` : ""}
                          ${entry.handling === "manual" || entry.handling === "tracked"
                            ? `<br><span><b>Use:</b> ${escapeHtml(entry.instructions)}</span>`
                            : ""}
                        </li>
                      `;
                    }).join("")}
                  </ul>
                `
                : ""}

              ${featRestChoices.map((restChoice) => {
                const label =
                  restChoice.kind ===
                    "damageResistance"
                    ? "Resistance after rest"
                    : "Choice after rest";

                return readonly
                  ? `
                    <p class="small">
                      <b>${escapeHtml(label)}:</b>
                      ${escapeHtml(restChoice.selected)}
                      (change after a ${escapeHtml(restChoice.rest || "long rest")})
                    </p>
                  `
                  : `
                    <label class="small">
                      ${escapeHtml(label)}
                      <select
                        data-cc-action-change="set-feat-rest-choice"
                        data-rest-choice-id="${escapeHtml(restChoice.id)}"
                      >
                        ${uniqueCleanArray(restChoice.options).map((value) => {
                          return `
                            <option
                              value="${escapeHtml(value)}"
                              ${value === restChoice.selected ? "selected" : ""}
                            >
                              ${escapeHtml(value)}
                            </option>
                          `;
                        }).join("")}
                      </select>
                    </label>
                  `;
              }).join("")}

              ${featResources.map((resourceEntry) => {
                return `
                  <div class="hg-character-current-choice">
                    <b>${escapeHtml(resourceEntry.name)}:</b>
                    ${safeNumber(resourceEntry.currentUses, 0)} /
                    ${safeNumber(resourceEntry.maximumUses, 0)}
                    <br><span class="small">Recharges: ${escapeHtml(resourceEntry.recharge)}</span>
                    ${readonly
                      ? ""
                      : `
                        <div class="hg-character-inline-actions">
                          <button
                            type="button"
                            data-cc-action="adjust-feat-resource"
                            data-resource-id="${escapeHtml(resourceEntry.id)}"
                            data-delta="-1"
                            ${safeNumber(resourceEntry.currentUses, 0) <= 0 ? "disabled" : ""}
                          >Spend</button>
                          <button
                            type="button"
                            data-cc-action="adjust-feat-resource"
                            data-resource-id="${escapeHtml(resourceEntry.id)}"
                            data-delta="1"
                            ${safeNumber(resourceEntry.currentUses, 0) >= safeNumber(resourceEntry.maximumUses, 0) ? "disabled" : ""}
                          >Restore</button>
                        </div>
                      `}
                  </div>
                `;
              }).join("")}
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  function getClassIndexForLevelRecord(
    levelRecord,
    character = creatorState.draft
  ) {
    const classEntries =
      getClassProgressionEntries(
        character
      );

    const recordEntryId = cleanString(
      levelRecord?.classEntryId ||
        levelRecord?.entryId
    );
    const recordClassId = makeSafeId(
      levelRecord?.classId ||
        levelRecord?.className,
      ""
    );

    return classEntries.findIndex(
      (classEntry, index) => {
        const key =
          getClassProgressionEntryKey(
            classEntry,
            index
          );

        return (
          key === recordEntryId ||
          makeSafeId(
            classEntry.classId ||
            classEntry.className,
            ""
          ) === recordClassId
        );
      }
    );
  }

  function getLatestLevelUpContext(
    character = creatorState.draft
  ) {
    const records =
      getCharacterLevelHitDieRecords(
        character
      );

    const levelRecord =
      records[records.length - 1] ||
      null;

    if (!levelRecord) {
      return null;
    }

    const classIndex =
      Math.max(
        0,
        getClassIndexForLevelRecord(
          levelRecord,
          character
        )
      );

    const classEntry =
      getClassEntryAtIndex(
        classIndex,
        character
      );

    const template =
      resolveClassTemplateForEntry(
        classEntry
      );

    if (!classEntry || !template) {
      return null;
    }

    const classFeatures =
      collectSection12FeaturesForClassEntry(
        classEntry,
        classIndex
      ).filter((feature) => {
        return (
          Math.round(
            safeNumber(feature.level, 0)
          ) === levelRecord.classLevel
        );
      });

    const subclassOptions =
      (
        Array.isArray(template.subclasses)
          ? template.subclasses
          : []
      ).map((subclass) => {
        return normalizeSection12Subclass(
          subclass,
          template.source || "template"
        );
      });

    const subclassLevel =
      Math.max(
        1,
        Math.round(
          safeNumber(
            template.subclassLevel ||
            classEntry.subclassLevel,
            3
          )
        )
      );

    const asiSlot =
      getUnlockedFeatChoiceSlots(
        character
      ).find((slot) => {
        return (
          cleanString(slot.classEntryId) ===
            getClassProgressionEntryKey(
              classEntry,
              classIndex
            ) &&
          safeNumber(slot.classLevel, 0) ===
            levelRecord.classLevel
        );
      }) ||
      null;

    return {
      levelRecord,
      classIndex,
      classEntry,
      template,
      classFeatures,
      subclassOptions,
      subclassLevel,
      asiSlot
    };
  }

  function renderLatestLevelSubclassUnlock(
    context
  ) {
    if (
      !context ||
      !context.subclassOptions.length ||
      context.levelRecord.classLevel !==
        context.subclassLevel
    ) {
      return "";
    }

    const selectedSubclass =
      getClassEntrySubclassTemplate(
        context.classEntry
      );

    const label =
      context.template.subclassLabel ||
      selectedSubclass?.subclassLabel ||
      "Subclass";

    return `
      <article class="hg-character-choice-card ${selectedSubclass ? "selected" : ""}">
        <h3>
          Latest Level Unlock: ${escapeHtml(label)}
          ${context.levelRecord.classLevel === context.subclassLevel ? "Unlocked" : "Choice"}
        </h3>

        <p>
          ${escapeHtml(context.template.name)}
          chooses ${escapeHtml(label)} at class level
          ${context.subclassLevel}.

          ${
            selectedSubclass
              ? `<br><b>Selected:</b> ${escapeHtml(selectedSubclass.name)}`
              : `<br><b>Status:</b> Pending choice.`
          }
        </p>

        <p class="small">
          Choose or change this selection in Class Progression.
        </p>
      </article>
    `;
  }

  function renderLatestLevelAsiUnlock(
    context
  ) {
    const slot =
      context?.asiSlot;

    if (!slot) {
      return "";
    }

    const feat =
      DEFAULT_FEATS.find((entry) => {
        return entry.id === slot.selectedFeatId;
      });

    const status =
      slot.selectedMode === "feat"
        ? `Feat selected: ${feat?.name || slot.selectedFeatId || "None"}`
        : slot.selectedMode === "asi"
          ? "Ability Score Improvement selected."
          : "Pending ASI or feat choice.";
    const slotFeature = {
      id: slot.id,
      name: "Ability Score Improvement",
      level: slot.classLevel,
      optionSource: "asiOrFeat"
    };

    return `
      <article class="hg-character-choice-card ${slot.selectedMode ? "selected" : ""}">
        <h3>ASI / Feat Unlocked</h3>

        <p>
          ${escapeHtml(slot.label)}

          <br>

          <b>Status:</b>
          ${escapeHtml(status)}
        </p>

        ${renderSection12AsiChoice(slotFeature)}
      </article>
    `;
  }

  function renderLatestLevelFeatureUnlocks(
    context
  ) {
    if (!context) {
      return "";
    }

    const featureCards =
      context.classFeatures
        .map((feature) => {
          return `
            <article class="hg-character-choice-card">
              <h3>
                ${escapeHtml(feature.name)}
              </h3>

              <p class="small">
                ${escapeHtml(
                  feature.summary ||
                  "No summary provided."
                )}
              </p>

              <p
                class="small"
                data-feature-full-description="true"
              >
                ${escapeHtml(
                  feature.description ||
                  "No full description provided."
                )}
              </p>

              ${renderClassFeatureMetadata(
                feature
              )}

              ${renderSection12FeatureMechanics(feature)}
            </article>
          `;
        })
        .join("");

    return `
      <div class="hg-character-choice-grid">
        ${featureCards ||
          `
            <div class="hg-character-placeholder">
              No class features are recorded for this exact level.
            </div>
          `}
      </div>
    `;
  }

  function renderLatestLevelUnlockSummary(
    character = creatorState.draft
  ) {
    const context =
      getLatestLevelUpContext(
        character
      );

    if (!context) {
      return "";
    }

    return `
      <hr>

      <h3>Latest Level Unlock</h3>

      <div class="hg-character-current-choice">
        <b>Character Level ${context.levelRecord.characterLevel}:</b>
        ${escapeHtml(context.levelRecord.className || "Class")}
        class level ${context.levelRecord.classLevel}

        <br>

        These are the features and choices tied to the latest
        level in the current level order.
      </div>

      <div class="hg-character-choice-grid">
        ${renderLatestLevelSubclassUnlock(context)}
        ${renderLatestLevelAsiUnlock(context)}
      </div>

      <h3>Features Gained at This Class Level</h3>

      ${renderLatestLevelFeatureUnlocks(context)}
    `;
  }

  function getDefaultLevelUpClassIndex(
    character = creatorState.draft
  ) {
    const classes =
      getClassProgressionEntries(
        character
      );

    const levelOrder =
      normalizeClassLevelOrder(
        character
          ?.classProgression
          ?.levelOrder,
        classes
      );

    const lastClassKey =
      levelOrder[
        levelOrder.length - 1
      ];

    const foundIndex =
      classes.findIndex((classEntry, index) => {
        return (
          getClassProgressionEntryKey(
            classEntry,
            index
          ) === lastClassKey
        );
      });

    return foundIndex >= 0
      ? foundIndex
      : 0;
  }

  function renderLevelUpWorkflow(
    character = creatorState.draft
  ) {
    const classes =
      getClassProgressionEntries(
        character
      );

    const entries =
      getMulticlassSummaryEntries(
        character
      );

    const totalLevel =
      calculateClassProgressionTotalLevel(
        character
      );

    const records =
      getCharacterLevelHitDieRecords(
        character
      );

    const lastRecord =
      records[records.length - 1] ||
      null;

    const defaultIndex =
      getDefaultLevelUpClassIndex(
        character
      );

    const levelUpChoices =
      entries.length
        ? entries.map((entry, index) => {
            return {
              value: index,
              label:
                `${entry.className} (currently level ${entry.classLevel})`
            };
          })
        : [
            {
              value: "",
              label: "Choose a class first"
            }
          ];

    return `
      <h3>Level Up Workflow</h3>

      <div class="hg-character-beginner-note">
        <strong>To multiclass:</strong>
        <p>
          1. Pick a class in Add Multiclass.<br>
          2. Click Add Selected Class.<br>
          3. Use Level Up Workflow to decide which class gains future levels.
        </p>
      </div>

      <div class="hg-character-current-choice">
        <b>Current Character Level:</b>
        ${totalLevel} / 20

        <br>

        <b>Next Character Level:</b>
        ${
          totalLevel < 20
            ? totalLevel + 1
            : "Maximum level reached"
        }

        <br>

        <b>Last Character Level:</b>
        ${
          lastRecord
            ? `${escapeHtml(lastRecord.className || "Class")} ${safeNumber(lastRecord.classLevel, 1)} at character level ${safeNumber(lastRecord.characterLevel, totalLevel)}`
            : "None yet"
        }

        <br>

        Use this to add the next character level in order. Add a new
        class below first if the next level should start a multiclass.
      </div>

      <div class="hg-character-field-grid three">
        ${wizardSelect(
          "Class Gaining Next Level",
          "ccLevelUpClassIndex",
          defaultIndex,
          levelUpChoices,
          {
            wide: true,
            extra:
              !classes.length ||
              totalLevel >= 20
                ? "disabled"
                : ""
          }
        )}

        <div class="hg-character-field">
          <label>
            Add Level
          </label>

          <button
            type="button"
            data-cc-action="add-character-level"
            ${
              !classes.length ||
              totalLevel >= 20
                ? "disabled"
                : ""
            }
          >
            Add Character Level
          </button>
        </div>

        <div class="hg-character-field">
          <label>
            Undo Last Level
          </label>

          <button
            type="button"
            data-cc-action="remove-last-character-level"
            ${totalLevel <= 1 ? "disabled" : ""}
          >
            Remove Last Level
          </button>
        </div>
      </div>

      ${renderLatestLevelUnlockSummary(character)}
    `;
  }

  function calculateClassProgressionTotalLevelUncached(
    character = creatorState.draft
  ) {
    const classes =
      Array.isArray(
        character
          ?.classProgression
          ?.classes
      )
        ? character
            .classProgression
            .classes
        : [];

    const total =
      classes.reduce(
        (sum, classEntry) => {
          return (
            sum +
            Math.max(
              0,
              Math.round(
                safeNumber(
                  classEntry?.level,
                  0
                )
              )
            )
          );
        },
        0
      );

    return clampLevel(total || 1);
  }

  function calculateClassProgressionTotalLevel(
    character = creatorState.draft
  ) {
    const levels = (
      character?.classProgression
        ?.classes || []
    ).map((entry) => entry?.level);

    return derivedCache.get(
      "class-progression-level",
      createDerivedSignature(levels),
      () => calculateClassProgressionTotalLevelUncached(
        character
      )
    );
  }

  function recalculateClassTotalLevel(
    character = creatorState.draft
  ) {
    ensureClassProgressionEntryData(
      character
    );

    syncClassLevelOrderToClassLevels(
      character
    );

    character.classProgression.totalLevel =
      enforceClassProgressionLevelCap(
        character
      );

    syncFirstUnarmoredDefenseSource(
      character
    );

    return character.classProgression.totalLevel;
  }

  function getClassProgressionEntries(
    character = creatorState.draft
  ) {
    return Array.isArray(
      character
        ?.classProgression
        ?.classes
    )
      ? character.classProgression.classes
      : [];
  }

  function getClassEntryAtIndex(
    classIndex,
    character = creatorState.draft
  ) {
    const index =
      Math.max(
        0,
        Math.round(
          safeNumber(classIndex, 0)
        )
      );

    return (
      getClassProgressionEntries(
        character
      )[index] ||
      null
    );
  }

  function getClassEntryLevel(
    classEntry,
    fallbackLevel = 1
  ) {
    return Math.max(
      0,
      Math.min(
        20,
        Math.round(
          safeNumber(
            classEntry?.level,
            fallbackLevel
          )
        )
      )
    );
  }

  function createClassProgressionEntry(
    classTemplate,
    level = 1
  ) {
    if (!classTemplate) {
      return null;
    }

    const existingEntries =
      getClassProgressionEntries();
    const existingIds = new Set(
      existingEntries
        .map((entry) => {
          return cleanString(entry?.entryId);
        })
        .filter(Boolean)
    );

    return {
      entryId: createClassEntryId(
        classTemplate.id ||
          classTemplate.name,
        existingEntries.length,
        existingIds
      ),
      classId: classTemplate.id,
      className: classTemplate.name,
      source: classTemplate.source,
      level: Math.max(
        1,
        Math.min(
          20,
          Math.round(
            safeNumber(level, 1)
          )
        )
      ),
      subclassId: "",
      subclassName: "",
      hitDie: normalizeClassEntryHitDie(
        classTemplate.hitDie,
        8
      ),
      templateSnapshot:
        findDefaultClassDefinition(
          classTemplate.id,
          classTemplate.name
        )
          ? null
          : cloneData(classTemplate),
      choices: {}
    };
  }

  function getClassEntrySubclassTemplate(
    classEntry
  ) {
    if (!classEntry) {
      return null;
    }

    const savedSnapshot =
      classEntry.choices
        ?.subclassSnapshot;

    const template =
      resolveClassTemplateForEntry(
        classEntry
      );

    const subclassId =
      cleanString(classEntry.subclassId);

    const subclassName =
      cleanString(classEntry.subclassName)
        .toLowerCase();

    const normalizedSavedSnapshot =
      savedSnapshot
        ? normalizeSection12Subclass(
            savedSnapshot,
            "character"
          )
        : null;

    const matchedTemplateSubclass =
      (
        Array.isArray(template?.subclasses)
          ? template.subclasses
          : []
      )
        .map((subclass) => {
          return normalizeSection12Subclass(
            subclass,
            template?.source || "template"
          );
        })
        .find((subclass) => {
          return (
            subclass.id === subclassId ||
            subclass.id ===
              normalizedSavedSnapshot?.id ||
            (
              subclassName &&
              subclass.name.toLowerCase() ===
                subclassName
            ) ||
            (
              normalizedSavedSnapshot?.name &&
              subclass.name.toLowerCase() ===
                normalizedSavedSnapshot.name
                  .toLowerCase()
            )
          );
        }) ||
      null;

    const classId =
      makeSafeId(
        classEntry.classId ||
        template?.id,
        ""
      );

    const snapshotClassId =
      makeSafeId(
        normalizedSavedSnapshot?.classId,
        ""
      );

    const customSnapshot =
      Boolean(
        savedSnapshot &&
        (
          /custom|homebrew/i.test(
            savedSnapshot.source ||
            ""
          ) ||
          /custom|homebrew/i.test(
            savedSnapshot.sourceType ||
            ""
          )
        )
      );

    const snapshotBelongsToClass =
      Boolean(
        normalizedSavedSnapshot &&
        (
          matchedTemplateSubclass ||
          (
            customSnapshot &&
            (
              !snapshotClassId ||
              snapshotClassId === classId
            )
          ) ||
          (
            !findDefaultClassDefinition(
              classEntry.classId,
              classEntry.className
            ) &&
            (
              !snapshotClassId ||
              snapshotClassId === classId
            )
          )
        )
      );

    if (
      normalizedSavedSnapshot &&
      matchedTemplateSubclass &&
      findDefaultClassDefinition(
        classEntry.classId,
        classEntry.className
      )
    ) {
      return normalizeSection12Subclass(
        {
          ...cloneData(
            normalizedSavedSnapshot
          ),
          ...cloneData(
            matchedTemplateSubclass
          )
        },
        matchedTemplateSubclass.source ||
        "template"
      );
    }

    if (
      normalizedSavedSnapshot &&
      snapshotBelongsToClass
    ) {
      return normalizedSavedSnapshot;
    }

    return matchedTemplateSubclass;
  }

  function getSkillDefinitionByIdOrName(
    skillIdOrName
  ) {
    const cleanSkill =
      cleanString(skillIdOrName)
        .toLowerCase();

    if (!cleanSkill) {
      return null;
    }

    return (
      SKILL_DEFINITIONS.find((skill) => {
        return (
          skill.id.toLowerCase() ===
            cleanSkill ||
          skill.name.toLowerCase() ===
            cleanSkill
        );
      }) ||
      null
    );
  }

  function getClassEntrySkillChoiceConfig(
    classEntry,
    classIndex = 0,
    character = creatorState.draft
  ) {
    const template =
      resolveClassTemplateForEntry(
        classEntry
      );

    if (!template) {
      return {
        choose: 0,
        from: []
      };
    }

    const baseChoices =
      template.skillChoices || {};

    if (
      isStartingClassEntry(
        classEntry,
        character,
        classIndex
      )
    ) {
      return {
        choose: Math.max(
          0,
          Math.round(
            safeNumber(
              baseChoices.choose,
              0
            )
          )
        ),
        from: cleanArray(
          baseChoices.from
        )
      };
    }

    const rule =
      getMulticlassProficiencyRule(
        classEntry
      );

    return {
      choose: Math.max(
        0,
        Math.round(
          safeNumber(
            rule.skillChoices?.choose,
            0
          )
        )
      ),
      from: cleanArray(
        rule.skillChoices?.from?.length
          ? rule.skillChoices.from
          : baseChoices.from
      )
    };
  }

  function getClassEntryStoredSkillIds(
    classEntry
  ) {
    classEntry.choices =
      classEntry.choices || {};

    classEntry.choices.skillProficiencyIds =
      cleanArray(
        classEntry.choices
          .skillProficiencyIds
      );

    return classEntry.choices
      .skillProficiencyIds;
  }

  function getClassEntryToolChoiceConfig(
    classEntry,
    classIndex = 0,
    character = creatorState.draft
  ) {
    if (
      isStartingClassEntry(
        classEntry,
        character,
        classIndex
      )
    ) {
      return {
        choose: 0,
        label: "tool proficiency",
        from: []
      };
    }

    const rule =
      getMulticlassProficiencyRule(
        classEntry
      );

    return {
      choose: Math.max(
        0,
        Math.round(
          safeNumber(
            rule.toolChoices?.choose,
            0
          )
        )
      ),
      label: cleanString(
        rule.toolChoices?.label,
        "tool proficiency"
      ),
      from: cleanArray(
        rule.toolChoices?.from
      )
    };
  }

  function getClassEntryStoredToolChoices(
    classEntry
  ) {
    return cleanArray(
      classEntry?.choices
        ?.toolProficiencyIds
    );
  }

  function getClassEntryToolChoiceOptions(
    classEntry,
    classIndex = 0,
    character = creatorState.draft
  ) {
    const config =
      getClassEntryToolChoiceConfig(
        classEntry,
        classIndex,
        character
      );

    const configuredOptions =
      cleanArray(config.from);

    const sourceOptions =
      configuredOptions.length
        ? configuredOptions
        : [config.label];

    return uniqueCleanArray(
      sourceOptions.flatMap((option) => {
        return expandSection14ToolChoice(
          option
        );
      })
    ).sort((a, b) => {
      return a.localeCompare(b);
    });
  }

  function getValidClassEntryToolChoices(
    classEntry,
    classIndex = 0,
    character = creatorState.draft
  ) {
    const config =
      getClassEntryToolChoiceConfig(
        classEntry,
        classIndex,
        character
      );

    const allowed = new Set(
      cleanArray(config.from).map((value) => {
        return value.toLowerCase();
      })
    );

    return getClassEntryStoredToolChoices(
      classEntry
    )
      .filter((value) => {
        return (
          !allowed.size ||
          allowed.has(value.toLowerCase())
        );
      })
      .slice(0, config.choose);
  }

  function getMulticlassPendingToolChoiceWarnings(
    character = creatorState.draft
  ) {
    return getClassProgressionEntries(
      character
    ).flatMap((classEntry, classIndex) => {
      const config =
        getClassEntryToolChoiceConfig(
          classEntry,
          classIndex,
          character
        );

      if (config.choose <= 0) {
        return [];
      }

      const selectedCount =
        getValidClassEntryToolChoices(
          classEntry,
          classIndex,
          character
        ).length;

      if (selectedCount === config.choose) {
        return [];
      }

      const className =
        safeDisplayString(
          classEntry?.className,
          `Class ${classIndex + 1}`
        );

      return [
        `${className} multiclass proficiency choice is pending: choose ${config.choose} ${config.label}${config.choose === 1 ? "" : "s"}.`
      ];
    });
  }

  function getMulticlassPendingSkillChoiceWarnings(
    character = creatorState.draft
  ) {
    return getClassProgressionEntries(
      character
    ).flatMap((classEntry, classIndex) => {
      if (
        isStartingClassEntry(
          classEntry,
          character,
          classIndex
        )
      ) {
        return [];
      }

      const config =
        getClassEntrySkillChoiceConfig(
          classEntry,
          classIndex,
          character
        );

      if (config.choose <= 0) {
        return [];
      }

      const selectedCount =
        countValidClassEntrySkillChoices(
          classEntry,
          classIndex,
          character
        );

      if (selectedCount === config.choose) {
        return [];
      }

      const className =
        safeDisplayString(
          classEntry?.className,
          `Class ${classIndex + 1}`
        );

      return [
        `${className} multiclass skill choice is pending: choose ${config.choose} skill proficienc${config.choose === 1 ? "y" : "ies"}.`
      ];
    });
  }

  function getValidClassEntrySkillIds(
    classEntry,
    classIndex = 0,
    character = creatorState.draft
  ) {
    const config =
      getClassEntrySkillChoiceConfig(
        classEntry,
        classIndex,
        character
      );

    const allowedNames =
      cleanArray(config.from)
        .map((name) => {
          return name.toLowerCase();
        });

    const selected =
      getClassEntryStoredSkillIds(
        classEntry
      )
        .map(getSkillDefinitionByIdOrName)
        .filter((skill) => {
          return (
            skill &&
            (
              !allowedNames.length ||
              allowedNames.includes(
                skill.name.toLowerCase()
              )
            )
          );
        })
        .map((skill) => skill.id);

    return [
      ...new Set(selected)
    ].slice(
      0,
      config.choose
    );
  }

  function countValidClassEntrySkillChoices(
    classEntry,
    classIndex = 0,
    character = creatorState.draft
  ) {
    return getValidClassEntrySkillIds(
      classEntry,
      classIndex,
      character
    ).length;
  }

  function applyStoredClassSkillProficiencies(
    classEntry,
    classIndex = 0,
    character = creatorState.draft
  ) {
    const sourceLabel =
      getClassSourceLabel(
        classEntry
      );

    const config =
      getClassEntrySkillChoiceConfig(
        classEntry,
        classIndex,
        character
      );

    if (
      !sourceLabel ||
      config.choose <= 0
    ) {
      return;
    }

    const selectedIds =
      getValidClassEntrySkillIds(
        classEntry,
        classIndex,
        character
      );

    classEntry.choices =
      classEntry.choices || {};

    classEntry.choices.skillProficiencyIds =
      selectedIds;

    selectedIds.forEach((skillId) => {
      const skill =
        getSkillDefinitionByIdOrName(
          skillId
        );

      if (!skill) {
        return;
      }

      const current =
        getSection14SkillEntry(
          skill
        );

      setSection14SkillEntry(
        skill,
        {
          proficient: true,
          expertise:
            current.expertise === true,
          source: [
            ...new Set([
              ...cleanArray(
                current.source
              ),
              sourceLabel
            ])
          ]
        }
      );
    });
  }

  function applyClassProgressionProficiencies(
    character = creatorState.draft
  ) {
    removeSkillProficiencySourcesByPrefix([
      "class:"
    ]);

    removeListProficiencySourcesByPrefix([
      "class:"
    ]);

    getClassProgressionEntries(
      character
    ).forEach((classEntry, index) => {
      const template =
        resolveClassTemplateForEntry(
          classEntry
        );

      const sourceLabel =
        getClassSourceLabel(
          classEntry
        );

      if (
        !template ||
        !sourceLabel
      ) {
        return;
      }

      const isStartingClass =
        isStartingClassEntry(
          classEntry,
          character,
          index
        );

      if (isStartingClass) {
        setSourceProficiencyList(
          "savingThrows",
          template.savingThrows || [],
          sourceLabel
        );

        setSourceProficiencyList(
          "armor",
          template.armorProficiencies || [],
          sourceLabel
        );

        setSourceProficiencyList(
          "weapons",
          template.weaponProficiencies || [],
          sourceLabel
        );

        setSourceProficiencyList(
          "tools",
          template.toolProficiencies || [],
          sourceLabel
        );
      } else {
        const rule =
          getMulticlassProficiencyRule(
            classEntry
          );

        setSourceProficiencyList(
          "armor",
          rule.armor || [],
          sourceLabel
        );

        setSourceProficiencyList(
          "weapons",
          rule.weapons || [],
          sourceLabel
        );

        setSourceProficiencyList(
          "tools",
          [
            ...(rule.tools || []),
            ...getValidClassEntryToolChoices(
              classEntry,
              index,
              character
            )
          ],
          sourceLabel
        );
      }

      applyStoredClassSkillProficiencies(
        classEntry,
        index,
        character
      );
    });
  }

  function formatClassEntryProficiencySummary(
    classEntry,
    classIndex = 0,
    character = creatorState.draft
  ) {
    const template =
      resolveClassTemplateForEntry(
        classEntry
      );

    if (!template) {
      return "No class proficiency data.";
    }

    const config =
      getClassEntrySkillChoiceConfig(
        classEntry,
        classIndex,
        character
      );

    const isStartingClass =
      isStartingClassEntry(
        classEntry,
        character,
        classIndex
      );

    const lists =
      isStartingClass
        ? {
            savingThrows:
              template.savingThrows || [],
            armor:
              template.armorProficiencies || [],
            weapons:
              template.weaponProficiencies || [],
            tools:
              template.toolProficiencies || []
          }
        : {
            savingThrows: [],
            armor:
              getMulticlassProficiencyRule(
                classEntry
              ).armor || [],
            weapons:
              getMulticlassProficiencyRule(
                classEntry
              ).weapons || [],
            tools:
              [
                ...(
                  getMulticlassProficiencyRule(
                    classEntry
                  ).tools || []
                ),
                ...getValidClassEntryToolChoices(
                  classEntry,
                  classIndex,
                  character
                )
              ]
          };

    const parts = [];

    if (lists.savingThrows.length) {
      parts.push(
        `Saving throws: ${formatSection12List(lists.savingThrows)}`
      );
    }

    if (lists.armor.length) {
      parts.push(
        `Armor: ${formatSection12List(lists.armor)}`
      );
    }

    if (lists.weapons.length) {
      parts.push(
        `Weapons: ${formatSection12List(lists.weapons)}`
      );
    }

    if (lists.tools.length) {
      parts.push(
        `Tools: ${formatSection12List(lists.tools)}`
      );
    }

    if (config.choose > 0) {
      parts.push(
        `Skills: choose ${config.choose}`
      );
    }

    return parts.length
      ? parts.join("; ")
      : isStartingClass
        ? "No listed class proficiencies."
        : "No additional multiclass proficiencies.";
  }

  function toggleMulticlassSkillChoice(
    classIndex,
    skillId
  ) {
    const index =
      Math.max(
        0,
        Math.round(
          safeNumber(classIndex, 0)
        )
      );

    const classEntry =
      getClassEntryAtIndex(index);

    if (!classEntry) {
      return false;
    }

    const config =
      getClassEntrySkillChoiceConfig(
        classEntry,
        index
      );

    const skill =
      getSkillDefinitionByIdOrName(
        skillId
      );

    const allowedNames =
      cleanArray(config.from)
        .map((name) => {
          return name.toLowerCase();
        });

    if (
      !skill ||
      config.choose <= 0 ||
      (
        allowedNames.length &&
        !allowedNames.includes(
          skill.name.toLowerCase()
        )
      )
    ) {
      return false;
    }

    const choices =
      getClassEntryStoredSkillIds(
        classEntry
      );

    const alreadySelected =
      choices.includes(skill.id);

    if (alreadySelected) {
      classEntry.choices.skillProficiencyIds =
        choices.filter((id) => {
          return id !== skill.id;
        });
    } else if (
      choices.length >= config.choose
    ) {
      setStatus(
        `Choose only ${config.choose} ${classEntry.className || "class"} multiclass skill${config.choose === 1 ? "" : "s"}.`
      );

      return false;
    } else {
      classEntry.choices.skillProficiencyIds = [
        ...choices,
        skill.id
      ];
    }

    applyClassProgressionProficiencies();
    applyCompatibilityAliases(
      creatorState.draft
    );
    markDraftChanged();

    return true;
  }

  function toggleMulticlassToolChoice(
    classIndex,
    toolValue
  ) {
    const index =
      Math.max(
        0,
        Math.round(
          safeNumber(classIndex, 0)
        )
      );

    const classEntry =
      getClassEntryAtIndex(index);

    if (!classEntry) {
      return false;
    }

    const config =
      getClassEntryToolChoiceConfig(
        classEntry,
        index
      );
    const tool = cleanString(
      toolValue
    );
    const options =
      getClassEntryToolChoiceOptions(
        classEntry,
        index
      );

    if (
      config.choose <= 0 ||
      !options.includes(tool)
    ) {
      return false;
    }

    classEntry.choices = {
      ...(classEntry.choices || {})
    };

    const choices =
      getClassEntryStoredToolChoices(
        classEntry
      );
    const alreadySelected =
      choices.includes(tool);

    if (alreadySelected) {
      classEntry.choices
        .toolProficiencyIds =
          choices.filter((value) => {
            return value !== tool;
          });
    } else if (
      choices.length >= config.choose
    ) {
      setStatus(
        `Choose only ${config.choose} ${config.label}${config.choose === 1 ? "" : "s"}.`
      );

      return false;
    } else {
      classEntry.choices
        .toolProficiencyIds = [
          ...choices,
          tool
        ];
    }

    applyClassProgressionProficiencies();
    applyCompatibilityAliases(
      creatorState.draft
    );
    markDraftChanged();

    return true;
  }

  function collectSection12FeaturesForClassEntry(
    classEntry,
    classIndex = 0
  ) {
    const template =
      resolveClassTemplateForEntry(
        classEntry
      );

    if (!template) {
      return [];
    }

    const classLevel =
      getClassEntryLevel(
        classEntry,
        1
      );

    const classLabel =
      safeDisplayString(
        classEntry?.className,
        template.name ||
        `Class ${classIndex + 1}`
      );

    const defaultClass =
      findDefaultClassDefinition(
        classEntry?.classId,
        classEntry?.className
      );

    const classFeatures =
      defaultClass
        ? getDefaultClassFeaturesThroughLevel(
            defaultClass,
            classLevel
          )
        : collectSection12Features(
            template,
            classLevel,
            "class"
          );

    const subclassFeatures =
      collectSection12Features(
        getClassEntrySubclassTemplate(
          classEntry
        ),
        classLevel,
        "subclass"
      );

    return [
      ...classFeatures,
      ...subclassFeatures
    ].map((feature) => {
      const classEntryId =
        getClassProgressionEntryKey(
          classEntry,
          classIndex
        );

      return {
        ...feature,
        classIndex,
        classEntryId,
        choiceKey: `${classEntryId}:${feature.id}`,
        classId:
          classEntry?.classId ||
          template.id ||
          "",
        className: classLabel,
        classLevel
      };
    });
  }

  function getPendingClassFeatureChoiceWarnings(
    character = creatorState.draft
  ) {
    return getClassProgressionEntries(
      character
    ).flatMap((classEntry, classIndex) => {
      return collectSection12FeaturesForClassEntry(
        classEntry,
        classIndex
      ).flatMap((feature) => {
        const optionSource =
          cleanString(
            feature.optionSource
          ).toLowerCase();

        if (
          feature.type !== "choice" ||
          [
            "subclasses",
            "asiorfeat"
          ].includes(optionSource)
        ) {
          return [];
        }

        const options =
          getSection12FeatureChoiceOptions(
            feature
          );
        const required =
          getSection12FeatureChooseCount(
            feature
          );
        const selected =
          getSection12FeatureStoredChoices(
            feature
          ).filter((choice) => {
            return options.includes(choice);
          });

        if (
          !options.length ||
          selected.length >= required
        ) {
          return [];
        }

        return [
          `${feature.className || classEntry.className || "Class"} class level ${feature.level} has a pending ${feature.name} choice (${selected.length}/${required}).`
        ];
      });
    });
  }

  function getClassProgressionPendingChoiceWarnings(
    character = creatorState.draft
  ) {
    const warnings = [
      ...getPendingClassFeatureChoiceWarnings(
        character
      ),
      ...getMulticlassPendingSkillChoiceWarnings(
        character
      ),
      ...getMulticlassPendingToolChoiceWarnings(
        character
      )
    ];

    getMulticlassSummaryEntries(
      character
    ).forEach((entry) => {
      const subclassOptions =
        Array.isArray(
          entry.template?.subclasses
        )
          ? entry.template.subclasses
          : [];

      if (
        subclassOptions.length > 0 &&
        entry.classLevel >=
          entry.subclassLevel &&
        !entry.subclassName
      ) {
        warnings.push(
          `${entry.className} has a pending subclass choice at class level ${entry.subclassLevel}.`
        );
      }
    });

    getUnlockedFeatChoiceSlots(
      character
    )
      .filter((slot) => {
        return (
          !slot.selectedMode ||
          (
            slot.selectedMode === "feat" &&
            !slot.selectedFeatId
          )
        );
      })
      .forEach((slot) => {
        warnings.push(
          `${slot.className} class level ${slot.classLevel} has a pending ASI or feat choice.`
        );
      });

    return uniqueCleanArray(
      warnings
    );
  }

  function pruneAbandonedClassFeatureChoices(
    character = creatorState.draft
  ) {
    const activeChoiceIds = new Set();
    const primaryChoiceIds = new Set();
    const removedFeatIds = [];

    getClassProgressionEntries(
      character
    ).forEach((classEntry, classIndex) => {
      const availableIds = new Set();

      collectSection12FeaturesForClassEntry(
        classEntry,
        classIndex
      ).forEach((feature) => {
        availableIds.add(feature.id);
        availableIds.add(
          getSection12FeatureChoiceKey(
            feature
          )
        );
      });

      getUnlockedFeatChoiceSlots(
        character
      )
        .filter((slot) => {
          return (
            slot.classEntryId ===
            getClassProgressionEntryKey(
              classEntry,
              classIndex
            )
          );
        })
        .forEach((slot) => {
          availableIds.add(slot.id);
          availableIds.add(slot.legacyId);
          availableIds.add(slot.featureId);
        });

      availableIds.delete("");

      availableIds.forEach((id) => {
        activeChoiceIds.add(id);

        if (
          isStartingClassEntry(
            classEntry,
            character,
            classIndex
          )
        ) {
          primaryChoiceIds.add(id);
        }
      });

      classEntry.choices = {
        ...(classEntry.choices || {})
      };

      const storedChoices =
        normalizeClassChoiceMap(
          classEntry.choices
            .classFeatures
        );

      Object.keys(storedChoices)
        .forEach((choiceId) => {
          if (availableIds.has(choiceId)) {
            return;
          }

          storedChoices[choiceId]
            .filter((value) => {
              return value.startsWith(
                "feat:"
              );
            })
            .forEach((value) => {
              removedFeatIds.push(
                value.slice(
                  "feat:".length
                )
              );
            });

          delete storedChoices[choiceId];
        });

      classEntry.choices
        .classFeatures =
          storedChoices;
    });

    const compatibilityChoices =
      normalizeClassChoiceMap(
        character.classChoices
      );

    Object.keys(compatibilityChoices)
      .forEach((choiceId) => {
        if (
          primaryChoiceIds.has(choiceId)
        ) {
          return;
        }

        compatibilityChoices[choiceId]
          .filter((value) => {
            return value.startsWith(
              "feat:"
            );
          })
          .forEach((value) => {
            removedFeatIds.push(
              value.slice(
                "feat:".length
              )
            );
          });

        delete compatibilityChoices[
          choiceId
        ];
      });

    character.classChoices =
      compatibilityChoices;

    removedFeatIds.forEach(
      removeSection12AsiFeatIfUnused
    );

    return activeChoiceIds;
  }

  function pruneRemovedClassSpellSources(
    character = creatorState.draft
  ) {
    const store =
      getSection16ClassSourceStore(
        character
      );
    const activeSourceKeys = new Set(
      getSpellcastingClassOptions(
        character
      )
        .map(getSection16SourceKey)
        .filter(Boolean)
    );
    const removedSourceKeys = [];

    Object.keys(store)
      .forEach((sourceKey) => {
        if (
          activeSourceKeys.has(sourceKey)
        ) {
          return;
        }

        removedSourceKeys.push(
          sourceKey
        );
        delete store[sourceKey];
      });

    if (
      character === creatorState.draft &&
      removedSourceKeys.length
    ) {
      syncSection16LegacySpellAliases();
    }

    return removedSourceKeys;
  }

  function refreshClassProgressionDerivedValues(
    options = {}
  ) {
    const draft =
      creatorState.draft;

    const totalLevel =
      recalculateClassTotalLevel(
        draft
      );

    pruneAbandonedClassFeatureChoices(
      draft
    );

    pruneRemovedClassSpellSources(
      draft
    );

    draft.combat.proficiencyBonus =
      getGenericProficiencyBonus(
        totalLevel
      );

    draft.combat.hitDice =
      calculateCharacterHitDice(
        draft
      );

    applyClassProgressionProficiencies(
      draft
    );

    if (
      options.refreshSpecies !== false
    ) {
      clearSection11SpeciesMechanics();
      applySection11SpeciesMechanics();
    }

    applySelectedFeatMechanics();

    refreshSelectedClassFeatures();

    calculateSection16SpellcastingValues({
      markDraft: false
    });

    applyCompatibilityAliases(
      draft
    );

    return totalLevel;
  }

  function tryAddMulticlassClass(
    classId
  ) {
    const cleanClassId =
      cleanString(classId);

    if (!cleanClassId) {
      return {
        ok: false,
        reason: "empty-class-id",
        classId: "",
        className: "",
        message:
          "Choose a class to add first.",
        failedPrerequisites: []
      };
    }

    const selectedClass =
      getAllClassTemplates().find((classData) => {
        return classData.id === cleanClassId;
      });

    if (!selectedClass) {
      return {
        ok: false,
        reason: "class-not-found",
        classId: cleanClassId,
        className: "",
        message:
          "That class could not be found.",
        failedPrerequisites: []
      };
    }

    const classes =
      getClassProgressionEntries();

    const existingClass =
      classes.find((classEntry) => {
        const template =
          resolveClassTemplateForEntry(
            classEntry
          );

        return (
          classEntry?.classId === selectedClass.id ||
          template?.id === selectedClass.id
        );
      });

    if (existingClass) {
      return {
        ok: false,
        reason: "duplicate-class",
        classId: selectedClass.id,
        className: selectedClass.name,
        message:
          "That class is already in this character's progression.",
        failedPrerequisites: []
      };
    }

    const currentTotal =
      recalculateClassTotalLevel(
        creatorState.draft
      );

    if (currentTotal >= 20) {
      return {
        ok: false,
        reason: "maximum-level",
        classId: selectedClass.id,
        className: selectedClass.name,
        message:
          "Character is already level 20.",
        failedPrerequisites: []
      };
    }

    if (classes.length) {
      const failedPrerequisites =
        getMulticlassPrerequisiteResults(
          creatorState.draft,
          selectedClass.id
        ).filter((result) => {
          return !result.met;
        });

      if (failedPrerequisites.length) {
        const failureSummary =
          failedPrerequisites
            .map(
              formatMulticlassPrerequisiteFailure
            )
            .join("; ");

        return {
          ok: false,
          reason: "prerequisites-not-met",
          classId: selectedClass.id,
          className: selectedClass.name,
          message:
            `Multiclass prerequisites are not met: ${failureSummary}.`,
          failedPrerequisites:
            cloneData(
              failedPrerequisites
            )
        };
      }
    }

    if (!classes.length) {
      creatorState.draft
        .classProgression
        .classes = [
          createClassProgressionEntry(
            selectedClass,
            1
          )
        ];
    } else {
      classes.push(
        createClassProgressionEntry(
          selectedClass,
          1
        )
      );
    }

    const totalLevel =
      refreshClassProgressionDerivedValues();

    markDraftChanged();

    return {
      ok: true,
      reason: "added",
      classId: selectedClass.id,
      className: selectedClass.name,
      totalLevel,
      message:
        `${selectedClass.name} added. Use Level Up Workflow to add ${selectedClass.name} levels. Total level is now ${totalLevel}.`,
      failedPrerequisites: []
    };
  }

  function addMulticlassClass(
    classId
  ) {
    const result =
      tryAddMulticlassClass(
        classId
      );

    setStatus(result.message);

    return result.ok;
  }

  function setMulticlassClassLevel(
    classIndex,
    value
  ) {
    const classes =
      getClassProgressionEntries();

    const index =
      Math.max(
        0,
        Math.round(
          safeNumber(classIndex, 0)
        )
      );

    const classEntry =
      classes[index];

    if (!classEntry) {
      return false;
    }

    const otherTotal =
      classes.reduce(
        (sum, entry, entryIndex) => {
          return (
            sum +
            (
              entryIndex === index
                ? 0
                : getClassEntryLevel(
                    entry,
                    1
                  )
            )
          );
        },
        0
      );

    const maximumLevel =
      Math.max(
        1,
        20 - otherTotal
      );

    const nextLevel =
      Math.max(
        1,
        Math.min(
          maximumLevel,
          Math.round(
            safeNumber(value, 1)
          )
        )
      );
    const currentLevel =
      getClassEntryLevel(
        classEntry,
        1
      );

    if (
      currentLevel === nextLevel
    ) {
      return false;
    }

    if (
      nextLevel > currentLevel &&
      classes.length > 1
    ) {
      const failedPrerequisites =
        getMulticlassPrerequisiteResults(
          creatorState.draft
        ).filter((result) => {
          return !result.met;
        });

      if (failedPrerequisites.length) {
        setStatus(
          `Class level was not changed. Multiclass prerequisites are not met: ${failedPrerequisites.map(formatMulticlassPrerequisiteFailure).join("; ")}.`
        );

        return false;
      }

      const pendingChoices =
        getClassProgressionPendingChoiceWarnings(
          creatorState.draft
        );

      if (pendingChoices.length) {
        setStatus(
          `Class level was not changed. Complete pending class choices first: ${pendingChoices.join(" ")}`
        );

        return false;
      }
    }

    classEntry.level =
      nextLevel;

    refreshClassProgressionDerivedValues();
    markDraftChanged();

    return true;
  }

  function adjustMulticlassClassLevel(
    classIndex,
    delta
  ) {
    const classEntry =
      getClassEntryAtIndex(
        classIndex
      );

    if (!classEntry) {
      return false;
    }

    return setMulticlassClassLevel(
      classIndex,
      getClassEntryLevel(
        classEntry,
        1
      ) +
        safeNumber(delta, 0)
    );
  }

  function removeMulticlassClass(
    classIndex
  ) {
    const classes =
      getClassProgressionEntries();

    if (classes.length <= 1) {
      setStatus(
        "A character needs at least one class."
      );
      return false;
    }

    const index =
      Math.max(
        0,
        Math.round(
          safeNumber(classIndex, 0)
        )
      );

    if (!classes[index]) {
      return false;
    }

    if (
      isStartingClassEntry(
        classes[index],
        creatorState.draft,
        index
      )
    ) {
      setStatus(
        "The starting class is set by Character Level 1 and cannot be removed. Move or remove later class levels instead."
      );
      return false;
    }

    classes.splice(index, 1);

    refreshClassProgressionDerivedValues();
    markDraftChanged();

    return true;
  }

  function moveMulticlassClass(
    classIndex,
    delta
  ) {
    const classes =
      getClassProgressionEntries();

    const index =
      Math.max(
        0,
        Math.round(
          safeNumber(classIndex, 0)
        )
      );

    const nextIndex =
      index +
      Math.round(
        safeNumber(delta, 0)
      );

    if (
      !classes[index] ||
      nextIndex < 0 ||
      nextIndex >= classes.length
    ) {
      return false;
    }

    const [entry] =
      classes.splice(index, 1);

    classes.splice(
      nextIndex,
      0,
      entry
    );

    refreshClassProgressionDerivedValues();
    markDraftChanged();

    return true;
  }

  function moveCharacterLevelOrder(
    levelIndex,
    delta
  ) {
    const levelOrder =
      syncClassLevelOrderToClassLevels(
        creatorState.draft
      );

    const index =
      Math.max(
        0,
        Math.round(
          safeNumber(levelIndex, 0)
        )
      );

    const nextIndex =
      index +
      Math.round(
        safeNumber(delta, 0)
      );

    if (
      !levelOrder[index] ||
      nextIndex < 0 ||
      nextIndex >= levelOrder.length
    ) {
      return false;
    }

    const [entry] =
      levelOrder.splice(index, 1);

    levelOrder.splice(
      nextIndex,
      0,
      entry
    );

    creatorState.draft
      .classProgression
      .levelOrder =
        levelOrder;

    refreshClassProgressionDerivedValues();
    markDraftChanged();

    return true;
  }

  function addCharacterLevelToClass(
    classIndex
  ) {
    const classes =
      getClassProgressionEntries();

    const index =
      Math.max(
        0,
        Math.round(
          safeNumber(classIndex, 0)
        )
      );

    const classEntry =
      classes[index];

    if (!classEntry) {
      setStatus(
        "Choose a class before adding a level."
      );

      return false;
    }

    const currentTotal =
      recalculateClassTotalLevel(
        creatorState.draft
      );

    if (currentTotal >= 20) {
      setStatus(
        "Total character level is already 20."
      );

      return false;
    }

    const levelOrder =
      syncClassLevelOrderToClassLevels(
        creatorState.draft
      );

    const classKey =
      getClassProgressionEntryKey(
        classEntry,
        index
      );

    classEntry.level =
      getClassEntryLevel(
        classEntry,
        1
      ) + 1;

    creatorState.draft
      .classProgression
      .levelOrder = [
        ...levelOrder,
        classKey
      ];

    refreshClassProgressionDerivedValues();
    markDraftChanged();

    return true;
  }

  function removeLastCharacterLevel() {
    const classes =
      getClassProgressionEntries();

    const levelOrder =
      syncClassLevelOrderToClassLevels(
        creatorState.draft
      );

    if (levelOrder.length <= 1) {
      setStatus(
        "A character needs at least one level."
      );

      return false;
    }

    const lastClassKey =
      levelOrder[levelOrder.length - 1];

    const classIndex =
      classes.findIndex((classEntry, index) => {
        return (
          getClassProgressionEntryKey(
            classEntry,
            index
          ) === lastClassKey
        );
      });

    const classEntry =
      classes[classIndex];

    if (!classEntry) {
      return false;
    }

    const nextLevel =
      getClassEntryLevel(
        classEntry,
        1
      ) - 1;

    creatorState.draft
      .classProgression
      .levelOrder =
        levelOrder.slice(0, -1);

    if (nextLevel <= 0) {
      classes.splice(
        classIndex,
        1
      );
    } else {
      classEntry.level =
        nextLevel;
    }

    refreshClassProgressionDerivedValues();
    markDraftChanged();

    return true;
  }

  function setMulticlassSubclass(
    classIndex,
    subclassId
  ) {
    const classEntry =
      getClassEntryAtIndex(
        classIndex
      );

    if (!classEntry) {
      return false;
    }

    const template =
      resolveClassTemplateForEntry(
        classEntry
      );

    const cleanSubclassId =
      cleanString(subclassId);

    if (!cleanSubclassId) {
      classEntry.subclassId = "";
      classEntry.subclassName = "";

      classEntry.choices = {
        ...(classEntry.choices || {})
      };

      delete classEntry
        .choices
        .subclassSnapshot;

      refreshClassProgressionDerivedValues();
      markDraftChanged();

      return true;
    }

    const subclass =
      (
        Array.isArray(template?.subclasses)
          ? template.subclasses
          : []
      )
        .map((entry) => {
          return normalizeSection12Subclass(
            entry,
            template?.source || "template"
          );
        })
        .find((entry) => {
          return entry.id === cleanSubclassId;
        });

    if (!subclass) {
      return false;
    }

    classEntry.subclassId =
      subclass.id;

    classEntry.subclassName =
      subclass.name;

    classEntry.choices = {
      ...(classEntry.choices || {}),
      subclassSnapshot:
        cloneData(subclass)
    };

    refreshClassProgressionDerivedValues();
    markDraftChanged();

    return true;
  }

  function blockMulticlassEdit(actionText) {
    const message =
      `${actionText} is handled through the class progression controls for multiclass characters. Existing class data was preserved.`;

    setStatus(message);

    return false;
  }

  function selectClassTemplate(classId) {
    if (isMulticlassDraft()) {
      return blockMulticlassEdit(
        "Changing the primary class"
      );
    }

    const selectedClass =
      getAllClassTemplates().find((classData) => {
        return classData.id === classId;
      });

    if (!selectedClass) {
      return false;
    }

    const totalLevel = clampLevel(
      creatorState.draft.classProgression.totalLevel
    );

    const oldPrimaryClass =
      getPrimaryClassEntry(
        creatorState.draft
      );

    const oldClassSource =
      getClassSourceLabel(
        oldPrimaryClass
      );

    if (oldClassSource) {
      removeSkillProficiencySource(
        oldClassSource
      );

      removeListProficiencySource(
        oldClassSource
      );
    }

    const selectedEntry = {
      entryId: createClassEntryId(
        selectedClass.id || selectedClass.name,
        0,
        new Set(),
        oldPrimaryClass?.entryId
      ),
      classId: selectedClass.id,
      className: selectedClass.name,
      source: selectedClass.source,
      level:
        oldPrimaryClass?.level ||
        totalLevel,
      subclassId: "",
      subclassName: "",
      hitDie: normalizeClassEntryHitDie(
        selectedClass.hitDie,
        8
      ),
      templateSnapshot:
        findDefaultClassDefinition(
          selectedClass.id,
          selectedClass.name
        )
          ? null
          : cloneData(selectedClass),
      choices: {}
    };

    creatorState.draft.classChoices =
      oldPrimaryClass?.classId === selectedClass.id
        ? normalizeClassChoiceMap(
            creatorState.draft.classChoices
          )
        : {};

    creatorState.draft
      .classProgression
      .classes = [
        selectedEntry
      ];

    recalculateClassTotalLevel(
      creatorState.draft
    );

    creatorState.dirty = true;
    markCharacterBuilderAsDraft(
      creatorState.draft
    );

    applyCompatibilityAliases(
      creatorState.draft
    );

    return true;
  }

  function setCurrentStep(stepId) {
    const step = getStepById(stepId);

    creatorState.currentStepId = step.id;
    creatorState.currentStepIndex = getStepIndex(step.id);
    creatorState.draft.builder.currentStep = step.id;

    if (
      !creatorState.draft.builder.visitedSteps.includes(
        step.id
      )
    ) {
      creatorState.draft.builder.visitedSteps.push(
        step.id
      );
    }
  }

  function refreshLoadedClassDerivedValues() {
    if (
      getPrimaryClassEntry(
        creatorState.draft
      )
    ) {
      if (
        isMulticlassDraft(
          creatorState.draft
        )
      ) {
        refreshClassProgressionDerivedValues();
      } else {
        refreshSelectedClassFeatures();
        applyCompatibilityAliases(
          creatorState.draft
        );
      }
    }
  }

  function replaceDraft(character, options = {}) {
    creatorState.multiclassAddStatus = {
      message: "",
      tone: "warning"
    };

    creatorState.draft = normalizeCharacter(character);

    refreshLoadedClassDerivedValues();

    creatorState.currentCharacterId =
      options.characterId ||
      character?.id ||
      null;

    creatorState.dirty =
      options.dirty === true;

    setCurrentStep(
      options.stepId ||
      creatorState.draft.builder.currentStep ||
      "basics"
    );

    return creatorState.draft;
  }

  function startNewDraft() {
    replaceDraft(
      createEmptyCharacter(),
      {
        characterId: null,
        dirty: false,
        stepId: "basics"
      }
    );

    creatorState.viewMode = "builder";

    setStatus("New character started.");

    return creatorState.draft;
  }

  function confirmDiscardUnsavedDraft(
    actionDescription
  ) {
    if (creatorState.dirty !== true) {
      return true;
    }

    if (typeof window === "undefined") {
      return false;
    }

    return window.confirm(
      `Discard unsaved changes before ${actionDescription}?`
    );
  }

  function duplicateIntoDraft(character) {
    const copy = normalizeCharacter(character);

    copy.identity.name = copy.identity.name
      ? `${copy.identity.name} Copy`
      : "Character Copy";

    markCharacterBuilderAsDraft(copy);

    applyCompatibilityAliases(copy);

    replaceDraft(
      copy,
      {
        characterId: null,
        dirty: true,
        stepId: "save"
      }
    );

    creatorState.viewMode = "builder";

    setStatus(
      "Duplicate draft created. Saving it will create a separate character."
    );

    return creatorState.draft;
  }

  function syncDraftCompatibilityForPath(path) {
    const draft = creatorState.draft;

    if (!draft || typeof draft !== "object") {
      return;
    }

    if (path === "identity.name") {
      draft.name = cleanString(
        draft.identity?.name
      );
      return;
    }

    if (path === "combat.maxHp") {
      draft.maxHp = Math.max(
        1,
        safeNumber(draft.combat?.maxHp, 1)
      );
      return;
    }

    if (path === "combat.currentHp") {
      draft.currentHp = safeNumber(
        draft.combat?.currentHp,
        draft.maxHp
      );
      return;
    }

    if (path === "equipment.notes") {
      draft.equipmentText = cleanString(
        draft.equipment?.notes
      );
      return;
    }

    if (path === "magic.notes") {
      draft.spells = cleanString(
        draft.magic?.notes
      );
      return;
    }

    if (path === "features.notes") {
      draft.featuresText = cleanString(
        draft.features?.notes
      );
      return;
    }

    if (
      /^combat\.baseSpeed\.(?:walk|climb|swim|fly|burrow|special)$/
        .test(path)
    ) {
      applyDerivedMovementSpeeds(draft, {
        classEffects:
          draft.classMechanics
            ?.passiveEffects || [],
        featWalkBonus: Math.max(
          calculateSelectedFeatNumericEffect(
            draft,
            "speedBonus"
          ),
          safeNumber(
            draft.featMechanics
              ?.speedBonus,
            0
          )
        )
      });

      draft.speed = `${safeNumber(
        draft.combat?.speed?.walk,
        30
      )} ft.`;
    }
  }

  function setDraftValue(path, value) {
    const parts = String(path || "")
      .split(".")
      .filter(Boolean);

    if (!parts.length) {
      return;
    }

    let cursor = creatorState.draft;

    for (
      let index = 0;
      index < parts.length - 1;
      index += 1
    ) {
      const part = parts[index];

      if (
        !cursor[part] ||
        typeof cursor[part] !== "object"
      ) {
        cursor[part] = {};
      }

      cursor = cursor[part];
    }

    const normalizedValue =
      typeof value === "string"
        ? truncateUnicode(
            value,
            getCharacterFieldLimit({
              path,
              type:
                /description|summary|appearance|traits?|ideals?|bonds?|flaws?|backstory|notes?/i
                  .test(path)
                  ? "textarea"
                  : "text"
            })
          )
        : value;

    cursor[parts[parts.length - 1]] =
      normalizedValue;
    creatorState.reviewRevision += 1;
    creatorState.dirty = true;
    markCharacterBuilderAsDraft(
      creatorState.draft
    );

    syncDraftCompatibilityForPath(path);
  }

  function getCharacterSnapshot() {
    return createCharacterPayload(
      creatorState.draft
    );
  }


// =====================================================
// CHARACTER CREATOR SECTION 6 — WIZARD DOM / ELEMENTS
// =====================================================

  const W = {
    root: null,
    actionBar: null,
    stepRail: null,
    stepBody: null,
    previousButton: null,
    nextButton: null,
    status: null,
    importInput: null
  };

  const wizardRuntime = {
    shellBuilt: false,
    eventsConnected: false,
    popstateConnected: false,
    draftPersistenceLifecycleConnected: false,
    fullRenderCount: 0,
    currentStepRenderCount: 0,
    stepRailRebuildCount: 0,
    stepRailStateUpdateCount: 0,
    lightweightFieldUpdateCount: 0
  };

  function refreshWizardElements() {
    refreshElements();

    W.root = $("characterWizardRoot");
    W.actionBar = C.actionBar;
    W.stepRail = $("characterWizardStepRail");
    W.stepBody = $("characterWizardStepBody");
    W.previousButton = $("characterPreviousStepButton");
    W.nextButton = $("characterNextStepButton");
    W.status = $("characterCreatorStatus");
    W.importInput = $("characterWizardImportInput");
  }

  function ensureWizardStyles() {
    if ($("homebrewGodCharacterWizardStyles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "homebrewGodCharacterWizardStyles";

    style.textContent = `
      #characterCreatorScreen .creatorFullScreen {
        max-width: 1500px;
        margin: 0 auto;
      }

      #characterCreatorScreen .creatorActionBar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        margin-top: 14px;
      }

      #characterCreatorScreen .creatorActionBar button,
      #characterCreatorScreen .creatorActionBar .fileButtonLabel {
        margin: 0 !important;
      }

      .hg-character-wizard-root {
        width: 100%;
      }

      .hg-character-library-header,
      .hg-character-builder-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        margin-bottom: 16px;
      }

      .hg-character-library-header h2,
      .hg-character-builder-header h2 {
        margin: 0 0 6px 0;
      }

      .hg-character-library-header p,
      .hg-character-builder-header p {
        margin: 0;
      }

      .hg-character-library-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
        gap: 14px;
      }

      .hg-character-card,
      .hg-character-empty-card,
      .hg-character-step-panel,
      .hg-character-summary-card {
        border: 1px solid rgba(116, 138, 255, 0.22);
        background:
          radial-gradient(
            circle at top left,
            rgba(88, 166, 255, 0.07),
            transparent 44%
          ),
          linear-gradient(
            180deg,
            rgba(15, 21, 42, 0.97),
            rgba(8, 12, 25, 0.98)
          );
        border-radius: 16px;
        padding: 14px;
        box-shadow: 0 10px 26px rgba(0, 0, 0, 0.24);
      }

      .hg-character-card h3,
      .hg-character-empty-card h3,
      .hg-character-step-panel h3,
      .hg-character-summary-card h3 {
        margin: 0 0 7px 0;
      }

      .hg-character-card-meta {
        color: #aeb8df;
        font-size: 13px;
        line-height: 1.45;
        min-height: 38px;
      }

      .hg-character-card-actions,
      .hg-character-inline-actions,
      .hg-character-step-footer {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 12px;
      }

      .hg-character-card-actions button,
      .hg-character-inline-actions button,
      .hg-character-step-footer button {
        margin: 0 !important;
      }

      .hg-character-builder-layout {
        display: grid;
        grid-template-columns: minmax(230px, 290px) minmax(0, 1fr);
        gap: 16px;
        align-items: start;
      }

      .hg-character-step-rail {
        position: sticky;
        top: 12px;
        display: grid;
        gap: 7px;
        max-height: calc(100vh - 90px);
        overflow-y: auto;
        padding-right: 4px;
      }

      .hg-character-step-button {
        width: 100% !important;
        display: grid !important;
        grid-template-columns: 30px minmax(0, 1fr) 18px;
        gap: 9px;
        align-items: center;
        text-align: left;
        padding: 9px 10px !important;
        margin: 0 !important;
        background: rgba(255, 255, 255, 0.025) !important;
        border-color: rgba(116, 138, 255, 0.16) !important;
      }

      .hg-character-step-button.active {
        border-color: rgba(88, 166, 255, 0.8) !important;
        background:
          linear-gradient(
            180deg,
            rgba(88, 166, 255, 0.19),
            rgba(157, 107, 255, 0.1)
          ) !important;
        box-shadow: 0 0 20px rgba(88, 166, 255, 0.13) !important;
      }

      .hg-character-step-button.visited:not(.active) {
        border-color: rgba(157, 107, 255, 0.34) !important;
      }

      .hg-character-step-number {
        width: 28px;
        height: 28px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: rgba(88, 166, 255, 0.13);
        border: 1px solid rgba(120, 160, 255, 0.3);
        font-weight: bold;
        font-size: 12px;
      }

      .hg-character-step-label {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .hg-character-step-complete-badge {
        width: 18px;
        height: 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: rgba(87, 217, 163, 0.16);
        color: #9ff0cb;
        font-size: 12px;
        font-weight: bold;
      }

      .hg-character-builder-main {
        min-width: 0;
      }

      .hg-character-progress-track {
        height: 7px;
        border-radius: 999px;
        overflow: hidden;
        background: rgba(255, 255, 255, 0.06);
        margin: 10px 0 16px 0;
      }

      .hg-character-progress-fill {
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #58a6ff, #9d6bff);
        transition: width 0.2s ease;
      }

      .hg-character-step-panel {
        min-height: 420px;
      }

      .hg-character-beginner-note {
        margin-bottom: 14px;
        padding: 10px 12px;
        border-left: 3px solid rgba(88, 166, 255, 0.72);
        background: rgba(88, 166, 255, 0.08);
        color: #dfe6ff;
      }

      .hg-character-beginner-note strong {
        display: block;
        margin-bottom: 4px;
      }

      .hg-character-beginner-note p {
        margin: 0;
        color: #aeb8df;
        font-size: 13px;
        line-height: 1.45;
      }

      .hg-character-future-features {
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid rgba(116, 138, 255, 0.16);
      }

      .hg-character-future-features summary {
        cursor: pointer;
        color: #dfe6ff;
        font-weight: bold;
      }

      .hg-character-future-features > p {
        margin: 8px 0 0;
        color: #aeb8df;
      }

      .hg-character-field-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .hg-character-field-grid.three {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .hg-character-field,
      .hg-character-choice-card {
        display: grid;
        gap: 6px;
      }

      .hg-character-field label,
      .hg-character-choice-card label {
        color: #dfe6ff;
        font-size: 13px;
        font-weight: bold;
      }

      .hg-character-field input,
      .hg-character-field select,
      .hg-character-field textarea {
        width: 100% !important;
        margin: 0 !important;
      }

      .hg-character-field textarea {
        min-height: 120px;
        resize: vertical;
      }

      .hg-character-text-counter {
        display: block; color: #aeb8d4; font-size: 12px;
        text-align: right;
      }

      .hg-character-wide-field {
        grid-column: 1 / -1;
      }

      .hg-character-portrait-panel {
        grid-column: 1 / -1;
        display: grid;
        grid-template-columns: minmax(150px, 220px) minmax(0, 1fr);
        gap: 12px;
        align-items: start;
        padding: 12px;
        border-radius: 14px;
        border: 1px solid rgba(116, 138, 255, 0.18);
        background: rgba(255, 255, 255, 0.022);
      }

      .hg-character-portrait-frame {
        width: 100%;
        aspect-ratio: 1 / 1;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        border-radius: 12px;
        border: 1px solid rgba(116, 138, 255, 0.22);
        background: rgba(8, 12, 25, 0.7);
        color: #aeb8df;
        text-align: center;
      }

      .hg-character-portrait-frame img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .hg-character-portrait-placeholder {
        padding: 12px;
        font-size: 13px;
        line-height: 1.4;
      }

      .hg-character-portrait-controls {
        display: grid;
        gap: 10px;
        align-content: start;
      }

      .hg-character-portrait-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .hg-character-portrait-actions button,
      .hg-character-portrait-actions .fileButtonLabel {
        margin: 0 !important;
      }

      .hg-character-portrait-meta {
        color: #aeb8df;
        font-size: 12px;
        overflow-wrap: anywhere;
      }

      .hg-character-choice-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        align-items: start;
        gap: 10px;
        margin-top: 12px;
      }

      .hg-character-choice-card {
        align-self: start;
        padding: 12px;
        border-radius: 14px;
        border: 1px solid rgba(116, 138, 255, 0.18);
        background: rgba(255, 255, 255, 0.025);
      }

      .hg-character-choice-card.selected {
        border-color: rgba(157, 107, 255, 0.78);
        background: rgba(157, 107, 255, 0.09);
        box-shadow: 0 0 18px rgba(157, 107, 255, 0.12);
      }

      .hg-character-class-feature-group {
        margin-top: 14px;
        padding: 12px;
        border: 1px solid rgba(116, 138, 255, 0.22);
        border-radius: 14px;
        background: rgba(8, 12, 25, 0.48);
      }

      .hg-character-class-feature-group > h4 {
        margin: 0;
        color: #dfe6ff;
      }

      .hg-character-class-feature-group > .small {
        margin: 6px 0 0;
      }

      .hg-feat-picker-panel {
        min-width: 0;
        margin-top: 8px;
        padding: 10px;
        border: 1px solid rgba(116, 138, 255, 0.24);
        border-radius: 13px;
        background: rgba(8, 12, 25, 0.72);
      }

      .hg-feat-picker-panel > summary {
        cursor: pointer;
        color: #dfe6ff;
        font-weight: bold;
      }

      .hg-feat-picker-panel[open] > summary {
        margin-bottom: 10px;
      }

      .hg-character-level-order-details {
        margin-top: 10px;
        padding: 10px;
        border: 1px solid rgba(116, 138, 255, 0.22);
        border-radius: 12px;
        background: rgba(8, 12, 25, 0.58);
      }

      .hg-character-level-order-details > summary {
        cursor: pointer;
        color: #dfe6ff;
        font-weight: bold;
      }

      .hg-character-level-order-details[open] > summary {
        margin-bottom: 8px;
      }

      .hg-character-level-order-rows {
        display: grid;
        gap: 5px;
      }

      .hg-character-level-order-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 8px;
        align-items: center;
        padding: 7px 8px;
        border: 1px solid rgba(116, 138, 255, 0.14);
        border-radius: 9px;
        background: rgba(255, 255, 255, 0.022);
      }

      .hg-character-level-order-label {
        display: grid;
        grid-template-columns: minmax(105px, 0.8fr) minmax(110px, 1fr) 48px;
        gap: 8px;
        align-items: center;
        min-width: 0;
        font-size: 12px;
      }

      .hg-character-level-order-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
      }

      .hg-character-level-order-actions button {
        width: auto !important;
        margin: 0 !important;
        padding: 6px 8px !important;
        font-size: 11px;
      }

      .hg-character-choice-card.unavailable {
        border-color: rgba(174, 184, 223, 0.2);
        background: rgba(255, 255, 255, 0.015);
      }

      .hg-feat-option-status {
        color: #c8d0ef;
        font-weight: bold;
      }

      .hg-feat-picker-toolbar {
        display: grid;
        gap: 6px;
        margin-bottom: 10px;
      }

      .hg-feat-picker-toolbar input {
        width: 100% !important;
        margin: 0 !important;
      }

      .hg-feat-picker-scroll {
        max-height: 480px;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        padding: 0 6px 6px 0;
      }

      .hg-feat-picker-scroll .hg-character-choice-grid {
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        margin-top: 0;
      }

      .hg-character-choice-card p {
        margin: 0;
        font-size: 13px;
        line-height: 1.45;
      }

      .hg-character-choice-card button {
        width: 100% !important;
        margin: 6px 0 0 0 !important;
      }

      .hg-character-card-actions .hg-character-hidden-quantity-button {
        display: none !important;
      }

      .hg-character-quantity-control {
        display: inline-grid;
        grid-template-columns: 32px minmax(34px, auto) 32px;
        align-items: center;
        gap: 4px;
        margin: 6px 0 0 0;
      }

      .hg-character-choice-card .hg-character-quantity-control button {
        width: 32px !important;
        min-width: 32px !important;
        height: 32px !important;
        padding: 0 !important;
        margin: 0 !important;
        text-align: center;
      }

      .hg-character-quantity-control span {
        min-width: 34px;
        text-align: center;
        font-weight: 700;
      }

      .hg-character-current-choice {
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid rgba(88, 166, 255, 0.24);
        background: rgba(88, 166, 255, 0.06);
        margin-bottom: 12px;
      }

      .hg-character-ability-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(120px, 1fr));
        gap: 10px;
      }

      .hg-character-ability-box {
        padding: 10px;
        border-radius: 13px;
        border: 1px solid rgba(116, 138, 255, 0.18);
        background: rgba(255, 255, 255, 0.022);
      }

      .hg-character-ability-box input {
        width: 100% !important;
        text-align: center;
        margin: 6px 0 0 0 !important;
      }

      .hg-character-summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: 10px;
      }

      .hg-character-warning-list {
        display: grid;
        gap: 7px;
        margin-top: 12px;
      }

      .hg-character-warning {
        padding: 9px 11px;
        border-radius: 11px;
        border: 1px solid rgba(255, 190, 90, 0.3);
        background: rgba(255, 190, 90, 0.07);
        color: #ffe1a8;
      }

      .hg-character-status-line {
        min-height: 22px;
        margin-top: 10px;
      }

      .hg-character-step-footer {
        justify-content: space-between;
        align-items: center;
        border-top: 1px solid rgba(116, 138, 255, 0.16);
        padding-top: 14px;
      }

      .hg-character-step-footer-right {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .hg-character-placeholder {
        padding: 18px;
        border-radius: 14px;
        border: 1px dashed rgba(116, 138, 255, 0.28);
        background: rgba(255, 255, 255, 0.018);
        color: #aeb8df;
        line-height: 1.55;
      }

      @media (max-width: 900px) {
        .hg-character-builder-layout {
          grid-template-columns: 1fr;
        }

        .hg-character-step-rail {
          position: static;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          max-height: none;
        }
      }

      @media (max-width: 650px) {
        .hg-character-field-grid,
        .hg-character-field-grid.three,
        .hg-character-ability-grid,
        .hg-character-step-rail {
          grid-template-columns: 1fr;
        }

        .hg-character-library-header,
        .hg-character-builder-header,
        .hg-character-step-footer {
          flex-direction: column;
        }

        .hg-character-portrait-panel {
          grid-template-columns: 1fr;
        }

        .hg-character-portrait-frame {
          max-width: 220px;
        }

        .hg-character-level-order-row {
          grid-template-columns: 1fr;
        }

        .hg-character-level-order-label {
          grid-template-columns: minmax(100px, 0.85fr) minmax(105px, 1fr) 44px;
        }
      }
    `;

    document.head.appendChild(style);
  }


// =====================================================
// CHARACTER CREATOR SECTION 7 — UI HELPERS / DRAFT BRIDGE
// =====================================================

  function renderRulesetMetadata(record, kind, parentId = "") {
    const metadata = getLegacy2014Metadata(
      kind,
      record?.id || record?.name,
      record,
      parentId
    );

    return `
      <span class="small" data-ruleset-id="${escapeHtml(metadata.rulesetId)}">
        <b>Rules:</b> ${escapeHtml(ACTIVE_RULESET.label)}
        <br>
        <b>Catalog:</b> ${escapeHtml(metadata.sourceLabel)}
      </span>
    `;
  }

  function renderFullCatalogDescription(
    record,
    label = "Full description"
  ) {
    const description = String(
      record?.description ||
      ""
    ).trim();

    if (!description) {
      return "";
    }

    return `
      <details class="hg-character-level-order-details">
        <summary>${escapeHtml(label)}</summary>
        <p>${escapeHtml(description)}</p>
      </details>
    `;
  }

  function renderCatalogEntryDetails(
    entries,
    {
      label = "Details",
      kind = "trait",
      parentId = ""
    } = {}
  ) {
    const records = Array.isArray(entries)
      ? entries.filter(Boolean)
      : [];

    if (!records.length) {
      return "";
    }

    return `
      <details class="hg-character-level-order-details">
        <summary>${escapeHtml(label)}</summary>
        ${records.map((record) => {
          return `
            <p>
              <b>${escapeHtml(
                record.name ||
                "Unnamed entry"
              )}:</b>
              ${escapeHtml(
                record.description ||
                record.summary ||
                "No description provided."
              )}
              <br>
              ${renderRulesetMetadata(
                record,
                kind,
                parentId
              )}
            </p>
          `;
        }).join("")}
      </details>
    `;
  }

  function renderClassFeatureMetadata(feature) {
    const sourceLabel = safeDisplayString(
      feature?.sourceLabel,
      safeDisplayString(
        feature?.source,
        "Unlabeled source"
      )
    );
    const rulesEdition = safeDisplayString(
      feature?.rulesEdition,
      ACTIVE_RULESET.edition
    );

    return `
      <span
        class="small"
        data-class-feature-metadata="true"
        data-ruleset-id="${escapeHtml(
          feature?.rulesetId ||
          ACTIVE_RULESET.id
        )}"
      >
        <b>Edition:</b>
        ${escapeHtml(rulesEdition)}
        <br>
        <b>Source:</b>
        ${escapeHtml(sourceLabel)}
      </span>
    `;
  }

  function beginnerNote(title, body) {
    return `
      <div class="hg-character-beginner-note">
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(body)}</p>
      </div>
    `;
  }

  function safeDisplayString(value, fallback = "") {
    if (typeof value !== "string") {
      return fallback;
    }

    const clean = value.trim();

    if (!clean || clean === "[object Object]") {
      return fallback;
    }

    return clean;
  }

  function getSafeCharacterName(character = creatorState.draft) {
    return safeDisplayString(
      character?.identity?.name,
      safeDisplayString(character?.name, "")
    );
  }

  function getSafeSpeciesName(character = creatorState.draft) {
    return safeDisplayString(
      character?.species?.name,
      safeDisplayString(character?.race, "")
    );
  }

  function getSafeClassName(character = creatorState.draft) {
    const primaryClass = getPrimaryClassEntry(character);

    return safeDisplayString(
      primaryClass?.className,
      safeDisplayString(character?.className, "")
    );
  }

  function getSafeSubclassName(character = creatorState.draft) {
    const primaryClass = getPrimaryClassEntry(character);

    return safeDisplayString(
      primaryClass?.subclassName,
      safeDisplayString(character?.subclassName, "")
    );
  }

  function getSafeBackgroundName(character = creatorState.draft) {
    return safeDisplayString(
      character?.background?.name,
      safeDisplayString(character?.backgroundName, "")
    );
  }

  function sanitizeDraftStrings(character) {
    const clean =
      normalizeCharacterTextFields(
        normalizeCharacter(character)
      );
    const primaryClass = getPrimaryClassEntry(clean);

    clean.identity.name = getSafeCharacterName(clean);
    clean.species.name = getSafeSpeciesName(clean);
    clean.background.name = getSafeBackgroundName(clean);

    if (primaryClass) {
      primaryClass.className =
        getSafeClassName(clean);

      primaryClass.classId =
        primaryClass.classId ||
        (
          primaryClass.className
            ? makeSafeId(
                primaryClass.className,
                "custom-class"
              )
            : ""
        );

      primaryClass.subclassName =
        getSafeSubclassName(clean);
    }

    return applyCompatibilityAliases(clean);
  }

  function markCharacterBuilderAsDraft(
    character = creatorState.draft
  ) {
    if (!character || typeof character !== "object") {
      return character;
    }

    character.builder = {
      ...(character.builder || {}),
      status: "draft",
      finalizedAtMillis: null
    };

    return character;
  }

  function markDraftChanged() {
    creatorState.reviewRevision += 1;
    creatorState.dirty = true;
    markCharacterBuilderAsDraft(
      creatorState.draft
    );
    synchronizeCanonicalSpellSources(creatorState.draft, { fromCompatibility: true });
    scheduleDraftPersistence();

    if (typeof document !== "undefined") {
      renderActionBar();
      refreshBuilderChrome({
        refreshStepIds: [
          creatorState.currentStepId
        ]
      });
    }
  }

  function getDraftStorageKey() {
    return (
      "homebrewGodCharacterDraft:" +
      (getRoomCode() || "no-room")
    );
  }

  function getPersistentDraftStorageKey() {
    return (
      "homebrewGodCharacterDraftBackup:" +
      (getRoomCode() || "no-room")
    );
  }

  function getBrowserStorage(name) {
    try {
      const storage =
        globalThis?.[name];

      if (
        storage &&
        typeof storage.getItem === "function" &&
        typeof storage.setItem === "function" &&
        typeof storage.removeItem === "function"
      ) {
        return storage;
      }
    } catch (error) {
      return null;
    }

    return null;
  }

  function getDraftStorageTargets() {
    return [
      {
        name: "session",
        label: "this browser tab",
        persistent: false,
        key: getDraftStorageKey(),
        storage:
          getBrowserStorage(
            "sessionStorage"
          )
      },
      {
        name: "persistent",
        label: "local browser backup",
        persistent: true,
        key: getPersistentDraftStorageKey(),
        storage:
          getBrowserStorage(
            "localStorage"
          )
      }
    ].filter((target) => {
      return Boolean(target.storage);
    });
  }

  function createDraftStorageRecord() {
    return {
      version: 2,
      persistedAtMillis: Date.now(),
      draft:
        normalizeCharacterTextFields(
          cloneData(
            creatorState.draft
          )
        ),
      currentCharacterId:
        creatorState.currentCharacterId,
      currentStepId:
        creatorState.currentStepId,
      dirty: creatorState.dirty
    };
  }

  function isDraftStorageQuotaError(error) {
    return (
      error?.name === "QuotaExceededError" ||
      error?.name ===
        "NS_ERROR_DOM_QUOTA_REACHED" ||
      error?.code === 22 ||
      error?.code === 1014
    );
  }

  function warnDraftStorageFailure(
    target,
    error
  ) {
    console.warn(
      `Could not store character draft in ${target.label}:`,
      error
    );

    if (isDraftStorageQuotaError(error)) {
      setStatus(
        "Browser autosave could not keep this draft. Download a JSON backup before closing the page."
      );
    }
  }

  function scheduleCreatorInputProcessing(
    key,
    callback,
    options = {}
  ) {
    const cleanKey = String(key || "").trim();

    if (
      !cleanKey ||
      typeof callback !== "function"
    ) {
      return false;
    }

    const existing =
      creatorInputDebounceRuntime.entries
        .get(cleanKey);

    if (
      existing?.timerId &&
      typeof clearTimeout === "function"
    ) {
      clearTimeout(existing.timerId);
    }

    const delayMillis = Math.max(
      0,
      safeNumber(
        options.delayMillis,
        CREATOR_INPUT_DEBOUNCE_MS
      )
    );
    const entry = {
      callback,
      timerId: null
    };

    creatorInputDebounceRuntime.entries
      .set(cleanKey, entry);
    creatorInputDebounceRuntime.scheduleCount += 1;

    if (
      delayMillis <= 0 ||
      typeof setTimeout !== "function"
    ) {
      flushPendingCreatorInputProcessing(
        cleanKey
      );
      return true;
    }

    entry.timerId = setTimeout(() => {
      flushPendingCreatorInputProcessing(
        cleanKey
      );
    }, delayMillis);

    return true;
  }

  function flushPendingCreatorInputProcessing(
    key = null
  ) {
    const keys = key === null
      ? [
          ...creatorInputDebounceRuntime
            .entries.keys()
        ]
      : [String(key || "").trim()];
    let flushed = false;

    keys.forEach((entryKey) => {
      const entry =
        creatorInputDebounceRuntime.entries
          .get(entryKey);

      if (!entry) {
        return;
      }

      if (
        entry.timerId &&
        typeof clearTimeout === "function"
      ) {
        clearTimeout(entry.timerId);
      }

      creatorInputDebounceRuntime.entries
        .delete(entryKey);
      creatorInputDebounceRuntime.flushCount += 1;
      flushed = true;
      entry.callback();
    });

    return flushed;
  }

  function clearPendingDraftPersistence() {
    if (
      draftPersistenceRuntime.timerId &&
      typeof clearTimeout === "function"
    ) {
      clearTimeout(
        draftPersistenceRuntime.timerId
      );
    }

    draftPersistenceRuntime.timerId =
      null;

    draftPersistenceRuntime.targets =
      null;
  }

  function flushPendingDraftPersistence() {
    const targets =
      draftPersistenceRuntime.targets;

    if (!targets) {
      return false;
    }

    if (
      draftPersistenceRuntime.timerId &&
      typeof clearTimeout === "function"
    ) {
      clearTimeout(
        draftPersistenceRuntime.timerId
      );
    }

    draftPersistenceRuntime.timerId =
      null;

    draftPersistenceRuntime.targets =
      null;

    if (targets.length) {
      draftPersistenceRuntime.flushCount += 1;
      persistDraftToSession(
        targets,
        {
          fromScheduledFlush: true,
          skipInputFlush: true
        }
      );
    }

    return true;
  }

  function scheduleDraftPersistence(
    targets = getDraftStorageTargets(),
    options = {}
  ) {
    if (!targets.length) {
      return;
    }

    const delayMillis =
      Math.max(
        0,
        safeNumber(
          options.delayMillis,
          DRAFT_AUTOSAVE_DEBOUNCE_MS
        )
      );

    if (
      draftPersistenceRuntime.timerId &&
      typeof clearTimeout === "function"
    ) {
      clearTimeout(
        draftPersistenceRuntime.timerId
      );
    }

    draftPersistenceRuntime.targets =
      targets;
    draftPersistenceRuntime.scheduleCount += 1;

    if (
      delayMillis <= 0 ||
      typeof setTimeout !== "function"
    ) {
      flushPendingDraftPersistence();
      return;
    }

    draftPersistenceRuntime.timerId =
      setTimeout(() => {
        flushPendingDraftPersistence();
      }, delayMillis);
  }

  function handleDraftBeforeUnload(event) {
    flushPendingCreatorInputProcessing();
    flushPendingDraftPersistence();

    if (creatorState.dirty !== true) {
      return;
    }

    if (event?.preventDefault) {
      event.preventDefault();
    }

    if (event) {
      event.returnValue = "";
    }
  }

  function handleDraftPageHide() {
    flushPendingCreatorInputProcessing();
    flushPendingDraftPersistence();
  }

  function connectDraftPersistenceLifecycle() {
    if (
      typeof window === "undefined" ||
      wizardRuntime
        .draftPersistenceLifecycleConnected
    ) {
      return;
    }

    wizardRuntime
      .draftPersistenceLifecycleConnected =
        true;

    window.addEventListener(
      "pagehide",
      handleDraftPageHide
    );

    window.addEventListener(
      "beforeunload",
      handleDraftBeforeUnload
    );
  }

  function disconnectDraftPersistenceLifecycle() {
    if (typeof window !== "undefined") {
      window.removeEventListener(
        "pagehide",
        handleDraftPageHide
      );

      window.removeEventListener(
        "beforeunload",
        handleDraftBeforeUnload
      );
    }

    wizardRuntime
      .draftPersistenceLifecycleConnected =
        false;

    handleDraftPageHide();
  }

  function persistDraftToSession(
    targets = getDraftStorageTargets(),
    options = {}
  ) {
    if (options.skipInputFlush !== true) {
      flushPendingCreatorInputProcessing();
    }

    if (options.fromScheduledFlush !== true) {
      clearPendingDraftPersistence();
    }

    if (!targets.length) {
      return;
    }

    const record =
      createDraftStorageRecord();

    const text =
      JSON.stringify(record);

    try {
      targets.forEach((target) => {
        if (
          target.persistent &&
          record.dirty !== true
        ) {
          target.storage.removeItem(
            target.key
          );

          return;
        }

        try {
          target.storage.setItem(
            target.key,
            text
          );
          draftPersistenceRuntime
            .storageWriteCount += 1;
        } catch (error) {
          warnDraftStorageFailure(
            target,
            error
          );
        }
      });
    } catch (error) {
      console.warn(
        "Could not prepare character draft storage:",
        error
      );
    }
  }

  function readDraftStorageRecord(target) {
    try {
      const text =
        target.storage.getItem(
          target.key
        );

      if (!text) {
        return null;
      }

      const stored = JSON.parse(text);

      if (
        !stored ||
        typeof stored !== "object" ||
        !stored.draft
      ) {
        return null;
      }

      return {
        ...stored,
        storageName: target.name,
        persistent:
          target.persistent === true,
        persistedAtMillis:
          safeNumber(
            stored.persistedAtMillis,
            target.persistent ? 1 : 2
          )
      };
    } catch (error) {
      console.warn(
        `Could not read character draft from ${target.label}:`,
        error
      );

      return null;
    }
  }

  function chooseStoredDraftRecord(records) {
    return records
      .filter(Boolean)
      .sort((a, b) => {
        return (
          safeNumber(
            b.persistedAtMillis,
            0
          ) -
          safeNumber(
            a.persistedAtMillis,
            0
          )
        );
      })[0] || null;
  }

  function restoreDraftFromSession(
    targets = getDraftStorageTargets()
  ) {
    try {
      const stored =
        chooseStoredDraftRecord(
          targets.map(readDraftStorageRecord)
        );

      if (!stored) {
        return false;
      }

      creatorState.draft =
        sanitizeDraftStrings(stored.draft);

      refreshLoadedClassDerivedValues();

      creatorState.currentCharacterId =
        stored.currentCharacterId || null;

      creatorState.dirty =
        stored.dirty === true;

      setCurrentStep(
        stored.currentStepId || "basics"
      );

      if (
        stored.persistent &&
        stored.dirty === true
      ) {
        setStatus(
          "Restored an unsaved character draft from local browser storage. Save it or download a JSON backup; browser storage is not permanent."
        );
      }

      return true;
    } catch (error) {
      console.warn(
        "Could not restore character draft:",
        error
      );

      return false;
    }
  }

  function clearStoredDraft(
    targets = getDraftStorageTargets()
  ) {
    clearPendingDraftPersistence();

    targets
      .forEach((target) => {
        try {
          target.storage.removeItem(
            target.key
          );
        } catch (error) {
          console.warn(
            `Could not clear stored character draft from ${target.label}:`,
            error
          );
        }
      });
  }

  function useSpeciesTemplate(speciesId) {
    const template =
      DEFAULT_SPECIES_TEMPLATES.find((item) => {
        return item.id === speciesId;
      });

    if (!template) {
      return;
    }

    creatorState.draft.species = {
      id: template.id,
      name: template.name,
      source: template.source,
      templateSnapshot: cloneData(template),
      choices: {},
      traits: cloneData(template.traits || [])
    };

    creatorState.draft.identity.size =
      template.size || "medium";

    creatorState.draft.combat
      .baseSpeed.walk =
        normalizeMovementSpeed(
          template.speed,
          30
        );

    applyCompatibilityAliases(
      creatorState.draft
    );

    markDraftChanged();
  }

  function useCustomSpeciesName(name) {
    const cleanName =
      safeDisplayString(name);

    creatorState.draft.species = {
      id: cleanName
        ? makeSafeId(cleanName, "custom-species")
        : "",

      name: cleanName,
      source: "custom",
      templateSnapshot: null,
      choices: {},
      traits: []
    };

    applyCompatibilityAliases(
      creatorState.draft
    );

    markDraftChanged();
  }

  function useCustomClassName(name) {
    if (isMulticlassDraft()) {
      return blockMulticlassEdit(
        "Editing the class name"
      );
    }

    const cleanName =
      safeDisplayString(name);

    let primaryClass =
      getPrimaryClassEntry(
        creatorState.draft
      );

    if (!cleanName) {
      return;
    }

    const matchingTemplate =
      getAllClassTemplates().find(
        (classData) => {
          return (
            classData.name.toLowerCase() ===
            cleanName.toLowerCase()
          );
        }
      );

    if (matchingTemplate) {
      selectClassTemplate(
        matchingTemplate.id
      );
    } else {
      if (!primaryClass) {
        primaryClass = {
          classId: "",
          className: "",
          source: "custom",
          level: clampLevel(
            creatorState.draft
              .classProgression
              .totalLevel
          ),
          subclassId: "",
          subclassName: "",
          templateSnapshot: null,
          choices: {}
        };

        creatorState.draft
          .classProgression
          .classes = [
            primaryClass
          ];
      }

      primaryClass.classId =
        makeSafeId(
          cleanName,
          "custom-class"
        );

      primaryClass.className =
        cleanName;

      primaryClass.source =
        "custom";

      primaryClass.templateSnapshot =
        null;

      primaryClass.subclassId =
        "";

      primaryClass.subclassName =
        "";

      primaryClass.choices =
        {};

      applyCompatibilityAliases(
        creatorState.draft
      );
    }

    markDraftChanged();
  }

  function setCharacterLevel(value) {
    if (isMulticlassDraft()) {
      return blockMulticlassEdit(
        "Changing total level"
      );
    }

    const level =
      clampLevel(value);

    const primaryClass =
      getPrimaryClassEntry(
        creatorState.draft
      );

    creatorState.draft
      .classProgression
      .totalLevel = level;

    if (primaryClass) {
      primaryClass.level = level;
    }

    syncClassLevelOrderToClassLevels(
      creatorState.draft
    );

    creatorState.draft
      .combat
      .proficiencyBonus =
        getGenericProficiencyBonus(level);

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

    if (primaryClass) {
      refreshSelectedClassFeatures();
    }

    applyCompatibilityAliases(
      creatorState.draft
    );

    markDraftChanged();

    return true;
  }

  function setAbilityScore(
    abilityId,
    value
  ) {
    const validAbility =
      ABILITY_DEFINITIONS.some(
        (ability) => {
          return ability.id === abilityId;
        }
      );

    if (!validAbility) {
      return;
    }

    const score = Math.max(
      1,
      Math.min(
        30,
        Math.round(
          safeNumber(value, 10)
        )
      )
    );

    creatorState.draft
      .abilities
      .base[abilityId] = score;

    recalculateAbilityTotals(
      creatorState.draft
    );

    creatorState.draft.builder.validation = {
      ...(creatorState.draft.builder.validation || {}),
      abilitiesTouched: true
    };

    applyCompatibilityAliases(
      creatorState.draft
    );

    if (
      creatorState.draft
        .magic
        .spellcastingAbility === abilityId
    ) {
      calculateSection16SpellcastingValues({
        markDraft: false
      });
    }

    markDraftChanged();
    refreshSection13AbilitySummary();
  }

  function setSimpleDraftField(
    path,
    rawValue,
    valueType
  ) {
    let value = rawValue;

    if (valueType === "number") {
      value = safeNumber(
        rawValue,
        0
      );
    }

    if (valueType === "integer") {
      value = Math.round(
        safeNumber(rawValue, 0)
      );
    }

    if (
      /^combat\.baseSpeed\.(?:walk|climb|swim|fly|burrow)$/
        .test(path)
    ) {
      value = normalizeMovementSpeed(
        rawValue,
        path.endsWith(".walk")
          ? 30
          : 0
      );
    }

    setDraftValue(path, value);
    scheduleDraftPersistence();
    renderActionBar();
    wizardRuntime.lightweightFieldUpdateCount += 1;

    if (path === "identity.name") {
      refreshBuilderChrome({
        refreshStepIds: ["basics"]
      });
    }
  }

  function getValidationWarnings(
    character = creatorState.draft
  ) {
    const warnings = [];

    if (!getSafeCharacterName(character)) {
      warnings.push(
        "Character name is missing."
      );
    }

    if (!getSafeSpeciesName(character)) {
      warnings.push(
        "Species has not been selected."
      );
    }

    if (!getSafeClassName(character)) {
      warnings.push(
        "Class has not been selected."
      );
    }

    return warnings;
  }


// =====================================================
// CHARACTER CREATOR SECTION 8 — SAME-TAB URL ROUTING
// =====================================================

  function getRouteFromUrl() {
    if (typeof window === "undefined") {
      return {
        isCharacterCreator: false,
        viewMode: "external",
        stepId: null
      };
    }

    const params =
      new URLSearchParams(
        window.location.search
      );

    if (
      params.get("view") !==
      "characterCreator"
    ) {
      return {
        isCharacterCreator: false,
        viewMode: "external",
        stepId: null
      };
    }

    const requestedStep =
      params.get("step");

    if (
      !requestedStep ||
      requestedStep === "library"
    ) {
      return {
        isCharacterCreator: true,
        viewMode: "library",
        stepId: "basics"
      };
    }

    return {
      isCharacterCreator: true,
      viewMode: "builder",
      stepId:
        getStepById(
          requestedStep
        ).id
    };
  }

  function writeRouteToUrl(
    viewMode,
    stepId,
    replace = false
  ) {
    const url =
      new URL(
        window.location.href
      );

    const roomCode =
      getRoomCode();

    if (roomCode) {
      url.searchParams.set(
        "room",
        roomCode
      );
    }

    url.searchParams.set(
      "view",
      "characterCreator"
    );

    if (viewMode === "library") {
      url.searchParams.set(
        "step",
        "library"
      );
    } else {
      url.searchParams.set(
        "step",
        getStepById(stepId).id
      );
    }

    const state = {
      homebrewGodCharacterCreator: true,
      viewMode,
      stepId
    };

    if (replace) {
      window.history.replaceState(
        state,
        "",
        url
      );
    } else {
      window.history.pushState(
        state,
        "",
        url
      );
    }
  }

  function navigateToLibrary(
    options = {}
  ) {
    creatorState.viewMode =
      "library";

    if (
      options.updateUrl !== false
    ) {
      writeRouteToUrl(
        "library",
        "basics",
        options.replace === true
      );
    }

    renderCreatorView();
  }

  function navigateToStep(
    stepId,
    options = {}
  ) {
    const step =
      getStepById(stepId);

    creatorState.viewMode =
      "builder";

    setCurrentStep(step.id);
    persistDraftToSession();

    if (
      options.updateUrl !== false
    ) {
      writeRouteToUrl(
        "builder",
        step.id,
        options.replace === true
      );
    }

    renderCreatorView();
  }

  function navigateByStepOffset(
    offset
  ) {
    const nextIndex =
      clampStepIndex(
        creatorState
          .currentStepIndex +
        offset
      );

    navigateToStep(
      BUILDER_STEPS[nextIndex].id
    );
  }

  function handleBrowserRouteChange() {
    const route =
      getRouteFromUrl();

    if (!route.isCharacterCreator) {
      creatorState.viewMode =
        "external";

      if (
        typeof disconnectWizardEvents ===
        "function"
      ) {
        disconnectWizardEvents();
      }

      if (
        typeof cleanupSection19PermanentListeners ===
        "function"
      ) {
        cleanupSection19PermanentListeners();
      }

      return;
    }

    if (
      typeof connectSection19PermanentListeners ===
      "function"
    ) {
      connectSection19PermanentListeners();
    }

    creatorState.viewMode =
      route.viewMode;

    if (
      route.viewMode === "builder"
    ) {
      setCurrentStep(
        route.stepId
      );
    }

    renderCreatorView();
  }

  function connectPopstateRouting() {
    if (
      wizardRuntime
        .popstateConnected
    ) {
      return;
    }

    wizardRuntime.popstateConnected =
      true;

    window.addEventListener(
      "popstate",
      handleBrowserRouteChange
    );
  }

  function applyInitialRoute() {
    const route =
      getRouteFromUrl();

    if (!route.isCharacterCreator) {
      return false;
    }

    if (
      route.viewMode === "builder"
    ) {
      restoreDraftFromSession();

      creatorState.viewMode =
        "builder";

      setCurrentStep(
        route.stepId
      );

      writeRouteToUrl(
        "builder",
        route.stepId,
        true
      );
    } else {
      restoreDraftFromSession();

      creatorState.viewMode =
        "library";

      writeRouteToUrl(
        "library",
        "basics",
        true
      );
    }

    return true;
  }


// =====================================================
// CHARACTER CREATOR SECTION 9 — WIZARD SHELL / NAVIGATION
// =====================================================

  const characterStepRenderers = new Map();
  const characterStepCompletionChecks = new Map();
  const characterCreatorActions = new Map();
  const characterCreatorInputHandlers = [];
  const characterCreatorChangeHandlers = [];
  const retiredCharacterStepIds = new Set([
    "skills",
    "level",
    "subclass"
  ]);

  let characterLibraryRenderer = null;

  function registerCharacterStepRenderer(stepId, renderer) {
    const step = getExactBuilderStepById(stepId);

    if (!step) {
      if (retiredCharacterStepIds.has(stepId)) {
        return;
      }

      console.warn(
        `Skipping renderer for removed character step: ${stepId}`
      );
      return;
    }

    if (typeof renderer !== "function") {
      throw new TypeError(
        `Renderer for character step "${step.id}" must be a function.`
      );
    }

    characterStepRenderers.set(step.id, renderer);
  }

  function registerCharacterStepCompletion(stepId, checker) {
    const step = getExactBuilderStepById(stepId);

    if (!step) {
      if (retiredCharacterStepIds.has(stepId)) {
        return;
      }

      console.warn(
        `Skipping completion check for removed character step: ${stepId}`
      );
      return;
    }

    if (typeof checker !== "function") {
      throw new TypeError(
        `Completion check for character step "${step.id}" must be a function.`
      );
    }

    characterStepCompletionChecks.set(step.id, checker);
  }

  function runCharacterStepRegistrationAudit() {
    if (characterStepRenderers.get("basics") !== basicsStep.renderStep) {
      console.error(
        "Character Creator registration error: basics renderer was overwritten."
      );
    }

    if (characterStepRenderers.get("class") !== renderClassStep) {
      console.warn(
        "Character Creator warning: class renderer is not renderClassStep."
      );
    }

    ["skills", "level", "subclass"].forEach((removedStepId) => {
      const stepStillExists = getExactBuilderStepById(removedStepId);

      if (!stepStillExists && characterStepRenderers.has(removedStepId)) {
        console.warn(
          `Removed character step is still registered: ${removedStepId}`
        );
      }
    });
  }

  function registerCharacterCreatorAction(action, handler) {
    const cleanAction = String(action || "").trim();

    if (!cleanAction) {
      throw new Error(
        "Character creator action name is required."
      );
    }

    if (typeof handler !== "function") {
      throw new TypeError(
        `Handler for character action "${cleanAction}" must be a function.`
      );
    }

    characterCreatorActions.set(
      cleanAction,
      handler
    );
  }

  function registerCharacterCreatorInputHandler(handler) {
    if (typeof handler !== "function") {
      throw new TypeError(
        "Character creator input handler must be a function."
      );
    }

    characterCreatorInputHandlers.push(
      handler
    );
  }

  function registerCharacterCreatorChangeHandler(handler) {
    if (typeof handler !== "function") {
      throw new TypeError(
        "Character creator change handler must be a function."
      );
    }

    characterCreatorChangeHandlers.push(
      handler
    );
  }

  function registerCharacterLibraryRenderer(renderer) {
    if (typeof renderer !== "function") {
      throw new TypeError(
        "Character library renderer must be a function."
      );
    }

    characterLibraryRenderer = renderer;
  }

  function wizardField(
    label,
    id,
    value,
    options = {}
  ) {
    const type =
      options.type || "text";

    const path =
      options.path || "";

    const valueType =
      options.valueType || "string";

    const placeholder =
      options.placeholder || "";

    const extra =
      options.extra || "";
    const textLimit =
      [
        "text",
        "search",
        "url",
        "textarea"
      ].includes(type)
        ? getCharacterFieldLimit({
            id,
            path,
            type,
            category:
              options.fieldCategory,
            maxLength:
              options.maxLength
          })
        : null;
    const textLimitAttributes =
      textLimit
        ? `maxlength="${textLimit}" data-character-field-limit="${textLimit}"`
        : "";

    const wideClass =
      options.wide === true
        ? " hg-character-wide-field"
        : "";

    if (type === "textarea") {
      return `
        <div class="hg-character-field${wideClass}">
          <label for="${escapeHtml(id)}">
            ${escapeHtml(label)}
          </label>

          <textarea
            id="${escapeHtml(id)}"
            ${
              path
                ? `data-draft-path="${escapeHtml(path)}"`
                : ""
            }
            placeholder="${escapeHtml(placeholder)}"
            ${textLimitAttributes}
            ${extra}
          >${escapeHtml(value ?? "")}</textarea>
        </div>
      `;
    }

    return `
      <div class="hg-character-field${wideClass}">
        <label for="${escapeHtml(id)}">
          ${escapeHtml(label)}
        </label>

        <input
          id="${escapeHtml(id)}"
          type="${escapeHtml(type)}"
          ${
            path
              ? `data-draft-path="${escapeHtml(path)}"`
              : ""
          }
          ${
            path
              ? `data-value-type="${escapeHtml(valueType)}"`
              : ""
          }
          value="${escapeHtml(value ?? "")}"
          placeholder="${escapeHtml(placeholder)}"
          ${textLimitAttributes}
          ${extra}
        >
      </div>
    `;
  }

  function wizardSelect(
    label,
    id,
    value,
    choices,
    options = {}
  ) {
    const path =
      options.path || "";

    const changeAction =
      options.changeAction || "";

    const extra =
      options.extra || "";

    const wideClass =
      options.wide === true
        ? " hg-character-wide-field"
        : "";

    const optionsHtml = (
      Array.isArray(choices)
        ? choices
        : []
    )
      .map((choice) => {
        const choiceValue =
          typeof choice === "string"
            ? choice
            : choice?.value;

        const choiceLabel =
          typeof choice === "string"
            ? choice
            : choice?.label;

        return `
          <option
            value="${escapeHtml(choiceValue ?? "")}"
            ${
              String(value ?? "") ===
              String(choiceValue ?? "")
                ? "selected"
                : ""
            }
          >
            ${escapeHtml(
              choiceLabel ??
              choiceValue ??
              ""
            )}
          </option>
        `;
      })
      .join("");

    return `
      <div class="hg-character-field${wideClass}">
        <label for="${escapeHtml(id)}">
          ${escapeHtml(label)}
        </label>

        <select
          id="${escapeHtml(id)}"
          ${
            path
              ? `data-draft-path="${escapeHtml(path)}"`
              : ""
          }
          ${
            changeAction
              ? `data-cc-action-change="${escapeHtml(
                  changeAction
                )}"`
              : ""
          }
          ${extra}
        >
          ${optionsHtml}
        </select>
      </div>
    `;
  }

  function wizardChoiceCard(
    title,
    body,
    buttonLabel,
    action,
    data = {},
    selected = false
  ) {
    const dataAttributes =
      Object.entries(data || {})
        .map(([key, value]) => {
          return (
            `data-${escapeHtml(key)}=` +
            `"${escapeHtml(value)}"`
          );
        })
        .join(" ");

    return `
      <article
        class="
          hg-character-choice-card
          ${selected ? "selected" : ""}
        "
      >
        <h3>
          ${escapeHtml(title)}
        </h3>

        ${body || ""}

        ${
          action
            ? `
              <button
                type="button"
                data-cc-action="${escapeHtml(action)}"
                ${dataAttributes}
              >
                ${escapeHtml(
                  buttonLabel || "Choose"
                )}
              </button>
            `
            : ""
        }
      </article>
    `;
  }

  function isCharacterCreatorRoute() {
    if (typeof window === "undefined") {
      return false;
    }

    const params =
      new URLSearchParams(
        window.location.search
      );

    return (
      params.get("view") ===
      "characterCreator"
    );
  }

  function ensureWizardShell() {
    refreshElements();
    ensureWizardStyles();

    if (!C.actionBar || !C.grid) {
      return false;
    }

    const rootExists = Boolean(
      $("characterWizardRoot")
    );

    if (
      !wizardRuntime.shellBuilt ||
      !rootExists
    ) {
      wizardRuntime.shellBuilt = true;

      C.actionBar.innerHTML = `
        <button
          type="button"
          data-cc-action="library"
        >
          Characters
        </button>

        <button
          type="button"
          data-cc-action="new-character"
        >
          New Character
        </button>

        <button
          type="button"
          id="characterWizardSaveButton"
          data-cc-action="save-character"
        >
          Save Draft
        </button>

        <button
          type="button"
          id="characterWizardFinalizeButton"
          data-cc-action="finalize-character"
        >
          Finalize Character
        </button>

        <button
          type="button"
          id="characterWizardSaveCopyButton"
          data-cc-action="save-copy"
        >
          Save Draft Copy
        </button>

        <button
          type="button"
          data-cc-action="copy-json"
        >
          Copy JSON
        </button>

        <button
          type="button"
          data-cc-action="export-json"
        >
          Export JSON
        </button>

        <label class="fileButtonLabel">
          Import JSON

          <input
            id="characterWizardImportInput"
            type="file"
            accept="application/json,.json"
          >
        </label>
      `;

      C.grid.innerHTML = `
        <div
          id="characterWizardRoot"
          class="hg-character-wizard-root"
        ></div>
      `;

      if (C.subtitle) {
        C.subtitle.textContent =
          "Build one step at a time. Your draft stays in this browser tab until saved.";
      }
    }

    refreshWizardElements();
    applyCharacterCreatorFieldLimits(
      W.root
    );
    connectWizardEvents();

    return true;
  }

  function renderActionBar() {
    const saveButton =
      $("characterWizardSaveButton");

    const saveCopyButton =
      $("characterWizardSaveCopyButton");

    const finalizeButton =
      $("characterWizardFinalizeButton");

    const importInput =
      $("characterWizardImportInput");

    const newButton =
      C.actionBar
        ? C.actionBar.querySelector(
            '[data-cc-action="new-character"]'
          )
        : null;

    const isBusy =
      isCharacterCreatorBusy();

    const busyLabel =
      getCharacterBusyLabel();

    if (newButton) {
      newButton.disabled = isBusy;
    }

    if (importInput) {
      importInput.disabled = isBusy;
    }

    if (saveButton) {
      saveButton.disabled = isBusy;

      saveButton.textContent =
        isBusy
          ? `${busyLabel}...`
          : creatorState.currentCharacterId
            ? "Update Draft"
            : "Save Draft";
    }

    if (finalizeButton) {
      finalizeButton.disabled = isBusy;

      finalizeButton.textContent =
        isBusy
          ? `${busyLabel}...`
          : "Finalize Character";
    }

    if (saveCopyButton) {
      saveCopyButton.disabled = isBusy;

      saveCopyButton.textContent =
        isBusy
          ? `${busyLabel}...`
          : "Save Draft Copy";
    }
  }

  function isStepComplete(stepId) {
    const checker =
      characterStepCompletionChecks.get(
        getStepById(stepId).id
      );

    if (!checker) {
      return false;
    }

    try {
      return (
        checker(
          creatorState.draft
        ) === true
      );
    } catch (error) {
      console.error(
        `Character step completion check failed for "${stepId}":`,
        error
      );

      return false;
    }
  }

  function renderStepRail() {
    wizardRuntime.stepRailRebuildCount += 1;

    return BUILDER_STEPS
      .map((step, index) => {
        const active =
          step.id ===
          creatorState.currentStepId;

        const visited =
          creatorState.draft
            .builder
            .visitedSteps
            .includes(step.id);

        const complete =
          isStepComplete(step.id);

        return `
          <button
            type="button"
            class="
              hg-character-step-button
              ${active ? "active" : ""}
              ${visited ? "visited" : ""}
              ${complete ? "complete" : ""}
            "
            data-cc-action="go-step"
            data-step-id="${escapeHtml(step.id)}"
            aria-label="${escapeHtml(
              `${step.label} step ${index + 1} of ${BUILDER_STEPS.length}${
                complete ? ", complete" : ", incomplete"
              }${active ? ", current step" : ""}`
            )}"
          >
            <span class="hg-character-step-number">
              ${index + 1}
            </span>

            <span class="hg-character-step-label">
              ${escapeHtml(step.shortLabel)}
            </span>

            ${
              complete
                ? `
                  <span
                    class="hg-character-step-complete-badge"
                    aria-hidden="true"
                  >
                    &#10003;
                  </span>
                `
                : ""
            }
          </button>
        `;
      })
      .join("");
  }

  function refreshStepRailState(stepId) {
    if (!W.stepRail) {
      return;
    }

    const step = getExactBuilderStepById(stepId);
    const index = step
      ? getStepIndex(step.id)
      : -1;
    const button = step
      ? W.stepRail.querySelector(
          `[data-step-id="${step.id}"]`
        )
      : null;

    if (!step || index < 0 || !button) {
      return;
    }

    const active =
      step.id === creatorState.currentStepId;
    const visited =
      creatorState.draft.builder.visitedSteps
        .includes(step.id);
    const complete = isStepComplete(step.id);

    button.classList.toggle("active", active);
    button.classList.toggle("visited", visited);
    button.classList.toggle("complete", complete);
    button.setAttribute(
      "aria-label",
      `${step.label} step ${index + 1} of ${BUILDER_STEPS.length}${
        complete ? ", complete" : ", incomplete"
      }${active ? ", current step" : ""}`
    );

    const existingBadge = button.querySelector(
      ".hg-character-step-complete-badge"
    );

    if (complete && !existingBadge) {
      const badge = document.createElement("span");
      badge.className =
        "hg-character-step-complete-badge";
      badge.setAttribute("aria-hidden", "true");
      badge.textContent = "\u2713";
      button.append(badge);
    } else if (!complete && existingBadge) {
      existingBadge.remove();
    }

    wizardRuntime.stepRailStateUpdateCount += 1;
  }

  function refreshBuilderChrome({
    refreshStepIds = []
  } = {}) {
    if (
      creatorState.viewMode !==
      "builder"
    ) {
      return;
    }

    refreshWizardElements();

    const title =
      $("characterBuilderTitle");

    if (title) {
      title.textContent =
        getSafeCharacterName() ||
        "New Character";
    }

    const summary =
      $("characterBuilderSummary");

    if (summary) {
      summary.textContent = `${
        getSafeSpeciesName() ||
        "No species"
      } - Level ${clampLevel(
        creatorState.draft
          .classProgression
          .totalLevel
      )} ${
        getSafeClassName() ||
        "No class"
      }`;
    }

    uniqueCleanArray(refreshStepIds)
      .forEach(refreshStepRailState);
  }

  function renderMissingStep(stepId) {
    const step =
      getStepById(stepId);

    return `
      <div class="hg-character-placeholder">
        No renderer is registered for
        <b>${escapeHtml(step.label)}</b>.
      </div>
    `;
  }

  function renderStepContent(stepId) {
    const step =
      getStepById(stepId);

    const renderer =
      characterStepRenderers.get(
        step.id
      );

    if (!renderer) {
      return renderMissingStep(
        step.id
      );
    }

    try {
      return renderer(
        creatorState.draft
      );
    } catch (error) {
      console.error(
        `Character step renderer failed for "${step.id}":`,
        error
      );

      return `
        <div class="hg-character-warning">
          This character step could not be rendered.
          Check the browser console for the exact error.
        </div>
      `;
    }
  }

  function renderBuilderView() {
    const step =
      getStepById(
        creatorState.currentStepId
      );

    const stepIndex =
      getStepIndex(step.id);

    const progress =
      Math.round(
        (
          (stepIndex + 1) /
          BUILDER_STEPS.length
        ) *
        100
      );

    const isBusy =
      isCharacterCreatorBusy();

    const busyLabel =
      getCharacterBusyLabel();

    W.root.innerHTML = `
      <div class="hg-character-builder-header">
        <div>
          <h2 id="characterBuilderTitle">
            ${escapeHtml(
              getSafeCharacterName() ||
              "New Character"
            )}
          </h2>

          <p
            id="characterBuilderSummary"
            class="small"
          >
            ${escapeHtml(
              getSafeSpeciesName() ||
              "No species"
            )}

            · Level

            ${clampLevel(
              creatorState.draft
                .classProgression
                .totalLevel
            )}

            ${escapeHtml(
              getSafeClassName() ||
              "No class"
            )}
          </p>
        </div>

        <button
          type="button"
          data-cc-action="library"
        >
          Character Library
        </button>
      </div>

      <div class="hg-character-progress-track">
        <div
          class="hg-character-progress-fill"
          style="width:${progress}%"
        ></div>
      </div>

      <div class="hg-character-builder-layout">
        <aside
          class="hg-character-step-rail"
          id="characterWizardStepRail"
        >
          ${renderStepRail()}
        </aside>

        <section class="hg-character-builder-main">
          <div class="hg-character-step-panel">
            <div class="hg-character-builder-header">
              <div>
                <div class="small">
                  Step ${stepIndex + 1}
                  of ${BUILDER_STEPS.length}
                </div>

                <h2>
                  ${escapeHtml(step.label)}
                </h2>

                <p>
                  ${escapeHtml(step.description)}
                </p>
              </div>
            </div>

            <div id="characterWizardStepBody">
              ${renderStepContent(step.id)}
            </div>

            <p
              id="characterCreatorStatus"
              class="status hg-character-status-line"
            >
              ${escapeHtml(
                creatorState.statusMessage ||
                ""
              )}
            </p>

            <div class="hg-character-step-footer">
              <button
                id="characterPreviousStepButton"
                type="button"
                data-cc-action="previous-step"
                ${
                  stepIndex === 0
                    ? "disabled"
                    : ""
                }
              >
                Previous
              </button>

              <div class="hg-character-step-footer-right">
                <button
                  type="button"
                  data-cc-action="save-character"
                  ${
                    isBusy
                      ? "disabled"
                      : ""
                  }
                >
                  ${
                    isBusy
                      ? `${busyLabel}...`
                      : creatorState.currentCharacterId
                        ? "Update Draft"
                        : "Save Draft"
                  }
                </button>

                <button
                  id="characterNextStepButton"
                  type="button"
                  data-cc-action="next-step"
                  ${
                    stepIndex ===
                    BUILDER_STEPS.length - 1
                      ? "disabled"
                      : ""
                  }
                >
                  Next Step
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    `;

    refreshWizardElements();
  }

  function renderCreatorView() {
    wizardRuntime.fullRenderCount += 1;

    if (!ensureWizardShell()) {
      return;
    }

    refreshWizardElements();
    renderActionBar();

    if (!W.root) {
      return;
    }

    if (
      creatorState.viewMode ===
      "library"
    ) {
      if (!characterLibraryRenderer) {
        W.root.innerHTML = `
          <div class="hg-character-warning">
            No character-library renderer is registered.
          </div>
        `;
      } else {
        characterLibraryRenderer();
      }
    } else {
      renderBuilderView();
    }

    refreshWizardElements();
    applyCharacterCreatorFieldLimits(
      W.root
    );
  }

  function refreshBuilderFooter() {
    if (creatorState.viewMode !== "builder") {
      return;
    }

    refreshWizardElements();

    const stepIndex = getStepIndex(
      creatorState.currentStepId
    );
    const isBusy = isCharacterCreatorBusy();
    const saveButton = W.root?.querySelector(
      ".hg-character-step-footer [data-cc-action=\"save-character\"]"
    );

    if (W.previousButton) {
      W.previousButton.disabled = stepIndex === 0;
    }

    if (W.nextButton) {
      W.nextButton.disabled =
        stepIndex === BUILDER_STEPS.length - 1;
    }

    if (saveButton) {
      saveButton.disabled = isBusy;
      saveButton.textContent = isBusy
        ? `${getCharacterBusyLabel()}...`
        : creatorState.currentCharacterId
          ? "Update Draft"
          : "Save Draft";
    }
  }

  function renderCurrentStep() {
    if (
      creatorState.viewMode !== "builder" ||
      !wizardRuntime.shellBuilt
    ) {
      renderCreatorView();
      return;
    }

    refreshWizardElements();

    if (!W.root || !W.stepBody) {
      renderCreatorView();
      return;
    }

    wizardRuntime.currentStepRenderCount += 1;
    W.stepBody.innerHTML = renderStepContent(
      creatorState.currentStepId
    );

    if (W.status) {
      W.status.textContent =
        creatorState.statusMessage || "";
    }

    renderActionBar();
    refreshBuilderFooter();
    refreshBuilderChrome({
      refreshStepIds: [
        creatorState.currentStepId
      ]
    });
    applyCharacterCreatorFieldLimits(
      W.stepBody
    );
  }

  async function runCharacterCreatorAction(
    action,
    button,
    event
  ) {
    const handler =
      characterCreatorActions.get(
        action
      );

    if (!handler) {
      return false;
    }

    if (blockCharacterBusyAction(action)) {
      return true;
    }

    await handler({
      action,
      button,
      event,
      state: creatorState,
      draft: creatorState.draft
    });

    return true;
  }

  async function handleWizardClick(event) {
    const button =
      event.target.closest(
        "[data-cc-action]"
      );

    if (!button) {
      return;
    }

    flushPendingCreatorInputProcessing();

    const action =
      button.dataset.ccAction;

    if (blockCharacterBusyAction(action)) {
      return;
    }

    if (action === "library") {
      navigateToLibrary();
      return;
    }

    if (
      action === "new-character"
    ) {
      if (
        !confirmDiscardUnsavedDraft(
          "starting a new character"
        )
      ) {
        return;
      }

      clearStoredDraft();
      startNewDraft();

      creatorState.draft =
        sanitizeDraftStrings(
          creatorState.draft
        );

      persistDraftToSession();
      navigateToStep("basics");

      return;
    }

    if (action === "go-step") {
      navigateToStep(
        button.dataset.stepId
      );

      return;
    }

    if (
      action === "previous-step"
    ) {
      navigateByStepOffset(-1);
      return;
    }

    if (action === "next-step") {
      navigateByStepOffset(1);
      return;
    }

    const handled =
      await runCharacterCreatorAction(
        action,
        button,
        event
      );

    if (!handled) {
      console.warn(
        `No character creator action is registered for "${action}".`
      );
    }
  }

  async function runWizardHandlers(
    handlers,
    event
  ) {
    for (const handler of handlers) {
      const handled =
        await handler({
          event,
          target: event.target,
          state: creatorState,
          draft: creatorState.draft
        });

      if (handled === true) {
        return true;
      }
    }

    return false;
  }

  async function handleWizardInput(event) {
    const handled =
      await runWizardHandlers(
        characterCreatorInputHandlers,
        event
      );

    if (handled) {
      return;
    }

    const target =
      event.target;

    if (target.dataset.abilityId) {
      const abilityId =
        target.dataset.abilityId;
      const value = target.value;

      scheduleCreatorInputProcessing(
        `ability:${abilityId}`,
        () => {
          setAbilityScore(
            abilityId,
            value
          );
        }
      );

      return;
    }

    if (
      target.dataset.levelInput ===
      "true"
    ) {
      const value = target.value;

      scheduleCreatorInputProcessing(
        "character-level",
        () => {
          setCharacterLevel(value);
        }
      );

      return;
    }

    if (target.dataset.draftPath) {
      setSimpleDraftField(
        target.dataset.draftPath,
        target.value,
        target.dataset.valueType ||
        "string"
      );
    }
  }

  async function handleWizardChange(event) {
    const handled =
      await runWizardHandlers(
        characterCreatorChangeHandlers,
        event
      );

    if (handled) {
      return;
    }

    const target =
      event.target;

    if (target.dataset.abilityId) {
      const abilityId =
        target.dataset.abilityId;

      if (
        !flushPendingCreatorInputProcessing(
          `ability:${abilityId}`
        )
      ) {
        setAbilityScore(
          abilityId,
          target.value
        );
      }

      return;
    }

    if (
      target.dataset.levelInput ===
      "true"
    ) {
      if (
        !flushPendingCreatorInputProcessing(
          "character-level"
        )
      ) {
        setCharacterLevel(target.value);
      }

      return;
    }

    if (target.dataset.draftPath) {
      setSimpleDraftField(
        target.dataset.draftPath,
        target.value,
        target.dataset.valueType ||
        "string"
      );
    }
  }

  async function handleWizardImport(event) {
    if (
      event.target?.id !==
      "characterWizardImportInput"
    ) {
      return;
    }

    await runCharacterCreatorAction(
      "import-json-file",
      event.target,
      event
    );

    event.target.value = "";
  }

  function disconnectWizardEvents() {
    const oldActionBar =
      wizardRuntime.actionBarElement;

    const oldGrid =
      wizardRuntime.gridElement;

    if (oldActionBar) {
      oldActionBar.removeEventListener(
        "click",
        handleWizardClick
      );

      oldActionBar.removeEventListener(
        "change",
        handleWizardImport
      );
    }

    if (oldGrid) {
      oldGrid.removeEventListener(
        "click",
        handleWizardClick
      );

      oldGrid.removeEventListener(
        "input",
        handleWizardInput
      );

      oldGrid.removeEventListener(
        "change",
        handleWizardChange
      );
    }

    wizardRuntime.eventsConnected = false;
    wizardRuntime.actionBarElement = null;
    wizardRuntime.gridElement = null;
  }

  function connectWizardEvents() {
    if (!C.actionBar || !C.grid) {
      return;
    }

    const targetsChanged =
      wizardRuntime.actionBarElement !==
        C.actionBar ||
      wizardRuntime.gridElement !==
        C.grid;

    if (
      wizardRuntime.eventsConnected &&
      !targetsChanged
    ) {
      return;
    }

    if (wizardRuntime.eventsConnected) {
      disconnectWizardEvents();
    }

    C.actionBar.addEventListener(
      "click",
      handleWizardClick
    );

    C.actionBar.addEventListener(
      "change",
      handleWizardImport
    );

    C.grid.addEventListener(
      "click",
      handleWizardClick
    );

    C.grid.addEventListener(
      "input",
      handleWizardInput
    );

    C.grid.addEventListener(
      "change",
      handleWizardChange
    );

    wizardRuntime.eventsConnected = true;
    wizardRuntime.actionBarElement =
      C.actionBar;

    wizardRuntime.gridElement =
      C.grid;
  }

// =====================================================
// CHARACTER CREATOR SECTION 10 — CHARACTER LIBRARY PAGE
// =====================================================

  function getCharacterLibraryDisplayName(character) {
    return (
      getSafeCharacterName(character) ||
      "Unnamed Character"
    );
  }

  function getCharacterLibrarySpeciesName(character) {
    return (
      getSafeSpeciesName(character) ||
      "No species selected"
    );
  }

  function getCharacterLibraryClassName(character) {
    return (
      getSafeClassName(character) ||
      "No class selected"
    );
  }

  function getCharacterLibraryLevel(character) {
    return clampLevel(
      character?.classProgression?.totalLevel ||
      character?.level ||
      1
    );
  }

  function getCharacterLibraryImageUrl(character) {
    return safeDisplayString(
      character?.identity?.image?.url,
      ""
    );
  }

  function findCachedCharacter(characterId) {
    const cleanId =
      String(characterId || "").trim();

    if (!cleanId) {
      return null;
    }

    return (
      creatorState.characterCache.find(
        (character) => {
          return (
            String(character?.id || "") ===
            cleanId
          );
        }
      ) ||
      null
    );
  }

  function createCharacterLibraryCard(character) {
    const characterId =
      String(character?.id || "").trim();

    const name =
      getCharacterLibraryDisplayName(
        character
      );

    const speciesName =
      getCharacterLibrarySpeciesName(
        character
      );

    const className =
      formatSection17ClassLevelSummary(
        character
      );

    const level =
      getCharacterLibraryLevel(
        character
      );

    const imageUrl =
      getCharacterLibraryImageUrl(
        character
      );

    const disabled =
      !characterId ||
      isCharacterCreatorBusy();
    const lastUpdatedMillis =
      safeNumber(
        character?.builder?.lastSavedAtMillis ??
        character?.updatedAtMillis,
        0
      );
    const lastUpdated = lastUpdatedMillis
      ? new Date(lastUpdatedMillis)
          .toLocaleString()
      : "Not recorded";

    return `
      <article class="hg-character-card">
        ${
          imageUrl
            ? `
              <img
                class="hg-character-library-portrait"
                src="${escapeHtml(imageUrl)}"
                alt="${escapeHtml(name)}"
                loading="lazy"
                style="
                  width: 100%;
                  height: 220px;
                  max-height: 220px;
                  aspect-ratio: 16 / 9;
                  object-fit: cover;
                  display: block;
                  border-radius: 12px;
                  margin-bottom: 10px;
                  border: 1px solid rgba(116, 138, 255, 0.2);
                "
              >
            `
            : ""
        }

        <h3>
          ${escapeHtml(name)}
        </h3>

        <div class="hg-character-card-meta">
          ${escapeHtml(className)}

          <br>

          ${escapeHtml(speciesName)}

          <br>

          Last updated:
          ${escapeHtml(lastUpdated)}
        </div>

        <div class="hg-character-card-actions">
          <button
            type="button"
            class="primary"
            data-cc-action="open-character-sheet-from-library"
            data-character-id="${escapeHtml(
              characterId
            )}"
            ${disabled ? "disabled" : ""}
          >
            Open Sheet
          </button>

          <button
            type="button"
            data-cc-action="edit-character"
            data-character-id="${escapeHtml(
              characterId
            )}"
            ${disabled ? "disabled" : ""}
          >
            Edit
          </button>

          <button
            type="button"
            data-cc-action="duplicate-character"
            data-character-id="${escapeHtml(
              characterId
            )}"
            ${disabled ? "disabled" : ""}
          >
            Duplicate
          </button>

          <button
            type="button"
            data-cc-action="export-library-character"
            data-character-id="${escapeHtml(
              characterId
            )}"
            ${disabled ? "disabled" : ""}
          >
            Export
          </button>

          <button
            type="button"
            data-cc-action="delete-character"
            data-character-id="${escapeHtml(
              characterId
            )}"
            ${disabled ? "disabled" : ""}
          >
            ${
              creatorState.busyAction ===
              "delete-character"
                ? "Deleting..."
                : "Delete"
            }
          </button>
        </div>
      </article>
    `;
  }

  function renderCharacterLibraryEmptyState() {
    return `
      <div class="hg-character-empty-card">
        <h3>
          No saved characters yet
        </h3>

        <p>
          Start a new character and move through
          the guided creator one page at a time.
        </p>

        <button
          type="button"
          data-cc-action="new-character"
          ${
            isCharacterCreatorBusy()
              ? "disabled"
              : ""
          }
        >
          Start Character
        </button>
      </div>
    `;
  }

  function renderCharacterLibraryView() {
    refreshWizardElements();

    if (!W.root) {
      return;
    }

    const characters =
      Array.isArray(
        creatorState.characterCache
      )
        ? [...creatorState.characterCache]
        : [];

    characters.sort((a, b) => {
      return getCharacterLibraryDisplayName(a)
        .localeCompare(
          getCharacterLibraryDisplayName(b),
          undefined,
          {
            sensitivity: "base"
          }
        );
    });

    const cards =
      characters
        .map(
          createCharacterLibraryCard
        )
        .join("");

    W.root.innerHTML = `
      <div class="hg-character-library-header">
        <div>
          <h2>
            Your Characters
          </h2>

          <p>
            Open an existing character,
            duplicate it, or begin a new
            guided build.
          </p>
        </div>

        <button
          type="button"
          data-cc-action="new-character"
          ${
            isCharacterCreatorBusy()
              ? "disabled"
              : ""
          }
        >
          New Character
        </button>
      </div>

      <div class="hg-character-library-grid">
        ${
          cards ||
          renderCharacterLibraryEmptyState()
        }
      </div>

      <p
        id="characterCreatorStatus"
        class="status hg-character-status-line"
      >
        ${escapeHtml(
          creatorState.statusMessage ||
          ""
        )}
      </p>
    `;

    refreshWizardElements();
  }

  function openCharacterFromLibrary(
    characterId
  ) {
    if (
      blockCharacterBusyAction(
        "edit-character"
      )
    ) {
      return false;
    }

    const character =
      findCachedCharacter(
        characterId
      );

    if (!character) {
      setStatus(
        "That character could not be found in the library."
      );

      renderCharacterLibraryView();

      return false;
    }

    if (
      !confirmDiscardUnsavedDraft(
        "opening another character"
      )
    ) {
      return false;
    }

    if (
      !beginCharacterBusyAction(
        "edit-character"
      )
    ) {
      return false;
    }

    try {
    const requestedStep =
      getStepById(
        character?.builder?.currentStep ||
        "basics"
      ).id;

    replaceDraft(
      character,
      {
        characterId: character.id,
        dirty: false,
        stepId: requestedStep
      }
    );

    creatorState.draft =
      sanitizeDraftStrings(
        creatorState.draft
      );

    persistDraftToSession();

    setStatus(
      `Editing ${getCharacterLibraryDisplayName(
        character
      )}.`
    );

    navigateToStep(
      requestedStep
    );

    return true;
    } finally {
      endCharacterBusyAction(
        "edit-character"
      );
    }
  }

  function exportCharacterFromLibrary(
    characterId
  ) {
    const character =
      findCachedCharacter(
        characterId
      );

    if (!character) {
      setStatus(
        "That character could not be found in the library."
      );
      renderCharacterLibraryView();
      return false;
    }

    const json =
      createCharacterSheetJson(
        character
      );
    const blob = new Blob(
      [json],
      {
        type:
          "application/json;charset=utf-8"
      }
    );
    const url =
      URL.createObjectURL(blob);
    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      `${makeSafeFileName(
        getCharacterLibraryDisplayName(
          character
        )
      )}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 0);

    setStatus(
      `${getCharacterLibraryDisplayName(
        character
      )} was exported.`
    );

    return true;
  }

  function openCharacterSheetFromLibrary(
    characterId
  ) {
    if (
      blockCharacterBusyAction(
        "edit-character"
      )
    ) {
      return false;
    }

    const character =
      findCachedCharacter(
        characterId
      );

    if (!character) {
      setStatus(
        "That character could not be found in the library."
      );
      renderCharacterLibraryView();
      return false;
    }

    if (
      !confirmDiscardUnsavedDraft(
        "opening another character sheet"
      )
    ) {
      return false;
    }

    replaceDraft(
      character,
      {
        characterId:
          character.id,
        dirty: false,
        stepId:
          getStepById(
            character?.builder?.currentStep ||
            "review"
          ).id
      }
    );

    creatorState.draft =
      sanitizeDraftStrings(
        creatorState.draft
      );
    creatorState.viewMode =
      "library";
    persistDraftToSession();

    setStatus(
      `Opened ${getCharacterLibraryDisplayName(
        character
      )}.`
    );

    getSection17CharacterSheetView()
      .open(
        getCharacterSnapshot()
      );

    return true;
  }

  function duplicateCharacterFromLibrary(
    characterId
  ) {
    if (
      blockCharacterBusyAction(
        "duplicate-character"
      )
    ) {
      return false;
    }

    const character =
      findCachedCharacter(
        characterId
      );

    if (!character) {
      setStatus(
        "That character could not be found in the library."
      );

      renderCharacterLibraryView();

      return false;
    }

    if (
      !confirmDiscardUnsavedDraft(
        "duplicating another character"
      )
    ) {
      return false;
    }

    if (
      !beginCharacterBusyAction(
        "duplicate-character"
      )
    ) {
      return false;
    }

    try {
    duplicateIntoDraft(
      character
    );

    creatorState.draft =
      sanitizeDraftStrings(
        creatorState.draft
      );

    creatorState.currentCharacterId =
      null;

    creatorState.dirty =
      true;

    persistDraftToSession();

    setStatus(
      "Duplicate draft created. Saving it will create a separate character."
    );

    navigateToStep(
      "basics"
    );

    return true;
    } finally {
      endCharacterBusyAction(
        "duplicate-character"
      );
    }
  }

  registerCharacterLibraryRenderer(
    renderCharacterLibraryView
  );

  registerCharacterCreatorAction(
    "edit-character",

    ({ button }) => {
      openCharacterFromLibrary(
        button.dataset.characterId
      );
    }
  );

  registerCharacterCreatorAction(
    "open-character-sheet-from-library",

    ({ button }) => {
      openCharacterSheetFromLibrary(
        button.dataset.characterId
      );
    }
  );

  registerCharacterCreatorAction(
    "duplicate-character",

    ({ button }) => {
      duplicateCharacterFromLibrary(
        button.dataset.characterId
      );
    }
  );

  registerCharacterCreatorAction(
    "export-library-character",

    ({ button }) => {
      exportCharacterFromLibrary(
        button.dataset.characterId
      );
    }
  );


// =====================================================
// CHARACTER CREATOR SECTION 11 — BASICS / SPECIES
// =====================================================

  const SECTION11_DRAGONBORN_ANCESTRIES = Object.freeze([
    {
      id: "black",
      name: "Black",
      damageType: "Acid"
    },
    {
      id: "blue",
      name: "Blue",
      damageType: "Lightning"
    },
    {
      id: "brass",
      name: "Brass",
      damageType: "Fire"
    },
    {
      id: "bronze",
      name: "Bronze",
      damageType: "Lightning"
    },
    {
      id: "copper",
      name: "Copper",
      damageType: "Acid"
    },
    {
      id: "gold",
      name: "Gold",
      damageType: "Fire"
    },
    {
      id: "green",
      name: "Green",
      damageType: "Poison"
    },
    {
      id: "red",
      name: "Red",
      damageType: "Fire"
    },
    {
      id: "silver",
      name: "Silver",
      damageType: "Cold"
    },
    {
      id: "white",
      name: "White",
      damageType: "Cold"
    }
  ]);

  const SECTION11_EMBEDDED_PORTRAIT_MAX_BYTES =
    512 * 1024;

  const SECTION11_UPLOADED_PORTRAIT_MAX_BYTES =
    8 * 1024 * 1024;

  const descriptionStep = createDescriptionStep({
    $,
    SECTION11_EMBEDDED_PORTRAIT_MAX_BYTES,
    SECTION11_UPLOADED_PORTRAIT_MAX_BYTES,
    applyCompatibilityAliases,
    beginCharacterBusyAction,
    beginnerNote,
    cleanString,
    createEmptyCharacter,
    deleteCharacterPortrait:
      deps.deleteCharacterPortrait,
    endCharacterBusyAction,
    escapeHtml,
    getCreatorState: () => creatorState,
    getRoomCode,
    getSafeCharacterName,
    isCharacterCreatorBusy,
    markDraftChanged,
    normalizeCharacterImageValue,
    renderCreatorView: renderCurrentStep,
    safeDisplayString,
    safeNumber,
    setStatus,
    uploadCharacterPortrait:
      deps.uploadCharacterPortrait,
    wizardField
  });

  const {
    getSection11Portrait,
    hasSection11PortraitUploadHook,
    isSection11PortraitUrlAllowed,
    formatSection11PortraitBytes,
    isSection11PortraitFile,
    readSection11PortraitFileAsDataUrl,
    setSection11Portrait,
    clearSection11Portrait,
    cleanupSection11PreviousPortrait,
    replaceSection11Portrait,
    removeSection11Portrait,
    createSection11PortraitFromFile,
    uploadSection11PortraitFile,
    renderSection11PortraitPanel,
    renderDescriptionNameField,
    renderDescriptionAppearanceField,
    renderDescriptionNotesField,
    renderDescriptionStoryFields,
    handleSection11SetPortraitUrl,
    handleSection11RemovePortrait,
    handleSection11PortraitChange
  } = descriptionStep.compatibility;

  const basicsStep = createBasicsStep({
    beginnerNote,
    createEmptyCharacter,
    getCreatorState: () => creatorState,
    getSafeCharacterName,
    renderDescriptionAppearanceField,
    renderDescriptionNameField,
    renderDescriptionNotesField,
    renderSection11PortraitPanel,
    safeDisplayString,
    wizardField,
    wizardSelect
  });

  const {
    renderBasicsStep,
    isSection17BasicsComplete
  } = basicsStep.compatibility;

  const speciesStep = createSpeciesStep({
    $,
    ABILITY_DEFINITIONS,
    DARK_ELF_INNATE_SPELLS_2014,
    DEFAULT_SPECIES_TEMPLATES,
    DWARF_TOOL_CHOICES,
    FOREST_GNOME_INNATE_SPELLS_2014,
    SECTION11_DRAGONBORN_ANCESTRIES,
    SKILL_DEFINITIONS,
    STANDARD_LANGUAGE_OPTIONS,
    TIEFLING_INNATE_SPELLS_2014,
    WIZARD_CANTRIP_CHOICES_2014,
    applyCompatibilityAliases,
    beginnerNote,
    clampLevel,
    cleanArray,
    cleanString,
    cloneData,
    createAbilityMap,
    escapeHtml,
    formatSection12List,
    formatSignedNumber,
    getCreatorState: () => creatorState,
    getLegacy2014Metadata,
    getSafeSpeciesName,
    getSection14SkillEntry: (...args) => {
      return skillsStep.compatibility.getSection14SkillEntry(...args);
    },
    getSpeciesSourceLabel,
    getSubraceSourceLabel,
    isActiveRulesetEntry,
    makeSafeId,
    markDraftChanged,
    normalizeMovementSpeed,
    normalizeSection16Spell,
    recalculateAbilityTotals,
    removeAbilityBonusSourcesByPrefix,
    removeListProficiencySourcesByPrefix,
    removeSkillProficiencySourcesByPrefix,
    renderCatalogEntryDetails,
    renderCreatorView: renderCurrentStep,
    renderFullCatalogDescription,
    renderRulesetMetadata,
    safeDisplayString,
    safeNumber,
    setAbilityBonusSource,
    setSection14SkillEntry: (...args) => {
      return skillsStep.compatibility.setSection14SkillEntry(...args);
    },
    setSourceProficiencyList,
    setStatus,
    sourceMatches,
    synchronizeCanonicalSpellSources,
    wizardChoiceCard,
    wizardField,
    wizardSelect
  });

  const {
    getAllSpeciesTemplates,
    getSection11SelectedSpeciesTemplate,
    getSection11SelectedSubrace,
    clearSection11SpeciesMechanics,
    addSection11SkillProficiencies,
    applySection11MechanicBlock,
    getSection11DragonbornAncestry,
    getSection11ChoiceSource,
    getSection11LanguageChoices,
    getSection11SkillChoices,
    isSection11AbilityChoiceValid,
    isSection11SkillChoiceValid,
    isSection11LanguageChoiceValid,
    removeInnateSpellsBySourcePrefixes,
    setInnateSpellsForSource,
    getSection11HalfElfAbilityChoices,
    applySection11SpeciesChoiceMechanics,
    applySection11SpeciesMechanics,
    chooseSpeciesFromTemplate,
    chooseSection11Subrace,
    applySection11SpeciesChoices,
    applyCustomSpecies,
    addSpeciesTrait,
    removeSpeciesTrait,
    renderSpeciesStep,
    findSection11ActionElement,
    handleChooseSpeciesAction,
    handleChooseSubraceAction,
    handleApplySpeciesChoicesAction,
    handleUseCustomSpeciesAction,
    handleAddSpeciesTraitAction,
    handleRemoveSpeciesTraitAction,
    isSection17SpeciesComplete
  } = speciesStep.compatibility;

  registerCharacterStepRenderer(
    "basics",
    basicsStep.renderStep
  );

  registerCharacterStepRenderer(
    "species",
    speciesStep.renderStep
  );

  registerCharacterCreatorAction(
    "set-portrait-url",
    handleSection11SetPortraitUrl
  );

  registerCharacterCreatorAction(
    "remove-portrait",
    handleSection11RemovePortrait
  );

  speciesStep.actions.forEach((action) => {
    registerCharacterCreatorAction(action, (context) => {
      return speciesStep.handleStepClick(context);
    });
  });

  registerCharacterCreatorInputHandler(
    speciesStep.handleStepInput
  );

  registerCharacterCreatorChangeHandler(
    speciesStep.handleStepChange
  );

  registerCharacterCreatorChangeHandler(
    handleSection11PortraitChange
  );

// =====================================================
// CHARACTER CREATOR SECTION 12 — CLASS / SUBCLASS
// =====================================================

  function parseSection12List(value) {
    return String(value || "")
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function formatSection12List(value) {
    return Array.isArray(value)
      ? value.join(", ")
      : "";
  }

  function getSection12SkillPickerChoices() {
    return [
      {
        value: "",
        label: "Choose a skill"
      },

      ...SKILL_DEFINITIONS.map((skill) => {
        return {
          value: skill.name,
          label: `${skill.name} (${skill.ability.toUpperCase()})`
        };
      })
    ];
  }

  function getSection12CustomClassSkillNames() {
    return parseSection12List(
      $("ccCustomClassSkills")?.value
    );
  }

  function setSection12CustomClassSkillNames(
    skillNames
  ) {
    const field =
      $("ccCustomClassSkills");

    if (!field) {
      return false;
    }

    const normalizedNames = [];
    const seen = new Set();

    cleanArray(skillNames)
      .forEach((skillName) => {
        const match =
          SKILL_DEFINITIONS.find((skill) => {
            return (
              skill.name.toLowerCase() ===
              skillName.toLowerCase()
            );
          });

        const displayName =
          match?.name ||
          safeDisplayString(skillName);

        const key =
          displayName.toLowerCase();

        if (displayName && !seen.has(key)) {
          seen.add(key);
          normalizedNames.push(displayName);
        }
      });

    field.value =
      formatSection12List(normalizedNames);

    return true;
  }

  function updateSection12CustomClassSkillPicker(
    mode
  ) {
    const picker =
      $("ccCustomClassSkillPicker");

    const selectedSkill =
      safeDisplayString(
        picker?.value
      );

    let skillNames =
      getSection12CustomClassSkillNames();

    if (mode === "add") {
      if (!selectedSkill) {
        alert(
          "Choose a skill to add."
        );

        return false;
      }

      skillNames = [
        ...skillNames,
        selectedSkill
      ];
    }

    if (mode === "remove") {
      if (!selectedSkill) {
        alert(
          "Choose a skill to remove."
        );

        return false;
      }

      skillNames =
        skillNames.filter((skillName) => {
          return (
            skillName.toLowerCase() !==
            selectedSkill.toLowerCase()
          );
        });
    }

    if (mode === "add-all") {
      skillNames = [
        ...skillNames,
        ...SKILL_DEFINITIONS.map((skill) => {
          return skill.name;
        })
      ];
    }

    if (mode === "clear") {
      skillNames = [];
    }

    if (
      !setSection12CustomClassSkillNames(
        skillNames
      )
    ) {
      return false;
    }

    return true;
  }

  function getSection12PrimaryClass() {
    return getPrimaryClassEntry(
      creatorState.draft
    );
  }

  function getSection12LevelData(
    template,
    level
  ) {
    const levels =
      template?.levels &&
      typeof template.levels === "object"
        ? template.levels
        : {};

    return (
      levels[level] ||
      levels[String(level)] ||
      null
    );
  }

  function collectSection12Features(
    source,
    totalLevel,
    sourceLabel
  ) {
    const featureMap = new Map();

    const addFeature = (
      feature,
      unlockedLevel = 1
    ) => {
      if (!feature) {
        return;
      }

      const name =
        safeDisplayString(
          feature.name,
          "Unnamed Feature"
        );

      const id = makeSafeId(
        feature.id ||
        `${sourceLabel}-${unlockedLevel}-${name}`,
        "class-feature"
      );

      featureMap.set(id, {
        ...cloneData(feature),
        id,
        name,

        summary:
          safeDisplayString(
            feature.summary ||
            feature.description,
            "No description provided."
          ),

        level: Math.max(
          1,
          Math.round(
            safeNumber(
              feature.level,
              unlockedLevel
            )
          )
        ),

        source: sourceLabel
      });
    };

    (
      Array.isArray(source?.features)
        ? source.features
        : []
    ).forEach((feature) => {
      addFeature(
        feature,
        safeNumber(
          feature?.level,
          1
        )
      );
    });

    const levels =
      source?.levels &&
      typeof source.levels === "object"
        ? source.levels
        : {};

    Object.entries(levels)
      .sort((a, b) => {
        return (
          safeNumber(a[0], 0) -
          safeNumber(b[0], 0)
        );
      })
      .forEach(
        ([levelKey, levelData]) => {
          const unlockedLevel =
            Math.max(
              1,
              Math.round(
                safeNumber(
                  levelKey,
                  1
                )
              )
            );

          if (
            unlockedLevel >
            totalLevel
          ) {
            return;
          }

          (
            Array.isArray(
              levelData?.features
            )
              ? levelData.features
              : []
          ).forEach((feature) => {
            addFeature(
              feature,
              unlockedLevel
            );
          });
        }
      );

    return Array.from(
      featureMap.values()
    ).filter((feature) => {
      return (
        feature.level <=
        totalLevel
      );
    });
  }

  function normalizeSection12Subclass(
    rawSubclass,
    fallbackSource = "template"
  ) {
    const raw = rawSubclass || {};

    const name =
      safeDisplayString(
        raw.name,
        "Custom Subclass"
      );
    const subclassId = makeSafeId(
      raw.id || name,
      "custom-subclass"
    );

    const rawLevels =
      mergeSubclassFeatureLevels(
        raw,
        cloneData
      );

    return {
      ...cloneData(raw),
      ...getLegacy2014Metadata(
        "subclass",
        subclassId,
        raw,
        raw.classId || getSelectedClassTemplate()?.id
      ),

      id: subclassId,

      name,

      source:
        cleanImportSourceLabel(
          raw.source,
          fallbackSource
        ),

      summary:
        safeDisplayString(
          raw.summary ||
          raw.description,
          "No description provided."
        ),

      features:
        Array.isArray(raw.features)
          ? cloneData(raw.features)
          : [],

      levels: rawLevels
    };
  }

  function getSection12SubclassTemplates(
    classEntry =
      getSection12PrimaryClass()
  ) {
    const selectedClass =
      resolveClassTemplateForEntry(
        classEntry
      );

    const subclassMap =
      new Map();

    (
      Array.isArray(
        selectedClass?.subclasses
      )
        ? selectedClass.subclasses
        : []
    ).forEach((subclass) => {
      if (!isActiveRulesetEntry(subclass)) {
        return;
      }

      const normalized =
        normalizeSection12Subclass(
          {
            ...cloneData(subclass),
            classId:
              subclass?.classId ||
              selectedClass?.id ||
              ""
          },

          subclass?.source ||
          selectedClass?.source ||
          "template"
        );

      subclassMap.set(
        normalized.id,
        normalized
      );
    });

    const savedSubclass =
      getClassEntrySubclassTemplate(
        classEntry
      );

    if (
      savedSubclass &&
      isActiveRulesetEntry(savedSubclass) &&
      !subclassMap.has(savedSubclass.id)
    ) {
      const normalized =
        normalizeSection12Subclass(
          {
            ...cloneData(savedSubclass),
            classId:
              savedSubclass.classId ||
              selectedClass?.id ||
              ""
          },
          "character"
        );

      subclassMap.set(
        normalized.id,
        normalized
      );
    }

    return Array.from(
      subclassMap.values()
    ).sort((a, b) => {
      return a.name.localeCompare(
        b.name
      );
    });
  }

  function getSelectedSection12Subclass() {
    const primaryClass =
      getSection12PrimaryClass();

    if (!primaryClass) {
      return null;
    }

    return getClassEntrySubclassTemplate(
      primaryClass
    );
  }

  function refreshSelectedClassFeatures() {
    if (
      isMulticlassDraft(
        creatorState.draft
      )
    ) {
      creatorState.draft
        .features
        .classFeatures =
          getClassProgressionEntries(
            creatorState.draft
          ).flatMap(
            (classEntry, index) => {
              return collectSection12FeaturesForClassEntry(
                classEntry,
                index
              );
            }
          );

      syncSection12AsiChoicesForLevel();
      syncSection12ArtificerInfusionsForLevel();
      applySelectedClassFeatureMechanics();

      return creatorState.draft
        .features
        .classFeatures;
    }

    const selectedClass =
      getSelectedClassTemplate();

    const selectedSubclass =
      getSelectedSection12Subclass();

    const totalLevel =
      clampLevel(
        creatorState.draft
          .classProgression
          .totalLevel
      );

    const classFeatures =
      collectSection12Features(
        selectedClass,
        totalLevel,
        "class"
      );

    const subclassFeatures =
      collectSection12Features(
        selectedSubclass,
        totalLevel,
        "subclass"
      );

    creatorState.draft
      .features
      .classFeatures = [
        ...classFeatures,
        ...subclassFeatures
      ];

    syncSection12AsiChoicesForLevel();
    syncSection12ArtificerInfusionsForLevel();
    applySelectedClassFeatureMechanics();

    return creatorState.draft
      .features
      .classFeatures;
  }

  function applySection12ClassDefaults(
    classTemplate
  ) {
    if (!classTemplate) {
      return;
    }

    const totalLevel =
      clampLevel(
        creatorState.draft
          .classProgression
          .totalLevel
      );

    const primaryClass =
      getSection12PrimaryClass();

    const classSource =
      getClassSourceLabel(
        primaryClass ||
        classTemplate
      );

    setSourceProficiencyList(
      "savingThrows",
      classTemplate.savingThrows || [],
      classSource
    );

    setSourceProficiencyList(
      "armor",
      classTemplate.armorProficiencies || [],
      classSource
    );

    setSourceProficiencyList(
      "weapons",
      classTemplate.weaponProficiencies || [],
      classSource
    );

    setSourceProficiencyList(
      "tools",
      classTemplate.toolProficiencies || [],
      classSource
    );

    creatorState.draft
      .combat
      .proficiencyBonus =
        safeNumber(
          getSection12LevelData(
            classTemplate,
            totalLevel
          )?.proficiencyBonus,

          getGenericProficiencyBonus(
            totalLevel
          )
        );

    const levelData =
      getSection12LevelData(
        classTemplate,
        totalLevel
      ) || {};

    creatorState.draft
      .combat
      .hitDice = [
        {
          classId:
            classTemplate.id,

          className:
            classTemplate.name,

          die:
            classTemplate.hitDie ||
            "d8",

          count: totalLevel
        }
      ];

    const progressionType =
      classTemplate.spellcastingProgression ||
      classTemplate.progressionType ||
      "none";

    creatorState.draft
      .magic
      .spellcastingProgression =
        progressionType;

    creatorState.draft
      .magic
      .spellPreparation =
        classTemplate.spellPreparation ||
        "none";

    if (classTemplate.spellcastingAbility) {
      creatorState.draft
        .magic
        .spellcastingAbility =
          classTemplate.spellcastingAbility;
    } else if (progressionType === "none") {
      creatorState.draft
        .magic
        .spellcastingAbility = "";
    }

    creatorState.draft
      .magic
      .slots =
        cloneData(levelData.spellSlots || {});

    creatorState.draft
      .magic
      .pactMagic =
        cloneData(
          levelData.pactMagic || {
            slots: 0,
            slotLevel: 0
          }
        );

    calculateSection16SpellcastingValues({
      markDraft: false
    });

    const suggestedHp =
      calculateSection13SuggestedHp();

    if (
      suggestedHp !== null &&
      safeNumber(
        creatorState.draft
          .combat
          .maxHp,
        1
      ) <= 1
    ) {
      creatorState.draft
        .combat
        .maxHp = suggestedHp;

      creatorState.draft
        .combat
        .currentHp = suggestedHp;
    }

    refreshSelectedClassFeatures();

    applyCompatibilityAliases(
      creatorState.draft
    );
  }

  function chooseSection12Class(
    classId
  ) {
    if (
      !selectClassTemplate(
        classId
      )
    ) {
      return false;
    }

    const selectedClass =
      getSelectedClassTemplate();

    applySection12ClassDefaults(
      selectedClass
    );

    markDraftChanged();

    return true;
  }

  function applySection12CustomClass() {
    if (isMulticlassDraft()) {
      return blockMulticlassEdit(
        "Creating a custom primary class"
      );
    }

    const name =
      safeDisplayString(
        $("ccCustomClassName")
          ?.value
      );

    if (!name) {
      alert(
        "Enter a custom class name."
      );

      return false;
    }

    const totalLevel =
      clampLevel(
        creatorState.draft
          .classProgression
          .totalLevel
      );
    const movementEffects =
      readCustomClassMovementEffects($);

    const customClass =
      normalizeClassTemplate(
        {
          id: makeSafeId(
            name,
            "custom-class"
          ),

          name,
          source: "custom",

          summary:
            safeDisplayString(
              $("ccCustomClassSummary")
                ?.value,
              "Custom class."
            ),

          hitDie:
            $("ccCustomClassHitDie")
              ?.value ||
            "d8",

          primaryAbilities:
            parseSection12List(
              $("ccCustomClassPrimaryAbilities")
                ?.value
            ),

          savingThrows:
            parseSection12List(
              $("ccCustomClassSavingThrows")
                ?.value
            ),

          armorProficiencies:
            parseSection12List(
              $("ccCustomClassArmor")
                ?.value
            ),

          weaponProficiencies:
            parseSection12List(
              $("ccCustomClassWeapons")
                ?.value
            ),

          toolProficiencies:
            parseSection12List(
              $("ccCustomClassTools")
                ?.value
            ),

          effects:
            movementEffects,

          skillChoices: {
            choose: Math.max(
              0,
              Math.round(
                safeNumber(
                  $("ccCustomClassSkillCount")
                    ?.value,
                  0
                )
              )
            ),

            from:
              parseSection12List(
                $("ccCustomClassSkills")
                  ?.value
              )
          },

          subclassLevel:
            Math.max(
              1,
              Math.round(
                safeNumber(
                  $("ccCustomClassSubclassLevel")
                    ?.value,
                  3
                )
              )
            ),

          levels: {
            1: {
              proficiencyBonus: 2,
              features: []
            }
          },

          subclasses: []
        },

        "custom"
      );

    const oldPrimaryClass =
      getPrimaryClassEntry(
        creatorState.draft
      );

    const oldClassSource =
      getClassSourceLabel(
        oldPrimaryClass
      );

    if (oldClassSource) {
      removeSkillProficiencySource(
        oldClassSource
      );

      removeListProficiencySource(
        oldClassSource
      );
    }

    creatorState.draft
      .classProgression
      .classes = [
        {
          entryId: createClassEntryId(
            customClass.id ||
              customClass.name,
            0,
            new Set(),
            getPrimaryClassEntry(
              creatorState.draft
            )?.entryId
          ),
          classId:
            customClass.id,

          className:
            customClass.name,

          source: "custom",
          level: totalLevel,
          subclassId: "",
          subclassName: "",

          hitDie: normalizeClassEntryHitDie(
            customClass.hitDie,
            8
          ),

          templateSnapshot:
            cloneData(
              customClass
            ),

          choices: {}
        }
      ];

    recalculateClassTotalLevel(
      creatorState.draft
    );

    applySection12ClassDefaults(
      customClass
    );

    markDraftChanged();

    return true;
  }

  function chooseSection12Subclass(
    subclassId
  ) {
    const primaryClass =
      getSection12PrimaryClass();

    const subclass =
      getSection12SubclassTemplates()
        .find((item) => {
          return (
            item.id ===
            subclassId
          );
        });

    if (
      !primaryClass ||
      !subclass
    ) {
      return false;
    }

    primaryClass.subclassId =
      subclass.id;

    primaryClass.subclassName =
      subclass.name;

    primaryClass.choices = {
      ...(primaryClass.choices || {}),

      subclassSnapshot:
        cloneData(subclass)
    };

    refreshSelectedClassFeatures();

    applyCompatibilityAliases(
      creatorState.draft
    );

    markDraftChanged();

    return true;
  }

  function applySection12CustomSubclass() {
    const primaryClass =
      getSection12PrimaryClass();

    const name =
      safeDisplayString(
        $("ccCustomSubclassName")
          ?.value
      );

    if (!primaryClass) {
      alert(
        "Choose a class before creating a subclass."
      );

      return false;
    }

    if (!name) {
      alert(
        "Enter a custom subclass name."
      );

      return false;
    }

    const selectedClass =
      getSelectedClassTemplate();

    const unlockLevel =
      Math.max(
        1,
        Math.round(
          safeNumber(
            $("ccCustomSubclassLevel")
              ?.value,

            selectedClass
              ?.subclassLevel ||
            3
          )
        )
      );

    const customSubclass =
      normalizeSection12Subclass(
        {
          id: makeSafeId(
            name,
            "custom-subclass"
          ),

          name,
          classId:
            primaryClass.classId ||
            selectedClass?.id ||
            "",
          source: "custom",

          summary:
            safeDisplayString(
              $("ccCustomSubclassSummary")
                ?.value,
              "Custom subclass."
            ),

          features: [],
          levels: {},
          unlockLevel
        },

        "custom"
      );

    primaryClass.subclassId =
      customSubclass.id;

    primaryClass.subclassName =
      customSubclass.name;

    primaryClass.choices = {
      ...(primaryClass.choices || {}),

      subclassSnapshot:
        cloneData(
          customSubclass
        )
    };

    refreshSelectedClassFeatures();

    applyCompatibilityAliases(
      creatorState.draft
    );

    markDraftChanged();

    return true;
  }

  function clearSection12Subclass() {
    const primaryClass =
      getSection12PrimaryClass();

    if (!primaryClass) {
      return false;
    }

    primaryClass.subclassId = "";
    primaryClass.subclassName = "";

    primaryClass.choices = {
      ...(primaryClass.choices || {})
    };

    delete primaryClass
      .choices
      .subclassSnapshot;

    refreshSelectedClassFeatures();

    applyCompatibilityAliases(
      creatorState.draft
    );

    markDraftChanged();

    return true;
  }

  function calculateSection12ClassFeaturesThroughLevel() {
    if (
      isMulticlassDraft(
        creatorState.draft
      )
    ) {
      return getClassProgressionEntries(
        creatorState.draft
      )
        .flatMap(
          (classEntry, index) => {
            return collectSection12FeaturesForClassEntry(
              classEntry,
              index
            );
          }
        )
        .sort((a, b) => {
          return (
            safeNumber(a.classIndex, 0) -
              safeNumber(b.classIndex, 0) ||
            safeNumber(a.level, 1) -
              safeNumber(b.level, 1) ||
            String(a.name).localeCompare(
              String(b.name)
            )
          );
        });
    }

    const primaryClass = getSection12PrimaryClass();
    const defaultClass = findDefaultClassDefinition(
      primaryClass?.classId,
      primaryClass?.className
    );
    const classLevel = Math.max(
      1,
      getClassEntryLevel(
        primaryClass,
        creatorState.draft.classProgression.totalLevel
      )
    );

    const classFeatures = defaultClass
      ? getDefaultClassFeaturesThroughLevel(
        defaultClass,
        classLevel
      )
      : collectSection12Features(
          getSelectedClassTemplate(),
          classLevel,
          "class"
        );

    const subclassFeatures =
      collectSection12Features(
      getSelectedSection12Subclass(),
      classLevel,
      "subclass"
    );

    const classEntryId = getClassProgressionEntryKey(
      primaryClass,
      0
    );

    return [
      ...classFeatures,
      ...subclassFeatures
    ].map((feature) => ({
      ...feature,
      classIndex: 0,
      classEntryId,
      choiceKey: `${classEntryId}:${feature.id}`,
      classId:
        primaryClass?.classId ||
        defaultClass?.id ||
        "",
      className:
        primaryClass?.className ||
        defaultClass?.name ||
        "Class",
      classLevel
    })).sort((a, b) => {
      return (
        safeNumber(a.level, 1) -
          safeNumber(b.level, 1) ||
        String(a.name).localeCompare(
          String(b.name)
        )
      );
    });
  }

  function getSection12ClassFeaturesThroughLevel() {
    const dependencyKey = createDerivedSignature({
      classProgression:
        creatorState.draft
          ?.classProgression,
      classChoices:
        creatorState.draft
          ?.classChoices,
      roomClasses:
        getDerivedObjectIdentity(
          creatorState.roomClassCache
        )
    });

    return derivedCache.get(
      "unlocked-class-features",
      dependencyKey,
      () => calculateSection12ClassFeaturesThroughLevel()
    );
  }

  function getSection12FutureClassFeatures() {
    if (
      isMulticlassDraft(
        creatorState.draft
      )
    ) {
      return getClassProgressionEntries(
        creatorState.draft
      )
        .flatMap((classEntry, classIndex) => {
          const template =
            resolveClassTemplateForEntry(
              classEntry
            );

          if (!template) {
            return [];
          }

          const classLevel =
            getClassEntryLevel(
              classEntry,
              1
            );

          const defaultClass =
            findDefaultClassDefinition(
              classEntry?.classId,
              classEntry?.className
            );

          const classFeatures =
            defaultClass
              ? getDefaultClassFeaturesThroughLevel(
                  defaultClass,
                  20
                )
              : collectSection12Features(
                  template,
                  20,
                  "class"
                );

          const subclassFeatures =
            collectSection12Features(
              getClassEntrySubclassTemplate(
                classEntry
              ),
              20,
              "subclass"
            );

          const classEntryId =
            getClassProgressionEntryKey(
              classEntry,
              classIndex
            );

          return [
            ...classFeatures,
            ...subclassFeatures
          ]
            .filter((feature) => {
              return feature.level > classLevel;
            })
            .map((feature) => ({
              ...feature,
              classIndex,
              classEntryId,
              className:
                classEntry?.className ||
                template.name ||
                `Class ${classIndex + 1}`
            }));
        })
        .sort((a, b) => {
          return (
            safeNumber(a.classIndex, 0) -
              safeNumber(b.classIndex, 0) ||
            safeNumber(a.level, 1) -
              safeNumber(b.level, 1) ||
            String(a.name).localeCompare(
              String(b.name)
            )
          );
        });
    }

    const selectedClass =
      getSelectedClassTemplate();

    if (!selectedClass) {
      return [];
    }

    const currentLevel = clampLevel(
      creatorState.draft
        .classProgression
        .totalLevel
    );

    const classFeatures = collectSection12Features(
      selectedClass,
      20,
      "class"
    );

    const subclassFeatures =
      collectSection12Features(
        getSelectedSection12Subclass(),
        20,
        "subclass"
      );

    return [
      ...classFeatures,
      ...subclassFeatures
    ]
      .filter((feature) => {
        return feature.level > currentLevel;
      })
      .sort((a, b) => {
        return (
          safeNumber(a.level, 1) -
            safeNumber(b.level, 1) ||
          String(a.name).localeCompare(
            String(b.name)
          )
        );
      });
  }

  function getSection12FeatureChoiceKey(feature) {
    if (!feature) {
      return "";
    }

    return cleanString(
      feature.choiceKey ||
      (
        feature.classEntryId && feature.id
          ? `${feature.classEntryId}:${feature.id}`
          : feature.id
      )
    );
  }

  function getSection12FeatureChooseCount(feature) {
    return Math.max(
      1,
      Math.round(
        safeNumber(
          getProgressionValueByLevel(
            feature?.chooseByLevel,
            feature?.classLevel || feature?.level || 1,
            feature?.choose || 1
          ),
          feature?.choose || 1
        )
      )
    );
  }

  function getSection12FeatureStoredChoices(feature) {
    const choiceKey = getSection12FeatureChoiceKey(feature);
    const classEntry = getClassEntryAtIndex(
      safeNumber(feature?.classIndex, 0)
    );
    const entryChoices = normalizeClassChoiceMap(
      classEntry?.choices?.classFeatures
    );
    const legacyChoices = normalizeClassChoiceMap(
      creatorState.draft.classChoices
    );
    const legacyDirectChoices =
      feature?.name ===
        "Fighting Style" &&
      cleanString(
        classEntry?.choices
          ?.fightingStyle
      )
        ? [
            cleanString(
              classEntry.choices
                .fightingStyle
            )
          ]
        : [];

    const storedChoices =
      entryChoices[choiceKey] ||
      entryChoices[feature?.id] ||
      legacyChoices[choiceKey] ||
      (
        safeNumber(feature?.classIndex, 0) === 0
          ? legacyChoices[feature?.id]
          : null
      );

    return uniqueCleanArray(
      cleanArray(storedChoices).length
        ? storedChoices
        : legacyDirectChoices
    );
  }

  function setSection12FeatureStoredChoices(
    feature,
    values = []
  ) {
    const choiceKey = getSection12FeatureChoiceKey(feature);

    if (!choiceKey) {
      return false;
    }

    const cleanValues = uniqueCleanArray(values);
    const classIndex = Math.max(
      0,
      Math.round(safeNumber(feature?.classIndex, 0))
    );
    const classEntry = getClassEntryAtIndex(classIndex);

    if (!classEntry) {
      return false;
    }

    classEntry.choices = {
      ...(classEntry.choices || {})
    };

    const entryChoices = normalizeClassChoiceMap(
      classEntry.choices.classFeatures
    );

    if (cleanValues.length) {
      entryChoices[choiceKey] = cleanValues;
    } else {
      delete entryChoices[choiceKey];
    }

    if (feature.id !== choiceKey) {
      delete entryChoices[feature.id];
    }

    classEntry.choices.classFeatures = entryChoices;

    const compatibilityChoices = normalizeClassChoiceMap(
      creatorState.draft.classChoices
    );

    if (classIndex === 0) {
      if (cleanValues.length) {
        compatibilityChoices[feature.id] = cleanValues;
        compatibilityChoices[choiceKey] = cleanValues;
      } else {
        delete compatibilityChoices[feature.id];
        delete compatibilityChoices[choiceKey];
      }
    } else {
      delete compatibilityChoices[feature.id];
      delete compatibilityChoices[choiceKey];
    }

    creatorState.draft.classChoices = compatibilityChoices;
    return true;
  }

  function getSection12FeatureChoiceOptionRecords(feature) {
    const classLevel = Math.max(
      1,
      safeNumber(feature?.classLevel, feature?.level || 1)
    );
    const optionSource = cleanString(feature?.optionSource);
    let values = uniqueCleanArray(feature?.options);

    if (!values.length && optionSource === "subclasses") {
      const classEntry =
        getClassEntryAtIndex(
          Math.max(
            0,
            Math.round(
              safeNumber(
                feature?.classIndex,
                0
              )
            )
          )
        );

      values = getSection12SubclassTemplates(
        classEntry
      ).map(
        (subclass) => subclass.name
      );
    }

    if (
      !values.length &&
      (
        optionSource === "proficientSkills" ||
        optionSource === "proficientSkillsOrThievesTools"
      )
    ) {
      values = Object.entries(
        creatorState.draft.proficiencies.skills || {}
      )
        .filter(([, entry]) => entry?.proficient === true)
        .map(([skillName]) => skillName);

      if (
        optionSource === "proficientSkillsOrThievesTools" &&
        !values.includes("Thieves' Tools")
      ) {
        values.push("Thieves' Tools");
      }
    }

    if (!values.length && optionSource === "artisanTools") {
      values = [...ARTISAN_TOOL_OPTIONS];
    }

    if (!values.length && optionSource === "castableSpellsAllClasses") {
      const spellcastingClass = getSpellcastingSummary(
        creatorState.draft
      ).classes.find((entry) => {
        return (
          cleanString(entry.classEntryId) ===
            cleanString(feature?.classEntryId) ||
          (
            cleanString(entry.classId) === cleanString(feature?.classId) &&
            safeNumber(entry.level, 0) === classLevel
          )
        );
      });
      const maximumLevel = Math.max(
        0,
        safeNumber(spellcastingClass?.maxSpellLevel, 0)
      );

      return DEFAULT_SPELLS
        .filter((spell) => {
          return safeNumber(spell.level, 0) <= maximumLevel;
        })
        .map((spell) => ({
          value: spell.id,
          label: `${spell.name} (${safeNumber(spell.level, 0) === 0 ? "Cantrip" : `Level ${spell.level}`})`,
          summary: spell.summary || spell.description || ""
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }

    const minimumLevels =
      feature?.minimumLevelByOption &&
      typeof feature.minimumLevelByOption === "object"
        ? feature.minimumLevelByOption
        : {};
    const optionDetails =
      feature?.optionDetails &&
      typeof feature.optionDetails === "object"
        ? feature.optionDetails
        : {};

    return uniqueCleanArray(values)
      .filter((value) => {
        return classLevel >= safeNumber(minimumLevels[value], 0);
      })
      .map((value) => ({
        value,
        label: value,
        summary: cleanString(optionDetails[value]?.summary),
        cost: optionDetails[value]?.cost
      }));
  }

  function getSection12FeatureChoiceOptions(feature) {
    return getSection12FeatureChoiceOptionRecords(feature)
      .map((entry) => entry.value);
  }

  function toggleSection12ClassFeatureChoice(
    featureKey,
    option
  ) {
    const feature = getSection12ClassFeaturesThroughLevel()
      .find((entry) => {
        return (
          getSection12FeatureChoiceKey(entry) === featureKey ||
          entry.id === featureKey
        );
      });
    const options = getSection12FeatureChoiceOptions(feature);

    if (
      feature?.type !== "choice" ||
      !options.includes(option)
    ) {
      return false;
    }

    const chooseCount = getSection12FeatureChooseCount(feature);
    let selected = getSection12FeatureStoredChoices(feature);

    if (
      !selected.includes(option) &&
      feature.repeatableChoice === false
    ) {
      const duplicate = getSection12ClassFeaturesThroughLevel()
        .some((otherFeature) => {
          return (
            getSection12FeatureChoiceKey(otherFeature) !==
              getSection12FeatureChoiceKey(feature) &&
            otherFeature.repeatableChoice === false &&
            getSection12FeatureStoredChoices(otherFeature)
              .includes(option)
          );
        });

      if (duplicate) {
        setStatus(
          `${option} is already selected by another Fighting Style feature.`
        );
        return false;
      }
    }

    if (selected.includes(option)) {
      selected = selected.filter(
        (value) => value !== option
      );
    } else if (chooseCount === 1) {
      selected = [option];
    } else if (selected.length < chooseCount) {
      selected = [...selected, option];
    } else {
      selected = [
        ...selected.slice(1),
        option
      ];
    }

    setSection12FeatureStoredChoices(feature, selected);
    applySelectedClassFeatureMechanics();
    applyCompatibilityAliases(creatorState.draft);
    markDraftChanged();

    return true;
  }

  function getSection12AsiChoiceState(featureId) {
    const slot =
      getSection12UnlockedAsiSlot(featureId);
    const draftChoices = normalizeClassChoiceMap(
      creatorState.draft.classChoices
    );
    const classEntry = slot
      ? getClassEntryAtIndex(slot.classIndex)
      : null;
    const entryChoices = normalizeClassChoiceMap(
      classEntry?.choices?.classFeatures
    );
    const values =
      (
        slot
          ? (
              entryChoices[slot.id] ||
              entryChoices[slot.legacyId] ||
              entryChoices[slot.featureId] ||
              draftChoices[slot.id] ||
              draftChoices[slot.legacyId]
            )
          : null
      ) ||
      draftChoices[featureId] ||
      (
        slot?.selectedMode
          ? [
              `mode:${slot.selectedMode}`,
              ...(
                slot.selectedMode === "feat" &&
                slot.selectedFeatId
                  ? [`feat:${slot.selectedFeatId}`]
                  : []
              )
            ]
          : []
      ) ||
      [];

    return {
      featureId:
        cleanString(
          slot?.id ||
          featureId
        ),
      mode: values.includes("mode:feat")
        ? "feat"
        : values.includes("mode:asi")
          ? "asi"
          : "",
      abilities: values
        .filter((value) => value.startsWith("ability:"))
        .map((value) => value.split(":")[1])
        .filter(Boolean),
      featId: cleanString(
        values.find((value) => value.startsWith("feat:"))
      ).slice("feat:".length),
      featChoices: {
        ...normalizeFeatChoiceSelections(
          slot?.featChoices
        ),
        ...parseFeatChoiceSelections(values)
      }
    };
  }

  const FEAT_WEAPON_OPTIONS = Object.freeze([
    "Club", "Dagger", "Greatclub", "Handaxe", "Javelin", "Light Hammer",
    "Mace", "Quarterstaff", "Sickle", "Spear", "Light Crossbow", "Dart",
    "Shortbow", "Sling", "Battleaxe", "Flail", "Glaive", "Greataxe",
    "Greatsword", "Halberd", "Lance", "Longsword", "Maul", "Morningstar",
    "Pike", "Rapier", "Scimitar", "Shortsword", "Trident", "War Pick",
    "Warhammer", "Whip", "Blowgun", "Hand Crossbow", "Heavy Crossbow",
    "Longbow", "Net"
  ]);

  const FEAT_TOOL_OPTIONS = Object.freeze([
    ...ARTISAN_TOOL_OPTIONS,
    "Disguise kit", "Forgery kit", "Herbalism kit", "Navigator's tools",
    "Poisoner's kit", "Thieves' tools", "Dice set", "Dragonchess set",
    "Playing card set", "Three-Dragon Ante set", "Bagpipes", "Drum",
    "Dulcimer", "Flute", "Horn", "Lute", "Lyre", "Pan flute", "Shawm",
    "Viol"
  ]);

  const FEAT_FEATURE_OPTIONS = Object.freeze({
    "eldritch-invocations": [
      "Armor of Shadows", "Beast Speech", "Beguiling Influence",
      "Devil's Sight", "Eldritch Mind", "Eldritch Sight", "Eyes of the Rune Keeper",
      "Fiendish Vigor", "Gaze of Two Minds", "Mask of Many Faces",
      "Misty Visions", "Thief of Five Fates"
    ],
    "battle-master-maneuvers": [
      "Ambush", "Bait and Switch", "Brace", "Commander's Strike",
      "Commanding Presence", "Disarming Attack", "Distracting Strike",
      "Evasive Footwork", "Feinting Attack", "Goading Attack", "Grappling Strike",
      "Lunging Attack", "Maneuvering Attack", "Menacing Attack", "Parry",
      "Precision Attack", "Pushing Attack", "Quick Toss", "Rally", "Riposte",
      "Sweeping Attack", "Tactical Assessment", "Trip Attack"
    ],
    "metamagic-options": [
      "Careful Spell", "Distant Spell", "Empowered Spell", "Extended Spell",
      "Heightened Spell", "Quickened Spell", "Seeking Spell", "Subtle Spell",
      "Transmuted Spell", "Twinned Spell"
    ]
  });

  function getSection12FeatChoiceLimit(choice) {
    return getFeatSpellChoiceLimit(
      choice,
      getCharacterProficiencyBonus(
        creatorState.draft
      )
    );
  }

  function filterRepeatedFeatChoiceOptions(
    options,
    choice,
    state = {}
  ) {
    const feat = DEFAULT_FEATS.find(
      (entry) => {
        return entry.id ===
          state.featId;
      }
    );

    if (
      !feat ||
      feat.repeatable !== true ||
      feat.repeatByChoice !== true
    ) {
      return options;
    }

    const currentSlot =
      getSection12UnlockedAsiSlot(
        state.featureId
      );
    const currentSlotIds =
      new Set(
        [
          state.featureId,
          currentSlot?.id,
          currentSlot?.legacyId,
          currentSlot?.featureId
        ]
          .map((value) => {
            return cleanString(value);
          })
          .filter(Boolean)
      );
    const usedValues =
      new Set(
        getSelectedDefaultFeatInstances()
          .filter((instance) => {
            return (
              instance.featId ===
                feat.id &&
              !currentSlotIds.has(
                cleanString(
                  instance.slotId
                )
              )
            );
          })
          .flatMap((instance) => {
            return uniqueCleanArray(
              instance
                .featChoices?.[
                  choice?.id
                ]
            );
          })
          .map((value) => {
            return makeSafeId(
              value,
              ""
            );
          })
          .filter(Boolean)
      );

    return options.filter((option) => {
      return !usedValues.has(
        makeSafeId(
          option?.value,
          ""
        )
      );
    });
  }

  function getSection12FeatChoiceOptions(choice, state = {}) {
    const directOptions = uniqueCleanArray(choice?.options);

    if (directOptions.length) {
      return filterRepeatedFeatChoiceOptions(
        directOptions.map((value) => ({
          value,
          label: value
        })),
        choice,
        state
      );
    }

    const type = cleanString(choice?.type).toLowerCase();

    if (type === "ability" || type === "abilitypoints") {
      return filterRepeatedFeatChoiceOptions(
        ABILITY_DEFINITIONS.map((ability) => ({
          value: ability.name,
          label: ability.name
        })),
        choice,
        state
      );
    }

    if (type === "skill") {
      return filterRepeatedFeatChoiceOptions(
        SKILL_DEFINITIONS
        .filter((skill) => {
          if (choice?.proficientOnly !== true) {
            return true;
          }

          return getSection14SkillEntry(skill).proficient === true;
        })
        .map((skill) => ({
          value: skill.id,
          label: skill.name
        })),
        choice,
        state
      );
    }

    if (type === "language") {
      return filterRepeatedFeatChoiceOptions(
        STANDARD_LANGUAGE_OPTIONS.map(
          (value) => ({
            value,
            label: value
          })
        ),
        choice,
        state
      );
    }

    if (type === "tool") {
      const options = choice?.category === "artisan"
        ? ARTISAN_TOOL_OPTIONS
        : FEAT_TOOL_OPTIONS;

      return filterRepeatedFeatChoiceOptions(
        options.map((value) => ({
          value,
          label: value
        })),
        choice,
        state
      );
    }

    if (type === "weapon") {
      return filterRepeatedFeatChoiceOptions(
        FEAT_WEAPON_OPTIONS.map(
          (value) => ({
            value,
            label: value
          })
        ),
        choice,
        state
      );
    }

    if (type === "skillortool") {
      return filterRepeatedFeatChoiceOptions([
        ...SKILL_DEFINITIONS.map((skill) => ({
          value: `skill:${skill.id}`,
          label: `Skill: ${skill.name}`
        })),
        ...FEAT_TOOL_OPTIONS.map((tool) => ({
          value: `tool:${tool}`,
          label: `Tool: ${tool}`
        }))
      ], choice, state);
    }

    if (type === "feature") {
      return filterRepeatedFeatChoiceOptions(
        uniqueCleanArray(
          FEAT_FEATURE_OPTIONS[
            choice?.source
          ] || []
        ).map((value) => ({
          value,
          label: value
        })),
        choice,
        state
      );
    }

    if (type === "spell") {
      const restrictionContext = {
        selections: state?.featChoices || {},
        alignment: creatorState.draft?.identity?.alignment || ""
      };

      return filterRepeatedFeatChoiceOptions(
        DEFAULT_SPELLS
        .filter((spell) => {
          return isSpellEligibleForFeatChoice(
            spell,
            choice,
            restrictionContext
          );
        })
        .map((spell) => ({
          value: spell.id,
          label: `${spell.name} (${safeNumber(spell.level, 0) ? `Level ${spell.level}` : "Cantrip"})`
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
        choice,
        state
      );
    }

    return [];
  }

  function calculateSelectedDefaultFeatInstances(
    character = creatorState.draft
  ) {
    const slots = getUnlockedFeatChoiceSlots(character)
      .filter((slot) => {
        return slot.selectedMode === "feat" && slot.selectedFeatId;
      });
    const instances = slots
      .map((slot) => {
        const feat = DEFAULT_FEATS.find((entry) => {
          return entry.id === slot.selectedFeatId;
        });

        return feat
          ? {
              id: slot.id,
              slotId: slot.id,
              feat,
              featId: feat.id,
              featChoices: normalizeFeatChoiceSelections(slot.featChoices)
            }
          : null;
      })
      .filter(Boolean);
    const slottedFeatIds = new Set(
      instances.map((instance) => instance.featId)
    );

    normalizeFeatIds(character?.feats)
      .filter((featId) => !slottedFeatIds.has(featId))
      .forEach((featId) => {
        const feat = DEFAULT_FEATS.find((entry) => entry.id === featId);

        if (feat) {
          instances.push({
            id: `legacy-${featId}`,
            slotId: "",
            feat,
            featId,
            featChoices: {}
          });
        }
      });

    return instances;
  }

  function getSelectedDefaultFeatInstances(
    character = creatorState.draft
  ) {
    const dependencyKey = createDerivedSignature({
      unlockedSlots:
        getUnlockedFeatChoiceSlots(
          character
        ),
      legacyFeats: character?.feats
    });

    return derivedCache.get(
      "selected-feat-instances",
      dependencyKey,
      () => calculateSelectedDefaultFeatInstances(
        character
      )
    );
  }

  function calculateSelectedFeatNumericEffect(
    character,
    effectType
  ) {
    const level = clampLevel(
      character?.classProgression?.totalLevel || character?.level || 1
    );

    return getSelectedDefaultFeatInstances(character)
      .flatMap((instance) => {
        return Array.isArray(instance.feat?.effects)
          ? instance.feat.effects
          : [];
      })
      .filter((effect) => effect?.type === effectType)
      .reduce((total, effect) => {
        return (
          total +
          safeNumber(effect.value, 0) +
          safeNumber(effect.perLevel, 0) * level
        );
      }, 0);
  }

  function setSection12FeatChoiceValues(
    featureId,
    choiceId,
    selectedValues = []
  ) {
    const state = getSection12AsiChoiceState(featureId);
    const feat = DEFAULT_FEATS.find((entry) => entry.id === state.featId);
    const featChoice = feat?.choices?.find((entry) => entry.id === choiceId);

    if (!feat || !featChoice) {
      return false;
    }

    const limit = getSection12FeatChoiceLimit(featChoice);
    const availableOptions = getSection12FeatChoiceOptions(featChoice, state);
    const allowedValues = new Set(
      availableOptions.map((option) => option.value)
    );
    const requestedValues =
      uniqueCleanArray(
        selectedValues
      );
    const cleanValues = requestedValues
      .filter((value) => !allowedValues.size || allowedValues.has(value))
      .slice(0, limit);
    const featChoices = {
      ...normalizeFeatChoiceSelections(state.featChoices)
    };

    if (
      requestedValues.length &&
      cleanValues.length !==
        Math.min(
          requestedValues.length,
          limit
        )
    ) {
      return false;
    }

    if (cleanValues.length) {
      featChoices[choiceId] = cleanValues;
    } else {
      delete featChoices[choiceId];
    }

    (Array.isArray(feat.choices) ? feat.choices : [])
      .filter((entry) => entry.classChoiceId === choiceId)
      .forEach((entry) => {
        delete featChoices[entry.id];
      });

    if (
      feat.repeatByChoice === true &&
      cleanValues.some((value) => {
        const valueId =
          makeSafeId(
            value,
            ""
          );

        return getSelectedDefaultFeatInstances()
          .some((instance) => {
            return (
              instance.featId === feat.id &&
              ![
                featureId,
                getSection12UnlockedAsiSlot(featureId)?.id
              ].includes(instance.slotId) &&
              uniqueCleanArray(
                instance
                  .featChoices?.[
                    choiceId
                  ]
              ).some(
                (selectedValue) => {
                  return (
                    makeSafeId(
                      selectedValue,
                      ""
                    ) ===
                    valueId
                  );
                }
              )
            );
          });
      })
    ) {
      return false;
    }

    const encodedChoices = Object.entries(featChoices)
      .flatMap(([entryChoiceId, values]) => {
        return values.map((value) => {
          return encodeFeatChoiceValue(entryChoiceId, value);
        });
      })
      .filter(Boolean);

    setSection12AsiChoiceValues(
      featureId,
      ["mode:feat", `feat:${feat.id}`, ...encodedChoices]
    );
    syncSection12AdvancementChoice(featureId);
    applySelectedFeatMechanics();
    applyCompatibilityAliases(creatorState.draft);
    markDraftChanged();

    return true;
  }

  function applySelectedFeatMechanics() {
    const draft = creatorState.draft;

    if (!draft?.abilities || !draft?.proficiencies || !draft?.magic) {
      return;
    }

    const previousResources = Object.fromEntries(
      (Array.isArray(draft.featMechanics?.resources)
        ? draft.featMechanics.resources
        : []
      ).map((entry) => [entry.id, entry])
    );
    const previousSpellcasting = Object.fromEntries(
      (Array.isArray(draft.featMechanics?.spellcasting)
        ? draft.featMechanics.spellcasting
        : []
      ).map((entry) => [entry.id, entry])
    );
    const previousRestChoices =
      Object.fromEntries(
        (
          Array.isArray(
            draft.featMechanics
              ?.restChoices
          )
            ? draft.featMechanics
                .restChoices
            : []
        ).map((entry) => {
          return [entry.id, entry];
        })
      );
    const previousFeatSources =
      draft.magic.featSources &&
      typeof draft.magic.featSources === "object" &&
      !Array.isArray(draft.magic.featSources)
        ? draft.magic.featSources
        : {};
    const existingSpellcastingAbility = cleanString(
      getSpellcastingClassOptions(draft)
        .find((entry) => {
          return cleanString(entry?.spellcastingAbility);
        })
        ?.spellcastingAbility ||
      draft.magic.spellcastingAbility ||
      Object.values(previousFeatSources)
        .find((source) => {
          return cleanString(source?.spellcastingAbility);
        })
        ?.spellcastingAbility
    );
    const instances = getSelectedDefaultFeatInstances(draft);
    const mechanics = {
      schemaVersion: 4,
      hpBonus: 0,
      initiativeBonus: 0,
      speedBonus: 0,
      resistances: [],
      resistanceSources: [],
      naturalWeapons: [],
      armorClassModifiers: [],
      attackModifiers: [],
      selectedFeatures: [],
      elementalAdepts: [],
      damageReductions: [],
      senses: [],
      restChoices: [],
      ritualBooks: [],
      actions: [],
      combatProfiles: [],
      telepathy: [],
      healingBonuses: [],
      resources: [],
      spellcasting: [],
      situationalEffects: [],
      passiveEffects: [],
      instances: []
    };

    removeAbilityBonusSourcesByPrefix(["feat:"]);
    removeSkillProficiencySourcesByPrefix(["feat:"]);
    removeListProficiencySourcesByPrefix(["feat:"]);
    draft.magic.featSources = {};
    const normalAbilityScores =
      createNormalAbilityCapScoreMap(
        draft
      );

    const getAbility = (value) => {
      const normalized = makeSafeId(value, "");

      return ABILITY_DEFINITIONS.find((ability) => {
        return (
          ability.id === normalized ||
          makeSafeId(ability.name, "") === normalized
        );
      }) || null;
    };

    const getSkill = (value) => {
      const normalized = makeSafeId(value, "");

      return SKILL_DEFINITIONS.find((skill) => {
        return (
          skill.id === normalized ||
          makeSafeId(skill.name, "") === normalized
        );
      }) || null;
    };

    const spellcastingAbilityByClass =
      Object.freeze({
        artificer: "int",
        bard: "cha",
        cleric: "wis",
        druid: "wis",
        sorcerer: "cha",
        warlock: "cha",
        wizard: "int"
      });
    const planarScionBenefits =
      Object.freeze({
        "chaotic-outer-plane": {
          damageType: "poison",
          spellId: "minor-illusion"
        },
        "evil-outer-plane": {
          damageType: "necrotic",
          spellId: "chill-touch"
        },
        "good-outer-plane": {
          damageType: "radiant",
          spellId: "sacred-flame"
        },
        "lawful-outer-plane": {
          damageType: "force",
          spellId: "guidance"
        },
        "the-outlands": {
          damageType: "psychic",
          spellId: "mage-hand"
        }
      });
    const giantStrikeDetails =
      Object.freeze({
        "cloud-strike": {
          damage: "1d4 thunder",
          summary:
            "Once per turn on a melee or thrown-weapon hit, deal 1d4 thunder damage; a failed Wisdom save teleports the target up to 30 feet."
        },
        "fire-strike": {
          damage: "1d10 fire",
          summary:
            "Once per turn on a melee or thrown-weapon hit, deal 1d10 fire damage."
        },
        "frost-strike": {
          damage: "1d6 cold",
          summary:
            "Once per turn on a melee or thrown-weapon hit, deal 1d6 cold damage; a failed Constitution save reduces the target's speed to 0 until your next turn."
        },
        "hill-strike": {
          damage: "1d6 weapon",
          summary:
            "Once per turn on a melee or thrown-weapon hit, deal an extra 1d6 weapon damage; a failed Strength save knocks the target prone."
        },
        "stone-strike": {
          damage: "1d6 force",
          summary:
            "Once per turn on a melee or thrown-weapon hit, deal 1d6 force damage; a failed Strength save pushes the target 10 feet away."
        },
        "storm-strike": {
          damage: "1d6 lightning",
          summary:
            "Once per turn on a melee or thrown-weapon hit, deal 1d6 lightning damage; a failed Constitution save hinders the target's attacks until your next turn."
        }
      });
    const fightingStyleSummaries =
      Object.freeze({
        "blind-fighting":
          "Gain blindsight out to 10 feet.",
        interception:
          "Use a reaction while wielding a weapon or shield to reduce damage to a nearby creature.",
        "superior-technique":
          "Learn one Battle Master maneuver and gain one d6 superiority die.",
        "thrown-weapon-fighting":
          "Draw a thrown weapon as part of the attack and gain +2 damage with thrown weapons.",
        "unarmed-fighting":
          "Unarmed strikes deal 1d6 plus Strength, or 1d8 while both hands are free."
      });
    const invocationSummaries =
      Object.freeze({
        "beast-speech":
          "Cast speak with animals at will.",
        "eldritch-mind":
          "Gain advantage on Constitution saves made to maintain concentration.",
        "gaze-of-two-minds":
          "Perceive through a willing humanoid's senses until the connection ends.",
        "misty-visions":
          "Cast silent image at will.",
        "thief-of-five-fates":
          "Cast bane once using a warlock spell slot, recovering the use after a long rest."
      });

    const getBaseDarkvisionRange = () => {
      const traitSources = [
        ...(
          Array.isArray(
            draft.species?.traits
          )
            ? draft.species.traits
            : []
        ),
        ...(
          Array.isArray(
            draft.species
              ?.templateSnapshot
              ?.traits
          )
            ? draft.species
                .templateSnapshot
                .traits
            : []
        ),
        ...(
          Array.isArray(
            draft.species
              ?.choices
              ?.subraceSnapshot
              ?.traits
          )
            ? draft.species
                .choices
                .subraceSnapshot
                .traits
            : []
        )
      ];

      return traitSources.reduce(
        (maximum, trait) => {
          if (
            !makeSafeId(
              trait?.id ||
              trait?.name,
              ""
            ).includes(
              "darkvision"
            )
          ) {
            return maximum;
          }

          const match =
            cleanString(
              trait?.summary ||
              trait?.description
            ).match(
              /(\d+)\s*(?:feet|foot|ft\.?)/i
            );

          return Math.max(
            maximum,
            match
              ? safeNumber(
                  match[1],
                  0
                )
              : 60
          );
        },
        0
      );
    };

    const addSkillSource = (skillValue, sourceName, expertise = false) => {
      const skill = getSkill(skillValue);

      if (!skill) {
        return;
      }

      const current = getSection14SkillEntry(skill);

      setSection14SkillEntry(skill, {
        proficient: true,
        expertise: expertise || current.expertise === true,
        source: uniqueCleanArray([
          ...cleanArray(current.source),
          sourceName
        ])
      });
    };

    instances.forEach((instance, index) => {
      const feat = instance.feat;
      const sourceName = `feat:${instance.slotId || `${feat.id}-${index + 1}`}`;
      const choices = normalizeFeatChoiceSelections(instance.featChoices);
      const bonusMap = createAbilityMap(0);
      const proficiencyValues = {
        savingThrows: [],
        armor: [],
        weapons: [],
        tools: [],
        languages: []
      };
      const spellIds = [];
      const spellGrants = [];
      const spellRecords = [];
      const spellChoiceEffect =
        (Array.isArray(feat.effects)
          ? feat.effects
          : []
        ).find((effect) => {
          return effect?.type === "spellChoice";
        }) || {};

      const resolveSpellAbility = (
        descriptor = {}
      ) => {
        const abilityChoiceId = cleanString(
          descriptor.abilityChoiceId
        );
        const selectedClassId = makeSafeId(
          choices[
            descriptor.classChoiceId
          ]?.[0] ||
          descriptor.classId,
          ""
        );
        const ability =
          getAbility(descriptor.ability) ||
          getAbility(
            choices[abilityChoiceId]?.[0]
          ) ||
          getAbility(
            choices[
              "spellcasting-ability"
            ]?.[0] ||
            choices.ability?.[0]
          ) ||
          getAbility(
            spellcastingAbilityByClass[
              selectedClassId
            ]
          ) ||
          (
            feat.usesExistingSpellcastingAbility ===
              true
              ? getAbility(
                  existingSpellcastingAbility
                )
              : null
          );

        return {
          ability,
          abilityChoiceId,
          selectedClassId
        };
      };

      const addFeatSpellRecords = ({
        descriptor = {},
        origin = "choice",
        choiceId = "",
        ids = []
      }) => {
        uniqueCleanArray(ids)
          .forEach((spellId) => {
            const spell =
              getSection16SpellById(
                spellId,
                draft
              );
            const spellLevel = Math.max(
              0,
              safeNumber(spell?.level, 0)
            );
            const abilityResult =
              resolveSpellAbility(
                descriptor
              );
            const rawUses =
              descriptor.usesEach ??
              descriptor.uses;
            const maximumUses =
              rawUses ===
                "proficiencyBonus"
                ? getCharacterProficiencyBonus(
                    draft
                  )
                : (
                    rawUses === null ||
                    rawUses === undefined
                      ? null
                      : Math.max(
                          0,
                          safeNumber(
                            rawUses,
                            0
                          )
                        )
                  );
            const atWill =
              descriptor.atWill === true ||
              (
                spellLevel === 0 &&
                maximumUses === null
              );
            const spellResourceId =
              `${instance.id}:spell:${spellId}`;
            const previous =
              previousSpellcasting[
                spellResourceId
              ] ||
              previousResources[
                spellResourceId
              ];
            const currentUses =
              maximumUses === null ||
              atWill
                ? null
                : Math.min(
                    maximumUses,
                    Math.max(
                      0,
                      safeNumber(
                        previous?.currentUses,
                        maximumUses
                      )
                    )
                  );
            const sourceClassId =
              abilityResult
                .selectedClassId ||
              makeSafeId(
                descriptor.classId,
                ""
              );
            const record = {
              id: spellResourceId,
              sourceType: "feat",
              sourceId: instance.id,
              featId: feat.id,
              featName: feat.name,
              spellId,
              spellName: cleanString(
                spell?.name,
                spellId
              ),
              spellLevel,
              origin,
              fixed: origin !== "choice",
              choiceId:
                cleanString(choiceId),
              known: descriptor.known !== false,
              prepared: descriptor.prepared === true,
              alwaysPrepared: descriptor.alwaysPrepared === true,
              innate: descriptor.innate === true,
              spellcastingAbility:
                abilityResult
                  .ability?.id || "",
              abilitySource:
                cleanString(
                  descriptor.ability ||
                  abilityResult
                    .abilityChoiceId ||
                  descriptor
                    .classChoiceId ||
                  descriptor.classId ||
                  (
                    feat
                      .usesExistingSpellcastingAbility
                      ? "existing-spellcasting"
                      : ""
                  )
                ),
              sourceClassId,
              atWill,
              maximumUses:
                atWill
                  ? null
                  : maximumUses,
              currentUses:
                atWill
                  ? null
                  : currentUses,
              freeCastUses: atWill ? 0 : maximumUses ?? 0,
              recharge:
                atWill
                  ? ""
                  : cleanString(
                      descriptor.recharge,
                      maximumUses === null
                        ? ""
                        : "longRest"
                    ),
              canUseSpellSlots:
                descriptor
                  .canUseSpellSlots ===
                true,
              resourceId: maximumUses === null || atWill ? "" : spellResourceId,
              restrictions: {
                levels:
                  Array.isArray(
                    descriptor.levels
                  )
                    ? cloneData(
                        descriptor.levels
                      )
                    : [],
                schools:
                  uniqueCleanArray(
                    descriptor.schools
                  ),
                ritualOnly:
                  descriptor
                    .ritualOnly === true,
                attackRollOnly:
                  descriptor
                    .attackRollOnly ===
                  true,
                list: cleanString(
                  descriptor.list
                )
              }
            };

            spellIds.push(spellId);
            spellRecords.push(record);
            mechanics.spellcasting.push(
              record
            );

            if (
              record.maximumUses !==
                null &&
              record.atWill !== true
            ) {
              mechanics.resources.push({
                ...record,
                resourceId:
                  `spell:${spellId}`,
                name:
                  record.spellName,
                kind: "featSpell"
              });
            }
          });
      };

      const addResistanceSource = ({
        damageType,
        id,
        kind = "feat",
        mutableAfterRest = false
      }) => {
        const normalizedDamageType =
          cleanString(
            damageType
          ).toLowerCase();

        if (!normalizedDamageType) {
          return;
        }

        mechanics.resistanceSources.push({
          id,
          featId: feat.id,
          featName: feat.name,
          sourceId: instance.id,
          kind,
          damageType:
            normalizedDamageType,
          mutableAfterRest
        });
        mechanics.resistances.push(
          normalizedDamageType
        );
      };

      const addSelectedFeature = ({
        choiceId,
        featureType,
        name,
        summary = "",
        details = {}
      }) => {
        mechanics.selectedFeatures.push({
          id:
            `${instance.id}:${choiceId}:${makeSafeId(name, "feature")}`,
          featId: feat.id,
          featName: feat.name,
          sourceId: instance.id,
          choiceId,
          featureType,
          name,
          summary,
          ...cloneData(details)
        });
      };

      (Array.isArray(feat.effects) ? feat.effects : [])
        .forEach((effect) => {
          const type = cleanString(effect?.type);

          if (type === "abilityIncrease") {
            const ability = getAbility(effect.ability);

            if (ability) {
              addCappedNormalAbilityIncrease({
                bonusMap,
                scoreMap:
                  normalAbilityScores,
                abilityId: ability.id,
                amount:
                  safeNumber(
                    effect.value,
                    1
                  ),
                maximum:
                  getFeatAbilityEffectMaximum(
                    effect
                  )
              });
            }
          }

          if (type === "abilityChoice") {
            const choiceId = cleanString(effect.id, "ability");
            const selectedAbility = getAbility(choices[choiceId]?.[0]);

            if (selectedAbility) {
              addCappedNormalAbilityIncrease({
                bonusMap,
                scoreMap:
                  normalAbilityScores,
                abilityId:
                  selectedAbility.id,
                amount:
                  safeNumber(
                    effect.increase,
                    1
                  ),
                maximum:
                  getFeatAbilityEffectMaximum(
                    effect
                  )
              });
            }
          }

          if (type === "abilityScoreImprovement") {
            const maximum =
              getFeatAbilityEffectMaximum(
                effect
              );

            uniqueCleanArray(effect.choiceIds)
              .flatMap((choiceId) => uniqueCleanArray(choices[choiceId]))
              .slice(0, Math.max(1, safeNumber(effect.points, 2)))
              .forEach((value) => {
                const ability = getAbility(value);

                if (ability) {
                  addCappedNormalAbilityIncrease({
                    bonusMap,
                    scoreMap:
                      normalAbilityScores,
                    abilityId:
                      ability.id,
                    amount: 1,
                    maximum
                  });
                }
              });
          }

          if (type === "savingThrowProficiencyFromAbilityChoice") {
            const ability = getAbility(
              choices[effect.choiceId || "ability"]?.[0]
            );

            if (ability) {
              proficiencyValues.savingThrows.push(ability.name);
            }
          }

          if (type === "armorProficiency") {
            proficiencyValues.armor.push(...uniqueCleanArray(effect.values));
          }

          if (type === "weaponProficiency") {
            proficiencyValues.weapons.push(...uniqueCleanArray(effect.values));
          }

          if (type === "languageProficiency" && effect.language) {
            proficiencyValues.languages.push(effect.language);
          }

          if (type === "proficiency") {
            const category = cleanString(effect.category);

            if (Object.hasOwn(proficiencyValues, category) && effect.value) {
              proficiencyValues[category].push(effect.value);
            }
          }

          if (type === "hpBonus") {
            mechanics.hpBonus +=
              safeNumber(effect.value, 0) +
              safeNumber(effect.perLevel, 0) * clampLevel(
                draft.classProgression?.totalLevel || draft.level || 1
              );
          }

          if (type === "initiativeBonus") {
            mechanics.initiativeBonus += safeNumber(effect.value, 0);
          }

          if (type === "speedBonus") {
            mechanics.speedBonus += safeNumber(effect.value, 0);
          }

          if (type === "damageResistance") {
            uniqueCleanArray(
              effect.damageTypes ||
              [effect.damageType]
            ).forEach((damageType) => {
              addResistanceSource({
                damageType,
                id:
                  `${instance.id}:resistance:${makeSafeId(damageType, "damage")}`
              });
            });
          }

          if (type === "naturalWeapon") {
            mechanics.naturalWeapons.push({
              id:
                `${instance.id}:${cleanString(effect.id, "natural-weapon")}`,
              featId: feat.id,
              featName: feat.name,
              sourceId: instance.id,
              name:
                cleanString(
                  effect.name,
                  effect.id ===
                    "dragon-claws"
                    ? "Dragon Claws"
                    : "Natural Weapon"
                ),
              attackAbility:
                cleanString(
                  effect.attackAbility,
                  "str"
                ),
              proficient: true,
              damageDice:
                cleanString(
                  effect.damageDice ||
                  effect.damage
                ),
              damageType:
                cleanString(
                  effect.damageType
                ).toLowerCase(),
              weaponType:
                "Natural melee weapon",
              notes:
                `Granted by ${feat.name}`
            });
          }

          if (
            type ===
              "armorClassBonus"
          ) {
            mechanics
              .armorClassModifiers
              .push({
                id:
                  `${instance.id}:${cleanString(effect.id, "armor-class-bonus")}`,
                featId: feat.id,
                featName:
                  feat.name,
                sourceId:
                  instance.id,
                value:
                  safeNumber(
                    effect.value,
                    0
                  ),
                condition:
                  cleanString(
                    effect.condition
                  ),
                requires:
                  cloneData(
                    effect.requires ||
                    {}
                  )
              });
          }

          if (
            type ===
              "elementalAdept"
          ) {
            uniqueCleanArray(
              choices[
                effect.choiceId ||
                "damage-type"
              ]
            ).forEach((damageType) => {
              mechanics.elementalAdepts.push({
                id:
                  `${instance.id}:elemental-adept:${makeSafeId(damageType, "damage")}`,
                featId:
                  feat.id,
                featName:
                  feat.name,
                sourceId:
                  instance.id,
                damageType:
                  cleanString(
                    damageType
                  ).toLowerCase(),
                ignoreResistance:
                  effect
                    .ignoreResistance ===
                  true,
                minimumDamageDie:
                  Math.max(
                    1,
                    safeNumber(
                      effect
                        .minimumDamageDie,
                      1
                    )
                  )
              });
            });
          }

          if (
            type ===
              "damageReduction"
          ) {
            mechanics.damageReductions.push({
              id:
                `${instance.id}:damage-reduction`,
              featId: feat.id,
              featName: feat.name,
              sourceId: instance.id,
              value:
                Math.max(
                  0,
                  safeNumber(
                    effect.value,
                    0
                  )
                ),
              damageTypes:
                uniqueCleanArray(
                  effect.damageTypes
                ).map((value) => {
                  return value.toLowerCase();
                }),
              condition:
                cleanString(
                  effect.condition
                )
            });
          }

          if (
            type ===
              "darkvisionBonus"
          ) {
            const bonus =
              Math.max(
                0,
                safeNumber(
                  effect.value,
                  0
                )
              );
            const baseRange =
              getBaseDarkvisionRange();

            mechanics.senses.push({
              id:
                `${instance.id}:darkvision`,
              featId: feat.id,
              featName: feat.name,
              sourceId: instance.id,
              sense:
                "darkvision",
              baseRange,
              bonus,
              range:
                baseRange +
                bonus
            });
          }

          if (
            type ===
              "restChoiceResistance"
          ) {
            const restChoiceId =
              `${instance.id}:resistance`;
            const options =
              uniqueCleanArray(
                effect.damageTypes
              ).map((value) => {
                return value
                  .toLowerCase();
              });
            const choiceId =
              cleanString(
                effect.choiceId,
                "default-resistance"
              );
            const selected =
              options.includes(
                cleanString(
                  previousRestChoices[
                    restChoiceId
                  ]?.selected
                ).toLowerCase()
              )
                ? cleanString(
                    previousRestChoices[
                      restChoiceId
                    ].selected
                  ).toLowerCase()
                : cleanString(
                    choices[
                      choiceId
                    ]?.[0] ||
                    options[0]
                  ).toLowerCase();

            mechanics.restChoices.push({
              id:
                restChoiceId,
              featId: feat.id,
              featName: feat.name,
              sourceId: instance.id,
              choiceId,
              kind:
                "damageResistance",
              selected,
              options,
              rest:
                cleanString(
                  effect.rest,
                  "longRest"
                )
            });
            addResistanceSource({
              damageType:
                selected,
              id:
                `${restChoiceId}:source`,
              kind:
                "restChoice",
              mutableAfterRest:
                true
            });
          }

          if (type === "ritualBook") {
            const maximumSpellLevel =
              Math.max(
                0,
                Math.floor(
                  clampLevel(
                    draft
                      .classProgression
                      ?.totalLevel ||
                    draft.level ||
                    1
                  ) / 2
                )
              );
            const ritualClassId =
              makeSafeId(
                choices[
                  "ritual-class"
                ]?.[0],
                ""
              );
            const selectedRitualIds =
              uniqueCleanArray(
                choices[
                  "ritual-spells"
                ]
              );
            const spellIds =
              selectedRitualIds
                .filter((spellId) => {
                  const spell =
                    getSection16SpellById(
                      spellId,
                      draft
                    );

                  return Boolean(
                    spell &&
                    spell.ritual ===
                      true &&
                    safeNumber(
                      spell.level,
                      0
                    ) <=
                      maximumSpellLevel &&
                    (
                      !ritualClassId ||
                      uniqueCleanArray(
                        spell.classes
                      ).some((classId) => {
                        return (
                          makeSafeId(
                            classId,
                            ""
                          ) ===
                          ritualClassId
                        );
                      })
                    )
                  );
                })
                .slice(
                  0,
                  Math.max(
                    0,
                    safeNumber(
                      effect
                        .initialSpells,
                      2
                    )
                  )
                );

            mechanics.ritualBooks.push({
              id:
                `${instance.id}:ritual-book`,
              featId: feat.id,
              featName: feat.name,
              sourceId: instance.id,
              ritualClassId,
              ritualClassName:
                cleanString(
                  choices[
                    "ritual-class"
                  ]?.[0]
                ),
              maximumSpellLevel,
              spellIds,
              spells:
                spellIds.map((spellId) => {
                  const spell =
                    getSection16SpellById(
                      spellId,
                      draft
                    );

                  return {
                    id: spellId,
                    name:
                      cleanString(
                        spell?.name,
                        spellId
                      ),
                    level:
                      safeNumber(
                        spell?.level,
                        0
                      )
                  };
                }),
              rejectedSpellIds:
                selectedRitualIds
                  .filter((spellId) => {
                    return !spellIds
                      .includes(
                        spellId
                      );
                  })
            });
          }

          if (type === "planarScion") {
            const selectedPlane =
              cleanString(
                choices[
                  effect.choiceId ||
                  "outer-plane"
                ]?.[0]
              );
            const benefit =
              planarScionBenefits[
                makeSafeId(
                  selectedPlane,
                  ""
                )
              ];

            if (benefit) {
              addResistanceSource({
                damageType:
                  benefit
                    .damageType,
                id:
                  `${instance.id}:planar-resistance`,
                kind:
                  "planarScion"
              });
              addFeatSpellRecords({
                descriptor: {
                  atWill: true,
                  abilityChoiceId:
                    cleanString(
                      effect
                        .abilityChoiceId,
                      "spellcasting-ability"
                    ),
                  noMaterialComponents:
                    true
                },
                origin:
                  "planar-scion",
                choiceId:
                  cleanString(
                    effect.choiceId,
                    "outer-plane"
                  ),
                ids: [
                  benefit
                    .spellId
                ]
              });
            }
          }

          if (type === "giantStrike") {
            const selectedStrike =
              cleanString(
                choices[
                  effect.choiceId ||
                  "giant-strike"
                ]?.[0]
              );
            const details =
              giantStrikeDetails[
                makeSafeId(
                  selectedStrike,
                  ""
                )
              ];

            if (
              selectedStrike &&
              details
            ) {
              mechanics.actions.push({
                id:
                  `${instance.id}:giant-strike`,
                featId: feat.id,
                featName: feat.name,
                sourceId: instance.id,
                name:
                  selectedStrike,
                activation:
                  "Once per turn on a melee or thrown-weapon hit",
                resourceId:
                  `${instance.id}:giant-strike`,
                damage:
                  details.damage,
                summary:
                  details.summary
              });
            }
          }

          if (type === "unarmedDamage") {
            mechanics.combatProfiles.push({
              id:
                `${instance.id}:unarmed-damage`,
              featId: feat.id,
              featName: feat.name,
              sourceId: instance.id,
              type:
                "unarmedDamage",
              die:
                cleanString(
                  effect.die,
                  "d4"
                )
            });
          }

          if (type === "telepathy") {
            mechanics.telepathy.push({
              id:
                `${instance.id}:telepathy`,
              featId: feat.id,
              featName: feat.name,
              sourceId: instance.id,
              range:
                Math.max(
                  0,
                  safeNumber(
                    effect.range,
                    0
                  )
                ),
              responseRequiredSharedLanguage:
                effect
                  .responseRequiredSharedLanguage ===
                true,
              oneWay:
                true
            });
          }

          if (type === "healingBonus") {
            const value =
              effect.value ===
                "proficiencyBonus"
                ? getCharacterProficiencyBonus(
                    draft
                  )
                : Math.max(
                    0,
                    safeNumber(
                      effect.value,
                      0
                    )
                  );

            mechanics.healingBonuses.push({
              id:
                `${instance.id}:healing-bonus`,
              featId: feat.id,
              featName: feat.name,
              sourceId: instance.id,
              value,
              formula:
                cleanString(
                  effect.value
                ),
              sources:
                uniqueCleanArray(
                  effect.sources
                )
            });
          }

          if (type === "resource") {
            const maximumUses = effect.uses === "proficiencyBonus"
              ? getCharacterProficiencyBonus(draft)
              : Math.max(0, safeNumber(effect.uses, 0));
            const resourceId = `${instance.id}:${effect.id}`;
            const previous = previousResources[resourceId];

            mechanics.resources.push({
              id: resourceId,
              featId: feat.id,
              featName: feat.name,
              resourceId: effect.id,
              name: effect.label || effect.id,
              maximumUses,
              currentUses: Math.min(
                maximumUses,
                Math.max(0, safeNumber(previous?.currentUses, maximumUses))
              ),
              recharge: effect.recharge || "longRest",
              die: effect.die || ""
            });
          }

          if (type === "spellGrant") {
            const ids = uniqueCleanArray(effect.spellIds || [effect.spellId]);
            spellGrants.push({ ...effect, spellIds: ids });
            addFeatSpellRecords({
              descriptor: effect,
              origin: "grant",
              ids
            });
          }

          if (type === "custom" && effect.summary) {
            const situationalId =
              `${instance.id}:${effect.id}`;
            const handling =
              ["automatic", "tracked", "manual"]
                .includes(effect.handling)
                ? effect.handling
                : "";

            if (handling) {
              const actionEconomy =
                ["action", "bonusAction", "reaction", "passive"]
                  .includes(effect.actionEconomy)
                  ? effect.actionEconomy
                  : "passive";
              const section =
                ["attack", "defense", "utility"]
                  .includes(effect.section)
                  ? effect.section
                  : "utility";
              const usage =
                effect.usage &&
                typeof effect.usage === "object" &&
                !Array.isArray(effect.usage)
                  ? cloneData(effect.usage)
                  : null;
              const maximumUses =
                usage &&
                usage.scope === "self"
                  ? Math.max(
                      0,
                      safeNumber(
                        usage.maximumUses,
                        0
                      )
                    )
                  : 0;

              mechanics.situationalEffects.push({
                id: situationalId,
                featId: feat.id,
                featName: feat.name,
                sourceId: instance.id,
                effectId: effect.id,
                handling,
                actionEconomy,
                activationTime:
                  cleanString(
                    effect.activationTime
                  ),
                recharge:
                  cleanString(
                    effect.recharge,
                    "none"
                  ),
                section,
                condition:
                  cleanString(
                    effect.condition
                  ),
                summary:
                  cleanString(
                    effect.summary
                  ),
                instructions:
                  cleanString(
                    effect.instructions,
                    effect.summary
                  ),
                usage,
                resourceId:
                  handling === "tracked" &&
                  maximumUses > 0
                    ? situationalId
                    : ""
              });

              if (
                handling === "tracked" &&
                maximumUses > 0
              ) {
                const previous =
                  previousResources[
                    situationalId
                  ];

                mechanics.resources.push({
                  id: situationalId,
                  featId: feat.id,
                  featName: feat.name,
                  resourceId:
                    effect.id,
                  name:
                    cleanString(
                      usage.label,
                      feat.name
                    ),
                  maximumUses,
                  currentUses:
                    Math.min(
                      maximumUses,
                      Math.max(
                        0,
                        safeNumber(
                          previous?.currentUses,
                          maximumUses
                        )
                      )
                    ),
                  recharge:
                    cleanString(
                      effect.recharge,
                      "none"
                    ),
                  die: ""
                });
              }
            } else {
              mechanics.passiveEffects.push({
                id: situationalId,
                featId: feat.id,
                featName: feat.name,
                summary: effect.summary
              });
            }
          }
        });

      (Array.isArray(feat.choices) ? feat.choices : [])
        .forEach((featChoice) => {
          const selectedValues = uniqueCleanArray(choices[featChoice.id]);
          const type = cleanString(featChoice.type).toLowerCase();

          if (type === "skill") {
            const expertise = featChoice.id === "expertise";
            selectedValues.forEach((value) => {
              addSkillSource(value, sourceName, expertise);
            });
          }

          if (type === "skillortool") {
            selectedValues.forEach((value) => {
              if (value.startsWith("skill:")) {
                addSkillSource(value.slice("skill:".length), sourceName);
              } else if (value.startsWith("tool:")) {
                proficiencyValues.tools.push(value.slice("tool:".length));
              }
            });
          }

          if (type === "tool") {
            proficiencyValues.tools.push(...selectedValues);
          }

          if (type === "language") {
            proficiencyValues.languages.push(...selectedValues);
          }

          if (type === "weapon") {
            proficiencyValues.weapons.push(...selectedValues);
          }

          if (type === "feature") {
            const choiceId =
              cleanString(
                featChoice.id
              );
            const source =
              cleanString(
                featChoice.source
              );

            selectedValues.forEach((value) => {
              if (
                source ===
                  "eldritch-invocations" ||
                choiceId ===
                  "invocation"
              ) {
                const details =
                  DEFAULT_INVOCATION_DETAILS[
                    value
                  ] || {};
                const summary =
                  cleanString(
                    details.summary,
                    invocationSummaries[
                      makeSafeId(
                        value,
                        ""
                      )
                    ] ||
                    "Selected Eldritch Invocation."
                  );

                addSelectedFeature({
                  choiceId,
                  featureType:
                    "eldritchInvocation",
                  name: value,
                  summary,
                  details: {
                    effects:
                      cloneData(
                        details.effects ||
                        []
                      )
                  }
                });

                (
                  Array.isArray(
                    details.effects
                  )
                    ? details.effects
                    : []
                ).forEach(
                  (
                    invocationEffect
                  ) => {
                    if (
                      invocationEffect
                        .type ===
                        "skillProficiency"
                    ) {
                      uniqueCleanArray(
                        invocationEffect
                          .skills
                      ).forEach(
                        (skill) => {
                          addSkillSource(
                            skill,
                            sourceName
                          );
                        }
                      );
                    } else if (
                      invocationEffect
                        .type ===
                        "sense"
                    ) {
                      mechanics.senses.push({
                        id:
                          `${instance.id}:invocation-sense:${makeSafeId(value, "sense")}`,
                        featId:
                          feat.id,
                        featName:
                          feat.name,
                        sourceId:
                          instance.id,
                        sense:
                          cleanString(
                            invocationEffect
                              .sense,
                            "special sense"
                          ),
                        range:
                          Math.max(
                            0,
                            safeNumber(
                              invocationEffect
                                .range,
                              0
                            )
                          ),
                        magicalDarkness:
                          invocationEffect
                            .magicalDarkness ===
                          true
                      });
                    } else if (
                      invocationEffect
                        .type ===
                        "atWillSpell"
                    ) {
                      addFeatSpellRecords({
                        descriptor: {
                          atWill: true,
                          ability:
                            existingSpellcastingAbility ||
                            "Charisma",
                          selfOnly:
                            invocationEffect
                              .selfOnly ===
                            true
                        },
                        origin:
                          "eldritch-invocation",
                        choiceId,
                        ids: [
                          invocationEffect
                            .spellId
                        ]
                      });
                    } else {
                      mechanics.passiveEffects.push({
                        id:
                          `${instance.id}:invocation:${makeSafeId(value, "feature")}:${makeSafeId(invocationEffect.type, "effect")}`,
                        featId:
                          feat.id,
                        featName:
                          feat.name,
                        summary
                      });
                    }
                  }
                );

                return;
              }

              if (
                choiceId ===
                  "fighting-style"
              ) {
                const styleEffect =
                  DEFAULT_FIGHTING_STYLE_EFFECTS[
                    value
                  ] || {};
                const summary =
                  cleanString(
                    styleEffect.summary,
                    fightingStyleSummaries[
                      makeSafeId(
                        value,
                        ""
                      )
                    ] ||
                    "Selected Fighting Style."
                  );

                addSelectedFeature({
                  choiceId,
                  featureType:
                    "fightingStyle",
                  name: value,
                  summary,
                  details: {
                    effects:
                      Object.keys(
                        styleEffect
                      ).length
                        ? [
                            cloneData(
                              styleEffect
                            )
                          ]
                        : []
                  }
                });

                if (
                  styleEffect.type ===
                    "armorClassBonus"
                ) {
                  mechanics
                    .armorClassModifiers
                    .push({
                      id:
                        `${instance.id}:fighting-style:${makeSafeId(value, "style")}`,
                      featId:
                        feat.id,
                      featName:
                        feat.name,
                      sourceId:
                        instance.id,
                      value:
                        safeNumber(
                          styleEffect
                            .value,
                          0
                        ),
                      condition:
                        styleEffect
                          .requires
                          ?.wearingArmor ===
                        true
                          ? "wearing-armor"
                          : "",
                      requires:
                        cloneData(
                          styleEffect
                            .requires ||
                          {}
                        )
                    });
                } else if (
                  [
                    "weaponAttackBonus",
                    "weaponDamageBonus",
                    "weaponMagicBonus",
                    "damageDieReroll",
                    "offhandAbilityDamage",
                    "reactionDefense"
                  ].includes(
                    styleEffect.type
                  )
                ) {
                  mechanics.attackModifiers.push({
                    ...cloneData(
                      styleEffect
                    ),
                    id:
                      `${instance.id}:fighting-style:${makeSafeId(value, "style")}`,
                    featId:
                      feat.id,
                    featName:
                      feat.name,
                    sourceId:
                      instance.id
                  });
                }

                if (
                  value ===
                    "Blind Fighting"
                ) {
                  mechanics.senses.push({
                    id:
                      `${instance.id}:blind-fighting`,
                    featId:
                      feat.id,
                    featName:
                      feat.name,
                    sourceId:
                      instance.id,
                    sense:
                      "blindsight",
                    range: 10
                  });
                }

                if (
                  value ===
                    "Unarmed Fighting"
                ) {
                  mechanics.combatProfiles.push({
                    id:
                      `${instance.id}:unarmed-fighting`,
                    featId:
                      feat.id,
                    featName:
                      feat.name,
                    sourceId:
                      instance.id,
                    type:
                      "unarmedDamage",
                    die: "d6",
                    twoFreeHandsDie:
                      "d8"
                  });
                }

                return;
              }

              if (
                source ===
                  "battle-master-maneuvers" ||
                choiceId ===
                  "maneuvers"
              ) {
                const ability =
                  getAbility(
                    choices[
                      "maneuver-ability"
                    ]?.[0]
                  ) ||
                  getAbility(
                    "Strength"
                  );
                const saveDc =
                  8 +
                  getCharacterProficiencyBonus(
                    draft
                  ) +
                  calculateAbilityModifier(
                    getAbilityScore(
                      draft,
                      ability.id
                    )
                  );

                addSelectedFeature({
                  choiceId,
                  featureType:
                    "battleMasterManeuver",
                  name: value,
                  summary:
                    cleanString(
                      DEFAULT_MANEUVER_DETAILS[
                        value
                      ],
                      "Selected Battle Master maneuver."
                    ),
                  details: {
                    saveAbility:
                      ability.id,
                    saveDc,
                    superiorityDie:
                      "d6"
                  }
                });

                return;
              }

              if (
                source ===
                  "metamagic-options" ||
                choiceId ===
                  "metamagic-options"
              ) {
                const details =
                  DEFAULT_METAMAGIC_DETAILS[
                    value
                  ] || {};

                addSelectedFeature({
                  choiceId,
                  featureType:
                    "metamagic",
                  name: value,
                  summary:
                    cleanString(
                      details.summary,
                      "Selected Metamagic option."
                    ),
                  details: {
                    cost:
                      details.cost ??
                      null
                  }
                });
              }
            });
          }

          if (type === "spell") {
            addFeatSpellRecords({
              descriptor: {
                ...spellChoiceEffect,
                ...featChoice
              },
              origin: "choice",
              choiceId:
                featChoice.id,
              ids: selectedValues.filter((spellId) => isSpellEligibleForFeatChoice(getSection16SpellById(spellId, draft), featChoice, { selections: choices, alignment: draft.identity?.alignment || "" }))
            });
          }
        });

      setAbilityBonusSource(sourceName, bonusMap);
      Object.entries(proficiencyValues)
        .forEach(([category, values]) => {
          setSourceProficiencyList(
            category,
            uniqueCleanArray(values),
            sourceName
          );
        });

      const featSpellSource =
        createFeatSpellSourceMetadata({
          feat,
          sourceId: instance.id,
          selections: choices,
          spellRecords,
          spellGrants,
          alignment: draft.identity?.alignment || "",
          proficiencyBonus: getCharacterProficiencyBonus(draft)
        });

      if (spellRecords.length || featSpellSource.choiceCount > 0) {
        draft.magic.featSources[instance.id] = {
          ...featSpellSource,
          featName: feat.name,
          spellIds: uniqueCleanArray(spellIds),
          grants: spellGrants,
          spellRecords
        };
      }

      mechanics.instances.push({
        id: instance.id,
        featId: feat.id,
        featName: feat.name,
        featSummary:
          cleanString(
            feat.summary
          ),
        featDescription:
          cleanString(
            feat.description,
            feat.summary
          ),
        sourceLabel:
          cleanString(
            feat.sourceLabel,
            feat.source
          ),
        rulesEdition:
          cleanString(
            feat.rulesEdition,
            ACTIVE_RULESET.edition
          ),
        choices,
        effects: cloneData(feat.effects)
      });
    });

    mechanics.resistances =
      uniqueCleanArray(
        mechanics.resistances
      ).map((value) => {
        return value.toLowerCase();
      });
    draft.featMechanics = mechanics;
  }

  function setFeatRestChoice(
    restChoiceId,
    selectedValue
  ) {
    const mechanics =
      creatorState.draft
        ?.featMechanics;
    const restChoice =
      (
        Array.isArray(
          mechanics?.restChoices
        )
          ? mechanics.restChoices
          : []
      ).find((entry) => {
        return (
          entry.id ===
          restChoiceId
        );
      });
    const selected =
      cleanString(
        selectedValue
      ).toLowerCase();

    if (
      !restChoice ||
      !uniqueCleanArray(
        restChoice.options
      ).includes(selected)
    ) {
      return false;
    }

    restChoice.selected =
      selected;

    if (
      restChoice.kind ===
        "damageResistance"
    ) {
      const source =
        (
          Array.isArray(
            mechanics
              .resistanceSources
          )
            ? mechanics
                .resistanceSources
            : []
        ).find((entry) => {
          return (
            entry.id ===
            `${restChoice.id}:source`
          );
        });

      if (source) {
        source.damageType =
          selected;
      }

      mechanics.resistances =
        uniqueCleanArray(
          mechanics
            .resistanceSources
            .map((entry) => {
              return entry
                .damageType;
            })
        ).map((value) => {
          return value
            .toLowerCase();
        });
    }

    applyCompatibilityAliases(
      creatorState.draft
    );
    markDraftChanged();

    return true;
  }

  function evaluateSection12ClassResourceMaximum(
    resource,
    classLevel
  ) {
    const value =
      resource?.uses ??
      getProgressionValueByLevel(
        resource?.usesByLevel,
        classLevel,
        null
      );
    const normalizedValue =
      cleanString(value)
        .toLowerCase()
        .replace(/[\s_-]+/g, "");

    if (normalizedValue === "unlimited") {
      return null;
    }

    if (
      normalizedValue ===
      "proficiencybonus"
    ) {
      return getCharacterProficiencyBonus(
        creatorState.draft
      );
    }

    if (
      normalizedValue ===
      "twiceproficiencybonus"
    ) {
      return (
        getCharacterProficiencyBonus(
          creatorState.draft
        ) * 2
      );
    }

    if (
      normalizedValue ===
      "classlevel"
    ) {
      return classLevel;
    }

    if (value !== null && value !== undefined && value !== "") {
      return Math.max(0, safeNumber(value, 0));
    }

    if (resource?.usesAbility) {
      const abilityId = String(resource.usesAbility)
        .slice(0, 3)
        .toLowerCase();

      return Math.max(
        safeNumber(resource.minimum, 1),
        calculateAbilityModifier(
          getAbilityScore(
            creatorState.draft,
            abilityId
          )
        )
      );
    }

    if (resource?.pool?.formula) {
      return Math.max(
        0,
        safeNumber(
          evaluateSection12ClassLevelFormula(
            resource.pool.formula,
            classLevel
          ),
          0
        )
      );
    }

    if (resource?.perLevel) {
      return Math.max(
        0,
        classLevel * safeNumber(resource.perLevel, 1)
      );
    }

    if (
      cleanString(resource?.scalesWith).toLowerCase() ===
      "level"
    ) {
      return classLevel;
    }

    return 0;
  }

  function getSection12CanonicalResourceId(
    feature,
    resource
  ) {
    const explicitId = cleanString(resource?.id);

    if (explicitId) {
      return makeSafeId(explicitId, "resource");
    }

    const inferredName = cleanString(
      resource?.name || feature?.name || feature?.id,
      "resource"
    )
      .replace(/\s+improvement.*$/i, "")
      .replace(/\s+mastery.*$/i, "")
      .replace(/\s*\([^)]*\)\s*$/g, "");

    if (
      /^channel divinity(?:\s*:|$)/i.test(
        inferredName
      )
    ) {
      return "channel-divinity";
    }

    return makeSafeId(inferredName, "resource");
  }

  const SECTION12_CLASS_FEATURE_SAVE_ABILITIES =
    Object.freeze({
      artificer: "int",
      barbarian: "con",
      bard: "cha",
      cleric: "wis",
      druid: "wis",
      fighter: "str",
      monk: "wis",
      paladin: "cha",
      ranger: "wis",
      rogue: "dex",
      sorcerer: "cha",
      warlock: "cha",
      wizard: "int"
    });

  function getSection12ClassFeatureSaveDc(
    character,
    classEntryId,
    effect = {}
  ) {
    const classEntries =
      getCharacterClassEntries(character);
    const classEntry =
      classEntries.find((entry, index) => {
        return (
          getClassProgressionEntryKey(
            entry,
            index
          ) === cleanString(classEntryId)
        );
      }) || null;
    const classId = cleanString(
      classEntry?.classId ||
      effect?.classId
    );
    const template =
      classEntry
        ? resolveClassTemplateForEntry(
            classEntry
          )
        : null;
    let abilityId = cleanString(
      effect?.saveDcAbility ||
      effect?.classSaveAbility ||
      effect?.usesAbility
    )
      .slice(0, 3)
      .toLowerCase();

    if (
      cleanString(effect?.type) ===
      "maneuverSaveDc"
    ) {
      abilityId =
        getAbilityScore(character, "dex") >
        getAbilityScore(character, "str")
          ? "dex"
          : "str";
    }

    if (
      !ABILITY_DEFINITIONS.some(
        (ability) => {
          return ability.id === abilityId;
        }
      )
    ) {
      abilityId = cleanString(
        template?.spellcastingAbility ||
        SECTION12_CLASS_FEATURE_SAVE_ABILITIES[
          classId
        ]
      )
        .slice(0, 3)
        .toLowerCase();
    }

    if (
      !ABILITY_DEFINITIONS.some(
        (ability) => {
          return ability.id === abilityId;
        }
      )
    ) {
      return {
        classEntryId:
          cleanString(classEntryId),
        classId,
        abilityId: "",
        abilityModifier: null,
        saveDc: null
      };
    }

    const abilityModifier =
      calculateAbilityModifier(
        getAbilityScore(
          character,
          abilityId
        )
      );

    return {
      classEntryId:
        cleanString(classEntryId),
      classId,
      abilityId,
      abilityModifier,
      saveDc:
        calculateRuleSpellSaveDc({
          proficiencyBonus:
            getCharacterProficiencyBonus(
              character
            ),
          abilityModifier
        })
    };
  }

  function applySelectedClassFeatureMechanics() {
    const draft = creatorState.draft;

    if (!draft?.proficiencies || !draft?.classProgression) {
      return;
    }

    const previousResourceEntries = Array.isArray(
      draft.classMechanics?.resources
    )
      ? draft.classMechanics.resources
      : [];
    const previousResources = Object.fromEntries(
      previousResourceEntries.map((entry) => [entry.id, entry])
    );
    const mechanics = {
      schemaVersion: 1,
      resources: [],
      armorClassFormulas: [],
      armorClassModifiers: [],
      attackModifiers: [],
      spellModifiers: [],
      combatProfiles: [],
      classSaveDcs: [],
      attackAction: {
        attacks: 1,
        sourceIds: [],
        sourceNames: []
      },
      spellcastingBlocked: false,
      spellcastingBlockReasons: [],
      passiveEffects: [],
      restrictions: [],
      infusions: []
    };
    const resourceById = new Map();
    clearMagicalSecretsCompatibilitySources(draft);
    const firstUnarmoredDefenseSource =
      syncFirstUnarmoredDefenseSource(
        draft
      );
    const firstUnarmoredDefenseFeatureIds =
      new Set(
        Object.values(
          UNARMORED_DEFENSE_CLASS_RULES
        ).map((rule) => {
          return rule.featureId;
        })
      );

    removeSkillProficiencySourcesByPrefix([
      "class-feature:"
    ]);
    removeListProficiencySourcesByPrefix([
      "class-feature:"
    ]);

    const getSkill = (value) => {
      const normalized = makeSafeId(value, "");

      return SKILL_DEFINITIONS.find((skill) => {
        return (
          skill.id === normalized ||
          makeSafeId(skill.name, "") === normalized
        );
      }) || null;
    };

    const addSkill = (
      skillValue,
      sourceName,
      expertise = false
    ) => {
      const skill = getSkill(skillValue);

      if (!skill) {
        return;
      }

      const current = getSection14SkillEntry(skill);
      const expertiseSources = expertise
        ? uniqueCleanArray([
            ...current.expertiseSources,
            sourceName
          ])
        : current.expertiseSources;

      setSection14SkillEntry(skill, {
        proficient: true,
        expertise:
          current.expertise === true || expertise,
        expertiseSources,
        source: uniqueCleanArray([
          ...current.source,
          sourceName
        ])
      });
    };

    const addResource = (
      feature,
      classEntry,
      classLevel,
      resource
    ) => {
      if (!resource || typeof resource !== "object") {
        return;
      }

      const classEntryId = cleanString(
        feature.classEntryId || classEntry?.entryId,
        "class"
      );
      const canonicalId =
        getSection12CanonicalResourceId(
          feature,
          resource
        );
      const sourceId =
        `${classEntryId}:${canonicalId}`;
      const featureSourceId =
        `${classEntryId}:${
          cleanString(
            feature.id,
            canonicalId
          )
        }`;
      const shared =
        canonicalId === "channel-divinity";
      const resourceId = shared
        ? "shared:channel-divinity"
        : sourceId;
      const maximumUses =
        evaluateSection12ClassResourceMaximum(
          resource,
          classLevel
        );
      const existingResource =
        resourceById.get(resourceId);
      const previousCandidates = shared
        ? previousResourceEntries.filter((entry) => {
            return (
              entry.id === resourceId ||
              entry.canonicalId === canonicalId ||
              cleanString(entry.id).endsWith(
                `:${canonicalId}`
              )
            );
          })
        : [previousResources[resourceId]].filter(Boolean);
      const previousCurrentUses = previousCandidates
        .map((entry) => entry?.currentUses)
        .filter((value) => {
          return value !== null && value !== undefined;
        })
        .map((value) => safeNumber(value, 0));
      const combinedMaximum = existingResource
        ? (
            existingResource.maximumUses === null ||
            maximumUses === null
              ? null
              : Math.max(
                  safeNumber(existingResource.maximumUses, 0),
                  safeNumber(maximumUses, 0)
                )
          )
        : maximumUses;
      const sourceNames = uniqueCleanArray([
        ...(existingResource?.sourceNames || []),
        feature.className ||
          classEntry?.className ||
          "Class"
      ]);
      const sourceIds = uniqueCleanArray([
        ...(existingResource?.sourceIds || []),
        sourceId
      ]);
      const featureSourceIds =
        uniqueCleanArray([
          ...(
            existingResource
              ?.featureSourceIds || []
          ),
          featureSourceId
        ]);
      const sourceMaximums = {
        ...(
          existingResource
            ?.sourceMaximums || {}
        ),
        [featureSourceId]:
          maximumUses
      };
      const preservedCurrentUses = existingResource
        ?.currentUses ??
        (
          previousCurrentUses.length
            ? Math.min(...previousCurrentUses)
            : combinedMaximum
        );
      const incomingIsAuthoritative =
        !existingResource ||
        existingResource.maximumUses === null ||
        maximumUses === null ||
        safeNumber(maximumUses, 0) >=
          safeNumber(existingResource.maximumUses, 0);
      const inferredChannelOption =
        shared &&
        /^channel divinity\s*:/i.test(
          cleanString(feature.name)
        )
          ? [
              {
                id: makeSafeId(
                  cleanString(feature.name)
                    .replace(
                      /^channel divinity\s*:\s*/i,
                      ""
                    ),
                  "channel-divinity-option"
                ),
                name: cleanString(feature.name)
                  .replace(
                    /^channel divinity\s*:\s*/i,
                    ""
                  ),
                cost: 1
              }
            ]
          : [];
      const incomingSpendOptions = [
        ...(
          Array.isArray(
            feature.spendOptions
          )
            ? feature.spendOptions
            : []
        ),
        ...(
          Array.isArray(
            resource.spendOptions
          )
            ? resource.spendOptions
            : []
        ),
        ...inferredChannelOption
      ].map((option) => {
        const normalizedOption =
          typeof option === "string"
            ? {
                id: makeSafeId(
                  option,
                  "resource-option"
                ),
                name: option
              }
            : cloneData(option);
        const saveContext =
          getSection12ClassFeatureSaveDc(
            draft,
            classEntryId,
            {
              ...normalizedOption,
              classId:
                feature.classId ||
                classEntry?.classId
            }
          );

        return {
          ...normalizedOption,
          id: makeSafeId(
            normalizedOption.id ||
            normalizedOption.name,
            "resource-option"
          ),
          name: cleanString(
            normalizedOption.name,
            feature.name
          ),
          cost: Math.max(
            1,
            safeNumber(
              normalizedOption.cost,
              1
            )
          ),
          classEntryId,
          classId:
            feature.classId ||
            classEntry?.classId ||
            "",
          className:
            feature.className ||
            classEntry?.className ||
            "Class",
          featureId:
            cleanString(feature.id),
          featureName:
            cleanString(feature.name),
          saveAbility:
            normalizedOption
              .usesSave === false
                ? ""
                : saveContext.abilityId,
          saveDc:
            normalizedOption
              .usesSave === false
                ? null
                : saveContext.saveDc
        };
      });
      const combinedSpendOptions = [
        ...(
          existingResource
            ?.spendOptions || []
        ),
        ...incomingSpendOptions
      ].filter((option, index, values) => {
        return (
          values.findIndex((candidate) => {
            return (
              cleanString(
                candidate.classEntryId
              ) ===
                cleanString(
                  option.classEntryId
                ) &&
              cleanString(candidate.id) ===
                cleanString(option.id)
            );
          }) === index
        );
      });
      const next = {
        id: resourceId,
        canonicalId,
        sourceId,
        sourceIds,
        featureSourceIds,
        sourceMaximums,
        sourceNames,
        shared,
        classEntryId: shared
          ? "shared:channel-divinity"
          : classEntryId,
        classId: shared
          ? "shared"
          : feature.classId || classEntry?.classId || "",
        className: sourceNames.join(" / "),
        featureId: incomingIsAuthoritative
          ? feature.id
          : existingResource.featureId,
        featureName: incomingIsAuthoritative
          ? feature.name
          : existingResource.featureName,
        name: resource.name || feature.name,
        maximumUses: combinedMaximum,
        currentUses:
          combinedMaximum === null
            ? null
            : Math.min(
                combinedMaximum,
                Math.max(
                  0,
                  safeNumber(
                    preservedCurrentUses,
                    combinedMaximum
                  )
                )
              ),
        recharge: incomingIsAuthoritative
          ? resource.recharge ||
            getProgressionValueByLevel(
              resource.rechargeByLevel,
              classLevel,
              ""
            )
          : existingResource.recharge,
        die: incomingIsAuthoritative
          ? resource.die ||
            getProgressionValueByLevel(
              resource.dieByLevel,
              classLevel,
              ""
            )
          : existingResource.die,
        spendOptions:
          cloneData(
            combinedSpendOptions
          )
      };

      resourceById.set(resourceId, next);
    };

    const applyEffect = (
      effect,
      context
    ) => {
      if (!effect || typeof effect !== "object") {
        return;
      }

      const type = cleanString(effect.type);
      const record = {
        ...cloneData(effect),
        id: `${context.choiceKey}:${makeSafeId(type || context.option || "effect", "effect")}`,
        classEntryId: context.classEntryId,
        classId: context.feature.classId,
        className: context.feature.className,
        classLevel: context.classLevel,
        featureId: context.feature.id,
        featureName: context.feature.name,
        option: context.option || ""
      };
      const needsClassSaveDc =
        type === "maneuverSaveDc" ||
        effect.classSaveDc === true ||
        Boolean(
          cleanString(
            effect.saveDcAbility ||
            effect.classSaveAbility
          )
        );

      if (needsClassSaveDc) {
        const saveContext =
          getSection12ClassFeatureSaveDc(
            draft,
            context.classEntryId,
            {
              ...effect,
              classId:
                context.feature.classId
            }
          );

        record.saveAbility =
          saveContext.abilityId;
        record.saveDc =
          saveContext.saveDc;
      }

      if (type === "armorClassFormula") {
        const isFirstReceivedRule =
          firstUnarmoredDefenseFeatureIds
            .has(record.featureId);

        if (
          !isFirstReceivedRule ||
          (
            firstUnarmoredDefenseSource &&
            record.classEntryId ===
              firstUnarmoredDefenseSource
                .classEntryId &&
            record.featureId ===
              firstUnarmoredDefenseSource
                .featureId
          )
        ) {
          mechanics
            .armorClassFormulas
            .push(record);
        }
      } else if (type === "extraAttack") {
        const attacks = Math.max(
          1,
          Math.round(
            safeNumber(effect.attacks, 2)
          )
        );
        const sourceId = `${record.classEntryId}:${record.featureId}`;
        const sourceFeatureName =
          cleanString(
            record.option,
            record.featureName
          );
        const currentAttacks = safeNumber(
          mechanics.attackAction.attacks,
          1
        );

        if (attacks > currentAttacks) {
          mechanics.attackAction = {
            attacks,
            classEntryId: record.classEntryId,
            classId: record.classId,
            className: record.className,
            featureId: record.featureId,
            featureName:
              sourceFeatureName,
            sourceIds: [sourceId],
            sourceNames: [
              `${record.className}: ${sourceFeatureName}`
            ]
          };
        } else if (attacks === currentAttacks) {
          mechanics.attackAction.sourceIds =
            uniqueCleanArray([
              ...mechanics.attackAction.sourceIds,
              sourceId
            ]);
          mechanics.attackAction.sourceNames =
            uniqueCleanArray([
              ...mechanics.attackAction.sourceNames,
              `${record.className}: ${sourceFeatureName}`
            ]);
        }
      } else if (type === "armorClassBonus") {
        mechanics.armorClassModifiers.push(record);
      } else if (
        [
          "weaponAttackBonus",
          "weaponDamageBonus",
          "weaponMagicBonus",
          "damageDieReroll",
          "offhandAbilityDamage",
          "reactionDefense"
        ].includes(type)
      ) {
        mechanics.attackModifiers.push(record);
      } else if (
        [
          "spellAttackBonus",
          "spellDamageAbilityBonus",
          "spellHitPush",
          "atWillSpell",
          "oncePerRestSpell"
        ].includes(type)
      ) {
        mechanics.spellModifiers.push(record);
      } else if (type === "skillProficiency") {
        uniqueCleanArray(effect.skills)
          .forEach((skill) => {
            addSkill(skill, context.sourceName);
          });
      } else if (
        [
          "martialArts",
          "sneakAttack",
          "rage",
          "divineSmite",
          "wildShape",
          "maneuverSaveDc",
          "metamagic",
          "eldritchInvocations"
        ].includes(type)
      ) {
        mechanics.combatProfiles.push(record);
      } else if (type !== "resourcePool") {
        mechanics.passiveEffects.push(record);
      }

      uniqueCleanArray(effect.restrictions)
        .forEach((restriction) => {
          mechanics.restrictions.push({
            id: `${record.id}:${makeSafeId(restriction, "restriction")}`,
            source: context.feature.name,
            stateId:
              type === "rage"
                ? "rage"
                : "",
            restriction
          });
        });
    };

    getClassProgressionEntries(draft)
      .forEach((classEntry, classIndex) => {
        const template = resolveClassTemplateForEntry(classEntry);
        const features = collectSection12FeaturesForClassEntry(
          classEntry,
          classIndex
        );
        const classEntryId =
          getClassProgressionEntryKey(
            classEntry,
            classIndex
          );
        const saveContext =
          getSection12ClassFeatureSaveDc(
            draft,
            classEntryId,
            {
              classId:
                classEntry.classId
            }
          );

        mechanics.classSaveDcs.push({
          ...saveContext,
          className:
            cleanString(
              classEntry.className,
              template?.name ||
              classEntry.classId
            ),
          classLevel:
            getClassEntryLevel(
              classEntry,
              1
            )
        });

        (Array.isArray(template?.effects)
          ? template.effects.filter((effect) =>
              ["speedBonus", "speedBonusByLevel"].includes(cleanString(effect?.type)))
          : []
        ).forEach((effect, effectIndex) => {
          const classLevel = getClassEntryLevel(
            classEntry,
            1
          );
          const classFeature = {
            id: "class-template-effects",
            name: `${cleanString(
              classEntry.className,
              template?.name || "Class"
            )} movement`,
            classId: cleanString(
              classEntry.classId,
              template?.id
            ),
            className: cleanString(
              classEntry.className,
              template?.name
            )
          };

          applyEffect(effect, {
            feature: classFeature,
            classEntry,
            classEntryId,
            classLevel,
            choiceKey: `${classEntryId}:template-effect-${effectIndex + 1}`,
            sourceName: `class-template:${classEntryId}`,
            option: ""
          });
        });

        features.forEach((feature) => {
          const classLevel = Math.max(
            1,
            safeNumber(
              feature.classLevel,
              classEntry.level || 1
            )
          );
          const classEntryId = cleanString(
            feature.classEntryId,
            getClassProgressionEntryKey(
              classEntry,
              classIndex
            )
          );
          const choiceKey = getSection12FeatureChoiceKey(feature);
          const sourceName = `class-feature:${choiceKey}`;
          const selections =
            getSection12FeatureStoredChoices(feature);
          const context = {
            feature,
            classEntry,
            classEntryId,
            classLevel,
            choiceKey,
            sourceName,
            option: ""
          };

          addResource(
            feature,
            classEntry,
            classLevel,
            feature.resource
          );

          (Array.isArray(feature.effects)
            ? feature.effects
            : []
          ).forEach((effect) => {
            applyEffect(effect, context);
          });

          if (
            (Array.isArray(feature.effects)
              ? feature.effects
              : []
            ).some((effect) => effect.type === "expertise")
          ) {
            selections.forEach((selection) => {
              if (selection === "Thieves' Tools") {
                mechanics.passiveEffects.push({
                  id: `${choiceKey}:thieves-tools-expertise`,
                  classEntryId,
                  featureName: feature.name,
                  type: "toolExpertise",
                  tool: selection,
                  summary: "Double proficiency for checks using Thieves' Tools."
                });
              } else {
                addSkill(selection, sourceName, true);
              }
            });
          }

          if (feature.optionSource === "artisanTools") {
            setSourceProficiencyList(
              "tools",
              selections,
              sourceName
            );
          }

          const magicalSecretsEffect = (Array.isArray(feature.effects)
            ? feature.effects : []).find(
              (effect) => effect.type === "magicalSecrets"
            );

          if (magicalSecretsEffect) {
            const sourceEntry = getSpellcastingClassOptions(draft)
              .find((entry) => {
                return getSection16SourceKey(entry) === classEntryId;
              });
            storeMagicalSecretsCompatibilitySource(draft, {
                sourceId: `magical-secrets:${choiceKey}`,
                sourceName: feature.name,
                sourceFeatureId: feature.id,
                classId: feature.classId || classEntry?.classId,
                classEntryId,
                subclassId: classEntry?.subclassId,
                choiceCount: magicalSecretsEffect.count,
                selectedSpellIds: selections,
                maximumSpellLevel: sourceEntry?.maxSpellLevel,
                spellcastingAbility: sourceEntry?.spellcastingAbility,
                rulesSource: feature.rulesSource || feature.sourceLabel || feature.source
            });
          }

          selections.forEach((selection) => {
            const optionEffect = feature.optionEffects?.[selection];
            const optionDetails = feature.optionDetails?.[selection];

            (Array.isArray(optionEffect)
              ? optionEffect
              : optionEffect
                ? [optionEffect]
                : []
            ).forEach((effect) => {
              applyEffect(effect, {
                ...context,
                option: selection
              });
            });

            (Array.isArray(optionDetails?.effects)
              ? optionDetails.effects
              : []
            ).forEach((effect) => {
              applyEffect(effect, {
                ...context,
                option: selection
              });
            });

            if (optionDetails?.summary) {
              mechanics.passiveEffects.push({
                id: `${choiceKey}:${makeSafeId(selection, "choice")}`,
                classEntryId,
                classId: feature.classId,
                className: feature.className,
                featureId: feature.id,
                featureName: feature.name,
                type: "selectedOption",
                option: selection,
                cost: optionDetails.cost,
                summary: optionDetails.summary
              });
            }
          });

          if (feature.customType === "artificerInfusions") {
            const activeIds = selections
              .filter((value) => value.startsWith("active:"))
              .map((value) => value.slice("active:".length));
            const targets = Object.fromEntries(
              selections
                .filter((value) => value.startsWith("target:"))
                .map((value) => {
                  const [, infusionId, ...itemParts] = value.split(":");
                  return [infusionId, itemParts.join(":")];
                })
            );

            activeIds.forEach((infusionId) => {
              const infusion = (template?.infusions || [])
                .find((entry) => entry.id === infusionId);

              if (!infusion) {
                return;
              }

              const infusionRecord = {
                id: `${classEntryId}:${infusion.id}`,
                classEntryId,
                classId: feature.classId,
                classLevel,
                infusionId: infusion.id,
                name: infusion.name,
                targetItemId: cleanString(targets[infusion.id]),
                requiresItemTarget: infusion.requiresItemTarget === true,
                summary: infusion.summary,
                effects: cloneData(infusion.effects || [])
              };
              mechanics.infusions.push(infusionRecord);

              (infusion.effects || []).forEach((effect) => {
                const value = effect.value ??
                  getProgressionValueByLevel(
                    effect.valueByLevel,
                    classLevel,
                    0
                  );

                applyEffect({
                  ...effect,
                  value,
                  infusionId: infusion.id,
                  targetItemId: infusionRecord.targetItemId,
                  requiresItemTarget: infusionRecord.requiresItemTarget
                }, {
                  ...context,
                  option: infusion.name
                });
              });
            });
          }
        });
      });

    mechanics.resources = Array.from(resourceById.values());
    mechanics.restrictions = mechanics.restrictions.filter(
      (entry, index, values) => {
        return values.findIndex((candidate) => {
          return candidate.id === entry.id;
        }) === index;
      }
    );
    draft.combat.classFeatureStates = {
      ...(draft.combat.classFeatureStates || {}),
      rageActive:
        draft.combat.classFeatureStates?.rageActive === true
    };
    const hasRage = mechanics.combatProfiles.some((profile) => {
      return profile.type === "rage";
    });

    if (!hasRage) {
      draft.combat.classFeatureStates.rageActive = false;
    }

    const rageActive = Boolean(
      hasRage &&
      draft.combat.classFeatureStates.rageActive === true
    );
    mechanics.restrictions = mechanics.restrictions.map((entry) => {
      return {
        ...entry,
        active:
          entry.stateId === "rage"
            ? rageActive
            : false
      };
    });
    mechanics.spellcastingBlocked = Boolean(
      rageActive &&
      mechanics.restrictions.some((entry) => {
        return (
          entry.active === true &&
          entry.restriction === "cannotCastSpells"
        );
      })
    );
    mechanics.spellcastingBlockReasons =
      mechanics.spellcastingBlocked
        ? ["Rage is active"]
        : [];
    draft.combat.attacksPerAction = Math.max(
      1,
      safeNumber(
        mechanics.attackAction?.attacks,
        1
      )
    );
    draft.magic.castingBlocked =
      mechanics.spellcastingBlocked;
    draft.magic.castingBlockReasons = cloneData(
      mechanics.spellcastingBlockReasons
    );
    draft.classMechanics = mechanics;
  }

  function setSection12AsiChoiceValues(
    featureId,
    values = []
  ) {
    const cleanFeatureId =
      cleanString(featureId);

    if (!cleanFeatureId) {
      return false;
    }

    const cleanValues =
      uniqueCleanArray(values);
    const choices = normalizeClassChoiceMap(
      creatorState.draft.classChoices
    );

    if (cleanValues.length) {
      choices[cleanFeatureId] = cleanValues;
    } else {
      delete choices[cleanFeatureId];
    }

    const slot =
      getSection12UnlockedAsiSlot(cleanFeatureId);

    if (slot) {
      if (cleanValues.length) {
        choices[slot.id] = cleanValues;
      } else {
        delete choices[slot.id];
      }

      if (slot.legacyId !== slot.id) {
        delete choices[slot.legacyId];
      }

      const classEntry =
        getClassEntryAtIndex(slot.classIndex);

      if (classEntry) {
        classEntry.choices = {
          ...(classEntry.choices || {})
        };

        const entryChoices =
          normalizeClassChoiceMap(
            classEntry.choices.classFeatures
          );

        if (cleanValues.length) {
          entryChoices[slot.id] = cleanValues;
        } else {
          delete entryChoices[slot.id];
        }

        if (slot.featureId !== slot.id) {
          delete entryChoices[slot.featureId];
        }

        if (slot.legacyId !== slot.id) {
          delete entryChoices[slot.legacyId];
        }

        classEntry.choices.classFeatures =
          entryChoices;
      }
    }

    creatorState.draft.classChoices = choices;

    return true;
  }

  function formatSection12ClassChoiceValues(values) {
    const cleanValues = Array.isArray(values) ? values : [];

    if (
      cleanValues.some((value) => {
        return value.startsWith("known:") || value.startsWith("active:");
      })
    ) {
      const infusionMap = new Map(
        getAllClassTemplates()
          .flatMap((classTemplate) => {
            return classTemplate.infusions || [];
          })
          .map((infusion) => {
            return [infusion.id, infusion.name];
          })
      );
      const namesForPrefix = (prefix) => cleanValues
        .filter((value) => value.startsWith(prefix))
        .map((value) => {
          const id = value.slice(prefix.length);
          return infusionMap.get(id) || id;
        });
      const known = namesForPrefix("known:");
      const active = namesForPrefix("active:");

      return [
        `Known: ${known.length ? known.join(", ") : "None"}`,
        `Infused: ${active.length ? active.join(", ") : "None"}`
      ].join("; ");
    }

    if (cleanValues.includes("mode:feat")) {
      const featId = cleanString(
        cleanValues.find((value) => value.startsWith("feat:"))
      ).slice("feat:".length);
      const feat = DEFAULT_FEATS.find((entry) => entry.id === featId);

      return feat ? `Feat: ${feat.name}` : "Feat not selected";
    }

    if (cleanValues.includes("mode:asi")) {
      const abilityCounts = {};

      cleanValues
        .filter((value) => value.startsWith("ability:"))
        .forEach((value) => {
          const abilityId = value.split(":")[1];
          abilityCounts[abilityId] = (abilityCounts[abilityId] || 0) + 1;
        });

      const summary = Object.entries(abilityCounts)
        .map(([abilityId, amount]) => {
          const name = ABILITY_DEFINITIONS.find(
            (ability) => ability.id === abilityId
          )?.name || abilityId.toUpperCase();

          return `${name} +${amount}`;
        });

      return summary.length
        ? `Ability Scores: ${summary.join(", ")}`
        : "Ability scores not selected";
    }

    return cleanValues.map((value) => {
      return DEFAULT_SPELLS.find((spell) => {
        return spell.id === value;
      })?.name || value;
    }).join(", ");
  }

  function getSection12AsiFeature(featureId) {
    const multiclassSlot =
      getSection12UnlockedAsiSlot(featureId);

    if (multiclassSlot) {
      return {
        id: multiclassSlot.id,
        level: multiclassSlot.classLevel,
        optionSource: "asiOrFeat",
        classId: multiclassSlot.classId,
        className: multiclassSlot.className
      };
    }

    return getSection12ClassFeaturesThroughLevel()
      .find((feature) => {
        return (
          feature.id === featureId &&
          feature.optionSource === "asiOrFeat"
        );
      }) || null;
  }

  function syncSection12AdvancementChoice(featureId) {
    const feature = getSection12AsiFeature(featureId);
    const multiclassSlot =
      getSection12UnlockedAsiSlot(featureId);
    const primaryClass = getSection12PrimaryClass();

    if (!feature || (!primaryClass && !multiclassSlot)) {
      return false;
    }

    const classId = makeSafeId(
      multiclassSlot?.classId ||
        primaryClass?.classId ||
        primaryClass?.className,
      "class"
    );
    const classLevel = Math.max(
      1,
      Math.round(
        safeNumber(
          multiclassSlot?.classLevel ??
            feature.level,
          1
        )
      )
    );
    const id =
      multiclassSlot?.id ||
      `${classId}-level-${classLevel}-asi`;
    const state = getSection12AsiChoiceState(featureId);
    const feat = DEFAULT_FEATS.find((entry) => {
      return entry.id === state.featId;
    });
    const choices = normalizeAdvancementChoices(
      creatorState.draft.advancementChoices
    ).filter((choice) => {
      return !(
        choice.id === id ||
        choice.id === multiclassSlot?.legacyId ||
        (
          multiclassSlot &&
          cleanString(
            choice.classEntryId ||
              choice.entryId
          ) === multiclassSlot.classEntryId &&
          safeNumber(choice.classLevel, 0) ===
            classLevel
        ) ||
        (
          multiclassSlot &&
          makeSafeId(choice.classId, "") === classId &&
          safeNumber(choice.classLevel, 0) ===
            classLevel
        )
      );
    });

    if (state.mode) {
      choices.push({
        id,
        type: "asi-or-feat",
        classEntryId:
          multiclassSlot?.classEntryId || "",
        classId,
        classLevel,
        mode: state.mode,
        featId: state.mode === "feat" ? state.featId : "",
        featName:
          state.mode === "feat"
            ? feat?.name || ""
            : "",
        featChoices:
          state.mode === "feat"
            ? normalizeFeatChoiceSelections(state.featChoices)
            : {}
      });
    }

    creatorState.draft.advancementChoices = choices;

    return true;
  }

  function setSection12AsiBonusSource(
    featureId,
    abilities = []
  ) {
    const sourceName =
      `class-asi:${featureId}`;
    const sources =
      ensureAbilityBonusSources(
        creatorState.draft
      );

    delete sources[sourceName];

    recalculateAbilityTotals(
      creatorState.draft
    );

    const bonusMap = createAbilityMap(0);
    const normalAbilityScores =
      createNormalAbilityCapScoreMap(
        creatorState.draft
      );

    abilities.forEach((abilityId) => {
      if (Object.hasOwn(bonusMap, abilityId)) {
        addCappedNormalAbilityIncrease({
          bonusMap,
          scoreMap:
            normalAbilityScores,
          abilityId,
          amount: 1,
          maximum:
            DEFAULT_FEAT_ABILITY_SCORE_MAXIMUM
        });
      }
    });

    setAbilityBonusSource(
      sourceName,
      bonusMap
    );
  }

  function removeSection12AsiFeatIfUnused(featId) {
    const cleanFeatId = cleanString(featId);

    if (!cleanFeatId) {
      return;
    }

    const stillUsed = Object.values(
      normalizeClassChoiceMap(
        creatorState.draft.classChoices
      )
    ).some((values) => {
      return values.includes(`feat:${cleanFeatId}`);
    }) ||
      getClassProgressionEntries(
        creatorState.draft
      ).some((classEntry) => {
        return Object.values(
          normalizeClassChoiceMap(
            classEntry?.choices
              ?.classFeatures
          )
        ).some((values) => {
          return values.includes(
            `feat:${cleanFeatId}`
          );
        });
      });

    if (!stillUsed) {
      creatorState.draft.feats = normalizeFeatIds(
        creatorState.draft.feats
      ).filter((id) => id !== cleanFeatId);

      creatorState.draft.selectedFeats =
        normalizeFeatIds(
          creatorState.draft
            .selectedFeats
        ).filter((id) => {
          return id !== cleanFeatId;
        });
    }
  }

  function setSection12AsiMode(featureId, mode) {
    if (
      !getSection12AsiFeature(featureId) ||
      !["asi", "feat"].includes(mode)
    ) {
      return false;
    }

    const previous = getSection12AsiChoiceState(featureId);

    if (previous.mode === mode) {
      return false;
    }

    setSection12AsiChoiceValues(
      featureId,
      [`mode:${mode}`]
    );

    setSection12AsiBonusSource(featureId, []);
    removeSection12AsiFeatIfUnused(previous.featId);
    syncSection12AdvancementChoice(featureId);
    applySelectedFeatMechanics();
    applyCompatibilityAliases(creatorState.draft);
    markDraftChanged();

    return true;
  }

  function adjustSection12AsiAbility(
    featureId,
    abilityId,
    delta
  ) {
    if (
      !getSection12AsiFeature(featureId) ||
      !ABILITY_DEFINITIONS.some((ability) => ability.id === abilityId)
    ) {
      return false;
    }

    const state = getSection12AsiChoiceState(featureId);
    const abilities = [...state.abilities];
    const amount = Math.sign(safeNumber(delta, 0));

    if (amount > 0) {
      const currentCount = abilities.filter(
        (id) => id === abilityId
      ).length;
      const scoreWithoutThisAsi =
        getNormalAbilityScoreForCap(
          creatorState.draft,
          abilityId,
          {
            excludedSource:
              `class-asi:${featureId}`
          }
        );

      if (
        abilities.length >= 2 ||
        scoreWithoutThisAsi + currentCount >= 20
      ) {
        return false;
      }

      abilities.push(abilityId);
    } else if (amount < 0) {
      const index = abilities.lastIndexOf(abilityId);

      if (index < 0) {
        return false;
      }

      abilities.splice(index, 1);
    } else {
      return false;
    }

    setSection12AsiChoiceValues(
      featureId,
      [
        "mode:asi",
        ...abilities.map((id, index) => {
          return `ability:${id}:${index + 1}`;
        })
      ]
    );

    setSection12AsiBonusSource(featureId, abilities);
    syncSection12AdvancementChoice(featureId);
    applyCompatibilityAliases(creatorState.draft);
    markDraftChanged();

    return true;
  }

  function calculateFeatPrerequisiteResult(
    feat,
    character = creatorState.draft,
    options = {}
  ) {
    const requirements = Array.isArray(feat?.prerequisites)
      ? feat.prerequisites
      : [];
    const reasons = [];
    const advisories = [];
    const settingRequirements = [];
    const currentSlot = getSection12UnlockedAsiSlot(
      options.featureId,
      character
    );
    const selectedFeatInstances = getSelectedDefaultFeatInstances(character);
    const selectedElsewhere = selectedFeatInstances.some((instance) => {
      return (
        instance.featId === feat?.id &&
        ![
          cleanString(options.featureId),
          cleanString(currentSlot?.id),
          cleanString(currentSlot?.legacyId),
          cleanString(currentSlot?.featureId)
        ].filter(Boolean).includes(instance.slotId)
      );
    });
    const normalizedProficiencies = (category) => {
      return uniqueCleanArray(character?.proficiencies?.[category])
        .map((value) => makeSafeId(value, ""));
    };
    const hasSpellcasting = () => {
      const classSpellcasting =
        getCharacterSpellcastingInfo(
          character
        )
        .some((entry) => {
          return (
            safeNumber(
              entry.cantripsKnown,
              0
            ) > 0 ||
            safeNumber(
              entry.spellsKnown,
              0
            ) > 0 ||
            Object.values(
              entry.spellSlots ||
              {}
            ).some((slots) => {
              return safeNumber(
                slots,
                0
              ) > 0;
            }) ||
            safeNumber(
              entry.pactMagic?.slots,
              0
            ) > 0
          );
        });
      const magic =
        character?.magic || {};
      const directSpellIds = [
        ...uniqueCleanArray(
          magic.knownSpellIds
        ),
        ...uniqueCleanArray(
          magic.preparedSpellIds
        ),
        ...uniqueCleanArray(
          magic.innateSpellIds
        ),
        ...uniqueCleanArray(
          magic.customSpellIds
        )
      ];
      const spellRecords = [
        ...(
          Array.isArray(
            magic.innateSpells
          )
            ? magic.innateSpells
            : []
        ),
        ...(
          Array.isArray(
            magic.customSpells
          )
            ? magic.customSpells
            : []
        ),
        ...(
          Array.isArray(
            character
              ?.featMechanics
              ?.spellcasting
          )
            ? character
                .featMechanics
                .spellcasting
            : []
        )
      ];
      const sourceHasSpells = (
        source
      ) => {
        return (
          uniqueCleanArray(
            source?.spellIds
          ).length > 0 ||
          (
            Array.isArray(
              source?.spellRecords
            ) &&
            source.spellRecords
              .length > 0
          )
        );
      };
      const storedSources = [
        ...Object.values(
          magic.classSources ||
          {}
        ),
        ...Object.values(
          magic.featSources ||
          {}
        )
      ];

      return (
        classSpellcasting ||
        directSpellIds.length > 0 ||
        spellRecords.length > 0 ||
        storedSources.some(
          sourceHasSpells
        )
      );
    };

    if (selectedElsewhere && feat?.repeatable !== true) {
      reasons.push("Already selected in another advancement slot");
    }

    requirements.forEach((requirement) => {
      const type = cleanString(requirement?.type);

      if (type === "spellcasting") {
        if (!hasSpellcasting()) {
          reasons.push("Requires spellcasting");
        }
        return;
      }

      if (type === "spellcastingOrPactMagic") {
        if (!hasSpellcasting()) {
          reasons.push("Requires Spellcasting or Pact Magic");
        }
        return;
      }

      if (type === "spellcastingOrRuneCarver") {
        const backgroundId = makeSafeId(
          character?.background?.id || character?.background?.name,
          ""
        );

        if (!hasSpellcasting() && backgroundId !== "rune-carver") {
          reasons.push("Requires spellcasting or the Rune Carver background");
        }
        return;
      }

      if (type === "level" || type === "minimumLevel") {
        const minimum = Math.max(
          1,
          safeNumber(
            requirement.minimum ?? requirement.value ?? requirement.level,
            1
          )
        );
        const level = clampLevel(
          character?.classProgression?.totalLevel || character?.level || 1
        );

        if (level < minimum) {
          reasons.push(`Requires level ${minimum}`);
        }
        return;
      }

      if (type === "abilityMinimum" || type === "ability") {
        const abilityId = cleanString(requirement.ability).toLowerCase();
        const minimum = safeNumber(
          requirement.minimum ?? requirement.value,
          13
        );
        const score =
          getAbilityScore(
            character,
            abilityId
          );

        if (!abilityId || score < minimum) {
          reasons.push(
            `Requires ${abilityId ? abilityId.toUpperCase() : "an ability"} ${minimum}`
          );
        }
        return;
      }

      if (type === "abilityAnyMinimum") {
        const minimum = safeNumber(
          requirement.minimum ?? requirement.value,
          13
        );
        const abilityIds = uniqueCleanArray(requirement.abilities)
          .map((ability) => cleanString(ability).toLowerCase());
        const met = abilityIds.some((abilityId) => {
          return (
            getAbilityScore(
              character,
              abilityId
            ) >= minimum
          );
        });

        if (!met) {
          reasons.push(
            `Requires ${abilityIds.map((id) => id.toUpperCase()).join(" or ")} ${minimum}`
          );
        }
        return;
      }

      if (type === "class") {
        const allowedIds = uniqueCleanArray(
          requirement.classIds || requirement.from || []
        ).map((id) => makeSafeId(id, ""));
        const hasClass = getCharacterClassEntries(character)
          .some((entry) => allowedIds.includes(makeSafeId(entry.classId, "")));

        if (!hasClass) {
          reasons.push(
            `Requires class: ${allowedIds.join(", ") || "specified class"}`
          );
        }
        return;
      }

      if (type === "classOrBackground") {
        const classIds = uniqueCleanArray(requirement.classIds)
          .map((id) => makeSafeId(id, ""));
        const backgroundIds = uniqueCleanArray(requirement.backgroundIds)
          .map((id) => makeSafeId(id, ""));
        const hasClass = getCharacterClassEntries(character)
          .some((entry) => classIds.includes(makeSafeId(entry.classId, "")));
        const backgroundId = makeSafeId(
          character?.background?.id || character?.background?.name,
          ""
        );

        if (!hasClass && !backgroundIds.includes(backgroundId)) {
          reasons.push("Requires the listed class or background");
        }
        return;
      }

      if (type === "species") {
        const speciesId = makeSafeId(
          character?.species?.id || character?.species?.name,
          ""
        );
        const allowedSpecies = uniqueCleanArray(requirement.speciesIds)
          .map((id) => makeSafeId(id, ""));
        const selectedSubraceId = makeSafeId(
          character?.species
            ?.choices
            ?.subraceId ||
          character?.species
            ?.choices
            ?.subraceSnapshot
            ?.id ||
          character?.species
            ?.subraceId ||
          character?.species
            ?.subrace
            ?.id ||
          character?.species
            ?.subrace
            ?.name,
          ""
        );
        const allowedSubraces = uniqueCleanArray(requirement.subraceIds)
          .map((id) => makeSafeId(id, ""));
        const speciesMet = allowedSpecies.includes(speciesId);
        const subraceMet = !allowedSubraces.length ||
          allowedSubraces.includes(selectedSubraceId);

        if (!speciesMet || !subraceMet) {
          reasons.push(
            `Requires species: ${allowedSpecies.join(", ") || "specified species"}`
          );
        }
        return;
      }

      if (type === "speciesSize") {
        const allowedSizes = uniqueCleanArray(requirement.sizes)
          .map((size) => size.toLowerCase());
        const size = cleanString(character?.identity?.size).toLowerCase();

        if (!allowedSizes.includes(size)) {
          reasons.push(`Requires size: ${allowedSizes.join(" or ")}`);
        }
        return;
      }

      if (type === "speciesSizeOrSpecies") {
        const allowedSizes = uniqueCleanArray(requirement.sizes)
          .map((size) => size.toLowerCase());
        const allowedSpecies = uniqueCleanArray(requirement.speciesIds)
          .map((id) => makeSafeId(id, ""));
        const size = cleanString(character?.identity?.size).toLowerCase();
        const speciesId = makeSafeId(
          character?.species?.id || character?.species?.name,
          ""
        );

        if (!allowedSizes.includes(size) && !allowedSpecies.includes(speciesId)) {
          reasons.push("Requires a Small species or dwarf");
        }
        return;
      }

      if (type === "armorProficiency") {
        const category = makeSafeId(requirement.category, "");
        const met = normalizedProficiencies("armor")
          .some((value) => value.includes(category));

        if (!met) {
          reasons.push(`Requires ${requirement.category} armor proficiency`);
        }
        return;
      }

      if (type === "weaponProficiency") {
        const categories = uniqueCleanArray(
          requirement.categories || [requirement.category]
        ).map((value) => makeSafeId(value, ""));
        const proficiencies = normalizedProficiencies("weapons");
        const met = categories.some((category) => {
          return proficiencies.some((value) => value.includes(category));
        });

        if (!met) {
          reasons.push("Requires proficiency with a simple or martial weapon");
        }
        return;
      }

      if (type === "feat") {
        const featIds = uniqueCleanArray(
          requirement.featIds || [requirement.featId]
        ).map((id) => makeSafeId(id, ""));
        const met = selectedFeatInstances.some((instance) => {
          return featIds.includes(instance.featId);
        });

        if (!met) {
          reasons.push(`Requires feat: ${featIds.join(", ")}`);
        }
        return;
      }

      if (type === "featChoice") {
        const requiredFeatId = makeSafeId(requirement.featId, "");
        const requiredValues =
          uniqueCleanArray(
            requirement.values
          ).map((value) => {
            return makeSafeId(
              value,
              ""
            );
          });
        const met = selectedFeatInstances.some((instance) => {
          return (
            instance.featId === requiredFeatId &&
            uniqueCleanArray(
              instance.featChoices?.[requirement.choiceId]
            ).some((value) => {
              return requiredValues
                .includes(
                  makeSafeId(
                    value,
                    ""
                  )
                );
            })
          );
        });

        if (!met) {
          reasons.push(`Requires the matching ${requiredFeatId} choice`);
        }
        return;
      }

      if (type === "setting") {
        const setting =
          cleanString(
            requirement.setting ||
            requirement.name
          );

        if (setting) {
          settingRequirements.push(
            setting
          );
          advisories.push(
            `Setting requirement: ${setting} (advisory; not enforced)`
          );
        }
        return;
      }

      if (type) {
        reasons.push(`Unsupported prerequisite: ${type}`);
      }
    });

    return {
      met: reasons.length === 0,
      reasons,
      advisories:
        uniqueCleanArray(
          advisories
        ),
      settingRequirements:
        uniqueCleanArray(
          settingRequirements
        ),
      settingPolicy:
        ACTIVE_RULESET
          .featSettingPrerequisites ||
        "advisory"
    };
  }

  function getFeatPrerequisiteResult(
    feat,
    character = creatorState.draft,
    options = {}
  ) {
    const magic = character?.magic || {};
    const dependencyKey = createDerivedSignature({
      feat: {
        id: feat?.id,
        repeatable: feat?.repeatable,
        prerequisites:
          feat?.prerequisites
      },
      featureId: options.featureId,
      currentSlot:
        getSection12UnlockedAsiSlot(
          options.featureId,
          character
        ),
      selectedFeats:
        getSelectedDefaultFeatInstances(
          character
        ).map((instance) => ({
          featId: instance.featId,
          slotId: instance.slotId,
          featChoices:
            instance.featChoices
        })),
      classEntries:
        getCharacterClassEntries(
          character
        ).map((entry) => ({
          classId: entry?.classId,
          level: entry?.level
        })),
      totalLevel:
        character?.classProgression
          ?.totalLevel ||
        character?.level,
      abilities:
        character?.abilities?.scores,
      proficiencies:
        character?.proficiencies,
      background:
        character?.background,
      species: character?.species,
      size: character?.identity?.size,
      spellcastingInfo:
        getCharacterSpellcastingInfo(
          character
        ),
      magic: {
        knownSpellIds:
          magic.knownSpellIds,
        preparedSpellIds:
          magic.preparedSpellIds,
        innateSpellIds:
          magic.innateSpellIds,
        customSpellIds:
          magic.customSpellIds,
        innateSpells:
          magic.innateSpells,
        customSpells:
          magic.customSpells,
        classSources:
          magic.classSources,
        featSources:
          magic.featSources
      },
      featMechanics:
        character?.featMechanics
          ?.spellcasting
    });

    return derivedCache.get(
      "feat-prerequisite",
      dependencyKey,
      () => calculateFeatPrerequisiteResult(
        feat,
        character,
        options
      )
    );
  }

  function getFeatPrerequisiteLabel(feat, options = {}) {
    const result = getFeatPrerequisiteResult(
      feat,
      creatorState.draft,
      options
    );

    if (!result.met) {
      return [
        ...result.reasons,
        ...result.advisories
      ].join("; ");
    }

    if (!Array.isArray(feat?.prerequisites) || !feat.prerequisites.length) {
      return "No prerequisite";
    }

    return result.advisories.length
      ? result.advisories.join("; ")
      : "Prerequisites met";
  }

  function setSection12AsiFeat(featureId, featId) {
    if (!getSection12AsiFeature(featureId)) {
      return false;
    }

    const cleanFeatId = cleanString(featId);

    const selectedFeat = DEFAULT_FEATS.find((feat) => {
      return feat.id === cleanFeatId;
    });

    if (
      cleanFeatId &&
      (
        !selectedFeat ||
        cleanFeatId ===
          "ability-score-improvement"
      )
    ) {
      return false;
    }

    if (
      selectedFeat &&
      !getFeatPrerequisiteResult(
        selectedFeat,
        creatorState.draft,
        { featureId }
      ).met
    ) {
      return false;
    }

    const previous = getSection12AsiChoiceState(featureId);

    setSection12AsiChoiceValues(
      featureId,
      [
        "mode:feat",
        ...(cleanFeatId ? [`feat:${cleanFeatId}`] : [])
      ]
    );

    setSection12AsiBonusSource(featureId, []);
    removeSection12AsiFeatIfUnused(previous.featId);

    if (cleanFeatId) {
      creatorState.draft.feats = [
        ...new Set([
          ...normalizeFeatIds(creatorState.draft.feats),
          cleanFeatId
        ])
      ];
    }

    syncSection12AdvancementChoice(featureId);
    applySelectedFeatMechanics();
    applyCompatibilityAliases(creatorState.draft);
    markDraftChanged();

    return true;
  }

  function syncSection12AsiChoicesForLevel() {
    if (
      isMulticlassDraft(
        creatorState.draft
      )
    ) {
      const unlockedSlots =
        getUnlockedFeatChoiceSlots(
          creatorState.draft
        );
      const availableSlotIds =
        new Set(
          unlockedSlots.map((slot) => slot.id)
        );

      removeAbilityBonusSourcesByPrefix([
        "class-asi:"
      ]);

      unlockedSlots.forEach((slot) => {
        const state =
          getSection12AsiChoiceState(slot.id);

        setSection12AsiBonusSource(
          slot.id,
          state.mode === "asi"
            ? state.abilities
            : []
        );

        if (state.mode) {
          syncSection12AdvancementChoice(slot.id);
        }
      });

      creatorState.draft.advancementChoices =
        normalizeAdvancementChoices(
          creatorState.draft.advancementChoices
        );

      const removedFeatIds =
        creatorState.draft
          .advancementChoices
          .filter((choice) => {
            return (
              choice.type === "asi-or-feat" &&
              !availableSlotIds.has(
                choice.id
              )
            );
          })
          .map((choice) => {
            return cleanString(
              choice.featId
            );
          })
          .filter(Boolean);

      creatorState.draft
        .advancementChoices =
          creatorState.draft
            .advancementChoices
            .filter((choice) => {
          return (
            choice.type !== "asi-or-feat" ||
            availableSlotIds.has(choice.id)
          );
        });

      removedFeatIds.forEach(
        removeSection12AsiFeatIfUnused
      );

      return;
    }

    const availableFeatures = getSection12ClassFeaturesThroughLevel()
      .filter((feature) => feature.optionSource === "asiOrFeat");
    const availableIds = new Set(
      availableFeatures.map((feature) => feature.id)
    );
    const unlockedSlots = getUnlockedFeatChoiceSlots(
      creatorState.draft
    );
    const availableChoiceIds = new Set([
      ...availableIds,
      ...unlockedSlots.map((slot) => slot.id),
      ...unlockedSlots.map((slot) => slot.legacyId)
    ]);
    const choices = normalizeClassChoiceMap(
      creatorState.draft.classChoices
    );
    const removedFeatIds = [];

    removeAbilityBonusSourcesByPrefix([
      "class-asi:"
    ]);

    Object.keys(choices).forEach((featureId) => {
      const values = choices[featureId];
      const isAsiChoice = values.some((value) => {
        return (
          value.startsWith("mode:") ||
          value.startsWith("ability:") ||
          value.startsWith("feat:")
        );
      });

      if (!isAsiChoice) {
        return;
      }

      if (!availableChoiceIds.has(featureId)) {
        values.forEach((value) => {
          if (value.startsWith("feat:")) {
            removedFeatIds.push(value.slice("feat:".length));
          }
        });
        delete choices[featureId];
        setSection12AsiBonusSource(featureId, []);
        return;
      }

      const stateAbilities = values
        .filter((value) => value.startsWith("ability:"))
        .map((value) => value.split(":")[1])
        .filter(Boolean);

      setSection12AsiBonusSource(featureId, stateAbilities);
    });

    creatorState.draft.classChoices = choices;
    removedFeatIds.forEach(removeSection12AsiFeatIfUnused);

    const primaryClass = getSection12PrimaryClass();
    const classId = makeSafeId(
      primaryClass?.classId || primaryClass?.className,
      ""
    );
    const classEntryId = cleanString(
      primaryClass?.entryId
    );
    const availableSlotIds = new Set(
      unlockedSlots.map((slot) => slot.id)
    );

    unlockedSlots.forEach((slot) => {
      if (getSection12AsiChoiceState(slot.id).mode) {
        syncSection12AdvancementChoice(slot.id);
      }
    });

    availableIds.forEach((featureId) => {
      if (choices[featureId]) {
        syncSection12AdvancementChoice(featureId);
      }
    });

    creatorState.draft.advancementChoices =
      normalizeAdvancementChoices(
        creatorState.draft.advancementChoices
      ).filter((choice) => {
        const belongsToPrimary =
          cleanString(choice.classEntryId) ===
            classEntryId ||
          (
            !cleanString(choice.classEntryId) &&
            choice.classId === classId
          );

        return (
          choice.type !== "asi-or-feat" ||
          !belongsToPrimary ||
          availableSlotIds.has(choice.id)
        );
      });
  }

  function getSection12ArtificerInfusionState(
    feature
  ) {
    const values = getSection12FeatureStoredChoices(feature);
    const targets = Object.fromEntries(
      values
        .filter((value) => value.startsWith("target:"))
        .map((value) => {
          const [, infusionId, ...itemParts] = value.split(":");
          return [infusionId, itemParts.join(":")];
        })
    );

    return {
      knownIds: values
        .filter((value) => value.startsWith("known:"))
        .map((value) => value.slice("known:".length)),
      activeIds: values
        .filter((value) => value.startsWith("active:"))
        .map((value) => value.slice("active:".length)),
      targets
    };
  }

  function getSection12ArtificerInfusionContext(feature) {
    const classEntry = getClassEntryAtIndex(
      safeNumber(feature?.classIndex, 0)
    );
    const selectedClass = resolveClassTemplateForEntry(
      classEntry
    );
    const level = Math.max(
      1,
      safeNumber(
        feature?.classLevel,
        classEntry?.level || 1
      )
    );

    if (selectedClass?.id !== "artificer") {
      return null;
    }

    return {
      selectedClass,
      classEntry,
      feature,
      level,
      knownLimit: getProgressionValueByLevel(
        selectedClass.infusionsKnownByLevel,
        level,
        0
      ),
      activeLimit: getProgressionValueByLevel(
        selectedClass.infusedItemsByLevel,
        level,
        0
      ),
      available: (selectedClass.infusions || []).filter((infusion) => {
        return safeNumber(infusion.minimumLevel, 2) <= level;
      })
    };
  }

  function saveSection12ArtificerInfusionState(
    state,
    feature
  ) {
    const values = [
      ...state.knownIds.map((id) => `known:${id}`),
      ...state.activeIds.map((id) => `active:${id}`),
      ...Object.entries(state.targets || {})
        .filter(([infusionId, itemId]) => {
          return (
            state.activeIds.includes(infusionId) &&
            cleanString(itemId)
          );
        })
        .map(([infusionId, itemId]) => {
          return `target:${infusionId}:${itemId}`;
        })
    ];

    setSection12FeatureStoredChoices(feature, values);
  }

  function syncSection12ArtificerInfusionsForLevel() {
    getSection12ClassFeaturesThroughLevel()
      .filter((feature) => {
        return feature.customType === "artificerInfusions";
      })
      .forEach((feature) => {
        const context =
          getSection12ArtificerInfusionContext(feature);

        if (!context) {
          return;
        }

        const state =
          getSection12ArtificerInfusionState(feature);
        const availableIds = new Set(
          context.available.map((infusion) => infusion.id)
        );
        const knownIds = state.knownIds
          .filter((id) => availableIds.has(id))
          .slice(0, context.knownLimit);
        const knownSet = new Set(knownIds);
        const activeIds = state.activeIds
          .filter((id) => knownSet.has(id))
          .slice(0, context.activeLimit);
        const targets = Object.fromEntries(
          Object.entries(state.targets || {})
            .filter(([infusionId]) => {
              return activeIds.includes(infusionId);
            })
        );

        saveSection12ArtificerInfusionState({
          knownIds,
          activeIds,
          targets
        }, feature);
      });
  }

  function getSection12InfusionTargetOptions(infusion) {
    const effects = Array.isArray(infusion?.effects)
      ? infusion.effects
      : [];
    const targetTypes = uniqueCleanArray(
      effects.map((effect) => effect.target)
    );
    const inventory = Array.isArray(
      creatorState.draft.equipment?.items
    )
      ? creatorState.draft.equipment.items
      : [];

    return inventory.filter((item) => {
      if (
        item.isContainer === true ||
        cleanString(item.containerId)
      ) {
        return false;
      }

      if (!targetTypes.length) {
        return true;
      }

      return targetTypes.some((target) => {
        if (target === "armorOrShield") {
          return Boolean(item.baseArmorClass || item.isShield);
        }

        if (target === "armor") {
          return Boolean(item.baseArmorClass && !item.isShield);
        }

        if (target === "shield") {
          return item.isShield === true;
        }

        if (
          ["weapon", "ammunitionWeapon", "thrownWeapon"]
            .includes(target)
        ) {
          if (
            !(
              item.category === "weapon" ||
              item.weaponType ||
              item.damageDice
            )
          ) {
            return false;
          }

          if (target === "ammunitionWeapon") {
            return item.ranged === true;
          }

          if (target === "thrownWeapon") {
            return item.thrown === true;
          }

          return true;
        }

        if (target === "spellcastingFocus") {
          return (
            cleanString(item.category).toLowerCase().includes("focus") ||
            cleanString(item.name).toLowerCase().includes("focus")
          );
        }

        if (target === "helmet") {
          return /helm|helmet/i.test(item.name || "");
        }

        return true;
      });
    });
  }

  function toggleSection12ArtificerInfusion(
    featureKey,
    infusionId,
    mode
  ) {
    const feature = getSection12ClassFeaturesThroughLevel()
      .find((entry) => {
        return (
          getSection12FeatureChoiceKey(entry) === featureKey ||
          entry.id === featureKey
        );
      });
    const context =
      getSection12ArtificerInfusionContext(feature);

    if (
      !context ||
      !context.available.some((infusion) => infusion.id === infusionId)
    ) {
      return false;
    }

    const state = getSection12ArtificerInfusionState(feature);

    if (mode === "known") {
      if (state.knownIds.includes(infusionId)) {
        state.knownIds = state.knownIds.filter((id) => id !== infusionId);
        state.activeIds = state.activeIds.filter((id) => id !== infusionId);
        delete state.targets[infusionId];
      } else if (state.knownIds.length < context.knownLimit) {
        state.knownIds.push(infusionId);
      } else {
        return false;
      }
    } else if (mode === "active") {
      if (!state.knownIds.includes(infusionId)) {
        return false;
      }

      if (state.activeIds.includes(infusionId)) {
        state.activeIds = state.activeIds.filter((id) => id !== infusionId);
        delete state.targets[infusionId];
      } else if (state.activeIds.length < context.activeLimit) {
        state.activeIds.push(infusionId);
      } else {
        return false;
      }
    } else {
      return false;
    }

    saveSection12ArtificerInfusionState(state, feature);
    applySelectedClassFeatureMechanics();
    applyCompatibilityAliases(creatorState.draft);
    markDraftChanged();

    return true;
  }

  function setSection12ArtificerInfusionTarget(
    featureKey,
    infusionId,
    itemId
  ) {
    const feature = getSection12ClassFeaturesThroughLevel()
      .find((entry) => {
        return getSection12FeatureChoiceKey(entry) === featureKey;
      });
    const context =
      getSection12ArtificerInfusionContext(feature);
    const infusion = context?.available.find((entry) => {
      return entry.id === infusionId;
    });

    if (!feature || !infusion) {
      return false;
    }

    const state = getSection12ArtificerInfusionState(feature);

    if (!state.activeIds.includes(infusionId)) {
      return false;
    }

    const eligibleIds = new Set(
      getSection12InfusionTargetOptions(infusion)
        .map((item) => item.id)
    );
    const cleanItemId = cleanString(itemId);

    if (cleanItemId && !eligibleIds.has(cleanItemId)) {
      return false;
    }

    if (cleanItemId) {
      state.targets[infusionId] = cleanItemId;
    } else {
      delete state.targets[infusionId];
    }

    saveSection12ArtificerInfusionState(state, feature);
    applySelectedClassFeatureMechanics();
    applyCompatibilityAliases(creatorState.draft);
    markDraftChanged();

    return true;
  }

  function renderSection12ArtificerInfusions(feature) {
    const context =
      getSection12ArtificerInfusionContext(feature);

    if (!context) {
      return "";
    }

    const state = getSection12ArtificerInfusionState(feature);
    const featureKey = getSection12FeatureChoiceKey(feature);

    return `
      <div class="hg-character-current-choice">
        <b>Infusions Known:</b> ${state.knownIds.length} / ${context.knownLimit}
        <br><b>Infused Items:</b> ${state.activeIds.length} / ${context.activeLimit}
      </div>

      <div class="hg-character-field-grid">
        ${context.available.map((infusion) => {
          const known = state.knownIds.includes(infusion.id);
          const active = state.activeIds.includes(infusion.id);
          const targetOptions =
            getSection12InfusionTargetOptions(infusion);
          const targetItemId = state.targets[infusion.id] || "";

          return `
            <div class="hg-character-field">
              <h3>${escapeHtml(infusion.name)}</h3>
              <p class="small">
                Level ${safeNumber(infusion.minimumLevel, 2)}+
                <br>${escapeHtml(infusion.summary || "")}
              </p>
              <div class="hg-character-card-actions">
                <button
                  type="button"
                  data-cc-action="toggle-artificer-infusion-known"
                  data-feature-key="${escapeHtml(featureKey)}"
                  data-infusion-id="${escapeHtml(infusion.id)}"
                >${known ? "Forget" : "Learn"}</button>

                ${known
                  ? `
                    <button
                      type="button"
                      data-cc-action="toggle-artificer-infusion-active"
                      data-feature-key="${escapeHtml(featureKey)}"
                      data-infusion-id="${escapeHtml(infusion.id)}"
                    >${active ? "Remove Infusion" : "Infuse Item"}</button>
                  `
                  : ""}
              </div>
              ${active && infusion.requiresItemTarget
                ? `
                  <label class="hg-character-field">
                    <span>Infused item</span>
                    <select
                      data-cc-infusion-target="true"
                      data-feature-key="${escapeHtml(featureKey)}"
                      data-infusion-id="${escapeHtml(infusion.id)}"
                    >
                      <option value="">Choose an eligible item</option>
                      ${targetOptions.map((item) => {
                        return `
                          <option
                            value="${escapeHtml(item.id)}"
                            ${targetItemId === item.id ? "selected" : ""}
                          >${escapeHtml(item.name)}</option>
                        `;
                      }).join("")}
                    </select>
                  </label>
                `
                : ""}
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function formatSection12Recharge(value) {
    const cleanValue = cleanString(value);

    const labels = {
      longRest: "Long rest",
      shortRest: "Short rest",
      shortOrLongRest: "Short or long rest",
      turn: "Start of turn"
    };

    return labels[cleanValue] || cleanValue;
  }

  function evaluateSection12ClassLevelFormula(
    formula,
    classLevel
  ) {
    const cleanFormula = cleanString(formula);

    const multiplierMatch = cleanFormula.match(
      /^classLevel\s*\*\s*(\d+)$/i
    );

    if (multiplierMatch) {
      return (
        classLevel *
        safeNumber(multiplierMatch[1], 1)
      );
    }

    if (cleanFormula === "classLevel") {
      return classLevel;
    }

    return cleanFormula;
  }

  function getSection12FeatureMechanicLines(feature) {
    const classLevel = Math.max(
      1,
      safeNumber(
        feature?.classLevel,
        feature?.level || 1
      )
    );
    const lines = [];
    const resourceData =
      feature?.resource &&
      typeof feature.resource === "object"
        ? feature.resource
        : {};
    const uses = resourceData.uses ??
      getProgressionValueByLevel(
        resourceData.usesByLevel,
        classLevel,
        null
      );
    const recharge = resourceData.recharge ||
      getProgressionValueByLevel(
        resourceData.rechargeByLevel,
        classLevel,
        ""
      );
    const die = resourceData.die ||
      getProgressionValueByLevel(
        resourceData.dieByLevel,
        classLevel,
        ""
      );

    if (uses !== null && uses !== undefined && uses !== "") {
      lines.push(`Uses: ${uses}`);
    }

    if (recharge) {
      lines.push(
        `Recharge: ${formatSection12Recharge(
          recharge
        )}`
      );
    }

    if (die) {
      lines.push(`Die: ${die}`);
    }

    if (resourceData.usesAbility) {
      const abilityId = String(
        resourceData.usesAbility
      ).slice(0, 3).toLowerCase();

      const abilityModifier =
        calculateAbilityModifier(
          getAbilityScore(
            creatorState.draft,
            abilityId
          )
        );

      const abilityUses = Math.max(
        safeNumber(
          resourceData.minimum,
          1
        ),
        abilityModifier
      );

      lines.push(
        `Uses: ${abilityUses} (${abilityId.toUpperCase()} modifier)`
      );
    }

    if (resourceData.pool?.formula) {
      const poolValue =
        evaluateSection12ClassLevelFormula(
          resourceData.pool.formula,
          classLevel
        );

      lines.push(`Pool: ${poolValue}`);
    } else if (resourceData.perLevel) {
      lines.push(
        `Pool: ${classLevel * safeNumber(
          resourceData.perLevel,
          1
        )}`
      );
    } else if (
      cleanString(resourceData.scalesWith)
        .toLowerCase() === "level"
    ) {
      lines.push(`Pool: ${classLevel}`);
    }

    (Array.isArray(feature?.effects) ? feature.effects : [])
      .forEach((effect) => {
        if (effect.type === "spellcasting") {
          lines.push(
            `Spellcasting: ${String(effect.ability || "").toUpperCase()} (${effect.progression || "none"})`
          );
        }

        if (effect.type === "armorClassFormula") {
          const abilities = (effect.abilities || [])
            .map((ability) => String(ability).toUpperCase())
            .join(" + ");
          lines.push(`AC: ${safeNumber(effect.base, 10)} + ${abilities}`);
        }

        if (effect.type === "speedBonus") {
          lines.push(`${effect.movement || "walk"} speed: +${safeNumber(effect.value, 0)} ft.`);
        }

        if (effect.type === "speedBonusByLevel") {
          const value = getProgressionValueByLevel(
            effect.values,
            classLevel,
            0
          );
          lines.push(`${effect.movement || "walk"} speed: +${safeNumber(value, 0)} ft.`);
        }

        if (effect.type === "extraAttack") {
          lines.push(`Attacks per Attack action: ${safeNumber(effect.attacks, 1)}`);
        }

        if (effect.type === "sneakAttack") {
          lines.push(
            `Sneak Attack: ${getProgressionValueByLevel(effect.diceByLevel, classLevel, "1d6")}`
          );
        }

        if (effect.type === "rage") {
          lines.push(
            `Rage damage: +${getProgressionValueByLevel(effect.damageBonusByLevel, classLevel, 2)}`
          );
        }

        if (effect.type === "martialArts") {
          lines.push(
            `Martial Arts die: ${getProgressionValueByLevel(effect.dieByLevel, classLevel, "d4")}`
          );
        }

        if (effect.type === "wildShape") {
          const limitations = getProgressionValueByLevel(
            effect.limitationsByLevel,
            classLevel,
            []
          );
          lines.push(
            `Wild Shape: CR ${getProgressionValueByLevel(effect.maxCrByLevel, classLevel, "1/4")} or lower`
          );
          lines.push(
            `Duration: ${Math.max(1, Math.floor(classLevel / 2))} hour(s)${limitations.length ? `; ${limitations.join(", ")}` : ""}`
          );
        }

        if (effect.type === "divineSmite") {
          lines.push(
            "Divine Smite: spend a spell slot after a melee weapon hit"
          );
        }

        if (effect.type === "maneuverSaveDc") {
          const abilityModifier = Math.max(
            calculateAbilityModifier(
              getAbilityScore(creatorState.draft, "str")
            ),
            calculateAbilityModifier(
              getAbilityScore(creatorState.draft, "dex")
            )
          );
          lines.push(
            `Maneuver save DC: ${8 + getCharacterProficiencyBonus(creatorState.draft) + abilityModifier}`
          );
        }

        if (effect.type === "resourcePool" && effect.formula) {
          const value =
            evaluateSection12ClassLevelFormula(
              effect.formula,
              classLevel
            );
          lines.push(`${effect.name || "Resource"}: ${value}`);
        }

        if (effect.type === "infusions") {
          lines.push(
            `Infusions known: ${getProgressionValueByLevel(effect.knownByLevel, classLevel, 0)}`
          );
          lines.push(
            `Infused items: ${getProgressionValueByLevel(effect.activeByLevel, classLevel, 0)}`
          );
        }
      });

    return [...new Set(lines)];
  }

  function renderSection12FeatureMechanics(feature) {
    const lines = getSection12FeatureMechanicLines(feature);

    if (!lines.length) {
      return "";
    }

    return `
      <p class="small">
        <b>Mechanics:</b><br>
        ${lines.map((line) => escapeHtml(line)).join("<br>")}
      </p>
    `;
  }

  function renderSection12FutureFeatures() {
    const futureFeatures =
      getSection12FutureClassFeatures();

    if (!futureFeatures.length) {
      return "";
    }

    const featureGroups = new Map();

    futureFeatures.forEach((feature) => {
      const level = Math.max(
        1,
        Math.round(
          safeNumber(feature.level, 1)
        )
      );

      const groupKey =
        feature.classEntryId
          ? `${feature.classEntryId}:${level}`
          : `single:${level}`;

      if (!featureGroups.has(groupKey)) {
        featureGroups.set(groupKey, {
          level,
          className:
            feature.classEntryId
              ? feature.className
              : "",
          features: []
        });
      }

      featureGroups
        .get(groupKey)
        .features
        .push(feature);
    });

    const levelCards = Array.from(
      featureGroups.values()
    )
      .map(({ level, className, features }) => {
        return `
          <article class="hg-character-choice-card">
            <h3>${
              className
                ? `${escapeHtml(className)} `
                : ""
            }Level ${level}</h3>

            <p>
              ${features
                .map((feature) => {
                  return escapeHtml(feature.name);
                })
                .join("<br>")}
            </p>
          </article>
        `;
      })
      .join("");

    return `
      <details class="hg-character-future-features">
        <summary>
          Future Features (${futureFeatures.length})
        </summary>

        <p class="small">
          These features unlock after your current class level.
        </p>

        <div class="hg-character-choice-grid">
          ${levelCards}
        </div>
      </details>
    `;
  }

  function renderSection12SelectedClassDetails() {
    const selectedClass = getSelectedClassTemplate();

    if (!selectedClass) {
      return "";
    }

    const features = getSection12ClassFeaturesThroughLevel();
    const classEntries =
      getClassProgressionEntries(
        creatorState.draft
      );
    const multiclass =
      classEntries.length > 1;
    const latestAsiSlotId = cleanString(
      getLatestLevelUpContext(
        creatorState.draft
      )?.asiSlot?.id
    );

    const renderFeatureCard = (feature) => {
      const choiceOptionRecords =
        feature.type === "choice"
          ? getSection12FeatureChoiceOptionRecords(feature)
          : [];
      const featureSelections =
        getSection12FeatureStoredChoices(feature);
      const chooseCount =
        getSection12FeatureChooseCount(feature);
      const choiceKey =
        getSection12FeatureChoiceKey(feature);
      const featureAsiSlot =
        feature.optionSource === "asiOrFeat"
          ? getSection12UnlockedAsiSlot(
              feature.id
            )
          : null;
      const isLatestAsiSlot = Boolean(
        latestAsiSlotId &&
        cleanString(featureAsiSlot?.id) ===
          latestAsiSlotId
      );

      return `
        <article
          class="hg-character-choice-card"
          data-class-entry-id="${escapeHtml(feature.classEntryId || "")}"
          data-feature-card-class-id="${escapeHtml(feature.classId || "")}"
          data-feature-card-id="${escapeHtml(feature.id || "")}"
        >
          <h3>${escapeHtml(feature.name)}</h3>

          <p class="small">
            ${feature.className ? `${escapeHtml(feature.className)} ` : ""}Level ${safeNumber(feature.level, 1)}
            ${feature.summary
              ? `<br>${escapeHtml(feature.summary)}`
              : ""}
          </p>

          ${
            feature.description
              ? `
                <p
                  class="small"
                  data-feature-full-description="true"
                >
                  ${escapeHtml(
                    feature.description
                  )}
                </p>
              `
              : ""
          }

          ${renderClassFeatureMetadata(
            feature
          )}

          ${renderSection12FeatureMechanics(feature)}

          ${feature.customType === "artificerInfusions"
            ? renderSection12ArtificerInfusions(feature)
            : feature.optionSource === "asiOrFeat"
            ? isLatestAsiSlot
              ? `
                <p class="small">
                  Manage this choice in Latest Level Unlock above.
                </p>
              `
              : renderSection12AsiChoice(feature)
            : feature.type === "choice"
            ? `
              <p><b>Choose ${chooseCount}:</b></p>

              ${choiceOptionRecords.length
                ? `
                  ${feature.optionSource === "castableSpellsAllClasses"
                    ? `
                      <label class="hg-character-field">
                        <span>Choose ${chooseCount} spell${chooseCount === 1 ? "" : "s"}</span>
                        <select
                          multiple
                          size="8"
                          data-cc-class-feature-select="true"
                          data-feature-key="${escapeHtml(choiceKey)}"
                          data-choice-limit="${chooseCount}"
                        >
                          ${choiceOptionRecords.map((optionRecord) => {
                            return `
                              <option
                                value="${escapeHtml(optionRecord.value)}"
                                ${featureSelections.includes(optionRecord.value) ? "selected" : ""}
                              >${escapeHtml(optionRecord.label)}</option>
                            `;
                          }).join("")}
                        </select>
                      </label>
                    `
                    : `
                  <div class="hg-character-inline-actions">
                    ${choiceOptionRecords.map((optionRecord) => {
                      const selected = featureSelections.includes(optionRecord.value);

                      return `
                        <button
                          type="button"
                          class="${selected ? "selected" : ""}"
                          data-cc-action="toggle-class-feature-choice"
                          data-feature-id="${escapeHtml(feature.id)}"
                          data-feature-key="${escapeHtml(choiceKey)}"
                          data-option="${escapeHtml(optionRecord.value)}"
                          ${optionRecord.summary ? `title="${escapeHtml(optionRecord.summary)}"` : ""}
                        >
                          ${selected ? "Remove" : "Choose"}
                          ${escapeHtml(optionRecord.label)}
                          ${optionRecord.cost !== undefined ? ` (${escapeHtml(String(optionRecord.cost))} point${safeNumber(optionRecord.cost, 1) === 1 ? "" : "s"})` : ""}
                        </button>
                      `;
                    }).join("")}
                  </div>
                    `}
                `
                : `
                  <p class="small">
                    Options become available after the related subclass or proficiency choices are made.
                  </p>
                `}
            `
            : ""}
        </article>
      `;
    };

    const featureCards = features
      .map(renderFeatureCard)
      .join("");

    const classProfileCards =
      classEntries
        .map((classEntry, classIndex) => {
          const classTemplate =
            resolveClassTemplateForEntry(
              classEntry
            );

          if (!classTemplate) {
            return "";
          }

          const isStartingClass =
            isStartingClassEntry(
              classEntry,
              creatorState.draft,
              classIndex
            );
          const classEntryId =
            getClassProgressionEntryKey(
              classEntry,
              classIndex
            );
          const classId = makeSafeId(
            classEntry?.classId ||
            classTemplate.id,
            ""
          );
          const className =
            safeDisplayString(
              classEntry?.className,
              classTemplate.name ||
              `Class ${classIndex + 1}`
            );
          const classLevel =
            getClassEntryLevel(
              classEntry,
              1
            );
          const proficiencyRule =
            isStartingClass
              ? {
                  armor:
                    classTemplate
                      .armorProficiencies ||
                    [],
                  weapons:
                    classTemplate
                      .weaponProficiencies ||
                    [],
                  tools:
                    classTemplate
                      .toolProficiencies ||
                    [],
                  skillChoices:
                    classTemplate
                      .skillChoices ||
                    {}
                }
              : getMulticlassProficiencyRule(
                  classEntry
                );
          const skillChoices =
            proficiencyRule
              .skillChoices ||
            {};
          const selectedSubclass =
            getClassEntrySubclassTemplate(
              classEntry
            );
          const subclassLevel =
            Math.max(
              1,
              Math.round(
                safeNumber(
                  classTemplate
                    .subclassLevel,
                  3
                )
              )
            );

          return `
            <article
              class="hg-character-choice-card selected"
              data-class-profile-entry-id="${escapeHtml(classEntryId)}"
              data-class-profile-id="${escapeHtml(classId)}"
            >
              <h3>
                ${escapeHtml(className)}
                Level ${classLevel}
                Proficiencies
              </h3>

              <p>
                <b>Class Role:</b>
                ${isStartingClass ? "Starting class" : "Multiclass addition"}
                <br><b>Hit Die:</b> ${escapeHtml(classTemplate.hitDie || "d8")}
                <br><b>Primary Ability:</b> ${escapeHtml(formatSection12List(classTemplate.primaryAbilities) || "None specified")}
                <br><b>Saving Throws:</b> ${escapeHtml(isStartingClass ? formatSection12List(classTemplate.savingThrows) || "None" : "None gained from multiclassing")}
                <br><b>Armor:</b> ${escapeHtml(formatSection12List(proficiencyRule.armor) || "None")}
                <br><b>Weapons:</b> ${escapeHtml(formatSection12List(proficiencyRule.weapons) || "None")}
                <br><b>Tools:</b> ${escapeHtml(formatSection12List(proficiencyRule.tools) || "None")}
                <br><b>Skill Choices:</b> Choose ${safeNumber(skillChoices.choose, 0)} from ${escapeHtml(formatSection12List(skillChoices.from) || "none")}
                <br><b>Subclass:</b> ${escapeHtml(selectedSubclass?.name || (classLevel >= subclassLevel ? "Pending selection" : `Unlocks at class level ${subclassLevel}`))}
              </p>
            </article>
          `;
        })
        .join("");

    const multiclassFeatureGroups =
      multiclass
        ? classEntries
            .map((classEntry, classIndex) => {
              const classEntryId =
                getClassProgressionEntryKey(
                  classEntry,
                  classIndex
                );
              const classTemplate =
                resolveClassTemplateForEntry(
                  classEntry
                );
              const classId = makeSafeId(
                classEntry?.classId ||
                classTemplate?.id,
                ""
              );
              const className =
                safeDisplayString(
                  classEntry?.className,
                  classTemplate?.name ||
                  `Class ${classIndex + 1}`
                );
              const classLevel =
                getClassEntryLevel(
                  classEntry,
                  1
                );
              const ownedFeatures =
                features.filter((feature) => {
                  return (
                    cleanString(
                      feature.classEntryId
                    ) === classEntryId &&
                    makeSafeId(
                      feature.classId,
                      ""
                    ) === classId
                  );
                });

              return `
                <section
                  class="hg-character-class-feature-group"
                  data-class-feature-group-entry-id="${escapeHtml(classEntryId)}"
                  data-class-feature-group-id="${escapeHtml(classId)}"
                >
                  <h4>
                    ${escapeHtml(className)}
                    Level ${classLevel} Features
                  </h4>

                  <p class="small">
                    Only ${escapeHtml(className)} class and subclass features are shown in this group.
                  </p>

                  <div class="hg-character-choice-grid">
                    ${ownedFeatures.length
                      ? ownedFeatures
                          .map(
                            renderFeatureCard
                          )
                          .join("")
                      : `
                        <div class="hg-character-placeholder">
                          No ${escapeHtml(className)} features are defined through class level ${classLevel}.
                        </div>
                      `}
                  </div>
                </section>
              `;
            })
            .join("")
        : "";

    return `
      <hr>

      <h3>${multiclass ? "Multiclass Feature Details" : `${escapeHtml(selectedClass.name)} Details`}</h3>

      <div class="hg-character-choice-grid">
        ${classProfileCards}
      </div>

      <h3>
        ${multiclass
          ? "Class Features by Class Level"
          : `Class Features Through Level ${clampLevel(creatorState.draft.classProgression.totalLevel)}`}
      </h3>

      ${multiclass
        ? multiclassFeatureGroups
        : `
          <div class="hg-character-choice-grid">
            ${featureCards || `
              <div class="hg-character-placeholder">
                No class features are defined through this level.
              </div>
            `}
          </div>
        `}

      ${renderSelectedClassMechanicsSummary()}

      ${renderSection12FutureFeatures()}
    `;
  }

  const featsStep = createFeatsStep({
    ABILITY_DEFINITIONS,
    DEFAULT_FEATS,
    DEFAULT_FEAT_ABILITY_SCORE_MAXIMUM,
    adjustSection12AsiAbility,
    cleanString,
    describeFeatSpellChoiceRestrictions,
    escapeHtml,
    findSection12ActionElement: (...values) => {
      return classStep.findActionElement(...values);
    },
    getCreatorState: () => creatorState,
    getFeatAbilityEffectMaximum,
    getFeatPrerequisiteLabel,
    getFeatPrerequisiteResult,
    getFeatSpellcastingValidationWarnings,
    getNormalAbilityScoreForCap,
    getSection12AsiChoiceState,
    getSection12FeatChoiceLimit,
    getSection12FeatChoiceOptions,
    getUnlockedFeatChoiceSlots,
    renderCreatorView: renderCurrentStep,
    safeNumber,
    setFeatRestChoice,
    setSection12AsiFeat,
    setSection12AsiMode,
    setSection12FeatChoiceValues,
    setStatus,
    uniqueCleanArray
  });

  const {
    formatSection12FeatEffect,
    renderSection12FeatChoices,
    renderSection12CompactAsiChoice,
    renderSection12AsiChoice,
    handleSection12AsiAction,
    handleSection12AsiChange,
    handleSection12ChooseAsiFeat,
    handleSection12FeatSearch
  } = featsStep.compatibility;

  const multiclassStep = createMulticlassStep({
    DEFAULT_FEATS,
    DEFAULT_SPELLS,
    addCharacterLevelToClass,
    adjustMulticlassClassLevel,
    calculateClassProgressionTotalLevel,
    clampLevel,
    cleanArray,
    cleanString,
    cloneData,
    escapeHtml,
    findSection12ActionElement: (...values) => {
      return classStep.findActionElement(...values);
    },
    formatClassEntryProficiencySummary,
    formatMulticlassPrerequisiteFailure,
    formatMulticlassStoredChoiceValue,
    getAllClassTemplates,
    getCharacterClassEntries,
    getCharacterLevelHitDieRecords,
    getClassEntryAtIndex,
    getClassEntryLevel,
    getClassEntrySkillChoiceConfig,
    getClassEntrySubclassTemplate,
    getClassEntryToolChoiceConfig,
    getClassEntryToolChoiceOptions,
    getClassProgressionEntries,
    getClassProgressionEntryKey,
    getClassProgressionPendingChoiceWarnings,
    getCreatorState: () => creatorState,
    getGenericProficiencyBonus,
    getMulticlassClassId,
    getMulticlassPrerequisiteResultForClass,
    getMulticlassPrerequisiteResults,
    getMulticlassSummaryEntries,
    getPrimaryClassEntry,
    getSafeClassName,
    getSkillDefinitionByIdOrName,
    getUnlockedFeatChoiceSlots,
    getValidClassEntrySkillIds,
    getValidClassEntryToolChoices,
    isMulticlassDraft,
    isStartingClassEntry,
    moveCharacterLevelOrder,
    moveMulticlassClass,
    normalizeClassLevelOrder,
    normalizeSection12Subclass,
    recalculateClassTotalLevel,
    removeLastCharacterLevel,
    removeMulticlassClass,
    renderCreatorView: renderCurrentStep,
    renderLevelUpWorkflow,
    resolveClassTemplateForEntry,
    setMulticlassClassLevel,
    setMulticlassSubclass,
    setStatus,
    toggleMulticlassSkillChoice,
    toggleMulticlassToolChoice,
    tryAddMulticlassClass,
    uniqueCleanArray,
    wizardField,
    wizardSelect
  });

  const {
    renderMulticlassStoredChoices,
    renderMulticlassReadOnlyNotice,
    renderMulticlassClassSummary,
    renderMulticlassAdvancementChoiceSummary,
    renderMulticlassLevelBreakdown,
    getSection12MulticlassAddStatus,
    renderSection12MulticlassAddStatus,
    setSection12MulticlassAddStatus,
    renderMulticlassProgressionEditor,
    renderMulticlassSkillChoices,
    renderMulticlassToolChoices,
    debugSection12MulticlassAdd,
    handleSection12AddMulticlassClass,
    handleSection12AdjustMulticlassLevel,
    handleSection12RemoveMulticlassClass,
    handleSection12MoveMulticlassClass,
    handleSection12MoveCharacterLevelOrder,
    handleSection12AddCharacterLevel,
    handleSection12RemoveLastCharacterLevel,
    handleSection12ToggleMulticlassSkill,
    handleSection12ToggleMulticlassTool,
    handleSection12MulticlassChange
  } = multiclassStep.compatibility;

  const classStep = createClassStep({

    applyCompatibilityAliases,
    applySection12CustomClass,
    applySection12CustomSubclass,
    applySelectedClassFeatureMechanics,
    beginnerNote,
    chooseSection12Class,
    chooseSection12Subclass,
    clampLevel,
    cleanString,
    clearSection12Subclass,
    creatorDependencies: deps,
    deleteSelectedRoomClass,
    escapeHtml,
    formatSection12List,
    friendlyServiceError,
    getAllClassTemplates,
    getCharacterClassEntries,
    getClassEntryLevel,
    getClassProgressionPendingChoiceWarnings,
    getCreatorState: () => creatorState,
    getMulticlassPrerequisiteResults,
    getPrimaryClassEntry,
    getRoomCode,
    getSafeClassName,
    getSafeSubclassName,
    getSection12ClassFeaturesThroughLevel,
    getSection12FeatureChoiceKey,
    getSection12FeatureChoiceOptions,
    getSection12FeatureChooseCount,
    getSection12PrimaryClass,
    getSection12SkillPickerChoices,
    getSection12SubclassTemplates,
    getSection19CollectionName,
    getSelectedClassTemplate,
    getSelectedSection12Subclass,
    isMulticlassDraft,
    markDraftChanged,
    renderCreatorView: renderCurrentStep,
    renderCustomClassMovementFields,
    renderLevelStep: (...args) => {
      return abilitiesStep.renderLevelStep(...args);
    },
    renderMulticlassLevelBreakdown,
    renderMulticlassProgressionEditor,
    renderRulesetMetadata,
    renderSection12SelectedClassDetails,
    renderSection14ProficiencyGuide: (...args) => {
      return skillsStep.compatibility.renderSection14ProficiencyGuide(...args);
    },
    renderSection14SourceSkillChoices: (...args) => {
      return skillsStep.compatibility.renderSection14SourceSkillChoices(...args);
    },
    safeDisplayString,
    safeNumber,

    setSection12ArtificerInfusionTarget,



    setSection12FeatureStoredChoices,
    setStatus,
    toggleSection12ArtificerInfusion,
    toggleSection12ClassFeatureChoice,
    updateSection12CustomClassSkillPicker,
    wizardChoiceCard,
    wizardField,
    wizardSelect
  });

  const {
    renderClassStep,
    renderSubclassStep,
    findSection12ActionElement,
    handleSection12ChooseClass,
    handleSection12DeleteRoomClass,
    handleSection12CustomClass,
    handleSection12ClassFeatureChoice,
    handleSection12ClassFeatureSelectChange,




    handleSection12ArtificerInfusion,
    handleSection12ArtificerInfusionTargetChange,
    handleSection12CustomClassSkillPicker,
    handleSection12ChooseSubclass,
    handleSection12CustomSubclass,
    handleSection12ClearSubclass
  } = classStep.compatibility;

  registerCharacterStepRenderer("class", classStep.renderStep);
  registerCharacterStepRenderer("subclass", classStep.renderSubclassStep);

  classStep.actions.forEach((action) => {
    registerCharacterCreatorAction(action, (context) => {
      return classStep.handleStepClick(context);
    });
  });

  featsStep.actions.forEach((action) => {
    registerCharacterCreatorAction(action, (context) => {
      return featsStep.handleStepClick(context);
    });
  });

  multiclassStep.actions.forEach((action) => {
    registerCharacterCreatorAction(action, (context) => {
      return multiclassStep.handleStepClick(context);
    });
  });

  registerCharacterCreatorInputHandler(classStep.handleStepInput);
  registerCharacterCreatorInputHandler(featsStep.handleStepInput);
  registerCharacterCreatorInputHandler(multiclassStep.handleStepInput);
  registerCharacterCreatorChangeHandler(classStep.handleStepChange);
  registerCharacterCreatorChangeHandler(featsStep.handleStepChange);
  registerCharacterCreatorChangeHandler(multiclassStep.handleStepChange);


// =====================================================
// CHARACTER CREATOR SECTION 13 — LEVEL / ABILITY SCORES
// =====================================================

  const abilitiesStep = createAbilitiesStep({
    ABILITY_DEFINITIONS,
    ABILITY_SCORE_METHODS,
    applyCompatibilityAliases,
    applySection11SpeciesMechanics,
    applySection12ClassDefaults,
    beginnerNote,
    calculateAbilityModifier,
    calculateArmorClassOptions,
    calculateCharacterHitDice,
    calculateCharacterHp,
    calculateCharacterInitiative,
    calculateCharacterPassiveScores,
    calculateSection16SpellcastingValues,
    clampLevel,
    cleanString,
    clearSection11SpeciesMechanics,
    escapeHtml,
    findHpRollRawRecordForLevel,
    formatSection17Modifier,
    formatSignedNumber,
    getAbilityScore,
    getCharacterLevelHitDieRecords,
    getCharacterProficiencyBonus,
    getCreatorState: () => creatorState,
    getGenericProficiencyBonus,
    getHitDieSize,
    getHpRollRawRecords,
    getPrimaryClassEntry,
    getSafeClassName,
    getSelectedClassTemplate,
    getSpellcastingSummary,
    hpRollRawMatchesLevel,
    isMulticlassDraft,
    markDraftChanged,
    normalizeHpCalculation,
    normalizeHpRollRecordsForCharacter,
    recalculateAbilityTotals,
    refreshClassProgressionDerivedValues,
    refreshSelectedClassFeatures,
    renderCreatorView: renderCurrentStep,
    renderMulticlassLevelBreakdown,
    renderMulticlassProgressionEditor,
    safeDisplayString,
    safeNumber,
    setCharacterLevel,
    setDraftValue,
    setSimpleDraftField,
    setStatus,
    syncClassLevelOrderToClassLevels,
    wizardField,
    wizardSelect
  });

  const {
    getSection13AbilityName,
    SECTION13_POINT_BUY_COSTS,
    getSection13AbilityScore,
    getSection13BaseAbilityScore,
    getSection13AbilityBonus,
    renderSection13AbilityScoreDetails,
    setSection13AbilityMethod,
    applySection13Scores,
    applySection13StandardArray,
    assignSection13StandardScore,
    applySection13PointBuyDefaults,
    getSection13PointBuySpent,
    changeSection13PointBuyScore,
    rollSection13AbilityScore,
    rollSection13ScorePool,
    applySection13RolledScores,
    getSection13HitDieSize,
    calculateSection13SuggestedHp,
    formatSection13HpRolls,
    parseSection13HpRolls,
    createSection13HpRollRecord,
    getSection13HpRollState,
    setSection13HpRollValue,
    renderSection13RolledHpInputs,
    applySection13SuggestedHp,
    refreshSection13LevelProgression,
    renderSection13HitDice,
    renderSection13HpGuide,
    renderSection13ArmorClassGuide,
    renderLevelStep,
    renderSection13ManualAbilities,
    renderSection13StandardArray,
    renderSection13PointBuy,
    renderSection13RolledAbilities,
    renderSection13AbilitySummary,
    renderSection13MechanicsGuide,
    renderSection13DerivedMechanics,
    refreshSection13AbilitySummary,
    renderAbilitiesStep,
    findSection13ActionElement,
    handleSection13RefreshLevel,
    handleSection13CalculateHp,
    handleSection13ResetStandardArray,
    handleSection13PointBuy,
    handleSection13ResetPointBuy,
    handleSection13RollScores,
    handleSection13ApplyRolls,
    handleSection13Change,
    isSection17AbilitiesComplete
  } = abilitiesStep.compatibility;

  registerCharacterStepRenderer(
    "level",
    abilitiesStep.renderLevelStep
  );

  registerCharacterStepRenderer(
    "abilities",
    abilitiesStep.renderStep
  );

  abilitiesStep.actions.forEach((action) => {
    registerCharacterCreatorAction(action, (context) => {
      return abilitiesStep.handleStepClick(context);
    });
  });

  registerCharacterCreatorInputHandler(
    abilitiesStep.handleStepInput
  );

  registerCharacterCreatorChangeHandler(
    abilitiesStep.handleStepChange
  );

// =====================================================
// CHARACTER CREATOR SECTION 14 — BACKGROUND / PROFICIENCIES
// =====================================================

  function parseSection14List(value) {
    return String(value || "")
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function formatSection14List(value) {
    return Array.isArray(value)
      ? value.join(", ")
      : "";
  }

  const backgroundStep = createBackgroundStep({
    $,
    ARTISAN_TOOL_OPTIONS,
    CURRENCY_DENOMINATIONS,
    DEFAULT_BACKGROUND_EQUIPMENT_PACKAGES,
    DEFAULT_BACKGROUND_TEMPLATES,
    GAMING_SET_OPTIONS,
    GENERAL_TOOL_OPTIONS,
    MUSICAL_INSTRUMENT_OPTIONS,
    STANDARD_LANGUAGE_OPTIONS,
    addCurrencyMaps,
    applyCompatibilityAliases,
    beginnerNote,
    cleanArray,
    cleanString,
    cloneData,
    countSection14ValidSkillSource: (...args) => {
      return skillsStep.compatibility.countSection14ValidSkillSource(...args);
    },
    createEmptyCharacter,
    ensureEquipmentCurrencySources,
    ensureProficiencySources,
    escapeHtml,
    findSection14ActionElement: (...args) => {
      return skillsStep.compatibility.findSection14ActionElement(...args);
    },
    formatSection14List,
    getBackgroundSourceLabel,
    getCreatorState: () => creatorState,
    getLegacy2014Metadata,
    getManualCurrencyBalance,
    getSafeBackgroundName,
    getSection15Catalog,
    getSection15Inventory,
    getStoredSources,
    hasCurrencyValue,
    isActiveRulesetEntry,
    makeSafeId,
    markDraftChanged,
    normalizeCurrencyMap,
    normalizeSection15Item,
    normalizeSpeciesBackgroundChoices,
    parseSection14List,
    removeListProficiencySource,
    removeSkillProficiencySource,
    renderCatalogEntryDetails,
    renderCreatorView: renderCurrentStep,
    renderDescriptionStoryFields,
    renderFullCatalogDescription,
    renderRulesetMetadata,
    renderSection14ExpertiseChoices: (...args) => {
      return skillsStep.compatibility.renderSection14ExpertiseChoices(...args);
    },
    renderSection14ProficiencyGuide: (...args) => {
      return skillsStep.compatibility.renderSection14ProficiencyGuide(...args);
    },
    renderSection14SourceSkillChoices: (...args) => {
      return skillsStep.compatibility.renderSection14SourceSkillChoices(...args);
    },
    safeDisplayString,
    safeNumber,
    setSourceProficiencyList,
    setStatus,
    syncEquipmentCurrencyFromSources,
    uniqueCleanArray,
    wizardChoiceCard,
    wizardField,
    wizardSelect
  });

  const {
    normalizeSection14Background,
    getAllSection14Backgrounds,
    getSelectedSection14Background,
    getSection14BackgroundChoiceList,
    setSection14BackgroundChoiceList,
    getSection14AllExactToolOptions,
    expandSection14ToolChoice,
    getSection14BackgroundToolOptions,
    getSection14BackgroundToolOptionsForIndex,
    getSection14BackgroundLanguageOptions,
    countSection14BackgroundSourceList,
    getSection14BackgroundSourceValues,
    countSection14ValidBackgroundToolChoices,
    applySection14BackgroundChoices,
    getSection14BackgroundPackages,
    removeSection14BackgroundEquipment,
    getSection14BackgroundCurrencyGrant,
    hasSection14BackgroundCurrency,
    formatSection14CurrencySummary,
    getSection14BackgroundRemovalSummary,
    addSection14BackgroundCurrency,
    removeSection14BackgroundCurrency,
    handleSection14OldBackgroundEquipment,
    applySection14BackgroundPackage,
    chooseSection14Background,
    skipSection14Background,
    applySection14CustomBackground,
    syncSection14BackgroundFeatures,
    addSection14BackgroundFeature,
    removeSection14BackgroundFeature,
    renderBackgroundStep,
    handleSection14ChooseBackground,
    handleSection14SkipBackground,
    handleSection14CustomBackground,
    handleSection14ApplyBackgroundChoices,
    handleSection14ApplyBackgroundPackage,
    handleSection14AddFeature,
    handleSection14RemoveFeature,
    isSection17BackgroundComplete
  } = backgroundStep.compatibility;

  const skillsStep = createSkillsStep({
    $,
    SKILL_DEFINITIONS,
    applyCompatibilityAliases,
    calculateAbilityModifier,
    cleanArray,
    cleanString,
    escapeHtml,
    formatSection14List,
    getBackgroundSourceLabel,
    getCharacterProficiencyBonus,
    getClassSourceLabel,
    getCreatorState: () => creatorState,
    getManualProficiencyList,
    getPrimaryClassEntry,
    getSelectedClassTemplate,
    getSelectedSection14Background,
    isMulticlassDraft,
    isSection17ClassComplete,
    markDraftChanged,
    parseSection14List,
    renderCreatorView: renderCurrentStep,
    safeNumber,
    setManualProficiencyList,
    setStatus,
    uniqueCleanArray,
    wizardField
  });

  const {
    getSection14SkillEntry,
    getSection14SkillSourceLabel,
    getSection14SkillChoiceList,
    setSection14StoredSkillChoice,
    countSection14SkillSource,
    countSection14ValidSkillSource,
    setSection14SkillEntry,
    toggleSection14Skill,
    toggleSection14Expertise,
    getSection14SkillModifier,
    applySection14ProficiencyLists,
    renderSection14ProficiencyGuide,
    renderSection14SourceSkillChoices,
    renderSection14ExpertiseChoices,
    renderSkillsStep,
    findSection14ActionElement,
    handleSection14ToggleSkill,
    handleSection14ToggleExpertise,
    handleSection14ApplyLists,
    isSection17SkillsComplete
  } = skillsStep.compatibility;

  registerCharacterStepRenderer(
    "background",
    backgroundStep.renderStep
  );

  registerCharacterStepRenderer(
    "skills",
    skillsStep.renderStep
  );

  backgroundStep.actions.forEach((action) => {
    registerCharacterCreatorAction(action, (context) => {
      return backgroundStep.handleStepClick(context);
    });
  });

  registerCharacterCreatorInputHandler(
    backgroundStep.handleStepInput
  );

  registerCharacterCreatorChangeHandler(
    backgroundStep.handleStepChange
  );

  skillsStep.actions.forEach((action) => {
    registerCharacterCreatorAction(action, (context) => {
      return skillsStep.handleStepClick(context);
    });
  });

  registerCharacterCreatorInputHandler(
    skillsStep.handleStepInput
  );

  registerCharacterCreatorChangeHandler(
    skillsStep.handleStepChange
  );

// =====================================================
// CHARACTER CREATOR SECTION 15 — EQUIPMENT / INVENTORY
// =====================================================

  function getSpellcastingFocusClassIds(
    item,
    spellcastingClasses = []
  ) {
    const explicitClassIds =
      uniqueCleanArray(
        item?.spellcastingFocusClassIds ||
        item?.focusClassIds
      ).map((classId) => {
        return makeSafeId(classId, "class");
      });

    if (explicitClassIds.length) {
      return explicitClassIds;
    }

    const focusText =
      `${cleanString(item?.category)} ${cleanString(item?.name)}`.toLowerCase();
    const categoryText =
      cleanString(item?.category).toLowerCase();

    if (focusText.includes("component pouch")) {
      return uniqueCleanArray(
        spellcastingClasses.map((entry) => {
          return entry?.classId;
        })
      );
    }

    if (
      focusText.includes("druidic focus") ||
      focusText.includes("sprig of mistletoe") ||
      focusText.includes("totem") ||
      focusText.includes("wooden staff") ||
      focusText.includes("yew wand")
    ) {
      return ["druid"];
    }

    if (
      focusText.includes("arcane focus") ||
      (
        categoryText.includes("focus") &&
        /\b(crystal|orb|rod|staff|wand)\b/i
          .test(focusText)
      )
    ) {
      return [
        "sorcerer",
        "warlock",
        "wizard"
      ];
    }

    if (
      focusText.includes("holy symbol") ||
      focusText.includes("amulet") ||
      focusText.includes("emblem") ||
      focusText.includes("reliquary")
    ) {
      return ["cleric", "paladin"];
    }

    if (
      focusText.includes("musical instrument") ||
      /\b(lute|lyre|flute|horn|drum|dulcimer|viol|bagpipes|shawm)\b/i
        .test(focusText)
    ) {
      return ["bard"];
    }

    if (
      focusText.includes("artisan") ||
      focusText.includes("thieves' tools") ||
      focusText.includes("thieves tools") ||
      item?.infused === true ||
      cleanString(item?.infusionId)
    ) {
      return ["artificer"];
    }

    return [];
  }

  function getSpellcastingFocusSummary(
    character
  ) {
    const spellcastingClasses =
      getSpellcastingClassOptions(character);
    const inventory =
      Array.isArray(
        character?.equipment?.items
      )
        ? character.equipment.items
        : [];

    return spellcastingClasses.map((entry) => {
      const classId = cleanString(
        entry.classId
      );
      const focuses =
        inventory.filter((item) => {
          return (
            !cleanString(item?.containerId) &&
            getSpellcastingFocusClassIds(
              item,
              spellcastingClasses
            ).includes(classId)
          );
        });

      return {
        classEntryId:
          getSection16SourceKey(entry),
        classId,
        className:
          cleanString(
            entry.className,
            classId
          ),
        focuses: focuses.map((item) => {
          return {
            id: cleanString(item.id),
            name: cleanString(
              item.name,
              "Spellcasting focus"
            )
          };
        })
      };
    });
  }

  function normalizeSection15Item(
    rawItem,
    fallbackSource = "custom"
  ) {
    const {
      raw,
      name,
      category,
      quantity,
      weight: rawWeight,
      isMagical,
      requiresAttunement,
      isContainer,
      capacityWeight
    } = normalizeInventoryItemBase(
      rawItem,
      fallbackSource
    );

    const armorCategory =
      cleanString(
        raw.armorCategory ||
        (
          raw.isShield === true ||
          category.toLowerCase() === "shield"
            ? "shield"
            : category.toLowerCase() === "armor"
              ? "light armor"
              : ""
        )
      );

    const baseArmorClass =
      raw.baseArmorClass === null ||
      raw.baseArmorClass === undefined ||
      raw.baseArmorClass === ""
        ? null
        : Math.max(
            0,
            safeNumber(
              raw.baseArmorClass,
              10
            )
          );

    const dexterityCap =
      raw.dexterityCap === null ||
      raw.dexterityCap === undefined ||
      raw.dexterityCap === ""
        ? null
        : safeNumber(
            raw.dexterityCap,
            2
          );

    const isShield =
      raw.isShield === true ||
      category.toLowerCase() === "shield" ||
      armorCategory.toLowerCase() === "shield";

    const legacyMagicalBonus =
      safeNumber(
        raw.magicalBonus,
        0
      );

    const legacyBonusLooksArmor =
      legacyMagicalBonus !== 0 &&
      (
        isShield ||
        baseArmorClass !== null ||
        category.toLowerCase() === "armor"
      );

    const legacyBonusLooksWeapon =
      legacyMagicalBonus !== 0 &&
      (
        category.toLowerCase() === "weapon" ||
        cleanString(raw.weaponType) ||
        cleanString(raw.damageDice)
      );

    return {
      ...cloneData(raw),

      id: makeSafeId(
        raw.id ||
        `${name}-${Date.now()}-${Math.random()}`,
        "inventory-item"
      ),

      name,

      category,

      quantity,

      weight: rawWeight,

      source:
        safeDisplayString(
          raw.source,
          fallbackSource
        ),

      notes:
        safeDisplayString(
          raw.notes
        ),

      equipped:
        raw.equipped === true &&
        !cleanString(raw.containerId) &&
        isContainer !== true,

      isMagical,

      requiresAttunement,

      attuned:
        requiresAttunement &&
        raw.attuned === true &&
        !cleanString(raw.containerId) &&
        isContainer !== true,

      magicalBonus:
        safeNumber(
          raw.magicalBonus,
          0
        ),

      armorCategory,

      baseArmorClass,

      dexterityCap,

      isShield,

      magicalArmorClassBonus:
        safeNumber(
          raw.magicalArmorClassBonus ??
          (
            legacyBonusLooksArmor
              ? legacyMagicalBonus
              : 0
          ),
          0
        ),

      weaponType:
        cleanString(raw.weaponType),

      attackAbility:
        cleanString(raw.attackAbility),

      finesse:
        raw.finesse === true,

      ranged:
        raw.ranged === true ||
        cleanString(raw.weaponType)
          .toLowerCase()
          .includes("ranged"),

      thrown:
        raw.thrown === true,

      proficient:
        raw.proficient === true,

      damageDice:
        cleanString(raw.damageDice),

      versatileDamageDice:
        cleanString(raw.versatileDamageDice),

      magicalAttackBonus:
        safeNumber(
          raw.magicalAttackBonus ??
          (
            legacyBonusLooksWeapon
              ? legacyMagicalBonus
              : 0
          ),
          0
        ),

      magicalDamageBonus:
        safeNumber(
          raw.magicalDamageBonus ??
          (
            legacyBonusLooksWeapon
              ? legacyMagicalBonus
              : 0
          ),
          0
        ),

      containerId:
        cleanString(raw.containerId),

      isContainer,

      capacityWeight,

      spellcastingFocusClassIds:
        getSpellcastingFocusClassIds(raw),

      ownerCharacterId:
        cleanString(raw.ownerCharacterId)
    };
  }

  function getSection15Inventory() {
    if (
      !Array.isArray(
        creatorState.draft
          .equipment
          .items
      )
    ) {
      creatorState.draft
        .equipment
        .items = [];
    }

    creatorState.draft
      .equipment
      .items =
        creatorState.draft
          .equipment
          .items
          .map((item) => {
            return normalizeSection15Item(
              item,
              item?.source || "custom"
            );
          });

    return creatorState.draft
      .equipment
      .items;
  }

  function getSection15Catalog() {
    const catalogMap =
      new Map();

    DEFAULT_EQUIPMENT_CATALOG
      .forEach((item) => {
        const normalized =
          normalizeSection15Item(
            item,
            "template"
          );

        catalogMap.set(
          normalized.id,
          normalized
        );
      });

    return Array.from(
      catalogMap.values()
    ).sort((a, b) => {
      const categoryCompare =
        a.category.localeCompare(
          b.category
        );

      if (categoryCompare !== 0) {
        return categoryCompare;
      }

      return a.name.localeCompare(
        b.name
      );
    });
  }

  function getSection15CatalogPage(
    options = {}
  ) {
    return createCatalogPage(
      getSection15Catalog(),
      {
        query: options.query,
        visibleLimit:
          options.visibleLimit ||
          CREATOR_CATALOG_BATCH_SIZE,
        getId: (item) => item.id,
        getSearchText: (item) => {
          return [
            item.name,
            item.category,
            item.notes
          ].join(" ");
        }
      }
    );
  }

  function addSection15CatalogItem(
    itemId
  ) {
    const item =
      getSection15Catalog()
        .find((entry) => {
          return entry.id === itemId;
        });

    if (!item) {
      return false;
    }

    const inventory =
      getSection15Inventory();

    const matchingItem =
      inventory.find((entry) => {
        return (
          entry.id === item.id ||
          (
            safeDisplayString(
              entry.name
            ).toLowerCase() ===
              item.name.toLowerCase() &&
            safeDisplayString(
              entry.category
            ).toLowerCase() ===
              item.category.toLowerCase()
          )
        );
      });

    if (matchingItem) {
      matchingItem.quantity =
        Math.max(
          1,
          Math.round(
            safeNumber(
              matchingItem.quantity,
              1
            )
          )
        ) +
        Math.max(
          1,
          Math.round(
            safeNumber(
              item.quantity,
              1
            )
          )
        );
    } else {
      inventory.push(
        normalizeSection15Item(
          item,
          "template"
        )
      );
    }

    markDraftChanged();

    return true;
  }

  function addSection15CustomItem() {
    const name =
      safeDisplayString(
        $("ccNewItemName")
          ?.value
      );

    if (!name) {
      alert(
        "Enter an item name."
      );

      return false;
    }

    const quantity =
      Math.max(
        1,
        Math.round(
          safeNumber(
            $("ccNewItemQuantity")
              ?.value,
            1
          )
        )
      );

    const weightText =
      $("ccNewItemWeight")
        ?.value;

    const weight =
      weightText === "" ||
      weightText === null ||
      weightText === undefined
        ? null
        : Math.max(
            0,
            safeNumber(
              weightText,
              0
            )
          );

    const capacityText =
      $("ccNewItemCapacityWeight")
        ?.value;

    const capacityWeight =
      capacityText === "" ||
      capacityText === null ||
      capacityText === undefined
        ? null
        : Math.max(
            0,
            safeNumber(
              capacityText,
              0
            )
          );

    const baseArmorClassText =
      $("ccNewItemBaseArmorClass")
        ?.value;

    const baseArmorClass =
      baseArmorClassText === "" ||
      baseArmorClassText === null ||
      baseArmorClassText === undefined
        ? null
        : Math.max(
            0,
            safeNumber(
              baseArmorClassText,
              10
            )
          );

    const dexterityCapText =
      $("ccNewItemDexterityCap")
        ?.value;

    const dexterityCap =
      dexterityCapText === "" ||
      dexterityCapText === null ||
      dexterityCapText === undefined
        ? null
        : safeNumber(
            dexterityCapText,
            2
          );

    const category =
      $("ccNewItemCategory")
        ?.value ||
      "miscellaneous";

    const isMagical =
      $("ccNewItemMagical")
        ?.checked === true ||
      category === "magic-item";

    const requiresAttunement =
      isMagical &&
      $("ccNewItemRequiresAttunement")
        ?.checked === true;
    const startsAttuned =
      requiresAttunement &&
      $("ccNewItemAttuned")
        ?.checked === true;
    const attunementLimit =
      getCharacterAttunementLimit(
        creatorState.draft
      );

    if (
      startsAttuned &&
      getSection15AttunedItemCount() >=
        attunementLimit
    ) {
      alert(
        `This character can attune to no more than ${attunementLimit} ` +
        `${attunementLimit === 1 ? "item" : "items"}.`
      );

      return false;
    }

    const item =
      normalizeSection15Item(
        {
          id: makeSafeId(
            `${name}-${Date.now()}-${Math.random()}`,
            "custom-item"
          ),

          name,

          category,

          quantity,
          weight,
          capacityWeight,

          armorCategory:
            $("ccNewItemArmorCategory")
              ?.value || "",

          baseArmorClass,

          dexterityCap,

          isShield:
            $("ccNewItemShield")
              ?.checked === true ||
            category === "shield",

          magicalArmorClassBonus:
            safeNumber(
              $("ccNewItemMagicalArmorBonus")
                ?.value,
              0
            ),

          weaponType:
            $("ccNewItemWeaponType")
              ?.value || "",

          attackAbility:
            $("ccNewItemAttackAbility")
              ?.value || "",

          finesse:
            $("ccNewItemFinesse")
              ?.checked === true,

          ranged:
            $("ccNewItemRanged")
              ?.checked === true,

          thrown:
            $("ccNewItemThrown")
              ?.checked === true,

          proficient:
            $("ccNewItemProficient")
              ?.checked === true,

          damageDice:
            $("ccNewItemDamageDice")
              ?.value || "",

          versatileDamageDice:
            $("ccNewItemVersatileDamageDice")
              ?.value || "",

          magicalAttackBonus:
            safeNumber(
              $("ccNewItemMagicalAttackBonus")
                ?.value,
              0
            ),

          magicalDamageBonus:
            safeNumber(
              $("ccNewItemMagicalDamageBonus")
                ?.value,
              0
            ),

          source: "custom",

          notes:
            safeDisplayString(
              $("ccNewItemNotes")
                ?.value
            ),

          equipped:
            $("ccNewItemEquipped")
              ?.checked === true,

          isMagical,

          requiresAttunement,

          attuned:
            startsAttuned
          ,

          isContainer:
            $("ccNewItemContainer")
              ?.checked === true
        },

        "custom"
      );

    getSection15Inventory()
      .push(item);

    markDraftChanged();

    return true;
  }

  function removeSection15Item(
    index,
    removalMode = ""
  ) {
    const inventory =
      getSection15Inventory();

    if (
      index < 0 ||
      index >= inventory.length
    ) {
      return false;
    }

    const item =
      inventory[index];

    if (item?.isContainer === true) {
      const contents =
        getContainerContents(
          inventory,
          item.id
        );

      if (contents.length) {
        const cleanChoice =
          cleanString(
            removalMode
          ).toLowerCase();

        if (!cleanChoice) {
          creatorState.pendingContainerRemovalId =
            item.id;

          return "pending";
        }

        if (cleanChoice === "cancel") {
          creatorState.pendingContainerRemovalId =
            "";

          return false;
        }

        if (cleanChoice === "delete") {
          creatorState.draft
            .equipment
            .items =
              removeContainerAndContents(
                inventory,
                item.id
              );

          creatorState.pendingContainerRemovalId =
            "";

          if (
            creatorState.openContainerId ===
            item.id
          ) {
            creatorState.openContainerId = "";
          }

          markDraftChanged();

          return true;
        }

        if (cleanChoice !== "inventory") {
          creatorState.pendingContainerRemovalId =
            item.id;

          return "pending";
        }
      }

      creatorState.draft
        .equipment
        .items =
          removeContainerPreserveContents(
            inventory,
            item.id
          );

      creatorState.pendingContainerRemovalId =
        "";

      if (
        creatorState.openContainerId ===
        item.id
      ) {
        creatorState.openContainerId = "";
      }
    } else {
      inventory.splice(
        index,
        1
      );
    }

    markDraftChanged();

    return true;
  }

  function parseSection15ItemEditValue(
    field,
    rawValue,
    valueType,
    checked = false
  ) {
    if (valueType === "boolean") {
      return checked === true;
    }

    if (valueType === "integer") {
      return Math.max(
        1,
        Math.round(
          safeNumber(
            rawValue,
            1
          )
        )
      );
    }

    if (valueType === "number") {
      const nullableFields =
        new Set([
          "weight",
          "baseArmorClass",
          "dexterityCap",
          "capacityWeight"
        ]);

      if (
        nullableFields.has(field) &&
        cleanString(rawValue) === ""
      ) {
        return null;
      }

      return safeNumber(
        rawValue,
        0
      );
    }

    return safeDisplayString(
      rawValue
    );
  }

  function updateSection15InventoryItem(
    index,
    field,
    rawValue,
    valueType = "string",
    checked = false
  ) {
    const inventory =
      getSection15Inventory();

    const item =
      inventory[index];

    if (!item) {
      return false;
    }

    const editableFields =
      new Set([
        "name",
        "category",
        "quantity",
        "weight",
        "notes",
        "equipped",
        "isMagical",
        "requiresAttunement",
        "attuned",
        "magicalBonus",
        "armorCategory",
        "baseArmorClass",
        "dexterityCap",
        "isShield",
        "magicalArmorClassBonus",
        "weaponType",
        "attackAbility",
        "finesse",
        "ranged",
        "thrown",
        "proficient",
        "damageDice",
        "versatileDamageDice",
        "magicalAttackBonus",
        "magicalDamageBonus",
        "isContainer",
        "capacityWeight"
      ]);

    if (!editableFields.has(field)) {
      return false;
    }

    const nextValue =
      parseSection15ItemEditValue(
        field,
        rawValue,
        valueType,
        checked
      );

    if (
      field === "attuned" &&
      nextValue === true &&
      item.attuned !== true &&
      getSection15AttunedItemCount() >=
        getCharacterAttunementLimit(
          creatorState.draft
        )
    ) {
      const limit =
        getCharacterAttunementLimit(
          creatorState.draft
        );

      alert(
        `This character can attune to no more than ${limit} ` +
        `${limit === 1 ? "item" : "items"}.`
      );

      return false;
    }

    if (
      field === "isContainer" &&
      item.isContainer === true &&
      nextValue !== true
    ) {
      inventory.forEach((candidate) => {
        if (
          cleanString(candidate.containerId) ===
          cleanString(item.id)
        ) {
          candidate.containerId = "";
        }
      });

      creatorState.pendingContainerRemovalId =
        "";
    }

    item[field] =
      nextValue;

    if (
      field === "attuned" &&
      nextValue === true
    ) {
      item.isMagical = true;
      item.requiresAttunement = true;
    }

    if (
      field === "requiresAttunement" &&
      nextValue === true
    ) {
      item.isMagical = true;
    }

    if (
      field === "isMagical" &&
      nextValue !== true
    ) {
      item.requiresAttunement = false;
      item.attuned = false;
    }

    if (
      field === "requiresAttunement" &&
      nextValue !== true
    ) {
      item.attuned = false;
    }

    if (
      field === "isShield" &&
      nextValue === true
    ) {
      item.category =
        item.category || "shield";

      item.armorCategory = "shield";
    }

    inventory[index] =
      normalizeSection15Item(
        item,
        item.source || "custom"
      );

    markDraftChanged();

    return true;
  }

  function changeSection15Quantity(
    index,
    amount
  ) {
    const inventory =
      getSection15Inventory();

    const item =
      inventory[index];

    if (!item) {
      return false;
    }

    const nextQuantity =
      Math.max(
        0,
        Math.round(
          safeNumber(
            item.quantity,
            1
          )
        ) +
        amount
      );

    if (nextQuantity <= 0) {
      inventory.splice(
        index,
        1
      );
    } else {
      item.quantity =
        nextQuantity;
    }

    markDraftChanged();

    return true;
  }

  function moveSection15ItemToContainer(
    index,
    targetContainerId,
    quantity = null
  ) {
    const inventory =
      getSection15Inventory();

    const item =
      inventory[index];

    if (!item) {
      return false;
    }

    const cleanTargetId =
      cleanString(targetContainerId);

    const currentQuantity =
      Math.max(
        1,
        Math.round(
          safeNumber(item.quantity, 1)
        )
      );

    const moveQuantity =
      quantity === null ||
      quantity === undefined ||
      quantity === ""
        ? currentQuantity
        : Math.max(
            1,
            Math.min(
              currentQuantity,
              Math.round(
                safeNumber(
                  quantity,
                  currentQuantity
                )
              )
            )
          );

    if (cleanTargetId) {
      const targetContainer =
        inventory.find((candidate) => {
          return (
            candidate.id === cleanTargetId &&
            candidate.isContainer === true
          );
        });

      if (!targetContainer) {
        return false;
      }

      if (
        wouldCreateContainerCycle(
          inventory,
          item.id,
          cleanTargetId
        )
      ) {
        alert(
          "That container move would create an invalid loop."
        );

        return false;
      }
    }

    const nextInventory =
      splitInventoryStack(
        inventory,
        item.id,
        moveQuantity,
        cleanTargetId
      );

    const targetSummary =
      cleanTargetId
        ? getContainerSummaries(
            nextInventory
          ).find((container) => {
            return (
              container.id ===
              cleanTargetId
            );
          })
        : null;

    if (
      targetSummary?.overCapacity
    ) {
      alert(
        "That move would exceed the container's known capacity."
      );

      return false;
    }

    creatorState.draft
      .equipment
      .items = nextInventory;

    markDraftChanged();

    return true;
  }

  function toggleSection15ItemState(
    index,
    property
  ) {
    const inventory =
      getSection15Inventory();

    const item =
      inventory[index];

    if (
      !item ||
      ![
        "equipped",
        "attuned"
      ].includes(property)
    ) {
      return false;
    }

    if (property === "attuned") {
      if (
        !item.isMagical ||
        !item.requiresAttunement
      ) {
        item.attuned = false;
        markDraftChanged();
        return false;
      }

      if (item.attuned === true) {
        item.attuned = false;
        markDraftChanged();
        return true;
      }

      const limit =
        getCharacterAttunementLimit(
          creatorState.draft
        );

      if (
        getSection15AttunedItemCount() >=
          limit
      ) {
        alert(
          `This character can attune to no more than ${limit} ` +
          `${limit === 1 ? "item" : "items"}.`
        );

        return false;
      }

      item.attuned = true;
      markDraftChanged();
      return true;
    }

    if (
      property === "equipped" &&
      item.equipped !== true
    ) {
      if (item.isContainer === true) {
        item.equipped = false;
        markDraftChanged();
        return false;
      }

      if (cleanString(item.containerId)) {
        alert(
          "Move the item out of its container before equipping it."
        );

        return false;
      }

      if (item.isShield === true) {
        const otherShield =
          getSection15Inventory()
            .some((candidate, candidateIndex) => {
              return (
                candidateIndex !== index &&
                candidate.equipped === true &&
                candidate.isShield === true &&
                !cleanString(
                  candidate.containerId
                )
              );
            });

        if (otherShield) {
          alert(
            "Only one shield can provide an armor class bonus."
          );

          return false;
        }
      }
    }

    item[property] =
      item[property] !== true;

    markDraftChanged();

    return true;
  }

  function getSection15TotalWeight() {
    return getSection15Inventory()
      .reduce((total, item) => {
        if (
          item.weight === null ||
          item.weight === undefined ||
          item.weight === ""
        ) {
          return total;
        }

        return (
          total +
          Math.max(
            0,
            safeNumber(
              item.weight,
              0
            )
          ) *
          Math.max(
            1,
            Math.round(
              safeNumber(
                item.quantity,
                1
              )
            )
          )
        );
      }, 0);
  }

  function getSection15InventoryCount() {
    return getSection15Inventory()
      .reduce((total, item) => {
        return (
          total +
          Math.max(
            1,
            Math.round(
              safeNumber(
                item.quantity,
                1
              )
            )
          )
        );
      }, 0);
  }

  function getSection15AttunedItemCount() {
    return countCharacterAttunedItems(
      creatorState.draft
    );
  }

  function getSection15UnknownWeightCount() {
    return getSection15Inventory()
      .filter((item) => {
        return (
          item.weight === null ||
          item.weight === undefined ||
          item.weight === ""
        );
      })
      .length;
  }

  function renderSection15Catalog(
    options = {}
  ) {
    const catalog = Array.isArray(
      options.entries
    )
      ? options.entries
      : getSection15CatalogPage(options)
          .entries;

    if (!catalog.length) {
      return `
        <div class="hg-character-placeholder">
          No equipment catalog items are available.
        </div>
      `;
    }

    return catalog
      .map((item) => {
        return wizardChoiceCard(
          item.name,

          `
            <p>
              <b>Category:</b>

              ${escapeHtml(
                item.category
              )}

              <br>

              <b>Default Quantity:</b>

              ${Math.max(
                1,
                Math.round(
                  safeNumber(
                    item.quantity,
                    1
                  )
                )
              )}

              <br>

              <b>Weight:</b>

              ${
                item.weight === null
                  ? "Not set"
                  : `${safeNumber(
                      item.weight,
                      0
                    )} lb. each`
              }
            </p>

            <p class="small">
              ${escapeHtml(
                item.notes ||
                "No notes."
              )}
            </p>
          `,

          "Add to Inventory",

          "add-catalog-item",

          {
            "item-id":
              item.id
          },

          false
        );
      })
      .join("");
  }

  function renderSection15ItemEditInput(
    item,
    index,
    label,
    field,
    options = {}
  ) {
    const id =
      `ccItemEdit-${index}-${field}`;

    const value =
      item[field] === null ||
      item[field] === undefined
        ? ""
        : item[field];

    return `
      <div
        class="hg-character-field${
          options.wide === true
            ? " hg-character-wide-field"
            : ""
        }"
      >
        <label for="${id}">
          ${escapeHtml(label)}
        </label>

        <input
          id="${id}"
          type="${escapeHtml(
            options.type || "text"
          )}"
          value="${escapeHtml(value)}"
          data-cc-action-change="update-inventory-item"
          data-index="${index}"
          data-item-field="${escapeHtml(field)}"
          data-value-type="${escapeHtml(
            options.valueType || "string"
          )}"
          ${options.extra || ""}
        >
      </div>
    `;
  }

  function renderSection15ItemEditTextarea(
    item,
    index,
    label,
    field
  ) {
    const id =
      `ccItemEdit-${index}-${field}`;

    return `
      <div class="hg-character-field hg-character-wide-field">
        <label for="${id}">
          ${escapeHtml(label)}
        </label>

        <textarea
          id="${id}"
          data-cc-action-change="update-inventory-item"
          data-index="${index}"
          data-item-field="${escapeHtml(field)}"
          data-value-type="string"
        >${escapeHtml(item[field] || "")}</textarea>
      </div>
    `;
  }

  function renderSection15ItemEditCheckbox(
    item,
    index,
    label,
    field
  ) {
    const id =
      `ccItemEdit-${index}-${field}`;

    return `
      <label class="hg-character-field">
        <input
          id="${id}"
          type="checkbox"
          data-cc-action-change="update-inventory-item"
          data-index="${index}"
          data-item-field="${escapeHtml(field)}"
          data-value-type="boolean"
          ${
            item[field] === true
              ? "checked"
              : ""
          }
        >

        ${escapeHtml(label)}
      </label>
    `;
  }

  function renderSection15ItemEditControls(
    item,
    index
  ) {
    return `
      <details>
        <summary>Edit Item Details</summary>

        <div class="hg-character-field-grid three">
          ${renderSection15ItemEditInput(
            item,
            index,
            "Name",
            "name"
          )}

          ${renderSection15ItemEditInput(
            item,
            index,
            "Category",
            "category"
          )}

          ${renderSection15ItemEditInput(
            item,
            index,
            "Quantity",
            "quantity",
            {
              type: "number",
              valueType: "integer",
              extra: 'min="1" step="1"'
            }
          )}

          ${renderSection15ItemEditInput(
            item,
            index,
            "Weight",
            "weight",
            {
              type: "number",
              valueType: "number",
              extra: 'min="0" step="0.01"'
            }
          )}

          ${renderSection15ItemEditInput(
            item,
            index,
            "Magic Bonus",
            "magicalBonus",
            {
              type: "number",
              valueType: "number",
              extra: 'step="1"'
            }
          )}

          ${renderSection15ItemEditInput(
            item,
            index,
            "Container Capacity",
            "capacityWeight",
            {
              type: "number",
              valueType: "number",
              extra: 'min="0" step="0.01"'
            }
          )}

          ${renderSection15ItemEditTextarea(
            item,
            index,
            "Notes",
            "notes"
          )}
        </div>

        <h4>Armor</h4>

        <div class="hg-character-field-grid three">
          ${renderSection15ItemEditInput(
            item,
            index,
            "Armor Type",
            "armorCategory"
          )}

          ${renderSection15ItemEditInput(
            item,
            index,
            "Base AC",
            "baseArmorClass",
            {
              type: "number",
              valueType: "number",
              extra: 'min="0" step="1"'
            }
          )}

          ${renderSection15ItemEditInput(
            item,
            index,
            "Dex Cap",
            "dexterityCap",
            {
              type: "number",
              valueType: "number",
              extra: 'step="1"'
            }
          )}

          ${renderSection15ItemEditInput(
            item,
            index,
            "AC Magic Bonus",
            "magicalArmorClassBonus",
            {
              type: "number",
              valueType: "number",
              extra: 'step="1"'
            }
          )}

          ${renderSection15ItemEditCheckbox(
            item,
            index,
            "Shield",
            "isShield"
          )}
        </div>

        <h4>Weapon</h4>

        <div class="hg-character-field-grid three">
          ${renderSection15ItemEditInput(
            item,
            index,
            "Weapon Type",
            "weaponType"
          )}

          ${renderSection15ItemEditInput(
            item,
            index,
            "Attack Ability",
            "attackAbility"
          )}

          ${renderSection15ItemEditInput(
            item,
            index,
            "Damage Dice",
            "damageDice"
          )}

          ${renderSection15ItemEditInput(
            item,
            index,
            "Versatile Dice",
            "versatileDamageDice"
          )}

          ${renderSection15ItemEditInput(
            item,
            index,
            "Attack Magic Bonus",
            "magicalAttackBonus",
            {
              type: "number",
              valueType: "number",
              extra: 'step="1"'
            }
          )}

          ${renderSection15ItemEditInput(
            item,
            index,
            "Damage Magic Bonus",
            "magicalDamageBonus",
            {
              type: "number",
              valueType: "number",
              extra: 'step="1"'
            }
          )}
        </div>

        <h4>Flags</h4>

        <div class="hg-character-field-grid three">
          ${renderSection15ItemEditCheckbox(
            item,
            index,
            "Magical",
            "isMagical"
          )}

          ${renderSection15ItemEditCheckbox(
            item,
            index,
            "Requires Attunement",
            "requiresAttunement"
          )}

          ${renderSection15ItemEditCheckbox(
            item,
            index,
            "Attuned",
            "attuned"
          )}

          ${renderSection15ItemEditCheckbox(
            item,
            index,
            "Container",
            "isContainer"
          )}

          ${renderSection15ItemEditCheckbox(
            item,
            index,
            "Finesse",
            "finesse"
          )}

          ${renderSection15ItemEditCheckbox(
            item,
            index,
            "Ranged",
            "ranged"
          )}

          ${renderSection15ItemEditCheckbox(
            item,
            index,
            "Thrown",
            "thrown"
          )}

          ${renderSection15ItemEditCheckbox(
            item,
            index,
            "Proficient",
            "proficient"
          )}
        </div>
      </details>
    `;
  }

  function renderSection15ContainerDestinationSelect(
    inventory,
    item,
    index,
    label = "Container"
  ) {
    const quantity =
      Math.max(
        1,
        Math.round(
          safeNumber(
            item.quantity,
            1
          )
        )
      );

    const containerOptions = [
      {
        id: "",
        name: "General inventory"
      },

      ...inventory
        .filter((candidate, candidateIndex) => {
          return (
            candidateIndex !== index &&
            candidate.isContainer === true &&
            !wouldCreateContainerCycle(
              inventory,
              item.id,
              candidate.id
            )
          );
        })
        .map((candidate) => {
          return {
            id: candidate.id,
            name:
              candidate.name ||
              "Container"
          };
        })
    ];

    return `
      <div class="hg-character-field">
        <label for="ccItemContainer-${index}">
          ${escapeHtml(label)}
        </label>

        <select
          id="ccItemContainer-${index}"
          data-cc-action-change="move-item-container"
          data-index="${index}"
        >
          ${containerOptions
            .map((container) => {
              return `
                <option
                  value="${escapeHtml(
                    container.id
                  )}"
                  ${
                    cleanString(
                      item.containerId
                    ) ===
                    cleanString(
                      container.id
                    )
                      ? "selected"
                      : ""
                  }
                >
                  ${escapeHtml(
                    container.name
                  )}
                </option>
              `;
            })
            .join("")}
        </select>
      </div>

      <div class="hg-character-field">
        <label for="ccItemMoveQuantity-${index}">
          Move Quantity
        </label>

        <input
          id="ccItemMoveQuantity-${index}"
          type="number"
          min="1"
          max="${quantity}"
          step="1"
          value="${quantity}"
        >
      </div>
    `;
  }

  function renderSection15OpenContainerPanel() {
    const inventory =
      getSection15Inventory();

    const openContainerId =
      cleanString(
        creatorState.openContainerId
      );

    if (!openContainerId) {
      return "";
    }

    const container =
      inventory.find((item) => {
        return (
          item.id === openContainerId &&
          item.isContainer === true
        );
      });

    if (!container) {
      creatorState.openContainerId = "";
      return "";
    }

    const summary =
      getContainerSummaries(inventory)
        .find((entry) => {
          return entry.id === openContainerId;
        }) || {
          contents: [],
          capacityWeight: null,
          knownWeight: 0,
          unknownCount: 0,
          overCapacity: false
        };

    const directContents =
      getContainerContents(
        inventory,
        openContainerId
      );

    const contentCards =
      directContents.length
        ? directContents
            .map((item) => {
              const index =
                inventory.findIndex((candidate) => {
                  return candidate.id === item.id;
                });

              return `
                <article class="hg-character-choice-card">
                  <h3>
                    ${escapeHtml(
                      item.name ||
                      "Unnamed Item"
                    )}
                  </h3>

                  <p>
                    <b>Quantity:</b>
                    ${Math.max(
                      1,
                      Math.round(
                        safeNumber(
                          item.quantity,
                          1
                        )
                      )
                    )}
                    <br>
                    <b>Weight:</b>
                    ${
                      item.weight === null ||
                      item.weight === undefined
                        ? "Unknown"
                        : `${safeNumber(
                            item.weight,
                            0
                          )} lb. each`
                    }
                  </p>

                  ${renderSection15ContainerDestinationSelect(
                    inventory,
                    item,
                    index,
                    "Move"
                  )}

                  <div class="hg-character-card-actions">
                    <button
                      type="button"
                      data-cc-action="move-item-out-container"
                      data-index="${index}"
                    >
                      Move Out
                    </button>

                    <button
                      type="button"
                      data-cc-action="remove-inventory-item"
                      data-index="${index}"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              `;
            })
            .join("")
        : `
          <div class="hg-character-placeholder">
            This container is empty.
          </div>
        `;

    return `
      <section class="hg-character-current-choice">
        <h3>
          Open Container:
          ${escapeHtml(
            container.name ||
            "Container"
          )}
        </h3>

        <p>
          <b>Direct contents:</b>
          ${directContents.length}
          <br>
          <b>Used capacity:</b>
          ${Number(
            summary.knownWeight.toFixed(2)
          )} lb.
          /
          ${
            summary.capacityWeight === null
              ? "No max"
              : `${Number(
                  summary.capacityWeight.toFixed(2)
                )} lb.`
          }
          <br>
          <b>Unknown weights:</b>
          ${summary.unknownCount}
        </p>

        ${
          summary.overCapacity
            ? `
              <div class="hg-character-warning">
                This container is over capacity.
              </div>
            `
            : ""
        }

        <div class="hg-character-inline-actions">
          <button
            type="button"
            data-cc-action="close-container"
          >
            Close
          </button>
        </div>

        <div class="hg-character-choice-grid">
          ${contentCards}
        </div>
      </section>
    `;
  }

  function renderSection15Inventory() {
    const inventory =
      getSection15Inventory();

    const visibleInventory =
      inventory.filter((item) => {
        return (
          creatorState.showContainedItems === true ||
          !cleanString(item.containerId)
        );
      });

    if (!visibleInventory.length) {
      return `
        <div class="hg-character-placeholder">
          Your inventory is empty. Add an item from the
          catalog or create custom gear below.
        </div>
      `;
    }

    return visibleInventory
      .map((item) => {
        const index =
          inventory.findIndex((candidate) => {
            return candidate.id === item.id;
          });

        const quantity =
          Math.max(
            1,
            Math.round(
              safeNumber(
                item.quantity,
                1
              )
            )
          );

        const totalWeight =
          item.weight === null ||
          item.weight === undefined
            ? null
            : (
                Math.max(
                  0,
                  safeNumber(
                    item.weight,
                    0
                  )
                ) *
                quantity
              );

        const isContainerOpen =
          item.isContainer === true &&
          cleanString(
            creatorState.openContainerId
          ) === cleanString(item.id);

        const weaponAttack =
          item.equipped === true &&
          (
            item.category === "weapon" ||
            item.weaponType ||
            item.damageDice
          )
            ? calculateWeaponAttack(
                creatorState.draft,
                item
              )
            : null;

        const pendingRemoval =
          cleanString(
            creatorState
              .pendingContainerRemovalId
          ) ===
          cleanString(item.id);

        return `
          <article
            class="
              hg-character-choice-card
              ${
                item.equipped
                  ? "selected"
                  : ""
              }
            "
          >
            <h3>
              ${escapeHtml(
                item.name ||
                "Unnamed Item"
              )}
            </h3>

            <p>
              <b>Category:</b>

              ${escapeHtml(
                item.category ||
                "miscellaneous"
              )}

              <br>

              <b>Quantity:</b>

              ${quantity}

              <br>

              <b>Weight:</b>

              ${
                item.weight === null ||
                item.weight === undefined
                  ? "Not set"
                  : `${safeNumber(
                      item.weight,
                      0
                    )} lb. each`
              }

              ${
                totalWeight === null
                  ? ""
                  : `
                    <br>

                    <b>Total Weight:</b>

                    ${Number(
                      totalWeight.toFixed(
                        2
                      )
                    )} lb.
                  `
              }

              <br>

              <b>State:</b>

              ${
                item.isContainer
                  ? isContainerOpen
                    ? "Open"
                    : "Closed"
                  : item.equipped
                    ? "Equipped"
                    : "Stored"
              }

              ${
                item.attuned
                  ? " · Attuned"
                  : ""
              }
            </p>

            ${
              item.notes
                ? `
                  <p class="small">
                    ${escapeHtml(
                      item.notes
                    )}
                  </p>
                `
                : ""
            }

            ${
              item.isMagical ||
              item.requiresAttunement ||
              item.isContainer ||
              item.magicalBonus
                ? `
                  <p class="small">
                    ${
                      item.isMagical
                        ? "Magical"
                        : "Mundane"
                    }${
                      item.requiresAttunement
                        ? " - requires attunement"
                        : ""
                    }${
                      item.magicalBonus
                        ? ` - bonus +${safeNumber(
                            item.magicalBonus,
                            0
                          )}`
                        : ""
                    }${
                      item.isContainer
                        ? ` - capacity ${
                            item.capacityWeight === null
                              ? "not set"
                              : `${safeNumber(
                                  item.capacityWeight,
                                  0
                                )} lb.`
                          }`
                        : ""
                    }
                  </p>
                `
                : ""
            }

            ${
              item.baseArmorClass ||
              item.isShield ||
              item.armorCategory
                ? `
                  <p class="small">
                    <b>Armor:</b>
                    ${
                      item.isShield
                        ? "Shield"
                        : escapeHtml(
                            item.armorCategory ||
                            "Armor"
                          )
                    }${
                      item.baseArmorClass
                        ? ` - base AC ${safeNumber(
                            item.baseArmorClass,
                            10
                          )}`
                        : ""
                    }${
                      item.magicalArmorClassBonus
                        ? ` - AC bonus ${formatSignedNumber(
                            item.magicalArmorClassBonus
                          )}`
                        : ""
                    }
                  </p>
                `
                : ""
            }

            ${
              weaponAttack
                ? `
                  <p class="small">
                    <b>Attack:</b>
                    ${formatSection17Modifier(
                      weaponAttack.attackBonus
                    )}
                    <br>
                    <b>Damage:</b>
                    ${escapeHtml(
                      weaponAttack.damageDice ||
                      "damage"
                    )}
                    ${formatSection17Modifier(
                      weaponAttack.damageModifier
                    )}
                    <br>
                    <b>Attacks per Attack action:</b>
                    ${safeNumber(
                      weaponAttack.attacksPerAction,
                      1
                    )}
                    ${
                      weaponAttack.versatileDamageDice
                        ? `
                          <br>
                          <b>Versatile:</b>
                          ${escapeHtml(
                            weaponAttack.versatileDamageDice
                          )}
                          ${formatSection17Modifier(
                            weaponAttack.damageModifier
                          )}
                        `
                        : ""
                    }
                    ${
                      weaponAttack.martialArtsEligible
                        ? `
                          <br>
                          <b>Martial Arts:</b>
                          Eligible${
                            weaponAttack.martialArtsApplied
                              ? `; using ${escapeHtml(weaponAttack.damageDice)}`
                              : ""
                          }
                        `
                        : weaponAttack.martialArtsRestriction
                          ? `<br><b>Martial Arts:</b> ${escapeHtml(weaponAttack.martialArtsRestriction)}`
                          : ""
                    }
                    ${
                      weaponAttack.sneakAttackEligible
                        ? `<br><b>Sneak Attack:</b> Weapon eligible for ${escapeHtml(weaponAttack.sneakAttackDice)}; advantage or the adjacent-ally condition is still required.`
                        : weaponAttack.sneakAttackRestriction
                          ? `<br><b>Sneak Attack:</b> ${escapeHtml(weaponAttack.sneakAttackRestriction)}`
                          : ""
                    }
                    ${
                      weaponAttack.rageDamageBonus
                        ? `<br><b>Rage:</b> ${formatSignedNumber(weaponAttack.rageDamageBonus)} damage applied.`
                        : weaponAttack.rageRestriction
                          ? `<br><b>Rage:</b> ${escapeHtml(weaponAttack.rageRestriction)}`
                          : ""
                    }
                  </p>
                `
                : ""
            }

            ${renderSection15ContainerDestinationSelect(
              inventory,
              item,
              index,
              "Container"
            )}

            ${
              pendingRemoval
                ? `
                  <div class="hg-character-warning">
                    This container has contents. Move those contents to
                    general inventory, delete the contents too, or cancel.

                    <div class="hg-character-inline-actions">
                      <button
                        type="button"
                        data-cc-action="resolve-container-removal"
                        data-container-id="${escapeHtml(
                          item.id
                        )}"
                        data-removal-mode="inventory"
                      >
                        Move Contents Out
                      </button>

                      <button
                        type="button"
                        data-cc-action="resolve-container-removal"
                        data-container-id="${escapeHtml(
                          item.id
                        )}"
                        data-removal-mode="delete"
                      >
                        Delete Contents
                      </button>

                      <button
                        type="button"
                        data-cc-action="resolve-container-removal"
                        data-container-id="${escapeHtml(
                          item.id
                        )}"
                        data-removal-mode="cancel"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                `
                : ""
            }

            ${renderSection15ItemEditControls(
              item,
              index
            )}

            <div class="hg-character-card-actions">
              <div
                class="hg-character-quantity-control"
                aria-label="Quantity controls for ${escapeHtml(
                  item.name || "item"
                )}"
              >
                <button
                  type="button"
                  data-cc-action="decrease-item-quantity"
                  data-index="${index}"
                  aria-label="Decrease quantity"
                >
                  -
                </button>

                <span aria-label="Quantity">
                  ${quantity}
                </span>

                <button
                  type="button"
                  data-cc-action="increase-item-quantity"
                  data-index="${index}"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                class="hg-character-hidden-quantity-button"
                data-cc-action="decrease-item-quantity"
                data-index="${index}"
              >
                − Quantity
              </button>

              <button
                type="button"
                class="hg-character-hidden-quantity-button"
                data-cc-action="increase-item-quantity"
                data-index="${index}"
              >
                + Quantity
              </button>

              <button
                type="button"
                data-cc-action="toggle-item-equipped"
                data-index="${index}"
                ${
                  item.isContainer
                    ? 'style="display:none" aria-hidden="true" disabled'
                    : ""
                }
              >
                ${
                  item.equipped
                    ? "Unequip"
                    : "Equip"
                }
              </button>

              ${
                item.isContainer
                  ? `
                    <button
                      type="button"
                      data-cc-action="open-container"
                      data-index="${index}"
                    >
                      ${
                        isContainerOpen
                          ? "Close"
                          : "Open"
                      }
                    </button>
                  `
                  : ""
              }

              <button
                type="button"
                data-cc-action="toggle-item-attuned"
                data-index="${index}"
                ${
                  item.isMagical &&
                  item.requiresAttunement
                    ? ""
                    : 'style="display:none" aria-hidden="true" disabled'
                }
              >
                ${
                  item.attuned
                    ? "Remove Attunement"
                    : "Attune"
                }
              </button>

              <button
                type="button"
                data-cc-action="remove-inventory-item"
                data-index="${index}"
              >
                Remove
              </button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  const equipmentStep = createEquipmentStep({
    ABILITY_DEFINITIONS,
    addSection15CatalogItem,
    addSection15CustomItem,
    beginnerNote,
    calculateCharacterCarryingCapacity,
    changeSection15Quantity,
    cleanString,
    escapeHtml,
    getCharacterAttunementLimit,
    getCreatorState: () => creatorState,
    getSection15AttunedItemCount,
    getSection15Inventory,
    getSection15InventoryCount,
    getSection15CatalogPage,
    getSection15TotalWeight,
    getSection15UnknownWeightCount,
    markDraftChanged,
    moveSection15ItemToContainer,
    removeSection15Item,
    renderCreatorView: renderCurrentStep,
    renderSection15Catalog,
    renderSection15Inventory,
    renderSection15OpenContainerPanel,
    safeDisplayString,
    safeNumber,
    setStatus,
    toggleSection15ItemState,
    updateSection15InventoryItem,
    wizardField,
    wizardSelect
  });

  const {
    renderEquipmentStep,
    findSection15ActionElement,
    getSection15ActionIndex,
    handleSection15AddCatalogItem,
    handleSection15AddCustomItem,
    handleSection15SkipEquipment,
    handleSection15ToggleContainedItems,
    handleSection15OpenContainer,
    handleSection15CloseContainer,
    handleSection15MoveItemOut,
    handleSection15ChangeQuantity,
    handleSection15RemoveItem,
    handleSection15ResolveContainerRemoval,
    handleSection15ToggleState,
    handleSection15Change
  } = equipmentStep.compatibility;

  registerCharacterStepRenderer(
    "equipment",
    equipmentStep.renderStep
  );

  equipmentStep.actions.forEach((action) => {
    registerCharacterCreatorAction(
      action,
      (context) => {
        return equipmentStep.handleStepClick(
          context
        );
      }
    );
  });

  registerCharacterCreatorInputHandler(
    equipmentStep.handleStepInput
  );

  registerCharacterCreatorChangeHandler(
    equipmentStep.handleStepChange
  );

// =====================================================
// CHARACTER CREATOR SECTION 16 — SPELLS / FEATURES
// =====================================================

  function normalizeSection16Spell(
    rawSpell,
    fallbackSource = "custom"
  ) {
    const raw = rawSpell || {};

    const name =
      safeDisplayString(
        raw.name,
        "Unnamed Spell"
      );

    const level = Math.max(
      0,
      Math.min(
        9,
        Math.round(
          safeNumber(
            raw.level,
            0
          )
        )
      )
    );

    return {
      ...cloneData(raw),

      id: makeSafeId(
        raw.id ||
        `${name}-${level}-${Date.now()}-${Math.random()}`,
        "custom-spell"
      ),

      name,
      level,

      school:
        safeDisplayString(
          raw.school,
          "Unknown"
        ),

      castingTime:
        safeDisplayString(
          raw.castingTime,
          "1 action"
        ),

      range:
        safeDisplayString(
          raw.range,
          "Self"
        ),

      duration:
        safeDisplayString(
          raw.duration,
          "Instantaneous"
        ),

      components:
        safeDisplayString(
          raw.components
        ),

      description:
        safeDisplayString(
          raw.description ||
          raw.summary
        ),

      summary:
        safeDisplayString(
          raw.summary ||
          raw.description
        ),

      classId:
        cleanString(
          raw.classId
        ),

      classEntryId:
        cleanString(
          raw.classEntryId ||
          raw.entryId
        ),

      spellcastingSourceId:
        cleanString(
          raw.classEntryId ||
          raw.spellcastingSourceId ||
          raw.classId
        ),

      classes: cleanArray(
        raw.classes ||
        (
          raw.classId
            ? [raw.classId]
            : []
        )
      ),

      source:
        safeDisplayString(
          raw.source,
          fallbackSource
        ),

      innate:
        raw.innate === true,

      innateSource:
        cleanString(
          raw.innateSource
        ),

      minimumLevel:
        Math.max(
          1,
          Math.round(
            safeNumber(
              raw.minimumLevel,
              1
            )
          )
        ),

      spellcastingAbility:
        cleanString(
          raw.spellcastingAbility
        ),

      ritual:
        raw.ritual === true,

      concentration:
        raw.concentration === true,

      manualOverride:
        raw.manualOverride === true
    };
  }

  function getSection16CustomSpells() {
    if (
      !Array.isArray(
        creatorState.draft
          .magic
          .customSpells
      )
    ) {
      creatorState.draft
        .magic
        .customSpells = [];
    }

    return creatorState.draft
      .magic
      .customSpells;
  }

  function getSection16InnateSpells(
    character = creatorState.draft
  ) {
    const magic =
      character?.magic || {};

    return (
      Array.isArray(magic.innateSpells)
        ? magic.innateSpells
        : []
    ).map((spell) => {
      return normalizeSection16Spell(
        spell,
        spell?.source || "innate"
      );
    });
  }

  function getSection16KnownSpellIds() {
    if (
      !Array.isArray(
        creatorState.draft
          .magic
          .knownSpellIds
      )
    ) {
      creatorState.draft
        .magic
        .knownSpellIds = [];
    }

    return creatorState.draft
      .magic
      .knownSpellIds;
  }

  function getSection16PreparedSpellIds() {
    if (
      !Array.isArray(
        creatorState.draft
          .magic
          .preparedSpellIds
      )
    ) {
      creatorState.draft
        .magic
        .preparedSpellIds = [];
    }

    return creatorState.draft
      .magic
      .preparedSpellIds;
  }

  function getSection16SpellById(
    spellId,
    character = creatorState.draft
  ) {
    const inlineSubclassReference =
      getSpellcastingClassOptions(
        character
      )
        .flatMap((entry) => {
          return Object.values(
            entry?.expandedSpells || {}
          ).flat();
        })
        .find((spellReference) => {
          return (
            spellReference &&
            typeof spellReference ===
              "object" &&
            spellReference
              .inlineFallback === true &&
            getSection16SpellReferenceId(
              spellReference
            ) === spellId
          );
        });

    return (
      DEFAULT_SPELLS.find((spell) => {
        return spell.id === spellId;
      }) ||
      (
        Array.isArray(
          character?.magic?.customSpells
        )
          ? character.magic.customSpells
          : []
      ).find((spell) => {
        return spell.id === spellId;
      }) ||
      (
        inlineSubclassReference
          ? {
              id: spellId,
              name: cleanString(
                inlineSubclassReference
                  .name,
                spellId
              ),
              level: Math.max(
                0,
                safeNumber(
                  inlineSubclassReference
                    .level,
                  0
                )
              ),
              school: cleanString(
                inlineSubclassReference
                  .school,
                "subclass"
              ),
              classes: [],
              subclasses: [],
              sourceType:
                "legacy-non-srd",
              sourceLabel:
                "Legacy 5e subclass spell reference",
              rulesEdition: "2014",
              inlineSubclassSpell: true
            }
          : null
      ) ||
      null
    );
  }

  function getSection16ClassSourceStore(
    character = creatorState.draft
  ) {
    if (!character.magic) {
      character.magic = {};
    }

    if (
      !character.magic.classSources ||
      typeof character.magic.classSources !== "object" ||
      Array.isArray(character.magic.classSources)
    ) {
      character.magic.classSources = {};
    }

    return character.magic.classSources;
  }

  function getSection16SourceKey(entry) {
    return cleanString(
      entry?.classEntryId ||
      entry?.entryId ||
      entry?.classId
    );
  }

  const SECTION16_SPELL_REFERENCE_ALIASES =
    Object.freeze({
      "melfs-acid-arrow": "acid-arrow",
      "melf-s-acid-arrow": "acid-arrow",
      "leomunds-secret-chest": "secret-chest",
      "mordenkainens-faithful-hound": "faithful-hound",
      "mordenkainens-private-sanctum": "private-sanctum",
      "otilukes-resilient-sphere": "resilient-sphere",
      "bigbys-hand": "arcane-hand"
    });

  function getSection16SpellReferenceId(
    spellReference
  ) {
    const rawId = makeSafeId(
      spellReference?.id ||
      spellReference?.name ||
      spellReference,
      ""
    );

    return SECTION16_SPELL_REFERENCE_ALIASES[
      rawId
    ] || rawId;
  }

  function getSection16ExpandedSpellGrants(
    entry
  ) {
    const expandedSpells =
      entry?.expandedSpells &&
      typeof entry.expandedSpells === "object" &&
      !Array.isArray(entry.expandedSpells)
        ? entry.expandedSpells
        : {};
    const classLevel = Math.max(
      0,
      safeNumber(entry?.level, 0)
    );

    return Object.entries(expandedSpells)
      .filter(([unlockLevel]) => {
        return (
          safeNumber(unlockLevel, 0) <=
          classLevel
        );
      })
      .flatMap(([unlockLevel, spells]) => {
        return (
          Array.isArray(spells)
            ? spells
            : []
        ).map((spellReference) => {
          const spellId =
            getSection16SpellReferenceId(
              spellReference
            );
          const spell =
            getSection16SpellById(spellId);

          return {
            spellId,
            spell,
            name: cleanString(
              spellReference?.name ||
              spell?.name ||
              spellId
            ),
            unlockLevel:
              safeNumber(unlockLevel, 0),
            alwaysPrepared:
              spellReference?.alwaysPrepared ===
              true,
            countsAgainstPreparedLimit:
              spellReference
                ?.countsAgainstPreparedLimit !==
              false
          };
        });
      })
      .filter((grant) => {
        return Boolean(grant.spellId);
      });
  }

  function getSection16ExpandedSpellGrant(
    entry,
    spell
  ) {
    return getSection16ExpandedSpellGrants(
      entry
    ).find((grant) => {
      return grant.spellId === spell?.id;
    }) || null;
  }

  function getSection16MysticArcanumLevels(
    entry
  ) {
    if (
      cleanString(entry?.classId) !==
      "warlock"
    ) {
      return [];
    }

    const level = safeNumber(
      entry?.level,
      0
    );

    return [
      [11, 6],
      [13, 7],
      [15, 8],
      [17, 9]
    ]
      .filter(([unlockLevel]) => {
        return level >= unlockLevel;
      })
      .map(([, spellLevel]) => {
        return spellLevel;
      });
  }

  function isSection16MysticArcanumSpell(
    entry,
    spell
  ) {
    return (
      getSection16MysticArcanumLevels(
        entry
      ).includes(
        safeNumber(spell?.level, 0)
      ) &&
      cleanArray(spell?.classes)
        .includes("warlock")
    );
  }

  function getSection16SourceState(
    entry,
    options = {}
  ) {
    const sourceKey =
      getSection16SourceKey(entry);

    if (!sourceKey) {
      return null;
    }

    const store =
      getSection16ClassSourceStore(
        options.character ||
        creatorState.draft
      );

    if (!store[sourceKey]) {
      if (options.create === false) {
        return null;
      }

      store[sourceKey] = {
        classEntryId: sourceKey,
        classId: cleanString(entry?.classId),
        className: cleanString(entry?.className),
        subclassId: cleanString(entry?.subclassId),
        subclassName: cleanString(entry?.subclassName),
        spellListClassId: cleanString(
          entry?.spellListClassId ||
          entry?.classId
        ),
        spellcastingAbility: cleanString(
          entry?.spellcastingAbility
        ),
        spellSaveDc:
          entry?.spellSaveDc ?? null,
        spellAttackBonus:
          entry?.spellAttackBonus ?? null,
        preparationMode:
          getSection16PreparationMode(entry),
        cantripIds: [],
        knownSpellIds: [],
        preparedSpellIds: [],
        spellbookSpellIds: [],
        alwaysPreparedSpellIds: [],
        mysticArcanumSpellIds: {}
      };
    }

    const source = store[sourceKey];
    source.classEntryId = sourceKey;
    source.classId = cleanString(
      entry?.classId || source.classId
    );
    source.className = cleanString(
      entry?.className || source.className
    );
    source.subclassId = cleanString(
      entry?.subclassId || source.subclassId
    );
    source.subclassName = cleanString(
      entry?.subclassName ||
      source.subclassName
    );
    source.spellListClassId = cleanString(
      entry?.spellListClassId ||
      source.spellListClassId ||
      source.classId
    );
    source.spellcastingAbility = cleanString(
      entry?.spellcastingAbility ||
      source.spellcastingAbility
    );
    source.spellSaveDc =
      entry?.spellSaveDc ??
      source.spellSaveDc ??
      null;
    source.spellAttackBonus =
      entry?.spellAttackBonus ??
      source.spellAttackBonus ??
      null;
    source.preparationMode =
      getSection16PreparationMode(entry);

    [
      "cantripIds",
      "knownSpellIds",
      "preparedSpellIds",
      "spellbookSpellIds",
      "alwaysPreparedSpellIds"
    ].forEach((field) => {
      source[field] = cleanArray(
        source[field]
      );
    });

    source.alwaysPreparedSpellIds = [
      ...new Set(
        getSection16ExpandedSpellGrants(
          entry
        )
          .filter((grant) => {
            return (
              grant.alwaysPrepared &&
              Boolean(grant.spell)
            );
          })
          .map((grant) => grant.spellId)
      )
    ];

    if (
      !source.mysticArcanumSpellIds ||
      typeof source.mysticArcanumSpellIds !==
        "object" ||
      Array.isArray(
        source.mysticArcanumSpellIds
      )
    ) {
      source.mysticArcanumSpellIds = {};
    }

    source.mysticArcanumSpellIds =
      Object.fromEntries(
        Object.entries(
          source.mysticArcanumSpellIds
        )
          .map(([level, spellId]) => {
            return [
              cleanString(level),
              cleanString(spellId)
            ];
          })
          .filter(([level, spellId]) => {
            return (
              getSection16MysticArcanumLevels(
                entry
              ).includes(
                safeNumber(level, 0)
              ) &&
              Boolean(spellId)
            );
          })
      );

    return source;
  }

  function getSection16PreparationMode(entry) {
    const mode = cleanString(
      entry?.spellPreparation,
      "known"
    );

    return [
      "known",
      "prepared",
      "spellbook-prepared"
    ].includes(mode)
      ? mode
      : "known";
  }

  function syncSection16ClassSourceMetadata(
    character = creatorState.draft
  ) {
    const entries =
      getSpellcastingClassOptions(
        character
      );

    entries.forEach((entry) => {
      getSection16SourceState(
        entry,
        { character }
      );
    });

    if (
      character === creatorState.draft &&
      character.magic
        ?.spellSourceModelVersion === 2
    ) {
      syncSection16LegacySpellAliases();
    }

    return entries;
  }

  function calculateSection16EligibleSpellcasters(
    spell,
    options = {}
  ) {
    const spellcasters =
      getSpellcastingClassOptions(
        options.character ||
        creatorState.draft
      );
    const spellLevel = Math.max(
      0,
      safeNumber(spell?.level, 0)
    );
    const spellClasses = cleanArray(
      spell?.classes
    );
    const sourceHint = getSpellSourceId(
      spell
    );

    return spellcasters.filter((entry) => {
      const sourceKey =
        getSection16SourceKey(entry);
      const classId = cleanString(
        entry.classId
      );
      const spellListClassId = cleanString(
        entry.spellListClassId ||
        classId
      );
      const expandedGrant =
        getSection16ExpandedSpellGrant(
          entry,
          spell
        );
      const mysticArcanum =
        isSection16MysticArcanumSpell(
          entry,
          spell
        );

      if (
        sourceHint &&
        sourceHint !== sourceKey &&
        sourceHint !== classId
      ) {
        return false;
      }

      if (
        spellClasses.length > 0 &&
        !spellClasses.includes(classId) &&
        !spellClasses.includes(
          spellListClassId
        ) &&
        !expandedGrant &&
        spell?.manualOverride !== true
      ) {
        return false;
      }

      if (
        options.enforceLevel !== false &&
        spellLevel === 0 &&
        safeNumber(entry.cantripsKnown, 0) < 1 &&
        spell?.manualOverride !== true
      ) {
        return false;
      }

      if (
        options.enforceLevel !== false &&
        spellLevel > 0 &&
        spellLevel >
          safeNumber(entry.maxSpellLevel, 0) &&
        !mysticArcanum &&
        spell?.manualOverride !== true
      ) {
        return false;
      }

      return true;
    });
  }

  function getSection16EligibleSpellcasters(
    spell,
    options = {}
  ) {
    const character =
      options.character ||
      creatorState.draft;
    const spellcasters =
      getSpellcastingClassOptions(
        character
      );
    const dependencyKey = createDerivedSignature({
      spell: {
        id: spell?.id,
        level: spell?.level,
        classes: spell?.classes,
        classEntryId:
          spell?.classEntryId,
        spellcastingSourceId:
          spell?.spellcastingSourceId,
        classId: spell?.classId,
        manualOverride:
          spell?.manualOverride
      },
      enforceLevel:
        options.enforceLevel !== false,
      spellcasters
    });

    return derivedCache.get(
      "spell-eligibility",
      dependencyKey,
      () => calculateSection16EligibleSpellcasters(
        spell,
        options
      )
    );
  }

  function getSection16EntryForSource(
    spell,
    sourceId = ""
  ) {
    const spellcasters =
      getSpellcastingClassOptions(
        creatorState.draft
      );
    const requestedSourceId = cleanString(
      sourceId || getSpellSourceId(spell)
    );

    if (requestedSourceId) {
      return spellcasters.find((entry) => {
        return (
          getSection16SourceKey(entry) ===
            requestedSourceId ||
          cleanString(entry.classId) ===
            requestedSourceId
        );
      }) || null;
    }

    const eligible =
      getSection16EligibleSpellcasters(
        spell
      );

    return eligible.length === 1
      ? eligible[0]
      : null;
  }

  function syncSection16LegacySpellAliases() {
    const store =
      getSection16ClassSourceStore();
    const activeSourceKeys = new Set(
      getSpellcastingClassOptions(
        creatorState.draft
      )
        .map((entry) => {
          return getSection16SourceKey(entry);
        })
        .filter(Boolean)
    );
    const sources = Object.values(store)
      .filter((source) => {
        return activeSourceKeys.has(
          cleanString(source?.classEntryId)
        );
      });

    creatorState.draft.magic.knownSpellIds = [
      ...new Set(
        [
          ...cleanArray(
            creatorState.draft.magic
              .unassignedKnownSpellIds
          ),
          ...sources.flatMap((source) => {
            return [
              ...cleanArray(source.cantripIds),
              ...cleanArray(source.knownSpellIds),
              ...cleanArray(source.spellbookSpellIds),
              ...Object.values(
                source.mysticArcanumSpellIds ||
                {}
              )
                .map((spellId) => {
                  return cleanString(spellId);
                })
                .filter(Boolean)
            ];
          })
        ]
      )
    ];

    creatorState.draft.magic.preparedSpellIds = [
      ...new Set(
        [
          ...cleanArray(
            creatorState.draft.magic
              .unassignedPreparedSpellIds
          ),
          ...sources.flatMap((source) => {
            return [
              ...cleanArray(
                source.preparedSpellIds
              ),
              ...cleanArray(
                source.alwaysPreparedSpellIds
              )
            ];
          })
        ]
      )
    ];
  }

  function migrateSection16LegacySpellSelections() {
    const magic = creatorState.draft.magic;

    if (magic.spellSourceModelVersion === 2) {
      return false;
    }

    const previousModelVersion =
      safeNumber(
        magic.spellSourceModelVersion,
        0
      );

    syncSection16ClassSourceMetadata();

    Object.values(
      getSection16ClassSourceStore()
    ).forEach((source) => {
      const legacySourceKnown = cleanArray(
        source.knownSpellIds
      );
      const migratedCantrips =
        legacySourceKnown.filter((spellId) => {
          return safeNumber(
            getSection16SpellById(spellId)
              ?.level,
            -1
          ) === 0;
        });

      source.cantripIds = [
        ...new Set([
          ...cleanArray(source.cantripIds),
          ...migratedCantrips
        ])
      ];
      source.knownSpellIds =
        legacySourceKnown.filter((spellId) => {
          return !migratedCantrips.includes(
            spellId
          );
        });
    });

    const legacyKnown = cleanArray(
      magic.knownSpellIds
    );
    const legacyPrepared = cleanArray(
      magic.preparedSpellIds
    );
    const unassignedKnown = new Set(
      legacyKnown
    );
    const unassignedPrepared = new Set(
      legacyPrepared
    );

    [
      ...new Set([
        ...legacyKnown,
        ...legacyPrepared
      ])
    ].forEach((spellId) => {
      const spell =
        getSection16SpellById(spellId);

      if (!spell) {
        return;
      }

      const eligible =
        getSection16EligibleSpellcasters(
          spell
        );
      const hintedEntry =
        getSection16EntryForSource(
          spell,
          getSpellSourceId(spell)
        );
      const entry = hintedEntry ||
        (
          eligible.length === 1
            ? eligible[0]
            : null
        );

      if (!entry) {
        return;
      }

      const source =
        getSection16SourceState(entry);
      const mode =
        getSection16PreparationMode(entry);
      const level = safeNumber(
        spell.level,
        0
      );

      if (legacyKnown.includes(spellId)) {
        const field =
          level === 0
            ? "cantripIds"
            : mode === "spellbook-prepared"
              ? "spellbookSpellIds"
              : "knownSpellIds";

        if (!source[field].includes(spellId)) {
          source[field].push(spellId);
        }

        unassignedKnown.delete(spellId);
      }

      if (
        legacyPrepared.includes(spellId) &&
        !source.preparedSpellIds.includes(
          spellId
        )
      ) {
        source.preparedSpellIds.push(
          spellId
        );
      }

      if (legacyPrepared.includes(spellId)) {
        unassignedPrepared.delete(spellId);
      }
    });

    magic.unassignedKnownSpellIds = [
      ...unassignedKnown
    ];
    magic.unassignedPreparedSpellIds = [
      ...unassignedPrepared
    ];
    magic.spellSourceModelVersion = 2;

    if (
      Object.keys(
        getSection16ClassSourceStore()
      ).length > 0
    ) {
      syncSection16LegacySpellAliases();
    }

    return previousModelVersion !== 2 ||
      legacyKnown.length > 0 ||
      legacyPrepared.length > 0;
  }

  function isSection16SpellKnown(
    spellId,
    sourceId = ""
  ) {
    migrateSection16LegacySpellSelections();
    syncSection16ClassSourceMetadata();

    if (sourceId) {
      const spell =
        getSection16SpellById(spellId);
      const entry =
        getSection16EntryForSource(
          spell,
          sourceId
        );
      const source = entry
        ? getSection16SourceState(
            entry,
            { create: false }
          )
        : null;

      return Boolean(
        source &&
        (
          source.cantripIds.includes(
            spellId
          ) ||
          source.knownSpellIds.includes(
            spellId
          ) ||
          source.spellbookSpellIds.includes(
            spellId
          ) ||
          Object.values(
            source.mysticArcanumSpellIds ||
            {}
          ).includes(
            spellId
          )
        )
      );
    }

    return getSection16KnownSpellIds()
      .includes(spellId);
  }

  function isSection16SpellPrepared(
    spellId,
    sourceId = ""
  ) {
    migrateSection16LegacySpellSelections();

    if (sourceId) {
      const spell =
        getSection16SpellById(spellId);
      const entry =
        getSection16EntryForSource(
          spell,
          sourceId
        );
      const source = entry
        ? getSection16SourceState(
            entry,
            { create: false }
          )
        : null;

      return Boolean(
        source &&
        (
          source.preparedSpellIds
            .includes(spellId) ||
          source.alwaysPreparedSpellIds
            .includes(spellId)
        )
      );
    }

    return getSection16PreparedSpellIds()
      .includes(spellId);
  }

  function getSection16KnownLimitWarning(
    spell,
    sourceId = ""
  ) {
    const entry =
      getSection16EntryForSource(
        spell,
        sourceId
      );

    if (!entry) {
      return "Choose an eligible class source for that spell.";
    }

    if (
      !getSection16EligibleSpellcasters(
        spell
      ).some((candidate) => {
        return (
          getSection16SourceKey(candidate) ===
          getSection16SourceKey(entry)
        );
      })
    ) {
      return `${spell?.name || "That spell"} is not available to ${entry.className || "that class"} at its current level.`;
    }

    const source =
      getSection16SourceState(entry);
    const spellLevel = safeNumber(
      spell?.level,
      0
    );

    if (
      spellLevel === 0 &&
      safeNumber(entry.cantripsKnown, 0) > 0 &&
      source.cantripIds.length >=
        safeNumber(entry.cantripsKnown, 0)
    ) {
      return `${entry.className}'s known cantrips are already at the calculated limit.`;
    }

    if (
      spellLevel > 0 &&
      getSection16PreparationMode(entry) ===
        "known" &&
      safeNumber(entry.spellsKnown, 0) > 0 &&
      source.knownSpellIds.filter((id) => {
        return !cleanArray(source.magicalSecretSpellIds).includes(id) &&
          safeNumber(getSection16SpellById(id)?.level, 0) > 0;
      }).length >=
        safeNumber(entry.spellsKnown, 0)
    ) {
      return `${entry.className}'s known spells are already at the calculated limit.`;
    }

    const schoolRestrictions =
      entry.spellSchoolRestrictions;
    const allowedSchools = cleanArray(
      schoolRestrictions?.default
    );
    const spellSchool = cleanString(
      spell?.school
    ).toLowerCase();

    if (
      spellLevel > 0 &&
      allowedSchools.length > 0 &&
      spellSchool &&
      !allowedSchools.includes(spellSchool)
    ) {
      const unrestrictedLimit = cleanArray(
        schoolRestrictions
          ?.unrestrictedSpellLevelsAtClassLevels
      ).filter((unlockLevel) => {
        return (
          safeNumber(unlockLevel, 0) <=
          safeNumber(entry.level, 0)
        );
      }).length;
      const unrestrictedSelected =
        source.knownSpellIds.filter((spellId) => {
          const selectedSpell =
            getSection16SpellById(spellId);

          return (
            safeNumber(
              selectedSpell?.level,
              0
            ) > 0 &&
            !allowedSchools.includes(
              cleanString(
                selectedSpell?.school
              ).toLowerCase()
            )
          );
        }).length;

      if (
        unrestrictedSelected >=
        unrestrictedLimit
      ) {
        return `${entry.subclassName || entry.className} has no unrestricted spell choice remaining; choose ${allowedSchools.join(" or ")} magic.`;
      }
    }

    return "";
  }

  function getSection16PreparedLimitWarning(
    spell = null,
    sourceId = ""
  ) {
    const entry =
      getSection16EntryForSource(
        spell,
        sourceId
      );

    if (!entry) {
      return "Choose an eligible class source for that spell.";
    }

    if (
      !getSection16EligibleSpellcasters(
        spell
      ).some((candidate) => {
        return (
          getSection16SourceKey(candidate) ===
          getSection16SourceKey(entry)
        );
      })
    ) {
      return `${spell?.name || "That spell"} is not available to ${entry.className || "that class"} at its current level.`;
    }

    const mode =
      getSection16PreparationMode(entry);

    if (mode === "known") {
      return `${entry.className} learns spells instead of preparing them.`;
    }

    const source =
      getSection16SourceState(entry);

    if (
      mode === "spellbook-prepared" &&
      safeNumber(spell?.level, 0) > 0 &&
      !source.spellbookSpellIds.includes(
        spell?.id
      )
    ) {
      return "Add that spell to the spellbook before preparing it.";
    }

    if (
      entry.preparedLimit !== null &&
      source.preparedSpellIds.length >=
        safeNumber(entry.preparedLimit, 0)
    ) {
      return `${entry.className}'s prepared spells are already at the calculated limit.`;
    }

    return "";
  }

  function toggleSection16SpellKnown(
    spellId,
    sourceId = ""
  ) {
    const spell =
      getSection16SpellById(spellId);

    if (!spell) {
      return false;
    }

    migrateSection16LegacySpellSelections();

    const entry =
      getSection16EntryForSource(
        spell,
        sourceId
      );
    const warning = entry
      ? ""
      : getSection16KnownLimitWarning(
          spell,
          sourceId
        );

    if (warning) {
      alert(warning);
      return false;
    }

    const source =
      getSection16SourceState(entry);

    creatorState.draft.magic
      .unassignedKnownSpellIds = cleanArray(
        creatorState.draft.magic
          .unassignedKnownSpellIds
      ).filter((id) => id !== spellId);

    const mode =
      getSection16PreparationMode(entry);
    const field =
      safeNumber(spell.level, 0) === 0
        ? "cantripIds"
        : mode === "spellbook-prepared"
          ? "spellbookSpellIds"
          : "knownSpellIds";
    const index = source[field].indexOf(
      spellId
    );

    if (index >= 0) {
      source[field].splice(index, 1);
      const preparedIndex =
        source.preparedSpellIds.indexOf(
          spellId
        );

      if (preparedIndex >= 0) {
        source.preparedSpellIds.splice(
          preparedIndex,
          1
        );
      }
    } else {
      const limitWarning =
        getSection16KnownLimitWarning(
          spell,
          getSection16SourceKey(entry)
        );

      if (limitWarning) {
        alert(limitWarning);
        return false;
      }

      source[field].push(spellId);
    }

    syncSection16LegacySpellAliases();
    markDraftChanged();

    return true;
  }

  function toggleSection16SpellPrepared(
    spellId,
    sourceId = ""
  ) {
    const spell =
      getSection16SpellById(spellId);

    if (!spell) {
      return false;
    }

    migrateSection16LegacySpellSelections();

    const entry =
      getSection16EntryForSource(
        spell,
        sourceId
      );
    const source = entry
      ? getSection16SourceState(entry)
      : null;

    if (!entry || !source) {
      alert(
        "Choose an eligible class source for that spell."
      );
      return false;
    }

    if (
      source.alwaysPreparedSpellIds
        .includes(spellId)
    ) {
      alert(
        `${spell.name} is always prepared by ${entry.subclassName || entry.className}.`
      );
      return false;
    }

    creatorState.draft.magic
      .unassignedPreparedSpellIds = cleanArray(
        creatorState.draft.magic
          .unassignedPreparedSpellIds
      ).filter((id) => id !== spellId);

    const preparedIndex =
      source.preparedSpellIds.indexOf(
        spellId
      );

    if (preparedIndex >= 0) {
      source.preparedSpellIds.splice(
        preparedIndex,
        1
      );
    } else {
      const warning =
        getSection16PreparedLimitWarning(
          spell,
          getSection16SourceKey(entry)
        );

      if (warning) {
        alert(warning);
        return false;
      }

      source.preparedSpellIds.push(
        spellId
      );
    }

    syncSection16LegacySpellAliases();
    markDraftChanged();

    return true;
  }

  function toggleSection16MysticArcanum(
    spellId,
    sourceId = ""
  ) {
    const spell =
      getSection16SpellById(spellId);

    if (!spell) {
      return false;
    }

    migrateSection16LegacySpellSelections();

    const entry =
      getSection16EntryForSource(
        spell,
        sourceId
      );

    if (
      !entry ||
      !isSection16MysticArcanumSpell(
        entry,
        spell
      )
    ) {
      alert(
        "That spell is not an available Mystic Arcanum for this Warlock level."
      );
      return false;
    }

    const source =
      getSection16SourceState(entry);
    const levelKey = String(
      safeNumber(spell.level, 0)
    );

    if (
      source.mysticArcanumSpellIds[
        levelKey
      ] === spellId
    ) {
      delete source.mysticArcanumSpellIds[
        levelKey
      ];
    } else {
      source.mysticArcanumSpellIds[
        levelKey
      ] = spellId;
    }

    syncSection16LegacySpellAliases();
    markDraftChanged();

    return true;
  }

  function addSection16CustomSpell() {
    const name =
      safeDisplayString(
        $("ccNewSpellName")
          ?.value
      );

    if (!name) {
      alert(
        "Enter a spell name."
      );

      return false;
    }

    const spellcastingOptions =
      getSpellcastingClassOptions(
        creatorState.draft
      );

    const selectedSourceId =
      cleanString(
        $("ccNewSpellClassId")
          ?.value
      ) ||
      (
        spellcastingOptions.length === 1
          ? cleanString(
              spellcastingOptions[0]
                .classEntryId ||
              spellcastingOptions[0]
                .classId
            )
          : ""
      );

    if (
      spellcastingOptions.length > 1 &&
      !selectedSourceId
    ) {
      alert(
        "Choose which class this spell belongs to."
      );

      return false;
    }

    const selectedEntry =
      spellcastingOptions.find((entry) => {
        return (
          getSection16SourceKey(entry) ===
            selectedSourceId ||
          cleanString(entry.classId) ===
            selectedSourceId
        );
      }) || null;

    const spell =
      normalizeSection16Spell(
        {
          id: makeSafeId(
            `${name}-${Date.now()}-${Math.random()}`,
            "custom-spell"
          ),

          name,

          level:
            $("ccNewSpellLevel")
              ?.value,

          school:
            $("ccNewSpellSchool")
              ?.value,

          castingTime:
            $("ccNewSpellCastingTime")
              ?.value,

          range:
            $("ccNewSpellRange")
              ?.value,

          duration:
            $("ccNewSpellDuration")
              ?.value,

          components:
            $("ccNewSpellComponents")
              ?.value,

          description:
            $("ccNewSpellDescription")
              ?.value,

          classId:
            cleanString(
              selectedEntry?.classId
            ),

          classEntryId:
            cleanString(
              selectedEntry?.classEntryId
            ),

          spellcastingSourceId:
            cleanString(
              selectedEntry?.classEntryId ||
              selectedEntry?.classId
            ),

          classes:
            selectedEntry?.classId
              ? [selectedEntry.classId]
              : [],

          source: "custom",

          ritual:
            $("ccNewSpellRitual")
              ?.checked === true,

          concentration:
            $("ccNewSpellConcentration")
              ?.checked === true,

          manualOverride:
            $("ccNewSpellManualOverride")
              ?.checked === true
        },

        "custom"
      );

    const startKnown =
      $("ccNewSpellKnown")
        ?.checked === true;

    const startPrepared =
      $("ccNewSpellPrepared")
        ?.checked === true;

    if (
      startKnown ||
      startPrepared
    ) {
      const warning =
        getSection16KnownLimitWarning(
          spell,
          selectedSourceId
        );

      if (warning) {
        alert(warning);
        return false;
      }
    }

    if (startPrepared) {
      const preparedWarning =
        getSection16PreparedLimitWarning(
          spell,
          selectedSourceId
        );

      const willAddToSpellbook =
        startKnown &&
        getSection16PreparationMode(
          selectedEntry
        ) === "spellbook-prepared";

      if (
        preparedWarning &&
        !(
          willAddToSpellbook &&
          preparedWarning ===
            "Add that spell to the spellbook before preparing it."
        )
      ) {
        alert(preparedWarning);
        return false;
      }
    }

    getSection16CustomSpells()
      .push(spell);

    if (startKnown) {
      toggleSection16SpellKnown(
        spell.id,
        selectedSourceId
      );
    }

    if (startPrepared) {
      toggleSection16SpellPrepared(
        spell.id,
        selectedSourceId
      );
    }

    markDraftChanged();

    return true;
  }

  function removeSection16CustomSpell(
    spellId
  ) {
    const spells =
      getSection16CustomSpells();

    const index =
      spells.findIndex((spell) => {
        return spell.id === spellId;
      });

    if (index < 0) {
      return false;
    }

    spells.splice(
      index,
      1
    );

    creatorState.draft
      .magic
      .knownSpellIds =
        getSection16KnownSpellIds()
          .filter((id) => {
            return id !== spellId;
          });

    creatorState.draft
      .magic
      .preparedSpellIds =
        getSection16PreparedSpellIds()
          .filter((id) => {
            return id !== spellId;
          });

    creatorState.draft.magic
      .unassignedKnownSpellIds = cleanArray(
        creatorState.draft.magic
          .unassignedKnownSpellIds
      ).filter((id) => id !== spellId);

    creatorState.draft.magic
      .unassignedPreparedSpellIds = cleanArray(
        creatorState.draft.magic
          .unassignedPreparedSpellIds
      ).filter((id) => id !== spellId);

    Object.values(
      getSection16ClassSourceStore()
    ).forEach((source) => {
      [
        "cantripIds",
        "knownSpellIds",
        "preparedSpellIds",
        "spellbookSpellIds",
        "alwaysPreparedSpellIds"
      ].forEach((field) => {
        source[field] = cleanArray(
          source[field]
        ).filter((id) => {
          return id !== spellId;
        });
      });

      Object.keys(
        source.mysticArcanumSpellIds ||
        {}
      ).forEach((level) => {
        if (
          source.mysticArcanumSpellIds[
            level
          ] === spellId
        ) {
          delete source.mysticArcanumSpellIds[
            level
          ];
        }
      });
    });

    syncSection16LegacySpellAliases();

    markDraftChanged();

    return true;
  }

  function calculateSection16SpellcastingValues(
    options = {}
  ) {
    const selectedClass =
      getSelectedClassTemplate();

    const classAbilityId =
      selectedClass?.source !== "custom"
        ? cleanString(
            selectedClass?.spellcastingAbility
          )
        : "";

    let abilityId =
      creatorState.draft
        .magic
        .spellcastingAbility;

    if (classAbilityId) {
      abilityId = classAbilityId;

      creatorState.draft
        .magic
        .spellcastingAbility =
          classAbilityId;
    }

    const validAbility =
      ABILITY_DEFINITIONS.some(
        (ability) => {
          return (
            ability.id ===
            abilityId
          );
        }
      );

    if (!validAbility) {
      creatorState.draft
        .magic
        .spellSaveDc = null;

      creatorState.draft
        .magic
        .spellAttackBonus = null;

      if (options.markDraft !== false) {
        markDraftChanged();
      }

      return false;
    }

    const score =
      safeNumber(
        creatorState.draft
          .abilities
          .scores[abilityId],
        10
      );

    const abilityModifier =
      calculateAbilityModifier(
        score
      );

    const proficiencyBonus =
      getCharacterProficiencyBonus(
        creatorState.draft
      );

    creatorState.draft
      .magic
      .spellSaveDc =
        calculateRuleSpellSaveDc({
          proficiencyBonus,
          abilityModifier
        });

    creatorState.draft
      .magic
      .spellAttackBonus =
        calculateRuleSpellAttackBonus({
          proficiencyBonus,
          abilityModifier
        });

    if (options.markDraft !== false) {
      markDraftChanged();
    }

    return true;
  }

  function normalizeSection16Feature(
    rawFeature,
    fallbackSource = "custom"
  ) {
    const raw = rawFeature || {};

    const name =
      safeDisplayString(
        raw.name,
        "Unnamed Feature"
      );

    return {
      ...cloneData(raw),

      id: makeSafeId(
        raw.id ||
        `${name}-${Date.now()}-${Math.random()}`,
        "custom-feature"
      ),

      name,

      summary:
        safeDisplayString(
          raw.summary ||
          raw.description
        ),

      source:
        safeDisplayString(
          raw.source,
          fallbackSource
        ),

      uses:
        safeDisplayString(
          raw.uses
        ),

      recharge:
        safeDisplayString(
          raw.recharge
        )
    };
  }

  function getSection16CustomFeatures() {
    if (
      !Array.isArray(
        creatorState.draft
          .features
          .customFeatures
      )
    ) {
      creatorState.draft
        .features
        .customFeatures = [];
    }

    return creatorState.draft
      .features
      .customFeatures;
  }

  function addSection16CustomFeature() {
    const name =
      safeDisplayString(
        $("ccNewFeatureName")
          ?.value
      );

    if (!name) {
      alert(
        "Enter a feature name."
      );

      return false;
    }

    const feature =
      normalizeSection16Feature(
        {
          id: makeSafeId(
            `${name}-${Date.now()}-${Math.random()}`,
            "custom-feature"
          ),

          name,

          source:
            safeDisplayString(
              $("ccNewFeatureSource")
                ?.value,
              "custom"
            ),

          uses:
            $("ccNewFeatureUses")
              ?.value,

          recharge:
            $("ccNewFeatureRecharge")
              ?.value,

          summary:
            $("ccNewFeatureSummary")
              ?.value
        },

        "custom"
      );

    getSection16CustomFeatures()
      .push(feature);

    markDraftChanged();

    return true;
  }

  function removeSection16CustomFeature(
    index
  ) {
    const features =
      getSection16CustomFeatures();

    if (
      index < 0 ||
      index >= features.length
    ) {
      return false;
    }

    features.splice(
      index,
      1
    );

    markDraftChanged();

    return true;
  }

  function renderSection16SpellSlots() {
    return Array.from(
      { length: 9 },
      (_, index) => {
        const level =
          index + 1;

        const slotValue =
          safeNumber(
            creatorState.draft
              .magic
              .slots[level],
            0
          );

        return wizardField(
          `Level ${level} Slots`,
          `ccSpellSlots-${level}`,
          slotValue,
          {
            type: "number",

            path:
              `magic.slots.${level}`,

            valueType: "integer",

            extra:
              'min="0" step="1"'
          }
        );
      }
    ).join("");
  }

  function formatDefaultSpellLevelLabel(
    spell
  ) {
    const level = safeNumber(
      spell?.level,
      0
    );

    return level === 0
      ? "Cantrip"
      : `Level ${level}`;
  }

  function formatSection16SpellComponents(
    spell
  ) {
    const components = spell?.components;

    if (typeof components === "string") {
      return components;
    }

    if (
      !components ||
      typeof components !== "object"
    ) {
      return "";
    }

    const parts = [];
    if (components.verbal) parts.push("V");
    if (components.somatic) parts.push("S");
    if (components.material) parts.push("M");

    const materialText = cleanString(
      components.materialText
    );

    return `${parts.join(", ")}${
      materialText
        ? ` (${materialText})`
        : ""
    }`;
  }

  function formatSection16SpellResolution(
    spell
  ) {
    const parts = [];
    const attackType = cleanString(
      spell?.attackType
    );
    const saveAbility = cleanString(
      spell?.saveAbility
    );
    const damageTypes = uniqueCleanArray(
      (
        Array.isArray(spell?.damage)
          ? spell.damage
          : []
      ).map((entry) => {
        return entry?.damageType;
      })
    );

    if (attackType) {
      const attackLabel = {
        melee: "Melee spell attack",
        ranged: "Ranged spell attack",
        "melee-weapon":
          "Melee weapon attack",
        "ranged-weapon":
          "Ranged weapon attack"
      }[attackType] || attackType;

      parts.push(attackLabel);
    }

    if (saveAbility) {
      parts.push(
        `${saveAbility.toUpperCase()} saving throw`
      );
    }

    if (damageTypes.length) {
      parts.push(
        `${damageTypes.join("/")} damage`
      );
    }

    if (
      Array.isArray(spell?.healing) &&
      spell.healing.length
    ) {
      parts.push("healing");
    }

    return parts.join(" · ");
  }

  function formatSection16SpellScaling(
    spell
  ) {
    const characterScaling =
      Object.entries(
        spell?.scaling
          ?.atCharacterLevel ||
        {}
      );
    const slotScaling =
      Object.entries(
        spell?.scaling
          ?.atSlotLevel ||
        {}
      );
    const healingScaling =
      Object.entries(
        spell?.scaling
          ?.healingAtSlotLevel ||
        {}
      );
    const parts = [];

    if (characterScaling.length) {
      parts.push(
        `character level ${characterScaling
          .map(([level, value]) => {
            return `${level}: ${value}`;
          })
          .join(", ")}`
      );
    }

    if (slotScaling.length) {
      parts.push(
        `slot level ${slotScaling
          .map(([level, value]) => {
            return `${level}: ${value}`;
          })
          .join(", ")}`
      );
    }

    if (healingScaling.length) {
      parts.push(
        `healing by slot ${healingScaling
          .map(([level, value]) => {
            return `${level}: ${value}`;
          })
          .join(", ")}`
      );
    }

    return parts.join(" · ");
  }

  function renderSection16MagicalSecrets() {
    return renderMagicalSecretsPanels(getSection12ClassFeaturesThroughLevel(), {
      classOptions: getSpellcastingClassOptions(creatorState.draft), getChoiceKey: getSection12FeatureChoiceKey, getChoiceCount: getSection12FeatureChooseCount,
      getSelections: getSection12FeatureStoredChoices, getOptions: getSection12FeatureChoiceOptionRecords, getSourceKey: getSection16SourceKey, getSpellById: getSection16SpellById
    });
  }

  function getSection16SelectedDefaultSpellIds() {
    const selectedIds = new Set();
    getSpellcastingClassOptions(creatorState.draft).forEach((entry) => {
      const source = getSection16SourceState(entry, { create: false });
      ["cantripIds", "knownSpellIds", "preparedSpellIds", "spellbookSpellIds", "alwaysPreparedSpellIds", "magicalSecretSpellIds"].forEach((key) => {
        cleanArray(source?.[key]).forEach((spellId) => selectedIds.add(spellId));
      });
      Object.values(source?.mysticArcanumSpellIds || {}).forEach((spellId) => {
        if (spellId) selectedIds.add(spellId);
      });
    });
    return selectedIds;
  }
  function renderSection16DefaultSpellViewer(
    pickerState = section16SpellPickerState,
    selectedSpellSourceIds =
      section16SelectedSpellSourceIds
  ) {
    migrateSection16LegacySpellSelections();

    const spells = [
      ...DEFAULT_SPELLS
    ].sort((a, b) => {
      const levelCompare =
        safeNumber(a.level, 0) -
        safeNumber(b.level, 0);

      if (levelCompare !== 0) {
        return levelCompare;
      }

      return String(
        a.name || ""
      ).localeCompare(
        String(b.name || "")
      );
    });

    if (!spells.length) {
      return `
        <div class="hg-character-placeholder">
          No default spell records are currently listed.
        </div>
      `;
    }

    const selectedSpellIds = getSection16SelectedDefaultSpellIds();

    return `
      <div
        class="hg-character-field"
        data-cc-default-spell-viewer="true"
        data-cc-spell-picker-managed="true"
      >
        <label for="ccDefaultSpellSearch">
          Search Default Spells
        </label>

        <input
          id="ccDefaultSpellSearch"
          type="search"
          value="${escapeHtml(pickerState.query)}"
          placeholder="Search name, level, school, class, casting time, damage, or source..."
          data-cc-action-input="filter-default-spells"
          autocomplete="off"
        >

        <label class="hg-ui-check">
          <input type="checkbox" data-hg-selected-spells-only ${pickerState.selectedOnly ? "checked" : ""}>
          Show selected only
        </label>

        <div data-cc-default-spell-results="true">
          ${renderCreatorSpellPickerResults({
            spells,
            state: pickerState,
            isSelected: (spell) => selectedSpellIds.has(spell.id),
            renderCard: (spell) => {
            const levelLabel =
              formatDefaultSpellLevelLabel(
                spell
              );

            const sourceCandidates =
              getSection16EligibleSpellcasters(
                spell,
                { enforceLevel: false }
              );

            const eligibleSources =
              getSection16EligibleSpellcasters(
                spell
              );

            const preferredSourceId =
              selectedSpellSourceIds
                .get(spell.id) || "";

            const selectedSource =
              sourceCandidates.find((entry) => {
                return (
                  getSection16SourceKey(entry) ===
                  preferredSourceId
                );
              }) ||
              sourceCandidates.find((entry) => {
                const source =
                  getSection16SourceState(
                    entry,
                    { create: false }
                  );

                return Boolean(
                  source &&
                  (
                    source.cantripIds
                      .includes(spell.id) ||
                    source.knownSpellIds
                      .includes(spell.id) ||
                    source.preparedSpellIds
                      .includes(spell.id) ||
                    source.spellbookSpellIds
                      .includes(spell.id) ||
                    source.alwaysPreparedSpellIds
                      .includes(spell.id) ||
                    Object.values(
                      source.mysticArcanumSpellIds ||
                      {}
                    ).includes(spell.id)
                  )
                );
              }) ||
              eligibleSources[0] ||
              sourceCandidates[0] ||
              null;

            const sourceId =
              getSection16SourceKey(
                selectedSource
              );

            const sourceState = selectedSource
              ? getSection16SourceState(
                  selectedSource,
                  { create: false }
                )
              : null;

            const expandedGrant = selectedSource
              ? getSection16ExpandedSpellGrant(
                  selectedSource,
                  spell
                )
              : null;

            const alwaysPrepared = Boolean(
              sourceState
                ?.alwaysPreparedSpellIds
                ?.includes(spell.id)
            );

            const isMysticArcanum = Boolean(
              selectedSource &&
              isSection16MysticArcanumSpell(
                selectedSource,
                spell
              )
            );

            const mysticArcanumSelected = Boolean(
              isMysticArcanum &&
              sourceState
                ?.mysticArcanumSpellIds?.[
                  String(
                    safeNumber(spell.level, 0)
                  )
                ] === spell.id
            );

            const known = sourceId
              ? isSection16SpellKnown(
                  spell.id,
                  sourceId
                )
              : false;

            const prepared = sourceId
              ? isSection16SpellPrepared(
                  spell.id,
                  sourceId
                )
              : false;

            const mode = selectedSource
              ? getSection16PreparationMode(
                  selectedSource
                )
              : "known";

            const isCantrip =
              safeNumber(spell.level, 0) === 0;

            const showKnownAction =
              Boolean(selectedSource) &&
              !alwaysPrepared &&
              !isMysticArcanum &&
              (
                isCantrip ||
                mode !== "prepared"
              );

            const showPreparedAction =
              Boolean(selectedSource) &&
              !alwaysPrepared &&
              !isMysticArcanum &&
              !isCantrip &&
              mode !== "known";

            const knownActionLabel =
              mode === "spellbook-prepared" &&
              !isCantrip
                ? known
                  ? "Remove from Spellbook"
                  : "Add to Spellbook"
                : known
                  ? "Forget"
                  : "Learn";

            const statusLabel = alwaysPrepared
              ? "Always prepared"
              : mysticArcanumSelected
                ? `Mystic Arcanum (level ${safeNumber(
                    spell.level,
                    0
                  )})`
                : prepared
                  ? "Prepared"
                  : known
                    ? mode === "spellbook-prepared" &&
                      !isCantrip
                        ? "In spellbook"
                        : "Known"
                    : "Not selected";

            const sourceCurrentlyEligible =
              Boolean(
                selectedSource &&
                eligibleSources.some((entry) => {
                  return (
                    getSection16SourceKey(entry) ===
                    sourceId
                  );
                })
              );

            const components =
              formatSection16SpellComponents(
                spell
              );
            const resolution =
              formatSection16SpellResolution(
                spell
              );
            const scaling =
              formatSection16SpellScaling(
                spell
              );

            const searchText =
              getCreatorSpellSearchText(spell);

            return `
              <article
                class="hg-character-choice-card ${
                   prepared || known ||
                   alwaysPrepared ||
                   mysticArcanumSelected
                    ? "selected"
                    : ""
                }"
                data-cc-default-spell-option="true"
                data-spell-id="${escapeHtml(spell.id)}"
                data-spell-level="${safeNumber(spell.level, 0)}"
                data-spell-search-text="${escapeHtml(
                  searchText
                )}"
              >
                <h3>
                  ${escapeHtml(
                    spell.name ||
                    "Unnamed Spell"
                  )}
                </h3>

                <p>
                  <b>${escapeHtml(
                    levelLabel
                  )}</b>

                  ${
                    spell.school
                      ? `Â· ${escapeHtml(
                          spell.school
                        )}`
                      : ""
                  }

                  <br>

                  ${escapeHtml(
                    spell.summary ||
                    "No summary provided."
                  )}

                  <br><br>

                  ${renderRulesetMetadata(spell, "spell")}
                </p>

                <button type="button" data-cc-action="toggle-default-spell-details" data-spell-id="${escapeHtml(spell.id)}">
                  ${pickerState.expandedSpellIds.has(spell.id) ? "Hide" : "Show"} Spell Details
                </button>

                ${pickerState.expandedSpellIds.has(spell.id) ? `<p class="small">
                  <b>Casting Time:</b>
                  ${escapeHtml(
                    spell.castingTime ||
                    "Not specified"
                  )}

                  <br>

                  <b>Range:</b>
                  ${escapeHtml(
                    spell.range ||
                    "Not specified"
                  )}

                  <br>

                  <b>Components:</b>
                  ${escapeHtml(
                    components || "None"
                  )}

                  <br>

                  <b>Duration:</b>
                  ${escapeHtml(
                    spell.duration ||
                    "Not specified"
                  )}

                  ${
                    resolution
                      ? `
                        <br>
                        <b>Resolution:</b>
                        ${escapeHtml(
                          resolution
                        )}
                      `
                      : ""
                  }

                  ${
                    scaling
                      ? `
                        <br>
                        <b>Scaling:</b>
                        ${escapeHtml(
                          scaling
                        )}
                      `
                      : ""
                  }

                  ${
                    spell.ritual
                      ? "<br><b>Ritual</b>"
                      : ""
                  }

                  ${
                    spell.concentration
                      ? "<br><b>Concentration</b>"
                      : ""
                  }

                  <br><br>

                  ${escapeHtml(
                    spell.description ||
                    "No description provided."
                  )}

                  ${
                    spell.higherLevelDescription
                      ? `
                        <br><br>
                        <b>At Higher Levels:</b>
                        ${escapeHtml(
                          spell.higherLevelDescription
                        )}
                      `
                      : ""
                  }

                  <br>

                  <b>Source:</b>

                  ${escapeHtml(
                    spell.source ||
                    "default"
                  )}
                </p>` : ""}

                ${
                  sourceCandidates.length > 0
                    ? `
                      <label class="small">
                        Class Source

                        <select
                          id="ccSpellSource-${escapeHtml(
                            spell.id
                          )}"
                          data-cc-spell-source-select="${escapeHtml(
                            spell.id
                          )}"
                        >
                          ${sourceCandidates.map((entry) => {
                            const entrySourceId =
                              getSection16SourceKey(entry);

                            return `
                              <option
                                value="${escapeHtml(
                                  entrySourceId
                                )}"
                                ${
                                  entrySourceId === sourceId
                                    ? "selected"
                                    : ""
                                }
                              >
                                ${escapeHtml(
                                  `${entry.className || entry.classId} ${entry.level}${
                                    entry.subclassName
                                      ? ` — ${entry.subclassName}`
                                      : ""
                                  }`
                                )}
                              </option>
                            `;
                          }).join("")}
                        </select>
                      </label>

                      <p class="small">
                        <b>Status:</b>
                        ${escapeHtml(statusLabel)}

                        ${
                          expandedGrant
                            ? `
                              <br>
                              Expanded spell from
                              ${escapeHtml(
                                selectedSource?.subclassName ||
                                "subclass"
                              )}.
                            `
                            : ""
                        }

                        ${
                          !sourceCurrentlyEligible &&
                          !known &&
                          !prepared
                            ? `
                              <br>
                              Available when that class can cast level ${safeNumber(
                                spell.level,
                                0
                              )} spells.
                            `
                            : ""
                        }
                      </p>

                      <div class="hg-character-card-actions">
                        ${
                          showKnownAction &&
                          (
                            sourceCurrentlyEligible ||
                            known
                          )
                            ? `
                              <button
                                type="button"
                                data-cc-action="toggle-spell-known"
                                data-spell-id="${escapeHtml(
                                  spell.id
                                )}"
                                data-spell-source-id="${escapeHtml(
                                  sourceId
                                )}"
                              >
                                ${escapeHtml(
                                  knownActionLabel
                                )}
                              </button>
                            `
                            : ""
                        }

                        ${
                          showPreparedAction &&
                          (
                            sourceCurrentlyEligible ||
                            prepared
                          )
                            ? `
                              <button
                                type="button"
                                data-cc-action="toggle-spell-prepared"
                                data-spell-id="${escapeHtml(
                                  spell.id
                                )}"
                                data-spell-source-id="${escapeHtml(
                                  sourceId
                                )}"
                              >
                                ${
                                  prepared
                                    ? "Unprepare"
                                    : "Prepare"
                                }
                              </button>
                            `
                            : ""
                        }

                        ${
                          isMysticArcanum &&
                          sourceCurrentlyEligible
                            ? `
                              <button
                                type="button"
                                data-cc-action="toggle-spell-arcanum"
                                data-spell-id="${escapeHtml(
                                  spell.id
                                )}"
                                data-spell-source-id="${escapeHtml(
                                  sourceId
                                )}"
                              >
                                ${
                                  mysticArcanumSelected
                                    ? "Remove Mystic Arcanum"
                                    : sourceState
                                        ?.mysticArcanumSpellIds?.[
                                          String(
                                            safeNumber(
                                              spell.level,
                                              0
                                            )
                                          )
                                        ]
                                      ? "Replace Mystic Arcanum"
                                      : "Learn Mystic Arcanum"
                                }
                              </button>
                            `
                            : ""
                        }
                      </div>
                    `
                    : `
                      <div class="hg-character-placeholder">
                        This spell is not currently available to one of this character's classes.
                      </div>
                    `
                }
              </article>
            `;
            }
          })}
        </div>
      </div>
    `;
  }

  function refreshSection16SpellPicker(
    pickerState = section16SpellPickerState,
    selectedSpellSourceIds =
      section16SelectedSpellSourceIds
  ) {
    const current = C.grid?.querySelector("[data-cc-default-spell-results]");
    if (!current) return;
    const scrollY = typeof window === "undefined" ? 0 : window.scrollY;
    try {
      const template = document.createElement("template");
      template.innerHTML = renderSection16DefaultSpellViewer(
        pickerState,
        selectedSpellSourceIds
      );
      const next = template.content.querySelector("[data-cc-default-spell-results]");
      if (!next) throw new Error("Spell results could not be rendered.");
      current.replaceWith(next);
      const summary = C.grid.querySelector("[data-cc-spell-source-summary]");
      if (summary) summary.innerHTML = renderSection17SpellcastingSummary();
      if (typeof window !== "undefined") window.scrollTo(0, scrollY);
    } catch (error) {
      current.innerHTML = `<div class="hg-character-warning">${escapeHtml(error?.message || "The spell list could not be updated. Try reopening the Spells step.")}</div>`;
    }
  }

  function renderSection16CustomSpells() {
    const spells = [
      ...getSection16CustomSpells()
    ].sort((a, b) => {
      const levelCompare =
        safeNumber(
          a.level,
          0
        ) -
        safeNumber(
          b.level,
          0
        );

      if (levelCompare !== 0) {
        return levelCompare;
      }

      return String(
        a.name || ""
      ).localeCompare(
        String(
          b.name || ""
        )
      );
    });

    if (!spells.length) {
      return `
        <div class="hg-character-placeholder">
          No custom spells have been added yet.
        </div>
      `;
    }

    return spells
      .map((spell) => {
        const numericSpellLevel =
          safeNumber(spell.level, 0);

        const spellLevel =
          numericSpellLevel === 0
            ? "Cantrip"
            : `Level ${numericSpellLevel}`;

        const sourceEntry =
          getSpellcastingEntryForSpell(
            creatorState.draft,
            spell
          );

        const sourceId =
          getSection16SourceKey(
            sourceEntry
          ) ||
          getSpellSourceId(spell);

        const known =
          isSection16SpellKnown(
            spell.id,
            sourceId
          );

        const prepared =
          isSection16SpellPrepared(
            spell.id,
            sourceId
          );

        const preparationMode =
          getSection16PreparationMode(
            sourceEntry
          );

        const sourceState = sourceEntry
          ? getSection16SourceState(
              sourceEntry,
              { create: false }
            )
          : null;

        const isMysticArcanum = Boolean(
          sourceEntry &&
          isSection16MysticArcanumSpell(
            sourceEntry,
            spell
          )
        );

        const mysticArcanumSelected = Boolean(
          isMysticArcanum &&
          sourceState
            ?.mysticArcanumSpellIds?.[
              String(numericSpellLevel)
            ] === spell.id
        );

        const showKnownAction =
          !isMysticArcanum &&
          numericSpellLevel === 0 ||
          (
            !isMysticArcanum &&
            preparationMode !== "prepared"
          );

        const showPreparedAction =
          !isMysticArcanum &&
          numericSpellLevel > 0 &&
          preparationMode !== "known";

        const sourceLabel =
          (
            sourceEntry
              ? `${
                  sourceEntry.className ||
                  sourceEntry.classId
                }${
                  sourceEntry.subclassName
                    ? ` — ${sourceEntry.subclassName}`
                    : ""
                }`
              : ""
          ) ||
          sourceId ||
          "Needs review";

        const sourceWarning =
          getSpellSourceWarning(
            creatorState.draft,
            spell
          );

        return `
          <article
            class="
              hg-character-choice-card
              ${
                prepared ||
                known ||
                mysticArcanumSelected
                  ? "selected"
                  : ""
              }
            "
          >
            <h3>
              ${escapeHtml(
                spell.name ||
                "Unnamed Spell"
              )}
            </h3>

            <p>
              <b>${escapeHtml(
                spellLevel
              )}</b>

              ·

              ${escapeHtml(
                spell.school ||
                "Unknown"
              )}

              <br><br>

              ${renderRulesetMetadata(spell, "spell")}

              <br><br>

              <b>Class Source:</b>

              ${escapeHtml(
                sourceLabel
              )}

              ${
                sourceWarning
                  ? `
                    <div class="hg-character-warning">
                      ${escapeHtml(
                        sourceWarning
                      )}
                    </div>
                  `
                  : ""
              }

              <br>

              <b>Casting Time:</b>

              ${escapeHtml(
                spell.castingTime ||
                "1 action"
              )}

              <br>

              <b>Range:</b>

              ${escapeHtml(
                spell.range ||
                "Self"
              )}

              <br>

              <b>Duration:</b>

              ${escapeHtml(
                spell.duration ||
                "Instantaneous"
              )}

              ${
                formatSection16SpellResolution(
                  spell
                )
                  ? `
                    <br>

                    <b>Resolution:</b>

                    ${escapeHtml(
                      formatSection16SpellResolution(
                        spell
                      )
                    )}
                  `
                  : ""
              }

              ${
                formatSection16SpellScaling(
                  spell
                )
                  ? `
                    <br>

                    <b>Scaling:</b>

                    ${escapeHtml(
                      formatSection16SpellScaling(
                        spell
                      )
                    )}
                  `
                  : ""
              }

              ${
                formatSection16SpellComponents(
                  spell
                )
                  ? `
                    <br>

                    <b>Components:</b>

                    ${escapeHtml(
                      formatSection16SpellComponents(
                        spell
                      )
                    )}
                  `
                  : ""
              }

              ${
                spell.ritual
                  ? `
                    <br>

                    <b>Ritual</b>
                  `
                  : ""
              }

              ${
                spell.concentration
                  ? `
                    <br>

                    <b>Concentration</b>
                  `
                  : ""
              }

              <br>

              <b>Status:</b>

              ${
                 mysticArcanumSelected
                   ? "Mystic Arcanum"
                   : prepared
                     ? "Prepared"
                     : known
                       ? preparationMode ===
                           "spellbook-prepared" &&
                         numericSpellLevel > 0
                           ? "In spellbook"
                           : "Known"
                       : "Not known"
              }
            </p>

            ${
              spell.description
                ? `
                  <p class="small">
                    ${escapeHtml(
                      spell.description
                    )}
                  </p>
                `
                : ""
            }

            <div class="hg-character-card-actions">
              ${
                showKnownAction
                  ? `
                    <button
                      type="button"
                      data-cc-action="toggle-spell-known"
                      data-spell-id="${escapeHtml(
                        spell.id
                      )}"
                      data-spell-source-id="${escapeHtml(
                        sourceId
                      )}"
                    >
                      ${
                        preparationMode ===
                          "spellbook-prepared" &&
                        numericSpellLevel > 0
                          ? known
                            ? "Remove from Spellbook"
                            : "Add to Spellbook"
                          : known
                            ? "Forget"
                            : "Learn"
                      }
                    </button>
                  `
                  : ""
              }

              ${
                showPreparedAction
                  ? `
                    <button
                      type="button"
                      data-cc-action="toggle-spell-prepared"
                      data-spell-id="${escapeHtml(
                        spell.id
                      )}"
                      data-spell-source-id="${escapeHtml(
                        sourceId
                      )}"
                    >
                      ${
                        prepared
                          ? "Unprepare"
                          : "Prepare"
                      }
                    </button>
                  `
                  : ""
              }

              ${
                isMysticArcanum
                  ? `
                    <button
                      type="button"
                      data-cc-action="toggle-spell-arcanum"
                      data-spell-id="${escapeHtml(
                        spell.id
                      )}"
                      data-spell-source-id="${escapeHtml(
                        sourceId
                      )}"
                    >
                      ${
                        mysticArcanumSelected
                          ? "Remove Mystic Arcanum"
                          : sourceState
                              ?.mysticArcanumSpellIds?.[
                                String(
                                  numericSpellLevel
                                )
                              ]
                            ? "Replace Mystic Arcanum"
                            : "Learn Mystic Arcanum"
                      }
                    </button>
                  `
                  : ""
              }

              <button
                type="button"
                data-cc-action="remove-custom-spell"
                data-spell-id="${escapeHtml(
                  spell.id
                )}"
              >
                Remove Spell
              </button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderSection16InnateSpells() {
    return renderInnateSpellCards(
      getSection16InnateSpells(),
      {
        emptyMessage:
          "No innate species or background spells are currently recorded."
      }
    );
  }

  function renderSection16FeatureCards(
    features,
    emptyMessage,
    removable = false
  ) {
    const featureList =
      Array.isArray(features)
        ? features
        : [];

    if (!featureList.length) {
      return `
        <div class="hg-character-placeholder">
          ${escapeHtml(
            emptyMessage
          )}
        </div>
      `;
    }

    return featureList
      .map((rawFeature, index) => {
        const feature =
          normalizeSection16Feature(
            rawFeature,
            rawFeature?.source ||
            "feature"
          );

        return `
          <article class="hg-character-choice-card">
            <h3>
              ${escapeHtml(
                feature.name
              )}
            </h3>

            <p>
              <b>Source:</b>

              ${escapeHtml(
                feature.sourceLabel ||
                feature.source
              )}

              ${
                feature.rulesEdition
                  ? `
                    <br>

                    <b>Edition:</b>

                    ${escapeHtml(
                      feature.rulesEdition
                    )}
                  `
                  : ""
              }

              ${
                feature.level
                  ? `
                    <br>

                    <b>Level:</b>

                    ${Math.max(
                      1,
                      Math.round(
                        safeNumber(
                          feature.level,
                          1
                        )
                      )
                    )}
                  `
                  : ""
              }

              ${
                feature.uses
                  ? `
                    <br>

                    <b>Uses:</b>

                    ${escapeHtml(
                      feature.uses
                    )}
                  `
                  : ""
              }

              ${
                feature.recharge
                  ? `
                    <br>

                    <b>Recharge:</b>

                    ${escapeHtml(
                      feature.recharge
                    )}
                  `
                  : ""
              }
            </p>

            ${
              feature.summary
                ? `
                  <p class="small">
                    ${escapeHtml(
                      feature.summary
                    )}
                  </p>
                `
                : ""
            }

            ${
              feature.description
                ? `
                  <p
                    class="small"
                    data-feature-full-description="true"
                  >
                    ${escapeHtml(
                      feature.description
                    )}
                  </p>
                `
                : ""
            }

            ${renderSection12FeatureMechanics(feature)}

            ${
              removable
                ? `
                  <div class="hg-character-card-actions">
                    <button
                      type="button"
                      data-cc-action="remove-custom-feature"
                      data-index="${index}"
                    >
                      Remove Feature
                    </button>
                  </div>
                `
                : ""
            }
          </article>
        `;
      })
      .join("");
  }

  function getSection16SelectedFeats() {
    const featIds = normalizeFeatIds(
      creatorState.draft.feats
    );

    return featIds.map((featId) => {
      return (
        DEFAULT_FEATS.find((feat) => feat.id === featId) ||
        {
          id: featId,
          name: featId,
          summary: "This feat is not in the current default feat catalog."
        }
      );
    });
  }

  function toggleSection16Feat(featId) {
    const feat = DEFAULT_FEATS.find((entry) => {
      return entry.id === featId;
    });

    if (!feat) {
      return false;
    }

    const selectedIds = normalizeFeatIds(
      creatorState.draft.feats
    );
    const selectedByAdvancement = getUnlockedFeatChoiceSlots(
      creatorState.draft
    ).some((slot) => {
      return (
        slot.selectedMode === "feat" &&
        slot.selectedFeatId === featId
      );
    });

    if (selectedIds.includes(featId) && selectedByAdvancement) {
      return false;
    }

    if (
      !selectedIds.includes(featId) &&
      !getFeatPrerequisiteResult(feat).met
    ) {
      return false;
    }

    creatorState.draft.feats = selectedIds.includes(featId)
      ? selectedIds.filter((id) => id !== featId)
      : [...selectedIds, featId];
    creatorState.draft.selectedFeats = [...creatorState.draft.feats];

    applySelectedFeatMechanics();
    applyCompatibilityAliases(creatorState.draft);
    markDraftChanged();

    return true;
  }

  function getSection16FeatPickerPage(
    options = {}
  ) {
    const selectedIds = new Set(
      normalizeFeatIds(creatorState.draft.feats)
    );
    const advancementFeatIds = new Set(
      getUnlockedFeatChoiceSlots(creatorState.draft)
        .filter((slot) => slot.selectedMode === "feat")
        .map((slot) => slot.selectedFeatId)
        .filter(Boolean)
    );
    const page = createCatalogPage(
      DEFAULT_FEATS,
      {
        query: options.query,
        visibleLimit:
          options.visibleLimit ||
          CREATOR_CATALOG_BATCH_SIZE,
        pinnedIds: [
          ...selectedIds,
          ...(
            Array.isArray(options.pinnedIds)
              ? options.pinnedIds
              : []
          )
        ],
        getId: (feat) => feat.id,
        getSearchText: (feat) => {
          return [
            feat.name,
            feat.summary,
            feat.description,
            ...(Array.isArray(feat.tags)
              ? feat.tags
              : [])
          ].join(" ");
        }
      }
    );

    const html = page.entries.map((feat) => {
      const selected = selectedIds.has(feat.id);
      const prerequisite = getFeatPrerequisiteResult(feat);
      const selectedByAdvancement = advancementFeatIds.has(feat.id);

      return `
        <article class="hg-character-choice-card ${selected ? "selected" : ""}">
          <h3>${escapeHtml(feat.name)}</h3>

          <p class="small">
            ${escapeHtml(feat.summary || "No summary provided.")}
            <br>${escapeHtml(feat.description || "")}
            <br><b>Prerequisite:</b>
            ${escapeHtml(getFeatPrerequisiteLabel(feat))}
            ${prerequisite.settingRequirements.length
              ? `<br><b>Setting:</b> ${escapeHtml(
                  `${prerequisite.settingRequirements.join(", ")} (advisory; not enforced)`
                )}`
              : ""}
            <br><br>
            ${renderRulesetMetadata(feat, "feat")}
          </p>

          <div class="hg-character-card-actions">
            <button
              type="button"
              data-cc-action="toggle-default-feat"
              data-feat-id="${escapeHtml(feat.id)}"
              ${selectedByAdvancement || (!selected && !prerequisite.met) ? "disabled" : ""}
            >
              ${selectedByAdvancement
                ? "Chosen by Advancement"
                : selected
                  ? "Remove Feat"
                  : "Add Feat"}
            </button>
          </div>
        </article>
      `;
    }).join("");

    return Object.freeze({
      ...page,
      html
    });
  }

  function renderSection16FeatPicker(
    options = {}
  ) {
    return getSection16FeatPickerPage(
      options
    ).html;
  }

  function formatSection16ProgressionLabel(
    progressionType
  ) {
    const labels = {
      "full-caster": "Full caster",
      "half-caster": "Half caster (Paladin / Ranger)",
      artificer: "Artificer half caster",
      "third-caster": "One-third caster",
      "pact-magic": "Pact Magic",
      none: "No class spellcasting"
    };

    const cleanType = cleanString(
      progressionType,
      "none"
    );

    return labels[cleanType] || cleanType;
  }

  function renderSection16BeginnerGuide() {
    const summary = getSpellcastingSummary(
      creatorState.draft
    );

    const spellcaster = summary.classes.find(
      (entry) => {
        return (
          entry.progressionType !== "none" ||
          Boolean(entry.spellcastingAbility)
        );
      }
    );

    const ability = spellcaster
      ?.spellcastingAbility ||
      creatorState.draft.magic
        .spellcastingAbility;

    return `
      <div class="hg-character-current-choice">
        <b>Spellcasting Ability:</b>
        ${escapeHtml(
          ability
            ? getSection13AbilityName(ability)
            : "None selected"
        )}. This ability sets spell attacks and spell save DC.

        <br>

        <b>Cantrips:</b>
        Cantrips do not use spell slots. Leveled spells use spell
        slots when cast. <b>Prepared casters</b> choose which spells
        are ready each day. <b>Known casters</b> have a fixed list of
        spells they know.

        <br>

        <b>Spell Numbers:</b>
        Spell save DC = 8 + proficiency bonus + spellcasting ability
        modifier. Spell attack bonus = proficiency bonus + spellcasting
        ability modifier.

        <br>

        <b>Spell Slots:</b>
        Slots power leveled spells. Warlock Pact Magic uses separate
        pact slots and slot levels. Paladin and Ranger begin normal
        half-caster slots at level 2; Artificer begins at level 1 and
        uses its own rounded-up half-caster progression.

        <br>

        <b>Current Progression:</b>
        ${escapeHtml(
          formatSection16ProgressionLabel(
            spellcaster?.progressionType ||
            creatorState.draft.magic
              .spellcastingProgression
          )
        )}.
      </div>
    `;
  }

  const spellsStep = createSpellsStep({
    ABILITY_DEFINITIONS,
    C,
    addSection16CustomFeature,
    addSection16CustomSpell,
    beginnerNote,
    calculateSection16SpellcastingValues,
    cleanString,
    escapeHtml,
    formatSection16ProgressionLabel,
    getCreatorState: () => creatorState,
    getSection13AbilityName,
    getSection16CustomFeatures,
    getSection16FeatPickerPage,
    getSection16SelectedFeats,
    getCanonicalSpellSources,
    getPerClassSpellSelectionSummary,
    getSection16SpellById,
    getSelectedClassTemplate,
    getSpellSelectionLimits,
    getSpellcastingClassOptions,
    getSpellcastingSummary,
    isCharacterNonSpellcaster,
    migrateSection16LegacySpellSelections,
    refreshSection16SpellPicker,
    removeSection16CustomFeature,
    removeSection16CustomSpell,
    renderCreatorView: renderCurrentStep,
    renderSection16BeginnerGuide,
    renderSection16CustomSpells,
    renderSection16DefaultSpellViewer,
    renderSection16FeatureCards,
    renderSection16InnateSpells,
    renderSection16MagicalSecrets,
    renderSection16SpellSlots,
    renderSection17SpellcastingSummary,
    safeDisplayString,
    safeNumber,
    setStatus,
    syncSection16ClassSourceMetadata,
    toggleSection16Feat,
    toggleSection16MysticArcanum,
    toggleSection16SpellKnown,
    toggleSection16SpellPrepared,
    wizardField,
    wizardSelect
  });

  const section16SelectedSpellSourceIds =
    spellsStep.selectedSpellSourceIds;
  const section16SpellPickerState =
    spellsStep.spellPickerState;

  const {
    renderSpellsStep,
    findSection16ActionElement,
    handleSection16CalculateSpellcasting,
    handleSection16AddSpell,
    handleSection16SpellAction,
    handleSection16DefaultSpellSearch,
    handleSection16SpellPickerAction,
    handleSection16SpellSourceChange,
    handleSection16AddFeature,
    handleSection16ToggleFeat,
    handleSection16RemoveFeature
  } = spellsStep.compatibility;

  registerCharacterStepRenderer(
    "spells",
    spellsStep.renderStep
  );

  spellsStep.actions.forEach((action) => {
    registerCharacterCreatorAction(
      action,
      (context) => {
        return spellsStep.handleStepClick(
          context
        );
      }
    );
  });

  registerCharacterCreatorInputHandler(
    spellsStep.handleStepInput
  );

  registerCharacterCreatorChangeHandler(
    spellsStep.handleStepChange
  );

// =====================================================
// CHARACTER CREATOR SECTION 17 — REVIEW / VALIDATION
// =====================================================

  function formatSection17Modifier(value) {
    const number =
      safeNumber(
        value,
        0
      );

    return number >= 0
      ? `+${number}`
      : String(number);
  }

  const reviewStep = createReviewStep({
    ABILITY_DEFINITIONS,
    BUILDER_STEPS,
    DEFAULT_FEATS,
    DEFAULT_SPELLS,
    SKILL_DEFINITIONS,
    abilitiesStep,
    applyCompatibilityAliases,
    backgroundStep,
    beginnerNote,
    calculateAbilityModifier,
    calculateArmorClassOptions,
    calculateCharacterCarryingCapacity,
    calculateCharacterHitDice,
    calculateCharacterHp,
    calculateCharacterInitiative,
    calculateCharacterPassiveScores,
    calculateCharacterSavingThrows,
    calculateCharacterSkillModifier,
    calculateEquippedWeaponAttacks,
    calculateInventoryWeightSummary,
    clampLevel,
    cleanArray,
    cleanString,
    countValidClassEntrySkillChoices,
    ensureEquipmentCurrencySources,
    escapeHtml,
    formatMulticlassPrerequisiteFailure,
    formatSection12ClassChoiceValues,
    formatSection12List,
    formatSection14CurrencySummary,
    formatSection17ClassEntryLabel,
    formatSection17ClassLevelSummary,
    formatSection17Modifier,
    getCharacterAttunementLimit,
    getCharacterBusyLabel,
    getCharacterProficiencyBonus,
    getClassEntryLevel,
    getClassEntrySkillChoiceConfig,
    getClassProgressionEntries,
    getContainerSummaries,
    getCreatorState: () => creatorState,
    getReviewRevision: () => {
      return `${creatorState.reviewRevision}:${getDerivedObjectIdentity(
        creatorState.draft
      )}`;
    },
    getFeatPrerequisiteResult,
    getFeatSpellcastingValidationWarnings,
    getMulticlassPendingSkillChoiceWarnings,
    getMulticlassPendingToolChoiceWarnings,
    getMulticlassPrerequisiteResults,
    getMulticlassSummaryEntries,
    getPendingClassFeatureChoiceWarnings,
    getPrimaryClassEntry,
    getSafeBackgroundName,
    getSafeCharacterName,
    getSafeClassName,
    getSafeSpeciesName,
    getSafeSubclassName,
    getSection12ClassFeaturesThroughLevel,
    getSection12FeatureChoiceKey,
    getSection12FeatureStoredChoices,
    getSection13AbilityName,
    getSection14BackgroundSourceValues,
    getSection15AttunedItemCount,
    getSection15Inventory,
    getSection16ClassSourceStore,
    getSection16InnateSpells,
    getSection16SelectedFeats,
    getSection16SourceKey,
    getSection17ClassProgressionEntries,
    getSection17SpellChoiceValidation,
    getSelectedClassTemplate,
    getSelectedDefaultFeatInstances,
    getSpellcastingClassOptions,
    getSpellcastingEntryForSpell,
    getSpellSlotCastingOptions,
    getSpellSourceId,
    getSpellSourceWarning,
    getUnlockedFeatChoiceSlots,
    getValidationWarnings,
    hasCurrencyValue,
    isCharacterCreatorBusy,
    isMulticlassDraft,
    isPlainObject,
    isSection17ClassComplete,
    isStepComplete,
    migrateSection16LegacySpellSelections,
    openCharacterSheet: handleSection17OpenCharacterSheet,
    persistDraftToSession,
    renderClassFeatureMetadata,
    renderCreatorView: renderCurrentStep,
    renderInnateSpellCards,
    renderMulticlassAdvancementChoiceSummary,
    renderMulticlassClassSummary,
    renderMulticlassLevelBreakdown,
    renderSection17SpellcastingSummary,
    renderSelectedClassMechanicsSummary,
    renderSelectedFeatSummary,
    safeDisplayString,
    safeNumber,
    setStatus,
    skillsStep,
    speciesStep,
    syncSection16ClassSourceMetadata,
    uniqueCleanArray,
    validateContainerState
  });

  const {
    getSection17AbilityName,
    getSection17ProficiencyBonus,
    getSection17SkillEntry,
    getSection17SkillModifier,
    getSection17PassivePerception,
    getSection17Initiative,
    getSection17CarryingCapacity,
    getSection17InventoryWeight,
    getSection17SpellCount,
    getSection17FeatureCount,
    getSection17Warnings,
    isSection17OptionalFinalizationWarning,
    getSection17FinalizationValidation,
    getSection17CompletedStepIds,
    syncSection17CompletedSteps,
    renderSection17Abilities,
    renderSection17Skills,
    renderSection17List,
    renderSection17BackgroundChoices,
    renderSection17BackgroundGrants,
    renderSection17SavingThrows,
    renderSection17PassiveScores,
    renderSection17HitDice,
    renderSection17WeaponAttacks,
    renderSection17ContainerSummary,
    renderSection17ClassSpells,
    renderSection17InnateSpells,
    renderSection17Inventory,
    renderSection17FeatureReviewItem,
    renderSection17FeatureSummary,
    renderSection17Warnings,
    getSection17MigrationWarnings,
    renderSection17MigrationWarnings,
    renderSection17ClassAndFeatSummary,
    renderReviewStep,
    isSection17ReviewComplete,
    handleSection17RefreshReview
  } = reviewStep.compatibility;
  function getFeatSpellcastingValidationWarnings(
    character
  ) {
    const records = Array.isArray(
      character?.featMechanics
        ?.spellcasting
    )
      ? character.featMechanics
          .spellcasting
      : [];
    const featSources =
      character?.magic?.featSources &&
      typeof character.magic
        .featSources === "object" &&
      !Array.isArray(
        character.magic.featSources
      )
        ? character.magic.featSources
        : {};
    const warnings = [];

    records.forEach((record) => {
      const spellLabel = cleanString(
        record?.spellName ||
        record?.spellId,
        "A feat spell"
      );
      const sourceId = cleanString(
        record?.sourceId
      );

      if (
        !cleanString(
          record?.spellcastingAbility
        )
      ) {
        warnings.push(
          `${spellLabel} from ${record?.featName || "a feat"} has no casting ability.`
        );
      }

      if (
        !sourceId ||
        !cleanString(record?.featId) ||
        !featSources[sourceId]
      ) {
        warnings.push(
          `${spellLabel} has no valid feat spell source.`
        );
      }
    });

    Object.entries(featSources)
      .forEach(([sourceId, source]) => {
        uniqueCleanArray(
          source?.spellIds
        ).forEach((spellId) => {
          const hasRecord = records.some(
            (record) => {
              return (
                cleanString(
                  record?.sourceId
                ) === sourceId &&
                cleanString(
                  record?.spellId
                ) === spellId
              );
            }
          );

          if (!hasRecord) {
            warnings.push(
              `${cleanString(source?.featName, source?.featId || "A feat")} spell ${spellId} is missing its tracked casting source.`
            );
          }
        });
      });

    return uniqueCleanArray(warnings);
  }

  function renderSection17SpellcastingSummary() {
    const summary =
      getSpellcastingSummary(
        creatorState.draft
      );

    if (!summary.classes.length) {
      return `
        <div class="hg-character-placeholder">
          No class spellcasting progression is recorded.
        </div>
      `;
    }

    const combinedSlotText =
      Object.entries(
        summary.multiclass?.spellSlots || {}
      )
        .map(([level, slots]) => {
          return `L${level}: ${slots}`;
        })
        .join(", ");

    const pactText =
      Array.isArray(
        summary.multiclass?.pactMagic
      )
        ? summary.multiclass.pactMagic
            .filter((pact) => {
              return safeNumber(
                pact.slots,
                0
              ) > 0;
            })
            .map((pact) => {
              return `${safeNumber(
                pact.slots,
                0
              )} slot(s), level ${safeNumber(
                pact.slotLevel,
                0
              )}`;
            })
            .join("; ")
        : "";

    const combinedCard = `
      <article class="hg-character-choice-card">
        <h3>Combined Spell Slots</h3>

        <p>
          ${summary.castingBlocked
            ? `<b>Casting Status:</b> Blocked (${escapeHtml(summary.castingBlockReasons.join(", ") || "class-feature restriction")})<br>`
            : ""}
          <b>Caster Level:</b>
          ${safeNumber(
            summary.multiclass?.casterLevel,
            0
          )}

          <br>

          <b>Normal Slots:</b>
          ${escapeHtml(
            combinedSlotText ||
            "None"
          )}

          <br>

          <b>Pact Magic:</b>
          ${escapeHtml(
            pactText ||
            "None"
          )}
        </p>
      </article>
    `;

    const focusBySourceId =
      new Map(
        getSpellcastingFocusSummary(
          creatorState.draft
        ).map((focusSummary) => {
          return [
            focusSummary.classEntryId,
            focusSummary.focuses
          ];
        })
      );

    const classCards =
      summary.classes.map((entry) => {
        const source =
          getSection16SourceState(entry);
        const focuses =
          focusBySourceId.get(
            getSection16SourceKey(entry)
          ) || [];

        const arcanumCount = Object.values(
          source?.mysticArcanumSpellIds || {}
        ).filter(Boolean).length;
        const secretIds = cleanArray(source?.magicalSecretSpellIds);
        const magicalSecretsCount = secretIds.length;
        const ordinaryKnownCount = cleanArray(source?.knownSpellIds)
          .filter((spellId) => !secretIds.includes(spellId)).length;

        const slotText =
          Object.entries(
            entry.spellSlots || {}
          )
            .map(([level, slots]) => {
              return `L${level}: ${slots}`;
            })
            .join(", ");

        return `
          <article class="hg-character-choice-card">
            <h3>
              ${escapeHtml(
                entry.className ||
                "Spellcaster"
              )}${
                entry.subclassName
                  ? ` — ${escapeHtml(
                      entry.subclassName
                    )}`
                  : ""
              }
            </h3>

            <p>
              <b>Progression:</b>
              ${escapeHtml(
                entry.progressionType ||
                "none"
              )}

              <br>

              <b>Ability:</b>
              ${escapeHtml(
                entry.spellcastingAbility ||
                "None"
              )}

              <br>
              <b>Focus:</b>
              ${escapeHtml(
                focuses.length
                  ? focuses
                      .map((focus) => {
                        return focus.name;
                      })
                      .join(", ")
                  : "None assigned"
              )}

              <br>
              <b>Selections:</b>
              ${source?.cantripIds?.length || 0} cantrip(s),
              ${ordinaryKnownCount} known,
              ${source?.spellbookSpellIds?.length || 0} in spellbook,
              ${source?.preparedSpellIds?.length || 0} prepared

              ${magicalSecretsCount ? `, ${magicalSecretsCount} Magical Secrets` : ""}

              ${
                source?.alwaysPreparedSpellIds?.length
                  ? `, ${source.alwaysPreparedSpellIds.length} always prepared`
                  : ""
              }

              ${
                arcanumCount
                  ? `, ${arcanumCount} Mystic Arcanum`
                  : ""
              }

              ${
                entry.spellSaveDc === null
                  ? ""
                  : `
                    <br>
                    <b>DC:</b>
                    ${entry.spellSaveDc}
                  `
              }

              ${
                entry.spellAttackBonus === null
                  ? ""
                  : `
                    <br>
                    <b>Attack:</b>
                    ${formatSection17Modifier(
                      entry.spellAttackBonus
                    )}
                  `
              }

              ${
                entry.preparedLimit === null
                  ? ""
                  : `
                    <br>
                    <b>Prepared Limit:</b>
                    ${entry.preparedLimit}
                  `
              }

              ${
                entry.cantripsKnown
                  ? `
                    <br>
                    <b>Cantrips Known:</b>
                    ${entry.cantripsKnown}
                  `
                  : ""
              }

              ${
                entry.spellsKnown
                  ? `
                    <br>
                    <b>Known Limit:</b>
                    ${entry.spellsKnown}
                  `
                  : ""
              }

              ${
                slotText
                  ? `
                    <br>
                    <b>Slots:</b>
                    ${escapeHtml(slotText)}
                  `
                  : ""
              }

              ${
                entry.pactMagic?.slots
                  ? `
                    <br>
                    <b>Pact:</b>
                    ${entry.pactMagic.slots}
                    slot(s), level
                    ${entry.pactMagic.slotLevel}
                  `
                  : ""
              }
            </p>
          </article>
        `;
      });

    return [
      combinedCard,
      ...classCards
    ].join("");
  }

  function getSection17ClassProgressionEntries(
    character = creatorState.draft
  ) {
    const entries =
      getClassProgressionEntries(character);

    if (entries.length) {
      return entries
        .map((entry, index) => {
          const className =
            safeDisplayString(
              entry?.className,
              `Class ${index + 1}`
            );

          const classLevel =
            Math.max(
              1,
              getClassEntryLevel(entry, 1)
            );

          const subclassName =
            safeDisplayString(
              entry?.subclassName,
              ""
            );

          return {
            className,
            classLevel,
            subclassName
          };
        })
        .filter((entry) => entry.className);
    }

    const primaryClass =
      getPrimaryClassEntry(character);

    const className =
      safeDisplayString(
        primaryClass?.className,
        safeDisplayString(
          character?.className,
          ""
        )
      );

    if (!className) {
      return [];
    }

    return [
      {
        className,
        classLevel:
          clampLevel(
            character?.classProgression?.totalLevel ||
            character?.level ||
            1
          ),
        subclassName:
          safeDisplayString(
            primaryClass?.subclassName,
            safeDisplayString(
              character?.subclassName,
              ""
            )
          )
      }
    ];
  }

  function formatSection17ClassEntryLabel(entry) {
    return `${entry.className} ${entry.classLevel}${
      entry.subclassName
        ? ` — ${entry.subclassName}`
        : ""
    }`;
  }

  function formatSection17ClassLevelSummary(
    character = creatorState.draft
  ) {
    const level =
      clampLevel(
        character?.classProgression?.totalLevel ||
        character?.level ||
        1
      );

    const entries =
      getSection17ClassProgressionEntries(
        character
      );

    if (!entries.length) {
      return `Level ${level} No class`;
    }

    const classBreakdown =
      entries
        .map(formatSection17ClassEntryLabel)
        .join(" / ");

    return entries.length > 1
      ? `${classBreakdown} (Level ${level})`
      : classBreakdown;
  }

  function isSection17ClassComplete(
    character
  ) {
    return classStep.isStepComplete(character);
  }

  function isSection17SubclassComplete(
    character = creatorState.draft
  ) {
    if (!isSection17ClassComplete(character)) {
      return false;
    }

    if (isMulticlassDraft(character)) {
      return getMulticlassSummaryEntries(
        character
      ).every((entry) => {
        const subclassOptions =
          Array.isArray(
            entry.template?.subclasses
          )
            ? entry.template.subclasses
            : [];

        if (
          !subclassOptions.length ||
          entry.classLevel <
            entry.subclassLevel
        ) {
          return true;
        }

        return Boolean(
          entry.subclassName
        );
      });
    }

    const selectedClass =
      getSelectedClassTemplate();

    const subclassLevel =
      Math.max(
        1,
        safeNumber(
          selectedClass?.subclassLevel,
          0
        )
      );

    const classLevel =
      getClassEntryLevel(
        getPrimaryClassEntry(
          character
        ),
        character
          ?.classProgression
          ?.totalLevel
      );

    const subclassOptions =
      Array.isArray(
      selectedClass?.subclasses
      )
        ? selectedClass.subclasses
        : [];

    if (
      !subclassOptions.length ||
      classLevel < subclassLevel
    ) {
      return true;
    }

    return Boolean(
      getSafeSubclassName(character)
    );
  }

  function isSection17LevelComplete(
    character
  ) {
    const level =
      safeNumber(
        character
          ?.classProgression
          ?.totalLevel,
        0
      );

    const maxHp =
      safeNumber(
        character
          ?.combat
          ?.maxHp,
        0
      );

    return (
      isSection17ClassComplete(
        character
      ) &&
      level >= 1 &&
      level <= 20 &&
      maxHp >= 1 &&
      safeNumber(
        character
          ?.combat
          ?.currentHp,
        0
      ) >= 0
    );
  }

  function isSection17EquipmentComplete(
    character
  ) {
    return equipmentStep.isStepComplete(
      character
    );
  }

  function isSection17SpellsComplete(
    character
  ) {
    return spellsStep.isStepComplete(
      character
    );
  }

  function handleSection17AdjustFeatResource(...values) {
    const button = findSection16ActionElement(...values);

    if (
      adjustSelectedFeatResource(
        button?.dataset?.resourceId || "",
        button?.dataset?.delta || 0
      )
    ) {
      setStatus("Feat resource updated.");
      renderCurrentStep();
    }
  }

  function handleSection17AdjustClassResource(...values) {
    const button = findSection16ActionElement(...values);

    if (
      adjustSelectedClassResource(
        button?.dataset?.resourceId || "",
        button?.dataset?.delta || 0
      )
    ) {
      setStatus("Class feature resource updated.");
      renderCurrentStep();
    }
  }

  function handleSection17ToggleRageState(...values) {
    const button = findSection16ActionElement(...values);

    if (
      toggleSection12RageState(
        button?.dataset?.resourceId || ""
      )
    ) {
      const active =
        creatorState.draft.combat
          .classFeatureStates?.rageActive === true;

      setStatus(
        active
          ? "Rage started. Spellcasting and concentration are blocked until Rage ends."
          : "Rage ended. Spellcasting is available again."
      );
      renderCurrentStep();
    }
  }

  function handleSection17AdjustDivineSmiteSlot(...values) {
    const button = findSection16ActionElement(...values);

    if (
      adjustSection12SpellSlotUsage(
        button?.dataset?.slotKind || "normal",
        button?.dataset?.slotLevel || 0,
        button?.dataset?.delta || 0,
        button?.dataset?.slotSourceId || ""
      )
    ) {
      setStatus("Spell slot usage updated.");
      renderCurrentStep();
    }
  }

  async function persistSection17SheetMutation(
    mutation,
    successMessage
  ) {
    if (
      !creatorState
        .currentCharacterId
    ) {
      setStatus(
        "Save this character before tracking gameplay."
      );
      return false;
    }

    const builderState = {
      status:
        creatorState.draft
          ?.builder?.status ||
        "draft",
      finalizedAtMillis:
        creatorState.draft
          ?.builder
          ?.finalizedAtMillis ||
        null
    };
    const result =
      typeof mutation === "function"
        ? mutation()
        : mutation;
    const changed =
      typeof result === "object" &&
      result !== null &&
      "changed" in result
        ? result.changed === true
        : result !== false;
    const message =
      typeof result === "object" &&
      result !== null
        ? cleanString(
            result.message,
            successMessage
          )
        : successMessage;

    if (!changed) {
      setStatus(
        message ||
        "Nothing needed to change."
      );
      return getCharacterSnapshot();
    }

    creatorState.draft.builder = {
      ...(creatorState.draft
        .builder || {}),
      status:
        builderState.status,
      finalizedAtMillis:
        builderState
          .finalizedAtMillis
    };
    creatorState.dirty = true;
    scheduleDraftPersistence();
    renderActionBar();

    const saved =
      await saveSection18Character({
        asNew: false,
        copyName: false,
        preserveFinalization: true
      });

    if (!saved) {
      return false;
    }

    setStatus(
      message ||
      "Gameplay saved."
    );

    return getCharacterSnapshot();
  }

  function handleSection17SheetGameplayAction(
    action
  ) {
    return persistSection17SheetMutation(
      () => {
        return applyGameplayAction(
          creatorState.draft,
          action
        );
      },
      "Gameplay saved."
    );
  }

  function handleSection17SheetRest(
    restType
  ) {
    return persistSection17SheetMutation(
      () => {
        const restChanged =
          performSection16Rest(
            restType
          );
        const cleanup =
          restType === "longRest"
            ? applyGameplayAction(
                creatorState.draft,
                {
                  type:
                    "long-rest-cleanup"
                }
              )
            : {
                changed: false
              };

        return {
          changed:
            restChanged ||
            cleanup.changed === true,
          message:
            `${
              restType === "longRest"
                ? "Long"
                : "Short"
            } rest completed and saved.`
        };
      },
      "Rest completed and saved."
    );
  }

  function getSection17CharacterSheetView() {
    if (!characterSheetView) {
      characterSheetView = createCharacterSheetView({
        root: () => {
          refreshWizardElements();
          return W.root;
        },

        getCharacter: getCharacterSnapshot,
        setStatus,
        getSheetContext: () => {
          return {
            characterId:
              creatorState
                .currentCharacterId,
            dirty:
              creatorState.dirty,
            lastSavedAtMillis:
              creatorState.draft
                ?.builder
                ?.lastSavedAtMillis,
            returnLabel:
              creatorState.viewMode ===
              "library"
                ? "Back to Library"
                : "Back to Review"
          };
        },
        onAdjustClassResource:
          (resourceId, delta) => {
            return persistSection17SheetMutation(
              () => {
                return adjustSelectedClassResource(
                  resourceId,
                  delta
                );
              },
              "Class resource updated and saved."
            );
          },
        onAdjustFeatResource:
          (resourceId, delta) => {
            return persistSection17SheetMutation(
              () => {
                return adjustSelectedFeatResource(
                  resourceId,
                  delta
                );
              },
              "Feat resource updated and saved."
            );
          },
        onAdjustInnateSpellResource:
          (sourceId, spellId, delta) => {
            return persistSection17SheetMutation(
              () => {
                return adjustCanonicalSpellResource(
                  creatorState.draft,
                  sourceId,
                  spellId,
                  delta
                );
              },
              "Innate spell resource updated and saved."
            );
          },
        onAdjustHitDie:
          (hitDieId, delta) => {
            return persistSection17SheetMutation(
              () => {
                return adjustSection16HitDieUsage(
                  hitDieId,
                  delta
                );
              },
              "Hit Die usage updated and saved."
            );
          },
        onAdjustSpellSlot:
          (
            slotKind,
            slotLevel,
            delta,
            slotSourceId
          ) => {
            return persistSection17SheetMutation(
              () => {
                return adjustSection12SpellSlotUsage(
                  slotKind,
                  slotLevel,
                  delta,
                  slotSourceId
                );
              },
              "Spell-slot usage updated and saved."
            );
          },
        onRest:
          handleSection17SheetRest,
        onGameplayAction:
          handleSection17SheetGameplayAction,
        onExportJson: () => {
          return exportSection18Json();
        },
        onSyncLinkedToken:
          async () => {
            return await handleSection18Save();
          },

        onEdit: () => {
          const stepId =
            getStepById(
              creatorState.draft
                ?.builder
                ?.currentStep ||
              "review"
            ).id;

          characterSheetView.close();
          creatorState.viewMode =
            "builder";
          navigateToStep(stepId);
          return true;
        },

        onDuplicate: () => {
          const characterId =
            creatorState
              .currentCharacterId;

          characterSheetView.close();
          return duplicateCharacterFromLibrary(
            characterId
          );
        },

        onDelete: async () => {
          const characterId =
            creatorState
              .currentCharacterId;

          characterSheetView.close();
          return await deleteSection18Character(
            characterId
          );
        },

        onClose: () => {
          setStatus(
            creatorState.viewMode ===
              "library"
              ? "Returned to the character library."
              : "Returned to the Character Creator."
          );
          renderCreatorView();
        }
      });
    }

    return characterSheetView;
  }

  function handleSection17OpenCharacterSheet() {
    getSection17CharacterSheetView().open(
      getCharacterSnapshot()
    );
  }

  registerCharacterCreatorAction(
    "adjust-class-resource",
    handleSection17AdjustClassResource
  );

  registerCharacterCreatorAction(
    "toggle-rage-state",
    handleSection17ToggleRageState
  );

  registerCharacterCreatorAction(
    "adjust-divine-smite-slot",
    handleSection17AdjustDivineSmiteSlot
  );

  registerCharacterStepCompletion(
    "basics",
    basicsStep.isStepComplete
  );

  registerCharacterStepCompletion(
    "species",
    speciesStep.isStepComplete
  );

  registerCharacterStepCompletion(
    "class",
    classStep.isStepComplete
  );

  registerCharacterStepCompletion(
    "subclass",
    isSection17SubclassComplete
  );

  registerCharacterStepCompletion(
    "level",
    isSection17LevelComplete
  );

  registerCharacterStepCompletion(
    "abilities",
    abilitiesStep.isStepComplete
  );

  registerCharacterStepCompletion(
    "background",
    backgroundStep.isStepComplete
  );

  registerCharacterStepCompletion(
    "skills",
    skillsStep.isStepComplete
  );

  registerCharacterStepCompletion(
    "equipment",
    equipmentStep.isStepComplete
  );

  registerCharacterStepCompletion(
    "spells",
    spellsStep.isStepComplete
  );

  registerCharacterStepCompletion(
    "review",
    reviewStep.isStepComplete
  );

  registerCharacterStepRenderer(
    "review",
    reviewStep.renderStep
  );

  reviewStep.actions.forEach((action) => {
    registerCharacterCreatorAction(
      action,
      (context) => {
        return reviewStep.handleStepClick(
          context
        );
      }
    );
  });

  registerCharacterCreatorAction(
    "adjust-feat-resource",
    handleSection17AdjustFeatResource
  );

// =====================================================
// CHARACTER CREATOR SECTION 18 — SAVE / EXPORT / IMPORT
// =====================================================

  const {
    blockSection18Finalization, copySection18Json, deleteSection18Character, exportSection18Json, formatSection18SavedTime, getSection18CharacterCollection,
    getSection18CharacterCollectionName, getSection18CharacterDocument, getSection18CharacterPortraitUrl, getSection18DocumentSnapshotData, getSection18JsonText, getSection18RecordRevisionMillis,
    getSection18RecordRoomCode, getSection18RecordType, getSection18TimestampMillis, getValidatedSection18CharacterDocument, handleSection18Change, handleSection18CopyJson,
    handleSection18CreateLinkedToken, handleSection18Delete, handleSection18DownloadDraftBackup, handleSection18ExportJson, handleSection18Finalize, handleSection18ImportFile,
    handleSection18ImportText, handleSection18Save, handleSection18SaveCopy, hasSection18FirestoreReadTool, importSection18File, importSection18JsonText,
    isSection18CharacterRecordData, isSection18SaveComplete: isSection18PersistenceComplete, parseSection18ImportedCharacter, prepareSection18Character,
    saveSection18Character, section18SnapshotExists, syncSection18DerivedValues, useSection18ImportedCharacter,
    validateSection18FirestoreRecord, validateSection18NoRemoteConflict
  } = createCharacterPersistence({
    $, ABILITY_DEFINITIONS, ABILITY_SCORE_METHODS, ACTIVE_RULESET, ADDITIONAL_CANTRIP_COUNT_2014, ADDITIONAL_CANTRIP_EXPECTATIONS_2014,
    ADDITIONAL_CANTRIP_IDS_2014, ARTISAN_TOOL_OPTIONS, BACKGROUND_SCHEMA_VERSION, BUILDER_STEPS, BUILDER_STEP_INDEX, BUILTIN_BACKGROUND_2014_EXPECTATIONS,
    BUILTIN_BACKGROUND_IDS_2014, BUILTIN_SPECIES_2014_EXPECTATIONS, BUILTIN_SPECIES_IDS_2014, BUILTIN_SUBRACE_2014_EXPECTATIONS, C, CHARACTER_BUSY_ACTIONS,
    CHARACTER_SAVE_BUSY_ACTIONS, CHARACTER_SCHEMA_VERSION, CLASS_SCHEMA_VERSION, CURRENCY_DENOMINATIONS, DARK_ELF_INNATE_SPELLS_2014, DEFAULT_BACKGROUND_EQUIPMENT_PACKAGES,
    DEFAULT_BACKGROUND_TEMPLATES, DEFAULT_CLASSES, DEFAULT_CLASS_SCHEMA_VERSION, DEFAULT_CLASS_TEMPLATES, DEFAULT_EQUIPMENT_CATALOG, DEFAULT_FEATS,
    DEFAULT_FEAT_ABILITY_SCORE_MAXIMUM, DEFAULT_FIGHTING_STYLE_EFFECTS, DEFAULT_INVOCATION_DETAILS, DEFAULT_MANEUVER_DETAILS, DEFAULT_METAMAGIC_DETAILS, DEFAULT_SPECIES_TEMPLATES,
    DEFAULT_SPELLS, DEFAULT_SUBCLASSES, DRAFT_AUTOSAVE_DEBOUNCE_MS, DWARF_TOOL_CHOICES, FEAT_CHOICE_VALUE_PREFIX, FEAT_FEATURE_OPTIONS,
    FEAT_TOOL_OPTIONS, FEAT_WEAPON_OPTIONS, FOREST_GNOME_INNATE_SPELLS_2014, GAMING_SET_OPTIONS, GENERAL_TOOL_OPTIONS, MULTICLASS_PREREQUISITES,
    MULTICLASS_PROFICIENCY_GRANTS, MUSICAL_INSTRUMENT_OPTIONS, POST_CAP_ABILITY_SOURCE_PREFIXES, RAW_DEFAULT_BACKGROUND_TEMPLATES, RAW_DEFAULT_SPECIES_TEMPLATES, SECTION11_DRAGONBORN_ANCESTRIES,
    SECTION11_EMBEDDED_PORTRAIT_MAX_BYTES, SECTION11_UPLOADED_PORTRAIT_MAX_BYTES, SECTION12_CLASS_FEATURE_SAVE_ABILITIES, SECTION13_POINT_BUY_COSTS, SECTION16_SPELL_REFERENCE_ALIASES, SKILL_DEFINITIONS,
    SPECIES_SCHEMA_VERSION, SRD_2014_FIGHTER_ASI_LEVELS, SRD_2014_FULL_CASTER_SLOTS, SRD_2014_PACT_MAGIC, SRD_2014_ROGUE_ASI_LEVELS, SRD_2014_SIZE_CARRY_MULTIPLIERS,
    SRD_2014_STANDARD_ASI_LEVELS, SRD_SPELL_COUNT_2014, STANDARD_LANGUAGE_OPTIONS, TIEFLING_INNATE_SPELLS_2014, UNARMORED_DEFENSE_CLASS_RULES, W,
    WIZARD_CANTRIP_CHOICES_2014, addCappedNormalAbilityIncrease, addCharacterLevelToClass, addCurrencyMaps, addLegacyImportWarning, addMigrationWarning,
    addMulticlassClass, addSection11SkillProficiencies, addSection14BackgroundCurrency, addSection14BackgroundFeature, addSection15CatalogItem, addSection15CustomItem,
    addSection16CustomFeature, addSection16CustomSpell, addSpeciesTrait, adjustMulticlassClassLevel, adjustSection12AsiAbility, adjustSection12SpellSlotUsage,
    adjustSection16HitDieUsage, adjustSelectedClassResource, adjustSelectedFeatResource, applyClassProgressionProficiencies, applyCompatibilityAliases, applyCustomSpecies,
    applyInitialRoute, applySection11MechanicBlock, applySection11SpeciesChoiceMechanics, applySection11SpeciesChoices, applySection11SpeciesMechanics, applySection12ClassDefaults,
    applySection12CustomClass, applySection12CustomSubclass, applySection13PointBuyDefaults, applySection13RolledScores, applySection13Scores, applySection13StandardArray,
    applySection13SuggestedHp, applySection14BackgroundChoices, applySection14BackgroundPackage, applySection14CustomBackground, applySection14ProficiencyLists, applySelectedClassFeatureMechanics,
    applySelectedFeatMechanics, applyStoredClassSkillProficiencies, assertCharacterMutationAccess, assignSection13StandardScore, auditLegacyImportedCharacter, backfillBackgroundCurrencySources,
    beginCharacterBusyAction, beginnerNote, blockCharacterBusyAction, blockMulticlassEdit, bootSection20WhenReady, calculateAbilityModifier,
    calculateAbilityModifiers, calculateArmorClassOptions, calculateCharacterHitDice, calculateCharacterHp, calculateCharacterInitiative, calculateCharacterPassiveScores,
    calculateCharacterRolledHp, calculateCharacterSavingThrows, calculateCharacterSkillModifier, calculateClassProgressionTotalLevel, calculateContainerContentWeight, calculateEquippedWeaponAttacks,
    calculateInventoryWeightSummary, calculateRuleCarryingCapacity, calculateRuleFixedAverageHp, calculateRuleManualHp, calculateRulePassiveScore, calculateRuleRolledHp,
    calculateRuleSavingThrowModifier, calculateRuleSkillModifier, calculateRuleSpellAttackBonus, calculateRuleSpellSaveDc, calculateSection13SuggestedHp, calculateSection16SpellcastingValues,
    calculateSelectedFeatNumericEffect, calculateSrd2014MulticlassSpellcasting, calculateWeaponAttack, changeSection13PointBuyScore, changeSection15Quantity, characterCreatorActions,
    characterCreatorChangeHandlers, characterCreatorInputHandlers, characterHasClass, characterLibraryRenderer, characterSheetView, characterStepCompletionChecks,
    characterStepRenderers, chooseSection11Subrace, chooseSection12Class, chooseSection12Subclass, chooseSection14Background, chooseSpeciesFromTemplate,
    chooseStoredDraftRecord, clampLevel, clampStepIndex, cleanArray, cleanImportSourceLabel, cleanString,
    cleanupDuplicateNonRepeatableAdvancementFeats, cleanupSection11PreviousPortrait, cleanupSection19PermanentListeners, cleanupSection20CharacterCreator, clearPendingDraftPersistence, clearSection11Portrait,
    clearSection11SpeciesMechanics, clearSection12Subclass, clearStoredDraft, cloneData, collectMalformedSourceValues, collectSection12Features,
    collectSection12FeaturesForClassEntry, confirmDiscardUnsavedDraft, connectDraftPersistenceLifecycle, connectPopstateRouting, connectSection19Backgrounds, connectSection19Characters,
    connectSection19Classes, connectSection19Listener, connectSection19PermanentListeners, connectSection19Species, connectWizardEvents, countSection14BackgroundSourceList,
    countSection14SkillSource, countSection14ValidBackgroundToolChoices, countSection14ValidSkillSource, countValidClassEntrySkillChoices, createAbilityMap, createCharacterLibraryCard,
    createCharacterPayload, createCharacterSheetView, createClassEntryId, createClassProgressionEntry, createDefaultClassTemplate, createDraftStorageRecord,
    createEmptyCharacter, createNormalAbilityCapScoreMap, createSection11PortraitFromFile, createSection13HpRollRecord, createSrdClassTemplate, createSrdFeature,
    createSrdFeatureLevels, createSrdSubclass, creatorState, debugSection12MulticlassAdd, decodeFeatChoiceValue, deps,
    deriveAbilityBaseFromFinalScores, disconnectDraftPersistenceLifecycle, disconnectSection20Routing, disconnectWizardEvents, draftPersistenceRuntime, duplicateCharacterFromLibrary,
    duplicateIntoDraft, encodeFeatChoiceValue, endCharacterBusyAction, enforceClassProgressionLevelCap, enrichBuiltinBackgroundTemplate, enrichBuiltinSpeciesTemplate,
    ensureAbilityBonusSources, ensureClassProgressionEntryData, ensureEquipmentCurrencySources, ensureProficiencySources, ensureWizardShell, ensureWizardStyles,
    escapeHtml, evaluateSection12ClassLevelFormula, evaluateSection12ClassResourceMaximum, expandSection14ToolChoice, filterRepeatedFeatChoiceOptions, findCachedCharacter,
    findClassEntryForLevelOrderKey, findDefaultClassDefinition, findHpRollRawRecordForLevel, findSection11ActionElement, findSection12ActionElement, findSection13ActionElement,
    findSection14ActionElement, findSection15ActionElement, findSection16ActionElement, flushPendingDraftPersistence, formatClassEntryHitDie, formatClassEntryProficiencySummary,
    formatDefaultSpellLevelLabel, formatMulticlassPrerequisiteFailure, formatMulticlassRequirementItem, formatMulticlassStoredChoiceKey, formatMulticlassStoredChoiceValue, formatSection11PortraitBytes,
    formatSection12ClassChoiceValues, formatSection12FeatEffect, formatSection12List, formatSection12Recharge, formatSection13HpRolls, formatSection14CurrencySummary,
    formatSection14List, formatSection16ProgressionLabel, formatSection16SpellComponents, formatSection16SpellResolution, formatSection16SpellScaling, formatSection17ClassEntryLabel,
    formatSection17ClassLevelSummary, formatSection17Modifier, formatSelectedClassMechanicEffect, formatSignedNumber, friendlyServiceError, getAbilityBonusTotalsFromSources,
    getAbilityDefinition, getAbilityScore, getAllClassTemplates, getAllSection14Backgrounds, getAllSpeciesTemplates, getBackgroundSourceLabel,
    getBrowserStorage, getCharacterBusyLabel, getCharacterClassEntries, getCharacterLevelHitDieRecords, getCharacterLibraryClassName, getCharacterLibraryDisplayName,
    getCharacterLibraryImageUrl, getCharacterLibraryLevel, getCharacterLibrarySpeciesName, getCharacterProficiencyBonus, getCharacterSkillEntry, getCharacterSnapshot,
    getCharacterSpellcastingInfo, getClassAsiLevels, getClassEntryAtIndex, getClassEntryLevel, getClassEntrySkillChoiceConfig, getClassEntryStoredSkillIds,
    getClassEntryStoredToolChoices, getClassEntrySubclassTemplate, getClassEntryToolChoiceConfig, getClassEntryToolChoiceOptions, getClassIndexForLevelRecord, getClassLevelOrderEntryKey,
    getClassProgressionEntries, getClassProgressionEntryKey, getClassProgressionPendingChoiceWarnings, getClassSourceLabel, getContainerContents, getContainerSummaries,
    getCurrencySourceTotals, getDefaultClassFeaturesThroughLevel, getDefaultLevelUpClassIndex, getDraftStorageKey, getDraftStorageTargets, getExactBuilderStepById,
    getFeatAbilityEffectMaximum, getFeatPrerequisiteLabel, getFeatPrerequisiteResult, getFeatSpellcastingValidationWarnings, getGenericProficiencyBonus, getHitDieSize,
    getHpRollRawRecords, getInventoryItemKnownWeight, getLatestLevelUpContext, getLegacy2014Metadata, getManualCurrencyBalance, getManualProficiencyList,
    getMulticlassClassId, getMulticlassPendingSkillChoiceWarnings, getMulticlassPendingToolChoiceWarnings, getMulticlassPrerequisiteRequirements, getMulticlassPrerequisiteResultForClass, getMulticlassPrerequisiteResults,
    getMulticlassProficiencyRule, getMulticlassRequirementLabel, getMulticlassSummaryEntries, getNormalAbilityScoreForCap, getPendingClassFeatureChoiceWarnings, getPerClassSpellSelectionSummary,
    getPersistentDraftStorageKey, getPreparedSpellLimit, getPrimaryClassEntry, getProgressionValueByLevel, getRoomCode, getRouteFromUrl,
    getSafeBackgroundName, getSafeCharacterName, getSafeClassName, getSafeSpeciesName, getSafeSubclassName, getSection11ChoiceSource,
    getSection11DragonbornAncestry, getSection11HalfElfAbilityChoices, getSection11LanguageChoices, getSection11Portrait, getSection11SelectedSpeciesTemplate, getSection11SelectedSubrace,
    getSection11SkillChoices, getSection12ArtificerInfusionContext, getSection12ArtificerInfusionState, getSection12AsiChoiceState, getSection12AsiFeature, getSection12CanonicalResourceId,
    getSection12ClassFeatureSaveDc, getSection12ClassFeaturesThroughLevel, getSection12CustomClassSkillNames, getSection12DivineSmiteSlotOptions, getSection12FeatChoiceLimit, getSection12FeatChoiceOptions,
    getSection12FeatureChoiceKey, getSection12FeatureChoiceOptionRecords, getSection12FeatureChoiceOptions, getSection12FeatureChooseCount, getSection12FeatureMechanicLines, getSection12FeatureStoredChoices,
    getSection12FutureClassFeatures, getSection12InfusionTargetOptions, getSection12LevelData, getSection12MulticlassAddStatus, getSection12PrimaryClass, getSection12SkillPickerChoices,
    getSection12SpellSlotUsageState, getSection12SubclassTemplates, getSection12UnlockedAsiSlot, getSection13AbilityBonus, getSection13AbilityName, getSection13AbilityScore,
    getSection13BaseAbilityScore, getSection13HitDieSize, getSection13HpRollState, getSection13PointBuySpent, getSection14AllExactToolOptions, getSection14BackgroundChoiceList,
    getSection14BackgroundCurrencyGrant, getSection14BackgroundLanguageOptions, getSection14BackgroundPackages, getSection14BackgroundRemovalSummary, getSection14BackgroundSourceValues, getSection14BackgroundToolOptions,
    getSection14BackgroundToolOptionsForIndex, getSection14SkillChoiceList, getSection14SkillEntry, getSection14SkillModifier, getSection14SkillSourceLabel, getSection15ActionIndex,
    getSection15AttunedItemCount, getSection15Catalog, getSection15Inventory, getSection15InventoryCount, getSection15TotalWeight, getSection15UnknownWeightCount,
    getSection16ClassSourceStore, getSection16CustomFeatures, getSection16CustomSpells, getSection16EligibleSpellcasters, getSection16EntryForSource, getSection16ExpandedSpellGrant,
    getSection16ExpandedSpellGrants, getSection16HitDieKey, getSection16InnateSpells, getSection16KnownLimitWarning, getSection16KnownSpellIds, getSection16MysticArcanumLevels,
    getSection16PreparationMode, getSection16PreparedLimitWarning, getSection16PreparedSpellIds, getSection16SelectedFeats, getSection16SourceKey, getSection16SourceState,
    getSection16SpellById, getSection16SpellReferenceId, getSection17AbilityName, getSection17CarryingCapacity, getSection17CharacterSheetView, getSection17ClassProgressionEntries,
    getSection17CompletedStepIds, getSection17FeatureCount, getSection17FinalizationValidation, getSection17Initiative, getSection17InventoryWeight, getSection17MigrationWarnings,
    getSection17PassivePerception, getSection17ProficiencyBonus, getSection17SkillEntry, getSection17SkillModifier, getSection17SpellCount, getSection17Warnings,
    getSection18MutationIdentity, getSection19CollectionName, getSection19RoomCollection, getSelectedClassTemplate, getSelectedDefaultFeatInstances, getSelectedSection12Subclass,
    getSelectedSection14Background, getSkillDefinitionByIdOrName, getSpeciesHpBonus, getSpeciesSourceLabel, getSpellSelectionLimits, getSpellSlotCastingOptions,
    getSpellSourceContexts, getSpellSourceId, getSpellSourceWarning, getSpellcastingClassOptions, getSpellcastingEntryForSpell, getSpellcastingFocusClassIds,
    getSpellcastingFocusSummary, getSpellcastingSummary, getSrd2014PactMagic, getSrd2014SpellSlots, getStartingClassEntry, getStepById,
    getStepIndex, getStoredSources, getSubraceSourceLabel, getUnlockedFeatChoiceSlots, getValidClassEntrySkillIds, getValidClassEntryToolChoices,
    getValidationWarnings, handleAddSpeciesTraitAction, handleApplySpeciesChoicesAction, handleBrowserRouteChange, handleChooseSpeciesAction, handleChooseSubraceAction,
    handleDraftBeforeUnload, handleRemoveSpeciesTraitAction, handleSection11PortraitChange, handleSection11RemovePortrait, handleSection11SetPortraitUrl, handleSection12AddCharacterLevel,
    handleSection12AddMulticlassClass, handleSection12AdjustMulticlassLevel, handleSection12ArtificerInfusion, handleSection12ArtificerInfusionTargetChange, handleSection12AsiAction, handleSection12AsiChange,
    handleSection12ChooseAsiFeat, handleSection12ChooseClass, handleSection12ChooseSubclass, handleSection12ClassFeatureChoice, handleSection12ClassFeatureSelectChange, handleSection12ClearSubclass,
    handleSection12CustomClass, handleSection12CustomClassSkillPicker, handleSection12CustomSubclass, handleSection12FeatSearch, handleSection12MoveCharacterLevelOrder, handleSection12MoveMulticlassClass,
    handleSection12MulticlassChange, handleSection12RemoveLastCharacterLevel, handleSection12RemoveMulticlassClass, handleSection12ToggleMulticlassSkill, handleSection12ToggleMulticlassTool, handleSection13ApplyRolls,
    handleSection13CalculateHp, handleSection13Change, handleSection13PointBuy, handleSection13RefreshLevel, handleSection13ResetPointBuy, handleSection13ResetStandardArray,
    handleSection13RollScores, handleSection14AddFeature, handleSection14ApplyBackgroundChoices, handleSection14ApplyBackgroundPackage, handleSection14ApplyLists, handleSection14ChooseBackground,
    handleSection14CustomBackground, handleSection14OldBackgroundEquipment, handleSection14RemoveFeature, handleSection14SkipBackground, handleSection14ToggleExpertise, handleSection14ToggleSkill,
    handleSection15AddCatalogItem, handleSection15AddCustomItem, handleSection15Change, handleSection15ChangeQuantity, handleSection15CloseContainer, handleSection15MoveItemOut,
    handleSection15OpenContainer, handleSection15RemoveItem, handleSection15ResolveContainerRemoval, handleSection15SkipEquipment, handleSection15ToggleContainedItems, handleSection15ToggleState,
    handleSection16AddFeature, handleSection16AddSpell, handleSection16CalculateSpellcasting, handleSection16DefaultSpellSearch, handleSection16RemoveFeature, handleSection16SpellAction,
    handleSection16SpellSourceChange, handleSection16ToggleFeat, handleSection17AdjustClassResource, handleSection17AdjustDivineSmiteSlot, handleSection17AdjustFeatResource, handleSection17OpenCharacterSheet,
    handleSection17RefreshReview, handleSection17ToggleRageState, handleUseCustomSpeciesAction, handleWizardChange, handleWizardClick, handleWizardImport,
    handleWizardInput, hasAbilityMapValues, hasCurrencyValue, hasFirestoreTools, hasMalformedSourceValue, hasSection11PortraitUploadHook,
    hasSection14BackgroundCurrency, hpRollRawHasAssociation, hpRollRawMatchesLevel, isActiveRulesetEntry, isAsiOrFeatChoiceFeature, isCharacterBusyAction,
    isCharacterCreatorBusy, isCharacterCreatorRoute, isCharacterNonSpellcaster, isDraftStorageQuotaError, isMulticlassDraft, isMulticlassRequirementMet,
    isPlainObject, isSavingThrowProficient, isSection11AbilityChoiceValid, isSection11LanguageChoiceValid, isSection11PortraitFile, isSection11PortraitUrlAllowed,
    isSection11SkillChoiceValid, isSection16MysticArcanumSpell, isSection16SpellKnown, isSection16SpellPrepared, isSection17AbilitiesComplete, isSection17BackgroundComplete,
    isSection17BasicsComplete, isSection17ClassComplete, isSection17EquipmentComplete, isSection17LevelComplete, isSection17OptionalFinalizationWarning, isSection17ReviewComplete,
    isSection17SkillsComplete, isSection17SpeciesComplete, isSection17SpellsComplete, isSection17SubclassComplete, isStartingClassEntry, isStepComplete,
    isWeaponProficient, makeSafeFileName, makeSafeId, markCharacterBuilderAsDraft, markDraftChanged, migrateClassEntryAdvancementData,
    migrateSection16LegacySpellSelections, moveCharacterLevelOrder, moveMulticlassClass, moveSection15ItemToContainer, navigateByStepOffset, navigateToLibrary,
    navigateToStep, normalizeAbilityMap, normalizeAdvancementChoices, normalizeCharacter, normalizeCharacterImageValue, normalizeClassChoiceMap,
    normalizeClassEntryHitDie, normalizeClassLevelOrder, normalizeClassTemplate, normalizeCurrencyMap, normalizeCurrencySourceMap, normalizeFeatChoiceSelections,
    normalizeFeatIds, normalizeHpCalculation, normalizeHpRollRecordsForCharacter, normalizeImportSourceList, normalizeSection12Subclass, normalizeSection14Background,
    normalizeSection15Item, normalizeSection16Feature, normalizeSection16Spell, normalizeSection19BackgroundRecord, normalizeSection19CharacterRecord, normalizeSection19ClassRecord,
    normalizeSection19SpeciesRecord, openCharacterFromLibrary, parseFeatChoiceSelections, parseSection12List, parseSection13HpRolls, parseSection14List,
    parseSection15ItemEditValue, performSection16Rest, persistDraftToSession, pruneAbandonedClassFeatureChoices, pruneRemovedClassSpellSources, readDraftStorageRecord,
    readSection11PortraitFileAsDataUrl, readSection19SnapshotRecords, recalculateAbilityTotals, recalculateClassTotalLevel, recordRawEquipmentMigrationWarnings, refreshBuilderChrome,
    refreshClassProgressionDerivedValues, refreshElements, refreshLoadedClassDerivedValues, refreshSection13AbilitySummary, refreshSection13LevelProgression, refreshSection20CharacterCreator,
    refreshSelectedClassFeatures, refreshWizardElements, registerCharacterCreatorAction, registerCharacterCreatorChangeHandler, registerCharacterCreatorInputHandler, registerCharacterLibraryRenderer,
    registerCharacterStepCompletion, registerCharacterStepRenderer, removeAbilityBonusSourcesByPrefix, removeContainerAndContents, removeContainerPreserveContents, removeInnateSpellsBySourcePrefixes,
    removeLastCharacterLevel, removeListProficiencySource, removeListProficiencySourcesByPrefix, removeMulticlassClass, removeSection11Portrait, removeSection12AsiFeatIfUnused,
    removeSection14BackgroundCurrency, removeSection14BackgroundEquipment, removeSection14BackgroundFeature, removeSection15Item, removeSection16CustomFeature, removeSection16CustomSpell,
    removeSkillProficiencySource, removeSkillProficiencySourcesByPrefix, removeSpeciesTrait, renderAbilitiesStep, renderActionBar, renderBackgroundStep,
    renderBasicsStep, renderBuilderView, renderCatalogEntryDetails, renderCharacterLibraryEmptyState, renderCharacterLibraryView, renderClassFeatureMetadata,
    renderClassStep, renderCreatorView, renderEquipmentStep, renderFullCatalogDescription, renderLatestLevelAsiUnlock, renderLatestLevelFeatureUnlocks,
    renderLatestLevelSubclassUnlock, renderLatestLevelUnlockSummary, renderLevelStep, renderLevelUpWorkflow, renderMissingStep, renderMulticlassAdvancementChoiceSummary,
    renderMulticlassClassSummary, renderMulticlassLevelBreakdown, renderMulticlassProgressionEditor, renderMulticlassReadOnlyNotice, renderMulticlassSkillChoices, renderMulticlassStoredChoices,
    renderMulticlassToolChoices, renderReviewStep, renderRulesetMetadata, renderSection11PortraitPanel, renderSection12ArtificerInfusions, renderSection12AsiChoice,
    renderSection12CompactAsiChoice, renderSection12DivineSmiteSlotUsage, renderSection12FeatChoices, renderSection12FeatureMechanics, renderSection12FutureFeatures, renderSection12MulticlassAddStatus,
    renderSection12SelectedClassDetails, renderSection13AbilityScoreDetails, renderSection13AbilitySummary, renderSection13ArmorClassGuide, renderSection13DerivedMechanics, renderSection13HitDice,
    renderSection13HpGuide, renderSection13ManualAbilities, renderSection13MechanicsGuide, renderSection13PointBuy, renderSection13RolledAbilities, renderSection13RolledHpInputs,
    renderSection13StandardArray, renderSection14ExpertiseChoices, renderSection14ProficiencyGuide, renderSection14SourceSkillChoices, renderSection15Catalog, renderSection15ContainerDestinationSelect,
    renderSection15Inventory, renderSection15ItemEditCheckbox, renderSection15ItemEditControls, renderSection15ItemEditInput, renderSection15ItemEditTextarea, renderSection15OpenContainerPanel,
    renderSection16BeginnerGuide, renderSection16CustomSpells, renderSection16DefaultSpellViewer, renderSection16FeatPicker, renderSection16FeatureCards, renderSection16InnateSpells,
    renderSection16SpellSlots, renderSection17Abilities, renderSection17BackgroundChoices, renderSection17BackgroundGrants, renderSection17ClassAndFeatSummary, renderSection17ClassSpells,
    renderSection17ContainerSummary, renderSection17FeatureReviewItem, renderSection17FeatureSummary, renderSection17HitDice, renderSection17InnateSpells, renderSection17Inventory,
    renderSection17List, renderSection17MigrationWarnings, renderSection17PassiveScores, renderSection17SavingThrows, renderSection17Skills, renderSection17SpellcastingSummary,
    renderSection17Warnings, renderSection17WeaponAttacks, renderSelectedClassMechanicsSummary, renderSelectedFeatSummary, renderSkillsStep, renderSpeciesStep,
    renderSpellsStep, renderStepContent, renderStepRail, renderSubclassStep, repairContainerState, replaceDraft,
    replaceSection11Portrait, replaceSection20Draft, resolveClassTemplateForEntry, restoreDraftFromSession, restoreSection16ResourceList, retiredCharacterStepIds,
    rollSection13AbilityScore, rollSection13ScorePool, runCharacterCreatorAction, runCharacterStepRegistrationAudit, runWizardHandlers, safeDisplayString,
    safeNumber, sanitizeDraftStrings, saveSection12ArtificerInfusionState, scheduleDraftPersistence, section16RechargeMatchesRest, section16SelectedSpellSourceIds,
    selectClassTemplate, setAbilityBonusSource, setAbilityScore, setCharacterLevel, setCurrentStep, setDraftValue,
    setFeatRestChoice, setInnateSpellsForSource, setManualProficiencyList, setMulticlassClassLevel, setMulticlassSubclass, setSection11Portrait,
    setSection12ArtificerInfusionTarget, setSection12AsiBonusSource, setSection12AsiChoiceValues, setSection12AsiFeat, setSection12AsiMode, setSection12CustomClassSkillNames,
    setSection12FeatChoiceValues, setSection12FeatureStoredChoices, setSection12MulticlassAddStatus, setSection13AbilityMethod, setSection13HpRollValue, setSection14BackgroundChoiceList,
    setSection14SkillEntry, setSection14StoredSkillChoice, setSimpleDraftField, setSourceProficiencyList, setStatus, skipSection14Background,
    slotsArrayToObject, sourceMatches, splitInventoryStack, startNewDraft, startSection20CharacterCreator, startSection20NewCharacter,
    stopSection19Listener, subtractCurrencyMaps, syncClassLevelOrderToClassLevels, syncEquipmentCurrencyFromSources, syncFirstUnarmoredDefenseSource, syncSection12AdvancementChoice,
    syncSection12ArtificerInfusionsForLevel, syncSection12AsiChoicesForLevel, syncSection14BackgroundFeatures, syncSection16ClassSourceMetadata, syncSection16LegacySpellAliases, syncSection17CompletedSteps,
    toggleMulticlassSkillChoice, toggleMulticlassToolChoice, toggleSection12ArtificerInfusion, toggleSection12ClassFeatureChoice, toggleSection12RageState, toggleSection14Expertise,
    toggleSection14Skill, toggleSection15ItemState, toggleSection16Feat, toggleSection16MysticArcanum, toggleSection16SpellKnown, toggleSection16SpellPrepared,
    tryAddMulticlassClass, uniqueCleanArray, updateSection12CustomClassSkillPicker, updateSection15InventoryItem, uploadSection11PortraitFile, useCustomClassName,
    useCustomSpeciesName, useSpeciesTemplate, validateBuiltinSpeciesBackgroundCatalog, validateContainerState, validateDefaultClassCollection, validateDefaultFeatCollection,
    validateDefaultSpellCatalog, validateDefaultSpellReferences, validateDefaultSubclassCollection, validateFeatPrerequisiteDefinitions, warnDraftStorageFailure, wizardChoiceCard,
    wizardField, wizardRuntime, wizardSelect, wouldCreateContainerCycle, writeRouteToUrl
  });

  const finishStep = createFinishStep({
    beginnerNote,
    clampLevel,
    cleanString,
    escapeHtml,
    formatSavedTime:
      formatSection18SavedTime,
    getCharacterBusyLabel,
    getCharacterPortraitUrl:
      getSection18CharacterPortraitUrl,
    getCreatorState: () => creatorState,
    getFinalizationValidation:
      getSection17FinalizationValidation,
    getRoomCode,
    getSafeBackgroundName,
    getSafeCharacterName,
    getSafeClassName,
    getSafeSpeciesName,
    getSafeSubclassName,
    handleCopyJson:
      handleSection18CopyJson,
    handleCreateLinkedToken:
      handleSection18CreateLinkedToken,
    handleDownloadDraftBackup:
      handleSection18DownloadDraftBackup,
    handleExportJson:
      handleSection18ExportJson,
    handleFinalize:
      handleSection18Finalize,
    handleImportFile:
      handleSection18ImportFile,
    handleImportText:
      handleSection18ImportText,
    handleSave:
      handleSection18Save,
    handleSaveCopy:
      handleSection18SaveCopy,
    handleStepFileChange:
      handleSection18Change,
    isCharacterCreatorBusy,
    isSaveComplete:
      isSection18PersistenceComplete,
    navigateToLibrary,
    openCharacterSheet:
      handleSection17OpenCharacterSheet,
    renderFinalizationWarnings:
      renderSection17Warnings,
    safeNumber,
    tokenDependencies: deps,
    wizardField
  });

  const {
    isSection18SaveComplete,
    renderSaveStep,
    renderSection18BackupNotice,
    renderSection18LinkedTokenPanel,
    renderSection18Warnings
  } = finishStep.compatibility;

  registerCharacterStepRenderer(
    "save",
    finishStep.renderStep
  );

  registerCharacterStepCompletion(
    "save",
    finishStep.isStepComplete
  );

  finishStep.actions.forEach((action) => {
    registerCharacterCreatorAction(
      action,
      (context) => {
        return finishStep.handleStepClick(
          context
        );
      }
    );
  });

  registerCharacterCreatorChangeHandler(
    (context) => {
      return finishStep.handleStepChange(
        context
      );
    }
  );

  runCharacterStepRegistrationAudit();

// =====================================================
// CHARACTER CREATOR SECTION 19 - PERMANENT FIRESTORE CONNECTIONS / CLEANUP
// =====================================================

  function getSection19CollectionName(
    primaryOption,
    secondaryOption,
    fallback
  ) {
    return cleanString(
      options?.[primaryOption] ||
      options?.[secondaryOption],
      fallback
    );
  }

  function getSection19RoomCollection(
    collectionName
  ) {
    const roomCode = getRoomCode();

    if (!roomCode) {
      throw new Error(
        "Open a room before loading character creator data."
      );
    }

    if (!hasFirestoreTools()) {
      throw new Error(
        "The character creator is missing its Firestore tools."
      );
    }

    return deps.collection(
      deps.db,
      "rooms",
      roomCode,
      collectionName
    );
  }

  function readSection19SnapshotRecords(
    snapshot
  ) {
    const docs = Array.isArray(snapshot?.docs)
      ? snapshot.docs
      : [];

    return docs.map((documentSnapshot) => {
      const data =
        typeof documentSnapshot.data === "function"
          ? documentSnapshot.data()
          : {};

      const docId =
        String(
          documentSnapshot.id ||
          data?.docId ||
          data?.id ||
          ""
        );

      return {
        ...(data || {}),
        id: data?.id || docId,
        docId
      };
    });
  }

  function normalizeSection19CharacterRecord(
    record
  ) {
    const firestoreDocumentId =
      cleanString(
        record?.docId ||
        record?.firestoreDocumentId ||
        record?.id
      );

    const internalDataId =
      cleanString(record?.id);

    const normalized =
      normalizeCharacter({
        ...record,
        id: firestoreDocumentId
      });

    normalized.id =
      firestoreDocumentId;

    normalized.docId =
      firestoreDocumentId;

    normalized.firestoreDocumentId =
      firestoreDocumentId;

    if (
      internalDataId &&
      internalDataId !== firestoreDocumentId
    ) {
      normalized.internalDataId =
        internalDataId;
    }

    const recordRevisionMillis =
      getSection18RecordRevisionMillis(
        record
      );

    if (
      recordRevisionMillis > 0 &&
      !safeNumber(
        normalized.builder
          ?.lastSavedAtMillis,
        0
      )
    ) {
      normalized.builder =
        normalized.builder || {};

      normalized.builder.lastSavedAtMillis =
        recordRevisionMillis;
    }

    return normalized;
  }

  function normalizeSection19ClassRecord(
    record
  ) {
    const normalized = normalizeClassTemplate(
      {
        ...record,
        id: record.id || record.docId,
        docId: record.docId || record.id || null
      },
      "homebrew"
    );

    normalized.docId =
      record.docId ||
      normalized.docId ||
      null;

    return normalized;
  }

  function normalizeSection19SpeciesRecord(
    record
  ) {
    const name = safeDisplayString(
      record.name,
      "Custom Species"
    );

    return {
      ...cloneData(record),

      id: makeSafeId(
        record.id ||
        record.docId ||
        name,
        "custom-species"
      ),

      docId:
        record.docId ||
        record.id ||
        null,

      name,

      source: safeDisplayString(
        record.source,
        "homebrew"
      ),

      summary: safeDisplayString(
        record.summary ||
        record.description,
        "No description provided."
      ),

      size: safeDisplayString(
        record.size,
        "medium"
      ),

      speed: Math.max(
        0,
        safeNumber(
          record.speed ??
          record.walkSpeed,
          30
        )
      ),

      traits: Array.isArray(record.traits)
        ? cloneData(record.traits)
        : []
    };
  }

  function normalizeSection19BackgroundRecord(
    record
  ) {
    const normalized =
      normalizeSection14Background(
        {
          ...record,
          id: record.id || record.docId,
          docId: record.docId || record.id || null
        },
        "homebrew"
      );

    normalized.docId =
      record.docId ||
      normalized.docId ||
      null;

    return normalized;
  }

  function stopSection19Listener(
    unsubscribeKey,
    roomKey,
    cacheKey
  ) {
    const unsubscribe =
      creatorState[unsubscribeKey];

    if (typeof unsubscribe === "function") {
      try {
        unsubscribe();
      } catch (error) {
        console.warn(
          "Could not stop character creator listener:",
          error
        );
      }
    }

    creatorState[unsubscribeKey] = null;
    creatorState[roomKey] = null;

    if (cacheKey) {
      creatorState[cacheKey] = [];
    }
  }

  function refreshCreatorForSection19Cache(
    cacheKey
  ) {
    if (!wizardRuntime.shellBuilt) {
      return;
    }

    if (
      creatorState.viewMode === "library"
    ) {
      if (cacheKey === "characterCache") {
        renderCreatorView();
      }

      return;
    }

    const affectedSteps = {
      roomClassCache: ["class", "subclass"],
      roomSpeciesCache: ["species"],
      roomBackgroundCache: ["background"]
    }[cacheKey] || [];

    if (
      affectedSteps.includes(
        creatorState.currentStepId
      )
    ) {
      renderCurrentStep();
    }
  }

  function connectSection19Listener({
    label,
    collectionName,
    roomKey,
    unsubscribeKey,
    cacheKey,
    normalizeRecord,
    optional = false
  }) {
    const roomCode = getRoomCode();

    if (!roomCode || !hasFirestoreTools()) {
      stopSection19Listener(
        unsubscribeKey,
        roomKey,
        cacheKey
      );

      return false;
    }

    if (
      creatorState[roomKey] === roomCode &&
      typeof creatorState[unsubscribeKey] ===
        "function"
    ) {
      return true;
    }

    stopSection19Listener(
      unsubscribeKey,
      roomKey,
      cacheKey
    );

    creatorState[roomKey] = roomCode;

    try {
      creatorState[unsubscribeKey] =
        deps.onSnapshot(
          getSection19RoomCollection(
            collectionName
          ),

          (snapshot) => {
            creatorState[cacheKey] =
              readSection19SnapshotRecords(
                snapshot
              ).map(normalizeRecord);

            refreshCreatorForSection19Cache(
              cacheKey
            );
          },

          (error) => {
            const permissionDenied =
              error?.code === "permission-denied";

            creatorState[cacheKey] = [];

            stopSection19Listener(
              unsubscribeKey,
              roomKey,
              cacheKey
            );

            if (optional && permissionDenied) {
              console.warn(
                `Optional room ${label} unavailable due to permissions. Default character creator templates still work.`,
                error
              );
            } else if (optional) {
              console.warn(
                `Optional room ${label} could not be loaded. Default character creator templates still work.`,
                error
              );

              setStatus(
                `Could not load optional room ${label}; using defaults.`
              );
            } else {
              console.error(
                `Could not load character creator ${label}:`,
                error
              );

              setStatus(
                `Could not load ${label}.`
              );
            }

            refreshCreatorForSection19Cache(
              cacheKey
            );
          }
        );

      return true;
    } catch (error) {
      const permissionDenied =
        error?.code === "permission-denied";

      if (optional && permissionDenied) {
        console.warn(
          `Optional room ${label} listener unavailable due to permissions. Default character creator templates still work.`,
          error
        );
      } else if (optional) {
        console.warn(
          `Optional room ${label} listener could not start. Default character creator templates still work.`,
          error
        );

        setStatus(
          `Could not connect optional room ${label}; using defaults.`
        );
      } else {
        console.error(
          `Could not start character creator ${label} listener:`,
          error
        );

        setStatus(
          `Could not connect ${label}.`
        );
      }

      stopSection19Listener(
        unsubscribeKey,
        roomKey,
        cacheKey
      );

      return false;
    }
  }

  function connectSection19Characters() {
    return connectSection19Listener({
      label: "characters",

      collectionName:
        getSection18CharacterCollectionName(),

      roomKey: "characterRoomCode",
      unsubscribeKey: "characterUnsubscribe",
      cacheKey: "characterCache",
      normalizeRecord:
        normalizeSection19CharacterRecord
    });
  }

  function connectSection19Classes() {
    return connectSection19Listener({
      label: "class templates",

      collectionName:
        getSection19CollectionName(
          "classCollectionName",
          "classTemplatesCollectionName",
          "classes"
        ),

      roomKey: "classRoomCode",
      unsubscribeKey: "classUnsubscribe",
      cacheKey: "roomClassCache",
      normalizeRecord:
        normalizeSection19ClassRecord,
      optional: true
    });
  }

  function connectSection19Species() {
    return connectSection19Listener({
      label: "species templates",

      collectionName:
        getSection19CollectionName(
          "speciesCollectionName",
          "speciesTemplatesCollectionName",
          "species"
        ),

      roomKey: "speciesRoomCode",
      unsubscribeKey: "speciesUnsubscribe",
      cacheKey: "roomSpeciesCache",
      normalizeRecord:
        normalizeSection19SpeciesRecord,
      optional: true
    });
  }

  function connectSection19Backgrounds() {
    return connectSection19Listener({
      label: "background templates",

      collectionName:
        getSection19CollectionName(
          "backgroundCollectionName",
          "backgroundTemplatesCollectionName",
          "backgrounds"
        ),

      roomKey: "backgroundRoomCode",
      unsubscribeKey: "backgroundUnsubscribe",
      cacheKey: "roomBackgroundCache",
      normalizeRecord:
        normalizeSection19BackgroundRecord,
      optional: true
    });
  }

  function connectSection19PermanentListeners() {
    connectSection19Characters();
    connectSection19Classes();
    connectSection19Species();
    connectSection19Backgrounds();
  }

  function cleanupSection19PermanentListeners() {
    stopSection19Listener(
      "characterUnsubscribe",
      "characterRoomCode",
      "characterCache"
    );

    stopSection19Listener(
      "classUnsubscribe",
      "classRoomCode",
      "roomClassCache"
    );

    stopSection19Listener(
      "speciesUnsubscribe",
      "speciesRoomCode",
      "roomSpeciesCache"
    );

    stopSection19Listener(
      "backgroundUnsubscribe",
      "backgroundRoomCode",
      "roomBackgroundCache"
    );
  }


// =====================================================
// CHARACTER CREATOR SECTION 20 - STARTUP / INITIALIZATION / RETURNED API
// =====================================================

  function disconnectSection20Routing() {
    if (
      wizardRuntime
        .popstateConnected
    ) {
      window.removeEventListener(
        "popstate",
        handleBrowserRouteChange
      );

      wizardRuntime.popstateConnected =
        false;
    }
  }

  function refreshSection20CharacterCreator() {
    if (!isCharacterCreatorRoute()) {
      return creatorState;
    }

    refreshElements();
    connectSection19PermanentListeners();
    renderCreatorView();

    return creatorState;
  }

  function startSection20CharacterCreator() {
    wizardRuntime.destroyed = false;

    if (!isCharacterCreatorRoute()) {
      return creatorState;
    }

    refreshElements();
    ensureWizardStyles();
    installCharacterCreatorTextInputGuard({
      root: document
    });
    connectDraftPersistenceLifecycle();
    connectPopstateRouting();
    connectSection19PermanentListeners();

    if (
      !wizardRuntime
        .initialRouteApplied
    ) {
      applyInitialRoute();

      wizardRuntime.initialRouteApplied =
        true;
    }

    renderCreatorView();

    return creatorState;
  }

  function cleanupSection20CharacterCreator() {
    wizardRuntime.destroyed = true;

    disconnectDraftPersistenceLifecycle();
    disconnectWizardEvents();
    disconnectSection20Routing();
    cleanupSection19PermanentListeners();

    return creatorState;
  }

  function startSection20NewCharacter() {
    if (
      !confirmDiscardUnsavedDraft(
        "starting a new character"
      )
    ) {
      return creatorState.draft;
    }

    clearStoredDraft();
    startNewDraft();

    creatorState.draft =
      sanitizeDraftStrings(
        creatorState.draft
      );

    persistDraftToSession();
    navigateToStep("basics");

    return creatorState.draft;
  }

  function replaceSection20Draft(
    character,
    options = {}
  ) {
    if (
      options.skipDiscardGuard !== true &&
      !confirmDiscardUnsavedDraft(
        "replacing the current draft"
      )
    ) {
      return creatorState.draft;
    }

    const draft =
      replaceDraft(
        character,
        options
      );

    creatorState.draft =
      sanitizeDraftStrings(
        creatorState.draft
      );

    persistDraftToSession();
    renderCreatorView();

    return draft;
  }

  function bootSection20WhenReady() {
    if (!isCharacterCreatorRoute()) {
      return false;
    }

    if (
      typeof document !== "undefined" &&
      document.readyState === "loading"
    ) {
      document.addEventListener(
        "DOMContentLoaded",
        startSection20CharacterCreator,
        { once: true }
      );

      return false;
    }

    startSection20CharacterCreator();

    return true;
  }

  bootSection20WhenReady();

  return {
    state: creatorState,
    steps: BUILDER_STEPS,

    init: startSection20CharacterCreator,
    start: startSection20CharacterCreator,
    refresh: refreshSection20CharacterCreator,
    render: renderCreatorView,
    cleanup: cleanupSection20CharacterCreator,
    destroy: cleanupSection20CharacterCreator,

    openLibrary: navigateToLibrary,
    navigateToStep,
    startNew: startSection20NewCharacter,
    replaceDraft: replaceSection20Draft,

    getState() {
      return creatorState;
    },

    getDraft() {
      return creatorState.draft;
    },

    getCharacter() {
      return getCharacterSnapshot();
    },

    getRenderMetrics() {
      return {
        fullRenderCount:
          wizardRuntime.fullRenderCount,
        currentStepRenderCount:
          wizardRuntime.currentStepRenderCount,
        stepRailRebuildCount:
          wizardRuntime.stepRailRebuildCount,
        stepRailStateUpdateCount:
          wizardRuntime.stepRailStateUpdateCount,
        lightweightFieldUpdateCount:
          wizardRuntime.lightweightFieldUpdateCount,
        inputScheduleCount:
          creatorInputDebounceRuntime.scheduleCount,
        inputFlushCount:
          creatorInputDebounceRuntime.flushCount,
        pendingInputCount:
          creatorInputDebounceRuntime.entries.size,
        draftScheduleCount:
          draftPersistenceRuntime.scheduleCount,
        draftFlushCount:
          draftPersistenceRuntime.flushCount,
        draftStorageWriteCount:
          draftPersistenceRuntime.storageWriteCount,
        pendingDraftPersistence:
          draftPersistenceRuntime.targets !== null,
        derivedCache:
          derivedCache.getMetrics()
      };
    },

    getDerivedCacheMetrics() {
      return derivedCache.getMetrics();
    },

    getClassAsiLevels,
    getUnlockedFeatChoiceSlots,
    takeRest:
      performSection16Rest,
    adjustHitDie:
      adjustSection16HitDieUsage,

    save: handleSection18Save,
    saveCopy: handleSection18SaveCopy,
    finalize: handleSection18Finalize,
    createLinkedToken:
      handleSection18CreateLinkedToken,
    getFinalizationValidation:
      getSection17FinalizationValidation,
    copyJson: copySection18Json,
    exportJson: exportSection18Json,
    downloadDraftBackup:
      handleSection18DownloadDraftBackup,
    importJson: importSection18JsonText,

    connectListeners:
      connectSection19PermanentListeners,
    cleanupListeners:
      cleanupSection19PermanentListeners,

    runRulesSelfTests:
      runSrd2014RulesSelfTests
  };
}
