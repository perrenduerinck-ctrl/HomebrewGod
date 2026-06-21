// =====================================================
// CHARACTER CREATOR.JS — HOMEBREW GOD CHARACTER CREATOR
// Batch 1 of 4: permanent foundation sections 1 through 5.
// Plain HTML/CSS/JS module — no React.
// =====================================================


// =====================================================
// CHARACTER CREATOR SECTION 1 — MODULE / DEPENDENCIES
// =====================================================

export function createCharacterCreator(options = {}) {
  const deps = {
    db: options.db,
    doc: options.doc,
    collection: options.collection,
    addDoc: options.addDoc,
    updateDoc: options.updateDoc,
    deleteDoc: options.deleteDoc,
    onSnapshot: options.onSnapshot,
    serverTimestamp: options.serverTimestamp,

    getCurrentRoomCode: options.getCurrentRoomCode,
    getCurrentRoomData: options.getCurrentRoomData,
    getCurrentIsDM: options.getCurrentIsDM
  };

  const CHARACTER_SCHEMA_VERSION = 4;
  const CLASS_SCHEMA_VERSION = 1;
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
      id: "species",
      label: "Species / Race",
      shortLabel: "Species",
      description: "Choose an ancestry template and make any ancestry-based choices.",
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
      id: "subclass",
      label: "Subclass",
      shortLabel: "Subclass",
      description: "Choose a subclass when the selected class and level allow one.",
      required: false
    },
    {
      id: "level",
      label: "Level / Advancement",
      shortLabel: "Level",
      description: "Set level, hit points, advancement, and class progression.",
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
      id: "background",
      label: "Background",
      shortLabel: "Background",
      description: "Choose or create a background and its narrative details.",
      required: false
    },
    {
      id: "skills",
      label: "Skills / Proficiencies",
      shortLabel: "Skills",
      description: "Choose skills, saves, languages, tools, armor, and weapon training.",
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
      description: "Save, duplicate, export, import, and later create a linked token.",
      required: true
    }
  ]);

  const BUILDER_STEP_INDEX = new Map(
    BUILDER_STEPS.map((step, index) => [step.id, index])
  );

  function getStepById(stepId) {
    return BUILDER_STEPS.find((step) => step.id === stepId) || BUILDER_STEPS[0];
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
        classes: [
          {
            classId: "fighter",
            className: "Fighter",
            source: "template",
            level: 1,
            subclassId: "",
            subclassName: "",
            templateSnapshot: null,
            choices: {}
          }
        ]
      },

      abilities: {
        method: "manual",
        base: { ...baseScores },
        bonuses: createAbilityMap(0),
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
        maxHp: 1,
        currentHp: 1,
        temporaryHp: 0,
        initiative: 0,
        proficiencyBonus: 2,

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

        items: [],
        notes: ""
      },

      magic: {
        spellcastingAbility: "",
        spellSaveDc: null,
        spellAttackBonus: null,
        knownSpellIds: [],
        preparedSpellIds: [],
        customSpells: [],
        slots: {},
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
        lastSavedAtMillis: null
      },

      notes: "",

      // Temporary compatibility aliases.
      // These allow old saved characters and the current HTML to work
      // until Sections 6–20 are installed.
      name: "",
      race: "",
      classId: "fighter",
      className: "Fighter",
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

  function cleanArray(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => cleanString(item))
      .filter(Boolean);
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

  function calculateAbilityModifier(score) {
    return Math.floor((safeNumber(score, 10) - 10) / 2);
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

    if (safeLevel >= 17) return 6;
    if (safeLevel >= 13) return 5;
    if (safeLevel >= 9) return 4;
    if (safeLevel >= 5) return 3;

    return 2;
  }

  function getPrimaryClassEntry(character) {
    const classes = character?.classProgression?.classes;

    if (Array.isArray(classes) && classes.length > 0) {
      return classes[0];
    }

    return null;
  }

  function applyCompatibilityAliases(character) {
    const clean = character;
    const primaryClass = getPrimaryClassEntry(clean);
    const walkSpeed = safeNumber(clean.combat?.speed?.walk, 30);

    clean.name = cleanString(clean.identity?.name);
    clean.race = cleanString(clean.species?.name);

    clean.classId = cleanString(
      primaryClass?.classId,
      "fighter"
    );

    clean.className = cleanString(
      primaryClass?.className,
      "Fighter"
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
    const raw = rawCharacter || {};
    const empty = createEmptyCharacter();

    const rawStats =
      raw.stats ||
      raw.abilities?.scores ||
      {};

    const rawBase =
      raw.abilities?.base ||
      rawStats;

    const rawBonuses =
      raw.abilities?.bonuses ||
      {};

    const rawScores =
      raw.abilities?.scores ||
      rawStats;

    const rawBuilder =
      raw.builder ||
      {};

    const rawClassEntry =
      Array.isArray(raw.classProgression?.classes)
        ? raw.classProgression.classes[0]
        : null;

    const classId = cleanString(
      rawClassEntry?.classId ||
      raw.classId ||
      rawBuilder.selectedClassId,
      "fighter"
    );

    const className = cleanString(
      rawClassEntry?.className ||
      raw.className,
      "Fighter"
    );

    const totalLevel = clampLevel(
      raw.classProgression?.totalLevel ||
      rawClassEntry?.level ||
      raw.level ||
      1
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

    const normalized = {
      ...empty,

      id: raw.id || null,
      schemaVersion: CHARACTER_SCHEMA_VERSION,

      identity: {
        ...empty.identity,
        ...(raw.identity || {}),

        name: cleanString(
          raw.identity?.name ||
          raw.name
        ),

        image: {
          ...empty.identity.image,
          ...(raw.identity?.image || {})
        }
      },

      species: {
        ...empty.species,
        ...(speciesObject || {}),

        id: cleanString(
          speciesObject?.id
        ),

        name: speciesName,

        source: cleanString(
          speciesObject?.source,
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

        classes: [
          {
            classId,
            className,

            source: cleanString(
              rawClassEntry?.source,
              "template"
            ),

            level: totalLevel,

            subclassId: cleanString(
              rawClassEntry?.subclassId
            ),

            subclassName: cleanString(
              rawClassEntry?.subclassName ||
              raw.subclassName
            ),

            templateSnapshot: cloneData(
              rawClassEntry?.templateSnapshot ||
              raw.selectedClassSnapshot ||
              rawBuilder.selectedClassSnapshot ||
              null
            ),

            choices: cloneData(
              rawClassEntry?.choices || {}
            )
          }
        ]
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
          backgroundObject?.source,
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

        proficiencyBonus: safeNumber(
          raw.combat?.proficiencyBonus,
          getGenericProficiencyBonus(totalLevel)
        ),

        speed: {
          ...empty.combat.speed,
          ...(raw.combat?.speed || {}),
          walk: walkSpeed
        },

        hitDice: Array.isArray(raw.combat?.hitDice)
          ? cloneData(raw.combat.hitDice)
          : []
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
          ...(raw.equipment?.currency || {})
        },

        items: Array.isArray(raw.equipment?.items)
          ? cloneData(raw.equipment.items)
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

        customSpells:
          Array.isArray(raw.magic?.customSpells)
            ? cloneData(raw.magic.customSpells)
            : [],

        slots: cloneData(
          raw.magic?.slots || {}
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

    return applyCompatibilityAliases(normalized);
  }

  function createCharacterPayload(character) {
    const normalized = normalizeCharacter(character);

    normalized.id = null;

    normalized.abilities.modifiers =
      calculateAbilityModifiers(
        normalized.abilities.scores
      );

    normalized.combat.proficiencyBonus =
      getGenericProficiencyBonus(
        normalized.classProgression.totalLevel
      );

    normalized.builder.lastSavedAtMillis = Date.now();

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

  const DEFAULT_CLASS_TEMPLATES = Object.freeze([
    {
      schemaVersion: CLASS_SCHEMA_VERSION,
      id: "fighter",
      name: "Fighter",
      source: "template",
      summary: "A flexible martial framework for weapon and armor focused characters.",
      hitDie: "d10",
      primaryAbilities: [
        "Strength",
        "Dexterity"
      ],
      savingThrows: [
        "Strength",
        "Constitution"
      ],
      armorProficiencies: [
        "Light armor",
        "Medium armor",
        "Heavy armor",
        "Shields"
      ],
      weaponProficiencies: [
        "Simple weapons",
        "Martial weapons"
      ],
      toolProficiencies: [],

      skillChoices: {
        choose: 2,
        from: [
          "Acrobatics",
          "Animal Handling",
          "Athletics",
          "History",
          "Insight",
          "Intimidation",
          "Perception",
          "Survival"
        ]
      },

      subclassLevel: 3,

      levels: {
        1: {
          proficiencyBonus: 2,

          features: [
            {
              id: "fighter-level-1-feature-slot",
              name: "Level 1 Martial Feature",
              summary: "Editable placeholder for your own rules text."
            }
          ]
        }
      },

      subclasses: []
    },

    {
      schemaVersion: CLASS_SCHEMA_VERSION,
      id: "wizard",
      name: "Wizard",
      source: "template",
      summary: "An Intelligence-based spellcaster framework with editable progression.",
      hitDie: "d6",
      primaryAbilities: [
        "Intelligence"
      ],
      savingThrows: [
        "Intelligence",
        "Wisdom"
      ],
      armorProficiencies: [],
      weaponProficiencies: [
        "Simple weapon placeholders"
      ],
      toolProficiencies: [],

      skillChoices: {
        choose: 2,
        from: [
          "Arcana",
          "History",
          "Insight",
          "Investigation",
          "Medicine",
          "Religion"
        ]
      },

      subclassLevel: 2,

      levels: {
        1: {
          proficiencyBonus: 2,

          features: [
            {
              id: "wizard-level-1-feature-slot",
              name: "Level 1 Spellcasting Feature",
              summary: "Editable placeholder for your own rules text."
            }
          ]
        }
      },

      subclasses: []
    },

    {
      schemaVersion: CLASS_SCHEMA_VERSION,
      id: "rogue",
      name: "Rogue",
      source: "template",
      summary: "A Dexterity and skill focused framework for precise characters.",
      hitDie: "d8",
      primaryAbilities: [
        "Dexterity"
      ],
      savingThrows: [
        "Dexterity",
        "Intelligence"
      ],
      armorProficiencies: [
        "Light armor"
      ],
      weaponProficiencies: [
        "Simple weapons",
        "Finesse weapon placeholders"
      ],
      toolProficiencies: [
        "One editable tool proficiency"
      ],

      skillChoices: {
        choose: 4,
        from: [
          "Acrobatics",
          "Athletics",
          "Deception",
          "Insight",
          "Intimidation",
          "Investigation",
          "Perception",
          "Performance",
          "Persuasion",
          "Sleight of Hand",
          "Stealth"
        ]
      },

      subclassLevel: 3,

      levels: {
        1: {
          proficiencyBonus: 2,

          features: [
            {
              id: "rogue-level-1-feature-slot",
              name: "Level 1 Skill Feature",
              summary: "Editable placeholder for your own rules text."
            }
          ]
        }
      },

      subclasses: []
    },

    {
      schemaVersion: CLASS_SCHEMA_VERSION,
      id: "cleric",
      name: "Cleric",
      source: "template",
      summary: "A Wisdom-based divine magic framework with editable domains.",
      hitDie: "d8",
      primaryAbilities: [
        "Wisdom"
      ],
      savingThrows: [
        "Wisdom",
        "Charisma"
      ],
      armorProficiencies: [
        "Light armor",
        "Medium armor",
        "Shields"
      ],
      weaponProficiencies: [
        "Simple weapons"
      ],
      toolProficiencies: [],

      skillChoices: {
        choose: 2,
        from: [
          "History",
          "Insight",
          "Medicine",
          "Persuasion",
          "Religion"
        ]
      },

      subclassLevel: 1,

      levels: {
        1: {
          proficiencyBonus: 2,

          features: [
            {
              id: "cleric-level-1-feature-slot",
              name: "Level 1 Divine Feature",
              summary: "Editable placeholder for your own rules text."
            }
          ]
        }
      },

      subclasses: []
    }
  ]);

  const DEFAULT_SPECIES_TEMPLATES = Object.freeze([
    {
      schemaVersion: SPECIES_SCHEMA_VERSION,
      id: "human",
      name: "Human",
      source: "template",
      summary: "A broad editable ancestry framework.",
      size: "medium",
      speed: 30,

      abilityChoices: {
        mode: "custom",
        choices: []
      },

      languages: [],
      traits: []
    },

    {
      schemaVersion: SPECIES_SCHEMA_VERSION,
      id: "elf",
      name: "Elf",
      source: "template",
      summary: "A graceful ancestry framework ready for your own traits.",
      size: "medium",
      speed: 30,

      abilityChoices: {
        mode: "custom",
        choices: []
      },

      languages: [],
      traits: []
    },

    {
      schemaVersion: SPECIES_SCHEMA_VERSION,
      id: "dwarf",
      name: "Dwarf",
      source: "template",
      summary: "A sturdy ancestry framework ready for editable traits.",
      size: "medium",
      speed: 25,

      abilityChoices: {
        mode: "custom",
        choices: []
      },

      languages: [],
      traits: []
    },

    {
      schemaVersion: SPECIES_SCHEMA_VERSION,
      id: "custom-species",
      name: "Custom Species",
      source: "template",
      summary: "A blank ancestry shell for original homebrew.",
      size: "medium",
      speed: 30,

      abilityChoices: {
        mode: "custom",
        choices: []
      },

      languages: [],
      traits: []
    }
  ]);

  const DEFAULT_BACKGROUND_TEMPLATES = Object.freeze([
    {
      schemaVersion: BACKGROUND_SCHEMA_VERSION,
      id: "wanderer",
      name: "Wanderer",
      source: "template",
      summary: "A travel-focused background shell.",

      skillChoices: {
        choose: 2,
        from: []
      },

      toolChoices: {
        choose: 0,
        from: []
      },

      languageChoices: {
        choose: 1,
        from: []
      },

      equipmentPackageIds: [],
      features: []
    },

    {
      schemaVersion: BACKGROUND_SCHEMA_VERSION,
      id: "scholar",
      name: "Scholar",
      source: "template",
      summary: "A knowledge-focused background shell.",

      skillChoices: {
        choose: 2,
        from: []
      },

      toolChoices: {
        choose: 0,
        from: []
      },

      languageChoices: {
        choose: 2,
        from: []
      },

      equipmentPackageIds: [],
      features: []
    },

    {
      schemaVersion: BACKGROUND_SCHEMA_VERSION,
      id: "soldier",
      name: "Soldier",
      source: "template",
      summary: "A military background shell.",

      skillChoices: {
        choose: 2,
        from: []
      },

      toolChoices: {
        choose: 1,
        from: []
      },

      languageChoices: {
        choose: 0,
        from: []
      },

      equipmentPackageIds: [],
      features: []
    },

    {
      schemaVersion: BACKGROUND_SCHEMA_VERSION,
      id: "custom-background",
      name: "Custom Background",
      source: "template",
      summary: "A blank background shell for original history.",

      skillChoices: {
        choose: 2,
        from: []
      },

      toolChoices: {
        choose: 0,
        from: []
      },

      languageChoices: {
        choose: 0,
        from: []
      },

      equipmentPackageIds: [],
      features: []
    }
  ]);

  const DEFAULT_EQUIPMENT_CATALOG = Object.freeze([
    {
      id: "backpack",
      name: "Backpack",
      category: "adventuring-gear",
      quantity: 1,
      weight: null,
      source: "template",
      notes: "Editable generic gear entry."
    },

    {
      id: "simple-weapon-placeholder",
      name: "Simple Weapon",
      category: "weapon",
      quantity: 1,
      weight: null,
      source: "template",
      notes: "Choose or create the exact weapon later."
    },

    {
      id: "armor-placeholder",
      name: "Armor",
      category: "armor",
      quantity: 1,
      weight: null,
      source: "template",
      notes: "Choose or create the exact armor later."
    }
  ]);


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
    dirty: false,
    statusMessage: "Character creator foundation ready.",

    characterCache: [],
    characterRoomCode: null,
    characterUnsubscribe: null,

    roomClassCache: [],
    classRoomCode: null,
    classUnsubscribe: null,

    roomSpeciesCache: [],
    roomBackgroundCache: []
  };

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

    const skillChoices =
      raw.skillChoices ||
      {};

    return {
      schemaVersion: CLASS_SCHEMA_VERSION,

      id: makeSafeId(
        raw.id || name,
        "custom-class"
      ),

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

      subclassLevel: Math.max(
        1,
        Math.round(
          safeNumber(
            raw.subclassLevel,
            3
          )
        )
      ),

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
      const normalized = normalizeClassTemplate(
        classData,
        "homebrew"
      );

      classMap.set(
        normalized.id,
        normalized
      );
    });

    const primaryClass = getPrimaryClassEntry(
      creatorState.draft
    );

    if (primaryClass?.templateSnapshot) {
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

    const allClasses = getAllClassTemplates();

    return (
      allClasses.find((classData) => {
        return classData.id === primaryClass?.classId;
      }) ||

      allClasses.find((classData) => {
        return classData.name === primaryClass?.className;
      }) ||

      allClasses[0] ||
      null
    );
  }

  function selectClassTemplate(classId) {
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

    creatorState.draft.classProgression.classes = [
      {
        classId: selectedClass.id,
        className: selectedClass.name,
        source: selectedClass.source,
        level: totalLevel,
        subclassId: "",
        subclassName: "",
        templateSnapshot: cloneData(selectedClass),
        choices: {}
      }
    ];

    creatorState.draft.proficiencies.skills = {};
    creatorState.dirty = true;

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

  function replaceDraft(character, options = {}) {
    creatorState.draft = normalizeCharacter(character);

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

  function duplicateIntoDraft(character) {
    const copy = normalizeCharacter(character);

    copy.identity.name = copy.identity.name
      ? `${copy.identity.name} Copy`
      : "Character Copy";

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

    cursor[parts[parts.length - 1]] = value;
    creatorState.dirty = true;

    applyCompatibilityAliases(
      creatorState.draft
    );
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
    popstateConnected: false
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
        grid-template-columns: 30px minmax(0, 1fr);
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

      .hg-character-wide-field {
        grid-column: 1 / -1;
      }

      .hg-character-choice-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 10px;
        margin-top: 12px;
      }

      .hg-character-choice-card {
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

      .hg-character-choice-card p {
        margin: 0;
        font-size: 13px;
        line-height: 1.45;
      }

      .hg-character-choice-card button {
        width: 100% !important;
        margin: 6px 0 0 0 !important;
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
      }
    `;

    document.head.appendChild(style);
  }


// =====================================================
// CHARACTER CREATOR SECTION 7 — UI HELPERS / DRAFT BRIDGE
// =====================================================

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
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
    const clean = normalizeCharacter(character);
    const primaryClass = getPrimaryClassEntry(clean);

    clean.identity.name = getSafeCharacterName(clean);
    clean.species.name = getSafeSpeciesName(clean);
    clean.background.name = getSafeBackgroundName(clean);

    if (primaryClass) {
      primaryClass.className =
        getSafeClassName(clean) || "Fighter";

      primaryClass.classId = makeSafeId(
        primaryClass.classId || primaryClass.className,
        "fighter"
      );

      primaryClass.subclassName =
        getSafeSubclassName(clean);
    }

    return applyCompatibilityAliases(clean);
  }

  function markDraftChanged() {
    creatorState.dirty = true;
    persistDraftToSession();
    renderActionBar();
  }

  function getDraftStorageKey() {
    return (
      "homebrewGodCharacterDraft:" +
      (getRoomCode() || "no-room")
    );
  }

  function persistDraftToSession() {
    try {
      sessionStorage.setItem(
        getDraftStorageKey(),
        JSON.stringify({
          draft: creatorState.draft,
          currentCharacterId:
            creatorState.currentCharacterId,
          currentStepId:
            creatorState.currentStepId,
          dirty: creatorState.dirty
        })
      );
    } catch (error) {
      console.warn(
        "Could not store character draft in this tab:",
        error
      );
    }
  }

  function restoreDraftFromSession() {
    try {
      const text = sessionStorage.getItem(
        getDraftStorageKey()
      );

      if (!text) {
        return false;
      }

      const stored = JSON.parse(text);

      creatorState.draft =
        sanitizeDraftStrings(stored.draft);

      creatorState.currentCharacterId =
        stored.currentCharacterId || null;

      creatorState.dirty =
        stored.dirty === true;

      setCurrentStep(
        stored.currentStepId || "basics"
      );

      return true;
    } catch (error) {
      console.warn(
        "Could not restore character draft:",
        error
      );

      return false;
    }
  }

  function clearStoredDraft() {
    try {
      sessionStorage.removeItem(
        getDraftStorageKey()
      );
    } catch (error) {
      console.warn(
        "Could not clear stored character draft:",
        error
      );
    }
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

    creatorState.draft.combat.speed.walk =
      safeNumber(template.speed, 30);

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
    const cleanName =
      safeDisplayString(name);

    const primaryClass =
      getPrimaryClassEntry(
        creatorState.draft
      );

    if (!primaryClass || !cleanName) {
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

    creatorState.draft
      .combat
      .proficiencyBonus =
        getGenericProficiencyBonus(level);

    applyCompatibilityAliases(
      creatorState.draft
    );

    markDraftChanged();
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

    creatorState.draft
      .abilities
      .scores[abilityId] = score;

    creatorState.draft
      .abilities
      .modifiers =
        calculateAbilityModifiers(
          creatorState.draft
            .abilities
            .scores
        );

    applyCompatibilityAliases(
      creatorState.draft
    );

    markDraftChanged();
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

    setDraftValue(path, value);
    persistDraftToSession();
    renderActionBar();
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
    const params =
      new URLSearchParams(
        window.location.search
      );

    const requestedStep =
      params.get("step");

    if (
      !requestedStep ||
      requestedStep === "library"
    ) {
      return {
        viewMode: "library",
        stepId: "basics"
      };
    }

    return {
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

    url.searchParams.set(
      "room",
      getRoomCode()
    );

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
      creatorState.viewMode =
        "library";

      writeRouteToUrl(
        "library",
        "basics",
        true
      );
    }
  }


// =====================================================
// CHARACTER CREATOR SECTION 9 — WIZARD SHELL / NAVIGATION
// =====================================================

  function ensureWizardShell() {
    refreshElements();
    ensureWizardStyles();

    if (
      !C.actionBar ||
      !C.grid
    ) {
      return;
    }

    if (!wizardRuntime.shellBuilt) {
      wizardRuntime.shellBuilt =
        true;

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
          Save Character
        </button>

        <button
          type="button"
          data-cc-action="save-copy"
        >
          Save Another Copy
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
          "Build one step at a time. Your characters stay in this room's library.";
      }
    }

    refreshWizardElements();
    connectWizardEvents();
  }

  function renderActionBar() {
    refreshWizardElements();

    const saveButton =
      $("characterWizardSaveButton");

    if (saveButton) {
      saveButton.textContent =
        creatorState.currentCharacterId
          ? "Update Character"
          : "Save New Character";
    }
  }

  function renderStepRail() {
    return BUILDER_STEPS
      .map((step, index) => {
        const active =
          step.id ===
          creatorState.currentStepId;

        const visited =
          creatorState
            .draft
            .builder
            .visitedSteps
            .includes(step.id);

        return `
          <button
            type="button"
            class="
              hg-character-step-button
              ${active ? "active" : ""}
              ${visited ? "visited" : ""}
            "
            data-cc-action="go-step"
            data-step-id="${escapeHtml(step.id)}"
          >
            <span class="hg-character-step-number">
              ${index + 1}
            </span>

            <span class="hg-character-step-label">
              ${escapeHtml(step.shortLabel)}
            </span>
          </button>
        `;
      })
      .join("");
  }

  function renderBasicsStep() {
    const identity =
      creatorState.draft.identity;

    return `
      <div class="hg-character-field-grid">
        <div class="hg-character-field">
          <label for="ccCharacterName">
            Character Name
          </label>

          <input
            id="ccCharacterName"
            data-draft-path="identity.name"
            value="${escapeHtml(
              getSafeCharacterName()
            )}"
            placeholder="Character name"
          >
        </div>

        <div class="hg-character-field">
          <label for="ccPronouns">
            Pronouns
          </label>

          <input
            id="ccPronouns"
            data-draft-path="identity.pronouns"
            value="${escapeHtml(
              safeDisplayString(
                identity.pronouns
              )
            )}"
            placeholder="Optional"
          >
        </div>

        <div class="hg-character-field">
          <label for="ccAlignment">
            Alignment / Outlook
          </label>

          <input
            id="ccAlignment"
            data-draft-path="identity.alignment"
            value="${escapeHtml(
              safeDisplayString(
                identity.alignment
              )
            )}"
            placeholder="Optional"
          >
        </div>

        <div class="hg-character-field">
          <label for="ccDeity">
            Deity / Belief
          </label>

          <input
            id="ccDeity"
            data-draft-path="identity.deity"
            value="${escapeHtml(
              safeDisplayString(
                identity.deity
              )
            )}"
            placeholder="Optional"
          >
        </div>

        <div class="hg-character-field">
          <label for="ccAge">
            Age
          </label>

          <input
            id="ccAge"
            data-draft-path="identity.age"
            value="${escapeHtml(
              safeDisplayString(
                identity.age
              )
            )}"
            placeholder="Optional"
          >
        </div>

        <div class="hg-character-field">
          <label for="ccSize">
            Size
          </label>

          <select
            id="ccSize"
            data-draft-path="identity.size"
          >
            ${
              [
                "tiny",
                "small",
                "medium",
                "large",
                "huge",
                "gargantuan"
              ]
                .map((size) => {
                  return `
                    <option
                      value="${size}"
                      ${
                        identity.size === size
                          ? "selected"
                          : ""
                      }
                    >
                      ${
                        size.charAt(0).toUpperCase() +
                        size.slice(1)
                      }
                    </option>
                  `;
                })
                .join("")
            }
          </select>
        </div>

        <div class="hg-character-field hg-character-wide-field">
          <label for="ccAppearance">
            Appearance / Identity Notes
          </label>

          <textarea
            id="ccAppearance"
            data-draft-path="identity.appearance"
            placeholder="Appearance, personality, identity notes..."
          >${escapeHtml(
            safeDisplayString(
              identity.appearance
            )
          )}</textarea>
        </div>
      </div>
    `;
  }

  function renderSpeciesStep() {
    const currentSpecies =
      getSafeSpeciesName();

    const cards =
      DEFAULT_SPECIES_TEMPLATES
        .map((species) => {
          const selected =
            creatorState.draft
              .species.id ===
              species.id ||
            currentSpecies ===
              species.name;

          return `
            <div
              class="
                hg-character-choice-card
                ${selected ? "selected" : ""}
              "
            >
              <h3>
                ${escapeHtml(species.name)}
              </h3>

              <p>
                ${escapeHtml(species.summary)}
              </p>

              <p>
                <b>Size:</b>
                ${escapeHtml(species.size)}
              </p>

              <p>
                <b>Walk:</b>
                ${escapeHtml(species.speed)} ft.
              </p>

              <button
                type="button"
                data-cc-action="choose-species"
                data-species-id="${escapeHtml(
                  species.id
                )}"
              >
                ${
                  selected
                    ? "Selected"
                    : "Choose Species"
                }
              </button>
            </div>
          `;
        })
        .join("");

    return `
      <div class="hg-character-current-choice">
        <b>Current species:</b>

        ${escapeHtml(
          currentSpecies ||
          "None selected"
        )}
      </div>

      <div class="hg-character-choice-grid">
        ${cards}
      </div>

      <div
        class="hg-character-step-panel"
        style="min-height:0; margin-top:12px;"
      >
        <h3>Custom Species</h3>

        <div class="hg-character-field-grid">
          <div class="hg-character-field">
            <label for="ccCustomSpeciesName">
              Custom Species Name
            </label>

            <input
              id="ccCustomSpeciesName"
              value="${escapeHtml(
                creatorState.draft
                  .species.source === "custom"
                    ? currentSpecies
                    : ""
              )}"
              placeholder="Example: Half Celestial Owlbear"
            >
          </div>

          <div
            class="hg-character-inline-actions"
            style="align-items:end;"
          >
            <button
              type="button"
              data-cc-action="use-custom-species"
            >
              Use Custom Species
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function renderClassStep() {
    const currentClass =
      getSafeClassName();

    const cards =
      getAllClassTemplates()
        .map((classData) => {
          const primaryClass =
            getPrimaryClassEntry(
              creatorState.draft
            );

          const selected =
            primaryClass?.classId ===
              classData.id ||
            currentClass ===
              classData.name;

          return `
            <div
              class="
                hg-character-choice-card
                ${selected ? "selected" : ""}
              "
            >
              <h3>
                ${escapeHtml(classData.name)}
              </h3>

              <p>
                ${escapeHtml(classData.summary)}
              </p>

              <p>
                <b>Hit Die:</b>
                ${escapeHtml(classData.hitDie)}
              </p>

              <p>
                <b>Primary:</b>

                ${escapeHtml(
                  classData
                    .primaryAbilities
                    .join(", ") ||
                  "Any"
                )}
              </p>

              <button
                type="button"
                data-cc-action="choose-class"
                data-class-id="${escapeHtml(
                  classData.id
                )}"
              >
                ${
                  selected
                    ? "Selected"
                    : "Choose Class"
                }
              </button>
            </div>
          `;
        })
        .join("");

    const primaryClass =
      getPrimaryClassEntry(
        creatorState.draft
      );

    return `
      <div class="hg-character-current-choice">
        <b>Current class:</b>

        ${escapeHtml(
          currentClass ||
          "None selected"
        )}
      </div>

      <div class="hg-character-choice-grid">
        ${cards}
      </div>

      <div
        class="hg-character-step-panel"
        style="min-height:0; margin-top:12px;"
      >
        <h3>Custom Homebrew Class</h3>

        <p class="small">
          Entering a custom name here creates a real
          custom class choice. It will not fall back
          to Fighter.
        </p>

        <div class="hg-character-field-grid">
          <div class="hg-character-field">
            <label for="ccCustomClassName">
              Custom Class Name
            </label>

            <input
              id="ccCustomClassName"
              value="${escapeHtml(
                primaryClass?.source === "custom"
                  ? currentClass
                  : ""
              )}"
              placeholder="Example: Piss Wizard"
            >
          </div>

          <div
            class="hg-character-inline-actions"
            style="align-items:end;"
          >
            <button
              type="button"
              data-cc-action="use-custom-class"
            >
              Use Custom Class
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function renderSubclassStep() {
    const primaryClass =
      getPrimaryClassEntry(
        creatorState.draft
      );

    const selectedClass =
      getSelectedClassTemplate();

    const subclasses =
      Array.isArray(
        selectedClass?.subclasses
      )
        ? selectedClass.subclasses
        : [];

    const options =
      subclasses
        .map((subclass) => {
          const id =
            makeSafeId(
              subclass.id ||
              subclass.name,
              "subclass"
            );

          const name =
            safeDisplayString(
              subclass.name,
              "Unnamed Subclass"
            );

          return `
            <option
              value="${escapeHtml(id)}"
              ${
                primaryClass?.subclassId === id
                  ? "selected"
                  : ""
              }
            >
              ${escapeHtml(name)}
            </option>
          `;
        })
        .join("");

    return `
      <div class="hg-character-current-choice">
        <b>Class:</b>

        ${escapeHtml(
          getSafeClassName() ||
          "No class selected"
        )}
      </div>

      <div class="hg-character-field-grid">
        <div class="hg-character-field">
          <label for="ccSubclassSelect">
            Saved Subclass Options
          </label>

          <select
            id="ccSubclassSelect"
            data-cc-action-change="choose-subclass"
          >
            <option value="">
              No subclass selected
            </option>

            ${options}
          </select>
        </div>

        <div class="hg-character-field">
          <label for="ccCustomSubclassName">
            Custom Subclass Name
          </label>

          <input
            id="ccCustomSubclassName"
            value="${escapeHtml(
              getSafeSubclassName()
            )}"
            placeholder="Optional homebrew subclass"
          >
        </div>
      </div>

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="use-custom-subclass"
        >
          Use Custom Subclass
        </button>
      </div>

      ${
        subclasses.length === 0
          ? `
            <div
              class="hg-character-placeholder"
              style="margin-top:12px;"
            >
              This class does not have saved subclass
              templates yet. The custom field works now;
              full subclass libraries arrive with
              Sections 11–15.
            </div>
          `
          : ""
      }
    `;
  }

  function renderLevelStep() {
    const combat =
      creatorState.draft.combat;

    const level =
      clampLevel(
        creatorState.draft
          .classProgression
          .totalLevel
      );

    return `
      <div class="hg-character-field-grid three">
        <div class="hg-character-field">
          <label for="ccLevel">
            Character Level
          </label>

          <input
            id="ccLevel"
            type="number"
            min="1"
            max="20"
            value="${level}"
            data-level-input="true"
          >
        </div>

        <div class="hg-character-field">
          <label for="ccProficiencyBonus">
            Proficiency Bonus
          </label>

          <input
            id="ccProficiencyBonus"
            value="+${combat.proficiencyBonus}"
            readonly
          >
        </div>

        <div class="hg-character-field">
          <label for="ccArmorClass">
            Armor Class
          </label>

          <input
            id="ccArmorClass"
            type="number"
            data-draft-path="combat.armorClass"
            data-value-type="number"
            value="${combat.armorClass}"
          >
        </div>

        <div class="hg-character-field">
          <label for="ccMaxHp">
            Maximum HP
          </label>

          <input
            id="ccMaxHp"
            type="number"
            min="1"
            data-draft-path="combat.maxHp"
            data-value-type="number"
            value="${combat.maxHp}"
          >
        </div>

        <div class="hg-character-field">
          <label for="ccCurrentHp">
            Current HP
          </label>

          <input
            id="ccCurrentHp"
            type="number"
            data-draft-path="combat.currentHp"
            data-value-type="number"
            value="${combat.currentHp}"
          >
        </div>

        <div class="hg-character-field">
          <label for="ccWalkSpeed">
            Walking Speed
          </label>

          <input
            id="ccWalkSpeed"
            type="number"
            min="0"
            data-draft-path="combat.speed.walk"
            data-value-type="number"
            value="${combat.speed.walk}"
          >
        </div>
      </div>
    `;
  }

  function renderAbilitiesStep() {
    const abilities =
      creatorState.draft.abilities;

    const boxes =
      ABILITY_DEFINITIONS
        .map((ability) => {
          const score =
            safeNumber(
              abilities.scores[ability.id],
              10
            );

          const modifier =
            calculateAbilityModifier(score);

          const modifierText =
            modifier >= 0
              ? "+" + modifier
              : String(modifier);

          return `
            <div class="hg-character-ability-box">
              <b>
                ${escapeHtml(ability.name)}
              </b>

              <div class="small">
                Modifier
                ${escapeHtml(modifierText)}
              </div>

              <input
                type="number"
                min="1"
                max="30"
                value="${score}"
                data-ability-id="${escapeHtml(
                  ability.id
                )}"
              >
            </div>
          `;
        })
        .join("");

    return `
      <div
        class="hg-character-field"
        style="max-width:360px; margin-bottom:12px;"
      >
        <label for="ccAbilityMethod">
          Score Method
        </label>

        <select
          id="ccAbilityMethod"
          data-draft-path="abilities.method"
        >
          ${
            ABILITY_SCORE_METHODS
              .map((method) => {
                return `
                  <option
                    value="${escapeHtml(method.id)}"
                    ${
                      abilities.method ===
                      method.id
                        ? "selected"
                        : ""
                    }
                  >
                    ${escapeHtml(method.name)}
                  </option>
                `;
              })
              .join("")
          }
        </select>
      </div>

      <div class="hg-character-ability-grid">
        ${boxes}
      </div>

      <div
        class="hg-character-placeholder"
        style="margin-top:12px;"
      >
        Manual scores work now. Standard-array
        assignment and point-buy enforcement are added
        in Sections 11–15.
      </div>
    `;
  }

  function renderBackgroundStep() {
    const currentName =
      getSafeBackgroundName();

    const cards =
      DEFAULT_BACKGROUND_TEMPLATES
        .map((background) => {
          const selected =
            creatorState.draft
              .background.id ===
              background.id ||
            currentName ===
              background.name;

          return `
            <div
              class="
                hg-character-choice-card
                ${selected ? "selected" : ""}
              "
            >
              <h3>
                ${escapeHtml(background.name)}
              </h3>

              <p>
                ${escapeHtml(background.summary)}
              </p>

              <button
                type="button"
                data-cc-action="choose-background"
                data-background-id="${escapeHtml(
                  background.id
                )}"
              >
                ${
                  selected
                    ? "Selected"
                    : "Choose Background"
                }
              </button>
            </div>
          `;
        })
        .join("");

    return `
      <div class="hg-character-current-choice">
        <b>Current background:</b>

        ${escapeHtml(
          currentName ||
          "None selected"
        )}
      </div>

      <div class="hg-character-choice-grid">
        ${cards}
      </div>

      <div
        class="hg-character-field-grid"
        style="margin-top:12px;"
      >
        <div class="hg-character-field">
          <label for="ccCustomBackgroundName">
            Custom Background Name
          </label>

          <input
            id="ccCustomBackgroundName"
            value="${escapeHtml(
              creatorState.draft
                .background.source === "custom"
                  ? currentName
                  : ""
            )}"
            placeholder="Optional custom background"
          >
        </div>

        <div
          class="hg-character-inline-actions"
          style="align-items:end;"
        >
          <button
            type="button"
            data-cc-action="use-custom-background"
          >
            Use Custom Background
          </button>
        </div>

        <div class="hg-character-field hg-character-wide-field">
          <label for="ccBackstory">
            Backstory
          </label>

          <textarea
            id="ccBackstory"
            data-draft-path="background.backstory"
          >${escapeHtml(
            safeDisplayString(
              creatorState.draft
                .background
                .backstory
            )
          )}</textarea>
        </div>
      </div>
    `;
  }

  function renderSkillsStep() {
    const chosen =
      Object.entries(
        creatorState.draft
          .proficiencies
          .skills || {}
      )
        .filter(([, value]) => {
          return (
            value?.proficient === true
          );
        })
        .map(([name]) => name);

    return `
      <div class="hg-character-current-choice">
        <b>Current proficient skills:</b>

        ${escapeHtml(
          chosen.join(", ") ||
          "None selected"
        )}
      </div>

      <div class="hg-character-placeholder">
        The guided skill-choice rules, allowed-choice
        counters, expertise, tools, languages, armor,
        and weapons are implemented in Sections 11–15.

        This page is already routed correctly and stays
        in the same browser tab.
      </div>
    `;
  }

  function renderEquipmentStep() {
    return `
      <div class="hg-character-field">
        <label for="ccEquipmentNotes">
          Equipment / Inventory Notes
        </label>

        <textarea
          id="ccEquipmentNotes"
          data-draft-path="equipment.notes"
          placeholder="Weapons, armor, gear, currency notes..."
        >${escapeHtml(
          safeDisplayString(
            creatorState.draft
              .equipment
              .notes
          )
        )}</textarea>
      </div>

      <div
        class="hg-character-placeholder"
        style="margin-top:12px;"
      >
        Structured item cards, starting packages,
        quantity, weight, currency, and equipped state
        are added in Sections 16–20.
      </div>
    `;
  }

  function renderSpellsStep() {
    return `
      <div class="hg-character-field-grid">
        <div class="hg-character-field hg-character-wide-field">
          <label for="ccSpellNotes">
            Spells / Magic Notes
          </label>

          <textarea
            id="ccSpellNotes"
            data-draft-path="magic.notes"
            placeholder="Known spells, prepared spells, spell notes..."
          >${escapeHtml(
            safeDisplayString(
              creatorState.draft
                .magic
                .notes
            )
          )}</textarea>
        </div>

        <div class="hg-character-field hg-character-wide-field">
          <label for="ccFeatureNotes">
            Features / Traits Notes
          </label>

          <textarea
            id="ccFeatureNotes"
            data-draft-path="features.notes"
            placeholder="Class features, species traits, custom features..."
          >${escapeHtml(
            safeDisplayString(
              creatorState.draft
                .features
                .notes
            )
          )}</textarea>
        </div>
      </div>
    `;
  }

  function renderReviewStep() {
    const warnings =
      getValidationWarnings();

    const level =
      clampLevel(
        creatorState.draft
          .classProgression
          .totalLevel
      );

    return `
      <div class="hg-character-summary-grid">
        <div class="hg-character-summary-card">
          <h3>Identity</h3>

          <p>
            <b>Name:</b>
            ${escapeHtml(
              getSafeCharacterName() ||
              "Missing"
            )}
          </p>

          <p>
            <b>Species:</b>
            ${escapeHtml(
              getSafeSpeciesName() ||
              "Missing"
            )}
          </p>

          <p>
            <b>Background:</b>
            ${escapeHtml(
              getSafeBackgroundName() ||
              "None"
            )}
          </p>
        </div>

        <div class="hg-character-summary-card">
          <h3>Advancement</h3>

          <p>
            <b>Class:</b>
            ${escapeHtml(
              getSafeClassName() ||
              "Missing"
            )}
          </p>

          <p>
            <b>Subclass:</b>
            ${escapeHtml(
              getSafeSubclassName() ||
              "None"
            )}
          </p>

          <p>
            <b>Level:</b>
            ${level}
          </p>
        </div>

        <div class="hg-character-summary-card">
          <h3>Combat</h3>

          <p>
            <b>AC:</b>
            ${creatorState.draft
              .combat
              .armorClass}
          </p>

          <p>
            <b>HP:</b>
            ${creatorState.draft
              .combat
              .currentHp}
            /
            ${creatorState.draft
              .combat
              .maxHp}
          </p>

          <p>
            <b>Speed:</b>
            ${creatorState.draft
              .combat
              .speed
              .walk}
            ft.
          </p>
        </div>
      </div>

      <div class="hg-character-warning-list">
        ${
          warnings.length
            ? warnings
                .map((warning) => {
                  return `
                    <div class="hg-character-warning">
                      ${escapeHtml(warning)}
                    </div>
                  `;
                })
                .join("")
            : `
              <div class="hg-character-current-choice">
                <b>Ready:</b>
                No basic validation warnings.
              </div>
            `
        }
      </div>
    `;
  }

  function renderSaveStep() {
    const warnings =
      getValidationWarnings();

    return `
      ${renderReviewStep()}

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="save-character"
        >
          ${
            creatorState.currentCharacterId
              ? "Update Character"
              : "Save New Character"
          }
        </button>

        <button
          type="button"
          data-cc-action="save-copy"
        >
          Save Another Copy
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
      </div>

      <div
        class="hg-character-placeholder"
        style="margin-top:12px;"
      >
        ${
          warnings.length
            ? `
              You can still save a draft, but the
              warnings above show unfinished choices.
            `
            : `
              This character is ready to save.
              Token creation arrives in Sections 16–20.
            `
        }
      </div>
    `;
  }

  function renderStepContent(stepId) {
    if (stepId === "basics") {
      return renderBasicsStep();
    }

    if (stepId === "species") {
      return renderSpeciesStep();
    }

    if (stepId === "class") {
      return renderClassStep();
    }

    if (stepId === "subclass") {
      return renderSubclassStep();
    }

    if (stepId === "level") {
      return renderLevelStep();
    }

    if (stepId === "abilities") {
      return renderAbilitiesStep();
    }

    if (stepId === "background") {
      return renderBackgroundStep();
    }

    if (stepId === "skills") {
      return renderSkillsStep();
    }

    if (stepId === "equipment") {
      return renderEquipmentStep();
    }

    if (stepId === "spells") {
      return renderSpellsStep();
    }

    if (stepId === "review") {
      return renderReviewStep();
    }

    if (stepId === "save") {
      return renderSaveStep();
    }

    return `
      <div class="hg-character-placeholder">
        This step is not available yet.
      </div>
    `;
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

    W.root.innerHTML = `
      <div class="hg-character-builder-header">
        <div>
          <h2>
            ${escapeHtml(
              getSafeCharacterName() ||
              "New Character"
            )}
          </h2>

          <p class="small">
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
                >
                  ${
                    creatorState.currentCharacterId
                      ? "Update"
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
  }

  function renderCreatorView() {
    ensureWizardShell();
    refreshWizardElements();
    renderActionBar();

    if (!W.root) {
      return;
    }

    if (
      creatorState.viewMode ===
      "library"
    ) {
      renderCharacterLibraryView();
    } else {
      renderBuilderView();
    }

    refreshWizardElements();
  }

  function connectWizardEvents() {
    if (
      wizardRuntime.eventsConnected
    ) {
      return;
    }

    wizardRuntime.eventsConnected =
      true;

    C.actionBar.addEventListener(
      "click",
      handleWizardClick
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

    C.actionBar.addEventListener(
      "change",
      async (event) => {
        if (
          event.target?.id !==
          "characterWizardImportInput"
        ) {
          return;
        }

        const file =
          event.target.files?.[0];

        await importCharacterJson(file);

        event.target.value = "";
      }
    );
  }

  async function handleWizardClick(
    event
  ) {
    const button =
      event.target.closest(
        "[data-cc-action]"
      );

    if (!button) {
      return;
    }

    const action =
      button.dataset.ccAction;

    if (action === "library") {
      navigateToLibrary();
      return;
    }

    if (
      action === "new-character"
    ) {
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

    if (
      action === "choose-species"
    ) {
      useSpeciesTemplate(
        button.dataset.speciesId
      );

      renderCreatorView();
      return;
    }

    if (
      action === "use-custom-species"
    ) {
      useCustomSpeciesName(
        $("ccCustomSpeciesName")
          ?.value
      );

      renderCreatorView();
      return;
    }

    if (
      action === "choose-class"
    ) {
      selectClassTemplate(
        button.dataset.classId
      );

      markDraftChanged();
      renderCreatorView();

      return;
    }

    if (
      action === "use-custom-class"
    ) {
      useCustomClassName(
        $("ccCustomClassName")
          ?.value
      );

      renderCreatorView();
      return;
    }

    if (
      action === "use-custom-subclass"
    ) {
      const primaryClass =
        getPrimaryClassEntry(
          creatorState.draft
        );

      const name =
        safeDisplayString(
          $("ccCustomSubclassName")
            ?.value
        );

      if (primaryClass) {
        primaryClass.subclassId =
          name
            ? makeSafeId(
                name,
                "custom-subclass"
              )
            : "";

        primaryClass.subclassName =
          name;

        markDraftChanged();
      }

      renderCreatorView();
      return;
    }

    if (
      action === "choose-background"
    ) {
      const template =
        DEFAULT_BACKGROUND_TEMPLATES
          .find((background) => {
            return (
              background.id ===
              button.dataset.backgroundId
            );
          });

      if (template) {
        creatorState.draft.background = {
          ...creatorState.draft.background,
          id: template.id,
          name: template.name,
          source: template.source,
          templateSnapshot:
            cloneData(template)
        };

        applyCompatibilityAliases(
          creatorState.draft
        );

        markDraftChanged();
      }

      renderCreatorView();
      return;
    }

    if (
      action === "use-custom-background"
    ) {
      const name =
        safeDisplayString(
          $("ccCustomBackgroundName")
            ?.value
        );

      creatorState.draft
        .background.id =
          name
            ? makeSafeId(
                name,
                "custom-background"
              )
            : "";

      creatorState.draft
        .background.name =
          name;

      creatorState.draft
        .background.source =
          "custom";

      creatorState.draft
        .background
        .templateSnapshot =
          null;

      applyCompatibilityAliases(
        creatorState.draft
      );

      markDraftChanged();
      renderCreatorView();

      return;
    }

    if (
      action === "save-character"
    ) {
      await saveCharacter(false);
      return;
    }

    if (action === "save-copy") {
      await saveCharacter(true);
      return;
    }

    if (action === "copy-json") {
      await copyCharacterJson();
      return;
    }

    if (action === "export-json") {
      exportCharacterJson();
      return;
    }

    if (
      action === "edit-character"
    ) {
      editCharacterFromLibrary(
        button.dataset.characterId
      );

      return;
    }

    if (
      action === "duplicate-character"
    ) {
      duplicateCharacterFromLibrary(
        button.dataset.characterId
      );

      return;
    }

    if (
      action === "delete-character"
    ) {
      await deleteCharacter(
        button.dataset.characterId
      );
    }
  }

  function handleWizardInput(event) {
    const target = event.target;

    if (target.dataset.abilityId) {
      setAbilityScore(
        target.dataset.abilityId,
        target.value
      );

      return;
    }

    if (
      target.dataset.levelInput ===
      "true"
    ) {
      setCharacterLevel(
        target.value
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

  function handleWizardChange(event) {
    const target = event.target;

    if (target.dataset.draftPath) {
      setSimpleDraftField(
        target.dataset.draftPath,
        target.value,
        target.dataset.valueType ||
        "string"
      );
    }

    if (
      target.dataset.ccActionChange ===
      "choose-subclass"
    ) {
      const primaryClass =
        getPrimaryClassEntry(
          creatorState.draft
        );

      const selectedClass =
        getSelectedClassTemplate();

      const selected =
        selectedClass
          ?.subclasses
          ?.find((subclass) => {
            return (
              makeSafeId(
                subclass.id ||
                subclass.name,
                "subclass"
              ) === target.value
            );
          });

      if (primaryClass) {
        primaryClass.subclassId =
          selected
            ? makeSafeId(
                selected.id ||
                selected.name,
                "subclass"
              )
            : "";

        primaryClass.subclassName =
          selected
            ? safeDisplayString(
                selected.name
              )
            : "";

        markDraftChanged();
      }

      renderCreatorView();
    }
  }


// =====================================================
// CHARACTER CREATOR SECTION 10 — LIBRARY / FIRESTORE / API
// =====================================================

  function stopCharacterListener() {
    if (
      typeof creatorState
        .characterUnsubscribe ===
      "function"
    ) {
      creatorState
        .characterUnsubscribe();
    }

    creatorState.characterUnsubscribe =
      null;

    creatorState.characterRoomCode =
      null;

    creatorState.characterCache =
      [];
  }

  function startCharacterListener() {
    const roomCode =
      getRoomCode();

    if (
      !roomCode ||
      !hasFirestoreTools()
    ) {
      stopCharacterListener();
      renderCreatorView();
      return;
    }

    if (
      creatorState.characterRoomCode ===
        roomCode &&
      creatorState.characterUnsubscribe
    ) {
      return;
    }

    stopCharacterListener();

    creatorState.characterRoomCode =
      roomCode;

    creatorState.characterUnsubscribe =
      deps.onSnapshot(
        deps.collection(
          deps.db,
          "rooms",
          roomCode,
          "characters"
        ),

        (snapshot) => {
          creatorState.characterCache =
            snapshot.docs
              .map((characterDoc) => {
                return sanitizeDraftStrings({
                  ...characterDoc.data(),
                  id: characterDoc.id
                });
              })
              .sort((a, b) => {
                return getSafeCharacterName(a)
                  .localeCompare(
                    getSafeCharacterName(b)
                  );
              });

          if (
            creatorState.viewMode ===
            "library"
          ) {
            renderCreatorView();
          }
        },

        (error) => {
          console.error(error);

          setStatus(
            "Could not load characters: " +
            error.message
          );

          renderCreatorView();
        }
      );
  }

  function stopRoomClassListener() {
    if (
      typeof creatorState
        .classUnsubscribe ===
      "function"
    ) {
      creatorState.classUnsubscribe();
    }

    creatorState.classUnsubscribe =
      null;

    creatorState.classRoomCode =
      null;

    creatorState.roomClassCache =
      [];
  }

  function startRoomClassListener() {
    const roomCode =
      getRoomCode();

    if (
      !roomCode ||
      !hasFirestoreTools()
    ) {
      stopRoomClassListener();
      return;
    }

    if (
      creatorState.classRoomCode ===
        roomCode &&
      creatorState.classUnsubscribe
    ) {
      return;
    }

    stopRoomClassListener();

    creatorState.classRoomCode =
      roomCode;

    creatorState.classUnsubscribe =
      deps.onSnapshot(
        deps.collection(
          deps.db,
          "rooms",
          roomCode,
          "classes"
        ),

        (snapshot) => {
          creatorState.roomClassCache =
            snapshot.docs.map(
              (classDoc) => {
                const data =
                  classDoc.data();

                return normalizeClassTemplate(
                  {
                    ...data,
                    docId: classDoc.id,

                    source:
                      data.source ||
                      "homebrew"
                  },

                  "homebrew"
                );
              }
            );

          if (
            creatorState.viewMode ===
              "builder" &&
            creatorState.currentStepId ===
              "class"
          ) {
            renderCreatorView();
          }
        },

        (error) => {
          console.error(
            "Could not load room classes:",
            error
          );
        }
      );
  }

  function renderCharacterLibraryView() {
    const cards =
      creatorState.characterCache
        .map((character) => {
          const name =
            getSafeCharacterName(
              character
            ) ||
            "Unnamed Character";

          const species =
            getSafeSpeciesName(
              character
            ) ||
            "No species";

          const className =
            getSafeClassName(
              character
            ) ||
            "No class";

          const level =
            clampLevel(
              character
                .classProgression
                ?.totalLevel ||
              character.level ||
              1
            );

          return `
            <article class="hg-character-card">
              <h3>
                ${escapeHtml(name)}
              </h3>

              <div class="hg-character-card-meta">
                Level ${level}
                ${escapeHtml(className)}

                <br>

                ${escapeHtml(species)}
              </div>

              <div class="hg-character-card-actions">
                <button
                  type="button"
                  data-cc-action="edit-character"
                  data-character-id="${escapeHtml(
                    character.id
                  )}"
                >
                  Edit
                </button>

                <button
                  type="button"
                  data-cc-action="duplicate-character"
                  data-character-id="${escapeHtml(
                    character.id
                  )}"
                >
                  Duplicate
                </button>

                <button
                  type="button"
                  data-cc-action="delete-character"
                  data-character-id="${escapeHtml(
                    character.id
                  )}"
                >
                  Delete
                </button>
              </div>
            </article>
          `;
        })
        .join("");

    W.root.innerHTML = `
      <div class="hg-character-library-header">
        <div>
          <h2>Your Characters</h2>

          <p>
            Choose a character to edit,
            duplicate one, or begin a new build.
          </p>
        </div>

        <button
          type="button"
          data-cc-action="new-character"
        >
          New Character
        </button>
      </div>

      <div class="hg-character-library-grid">
        ${
          cards ||
          `
            <div class="hg-character-empty-card">
              <h3>
                No saved characters yet
              </h3>

              <p>
                Start a new character and move
                through the builder one page
                at a time.
              </p>

              <button
                type="button"
                data-cc-action="new-character"
              >
                Start Character
              </button>
            </div>
          `
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
  }

  function findCachedCharacter(
    characterId
  ) {
    return (
      creatorState.characterCache
        .find((character) => {
          return (
            character.id ===
            characterId
          );
        }) ||
      null
    );
  }

  function editCharacterFromLibrary(
    characterId
  ) {
    const character =
      findCachedCharacter(
        characterId
      );

    if (!character) {
      return;
    }

    replaceDraft(
      character,
      {
        characterId: character.id,
        dirty: false,

        stepId:
          character.builder
            ?.currentStep ||
          "basics"
      }
    );

    creatorState.draft =
      sanitizeDraftStrings(
        creatorState.draft
      );

    persistDraftToSession();

    setStatus(
      "Editing " +
      (
        getSafeCharacterName(
          character
        ) ||
        "character"
      ) +
      "."
    );

    navigateToStep(
      creatorState.currentStepId
    );
  }

  function duplicateCharacterFromLibrary(
    characterId
  ) {
    const character =
      findCachedCharacter(
        characterId
      );

    if (!character) {
      return;
    }

    duplicateIntoDraft(character);

    creatorState.draft =
      sanitizeDraftStrings(
        creatorState.draft
      );

    creatorState.currentCharacterId =
      null;

    persistDraftToSession();
    navigateToStep("basics");
  }

  async function saveCharacter(
    asNew = false
  ) {
    try {
      const roomCode =
        getRoomCode();

      if (!roomCode) {
        alert("Open a room first.");
        return null;
      }

      if (!hasFirestoreTools()) {
        alert(
          "Character saving is not connected to Firestore."
        );

        return null;
      }

      creatorState.draft =
        sanitizeDraftStrings(
          creatorState.draft
        );

      if (!getSafeCharacterName()) {
        alert(
          "Give the character a name before saving."
        );

        navigateToStep("basics");
        return null;
      }

      const payload = {
        ...getCharacterSnapshot(),
        updatedAt:
          deps.serverTimestamp()
      };

      if (
        asNew ||
        !creatorState.currentCharacterId
      ) {
        const newDoc =
          await deps.addDoc(
            deps.collection(
              deps.db,
              "rooms",
              roomCode,
              "characters"
            ),

            {
              ...payload,

              createdAt:
                deps.serverTimestamp()
            }
          );

        creatorState.currentCharacterId =
          newDoc.id;

        creatorState.dirty =
          false;

        persistDraftToSession();

        setStatus(
          asNew
            ? "Another copy was saved as a separate character."
            : "New character saved."
        );

        renderCreatorView();

        return newDoc.id;
      }

      await deps.updateDoc(
        deps.doc(
          deps.db,
          "rooms",
          roomCode,
          "characters",
          creatorState.currentCharacterId
        ),

        payload
      );

      creatorState.dirty =
        false;

      persistDraftToSession();

      setStatus(
        "Character updated."
      );

      renderCreatorView();

      return (
        creatorState.currentCharacterId
      );
    } catch (error) {
      console.error(error);
      alert(error.message);

      return null;
    }
  }

  async function deleteCharacter(
    characterId
  ) {
    try {
      const roomCode =
        getRoomCode();

      if (
        !roomCode ||
        !characterId
      ) {
        return;
      }

      if (
        !confirm(
          "Delete this saved character?"
        )
      ) {
        return;
      }

      await deps.deleteDoc(
        deps.doc(
          deps.db,
          "rooms",
          roomCode,
          "characters",
          characterId
        )
      );

      if (
        creatorState.currentCharacterId ===
        characterId
      ) {
        creatorState.currentCharacterId =
          null;

        creatorState.dirty =
          true;

        persistDraftToSession();
      }

      setStatus(
        "Character deleted."
      );

      renderCreatorView();
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  async function copyCharacterJson() {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(
          getCharacterSnapshot(),
          null,
          2
        )
      );

      setStatus(
        "Character JSON copied."
      );

      renderCreatorView();
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  function exportCharacterJson() {
    try {
      const data =
        getCharacterSnapshot();

      const blob =
        new Blob(
          [
            JSON.stringify(
              data,
              null,
              2
            )
          ],

          {
            type: "application/json"
          }
        );

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        makeSafeFileName(
          getSafeCharacterName(
            data
          ) ||
          "character"
        ) +
        ".json";

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);

      setStatus(
        "Character JSON exported."
      );

      renderCreatorView();
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  async function importCharacterJson(
    file
  ) {
    try {
      if (!file) {
        return;
      }

      const text =
        await file.text();

      const imported =
        JSON.parse(text);

      replaceDraft(
        sanitizeDraftStrings(
          imported
        ),

        {
          characterId: null,
          dirty: true,

          stepId:
            imported.builder
              ?.currentStep ||
            "basics"
        }
      );

      creatorState.currentCharacterId =
        null;

      persistDraftToSession();

      setStatus(
        "Character JSON imported as a new unsaved draft."
      );

      navigateToStep(
        creatorState.currentStepId
      );
    } catch (error) {
      console.error(error);

      alert(
        "Could not import character JSON: " +
        error.message
      );
    }
  }

  function init() {
    ensureWizardShell();
    connectPopstateRouting();
    applyInitialRoute();
    startCharacterListener();
    startRoomClassListener();
    renderCreatorView();

    window.HomebrewGodCharacterCreator =
      api;
  }

  function stop() {
    stopCharacterListener();
    stopRoomClassListener();

    if (
      wizardRuntime.popstateConnected
    ) {
      window.removeEventListener(
        "popstate",
        handleBrowserRouteChange
      );

      wizardRuntime.popstateConnected =
        false;
    }
  }

  const api = {
    init,
    stop,
    render: renderCreatorView,

    steps: BUILDER_STEPS,

    abilities:
      ABILITY_DEFINITIONS,

    skills:
      SKILL_DEFINITIONS,

    abilityMethods:
      ABILITY_SCORE_METHODS,

    defaultClasses:
      DEFAULT_CLASS_TEMPLATES,

    defaultSpecies:
      DEFAULT_SPECIES_TEMPLATES,

    defaultBackgrounds:
      DEFAULT_BACKGROUND_TEMPLATES,

    defaultEquipment:
      DEFAULT_EQUIPMENT_CATALOG,

    getState: () => {
      return creatorState;
    },

    getDraft: () => {
      return cloneData(
        creatorState.draft
      );
    },

    getCharacterSnapshot,

    startNewDraft,
    replaceDraft,
    duplicateIntoDraft,
    setDraftValue,
    setCurrentStep,

    navigateToLibrary,
    navigateToStep,

    getAllClassTemplates,
    getSelectedClassTemplate,
    selectClassTemplate,

    createEmptyCharacter,
    normalizeCharacter,
    createCharacterPayload,

    saveCharacter,

    saveAnotherCopy: () => {
      return saveCharacter(true);
    },

    deleteCharacter,

    copyCharacterJson,
    exportCharacterJson,
    importCharacterJson
  };

  init();

  return api;
}
