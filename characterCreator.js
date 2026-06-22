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

  const characterStepRenderers = new Map();
  const characterStepCompletionChecks = new Map();
  const characterCreatorActions = new Map();
  const characterCreatorInputHandlers = [];
  const characterCreatorChangeHandlers = [];

  let characterLibraryRenderer = null;

  function registerCharacterStepRenderer(stepId, renderer) {
    const step = getStepById(stepId);

    if (typeof renderer !== "function") {
      throw new TypeError(
        `Renderer for character step "${step.id}" must be a function.`
      );
    }

    characterStepRenderers.set(step.id, renderer);
  }

  function registerCharacterStepCompletion(stepId, checker) {
    const step = getStepById(stepId);

    if (typeof checker !== "function") {
      throw new TypeError(
        `Completion check for character step "${step.id}" must be a function.`
      );
    }

    characterStepCompletionChecks.set(step.id, checker);
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
          "Build one step at a time. Your draft stays in this browser tab until saved.";
      }
    }

    refreshWizardElements();
    connectWizardEvents();

    return true;
  }

  function renderActionBar() {
    const saveButton =
      $("characterWizardSaveButton");

    if (!saveButton) {
      return;
    }

    saveButton.textContent =
      creatorState.currentCharacterId
        ? "Update Character"
        : "Save New Character";
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
          >
            <span class="hg-character-step-number">
              ${complete ? "✓" : index + 1}
            </span>

            <span class="hg-character-step-label">
              ${escapeHtml(step.shortLabel)}
            </span>
          </button>
        `;
      })
      .join("");
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

    refreshWizardElements();
  }

  function renderCreatorView() {
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
      getCharacterLibraryClassName(
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

    return `
      <article class="hg-character-card">
        ${
          imageUrl
            ? `
              <img
                src="${escapeHtml(imageUrl)}"
                alt="${escapeHtml(name)}"
                style="
                  width: 100%;
                  aspect-ratio: 16 / 9;
                  object-fit: cover;
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
          Level ${level}
          ${escapeHtml(className)}

          <br>

          ${escapeHtml(speciesName)}
        </div>

        <div class="hg-character-card-actions">
          <button
            type="button"
            data-cc-action="edit-character"
            data-character-id="${escapeHtml(
              characterId
            )}"
            ${characterId ? "" : "disabled"}
          >
            Edit
          </button>

          <button
            type="button"
            data-cc-action="duplicate-character"
            data-character-id="${escapeHtml(
              characterId
            )}"
            ${characterId ? "" : "disabled"}
          >
            Duplicate
          </button>

          <button
            type="button"
            data-cc-action="delete-character"
            data-character-id="${escapeHtml(
              characterId
            )}"
            ${characterId ? "" : "disabled"}
          >
            Delete
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
  }

  function duplicateCharacterFromLibrary(
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
    "duplicate-character",

    ({ button }) => {
      duplicateCharacterFromLibrary(
        button.dataset.characterId
      );
    }
  );


// =====================================================
// CHARACTER CREATOR SECTION 11 — BASICS / SPECIES
// =====================================================

  function renderBasicsStep() {
    const identity =
      creatorState.draft.identity;

    const sizes = [
      "tiny",
      "small",
      "medium",
      "large",
      "huge",
      "gargantuan"
    ].map((size) => {
      return {
        value: size,

        label:
          size.charAt(0).toUpperCase() +
          size.slice(1)
      };
    });

    return `
      <div class="hg-character-field-grid">
        ${wizardField(
          "Character Name",
          "ccCharacterName",
          getSafeCharacterName(),
          {
            path: "identity.name",
            placeholder: "Character name"
          }
        )}

        ${wizardField(
          "Pronouns",
          "ccPronouns",
          safeDisplayString(
            identity.pronouns
          ),
          {
            path: "identity.pronouns",
            placeholder: "Optional"
          }
        )}

        ${wizardField(
          "Alignment / Outlook",
          "ccAlignment",
          safeDisplayString(
            identity.alignment
          ),
          {
            path: "identity.alignment",
            placeholder: "Optional"
          }
        )}

        ${wizardField(
          "Deity / Belief",
          "ccDeity",
          safeDisplayString(
            identity.deity
          ),
          {
            path: "identity.deity",
            placeholder: "Optional"
          }
        )}

        ${wizardField(
          "Age",
          "ccAge",
          safeDisplayString(
            identity.age
          ),
          {
            path: "identity.age",
            placeholder: "Optional"
          }
        )}

        ${wizardSelect(
          "Size",
          "ccIdentitySize",
          identity.size,
          sizes,
          {
            path: "identity.size"
          }
        )}

        ${wizardField(
          "Appearance / Identity Notes",
          "ccAppearance",
          safeDisplayString(
            identity.appearance
          ),
          {
            type: "textarea",
            path: "identity.appearance",

            placeholder:
              "Appearance, personality, identity notes...",

            wide: true
          }
        )}

        ${wizardField(
          "General Notes",
          "ccGeneralNotes",
          safeDisplayString(
            creatorState.draft.notes
          ),
          {
            type: "textarea",
            path: "notes",

            placeholder:
              "Anything that does not fit elsewhere...",

            wide: true
          }
        )}
      </div>
    `;
  }

  function getAllSpeciesTemplates() {
    const speciesMap =
      new Map();

    DEFAULT_SPECIES_TEMPLATES
      .forEach((species) => {
        const speciesId =
          makeSafeId(
            species.id ||
            species.name,
            "species"
          );

        speciesMap.set(
          speciesId,
          {
            ...cloneData(species),
            id: speciesId,
            source:
              species.source ||
              "template"
          }
        );
      });

    (
      creatorState.roomSpeciesCache ||
      []
    ).forEach((species) => {
      const speciesId =
        makeSafeId(
          species.id ||
          species.docId ||
          species.name,
          "custom-species"
        );

      speciesMap.set(
        speciesId,
        {
          ...cloneData(species),
          id: speciesId,
          source:
            species.source ||
            "homebrew"
        }
      );
    });

    const selectedSpecies =
      creatorState.draft
        .species
        .templateSnapshot;

    if (selectedSpecies) {
      const speciesId =
        makeSafeId(
          selectedSpecies.id ||
          selectedSpecies.name,
          "character-species"
        );

      speciesMap.set(
        speciesId,
        {
          ...cloneData(
            selectedSpecies
          ),

          id: speciesId,

          source:
            selectedSpecies.source ||
            "character"
        }
      );
    }

    return Array.from(
      speciesMap.values()
    ).sort((a, b) => {
      return String(a.name || "")
        .localeCompare(
          String(b.name || "")
        );
    });
  }

  function chooseSpeciesFromTemplate(
    speciesId
  ) {
    const species =
      getAllSpeciesTemplates()
        .find((item) => {
          return item.id === speciesId;
        });

    if (!species) {
      return false;
    }

    creatorState.draft.species = {
      id: species.id,

      name:
        safeDisplayString(
          species.name,
          "Unnamed Species"
        ),

      source:
        species.source ||
        "template",

      templateSnapshot:
        cloneData(species),

      choices: {},

      traits:
        cloneData(
          species.traits ||
          []
        )
    };

    creatorState.draft.identity.size =
      species.size ||
      "medium";

    creatorState.draft
      .combat
      .speed
      .walk =
        Math.max(
          0,
          safeNumber(
            species.speed,
            30
          )
        );

    creatorState.draft
      .features
      .speciesTraits =
        cloneData(
          creatorState.draft
            .species
            .traits
        );

    applyCompatibilityAliases(
      creatorState.draft
    );

    markDraftChanged();

    return true;
  }

  function applyCustomSpecies() {
    const name =
      safeDisplayString(
        $("ccCustomSpeciesName")
          ?.value
      );

    if (!name) {
      alert(
        "Enter a custom species name."
      );

      return false;
    }

    const currentTraits =
      Array.isArray(
        creatorState.draft
          .species
          .traits
      )
        ? cloneData(
            creatorState.draft
              .species
              .traits
          )
        : [];

    creatorState.draft.species = {
      id: makeSafeId(
        name,
        "custom-species"
      ),

      name,
      source: "custom",
      templateSnapshot: null,
      choices: {},
      traits: currentTraits
    };

    creatorState.draft.identity.size =
      $("ccCustomSpeciesSize")
        ?.value ||
      "medium";

    creatorState.draft
      .combat
      .speed
      .walk =
        Math.max(
          0,
          safeNumber(
            $("ccCustomSpeciesSpeed")
              ?.value,
            30
          )
        );

    creatorState.draft
      .features
      .speciesTraits =
        cloneData(currentTraits);

    applyCompatibilityAliases(
      creatorState.draft
    );

    markDraftChanged();

    return true;
  }

  function addSpeciesTrait() {
    const name =
      safeDisplayString(
        $("ccNewSpeciesTraitName")
          ?.value
      );

    const summary =
      safeDisplayString(
        $("ccNewSpeciesTraitSummary")
          ?.value
      );

    if (!name) {
      alert(
        "Enter a trait name."
      );

      return false;
    }

    if (
      !Array.isArray(
        creatorState.draft
          .species
          .traits
      )
    ) {
      creatorState.draft
        .species
        .traits = [];
    }

    creatorState.draft
      .species
      .traits
      .push({
        id: makeSafeId(
          name +
          "-" +
          Date.now(),
          "species-trait"
        ),

        name,
        summary
      });

    creatorState.draft
      .features
      .speciesTraits =
        cloneData(
          creatorState.draft
            .species
            .traits
        );

    applyCompatibilityAliases(
      creatorState.draft
    );

    markDraftChanged();

    return true;
  }

  function removeSpeciesTrait(index) {
    const traits =
      creatorState.draft
        .species
        .traits;

    if (
      !Array.isArray(traits) ||
      index < 0 ||
      index >= traits.length
    ) {
      return false;
    }

    traits.splice(index, 1);

    creatorState.draft
      .features
      .speciesTraits =
        cloneData(traits);

    applyCompatibilityAliases(
      creatorState.draft
    );

    markDraftChanged();

    return true;
  }

  function renderSpeciesStep() {
    const currentSpecies =
      getSafeSpeciesName();

    const selectedSpeciesId =
      creatorState.draft
        .species
        .id;

    const speciesCards =
      getAllSpeciesTemplates()
        .map((species) => {
          const selected =
            selectedSpeciesId ===
              species.id ||
            (
              !selectedSpeciesId &&
              currentSpecies ===
                species.name
            );

          const body = `
            <p>
              ${escapeHtml(
                species.summary ||
                "No description provided."
              )}
            </p>

            <p>
              <b>Size:</b>

              ${escapeHtml(
                species.size ||
                "medium"
              )}
            </p>

            <p>
              <b>Walking Speed:</b>

              ${Math.max(
                0,
                safeNumber(
                  species.speed,
                  30
                )
              )} ft.
            </p>
          `;

          return wizardChoiceCard(
            species.name ||
              "Unnamed Species",

            body,

            selected
              ? "Selected"
              : "Choose Species",

            "choose-species",

            {
              "species-id":
                species.id
            },

            selected
          );
        })
        .join("");

    const traits =
      Array.isArray(
        creatorState.draft
          .species
          .traits
      )
        ? creatorState.draft
            .species
            .traits
        : [];

    const traitCards =
      traits
        .map((trait, index) => {
          return wizardChoiceCard(
            trait.name ||
              "Unnamed Trait",

            `
              <p>
                ${escapeHtml(
                  trait.summary ||
                  "No description provided."
                )}
              </p>
            `,

            "Remove Trait",

            "remove-species-trait",

            {
              index
            },

            false
          );
        })
        .join("");

    const sizes = [
      "tiny",
      "small",
      "medium",
      "large",
      "huge",
      "gargantuan"
    ].map((size) => {
      return {
        value: size,

        label:
          size.charAt(0).toUpperCase() +
          size.slice(1)
      };
    });

    return `
      <div class="hg-character-current-choice">
        <b>Current species:</b>

        ${escapeHtml(
          currentSpecies ||
          "None selected"
        )}
      </div>

      <div class="hg-character-choice-grid">
        ${speciesCards}
      </div>

      <hr>

      <h3>Custom Species</h3>

      <p>
        Use this when your species is completely
        homebrewed or is not in the available templates.
      </p>

      <div class="hg-character-field-grid three">
        ${wizardField(
          "Name",
          "ccCustomSpeciesName",

          creatorState.draft
            .species
            .source ===
            "custom"
              ? currentSpecies
              : "",

          {
            placeholder:
              "Half Celestial Owlbear"
          }
        )}

        ${wizardSelect(
          "Size",
          "ccCustomSpeciesSize",

          creatorState.draft
            .identity
            .size,

          sizes
        )}

        ${wizardField(
          "Walking Speed",
          "ccCustomSpeciesSpeed",

          creatorState.draft
            .combat
            .speed
            .walk,

          {
            type: "number",
            valueType: "number",
            extra: 'min="0" step="5"'
          }
        )}
      </div>

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="use-custom-species"
        >
          Use Custom Species
        </button>
      </div>

      <hr>

      <h3>Species Traits</h3>

      <div class="hg-character-choice-grid">
        ${
          traitCards ||
          `
            <div class="hg-character-placeholder">
              No species traits have been added yet.
            </div>
          `
        }
      </div>

      <div
        class="hg-character-field-grid"
        style="margin-top: 12px;"
      >
        ${wizardField(
          "Trait Name",
          "ccNewSpeciesTraitName",
          "",
          {
            placeholder:
              "Darkvision"
          }
        )}

        ${wizardField(
          "Trait Description",
          "ccNewSpeciesTraitSummary",
          "",
          {
            placeholder:
              "Short original description"
          }
        )}
      </div>

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="add-species-trait"
        >
          Add Species Trait
        </button>
      </div>
    `;
  }

  function findSection11ActionElement(
    ...values
  ) {
    for (const value of values) {
      const candidates = [
        value,
        value?.target,
        value?.currentTarget,
        value?.element,
        value?.button,
        value?.control,
        value?.actionElement
      ];

      for (const candidate of candidates) {
        if (
          typeof Element !==
            "undefined" &&
          candidate instanceof Element
        ) {
          return (
            candidate.closest(
              "[data-cc-action]"
            ) ||
            candidate
          );
        }
      }
    }

    return null;
  }

  function handleChooseSpeciesAction(
    ...values
  ) {
    const button =
      findSection11ActionElement(
        ...values
      );

    const speciesId =
      button?.dataset
        ?.speciesId ||
      "";

    if (
      chooseSpeciesFromTemplate(
        speciesId
      )
    ) {
      setStatus(
        "Species selected: " +
        getSafeSpeciesName() +
        "."
      );

      renderCreatorView();
    }
  }

  function handleUseCustomSpeciesAction() {
    if (applyCustomSpecies()) {
      setStatus(
        "Custom species applied."
      );

      renderCreatorView();
    }
  }

  function handleAddSpeciesTraitAction() {
    if (addSpeciesTrait()) {
      setStatus(
        "Species trait added."
      );

      renderCreatorView();
    }
  }

  function handleRemoveSpeciesTraitAction(
    ...values
  ) {
    const button =
      findSection11ActionElement(
        ...values
      );

    const index =
      Math.round(
        safeNumber(
          button?.dataset?.index,
          -1
        )
      );

    if (removeSpeciesTrait(index)) {
      setStatus(
        "Species trait removed."
      );

      renderCreatorView();
    }
  }

  registerCharacterStepRenderer(
    "basics",
    renderBasicsStep
  );

  registerCharacterStepRenderer(
    "species",
    renderSpeciesStep
  );

  registerCharacterCreatorAction(
    "choose-species",
    handleChooseSpeciesAction
  );

  registerCharacterCreatorAction(
    "use-custom-species",
    handleUseCustomSpeciesAction
  );

  registerCharacterCreatorAction(
    "add-species-trait",
    handleAddSpeciesTraitAction
  );

  registerCharacterCreatorAction(
    "remove-species-trait",
    handleRemoveSpeciesTraitAction
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

    return {
      ...cloneData(raw),

      id: makeSafeId(
        raw.id || name,
        "custom-subclass"
      ),

      name,

      source:
        safeDisplayString(
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

      levels:
        raw.levels &&
        typeof raw.levels ===
          "object" &&
        !Array.isArray(raw.levels)
          ? cloneData(raw.levels)
          : {}
    };
  }

  function getSection12SubclassTemplates() {
    const selectedClass =
      getSelectedClassTemplate();

    const subclassMap =
      new Map();

    (
      Array.isArray(
        selectedClass?.subclasses
      )
        ? selectedClass.subclasses
        : []
    ).forEach((subclass) => {
      const normalized =
        normalizeSection12Subclass(
          subclass,

          subclass?.source ||
          selectedClass?.source ||
          "template"
        );

      subclassMap.set(
        normalized.id,
        normalized
      );
    });

    const primaryClass =
      getSection12PrimaryClass();

    const savedSubclass =
      primaryClass?.choices
        ?.subclassSnapshot;

    if (savedSubclass) {
      const normalized =
        normalizeSection12Subclass(
          savedSubclass,
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

    const savedSnapshot =
      primaryClass.choices
        ?.subclassSnapshot;

    if (savedSnapshot) {
      return normalizeSection12Subclass(
        savedSnapshot,
        "character"
      );
    }

    return (
      getSection12SubclassTemplates()
        .find((subclass) => {
          return (
            subclass.id ===
            primaryClass.subclassId
          );
        }) ||
      null
    );
  }

  function refreshSelectedClassFeatures() {
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

    creatorState.draft
      .proficiencies
      .savingThrows =
        cloneData(
          classTemplate
            .savingThrows ||
          []
        );

    creatorState.draft
      .proficiencies
      .armor =
        cloneData(
          classTemplate
            .armorProficiencies ||
          []
        );

    creatorState.draft
      .proficiencies
      .weapons =
        cloneData(
          classTemplate
            .weaponProficiencies ||
          []
        );

    creatorState.draft
      .proficiencies
      .tools =
        cloneData(
          classTemplate
            .toolProficiencies ||
          []
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

    creatorState.draft
      .classProgression
      .classes = [
        {
          classId:
            customClass.id,

          className:
            customClass.name,

          source: "custom",
          level: totalLevel,
          subclassId: "",
          subclassName: "",

          templateSnapshot:
            cloneData(
              customClass
            ),

          choices: {}
        }
      ];

    creatorState.draft
      .proficiencies
      .skills = {};

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

  function renderClassStep() {
    const primaryClass =
      getSection12PrimaryClass();

    const selectedClass =
      getSelectedClassTemplate();

    const selectedClassId =
      primaryClass?.classId || "";

    const classCards =
      getAllClassTemplates()
        .map((classData) => {
          const selected =
            selectedClassId ===
            classData.id;

          const primaryAbilities =
            formatSection12List(
              classData
                .primaryAbilities
            ) ||
            "Not specified";

          const savingThrows =
            formatSection12List(
              classData
                .savingThrows
            ) ||
            "Not specified";

          return wizardChoiceCard(
            classData.name ||
            "Unnamed Class",

            `
              <p>
                ${escapeHtml(
                  classData.summary ||
                  "No description provided."
                )}
              </p>

              <p>
                <b>Hit Die:</b>

                ${escapeHtml(
                  classData.hitDie ||
                  "d8"
                )}
              </p>

              <p>
                <b>Primary Abilities:</b>

                ${escapeHtml(
                  primaryAbilities
                )}
              </p>

              <p>
                <b>Saving Throws:</b>

                ${escapeHtml(
                  savingThrows
                )}
              </p>

              <p>
                <b>Subclass Level:</b>

                ${Math.max(
                  1,
                  safeNumber(
                    classData
                      .subclassLevel,
                    3
                  )
                )}
              </p>

              <p class="small">
                Source:

                ${escapeHtml(
                  classData.source ||
                  "template"
                )}
              </p>
            `,

            selected
              ? "Selected"
              : "Choose Class",

            "choose-class",

            {
              "class-id":
                classData.id
            },

            selected
          );
        })
        .join("");

    const customSource =
      primaryClass?.source ===
      "custom";

    const customTemplate =
      customSource
        ? primaryClass
            ?.templateSnapshot
        : null;

    const hitDice = [
      "d4",
      "d6",
      "d8",
      "d10",
      "d12",
      "d20"
    ].map((die) => {
      return {
        value: die,
        label: die
      };
    });

    return `
      <div class="hg-character-current-choice">
        <b>Current class:</b>

        ${escapeHtml(
          getSafeClassName() ||
          "None selected"
        )}

        ${
          selectedClass
            ? `
              <span class="small">
                · ${escapeHtml(
                  selectedClass
                    .hitDie ||
                  "d8"
                )} hit die
              </span>
            `
            : ""
        }
      </div>

      <div class="hg-character-choice-grid">
        ${classCards}
      </div>

      <hr>

      <h3>Custom Class</h3>

      <p>
        Use this for a fully original class or a class
        that has not been added to the room library yet.
      </p>

      <div class="hg-character-field-grid three">
        ${wizardField(
          "Class Name",
          "ccCustomClassName",

          customSource
            ? getSafeClassName()
            : "",

          {
            placeholder:
              "Blood Hunter"
          }
        )}

        ${wizardSelect(
          "Hit Die",
          "ccCustomClassHitDie",

          customTemplate
            ?.hitDie ||
          "d8",

          hitDice
        )}

        ${wizardField(
          "Subclass Unlock Level",
          "ccCustomClassSubclassLevel",

          customTemplate
            ?.subclassLevel ||
          3,

          {
            type: "number",
            valueType: "integer",
            extra:
              'min="1" max="20" step="1"'
          }
        )}

        ${wizardField(
          "Primary Abilities",
          "ccCustomClassPrimaryAbilities",

          formatSection12List(
            customTemplate
              ?.primaryAbilities
          ),

          {
            placeholder:
              "Strength, Wisdom"
          }
        )}

        ${wizardField(
          "Saving Throws",
          "ccCustomClassSavingThrows",

          formatSection12List(
            customTemplate
              ?.savingThrows
          ),

          {
            placeholder:
              "Strength, Constitution"
          }
        )}

        ${wizardField(
          "Skills to Choose",
          "ccCustomClassSkillCount",

          customTemplate
            ?.skillChoices
            ?.choose ||
          0,

          {
            type: "number",
            valueType: "integer",
            extra:
              'min="0" max="18" step="1"'
          }
        )}

        ${wizardField(
          "Available Skills",
          "ccCustomClassSkills",

          formatSection12List(
            customTemplate
              ?.skillChoices
              ?.from
          ),

          {
            placeholder:
              "Athletics, Arcana, Perception",
            wide: true
          }
        )}

        ${wizardField(
          "Armor Proficiencies",
          "ccCustomClassArmor",

          formatSection12List(
            customTemplate
              ?.armorProficiencies
          ),

          {
            placeholder:
              "Light armor, Shields",
            wide: true
          }
        )}

        ${wizardField(
          "Weapon Proficiencies",
          "ccCustomClassWeapons",

          formatSection12List(
            customTemplate
              ?.weaponProficiencies
          ),

          {
            placeholder:
              "Simple weapons, Martial weapons",
            wide: true
          }
        )}

        ${wizardField(
          "Tool Proficiencies",
          "ccCustomClassTools",

          formatSection12List(
            customTemplate
              ?.toolProficiencies
          ),

          {
            placeholder:
              "Smith's tools",
            wide: true
          }
        )}

        ${wizardField(
          "Class Summary",
          "ccCustomClassSummary",

          safeDisplayString(
            customTemplate?.summary
          ),

          {
            type: "textarea",

            placeholder:
              "Describe the class's central fantasy and playstyle...",

            wide: true
          }
        )}
      </div>

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="use-custom-class"
        >
          Use Custom Class
        </button>
      </div>
    `;
  }

  function renderSubclassStep() {
    const primaryClass =
      getSection12PrimaryClass();

    const selectedClass =
      getSelectedClassTemplate();

    const selectedSubclass =
      getSelectedSection12Subclass();

    const subclassLevel =
      Math.max(
        1,
        Math.round(
          safeNumber(
            selectedClass
              ?.subclassLevel,
            3
          )
        )
      );

    if (!primaryClass) {
      return `
        <div class="hg-character-warning">
          Choose a class before selecting a subclass.
        </div>
      `;
    }

    const subclassCards =
      getSection12SubclassTemplates()
        .map((subclass) => {
          const selected =
            primaryClass
              .subclassId ===
            subclass.id;

          return wizardChoiceCard(
            subclass.name ||
            "Unnamed Subclass",

            `
              <p>
                ${escapeHtml(
                  subclass.summary ||
                  "No description provided."
                )}
              </p>

              <p class="small">
                Source:

                ${escapeHtml(
                  subclass.source ||
                  "template"
                )}
              </p>
            `,

            selected
              ? "Selected"
              : "Choose Subclass",

            "choose-subclass",

            {
              "subclass-id":
                subclass.id
            },

            selected
          );
        })
        .join("");

    return `
      <div class="hg-character-current-choice">
        <b>Class:</b>

        ${escapeHtml(
          getSafeClassName() ||
          "None selected"
        )}

        <br>

        <b>Current subclass:</b>

        ${escapeHtml(
          getSafeSubclassName() ||
          "None selected"
        )}
      </div>

      <div class="hg-character-warning">
        This class normally gains its subclass at level
        ${subclassLevel}. You may choose it early while
        planning the character.
      </div>

      <div class="hg-character-choice-grid">
        ${
          subclassCards ||
          `
            <div class="hg-character-placeholder">
              This class does not have any saved subclass
              templates yet. You can create a custom one below.
            </div>
          `
        }
      </div>

      ${
        selectedSubclass
          ? `
            <div class="hg-character-inline-actions">
              <button
                type="button"
                data-cc-action="clear-subclass"
              >
                Remove Current Subclass
              </button>
            </div>
          `
          : ""
      }

      <hr>

      <h3>Custom Subclass</h3>

      <div class="hg-character-field-grid">
        ${wizardField(
          "Subclass Name",
          "ccCustomSubclassName",

          selectedSubclass?.source ===
          "custom"
            ? selectedSubclass.name
            : "",

          {
            placeholder:
              "Order of the Crimson Moon"
          }
        )}

        ${wizardField(
          "Subclass Unlock Level",
          "ccCustomSubclassLevel",

          selectedSubclass
            ?.unlockLevel ||
          subclassLevel,

          {
            type: "number",
            valueType: "integer",
            extra:
              'min="1" max="20" step="1"'
          }
        )}

        ${wizardField(
          "Subclass Summary",
          "ccCustomSubclassSummary",

          selectedSubclass?.source ===
          "custom"
            ? selectedSubclass.summary
            : "",

          {
            type: "textarea",

            placeholder:
              "Describe the subclass theme and abilities...",

            wide: true
          }
        )}
      </div>

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="use-custom-subclass"
        >
          Use Custom Subclass
        </button>
      </div>
    `;
  }

  function findSection12ActionElement(
    ...values
  ) {
    for (const value of values) {
      const candidates = [
        value,
        value?.target,
        value?.currentTarget,
        value?.element,
        value?.button,
        value?.control,
        value?.actionElement
      ];

      for (const candidate of candidates) {
        if (
          typeof Element !==
            "undefined" &&
          candidate instanceof Element
        ) {
          return (
            candidate.closest(
              "[data-cc-action]"
            ) ||
            candidate
          );
        }
      }
    }

    return null;
  }

  function handleSection12ChooseClass(
    ...values
  ) {
    const button =
      findSection12ActionElement(
        ...values
      );

    const classId =
      button?.dataset?.classId ||
      "";

    if (
      chooseSection12Class(
        classId
      )
    ) {
      setStatus(
        "Class selected: " +
        getSafeClassName() +
        "."
      );

      renderCreatorView();
    }
  }

  function handleSection12CustomClass() {
    if (
      applySection12CustomClass()
    ) {
      setStatus(
        "Custom class applied."
      );

      renderCreatorView();
    }
  }

  function handleSection12ChooseSubclass(
    ...values
  ) {
    const button =
      findSection12ActionElement(
        ...values
      );

    const subclassId =
      button?.dataset
        ?.subclassId ||
      "";

    if (
      chooseSection12Subclass(
        subclassId
      )
    ) {
      setStatus(
        "Subclass selected: " +
        getSafeSubclassName() +
        "."
      );

      renderCreatorView();
    }
  }

  function handleSection12CustomSubclass() {
    if (
      applySection12CustomSubclass()
    ) {
      setStatus(
        "Custom subclass applied."
      );

      renderCreatorView();
    }
  }

  function handleSection12ClearSubclass() {
    if (
      clearSection12Subclass()
    ) {
      setStatus(
        "Subclass removed."
      );

      renderCreatorView();
    }
  }

  registerCharacterStepRenderer(
    "class",
    renderClassStep
  );

  registerCharacterStepRenderer(
    "subclass",
    renderSubclassStep
  );

  registerCharacterCreatorAction(
    "choose-class",
    handleSection12ChooseClass
  );

  registerCharacterCreatorAction(
    "use-custom-class",
    handleSection12CustomClass
  );

  registerCharacterCreatorAction(
    "choose-subclass",
    handleSection12ChooseSubclass
  );

  registerCharacterCreatorAction(
    "use-custom-subclass",
    handleSection12CustomSubclass
  );

  registerCharacterCreatorAction(
    "clear-subclass",
    handleSection12ClearSubclass
  );


// =====================================================
// CHARACTER CREATOR SECTION 13 — LEVEL / ABILITY SCORES
// =====================================================

  const SECTION13_POINT_BUY_COSTS = Object.freeze({
    8: 0,
    9: 1,
    10: 2,
    11: 3,
    12: 4,
    13: 5,
    14: 7,
    15: 9
  });

  function getSection13AbilityName(abilityId) {
    return (
      ABILITY_DEFINITIONS.find((ability) => {
        return ability.id === abilityId;
      })?.name ||
      String(abilityId || "").toUpperCase()
    );
  }

  function getSection13AbilityScore(abilityId) {
    return Math.max(
      1,
      Math.min(
        30,
        Math.round(
          safeNumber(
            creatorState.draft
              .abilities
              .scores[abilityId],
            10
          )
        )
      )
    );
  }

  function setSection13AbilityMethod(method) {
    const validMethod =
      ABILITY_SCORE_METHODS.some((item) => {
        return item.id === method;
      })
        ? method
        : "manual";

    creatorState.draft
      .abilities
      .method = validMethod;

    if (validMethod === "standard-array") {
      applySection13StandardArray();
      return;
    }

    if (validMethod === "point-buy") {
      applySection13PointBuyDefaults();
      return;
    }

    if (
      validMethod === "rolled" &&
      !Array.isArray(
        creatorState.draft
          .abilities
          .assignmentPool
      )
    ) {
      creatorState.draft
        .abilities
        .assignmentPool = [];
    }

    markDraftChanged();
  }

  function applySection13Scores(scoreMap) {
    ABILITY_DEFINITIONS.forEach((ability) => {
      const score = Math.max(
        1,
        Math.min(
          30,
          Math.round(
            safeNumber(
              scoreMap?.[ability.id],
              10
            )
          )
        )
      );

      creatorState.draft
        .abilities
        .base[ability.id] = score;

      creatorState.draft
        .abilities
        .scores[ability.id] = score;
    });

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

  function applySection13StandardArray() {
    creatorState.draft
      .abilities
      .method = "standard-array";

    creatorState.draft
      .abilities
      .assignmentPool = [
        15,
        14,
        13,
        12,
        10,
        8
      ];

    applySection13Scores({
      str: 15,
      dex: 14,
      con: 13,
      int: 12,
      wis: 10,
      cha: 8
    });
  }

  function assignSection13StandardScore(
    abilityId,
    newScore
  ) {
    const pool = [
      15,
      14,
      13,
      12,
      10,
      8
    ];

    const score = Math.round(
      safeNumber(newScore, 10)
    );

    if (!pool.includes(score)) {
      return false;
    }

    const currentScore =
      getSection13AbilityScore(
        abilityId
      );

    const otherAbility =
      ABILITY_DEFINITIONS.find(
        (ability) => {
          return (
            ability.id !== abilityId &&
            getSection13AbilityScore(
              ability.id
            ) === score
          );
        }
      );

    creatorState.draft
      .abilities
      .base[abilityId] = score;

    creatorState.draft
      .abilities
      .scores[abilityId] = score;

    if (otherAbility) {
      creatorState.draft
        .abilities
        .base[otherAbility.id] =
          currentScore;

      creatorState.draft
        .abilities
        .scores[otherAbility.id] =
          currentScore;
    }

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

    return true;
  }

  function applySection13PointBuyDefaults() {
    creatorState.draft
      .abilities
      .method = "point-buy";

    creatorState.draft
      .abilities
      .assignmentPool = [];

    applySection13Scores({
      str: 8,
      dex: 8,
      con: 8,
      int: 8,
      wis: 8,
      cha: 8
    });
  }

  function getSection13PointBuySpent() {
    return ABILITY_DEFINITIONS.reduce(
      (total, ability) => {
        const score = Math.max(
          8,
          Math.min(
            15,
            getSection13AbilityScore(
              ability.id
            )
          )
        );

        return (
          total +
          safeNumber(
            SECTION13_POINT_BUY_COSTS[
              score
            ],
            0
          )
        );
      },
      0
    );
  }

  function changeSection13PointBuyScore(
    abilityId,
    direction
  ) {
    const currentScore = Math.max(
      8,
      Math.min(
        15,
        getSection13AbilityScore(
          abilityId
        )
      )
    );

    const nextScore =
      currentScore + direction;

    if (
      nextScore < 8 ||
      nextScore > 15
    ) {
      return false;
    }

    const currentCost =
      SECTION13_POINT_BUY_COSTS[
        currentScore
      ];

    const nextCost =
      SECTION13_POINT_BUY_COSTS[
        nextScore
      ];

    const spent =
      getSection13PointBuySpent();

    const nextSpent =
      spent -
      currentCost +
      nextCost;

    if (nextSpent > 27) {
      setStatus(
        "Point buy cannot exceed 27 points."
      );

      return false;
    }

    creatorState.draft
      .abilities
      .base[abilityId] = nextScore;

    creatorState.draft
      .abilities
      .scores[abilityId] = nextScore;

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

    return true;
  }

  function rollSection13AbilityScore() {
    const rolls = Array.from(
      { length: 4 },
      () => {
        return (
          Math.floor(
            Math.random() * 6
          ) + 1
        );
      }
    ).sort((a, b) => a - b);

    return rolls
      .slice(1)
      .reduce(
        (total, roll) => {
          return total + roll;
        },
        0
      );
  }

  function rollSection13ScorePool() {
    creatorState.draft
      .abilities
      .method = "rolled";

    creatorState.draft
      .abilities
      .assignmentPool =
        Array.from(
          { length: 6 },
          () => {
            return rollSection13AbilityScore();
          }
        );

    markDraftChanged();

    return creatorState.draft
      .abilities
      .assignmentPool;
  }

  function applySection13RolledScores() {
    const pool =
      Array.isArray(
        creatorState.draft
          .abilities
          .assignmentPool
      )
        ? creatorState.draft
            .abilities
            .assignmentPool
        : [];

    if (pool.length !== 6) {
      alert(
        "Roll six scores before applying them."
      );

      return false;
    }

    const scoreMap = {};

    ABILITY_DEFINITIONS.forEach(
      (ability, index) => {
        scoreMap[ability.id] =
          safeNumber(
            pool[index],
            10
          );
      }
    );

    applySection13Scores(
      scoreMap
    );

    return true;
  }

  function getSection13HitDieSize() {
    const selectedClass =
      getSelectedClassTemplate();

    const text = String(
      selectedClass?.hitDie ||
      "d8"
    );

    return Math.max(
      4,
      Math.round(
        safeNumber(
          text.replace(/[^0-9]/g, ""),
          8
        )
      )
    );
  }

  function calculateSection13SuggestedHp() {
    const level = clampLevel(
      creatorState.draft
        .classProgression
        .totalLevel
    );

    const hitDie =
      getSection13HitDieSize();

    const conModifier =
      calculateAbilityModifier(
        getSection13AbilityScore(
          "con"
        )
      );

    const averagePerLevel =
      Math.floor(hitDie / 2) + 1;

    return Math.max(
      1,
      hitDie +
      conModifier +
      Math.max(0, level - 1) *
      Math.max(
        1,
        averagePerLevel +
        conModifier
      )
    );
  }

  function applySection13SuggestedHp() {
    const suggestedHp =
      calculateSection13SuggestedHp();

    creatorState.draft
      .combat
      .maxHp = suggestedHp;

    creatorState.draft
      .combat
      .currentHp = suggestedHp;

    applyCompatibilityAliases(
      creatorState.draft
    );

    markDraftChanged();

    return suggestedHp;
  }

  function refreshSection13LevelProgression() {
    const selectedClass =
      getSelectedClassTemplate();

    const level = clampLevel(
      creatorState.draft
        .classProgression
        .totalLevel
    );

    const primaryClass =
      getPrimaryClassEntry(
        creatorState.draft
      );

    if (primaryClass) {
      primaryClass.level = level;
    }

    creatorState.draft
      .combat
      .proficiencyBonus =
        getGenericProficiencyBonus(
          level
        );

    if (
      selectedClass &&
      typeof applySection12ClassDefaults ===
        "function"
    ) {
      applySection12ClassDefaults(
        selectedClass
      );
    } else if (
      typeof refreshSelectedClassFeatures ===
      "function"
    ) {
      refreshSelectedClassFeatures();
    }

    applyCompatibilityAliases(
      creatorState.draft
    );

    markDraftChanged();
  }

  function renderSection13HitDice() {
    const hitDice =
      Array.isArray(
        creatorState.draft
          .combat
          .hitDice
      )
        ? creatorState.draft
            .combat
            .hitDice
        : [];

    if (!hitDice.length) {
      return `
        <div class="hg-character-placeholder">
          No hit dice are currently recorded.
        </div>
      `;
    }

    return hitDice
      .map((entry) => {
        return `
          <article class="hg-character-choice-card">
            <h3>
              ${escapeHtml(
                entry.className ||
                getSafeClassName() ||
                "Class"
              )}
            </h3>

            <p>
              ${Math.max(
                1,
                Math.round(
                  safeNumber(
                    entry.count,
                    1
                  )
                )
              )}

              ${escapeHtml(
                entry.die ||
                "d8"
              )}

              hit dice
            </p>
          </article>
        `;
      })
      .join("");
  }

  function renderLevelStep() {
    const draft =
      creatorState.draft;

    const level = clampLevel(
      draft.classProgression
        .totalLevel
    );

    const selectedClass =
      getSelectedClassTemplate();

    const suggestedHp =
      calculateSection13SuggestedHp();

    return `
      <div class="hg-character-current-choice">
        <b>Current progression:</b>

        Level ${level}

        ${escapeHtml(
          getSafeClassName() ||
          "No class selected"
        )}

        <br>

        <b>Proficiency Bonus:</b>

        +${Math.max(
          0,
          safeNumber(
            draft.combat
              .proficiencyBonus,
            getGenericProficiencyBonus(
              level
            )
          )
        )}
      </div>

      <div class="hg-character-field-grid three">
        ${wizardField(
          "Character Level",
          "ccCharacterLevel",
          level,
          {
            type: "number",
            valueType: "integer",
            extra:
              'min="1" max="20" step="1" data-level-input="true"'
          }
        )}

        ${wizardField(
          "Maximum HP",
          "ccMaximumHp",
          draft.combat.maxHp,
          {
            type: "number",
            path: "combat.maxHp",
            valueType: "number",
            extra:
              'min="1" step="1"'
          }
        )}

        ${wizardField(
          "Current HP",
          "ccCurrentHp",
          draft.combat.currentHp,
          {
            type: "number",
            path: "combat.currentHp",
            valueType: "number",
            extra:
              'min="0" step="1"'
          }
        )}

        ${wizardField(
          "Temporary HP",
          "ccTemporaryHp",
          draft.combat.temporaryHp,
          {
            type: "number",
            path: "combat.temporaryHp",
            valueType: "number",
            extra:
              'min="0" step="1"'
          }
        )}

        ${wizardField(
          "Armor Class",
          "ccArmorClass",
          draft.combat.armorClass,
          {
            type: "number",
            path: "combat.armorClass",
            valueType: "number",
            extra:
              'min="0" step="1"'
          }
        )}

        ${wizardField(
          "Initiative Bonus",
          "ccInitiativeBonus",
          draft.combat.initiative,
          {
            type: "number",
            path: "combat.initiative",
            valueType: "number",
            extra:
              'step="1"'
          }
        )}
      </div>

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="refresh-level-progression"
        >
          Refresh Level Progression
        </button>

        <button
          type="button"
          data-cc-action="calculate-character-hp"
        >
          Use Suggested HP (${suggestedHp})
        </button>
      </div>

      <hr>

      <h3>Movement Speeds</h3>

      <div class="hg-character-field-grid three">
        ${wizardField(
          "Walking Speed",
          "ccWalkSpeed",
          draft.combat.speed.walk,
          {
            type: "number",
            path: "combat.speed.walk",
            valueType: "number",
            extra:
              'min="0" step="5"'
          }
        )}

        ${wizardField(
          "Climbing Speed",
          "ccClimbSpeed",
          draft.combat.speed.climb,
          {
            type: "number",
            path: "combat.speed.climb",
            valueType: "number",
            extra:
              'min="0" step="5"'
          }
        )}

        ${wizardField(
          "Swimming Speed",
          "ccSwimSpeed",
          draft.combat.speed.swim,
          {
            type: "number",
            path: "combat.speed.swim",
            valueType: "number",
            extra:
              'min="0" step="5"'
          }
        )}

        ${wizardField(
          "Flying Speed",
          "ccFlySpeed",
          draft.combat.speed.fly,
          {
            type: "number",
            path: "combat.speed.fly",
            valueType: "number",
            extra:
              'min="0" step="5"'
          }
        )}

        ${wizardField(
          "Burrowing Speed",
          "ccBurrowSpeed",
          draft.combat.speed.burrow,
          {
            type: "number",
            path: "combat.speed.burrow",
            valueType: "number",
            extra:
              'min="0" step="5"'
          }
        )}

        ${wizardField(
          "Special Movement Notes",
          "ccSpecialMovement",
          safeDisplayString(
            draft.combat.speed.special
          ),
          {
            path: "combat.speed.special",
            placeholder:
              "Hover, teleport, conditional movement..."
          }
        )}
      </div>

      <hr>

      <h3>Hit Dice</h3>

      <p>
        The selected class currently uses a
        <b>${escapeHtml(
          selectedClass?.hitDie ||
          "d8"
        )}</b>
        hit die.
      </p>

      <div class="hg-character-choice-grid">
        ${renderSection13HitDice()}
      </div>
    `;
  }

  function renderSection13ManualAbilities() {
    return `
      <div class="hg-character-field-grid three">
        ${ABILITY_DEFINITIONS.map(
          (ability) => {
            return wizardField(
              ability.name,
              `ccAbility-${ability.id}`,
              getSection13AbilityScore(
                ability.id
              ),
              {
                type: "number",
                extra:
                  `min="1" max="30" step="1" data-ability-id="${escapeHtml(
                    ability.id
                  )}"`
              }
            );
          }
        ).join("")}
      </div>
    `;
  }

  function renderSection13StandardArray() {
    const choices = [
      15,
      14,
      13,
      12,
      10,
      8
    ].map((score) => {
      return {
        value: score,
        label: String(score)
      };
    });

    return `
      <div class="hg-character-warning">
        Each score can only be assigned once. Choosing a
        score already in use swaps the two abilities.
      </div>

      <div class="hg-character-field-grid three">
        ${ABILITY_DEFINITIONS.map(
          (ability) => {
            return wizardSelect(
              ability.name,
              `ccStandard-${ability.id}`,
              getSection13AbilityScore(
                ability.id
              ),
              choices,
              {
                extra:
                  `data-standard-ability-id="${escapeHtml(
                    ability.id
                  )}"`
              }
            );
          }
        ).join("")}
      </div>

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="reset-standard-array"
        >
          Reset Standard Array
        </button>
      </div>
    `;
  }

  function renderSection13PointBuy() {
    const spent =
      getSection13PointBuySpent();

    const remaining =
      Math.max(0, 27 - spent);

    return `
      <div class="hg-character-current-choice">
        <b>Points spent:</b>
        ${spent} / 27

        <br>

        <b>Points remaining:</b>
        ${remaining}
      </div>

      <div class="hg-character-choice-grid">
        ${ABILITY_DEFINITIONS.map(
          (ability) => {
            const score =
              Math.max(
                8,
                Math.min(
                  15,
                  getSection13AbilityScore(
                    ability.id
                  )
                )
              );

            const cost =
              SECTION13_POINT_BUY_COSTS[
                score
              ];

            return `
              <article class="hg-character-choice-card">
                <h3>
                  ${escapeHtml(
                    ability.name
                  )}
                </h3>

                <p>
                  <b>Score:</b>
                  ${score}

                  <br>

                  <b>Modifier:</b>
                  ${calculateAbilityModifier(
                    score
                  ) >= 0 ? "+" : ""}${calculateAbilityModifier(
                    score
                  )}

                  <br>

                  <b>Cost:</b>
                  ${cost}
                </p>

                <div class="hg-character-card-actions">
                  <button
                    type="button"
                    data-cc-action="point-buy-decrease"
                    data-ability-id="${escapeHtml(
                      ability.id
                    )}"
                    ${score <= 8 ? "disabled" : ""}
                  >
                    −
                  </button>

                  <button
                    type="button"
                    data-cc-action="point-buy-increase"
                    data-ability-id="${escapeHtml(
                      ability.id
                    )}"
                    ${score >= 15 ? "disabled" : ""}
                  >
                    +
                  </button>
                </div>
              </article>
            `;
          }
        ).join("")}
      </div>

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="reset-point-buy"
        >
          Reset Point Buy
        </button>
      </div>
    `;
  }

  function renderSection13RolledAbilities() {
    const pool =
      Array.isArray(
        creatorState.draft
          .abilities
          .assignmentPool
      )
        ? creatorState.draft
            .abilities
            .assignmentPool
        : [];

    return `
      <div class="hg-character-current-choice">
        <b>Rolled pool:</b>

        ${escapeHtml(
          pool.length
            ? pool.join(", ")
            : "No scores rolled yet"
        )}
      </div>

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="roll-ability-scores"
        >
          Roll 4d6, Drop Lowest
        </button>

        <button
          type="button"
          data-cc-action="apply-rolled-scores"
          ${pool.length === 6 ? "" : "disabled"}
        >
          Apply Rolls in Order
        </button>
      </div>

      <p class="small">
        Rolls are applied in this order:
        Strength, Dexterity, Constitution,
        Intelligence, Wisdom, Charisma.
        After applying them, you can still edit the
        scores manually below.
      </p>

      ${renderSection13ManualAbilities()}
    `;
  }

  function renderSection13AbilitySummary() {
    return `
      <div class="hg-character-choice-grid">
        ${ABILITY_DEFINITIONS.map(
          (ability) => {
            const score =
              getSection13AbilityScore(
                ability.id
              );

            const modifier =
              calculateAbilityModifier(
                score
              );

            const bonus =
              safeNumber(
                creatorState.draft
                  .abilities
                  .bonuses[ability.id],
                0
              );

            return `
              <article class="hg-character-choice-card">
                <h3>
                  ${escapeHtml(
                    ability.name
                  )}
                </h3>

                <p>
                  <b>${score}</b>

                  <br>

                  Modifier:
                  ${modifier >= 0 ? "+" : ""}${modifier}

                  <br>

                  Bonus:
                  ${bonus >= 0 ? "+" : ""}${bonus}
                </p>
              </article>
            `;
          }
        ).join("")}
      </div>
    `;
  }

  function renderAbilitiesStep() {
    const method =
      creatorState.draft
        .abilities
        .method ||
      "manual";

    const methodChoices =
      ABILITY_SCORE_METHODS.map(
        (item) => {
          return {
            value: item.id,
            label: item.name
          };
        }
      );

    let methodContent = "";

    if (method === "standard-array") {
      methodContent =
        renderSection13StandardArray();
    } else if (method === "point-buy") {
      methodContent =
        renderSection13PointBuy();
    } else if (method === "rolled") {
      methodContent =
        renderSection13RolledAbilities();
    } else {
      methodContent =
        renderSection13ManualAbilities();
    }

    return `
      <div class="hg-character-field-grid">
        ${wizardSelect(
          "Ability Score Method",
          "ccAbilityMethod",
          method,
          methodChoices,
          {
            changeAction:
              "change-ability-method"
          }
        )}
      </div>

      <div style="margin-top: 16px;">
        ${methodContent}
      </div>

      <hr>

      <h3>Current Ability Summary</h3>

      ${renderSection13AbilitySummary()}
    `;
  }

  function findSection13ActionElement(
    ...values
  ) {
    for (const value of values) {
      const candidates = [
        value,
        value?.target,
        value?.currentTarget,
        value?.element,
        value?.button,
        value?.control,
        value?.actionElement
      ];

      for (const candidate of candidates) {
        if (
          typeof Element !==
            "undefined" &&
          candidate instanceof Element
        ) {
          return (
            candidate.closest(
              "[data-cc-action]"
            ) ||
            candidate
          );
        }
      }
    }

    return null;
  }

  function handleSection13RefreshLevel() {
    refreshSection13LevelProgression();

    setStatus(
      "Level progression refreshed."
    );

    renderCreatorView();
  }

  function handleSection13CalculateHp() {
    const hp =
      applySection13SuggestedHp();

    setStatus(
      `Suggested hit points applied: ${hp}.`
    );

    renderCreatorView();
  }

  function handleSection13ResetStandardArray() {
    applySection13StandardArray();

    setStatus(
      "Standard array reset."
    );

    renderCreatorView();
  }

  function handleSection13PointBuy(
    direction,
    ...values
  ) {
    const button =
      findSection13ActionElement(
        ...values
      );

    const abilityId =
      button?.dataset
        ?.abilityId ||
      "";

    if (
      changeSection13PointBuyScore(
        abilityId,
        direction
      )
    ) {
      setStatus(
        `${getSection13AbilityName(
          abilityId
        )} updated.`
      );

      renderCreatorView();
    }
  }

  function handleSection13ResetPointBuy() {
    applySection13PointBuyDefaults();

    setStatus(
      "Point buy reset."
    );

    renderCreatorView();
  }

  function handleSection13RollScores() {
    const rolls =
      rollSection13ScorePool();

    setStatus(
      `Rolled scores: ${rolls.join(
        ", "
      )}.`
    );

    renderCreatorView();
  }

  function handleSection13ApplyRolls() {
    if (
      applySection13RolledScores()
    ) {
      setStatus(
        "Rolled scores applied."
      );

      renderCreatorView();
    }
  }

  function handleSection13Change({ target }) {
    if (
      target?.dataset
        ?.ccActionChange ===
      "change-ability-method"
    ) {
      setSection13AbilityMethod(
        target.value
      );

      setStatus(
        "Ability score method changed."
      );

      renderCreatorView();

      return true;
    }

    if (
      target?.dataset
        ?.standardAbilityId
    ) {
      assignSection13StandardScore(
        target.dataset
          .standardAbilityId,
        target.value
      );

      setStatus(
        "Standard array assignment updated."
      );

      renderCreatorView();

      return true;
    }

    if (
      target?.id ===
      "ccCharacterLevel"
    ) {
      setCharacterLevel(
        target.value
      );

      refreshSection13LevelProgression();

      setStatus(
        `Character level set to ${clampLevel(
          target.value
        )}.`
      );

      renderCreatorView();

      return true;
    }

    return false;
  }

  registerCharacterStepRenderer(
    "level",
    renderLevelStep
  );

  registerCharacterStepRenderer(
    "abilities",
    renderAbilitiesStep
  );

  registerCharacterCreatorAction(
    "refresh-level-progression",
    handleSection13RefreshLevel
  );

  registerCharacterCreatorAction(
    "calculate-character-hp",
    handleSection13CalculateHp
  );

  registerCharacterCreatorAction(
    "reset-standard-array",
    handleSection13ResetStandardArray
  );

  registerCharacterCreatorAction(
    "point-buy-decrease",
    (...values) => {
      handleSection13PointBuy(
        -1,
        ...values
      );
    }
  );

  registerCharacterCreatorAction(
    "point-buy-increase",
    (...values) => {
      handleSection13PointBuy(
        1,
        ...values
      );
    }
  );

  registerCharacterCreatorAction(
    "reset-point-buy",
    handleSection13ResetPointBuy
  );

  registerCharacterCreatorAction(
    "roll-ability-scores",
    handleSection13RollScores
  );

  registerCharacterCreatorAction(
    "apply-rolled-scores",
    handleSection13ApplyRolls
  );

  registerCharacterCreatorChangeHandler(
    handleSection13Change
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

  function normalizeSection14Background(
    rawBackground,
    fallbackSource = "template"
  ) {
    const raw = rawBackground || {};

    const name =
      safeDisplayString(
        raw.name,
        "Custom Background"
      );

    return {
      ...cloneData(raw),

      id: makeSafeId(
        raw.id || name,
        "custom-background"
      ),

      name,

      source:
        safeDisplayString(
          raw.source,
          fallbackSource
        ),

      summary:
        safeDisplayString(
          raw.summary ||
          raw.description,
          "No description provided."
        ),

      skillChoices: {
        choose: Math.max(
          0,
          Math.round(
            safeNumber(
              raw.skillChoices?.choose,
              0
            )
          )
        ),

        from:
          cleanArray(
            raw.skillChoices?.from
          )
      },

      toolChoices: {
        choose: Math.max(
          0,
          Math.round(
            safeNumber(
              raw.toolChoices?.choose,
              0
            )
          )
        ),

        from:
          cleanArray(
            raw.toolChoices?.from
          )
      },

      languageChoices: {
        choose: Math.max(
          0,
          Math.round(
            safeNumber(
              raw.languageChoices?.choose,
              0
            )
          )
        ),

        from:
          cleanArray(
            raw.languageChoices?.from
          )
      },

      equipmentPackageIds:
        cleanArray(
          raw.equipmentPackageIds
        ),

      features:
        Array.isArray(raw.features)
          ? cloneData(raw.features)
          : []
    };
  }

  function getAllSection14Backgrounds() {
    const backgroundMap = new Map();

    DEFAULT_BACKGROUND_TEMPLATES
      .forEach((background) => {
        const normalized =
          normalizeSection14Background(
            background,
            "template"
          );

        backgroundMap.set(
          normalized.id,
          normalized
        );
      });

    (
      creatorState.roomBackgroundCache ||
      []
    ).forEach((background) => {
      const normalized =
        normalizeSection14Background(
          background,
          "homebrew"
        );

      backgroundMap.set(
        normalized.id,
        normalized
      );
    });

    const selectedSnapshot =
      creatorState.draft
        .background
        .templateSnapshot;

    if (selectedSnapshot) {
      const normalized =
        normalizeSection14Background(
          selectedSnapshot,
          "character"
        );

      backgroundMap.set(
        normalized.id,
        normalized
      );
    }

    return Array.from(
      backgroundMap.values()
    ).sort((a, b) => {
      return a.name.localeCompare(
        b.name
      );
    });
  }

  function getSelectedSection14Background() {
    const background =
      creatorState.draft.background;

    const selectedSnapshot =
      background?.templateSnapshot;

    if (selectedSnapshot) {
      return normalizeSection14Background(
        selectedSnapshot,
        background.source ||
        "character"
      );
    }

    return (
      getAllSection14Backgrounds()
        .find((template) => {
          return (
            template.id ===
            background?.id
          );
        }) ||
      null
    );
  }

  function chooseSection14Background(
    backgroundId
  ) {
    const template =
      getAllSection14Backgrounds()
        .find((background) => {
          return (
            background.id ===
            backgroundId
          );
        });

    if (!template) {
      return false;
    }

    const current =
      creatorState.draft.background;

    creatorState.draft.background = {
      id: template.id,
      name: template.name,

      source:
        template.source ||
        "template",

      templateSnapshot:
        cloneData(template),

      featureChoices: {},

      traits:
        safeDisplayString(
          current?.traits
        ),

      ideals:
        safeDisplayString(
          current?.ideals
        ),

      bonds:
        safeDisplayString(
          current?.bonds
        ),

      flaws:
        safeDisplayString(
          current?.flaws
        ),

      backstory:
        safeDisplayString(
          current?.backstory
        )
    };

    creatorState.draft
      .features
      .backgroundFeatures =
        cloneData(
          template.features ||
          []
        );

    applyCompatibilityAliases(
      creatorState.draft
    );

    markDraftChanged();

    return true;
  }

  function applySection14CustomBackground() {
    const name =
      safeDisplayString(
        $("ccCustomBackgroundName")
          ?.value
      );

    if (!name) {
      alert(
        "Enter a custom background name."
      );

      return false;
    }

    const current =
      creatorState.draft.background;

    const customBackground =
      normalizeSection14Background(
        {
          id: makeSafeId(
            name,
            "custom-background"
          ),

          name,
          source: "custom",

          summary:
            safeDisplayString(
              $("ccCustomBackgroundSummary")
                ?.value,
              "Custom background."
            ),

          skillChoices: {
            choose: Math.max(
              0,
              Math.round(
                safeNumber(
                  $("ccCustomBackgroundSkillCount")
                    ?.value,
                  0
                )
              )
            ),

            from:
              parseSection14List(
                $("ccCustomBackgroundSkills")
                  ?.value
              )
          },

          toolChoices: {
            choose: Math.max(
              0,
              Math.round(
                safeNumber(
                  $("ccCustomBackgroundToolCount")
                    ?.value,
                  0
                )
              )
            ),

            from:
              parseSection14List(
                $("ccCustomBackgroundTools")
                  ?.value
              )
          },

          languageChoices: {
            choose: Math.max(
              0,
              Math.round(
                safeNumber(
                  $("ccCustomBackgroundLanguageCount")
                    ?.value,
                  0
                )
              )
            ),

            from:
              parseSection14List(
                $("ccCustomBackgroundLanguages")
                  ?.value
              )
          },

          equipmentPackageIds: [],

          features:
            cloneData(
              creatorState.draft
                .features
                .backgroundFeatures ||
              []
            )
        },

        "custom"
      );

    creatorState.draft.background = {
      id: customBackground.id,
      name: customBackground.name,
      source: "custom",

      templateSnapshot:
        cloneData(
          customBackground
        ),

      featureChoices:
        cloneData(
          current?.featureChoices ||
          {}
        ),

      traits:
        safeDisplayString(
          current?.traits
        ),

      ideals:
        safeDisplayString(
          current?.ideals
        ),

      bonds:
        safeDisplayString(
          current?.bonds
        ),

      flaws:
        safeDisplayString(
          current?.flaws
        ),

      backstory:
        safeDisplayString(
          current?.backstory
        )
    };

    applyCompatibilityAliases(
      creatorState.draft
    );

    markDraftChanged();

    return true;
  }

  function syncSection14BackgroundFeatures() {
    const background =
      creatorState.draft.background;

    if (
      background?.source ===
        "custom" &&
      background.templateSnapshot
    ) {
      background
        .templateSnapshot
        .features =
          cloneData(
            creatorState.draft
              .features
              .backgroundFeatures ||
            []
          );
    }
  }

  function addSection14BackgroundFeature() {
    const name =
      safeDisplayString(
        $("ccNewBackgroundFeatureName")
          ?.value
      );

    const summary =
      safeDisplayString(
        $("ccNewBackgroundFeatureSummary")
          ?.value
      );

    if (!name) {
      alert(
        "Enter a background feature name."
      );

      return false;
    }

    if (
      !Array.isArray(
        creatorState.draft
          .features
          .backgroundFeatures
      )
    ) {
      creatorState.draft
        .features
        .backgroundFeatures = [];
    }

    creatorState.draft
      .features
      .backgroundFeatures
      .push({
        id: makeSafeId(
          `${name}-${Date.now()}`,
          "background-feature"
        ),

        name,
        summary,
        source: "background"
      });

    syncSection14BackgroundFeatures();
    markDraftChanged();

    return true;
  }

  function removeSection14BackgroundFeature(
    index
  ) {
    const features =
      creatorState.draft
        .features
        .backgroundFeatures;

    if (
      !Array.isArray(features) ||
      index < 0 ||
      index >= features.length
    ) {
      return false;
    }

    features.splice(index, 1);

    syncSection14BackgroundFeatures();
    markDraftChanged();

    return true;
  }

  function renderBackgroundStep() {
    const selectedBackground =
      getSelectedSection14Background();

    const selectedId =
      creatorState.draft
        .background
        .id;

    const backgroundCards =
      getAllSection14Backgrounds()
        .map((background) => {
          const selected =
            selectedId ===
            background.id;

          return wizardChoiceCard(
            background.name ||
            "Unnamed Background",

            `
              <p>
                ${escapeHtml(
                  background.summary ||
                  "No description provided."
                )}
              </p>

              <p>
                <b>Skill Choices:</b>

                ${Math.max(
                  0,
                  safeNumber(
                    background
                      .skillChoices
                      ?.choose,
                    0
                  )
                )}

                <br>

                <b>Tool Choices:</b>

                ${Math.max(
                  0,
                  safeNumber(
                    background
                      .toolChoices
                      ?.choose,
                    0
                  )
                )}

                <br>

                <b>Language Choices:</b>

                ${Math.max(
                  0,
                  safeNumber(
                    background
                      .languageChoices
                      ?.choose,
                    0
                  )
                )}
              </p>

              <p class="small">
                Source:

                ${escapeHtml(
                  background.source ||
                  "template"
                )}
              </p>
            `,

            selected
              ? "Selected"
              : "Choose Background",

            "choose-background",

            {
              "background-id":
                background.id
            },

            selected
          );
        })
        .join("");

    const backgroundFeatures =
      Array.isArray(
        creatorState.draft
          .features
          .backgroundFeatures
      )
        ? creatorState.draft
            .features
            .backgroundFeatures
        : [];

    const featureCards =
      backgroundFeatures
        .map((feature, index) => {
          return wizardChoiceCard(
            feature.name ||
            "Unnamed Feature",

            `
              <p>
                ${escapeHtml(
                  feature.summary ||
                  feature.description ||
                  "No description provided."
                )}
              </p>
            `,

            "Remove Feature",

            "remove-background-feature",

            {
              index
            },

            false
          );
        })
        .join("");

    const customSelected =
      creatorState.draft
        .background
        .source ===
      "custom";

    return `
      <div class="hg-character-current-choice">
        <b>Current background:</b>

        ${escapeHtml(
          getSafeBackgroundName() ||
          "None selected"
        )}
      </div>

      <div class="hg-character-choice-grid">
        ${backgroundCards}
      </div>

      <hr>

      <h3>Custom Background</h3>

      <div class="hg-character-field-grid three">
        ${wizardField(
          "Background Name",
          "ccCustomBackgroundName",

          customSelected
            ? getSafeBackgroundName()
            : "",

          {
            placeholder:
              "Monster Hunter"
          }
        )}

        ${wizardField(
          "Skill Choices",
          "ccCustomBackgroundSkillCount",

          customSelected
            ? selectedBackground
                ?.skillChoices
                ?.choose || 0
            : 0,

          {
            type: "number",
            valueType: "integer",

            extra:
              'min="0" max="18" step="1"'
          }
        )}

        ${wizardField(
          "Tool Choices",
          "ccCustomBackgroundToolCount",

          customSelected
            ? selectedBackground
                ?.toolChoices
                ?.choose || 0
            : 0,

          {
            type: "number",
            valueType: "integer",

            extra:
              'min="0" max="10" step="1"'
          }
        )}

        ${wizardField(
          "Language Choices",
          "ccCustomBackgroundLanguageCount",

          customSelected
            ? selectedBackground
                ?.languageChoices
                ?.choose || 0
            : 0,

          {
            type: "number",
            valueType: "integer",

            extra:
              'min="0" max="10" step="1"'
          }
        )}

        ${wizardField(
          "Available Skills",
          "ccCustomBackgroundSkills",

          customSelected
            ? formatSection14List(
                selectedBackground
                  ?.skillChoices
                  ?.from
              )
            : "",

          {
            placeholder:
              "Survival, Nature, Perception",

            wide: true
          }
        )}

        ${wizardField(
          "Available Tools",
          "ccCustomBackgroundTools",

          customSelected
            ? formatSection14List(
                selectedBackground
                  ?.toolChoices
                  ?.from
              )
            : "",

          {
            placeholder:
              "Herbalism kit, Smith's tools",

            wide: true
          }
        )}

        ${wizardField(
          "Available Languages",
          "ccCustomBackgroundLanguages",

          customSelected
            ? formatSection14List(
                selectedBackground
                  ?.languageChoices
                  ?.from
              )
            : "",

          {
            placeholder:
              "Draconic, Elvish",

            wide: true
          }
        )}

        ${wizardField(
          "Background Summary",
          "ccCustomBackgroundSummary",

          customSelected
            ? selectedBackground
                ?.summary || ""
            : "",

          {
            type: "textarea",

            placeholder:
              "Describe this background's history and theme...",

            wide: true
          }
        )}
      </div>

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="use-custom-background"
        >
          Use Custom Background
        </button>
      </div>

      <hr>

      <h3>Personality and Story</h3>

      <div class="hg-character-field-grid">
        ${wizardField(
          "Personality Traits",
          "ccBackgroundTraits",

          safeDisplayString(
            creatorState.draft
              .background
              .traits
          ),

          {
            type: "textarea",
            path: "background.traits",

            placeholder:
              "Habits, personality, mannerisms...",

            wide: true
          }
        )}

        ${wizardField(
          "Ideals",
          "ccBackgroundIdeals",

          safeDisplayString(
            creatorState.draft
              .background
              .ideals
          ),

          {
            type: "textarea",
            path: "background.ideals",

            placeholder:
              "What principles guide this character?",

            wide: true
          }
        )}

        ${wizardField(
          "Bonds",
          "ccBackgroundBonds",

          safeDisplayString(
            creatorState.draft
              .background
              .bonds
          ),

          {
            type: "textarea",
            path: "background.bonds",

            placeholder:
              "People, places, promises, or treasures...",

            wide: true
          }
        )}

        ${wizardField(
          "Flaws",
          "ccBackgroundFlaws",

          safeDisplayString(
            creatorState.draft
              .background
              .flaws
          ),

          {
            type: "textarea",
            path: "background.flaws",

            placeholder:
              "Fears, weaknesses, or destructive habits...",

            wide: true
          }
        )}

        ${wizardField(
          "Backstory",
          "ccBackgroundBackstory",

          safeDisplayString(
            creatorState.draft
              .background
              .backstory
          ),

          {
            type: "textarea",
            path: "background.backstory",

            placeholder:
              "Write the character's history...",

            wide: true
          }
        )}
      </div>

      <hr>

      <h3>Background Features</h3>

      <div class="hg-character-choice-grid">
        ${
          featureCards ||
          `
            <div class="hg-character-placeholder">
              No background features have been added yet.
            </div>
          `
        }
      </div>

      <div
        class="hg-character-field-grid"
        style="margin-top: 12px;"
      >
        ${wizardField(
          "Feature Name",
          "ccNewBackgroundFeatureName",
          "",
          {
            placeholder:
              "Guild Membership"
          }
        )}

        ${wizardField(
          "Feature Description",
          "ccNewBackgroundFeatureSummary",
          "",
          {
            placeholder:
              "Short original description"
          }
        )}
      </div>

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="add-background-feature"
        >
          Add Background Feature
        </button>
      </div>
    `;
  }

  function getSection14SkillEntry(
    skill
  ) {
    const skills =
      creatorState.draft
        .proficiencies
        .skills || {};

    const raw =
      skills[skill.id] ||
      skills[skill.name] ||
      null;

    return {
      proficient:
        raw?.proficient === true,

      expertise:
        raw?.expertise === true,

      source:
        Array.isArray(raw?.source)
          ? [...raw.source]
          : []
    };
  }

  function setSection14SkillEntry(
    skill,
    entry
  ) {
    const skills =
      creatorState.draft
        .proficiencies
        .skills;

    delete skills[skill.name];

    if (!entry?.proficient) {
      delete skills[skill.id];
      return;
    }

    skills[skill.id] = {
      name: skill.name,
      ability: skill.ability,
      proficient: true,

      expertise:
        entry.expertise === true,

      source:
        Array.isArray(entry.source) &&
        entry.source.length
          ? [...new Set(entry.source)]
          : ["manual"]
    };
  }

  function toggleSection14Skill(
    skillId
  ) {
    const skill =
      SKILL_DEFINITIONS.find(
        (item) => {
          return item.id === skillId;
        }
      );

    if (!skill) {
      return false;
    }

    const current =
      getSection14SkillEntry(
        skill
      );

    setSection14SkillEntry(
      skill,
      {
        proficient:
          !current.proficient,

        expertise: false,
        source: ["manual"]
      }
    );

    applyCompatibilityAliases(
      creatorState.draft
    );

    markDraftChanged();

    return true;
  }

  function toggleSection14Expertise(
    skillId
  ) {
    const skill =
      SKILL_DEFINITIONS.find(
        (item) => {
          return item.id === skillId;
        }
      );

    if (!skill) {
      return false;
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
          current.proficient
            ? !current.expertise
            : true,

        source:
          current.source.length
            ? current.source
            : ["manual"]
      }
    );

    applyCompatibilityAliases(
      creatorState.draft
    );

    markDraftChanged();

    return true;
  }

  function getSection14SkillModifier(
    skill
  ) {
    const entry =
      getSection14SkillEntry(
        skill
      );

    const abilityModifier =
      calculateAbilityModifier(
        creatorState.draft
          .abilities
          .scores[skill.ability]
      );

    const proficiencyBonus =
      Math.max(
        0,
        safeNumber(
          creatorState.draft
            .combat
            .proficiencyBonus,
          2
        )
      );

    if (!entry.proficient) {
      return abilityModifier;
    }

    return (
      abilityModifier +
      proficiencyBonus *
      (entry.expertise ? 2 : 1)
    );
  }

  function applySection14ProficiencyLists() {
    creatorState.draft
      .proficiencies
      .savingThrows =
        parseSection14List(
          $("ccSavingThrowProficiencies")
            ?.value
        );

    creatorState.draft
      .proficiencies
      .armor =
        parseSection14List(
          $("ccArmorProficiencies")
            ?.value
        );

    creatorState.draft
      .proficiencies
      .weapons =
        parseSection14List(
          $("ccWeaponProficiencies")
            ?.value
        );

    creatorState.draft
      .proficiencies
      .tools =
        parseSection14List(
          $("ccToolProficiencies")
            ?.value
        );

    creatorState.draft
      .proficiencies
      .languages =
        parseSection14List(
          $("ccLanguageProficiencies")
            ?.value
        );

    applyCompatibilityAliases(
      creatorState.draft
    );

    markDraftChanged();

    return true;
  }

  function renderSkillsStep() {
    const selectedClass =
      getSelectedClassTemplate();

    const selectedBackground =
      getSelectedSection14Background();

    const classSkillChoices =
      selectedClass
        ?.skillChoices || {};

    const backgroundSkillChoices =
      selectedBackground
        ?.skillChoices || {};

    const proficientCount =
      SKILL_DEFINITIONS.filter(
        (skill) => {
          return getSection14SkillEntry(
            skill
          ).proficient;
        }
      ).length;

    const skillCards =
      SKILL_DEFINITIONS.map(
        (skill) => {
          const entry =
            getSection14SkillEntry(
              skill
            );

          const modifier =
            getSection14SkillModifier(
              skill
            );

          const classAvailable =
            !Array.isArray(
              classSkillChoices.from
            ) ||
            classSkillChoices
              .from.length === 0 ||
            classSkillChoices
              .from.some((name) => {
                return (
                  String(name)
                    .toLowerCase() ===
                  skill.name
                    .toLowerCase()
                );
              });

          const backgroundAvailable =
            !Array.isArray(
              backgroundSkillChoices.from
            ) ||
            backgroundSkillChoices
              .from.length === 0 ||
            backgroundSkillChoices
              .from.some((name) => {
                return (
                  String(name)
                    .toLowerCase() ===
                  skill.name
                    .toLowerCase()
                );
              });

          return `
            <article
              class="
                hg-character-choice-card
                ${entry.proficient ? "selected" : ""}
              "
            >
              <h3>
                ${escapeHtml(
                  skill.name
                )}
              </h3>

              <p>
                <b>Ability:</b>

                ${escapeHtml(
                  String(
                    skill.ability ||
                    ""
                  ).toUpperCase()
                )}

                <br>

                <b>Modifier:</b>

                ${modifier >= 0 ? "+" : ""}${modifier}

                <br>

                <b>Status:</b>

                ${
                  entry.expertise
                    ? "Expertise"
                    : entry.proficient
                      ? "Proficient"
                      : "Not proficient"
                }
              </p>

              <p class="small">
                ${
                  classAvailable
                    ? "Class option"
                    : ""
                }

                ${
                  classAvailable &&
                  backgroundAvailable
                    ? " · "
                    : ""
                }

                ${
                  backgroundAvailable
                    ? "Background option"
                    : ""
                }
              </p>

              <div class="hg-character-card-actions">
                <button
                  type="button"
                  data-cc-action="toggle-skill-proficiency"
                  data-skill-id="${escapeHtml(
                    skill.id
                  )}"
                >
                  ${
                    entry.proficient
                      ? "Remove Proficiency"
                      : "Add Proficiency"
                  }
                </button>

                <button
                  type="button"
                  data-cc-action="toggle-skill-expertise"
                  data-skill-id="${escapeHtml(
                    skill.id
                  )}"
                >
                  ${
                    entry.expertise
                      ? "Remove Expertise"
                      : "Add Expertise"
                  }
                </button>
              </div>
            </article>
          `;
        }
      ).join("");

    return `
      <div class="hg-character-current-choice">
        <b>Skill proficiencies selected:</b>

        ${proficientCount}

        <br>

        <b>Class skill choices:</b>

        ${Math.max(
          0,
          safeNumber(
            classSkillChoices.choose,
            0
          )
        )}

        <br>

        <b>Background skill choices:</b>

        ${Math.max(
          0,
          safeNumber(
            backgroundSkillChoices.choose,
            0
          )
        )}
      </div>

      <div class="hg-character-warning">
        The creator shows your class and background options,
        but it does not block homebrew choices. You can select
        any skills your table allows.
      </div>

      <div class="hg-character-choice-grid">
        ${skillCards}
      </div>

      <hr>

      <h3>Other Proficiencies</h3>

      <p>
        Separate multiple entries with commas or new lines.
      </p>

      <div class="hg-character-field-grid">
        ${wizardField(
          "Saving Throws",
          "ccSavingThrowProficiencies",

          formatSection14List(
            creatorState.draft
              .proficiencies
              .savingThrows
          ),

          {
            type: "textarea",

            placeholder:
              "Strength, Constitution",

            wide: true
          }
        )}

        ${wizardField(
          "Armor Training",
          "ccArmorProficiencies",

          formatSection14List(
            creatorState.draft
              .proficiencies
              .armor
          ),

          {
            type: "textarea",

            placeholder:
              "Light armor, Medium armor, Shields",

            wide: true
          }
        )}

        ${wizardField(
          "Weapon Training",
          "ccWeaponProficiencies",

          formatSection14List(
            creatorState.draft
              .proficiencies
              .weapons
          ),

          {
            type: "textarea",

            placeholder:
              "Simple weapons, Martial weapons",

            wide: true
          }
        )}

        ${wizardField(
          "Tools",
          "ccToolProficiencies",

          formatSection14List(
            creatorState.draft
              .proficiencies
              .tools
          ),

          {
            type: "textarea",

            placeholder:
              "Thieves' tools, Smith's tools",

            wide: true
          }
        )}

        ${wizardField(
          "Languages",
          "ccLanguageProficiencies",

          formatSection14List(
            creatorState.draft
              .proficiencies
              .languages
          ),

          {
            type: "textarea",

            placeholder:
              "Common, Draconic, Elvish",

            wide: true
          }
        )}
      </div>

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="apply-proficiency-lists"
        >
          Apply Proficiency Lists
        </button>
      </div>
    `;
  }

  function findSection14ActionElement(
    ...values
  ) {
    for (const value of values) {
      const candidates = [
        value,
        value?.target,
        value?.currentTarget,
        value?.element,
        value?.button,
        value?.control,
        value?.actionElement
      ];

      for (const candidate of candidates) {
        if (
          typeof Element !==
            "undefined" &&
          candidate instanceof Element
        ) {
          return (
            candidate.closest(
              "[data-cc-action]"
            ) ||
            candidate
          );
        }
      }
    }

    return null;
  }

  function handleSection14ChooseBackground(
    ...values
  ) {
    const button =
      findSection14ActionElement(
        ...values
      );

    const backgroundId =
      button?.dataset
        ?.backgroundId ||
      "";

    if (
      chooseSection14Background(
        backgroundId
      )
    ) {
      setStatus(
        "Background selected: " +
        getSafeBackgroundName() +
        "."
      );

      renderCreatorView();
    }
  }

  function handleSection14CustomBackground() {
    if (
      applySection14CustomBackground()
    ) {
      setStatus(
        "Custom background applied."
      );

      renderCreatorView();
    }
  }

  function handleSection14AddFeature() {
    if (
      addSection14BackgroundFeature()
    ) {
      setStatus(
        "Background feature added."
      );

      renderCreatorView();
    }
  }

  function handleSection14RemoveFeature(
    ...values
  ) {
    const button =
      findSection14ActionElement(
        ...values
      );

    const index =
      Math.round(
        safeNumber(
          button?.dataset?.index,
          -1
        )
      );

    if (
      removeSection14BackgroundFeature(
        index
      )
    ) {
      setStatus(
        "Background feature removed."
      );

      renderCreatorView();
    }
  }

  function handleSection14ToggleSkill(
    ...values
  ) {
    const button =
      findSection14ActionElement(
        ...values
      );

    const skillId =
      button?.dataset?.skillId ||
      "";

    if (
      toggleSection14Skill(
        skillId
      )
    ) {
      setStatus(
        "Skill proficiency updated."
      );

      renderCreatorView();
    }
  }

  function handleSection14ToggleExpertise(
    ...values
  ) {
    const button =
      findSection14ActionElement(
        ...values
      );

    const skillId =
      button?.dataset?.skillId ||
      "";

    if (
      toggleSection14Expertise(
        skillId
      )
    ) {
      setStatus(
        "Skill expertise updated."
      );

      renderCreatorView();
    }
  }

  function handleSection14ApplyLists() {
    applySection14ProficiencyLists();

    setStatus(
      "Proficiency lists applied."
    );

    renderCreatorView();
  }

  registerCharacterStepRenderer(
    "background",
    renderBackgroundStep
  );

  registerCharacterStepRenderer(
    "skills",
    renderSkillsStep
  );

  registerCharacterCreatorAction(
    "choose-background",
    handleSection14ChooseBackground
  );

  registerCharacterCreatorAction(
    "use-custom-background",
    handleSection14CustomBackground
  );

  registerCharacterCreatorAction(
    "add-background-feature",
    handleSection14AddFeature
  );

  registerCharacterCreatorAction(
    "remove-background-feature",
    handleSection14RemoveFeature
  );

  registerCharacterCreatorAction(
    "toggle-skill-proficiency",
    handleSection14ToggleSkill
  );

  registerCharacterCreatorAction(
    "toggle-skill-expertise",
    handleSection14ToggleExpertise
  );

  registerCharacterCreatorAction(
    "apply-proficiency-lists",
    handleSection14ApplyLists
  );

// =====================================================
// CHARACTER CREATOR SECTION 15 — EQUIPMENT / INVENTORY
// =====================================================

  function normalizeSection15Item(
    rawItem,
    fallbackSource = "custom"
  ) {
    const raw = rawItem || {};

    const name =
      safeDisplayString(
        raw.name,
        "Unnamed Item"
      );

    const quantity = Math.max(
      1,
      Math.round(
        safeNumber(
          raw.quantity,
          1
        )
      )
    );

    const rawWeight =
      raw.weight === null ||
      raw.weight === undefined ||
      raw.weight === ""
        ? null
        : Math.max(
            0,
            safeNumber(
              raw.weight,
              0
            )
          );

    return {
      ...cloneData(raw),

      id: makeSafeId(
        raw.id ||
        `${name}-${Date.now()}-${Math.random()}`,
        "inventory-item"
      ),

      name,

      category:
        safeDisplayString(
          raw.category,
          "miscellaneous"
        ),

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
        raw.equipped === true,

      attuned:
        raw.attuned === true
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

    const item =
      normalizeSection15Item(
        {
          id: makeSafeId(
            `${name}-${Date.now()}-${Math.random()}`,
            "custom-item"
          ),

          name,

          category:
            $("ccNewItemCategory")
              ?.value ||
            "miscellaneous",

          quantity,
          weight,

          source: "custom",

          notes:
            safeDisplayString(
              $("ccNewItemNotes")
                ?.value
            ),

          equipped:
            $("ccNewItemEquipped")
              ?.checked === true,

          attuned:
            $("ccNewItemAttuned")
              ?.checked === true
        },

        "custom"
      );

    getSection15Inventory()
      .push(item);

    markDraftChanged();

    return true;
  }

  function removeSection15Item(index) {
    const inventory =
      getSection15Inventory();

    if (
      index < 0 ||
      index >= inventory.length
    ) {
      return false;
    }

    inventory.splice(
      index,
      1
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

  function renderSection15Catalog() {
    const catalog =
      getSection15Catalog();

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

  function renderSection15Inventory() {
    const inventory =
      getSection15Inventory();

    if (!inventory.length) {
      return `
        <div class="hg-character-placeholder">
          Your inventory is empty. Add an item from the
          catalog or create custom gear below.
        </div>
      `;
    }

    return inventory
      .map((item, index) => {
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
                item.equipped
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

            <div class="hg-character-card-actions">
              <button
                type="button"
                data-cc-action="decrease-item-quantity"
                data-index="${index}"
              >
                − Quantity
              </button>

              <button
                type="button"
                data-cc-action="increase-item-quantity"
                data-index="${index}"
              >
                + Quantity
              </button>

              <button
                type="button"
                data-cc-action="toggle-item-equipped"
                data-index="${index}"
              >
                ${
                  item.equipped
                    ? "Unequip"
                    : "Equip"
                }
              </button>

              <button
                type="button"
                data-cc-action="toggle-item-attuned"
                data-index="${index}"
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

  function renderEquipmentStep() {
    const currency =
      creatorState.draft
        .equipment
        .currency;

    const inventoryCount =
      getSection15InventoryCount();

    const totalWeight =
      getSection15TotalWeight();

    const categories = [
      {
        value: "weapon",
        label: "Weapon"
      },
      {
        value: "armor",
        label: "Armor"
      },
      {
        value: "shield",
        label: "Shield"
      },
      {
        value: "adventuring-gear",
        label: "Adventuring Gear"
      },
      {
        value: "tool",
        label: "Tool"
      },
      {
        value: "consumable",
        label: "Consumable"
      },
      {
        value: "magic-item",
        label: "Magic Item"
      },
      {
        value: "treasure",
        label: "Treasure"
      },
      {
        value: "miscellaneous",
        label: "Miscellaneous"
      }
    ];

    return `
      <div class="hg-character-current-choice">
        <b>Total item count:</b>

        ${inventoryCount}

        <br>

        <b>Recorded weight:</b>

        ${Number(
          totalWeight.toFixed(2)
        )} lb.
      </div>

      <h3>Inventory</h3>

      <div class="hg-character-choice-grid">
        ${renderSection15Inventory()}
      </div>

      <hr>

      <h3>Equipment Catalog</h3>

      <p>
        Catalog entries are reusable templates. Adding one
        copies it into this character's inventory.
      </p>

      <div class="hg-character-choice-grid">
        ${renderSection15Catalog()}
      </div>

      <hr>

      <h3>Add Custom Item</h3>

      <div class="hg-character-field-grid three">
        ${wizardField(
          "Item Name",
          "ccNewItemName",
          "",
          {
            placeholder:
              "Crimson Moon Blade"
          }
        )}

        ${wizardSelect(
          "Category",
          "ccNewItemCategory",
          "miscellaneous",
          categories
        )}

        ${wizardField(
          "Quantity",
          "ccNewItemQuantity",
          1,
          {
            type: "number",
            valueType: "integer",
            extra:
              'min="1" step="1"'
          }
        )}

        ${wizardField(
          "Weight Each",
          "ccNewItemWeight",
          "",
          {
            type: "number",
            valueType: "number",
            placeholder:
              "Optional",
            extra:
              'min="0" step="0.1"'
          }
        )}

        ${wizardField(
          "Item Notes",
          "ccNewItemNotes",
          "",
          {
            type: "textarea",

            placeholder:
              "Properties, damage, armor class, effects...",

            wide: true
          }
        )}
      </div>

      <div class="hg-character-inline-actions">
        <label>
          <input
            id="ccNewItemEquipped"
            type="checkbox"
          >

          Start equipped
        </label>

        <label>
          <input
            id="ccNewItemAttuned"
            type="checkbox"
          >

          Start attuned
        </label>

        <button
          type="button"
          data-cc-action="add-custom-item"
        >
          Add Custom Item
        </button>
      </div>

      <hr>

      <h3>Currency</h3>

      <div class="hg-character-field-grid three">
        ${wizardField(
          "Copper Pieces",
          "ccCurrencyCp",
          currency.cp,
          {
            type: "number",
            path: "equipment.currency.cp",
            valueType: "integer",
            extra:
              'min="0" step="1"'
          }
        )}

        ${wizardField(
          "Silver Pieces",
          "ccCurrencySp",
          currency.sp,
          {
            type: "number",
            path: "equipment.currency.sp",
            valueType: "integer",
            extra:
              'min="0" step="1"'
          }
        )}

        ${wizardField(
          "Electrum Pieces",
          "ccCurrencyEp",
          currency.ep,
          {
            type: "number",
            path: "equipment.currency.ep",
            valueType: "integer",
            extra:
              'min="0" step="1"'
          }
        )}

        ${wizardField(
          "Gold Pieces",
          "ccCurrencyGp",
          currency.gp,
          {
            type: "number",
            path: "equipment.currency.gp",
            valueType: "integer",
            extra:
              'min="0" step="1"'
          }
        )}

        ${wizardField(
          "Platinum Pieces",
          "ccCurrencyPp",
          currency.pp,
          {
            type: "number",
            path: "equipment.currency.pp",
            valueType: "integer",
            extra:
              'min="0" step="1"'
          }
        )}
      </div>

      <hr>

      <h3>Inventory Notes</h3>

      <div class="hg-character-field-grid">
        ${wizardField(
          "Equipment Notes",
          "ccEquipmentNotes",

          safeDisplayString(
            creatorState.draft
              .equipment
              .notes
          ),

          {
            type: "textarea",
            path: "equipment.notes",

            placeholder:
              "Carrying details, containers, ammunition, treasure, debts...",

            wide: true
          }
        )}
      </div>
    `;
  }

  function findSection15ActionElement(
    ...values
  ) {
    for (const value of values) {
      const candidates = [
        value,
        value?.target,
        value?.currentTarget,
        value?.element,
        value?.button,
        value?.control,
        value?.actionElement
      ];

      for (const candidate of candidates) {
        if (
          typeof Element !==
            "undefined" &&
          candidate instanceof Element
        ) {
          return (
            candidate.closest(
              "[data-cc-action]"
            ) ||
            candidate
          );
        }
      }
    }

    return null;
  }

  function getSection15ActionIndex(
    ...values
  ) {
    const button =
      findSection15ActionElement(
        ...values
      );

    return Math.round(
      safeNumber(
        button?.dataset?.index,
        -1
      )
    );
  }

  function handleSection15AddCatalogItem(
    ...values
  ) {
    const button =
      findSection15ActionElement(
        ...values
      );

    const itemId =
      button?.dataset?.itemId ||
      "";

    if (
      addSection15CatalogItem(
        itemId
      )
    ) {
      setStatus(
        "Catalog item added to inventory."
      );

      renderCreatorView();
    }
  }

  function handleSection15AddCustomItem() {
    if (
      addSection15CustomItem()
    ) {
      setStatus(
        "Custom item added to inventory."
      );

      renderCreatorView();
    }
  }

  function handleSection15ChangeQuantity(
    amount,
    ...values
  ) {
    const index =
      getSection15ActionIndex(
        ...values
      );

    if (
      changeSection15Quantity(
        index,
        amount
      )
    ) {
      setStatus(
        "Item quantity updated."
      );

      renderCreatorView();
    }
  }

  function handleSection15RemoveItem(
    ...values
  ) {
    const index =
      getSection15ActionIndex(
        ...values
      );

    if (
      removeSection15Item(
        index
      )
    ) {
      setStatus(
        "Item removed from inventory."
      );

      renderCreatorView();
    }
  }

  function handleSection15ToggleState(
    property,
    ...values
  ) {
    const index =
      getSection15ActionIndex(
        ...values
      );

    if (
      toggleSection15ItemState(
        index,
        property
      )
    ) {
      setStatus(
        property === "equipped"
          ? "Equipped state updated."
          : "Attunement state updated."
      );

      renderCreatorView();
    }
  }

  registerCharacterStepRenderer(
    "equipment",
    renderEquipmentStep
  );

  registerCharacterCreatorAction(
    "add-catalog-item",
    handleSection15AddCatalogItem
  );

  registerCharacterCreatorAction(
    "add-custom-item",
    handleSection15AddCustomItem
  );

  registerCharacterCreatorAction(
    "decrease-item-quantity",
    (...values) => {
      handleSection15ChangeQuantity(
        -1,
        ...values
      );
    }
  );

  registerCharacterCreatorAction(
    "increase-item-quantity",
    (...values) => {
      handleSection15ChangeQuantity(
        1,
        ...values
      );
    }
  );

  registerCharacterCreatorAction(
    "toggle-item-equipped",
    (...values) => {
      handleSection15ToggleState(
        "equipped",
        ...values
      );
    }
  );

  registerCharacterCreatorAction(
    "toggle-item-attuned",
    (...values) => {
      handleSection15ToggleState(
        "attuned",
        ...values
      );
    }
  );

  registerCharacterCreatorAction(
    "remove-inventory-item",
    handleSection15RemoveItem
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

      source:
        safeDisplayString(
          raw.source,
          fallbackSource
        ),

      ritual:
        raw.ritual === true,

      concentration:
        raw.concentration === true
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

  function isSection16SpellKnown(
    spellId
  ) {
    return getSection16KnownSpellIds()
      .includes(spellId);
  }

  function isSection16SpellPrepared(
    spellId
  ) {
    return getSection16PreparedSpellIds()
      .includes(spellId);
  }

  function toggleSection16SpellKnown(
    spellId
  ) {
    const spell =
      getSection16CustomSpells()
        .find((item) => {
          return item.id === spellId;
        });

    if (!spell) {
      return false;
    }

    const knownSpellIds =
      getSection16KnownSpellIds();

    const knownIndex =
      knownSpellIds.indexOf(
        spellId
      );

    if (knownIndex >= 0) {
      knownSpellIds.splice(
        knownIndex,
        1
      );

      const preparedSpellIds =
        getSection16PreparedSpellIds();

      const preparedIndex =
        preparedSpellIds.indexOf(
          spellId
        );

      if (preparedIndex >= 0) {
        preparedSpellIds.splice(
          preparedIndex,
          1
        );
      }
    } else {
      knownSpellIds.push(
        spellId
      );
    }

    markDraftChanged();

    return true;
  }

  function toggleSection16SpellPrepared(
    spellId
  ) {
    const spell =
      getSection16CustomSpells()
        .find((item) => {
          return item.id === spellId;
        });

    if (!spell) {
      return false;
    }

    const knownSpellIds =
      getSection16KnownSpellIds();

    if (
      !knownSpellIds.includes(
        spellId
      )
    ) {
      knownSpellIds.push(
        spellId
      );
    }

    const preparedSpellIds =
      getSection16PreparedSpellIds();

    const preparedIndex =
      preparedSpellIds.indexOf(
        spellId
      );

    if (preparedIndex >= 0) {
      preparedSpellIds.splice(
        preparedIndex,
        1
      );
    } else {
      preparedSpellIds.push(
        spellId
      );
    }

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

          source: "custom",

          ritual:
            $("ccNewSpellRitual")
              ?.checked === true,

          concentration:
            $("ccNewSpellConcentration")
              ?.checked === true
        },

        "custom"
      );

    getSection16CustomSpells()
      .push(spell);

    if (
      $("ccNewSpellKnown")
        ?.checked === true
    ) {
      getSection16KnownSpellIds()
        .push(spell.id);
    }

    if (
      $("ccNewSpellPrepared")
        ?.checked === true
    ) {
      const knownSpellIds =
        getSection16KnownSpellIds();

      if (
        !knownSpellIds.includes(
          spell.id
        )
      ) {
        knownSpellIds.push(
          spell.id
        );
      }

      getSection16PreparedSpellIds()
        .push(spell.id);
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

    markDraftChanged();

    return true;
  }

  function calculateSection16SpellcastingValues() {
    const abilityId =
      creatorState.draft
        .magic
        .spellcastingAbility;

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

      markDraftChanged();

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
      Math.max(
        0,
        safeNumber(
          creatorState.draft
            .combat
            .proficiencyBonus,
          getGenericProficiencyBonus(
            creatorState.draft
              .classProgression
              .totalLevel
          )
        )
      );

    creatorState.draft
      .magic
      .spellSaveDc =
        8 +
        abilityModifier +
        proficiencyBonus;

    creatorState.draft
      .magic
      .spellAttackBonus =
        abilityModifier +
        proficiencyBonus;

    markDraftChanged();

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
        const known =
          isSection16SpellKnown(
            spell.id
          );

        const prepared =
          isSection16SpellPrepared(
            spell.id
          );

        const spellLevel =
          safeNumber(
            spell.level,
            0
          ) === 0
            ? "Cantrip"
            : `Level ${safeNumber(
                spell.level,
                1
              )}`;

        return `
          <article
            class="
              hg-character-choice-card
              ${prepared ? "selected" : ""}
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
                spell.components
                  ? `
                    <br>

                    <b>Components:</b>

                    ${escapeHtml(
                      spell.components
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
                prepared
                  ? "Prepared"
                  : known
                    ? "Known"
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
              <button
                type="button"
                data-cc-action="toggle-spell-known"
                data-spell-id="${escapeHtml(
                  spell.id
                )}"
              >
                ${
                  known
                    ? "Remove Known"
                    : "Mark Known"
                }
              </button>

              <button
                type="button"
                data-cc-action="toggle-spell-prepared"
                data-spell-id="${escapeHtml(
                  spell.id
                )}"
              >
                ${
                  prepared
                    ? "Unprepare"
                    : "Prepare"
                }
              </button>

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
                feature.source
              )}

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

  function renderSpellsStep() {
    const magic =
      creatorState.draft.magic;

    const abilityChoices = [
      {
        value: "",
        label: "No Spellcasting Ability"
      },

      ...ABILITY_DEFINITIONS.map(
        (ability) => {
          return {
            value: ability.id,
            label: ability.name
          };
        }
      )
    ];

    const levelChoices = [
      {
        value: 0,
        label: "Cantrip"
      },

      ...Array.from(
        { length: 9 },
        (_, index) => {
          return {
            value: index + 1,
            label:
              `Level ${index + 1}`
          };
        }
      )
    ];

    const schoolChoices = [
      "Abjuration",
      "Conjuration",
      "Divination",
      "Enchantment",
      "Evocation",
      "Illusion",
      "Necromancy",
      "Transmutation",
      "Other"
    ].map((school) => {
      return {
        value: school,
        label: school
      };
    });

    const knownCount =
      getSection16KnownSpellIds()
        .length;

    const preparedCount =
      getSection16PreparedSpellIds()
        .length;

    return `
      <div class="hg-character-current-choice">
        <b>Known Spells:</b>

        ${knownCount}

        <br>

        <b>Prepared Spells:</b>

        ${preparedCount}

        <br>

        <b>Spell Save DC:</b>

        ${
          magic.spellSaveDc === null ||
          magic.spellSaveDc === undefined
            ? "Not calculated"
            : safeNumber(
                magic.spellSaveDc,
                0
              )
        }

        <br>

        <b>Spell Attack Bonus:</b>

        ${
          magic.spellAttackBonus === null ||
          magic.spellAttackBonus === undefined
            ? "Not calculated"
            : `${
                safeNumber(
                  magic.spellAttackBonus,
                  0
                ) >= 0
                  ? "+"
                  : ""
              }${safeNumber(
                magic.spellAttackBonus,
                0
              )}`
        }
      </div>

      <h3>Spellcasting</h3>

      <div class="hg-character-field-grid three">
        ${wizardSelect(
          "Spellcasting Ability",
          "ccSpellcastingAbility",

          magic.spellcastingAbility ||
          "",

          abilityChoices,

          {
            path:
              "magic.spellcastingAbility"
          }
        )}

        ${wizardField(
          "Spell Save DC",
          "ccSpellSaveDc",

          magic.spellSaveDc === null ||
          magic.spellSaveDc === undefined
            ? ""
            : magic.spellSaveDc,

          {
            type: "number",
            path: "magic.spellSaveDc",
            valueType: "number",

            extra:
              'min="0" step="1"'
          }
        )}

        ${wizardField(
          "Spell Attack Bonus",
          "ccSpellAttackBonus",

          magic.spellAttackBonus === null ||
          magic.spellAttackBonus === undefined
            ? ""
            : magic.spellAttackBonus,

          {
            type: "number",
            path:
              "magic.spellAttackBonus",

            valueType: "number",

            extra:
              'step="1"'
          }
        )}
      </div>

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="calculate-spellcasting-values"
        >
          Calculate Spell Values
        </button>
      </div>

      <hr>

      <h3>Spell Slots</h3>

      <div class="hg-character-field-grid three">
        ${renderSection16SpellSlots()}
      </div>

      <hr>

      <h3>Custom Spells</h3>

      <div class="hg-character-choice-grid">
        ${renderSection16CustomSpells()}
      </div>

      <div
        class="hg-character-field-grid three"
        style="margin-top: 12px;"
      >
        ${wizardField(
          "Spell Name",
          "ccNewSpellName",
          "",
          {
            placeholder:
              "Crimson Fireball"
          }
        )}

        ${wizardSelect(
          "Spell Level",
          "ccNewSpellLevel",
          0,
          levelChoices
        )}

        ${wizardSelect(
          "School",
          "ccNewSpellSchool",
          "Evocation",
          schoolChoices
        )}

        ${wizardField(
          "Casting Time",
          "ccNewSpellCastingTime",
          "1 action",
          {
            placeholder:
              "1 action"
          }
        )}

        ${wizardField(
          "Range",
          "ccNewSpellRange",
          "Self",
          {
            placeholder:
              "60 feet"
          }
        )}

        ${wizardField(
          "Duration",
          "ccNewSpellDuration",
          "Instantaneous",
          {
            placeholder:
              "1 minute"
          }
        )}

        ${wizardField(
          "Components",
          "ccNewSpellComponents",
          "",
          {
            placeholder:
              "V, S, M"
          }
        )}

        ${wizardField(
          "Spell Description",
          "ccNewSpellDescription",
          "",
          {
            type: "textarea",

            placeholder:
              "Describe the spell's effect, damage, saves, and scaling...",

            wide: true
          }
        )}
      </div>

      <div class="hg-character-inline-actions">
        <label>
          <input
            id="ccNewSpellRitual"
            type="checkbox"
          >

          Ritual
        </label>

        <label>
          <input
            id="ccNewSpellConcentration"
            type="checkbox"
          >

          Concentration
        </label>

        <label>
          <input
            id="ccNewSpellKnown"
            type="checkbox"
            checked
          >

          Start known
        </label>

        <label>
          <input
            id="ccNewSpellPrepared"
            type="checkbox"
          >

          Start prepared
        </label>

        <button
          type="button"
          data-cc-action="add-custom-spell"
        >
          Add Custom Spell
        </button>
      </div>

      <hr>

      <h3>Class Features</h3>

      <div class="hg-character-choice-grid">
        ${renderSection16FeatureCards(
          creatorState.draft
            .features
            .classFeatures,

          "No class features are currently recorded."
        )}
      </div>

      <hr>

      <h3>Species Traits</h3>

      <div class="hg-character-choice-grid">
        ${renderSection16FeatureCards(
          creatorState.draft
            .features
            .speciesTraits,

          "No species traits are currently recorded."
        )}
      </div>

      <hr>

      <h3>Background Features</h3>

      <div class="hg-character-choice-grid">
        ${renderSection16FeatureCards(
          creatorState.draft
            .features
            .backgroundFeatures,

          "No background features are currently recorded."
        )}
      </div>

      <hr>

      <h3>Custom Features</h3>

      <div class="hg-character-choice-grid">
        ${renderSection16FeatureCards(
          getSection16CustomFeatures(),

          "No custom features have been added yet.",

          true
        )}
      </div>

      <div
        class="hg-character-field-grid three"
        style="margin-top: 12px;"
      >
        ${wizardField(
          "Feature Name",
          "ccNewFeatureName",
          "",
          {
            placeholder:
              "Blood Frenzy"
          }
        )}

        ${wizardField(
          "Feature Source",
          "ccNewFeatureSource",
          "custom",
          {
            placeholder:
              "Class, feat, item, blessing..."
          }
        )}

        ${wizardField(
          "Uses",
          "ccNewFeatureUses",
          "",
          {
            placeholder:
              "3 per long rest"
          }
        )}

        ${wizardField(
          "Recharge",
          "ccNewFeatureRecharge",
          "",
          {
            placeholder:
              "Short rest"
          }
        )}

        ${wizardField(
          "Feature Description",
          "ccNewFeatureSummary",
          "",
          {
            type: "textarea",

            placeholder:
              "Describe what the feature does...",

            wide: true
          }
        )}
      </div>

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="add-custom-feature"
        >
          Add Custom Feature
        </button>
      </div>

      <hr>

      <h3>Magic and Feature Notes</h3>

      <div class="hg-character-field-grid">
        ${wizardField(
          "Spellcasting Notes",
          "ccMagicNotes",

          safeDisplayString(
            magic.notes
          ),

          {
            type: "textarea",
            path: "magic.notes",

            placeholder:
              "Spellbook details, prepared spell rules, special casting limits...",

            wide: true
          }
        )}

        ${wizardField(
          "Feature Notes",
          "ccFeatureNotes",

          safeDisplayString(
            creatorState.draft
              .features
              .notes
          ),

          {
            type: "textarea",
            path: "features.notes",

            placeholder:
              "Extra details about features, traits, feats, or transformations...",

            wide: true
          }
        )}
      </div>
    `;
  }

  function findSection16ActionElement(
    ...values
  ) {
    for (const value of values) {
      const candidates = [
        value,
        value?.target,
        value?.currentTarget,
        value?.element,
        value?.button,
        value?.control,
        value?.actionElement
      ];

      for (const candidate of candidates) {
        if (
          typeof Element !==
            "undefined" &&
          candidate instanceof Element
        ) {
          return (
            candidate.closest(
              "[data-cc-action]"
            ) ||
            candidate
          );
        }
      }
    }

    return null;
  }

  function handleSection16CalculateSpellcasting() {
    if (
      calculateSection16SpellcastingValues()
    ) {
      setStatus(
        "Spellcasting values calculated."
      );
    } else {
      setStatus(
        "Choose a spellcasting ability first."
      );
    }

    renderCreatorView();
  }

  function handleSection16AddSpell() {
    if (
      addSection16CustomSpell()
    ) {
      setStatus(
        "Custom spell added."
      );

      renderCreatorView();
    }
  }

  function handleSection16SpellAction(
    action,
    ...values
  ) {
    const button =
      findSection16ActionElement(
        ...values
      );

    const spellId =
      button?.dataset
        ?.spellId ||
      "";

    let changed = false;

    if (
      action === "known"
    ) {
      changed =
        toggleSection16SpellKnown(
          spellId
        );
    }

    if (
      action === "prepared"
    ) {
      changed =
        toggleSection16SpellPrepared(
          spellId
        );
    }

    if (
      action === "remove"
    ) {
      changed =
        removeSection16CustomSpell(
          spellId
        );
    }

    if (changed) {
      setStatus(
        action === "remove"
          ? "Custom spell removed."
          : "Spell status updated."
      );

      renderCreatorView();
    }
  }

  function handleSection16AddFeature() {
    if (
      addSection16CustomFeature()
    ) {
      setStatus(
        "Custom feature added."
      );

      renderCreatorView();
    }
  }

  function handleSection16RemoveFeature(
    ...values
  ) {
    const button =
      findSection16ActionElement(
        ...values
      );

    const index =
      Math.round(
        safeNumber(
          button?.dataset?.index,
          -1
        )
      );

    if (
      removeSection16CustomFeature(
        index
      )
    ) {
      setStatus(
        "Custom feature removed."
      );

      renderCreatorView();
    }
  }

  registerCharacterStepRenderer(
    "spells",
    renderSpellsStep
  );

  registerCharacterCreatorAction(
    "calculate-spellcasting-values",
    handleSection16CalculateSpellcasting
  );

  registerCharacterCreatorAction(
    "add-custom-spell",
    handleSection16AddSpell
  );

  registerCharacterCreatorAction(
    "toggle-spell-known",
    (...values) => {
      handleSection16SpellAction(
        "known",
        ...values
      );
    }
  );

  registerCharacterCreatorAction(
    "toggle-spell-prepared",
    (...values) => {
      handleSection16SpellAction(
        "prepared",
        ...values
      );
    }
  );

  registerCharacterCreatorAction(
    "remove-custom-spell",
    (...values) => {
      handleSection16SpellAction(
        "remove",
        ...values
      );
    }
  );

  registerCharacterCreatorAction(
    "add-custom-feature",
    handleSection16AddFeature
  );

  registerCharacterCreatorAction(
    "remove-custom-feature",
    handleSection16RemoveFeature
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

  function getSection17AbilityName(
    abilityId
  ) {
    return (
      ABILITY_DEFINITIONS.find(
        (ability) => {
          return ability.id === abilityId;
        }
      )?.name ||
      String(
        abilityId || ""
      ).toUpperCase()
    );
  }

  function getSection17ProficiencyBonus() {
    return Math.max(
      0,
      safeNumber(
        creatorState.draft
          .combat
          .proficiencyBonus,

        getGenericProficiencyBonus(
          creatorState.draft
            .classProgression
            .totalLevel
        )
      )
    );
  }

  function getSection17SkillEntry(
    skill
  ) {
    const skills =
      creatorState.draft
        .proficiencies
        .skills || {};

    return (
      skills[skill.id] ||
      skills[skill.name] ||
      null
    );
  }

  function getSection17SkillModifier(
    skill
  ) {
    const entry =
      getSection17SkillEntry(
        skill
      );

    const abilityModifier =
      calculateAbilityModifier(
        safeNumber(
          creatorState.draft
            .abilities
            .scores[skill.ability],
          10
        )
      );

    if (
      entry?.proficient !== true
    ) {
      return abilityModifier;
    }

    const multiplier =
      entry.expertise === true
        ? 2
        : 1;

    return (
      abilityModifier +
      getSection17ProficiencyBonus() *
      multiplier
    );
  }

  function getSection17PassivePerception() {
    const perception =
      SKILL_DEFINITIONS.find(
        (skill) => {
          return (
            skill.id ===
            "perception"
          );
        }
      );

    if (!perception) {
      return 10;
    }

    return (
      10 +
      getSection17SkillModifier(
        perception
      )
    );
  }

  function getSection17Initiative() {
    const dexterityModifier =
      calculateAbilityModifier(
        safeNumber(
          creatorState.draft
            .abilities
            .scores
            .dex,
          10
        )
      );

    return (
      dexterityModifier +
      safeNumber(
        creatorState.draft
          .combat
          .initiative,
        0
      )
    );
  }

  function getSection17CarryingCapacity() {
    const strength =
      Math.max(
        1,
        safeNumber(
          creatorState.draft
            .abilities
            .scores
            .str,
          10
        )
      );

    const size =
      String(
        creatorState.draft
          .identity
          .size ||
        "medium"
      ).toLowerCase();

    const sizeMultiplier = {
      tiny: 0.5,
      small: 1,
      medium: 1,
      large: 2,
      huge: 4,
      gargantuan: 8
    }[size] || 1;

    return Math.round(
      strength *
      15 *
      sizeMultiplier
    );
  }

  function getSection17InventoryWeight() {
    const items =
      Array.isArray(
        creatorState.draft
          .equipment
          .items
      )
        ? creatorState.draft
            .equipment
            .items
        : [];

    return items.reduce(
      (total, item) => {
        const weight =
          item.weight === null ||
          item.weight === undefined ||
          item.weight === ""
            ? 0
            : Math.max(
                0,
                safeNumber(
                  item.weight,
                  0
                )
              );

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

        return (
          total +
          weight *
          quantity
        );
      },
      0
    );
  }

  function getSection17SpellCount() {
    return Array.isArray(
      creatorState.draft
        .magic
        .customSpells
    )
      ? creatorState.draft
          .magic
          .customSpells
          .length
      : 0;
  }

  function getSection17FeatureCount() {
    const features =
      creatorState.draft
        .features;

    return [
      features.classFeatures,
      features.speciesTraits,
      features.backgroundFeatures,
      features.customFeatures
    ].reduce(
      (total, list) => {
        return (
          total +
          (
            Array.isArray(list)
              ? list.length
              : 0
          )
        );
      },
      0
    );
  }

  function getSection17Warnings() {
    const warnings = [
      ...getValidationWarnings(
        creatorState.draft
      )
    ];

    const draft =
      creatorState.draft;

    const level =
      clampLevel(
        draft.classProgression
          .totalLevel
      );

    if (
      safeNumber(
        draft.combat.maxHp,
        0
      ) < 1
    ) {
      warnings.push(
        "Maximum hit points must be at least 1."
      );
    }

    if (
      safeNumber(
        draft.combat.currentHp,
        0
      ) >
      safeNumber(
        draft.combat.maxHp,
        1
      )
    ) {
      warnings.push(
        "Current hit points are greater than maximum hit points."
      );
    }

    if (
      safeNumber(
        draft.combat.currentHp,
        0
      ) < 0
    ) {
      warnings.push(
        "Current hit points cannot be negative."
      );
    }

    ABILITY_DEFINITIONS.forEach(
      (ability) => {
        const score =
          safeNumber(
            draft.abilities
              .scores[ability.id],
            0
          );

        if (
          score < 1 ||
          score > 30
        ) {
          warnings.push(
            `${ability.name} must be between 1 and 30.`
          );
        }
      }
    );

    const selectedClass =
      getSelectedClassTemplate();

    const subclassLevel =
      Math.max(
        1,
        Math.round(
          safeNumber(
            selectedClass
              ?.subclassLevel,
            3
          )
        )
      );

    if (
      level >= subclassLevel &&
      Array.isArray(
        selectedClass
          ?.subclasses
      ) &&
      selectedClass
        .subclasses
        .length > 0 &&
      !getSafeSubclassName()
    ) {
      warnings.push(
        `${getSafeClassName()} normally chooses a subclass at level ${subclassLevel}.`
      );
    }

    if (
      draft.magic
        .spellcastingAbility &&
      (
        draft.magic
          .spellSaveDc === null ||
        draft.magic
          .spellSaveDc === undefined
      )
    ) {
      warnings.push(
        "Spellcasting ability is selected, but the spell save DC has not been calculated."
      );
    }

    const knownIds =
      Array.isArray(
        draft.magic
          .knownSpellIds
      )
        ? draft.magic
            .knownSpellIds
        : [];

    const preparedIds =
      Array.isArray(
        draft.magic
          .preparedSpellIds
      )
        ? draft.magic
            .preparedSpellIds
        : [];

    preparedIds.forEach(
      (spellId) => {
        if (
          !knownIds.includes(
            spellId
          )
        ) {
          warnings.push(
            "A prepared spell is not marked as known."
          );
        }
      }
    );

    return [
      ...new Set(
        warnings.filter(Boolean)
      )
    ];
  }

  function getSection17CompletedStepIds() {
    return BUILDER_STEPS
      .filter((step) => {
        return isStepComplete(
          step.id
        );
      })
      .map((step) => {
        return step.id;
      });
  }

  function syncSection17CompletedSteps() {
    creatorState.draft
      .builder
      .completedSteps =
        getSection17CompletedStepIds();

    creatorState.draft
      .builder
      .validation = {
        warnings:
          getSection17Warnings(),

        checkedAtMillis:
          Date.now()
      };

    applyCompatibilityAliases(
      creatorState.draft
    );

    persistDraftToSession();
  }

  function renderSection17Abilities() {
    return ABILITY_DEFINITIONS
      .map((ability) => {
        const score =
          safeNumber(
            creatorState.draft
              .abilities
              .scores[ability.id],
            10
          );

        const modifier =
          calculateAbilityModifier(
            score
          );

        return `
          <article class="hg-character-choice-card">
            <h3>
              ${escapeHtml(
                ability.name
              )}
            </h3>

            <p>
              <b>${score}</b>

              <br>

              ${formatSection17Modifier(
                modifier
              )}
            </p>
          </article>
        `;
      })
      .join("");
  }

  function renderSection17Skills() {
    const proficientSkills =
      SKILL_DEFINITIONS
        .filter((skill) => {
          return (
            getSection17SkillEntry(
              skill
            )?.proficient === true
          );
        });

    if (
      !proficientSkills.length
    ) {
      return `
        <div class="hg-character-placeholder">
          No skill proficiencies selected.
        </div>
      `;
    }

    return proficientSkills
      .map((skill) => {
        const entry =
          getSection17SkillEntry(
            skill
          );

        const modifier =
          getSection17SkillModifier(
            skill
          );

        return `
          <article class="hg-character-choice-card">
            <h3>
              ${escapeHtml(
                skill.name
              )}
            </h3>

            <p>
              ${escapeHtml(
                getSection17AbilityName(
                  skill.ability
                )
              )}

              <br>

              <b>
                ${formatSection17Modifier(
                  modifier
                )}
              </b>

              <br>

              ${
                entry.expertise === true
                  ? "Expertise"
                  : "Proficient"
              }
            </p>
          </article>
        `;
      })
      .join("");
  }

  function renderSection17List(
    title,
    values,
    emptyText
  ) {
    const list =
      Array.isArray(values)
        ? values.filter(Boolean)
        : [];

    return `
      <article class="hg-character-choice-card">
        <h3>
          ${escapeHtml(title)}
        </h3>

        ${
          list.length
            ? `
              <p>
                ${list
                  .map((item) => {
                    return escapeHtml(
                      item
                    );
                  })
                  .join("<br>")}
              </p>
            `
            : `
              <p class="small">
                ${escapeHtml(
                  emptyText
                )}
              </p>
            `
        }
      </article>
    `;
  }

  function renderSection17Inventory() {
    const items =
      Array.isArray(
        creatorState.draft
          .equipment
          .items
      )
        ? creatorState.draft
            .equipment
            .items
        : [];

    if (!items.length) {
      return `
        <div class="hg-character-placeholder">
          No inventory items added.
        </div>
      `;
    }

    return items
      .map((item) => {
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

        return `
          <article class="hg-character-choice-card">
            <h3>
              ${escapeHtml(
                item.name ||
                "Unnamed Item"
              )}
            </h3>

            <p>
              Quantity:
              ${quantity}

              <br>

              ${escapeHtml(
                item.category ||
                "Miscellaneous"
              )}

              ${
                item.equipped
                  ? "<br>Equipped"
                  : ""
              }

              ${
                item.attuned
                  ? "<br>Attuned"
                  : ""
              }
            </p>
          </article>
        `;
      })
      .join("");
  }

  function renderSection17FeatureSummary() {
    const groups = [
      {
        name: "Class Features",
        values:
          creatorState.draft
            .features
            .classFeatures
      },
      {
        name: "Species Traits",
        values:
          creatorState.draft
            .features
            .speciesTraits
      },
      {
        name: "Background Features",
        values:
          creatorState.draft
            .features
            .backgroundFeatures
      },
      {
        name: "Custom Features",
        values:
          creatorState.draft
            .features
            .customFeatures
      }
    ];

    return groups
      .map((group) => {
        const values =
          Array.isArray(
            group.values
          )
            ? group.values
            : [];

        return `
          <article class="hg-character-choice-card">
            <h3>
              ${escapeHtml(
                group.name
              )}
            </h3>

            ${
              values.length
                ? `
                  <p>
                    ${values
                      .map((feature) => {
                        return escapeHtml(
                          feature.name ||
                          "Unnamed Feature"
                        );
                      })
                      .join("<br>")}
                  </p>
                `
                : `
                  <p class="small">
                    None recorded.
                  </p>
                `
            }
          </article>
        `;
      })
      .join("");
  }

  function renderSection17Warnings(
    warnings
  ) {
    if (!warnings.length) {
      return `
        <div class="hg-character-current-choice">
          <b>Ready:</b>

          No required-field warnings were found.
        </div>
      `;
    }

    return `
      <div class="hg-character-warning">
        <b>
          ${warnings.length}
          ${
            warnings.length === 1
              ? "warning"
              : "warnings"
          }
          found:
        </b>

        <ul>
          ${warnings
            .map((warning) => {
              return `
                <li>
                  ${escapeHtml(
                    warning
                  )}
                </li>
              `;
            })
            .join("")}
        </ul>
      </div>
    `;
  }

  function renderReviewStep() {
    syncSection17CompletedSteps();

    const draft =
      creatorState.draft;

    const warnings =
      getSection17Warnings();

    const level =
      clampLevel(
        draft.classProgression
          .totalLevel
      );

    const inventoryWeight =
      getSection17InventoryWeight();

    const carryingCapacity =
      getSection17CarryingCapacity();

    const initiative =
      getSection17Initiative();

    const proficiencyBonus =
      getSection17ProficiencyBonus();

    const currency =
      draft.equipment
        .currency;

    return `
      ${renderSection17Warnings(
        warnings
      )}

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="refresh-review"
        >
          Refresh Review
        </button>
      </div>

      <hr>

      <h3>Character Identity</h3>

      <div class="hg-character-choice-grid">
        <article class="hg-character-choice-card">
          <h3>
            ${escapeHtml(
              getSafeCharacterName() ||
              "Unnamed Character"
            )}
          </h3>

          <p>
            ${escapeHtml(
              getSafeSpeciesName() ||
              "No species"
            )}

            <br>

            Level ${level}

            ${escapeHtml(
              getSafeClassName() ||
              "No class"
            )}

            ${
              getSafeSubclassName()
                ? `
                  <br>

                  ${escapeHtml(
                    getSafeSubclassName()
                  )}
                `
                : ""
            }

            ${
              getSafeBackgroundName()
                ? `
                  <br>

                  Background:
                  ${escapeHtml(
                    getSafeBackgroundName()
                  )}
                `
                : ""
            }
          </p>
        </article>

        <article class="hg-character-choice-card">
          <h3>Identity Details</h3>

          <p>
            <b>Size:</b>

            ${escapeHtml(
              draft.identity
                .size ||
              "medium"
            )}

            ${
              draft.identity.age
                ? `
                  <br>

                  <b>Age:</b>

                  ${escapeHtml(
                    draft.identity.age
                  )}
                `
                : ""
            }

            ${
              draft.identity.pronouns
                ? `
                  <br>

                  <b>Pronouns:</b>

                  ${escapeHtml(
                    draft.identity
                      .pronouns
                  )}
                `
                : ""
            }

            ${
              draft.identity.alignment
                ? `
                  <br>

                  <b>Outlook:</b>

                  ${escapeHtml(
                    draft.identity
                      .alignment
                  )}
                `
                : ""
            }

            ${
              draft.identity.deity
                ? `
                  <br>

                  <b>Belief:</b>

                  ${escapeHtml(
                    draft.identity
                      .deity
                  )}
                `
                : ""
            }
          </p>
        </article>
      </div>

      <hr>

      <h3>Combat Summary</h3>

      <div class="hg-character-choice-grid">
        <article class="hg-character-choice-card">
          <h3>Armor Class</h3>

          <p>
            <b>
              ${safeNumber(
                draft.combat
                  .armorClass,
                10
              )}
            </b>
          </p>
        </article>

        <article class="hg-character-choice-card">
          <h3>Hit Points</h3>

          <p>
            <b>
              ${safeNumber(
                draft.combat
                  .currentHp,
                0
              )}
              /
              ${Math.max(
                1,
                safeNumber(
                  draft.combat
                    .maxHp,
                  1
                )
              )}
            </b>

            ${
              safeNumber(
                draft.combat
                  .temporaryHp,
                0
              ) > 0
                ? `
                  <br>

                  ${safeNumber(
                    draft.combat
                      .temporaryHp,
                    0
                  )}
                  temporary
                `
                : ""
            }
          </p>
        </article>

        <article class="hg-character-choice-card">
          <h3>Initiative</h3>

          <p>
            <b>
              ${formatSection17Modifier(
                initiative
              )}
            </b>
          </p>
        </article>

        <article class="hg-character-choice-card">
          <h3>Proficiency</h3>

          <p>
            <b>
              ${formatSection17Modifier(
                proficiencyBonus
              )}
            </b>
          </p>
        </article>

        <article class="hg-character-choice-card">
          <h3>Passive Perception</h3>

          <p>
            <b>
              ${getSection17PassivePerception()}
            </b>
          </p>
        </article>

        <article class="hg-character-choice-card">
          <h3>Walking Speed</h3>

          <p>
            <b>
              ${Math.max(
                0,
                safeNumber(
                  draft.combat
                    .speed
                    .walk,
                  30
                )
              )}
              ft.
            </b>
          </p>
        </article>
      </div>

      <hr>

      <h3>Ability Scores</h3>

      <div class="hg-character-choice-grid">
        ${renderSection17Abilities()}
      </div>

      <hr>

      <h3>Proficient Skills</h3>

      <div class="hg-character-choice-grid">
        ${renderSection17Skills()}
      </div>

      <hr>

      <h3>Training and Languages</h3>

      <div class="hg-character-choice-grid">
        ${renderSection17List(
          "Saving Throws",
          draft.proficiencies
            .savingThrows,
          "No saving throw proficiencies."
        )}

        ${renderSection17List(
          "Armor",
          draft.proficiencies
            .armor,
          "No armor training."
        )}

        ${renderSection17List(
          "Weapons",
          draft.proficiencies
            .weapons,
          "No weapon training."
        )}

        ${renderSection17List(
          "Tools",
          draft.proficiencies
            .tools,
          "No tool proficiencies."
        )}

        ${renderSection17List(
          "Languages",
          draft.proficiencies
            .languages,
          "No languages recorded."
        )}
      </div>

      <hr>

      <h3>Inventory</h3>

      <div class="hg-character-current-choice">
        <b>Recorded Weight:</b>

        ${Number(
          inventoryWeight.toFixed(2)
        )}
        lb.

        <br>

        <b>Carrying Capacity:</b>

        ${carryingCapacity}
        lb.

        <br>

        <b>Currency:</b>

        ${Math.max(
          0,
          safeNumber(
            currency.cp,
            0
          )
        )} CP ·

        ${Math.max(
          0,
          safeNumber(
            currency.sp,
            0
          )
        )} SP ·

        ${Math.max(
          0,
          safeNumber(
            currency.ep,
            0
          )
        )} EP ·

        ${Math.max(
          0,
          safeNumber(
            currency.gp,
            0
          )
        )} GP ·

        ${Math.max(
          0,
          safeNumber(
            currency.pp,
            0
          )
        )} PP
      </div>

      <div class="hg-character-choice-grid">
        ${renderSection17Inventory()}
      </div>

      <hr>

      <h3>Spells and Features</h3>

      <div class="hg-character-current-choice">
        <b>Custom Spells:</b>

        ${getSection17SpellCount()}

        <br>

        <b>Known Spells:</b>

        ${
          Array.isArray(
            draft.magic
              .knownSpellIds
          )
            ? draft.magic
                .knownSpellIds
                .length
            : 0
        }

        <br>

        <b>Prepared Spells:</b>

        ${
          Array.isArray(
            draft.magic
              .preparedSpellIds
          )
            ? draft.magic
                .preparedSpellIds
                .length
            : 0
        }

        <br>

        <b>Total Features:</b>

        ${getSection17FeatureCount()}
      </div>

      <div class="hg-character-choice-grid">
        ${renderSection17FeatureSummary()}
      </div>

      <hr>

      <h3>Character Story</h3>

      <div class="hg-character-field-grid">
        ${wizardField(
          "Appearance",
          "ccReviewAppearance",

          safeDisplayString(
            draft.identity
              .appearance
          ),

          {
            type: "textarea",
            path:
              "identity.appearance",

            placeholder:
              "No appearance details yet.",

            wide: true
          }
        )}

        ${wizardField(
          "Backstory",
          "ccReviewBackstory",

          safeDisplayString(
            draft.background
              .backstory
          ),

          {
            type: "textarea",
            path:
              "background.backstory",

            placeholder:
              "No backstory yet.",

            wide: true
          }
        )}

        ${wizardField(
          "General Notes",
          "ccReviewNotes",

          safeDisplayString(
            draft.notes
          ),

          {
            type: "textarea",
            path: "notes",

            placeholder:
              "No general notes yet.",

            wide: true
          }
        )}
      </div>

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="go-step"
          data-step-id="basics"
        >
          Edit Basics
        </button>

        <button
          type="button"
          data-cc-action="go-step"
          data-step-id="abilities"
        >
          Edit Abilities
        </button>

        <button
          type="button"
          data-cc-action="go-step"
          data-step-id="equipment"
        >
          Edit Equipment
        </button>

        <button
          type="button"
          data-cc-action="go-step"
          data-step-id="spells"
        >
          Edit Spells
        </button>

        <button
          type="button"
          data-cc-action="go-step"
          data-step-id="save"
        >
          Continue to Save
        </button>
      </div>
    `;
  }

  function isSection17BasicsComplete(
    character
  ) {
    return Boolean(
      getSafeCharacterName(
        character
      )
    );
  }

  function isSection17SpeciesComplete(
    character
  ) {
    return Boolean(
      getSafeSpeciesName(
        character
      )
    );
  }

  function isSection17ClassComplete(
    character
  ) {
    return Boolean(
      getSafeClassName(
        character
      )
    );
  }

  function isSection17SubclassComplete() {
    return true;
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
      level >= 1 &&
      level <= 20 &&
      maxHp >= 1
    );
  }

  function isSection17AbilitiesComplete(
    character
  ) {
    return ABILITY_DEFINITIONS.every(
      (ability) => {
        const score =
          safeNumber(
            character
              ?.abilities
              ?.scores
              ?.[ability.id],
            0
          );

        return (
          score >= 1 &&
          score <= 30
        );
      }
    );
  }

  function isSection17ReviewComplete() {
    return (
      getSection17Warnings()
        .length === 0
    );
  }

  function handleSection17RefreshReview() {
    syncSection17CompletedSteps();

    setStatus(
      "Character review refreshed."
    );

    renderCreatorView();
  }

  registerCharacterStepCompletion(
    "basics",
    isSection17BasicsComplete
  );

  registerCharacterStepCompletion(
    "species",
    isSection17SpeciesComplete
  );

  registerCharacterStepCompletion(
    "class",
    isSection17ClassComplete
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
    isSection17AbilitiesComplete
  );

  registerCharacterStepCompletion(
    "background",
    () => true
  );

  registerCharacterStepCompletion(
    "skills",
    () => true
  );

  registerCharacterStepCompletion(
    "equipment",
    () => true
  );

  registerCharacterStepCompletion(
    "spells",
    () => true
  );

  registerCharacterStepCompletion(
    "review",
    isSection17ReviewComplete
  );

  registerCharacterStepRenderer(
    "review",
    renderReviewStep
  );

  registerCharacterCreatorAction(
    "refresh-review",
    handleSection17RefreshReview
  );

// =====================================================
// CHARACTER CREATOR SECTION 18 — SAVE / EXPORT / IMPORT
// =====================================================

  function getSection18CharacterCollection() {
    const roomCode = getRoomCode();

    if (!roomCode) {
      throw new Error(
        "Open a room before saving a character."
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
      "characters"
    );
  }

  function getSection18CharacterDocument(
    characterId
  ) {
    const roomCode = getRoomCode();

    const cleanId = String(
      characterId || ""
    ).trim();

    if (!roomCode) {
      throw new Error(
        "Open a room before editing a saved character."
      );
    }

    if (!cleanId) {
      throw new Error(
        "A saved character ID is required."
      );
    }

    if (!hasFirestoreTools()) {
      throw new Error(
        "The character creator is missing its Firestore tools."
      );
    }

    return deps.doc(
      deps.db,
      "rooms",
      roomCode,
      "characters",
      cleanId
    );
  }

  function prepareSection18Character(
    options = {}
  ) {
    let character =
      sanitizeDraftStrings(
        creatorState.draft
      );

    const copyName =
      options.copyName === true;

    if (copyName) {
      const currentName =
        getSafeCharacterName(
          character
        ) ||
        "Character";

      character.identity.name =
        / copy$/i.test(currentName)
          ? currentName
          : `${currentName} Copy`;
    }

    character.builder = {
      ...(character.builder || {}),

      currentStep:
        creatorState.currentStepId ||
        "save",

      lastSavedAtMillis:
        Date.now()
    };

    if (
      typeof syncSection17CompletedSteps ===
      "function"
    ) {
      creatorState.draft =
        character;

      syncSection17CompletedSteps();

      character =
        sanitizeDraftStrings(
          creatorState.draft
        );

      character.builder
        .lastSavedAtMillis =
          Date.now();
    }

    applyCompatibilityAliases(
      character
    );

    return character;
  }

  async function saveSection18Character(
    options = {}
  ) {
    const saveAsNew =
      options.asNew === true;

    const copyName =
      options.copyName === true;

    const character =
      prepareSection18Character({
        copyName
      });

    const characterName =
      getSafeCharacterName(
        character
      );

    if (!characterName) {
      alert(
        "Enter a character name before saving."
      );

      navigateToStep(
        "basics"
      );

      return false;
    }

    const roomCode =
      getRoomCode();

    const characterPayload =
      createCharacterPayload(
        character
      );

    const timestamp =
      deps.serverTimestamp();

    const firestorePayload = {
      ...characterPayload,
      roomCode,
      updatedAt: timestamp
    };

    try {
      let savedId =
        saveAsNew
          ? null
          : creatorState
              .currentCharacterId;

      if (savedId) {
        await deps.updateDoc(
          getSection18CharacterDocument(
            savedId
          ),

          firestorePayload
        );
      } else {
        const createdDocument =
          await deps.addDoc(
            getSection18CharacterCollection(),

            {
              ...firestorePayload,
              createdAt: timestamp
            }
          );

        savedId =
          createdDocument.id;
      }

      replaceDraft(
        {
          ...character,
          id: savedId
        },

        {
          characterId: savedId,
          dirty: false,
          stepId: "save"
        }
      );

      creatorState.draft
        .builder
        .lastSavedAtMillis =
          character.builder
            .lastSavedAtMillis;

      creatorState.dirty = false;

      persistDraftToSession();

      setStatus(
        saveAsNew
          ? `${getSafeCharacterName()} was saved as a separate character.`
          : `${getSafeCharacterName()} was saved.`
      );

      renderCreatorView();

      return true;
    } catch (error) {
      console.error(
        "Could not save character:",
        error
      );

      setStatus(
        "The character could not be saved."
      );

      alert(
        error?.message ||
        "The character could not be saved."
      );

      return false;
    }
  }

  async function deleteSection18Character(
    characterId
  ) {
    const cleanId = String(
      characterId || ""
    ).trim();

    const character =
      findCachedCharacter(
        cleanId
      );

    if (!cleanId) {
      return false;
    }

    const name =
      character
        ? getCharacterLibraryDisplayName(
            character
          )
        : "this character";

    const confirmed =
      window.confirm(
        `Delete ${name}? This cannot be undone.`
      );

    if (!confirmed) {
      return false;
    }

    try {
      await deps.deleteDoc(
        getSection18CharacterDocument(
          cleanId
        )
      );

      creatorState.characterCache =
        creatorState.characterCache
          .filter((item) => {
            return (
              String(
                item?.id || ""
              ) !== cleanId
            );
          });

      if (
        creatorState
          .currentCharacterId ===
        cleanId
      ) {
        clearStoredDraft();

        replaceDraft(
          createEmptyCharacter(),

          {
            characterId: null,
            dirty: false,
            stepId: "basics"
          }
        );
      }

      creatorState.viewMode =
        "library";

      setStatus(
        `${name} was deleted.`
      );

      renderCreatorView();

      return true;
    } catch (error) {
      console.error(
        "Could not delete character:",
        error
      );

      setStatus(
        "The character could not be deleted."
      );

      alert(
        error?.message ||
        "The character could not be deleted."
      );

      return false;
    }
  }

  function getSection18JsonText() {
    const character =
      prepareSection18Character();

    character.id =
      creatorState
        .currentCharacterId ||
      null;

    return JSON.stringify(
      character,
      null,
      2
    );
  }

  async function copySection18Json() {
    const jsonText =
      getSection18JsonText();

    try {
      if (
        navigator.clipboard &&
        typeof navigator.clipboard
          .writeText === "function"
      ) {
        await navigator.clipboard
          .writeText(
            jsonText
          );
      } else {
        const textarea =
          document.createElement(
            "textarea"
          );

        textarea.value =
          jsonText;

        textarea.setAttribute(
          "readonly",
          ""
        );

        textarea.style.position =
          "fixed";

        textarea.style.opacity =
          "0";

        document.body.appendChild(
          textarea
        );

        textarea.select();

        document.execCommand(
          "copy"
        );

        textarea.remove();
      }

      setStatus(
        "Character JSON copied."
      );

      return true;
    } catch (error) {
      console.error(
        "Could not copy character JSON:",
        error
      );

      setStatus(
        "Character JSON could not be copied."
      );

      return false;
    }
  }

  function exportSection18Json() {
    try {
      const jsonText =
        getSection18JsonText();

      const blob = new Blob(
        [jsonText],

        {
          type:
            "application/json;charset=utf-8"
        }
      );

      const url =
        URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          "a"
        );

      link.href = url;

      link.download =
        `${makeSafeFileName(
          getSafeCharacterName() ||
          "character"
        )}.json`;

      document.body.appendChild(
        link
      );

      link.click();
      link.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(
          url
        );
      }, 0);

      setStatus(
        "Character JSON exported."
      );

      return true;
    } catch (error) {
      console.error(
        "Could not export character JSON:",
        error
      );

      setStatus(
        "Character JSON could not be exported."
      );

      return false;
    }
  }

  function parseSection18ImportedCharacter(
    jsonText
  ) {
    const parsed = JSON.parse(
      String(jsonText || "")
    );

    const rawCharacter =
      parsed?.character &&
      typeof parsed.character ===
        "object" &&
      !Array.isArray(
        parsed.character
      )
        ? parsed.character
        : parsed;

    if (
      !rawCharacter ||
      typeof rawCharacter !==
        "object" ||
      Array.isArray(rawCharacter)
    ) {
      throw new Error(
        "That JSON file does not contain a character object."
      );
    }

    const character =
      sanitizeDraftStrings(
        rawCharacter
      );

    character.id = null;

    character.builder = {
      ...(character.builder || {}),
      lastSavedAtMillis: null
    };

    return character;
  }

  function useSection18ImportedCharacter(
    character
  ) {
    const requestedStep =
      getStepById(
        character?.builder
          ?.currentStep ||
        "basics"
      ).id;

    replaceDraft(
      character,

      {
        characterId: null,
        dirty: true,
        stepId: requestedStep
      }
    );

    creatorState.viewMode =
      "builder";

    creatorState.dirty =
      true;

    persistDraftToSession();

    setStatus(
      "Character imported as a new unsaved draft."
    );

    navigateToStep(
      requestedStep
    );

    return true;
  }

  function importSection18JsonText(
    jsonText
  ) {
    try {
      const character =
        parseSection18ImportedCharacter(
          jsonText
        );

      return useSection18ImportedCharacter(
        character
      );
    } catch (error) {
      console.error(
        "Could not import character JSON:",
        error
      );

      setStatus(
        "Character JSON could not be imported."
      );

      alert(
        error?.message ||
        "Character JSON could not be imported."
      );

      return false;
    }
  }

  async function importSection18File(
    file
  ) {
    if (!file) {
      return false;
    }

    try {
      const jsonText =
        await file.text();

      return importSection18JsonText(
        jsonText
      );
    } catch (error) {
      console.error(
        "Could not read character JSON file:",
        error
      );

      setStatus(
        "The selected JSON file could not be read."
      );

      alert(
        error?.message ||
        "The selected JSON file could not be read."
      );

      return false;
    }
  }

  function formatSection18SavedTime() {
    const savedAtMillis =
      safeNumber(
        creatorState.draft
          .builder
          .lastSavedAtMillis,
        0
      );

    if (!savedAtMillis) {
      return "Not saved yet";
    }

    try {
      return new Date(
        savedAtMillis
      ).toLocaleString();
    } catch (error) {
      return "Previously saved";
    }
  }

  function renderSection18Warnings() {
    const warnings =
      typeof getSection17Warnings ===
        "function"
        ? getSection17Warnings()
        : getValidationWarnings(
            creatorState.draft
          );

    if (!warnings.length) {
      return `
        <div class="hg-character-current-choice">
          <b>Ready to save:</b>

          No required-field warnings were found.
        </div>
      `;
    }

    return `
      <div class="hg-character-warning">
        <b>
          You may still save this draft, but review these
          ${
            warnings.length === 1
              ? "detail"
              : "details"
          }:
        </b>

        <ul>
          ${warnings
            .map((warning) => {
              return `
                <li>
                  ${escapeHtml(
                    warning
                  )}
                </li>
              `;
            })
            .join("")}
        </ul>
      </div>
    `;
  }

  function renderSaveStep() {
    const isExisting = Boolean(
      creatorState
        .currentCharacterId
    );

    const characterName =
      getSafeCharacterName() ||
      "Unnamed Character";

    return `
      ${renderSection18Warnings()}

      <div class="hg-character-choice-grid">
        <article class="hg-character-choice-card selected">
          <h3>
            ${escapeHtml(
              characterName
            )}
          </h3>

          <p>
            <b>Room:</b>

            ${escapeHtml(
              getRoomCode() ||
              "No room"
            )}

            <br>

            <b>Save Mode:</b>

            ${
              isExisting
                ? "Update existing character"
                : "Create new character"
            }

            <br>

            <b>Draft State:</b>

            ${
              creatorState.dirty
                ? "Unsaved changes"
                : "Saved"
            }

            <br>

            <b>Last Saved:</b>

            ${escapeHtml(
              formatSection18SavedTime()
            )}
          </p>
        </article>

        <article class="hg-character-choice-card">
          <h3>Character Summary</h3>

          <p>
            ${escapeHtml(
              getSafeSpeciesName() ||
              "No species"
            )}

            <br>

            Level

            ${clampLevel(
              creatorState.draft
                .classProgression
                .totalLevel
            )}

            ${escapeHtml(
              getSafeClassName() ||
              "No class"
            )}

            ${
              getSafeSubclassName()
                ? `
                  <br>

                  ${escapeHtml(
                    getSafeSubclassName()
                  )}
                `
                : ""
            }

            ${
              getSafeBackgroundName()
                ? `
                  <br>

                  ${escapeHtml(
                    getSafeBackgroundName()
                  )}
                `
                : ""
            }
          </p>
        </article>
      </div>

      <hr>

      <h3>Save Character</h3>

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="save-character"
        >
          ${
            isExisting
              ? "Update Character"
              : "Save New Character"
          }
        </button>

        <button
          type="button"
          data-cc-action="save-copy"
        >
          Save as Separate Copy
        </button>

        <button
          type="button"
          data-cc-action="library"
        >
          Open Character Library
        </button>
      </div>

      <hr>

      <h3>Export Character</h3>

      <p>
        JSON keeps the complete editable character data,
        including homebrew classes, traits, inventory,
        spells, and features.
      </p>

      <div class="hg-character-inline-actions">
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
          Export JSON File
        </button>
      </div>

      <hr>

      <h3>Import Character</h3>

      <p>
        Importing creates a new unsaved draft. It does not
        overwrite the currently saved character.
      </p>

      <div class="hg-character-inline-actions">
        <label class="fileButtonLabel">
          Choose JSON File

          <input
            id="ccSaveImportInput"
            type="file"
            accept="application/json,.json"
            data-cc-import-file="true"
          >
        </label>
      </div>

      <div
        class="hg-character-field-grid"
        style="margin-top: 12px;"
      >
        ${wizardField(
          "Paste Character JSON",
          "ccImportJsonText",
          "",
          {
            type: "textarea",

            placeholder:
              "Paste a previously exported character here...",

            wide: true
          }
        )}
      </div>

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="import-json-text"
        >
          Import Pasted JSON
        </button>
      </div>
    `;
  }

  function isSection18SaveComplete(
    character
  ) {
    return Boolean(
      creatorState
        .currentCharacterId &&
      creatorState.dirty === false &&
      safeNumber(
        character
          ?.builder
          ?.lastSavedAtMillis,
        0
      ) > 0
    );
  }

  async function handleSection18Save() {
    await saveSection18Character({
      asNew: false,
      copyName: false
    });
  }

  async function handleSection18SaveCopy() {
    await saveSection18Character({
      asNew: true,

      copyName: Boolean(
        creatorState
          .currentCharacterId
      )
    });
  }

  async function handleSection18Delete({
    button
  }) {
    await deleteSection18Character(
      button?.dataset
        ?.characterId
    );
  }

  async function handleSection18CopyJson() {
    await copySection18Json();
  }

  function handleSection18ExportJson() {
    exportSection18Json();
  }

  async function handleSection18ImportFile({
    button,
    event
  }) {
    const input =
      event?.target ||
      button;

    const file =
      input?.files?.[0] ||
      null;

    await importSection18File(
      file
    );
  }

  function handleSection18ImportText() {
    const jsonText =
      $("ccImportJsonText")
        ?.value ||
      "";

    if (!jsonText.trim()) {
      alert(
        "Paste character JSON first."
      );

      return;
    }

    importSection18JsonText(
      jsonText
    );
  }

  async function handleSection18Change({
    target
  }) {
    if (
      target?.dataset
        ?.ccImportFile !==
      "true"
    ) {
      return false;
    }

    const file =
      target.files?.[0] ||
      null;

    await importSection18File(
      file
    );

    target.value = "";

    return true;
  }

  registerCharacterStepRenderer(
    "save",
    renderSaveStep
  );

  registerCharacterStepCompletion(
    "save",
    isSection18SaveComplete
  );

  registerCharacterCreatorAction(
    "save-character",
    handleSection18Save
  );

  registerCharacterCreatorAction(
    "save-copy",
    handleSection18SaveCopy
  );

  registerCharacterCreatorAction(
    "delete-character",
    handleSection18Delete
  );

  registerCharacterCreatorAction(
    "copy-json",
    handleSection18CopyJson
  );

  registerCharacterCreatorAction(
    "export-json",
    handleSection18ExportJson
  );

  registerCharacterCreatorAction(
    "import-json-file",
    handleSection18ImportFile
  );

  registerCharacterCreatorAction(
    "import-json-text",
    handleSection18ImportText
  );

  registerCharacterCreatorChangeHandler(
    handleSection18Change
  );
