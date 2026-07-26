// =====================================================
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
  validateDefaultFeatCollection
} from "./defaultFeats.js";
import { DEFAULT_SPELLS } from "./defaultSpells.js";
import {
  DEFAULT_SUBCLASSES,
  validateDefaultSubclassCollection
} from "./defaultSubclasses.js";
import { createCharacterSheetView } from "./characterSheet.js";
import {
  ACTIVE_RULESET,
  getLegacy2014Metadata,
  isActiveRulesetEntry
} from "./ruleset2014.js";

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

  const CHARACTER_SCHEMA_VERSION = 12;
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


// =====================================================
// CHARACTER CREATOR SECTION 2 â€” BUILDER STEP DEFINITIONS
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
        schemaVersion: 3,
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
        armorClass: 10,
        armorClassMode: "auto",
        selectedArmorClassMethod: "",
        manualArmorClass: null,
        armorClassBonus: 0,
        maxHp: 1,
        currentHp: 1,
        temporaryHp: 0,
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

        speed: {
          walk: 30,
          climb: 0,
          swim: 0,
          fly: 0,
          burrow: 0,
          special: ""
        },

        hitDice: []
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
        spellSourceModelVersion: 0,
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
          Ûµã‹h‘éì¶»§q«^u½Í”4(€€€€¤ì4(€€€€€Í•ÑMÑ…ÑÕÌ 4(€€€€€€€¡½½Í”½¹±ä€‘í½¹™¥œ¹¡½½Í•ô€‘í±…ÍÍ¹ÑÉä¹±…ÍÍ9…µ”ñð€‰±…ÍÌ‰ôµÕ±Ñ¥±…ÍÌÍ­¥±°‘í½¹™¥œ¹¡½½Í”€ôôô€Ä€ü€ˆˆ€è€‰Ì‰ô¹€4(€€€€€€¤ì4(4(€€€€€É•ÑÕÉ¸™…±Í”ì4(€€€ô•±Í”ì4(€€€€€±…ÍÍ¹ÑÉä¹¡½¥•Ì¹Í­¥±±AÉ½™¥¥•¹å%‘Ì€ôl4(€€€€€€€€¸¸¹¡½¥•Ì°4(€€€€€€€Í­¥±°¹¥4(€€€€€tì4(€€€ô4(4(€€€…ÁÁ±å±…ÍÍAÉ½É•ÍÍ¥½¹AÉ½™¥¥•¹¥•Ì ¤ì4(€€€…ÁÁ±å½µÁ…Ñ¥‰¥±¥Ñå±¥…Í•Ì 4(€€€€€É•…Ñ½ÉMÑ…Ñ”¹‘É…™Ð4(€€€€¤ì4(€€€µ…É­É…™Ñ¡…¹• ¤ì4((€€€É•ÑÕÉ¸ÑÉÕ”ì(€ô((€™Õ¹Ñ¥½¸Ñ½±•5Õ±Ñ¥±…ÍÍQ½½±¡½¥” (€€€±…ÍÍ%¹‘•à°(€€€Ñ½½±Y…±Õ”(€€¤ì(€€€½¹ÍÐ¥¹‘•à€ô(€€€€€5…Ñ ¹µ…à (€€€€€€€€À°(€€€€€€€5…Ñ ¹É½Õ¹ (€€€€€€€€€Í…™•9Õµ‰•È¡±…ÍÍ%¹‘•à°€À¤(€€€€€€€€¤(€€€€€€¤ì((€€€½¹ÍÐ±…ÍÍ¹ÑÉä€ô(€€€€€•Ñ±…ÍÍ¹ÑÉåÑ%¹‘•à¡¥¹‘•à¤ì((€€€¥˜€ …±…ÍÍ¹ÑÉä¤ì(€€€€€É•ÑÕÉ¸™…±Í”ì(€€€ô((€€€½¹ÍÐ½¹™¥œ€ô(€€€€€•Ñ±…ÍÍ¹ÑÉåQ½½±¡½¥•½¹™¥œ (€€€€€€€±…ÍÍ¹ÑÉä°(€€€€€€€¥¹‘•à(€€€€€€¤ì(€€€½¹ÍÐÑ½½°€ô±•…¹MÑÉ¥¹œ (€€€€€Ñ½½±Y…±Õ”(€€€€¤ì(€€€½¹ÍÐ½ÁÑ¥½¹Ì€ô(€€€€€•Ñ±…ÍÍ¹ÑÉåQ½½±¡½¥•=ÁÑ¥½¹Ì (€€€€€€€±…ÍÍ¹ÑÉä°(€€€€€€€¥¹‘•à(€€€€€€¤ì((€€€¥˜€ (€€€€€½¹™¥œ¹¡½½Í”€ðô€Àñð(€€€€€€…½ÁÑ¥½¹Ì¹¥¹±Õ‘•Ì¡Ñ½½°¤(€€€€¤ì(€€€€€É•ÑÕÉ¸™…±Í”ì(€€€ô((€€€±…ÍÍ¹ÑÉä¹¡½¥•Ì€ôì(€€€€€€¸¸¸¡±…ÍÍ¹ÑÉä¹¡½¥•Ìñðíô¤(€€€ôì((€€€½¹ÍÐ¡½¥•Ì€ô(€€€€€•Ñ±…ÍÍ¹ÑÉåMÑ½É•‘Q½½±¡½¥•Ì (€€€€€€€±…ÍÍ¹ÑÉä(€€€€€€¤ì(€€€½¹ÍÐ…±É•…‘åM•±•Ñ•€ô(€€€€€¡½¥•Ì¹¥¹±Õ‘•Ì¡Ñ½½°¤ì((€€€¥˜€¡…±É•…‘åM•±•Ñ•¤ì(€€€€€±…ÍÍ¹ÑÉä¹¡½¥•Ì(€€€€€€€€¹Ñ½½±AÉ½™¥¥•¹å%‘Ì€ô(€€€€€€€€€¡½¥•Ì¹™¥±Ñ•È ¡Ù…±Õ”¤€ôøì(€€€€€€€€€€€É•ÑÕÉ¸Ù…±Õ”€„ôôÑ½½°ì(€€€€€€€€€ô¤ì(€€€ô•±Í”¥˜€ (€€€€€¡½¥•Ì¹±•¹Ñ €øô½¹™¥œ¹¡½½Í”(€€€€¤ì(€€€€€Í•ÑMÑ…ÑÕÌ (€€€€€€€¡½½Í”½¹±ä€‘í½¹™¥œ¹¡½½Í•ô€‘í½¹™¥œ¹±…‰•±ô‘í½¹™¥œ¹¡½½Í”€ôôô€Ä€ü€ˆˆ€è€‰Ì‰ô¹€(€€€€€€¤ì((€€€€€É•ÑÕÉ¸™…±Í”ì(€€€ô•±Í”ì(€€€€€±…ÍÍ¹ÑÉä¹¡½¥•Ì(€€€€€€€€¹Ñ½½±AÉ½™¥¥•¹å%‘Ì€ôl(€€€€€€€€€€¸¸¹¡½¥•Ì°(€€€€€€€€€Ñ½½°(€€€€€€€tì(€€€ô((€€€…ÁÁ±å±…ÍÍAÉ½É•ÍÍ¥½¹AÉ½™¥¥•¹¥•Ì ¤ì(€€€…ÁÁ±å½µÁ…Ñ¥‰¥±¥Ñå±¥…Í•Ì (€€€€€É•…Ñ½ÉMÑ…Ñ”¹‘É…™Ð(€€€€¤ì(€€€µ…É­É…™Ñ¡…¹• ¤ì((€€€É•ÑÕÉ¸ÑÉÕ”ì(€ô((€™Õ¹Ñ¥½¸½±±•ÑM•Ñ¥½¸ÄÉ•…ÑÕÉ•Í½É±…ÍÍ¹ÑÉä (€€€±…ÍÍ¹ÑÉä°(€€€±…ÍÍ%¹‘•à€ô€À(€€¤ì4(€€€½¹ÍÐÑ•µÁ±…Ñ”€ô4(€€€€€É•Í½±Ù•±…ÍÍQ•µÁ±…Ñ•½É¹ÑÉä 4(€€€€€€€±…ÍÍ¹ÑÉä4(€€€€€€¤ì4(4(€€€¥˜€ …Ñ•µÁ±…Ñ”¤ì4(€€€€€É•ÑÕÉ¸mtì4(€€€ô4(4(€€€½¹ÍÐ±…ÍÍ1•Ù•°€ô4(€€€€€•Ñ±…ÍÍ¹ÑÉå1•Ù•° 4(€€€€€€€±…ÍÍ¹ÑÉä°4(€€€€€€€€Ä4(€€€€€€¤ì4(4(€€€½¹ÍÐ±…ÍÍ1…‰•°€ô4(€€€€€Í…™•¥ÍÁ±…åMÑÉ¥¹œ 4(€€€€€€€±…ÍÍ¹ÑÉäü¹±…ÍÍ9…µ”°4(€€€€€€€Ñ•µÁ±…Ñ”¹¹…µ”ñð4(€€€€€€€±…ÍÌ€‘í±…ÍÍ%¹‘•à€¬€Åõ€4(€€€€€€¤ì4(4(€€€½¹ÍÐ‘•™…Õ±Ñ±…ÍÌ€ô4(€€€€€™¥¹‘•™…Õ±Ñ±…ÍÍ•™¥¹¥Ñ¥½¸ 4(€€€€€€€±…ÍÍ¹ÑÉäü¹±…ÍÍ%°4(€€€€€€€±…ÍÍ¹ÑÉäü¹±…ÍÍ9…µ”4(€€€€€€¤ì4(4(€€€½¹ÍÐ±…ÍÍ•…ÑÕÉ•Ì€ô4(€€€€€‘•™…Õ±Ñ±…ÍÌ4(€€€€€€€€ü•Ñ•™…Õ±Ñ±…ÍÍ•…ÑÕÉ•ÍQ¡É½Õ¡1•Ù•° 4(€€€€€€€€€€€‘•™…Õ±Ñ±…ÍÌ°4(€€€€€€€€€€€±…ÍÍ1•Ù•°4(€€€€€€€€€€¤4(€€€€€€€€è½±±•ÑM•Ñ¥½¸ÄÉ•…ÑÕÉ•Ì 4(€€€€€€€€€€€Ñ•µÁ±…Ñ”°4(€€€€€€€€€€€±…ÍÍ1•Ù•°°4(€€€€€€€€€€€€‰±…ÍÌˆ4(€€€€€€€€€€¤ì4(4(€€€½¹ÍÐÍÕ‰±…ÍÍ•…ÑÕÉ•Ì€ô4(€€€€€½±±•ÑM•Ñ¥½¸ÄÉ•…ÑÕÉ•Ì 4(€€€€€€€•Ñ±…ÍÍ¹ÑÉåMÕ‰±…ÍÍQ•µÁ±…Ñ” 4(€€€€€€€€€±…ÍÍ¹ÑÉä4(€€€€€€€€¤°4(€€€€€€€±…ÍÍ1•Ù•°°4(€€€€€€€€‰ÍÕ‰±…ÍÌˆ4(€€€€€€¤ì4(4(€€€É•ÑÕÉ¸l4(€€€€€€¸¸¹±…ÍÍ•…ÑÕÉ•Ì°4(€€€€€€¸¸¹ÍÕ‰±…ÍÍ•…ÑÕÉ•Ì4(€€€t¹µ…À ¡™•…ÑÕÉ”¤€ôøì4(€€€€€½¹ÍÐ±…ÍÍ¹ÑÉå%€ô4(€€€€€€€•Ñ±…ÍÍAÉ½É•ÍÍ¥½¹¹ÑÉå-•ä 4(€€€€€€€€€±…ÍÍ¹ÑÉä°4(€€€€€€€€€±…ÍÍ%¹‘•à4(€€€€€€€€¤ì4(4(€€€€€É•ÑÕÉ¸ì4(€€€€€€€€¸¸¹™•…ÑÕÉ”°4(€€€€€€€±…ÍÍ%¹‘•à°4(€€€€€€€±…ÍÍ¹ÑÉå%°4(€€€€€€€¡½¥•-•äè€‘í±…ÍÍ¹ÑÉå%‘ôè‘í™•…ÑÕÉ”¹¥‘õ€°4(€€€€€€€±…ÍÍ%è4(€€€€€€€€€±…ÍÍ¹ÑÉäü¹±…ÍÍ%ñð4(€€€€€€€€€Ñ•µÁ±…Ñ”¹¥ñð4(€€€€€€€€€€ˆˆ°4(€€€€€€€±…ÍÍ9…µ”è±…ÍÍ1…‰•°°4(€€€€€€€±…ÍÍ1•Ù•°4(€€€€€ôì(€€€ô¤ì(€ô((€™Õ¹Ñ¥½¸•ÑA•¹‘¥¹±…ÍÍ•…ÑÕÉ•¡½¥•]…É¹¥¹Ì (€€€¡…É…Ñ•È€ôÉ•…Ñ½ÉMÑ…Ñ”¹‘É…™Ð(€€¤ì(€€€É•ÑÕÉ¸•Ñ±…ÍÍAÉ½É•ÍÍ¥½¹¹ÑÉ¥•Ì (€€€€€¡…É…Ñ•È(€€€€¤¹™±…Ñ5…À ¡±…ÍÍ¹ÑÉä°±…ÍÍ%¹‘•à¤€ôøì(€€€€€É•ÑÕÉ¸½±±•ÑM•Ñ¥½¸ÄÉ•…ÑÕÉ•Í½É±…ÍÍ¹ÑÉä (€€€€€€€±…ÍÍ¹ÑÉä°(€€€€€€€±…ÍÍ%¹‘•à(€€€€€€¤¹™±…Ñ5…À ¡™•…ÑÕÉ”¤€ôøì(€€€€€€€½¹ÍÐ½ÁÑ¥½¹M½ÕÉ”€ô(€€€€€€€€€±•…¹MÑÉ¥¹œ (€€€€€€€€€€€™•…ÑÕÉ”¹½ÁÑ¥½¹M½ÕÉ”(€€€€€€€€€€¤¹Ñ½1½Ý•É…Í” ¤ì((€€€€€€€¥˜€ (€€€€€€€€€™•…ÑÕÉ”¹ÑåÁ”€„ôô€‰¡½¥”ˆñð(€€€€€€€€€l(€€€€€€€€€€€€‰ÍÕ‰±…ÍÍ•Ìˆ°(€€€€€€€€€€€€‰…Í¥½É™•…Ðˆ(€€€€€€€€€t¹¥¹±Õ‘•Ì¡½ÁÑ¥½¹M½ÕÉ”¤(€€€€€€€€¤ì(€€€€€€€€€É•ÑÕÉ¸mtì(€€€€€€€ô((€€€€€€€½¹ÍÐ½ÁÑ¥½¹Ì€ô(€€€€€€€€€•ÑM•Ñ¥½¸ÄÉ•…ÑÕÉ•¡½¥•=ÁÑ¥½¹Ì (€€€€€€€€€€€™•…ÑÕÉ”(€€€€€€€€€€¤ì(€€€€€€€½¹ÍÐÉ•ÅÕ¥É•€ô(€€€€€€€€€•ÑM•Ñ¥½¸ÄÉ•…ÑÕÉ•¡½½Í•½Õ¹Ð (€€€€€€€€€€€™•…ÑÕÉ”(€€€€€€€€€€¤ì(€€€€€€€½¹ÍÐÍ•±•Ñ•€ô(€€€€€€€€€•ÑM•Ñ¥½¸ÄÉ•…ÑÕÉ•MÑ½É•‘¡½¥•Ì (€€€€€€€€€€€™•…ÑÕÉ”(€€€€€€€€€€¤¹™¥±Ñ•È ¡¡½¥”¤€ôøì(€€€€€€€€€€€É•ÑÕÉ¸½ÁÑ¥½¹Ì¹¥¹±Õ‘•Ì¡¡½¥”¤ì(€€€€€€€€€ô¤ì((€€€€€€€¥˜€ (€€€€€€€€€€…½ÁÑ¥½¹Ì¹±•¹Ñ ñð(€€€€€€€€€Í•±•Ñ•¹±•¹Ñ €øôÉ•ÅÕ¥É•(€€€€€€€€¤ì(€€€€€€€€€É•ÑÕÉ¸mtì(€€€€€€€ô((€€€€€€€É•ÑÕÉ¸l(€€€€€€€€€€‘í™•…ÑÕÉ”¹±…ÍÍ9…µ”ñð±…ÍÍ¹ÑÉä¹±…ÍÍ9…µ”ñð€‰±…ÍÌ‰ô±…ÍÌ±•Ù•°€‘í™•…ÑÕÉ”¹±•Ù•±ô¡…Ì„Á•¹‘¥¹œ€‘í™•…ÑÕÉ”¹¹…µ•ô¡½¥”€ ‘íÍ•±•Ñ•¹±•¹Ñ¡ô¼‘íÉ•ÅÕ¥É•‘ô¤¹€(€€€€€€€tì(€€€€€ô¤ì(€€€ô¤ì(€ô((€™Õ¹Ñ¥½¸•Ñ±…ÍÍAÉ½É•ÍÍ¥½¹A•¹‘¥¹¡½¥•]…É¹¥¹Ì (€€€¡…É…Ñ•È€ôÉ•…Ñ½ÉMÑ…Ñ”¹‘É…™Ð(€€¤ì(€€€½¹ÍÐÝ…É¹¥¹Ì€ôl(€€€€€€¸¸¹•ÑA•¹‘¥¹±…ÍÍ•…ÑÕÉ•¡½¥•]…É¹¥¹Ì (€€€€€€€¡…É…Ñ•È(€€€€€€¤°(€€€€€€¸¸¹•Ñ5Õ±Ñ¥±…ÍÍA•¹‘¥¹M­¥±±¡½¥•]…É¹¥¹Ì (€€€€€€€¡…É…Ñ•È(€€€€€€¤°(€€€€€€¸¸¹•Ñ5Õ±Ñ¥±…ÍÍA•¹‘¥¹Q½½±¡½¥•]…É¹¥¹Ì (€€€€€€€¡…É…Ñ•È(€€€€€€¤(€€€tì((€€€•Ñ5Õ±Ñ¥±…ÍÍMÕµµ…Éå¹ÑÉ¥•Ì (€€€€€¡…É…Ñ•È(€€€€¤¹™½É…  ¡•¹ÑÉä¤€ôøì(€€€€€½¹ÍÐÍÕ‰±…ÍÍ=ÁÑ¥½¹Ì€ô(€€€€€€€ÉÉ…ä¹¥ÍÉÉ…ä (€€€€€€€€€•¹ÑÉä¹Ñ•µÁ±…Ñ”ü¹ÍÕ‰±…ÍÍ•Ì(€€€€€€€€¤(€€€€€€€€€€ü•¹ÑÉä¹Ñ•µÁ±…Ñ”¹ÍÕ‰±…ÍÍ•Ì(€€€€€€€€€€èmtì((€€€€€¥˜€ (€€€€€€€ÍÕ‰±…ÍÍ=ÁÑ¥½¹Ì¹±•¹Ñ €ø€À€˜˜(€€€€€€€•¹ÑÉä¹±…ÍÍ1•Ù•°€øô(€€€€€€€€€•¹ÑÉä¹ÍÕ‰±…ÍÍ1•Ù•°€˜˜(€€€€€€€€…•¹ÑÉä¹ÍÕ‰±…ÍÍ9…µ”(€€€€€€¤ì(€€€€€€€Ý…É¹¥¹Ì¹ÁÕÍ  (€€€€€€€€€€‘í•¹ÑÉä¹±…ÍÍ9…µ•ô¡…Ì„Á•¹‘¥¹œÍÕ‰±…ÍÌ¡½¥”…Ð±…ÍÌ±•Ù•°€‘í•¹ÑÉä¹ÍÕ‰±…ÍÍ1•Ù•±ô¹€(€€€€€€€€¤ì(€€€€€ô(€€€ô¤ì((€€€•ÑU¹±½­•‘•…Ñ¡½¥•M±½ÑÌ (€€€€€¡…É…Ñ•È(€€€€¤(€€€€€€¹™¥±Ñ•È ¡Í±½Ð¤€ôøì(€€€€€€€É•ÑÕÉ¸€ (€€€€€€€€€€…Í±½Ð¹Í•±•Ñ•‘5½‘”ñð(€€€€€€€€€€ (€€€€€€€€€€€Í±½Ð¹Í•±•Ñ•‘5½‘”€ôôô€‰™•…Ðˆ€˜˜(€€€€€€€€€€€€…Í±½Ð¹Í•±•Ñ•‘•…Ñ%(€€€€€€€€€€¤(€€€€€€€€¤ì(€€€€€ô¤(€€€€€€¹™½É…  ¡Í±½Ð¤€ôøì(€€€€€€€Ý…É¹¥¹Ì¹ÁÕÍ  (€€€€€€€€€€‘íÍ±½Ð¹±…ÍÍ9…µ•ô±…ÍÌ±•Ù•°€‘íÍ±½Ð¹±…ÍÍ1•Ù•±ô¡…Ì„Á•¹‘¥¹œM$½È™•…Ð¡½¥”¹€(€€€€€€€€¤ì(€€€€€ô¤ì((€€€É•ÑÕÉ¸Õ¹¥ÅÕ•±•…¹ÉÉ…ä (€€€€€Ý…É¹¥¹Ì(€€€€¤ì(€ô((€™Õ¹Ñ¥½¸ÁÉÕ¹•‰…¹‘½¹•‘±…ÍÍ•…ÑÕÉ•¡½¥•Ì (€€€¡…É…Ñ•È€ôÉ•…Ñ½ÉMÑ…Ñ”¹‘É…™Ð(€€¤ì(€€€½¹ÍÐ…Ñ¥Ù•¡½¥•%‘Ì€ô¹•ÜM•Ð ¤ì(€€€½¹ÍÐÁÉ¥µ…Éå¡½¥•%‘Ì€ô¹•ÜM•Ð ¤ì(€€€½¹ÍÐÉ•µ½Ù•‘•…Ñ%‘Ì€ômtì((€€€•Ñ±…ÍÍAÉ½É•ÍÍ¥½¹¹ÑÉ¥•Ì (€€€€€¡…É…Ñ•È(€€€€¤¹™½É…  ¡±…ÍÍ¹ÑÉä°±…ÍÍ%¹‘•à¤€ôøì(€€€€€½¹ÍÐ…Ù…¥±…‰±•%‘Ì€ô¹•ÜM•Ð ¤ì((€€€€€½±±•ÑM•Ñ¥½¸ÄÉ•…ÑÕÉ•Í½É±…ÍÍ¹ÑÉä (€€€€€€€±…ÍÍ¹ÑÉä°(€€€€€€€±…ÍÍ%¹‘•à(€€€€€€¤¹™½É…  ¡™•…ÑÕÉ”¤€ôøì(€€€€€€€…Ù…¥±…‰±•%‘Ì¹…‘¡™•…ÑÕÉ”¹¥¤ì(€€€€€€€…Ù…¥±…‰±•%‘Ì¹…‘ (€€€€€€€€€•ÑM•Ñ¥½¸ÄÉ•…ÑÕÉ•¡½¥•-•ä (€€€€€€€€€€€™•…ÑÕÉ”(€€€€€€€€€€¤(€€€€€€€€¤ì(€€€€€ô¤ì((€€€€€•ÑU¹±½­•‘•…Ñ¡½¥•M±½ÑÌ (€€€€€€€¡…É…Ñ•È(€€€€€€¤(€€€€€€€€¹™¥±Ñ•È ¡Í±½Ð¤€ôøì(€€€€€€€€€É•ÑÕÉ¸€ (€€€€€€€€€€€Í±½Ð¹±…ÍÍ¹ÑÉå%€ôôô(€€€€€€€€€€€•Ñ±…ÍÍAÉ½É•ÍÍ¥½¹¹ÑÉå-•ä (€€€€€€€€€€€€€±…ÍÍ¹ÑÉä°(€€€€€€€€€€€€€±…ÍÍ%¹‘•à(€€€€€€€€€€€€¤(€€€€€€€€€€¤ì(€€€€€€€ô¤(€€€€€€€€¹™½É…  ¡Í±½Ð¤€ôøì(€€€€€€€€€…Ù…¥±…‰±•%‘Ì¹…‘¡Í±½Ð¹¥¤ì(€€€€€€€€€…Ù…¥±…‰±•%‘Ì¹…‘¡Í±½Ð¹±•…å%¤ì(€€€€€€€€€…Ù…¥±…‰±•%‘Ì¹…‘¡Í±½Ð¹™•…ÑÕÉ•%¤ì(€€€€€€€ô¤ì((€€€€€…Ù…¥±…‰±•%‘Ì¹‘•±•Ñ” ˆˆ¤ì((€€€€€…Ù…¥±…‰±•%‘Ì¹™½É…  ¡¥¤€ôøì(€€€€€€€…Ñ¥Ù•¡½¥•%‘Ì¹…‘¡¥¤ì((€€€€€€€¥˜€ (€€€€€€€€€¥ÍMÑ…ÉÑ¥¹±…ÍÍ¹ÑÉä (€€€€€€€€€€€±…ÍÍ¹ÑÉä°(€€€€€€€€€€€¡…É…Ñ•È°(€€€€€€€€€€€±…ÍÍ%¹‘•à(€€€€€€€€€€¤(€€€€€€€€¤ì(€€€€€€€€€ÁÉ¥µ…Éå¡½¥•%‘Ì¹…‘¡¥¤ì(€€€€€€€ô(€€€€€ô¤ì((€€€€€±…ÍÍ¹ÑÉä¹¡½¥•Ì€ôì(€€€€€€€€¸¸¸¡±…ÍÍ¹ÑÉä¹¡½¥•Ìñðíô¤(€€€€€ôì((€€€€€½¹ÍÐÍÑ½É•‘¡½¥•Ì€ô(€€€€€€€¹½Éµ…±¥é•±…ÍÍ¡½¥•5…À (€€€€€€€€€±…ÍÍ¹ÑÉä¹¡½¥•Ì(€€€€€€€€€€€€¹±…ÍÍ•…ÑÕÉ•Ì(€€€€€€€€¤ì((€€€€€=‰©•Ð¹­•åÌ¡ÍÑ½É•‘¡½¥•Ì¤(€€€€€€€€¹™½É…  ¡¡½¥•%¤€ôøì(€€€€€€€€€¥˜€¡…Ù…¥±…‰±•%‘Ì¹¡…Ì¡¡½¥•%¤¤ì(€€€€€€€€€€€É•ÑÕÉ¸ì(€€€€€€€€€ô((€€€€€€€€€ÍÑ½É•‘¡½¥•Ím¡½¥•%‘t(€€€€€€€€€€€€¹™¥±Ñ•È ¡Ù…±Õ”¤€ôøì(€€€€€€€€€€€€€É•ÑÕÉ¸Ù…±Õ”¹ÍÑ…ÉÑÍ]¥Ñ  (€€€€€€€€€€€€€€€€‰™•…Ðèˆ(€€€€€€€€€€€€€€¤ì(€€€€€€€€€€€ô¤(€€€€€€€€€€€€¹™½É…  ¡Ù…±Õ”¤€ôøì(€€€€€€€€€€€€€É•µ½Ù•‘•…Ñ%‘Ì¹ÁÕÍ  (€€€€€€€€€€€€€€€Ù…±Õ”¹Í±¥” (€€€€€€€€€€€€€€€€€€‰™•…Ðèˆ¹±•¹Ñ (€€€€€€€€€€€€€€€€¤(€€€€€€€€€€€€€€¤ì(€€€€€€€€€€€ô¤ì((€€€€€€€€€‘•±•Ñ”ÍÑ½É•‘¡½¥•Ím¡½¥•%‘tì(€€€€€€€ô¤ì((€€€€€±…ÍÍ¹ÑÉä¹¡½¥•Ì(€€€€€€€€¹±…ÍÍ•…ÑÕÉ•Ì€ô(€€€€€€€€€ÍÑ½É•‘¡½¥•Ìì(€€€ô¤ì((€€€½¹ÍÐ½µÁ…Ñ¥‰¥±¥Ñå¡½¥•Ì€ô(€€€€€¹½Éµ…±¥é•±…ÍÍ¡½¥•5…À (€€€€€€€¡…É…Ñ•È¹±…ÍÍ¡½¥•Ì(€€€€€€¤ì((€€€=‰©•Ð¹­•åÌ¡½µÁ…Ñ¥‰¥±¥Ñå¡½¥•Ì¤(€€€€€€¹™½É…  ¡¡½¥•%¤€ôøì(€€€€€€€¥˜€ (€€€€€€€€€ÁÉ¥µ…Éå¡½¥•%‘Ì¹¡…Ì¡¡½¥•%¤(€€€€€€€€¤ì(€€€€€€€€€É•ÑÕÉ¸ì(€€€€€€€ô((€€€€€€€½µÁ…Ñ¥‰¥±¥Ñå¡½¥•Ím¡½¥•%‘t(€€€€€€€€€€¹™¥±Ñ•È ¡Ù…±Õ”¤€ôøì(€€€€€€€€€€€É•ÑÕÉ¸Ù…±Õ”¹ÍÑ…ÉÑÍ]¥Ñ  (€€€€€€€€€€€€€€‰™•…Ðèˆ(€€€€€€€€€€€€¤ì(€€€€€€€€€ô¤(€€€€€€€€€€¹™½É…  ¡Ù…±Õ”¤€ôøì(€€€€€€€€€€€É•µ½Ù•‘•…Ñ%‘Ì¹ÁÕÍ  (€€€€€€€€€€€€€Ù…±Õ”¹Í±¥” (€€€€€€€€€€€€€€€€‰™•…Ðèˆ¹±•¹Ñ (€€€€€€€€€€€€€€¤(€€€€€€€€€€€€¤ì(€€€€€€€€€ô¤ì((€€€€€€€‘•±•Ñ”½µÁ…Ñ¥‰¥±¥Ñå¡½¥•Íl(€€€€€€€€€¡½¥•%(€€€€€€€tì(€€€€€ô¤ì((€€€¡…É…Ñ•È¹±…ÍÍ¡½¥•Ì€ô(€€€€€½µÁ…Ñ¥‰¥±¥Ñå¡½¥•Ìì((€€€É•µ½Ù•‘•…Ñ%‘Ì¹™½É…  (€€€€€É•µ½Ù•M•Ñ¥½¸ÄÉÍ¥•…Ñ%™U¹ÕÍ•(€€€€¤ì((€€€É•ÑÕÉ¸…Ñ¥Ù•¡½¥•%‘Ìì(€ô((€™Õ¹Ñ¥½¸ÁÉÕ¹•I•µ½Ù•‘±…ÍÍMÁ•±±M½ÕÉ•Ì (€€€¡…É…Ñ•È€ôÉ•…Ñ½ÉMÑ…Ñ”¹‘É…™Ð(€€¤ì(€€€½¹ÍÐÍÑ½É”€ô(€€€€€•ÑM•Ñ¥½¸ÄÙ±…ÍÍM½ÕÉ•MÑ½É” (€€€€€€€¡…É…Ñ•È(€€€€€€¤ì(€€€½¹ÍÐ…Ñ¥Ù•M½ÕÉ•-•åÌ€ô¹•ÜM•Ð (€€€€€•ÑMÁ•±±…ÍÑ¥¹±…ÍÍ=ÁÑ¥½¹Ì (€€€€€€€¡…É…Ñ•È(€€€€€€¤(€€€€€€€€¹µ…À¡•ÑM•Ñ¥½¸ÄÙM½ÕÉ•-•ä¤(€€€€€€€€¹™¥±Ñ•È¡	½½±•…¸¤(€€€€¤ì(€€€½¹ÍÐÉ•µ½Ù•‘M½ÕÉ•-•åÌ€ômtì((€€€=‰©•Ð¹­•åÌ¡ÍÑ½É”¤(€€€€€€¹™½É…  ¡Í½ÕÉ•-•ä¤€ôøì(€€€€€€€¥˜€ (€€€€€€€€€…Ñ¥Ù•M½ÕÉ•-•åÌ¹¡…Ì¡Í½ÕÉ•-•ä¤(€€€€€€€€¤ì(€€€€€€€€€É•ÑÕÉ¸ì(€€€€€€€ô((€€€€€€€É•µ½Ù•‘M½ÕÉ•-•åÌ¹ÁÕÍ  (€€€€€€€€€Í½ÕÉ•-•ä(€€€€€€€€¤ì(€€€€€€€‘•±•Ñ”ÍÑ½É•mÍ½ÕÉ•-•åtì(€€€€€ô¤ì((€€€¥˜€ (€€€€€¡…É…Ñ•È€ôôôÉ•…Ñ½ÉMÑ…Ñ”¹‘É…™Ð€˜˜(€€€€€É•µ½Ù•‘M½ÕÉ•-•åÌ¹±•¹Ñ (€€€€¤ì(€€€€€Íå¹M•Ñ¥½¸ÄÙ1•…åMÁ•±±±¥…Í•Ì ¤ì(€€€ô((€€€É•ÑÕÉ¸É•µ½Ù•‘M½ÕÉ•-•åÌì(€ô((€™Õ¹Ñ¥½¸É•™É•Í¡±…ÍÍAÉ½É•ÍÍ¥½¹•É¥Ù•‘Y…±Õ•Ì (€€€½ÁÑ¥½¹Ì€ôíô(€€¤ì4(€€€½¹ÍÐ‘É…™Ð€ô4(€€€€€É•…Ñ½ÉMÑ…Ñ”¹‘É…™Ðì4(4(€€€½¹ÍÐÑ½Ñ…±1•Ù•°€ô(€€€€€É•…±Õ±…Ñ•±…ÍÍQ½Ñ…±1•Ù•° (€€€€€€€‘É…™Ð(€€€€€€¤ì((€€€ÁÉÕ¹•‰…¹‘½¹•‘±…ÍÍ•…ÑÕÉ•¡½¥•Ì (€€€€€‘É…™Ð(€€€€¤ì((€€€ÁÉÕ¹•I•µ½Ù•‘±…ÍÍMÁ•±±M½ÕÉ•Ì (€€€€€‘É…™Ð(€€€€¤ì(4(€€€‘É…™Ð¹½µ‰…Ð¹ÁÉ½™¥¥•¹å	½¹ÕÌ€ô4(€€€€€•Ñ•¹•É¥AÉ½™¥¥•¹å	½¹ÕÌ 4(€€€€€€€Ñ½Ñ…±1•Ù•°4(€€€€€€¤ì4(4(€€€‘É…™Ð¹½µ‰…Ð¹¡¥Ñ¥”€ô4(€€€€€…±Õ±…Ñ•¡…É…Ñ•É!¥Ñ¥” 4(€€€€€€€‘É…™Ð4(€€€€€€¤ì4(4(€€€…ÁÁ±å±…ÍÍAÉ½É•ÍÍ¥½¹AÉ½™¥¥•¹¥•Ì 4(€€€€€‘É…™Ð4(€€€€¤ì4(4(€€€¥˜€ 4(€€€€€½ÁÑ¥½¹Ì¹É•™É•Í¡MÁ•¥•Ì€„ôô™…±Í”4(€€€€¤ì4(€€€€€±•…ÉM•Ñ¥½¸ÄÅMÁ•¥•Í5•¡…¹¥Ì ¤ì4(€€€€€…ÁÁ±åM•Ñ¥½¸ÄÅMÁ•¥•Í5•¡…¹¥Ì ¤ì4(€€€ô4(4(€€€…ÁÁ±åM•±•Ñ•‘•…Ñ5•¡…¹¥Ì ¤ì4(4(€€€É•™É•Í¡M•±•Ñ•‘±…ÍÍ•…ÑÕÉ•Ì ¤ì4(4(€€€…±Õ±…Ñ•M•Ñ¥½¸ÄÙMÁ•±±…ÍÑ¥¹Y…±Õ•Ì¡ì4(€€€€€µ…É­É…™Ðè™…±Í”4(€€€ô¤ì4(4(€€€…ÁÁ±å½µÁ…Ñ¥‰¥±¥Ñå±¥…Í•Ì 4(€€€€€‘É…™Ð4(€€€€¤ì4(4(€€€É•ÑÕÉ¸Ñ½Ñ…±1•Ù•°ì4(€ô4(4(€™Õ¹Ñ¥½¸ÑÉå‘‘5Õ±Ñ¥±…ÍÍ±…ÍÌ 4(€€€±…ÍÍ%4(€€¤ì4(€€€½¹ÍÐ±•…¹±…ÍÍ%€ô4(€€€€€±•…¹MÑÉ¥¹œ¡±…ÍÍ%¤ì4(4(€€€¥˜€ …±•…¹±…ÍÍ%¤ì4(€€€€€É•ÑÕÉ¸ì4(€€€€€€€½¬è™…±Í”°4(€€€€€€€É•…Í½¸è€‰•µÁÑäµ±…ÍÌµ¥ˆ°4(€€€€€€€±…ÍÍ%è€ˆˆ°4(€€€€€€€±…ÍÍ9…µ”è€ˆˆ°4(€€€€€€€µ•ÍÍ…”è4(€€€€€€€€€€‰¡½½Í”„±…ÍÌÑ¼…‘™¥ÉÍÐ¸ˆ°4(€€€€€€€™…¥±•‘AÉ•É•ÅÕ¥Í¥Ñ•Ìèmt4(€€€€€ôì4(€€€ô4(4(€€€½¹ÍÐÍ•±•Ñ•‘±…ÍÌ€ô4(€€€€€•Ñ±±±…ÍÍQ•µÁ±…Ñ•Ì ¤¹™¥¹ ¡±…ÍÍ…Ñ„¤€ôøì4(€€€€€€€É•ÑÕÉ¸±…ÍÍ…Ñ„¹¥€ôôô±•…¹±…ÍÍ%ì4(€€€€€ô¤ì4(4(€€€¥˜€ …Í•±•Ñ•‘±…ÍÌ¤ì4(€€€€€É•ÑÕÉ¸ì4(€€€€€€€½¬è™…±Í”°4(€€€€€€€É•…Í½¸è€‰±…ÍÌµ¹½Ðµ™½Õ¹ˆ°4(€€€€€€€±…ÍÍ%è±•…¹±…ÍÍ%°4(€€€€€€€±…ÍÍ9…µ”è€ˆˆ°4(€€€€€€€µ•ÍÍ…”è4(€€€€€€€€€€‰Q¡…Ð±…ÍÌ½Õ±¹½Ð‰”™½Õ¹¸ˆ°4(€€€€€€€™…¥±•‘AÉ•É•ÅÕ¥Í¥Ñ•Ìèmt4(€€€€€ôì4(€€€ô4(4(€€€½¹ÍÐ±…ÍÍ•Ì€ô4(€€€€€•Ñ±…ÍÍAÉ½É•ÍÍ¥½¹¹ÑÉ¥•Ì ¤ì4(4(€€€½¹ÍÐ•á¥ÍÑ¥¹±…ÍÌ€ô4(€€€€€±…ÍÍ•Ì¹™¥¹ ¡±…ÍÍ¹ÑÉä¤€ôøì4(€€€€€€€½¹ÍÐÑ•µÁ±…Ñ”€ô4(€€€€€€€€€É•Í½±Ù•±…ÍÍQ•µÁ±…Ñ•½É¹ÑÉä 4(€€€€€€€€€€€±…ÍÍ¹ÑÉä4(€€€€€€€€€€¤ì4(4(€€€€€€€É•ÑÕÉ¸€ 4(€€€€€€€€€±…ÍÍ¹ÑÉäü¹±…ÍÍ%€ôôôÍ•±•Ñ•‘±…ÍÌ¹¥ñð4(€€€€€€€€€Ñ•µÁ±…Ñ”ü¹¥€ôôôÍ•±•Ñ•‘±…ÍÌ¹¥4(€€€€€€€€¤ì4(€€€€€ô¤ì4(4(€€€¥˜€¡•á¥ÍÑ¥¹±…ÍÌ¤ì4(€€€€€É•ÑÕÉ¸ì4(€€€€€€€½¬è™…±Í”°4(€€€€€€€É•…Í½¸è€‰‘ÕÁ±¥…Ñ”µ±…ÍÌˆ°4(€€€€€€€±…ÍÍ%èÍ•±•Ñ•‘±…ÍÌ¹¥°4(€€€€€€€±…ÍÍ9…µ”èÍ•±•Ñ•‘±…ÍÌ¹¹…µ”°4(€€€€€€€µ•ÍÍ…”è4(€€€€€€€€€€‰Q¡…Ð±…ÍÌ¥Ì…±É•…‘ä¥¸Ñ¡¥Ì¡…É…Ñ•ÈÌÁÉ½É•ÍÍ¥½¸¸ˆ°4(€€€€€€€™…¥±•‘AÉ•É•ÅÕ¥Í¥Ñ•Ìèmt4(€€€€€ôì4(€€€ô4(4(€€€½¹ÍÐÕÉÉ•¹ÑQ½Ñ…°€ô4(€€€€€É•…±Õ±…Ñ•±…ÍÍQ½Ñ…±1•Ù•° 4(€€€€€€€É•…Ñ½ÉMÑ…Ñ”¹‘É…™Ð4(€€€€€€¤ì4(4(€€€¥˜€¡ÕÉÉ•¹ÑQ½Ñ…°€øô€ÈÀ¤ì4(€€€€€É•ÑÕÉ¸ì4(€€€€€€€½¬è™…±Í”°4(€€€€€€€É•…Í½¸è€‰µ…á¥µÕ´µ±•Ù•°ˆ°4(€€€€€€€±…ÍÍ%èÍ•±•Ñ•‘±…ÍÌ¹¥°4(€€€€€€€±…ÍÍ9…µ”èÍ•±•Ñ•‘±…ÍÌ¹¹…µ”°4(€€€€€€€µ•ÍÍ…”è4(€€€€€€€€€€‰¡…É…Ñ•È¥Ì…±É•…‘ä±•Ù•°€ÈÀ¸ˆ°4(€€€€€€€™…¥±•‘AÉ•É•ÅÕ¥Í¥Ñ•Ìèmt4(€€€€€ôì4(€€€ô4(4(€€€¥˜€¡±…ÍÍ•Ì¹±•¹Ñ ¤ì4(€€€€€½¹ÍÐ™…¥±•‘AÉ•É•ÅÕ¥Í¥Ñ•Ì€ô4(€€€€€€€•Ñ5Õ±Ñ¥±…ÍÍAÉ•É•ÅÕ¥Í¥Ñ•I•ÍÕ±ÑÌ 4(€€€€€€€€€É•…Ñ½ÉMÑ…Ñ”¹‘É…™Ð°4(€€€€€€€€€Í•±•Ñ•‘±…ÍÌ¹¥4(€€€€€€€€¤¹™¥±Ñ•È ¡É•ÍÕ±Ð¤€ôøì4(€€€€€€€€€É•ÑÕÉ¸€…É•ÍÕ±Ð¹µ•Ðì4(€€€€€€€ô¤ì4(4(€€€€€¥˜€¡™…¥±•‘AÉ•É•ÅÕ¥Í¥Ñ•Ì¹±•¹Ñ ¤ì4(€€€€€€€½¹ÍÐ™…¥±ÕÉ•MÕµµ…Éä€ô4(€€€€€€€€€™…¥±•‘AÉ•É•ÅÕ¥Í¥Ñ•Ì4(€€€€€€€€€€€€¹µ…À 4(€€€€€€€€€€€€€™½Éµ…Ñ5Õ±Ñ¥±…ÍÍAÉ•É•ÅÕ¥Í¥Ñ•…¥±ÕÉ”4(€€€€€€€€€€€€¤4(€€€€€€€€€€€€¹©½¥¸ ˆì€ˆ¤ì4(4(€€€€€€€É•ÑÕÉ¸ì4(€€€€€€€€€½¬è™…±Í”°4(€€€€€€€€€É•…Í½¸è€‰ÁÉ•É•ÅÕ¥Í¥Ñ•Ìµ¹½Ðµµ•Ðˆ°4(€€€€€€€€€±…ÍÍ%èÍ•±•Ñ•‘±…ÍÌ¹¥°4(€€€€€€€€€±…ÍÍ9…µ”èÍ•±•Ñ•‘±…ÍÌ¹¹…µ”°4(€€€€€€€€€µ•ÍÍ…”è4(€€€€€€€€€€€5Õ±Ñ¥±…ÍÌÁÉ•É•ÅÕ¥Í¥Ñ•Ì…É”¹½Ðµ•Ðè€‘í™…¥±ÕÉ•MÕµµ…Éåô¹€°4(€€€€€€€€€™…¥±•‘AÉ•É•ÅÕ¥Í¥Ñ•Ìè4(€€€€€€€€€€€±½¹•…Ñ„ 4(€€€€€€€€€€€€€™…¥±•‘AÉ•É•ÅÕ¥Í¥Ñ•Ì4(€€€€€€€€€€€€¤4(€€€€€€€ôì4(€€€€€ô4(€€€ô4(4(€€€¥˜€ …±…ÍÍ•Ì¹±•¹Ñ ¤ì4(€€€€€É•…Ñ½ÉMÑ…Ñ”¹‘É…™Ð4(€€€€€€€€¹±…ÍÍAÉ½É•ÍÍ¥½¸4(€€€€€€€€¹±…ÍÍ•Ì€ôl4(€€€€€€€€€É•…Ñ•±…ÍÍAÉ½É•ÍÍ¥½¹¹ÑÉä 4(€€€€€€€€€€€Í•±•Ñ•‘±…ÍÌ°4(€€€€€€€€€€€€Ä4(€€€€€€€€€€¤4(€€€€€€€tì4(€€€ô•±Í”ì4(€€€€€±…ÍÍ•Ì¹ÁÕÍ  4(€€€€€€€É•…Ñ•±…ÍÍAÉ½É•ÍÍ¥½¹¹ÑÉä 4(€€€€€€€€€Í•±•Ñ•‘±…ÍÌ°4(€€€€€€€€€€Ä4(€€€€€€€€¤4(€€€€€€¤ì4(€€€ô4(4(€€€½¹ÍÐÑ½Ñ…±1•Ù•°€ô4(€€€€€É•™É•Í¡±…ÍÍAÉ½É•ÍÍ¥½¹•É¥Ù•‘Y…±Õ•Ì ¤ì4(4(€€€µ…É­É…™Ñ¡…¹• ¤ì4(4(€€€É•ÑÕÉ¸ì4(€€€€€½¬èÑÉÕ”°4(€€€€€É•…Í½¸è€‰…‘‘•ˆ°4(€€€€€±…ÍÍ%èÍ•±•Ñ•‘±…ÍÌ¹¥°4(€€€€€±…ÍÍ9…µ”èÍ•±•Ñ•‘±…ÍÌ¹¹…µ”°4(€€€€€Ñ½Ñ…±1•Ù•°°4(€€€€€µ•ÍÍ…”è4(€€€€€€€€‘íÍ•±•Ñ•‘±…ÍÌ¹¹…µ•ô…‘‘•¸UÍ”1•Ù•°UÀ]½É­™±½ÜÑ¼…‘€‘íÍ•±•Ñ•‘±…ÍÌ¹¹…µ•ô±•Ù•±Ì¸Q½Ñ…°±•Ù•°¥Ì¹½Ü€‘íÑ½Ñ…±1•Ù•±ô¹€°4(€€€€€™…¥±•‘AÉ•É•ÅÕ¥Í¥Ñ•Ìèmt4(€€€ôì4(€ô4(4(€™Õ¹Ñ¥½¸…‘‘5Õ±Ñ¥±…ÍÍ±…ÍÌ 4(€€€±…ÍÍ%4(€€¤ì4(€€€½¹ÍÐÉ•ÍÕ±Ð€ô4(€€€€€ÑÉå‘‘5Õ±Ñ¥±…ÍÍ±…ÍÌ 4(€€€€€€€±…ÍÍ%4(€€€€€€¤ì4(4(€€€Í•ÑMÑ…ÑÕÌ¡É•ÍÕ±Ð¹µ•ÍÍ…”¤ì4(4(€€€É•ÑÕÉ¸É•ÍÕ±Ð¹½¬ì4(€ô4(4(€™Õ¹Ñ¥½¸Í•Ñ5Õ±Ñ¥±…ÍÍ±…ÍÍ1•Ù•° 4(€€€±…ÍÍ%¹‘•à°4(€€€Ù…±Õ”4(€€¤ì4(€€€½¹ÍÐ±…ÍÍ•Ì€ô4(€€€€€•Ñ±…ÍÍAÉ½É•ÍÍ¥½¹¹ÑÉ¥•Ì ¤ì4(4(€€€½¹ÍÐ¥¹‘•à€ô4(€€€€€5…Ñ ¹µ…à 4(€€€€€€€€À°4(€€€€€€€5…Ñ ¹É½Õ¹ 4(€€€€€€€€€Í…™•9Õµ‰•È¡±…ÍÍ%¹‘•à°€À¤