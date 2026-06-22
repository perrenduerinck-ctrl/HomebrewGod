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

function wizardField(label, id, value, options = {}) {
const type = options.type || "text";
const path = options.path || "";
const valueType = options.valueType || "string";
const placeholder = options.placeholder || "";
const extra = options.extra || "";
const wide = options.wide === true ? " hg-character-wide-field" : "";

```
if (type === "textarea") {
  return `
    <div class="hg-character-field${wide}">
      <label for="${id}">${escapeHtml(label)}</label>
      <textarea id="${id}" ${path ? `data-draft-path="${path}"` : ""}
        placeholder="${escapeHtml(placeholder)}" ${extra}>${escapeHtml(value || "")}</textarea>
    </div>
  `;
}

return `
  <div class="hg-character-field${wide}">
    <label for="${id}">${escapeHtml(label)}</label>
    <input id="${id}" type="${type}" ${path ? `data-draft-path="${path}"` : ""}
      ${path ? `data-value-type="${valueType}"` : ""}
      value="${escapeHtml(value ?? "")}" placeholder="${escapeHtml(placeholder)}" ${extra}>
  </div>
`;
```

}

function wizardSelect(label, id, value, choices, options = {}) {
const path = options.path || "";
const changeAction = options.changeAction || "";
const wide = options.wide === true ? " hg-character-wide-field" : "";

```
return `
  <div class="hg-character-field${wide}">
    <label for="${id}">${escapeHtml(label)}</label>
    <select id="${id}" ${path ? `data-draft-path="${path}"` : ""}
      ${changeAction ? `data-cc-action-change="${changeAction}"` : ""}>
      ${choices.map((choice) => {
        const choiceValue = typeof choice === "string" ? choice : choice.value;
        const choiceLabel = typeof choice === "string" ? choice : choice.label;

        return `
          <option
            value="${escapeHtml(choiceValue)}"
            ${String(value) === String(choiceValue) ? "selected" : ""}
          >
            ${escapeHtml(choiceLabel)}
          </option>
        `;
      }).join("")}
    </select>
  </div>
`;
```

}

function wizardChoiceCard(
title,
body,
buttonLabel,
action,
data = {},
selected = false
) {
const dataAttributes = Object.entries(data)
.map(([key, value]) => {
return `data-${key}="${escapeHtml(value)}"`;
})
.join(" ");

```
return `
  <div class="hg-character-choice-card ${selected ? "selected" : ""}">
    <h3>${escapeHtml(title)}</h3>

    ${body}

    <button
      type="button"
      data-cc-action="${action}"
      ${dataAttributes}
    >
      ${escapeHtml(buttonLabel)}
    </button>
  </div>
`;
```

}

function ensureWizardShell() {
refreshElements();
ensureWizardStyles();

```
if (!C.actionBar || !C.grid) {
  return;
}

if (!wizardRuntime.shellBuilt) {
  wizardRuntime.shellBuilt = true;

  C.actionBar.innerHTML = `
    <button type="button" data-cc-action="library">
      Characters
    </button>

    <button type="button" data-cc-action="new-character">
      New Character
    </button>

    <button
      type="button"
      id="characterWizardSaveButton"
      data-cc-action="save-character"
    >
      Save Character
    </button>

    <button type="button" data-cc-action="save-copy">
      Save Another Copy
    </button>

    <button type="button" data-cc-action="copy-json">
      Copy JSON
    </button>

    <button type="button" data-cc-action="export-json">
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
```

}

function renderActionBar() {
const saveButton = $("characterWizardSaveButton");

```
if (saveButton) {
  saveButton.textContent = creatorState.currentCharacterId
    ? "Update Character"
    : "Save New Character";
}
```

}

function getStepCompletionState(stepId) {
if (stepId === "basics") {
return Boolean(getSafeCharacterName());
}

```
if (stepId === "species") {
  return Boolean(getSafeSpeciesName());
}

if (stepId === "class") {
  return Boolean(getSafeClassName());
}

if (stepId === "level") {
  return clampLevel(
    creatorState.draft.classProgression.totalLevel
  ) >= 1;
}

if (stepId === "abilities") {
  return ABILITY_DEFINITIONS.every((ability) => {
    const score = safeNumber(
      creatorState.draft.abilities.scores[ability.id],
      0
    );

    return score >= 1 && score <= 30;
  });
}

if (stepId === "background") {
  return Boolean(getSafeBackgroundName());
}

if (stepId === "skills") {
  const needed = Math.max(
    0,
    Math.round(
      safeNumber(
        getSelectedClassTemplate()?.skillChoices?.choose,
        0
      )
    )
  );

  return getChosenClassSkills().length >= needed;
}

if (stepId === "subclass") {
  const selectedClass = getSelectedClassTemplate();

  const subclasses = Array.isArray(
    selectedClass?.subclasses
  )
    ? selectedClass.subclasses
    : [];

  if (subclasses.length === 0) {
    return true;
  }

  const subclassLevel = Math.max(
    1,
    safeNumber(
      selectedClass?.subclassLevel,
      3
    )
  );

  if (
    clampLevel(
      creatorState.draft.classProgression.totalLevel
    ) < subclassLevel
  ) {
    return true;
  }

  return Boolean(getSafeSubclassName());
}

return false;
```

}

function renderStepRail() {
return BUILDER_STEPS.map((step, index) => {
const active =
step.id === creatorState.currentStepId;

```
  const visited =
    creatorState.draft.builder.visitedSteps.includes(
      step.id
    );

  const complete =
    getStepCompletionState(step.id);

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
}).join("");
```

}

function renderStepContent(stepId) {
const renderers = {
basics: renderBasicsStep,
species: renderSpeciesStep,
class: renderClassStep,
subclass: renderSubclassStep,
level: renderLevelStep,
abilities: renderAbilitiesStep,
background: renderBackgroundStep,
skills: renderSkillsStep
};

```
if (renderers[stepId]) {
  return renderers[stepId]();
}

const step = getStepById(stepId);

return `
  <div class="hg-character-placeholder">
    <b>${escapeHtml(step.label)}</b> is connected,
    but its full system is part of Sections 16–20.
  </div>
`;
```

}

function renderBuilderView() {
const step = getStepById(
creatorState.currentStepId
);

```
const stepIndex = getStepIndex(
  step.id
);

const progress = Math.round(
  ((stepIndex + 1) / BUILDER_STEPS.length) * 100
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
            creatorState.statusMessage || ""
          )}
        </p>

        <div class="hg-character-step-footer">
          <button
            id="characterPreviousStepButton"
            type="button"
            data-cc-action="previous-step"
            ${stepIndex === 0 ? "disabled" : ""}
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
```

}

function renderCreatorView() {
ensureWizardShell();
refreshWizardElements();
renderActionBar();

```
if (!W.root) {
  return;
}

if (creatorState.viewMode === "library") {
  renderCharacterLibraryView();
} else {
  renderBuilderView();
}

refreshWizardElements();
```

}

function connectWizardEvents() {
if (wizardRuntime.eventsConnected) {
return;
}

```
wizardRuntime.eventsConnected = true;

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

    await importCharacterJson(
      event.target.files?.[0]
    );

    event.target.value = "";
  }
);
```

}

async function handleWizardClick(event) {
const button = event.target.closest(
"[data-cc-action]"
);

```
if (!button) {
  return;
}

const action = button.dataset.ccAction;

if (action === "library") {
  navigateToLibrary();
  return;
}

if (action === "go-step") {
  navigateToStep(
    button.dataset.stepId
  );

  return;
}

if (action === "previous-step") {
  navigateByStepOffset(-1);
  return;
}

if (action === "next-step") {
  navigateByStepOffset(1);
  return;
}

if (action === "new-character") {
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

const rerenderActions = {
  "choose-species": () => {
    chooseSpeciesFromTemplate(
      button.dataset.speciesId
    );
  },

  "use-custom-species": () => {
    applyCustomSpecies();
  },

  "add-species-trait": () => {
    addSpeciesTrait();
  },

  "remove-species-trait": () => {
    removeSpeciesTrait(
      Math.round(
        safeNumber(
          button.dataset.index,
          -1
        )
      )
    );
  },

  "choose-class": () => {
    chooseClassFromTemplate(
      button.dataset.classId
    );
  },

  "use-custom-class": () => {
    applyCustomClass();
  },

  "choose-subclass": () => {
    chooseSubclass(
      button.dataset.subclassId
    );
  },

  "use-custom-subclass": () => {
    applyCustomSubclass();
  },

  "set-standard-array": () => {
    applyStandardArrayDefaults();
  },

  "reset-point-buy": () => {
    resetPointBuy();
  },

  "choose-background": () => {
    chooseBackgroundTemplate(
      button.dataset.backgroundId
    );
  },

  "use-custom-background": () => {
    applyCustomBackground();
  },

  "toggle-skill": () => {
    toggleClassSkill(
      button.dataset.skillId
    );
  },

  "toggle-expertise": () => {
    toggleSkillExpertise(
      button.dataset.skillId
    );
  }
};

if (rerenderActions[action]) {
  rerenderActions[action]();
  renderCreatorView();
  return;
}

if (action === "save-character") {
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

if (action === "edit-character") {
  editCharacterFromLibrary(
    button.dataset.characterId
  );

  return;
}

if (action === "duplicate-character") {
  duplicateCharacterFromLibrary(
    button.dataset.characterId
  );

  return;
}

if (action === "delete-character") {
  await deleteCharacter(
    button.dataset.characterId
  );
}
```

}

function handleWizardInput(event) {
const target = event.target;

```
if (target.dataset.abilityId) {
  setAbilityScoreForMethod(
    target.dataset.abilityId,
    target.value
  );

  updateAbilityMethodReadout();
  return;
}

if (target.dataset.standardArrayAbility) {
  assignStandardArrayValue(
    target.dataset.standardArrayAbility,
    target.value
  );

  renderCreatorView();
  return;
}

if (
  target.dataset.levelInput ===
  "true"
) {
  setCharacterLevel(
    target.value
  );

  calculateCharacterValues();
  return;
}

if (target.dataset.draftPath) {
  setSimpleDraftField(
    target.dataset.draftPath,
    target.value,
    target.dataset.valueType || "string"
  );

  calculateCharacterValues();
}
```

}

function handleWizardChange(event) {
const target = event.target;

```
if (target.dataset.draftPath) {
  setSimpleDraftField(
    target.dataset.draftPath,
    target.value,
    target.dataset.valueType || "string"
  );

  calculateCharacterValues();
}

const action =
  target.dataset.ccActionChange;

if (action === "ability-method") {
  changeAbilityMethod(
    target.value
  );

  renderCreatorView();
  return;
}

if (action === "species-size") {
  creatorState.draft.identity.size =
    target.value;

  markDraftChanged();
  return;
}

if (action === "skill-languages") {
  creatorState.draft
    .proficiencies
    .languages =
      String(target.value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  markDraftChanged();
  return;
}

if (action === "skill-tools") {
  creatorState.draft
    .proficiencies
    .tools =
      String(target.value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  markDraftChanged();
}
```

}

// =====================================================
// CHARACTER CREATOR SECTION 10 — LIBRARY / FIRESTORE
// =====================================================

function stopCharacterListener() {
if (
typeof creatorState
.characterUnsubscribe ===
"function"
) {
creatorState.characterUnsubscribe();
}

```
creatorState.characterUnsubscribe = null;
creatorState.characterRoomCode = null;
creatorState.characterCache = [];
```

}

function startCharacterListener() {
const roomCode = getRoomCode();

```
if (!roomCode || !hasFirestoreTools()) {
  stopCharacterListener();
  renderCreatorView();
  return;
}

if (
  creatorState.characterRoomCode === roomCode &&
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
```

}

function stopRoomClassListener() {
if (
typeof creatorState
.classUnsubscribe ===
"function"
) {
creatorState.classUnsubscribe();
}

```
creatorState.classUnsubscribe = null;
creatorState.classRoomCode = null;
creatorState.roomClassCache = [];
```

}

function startRoomClassListener() {
const roomCode = getRoomCode();

```
if (!roomCode || !hasFirestoreTools()) {
  stopRoomClassListener();
  return;
}

if (
  creatorState.classRoomCode === roomCode &&
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
```

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

```
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

      const level = clampLevel(
        character.classProgression
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
        Edit, duplicate, or start a new
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
      `
        <div class="hg-character-empty-card">
          <h3>No saved characters yet</h3>

          <p>
            Start a character and move
            through one page at a time.
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
      creatorState.statusMessage || ""
    )}
  </p>
`;
```

}

function findCachedCharacter(
characterId
) {
return creatorState.characterCache
.find((character) => {
return character.id === characterId;
}) || null;
}

function editCharacterFromLibrary(
characterId
) {
const character =
findCachedCharacter(
characterId
);

```
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
```

}

function duplicateCharacterFromLibrary(
characterId
) {
const character =
findCachedCharacter(
characterId
);

```
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
```

}

async function saveCharacter(
asNew = false
) {
try {
const roomCode = getRoomCode();

```
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

  calculateCharacterValues();

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

    creatorState.dirty = false;
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

  creatorState.dirty = false;
  persistDraftToSession();

  setStatus(
    "Character updated."
  );

  renderCreatorView();

  return creatorState.currentCharacterId;
} catch (error) {
  console.error(error);
  alert(error.message);

  return null;
}
```

}

async function deleteCharacter(
characterId
) {
try {
const roomCode = getRoomCode();

```
  if (
    !roomCode ||
    !characterId ||
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

    creatorState.dirty = true;
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
```

}

async function copyCharacterJson() {
try {
calculateCharacterValues();

```
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
```

}

function exportCharacterJson() {
try {
calculateCharacterValues();

```
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
```

}

async function importCharacterJson(
file
) {
try {
if (!file) {
return;
}

```
  const imported =
    JSON.parse(
      await file.text()
    );

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
```

}

// =====================================================
// CHARACTER CREATOR SECTION 11 — BASICS / SPECIES
// =====================================================

function renderBasicsStep() {
const identity =
creatorState.draft.identity;

```
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
        changeAction:
          "species-size"
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
```

}

function getAllSpeciesTemplates() {
const map = new Map();

```
DEFAULT_SPECIES_TEMPLATES
  .forEach((species) => {
    map.set(
      species.id,
      cloneData(species)
    );
  });

creatorState.roomSpeciesCache
  .forEach((species) => {
    const id = makeSafeId(
      species.id || species.name,
      "custom-species"
    );

    map.set(
      id,
      {
        ...cloneData(species),
        id
      }
    );
  });

return Array.from(
  map.values()
).sort((a, b) => {
  return String(a.name)
    .localeCompare(
      String(b.name)
    );
});
```

}

function chooseSpeciesFromTemplate(
speciesId
) {
const species =
getAllSpeciesTemplates()
.find((item) => {
return item.id === speciesId;
});

```
if (!species) {
  return;
}

creatorState.draft.species = {
  id: species.id,
  name: species.name,
  source:
    species.source ||
    "template",
  templateSnapshot:
    cloneData(species),
  choices: {},
  traits:
    cloneData(
      species.traits || []
    )
};

creatorState.draft.identity.size =
  species.size ||
  "medium";

creatorState.draft
  .combat
  .speed
  .walk =
    safeNumber(
      species.speed,
      30
    );

creatorState.draft
  .features
  .speciesTraits =
    cloneData(
      species.traits || []
    );

applyCompatibilityAliases(
  creatorState.draft
);

markDraftChanged();
```

}

function applyCustomSpecies() {
const name =
safeDisplayString(
$("ccCustomSpeciesName")
?.value
);

```
if (!name) {
  alert(
    "Enter a custom species name."
  );

  return;
}

creatorState.draft.species = {
  id: makeSafeId(
    name,
    "custom-species"
  ),
  name,
  source: "custom",
  templateSnapshot: null,
  choices: {},
  traits:
    cloneData(
      creatorState.draft
        .species
        .traits ||
      []
    )
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

applyCompatibilityAliases(
  creatorState.draft
);

markDraftChanged();
```

}

function addSpeciesTrait() {
const name =
safeDisplayString(
$("ccNewSpeciesTraitName")
?.value
);

```
const summary =
  safeDisplayString(
    $("ccNewSpeciesTraitSummary")
      ?.value
  );

if (!name) {
  alert("Enter a trait name.");
  return;
}

creatorState.draft
  .species
  .traits
  .push({
    id: makeSafeId(
      name + "-" + Date.now(),
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

markDraftChanged();
```

}

function removeSpeciesTrait(index) {
if (
index < 0 ||
index >=
creatorState.draft
.species
.traits
.length
) {
return;
}

```
creatorState.draft
  .species
  .traits
  .splice(index, 1);

creatorState.draft
  .features
  .speciesTraits =
    cloneData(
      creatorState.draft
        .species
        .traits
    );

markDraftChanged();
```

}

function renderSpeciesStep() {
const currentSpecies =
getSafeSpeciesName();

```
const cards =
  getAllSpeciesTemplates()
    .map((species) => {
      const selected =
        creatorState.draft
          .species
          .id === species.id ||
        currentSpecies ===
          species.name;

      const body = `
        <p>
          ${escapeHtml(
            species.summary || ""
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
          <b>Speed:</b>
          ${safeNumber(
            species.speed,
            30
          )} ft.
        </p>
      `;

      return wizardChoiceCard(
        species.name,
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
  creatorState.draft
    .species
    .traits
    .map((trait, index) => {
      return wizardChoiceCard(
        trait.name ||
        "Unnamed Trait",
        `
          <p>
            ${escapeHtml(
              trait.summary || ""
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
    ${cards}
  </div>

  <hr>

  <h3>Custom Species</h3>

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
        extra: 'min="0"'
      }
    )}
  </div>

  <button
    type="button"
    data-cc-action="use-custom-species"
  >
    Use Custom Species
  </button>

  <hr>

  <h3>Species Traits</h3>

  <div class="hg-character-choice-grid">
    ${
      traits ||
      `
        <div class="hg-character-placeholder">
          No species traits added yet.
        </div>
      `
    }
  </div>

  <div
    class="hg-character-field-grid"
    style="margin-top:12px;"
  >
    ${wizardField(
      "Trait Name",
      "ccNewSpeciesTraitName",
      "",
      {
        placeholder: "Darkvision"
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

  <button
    type="button"
    data-cc-action="add-species-trait"
  >
    Add Species Trait
  </button>
`;
```

}

// =====================================================
// CHARACTER CREATOR SECTION 12 — CLASS / SUBCLASS / LEVEL
// =====================================================

function applyClassProficiencies(
classData
) {
creatorState.draft
.proficiencies
.savingThrows =
cloneData(
classData.savingThrows ||
[]
);

```
creatorState.draft
  .proficiencies
  .armor =
    cloneData(
      classData
        .armorProficiencies ||
      []
    );

creatorState.draft
  .proficiencies
  .weapons =
    cloneData(
      classData
        .weaponProficiencies ||
      []
    );

creatorState.draft
  .proficiencies
  .tools =
    cloneData(
      classData
        .toolProficiencies ||
      []
    );

creatorState.draft
  .proficiencies
  .skills = {};
```

}

function chooseClassFromTemplate(
classId
) {
const selected =
getAllClassTemplates()
.find((classData) => {
return classData.id === classId;
});

```
if (!selected) {
  return;
}

selectClassTemplate(
  selected.id
);

applyClassProficiencies(
  selected
);

calculateCharacterValues();
markDraftChanged();
```

}

function applyCustomClass() {
const name =
safeDisplayString(
$("ccCustomClassName")
?.value
);

```
if (!name) {
  alert(
    "Enter a custom class name."
  );

  return;
}

const primaryClass =
  getPrimaryClassEntry(
    creatorState.draft
  );

if (!primaryClass) {
  return;
}

const customTemplate =
  normalizeClassTemplate(
    {
      id: makeSafeId(
        name,
        "custom-class"
      ),
      name,
      source: "custom",
      summary:
        "Custom class created for this character.",
      hitDie:
        $("ccCustomClassHitDie")
          ?.value ||
        "d8",
      primaryAbilities:
        String(
          $("ccCustomClassPrimaryAbilities")
            ?.value ||
          ""
        )
          .split(",")
          .map((item) => {
            return item.trim();
          })
          .filter(Boolean),
      savingThrows: [],
      armorProficiencies: [],
      weaponProficiencies: [],
      toolProficiencies: [],
      skillChoices: {
        choose: 2,
        from:
          SKILL_DEFINITIONS
            .map((skill) => {
              return skill.name;
            })
      },
      subclassLevel: 3,
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

Object.assign(
  primaryClass,
  {
    classId:
      customTemplate.id,
    className:
      customTemplate.name,
    source: "custom",
    templateSnapshot:
      cloneData(
        customTemplate
      ),
    subclassId: "",
    subclassName: "",
    choices: {}
  }
);

creatorState.draft
  .proficiencies
  .skills = {};

applyCompatibilityAliases(
  creatorState.draft
);

calculateCharacterValues();
markDraftChanged();
```

}

function renderClassStep() {
const currentClass =
getSafeClassName();

```
const selectedClass =
  getSelectedClassTemplate();

const cards =
  getAllClassTemplates()
    .map((classData) => {
      const selected =
        getPrimaryClassEntry(
          creatorState.draft
        )?.classId ===
          classData.id ||
        currentClass ===
          classData.name;

      const body = `
        <p>
          ${escapeHtml(
            classData.summary
          )}
        </p>

        <p>
          <b>Hit Die:</b>
          ${escapeHtml(
            classData.hitDie
          )}
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

        <p>
          <b>Skill Choices:</b>

          ${safeNumber(
            classData
              .skillChoices
              ?.choose,
            0
          )}
        </p>
      `;

      return wizardChoiceCard(
        classData.name,
        body,
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

  <hr>

  <h3>Custom Homebrew Class</h3>

  <p class="small">
    A custom name becomes its own class and
    will not fall back to Fighter.
  </p>

  <div class="hg-character-field-grid three">
    ${wizardField(
      "Class Name",
      "ccCustomClassName",
      selectedClass
        ?.source ===
        "custom"
          ? currentClass
          : "",
      {
        placeholder: "Piss Wizard"
      }
    )}

    ${wizardSelect(
      "Hit Die",
      "ccCustomClassHitDie",
      selectedClass
        ?.hitDie ||
      "d8",
      [
        "d6",
        "d8",
        "d10",
        "d12"
      ]
    )}

    ${wizardField(
      "Primary Abilities",
      "ccCustomClassPrimaryAbilities",
      selectedClass
        ?.source ===
        "custom"
          ? selectedClass
              .primaryAbilities
              .join(", ")
          : "",
      {
        placeholder:
          "Intelligence, Charisma"
      }
    )}
  </div>

  <button
    type="button"
    data-cc-action="use-custom-class"
  >
    Use Custom Class
  </button>
`;
```

}

function chooseSubclass(
subclassId
) {
const selectedClass =
getSelectedClassTemplate();

```
const subclass =
  selectedClass
    ?.subclasses
    ?.find((item) => {
      return makeSafeId(
        item.id || item.name,
        "subclass"
      ) === subclassId;
    });

const primaryClass =
  getPrimaryClassEntry(
    creatorState.draft
  );

if (
  !primaryClass ||
  !subclass
) {
  return;
}

primaryClass.subclassId =
  subclassId;

primaryClass.subclassName =
  safeDisplayString(
    subclass.name,
    "Unnamed Subclass"
  );

primaryClass.choices = {
  ...primaryClass.choices,
  subclassSnapshot:
    cloneData(subclass)
};

markDraftChanged();
```

}

function applyCustomSubclass() {
const name =
safeDisplayString(
$("ccCustomSubclassName")
?.value
);

```
const primaryClass =
  getPrimaryClassEntry(
    creatorState.draft
  );

if (!primaryClass) {
  return;
}

primaryClass.subclassId =
  name
    ? makeSafeId(
        name,
        "custom-subclass"
      )
    : "";

primaryClass.subclassName =
  name;

primaryClass.choices = {
  ...primaryClass.choices,
  subclassSnapshot:
    name
      ? {
          id:
            primaryClass
              .subclassId,
          name,
          source: "custom",
          features: []
        }
      : null
};

markDraftChanged();
```

}

function renderSubclassStep() {
const selectedClass =
getSelectedClassTemplate();

```
const primaryClass =
  getPrimaryClassEntry(
    creatorState.draft
  );

const level = clampLevel(
  creatorState.draft
    .classProgression
    .totalLevel
);

const subclassLevel = Math.max(
  1,
  safeNumber(
    selectedClass
      ?.subclassLevel,
    3
  )
);

const subclasses =
  Array.isArray(
    selectedClass
      ?.subclasses
  )
    ? selectedClass.subclasses
    : [];

const cards =
  subclasses
    .map((subclass) => {
      const id =
        makeSafeId(
          subclass.id ||
          subclass.name,
          "subclass"
        );

      const selected =
        primaryClass
          ?.subclassId ===
        id;

      return wizardChoiceCard(
        subclass.name ||
        "Unnamed Subclass",
        `
          <p>
            ${escapeHtml(
              subclass.summary ||
              ""
            )}
          </p>
        `,
        selected
          ? "Selected"
          : "Choose Subclass",
        "choose-subclass",
        {
          "subclass-id": id
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
      "No class"
    )}

    <br>

    <b>Subclass level:</b>
    ${subclassLevel}

    <br>

    <b>Current level:</b>
    ${level}
  </div>

  ${
    level < subclassLevel
      ? `
        <div class="hg-character-placeholder">
          This class normally chooses its
          subclass at level ${subclassLevel}.
          You may still enter one early for
          homebrew use.
        </div>
      `
      : ""
  }

  <div class="hg-character-choice-grid">
    ${
      cards ||
      `
        <div class="hg-character-placeholder">
          No saved subclasses exist for this
          class. Use the custom field below.
        </div>
      `
    }
  </div>

  <hr>

  ${wizardField(
    "Custom Subclass Name",
    "ccCustomSubclassName",
    getSafeSubclassName(),
    {
      placeholder:
        "Custom subclass"
    }
  )}

  <button
    type="button"
    data-cc-action="use-custom-subclass"
  >
    Use Custom Subclass
  </button>
`;
```

}

function calculateCharacterValues() {
const character =
creatorState.draft;

```
ABILITY_DEFINITIONS
  .forEach((ability) => {
    const base =
      safeNumber(
        character.abilities
          .base[ability.id],
        10
      );

    const bonus =
      safeNumber(
        character.abilities
          .bonuses[ability.id],
        0
      );

    character.abilities
      .scores[ability.id] =
        Math.max(
          1,
          Math.min(
            30,
            base + bonus
          )
        );
  });

character.abilities.modifiers =
  calculateAbilityModifiers(
    character.abilities.scores
  );

const level = clampLevel(
  character.classProgression
    .totalLevel
);

const primaryClass =
  getPrimaryClassEntry(
    character
  );

if (primaryClass) {
  primaryClass.level =
    level;
}

character.combat
  .proficiencyBonus =
    getGenericProficiencyBonus(
      level
    );

character.combat.initiative =
  safeNumber(
    character.abilities
      .modifiers.dex,
    0
  );

const selectedClass =
  getSelectedClassTemplate();

character.combat.hitDice = [
  {
    classId:
      primaryClass
        ?.classId ||
      "",
    className:
      primaryClass
        ?.className ||
      "",
    die:
      selectedClass
        ?.hitDie ||
      "d8",
    count: level
  }
];

applyCompatibilityAliases(
  character
);

return character;
```

}

function renderLevelStep() {
calculateCharacterValues();

```
const combat =
  creatorState.draft.combat;

const level = clampLevel(
  creatorState.draft
    .classProgression
    .totalLevel
);

const selectedClass =
  getSelectedClassTemplate();

return `
  <div class="hg-character-current-choice">
    <b>
      ${escapeHtml(
        getSafeClassName() ||
        "No class"
      )}
    </b>

    · Hit Die

    ${escapeHtml(
      selectedClass
        ?.hitDie ||
      "d8"
    )}
  </div>

  <div class="hg-character-field-grid three">
    ${wizardField(
      "Character Level",
      "ccLevel",
      level,
      {
        type: "number",
        extra:
          'min="1" max="20" data-level-input="true"'
      }
    )}

    ${wizardField(
      "Proficiency Bonus",
      "ccProficiencyBonus",
      "+" +
      combat.proficiencyBonus,
      {
        extra: "readonly"
      }
    )}

    ${wizardField(
      "Hit Dice",
      "ccHitDice",
      combat.hitDice
        .map((entry) => {
          return (
            entry.count +
            entry.die
          );
        })
        .join(", ") ||
      level +
      (
        selectedClass
          ?.hitDie ||
        "d8"
      ),
      {
        extra: "readonly"
      }
    )}

    ${wizardField(
      "Armor Class",
      "ccArmorClass",
      combat.armorClass,
      {
        type: "number",
        path:
          "combat.armorClass",
        valueType: "number"
      }
    )}

    ${wizardField(
      "Maximum HP",
      "ccMaxHp",
      combat.maxHp,
      {
        type: "number",
        path:
          "combat.maxHp",
        valueType: "number",
        extra: 'min="1"'
      }
    )}

    ${wizardField(
      "Current HP",
      "ccCurrentHp",
      combat.currentHp,
      {
        type: "number",
        path:
          "combat.currentHp",
        valueType: "number"
      }
    )}

    ${wizardField(
      "Temporary HP",
      "ccTemporaryHp",
      combat.temporaryHp,
      {
        type: "number",
        path:
          "combat.temporaryHp",
        valueType: "number",
        extra: 'min="0"'
      }
    )}

    ${wizardField(
      "Walking Speed",
      "ccWalkSpeed",
      combat.speed.walk,
      {
        type: "number",
        path:
          "combat.speed.walk",
        valueType: "number",
        extra: 'min="0"'
      }
    )}

    ${wizardField(
      "Initiative",
      "ccInitiative",
      (
        combat.initiative >= 0
          ? "+"
          : ""
      ) +
      combat.initiative,
      {
        extra: "readonly"
      }
    )}
  </div>
`;
```

}

// =====================================================
// CHARACTER CREATOR SECTION 13 — ABILITY SCORES
// =====================================================

const POINT_BUY_COSTS =
Object.freeze({
8: 0,
9: 1,
10: 2,
11: 3,
12: 4,
13: 5,
14: 7,
15: 9
});

function getPointBuyCost(
scores
) {
return ABILITY_DEFINITIONS
.reduce(
(total, ability) => {
const score = Math.max(
8,
Math.min(
15,
safeNumber(
scores[ability.id],
8
)
)
);

```
      return (
        total +
        POINT_BUY_COSTS[score]
      );
    },
    0
  );
```

}

function changeAbilityMethod(
methodId
) {
if (
!ABILITY_SCORE_METHODS
.some((method) => {
return method.id ===
methodId;
})
) {
return;
}

```
creatorState.draft
  .abilities
  .method = methodId;

if (
  methodId ===
  "standard-array"
) {
  applyStandardArrayDefaults();
  return;
}

if (
  methodId ===
  "point-buy"
) {
  resetPointBuy();
  return;
}

markDraftChanged();
```

}

function applyStandardArrayDefaults() {
[
15,
14,
13,
12,
10,
8
].forEach((value, index) => {
creatorState.draft
.abilities
.base[
ABILITY_DEFINITIONS[
index
].id
] = value;
});

```
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

calculateCharacterValues();
markDraftChanged();
```

}

function assignStandardArrayValue(
abilityId,
rawValue
) {
const value =
safeNumber(
rawValue,
10
);

```
const oldValue =
  safeNumber(
    creatorState.draft
      .abilities
      .base[abilityId],
    10
  );

const usedAbility =
  ABILITY_DEFINITIONS
    .find((ability) => {
      return (
        ability.id !== abilityId &&
        safeNumber(
          creatorState.draft
            .abilities
            .base[
              ability.id
            ],
          0
        ) === value
      );
    });

if (usedAbility) {
  creatorState.draft
    .abilities
    .base[
      usedAbility.id
    ] = oldValue;
}

creatorState.draft
  .abilities
  .base[abilityId] =
    value;

calculateCharacterValues();
markDraftChanged();
```

}

function resetPointBuy() {
ABILITY_DEFINITIONS
.forEach((ability) => {
creatorState.draft
.abilities
.base[
ability.id
] = 8;
});

```
calculateCharacterValues();
markDraftChanged();
```

}

function setAbilityScoreForMethod(
abilityId,
rawValue
) {
const method =
creatorState.draft
.abilities
.method;

```
let score =
  Math.round(
    safeNumber(
      rawValue,
      10
    )
  );

if (
  method ===
  "point-buy"
) {
  score = Math.max(
    8,
    Math.min(15, score)
  );

  const testScores = {
    ...creatorState.draft
      .abilities
      .base,
    [abilityId]: score
  };

  if (
    getPointBuyCost(
      testScores
    ) > 27
  ) {
    setStatus(
      "Point buy cannot exceed 27 points."
    );

    return;
  }
} else {
  score = Math.max(
    1,
    Math.min(30, score)
  );
}

creatorState.draft
  .abilities
  .base[abilityId] =
    score;

calculateCharacterValues();
markDraftChanged();
```

}

function updateAbilityMethodReadout() {
const output =
$("ccAbilityMethodReadout");

```
if (
  output &&
  creatorState.draft
    .abilities
    .method ===
    "point-buy"
) {
  output.textContent =
    `${
      getPointBuyCost(
        creatorState.draft
          .abilities
          .base
      )
    } / 27 points spent`;
}
```

}

function renderAbilitiesStep() {
calculateCharacterValues();

```
const abilities =
  creatorState.draft
    .abilities;

const method =
  abilities.method;

const scoreInputs =
  ABILITY_DEFINITIONS
    .map((ability) => {
      const score =
        safeNumber(
          abilities.scores[
            ability.id
          ],
          10
        );

      const modifier =
        calculateAbilityModifier(
          score
        );

      if (
        method ===
        "standard-array"
      ) {
        return `
          <div class="hg-character-ability-box">
            <b>
              ${escapeHtml(
                ability.name
              )}
            </b>

            <select
              data-standard-array-ability="${ability.id}"
            >
              ${
                [
                  15,
                  14,
                  13,
                  12,
                  10,
                  8
                ]
                  .map((value) => {
                    return `
                      <option
                        value="${value}"
                        ${
                          safeNumber(
                            abilities
                              .base[
                                ability.id
                              ],
                            10
                          ) === value
                            ? "selected"
                            : ""
                        }
                      >
                        ${value}
                      </option>
                    `;
                  })
                  .join("")
              }
            </select>

            <div class="small">
              Modifier
              ${
                modifier >= 0
                  ? "+"
                  : ""
              }${modifier}
            </div>
          </div>
        `;
      }

      return `
        <div class="hg-character-ability-box">
          <b>
            ${escapeHtml(
              ability.name
            )}
          </b>

          <input
            type="number"
            min="${
              method ===
              "point-buy"
                ? 8
                : 1
            }"
            max="${
              method ===
              "point-buy"
                ? 15
                : 30
            }"
            value="${score}"
            data-ability-id="${ability.id}"
          >

          <div class="small">
            Modifier
            ${
              modifier >= 0
                ? "+"
                : ""
            }${modifier}
          </div>
        </div>
      `;
    })
    .join("");

const methodOptions =
  ABILITY_SCORE_METHODS
    .map((scoreMethod) => {
      return {
        value: scoreMethod.id,
        label: scoreMethod.name
      };
    });

const description =
  method === "point-buy"
    ? `${
        getPointBuyCost(
          abilities.base
        )
      } / 27 points spent`
    : ABILITY_SCORE_METHODS
        .find((item) => {
          return (
            item.id === method
          );
        })
        ?.description ||
      "";

return `
  <div class="hg-character-field-grid">
    ${wizardSelect(
      "Score Method",
      "ccAbilityMethod",
      method,
      methodOptions,
      {
        changeAction:
          "ability-method"
      }
    )}

    <div
      id="ccAbilityMethodReadout"
      class="hg-character-current-choice"
    >
      ${escapeHtml(description)}
    </div>
  </div>

  <div class="hg-character-ability-grid">
    ${scoreInputs}
  </div>

  <div class="hg-character-inline-actions">
    ${
      method ===
      "standard-array"
        ? `
          <button
            type="button"
            data-cc-action="set-standard-array"
          >
            Reset Standard Array
          </button>
        `
        : ""
    }

    ${
      method ===
      "point-buy"
        ? `
          <button
            type="button"
            data-cc-action="reset-point-buy"
          >
            Reset All To 8
          </button>
        `
        : ""
    }
  </div>
`;
```

}

// =====================================================
// CHARACTER CREATOR SECTION 14 — BACKGROUND
// =====================================================

function chooseBackgroundTemplate(
backgroundId
) {
const background =
DEFAULT_BACKGROUND_TEMPLATES
.find((item) => {
return (
item.id ===
backgroundId
);
});

```
if (!background) {
  return;
}

creatorState.draft.background = {
  ...creatorState.draft
    .background,
  id: background.id,
  name: background.name,
  source:
    background.source ||
    "template",
  templateSnapshot:
    cloneData(background),
  featureChoices: {}
};

applyCompatibilityAliases(
  creatorState.draft
);

markDraftChanged();
```

}

function applyCustomBackground() {
const name =
safeDisplayString(
$("ccCustomBackgroundName")
?.value
);

```
if (!name) {
  alert(
    "Enter a custom background name."
  );

  return;
}

creatorState.draft
  .background
  .id =
    makeSafeId(
      name,
      "custom-background"
    );

creatorState.draft
  .background
  .name =
    name;

creatorState.draft
  .background
  .source =
    "custom";

creatorState.draft
  .background
  .templateSnapshot =
    null;

applyCompatibilityAliases(
  creatorState.draft
);

markDraftChanged();
```

}

function renderBackgroundStep() {
const currentName =
getSafeBackgroundName();

```
const cards =
  DEFAULT_BACKGROUND_TEMPLATES
    .map((background) => {
      const selected =
        creatorState.draft
          .background
          .id ===
          background.id ||
        currentName ===
          background.name;

      const body = `
        <p>
          ${escapeHtml(
            background.summary
          )}
        </p>

        <p>
          <b>Skill choices:</b>

          ${safeNumber(
            background
              .skillChoices
              ?.choose,
            0
          )}
        </p>

        <p>
          <b>Languages:</b>

          ${safeNumber(
            background
              .languageChoices
              ?.choose,
            0
          )}
        </p>
      `;

      return wizardChoiceCard(
        background.name,
        body,
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

  <hr>

  ${wizardField(
    "Custom Background Name",
    "ccCustomBackgroundName",
    creatorState.draft
      .background
      .source ===
      "custom"
        ? currentName
        : "",
    {
      placeholder:
        "Custom background"
    }
  )}

  <button
    type="button"
    data-cc-action="use-custom-background"
  >
    Use Custom Background
  </button>

  <hr>

  <div class="hg-character-field-grid">
    ${wizardField(
      "Personality Traits",
      "ccPersonalityTraits",
      creatorState.draft
        .background
        .traits,
      {
        type: "textarea",
        path:
          "background.traits"
      }
    )}

    ${wizardField(
      "Ideals",
      "ccIdeals",
      creatorState.draft
        .background
        .ideals,
      {
        type: "textarea",
        path:
          "background.ideals"
      }
    )}

    ${wizardField(
      "Bonds",
      "ccBonds",
      creatorState.draft
        .background
        .bonds,
      {
        type: "textarea",
        path:
          "background.bonds"
      }
    )}

    ${wizardField(
      "Flaws",
      "ccFlaws",
      creatorState.draft
        .background
        .flaws,
      {
        type: "textarea",
        path:
          "background.flaws"
      }
    )}

    ${wizardField(
      "Backstory",
      "ccBackstory",
      creatorState.draft
        .background
        .backstory,
      {
        type: "textarea",
        path:
          "background.backstory",
        wide: true
      }
    )}
  </div>
`;
```

}

// =====================================================
// CHARACTER CREATOR SECTION 15 — SKILLS / PROFICIENCIES
// =====================================================

function getChosenClassSkills() {
return Object.values(
creatorState.draft
.proficiencies
.skills ||
{}
).filter((skill) => {
return (
skill.proficient === true &&
Array.isArray(
skill.source
) &&
skill.source.includes(
"class"
)
);
});
}

function toggleClassSkill(
skillId
) {
const definition =
SKILL_DEFINITIONS
.find((skill) => {
return skill.id === skillId;
});

```
if (!definition) {
  return;
}

const selectedClass =
  getSelectedClassTemplate();

const allowedNames =
  selectedClass
    ?.skillChoices
    ?.from ||
  [];

if (
  allowedNames.length > 0 &&
  !allowedNames.includes(
    definition.name
  )
) {
  return;
}

const current =
  creatorState.draft
    .proficiencies
    .skills[skillId];

if (current?.proficient) {
  delete creatorState.draft
    .proficiencies
    .skills[skillId];

  markDraftChanged();
  return;
}

const required = Math.max(
  0,
  Math.round(
    safeNumber(
      selectedClass
        ?.skillChoices
        ?.choose,
      0
    )
  )
);

if (
  required > 0 &&
  getChosenClassSkills()
    .length >= required
) {
  setStatus(
    `Choose only ${required} class skills.`
  );

  return;
}

creatorState.draft
  .proficiencies
  .skills[skillId] = {
    id: skillId,
    name: definition.name,
    ability:
      definition.ability,
    proficient: true,
    expertise: false,
    source: ["class"]
  };

markDraftChanged();
```

}

function toggleSkillExpertise(
skillId
) {
const skill =
creatorState.draft
.proficiencies
.skills[skillId];

```
if (!skill?.proficient) {
  return;
}

skill.expertise =
  skill.expertise !== true;

markDraftChanged();
```

}

function calculateSkillModifier(
skillId
) {
const definition =
SKILL_DEFINITIONS
.find((skill) => {
return skill.id === skillId;
});

```
if (!definition) {
  return 0;
}

const abilityModifier =
  safeNumber(
    creatorState.draft
      .abilities
      .modifiers[
        definition.ability
      ],
    0
  );

const saved =
  creatorState.draft
    .proficiencies
    .skills[skillId];

if (!saved?.proficient) {
  return abilityModifier;
}

return (
  abilityModifier +
  creatorState.draft
    .combat
    .proficiencyBonus *
  (
    saved.expertise
      ? 2
      : 1
  )
);
```

}

function renderSkillsStep() {
calculateCharacterValues();

```
const selectedClass =
  getSelectedClassTemplate();

const required = Math.max(
  0,
  Math.round(
    safeNumber(
      selectedClass
        ?.skillChoices
        ?.choose,
      0
    )
  )
);

const chosenCount =
  getChosenClassSkills()
    .length;

const allowedNames =
  selectedClass
    ?.skillChoices
    ?.from ||
  [];

const skillCards =
  SKILL_DEFINITIONS
    .filter((skill) => {
      return (
        allowedNames.length === 0 ||
        allowedNames.includes(
          skill.name
        )
      );
    })
    .map((skill) => {
      const saved =
        creatorState.draft
          .proficiencies
          .skills[
            skill.id
          ];

      const selected =
        saved?.proficient ===
        true;

      const modifier =
        calculateSkillModifier(
          skill.id
        );

      const body = `
        <p>
          <b>Ability:</b>
          ${escapeHtml(
            skill.ability
              .toUpperCase()
          )}
        </p>

        <p>
          <b>Total:</b>

          ${
            modifier >= 0
              ? "+"
              : ""
          }${modifier}
        </p>

        ${
          selected
            ? `
              <button
                type="button"
                data-cc-action="toggle-expertise"
                data-skill-id="${skill.id}"
              >
                ${
                  saved.expertise
                    ? "Remove Expertise"
                    : "Add Expertise"
                }
              </button>
            `
            : ""
        }
      `;

      return wizardChoiceCard(
        skill.name,
        body,
        selected
          ? "Remove Proficiency"
          : "Choose Proficiency",
        "toggle-skill",
        {
          "skill-id":
            skill.id
        },
        selected
      );
    })
    .join("");

return `
  <div class="hg-character-current-choice">
    <b>Class skill choices:</b>

    ${chosenCount} / ${required}
  </div>

  <div class="hg-character-choice-grid">
    ${
      skillCards ||
      `
        <div class="hg-character-placeholder">
          This class currently allows
          any skills.
        </div>
      `
    }
  </div>

  <hr>

  <div class="hg-character-summary-grid">
    <div class="hg-character-summary-card">
      <h3>Saving Throws</h3>

      <p>
        ${escapeHtml(
          creatorState.draft
            .proficiencies
            .savingThrows
            .join(", ") ||
          "None"
        )}
      </p>
    </div>

    <div class="hg-character-summary-card">
      <h3>Armor</h3>

      <p>
        ${escapeHtml(
          creatorState.draft
            .proficiencies
            .armor
            .join(", ") ||
          "None"
        )}
      </p>
    </div>

    <div class="hg-character-summary-card">
      <h3>Weapons</h3>

      <p>
        ${escapeHtml(
          creatorState.draft
            .proficiencies
            .weapons
            .join(", ") ||
          "None"
        )}
      </p>
    </div>
  </div>

  <div
    class="hg-character-field-grid"
    style="margin-top:12px;"
  >
    ${wizardField(
      "Languages",
      "ccLanguages",
      creatorState.draft
        .proficiencies
        .languages
        .join(", "),
      {
        placeholder:
          "Common, Draconic",
        extra:
          'data-cc-action-change="skill-languages"'
      }
    )}

    ${wizardField(
      "Tool Proficiencies",
      "ccTools",
      creatorState.draft
        .proficiencies
        .tools
        .join(", "),
      {
        placeholder:
          "Thieves tools, Smith tools",
        extra:
          'data-cc-action-change="skill-tools"'
      }
    )}
  </div>
`;
```

}

// =====================================================
// CHARACTER CREATOR SECTION 16 — EQUIPMENT / CURRENCY
// =====================================================

const STARTING_EQUIPMENT_PACKAGES = Object.freeze([
{
id: "adventurer-pack",
name: "Adventurer Pack",
summary: "Generic weapon, armor, and travel gear.",
items: [
{ name: "Chosen Weapon", category: "weapon", quantity: 1, equipped: true },
{ name: "Chosen Armor", category: "armor", quantity: 1, equipped: true },
{ name: "Backpack", category: "gear", quantity: 1, equipped: false }
]
},
{
id: "caster-pack",
name: "Caster Pack",
summary: "Casting focus, spell notes, and travel gear.",
items: [
{ name: "Casting Focus", category: "focus", quantity: 1, equipped: true },
{ name: "Spell Notes", category: "book", quantity: 1, equipped: false },
{ name: "Backpack", category: "gear", quantity: 1, equipped: false }
]
},
{
id: "empty-pack",
name: "Start Empty",
summary: "Clear the inventory and build it manually.",
items: []
}
]);

function normalizeEquipmentItem(rawItem, index = 0) {
const raw = rawItem || {};
const name = safeDisplayString(raw.name, "Unnamed Item");

```
return {
  id: safeDisplayString(
    raw.id,
    makeSafeId(name + "-" + index + "-" + Date.now(), "item")
  ),
  name,
  category: safeDisplayString(raw.category, "gear"),
  quantity: Math.max(
    1,
    Math.round(safeNumber(raw.quantity, 1))
  ),
  weight:
    raw.weight === null ||
    raw.weight === undefined ||
    raw.weight === ""
      ? null
      : Math.max(0, safeNumber(raw.weight, 0)),
  equipped: raw.equipped === true,
  notes: safeDisplayString(raw.notes, ""),
  source: safeDisplayString(raw.source, "character")
};
```

}

function normalizeEquipmentList() {
creatorState.draft.equipment.items =
(creatorState.draft.equipment.items || []).map(
normalizeEquipmentItem
);

```
return creatorState.draft.equipment.items;
```

}

function applyStartingEquipmentPackage(packageId) {
const pack = STARTING_EQUIPMENT_PACKAGES.find(
(item) => item.id === packageId
);

```
if (!pack) {
  return;
}

creatorState.draft.equipment.startingPackageId =
  pack.id;

creatorState.draft.equipment.items =
  pack.items.map((item, index) => {
    return normalizeEquipmentItem(
      {
        ...item,

        id: makeSafeId(
          pack.id +
          "-" +
          item.name +
          "-" +
          Date.now() +
          "-" +
          index
        ),

        source: "starting-package"
      },

      index
    );
  });

markDraftChanged();
```

}

function addCustomEquipmentItem() {
const name = safeDisplayString(
$("ccEquipmentItemName")?.value
);

```
if (!name) {
  alert("Enter an item name.");
  return;
}

normalizeEquipmentList().push(
  normalizeEquipmentItem({
    id: makeSafeId(
      name + "-" + Date.now(),
      "item"
    ),

    name,

    category:
      $("ccEquipmentItemCategory")?.value ||
      "gear",

    quantity:
      $("ccEquipmentItemQuantity")?.value,

    weight:
      $("ccEquipmentItemWeight")?.value,

    equipped:
      $("ccEquipmentItemEquipped")?.checked === true,

    notes:
      $("ccEquipmentItemNotes")?.value,

    source: "custom"
  })
);

markDraftChanged();
```

}

function removeEquipmentItem(itemId) {
creatorState.draft.equipment.items =
normalizeEquipmentList().filter(
(item) => item.id !== itemId
);

```
markDraftChanged();
```

}

function toggleEquipmentItem(itemId) {
const item = normalizeEquipmentList().find(
(entry) => entry.id === itemId
);

```
if (!item) {
  return;
}

item.equipped = !item.equipped;

markDraftChanged();
```

}

function updateEquipmentItemField(
itemId,
fieldName,
rawValue
) {
const item = normalizeEquipmentList().find(
(entry) => entry.id === itemId
);

```
if (!item) {
  return;
}

if (fieldName === "quantity") {
  item.quantity = Math.max(
    1,
    Math.round(
      safeNumber(rawValue, 1)
    )
  );
}

if (fieldName === "weight") {
  item.weight =
    rawValue === ""
      ? null
      : Math.max(
          0,
          safeNumber(rawValue, 0)
        );
}

markDraftChanged();
```

}

function getInventoryWeight() {
return normalizeEquipmentList().reduce(
(total, item) => {
return (
total +
(
item.weight === null
? 0
: item.weight * item.quantity
)
);
},

```
  0
);
```

}

function renderEquipmentStepFinal() {
const items =
normalizeEquipmentList();

```
const currency =
  creatorState.draft.equipment.currency;

const packages =
  STARTING_EQUIPMENT_PACKAGES
    .map((pack) => {
      const selected =
        creatorState.draft
          .equipment
          .startingPackageId ===
        pack.id;

      return wizardChoiceCard(
        pack.name,

        `
          <p>
            ${escapeHtml(pack.summary)}
          </p>
        `,

        selected
          ? "Applied"
          : "Apply Package",

        "apply-equipment-package",

        {
          "package-id": pack.id
        },

        selected
      );
    })
    .join("");

const inventory =
  items
    .map((item) => {
      return `
        <div
          class="
            hg-character-choice-card
            ${item.equipped ? "selected" : ""}
          "
        >
          <h3>
            ${escapeHtml(item.name)}
          </h3>

          <p>
            <b>Category:</b>
            ${escapeHtml(item.category)}
          </p>

          <p>
            ${escapeHtml(item.notes || "")}
          </p>

          <div class="hg-character-field-grid">
            ${wizardField(
              "Quantity",
              "ccQty-" + item.id,
              item.quantity,
              {
                type: "number",

                extra:
                  `min="1" ` +
                  `data-equipment-id="${escapeHtml(item.id)}" ` +
                  `data-equipment-field="quantity"`
              }
            )}

            ${wizardField(
              "Each Weight",
              "ccWeight-" + item.id,
              item.weight ?? "",
              {
                type: "number",

                extra:
                  `min="0" step="0.1" ` +
                  `data-equipment-id="${escapeHtml(item.id)}" ` +
                  `data-equipment-field="weight"`
              }
            )}
          </div>

          <button
            type="button"
            data-cc-action="toggle-equipment-item"
            data-item-id="${escapeHtml(item.id)}"
          >
            ${
              item.equipped
                ? "Unequip"
                : "Equip"
            }
          </button>

          <button
            type="button"
            data-cc-action="remove-equipment-item"
            data-item-id="${escapeHtml(item.id)}"
          >
            Remove Item
          </button>
        </div>
      `;
    })
    .join("");

const money =
  [
    "cp",
    "sp",
    "ep",
    "gp",
    "pp"
  ]
    .map((id) => {
      return wizardField(
        id.toUpperCase(),
        "ccMoney-" + id,
        currency[id] || 0,
        {
          type: "number",

          path:
            "equipment.currency." +
            id,

          valueType: "number",

          extra: 'min="0"'
        }
      );
    })
    .join("");

return `
  <h3>Starting Packages</h3>

  <div class="hg-character-choice-grid">
    ${packages}
  </div>

  <hr>

  <div class="hg-character-current-choice">
    <b>Inventory:</b>
    ${items.length} item types

    <br>

    <b>Known Weight:</b>
    ${getInventoryWeight()}
  </div>

  <div class="hg-character-choice-grid">
    ${
      inventory ||
      `
        <div class="hg-character-placeholder">
          No equipment added yet.
        </div>
      `
    }
  </div>

  <hr>

  <h3>Add Custom Item</h3>

  <div class="hg-character-field-grid three">
    ${wizardField(
      "Item Name",
      "ccEquipmentItemName",
      "",
      {
        placeholder:
          "Weapon, armor, tool..."
      }
    )}

    ${wizardSelect(
      "Category",
      "ccEquipmentItemCategory",
      "gear",
      [
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
          value: "focus",
          label: "Casting Focus"
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
          value: "gear",
          label: "General Gear"
        },
        {
          value: "treasure",
          label: "Treasure"
        }
      ]
    )}

    ${wizardField(
      "Quantity",
      "ccEquipmentItemQuantity",
      1,
      {
        type: "number",
        extra: 'min="1"'
      }
    )}

    ${wizardField(
      "Each Weight",
      "ccEquipmentItemWeight",
      "",
      {
        type: "number",
        extra:
          'min="0" step="0.1"'
      }
    )}

    ${wizardField(
      "Notes",
      "ccEquipmentItemNotes",
      "",
      {
        placeholder:
          "Damage, armor, charges, description...",

        wide: true
      }
    )}

    <div class="hg-character-field">
      <label for="ccEquipmentItemEquipped">
        Equipped Immediately
      </label>

      <input
        id="ccEquipmentItemEquipped"
        type="checkbox"
      >
    </div>
  </div>

  <button
    type="button"
    data-cc-action="add-equipment-item"
  >
    Add Item
  </button>

  <hr>

  <h3>Currency</h3>

  <div class="hg-character-field-grid three">
    ${money}
  </div>

  ${wizardField(
    "Inventory Notes",
    "ccEquipmentNotes",
    creatorState.draft
      .equipment
      .notes,
    {
      type: "textarea",
      path: "equipment.notes",
      wide: true
    }
  )}
`;
```

}

// =====================================================
// CHARACTER CREATOR SECTION 17 — SPELLS / FEATURES
// =====================================================

function normalizeCustomSpell(
rawSpell,
index = 0
) {
const raw =
rawSpell || {};

```
const name =
  safeDisplayString(
    raw.name,
    "Unnamed Spell"
  );

return {
  id: safeDisplayString(
    raw.id,

    makeSafeId(
      name +
      "-" +
      index +
      "-" +
      Date.now(),

      "spell"
    )
  ),

  name,

  level: Math.max(
    0,

    Math.min(
      9,
      Math.round(
        safeNumber(raw.level, 0)
      )
    )
  ),

  school:
    safeDisplayString(
      raw.school,
      "Custom"
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

  prepared:
    raw.prepared === true,

  notes:
    safeDisplayString(
      raw.notes,
      ""
    ),

  source:
    safeDisplayString(
      raw.source,
      "custom"
    )
};
```

}

function normalizeCustomFeature(
rawFeature,
index = 0
) {
const raw =
rawFeature || {};

```
const name =
  safeDisplayString(
    raw.name,
    "Unnamed Feature"
  );

return {
  id: safeDisplayString(
    raw.id,

    makeSafeId(
      name +
      "-" +
      index +
      "-" +
      Date.now(),

      "feature"
    )
  ),

  name,

  source:
    safeDisplayString(
      raw.source,
      "Custom"
    ),

  level: Math.max(
    0,
    Math.round(
      safeNumber(raw.level, 0)
    )
  ),

  uses:
    safeDisplayString(
      raw.uses,
      ""
    ),

  notes:
    safeDisplayString(
      raw.notes,
      ""
    )
};
```

}

function normalizeMagicAndFeatures() {
creatorState.draft
.magic
.customSpells =
(
creatorState.draft
.magic
.customSpells ||
[]
).map(
normalizeCustomSpell
);

```
creatorState.draft
  .features
  .customFeatures =
    (
      creatorState.draft
        .features
        .customFeatures ||
      []
    ).map(
      normalizeCustomFeature
    );
```

}

function syncSpellIdLists() {
normalizeMagicAndFeatures();

```
creatorState.draft
  .magic
  .knownSpellIds =
    creatorState.draft
      .magic
      .customSpells
      .map((spell) => {
        return spell.id;
      });

creatorState.draft
  .magic
  .preparedSpellIds =
    creatorState.draft
      .magic
      .customSpells
      .filter((spell) => {
        return spell.prepared;
      })
      .map((spell) => {
        return spell.id;
      });
```

}

function addCustomSpell() {
const name =
safeDisplayString(
$("ccSpellName")?.value
);

```
if (!name) {
  alert("Enter a spell name.");
  return;
}

creatorState.draft
  .magic
  .customSpells
  .push(
    normalizeCustomSpell({
      id: makeSafeId(
        name +
        "-" +
        Date.now(),

        "spell"
      ),

      name,

      level:
        $("ccSpellLevel")?.value,

      school:
        $("ccSpellSchool")?.value,

      castingTime:
        $("ccSpellCastingTime")?.value,

      range:
        $("ccSpellRange")?.value,

      prepared:
        $("ccSpellPrepared")?.checked === true,

      notes:
        $("ccSpellDescription")?.value
    })
  );

syncSpellIdLists();
markDraftChanged();
```

}

function removeCustomSpell(spellId) {
creatorState.draft
.magic
.customSpells =
creatorState.draft
.magic
.customSpells
.filter((spell) => {
return spell.id !== spellId;
});

```
syncSpellIdLists();
markDraftChanged();
```

}

function togglePreparedSpell(spellId) {
const spell =
creatorState.draft
.magic
.customSpells
.find((item) => {
return item.id === spellId;
});

```
if (!spell) {
  return;
}

spell.prepared =
  !spell.prepared;

syncSpellIdLists();
markDraftChanged();
```

}

function addCustomFeature() {
const name =
safeDisplayString(
$("ccFeatureName")?.value
);

```
if (!name) {
  alert("Enter a feature name.");
  return;
}

creatorState.draft
  .features
  .customFeatures
  .push(
    normalizeCustomFeature({
      id: makeSafeId(
        name +
        "-" +
        Date.now(),

        "feature"
      ),

      name,

      source:
        $("ccFeatureSource")?.value,

      level:
        $("ccFeatureLevel")?.value,

      uses:
        $("ccFeatureUses")?.value,

      notes:
        $("ccFeatureDescription")?.value
    })
  );

markDraftChanged();
```

}

function removeCustomFeature(featureId) {
creatorState.draft
.features
.customFeatures =
creatorState.draft
.features
.customFeatures
.filter((feature) => {
return feature.id !== featureId;
});

```
markDraftChanged();
```

}

function setSpellcastingAbility(abilityId) {
const valid = [
"",
...ABILITY_DEFINITIONS.map(
(ability) => ability.id
)
];

```
creatorState.draft
  .magic
  .spellcastingAbility =
    valid.includes(abilityId)
      ? abilityId
      : "";

calculateFinalCharacterValues();
markDraftChanged();
```

}

function renderSpellsFeaturesStepFinal() {
calculateFinalCharacterValues();

```
const magic =
  creatorState.draft.magic;

const features =
  creatorState.draft.features;

const spellCards =
  magic.customSpells
    .map((spell) => {
      return `
        <div
          class="
            hg-character-choice-card
            ${spell.prepared ? "selected" : ""}
          "
        >
          <h3>
            ${escapeHtml(spell.name)}
          </h3>

          <p>
            <b>Level:</b>

            ${
              spell.level === 0
                ? "Cantrip"
                : spell.level
            }
          </p>

          <p>
            <b>Type:</b>
            ${escapeHtml(spell.school)}
          </p>

          <p>
            <b>Casting:</b>
            ${escapeHtml(spell.castingTime)}
          </p>

          <p>
            <b>Range:</b>
            ${escapeHtml(spell.range)}
          </p>

          <p>
            ${escapeHtml(spell.notes)}
          </p>

          <button
            type="button"
            data-cc-action="toggle-prepared-spell"
            data-spell-id="${escapeHtml(spell.id)}"
          >
            ${
              spell.prepared
                ? "Unprepare"
                : "Prepare"
            }
          </button>

          <button
            type="button"
            data-cc-action="remove-custom-spell"
            data-spell-id="${escapeHtml(spell.id)}"
          >
            Remove Spell
          </button>
        </div>
      `;
    })
    .join("");

const featureCards =
  features.customFeatures
    .map((feature) => {
      return `
        <div class="hg-character-choice-card">
          <h3>
            ${escapeHtml(feature.name)}
          </h3>

          <p>
            <b>Source:</b>
            ${escapeHtml(feature.source)}
          </p>

          <p>
            <b>Level:</b>
            ${feature.level || "Any"}
          </p>

          <p>
            <b>Uses:</b>

            ${escapeHtml(
              feature.uses ||
              "Not limited"
            )}
          </p>

          <p>
            ${escapeHtml(feature.notes)}
          </p>

          <button
            type="button"
            data-cc-action="remove-custom-feature"
            data-feature-id="${escapeHtml(feature.id)}"
          >
            Remove Feature
          </button>
        </div>
      `;
    })
    .join("");

return `
  <div class="hg-character-field-grid three">
    ${wizardSelect(
      "Spellcasting Ability",
      "ccSpellcastingAbility",
      magic.spellcastingAbility,
      [
        {
          value: "",
          label:
            "No Spellcasting Ability"
        },

        ...ABILITY_DEFINITIONS.map(
          (ability) => {
            return {
              value: ability.id,
              label: ability.name
            };
          }
        )
      ],

      {
        changeAction:
          "spellcasting-ability"
      }
    )}

    ${wizardField(
      "Spell Save DC",
      "ccSpellSaveDc",
      magic.spellSaveDc ?? "—",
      {
        extra: "readonly"
      }
    )}

    ${wizardField(
      "Spell Attack",
      "ccSpellAttack",
      magic.spellAttackBonus === null
        ? "—"
        : signedNumber(
            magic.spellAttackBonus
          ),
      {
        extra: "readonly"
      }
    )}
  </div>

  <hr>

  <h3>Custom Spells</h3>

  <div class="hg-character-choice-grid">
    ${
      spellCards ||
      `
        <div class="hg-character-placeholder">
          No custom spells added yet.
        </div>
      `
    }
  </div>

  <div
    class="hg-character-field-grid three"
    style="margin-top:12px;"
  >
    ${wizardField(
      "Spell Name",
      "ccSpellName",
      "",
      {
        placeholder:
          "Original spell name"
      }
    )}

    ${wizardField(
      "Spell Level",
      "ccSpellLevel",
      0,
      {
        type: "number",
        extra:
          'min="0" max="9"'
      }
    )}

    ${wizardField(
      "School / Type",
      "ccSpellSchool",
      "Custom"
    )}

    ${wizardField(
      "Casting Time",
      "ccSpellCastingTime",
      "1 action"
    )}

    ${wizardField(
      "Range",
      "ccSpellRange",
      "Self"
    )}

    <div class="hg-character-field">
      <label for="ccSpellPrepared">
        Prepared
      </label>

      <input
        id="ccSpellPrepared"
        type="checkbox"
      >
    </div>

    ${wizardField(
      "Spell Description",
      "ccSpellDescription",
      "",
      {
        type: "textarea",
        wide: true
      }
    )}
  </div>

  <button
    type="button"
    data-cc-action="add-custom-spell"
  >
    Add Spell
  </button>

  <hr>

  <h3>Custom Features</h3>

  <div class="hg-character-choice-grid">
    ${
      featureCards ||
      `
        <div class="hg-character-placeholder">
          No custom features added yet.
        </div>
      `
    }
  </div>

  <div
    class="hg-character-field-grid three"
    style="margin-top:12px;"
  >
    ${wizardField(
      "Feature Name",
      "ccFeatureName",
      ""
    )}

    ${wizardField(
      "Source",
      "ccFeatureSource",
      "Custom"
    )}

    ${wizardField(
      "Level Gained",
      "ccFeatureLevel",
      0,
      {
        type: "number",
        extra:
          'min="0" max="20"'
      }
    )}

    ${wizardField(
      "Uses",
      "ccFeatureUses",
      "",
      {
        placeholder:
          "3 per rest, once daily..."
      }
    )}

    ${wizardField(
      "Feature Description",
      "ccFeatureDescription",
      "",
      {
        type: "textarea",
        wide: true
      }
    )}
  </div>

  <button
    type="button"
    data-cc-action="add-custom-feature"
  >
    Add Feature
  </button>

  <hr>

  ${wizardField(
    "Magic Notes",
    "ccMagicNotes",
    magic.notes,
    {
      type: "textarea",
      path: "magic.notes",
      wide: true
    }
  )}

  ${wizardField(
    "Feature Notes",
    "ccFeatureNotes",
    features.notes,
    {
      type: "textarea",
      path: "features.notes",
      wide: true
    }
  )}
`;
```

}

// =====================================================
// CHARACTER CREATOR SECTION 18 — FINAL CALCULATIONS
// =====================================================

function abilityNameToId(value) {
const clean =
String(value || "")
.trim()
.toLowerCase();

```
return (
  ABILITY_DEFINITIONS
    .find((ability) => {
      return (
        ability.id === clean ||
        ability.name.toLowerCase() === clean
      );
    })
    ?.id ||
  ""
);
```

}

function calculateSavingThrowModifier(
abilityId
) {
const ability =
ABILITY_DEFINITIONS
.find((item) => {
return item.id === abilityId;
});

```
const proficient =
  creatorState.draft
    .proficiencies
    .savingThrows
    .some((name) => {
      return (
        String(name).toLowerCase() ===
        String(ability?.name).toLowerCase()
      );
    });

return (
  safeNumber(
    creatorState.draft
      .abilities
      .modifiers[abilityId],
    0
  ) +

  (
    proficient
      ? creatorState.draft
          .combat
          .proficiencyBonus
      : 0
  )
);
```

}

function calculateFinalCharacterValues() {
calculateCharacterValues();
normalizeEquipmentList();
normalizeMagicAndFeatures();
syncSpellIdLists();

```
const character =
  creatorState.draft;

const selectedClass =
  getSelectedClassTemplate();

if (
  !character.magic.spellcastingAbility &&
  character.magic.customSpells.length
) {
  character.magic.spellcastingAbility =
    (
      selectedClass
        ?.primaryAbilities ||
      []
    )
      .map(abilityNameToId)
      .find((id) => {
        return [
          "int",
          "wis",
          "cha"
        ].includes(id);
      }) ||
    "";
}

if (
  character.magic.spellcastingAbility
) {
  const modifier =
    safeNumber(
      character.abilities
        .modifiers[
          character.magic
            .spellcastingAbility
        ],
      0
    );

  character.magic.spellSaveDc =
    8 +
    character.combat
      .proficiencyBonus +
    modifier;

  character.magic.spellAttackBonus =
    character.combat
      .proficiencyBonus +
    modifier;
} else {
  character.magic.spellSaveDc =
    null;

  character.magic.spellAttackBonus =
    null;
}

character.combat
  .savingThrowModifiers = {};

ABILITY_DEFINITIONS
  .forEach((ability) => {
    character.combat
      .savingThrowModifiers[
        ability.id
      ] =
        calculateSavingThrowModifier(
          ability.id
        );
  });

character.combat
  .skillModifiers = {};

SKILL_DEFINITIONS
  .forEach((skill) => {
    character.combat
      .skillModifiers[
        skill.id
      ] =
        calculateSkillModifier(
          skill.id
        );
  });

character.combat.passivePerception =
  10 +
  calculateSkillModifier(
    "perception"
  );

character.equipment.totalKnownWeight =
  getInventoryWeight();

const level =
  character.classProgression
    .totalLevel;

const levelFeatures = [];

Object.entries(
  selectedClass?.levels || {}
).forEach(
  ([featureLevel, data]) => {
    if (
      safeNumber(featureLevel, 99) <=
      level
    ) {
      (
        data?.features ||
        []
      ).forEach((feature) => {
        levelFeatures.push(
          cloneData(feature)
        );
      });
    }
  }
);

character.features.classFeatures =
  levelFeatures;

character.features.backgroundFeatures =
  cloneData(
    character.background
      .templateSnapshot
      ?.features ||
    []
  );

applyCompatibilityAliases(
  character
);

return character;
```

}

function getFinalValidationWarnings() {
calculateFinalCharacterValues();

```
const warnings =
  getValidationWarnings();

const selectedClass =
  getSelectedClassTemplate();

const needed =
  Math.max(
    0,
    Math.round(
      safeNumber(
        selectedClass
          ?.skillChoices
          ?.choose,
        0
      )
    )
  );

const chosen =
  getChosenClassSkills().length;

if (chosen < needed) {
  warnings.push(
    `Choose ${needed - chosen} more class skill` +
    `${needed - chosen === 1 ? "" : "s"}.`
  );
}

if (
  creatorState.draft
    .combat
    .maxHp <
  1
) {
  warnings.push(
    "Maximum HP must be at least 1."
  );
}

if (
  creatorState.draft
    .combat
    .currentHp >
  creatorState.draft
    .combat
    .maxHp
) {
  warnings.push(
    "Current HP is higher than maximum HP."
  );
}

return Array.from(
  new Set(warnings)
);
```

}

const getStepCompletionStateBeforeFinal =
getStepCompletionState;

getStepCompletionState =
function (stepId) {
if (
stepId === "equipment" ||
stepId === "spells"
) {
return true;
}

```
  if (stepId === "review") {
    return (
      getFinalValidationWarnings()
        .length ===
      0
    );
  }

  if (stepId === "save") {
    return Boolean(
      creatorState.currentCharacterId
    );
  }

  return getStepCompletionStateBeforeFinal(
    stepId
  );
};
```

// =====================================================
// CHARACTER CREATOR SECTION 19 — REVIEW / VALIDATION
// =====================================================

function signedNumber(value) {
const number =
safeNumber(value, 0);

```
return number >= 0
  ? "+" + number
  : String(number);
```

}

function reviewList(
items,
emptyText
) {
return items.length
? `          <ul>
            ${
              items
                .map((item) => {
                  return` <li>
${escapeHtml(item)} </li>
`;
                })
                .join("")
            }           </ul>
        `
: `           <p>
            ${escapeHtml(emptyText)}           </p>
        `;
}

function renderReviewStepFinal() {
const character =
calculateFinalCharacterValues();

```
const warnings =
  getFinalValidationWarnings();

const abilities =
  ABILITY_DEFINITIONS
    .map((ability) => {
      return `
        <div class="hg-character-ability-box">
          <b>
            ${escapeHtml(ability.name)}
          </b>

          <div>
            ${
              character.abilities
                .scores[
                  ability.id
                ]
            }
          </div>

          <div class="small">
            ${signedNumber(
              character.abilities
                .modifiers[
                  ability.id
                ]
            )}
          </div>
        </div>
      `;
    })
    .join("");

const skills =
  SKILL_DEFINITIONS
    .filter((skill) => {
      return (
        character.proficiencies
          .skills[
            skill.id
          ]
          ?.proficient
      );
    })
    .map((skill) => {
      const saved =
        character.proficiencies
          .skills[
            skill.id
          ];

      return (
        `${skill.name} ` +
        `${signedNumber(
          character.combat
            .skillModifiers[
              skill.id
            ]
        )}` +
        `${
          saved.expertise
            ? " (Expertise)"
            : ""
        }`
      );
    });

const equipment =
  character.equipment.items
    .map((item) => {
      return (
        `${item.quantity}× ` +
        `${item.name}` +
        `${
          item.equipped
            ? " (Equipped)"
            : ""
        }`
      );
    });

const spells =
  character.magic
    .customSpells
    .map((spell) => {
      return (
        `${
          spell.level === 0
            ? "Cantrip"
            : "Level " + spell.level
        }: ` +
        `${spell.name}` +
        `${
          spell.prepared
            ? " (Prepared)"
            : ""
        }`
      );
    });

const features = [
  ...character.features
    .speciesTraits,

  ...character.features
    .classFeatures,

  ...character.features
    .backgroundFeatures,

  ...character.features
    .customFeatures
].map((feature) => {
  return typeof feature === "string"
    ? feature
    : safeDisplayString(
        feature.name,
        "Unnamed Feature"
      );
});

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

        ${
          character.classProgression
            .totalLevel
        }
      </p>

      <p>
        <b>Proficiency:</b>

        ${signedNumber(
          character.combat
            .proficiencyBonus
        )}
      </p>
    </div>

    <div class="hg-character-summary-card">
      <h3>Combat</h3>

      <p>
        <b>AC:</b>
        ${character.combat.armorClass}
      </p>

      <p>
        <b>HP:</b>

        ${character.combat.currentHp}
        /
        ${character.combat.maxHp}
      </p>

      <p>
        <b>Initiative:</b>

        ${signedNumber(
          character.combat.initiative
        )}
      </p>

      <p>
        <b>Passive Perception:</b>

        ${
          character.combat
            .passivePerception
        }
      </p>
    </div>

    <div class="hg-character-summary-card">
      <h3>Magic</h3>

      <p>
        <b>Ability:</b>

        ${escapeHtml(
          character.magic
            .spellcastingAbility
            ?.toUpperCase() ||
          "None"
        )}
      </p>

      <p>
        <b>Spell Save:</b>

        ${
          character.magic
            .spellSaveDc ??
          "—"
        }
      </p>

      <p>
        <b>Spell Attack:</b>

        ${
          character.magic
            .spellAttackBonus === null
            ? "—"
            : signedNumber(
                character.magic
                  .spellAttackBonus
              )
        }
      </p>
    </div>
  </div>

  <hr>

  <h3>Ability Scores</h3>

  <div class="hg-character-ability-grid">
    ${abilities}
  </div>

  <div
    class="hg-character-summary-grid"
    style="margin-top:12px;"
  >
    <div class="hg-character-summary-card">
      <h3>Skills</h3>

      ${reviewList(
        skills,
        "No proficient skills selected."
      )}
    </div>

    <div class="hg-character-summary-card">
      <h3>Equipment</h3>

      ${reviewList(
        equipment,
        "No equipment added."
      )}
    </div>

    <div class="hg-character-summary-card">
      <h3>Spells</h3>

      ${reviewList(
        spells,
        "No spells added."
      )}
    </div>

    <div class="hg-character-summary-card">
      <h3>Features</h3>

      ${reviewList(
        features,
        "No features added."
      )}
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
              No required choices are missing.
            </div>
          `
    }
  </div>
`;
```

}

// =====================================================
// CHARACTER CREATOR SECTION 20 — FINISH / TOKEN / FINAL API
// =====================================================

const FINAL_SIZE_MULTIPLIERS =
Object.freeze({
tiny: 0.5,
small: 1,
medium: 1,
large: 2,
huge: 3,
gargantuan: 4
});

function getCharacterTokenTarget(room) {
const safeRoom =
room || {};

```
const tiles =
  Array.isArray(
    safeRoom.puzzleTiles
  )
    ? safeRoom.puzzleTiles
        .filter((tile) => {
          return (
            tile?.url &&
            tile?.key
          );
        })
    : [];

if (tiles.length) {
  if (
    safeRoom.puzzleViewMode ===
    "focus"
  ) {
    const active =
      tiles.find((tile) => {
        return (
          tile.key ===
          safeRoom.activePuzzleTileKey
        );
      }) ||
      tiles[0];

    return {
      mapMode: "puzzle",
      tileKey:
        active?.key ||
        null
    };
  }

  return {
    mapMode: "puzzle",
    tileKey: null
  };
}

if (
  safeRoom.currentMap?.url ||
  safeRoom.currentMapUrl
) {
  return {
    mapMode: "single",
    tileKey: null
  };
}

return {
  mapMode: null,
  tileKey: null
};
```

}

function getCharacterTokenMediumSize(room) {
const value =
safeNumber(
room?.tokenMediumSize ??
room?.tokenScale?.mediumSize,
64
);

```
return Math.max(
  24,

  Math.min(
    240,
    Math.round(value)
  )
);
```

}

function renderSaveStepFinal() {
const warnings =
getFinalValidationWarnings();

```
const isDM =
  deps.getCurrentIsDM
    ? deps.getCurrentIsDM()
    : false;

return `
  ${renderReviewStepFinal()}

  <hr>

  <h3>Save Character</h3>

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
        ? "This can be saved as a draft, but review warnings remain."
        : "All required builder checks pass."
    }
  </div>

  <hr>

  <h3>Create Linked Battle Token</h3>

  <div class="hg-character-field-grid three">
    ${wizardField(
      "Token Image URL",
      "ccTokenImageUrl",
      creatorState.draft
        .identity
        .image
        .url,
      {
        path:
          "identity.image.url",

        placeholder:
          "Optional image URL"
      }
    )}

    ${wizardSelect(
      "Token Size",
      "ccTokenSize",
      creatorState.draft
        .identity
        .size ||
      "medium",
      [
        "tiny",
        "small",
        "medium",
        "large",
        "huge",
        "gargantuan"
      ]
    )}

    <div class="hg-character-field">
      <label>Permission</label>

      <input
        value="${
          isDM
            ? "DM — enabled"
            : "Player — DM required"
        }"
        readonly
      >
    </div>
  </div>

  <button
    type="button"
    data-cc-action="create-character-token"
    ${isDM ? "" : "disabled"}
  >
    Save And Create Token
  </button>
`;
```

}

async function createCharacterToken() {
const roomCode =
getRoomCode();

```
const room =
  deps.getCurrentRoomData
    ? deps.getCurrentRoomData() ||
      {}
    : {};

const isDM =
  deps.getCurrentIsDM
    ? deps.getCurrentIsDM()
    : false;

if (!roomCode) {
  alert("Open a room first.");
  return null;
}

if (!isDM) {
  alert(
    "Only the DM can create battle-map tokens."
  );

  return null;
}

if (
  !creatorState.currentCharacterId ||
  creatorState.dirty
) {
  const savedId =
    await saveCharacter(false);

  if (!savedId) {
    return null;
  }
}

const target =
  getCharacterTokenTarget(room);

if (!target.mapMode) {
  alert(
    "Load a battle map or puzzle map first."
  );

  return null;
}

const sizeCategory =
  [
    "tiny",
    "small",
    "medium",
    "large",
    "huge",
    "gargantuan"
  ].includes(
    $("ccTokenSize")?.value
  )
    ? $("ccTokenSize").value
    : "medium";

const character =
  calculateFinalCharacterValues();

const mediumSize =
  getCharacterTokenMediumSize(
    room
  );

const tokenDoc =
  await deps.addDoc(
    deps.collection(
      deps.db,
      "rooms",
      roomCode,
      "tokens"
    ),

    {
      name:
        getSafeCharacterName() ||
        "Unnamed Character",

      type: "player",

      imageUrl:
        safeDisplayString(
          character.identity
            .image
            .url
        ),

      publicId:
        safeDisplayString(
          character.identity
            .image
            .publicId
        ) ||
        null,

      x: 50,
      y: 50,

      mapMode:
        target.mapMode,

      tileKey:
        target.tileKey,

      sizeCategory,
      creatureSize:
        sizeCategory,

      size: Math.round(
        mediumSize *
        (
          FINAL_SIZE_MULTIPLIERS[
            sizeCategory
          ] ||
          1
        )
      ),

      sheetId:
        creatorState.currentCharacterId,

      sheetType:
        "character",

      maxHp:
        character.combat.maxHp,

      currentHp:
        character.combat.currentHp,

      armorClass:
        character.combat.armorClass,

      initiative:
        character.combat.initiative,

      display: {
        name: true,
        hpBar: true,
        hpText: true,
        ac: true,
        conditions: true,
        initiative: true
      },

      createdAtMillis:
        Date.now(),

      updatedAtMillis:
        Date.now(),

      createdAt:
        deps.serverTimestamp(),

      updatedAt:
        deps.serverTimestamp()
    }
  );

setStatus(
  "Character saved and linked token created."
);

renderCreatorView();

return tokenDoc.id;
```

}

const renderStepContentBeforeFinal =
renderStepContent;

renderStepContent =
function (stepId) {
if (stepId === "equipment") {
return renderEquipmentStepFinal();
}

```
  if (stepId === "spells") {
    return renderSpellsFeaturesStepFinal();
  }

  if (stepId === "review") {
    return renderReviewStepFinal();
  }

  if (stepId === "save") {
    return renderSaveStepFinal();
  }

  return renderStepContentBeforeFinal(
    stepId
  );
};
```

const handleWizardClickBeforeFinal =
handleWizardClick;

handleWizardClick =
async function (event) {
const button =
event.target.closest(
"[data-cc-action]"
);

```
  const action =
    button?.dataset.ccAction;

  const actions = {
    "apply-equipment-package":
      () => {
        applyStartingEquipmentPackage(
          button.dataset.packageId
        );
      },

    "add-equipment-item":
      addCustomEquipmentItem,

    "remove-equipment-item":
      () => {
        removeEquipmentItem(
          button.dataset.itemId
        );
      },

    "toggle-equipment-item":
      () => {
        toggleEquipmentItem(
          button.dataset.itemId
        );
      },

    "add-custom-spell":
      addCustomSpell,

    "remove-custom-spell":
      () => {
        removeCustomSpell(
          button.dataset.spellId
        );
      },

    "toggle-prepared-spell":
      () => {
        togglePreparedSpell(
          button.dataset.spellId
        );
      },

    "add-custom-feature":
      addCustomFeature,

    "remove-custom-feature":
      () => {
        removeCustomFeature(
          button.dataset.featureId
        );
      }
  };

  if (actions[action]) {
    actions[action]();
    renderCreatorView();
    return;
  }

  if (
    action ===
    "create-character-token"
  ) {
    await createCharacterToken();
    return;
  }

  await handleWizardClickBeforeFinal(
    event
  );
};
```

const handleWizardInputBeforeFinal =
handleWizardInput;

handleWizardInput =
function (event) {
const target =
event.target;

```
  if (
    target.dataset.equipmentId &&
    target.dataset.equipmentField
  ) {
    updateEquipmentItemField(
      target.dataset.equipmentId,
      target.dataset.equipmentField,
      target.value
    );

    return;
  }

  handleWizardInputBeforeFinal(
    event
  );
};
```

const handleWizardChangeBeforeFinal =
handleWizardChange;

handleWizardChange =
function (event) {
if (
event.target.dataset
.ccActionChange ===
"spellcasting-ability"
) {
setSpellcastingAbility(
event.target.value
);

```
    renderCreatorView();
    return;
  }

  handleWizardChangeBeforeFinal(
    event
  );
};
```

const saveCharacterBeforeFinal =
saveCharacter;

saveCharacter =
async function (asNew = false) {
calculateFinalCharacterValues();

```
  return saveCharacterBeforeFinal(
    asNew
  );
};
```

const copyCharacterJsonBeforeFinal =
copyCharacterJson;

copyCharacterJson =
async function () {
calculateFinalCharacterValues();

```
  return copyCharacterJsonBeforeFinal();
};
```

const exportCharacterJsonBeforeFinal =
exportCharacterJson;

exportCharacterJson =
function () {
calculateFinalCharacterValues();

```
  return exportCharacterJsonBeforeFinal();
};
```

function init() {
ensureWizardShell();
connectPopstateRouting();
applyInitialRoute();
startCharacterListener();
startRoomClassListener();
calculateFinalCharacterValues();
renderCreatorView();

```
window.HomebrewGodCharacterCreator =
  api;
```

}

function stop() {
stopCharacterListener();
stopRoomClassListener();

```
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
```

}

const api = {
init,
stop,
render: renderCreatorView,

```
steps:
  BUILDER_STEPS,

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

startingEquipmentPackages:
  STARTING_EQUIPMENT_PACKAGES,

getState: () => {
  return creatorState;
},

getDraft: () => {
  return cloneData(
    calculateFinalCharacterValues()
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
calculateCharacterValues,
calculateFinalCharacterValues,
getFinalValidationWarnings,
saveCharacter,

saveAnotherCopy: () => {
  return saveCharacter(true);
},

deleteCharacter,
copyCharacterJson,
exportCharacterJson,
importCharacterJson,
createCharacterToken
```

};

init();

return api;
}
