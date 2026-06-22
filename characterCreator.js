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
