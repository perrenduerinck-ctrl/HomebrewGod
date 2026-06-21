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
// TEMPORARY FOUNDATION BOOTSTRAP
// Delete this block when Sections 6–10 are added.
// It keeps the current HTML form and saving functional.
// =====================================================

  const foundationBridge = {
    initialized: false,
    listenersConnected: false
  };

  function readTemporaryFormIntoDraft() {
    refreshElements();

    const current = normalizeCharacter(
      creatorState.draft
    );

    const primaryClass = getPrimaryClassEntry(current);
    const selectedClass = getSelectedClassTemplate();

    const maxHp = Math.max(
      1,
      safeNumber(
        C.maxHpInput?.value,
        current.combat.maxHp
      )
    );

    const walkSpeed = safeNumber(
      String(
        C.speedInput?.value ||
        current.speed
      ).replace(/[^0-9.-]/g, ""),
      current.combat.speed.walk
    );

    current.identity.name = cleanString(
      C.nameInput?.value
    );

    current.species.name = cleanString(
      C.raceInput?.value
    );

    primaryClass.classId =
      selectedClass?.id ||
      primaryClass.classId;

    primaryClass.className =
      selectedClass?.name ||
      cleanString(
        C.classInput?.value,
        primaryClass.className
      );

    primaryClass.templateSnapshot =
      selectedClass
        ? cloneData(selectedClass)
        : primaryClass.templateSnapshot;

    primaryClass.level = clampLevel(
      C.levelInput?.value ||
      primaryClass.level
    );

    current.classProgression.totalLevel =
      primaryClass.level;

    current.combat.armorClass = safeNumber(
      C.acInput?.value,
      10
    );

    current.combat.maxHp = maxHp;

    current.combat.currentHp = safeNumber(
      C.currentHpInput?.value,
      maxHp
    );

    current.combat.speed.walk = walkSpeed;

    current.combat.proficiencyBonus =
      getGenericProficiencyBonus(
        current.classProgression.totalLevel
      );

    current.abilities.base = {
      str: safeNumber(
        C.strInput?.value,
        10
      ),

      dex: safeNumber(
        C.dexInput?.value,
        10
      ),

      con: safeNumber(
        C.conInput?.value,
        10
      ),

      int: safeNumber(
        C.intInput?.value,
        10
      ),

      wis: safeNumber(
        C.wisInput?.value,
        10
      ),

      cha: safeNumber(
        C.chaInput?.value,
        10
      )
    };

    current.abilities.scores = {
      ...current.abilities.base
    };

    current.abilities.modifiers =
      calculateAbilityModifiers(
        current.abilities.scores
      );

    current.notes = cleanString(
      C.notesInput?.value
    );

    creatorState.draft =
      applyCompatibilityAliases(current);

    creatorState.dirty = true;

    return creatorState.draft;
  }

  function writeDraftToTemporaryForm() {
    refreshElements();

    const current = applyCompatibilityAliases(
      normalizeCharacter(
        creatorState.draft
      )
    );

    const primaryClass = getPrimaryClassEntry(current);

    if (C.nameInput) {
      C.nameInput.value =
        current.identity.name;
    }

    if (C.raceInput) {
      C.raceInput.value =
        current.species.name;
    }

    if (C.classInput) {
      C.classInput.value =
        primaryClass?.className || "";
    }

    if (C.levelInput) {
      C.levelInput.value =
        current.classProgression.totalLevel;
    }

    if (C.acInput) {
      C.acInput.value =
        current.combat.armorClass;
    }

    if (C.maxHpInput) {
      C.maxHpInput.value =
        current.combat.maxHp;
    }

    if (C.currentHpInput) {
      C.currentHpInput.value =
        current.combat.currentHp;
    }

    if (C.speedInput) {
      C.speedInput.value =
        `${current.combat.speed.walk} ft.`;
    }

    if (C.strInput) {
      C.strInput.value =
        current.abilities.scores.str;
    }

    if (C.dexInput) {
      C.dexInput.value =
        current.abilities.scores.dex;
    }

    if (C.conInput) {
      C.conInput.value =
        current.abilities.scores.con;
    }

    if (C.intInput) {
      C.intInput.value =
        current.abilities.scores.int;
    }

    if (C.wisInput) {
      C.wisInput.value =
        current.abilities.scores.wis;
    }

    if (C.chaInput) {
      C.chaInput.value =
        current.abilities.scores.cha;
    }

    if (C.notesInput) {
      C.notesInput.value =
        current.notes;
    }

    refreshTemporarySaveButtonText();
  }

  function ensureTemporarySaveAsNewButton() {
    refreshElements();

    if (
      !C.saveButton ||
      C.saveAsNewButton
    ) {
      return;
    }

    const button =
      document.createElement("button");

    button.id = "saveAsNewCharacterButton";
    button.type = "button";
    button.textContent = "Save Another Copy";

    button.title =
      "Always creates a separate Firestore character document.";

    C.saveButton.insertAdjacentElement(
      "afterend",
      button
    );

    C.saveAsNewButton = button;
  }

  function refreshTemporarySaveButtonText() {
    refreshElements();

    if (!C.saveButton) {
      return;
    }

    C.saveButton.textContent =
      creatorState.currentCharacterId
        ? "Update Character"
        : "Save New Character";
  }

  function renderTemporaryCharacterLibrary() {
    refreshElements();

    if (!C.libraryList) {
      return;
    }

    C.libraryList.innerHTML = "";

    if (!creatorState.characterCache.length) {
      C.libraryList.textContent =
        "No saved characters yet.";

      return;
    }

    creatorState.characterCache.forEach((character) => {
      const card = document.createElement("div");
      card.className = "row";

      const title = document.createElement("div");
      title.className = "row-title";

      title.textContent =
        character.identity.name ||
        "Unnamed Character";

      const meta = document.createElement("div");
      meta.className = "small";

      meta.textContent =
        `Level ${character.level} ` +
        `${character.className || "No class"} — ` +
        `${character.race || "No species"}`;

      const loadButton =
        document.createElement("button");

      loadButton.type = "button";
      loadButton.textContent = "Load";

      loadButton.addEventListener("click", () => {
        replaceDraft(
          character,
          {
            characterId: character.id,
            dirty: false,

            stepId:
              character.builder?.currentStep ||
              "basics"
          }
        );

        writeDraftToTemporaryForm();

        setStatus(
          `Loaded ${
            character.identity.name ||
            "character"
          }.`
        );
      });

      const duplicateButton =
        document.createElement("button");

      duplicateButton.type = "button";
      duplicateButton.textContent = "Duplicate";

      duplicateButton.addEventListener("click", () => {
        duplicateIntoDraft(character);
        writeDraftToTemporaryForm();
      });

      const deleteButton =
        document.createElement("button");

      deleteButton.type = "button";
      deleteButton.textContent = "Delete";

      deleteButton.addEventListener("click", () => {
        deleteTemporaryCharacter(character.id);
      });

      card.append(
        title,
        meta,
        loadButton,
        duplicateButton,
        deleteButton
      );

      C.libraryList.appendChild(card);
    });
  }

  function stopTemporaryCharacterListener() {
    if (
      typeof creatorState.characterUnsubscribe ===
      "function"
    ) {
      creatorState.characterUnsubscribe();
    }

    creatorState.characterUnsubscribe = null;
    creatorState.characterRoomCode = null;
    creatorState.characterCache = [];
  }

  function startTemporaryCharacterListener() {
    const roomCode = getRoomCode();

    if (
      !roomCode ||
      !hasFirestoreTools()
    ) {
      stopTemporaryCharacterListener();
      renderTemporaryCharacterLibrary();

      return;
    }

    if (
      creatorState.characterRoomCode === roomCode &&
      creatorState.characterUnsubscribe
    ) {
      return;
    }

    stopTemporaryCharacterListener();

    creatorState.characterRoomCode = roomCode;

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
                return normalizeCharacter({
                  ...characterDoc.data(),
                  id: characterDoc.id
                });
              })
              .sort((a, b) => {
                return String(
                  a.identity.name || ""
                ).localeCompare(
                  String(
                    b.identity.name || ""
                  )
                );
              });

          renderTemporaryCharacterLibrary();
        },

        (error) => {
          console.error(error);

          setStatus(
            `Could not load characters: ${error.message}`
          );
        }
      );
  }

  async function createTemporaryCharacterDocument(
    message
  ) {
    const roomCode = getRoomCode();

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

    readTemporaryFormIntoDraft();

    if (!creatorState.draft.identity.name) {
      alert(
        "Give the character a name before saving."
      );

      return null;
    }

    const newDoc = await deps.addDoc(
      deps.collection(
        deps.db,
        "rooms",
        roomCode,
        "characters"
      ),

      {
        ...getCharacterSnapshot(),
        createdAt: deps.serverTimestamp(),
        updatedAt: deps.serverTimestamp()
      }
    );

    creatorState.currentCharacterId =
      newDoc.id;

    creatorState.dirty = false;

    refreshTemporarySaveButtonText();

    setStatus(
      message ||
      "Character saved as a new character."
    );

    return newDoc.id;
  }

  async function saveTemporaryCharacter() {
    try {
      const roomCode = getRoomCode();

      if (!roomCode) {
        alert("Open a room first.");
        return;
      }

      if (!creatorState.currentCharacterId) {
        await createTemporaryCharacterDocument(
          "New character saved."
        );

        return;
      }

      readTemporaryFormIntoDraft();

      if (!creatorState.draft.identity.name) {
        alert(
          "Give the character a name before saving."
        );

        return;
      }

      await deps.updateDoc(
        deps.doc(
          deps.db,
          "rooms",
          roomCode,
          "characters",
          creatorState.currentCharacterId
        ),

        {
          ...getCharacterSnapshot(),
          updatedAt: deps.serverTimestamp()
        }
      );

      creatorState.dirty = false;

      setStatus("Character updated.");
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  async function saveTemporaryCharacterAsNew() {
    try {
      await createTemporaryCharacterDocument(
        "Another copy was saved as a separate character."
      );
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  async function deleteTemporaryCharacter(
    characterId
  ) {
    try {
      const roomCode = getRoomCode();

      if (
        !roomCode ||
        !characterId
      ) {
        return;
      }

      if (!confirm("Delete this saved character?")) {
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
        creatorState.currentCharacterId = null;

        refreshTemporarySaveButtonText();
      }

      setStatus("Character deleted.");
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  async function copyTemporaryCharacterJson() {
    try {
      readTemporaryFormIntoDraft();

      await navigator.clipboard.writeText(
        JSON.stringify(
          getCharacterSnapshot(),
          null,
          2
        )
      );

      setStatus("Character JSON copied.");
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  function exportTemporaryCharacterJson() {
    try {
      readTemporaryFormIntoDraft();

      const data = getCharacterSnapshot();

      const blob = new Blob(
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
        `${makeSafeFileName(
          data.name ||
          "character"
        )}.json`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);

      setStatus("Character JSON exported.");
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  async function importTemporaryCharacterJson(
    file
  ) {
    try {
      if (!file) {
        return;
      }

      const text = await file.text();
      const imported = JSON.parse(text);

      replaceDraft(
        imported,
        {
          characterId: null,
          dirty: true,

          stepId:
            imported.builder?.currentStep ||
            "basics"
        }
      );

      writeDraftToTemporaryForm();

      setStatus(
        "Character JSON imported as a new unsaved draft."
      );
    } catch (error) {
      console.error(error);

      alert(
        `Could not import character JSON: ${error.message}`
      );
    }
  }

  function connectTemporaryButtons() {
    refreshElements();
    ensureTemporarySaveAsNewButton();
    refreshElements();

    if (foundationBridge.listenersConnected) {
      return;
    }

    foundationBridge.listenersConnected = true;

    C.newButton?.addEventListener(
      "click",
      () => {
        startNewDraft();
        writeDraftToTemporaryForm();
      }
    );

    C.saveButton?.addEventListener(
      "click",
      saveTemporaryCharacter
    );

    C.saveAsNewButton?.addEventListener(
      "click",
      saveTemporaryCharacterAsNew
    );

    C.copyJsonButton?.addEventListener(
      "click",
      copyTemporaryCharacterJson
    );

    C.exportJsonButton?.addEventListener(
      "click",
      exportTemporaryCharacterJson
    );

    C.importJsonInput?.addEventListener(
      "change",
      async () => {
        const file =
          C.importJsonInput.files?.[0];

        await importTemporaryCharacterJson(file);

        C.importJsonInput.value = "";
      }
    );
  }

  function initFoundationBridge() {
    if (foundationBridge.initialized) {
      return;
    }

    foundationBridge.initialized = true;

    refreshElements();
    connectTemporaryButtons();
    startTemporaryCharacterListener();
    writeDraftToTemporaryForm();

    if (C.subtitle) {
      C.subtitle.textContent =
        "Foundation updated. The one-page layout will be replaced in Sections 6–10.";
    }

    setStatus(
      "Sections 1–5 loaded. Existing character saves remain active."
    );
  }

  function stop() {
    stopTemporaryCharacterListener();
  }

  const api = {
    init: initFoundationBridge,
    stop,

    steps: BUILDER_STEPS,

    abilities: ABILITY_DEFINITIONS,
    skills: SKILL_DEFINITIONS,
    abilityMethods: ABILITY_SCORE_METHODS,

    defaultClasses: DEFAULT_CLASS_TEMPLATES,
    defaultSpecies: DEFAULT_SPECIES_TEMPLATES,
    defaultBackgrounds: DEFAULT_BACKGROUND_TEMPLATES,
    defaultEquipment: DEFAULT_EQUIPMENT_CATALOG,

    getState: () => creatorState,

    getDraft: () => {
      return cloneData(
        creatorState.draft
      );
    },

    getCharacterSnapshot,
    replaceDraft,
    startNewDraft,
    duplicateIntoDraft,
    setDraftValue,
    setCurrentStep,

    getAllClassTemplates,
    getSelectedClassTemplate,
    selectClassTemplate,

    createEmptyCharacter,
    normalizeCharacter,
    createCharacterPayload,

    saveCharacter: saveTemporaryCharacter,
    saveAnotherCopy: saveTemporaryCharacterAsNew,
    deleteCharacter: deleteTemporaryCharacter,

    copyCharacterJson:
      copyTemporaryCharacterJson,

    exportCharacterJson:
      exportTemporaryCharacterJson,

    importCharacterJson:
      importTemporaryCharacterJson
  };

  initFoundationBridge();

  window.HomebrewGodCharacterCreator = api;

  return api;
}
