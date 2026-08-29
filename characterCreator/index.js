YªçŠx-®éÜj×¢ëiºÚ+Š§j[h‘éÜ¢éíßo7ç­ºãÎ:o+^²‰¢¶×// =====================================================
// CHARACTER CREATOR.JS â€” HOMEBREW GOD CHARACTER CREATOR
// Batch 1 of 4: permanent foundation sections 1 through 5.
// Plain HTML/CSS/JS module â€” no React.
// =====================================================


// =====================================================
// CHARACTER CREATOR SECTION 1 â€” MODULE / DEPENDENCIES
// =====================================================

import {
  DEFAULT_CLASSES,
  DEFAULT_CLASS_SCHEMA_VERSION,
  validateDefaultClassCollection
} from "../data/defaultClasses.js";
import {
  DEFAULT_FIGHTING_STYLE_EFFECTS,
  DEFAULT_INVOCATION_DETAILS,
  DEFAULT_MANEUVER_DETAILS,
  DEFAULT_METAMAGIC_DETAILS
} from "../data/defaultClassFeatureRules.js";
import {
  DEFAULT_FEATS,
  DEFAULT_FEAT_ABILITY_SCORE_MAXIMUM,
  validateDefaultFeatCollection,
  validateFeatPrerequisiteDefinitions
} from "../data/defaultFeats.js";
import {
  ADDITIONAL_CANTRIP_EXPECTATIONS_2014,
  ADDITIONAL_CANTRIP_IDS_2014,
  ADDITIONAL_CANTRIP_COUNT_2014,
  DEFAULT_SPELLS,
  SRD_SPELL_COUNT_2014,
  validateDefaultSpellCatalog,
  validateDefaultSpellReferences
} from "../data/defaultSpells.js?v=phase15-20260726";
import {
  DEFAULT_SUBCLASSES,
  validateDefaultSubclassCollection
} from "../data/defaultSubclasses.js";
import {
  createCharacterSheetJson,
  createCharacterSheetView
} from "../characterSheet/index.js";
import {
  ACTIVE_RULESET,
  getLegacy2014Metadata,
  isActiveRulesetEntry
} from "../data/ruleset2014.js?v=phase15-20260726";
import {
  BUILTIN_BACKGROUND_2014_EXPECTATIONS,
  BUILTIN_BACKGROUND_IDS_2014,
  BUILTIN_SPECIES_2014_EXPECTATIONS,
  BUILTIN_SPECIES_IDS_2014,
  BUILTIN_SUBRACE_2014_EXPECTATIONS,
  enrichBuiltinBackgroundTemplate,
  enrichBuiltinSpeciesTemplate,
  validateBuiltinSpeciesBackgroundCatalog
} from "../data/defaultSpeciesBackgroundContent.js?v=phase14-20260726";
import {
  assertCharacterMutationAccess,
  friendlyServiceError
} from "../shared/securityPersistence.js";

import { createCharacterCatalogs } from "./catalogs.js";
import { createCharacterPersistence } from "./persistence.js";
import { runCharacterCreatorSelfTests } from "./selfTests.js";
import {
  getProgressionValueByLevel,
  SRD_2014_FIGHTER_ASI_LEVELS,
  SRD_2014_ROGUE_ASI_LEVELS,
  SRD_2014_STANDARD_ASI_LEVELS
} from "./classProgression.js";
import {
  getClassFeaturesThroughLevel
} from "./classMechanics.js";
import {
  createFeatSpellSourceMetadata, decodeFeatChoiceValue, describeFeatSpellChoiceRestrictions,
  encodeFeatChoiceValue, FEAT_CHOICE_VALUE_PREFIX, getFeatAbilityEffectMaximum,
  getFeatSpellChoiceLimit, isSpellEligibleForFeatChoice, normalizeFeatChoiceSelections,
  parseFeatChoiceSelections
} from "./featMechanics.js";
import {
  MULTICLASS_PREREQUISITES,
  MULTICLASS_PROFICIENCY_GRANTS,
  planMulticlassLevelSplit
} from "./multiclassing.js?v=multiclass-flow-20260825";
import {
  normalizeCharacterEnvelope
} from "./normalization.js";
import { renderInnateSpellCards } from "./innateSpellPresentation.js";
import { renderMagicalSecretsPanels } from "./magicalSecrets.js";
import { escapeHtml } from "./rendering.js";
import { getCreatorSpellSearchText, renderCreatorSpellPickerResults } from "./spellPicker.js";
import {
  createCatalogPage,
  CREATOR_CATALOG_BATCH_SIZE
} from "./catalogPagination.js";
import { createClassStep } from "./steps/classStep.js?v=dm-preview-class-state-20260829";
import { createMulticlassStep } from "./steps/multiclassStep.js?v=dm-preview-class-state-20260829";
import { createFeatsStep } from "./steps/featsStep.js?v=dm-preview-class-state-20260829";
import { createSpeciesStep } from "./steps/speciesStep.js?v=dm-preview-class-state-20260829";
import { createBackgroundStep } from "./steps/backgroundStep.js?v=dm-preview-class-state-20260829";
import { createAbilitiesStep } from "./steps/abilitiesStep.js?v=dm-preview-class-state-20260829";
import { createSkillsStep } from "./steps/skillsStep.js?v=dm-preview-class-state-20260829";
import { createDescriptionStep } from "./steps/descriptionStep.js?v=dm-preview-class-state-20260829";
import { createBasicsStep } from "./steps/basicsStep.js?v=dm-preview-class-state-20260829";
import { createReviewStep } from "./steps/reviewStep.js?v=dm-preview-class-state-20260829";
import { createFinishStep } from "./steps/finishStep.js?v=dm-preview-class-state-20260829";
import { createEquipmentStep } from "./steps/equipmentStep.js?v=dm-preview-class-state-20260829";
import { createSpellsStep } from "./steps/spellsStep.js?v=dm-preview-class-state-20260829";
import {
  calculateAbilityModifier,
  calculateAbilityModifiers,
  calculateCharacterCarryingCapacity,
  calculateProficiencyBonus as getGenericProficiencyBonus,
  calculateRuleCarryingCapacity,
  calculateRuleFixedAverageHp,
  calculateRuleManualHp,
  calculateRulePassiveScore,
  calculateRuleRolledHp,
  calculateRuleSavingThrowModifier,
  calculateRuleSkillModifier,
  calculateRuleSpellAttackBonus,
  calculateRuleSpellSaveDc,
  deriveAbilityBaseFromFinalScores,
  SRD_2014_SIZE_CARRY_MULTIPLIERS
} from "./rulesMath.js";
import {
  calculateSrd2014MulticlassSpellcasting,
  getSrd2014PactMagic,
  getSrd2014SpellSlots,
  slotsArrayToObject,
  SRD_2014_FULL_CASTER_SLOTS,
  SRD_2014_PACT_MAGIC
} from "./spellcasting.js";
import { adjustCanonicalSpellResource, clearMagicalSecretsCompatibilitySources, getCanonicalSpellSources, normalizeSpellSources, restoreCanonicalSpellResources, SPELL_SOURCE_MODEL_VERSION, storeMagicalSecretsCompatibilitySource, synchronizeCanonicalSpellSources } from "./spellSources.js?v=canonical-spell-sources-20260802";
import {
  mergeSubclassFeatureLevels
} from "./subclassMechanics.js";
import {
  normalizeSpeciesBackgroundChoices
} from "./speciesBackgrounds.js";
import {
  applyCharacterCreatorFieldLimits,
  getCharacterFieldLimit,
  installCharacterCreatorTextInputGuard,
  normalizeCharacterTextFields,
  truncateUnicode
} from "./fieldLimits.js?v=creator-fix-pass-20260730";
import { applyDerivedMovementSpeeds, normalizeCharacterWalkingSpeed, normalizeMovementSpeed }
  from "./walkingSpeed.js?v=creator-fix-pass-20260730";
import { deleteSelectedRoomClass, readCustomClassMovementEffects, renderCustomClassMovementFields }
  from "./customClassTools.js?v=creator-fix-pass-20260730";
import {
  countCharacterAttunedItems,
  getCharacterAttunementLimit,
  normalizeInventoryItemBase
} from "./inventoryEquipment.js";
import {
  createDerivedSignature,
  createScopedDerivedCache,
  getDerivedObjectIdentity
} from "./derivedCache.js";
import {
  createRealtimeListenerRegistry
} from "../shared/realtimeListeners.js";
import {
  BUILDER_STEPS,
  BUILDER_STEP_INDEX,
  clampStepIndex,
  getExactBuilderStepById,
  getStepById,
  getStepIndex
} from "./configuration.js";
import {
  createCharacterRealtimePersistence,
  readRealtimeSnapshotRecords
} from "./realtimePersistence.js";
import {
  createCharacterReviewServices,
  createCreatorSharedServices,
  createStepWarningCollector
} from "./stepServices.js";
import {
  applyGameplayAction,
  ensureGameplayState
} from "../characterSheet/gameplayState.js";
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

    targetSpellOnMap:
      options.targetSpellOnMap,

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
  const section19Listeners =
    createRealtimeListenerRegistry({
      onStopError: (error) => {
        console.warn(
          "Could not stop character creator listener:",
          error
        );
      }
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
// CHARACTER CREATOR SECTION 3 â€” CHARACTER DATA SCHEMA
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
      // until Sections 6â€“20 are installed.
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
// CHARACTER CREATOR SECTION 4 â€” DEFAULT TEMPLATE DATA
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
            label: `Advancement Choice â€” ${className} Level ${level}`,
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
      collectSection12Features, collectSection12FeaturesForClassEntry, confirmDiscardUnsavedDraft, connectDraftPersistenceLifecycle, connectPopstateRouting,
      connectSection19PermanentListeners, connectWizardEvents,
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
      getSection18RecordRevisionMillis, getSection18RecordRoomCode, getSection18RecordType, getSection18TimestampMillis, getSection19CollectionName,
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
      prepareSection18Character, pruneAbandonedClassFeatureChoices, pruneRemovedClassSpellSources, readDraftStorageRecord, readRealtimeSnapshotRecords, readSection11PortraitFileAsDataUrl,
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
      splitInventoryStack, startNewDraft, startSection20CharacterCreator, startSection20NewCharacter, subtractCurrencyMaps,
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
// CHARACTER CREATOR SECTION 5 â€” CREATOR STATE / DRAFT MANAGEMENT
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

    roomClassCache: [],
    classRoomCode: null,

    roomSpeciesCache: [],
    speciesRoomCode: null,

    roomBackgroundCache: [],
    backgroundRoomCode: null
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

      return `${effect.featureName} â€” ${actionLabel}.${saveLabel}`;
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
                          â€” ${escapeHtml(String(record.spellcastingAbility || "").toUpperCase())};
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
                          <b>${escapeHtml(`${handlingLabel} Â· ${economyLabel}${timingLabel ? ` (${timingLabel})` : ""}`)}</b>
                          â€” ${escapeHtml(entry.summary)}
                          <br><span>${escapeHtml(`Recharge: ${rechargeLabel}${usageLabel ? ` Â· ${usageLabel}` : ""}`)}</span>
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
  ×myÚÚ$z{-®éÜj×G¶–ç7Fæ6Ræ–GÓ§Ææ"×&W6—7Fæ6VÀÐ¢¶–æC Ð¢'Ææ%66–öâ Ð¢Ò“°Ð¢FDfVE7VÆÅ&V6÷&G2‡°Ð¢FW67&—F÷#¢°Ð¢Ev–ÆÃ¢G'VRÀÐ¢&–Æ—G”6†ö–6T–C Ð¢6ÆVå7G&–ær€Ð¢VffV7@Ð¢æ&–Æ—G”6†ö–6T–BÀÐ¢'7VÆÆ67F–ærÖ&–Æ—G’ Ð¢’ÀÐ¢æôÖFW&–Ä6ö×öæVçG3 Ð¢G'VPÐ¢ÒÀÐ¢÷&–v–ã Ð¢'Ææ"×66–öâ"ÀÐ¢6†ö–6T–C Ð¢6ÆVå7G&–ær€Ð¢VffV7Bæ6†ö–6T–BÀÐ¢&÷WFW"×ÆæR Ð¢’ÀÐ¢–G3¢°Ð¢&VæVf—@Ð¢ç7VÆÄ–@Ð¢ÐÐ¢Ò“°Ð¢ÐÐ¢ÐÐ Ð¢–b‡G—RÓÓÒ&v–çE7G&–¶R"’°Ð¢6öç7B6VÆV7FVE7G&–¶RÐÐ¢6ÆVå7G&–ær€Ð¢6†ö–6W5°Ð¢VffV7Bæ6†ö–6T–BÇÀÐ¢&v–çB×7G&–¶R Ð¢Óòå³ÐÐ¢“°Ð¢6öç7BFWF–Ç2ÐÐ¢v–çE7G&–¶TFWF–Ç5°Ð¢Ö¶U6fT–B€Ð¢6VÆV7FVE7G&–¶RÀÐ¢" Ð¢Ð¢Ó°Ð Ð¢–b€Ð¢6VÆV7FVE7G&–¶Rb`Ð¢FWF–Ç0Ð¢’°Ð¢ÖV6†æ–72æ7F–öç2çW6‚‡°Ð¢–C Ð¢G¶–ç7Fæ6Ræ–GÓ¦v–çB×7G&–¶VÀÐ¢fVD–C¢fVBæ–BÀÐ¢fVDæÖS¢fVBææÖRÀÐ¢6÷W&6T–C¢–ç7Fæ6Ræ–BÀÐ¢æÖS Ð¢6VÆV7FVE7G&–¶RÀÐ¢7F—fF–öã Ð¢$öæ6RW"GW&âöâÖVÆVR÷"F‡&÷vâ×vVöâ†—B"ÀÐ¢&W6÷W&6T–C Ð¢G¶–ç7Fæ6Ræ–GÓ¦v–çB×7G&–¶VÀÐ¢FÖvS Ð¢FWF–Ç2æFÖvRÀÐ¢7VÖÖ'“ Ð¢FWF–Ç2ç7VÖÖ'Ð¢Ò“°Ð¢ÐÐ¢ÐÐ Ð¢–b‡G—RÓÓÒ'Væ&ÖVDFÖvR"’°Ð¢ÖV6†æ–72æ6öÖ&E&öf–ÆW2çW6‚‡°Ð¢–C Ð¢G¶–ç7Fæ6Ræ–GÓ§Væ&ÖVBÖFÖvVÀÐ¢fVD–C¢fVBæ–BÀÐ¢fVDæÖS¢fVBææÖRÀÐ¢6÷W&6T–C¢–ç7Fæ6Ræ–BÀÐ¢G—S Ð¢'Væ&ÖVDFÖvR"ÀÐ¢F–S Ð¢6ÆVå7G&–ær€Ð¢VffV7BæF–RÀÐ¢&CB Ð¢Ð¢Ò“°Ð¢ÐÐ Ð¢–b‡G—RÓÓÒ'FVÆWF‡’"’°Ð¢ÖV6†æ–72çFVÆWF‡’çW6‚‡°Ð¢–C Ð¢G¶–ç7Fæ6Ræ–GÓ§FVÆWF‡–ÀÐ¢fVD–C¢fVBæ–BÀÐ¢fVDæÖS¢fVBææÖRÀÐ¢6÷W&6T–C¢–ç7Fæ6Ræ–BÀÐ¢&ævS Ð¢ÖF‚æÖ‚€Ð¢ÀÐ¢6fTçVÖ&W"€Ð¢VffV7Bç&ævRÀÐ¢ Ð¢Ð¢’ÀÐ¢&W7öç6U&WV—&VE6†&VDÆæwVvS Ð¢VffV7@Ð¢ç&W7öç6U&WV—&VE6†&VDÆæwVvRÓÓÐÐ¢G'VRÀÐ¢öæUv“ Ð¢G'VPÐ¢Ò“°Ð¢ÐÐ Ð¢–b‡G—RÓÓÒ&†VÆ–æt&öçW2"’°Ð¢6öç7BfÇVRÐÐ¢VffV7BçfÇVRÓÓÐÐ¢'&öf–6–Væ7”&öçW2 Ð¢òvWD6†&7FW%&öf–6–Væ7”&öçW2€Ð¢G&g@Ð¢Ð¢¢ÖF‚æÖ‚€Ð¢ÀÐ¢6fTçVÖ&W"€Ð¢VffV7BçfÇVRÀÐ¢ Ð¢Ð¢“°Ð Ð¢ÖV6†æ–72æ†VÆ–æt&öçW6W2çW6‚‡°Ð¢–C Ð¢G¶–ç7Fæ6Ræ–GÓ¦†VÆ–ærÖ&öçW6ÀÐ¢fVD–C¢fVBæ–BÀÐ¢fVDæÖS¢fVBææÖRÀÐ¢6÷W&6T–C¢–ç7Fæ6Ræ–BÀÐ¢fÇVRÀÐ¢f÷&×VÆ Ð¢6ÆVå7G&–ær€Ð¢VffV7BçfÇVPÐ¢’ÀÐ¢6÷W&6W3 Ð¢Væ—VT6ÆVä'&’€Ð¢VffV7Bç6÷W&6W0Ð¢Ð¢Ò“°Ð¢ÐÐ Ð¢–b‡G—RÓÓÒ'&W6÷W&6R"’°Ð¢6öç7BÖ†–×VÕW6W2ÒVffV7BçW6W2ÓÓÒ'&öf–6–Væ7”&öçW2 Ð¢òvWD6†&7FW%&öf–6–Væ7”&öçW2†G&gBÐ¢¢ÖF‚æÖ‚ƒÂ6fTçVÖ&W"†VffV7BçW6W2Â’“°Ð¢6öç7B&W6÷W&6T–BÒG¶–ç7Fæ6Ræ–GÓ¢G¶VffV7Bæ–GÖ°Ð¢6öç7B&Wf–÷W2Ò&Wf–÷W5&W6÷W&6W5·&W6÷W&6T–EÓ°Ð Ð¢ÖV6†æ–72ç&W6÷W&6W2çW6‚‡°Ð¢–C¢&W6÷W&6T–BÀÐ¢fVD–C¢fVBæ–BÀÐ¢fVDæÖS¢fVBææÖRÀÐ¢&W6÷W&6T–C¢VffV7Bæ–BÀÐ¢æÖS¢VffV7BæÆ&VÂÇÂVffV7Bæ–BÀÐ¢Ö†–×VÕW6W2ÀÐ¢7W'&VçEW6W3¢ÖF‚æÖ–â€Ð¢Ö†–×VÕW6W2ÀÐ¢ÖF‚æÖ‚ƒÂ6fTçVÖ&W"‡&Wf–÷W3òæ7W'&VçEW6W2ÂÖ†–×VÕW6W2’Ð¢’ÀÐ¢&V6†&vS¢VffV7Bç&V6†&vRÇÂ&Æöæu&W7B"ÀÐ¢F–S¢VffV7BæF–RÇÂ" Ð¢Ò“°Ð¢ÐÐ Ð¢–b‡G—RÓÓÒ'7VÆÄw&çB"’°Ð¢6öç7B–G2ÒVæ—VT6ÆVä'&’†VffV7Bç7VÆÄ–G2ÇÂ¶VffV7Bç7VÆÄ–EÒ“°Ð¢7VÆÄw&çG2çW6‚‡²ââæVffV7BÂ7VÆÄ–G3¢–G2Ò“°Ð¢FDfVE7VÆÅ&V6÷&G2‡°Ð¢FW67&—F÷#¢VffV7BÀÐ¢÷&–v–ã¢&w&çB"ÀÐ¢–G0Ð¢Ò“°Ð¢ÐÐ Ð¢–b‡G—RÓÓÒ&7W7FöÒ"bbVffV7Bç7VÖÖ'’’°Ð¢6öç7B6—GVF–öæÄ–BÐÐ¢G¶–ç7Fæ6Ræ–GÓ¢G¶VffV7Bæ–GÖ°Ð¢6öç7B†æFÆ–ærÐÐ¢²&WFöÖF–2"Â'G&6¶VB"Â&ÖçVÂ%ÐÐ¢æ–æ6ÇVFW2†VffV7Bæ†æFÆ–ærÐ¢òVffV7Bæ†æFÆ–æpÐ¢¢"#°Ð Ð¢–b††æFÆ–ær’°Ð¢6öç7B7F–öäV6öæö×’ÐÐ¢²&7F–öâ"Â&&öçW47F–öâ"Â'&V7F–öâ"Â'76—fR%ÐÐ¢æ–æ6ÇVFW2†VffV7Bæ7F–öäV6öæö×’Ð¢òVffV7Bæ7F–öäV6öæö×Ð¢¢'76—fR#°Ð¢6öç7B6V7F–öâÐÐ¢²&GF6²"Â&FVfVç6R"Â'WF–Æ—G’%ÐÐ¢æ–æ6ÇVFW2†VffV7Bç6V7F–öâÐ¢òVffV7Bç6V7F–öàÐ¢¢'WF–Æ—G’#°Ð¢6öç7BW6vRÐÐ¢VffV7BçW6vRb`Ð¢G—VöbVffV7BçW6vRÓÓÒ&ö&¦V7B"b`Ð¢'&’æ—4'&’†VffV7BçW6vRÐ¢ò6ÆöæTFF†VffV7BçW6vRÐ¢¢çVÆÃ°Ð¢6öç7BÖ†–×VÕW6W2ÐÐ¢W6vRb`Ð¢W6vRç66÷RÓÓÒ'6VÆb Ð¢òÖF‚æÖ‚€Ð¢ÀÐ¢6fTçVÖ&W"€Ð¢W6vRæÖ†–×VÕW6W2ÀÐ¢ Ð¢Ð¢Ð¢¢°Ð Ð¢ÖV6†æ–72ç6—GVF–öæÄVffV7G2çW6‚‡°Ð¢–C¢6—GVF–öæÄ–BÀÐ¢fVD–C¢fVBæ–BÀÐ¢fVDæÖS¢fVBææÖRÀÐ¢6÷W&6T–C¢–ç7Fæ6Ræ–BÀÐ¢VffV7D–C¢VffV7Bæ–BÀÐ¢†æFÆ–ærÀÐ¢7F–öäV6öæö×’ÀÐ¢7F—fF–öåF–ÖS Ð¢6ÆVå7G&–ær€Ð¢VffV7Bæ7F—fF–öåF–ÖPÐ¢’ÀÐ¢&V6†&vS Ð¢6ÆVå7G&–ær€Ð¢VffV7Bç&V6†&vRÀÐ¢&æöæR Ð¢’ÀÐ¢6V7F–öâÀÐ¢6öæF—F–öã Ð¢6ÆVå7G&–ær€Ð¢VffV7Bæ6öæF—F–öàÐ¢’ÀÐ¢7VÖÖ'“ Ð¢6ÆVå7G&–ær€Ð¢VffV7Bç7VÖÖ'Ð¢’ÀÐ¢–ç7G'V7F–öç3 Ð¢6ÆVå7G&–ær€Ð¢VffV7Bæ–ç7G'V7F–öç2ÀÐ¢VffV7Bç7VÖÖ'Ð¢’ÀÐ¢W6vRÀÐ¢&W6÷W&6T–C Ð¢†æFÆ–ærÓÓÒ'G&6¶VB"b`Ð¢Ö†–×VÕW6W2â Ð¢ò6—GVF–öæÄ–@Ð¢¢" Ð¢Ò“°Ð Ð¢–b€Ð¢†æFÆ–ærÓÓÒ'G&6¶VB"b`Ð¢Ö†–×VÕW6W2â Ð¢’°Ð¢6öç7B&Wf–÷W2ÐÐ¢&Wf–÷W5&W6÷W&6W5°Ð¢6—GVF–öæÄ–@Ð¢Ó°Ð Ð¢ÖV6†æ–72ç&W6÷W&6W2çW6‚‡°Ð¢–C¢6—GVF–öæÄ–BÀÐ¢fVD–C¢fVBæ–BÀÐ¢fVDæÖS¢fVBææÖRÀÐ¢&W6÷W&6T–C Ð¢VffV7Bæ–BÀÐ¢æÖS Ð¢6ÆVå7G&–ær€Ð¢W6vRæÆ&VÂÀÐ¢fVBææÖPÐ¢’ÀÐ¢Ö†–×VÕW6W2ÀÐ¢7W'&VçEW6W3 Ð¢ÖF‚æÖ–â€Ð¢Ö†–×VÕW6W2ÀÐ¢ÖF‚æÖ‚€Ð¢ÀÐ¢6fTçVÖ&W"€Ð¢&Wf–÷W3òæ7W'&VçEW6W2ÀÐ¢Ö†–×VÕW6W0Ð¢Ð¢Ð¢’ÀÐ¢&V6†&vS Ð¢6ÆVå7G&–ær€Ð¢VffV7Bç&V6†&vRÀÐ¢&æöæR Ð¢’ÀÐ¢F–S¢" Ð¢Ò“°Ð¢ÐÐ¢ÒVÇ6R°Ð¢ÖV6†æ–72ç76—fTVffV7G2çW6‚‡°Ð¢–C¢6—GVF–öæÄ–BÀÐ¢fVD–C¢fVBæ–BÀÐ¢fVDæÖS¢fVBææÖRÀÐ¢7VÖÖ'“¢VffV7Bç7VÖÖ'Ð¢Ò“°Ð¢ÐÐ¢ÐÐ¢Ò“°Ð Ð¢„'&’æ—4'&’†fVBæ6†ö–6W2’òfVBæ6†ö–6W2¢µÒÐ¢æf÷$V6‚‚†fVD6†ö–6R’Óâ°Ð¢6öç7B6VÆV7FVEfÇVW2ÒVæ—VT6ÆVä'&’†6†ö–6W5¶fVD6†ö–6Ræ–EÒ“°Ð¢6öç7BG—RÒ6ÆVå7G&–ær†fVD6†ö–6RçG—R’çFôÆ÷vW$66R‚“°Ð Ð¢–b‡G—RÓÓÒ'6¶–ÆÂ"’°Ð¢6öç7BW‡W'F—6RÒfVD6†ö–6Ræ–BÓÓÒ&W‡W'F—6R#°Ð¢6VÆV7FVEfÇVW2æf÷$V6‚‚‡fÇVR’Óâ°Ð¢FE6¶–ÆÅ6÷W&6R‡fÇVRÂ6÷W&6TæÖRÂW‡W'F—6R“°Ð¢Ò“°Ð¢ÐÐ Ð¢–b‡G—RÓÓÒ'6¶–ÆÆ÷'FööÂ"’°Ð¢6VÆV7FVEfÇVW2æf÷$V6‚‚‡fÇVR’Óâ°Ð¢–b‡fÇVRç7F'G5v—F‚‚'6¶–ÆÃ¢"’’°Ð¢FE6¶–ÆÅ6÷W&6R‡fÇVRç6Æ–6R‚'6¶–ÆÃ¢"æÆVæwF‚’Â6÷W&6TæÖR“°Ð¢ÒVÇ6R–b‡fÇVRç7F'G5v—F‚‚'FööÃ¢"’’°Ð¢&öf–6–Væ7•fÇVW2çFööÇ2çW6‚‡fÇVRç6Æ–6R‚'FööÃ¢"æÆVæwF‚’“°Ð¢ÐÐ¢Ò“°Ð¢ÐÐ Ð¢–b‡G—RÓÓÒ'FööÂ"’°Ð¢&öf–6–Væ7•fÇVW2çFööÇ2çW6‚‚ââç6VÆV7FVEfÇVW2“°Ð¢ÐÐ Ð¢–b‡G—RÓÓÒ&ÆæwVvR"’°Ð¢&öf–6–Væ7•fÇVW2æÆæwVvW2çW6‚‚ââç6VÆV7FVEfÇVW2“°Ð¢ÐÐ Ð¢–b‡G—RÓÓÒ'vVöâ"’°Ð¢&öf–6–Væ7•fÇVW2çvVöç2çW6‚‚ââç6VÆV7FVEfÇVW2“°Ð¢ÐÐ Ð¢–b‡G—RÓÓÒ&fVGW&R"’°Ð¢6öç7B6†ö–6T–BÐÐ¢6ÆVå7G&–ær€Ð¢fVD6†ö–6Ræ–@Ð¢“°Ð¢6öç7B6÷W&6RÐÐ¢6ÆVå7G&–ær€Ð¢fVD6†ö–6Rç6÷W&6PÐ¢“°Ð Ð¢6VÆV7FVEfÇVW2æf÷$V6‚‚‡fÇVR’Óâ°Ð¢–b€Ð¢6÷W&6RÓÓÐÐ¢&VÆG&—F6‚Ö–çfö6F–öç2"ÇÀÐ¢6†ö–6T–BÓÓÐÐ¢&–çfö6F–öâ Ð¢’°Ð¢6öç7BFWF–Ç2ÐÐ¢DTdTÅEô”ådô4D”ôåôDUD”Å5°Ð¢fÇVPÐ¢ÒÇÂ·Ó°Ð¢6öç7B7VÖÖ'’ÐÐ¢6ÆVå7G&–ær€Ð¢FWF–Ç2ç7VÖÖ'’ÀÐ¢–çfö6F–öå7VÖÖ&–W5°Ð¢Ö¶U6fT–B€Ð¢fÇVRÀÐ¢" Ð¢Ð¢ÒÇÀÐ¢%6VÆV7FVBVÆG&—F6‚–çfö6F–öââ Ð¢“°Ð Ð¢FE6VÆV7FVDfVGW&R‡°Ð¢6†ö–6T–BÀÐ¢fVGW&UG—S Ð¢&VÆG&—F6„–çfö6F–öâ"ÀÐ¢æÖS¢fÇVRÀÐ¢7VÖÖ'’ÀÐ¢FWF–Ç3¢°Ð¢VffV7G3 Ð¢6ÆöæTFF€Ð¢FWF–Ç2æVffV7G2ÇÀÐ¢µÐÐ¢Ð¢ÐÐ¢Ò“°Ð Ð¢€Ð¢'&’æ—4'&’€Ð¢FWF–Ç2æVffV7G0Ð¢Ð¢òFWF–Ç2æVffV7G0Ð¢¢µÐÐ¢’æf÷$V6‚€Ð¢€Ð¢–çfö6F–öäVffV7@Ð¢’Óâ°Ð¢–b€Ð¢–çfö6F–öäVffV7@Ð¢çG—RÓÓÐÐ¢'6¶–ÆÅ&öf–6–Væ7’ Ð¢’°Ð¢Væ—VT6ÆVä'&’€Ð¢–çfö6F–öäVffV7@Ð¢ç6¶–ÆÇ0Ð¢’æf÷$V6‚€Ð¢‡6¶–ÆÂ’Óâ°Ð¢FE6¶–ÆÅ6÷W&6R€Ð¢6¶–ÆÂÀÐ¢6÷W&6TæÖPÐ¢“°Ð¢ÐÐ¢“°Ð¢ÒVÇ6R–b€Ð¢–çfö6F–öäVffV7@Ð¢çG—RÓÓÐÐ¢'6Vç6R Ð¢’°Ð¢ÖV6†æ–72ç6Vç6W2çW6‚‡°Ð¢–C Ð¢G¶–ç7Fæ6Ræ–GÓ¦–çfö6F–öâ×6Vç6S¢G¶Ö¶U6fT–B‡fÇVRÂ'6Vç6R"—ÖÀÐ¢fVD–C Ð¢fVBæ–BÀÐ¢fVDæÖS Ð¢fVBææÖRÀÐ¢6÷W&6T–C Ð¢–ç7Fæ6Ræ–BÀÐ¢6Vç6S Ð¢6ÆVå7G&–ær€Ð¢–çfö6F–öäVffV7@Ð¢ç6Vç6RÀÐ¢'7V6–Â6Vç6R Ð¢’ÀÐ¢&ævS Ð¢ÖF‚æÖ‚€Ð¢ÀÐ¢6fTçVÖ&W"€Ð¢–çfö6F–öäVffV7@Ð¢ç&ævRÀÐ¢ Ð¢Ð¢’ÀÐ¢Öv–6ÄF&¶æW73 Ð¢–çfö6F–öäVffV7@Ð¢æÖv–6ÄF&¶æW72ÓÓÐÐ¢G'VPÐ¢Ò“°Ð¢ÒVÇ6R–b€Ð¢–çfö6F–öäVffV7@Ð¢çG—RÓÓÐÐ¢&Ev–ÆÅ7VÆÂ Ð¢’°Ð¢FDfVE7VÆÅ&V6÷&G2‡°Ð¢FW67&—F÷#¢°Ð¢Ev–ÆÃ¢G'VRÀÐ¢&–Æ—G“ Ð¢W†—7F–æu7VÆÆ67F–æt&–Æ—G’ÇÀÐ¢$6†&—6Ö"ÀÐ¢6VÆdöæÇ“ Ð¢–çfö6F–öäVffV7@Ð¢ç6VÆdöæÇ’ÓÓÐÐ¢G'VPÐ¢ÒÀÐ¢÷&–v–ã Ð¢&VÆG&—F6‚Ö–çfö6F–öâ"ÀÐ¢6†ö–6T–BÀÐ¢–G3¢°Ð¢–çfö6F–öäVffV7@Ð¢ç7VÆÄ–@Ð¢ÐÐ¢Ò“°Ð¢ÒVÇ6R°Ð¢ÖV6†æ–72ç76—fTVffV7G2çW6‚‡°Ð¢–C Ð¢G¶–ç7Fæ6Ræ–GÓ¦–çfö6F–öã¢G¶Ö¶U6fT–B‡fÇVRÂ&fVGW&R"—Ó¢G¶Ö¶U6fT–B†–çfö6F–öäVffV7BçG—RÂ&VffV7B"—ÖÀÐ¢fVD–C Ð¢fVBæ–BÀÐ¢fVDæÖS Ð¢fVBææÖRÀÐ¢7VÖÖ'Ð¢Ò“°Ð¢ÐÐ¢ÐÐ¢“°Ð Ð¢&WGW&ã°Ð¢ÐÐ Ð¢–b€Ð¢6†ö–6T–BÓÓÐÐ¢&f–v‡F–ær×7G–ÆR Ð¢’°Ð¢6öç7B7G–ÆTVffV7BÐÐ¢DTdTÅEôd”t…D”äuõ5E”ÄUôTddT5E5°Ð¢fÇVPÐ¢ÒÇÂ·Ó°Ð¢6öç7B7VÖÖ'’ÐÐ¢6ÆVå7G&–ær€Ð¢7G–ÆTVffV7Bç7VÖÖ'’ÀÐ¢f–v‡F–æu7G–ÆU7VÖÖ&–W5°Ð¢Ö¶U6fT–B€Ð¢fÇVRÀÐ¢" Ð¢Ð¢ÒÇÀÐ¢%6VÆV7FVBf–v‡F–ær7G–ÆRâ Ð¢“°Ð Ð¢FE6VÆV7FVDfVGW&R‡°Ð¢6†ö–6T–BÀÐ¢fVGW&UG—S Ð¢&f–v‡F–æu7G–ÆR"ÀÐ¢æÖS¢fÇVRÀÐ¢7VÖÖ'’ÀÐ¢FWF–Ç3¢°Ð¢VffV7G3 Ð¢ö&¦V7Bæ¶W—2€Ð¢7G–ÆTVffV7@Ð¢’æÆVæwF€Ð¢ò°Ð¢6ÆöæTFF€Ð¢7G–ÆTVffV7@Ð¢Ð¢ÐÐ¢¢µÐÐ¢ÐÐ¢Ò“°Ð Ð¢–b€Ð¢7G–ÆTVffV7BçG—RÓÓÐÐ¢&&Ö÷$6Æ74&öçW2 Ð¢’°Ð¢ÖV6†æ–70Ð¢æ&Ö÷$6Æ74ÖöF–f–W'0Ð¢çW6‚‡°Ð¢–C Ð¢G¶–ç7Fæ6Ræ–GÓ¦f–v‡F–ær×7G–ÆS¢G¶Ö¶U6fT–B‡fÇVRÂ'7G–ÆR"—ÖÀÐ¢fVD–C Ð¢fVBæ–BÀÐ¢fVDæÖS Ð¢fVBææÖRÀÐ¢6÷W&6T–C Ð¢–ç7Fæ6Ræ–BÀÐ¢fÇVS Ð¢6fTçVÖ&W"€Ð¢7G–ÆTVffV7@Ð¢çfÇVRÀÐ¢ Ð¢’ÀÐ¢6öæF—F–öã Ð¢7G–ÆTVffV7@Ð¢ç&WV—&W0Ð¢òçvV&–æt&Ö÷"ÓÓÐÐ¢G'VPÐ¢ò'vV&–ærÖ&Ö÷" Ð¢¢""ÀÐ¢&WV—&W3 Ð¢6ÆöæTFF€Ð¢7G–ÆTVffV7@Ð¢ç&WV—&W2ÇÀÐ¢·ÐÐ¢Ð¢Ò“°Ð¢ÒVÇ6R–b€Ð¢°Ð¢'vVöäGF6´&öçW2"ÀÐ¢'vVöäFÖvT&öçW2"ÀÐ¢'vVöäÖv–4&öçW2"ÀÐ¢&FÖvTF–U&W&öÆÂ"ÀÐ¢&öff†æD&–Æ—G”FÖvR"ÀÐ¢'&V7F–öäFVfVç6R Ð¢Òæ–æ6ÇVFW2€Ð¢7G–ÆTVffV7BçG—PÐ¢Ð¢’°Ð¢ÖV6†æ–72æGF6´ÖöF–f–W'2çW6‚‡°Ð¢ââæ6ÆöæTFF€Ð¢7G–ÆTVffV7@Ð¢’ÀÐ¢–C Ð¢G¶–ç7Fæ6Ræ–GÓ¦f–v‡F–ær×7G–ÆS¢G¶Ö¶U6fT–B‡fÇVRÂ'7G–ÆR"—ÖÀÐ¢fVD–C Ð¢fVBæ–BÀÐ¢fVDæÖS Ð¢fVBææÖRÀÐ¢6÷W&6T–C Ð¢–ç7Fæ6Ræ–@Ð¢Ò“°Ð¢ÐÐ Ð¢–b€Ð¢fÇVRÓÓÐÐ¢$&Æ–æBf–v‡F–ær Ð¢’°Ð¢ÖV6†æ–72ç6Vç6W2çW6‚‡°Ð¢–C Ð¢G¶–ç7Fæ6Ræ–GÓ¦&Æ–æBÖf–v‡F–ævÀÐ¢fVD–C Ð¢fVBæ–BÀÐ¢fVDæÖS Ð¢fVBææÖRÀÐ¢6÷W&6T–C Ð¢–ç7Fæ6Ræ–BÀÐ¢6Vç6S Ð¢&&Æ–æG6–v‡B"ÀÐ¢&ævS¢ Ð¢Ò“°Ð¢ÐÐ Ð¢–b€Ð¢fÇVRÓÓÐÐ¢%Væ&ÖVBf–v‡F–ær Ð¢’°Ð¢ÖV6†æ–72æ6öÖ&E&öf–ÆW2çW6‚‡°Ð¢–C Ð¢G¶–ç7Fæ6Ræ–GÓ§Væ&ÖVBÖf–v‡F–ævÀÐ¢fVD–C Ð¢fVBæ–BÀÐ¢fVDæÖS Ð¢fVBææÖRÀÐ¢6÷W&6T–C Ð¢–ç7Fæ6Ræ–BÀÐ¢G—S Ð¢'Væ&ÖVDFÖvR"ÀÐ¢F–S¢&Cb"ÀÐ¢Gvôg&VT†æG4F–S Ð¢&C‚ Ð¢Ò“°Ð¢ÐÐ Ð¢&WGW&ã°Ð¢ÐÐ Ð¢–b€Ð¢6÷W&6RÓÓÐÐ¢&&GFÆRÖÖ7FW"ÖÖæWWfW'2"ÇÀÐ¢6†ö–6T–BÓÓÐÐ¢&ÖæWWfW'2 Ð¢’°Ð¢6öç7B&–Æ—G’ÐÐ¢vWD&–Æ—G’€Ð¢6†ö–6W5°Ð¢&ÖæWWfW"Ö&–Æ—G’ Ð¢Óòå³ÐÐ¢’ÇÀÐ¢vWD&–Æ—G’€Ð¢%7G&VæwF‚ Ð¢“°Ð¢6öç7B6fTF2ÐÐ¢‚°Ð¢vWD6†&7FW%&öf–6–Væ7”&öçW2€Ð¢G&g@Ð¢’°Ð¢6Æ7VÆFT&–Æ—G”ÖöF–f–W"€Ð¢vWD&–Æ—G•66÷&R€Ð¢G&gBÀÐ¢&–Æ—G’æ–@Ð¢Ð¢“°Ð Ð¢FE6VÆV7FVDfVGW&R‡°Ð¢6†ö–6T–BÀÐ¢fVGW&UG—S Ð¢&&GFÆTÖ7FW$ÖæWWfW""ÀÐ¢æÖS¢fÇVRÀÐ¢7VÖÖ'“ Ð¢6ÆVå7G&–ær€Ð¢DTdTÅEôÔäUUdU%ôDUD”Å5°Ð¢fÇVPÐ¢ÒÀÐ¢%6VÆV7FVB&GFÆRÖ7FW"ÖæWWfW"â Ð¢’ÀÐ¢FWF–Ç3¢°Ð¢6fT&–Æ—G“ Ð¢&–Æ—G’æ–BÀÐ¢6fTF2ÀÐ¢7WW&–÷&—G”F–S Ð¢&Cb Ð¢ÐÐ¢Ò“°Ð Ð¢&WGW&ã°Ð¢ÐÐ Ð¢–b€Ð¢6÷W&6RÓÓÐÐ¢&ÖWFÖv–2Ö÷F–öç2"ÇÀÐ¢6†ö–6T–BÓÓÐÐ¢&ÖWFÖv–2Ö÷F–öç2 Ð¢’°Ð¢6öç7BFWF–Ç2ÐÐ¢DTdTÅEôÔUDÔt”5ôDUD”Å5°Ð¢fÇVPÐ¢ÒÇÂ·Ó°Ð Ð¢FE6VÆV7FVDfVGW&R‡°Ð¢6†ö–6T–BÀÐ¢fVGW&UG—S Ð¢&ÖWFÖv–2"ÀÐ¢æÖS¢fÇVRÀÐ¢7VÖÖ'“ Ð¢6ÆVå7G&–ær€Ð¢FWF–Ç2ç7VÖÖ'’ÀÐ¢%6VÆV7FVBÖWFÖv–2÷F–öââ Ð¢’ÀÐ¢FWF–Ç3¢°Ð¢6÷7C Ð¢FWF–Ç2æ6÷7BóðÐ¢çVÆÀÐ¢ÐÐ¢Ò“°Ð¢ÐÐ¢Ò“°Ð¢ÐÐ Ð¢–b‡G—RÓÓÒ'7VÆÂ"’°Ð¢FDfVE7VÆÅ&V6÷&G2‡°Ð¢FW67&—F÷#¢°Ð¢ââç7VÆÄ6†ö–6TVffV7BÀÐ¢ââæfVD6†ö–6PÐ¢ÒÀÐ¢÷&–v–ã¢&6†ö–6R"ÀÐ¢6†ö–6T–C Ð¢fVD6†ö–6Ræ–BÀÐ¢–G3¢6VÆV7FVEfÇVW2æf–ÇFW"‚‡7VÆÄ–B’Óâ—57VÆÄVÆ–v–&ÆTf÷$fVD6†ö–6R†vWE6V7F–öãe7VÆÄ'”–B‡7VÆÄ–BÂG&gB’ÂfVD6†ö–6RÂ²6VÆV7F–öç3¢6†ö–6W2ÂÆ–væÖVçC¢G&gBæ–FVçF—G“òæÆ–væÖVçBÇÂ""Ò’Ð¢Ò“°Ð¢ÐÐ¢Ò“°Ð Ð¢6WD&–Æ—G”&öçW56÷W&6R‡6÷W&6TæÖRÂ&öçW4Ö“°Ð¢ö&¦V7BæVçG&–W2‡&öf–6–Væ7•fÇVW2Ð¢æf÷$V6‚‚…¶6FVv÷'’ÂfÇVW5Ò’Óâ°Ð¢6WE6÷W&6U&öf–6–Væ7”Æ—7B€Ð¢6FVv÷'’ÀÐ¢Væ—VT6ÆVä'&’‡fÇVW2’ÀÐ¢6÷W&6TæÖPÐ¢“°Ð¢Ò“°Ð Ð¢6öç7BfVE7VÆÅ6÷W&6RÐÐ¢7&VFTfVE7VÆÅ6÷W&6TÖWFFF‡°Ð¢fVBÀÐ¢6÷W&6T–C¢–ç7Fæ6Ræ–BÀÐ¢6VÆV7F–öç3¢6†ö–6W2ÀÐ¢7VÆÅ&V6÷&G2ÀÐ¢7VÆÄw&çG2ÀÐ¢Æ–væÖVçC¢G&gBæ–FVçF—G“òæÆ–væÖVçBÇÂ""ÀÐ¢&öf–6–Væ7”&öçW3¢vWD6†&7FW%&öf–6–Væ7”&öçW2†G&gBÐ¢Ò“°Ð Ð¢–b‡7VÆÅ&V6÷&G2æÆVæwF‚ÇÂfVE7VÆÅ6÷W&6Ræ6†ö–6T6÷VçBâ’°Ð¢G&gBæÖv–2æfVE6÷W&6W5¶–ç7Fæ6Ræ–EÒÒ°Ð¢ââæfVE7VÆÅ6÷W&6RÀÐ¢fVDæÖS¢fVBææÖRÀÐ¢7VÆÄ–G3¢Væ—VT6ÆVä'&’‡7VÆÄ–G2’ÀÐ¢w&çG3¢7VÆÄw&çG2ÀÐ¢7VÆÅ&V6÷&G0Ð¢Ó°Ð¢ÐÐ Ð¢ÖV6†æ–72æ–ç7Fæ6W2çW6‚‡°Ð¢–C¢–ç7Fæ6Ræ–BÀÐ¢fVD–C¢fVBæ–BÀÐ¢fVDæÖS¢fVBææÖRÀÐ¢fVE7VÖÖ'“ Ð¢6ÆVå7G&–ær€Ð¢fVBç7VÖÖ'Ð¢’ÀÐ¢fVDFW67&—F–öã Ð¢6ÆVå7G&–ær€Ð¢fVBæFW67&—F–öâÀÐ¢fVBç7VÖÖ'Ð¢’ÀÐ¢6÷W&6TÆ&VÃ Ð¢6ÆVå7G&–ær€Ð¢fVBç6÷W&6TÆ&VÂÀÐ¢fVBç6÷W&6PÐ¢’ÀÐ¢'VÆW4VF—F–öã Ð¢6ÆVå7G&–ær€Ð¢fVBç'VÆW4VF—F–öâÀÐ¢5D•dUõ%TÄU4UBæVF—F–öàÐ¢’ÀÐ¢6†ö–6W2ÀÐ¢VffV7G3¢6ÆöæTFF†fVBæVffV7G2Ð¢Ò“°Ð¢Ò“°Ð Ð¢ÖV6†æ–72ç&W6—7Fæ6W2ÐÐ¢Væ—VT6ÆVä'&’€Ð¢ÖV6†æ–72ç&W6—7Fæ6W0Ð¢’æÖ‚‡fÇVR’Óâ°Ð¢&WGW&âfÇVRçFôÆ÷vW$66R‚“°Ð¢Ò“°Ð¢G&gBæfVDÖV6†æ–72ÒÖV6†æ–73°Ð¢ÐÐ Ð¢gVæ7F–öâ6WDfVE&W7D6†ö–6R€Ð¢&W7D6†ö–6T–BÀÐ¢6VÆV7FVEfÇVPÐ¢’°Ð¢6öç7BÖV6†æ–72ÐÐ¢7&VF÷%7FFRæG&g@Ð¢òæfVDÖV6†æ–73°Ð¢6öç7B&W7D6†ö–6RÐÐ¢€Ð¢'&’æ—4'&’€Ð¢ÖV6†æ–73òç&W7D6†ö–6W0Ð¢Ð¢òÖV6†æ–72ç&W7D6†ö–6W0Ð¢¢µÐÐ¢’æf–æB‚†VçG'’’Óâ°Ð¢&WGW&â€Ð¢VçG'’æ–BÓÓÐÐ¢&W7D6†ö–6T–@Ð¢“°Ð¢Ò“°Ð¢6öç7B6VÆV7FVBÐÐ¢6ÆVå7G&–ær€Ð¢6VÆV7FVEfÇVPÐ¢’çFôÆ÷vW$66R‚“°Ð Ð¢–b€Ð¢&W7D6†ö–6RÇÀÐ¢Væ—VT6ÆVä'&’€Ð¢&W7D6†ö–6Ræ÷F–öç0Ð¢’æ–æ6ÇVFW2‡6VÆV7FVBÐ¢’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢&W7D6†ö–6Rç6VÆV7FVBÐÐ¢6VÆV7FVC°Ð Ð¢–b€Ð¢&W7D6†ö–6Ræ¶–æBÓÓÐÐ¢&FÖvU&W6—7Fæ6R Ð¢’°Ð¢6öç7B6÷W&6RÐÐ¢€Ð¢'&’æ—4'&’€Ð¢ÖV6†æ–70Ð¢ç&W6—7Fæ6U6÷W&6W0Ð¢Ð¢òÖV6†æ–70Ð¢ç&W6—7Fæ6U6÷W&6W0Ð¢¢µÐÐ¢’æf–æB‚†VçG'’’Óâ°Ð¢&WGW&â€Ð¢VçG'’æ–BÓÓÐÐ¢G·&W7D6†ö–6Ræ–GÓ§6÷W&6V Ð¢“°Ð¢Ò“°Ð Ð¢–b‡6÷W&6R’°Ð¢6÷W&6RæFÖvUG—RÐÐ¢6VÆV7FVC°Ð¢ÐÐ Ð¢ÖV6†æ–72ç&W6—7Fæ6W2ÐÐ¢Væ—VT6ÆVä'&’€Ð¢ÖV6†æ–70Ð¢ç&W6—7Fæ6U6÷W&6W0Ð¢æÖ‚†VçG'’’Óâ°Ð¢&WGW&âVçG'Ð¢æFÖvUG—S°Ð¢ÒÐ¢’æÖ‚‡fÇVR’Óâ°Ð¢&WGW&âfÇVPÐ¢çFôÆ÷vW$66R‚“°Ð¢Ò“°Ð¢ÐÐ Ð¢Ç”6ö×F–&–Æ—G”Æ–6W2€Ð¢7&VF÷%7FFRæG&g@Ð¢“°Ð¢Ö&´G&gD6†ævVB‚“°Ð Ð¢&WGW&âG'VS°Ð¢ÐÐ Ð¢gVæ7F–öâWfÇVFU6V7F–öã$6Æ75&W6÷W&6TÖ†–×VÒ€Ð¢&W6÷W&6RÀÐ¢6Æ74ÆWfVÀÐ¢’°Ð¢6öç7BfÇVRÐÐ¢&W6÷W&6SòçW6W2óðÐ¢vWE&öw&W76–öåfÇVT'”ÆWfVÂ€Ð¢&W6÷W&6SòçW6W4'”ÆWfVÂÀÐ¢6Æ74ÆWfVÂÀÐ¢çVÆÀÐ¢“°Ð¢6öç7Bæ÷&ÖÆ—¦VEfÇVRÐÐ¢6ÆVå7G&–ær‡fÇVRÐ¢çFôÆ÷vW$66R‚Ð¢ç&WÆ6R‚õµÇ5òÕÒ²örÂ""“°Ð Ð¢–b†æ÷&ÖÆ—¦VEfÇVRÓÓÒ'VæÆ–Ö—FVB"’°Ð¢&WGW&âçVÆÃ°Ð¢ÐÐ Ð¢–b€Ð¢æ÷&ÖÆ—¦VEfÇVRÓÓÐÐ¢'&öf–6–Væ7–&öçW2 Ð¢’°Ð¢&WGW&âvWD6†&7FW%&öf–6–Væ7”&öçW2€Ð¢7&VF÷%7FFRæG&g@Ð¢“°Ð¢ÐÐ Ð¢–b€Ð¢æ÷&ÖÆ—¦VEfÇVRÓÓÐÐ¢'Gv–6W&öf–6–Væ7–&öçW2 Ð¢’°Ð¢&WGW&â€Ð¢vWD6†&7FW%&öf–6–Væ7”&öçW2€Ð¢7&VF÷%7FFRæG&g@Ð¢’¢ Ð¢“°Ð¢ÐÐ Ð¢–b€Ð¢æ÷&ÖÆ—¦VEfÇVRÓÓÐÐ¢&6Æ76ÆWfVÂ Ð¢’°Ð¢&WGW&â6Æ74ÆWfVÃ°Ð¢ÐÐ Ð¢–b‡fÇVRÓÒçVÆÂbbfÇVRÓÒVæFVf–æVBbbfÇVRÓÒ""’°Ð¢&WGW&âÖF‚æÖ‚ƒÂ6fTçVÖ&W"‡fÇVRÂ’“°Ð¢ÐÐ Ð¢–b‡&W6÷W&6SòçW6W4&–Æ—G’’°Ð¢6öç7B&–Æ—G”–BÒ7G&–ær‡&W6÷W&6RçW6W4&–Æ—G’Ð¢ç6Æ–6RƒÂ2Ð¢çFôÆ÷vW$66R‚“°Ð Ð¢&WGW&âÖF‚æÖ‚€Ð¢6fTçVÖ&W"‡&W6÷W&6RæÖ–æ–×VÒÂ’ÀÐ¢6Æ7VÆFT&–Æ—G”ÖöF–f–W"€Ð¢vWD&–Æ—G•66÷&R€Ð¢7&VF÷%7FFRæG&gBÀÐ¢&–Æ—G”–@Ð¢Ð¢Ð¢“°Ð¢ÐÐ Ð¢–b‡&W6÷W&6SòçööÃòæf÷&×VÆ’°Ð¢&WGW&âÖF‚æÖ‚€Ð¢ÀÐ¢6fTçVÖ&W"€Ð¢WfÇVFU6V7F–öã$6Æ74ÆWfVÄf÷&×VÆ€Ð¢&W6÷W&6RçööÂæf÷&×VÆÀÐ¢6Æ74ÆWfVÀÐ¢’ÀÐ¢ Ð¢Ð¢“°Ð¢ÐÐ Ð¢–b‡&W6÷W&6SòçW$ÆWfVÂ’°Ð¢&WGW&âÖF‚æÖ‚€Ð¢ÀÐ¢6Æ74ÆWfVÂ¢6fTçVÖ&W"‡&W6÷W&6RçW$ÆWfVÂÂÐ¢“°Ð¢ÐÐ Ð¢–b€Ð¢6ÆVå7G&–ær‡&W6÷W&6Sòç66ÆW5v—F‚’çFôÆ÷vW$66R‚’ÓÓÐÐ¢&ÆWfVÂ Ð¢’°Ð¢&WGW&â6Æ74ÆWfVÃ°Ð¢ÐÐ Ð¢&WGW&â°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öã$6æöæ–6Å&W6÷W&6T–B€Ð¢fVGW&RÀÐ¢&W6÷W&6PÐ¢’°Ð¢6öç7BW‡Æ–6—D–BÒ6ÆVå7G&–ær‡&W6÷W&6Sòæ–B“°Ð Ð¢–b†W‡Æ–6—D–B’°Ð¢&WGW&âÖ¶U6fT–B†W‡Æ–6—D–BÂ'&W6÷W&6R"“°Ð¢ÐÐ Ð¢6öç7B–æfW'&VDæÖRÒ6ÆVå7G&–ær€Ð¢&W6÷W&6SòææÖRÇÂfVGW&SòææÖRÇÂfVGW&Sòæ–BÀÐ¢'&W6÷W&6R Ð¢Ð¢ç&WÆ6R‚õÇ2¶–×&÷fVÖVçBâ¢Bö’Â""Ð¢ç&WÆ6R‚õÇ2¶Ö7FW'’â¢Bö’Â""Ð¢ç&WÆ6R‚õÇ2¥Â…µâ•Ò¥Â•Ç2¢BörÂ""“°Ð Ð¢–b€Ð¢õæ6†ææVÂF—f–æ—G’ƒó¥Ç2£§ÂB’ö’çFW7B€Ð¢–æfW'&VDæÖPÐ¢Ð¢’°Ð¢&WGW&â&6†ææVÂÖF—f–æ—G’#°Ð¢ÐÐ Ð¢&WGW&âÖ¶U6fT–B†–æfW'&VDæÖRÂ'&W6÷W&6R"“°Ð¢ÐÐ Ð¢6öç7B4T5D”ôã%ô4Ä55ôdTEU$Uõ4dUô$”Ä•D”U2ÐÐ¢ö&¦V7Bæg&VW¦R‡°Ð¢'F–f–6W#¢&–çB"ÀÐ¢&&&&–ã¢&6öâ"ÀÐ¢&&C¢&6†"ÀÐ¢6ÆW&–3¢'v—2"ÀÐ¢G'V–C¢'v—2"ÀÐ¢f–v‡FW#¢'7G""ÀÐ¢Ööæ³¢'v—2"ÀÐ¢ÆF–ã¢&6†"ÀÐ¢&ævW#¢'v—2"ÀÐ¢&öwVS¢&FW‚"ÀÐ¢6÷&6W&W#¢&6†"ÀÐ¢v&Æö6³¢&6†"ÀÐ¢v—¦&C¢&–çB Ð¢Ò“°Ð Ð¢gVæ7F–öâvWE6V7F–öã$6Æ74fVGW&U6fTF2€Ð¢6†&7FW"ÀÐ¢6Æ74VçG'”–BÀÐ¢VffV7BÒ·ÐÐ¢’°Ð¢6öç7B6Æ74VçG&–W2ÐÐ¢vWD6†&7FW$6Æ74VçG&–W2†6†&7FW"“°Ð¢6öç7B6Æ74VçG'’ÐÐ¢6Æ74VçG&–W2æf–æB‚†VçG'’Â–æFW‚’Óâ°Ð¢&WGW&â€Ð¢vWD6Æ75&öw&W76–öäVçG'”¶W’€Ð¢VçG'’ÀÐ¢–æFW€Ð¢’ÓÓÒ6ÆVå7G&–ær†6Æ74VçG'”–BÐ¢“°Ð¢Ò’ÇÂçVÆÃ°Ð¢6öç7B6Æ74–BÒ6ÆVå7G&–ær€Ð¢6Æ74VçG'“òæ6Æ74–BÇÀÐ¢VffV7Còæ6Æ74–@Ð¢“°Ð¢6öç7BFV×ÆFRÐÐ¢6Æ74VçG'Ð¢ò&W6öÇfT6Æ75FV×ÆFTf÷$VçG'’€Ð¢6Æ74VçG'Ð¢Ð¢¢çVÆÃ°Ð¢ÆWB&–Æ—G”–BÒ6ÆVå7G&–ær€Ð¢VffV7Còç6fTF4&–Æ—G’ÇÀÐ¢VffV7Còæ6Æ756fT&–Æ—G’ÇÀÐ¢VffV7CòçW6W4&–Æ—GÐ¢Ð¢ç6Æ–6RƒÂ2Ð¢çFôÆ÷vW$66R‚“°Ð Ð¢–b€Ð¢6ÆVå7G&–ær†VffV7CòçG—R’ÓÓÐÐ¢&ÖæWWfW%6fTF2 Ð¢’°Ð¢&–Æ—G”–BÐÐ¢vWD&–Æ—G•66÷&R†6†&7FW"Â&FW‚"’àÐ¢vWD&–Æ—G•66÷&R†6†&7FW"Â'7G""Ð¢ò&FW‚ Ð¢¢'7G"#°Ð¢ÐÐ Ð¢–b€Ð¢$”Ä•E•ôDTd”ä•D”ôå2ç6öÖR€Ð¢†&–Æ—G’’Óâ°Ð¢&WGW&â&–Æ—G’æ–BÓÓÒ&–Æ—G”–C°Ð¢ÐÐ¢Ð¢’°Ð¢&–Æ—G”–BÒ6ÆVå7G&–ær€Ð¢FV×ÆFSòç7VÆÆ67F–æt&–Æ—G’ÇÀÐ¢4T5D”ôã%ô4Ä55ôdTEU$Uõ4dUô$”Ä•D”U5°Ð¢6Æ74–@Ð¢ÐÐ¢Ð¢ç6Æ–6RƒÂ2Ð¢çFôÆ÷vW$66R‚“°Ð¢ÐÐ Ð¢–b€Ð¢$”Ä•E•ôDTd”ä•D”ôå2ç6öÖR€Ð¢†&–Æ—G’’Óâ°Ð¢&WGW&â&–Æ—G’æ–BÓÓÒ&–Æ—G”–C°Ð¢ÐÐ¢Ð¢’°Ð¢&WGW&â°Ð¢6Æ74VçG'”–C Ð¢6ÆVå7G&–ær†6Æ74VçG'”–B’ÀÐ¢6Æ74–BÀÐ¢&–Æ—G”–C¢""ÀÐ¢&–Æ—G”ÖöF–f–W#¢çVÆÂÀÐ¢6fTF3¢çVÆÀÐ¢Ó°Ð¢ÐÐ Ð¢6öç7B&–Æ—G”ÖöF–f–W"ÐÐ¢6Æ7VÆFT&–Æ—G”ÖöF–f–W"€Ð¢vWD&–Æ—G•66÷&R€Ð¢6†&7FW"ÀÐ¢&–Æ—G”–@Ð¢Ð¢“°Ð Ð¢&WGW&â°Ð¢6Æ74VçG'”–C Ð¢6ÆVå7G&–ær†6Æ74VçG'”–B’ÀÐ¢6Æ74–BÀÐ¢&–Æ—G”–BÀÐ¢&–Æ—G”ÖöF–f–W"ÀÐ¢6fTF3 Ð¢6Æ7VÆFU'VÆU7VÆÅ6fTF2‡°Ð¢&öf–6–Væ7”&öçW3 Ð¢vWD6†&7FW%&öf–6–Væ7”&öçW2€Ð¢6†&7FW Ð¢’ÀÐ¢&–Æ—G”ÖöF–f–W Ð¢ÒÐ¢Ó°Ð¢ÐÐ Ð¢gVæ7F–öâÇ•6VÆV7FVD6Æ74fVGW&TÖV6†æ–72‚’°Ð¢6öç7BG&gBÒ7&VF÷%7FFRæG&gC°Ð Ð¢–b‚G&gCòç&öf–6–Væ6–W2ÇÂG&gCòæ6Æ75&öw&W76–öâ’°Ð¢&WGW&ã°Ð¢ÐÐ Ð¢6öç7B&Wf–÷W5&W6÷W&6TVçG&–W2Ò'&’æ—4'&’€Ð¢G&gBæ6Æ74ÖV6†æ–73òç&W6÷W&6W0Ð¢Ð¢òG&gBæ6Æ74ÖV6†æ–72ç&W6÷W&6W0Ð¢¢µÓ°Ð¢6öç7B&Wf–÷W5&W6÷W&6W2Òö&¦V7Bæg&öÔVçG&–W2€Ð¢&Wf–÷W5&W6÷W&6TVçG&–W2æÖ‚†VçG'’’Óâ¶VçG'’æ–BÂVçG'•ÒÐ¢“°Ð¢6öç7BÖV6†æ–72Ò°Ð¢66†VÖfW'6–öã¢ÀÐ¢&W6÷W&6W3¢µÒÀÐ¢&Ö÷$6Æ74f÷&×VÆ3¢µÒÀÐ¢&Ö÷$6Æ74ÖöF–f–W'3¢µÒÀÐ¢GF6´ÖöF–f–W'3¢µÒÀÐ¢7VÆÄÖöF–f–W'3¢µÒÀÐ¢6öÖ&E&öf–ÆW3¢µÒÀÐ¢6Æ756fTF73¢µÒÀÐ¢GF6´7F–öã¢°Ð¢GF6·3¢ÀÐ¢6÷W&6T–G3¢µÒÀÐ¢6÷W&6TæÖW3¢µÐÐ¢ÒÀÐ¢7VÆÆ67F–æt&Æö6¶VC¢fÇ6RÀÐ¢7VÆÆ67F–æt&Æö6µ&V6öç3¢µÒÀÐ¢76—fTVffV7G3¢µÒÀÐ¢&W7G&–7F–öç3¢µÒÀÐ¢–ægW6–öç3¢µÐÐ¢Ó°Ð¢6öç7B&W6÷W&6T'”–BÒæWrÖ‚“°Ð¢6ÆV$Öv–6Å6V7&WG46ö×F–&–Æ—G•6÷W&6W2†G&gB“°Ð¢6öç7Bf—'7EVæ&Ö÷&VDFVfVç6U6÷W&6RÐÐ¢7–æ4f—'7EVæ&Ö÷&VDFVfVç6U6÷W&6R€Ð¢G&g@Ð¢“°Ð¢6öç7Bf—'7EVæ&Ö÷&VDFVfVç6TfVGW&T–G2ÐÐ¢æWr6WB€Ð¢ö&¦V7BçfÇVW2€Ð¢Tä$Ôõ$TEôDTdTå4Uô4Ä55õ%TÄU0Ð¢’æÖ‚‡'VÆR’Óâ°Ð¢&WGW&â'VÆRæfVGW&T–C°Ð¢ÒÐ¢“°Ð Ð¢&VÖ÷fU6¶–ÆÅ&öf–6–Væ7•6÷W&6W4'•&Vf—‚…°Ð¢&6Æ72ÖfVGW&S¢ Ð¢Ò“°Ð¢&VÖ÷fTÆ—7E&öf–6–Væ7•6÷W&6W4'•&Vf—‚…°Ð¢&6Æ72ÖfVGW&S¢ Ð¢Ò“°Ð Ð¢6öç7BvWE6¶–ÆÂÒ‡fÇVR’Óâ°Ð¢6öç7Bæ÷&ÖÆ—¦VBÒÖ¶U6fT–B‡fÇVRÂ""“°Ð Ð¢&WGW&â4´”ÄÅôDTd”ä•D”ôå2æf–æB‚‡6¶–ÆÂ’Óâ°Ð¢&WGW&â€Ð¢6¶–ÆÂæ–BÓÓÒæ÷&ÖÆ—¦VBÇÀÐ¢Ö¶U6fT–B‡6¶–ÆÂææÖRÂ""’ÓÓÒæ÷&ÖÆ—¦V@Ð¢“°Ð¢Ò’ÇÂçVÆÃ°Ð¢Ó°Ð Ð¢6öç7BFE6¶–ÆÂÒ€Ð¢6¶–ÆÅfÇVRÀÐ¢6÷W&6TæÖRÀÐ¢W‡W'F—6RÒfÇ6PÐ¢’Óâ°Ð¢6öç7B6¶–ÆÂÒvWE6¶–ÆÂ‡6¶–ÆÅfÇVR“°Ð Ð¢–b‚6¶–ÆÂ’°Ð¢&WGW&ã°Ð¢ÐÐ Ð¢6öç7B7W'&VçBÒvWE6V7F–öãE6¶–ÆÄVçG'’‡6¶–ÆÂ“°Ð¢6öç7BW‡W'F—6U6÷W&6W2ÒW‡W'F—6PÐ¢òVæ—VT6ÆVä'&’…°Ð¢ââæ7W'&VçBæW‡W'F—6U6÷W&6W2ÀÐ¢6÷W&6TæÖPÐ¢ÒÐ¢¢7W'&VçBæW‡W'F—6U6÷W&6W3°Ð Ð¢6WE6V7F–öãE6¶–ÆÄVçG'’‡6¶–ÆÂÂ°Ð¢&öf–6–VçC¢G'VRÀÐ¢W‡W'F—6S Ð¢7W'&VçBæW‡W'F—6RÓÓÒG'VRÇÂW‡W'F—6RÀÐ¢W‡W'F—6U6÷W&6W2ÀÐ¢6÷W&6S¢Væ—VT6ÆVä'&’…°Ð¢ââæ7W'&VçBç6÷W&6RÀÐ¢6÷W&6TæÖPÐ¢ÒÐ¢Ò“°Ð¢Ó°Ð Ð¢6öç7BFE&W6÷W&6RÒ€Ð¢fVGW&RÀÐ¢6Æ74VçG'’ÀÐ¢6Æ74ÆWfVÂÀÐ¢&W6÷W&6PÐ¢’Óâ°Ð¢–b‚&W6÷W&6RÇÂG—Vöb&W6÷W&6RÓÒ&ö&¦V7B"’°Ð¢&WGW&ã°Ð¢ÐÐ Ð¢6öç7B6Æ74VçG'”–BÒ6ÆVå7G&–ær€Ð¢fVGW&Ræ6Æ74VçG'”–BÇÂ6Æ74VçG'“òæVçG'”–BÀÐ¢&6Æ72 Ð¢“°Ð¢6öç7B6æöæ–6Ä–BÐÐ¢vWE6V7F–öã$6æöæ–6Å&W6÷W&6T–B€Ð¢fVGW&RÀÐ¢&W6÷W&6PÐ¢“°Ð¢6öç7B6÷W&6T–BÐÐ¢G¶6Æ74VçG'”–GÓ¢G¶6æöæ–6Ä–GÖ°Ð¢6öç7BfVGW&U6÷W&6T–BÐÐ¢G¶6Æ74VçG'”–GÓ¢G°Ð¢6ÆVå7G&–ær€Ð¢fVGW&Ræ–BÀÐ¢6æöæ–6Ä–@Ð¢Ð¢Ö°Ð¢6öç7B6†&VBÐÐ¢6æöæ–6Ä–BÓÓÒ&6†ææVÂÖF—f–æ—G’#°Ð¢6öç7B&W6÷W&6T–BÒ6†&V@Ð¢ò'6†&VC¦6†ææVÂÖF—f–æ—G’ Ð¢¢6÷W&6T–C°Ð¢6öç7BÖ†–×VÕW6W2ÐÐ¢WfÇVFU6V7F–öã$6Æ75&W6÷W&6TÖ†–×VÒ€Ð¢&W6÷W&6RÀÐ¢6Æ74ÆWfVÀÐ¢“°Ð¢6öç7BW†—7F–æu&W6÷W&6RÐÐ¢&W6÷W&6T'”–BævWB‡&W6÷W&6T–B“°Ð¢6öç7B&Wf–÷W46æF–FFW2Ò6†&V@Ð¢ò&Wf–÷W5&W6÷W&6TVçG&–W2æf–ÇFW"‚†VçG'’’Óâ°Ð¢&WGW&â€Ð¢VçG'’æ–BÓÓÒ&W6÷W&6T–BÇÀÐ¢VçG'’æ6æöæ–6Ä–BÓÓÒ6æöæ–6Ä–BÇÀÐ¢6ÆVå7G&–ær†VçG'’æ–B’æVæG5v—F‚€Ð¢¢G¶6æöæ–6Ä–GÖ Ð¢Ð¢“°Ð¢ÒÐ¢¢·&Wf–÷W5&W6÷W&6W5·&W6÷W&6T–EÕÒæf–ÇFW"„&ööÆVâ“°Ð¢6öç7B&Wf–÷W47W'&VçEW6W2Ò&Wf–÷W46æF–FFW0Ð¢æÖ‚†VçG'’’ÓâVçG'“òæ7W'&VçEW6W2Ð¢æf–ÇFW"‚‡fÇVR’Óâ°Ð¢&WGW&âfÇVRÓÒçVÆÂbbfÇVRÓÒVæFVf–æVC°Ð¢ÒÐ¢æÖ‚‡fÇVR’Óâ6fTçVÖ&W"‡fÇVRÂ’“°Ð¢6öç7B6öÖ&–æVDÖ†–×VÒÒW†—7F–æu&W6÷W&6PÐ¢ò€Ð¢W†—7F–æu&W6÷W&6RæÖ†–×VÕW6W2ÓÓÒçVÆÂÇÀÐ¢Ö†–×VÕW6W2ÓÓÒçVÆÀÐ¢òçVÆÀÐ¢¢ÖF‚æÖ‚€Ð¢6fTçVÖ&W"†W†—7F–æu&W6÷W&6RæÖ†–×VÕW6W2Â’ÀÐ¢6fTçVÖ&W"†Ö†–×VÕW6W2ÂÐ¢Ð¢Ð¢¢Ö†–×VÕW6W3°Ð¢6öç7B6÷W&6TæÖW2ÒVæ—VT6ÆVä'&’…°Ð¢âââ†W†—7F–æu&W6÷W&6Sòç6÷W&6TæÖW2ÇÂµÒ’ÀÐ¢fVGW&Ræ6Æ74æÖRÇÀÐ¢6Æ74VçG'“òæ6Æ74æÖRÇÀÐ¢$6Æ72 Ð¢Ò“°Ð¢6öç7B6÷W&6T–G2ÒVæ—VT6ÆVä'&’…°Ð¢âââ†W†—7F–æu&W6÷W&6Sòç6÷W&6T–G2ÇÂµÒ’ÀÐ¢6÷W&6T–@Ð¢Ò“°Ð¢6öç7BfVGW&U6÷W&6T–G2ÐÐ¢Væ—VT6ÆVä'&’…°Ð¢âââ€Ð¢W†—7F–æu&W6÷W&6PÐ¢òæfVGW&U6÷W&6T–G2ÇÂµÐÐ¢’ÀÐ¢fVGW&U6÷W&6T–@Ð¢Ò“°Ð¢6öç7B6÷W&6TÖ†–×V×2Ò°Ð¢âââ€Ð¢W†—7F–æu&W6÷W&6PÐ¢òç6÷W&6TÖ†–×V×2ÇÂ·ÐÐ¢’ÀÐ¢¶fVGW&U6÷W&6T–EÓ Ð¢Ö†–×VÕW6W0Ð¢Ó°Ð¢6öç7B&W6W'fVD7W'&VçEW6W2ÒW†—7F–æu&W6÷W&6PÐ¢òæ7W'&VçEW6W2óðÐ¢€Ð¢&Wf–÷W47W'&VçEW6W2æÆVæwF€Ð¢òÖF‚æÖ–â‚ââç&Wf–÷W47W'&VçEW6W2Ð¢¢6öÖ&–æVDÖ†–×VÐÐ¢“°Ð¢6öç7B–æ6öÖ–æt—4WF†÷&—FF—fRÐÐ¢W†—7F–æu&W6÷W&6RÇÀÐ¢W†—7F–æu&W6÷W&6RæÖ†–×VÕW6W2ÓÓÒçVÆÂÇÀÐ¢Ö†–×VÕW6W2ÓÓÒçVÆÂÇÀÐ¢6fTçVÖ&W"†Ö†–×VÕW6W2Â’ãÐÐ¢6fTçVÖ&W"†W†—7F–æu&W6÷W&6RæÖ†–×VÕW6W2Â“°Ð¢6öç7B–æfW'&VD6†ææVÄ÷F–öâÐÐ¢6†&VBb`Ð¢õæ6†ææVÂF—f–æ—G•Ç2£¢ö’çFW7B€Ð¢6ÆVå7G&–ær†fVGW&RææÖRÐ¢Ð¢ò°Ð¢°Ð¢–C¢Ö¶U6fT–B€Ð¢6ÆVå7G&–ær†fVGW&RææÖRÐ¢ç&WÆ6R€Ð¢õæ6†ææVÂF—f–æ—G•Ç2£¥Ç2¢ö’ÀÐ¢" Ð¢’ÀÐ¢&6†ææVÂÖF—f–æ—G’Ö÷F–öâ Ð¢’ÀÐ¢æÖS¢6ÆVå7G&–ær†fVGW&RææÖRÐ¢ç&WÆ6R€Ð¢õæ6†ææVÂF—f–æ—G•Ç2£¥Ç2¢ö’ÀÐ¢" Ð¢’ÀÐ¢6÷7C¢Ð¢ÐÐ¢ÐÐ¢¢µÓ°Ð¢6öç7B–æ6öÖ–æu7VæD÷F–öç2Ò°Ð¢âââ€Ð¢'&’æ—4'&’€Ð¢fVGW&Rç7VæD÷F–öç0Ð¢Ð¢òfVGW&Rç7VæD÷F–öç0Ð¢¢µÐÐ¢’ÀÐ¢âââ€Ð¢'&’æ—4'&’€Ð¢&W6÷W&6Rç7VæD÷F–öç0Ð¢Ð¢ò&W6÷W&6Rç7VæD÷F–öç0Ð¢¢µÐÐ¢’ÀÐ¢ââæ–æfW'&VD6†ææVÄ÷F–öàÐ¢ÒæÖ‚†÷F–öâ’Óâ°Ð¢6öç7Bæ÷&ÖÆ—¦VD÷F–öâÐÐ¢G—Vöb÷F–öâÓÓÒ'7G&–ær Ð¢ò°Ð¢–C¢Ö¶U6fT–B€Ð¢÷F–öâÀÐ¢'&W6÷W&6RÖ÷F–öâ Ð¢’ÀÐ¢æÖS¢÷F–öàÐ¢ÐÐ¢¢6ÆöæTFF†÷F–öâ“°Ð¢6öç7B6fT6öçFW‡BÐÐ¢vWE6V7F–öã$6Æ74fVGW&U6fTF2€Ð¢G&gBÀÐ¢6Æ74VçG'”–BÀÐ¢°Ð¢ââææ÷&ÖÆ—¦VD÷F–öâÀÐ¢6Æ74–C Ð¢fVGW&Ræ6Æ74–BÇÀÐ¢6Æ74VçG'“òæ6Æ74–@Ð¢ÐÐ¢“°Ð Ð¢&WGW&â°Ð¢ââææ÷&ÖÆ—¦VD÷F–öâÀÐ¢–C¢Ö¶U6fT–B€Ð¢æ÷&ÖÆ—¦VD÷F–öâæ–BÇÀÐ¢æ÷&ÖÆ—¦VD÷F–öâææÖRÀÐ¢'&W6÷W&6RÖ÷F–öâ Ð¢’ÀÐ¢æÖS¢6ÆVå7G&–ær€Ð¢æ÷&ÖÆ—¦VD÷F–öâææÖRÀÐ¢fVGW&RææÖPÐ¢’ÀÐ¢6÷7C¢ÖF‚æÖ‚€Ð¢ÀÐ¢6fTçVÖ&W"€Ð¢æ÷&ÖÆ—¦VD÷F–öâæ6÷7BÀÐ¢Ð¢Ð¢’ÀÐ¢6Æ74VçG'”–BÀÐ¢6Æ74–C Ð¢fVGW&Ræ6Æ74–BÇÀÐ¢6Æ74VçG'“òæ6Æ74–BÇÀÐ¢""ÀÐ¢6Æ74æÖS Ð¢fVGW&Ræ6Æ74æÖRÇÀÐ¢6Æ74VçG'“òæ6Æ74æÖRÇÀÐ¢$6Æ72"ÀÐ¢fVGW&T–C Ð¢6ÆVå7G&–ær†fVGW&Ræ–B’ÀÐ¢fVGW&TæÖS Ð¢6ÆVå7G&–ær†fVGW&RææÖR’ÀÐ¢6fT&–Æ—G“ Ð¢æ÷&ÖÆ—¦VD÷F–öàÐ¢çW6W56fRÓÓÒfÇ6PÐ¢ò" Ð¢¢6fT6öçFW‡Bæ&–Æ—G”–BÀÐ¢6fTF3 Ð¢æ÷&ÖÆ—¦VD÷F–öàÐ¢çW6W56fRÓÓÒfÇ6PÐ¢òçVÆÀÐ¢¢6fT6öçFW‡Bç6fTF0Ð¢Ó°Ð¢Ò“°Ð¢6öç7B6öÖ&–æVE7VæD÷F–öç2Ò°Ð¢âââ€Ð¢W†—7F–æu&W6÷W&6PÐ¢òç7VæD÷F–öç2ÇÂµÐÐ¢’ÀÐ¢ââæ–æ6öÖ–æu7VæD÷F–öç0Ð¢Òæf–ÇFW"‚†÷F–öâÂ–æFW‚ÂfÇVW2’Óâ°Ð¢&WGW&â€Ð¢fÇVW2æf–æD–æFW‚‚†6æF–FFR’Óâ°Ð¢&WGW&â€Ð¢6ÆVå7G&–ær€Ð¢6æF–FFRæ6Æ74VçG'”–@Ð¢’ÓÓÐÐ¢6ÆVå7G&–ær€Ð¢÷F–öâæ6Æ74VçG'”–@Ð¢’b`Ð¢6ÆVå7G&–ær†6æF–FFRæ–B’ÓÓÐÐ¢6ÆVå7G&–ær†÷F–öâæ–BÐ¢“°Ð¢Ò’ÓÓÒ–æFW€Ð¢“°Ð¢Ò“°Ð¢6öç7BæW‡BÒ°Ð¢–C¢&W6÷W&6T–BÀÐ¢6æöæ–6Ä–BÀÐ¢6÷W&6T–BÀÐ¢6÷W&6T–G2ÀÐ¢fVGW&U6÷W&6T–G2ÀÐ¢6÷W&6TÖ†–×V×2ÀÐ¢6÷W&6TæÖW2ÀÐ¢6†&VBÀÐ¢6Æ74VçG'”–C¢6†&V@Ð¢ò'6†&VC¦6†ææVÂÖF—f–æ—G’ Ð¢¢6Æ74VçG'”–BÀÐ¢6Æ74–C¢6†&V@Ð¢ò'6†&VB Ð¢¢fVGW&Ræ6Æ74–BÇÂ6Æ74VçG'“òæ6Æ74–BÇÂ""ÀÐ¢6Æ74æÖS¢6÷W&6TæÖW2æ¦ö–â‚"ò"’ÀÐ¢fVGW&T–C¢–æ6öÖ–æt—4WF†÷&—FF—fPÐ¢òfVGW&Ræ–@Ð¢¢W†—7F–æu&W6÷W&6RæfVGW&T–BÀÐ¢fVGW&TæÖS¢–æ6öÖ–æt—4WF†÷&—FF—fPÐ¢òfVGW&RææÖPÐ¢¢W†—7F–æu&W6÷W&6RæfVGW&TæÖRÀÐ¢æÖS¢&W6÷W&6RææÖRÇÂfVGW&RææÖRÀÐ¢Ö†–×VÕW6W3¢6öÖ&–æVDÖ†–×VÒÀÐ¢7W'&VçEW6W3 Ð¢6öÖ&–æVDÖ†–×VÒÓÓÒçVÆÀÐ¢òçVÆÀÐ¢¢ÖF‚æÖ–â€Ð¢6öÖ&–æVDÖ†–×VÒÀÐ¢ÖF‚æÖ‚€Ð¢ÀÐ¢6fTçVÖ&W"€Ð¢&W6W'fVD7W'&VçEW6W2ÀÐ¢6öÖ&–æVDÖ†–×VÐÐ¢Ð¢Ð¢’ÀÐ¢&V6†&vS¢–æ6öÖ–æt—4WF†÷&—FF—fPÐ¢ò&W6÷W&6Rç&V6†&vRÇÀÐ¢vWE&öw&W76–öåfÇVT'”ÆWfVÂ€Ð¢&W6÷W&6Rç&V6†&vT'”ÆWfVÂÀÐ¢6Æ74ÆWfVÂÀÐ¢" Ð¢Ð¢¢W†—7F–æu&W6÷W&6Rç&V6†&vRÀÐ¢F–S¢–æ6öÖ–æt—4WF†÷&—FF—fPÐ¢ò&W6÷W&6RæF–RÇÀÐ¢vWE&öw&W76–öåfÇVT'”ÆWfVÂ€Ð¢&W6÷W&6RæF–T'”ÆWfVÂÀÐ¢6Æ74ÆWfVÂÀÐ¢" Ð¢Ð¢¢W†—7F–æu&W6÷W&6RæF–RÀÐ¢7VæD÷F–öç3 Ð¢6ÆöæTFF€Ð¢6öÖ&–æVE7VæD÷F–öç0Ð¢Ð¢Ó°Ð Ð¢&W6÷W&6T'”–Bç6WB‡&W6÷W&6T–BÂæW‡B“°Ð¢Ó°Ð Ð¢6öç7BÇ”VffV7BÒ€Ð¢VffV7BÀÐ¢6öçFW‡@Ð¢’Óâ°Ð¢–b‚VffV7BÇÂG—VöbVffV7BÓÒ&ö&¦V7B"’°Ð¢&WGW&ã°Ð¢ÐÐ Ð¢6öç7BG—RÒ6ÆVå7G&–ær†VffV7BçG—R“°Ð¢6öç7B&V6÷&BÒ°Ð¢ââæ6ÆöæTFF†VffV7B’ÀÐ¢–C¢G¶6öçFW‡Bæ6†ö–6T¶W—Ó¢G¶Ö¶U6fT–B‡G—RÇÂ6öçFW‡Bæ÷F–öâÇÂ&VffV7B"Â&VffV7B"—ÖÀÐ¢6Æ74VçG'”–C¢6öçFW‡Bæ6Æ74VçG'”–BÀÐ¢6Æ74–C¢6öçFW‡BæfVGW&Ræ6Æ74–BÀÐ¢6Æ74æÖS¢6öçFW‡BæfVGW&Ræ6Æ74æÖRÀÐ¢6Æ74ÆWfVÃ¢6öçFW‡Bæ6Æ74ÆWfVÂÀÐ¢fVGW&T–C¢6öçFW‡BæfVGW&Ræ–BÀÐ¢fVGW&TæÖS¢6öçFW‡BæfVGW&RææÖRÀÐ¢÷F–öã¢6öçFW‡Bæ÷F–öâÇÂ" Ð¢Ó°Ð¢6öç7BæVVG46Æ756fTF2ÐÐ¢G—RÓÓÒ&ÖæWWfW%6fTF2"ÇÀÐ¢VffV7Bæ6Æ756fTF2ÓÓÒG'VRÇÀÐ¢&ööÆVâ€Ð¢6ÆVå7G&–ær€Ð¢VffV7Bç6fTF4&–Æ—G’ÇÀÐ¢VffV7Bæ6Æ756fT&–Æ—GÐ¢Ð¢“°Ð Ð¢–b†æVVG46Æ756fTF2’°Ð¢6öç7B6fT6öçFW‡BÐÐ¢vWE6V7F–öã$6Æ74fVGW&U6fTF2€Ð¢G&gBÀÐ¢6öçFW‡Bæ6Æ74VçG'”–BÀÐ¢°Ð¢ââæVffV7BÀÐ¢6Æ74–C Ð¢6öçFW‡BæfVGW&Ræ6Æ74–@Ð¢ÐÐ¢“°Ð Ð¢&V6÷&Bç6fT&–Æ—G’ÐÐ¢6fT6öçFW‡Bæ&–Æ—G”–C°Ð¢&V6÷&Bç6fTF2ÐÐ¢6fT6öçFW‡Bç6fTF3°Ð¢ÐÐ Ð¢–b‡G—RÓÓÒ&&Ö÷$6Æ74f÷&×VÆ"’°Ð¢6öç7B—4f—'7E&V6V—fVE'VÆRÐÐ¢f—'7EVæ&Ö÷&VDFVfVç6TfVGW&T–G0Ð¢æ†2‡&V6÷&BæfVGW&T–B“°Ð Ð¢–b€Ð¢—4f—'7E&V6V—fVE'VÆRÇÀÐ¢€Ð¢f—'7EVæ&Ö÷&VDFVfVç6U6÷W&6Rb`Ð¢&V6÷&Bæ6Æ74VçG'”–BÓÓÐÐ¢f—'7EVæ&Ö÷&VDFVfVç6U6÷W&6PÐ¢æ6Æ74VçG'”–Bb`Ð¢&V6÷&BæfVGW&T–BÓÓÐÐ¢f—'7EVæ&Ö÷&VDFVfVç6U6÷W&6PÐ¢æfVGW&T–@Ð¢Ð¢’°Ð¢ÖV6†æ–70Ð¢æ&Ö÷$6Æ74f÷&×VÆ0Ð¢çW6‚‡&V6÷&B“°Ð¢ÐÐ¢ÒVÇ6R–b‡G—RÓÓÒ&W‡G&GF6²"’°Ð¢6öç7BGF6·2ÒÖF‚æÖ‚€Ð¢ÀÐ¢ÖF‚ç&÷VæB€Ð¢6fTçVÖ&W"†VffV7BæGF6·2Â"Ð¢Ð¢“°Ð¢6öç7B6÷W&6T–BÒG·&V6÷&Bæ6Æ74VçG'”–GÓ¢G·&V6÷&BæfVGW&T–GÖ°Ð¢6öç7B6÷W&6TfVGW&TæÖRÐÐ¢6ÆVå7G&–ær€Ð¢&V6÷&Bæ÷F–öâÀÐ¢&V6÷&BæfVGW&TæÖPÐ¢“°Ð¢6öç7B7W'&VçDGF6·2Ò6fTçVÖ&W"€Ð¢ÖV6†æ–72æGF6´7F–öâæGF6·2ÀÐ¢Ð¢“°Ð Ð¢–b†GF6·2â7W'&VçDGF6·2’°Ð¢ÖV6†æ–72æGF6´7F–öâÒ°Ð¢GF6·2ÀÐ¢6Æ74VçG'”–C¢&V6÷&Bæ6Æ74VçG'”–BÀÐ¢6Æ74–C¢&V6÷&Bæ6Æ74–BÀÐ¢6Æ74æÖS¢&V6÷&Bæ6Æ74æÖRÀÐ¢fVGW&T–C¢&V6÷&BæfVGW&T–BÀÐ¢fVGW&TæÖS Ð¢6÷W&6TfVGW&TæÖRÀÐ¢6÷W&6T–G3¢·6÷W&6T–EÒÀÐ¢6÷W&6TæÖW3¢°Ð¢G·&V6÷&Bæ6Æ74æÖWÓ¢G·6÷W&6TfVGW&TæÖWÖ Ð¢ÐÐ¢Ó°Ð¢ÒVÇ6R–b†GF6·2ÓÓÒ7W'&VçDGF6·2’°Ð¢ÖV6†æ–72æGF6´7F–öâç6÷W&6T–G2ÐÐ¢Væ—VT6ÆVä'&’…°Ð¢ââæÖV6†æ–72æGF6´7F–öâç6÷W&6T–G2ÀÐ¢6÷W&6T–@Ð¢Ò“°Ð¢ÖV6†æ–72æGF6´7F–öâç6÷W&6TæÖW2ÐÐ¢Væ—VT6ÆVä'&’…°Ð¢ââæÖV6†æ–72æGF6´7F–öâç6÷W&6TæÖW2ÀÐ¢G·&V6÷&Bæ6Æ74æÖWÓ¢G·6÷W&6TfVGW&TæÖWÖ Ð¢Ò“°Ð¢ÐÐ¢ÒVÇ6R–b‡G—RÓÓÒ&&Ö÷$6Æ74&öçW2"’°Ð¢ÖV6†æ–72æ&Ö÷$6Æ74ÖöF–f–W'2çW6‚‡&V6÷&B“°Ð¢ÒVÇ6R–b€Ð¢°Ð¢'vVöäGF6´&öçW2"ÀÐ¢'vVöäFÖvT&öçW2"ÀÐ¢'vVöäÖv–4&öçW2"ÀÐ¢&FÖvTF–U&W&öÆÂ"ÀÐ¢&öff†æD&–Æ—G”FÖvR"ÀÐ¢'&V7F–öäFVfVç6R Ð¢Òæ–æ6ÇVFW2‡G—RÐ¢’°Ð¢ÖV6†æ–72æGF6´ÖöF–f–W'2çW6‚‡&V6÷&B“°Ð¢ÒVÇ6R–b€Ð¢°Ð¢'7VÆÄGF6´&öçW2"ÀÐ¢'7VÆÄFÖvT&–Æ—G”&öçW2"ÀÐ¢'7VÆÄ†—EW6‚"ÀÐ¢&Ev–ÆÅ7VÆÂ"ÀÐ¢&öæ6UW%&W7E7VÆÂ Ð¢Òæ–æ6ÇVFW2‡G—RÐ¢’°Ð¢ÖV6†æ–72ç7VÆÄÖöF–f–W'2çW6‚‡&V6÷&B“°Ð¢ÒVÇ6R–b‡G—RÓÓÒ'6¶–ÆÅ&öf–6–Væ7’"’°Ð¢Væ—VT6ÆVä'&’†VffV7Bç6¶–ÆÇ2Ð¢æf÷$V6‚‚‡6¶–ÆÂ’Óâ°Ð¢FE6¶–ÆÂ‡6¶–ÆÂÂ6öçFW‡Bç6÷W&6TæÖR“°Ð¢Ò“°Ð¢ÒVÇ6R–b€Ð¢°Ð¢&Ö'F–Ä'G2"ÀÐ¢'6æV´GF6²"ÀÐ¢'&vR"ÀÐ¢&F—f–æU6Ö—FR"ÀÐ¢'v–ÆE6†R"ÀÐ¢&ÖæWWfW%6fTF2"ÀÐ¢&ÖWFÖv–2"ÀÐ¢&VÆG&—F6„–çfö6F–öç2 Ð¢Òæ–æ6ÇVFW2‡G—RÐ¢’°Ð¢ÖV6†æ–72æ6öÖ&E&öf–ÆW2çW6‚‡&V6÷&B“°Ð¢ÒVÇ6R–b‡G—RÓÒ'&W6÷W&6UööÂ"’°Ð¢ÖV6†æ–72ç76—fTVffV7G2çW6‚‡&V6÷&B“°Ð¢ÐÐ Ð¢Væ—VT6ÆVä'&’†VffV7Bç&W7G&–7F–öç2Ð¢æf÷$V6‚‚‡&W7G&–7F–öâ’Óâ°Ð¢ÖV6†æ–72ç&W7G&–7F–öç2çW6‚‡°Ð¢–C¢G·&V6÷&Bæ–GÓ¢G¶Ö¶U6fT–B‡&W7G&–7F–öâÂ'&W7G&–7F–öâ"—ÖÀÐ¢6÷W&6S¢6öçFW‡BæfVGW&RææÖRÀÐ¢7FFT–C Ð¢G—RÓÓÒ'&vR Ð¢ò'&vR Ð¢¢""ÀÐ¢&W7G&–7F–öàÐ¢Ò“°Ð¢Ò“°Ð¢Ó°Ð Ð¢vWD6Æ75&öw&W76–öäVçG&–W2†G&gBÐ¢æf÷$V6‚‚†6Æ74VçG'’Â6Æ74–æFW‚’Óâ°Ð¢6öç7BFV×ÆFRÒ&W6öÇfT6Æ75FV×ÆFTf÷$VçG'’†6Æ74VçG'’“°Ð¢6öç7BfVGW&W2Ò6öÆÆV7E6V7F–öã$fVGW&W4f÷$6Æ74VçG'’€Ð¢6Æ74VçG'’ÀÐ¢6Æ74–æFW€Ð¢“°Ð¢6öç7B6Æ74VçG'”–BÐÐ¢vWD6Æ75&öw&W76–öäVçG'”¶W’€Ð¢6Æ74VçG'’ÀÐ¢6Æ74–æFW€Ð¢“°Ð¢6öç7B6fT6öçFW‡BÐÐ¢vWE6V7F–öã$6Æ74fVGW&U6fTF2€Ð¢G&gBÀÐ¢6Æ74VçG'”–BÀÐ¢°Ð¢6Æ74–C Ð¢6Æ74VçG'’æ6Æ74–@Ð¢ÐÐ¢“°Ð Ð¢ÖV6†æ–72æ6Æ756fTF72çW6‚‡°Ð¢ââç6fT6öçFW‡BÀÐ¢6Æ74æÖS Ð¢6ÆVå7G&–ær€Ð¢6Æ74VçG'’æ6Æ74æÖRÀÐ¢FV×ÆFSòææÖRÇÀÐ¢6Æ74VçG'’æ6Æ74–@Ð¢’ÀÐ¢6Æ74ÆWfVÃ Ð¢vWD6Æ74VçG'”ÆWfVÂ€Ð¢6Æ74VçG'’ÀÐ¢Ð¢Ð¢Ò“°Ð Ð¢„'&’æ—4'&’‡FV×ÆFSòæVffV7G2Ð¢òFV×ÆFRæVffV7G2æf–ÇFW"‚†VffV7B’ÓàÐ¢²'7VVD&öçW2"Â'7VVD&öçW4'”ÆWfVÂ%Òæ–æ6ÇVFW2†6ÆVå7G&–ær†VffV7CòçG—R’’Ð¢¢µÐÐ¢’æf÷$V6‚‚†VffV7BÂVffV7D–æFW‚’Óâ°Ð¢6öç7B6Æ74ÆWfVÂÒvWD6Æ74VçG'”ÆWfVÂ€Ð¢6Æ74VçG'’ÀÐ¢Ð¢“°Ð¢6öç7B6Æ74fVGW&RÒ°Ð¢–C¢&6Æ72×FV×ÆFRÖVffV7G2"ÀÐ¢æÖS¢G¶6ÆVå7G&–ær€Ð¢6Æ74VçG'’æ6Æ74æÖRÀÐ¢FV×ÆFSòææÖRÇÂ$6Æ72 Ð¢—ÒÖ÷fVÖVçFÀÐ¢6Æ74–C¢6ÆVå7G&–ær€Ð¢6Æ74VçG'’æ6Æ74–BÀÐ¢FV×ÆFSòæ–@Ð¢’ÀÐ¢6Æ74æÖS¢6ÆVå7G&–ær€Ð¢6Æ74VçG'’æ6Æ74æÖRÀÐ¢FV×ÆFSòææÖPÐ¢Ð¢Ó°Ð Ð¢Ç”VffV7B†VffV7BÂ°Ð¢fVGW&S¢6Æ74fVGW&RÀÐ¢6Æ74VçG'’ÀÐ¢6Æ74VçG'”–BÀÐ¢6Æ74ÆWfVÂÀÐ¢6†ö–6T¶W“¢G¶6Æ74VçG'”–GÓ§FV×ÆFRÖVffV7BÒG¶VffV7D–æFW‚²ÖÀÐ¢6÷W&6TæÖS¢6Æ72×FV×ÆFS¢G¶6Æ74VçG'”–GÖÀÐ¢÷F–öã¢" Ð¢Ò“°Ð¢Ò“°Ð Ð¢fVGW&W2æf÷$V6‚‚†fVGW&R’Óâ°Ð¢6öç7B6Æ74ÆWfVÂÒÖF‚æÖ‚€Ð¢ÀÐ¢6fTçVÖ&W"€Ð¢fVGW&Ræ6Æ74ÆWfVÂÀÐ¢6Æ74VçG'’æÆWfVÂÇÂÐ¢Ð¢“°Ð¢6öç7B6Æ74VçG'”–BÒ6ÆVå7G&–ær€Ð¢fVGW&Ræ6Æ74VçG'”–BÀÐ¢vWD6Æ75&öw&W76–öäVçG'”¶W’€Ð¢6Æ74VçG'’ÀÐ¢6Æ74–æFW€Ð¢Ð¢“°Ð¢6öç7B6†ö–6T¶W’ÒvWE6V7F–öã$fVGW&T6†ö–6T¶W’†fVGW&R“°Ð¢6öç7B6÷W&6TæÖRÒ6Æ72ÖfVGW&S¢G¶6†ö–6T¶W—Ö°Ð¢6öç7B6VÆV7F–öç2ÐÐ¢vWE6V7F–öã$fVGW&U7F÷&VD6†ö–6W2†fVGW&R“°Ð¢6öç7B6öçFW‡BÒ°Ð¢fVGW&RÀÐ¢6Æ74VçG'’ÀÐ¢6Æ74VçG'”–BÀÐ¢6Æ74ÆWfVÂÀÐ¢6†ö–6T¶W’ÀÐ¢6÷W&6TæÖRÀÐ¢÷F–öã¢" Ð¢Ó°Ð Ð¢FE&W6÷W&6R€Ð¢fVGW&RÀÐ¢6Æ74VçG'’ÀÐ¢6Æ74ÆWfVÂÀÐ¢fVGW&Rç&W6÷W&6PÐ¢“°Ð Ð¢„'&’æ—4'&’†fVGW&RæVffV7G2Ð¢òfVGW&RæVffV7G0Ð¢¢µÐÐ¢’æf÷$V6‚‚†VffV7B’Óâ°Ð¢Ç”VffV7B†VffV7BÂ6öçFW‡B“°Ð¢Ò“°Ð Ð¢–b€Ð¢„'&’æ—4'&’†fVGW&RæVffV7G2Ð¢òfVGW&RæVffV7G0Ð¢¢µÐÐ¢’ç6öÖR‚†VffV7B’ÓâVffV7BçG—RÓÓÒ&W‡W'F—6R"Ð¢’°Ð¢6VÆV7F–öç2æf÷$V6‚‚‡6VÆV7F–öâ’Óâ°Ð¢–b‡6VÆV7F–öâÓÓÒ%F†–WfW2rFööÇ2"’°Ð¢ÖV6†æ–72ç76—fTVffV7G2çW6‚‡°Ð¢–C¢G¶6†ö–6T¶W—Ó§F†–WfW2×FööÇ2ÖW‡W'F—6VÀÐ¢6Æ74VçG'”–BÀÐ¢fVGW&TæÖS¢fVGW&RææÖRÀÐ¢G—S¢'FööÄW‡W'F—6R"ÀÐ¢FööÃ¢6VÆV7F–öâÀÐ¢7VÖÖ'“¢$F÷V&ÆR&öf–6–Væ7’f÷"6†V6·2W6–ærF†–WfW2rFööÇ2â Ð¢Ò“°Ð¢ÒVÇ6R°Ð¢FE6¶–ÆÂ‡6VÆV7F–öâÂ6÷W&6TæÖRÂG'VR“°Ð¢ÐÐ¢Ò“°Ð¢ÐÐ Ð¢–b†fVGW&Ræ÷F–öå6÷W&6RÓÓÒ&'F—6åFööÇ2"’°Ð¢6WE6÷W&6U&öf–6–Væ7”Æ—7B€Ð¢'FööÇ2"ÀÐ¢6VÆV7F–öç2ÀÐ¢6÷W&6TæÖPÐ¢“°Ð¢ÐÐ Ð¢6öç7BÖv–6Å6V7&WG4VffV7BÒ„'&’æ—4'&’†fVGW&RæVffV7G2Ð¢òfVGW&RæVffV7G2¢µÒ’æf–æB€Ð¢†VffV7B’ÓâVffV7BçG—RÓÓÒ&Öv–6Å6V7&WG2 Ð¢“°Ð Ð¢–b†Öv–6Å6V7&WG4VffV7B’°Ð¢6öç7B6÷W&6TVçG'’ÒvWE7VÆÆ67F–æt6Æ74÷F–öç2†G&gBÐ¢æf–æB‚†VçG'’’Óâ°Ð¢&WGW&âvWE6V7F–öãe6÷W&6T¶W’†VçG'’’ÓÓÒ6Æ74VçG'”–C°Ð¢Ò“°Ð¢7F÷&TÖv–6Å6V7&WG46ö×F–&–Æ—G•6÷W&6R†G&gBÂ°Ð¢6÷W&6T–C¢Öv–6Â×6V7&WG3¢G¶6†ö–6T¶W—ÖÀÐ¢6÷W&6TæÖS¢fVGW&RææÖRÀÐ¢6÷W&6TfVGW&T–C¢fVGW&Ræ–BÀÐ¢6Æ74–C¢fVGW&Ræ6Æ74–BÇÂ6Æ74VçG'“òæ6Æ74–BÀÐ¢6Æ74VçG'”–BÀÐ¢7V&6Æ74–C¢6Æ74VçG'“òç7V&6Æ74–BÀÐ¢6†ö–6T6÷VçC¢Öv–6Å6V7&WG4VffV7Bæ6÷VçBÀÐ¢6VÆV7FVE7VÆÄ–G3¢6VÆV7F–öç2ÀÐ¢Ö†–×VÕ7VÆÄÆWfVÃ¢6÷W&6TVçG'“òæÖ…7VÆÄÆWfVÂÀÐ¢7VÆÆ67F–æt&–Æ—G“¢6÷W&6TVçG'“òç7VÆÆ67F–æt&–Æ—G’ÀÐ¢'VÆW56÷W&6S¢fVGW&Rç'VÆW56÷W&6RÇÂfVGW&Rç6÷W&6TÆ&VÂÇÂfVGW&Rç6÷W&6PÐ¢Ò“°Ð¢ÐÐ Ð¢6VÆV7F–öç2æf÷$V6‚‚‡6VÆV7F–öâ’Óâ°Ð¢6öç7B÷F–öäVffV7BÒfVGW&Ræ÷F–öäVffV7G3òå·6VÆV7F–öåÓ°Ð¢6öç7B÷F–öäFWF–Ç2ÒfVGW&Ræ÷F–öäFWF–Ç3òå·6VÆV7F–öåÓ°Ð Ð¢„'&’æ—4'&’†÷F–öäVffV7BÐ¢ò÷F–öäVffV7@Ð¢¢÷F–öäVffV7@Ð¢ò¶÷F–öäVffV7EÐÐ¢¢µÐÐ¢’æf÷$V6‚‚†VffV7B’Óâ°Ð¢Ç”VffV7B†VffV7BÂ°Ð¢ââæ6öçFW‡BÀÐ¢÷F–öã¢6VÆV7F–öàÐ¢Ò“°Ð¢Ò“°Ð Ð¢„'&’æ—4'&’†÷F–öäFWF–Ç3òæVffV7G2Ð¢ò÷F–öäFWF–Ç2æVffV7G0Ð¢¢µÐÐ¢’æf÷$V6‚‚†VffV7B’Óâ°Ð¢Ç”VffV7B†VffV7BÂ°Ð¢ââæ6öçFW‡BÀÐ¢÷F–öã¢6VÆV7F–öàÐ¢Ò“°Ð¢Ò“°Ð Ð¢–b†÷F–öäFWF–Ç3òç7VÖÖ'’’°Ð¢ÖV6†æ–72ç76—fTVffV7G2çW6‚‡°Ð¢–C¢G¶6†ö–6T¶W—Ó¢G¶Ö¶U6fT–B‡6VÆV7F–öâÂ&6†ö–6R"—ÖÀÐ¢6Æ74VçG'”–BÀÐ¢6Æ74–C¢fVGW&Ræ6Æ74–BÀÐ¢6Æ74æÖS¢fVGW&Ræ6Æ74æÖRÀÐ¢fVGW&T–C¢fVGW&Ræ–BÀÐ¢fVGW&TæÖS¢fVGW&RææÖRÀÐ¢G—S¢'6VÆV7FVD÷F–öâ"ÀÐ¢÷F–öã¢6VÆV7F–öâÀÐ¢6÷7C¢÷F–öäFWF–Ç2æ6÷7BÀÐ¢7VÖÖ'“¢÷F–öäFWF–Ç2ç7VÖÖ'Ð¢Ò“°Ð¢ÐÐ¢Ò“°Ð Ð¢–b†fVGW&Ræ7W7FöÕG—RÓÓÒ&'F–f–6W$–ægW6–öç2"’°Ð¢6öç7B7F—fT–G2Ò6VÆV7F–öç0Ð¢æf–ÇFW"‚‡fÇVR’ÓâfÇVRç7F'G5v—F‚‚&7F—fS¢"’Ð¢æÖ‚‡fÇVR’ÓâfÇVRç6Æ–6R‚&7F—fS¢"æÆVæwF‚’“°Ð¢6öç7BF&vWG2Òö&¦V7Bæg&öÔVçG&–W2€Ð¢6VÆV7F–öç0Ð¢æf–ÇFW"‚‡fÇVR’ÓâfÇVRç7F'G5v—F‚‚'F&vWC¢"’Ð¢æÖ‚‡fÇVR’Óâ°Ð¢6öç7B²Â–ægW6–öä–BÂââæ—FVÕ'G5ÒÒfÇVRç7Æ—B‚#¢"“°Ð¢&WGW&â¶–ægW6–öä–BÂ—FVÕ'G2æ¦ö–â‚#¢"•Ó°Ð¢ÒÐ¢“°Ð Ð¢7F—fT–G2æf÷$V6‚‚†–ægW6–öä–B’Óâ°Ð¢6öç7B–ægW6–öâÒ‡FV×ÆFSòæ–ægW6–öç2ÇÂµÒÐ¢æf–æB‚†VçG'’’ÓâVçG'’æ–BÓÓÒ–ægW6–öä–B“°Ð Ð¢–b‚–ægW6–öâ’°Ð¢&WGW&ã°Ð¢ÐÐ Ð¢6öç7B–ægW6–öå&V6÷&BÒ°Ð¢–C¢G¶6Æ74VçG'”–GÓ¢G¶–ægW6–öâæ–GÖÀÐ¢6Æ74VçG'”–BÀÐ¢6Æ74–C¢fVGW&Ræ6Æ74–BÀÐ¢6Æ74ÆWfVÂÀÐ¢–ægW6–öä–C¢–ægW6–öâæ–BÀÐ¢æÖS¢–ægW6–öâææÖRÀÐ¢F&vWD—FVÔ–C¢6ÆVå7G&–ær‡F&vWG5¶–ægW6–öâæ–EÒ’ÀÐ¢&WV—&W4—FVÕF&vWC¢–ægW6–öâç&WV—&W4—FVÕF&vWBÓÓÒG'VRÀÐ¢7VÖÖ'“¢–ægW6–öâç7VÖÖ'’ÀÐ¢VffV7G3¢6ÆöæTFF†–ægW6–öâæVffV7G2ÇÂµÒÐ¢Ó°Ð¢ÖV6†æ–72æ–ægW6–öç2çW6‚†–ægW6–öå&V6÷&B“°Ð Ð¢†–ægW6–öâæVffV7G2ÇÂµÒ’æf÷$V6‚‚†VffV7B’Óâ°Ð¢6öç7BfÇVRÒVffV7BçfÇVRóðÐ¢vWE&öw&W76–öåfÇVT'”ÆWfVÂ€Ð¢VffV7BçfÇVT'”ÆWfVÂÀÐ¢6Æ74ÆWfVÂÀÐ¢ Ð¢“°Ð Ð¢Ç”VffV7B‡°Ð¢ââæVffV7BÀÐ¢fÇVRÀÐ¢–ægW6–öä–C¢–ægW6–öâæ–BÀÐ¢F&vWD—FVÔ–C¢–ægW6–öå&V6÷&BçF&vWD—FVÔ–BÀÐ¢&WV—&W4—FVÕF&vWC¢–ægW6–öå&V6÷&Bç&WV—&W4—FVÕF&vW@Ð¢ÒÂ°Ð¢ââæ6öçFW‡BÀÐ¢÷F–öã¢–ægW6–öâææÖPÐ¢Ò“°Ð¢Ò“°Ð¢Ò“°Ð¢ÐÐ¢Ò“°Ð¢Ò“°Ð Ð¢ÖV6†æ–72ç&W6÷W&6W2Ò'&’æg&öÒ‡&W6÷W&6T'”–BçfÇVW2‚’“°Ð¢ÖV6†æ–72ç&W7G&–7F–öç2ÒÖV6†æ–72ç&W7G&–7F–öç2æf–ÇFW"€Ð¢†VçG'’Â–æFW‚ÂfÇVW2’Óâ°Ð¢&WGW&âfÇVW2æf–æD–æFW‚‚†6æF–FFR’Óâ°Ð¢&WGW&â6æF–FFRæ–BÓÓÒVçG'’æ–C°Ð¢Ò’ÓÓÒ–æFWƒ°Ð¢ÐÐ¢“°Ð¢G&gBæ6öÖ&Bæ6Æ74fVGW&U7FFW2Ò°Ð¢âââ†G&gBæ6öÖ&Bæ6Æ74fVGW&U7FFW2ÇÂ·Ò’ÀÐ¢&vT7F—fS Ð¢G&gBæ6öÖ&Bæ6Æ74fVGW&U7FFW3òç&vT7F—fRÓÓÒG'VPÐ¢Ó°Ð¢6öç7B†5&vRÒÖV6†æ–72æ6öÖ&E&öf–ÆW2ç6öÖR‚‡&öf–ÆR’Óâ°Ð¢&WGW&â&öf–ÆRçG—RÓÓÒ'&vR#°Ð¢Ò“°Ð Ð¢–b‚†5&vR’°Ð¢G&gBæ6öÖ&Bæ6Æ74fVGW&U7FFW2ç&vT7F—fRÒfÇ6S°Ð¢ÐÐ Ð¢6öç7B&vT7F—fRÒ&ööÆVâ€Ð¢†5&vRb`Ð¢G&gBæ6öÖ&Bæ6Æ74fVGW&U7FFW2ç&vT7F—fRÓÓÒG'VPÐ¢“°Ð¢ÖV6†æ–72ç&W7G&–7F–öç2ÒÖV6†æ–72ç&W7G&–7F–öç2æÖ‚†VçG'’’Óâ°Ð¢&WGW&â°Ð¢ââæVçG'’ÀÐ¢7F—fS Ð¢VçG'’ç7FFT–BÓÓÒ'&vR Ð¢ò&vT7F—fPÐ¢¢fÇ6PÐ¢Ó°Ð¢Ò“°Ð¢ÖV6†æ–72ç7VÆÆ67F–æt&Æö6¶VBÒ&ööÆVâ€Ð¢&vT7F—fRb`Ð¢ÖV6†æ–72ç&W7G&–7F–öç2ç6öÖR‚†VçG'’’Óâ°Ð¢&WGW&â€Ð¢VçG'’æ7F—fRÓÓÒG'VRb`Ð¢VçG'’ç&W7G&–7F–öâÓÓÒ&6ææ÷D67E7VÆÇ2 Ð¢“°Ð¢ÒÐ¢“°Ð¢ÖV6†æ–72ç7VÆÆ67F–æt&Æö6µ&V6öç2ÐÐ¢ÖV6†æ–72ç7VÆÆ67F–æt&Æö6¶V@Ð¢ò²%&vR—27F—fR%ÐÐ¢¢µÓ°Ð¢G&gBæ6öÖ&BæGF6·5W$7F–öâÒÖF‚æÖ‚€Ð¢ÀÐ¢6fTçVÖ&W"€Ð¢ÖV6†æ–72æGF6´7F–öãòæGF6·2ÀÐ¢Ð¢Ð¢“°Ð¢G&gBæÖv–2æ67F–æt&Æö6¶VBÐÐ¢ÖV6†æ–72ç7VÆÆ67F–æt&Æö6¶VC°Ð¢G&gBæÖv–2æ67F–æt&Æö6µ&V6öç2Ò6ÆöæTFF€Ð¢ÖV6†æ–72ç7VÆÆ67F–æt&Æö6µ&V6öç0Ð¢“°Ð¢G&gBæ6Æ74ÖV6†æ–72ÒÖV6†æ–73°Ð¢ÐÐ Ð¢gVæ7F–öâ6WE6V7F–öã$6”6†ö–6UfÇVW2€Ð¢fVGW&T–BÀÐ¢fÇVW2ÒµÐÐ¢’°Ð¢6öç7B6ÆVäfVGW&T–BÐÐ¢6ÆVå7G&–ær†fVGW&T–B“°Ð Ð¢–b‚6ÆVäfVGW&T–B’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢6öç7B6ÆVåfÇVW2ÐÐ¢Væ—VT6ÆVä'&’‡fÇVW2“°Ð¢6öç7B6†ö–6W2Òæ÷&ÖÆ—¦T6Æ746†ö–6TÖ€Ð¢7&VF÷%7FFRæG&gBæ6Æ746†ö–6W0Ð¢“°Ð Ð¢–b†6ÆVåfÇVW2æÆVæwF‚’°Ð¢6†ö–6W5¶6ÆVäfVGW&T–EÒÒ6ÆVåfÇVW3°Ð¢ÒVÇ6R°Ð¢FVÆWFR6†ö–6W5¶6ÆVäfVGW&T–EÓ°Ð¢ÐÐ Ð¢6öç7B6Æ÷BÐÐ¢vWE6V7F–öã%VæÆö6¶VD6•6Æ÷B†6ÆVäfVGW&T–B“°Ð Ð¢–b‡6Æ÷B’°Ð¢–b†6ÆVåfÇVW2æÆVæwF‚’°Ð¢6†ö–6W5·6Æ÷Bæ–EÒÒ6ÆVåfÇVW3°Ð¢ÒVÇ6R°Ð¢FVÆWFR6†ö–6W5·6Æ÷Bæ–EÓ°Ð¢ÐÐ Ð¢–b‡6Æ÷BæÆVv7”–BÓÒ6Æ÷Bæ–B’°Ð¢FVÆWFR6†ö–6W5·6Æ÷BæÆVv7”–EÓ°Ð¢ÐÐ Ð¢6öç7B6Æ74VçG'’ÐÐ¢vWD6Æ74VçG'”D–æFW‚‡6Æ÷Bæ6Æ74–æFW‚“°Ð Ð¢–b†6Æ74VçG'’’°Ð¢6Æ74VçG'’æ6†ö–6W2Ò°Ð¢âââ†6Æ74VçG'’æ6†ö–6W2ÇÂ·ÒÐ¢Ó°Ð Ð¢6öç7BVçG'”6†ö–6W2ÐÐ¢æ÷&ÖÆ—¦T6Æ746†ö–6TÖ€Ð¢6Æ74VçG'’æ6†ö–6W2æ6Æ74fVGW&W0Ð¢“°Ð Ð¢–b†6ÆVåfÇVW2æÆVæwF‚’°Ð¢VçG'”6†ö–6W5·6Æ÷Bæ–EÒÒ6ÆVåfÇVW3°Ð¢ÒVÇ6R°Ð¢FVÆWFRVçG'”6†ö–6W5·6Æ÷Bæ–EÓ°Ð¢ÐÐ Ð¢–b‡6Æ÷BæfVGW&T–BÓÒ6Æ÷Bæ–B’°Ð¢FVÆWFRVçG'”6†ö–6W5·6Æ÷BæfVGW&T–EÓ°Ð¢ÐÐ Ð¢–b‡6Æ÷BæÆVv7”–BÓÒ6Æ÷Bæ–B’°Ð¢FVÆWFRVçG'”6†ö–6W5·6Æ÷BæÆVv7”–EÓ°Ð¢ÐÐ Ð¢6Æ74VçG'’æ6†ö–6W2æ6Æ74fVGW&W2ÐÐ¢VçG'”6†ö–6W3°Ð¢ÐÐ¢ÐÐ Ð¢7&VF÷%7FFRæG&gBæ6Æ746†ö–6W2Ò6†ö–6W3°Ð Ð¢&WGW&âG'VS°Ð¢ÐÐ Ð¢gVæ7F–öâf÷&ÖE6V7F–öã$6Æ746†ö–6UfÇVW2‡fÇVW2’°Ð¢6öç7B6ÆVåfÇVW2Ò'&’æ—4'&’‡fÇVW2’òfÇVW2¢µÓ°Ð Ð¢–b€Ð¢6ÆVåfÇVW2ç6öÖR‚‡fÇVR’Óâ°Ð¢&WGW&âfÇVRç7F'G5v—F‚‚&¶æ÷vã¢"’ÇÂfÇVRç7F'G5v—F‚‚&7F—fS¢"“°Ð¢ÒÐ¢’°Ð¢6öç7B–ægW6–öäÖÒæWrÖ€Ð¢vWDÆÄ6Æ75FV×ÆFW2‚Ð¢æfÆDÖ‚†6Æ75FV×ÆFR’Óâ°Ð¢&WGW&â6Æ75FV×ÆFRæ–ægW6–öç2ÇÂµÓ°Ð¢ÒÐ¢æÖ‚†–ægW6–öâ’Óâ°Ð¢&WGW&â¶–ægW6–öâæ–BÂ–ægW6–öâææÖUÓ°Ð¢ÒÐ¢“°Ð¢6öç7BæÖW4f÷%&Vf—‚Ò‡&Vf—‚’Óâ6ÆVåfÇVW0Ð¢æf–ÇFW"‚‡fÇVR’ÓâfÇVRç7F'G5v—F‚‡&Vf—‚’Ð¢æÖ‚‡fÇVR’Óâ°Ð¢6öç7B–BÒfÇVRç6Æ–6R‡&Vf—‚æÆVæwF‚“°Ð¢&WGW&â–ægW6–öäÖævWB†–B’ÇÂ–C°Ð¢Ò“°Ð¢6öç7B¶æ÷vâÒæÖW4f÷%&Vf—‚‚&¶æ÷vã¢"“°Ð¢6öç7B7F—fRÒæÖW4f÷%&Vf—‚‚&7F—fS¢"“°Ð Ð¢&WGW&â°Ð¢¶æ÷vã¢G¶¶æ÷vâæÆVæwF‚ò¶æ÷vâæ¦ö–â‚"Â"’¢$æöæR'ÖÀÐ¢–ægW6VC¢G¶7F—fRæÆVæwF‚ò7F—fRæ¦ö–â‚"Â"’¢$æöæR'Ö Ð¢Òæ¦ö–â‚#²"“°Ð¢ÐÐ Ð¢–b†6ÆVåfÇVW2æ–æ6ÇVFW2‚&ÖöFS¦fVB"’’°Ð¢6öç7BfVD–BÒ6ÆVå7G&–ær€Ð¢6ÆVåfÇVW2æf–æB‚‡fÇVR’ÓâfÇVRç7F'G5v—F‚‚&fVC¢"’Ð¢’ç6Æ–6R‚&fVC¢"æÆVæwF‚“°Ð¢6öç7BfVBÒDTdTÅEôdTE2æf–æB‚†VçG'’’ÓâVçG'’æ–BÓÓÒfVD–B“°Ð Ð¢&WGW&âfVBòfVC¢G¶fVBææÖWÖ¢$fVBæ÷B6VÆV7FVB#°Ð¢ÐÐ Ð¢–b†6ÆVåfÇVW2æ–æ6ÇVFW2‚&ÖöFS¦6’"’’°Ð¢6öç7B&–Æ—G”6÷VçG2Ò·Ó°Ð Ð¢6ÆVåfÇVW0Ð¢æf–ÇFW"‚‡fÇVR’ÓâfÇVRç7F'G5v—F‚‚&&–Æ—G“¢"’Ð¢æf÷$V6‚‚‡fÇVR’Óâ°Ð¢6öç7B&–Æ—G”–BÒfÇVRç7Æ—B‚#¢"•³Ó°Ð¢&–Æ—G”6÷VçG5¶&–Æ—G”–EÒÒ†&–Æ—G”6÷VçG5¶&–Æ—G”–EÒÇÂ’²°Ð¢Ò“°Ð Ð¢6öç7B7VÖÖ'’Òö&¦V7BæVçG&–W2†&–Æ—G”6÷VçG2Ð¢æÖ‚…¶&–Æ—G”–BÂÖ÷VçEÒ’Óâ°Ð¢6öç7BæÖRÒ$”Ä•E•ôDTd”ä•D”ôå2æf–æB€Ð¢†&–Æ—G’’Óâ&–Æ—G’æ–BÓÓÒ&–Æ—G”–@Ð¢“òææÖRÇÂ&–Æ—G”–BçFõWW$66R‚“°Ð Ð¢&WGW&âG¶æÖWÒ²G¶Ö÷VçGÖ°Ð¢Ò“°Ð Ð¢&WGW&â7VÖÖ'’æÆVæwF€Ð¢ò&–Æ—G’66÷&W3¢G·7VÖÖ'’æ¦ö–â‚"Â"—Ö Ð¢¢$&–Æ—G’66÷&W2æ÷B6VÆV7FVB#°Ð¢ÐÐ Ð¢&WGW&â6ÆVåfÇVW2æÖ‚‡fÇVR’Óâ°Ð¢&WGW&âDTdTÅEõ5TÄÅ2æf–æB‚‡7VÆÂ’Óâ°Ð¢&WGW&â7VÆÂæ–BÓÓÒfÇVS°Ð¢Ò“òææÖRÇÂfÇVS°Ð¢Ò’æ¦ö–â‚"Â"“°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öã$6”fVGW&R†fVGW&T–B’°Ð¢6öç7B×VÇF–6Æ756Æ÷BÐÐ¢vWE6V7F–öã%VæÆö6¶VD6•6Æ÷B†fVGW&T–B“°Ð Ð¢–b†×VÇF–6Æ756Æ÷B’°Ð¢&WGW&â°Ð¢–C¢×VÇF–6Æ756Æ÷Bæ–BÀÐ¢ÆWfVÃ¢×VÇF–6Æ756Æ÷Bæ6Æ74ÆWfVÂÀÐ¢÷F–öå6÷W&6S¢&6”÷$fVB"ÀÐ¢6Æ74–C¢×VÇF–6Æ756Æ÷Bæ6Æ74–BÀÐ¢6Æ74æÖS¢×VÇF–6Æ756Æ÷Bæ6Æ74æÖPÐ¢Ó°Ð¢ÐÐ Ð¢&WGW&âvWE6V7F–öã$6Æ74fVGW&W5F‡&÷Vv„ÆWfVÂ‚Ð¢æf–æB‚†fVGW&R’Óâ°Ð¢&WGW&â€Ð¢fVGW&Ræ–BÓÓÒfVGW&T–Bb`Ð¢fVGW&Ræ÷F–öå6÷W&6RÓÓÒ&6”÷$fVB Ð¢“°Ð¢Ò’ÇÂçVÆÃ°Ð¢ÐÐ Ð¢gVæ7F–öâ7–æ56V7F–öã$Gfæ6VÖVçD6†ö–6R†fVGW&T–B’°Ð¢6öç7BfVGW&RÒvWE6V7F–öã$6”fVGW&R†fVGW&T–B“°Ð¢6öç7B×VÇF–6Æ756Æ÷BÐÐ¢vWE6V7F–öã%VæÆö6¶VD6•6Æ÷B†fVGW&T–B“°Ð¢6öç7B&–Ö'”6Æ72ÒvWE6V7F–öã%&–Ö'”6Æ72‚“°Ð Ð¢–b‚fVGW&RÇÂ‚&–Ö'”6Æ72bb×VÇF–6Æ756Æ÷B’’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢6öç7B6Æ74–BÒÖ¶U6fT–B€Ð¢×VÇF–6Æ756Æ÷Còæ6Æ74–BÇÀÐ¢&–Ö'”6Æ73òæ6Æ74–BÇÀÐ¢&–Ö'”6Æ73òæ6Æ74æÖRÀÐ¢&6Æ72 Ð¢“°Ð¢6öç7B6Æ74ÆWfVÂÒÖF‚æÖ‚€Ð¢ÀÐ¢ÖF‚ç&÷VæB€Ð¢6fTçVÖ&W"€Ð¢×VÇF–6Æ756Æ÷Còæ6Æ74ÆWfVÂóðÐ¢fVGW&RæÆWfVÂÀÐ¢Ð¢Ð¢Ð¢“°Ð¢6öç7B–BÐÐ¢×VÇF–6Æ756Æ÷Còæ–BÇÀÐ¢G¶6Æ74–GÒÖÆWfVÂÒG¶6Æ74ÆWfVÇÒÖ6–°Ð¢6öç7B7FFRÒvWE6V7F–öã$6”6†ö–6U7FFR†fVGW&T–B“°Ð¢6öç7BfVBÒDTdTÅEôdTE2æf–æB‚†VçG'’’Óâ°Ð¢&WGW&âVçG'’æ–BÓÓÒ7FFRæfVD–C°Ð¢Ò“°Ð¢6öç7B6†ö–6W2Òæ÷&ÖÆ—¦TGfæ6VÖVçD6†ö–6W2€Ð¢7&VF÷%7FFRæG&gBæGfæ6VÖVçD6†ö–6W0Ð¢’æf–ÇFW"‚†6†ö–6R’Óâ°Ð¢&WGW&â€Ð¢6†ö–6Ræ–BÓÓÒ–BÇÀÐ¢6†ö–6Ræ–BÓÓÒ×VÇF–6Æ756Æ÷CòæÆVv7”–BÇÀÐ¢€Ð¢×VÇF–6Æ756Æ÷Bb`Ð¢6ÆVå7G&–ær€Ð¢6†ö–6Ræ6Æ74VçG'”–BÇÀÐ¢6†ö–6RæVçG'”–@Ð¢’ÓÓÒ×VÇF–6Æ756Æ÷Bæ6Æ74VçG'”–Bb`Ð¢6fTçVÖ&W"†6†ö–6Ræ6Æ74ÆWfVÂÂ’ÓÓÐÐ¢6Æ74ÆWfVÀÐ¢’ÇÀÐ¢€Ð¢×VÇF–6Æ756Æ÷Bb`Ð¢Ö¶U6fT–B†6†ö–6Ræ6Æ74–BÂ""’ÓÓÒ6Æ74–Bb`Ð¢6fTçVÖ&W"†6†ö–6Ræ6Æ74ÆWfVÂÂ’ÓÓÐÐ¢6Æ74ÆWfVÀÐ¢Ð¢“°Ð¢Ò“°Ð Ð¢–b‡7FFRæÖöFR’°Ð¢6†ö–6W2çW6‚‡°Ð¢–BÀÐ¢G—S¢&6’Ö÷"ÖfVB"ÀÐ¢6Æ74VçG'”–C Ð¢×VÇF–6Æ756Æ÷Còæ6Æ74VçG'”–BÇÂ""ÀÐ¢6Æ74–BÀÐ¢6Æ74ÆWfVÂÀÐ¢ÖöFS¢7FFRæÖöFRÀÐ¢fVD–C¢7FFRæÖöFRÓÓÒ&fVB"ò7FFRæfVD–B¢""ÀÐ¢fVDæÖS Ð¢7FFRæÖöFRÓÓÒ&fVB Ð¢òfVCòææÖRÇÂ" Ð¢¢""ÀÐ¢fVD6†ö–6W3 Ð¢7FFRæÖöFRÓÓÒ&fVB Ð¢òæ÷&ÖÆ—¦TfVD6†ö–6U6VÆV7F–öç2‡7FFRæfVD6†ö–6W2Ð¢¢·ÐÐ¢Ò“°Ð¢ÐÐ Ð¢7&VF÷%7FFRæG&gBæGfæ6VÖVçD6†ö–6W2Ò6†ö–6W3°Ð Ð¢&WGW&âG'VS°Ð¢ÐÐ Ð¢gVæ7F–öâ6WE6V7F–öã$6”&öçW56÷W&6R€Ð¢fVGW&T–BÀÐ¢&–Æ—F–W2ÒµÐÐ¢’°Ð¢6öç7B6÷W&6TæÖRÐÐ¢6Æ72Ö6“¢G¶fVGW&T–GÖ°Ð¢6öç7B6÷W&6W2ÐÐ¢Vç7W&T&–Æ—G”&öçW56÷W&6W2€Ð¢7&VF÷%7FFRæG&g@Ð¢“°Ð Ð¢FVÆWFR6÷W&6W5·6÷W&6TæÖUÓ°Ð Ð¢&V6Æ7VÆFT&–Æ—G•F÷FÇ2€Ð¢7&VF÷%7FFRæG&g@Ð¢“°Ð Ð¢6öç7B&öçW4ÖÒ7&VFT&–Æ—G”Öƒ“°Ð¢6öç7Bæ÷&ÖÄ&–Æ—G•66÷&W2ÐÐ¢7&VFTæ÷&ÖÄ&–Æ—G”666÷&TÖ€Ð¢7&VF÷%7FFRæG&g@Ð¢“°Ð Ð¢&–Æ—F–W2æf÷$V6‚‚†&–Æ—G”–B’Óâ°Ð¢–b„ö&¦V7Bæ†4÷vâ†&öçW4ÖÂ&–Æ—G”–B’’°Ð¢FD6VDæ÷&ÖÄ&–Æ—G”–æ7&V6R‡°Ð¢&öçW4ÖÀÐ¢66÷&TÖ Ð¢æ÷&ÖÄ&–Æ—G•66÷&W2ÀÐ¢&–Æ—G”–BÀÐ¢Ö÷VçC¢ÀÐ¢Ö†–×VÓ Ð¢DTdTÅEôdTEô$”Ä•E•õ44õ$UôÔ„”ÕTÐÐ¢Ò“°Ð¢ÐÐ¢Ò“°Ð Ð¢6WD&–Æ—G”&öçW56÷W&6R€Ð¢6÷W&6TæÖRÀÐ¢&öçW4Ö Ð¢“°Ð¢ÐÐ Ð¢gVæ7F–öâ&VÖ÷fU6V7F–öã$6”fVD–eVçW6VB†fVD–B’°Ð¢6öç7B6ÆVäfVD–BÒ6ÆVå7G&–ær†fVD–B“°Ð Ð¢–b‚6ÆVäfVD–B’°Ð¢&WGW&ã°Ð¢ÐÐ Ð¢6öç7B7F–ÆÅW6VBÒö&¦V7BçfÇVW2€Ð¢æ÷&ÖÆ—¦T6Æ746†ö–6TÖ€Ð¢7&VF÷%7FFRæG&gBæ6Æ746†ö–6W0Ð¢Ð¢’ç6öÖR‚‡fÇVW2’Óâ°Ð¢&WGW&âfÇVW2æ–æ6ÇVFW2†fVC¢G¶6ÆVäfVD–GÖ“°Ð¢Ò’ÇÀÐ¢vWD6Æ75&öw&W76–öäVçG&–W2€Ð¢7&VF÷%7FFRæG&g@Ð¢’ç6öÖR‚†6Æ74VçG'’’Óâ°Ð¢&WGW&âö&¦V7BçfÇVW2€Ð¢æ÷&ÖÆ—¦T6Æ746†ö–6TÖ€Ð¢6Æ74VçG'“òæ6†ö–6W0Ð¢òæ6Æ74fVGW&W0Ð¢Ð¢’ç6öÖR‚‡fÇVW2’Óâ°Ð¢&WGW&âfÇVW2æ–æ6ÇVFW2€Ð¢fVC¢G¶6ÆVäfVD–GÖ Ð¢“°Ð¢Ò“°Ð¢Ò“°Ð Ð¢–b‚7F–ÆÅW6VB’°Ð¢7&VF÷%7FFRæG&gBæfVG2Òæ÷&ÖÆ—¦TfVD–G2€Ð¢7&VF÷%7FFRæG&gBæfVG0Ð¢’æf–ÇFW"‚†–B’Óâ–BÓÒ6ÆVäfVD–B“°Ð Ð¢7&VF÷%7FFRæG&gBç6VÆV7FVDfVG2ÐÐ¢æ÷&ÖÆ—¦TfVD–G2€Ð¢7&VF÷%7FFRæG&g@Ð¢ç6VÆV7FVDfVG0Ð¢’æf–ÇFW"‚†–B’Óâ°Ð¢&WGW&â–BÓÒ6ÆVäfVD–C°Ð¢Ò“°Ð¢ÐÐ¢ÐÐ Ð¢gVæ7F–öâ6WE6V7F–öã$6”ÖöFR†fVGW&T–BÂÖöFR’°Ð¢–b€Ð¢vWE6V7F–öã$6”fVGW&R†fVGW&T–B’ÇÀÐ¢²&6’"Â&fVB%Òæ–æ6ÇVFW2†ÖöFRÐ¢’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢6öç7B&Wf–÷W2ÒvWE6V7F–öã$6”6†ö–6U7FFR†fVGW&T–B“°Ð Ð¢–b‡&Wf–÷W2æÖöFRÓÓÒÖöFR’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢6WE6V7F–öã$6”6†ö–6UfÇVW2€Ð¢fVGW&T–BÀÐ¢¶ÖöFS¢G¶ÖöFWÖÐÐ¢“°Ð Ð¢6WE6V7F–öã$6”&öçW56÷W&6R†fVGW&T–BÂµÒ“°Ð¢&VÖ÷fU6V7F–öã$6”fVD–eVçW6VB‡&Wf–÷W2æfVD–B“°Ð¢7–æ56V7F–öã$Gfæ6VÖVçD6†ö–6R†fVGW&T–B“°Ð¢Ç•6VÆV7FVDfVDÖV6†æ–72‚“°Ð¢Ç”6ö×F–&–Æ—G”Æ–6W2†7&VF÷%7FFRæG&gB“°Ð¢Ö&´G&gD6†ævVB‚“°Ð Ð¢&WGW&âG'VS°Ð¢ÐÐ Ð¢gVæ7F–öâF§W7E6V7F–öã$6”&–Æ—G’€Ð¢fVGW&T–BÀÐ¢&–Æ—G”–BÀÐ¢FVÇFÐ¢’°Ð¢–b€Ð¢vWE6V7F–öã$6”fVGW&R†fVGW&T–B’ÇÀÐ¢$”Ä•E•ôDTd”ä•D”ôå2ç6öÖR‚†&–Æ—G’’Óâ&–Æ—G’æ–BÓÓÒ&–Æ—G”–BÐ¢’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢6öç7B7FFRÒvWE6V7F–öã$6”6†ö–6U7FFR†fVGW&T–B“°Ð¢6öç7B&–Æ—F–W2Ò²ââç7FFRæ&–Æ—F–W5Ó°Ð¢6öç7BÖ÷VçBÒÖF‚ç6–vâ‡6fTçVÖ&W"†FVÇFÂ’“°Ð Ð¢–b†Ö÷VçBâ’°Ð¢6öç7B7W'&VçD6÷VçBÒ&–Æ—F–W2æf–ÇFW"€Ð¢†–B’Óâ–BÓÓÒ&–Æ—G”–@Ð¢’æÆVæwFƒ°Ð¢6öç7B66÷&Uv—F†÷WEF†—46’ÐÐ¢vWDæ÷&ÖÄ&–Æ—G•66÷&Tf÷$6€Ð¢7&VF÷%7FFRæG&gBÀÐ¢&–Æ—G”–BÀÐ¢°Ð¢W†6ÇVFVE6÷W&6S Ð¢6Æ72Ö6“¢G¶fVGW&T–GÖ Ð¢ÐÐ¢“°Ð Ð¢–b€Ð¢&–Æ—F–W2æÆVæwF‚ãÒ"ÇÀÐ¢66÷&Uv—F†÷WEF†—46’²7W'&VçD6÷VçBãÒ# Ð¢’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢&–Æ—F–W2çW6‚†&–Æ—G”–B“°Ð¢ÒVÇ6R–b†Ö÷VçBÂ’°Ð¢6öç7B–æFW‚Ò&–Æ—F–W2æÆ7D–æFW„öb†&–Æ—G”–B“°Ð Ð¢–b†–æFW‚Â’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢&–Æ—F–W2ç7Æ–6R†–æFW‚Â“°Ð¢ÒVÇ6R°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢6WE6V7F–öã$6”6†ö–6UfÇVW2€Ð¢fVGW&T–BÀÐ¢°Ð¢&ÖöFS¦6’"ÀÐ¢ââæ&–Æ—F–W2æÖ‚†–BÂ–æFW‚’Óâ°Ð¢&WGW&â&–Æ—G“¢G¶–GÓ¢G¶–æFW‚²Ö°Ð¢ÒÐ¢ÐÐ¢“°Ð Ð¢6WE6V7F–öã$6”&öçW56÷W&6R†fVGW&T–BÂ&–Æ—F–W2“°Ð¢7–æ56V7F–öã$Gfæ6VÖVçD6†ö–6R†fVGW&T–B“°Ð¢Ç”6ö×F–&–Æ—G”Æ–6W2†7&VF÷%7FFRæG&gB“°Ð¢Ö&´G&gD6†ævVB‚“°Ð Ð¢&WGW&âG'VS°Ð¢ÐÐ Ð¢gVæ7F–öâ6Æ7VÆFTfVE&W&WV—6—FU&W7VÇB€Ð¢fVBÀÐ¢6†&7FW"Ò7&VF÷%7FFRæG&gBÀÐ¢÷F–öç2Ò·ÐÐ¢’°Ð¢6öç7B&WV—&VÖVçG2Ò'&’æ—4'&’†fVCòç&W&WV—6—FW2Ð¢òfVBç&W&WV—6—FW0Ð¢¢µÓ°Ð¢6öç7B&V6öç2ÒµÓ°Ð¢6öç7BGf—6÷&–W2ÒµÓ°Ð¢6öç7B6WGF–æu&WV—&VÖVçG2ÒµÓ°Ð¢6öç7B7W'&VçE6Æ÷BÒvWE6V7F–öã%VæÆö6¶VD6•6Æ÷B€Ð¢÷F–öç2æfVGW&T–BÀÐ¢6†&7FW Ð¢“°Ð¢6öç7B6VÆV7FVDfVD–ç7Fæ6W2ÒvWE6VÆV7FVDFVfVÇDfVD–ç7Fæ6W2†6†&7FW"“°Ð¢6öç7B6VÆV7FVDVÇ6Wv†W&RÒ6VÆV7FVDfVD–ç7Fæ6W2ç6öÖR‚†–ç7Fæ6R’Óâ°Ð¢&WGW&â€Ð¢–ç7Fæ6RæfVD–BÓÓÒfVCòæ–Bb`Ð¢°Ð¢6ÆVå7G&–ær†÷F–öç2æfVGW&T–B’ÀÐ¢6ÆVå7G&–ær†7W'&VçE6Æ÷Còæ–B’ÀÐ¢6ÆVå7G&–ær†7W'&VçE6Æ÷CòæÆVv7”–B’ÀÐ¢6ÆVå7G&–ær†7W'&VçE6Æ÷CòæfVGW&T–BÐ¢Òæf–ÇFW"„&ööÆVâ’æ–æ6ÇVFW2†–ç7Fæ6Rç6Æ÷D–BÐ¢“°Ð¢Ò“°Ð¢6öç7Bæ÷&ÖÆ—¦VE&öf–6–Væ6–W2Ò†6FVv÷'’’Óâ°Ð¢&WGW&âVæ—VT6ÆVä'&’†6†&7FW#òç&öf–6–Væ6–W3òå¶6FVv÷'•ÒÐ¢æÖ‚‡fÇVR’ÓâÖ¶U6fT–B‡fÇVRÂ""’“°Ð¢Ó°Ð¢6öç7B†57VÆÆ67F–ærÒ‚’Óâ°Ð¢6öç7B6Æ757VÆÆ67F–ærÐÐ¢vWD6†&7FW%7VÆÆ67F–æt–æfò€Ð¢6†&7FW Ð¢Ð¢ç6öÖR‚†VçG'’’Óâ°Ð¢&WGW&â€Ð¢6fTçVÖ&W"€Ð¢VçG'’æ6çG&—4¶æ÷vâÀÐ¢ Ð¢’âÇÀÐ¢6fTçVÖ&W"€Ð¢VçG'’ç7VÆÇ4¶æ÷vâÀÐ¢ Ð¢’âÇÀÐ¢ö&¦V7BçfÇVW2€Ð¢VçG'’ç7VÆÅ6Æ÷G2ÇÀÐ¢·ÐÐ¢’ç6öÖR‚‡6Æ÷G2’Óâ°Ð¢&WGW&â6fTçVÖ&W"€Ð¢6Æ÷G2ÀÐ¢ Ð¢’â°Ð¢Ò’ÇÀÐ¢6fTçVÖ&W"€Ð¢VçG'’ç7DÖv–3òç6Æ÷G2ÀÐ¢ Ð¢’â Ð¢“°Ð¢Ò“°Ð¢6öç7BÖv–2ÐÐ¢6†&7FW#òæÖv–2ÇÂ·Ó°Ð¢6öç7BF—&V7E7VÆÄ–G2Ò°Ð¢ââçVæ—VT6ÆVä'&’€Ð¢Öv–2æ¶æ÷vå7VÆÄ–G0Ð¢’ÀÐ¢ââçVæ—VT6ÆVä'&’€Ð¢Öv–2ç&W&VE7VÆÄ–G0Ð¢’ÀÐ¢ââçVæ—VT6ÆVä'&’€Ð¢Öv–2æ–ææFU7VÆÄ–G0Ð¢’ÀÐ¢ââçVæ—VT6ÆVä'&’€Ð¢Öv–2æ7W7FöÕ7VÆÄ–G0Ð¢Ð¢Ó°Ð¢6öç7B7VÆÅ&V6÷&G2Ò°Ð¢âââ€Ð¢'&’æ—4'&’€Ð¢Öv–2æ–ææFU7VÆÇ0Ð¢Ð¢òÖv–2æ–ææFU7VÆÇ0Ð¢¢µÐÐ¢’ÀÐ¢âââ€Ð¢'&’æ—4'&’€Ð¢Öv–2æ7W7FöÕ7VÆÇ0Ð¢Ð¢òÖv–2æ7W7FöÕ7VÆÇ0Ð¢¢µÐÐ¢’ÀÐ¢âââ€Ð¢'&’æ—4'&’€Ð¢6†&7FW Ð¢òæfVDÖV6†æ–70Ð¢òç7VÆÆ67F–æpÐ¢Ð¢ò6†&7FW Ð¢æfVDÖV6†æ–70Ð¢ç7VÆÆ67F–æpÐ¢¢µÐÐ¢Ð¢Ó°Ð¢6öç7B6÷W&6T†57VÆÇ2Ò€Ð¢6÷W&6PÐ¢’Óâ°Ð¢&WGW&â€Ð¢Væ—VT6ÆVä'&’€Ð¢6÷W&6Sòç7VÆÄ–G0Ð¢’æÆVæwF‚âÇÀÐ¢€Ð¢'&’æ—4'&’€Ð¢6÷W&6Sòç7VÆÅ&V6÷&G0Ð¢’b`Ð¢6÷W&6Rç7VÆÅ&V6÷&G0Ð¢æÆVæwF‚â Ð¢Ð¢“°Ð¢Ó°Ð¢6öç7B7F÷&VE6÷W&6W2Ò°Ð¢ââäö&¦V7BçfÇVW2€Ð¢Öv–2æ6Æ756÷W&6W2ÇÀÐ¢·ÐÐ¢’ÀÐ¢ââäö&¦V7BçfÇVW2€Ð¢Öv–2æfVE6÷W&6W2ÇÀÐ¢·ÐÐ¢Ð¢Ó°Ð Ð¢&WGW&â€Ð¢6Æ757VÆÆ67F–ærÇÀÐ¢F—&V7E7VÆÄ–G2æÆVæwF‚âÇÀÐ¢7VÆÅ&V6÷&G2æÆVæwF‚âÇÀÐ¢7F÷&VE6÷W&6W2ç6öÖR€Ð¢6÷W&6T†57VÆÇ0Ð¢Ð¢“°Ð¢Ó°Ð Ð¢–b‡6VÆV7FVDVÇ6Wv†W&RbbfVCòç&WVF&ÆRÓÒG'VR’°Ð¢&V6öç2çW6‚‚$Ç&VG’6VÆV7FVB–âæ÷F†W"Gfæ6VÖVçB6Æ÷B"“°Ð¢ÐÐ Ð¢&WV—&VÖVçG2æf÷$V6‚‚‡&WV—&VÖVçB’Óâ°Ð¢6öç7BG—RÒ6ÆVå7G&–ær‡&WV—&VÖVçCòçG—R“°Ð Ð¢–b‡G—RÓÓÒ'7VÆÆ67F–ær"’°Ð¢–b‚†57VÆÆ67F–ær‚’’°Ð¢&V6öç2çW6‚‚%&WV—&W27VÆÆ67F–ær"“°Ð¢ÐÐ¢&WGW&ã°Ð¢ÐÐ Ð¢–b‡G—RÓÓÒ'7VÆÆ67F–æt÷%7DÖv–2"’°Ð¢–b‚†57VÆÆ67F–ær‚’’°Ð¢&V6öç2çW6‚‚%&WV—&W27VÆÆ67F–ær÷"7BÖv–2"“°Ð¢ÐÐ¢&WGW&ã°Ð¢ÐÐ Ð¢–b‡G—RÓÓÒ'7VÆÆ67F–æt÷%'VæT6'fW""’°Ð¢6öç7B&6¶w&÷VæD–BÒÖ¶U6fT–B€Ð¢6†&7FW#òæ&6¶w&÷VæCòæ–BÇÂ6†&7FW#òæ&6¶w&÷VæCòææÖRÀÐ¢" Ð¢“°Ð Ð¢–b‚†57VÆÆ67F–ær‚’bb&6¶w&÷VæD–BÓÒ''VæRÖ6'fW""’°Ð¢&V6öç2çW6‚‚%&WV—&W27VÆÆ67F–ær÷"F†R'VæR6'fW"&6¶w&÷VæB"“°Ð¢ÐÐ¢&WGW&ã°Ð¢ÐÐ Ð¢–b‡G—RÓÓÒ&ÆWfVÂ"ÇÂG—RÓÓÒ&Ö–æ–×VÔÆWfVÂ"’°Ð¢6öç7BÖ–æ–×VÒÒÖF‚æÖ‚€Ð¢ÀÐ¢6fTçVÖ&W"€Ð¢&WV—&VÖVçBæÖ–æ–×VÒóò&WV—&VÖVçBçfÇVRóò&WV—&VÖVçBæÆWfVÂÀÐ¢Ð¢Ð¢“°Ð¢6öç7BÆWfVÂÒ6Æ×ÆWfVÂ€Ð¢6†&7FW#òæ6Æ75&öw&W76–öãòçF÷FÄÆWfVÂÇÂ6†&7FW#òæÆWfVÂÇÂÐ¢“°Ð Ð¢–b†ÆWfVÂÂÖ–æ–×VÒ’°Ð¢&V6öç2çW6‚†&WV—&W2ÆWfVÂG¶Ö–æ–×V×Ö“°Ð¢ÐÐ¢&WGW&ã°Ð¢ÐÐ Ð¢–b‡G—RÓÓÒ&&–Æ—G”Ö–æ–×VÒ"ÇÂG—RÓÓÒ&&–Æ—G’"’°Ð¢6öç7B&–Æ—G”–BÒ6ÆVå7G&–ær‡&WV—&VÖVçBæ&–Æ—G’’çFôÆ÷vW$66R‚“°Ð¢6öç7BÖ–æ–×VÒÒ6fTçVÖ&W"€Ð¢&WV—&VÖVçBæÖ–æ–×VÒóò&WV—&VÖVçBçfÇVRÀÐ¢0Ð¢“°Ð¢6öç7B66÷&RÐÐ¢vWD&–Æ—G•66÷&R€Ð¢6†&7FW"ÀÐ¢&–Æ—G”–@Ð¢“°Ð Ð¢–b‚&–Æ—G”–BÇÂ66÷&RÂÖ–æ–×VÒ’°Ð¢&V6öç2çW6‚€Ð¢&WV—&W2G¶&–Æ—G”–Bò&–Æ—G”–BçFõWW$66R‚’¢&â&–Æ—G’'ÒG¶Ö–æ–×V×Ö Ð¢“°Ð¢ÐÐ¢&WGW&ã°Ð¢ÐÐ Ð¢–b‡G—RÓÓÒ&&–Æ—G”ç”Ö–æ–×VÒ"’°Ð¢6öç7BÖ–æ–×VÒÒ6fTçVÖ&W"€Ð¢&WV—&VÖVçBæÖ–æ–×VÒóò&WV—&VÖVçBçfÇVRÀÐ¢0Ð¢“°Ð¢6öç7B&–Æ—G”–G2ÒVæ—VT6ÆVä'&’‡&WV—&VÖVçBæ&–Æ—F–W2Ð¢æÖ‚†&–Æ—G’’Óâ6ÆVå7G&–ær†&–Æ—G’’çFôÆ÷vW$66R‚’“°Ð¢6öç7BÖWBÒ&–Æ—G”–G2ç6öÖR‚†&–Æ—G”–B’Óâ°Ð¢&WGW&â€Ð¢vWD&–Æ—G•66÷&R€Ð¢6†&7FW"ÀÐ¢&–Æ—G”–@Ð¢’ãÒÖ–æ–×VÐÐ¢“°Ð¢Ò“°Ð Ð¢–b‚ÖWB’°Ð¢&V6öç2çW6‚€Ð¢&WV—&W2G¶&–Æ—G”–G2æÖ‚†–B’Óâ–BçFõWW$66R‚’’æ¦ö–â‚"÷""—ÒG¶Ö–æ–×V×Ö Ð¢“°Ð¢ÐÐ¢&WGW&ã°Ð¢ÐÐ Ð¢–b‡G—RÓÓÒ&6Æ72"’°Ð¢6öç7BÆÆ÷vVD–G2ÒVæ—VT6ÆVä'&’€Ð¢&WV—&VÖVçBæ6Æ74–G2ÇÂ&WV—&VÖVçBæg&öÒÇÂµÐÐ¢’æÖ‚†–B’ÓâÖ¶U6fT–B†–BÂ""’“°Ð¢6öç7B†46Æ72ÒvWD6†&7FW$6Æ74VçG&–W2†6†&7FW"Ð¢ç6öÖR‚†VçG'’’ÓâÆÆ÷vVD–G2æ–æ6ÇVFW2†Ö¶U6fT–B†VçG'’æ6Æ74–BÂ""’’“°Ð Ð¢–b‚†46Æ72’°Ð¢&V6öç2çW6‚€Ð¢&WV—&W26Æ73¢G¶ÆÆ÷vVD–G2æ¦ö–â‚"Â"’ÇÂ'7V6–f–VB6Æ72'Ö Ð¢“°Ð¢ÐÐ¢&WGW&ã°Ð¢ÐÐ Ð¢–b‡G—RÓÓÒ&6Æ74÷$&6¶w&÷VæB"’°Ð¢6öç7B6Æ74–G2ÒVæ—VT6ÆVä'&’‡&WV—&VÖVçBæ6Æ74–G2Ð¢æÖ‚†–B’ÓâÖ¶U6fT–B†–BÂ""’“°Ð¢6öç7B&6¶w&÷VæD–G2ÒVæ—VT6ÆVä'&’‡&WV—&VÖVçBæ&6¶w&÷VæD–G2Ð¢æÖ‚†–B’ÓâÖ¶U6fT–B†–BÂ""’“°Ð¢6öç7B†46Æ72ÒvWD6†&7FW$6Æ74VçG&–W2†6†&7FW"Ð¢ç6öÖR‚†VçG'’’Óâ6Æ74–G2æ–æ6ÇVFW2†Ö¶U6fT–B†VçG'’æ6Æ74–BÂ""’’“°Ð¢6öç7B&6¶w&÷VæD–BÒÖ¶U6fT–B€Ð¢6†&7FW#òæ&6¶w&÷VæCòæ–BÇÂ6†&7FW#òæ&6¶w&÷VæCòææÖRÀÐ¢" Ð¢“°Ð Ð¢–b‚†46Æ72bb&6¶w&÷VæD–G2æ–æ6ÇVFW2†&6¶w&÷VæD–B’’°Ð¢&V6öç2çW6‚‚%&WV—&W2F†RÆ—7FVB6Æ72÷"&6¶w&÷VæB"“°Ð¢ÐÐ¢&WGW&ã°Ð¢ÐÐ Ð¢–b‡G—RÓÓÒ'7V6–W2"’°Ð¢6öç7B7V6–W4–BÒÖ¶U6fT–B€Ð¢6†&7FW#òç7V6–W3òæ–BÇÂ6†&7FW#òç7V6–W3òææÖRÀÐ¢" Ð¢“°Ð¢6öç7BÆÆ÷vVE7V6–W2ÒVæ—VT6ÆVä'&’‡&WV—&VÖVçBç7V6–W4–G2Ð¢æÖ‚†–B’ÓâÖ¶U6fT–B†–BÂ""’“°Ð¢6öç7B6VÆV7FVE7V'&6T–BÒÖ¶U6fT–B€Ð¢6†&7FW#òç7V6–W0Ð¢òæ6†ö–6W0Ð¢òç7V'&6T–BÇÀÐ¢6†&7FW#òç7V6–W0Ð¢òæ6†ö–6W0Ð¢òç7V'&6U6æ6†÷@Ð¢òæ–BÇÀÐ¢6†&7FW#òç7V6–W0Ð¢òç7V'&6T–BÇÀÐ¢6†&7FW#òç7V6–W0Ð¢òç7V'&6PÐ¢òæ–BÇÀÐ¢6†&7FW#òç7V6–W0Ð¢òç7V'&6PÐ¢òææÖRÀÐ¢" Ð¢“°Ð¢6öç7BÆÆ÷vVE7V'&6W2ÒVæ—VT6ÆVä'&’‡&WV—&VÖVçBç7V'&6T–G2Ð¢æÖ‚†–B’ÓâÖ¶U6fT–B†–BÂ""’“°Ð¢6öç7B7V6–W4ÖWBÒÆÆ÷vVE7V6–W2æ–æ6ÇVFW2‡7V6–W4–B“°Ð¢6öç7B7V'&6TÖWBÒÆÆ÷vVE7V'&6W2æÆVæwF‚ÇÀÐ¢ÆÆ÷vVE7V'&6W2æ–æ6ÇVFW2‡6VÆV7FVE7V'&6T–B“°Ð Ð¢–b‚7V6–W4ÖWBÇÂ7V'&6TÖWB’°Ð¢&V6öç2çW6‚€Ð¢&WV—&W27V6–W3¢G¶ÆÆ÷vVE7V6–W2æ¦ö–â‚"Â"’ÇÂ'7V6–f–VB7V6–W2'Ö Ð¢“°Ð¢ÐÐ¢&WGW&ã°Ð¢ÐÐ Ð¢–b‡G—RÓÓÒ'7V6–W56—¦R"’°Ð¢6öç7BÆÆ÷vVE6—¦W2ÒVæ—VT6ÆVä'&’‡&WV—&VÖVçBç6—¦W2Ð¢æÖ‚‡6—¦R’Óâ6—¦RçFôÆ÷vW$66R‚’“°Ð¢6öç7B6—¦RÒ6ÆVå7G&–ær†6†&7FW#òæ–FVçF—G“òç6—¦R’çFôÆ÷vW$66R‚“°Ð Ð¢–b‚ÆÆ÷vVE6—¦W2æ–æ6ÇVFW2‡6—¦R’’°Ð¢&V6öç2çW6‚†&WV—&W26—¦S¢G¶ÆÆ÷vVE6—¦W2æ¦ö–â‚"÷""—Ö“°Ð¢ÐÐ¢&WGW&ã°Ð¢ÐÐ Ð¢–b‡G—RÓÓÒ'7V6–W56—¦T÷%7V6–W2"’°Ð¢6öç7BÆÆ÷vVE6—¦W2ÒVæ—VT6ÆVä'&’‡&WV—&VÖVçBç6—¦W2Ð¢æÖ‚‡6—¦R’Óâ6—¦RçFôÆ÷vW$66R‚’“°Ð¢6öç7BÆÆ÷vVE7V6–W2ÒVæ—VT6ÆVä'&’‡&WV—&VÖVçBç7V6–W4–G2Ð¢æÖ‚†–B’ÓâÖ¶U6fT–B†–BÂ""’“°Ð¢6öç7B6—¦RÒ6ÆVå7G&–ær†6†&7FW#òæ–FVçF—G“òç6—¦R’çFôÆ÷vW$66R‚“°Ð¢6öç7B7V6–W4–BÒÖ¶U6fT–B€Ð¢6†&7FW#òç7V6–W3òæ–BÇÂ6†&7FW#òç7V6–W3òææÖRÀÐ¢" Ð¢“°Ð Ð¢–b‚ÆÆ÷vVE6—¦W2æ–æ6ÇVFW2‡6—¦R’bbÆÆ÷vVE7V6–W2æ–æ6ÇVFW2‡7V6–W4–B’’°Ð¢&V6öç2çW6‚‚%&WV—&W26ÖÆÂ7V6–W2÷"Gv&b"“°Ð¢ÐÐ¢&WGW&ã°Ð¢ÐÐ Ð¢–b‡G—RÓÓÒ&&Ö÷%&öf–6–Væ7’"’°Ð¢6öç7B6FVv÷'’ÒÖ¶U6fT–B‡&WV—&VÖVçBæ6FVv÷'’Â""“°Ð¢6öç7BÖWBÒæ÷&ÖÆ—¦VE&öf–6–Væ6–W2‚&&Ö÷""Ð¢ç6öÖR‚‡fÇVR’ÓâfÇVRæ–æ6ÇVFW2†6FVv÷'’’“°Ð Ð¢–b‚ÖWB’°Ð¢&V6öç2çW6‚†&WV—&W2G·&WV—&VÖVçBæ6FVv÷'—Ò&Ö÷"&öf–6–Væ7–“°Ð¢ÐÐ¢&WGW&ã°Ð¢ÐÐ Ð¢–b‡G—RÓÓÒ'vVöå&öf–6–Væ7’"’°Ð¢6öç7B6FVv÷&–W2ÒVæ—VT6ÆVä'&’€Ð¢&WV—&VÖVçBæ6FVv÷&–W2ÇÂ·&WV—&VÖVçBæ6FVv÷'•ÐÐ¢’æÖ‚‡fÇVR’ÓâÖ¶U6fT–B‡fÇVRÂ""’“°Ð¢6öç7B&öf–6–Væ6–W2Òæ÷&ÖÆ—¦VE&öf–6–Væ6–W2‚'vVöç2"“°Ð¢6öç7BÖWBÒ6FVv÷&–W2ç6öÖR‚†6FVv÷'’’Óâ°Ð¢&WGW&â&öf–6–Væ6–W2ç6öÖR‚‡fÇVR’ÓâfÇVRæ–æ6ÇVFW2†6FVv÷'’’“°Ð¢Ò“°Ð Ð¢–b‚ÖWB’°Ð¢&V6öç2çW6‚‚%&WV—&W2&öf–6–Væ7’v—F‚6–×ÆR÷"Ö'F–ÂvVöâ"“°Ð¢ÐÐ¢&WGW&ã°Ð¢ÐÐ Ð¢–b‡G—RÓÓÒ&fVB"’°Ð¢6öç7BfVD–G2ÒVæ—VT6ÆVä'&’€Ð¢&WV—&VÖVçBæfVD–G2ÇÂ·&WV—&VÖVçBæfVD–EÐÐ¢’æÖ‚†–B’ÓâÖ¶U6fT–B†–BÂ""’“°Ð¢6öç7BÖWBÒ6VÆV7FVDfVD–ç7Fæ6W2ç6öÖR‚†–ç7Fæ6R’Óâ°Ð¢&WGW&âfVD–G2æ–æ6ÇVFW2†–ç7Fæ6RæfVD–B“°Ð¢Ò“°Ð Ð¢–b‚ÖWB’°Ð¢&V6öç2çW6‚†&WV—&W2fVC¢G¶fVD–G2æ¦ö–â‚"Â"—Ö“°Ð¢ÐÐ¢&WGW&ã°Ð¢ÐÐ Ð¢–b‡G—RÓÓÒ&fVD6†ö–6R"’°Ð¢6öç7B&WV—&VDfVD–BÒÖ¶U6fT–B‡&WV—&VÖVçBæfVD–BÂ""“°Ð¢6öç7B&WV—&VEfÇVW2ÐÐ¢Væ—VT6ÆVä'&’€Ð¢&WV—&VÖVçBçfÇVW0Ð¢’æÖ‚‡fÇVR’Óâ°Ð¢&WGW&âÖ¶U6fT–B€Ð¢fÇVRÀÐ¢" Ð¢“°Ð¢Ò“°Ð¢6öç7BÖWBÒ6VÆV7FVDfVD–ç7Fæ6W2ç6öÖR‚†–ç7Fæ6R’Óâ°Ð¢&WGW&â€Ð¢–ç7Fæ6RæfVD–BÓÓÒ&WV—&VDfVD–Bb`Ð¢Væ—VT6ÆVä'&’€Ð¢–ç7Fæ6RæfVD6†ö–6W3òå·&WV—&VÖVçBæ6†ö–6T–EÐÐ¢’ç6öÖR‚‡fÇVR’Óâ°Ð¢&WGW&â&WV—&VEfÇVW0Ð¢æ–æ6ÇVFW2€Ð¢Ö¶U6fT–B€Ð¢fÇVRÀÐ¢" Ð¢Ð¢“°Ð¢ÒÐ¢“°Ð¢Ò“°Ð Ð¢–b‚ÖWB’°Ð¢&V6öç2çW6‚†&WV—&W2F†RÖF6†–ærG·&WV—&VDfVD–GÒ6†ö–6V“°Ð¢ÐÐ¢&WGW&ã°Ð¢ÐÐ Ð¢–b‡G—RÓÓÒ'6WGF–ær"’°Ð¢6öç7B6WGF–ærÐÐ¢6ÆVå7G&–ær€Ð¢&WV—&VÖVçBç6WGF–ærÇÀÐ¢&WV—&VÖVçBææÖPÐ¢“°Ð Ð¢–b‡6WGF–ær’°Ð¢6WGF–æu&WV—&VÖVçG2çW6‚€Ð¢6WGF–æpÐ¢“°Ð¢Gf—6÷&–W2çW6‚€Ð¢6WGF–ær&WV—&VÖVçC¢G·6WGF–æwÒ†Gf—6÷'“²æ÷BVæf÷&6VB– Ð¢“°Ð¢ÐÐ¢&WGW&ã°Ð¢ÐÐ Ð¢–b‡G—R’°Ð¢&V6öç2çW6‚†Vç7W÷'FVB&W&WV—6—FS¢G·G—WÖ“°Ð¢ÐÐ¢Ò“°Ð Ð¢&WGW&â°Ð¢ÖWC¢&V6öç2æÆVæwF‚ÓÓÒÀÐ¢&V6öç2ÀÐ¢Gf—6÷&–W3 Ð¢Væ—VT6ÆVä'&’€Ð¢Gf—6÷&–W0Ð¢’ÀÐ¢6WGF–æu&WV—&VÖVçG3 Ð¢Væ—VT6ÆVä'&’€Ð¢6WGF–æu&WV—&VÖVçG0Ð¢’ÀÐ¢6WGF–æuöÆ–7“ Ð¢5D•dUõ%TÄU4U@Ð¢æfVE6WGF–æu&W&WV—6—FW2ÇÀÐ¢&Gf—6÷'’ Ð¢Ó°Ð¢ÐÐ Ð¢gVæ7F–öâvWDfVE&W&WV—6—FU&W7VÇB€Ð¢fVBÀÐ¢6†&7FW"Ò7&VF÷%7FFRæG&gBÀÐ¢÷F–öç2Ò·ÐÐ¢’°Ð¢6öç7BÖv–2Ò6†&7FW#òæÖv–2ÇÂ·Ó°Ð¢6öç7BFWVæFVæ7”¶W’Ò7&VFTFW&—fVE6–væGW&R‡°Ð¢fVC¢°Ð¢–C¢fVCòæ–BÀÐ¢&WVF&ÆS¢fVCòç&WVF&ÆRÀÐ¢&W&WV—6—FW3 Ð¢fVCòç&W&WV—6—FW0Ð¢ÒÀÐ¢fVGW&T–C¢÷F–öç2æfVGW&T–BÀÐ¢7W'&VçE6Æ÷C Ð¢vWE6V7F–öã%VæÆö6¶VD6•6Æ÷B€Ð¢÷F–öç2æfVGW&T–BÀÐ¢6†&7FW Ð¢’ÀÐ¢6VÆV7FVDfVG3 Ð¢vWE6VÆV7FVDFVfVÇDfVD–ç7Fæ6W2€Ð¢6†&7FW Ð¢’æÖ‚†–ç7Fæ6R’Óâ‡°Ð¢fVD–C¢–ç7Fæ6RæfVD–BÀÐ¢6Æ÷D–C¢–ç7Fæ6Rç6Æ÷D–BÀÐ¢fVD6†ö–6W3 Ð¢–ç7Fæ6RæfVD6†ö–6W0Ð¢Ò’’ÀÐ¢6Æ74VçG&–W3 Ð¢vWD6†&7FW$6Æ74VçG&–W2€Ð¢6†&7FW Ð¢’æÖ‚†VçG'’’Óâ‡°Ð¢6Æ74–C¢VçG'“òæ6Æ74–BÀÐ¢ÆWfVÃ¢VçG'“òæÆWfVÀÐ¢Ò’’ÀÐ¢F÷FÄÆWfVÃ Ð¢6†&7FW#òæ6Æ75&öw&W76–öàÐ¢òçF÷FÄÆWfVÂÇÀÐ¢6†&7FW#òæÆWfVÂÀÐ¢&–Æ—F–W3 Ð¢6†&7FW#òæ&–Æ—F–W3òç66÷&W2ÀÐ¢&öf–6–Væ6–W3 Ð¢6†&7FW#òç&öf–6–Væ6–W2ÀÐ¢&6¶w&÷VæC Ð¢6†&7FW#òæ&6¶w&÷VæBÀÐ¢7V6–W3¢6†&7FW#òç7V6–W2ÀÐ¢6—¦S¢6†&7FW#òæ–FVçF—G“òç6—¦RÀÐ¢7VÆÆ67F–æt–æfó Ð¢vWD6†&7FW%7VÆÆ67F–æt–æfò€Ð¢6†&7FW Ð¢’ÀÐ¢Öv–3¢°Ð¢¶æ÷vå7VÆÄ–G3 Ð¢Öv–2æ¶æ÷vå7VÆÄ–G2ÀÐ¢&W&VE7VÆÄ–G3 Ð¢Öv–2ç&W&VE7VÆÄ–G2ÀÐ¢–ææFU7VÆÄ–G3 Ð¢Öv–2æ–ææFU7VÆÄ–G2ÀÐ¢7W7FöÕ7VÆÄ–G3 Ð¢Öv–2æ7W7FöÕ7VÆÄ–G2ÀÐ¢–ææFU7VÆÇ3 Ð¢Öv–2æ–ææFU7VÆÇ2ÀÐ¢7W7FöÕ7VÆÇ3 Ð¢Öv–2æ7W7FöÕ7VÆÇ2ÀÐ¢6Æ756÷W&6W3 Ð¢Öv–2æ6Æ756÷W&6W2ÀÐ¢fVE6÷W&6W3 Ð¢Öv–2æfVE6÷W&6W0Ð¢ÒÀÐ¢fVDÖV6†æ–73 Ð¢6†&7FW#òæfVDÖV6†æ–70Ð¢òç7VÆÆ67F–æpÐ¢Ò“°Ð Ð¢&WGW&âFW&—fVD66†RævWB€Ð¢&fVB×&W&WV—6—FR"ÀÐ¢FWVæFVæ7”¶W’ÀÐ¢‚’Óâ6Æ7VÆFTfVE&W&WV—6—FU&W7VÇB€Ð¢fVBÀÐ¢6†&7FW"ÀÐ¢÷F–öç0Ð¢Ð¢“°Ð¢ÐÐ Ð¢gVæ7F–öâvWDfVE&W&WV—6—FTÆ&VÂ†fVBÂ÷F–öç2Ò·Ò’°Ð¢6öç7B&W7VÇBÒvWDfVE&W&WV—6—FU&W7VÇB€Ð¢fVBÀÐ¢7&VF÷%7FFRæG&gBÀÐ¢÷F–öç0Ð¢“°Ð Ð¢–b‚&W7VÇBæÖWB’°Ð¢&WGW&â°Ð¢ââç&W7VÇBç&V6öç2ÀÐ¢ââç&W7VÇBæGf—6÷&–W0Ð¢Òæ¦ö–â‚#²"“°Ð¢ÐÐ Ð¢–b‚'&’æ—4'&’†fVCòç&W&WV—6—FW2’ÇÂfVBç&W&WV—6—FW2æÆVæwF‚’°Ð¢&WGW&â$æò&W&WV—6—FR#°Ð¢ÐÐ Ð¢&WGW&â&W7VÇBæGf—6÷&–W2æÆVæwF€Ð¢ò&W7VÇBæGf—6÷&–W2æ¦ö–â‚#²"Ð¢¢%&W&WV—6—FW2ÖWB#°Ð¢ÐÐ Ð¢gVæ7F–öâ6WE6V7F–öã$6”fVB†fVGW&T–BÂfVD–B’°Ð¢–b‚vWE6V7F–öã$6”fVGW&R†fVGW&T–B’’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢6öç7B6ÆVäfVD–BÒ6ÆVå7G&–ær†fVD–B“°Ð Ð¢6öç7B6VÆV7FVDfVBÒDTdTÅEôdTE2æf–æB‚†fVB’Óâ°Ð¢&WGW&âfVBæ–BÓÓÒ6ÆVäfVD–C°Ð¢Ò“°Ð Ð¢–b€Ð¢6ÆVäfVD–Bb`Ð¢€Ð¢6VÆV7FVDfVBÇÀÐ¢6ÆVäfVD–BÓÓÐÐ¢&&–Æ—G’×66÷&RÖ–×&÷fVÖVçB Ð¢Ð¢’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢–b€Ð¢6VÆV7FVDfVBb`Ð¢vWDfVE&W&WV—6—FU&W7VÇB€Ð¢6VÆV7FVDfVBÀÐ¢7&VF÷%7FFRæG&gBÀÐ¢²fVGW&T–BÐÐ¢’æÖW@Ð¢’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢6öç7B&Wf–÷W2ÒvWE6V7F–öã$6”6†ö–6U7FFR†fVGW&T–B“°Ð Ð¢6WE6V7F–öã$6”6†ö–6UfÇVW2€Ð¢fVGW&T–BÀÐ¢°Ð¢&ÖöFS¦fVB"ÀÐ¢âââ†6ÆVäfVD–Bò¶fVC¢G¶6ÆVäfVD–GÖÒ¢µÒÐ¢ÐÐ¢“°Ð Ð¢6WE6V7F–öã$6”&öçW56÷W&6R†fVGW&T–BÂµÒ“°Ð¢&VÖ÷fU6V7F–öã$6”fVD–eVçW6VB‡&Wf–÷W2æfVD–B“°Ð Ð¢–b†6ÆVäfVD–B’°Ð¢7&VF÷%7FFRæG&gBæfVG2Ò°Ð¢ââææWr6WB…°Ð¢ââææ÷&ÖÆ—¦TfVD–G2†7&VF÷%7FFRæG&gBæfVG2’ÀÐ¢6ÆVäfVD–@Ð¢ÒÐ¢Ó°Ð¢ÐÐ Ð¢7–æ56V7F–öã$Gfæ6VÖVçD6†ö–6R†fVGW&T–B“°Ð¢Ç•6VÆV7FVDfVDÖV6†æ–72‚“°Ð¢Ç”6ö×F–&–Æ—G”Æ–6W2†7&VF÷%7FFRæG&gB“°Ð¢Ö&´G&gD6†ævVB‚“°Ð Ð¢&WGW&âG'VS°Ð¢ÐÐ Ð¢gVæ7F–öâ7–æ56V7F–öã$6”6†ö–6W4f÷$ÆWfVÂ‚’°Ð¢–b€Ð¢—4×VÇF–6Æ74G&gB€Ð¢7&VF÷%7FFRæG&g@Ð¢Ð¢’°Ð¢6öç7BVæÆö6¶VE6Æ÷G2ÐÐ¢vWEVæÆö6¶VDfVD6†ö–6U6Æ÷G2€Ð¢7&VF÷%7FFRæG&g@Ð¢“°Ð¢6öç7Bf–Æ&ÆU6Æ÷D–G2ÐÐ¢æWr6WB€Ð¢VæÆö6¶VE6Æ÷G2æÖ‚‡6Æ÷B’Óâ6Æ÷Bæ–BÐ¢“°Ð Ð¢&VÖ÷fT&–Æ—G”&öçW56÷W&6W4'•&Vf—‚…°Ð¢&6Æ72Ö6“¢ Ð¢Ò“°Ð Ð¢VæÆö6¶VE6Æ÷G2æf÷$V6‚‚‡6Æ÷B’Óâ°Ð¢6öç7B7FFRÐÐ¢vWE6V7F–öã$6”6†ö–6U7FFR‡6Æ÷Bæ–B“°Ð Ð¢6WE6V7F–öã$6”&öçW56÷W&6R€Ð¢6Æ÷Bæ–BÀÐ¢7FFRæÖöFRÓÓÒ&6’ Ð¢ò7FFRæ&–Æ—F–W0Ð¢¢µÐÐ¢“°Ð Ð¢–b‡7FFRæÖöFR’°Ð¢7–æ56V7F–öã$Gfæ6VÖVçD6†ö–6R‡6Æ÷Bæ–B“°Ð¢ÐÐ¢Ò“°Ð Ð¢7&VF÷%7FFRæG&gBæGfæ6VÖVçD6†ö–6W2ÐÐ¢æ÷&ÖÆ—¦TGfæ6VÖVçD6†ö–6W2€Ð¢7&VF÷%7FFRæG&gBæGfæ6VÖVçD6†ö–6W0Ð¢“°Ð Ð¢6öç7B&VÖ÷fVDfVD–G2ÐÐ¢7&VF÷%7FFRæG&g@Ð¢æGfæ6VÖVçD6†ö–6W0Ð¢æf–ÇFW"‚†6†ö–6R’Óâ°Ð¢&WGW&â€Ð¢6†ö–6RçG—RÓÓÒ&6’Ö÷"ÖfVB"b`Ð¢f–Æ&ÆU6Æ÷D–G2æ†2€Ð¢6†ö–6Ræ–@Ð¢Ð¢“°Ð¢ÒÐ¢æÖ‚†6†ö–6R’Óâ°Ð¢&WGW&â6ÆVå7G&–ær€Ð¢6†ö–6RæfVD–@Ð¢“°Ð¢ÒÐ¢æf–ÇFW"„&ööÆVâ“°Ð Ð¢7&VF÷%7FFRæG&g@Ð¢æGfæ6VÖVçD6†ö–6W2ÐÐ¢7&VF÷%7FFRæG&g@Ð¢æGfæ6VÖVçD6†ö–6W0Ð¢æf–ÇFW"‚†6†ö–6R’Óâ°Ð¢&WGW&â€Ð¢6†ö–6RçG—RÓÒ&6’Ö÷"ÖfVB"ÇÀÐ¢f–Æ&ÆU6Æ÷D–G2æ†2†6†ö–6Ræ–BÐ¢“°Ð¢Ò“°Ð Ð¢&VÖ÷fVDfVD–G2æf÷$V6‚€Ð¢&VÖ÷fU6V7F–öã$6”fVD–eVçW6V@Ð¢“°Ð Ð¢&WGW&ã°Ð¢ÐÐ Ð¢6öç7Bf–Æ&ÆTfVGW&W2ÒvWE6V7F–öã$6Æ74fVGW&W5F‡&÷Vv„ÆWfVÂ‚Ð¢æf–ÇFW"‚†fVGW&R’ÓâfVGW&Ræ÷F–öå6÷W&6RÓÓÒ&6”÷$fVB"“°Ð¢6öç7Bf–Æ&ÆT–G2ÒæWr6WB€Ð¢f–Æ&ÆTfVGW&W2æÖ‚†fVGW&R’ÓâfVGW&Ræ–BÐ¢“°Ð¢6öç7BVæÆö6¶VE6Æ÷G2ÒvWEVæÆö6¶VDfVD6†ö–6U6Æ÷G2€Ð¢7&VF÷%7FFRæG&g@Ð¢“°Ð¢6öç7Bf–Æ&ÆT6†ö–6T–G2ÒæWr6WB…°Ð¢ââæf–Æ&ÆT–G2ÀÐ¢ââçVæÆö6¶VE6Æ÷G2æÖ‚‡6Æ÷B’Óâ6Æ÷Bæ–B’ÀÐ¢ââçVæÆö6¶VE6Æ÷G2æÖ‚‡6Æ÷B’Óâ6Æ÷BæÆVv7”–BÐ¢Ò“°Ð¢6öç7B6†ö–6W2Òæ÷&ÖÆ—¦T6Æ746†ö–6TÖ€Ð¢7&VF÷%7FFRæG&gBæ6Æ746†ö–6W0Ð¢“°Ð¢6öç7B&VÖ÷fVDfVD–G2ÒµÓ°Ð Ð¢&VÖ÷fT&–Æ—G”&öçW56÷W&6W4'•&Vf—‚…°Ð¢&6Æ72Ö6“¢ Ð¢Ò“°Ð Ð¢ö&¦V7Bæ¶W—2†6†ö–6W2’æf÷$V6‚‚†fVGW&T–B’Óâ°Ð¢6öç7BfÇVW2Ò6†ö–6W5¶fVGW&T–EÓ°Ð¢6öç7B—46”6†ö–6RÒfÇVW2ç6öÖR‚‡fÇVR’Óâ°Ð¢&WGW&â€Ð¢fÇVRç7F'G5v—F‚‚&ÖöFS¢"’ÇÀÐ¢fÇVRç7F'G5v—F‚‚&&–Æ—G“¢"’ÇÀÐ¢fÇVRç7F'G5v—F‚‚&fVC¢"Ð¢“°Ð¢Ò“°Ð Ð¢–b‚—46”6†ö–6R’°Ð¢&WGW&ã°Ð¢ÐÐ Ð¢–b‚f–Æ&ÆT6†ö–6T–G2æ†2†fVGW&T–B’’°Ð¢fÇVW2æf÷$V6‚‚‡fÇVR’Óâ°Ð¢–b‡fÇVRç7F'G5v—F‚‚&fVC¢"’’°Ð¢&VÖ÷fVDfVD–G2çW6‚‡fÇVRç6Æ–6R‚&fVC¢"æÆVæwF‚’“°Ð¢ÐÐ¢Ò“°Ð¢FVÆWFR6†ö–6W5¶fVGW&T–EÓ°Ð¢6WE6V7F–öã$6”&öçW56÷W&6R†fVGW&T–BÂµÒ“°Ð¢&WGW&ã°Ð¢ÐÐ Ð¢6öç7B7FFT&–Æ—F–W2ÒfÇVW0Ð¢æf–ÇFW"‚‡fÇVR’ÓâfÇVRç7F'G5v—F‚‚&&–Æ—G“¢"’Ð¢æÖ‚‡fÇVR’ÓâfÇVRç7Æ—B‚#¢"•³ÒÐ¢æf–ÇFW"„&ööÆVâ“°Ð Ð¢6WE6V7F–öã$6”&öçW56÷W&6R†fVGW&T–BÂ7FFT&–Æ—F–W2“°Ð¢Ò“°Ð Ð¢7&VF÷%7FFRæG&gBæ6Æ746†ö–6W2Ò6†ö–6W3°Ð¢&VÖ÷fVDfVD–G2æf÷$V6‚‡&VÖ÷fU6V7F–öã$6”fVD–eVçW6VB“°Ð Ð¢6öç7B&–Ö'”6Æ72ÒvWE6V7F–öã%&–Ö'”6Æ72‚“°Ð¢6öç7B6Æ74–BÒÖ¶U6fT–B€Ð¢&–Ö'”6Æ73òæ6Æ74–BÇÂ&–Ö'”6Æ73òæ6Æ74æÖRÀÐ¢" Ð¢“°Ð¢6öç7B6Æ74VçG'”–BÒ6ÆVå7G&–ær€Ð¢&–Ö'”6Æ73òæVçG'”–@Ð¢“°Ð¢6öç7Bf–Æ&ÆU6Æ÷D–G2ÒæWr6WB€Ð¢VæÆö6¶VE6Æ÷G2æÖ‚‡6Æ÷B’Óâ6Æ÷Bæ–BÐ¢“°Ð Ð¢VæÆö6¶VE6Æ÷G2æf÷$V6‚‚‡6Æ÷B’Óâ°Ð¢–b†vWE6V7F–öã$6”6†ö–6U7FFR‡6Æ÷Bæ–B’æÖöFR’°Ð¢7–æ56V7F–öã$Gfæ6VÖVçD6†ö–6R‡6Æ÷Bæ–B“°Ð¢ÐÐ¢Ò“°Ð Ð¢f–Æ&ÆT–G2æf÷$V6‚‚†fVGW&T–B’Óâ°Ð¢–b†6†ö–6W5¶fVGW&T–EÒ’°Ð¢7–æ56V7F–öã$Gfæ6VÖVçD6†ö–6R†fVGW&T–B“°Ð¢ÐÐ¢Ò“°Ð Ð¢7&VF÷%7FFRæG&gBæGfæ6VÖVçD6†ö–6W2ÐÐ¢æ÷&ÖÆ—¦TGfæ6VÖVçD6†ö–6W2€Ð¢7&VF÷%7FFRæG&gBæGfæ6VÖVçD6†ö–6W0Ð¢’æf–ÇFW"‚†6†ö–6R’Óâ°Ð¢6öç7B&VÆöæw5Fõ&–Ö'’ÐÐ¢6ÆVå7G&–ær†6†ö–6Ræ6Æ74VçG'”–B’ÓÓÐÐ¢6Æ74VçG'”–BÇÀÐ¢€Ð¢6ÆVå7G&–ær†6†ö–6Ræ6Æ74VçG'”–B’b`Ð¢6†ö–6Ræ6Æ74–BÓÓÒ6Æ74–@Ð¢“°Ð Ð¢&WGW&â€Ð¢6†ö–6RçG—RÓÒ&6’Ö÷"ÖfVB"ÇÀÐ¢&VÆöæw5Fõ&–Ö'’ÇÀÐ¢f–Æ&ÆU6Æ÷D–G2æ†2†6†ö–6Ræ–BÐ¢“°Ð¢Ò“°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öã$'F–f–6W$–ægW6–öå7FFR€Ð¢fVGW&PÐ¢’°Ð¢6öç7BfÇVW2ÒvWE6V7F–öã$fVGW&U7F÷&VD6†ö–6W2†fVGW&R“°Ð¢6öç7BF&vWG2Òö&¦V7Bæg&öÔVçG&–W2€Ð¢fÇVW0Ð¢æf–ÇFW"‚‡fÇVR’ÓâfÇVRç7F'G5v—F‚‚'F&vWC¢"’Ð¢æÖ‚‡fÇVR’Óâ°Ð¢6öç7B²Â–ægW6–öä–BÂââæ—FVÕ'G5ÒÒfÇVRç7Æ—B‚#¢"“°Ð¢&WGW&â¶–ægW6–öä–BÂ—FVÕ'G2æ¦ö–â‚#¢"•Ó°Ð¢ÒÐ¢“°Ð Ð¢&WGW&â°Ð¢¶æ÷vä–G3¢fÇVW0Ð¢æf–ÇFW"‚‡fÇVR’ÓâfÇVRç7F'G5v—F‚‚&¶æ÷vã¢"’Ð¢æÖ‚‡fÇVR’ÓâfÇVRç6Æ–6R‚&¶æ÷vã¢"æÆVæwF‚’’ÀÐ¢7F—fT–G3¢fÇVW0Ð¢æf–ÇFW"‚‡fÇVR’ÓâfÇVRç7F'G5v—F‚‚&7F—fS¢"’Ð¢æÖ‚‡fÇVR’ÓâfÇVRç6Æ–6R‚&7F—fS¢"æÆVæwF‚’’ÀÐ¢F&vWG0Ð¢Ó°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öã$'F–f–6W$–ægW6–öä6öçFW‡B†fVGW&R’°Ð¢6öç7B6Æ74VçG'’ÒvWD6Æ74VçG'”D–æFW‚€Ð¢6fTçVÖ&W"†fVGW&Sòæ6Æ74–æFW‚ÂÐ¢“°Ð¢6öç7B6VÆV7FVD6Æ72Ò&W6öÇfT6Æ75FV×ÆFTf÷$VçG'’€Ð¢6Æ74VçG'Ð¢“°Ð¢6öç7BÆWfVÂÒÖF‚æÖ‚€Ð¢ÀÐ¢6fTçVÖ&W"€Ð¢fVGW&Sòæ6Æ74ÆWfVÂÀÐ¢6Æ74VçG'“òæÆWfVÂÇÂÐ¢Ð¢“°Ð Ð¢–b‡6VÆV7FVD6Æ73òæ–BÓÒ&'F–f–6W""’°Ð¢&WGW&âçVÆÃ°Ð¢ÐÐ Ð¢&WGW&â°Ð¢6VÆV7FVD6Æ72ÀÐ¢6Æ74VçG'’ÀÐ¢fVGW&RÀÐ¢ÆWfVÂÀÐ¢¶æ÷väÆ–Ö—C¢vWE&öw&W76–öåfÇVT'”ÆWfVÂ€Ð¢6VÆV7FVD6Æ72æ–ægW6–öç4¶æ÷vä'”ÆWfVÂÀÐ¢ÆWfVÂÀÐ¢ Ð¢’ÀÐ¢7F—fTÆ–Ö—C¢vWE&öw&W76–öåfÇVT'”ÆWfVÂ€Ð¢6VÆV7FVD6Æ72æ–ægW6VD—FV×4'”ÆWfVÂÀÐ¢ÆWfVÂÀÐ¢ Ð¢’ÀÐ¢f–Æ&ÆS¢‡6VÆV7FVD6Æ72æ–ægW6–öç2ÇÂµÒ’æf–ÇFW"‚†–ægW6–öâ’Óâ°Ð¢&WGW&â6fTçVÖ&W"†–ægW6–öâæÖ–æ–×VÔÆWfVÂÂ"’ÃÒÆWfVÃ°Ð¢ÒÐ¢Ó°Ð¢ÐÐ Ð¢gVæ7F–öâ6fU6V7F–öã$'F–f–6W$–ægW6–öå7FFR€Ð¢7FFRÀÐ¢fVGW&PÐ¢’°Ð¢6öç7BfÇVW2Ò°Ð¢ââç7FFRæ¶æ÷vä–G2æÖ‚†–B’Óâ¶æ÷vã¢G¶–GÖ’ÀÐ¢ââç7FFRæ7F—fT–G2æÖ‚†–B’Óâ7F—fS¢G¶–GÖ’ÀÐ¢ââäö&¦V7BæVçG&–W2‡7FFRçF&vWG2ÇÂ·ÒÐ¢æf–ÇFW"‚…¶–ægW6–öä–BÂ—FVÔ–EÒ’Óâ°Ð¢&WGW&â€Ð¢7FFRæ7F—fT–G2æ–æ6ÇVFW2†–ægW6–öä–B’b`Ð¢6ÆVå7G&–ær†—FVÔ–BÐ¢“°Ð¢ÒÐ¢æÖ‚…¶–ægW6–öä–BÂ—FVÔ–EÒ’Óâ°Ð¢&WGW&âF&vWC¢G¶–ægW6–öä–GÓ¢G¶—FVÔ–GÖ°Ð¢ÒÐ¢Ó°Ð Ð¢6WE6V7F–öã$fVGW&U7F÷&VD6†ö–6W2†fVGW&RÂfÇVW2“°Ð¢ÐÐ Ð¢gVæ7F–öâ7–æ56V7F–öã$'F–f–6W$–ægW6–öç4f÷$ÆWfVÂ‚’°Ð¢vWE6V7F–öã$6Æ74fVGW&W5F‡&÷Vv„ÆWfVÂ‚Ð¢æf–ÇFW"‚†fVGW&R’Óâ°Ð¢&WGW&âfVGW&Ræ7W7FöÕG—RÓÓÒ&'F–f–6W$–ægW6–öç2#°Ð¢ÒÐ¢æf÷$V6‚‚†fVGW&R’Óâ°Ð¢6öç7B6öçFW‡BÐÐ¢vWE6V7F–öã$'F–f–6W$–ægW6–öä6öçFW‡B†fVGW&R“°Ð Ð¢–b‚6öçFW‡B’°Ð¢&WGW&ã°Ð¢ÐÐ Ð¢6öç7B7FFRÐÐ¢vWE6V7F–öã$'F–f–6W$–ægW6–öå7FFR†fVGW&R“°Ð¢6öç7Bf–Æ&ÆT–G2ÒæWr6WB€Ð¢6öçFW‡Bæf–Æ&ÆRæÖ‚†–ægW6–öâ’Óâ–ægW6–öâæ–BÐ¢“°Ð¢6öç7B¶æ÷vä–G2Ò7FFRæ¶æ÷vä–G0Ð¢æf–ÇFW"‚†–B’Óâf–Æ&ÆT–G2æ†2†–B’Ð¢ç6Æ–6RƒÂ6öçFW‡Bæ¶æ÷väÆ–Ö—B“°Ð¢6öç7B¶æ÷vå6WBÒæWr6WB†¶æ÷vä–G2“°Ð¢6öç7B7F—fT–G2Ò7FFRæ7F—fT–G0Ð¢æf–ÇFW"‚†–B’Óâ¶æ÷vå6WBæ†2†–B’Ð¢ç6Æ–6RƒÂ6öçFW‡Bæ7F—fTÆ–Ö—B“°Ð¢6öç7BF&vWG2Òö&¦V7Bæg&öÔVçG&–W2€Ð¢ö&¦V7BæVçG&–W2‡7FFRçF&vWG2ÇÂ·ÒÐ¢æf–ÇFW"‚…¶–ægW6–öä–EÒ’Óâ°Ð¢&WGW&â7F—fT–G2æ–æ6ÇVFW2†–ægW6–öä–B“°Ð¢ÒÐ¢“°Ð Ð¢6fU6V7F–öã$'F–f–6W$–ægW6–öå7FFR‡°Ð¢¶æ÷vä–G2ÀÐ¢7F—fT–G2ÀÐ¢F&vWG0Ð¢ÒÂfVGW&R“°Ð¢Ò“°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öã$–ægW6–öåF&vWD÷F–öç2†–ægW6–öâ’°Ð¢6öç7BVffV7G2Ò'&’æ—4'&’†–ægW6–öãòæVffV7G2Ð¢ò–ægW6–öâæVffV7G0Ð¢¢µÓ°Ð¢6öç7BF&vWEG—W2ÒVæ—VT6ÆVä'&’€Ð¢VffV7G2æÖ‚†VffV7B’ÓâVffV7BçF&vWBÐ¢“°Ð¢6öç7B–çfVçF÷'’Ò'&’æ—4'&’€Ð¢7&VF÷%7FFRæG&gBæWV—ÖVçCòæ—FV×0Ð¢Ð¢ò7&VF÷%7FFRæG&gBæWV—ÖVçBæ—FV×0Ð¢¢µÓ°Ð Ð¢&WGW&â–çfVçF÷'’æf–ÇFW"‚†—FVÒ’Óâ°Ð¢–b€Ð¢—FVÒæ—46öçF–æW"ÓÓÒG'VRÇÀÐ¢6ÆVå7G&–ær†—FVÒæ6öçF–æW$–BÐ¢’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢–b‚F&vWEG—W2æÆVæwF‚’°Ð¢&WGW&âG'VS°Ð¢ÐÐ Ð¢&WGW&âF&vWEG—W2ç6öÖR‚‡F&vWB’Óâ°Ð¢–b‡F&vWBÓÓÒ&&Ö÷$÷%6†–VÆB"’°Ð¢&WGW&â&ööÆVâ†—FVÒæ&6T&Ö÷$6Æ72ÇÂ—FVÒæ—56†–VÆB“°Ð¢ÐÐ Ð¢–b‡F&vWBÓÓÒ&&Ö÷""’°Ð¢&WGW&â&ööÆVâ†—FVÒæ&6T&Ö÷$6Æ72bb—FVÒæ—56†–VÆB“°Ð¢ÐÐ Ð¢–b‡F&vWBÓÓÒ'6†–VÆB"’°Ð¢&WGW&â—FVÒæ—56†–VÆBÓÓÒG'VS°Ð¢ÐÐ Ð¢–b€Ð¢²'vVöâ"Â&Ö×Væ—F–öåvVöâ"Â'F‡&÷våvVöâ%ÐÐ¢æ–æ6ÇVFW2‡F&vWBÐ¢’°Ð¢–b€Ð¢€Ð¢—FVÒæ6FVv÷'’ÓÓÒ'vVöâ"ÇÀÐ¢—FVÒçvVöåG—RÇÀÐ¢—FVÒæFÖvTF–6PÐ¢Ð¢’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢–b‡F&vWBÓÓÒ&Ö×Væ—F–öåvVöâ"’°Ð¢&WGW&â—FVÒç&ævVBÓÓÒG'VS°Ð¢ÐÐ Ð¢–b‡F&vWBÓÓÒ'F‡&÷våvVöâ"’°Ð¢&WGW&â—FVÒçF‡&÷vâÓÓÒG'VS°Ð¢ÐÐ Ð¢&WGW&âG'VS°Ð¢ÐÐ Ð¢–b‡F&vWBÓÓÒ'7VÆÆ67F–ætfö7W2"’°Ð¢&WGW&â€Ð¢6ÆVå7G&–ær†—FVÒæ6FVv÷'’’çFôÆ÷vW$66R‚’æ–æ6ÇVFW2‚&fö7W2"’ÇÀÐ¢6ÆVå7G&–ær†—FVÒææÖR’çFôÆ÷vW$66R‚’æ–æ6ÇVFW2‚&fö7W2"Ð¢“°Ð¢ÐÐ Ð¢–b‡F&vWBÓÓÒ&†VÆÖWB"’°Ð¢&WGW&âö†VÆ×Æ†VÆÖWBö’çFW7B†—FVÒææÖRÇÂ""“°Ð¢ÐÐ Ð¢&WGW&âG'VS°Ð¢Ò“°Ð¢Ò“°Ð¢ÐÐ Ð¢gVæ7F–öâFövvÆU6V7F–öã$'F–f–6W$–ægW6–öâ€Ð¢fVGW&T¶W’ÀÐ¢–ægW6–öä–BÀÐ¢ÖöFPÐ¢’°Ð¢6öç7BfVGW&RÒvWE6V7F–öã$6Æ74fVGW&W5F‡&÷Vv„ÆWfVÂ‚Ð¢æf–æB‚†VçG'’’Óâ°Ð¢&WGW&â€Ð¢vWE6V7F–öã$fVGW&T6†ö–6T¶W’†VçG'’’ÓÓÒfVGW&T¶W’ÇÀÐ¢VçG'’æ–BÓÓÒfVGW&T¶WÐ¢“°Ð¢Ò“°Ð¢6öç7B6öçFW‡BÐÐ¢vWE6V7F–öã$'F–f–6W$–ægW6–öä6öçFW‡B†fVGW&R“°Ð Ð¢–b€Ð¢6öçFW‡BÇÀÐ¢6öçFW‡Bæf–Æ&ÆRç6öÖR‚†–ægW6–öâ’Óâ–ægW6–öâæ–BÓÓÒ–ægW6–öä–BÐ¢’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢6öç7B7FFRÒvWE6V7F–öã$'F–f–6W$–ægW6–öå7FFR†fVGW&R“°Ð Ð¢–b†ÖöFRÓÓÒ&¶æ÷vâ"’°Ð¢–b‡7FFRæ¶æ÷vä–G2æ–æ6ÇVFW2†–ægW6–öä–B’’°Ð¢7FFRæ¶æ÷vä–G2Ò7FFRæ¶æ÷vä–G2æf–ÇFW"‚†–B’Óâ–BÓÒ–ægW6–öä–B“°Ð¢7FFRæ7F—fT–G2Ò7FFRæ7F—fT–G2æf–ÇFW"‚†–B’Óâ–BÓÒ–ægW6–öä–B“°Ð¢FVÆWFR7FFRçF&vWG5¶–ægW6–öä–EÓ°Ð¢ÒVÇ6R–b‡7FFRæ¶æ÷vä–G2æÆVæwF‚Â6öçFW‡Bæ¶æ÷väÆ–Ö—B’°Ð¢7FFRæ¶æ÷vä–G2çW6‚†–ægW6–öä–B“°Ð¢ÒVÇ6R°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ¢ÒVÇ6R–b†ÖöFRÓÓÒ&7F—fR"’°Ð¢–b‚7FFRæ¶æ÷vä–G2æ–æ6ÇVFW2†–ægW6–öä–B’’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢–b‡7FFRæ7F—fT–G2æ–æ6ÇVFW2†–ægW6–öä–B’’°Ð¢7FFRæ7F—fT–G2Ò7FFRæ7F—fT–G2æf–ÇFW"‚†–B’Óâ–BÓÒ–ægW6–öä–B“°Ð¢FVÆWFR7FFRçF&vWG5¶–ægW6–öä–EÓ°Ð¢ÒVÇ6R–b‡7FFRæ7F—fT–G2æÆVæwF‚Â6öçFW‡Bæ7F—fTÆ–Ö—B’°Ð¢7FFRæ7F—fT–G2çW6‚†–ægW6–öä–B“°Ð¢ÒVÇ6R°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ¢ÒVÇ6R°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢6fU6V7F–öã$'F–f–6W$–ægW6–öå7FFR‡7FFRÂfVGW&R“°Ð¢Ç•6VÆV7FVD6Æ74fVGW&TÖV6†æ–72‚“°Ð¢Ç”6ö×F–&–Æ—G”Æ–6W2†7&VF÷%7FFRæG&gB“°Ð¢Ö&´G&gD6†ævVB‚“°Ð Ð¢&WGW&âG'VS°Ð¢ÐÐ Ð¢gVæ7F–öâ6WE6V7F–öã$'F–f–6W$–ægW6–öåF&vWB€Ð¢fVGW&T¶W’ÀÐ¢–ægW6–öä–BÀÐ¢—FVÔ–@Ð¢’°Ð¢6öç7BfVGW&RÒvWE6V7F–öã$6Æ74fVGW&W5F‡&÷Vv„ÆWfVÂ‚Ð¢æf–æB‚†VçG'’’Óâ°Ð¢&WGW&âvWE6V7F–öã$fVGW&T6†ö–6T¶W’†VçG'’’ÓÓÒfVGW&T¶W“°Ð¢Ò“°Ð¢6öç7B6öçFW‡BÐÐ¢vWE6V7F–öã$'F–f–6W$–ægW6–öä6öçFW‡B†fVGW&R“°Ð¢6öç7B–ægW6–öâÒ6öçFW‡Còæf–Æ&ÆRæf–æB‚†VçG'’’Óâ°Ð¢&WGW&âVçG'’æ–BÓÓÒ–ægW6–öä–C°Ð¢Ò“°Ð Ð¢–b‚fVGW&RÇÂ–ægW6–öâ’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢6öç7B7FFRÒvWE6V7F–öã$'F–f–6W$–ægW6–öå7FFR†fVGW&R“°Ð Ð¢–b‚7FFRæ7F—fT–G2æ–æ6ÇVFW2†–ægW6–öä–B’’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢6öç7BVÆ–v–&ÆT–G2ÒæWr6WB€Ð¢vWE6V7F–öã$–ægW6–öåF&vWD÷F–öç2†–ægW6–öâÐ¢æÖ‚†—FVÒ’Óâ—FVÒæ–BÐ¢“°Ð¢6öç7B6ÆVä—FVÔ–BÒ6ÆVå7G&–ær†—FVÔ–B“°Ð Ð¢–b†6ÆVä—FVÔ–BbbVÆ–v–&ÆT–G2æ†2†6ÆVä—FVÔ–B’’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢–b†6ÆVä—FVÔ–B’°Ð¢7FFRçF&vWG5¶–ægW6–öä–EÒÒ6ÆVä—FVÔ–C°Ð¢ÒVÇ6R°Ð¢FVÆWFR7FFRçF&vWG5¶–ægW6–öä–EÓ°Ð¢ÐÐ Ð¢6fU6V7F–öã$'F–f–6W$–ægW6–öå7FFR‡7FFRÂfVGW&R“°Ð¢Ç•6VÆV7FVD6Æ74fVGW&TÖV6†æ–72‚“°Ð¢Ç”6ö×F–&–Æ—G”Æ–6W2†7&VF÷%7FFRæG&gB“°Ð¢Ö&´G&gD6†ævVB‚“°Ð Ð¢&WGW&âG'VS°Ð¢ÐÐ Ð¢gVæ7F–öâ&VæFW%6V7F–öã$'F–f–6W$–ægW6–öç2†fVGW&R’°Ð¢6öç7B6öçFW‡BÐÐ¢vWE6V7F–öã$'F–f–6W$–ægW6–öä6öçFW‡B†fVGW&R“°Ð Ð¢–b‚6öçFW‡B’°Ð¢&WGW&â"#°Ð¢ÐÐ Ð¢6öç7B7FFRÒvWE6V7F–öã$'F–f–6W$–ægW6–öå7FFR†fVGW&R“°Ð¢6öç7BfVGW&T¶W’ÒvWE6V7F–öã$fVGW&T6†ö–6T¶W’†fVGW&R“°Ð Ð¢&WGW&â Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"Ö7W'&VçBÖ6†ö–6R#àÐ¢Æ#ä–ægW6–öç2¶æ÷vã£Âö#âG·7FFRæ¶æ÷vä–G2æÆVæwF‡ÒòG¶6öçFW‡Bæ¶æ÷väÆ–Ö—GÐÐ¢Æ'#ãÆ#ä–ægW6VB—FV×3£Âö#âG·7FFRæ7F—fT–G2æÆVæwF‡ÒòG¶6öçFW‡Bæ7F—fTÆ–Ö—GÐÐ¢ÂöF—càÐ Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"Öf–VÆBÖw&–B#àÐ¢G¶6öçFW‡Bæf–Æ&ÆRæÖ‚†–ægW6–öâ’Óâ°Ð¢6öç7B¶æ÷vâÒ7FFRæ¶æ÷vä–G2æ–æ6ÇVFW2†–ægW6–öâæ–B“°Ð¢6öç7B7F—fRÒ7FFRæ7F—fT–G2æ–æ6ÇVFW2†–ægW6–öâæ–B“°Ð¢6öç7BF&vWD÷F–öç2ÐÐ¢vWE6V7F–öã$–ægW6–öåF&vWD÷F–öç2†–ægW6–öâ“°Ð¢6öç7BF&vWD—FVÔ–BÒ7FFRçF&vWG5¶–ægW6–öâæ–EÒÇÂ"#°Ð Ð¢&WGW&â Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"Öf–VÆB#àÐ¢Æƒ3âG¶W66T‡FÖÂ†–ægW6–öâææÖR—ÓÂöƒ3àÐ¢Ç6Æ73Ò'6ÖÆÂ#àÐ¢ÆWfVÂG·6fTçVÖ&W"†–ægW6–öâæÖ–æ–×VÔÆWfVÂÂ"—Ò°Ð¢Æ'#âG¶W66T‡FÖÂ†–ægW6–öâç7VÖÖ'’ÇÂ""—ÐÐ¢Â÷àÐ¢ÆF—b6Æ73Ò&†rÖ6†&7FW"Ö6&BÖ7F–öç2#àÐ¢Æ'WGFöàÐ¢G—SÒ&'WGFöâ Ð¢FFÖ62Ö7F–öãÒ'FövvÆRÖ'F–f–6W"Ö–ægW6–öâÖ¶æ÷vâ Ð¢FFÖfVGW&RÖ¶W“Ò"G¶W66T‡FÖÂ†fVGW&T¶W’—Ò Ð¢FFÖ–ægW6–öâÖ–CÒ"G¶W66T‡FÖÂ†–ægW6–öâæ–B—Ò Ð¢âG¶¶æ÷vâò$f÷&vWB"¢$ÆV&â'ÓÂö'WGFöãàÐ Ð¢G¶¶æ÷vàÐ¢ò Ð¢Æ'WGFöàÐ¢G—SÒ&'WGFöâ Ð¢FFÖ62Ö7F–öãÒ'FövvÆRÖ'F–f–6W"Ö–ægW6–öâÖ7F—fR Ð¢FFÖfVGW&RÖ¶W“Ò"G¶W66T‡FÖÂ†fVGW&T¶W’—Ò Ð¢FFÖ–ægW6–öâÖ–CÒ"G¶W66T‡FÖÂ†–ægW6–öâæ–B—Ò Ð¢âG¶7F—fRò%&VÖ÷fR–ægW6–öâ"¢$–ægW6R—FVÒ'ÓÂö'WGFöãàÐ¢ Ð¢¢"'ÐÐ¢ÂöF—càÐ¢G¶7F—fRbb–ægW6–öâç&WV—&W4—FVÕF&vW@Ð¢ò Ð¢ÆÆ&VÂ6Æ73Ò&†rÖ6†&7FW"Öf–VÆB#àÐ¢Ç7ãä–ægW6VB—FVÓÂ÷7ãàÐ¢Ç6VÆV7@Ð¢FFÖ62Ö–ægW6–öâ×F&vWCÒ'G'VR Ð¢FFÖfVGW&RÖ¶W“Ò"G¶W66T‡FÖÂ†fVGW&T¶W’—Ò Ð¢FFÖ–ægW6–öâÖ–CÒ"G¶W66T‡FÖÂ†–ægW6–öâæ–B—Ò Ð¢àÐ¢Æ÷F–öâfÇVSÒ"#ä6†ö÷6RâVÆ–v–&ÆR—FVÓÂö÷F–öãàÐ¢G·F&vWD÷F–öç2æÖ‚†—FVÒ’Óâ°Ð¢&WGW&â Ð¢Æ÷F–öàÐ¢fÇVSÒ"G¶W66T‡FÖÂ†—FVÒæ–B—Ò Ð¢G·F&vWD—FVÔ–BÓÓÒ—FVÒæ–Bò'6VÆV7FVB"¢"'ÐÐ¢âG¶W66T‡FÖÂ†—FVÒææÖR—ÓÂö÷F–öãàÐ¢°Ð¢Ò’æ¦ö–â‚""—ÐÐ¢Â÷6VÆV7CàÐ¢ÂöÆ&VÃàÐ¢ Ð¢¢"'ÐÐ¢ÂöF—càÐ¢°Ð¢Ò’æ¦ö–â‚""—ÐÐ¢ÂöF—càÐ¢°Ð¢ÐÐ Ð¢gVæ7F–öâf÷&ÖE6V7F–öã%&V6†&vR‡fÇVR’°Ð¢6öç7B6ÆVåfÇVRÒ6ÆVå7G&–ær‡fÇVR“°Ð Ð¢6öç7BÆ&VÇ2Ò°Ð¢Æöæu&W7C¢$Æöær&W7B"ÀÐ¢6†÷'E&W7C¢%6†÷'B&W7B"ÀÐ¢6†÷'D÷$Æöæu&W7C¢%6†÷'B÷"Æöær&W7B"ÀÐ¢GW&ã¢%7F'BöbGW&â Ð¢Ó°Ð Ð¢&WGW&âÆ&VÇ5¶6ÆVåfÇVUÒÇÂ6ÆVåfÇVS°Ð¢ÐÐ Ð¢gVæ7F–öâWfÇVFU6V7F–öã$6Æ74ÆWfVÄf÷&×VÆ€Ð¢f÷&×VÆÀÐ¢6Æ74ÆWfVÀÐ¢’°Ð¢6öç7B6ÆVäf÷&×VÆÒ6ÆVå7G&–ær†f÷&×VÆ“°Ð Ð¢6öç7B×VÇF—Æ–W$ÖF6‚Ò6ÆVäf÷&×VÆæÖF6‚€Ð¢õæ6Æ74ÆWfVÅÇ2¥Â¥Ç2¢…ÆB²’BöÐ¢“°Ð Ð¢–b†×VÇF—Æ–W$ÖF6‚’°Ð¢&WGW&â€Ð¢6Æ74ÆWfVÂ Ð¢6fTçVÖ&W"†×VÇF—Æ–W$ÖF6…³ÒÂÐ¢“°Ð¢ÐÐ Ð¢–b†6ÆVäf÷&×VÆÓÓÒ&6Æ74ÆWfVÂ"’°Ð¢&WGW&â6Æ74ÆWfVÃ°Ð¢ÐÐ Ð¢&WGW&â6ÆVäf÷&×VÆ°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öã$fVGW&TÖV6†æ–4Æ–æW2†fVGW&R’°Ð¢6öç7B6Æ74ÆWfVÂÒÖF‚æÖ‚€Ð¢ÀÐ¢6fTçVÖ&W"€Ð¢fVGW&Sòæ6Æ74ÆWfVÂÀÐ¢fVGW&SòæÆWfVÂÇÂÐ¢Ð¢“°Ð¢6öç7BÆ–æW2ÒµÓ°Ð¢6öç7B&W6÷W&6TFFÐÐ¢fVGW&Sòç&W6÷W&6Rb`Ð¢G—VöbfVGW&Rç&W6÷W&6RÓÓÒ&ö&¦V7B Ð¢òfVGW&Rç&W6÷W&6PÐ¢¢·Ó°Ð¢6öç7BW6W2Ò&W6÷W&6TFFçW6W2óðÐ¢vWE&öw&W76–öåfÇVT'”ÆWfVÂ€Ð¢&W6÷W&6TFFçW6W4'”ÆWfVÂÀÐ¢6Æ74ÆWfVÂÀÐ¢çVÆÀÐ¢“°Ð¢6öç7B&V6†&vRÒ&W6÷W&6TFFç&V6†&vRÇÀÐ¢vWE&öw&W76–öåfÇVT'”ÆWfVÂ€Ð¢&W6÷W&6TFFç&V6†&vT'”ÆWfVÂÀÐ¢6Æ74ÆWfVÂÀÐ¢" Ð¢“°Ð¢6öç7BF–RÒ&W6÷W&6TFFæF–RÇÀÐ¢vWE&öw&W76–öåfÇVT'”ÆWfVÂ€Ð¢&W6÷W&6TFFæF–T'”ÆWfVÂÀÐ¢6Æ74ÆWfVÂÀÐ¢" Ð¢“°Ð Ð¢–b‡W6W2ÓÒçVÆÂbbW6W2ÓÒVæFVf–æVBbbW6W2ÓÒ""’°Ð¢Æ–æW2çW6‚†W6W3¢G·W6W7Ö“°Ð¢ÐÐ Ð¢–b‡&V6†&vR’°Ð¢Æ–æW2çW6‚€Ð¢&V6†&vS¢G¶f÷&ÖE6V7F–öã%&V6†&vR€Ð¢&V6†&vPÐ¢—Ö Ð¢“°Ð¢ÐÐ Ð¢–b†F–R’°Ð¢Æ–æW2çW6‚†F–S¢G¶F–WÖ“°Ð¢ÐÐ Ð¢–b‡&W6÷W&6TFFçW6W4&–Æ—G’’°Ð¢6öç7B&–Æ—G”–BÒ7G&–ær€Ð¢&W6÷W&6TFFçW6W4&–Æ—GÐ¢’ç6Æ–6RƒÂ2’çFôÆ÷vW$66R‚“°Ð Ð¢6öç7B&–Æ—G”ÖöF–f–W"ÐÐ¢6Æ7VÆFT&–Æ—G”ÖöF–f–W"€Ð¢vWD&–Æ—G•66÷&R€Ð¢7&VF÷%7FFRæG&gBÀÐ¢&–Æ—G”–@Ð¢Ð¢“°Ð Ð¢6öç7B&–Æ—G•W6W2ÒÖF‚æÖ‚€Ð¢6fTçVÖ&W"€Ð¢&W6÷W&6TFFæÖ–æ–×VÒÀÐ¢Ð¢’ÀÐ¢&–Æ—G”ÖöF–f–W Ð¢“°Ð Ð¢Æ–æW2çW6‚€Ð¢W6W3¢G¶&–Æ—G•W6W7Ò‚G¶&–Æ—G”–BçFõWW$66R‚—ÒÖöF–f–W"– Ð¢“°Ð¢ÐÐ Ð¢–b‡&W6÷W&6TFFçööÃòæf÷&×VÆ’°Ð¢6öç7BööÅfÇVRÐÐ¢WfÇVFU6V7F–öã$6Æ74ÆWfVÄf÷&×VÆ€Ð¢&W6÷W&6TFFçööÂæf÷&×VÆÀÐ¢6Æ74ÆWfVÀÐ¢“°Ð Ð¢Æ–æW2çW6‚†ööÃ¢G·ööÅfÇVWÖ“°Ð¢ÒVÇ6R–b‡&W6÷W&6TFFçW$ÆWfVÂ’°Ð¢Æ–æW2çW6‚€Ð¢ööÃ¢G¶6Æ74ÆWfVÂ¢6fTçVÖ&W"€Ð¢&W6÷W&6TFFçW$ÆWfVÂÀÐ¢Ð¢—Ö Ð¢“°Ð¢ÒVÇ6R–b€Ð¢6ÆVå7G&–ær‡&W6÷W&6TFFç66ÆW5v—F‚Ð¢çFôÆ÷vW$66R‚’ÓÓÒ&ÆWfVÂ Ð¢’°Ð¢Æ–æW2çW6‚†ööÃ¢G¶6Æ74ÆWfVÇÖ“°Ð¢ÐÐ Ð¢„'&’æ—4'&’†fVGW&SòæVffV7G2’òfVGW&RæVffV7G2¢µÒÐ¢æf÷$V6‚‚†VffV7B’Óâ°Ð¢–b†VffV7BçG—RÓÓÒ'7VÆÆ67F–ær"’°Ð¢Æ–æW2çW6‚€Ð¢7VÆÆ67F–æs¢Gµ7G&–ær†VffV7Bæ&–Æ—G’ÇÂ""’çFõWW$66R‚—Ò‚G¶VffV7Bç&öw&W76–öâÇÂ&æöæR'Ò– Ð¢“°Ð¢ÐÐ Ð¢–b†VffV7BçG—RÓÓÒ&&Ö÷$6Æ74f÷&×VÆ"’°Ð¢6öç7B&–Æ—F–W2Ò†VffV7Bæ&–Æ—F–W2ÇÂµÒÐ¢æÖ‚†&–Æ—G’’Óâ7G&–ær†&–Æ—G’’çFõWW$66R‚’Ð¢æ¦ö–â‚"²"“°Ð¢Æ–æW2çW6‚†3¢G·6fTçVÖ&W"†VffV7Bæ&6RÂ—Ò²G¶&–Æ—F–W7Ö“°Ð¢ÐÐ Ð¢–b†VffV7BçG—RÓÓÒ'7VVD&öçW2"’°Ð¢Æ–æW2çW6‚†G¶VffV7BæÖ÷fVÖVçBÇÂ'vÆ²'Ò7VVC¢²G·6fTçVÖ&W"†VffV7BçfÇVRÂ—ÒgBæ“°Ð¢ÐÐ Ð¢–b†VffV7BçG—RÓÓÒ'7VVD&öçW4'”ÆWfVÂ"’°Ð¢6öç7BfÇVRÒvWE&öw&W76–öåfÇVT'”ÆWfVÂ€Ð¢VffV7BçfÇVW2ÀÐ¢6Æ74ÆWfVÂÀÐ¢ Ð¢“°Ð¢Æ–æW2çW6‚†G¶VffV7BæÖ÷fVÖVçBÇÂ'vÆ²'Ò7VVC¢²G·6fTçVÖ&W"‡fÇVRÂ—ÒgBæ“°Ð¢ÐÐ Ð¢–b†VffV7BçG—RÓÓÒ&W‡G&GF6²"’°Ð¢Æ–æW2çW6‚†GF6·2W"GF6²7F–öã¢G·6fTçVÖ&W"†VffV7BæGF6·2Â—Ö“°Ð¢ÐÐ Ð¢–b†VffV7BçG—RÓÓÒ'6æV´GF6²"’°Ð¢Æ–æW2çW6‚€Ð¢6æV²GF6³¢G¶vWE&öw&W76–öåfÇVT'”ÆWfVÂ†VffV7BæF–6T'”ÆWfVÂÂ6Æ74ÆWfVÂÂ#Cb"—Ö Ð¢“°Ð¢ÐÐ Ð¢–b†VffV7BçG—RÓÓÒ'&vR"’°Ð¢Æ–æW2çW6‚€Ð¢&vRFÖvS¢²G¶vWE&öw&W76–öåfÇVT'”ÆWfVÂ†VffV7BæFÖvT&öçW4'”ÆWfVÂÂ6Æ74ÆWfVÂÂ"—Ö Ð¢“°Ð¢ÐÐ Ð¢–b†VffV7BçG—RÓÓÒ&Ö'F–Ä'G2"’°Ð¢Æ–æW2çW6‚€Ð¢Ö'F–Â'G2F–S¢G¶vWE&öw&W76–öåfÇVT'”ÆWfVÂ†VffV7BæF–T'”ÆWfVÂÂ6Æ74ÆWfVÂÂ&CB"—Ö Ð¢“°Ð¢ÐÐ Ð¢–b†VffV7BçG—RÓÓÒ'v–ÆE6†R"’°Ð¢6öç7BÆ–Ö—FF–öç2ÒvWE&öw&W76–öåfÇVT'”ÆWfVÂ€Ð¢VffV7BæÆ–Ö—FF–öç4'”ÆWfVÂÀÐ¢6Æ74ÆWfVÂÀÐ¢µÐÐ¢“°Ð¢Æ–æW2çW6‚€Ð¢v–ÆB6†S¢5"G¶vWE&öw&W76–öåfÇVT'”ÆWfVÂ†VffV7BæÖ„7$'”ÆWfVÂÂ6Æ74ÆWfVÂÂ#óB"—Ò÷"Æ÷vW& Ð¢“°Ð¢Æ–æW2çW6‚€Ð¢GW&F–öã¢G´ÖF‚æÖ‚ƒÂÖF‚æfÆö÷"†6Æ74ÆWfVÂò"’—Ò†÷W"‡2’G¶Æ–Ö—FF–öç2æÆVæwF‚ò²G¶Æ–Ö—FF–öç2æ¦ö–â‚"Â"—Ö¢"'Ö Ð¢“°Ð¢ÐÐ Ð¢–b†VffV7BçG—RÓÓÒ&F—f–æU6Ö—FR"’°Ð¢Æ–æW2çW6‚€Ð¢$F—f–æR6Ö—FS¢7VæB7VÆÂ6Æ÷BgFW"ÖVÆVRvVöâ†—B Ð¢“°Ð¢ÐÐ Ð¢–b†VffV7BçG—RÓÓÒ&ÖæWWfW%6fTF2"’°Ð¢6öç7B&–Æ—G”ÖöF–f–W"ÒÖF‚æÖ‚€Ð¢6Æ7VÆFT&–Æ—G”ÖöF–f–W"€Ð¢vWD&–Æ—G•66÷&R†7&VF÷%7FFRæG&gBÂ'7G""Ð¢’ÀÐ¢6Æ7VÆFT&–Æ—G”ÖöF–f–W"€Ð¢vWD&–Æ—G•66÷&R†7&VF÷%7FFRæG&gBÂ&FW‚"Ð¢Ð¢“°Ð¢Æ–æW2çW6‚€Ð¢ÖæWWfW"6fRD3¢G³‚²vWD6†&7FW%&öf–6–Væ7”&öçW2†7&VF÷%7FFRæG&gB’²&–Æ—G”ÖöF–f–W'Ö Ð¢“°Ð¢ÐÐ Ð¢–b†VffV7BçG—RÓÓÒ'&W6÷W&6UööÂ"bbVffV7Bæf÷&×VÆ’°Ð¢6öç7BfÇVRÐÐ¢WfÇVFU6V7F–öã$6Æ74ÆWfVÄf÷&×VÆ€Ð¢VffV7Bæf÷&×VÆÀÐ¢6Æ74ÆWfVÀÐ¢“°Ð¢Æ–æW2çW6‚†G¶VffV7BææÖRÇÂ%&W6÷W&6R'Ó¢G·fÇVWÖ“°Ð¢ÐÐ Ð¢–b†VffV7BçG—RÓÓÒ&–ægW6–öç2"’°Ð¢Æ–æW2çW6‚€Ð¢–ægW6–öç2¶æ÷vã¢G¶vWE&öw&W76–öåfÇVT'”ÆWfVÂ†VffV7Bæ¶æ÷vä'”ÆWfVÂÂ6Æ74ÆWfVÂÂ—Ö Ð¢“°Ð¢Æ–æW2çW6‚€Ð¢–ægW6VB—FV×3¢G¶vWE&öw&W76–öåfÇVT'”ÆWfVÂ†VffV7Bæ7F—fT'”ÆWfVÂÂ6Æ74ÆWfVÂÂ—Ö Ð¢“°Ð¢ÐÐ¢Ò“°Ð Ð¢&WGW&â²ââææWr6WB†Æ–æW2•Ó°Ð¢ÐÐ Ð¢gVæ7F–öâ&VæFW%6V7F–öã$fVGW&TÖV6†æ–72†fVGW&R’°Ð¢6öç7BÆ–æW2ÒvWE6V7F–öã$fVGW&TÖV6†æ–4Æ–æW2†fVGW&R“°Ð Ð¢–b‚Æ–æW2æÆVæwF‚’°Ð¢&WGW&â"#°Ð¢ÐÐ Ð¢&WGW&â Ð¢Ç6Æ73Ò'6ÖÆÂ#àÐ¢Æ#äÖV6†æ–73£Âö#ãÆ'#àÐ¢G¶Æ–æW2æÖ‚†Æ–æR’ÓâW66T‡FÖÂ†Æ–æR’’æ¦ö–â‚#Æ'#â"—ÐÐ¢Â÷àÐ¢°Ð¢ÐÐ Ð¢gVæ7F–öâ&VæFW%6V7F–öã$gWGW&TfVGW&W2‚’°Ð¢6öç7BgWGW&TfVGW&W2ÐÐ¢vWE6V7F–öã$gWGW&T6Æ74fVGW&W2‚“°Ð Ð¢–b‚gWGW&TfVGW&W2æÆVæwF‚’°Ð¢&WGW&â"#°Ð¢ÐÐ Ð¢6öç7BfVGW&Tw&÷W2ÒæWrÖ‚“°Ð Ð¢gWGW&TfVGW&W2æf÷$V6‚‚†fVGW&R’Óâ°Ð¢6öç7BÆWfVÂÒÖF‚æÖ‚€Ð¢ÀÐ¢ÖF‚ç&÷VæB€Ð¢6fTçVÖ&W"†fVGW&RæÆWfVÂÂÐ¢Ð¢“°Ð Ð¢6öç7Bw&÷W¶W’ÐÐ¢fVGW&Ræ6Æ74VçG'”–@Ð¢òG¶fVGW&Ræ6Æ74VçG'”–GÓ¢G¶ÆWfVÇÖ Ð¢¢6–ævÆS¢G¶ÆWfVÇÖ°Ð Ð¢–b‚fVGW&Tw&÷W2æ†2†w&÷W¶W’’’°Ð¢fVGW&Tw&÷W2ç6WB†w&÷W¶W’Â°Ð¢ÆWfVÂÀÐ¢6Æ74æÖS Ð¢fVGW&Ræ6Æ74VçG'”–@Ð¢òfVGW&Ræ6Æ74æÖPÐ¢¢""ÀÐ¢fVGW&W3¢µÐÐ¢Ò“°Ð¢ÐÐ Ð¢fVGW&Tw&÷W0Ð¢ævWB†w&÷W¶W’Ð¢æfVGW&W0Ð¢çW6‚†fVGW&R“°Ð¢Ò“°Ð Ð¢6öç7BÆWfVÄ6&G2Ò'&’æg&öÒ€Ð¢fVGW&Tw&÷W2çfÇVW2‚Ð¢Ð¢æÖ‚‡²ÆWfVÂÂ6Æ74æÖRÂfVGW&W2Ò’Óâ°Ð¢&WGW&â Ð¢Æ'F–6ÆR6Æ73Ò&†rÖ6†&7FW"Ö6†ö–6RÖ6&B#àÐ¢Æƒ3âG°Ð¢6Æ74æÖPÐ¢òG¶W66T‡FÖÂ†6Æ74æÖR—Ò Ð¢¢" Ð¢ÔÆWfVÂG¶ÆWfVÇÓÂöƒ3àÐ Ð¢ÇàÐ¢G¶fVGW&W0Ð¢æÖ‚†fVGW&R’Óâ°Ð¢&WGW&âW66T‡FÖÂ†fVGW&RææÖR“°Ð¢ÒÐ¢æ¦ö–â‚#Æ'#â"—ÐÐ¢Â÷àÐ¢Âö'F–6ÆSàÐ¢°Ð¢ÒÐ¢æ¦ö–â‚""“°Ð Ð¢&WGW&â Ð¢ÆFWF–Ç26Æ73Ò&†rÖ6†&7FW"ÖgWGW&RÖfVGW&W2#àÐ¢Ç7VÖÖ'“àÐ¢gWGW&RfVGW&W2‚G¶gWGW&TfVGW&W2æÆVæwF‡ÒÐ¢Â÷7VÖÖ'“àÐ Ð¢Ç6Æ73Ò'6ÖÆÂ#àÐ¢F†W6RfVGW&W2VæÆö6²gFW"–÷W"7W'&VçB6Æ72ÆWfVÂàÐ¢Â÷àÐ Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"Ö6†ö–6RÖw&–B#àÐ¢G¶ÆWfVÄ6&G7ÐÐ¢ÂöF—càÐ¢ÂöFWF–Ç3àÐ¢°Ð¢ÐÐ Ð¢gVæ7F–öâ&VæFW%6V7F–öã%6VÆV7FVD6Æ74FWF–Ç2‚’°Ð¢6öç7B6VÆV7FVD6Æ72ÒvWE6VÆV7FVD6Æ75FV×ÆFR‚“°Ð Ð¢–b‚6VÆV7FVD6Æ72’°Ð¢&WGW&â"#°Ð¢ÐÐ Ð¢6öç7BfVGW&W2ÒvWE6V7F–öã$6Æ74fVGW&W5F‡&÷Vv„ÆWfVÂ‚“°Ð¢6öç7B6Æ74VçG&–W2ÐÐ¢vWD6Æ75&öw&W76–öäVçG&–W2€Ð¢7&VF÷%7FFRæG&g@Ð¢“°Ð¢6öç7B×VÇF–6Æ72ÐÐ¢6Æ74VçG&–W2æÆVæwF‚â°Ð¢6öç7BÆFW7D6•6Æ÷D–BÒ6ÆVå7G&–ær€Ð¢vWDÆFW7DÆWfVÅW6öçFW‡B€Ð¢7&VF÷%7FFRæG&g@Ð¢“òæ6•6Æ÷Còæ–@Ð¢“°Ð Ð¢6öç7B&VæFW$fVGW&T6&BÒ†fVGW&R’Óâ°Ð¢6öç7B6†ö–6T÷F–öå&V6÷&G2ÐÐ¢fVGW&RçG—RÓÓÒ&6†ö–6R Ð¢òvWE6V7F–öã$fVGW&T6†ö–6T÷F–öå&V6÷&G2†fVGW&RÐ¢¢µÓ°Ð¢6öç7BfVGW&U6VÆV7F–öç2ÐÐ¢vWE6V7F–öã$fVGW&U7F÷&VD6†ö–6W2†fVGW&R“°Ð¢6öç7B6†ö÷6T6÷VçBÐÐ¢vWE6V7F–öã$fVGW&T6†ö÷6T6÷VçB†fVGW&R“°Ð¢6öç7B6†ö–6T¶W’ÐÐ¢vWE6V7F–öã$fVGW&T6†ö–6T¶W’†fVGW&R“°Ð¢6öç7BfVGW&T6•6Æ÷BÐÐ¢fVGW&Ræ÷F–öå6÷W&6RÓÓÒ&6”÷$fVB Ð¢òvWE6V7F–öã%VæÆö6¶VD6•6Æ÷B€Ð¢fVGW&Ræ–@Ð¢Ð¢¢çVÆÃ°Ð¢6öç7B—4ÆFW7D6•6Æ÷BÒ&ööÆVâ€Ð¢ÆFW7D6•6Æ÷D–Bb`Ð¢6ÆVå7G&–ær†fVGW&T6•6Æ÷Còæ–B’ÓÓÐÐ¢ÆFW7D6•6Æ÷D–@Ð¢“°Ð Ð¢&WGW&â Ð¢Æ'F–6ÆPÐ¢6Æ73Ò&†rÖ6†&7FW"Ö6†ö–6RÖ6&B Ð¢FFÖ6Æ72ÖVçG'’Ö–CÒ"G¶W66T‡FÖÂ†fVGW&Ræ6Æ74VçG'”–BÇÂ""—Ò Ð¢FFÖfVGW&RÖ6&BÖ6Æ72Ö–CÒ"G¶W66T‡FÖÂ†fVGW&Ræ6Æ74–BÇÂ""—Ò Ð¢FFÖfVGW&RÖ6&BÖ–CÒ"G¶W66T‡FÖÂ†fVGW&Ræ–BÇÂ""—Ò Ð¢àÐ¢Æƒ3âG¶W66T‡FÖÂ†fVGW&RææÖR—ÓÂöƒ3àÐ Ð¢Ç6Æ73Ò'6ÖÆÂ#àÐ¢G¶fVGW&Ræ6Æ74æÖRòG¶W66T‡FÖÂ†fVGW&Ræ6Æ74æÖR—Ò¢"'ÔÆWfVÂG·6fTçVÖ&W"†fVGW&RæÆWfVÂÂ—ÐÐ¢G¶fVGW&Rç7VÖÖ'Ð¢òÆ'#âG¶W66T‡FÖÂ†fVGW&Rç7VÖÖ'’—Ö Ð¢¢"'ÐÐ¢Â÷àÐ Ð¢G°Ð¢fVGW&RæFW67&—F–öàÐ¢ò Ð¢Ç Ð¢6Æ73Ò'6ÖÆÂ Ð¢FFÖfVGW&RÖgVÆÂÖFW67&—F–öãÒ'G'VR Ð¢àÐ¢G¶W66T‡FÖÂ€Ð¢fVGW&RæFW67&—F–öàÐ¢—ÐÐ¢Â÷àÐ¢ Ð¢¢" Ð¢ÐÐ Ð¢G·&VæFW$6Æ74fVGW&TÖWFFF€Ð¢fVGW&PÐ¢—ÐÐ Ð¢G·&VæFW%6V7F–öã$fVGW&TÖV6†æ–72†fVGW&R—ÐÐ Ð¢G¶fVGW&Ræ7W7FöÕG—RÓÓÒ&'F–f–6W$–ægW6–öç2 Ð¢ò&VæFW%6V7F–öã$'F–f–6W$–ægW6–öç2†fVGW&RÐ¢¢fVGW&Ræ÷F–öå6÷W&6RÓÓÒ&6”÷$fVB Ð¢ò—4ÆFW7D6•6Æ÷@Ð¢ò Ð¢Ç6Æ73Ò'6ÖÆÂ#àÐ¢ÖævRF†—26†ö–6R–âÆFW7BÆWfVÂVæÆö6²&÷fRàÐ¢Â÷àÐ¢ Ð¢¢&VæFW%6V7F–öã$6”6†ö–6R†fVGW&RÐ¢¢fVGW&RçG—RÓÓÒ&6†ö–6R Ð¢ò Ð¢ÇãÆ#ä6†ö÷6RG¶6†ö÷6T6÷VçGÓ£Âö#ãÂ÷àÐ Ð¢G¶6†ö–6T÷F–öå&V6÷&G2æÆVæwF€Ð¢ò Ð¢G¶fVGW&Ræ÷F–öå6÷W&6RÓÓÒ&67F&ÆU7VÆÇ4ÆÄ6Æ76W2 Ð¢ò Ð¢ÆÆ&VÂ6Æ73Ò&†rÖ6†&7FW"Öf–VÆB#àÐ¢Ç7ãä6†ö÷6RG¶6†ö÷6T6÷VçGÒ7VÆÂG¶6†ö÷6T6÷VçBÓÓÒò""¢'2'ÓÂ÷7ãàÐ¢Ç6VÆV7@Ð¢×VÇF—ÆPÐ¢6—¦SÒ#‚ Ð¢FFÖ62Ö6Æ72ÖfVGW&R×6VÆV7CÒ'G'VR Ð¢FFÖfVGW&RÖ¶W“Ò"G¶W66T‡FÖÂ†6†ö–6T¶W’—Ò Ð¢FFÖ6†ö–6RÖÆ–Ö—CÒ"G¶6†ö÷6T6÷VçGÒ Ð¢àÐ¢G¶6†ö–6T÷F–öå&V6÷&G2æÖ‚†÷F–öå&V6÷&B’Óâ°Ð¢&WGW&â Ð¢Æ÷F–öàÐ¢fÇVSÒ"G¶W66T‡FÖÂ†÷F–öå&V6÷&BçfÇVR—Ò Ð¢G¶fVGW&U6VÆV7F–öç2æ–æ6ÇVFW2†÷F–öå&V6÷&BçfÇVR’ò'6VÆV7FVB"¢"'ÐÐ¢âG¶W66T‡FÖÂ†÷F–öå&V6÷&BæÆ&VÂ—ÓÂö÷F–öãàÐ¢°Ð¢Ò’æ¦ö–â‚""—ÐÐ¢Â÷6VÆV7CàÐ¢ÂöÆ&VÃàÐ¢ Ð¢¢ Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"Ö–æÆ–æRÖ7F–öç2#àÐ¢G¶6†ö–6T÷F–öå&V6÷&G2æÖ‚†÷F–öå&V6÷&B’Óâ°Ð¢6öç7B6VÆV7FVBÒfVGW&U6VÆV7F–öç2æ–æ6ÇVFW2†÷F–öå&V6÷&BçfÇVR“°Ð Ð¢&WGW&â Ð¢Æ'WGFöàÐ¢G—SÒ&'WGFöâ Ð¢6Æ73Ò"G·6VÆV7FVBò'6VÆV7FVB"¢"'Ò Ð¢FFÖ62Ö7F–öãÒ'FövvÆRÖ6Æ72ÖfVGW&RÖ6†ö–6R Ð¢FFÖfVGW&RÖ–CÒ"G¶W66T‡FÖÂ†fVGW&Ræ–B—Ò Ð¢FFÖfVGW&RÖ¶W“Ò"G¶W66T‡FÖÂ†6†ö–6T¶W’—Ò Ð¢FFÖ÷F–öãÒ"G¶W66T‡FÖÂ†÷F–öå&V6÷&BçfÇVR—Ò Ð¢G¶÷F–öå&V6÷&Bç7VÖÖ'’òF—FÆSÒ"G¶W66T‡FÖÂ†÷F–öå&V6÷&Bç7VÖÖ'’—Ò&¢"'ÐÐ¢àÐ¢G·6VÆV7FVBò%&VÖ÷fR"¢$6†ö÷6R'ÐÐ¢G¶W66T‡FÖÂ†÷F–öå&V6÷&BæÆ&VÂ—ÐÐ¢G¶÷F–öå&V6÷&Bæ6÷7BÓÒVæFVf–æVBò‚G¶W66T‡FÖÂ…7G&–ær†÷F–öå&V6÷&Bæ6÷7B’—Òö–çBG·6fTçVÖ&W"†÷F–öå&V6÷&Bæ6÷7BÂ’ÓÓÒò""¢'2'Ò–¢"'ÐÐ¢Âö'WGFöãàÐ¢°Ð¢Ò’æ¦ö–â‚""—ÐÐ¢ÂöF—càÐ¢ÐÐ¢ Ð¢¢ Ð¢Ç6Æ73Ò'6ÖÆÂ#àÐ¢÷F–öç2&V6öÖRf–Æ&ÆRgFW"F†R&VÆFVB7V&6Æ72÷"&öf–6–Væ7’6†ö–6W2&RÖFRàÐ¢Â÷àÐ¢ÐÐ¢ Ð¢¢"'ÐÐ¢Âö'F–6ÆSàÐ¢°Ð¢Ó°Ð Ð¢6öç7BfVGW&T6&G2ÒfVGW&W0Ð¢æÖ‡&VæFW$fVGW&T6&BÐ¢æ¦ö–â‚""“°Ð Ð¢6öç7B6Æ75&öf–ÆT6&G2ÐÐ¢6Æ74VçG&–W0Ð¢æÖ‚†6Æ74VçG'’Â6Æ74–æFW‚’Óâ°Ð¢6öç7B6Æ75FV×ÆFRÐÐ¢&W6öÇfT6Æ75FV×ÆFTf÷$VçG'’€Ð¢6Æ74VçG'Ð¢“°Ð Ð¢–b‚6Æ75FV×ÆFR’°Ð¢&WGW&â"#°Ð¢ÐÐ Ð¢6öç7B—57F'F–æt6Æ72ÐÐ¢—57F'F–æt6Æ74VçG'’€Ð¢6Æ74VçG'’ÀÐ¢7&VF÷%7FFRæG&gBÀÐ¢6Æ74–æFW€Ð¢“°Ð¢6öç7B6Æ74VçG'”–BÐÐ¢vWD6Æ75&öw&W76–öäVçG'”¶W’€Ð¢6Æ74VçG'’ÀÐ¢6Æ74–æFW€Ð¢“°Ð¢6öç7B6Æ74–BÒÖ¶U6fT–B€Ð¢6Æ74VçG'“òæ6Æ74–BÇÀÐ¢6Æ75FV×ÆFRæ–BÀÐ¢" Ð¢“°Ð¢6öç7B6Æ74æÖRÐÐ¢6fTF—7Æ•7G&–ær€Ð¢6Æ74VçG'“òæ6Æ74æÖRÀÐ¢6Æ75FV×ÆFRææÖRÇÀÐ¢6Æ72G¶6Æ74–æFW‚²Ö Ð¢“°Ð¢6öç7B6Æ74ÆWfVÂÐÐ¢vWD6Æ74VçG'”ÆWfVÂ€Ð¢6Æ74VçG'’ÀÐ¢Ð¢“°Ð¢6öç7B&öf–6–Væ7•'VÆRÐÐ¢—57F'F–æt6Æ70Ð¢ò°Ð¢&Ö÷# Ð¢6Æ75FV×ÆFPÐ¢æ&Ö÷%&öf–6–Væ6–W2ÇÀÐ¢µÒÀÐ¢vVöç3 Ð¢6Æ75FV×ÆFPÐ¢çvVöå&öf–6–Væ6–W2ÇÀÐ¢µÒÀÐ¢FööÇ3 Ð¢6Æ75FV×ÆFPÐ¢çFööÅ&öf–6–Væ6–W2ÇÀÐ¢µÒÀÐ¢6¶–ÆÄ6†ö–6W3 Ð¢6Æ75FV×ÆFPÐ¢ç6¶–ÆÄ6†ö–6W2ÇÀÐ¢·ÐÐ¢ÐÐ¢¢vWD×VÇF–6Æ75&öf–6–Væ7•'VÆR€Ð¢6Æ74VçG'Ð¢“°Ð¢6öç7B6¶–ÆÄ6†ö–6W2ÐÐ¢&öf–6–Væ7•'VÆPÐ¢ç6¶–ÆÄ6†ö–6W2ÇÀÐ¢·Ó°Ð¢6öç7B6VÆV7FVE7V&6Æ72ÐÐ¢vWD6Æ74VçG'•7V&6Æ75FV×ÆFR€Ð¢6Æ74VçG'Ð¢“°Ð¢6öç7B7V&6Æ74ÆWfVÂÐÐ¢ÖF‚æÖ‚€Ð¢ÀÐ¢ÖF‚ç&÷VæB€Ð¢6fTçVÖ&W"€Ð¢6Æ75FV×ÆFPÐ¢ç7V&6Æ74ÆWfVÂÀÐ¢0Ð¢Ð¢Ð¢“°Ð Ð¢&WGW&â Ð¢Æ'F–6ÆPÐ¢6Æ73Ò&†rÖ6†&7FW"Ö6†ö–6RÖ6&B6VÆV7FVB Ð¢FFÖ6Æ72×&öf–ÆRÖVçG'’Ö–CÒ"G¶W66T‡FÖÂ†6Æ74VçG'”–B—Ò Ð¢FFÖ6Æ72×&öf–ÆRÖ–CÒ"G¶W66T‡FÖÂ†6Æ74–B—Ò Ð¢àÐ¢Æƒ3àÐ¢G¶W66T‡FÖÂ†6Æ74æÖR—ÐÐ¢ÆWfVÂG¶6Æ74ÆWfVÇÐÐ¢&öf–6–Væ6–W0Ð¢Âöƒ3àÐ Ð¢ÇàÐ¢Æ#ä6Æ72&öÆS£Âö#àÐ¢G¶—57F'F–æt6Æ72ò%7F'F–ær6Æ72"¢$×VÇF–6Æ72FF—F–öâ'ÐÐ¢Æ'#ãÆ#ä†—BF–S£Âö#âG¶W66T‡FÖÂ†6Æ75FV×ÆFRæ†—DF–RÇÂ&C‚"—ÐÐ¢Æ'#ãÆ#å&–Ö'’&–Æ—G“£Âö#âG¶W66T‡FÖÂ†f÷&ÖE6V7F–öã$Æ—7B†6Æ75FV×ÆFRç&–Ö'”&–Æ—F–W2’ÇÂ$æöæR7V6–f–VB"—ÐÐ¢Æ'#ãÆ#å6f–ærF‡&÷w3£Âö#âG¶W66T‡FÖÂ†—57F'F–æt6Æ72òf÷&ÖE6V7F–öã$Æ—7B†6Æ75FV×ÆFRç6f–æuF‡&÷w2’ÇÂ$æöæR"¢$æöæRv–æVBg&öÒ×VÇF–6Æ76–ær"—ÐÐ¢Æ'#ãÆ#ä&Ö÷#£Âö#âG¶W66T‡FÖÂ†f÷&ÖE6V7F–öã$Æ—7B‡&öf–6–Væ7•'VÆRæ&Ö÷"’ÇÂ$æöæR"—ÐÐ¢Æ'#ãÆ#åvVöç3£Âö#âG¶W66T‡FÖÂ†f÷&ÖE6V7F–öã$Æ—7B‡&öf–6–Væ7•'VÆRçvVöç2’ÇÂ$æöæR"—ÐÐ¢Æ'#ãÆ#åFööÇ3£Âö#âG¶W66T‡FÖÂ†f÷&ÖE6V7F–öã$Æ—7B‡&öf–6–Væ7•'VÆRçFööÇ2’ÇÂ$æöæR"—ÐÐ¢Æ'#ãÆ#å6¶–ÆÂ6†ö–6W3£Âö#â6†ö÷6RG·6fTçVÖ&W"‡6¶–ÆÄ6†ö–6W2æ6†ö÷6RÂ—Òg&öÒG¶W66T‡FÖÂ†f÷&ÖE6V7F–öã$Æ—7B‡6¶–ÆÄ6†ö–6W2æg&öÒ’ÇÂ&æöæR"—ÐÐ¢Æ'#ãÆ#å7V&6Æ73£Âö#âG¶W66T‡FÖÂ‡6VÆV7FVE7V&6Æ73òææÖRÇÂ†6Æ74ÆWfVÂãÒ7V&6Æ74ÆWfVÂò%VæF–ær6VÆV7F–öâ"¢VæÆö6·2B6Æ72ÆWfVÂG·7V&6Æ74ÆWfVÇÖ’—ÐÐ¢Â÷àÐ¢Âö'F–6ÆSàÐ¢°Ð¢ÒÐ¢æ¦ö–â‚""“°Ð Ð¢6öç7B×VÇF–6Æ74fVGW&Tw&÷W2ÐÐ¢×VÇF–6Æ70Ð¢ò6Æ74VçG&–W0Ð¢æÖ‚†6Æ74VçG'’Â6Æ74–æFW‚’Óâ°Ð¢6öç7B6Æ74VçG'”–BÐÐ¢vWD6Æ75&öw&W76–öäVçG'”¶W’€Ð¢6Æ74VçG'’ÀÐ¢6Æ74–æFW€Ð¢“°Ð¢6öç7B6Æ75FV×ÆFRÐÐ¢&W6öÇfT6Æ75FV×ÆFTf÷$VçG'’€Ð¢6Æ74VçG'Ð¢“°Ð¢6öç7B6Æ74–BÒÖ¶U6fT–B€Ð¢6Æ74VçG'“òæ6Æ74–BÇÀÐ¢6Æ75FV×ÆFSòæ–BÀÐ¢" Ð¢“°Ð¢6öç7B6Æ74æÖRÐÐ¢6fTF—7Æ•7G&–ær€Ð¢6Æ74VçG'“òæ6Æ74æÖRÀÐ¢6Æ75FV×ÆFSòææÖRÇÀÐ¢6Æ72G¶6Æ74–æFW‚²Ö Ð¢“°Ð¢6öç7B6Æ74ÆWfVÂÐÐ¢vWD6Æ74VçG'”ÆWfVÂ€Ð¢6Æ74VçG'’ÀÐ¢Ð¢“°Ð¢6öç7B÷væVDfVGW&W2ÐÐ¢fVGW&W2æf–ÇFW"‚†fVGW&R’Óâ°Ð¢&WGW&â€Ð¢6ÆVå7G&–ær€Ð¢fVGW&Ræ6Æ74VçG'”–@Ð¢’ÓÓÒ6Æ74VçG'”–Bb`Ð¢Ö¶U6fT–B€Ð¢fVGW&Ræ6Æ74–BÀÐ¢" Ð¢’ÓÓÒ6Æ74–@Ð¢“°Ð¢Ò“°Ð Ð¢&WGW&â Ð¢Ç6V7F–öàÐ¢6Æ73Ò&†rÖ6†&7FW"Ö6Æ72ÖfVGW&RÖw&÷W Ð¢FFÖ6Æ72ÖfVGW&RÖw&÷WÖVçG'’Ö–CÒ"G¶W66T‡FÖÂ†6Æ74VçG'”–B—Ò Ð¢FFÖ6Æ72ÖfVGW&RÖw&÷WÖ–CÒ"G¶W66T‡FÖÂ†6Æ74–B—Ò Ð¢àÐ¢ÆƒCàÐ¢G¶W66T‡FÖÂ†6Æ74æÖR—ÐÐ¢ÆWfVÂG¶6Æ74ÆWfVÇÒfVGW&W0Ð¢ÂöƒCàÐ Ð¢Ç6Æ73Ò'6ÖÆÂ#àÐ¢öæÇ’G¶W66T‡FÖÂ†6Æ74æÖR—Ò6Æ72æB7V&6Æ72fVGW&W2&R6†÷vâ–âF†—2w&÷WàÐ¢Â÷àÐ Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"Ö6†ö–6RÖw&–B#àÐ¢G¶÷væVDfVGW&W2æÆVæwF€Ð¢ò÷væVDfVGW&W0Ð¢æÖ€Ð¢&VæFW$fVGW&T6&@Ð¢Ð¢æ¦ö–â‚""Ð¢¢ Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"×Æ6V†öÆFW"#àÐ¢æòG¶W66T‡FÖÂ†6Æ74æÖR—ÒfVGW&W2&RFVf–æVBF‡&÷Vv‚6Æ72ÆWfVÂG¶6Æ74ÆWfVÇÒàÐ¢ÂöF—càÐ¢ÐÐ¢ÂöF—càÐ¢Â÷6V7F–öãàÐ¢°Ð¢ÒÐ¢æ¦ö–â‚""Ð¢¢"#°Ð Ð¢&WGW&â Ð¢Æ‡#àÐ Ð¢Æƒ3âG¶×VÇF–6Æ72ò$×VÇF–6Æ72fVGW&RFWF–Ç2"¢G¶W66T‡FÖÂ‡6VÆV7FVD6Æ72ææÖR—ÒFWF–Ç6ÓÂöƒ3àÐ Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"Ö6†ö–6RÖw&–B#àÐ¢G¶6Æ75&öf–ÆT6&G7ÐÐ¢ÂöF—càÐ Ð¢Æƒ3àÐ¢G¶×VÇF–6Æ70Ð¢ò$6Æ72fVGW&W2'’6Æ72ÆWfVÂ Ð¢¢6Æ72fVGW&W2F‡&÷Vv‚ÆWfVÂG¶6Æ×ÆWfVÂ†7&VF÷%7FFRæG&gBæ6Æ75&öw&W76–öâçF÷FÄÆWfVÂ—ÖÐÐ¢Âöƒ3àÐ Ð¢G¶×VÇF–6Æ70Ð¢ò×VÇF–6Æ74fVGW&Tw&÷W0Ð¢¢ Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"Ö6†ö–6RÖw&–B#àÐ¢G¶fVGW&T6&G2ÇÂ Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"×Æ6V†öÆFW"#àÐ¢æò6Æ72fVGW&W2&RFVf–æVBF‡&÷Vv‚F†—2ÆWfVÂàÐ¢ÂöF—càÐ¢ÐÐ¢ÂöF—càÐ¢ÐÐ Ð¢G·&VæFW%6VÆV7FVD6Æ74ÖV6†æ–757VÖÖ'’‚—ÐÐ Ð¢G·&VæFW%6V7F–öã$gWGW&TfVGW&W2‚—ÐÐ¢°Ð¢ÐÐ Ð¢6öç7BfVG57FWÒ7&VFTfVG57FW‡°Ð¢6†&VE6W'f–6W3¢6†&VE7FW6W'f–6W2ÀÐ¢$”Ä•E•ôDTd”ä•D”ôå2ÀÐ¢DTdTÅEôdTE2ÀÐ¢DTdTÅEôdTEô$”Ä•E•õ44õ$UôÔ„”ÕTÒÀÐ¢F§W7E6V7F–öã$6”&–Æ—G’ÀÐ¢FW67&–&TfVE7VÆÄ6†ö–6U&W7G&–7F–öç2ÀÐ¢f–æE6V7F–öã$7F–öäVÆVÖVçC¢‚ââçfÇVW2’Óâ°Ð¢&WGW&â6Æ757FWæf–æD7F–öäVÆVÖVçB‚ââçfÇVW2“°Ð¢ÒÀÐ¢vWDfVD&–Æ—G”VffV7DÖ†–×VÒÀÐ¢vWDfVE&W&WV—6—FTÆ&VÂÀÐ¢vWDfVE&W&WV—6—FU&W7VÇBÀÐ¢vWDfVE7VÆÆ67F–æufÆ–FF–öåv&æ–æw2ÀÐ¢vWDæ÷&ÖÄ&–Æ—G•66÷&Tf÷$6ÀÐ¢vWE6V7F–öã$6”6†ö–6U7FFRÀÐ¢vWE6V7F–öã$fVD6†ö–6TÆ–Ö—BÀÐ¢vWE6V7F–öã$fVD6†ö–6T÷F–öç2ÀÐ¢vWEVæÆö6¶VDfVD6†ö–6U6Æ÷G2ÀÐ¢6WDfVE&W7D6†ö–6RÀÐ¢6WE6V7F–öã$6”fVBÀÐ¢6WE6V7F–öã$6”ÖöFRÀÐ¢6WE6V7F–öã$fVD6†ö–6UfÇVW0Ð¢Ò“°Ð Ð¢6öç7B°Ð¢f÷&ÖE6V7F–öã$fVDVffV7BÀÐ¢&VæFW%6V7F–öã$fVD6†ö–6W2ÀÐ¢&VæFW%6V7F–öã$6ö×7D6”6†ö–6RÀÐ¢&VæFW%6V7F–öã$6”6†ö–6RÀÐ¢†æFÆU6V7F–öã$6”7F–öâÀÐ¢†æFÆU6V7F–öã$6”6†ævRÀÐ¢†æFÆU6V7F–öã$6†ö÷6T6”fVBÀÐ¢†æFÆU6V7F–öã$fVE6V&6€Ð¢ÒÒfVG57FWæ6ö×F–&–Æ—G“°Ð Ð¢6öç7B×VÇF–6Æ757FWÒ7&VFT×VÇF–6Æ757FW‡°Ð¢6†&VE6W'f–6W3¢6†&VE7FW6W'f–6W2ÀÐ¢DTdTÅEôdTE2ÀÐ¢DTdTÅEõ5TÄÅ2ÀÐ¢FD6†&7FW$ÆWfVÅFô6Æ72ÀÐ¢F§W7D×VÇF–6Æ746Æ74ÆWfVÂÀÐ¢6Æ7VÆFT6Æ75&öw&W76–öåF÷FÄÆWfVÂÀÐ¢f–æE6V7F–öã$7F–öäVÆVÖVçC¢‚ââçfÇVW2’Óâ°Ð¢&WGW&â6Æ757FWæf–æD7F–öäVÆVÖVçB‚ââçfÇVW2“°Ð¢ÒÀÐ¢f÷&ÖD6Æ74VçG'•&öf–6–Væ7•7VÖÖ'’ÀÐ¢f÷&ÖD×VÇF–6Æ75&W&WV—6—FTf–ÇW&RÀÐ¢f÷&ÖD×VÇF–6Æ757F÷&VD6†ö–6UfÇVRÀÐ¢vWDÆÄ6Æ75FV×ÆFW2ÀÐ¢vWD6†&7FW$6Æ74VçG&–W2ÀÐ¢vWD6†&7FW$ÆWfVÄ†—DF–U&V6÷&G2ÀÐ¢vWD6Æ74VçG'”D–æFW‚ÀÐ¢vWD6Æ74VçG'”ÆWfVÂÀÐ¢vWD6Æ74VçG'•6¶–ÆÄ6†ö–6T6öæf–rÀÐ¢vWD6Æ74VçG'•7V&6Æ75FV×ÆFRÀÐ¢vWD6Æ74VçG'•FööÄ6†ö–6T6öæf–rÀÐ¢vWD6Æ74VçG'•FööÄ6†ö–6T÷F–öç2ÀÐ¢vWD6Æ75&öw&W76–öäVçG&–W2ÀÐ¢vWD6Æ75&öw&W76–öäVçG'”¶W’ÀÐ¢vWD6Æ75&öw&W76–öåVæF–æt6†ö–6Uv&æ–æw2ÀÐ¢vWDvVæW&–5&öf–6–Væ7”&öçW2ÀÐ¢vWD×VÇF–6Æ746Æ74–BÀÐ¢vWD×VÇF–6Æ75&W&WV—6—FU&W7VÇDf÷$6Æ72ÀÐ¢vWD×VÇF–6Æ75&W&WV—6—FU&W7VÇG2ÀÐ¢vWD×VÇF–6Æ757VÖÖ'”VçG&–W2ÀÐ¢vWE&–Ö'”6Æ74VçG'’ÀÐ¢vWE6fT6Æ74æÖRÀÐ¢vWE6¶–ÆÄFVf–æ—F–öä'”–D÷$æÖRÀÐ¢vWEVæÆö6¶VDfVD6†ö–6U6Æ÷G2ÀÐ¢vWEfÆ–D6Æ74VçG'•6¶–ÆÄ–G2ÀÐ¢vWEfÆ–D6Æ74VçG'•FööÄ6†ö–6W2ÀÐ¢—4×VÇF–6Æ74G&gBÀÐ¢—57F'F–æt6Æ74VçG'’ÀÐ¢Ö÷fT6†&7FW$ÆWfVÄ÷&FW"ÀÐ¢Ö÷fT×VÇF–6Æ746Æ72ÀÐ¢æ÷&ÖÆ—¦T6Æ74ÆWfVÄ÷&FW"ÀÐ¢æ÷&ÖÆ—¦U6V7F–öã%7V&6Æ72ÀÐ¢&V6Æ7VÆFT6Æ75F÷FÄÆWfVÂÀÐ¢&VÖ÷fTÆ7D6†&7FW$ÆWfVÂÀÐ¢&VÖ÷fT×VÇF–6Æ746Æ72ÀÐ¢&VæFW$ÆWfVÅWv÷&¶fÆ÷rÀÐ¢&W6öÇfT6Æ75FV×ÆFTf÷$VçG'’ÀÐ¢6WD×VÇF–6Æ746Æ74ÆWfVÂÀÐ¢6WD×VÇF–6Æ757V&6Æ72ÀÐ¢FövvÆT×VÇF–6Æ756¶–ÆÄ6†ö–6RÀÐ¢FövvÆT×VÇF–6Æ75FööÄ6†ö–6RÀÐ¢G'”FD×VÇF–6Æ746Æ70Ð¢Ò“°Ð Ð¢6öç7B°Ð¢&VæFW$×VÇF–6Æ757F÷&VD6†ö–6W2ÀÐ¢&VæFW$×VÇF–6Æ75&VDöæÇ”æ÷F–6RÀÐ¢&VæFW$×VÇF–6Æ746Æ757VÖÖ'’ÀÐ¢&VæFW$×VÇF–6Æ74Gfæ6VÖVçD6†ö–6U7VÖÖ'’ÀÐ¢&VæFW$×VÇF–6Æ74ÆWfVÄ'&V¶F÷vâÀÐ¢vWE6V7F–öã$×VÇF–6Æ74FE7FGW2ÀÐ¢&VæFW%6V7F–öã$×VÇF–6Æ74FE7FGW2ÀÐ¢6WE6V7F–öã$×VÇF–6Æ74FE7FGW2ÀÐ¢&VæFW$×VÇF–6Æ75&öw&W76–öäVF—F÷"ÀÐ¢&VæFW$×VÇF–6Æ756¶–ÆÄ6†ö–6W2ÀÐ¢&VæFW$×VÇF–6Æ75FööÄ6†ö–6W2ÀÐ¢FV'Vu6V7F–öã$×VÇF–6Æ74FBÀÐ¢†æFÆU6V7F–öã$FD×VÇF–6Æ746Æ72ÀÐ¢†æFÆU6V7F–öã$F§W7D×VÇF–6Æ74ÆWfVÂÀÐ¢†æFÆU6V7F–öã%&VÖ÷fT×VÇF–6Æ746Æ72ÀÐ¢†æFÆU6V7F–öã$Ö÷fT×VÇF–6Æ746Æ72ÀÐ¢†æFÆU6V7F–öã$Ö÷fT6†&7FW$ÆWfVÄ÷&FW"ÀÐ¢†æFÆU6V7F–öã$FD6†&7FW$ÆWfVÂÀÐ¢†æFÆU6V7F–öã%&VÖ÷fTÆ7D6†&7FW$ÆWfVÂÀÐ¢†æFÆU6V7F–öã%FövvÆT×VÇF–6Æ756¶–ÆÂÀÐ¢†æFÆU6V7F–öã%FövvÆT×VÇF–6Æ75FööÂÀÐ¢†æFÆU6V7F–öã$×VÇF–6Æ746†ævPÐ¢ÒÒ×VÇF–6Æ757FWæ6ö×F–&–Æ—G“°Ð Ð¢6öç7B6Æ757FWÒ7&VFT6Æ757FW‡°Ð¢6†&VE6W'f–6W3¢6†&VE7FW6W'f–6W2ÀÐ Ð¢Ç•6V7F–öã$7W7FöÔ6Æ72ÀÐ¢Ç•6V7F–öã$7W7FöÕ7V&6Æ72ÀÐ¢Ç•6VÆV7FVD6Æ74fVGW&TÖV6†æ–72ÀÐ¢6†ö÷6U6V7F–öã$6Æ72ÀÐ¢6†ö÷6U6V7F–öã%7V&6Æ72ÀÐ¢6ÆV%6V7F–öã%7V&6Æ72ÀÐ¢7&VF÷$FWVæFVæ6–W3¢FW2ÀÐ¢FVÆWFU6VÆV7FVE&ööÔ6Æ72ÀÐ¢f÷&ÖE6V7F–öã$Æ—7BÀÐ¢g&–VæFÇ•6W'f–6TW'&÷"ÀÐ¢vWDÆÄ6Æ75FV×ÆFW2ÀÐ¢vWD6†&7FW$6Æ74VçG&–W2ÀÐ¢vWD6Æ74VçG'”ÆWfVÂÀÐ¢vWD6Æ75&öw&W76–öåVæF–æt6†ö–6Uv&æ–æw2ÀÐ¢vWD×VÇF–6Æ75&W&WV—6—FU&W7VÇG2ÀÐ¢vWE&–Ö'”6Æ74VçG'’ÀÐ¢vWE&ööÔ6öFRÀÐ¢vWE6fT6Æ74æÖRÀÐ¢vWE6fU7V&6Æ74æÖRÀÐ¢vWE6V7F–öã$6Æ74fVGW&W5F‡&÷Vv„ÆWfVÂÀÐ¢vWE6V7F–öã$fVGW&T6†ö–6T¶W’ÀÐ¢vWE6V7F–öã$fVGW&T6†ö–6T÷F–öç2ÀÐ¢vWE6V7F–öã$fVGW&T6†ö÷6T6÷VçBÀÐ¢vWE6V7F–öã%&–Ö'”6Æ72ÀÐ¢vWE6V7F–öã%6¶–ÆÅ–6¶W$6†ö–6W2ÀÐ¢vWE6V7F–öã%7V&6Æ75FV×ÆFW2ÀÐ¢vWE6V7F–öã”6öÆÆV7F–öäæÖRÀÐ¢vWE6VÆV7FVD6Æ75FV×ÆFRÀÐ¢vWE6VÆV7FVE6V7F–öã%7V&6Æ72ÀÐ¢—4×VÇF–6Æ74G&gBÀÐ¢&VæFW$7W7FöÔ6Æ74Ö÷fVÖVçDf–VÆG2ÀÐ¢&VæFW$ÆWfVÅ7FW¢‚ââæ&w2’Óâ°Ð¢&WGW&â&–Æ—F–W57FWç&VæFW$ÆWfVÅ7FW‚ââæ&w2“°Ð¢ÒÀÐ¢&VæFW$×VÇF–6Æ74ÆWfVÄ'&V¶F÷vâÀÐ¢&VæFW$×VÇF–6Æ75&öw&W76–öäVF—F÷"ÀÐ¢&VæFW%'VÆW6WDÖWFFFÀÐ¢&VæFW%6V7F–öã%6VÆV7FVD6Æ74FWF–Ç2ÀÐ¢&VæFW%6V7F–öãE&öf–6–Væ7”wV–FS¢‚ââæ&w2’Óâ°Ð¢&WGW&â6¶–ÆÇ57FWæ6ö×F–&–Æ—G’ç&VæFW%6V7F–öãE&öf–6–Væ7”wV–FR‚ââæ&w2“°Ð¢ÒÀÐ¢&VæFW%6V7F–öãE6÷W&6U6¶–ÆÄ6†ö–6W3¢‚ââæ&w2’Óâ°Ð¢&WGW&â6¶–ÆÇ57FWæ6ö×F–&–Æ—G’ç&VæFW%6V7F–öãE6÷W&6U6¶–ÆÄ6†ö–6W2‚ââæ&w2“°Ð¢ÒÀÐ¢6WE6V7F–öã$'F–f–6W$–ægW6–öåF&vWBÀÐ Ð Ð Ð¢6WE6V7F–öã$fVGW&U7F÷&VD6†ö–6W2ÀÐ¢FövvÆU6V7F–öã$'F–f–6W$–ægW6–öâÀÐ¢FövvÆU6V7F–öã$6Æ74fVGW&T6†ö–6RÀÐ¢WFFU6V7F–öã$7W7FöÔ6Æ756¶–ÆÅ–6¶W Ð¢Ò“°Ð Ð¢6öç7B°Ð¢&VæFW$6Æ757FWÀÐ¢&VæFW%7V&6Æ757FWÀÐ¢f–æE6V7F–öã$7F–öäVÆVÖVçBÀÐ¢†æFÆU6V7F–öã$6†ö÷6T6Æ72ÀÐ¢†æFÆU6V7F–öã$FVÆWFU&ööÔ6Æ72ÀÐ¢†æFÆU6V7F–öã$7W7FöÔ6Æ72ÀÐ¢†æFÆU6V7F–öã$6Æ74fVGW&T6†ö–6RÀÐ¢†æFÆU6V7F–öã$6Æ74fVGW&U6VÆV7D6†ævRÀÐ Ð Ð Ð Ð¢†æFÆU6V7F–öã$'F–f–6W$–ægW6–öâÀÐ¢†æFÆU6V7F–öã$'F–f–6W$–ægW6–öåF&vWD6†ævRÀÐ¢†æFÆU6V7F–öã$7W7FöÔ6Æ756¶–ÆÅ–6¶W"ÀÐ¢†æFÆU6V7F–öã$6†ö÷6U7V&6Æ72ÀÐ¢†æFÆU6V7F–öã$7W7FöÕ7V&6Æ72ÀÐ¢†æFÆU6V7F–öã$6ÆV%7V&6Æ70Ð¢ÒÒ6Æ757FWæ6ö×F–&–Æ—G“°Ð Ð¢&Vv—7FW$6†&7FW%7FW&VæFW&W"‚&6Æ72"Â6Æ757FWç&VæFW%7FW“°Ð¢&Vv—7FW$6†&7FW%7FW&VæFW&W"‚'7V&6Æ72"Â6Æ757FWç&VæFW%7V&6Æ757FW“°Ð Ð¢6Æ757FWæ7F–öç2æf÷$V6‚‚†7F–öâ’Óâ°Ð¢&Vv—7FW$6†&7FW$7&VF÷$7F–öâ†7F–öâÂ†6öçFW‡B’Óâ°Ð¢&WGW&â6Æ757FWæ†æFÆU7FW6Æ–6²†6öçFW‡B“°Ð¢Ò“°Ð¢Ò“°Ð Ð¢fVG57FWæ7F–öç2æf÷$V6‚‚†7F–öâ’Óâ°Ð¢&Vv—7FW$6†&7FW$7&VF÷$7F–öâ†7F–öâÂ†6öçFW‡B’Óâ°Ð¢&WGW&âfVG57FWæ†æFÆU7FW6Æ–6²†6öçFW‡B“°Ð¢Ò“°Ð¢Ò“°Ð Ð¢×VÇF–6Æ757FWæ7F–öç2æf÷$V6‚‚†7F–öâ’Óâ°Ð¢&Vv—7FW$6†&7FW$7&VF÷$7F–öâ†7F–öâÂ†6öçFW‡B’Óâ°Ð¢&WGW&â×VÇF–6Æ757FWæ†æFÆU7FW6Æ–6²†6öçFW‡B“°Ð¢Ò“°Ð¢Ò“°Ð Ð¢&Vv—7FW$6†&7FW$7&VF÷$–çWD†æFÆW"†6Æ757FWæ†æFÆU7FW–çWB“°Ð¢&Vv—7FW$6†&7FW$7&VF÷$–çWD†æFÆW"†fVG57FWæ†æFÆU7FW–çWB“°Ð¢&Vv—7FW$6†&7FW$7&VF÷$–çWD†æFÆW"†×VÇF–6Æ757FWæ†æFÆU7FW–çWB“°Ð¢&Vv—7FW$6†&7FW$7&VF÷$6†ævT†æFÆW"†6Æ757FWæ†æFÆU7FW6†ævR“°Ð¢&Vv—7FW$6†&7FW$7&VF÷$6†ævT†æFÆW"†fVG57FWæ†æFÆU7FW6†ævR“°Ð¢&Vv—7FW$6†&7FW$7&VF÷$6†ævT†æFÆW"†×VÇF–6Æ757FWæ†æFÆU7FW6†ævR“°Ð Ð Ð¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÐÐ¢òò4„$5DU"5$TDõ"4T5D”ôâ2(	BÄUdTÂò$”Ä•E’44õ$U0Ð¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÐÐ Ð¢6öç7B&–Æ—F–W57FWÒ7&VFT&–Æ—F–W57FW‡°Ð¢6†&VE6W'f–6W3¢6†&VE7FW6W'f–6W2ÀÐ¢$”Ä•E•ôDTd”ä•D”ôå2ÀÐ¢$”Ä•E•õ44õ$UôÔUD„ôE2ÀÐ¢Ç•6V7F–öã7V6–W4ÖV6†æ–72ÀÐ¢Ç•6V7F–öã$6Æ74FVfVÇG2ÀÐ¢6Æ7VÆFT&–Æ—G”ÖöF–f–W"ÀÐ¢6Æ7VÆFT&Ö÷$6Æ74÷F–öç2ÀÐ¢6Æ7VÆFT6†&7FW$†—DF–6RÀÐ¢6Æ7VÆFT6†&7FW$‡ÀÐ¢6Æ7VÆFT6†&7FW$–æ—F–F—fRÀÐ¢6Æ7VÆFT6†&7FW%76—fU66÷&W2ÀÐ¢6Æ7VÆFU6V7F–öãe7VÆÆ67F–æufÇVW2ÀÐ¢6ÆV%6V7F–öã7V6–W4ÖV6†æ–72ÀÐ¢f–æD‡&öÆÅ&u&V6÷&Df÷$ÆWfVÂÀÐ¢f÷&ÖE6V7F–öãtÖöF–f–W"ÀÐ¢f÷&ÖE6–væVDçVÖ&W"ÀÐ¢vWD&–Æ—G•66÷&RÀÐ¢vWD6†&7FW$ÆWfVÄ†—DF–U&V6÷&G2ÀÐ¢vWD6†&7FW%&öf–6–Væ7”&öçW2ÀÐ¢vWDvVæW&–5&öf–6–Væ7”&öçW2ÀÐ¢vWD†—DF–U6—¦RÀÐ¢vWD‡&öÆÅ&u&V6÷&G2ÀÐ¢vWE&–Ö'”6Æ74VçG'’ÀÐ¢vWE6fT6Æ74æÖRÀÐ¢vWE6VÆV7FVD6Æ75FV×ÆFRÀÐ¢vWE7VÆÆ67F–æu7VÖÖ'’ÀÐ¢‡&öÆÅ&tÖF6†W4ÆWfVÂÀÐ¢—4×VÇF–6Æ74G&gBÀÐ¢æ÷&ÖÆ—¦T‡6Æ7VÆF–öâÀÐ¢æ÷&ÖÆ—¦T‡&öÆÅ&V6÷&G4f÷$6†&7FW"ÀÐ¢&V6Æ7VÆFT&–Æ—G•F÷FÇ2ÀÐ¢&Vg&W6„6Æ75&öw&W76–öäFW&—fVEfÇVW2ÀÐ¢&Vg&W6…6VÆV7FVD6Æ74fVGW&W2ÀÐ¢&VæFW$×VÇF–6Æ74ÆWfVÄ'&V¶F÷vâÀÐ¢&VæFW$×VÇF–6Æ75&öw&W76–öäVF—F÷"ÀÐ¢6WD6†&7FW$ÆWfVÂÀÐ¢6WDG&gEfÇVRÀÐ¢6WE6–×ÆTG&gDf–VÆBÀÐ¢7–æ46Æ74ÆWfVÄ÷&FW%Fô6Æ74ÆWfVÇ0Ð¢Ò“°Ð Ð¢6öç7B°Ð¢vWE6V7F–öã4&–Æ—G”æÖRÀÐ¢4T5D”ôã5õô”åEô%U•ô4õ5E2ÀÐ¢vWE6V7F–öã4&–Æ—G•66÷&RÀÐ¢vWE6V7F–öã4&6T&–Æ—G•66÷&RÀÐ¢vWE6V7F–öã4&–Æ—G”&öçW2ÀÐ¢&VæFW%6V7F–öã4&–Æ—G•66÷&TFWF–Ç2ÀÐ¢6WE6V7F–öã4&–Æ—G”ÖWF†öBÀÐ¢Ç•6V7F–öã566÷&W2ÀÐ¢Ç•6V7F–öã57FæF&D'&’ÀÐ¢76–vå6V7F–öã57FæF&E66÷&RÀÐ¢Ç•6V7F–öã5ö–çD'W”FVfVÇG2ÀÐ¢vWE6V7F–öã5ö–çD'W•7VçBÀÐ¢6†ævU6V7F–öã5ö–çD'W•66÷&RÀÐ¢&öÆÅ6V7F–öã4&–Æ—G•66÷&RÀÐ¢&öÆÅ6V7F–öã566÷&UööÂÀÐ¢Ç•6V7F–öã5&öÆÆVE66÷&W2ÀÐ¢vWE6V7F–öã4†—DF–U6—¦RÀÐ¢6Æ7VÆFU6V7F–öã57VvvW7FVD‡ÀÐ¢f÷&ÖE6V7F–öã4‡&öÆÇ2ÀÐ¢'6U6V7F–öã4‡&öÆÇ2ÀÐ¢7&VFU6V7F–öã4‡&öÆÅ&V6÷&BÀÐ¢vWE6V7F–öã4‡&öÆÅ7FFRÀÐ¢6WE6V7F–öã4‡&öÆÅfÇVRÀÐ¢&VæFW%6V7F–öã5&öÆÆVD‡–çWG2ÀÐ¢Ç•6V7F–öã57VvvW7FVD‡ÀÐ¢&Vg&W6…6V7F–öã4ÆWfVÅ&öw&W76–öâÀÐ¢&VæFW%6V7F–öã4†—DF–6RÀÐ¢&VæFW%6V7F–öã4‡wV–FRÀÐ¢&VæFW%6V7F–öã4&Ö÷$6Æ74wV–FRÀÐ¢&VæFW$ÆWfVÅ7FWÀÐ¢&VæFW%6V7F–öã4ÖçVÄ&–Æ—F–W2ÀÐ¢&VæFW%6V7F–öã57FæF&D'&’ÀÐ¢&VæFW%6V7F–öã5ö–çD'W’ÀÐ¢&VæFW%6V7F–öã5&öÆÆVD&–Æ—F–W2ÀÐ¢&VæFW%6V7F–öã4&–Æ—G•7VÖÖ'’ÀÐ¢&VæFW%6V7F–öã4ÖV6†æ–74wV–FRÀÐ¢&VæFW%6V7F–öã4FW&—fVDÖV6†æ–72ÀÐ¢&Vg&W6…6V7F–öã4&–Æ—G•7VÖÖ'’ÀÐ¢&VæFW$&–Æ—F–W57FWÀÐ¢f–æE6V7F–öã47F–öäVÆVÖVçBÀÐ¢†æFÆU6V7F–öã5&Vg&W6„ÆWfVÂÀÐ¢†æFÆU6V7F–öã46Æ7VÆFT‡ÀÐ¢†æFÆU6V7F–öã5&W6WE7FæF&D'&’ÀÐ¢†æFÆU6V7F–öã5ö–çD'W’ÀÐ¢†æFÆU6V7F–öã5&W6WEö–çD'W’ÀÐ¢†æFÆU6V7F–öã5&öÆÅ66÷&W2ÀÐ¢†æFÆU6V7F–öã4Ç•&öÆÇ2ÀÐ¢†æFÆU6V7F–öã46†ævRÀÐ¢—56V7F–öãt&–Æ—F–W46ö×ÆWFPÐ¢ÒÒ&–Æ—F–W57FWæ6ö×F–&–Æ—G“°Ð Ð¢&Vv—7FW$6†&7FW%7FW&VæFW&W"€Ð¢&ÆWfVÂ"ÀÐ¢&–Æ—F–W57FWç&VæFW$ÆWfVÅ7FW Ð¢“°Ð Ð¢&Vv—7FW$6†&7FW%7FW&VæFW&W"€Ð¢&&–Æ—F–W2"ÀÐ¢&–Æ—F–W57FWç&VæFW%7FW Ð¢“°Ð Ð¢&–Æ—F–W57FWæ7F–öç2æf÷$V6‚‚†7F–öâ’Óâ°Ð¢&Vv—7FW$6†&7FW$7&VF÷$7F–öâ†7F–öâÂ†6öçFW‡B’Óâ°Ð¢&WGW&â&–Æ—F–W57FWæ†æFÆU7FW6Æ–6²†6öçFW‡B“°Ð¢Ò“°Ð¢Ò“°Ð Ð¢&Vv—7FW$6†&7FW$7&VF÷$–çWD†æFÆW"€Ð¢&–Æ—F–W57FWæ†æFÆU7FW–çW@Ð¢“°Ð Ð¢&Vv—7FW$6†&7FW$7&VF÷$6†ævT†æFÆW"€Ð¢&–Æ—F–W57FWæ†æFÆU7FW6†ævPÐ¢“°Ð Ð¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÐÐ¢òò4„$5DU"5$TDõ"4T5D”ôâB(	B$4´u$õTäBò$ôd”4”Tä4”U0Ð¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÐÐ Ð¢gVæ7F–öâ'6U6V7F–öãDÆ—7B‡fÇVR’°Ð¢&WGW&â7G&–ær‡fÇVRÇÂ""Ð¢ç7Æ—B‚õµÆâÅÒ²òÐ¢æÖ‚†—FVÒ’Óâ—FVÒçG&–Ò‚’Ð¢æf–ÇFW"„&ööÆVâ“°Ð¢ÐÐ Ð¢gVæ7F–öâf÷&ÖE6V7F–öãDÆ—7B‡fÇVR’°Ð¢&WGW&â'&’æ—4'&’‡fÇVRÐ¢òfÇVRæ¦ö–â‚"Â"Ð¢¢"#°Ð¢ÐÐ Ð¢6öç7B&6¶w&÷VæE7FWÒ7&VFT&6¶w&÷VæE7FW‡°Ð¢6†&VE6W'f–6W3¢6†&VE7FW6W'f–6W2ÀÐ¢%D•4åõDôôÅôõD”ôå2ÀÐ¢5U%$Tä5•ôDTäôÔ”äD”ôå2ÀÐ¢DTdTÅEô$4´u$õTäEôUT•ÔTåEõ4´tU2ÀÐ¢DTdTÅEô$4´u$õTäEõDTÕÄDU2ÀÐ¢tÔ”äuõ4UEôõD”ôå2ÀÐ¢tTäU$ÅõDôôÅôõD”ôå2ÀÐ¢ÕU4”4Åô”å5E%TÔTåEôõD”ôå2ÀÐ¢5DäD$EôÄäuTtUôõD”ôå2ÀÐ¢FD7W'&Væ7”Ö2ÀÐ¢6÷VçE6V7F–öãEfÆ–E6¶–ÆÅ6÷W&6S¢‚ââæ&w2’Óâ°Ð¢&WGW&â6¶–ÆÇ57FWæ6ö×F–&–Æ—G’æ6÷VçE6V7F–öãEfÆ–E6¶–ÆÅ6÷W&6R‚ââæ&w2“°Ð¢ÒÀÐ¢Vç7W&TWV—ÖVçD7W'&Væ7•6÷W&6W2ÀÐ¢Vç7W&U&öf–6–Væ7•6÷W&6W2ÀÐ¢f–æE6V7F–öãD7F–öäVÆVÖVçC¢‚ââæ&w2’Óâ°Ð¢&WGW&â6¶–ÆÇ57FWæ6ö×F–&–Æ—G’æf–æE6V7F–öãD7F–öäVÆVÖVçB‚ââæ&w2“°Ð¢ÒÀÐ¢f÷&ÖE6V7F–öãDÆ—7BÀÐ¢vWD&6¶w&÷VæE6÷W&6TÆ&VÂÀÐ¢vWDÆVv7“#DÖWFFFÀÐ¢vWDÖçVÄ7W'&Væ7”&Ææ6RÀÐ¢vWE6fT&6¶w&÷VæDæÖRÀÐ¢vWE6V7F–öãT6FÆörÀÐ¢vWE6V7F–öãT–çfVçF÷'’ÀÐ¢vWE7F÷&VE6÷W&6W2ÀÐ¢†47W'&Væ7•fÇVRÀÐ¢—47F—fU'VÆW6WDVçG'’ÀÐ¢Ö¶U6fT–BÀÐ¢æ÷&ÖÆ—¦T7W'&Væ7”ÖÀÐ¢æ÷&ÖÆ—¦U6V7F–öãT—FVÒÀÐ¢æ÷&ÖÆ—¦U7V6–W4&6¶w&÷VæD6†ö–6W2ÀÐ¢'6U6V7F–öãDÆ—7BÀÐ¢&VÖ÷fTÆ—7E&öf–6–Væ7•6÷W&6RÀÐ¢&VÖ÷fU6¶–ÆÅ&öf–6–Væ7•6÷W&6RÀÐ¢&VæFW$6FÆötVçG'”FWF–Ç2ÀÐ¢&VæFW$FW67&—F–öå7F÷'”f–VÆG2ÀÐ¢&VæFW$gVÆÄ6FÆötFW67&—F–öâÀÐ¢&VæFW%'VÆW6WDÖWFFFÀÐ¢&VæFW%6V7F–öãDW‡W'F—6T6†ö–6W3¢‚ââæ&w2’Óâ°Ð¢&WGW&â6¶–ÆÇ57FWæ6ö×F–&–Æ—G’ç&VæFW%6V7F–öãDW‡W'F—6T6†ö–6W2‚ââæ&w2“°Ð¢ÒÀÐ¢&VæFW%6V7F–öãE&öf–6–Væ7”wV–FS¢‚ââæ&w2’Óâ°Ð¢&WGW&â6¶–ÆÇ57FWæ6ö×F–&–Æ—G’ç&VæFW%6V7F–öãE&öf–6–Væ7”wV–FR‚ââæ&w2“°Ð¢ÒÀÐ¢&VæFW%6V7F–öãE6÷W&6U6¶–ÆÄ6†ö–6W3¢‚ââæ&w2’Óâ°Ð¢&WGW&â6¶–ÆÇ57FWæ6ö×F–&–Æ—G’ç&VæFW%6V7F–öãE6÷W&6U6¶–ÆÄ6†ö–6W2‚ââæ&w2“°Ð¢ÒÀÐ¢6WE6÷W&6U&öf–6–Væ7”Æ—7BÀÐ¢7–æ4WV—ÖVçD7W'&Væ7”g&öÕ6÷W&6W0Ð¢Ò“°Ð Ð¢6öç7B°Ð¢æ÷&ÖÆ—¦U6V7F–öãD&6¶w&÷VæBÀÐ¢vWDÆÅ6V7F–öãD&6¶w&÷VæG2ÀÐ¢vWE6VÆV7FVE6V7F–öãD&6¶w&÷VæBÀÐ¢vWE6V7F–öãD&6¶w&÷VæD6†ö–6TÆ—7BÀÐ¢6WE6V7F–öãD&6¶w&÷VæD6†ö–6TÆ—7BÀÐ¢vWE6V7F–öãDÆÄW†7EFööÄ÷F–öç2ÀÐ¢W‡æE6V7F–öãEFööÄ6†ö–6RÀÐ¢vWE6V7F–öãD&6¶w&÷VæEFööÄ÷F–öç2ÀÐ¢vWE6V7F–öãD&6¶w&÷VæEFööÄ÷F–öç4f÷$–æFW‚ÀÐ¢vWE6V7F–öãD&6¶w&÷VæDÆæwVvT÷F–öç2ÀÐ¢6÷VçE6V7F–öãD&6¶w&÷VæE6÷W&6TÆ—7BÀÐ¢vWE6V7F–öãD&6¶w&÷VæE6÷W&6UfÇVW2ÀÐ¢6÷VçE6V7F–öãEfÆ–D&6¶w&÷VæEFööÄ6†ö–6W2ÀÐ¢Ç•6V7F–öãD&6¶w&÷VæD6†ö–6W2ÀÐ¢vWE6V7F–öãD&6¶w&÷VæE6¶vW2ÀÐ¢&VÖ÷fU6V7F–öãD&6¶w&÷VæDWV—ÖVçBÀÐ¢vWE6V7F–öãD&6¶w&÷VæD7W'&Væ7”w&çBÀÐ¢†56V7F–öãD&6¶w&÷VæD7W'&Væ7’ÀÐ¢f÷&ÖE6V7F–öãD7W'&Væ7•7VÖÖ'’ÀÐ¢vWE6V7F–öãD&6¶w&÷VæE&VÖ÷fÅ7VÖÖ'’ÀÐ¢FE6V7F–öãD&6¶w&÷VæD7W'&Væ7’ÀÐ¢&VÖ÷fU6V7F–öãD&6¶w&÷VæD7W'&Væ7’ÀÐ¢†æFÆU6V7F–öãDöÆD&6¶w&÷VæDWV—ÖVçBÀÐ¢Ç•6V7F–öãD&6¶w&÷VæE6¶vRÀÐ¢6†ö÷6U6V7F–öãD&6¶w&÷VæBÀÐ¢6¶—6V7F–öãD&6¶w&÷VæBÀÐ¢Ç•6V7F–öãD7W7FöÔ&6¶w&÷VæBÀÐ¢7–æ56V7F–öãD&6¶w&÷VæDfVGW&W2ÀÐ¢FE6V7F–öãD&6¶w&÷VæDfVGW&RÀÐ¢&VÖ÷fU6V7F–öãD&6¶w&÷VæDfVGW&RÀÐ¢&VæFW$&6¶w&÷VæE7FWÀÐ¢†æFÆU6V7F–öãD6†ö÷6T&6¶w&÷VæBÀÐ¢†æFÆU6V7F–öãE6¶—&6¶w&÷VæBÀÐ¢†æFÆU6V7F–öãD7W7FöÔ&6¶w&÷VæBÀÐ¢†æFÆU6V7F–öãDÇ”&6¶w&÷VæD6†ö–6W2ÀÐ¢†æFÆU6V7F–öãDÇ”&6¶w&÷VæE6¶vRÀÐ¢†æFÆU6V7F–öãDFDfVGW&RÀÐ¢†æFÆU6V7F–öãE&VÖ÷fTfVGW&RÀÐ¢—56V7F–öãt&6¶w&÷VæD6ö×ÆWFPÐ¢ÒÒ&6¶w&÷VæE7FWæ6ö×F–&–Æ—G“°Ð Ð¢6öç7B6¶–ÆÇ57FWÒ7&VFU6¶–ÆÇ57FW‡°Ð¢6†&VE6W'f–6W3¢6†&VE7FW6W'f–6W2ÀÐ¢4´”ÄÅôDTd”ä•D”ôå2ÀÐ¢6Æ7VÆFT&–Æ—G”ÖöF–f–W"ÀÐ¢f÷&ÖE6V7F–öãDÆ—7BÀÐ¢vWD&6¶w&÷VæE6÷W&6TÆ&VÂÀÐ¢vWD6†&7FW%&öf–6–Væ7”&öçW2ÀÐ¢vWD6Æ756÷W&6TÆ&VÂÀÐ¢vWDÖçVÅ&öf–6–Væ7”Æ—7BÀÐ¢vWE&–Ö'”6Æ74VçG'’ÀÐ¢vWE6VÆV7FVD6Æ75FV×ÆFRÀÐ¢vWE6VÆV7FVE6V7F–öãD&6¶w&÷VæBÀÐ¢—4×VÇF–6Æ74G&gBÀÐ¢—56V7F–öãt6Æ746ö×ÆWFRÀÐ¢'6U6V7F–öãDÆ—7BÀÐ¢6WDÖçVÅ&öf–6–Væ7”Æ—7@Ð¢Ò“°Ð Ð¢6öç7B°Ð¢vWE6V7F–öãE6¶–ÆÄVçG'’ÀÐ¢vWE6V7F–öãE6¶–ÆÅ6÷W&6TÆ&VÂÀÐ¢vWE6V7F–öãE6¶–ÆÄ6†ö–6TÆ—7BÀÐ¢6WE6V7F–öãE7F÷&VE6¶–ÆÄ6†ö–6RÀÐ¢6÷VçE6V7F–öãE6¶–ÆÅ6÷W&6RÀÐ¢6÷VçE6V7F–öãEfÆ–E6¶–ÆÅ6÷W&6RÀÐ¢6WE6V7F–öãE6¶–ÆÄVçG'’ÀÐ¢FövvÆU6V7F–öãE6¶–ÆÂÀÐ¢FövvÆU6V7F–öãDW‡W'F—6RÀÐ¢vWE6V7F–öãE6¶–ÆÄÖöF–f–W"ÀÐ¢Ç•6V7F–öãE&öf–6–Væ7”Æ—7G2ÀÐ¢&VæFW%6V7F–öãE&öf–6–Væ7”wV–FRÀÐ¢&VæFW%6V7F–öãE6÷W&6U6¶–ÆÄ6†ö–6W2ÀÐ¢&VæFW%6V7F–öãDW‡W'F—6T6†ö–6W2ÀÐ¢&VæFW%6¶–ÆÇ57FWÀÐ¢f–æE6V7F–öãD7F–öäVÆVÖVçBÀÐ¢†æFÆU6V7F–öãEFövvÆU6¶–ÆÂÀÐ¢†æFÆU6V7F–öãEFövvÆTW‡W'F—6RÀÐ¢†æFÆU6V7F–öãDÇ”Æ—7G2ÀÐ¢—56V7F–öãu6¶–ÆÇ46ö×ÆWFPÐ¢ÒÒ6¶–ÆÇ57FWæ6ö×F–&–Æ—G“°Ð Ð¢&Vv—7FW$6†&7FW%7FW&VæFW&W"€Ð¢&&6¶w&÷VæB"ÀÐ¢&6¶w&÷VæE7FWç&VæFW%7FW Ð¢“°Ð Ð¢&Vv—7FW$6†&7FW%7FW&VæFW&W"€Ð¢'6¶–ÆÇ2"ÀÐ¢6¶–ÆÇ57FWç&VæFW%7FW Ð¢“°Ð Ð¢&6¶w&÷VæE7FWæ7F–öç2æf÷$V6‚‚†7F–öâ’Óâ°Ð¢&Vv—7FW$6†&7FW$7&VF÷$7F–öâ†7F–öâÂ†6öçFW‡B’Óâ°Ð¢&WGW&â&6¶w&÷VæE7FWæ†æFÆU7FW6Æ–6²†6öçFW‡B“°Ð¢Ò“°Ð¢Ò“°Ð Ð¢&Vv—7FW$6†&7FW$7&VF÷$–çWD†æFÆW"€Ð¢&6¶w&÷VæE7FWæ†æFÆU7FW–çW@Ð¢“°Ð Ð¢&Vv—7FW$6†&7FW$7&VF÷$6†ævT†æFÆW"€Ð¢&6¶w&÷VæE7FWæ†æFÆU7FW6†ævPÐ¢“°Ð Ð¢6¶–ÆÇ57FWæ7F–öç2æf÷$V6‚‚†7F–öâ’Óâ°Ð¢&Vv—7FW$6†&7FW$7&VF÷$7F–öâ†7F–öâÂ†6öçFW‡B’Óâ°Ð¢&WGW&â6¶–ÆÇ57FWæ†æFÆU7FW6Æ–6²†6öçFW‡B“°Ð¢Ò“°Ð¢Ò“°Ð Ð¢&Vv—7FW$6†&7FW$7&VF÷$–çWD†æFÆW"€Ð¢6¶–ÆÇ57FWæ†æFÆU7FW–çW@Ð¢“°Ð Ð¢&Vv—7FW$6†&7FW$7&VF÷$6†ævT†æFÆW"€Ð¢6¶–ÆÇ57FWæ†æFÆU7FW6†ævPÐ¢“°Ð Ð¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÐÐ¢òò4„$5DU"5$TDõ"4T5D”ôâR(	BUT•ÔTåBò”ådTåDõ%Ð¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÐÐ Ð¢gVæ7F–öâvWE7VÆÆ67F–ætfö7W46Æ74–G2€Ð¢—FVÒÀÐ¢7VÆÆ67F–æt6Æ76W2ÒµÐÐ¢’°Ð¢6öç7BW‡Æ–6—D6Æ74–G2ÐÐ¢Væ—VT6ÆVä'&’€Ð¢—FVÓòç7VÆÆ67F–ætfö7W46Æ74–G2ÇÀÐ¢—FVÓòæfö7W46Æ74–G0Ð¢’æÖ‚†6Æ74–B’Óâ°Ð¢&WGW&âÖ¶U6fT–B†6Æ74–BÂ&6Æ72"“°Ð¢Ò“°Ð Ð¢–b†W‡Æ–6—D6Æ74–G2æÆVæwF‚’°Ð¢&WGW&âW‡Æ–6—D6Æ74–G3°Ð¢ÐÐ Ð¢6öç7Bfö7W5FW‡BÐÐ¢G¶6ÆVå7G&–ær†—FVÓòæ6FVv÷'’—ÒG¶6ÆVå7G&–ær†—FVÓòææÖR—ÖçFôÆ÷vW$66R‚“°Ð¢6öç7B6FVv÷'•FW‡BÐÐ¢6ÆVå7G&–ær†—FVÓòæ6FVv÷'’’çFôÆ÷vW$66R‚“°Ð Ð¢–b†fö7W5FW‡Bæ–æ6ÇVFW2‚&6ö×öæVçB÷V6‚"’’°Ð¢&WGW&âVæ—VT6ÆVä'&’€Ð¢7VÆÆ67F–æt6Æ76W2æÖ‚†VçG'’’Óâ°Ð¢&WGW&âVçG'“òæ6Æ74–C°Ð¢ÒÐ¢“°Ð¢ÐÐ Ð¢–b€Ð¢fö7W5FW‡Bæ–æ6ÇVFW2‚&G'V–F–2fö7W2"’ÇÀÐ¢fö7W5FW‡Bæ–æ6ÇVFW2‚'7&–röbÖ—7FÆWFöR"’ÇÀÐ¢fö7W5FW‡Bæ–æ6ÇVFW2‚'F÷FVÒ"’ÇÀÐ¢fö7W5FW‡Bæ–æ6ÇVFW2‚'vööFVâ7Ffb"’ÇÀÐ¢fö7W5FW‡Bæ–æ6ÇVFW2‚'–WrvæB"Ð¢’°Ð¢&WGW&â²&G'V–B%Ó°Ð¢ÐÐ Ð¢–b€Ð¢fö7W5FW‡Bæ–æ6ÇVFW2‚&&6æRfö7W2"’ÇÀÐ¢€Ð¢6FVv÷'•FW‡Bæ–æ6ÇVFW2‚&fö7W2"’b`Ð¢õÆ"†7'—7FÇÆ÷&'Ç&öGÇ7FfgÇvæB•Æ"öÐ¢çFW7B†fö7W5FW‡BÐ¢Ð¢’°Ð¢&WGW&â°Ð¢'6÷&6W&W""ÀÐ¢'v&Æö6²"ÀÐ¢'v—¦&B Ð¢Ó°Ð¢ÐÐ Ð¢–b€Ð¢fö7W5FW‡Bæ–æ6ÇVFW2‚&†öÇ’7–Ö&öÂ"’ÇÀÐ¢fö7W5FW‡Bæ–æ6ÇVFW2‚&×VÆWB"’ÇÀÐ¢fö7W5FW‡Bæ–æ6ÇVFW2‚&VÖ&ÆVÒ"’ÇÀÐ¢fö7W5FW‡Bæ–æ6ÇVFW2‚'&VÆ—V'’"Ð¢’°Ð¢&WGW&â²&6ÆW&–2"Â'ÆF–â%Ó°Ð¢ÐÐ Ð¢–b€Ð¢fö7W5FW‡Bæ–æ6ÇVFW2‚&×W6–6Â–ç7G'VÖVçB"’ÇÀÐ¢õÆ"†ÇWFWÆÇ—&WÆfÇWFWÆ†÷&çÆG'V×ÆGVÆ6–ÖW'Çf–öÇÆ&w—W7Ç6†vÒ•Æ"öÐ¢çFW7B†fö7W5FW‡BÐ¢’°Ð¢&WGW&â²&&&B%Ó°Ð¢ÐÐ Ð¢–b€Ð¢fö7W5FW‡Bæ–æ6ÇVFW2‚&'F—6â"’ÇÀÐ¢fö7W5FW‡Bæ–æ6ÇVFW2‚'F†–WfW2rFööÇ2"’ÇÀÐ¢fö7W5FW‡Bæ–æ6ÇVFW2‚'F†–WfW2FööÇ2"’ÇÀÐ¢—FVÓòæ–ægW6VBÓÓÒG'VRÇÀÐ¢6ÆVå7G&–ær†—FVÓòæ–ægW6–öä–BÐ¢’°Ð¢&WGW&â²&'F–f–6W"%Ó°Ð¢ÐÐ Ð¢&WGW&âµÓ°Ð¢ÐÐ Ð¢gVæ7F–öâvWE7VÆÆ67F–ætfö7W57VÖÖ'’€Ð¢6†&7FW Ð¢’°Ð¢6öç7B7VÆÆ67F–æt6Æ76W2ÐÐ¢vWE7VÆÆ67F–æt6Æ74÷F–öç2†6†&7FW"“°Ð¢6öç7B–çfVçF÷'’ÐÐ¢'&’æ—4'&’€Ð¢6†&7FW#òæWV—ÖVçCòæ—FV×0Ð¢Ð¢ò6†&7FW"æWV—ÖVçBæ—FV×0Ð¢¢µÓ°Ð Ð¢&WGW&â7VÆÆ67F–æt6Æ76W2æÖ‚†VçG'’’Óâ°Ð¢6öç7B6Æ74–BÒ6ÆVå7G&–ær€Ð¢VçG'’æ6Æ74–@Ð¢“°Ð¢6öç7Bfö7W6W2ÐÐ¢–çfVçF÷'’æf–ÇFW"‚†—FVÒ’Óâ°Ð¢&WGW&â€Ð¢6ÆVå7G&–ær†—FVÓòæ6öçF–æW$–B’b`Ð¢vWE7VÆÆ67F–ætfö7W46Æ74–G2€Ð¢—FVÒÀÐ¢7VÆÆ67F–æt6Æ76W0Ð¢’æ–æ6ÇVFW2†6Æ74–BÐ¢“°Ð¢Ò“°Ð Ð¢&WGW&â°Ð¢6Æ74VçG'”–C Ð¢vWE6V7F–öãe6÷W&6T¶W’†VçG'’’ÀÐ¢6Æ74–BÀÐ¢6Æ74æÖS Ð¢6ÆVå7G&–ær€Ð¢VçG'’æ6Æ74æÖRÀÐ¢6Æ74–@Ð¢’ÀÐ¢fö7W6W3¢fö7W6W2æÖ‚†—FVÒ’Óâ°Ð¢&WGW&â°Ð¢–C¢6ÆVå7G&–ær†—FVÒæ–B’ÀÐ¢æÖS¢6ÆVå7G&–ær€Ð¢—FVÒææÖRÀÐ¢%7VÆÆ67F–ærfö7W2 Ð¢Ð¢Ó°Ð¢ÒÐ¢Ó°Ð¢Ò“°Ð¢ÐÐ Ð¢gVæ7F–öâæ÷&ÖÆ—¦U6V7F–öãT—FVÒ€Ð¢&t—FVÒÀÐ¢fÆÆ&6µ6÷W&6RÒ&7W7FöÒ Ð¢’°Ð¢6öç7B°Ð¢&rÀÐ¢æÖRÀÐ¢6FVv÷'’ÀÐ¢VçF—G’ÀÐ¢vV–v‡C¢&uvV–v‡BÀÐ¢—4Öv–6ÂÀÐ¢&WV—&W4GGVæVÖVçBÀÐ¢—46öçF–æW"ÀÐ¢66—G•vV–v‡@Ð¢ÒÒæ÷&ÖÆ—¦T–çfVçF÷'”—FVÔ&6R€Ð¢&t—FVÒÀÐ¢fÆÆ&6µ6÷W&6PÐ¢“°Ð Ð¢6öç7B&Ö÷$6FVv÷'’ÐÐ¢6ÆVå7G&–ær€Ð¢&ræ&Ö÷$6FVv÷'’ÇÀÐ¢€Ð¢&ræ—56†–VÆBÓÓÒG'VRÇÀÐ¢6FVv÷'’çFôÆ÷vW$66R‚’ÓÓÒ'6†–VÆB Ð¢ò'6†–VÆB Ð¢¢6FVv÷'’çFôÆ÷vW$66R‚’ÓÓÒ&&Ö÷" Ð¢ò&Æ–v‡B&Ö÷" Ð¢¢" Ð¢Ð¢“°Ð Ð¢6öç7B&6T&Ö÷$6Æ72ÐÐ¢&ræ&6T&Ö÷$6Æ72ÓÓÒçVÆÂÇÀÐ¢&ræ&6T&Ö÷$6Æ72ÓÓÒVæFVf–æVBÇÀÐ¢&ræ&6T&Ö÷$6Æ72ÓÓÒ" Ð¢òçVÆÀÐ¢¢ÖF‚æÖ‚€Ð¢ÀÐ¢6fTçVÖ&W"€Ð¢&ræ&6T&Ö÷$6Æ72ÀÐ¢ Ð¢Ð¢“°Ð Ð¢6öç7BFW‡FW&—G”6ÐÐ¢&ræFW‡FW&—G”6ÓÓÒçVÆÂÇÀÐ¢&ræFW‡FW&—G”6ÓÓÒVæFVf–æVBÇÀÐ¢&ræFW‡FW&—G”6ÓÓÒ" Ð¢òçVÆÀÐ¢¢6fTçVÖ&W"€Ð¢&ræFW‡FW&—G”6ÀÐ¢ Ð¢“°Ð Ð¢6öç7B—56†–VÆBÐÐ¢&ræ—56†–VÆBÓÓÒG'VRÇÀÐ¢6FVv÷'’çFôÆ÷vW$66R‚’ÓÓÒ'6†–VÆB"ÇÀÐ¢&Ö÷$6FVv÷'’çFôÆ÷vW$66R‚’ÓÓÒ'6†–VÆB#°Ð Ð¢6öç7BÆVv7”Öv–6Ä&öçW2ÐÐ¢6fTçVÖ&W"€Ð¢&ræÖv–6Ä&öçW2ÀÐ¢ Ð¢“°Ð Ð¢6öç7BÆVv7”&öçW4Æöö·4&Ö÷"ÐÐ¢ÆVv7”Öv–6Ä&öçW2ÓÒb`Ð¢€Ð¢—56†–VÆBÇÀÐ¢&6T&Ö÷$6Æ72ÓÒçVÆÂÇÀÐ¢6FVv÷'’çFôÆ÷vW$66R‚’ÓÓÒ&&Ö÷" Ð¢“°Ð Ð¢6öç7BÆVv7”&öçW4Æöö·5vVöâÐÐ¢ÆVv7”Öv–6Ä&öçW2ÓÒb`Ð¢€Ð¢6FVv÷'’çFôÆ÷vW$66R‚’ÓÓÒ'vVöâ"ÇÀÐ¢6ÆVå7G&–ær‡&rçvVöåG—R’ÇÀÐ¢6ÆVå7G&–ær‡&ræFÖvTF–6RÐ¢“°Ð Ð¢&WGW&â°Ð¢ââæ6ÆöæTFF‡&r’ÀÐ Ð¢–C¢Ö¶U6fT–B€Ð¢&ræ–BÇÀÐ¢G¶æÖWÒÒG´FFRææ÷r‚—ÒÒG´ÖF‚ç&æFöÒ‚—ÖÀÐ¢&–çfVçF÷'’Ö—FVÒ Ð¢’ÀÐ Ð¢æÖRÀÐ Ð¢6FVv÷'’ÀÐ Ð¢VçF—G’ÀÐ Ð¢vV–v‡C¢&uvV–v‡BÀÐ Ð¢6÷W&6S Ð¢6fTF—7Æ•7G&–ær€Ð¢&rç6÷W&6RÀÐ¢fÆÆ&6µ6÷W&6PÐ¢’ÀÐ Ð¢æ÷FW3 Ð¢6fTF—7Æ•7G&–ær€Ð¢&rææ÷FW0Ð¢’ÀÐ Ð¢WV—VC Ð¢&ræWV—VBÓÓÒG'VRb`Ð¢6ÆVå7G&–ær‡&ræ6öçF–æW$–B’b`Ð¢—46öçF–æW"ÓÒG'VRÀÐ Ð¢—4Öv–6ÂÀÐ Ð¢&WV—&W4GGVæVÖVçBÀÐ Ð¢GGVæVC Ð¢&WV—&W4GGVæVÖVçBb`Ð¢&ræGGVæVBÓÓÒG'VRb`Ð¢6ÆVå7G&–ær‡&ræ6öçF–æW$–B’b`Ð¢—46öçF–æW"ÓÒG'VRÀÐ Ð¢Öv–6Ä&öçW3 Ð¢6fTçVÖ&W"€Ð¢&ræÖv–6Ä&öçW2ÀÐ¢ Ð¢’ÀÐ Ð¢&Ö÷$6FVv÷'’ÀÐ Ð¢&6T&Ö÷$6Æ72ÀÐ Ð¢FW‡FW&—G”6ÀÐ Ð¢—56†–VÆBÀÐ Ð¢Öv–6Ä&Ö÷$6Æ74&öçW3 Ð¢6fTçVÖ&W"€Ð¢&ræÖv–6Ä&Ö÷$6Æ74&öçW2óðÐ¢€Ð¢ÆVv7”&öçW4Æöö·4&Ö÷ Ð¢òÆVv7”Öv–6Ä&öçW0Ð¢¢ Ð¢’ÀÐ¢ Ð¢’ÀÐ Ð¢vVöåG—S Ð¢6ÆVå7G&–ær‡&rçvVöåG—R’ÀÐ Ð¢GF6´&–Æ—G“ Ð¢6ÆVå7G&–ær‡&ræGF6´&–Æ—G’’ÀÐ Ð¢f–æW76S Ð¢&ræf–æW76RÓÓÒG'VRÀÐ Ð¢&ævVC Ð¢&rç&ævVBÓÓÒG'VRÇÀÐ¢6ÆVå7G&–ær‡&rçvVöåG—RÐ¢çFôÆ÷vW$66R‚Ð¢æ–æ6ÇVFW2‚'&ævVB"’ÀÐ Ð¢F‡&÷vã Ð¢&rçF‡&÷vâÓÓÒG'VRÀÐ Ð¢&öf–6–VçC Ð¢&rç&öf–6–VçBÓÓÒG'VRÀÐ Ð¢FÖvTF–6S Ð¢6ÆVå7G&–ær‡&ræFÖvTF–6R’ÀÐ Ð¢fW'6F–ÆTFÖvTF–6S Ð¢6ÆVå7G&–ær‡&rçfW'6F–ÆTFÖvTF–6R’ÀÐ Ð¢Öv–6ÄGF6´&öçW3 Ð¢6fTçVÖ&W"€Ð¢&ræÖv–6ÄGF6´&öçW2óðÐ¢€Ð¢ÆVv7”&öçW4Æöö·5vVöàÐ¢òÆVv7”Öv–6Ä&öçW0Ð¢¢ Ð¢’ÀÐ¢ Ð¢’ÀÐ Ð¢Öv–6ÄFÖvT&öçW3 Ð¢6fTçVÖ&W"€Ð¢&ræÖv–6ÄFÖvT&öçW2óðÐ¢€Ð¢ÆVv7”&öçW4Æöö·5vVöàÐ¢òÆVv7”Öv–6Ä&öçW0Ð¢¢ Ð¢’ÀÐ¢ Ð¢’ÀÐ Ð¢6öçF–æW$–C Ð¢6ÆVå7G&–ær‡&ræ6öçF–æW$–B’ÀÐ Ð¢—46öçF–æW"ÀÐ Ð¢66—G•vV–v‡BÀÐ Ð¢7VÆÆ67F–ætfö7W46Æ74–G3 Ð¢vWE7VÆÆ67F–ætfö7W46Æ74–G2‡&r’ÀÐ Ð¢÷væW$6†&7FW$–C Ð¢6ÆVå7G&–ær‡&ræ÷væW$6†&7FW$–BÐ¢Ó°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öãT–çfVçF÷'’‚’°Ð¢–b€Ð¢'&’æ—4'&’€Ð¢7&VF÷%7FFRæG&g@Ð¢æWV—ÖVç@Ð¢æ—FV×0Ð¢Ð¢’°Ð¢7&VF÷%7FFRæG&g@Ð¢æWV—ÖVç@Ð¢æ—FV×2ÒµÓ°Ð¢ÐÐ Ð¢7&VF÷%7FFRæG&g@Ð¢æWV—ÖVç@Ð¢æ—FV×2ÐÐ¢7&VF÷%7FFRæG&g@Ð¢æWV—ÖVç@Ð¢æ—FV×0Ð¢æÖ‚†—FVÒ’Óâ°Ð¢&WGW&âæ÷&ÖÆ—¦U6V7F–öãT—FVÒ€Ð¢—FVÒÀÐ¢—FVÓòç6÷W&6RÇÂ&7W7FöÒ Ð¢“°Ð¢Ò“°Ð Ð¢&WGW&â7&VF÷%7FFRæG&g@Ð¢æWV—ÖVç@Ð¢æ—FV×3°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öãT6FÆör‚’°Ð¢6öç7B6FÆötÖÐÐ¢æWrÖ‚“°Ð Ð¢DTdTÅEôUT•ÔTåEô4DÄôpÐ¢æf÷$V6‚‚†—FVÒ’Óâ°Ð¢6öç7Bæ÷&ÖÆ—¦VBÐÐ¢æ÷&ÖÆ—¦U6V7F–öãT—FVÒ€Ð¢—FVÒÀÐ¢'FV×ÆFR Ð¢“°Ð Ð¢6FÆötÖç6WB€Ð¢æ÷&ÖÆ—¦VBæ–BÀÐ¢æ÷&ÖÆ—¦V@Ð¢“°Ð¢Ò“°Ð Ð¢&WGW&â'&’æg&öÒ€Ð¢6FÆötÖçfÇVW2‚Ð¢’ç6÷'B‚†Â"’Óâ°Ð¢6öç7B6FVv÷'”6ö×&RÐÐ¢æ6FVv÷'’æÆö6ÆT6ö×&R€Ð¢"æ6FVv÷'Ð¢“°Ð Ð¢–b†6FVv÷'”6ö×&RÓÒ’°Ð¢&WGW&â6FVv÷'”6ö×&S°Ð¢ÐÐ Ð¢&WGW&âææÖRæÆö6ÆT6ö×&R€Ð¢"ææÖPÐ¢“°Ð¢Ò“°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öãT6FÆöuvR€Ð¢÷F–öç2Ò·ÐÐ¢’°Ð¢&WGW&â7&VFT6FÆöuvR€Ð¢vWE6V7F–öãT6FÆör‚’ÀÐ¢°Ð¢VW'“¢÷F–öç2çVW'’ÀÐ¢f—6–&ÆTÆ–Ö—C Ð¢÷F–öç2çf—6–&ÆTÆ–Ö—BÇÀÐ¢5$TDõ%ô4DÄôuô$D4…õ4•¤RÀÐ¢vWD–C¢†—FVÒ’Óâ—FVÒæ–BÀÐ¢vWE6V&6…FW‡C¢†—FVÒ’Óâ°Ð¢&WGW&â°Ð¢—FVÒææÖRÀÐ¢—FVÒæ6FVv÷'’ÀÐ¢—FVÒææ÷FW0Ð¢Òæ¦ö–â‚""“°Ð¢ÐÐ¢ÐÐ¢“°Ð¢ÐÐ Ð¢gVæ7F–öâFE6V7F–öãT6FÆöt—FVÒ€Ð¢—FVÔ–@Ð¢’°Ð¢6öç7B—FVÒÐÐ¢vWE6V7F–öãT6FÆör‚Ð¢æf–æB‚†VçG'’’Óâ°Ð¢&WGW&âVçG'’æ–BÓÓÒ—FVÔ–C°Ð¢Ò“°Ð Ð¢–b‚—FVÒ’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢6öç7B–çfVçF÷'’ÐÐ¢vWE6V7F–öãT–çfVçF÷'’‚“°Ð Ð¢6öç7BÖF6†–æt—FVÒÐÐ¢–çfVçF÷'’æf–æB‚†VçG'’’Óâ°Ð¢&WGW&â€Ð¢VçG'’æ–BÓÓÒ—FVÒæ–BÇÀÐ¢€Ð¢6fTF—7Æ•7G&–ær€Ð¢VçG'’ææÖPÐ¢’çFôÆ÷vW$66R‚’ÓÓÐÐ¢—FVÒææÖRçFôÆ÷vW$66R‚’b`Ð¢6fTF—7Æ•7G&–ær€Ð¢VçG'’æ6FVv÷'Ð¢’çFôÆ÷vW$66R‚’ÓÓÐÐ¢—FVÒæ6FVv÷'’çFôÆ÷vW$66R‚Ð¢Ð¢“°Ð¢Ò“°Ð Ð¢–b†ÖF6†–æt—FVÒ’°Ð¢ÖF6†–æt—FVÒçVçF—G’ÐÐ¢ÖF‚æÖ‚€Ð¢ÀÐ¢ÖF‚ç&÷VæB€Ð¢6fTçVÖ&W"€Ð¢ÖF6†–æt—FVÒçVçF—G’ÀÐ¢Ð¢Ð¢Ð¢’°Ð¢ÖF‚æÖ‚€Ð¢ÀÐ¢ÖF‚ç&÷VæB€Ð¢6fTçVÖ&W"€Ð¢—FVÒçVçF—G’ÀÐ¢Ð¢Ð¢Ð¢“°Ð¢ÒVÇ6R°Ð¢–çfVçF÷'’çW6‚€Ð¢æ÷&ÖÆ—¦U6V7F–öãT—FVÒ€Ð¢—FVÒÀÐ¢'FV×ÆFR Ð¢Ð¢“°Ð¢ÐÐ Ð¢Ö&´G&gD6†ævVB‚“°Ð Ð¢&WGW&âG'VS°Ð¢ÐÐ Ð¢gVæ7F–öâFE6V7F–öãT7W7FöÔ—FVÒ‚’°Ð¢6öç7BæÖRÐÐ¢6fTF—7Æ•7G&–ær€Ð¢B‚&64æWt—FVÔæÖR"Ð¢òçfÇVPÐ¢“°Ð Ð¢–b‚æÖR’°Ð¢ÆW'B€Ð¢$VçFW"â—FVÒæÖRâ Ð¢“°Ð Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢6öç7BVçF—G’ÐÐ¢ÖF‚æÖ‚€Ð¢ÀÐ¢ÖF‚ç&÷VæB€Ð¢6fTçVÖ&W"€Ð¢B‚&64æWt—FVÕVçF—G’"Ð¢òçfÇVRÀÐ¢Ð¢Ð¢Ð¢“°Ð Ð¢6öç7BvV–v‡EFW‡BÐÐ¢B‚&64æWt—FVÕvV–v‡B"Ð¢òçfÇVS°Ð Ð¢6öç7BvV–v‡BÐÐ¢vV–v‡EFW‡BÓÓÒ""ÇÀÐ¢vV–v‡EFW‡BÓÓÒçVÆÂÇÀÐ¢vV–v‡EFW‡BÓÓÒVæFVf–æV@Ð¢òçVÆÀÐ¢¢ÖF‚æÖ‚€Ð¢ÀÐ¢6fTçVÖ&W"€Ð¢vV–v‡EFW‡BÀÐ¢ Ð¢Ð¢“°Ð Ð¢6öç7B66—G•FW‡BÐÐ¢B‚&64æWt—FVÔ66—G•vV–v‡B"Ð¢òçfÇVS°Ð Ð¢6öç7B66—G•vV–v‡BÐÐ¢66—G•FW‡BÓÓÒ""ÇÀÐ¢66—G•FW‡BÓÓÒçVÆÂÇÀÐ¢66—G•FW‡BÓÓÒVæFVf–æV@Ð¢òçVÆÀÐ¢¢ÖF‚æÖ‚€Ð¢ÀÐ¢6fTçVÖ&W"€Ð¢66—G•FW‡BÀÐ¢ Ð¢Ð¢“°Ð Ð¢6öç7B&6T&Ö÷$6Æ75FW‡BÐÐ¢B‚&64æWt—FVÔ&6T&Ö÷$6Æ72"Ð¢òçfÇVS°Ð Ð¢6öç7B&6T&Ö÷$6Æ72ÐÐ¢&6T&Ö÷$6Æ75FW‡BÓÓÒ""ÇÀÐ¢&6T&Ö÷$6Æ75FW‡BÓÓÒçVÆÂÇÀÐ¢&6T&Ö÷$6Æ75FW‡BÓÓÒVæFVf–æV@Ð¢òçVÆÀÐ¢¢ÖF‚æÖ‚€Ð¢ÀÐ¢6fTçVÖ&W"€Ð¢&6T&Ö÷$6Æ75FW‡BÀÐ¢ Ð¢Ð¢“°Ð Ð¢6öç7BFW‡FW&—G”6FW‡BÐÐ¢B‚&64æWt—FVÔFW‡FW&—G”6"Ð¢òçfÇVS°Ð Ð¢6öç7BFW‡FW&—G”6ÐÐ¢FW‡FW&—G”6FW‡BÓÓÒ""ÇÀÐ¢FW‡FW&—G”6FW‡BÓÓÒçVÆÂÇÀÐ¢FW‡FW&—G”6FW‡BÓÓÒVæFVf–æV@Ð¢òçVÆÀÐ¢¢6fTçVÖ&W"€Ð¢FW‡FW&—G”6FW‡BÀÐ¢ Ð¢“°Ð Ð¢6öç7B6FVv÷'’ÐÐ¢B‚&64æWt—FVÔ6FVv÷'’"Ð¢òçfÇVRÇÀÐ¢&Ö—66VÆÆæV÷W2#°Ð Ð¢6öç7B—4Öv–6ÂÐÐ¢B‚&64æWt—FVÔÖv–6Â"Ð¢òæ6†V6¶VBÓÓÒG'VRÇÀÐ¢6FVv÷'’ÓÓÒ&Öv–2Ö—FVÒ#°Ð Ð¢6öç7B&WV—&W4GGVæVÖVçBÐÐ¢—4Öv–6Âb`Ð¢B‚&64æWt—FVÕ&WV—&W4GGVæVÖVçB"Ð¢òæ6†V6¶VBÓÓÒG'VS°Ð¢6öç7B7F'G4GGVæVBÐÐ¢&WV—&W4GGVæVÖVçBb`Ð¢B‚&64æWt—FVÔGGVæVB"Ð¢òæ6†V6¶VBÓÓÒG'VS°Ð¢6öç7BGGVæVÖVçDÆ–Ö—BÐÐ¢vWD6†&7FW$GGVæVÖVçDÆ–Ö—B€Ð¢7&VF÷%7FFRæG&g@Ð¢“°Ð Ð¢–b€Ð¢7F'G4GGVæVBb`Ð¢vWE6V7F–öãTGGVæVD—FVÔ6÷VçB‚’ãÐÐ¢GGVæVÖVçDÆ–Ö—@Ð¢’°Ð¢ÆW'B€Ð¢F†—26†&7FW"6âGGVæRFòæòÖ÷&RF†âG¶GGVæVÖVçDÆ–Ö—GÒ°Ð¢G¶GGVæVÖVçDÆ–Ö—BÓÓÒò&—FVÒ"¢&—FV×2'Òæ Ð¢“°Ð Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢6öç7B—FVÒÐÐ¢æ÷&ÖÆ—¦U6V7F–öãT—FVÒ€Ð¢°Ð¢–C¢Ö¶U6fT–B€Ð¢G¶æÖWÒÒG´FFRææ÷r‚—ÒÒG´ÖF‚ç&æFöÒ‚—ÖÀÐ¢&7W7FöÒÖ—FVÒ Ð¢’ÀÐ Ð¢æÖRÀÐ Ð¢6FVv÷'’ÀÐ Ð¢VçF—G’ÀÐ¢vV–v‡BÀÐ¢66—G•vV–v‡BÀÐ Ð¢&Ö÷$6FVv÷'“ Ð¢B‚&64æWt—FVÔ&Ö÷$6FVv÷'’"Ð¢òçfÇVRÇÂ""ÀÐ Ð¢&6T&Ö÷$6Æ72ÀÐ Ð¢FW‡FW&—G”6ÀÐ Ð¢—56†–VÆC Ð¢B‚&64æWt—FVÕ6†–VÆB"Ð¢òæ6†V6¶VBÓÓÒG'VRÇÀÐ¢6FVv÷'’ÓÓÒ'6†–VÆB"ÀÐ Ð¢Öv–6Ä&Ö÷$6Æ74&öçW3 Ð¢6fTçVÖ&W"€Ð¢B‚&64æWt—FVÔÖv–6Ä&Ö÷$&öçW2"Ð¢òçfÇVRÀÐ¢ Ð¢’ÀÐ Ð¢vVöåG—S Ð¢B‚&64æWt—FVÕvVöåG—R"Ð¢òçfÇVRÇÂ""ÀÐ Ð¢GF6´&–Æ—G“ Ð¢B‚&64æWt—FVÔGF6´&–Æ—G’"Ð¢òçfÇVRÇÂ""ÀÐ Ð¢f–æW76S Ð¢B‚&64æWt—FVÔf–æW76R"Ð¢òæ6†V6¶VBÓÓÒG'VRÀÐ Ð¢&ævVC Ð¢B‚&64æWt—FVÕ&ævVB"Ð¢òæ6†V6¶VBÓÓÒG'VRÀÐ Ð¢F‡&÷vã Ð¢B‚&64æWt—FVÕF‡&÷vâ"Ð¢òæ6†V6¶VBÓÓÒG'VRÀÐ Ð¢&öf–6–VçC Ð¢B‚&64æWt—FVÕ&öf–6–VçB"Ð¢òæ6†V6¶VBÓÓÒG'VRÀÐ Ð¢FÖvTF–6S Ð¢B‚&64æWt—FVÔFÖvTF–6R"Ð¢òçfÇVRÇÂ""ÀÐ Ð¢fW'6F–ÆTFÖvTF–6S Ð¢B‚&64æWt—FVÕfW'6F–ÆTFÖvTF–6R"Ð¢òçfÇVRÇÂ""ÀÐ Ð¢Öv–6ÄGF6´&öçW3 Ð¢6fTçVÖ&W"€Ð¢B‚&64æWt—FVÔÖv–6ÄGF6´&öçW2"Ð¢òçfÇVRÀÐ¢ Ð¢’ÀÐ Ð¢Öv–6ÄFÖvT&öçW3 Ð¢6fTçVÖ&W"€Ð¢B‚&64æWt—FVÔÖv–6ÄFÖvT&öçW2"Ð¢òçfÇVRÀÐ¢ Ð¢’ÀÐ Ð¢6÷W&6S¢&7W7FöÒ"ÀÐ Ð¢æ÷FW3 Ð¢6fTF—7Æ•7G&–ær€Ð¢B‚&64æWt—FVÔæ÷FW2"Ð¢òçfÇVPÐ¢’ÀÐ Ð¢WV—VC Ð¢B‚&64æWt—FVÔWV—VB"Ð¢òæ6†V6¶VBÓÓÒG'VRÀÐ Ð¢—4Öv–6ÂÀÐ Ð¢&WV—&W4GGVæVÖVçBÀÐ Ð¢GGVæVC Ð¢7F'G4GGVæV@Ð¢ÀÐ Ð¢—46öçF–æW# Ð¢B‚&64æWt—FVÔ6öçF–æW""Ð¢òæ6†V6¶VBÓÓÒG'VPÐ¢ÒÀÐ Ð¢&7W7FöÒ Ð¢“°Ð Ð¢vWE6V7F–öãT–çfVçF÷'’‚Ð¢çW6‚†—FVÒ“°Ð Ð¢Ö&´G&gD6†ævVB‚“°Ð Ð¢&WGW&âG'VS°Ð¢ÐÐ Ð¢gVæ7F–öâ&VÖ÷fU6V7F–öãT—FVÒ€Ð¢–æFW‚ÀÐ¢&VÖ÷fÄÖöFRÒ" Ð¢’°Ð¢6öç7B–çfVçF÷'’ÐÐ¢vWE6V7F–öãT–çfVçF÷'’‚“°Ð Ð¢–b€Ð¢–æFW‚ÂÇÀÐ¢–æFW‚ãÒ–çfVçF÷'’æÆVæwF€Ð¢’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢6öç7B—FVÒÐÐ¢–çfVçF÷'•¶–æFW…Ó°Ð Ð¢–b†—FVÓòæ—46öçF–æW"ÓÓÒG'VR’°Ð¢6öç7B6öçFVçG2ÐÐ¢vWD6öçF–æW$6öçFVçG2€Ð¢–çfVçF÷'’ÀÐ¢—FVÒæ–@Ð¢“°Ð Ð¢–b†6öçFVçG2æÆVæwF‚’°Ð¢6öç7B6ÆVä6†ö–6RÐÐ¢6ÆVå7G&–ær€Ð¢&VÖ÷fÄÖöFPÐ¢’çFôÆ÷vW$66R‚“°Ð Ð¢–b‚6ÆVä6†ö–6R’°Ð¢7&VF÷%7FFRçVæF–æt6öçF–æW%&VÖ÷fÄ–BÐÐ¢—FVÒæ–C°Ð Ð¢&WGW&â'VæF–ær#°Ð¢ÐÐ Ð¢–b†6ÆVä6†ö–6RÓÓÒ&6æ6VÂ"’°Ð¢7&VF÷%7FFRçVæF–æt6öçF–æW%&VÖ÷fÄ–BÐÐ¢"#°Ð Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢–b†6ÆVä6†ö–6RÓÓÒ&FVÆWFR"’°Ð¢7&VF÷%7FFRæG&g@Ð¢æWV—ÖVç@Ð¢æ—FV×2ÐÐ¢&VÖ÷fT6öçF–æW$æD6öçFVçG2€Ð¢–çfVçF÷'’ÀÐ¢—FVÒæ–@Ð¢“°Ð Ð¢7&VF÷%7FFRçVæF–æt6öçF–æW%&VÖ÷fÄ–BÐÐ¢"#°Ð Ð¢–b€Ð¢7&VF÷%7FFRæ÷Vä6öçF–æW$–BÓÓÐÐ¢—FVÒæ–@Ð¢’°Ð¢7&VF÷%7FFRæ÷Vä6öçF–æW$–BÒ"#°Ð¢ÐÐ Ð¢Ö&´G&gD6†ævVB‚“°Ð Ð¢&WGW&âG'VS°Ð¢ÐÐ Ð¢–b†6ÆVä6†ö–6RÓÒ&–çfVçF÷'’"’°Ð¢7&VF÷%7FFRçVæF–æt6öçF–æW%&VÖ÷fÄ–BÐÐ¢—FVÒæ–C°Ð Ð¢&WGW&â'VæF–ær#°Ð¢ÐÐ¢ÐÐ Ð¢7&VF÷%7FFRæG&g@Ð¢æWV—ÖVç@Ð¢æ—FV×2ÐÐ¢&VÖ÷fT6öçF–æW%&W6W'fT6öçFVçG2€Ð¢–çfVçF÷'’ÀÐ¢—FVÒæ–@Ð¢“°Ð Ð¢7&VF÷%7FFRçVæF–æt6öçF–æW%&VÖ÷fÄ–BÐÐ¢"#°Ð Ð¢–b€Ð¢7&VF÷%7FFRæ÷Vä6öçF–æW$–BÓÓÐÐ¢—FVÒæ–@Ð¢’°Ð¢7&VF÷%7FFRæ÷Vä6öçF–æW$–BÒ"#°Ð¢ÐÐ¢ÒVÇ6R°Ð¢–çfVçF÷'’ç7Æ–6R€Ð¢–æFW‚ÀÐ¢Ð¢“°Ð¢ÐÐ Ð¢Ö&´G&gD6†ævVB‚“°Ð Ð¢&WGW&âG'VS°Ð¢ÐÐ Ð¢gVæ7F–öâ'6U6V7F–öãT—FVÔVF—EfÇVR€Ð¢f–VÆBÀÐ¢&ufÇVRÀÐ¢fÇVUG—RÀÐ¢6†V6¶VBÒfÇ6PÐ¢’°Ð¢–b‡fÇVUG—RÓÓÒ&&ööÆVâ"’°Ð¢&WGW&â6†V6¶VBÓÓÒG'VS°Ð¢ÐÐ Ð¢–b‡fÇVUG—RÓÓÒ&–çFVvW""’°Ð¢&WGW&âÖF‚æÖ‚€Ð¢ÀÐ¢ÖF‚ç&÷VæB€Ð¢6fTçVÖ&W"€Ð¢&ufÇVRÀÐ¢Ð¢Ð¢Ð¢“°Ð¢ÐÐ Ð¢–b‡fÇVUG—RÓÓÒ&çVÖ&W""’°Ð¢6öç7BçVÆÆ&ÆTf–VÆG2ÐÐ¢æWr6WB…°Ð¢'vV–v‡B"ÀÐ¢&&6T&Ö÷$6Æ72"ÀÐ¢&FW‡FW&—G”6"ÀÐ¢&66—G•vV–v‡B Ð¢Ò“°Ð Ð¢–b€Ð¢çVÆÆ&ÆTf–VÆG2æ†2†f–VÆB’b`Ð¢6ÆVå7G&–ær‡&ufÇVR’ÓÓÒ" Ð¢’°Ð¢&WGW&âçVÆÃ°Ð¢ÐÐ Ð¢&WGW&â6fTçVÖ&W"€Ð¢&ufÇVRÀÐ¢ Ð¢“°Ð¢ÐÐ Ð¢&WGW&â6fTF—7Æ•7G&–ær€Ð¢&ufÇVPÐ¢“°Ð¢ÐÐ Ð¢gVæ7F–öâWFFU6V7F–öãT–çfVçF÷'”—FVÒ€Ð¢–æFW‚ÀÐ¢f–VÆBÀÐ¢&ufÇVRÀÐ¢fÇVUG—RÒ'7G&–ær"ÀÐ¢6†V6¶VBÒfÇ6PÐ¢’°Ð¢6öç7B–çfVçF÷'’ÐÐ¢vWE6V7F–öãT–çfVçF÷'’‚“°Ð Ð¢6öç7B—FVÒÐÐ¢–çfVçF÷'•¶–æFW…Ó°Ð Ð¢–b‚—FVÒ’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢6öç7BVF—F&ÆTf–VÆG2ÐÐ¢æWr6WB…°Ð¢&æÖR"ÀÐ¢&6FVv÷'’"ÀÐ¢'VçF—G’"ÀÐ¢'vV–v‡B"ÀÐ¢&æ÷FW2"ÀÐ¢&WV—VB"ÀÐ¢&—4Öv–6Â"ÀÐ¢'&WV—&W4GGVæVÖVçB"ÀÐ¢&GGVæVB"ÀÐ¢&Öv–6Ä&öçW2"ÀÐ¢&&Ö÷$6FVv÷'’"ÀÐ¢&&6T&Ö÷$6Æ72"ÀÐ¢&FW‡FW&—G”6"ÀÐ¢&—56†–VÆB"ÀÐ¢&Öv–6Ä&Ö÷$6Æ74&öçW2"ÀÐ¢'vVöåG—R"ÀÐ¢&GF6´&–Æ—G’"ÀÐ¢&f–æW76R"ÀÐ¢'&ævVB"ÀÐ¢'F‡&÷vâ"ÀÐ¢'&öf–6–VçB"ÀÐ¢&FÖvTF–6R"ÀÐ¢'fW'6F–ÆTFÖvTF–6R"ÀÐ¢&Öv–6ÄGF6´&öçW2"ÀÐ¢&Öv–6ÄFÖvT&öçW2"ÀÐ¢&—46öçF–æW""ÀÐ¢&66—G•vV–v‡B Ð¢Ò“°Ð Ð¢–b‚VF—F&ÆTf–VÆG2æ†2†f–VÆB’’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢6öç7BæW‡EfÇVRÐÐ¢'6U6V7F–öãT—FVÔVF—EfÇVR€Ð¢f–VÆBÀÐ¢&ufÇVRÀÐ¢fÇVUG—RÀÐ¢6†V6¶V@Ð¢“°Ð Ð¢–b€Ð¢f–VÆBÓÓÒ&GGVæVB"b`Ð¢æW‡EfÇVRÓÓÒG'VRb`Ð¢—FVÒæGGVæVBÓÒG'VRb`Ð¢vWE6V7F–öãTGGVæVD—FVÔ6÷VçB‚’ãÐÐ¢vWD6†&7FW$GGVæVÖVçDÆ–Ö—B€Ð¢7&VF÷%7FFRæG&g@Ð¢Ð¢’°Ð¢6öç7BÆ–Ö—BÐÐ¢vWD6†&7FW$GGVæVÖVçDÆ–Ö—B€Ð¢7&VF÷%7FFRæG&g@Ð¢“°Ð Ð¢ÆW'B€Ð¢F†—26†&7FW"6âGGVæRFòæòÖ÷&RF†âG¶Æ–Ö—GÒ°Ð¢G¶Æ–Ö—BÓÓÒò&—FVÒ"¢&—FV×2'Òæ Ð¢“°Ð Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢–b€Ð¢f–VÆBÓÓÒ&—46öçF–æW""b`Ð¢—FVÒæ—46öçF–æW"ÓÓÒG'VRb`Ð¢æW‡EfÇVRÓÒG'VPÐ¢’°Ð¢–çfVçF÷'’æf÷$V6‚‚†6æF–FFR’Óâ°Ð¢–b€Ð¢6ÆVå7G&–ær†6æF–FFRæ6öçF–æW$–B’ÓÓÐÐ¢6ÆVå7G&–ær†—FVÒæ–BÐ¢’°Ð¢6æF–FFRæ6öçF–æW$–BÒ"#°Ð¢ÐÐ¢Ò“°Ð Ð¢7&VF÷%7FFRçVæF–æt6öçF–æW%&VÖ÷fÄ–BÐÐ¢"#°Ð¢ÐÐ Ð¢—FVÕ¶f–VÆEÒÐÐ¢æW‡EfÇVS°Ð Ð¢–b€Ð¢f–VÆBÓÓÒ&GGVæVB"b`Ð¢æW‡EfÇVRÓÓÒG'VPÐ¢’°Ð¢—FVÒæ—4Öv–6ÂÒG'VS°Ð¢—FVÒç&WV—&W4GGVæVÖVçBÒG'VS°Ð¢ÐÐ Ð¢–b€Ð¢f–VÆBÓÓÒ'&WV—&W4GGVæVÖVçB"b`Ð¢æW‡EfÇVRÓÓÒG'VPÐ¢’°Ð¢—FVÒæ—4Öv–6ÂÒG'VS°Ð¢ÐÐ Ð¢–b€Ð¢f–VÆBÓÓÒ&—4Öv–6Â"b`Ð¢æW‡EfÇVRÓÒG'VPÐ¢’°Ð¢—FVÒç&WV—&W4GGVæVÖVçBÒfÇ6S°Ð¢—FVÒæGGVæVBÒfÇ6S°Ð¢ÐÐ Ð¢–b€Ð¢f–VÆBÓÓÒ'&WV—&W4GGVæVÖVçB"b`Ð¢æW‡EfÇVRÓÒG'VPÐ¢’°Ð¢—FVÒæGGVæVBÒfÇ6S°Ð¢ÐÐ Ð¢–b€Ð¢f–VÆBÓÓÒ&—56†–VÆB"b`Ð¢æW‡EfÇVRÓÓÒG'VPÐ¢’°Ð¢—FVÒæ6FVv÷'’ÐÐ¢—FVÒæ6FVv÷'’ÇÂ'6†–VÆB#°Ð Ð¢—FVÒæ&Ö÷$6FVv÷'’Ò'6†–VÆB#°Ð¢ÐÐ Ð¢–çfVçF÷'•¶–æFW…ÒÐÐ¢æ÷&ÖÆ—¦U6V7F–öãT—FVÒ€Ð¢—FVÒÀÐ¢—FVÒç6÷W&6RÇÂ&7W7FöÒ Ð¢“°Ð Ð¢Ö&´G&gD6†ævVB‚“°Ð Ð¢&WGW&âG'VS°Ð¢ÐÐ Ð¢gVæ7F–öâ6†ævU6V7F–öãUVçF—G’€Ð¢–æFW‚ÀÐ¢Ö÷Vç@Ð¢’°Ð¢6öç7B–çfVçF÷'’ÐÐ¢vWE6V7F–öãT–çfVçF÷'’‚“°Ð Ð¢6öç7B—FVÒÐÐ¢–çfVçF÷'•¶–æFW…Ó°Ð Ð¢–b‚—FVÒ’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢6öç7BæW‡EVçF—G’ÐÐ¢ÖF‚æÖ‚€Ð¢ÀÐ¢ÖF‚ç&÷VæB€Ð¢6fTçVÖ&W"€Ð¢—FVÒçVçF—G’ÀÐ¢Ð¢Ð¢’°Ð¢Ö÷Vç@Ð¢“°Ð Ð¢–b†æW‡EVçF—G’ÃÒ’°Ð¢–çfVçF÷'’ç7Æ–6R€Ð¢–æFW‚ÀÐ¢Ð¢“°Ð¢ÒVÇ6R°Ð¢—FVÒçVçF—G’ÐÐ¢æW‡EVçF—G“°Ð¢ÐÐ Ð¢Ö&´G&gD6†ævVB‚“°Ð Ð¢&WGW&âG'VS°Ð¢ÐÐ Ð¢gVæ7F–öâÖ÷fU6V7F–öãT—FVÕFô6öçF–æW"€Ð¢–æFW‚ÀÐ¢F&vWD6öçF–æW$–BÀÐ¢VçF—G’ÒçVÆÀÐ¢’°Ð¢6öç7B–çfVçF÷'’ÐÐ¢vWE6V7F–öãT–çfVçF÷'’‚“°Ð Ð¢6öç7B—FVÒÐÐ¢–çfVçF÷'•¶–æFW…Ó°Ð Ð¢–b‚—FVÒ’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢6öç7B6ÆVåF&vWD–BÐÐ¢6ÆVå7G&–ær‡F&vWD6öçF–æW$–B“°Ð Ð¢6öç7B7W'&VçEVçF—G’ÐÐ¢ÖF‚æÖ‚€Ð¢ÀÐ¢ÖF‚ç&÷VæB€Ð¢6fTçVÖ&W"†—FVÒçVçF—G’ÂÐ¢Ð¢“°Ð Ð¢6öç7BÖ÷fUVçF—G’ÐÐ¢VçF—G’ÓÓÒçVÆÂÇÀÐ¢VçF—G’ÓÓÒVæFVf–æVBÇÀÐ¢VçF—G’ÓÓÒ" Ð¢ò7W'&VçEVçF—GÐ¢¢ÖF‚æÖ‚€Ð¢ÀÐ¢ÖF‚æÖ–â€Ð¢7W'&VçEVçF—G’ÀÐ¢ÖF‚ç&÷VæB€Ð¢6fTçVÖ&W"€Ð¢VçF—G’ÀÐ¢7W'&VçEVçF—GÐ¢Ð¢Ð¢Ð¢“°Ð Ð¢–b†6ÆVåF&vWD–B’°Ð¢6öç7BF&vWD6öçF–æW"ÐÐ¢–çfVçF÷'’æf–æB‚†6æF–FFR’Óâ°Ð¢&WGW&â€Ð¢6æF–FFRæ–BÓÓÒ6ÆVåF&vWD–Bb`Ð¢6æF–FFRæ—46öçF–æW"ÓÓÒG'VPÐ¢“°Ð¢Ò“°Ð Ð¢–b‚F&vWD6öçF–æW"’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢–b€Ð¢v÷VÆD7&VFT6öçF–æW$7–6ÆR€Ð¢–çfVçF÷'’ÀÐ¢—FVÒæ–BÀÐ¢6ÆVåF&vWD–@Ð¢Ð¢’°Ð¢ÆW'B€Ð¢%F†B6öçF–æW"Ö÷fRv÷VÆB7&VFRâ–çfÆ–BÆö÷â Ð¢“°Ð Ð¢&WGW&âfÇ6S°Ð¢ÐÐ¢ÐÐ Ð¢6öç7BæW‡D–çfVçF÷'’ÐÐ¢7Æ—D–çfVçF÷'•7F6²€Ð¢–çfVçF÷'’ÀÐ¢—FVÒæ–BÀÐ¢Ö÷fUVçF—G’ÀÐ¢6ÆVåF&vWD–@Ð¢“°Ð Ð¢6öç7BF&vWE7VÖÖ'’ÐÐ¢6ÆVåF&vWD–@Ð¢òvWD6öçF–æW%7VÖÖ&–W2€Ð¢æW‡D–çfVçF÷'Ð¢’æf–æB‚†6öçF–æW"’Óâ°Ð¢&WGW&â€Ð¢6öçF–æW"æ–BÓÓÐÐ¢6ÆVåF&vWD–@Ð¢“°Ð¢ÒÐ¢¢çVÆÃ°Ð Ð¢–b€Ð¢F&vWE7VÖÖ'“òæ÷fW$66—GÐ¢’°Ð¢ÆW'B€Ð¢%F†BÖ÷fRv÷VÆBW†6VVBF†R6öçF–æW"w2¶æ÷vâ66—G’â Ð¢“°Ð Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢7&VF÷%7FFRæG&g@Ð¢æWV—ÖVç@Ð¢æ—FV×2ÒæW‡D–çfVçF÷'“°Ð Ð¢Ö&´G&gD6†ævVB‚“°Ð Ð¢&WGW&âG'VS°Ð¢ÐÐ Ð¢gVæ7F–öâFövvÆU6V7F–öãT—FVÕ7FFR€Ð¢–æFW‚ÀÐ¢&÷W'GÐ¢’°Ð¢6öç7B–çfVçF÷'’ÐÐ¢vWE6V7F–öãT–çfVçF÷'’‚“°Ð Ð¢6öç7B—FVÒÐÐ¢–çfVçF÷'•¶–æFW…Ó°Ð Ð¢–b€Ð¢—FVÒÇÀÐ¢°Ð¢&WV—VB"ÀÐ¢&GGVæVB Ð¢Òæ–æ6ÇVFW2‡&÷W'G’Ð¢’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢–b‡&÷W'G’ÓÓÒ&GGVæVB"’°Ð¢–b€Ð¢—FVÒæ—4Öv–6ÂÇÀÐ¢—FVÒç&WV—&W4GGVæVÖVç@Ð¢’°Ð¢—FVÒæGGVæVBÒfÇ6S°Ð¢Ö&´G&gD6†ævVB‚“°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢–b†—FVÒæGGVæVBÓÓÒG'VR’°Ð¢—FVÒæGGVæVBÒfÇ6S°Ð¢Ö&´G&gD6†ævVB‚“°Ð¢&WGW&âG'VS°Ð¢ÐÐ Ð¢6öç7BÆ–Ö—BÐÐ¢vWD6†&7FW$GGVæVÖVçDÆ–Ö—B€Ð¢7&VF÷%7FFRæG&g@Ð¢“°Ð Ð¢–b€Ð¢vWE6V7F–öãTGGVæVD—FVÔ6÷VçB‚’ãÐÐ¢Æ–Ö—@Ð¢’°Ð¢ÆW'B€Ð¢F†—26†&7FW"6âGGVæRFòæòÖ÷&RF†âG¶Æ–Ö—GÒ°Ð¢G¶Æ–Ö—BÓÓÒò&—FVÒ"¢&—FV×2'Òæ Ð¢“°Ð Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢—FVÒæGGVæVBÒG'VS°Ð¢Ö&´G&gD6†ævVB‚“°Ð¢&WGW&âG'VS°Ð¢ÐÐ Ð¢–b€Ð¢&÷W'G’ÓÓÒ&WV—VB"b`Ð¢—FVÒæWV—VBÓÒG'VPÐ¢’°Ð¢–b†—FVÒæ—46öçF–æW"ÓÓÒG'VR’°Ð¢—FVÒæWV—VBÒfÇ6S°Ð¢Ö&´G&gD6†ævVB‚“°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢–b†6ÆVå7G&–ær†—FVÒæ6öçF–æW$–B’’°Ð¢ÆW'B€Ð¢$Ö÷fRF†R—FVÒ÷WBöb—G26öçF–æW"&Vf÷&RWV—–ær—Bâ Ð¢“°Ð Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢–b†—FVÒæ—56†–VÆBÓÓÒG'VR’°Ð¢6öç7B÷F†W%6†–VÆBÐÐ¢vWE6V7F–öãT–çfVçF÷'’‚Ð¢ç6öÖR‚†6æF–FFRÂ6æF–FFT–æFW‚’Óâ°Ð¢&WGW&â€Ð¢6æF–FFT–æFW‚ÓÒ–æFW‚b`Ð¢6æF–FFRæWV—VBÓÓÒG'VRb`Ð¢6æF–FFRæ—56†–VÆBÓÓÒG'VRb`Ð¢6ÆVå7G&–ær€Ð¢6æF–FFRæ6öçF–æW$–@Ð¢Ð¢“°Ð¢Ò“°Ð Ð¢–b†÷F†W%6†–VÆB’°Ð¢ÆW'B€Ð¢$öæÇ’öæR6†–VÆB6â&÷f–FRâ&Ö÷"6Æ72&öçW2â Ð¢“°Ð Ð¢&WGW&âfÇ6S°Ð¢ÐÐ¢ÐÐ¢ÐÐ Ð¢—FVÕ·&÷W'G•ÒÐÐ¢—FVÕ·&÷W'G•ÒÓÒG'VS°Ð Ð¢Ö&´G&gD6†ævVB‚“°Ð Ð¢&WGW&âG'VS°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öãUF÷FÅvV–v‡B‚’°Ð¢&WGW&âvWE6V7F–öãT–çfVçF÷'’‚Ð¢ç&VGV6R‚‡F÷FÂÂ—FVÒ’Óâ°Ð¢–b€Ð¢—FVÒçvV–v‡BÓÓÒçVÆÂÇÀÐ¢—FVÒçvV–v‡BÓÓÒVæFVf–æVBÇÀÐ¢—FVÒçvV–v‡BÓÓÒ" Ð¢’°Ð¢&WGW&âF÷FÃ°Ð¢ÐÐ Ð¢&WGW&â€Ð¢F÷FÂ°Ð¢ÖF‚æÖ‚€Ð¢ÀÐ¢6fTçVÖ&W"€Ð¢—FVÒçvV–v‡BÀÐ¢ Ð¢Ð¢’ Ð¢ÖF‚æÖ‚€Ð¢ÀÐ¢ÖF‚ç&÷VæB€Ð¢6fTçVÖ&W"€Ð¢—FVÒçVçF—G’ÀÐ¢Ð¢Ð¢Ð¢Ð¢“°Ð¢ÒÂ“°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öãT–çfVçF÷'”6÷VçB‚’°Ð¢&WGW&âvWE6V7F–öãT–çfVçF÷'’‚Ð¢ç&VGV6R‚‡F÷FÂÂ—FVÒ’Óâ°Ð¢&WGW&â€Ð¢F÷FÂ°Ð¢ÖF‚æÖ‚€Ð¢ÀÐ¢ÖF‚ç&÷VæB€Ð¢6fTçVÖ&W"€Ð¢—FVÒçVçF—G’ÀÐ¢Ð¢Ð¢Ð¢Ð¢“°Ð¢ÒÂ“°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öãTGGVæVD—FVÔ6÷VçB‚’°Ð¢&WGW&â6÷VçD6†&7FW$GGVæVD—FV×2€Ð¢7&VF÷%7FFRæG&g@Ð¢“°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öãUVæ¶æ÷våvV–v‡D6÷VçB‚’°Ð¢&WGW&âvWE6V7F–öãT–çfVçF÷'’‚Ð¢æf–ÇFW"‚†—FVÒ’Óâ°Ð¢&WGW&â€Ð¢—FVÒçvV–v‡BÓÓÒçVÆÂÇÀÐ¢—FVÒçvV–v‡BÓÓÒVæFVf–æVBÇÀÐ¢—FVÒçvV–v‡BÓÓÒ" Ð¢“°Ð¢ÒÐ¢æÆVæwFƒ°Ð¢ÐÐ Ð¢gVæ7F–öâ&VæFW%6V7F–öãT6FÆör€Ð¢÷F–öç2Ò·ÐÐ¢’°Ð¢6öç7B6FÆörÒ'&’æ—4'&’€Ð¢÷F–öç2æVçG&–W0Ð¢Ð¢ò÷F–öç2æVçG&–W0Ð¢¢vWE6V7F–öãT6FÆöuvR†÷F–öç2Ð¢æVçG&–W3°Ð Ð¢–b‚6FÆöræÆVæwF‚’°Ð¢&WGW&â Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"×Æ6V†öÆFW"#àÐ¢æòWV—ÖVçB6FÆör—FV×2&Rf–Æ&ÆRàÐ¢ÂöF—càÐ¢°Ð¢ÐÐ Ð¢&WGW&â6FÆöpÐ¢æÖ‚†—FVÒ’Óâ°Ð¢&WGW&âv—¦&D6†ö–6T6&B€Ð¢—FVÒææÖRÀÐ Ð¢ Ð¢ÇàÐ¢Æ#ä6FVv÷'“£Âö#àÐ Ð¢G¶W66T‡FÖÂ€Ð¢—FVÒæ6FVv÷'Ð¢—ÐÐ Ð¢Æ'#àÐ Ð¢Æ#äFVfVÇBVçF—G“£Âö#àÐ Ð¢G´ÖF‚æÖ‚€Ð¢ÀÐ¢ÖF‚ç&÷VæB€Ð¢6fTçVÖ&W"€Ð¢—FVÒçVçF—G’ÀÐ¢Ð¢Ð¢Ð¢—ÐÐ Ð¢Æ'#àÐ Ð¢Æ#åvV–v‡C£Âö#àÐ Ð¢G°Ð¢—FVÒçvV–v‡BÓÓÒçVÆÀÐ¢ò$æ÷B6WB Ð¢¢G·6fTçVÖ&W"€Ð¢—FVÒçvV–v‡BÀÐ¢ Ð¢—ÒÆ"âV6† Ð¢ÐÐ¢Â÷àÐ Ð¢Ç6Æ73Ò'6ÖÆÂ#àÐ¢G¶W66T‡FÖÂ€Ð¢—FVÒææ÷FW2ÇÀÐ¢$æòæ÷FW2â Ð¢—ÐÐ¢Â÷àÐ¢ÀÐ Ð¢$FBFò–çfVçF÷'’"ÀÐ Ð¢&FBÖ6FÆörÖ—FVÒ"ÀÐ Ð¢°Ð¢&—FVÒÖ–B# Ð¢—FVÒæ–@Ð¢ÒÀÐ Ð¢fÇ6PÐ¢“°Ð¢ÒÐ¢æ¦ö–â‚""“°Ð¢ÐÐ Ð¢gVæ7F–öâ&VæFW%6V7F–öãT—FVÔVF—D–çWB€Ð¢—FVÒÀÐ¢–æFW‚ÀÐ¢Æ&VÂÀÐ¢f–VÆBÀÐ¢÷F–öç2Ò·ÐÐ¢’°Ð¢6öç7B–BÐÐ¢64—FVÔVF—BÒG¶–æFW‡ÒÒG¶f–VÆGÖ°Ð Ð¢6öç7BfÇVRÐÐ¢—FVÕ¶f–VÆEÒÓÓÒçVÆÂÇÀÐ¢—FVÕ¶f–VÆEÒÓÓÒVæFVf–æV@Ð¢ò" Ð¢¢—FVÕ¶f–VÆEÓ°Ð Ð¢&WGW&â Ð¢ÆF—`Ð¢6Æ73Ò&†rÖ6†&7FW"Öf–VÆBG°Ð¢÷F–öç2çv–FRÓÓÒG'VPÐ¢ò"†rÖ6†&7FW"×v–FRÖf–VÆB Ð¢¢" Ð¢Ò Ð¢àÐ¢ÆÆ&VÂf÷#Ò"G¶–GÒ#àÐ¢G¶W66T‡FÖÂ†Æ&VÂ—ÐÐ¢ÂöÆ&VÃàÐ Ð¢Æ–çW@Ð¢–CÒ"G¶–GÒ Ð¢G—SÒ"G¶W66T‡FÖÂ€Ð¢÷F–öç2çG—RÇÂ'FW‡B Ð¢—Ò Ð¢fÇVSÒ"G¶W66T‡FÖÂ‡fÇVR—Ò Ð¢FFÖ62Ö7F–öâÖ6†ævSÒ'WFFRÖ–çfVçF÷'’Ö—FVÒ Ð¢FFÖ–æFWƒÒ"G¶–æFW‡Ò Ð¢FFÖ—FVÒÖf–VÆCÒ"G¶W66T‡FÖÂ†f–VÆB—Ò Ð¢FF×fÇVR×G—SÒ"G¶W66T‡FÖÂ€Ð¢÷F–öç2çfÇVUG—RÇÂ'7G&–ær Ð¢—Ò Ð¢G¶÷F–öç2æW‡G&ÇÂ"'ÐÐ¢àÐ¢ÂöF—càÐ¢°Ð¢ÐÐ Ð¢gVæ7F–öâ&VæFW%6V7F–öãT—FVÔVF—EFW‡F&V€Ð¢—FVÒÀÐ¢–æFW‚ÀÐ¢Æ&VÂÀÐ¢f–VÆ@Ð¢’°Ð¢6öç7B–BÐÐ¢64—FVÔVF—BÒG¶–æFW‡ÒÒG¶f–VÆGÖ°Ð Ð¢&WGW&â Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"Öf–VÆB†rÖ6†&7FW"×v–FRÖf–VÆB#àÐ¢ÆÆ&VÂf÷#Ò"G¶–GÒ#àÐ¢G¶W66T‡FÖÂ†Æ&VÂ—ÐÐ¢ÂöÆ&VÃàÐ Ð¢ÇFW‡F&VÐ¢–CÒ"G¶–GÒ Ð¢FFÖ62Ö7F–öâÖ6†ævSÒ'WFFRÖ–çfVçF÷'’Ö—FVÒ Ð¢FFÖ–æFWƒÒ"G¶–æFW‡Ò Ð¢FFÖ—FVÒÖf–VÆCÒ"G¶W66T‡FÖÂ†f–VÆB—Ò Ð¢FF×fÇVR×G—SÒ'7G&–ær Ð¢âG¶W66T‡FÖÂ†—FVÕ¶f–VÆEÒÇÂ""—ÓÂ÷FW‡F&VàÐ¢ÂöF—càÐ¢°Ð¢ÐÐ Ð¢gVæ7F–öâ&VæFW%6V7F–öãT—FVÔVF—D6†V6¶&÷‚€Ð¢—FVÒÀÐ¢–æFW‚ÀÐ¢Æ&VÂÀÐ¢f–VÆ@Ð¢’°Ð¢6öç7B–BÐÐ¢64—FVÔVF—BÒG¶–æFW‡ÒÒG¶f–VÆGÖ°Ð Ð¢&WGW&â Ð¢ÆÆ&VÂ6Æ73Ò&†rÖ6†&7FW"Öf–VÆB#àÐ¢Æ–çW@Ð¢–CÒ"G¶–GÒ Ð¢G—SÒ&6†V6¶&÷‚ Ð¢FFÖ62Ö7F–öâÖ6†ævSÒ'WFFRÖ–çfVçF÷'’Ö—FVÒ Ð¢FFÖ–æFWƒÒ"G¶–æFW‡Ò Ð¢FFÖ—FVÒÖf–VÆCÒ"G¶W66T‡FÖÂ†f–VÆB—Ò Ð¢FF×fÇVR×G—SÒ&&ööÆVâ Ð¢G°Ð¢—FVÕ¶f–VÆEÒÓÓÒG'VPÐ¢ò&6†V6¶VB Ð¢¢" Ð¢ÐÐ¢àÐ Ð¢G¶W66T‡FÖÂ†Æ&VÂ—ÐÐ¢ÂöÆ&VÃàÐ¢°Ð¢ÐÐ Ð¢gVæ7F–öâ&VæFW%6V7F–öãT—FVÔVF—D6öçG&öÇ2€Ð¢—FVÒÀÐ¢–æFW€Ð¢’°Ð¢&WGW&â Ð¢ÆFWF–Ç3àÐ¢Ç7VÖÖ'“äVF—B—FVÒFWF–Ç3Â÷7VÖÖ'“àÐ Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"Öf–VÆBÖw&–BF‡&VR#àÐ¢G·&VæFW%6V7F–öãT—FVÔVF—D–çWB€Ð¢—FVÒÀÐ¢–æFW‚ÀÐ¢$æÖR"ÀÐ¢&æÖR Ð¢—ÐÐ Ð¢G·&VæFW%6V7F–öãT—FVÔVF—D–çWB€Ð¢—FVÒÀÐ¢–æFW‚ÀÐ¢$6FVv÷'’"ÀÐ¢&6FVv÷'’ Ð¢—ÐÐ Ð¢G·&VæFW%6V7F–öãT—FVÔVF—D–çWB€Ð¢—FVÒÀÐ¢–æFW‚ÀÐ¢%VçF—G’"ÀÐ¢'VçF—G’"ÀÐ¢°Ð¢G—S¢&çVÖ&W""ÀÐ¢fÇVUG—S¢&–çFVvW""ÀÐ¢W‡G&¢vÖ–ãÒ#"7FWÒ#"pÐ¢ÐÐ¢—ÐÐ Ð¢G·&VæFW%6V7F–öãT—FVÔVF—D–çWB€Ð¢—FVÒÀÐ¢–æFW‚ÀÐ¢%vV–v‡B"ÀÐ¢'vV–v‡B"ÀÐ¢°Ð¢G—S¢&çVÖ&W""ÀÐ¢fÇVUG—S¢&çVÖ&W""ÀÐ¢W‡G&¢vÖ–ãÒ#"7FWÒ#ã"pÐ¢ÐÐ¢—ÐÐ Ð¢G·&VæFW%6V7F–öãT—FVÔVF—D–çWB€Ð¢—FVÒÀÐ¢–æFW‚ÀÐ¢$Öv–2&öçW2"ÀÐ¢&Öv–6Ä&öçW2"ÀÐ¢°Ð¢G—S¢&çVÖ&W""ÀÐ¢fÇVUG—S¢&çVÖ&W""ÀÐ¢W‡G&¢w7FWÒ#"pÐ¢ÐÐ¢—ÐÐ Ð¢G·&VæFW%6V7F–öãT—FVÔVF—D–çWB€Ð¢—FVÒÀÐ¢–æFW‚ÀÐ¢$6öçF–æW"66—G’"ÀÐ¢&66—G•vV–v‡B"ÀÐ¢°Ð¢G—S¢&çVÖ&W""ÀÐ¢fÇVUG—S¢&çVÖ&W""ÀÐ¢W‡G&¢vÖ–ãÒ#"7FWÒ#ã"pÐ¢ÐÐ¢—ÐÐ Ð¢G·&VæFW%6V7F–öãT—FVÔVF—EFW‡F&V€Ð¢—FVÒÀÐ¢–æFW‚ÀÐ¢$æ÷FW2"ÀÐ¢&æ÷FW2 Ð¢—ÐÐ¢ÂöF—càÐ Ð¢ÆƒCä&Ö÷#ÂöƒCàÐ Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"Öf–VÆBÖw&–BF‡&VR#àÐ¢G·&VæFW%6V7F–öãT—FVÔVF—D–çWB€Ð¢—FVÒÀÐ¢–æFW‚ÀÐ¢$&Ö÷"G—R"ÀÐ¢&&Ö÷$6FVv÷'’ Ð¢—ÐÐ Ð¢G·&VæFW%6V7F–öãT—FVÔVF—D–çWB€Ð¢—FVÒÀÐ¢–æFW‚ÀÐ¢$&6R2"ÀÐ¢&&6T&Ö÷$6Æ72"ÀÐ¢°Ð¢G—S¢&çVÖ&W""ÀÐ¢fÇVUG—S¢&çVÖ&W""ÀÐ¢W‡G&¢vÖ–ãÒ#"7FWÒ#"pÐ¢ÐÐ¢—ÐÐ Ð¢G·&VæFW%6V7F–öãT—FVÔVF—D–çWB€Ð¢—FVÒÀÐ¢–æFW‚ÀÐ¢$FW‚6"ÀÐ¢&FW‡FW&—G”6"ÀÐ¢°Ð¢G—S¢&çVÖ&W""ÀÐ¢fÇVUG—S¢&çVÖ&W""ÀÐ¢W‡G&¢w7FWÒ#"pÐ¢ÐÐ¢—ÐÐ Ð¢G·&VæFW%6V7F–öãT—FVÔVF—D–çWB€Ð¢—FVÒÀÐ¢–æFW‚ÀÐ¢$2Öv–2&öçW2"ÀÐ¢&Öv–6Ä&Ö÷$6Æ74&öçW2"ÀÐ¢°Ð¢G—S¢&çVÖ&W""ÀÐ¢fÇVUG—S¢&çVÖ&W""ÀÐ¢W‡G&¢w7FWÒ#"pÐ¢ÐÐ¢—ÐÐ Ð¢G·&VæFW%6V7F–öãT—FVÔVF—D6†V6¶&÷‚€Ð¢—FVÒÀÐ¢–æFW‚ÀÐ¢%6†–VÆB"ÀÐ¢&—56†–VÆB Ð¢—ÐÐ¢ÂöF—càÐ Ð¢ÆƒCåvVöãÂöƒCàÐ Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"Öf–VÆBÖw&–BF‡&VR#àÐ¢G·&VæFW%6V7F–öãT—FVÔVF—D–çWB€Ð¢—FVÒÀÐ¢–æFW‚ÀÐ¢%vVöâG—R"ÀÐ¢'vVöåG—R Ð¢—ÐÐ Ð¢G·&VæFW%6V7F–öãT—FVÔVF—D–çWB€Ð¢—FVÒÀÐ¢–æFW‚ÀÐ¢$GF6²&–Æ—G’"ÀÐ¢&GF6´&–Æ—G’ Ð¢—ÐÐ Ð¢G·&VæFW%6V7F–öãT—FVÔVF—D–çWB€Ð¢—FVÒÀÐ¢–æFW‚ÀÐ¢$FÖvRF–6R"ÀÐ¢&FÖvTF–6R Ð¢—ÐÐ Ð¢G·&VæFW%6V7F–öãT—FVÔVF—D–çWB€Ð¢—FVÒÀÐ¢–æFW‚ÀÐ¢%fW'6F–ÆRF–6R"ÀÐ¢'fW'6F–ÆTFÖvTF–6R Ð¢—ÐÐ Ð¢G·&VæFW%6V7F–öãT—FVÔVF—D–çWB€Ð¢—FVÒÀÐ¢–æFW‚ÀÐ¢$GF6²Öv–2&öçW2"ÀÐ¢&Öv–6ÄGF6´&öçW2"ÀÐ¢°Ð¢G—S¢&çVÖ&W""ÀÐ¢fÇVUG—S¢&çVÖ&W""ÀÐ¢W‡G&¢w7FWÒ#"pÐ¢ÐÐ¢—ÐÐ Ð¢G·&VæFW%6V7F–öãT—FVÔVF—D–çWB€Ð¢—FVÒÀÐ¢–æFW‚ÀÐ¢$FÖvRÖv–2&öçW2"ÀÐ¢&Öv–6ÄFÖvT&öçW2"ÀÐ¢°Ð¢G—S¢&çVÖ&W""ÀÐ¢fÇVUG—S¢&çVÖ&W""ÀÐ¢W‡G&¢w7FWÒ#"pÐ¢ÐÐ¢—ÐÐ¢ÂöF—càÐ Ð¢ÆƒCäfÆw3ÂöƒCàÐ Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"Öf–VÆBÖw&–BF‡&VR#àÐ¢G·&VæFW%6V7F–öãT—FVÔVF—D6†V6¶&÷‚€Ð¢—FVÒÀÐ¢–æFW‚ÀÐ¢$Öv–6Â"ÀÐ¢&—4Öv–6Â Ð¢—ÐÐ Ð¢G·&VæFW%6V7F–öãT—FVÔVF—D6†V6¶&÷‚€Ð¢—FVÒÀÐ¢–æFW‚ÀÐ¢%&WV—&W2GGVæVÖVçB"ÀÐ¢'&WV—&W4GGVæVÖVçB Ð¢—ÐÐ Ð¢G·&VæFW%6V7F–öãT—FVÔVF—D6†V6¶&÷‚€Ð¢—FVÒÀÐ¢–æFW‚ÀÐ¢$GGVæVB"ÀÐ¢&GGVæVB Ð¢—ÐÐ Ð¢G·&VæFW%6V7F–öãT—FVÔVF—D6†V6¶&÷‚€Ð¢—FVÒÀÐ¢–æFW‚ÀÐ¢$6öçF–æW""ÀÐ¢&—46öçF–æW" Ð¢—ÐÐ Ð¢G·&VæFW%6V7F–öãT—FVÔVF—D6†V6¶&÷‚€Ð¢—FVÒÀÐ¢–æFW‚ÀÐ¢$f–æW76R"ÀÐ¢&f–æW76R Ð¢—ÐÐ Ð¢G·&VæFW%6V7F–öãT—FVÔVF—D6†V6¶&÷‚€Ð¢—FVÒÀÐ¢–æFW‚ÀÐ¢%&ævVB"ÀÐ¢'&ævVB Ð¢—ÐÐ Ð¢G·&VæFW%6V7F–öãT—FVÔVF—D6†V6¶&÷‚€Ð¢—FVÒÀÐ¢–æFW‚ÀÐ¢%F‡&÷vâ"ÀÐ¢'F‡&÷vâ Ð¢—ÐÐ Ð¢G·&VæFW%6V7F–öãT—FVÔVF—D6†V6¶&÷‚€Ð¢—FVÒÀÐ¢–æFW‚ÀÐ¢%&öf–6–VçB"ÀÐ¢'&öf–6–VçB Ð¢—ÐÐ¢ÂöF—càÐ¢ÂöFWF–Ç3àÐ¢°Ð¢ÐÐ Ð¢gVæ7F–öâ&VæFW%6V7F–öãT6öçF–æW$FW7F–æF–öå6VÆV7B€Ð¢–çfVçF÷'’ÀÐ¢—FVÒÀÐ¢–æFW‚ÀÐ¢Æ&VÂÒ$6öçF–æW" Ð¢’°Ð¢6öç7BVçF—G’ÐÐ¢ÖF‚æÖ‚€Ð¢ÀÐ¢ÖF‚ç&÷VæB€Ð¢6fTçVÖ&W"€Ð¢—FVÒçVçF—G’ÀÐ¢Ð¢Ð¢Ð¢“°Ð Ð¢6öç7B6öçF–æW$÷F–öç2Ò°Ð¢°Ð¢–C¢""ÀÐ¢æÖS¢$vVæW&Â–çfVçF÷'’ Ð¢ÒÀÐ Ð¢ââæ–çfVçF÷'Ð¢æf–ÇFW"‚†6æF–FFRÂ6æF–FFT–æFW‚’Óâ°Ð¢&WGW&â€Ð¢6æF–FFT–æFW‚ÓÒ–æFW‚b`Ð¢6æF–FFRæ—46öçF–æW"ÓÓÒG'VRb`Ð¢v÷VÆD7&VFT6öçF–æW$7–6ÆR€Ð¢–çfVçF÷'’ÀÐ¢—FVÒæ–BÀÐ¢6æF–FFRæ–@Ð¢Ð¢“°Ð¢ÒÐ¢æÖ‚†6æF–FFR’Óâ°Ð¢&WGW&â°Ð¢–C¢6æF–FFRæ–BÀÐ¢æÖS Ð¢6æF–FFRææÖRÇÀÐ¢$6öçF–æW" Ð¢Ó°Ð¢ÒÐ¢Ó°Ð Ð¢&WGW&â Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"Öf–VÆB#àÐ¢ÆÆ&VÂf÷#Ò&64—FVÔ6öçF–æW"ÒG¶–æFW‡Ò#àÐ¢G¶W66T‡FÖÂ†Æ&VÂ—ÐÐ¢ÂöÆ&VÃàÐ Ð¢Ç6VÆV7@Ð¢–CÒ&64—FVÔ6öçF–æW"ÒG¶–æFW‡Ò Ð¢FFÖ62Ö7F–öâÖ6†ævSÒ&Ö÷fRÖ—FVÒÖ6öçF–æW" Ð¢FFÖ–æFWƒÒ"G¶–æFW‡Ò Ð¢àÐ¢G¶6öçF–æW$÷F–öç0Ð¢æÖ‚†6öçF–æW"’Óâ°Ð¢&WGW&â Ð¢Æ÷F–öàÐ¢fÇVSÒ"G¶W66T‡FÖÂ€Ð¢6öçF–æW"æ–@Ð¢—Ò Ð¢G°Ð¢6ÆVå7G&–ær€Ð¢—FVÒæ6öçF–æW$–@Ð¢’ÓÓÐÐ¢6ÆVå7G&–ær€Ð¢6öçF–æW"æ–@Ð¢Ð¢ò'6VÆV7FVB Ð¢¢" Ð¢ÐÐ¢àÐ¢G¶W66T‡FÖÂ€Ð¢6öçF–æW"ææÖPÐ¢—ÐÐ¢Âö÷F–öãàÐ¢°Ð¢ÒÐ¢æ¦ö–â‚""—ÐÐ¢Â÷6VÆV7CàÐ¢ÂöF—càÐ Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"Öf–VÆB#àÐ¢ÆÆ&VÂf÷#Ò&64—FVÔÖ÷fUVçF—G’ÒG¶–æFW‡Ò#àÐ¢Ö÷fRVçF—GÐ¢ÂöÆ&VÃàÐ Ð¢Æ–çW@Ð¢–CÒ&64—FVÔÖ÷fUVçF—G’ÒG¶–æFW‡Ò Ð¢G—SÒ&çVÖ&W" Ð¢Ö–ãÒ# Ð¢ÖƒÒ"G·VçF—G—Ò Ð¢7FWÒ# Ð¢fÇVSÒ"G·VçF—G—Ò Ð¢àÐ¢ÂöF—càÐ¢°Ð¢ÐÐ Ð¢gVæ7F–öâ&VæFW%6V7F–öãT÷Vä6öçF–æW%æVÂ‚’°Ð¢6öç7B–çfVçF÷'’ÐÐ¢vWE6V7F–öãT–çfVçF÷'’‚“°Ð Ð¢6öç7B÷Vä6öçF–æW$–BÐÐ¢6ÆVå7G&–ær€Ð¢7&VF÷%7FFRæ÷Vä6öçF–æW$–@Ð¢“°Ð Ð¢–b‚÷Vä6öçF–æW$–B’°Ð¢&WGW&â"#°Ð¢ÐÐ Ð¢6öç7B6öçF–æW"ÐÐ¢–çfVçF÷'’æf–æB‚†—FVÒ’Óâ°Ð¢&WGW&â€Ð¢—FVÒæ–BÓÓÒ÷Vä6öçF–æW$–Bb`Ð¢—FVÒæ—46öçF–æW"ÓÓÒG'VPÐ¢“°Ð¢Ò“°Ð Ð¢–b‚6öçF–æW"’°Ð¢7&VF÷%7FFRæ÷Vä6öçF–æW$–BÒ"#°Ð¢&WGW&â"#°Ð¢ÐÐ Ð¢6öç7B7VÖÖ'’ÐÐ¢vWD6öçF–æW%7VÖÖ&–W2†–çfVçF÷'’Ð¢æf–æB‚†VçG'’’Óâ°Ð¢&WGW&âVçG'’æ–BÓÓÒ÷Vä6öçF–æW$–C°Ð¢Ò’ÇÂ°Ð¢6öçFVçG3¢µÒÀÐ¢66—G•vV–v‡C¢çVÆÂÀÐ¢¶æ÷våvV–v‡C¢ÀÐ¢Væ¶æ÷vä6÷VçC¢ÀÐ¢÷fW$66—G“¢fÇ6PÐ¢Ó°Ð Ð¢6öç7BF—&V7D6öçFVçG2ÐÐ¢vWD6öçF–æW$6öçFVçG2€Ð¢–çfVçF÷'’ÀÐ¢÷Vä6öçF–æW$–@Ð¢“°Ð Ð¢6öç7B6öçFVçD6&G2ÐÐ¢F—&V7D6öçFVçG2æÆVæwF€Ð¢òF—&V7D6öçFVçG0Ð¢æÖ‚†—FVÒ’Óâ°Ð¢6öç7B–æFW‚ÐÐ¢–çfVçF÷'’æf–æD–æFW‚‚†6æF–FFR’Óâ°Ð¢&WGW&â6æF–FFRæ–BÓÓÒ—FVÒæ–C°Ð¢Ò“°Ð Ð¢&WGW&â Ð¢Æ'F–6ÆR6Æ73Ò&†rÖ6†&7FW"Ö6†ö–6RÖ6&B#àÐ¢Æƒ3àÐ¢G¶W66T‡FÖÂ€Ð¢—FVÒææÖRÇÀÐ¢%VææÖVB—FVÒ Ð¢—ÐÐ¢Âöƒ3àÐ Ð¢ÇàÐ¢Æ#åVçF—G“£Âö#àÐ¢G´ÖF‚æÖ‚€Ð¢ÀÐ¢ÖF‚ç&÷VæB€Ð¢6fTçVÖ&W"€Ð¢—FVÒçVçF—G’ÀÐ¢Ð¢Ð¢Ð¢—ÐÐ¢Æ'#àÐ¢Æ#åvV–v‡C£Âö#àÐ¢G°Ð¢—FVÒçvV–v‡BÓÓÒçVÆÂÇÀÐ¢—FVÒçvV–v‡BÓÓÒVæFVf–æV@Ð¢ò%Væ¶æ÷vâ Ð¢¢G·6fTçVÖ&W"€Ð¢—FVÒçvV–v‡BÀÐ¢ Ð¢—ÒÆ"âV6† Ð¢ÐÐ¢Â÷àÐ Ð¢G·&VæFW%6V7F–öãT6öçF–æW$FW7F–æF–öå6VÆV7B€Ð¢–çfVçF÷'’ÀÐ¢—FVÒÀÐ¢–æFW‚ÀÐ¢$Ö÷fR Ð¢—ÐÐ Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"Ö6&BÖ7F–öç2#àÐ¢Æ'WGFöàÐ¢G—SÒ&'WGFöâ Ð¢FFÖ62Ö7F–öãÒ&Ö÷fRÖ—FVÒÖ÷WBÖ6öçF–æW" Ð¢FFÖ–æFWƒÒ"G¶–æFW‡Ò Ð¢àÐ¢Ö÷fR÷W@Ð¢Âö'WGFöãàÐ Ð¢Æ'WGFöàÐ¢G—SÒ&'WGFöâ Ð¢FFÖ62Ö7F–öãÒ'&VÖ÷fRÖ–çfVçF÷'’Ö—FVÒ Ð¢FFÖ–æFWƒÒ"G¶–æFW‡Ò Ð¢àÐ¢&VÖ÷fPÐ¢Âö'WGFöãàÐ¢ÂöF—càÐ¢Âö'F–6ÆSàÐ¢°Ð¢ÒÐ¢æ¦ö–â‚""Ð¢¢ Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"×Æ6V†öÆFW"#àÐ¢F†—26öçF–æW"—2V×G’àÐ¢ÂöF—càÐ¢°Ð Ð¢&WGW&â Ð¢Ç6V7F–öâ6Æ73Ò&†rÖ6†&7FW"Ö7W'&VçBÖ6†ö–6R#àÐ¢Æƒ3àÐ¢÷Vâ6öçF–æW# Ð¢G¶W66T‡FÖÂ€Ð¢6öçF–æW"ææÖRÇÀÐ¢$6öçF–æW" Ð¢—ÐÐ¢Âöƒ3àÐ Ð¢ÇàÐ¢Æ#äF—&V7B6öçFVçG3£Âö#àÐ¢G¶F—&V7D6öçFVçG2æÆVæwF‡ÐÐ¢Æ'#àÐ¢Æ#åW6VB66—G“£Âö#àÐ¢G´çVÖ&W"€Ð¢7VÖÖ'’æ¶æ÷våvV–v‡BçFôf—†VBƒ"Ð¢—ÒÆ"àÐ¢ðÐ¢G°Ð¢7VÖÖ'’æ66—G•vV–v‡BÓÓÒçVÆÀÐ¢ò$æòÖ‚ Ð¢¢G´çVÖ&W"€Ð¢7VÖÖ'’æ66—G•vV–v‡BçFôf—†VBƒ"Ð¢—ÒÆ"æ Ð¢ÐÐ¢Æ'#àÐ¢Æ#åVæ¶æ÷vâvV–v‡G3£Âö#àÐ¢G·7VÖÖ'’çVæ¶æ÷vä6÷VçGÐÐ¢Â÷àÐ Ð¢G°Ð¢7VÖÖ'’æ÷fW$66—GÐ¢ò Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"×v&æ–ær#àÐ¢F†—26öçF–æW"—2÷fW"66—G’àÐ¢ÂöF—càÐ¢ Ð¢¢" Ð¢ÐÐ Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"Ö–æÆ–æRÖ7F–öç2#àÐ¢Æ'WGFöàÐ¢G—SÒ&'WGFöâ Ð¢FFÖ62Ö7F–öãÒ&6Æ÷6RÖ6öçF–æW" Ð¢àÐ¢6Æ÷6PÐ¢Âö'WGFöãàÐ¢ÂöF—càÐ Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"Ö6†ö–6RÖw&–B#àÐ¢G¶6öçFVçD6&G7ÐÐ¢ÂöF—càÐ¢Â÷6V7F–öãàÐ¢°Ð¢ÐÐ Ð¢gVæ7F–öâ&VæFW%6V7F–öãT–çfVçF÷'’‚’°Ð¢6öç7B–çfVçF÷'’ÐÐ¢vWE6V7F–öãT–çfVçF÷'’‚“°Ð Ð¢6öç7Bf—6–&ÆT–çfVçF÷'’ÐÐ¢–çfVçF÷'’æf–ÇFW"‚†—FVÒ’Óâ°Ð¢&WGW&â€Ð¢7&VF÷%7FFRç6†÷t6öçF–æVD—FV×2ÓÓÒG'VRÇÀÐ¢6ÆVå7G&–ær†—FVÒæ6öçF–æW$–BÐ¢“°Ð¢Ò“°Ð Ð¢–b‚f—6–&ÆT–çfVçF÷'’æÆVæwF‚’°Ð¢&WGW&â Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"×Æ6V†öÆFW"#àÐ¢–÷W"–çfVçF÷'’—2V×G’âFBâ—FVÒg&öÒF†PÐ¢6FÆör÷"7&VFR7W7FöÒvV"&VÆ÷ràÐ¢ÂöF—càÐ¢°Ð¢ÐÐ Ð¢&WGW&âf—6–&ÆT–çfVçF÷'Ð¢æÖ‚†—FVÒ’Óâ°Ð¢6öç7B–æFW‚ÐÐ¢–çfVçF÷'’æf–æD–æFW‚‚†6æF–FFR’Óâ°Ð¢&WGW&â6æF–FFRæ–BÓÓÒ—FVÒæ–C°Ð¢Ò“°Ð Ð¢6öç7BVçF—G’ÐÐ¢ÖF‚æÖ‚€Ð¢ÀÐ¢ÖF‚ç&÷VæB€Ð¢6fTçVÖ&W"€Ð¢—FVÒçVçF—G’ÀÐ¢Ð¢Ð¢Ð¢“°Ð Ð¢6öç7BF÷FÅvV–v‡BÐÐ¢—FVÒçvV–v‡BÓÓÒçVÆÂÇÀÐ¢—FVÒçvV–v‡BÓÓÒVæFVf–æV@Ð¢òçVÆÀÐ¢¢€Ð¢ÖF‚æÖ‚€Ð¢ÀÐ¢6fTçVÖ&W"€Ð¢—FVÒçvV–v‡BÀÐ¢ Ð¢Ð¢’ Ð¢VçF—GÐ¢“°Ð Ð¢6öç7B—46öçF–æW$÷VâÐÐ¢—FVÒæ—46öçF–æW"ÓÓÒG'VRb`Ð¢6ÆVå7G&–ær€Ð¢7&VF÷%7FFRæ÷Vä6öçF–æW$–@Ð¢’ÓÓÒ6ÆVå7G&–ær†—FVÒæ–B“°Ð Ð¢6öç7BvVöäGF6²ÐÐ¢—FVÒæWV—VBÓÓÒG'VRb`Ð¢€Ð¢—FVÒæ6FVv÷'’ÓÓÒ'vVöâ"ÇÀÐ¢—FVÒçvVöåG—RÇÀÐ¢—FVÒæFÖvTF–6PÐ¢Ð¢ò6Æ7VÆFUvVöäGF6²€Ð¢7&VF÷%7FFRæG&gBÀÐ¢—FVÐÐ¢Ð¢¢çVÆÃ°Ð Ð¢6öç7BVæF–æu&VÖ÷fÂÐÐ¢6ÆVå7G&–ær€Ð¢7&VF÷%7FFPÐ¢çVæF–æt6öçF–æW%&VÖ÷fÄ–@Ð¢’ÓÓÐÐ¢6ÆVå7G&–ær†—FVÒæ–B“°Ð Ð¢&WGW&â Ð¢Æ'F–6ÆPÐ¢6Æ73Ò Ð¢†rÖ6†&7FW"Ö6†ö–6RÖ6&@Ð¢G°Ð¢—FVÒæWV—V@Ð¢ò'6VÆV7FVB Ð¢¢" Ð¢ÐÐ¢ Ð¢àÐ¢Æƒ3àÐ¢G¶W66T‡FÖÂ€Ð¢—FVÒææÖRÇÀÐ¢%VææÖVB—FVÒ Ð¢—ÐÐ¢Âöƒ3àÐ Ð¢ÇàÐ¢Æ#ä6FVv÷'“£Âö#àÐ Ð¢G¶W66T‡FÖÂ€Ð¢—FVÒæ6FVv÷'’ÇÀÐ¢&Ö—66VÆÆæV÷W2 Ð¢—ÐÐ Ð¢Æ'#àÐ Ð¢Æ#åVçF—G“£Âö#àÐ Ð¢G·VçF—G—ÐÐ Ð¢Æ'#àÐ Ð¢Æ#åvV–v‡C£Âö#àÐ Ð¢G°Ð¢—FVÒçvV–v‡BÓÓÒçVÆÂÇÀÐ¢—FVÒçvV–v‡BÓÓÒVæFVf–æV@Ð¢ò$æ÷B6WB Ð¢¢G·6fTçVÖ&W"€Ð¢—FVÒçvV–v‡BÀÐ¢ Ð¢—ÒÆ"âV6† Ð¢ÐÐ Ð¢G°Ð¢F÷FÅvV–v‡BÓÓÒçVÆÀÐ¢ò" Ð¢¢ Ð¢Æ'#àÐ Ð¢Æ#åF÷FÂvV–v‡C£Âö#àÐ Ð¢G´çVÖ&W"€Ð¢F÷FÅvV–v‡BçFôf—†VB€Ð¢ Ð¢Ð¢—ÒÆ"àÐ¢ Ð¢ÐÐ Ð¢Æ'#àÐ Ð¢Æ#å7FFS£Âö#àÐ Ð¢G°Ð¢—FVÒæ—46öçF–æW Ð¢ò—46öçF–æW$÷VàÐ¢ò$÷Vâ Ð¢¢$6Æ÷6VB Ð¢¢—FVÒæWV—V@Ð¢ò$WV—VB Ð¢¢%7F÷&VB Ð¢ÐÐ Ð¢G°Ð¢—FVÒæGGVæV@Ð¢ò"+rGGVæVB Ð¢¢" Ð¢ÐÐ¢Â÷àÐ Ð¢G°Ð¢—FVÒææ÷FW0Ð¢ò Ð¢Ç6Æ73Ò'6ÖÆÂ#àÐ¢G¶W66T‡FÖÂ€Ð¢—FVÒææ÷FW0Ð¢—ÐÐ¢Â÷àÐ¢ Ð¢¢" Ð¢ÐÐ Ð¢G°Ð¢—FVÒæ—4Öv–6ÂÇÀÐ¢—FVÒç&WV—&W4GGVæVÖVçBÇÀÐ¢—FVÒæ—46öçF–æW"ÇÀÐ¢—FVÒæÖv–6Ä&öçW0Ð¢ò Ð¢Ç6Æ73Ò'6ÖÆÂ#àÐ¢G°Ð¢—FVÒæ—4Öv–6ÀÐ¢ò$Öv–6Â Ð¢¢$×VæFæR Ð¢ÒG°Ð¢—FVÒç&WV—&W4GGVæVÖVç@Ð¢ò"Ò&WV—&W2GGVæVÖVçB Ð¢¢" Ð¢ÒG°Ð¢—FVÒæÖv–6Ä&öçW0Ð¢òÒ&öçW2²G·6fTçVÖ&W"€Ð¢—FVÒæÖv–6Ä&öçW2ÀÐ¢ Ð¢—Ö Ð¢¢" Ð¢ÒG°Ð¢—FVÒæ—46öçF–æW Ð¢òÒ66—G’G°Ð¢—FVÒæ66—G•vV–v‡BÓÓÒçVÆÀÐ¢ò&æ÷B6WB Ð¢¢G·6fTçVÖ&W"€Ð¢—FVÒæ66—G•vV–v‡BÀÐ¢ Ð¢—ÒÆ"æ Ð¢Ö Ð¢¢" Ð¢ÐÐ¢Â÷àÐ¢ Ð¢¢" Ð¢ÐÐ Ð¢G°Ð¢—FVÒæ&6T&Ö÷$6Æ72ÇÀÐ¢—FVÒæ—56†–VÆBÇÀÐ¢—FVÒæ&Ö÷$6FVv÷'Ð¢ò Ð¢Ç6Æ73Ò'6ÖÆÂ#àÐ¢Æ#ä&Ö÷#£Âö#àÐ¢G°Ð¢—FVÒæ—56†–VÆ@Ð¢ò%6†–VÆB Ð¢¢W66T‡FÖÂ€Ð¢—FVÒæ&Ö÷$6FVv÷'’ÇÀÐ¢$&Ö÷" Ð¢Ð¢ÒG°Ð¢—FVÒæ&6T&Ö÷$6Æ70Ð¢òÒ&6R2G·6fTçVÖ&W"€Ð¢—FVÒæ&6T&Ö÷$6Æ72ÀÐ¢ Ð¢—Ö Ð¢¢" Ð¢ÒG°Ð¢—FVÒæÖv–6Ä&Ö÷$6Æ74&öçW0Ð¢òÒ2&öçW2G¶f÷&ÖE6–væVDçVÖ&W"€Ð¢—FVÒæÖv–6Ä&Ö÷$6Æ74&öçW0Ð¢—Ö Ð¢¢" Ð¢ÐÐ¢Â÷àÐ¢ Ð¢¢" Ð¢ÐÐ Ð¢G°Ð¢vVöäGF6°Ð¢ò Ð¢Ç6Æ73Ò'6ÖÆÂ#àÐ¢Æ#äGF6³£Âö#àÐ¢G¶f÷&ÖE6V7F–öãtÖöF–f–W"€Ð¢vVöäGF6²æGF6´&öçW0Ð¢—ÐÐ¢Æ'#àÐ¢Æ#äFÖvS£Âö#àÐ¢G¶W66T‡FÖÂ€Ð¢vVöäGF6²æFÖvTF–6RÇÀÐ¢&FÖvR Ð¢—ÐÐ¢G¶f÷&ÖE6V7F–öãtÖöF–f–W"€Ð¢vVöäGF6²æFÖvTÖöF–f–W Ð¢—ÐÐ¢Æ'#àÐ¢Æ#äGF6·2W"GF6²7F–öã£Âö#àÐ¢G·6fTçVÖ&W"€Ð¢vVöäGF6²æGF6·5W$7F–öâÀÐ¢Ð¢—ÐÐ¢G°Ð¢vVöäGF6²çfW'6F–ÆTFÖvTF–6PÐ¢ò Ð¢Æ'#àÐ¢Æ#åfW'6F–ÆS£Âö#àÐ¢G¶W66T‡FÖÂ€Ð¢vVöäGF6²çfW'6F–ÆTFÖvTF–6PÐ¢—ÐÐ¢G¶f÷&ÖE6V7F–öãtÖöF–f–W"€Ð¢vVöäGF6²æFÖvTÖöF–f–W Ð¢—ÐÐ¢ Ð¢¢" Ð¢ÐÐ¢G°Ð¢vVöäGF6²æÖ'F–Ä'G4VÆ–v–&ÆPÐ¢ò Ð¢Æ'#àÐ¢Æ#äÖ'F–Â'G3£Âö#àÐ¢VÆ–v–&ÆRG°Ð¢vVöäGF6²æÖ'F–Ä'G4Æ–V@Ð¢ò²W6–ærG¶W66T‡FÖÂ‡vVöäGF6²æFÖvTF–6R—Ö Ð¢¢" Ð¢ÐÐ¢ Ð¢¢vVöäGF6²æÖ'F–Ä'G5&W7G&–7F–öàÐ¢òÆ'#ãÆ#äÖ'F–Â'G3£Âö#âG¶W66T‡FÖÂ‡vVöäGF6²æÖ'F–Ä'G5&W7G&–7F–öâ—Ö Ð¢¢" Ð¢ÐÐ¢G°Ð¢vVöäGF6²ç6æV´GF6´VÆ–v–&ÆPÐ¢òÆ'#ãÆ#å6æV²GF6³£Âö#âvVöâVÆ–v–&ÆRf÷"G¶W66T‡FÖÂ‡vVöäGF6²ç6æV´GF6´F–6R—Ó²GfçFvR÷"F†RF¦6VçBÖÆÇ’6öæF—F–öâ—27F–ÆÂ&WV—&VBæ Ð¢¢vVöäGF6²ç6æV´GF6µ&W7G&–7F–öàÐ¢òÆ'#ãÆ#å6æV²GF6³£Âö#âG¶W66T‡FÖÂ‡vVöäGF6²ç6æV´GF6µ&W7G&–7F–öâ—Ö Ð¢¢" Ð¢ÐÐ¢G°Ð¢vVöäGF6²ç&vTFÖvT&öçW0Ð¢òÆ'#ãÆ#å&vS£Âö#âG¶f÷&ÖE6–væVDçVÖ&W"‡vVöäGF6²ç&vTFÖvT&öçW2—ÒFÖvRÆ–VBæ Ð¢¢vVöäGF6²ç&vU&W7G&–7F–öàÐ¢òÆ'#ãÆ#å&vS£Âö#âG¶W66T‡FÖÂ‡vVöäGF6²ç&vU&W7G&–7F–öâ—Ö Ð¢¢" Ð¢ÐÐ¢Â÷àÐ¢ Ð¢¢" Ð¢ÐÐ Ð¢G·&VæFW%6V7F–öãT6öçF–æW$FW7F–æF–öå6VÆV7B€Ð¢–çfVçF÷'’ÀÐ¢—FVÒÀÐ¢–æFW‚ÀÐ¢$6öçF–æW" Ð¢—ÐÐ Ð¢G°Ð¢VæF–æu&VÖ÷fÀÐ¢ò Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"×v&æ–ær#àÐ¢F†—26öçF–æW"†26öçFVçG2âÖ÷fRF†÷6R6öçFVçG2FðÐ¢vVæW&Â–çfVçF÷'’ÂFVÆWFRF†R6öçFVçG2FöòÂ÷"6æ6VÂàÐ Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"Ö–æÆ–æRÖ7F–öç2#àÐ¢Æ'WGFöàÐ¢G—SÒ&'WGFöâ Ð¢FFÖ62Ö7F–öãÒ'&W6öÇfRÖ6öçF–æW"×&VÖ÷fÂ Ð¢FFÖ6öçF–æW"Ö–CÒ"G¶W66T‡FÖÂ€Ð¢—FVÒæ–@Ð¢—Ò Ð¢FF×&VÖ÷fÂÖÖöFSÒ&–çfVçF÷'’ Ð¢àÐ¢Ö÷fR6öçFVçG2÷W@Ð¢Âö'WGFöãàÐ Ð¢Æ'WGFöàÐ¢G—SÒ&'WGFöâ Ð¢FFÖ62Ö7F–öãÒ'&W6öÇfRÖ6öçF–æW"×&VÖ÷fÂ Ð¢FFÖ6öçF–æW"Ö–CÒ"G¶W66T‡FÖÂ€Ð¢—FVÒæ–@Ð¢—Ò Ð¢FF×&VÖ÷fÂÖÖöFSÒ&FVÆWFR Ð¢àÐ¢FVÆWFR6öçFVçG0Ð¢Âö'WGFöãàÐ Ð¢Æ'WGFöàÐ¢G—SÒ&'WGFöâ Ð¢FFÖ62Ö7F–öãÒ'&W6öÇfRÖ6öçF–æW"×&VÖ÷fÂ Ð¢FFÖ6öçF–æW"Ö–CÒ"G¶W66T‡FÖÂ€Ð¢—FVÒæ–@Ð¢—Ò Ð¢FF×&VÖ÷fÂÖÖöFSÒ&6æ6VÂ Ð¢àÐ¢6æ6VÀÐ¢Âö'WGFöãàÐ¢ÂöF—càÐ¢ÂöF—càÐ¢ Ð¢¢" Ð¢ÐÐ Ð¢G·&VæFW%6V7F–öãT—FVÔVF—D6öçG&öÇ2€Ð¢—FVÒÀÐ¢–æFW€Ð¢—ÐÐ Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"Ö6&BÖ7F–öç2#àÐ¢ÆF—`Ð¢6Æ73Ò&†rÖ6†&7FW"×VçF—G’Ö6öçG&öÂ Ð¢&–ÖÆ&VÃÒ%VçF—G’6öçG&öÇ2f÷"G¶W66T‡FÖÂ€Ð¢—FVÒææÖRÇÂ&—FVÒ Ð¢—Ò Ð¢àÐ¢Æ'WGFöàÐ¢G—SÒ&'WGFöâ Ð¢FFÖ62Ö7F–öãÒ&FV7&V6RÖ—FVÒ×VçF—G’ Ð¢FFÖ–æFWƒÒ"G¶–æFW‡Ò Ð¢&–ÖÆ&VÃÒ$FV7&V6RVçF—G’ Ð¢àÐ¢ÐÐ¢Âö'WGFöãàÐ Ð¢Ç7â&–ÖÆ&VÃÒ%VçF—G’#àÐ¢G·VçF—G—ÐÐ¢Â÷7ãàÐ Ð¢Æ'WGFöàÐ¢G—SÒ&'WGFöâ Ð¢FFÖ62Ö7F–öãÒ&–æ7&V6RÖ—FVÒ×VçF—G’ Ð¢FFÖ–æFWƒÒ"G¶–æFW‡Ò Ð¢&–ÖÆ&VÃÒ$–æ7&V6RVçF—G’ Ð¢àÐ¢°Ð¢Âö'WGFöãàÐ¢ÂöF—càÐ Ð¢Æ'WGFöàÐ¢G—SÒ&'WGFöâ Ð¢6Æ73Ò&†rÖ6†&7FW"Ö†–FFVâ×VçF—G’Ö'WGFöâ Ð¢FFÖ62Ö7F–öãÒ&FV7&V6RÖ—FVÒ×VçF—G’ Ð¢FFÖ–æFWƒÒ"G¶–æFW‡Ò Ð¢àÐ¢(‰"VçF—GÐ¢Âö'WGFöãàÐ Ð¢Æ'WGFöàÐ¢G—SÒ&'WGFöâ Ð¢6Æ73Ò&†rÖ6†&7FW"Ö†–FFVâ×VçF—G’Ö'WGFöâ Ð¢FFÖ62Ö7F–öãÒ&–æ7&V6RÖ—FVÒ×VçF—G’ Ð¢FFÖ–æFWƒÒ"G¶–æFW‡Ò Ð¢àÐ¢²VçF—GÐ¢Âö'WGFöãàÐ Ð¢Æ'WGFöàÐ¢G—SÒ&'WGFöâ Ð¢FFÖ62Ö7F–öãÒ'FövvÆRÖ—FVÒÖWV—VB Ð¢FFÖ–æFWƒÒ"G¶–æFW‡Ò Ð¢G°Ð¢—FVÒæ—46öçF–æW Ð¢òw7G–ÆSÒ&F—7Æ“¦æöæR"&–Ö†–FFVãÒ'G'VR"F—6&ÆVBpÐ¢¢" Ð¢ÐÐ¢àÐ¢G°Ð¢—FVÒæWV—V@Ð¢ò%VæWV— Ð¢¢$WV— Ð¢ÐÐ¢Âö'WGFöãàÐ Ð¢G°Ð¢—FVÒæ—46öçF–æW Ð¢ò Ð¢Æ'WGFöàÐ¢G—SÒ&'WGFöâ Ð¢FFÖ62Ö7F–öãÒ&÷VâÖ6öçF–æW" Ð¢FFÖ–æFWƒÒ"G¶–æFW‡Ò Ð¢àÐ¢G°Ð¢—46öçF–æW$÷VàÐ¢ò$6Æ÷6R Ð¢¢$÷Vâ Ð¢ÐÐ¢Âö'WGFöãàÐ¢ Ð¢¢" Ð¢ÐÐ Ð¢Æ'WGFöàÐ¢G—SÒ&'WGFöâ Ð¢FFÖ62Ö7F–öãÒ'FövvÆRÖ—FVÒÖGGVæVB Ð¢FFÖ–æFWƒÒ"G¶–æFW‡Ò Ð¢G°Ð¢—FVÒæ—4Öv–6Âb`Ð¢—FVÒç&WV—&W4GGVæVÖVç@Ð¢ò" Ð¢¢w7G–ÆSÒ&F—7Æ“¦æöæR"&–Ö†–FFVãÒ'G'VR"F—6&ÆVBpÐ¢ÐÐ¢àÐ¢G°Ð¢—FVÒæGGVæV@Ð¢ò%&VÖ÷fRGGVæVÖVçB Ð¢¢$GGVæR Ð¢ÐÐ¢Âö'WGFöãàÐ Ð¢Æ'WGFöàÐ¢G—SÒ&'WGFöâ Ð¢FFÖ62Ö7F–öãÒ'&VÖ÷fRÖ–çfVçF÷'’Ö—FVÒ Ð¢FFÖ–æFWƒÒ"G¶–æFW‡Ò Ð¢àÐ¢&VÖ÷fPÐ¢Âö'WGFöãàÐ¢ÂöF—càÐ¢Âö'F–6ÆSàÐ¢°Ð¢ÒÐ¢æ¦ö–â‚""“°Ð¢ÐÐ Ð¢6öç7BWV—ÖVçE7FWÒ7&VFTWV—ÖVçE7FW‡°Ð¢6†&VE6W'f–6W3¢6†&VE7FW6W'f–6W2ÀÐ¢$”Ä•E•ôDTd”ä•D”ôå2ÀÐ¢FE6V7F–öãT6FÆöt—FVÒÀÐ¢FE6V7F–öãT7W7FöÔ—FVÒÀÐ¢6Æ7VÆFT6†&7FW$6''––æt66—G’ÀÐ¢6†ævU6V7F–öãUVçF—G’ÀÐ¢vWD6†&7FW$GGVæVÖVçDÆ–Ö—BÀÐ¢vWE6V7F–öãTGGVæVD—FVÔ6÷VçBÀÐ¢vWE6V7F–öãT–çfVçF÷'’ÀÐ¢vWE6V7F–öãT–çfVçF÷'”6÷VçBÀÐ¢vWE6V7F–öãT6FÆöuvRÀÐ¢vWE6V7F–öãUF÷FÅvV–v‡BÀÐ¢vWE6V7F–öãUVæ¶æ÷våvV–v‡D6÷VçBÀÐ¢Ö÷fU6V7F–öãT—FVÕFô6öçF–æW"ÀÐ¢&VÖ÷fU6V7F–öãT—FVÒÀÐ¢&VæFW%6V7F–öãT6FÆörÀÐ¢&VæFW%6V7F–öãT–çfVçF÷'’ÀÐ¢&VæFW%6V7F–öãT÷Vä6öçF–æW%æVÂÀÐ¢FövvÆU6V7F–öãT—FVÕ7FFRÀÐ¢WFFU6V7F–öãT–çfVçF÷'”—FVÐÐ¢Ò“°Ð Ð¢6öç7B°Ð¢&VæFW$WV—ÖVçE7FWÀÐ¢f–æE6V7F–öãT7F–öäVÆVÖVçBÀÐ¢vWE6V7F–öãT7F–öä–æFW‚ÀÐ¢†æFÆU6V7F–öãTFD6FÆöt—FVÒÀÐ¢†æFÆU6V7F–öãTFD7W7FöÔ—FVÒÀÐ¢†æFÆU6V7F–öãU6¶—WV—ÖVçBÀÐ¢†æFÆU6V7F–öãUFövvÆT6öçF–æVD—FV×2ÀÐ¢†æFÆU6V7F–öãT÷Vä6öçF–æW"ÀÐ¢†æFÆU6V7F–öãT6Æ÷6T6öçF–æW"ÀÐ¢†æFÆU6V7F–öãTÖ÷fT—FVÔ÷WBÀÐ¢†æFÆU6V7F–öãT6†ævUVçF—G’ÀÐ¢†æFÆU6V7F–öãU&VÖ÷fT—FVÒÀÐ¢†æFÆU6V7F–öãU&W6öÇfT6öçF–æW%&VÖ÷fÂÀÐ¢†æFÆU6V7F–öãUFövvÆU7FFRÀÐ¢†æFÆU6V7F–öãT6†ævPÐ¢ÒÒWV—ÖVçE7FWæ6ö×F–&–Æ—G“°Ð Ð¢&Vv—7FW$6†&7FW%7FW&VæFW&W"€Ð¢&WV—ÖVçB"ÀÐ¢WV—ÖVçE7FWç&VæFW%7FW Ð¢“°Ð Ð¢WV—ÖVçE7FWæ7F–öç2æf÷$V6‚‚†7F–öâ’Óâ°Ð¢&Vv—7FW$6†&7FW$7&VF÷$7F–öâ€Ð¢7F–öâÀÐ¢†6öçFW‡B’Óâ°Ð¢&WGW&âWV—ÖVçE7FWæ†æFÆU7FW6Æ–6²€Ð¢6öçFW‡@Ð¢“°Ð¢ÐÐ¢“°Ð¢Ò“°Ð Ð¢&Vv—7FW$6†&7FW$7&VF÷$–çWD†æFÆW"€Ð¢WV—ÖVçE7FWæ†æFÆU7FW–çW@Ð¢“°Ð Ð¢&Vv—7FW$6†&7FW$7&VF÷$6†ævT†æFÆW"€Ð¢WV—ÖVçE7FWæ†æFÆU7FW6†ævPÐ¢“°Ð Ð¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÐÐ¢òò4„$5DU"5$TDõ"4T5D”ôâb(	B5TÄÅ2òdTEU$U0Ð¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÐÐ Ð¢gVæ7F–öâæ÷&ÖÆ—¦U6V7F–öãe7VÆÂ€Ð¢&u7VÆÂÀÐ¢fÆÆ&6µ6÷W&6RÒ&7W7FöÒ Ð¢’°Ð¢6öç7B&rÒ&u7VÆÂÇÂ·Ó°Ð Ð¢6öç7BæÖRÐÐ¢6fTF—7Æ•7G&–ær€Ð¢&rææÖRÀÐ¢%VææÖVB7VÆÂ Ð¢“°Ð Ð¢6öç7BÆWfVÂÒÖF‚æÖ‚€Ð¢ÀÐ¢ÖF‚æÖ–â€Ð¢’ÀÐ¢ÖF‚ç&÷VæB€Ð¢6fTçVÖ&W"€Ð¢&ræÆWfVÂÀÐ¢ Ð¢Ð¢Ð¢Ð¢“°Ð Ð¢&WGW&â°Ð¢ââæ6ÆöæTFF‡&r’ÀÐ Ð¢–C¢Ö¶U6fT–B€Ð¢&ræ–BÇÀÐ¢G¶æÖWÒÒG¶ÆWfVÇÒÒG´FFRææ÷r‚—ÒÒG´ÖF‚ç&æFöÒ‚—ÖÀÐ¢&7W7FöÒ×7VÆÂ Ð¢’ÀÐ Ð¢æÖRÀÐ¢ÆWfVÂÀÐ Ð¢66†ööÃ Ð¢6fTF—7Æ•7G&–ær€Ð¢&rç66†ööÂÀÐ¢%Væ¶æ÷vâ Ð¢’ÀÐ Ð¢67F–æuF–ÖS Ð¢6fTF—7Æ•7G&–ær€Ð¢&ræ67F–æuF–ÖRÀÐ¢#7F–öâ Ð¢’ÀÐ Ð¢&ævS Ð¢6fTF—7Æ•7G&–ær€Ð¢&rç&ævRÀÐ¢%6VÆb Ð¢’ÀÐ Ð¢GW&F–öã Ð¢6fTF—7Æ•7G&–ær€Ð¢&ræGW&F–öâÀÐ¢$–ç7FçFæV÷W2 Ð¢’ÀÐ Ð¢6ö×öæVçG3 Ð¢6fTF—7Æ•7G&–ær€Ð¢&ræ6ö×öæVçG0Ð¢’ÀÐ Ð¢FW67&—F–öã Ð¢6fTF—7Æ•7G&–ær€Ð¢&ræFW67&—F–öâÇÀÐ¢&rç7VÖÖ'Ð¢’ÀÐ Ð¢7VÖÖ'“ Ð¢6fTF—7Æ•7G&–ær€Ð¢&rç7VÖÖ'’ÇÀÐ¢&ræFW67&—F–öàÐ¢’ÀÐ Ð¢6Æ74–C Ð¢6ÆVå7G&–ær€Ð¢&ræ6Æ74–@Ð¢’ÀÐ Ð¢6Æ74VçG'”–C Ð¢6ÆVå7G&–ær€Ð¢&ræ6Æ74VçG'”–BÇÀÐ¢&ræVçG'”–@Ð¢’ÀÐ Ð¢7VÆÆ67F–æu6÷W&6T–C Ð¢6ÆVå7G&–ær€Ð¢&ræ6Æ74VçG'”–BÇÀÐ¢&rç7VÆÆ67F–æu6÷W&6T–BÇÀÐ¢&ræ6Æ74–@Ð¢’ÀÐ Ð¢6Æ76W3¢6ÆVä'&’€Ð¢&ræ6Æ76W2ÇÀÐ¢€Ð¢&ræ6Æ74–@Ð¢ò·&ræ6Æ74–EÐÐ¢¢µÐÐ¢Ð¢’ÀÐ Ð¢6÷W&6S Ð¢6fTF—7Æ•7G&–ær€Ð¢&rç6÷W&6RÀÐ¢fÆÆ&6µ6÷W&6PÐ¢’ÀÐ Ð¢–ææFS Ð¢&ræ–ææFRÓÓÒG'VRÀÐ Ð¢–ææFU6÷W&6S Ð¢6ÆVå7G&–ær€Ð¢&ræ–ææFU6÷W&6PÐ¢’ÀÐ Ð¢Ö–æ–×VÔÆWfVÃ Ð¢ÖF‚æÖ‚€Ð¢ÀÐ¢ÖF‚ç&÷VæB€Ð¢6fTçVÖ&W"€Ð¢&ræÖ–æ–×VÔÆWfVÂÀÐ¢Ð¢Ð¢Ð¢’ÀÐ Ð¢7VÆÆ67F–æt&–Æ—G“ Ð¢6ÆVå7G&–ær€Ð¢&rç7VÆÆ67F–æt&–Æ—GÐ¢’ÀÐ Ð¢&—GVÃ Ð¢&rç&—GVÂÓÓÒG'VRÀÐ Ð¢6öæ6VçG&F–öã Ð¢&ræ6öæ6VçG&F–öâÓÓÒG'VRÀÐ Ð¢ÖçVÄ÷fW'&–FS Ð¢&ræÖçVÄ÷fW'&–FRÓÓÒG'VPÐ¢Ó°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öãd7W7FöÕ7VÆÇ2‚’°Ð¢–b€Ð¢'&’æ—4'&’€Ð¢7&VF÷%7FFRæG&g@Ð¢æÖv–0Ð¢æ7W7FöÕ7VÆÇ0Ð¢Ð¢’°Ð¢7&VF÷%7FFRæG&g@Ð¢æÖv–0Ð¢æ7W7FöÕ7VÆÇ2ÒµÓ°Ð¢ÐÐ Ð¢&WGW&â7&VF÷%7FFRæG&g@Ð¢æÖv–0Ð¢æ7W7FöÕ7VÆÇ3°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öãd–ææFU7VÆÇ2€Ð¢6†&7FW"Ò7&VF÷%7FFRæG&g@Ð¢’°Ð¢6öç7BÖv–2ÐÐ¢6†&7FW#òæÖv–2ÇÂ·Ó°Ð Ð¢&WGW&â€Ð¢'&’æ—4'&’†Öv–2æ–ææFU7VÆÇ2Ð¢òÖv–2æ–ææFU7VÆÇ0Ð¢¢µÐÐ¢’æÖ‚‡7VÆÂ’Óâ°Ð¢&WGW&âæ÷&ÖÆ—¦U6V7F–öãe7VÆÂ€Ð¢7VÆÂÀÐ¢7VÆÃòç6÷W&6RÇÂ&–ææFR Ð¢“°Ð¢Ò“°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öãd¶æ÷vå7VÆÄ–G2‚’°Ð¢–b€Ð¢'&’æ—4'&’€Ð¢7&VF÷%7FFRæG&g@Ð¢æÖv–0Ð¢æ¶æ÷vå7VÆÄ–G0Ð¢Ð¢’°Ð¢7&VF÷%7FFRæG&g@Ð¢æÖv–0Ð¢æ¶æ÷vå7VÆÄ–G2ÒµÓ°Ð¢ÐÐ Ð¢&WGW&â7&VF÷%7FFRæG&g@Ð¢æÖv–0Ð¢æ¶æ÷vå7VÆÄ–G3°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öãe&W&VE7VÆÄ–G2‚’°Ð¢–b€Ð¢'&’æ—4'&’€Ð¢7&VF÷%7FFRæG&g@Ð¢æÖv–0Ð¢ç&W&VE7VÆÄ–G0Ð¢Ð¢’°Ð¢7&VF÷%7FFRæG&g@Ð¢æÖv–0Ð¢ç&W&VE7VÆÄ–G2ÒµÓ°Ð¢ÐÐ Ð¢&WGW&â7&VF÷%7FFRæG&g@Ð¢æÖv–0Ð¢ç&W&VE7VÆÄ–G3°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öãe7VÆÄ'”–B€Ð¢7VÆÄ–BÀÐ¢6†&7FW"Ò7&VF÷%7FFRæG&g@Ð¢’°Ð¢6öç7B–æÆ–æU7V&6Æ75&VfW&Væ6RÐÐ¢vWE7VÆÆ67F–æt6Æ74÷F–öç2€Ð¢6†&7FW Ð¢Ð¢æfÆDÖ‚†VçG'’’Óâ°Ð¢&WGW&âö&¦V7BçfÇVW2€Ð¢VçG'“òæW‡æFVE7VÆÇ2ÇÂ·ÐÐ¢’æfÆB‚“°Ð¢ÒÐ¢æf–æB‚‡7VÆÅ&VfW&Væ6R’Óâ°Ð¢&WGW&â€Ð¢7VÆÅ&VfW&Væ6Rb`Ð¢G—Vöb7VÆÅ&VfW&Væ6RÓÓÐÐ¢&ö&¦V7B"b`Ð¢7VÆÅ&VfW&Væ6PÐ¢æ–æÆ–æTfÆÆ&6²ÓÓÒG'VRb`Ð¢vWE6V7F–öãe7VÆÅ&VfW&Væ6T–B€Ð¢7VÆÅ&VfW&Væ6PÐ¢’ÓÓÒ7VÆÄ–@Ð¢“°Ð¢Ò“°Ð Ð¢&WGW&â€Ð¢DTdTÅEõ5TÄÅ2æf–æB‚‡7VÆÂ’Óâ°Ð¢&WGW&â7VÆÂæ–BÓÓÒ7VÆÄ–C°Ð¢Ò’ÇÀÐ¢€Ð¢'&’æ—4'&’€Ð¢6†&7FW#òæÖv–3òæ7W7FöÕ7VÆÇ0Ð¢Ð¢ò6†&7FW"æÖv–2æ7W7FöÕ7VÆÇ0Ð¢¢µÐÐ¢’æf–æB‚‡7VÆÂ’Óâ°Ð¢&WGW&â7VÆÂæ–BÓÓÒ7VÆÄ–C°Ð¢Ò’ÇÀÐ¢€Ð¢–æÆ–æU7V&6Æ75&VfW&Væ6PÐ¢ò°Ð¢–C¢7VÆÄ–BÀÐ¢æÖS¢6ÆVå7G&–ær€Ð¢–æÆ–æU7V&6Æ75&VfW&Væ6PÐ¢ææÖRÀÐ¢7VÆÄ–@Ð¢’ÀÐ¢ÆWfVÃ¢ÖF‚æÖ‚€Ð¢ÀÐ¢6fTçVÖ&W"€Ð¢–æÆ–æU7V&6Æ75&VfW&Væ6PÐ¢æÆWfVÂÀÐ¢ Ð¢Ð¢’ÀÐ¢66†ööÃ¢6ÆVå7G&–ær€Ð¢–æÆ–æU7V&6Æ75&VfW&Væ6PÐ¢ç66†ööÂÀÐ¢'7V&6Æ72 Ð¢’ÀÐ¢6Æ76W3¢µÒÀÐ¢7V&6Æ76W3¢µÒÀÐ¢6÷W&6UG—S Ð¢&ÆVv7’Öæöâ×7&B"ÀÐ¢6÷W&6TÆ&VÃ Ð¢$ÆVv7’VR7V&6Æ727VÆÂ&VfW&Væ6R"ÀÐ¢'VÆW4VF—F–öã¢##B"ÀÐ¢–æÆ–æU7V&6Æ757VÆÃ¢G'VPÐ¢ÐÐ¢¢çVÆÀÐ¢’ÇÀÐ¢çVÆÀÐ¢“°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öãd6Æ756÷W&6U7F÷&R€Ð¢6†&7FW"Ò7&VF÷%7FFRæG&g@Ð¢’°Ð¢–b‚6†&7FW"æÖv–2’°Ð¢6†&7FW"æÖv–2Ò·Ó°Ð¢ÐÐ Ð¢–b€Ð¢6†&7FW"æÖv–2æ6Æ756÷W&6W2ÇÀÐ¢G—Vöb6†&7FW"æÖv–2æ6Æ756÷W&6W2ÓÒ&ö&¦V7B"ÇÀÐ¢'&’æ—4'&’†6†&7FW"æÖv–2æ6Æ756÷W&6W2Ð¢’°Ð¢6†&7FW"æÖv–2æ6Æ756÷W&6W2Ò·Ó°Ð¢ÐÐ Ð¢&WGW&â6†&7FW"æÖv–2æ6Æ756÷W&6W3°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öãe6÷W&6T¶W’†VçG'’’°Ð¢&WGW&â6ÆVå7G&–ær€Ð¢VçG'“òæ6Æ74VçG'”–BÇÀÐ¢VçG'“òæVçG'”–BÇÀÐ¢VçG'“òæ6Æ74–@Ð¢“°Ð¢ÐÐ Ð¢6öç7B4T5D”ôãeõ5TÄÅõ$TdU$Tä4UôÄ”4U2ÐÐ¢ö&¦V7Bæg&VW¦R‡°Ð¢&ÖVÆg2Ö6–BÖ'&÷r#¢&6–BÖ'&÷r"ÀÐ¢&ÖVÆb×2Ö6–BÖ'&÷r#¢&6–BÖ'&÷r"ÀÐ¢&ÆVö×VæG2×6V7&WBÖ6†W7B#¢'6V7&WBÖ6†W7B"ÀÐ¢&Ö÷&FVæ¶–æVç2Öf—F†gVÂÖ†÷VæB#¢&f—F†gVÂÖ†÷VæB"ÀÐ¢&Ö÷&FVæ¶–æVç2×&—fFR×6æ7GVÒ#¢'&—fFR×6æ7GVÒ"ÀÐ¢&÷F–ÇV¶W2×&W6–Æ–VçB×7†W&R#¢'&W6–Æ–VçB×7†W&R"ÀÐ¢&&–v'—2Ö†æB#¢&&6æRÖ†æB Ð¢Ò“°Ð Ð¢gVæ7F–öâvWE6V7F–öãe7VÆÅ&VfW&Væ6T–B€Ð¢7VÆÅ&VfW&Væ6PÐ¢’°Ð¢6öç7B&t–BÒÖ¶U6fT–B€Ð¢7VÆÅ&VfW&Væ6Sòæ–BÇÀÐ¢7VÆÅ&VfW&Væ6SòææÖRÇÀÐ¢7VÆÅ&VfW&Væ6RÀÐ¢" Ð¢“°Ð Ð¢&WGW&â4T5D”ôãeõ5TÄÅõ$TdU$Tä4UôÄ”4U5°Ð¢&t–@Ð¢ÒÇÂ&t–C°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öãdW‡æFVE7VÆÄw&çG2€Ð¢VçG'Ð¢’°Ð¢6öç7BW‡æFVE7VÆÇ2ÐÐ¢VçG'“òæW‡æFVE7VÆÇ2b`Ð¢G—VöbVçG'’æW‡æFVE7VÆÇ2ÓÓÒ&ö&¦V7B"b`Ð¢'&’æ—4'&’†VçG'’æW‡æFVE7VÆÇ2Ð¢òVçG'’æW‡æFVE7VÆÇ0Ð¢¢·Ó°Ð¢6öç7B6Æ74ÆWfVÂÒÖF‚æÖ‚€Ð¢ÀÐ¢6fTçVÖ&W"†VçG'“òæÆWfVÂÂÐ¢“°Ð Ð¢&WGW&âö&¦V7BæVçG&–W2†W‡æFVE7VÆÇ2Ð¢æf–ÇFW"‚…·VæÆö6´ÆWfVÅÒ’Óâ°Ð¢&WGW&â€Ð¢6fTçVÖ&W"‡VæÆö6´ÆWfVÂÂ’ÃÐÐ¢6Æ74ÆWfVÀÐ¢“°Ð¢ÒÐ¢æfÆDÖ‚…·VæÆö6´ÆWfVÂÂ7VÆÇ5Ò’Óâ°Ð¢&WGW&â€Ð¢'&’æ—4'&’‡7VÆÇ2Ð¢ò7VÆÇ0Ð¢¢µÐÐ¢’æÖ‚‡7VÆÅ&VfW&Væ6R’Óâ°Ð¢6öç7B7VÆÄ–BÐÐ¢vWE6V7F–öãe7VÆÅ&VfW&Væ6T–B€Ð¢7VÆÅ&VfW&Væ6PÐ¢“°Ð¢6öç7B7VÆÂÐÐ¢vWE6V7F–öãe7VÆÄ'”–B‡7VÆÄ–B“°Ð Ð¢&WGW&â°Ð¢7VÆÄ–BÀÐ¢7VÆÂÀÐ¢æÖS¢6ÆVå7G&–ær€Ð¢7VÆÅ&VfW&Væ6SòææÖRÇÀÐ¢7VÆÃòææÖRÇÀÐ¢7VÆÄ–@Ð¢’ÀÐ¢VæÆö6´ÆWfVÃ Ð¢6fTçVÖ&W"‡VæÆö6´ÆWfVÂÂ’ÀÐ¢Çv—5&W&VC Ð¢7VÆÅ&VfW&Væ6SòæÇv—5&W&VBÓÓÐÐ¢G'VRÀÐ¢6÷VçG4v–ç7E&W&VDÆ–Ö—C Ð¢7VÆÅ&VfW&Væ6PÐ¢òæ6÷VçG4v–ç7E&W&VDÆ–Ö—BÓÐÐ¢fÇ6PÐ¢Ó°Ð¢Ò“°Ð¢ÒÐ¢æf–ÇFW"‚†w&çB’Óâ°Ð¢&WGW&â&ööÆVâ†w&çBç7VÆÄ–B“°Ð¢Ò“°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öãdW‡æFVE7VÆÄw&çB€Ð¢VçG'’ÀÐ¢7VÆÀÐ¢’°Ð¢&WGW&âvWE6V7F–öãdW‡æFVE7VÆÄw&çG2€Ð¢VçG'Ð¢’æf–æB‚†w&çB’Óâ°Ð¢&WGW&âw&çBç7VÆÄ–BÓÓÒ7VÆÃòæ–C°Ð¢Ò’ÇÂçVÆÃ°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öãd×—7F–4&6çVÔÆWfVÇ2€Ð¢VçG'Ð¢’°Ð¢–b€Ð¢6ÆVå7G&–ær†VçG'“òæ6Æ74–B’ÓÐÐ¢'v&Æö6² Ð¢’°Ð¢&WGW&âµÓ°Ð¢ÐÐ Ð¢6öç7BÆWfVÂÒ6fTçVÖ&W"€Ð¢VçG'“òæÆWfVÂÀÐ¢ Ð¢“°Ð Ð¢&WGW&â°Ð¢³ÂeÒÀÐ¢³2ÂuÒÀÐ¢³RÂ…ÒÀÐ¢³rÂ•ÐÐ¢ÐÐ¢æf–ÇFW"‚…·VæÆö6´ÆWfVÅÒ’Óâ°Ð¢&WGW&âÆWfVÂãÒVæÆö6´ÆWfVÃ°Ð¢ÒÐ¢æÖ‚…²Â7VÆÄÆWfVÅÒ’Óâ°Ð¢&WGW&â7VÆÄÆWfVÃ°Ð¢Ò“°Ð¢ÐÐ Ð¢gVæ7F–öâ—56V7F–öãd×—7F–4&6çVÕ7VÆÂ€Ð¢VçG'’ÀÐ¢7VÆÀÐ¢’°Ð¢&WGW&â€Ð¢vWE6V7F–öãd×—7F–4&6çVÔÆWfVÇ2€Ð¢VçG'Ð¢’æ–æ6ÇVFW2€Ð¢6fTçVÖ&W"‡7VÆÃòæÆWfVÂÂÐ¢’b`Ð¢6ÆVä'&’‡7VÆÃòæ6Æ76W2Ð¢æ–æ6ÇVFW2‚'v&Æö6²"Ð¢“°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öãe6÷W&6U7FFR€Ð¢VçG'’ÀÐ¢÷F–öç2Ò·ÐÐ¢’°Ð¢6öç7B6÷W&6T¶W’ÐÐ¢vWE6V7F–öãe6÷W&6T¶W’†VçG'’“°Ð Ð¢–b‚6÷W&6T¶W’’°Ð¢&WGW&âçVÆÃ°Ð¢ÐÐ Ð¢6öç7B7F÷&RÐÐ¢vWE6V7F–öãd6Æ756÷W&6U7F÷&R€Ð¢÷F–öç2æ6†&7FW"ÇÀÐ¢7&VF÷%7FFRæG&g@Ð¢“°Ð Ð¢–b‚7F÷&U·6÷W&6T¶W•Ò’°Ð¢–b†÷F–öç2æ7&VFRÓÓÒfÇ6R’°Ð¢&WGW&âçVÆÃ°Ð¢ÐÐ Ð¢7F÷&U·6÷W&6T¶W•ÒÒ°Ð¢6Æ74VçG'”–C¢6÷W&6T¶W’ÀÐ¢6Æ74–C¢6ÆVå7G&–ær†VçG'“òæ6Æ74–B’ÀÐ¢6Æ74æÖS¢6ÆVå7G&–ær†VçG'“òæ6Æ74æÖR’ÀÐ¢7V&6Æ74–C¢6ÆVå7G&–ær†VçG'“òç7V&6Æ74–B’ÀÐ¢7V&6Æ74æÖS¢6ÆVå7G&–ær†VçG'“òç7V&6Æ74æÖR’ÀÐ¢7VÆÄÆ—7D6Æ74–C¢6ÆVå7G&–ær€Ð¢VçG'“òç7VÆÄÆ—7D6Æ74–BÇÀÐ¢VçG'“òæ6Æ74–@Ð¢’ÀÐ¢7VÆÆ67F–æt&–Æ—G“¢6ÆVå7G&–ær€Ð¢VçG'“òç7VÆÆ67F–æt&–Æ—GÐ¢’ÀÐ¢7VÆÅ6fTF3 Ð¢VçG'“òç7VÆÅ6fTF2óòçVÆÂÀÐ¢7VÆÄGF6´&öçW3 Ð¢VçG'“òç7VÆÄGF6´&öçW2óòçVÆÂÀÐ¢&W&F–öäÖöFS Ð¢vWE6V7F–öãe&W&F–öäÖöFR†VçG'’’ÀÐ¢6çG&—–G3¢µÒÀÐ¢¶æ÷vå7VÆÄ–G3¢µÒÀÐ¢&W&VE7VÆÄ–G3¢µÒÀÐ¢7VÆÆ&ööµ7VÆÄ–G3¢µÒÀÐ¢Çv—5&W&VE7VÆÄ–G3¢µÒÀÐ¢×—7F–4&6çVÕ7VÆÄ–G3¢·ÐÐ¢Ó°Ð¢ÐÐ Ð¢6öç7B6÷W&6RÒ7F÷&U·6÷W&6T¶W•Ó°Ð¢6÷W&6Ræ6Æ74VçG'”–BÒ6÷W&6T¶W“°Ð¢6÷W&6Ræ6Æ74–BÒ6ÆVå7G&–ær€Ð¢VçG'“òæ6Æ74–BÇÂ6÷W&6Ræ6Æ74–@Ð¢“°Ð¢6÷W&6Ræ6Æ74æÖRÒ6ÆVå7G&–ær€Ð¢VçG'“òæ6Æ74æÖRÇÂ6÷W&6Ræ6Æ74æÖPÐ¢“°Ð¢6÷W&6Rç7V&6Æ74–BÒ6ÆVå7G&–ær€Ð¢VçG'“òç7V&6Æ74–BÇÂ6÷W&6Rç7V&6Æ74–@Ð¢“°Ð¢6÷W&6Rç7V&6Æ74æÖRÒ6ÆVå7G&–ær€Ð¢VçG'“òç7V&6Æ74æÖRÇÀÐ¢6÷W&6Rç7V&6Æ74æÖPÐ¢“°Ð¢6÷W&6Rç7VÆÄÆ—7D6Æ74–BÒ6ÆVå7G&–ær€Ð¢VçG'“òç7VÆÄÆ—7D6Æ74–BÇÀÐ¢6÷W&6Rç7VÆÄÆ—7D6Æ74–BÇÀÐ¢6÷W&6Ræ6Æ74–@Ð¢“°Ð¢6÷W&6Rç7VÆÆ67F–æt&–Æ—G’Ò6ÆVå7G&–ær€Ð¢VçG'“òç7VÆÆ67F–æt&–Æ—G’ÇÀÐ¢6÷W&6Rç7VÆÆ67F–æt&–Æ—GÐ¢“°Ð¢6÷W&6Rç7VÆÅ6fTF2ÐÐ¢VçG'“òç7VÆÅ6fTF2óðÐ¢6÷W&6Rç7VÆÅ6fTF2óðÐ¢çVÆÃ°Ð¢6÷W&6Rç7VÆÄGF6´&öçW2ÐÐ¢VçG'“òç7VÆÄGF6´&öçW2óðÐ¢6÷W&6Rç7VÆÄGF6´&öçW2óðÐ¢çVÆÃ°Ð¢6÷W&6Rç&W&F–öäÖöFRÐÐ¢vWE6V7F–öãe&W&F–öäÖöFR†VçG'’“°Ð Ð¢°Ð¢&6çG&—–G2"ÀÐ¢&¶æ÷vå7VÆÄ–G2"ÀÐ¢'&W&VE7VÆÄ–G2"ÀÐ¢'7VÆÆ&ööµ7VÆÄ–G2"ÀÐ¢&Çv—5&W&VE7VÆÄ–G2 Ð¢Òæf÷$V6‚‚†f–VÆB’Óâ°Ð¢6÷W&6U¶f–VÆEÒÒ6ÆVä'&’€Ð¢6÷W&6U¶f–VÆEÐÐ¢“°Ð¢Ò“°Ð Ð¢6÷W&6RæÇv—5&W&VE7VÆÄ–G2Ò°Ð¢ââææWr6WB€Ð¢vWE6V7F–öãdW‡æFVE7VÆÄw&çG2€Ð¢VçG'Ð¢Ð¢æf–ÇFW"‚†w&çB’Óâ°Ð¢&WGW&â€Ð¢w&çBæÇv—5&W&VBb`Ð¢&ööÆVâ†w&çBç7VÆÂÐ¢“°Ð¢ÒÐ¢æÖ‚†w&çB’Óâw&çBç7VÆÄ–BÐ¢Ð¢Ó°Ð Ð¢–b€Ð¢6÷W&6Ræ×—7F–4&6çVÕ7VÆÄ–G2ÇÀÐ¢G—Vöb6÷W&6Ræ×—7F–4&6çVÕ7VÆÄ–G2ÓÐÐ¢&ö&¦V7B"ÇÀÐ¢'&’æ—4'&’€Ð¢6÷W&6Ræ×—7F–4&6çVÕ7VÆÄ–G0Ð¢Ð¢’°Ð¢6÷W&6Ræ×—7F–4&6çVÕ7VÆÄ–G2Ò·Ó°Ð¢ÐÐ Ð¢6÷W&6Ræ×—7F–4&6çVÕ7VÆÄ–G2ÐÐ¢ö&¦V7Bæg&öÔVçG&–W2€Ð¢ö&¦V7BæVçG&–W2€Ð¢6÷W&6Ræ×—7F–4&6çVÕ7VÆÄ–G0Ð¢Ð¢æÖ‚…¶ÆWfVÂÂ7VÆÄ–EÒ’Óâ°Ð¢&WGW&â°Ð¢6ÆVå7G&–ær†ÆWfVÂ’ÀÐ¢6ÆVå7G&–ær‡7VÆÄ–BÐ¢Ó°Ð¢ÒÐ¢æf–ÇFW"‚…¶ÆWfVÂÂ7VÆÄ–EÒ’Óâ°Ð¢&WGW&â€Ð¢vWE6V7F–öãd×—7F–4&6çVÔÆWfVÇ2€Ð¢VçG'Ð¢’æ–æ6ÇVFW2€Ð¢6fTçVÖ&W"†ÆWfVÂÂÐ¢’b`Ð¢&ööÆVâ‡7VÆÄ–BÐ¢“°Ð¢ÒÐ¢“°Ð Ð¢&WGW&â6÷W&6S°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öãe&W&F–öäÖöFR†VçG'’’°Ð¢6öç7BÖöFRÒ6ÆVå7G&–ær€Ð¢VçG'“òç7VÆÅ&W&F–öâÀÐ¢&¶æ÷vâ Ð¢“°Ð Ð¢&WGW&â°Ð¢&¶æ÷vâ"ÀÐ¢'&W&VB"ÀÐ¢'7VÆÆ&öö²×&W&VB Ð¢Òæ–æ6ÇVFW2†ÖöFRÐ¢òÖöFPÐ¢¢&¶æ÷vâ#°Ð¢ÐÐ Ð¢gVæ7F–öâ7–æ56V7F–öãd6Æ756÷W&6TÖWFFF€Ð¢6†&7FW"Ò7&VF÷%7FFRæG&g@Ð¢’°Ð¢6öç7BVçG&–W2ÐÐ¢vWE7VÆÆ67F–æt6Æ74÷F–öç2€Ð¢6†&7FW Ð¢“°Ð Ð¢VçG&–W2æf÷$V6‚‚†VçG'’’Óâ°Ð¢vWE6V7F–öãe6÷W&6U7FFR€Ð¢VçG'’ÀÐ¢²6†&7FW"ÐÐ¢“°Ð¢Ò“°Ð Ð¢–b€Ð¢6†&7FW"ÓÓÒ7&VF÷%7FFRæG&gBb`Ð¢6†&7FW"æÖv–0Ð¢òç7VÆÅ6÷W&6TÖöFVÅfW'6–öâÓÓÒ Ð¢’°Ð¢7–æ56V7F–öãdÆVv7•7VÆÄÆ–6W2‚“°Ð¢ÐÐ Ð¢&WGW&âVçG&–W3°Ð¢ÐÐ Ð¢gVæ7F–öâ6Æ7VÆFU6V7F–öãdVÆ–v–&ÆU7VÆÆ67FW'2€Ð¢7VÆÂÀÐ¢÷F–öç2Ò·ÐÐ¢’°Ð¢6öç7B7VÆÆ67FW'2ÐÐ¢vWE7VÆÆ67F–æt6Æ74÷F–öç2€Ð¢÷F–öç2æ6†&7FW"ÇÀÐ¢7&VF÷%7FFRæG&g@Ð¢“°Ð¢6öç7B7VÆÄÆWfVÂÒÖF‚æÖ‚€Ð¢ÀÐ¢6fTçVÖ&W"‡7VÆÃòæÆWfVÂÂÐ¢“°Ð¢6öç7B7VÆÄ6Æ76W2Ò6ÆVä'&’€Ð¢7VÆÃòæ6Æ76W0Ð¢“°Ð¢6öç7B6÷W&6T†–çBÒvWE7VÆÅ6÷W&6T–B€Ð¢7VÆÀÐ¢“°Ð Ð¢&WGW&â7VÆÆ67FW'2æf–ÇFW"‚†VçG'’’Óâ°Ð¢6öç7B6÷W&6T¶W’ÐÐ¢vWE6V7F–öãe6÷W&6T¶W’†VçG'’“°Ð¢6öç7B6Æ74–BÒ6ÆVå7G&–ær€Ð¢VçG'’æ6Æ74–@Ð¢“°Ð¢6öç7B7VÆÄÆ—7D6Æ74–BÒ6ÆVå7G&–ær€Ð¢VçG'’ç7VÆÄÆ—7D6Æ74–BÇÀÐ¢6Æ74–@Ð¢“°Ð¢6öç7BW‡æFVDw&çBÐÐ¢vWE6V7F–öãdW‡æFVE7VÆÄw&çB€Ð¢VçG'’ÀÐ¢7VÆÀÐ¢“°Ð¢6öç7B×—7F–4&6çVÒÐÐ¢—56V7F–öãd×—7F–4&6çVÕ7VÆÂ€Ð¢VçG'’ÀÐ¢7VÆÀÐ¢“°Ð Ð¢–b€Ð¢6÷W&6T†–çBb`Ð¢6÷W&6T†–çBÓÒ6÷W&6T¶W’b`Ð¢6÷W&6T†–çBÓÒ6Æ74–@Ð¢’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢–b€Ð¢7VÆÄ6Æ76W2æÆVæwF‚âb`Ð¢7VÆÄ6Æ76W2æ–æ6ÇVFW2†6Æ74–B’b`Ð¢7VÆÄ6Æ76W2æ–æ6ÇVFW2€Ð¢7VÆÄÆ—7D6Æ74–@Ð¢’b`Ð¢W‡æFVDw&çBb`Ð¢7VÆÃòæÖçVÄ÷fW'&–FRÓÒG'VPÐ¢’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢–b€Ð¢÷F–öç2æVæf÷&6TÆWfVÂÓÒfÇ6Rb`Ð¢7VÆÄÆWfVÂÓÓÒb`Ð¢6fTçVÖ&W"†VçG'’æ6çG&—4¶æ÷vâÂ’Âb`Ð¢7VÆÃòæÖçVÄ÷fW'&–FRÓÒG'VPÐ¢’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢–b€Ð¢÷F–öç2æVæf÷&6TÆWfVÂÓÒfÇ6Rb`Ð¢7VÆÄÆWfVÂâb`Ð¢7VÆÄÆWfVÂàÐ¢6fTçVÖ&W"†VçG'’æÖ…7VÆÄÆWfVÂÂ’b`Ð¢×—7F–4&6çVÒb`Ð¢7VÆÃòæÖçVÄ÷fW'&–FRÓÒG'VPÐ¢’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢&WGW&âG'VS°Ð¢Ò“°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öãdVÆ–v–&ÆU7VÆÆ67FW'2€Ð¢7VÆÂÀÐ¢÷F–öç2Ò·ÐÐ¢’°Ð¢6öç7B6†&7FW"ÐÐ¢÷F–öç2æ6†&7FW"ÇÀÐ¢7&VF÷%7FFRæG&gC°Ð¢6öç7B7VÆÆ67FW'2ÐÐ¢vWE7VÆÆ67F–æt6Æ74÷F–öç2€Ð¢6†&7FW Ð¢“°Ð¢6öç7BFWVæFVæ7”¶W’Ò7&VFTFW&—fVE6–væGW&R‡°Ð¢7VÆÃ¢°Ð¢–C¢7VÆÃòæ–BÀÐ¢ÆWfVÃ¢7VÆÃòæÆWfVÂÀÐ¢6Æ76W3¢7VÆÃòæ6Æ76W2ÀÐ¢6Æ74VçG'”–C Ð¢7VÆÃòæ6Æ74VçG'”–BÀÐ¢7VÆÆ67F–æu6÷W&6T–C Ð¢7VÆÃòç7VÆÆ67F–æu6÷W&6T–BÀÐ¢6Æ74–C¢7VÆÃòæ6Æ74–BÀÐ¢ÖçVÄ÷fW'&–FS Ð¢7VÆÃòæÖçVÄ÷fW'&–FPÐ¢ÒÀÐ¢Væf÷&6TÆWfVÃ Ð¢÷F–öç2æVæf÷&6TÆWfVÂÓÒfÇ6RÀÐ¢7VÆÆ67FW'0Ð¢Ò“°Ð Ð¢&WGW&âFW&—fVD66†RævWB€Ð¢'7VÆÂÖVÆ–v–&–Æ—G’"ÀÐ¢FWVæFVæ7”¶W’ÀÐ¢‚’Óâ6Æ7VÆFU6V7F–öãdVÆ–v–&ÆU7VÆÆ67FW'2€Ð¢7VÆÂÀÐ¢÷F–öç0Ð¢Ð¢“°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öãdVçG'”f÷%6÷W&6R€Ð¢7VÆÂÀÐ¢6÷W&6T–BÒ" Ð¢’°Ð¢6öç7B7VÆÆ67FW'2ÐÐ¢vWE7VÆÆ67F–æt6Æ74÷F–öç2€Ð¢7&VF÷%7FFRæG&g@Ð¢“°Ð¢6öç7B&WVW7FVE6÷W&6T–BÒ6ÆVå7G&–ær€Ð¢6÷W&6T–BÇÂvWE7VÆÅ6÷W&6T–B‡7VÆÂÐ¢“°Ð Ð¢–b‡&WVW7FVE6÷W&6T–B’°Ð¢&WGW&â7VÆÆ67FW'2æf–æB‚†VçG'’’Óâ°Ð¢&WGW&â€Ð¢vWE6V7F–öãe6÷W&6T¶W’†VçG'’’ÓÓÐÐ¢&WVW7FVE6÷W&6T–BÇÀÐ¢6ÆVå7G&–ær†VçG'’æ6Æ74–B’ÓÓÐÐ¢&WVW7FVE6÷W&6T–@Ð¢“°Ð¢Ò’ÇÂçVÆÃ°Ð¢ÐÐ Ð¢6öç7BVÆ–v–&ÆRÐÐ¢vWE6V7F–öãdVÆ–v–&ÆU7VÆÆ67FW'2€Ð¢7VÆÀÐ¢“°Ð Ð¢&WGW&âVÆ–v–&ÆRæÆVæwF‚ÓÓÒÐ¢òVÆ–v–&ÆU³ÐÐ¢¢çVÆÃ°Ð¢ÐÐ Ð¢gVæ7F–öâ7–æ56V7F–öãdÆVv7•7VÆÄÆ–6W2‚’°Ð¢6öç7B7F÷&RÐÐ¢vWE6V7F–öãd6Æ756÷W&6U7F÷&R‚“°Ð¢6öç7B7F—fU6÷W&6T¶W—2ÒæWr6WB€Ð¢vWE7VÆÆ67F–æt6Æ74÷F–öç2€Ð¢7&VF÷%7FFRæG&g@Ð¢Ð¢æÖ‚†VçG'’’Óâ°Ð¢&WGW&âvWE6V7F–öãe6÷W&6T¶W’†VçG'’“°Ð¢ÒÐ¢æf–ÇFW"„&ööÆVâÐ¢“°Ð¢6öç7B6÷W&6W2Òö&¦V7BçfÇVW2‡7F÷&RÐ¢æf–ÇFW"‚‡6÷W&6R’Óâ°Ð¢&WGW&â7F—fU6÷W&6T¶W—2æ†2€Ð¢6ÆVå7G&–ær‡6÷W&6Sòæ6Æ74VçG'”–BÐ¢“°Ð¢Ò“°Ð Ð¢7&VF÷%7FFRæG&gBæÖv–2æ¶æ÷vå7VÆÄ–G2Ò°Ð¢ââææWr6WB€Ð¢°Ð¢ââæ6ÆVä'&’€Ð¢7&VF÷%7FFRæG&gBæÖv–0Ð¢çVæ76–væVD¶æ÷vå7VÆÄ–G0Ð¢’ÀÐ¢ââç6÷W&6W2æfÆDÖ‚‡6÷W&6R’Óâ°Ð¢&WGW&â°Ð¢ââæ6ÆVä'&’‡6÷W&6Ræ6çG&—–G2’ÀÐ¢ââæ6ÆVä'&’‡6÷W&6Ræ¶æ÷vå7VÆÄ–G2’ÀÐ¢ââæ6ÆVä'&’‡6÷W&6Rç7VÆÆ&ööµ7VÆÄ–G2’ÀÐ¢ââäö&¦V7BçfÇVW2€Ð¢6÷W&6Ræ×—7F–4&6çVÕ7VÆÄ–G2ÇÀÐ¢·ÐÐ¢Ð¢æÖ‚‡7VÆÄ–B’Óâ°Ð¢&WGW&â6ÆVå7G&–ær‡7VÆÄ–B“°Ð¢ÒÐ¢æf–ÇFW"„&ööÆVâÐ¢Ó°Ð¢ÒÐ¢ÐÐ¢Ð¢Ó°Ð Ð¢7&VF÷%7FFRæG&gBæÖv–2ç&W&VE7VÆÄ–G2Ò°Ð¢ââææWr6WB€Ð¢°Ð¢ââæ6ÆVä'&’€Ð¢7&VF÷%7FFRæG&gBæÖv–0Ð¢çVæ76–væVE&W&VE7VÆÄ–G0Ð¢’ÀÐ¢ââç6÷W&6W2æfÆDÖ‚‡6÷W&6R’Óâ°Ð¢&WGW&â°Ð¢ââæ6ÆVä'&’€Ð¢6÷W&6Rç&W&VE7VÆÄ–G0Ð¢’ÀÐ¢ââæ6ÆVä'&’€Ð¢6÷W&6RæÇv—5&W&VE7VÆÄ–G0Ð¢Ð¢Ó°Ð¢ÒÐ¢ÐÐ¢Ð¢Ó°Ð¢ÐÐ Ð¢gVæ7F–öâÖ–w&FU6V7F–öãdÆVv7•7VÆÅ6VÆV7F–öç2‚’°Ð¢6öç7BÖv–2Ò7&VF÷%7FFRæG&gBæÖv–3°Ð Ð¢–b†Öv–2ç7VÆÅ6÷W&6TÖöFVÅfW'6–öâÓÓÒ"’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢6öç7B&Wf–÷W4ÖöFVÅfW'6–öâÐÐ¢6fTçVÖ&W"€Ð¢Öv–2ç7VÆÅ6÷W&6TÖöFVÅfW'6–öâÀÐ¢ Ð¢“°Ð Ð¢7–æ56V7F–öãd6Æ756÷W&6TÖWFFF‚“°Ð Ð¢ö&¦V7BçfÇVW2€Ð¢vWE6V7F–öãd6Æ756÷W&6U7F÷&R‚Ð¢’æf÷$V6‚‚‡6÷W&6R’Óâ°Ð¢6öç7BÆVv7•6÷W&6T¶æ÷vâÒ6ÆVä'&’€Ð¢6÷W&6Ræ¶æ÷vå7VÆÄ–G0Ð¢“°Ð¢6öç7BÖ–w&FVD6çG&—2ÐÐ¢ÆVv7•6÷W&6T¶æ÷vâæf–ÇFW"‚‡7VÆÄ–B’Óâ°Ð¢&WGW&â6fTçVÖ&W"€Ð¢vWE6V7F–öãe7VÆÄ'”–B‡7VÆÄ–BÐ¢òæÆWfVÂÀÐ¢ÓÐ¢’ÓÓÒ°Ð¢Ò“°Ð Ð¢6÷W&6Ræ6çG&—–G2Ò°Ð¢ââææWr6WB…°Ð¢ââæ6ÆVä'&’‡6÷W&6Ræ6çG&—–G2’ÀÐ¢ââæÖ–w&FVD6çG&—0Ð¢ÒÐ¢Ó°Ð¢6÷W&6Ræ¶æ÷vå7VÆÄ–G2ÐÐ¢ÆVv7•6÷W&6T¶æ÷vâæf–ÇFW"‚‡7VÆÄ–B’Óâ°Ð¢&WGW&âÖ–w&FVD6çG&—2æ–æ6ÇVFW2€Ð¢7VÆÄ–@Ð¢“°Ð¢Ò“°Ð¢Ò“°Ð Ð¢6öç7BÆVv7”¶æ÷vâÒ6ÆVä'&’€Ð¢Öv–2æ¶æ÷vå7VÆÄ–G0Ð¢“°Ð¢6öç7BÆVv7•&W&VBÒ6ÆVä'&’€Ð¢Öv–2ç&W&VE7VÆÄ–G0Ð¢“°Ð¢6öç7BVæ76–væVD¶æ÷vâÒæWr6WB€Ð¢ÆVv7”¶æ÷vàÐ¢“°Ð¢6öç7BVæ76–væVE&W&VBÒæWr6WB€Ð¢ÆVv7•&W&V@Ð¢“°Ð Ð¢°Ð¢ââææWr6WB…°Ð¢ââæÆVv7”¶æ÷vâÀÐ¢ââæÆVv7•&W&V@Ð¢ÒÐ¢Òæf÷$V6‚‚‡7VÆÄ–B’Óâ°Ð¢6öç7B7VÆÂÐÐ¢vWE6V7F–öãe7VÆÄ'”–B‡7VÆÄ–B“°Ð Ð¢–b‚7VÆÂ’°Ð¢&WGW&ã°Ð¢ÐÐ Ð¢6öç7BVÆ–v–&ÆRÐÐ¢vWE6V7F–öãdVÆ–v–&ÆU7VÆÆ67FW'2€Ð¢7VÆÀÐ¢“°Ð¢6öç7B†–çFVDVçG'’ÐÐ¢vWE6V7F–öãdVçG'”f÷%6÷W&6R€Ð¢7VÆÂÀÐ¢vWE7VÆÅ6÷W&6T–B‡7VÆÂÐ¢“°Ð¢6öç7BVçG'’Ò†–çFVDVçG'’ÇÀÐ¢€Ð¢VÆ–v–&ÆRæÆVæwF‚ÓÓÒÐ¢òVÆ–v–&ÆU³ÐÐ¢¢çVÆÀÐ¢“°Ð Ð¢–b‚VçG'’’°Ð¢&WGW&ã°Ð¢ÐÐ Ð¢6öç7B6÷W&6RÐÐ¢vWE6V7F–öãe6÷W&6U7FFR†VçG'’“°Ð¢6öç7BÖöFRÐÐ¢vWE6V7F–öãe&W&F–öäÖöFR†VçG'’“°Ð¢6öç7BÆWfVÂÒ6fTçVÖ&W"€Ð¢7VÆÂæÆWfVÂÀÐ¢ Ð¢“°Ð Ð¢–b†ÆVv7”¶æ÷vâæ–æ6ÇVFW2‡7VÆÄ–B’’°Ð¢6öç7Bf–VÆBÐÐ¢ÆWfVÂÓÓÒ Ð¢ò&6çG&—–G2 Ð¢¢ÖöFRÓÓÒ'7VÆÆ&öö²×&W&VB Ð¢ò'7VÆÆ&ööµ7VÆÄ–G2 Ð¢¢&¶æ÷vå7VÆÄ–G2#°Ð Ð¢–b‚6÷W&6U¶f–VÆEÒæ–æ6ÇVFW2‡7VÆÄ–B’’°Ð¢6÷W&6U¶f–VÆEÒçW6‚‡7VÆÄ–B“°Ð¢ÐÐ Ð¢Væ76–væVD¶æ÷vâæFVÆWFR‡7VÆÄ–B“°Ð¢ÐÐ Ð¢–b€Ð¢ÆVv7•&W&VBæ–æ6ÇVFW2‡7VÆÄ–B’b`Ð¢6÷W&6Rç&W&VE7VÆÄ–G2æ–æ6ÇVFW2€Ð¢7VÆÄ–@Ð¢Ð¢’°Ð¢6÷W&6Rç&W&VE7VÆÄ–G2çW6‚€Ð¢7VÆÄ–@Ð¢“°Ð¢ÐÐ Ð¢–b†ÆVv7•&W&VBæ–æ6ÇVFW2‡7VÆÄ–B’’°Ð¢Væ76–væVE&W&VBæFVÆWFR‡7VÆÄ–B“°Ð¢ÐÐ¢Ò“°Ð Ð¢Öv–2çVæ76–væVD¶æ÷vå7VÆÄ–G2Ò°Ð¢ââçVæ76–væVD¶æ÷vàÐ¢Ó°Ð¢Öv–2çVæ76–væVE&W&VE7VÆÄ–G2Ò°Ð¢ââçVæ76–væVE&W&V@Ð¢Ó°Ð¢Öv–2ç7VÆÅ6÷W&6TÖöFVÅfW'6–öâÒ#°Ð Ð¢–b€Ð¢ö&¦V7Bæ¶W—2€Ð¢vWE6V7F–öãd6Æ756÷W&6U7F÷&R‚Ð¢’æÆVæwF‚â Ð¢’°Ð¢7–æ56V7F–öãdÆVv7•7VÆÄÆ–6W2‚“°Ð¢ÐÐ Ð¢&WGW&â&Wf–÷W4ÖöFVÅfW'6–öâÓÒ"ÇÀÐ¢ÆVv7”¶æ÷vâæÆVæwF‚âÇÀÐ¢ÆVv7•&W&VBæÆVæwF‚â°Ð¢ÐÐ Ð¢gVæ7F–öâ—56V7F–öãe7VÆÄ¶æ÷vâ€Ð¢7VÆÄ–BÀÐ¢6÷W&6T–BÒ" Ð¢’°Ð¢Ö–w&FU6V7F–öãdÆVv7•7VÆÅ6VÆV7F–öç2‚“°Ð¢7–æ56V7F–öãd6Æ756÷W&6TÖWFFF‚“°Ð Ð¢–b‡6÷W&6T–B’°Ð¢6öç7B7VÆÂÐÐ¢vWE6V7F–öãe7VÆÄ'”–B‡7VÆÄ–B“°Ð¢6öç7BVçG'’ÐÐ¢vWE6V7F–öãdVçG'”f÷%6÷W&6R€Ð¢7VÆÂÀÐ¢6÷W&6T–@Ð¢“°Ð¢6öç7B6÷W&6RÒVçG'Ð¢òvWE6V7F–öãe6÷W&6U7FFR€Ð¢VçG'’ÀÐ¢²7&VFS¢fÇ6RÐÐ¢Ð¢¢çVÆÃ°Ð Ð¢&WGW&â&ööÆVâ€Ð¢6÷W&6Rb`Ð¢€Ð¢6÷W&6Ræ6çG&—–G2æ–æ6ÇVFW2€Ð¢7VÆÄ–@Ð¢’ÇÀÐ¢6÷W&6Ræ¶æ÷vå7VÆÄ–G2æ–æ6ÇVFW2€Ð¢7VÆÄ–@Ð¢’ÇÀÐ¢6÷W&6Rç7VÆÆ&ööµ7VÆÄ–G2æ–æ6ÇVFW2€Ð¢7VÆÄ–@Ð¢’ÇÀÐ¢ö&¦V7BçfÇVW2€Ð¢6÷W&6Ræ×—7F–4&6çVÕ7VÆÄ–G2ÇÀÐ¢·ÐÐ¢’æ–æ6ÇVFW2€Ð¢7VÆÄ–@Ð¢Ð¢Ð¢“°Ð¢ÐÐ Ð¢&WGW&âvWE6V7F–öãd¶æ÷vå7VÆÄ–G2‚Ð¢æ–æ6ÇVFW2‡7VÆÄ–B“°Ð¢ÐÐ Ð¢gVæ7F–öâ—56V7F–öãe7VÆÅ&W&VB€Ð¢7VÆÄ–BÀÐ¢6÷W&6T–BÒ" Ð¢’°Ð¢Ö–w&FU6V7F–öãdÆVv7•7VÆÅ6VÆV7F–öç2‚“°Ð Ð¢–b‡6÷W&6T–B’°Ð¢6öç7B7VÆÂÐÐ¢vWE6V7F–öãe7VÆÄ'”–B‡7VÆÄ–B“°Ð¢6öç7BVçG'’ÐÐ¢vWE6V7F–öãdVçG'”f÷%6÷W&6R€Ð¢7VÆÂÀÐ¢6÷W&6T–@Ð¢“°Ð¢6öç7B6÷W&6RÒVçG'Ð¢òvWE6V7F–öãe6÷W&6U7FFR€Ð¢VçG'’ÀÐ¢²7&VFS¢fÇ6RÐÐ¢Ð¢¢çVÆÃ°Ð Ð¢&WGW&â&ööÆVâ€Ð¢6÷W&6Rb`Ð¢€Ð¢6÷W&6Rç&W&VE7VÆÄ–G0Ð¢æ–æ6ÇVFW2‡7VÆÄ–B’ÇÀÐ¢6÷W&6RæÇv—5&W&VE7VÆÄ–G0Ð¢æ–æ6ÇVFW2‡7VÆÄ–BÐ¢Ð¢“°Ð¢ÐÐ Ð¢&WGW&âvWE6V7F–öãe&W&VE7VÆÄ–G2‚Ð¢æ–æ6ÇVFW2‡7VÆÄ–B“°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öãd¶æ÷väÆ–Ö—Ev&æ–ær€Ð¢7VÆÂÀÐ¢6÷W&6T–BÒ" Ð¢’°Ð¢6öç7BVçG'’ÐÐ¢vWE6V7F–öãdVçG'”f÷%6÷W&6R€Ð¢7VÆÂÀÐ¢6÷W&6T–@Ð¢“°Ð Ð¢–b‚VçG'’’°Ð¢&WGW&â$6†ö÷6RâVÆ–v–&ÆR6Æ726÷W&6Rf÷"F†B7VÆÂâ#°Ð¢ÐÐ Ð¢–b€Ð¢vWE6V7F–öãdVÆ–v–&ÆU7VÆÆ67FW'2€Ð¢7VÆÀÐ¢’ç6öÖR‚†6æF–FFR’Óâ°Ð¢&WGW&â€Ð¢vWE6V7F–öãe6÷W&6T¶W’†6æF–FFR’ÓÓÐÐ¢vWE6V7F–öãe6÷W&6T¶W’†VçG'’Ð¢“°Ð¢ÒÐ¢’°Ð¢&WGW&âG·7VÆÃòææÖRÇÂ%F†B7VÆÂ'Ò—2æ÷Bf–Æ&ÆRFòG¶VçG'’æ6Æ74æÖRÇÂ'F†B6Æ72'ÒB—G27W'&VçBÆWfVÂæ°Ð¢ÐÐ Ð¢6öç7B6÷W&6RÐÐ¢vWE6V7F–öãe6÷W&6U7FFR†VçG'’“°Ð¢6öç7B7VÆÄÆWfVÂÒ6fTçVÖ&W"€Ð¢7VÆÃòæÆWfVÂÀÐ¢ Ð¢“°Ð Ð¢–b€Ð¢7VÆÄÆWfVÂÓÓÒb`Ð¢6fTçVÖ&W"†VçG'’æ6çG&—4¶æ÷vâÂ’âb`Ð¢6÷W&6Ræ6çG&—–G2æÆVæwF‚ãÐÐ¢6fTçVÖ&W"†VçG'’æ6çG&—4¶æ÷vâÂÐ¢’°Ð¢&WGW&âG¶VçG'’æ6Æ74æÖWÒw2¶æ÷vâ6çG&—2&RÇ&VG’BF†R6Æ7VÆFVBÆ–Ö—Bæ°Ð¢ÐÐ Ð¢–b€Ð¢7VÆÄÆWfVÂâb`Ð¢vWE6V7F–öãe&W&F–öäÖöFR†VçG'’’ÓÓÐÐ¢&¶æ÷vâ"b`Ð¢6fTçVÖ&W"†VçG'’ç7VÆÇ4¶æ÷vâÂ’âb`Ð¢6÷W&6Ræ¶æ÷vå7VÆÄ–G2æf–ÇFW"‚†–B’Óâ°Ð¢&WGW&â6ÆVä'&’‡6÷W&6RæÖv–6Å6V7&WE7VÆÄ–G2’æ–æ6ÇVFW2†–B’b`Ð¢6fTçVÖ&W"†vWE6V7F–öãe7VÆÄ'”–B†–B“òæÆWfVÂÂ’â°Ð¢Ò’æÆVæwF‚ãÐÐ¢6fTçVÖ&W"†VçG'’ç7VÆÇ4¶æ÷vâÂÐ¢’°Ð¢&WGW&âG¶VçG'’æ6Æ74æÖWÒw2¶æ÷vâ7VÆÇ2&RÇ&VG’BF†R6Æ7VÆFVBÆ–Ö—Bæ°Ð¢ÐÐ Ð¢6öç7B66†ööÅ&W7G&–7F–öç2ÐÐ¢VçG'’ç7VÆÅ66†ööÅ&W7G&–7F–öç3°Ð¢6öç7BÆÆ÷vVE66†ööÇ2Ò6ÆVä'&’€Ð¢66†ööÅ&W7G&–7F–öç3òæFVfVÇ@Ð¢“°Ð¢6öç7B7VÆÅ66†ööÂÒ6ÆVå7G&–ær€Ð¢7VÆÃòç66†ööÀÐ¢’çFôÆ÷vW$66R‚“°Ð Ð¢–b€Ð¢7VÆÄÆWfVÂâb`Ð¢ÆÆ÷vVE66†ööÇ2æÆVæwF‚âb`Ð¢7VÆÅ66†ööÂb`Ð¢ÆÆ÷vVE66†ööÇ2æ–æ6ÇVFW2‡7VÆÅ66†ööÂÐ¢’°Ð¢6öç7BVç&W7G&–7FVDÆ–Ö—BÒ6ÆVä'&’€Ð¢66†ööÅ&W7G&–7F–öç0Ð¢òçVç&W7G&–7FVE7VÆÄÆWfVÇ4D6Æ74ÆWfVÇ0Ð¢’æf–ÇFW"‚‡VæÆö6´ÆWfVÂ’Óâ°Ð¢&WGW&â€Ð¢6fTçVÖ&W"‡VæÆö6´ÆWfVÂÂ’ÃÐÐ¢6fTçVÖ&W"†VçG'’æÆWfVÂÂÐ¢“°Ð¢Ò’æÆVæwFƒ°Ð¢6öç7BVç&W7G&–7FVE6VÆV7FVBÐÐ¢6÷W&6Ræ¶æ÷vå7VÆÄ–G2æf–ÇFW"‚‡7VÆÄ–B’Óâ°Ð¢6öç7B6VÆV7FVE7VÆÂÐÐ¢vWE6V7F–öãe7VÆÄ'”–B‡7VÆÄ–B“°Ð Ð¢&WGW&â€Ð¢6fTçVÖ&W"€Ð¢6VÆV7FVE7VÆÃòæÆWfVÂÀÐ¢ Ð¢’âb`Ð¢ÆÆ÷vVE66†ööÇ2æ–æ6ÇVFW2€Ð¢6ÆVå7G&–ær€Ð¢6VÆV7FVE7VÆÃòç66†ööÀÐ¢’çFôÆ÷vW$66R‚Ð¢Ð¢“°Ð¢Ò’æÆVæwFƒ°Ð Ð¢–b€Ð¢Vç&W7G&–7FVE6VÆV7FVBãÐÐ¢Vç&W7G&–7FVDÆ–Ö—@Ð¢’°Ð¢&WGW&âG¶VçG'’ç7V&6Æ74æÖRÇÂVçG'’æ6Æ74æÖWÒ†2æòVç&W7G&–7FVB7VÆÂ6†ö–6R&VÖ–æ–æs²6†ö÷6RG¶ÆÆ÷vVE66†ööÇ2æ¦ö–â‚"÷""—ÒÖv–2æ°Ð¢ÐÐ¢ÐÐ Ð¢&WGW&â"#°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öãe&W&VDÆ–Ö—Ev&æ–ær€Ð¢7VÆÂÒçVÆÂÀÐ¢6÷W&6T–BÒ" Ð¢’°Ð¢6öç7BVçG'’ÐÐ¢vWE6V7F–öãdVçG'”f÷%6÷W&6R€Ð¢7VÆÂÀÐ¢6÷W&6T–@Ð¢“°Ð Ð¢–b‚VçG'’’°Ð¢&WGW&â$6†ö÷6RâVÆ–v–&ÆR6Æ726÷W&6Rf÷"F†B7VÆÂâ#°Ð¢ÐÐ Ð¢–b€Ð¢vWE6V7F–öãdVÆ–v–&ÆU7VÆÆ67FW'2€Ð¢7VÆÀÐ¢’ç6öÖR‚†6æF–FFR’Óâ°Ð¢&WGW&â€Ð¢vWE6V7F–öãe6÷W&6T¶W’†6æF–FFR’ÓÓÐÐ¢vWE6V7F–öãe6÷W&6T¶W’†VçG'’Ð¢“°Ð¢ÒÐ¢’°Ð¢&WGW&âG·7VÆÃòææÖRÇÂ%F†B7VÆÂ'Ò—2æ÷Bf–Æ&ÆRFòG¶VçG'’æ6Æ74æÖRÇÂ'F†B6Æ72'ÒB—G27W'&VçBÆWfVÂæ°Ð¢ÐÐ Ð¢6öç7BÖöFRÐÐ¢vWE6V7F–öãe&W&F–öäÖöFR†VçG'’“°Ð Ð¢–b†ÖöFRÓÓÒ&¶æ÷vâ"’°Ð¢&WGW&âG¶VçG'’æ6Æ74æÖWÒÆV&ç27VÆÇ2–ç7FVBöb&W&–ærF†VÒæ°Ð¢ÐÐ Ð¢6öç7B6÷W&6RÐÐ¢vWE6V7F–öãe6÷W&6U7FFR†VçG'’“°Ð Ð¢–b€Ð¢ÖöFRÓÓÒ'7VÆÆ&öö²×&W&VB"b`Ð¢6fTçVÖ&W"‡7VÆÃòæÆWfVÂÂ’âb`Ð¢6÷W&6Rç7VÆÆ&ööµ7VÆÄ–G2æ–æ6ÇVFW2€Ð¢7VÆÃòæ–@Ð¢Ð¢’°Ð¢&WGW&â$FBF†B7VÆÂFòF†R7VÆÆ&öö²&Vf÷&R&W&–ær—Bâ#°Ð¢ÐÐ Ð¢–b€Ð¢VçG'’ç&W&VDÆ–Ö—BÓÒçVÆÂb`Ð¢6÷W&6Rç&W&VE7VÆÄ–G2æÆVæwF‚ãÐÐ¢6fTçVÖ&W"†VçG'’ç&W&VDÆ–Ö—BÂÐ¢’°Ð¢&WGW&âG¶VçG'’æ6Æ74æÖWÒw2&W&VB7VÆÇ2&RÇ&VG’BF†R6Æ7VÆFVBÆ–Ö—Bæ°Ð¢ÐÐ Ð¢&WGW&â"#°Ð¢ÐÐ Ð¢gVæ7F–öâFövvÆU6V7F–öãe7VÆÄ¶æ÷vâ€Ð¢7VÆÄ–BÀÐ¢6÷W&6T–BÒ" Ð¢’°Ð¢6öç7B7VÆÂÐÐ¢vWE6V7F–öãe7VÆÄ'”–B‡7VÆÄ–B“°Ð Ð¢–b‚7VÆÂ’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢Ö–w&FU6V7F–öãdÆVv7•7VÆÅ6VÆV7F–öç2‚“°Ð Ð¢6öç7BVçG'’ÐÐ¢vWE6V7F–öãdVçG'”f÷%6÷W&6R€Ð¢7VÆÂÀÐ¢6÷W&6T–@Ð¢“°Ð¢6öç7Bv&æ–ærÒVçG'Ð¢ò" Ð¢¢vWE6V7F–öãd¶æ÷väÆ–Ö—Ev&æ–ær€Ð¢7VÆÂÀÐ¢6÷W&6T–@Ð¢“°Ð Ð¢–b‡v&æ–ær’°Ð¢ÆW'B‡v&æ–ær“°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢6öç7B6÷W&6RÐÐ¢vWE6V7F–öãe6÷W&6U7FFR†VçG'’“°Ð Ð¢7&VF÷%7FFRæG&gBæÖv–0Ð¢çVæ76–væVD¶æ÷vå7VÆÄ–G2Ò6ÆVä'&’€Ð¢7&VF÷%7FFRæG&gBæÖv–0Ð¢çVæ76–væVD¶æ÷vå7VÆÄ–G0Ð¢’æf–ÇFW"‚†–B’Óâ–BÓÒ7VÆÄ–B“°Ð Ð¢6öç7BÖöFRÐÐ¢vWE6V7F–öãe&W&F–öäÖöFR†VçG'’“°Ð¢6öç7Bf–VÆBÐÐ¢6fTçVÖ&W"‡7VÆÂæÆWfVÂÂ’ÓÓÒ Ð¢ò&6çG&—–G2 Ð¢¢ÖöFRÓÓÒ'7VÆÆ&öö²×&W&VB Ð¢ò'7VÆÆ&ööµ7VÆÄ–G2 Ð¢¢&¶æ÷vå7VÆÄ–G2#°Ð¢6öç7B–æFW‚Ò6÷W&6U¶f–VÆEÒæ–æFW„öb€Ð¢7VÆÄ–@Ð¢“°Ð Ð¢–b†–æFW‚ãÒ’°Ð¢6÷W&6U¶f–VÆEÒç7Æ–6R†–æFW‚Â“°Ð¢6öç7B&W&VD–æFW‚ÐÐ¢6÷W&6Rç&W&VE7VÆÄ–G2æ–æFW„öb€Ð¢7VÆÄ–@Ð¢“°Ð Ð¢–b‡&W&VD–æFW‚ãÒ’°Ð¢6÷W&6Rç&W&VE7VÆÄ–G2ç7Æ–6R€Ð¢&W&VD–æFW‚ÀÐ¢Ð¢“°Ð¢ÐÐ¢ÒVÇ6R°Ð¢6öç7BÆ–Ö—Ev&æ–ærÐÐ¢vWE6V7F–öãd¶æ÷väÆ–Ö—Ev&æ–ær€Ð¢7VÆÂÀÐ¢vWE6V7F–öãe6÷W&6T¶W’†VçG'’Ð¢“°Ð Ð¢–b†Æ–Ö—Ev&æ–ær’°Ð¢ÆW'B†Æ–Ö—Ev&æ–ær“°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢6÷W&6U¶f–VÆEÒçW6‚‡7VÆÄ–B“°Ð¢ÐÐ Ð¢7–æ56V7F–öãdÆVv7•7VÆÄÆ–6W2‚“°Ð¢Ö&´G&gD6†ævVB‚“°Ð Ð¢&WGW&âG'VS°Ð¢ÐÐ Ð¢gVæ7F–öâFövvÆU6V7F–öãe7VÆÅ&W&VB€Ð¢7VÆÄ–BÀÐ¢6÷W&6T–BÒ" Ð¢’°Ð¢6öç7B7VÆÂÐÐ¢vWE6V7F–öãe7VÆÄ'”–B‡7VÆÄ–B“°Ð Ð¢–b‚7VÆÂ’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢Ö–w&FU6V7F–öãdÆVv7•7VÆÅ6VÆV7F–öç2‚“°Ð Ð¢6öç7BVçG'’ÐÐ¢vWE6V7F–öãdVçG'”f÷%6÷W&6R€Ð¢7VÆÂÀÐ¢6÷W&6T–@Ð¢“°Ð¢6öç7B6÷W&6RÒVçG'Ð¢òvWE6V7F–öãe6÷W&6U7FFR†VçG'’Ð¢¢çVÆÃ°Ð Ð¢–b‚VçG'’ÇÂ6÷W&6R’°Ð¢ÆW'B€Ð¢$6†ö÷6RâVÆ–v–&ÆR6Æ726÷W&6Rf÷"F†B7VÆÂâ Ð¢“°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢–b€Ð¢6÷W&6RæÇv—5&W&VE7VÆÄ–G0Ð¢æ–æ6ÇVFW2‡7VÆÄ–BÐ¢’°Ð¢ÆW'B€Ð¢G·7VÆÂææÖWÒ—2Çv—2&W&VB'’G¶VçG'’ç7V&6Æ74æÖRÇÂVçG'’æ6Æ74æÖWÒæ Ð¢“°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢7&VF÷%7FFRæG&gBæÖv–0Ð¢çVæ76–væVE&W&VE7VÆÄ–G2Ò6ÆVä'&’€Ð¢7&VF÷%7FFRæG&gBæÖv–0Ð¢çVæ76–væVE&W&VE7VÆÄ–G0Ð¢’æf–ÇFW"‚†–B’Óâ–BÓÒ7VÆÄ–B“°Ð Ð¢6öç7B&W&VD–æFW‚ÐÐ¢6÷W&6Rç&W&VE7VÆÄ–G2æ–æFW„öb€Ð¢7VÆÄ–@Ð¢“°Ð Ð¢–b‡&W&VD–æFW‚ãÒ’°Ð¢6÷W&6Rç&W&VE7VÆÄ–G2ç7Æ–6R€Ð¢&W&VD–æFW‚ÀÐ¢Ð¢“°Ð¢ÒVÇ6R°Ð¢6öç7Bv&æ–ærÐÐ¢vWE6V7F–öãe&W&VDÆ–Ö—Ev&æ–ær€Ð¢7VÆÂÀÐ¢vWE6V7F–öãe6÷W&6T¶W’†VçG'’Ð¢“°Ð Ð¢–b‡v&æ–ær’°Ð¢ÆW'B‡v&æ–ær“°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢6÷W&6Rç&W&VE7VÆÄ–G2çW6‚€Ð¢7VÆÄ–@Ð¢“°Ð¢ÐÐ Ð¢7–æ56V7F–öãdÆVv7•7VÆÄÆ–6W2‚“°Ð¢Ö&´G&gD6†ævVB‚“°Ð Ð¢&WGW&âG'VS°Ð¢ÐÐ Ð¢gVæ7F–öâFövvÆU6V7F–öãd×—7F–4&6çVÒ€Ð¢7VÆÄ–BÀÐ¢6÷W&6T–BÒ" Ð¢’°Ð¢6öç7B7VÆÂÐÐ¢vWE6V7F–öãe7VÆÄ'”–B‡7VÆÄ–B“°Ð Ð¢–b‚7VÆÂ’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢Ö–w&FU6V7F–öãdÆVv7•7VÆÅ6VÆV7F–öç2‚“°Ð Ð¢6öç7BVçG'’ÐÐ¢vWE6V7F–öãdVçG'”f÷%6÷W&6R€Ð¢7VÆÂÀÐ¢6÷W&6T–@Ð¢“°Ð Ð¢–b€Ð¢VçG'’ÇÀÐ¢—56V7F–öãd×—7F–4&6çVÕ7VÆÂ€Ð¢VçG'’ÀÐ¢7VÆÀÐ¢Ð¢’°Ð¢ÆW'B€Ð¢%F†B7VÆÂ—2æ÷Bâf–Æ&ÆR×—7F–2&6çVÒf÷"F†—2v&Æö6²ÆWfVÂâ Ð¢“°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢6öç7B6÷W&6RÐÐ¢vWE6V7F–öãe6÷W&6U7FFR†VçG'’“°Ð¢6öç7BÆWfVÄ¶W’Ò7G&–ær€Ð¢6fTçVÖ&W"‡7VÆÂæÆWfVÂÂÐ¢“°Ð Ð¢–b€Ð¢6÷W&6Ræ×—7F–4&6çVÕ7VÆÄ–G5°Ð¢ÆWfVÄ¶WÐ¢ÒÓÓÒ7VÆÄ–@Ð¢’°Ð¢FVÆWFR6÷W&6Ræ×—7F–4&6çVÕ7VÆÄ–G5°Ð¢ÆWfVÄ¶WÐ¢Ó°Ð¢ÒVÇ6R°Ð¢6÷W&6Ræ×—7F–4&6çVÕ7VÆÄ–G5°Ð¢ÆWfVÄ¶WÐ¢ÒÒ7VÆÄ–C°Ð¢ÐÐ Ð¢7–æ56V7F–öãdÆVv7•7VÆÄÆ–6W2‚“°Ð¢Ö&´G&gD6†ævVB‚“°Ð Ð¢&WGW&âG'VS°Ð¢ÐÐ Ð¢gVæ7F–öâFE6V7F–öãd7W7FöÕ7VÆÂ‚’°Ð¢6öç7BæÖRÐÐ¢6fTF—7Æ•7G&–ær€Ð¢B‚&64æWu7VÆÄæÖR"Ð¢òçfÇVPÐ¢“°Ð Ð¢–b‚æÖR’°Ð¢ÆW'B€Ð¢$VçFW"7VÆÂæÖRâ Ð¢“°Ð Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢6öç7B7VÆÆ67F–æt÷F–öç2ÐÐ¢vWE7VÆÆ67F–æt6Æ74÷F–öç2€Ð¢7&VF÷%7FFRæG&g@Ð¢“°Ð Ð¢6öç7B6VÆV7FVE6÷W&6T–BÐÐ¢6ÆVå7G&–ær€Ð¢B‚&64æWu7VÆÄ6Æ74–B"Ð¢òçfÇVPÐ¢’ÇÀÐ¢€Ð¢7VÆÆ67F–æt÷F–öç2æÆVæwF‚ÓÓÒÐ¢ò6ÆVå7G&–ær€Ð¢7VÆÆ67F–æt÷F–öç5³ÐÐ¢æ6Æ74VçG'”–BÇÀÐ¢7VÆÆ67F–æt÷F–öç5³ÐÐ¢æ6Æ74–@Ð¢Ð¢¢" Ð¢“°Ð Ð¢–b€Ð¢7VÆÆ67F–æt÷F–öç2æÆVæwF‚âb`Ð¢6VÆV7FVE6÷W&6T–@Ð¢’°Ð¢ÆW'B€Ð¢$6†ö÷6Rv†–6‚6Æ72F†—27VÆÂ&VÆöæw2Fòâ Ð¢“°Ð Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢6öç7B6VÆV7FVDVçG'’ÐÐ¢7VÆÆ67F–æt÷F–öç2æf–æB‚†VçG'’’Óâ°Ð¢&WGW&â€Ð¢vWE6V7F–öãe6÷W&6T¶W’†VçG'’’ÓÓÐÐ¢6VÆV7FVE6÷W&6T–BÇÀÐ¢6ÆVå7G&–ær†VçG'’æ6Æ74–B’ÓÓÐÐ¢6VÆV7FVE6÷W&6T–@Ð¢“°Ð¢Ò’ÇÂçVÆÃ°Ð Ð¢6öç7B7VÆÂÐÐ¢æ÷&ÖÆ—¦U6V7F–öãe7VÆÂ€Ð¢°Ð¢–C¢Ö¶U6fT–B€Ð¢G¶æÖWÒÒG´FFRææ÷r‚—ÒÒG´ÖF‚ç&æFöÒ‚—ÖÀÐ¢&7W7FöÒ×7VÆÂ Ð¢’ÀÐ Ð¢æÖRÀÐ Ð¢ÆWfVÃ Ð¢B‚&64æWu7VÆÄÆWfVÂ"Ð¢òçfÇVRÀÐ Ð¢66†ööÃ Ð¢B‚&64æWu7VÆÅ66†ööÂ"Ð¢òçfÇVRÀÐ Ð¢67F–æuF–ÖS Ð¢B‚&64æWu7VÆÄ67F–æuF–ÖR"Ð¢òçfÇVRÀÐ Ð¢&ævS Ð¢B‚&64æWu7VÆÅ&ævR"Ð¢òçfÇVRÀÐ Ð¢GW&F–öã Ð¢B‚&64æWu7VÆÄGW&F–öâ"Ð¢òçfÇVRÀÐ Ð¢6ö×öæVçG3 Ð¢B‚&64æWu7VÆÄ6ö×öæVçG2"Ð¢òçfÇVRÀÐ Ð¢FW67&—F–öã Ð¢B‚&64æWu7VÆÄFW67&—F–öâ"Ð¢òçfÇVRÀÐ Ð¢6Æ74–C Ð¢6ÆVå7G&–ær€Ð¢6VÆV7FVDVçG'“òæ6Æ74–@Ð¢’ÀÐ Ð¢6Æ74VçG'”–C Ð¢6ÆVå7G&–ær€Ð¢6VÆV7FVDVçG'“òæ6Æ74VçG'”–@Ð¢’ÀÐ Ð¢7VÆÆ67F–æu6÷W&6T–C Ð¢6ÆVå7G&–ær€Ð¢6VÆV7FVDVçG'“òæ6Æ74VçG'”–BÇÀÐ¢6VÆV7FVDVçG'“òæ6Æ74–@Ð¢’ÀÐ Ð¢6Æ76W3 Ð¢6VÆV7FVDVçG'“òæ6Æ74–@Ð¢ò·6VÆV7FVDVçG'’æ6Æ74–EÐÐ¢¢µÒÀÐ Ð¢6÷W&6S¢&7W7FöÒ"ÀÐ Ð¢&—GVÃ Ð¢B‚&64æWu7VÆÅ&—GVÂ"Ð¢òæ6†V6¶VBÓÓÒG'VRÀÐ Ð¢6öæ6VçG&F–öã Ð¢B‚&64æWu7VÆÄ6öæ6VçG&F–öâ"Ð¢òæ6†V6¶VBÓÓÒG'VRÀÐ Ð¢ÖçVÄ÷fW'&–FS Ð¢B‚&64æWu7VÆÄÖçVÄ÷fW'&–FR"Ð¢òæ6†V6¶VBÓÓÒG'VPÐ¢ÒÀÐ Ð¢&7W7FöÒ Ð¢“°Ð Ð¢6öç7B7F'D¶æ÷vâÐÐ¢B‚&64æWu7VÆÄ¶æ÷vâ"Ð¢òæ6†V6¶VBÓÓÒG'VS°Ð Ð¢6öç7B7F'E&W&VBÐÐ¢B‚&64æWu7VÆÅ&W&VB"Ð¢òæ6†V6¶VBÓÓÒG'VS°Ð Ð¢–b€Ð¢7F'D¶æ÷vâÇÀÐ¢7F'E&W&V@Ð¢’°Ð¢6öç7Bv&æ–ærÐÐ¢vWE6V7F–öãd¶æ÷väÆ–Ö—Ev&æ–ær€Ð¢7VÆÂÀÐ¢6VÆV7FVE6÷W&6T–@Ð¢“°Ð Ð¢–b‡v&æ–ær’°Ð¢ÆW'B‡v&æ–ær“°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ¢ÐÐ Ð¢–b‡7F'E&W&VB’°Ð¢6öç7B&W&VEv&æ–ærÐÐ¢vWE6V7F–öãe&W&VDÆ–Ö—Ev&æ–ær€Ð¢7VÆÂÀÐ¢6VÆV7FVE6÷W&6T–@Ð¢“°Ð Ð¢6öç7Bv–ÆÄFEFõ7VÆÆ&öö²ÐÐ¢7F'D¶æ÷vâb`Ð¢vWE6V7F–öãe&W&F–öäÖöFR€Ð¢6VÆV7FVDVçG'Ð¢’ÓÓÒ'7VÆÆ&öö²×&W&VB#°Ð Ð¢–b€Ð¢&W&VEv&æ–ærb`Ð¢€Ð¢v–ÆÄFEFõ7VÆÆ&öö²b`Ð¢&W&VEv&æ–ærÓÓÐÐ¢$FBF†B7VÆÂFòF†R7VÆÆ&öö²&Vf÷&R&W&–ær—Bâ Ð¢Ð¢’°Ð¢ÆW'B‡&W&VEv&æ–ær“°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ¢ÐÐ Ð¢vWE6V7F–öãd7W7FöÕ7VÆÇ2‚Ð¢çW6‚‡7VÆÂ“°Ð Ð¢–b‡7F'D¶æ÷vâ’°Ð¢FövvÆU6V7F–öãe7VÆÄ¶æ÷vâ€Ð¢7VÆÂæ–BÀÐ¢6VÆV7FVE6÷W&6T–@Ð¢“°Ð¢ÐÐ Ð¢–b‡7F'E&W&VB’°Ð¢FövvÆU6V7F–öãe7VÆÅ&W&VB€Ð¢7VÆÂæ–BÀÐ¢6VÆV7FVE6÷W&6T–@Ð¢“°Ð¢ÐÐ Ð¢Ö&´G&gD6†ævVB‚“°Ð Ð¢&WGW&âG'VS°Ð¢ÐÐ Ð¢gVæ7F–öâ&VÖ÷fU6V7F–öãd7W7FöÕ7VÆÂ€Ð¢7VÆÄ–@Ð¢’°Ð¢6öç7B7VÆÇ2ÐÐ¢vWE6V7F–öãd7W7FöÕ7VÆÇ2‚“°Ð Ð¢6öç7B–æFW‚ÐÐ¢7VÆÇ2æf–æD–æFW‚‚‡7VÆÂ’Óâ°Ð¢&WGW&â7VÆÂæ–BÓÓÒ7VÆÄ–C°Ð¢Ò“°Ð Ð¢–b†–æFW‚Â’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢7VÆÇ2ç7Æ–6R€Ð¢–æFW‚ÀÐ¢Ð¢“°Ð Ð¢7&VF÷%7FFRæG&g@Ð¢æÖv–0Ð¢æ¶æ÷vå7VÆÄ–G2ÐÐ¢vWE6V7F–öãd¶æ÷vå7VÆÄ–G2‚Ð¢æf–ÇFW"‚†–B’Óâ°Ð¢&WGW&â–BÓÒ7VÆÄ–C°Ð¢Ò“°Ð Ð¢7&VF÷%7FFRæG&g@Ð¢æÖv–0Ð¢ç&W&VE7VÆÄ–G2ÐÐ¢vWE6V7F–öãe&W&VE7VÆÄ–G2‚Ð¢æf–ÇFW"‚†–B’Óâ°Ð¢&WGW&â–BÓÒ7VÆÄ–C°Ð¢Ò“°Ð Ð¢7&VF÷%7FFRæG&gBæÖv–0Ð¢çVæ76–væVD¶æ÷vå7VÆÄ–G2Ò6ÆVä'&’€Ð¢7&VF÷%7FFRæG&gBæÖv–0Ð¢çVæ76–væVD¶æ÷vå7VÆÄ–G0Ð¢’æf–ÇFW"‚†–B’Óâ–BÓÒ7VÆÄ–B“°Ð Ð¢7&VF÷%7FFRæG&gBæÖv–0Ð¢çVæ76–væVE&W&VE7VÆÄ–G2Ò6ÆVä'&’€Ð¢7&VF÷%7FFRæG&gBæÖv–0Ð¢çVæ76–væVE&W&VE7VÆÄ–G0Ð¢’æf–ÇFW"‚†–B’Óâ–BÓÒ7VÆÄ–B“°Ð Ð¢ö&¦V7BçfÇVW2€Ð¢vWE6V7F–öãd6Æ756÷W&6U7F÷&R‚Ð¢’æf÷$V6‚‚‡6÷W&6R’Óâ°Ð¢°Ð¢&6çG&—–G2"ÀÐ¢&¶æ÷vå7VÆÄ–G2"ÀÐ¢'&W&VE7VÆÄ–G2"ÀÐ¢'7VÆÆ&ööµ7VÆÄ–G2"ÀÐ¢&Çv—5&W&VE7VÆÄ–G2 Ð¢Òæf÷$V6‚‚†f–VÆB’Óâ°Ð¢6÷W&6U¶f–VÆEÒÒ6ÆVä'&’€Ð¢6÷W&6U¶f–VÆEÐÐ¢’æf–ÇFW"‚†–B’Óâ°Ð¢&WGW&â–BÓÒ7VÆÄ–C°Ð¢Ò“°Ð¢Ò“°Ð Ð¢ö&¦V7Bæ¶W—2€Ð¢6÷W&6Ræ×—7F–4&6çVÕ7VÆÄ–G2ÇÀÐ¢·ÐÐ¢’æf÷$V6‚‚†ÆWfVÂ’Óâ°Ð¢–b€Ð¢6÷W&6Ræ×—7F–4&6çVÕ7VÆÄ–G5°Ð¢ÆWfVÀÐ¢ÒÓÓÒ7VÆÄ–@Ð¢’°Ð¢FVÆWFR6÷W&6Ræ×—7F–4&6çVÕ7VÆÄ–G5°Ð¢ÆWfVÀÐ¢Ó°Ð¢ÐÐ¢Ò“°Ð¢Ò“°Ð Ð¢7–æ56V7F–öãdÆVv7•7VÆÄÆ–6W2‚“°Ð Ð¢Ö&´G&gD6†ævVB‚“°Ð Ð¢&WGW&âG'VS°Ð¢ÐÐ Ð¢gVæ7F–öâ6Æ7VÆFU6V7F–öãe7VÆÆ67F–æufÇVW2€Ð¢÷F–öç2Ò·ÐÐ¢’°Ð¢6öç7B6VÆV7FVD6Æ72ÐÐ¢vWE6VÆV7FVD6Æ75FV×ÆFR‚“°Ð Ð¢6öç7B6Æ74&–Æ—G”–BÐÐ¢6VÆV7FVD6Æ73òç6÷W&6RÓÒ&7W7FöÒ Ð¢ò6ÆVå7G&–ær€Ð¢6VÆV7FVD6Æ73òç7VÆÆ67F–æt&–Æ—GÐ¢Ð¢¢"#°Ð Ð¢ÆWB&–Æ—G”–BÐÐ¢7&VF÷%7FFRæG&g@Ð¢æÖv–0Ð¢ç7VÆÆ67F–æt&–Æ—G“°Ð Ð¢–b†6Æ74&–Æ—G”–B’°Ð¢&–Æ—G”–BÒ6Æ74&–Æ—G”–C°Ð Ð¢7&VF÷%7FFRæG&g@Ð¢æÖv–0Ð¢ç7VÆÆ67F–æt&–Æ—G’ÐÐ¢6Æ74&–Æ—G”–C°Ð¢ÐÐ Ð¢6öç7BfÆ–D&–Æ—G’ÐÐ¢$”Ä•E•ôDTd”ä•D”ôå2ç6öÖR€Ð¢†&–Æ—G’’Óâ°Ð¢&WGW&â€Ð¢&–Æ—G’æ–BÓÓÐÐ¢&–Æ—G”–@Ð¢“°Ð¢ÐÐ¢“°Ð Ð¢–b‚fÆ–D&–Æ—G’’°Ð¢7&VF÷%7FFRæG&g@Ð¢æÖv–0Ð¢ç7VÆÅ6fTF2ÒçVÆÃ°Ð Ð¢7&VF÷%7FFRæG&g@Ð¢æÖv–0Ð¢ç7VÆÄGF6´&öçW2ÒçVÆÃ°Ð Ð¢–b†÷F–öç2æÖ&´G&gBÓÒfÇ6R’°Ð¢Ö&´G&gD6†ævVB‚“°Ð¢ÐÐ Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢6öç7B66÷&RÐÐ¢6fTçVÖ&W"€Ð¢7&VF÷%7FFRæG&g@Ð¢æ&–Æ—F–W0Ð¢ç66÷&W5¶&–Æ—G”–EÒÀÐ¢ Ð¢“°Ð Ð¢6öç7B&–Æ—G”ÖöF–f–W"ÐÐ¢6Æ7VÆFT&–Æ—G”ÖöF–f–W"€Ð¢66÷&PÐ¢“°Ð Ð¢6öç7B&öf–6–Væ7”&öçW2ÐÐ¢vWD6†&7FW%&öf–6–Væ7”&öçW2€Ð¢7&VF÷%7FFRæG&g@Ð¢“°Ð Ð¢7&VF÷%7FFRæG&g@Ð¢æÖv–0Ð¢ç7VÆÅ6fTF2ÐÐ¢6Æ7VÆFU'VÆU7VÆÅ6fTF2‡°Ð¢&öf–6–Væ7”&öçW2ÀÐ¢&–Æ—G”ÖöF–f–W Ð¢Ò“°Ð Ð¢7&VF÷%7FFRæG&g@Ð¢æÖv–0Ð¢ç7VÆÄGF6´&öçW2ÐÐ¢6Æ7VÆFU'VÆU7VÆÄGF6´&öçW2‡°Ð¢&öf–6–Væ7”&öçW2ÀÐ¢&–Æ—G”ÖöF–f–W Ð¢Ò“°Ð Ð¢–b†÷F–öç2æÖ&´G&gBÓÒfÇ6R’°Ð¢Ö&´G&gD6†ævVB‚“°Ð¢ÐÐ Ð¢&WGW&âG'VS°Ð¢ÐÐ Ð¢gVæ7F–öâæ÷&ÖÆ—¦U6V7F–öãdfVGW&R€Ð¢&tfVGW&RÀÐ¢fÆÆ&6µ6÷W&6RÒ&7W7FöÒ Ð¢’°Ð¢6öç7B&rÒ&tfVGW&RÇÂ·Ó°Ð Ð¢6öç7BæÖRÐÐ¢6fTF—7Æ•7G&–ær€Ð¢&rææÖRÀÐ¢%VææÖVBfVGW&R Ð¢“°Ð Ð¢&WGW&â°Ð¢ââæ6ÆöæTFF‡&r’ÀÐ Ð¢–C¢Ö¶U6fT–B€Ð¢&ræ–BÇÀÐ¢G¶æÖWÒÒG´FFRææ÷r‚—ÒÒG´ÖF‚ç&æFöÒ‚—ÖÀÐ¢&7W7FöÒÖfVGW&R Ð¢’ÀÐ Ð¢æÖRÀÐ Ð¢7VÖÖ'“ Ð¢6fTF—7Æ•7G&–ær€Ð¢&rç7VÖÖ'’ÇÀÐ¢&ræFW67&—F–öàÐ¢’ÀÐ Ð¢6÷W&6S Ð¢6fTF—7Æ•7G&–ær€Ð¢&rç6÷W&6RÀÐ¢fÆÆ&6µ6÷W&6PÐ¢’ÀÐ Ð¢W6W3 Ð¢6fTF—7Æ•7G&–ær€Ð¢&rçW6W0Ð¢’ÀÐ Ð¢&V6†&vS Ð¢6fTF—7Æ•7G&–ær€Ð¢&rç&V6†&vPÐ¢Ð¢Ó°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öãd7W7FöÔfVGW&W2‚’°Ð¢–b€Ð¢'&’æ—4'&’€Ð¢7&VF÷%7FFRæG&g@Ð¢æfVGW&W0Ð¢æ7W7FöÔfVGW&W0Ð¢Ð¢’°Ð¢7&VF÷%7FFRæG&g@Ð¢æfVGW&W0Ð¢æ7W7FöÔfVGW&W2ÒµÓ°Ð¢ÐÐ Ð¢&WGW&â7&VF÷%7FFRæG&g@Ð¢æfVGW&W0Ð¢æ7W7FöÔfVGW&W3°Ð¢ÐÐ Ð¢gVæ7F–öâFE6V7F–öãd7W7FöÔfVGW&R‚’°Ð¢6öç7BæÖRÐÐ¢6fTF—7Æ•7G&–ær€Ð¢B‚&64æWtfVGW&TæÖR"Ð¢òçfÇVPÐ¢“°Ð Ð¢–b‚æÖR’°Ð¢ÆW'B€Ð¢$VçFW"fVGW&RæÖRâ Ð¢“°Ð Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢6öç7BfVGW&RÐÐ¢æ÷&ÖÆ—¦U6V7F–öãdfVGW&R€Ð¢°Ð¢–C¢Ö¶U6fT–B€Ð¢G¶æÖWÒÒG´FFRææ÷r‚—ÒÒG´ÖF‚ç&æFöÒ‚—ÖÀÐ¢&7W7FöÒÖfVGW&R Ð¢’ÀÐ Ð¢æÖRÀÐ Ð¢6÷W&6S Ð¢6fTF—7Æ•7G&–ær€Ð¢B‚&64æWtfVGW&U6÷W&6R"Ð¢òçfÇVRÀÐ¢&7W7FöÒ Ð¢’ÀÐ Ð¢W6W3 Ð¢B‚&64æWtfVGW&UW6W2"Ð¢òçfÇVRÀÐ Ð¢&V6†&vS Ð¢B‚&64æWtfVGW&U&V6†&vR"Ð¢òçfÇVRÀÐ Ð¢7VÖÖ'“ Ð¢B‚&64æWtfVGW&U7VÖÖ'’"Ð¢òçfÇVPÐ¢ÒÀÐ Ð¢&7W7FöÒ Ð¢“°Ð Ð¢vWE6V7F–öãd7W7FöÔfVGW&W2‚Ð¢çW6‚†fVGW&R“°Ð Ð¢Ö&´G&gD6†ævVB‚“°Ð Ð¢&WGW&âG'VS°Ð¢ÐÐ Ð¢gVæ7F–öâ&VÖ÷fU6V7F–öãd7W7FöÔfVGW&R€Ð¢–æFW€Ð¢’°Ð¢6öç7BfVGW&W2ÐÐ¢vWE6V7F–öãd7W7FöÔfVGW&W2‚“°Ð Ð¢–b€Ð¢–æFW‚ÂÇÀÐ¢–æFW‚ãÒfVGW&W2æÆVæwF€Ð¢’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢fVGW&W2ç7Æ–6R€Ð¢–æFW‚ÀÐ¢Ð¢“°Ð Ð¢Ö&´G&gD6†ævVB‚“°Ð Ð¢&WGW&âG'VS°Ð¢ÐÐ Ð¢gVæ7F–öâ&VæFW%6V7F–öãe7VÆÅ6Æ÷G2‚’°Ð¢&WGW&â'&’æg&öÒ€Ð¢²ÆVæwFƒ¢’ÒÀÐ¢…òÂ–æFW‚’Óâ°Ð¢6öç7BÆWfVÂÐÐ¢–æFW‚²°Ð Ð¢6öç7B6Æ÷EfÇVRÐÐ¢6fTçVÖ&W"€Ð¢7&VF÷%7FFRæG&g@Ð¢æÖv–0Ð¢ç6Æ÷G5¶ÆWfVÅÒÀÐ¢ Ð¢“°Ð Ð¢&WGW&âv—¦&Df–VÆB€Ð¢ÆWfVÂG¶ÆWfVÇÒ6Æ÷G6ÀÐ¢657VÆÅ6Æ÷G2ÒG¶ÆWfVÇÖÀÐ¢6Æ÷EfÇVRÀÐ¢°Ð¢G—S¢&çVÖ&W""ÀÐ Ð¢Fƒ Ð¢Öv–2ç6Æ÷G2âG¶ÆWfVÇÖÀÐ Ð¢fÇVUG—S¢&–çFVvW""ÀÐ Ð¢W‡G& Ð¢vÖ–ãÒ#"7FWÒ#"pÐ¢ÐÐ¢“°Ð¢ÐÐ¢’æ¦ö–â‚""“°Ð¢ÐÐ Ð¢gVæ7F–öâf÷&ÖDFVfVÇE7VÆÄÆWfVÄÆ&VÂ€Ð¢7VÆÀÐ¢’°Ð¢6öç7BÆWfVÂÒ6fTçVÖ&W"€Ð¢7VÆÃòæÆWfVÂÀÐ¢ Ð¢“°Ð Ð¢&WGW&âÆWfVÂÓÓÒ Ð¢ò$6çG&— Ð¢¢ÆWfVÂG¶ÆWfVÇÖ°Ð¢ÐÐ Ð¢gVæ7F–öâf÷&ÖE6V7F–öãe7VÆÄ6ö×öæVçG2€Ð¢7VÆÀÐ¢’°Ð¢6öç7B6ö×öæVçG2Ò7VÆÃòæ6ö×öæVçG3°Ð Ð¢–b‡G—Vöb6ö×öæVçG2ÓÓÒ'7G&–ær"’°Ð¢&WGW&â6ö×öæVçG3°Ð¢ÐÐ Ð¢–b€Ð¢6ö×öæVçG2ÇÀÐ¢G—Vöb6ö×öæVçG2ÓÒ&ö&¦V7B Ð¢’°Ð¢&WGW&â"#°Ð¢ÐÐ Ð¢6öç7B'G2ÒµÓ°Ð¢–b†6ö×öæVçG2çfW&&Â’'G2çW6‚‚%b"“°Ð¢–b†6ö×öæVçG2ç6öÖF–2’'G2çW6‚‚%2"“°Ð¢–b†6ö×öæVçG2æÖFW&–Â’'G2çW6‚‚$Ò"“°Ð Ð¢6öç7BÖFW&–ÅFW‡BÒ6ÆVå7G&–ær€Ð¢6ö×öæVçG2æÖFW&–ÅFW‡@Ð¢“°Ð Ð¢&WGW&âG·'G2æ¦ö–â‚"Â"—ÒG°Ð¢ÖFW&–ÅFW‡@Ð¢ò‚G¶ÖFW&–ÅFW‡GÒ– Ð¢¢" Ð¢Ö°Ð¢ÐÐ Ð¢gVæ7F–öâf÷&ÖE6V7F–öãe7VÆÅ&W6öÇWF–öâ€Ð¢7VÆÀÐ¢’°Ð¢6öç7B'G2ÒµÓ°Ð¢6öç7BGF6µG—RÒ6ÆVå7G&–ær€Ð¢7VÆÃòæGF6µG—PÐ¢“°Ð¢6öç7B6fT&–Æ—G’Ò6ÆVå7G&–ær€Ð¢7VÆÃòç6fT&–Æ—GÐ¢“°Ð¢6öç7BFÖvUG—W2ÒVæ—VT6ÆVä'&’€Ð¢€Ð¢'&’æ—4'&’‡7VÆÃòæFÖvRÐ¢ò7VÆÂæFÖvPÐ¢¢µÐÐ¢’æÖ‚†VçG'’’Óâ°Ð¢&WGW&âVçG'“òæFÖvUG—S°Ð¢ÒÐ¢“°Ð Ð¢–b†GF6µG—R’°Ð¢6öç7BGF6´Æ&VÂÒ°Ð¢ÖVÆVS¢$ÖVÆVR7VÆÂGF6²"ÀÐ¢&ævVC¢%&ævVB7VÆÂGF6²"ÀÐ¢&ÖVÆVR×vVöâ# Ð¢$ÖVÆVRvVöâGF6²"ÀÐ¢'&ævVB×vVöâ# Ð¢%&ævVBvVöâGF6² Ð¢Õ¶GF6µG—UÒÇÂGF6µG—S°Ð Ð¢'G2çW6‚†GF6´Æ&VÂ“°Ð¢ÐÐ Ð¢–b‡6fT&–Æ—G’’°Ð¢'G2çW6‚€Ð¢G·6fT&–Æ—G’çFõWW$66R‚—Ò6f–ærF‡&÷v Ð¢“°Ð¢ÐÐ Ð¢–b†FÖvUG—W2æÆVæwF‚’°Ð¢'G2çW6‚€Ð¢G¶FÖvUG—W2æ¦ö–â‚"ò"—ÒFÖvV Ð¢“°Ð¢ÐÐ Ð¢–b€Ð¢'&’æ—4'&’‡7VÆÃòæ†VÆ–ær’b`Ð¢7VÆÂæ†VÆ–æræÆVæwF€Ð¢’°Ð¢'G2çW6‚‚&†VÆ–ær"“°Ð¢ÐÐ Ð¢&WGW&â'G2æ¦ö–â‚"+r"“°Ð¢ÐÐ Ð¢gVæ7F–öâf÷&ÖE6V7F–öãe7VÆÅ66Æ–ær€Ð¢7VÆÀÐ¢’°Ð¢6öç7B6†&7FW%66Æ–ærÐÐ¢ö&¦V7BæVçG&–W2€Ð¢7VÆÃòç66Æ–æpÐ¢òæD6†&7FW$ÆWfVÂÇÀÐ¢·ÐÐ¢“°Ð¢6öç7B6Æ÷E66Æ–ærÐÐ¢ö&¦V7BæVçG&–W2€Ð¢7VÆÃòç66Æ–æpÐ¢òæE6Æ÷DÆWfVÂÇÀÐ¢·ÐÐ¢“°Ð¢6öç7B†VÆ–æu66Æ–ærÐÐ¢ö&¦V7BæVçG&–W2€Ð¢7VÆÃòç66Æ–æpÐ¢òæ†VÆ–ætE6Æ÷DÆWfVÂÇÀÐ¢·ÐÐ¢“°Ð¢6öç7B'G2ÒµÓ°Ð Ð¢–b†6†&7FW%66Æ–æræÆVæwF‚’°Ð¢'G2çW6‚€Ð¢6†&7FW"ÆWfVÂG¶6†&7FW%66Æ–æpÐ¢æÖ‚…¶ÆWfVÂÂfÇVUÒ’Óâ°Ð¢&WGW&âG¶ÆWfVÇÓ¢G·fÇVWÖ°Ð¢ÒÐ¢æ¦ö–â‚"Â"—Ö Ð¢“°Ð¢ÐÐ Ð¢–b‡6Æ÷E66Æ–æræÆVæwF‚’°Ð¢'G2çW6‚€Ð¢6Æ÷BÆWfVÂG·6Æ÷E66Æ–æpÐ¢æÖ‚…¶ÆWfVÂÂfÇVUÒ’Óâ°Ð¢&WGW&âG¶ÆWfVÇÓ¢G·fÇVWÖ°Ð¢ÒÐ¢æ¦ö–â‚"Â"—Ö Ð¢“°Ð¢ÐÐ Ð¢–b††VÆ–æu66Æ–æræÆVæwF‚’°Ð¢'G2çW6‚€Ð¢†VÆ–ær'’6Æ÷BG¶†VÆ–æu66Æ–æpÐ¢æÖ‚…¶ÆWfVÂÂfÇVUÒ’Óâ°Ð¢&WGW&âG¶ÆWfVÇÓ¢G·fÇVWÖ°Ð¢ÒÐ¢æ¦ö–â‚"Â"—Ö Ð¢“°Ð¢ÐÐ Ð¢&WGW&â'G2æ¦ö–â‚"+r"“°Ð¢ÐÐ Ð¢gVæ7F–öâ&VæFW%6V7F–öãdÖv–6Å6V7&WG2‚’°Ð¢&WGW&â&VæFW$Öv–6Å6V7&WG5æVÇ2†vWE6V7F–öã$6Æ74fVGW&W5F‡&÷Vv„ÆWfVÂ‚’Â°Ð¢6Æ74÷F–öç3¢vWE7VÆÆ67F–æt6Æ74÷F–öç2†7&VF÷%7FFRæG&gB’ÂvWD6†ö–6T¶W“¢vWE6V7F–öã$fVGW&T6†ö–6T¶W’ÂvWD6†ö–6T6÷VçC¢vWE6V7F–öã$fVGW&T6†ö÷6T6÷VçBÀÐ¢vWE6VÆV7F–öç3¢vWE6V7F–öã$fVGW&U7F÷&VD6†ö–6W2ÂvWD÷F–öç3¢vWE6V7F–öã$fVGW&T6†ö–6T÷F–öå&V6÷&G2ÂvWE6÷W&6T¶W“¢vWE6V7F–öãe6÷W&6T¶W’ÂvWE7VÆÄ'”–C¢vWE6V7F–öãe7VÆÄ'”–@Ð¢Ò“°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öãe6VÆV7FVDFVfVÇE7VÆÄ–G2‚’°Ð¢6öç7B6VÆV7FVD–G2ÒæWr6WB‚“°Ð¢vWE7VÆÆ67F–æt6Æ74÷F–öç2†7&VF÷%7FFRæG&gB’æf÷$V6‚‚†VçG'’’Óâ°Ð¢6öç7B6÷W&6RÒvWE6V7F–öãe6÷W&6U7FFR†VçG'’Â²7&VFS¢fÇ6RÒ“°Ð¢²&6çG&—–G2"Â&¶æ÷vå7VÆÄ–G2"Â'&W&VE7VÆÄ–G2"Â'7VÆÆ&ööµ7VÆÄ–G2"Â&Çv—5&W&VE7VÆÄ–G2"Â&Öv–6Å6V7&WE7VÆÄ–G2%Òæf÷$V6‚‚†¶W’’Óâ°Ð¢6ÆVä'&’‡6÷W&6Sòå¶¶W•Ò’æf÷$V6‚‚‡7VÆÄ–B’Óâ6VÆV7FVD–G2æFB‡7VÆÄ–B’“°Ð¢Ò“°Ð¢ö&¦V7BçfÇVW2‡6÷W&6Sòæ×—7F–4&6çVÕ7VÆÄ–G2ÇÂ·Ò’æf÷$V6‚‚‡7VÆÄ–B’Óâ°Ð¢–b‡7VÆÄ–B’6VÆV7FVD–G2æFB‡7VÆÄ–B“°Ð¢Ò“°Ð¢Ò“°Ð¢&WGW&â6VÆV7FVD–G3°Ð¢ÐÐ¢gVæ7F–öâ&VæFW%6V7F–öãdFVfVÇE7VÆÅf–WvW"€Ð¢–6¶W%7FFRÒ6V7F–öãe7VÆÅ–6¶W%7FFRÀÐ¢6VÆV7FVE7VÆÅ6÷W&6T–G2ÐÐ¢6V7F–öãe6VÆV7FVE7VÆÅ6÷W&6T–G0Ð¢’°Ð¢Ö–w&FU6V7F–öãdÆVv7•7VÆÅ6VÆV7F–öç2‚“°Ð Ð¢6öç7B7VÆÇ2Ò°Ð¢ââäDTdTÅEõ5TÄÅ0Ð¢Òç6÷'B‚†Â"’Óâ°Ð¢6öç7BÆWfVÄ6ö×&RÐÐ¢6fTçVÖ&W"†æÆWfVÂÂ’ÐÐ¢6fTçVÖ&W"†"æÆWfVÂÂ“°Ð Ð¢–b†ÆWfVÄ6ö×&RÓÒ’°Ð¢&WGW&âÆWfVÄ6ö×&S°Ð¢ÐÐ Ð¢&WGW&â7G&–ær€Ð¢ææÖRÇÂ" Ð¢’æÆö6ÆT6ö×&R€Ð¢7G&–ær†"ææÖRÇÂ""Ð¢“°Ð¢Ò“°Ð Ð¢–b‚7VÆÇ2æÆVæwF‚’°Ð¢&WGW&â Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"×Æ6V†öÆFW"#àÐ¢æòFVfVÇB7VÆÂ&V6÷&G2&R7W'&VçFÇ’Æ—7FVBàÐ¢ÂöF—càÐ¢°Ð¢ÐÐ Ð¢6öç7B6VÆV7FVE7VÆÄ–G2ÒvWE6V7F–öãe6VÆV7FVDFVfVÇE7VÆÄ–G2‚“°Ð Ð¢&WGW&â Ð¢ÆF—`Ð¢6Æ73Ò&†rÖ6†&7FW"Öf–VÆB Ð¢FFÖ62ÖFVfVÇB×7VÆÂ×f–WvW#Ò'G'VR Ð¢FFÖ62×7VÆÂ×–6¶W"ÖÖævVCÒ'G'VR Ð¢àÐ¢ÆÆ&VÂf÷#Ò&64FVfVÇE7VÆÅ6V&6‚#àÐ¢6V&6‚FVfVÇB7VÆÇ0Ð¢ÂöÆ&VÃàÐ Ð¢Æ–çW@Ð¢–CÒ&64FVfVÇE7VÆÅ6V&6‚ Ð¢G—SÒ'6V&6‚ Ð¢fÇVSÒ"G¶W66T‡FÖÂ‡–6¶W%7FFRçVW'’—Ò Ð¢Æ6V†öÆFW#Ò%6V&6‚æÖRÂÆWfVÂÂ66†ööÂÂ6Æ72Â67F–ærF–ÖRÂFÖvRÂ÷"6÷W&6Râââ Ð¢FFÖ62Ö7F–öâÖ–çWCÒ&f–ÇFW"ÖFVfVÇB×7VÆÇ2 Ð¢WFö6ö×ÆWFSÒ&öfb Ð¢àÐ Ð¢ÆÆ&VÂ6Æ73Ò&†r×V’Ö6†V6²#àÐ¢Æ–çWBG—SÒ&6†V6¶&÷‚"FFÖ†r×6VÆV7FVB×7VÆÇ2ÖöæÇ’G·–6¶W%7FFRç6VÆV7FVDöæÇ’ò&6†V6¶VB"¢"'ÓàÐ¢6†÷r6VÆV7FVBöæÇÐ¢ÂöÆ&VÃàÐ Ð¢ÆF—bFFÖ62ÖFVfVÇB×7VÆÂ×&W7VÇG3Ò'G'VR#àÐ¢G·&VæFW$7&VF÷%7VÆÅ–6¶W%&W7VÇG2‡°Ð¢7VÆÇ2ÀÐ¢7FFS¢–6¶W%7FFRÀÐ¢—56VÆV7FVC¢‡7VÆÂ’Óâ6VÆV7FVE7VÆÄ–G2æ†2‡7VÆÂæ–B’ÀÐ¢&VæFW$6&C¢‡7VÆÂ’Óâ°Ð¢6öç7BÆWfVÄÆ&VÂÐÐ¢f÷&ÖDFVfVÇE7VÆÄÆWfVÄÆ&VÂ€Ð¢7VÆÀÐ¢“°Ð Ð¢6öç7B6÷W&6T6æF–FFW2ÐÐ¢vWE6V7F–öãdVÆ–v–&ÆU7VÆÆ67FW'2€Ð¢7VÆÂÀÐ¢²Væf÷&6TÆWfVÃ¢fÇ6RÐÐ¢“°Ð Ð¢6öç7BVÆ–v–&ÆU6÷W&6W2ÐÐ¢vWE6V7F–öãdVÆ–v–&ÆU7VÆÆ67FW'2€Ð¢7VÆÀÐ¢“°Ð Ð¢6öç7B&VfW'&VE6÷W&6T–BÐÐ¢6VÆV7FVE7VÆÅ6÷W&6T–G0Ð¢ævWB‡7VÆÂæ–B’ÇÂ"#°Ð Ð¢6öç7B6VÆV7FVE6÷W&6RÐÐ¢6÷W&6T6æF–FFW2æf–æB‚†VçG'’’Óâ°Ð¢&WGW&â€Ð¢vWE6V7F–öãe6÷W&6T¶W’†VçG'’’ÓÓÐÐ¢&VfW'&VE6÷W&6T–@Ð¢“°Ð¢Ò’ÇÀÐ¢6÷W&6T6æF–FFW2æf–æB‚†VçG'’’Óâ°Ð¢6öç7B6÷W&6RÐÐ¢vWE6V7F–öãe6÷W&6U7FFR€Ð¢VçG'’ÀÐ¢²7&VFS¢fÇ6RÐÐ¢“°Ð Ð¢&WGW&â&ööÆVâ€Ð¢6÷W&6Rb`Ð¢€Ð¢6÷W&6Ræ6çG&—–G0Ð¢æ–æ6ÇVFW2‡7VÆÂæ–B’ÇÀÐ¢6÷W&6Ræ¶æ÷vå7VÆÄ–G0Ð¢æ–æ6ÇVFW2‡7VÆÂæ–B’ÇÀÐ¢6÷W&6Rç&W&VE7VÆÄ–G0Ð¢æ–æ6ÇVFW2‡7VÆÂæ–B’ÇÀÐ¢6÷W&6Rç7VÆÆ&ööµ7VÆÄ–G0Ð¢æ–æ6ÇVFW2‡7VÆÂæ–B’ÇÀÐ¢6÷W&6RæÇv—5&W&VE7VÆÄ–G0Ð¢æ–æ6ÇVFW2‡7VÆÂæ–B’ÇÀÐ¢ö&¦V7BçfÇVW2€Ð¢6÷W&6Ræ×—7F–4&6çVÕ7VÆÄ–G2ÇÀÐ¢·ÐÐ¢’æ–æ6ÇVFW2‡7VÆÂæ–BÐ¢Ð¢“°Ð¢Ò’ÇÀÐ¢VÆ–v–&ÆU6÷W&6W5³ÒÇÀÐ¢6÷W&6T6æF–FFW5³ÒÇÀÐ¢çVÆÃ°Ð Ð¢6öç7B6÷W&6T–BÐÐ¢vWE6V7F–öãe6÷W&6T¶W’€Ð¢6VÆV7FVE6÷W&6PÐ¢“°Ð Ð¢6öç7B6÷W&6U7FFRÒ6VÆV7FVE6÷W&6PÐ¢òvWE6V7F–öãe6÷W&6U7FFR€Ð¢6VÆV7FVE6÷W&6RÀÐ¢²7&VFS¢fÇ6RÐÐ¢Ð¢¢çVÆÃ°Ð Ð¢6öç7BW‡æFVDw&çBÒ6VÆV7FVE6÷W&6PÐ¢òvWE6V7F–öãdW‡æFVE7VÆÄw&çB€Ð¢6VÆV7FVE6÷W&6RÀÐ¢7VÆÀÐ¢Ð¢¢çVÆÃ°Ð Ð¢6öç7BÇv—5&W&VBÒ&ööÆVâ€Ð¢6÷W&6U7FFPÐ¢òæÇv—5&W&VE7VÆÄ–G0Ð¢òæ–æ6ÇVFW2‡7VÆÂæ–BÐ¢“°Ð Ð¢6öç7B—4×—7F–4&6çVÒÒ&ööÆVâ€Ð¢6VÆV7FVE6÷W&6Rb`Ð¢—56V7F–öãd×—7F–4&6çVÕ7VÆÂ€Ð¢6VÆV7FVE6÷W&6RÀÐ¢7VÆÀÐ¢Ð¢“°Ð Ð¢6öç7B×—7F–4&6çVÕ6VÆV7FVBÒ&ööÆVâ€Ð¢—4×—7F–4&6çVÒb`Ð¢6÷W&6U7FFPÐ¢òæ×—7F–4&6çVÕ7VÆÄ–G3òå°Ð¢7G&–ær€Ð¢6fTçVÖ&W"‡7VÆÂæÆWfVÂÂÐ¢Ð¢ÒÓÓÒ7VÆÂæ–@Ð¢“°Ð Ð¢6öç7B¶æ÷vâÒ6÷W&6T–@Ð¢ò—56V7F–öãe7VÆÄ¶æ÷vâ€Ð¢7VÆÂæ–BÀÐ¢6÷W&6T–@Ð¢Ð¢¢fÇ6S°Ð Ð¢6öç7B&W&VBÒ6÷W&6T–@Ð¢ò—56V7F–öãe7VÆÅ&W&VB€Ð¢7VÆÂæ–BÀÐ¢6÷W&6T–@Ð¢Ð¢¢fÇ6S°Ð Ð¢6öç7BÖöFRÒ6VÆV7FVE6÷W&6PÐ¢òvWE6V7F–öãe&W&F–öäÖöFR€Ð¢6VÆV7FVE6÷W&6PÐ¢Ð¢¢&¶æ÷vâ#°Ð Ð¢6öç7B—46çG&—ÐÐ¢6fTçVÖ&W"‡7VÆÂæÆWfVÂÂ’ÓÓÒ°Ð Ð¢6öç7B6†÷t¶æ÷vä7F–öâÐÐ¢&ööÆVâ‡6VÆV7FVE6÷W&6R’b`Ð¢Çv—5&W&VBb`Ð¢—4×—7F–4&6çVÒb`Ð¢€Ð¢—46çG&—ÇÀÐ¢ÖöFRÓÒ'&W&VB Ð¢“°Ð Ð¢6öç7B6†÷u&W&VD7F–öâÐÐ¢&ööÆVâ‡6VÆV7FVE6÷W&6R’b`Ð¢Çv—5&W&VBb`Ð¢—4×—7F–4&6çVÒb`Ð¢—46çG&—b`Ð¢ÖöFRÓÒ&¶æ÷vâ#°Ð Ð¢6öç7B¶æ÷vä7F–öäÆ&VÂÐÐ¢ÖöFRÓÓÒ'7VÆÆ&öö²×&W&VB"b`Ð¢—46çG&— Ð¢ò¶æ÷vàÐ¢ò%&VÖ÷fRg&öÒ7VÆÆ&öö² Ð¢¢$FBFò7VÆÆ&öö² Ð¢¢¶æ÷vàÐ¢ò$f÷&vWB Ð¢¢$ÆV&â#°Ð Ð¢6öç7B7FGW4Æ&VÂÒÇv—5&W&V@Ð¢ò$Çv—2&W&VB Ð¢¢×—7F–4&6çVÕ6VÆV7FV@Ð¢ò×—7F–2&6çVÒ†ÆWfVÂG·6fTçVÖ&W"€Ð¢7VÆÂæÆWfVÂÀÐ¢ Ð¢—Ò– Ð¢¢&W&V@Ð¢ò%&W&VB Ð¢¢¶æ÷vàÐ¢òÖöFRÓÓÒ'7VÆÆ&öö²×&W&VB"b`Ð¢—46çG&— Ð¢ò$–â7VÆÆ&öö² Ð¢¢$¶æ÷vâ Ð¢¢$æ÷B6VÆV7FVB#°Ð Ð¢6öç7B6÷W&6T7W'&VçFÇ”VÆ–v–&ÆRÐÐ¢&ööÆVâ€Ð¢6VÆV7FVE6÷W&6Rb`Ð¢VÆ–v–&ÆU6÷W&6W2ç6öÖR‚†VçG'’’Óâ°Ð¢&WGW&â€Ð¢vWE6V7F–öãe6÷W&6T¶W’†VçG'’’ÓÓÐÐ¢6÷W&6T–@Ð¢“°Ð¢ÒÐ¢“°Ð Ð¢6öç7B6ö×öæVçG2ÐÐ¢f÷&ÖE6V7F–öãe7VÆÄ6ö×öæVçG2€Ð¢7VÆÀÐ¢“°Ð¢6öç7B&W6öÇWF–öâÐÐ¢f÷&ÖE6V7F–öãe7VÆÅ&W6öÇWF–öâ€Ð¢7VÆÀÐ¢“°Ð¢6öç7B66Æ–ærÐÐ¢f÷&ÖE6V7F–öãe7VÆÅ66Æ–ær€Ð¢7VÆÀÐ¢“°Ð Ð¢6öç7B6V&6…FW‡BÐÐ¢vWD7&VF÷%7VÆÅ6V&6…FW‡B‡7VÆÂ“°Ð Ð¢&WGW&â Ð¢Æ'F–6ÆPÐ¢6Æ73Ò&†rÖ6†&7FW"Ö6†ö–6RÖ6&BG°Ð¢&W&VBÇÂ¶æ÷vâÇÀÐ¢Çv—5&W&VBÇÀÐ¢×—7F–4&6çVÕ6VÆV7FV@Ð¢ò'6VÆV7FVB Ð¢¢" Ð¢Ò Ð¢FFÖ62ÖFVfVÇB×7VÆÂÖ÷F–öãÒ'G'VR Ð¢FF×7VÆÂÖ–CÒ"G¶W66T‡FÖÂ‡7VÆÂæ–B—Ò Ð¢FF×7VÆÂÖÆWfVÃÒ"G·6fTçVÖ&W"‡7VÆÂæÆWfVÂÂ—Ò Ð¢FF×7VÆÂ×6V&6‚×FW‡CÒ"G¶W66T‡FÖÂ€Ð¢6V&6…FW‡@Ð¢—Ò Ð¢àÐ¢Æƒ3àÐ¢G¶W66T‡FÖÂ€Ð¢7VÆÂææÖRÇÀÐ¢%VææÖVB7VÆÂ Ð¢—ÐÐ¢Âöƒ3àÐ Ð¢ÇàÐ¢Æ#âG¶W66T‡FÖÂ€Ð¢ÆWfVÄÆ&VÀÐ¢—ÓÂö#àÐ Ð¢G°Ð¢7VÆÂç66†ööÀÐ¢ò8,+rG¶W66T‡FÖÂ€Ð¢7VÆÂç66†ööÀÐ¢—Ö Ð¢¢" Ð¢ÐÐ Ð¢Æ'#àÐ Ð¢G¶W66T‡FÖÂ€Ð¢7VÆÂç7VÖÖ'’ÇÀÐ¢$æò7VÖÖ'’&÷f–FVBâ Ð¢—ÐÐ Ð¢Æ'#ãÆ'#àÐ Ð¢G·&VæFW%'VÆW6WDÖWFFF‡7VÆÂÂ'7VÆÂ"—ÐÐ¢Â÷àÐ Ð¢Æ'WGFöâG—SÒ&'WGFöâ"FFÖ62Ö7F–öãÒ'FövvÆRÖFVfVÇB×7VÆÂÖFWF–Ç2"FF×7VÆÂÖ–CÒ"G¶W66T‡FÖÂ‡7VÆÂæ–B—Ò#àÐ¢G·–6¶W%7FFRæW‡æFVE7VÆÄ–G2æ†2‡7VÆÂæ–B’ò$†–FR"¢%6†÷r'Ò7VÆÂFWF–Ç0Ð¢Âö'WGFöãàÐ Ð¢G·–6¶W%7FFRæW‡æFVE7VÆÄ–G2æ†2‡7VÆÂæ–B’òÇ6Æ73Ò'6ÖÆÂ#àÐ¢Æ#ä67F–ærF–ÖS£Âö#àÐ¢G¶W66T‡FÖÂ€Ð¢7VÆÂæ67F–æuF–ÖRÇÀÐ¢$æ÷B7V6–f–VB Ð¢—ÐÐ Ð¢Æ'#àÐ Ð¢Æ#å&ævS£Âö#àÐ¢G¶W66T‡FÖÂ€Ð¢7VÆÂç&ævRÇÀÐ¢$æ÷B7V6–f–VB Ð¢—ÐÐ Ð¢Æ'#àÐ Ð¢Æ#ä6ö×öæVçG3£Âö#àÐ¢G¶W66T‡FÖÂ€Ð¢6ö×öæVçG2ÇÂ$æöæR Ð¢—ÐÐ Ð¢Æ'#àÐ Ð¢Æ#äGW&F–öã£Âö#àÐ¢G¶W66T‡FÖÂ€Ð¢7VÆÂæGW&F–öâÇÀÐ¢$æ÷B7V6–f–VB Ð¢—ÐÐ Ð¢G°Ð¢&W6öÇWF–öàÐ¢ò Ð¢Æ'#àÐ¢Æ#å&W6öÇWF–öã£Âö#àÐ¢G¶W66T‡FÖÂ€Ð¢&W6öÇWF–öàÐ¢—ÐÐ¢ Ð¢¢" Ð¢ÐÐ Ð¢G°Ð¢66Æ–æpÐ¢ò Ð¢Æ'#àÐ¢Æ#å66Æ–æs£Âö#àÐ¢G¶W66T‡FÖÂ€Ð¢66Æ–æpÐ¢—ÐÐ¢ Ð¢¢" Ð¢ÐÐ Ð¢G°Ð¢7VÆÂç&—GVÀÐ¢ò#Æ'#ãÆ#å&—GVÃÂö#â Ð¢¢" Ð¢ÐÐ Ð¢G°Ð¢7VÆÂæ6öæ6VçG&F–öàÐ¢ò#Æ'#ãÆ#ä6öæ6VçG&F–öãÂö#â Ð¢¢" Ð¢ÐÐ Ð¢Æ'#ãÆ'#àÐ Ð¢G¶W66T‡FÖÂ€Ð¢7VÆÂæFW67&—F–öâÇÀÐ¢$æòFW67&—F–öâ&÷f–FVBâ Ð¢—ÐÐ Ð¢G°Ð¢7VÆÂæ†–v†W$ÆWfVÄFW67&—F–öàÐ¢ò Ð¢Æ'#ãÆ'#àÐ¢Æ#äB†–v†W"ÆWfVÇ3£Âö#àÐ¢G¶W66T‡FÖÂ€Ð¢7VÆÂæ†–v†W$ÆWfVÄFW67&—F–öàÐ¢—ÐÐ¢ Ð¢¢" Ð¢ÐÐ Ð¢Æ'#àÐ Ð¢Æ#å6÷W&6S£Âö#àÐ Ð¢G¶W66T‡FÖÂ€Ð¢7VÆÂç6÷W&6RÇÀÐ¢&FVfVÇB Ð¢—ÐÐ¢Â÷æ¢"'ÐÐ Ð¢G°Ð¢6÷W&6T6æF–FFW2æÆVæwF‚â Ð¢ò Ð¢ÆÆ&VÂ6Æ73Ò'6ÖÆÂ#àÐ¢6Æ726÷W&6PÐ Ð¢Ç6VÆV7@Ð¢–CÒ&657VÆÅ6÷W&6RÒG¶W66T‡FÖÂ€Ð¢7VÆÂæ–@Ð¢—Ò Ð¢FFÖ62×7VÆÂ×6÷W&6R×6VÆV7CÒ"G¶W66T‡FÖÂ€Ð¢7VÆÂæ–@Ð¢—Ò Ð¢àÐ¢G·6÷W&6T6æF–FFW2æÖ‚†VçG'’’Óâ°Ð¢6öç7BVçG'•6÷W&6T–BÐÐ¢vWE6V7F–öãe6÷W&6T¶W’†VçG'’“°Ð Ð¢&WGW&â Ð¢Æ÷F–öàÐ¢fÇVSÒ"G¶W66T‡FÖÂ€Ð¢VçG'•6÷W&6T–@Ð¢—Ò Ð¢G°Ð¢VçG'•6÷W&6T–BÓÓÒ6÷W&6T–@Ð¢ò'6VÆV7FVB Ð¢¢" Ð¢ÐÐ¢àÐ¢G¶W66T‡FÖÂ€Ð¢G¶VçG'’æ6Æ74æÖRÇÂVçG'’æ6Æ74–GÒG¶VçG'’æÆWfVÇÒG°Ð¢VçG'’ç7V&6Æ74æÖPÐ¢ò(	BG¶VçG'’ç7V&6Æ74æÖWÖ Ð¢¢" Ð¢Ö Ð¢—ÐÐ¢Âö÷F–öãàÐ¢°Ð¢Ò’æ¦ö–â‚""—ÐÐ¢Â÷6VÆV7CàÐ¢ÂöÆ&VÃàÐ Ð¢Ç6Æ73Ò'6ÖÆÂ#àÐ¢Æ#å7FGW3£Âö#àÐ¢G¶W66T‡FÖÂ‡7FGW4Æ&VÂ—ÐÐ Ð¢G°Ð¢W‡æFVDw&ç@Ð¢ò Ð¢Æ'#àÐ¢W‡æFVB7VÆÂg&öÐÐ¢G¶W66T‡FÖÂ€Ð¢6VÆV7FVE6÷W&6Sòç7V&6Æ74æÖRÇÀÐ¢'7V&6Æ72 Ð¢—ÒàÐ¢ Ð¢¢" Ð¢ÐÐ Ð¢G°Ð¢6÷W&6T7W'&VçFÇ”VÆ–v–&ÆRb`Ð¢¶æ÷vâb`Ð¢&W&V@Ð¢ò Ð¢Æ'#àÐ¢f–Æ&ÆRv†VâF†B6Æ726â67BÆWfVÂG·6fTçVÖ&W"€Ð¢7VÆÂæÆWfVÂÀÐ¢ Ð¢—Ò7VÆÇ2àÐ¢ Ð¢¢" Ð¢ÐÐ¢Â÷àÐ Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"Ö6&BÖ7F–öç2#àÐ¢G°Ð¢6†÷t¶æ÷vä7F–öâb`Ð¢€Ð¢6÷W&6T7W'&VçFÇ”VÆ–v–&ÆRÇÀÐ¢¶æ÷vàÐ¢Ð¢ò Ð¢Æ'WGFöàÐ¢G—SÒ&'WGFöâ Ð¢FFÖ62Ö7F–öãÒ'FövvÆR×7VÆÂÖ¶æ÷vâ Ð¢FF×7VÆÂÖ–CÒ"G¶W66T‡FÖÂ€Ð¢7VÆÂæ–@Ð¢—Ò Ð¢FF×7VÆÂ×6÷W&6RÖ–CÒ"G¶W66T‡FÖÂ€Ð¢6÷W&6T–@Ð¢—Ò Ð¢àÐ¢G¶W66T‡FÖÂ€Ð¢¶æ÷vä7F–öäÆ&VÀÐ¢—ÐÐ¢Âö'WGFöãàÐ¢ Ð¢¢" Ð¢ÐÐ Ð¢G°Ð¢6†÷u&W&VD7F–öâb`Ð¢€Ð¢6÷W&6T7W'&VçFÇ”VÆ–v–&ÆRÇÀÐ¢&W&V@Ð¢Ð¢ò Ð¢Æ'WGFöàÐ¢G—SÒ&'WGFöâ Ð¢FFÖ62Ö7F–öãÒ'FövvÆR×7VÆÂ×&W&VB Ð¢FF×7VÆÂÖ–CÒ"G¶W66T‡FÖÂ€Ð¢7VÆÂæ–@Ð¢—Ò Ð¢FF×7VÆÂ×6÷W&6RÖ–CÒ"G¶W66T‡FÖÂ€Ð¢6÷W&6T–@Ð¢—Ò Ð¢àÐ¢G°Ð¢&W&V@Ð¢ò%Vç&W&R Ð¢¢%&W&R Ð¢ÐÐ¢Âö'WGFöãàÐ¢ Ð¢¢" Ð¢ÐÐ Ð¢G°Ð¢—4×—7F–4&6çVÒb`Ð¢6÷W&6T7W'&VçFÇ”VÆ–v–&ÆPÐ¢ò Ð¢Æ'WGFöàÐ¢G—SÒ&'WGFöâ Ð¢FFÖ62Ö7F–öãÒ'FövvÆR×7VÆÂÖ&6çVÒ Ð¢FF×7VÆÂÖ–CÒ"G¶W66T‡FÖÂ€Ð¢7VÆÂæ–@Ð¢—Ò Ð¢FF×7VÆÂ×6÷W&6RÖ–CÒ"G¶W66T‡FÖÂ€Ð¢6÷W&6T–@Ð¢—Ò Ð¢àÐ¢G°Ð¢×—7F–4&6çVÕ6VÆV7FV@Ð¢ò%&VÖ÷fR×—7F–2&6çVÒ Ð¢¢6÷W&6U7FFPÐ¢òæ×—7F–4&6çVÕ7VÆÄ–G3òå°Ð¢7G&–ær€Ð¢6fTçVÖ&W"€Ð¢7VÆÂæÆWfVÂÀÐ¢ Ð¢Ð¢Ð¢ÐÐ¢ò%&WÆ6R×—7F–2&6çVÒ Ð¢¢$ÆV&â×—7F–2&6çVÒ Ð¢ÐÐ¢Âö'WGFöãàÐ¢ Ð¢¢" Ð¢ÐÐ¢ÂöF—càÐ¢ Ð¢¢ Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"×Æ6V†öÆFW"#àÐ¢F†—27VÆÂ—2æ÷B7W'&VçFÇ’f–Æ&ÆRFòöæRöbF†—26†&7FW"w26Æ76W2àÐ¢ÂöF—càÐ¢ Ð¢ÐÐ¢Âö'F–6ÆSàÐ¢°Ð¢ÐÐ¢Ò—ÐÐ¢ÂöF—càÐ¢ÂöF—càÐ¢°Ð¢ÐÐ Ð¢gVæ7F–öâ&Vg&W6…6V7F–öãe7VÆÅ–6¶W"€Ð¢–6¶W%7FFRÒ6V7F–öãe7VÆÅ–6¶W%7FFRÀÐ¢6VÆV7FVE7VÆÅ6÷W&6T–G2ÐÐ¢6V7F–öãe6VÆV7FVE7VÆÅ6÷W&6T–G0Ð¢’°Ð¢6öç7B7W'&VçBÒ2æw&–CòçVW'•6VÆV7F÷"‚%¶FFÖ62ÖFVfVÇB×7VÆÂ×&W7VÇG5Ò"“°Ð¢–b‚7W'&VçB’&WGW&ã°Ð¢6öç7B67&öÆÅ’ÒG—Vöbv–æF÷rÓÓÒ'VæFVf–æVB"ò¢v–æF÷rç67&öÆÅ“°Ð¢G'’°Ð¢6öç7BFV×ÆFRÒFö7VÖVçBæ7&VFTVÆVÖVçB‚'FV×ÆFR"“°Ð¢FV×ÆFRæ–ææW$…DÔÂÒ&VæFW%6V7F–öãdFVfVÇE7VÆÅf–WvW"€Ð¢–6¶W%7FFRÀÐ¢6VÆV7FVE7VÆÅ6÷W&6T–G0Ð¢“°Ð¢6öç7BæW‡BÒFV×ÆFRæ6öçFVçBçVW'•6VÆV7F÷"‚%¶FFÖ62ÖFVfVÇB×7VÆÂ×&W7VÇG5Ò"“°Ð¢–b‚æW‡B’F‡&÷ræWrW'&÷"‚%7VÆÂ&W7VÇG26÷VÆBæ÷B&R&VæFW&VBâ"“°Ð¢7W'&VçBç&WÆ6Uv—F‚†æW‡B“°Ð¢6öç7B7VÖÖ'’Ò2æw&–BçVW'•6VÆV7F÷"‚%¶FFÖ62×7VÆÂ×6÷W&6R×7VÖÖ'•Ò"“°Ð¢–b‡7VÖÖ'’’7VÖÖ'’æ–ææW$…DÔÂÒ&VæFW%6V7F–öãu7VÆÆ67F–æu7VÖÖ'’‚“°Ð¢–b‡G—Vöbv–æF÷rÓÒ'VæFVf–æVB"’v–æF÷rç67&öÆÅFòƒÂ67&öÆÅ’“°Ð¢Ò6F6‚†W'&÷"’°Ð¢7W'&VçBæ–ææW$…DÔÂÒÆF—b6Æ73Ò&†rÖ6†&7FW"×v&æ–ær#âG¶W66T‡FÖÂ†W'&÷#òæÖW76vRÇÂ%F†R7VÆÂÆ—7B6÷VÆBæ÷B&RWFFVBâG'’&V÷Væ–ærF†R7VÆÇ27FWâ"—ÓÂöF—cæ°Ð¢ÐÐ¢ÐÐ Ð¢gVæ7F–öâ&VæFW%6V7F–öãd7W7FöÕ7VÆÇ2‚’°Ð¢6öç7B7VÆÇ2Ò°Ð¢ââævWE6V7F–öãd7W7FöÕ7VÆÇ2‚Ð¢Òç6÷'B‚†Â"’Óâ°Ð¢6öç7BÆWfVÄ6ö×&RÐÐ¢6fTçVÖ&W"€Ð¢æÆWfVÂÀÐ¢ Ð¢’ÐÐ¢6fTçVÖ&W"€Ð¢"æÆWfVÂÀÐ¢ Ð¢“°Ð Ð¢–b†ÆWfVÄ6ö×&RÓÒ’°Ð¢&WGW&âÆWfVÄ6ö×&S°Ð¢ÐÐ Ð¢&WGW&â7G&–ær€Ð¢ææÖRÇÂ" Ð¢’æÆö6ÆT6ö×&R€Ð¢7G&–ær€Ð¢"ææÖRÇÂ" Ð¢Ð¢“°Ð¢Ò“°Ð Ð¢–b‚7VÆÇ2æÆVæwF‚’°Ð¢&WGW&â Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"×Æ6V†öÆFW"#àÐ¢æò7W7FöÒ7VÆÇ2†fR&VVâFFVB–WBàÐ¢ÂöF—càÐ¢°Ð¢ÐÐ Ð¢&WGW&â7VÆÇ0Ð¢æÖ‚‡7VÆÂ’Óâ°Ð¢6öç7BçVÖW&–57VÆÄÆWfVÂÐÐ¢6fTçVÖ&W"‡7VÆÂæÆWfVÂÂ“°Ð Ð¢6öç7B7VÆÄÆWfVÂÐÐ¢çVÖW&–57VÆÄÆWfVÂÓÓÒ Ð¢ò$6çG&— Ð¢¢ÆWfVÂG¶çVÖW&–57VÆÄÆWfVÇÖ°Ð Ð¢6öç7B6÷W&6TVçG'’ÐÐ¢vWE7VÆÆ67F–ætVçG'”f÷%7VÆÂ€Ð¢7&VF÷%7FFRæG&gBÀÐ¢7VÆÀÐ¢“°Ð Ð¢6öç7B6÷W&6T–BÐÐ¢vWE6V7F–öãe6÷W&6T¶W’€Ð¢6÷W&6TVçG'Ð¢’ÇÀÐ¢vWE7VÆÅ6÷W&6T–B‡7VÆÂ“°Ð Ð¢6öç7B¶æ÷vâÐÐ¢—56V7F–öãe7VÆÄ¶æ÷vâ€Ð¢7VÆÂæ–BÀÐ¢6÷W&6T–@Ð¢“°Ð Ð¢6öç7B&W&VBÐÐ¢—56V7F–öãe7VÆÅ&W&VB€Ð¢7VÆÂæ–BÀÐ¢6÷W&6T–@Ð¢“°Ð Ð¢6öç7B&W&F–öäÖöFRÐÐ¢vWE6V7F–öãe&W&F–öäÖöFR€Ð¢6÷W&6TVçG'Ð¢“°Ð Ð¢6öç7B6÷W&6U7FFRÒ6÷W&6TVçG'Ð¢òvWE6V7F–öãe6÷W&6U7FFR€Ð¢6÷W&6TVçG'’ÀÐ¢²7&VFS¢fÇ6RÐÐ¢Ð¢¢çVÆÃ°Ð Ð¢6öç7B—4×—7F–4&6çVÒÒ&ööÆVâ€Ð¢6÷W&6TVçG'’b`Ð¢—56V7F–öãd×—7F–4&6çVÕ7VÆÂ€Ð¢6÷W&6TVçG'’ÀÐ¢7VÆÀÐ¢Ð¢“°Ð Ð¢6öç7B×—7F–4&6çVÕ6VÆV7FVBÒ&ööÆVâ€Ð¢—4×—7F–4&6çVÒb`Ð¢6÷W&6U7FFPÐ¢òæ×—7F–4&6çVÕ7VÆÄ–G3òå°Ð¢7G&–ær†çVÖW&–57VÆÄÆWfVÂÐ¢ÒÓÓÒ7VÆÂæ–@Ð¢“°Ð Ð¢6öç7B6†÷t¶æ÷vä7F–öâÐÐ¢—4×—7F–4&6çVÒb`Ð¢çVÖW&–57VÆÄÆWfVÂÓÓÒÇÀÐ¢€Ð¢—4×—7F–4&6çVÒb`Ð¢&W&F–öäÖöFRÓÒ'&W&VB Ð¢“°Ð Ð¢6öç7B6†÷u&W&VD7F–öâÐÐ¢—4×—7F–4&6çVÒb`Ð¢çVÖW&–57VÆÄÆWfVÂâb`Ð¢&W&F–öäÖöFRÓÒ&¶æ÷vâ#°Ð Ð¢6öç7B6÷W&6TÆ&VÂÐÐ¢€Ð¢6÷W&6TVçG'Ð¢òG°Ð¢6÷W&6TVçG'’æ6Æ74æÖRÇÀÐ¢6÷W&6TVçG'’æ6Æ74–@Ð¢ÒG°Ð¢6÷W&6TVçG'’ç7V&6Æ74æÖPÐ¢ò(	BG·6÷W&6TVçG'’ç7V&6Æ74æÖWÖ Ð¢¢" Ð¢Ö Ð¢¢" Ð¢’ÇÀÐ¢6÷W&6T–BÇÀÐ¢$æVVG2&Wf–Wr#°Ð Ð¢6öç7B6÷W&6Uv&æ–ærÐÐ¢vWE7VÆÅ6÷W&6Uv&æ–ær€Ð¢7&VF÷%7FFRæG&gBÀÐ¢7VÆÀÐ¢“°Ð Ð¢&WGW&â Ð¢Æ'F–6ÆPÐ¢6Æ73Ò Ð¢†rÖ6†&7FW"Ö6†ö–6RÖ6&@Ð¢G°Ð¢&W&VBÇÀÐ¢¶æ÷vâÇÀÐ¢×—7F–4&6çVÕ6VÆV7FV@Ð¢ò'6VÆV7FVB Ð¢¢" Ð¢ÐÐ¢ Ð¢àÐ¢Æƒ3àÐ¢G¶W66T‡FÖÂ€Ð¢7VÆÂææÖRÇÀÐ¢%VææÖVB7VÆÂ Ð¢—ÐÐ¢Âöƒ3àÐ Ð¢ÇàÐ¢Æ#âG¶W66T‡FÖÂ€Ð¢7VÆÄÆWfVÀÐ¢—ÓÂö#àÐ Ð¢+pÐ Ð¢G¶W66T‡FÖÂ€Ð¢7VÆÂç66†ööÂÇÀÐ¢%Væ¶æ÷vâ Ð¢—ÐÐ Ð¢Æ'#ãÆ'#àÐ Ð¢G·&VæFW%'VÆW6WDÖWFFF‡7VÆÂÂ'7VÆÂ"—ÐÐ Ð¢Æ'#ãÆ'#àÐ Ð¢Æ#ä6Æ726÷W&6S£Âö#àÐ Ð¢G¶W66T‡FÖÂ€Ð¢6÷W&6TÆ&VÀÐ¢—ÐÐ Ð¢G°Ð¢6÷W&6Uv&æ–æpÐ¢ò Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"×v&æ–ær#àÐ¢G¶W66T‡FÖÂ€Ð¢6÷W&6Uv&æ–æpÐ¢—ÐÐ¢ÂöF—càÐ¢ Ð¢¢" Ð¢ÐÐ Ð¢Æ'#àÐ Ð¢Æ#ä67F–ærF–ÖS£Âö#àÐ Ð¢G¶W66T‡FÖÂ€Ð¢7VÆÂæ67F–æuF–ÖRÇÀÐ¢#7F–öâ Ð¢—ÐÐ Ð¢Æ'#àÐ Ð¢Æ#å&ævS£Âö#àÐ Ð¢G¶W66T‡FÖÂ€Ð¢7VÆÂç&ævRÇÀÐ¢%6VÆb Ð¢—ÐÐ Ð¢Æ'#àÐ Ð¢Æ#äGW&F–öã£Âö#àÐ Ð¢G¶W66T‡FÖÂ€Ð¢7VÆÂæGW&F–öâÇÀÐ¢$–ç7FçFæV÷W2 Ð¢—ÐÐ Ð¢G°Ð¢f÷&ÖE6V7F–öãe7VÆÅ&W6öÇWF–öâ€Ð¢7VÆÀÐ¢Ð¢ò Ð¢Æ'#àÐ Ð¢Æ#å&W6öÇWF–öã£Âö#àÐ Ð¢G¶W66T‡FÖÂ€Ð¢f÷&ÖE6V7F–öãe7VÆÅ&W6öÇWF–öâ€Ð¢7VÆÀÐ¢Ð¢—ÐÐ¢ Ð¢¢" Ð¢ÐÐ Ð¢G°Ð¢f÷&ÖE6V7F–öãe7VÆÅ66Æ–ær€Ð¢7VÆÀÐ¢Ð¢ò Ð¢Æ'#àÐ Ð¢Æ#å66Æ–æs£Âö#àÐ Ð¢G¶W66T‡FÖÂ€Ð¢f÷&ÖE6V7F–öãe7VÆÅ66Æ–ær€Ð¢7VÆÀÐ¢Ð¢—ÐÐ¢ Ð¢¢" Ð¢ÐÐ Ð¢G°Ð¢f÷&ÖE6V7F–öãe7VÆÄ6ö×öæVçG2€Ð¢7VÆÀÐ¢Ð¢ò Ð¢Æ'#àÐ Ð¢Æ#ä6ö×öæVçG3£Âö#àÐ Ð¢G¶W66T‡FÖÂ€Ð¢f÷&ÖE6V7F–öãe7VÆÄ6ö×öæVçG2€Ð¢7VÆÀÐ¢Ð¢—ÐÐ¢ Ð¢¢" Ð¢ÐÐ Ð¢G°Ð¢7VÆÂç&—GVÀÐ¢ò Ð¢Æ'#àÐ Ð¢Æ#å&—GVÃÂö#àÐ¢ Ð¢¢" Ð¢ÐÐ Ð¢G°Ð¢7VÆÂæ6öæ6VçG&F–öàÐ¢ò Ð¢Æ'#àÐ Ð¢Æ#ä6öæ6VçG&F–öãÂö#àÐ¢ Ð¢¢" Ð¢ÐÐ Ð¢Æ'#àÐ Ð¢Æ#å7FGW3£Âö#àÐ Ð¢G°Ð¢×—7F–4&6çVÕ6VÆV7FV@Ð¢ò$×—7F–2&6çVÒ Ð¢¢&W&V@Ð¢ò%&W&VB Ð¢¢¶æ÷vàÐ¢ò&W&F–öäÖöFRÓÓÐÐ¢'7VÆÆ&öö²×&W&VB"b`Ð¢çVÖW&–57VÆÄÆWfVÂâ Ð¢ò$–â7VÆÆ&öö² Ð¢¢$¶æ÷vâ Ð¢¢$æ÷B¶æ÷vâ Ð¢ÐÐ¢Â÷àÐ Ð¢G°Ð¢7VÆÂæFW67&—F–öàÐ¢ò Ð¢Ç6Æ73Ò'6ÖÆÂ#àÐ¢G¶W66T‡FÖÂ€Ð¢7VÆÂæFW67&—F–öàÐ¢—ÐÐ¢Â÷àÐ¢ Ð¢¢" Ð¢ÐÐ Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"Ö6&BÖ7F–öç2#àÐ¢G°Ð¢6†÷t¶æ÷vä7F–öàÐ¢ò Ð¢Æ'WGFöàÐ¢G—SÒ&'WGFöâ Ð¢FFÖ62Ö7F–öãÒ'FövvÆR×7VÆÂÖ¶æ÷vâ Ð¢FF×7VÆÂÖ–CÒ"G¶W66T‡FÖÂ€Ð¢7VÆÂæ–@Ð¢—Ò Ð¢FF×7VÆÂ×6÷W&6RÖ–CÒ"G¶W66T‡FÖÂ€Ð¢6÷W&6T–@Ð¢—Ò Ð¢àÐ¢G°Ð¢&W&F–öäÖöFRÓÓÐÐ¢'7VÆÆ&öö²×&W&VB"b`Ð¢çVÖW&–57VÆÄÆWfVÂâ Ð¢ò¶æ÷vàÐ¢ò%&VÖ÷fRg&öÒ7VÆÆ&öö² Ð¢¢$FBFò7VÆÆ&öö² Ð¢¢¶æ÷vàÐ¢ò$f÷&vWB Ð¢¢$ÆV&â Ð¢ÐÐ¢Âö'WGFöãàÐ¢ Ð¢¢" Ð¢ÐÐ Ð¢G°Ð¢6†÷u&W&VD7F–öàÐ¢ò Ð¢Æ'WGFöàÐ¢G—SÒ&'WGFöâ Ð¢FFÖ62Ö7F–öãÒ'FövvÆR×7VÆÂ×&W&VB Ð¢FF×7VÆÂÖ–CÒ"G¶W66T‡FÖÂ€Ð¢7VÆÂæ–@Ð¢—Ò Ð¢FF×7VÆÂ×6÷W&6RÖ–CÒ"G¶W66T‡FÖÂ€Ð¢6÷W&6T–@Ð¢—Ò Ð¢àÐ¢G°Ð¢&W&V@Ð¢ò%Vç&W&R Ð¢¢%&W&R Ð¢ÐÐ¢Âö'WGFöãàÐ¢ Ð¢¢" Ð¢ÐÐ Ð¢G°Ð¢—4×—7F–4&6çVÐÐ¢ò Ð¢Æ'WGFöàÐ¢G—SÒ&'WGFöâ Ð¢FFÖ62Ö7F–öãÒ'FövvÆR×7VÆÂÖ&6çVÒ Ð¢FF×7VÆÂÖ–CÒ"G¶W66T‡FÖÂ€Ð¢7VÆÂæ–@Ð¢—Ò Ð¢FF×7VÆÂ×6÷W&6RÖ–CÒ"G¶W66T‡FÖÂ€Ð¢6÷W&6T–@Ð¢—Ò Ð¢àÐ¢G°Ð¢×—7F–4&6çVÕ6VÆV7FV@Ð¢ò%&VÖ÷fR×—7F–2&6çVÒ Ð¢¢6÷W&6U7FFPÐ¢òæ×—7F–4&6çVÕ7VÆÄ–G3òå°Ð¢7G&–ær€Ð¢çVÖW&–57VÆÄÆWfVÀÐ¢Ð¢ÐÐ¢ò%&WÆ6R×—7F–2&6çVÒ Ð¢¢$ÆV&â×—7F–2&6çVÒ Ð¢ÐÐ¢Âö'WGFöãàÐ¢ Ð¢¢" Ð¢ÐÐ Ð¢Æ'WGFöàÐ¢G—SÒ&'WGFöâ Ð¢FFÖ62Ö7F–öãÒ'&VÖ÷fRÖ7W7FöÒ×7VÆÂ Ð¢FF×7VÆÂÖ–CÒ"G¶W66T‡FÖÂ€Ð¢7VÆÂæ–@Ð¢—Ò Ð¢àÐ¢&VÖ÷fR7VÆÀÐ¢Âö'WGFöãàÐ¢ÂöF—càÐ¢Âö'F–6ÆSàÐ¢°Ð¢ÒÐ¢æ¦ö–â‚""“°Ð¢ÐÐ Ð¢gVæ7F–öâ&VæFW%6V7F–öãd–ææFU7VÆÇ2‚’°Ð¢&WGW&â&VæFW$–ææFU7VÆÄ6&G2€Ð¢vWE6V7F–öãd–ææFU7VÆÇ2‚’ÀÐ¢°Ð¢V×G”ÖW76vS Ð¢$æò–ææFR7V6–W2÷"&6¶w&÷VæB7VÆÇ2&R7W'&VçFÇ’&V6÷&FVBâ Ð¢ÐÐ¢“°Ð¢ÐÐ Ð¢gVæ7F–öâ&VæFW%6V7F–öãdfVGW&T6&G2€Ð¢fVGW&W2ÀÐ¢V×G”ÖW76vRÀÐ¢&VÖ÷f&ÆRÒfÇ6PÐ¢’°Ð¢6öç7BfVGW&TÆ—7BÐÐ¢'&’æ—4'&’†fVGW&W2Ð¢òfVGW&W0Ð¢¢µÓ°Ð Ð¢–b‚fVGW&TÆ—7BæÆVæwF‚’°Ð¢&WGW&â Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"×Æ6V†öÆFW"#àÐ¢G¶W66T‡FÖÂ€Ð¢V×G”ÖW76vPÐ¢—ÐÐ¢ÂöF—càÐ¢°Ð¢ÐÐ Ð¢&WGW&âfVGW&TÆ—7@Ð¢æÖ‚‡&tfVGW&RÂ–æFW‚’Óâ°Ð¢6öç7BfVGW&RÐÐ¢æ÷&ÖÆ—¦U6V7F–öãdfVGW&R€Ð¢&tfVGW&RÀÐ¢&tfVGW&Sòç6÷W&6RÇÀÐ¢&fVGW&R Ð¢“°Ð Ð¢&WGW&â Ð¢Æ'F–6ÆR6Æ73Ò&†rÖ6†&7FW"Ö6†ö–6RÖ6&B#àÐ¢Æƒ3àÐ¢G¶W66T‡FÖÂ€Ð¢fVGW&RææÖPÐ¢—ÐÐ¢Âöƒ3àÐ Ð¢ÇàÐ¢Æ#å6÷W&6S£Âö#àÐ Ð¢G¶W66T‡FÖÂ€Ð¢fVGW&Rç6÷W&6TÆ&VÂÇÀÐ¢fVGW&Rç6÷W&6PÐ¢—ÐÐ Ð¢G°Ð¢fVGW&Rç'VÆW4VF—F–öàÐ¢ò Ð¢Æ'#àÐ Ð¢Æ#äVF—F–öã£Âö#àÐ Ð¢G¶W66T‡FÖÂ€Ð¢fVGW&Rç'VÆW4VF—F–öàÐ¢—ÐÐ¢ Ð¢¢" Ð¢ÐÐ Ð¢G°Ð¢fVGW&RæÆWfVÀÐ¢ò Ð¢Æ'#àÐ Ð¢Æ#äÆWfVÃ£Âö#àÐ Ð¢G´ÖF‚æÖ‚€Ð¢ÀÐ¢ÖF‚ç&÷VæB€Ð¢6fTçVÖ&W"€Ð¢fVGW&RæÆWfVÂÀÐ¢Ð¢Ð¢Ð¢—ÐÐ¢ Ð¢¢" Ð¢ÐÐ Ð¢G°Ð¢fVGW&RçW6W0Ð¢ò Ð¢Æ'#àÐ Ð¢Æ#åW6W3£Âö#àÐ Ð¢G¶W66T‡FÖÂ€Ð¢fVGW&RçW6W0Ð¢—ÐÐ¢ Ð¢¢" Ð¢ÐÐ Ð¢G°Ð¢fVGW&Rç&V6†&vPÐ¢ò Ð¢Æ'#àÐ Ð¢Æ#å&V6†&vS£Âö#àÐ Ð¢G¶W66T‡FÖÂ€Ð¢fVGW&Rç&V6†&vPÐ¢—ÐÐ¢ Ð¢¢" Ð¢ÐÐ¢Â÷àÐ Ð¢G°Ð¢fVGW&Rç7VÖÖ'Ð¢ò Ð¢Ç6Æ73Ò'6ÖÆÂ#àÐ¢G¶W66T‡FÖÂ€Ð¢fVGW&Rç7VÖÖ'Ð¢—ÐÐ¢Â÷àÐ¢ Ð¢¢" Ð¢ÐÐ Ð¢G°Ð¢fVGW&RæFW67&—F–öàÐ¢ò Ð¢Ç Ð¢6Æ73Ò'6ÖÆÂ Ð¢FFÖfVGW&RÖgVÆÂÖFW67&—F–öãÒ'G'VR Ð¢àÐ¢G¶W66T‡FÖÂ€Ð¢fVGW&RæFW67&—F–öàÐ¢—ÐÐ¢Â÷àÐ¢ Ð¢¢" Ð¢ÐÐ Ð¢G·&VæFW%6V7F–öã$fVGW&TÖV6†æ–72†fVGW&R—ÐÐ Ð¢G°Ð¢&VÖ÷f&ÆPÐ¢ò Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"Ö6&BÖ7F–öç2#àÐ¢Æ'WGFöàÐ¢G—SÒ&'WGFöâ Ð¢FFÖ62Ö7F–öãÒ'&VÖ÷fRÖ7W7FöÒÖfVGW&R Ð¢FFÖ–æFWƒÒ"G¶–æFW‡Ò Ð¢àÐ¢&VÖ÷fRfVGW&PÐ¢Âö'WGFöãàÐ¢ÂöF—càÐ¢ Ð¢¢" Ð¢ÐÐ¢Âö'F–6ÆSàÐ¢°Ð¢ÒÐ¢æ¦ö–â‚""“°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öãe6VÆV7FVDfVG2‚’°Ð¢6öç7BfVD–G2Òæ÷&ÖÆ—¦TfVD–G2€Ð¢7&VF÷%7FFRæG&gBæfVG0Ð¢“°Ð Ð¢&WGW&âfVD–G2æÖ‚†fVD–B’Óâ°Ð¢&WGW&â€Ð¢DTdTÅEôdTE2æf–æB‚†fVB’ÓâfVBæ–BÓÓÒfVD–B’ÇÀÐ¢°Ð¢–C¢fVD–BÀÐ¢æÖS¢fVD–BÀÐ¢7VÖÖ'“¢%F†—2fVB—2æ÷B–âF†R7W'&VçBFVfVÇBfVB6FÆörâ Ð¢ÐÐ¢“°Ð¢Ò“°Ð¢ÐÐ Ð¢gVæ7F–öâFövvÆU6V7F–öãdfVB†fVD–B’°Ð¢6öç7BfVBÒDTdTÅEôdTE2æf–æB‚†VçG'’’Óâ°Ð¢&WGW&âVçG'’æ–BÓÓÒfVD–C°Ð¢Ò“°Ð Ð¢–b‚fVB’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢6öç7B6VÆV7FVD–G2Òæ÷&ÖÆ—¦TfVD–G2€Ð¢7&VF÷%7FFRæG&gBæfVG0Ð¢“°Ð¢6öç7B6VÆV7FVD'”Gfæ6VÖVçBÒvWEVæÆö6¶VDfVD6†ö–6U6Æ÷G2€Ð¢7&VF÷%7FFRæG&g@Ð¢’ç6öÖR‚‡6Æ÷B’Óâ°Ð¢&WGW&â€Ð¢6Æ÷Bç6VÆV7FVDÖöFRÓÓÒ&fVB"b`Ð¢6Æ÷Bç6VÆV7FVDfVD–BÓÓÒfVD–@Ð¢“°Ð¢Ò“°Ð Ð¢–b‡6VÆV7FVD–G2æ–æ6ÇVFW2†fVD–B’bb6VÆV7FVD'”Gfæ6VÖVçB’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢–b€Ð¢6VÆV7FVD–G2æ–æ6ÇVFW2†fVD–B’b`Ð¢vWDfVE&W&WV—6—FU&W7VÇB†fVB’æÖW@Ð¢’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢7&VF÷%7FFRæG&gBæfVG2Ò6VÆV7FVD–G2æ–æ6ÇVFW2†fVD–BÐ¢ò6VÆV7FVD–G2æf–ÇFW"‚†–B’Óâ–BÓÒfVD–BÐ¢¢²ââç6VÆV7FVD–G2ÂfVD–EÓ°Ð¢7&VF÷%7FFRæG&gBç6VÆV7FVDfVG2Ò²ââæ7&VF÷%7FFRæG&gBæfVG5Ó°Ð Ð¢Ç•6VÆV7FVDfVDÖV6†æ–72‚“°Ð¢Ç”6ö×F–&–Æ—G”Æ–6W2†7&VF÷%7FFRæG&gB“°Ð¢Ö&´G&gD6†ævVB‚“°Ð Ð¢&WGW&âG'VS°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öãdfVE–6¶W%vR€Ð¢÷F–öç2Ò·ÐÐ¢’°Ð¢6öç7B6VÆV7FVD–G2ÒæWr6WB€Ð¢æ÷&ÖÆ—¦TfVD–G2†7&VF÷%7FFRæG&gBæfVG2Ð¢“°Ð¢6öç7BGfæ6VÖVçDfVD–G2ÒæWr6WB€Ð¢vWEVæÆö6¶VDfVD6†ö–6U6Æ÷G2†7&VF÷%7FFRæG&gBÐ¢æf–ÇFW"‚‡6Æ÷B’Óâ6Æ÷Bç6VÆV7FVDÖöFRÓÓÒ&fVB"Ð¢æÖ‚‡6Æ÷B’Óâ6Æ÷Bç6VÆV7FVDfVD–BÐ¢æf–ÇFW"„&ööÆVâÐ¢“°Ð¢6öç7BvRÒ7&VFT6FÆöuvR€Ð¢DTdTÅEôdTE2ÀÐ¢°Ð¢VW'“¢÷F–öç2çVW'’ÀÐ¢f—6–&ÆTÆ–Ö—C Ð¢÷F–öç2çf—6–&ÆTÆ–Ö—BÇÀÐ¢5$TDõ%ô4DÄôuô$D4…õ4•¤RÀÐ¢–ææVD–G3¢°Ð¢ââç6VÆV7FVD–G2ÀÐ¢âââ€Ð¢'&’æ—4'&’†÷F–öç2ç–ææVD–G2Ð¢ò÷F–öç2ç–ææVD–G0Ð¢¢µÐÐ¢Ð¢ÒÀÐ¢vWD–C¢†fVB’ÓâfVBæ–BÀÐ¢vWE6V&6…FW‡C¢†fVB’Óâ°Ð¢&WGW&â°Ð¢fVBææÖRÀÐ¢fVBç7VÖÖ'’ÀÐ¢fVBæFW67&—F–öâÀÐ¢âââ„'&’æ—4'&’†fVBçFw2Ð¢òfVBçFw0Ð¢¢µÒÐ¢Òæ¦ö–â‚""“°Ð¢ÐÐ¢ÐÐ¢“°Ð Ð¢6öç7B‡FÖÂÒvRæVçG&–W2æÖ‚†fVB’Óâ°Ð¢6öç7B6VÆV7FVBÒ6VÆV7FVD–G2æ†2†fVBæ–B“°Ð¢6öç7B&W&WV—6—FRÒvWDfVE&W&WV—6—FU&W7VÇB†fVB“°Ð¢6öç7B6VÆV7FVD'”Gfæ6VÖVçBÒGfæ6VÖVçDfVD–G2æ†2†fVBæ–B“°Ð Ð¢&WGW&â Ð¢Æ'F–6ÆR6Æ73Ò&†rÖ6†&7FW"Ö6†ö–6RÖ6&BG·6VÆV7FVBò'6VÆV7FVB"¢"'Ò#àÐ¢Æƒ3âG¶W66T‡FÖÂ†fVBææÖR—ÓÂöƒ3àÐ Ð¢Ç6Æ73Ò'6ÖÆÂ#àÐ¢G¶W66T‡FÖÂ†fVBç7VÖÖ'’ÇÂ$æò7VÖÖ'’&÷f–FVBâ"—ÐÐ¢Æ'#âG¶W66T‡FÖÂ†fVBæFW67&—F–öâÇÂ""—ÐÐ¢Æ'#ãÆ#å&W&WV—6—FS£Âö#àÐ¢G¶W66T‡FÖÂ†vWDfVE&W&WV—6—FTÆ&VÂ†fVB’—ÐÐ¢G·&W&WV—6—FRç6WGF–æu&WV—&VÖVçG2æÆVæwF€Ð¢òÆ'#ãÆ#å6WGF–æs£Âö#âG¶W66T‡FÖÂ€Ð¢G·&W&WV—6—FRç6WGF–æu&WV—&VÖVçG2æ¦ö–â‚"Â"—Ò†Gf—6÷'“²æ÷BVæf÷&6VB– Ð¢—Ö Ð¢¢"'ÐÐ¢Æ'#ãÆ'#àÐ¢G·&VæFW%'VÆW6WDÖWFFF†fVBÂ&fVB"—ÐÐ¢Â÷àÐ Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"Ö6&BÖ7F–öç2#àÐ¢Æ'WGFöàÐ¢G—SÒ&'WGFöâ Ð¢FFÖ62Ö7F–öãÒ'FövvÆRÖFVfVÇBÖfVB Ð¢FFÖfVBÖ–CÒ"G¶W66T‡FÖÂ†fVBæ–B—Ò Ð¢G·6VÆV7FVD'”Gfæ6VÖVçBÇÂ‚6VÆV7FVBbb&W&WV—6—FRæÖWB’ò&F—6&ÆVB"¢"'ÐÐ¢àÐ¢G·6VÆV7FVD'”Gfæ6VÖVç@Ð¢ò$6†÷6Vâ'’Gfæ6VÖVçB Ð¢¢6VÆV7FV@Ð¢ò%&VÖ÷fRfVB Ð¢¢$FBfVB'ÐÐ¢Âö'WGFöãàÐ¢ÂöF—càÐ¢Âö'F–6ÆSàÐ¢°Ð¢Ò’æ¦ö–â‚""“°Ð Ð¢&WGW&âö&¦V7Bæg&VW¦R‡°Ð¢ââçvRÀÐ¢‡FÖÀÐ¢Ò“°Ð¢ÐÐ Ð¢gVæ7F–öâ&VæFW%6V7F–öãdfVE–6¶W"€Ð¢÷F–öç2Ò·ÐÐ¢’°Ð¢&WGW&âvWE6V7F–öãdfVE–6¶W%vR€Ð¢÷F–öç0Ð¢’æ‡FÖÃ°Ð¢ÐÐ Ð¢gVæ7F–öâf÷&ÖE6V7F–öãe&öw&W76–öäÆ&VÂ€Ð¢&öw&W76–öåG—PÐ¢’°Ð¢6öç7BÆ&VÇ2Ò°Ð¢&gVÆÂÖ67FW"#¢$gVÆÂ67FW""ÀÐ¢&†ÆbÖ67FW"#¢$†Æb67FW"…ÆF–âò&ævW"’"ÀÐ¢'F–f–6W#¢$'F–f–6W"†Æb67FW""ÀÐ¢'F†—&BÖ67FW"#¢$öæR×F†—&B67FW""ÀÐ¢'7BÖÖv–2#¢%7BÖv–2"ÀÐ¢æöæS¢$æò6Æ727VÆÆ67F–ær Ð¢Ó°Ð Ð¢6öç7B6ÆVåG—RÒ6ÆVå7G&–ær€Ð¢&öw&W76–öåG—RÀÐ¢&æöæR Ð¢“°Ð Ð¢&WGW&âÆ&VÇ5¶6ÆVåG—UÒÇÂ6ÆVåG—S°Ð¢ÐÐ Ð¢gVæ7F–öâ&VæFW%6V7F–öãd&Vv–ææW$wV–FR‚’°Ð¢6öç7B7VÖÖ'’ÒvWE7VÆÆ67F–æu7VÖÖ'’€Ð¢7&VF÷%7FFRæG&g@Ð¢“°Ð Ð¢6öç7B7VÆÆ67FW"Ò7VÖÖ'’æ6Æ76W2æf–æB€Ð¢†VçG'’’Óâ°Ð¢&WGW&â€Ð¢VçG'’ç&öw&W76–öåG—RÓÒ&æöæR"ÇÀÐ¢&ööÆVâ†VçG'’ç7VÆÆ67F–æt&–Æ—G’Ð¢“°Ð¢ÐÐ¢“°Ð Ð¢6öç7B&–Æ—G’Ò7VÆÆ67FW Ð¢òç7VÆÆ67F–æt&–Æ—G’ÇÀÐ¢7&VF÷%7FFRæG&gBæÖv–0Ð¢ç7VÆÆ67F–æt&–Æ—G“°Ð Ð¢&WGW&â Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"Ö7W'&VçBÖ6†ö–6R#àÐ¢Æ#å7VÆÆ67F–ær&–Æ—G“£Âö#àÐ¢G¶W66T‡FÖÂ€Ð¢&–Æ—GÐ¢òvWE6V7F–öã4&–Æ—G”æÖR†&–Æ—G’Ð¢¢$æöæR6VÆV7FVB Ð¢—ÒâF†—2&–Æ—G’6WG27VÆÂGF6·2æB7VÆÂ6fRD2àÐ Ð¢Æ'#àÐ Ð¢Æ#ä6çG&—3£Âö#àÐ¢6çG&—2Fòæ÷BW6R7VÆÂ6Æ÷G2âÆWfVÆVB7VÆÇ2W6R7VÆÀÐ¢6Æ÷G2v†Vâ67BâÆ#å&W&VB67FW'3Âö#â6†ö÷6Rv†–6‚7VÆÇ0Ð¢&R&VG’V6‚F’âÆ#ä¶æ÷vâ67FW'3Âö#â†fRf—†VBÆ—7Bö`Ð¢7VÆÇ2F†W’¶æ÷ràÐ Ð¢Æ'#àÐ Ð¢Æ#å7VÆÂçVÖ&W'3£Âö#àÐ¢7VÆÂ6fRD2Ò‚²&öf–6–Væ7’&öçW2²7VÆÆ67F–ær&–Æ—GÐ¢ÖöF–f–W"â7VÆÂGF6²&öçW2Ò&öf–6–Væ7’&öçW2²7VÆÆ67F–æpÐ¢&–Æ—G’ÖöF–f–W"àÐ Ð¢Æ'#àÐ Ð¢Æ#å7VÆÂ6Æ÷G3£Âö#àÐ¢6Æ÷G2÷vW"ÆWfVÆVB7VÆÇ2âv&Æö6²7BÖv–2W6W26W&FPÐ¢7B6Æ÷G2æB6Æ÷BÆWfVÇ2âÆF–âæB&ævW"&Vv–âæ÷&ÖÀÐ¢†ÆbÖ67FW"6Æ÷G2BÆWfVÂ#²'F–f–6W"&Vv–ç2BÆWfVÂæ@Ð¢W6W2—G2÷vâ&÷VæFVB×W†ÆbÖ67FW"&öw&W76–öâàÐ Ð¢Æ'#àÐ Ð¢Æ#ä7W'&VçB&öw&W76–öã£Âö#àÐ¢G¶W66T‡FÖÂ€Ð¢f÷&ÖE6V7F–öãe&öw&W76–öäÆ&VÂ€Ð¢7VÆÆ67FW#òç&öw&W76–öåG—RÇÀÐ¢7&VF÷%7FFRæG&gBæÖv–0Ð¢ç7VÆÆ67F–æu&öw&W76–öàÐ¢Ð¢—ÒàÐ¢ÂöF—càÐ¢°Ð¢ÐÐ Ð¢6öç7B7VÆÇ57FWÒ7&VFU7VÆÇ57FW‡°Ð¢6†&VE6W'f–6W3¢6†&VE7FW6W'f–6W2ÀÐ¢$”Ä•E•ôDTd”ä•D”ôå2ÀÐ¢2ÀÐ¢FE6V7F–öãd7W7FöÔfVGW&RÀÐ¢FE6V7F–öãd7W7FöÕ7VÆÂÀÐ¢6Æ7VÆFU6V7F–öãe7VÆÆ67F–æufÇVW2ÀÐ¢f÷&ÖE6V7F–öãe&öw&W76–öäÆ&VÂÀÐ¢vWE6V7F–öã4&–Æ—G”æÖRÀÐ¢vWE6V7F–öãd7W7FöÔfVGW&W2ÀÐ¢vWE6V7F–öãdfVE–6¶W%vRÀÐ¢vWE6V7F–öãe6VÆV7FVDfVG2ÀÐ¢vWD6æöæ–6Å7VÆÅ6÷W&6W2ÀÐ¢vWEW$6Æ757VÆÅ6VÆV7F–öå7VÖÖ'’ÀÐ¢vWE6V7F–öãe7VÆÄ'”–BÀÐ¢vWE6VÆV7FVD6Æ75FV×ÆFRÀÐ¢vWE7VÆÅ6VÆV7F–öäÆ–Ö—G2ÀÐ¢vWE7VÆÆ67F–æt6Æ74÷F–öç2ÀÐ¢vWE7VÆÆ67F–æu7VÖÖ'’ÀÐ¢—46†&7FW$æöå7VÆÆ67FW"ÀÐ¢Ö–w&FU6V7F–öãdÆVv7•7VÆÅ6VÆV7F–öç2ÀÐ¢&Vg&W6…6V7F–öãe7VÆÅ–6¶W"ÀÐ¢&VÖ÷fU6V7F–öãd7W7FöÔfVGW&RÀÐ¢&VÖ÷fU6V7F–öãd7W7FöÕ7VÆÂÀÐ¢&VæFW%6V7F–öãd&Vv–ææW$wV–FRÀÐ¢&VæFW%6V7F–öãd7W7FöÕ7VÆÇ2ÀÐ¢&VæFW%6V7F–öãdFVfVÇE7VÆÅf–WvW"ÀÐ¢&VæFW%6V7F–öãdfVGW&T6&G2ÀÐ¢&VæFW%6V7F–öãd–ææFU7VÆÇ2ÀÐ¢&VæFW%6V7F–öãdÖv–6Å6V7&WG2ÀÐ¢&VæFW%6V7F–öãe7VÆÅ6Æ÷G2ÀÐ¢&VæFW%6V7F–öãu7VÆÆ67F–æu7VÖÖ'’ÀÐ¢7–æ56V7F–öãd6Æ756÷W&6TÖWFFFÀÐ¢FövvÆU6V7F–öãdfVBÀÐ¢FövvÆU6V7F–öãd×—7F–4&6çVÒÀÐ¢FövvÆU6V7F–öãe7VÆÄ¶æ÷vâÀÐ¢FövvÆU6V7F–öãe7VÆÅ&W&V@Ð¢Ò“°Ð Ð¢6öç7B6V7F–öãe6VÆV7FVE7VÆÅ6÷W&6T–G2ÐÐ¢7VÆÇ57FWç6VÆV7FVE7VÆÅ6÷W&6T–G3°Ð¢6öç7B6V7F–öãe7VÆÅ–6¶W%7FFRÐÐ¢7VÆÇ57FWç7VÆÅ–6¶W%7FFS°Ð Ð¢6öç7B°Ð¢&VæFW%7VÆÇ57FWÀÐ¢f–æE6V7F–öãd7F–öäVÆVÖVçBÀÐ¢†æFÆU6V7F–öãd6Æ7VÆFU7VÆÆ67F–ærÀÐ¢†æFÆU6V7F–öãdFE7VÆÂÀÐ¢†æFÆU6V7F–öãe7VÆÄ7F–öâÀÐ¢†æFÆU6V7F–öãdFVfVÇE7VÆÅ6V&6‚ÀÐ¢†æFÆU6V7F–öãe7VÆÅ–6¶W$7F–öâÀÐ¢†æFÆU6V7F–öãe7VÆÅ6÷W&6T6†ævRÀÐ¢†æFÆU6V7F–öãdFDfVGW&RÀÐ¢†æFÆU6V7F–öãeFövvÆTfVBÀÐ¢†æFÆU6V7F–öãe&VÖ÷fTfVGW&PÐ¢ÒÒ7VÆÇ57FWæ6ö×F–&–Æ—G“°Ð Ð¢&Vv—7FW$6†&7FW%7FW&VæFW&W"€Ð¢'7VÆÇ2"ÀÐ¢7VÆÇ57FWç&VæFW%7FW Ð¢“°Ð Ð¢7VÆÇ57FWæ7F–öç2æf÷$V6‚‚†7F–öâ’Óâ°Ð¢&Vv—7FW$6†&7FW$7&VF÷$7F–öâ€Ð¢7F–öâÀÐ¢†6öçFW‡B’Óâ°Ð¢&WGW&â7VÆÇ57FWæ†æFÆU7FW6Æ–6²€Ð¢6öçFW‡@Ð¢“°Ð¢ÐÐ¢“°Ð¢Ò“°Ð Ð¢&Vv—7FW$6†&7FW$7&VF÷$–çWD†æFÆW"€Ð¢7VÆÇ57FWæ†æFÆU7FW–çW@Ð¢“°Ð Ð¢&Vv—7FW$6†&7FW$7&VF÷$6†ævT†æFÆW"€Ð¢7VÆÇ57FWæ†æFÆU7FW6†ævPÐ¢“°Ð Ð¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÐÐ¢òò4„$5DU"5$TDõ"4T5D”ôâr(	B$Ud”UròdÄ”DD”ôàÐ¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÐÐ Ð¢gVæ7F–öâf÷&ÖE6V7F–öãtÖöF–f–W"‡fÇVR’°Ð¢6öç7BçVÖ&W"ÐÐ¢6fTçVÖ&W"€Ð¢fÇVRÀÐ¢ Ð¢“°Ð Ð¢&WGW&âçVÖ&W"ãÒ Ð¢ò²G¶çVÖ&W'Ö Ð¢¢7G&–ær†çVÖ&W"“°Ð¢ÐÐ Ð¢6öç7BvWE&Wf–WtFöÖ–å7FWv&æ–æw2ÐÐ¢7&VFU7FWv&æ–æt6öÆÆV7F÷"‡°Ð¢&–Æ—F–W3¢&–Æ—F–W57FWævWE7FWv&æ–æw2ÀÐ¢&6¶w&÷VæC¢&6¶w&÷VæE7FWævWE7FWv&æ–æw2ÀÐ¢6¶–ÆÇ3¢6¶–ÆÇ57FWævWE7FWv&æ–æw2ÀÐ¢7V6–W3¢7V6–W57FWævWE7FWv&æ–æw0Ð¢Ò“°Ð Ð¢6öç7B&Wf–Wu6W'f–6W2ÐÐ¢7&VFT6†&7FW%&Wf–Wu6W'f–6W2‡°Ð¢$”Ä•E•ôDTd”ä•D”ôå2ÀÐ¢%T”ÄDU%õ5DU2ÀÐ¢DTdTÅEôdTE2ÀÐ¢DTdTÅEõ5TÄÅ2ÀÐ¢4´”ÄÅôDTd”ä•D”ôå2ÀÐ¢Ç”6ö×F–&–Æ—G”Æ–6W2ÀÐ¢&Vv–ææW$æ÷FRÀÐ¢6Æ7VÆFT&–Æ—G”ÖöF–f–W"ÀÐ¢6Æ7VÆFT&Ö÷$6Æ74÷F–öç2ÀÐ¢6Æ7VÆFT6†&7FW$6''––æt66—G’ÀÐ¢6Æ7VÆFT6†&7FW$†—DF–6RÀÐ¢6Æ7VÆFT6†&7FW$‡ÀÐ¢6Æ7VÆFT6†&7FW$–æ—F–F—fRÀÐ¢6Æ7VÆFT6†&7FW%76—fU66÷&W2ÀÐ¢6Æ7VÆFT6†&7FW%6f–æuF‡&÷w2ÀÐ¢6Æ7VÆFT6†&7FW%6¶–ÆÄÖöF–f–W"ÀÐ¢6Æ7VÆFTWV—VEvVöäGF6·2ÀÐ¢6Æ7VÆFT–çfVçF÷'•vV–v‡E7VÖÖ'’ÀÐ¢6Æ×ÆWfVÂÀÐ¢6ÆVä'&’ÀÐ¢6ÆVå7G&–ærÀÐ¢6÷VçEfÆ–D6Æ74VçG'•6¶–ÆÄ6†ö–6W2ÀÐ¢Vç7W&TWV—ÖVçD7W'&Væ7•6÷W&6W2ÀÐ¢W66T‡FÖÂÀÐ¢f÷&ÖD×VÇF–6Æ75&W&WV—6—FTf–ÇW&RÀÐ¢f÷&ÖE6V7F–öã$6Æ746†ö–6UfÇVW2ÀÐ¢f÷&ÖE6V7F–öã$Æ—7BÀÐ¢f÷&ÖE6V7F–öãD7W'&Væ7•7VÖÖ'’ÀÐ¢f÷&ÖE6V7F–öãt6Æ74VçG'”Æ&VÂÀÐ¢f÷&ÖE6V7F–öãt6Æ74ÆWfVÅ7VÖÖ'’ÀÐ¢f÷&ÖE6V7F–öãtÖöF–f–W"ÀÐ¢vWD6†&7FW$GGVæVÖVçDÆ–Ö—BÀÐ¢vWD6†&7FW$'W7”Æ&VÂÀÐ¢vWD6†&7FW%&öf–6–Væ7”&öçW2ÀÐ¢vWD6Æ74VçG'”ÆWfVÂÀÐ¢vWD6Æ74VçG'•6¶–ÆÄ6†ö–6T6öæf–rÀÐ¢vWD6Æ75&öw&W76–öäVçG&–W2ÀÐ¢vWD6öçF–æW%7VÖÖ&–W2ÀÐ¢vWD7&VF÷%7FFS¢‚’Óâ7&VF÷%7FFRÀÐ¢vWDFöÖ–å7FWv&æ–æw3 Ð¢vWE&Wf–WtFöÖ–å7FWv&æ–æw2ÀÐ¢vWE&Wf–Wu&Wf—6–öã¢‚’Óâ°Ð¢&WGW&âG¶7&VF÷%7FFRç&Wf–Wu&Wf—6–öçÓ¢G¶vWDFW&—fVDö&¦V7D–FVçF—G’€Ð¢7&VF÷%7FFRæG&g@Ð¢—Ö°Ð¢ÒÀÐ¢vWDfVE&W&WV—6—FU&W7VÇBÀÐ¢vWDfVE7VÆÆ67F–æufÆ–FF–öåv&æ–æw2ÀÐ¢vWD×VÇF–6Æ75VæF–æu6¶–ÆÄ6†ö–6Uv&æ–æw2ÀÐ¢vWD×VÇF–6Æ75VæF–æuFööÄ6†ö–6Uv&æ–æw2ÀÐ¢vWD×VÇF–6Æ75&W&WV—6—FU&W7VÇG2ÀÐ¢vWD×VÇF–6Æ757VÖÖ'”VçG&–W2ÀÐ¢vWEVæF–æt6Æ74fVGW&T6†ö–6Uv&æ–æw2ÀÐ¢vWE&–Ö'”6Æ74VçG'’ÀÐ¢vWE6fT&6¶w&÷VæDæÖRÀÐ¢vWE6fT6†&7FW$æÖRÀÐ¢vWE6fT6Æ74æÖRÀÐ¢vWE6fU7V6–W4æÖRÀÐ¢vWE6fU7V&6Æ74æÖRÀÐ¢vWE6V7F–öã$6Æ74fVGW&W5F‡&÷Vv„ÆWfVÂÀÐ¢vWE6V7F–öã$fVGW&T6†ö–6T¶W’ÀÐ¢vWE6V7F–öã$fVGW&U7F÷&VD6†ö–6W2ÀÐ¢vWE6V7F–öã4&–Æ—G”æÖRÀÐ¢vWE6V7F–öãD&6¶w&÷VæE6÷W&6UfÇVW2ÀÐ¢vWE6V7F–öãTGGVæVD—FVÔ6÷VçBÀÐ¢vWE6V7F–öãT–çfVçF÷'’ÀÐ¢vWE6V7F–öãd6Æ756÷W&6U7F÷&RÀÐ¢vWE6V7F–öãd–ææFU7VÆÇ2ÀÐ¢vWE6V7F–öãe6VÆV7FVDfVG2ÀÐ¢vWE6V7F–öãe6÷W&6T¶W’ÀÐ¢vWE6V7F–öãt6Æ75&öw&W76–öäVçG&–W2ÀÐ¢vWE6V7F–öãu7VÆÄ6†ö–6UfÆ–FF–öâÀÐ¢vWE6VÆV7FVD6Æ75FV×ÆFRÀÐ¢vWE6VÆV7FVDFVfVÇDfVD–ç7Fæ6W2ÀÐ¢vWE7VÆÆ67F–æt6Æ74÷F–öç2ÀÐ¢vWE7VÆÆ67F–ætVçG'”f÷%7VÆÂÀÐ¢vWE7VÆÅ6Æ÷D67F–æt÷F–öç2ÀÐ¢vWE7VÆÅ6÷W&6T–BÀÐ¢vWE7VÆÅ6÷W&6Uv&æ–ærÀÐ¢vWEVæÆö6¶VDfVD6†ö–6U6Æ÷G2ÀÐ¢vWEfÆ–FF–öåv&æ–æw2ÀÐ¢†47W'&Væ7•fÇVRÀÐ¢—46†&7FW$7&VF÷$'W7’ÀÐ¢—4×VÇF–6Æ74G&gBÀÐ¢—5Æ–äö&¦V7BÀÐ¢—56V7F–öãt6Æ746ö×ÆWFRÀÐ¢—57FW6ö×ÆWFRÀÐ¢Ö–w&FU6V7F–öãdÆVv7•7VÆÅ6VÆV7F–öç2ÀÐ¢÷Vä6†&7FW%6†VWC¢†æFÆU6V7F–öãt÷Vä6†&7FW%6†VWBÀÐ¢W'6—7DG&gEFõ6W76–öâÀÐ¢&VæFW$6Æ74fVGW&TÖWFFFÀÐ¢&VæFW$–ææFU7VÆÄ6&G2ÀÐ¢&VæFW$×VÇF–6Æ74Gfæ6VÖVçD6†ö–6U7VÖÖ'’ÀÐ¢&VæFW$×VÇF–6Æ746Æ757VÖÖ'’ÀÐ¢&VæFW$×VÇF–6Æ74ÆWfVÄ'&V¶F÷vâÀÐ¢&VæFW%6V7F–öãu7VÆÆ67F–æu7VÖÖ'’ÀÐ¢&VæFW%6VÆV7FVD6Æ74ÖV6†æ–757VÖÖ'’ÀÐ¢&VæFW%6VÆV7FVDfVE7VÖÖ'’ÀÐ¢6fTF—7Æ•7G&–ærÀÐ¢6fTçVÖ&W"ÀÐ¢6WE7FGW2ÀÐ¢7–æ56V7F–öãd6Æ756÷W&6TÖWFFFÀÐ¢Væ—VT6ÆVä'&’ÀÐ¢fÆ–FFT6öçF–æW%7FFPÐ¢Ò“°Ð Ð¢6öç7B&Wf–Wu7FWÒ7&VFU&Wf–Wu7FW‡°Ð¢6†&VE6W'f–6W3¢6†&VE7FW6W'f–6W2ÀÐ¢&Wf–Wu6W'f–6W0Ð¢Ò“°Ð Ð¢6öç7B°Ð¢vWE6V7F–öãt&–Æ—G”æÖRÀÐ¢vWE6V7F–öãu&öf–6–Væ7”&öçW2ÀÐ¢vWE6V7F–öãu6¶–ÆÄVçG'’ÀÐ¢vWE6V7F–öãu6¶–ÆÄÖöF–f–W"ÀÐ¢vWE6V7F–öãu76—fUW&6WF–öâÀÐ¢vWE6V7F–öãt–æ—F–F—fRÀÐ¢vWE6V7F–öãt6''––æt66—G’ÀÐ¢vWE6V7F–öãt–çfVçF÷'•vV–v‡BÀÐ¢vWE6V7F–öãu7VÆÄ6÷VçBÀÐ¢vWE6V7F–öãtfVGW&T6÷VçBÀÐ¢vWE6V7F–öãuv&æ–æw2ÀÐ¢—56V7F–öãt÷F–öæÄf–æÆ—¦F–öåv&æ–ærÀÐ¢vWE6V7F–öãtf–æÆ—¦F–öåfÆ–FF–öâÀÐ¢vWE6V7F–öãt6ö×ÆWFVE7FW–G2ÀÐ¢7–æ56V7F–öãt6ö×ÆWFVE7FW2ÀÐ¢&VæFW%6V7F–öãt&–Æ—F–W2ÀÐ¢&VæFW%6V7F–öãu6¶–ÆÇ2ÀÐ¢&VæFW%6V7F–öãtÆ—7BÀÐ¢&VæFW%6V7F–öãt&6¶w&÷VæD6†ö–6W2ÀÐ¢&VæFW%6V7F–öãt&6¶w&÷VæDw&çG2ÀÐ¢&VæFW%6V7F–öãu6f–æuF‡&÷w2ÀÐ¢&VæFW%6V7F–öãu76—fU66÷&W2ÀÐ¢&VæFW%6V7F–öãt†—DF–6RÀÐ¢&VæFW%6V7F–öãuvVöäGF6·2ÀÐ¢&VæFW%6V7F–öãt6öçF–æW%7VÖÖ'’ÀÐ¢&VæFW%6V7F–öãt6Æ757VÆÇ2ÀÐ¢&VæFW%6V7F–öãt–ææFU7VÆÇ2ÀÐ¢&VæFW%6V7F–öãt–çfVçF÷'’ÀÐ¢&VæFW%6V7F–öãtfVGW&U&Wf–Wt—FVÒÀÐ¢&VæFW%6V7F–öãtfVGW&U7VÖÖ'’ÀÐ¢&VæFW%6V7F–öãuv&æ–æw2ÀÐ¢vWE6V7F–öãtÖ–w&F–öåv&æ–æw2ÀÐ¢&VæFW%6V7F–öãtÖ–w&F–öåv&æ–æw2ÀÐ¢&VæFW%6V7F–öãt6Æ74æDfVE7VÖÖ'’ÀÐ¢&VæFW%&Wf–Wu7FWÀÐ¢—56V7F–öãu&Wf–Wt6ö×ÆWFRÀÐ¢†æFÆU6V7F–öãu&Vg&W6…&Wf–WpÐ¢ÒÒ&Wf–Wu7FWæ6ö×F–&–Æ—G“°Ð¢gVæ7F–öâvWDfVE7VÆÆ67F–æufÆ–FF–öåv&æ–æw2€Ð¢6†&7FW Ð¢’°Ð¢6öç7B&V6÷&G2Ò'&’æ—4'&’€Ð¢6†&7FW#òæfVDÖV6†æ–70Ð¢òç7VÆÆ67F–æpÐ¢Ð¢ò6†&7FW"æfVDÖV6†æ–70Ð¢ç7VÆÆ67F–æpÐ¢¢µÓ°Ð¢6öç7BfVE6÷W&6W2ÐÐ¢6†&7FW#òæÖv–3òæfVE6÷W&6W2b`Ð¢G—Vöb6†&7FW"æÖv–0Ð¢æfVE6÷W&6W2ÓÓÒ&ö&¦V7B"b`Ð¢'&’æ—4'&’€Ð¢6†&7FW"æÖv–2æfVE6÷W&6W0Ð¢Ð¢ò6†&7FW"æÖv–2æfVE6÷W&6W0Ð¢¢·Ó°Ð¢6öç7Bv&æ–æw2ÒµÓ°Ð Ð¢&V6÷&G2æf÷$V6‚‚‡&V6÷&B’Óâ°Ð¢6öç7B7VÆÄÆ&VÂÒ6ÆVå7G&–ær€Ð¢&V6÷&Còç7VÆÄæÖRÇÀÐ¢&V6÷&Còç7VÆÄ–BÀÐ¢$fVB7VÆÂ Ð¢“°Ð¢6öç7B6÷W&6T–BÒ6ÆVå7G&–ær€Ð¢&V6÷&Còç6÷W&6T–@Ð¢“°Ð Ð¢–b€Ð¢6ÆVå7G&–ær€Ð¢&V6÷&Còç7VÆÆ67F–æt&–Æ—GÐ¢Ð¢’°Ð¢v&æ–æw2çW6‚€Ð¢G·7VÆÄÆ&VÇÒg&öÒG·&V6÷&CòæfVDæÖRÇÂ&fVB'Ò†2æò67F–ær&–Æ—G’æ Ð¢“°Ð¢ÐÐ Ð¢–b€Ð¢6÷W&6T–BÇÀÐ¢6ÆVå7G&–ær‡&V6÷&CòæfVD–B’ÇÀÐ¢fVE6÷W&6W5·6÷W&6T–EÐÐ¢’°Ð¢v&æ–æw2çW6‚€Ð¢G·7VÆÄÆ&VÇÒ†2æòfÆ–BfVB7VÆÂ6÷W&6Ræ Ð¢“°Ð¢ÐÐ¢Ò“°Ð Ð¢ö&¦V7BæVçG&–W2†fVE6÷W&6W2Ð¢æf÷$V6‚‚…·6÷W&6T–BÂ6÷W&6UÒ’Óâ°Ð¢Væ—VT6ÆVä'&’€Ð¢6÷W&6Sòç7VÆÄ–G0Ð¢’æf÷$V6‚‚‡7VÆÄ–B’Óâ°Ð¢6öç7B†5&V6÷&BÒ&V6÷&G2ç6öÖR€Ð¢‡&V6÷&B’Óâ°Ð¢&WGW&â€Ð¢6ÆVå7G&–ær€Ð¢&V6÷&Còç6÷W&6T–@Ð¢’ÓÓÒ6÷W&6T–Bb`Ð¢6ÆVå7G&–ær€Ð¢&V6÷&Còç7VÆÄ–@Ð¢’ÓÓÒ7VÆÄ–@Ð¢“°Ð¢ÐÐ¢“°Ð Ð¢–b‚†5&V6÷&B’°Ð¢v&æ–æw2çW6‚€Ð¢G¶6ÆVå7G&–ær‡6÷W&6SòæfVDæÖRÂ6÷W&6SòæfVD–BÇÂ$fVB"—Ò7VÆÂG·7VÆÄ–GÒ—2Ö—76–ær—G2G&6¶VB67F–ær6÷W&6Ræ Ð¢“°Ð¢ÐÐ¢Ò“°Ð¢Ò“°Ð Ð¢&WGW&âVæ—VT6ÆVä'&’‡v&æ–æw2“°Ð¢ÐÐ Ð¢gVæ7F–öâ&VæFW%6V7F–öãu7VÆÆ67F–æu7VÖÖ'’‚’°Ð¢6öç7B7VÖÖ'’ÐÐ¢vWE7VÆÆ67F–æu7VÖÖ'’€Ð¢7&VF÷%7FFRæG&g@Ð¢“°Ð Ð¢–b‚7VÖÖ'’æ6Æ76W2æÆVæwF‚’°Ð¢&WGW&â Ð¢ÆF—b6Æ73Ò&†rÖ6†&7FW"×Æ6V†öÆFW"#àÐ¢æò6Æ727VÆÆ67F–ær&öw&W76–öâ—2&V6÷&FVBàÐ¢ÂöF—càÐ¢°Ð¢ÐÐ Ð¢6öç7B6öÖ&–æVE6Æ÷EFW‡BÐÐ¢ö&¦V7BæVçG&–W2€Ð¢7VÖÖ'’æ×VÇF–6Æ73òç7VÆÅ6Æ÷G2ÇÂ·ÐÐ¢Ð¢æÖ‚…¶ÆWfVÂÂ6Æ÷G5Ò’Óâ°Ð¢&WGW&âÂG¶ÆWfVÇÓ¢G·6Æ÷G7Ö°Ð¢ÒÐ¢æ¦ö–â‚"Â"“°Ð Ð¢6öç7B7EFW‡BÐÐ¢'&’æ—4'&’€Ð¢7VÖÖ'’æ×VÇF–6Æ73òç7DÖv–0Ð¢Ð¢ò7VÖÖ'’æ×VÇF–6Æ72ç7DÖv–0Ð¢æf–ÇFW"‚‡7B’Óâ°Ð¢&WGW&â6fTçVÖ&W"€Ð¢7Bç6Æ÷G2ÀÐ¢ Ð¢’â°Ð¢ÒÐ¢æÖ‚‡7B’Óâ°Ð¢&WGW&âG·6fTçVÖ&W"€Ð¢7Bç6Æ÷G2ÀÐ¢ Ð¢—Ò6Æ÷B‡2’ÂÆWfVÂG·6fTçVÖ&W"€Ð¢7Bç6Æ÷DÆWfVÂÀÐ¢ Ð¢—Ö°Ð¢ÒÐ¢æ¦ö–â‚#²"Ð¢¢"#°Ð Ð¢6öç7B6öÖ&–æVD6&BÒ Ð¢Æ'F–6ÆR6Æ73Ò&†rÖ6†&7FW"Ö6†ö–6RÖ6&B#àÐ¢Æƒ3ä6öÖ&–æVB7VÆÂ6Æ÷G3Âöƒ3àÐ Ð¢ÇàÐ¢G·7VÖÖ'’æ67F–æt&Æö6¶V@Ð¢òÆ#ä67F–ær7FGW3£Âö#â&Æö6¶VB‚G¶W66T‡FÖÂ‡7VÖÖ'’æ67F–æt&Æö6µ&V6öç2æ¦ö–â‚"Â"’ÇÂ&6Æ72ÖfVGW&R&W7G&–7F–öâ"—Ò“Æ'#æ Ð¢¢"'ÐÐ¢Æ#ä67FW"ÆWfVÃ£Âö#àÐ¢G·6fTçVÖ&W"€Ð¢7VÖÖ'’æ×VÇF–6Æ73òæ67FW$ÆWfVÂÀÐ¢ Ð¢—ÐÐ Ð¢Æ'#àÐ Ð¢Æ#äæ÷&ÖÂ6Æ÷G3£Âö#àÐ¢G¶W66T‡FÖÂ€Ð¢6öÖ&–æVE6Æ÷EFW‡BÇÀÐ¢$æöæR Ð¢—ÐÐ Ð¢Æ'#àÐ Ð¢Æ#å7BÖv–3£Âö#àÐ¢G¶W66T‡FÖÂ€Ð¢7EFW‡BÇÀÐ¢$æöæR Ð¢—ÐÐ¢Â÷àÐ¢Âö'F–6ÆSàÐ¢°Ð Ð¢6öç7Bfö7W4'•6÷W&6T–BÐÐ¢æWrÖ€Ð¢vWE7VÆÆ67F–ætfö7W57VÖÖ'’€Ð¢7&VF÷%7FFRæG&g@Ð¢’æÖ‚†fö7W57VÖÖ'’’Óâ°Ð¢&WGW&â°Ð¢fö7W57VÖÖ'’æ6Æ74VçG'”–BÀÐ¢fö7W57VÖÖ'’æfö7W6W0Ð¢Ó°Ð¢ÒÐ¢“°Ð Ð¢6öç7B6Æ746&G2ÐÐ¢7VÖÖ'’æ6Æ76W2æÖ‚†VçG'’’Óâ°Ð¢6öç7B6÷W&6RÐÐ¢vWE6V7F–öãe6÷W&6U7FFR†VçG'’“°Ð¢6öç7Bfö7W6W2ÐÐ¢fö7W4'•6÷W&6T–BævWB€Ð¢vWE6V7F–öãe6÷W&6T¶W’†VçG'’Ð¢’ÇÂµÓ°Ð Ð¢6öç7B&6çVÔ6÷VçBÒö&¦V7BçfÇVW2€Ð¢6÷W&6Sòæ×—7F–4&6çVÕ7VÆÄ–G2ÇÂ·ÐÐ¢’æf–ÇFW"„&ööÆVâ’æÆVæwFƒ°Ð¢6öç7B6V7&WD–G2Ò6ÆVä'&’‡6÷W&6SòæÖv–6Å6V7&WE7VÆÄ–G2“°Ð¢6öç7BÖv–6Å6V7&WG46÷VçBÒ6V7&WD–G2æÆVæwFƒ°Ð¢6öç7B÷&F–æ'”¶æ÷vä6÷VçBÒ6ÆVä'&’‡6÷W&6Sòæ¶æ÷vå7VÆÄ–G2Ð¢æf–ÇFW"‚‡7VÆÄ–B’Óâ6V7&WD–G2æ–æ6ÇVFW2‡7VÆÄ–B’’æÆVæwFƒ°Ð Ð¢6öç7B6Æ÷EFW‡BÐÐ¢ö&¦V7BæVçG&–W2€Ð¢VçG'’ç7VÆÅ6Æ÷G2ÇÂ·ÐÐ¢Ð¢æÖ‚…¶ÆWfVÂÂ6Æ÷G5Ò’Óâ°Ð¢&WGW&âÂG¶ÆWfVÇÓ¢G·6Æ÷G7Ö°Ð¢ÒÐ¢æ¦ö–â‚"Â"“°Ð Ð¢&WGW&â Ð¢Æ'F–6ÆR6Æ73Ò&†rÖ6†&7FW"Ö6†ö–6RÖ6&B#àÐ¢Æƒ3àÐ¢G¶W66T‡FÖÂ€Ð¢VçG'’æ6Æ74æÖRÇÀÐ¢%7VÆÆ67FW" Ð¢—ÒG°Ð¢VçG'’ç7V&6Æ74æÖPÐ¢ò(	BG¶W66T‡FÖÂ€Ð¢VçG'’ç7V&6Æ74æÖPÐ¢—Ö Ð¢¢" Ð¢ÐÐ¢Âöƒ3àÐ Ð¢ÇàÐ¢Æ#å&öw&W76–öã£Âö#àÐ¢G¶W66T‡FÖÂ€Ð¢VçG'’ç&öw&W76–öåG—RÇÀÐ¢&æöæR Ð¢—ÐÐ Ð¢Æ'#àÐ Ð¢Æ#ä&–Æ—G“£Âö#àÐ¢G¶W66T‡FÖÂ€Ð¢VçG'’ç7VÆÆ67F–æt&–Æ—G’ÇÀÐ¢$æöæR Ð¢—ÐÐ Ð¢Æ'#àÐ¢Æ#äfö7W3£Âö#àÐ¢G¶W66T‡FÖÂ€Ð¢fö7W6W2æÆVæwF€Ð¢òfö7W6W0Ð¢æÖ‚†fö7W2’Óâ°Ð¢&WGW&âfö7W2ææÖS°Ð¢ÒÐ¢æ¦ö–â‚"Â"Ð¢¢$æöæR76–væVB Ð¢—ÐÐ Ð¢Æ'#àÐ¢Æ#å6VÆV7F–öç3£Âö#àÐ¢G·6÷W&6Sòæ6çG&—–G3òæÆVæwF‚ÇÂÒ6çG&—‡2’ÀÐ¢G¶÷&F–æ'”¶æ÷vä6÷VçGÒ¶æ÷vâÀÐ¢G·6÷W&6Sòç7VÆÆ&ööµ7VÆÄ–G3òæÆVæwF‚ÇÂÒ–â7VÆÆ&öö²ÀÐ¢G·6÷W&6Sòç&W&VE7VÆÄ–G3òæÆVæwF‚ÇÂÒ&W&V@Ð Ð¢G¶Öv–6Å6V7&WG46÷VçBòÂG¶Öv–6Å6V7&WG46÷VçGÒÖv–6Â6V7&WG6¢"'ÐÐ Ð¢G°Ð¢6÷W&6SòæÇv—5&W&VE7VÆÄ–G3òæÆVæwF€Ð¢òÂG·6÷W&6RæÇv—5&W&VE7VÆÄ–G2æÆVæwF‡ÒÇv—2&W&VF Ð¢¢" Ð¢ÐÐ Ð¢G°Ð¢&6çVÔ6÷Vç@Ð¢òÂG¶&6çVÔ6÷VçGÒ×—7F–2&6çVÖ Ð¢¢" Ð¢ÐÐ Ð¢G°Ð¢VçG'’ç7VÆÅ6fTF2ÓÓÒçVÆÀÐ¢ò" Ð¢¢ Ð¢Æ'#àÐ¢Æ#äD3£Âö#àÐ¢G¶VçG'’ç7VÆÅ6fTF7ÐÐ¢ Ð¢ÐÐ Ð¢G°Ð¢VçG'’ç7VÆÄGF6´&öçW2ÓÓÒçVÆÀÐ¢ò" Ð¢¢ Ð¢Æ'#àÐ¢Æ#äGF6³£Âö#àÐ¢G¶f÷&ÖE6V7F–öãtÖöF–f–W"€Ð¢VçG'’ç7VÆÄGF6´&öçW0Ð¢—ÐÐ¢ Ð¢ÐÐ Ð¢G°Ð¢VçG'’ç&W&VDÆ–Ö—BÓÓÒçVÆÀÐ¢ò" Ð¢¢ Ð¢Æ'#àÐ¢Æ#å&W&VBÆ–Ö—C£Âö#àÐ¢G¶VçG'’ç&W&VDÆ–Ö—GÐÐ¢ Ð¢ÐÐ Ð¢G°Ð¢VçG'’æ6çG&—4¶æ÷vàÐ¢ò Ð¢Æ'#àÐ¢Æ#ä6çG&—2¶æ÷vã£Âö#àÐ¢G¶VçG'’æ6çG&—4¶æ÷vçÐÐ¢ Ð¢¢" Ð¢ÐÐ Ð¢G°Ð¢VçG'’ç7VÆÇ4¶æ÷vàÐ¢ò Ð¢Æ'#àÐ¢Æ#ä¶æ÷vâÆ–Ö—C£Âö#àÐ¢G¶VçG'’ç7VÆÇ4¶æ÷vçÐÐ¢ Ð¢¢" Ð¢ÐÐ Ð¢G°Ð¢6Æ÷EFW‡@Ð¢ò Ð¢Æ'#àÐ¢Æ#å6Æ÷G3£Âö#àÐ¢G¶W66T‡FÖÂ‡6Æ÷EFW‡B—ÐÐ¢ Ð¢¢" Ð¢ÐÐ Ð¢G°Ð¢VçG'’ç7DÖv–3òç6Æ÷G0Ð¢ò Ð¢Æ'#àÐ¢Æ#å7C£Âö#àÐ¢G¶VçG'’ç7DÖv–2ç6Æ÷G7ÐÐ¢6Æ÷B‡2’ÂÆWfVÀÐ¢G¶VçG'’ç7DÖv–2ç6Æ÷DÆWfVÇÐÐ¢ Ð¢¢" Ð¢ÐÐ¢Â÷àÐ¢Âö'F–6ÆSàÐ¢°Ð¢Ò“°Ð Ð¢&WGW&â°Ð¢6öÖ&–æVD6&BÀÐ¢ââæ6Æ746&G0Ð¢Òæ¦ö–â‚""“°Ð¢ÐÐ Ð¢gVæ7F–öâvWE6V7F–öãt6Æ75&öw&W76–öäVçG&–W2€Ð¢6†&7FW"Ò7&VF÷%7FFRæG&g@Ð¢’°Ð¢6öç7BVçG&–W2ÐÐ¢vWD6Æ75&öw&W76–öäVçG&–W2†6†&7FW"“°Ð Ð¢–b†VçG&–W2æÆVæwF‚’°Ð¢&WGW&âVçG&–W0Ð¢æÖ‚†VçG'’Â–æFW‚’Óâ°Ð¢6öç7B6Æ74æÖRÐÐ¢6fTF—7Æ•7G&–ær€Ð¢VçG'“òæ6Æ74æÖRÀÐ¢6Æ72G¶–æFW‚²Ö Ð¢“°Ð Ð¢6öç7B6Æ74ÆWfVÂÐÐ¢ÖF‚æÖ‚€Ð¢ÀÐ¢vWD6Æ74VçG'”ÆWfVÂ†VçG'’ÂÐ¢“°Ð Ð¢6öç7B7V&6Æ74æÖRÐÐ¢6fTF—7Æ•7G&–ær€Ð¢VçG'“òç7V&6Æ74æÖRÀÐ¢" Ð¢“°Ð Ð¢&WGW&â°Ð¢6Æ74æÖRÀÐ¢6Æ74ÆWfVÂÀÐ¢7V&6Æ74æÖPÐ¢Ó°Ð¢ÒÐ¢æf–ÇFW"‚†VçG'’’ÓâVçG'’æ6Æ74æÖR“°Ð¢ÐÐ Ð¢6öç7B&–Ö'”6Æ72ÐÐ¢vWE&–Ö'”6Æ74VçG'’†6†&7FW"“°Ð Ð¢6öç7B6Æ74æÖRÐÐ¢6fTF—7Æ•7G&–ær€Ð¢&–Ö'”6Æ73òæ6Æ74æÖRÀÐ¢6fTF—7Æ•7G&–ær€Ð¢6†&7FW#òæ6Æ74æÖRÀÐ¢" Ð¢Ð¢“°Ð Ð¢–b‚6Æ74æÖR’°Ð¢&WGW&âµÓ°Ð¢ÐÐ Ð¢&WGW&â°Ð¢°Ð¢6Æ74æÖRÀÐ¢6Æ74ÆWfVÃ Ð¢6Æ×ÆWfVÂ€Ð¢6†&7FW#òæ6Æ75&öw&W76–öãòçF÷FÄÆWfVÂÇÀÐ¢6†&7FW#òæÆWfVÂÇÀÐ¢Ð¢’ÀÐ¢7V&6Æ74æÖS Ð¢6fTF—7Æ•7G&–ær€Ð¢&–Ö'”6Æ73òç7V&6Æ74æÖRÀÐ¢6fTF—7Æ•7G&–ær€Ð¢6†&7FW#òç7V&6Æ74æÖRÀÐ¢" Ð¢Ð¢Ð¢ÐÐ¢Ó°Ð¢ÐÐ Ð¢gVæ7F–öâf÷&ÖE6V7F–öãt6Æ74VçG'”Æ&VÂ†VçG'’’°Ð¢&WGW&âG¶VçG'’æ6Æ74æÖWÒG¶VçG'’æ6Æ74ÆWfVÇÒG°Ð¢VçG'’ç7V&6Æ74æÖPÐ¢ò(	BG¶VçG'’ç7V&6Æ74æÖWÖ Ð¢¢" Ð¢Ö°Ð¢ÐÐ Ð¢gVæ7F–öâf÷&ÖE6V7F–öãt6Æ74ÆWfVÅ7VÖÖ'’€Ð¢6†&7FW"Ò7&VF÷%7FFRæG&g@Ð¢’°Ð¢6öç7BÆWfVÂÐÐ¢6Æ×ÆWfVÂ€Ð¢6†&7FW#òæ6Æ75&öw&W76–öãòçF÷FÄÆWfVÂÇÀÐ¢6†&7FW#òæÆWfVÂÇÀÐ¢Ð¢“°Ð Ð¢6öç7BVçG&–W2ÐÐ¢vWE6V7F–öãt6Æ75&öw&W76–öäVçG&–W2€Ð¢6†&7FW Ð¢“°Ð Ð¢–b‚VçG&–W2æÆVæwF‚’°Ð¢&WGW&âÆWfVÂG¶ÆWfVÇÒæò6Æ76°Ð¢ÐÐ Ð¢6öç7B6Æ74'&V¶F÷vâÐÐ¢VçG&–W0Ð¢æÖ†f÷&ÖE6V7F–öãt6Æ74VçG'”Æ&VÂÐ¢æ¦ö–â‚"ò"“°Ð Ð¢&WGW&âVçG&–W2æÆVæwF‚âÐ¢òG¶6Æ74'&V¶F÷vçÒ„ÆWfVÂG¶ÆWfVÇÒ– Ð¢¢6Æ74'&V¶F÷vã°Ð¢ÐÐ Ð¢gVæ7F–öâ—56V7F–öãt6Æ746ö×ÆWFR€Ð¢6†&7FW Ð¢’°Ð¢&WGW&â6Æ757FWæ—57FW6ö×ÆWFR†6†&7FW"“°Ð¢ÐÐ Ð¢gVæ7F–öâ—56V7F–öãu7V&6Æ746ö×ÆWFR€Ð¢6†&7FW"Ò7&VF÷%7FFRæG&g@Ð¢’°Ð¢–b‚—56V7F–öãt6Æ746ö×ÆWFR†6†&7FW"’’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢–b†—4×VÇF–6Æ74G&gB†6†&7FW"’’°Ð¢&WGW&âvWD×VÇF–6Æ757VÖÖ'”VçG&–W2€Ð¢6†&7FW Ð¢’æWfW'’‚†VçG'’’Óâ°Ð¢6öç7B7V&6Æ74÷F–öç2ÐÐ¢'&’æ—4'&’€Ð¢VçG'’çFV×ÆFSòç7V&6Æ76W0Ð¢Ð¢òVçG'’çFV×ÆFRç7V&6Æ76W0Ð¢¢µÓ°Ð Ð¢–b€Ð¢7V&6Æ74÷F–öç2æÆVæwF‚ÇÀÐ¢VçG'’æ6Æ74ÆWfVÂÀÐ¢VçG'’ç7V&6Æ74ÆWfVÀÐ¢’°Ð¢&WGW&âG'VS°Ð¢ÐÐ Ð¢&WGW&â&ööÆVâ€Ð¢VçG'’ç7V&6Æ74æÖPÐ¢“°Ð¢Ò“°Ð¢ÐÐ Ð¢6öç7B6VÆV7FVD6Æ72ÐÐ¢vWE6VÆV7FVD6Æ75FV×ÆFR‚“°Ð Ð¢6öç7B7V&6Æ74ÆWfVÂÐÐ¢ÖF‚æÖ‚€Ð¢ÀÐ¢6fTçVÖ&W"€Ð¢6VÆV7FVD6Æ73òç7V&6Æ74ÆWfVÂÀÐ¢ Ð¢Ð¢“°Ð Ð¢6öç7B6Æ74ÆWfVÂÐÐ¢vWD6Æ74VçG'”ÆWfVÂ€Ð¢vWE&–Ö'”6Æ74VçG'’€Ð¢6†&7FW Ð¢’ÀÐ¢6†&7FW Ð¢òæ6Æ75&öw&W76–öàÐ¢òçF÷FÄÆWfVÀÐ¢“°Ð Ð¢6öç7B7V&6Æ74÷F–öç2ÐÐ¢'&’æ—4'&’€Ð¢6VÆV7FVD6Æ73òç7V&6Æ76W0Ð¢Ð¢ò6VÆV7FVD6Æ72ç7V&6Æ76W0Ð¢¢µÓ°Ð Ð¢–b€Ð¢7V&6Æ74÷F–öç2æÆVæwF‚ÇÀÐ¢6Æ74ÆWfVÂÂ7V&6Æ74ÆWfVÀÐ¢’°Ð¢&WGW&âG'VS°Ð¢ÐÐ Ð¢&WGW&â&ööÆVâ€Ð¢vWE6fU7V&6Æ74æÖR†6†&7FW"Ð¢“°Ð¢ÐÐ Ð¢gVæ7F–öâ—56V7F–öãtÆWfVÄ6ö×ÆWFR€Ð¢6†&7FW Ð¢’°Ð¢6öç7BÆWfVÂÐÐ¢6fTçVÖ&W"€Ð¢6†&7FW Ð¢òæ6Æ75&öw&W76–öàÐ¢òçF÷FÄÆWfVÂÀÐ¢ Ð¢“°Ð Ð¢6öç7BÖ„‡ÐÐ¢6fTçVÖ&W"€Ð¢6†&7FW Ð¢òæ6öÖ&@Ð¢òæÖ„‡ÀÐ¢ Ð¢“°Ð Ð¢&WGW&â€Ð¢—56V7F–öãt6Æ746ö×ÆWFR€Ð¢6†&7FW Ð¢’b`Ð¢ÆWfVÂãÒb`Ð¢ÆWfVÂÃÒ#b`Ð¢Ö„‡ãÒb`Ð¢6fTçVÖ&W"€Ð¢6†&7FW Ð¢òæ6öÖ&@Ð¢òæ7W'&VçD‡ÀÐ¢ Ð¢’ãÒ Ð¢“°Ð¢ÐÐ Ð¢gVæ7F–öâ—56V7F–öãtWV—ÖVçD6ö×ÆWFR€Ð¢6†&7FW Ð¢’°Ð¢&WGW&âWV—ÖVçE7FWæ—57FW6ö×ÆWFR€Ð¢6†&7FW Ð¢“°Ð¢ÐÐ Ð¢gVæ7F–öâ—56V7F–öãu7VÆÇ46ö×ÆWFR€Ð¢6†&7FW Ð¢’°Ð¢&WGW&â7VÆÇ57FWæ—57FW6ö×ÆWFR€Ð¢6†&7FW Ð¢“°Ð¢ÐÐ Ð¢gVæ7F–öâ†æFÆU6V7F–öãtF§W7DfVE&W6÷W&6R‚ââçfÇVW2’°Ð¢6öç7B'WGFöâÒf–æE6V7F–öãd7F–öäVÆVÖVçB‚ââçfÇVW2“°Ð Ð¢–b€Ð¢F§W7E6VÆV7FVDfVE&W6÷W&6R€Ð¢'WGFöãòæFF6WCòç&W6÷W&6T–BÇÂ""ÀÐ¢'WGFöãòæFF6WCòæFVÇFÇÂ Ð¢Ð¢’°Ð¢6WE7FGW2‚$fVB&W6÷W&6RWFFVBâ"“°Ð¢&VæFW$7W'&VçE7FW‚“°Ð¢ÐÐ¢ÐÐ Ð¢gVæ7F–öâ†æFÆU6V7F–öãtF§W7D6Æ75&W6÷W&6R‚ââçfÇVW2’°Ð¢6öç7B'WGFöâÒf–æE6V7F–öãd7F–öäVÆVÖVçB‚ââçfÇVW2“°Ð Ð¢–b€Ð¢F§W7E6VÆV7FVD6Æ75&W6÷W&6R€Ð¢'WGFöãòæFF6WCòç&W6÷W&6T–BÇÂ""ÀÐ¢'WGFöãòæFF6WCòæFVÇFÇÂ Ð¢Ð¢’°Ð¢6WE7FGW2‚$6Æ72fVGW&R&W6÷W&6RWFFVBâ"“°Ð¢&VæFW$7W'&VçE7FW‚“°Ð¢ÐÐ¢ÐÐ Ð¢gVæ7F–öâ†æFÆU6V7F–öãuFövvÆU&vU7FFR‚ââçfÇVW2’°Ð¢6öç7B'WGFöâÒf–æE6V7F–öãd7F–öäVÆVÖVçB‚ââçfÇVW2“°Ð Ð¢–b€Ð¢FövvÆU6V7F–öã%&vU7FFR€Ð¢'WGFöãòæFF6WCòç&W6÷W&6T–BÇÂ" Ð¢Ð¢’°Ð¢6öç7B7F—fRÐÐ¢7&VF÷%7FFRæG&gBæ6öÖ&@Ð¢æ6Æ74fVGW&U7FFW3òç&vT7F—fRÓÓÒG'VS°Ð Ð¢6WE7FGW2€Ð¢7F—fPÐ¢ò%&vR7F'FVBâ7VÆÆ67F–æræB6öæ6VçG&F–öâ&R&Æö6¶VBVçF–Â&vRVæG2â Ð¢¢%&vRVæFVBâ7VÆÆ67F–ær—2f–Æ&ÆRv–ââ Ð¢“°Ð¢&VæFW$7W'&VçE7FW‚“°Ð¢ÐÐ¢ÐÐ Ð¢gVæ7F–öâ†æFÆU6V7F–öãtF§W7DF—f–æU6Ö—FU6Æ÷B‚ââçfÇVW2’°Ð¢6öç7B'WGFöâÒf–æE6V7F–öãd7F–öäVÆVÖVçB‚ââçfÇVW2“°Ð Ð¢–b€Ð¢F§W7E6V7F–öã%7VÆÅ6Æ÷EW6vR€Ð¢'WGFöãòæFF6WCòç6Æ÷D¶–æBÇÂ&æ÷&ÖÂ"ÀÐ¢'WGFöãòæFF6WCòç6Æ÷DÆWfVÂÇÂÀÐ¢'WGFöãòæFF6WCòæFVÇFÇÂÀÐ¢'WGFöãòæFF6WCòç6Æ÷E6÷W&6T–BÇÂ" Ð¢Ð¢’°Ð¢6WE7FGW2‚%7VÆÂ6Æ÷BW6vRWFFVBâ"“°Ð¢&VæFW$7W'&VçE7FW‚“°Ð¢ÐÐ¢ÐÐ Ð¢7–æ2gVæ7F–öâW'6—7E6V7F–öãu6†VWD×WFF–öâ€Ð¢×WFF–öâÀÐ¢7V66W74ÖW76vPÐ¢’°Ð¢–b€Ð¢7&VF÷%7FFPÐ¢æ7W'&VçD6†&7FW$–@Ð¢’°Ð¢6WE7FGW2€Ð¢%6fRF†—26†&7FW"&Vf÷&RG&6¶–ærvÖWÆ’â Ð¢“°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢6öç7B'V–ÆFW%7FFRÒ°Ð¢7FGW3 Ð¢7&VF÷%7FFRæG&g@Ð¢òæ'V–ÆFW#òç7FGW2ÇÀÐ¢&G&gB"ÀÐ¢f–æÆ—¦VDDÖ–ÆÆ—3 Ð¢7&VF÷%7FFRæG&g@Ð¢òæ'V–ÆFW Ð¢òæf–æÆ—¦VDDÖ–ÆÆ—2ÇÀÐ¢çVÆÀÐ¢Ó°Ð¢6öç7B&W7VÇBÐÐ¢G—Vöb×WFF–öâÓÓÒ&gVæ7F–öâ Ð¢ò×WFF–öâ‚Ð¢¢×WFF–öã°Ð¢6öç7B6†ævVBÐÐ¢G—Vöb&W7VÇBÓÓÒ&ö&¦V7B"b`Ð¢&W7VÇBÓÒçVÆÂb`Ð¢&6†ævVB"–â&W7VÇ@Ð¢ò&W7VÇBæ6†ævVBÓÓÒG'VPÐ¢¢&W7VÇBÓÒfÇ6S°Ð¢6öç7BÖW76vRÐÐ¢G—Vöb&W7VÇBÓÓÒ&ö&¦V7B"b`Ð¢&W7VÇBÓÒçVÆÀÐ¢ò6ÆVå7G&–ær€Ð¢&W7VÇBæÖW76vRÀÐ¢7V66W74ÖW76vPÐ¢Ð¢¢7V66W74ÖW76vS°Ð Ð¢–b‚6†ævVB’°Ð¢6WE7FGW2€Ð¢ÖW76vRÇÀÐ¢$æ÷F†–æræVVFVBFò6†ævRâ Ð¢“°Ð¢&WGW&âvWD6†&7FW%6æ6†÷B‚“°Ð¢ÐÐ Ð¢7&VF÷%7FFRæG&gBæ'V–ÆFW"Ò°Ð¢âââ†7&VF÷%7FFRæG&g@Ð¢æ'V–ÆFW"ÇÂ·Ò’ÀÐ¢7FGW3 Ð¢'V–ÆFW%7FFRç7FGW2ÀÐ¢f–æÆ—¦VDDÖ–ÆÆ—3 Ð¢'V–ÆFW%7FFPÐ¢æf–æÆ—¦VDDÖ–ÆÆ—0Ð¢Ó°Ð¢7&VF÷%7FFRæF—'G’ÒG'VS°Ð¢66†VGVÆTG&gEW'6—7FVæ6R‚“°Ð¢&VæFW$7F–öä&"‚“°Ð Ð¢6öç7B6fVBÐÐ¢v—B6fU6V7F–öã„6†&7FW"‡°Ð¢4æWs¢fÇ6RÀÐ¢6÷”æÖS¢fÇ6RÀÐ¢&W6W'fTf–æÆ—¦F–öã¢G'VPÐ¢Ò“°Ð Ð¢–b‚6fVB’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢6WE7FGW2€Ð¢ÖW76vRÇÀÐ¢$vÖWÆ’6fVBâ Ð¢“°Ð Ð¢&WGW&âvWD6†&7FW%6æ6†÷B‚“°Ð¢ÐÐ Ð¢gVæ7F–öâ†æFÆU6V7F–öãu6†VWDvÖWÆ”7F–öâ€Ð¢7F–öàÐ¢’°Ð¢&WGW&âW'6—7E6V7F–öãu6†VWD×WFF–öâ€Ð¢‚’Óâ°Ð¢&WGW&âÇ”vÖWÆ”7F–öâ€Ð¢7&VF÷%7FFRæG&gBÀÐ¢7F–öàÐ¢“°Ð¢ÒÀÐ¢$vÖWÆ’6fVBâ Ð¢“°Ð¢ÐÐ Ð¢gVæ7F–öâ†æFÆU6V7F–öãu6†VWE&W7B€¢&W7EG—PÐ¢’°Ð¢&WGW&âW'6—7E6V7F–öãu6†VWD×WFF–öâ€Ð¢‚’Óâ°Ð¢6öç7B&W7D6†ævVBÐÐ¢W&f÷&Õ6V7F–öãe&W7B€Ð¢&W7EG—PÐ¢“°Ð¢6öç7B6ÆVçWÐÐ¢&W7EG—RÓÓÒ&Æöæu&W7B Ð¢òÇ”vÖWÆ”7F–öâ€Ð¢7&VF÷%7FFRæG&gBÀÐ¢°Ð¢G—S Ð¢&Æöær×&W7BÖ6ÆVçW Ð¢ÐÐ¢Ð¢¢°Ð¢6†ævVC¢fÇ6PÐ¢Ó°Ð Ð¢&WGW&â°Ð¢6†ævVC Ð¢&W7D6†ævVBÇÀÐ¢6ÆVçWæ6†ævVBÓÓÒG'VRÀÐ¢ÖW76vS Ð¢G°Ð¢&W7EG—RÓÓÒ&Æöæu&W7B Ð¢ò$Æöær Ð¢¢%6†÷'B Ð¢Ò&W7B6ö×ÆWFVBæB6fVBæ Ð¢Ó°Ð¢ÒÀÐ¢%&W7B6ö×ÆWFVBæB6fVBâ Ð¢“°¢Ð ¢gVæ7F–öâvWE6V7F–öãu7VÆÄ67D÷F–öç2€¢7VÆÀ¢’°¢6öç7B&6TÆWfVÂÒÖF‚æÖ‚€¢À¢ÖF‚æÖ–â€¢’À¢ÖF‚ç&÷VæB€¢6fTçVÖ&W"‡7VÆÃòæÆWfVÂÂ¢¢¢“° ¢–b†&6TÆWfVÂÓÓÒ’°¢&WGW&â·°¢¶–æC¢&6çG&—"À¢ÆWfVÃ¢À¢6÷W&6T–C¢""À¢Æ&VÃ¢$6çG&—(	Bæò7VÆÂ6Æ÷B"À¢&VÖ–æ–æs¢çVÖ&W"åõ4•D•dUô”äd”ä•E¢ÕÓ°¢Ð ¢6öç7BW6vRÐ¢vWE6V7F–öã%7VÆÅ6Æ÷EW6vU7FFR‚“° ¢&WGW&â°¢ââäö&¦V7BçfÇVW2‡W6vRææ÷&ÖÂ¢æf–ÇFW"‚‡6Æ÷B’Óâ€¢6Æ÷BæÆWfVÂãÒ&6TÆWfVÂb`¢6Æ÷Bç&VÖ–æ–ærâ ¢’¢æÖ‚‡6Æ÷B’Óâ‡°¢¶–æC¢&æ÷&ÖÂ"À¢ÆWfVÃ¢6Æ÷BæÆWfVÂÀ¢6÷W&6T–C¢""À¢Æ&VÃ ¢ÆWfVÂG·6Æ÷BæÆWfVÇÒ6Æ÷B‚G·6Æ÷Bç&VÖ–æ–æwÒ&VÖ–æ–ær–À¢&VÖ–æ–æs¢6Æ÷Bç&VÖ–æ–æp¢Ò’’À¢ââçW6vRç7E6÷W&6W0¢æf–ÇFW"‚‡6Æ÷B’Óâ€¢6Æ÷BæÆWfVÂãÒ&6TÆWfVÂb`¢6Æ÷Bç&VÖ–æ–ærâ ¢’¢æÖ‚‡6Æ÷B’Óâ‡°¢¶–æC¢'7B"À¢ÆWfVÃ¢6Æ÷BæÆWfVÂÀ¢6÷W&6T–C¢6Æ÷Bç6÷W&6T–BÀ¢Æ&VÃ ¢G·6Æ÷Bæ6Æ74æÖWÒ7B6Æ÷B(	BÆWfVÂG·6Æ÷BæÆWfVÇÒ‚G·6Æ÷Bç&VÖ–æ–æwÒ&VÖ–æ–ær–À¢&VÖ–æ–æs¢6Æ÷Bç&VÖ–æ–æp¢Ò’¢Ó°¢Ð ¢7–æ2gVæ7F–öâ6öæf—&Õ6V7F–öãu7VÆÄ67B€¢7VÆÂÀ¢6VÆV7F–öâÒ·Ð¢’°¢6öç7B&Wf–÷W4F—'G’Ð¢7&VF÷%7FFRæF—'G“°¢6öç7B&Wf–÷W56Æ÷EW6vRÐ¢6ÆöæTFF€¢7&VF÷%7FFRæG&gCòæÖv–0¢òç6Æ÷EW6vRÇÂ·Ð¢“°¢6öç7B&Wf–÷W46öæ6VçG&F–öâÐ¢6ÆöæTFF€¢7&VF÷%7FFRæG&gCòæ6öÖ&@¢òæ6öæ6VçG&F–öâóòçVÆÀ¢“° ¢6öç7B&W7F÷&UVæ6öæf—&ÖVD67BÒ‚’Óâ°¢–b‚7&VF÷%7FFRæG&gBæÖv–2’°¢7&VF÷%7FFRæG&gBæÖv–2Ò·Ó°¢Ð¢7&VF÷%7FFRæG&gBæÖv–2ç6Æ÷EW6vRÐ¢&Wf–÷W56Æ÷EW6vS°¢6öç7B6öÖ&BÒVç7W&TvÖWÆ•7FFR€¢7&VF÷%7FFRæG&g@¢“°¢6öÖ&Bæ6öæ6VçG&F–öâÐ¢&Wf–÷W46öæ6VçG&F–öã°¢7&VF÷%7FFRæF—'G’Ð¢&Wf–÷W4F—'G“°¢Ç”6ö×F–&–Æ—G”Æ–6W2€¢7&VF÷%7FFRæG&g@¢“°¢66†VGVÆTG&gEW'6—7FVæ6R‚“°¢&VæFW$7F–öä&"‚“°¢Ó° ¢G'’°¢6öç7B&W7VÇBÐ¢v—BW'6—7E6V7F–öãu6†VWD×WFF–öâ€¢‚’Óâ°¢6öç7B&6TÆWfVÂÒÖF‚æÖ‚€¢À¢ÖF‚ç&÷VæB€¢6fTçVÖ&W"‡7VÆÃòæÆWfVÂÂ¢¢“°¢ÆWB7VçE6Æ÷BÒfÇ6S° ¢–b†&6TÆWfVÂâ’°¢6öç7Bf–Æ&ÆRÐ¢vWE6V7F–öãu7VÆÄ67D÷F–öç2€¢7VÆÀ¢’æf–æB‚†÷F–öâ’Óâ€¢÷F–öâæ¶–æBÓÓÐ¢6ÆVå7G&–ær€¢6VÆV7F–öâæ¶–æBÀ¢&æ÷&ÖÂ ¢’b`¢÷F–öâæÆWfVÂÓÓÐ¢ÖF‚ç&÷VæB€¢6fTçVÖ&W"€¢6VÆV7F–öâæÆWfVÂÀ¢&6TÆWfVÀ¢¢’b`¢÷F–öâç6÷W&6T–BÓÓÐ¢6ÆVå7G&–ær€¢6VÆV7F–öâç6÷W&6T–@¢¢’“° ¢–b‚f–Æ&ÆR’°¢F‡&÷ræWrW'&÷"€¢%F†B7VÆÂ6Æ÷B—2æòÆöævW"f–Æ&ÆRâæò&W6÷W&6Rv27VçBâ ¢“°¢Ð ¢7VçE6Æ÷BÐ¢F§W7E6V7F–öã%7VÆÅ6Æ÷EW6vR€¢f–Æ&ÆRæ¶–æBÀ¢f–Æ&ÆRæÆWfVÂÀ¢À¢f–Æ&ÆRç6÷W&6T–@¢“° ¢–b‚7VçE6Æ÷B’°¢F‡&÷ræWrW'&÷"€¢%F†R7VÆÂ6Æ÷B6÷VÆBæ÷B&R7VçBâF†R67Bv2æ÷B6öæf—&ÖVBâ ¢“°¢Ð¢Ð ¢6öç7B6öæ6VçG&F–öâÒ€¢7VÆÃòæ6öæ6VçG&F–öâÓÓÒG'VRÇÀ¢7VÆÃòçF&vWF–æsòæGW&F–öà¢òæ6öæ6VçG&F–öâÓÓÒG'VP¢“°¢ÆWB6öæ6VçG&F–öä6†ævVBÒfÇ6S° ¢–b†6öæ6VçG&F–öâ’°¢6öç7B6öÖ&BÐ¢Vç7W&TvÖWÆ•7FFR€¢7&VF÷%7FFRæG&g@¢“°¢6öÖ&Bæ6öæ6VçG&F–öâÒ°¢7VÆÄ–C ¢6ÆVå7G&–ær‡7VÆÃòæ–B’À¢7VÆÄæÖS ¢6ÆVå7G&–ær€¢7VÆÃòææÖRÀ¢%7VÆÂ ¢’À¢7F'FVDDÖ–ÆÆ—3 ¢FFRææ÷r‚¢Ó°¢6öæ6VçG&F–öä6†ævVBÒG'VS°¢Ð ¢&WGW&â°¢6†ævVC ¢7VçE6Æ÷BÇÀ¢6öæ6VçG&F–öä6†ævVBÀ¢ÖW76vS ¢G¶6ÆVå7G&–ær‡7VÆÃòææÖRÂ%7VÆÂ"—Ò67B6öæf—&ÖVBG·7VçE6Æ÷Bò"æB7VÆÂ6Æ÷B7VçB"¢"'ÒG¶6öæ6VçG&F–öâò#²6öæ6VçG&F–öâ7F'FVB"¢"'Òæ ¢Ó°¢ÒÀ¢%7VÆÂ67B6öæf—&ÖVBæB6fVBâ ¢“° ¢–b‡&W7VÇBÓÓÒfÇ6R’°¢&W7F÷&UVæ6öæf—&ÖVD67B‚“°¢Ð ¢&WGW&â&W7VÇC°¢Ò6F6‚†W'&÷"’°¢&W7F÷&UVæ6öæf—&ÖVD67B‚“°¢F‡&÷rW'&÷#°¢Ð¢Ð Ð¢gVæ7F–öâvWE6V7F–öãt6†&7FW%6†VWEf–Wr‚’°Ð¢–b‚6†&7FW%6†VWEf–Wr’°Ð¢6†&7FW%6†VWEf–WrÒ7&VFT6†&7FW%6†VWEf–Wr‡°Ð¢&ö÷C¢‚’Óâ°Ð¢&Vg&W6…v—¦&DVÆVÖVçG2‚“°Ð¢&WGW&ârç&ö÷C°Ð¢ÒÀÐ Ð¢vWD6†&7FW#¢vWD6†&7FW%6æ6†÷BÀÐ¢6WE7FGW2ÀÐ¢vWE6†VWD6öçFW‡C¢‚’Óâ°Ð¢&WGW&â°Ð¢6†&7FW$–C Ð¢7&VF÷%7FFPÐ¢æ7W'&VçD6†&7FW$–BÀÐ¢F—'G“ Ð¢7&VF÷%7FFRæF—'G’ÀÐ¢Æ7E6fVDDÖ–ÆÆ—3 Ð¢7&VF÷%7FFRæG&g@Ð¢òæ'V–ÆFW Ð¢òæÆ7E6fVDDÖ–ÆÆ—2ÀÐ¢&WGW&äÆ&VÃ Ð¢7&VF÷%7FFRçf–WtÖöFRÓÓÐÐ¢&Æ–'&'’ Ð¢ò$&6²FòÆ–'&'’ Ð¢¢$&6²Fò&Wf–Wr Ð¢Ó°Ð¢ÒÀÐ¢öäF§W7D6Æ75&W6÷W&6S Ð¢‡&W6÷W&6T–BÂFVÇF’Óâ°Ð¢&WGW&âW'6—7E6V7F–öãu6†VWD×WFF–öâ€Ð¢‚’Óâ°Ð¢&WGW&âF§W7E6VÆV7FVD6Æ75&W6÷W&6R€Ð¢&W6÷W&6T–BÀÐ¢FVÇFÐ¢“°Ð¢ÒÀÐ¢$6Æ72&W6÷W&6RWFFVBæB6fVBâ Ð¢“°Ð¢ÒÀÐ¢öäF§W7DfVE&W6÷W&6S Ð¢‡&W6÷W&6T–BÂFVÇF’Óâ°Ð¢&WGW&âW'6—7E6V7F–öãu6†VWD×WFF–öâ€Ð¢‚’Óâ°Ð¢&WGW&âF§W7E6VÆV7FVDfVE&W6÷W&6R€Ð¢&W6÷W&6T–BÀÐ¢FVÇFÐ¢“°Ð¢ÒÀÐ¢$fVB&W6÷W&6RWFFVBæB6fVBâ Ð¢“°Ð¢ÒÀÐ¢öäF§W7D–ææFU7VÆÅ&W6÷W&6S Ð¢‡6÷W&6T–BÂ7VÆÄ–BÂFVÇF’Óâ°Ð¢&WGW&âW'6—7E6V7F–öãu6†VWD×WFF–öâ€Ð¢‚’Óâ°Ð¢&WGW&âF§W7D6æöæ–6Å7VÆÅ&W6÷W&6R€Ð¢7&VF÷%7FFRæG&gBÀÐ¢6÷W&6T–BÀÐ¢7VÆÄ–BÀÐ¢FVÇFÐ¢“°Ð¢ÒÀÐ¢$–ææFR7VÆÂ&W6÷W&6RWFFVBæB6fVBâ Ð¢“°Ð¢ÒÀÐ¢öäF§W7D†—DF–S Ð¢††—DF–T–BÂFVÇF’Óâ°Ð¢&WGW&âW'6—7E6V7F–öãu6†VWD×WFF–öâ€Ð¢‚’Óâ°Ð¢&WGW&âF§W7E6V7F–öãd†—DF–UW6vR€Ð¢†—DF–T–BÀÐ¢FVÇFÐ¢“°Ð¢ÒÀÐ¢$†—BF–RW6vRWFFVBæB6fVBâ Ð¢“°Ð¢ÒÀÐ¢öäF§W7E7VÆÅ6Æ÷C ¢€Ð¢6Æ÷D¶–æBÀÐ¢6Æ÷DÆWfVÂÀÐ¢FVÇFÀÐ¢6Æ÷E6÷W&6T–@Ð¢’Óâ°Ð¢&WGW&âW'6—7E6V7F–öãu6†VWD×WFF–öâ€Ð¢‚’Óâ°Ð¢&WGW&âF§W7E6V7F–öã%7VÆÅ6Æ÷EW6vR€Ð¢6Æ÷D¶–æBÀÐ¢6Æ÷DÆWfVÂÀÐ¢FVÇFÀÐ¢6Æ÷E6÷W&6T–@Ð¢“°Ð¢ÒÀÐ¢%7VÆÂ×6Æ÷BW6vRWFFVBæB6fVBâ Ð¢“°¢ÒÀ¢öåF&vWE7VÆÃ ¢‡°¢7VÆÂÀ¢6†&7FW"À¢6†&7FW$–@¢Ò’Óâ°¢–b€¢G—VöbFW2çF&vWE7VÆÄöäÖÓÐ¢&gVæ7F–öâ ¢’°¢6WE7FGW2€¢$&GFÆRÖÖ7VÆÂF&vWF–ær—2Væf–Æ&ÆRâ ¢“°¢&WGW&âfÇ6S°¢Ð ¢–b‚7&VF÷%7FFRæ7W'&VçD6†&7FW$–B’°¢6WE7FGW2€¢%6fRF†—26†&7FW"&Vf÷&RF&vWF–ær7VÆÂöâF†RÖâ ¢“°¢&WGW&âfÇ6S°¢Ð ¢6öç7B6Æ÷D÷F–öç2Ð¢vWE6V7F–öãu7VÆÄ67D÷F–öç2€¢7VÆÀ¢“° ¢–b€¢6fTçVÖ&W"‡7VÆÃòæÆWfVÂÂ’âb`¢6Æ÷D÷F–öç2æÆVæwF€¢’°¢6WE7FGW2€¢%F†—26†&7FW"†2æòf–Æ&ÆR6Æ÷BF†B6â67BF†B7VÆÂâ ¢“°¢&WGW&âfÇ6S°¢Ð ¢&WGW&âFW2çF&vWE7VÆÄöäÖ‡°¢7VÆÂÀ¢6†&7FW"À¢6†&7FW$–C ¢6†&7FW$–BÇÀ¢7&VF÷%7FFP¢æ7W'&VçD6†&7FW$–BÀ¢6Æ÷D÷F–öç2À¢öä6öæf—&Ô67C ¢‡6VÆV7F–öâ’Óâ°¢&WGW&â6öæf—&Õ6V7F–öãu7VÆÄ67B€¢7VÆÂÀ¢6VÆV7F–öà¢“°¢Ð¢Ò“°¢ÒÀ¢öå&W7C ¢†æFÆU6V7F–öãu6†VWE&W7BÀÐ¢öävÖWÆ”7F–öã Ð¢†æFÆU6V7F–öãu6†VWDvÖWÆ”7F–öâÀÐ¢öäW‡÷'D§6öã¢‚’Óâ°Ð¢&WGW&âW‡÷'E6V7F–öã„§6öâ‚“°Ð¢ÒÀÐ¢öå7–æ4Æ–æ¶VEFö¶Vã Ð¢7–æ2‚’Óâ°Ð¢&WGW&âv—B†æFÆU6V7F–öã…6fR‚“°Ð¢ÒÀÐ Ð¢öäVF—C¢‚’Óâ°Ð¢6öç7B7FW–BÐÐ¢vWE7FW'”–B€Ð¢7&VF÷%7FFRæG&g@Ð¢òæ'V–ÆFW Ð¢òæ7W'&VçE7FWÇÀÐ¢'&Wf–Wr Ð¢’æ–C°Ð Ð¢6†&7FW%6†VWEf–Wræ6Æ÷6R‚“°Ð¢7&VF÷%7FFRçf–WtÖöFRÐÐ¢&'V–ÆFW"#°Ð¢æf–vFUFõ7FW‡7FW–B“°Ð¢&WGW&âG'VS°Ð¢ÒÀÐ Ð¢öäGWÆ–6FS¢‚’Óâ°Ð¢6öç7B6†&7FW$–BÐÐ¢7&VF÷%7FFPÐ¢æ7W'&VçD6†&7FW$–C°Ð Ð¢6†&7FW%6†VWEf–Wræ6Æ÷6R‚“°Ð¢&WGW&âGWÆ–6FT6†&7FW$g&öÔÆ–'&'’€Ð¢6†&7FW$–@Ð¢“°Ð¢ÒÀÐ Ð¢öäFVÆWFS¢7–æ2‚’Óâ°Ð¢6öç7B6†&7FW$–BÐÐ¢7&VF÷%7FFPÐ¢æ7W'&VçD6†&7FW$–C°Ð Ð¢6†&7FW%6†VWEf–Wræ6Æ÷6R‚“°Ð¢&WGW&âv—BFVÆWFU6V7F–öã„6†&7FW"€Ð¢6†&7FW$–@Ð¢“°Ð¢ÒÀÐ Ð¢öä6Æ÷6S¢‚’Óâ°Ð¢6WE7FGW2€Ð¢7&VF÷%7FFRçf–WtÖöFRÓÓÐÐ¢&Æ–'&'’ Ð¢ò%&WGW&æVBFòF†R6†&7FW"Æ–'&'’â Ð¢¢%&WGW&æVBFòF†R6†&7FW"7&VF÷"â Ð¢“°Ð¢&VæFW$7&VF÷%f–Wr‚“°Ð¢ÐÐ¢Ò“°Ð¢ÐÐ Ð¢&WGW&â6†&7FW%6†VWEf–Ws°Ð¢ÐÐ Ð¢gVæ7F–öâ†æFÆU6V7F–öãt÷Vä6†&7FW%6†VWB‚’°Ð¢vWE6V7F–öãt6†&7FW%6†VWEf–Wr‚’æ÷Vâ€Ð¢vWD6†&7FW%6æ6†÷B‚Ð¢“°Ð¢ÐÐ Ð¢&Vv—7FW$6†&7FW$7&VF÷$7F–öâ€Ð¢&F§W7BÖ6Æ72×&W6÷W&6R"ÀÐ¢†æFÆU6V7F–öãtF§W7D6Æ75&W6÷W&6PÐ¢“°Ð Ð¢&Vv—7FW$6†&7FW$7&VF÷$7F–öâ€Ð¢'FövvÆR×&vR×7FFR"ÀÐ¢†æFÆU6V7F–öãuFövvÆU&vU7FFPÐ¢“°Ð Ð¢&Vv—7FW$6†&7FW$7&VF÷$7F–öâ€Ð¢&F§W7BÖF—f–æR×6Ö—FR×6Æ÷B"ÀÐ¢†æFÆU6V7F–öãtF§W7DF—f–æU6Ö—FU6Æ÷@Ð¢“°Ð Ð¢&Vv—7FW$6†&7FW%7FW6ö×ÆWF–öâ€Ð¢&&6–72"ÀÐ¢&6–757FWæ—57FW6ö×ÆWFPÐ¢“°Ð Ð¢&Vv—7FW$6†&7FW%7FW6ö×ÆWF–öâ€Ð¢'7V6–W2"ÀÐ¢7V6–W57FWæ—57FW6ö×ÆWFPÐ¢“°Ð Ð¢&Vv—7FW$6†&7FW%7FW6ö×ÆWF–öâ€Ð¢&6Æ72"ÀÐ¢6Æ757FWæ—57FW6ö×ÆWFPÐ¢“°Ð Ð¢&Vv—7FW$6†&7FW%7FW6ö×ÆWF–öâ€Ð¢'7V&6Æ72"ÀÐ¢—56V7F–öãu7V&6Æ746ö×ÆWFPÐ¢“°Ð Ð¢&Vv—7FW$6†&7FW%7FW6ö×ÆWF–öâ€Ð¢&ÆWfVÂ"ÀÐ¢—56V7F–öãtÆWfVÄ6ö×ÆWFPÐ¢“°Ð Ð¢&Vv—7FW$6†&7FW%7FW6ö×ÆWF–öâ€Ð¢&&–Æ—F–W2"ÀÐ¢&–Æ—F–W57FWæ—57FW6ö×ÆWFPÐ¢“°Ð Ð¢&Vv—7FW$6†&7FW%7FW6ö×ÆWF–öâ€Ð¢&&6¶w&÷VæB"ÀÐ¢&6¶w&÷VæE7FWæ—57FW6ö×ÆWFPÐ¢“°Ð Ð¢&Vv—7FW$6†&7FW%7FW6ö×ÆWF–öâ€Ð¢'6¶–ÆÇ2"ÀÐ¢6¶–ÆÇ57FWæ—57FW6ö×ÆWFPÐ¢“°Ð Ð¢&Vv—7FW$6†&7FW%7FW6ö×ÆWF–öâ€Ð¢&WV—ÖVçB"ÀÐ¢WV—ÖVçE7FWæ—57FW6ö×ÆWFPÐ¢“°Ð Ð¢&Vv—7FW$6†&7FW%7FW6ö×ÆWF–öâ€Ð¢'7VÆÇ2"ÀÐ¢7VÆÇ57FWæ—57FW6ö×ÆWFPÐ¢“°Ð Ð¢&Vv—7FW$6†&7FW%7FW6ö×ÆWF–öâ€Ð¢'&Wf–Wr"ÀÐ¢&Wf–Wu7FWæ—57FW6ö×ÆWFPÐ¢“°Ð Ð¢&Vv—7FW$6†&7FW%7FW&VæFW&W"€Ð¢'&Wf–Wr"ÀÐ¢&Wf–Wu7FWç&VæFW%7FW Ð¢“°Ð Ð¢&Wf–Wu7FWæ7F–öç2æf÷$V6‚‚†7F–öâ’Óâ°Ð¢&Vv—7FW$6†&7FW$7&VF÷$7F–öâ€Ð¢7F–öâÀÐ¢†6öçFW‡B’Óâ°Ð¢&WGW&â&Wf–Wu7FWæ†æFÆU7FW6Æ–6²€Ð¢6öçFW‡@Ð¢“°Ð¢ÐÐ¢“°Ð¢Ò“°Ð Ð¢&Vv—7FW$6†&7FW$7&VF÷$7F–öâ€Ð¢&F§W7BÖfVB×&W6÷W&6R"ÀÐ¢†æFÆU6V7F–öãtF§W7DfVE&W6÷W&6PÐ¢“°Ð Ð¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÐÐ¢òò4„$5DU"5$TDõ"4T5D”ôâ‚(	B4dRòU…õ%Bò”Õõ%@Ð¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÐÐ Ð¢6öç7B°Ð¢&Æö6µ6V7F–öã„f–æÆ—¦F–öâÂ6÷•6V7F–öã„§6öâÂFVÆWFU6V7F–öã„6†&7FW"ÂW‡÷'E6V7F–öã„§6öâÂf÷&ÖE6V7F–öã…6fVEF–ÖRÂvWE6V7F–öã„6†&7FW$6öÆÆV7F–öâÀÐ¢vWE6V7F–öã„6†&7FW$6öÆÆV7F–öäæÖRÂvWE6V7F–öã„6†&7FW$Fö7VÖVçBÂvWE6V7F–öã„6†&7FW%÷'G&—EW&ÂÂvWE6V7F–öã„Fö7VÖVçE6æ6†÷DFFÂvWE6V7F–öã„§6öåFW‡BÂvWE6V7F–öã…&V6÷&E&Wf—6–öäÖ–ÆÆ—2ÀÐ¢vWE6V7F–öã…&V6÷&E&ööÔ6öFRÂvWE6V7F–öã…&V6÷&EG—RÂvWE6V7F–öã…F–ÖW7F×Ö–ÆÆ—2ÂvWEfÆ–FFVE6V7F–öã„6†&7FW$Fö7VÖVçBÂ†æFÆU6V7F–öã„6†ævRÂ†æFÆU6V7F–öã„6÷”§6öâÀÐ¢†æFÆU6V7F–öã„7&VFTÆ–æ¶VEFö¶VâÂ†æFÆU6V7F–öã„FVÆWFRÂ†æFÆU6V7F–öã„F÷væÆöDG&gD&6·WÂ†æFÆU6V7F–öã„W‡÷'D§6öâÂ†æFÆU6V7F–öã„f–æÆ—¦RÂ†æFÆU6V7F–öã„–×÷'Df–ÆRÀÐ¢†æFÆU6V7F–öã„–×÷'EFW‡BÂ†æFÆU6V7F–öã…6fRÂ†æFÆU6V7F–öã…6fT6÷’Â†56V7F–öã„f—&W7F÷&U&VEFööÂÂ–×÷'E6V7F–öã„f–ÆRÂ–×÷'E6V7F–öã„§6öåFW‡BÀÐ¢—56V7F–öã„6†&7FW%&V6÷&DFFÂ—56V7F–öã…6fT6ö×ÆWFS¢—56V7F–öã…W'6—7FVæ6T6ö×ÆWFRÂ'6U6V7F–öã„–×÷'FVD6†&7FW"Â&W&U6V7F–öã„6†&7FW"ÀÐ¢6fU6V7F–öã„6†&7FW"Â6V7F–öã…6æ6†÷DW†—7G2Â7–æ56V7F–öã„FW&—fVEfÇVW2ÂW6U6V7F–öã„–×÷'FVD6†&7FW"ÀÐ¢fÆ–FFU6V7F–öã„f—&W7F÷&U&V6÷&BÂfÆ–FFU6V7F–öã„æõ&VÖ÷FT6öæfÆ–7@Ð¢ÒÒ7&VFT6†&7FW%W'6—7FVæ6R‡°Ð¢BÂ$”Ä•E•ôDTd”ä•D”ôå2Â$”Ä•E•õ44õ$UôÔUD„ôE2Â5D•dUõ%TÄU4UBÂDD•D”ôäÅô4åE$•ô4õTåEó#BÂDD•D”ôäÅô4åE$•ôU…T5DD”ôå5ó#BÀÐ¢DD•D”ôäÅô4åE$•ô”E5ó#BÂ%D•4åõDôôÅôõD”ôå2Â$4´u$õTäEõ44„TÔõdU%4”ôâÂ%T”ÄDU%õ5DU2Â%T”ÄDU%õ5DUô”äDU‚Â%T”ÅD”åô$4´u$õTäEó#EôU…T5DD”ôå2ÀÐ¢%T”ÅD”åô$4´u$õTäEô”E5ó#BÂ%T”ÅD”åõ5T4”U5ó#EôU…T5DD”ôå2Â%T”ÅD”åõ5T4”U5ô”E5ó#BÂ%T”ÅD”åõ5T%$4Uó#EôU…T5DD”ôå2Â2Â4„$5DU%ô%U5•ô5D”ôå2ÀÐ¢4„$5DU%õ4dUô%U5•ô5D”ôå2Â4„$5DU%õ44„TÔõdU%4”ôâÂ4Ä55õ44„TÔõdU%4”ôâÂ5U%$Tä5•ôDTäôÔ”äD”ôå2ÂD$µôTÄeô”ääDUõ5TÄÅ5ó#BÂDTdTÅEô$4´u$õTäEôUT•ÔTåEõ4´tU2ÀÐ¢DTdTÅEô$4´u$õTäEõDTÕÄDU2ÂDTdTÅEô4Ä54U2ÂDTdTÅEô4Ä55õ44„TÔõdU%4”ôâÂDTdTÅEô4Ä55õDTÕÄDU2ÂDTdTÅEôUT•ÔTåEô4DÄôrÂDTdTÅEôdTE2ÀÐ¢DTdTÅEôdTEô$”Ä•E•õ44õ$UôÔ„”ÕTÒÂDTdTÅEôd”t…D”äuõ5E”ÄUôTddT5E2ÂDTdTÅEô”ådô4D”ôåôDUD”Å2ÂDTdTÅEôÔäUUdU%ôDUD”Å2ÂDTdTÅEôÔUDÔt”5ôDUD”Å2ÂDTdTÅEõ5T4”U5õDTÕÄDU2ÀÐ¢DTdTÅEõ5TÄÅ2ÂDTdTÅEõ5T$4Ä54U2ÂE$eEôUDõ4dUôDT$õTä4UôÕ2ÂEt$eõDôôÅô4„ô”4U2ÂdTEô4„ô”4UõdÅTUõ$Td•‚ÂdTEôdTEU$UôõD”ôå2ÀÐ¢dTEõDôôÅôõD”ôå2ÂdTEõtTôåôõD”ôå2Âdõ$U5EôtäôÔUô”ääDUõ5TÄÅ5ó#BÂtÔ”äuõ4UEôõD”ôå2ÂtTäU$ÅõDôôÅôõD”ôå2ÂÕTÅD”4Ä55õ$U$UT•4•DU2ÀÐ¢ÕTÅD”4Ä55õ$ôd”4”Tä5•ôu$åE2ÂÕU4”4Åô”å5E%TÔTåEôõD”ôå2Âõ5Eô4ô$”Ä•E•õ4õU$4Uõ$Td•„U2Â$uôDTdTÅEô$4´u$õTäEõDTÕÄDU2Â$uôDTdTÅEõ5T4”U5õDTÕÄDU2Â4T5D”ôãôE$tôä$õ$åôä4U5E$”U2ÀÐ¢4T5D”ôãôTÔ$TDDTEõõ%E$•EôÔ…ô%•DU2Â4T5D”ôãõUÄôDTEõõ%E$•EôÔ…ô%•DU2Â4T5D”ôã%ô4Ä55ôdTEU$Uõ4dUô$”Ä•D”U2Â4T5D”ôã5õô”åEô%U•ô4õ5E2Â4T5D”ôãeõ5TÄÅõ$TdU$Tä4UôÄ”4U2Â4´”ÄÅôDTd”ä•D”ôå2ÀÐ¢5T4”U5õ44„TÔõdU%4”ôâÂ5$Eó#Eôd”t…DU%ô4•ôÄUdTÅ2Â5$Eó#EôeTÄÅô45DU%õ4ÄõE2Â5$Eó#Eõ5EôÔt”2Â5$Eó#Eõ$ôuTUô4•ôÄUdTÅ2Â5$Eó#Eõ4•¤Uô4%%•ôÕTÅD•Ä”U%2ÀÐ¢5$Eó#Eõ5DäD$Eô4•ôÄUdTÅ2Â5$Eõ5TÄÅô4õTåEó#BÂ5DäD$EôÄäuTtUôõD”ôå2ÂD”TdÄ”äuô”ääDUõ5TÄÅ5ó#BÂTä$Ôõ$TEôDTdTå4Uô4Ä55õ%TÄU2ÂrÀÐ¢t•¤$Eô4åE$•ô4„ô”4U5ó#BÂFD6VDæ÷&ÖÄ&–Æ—G”–æ7&V6RÂFD6†&7FW$ÆWfVÅFô6Æ72ÂFD7W'&Væ7”Ö2ÂFDÆVv7”–×÷'Ev&æ–ærÂFDÖ–w&F–öåv&æ–ærÀÐ¢FD×VÇF–6Æ746Æ72ÂFE6V7F–öã6¶–ÆÅ&öf–6–Væ6–W2ÂFE6V7F–öãD&6¶w&÷VæD7W'&Væ7’ÂFE6V7F–öãD&6¶w&÷VæDfVGW&RÂFE6V7F–öãT6FÆöt—FVÒÂFE6V7F–öãT7W7FöÔ—FVÒÀÐ¢FE6V7F–öãd7W7FöÔfVGW&RÂFE6V7F–öãd7W7FöÕ7VÆÂÂFE7V6–W5G&—BÂF§W7D×VÇF–6Æ746Æ74ÆWfVÂÂF§W7E6V7F–öã$6”&–Æ—G’ÂF§W7E6V7F–öã%7VÆÅ6Æ÷EW6vRÀÐ¢F§W7E6V7F–öãd†—DF–UW6vRÂF§W7E6VÆV7FVD6Æ75&W6÷W&6RÂF§W7E6VÆV7FVDfVE&W6÷W&6RÂÇ”6Æ75&öw&W76–öå&öf–6–Væ6–W2ÂÇ”6ö×F–&–Æ—G”Æ–6W2ÂÇ”7W7FöÕ7V6–W2ÀÐ¢Ç”–æ—F–Å&÷WFRÂÇ•6V7F–öãÖV6†æ–4&Æö6²ÂÇ•6V7F–öã7V6–W46†ö–6TÖV6†æ–72ÂÇ•6V7F–öã7V6–W46†ö–6W2ÂÇ•6V7F–öã7V6–W4ÖV6†æ–72ÂÇ•6V7F–öã$6Æ74FVfVÇG2ÀÐ¢Ç•6V7F–öã$7W7FöÔ6Æ72ÂÇ•6V7F–öã$7W7FöÕ7V&6Æ72ÂÇ•6V7F–öã5ö–çD'W”FVfVÇG2ÂÇ•6V7F–öã5&öÆÆVE66÷&W2ÂÇ•6V7F–öã566÷&W2ÂÇ•6V7F–öã57FæF&D'&’ÀÐ¢Ç•6V7F–öã57VvvW7FVD‡ÂÇ•6V7F–öãD&6¶w&÷VæD6†ö–6W2ÂÇ•6V7F–öãD&6¶w&÷VæE6¶vRÂÇ•6V7F–öãD7W7FöÔ&6¶w&÷VæBÂÇ•6V7F–öãE&öf–6–Væ7”Æ—7G2ÂÇ•6VÆV7FVD6Æ74fVGW&TÖV6†æ–72ÀÐ¢Ç•6VÆV7FVDfVDÖV6†æ–72ÂÇ•7F÷&VD6Æ756¶–ÆÅ&öf–6–Væ6–W2Â76W'D6†&7FW$×WFF–öä66W72Â76–vå6V7F–öã57FæF&E66÷&RÂVF—DÆVv7”–×÷'FVD6†&7FW"Â&6¶f–ÆÄ&6¶w&÷VæD7W'&Væ7•6÷W&6W2ÀÐ¢&Vv–ä6†&7FW$'W7”7F–öâÂ&Vv–ææW$æ÷FRÂ&Æö6´6†&7FW$'W7”7F–öâÂ&Æö6´×VÇF–6Æ74VF—BÂ&ö÷E6V7F–öã#v†Vå&VG’Â6Æ7VÆFT&–Æ—G”ÖöF–f–W"ÀÐ¢6Æ7VÆFT&–Æ—G”ÖöF–f–W'2Â6Æ7VÆFT&Ö÷$6Æ74÷F–öç2Â6Æ7VÆFT6†&7FW$†—DF–6RÂ6Æ7VÆFT6†&7FW$‡Â6Æ7VÆFT6†&7FW$–æ—F–F—fRÂ6Æ7VÆFT6†&7FW%76—fU66÷&W2ÀÐ¢6Æ7VÆFT6†&7FW%&öÆÆVD‡Â6Æ7VÆFT6†&7FW%6f–æuF‡&÷w2Â6Æ7VÆFT6†&7FW%6¶–ÆÄÖöF–f–W"Â6Æ7VÆFT6Æ75&öw&W76–öåF÷FÄÆWfVÂÂ6Æ7VÆFT6öçF–æW$6öçFVçEvV–v‡BÂ6Æ7VÆFTWV—VEvVöäGF6·2ÀÐ¢6Æ7VÆFT–çfVçF÷'•vV–v‡E7VÖÖ'’Â6Æ7VÆFU'VÆT6''––æt66—G’Â6Æ7VÆFU'VÆTf—†VDfW&vT‡Â6Æ7VÆFU'VÆTÖçVÄ‡Â6Æ7VÆFU'VÆU76—fU66÷&RÂ6Æ7VÆFU'VÆU&öÆÆVD‡ÀÐ¢6Æ7VÆFU'VÆU6f–æuF‡&÷tÖöF–f–W"Â6Æ7VÆFU'VÆU6¶–ÆÄÖöF–f–W"Â6Æ7VÆFU'VÆU7VÆÄGF6´&öçW2Â6Æ7VÆFU'VÆU7VÆÅ6fTF2Â6Æ7VÆFU6V7F–öã57VvvW7FVD‡Â6Æ7VÆFU6V7F–öãe7VÆÆ67F–æufÇVW2ÀÐ¢6Æ7VÆFU6VÆV7FVDfVDçVÖW&–4VffV7BÂ6Æ7VÆFU7&C#D×VÇF–6Æ757VÆÆ67F–ærÂ6Æ7VÆFUvVöäGF6²Â6†ævU6V7F–öã5ö–çD'W•66÷&RÂ6†ævU6V7F–öãUVçF—G’Â6†&7FW$7&VF÷$7F–öç2ÀÐ¢6†&7FW$7&VF÷$6†ævT†æFÆW'2Â6†&7FW$7&VF÷$–çWD†æFÆW'2Â6†&7FW$†46Æ72Â6†&7FW$Æ–'&'•&VæFW&W"Â6†&7FW%6†VWEf–WrÂ6†&7FW%7FW6ö×ÆWF–öä6†V6·2ÀÐ¢6†&7FW%7FW&VæFW&W'2Â6†ö÷6U6V7F–öã7V'&6RÂ6†ö÷6U6V7F–öã$6Æ72Â6†ö÷6U6V7F–öã%7V&6Æ72Â6†ö÷6U6V7F–öãD&6¶w&÷VæBÂ6†ö÷6U7V6–W4g&öÕFV×ÆFRÀÐ¢6†ö÷6U7F÷&VDG&gE&V6÷&BÂ6Æ×ÆWfVÂÂ6Æ×7FW–æFW‚Â6ÆVä'&’Â6ÆVä–×÷'E6÷W&6TÆ&VÂÂ6ÆVå7G&–ærÀÐ¢6ÆVçWGWÆ–6FTæöå&WVF&ÆTGfæ6VÖVçDfVG2Â6ÆVçW6V7F–öã&Wf–÷W5÷'G&—BÂ6ÆVçW6V7F–öã•W&ÖæVçDÆ—7FVæW'2Â6ÆVçW6V7F–öã#6†&7FW$7&VF÷"Â6ÆV%VæF–ætG&gEW'6—7FVæ6RÂ6ÆV%6V7F–öã÷'G&—BÀÐ¢6ÆV%6V7F–öã7V6–W4ÖV6†æ–72Â6ÆV%6V7F–öã%7V&6Æ72Â6ÆV%7F÷&VDG&gBÂ6ÆöæTFFÂ6öÆÆV7DÖÆf÷&ÖVE6÷W&6UfÇVW2Â6öÆÆV7E6V7F–öã$fVGW&W2ÀÐ¢6öÆÆV7E6V7F–öã$fVGW&W4f÷$6Æ74VçG'’Â6öæf—&ÔF—66&EVç6fVDG&gBÂ6öææV7DG&gEW'6—7FVæ6TÆ–fV7–6ÆRÂ6öææV7E÷7FFU&÷WF–ærÀÐ¢6öææV7E6V7F–öã•W&ÖæVçDÆ—7FVæW'2Â6öææV7Ev—¦&DWfVçG2Â6÷VçE6V7F–öãD&6¶w&÷VæE6÷W&6TÆ—7BÀÐ¢6÷VçE6V7F–öãE6¶–ÆÅ6÷W&6RÂ6÷VçE6V7F–öãEfÆ–D&6¶w&÷VæEFööÄ6†ö–6W2Â6÷VçE6V7F–öãEfÆ–E6¶–ÆÅ6÷W&6RÂ6÷VçEfÆ–D6Æ74VçG'•6¶–ÆÄ6†ö–6W2Â7&VFT&–Æ—G”ÖÂ7&VFT6†&7FW$Æ–'&'”6&BÀÐ¢7&VFT6†&7FW%–ÆöBÂ7&VFT6†&7FW%6†VWEf–WrÂ7&VFT6Æ74VçG'”–BÂ7&VFT6Æ75&öw&W76–öäVçG'’Â7&VFTFVfVÇD6Æ75FV×ÆFRÂ7&VFTG&gE7F÷&vU&V6÷&BÀÐ¢7&VFTV×G”6†&7FW"Â7&VFTæ÷&ÖÄ&–Æ—G”666÷&TÖÂ7&VFU6V7F–öã÷'G&—Dg&öÔf–ÆRÂ7&VFU6V7F–öã4‡&öÆÅ&V6÷&BÂ7&VFU7&D6Æ75FV×ÆFRÂ7&VFU7&DfVGW&RÀÐ¢7&VFU7&DfVGW&TÆWfVÇ2Â7&VFU7&E7V&6Æ72Â7&VF÷%7FFRÂFV'Vu6V7F–öã$×VÇF–6Æ74FBÂFV6öFTfVD6†ö–6UfÇVRÂFW2ÀÐ¢FW&—fT&–Æ—G”&6Tg&öÔf–æÅ66÷&W2ÂF—66öææV7DG&gEW'6—7FVæ6TÆ–fV7–6ÆRÂF—66öææV7E6V7F–öã#&÷WF–ærÂF—66öææV7Ev—¦&DWfVçG2ÂG&gEW'6—7FVæ6U'VçF–ÖRÂGWÆ–6FT6†&7FW$g&öÔÆ–'&'’ÀÐ¢GWÆ–6FT–çFôG&gBÂVæ6öFTfVD6†ö–6UfÇVRÂVæD6†&7FW$'W7”7F–öâÂVæf÷&6T6Æ75&öw&W76–öäÆWfVÄ6ÂVç&–6„'V–ÇF–ä&6¶w&÷VæEFV×ÆFRÂVç&–6„'V–ÇF–å7V6–W5FV×ÆFRÀÐ¢Vç7W&T&–Æ—G”&öçW56÷W&6W2ÂVç7W&T6Æ75&öw&W76–öäVçG'”FFÂVç7W&TWV—ÖVçD7W'&Væ7•6÷W&6W2ÂVç7W&U&öf–6–Væ7•6÷W&6W2ÂVç7W&Uv—¦&E6†VÆÂÂVç7W&Uv—¦&E7G–ÆW2ÀÐ¢W66T‡FÖÂÂWfÇVFU6V7F–öã$6Æ74ÆWfVÄf÷&×VÆÂWfÇVFU6V7F–öã$6Æ75&W6÷W&6TÖ†–×VÒÂW‡æE6V7F–öãEFööÄ6†ö–6RÂf–ÇFW%&WVFVDfVD6†ö–6T÷F–öç2Âf–æD66†VD6†&7FW"ÀÐ¢f–æD6Æ74VçG'”f÷$ÆWfVÄ÷&FW$¶W’Âf–æDFVfVÇD6Æ74FVf–æ—F–öâÂf–æD‡&öÆÅ&u&V6÷&Df÷$ÆWfVÂÂf–æE6V7F–öã7F–öäVÆVÖVçBÂf–æE6V7F–öã$7F–öäVÆVÖVçBÂf–æE6V7F–öã47F–öäVÆVÖVçBÀÐ¢f–æE6V7F–öãD7F–öäVÆVÖVçBÂf–æE6V7F–öãT7F–öäVÆVÖVçBÂf–æE6V7F–öãd7F–öäVÆVÖVçBÂfÇW6…VæF–ætG&gEW'6—7FVæ6RÂf÷&ÖD6Æ74VçG'”†—DF–RÂf÷&ÖD6Æ74VçG'•&öf–6–Væ7•7VÖÖ'’ÀÐ¢f÷&ÖDFVfVÇE7VÆÄÆWfVÄÆ&VÂÂf÷&ÖD×VÇF–6Æ75&W&WV—6—FTf–ÇW&RÂf÷&ÖD×VÇF–6Æ75&WV—&VÖVçD—FVÒÂf÷&ÖD×VÇF–6Æ757F÷&VD6†ö–6T¶W’Âf÷&ÖD×VÇF–6Æ757F÷&VD6†ö–6UfÇVRÂf÷&ÖE6V7F–öã÷'G&—D'—FW2ÀÐ¢f÷&ÖE6V7F–öã$6Æ746†ö–6UfÇVW2Âf÷&ÖE6V7F–öã$fVDVffV7BÂf÷&ÖE6V7F–öã$Æ—7BÂf÷&ÖE6V7F–öã%&V6†&vRÂf÷&ÖE6V7F–öã4‡&öÆÇ2Âf÷&ÖE6V7F–öãD7W'&Væ7•7VÖÖ'’ÀÐ¢f÷&ÖE6V7F–öãDÆ—7BÂf÷&ÖE6V7F–öãe&öw&W76–öäÆ&VÂÂf÷&ÖE6V7F–öãe7VÆÄ6ö×öæVçG2Âf÷&ÖE6V7F–öãe7VÆÅ&W6öÇWF–öâÂf÷&ÖE6V7F–öãe7VÆÅ66Æ–ærÂf÷&ÖE6V7F–öãt6Æ74VçG'”Æ&VÂÀÐ¢f÷&ÖE6V7F–öãt6Æ74ÆWfVÅ7VÖÖ'’Âf÷&ÖE6V7F–öãtÖöF–f–W"Âf÷&ÖE6VÆV7FVD6Æ74ÖV6†æ–4VffV7BÂf÷&ÖE6–væVDçVÖ&W"Âg&–VæFÇ•6W'f–6TW'&÷"ÂvWD&–Æ—G”&öçW5F÷FÇ4g&öÕ6÷W&6W2ÀÐ¢vWD&–Æ—G”FVf–æ—F–öâÂvWD&–Æ—G•66÷&RÂvWDÆÄ6Æ75FV×ÆFW2ÂvWDÆÅ6V7F–öãD&6¶w&÷VæG2ÂvWDÆÅ7V6–W5FV×ÆFW2ÂvWD&6¶w&÷VæE6÷W&6TÆ&VÂÀÐ¢vWD'&÷w6W%7F÷&vRÂvWD6†&7FW$'W7”Æ&VÂÂvWD6†&7FW$6Æ74VçG&–W2ÂvWD6†&7FW$ÆWfVÄ†—DF–U&V6÷&G2ÂvWD6†&7FW$Æ–'&'”6Æ74æÖRÂvWD6†&7FW$Æ–'&'”F—7Æ”æÖRÀÐ¢vWD6†&7FW$Æ–'&'”–ÖvUW&ÂÂvWD6†&7FW$Æ–'&'”ÆWfVÂÂvWD6†&7FW$Æ–'&'•7V6–W4æÖRÂvWD6†&7FW%&öf–6–Væ7”&öçW2ÂvWD6†&7FW%6¶–ÆÄVçG'’ÂvWD6†&7FW%6æ6†÷BÀÐ¢vWD6†&7FW%7VÆÆ67F–æt–æfòÂvWD6Æ746”ÆWfVÇ2ÂvWD6Æ74VçG'”D–æFW‚ÂvWD6Æ74VçG'”ÆWfVÂÂvWD6Æ74VçG'•6¶–ÆÄ6†ö–6T6öæf–rÂvWD6Æ74VçG'•7F÷&VE6¶–ÆÄ–G2ÀÐ¢vWD6Æ74VçG'•7F÷&VEFööÄ6†ö–6W2ÂvWD6Æ74VçG'•7V&6Æ75FV×ÆFRÂvWD6Æ74VçG'•FööÄ6†ö–6T6öæf–rÂvWD6Æ74VçG'•FööÄ6†ö–6T÷F–öç2ÂvWD6Æ74–æFW„f÷$ÆWfVÅ&V6÷&BÂvWD6Æ74ÆWfVÄ÷&FW$VçG'”¶W’ÀÐ¢vWD6Æ75&öw&W76–öäVçG&–W2ÂvWD6Æ75&öw&W76–öäVçG'”¶W’ÂvWD6Æ75&öw&W76–öåVæF–æt6†ö–6Uv&æ–æw2ÂvWD6Æ756÷W&6TÆ&VÂÂvWD6öçF–æW$6öçFVçG2ÂvWD6öçF–æW%7VÖÖ&–W2ÀÐ¢vWD7W'&Væ7•6÷W&6UF÷FÇ2ÂvWDFVfVÇD6Æ74fVGW&W5F‡&÷Vv„ÆWfVÂÂvWDFVfVÇDÆWfVÅW6Æ74–æFW‚ÂvWDG&gE7F÷&vT¶W’ÂvWDG&gE7F÷&vUF&vWG2ÂvWDW†7D'V–ÆFW%7FW'”–BÀÐ¢vWDfVD&–Æ—G”VffV7DÖ†–×VÒÂvWDfVE&W&WV—6—FTÆ&VÂÂvWDfVE&W&WV—6—FU&W7VÇBÂvWDfVE7VÆÆ67F–æufÆ–FF–öåv&æ–æw2ÂvWDvVæW&–5&öf–6–Væ7”&öçW2ÂvWD†—DF–U6—¦RÀÐ¢vWD‡&öÆÅ&u&V6÷&G2ÂvWD–çfVçF÷'”—FVÔ¶æ÷våvV–v‡BÂvWDÆFW7DÆWfVÅW6öçFW‡BÂvWDÆVv7“#DÖWFFFÂvWDÖçVÄ7W'&Væ7”&Ææ6RÂvWDÖçVÅ&öf–6–Væ7”Æ—7BÀÐ¢vWD×VÇF–6Æ746Æ74–BÂvWD×VÇF–6Æ75VæF–æu6¶–ÆÄ6†ö–6Uv&æ–æw2ÂvWD×VÇF–6Æ75VæF–æuFööÄ6†ö–6Uv&æ–æw2ÂvWD×VÇF–6Æ75&W&WV—6—FU&WV—&VÖVçG2ÂvWD×VÇF–6Æ75&W&WV—6—FU&W7VÇDf÷$6Æ72ÂvWD×VÇF–6Æ75&W&WV—6—FU&W7VÇG2ÀÐ¢vWD×VÇF–6Æ75&öf–6–Væ7•'VÆRÂvWD×VÇF–6Æ75&WV—&VÖVçDÆ&VÂÂvWD×VÇF–6Æ757VÖÖ'”VçG&–W2ÂvWDæ÷&ÖÄ&–Æ—G•66÷&Tf÷$6ÂvWEVæF–æt6Æ74fVGW&T6†ö–6Uv&æ–æw2ÂvWEW$6Æ757VÆÅ6VÆV7F–öå7VÖÖ'’ÀÐ¢vWEW'6—7FVçDG&gE7F÷&vT¶W’ÂvWE&W&VE7VÆÄÆ–Ö—BÂvWE&–Ö'”6Æ74VçG'’ÂvWE&öw&W76–öåfÇVT'”ÆWfVÂÂvWE&ööÔ6öFRÂvWE&÷WFTg&öÕW&ÂÀÐ¢vWE6fT&6¶w&÷VæDæÖRÂvWE6fT6†&7FW$æÖRÂvWE6fT6Æ74æÖRÂvWE6fU7V6–W4æÖRÂvWE6fU7V&6Æ74æÖRÂvWE6V7F–öã6†ö–6U6÷W&6RÀÐ¢vWE6V7F–öãG&vöæ&÷&äæ6W7G'’ÂvWE6V7F–öã†ÆdVÆd&–Æ—G”6†ö–6W2ÂvWE6V7F–öãÆæwVvT6†ö–6W2ÂvWE6V7F–öã÷'G&—BÂvWE6V7F–öã6VÆV7FVE7V6–W5FV×ÆFRÂvWE6V7F–öã6VÆV7FVE7V'&6RÀÐ¢vWE6V7F–öã6¶–ÆÄ6†ö–6W2ÂvWE6V7F–öã$'F–f–6W$–ægW6–öä6öçFW‡BÂvWE6V7F–öã$'F–f–6W$–ægW6–öå7FFRÂvWE6V7F–öã$6”6†ö–6U7FFRÂvWE6V7F–öã$6”fVGW&RÂvWE6V7F–öã$6æöæ–6Å&W6÷W&6T–BÀÐ¢vWE6V7F–öã$6Æ74fVGW&U6fTF2ÂvWE6V7F–öã$6Æ74fVGW&W5F‡&÷Vv„ÆWfVÂÂvWE6V7F–öã$7W7FöÔ6Æ756¶–ÆÄæÖW2ÂvWE6V7F–öã$F—f–æU6Ö—FU6Æ÷D÷F–öç2ÂvWE6V7F–öã$fVD6†ö–6TÆ–Ö—BÂvWE6V7F–öã$fVD6†ö–6T÷F–öç2ÀÐ¢vWE6V7F–öã$fVGW&T6†ö–6T¶W’ÂvWE6V7F–öã$fVGW&T6†ö–6T÷F–öå&V6÷&G2ÂvWE6V7F–öã$fVGW&T6†ö–6T÷F–öç2ÂvWE6V7F–öã$fVGW&T6†ö÷6T6÷VçBÂvWE6V7F–öã$fVGW&TÖV6†æ–4Æ–æW2ÂvWE6V7F–öã$fVGW&U7F÷&VD6†ö–6W2ÀÐ¢vWE6V7F–öã$gWGW&T6Æ74fVGW&W2ÂvWE6V7F–öã$–ægW6–öåF&vWD÷F–öç2ÂvWE6V7F–öã$ÆWfVÄFFÂvWE6V7F–öã$×VÇF–6Æ74FE7FGW2ÂvWE6V7F–öã%&–Ö'”6Æ72ÂvWE6V7F–öã%6¶–ÆÅ–6¶W$6†ö–6W2ÀÐ¢vWE6V7F–öã%7VÆÅ6Æ÷EW6vU7FFRÂvWE6V7F–öã%7V&6Æ75FV×ÆFW2ÂvWE6V7F–öã%VæÆö6¶VD6•6Æ÷BÂvWE6V7F–öã4&–Æ—G”&öçW2ÂvWE6V7F–öã4&–Æ—G”æÖRÂvWE6V7F–öã4&–Æ—G•66÷&RÀÐ¢vWE6V7F–öã4&6T&–Æ—G•66÷&RÂvWE6V7F–öã4†—DF–U6—¦RÂvWE6V7F–öã4‡&öÆÅ7FFRÂvWE6V7F–öã5ö–çD'W•7VçBÂvWE6V7F–öãDÆÄW†7EFööÄ÷F–öç2ÂvWE6V7F–öãD&6¶w&÷VæD6†ö–6TÆ—7BÀÐ¢vWE6V7F–öãD&6¶w&÷VæD7W'&Væ7”w&çBÂvWE6V7F–öãD&6¶w&÷VæDÆæwVvT÷F–öç2ÂvWE6V7F–öãD&6¶w&÷VæE6¶vW2ÂvWE6V7F–öãD&6¶w&÷VæE&VÖ÷fÅ7VÖÖ'’ÂvWE6V7F–öãD&6¶w&÷VæE6÷W&6UfÇVW2ÂvWE6V7F–öãD&6¶w&÷VæEFööÄ÷F–öç2ÀÐ¢vWE6V7F–öãD&6¶w&÷VæEFööÄ÷F–öç4f÷$–æFW‚ÂvWE6V7F–öãE6¶–ÆÄ6†ö–6TÆ—7BÂvWE6V7F–öãE6¶–ÆÄVçG'’ÂvWE6V7F–öãE6¶–ÆÄÖöF–f–W"ÂvWE6V7F–öãE6¶–ÆÅ6÷W&6TÆ&VÂÂvWE6V7F–öãT7F–öä–æFW‚ÀÐ¢vWE6V7F–öãTGGVæVD—FVÔ6÷VçBÂvWE6V7F–öãT6FÆörÂvWE6V7F–öãT–çfVçF÷'’ÂvWE6V7F–öãT–çfVçF÷'”6÷VçBÂvWE6V7F–öãUF÷FÅvV–v‡BÂvWE6V7F–öãUVæ¶æ÷våvV–v‡D6÷VçBÀÐ¢vWE6V7F–öãd6Æ756÷W&6U7F÷&RÂvWE6V7F–öãd7W7FöÔfVGW&W2ÂvWE6V7F–öãd7W7FöÕ7VÆÇ2ÂvWE6V7F–öãdVÆ–v–&ÆU7VÆÆ67FW'2ÂvWE6V7F–öãdVçG'”f÷%6÷W&6RÂvWE6V7F–öãdW‡æFVE7VÆÄw&çBÀÐ¢vWE6V7F–öãdW‡æFVE7VÆÄw&çG2ÂvWE6V7F–öãd†—DF–T¶W’ÂvWE6V7F–öãd–ææFU7VÆÇ2ÂvWE6V7F–öãd¶æ÷väÆ–Ö—Ev&æ–ærÂvWE6V7F–öãd¶æ÷vå7VÆÄ–G2ÂvWE6V7F–öãd×—7F–4&6çVÔÆWfVÇ2ÀÐ¢vWE6V7F–öãe&W&F–öäÖöFRÂvWE6V7F–öãe&W&VDÆ–Ö—Ev&æ–ærÂvWE6V7F–öãe&W&VE7VÆÄ–G2ÂvWE6V7F–öãe6VÆV7FVDfVG2ÂvWE6V7F–öãe6÷W&6T¶W’ÂvWE6V7F–öãe6÷W&6U7FFRÀÐ¢vWE6V7F–öãe7VÆÄ'”–BÂvWE6V7F–öãe7VÆÅ&VfW&Væ6T–BÂvWE6V7F–öãt&–Æ—G”æÖRÂvWE6V7F–öãt6''––æt66—G’ÂvWE6V7F–öãt6†&7FW%6†VWEf–WrÂvWE6V7F–öãt6Æ75&öw&W76–öäVçG&–W2ÀÐ¢vWE6V7F–öãt6ö×ÆWFVE7FW–G2ÂvWE6V7F–öãtfVGW&T6÷VçBÂvWE6V7F–öãtf–æÆ—¦F–öåfÆ–FF–öâÂvWE6V7F–öãt–æ—F–F—fRÂvWE6V7F–öãt–çfVçF÷'•vV–v‡BÂvWE6V7F–öãtÖ–w&F–öåv&æ–æw2ÀÐ¢vWE6V7F–öãu76—fUW&6WF–öâÂvWE6V7F–öãu&öf–6–Væ7”&öçW2ÂvWE6V7F–öãu6¶–ÆÄVçG'’ÂvWE6V7F–öãu6¶–ÆÄÖöF–f–W"ÂvWE6V7F–öãu7VÆÄ6÷VçBÂvWE6V7F–öãuv&æ–æw2ÀÐ¢vWE6V7F–öã„×WFF–öä–FVçF—G’ÂvWE6V7F–öã”6öÆÆV7F–öäæÖRÂvWE6VÆV7FVD6Æ75FV×ÆFRÂvWE6VÆV7FVDFVfVÇDfVD–ç7Fæ6W2ÂvWE6VÆV7FVE6V7F–öã%7V&6Æ72ÀÐ¢vWE6VÆV7FVE6V7F–öãD&6¶w&÷VæBÂvWE6¶–ÆÄFVf–æ—F–öä'”–D÷$æÖRÂvWE7V6–W4‡&öçW2ÂvWE7V6–W56÷W&6TÆ&VÂÂvWE7VÆÅ6VÆV7F–öäÆ–Ö—G2ÂvWE7VÆÅ6Æ÷D67F–æt÷F–öç2ÀÐ¢vWE7VÆÅ6÷W&6T6öçFW‡G2ÂvWE7VÆÅ6÷W&6T–BÂvWE7VÆÅ6÷W&6Uv&æ–ærÂvWE7VÆÆ67F–æt6Æ74÷F–öç2ÂvWE7VÆÆ67F–ætVçG'”f÷%7VÆÂÂvWE7VÆÆ67F–ætfö7W46Æ74–G2ÀÐ¢vWE7VÆÆ67F–ætfö7W57VÖÖ'’ÂvWE7VÆÆ67F–æu7VÖÖ'’ÂvWE7&C#E7DÖv–2ÂvWE7&C#E7VÆÅ6Æ÷G2ÂvWE7F'F–æt6Æ74VçG'’ÂvWE7FW'”–BÀÐ¢vWE7FW–æFW‚ÂvWE7F÷&VE6÷W&6W2ÂvWE7V'&6U6÷W&6TÆ&VÂÂvWEVæÆö6¶VDfVD6†ö–6U6Æ÷G2ÂvWEfÆ–D6Æ74VçG'•6¶–ÆÄ–G2ÂvWEfÆ–D6Æ74VçG'•FööÄ6†ö–6W2ÀÐ¢vWEfÆ–FF–öåv&æ–æw2Â†æFÆTFE7V6–W5G&—D7F–öâÂ†æFÆTÇ•7V6–W46†ö–6W47F–öâÂ†æFÆT'&÷w6W%&÷WFT6†ævRÂ†æFÆT6†ö÷6U7V6–W47F–öâÂ†æFÆT6†ö÷6U7V'&6T7F–öâÀÐ¢†æFÆTG&gD&Vf÷&UVæÆöBÂ†æFÆU&VÖ÷fU7V6–W5G&—D7F–öâÂ†æFÆU6V7F–öã÷'G&—D6†ævRÂ†æFÆU6V7F–öã&VÖ÷fU÷'G&—BÂ†æFÆU6V7F–öã6WE÷'G&—EW&ÂÂ†æFÆU6V7F–öã$FD6†&7FW$ÆWfVÂÀÐ¢†æFÆU6V7F–öã$FD×VÇF–6Æ746Æ72Â†æFÆU6V7F–öã$F§W7D×VÇF–6Æ74ÆWfVÂÂ†æFÆU6V7F–öã$'F–f–6W$–ægW6–öâÂ†æFÆU6V7F–öã$'F–f–6W$–ægW6–öåF&vWD6†ævRÂ†æFÆU6V7F–öã$6”7F–öâÂ†æFÆU6V7F–öã$6”6†ævRÀÐ¢†æFÆU6V7F–öã$6†ö÷6T6”fVBÂ†æFÆU6V7F–öã$6†ö÷6T6Æ72Â†æFÆU6V7F–öã$6†ö÷6U7V&6Æ72Â†æFÆU6V7F–öã$6Æ74fVGW&T6†ö–6RÂ†æFÆU6V7F–öã$6Æ74fVGW&U6VÆV7D6†ævRÂ†æFÆU6V7F–öã$6ÆV%7V&6Æ72ÀÐ¢†æFÆU6V7F–öã$7W7FöÔ6Æ72Â†æFÆU6V7F–öã$7W7FöÔ6Æ756¶–ÆÅ–6¶W"Â†æFÆU6V7F–öã$7W7FöÕ7V&6Æ72Â†æFÆU6V7F–öã$fVE6V&6‚Â†æFÆU6V7F–öã$Ö÷fT6†&7FW$ÆWfVÄ÷&FW"Â†æFÆU6V7F–öã$Ö÷fT×VÇF–6Æ746Æ72ÀÐ¢†æFÆU6V7F–öã$×VÇF–6Æ746†ævRÂ†æFÆU6V7F–öã%&VÖ÷fTÆ7D6†&7FW$ÆWfVÂÂ†æFÆU6V7F–öã%&VÖ÷fT×VÇF–6Æ746Æ72Â†æFÆU6V7F–öã%FövvÆT×VÇF–6Æ756¶–ÆÂÂ†æFÆU6V7F–öã%FövvÆT×VÇF–6Æ75FööÂÂ†æFÆU6V7F–öã4Ç•&öÆÇ2ÀÐ¢†æFÆU6V7F–öã46Æ7VÆFT‡Â†æFÆU6V7F–öã46†ævRÂ†æFÆU6V7F–öã5ö–çD'W’Â†æFÆU6V7F–öã5&Vg&W6„ÆWfVÂÂ†æFÆU6V7F–öã5&W6WEö–çD'W’Â†æFÆU6V7F–öã5&W6WE7FæF&D'&’ÀÐ¢†æFÆU6V7F–öã5&öÆÅ66÷&W2Â†æFÆU6V7F–öãDFDfVGW&RÂ†æFÆU6V7F–öãDÇ”&6¶w&÷VæD6†ö–6W2Â†æFÆU6V7F–öãDÇ”&6¶w&÷VæE6¶vRÂ†æFÆU6V7F–öãDÇ”Æ—7G2Â†æFÆU6V7F–öãD6†ö÷6T&6¶w&÷VæBÀÐ¢†æFÆU6V7F–öãD7W7FöÔ&6¶w&÷VæBÂ†æFÆU6V7F–öãDöÆD&6¶w&÷VæDWV—ÖVçBÂ†æFÆU6V7F–öãE&VÖ÷fTfVGW&RÂ†æFÆU6V7F–öãE6¶—&6¶w&÷VæBÂ†æFÆU6V7F–öãEFövvÆTW‡W'F—6RÂ†æFÆU6V7F–öãEFövvÆU6¶–ÆÂÀÐ¢†æFÆU6V7F–öãTFD6FÆöt—FVÒÂ†æFÆU6V7F–öãTFD7W7FöÔ—FVÒÂ†æFÆU6V7F–öãT6†ævRÂ†æFÆU6V7F–öãT6†ævUVçF—G’Â†æFÆU6V7F–öãT6Æ÷6T6öçF–æW"Â†æFÆU6V7F–öãTÖ÷fT—FVÔ÷WBÀÐ¢†æFÆU6V7F–öãT÷Vä6öçF–æW"Â†æFÆU6V7F–öãU&VÖ÷fT—FVÒÂ†æFÆU6V7F–öãU&W6öÇfT6öçF–æW%&VÖ÷fÂÂ†æFÆU6V7F–öãU6¶—WV—ÖVçBÂ†æFÆU6V7F–öãUFövvÆT6öçF–æVD—FV×2Â†æFÆU6V7F–öãUFövvÆU7FFRÀÐ¢†æFÆU6V7F–öãdFDfVGW&RÂ†æFÆU6V7F–öãdFE7VÆÂÂ†æFÆU6V7F–öãd6Æ7VÆFU7VÆÆ67F–ærÂ†æFÆU6V7F–öãdFVfVÇE7VÆÅ6V&6‚Â†æFÆU6V7F–öãe&VÖ÷fTfVGW&RÂ†æFÆU6V7F–öãe7VÆÄ7F–öâÀÐ¢†æFÆU6V7F–öãe7VÆÅ6÷W&6T6†ævRÂ†æFÆU6V7F–öãeFövvÆTfVBÂ†æFÆU6V7F–öãtF§W7D6Æ75&W6÷W&6RÂ†æFÆU6V7F–öãtF§W7DF—f–æU6Ö—FU6Æ÷BÂ†æFÆU6V7F–öãtF§W7DfVE&W6÷W&6RÂ†æFÆU6V7F–öãt÷Vä6†&7FW%6†VWBÀÐ¢†æFÆU6V7F–öãu&Vg&W6…&Wf–WrÂ†æFÆU6V7F–öãuFövvÆU&vU7FFRÂ†æFÆUW6T7W7FöÕ7V6–W47F–öâÂ†æFÆUv—¦&D6†ævRÂ†æFÆUv—¦&D6Æ–6²Â†æFÆUv—¦&D–×÷'BÀÐ¢†æFÆUv—¦&D–çWBÂ†4&–Æ—G”ÖfÇVW2Â†47W'&Væ7•fÇVRÂ†4f—&W7F÷&UFööÇ2Â†4ÖÆf÷&ÖVE6÷W&6UfÇVRÂ†56V7F–öã÷'G&—EWÆöD†öö²ÀÐ¢†56V7F–öãD&6¶w&÷VæD7W'&Væ7’Â‡&öÆÅ&t†476ö6–F–öâÂ‡&öÆÅ&tÖF6†W4ÆWfVÂÂ—47F—fU'VÆW6WDVçG'’Â—46”÷$fVD6†ö–6TfVGW&RÂ—46†&7FW$'W7”7F–öâÀÐ¢—46†&7FW$7&VF÷$'W7’Â—46†&7FW$7&VF÷%&÷WFRÂ—46†&7FW$æöå7VÆÆ67FW"Â—4G&gE7F÷&vUV÷FW'&÷"Â—4×VÇF–6Æ74G&gBÂ—4×VÇF–6Æ75&WV—&VÖVçDÖWBÀÐ¢—5Æ–äö&¦V7BÂ—56f–æuF‡&÷u&öf–6–VçBÂ—56V7F–öã&–Æ—G”6†ö–6UfÆ–BÂ—56V7F–öãÆæwVvT6†ö–6UfÆ–BÂ—56V7F–öã÷'G&—Df–ÆRÂ—56V7F–öã÷'G&—EW&ÄÆÆ÷vVBÀÐ¢—56V7F–öã6¶–ÆÄ6†ö–6UfÆ–BÂ—56V7F–öãd×—7F–4&6çVÕ7VÆÂÂ—56V7F–öãe7VÆÄ¶æ÷vâÂ—56V7F–öãe7VÆÅ&W&VBÂ—56V7F–öãt&–Æ—F–W46ö×ÆWFRÂ—56V7F–öãt&6¶w&÷VæD6ö×ÆWFRÀÐ¢—56V7F–öãt&6–746ö×ÆWFRÂ—56V7F–öãt6Æ746ö×ÆWFRÂ—56V7F–öãtWV—ÖVçD6ö×ÆWFRÂ—56V7F–öãtÆWfVÄ6ö×ÆWFRÂ—56V7F–öãt÷F–öæÄf–æÆ—¦F–öåv&æ–ærÂ—56V7F–öãu&Wf–Wt6ö×ÆWFRÀÐ¢—56V7F–öãu6¶–ÆÇ46ö×ÆWFRÂ—56V7F–öãu7V6–W46ö×ÆWFRÂ—56V7F–öãu7VÆÇ46ö×ÆWFRÂ—56V7F–öãu7V&6Æ746ö×ÆWFRÂ—57F'F–æt6Æ74VçG'’Â—57FW6ö×ÆWFRÀÐ¢—5vVöå&öf–6–VçBÂÖ¶U6fTf–ÆTæÖRÂÖ¶U6fT–BÂÖ&´6†&7FW$'V–ÆFW$4G&gBÂÖ&´G&gD6†ævVBÂÖ–w&FT6Æ74VçG'”Gfæ6VÖVçDFFÀÐ¢Ö–w&FU6V7F–öãdÆVv7•7VÆÅ6VÆV7F–öç2ÂÖ÷fT6†&7FW$ÆWfVÄ÷&FW"ÂÖ÷fT×VÇF–6Æ746Æ72ÂÖ÷fU6V7F–öãT—FVÕFô6öçF–æW"Âæf–vFT'•7FWöfg6WBÂæf–vFUFôÆ–'&'’ÀÐ¢æf–vFUFõ7FWÂæ÷&ÖÆ—¦T&–Æ—G”ÖÂæ÷&ÖÆ—¦TGfæ6VÖVçD6†ö–6W2Âæ÷&ÖÆ—¦T6†&7FW"Âæ÷&ÖÆ—¦T6†&7FW$–ÖvUfÇVRÂæ÷&ÖÆ—¦T6Æ746†ö–6TÖÀÐ¢æ÷&ÖÆ—¦T6Æ74VçG'”†—DF–RÂæ÷&ÖÆ—¦T6Æ74ÆWfVÄ÷&FW"Âæ÷&ÖÆ—¦T6Æ75FV×ÆFRÂæ÷&ÖÆ—¦T7W'&Væ7”ÖÂæ÷&ÖÆ—¦T7W'&Væ7•6÷W&6TÖÂæ÷&ÖÆ—¦TfVD6†ö–6U6VÆV7F–öç2ÀÐ¢æ÷&ÖÆ—¦TfVD–G2Âæ÷&ÖÆ—¦T‡6Æ7VÆF–öâÂæ÷&ÖÆ—¦T‡&öÆÅ&V6÷&G4f÷$6†&7FW"Âæ÷&ÖÆ—¦T–×÷'E6÷W&6TÆ—7BÂæ÷&ÖÆ—¦U6V7F–öã%7V&6Æ72Âæ÷&ÖÆ—¦U6V7F–öãD&6¶w&÷VæBÀÐ¢æ÷&ÖÆ—¦U6V7F–öãT—FVÒÂæ÷&ÖÆ—¦U6V7F–öãdfVGW&RÂæ÷&ÖÆ—¦U6V7F–öãe7VÆÂÂæ÷&ÖÆ—¦U6V7F–öã”&6¶w&÷VæE&V6÷&BÂæ÷&ÖÆ—¦U6V7F–öã”6†&7FW%&V6÷&BÂæ÷&ÖÆ—¦U6V7F–öã”6Æ75&V6÷&BÀÐ¢æ÷&ÖÆ—¦U6V7F–öã•7V6–W5&V6÷&BÂ÷Vä6†&7FW$g&öÔÆ–'&'’Â'6TfVD6†ö–6U6VÆV7F–öç2Â'6U6V7F–öã$Æ—7BÂ'6U6V7F–öã4‡&öÆÇ2Â'6U6V7F–öãDÆ—7BÀÐ¢'6U6V7F–öãT—FVÔVF—EfÇVRÂW&f÷&Õ6V7F–öãe&W7BÂW'6—7DG&gEFõ6W76–öâÂ'VæT&æFöæVD6Æ74fVGW&T6†ö–6W2Â'VæU&VÖ÷fVD6Æ757VÆÅ6÷W&6W2Â&VDG&gE7F÷&vU&V6÷&BÀÐ¢&VE6V7F–öã÷'G&—Df–ÆT4FFW&ÂÂ&V6Æ7VÆFT&–Æ—G•F÷FÇ2Â&V6Æ7VÆFT6Æ75F÷FÄÆWfVÂÂ&V6÷&E&tWV—ÖVçDÖ–w&F–öåv&æ–æw2Â&Vg&W6„'V–ÆFW$6‡&öÖRÀÐ¢&Vg&W6„6Æ75&öw&W76–öäFW&—fVEfÇVW2Â&Vg&W6„VÆVÖVçG2Â&Vg&W6„ÆöFVD6Æ74FW&—fVEfÇVW2Â&Vg&W6…6V7F–öã4&–Æ—G•7VÖÖ'’Â&Vg&W6…6V7F–öã4ÆWfVÅ&öw&W76–öâÂ&Vg&W6…6V7F–öã#6†&7FW$7&VF÷"ÀÐ¢&Vg&W6…6VÆV7FVD6Æ74fVGW&W2Â&Vg&W6…v—¦&DVÆVÖVçG2Â&Vv—7FW$6†&7FW$7&VF÷$7F–öâÂ&Vv—7FW$6†&7FW$7&VF÷$6†ævT†æFÆW"Â&Vv—7FW$6†&7FW$7&VF÷$–çWD†æFÆW"Â&Vv—7FW$6†&7FW$Æ–'&'•&VæFW&W"ÀÐ¢&Vv—7FW$6†&7FW%7FW6ö×ÆWF–öâÂ&Vv—7FW$6†&7FW%7FW&VæFW&W"Â&VÖ÷fT&–Æ—G”&öçW56÷W&6W4'•&Vf—‚Â&VÖ÷fT6öçF–æW$æD6öçFVçG2Â&VÖ÷fT6öçF–æW%&W6W'fT6öçFVçG2Â&VÖ÷fT–ææFU7VÆÇ4'•6÷W&6U&Vf—†W2ÀÐ¢&VÖ÷fTÆ7D6†&7FW$ÆWfVÂÂ&VÖ÷fTÆ—7E&öf–6–Væ7•6÷W&6RÂ&VÖ÷fTÆ—7E&öf–6–Væ7•6÷W&6W4'•&Vf—‚Â&VÖ÷fT×VÇF–6Æ746Æ72Â&VÖ÷fU6V7F–öã÷'G&—BÂ&VÖ÷fU6V7F–öã$6”fVD–eVçW6VBÀÐ¢&VÖ÷fU6V7F–öãD&6¶w&÷VæD7W'&Væ7’Â&VÖ÷fU6V7F–öãD&6¶w&÷VæDWV—ÖVçBÂ&VÖ÷fU6V7F–öãD&6¶w&÷VæDfVGW&RÂ&VÖ÷fU6V7F–öãT—FVÒÂ&VÖ÷fU6V7F–öãd7W7FöÔfVGW&RÂ&VÖ÷fU6V7F–öãd7W7FöÕ7VÆÂÀÐ¢&VÖ÷fU6¶–ÆÅ&öf–6–Væ7•6÷W&6RÂ&VÖ÷fU6¶–ÆÅ&öf–6–Væ7•6÷W&6W4'•&Vf—‚Â&VÖ÷fU7V6–W5G&—BÂ&VæFW$&–Æ—F–W57FWÂ&VæFW$7F–öä&"Â&VæFW$&6¶w&÷VæE7FWÀÐ¢&VæFW$&6–757FWÂ&VæFW$'V–ÆFW%f–WrÂ&VæFW$6FÆötVçG'”FWF–Ç2Â&VæFW$6†&7FW$Æ–'&'”V×G•7FFRÂ&VæFW$6†&7FW$Æ–'&'•f–WrÂ&VæFW$6Æ74fVGW&TÖWFFFÀÐ¢&VæFW$6Æ757FWÂ&VæFW$7&VF÷%f–WrÂ&VæFW$WV—ÖVçE7FWÂ&VæFW$gVÆÄ6FÆötFW67&—F–öâÂ&VæFW$ÆFW7DÆWfVÄ6•VæÆö6²Â&VæFW$ÆFW7DÆWfVÄfVGW&UVæÆö6·2ÀÐ¢&VæFW$ÆFW7DÆWfVÅ7V&6Æ75VæÆö6²Â&VæFW$ÆFW7DÆWfVÅVæÆö6µ7VÖÖ'’Â&VæFW$ÆWfVÅ7FWÂ&VæFW$ÆWfVÅWv÷&¶fÆ÷rÂ&VæFW$Ö—76–æu7FWÂ&VæFW$×VÇF–6Æ74Gfæ6VÖVçD6†ö–6U7VÖÖ'’ÀÐ¢&VæFW$×VÇF–6Æ746Æ757VÖÖ'’Â&VæFW$×VÇF–6Æ74ÆWfVÄ'&V¶F÷vâÂ&VæFW$×VÇF–6Æ75&öw&W76–öäVF—F÷"Â&VæFW$×VÇF–6Æ75&VDöæÇ”æ÷F–6RÂ&VæFW$×VÇF–6Æ756¶–ÆÄ6†ö–6W2Â&VæFW$×VÇF–6Æ757F÷&VD6†ö–6W2ÀÐ¢&VæFW$×VÇF–6Æ75FööÄ6†ö–6W2Â&VæFW%&Wf–Wu7FWÂ&VæFW%'VÆW6WDÖWFFFÂ&VæFW%6V7F–öã÷'G&—EæVÂÂ&VæFW%6V7F–öã$'F–f–6W$–ægW6–öç2Â&VæFW%6V7F–öã$6”6†ö–6RÀÐ¢&VæFW%6V7F–öã$6ö×7D6”6†ö–6RÂ&VæFW%6V7F–öã$F—f–æU6Ö—FU6Æ÷EW6vRÂ&VæFW%6V7F–öã$fVD6†ö–6W2Â&VæFW%6V7F–öã$fVGW&TÖV6†æ–72Â&VæFW%6V7F–öã$gWGW&TfVGW&W2Â&VæFW%6V7F–öã$×VÇF–6Æ74FE7FGW2ÀÐ¢&VæFW%6V7F–öã%6VÆV7FVD6Æ74FWF–Ç2Â&VæFW%6V7F–öã4&–Æ—G•66÷&TFWF–Ç2Â&VæFW%6V7F–öã4&–Æ—G•7VÖÖ'’Â&VæFW%6V7F–öã4&Ö÷$6Æ74wV–FRÂ&VæFW%6V7F–öã4FW&—fVDÖV6†æ–72Â&VæFW%6V7F–öã4†—DF–6RÀÐ¢&VæFW%6V7F–öã4‡wV–FRÂ&VæFW%6V7F–öã4ÖçVÄ&–Æ—F–W2Â&VæFW%6V7F–öã4ÖV6†æ–74wV–FRÂ&VæFW%6V7F–öã5ö–çD'W’Â&VæFW%6V7F–öã5&öÆÆVD&–Æ—F–W2Â&VæFW%6V7F–öã5&öÆÆVD‡–çWG2ÀÐ¢&VæFW%6V7F–öã57FæF&D'&’Â&VæFW%6V7F–öãDW‡W'F—6T6†ö–6W2Â&VæFW%6V7F–öãE&öf–6–Væ7”wV–FRÂ&VæFW%6V7F–öãE6÷W&6U6¶–ÆÄ6†ö–6W2Â&VæFW%6V7F–öãT6FÆörÂ&VæFW%6V7F–öãT6öçF–æW$FW7F–æF–öå6VÆV7BÀÐ¢&VæFW%6V7F–öãT–çfVçF÷'’Â&VæFW%6V7F–öãT—FVÔVF—D6†V6¶&÷‚Â&VæFW%6V7F–öãT—FVÔVF—D6öçG&öÇ2Â&VæFW%6V7F–öãT—FVÔVF—D–çWBÂ&VæFW%6V7F–öãT—FVÔVF—EFW‡F&VÂ&VæFW%6V7F–öãT÷Vä6öçF–æW%æVÂÀÐ¢&VæFW%6V7F–öãd&Vv–ææW$wV–FRÂ&VæFW%6V7F–öãd7W7FöÕ7VÆÇ2Â&VæFW%6V7F–öãdFVfVÇE7VÆÅf–WvW"Â&VæFW%6V7F–öãdfVE–6¶W"Â&VæFW%6V7F–öãdfVGW&T6&G2Â&VæFW%6V7F–öãd–ææFU7VÆÇ2ÀÐ¢&VæFW%6V7F–öãe7VÆÅ6Æ÷G2Â&VæFW%6V7F–öãt&–Æ—F–W2Â&VæFW%6V7F–öãt&6¶w&÷VæD6†ö–6W2Â&VæFW%6V7F–öãt&6¶w&÷VæDw&çG2Â&VæFW%6V7F–öãt6Æ74æDfVE7VÖÖ'’Â&VæFW%6V7F–öãt6Æ757VÆÇ2ÀÐ¢&VæFW%6V7F–öãt6öçF–æW%7VÖÖ'’Â&VæFW%6V7F–öãtfVGW&U&Wf–Wt—FVÒÂ&VæFW%6V7F–öãtfVGW&U7VÖÖ'’Â&VæFW%6V7F–öãt†—DF–6RÂ&VæFW%6V7F–öãt–ææFU7VÆÇ2Â&VæFW%6V7F–öãt–çfVçF÷'’ÀÐ¢&VæFW%6V7F–öãtÆ—7BÂ&VæFW%6V7F–öãtÖ–w&F–öåv&æ–æw2Â&VæFW%6V7F–öãu76—fU66÷&W2Â&VæFW%6V7F–öãu6f–æuF‡&÷w2Â&VæFW%6V7F–öãu6¶–ÆÇ2Â&VæFW%6V7F–öãu7VÆÆ67F–æu7VÖÖ'’ÀÐ¢&VæFW%6V7F–öãuv&æ–æw2Â&VæFW%6V7F–öãuvVöäGF6·2Â&VæFW%6VÆV7FVD6Æ74ÖV6†æ–757VÖÖ'’Â&VæFW%6VÆV7FVDfVE7VÖÖ'’Â&VæFW%6¶–ÆÇ57FWÂ&VæFW%7V6–W57FWÀÐ¢&VæFW%7VÆÇ57FWÂ&VæFW%7FW6öçFVçBÂ&VæFW%7FW&–ÂÂ&VæFW%7V&6Æ757FWÂ&W—$6öçF–æW%7FFRÂ&WÆ6TG&gBÀÐ¢&WÆ6U6V7F–öã÷'G&—BÂ&WÆ6U6V7F–öã#G&gBÂ&W6öÇfT6Æ75FV×ÆFTf÷$VçG'’Â&W7F÷&TG&gDg&öÕ6W76–öâÂ&W7F÷&U6V7F–öãe&W6÷W&6TÆ—7BÂ&WF—&VD6†&7FW%7FW–G2ÀÐ¢&öÆÅ6V7F–öã4&–Æ—G•66÷&RÂ&öÆÅ6V7F–öã566÷&UööÂÂ'Vä6†&7FW$7&VF÷$7F–öâÂ'Vä6†&7FW%7FW&Vv—7G&F–öäVF—BÂ'Våv—¦&D†æFÆW'2Â6fTF—7Æ•7G&–ærÀÐ¢6fTçVÖ&W"Â6æ—F—¦TG&gE7G&–æw2Â6fU6V7F–öã$'F–f–6W$–ægW6–öå7FFRÂ66†VGVÆTG&gEW'6—7FVæ6RÂ6V7F–öãe&V6†&vTÖF6†W5&W7BÂ6V7F–öãe6VÆV7FVE7VÆÅ6÷W&6T–G2ÀÐ¢6VÆV7D6Æ75FV×ÆFRÂ6WD&–Æ—G”&öçW56÷W&6RÂ6WD&–Æ—G•66÷&RÂ6WD6†&7FW$ÆWfVÂÂ6WD7W'&VçE7FWÂ6WDG&gEfÇVRÀÐ¢6WDfVE&W7D6†ö–6RÂ6WD–ææFU7VÆÇ4f÷%6÷W&6RÂ6WDÖçVÅ&öf–6–Væ7”Æ—7BÂ6WD×VÇF–6Æ746Æ74ÆWfVÂÂ6WD×VÇF–6Æ757V&6Æ72Â6WE6V7F–öã÷'G&—BÀÐ¢6WE6V7F–öã$'F–f–6W$–ægW6–öåF&vWBÂ6WE6V7F–öã$6”&öçW56÷W&6RÂ6WE6V7F–öã$6”6†ö–6UfÇVW2Â6WE6V7F–öã$6”fVBÂ6WE6V7F–öã$6”ÖöFRÂ6WE6V7F–öã$7W7FöÔ6Æ756¶–ÆÄæÖW2ÀÐ¢6WE6V7F–öã$fVD6†ö–6UfÇVW2Â6WE6V7F–öã$fVGW&U7F÷&VD6†ö–6W2Â6WE6V7F–öã$×VÇF–6Æ74FE7FGW2Â6WE6V7F–öã4&–Æ—G”ÖWF†öBÂ6WE6V7F–öã4‡&öÆÅfÇVRÂ6WE6V7F–öãD&6¶w&÷VæD6†ö–6TÆ—7BÀÐ¢6WE6V7F–öãE6¶–ÆÄVçG'’Â6WE6V7F–öãE7F÷&VE6¶–ÆÄ6†ö–6RÂ6WE6–×ÆTG&gDf–VÆBÂ6WE6÷W&6U&öf–6–Væ7”Æ—7BÂ6WE7FGW2Â6¶—6V7F–öãD&6¶w&÷VæBÀÐ¢6Æ÷G4'&•Fôö&¦V7BÂ6÷W&6TÖF6†W2Â7Æ—D–çfVçF÷'•7F6²Â7F'DæWtG&gBÂ7F'E6V7F–öã#6†&7FW$7&VF÷"Â7F'E6V7F–öã#æWt6†&7FW"ÀÐ¢7V'G&7D7W'&Væ7”Ö2Â7–æ46Æ74ÆWfVÄ÷&FW%Fô6Æ74ÆWfVÇ2Â7–æ4WV—ÖVçD7W'&Væ7”g&öÕ6÷W&6W2Â7–æ4f—'7EVæ&Ö÷&VDFVfVç6U6÷W&6RÂ7–æ56V7F–öã$Gfæ6VÖVçD6†ö–6RÀÐ¢7–æ56V7F–öã$'F–f–6W$–ægW6–öç4f÷$ÆWfVÂÂ7–æ56V7F–öã$6”6†ö–6W4f÷$ÆWfVÂÂ7–æ56V7F–öãD&6¶w&÷VæDfVGW&W2Â7–æ56V7F–öãd6Æ756÷W&6TÖWFFFÂ7–æ56V7F–öãdÆVv7•7VÆÄÆ–6W2Â7–æ56V7F–öãt6ö×ÆWFVE7FW2ÀÐ¢FövvÆT×VÇF–6Æ756¶–ÆÄ6†ö–6RÂFövvÆT×VÇF–6Æ75FööÄ6†ö–6RÂFövvÆU6V7F–öã$'F–f–6W$–ægW6–öâÂFövvÆU6V7F–öã$6Æ74fVGW&T6†ö–6RÂFövvÆU6V7F–öã%&vU7FFRÂFövvÆU6V7F–öãDW‡W'F—6RÀÐ¢FövvÆU6V7F–öãE6¶–ÆÂÂFövvÆU6V7F–öãT—FVÕ7FFRÂFövvÆU6V7F–öãdfVBÂFövvÆU6V7F–öãd×—7F–4&6çVÒÂFövvÆU6V7F–öãe7VÆÄ¶æ÷vâÂFövvÆU6V7F–öãe7VÆÅ&W&VBÀÐ¢G'”FD×VÇF–6Æ746Æ72ÂVæ—VT6ÆVä'&’ÂWFFU6V7F–öã$7W7FöÔ6Æ756¶–ÆÅ–6¶W"ÂWFFU6V7F–öãT–çfVçF÷'”—FVÒÂWÆöE6V7F–öã÷'G&—Df–ÆRÂW6T7W7FöÔ6Æ74æÖRÀÐ¢W6T7W7FöÕ7V6–W4æÖRÂW6U7V6–W5FV×ÆFRÂfÆ–FFT'V–ÇF–å7V6–W4&6¶w&÷VæD6FÆörÂfÆ–FFT6öçF–æW%7FFRÂfÆ–FFTFVfVÇD6Æ746öÆÆV7F–öâÂfÆ–FFTFVfVÇDfVD6öÆÆV7F–öâÀÐ¢fÆ–FFTFVfVÇE7VÆÄ6FÆörÂfÆ–FFTFVfVÇE7VÆÅ&VfW&Væ6W2ÂfÆ–FFTFVfVÇE7V&6Æ746öÆÆV7F–öâÂfÆ–FFTfVE&W&WV—6—FTFVf–æ—F–öç2Âv&äG&gE7F÷&vTf–ÇW&RÂv—¦&D6†ö–6T6&BÀÐ¢v—¦&Df–VÆBÂv—¦&E'VçF–ÖRÂv—¦&E6VÆV7BÂv÷VÆD7&VFT6öçF–æW$7–6ÆRÂw&—FU&÷WFUFõW&ÀÐ¢Ò“°Ð Ð¢6öç7Bf–æ—6…7FWÒ7&VFTf–æ—6…7FW‡°Ð¢6†&VE6W'f–6W3¢6†&VE7FW6W'f–6W2ÀÐ¢&Vv–ææW$æ÷FRÀÐ¢6Æ×ÆWfVÂÀÐ¢6ÆVå7G&–ærÀÐ¢W66T‡FÖÂÀÐ¢f÷&ÖE6fVEF–ÖS Ð¢f÷&ÖE6V7F–öã…6fVEF–ÖRÀÐ¢vWD6†&7FW$'W7”Æ&VÂÀÐ¢vWD6†&7FW%÷'G&—EW&Ã Ð¢vWE6V7F–öã„6†&7FW%÷'G&—EW&ÂÀÐ¢vWD7&VF÷%7FFS¢‚’Óâ7&VF÷%7FFRÀÐ¢vWDf–æÆ—¦F–öåfÆ–FF–öã Ð¢vWE6V7F–öãtf–æÆ—¦F–öåfÆ–FF–öâÀÐ¢vWE&ööÔ6öFRÀÐ¢vWE6fT&6¶w&÷VæDæÖRÀÐ¢vWE6fT6†&7FW$æÖRÀÐ¢vWE6fT6Æ74æÖRÀÐ¢vWE6fU7V6–W4æÖRÀÐ¢vWE6fU7V&6Æ74æÖRÀÐ¢†æFÆT6÷”§6öã Ð¢†æFÆU6V7F–öã„6÷”§6öâÀÐ¢†æFÆT7&VFTÆ–æ¶VEFö¶Vã Ð¢†æFÆU6V7F–öã„7&VFTÆ–æ¶VEFö¶VâÀÐ¢†æFÆTF÷væÆöDG&gD&6·W Ð¢†æFÆU6V7F–öã„F÷væÆöDG&gD&6·WÀÐ¢†æFÆTW‡÷'D§6öã Ð¢†æFÆU6V7F–öã„W‡÷'D§6öâÀÐ¢†æFÆTf–æÆ—¦S Ð¢†æFÆU6V7F–öã„f–æÆ—¦RÀÐ¢†æFÆT–×÷'Df–ÆS Ð¢†æFÆU6V7F–öã„–×÷'Df–ÆRÀÐ¢†æFÆT–×÷'EFW‡C Ð¢†æFÆU6V7F–öã„–×÷'EFW‡BÀÐ¢†æFÆU6fS Ð¢†æFÆU6V7F–öã…6fRÀÐ¢†æFÆU6fT6÷“ Ð¢†æFÆU6V7F–öã…6fT6÷’ÀÐ¢†æFÆU7FWf–ÆT6†ævS Ð¢†æFÆU6V7F–öã„6†ævRÀÐ¢—46†&7FW$7&VF÷$'W7’ÀÐ¢—56fT6ö×ÆWFS Ð¢—56V7F–öã…W'6—7FVæ6T6ö×ÆWFRÀÐ¢æf–vFUFôÆ–'&'’ÀÐ¢÷Vä6†&7FW%6†VWC Ð¢†æFÆU6V7F–öãt÷Vä6†&7FW%6†VWBÀÐ¢&VæFW$f–æÆ—¦F–öåv&æ–æw3 Ð¢&VæFW%6V7F–öãuv&æ–æw2ÀÐ¢6fTçVÖ&W"ÀÐ¢Fö¶VäFWVæFVæ6–W3¢FW2ÀÐ¢v—¦&Df–VÆ@Ð¢Ò“°Ð Ð¢6öç7B°Ð¢—56V7F–öã…6fT6ö×ÆWFRÀÐ¢&VæFW%6fU7FWÀÐ¢&VæFW%6V7F–öã„&6·Wæ÷F–6RÀÐ¢&VæFW%6V7F–öã„Æ–æ¶VEFö¶VåæVÂÀÐ¢&VæFW%6V7F–öã…v&æ–æw0Ð¢ÒÒf–æ—6…7FWæ6ö×F–&–Æ—G“°Ð Ð¢&Vv—7FW$6†&7FW%7FW&VæFW&W"€Ð¢'6fR"ÀÐ¢f–æ—6…7FWç&VæFW%7FW Ð¢“°Ð Ð¢&Vv—7FW$6†&7FW%7FW6ö×ÆWF–öâ€Ð¢'6fR"ÀÐ¢f–æ—6…7FWæ—57FW6ö×ÆWFPÐ¢“°Ð Ð¢f–æ—6…7FWæ7F–öç2æf÷$V6‚‚†7F–öâ’Óâ°Ð¢&Vv—7FW$6†&7FW$7&VF÷$7F–öâ€Ð¢7F–öâÀÐ¢†6öçFW‡B’Óâ°Ð¢&WGW&âf–æ—6…7FWæ†æFÆU7FW6Æ–6²€Ð¢6öçFW‡@Ð¢“°Ð¢ÐÐ¢“°Ð¢Ò“°Ð Ð¢&Vv—7FW$6†&7FW$7&VF÷$6†ævT†æFÆW"€Ð¢†6öçFW‡B’Óâ°Ð¢&WGW&âf–æ—6…7FWæ†æFÆU7FW6†ævR€Ð¢6öçFW‡@Ð¢“°Ð¢ÐÐ¢“°Ð Ð¢'Vä6†&7FW%7FW&Vv—7G&F–öäVF—B‚“°Ð Ð¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÐÐ¢òò4„$5DU"5$TDõ"4T5D”ôâ’ÒU$ÔäTåBd•$U5Dõ$R4ôääT5D”ôå2ò4ÄTåU Ð¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÐÐ Ð¢gVæ7F–öâvWE6V7F–öã”6öÆÆV7F–öäæÖR€Ð¢&–Ö'”÷F–öâÀÐ¢6V6öæF'”÷F–öâÀÐ¢fÆÆ&6°Ð¢’°Ð¢&WGW&â6ÆVå7G&–ær€Ð¢÷F–öç3òå·&–Ö'”÷F–öåÒÇÀÐ¢÷F–öç3òå·6V6öæF'”÷F–öåÒÀÐ¢fÆÆ&6°Ð¢“°Ð¢ÐÐ Ð¢gVæ7F–öâæ÷&ÖÆ—¦U6V7F–öã”6†&7FW%&V6÷&B€Ð¢&V6÷&@Ð¢’°Ð¢6öç7Bf—&W7F÷&TFö7VÖVçD–BÐÐ¢6ÆVå7G&–ær€Ð¢&V6÷&CòæFö4–BÇÀÐ¢&V6÷&Còæf—&W7F÷&TFö7VÖVçD–BÇÀÐ¢&V6÷&Còæ–@Ð¢“°Ð Ð¢6öç7B–çFW&æÄFF–BÐÐ¢6ÆVå7G&–ær‡&V6÷&Còæ–B“°Ð Ð¢6öç7Bæ÷&ÖÆ—¦VBÐÐ¢æ÷&ÖÆ—¦T6†&7FW"‡°Ð¢ââç&V6÷&BÀÐ¢–C¢f—&W7F÷&TFö7VÖVçD–@Ð¢Ò“°Ð Ð¢æ÷&ÖÆ—¦VBæ–BÐÐ¢f—&W7F÷&TFö7VÖVçD–C°Ð Ð¢æ÷&ÖÆ—¦VBæFö4–BÐÐ¢f—&W7F÷&TFö7VÖVçD–C°Ð Ð¢æ÷&ÖÆ—¦VBæf—&W7F÷&TFö7VÖVçD–BÐÐ¢f—&W7F÷&TFö7VÖVçD–C°Ð Ð¢–b€Ð¢–çFW&æÄFF–Bb`Ð¢–çFW&æÄFF–BÓÒf—&W7F÷&TFö7VÖVçD–@Ð¢’°Ð¢æ÷&ÖÆ—¦VBæ–çFW&æÄFF–BÐÐ¢–çFW&æÄFF–C°Ð¢ÐÐ Ð¢6öç7B&V6÷&E&Wf—6–öäÖ–ÆÆ—2ÐÐ¢vWE6V7F–öã…&V6÷&E&Wf—6–öäÖ–ÆÆ—2€Ð¢&V6÷&@Ð¢“°Ð Ð¢–b€Ð¢&V6÷&E&Wf—6–öäÖ–ÆÆ—2âb`Ð¢6fTçVÖ&W"€Ð¢æ÷&ÖÆ—¦VBæ'V–ÆFW Ð¢òæÆ7E6fVDDÖ–ÆÆ—2ÀÐ¢ Ð¢Ð¢’°Ð¢æ÷&ÖÆ—¦VBæ'V–ÆFW"ÐÐ¢æ÷&ÖÆ—¦VBæ'V–ÆFW"ÇÂ·Ó°Ð Ð¢æ÷&ÖÆ—¦VBæ'V–ÆFW"æÆ7E6fVDDÖ–ÆÆ—2ÐÐ¢&V6÷&E&Wf—6–öäÖ–ÆÆ—3°Ð¢ÐÐ Ð¢&WGW&âæ÷&ÖÆ—¦VC°Ð¢ÐÐ Ð¢gVæ7F–öâæ÷&ÖÆ—¦U6V7F–öã”6Æ75&V6÷&B€Ð¢&V6÷&@Ð¢’°Ð¢6öç7Bæ÷&ÖÆ—¦VBÒæ÷&ÖÆ—¦T6Æ75FV×ÆFR€Ð¢°Ð¢ââç&V6÷&BÀÐ¢–C¢&V6÷&Bæ–BÇÂ&V6÷&BæFö4–BÀÐ¢Fö4–C¢&V6÷&BæFö4–BÇÂ&V6÷&Bæ–BÇÂçVÆÀÐ¢ÒÀÐ¢&†öÖV'&Wr Ð¢“°Ð Ð¢æ÷&ÖÆ—¦VBæFö4–BÐÐ¢&V6÷&BæFö4–BÇÀÐ¢æ÷&ÖÆ—¦VBæFö4–BÇÀÐ¢çVÆÃ°Ð Ð¢&WGW&âæ÷&ÖÆ—¦VC°Ð¢ÐÐ Ð¢gVæ7F–öâæ÷&ÖÆ—¦U6V7F–öã•7V6–W5&V6÷&B€Ð¢&V6÷&@Ð¢’°Ð¢6öç7BæÖRÒ6fTF—7Æ•7G&–ær€Ð¢&V6÷&BææÖRÀÐ¢$7W7FöÒ7V6–W2 Ð¢“°Ð Ð¢&WGW&â°Ð¢ââæ6ÆöæTFF‡&V6÷&B’ÀÐ Ð¢–C¢Ö¶U6fT–B€Ð¢&V6÷&Bæ–BÇÀÐ¢&V6÷&BæFö4–BÇÀÐ¢æÖRÀÐ¢&7W7FöÒ×7V6–W2 Ð¢’ÀÐ Ð¢Fö4–C Ð¢&V6÷&BæFö4–BÇÀÐ¢&V6÷&Bæ–BÇÀÐ¢çVÆÂÀÐ Ð¢æÖRÀÐ Ð¢6÷W&6S¢6fTF—7Æ•7G&–ær€Ð¢&V6÷&Bç6÷W&6RÀÐ¢&†öÖV'&Wr Ð¢’ÀÐ Ð¢7VÖÖ'“¢6fTF—7Æ•7G&–ær€Ð¢&V6÷&Bç7VÖÖ'’ÇÀÐ¢&V6÷&BæFW67&—F–öâÀÐ¢$æòFW67&—F–öâ&÷f–FVBâ Ð¢’ÀÐ Ð¢6—¦S¢6fTF—7Æ•7G&–ær€Ð¢&V6÷&Bç6—¦RÀÐ¢&ÖVF—VÒ Ð¢’ÀÐ Ð¢7VVC¢ÖF‚æÖ‚€Ð¢ÀÐ¢6fTçVÖ&W"€Ð¢&V6÷&Bç7VVBóðÐ¢&V6÷&BçvÆµ7VVBÀÐ¢3 Ð¢Ð¢’ÀÐ Ð¢G&—G3¢'&’æ—4'&’‡&V6÷&BçG&—G2Ð¢ò6ÆöæTFF‡&V6÷&BçG&—G2Ð¢¢µÐÐ¢Ó°Ð¢ÐÐ Ð¢gVæ7F–öâæ÷&ÖÆ—¦U6V7F–öã”&6¶w&÷VæE&V6÷&B€Ð¢&V6÷&@Ð¢’°Ð¢6öç7Bæ÷&ÖÆ—¦VBÐÐ¢æ÷&ÖÆ—¦U6V7F–öãD&6¶w&÷VæB€Ð¢°Ð¢ââç&V6÷&BÀÐ¢–C¢&V6÷&Bæ–BÇÂ&V6÷&BæFö4–BÀÐ¢Fö4–C¢&V6÷&BæFö4–BÇÂ&V6÷&Bæ–BÇÂçVÆÀÐ¢ÒÀÐ¢&†öÖV'&Wr Ð¢“°Ð Ð¢æ÷&ÖÆ—¦VBæFö4–BÐÐ¢&V6÷&BæFö4–BÇÀÐ¢æ÷&ÖÆ—¦VBæFö4–BÇÀÐ¢çVÆÃ°Ð Ð¢&WGW&âæ÷&ÖÆ—¦VC°Ð¢ÐÐ Ð¢gVæ7F–öâ&Vg&W6„7&VF÷$f÷%6V7F–öã”66†R€Ð¢66†T¶WÐ¢’°Ð¢–b‚v—¦&E'VçF–ÖRç6†VÆÄ'V–ÇB’°Ð¢&WGW&ã°Ð¢ÐÐ Ð¢–b€Ð¢7&VF÷%7FFRçf–WtÖöFRÓÓÒ&Æ–'&'’ Ð¢’°Ð¢–b†66†T¶W’ÓÓÒ&6†&7FW$66†R"’°Ð¢&VæFW$7&VF÷%f–Wr‚“°Ð¢ÐÐ Ð¢&WGW&ã°Ð¢ÐÐ Ð¢6öç7BffV7FVE7FW2Ò°Ð¢&ööÔ6Æ7466†S¢²&6Æ72"Â'7V&6Æ72%ÒÀÐ¢&ööÕ7V6–W466†S¢²'7V6–W2%ÒÀÐ¢&ööÔ&6¶w&÷VæD66†S¢²&&6¶w&÷VæB%ÐÐ¢Õ¶66†T¶W•ÒÇÂµÓ°Ð Ð¢–b€Ð¢ffV7FVE7FW2æ–æ6ÇVFW2€Ð¢7&VF÷%7FFRæ7W'&VçE7FW–@Ð¢Ð¢’°Ð¢&VæFW$7W'&VçE7FW‚“°Ð¢ÐÐ¢ÐÐ Ð¢6öç7B6V7F–öã•W'6—7FVæ6RÐÐ¢7&VFT6†&7FW%&VÇF–ÖUW'6—7FVæ6R‡°Ð¢FW2ÀÐ¢Æ—7FVæW'3¢6V7F–öã”Æ—7FVæW'2ÀÐ¢vWE&ööÔ6öFRÀÐ¢†4f—&W7F÷&UFööÇ2ÀÐ¢vWE7FFS¢‚’Óâ7&VF÷%7FFRÀÐ¢öä66†T6†ævVC Ð¢&Vg&W6„7&VF÷$f÷%6V7F–öã”66†RÀÐ¢6WE7FGW0Ð¢Ò“°Ð Ð¢gVæ7F–öâvWE6V7F–öã”Æ—7FVæW$FW67&—F÷'2‚’°Ð¢&WGW&â°Ð¢°Ð¢–C¢&6†&7FW'2"ÀÐ¢Æ&VÃ¢&6†&7FW'2"ÀÐ¢Æ—7FVæW$æÖS¢&6†&7FW'2"ÀÐ¢6öÆÆV7F–öäæÖS Ð¢vWE6V7F–öã„6†&7FW$6öÆÆV7F–öäæÖR‚’ÀÐ¢&ööÔ¶W“¢&6†&7FW%&ööÔ6öFR"ÀÐ¢66†T¶W“¢&6†&7FW$66†R"ÀÐ¢æ÷&ÖÆ—¦U&V6÷&C Ð¢æ÷&ÖÆ—¦U6V7F–öã”6†&7FW%&V6÷&@Ð¢ÒÀÐ¢°Ð¢–C¢&6Æ76W2"ÀÐ¢Æ&VÃ¢&6Æ72FV×ÆFW2"ÀÐ¢Æ—7FVæW$æÖS¢&6Æ76W2"ÀÐ¢6öÆÆV7F–öäæÖS Ð¢vWE6V7F–öã”6öÆÆV7F–öäæÖR€Ð¢&6Æ746öÆÆV7F–öäæÖR"ÀÐ¢&6Æ75FV×ÆFW46öÆÆV7F–öäæÖR"ÀÐ¢&6Æ76W2 Ð¢’ÀÐ¢&ööÔ¶W“¢&6Æ75&ööÔ6öFR"ÀÐ¢66†T¶W“¢'&ööÔ6Æ7466†R"ÀÐ¢æ÷&ÖÆ—¦U&V6÷&C Ð¢æ÷&ÖÆ—¦U6V7F–öã”6Æ75&V6÷&BÀÐ¢÷F–öæÃ¢G'VPÐ¢ÒÀÐ¢°Ð¢–C¢'7V6–W2"ÀÐ¢Æ&VÃ¢'7V6–W2FV×ÆFW2"ÀÐ¢Æ—7FVæW$æÖS¢'7V6–W2"ÀÐ¢6öÆÆV7F–öäæÖS Ð¢vWE6V7F–öã”6öÆÆV7F–öäæÖR€Ð¢'7V6–W46öÆÆV7F–öäæÖR"ÀÐ¢'7V6–W5FV×ÆFW46öÆÆV7F–öäæÖR"ÀÐ¢'7V6–W2 Ð¢’ÀÐ¢&ööÔ¶W“¢'7V6–W5&ööÔ6öFR"ÀÐ¢66†T¶W“¢'&ööÕ7V6–W466†R"ÀÐ¢æ÷&ÖÆ—¦U&V6÷&C Ð¢æ÷&ÖÆ—¦U6V7F–öã•7V6–W5&V6÷&BÀÐ¢÷F–öæÃ¢G'VPÐ¢ÒÀÐ¢°Ð¢–C¢&&6¶w&÷VæG2"ÀÐ¢Æ&VÃ¢&&6¶w&÷VæBFV×ÆFW2"ÀÐ¢Æ—7FVæW$æÖS¢&&6¶w&÷VæG2"ÀÐ¢6öÆÆV7F–öäæÖS Ð¢vWE6V7F–öã”6öÆÆV7F–öäæÖR€Ð¢&&6¶w&÷VæD6öÆÆV7F–öäæÖR"ÀÐ¢&&6¶w&÷VæEFV×ÆFW46öÆÆV7F–öäæÖR"ÀÐ¢&&6¶w&÷VæG2 Ð¢’ÀÐ¢&ööÔ¶W“¢&&6¶w&÷VæE&ööÔ6öFR"ÀÐ¢66†T¶W“¢'&ööÔ&6¶w&÷VæD66†R"ÀÐ¢æ÷&ÖÆ—¦U&V6÷&C Ð¢æ÷&ÖÆ—¦U6V7F–öã”&6¶w&÷VæE&V6÷&BÀÐ¢÷F–öæÃ¢G'VPÐ¢ÐÐ¢Ó°Ð¢ÐÐ Ð¢gVæ7F–öâ6öææV7E6V7F–öã•W&ÖæVçDÆ—7FVæW'2‚’°Ð¢&WGW&â6V7F–öã•W'6—7FVæ6Rç7–æ2€Ð¢vWE6V7F–öã”Æ—7FVæW$FW67&—F÷'2‚’ÀÐ¢°Ð¢f–WtÖöFS¢7&VF÷%7FFRçf–WtÖöFRÀÐ¢7W'&VçE7FW–C Ð¢7&VF÷%7FFRæ7W'&VçE7FW–@Ð¢ÐÐ¢“°Ð¢ÐÐ Ð¢gVæ7F–öâ6ÆVçW6V7F–öã•W&ÖæVçDÆ—7FVæW'2‚’°Ð¢&WGW&â6V7F–öã•W'6—7FVæ6Ræ6ÆVçW€Ð¢vWE6V7F–öã”Æ—7FVæW$FW67&—F÷'2‚Ð¢“°Ð¢ÐÐ Ð Ð¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÐÐ¢òò4„$5DU"5$TDõ"4T5D”ôâ#Ò5D%EUò”ä•D”Ä•¤D”ôâò$UEU$äTBÐ¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÐÐ Ð¢gVæ7F–öâF—66öææV7E6V7F–öã#&÷WF–ær‚’°Ð¢–b€Ð¢v—¦&E'VçF–ÖPÐ¢ç÷7FFT6öææV7FV@Ð¢’°Ð¢v–æF÷rç&VÖ÷fTWfVçDÆ—7FVæW"€Ð¢'÷7FFR"ÀÐ¢†æFÆT'&÷w6W%&÷WFT6†ævPÐ¢“°Ð Ð¢v—¦&E'VçF–ÖRç÷7FFT6öææV7FVBÐÐ¢fÇ6S°Ð¢ÐÐ¢ÐÐ Ð¢gVæ7F–öâ&Vg&W6…6V7F–öã#6†&7FW$7&VF÷"‚’°Ð¢–b‚—46†&7FW$7&VF÷%&÷WFR‚’’°Ð¢&WGW&â7&VF÷%7FFS°Ð¢ÐÐ Ð¢&Vg&W6„VÆVÖVçG2‚“°Ð¢6öææV7E6V7F–öã•W&ÖæVçDÆ—7FVæW'2‚“°Ð¢&VæFW$7&VF÷%f–Wr‚“°Ð Ð¢&WGW&â7&VF÷%7FFS°Ð¢ÐÐ Ð¢gVæ7F–öâ7F'E6V7F–öã#6†&7FW$7&VF÷"‚’°Ð¢v—¦&E'VçF–ÖRæFW7G&÷–VBÒfÇ6S°Ð Ð¢–b‚—46†&7FW$7&VF÷%&÷WFR‚’’°Ð¢&WGW&â7&VF÷%7FFS°Ð¢ÐÐ Ð¢&Vg&W6„VÆVÖVçG2‚“°Ð¢Vç7W&Uv—¦&E7G–ÆW2‚“°Ð¢–ç7FÆÄ6†&7FW$7&VF÷%FW‡D–çWDwV&B‡°Ð¢&ö÷C¢Fö7VÖVç@Ð¢Ò“°Ð¢6öææV7DG&gEW'6—7FVæ6TÆ–fV7–6ÆR‚“°Ð¢6öææV7E÷7FFU&÷WF–ær‚“°Ð¢–b€Ð¢v—¦&E'VçF–ÖPÐ¢æ–æ—F–Å&÷WFTÆ–V@Ð¢’°Ð¢Ç”–æ—F–Å&÷WFR‚“°Ð Ð¢v—¦&E'VçF–ÖRæ–æ—F–Å&÷WFTÆ–VBÐÐ¢G'VS°Ð¢ÐÐ Ð¢6öææV7E6V7F–öã•W&ÖæVçDÆ—7FVæW'2‚“°Ð Ð¢&VæFW$7&VF÷%f–Wr‚“°Ð Ð¢&WGW&â7&VF÷%7FFS°Ð¢ÐÐ Ð¢gVæ7F–öâ6ÆVçW6V7F–öã#6†&7FW$7&VF÷"‚’°Ð¢v—¦&E'VçF–ÖRæFW7G&÷–VBÒG'VS°Ð Ð¢F—66öææV7DG&gEW'6—7FVæ6TÆ–fV7–6ÆR‚“°Ð¢F—66öææV7Ev—¦&DWfVçG2‚“°Ð¢F—66öææV7E6V7F–öã#&÷WF–ær‚“°Ð¢6ÆVçW6V7F–öã•W&ÖæVçDÆ—7FVæW'2‚“°Ð Ð¢&WGW&â7&VF÷%7FFS°Ð¢ÐÐ Ð¢gVæ7F–öâ7F'E6V7F–öã#æWt6†&7FW"‚’°Ð¢–b€Ð¢6öæf—&ÔF—66&EVç6fVDG&gB€Ð¢'7F'F–æræWr6†&7FW" Ð¢Ð¢’°Ð¢&WGW&â7&VF÷%7FFRæG&gC°Ð¢ÐÐ Ð¢6ÆV%7F÷&VDG&gB‚“°Ð¢7F'DæWtG&gB‚“°Ð Ð¢7&VF÷%7FFRæG&gBÐÐ¢6æ—F—¦TG&gE7G&–æw2€Ð¢7&VF÷%7FFRæG&g@Ð¢“°Ð Ð¢W'6—7DG&gEFõ6W76–öâ‚“°Ð¢æf–vFUFõ7FW‚&&6–72"“°Ð Ð¢&WGW&â7&VF÷%7FFRæG&gC°Ð¢ÐÐ Ð¢gVæ7F–öâ&WÆ6U6V7F–öã#G&gB€Ð¢6†&7FW"ÀÐ¢÷F–öç2Ò·ÐÐ¢’°Ð¢–b€Ð¢÷F–öç2ç6¶—F—66&DwV&BÓÒG'VRb`Ð¢6öæf—&ÔF—66&EVç6fVDG&gB€Ð¢'&WÆ6–ærF†R7W'&VçBG&gB Ð¢Ð¢’°Ð¢&WGW&â7&VF÷%7FFRæG&gC°Ð¢ÐÐ Ð¢6öç7BG&gBÐÐ¢&WÆ6TG&gB€Ð¢6†&7FW"ÀÐ¢÷F–öç0Ð¢“°Ð Ð¢7&VF÷%7FFRæG&gBÐÐ¢6æ—F—¦TG&gE7G&–æw2€Ð¢7&VF÷%7FFRæG&g@Ð¢“°Ð Ð¢W'6—7DG&gEFõ6W76–öâ‚“°Ð¢&VæFW$7&VF÷%f–Wr‚“°Ð Ð¢&WGW&âG&gC°Ð¢ÐÐ Ð¢gVæ7F–öâ&ö÷E6V7F–öã#v†Vå&VG’‚’°Ð¢–b‚—46†&7FW$7&VF÷%&÷WFR‚’’°Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢–b€Ð¢G—VöbFö7VÖVçBÓÒ'VæFVf–æVB"b`Ð¢Fö7VÖVçBç&VG•7FFRÓÓÒ&ÆöF–ær Ð¢’°Ð¢Fö7VÖVçBæFDWfVçDÆ—7FVæW"€Ð¢$DôÔ6öçFVçDÆöFVB"ÀÐ¢7F'E6V7F–öã#6†&7FW$7&VF÷"ÀÐ¢²öæ6S¢G'VRÐÐ¢“°Ð Ð¢&WGW&âfÇ6S°Ð¢ÐÐ Ð¢7F'E6V7F–öã#6†&7FW$7&VF÷"‚“°Ð Ð¢&WGW&âG'VS°Ð¢ÐÐ Ð¢&ö÷E6V7F–öã#v†Vå&VG’‚“°Ð Ð¢&WGW&â°Ð¢7FFS¢7&VF÷%7FFRÀÐ¢7FW3¢%T”ÄDU%õ5DU2ÀÐ Ð¢–æ—C¢7F'E6V7F–öã#6†&7FW$7&VF÷"ÀÐ¢7F'C¢7F'E6V7F–öã#6†&7FW$7&VF÷"ÀÐ¢&Vg&W6ƒ¢&Vg&W6…6V7F–öã#6†&7FW$7&VF÷"ÀÐ¢&VæFW#¢&VæFW$7&VF÷%f–WrÀÐ¢6ÆVçW¢6ÆVçW6V7F–öã#6†&7FW$7&VF÷"ÀÐ¢FW7G&÷“¢6ÆVçW6V7F–öã#6†&7FW$7&VF÷"ÀÐ Ð¢÷VäÆ–'&'“¢æf–vFUFôÆ–'&'’ÀÐ¢æf–vFUFõ7FWÀÐ¢7F'DæWs¢7F'E6V7F–öã#æWt6†&7FW"ÀÐ¢&WÆ6TG&gC¢&WÆ6U6V7F–öã#G&gBÀÐ Ð¢vWE7FFR‚’°Ð¢&WGW&â7&VF÷%7FFS°Ð¢ÒÀÐ Ð¢vWDG&gB‚’°Ð¢&WGW&â7&VF÷%7FFRæG&gC°Ð¢ÒÀÐ Ð¢vWD6†&7FW"‚’°Ð¢&WGW&âvWD6†&7FW%6æ6†÷B‚“°Ð¢ÒÀÐ Ð¢vWE&VæFW$ÖWG&–72‚’°Ð¢&WGW&â°Ð¢gVÆÅ&VæFW$6÷VçC Ð¢v—¦&E'VçF–ÖRægVÆÅ&VæFW$6÷VçBÀÐ¢7W'&VçE7FW&VæFW$6÷VçC Ð¢v—¦&E'VçF–ÖRæ7W'&VçE7FW&VæFW$6÷VçBÀÐ¢7FW&–Å&V'V–ÆD6÷VçC Ð¢v—¦&E'VçF–ÖRç7FW&–Å&V'V–ÆD6÷VçBÀÐ¢7FW&–Å7FFUWFFT6÷VçC Ð¢v—¦&E'VçF–ÖRç7FW&–Å7FFUWFFT6÷VçBÀÐ¢Æ–v‡GvV–v‡Df–VÆEWFFT6÷VçC Ð¢v—¦&E'VçF–ÖRæÆ–v‡GvV–v‡Df–VÆEWFFT6÷VçBÀÐ¢–çWE66†VGVÆT6÷VçC Ð¢7&VF÷$–çWDFV&÷Væ6U'VçF–ÖRç66†VGVÆT6÷VçBÀÐ¢–çWDfÇW6„6÷VçC Ð¢7&VF÷$–çWDFV&÷Væ6U'VçF–ÖRæfÇW6„6÷VçBÀÐ¢VæF–æt–çWD6÷VçC Ð¢7&VF÷$–çWDFV&÷Væ6U'VçF–ÖRæVçG&–W2ç6—¦RÀÐ¢G&gE66†VGVÆT6÷VçC Ð¢G&gEW'6—7FVæ6U'VçF–ÖRç66†VGVÆT6÷VçBÀÐ¢G&gDfÇW6„6÷VçC Ð¢G&gEW'6—7FVæ6U'VçF–ÖRæfÇW6„6÷VçBÀÐ¢G&gE7F÷&vUw&—FT6÷VçC Ð¢G&gEW'6—7FVæ6U'VçF–ÖRç7F÷&vUw&—FT6÷VçBÀÐ¢VæF–ætG&gEW'6—7FVæ6S Ð¢G&gEW'6—7FVæ6U'VçF–ÖRçF&vWG2ÓÒçVÆÂÀÐ¢FW&—fVD66†S Ð¢FW&—fVD66†RævWDÖWG&–72‚Ð¢Ó°Ð¢ÒÀÐ Ð¢vWDFW&—fVD66†TÖWG&–72‚’°Ð¢&WGW&âFW&—fVD66†RævWDÖWG&–72‚“°Ð¢ÒÀÐ Ð¢vWD6Æ746”ÆWfVÇ2ÀÐ¢vWEVæÆö6¶VDfVD6†ö–6U6Æ÷G2ÀÐ¢F¶U&W7C Ð¢W&f÷&Õ6V7F–öãe&W7BÀÐ¢F§W7D†—DF–S Ð¢F§W7E6V7F–öãd†—DF–UW6vRÀÐ Ð¢6fS¢†æFÆU6V7F–öã…6fRÀÐ¢6fT6÷“¢†æFÆU6V7F–öã…6fT6÷’ÀÐ¢f–æÆ—¦S¢†æFÆU6V7F–öã„f–æÆ—¦RÀÐ¢7&VFTÆ–æ¶VEFö¶Vã Ð¢†æFÆU6V7F–öã„7&VFTÆ–æ¶VEFö¶VâÀÐ¢vWDf–æÆ—¦F–öåfÆ–FF–öã Ð¢vWE6V7F–öãtf–æÆ—¦F–öåfÆ–FF–öâÀÐ¢6÷”§6öã¢6÷•6V7F–öã„§6öâÀÐ¢W‡÷'D§6öã¢W‡÷'E6V7F–öã„§6öâÀÐ¢F÷væÆöDG&gD&6·W Ð¢†æFÆU6V7F–öã„F÷væÆöDG&gD&6·WÀÐ¢–×÷'D§6öã¢–×÷'E6V7F–öã„§6öåFW‡BÀÐ Ð¢6öææV7DÆ—7FVæW'3 Ð¢6öææV7E6V7F–öã•W&ÖæVçDÆ—7FVæW'2ÀÐ¢6ÆVçWÆ—7FVæW'3 Ð¢6ÆVçW6V7F–öã•W&ÖæVçDÆ—7FVæW'2ÀÐ¢vWDÆ—7FVæW%6æ6†÷B‚’°Ð¢&WGW&â6V7F–öã”Æ—7FVæW'2ævWE6æ6†÷B‚“°Ð¢ÒÀÐ Ð¢'Vå'VÆW56VÆeFW7G3 Ð¢'Vå7&C#E'VÆW56VÆeFW7G0Ð¢Ó°Ð§ÐÐ