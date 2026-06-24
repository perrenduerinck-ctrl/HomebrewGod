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
      id: "level",
      label: "Level / Advancement",
      shortLabel: "Level",
      description: "Set level, hit points, advancement, and class progression.",
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
        classes: []
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
        hpCalculation: {
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
        customSpells: [],
        innateSpells: [],
        slots: {},
        pactMagic: {
          slots: 0,
          slotLevel: 0
        },
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
      rawClassEntries[0] ||
      null;

    const legacyClassSnapshot =
      raw.selectedClassSnapshot ||
      rawBuilder.selectedClassSnapshot ||
      null;

    const legacyClassName =
      cleanString(
        raw.className ||
        legacyClassSnapshot?.name
      );

    const legacyClassId =
      cleanString(
        raw.classId ||
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
              level: raw.level || 1,
              subclassId: "",
              subclassName: raw.subclassName,
              templateSnapshot:
                legacyClassSnapshot,
              choices: {}
            }
          ]
          : [];

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

    const totalLevel = clampLevel(
      raw.classProgression?.totalLevel ||
      classLevelTotal ||
      raw.level ||
      rawClassEntry?.level ||
      1
    );

    const normalizedClassList =
      rawClassList.map(
        (classEntry, index) => {
          const isPrimary =
            index === 0;

          return {
            classId: cleanString(
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
            ),

            className: cleanString(
              classEntry?.className ||
              (
                isPrimary
                  ? raw.className
                  : ""
              ),
              isPrimary
                ? fallbackClassName
                : "Custom Class"
            ),

            source: cleanString(
              classEntry?.source,
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

            templateSnapshot: cloneData(
              classEntry?.templateSnapshot ||
              (
                isPrimary
                  ? raw.selectedClassSnapshot ||
                    rawBuilder.selectedClassSnapshot
                  : null
              ) ||
              null
            ),

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

        classes:
          normalizedClassList
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

        hpCalculation:
          normalizeHpCalculation(
            raw.combat?.hpCalculation,
            raw.combat?.maxHp ??
            raw.maxHp
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
                item?.source || "import"
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
        cleanArray(entry.source);

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
        return;
      }

      Object.keys(sourceMap).forEach((value) => {
        sourceMap[value] =
          cleanArray(
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

    return applyCompatibilityAliases(normalized);
  }

  function createCharacterPayload(character) {
    const normalized = normalizeCharacter(character);

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

  const SRD_2014_FULL_CASTER_SLOTS = Object.freeze({
    1: [2, 0, 0, 0, 0, 0, 0, 0, 0],
    2: [3, 0, 0, 0, 0, 0, 0, 0, 0],
    3: [4, 2, 0, 0, 0, 0, 0, 0, 0],
    4: [4, 3, 0, 0, 0, 0, 0, 0, 0],
    5: [4, 3, 2, 0, 0, 0, 0, 0, 0],
    6: [4, 3, 3, 0, 0, 0, 0, 0, 0],
    7: [4, 3, 3, 1, 0, 0, 0, 0, 0],
    8: [4, 3, 3, 2, 0, 0, 0, 0, 0],
    9: [4, 3, 3, 3, 1, 0, 0, 0, 0],
    10: [4, 3, 3, 3, 2, 0, 0, 0, 0],
    11: [4, 3, 3, 3, 2, 1, 0, 0, 0],
    12: [4, 3, 3, 3, 2, 1, 0, 0, 0],
    13: [4, 3, 3, 3, 2, 1, 1, 0, 0],
    14: [4, 3, 3, 3, 2, 1, 1, 0, 0],
    15: [4, 3, 3, 3, 2, 1, 1, 1, 0],
    16: [4, 3, 3, 3, 2, 1, 1, 1, 0],
    17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
    18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
    19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
    20: [4, 3, 3, 3, 3, 2, 2, 1, 1]
  });

  const SRD_2014_PACT_MAGIC = Object.freeze({
    1: { slots: 1, slotLevel: 1 },
    2: { slots: 2, slotLevel: 1 },
    3: { slots: 2, slotLevel: 2 },
    4: { slots: 2, slotLevel: 2 },
    5: { slots: 2, slotLevel: 3 },
    6: { slots: 2, slotLevel: 3 },
    7: { slots: 2, slotLevel: 4 },
    8: { slots: 2, slotLevel: 4 },
    9: { slots: 2, slotLevel: 5 },
    10: { slots: 2, slotLevel: 5 },
    11: { slots: 3, slotLevel: 5 },
    12: { slots: 3, slotLevel: 5 },
    13: { slots: 3, slotLevel: 5 },
    14: { slots: 3, slotLevel: 5 },
    15: { slots: 3, slotLevel: 5 },
    16: { slots: 3, slotLevel: 5 },
    17: { slots: 4, slotLevel: 5 },
    18: { slots: 4, slotLevel: 5 },
    19: { slots: 4, slotLevel: 5 },
    20: { slots: 4, slotLevel: 5 }
  });

  const SRD_2014_STANDARD_ASI_LEVELS =
    Object.freeze([4, 8, 12, 16, 19]);

  const SRD_2014_FIGHTER_ASI_LEVELS =
    Object.freeze([4, 6, 8, 12, 14, 16, 19]);

  const SRD_2014_ROGUE_ASI_LEVELS =
    Object.freeze([4, 8, 10, 12, 16, 19]);

  const SRD_2014_SIZE_CARRY_MULTIPLIERS =
    Object.freeze({
      tiny: 0.5,
      small: 1,
      medium: 1,
      large: 2,
      huge: 4,
      gargantuan: 8
    });

  function slotsArrayToObject(slots) {
    const result = {};

    (slots || []).forEach((count, index) => {
      if (count > 0) {
        result[index + 1] = count;
      }
    });

    return result;
  }

  function getSrd2014SpellSlots(
    progressionType,
    classLevel
  ) {
    const level = clampLevel(classLevel);
    let casterLevel = 0;

    if (progressionType === "full-caster") {
      casterLevel = level;
    } else if (progressionType === "half-caster") {
      casterLevel =
        level < 2
          ? 0
          : Math.ceil(level / 2);
    } else if (progressionType === "third-caster") {
      casterLevel =
        level < 3
          ? 0
          : Math.ceil(level / 3);
    }

    if (casterLevel < 1) {
      return {};
    }

    return slotsArrayToObject(
      SRD_2014_FULL_CASTER_SLOTS[
        Math.max(1, Math.min(20, casterLevel))
      ]
    );
  }

  function getSrd2014PactMagic(classLevel) {
    return {
      ...(SRD_2014_PACT_MAGIC[
        clampLevel(classLevel)
      ] || { slots: 0, slotLevel: 0 })
    };
  }

  function calculateSrd2014MulticlassSpellcasting(
    classEntries = []
  ) {
    const entries =
      Array.isArray(classEntries)
        ? classEntries
        : [];

    const casterLevel =
      entries.reduce((total, entry) => {
        const level =
          Math.max(
            0,
            Math.round(
              safeNumber(entry?.level, 0)
            )
          );

        const progression =
          entry?.spellcastingProgression ||
          entry?.progressionType ||
          "none";

        if (progression === "full-caster") {
          return total + level;
        }

        if (progression === "half-caster") {
          return total + Math.floor(level / 2);
        }

        if (progression === "third-caster") {
          return total + Math.floor(level / 3);
        }

        return total;
      }, 0);

    const pactMagic =
      entries
        .filter((entry) => {
          return (
            (
              entry?.spellcastingProgression ||
              entry?.progressionType
            ) === "pact-magic"
          );
        })
        .map((entry) => {
          return getSrd2014PactMagic(
            entry?.level
          );
        });

    return {
      casterLevel:
        Math.max(0, Math.min(20, casterLevel)),
      spellSlots:
        casterLevel > 0
          ? slotsArrayToObject(
              SRD_2014_FULL_CASTER_SLOTS[
                Math.max(
                  1,
                  Math.min(20, casterLevel)
                )
              ]
            )
          : {},
      pactMagic
    };
  }

  function getProgressionValueByLevel(
    values,
    level,
    fallback = 0
  ) {
    if (!values || typeof values !== "object") {
      return fallback;
    }

    const cleanLevel = clampLevel(level);

    if (
      values[cleanLevel] !== undefined
    ) {
      return safeNumber(
        values[cleanLevel],
        fallback
      );
    }

    const previousLevel =
      Object.keys(values)
        .map((key) => {
          return safeNumber(key, 0);
        })
        .filter((key) => {
          return key > 0 && key <= cleanLevel;
        })
        .sort((a, b) => {
          return b - a;
        })[0];

    if (previousLevel) {
      return safeNumber(
        values[previousLevel],
        fallback
      );
    }

    return safeNumber(
      values[cleanLevel],
      fallback
    );
  }

  function calculateRuleSkillModifier({
    abilityModifier = 0,
    proficiencyBonus = 0,
    proficient = false,
    expertise = false
  } = {}) {
    return (
      safeNumber(abilityModifier, 0) +
      (
        proficient
          ? safeNumber(proficiencyBonus, 0) *
            (expertise ? 2 : 1)
          : 0
      )
    );
  }

  function calculateRulePassiveScore(
    skillModifier,
    state = {}
  ) {
    return (
      10 +
      safeNumber(skillModifier, 0) +
      (state.advantage ? 5 : 0) -
      (state.disadvantage ? 5 : 0)
    );
  }

  function calculateRuleFixedAverageHp({
    hitDie,
    level,
    constitutionModifier,
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

    const laterLevelHp =
      Math.max(
        1,
        Math.floor(dieSize / 2) + 1 + conModifier
      );

    const firstLevelHp =
      levelOneValue === null ||
      levelOneValue === undefined
        ? dieSize + conModifier
        : safeNumber(
            levelOneValue,
            dieSize + conModifier
          );

    return Math.max(
      1,
      firstLevelHp +
      Math.max(0, cleanLevel - 1) *
        laterLevelHp
    );
  }

  function calculateRuleSpellSaveDc({
    proficiencyBonus,
    abilityModifier,
    bonus = 0
  }) {
    return (
      8 +
      safeNumber(proficiencyBonus, 0) +
      safeNumber(abilityModifier, 0) +
      safeNumber(bonus, 0)
    );
  }

  function calculateRuleSpellAttackBonus({
    proficiencyBonus,
    abilityModifier,
    bonus = 0
  }) {
    return (
      safeNumber(proficiencyBonus, 0) +
      safeNumber(abilityModifier, 0) +
      safeNumber(bonus, 0)
    );
  }

  function calculateRuleCarryingCapacity({
    strength,
    size = "medium"
  }) {
    const multiplier =
      SRD_2014_SIZE_CARRY_MULTIPLIERS[
        String(size || "medium").toLowerCase()
      ] || 1;

    const carryingCapacity =
      Math.max(0, safeNumber(strength, 10)) *
      15 *
      multiplier;

    return {
      carryingCapacity,
      pushDragLift:
        carryingCapacity * 2,
      sizeMultiplier: multiplier
    };
  }

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
    return Math.max(
      0,
      safeNumber(
        character
          ?.combat
          ?.proficiencyBonus,
        getGenericProficiencyBonus(
          character
            ?.classProgression
            ?.totalLevel
        )
      )
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

  function calculateCharacterSavingThrows(
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

  function calculateCharacterPassiveScores(
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
          ),
        advantage:
          state.advantage === true,
        disadvantage:
          state.disadvantage === true
      };

      return result;
    }, {});
  }

  function calculateCharacterInitiative(
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

    return {
      dexterityModifier,
      proficiencyBonus,
      bonus,
      total:
        dexterityModifier +
        proficiencyBonus +
        bonus
    };
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

    if (classEntry.templateSnapshot) {
      return normalizeClassTemplate(
        classEntry.templateSnapshot,
        classEntry.source || "character"
      );
    }

    const classId =
      cleanString(classEntry.classId);

    const className =
      cleanString(classEntry.className);

    const templates = [
      ...DEFAULT_CLASS_TEMPLATES,
      ...(
        Array.isArray(
          creatorState?.roomClassCache
        )
          ? creatorState.roomClassCache
          : []
      )
    ].map((template) => {
      return normalizeClassTemplate(
        template,
        template?.source || "template"
      );
    });

    return (
      templates.find((template) => {
        return template.id === classId;
      }) ||
      templates.find((template) => {
        return (
          template.name.toLowerCase() ===
          className.toLowerCase()
        );
      }) ||
      null
    );
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

  function calculateCharacterHitDice(
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
            1,
            Math.round(
              safeNumber(
                classEntry?.level,
                character
                  ?.classProgression
                  ?.totalLevel || 1
              )
            )
          );

        return {
          classId:
            classEntry.classId ||
            template?.id ||
            "",
          className:
            classEntry.className ||
            template?.name ||
            "Class",
          die:
            template?.hitDie ||
            classEntry.hitDie ||
            "d8",
          count: level
        };
      });
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

  function hpRollRawMatchesLevel(
    rawRecord,
    levelRecord
  ) {
    if (!rawRecord || !levelRecord) {
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
          record.characterLevel ===
          levelRecord.characterLevel
        );
      }) ||
      unusedRecords.find((record) => {
        return (
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
    const records = [];

    getCharacterClassEntries(character)
      .forEach((classEntry) => {
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
          template?.hitDie ||
          classEntry?.hitDie ||
          "d8";

        for (
          let index = 0;
          index < classLevel;
          index += 1
        ) {
          records.push({
            characterLevel:
              records.length + 1,
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
          "Old multiclass rolled HP values were assigned to class levels in class-entry order."
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

  function calculateCharacterHp(
    character
  ) {
    const classEntries =
      getCharacterClassEntries(
        character
      );

    const primaryClass =
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
      template?.hitDie ||
      primaryClass?.hitDie ||
      "d8";

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
        speciesHpBonus;
    } else if (classEntries.length > 1) {
      let characterLevelIndex = 0;

      maximumHp =
        classEntries.reduce(
          (total, classEntry) => {
            const entryTemplate =
              resolveClassTemplateForEntry(
                classEntry
              );

            const entryDieSize =
              getHitDieSize(
                entryTemplate?.hitDie ||
                classEntry?.hitDie ||
                "d8"
              );

            const entryLevel =
              Math.max(
                0,
                Math.round(
                  safeNumber(
                    classEntry?.level,
                    0
                  )
                )
              );

            let classTotal = 0;

            for (
              let index = 0;
              index < entryLevel;
              index += 1
            ) {
              classTotal +=
                characterLevelIndex === 0
                  ? entryDieSize +
                    constitutionModifier
                  : Math.max(
                      1,
                      Math.floor(
                        entryDieSize / 2
                      ) +
                      1 +
                      constitutionModifier
                    );

              characterLevelIndex += 1;
            }

            return total + classTotal;
          },
          0
        ) +
        speciesHpBonus;
    } else {
      maximumHp =
        calculateRuleFixedAverageHp({
          hitDie,
          level,
          constitutionModifier,
          levelOneValue:
            hpCalculation.levelOneValue
        }) +
        speciesHpBonus;
    }

    return {
      mode: hpCalculation.mode,
      maximumHp,
      hitDie,
      level,
      constitutionModifier,
      speciesHpBonus,
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

  function calculateArmorClassOptions(
    character
  ) {
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
      );

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

      if (characterHasClass(character, "barbarian")) {
        addOption(
          "barbarian-unarmored-defense",
          "Barbarian Unarmored Defense",
          10 + dexModifier + conModifier,
          `10 + Dex ${formatSignedNumber(dexModifier)} + Con ${formatSignedNumber(conModifier)}`
        );
      }

      if (
        characterHasClass(character, "monk") &&
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

      if (armorCategory.includes("light")) {
        dexBonus = dexModifier;
        label = "Light Armor";
      } else if (armorCategory.includes("medium")) {
        const cap =
          armor.dexterityCap === null ||
          armor.dexterityCap === undefined
            ? 2
            : safeNumber(
                armor.dexterityCap,
                2
              );
        dexBonus =
          Math.min(dexModifier, cap);
        label = "Medium Armor";
      } else if (armorCategory.includes("heavy")) {
        dexBonus = 0;
        label = "Heavy Armor";
      } else {
        dexBonus = dexModifier;
      }

      addOption(
        `armor:${armor.id}`,
        `${label}: ${armor.name}`,
        base + dexBonus,
        `${base} + Dex ${formatSignedNumber(dexBonus)}`,
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

  function calculateInventoryWeightSummary(
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

  function getContainerSummaries(items = []) {
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

    let abilityId =
      cleanString(item.attackAbility);

    if (!abilityId) {
      if (item.finesse === true) {
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

    return {
      itemId: item.id,
      name: item.name,
      abilityId,
      proficient,
      attackBonus:
        abilityModifier +
        proficiencyBonus +
        magicalAttackBonus,
      damageModifier:
        abilityModifier +
        magicalDamageBonus,
      damageDice:
        cleanString(item.damageDice),
      versatileDamageDice:
        cleanString(item.versatileDamageDice),
      breakdown:
        `${abilityId.toUpperCase()} ${formatSignedNumber(abilityModifier)}${proficient ? ` + proficiency ${formatSignedNumber(proficiencyBonus)}` : ""}${magicalAttackBonus ? ` + magic ${formatSignedNumber(magicalAttackBonus)}` : ""}`
    };
  }

  function calculateEquippedWeaponAttacks(
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

  function getCharacterSpellcastingInfo(
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

        const progression =
          cleanString(
            classEntry?.spellcastingProgression ||
            template?.spellcastingProgression ||
            template?.progressionType,
            "none"
          );

        const spellcastingAbility =
          cleanString(
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
          classId:
            classEntry.classId ||
            template?.id ||
            "",
          className:
            classEntry.className ||
            template?.name ||
            "Class",
          level,
          progressionType: progression,
          spellcastingAbility,
          spellPreparation:
            classEntry?.spellPreparation ||
            template?.spellPreparation ||
            "none",
          cantripsKnown:
            levelData?.cantripsKnown ??
            getProgressionValueByLevel(
              template?.cantripsKnown,
              level,
              0
            ),
          spellsKnown:
            levelData?.spellsKnown ??
            getProgressionValueByLevel(
              template?.spellsKnown,
              level,
              0
            ),
          spellSlots:
            levelData?.spellSlots ||
            getSrd2014SpellSlots(
              progression,
              level
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

  function getSpellcastingSummary(
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

    return {
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

          return {
            ...entry,
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
                  }),
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

  function getSpellSelectionLimits(
    character
  ) {
    const summary =
      getSpellcastingSummary(character);

    const customSpells =
      Array.isArray(
        character?.magic?.customSpells
      )
        ? character.magic.customSpells
        : [];

    const knownIds =
      cleanArray(
        character?.magic?.knownSpellIds
      );

    const preparedIds =
      cleanArray(
        character?.magic?.preparedSpellIds
      );

    const spellById =
      new Map(
        customSpells.map((spell) => {
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
          knownIds,
          (level) => level === 0
        ),
      knownLeveledCount:
        countByLevel(
          knownIds,
          (level) => level > 0
        ),
      preparedCount:
        preparedIds.length,
      knownIds,
      preparedIds
    };
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
      spell?.spellcastingSourceId ||
      spell?.classId
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

    if (!sourceId) {
      return spellcasters.length === 1
        ? spellcasters[0]
        : null;
    }

    return (
      spellcasters.find((entry) => {
        return (
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

    if (!spellcasters.length) {
      return "";
    }

    const sourceId =
      getSpellSourceId(spell);

    if (
      spellcasters.length > 1 &&
      !sourceId
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

    if (
      spellLevel > 0 &&
      spellLevel >
        safeNumber(entry.maxSpellLevel, 0) &&
      spell?.manualOverride !== true
    ) {
      return `${spell?.name || "A spell"} is above ${entry.className || "its class"}'s available spell level.`;
    }

    return "";
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
      const featureNames = [
        ...(featuresByLevel[level] || [])
      ];

      if (
        asiLevels.includes(level) &&
        !featureNames.includes(
          "Ability Score Improvement"
        )
      ) {
        featureNames.push(
          "Ability Score Improvement"
        );
      }

      levels[level] = {
        proficiencyBonus:
          getGenericProficiencyBonus(level),
        features:
          featureNames.map((name) => {
            return createSrdFeature(
              classId,
              level,
              name
            );
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

  function runSrd2014RulesSelfTests() {
    const results = [];

    const record = (
      name,
      actual,
      expected
    ) => {
      const pass =
        JSON.stringify(actual) ===
        JSON.stringify(expected);

      results.push({
        name,
        pass,
        actual,
        expected
      });
    };

    record(
      "Ability modifier 8",
      calculateAbilityModifier(8),
      -1
    );

    record(
      "Ability modifier 10",
      calculateAbilityModifier(10),
      0
    );

    record(
      "Ability modifier 15",
      calculateAbilityModifier(15),
      2
    );

    record(
      "Ability modifier 20",
      calculateAbilityModifier(20),
      5
    );

    record(
      "Proficiency bonus levels",
      [1, 5, 9, 13, 17].map(
        getGenericProficiencyBonus
      ),
      [2, 3, 4, 5, 6]
    );

    record(
      "Skill proficiency and expertise",
      [
        calculateRuleSkillModifier({
          abilityModifier: 2,
          proficiencyBonus: 3,
          proficient: true
        }),
        calculateRuleSkillModifier({
          abilityModifier: 2,
          proficiencyBonus: 3,
          proficient: true,
          expertise: true
        })
      ],
      [5, 8]
    );

    record(
      "Passive Perception",
      calculateRulePassiveScore(5),
      15
    );

    record(
      "Level 1 Fighter HP Con 14",
      calculateRuleFixedAverageHp({
        hitDie: "d10",
        level: 1,
        constitutionModifier: 2
      }),
      12
    );

    record(
      "Level 1 Wizard HP Con 14",
      calculateRuleFixedAverageHp({
        hitDie: "d6",
        level: 1,
        constitutionModifier: 2
      }),
      8
    );

    record(
      "Full caster level 5 slots",
      getSrd2014SpellSlots(
        "full-caster",
        5
      ),
      { 1: 4, 2: 3, 3: 2 }
    );

    record(
      "Half caster level 5 slots",
      getSrd2014SpellSlots(
        "half-caster",
        5
      ),
      { 1: 4, 2: 2 }
    );

    record(
      "Warlock pact magic level 5",
      getSrd2014PactMagic(5),
      { slots: 2, slotLevel: 3 }
    );

    record(
      "Multiclass slots keep pact magic separate",
      calculateSrd2014MulticlassSpellcasting([
        {
          level: 3,
          spellcastingProgression: "full-caster"
        },
        {
          level: 2,
          spellcastingProgression: "half-caster"
        },
        {
          level: 5,
          spellcastingProgression: "pact-magic"
        }
      ]),
      {
        casterLevel: 4,
        spellSlots: { 1: 4, 2: 3 },
        pactMagic: [{ slots: 2, slotLevel: 3 }]
      }
    );

    record(
      "Spell save and attack",
      {
        dc: calculateRuleSpellSaveDc({
          proficiencyBonus: 3,
          abilityModifier: 4
        }),
        attack: calculateRuleSpellAttackBonus({
          proficiencyBonus: 3,
          abilityModifier: 4
        })
      },
      { dc: 15, attack: 7 }
    );

    record(
      "Medium carrying capacity Strength 10",
      calculateRuleCarryingCapacity({
        strength: 10,
        size: "medium"
      }).carryingCapacity,
      150
    );

    record(
      "Large carrying capacity Strength 18",
      calculateRuleCarryingCapacity({
        strength: 18,
        size: "large"
      }),
      {
        carryingCapacity: 540,
        pushDragLift: 1080,
        sizeMultiplier: 2
      }
    );

    record(
      "Saving throw helper adds proficiency",
      calculateRuleSavingThrowModifier({
        abilityModifier: 3,
        proficiencyBonus: 2,
        proficient: true
      }),
      5
    );

    record(
      "Saving throw helper adds flat bonus",
      calculateRuleSavingThrowModifier({
        abilityModifier: -1,
        proficiencyBonus: 4,
        proficient: true,
        bonus: 2
      }),
      5
    );

    record(
      "Passive advantage and disadvantage cancel",
      calculateRulePassiveScore(
        4,
        {
          advantage: true,
          disadvantage: true
        }
      ),
      14
    );

    record(
      "Fixed HP respects level one override",
      calculateRuleFixedAverageHp({
        hitDie: "d8",
        level: 3,
        constitutionModifier: 2,
        levelOneValue: 9
      }),
      23
    );

    record(
      "Rolled HP uses supplied rolls",
      calculateRuleRolledHp({
        hitDie: "d10",
        level: 4,
        constitutionModifier: 2,
        rolls: [5, 6, 7]
      }),
      36
    );

    record(
      "Manual HP clamps to at least one",
      calculateRuleManualHp({
        manualOverride: 0
      }),
      1
    );

    record(
      "Normalize manual HP fallback",
      normalizeHpCalculation(
        { mode: "manual" },
        18
      ).manualOverride,
      18
    );

    const fighterTemplate =
      DEFAULT_CLASS_TEMPLATES.find(
        (template) => {
          return template.id === "fighter";
        }
      );

    const fighterCharacter =
      createEmptyCharacter();

    fighterCharacter.abilities.scores = {
      str: 16,
      dex: 14,
      con: 14,
      int: 10,
      wis: 12,
      cha: 8
    };

    fighterCharacter.identity.size =
      "medium";

    fighterCharacter.classProgression.totalLevel = 3;

    fighterCharacter.classProgression.classes = [
      {
        classId: "fighter",
        className: "Fighter",
        level: 3,
        templateSnapshot:
          fighterTemplate
      }
    ];

    fighterCharacter.proficiencies.savingThrows = [
      "Strength",
      "Constitution"
    ];

    fighterCharacter.proficiencies.weapons = [
      "Simple weapons",
      "Martial weapons"
    ];

    fighterCharacter.proficiencies.skills = {
      perception: {
        proficient: true,
        expertise: false,
        source: ["class"]
      },
      stealth: {
        proficient: true,
        expertise: true,
        source: ["manual"]
      }
    };

    fighterCharacter.proficiencies.passiveState = {
      perception: {
        advantage: true
      }
    };

    fighterCharacter.combat.proficiencyBonus = 2;
    fighterCharacter.combat.initiativeBonus = 1;
    fighterCharacter.combat.initiativeProficient = true;
    fighterCharacter.combat.hpCalculation = {
      mode: "fixed",
      levelOneValue: null,
      laterLevelValues: [],
      manualOverride: null,
      lastCalculatedConModifier: 2
    };

    record(
      "Character proficiency from level",
      getCharacterProficiencyBonus(
        fighterCharacter
      ),
      2
    );

    record(
      "Character saving throw totals",
      calculateCharacterSavingThrows(
        fighterCharacter
      )
        .filter((save) => {
          return [
            "str",
            "dex",
            "con"
          ].includes(save.id);
        })
        .map((save) => {
          return save.total;
        }),
      [5, 2, 4]
    );

    record(
      "Character skill modifier with expertise",
      calculateCharacterSkillModifier(
        fighterCharacter,
        SKILL_DEFINITIONS.find((skill) => {
          return skill.id === "stealth";
        })
      ),
      6
    );

    record(
      "Character passive perception with advantage",
      calculateCharacterPassiveScores(
        fighterCharacter
      ).perception.total,
      18
    );

    record(
      "Character initiative with proficiency",
      calculateCharacterInitiative(
        fighterCharacter
      ),
      {
        dexterityModifier: 2,
        proficiencyBonus: 2,
        bonus: 1,
        total: 5
      }
    );

    record(
      "Character fixed HP summary",
      calculateCharacterHp(
        fighterCharacter
      ).maximumHp,
      28
    );

    record(
      "Character hit dice summary",
      calculateCharacterHitDice(
        fighterCharacter
      ).map((entry) => {
        return {
          die: entry.die,
          count: entry.count
        };
      }),
      [{ die: "d10", count: 3 }]
    );

    record(
      "Unarmored armor class",
      calculateArmorClassOptions(
        fighterCharacter
      ).selected.total,
      12
    );

    const armoredCharacter =
      cloneData(fighterCharacter);

    armoredCharacter.equipment.items = [
      normalizeSection15Item({
        id: "studded",
        name: "Studded Leather",
        category: "armor",
        equipped: true,
        armorCategory: "light armor",
        baseArmorClass: 12,
        magicalArmorClassBonus: 1
      }),
      normalizeSection15Item({
        id: "shield",
        name: "Shield",
        category: "shield",
        equipped: true,
        isShield: true,
        magicalArmorClassBonus: 1
      })
    ];

    record(
      "Armor class with magic armor and shield",
      calculateArmorClassOptions(
        armoredCharacter
      ).selected.total,
      18
    );

    const barbarianCharacter =
      cloneData(fighterCharacter);

    barbarianCharacter.classProgression.classes = [
      {
        classId: "barbarian",
        className: "Barbarian",
        level: 3,
        templateSnapshot:
          DEFAULT_CLASS_TEMPLATES.find(
            (template) => {
              return template.id === "barbarian";
            }
          )
      }
    ];

    barbarianCharacter.abilities.scores.dex = 16;
    barbarianCharacter.abilities.scores.con = 16;

    record(
      "Barbarian unarmored defense",
      calculateArmorClassOptions(
        barbarianCharacter
      ).selected.total,
      16
    );

    const monkCharacter =
      cloneData(fighterCharacter);

    monkCharacter.classProgression.classes = [
      {
        classId: "monk",
        className: "Monk",
        level: 3,
        templateSnapshot:
          DEFAULT_CLASS_TEMPLATES.find(
            (template) => {
              return template.id === "monk";
            }
          )
      }
    ];

    monkCharacter.abilities.scores.dex = 16;
    monkCharacter.abilities.scores.wis = 14;

    record(
      "Monk unarmored defense",
      calculateArmorClassOptions(
        monkCharacter
      ).selected.total,
      15
    );

    const weaponCharacter =
      cloneData(fighterCharacter);

    weaponCharacter.equipment.items = [
      normalizeSection15Item({
        id: "shortsword",
        name: "Shortsword",
        category: "weapon",
        equipped: true,
        weaponType: "martial melee",
        finesse: true,
        damageDice: "1d6",
        magicalBonus: 1
      }),
      normalizeSection15Item({
        id: "bow",
        name: "Shortbow",
        category: "weapon",
        equipped: true,
        weaponType: "simple ranged",
        ranged: true,
        damageDice: "1d6"
      })
    ];

    weaponCharacter.abilities.scores.dex = 18;

    record(
      "Weapon attack uses finesse and magic",
      calculateWeaponAttack(
        weaponCharacter,
        weaponCharacter.equipment.items[0]
      ),
      {
        itemId: "shortsword",
        name: "Shortsword",
        abilityId: "dex",
        proficient: true,
        attackBonus: 7,
        damageModifier: 5,
        damageDice: "1d6",
        versatileDamageDice: "",
        breakdown:
          "DEX +4 + proficiency +2 + magic +1"
      }
    );

    record(
      "Equipped weapon attacks count",
      calculateEquippedWeaponAttacks(
        weaponCharacter
      ).length,
      2
    );

    const inventoryItems = [
      normalizeSection15Item({
        id: "pack",
        name: "Pack",
        quantity: 1,
        weight: 5,
        isContainer: true,
        capacityWeight: 10
      }),
      normalizeSection15Item({
        id: "rope",
        name: "Rope",
        quantity: 2,
        weight: 5,
        containerId: "pack"
      }),
      normalizeSection15Item({
        id: "mystery",
        name: "Mystery Box",
        weight: null,
        containerId: "pack"
      })
    ];

    record(
      "Inventory known and unknown weight",
      calculateInventoryWeightSummary(
        inventoryItems
      ),
      {
        knownWeight: 15,
        unknownCount: 1
      }
    );

    record(
      "Container summary detects uncertainty",
      getContainerSummaries(
        inventoryItems
      ).map((container) => {
        return {
          knownWeight:
            container.knownWeight,
          unknownCount:
            container.unknownCount,
          uncertain:
            container.uncertain
        };
      }),
      [
        {
          knownWeight: 10,
          unknownCount: 1,
          uncertain: true
        }
      ]
    );

    record(
      "Container validation detects over capacity",
      validateContainerState([
        normalizeSection15Item({
          id: "bag",
          name: "Bag",
          isContainer: true,
          capacityWeight: 4
        }),
        normalizeSection15Item({
          id: "rock",
          name: "Rock",
          weight: 5,
          containerId: "bag"
        })
      ]),
      ["Bag is over capacity."]
    );

    record(
      "Container cycle detection",
      wouldCreateContainerCycle(
        [
          { id: "a", containerId: "b" },
          { id: "b", containerId: "" }
        ],
        "b",
        "a"
      ),
      true
    );

    record(
      "Split inventory stack",
      splitInventoryStack(
        [
          {
            id: "arrow",
            name: "Arrow",
            quantity: 20,
            containerId: ""
          }
        ],
        "arrow",
        5,
        "quiver"
      ).map((item) => {
        return {
          quantity: item.quantity,
          containerId: item.containerId
        };
      }),
      [
        {
          quantity: 15,
          containerId: ""
        },
        {
          quantity: 5,
          containerId: "quiver"
        }
      ]
    );

    record(
      "Removing container preserves contents",
      removeContainerPreserveContents(
        inventoryItems,
        "pack"
      ).map((item) => {
        return {
          id: item.id,
          containerId: item.containerId
        };
      }),
      [
        {
          id: "rope",
          containerId: ""
        },
        {
          id: "mystery",
          containerId: ""
        }
      ]
    );

    const clericTemplate =
      DEFAULT_CLASS_TEMPLATES.find(
        (template) => {
          return template.id === "cleric";
        }
      );

    const clericCharacter =
      createEmptyCharacter();

    clericCharacter.abilities.scores = {
      str: 10,
      dex: 10,
      con: 12,
      int: 10,
      wis: 16,
      cha: 8
    };

    clericCharacter.classProgression.totalLevel = 5;
    clericCharacter.combat.proficiencyBonus = 3;
    clericCharacter.classProgression.classes = [
      {
        classId: "cleric",
        className: "Cleric",
        level: 5,
        templateSnapshot:
          clericTemplate
      }
    ];

    record(
      "Spellcasting summary cleric DC",
      getSpellcastingSummary(
        clericCharacter
      ).classes[0].spellSaveDc,
      14
    );

    record(
      "Spellcasting summary cleric attack",
      getSpellcastingSummary(
        clericCharacter
      ).classes[0].spellAttackBonus,
      6
    );

    record(
      "Prepared spell limit cleric",
      getSpellcastingSummary(
        clericCharacter
      ).classes[0].preparedLimit,
      8
    );

    record(
      "Cleric level 5 slot summary",
      getSpellcastingSummary(
        clericCharacter
      ).classes[0].spellSlots,
      { 1: 4, 2: 3, 3: 2 }
    );

    record(
      "Third caster level 7 slots",
      getSrd2014SpellSlots(
        "third-caster",
        7
      ),
      { 1: 4, 2: 2 }
    );

    record(
      "Half caster level 1 has no slots",
      getSrd2014SpellSlots(
        "half-caster",
        1
      ),
      {}
    );

    const multiclassCaster =
      createEmptyCharacter();

    multiclassCaster.abilities.scores = {
      str: 10,
      dex: 10,
      con: 12,
      int: 16,
      wis: 10,
      cha: 14
    };

    multiclassCaster.classProgression.totalLevel = 12;
    multiclassCaster.classProgression.classes = [
      {
        classId: "wizard",
        className: "Wizard",
        level: 3,
        templateSnapshot:
          DEFAULT_CLASS_TEMPLATES.find(
            (template) => {
              return template.id === "wizard";
            }
          )
      },
      {
        classId: "paladin",
        className: "Paladin",
        level: 4,
        templateSnapshot:
          DEFAULT_CLASS_TEMPLATES.find(
            (template) => {
              return template.id === "paladin";
            }
          )
      },
      {
        classId: "warlock",
        className: "Warlock",
        level: 5,
        templateSnapshot:
          DEFAULT_CLASS_TEMPLATES.find(
            (template) => {
              return template.id === "warlock";
            }
          )
      }
    ];

    record(
      "Multiclass spellcasting summary",
      getSpellcastingSummary(
        multiclassCaster
      ).multiclass,
      {
        casterLevel: 5,
        spellSlots: { 1: 4, 2: 3, 3: 2 },
        pactMagic: [{ slots: 2, slotLevel: 3 }]
      }
    );

    record(
      "Paladin prepared spell limit",
      getPreparedSpellLimit(
        multiclassCaster,
        {
          classId: "paladin",
          level: 5,
          spellcastingAbility: "cha"
        }
      ),
      4
    );

    const lightArmorCharacter =
      cloneData(fighterCharacter);

    lightArmorCharacter.equipment.items = [
      normalizeSection15Item({
        id: "leather",
        name: "Leather",
        category: "armor",
        equipped: true,
        armorCategory: "light armor",
        baseArmorClass: 11
      })
    ];

    record(
      "Light armor AC",
      calculateArmorClassOptions(
        lightArmorCharacter
      ).selected.total,
      13
    );

    const mediumArmorCharacter =
      cloneData(fighterCharacter);

    mediumArmorCharacter.abilities.scores.dex = 18;
    mediumArmorCharacter.equipment.items = [
      normalizeSection15Item({
        id: "scale",
        name: "Scale Mail",
        category: "armor",
        equipped: true,
        armorCategory: "medium armor",
        baseArmorClass: 14,
        dexterityCap: 2
      })
    ];

    record(
      "Medium armor Dexterity cap",
      calculateArmorClassOptions(
        mediumArmorCharacter
      ).selected.total,
      16
    );

    const heavyArmorCharacter =
      cloneData(fighterCharacter);

    heavyArmorCharacter.abilities.scores.dex = 18;
    heavyArmorCharacter.equipment.items = [
      normalizeSection15Item({
        id: "chain",
        name: "Chain Mail",
        category: "armor",
        equipped: true,
        armorCategory: "heavy armor",
        baseArmorClass: 16
      })
    ];

    record(
      "Heavy armor ignores Dexterity",
      calculateArmorClassOptions(
        heavyArmorCharacter
      ).selected.total,
      16
    );

    const shieldOnlyCharacter =
      cloneData(fighterCharacter);

    shieldOnlyCharacter.equipment.items = [
      normalizeSection15Item({
        id: "shield",
        name: "Shield",
        category: "shield",
        equipped: true,
        isShield: true
      })
    ];

    record(
      "Shield bonus",
      calculateArmorClassOptions(
        shieldOnlyCharacter
      ).selected.total,
      14
    );

    record(
      "Armor prevents monk unarmored formula",
      calculateArmorClassOptions({
        ...monkCharacter,
        equipment: {
          items: [
            normalizeSection15Item({
              id: "leather",
              name: "Leather",
              category: "armor",
              equipped: true,
              armorCategory: "light armor",
              baseArmorClass: 11
            })
          ]
        }
      }).options.some((option) => {
        return (
          option.id ===
          "monk-unarmored-defense"
        );
      }),
      false
    );

    const spellLimitCharacter =
      cloneData(clericCharacter);

    spellLimitCharacter.magic.customSpells = [
      normalizeSection16Spell({
        id: "guidance",
        name: "Guidance",
        level: 0
      }),
      normalizeSection16Spell({
        id: "light",
        name: "Light",
        level: 0
      }),
      normalizeSection16Spell({
        id: "bless",
        name: "Bless",
        level: 1
      })
    ];

    spellLimitCharacter.magic.knownSpellIds = [
      "guidance",
      "light",
      "bless"
    ];

    spellLimitCharacter.magic.preparedSpellIds = [
      "bless"
    ];

    record(
      "Spell selection limits",
      {
        cantrips:
          getSpellSelectionLimits(
            spellLimitCharacter
          ).cantripsKnownLimit,
        knownCantrips:
          getSpellSelectionLimits(
            spellLimitCharacter
          ).knownCantripCount,
        prepared:
          getSpellSelectionLimits(
            spellLimitCharacter
          ).preparedCount,
        maxLevel:
          getSpellSelectionLimits(
            spellLimitCharacter
          ).maxSpellLevel
      },
      {
        cantrips: 4,
        knownCantrips: 2,
        prepared: 1,
        maxLevel: 3
      }
    );

    record(
      "Mundane item cannot stay attuned",
      normalizeSection15Item({
        id: "pack",
        name: "Pack",
        isMagical: false,
        requiresAttunement: true,
        attuned: true
      }).attuned,
      false
    );

    creatorState.draft.equipment.items = [
      normalizeSection15Item({
        id: "a",
        name: "Ring A",
        category: "magic-item",
        isMagical: true,
        requiresAttunement: true,
        attuned: true
      }),
      normalizeSection15Item({
        id: "b",
        name: "Ring B",
        category: "magic-item",
        isMagical: true,
        requiresAttunement: true,
        attuned: true
      }),
      normalizeSection15Item({
        id: "c",
        name: "Ring C",
        category: "magic-item",
        isMagical: true,
        requiresAttunement: true,
        attuned: true
      })
    ];

    record(
      "Three-item attunement count",
      getSection15AttunedItemCount(),
      3
    );

    creatorState.draft.equipment.items = [
      normalizeSection15Item({
        id: "bag",
        name: "Bag",
        isContainer: true,
        capacityWeight: 100
      }),
      normalizeSection15Item({
        id: "arrows",
        name: "Arrows",
        quantity: 10,
        weight: 0.05
      })
    ];

    moveSection15ItemToContainer(
      1,
      "bag",
      4
    );

    record(
      "Container move splits stack",
      creatorState.draft.equipment.items
        .map((item) => {
          return {
            id: item.id === "arrows"
              ? "arrows"
              : item.id === "bag"
                ? "bag"
                : "split",
            quantity: item.quantity,
            containerId: item.containerId
          };
        }),
      [
        {
          id: "bag",
          quantity: 1,
          containerId: ""
        },
        {
          id: "arrows",
          quantity: 6,
          containerId: ""
        },
        {
          id: "split",
          quantity: 4,
          containerId: "bag"
        }
      ]
    );

    creatorState.draft.equipment.items = [
      normalizeSection15Item({
        id: "pouch",
        name: "Pouch",
        isContainer: true
      }),
      normalizeSection15Item({
        id: "coin",
        name: "Coin",
        containerId: "pouch"
      })
    ];

    record(
      "Container removal waits for explicit choice",
      removeSection15Item(0),
      "pending"
    );

    removeSection15Item(
      0,
      "inventory"
    );

    record(
      "Container removal moves contents to inventory by choice",
      creatorState.draft.equipment.items
        .map((item) => {
          return {
            id: item.id,
            containerId: item.containerId
          };
        }),
      [
        {
          id: "coin",
          containerId: ""
        }
      ]
    );

    record(
      "All core 2014 species are present",
      [
        "human",
        "dwarf",
        "elf",
        "halfling",
        "dragonborn",
        "gnome",
        "half-elf",
        "half-orc",
        "tiefling"
      ].every((speciesId) => {
        return DEFAULT_SPECIES_TEMPLATES
          .some((species) => {
            return species.id === speciesId;
          });
      }),
      true
    );

    record(
      "Custom Species preset card is absent",
      DEFAULT_SPECIES_TEMPLATES
        .some((species) => {
          return species.id === "custom-species";
        }),
      false
    );

    record(
      "Custom Background preset card is absent",
      DEFAULT_BACKGROUND_TEMPLATES
        .some((background) => {
          return background.id ===
            "custom-background";
        }),
      false
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSpeciesFromTemplate("dwarf");

    record(
      "Species bonuses apply by scoped source",
      {
        con:
          creatorState.draft
            .abilities
            .bonuses
            .con,
        source:
          creatorState.draft
            .abilities
            .bonusSources
            ["species:dwarf"]
            ?.con || 0
      },
      {
        con: 2,
        source: 2
      }
    );

    chooseSpeciesFromTemplate("human");

    record(
      "Changing species removes old scoped source",
      Boolean(
        creatorState.draft
          .abilities
          .bonusSources
          ["species:dwarf"]
      ),
      false
    );

    const importedFinalScores =
      normalizeCharacter({
        abilities: {
          scores: {
            str: 17,
            dex: 10,
            con: 10,
            int: 10,
            wis: 10,
            cha: 10
          },
          bonusSources: {
            "species:test": {
              str: 2
            }
          }
        }
      });

    record(
      "Import derives base scores from final scores and bonuses",
      {
        base:
          importedFinalScores
            .abilities
            .base
            .str,
        bonus:
          importedFinalScores
            .abilities
            .bonuses
            .str,
        final:
          importedFinalScores
            .abilities
            .scores
            .str
      },
      {
        base: 15,
        bonus: 2,
        final: 17
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    setAbilityBonusSource(
      "species:test",
      {
        str: 2
      }
    );

    setAbilityScore("str", 15);

    record(
      "Manual ability edit writes base and recalculates final",
      {
        base:
          creatorState.draft
            .abilities
            .base
            .str,
        bonus:
          creatorState.draft
            .abilities
            .bonuses
            .str,
        final:
          creatorState.draft
            .abilities
            .scores
            .str
      },
      {
        base: 15,
        bonus: 2,
        final: 17
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    setAbilityBonusSource(
      "species:test",
      {
        str: 2
      }
    );

    applySection13Scores({
      str: 15,
      dex: 8,
      con: 8,
      int: 8,
      wis: 8,
      cha: 8
    });

    creatorState.draft
      .abilities
      .method = "point-buy";

    record(
      "Point buy uses base scores for cost",
      {
        spent:
          getSection13PointBuySpent(),
        base:
          getSection13BaseAbilityScore(
            "str"
          ),
        final:
          getSection13AbilityScore(
            "str"
          )
      },
      {
        spent: 9,
        base: 15,
        final: 17
      }
    );

    record(
      "Ability screen labels base bonus and final separately",
      [
        "Base Score",
        "Species/Other Bonuses",
        "Final Score"
      ].every((label) => {
        return renderSection13AbilitySummary()
          .includes(label);
      }),
      true
    );

    const noncasterCharacter =
      createEmptyCharacter();

    noncasterCharacter.classProgression.totalLevel = 1;
    noncasterCharacter.classProgression.classes = [
      {
        classId: "barbarian",
        className: "Barbarian",
        level: 1,
        templateSnapshot:
          DEFAULT_CLASS_TEMPLATES.find(
            (template) => {
              return template.id === "barbarian";
            }
          )
      }
    ];

    record(
      "Noncaster Spells step is complete",
      isSection17SpellsComplete(
        noncasterCharacter
      ),
      true
    );

    const wizardCharacter =
      createEmptyCharacter();

    wizardCharacter.classProgression.totalLevel = 1;
    wizardCharacter.classProgression.classes = [
      {
        classId: "wizard",
        className: "Wizard",
        level: 1,
        templateSnapshot:
          DEFAULT_CLASS_TEMPLATES.find(
            (template) => {
              return template.id === "wizard";
            }
          )
      }
    ];

    record(
      "Spellcaster needs required spell choices",
      isSection17SpellsComplete(
        wizardCharacter
      ),
      false
    );

    creatorState.draft =
      createEmptyCharacter();

    record(
      "Expertise requires proficiency",
      toggleSection14Expertise("arcana"),
      false
    );

    const fighterWizard =
      createEmptyCharacter();

    fighterWizard.abilities.scores.con = 14;
    fighterWizard.classProgression.totalLevel = 5;
    fighterWizard.classProgression.classes = [
      {
        classId: "fighter",
        className: "Fighter",
        level: 3,
        templateSnapshot:
          DEFAULT_CLASS_TEMPLATES.find(
            (template) => {
              return template.id === "fighter";
            }
          )
      },
      {
        classId: "wizard",
        className: "Wizard",
        level: 2,
        templateSnapshot:
          DEFAULT_CLASS_TEMPLATES.find(
            (template) => {
              return template.id === "wizard";
            }
          )
      }
    ];

    record(
      "Fighter 3 Wizard 2 multiclass HP",
      calculateCharacterHp(
        fighterWizard
      ).maximumHp,
      40
    );

    record(
      "Multiclass hit dice stay separate",
      calculateCharacterHitDice(
        fighterWizard
      ).map((entry) => {
        return {
          die: entry.die,
          count: entry.count
        };
      }),
      [
        { die: "d10", count: 3 },
        { die: "d6", count: 2 }
      ]
    );

    const twoShieldCharacter =
      cloneData(fighterCharacter);

    twoShieldCharacter.equipment.items = [
      normalizeSection15Item({
        id: "shield-a",
        name: "Shield A",
        category: "shield",
        isShield: true,
        equipped: true
      }),
      normalizeSection15Item({
        id: "shield-b",
        name: "Shield B",
        category: "shield",
        isShield: true,
        equipped: true
      })
    ];

    record(
      "Two shields do not stack",
      calculateArmorClassOptions(
        twoShieldCharacter
      ).selected.total,
      14
    );

    const magicWeaponNoAc =
      cloneData(fighterCharacter);

    magicWeaponNoAc.equipment.items = [
      normalizeSection15Item({
        id: "magic-sword",
        name: "Magic Sword",
        category: "weapon",
        weaponType: "martial melee",
        damageDice: "1d8",
        magicalBonus: 1,
        equipped: true
      })
    ];

    record(
      "+1 weapon does not grant AC",
      calculateArmorClassOptions(
        magicWeaponNoAc
      ).selected.total,
      12
    );

    creatorState.draft =
      createEmptyCharacter();

    creatorState.draft.equipment.items = [
      normalizeSection15Item({
        id: "mail",
        name: "Chain Mail",
        category: "armor",
        armorCategory: "heavy armor",
        baseArmorClass: 16,
        equipped: true
      }),
      normalizeSection15Item({
        id: "pack",
        name: "Pack",
        isContainer: true,
        capacityWeight: 30
      })
    ];

    moveSection15ItemToContainer(
      0,
      "pack",
      1
    );

    record(
      "Moving equipped armor into backpack unequips it",
      {
        equipped:
          creatorState.draft
            .equipment
            .items[0]
            .equipped,
        containerId:
          creatorState.draft
            .equipment
            .items[0]
            .containerId
      },
      {
        equipped: false,
        containerId: "pack"
      }
    );

    record(
      "Recursive nested-container weight",
      getContainerSummaries([
        normalizeSection15Item({
          id: "backpack",
          name: "Backpack",
          isContainer: true,
          weight: 5
        }),
        normalizeSection15Item({
          id: "pouch",
          name: "Pouch",
          isContainer: true,
          weight: 1,
          containerId: "backpack"
        }),
        normalizeSection15Item({
          id: "coins",
          name: "Coins",
          weight: 10,
          containerId: "pouch"
        })
      ])[0].knownWeight,
      11
    );

    record(
      "Missing container import repair",
      normalizeCharacter({
        equipment: {
          items: [
            {
              id: "gem",
              name: "Gem",
              containerId: "missing"
            }
          ]
        }
      }).equipment.items[0].containerId,
      ""
    );

    const warningTextFor = (character) => {
      return cleanArray(
        character
          ?.builder
          ?.validation
          ?.migrationWarnings
      ).join("\n");
    };

    const rawEquipmentWarningCharacter =
      normalizeCharacter({
        equipment: {
          items: [
            {
              id: "pack",
              name: "Backpack",
              isContainer: true,
              equipped: true
            },
            {
              id: "ring",
              name: "Ring of Testing",
              category: "magic-item",
              isMagical: true,
              requiresAttunement: true,
              equipped: true,
              attuned: true,
              containerId: "pack"
            },
            {
              id: "gem",
              name: "Gem",
              containerId: "missing"
            }
          ]
        }
      });

    record(
      "Container import migration warnings are recorded before repair",
      {
        equippedContainer:
          warningTextFor(
            rawEquipmentWarningCharacter
          ).includes(
            "equipped container"
          ),
        equippedContained:
          warningTextFor(
            rawEquipmentWarningCharacter
          ).includes(
            "equipped while stored"
          ),
        attunedContained:
          warningTextFor(
            rawEquipmentWarningCharacter
          ).includes(
            "attuned while stored"
          ),
        missingContainer:
          warningTextFor(
            rawEquipmentWarningCharacter
          ).includes(
            "referenced missing container"
          )
      },
      {
        equippedContainer: true,
        equippedContained: true,
        attunedContained: true,
        missingContainer: true
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    creatorState.showContainedItems = false;
    creatorState.openContainerId = "";
    creatorState.draft.equipment.items = [
      normalizeSection15Item({
        id: "panel-pack",
        name: "Panel Test Pack",
        isContainer: true
      }),
      normalizeSection15Item({
        id: "panel-coin",
        name: "Hidden Test Coin",
        containerId: "panel-pack"
      })
    ];

    record(
      "Contained inventory hides from main list by default",
      renderSection15Inventory()
        .includes("Hidden Test Coin"),
      false
    );

    creatorState.showContainedItems = true;

    record(
      "Contained inventory can show in main list",
      renderSection15Inventory()
        .includes("Hidden Test Coin"),
      true
    );

    creatorState.openContainerId =
      "panel-pack";

    record(
      "Open backpack panel lists contents",
      renderSection15OpenContainerPanel()
        .includes("Hidden Test Coin"),
      true
    );

    moveSection15ItemToContainer(
      1,
      "",
      null
    );

    record(
      "Moving item out of backpack clears container",
      creatorState.draft
        .equipment
        .items[1]
        .containerId,
      ""
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSpeciesFromTemplate(
      "dragonborn"
    );

    creatorState.draft
      .species
      .choices
      .draconicAncestry = "red";

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

    record(
      "Dragonborn ancestry applies choice mechanics",
      {
        complete:
          isSection17SpeciesComplete(
            creatorState.draft
          ),
        resistance:
          creatorState.draft
            .species
            .damageResistances[0],
        trait:
          creatorState.draft
            .features
            .speciesTraits
            .some((trait) => {
              return trait.name ===
                "Red Dragon Ancestry";
            })
      },
      {
        complete: true,
        resistance: "Fire",
        trait: true
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSpeciesFromTemplate(
      "half-elf"
    );

    creatorState.draft
      .species
      .choices
      .halfElfAbilityOne = "dex";

    creatorState.draft
      .species
      .choices
      .halfElfAbilityTwo = "con";

    creatorState.draft
      .species
      .choices
      .halfElfSkillOne = "perception";

    creatorState.draft
      .species
      .choices
      .halfElfSkillTwo = "stealth";

    creatorState.draft
      .species
      .choices
      .halfElfLanguage = "Dwarvish";

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

    record(
      "Half-Elf flexible bonuses apply",
      {
        complete:
          isSection17SpeciesComplete(
            creatorState.draft
          ),
        cha:
          creatorState.draft
            .abilities
            .bonuses
            .cha,
        dex:
          creatorState.draft
            .abilities
            .bonuses
            .dex,
        con:
          creatorState.draft
            .abilities
            .bonuses
            .con
      },
      {
        complete: true,
        cha: 2,
        dex: 1,
        con: 1
      }
    );

    const multiclassSpellSourceCharacter =
      createEmptyCharacter();

    multiclassSpellSourceCharacter
      .abilities
      .scores
      .int = 16;

    multiclassSpellSourceCharacter
      .abilities
      .scores
      .wis = 16;

    multiclassSpellSourceCharacter
      .combat
      .proficiencyBonus = 2;

    multiclassSpellSourceCharacter
      .classProgression
      .totalLevel = 4;

    multiclassSpellSourceCharacter
      .classProgression
      .classes = [
        {
          classId: "wizard",
          className: "Wizard",
          level: 1,
          templateSnapshot:
            DEFAULT_CLASS_TEMPLATES.find(
              (template) => {
                return template.id ===
                  "wizard";
              }
            )
        },
        {
          classId: "cleric",
          className: "Cleric",
          level: 3,
          templateSnapshot:
            DEFAULT_CLASS_TEMPLATES.find(
              (template) => {
                return template.id ===
                  "cleric";
              }
            )
        }
      ];

    const ownerlessSpell =
      normalizeSection16Spell({
        id: "ownerless-spell",
        name: "Ownerless Spell",
        level: 1
      });

    const tooHighWizardSpell =
      normalizeSection16Spell({
        id: "too-high",
        name: "Too High",
        level: 3,
        classId: "wizard"
      });

    const sourcedClericSpell =
      normalizeSection16Spell({
        id: "sourced-cleric",
        name: "Sourced Cleric",
        level: 1,
        classId: "cleric"
      });

    record(
      "Multiclass spell without source warns",
      getSpellSourceWarning(
        multiclassSpellSourceCharacter,
        ownerlessSpell
      ),
      "Ownerless Spell needs a class source."
    );

    record(
      "Spell source validates class level",
      getSpellSourceWarning(
        multiclassSpellSourceCharacter,
        tooHighWizardSpell
      ),
      "Too High is above Wizard's available spell level."
    );

    record(
      "Valid sourced spell has no source warning",
      getSpellSourceWarning(
        multiclassSpellSourceCharacter,
        sourcedClericSpell
      ),
      ""
    );

    creatorState.draft =
      cloneData(
        multiclassSpellSourceCharacter
      );

    creatorState.draft
      .magic
      .customSpells = [
        ownerlessSpell
      ];

    creatorState.draft
      .magic
      .knownSpellIds = [
        "ownerless-spell"
      ];

    record(
      "Review warns for ownerless multiclass spell",
      getSection17Warnings()
        .includes(
          "Ownerless Spell needs a class source."
        ),
      true
    );

    creatorState.draft =
      createEmptyCharacter();

    creatorState.draft
      .identity
      .name = "Review Clarity";

    creatorState.draft
      .classProgression
      .totalLevel = 1;

    creatorState.draft
      .classProgression
      .classes = [
        {
          classId: "wizard",
          className: "Wizard",
          level: 1,
          templateSnapshot:
            DEFAULT_CLASS_TEMPLATES.find(
              (template) => {
                return template.id ===
                  "wizard";
              }
            )
        }
      ];

    applySection13Scores({
      str: 15,
      dex: 10,
      con: 12,
      int: 16,
      wis: 10,
      cha: 10
    });

    setAbilityBonusSource(
      "species:test",
      {
        str: 2
      }
    );

    chooseSection14Background(
      "criminal"
    );

    setSection14BackgroundChoiceList(
      "toolProficiencies",
      [
        "Dice set",
        "Thieves' tools"
      ]
    );

    setSection14BackgroundChoiceList(
      "languageProficiencies",
      ["Infernal"]
    );

    setSourceProficiencyList(
      "tools",
      creatorState.draft
        .background
        .featureChoices
        .toolProficiencies,
      "background:criminal"
    );

    setSourceProficiencyList(
      "languages",
      creatorState.draft
        .background
        .featureChoices
        .languageProficiencies,
      "background:criminal"
    );

    applySection14BackgroundPackage(
      "criminal-pack"
    );

    creatorState.draft
      .magic
      .customSpells = [
        normalizeSection16Spell({
          id: "magic-missile",
          name: "Magic Missile",
          level: 1,
          classId: "wizard"
        })
      ];

    creatorState.draft
      .magic
      .knownSpellIds = [
        "magic-missile"
      ];

    creatorState.draft
      .magic
      .innateSpells = [
        normalizeSection16Spell(
          {
            id: "innate-light",
            name: "Light",
            level: 0,
            source: "species:test",
            innateSource:
              "species:test",
            innate: true,
            spellcastingAbility:
              "cha"
          },
          "species:test"
        )
      ];

    creatorState.draft
      .builder
      .validation
      .migrationWarnings = [
        "Review imported container repairs."
      ];

    const reviewClarityHtml =
      renderReviewStep();

    record(
      "Review screen shows clarified character details",
      {
        abilities:
          [
            "Base Score",
            "Bonus Sources",
            "species:test +2",
            "Final Score"
          ].every((text) => {
            return reviewClarityHtml
              .includes(text);
          }),
        backgroundItems:
          reviewClarityHtml.includes(
            "Background Items and Currency"
          ) &&
          reviewClarityHtml.includes(
            "criminal-pack"
          ) &&
          reviewClarityHtml.includes(
            "15 gp"
          ),
        exactChoices:
          [
            "Exact Tools, Instruments, and Gaming Sets",
            "Dice set",
            "Thieves&#039; tools",
            "Exact Background Languages",
            "Infernal"
          ].every((text) => {
            return reviewClarityHtml
              .includes(text);
          }),
        spells:
          reviewClarityHtml.includes(
            "Class Spells"
          ) &&
          reviewClarityHtml.includes(
            "Magic Missile"
          ) &&
          reviewClarityHtml.includes(
            "Innate Species Spells"
          ) &&
          reviewClarityHtml.includes(
            "Light"
          ),
        migration:
          reviewClarityHtml.includes(
            "Migration Warnings Requiring Review"
          ) &&
          reviewClarityHtml.includes(
            "Review imported container repairs."
          )
      },
      {
        abilities: true,
        backgroundItems: true,
        exactChoices: true,
        spells: true,
        migration: true
      }
    );

    const catalogHas = (ids) => {
      return ids.every((id) => {
        return DEFAULT_EQUIPMENT_CATALOG
          .some((item) => {
            return item.id === id;
          });
      });
    };

    const getTemplate = (templates, id) => {
      return templates.find((template) => {
        return template.id === id;
      });
    };

    creatorState.draft =
      createEmptyCharacter();

    chooseSpeciesFromTemplate(
      "half-elf"
    );

    creatorState.draft
      .species
      .choices
      .halfElfAbilityOne = "cha";

    creatorState.draft
      .species
      .choices
      .halfElfAbilityTwo = "dex";

    creatorState.draft
      .species
      .choices
      .halfElfSkillOne = "perception";

    creatorState.draft
      .species
      .choices
      .halfElfSkillTwo = "stealth";

    creatorState.draft
      .species
      .choices
      .halfElfLanguage = "Dwarvish";

    record(
      "Half-Elf rejects Charisma flexible ability",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft
      .species
      .choices
      .halfElfAbilityOne = "dex";

    creatorState.draft
      .species
      .choices
      .halfElfAbilityTwo = "dex";

    record(
      "Half-Elf rejects duplicate flexible ability",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft
      .species
      .choices
      .halfElfAbilityTwo = "con";

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

    record(
      "Half-Elf grants exactly two chosen skills",
      Object.values(
        creatorState.draft
          .proficiencies
          .skills
      )
        .filter((entry) => {
          return cleanArray(
            entry.source
          ).includes(
            "species-choice:half-elf"
          );
        })
        .length,
      2
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSpeciesFromTemplate(
      "half-elf"
    );

    record(
      "Half-Elf blocks completion until choices are valid",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft
      .species
      .choices
      .halfElfAbilityOne = "dex";

    creatorState.draft
      .species
      .choices
      .halfElfAbilityTwo = "luck";

    creatorState.draft
      .species
      .choices
      .halfElfSkillOne = "perception";

    creatorState.draft
      .species
      .choices
      .halfElfSkillTwo = "stealth";

    creatorState.draft
      .species
      .choices
      .halfElfLanguage = "Dwarvish";

    record(
      "Half-Elf rejects invalid ability choices",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft
      .species
      .choices
      .halfElfAbilityTwo = "con";

    creatorState.draft
      .species
      .choices
      .halfElfSkillTwo = "not-a-skill";

    record(
      "Half-Elf rejects invalid skill choices",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft
      .species
      .choices
      .halfElfSkillTwo = "perception";

    record(
      "Half-Elf rejects duplicate skill choices",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft
      .species
      .choices
      .halfElfSkillTwo = "stealth";

    creatorState.draft
      .species
      .choices
      .halfElfLanguage = "Elvish";

    record(
      "Half-Elf rejects non-additional language choices",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft
      .species
      .choices
      .halfElfLanguage = "Dwarvish";

    record(
      "Half-Elf completes with two abilities two skills and a language",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      true
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSpeciesFromTemplate(
      "dragonborn"
    );

    creatorState.draft
      .species
      .choices
      .draconicAncestry = "sparkle";

    record(
      "Dragonborn rejects invalid ancestry choices",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSpeciesFromTemplate("elf");

    record(
      "Species with subraces require a valid subrace",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft
      .species
      .choices
      .subraceId = "moon-elf";

    record(
      "Species with subraces reject invalid subraces",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSpeciesFromTemplate("dwarf");
    chooseSection11Subrace("hill-dwarf");

    record(
      "Dwarf requires a valid tool choice",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft
      .species
      .choices
      .dwarfTool = "Thieves' tools";

    record(
      "Dwarf rejects invalid tool choices",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft
      .species
      .choices
      .dwarfTool = "Mason's tools";

    record(
      "Dwarf completes with a valid tool choice",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      true
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSpeciesFromTemplate("dwarf");

    creatorState.draft
      .species
      .choices
      .dwarfTool = "Smith's tools";

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

    creatorState.draft
      .species
      .choices
      .dwarfTool =
        "Brewer's supplies";

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

    record(
      "Dwarf tool choice replaces previous cleanly",
      {
        tools:
          creatorState.draft
            .proficiencies
            .tools,
        oldSource:
          ensureProficiencySources(
            creatorState.draft
          )
            .tools
            ?.[
              "Smith's tools"
            ] || [],
        newSource:
          ensureProficiencySources(
            creatorState.draft
          )
            .tools
            ?.[
              "Brewer's supplies"
            ] || []
      },
      {
        tools: [
          "Brewer's supplies"
        ],
        oldSource: [],
        newSource: [
          "species-choice:dwarf"
        ]
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSpeciesFromTemplate("human");

    record(
      "Human requires an additional language",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft
      .species
      .choices
      .humanLanguage = "Common";

    record(
      "Human rejects non-additional language choices",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft
      .species
      .choices
      .humanLanguage = "Elvish";

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

    record(
      "Human language uses species choice source",
      ensureProficiencySources(
        creatorState.draft
      )
        .languages
        ?.Elvish || [],
      ["species-choice:human"]
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSpeciesFromTemplate("elf");
    chooseSection11Subrace("high-elf");

    record(
      "High Elf requires language and cantrip choices",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft
      .species
      .choices
      .highElfLanguage = "Common";

    creatorState.draft
      .species
      .choices
      .highElfCantrip = "Fire Bolt";

    record(
      "High Elf rejects non-additional language choices",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft
      .species
      .choices
      .highElfLanguage = "Dwarvish";

    creatorState.draft
      .species
      .choices
      .highElfCantrip = "Eldritch Blast";

    record(
      "High Elf rejects non-Wizard cantrip choices",
      isSection17SpeciesComplete(
        creatorState.draft
      ),
      false
    );

    creatorState.draft
      .species
      .choices
      .highElfLanguage = "Dwarvish";

    creatorState.draft
      .species
      .choices
      .highElfCantrip = "Fire Bolt";

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

    record(
      "High Elf cantrip is innate Intelligence spell",
      {
        knownCantrips:
          getSpellSelectionLimits(
            creatorState.draft
          ).knownCantripCount,
        spell:
          getSection16InnateSpells(
            creatorState.draft
          ).map((spell) => {
            return {
              name: spell.name,
              ability:
                spell.spellcastingAbility,
              source: spell.source
            };
          })
      },
      {
        knownCantrips: 0,
        spell: [
          {
            name: "Fire Bolt",
            ability: "int",
            source:
              "species-choice:high-elf"
          }
        ]
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    setSourceProficiencyList(
      "tools",
      ["Thieves' tools"],
      "manual"
    );

    setSourceProficiencyList(
      "languages",
      ["Abyssal"],
      "background:custom"
    );

    chooseSpeciesFromTemplate("dwarf");

    creatorState.draft
      .species
      .choices
      .dwarfTool = "Smith's tools";

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

    chooseSpeciesFromTemplate("human");

    creatorState.draft
      .species
      .choices
      .humanLanguage = "Elvish";

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

    const speciesChangeSources =
      ensureProficiencySources(
        creatorState.draft
      );

    record(
      "Changing species removes only species-granted choices",
      {
        tools:
          creatorState.draft
            .proficiencies
            .tools
            .slice()
            .sort(),
        smithSource:
          speciesChangeSources
            .tools
            ?.[
              "Smith's tools"
            ] || [],
        manualToolSource:
          speciesChangeSources
            .tools
            ?.[
              "Thieves' tools"
            ] || [],
        languages:
          creatorState.draft
            .proficiencies
            .languages
            .slice()
            .sort(),
        backgroundLanguageSource:
          speciesChangeSources
            .languages
            ?.Abyssal || [],
        commonSource:
          speciesChangeSources
            .languages
            ?.Common || [],
        humanLanguageSource:
          speciesChangeSources
            .languages
            ?.Elvish || []
      },
      {
        tools: [
          "Thieves' tools"
        ],
        smithSource: [],
        manualToolSource: ["manual"],
        languages: [
          "Abyssal",
          "Common",
          "Elvish"
        ],
        backgroundLanguageSource: [
          "background:custom"
        ],
        commonSource: [
          "species:human"
        ],
        humanLanguageSource: [
          "species-choice:human"
        ]
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    setSourceProficiencyList(
      "languages",
      ["Abyssal"],
      "manual"
    );

    chooseSpeciesFromTemplate("elf");
    chooseSection11Subrace("high-elf");

    creatorState.draft
      .species
      .choices
      .highElfLanguage = "Dwarvish";

    creatorState.draft
      .species
      .choices
      .highElfCantrip = "Fire Bolt";

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

    chooseSection11Subrace("wood-elf");

    const subraceChangeSources =
      ensureProficiencySources(
        creatorState.draft
      );

    record(
      "Changing subrace removes only previous subrace choices",
      {
        languages:
          creatorState.draft
            .proficiencies
            .languages
            .slice()
            .sort(),
        oldLanguageSource:
          subraceChangeSources
            .languages
            ?.Dwarvish || [],
        manualLanguageSource:
          subraceChangeSources
            .languages
            ?.Abyssal || [],
        innateSpells:
          getSection16InnateSpells(
            creatorState.draft
          ).map((spell) => {
            return spell.name;
          })
      },
      {
        languages: [
          "Abyssal",
          "Common",
          "Elvish"
        ],
        oldLanguageSource: [],
        manualLanguageSource: [
          "manual"
        ],
        innateSpells: []
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSpeciesFromTemplate("elf");
    chooseSection11Subrace("dark-elf");

    creatorState.draft
      .classProgression
      .totalLevel = 1;

    creatorState.draft
      .classProgression
      .classes = [
        {
          classId: "barbarian",
          className: "Barbarian",
          level: 1,
          templateSnapshot:
            getTemplate(
              DEFAULT_CLASS_TEMPLATES,
              "barbarian"
            )
        }
      ];

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

    const darkElfLevelOneSpells =
      getSection16InnateSpells(
        creatorState.draft
      ).map((spell) => {
        return {
          name: spell.name,
          level: spell.level,
          ability:
            spell.spellcastingAbility,
          source: spell.source
        };
      });

    creatorState.draft
      .classProgression
      .totalLevel = 3;

    creatorState.draft
      .classProgression
      .classes[0]
      .level = 3;

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

    const darkElfLevelThreeNames =
      getSection16InnateSpells(
        creatorState.draft
      ).map((spell) => {
        return spell.name;
      });

    creatorState.draft
      .classProgression
      .totalLevel = 5;

    creatorState.draft
      .classProgression
      .classes[0]
      .level = 5;

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

    const darkElfLevelFive =
      getSection16InnateSpells(
        creatorState.draft
      );

    record(
      "Dark Elf innate spells unlock by level",
      {
        levelOne:
          darkElfLevelOneSpells,
        levelThree:
          darkElfLevelThreeNames,
        levelFive:
          darkElfLevelFive.map((spell) => {
            return {
              name: spell.name,
              level: spell.level,
              ability:
                spell.spellcastingAbility,
              source: spell.source
            };
          })
      },
      {
        levelOne: [
          {
            name: "Dancing Lights",
            level: 0,
            ability: "cha",
            source:
              "subrace:dark-elf"
          }
        ],
        levelThree: [
          "Dancing Lights",
          "Faerie Fire"
        ],
        levelFive: [
          {
            name: "Dancing Lights",
            level: 0,
            ability: "cha",
            source:
              "subrace:dark-elf"
          },
          {
            name: "Faerie Fire",
            level: 1,
            ability: "cha",
            source:
              "subrace:dark-elf"
          },
          {
            name: "Darkness",
            level: 2,
            ability: "cha",
            source:
              "subrace:dark-elf"
          }
        ]
      }
    );

    const darkElfLimits =
      getSpellSelectionLimits(
        creatorState.draft
      );

    record(
      "Dark Elf innate spells do not count against class spell limits",
      {
        knownCantrips:
          darkElfLimits
            .knownCantripCount,
        knownLeveled:
          darkElfLimits
            .knownLeveledCount,
        prepared:
          darkElfLimits
            .preparedCount,
        slots:
          getSpellcastingSummary(
            creatorState.draft
          ).classes.map((entry) => {
            return entry.spellSlots || {};
          })
      },
      {
        knownCantrips: 0,
        knownLeveled: 0,
        prepared: 0,
        slots: [{}]
      }
    );

    const darkElfPayload =
      createCharacterPayload(
        creatorState.draft
      );

    const darkElfImported =
      normalizeCharacter(
        darkElfPayload
      );

    const darkElfDuplicated =
      normalizeCharacter(
        cloneData(creatorState.draft)
      );

    record(
      "Dark Elf innate spells persist through save import and duplication",
      {
        payload:
          darkElfPayload
            .magic
            .innateSpells
            .map((spell) => {
              return spell.name;
            }),
        imported:
          darkElfImported
            .magic
            .innateSpells
            .map((spell) => {
              return spell.name;
            }),
        duplicated:
          darkElfDuplicated
            .magic
            .innateSpells
            .map((spell) => {
              return spell.name;
            })
      },
      {
        payload: [
          "Dancing Lights",
          "Faerie Fire",
          "Darkness"
        ],
        imported: [
          "Dancing Lights",
          "Faerie Fire",
          "Darkness"
        ],
        duplicated: [
          "Dancing Lights",
          "Faerie Fire",
          "Darkness"
        ]
      }
    );

    chooseSpeciesFromTemplate("human");

    record(
      "Changing species removes Dark Elf innate spells",
      getSection16InnateSpells(
        creatorState.draft
      ).length,
      0
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSpeciesFromTemplate("gnome");
    chooseSection11Subrace("forest-gnome");

    creatorState.draft
      .classProgression
      .totalLevel = 1;

    creatorState.draft
      .classProgression
      .classes = [
        {
          classId: "barbarian",
          className: "Barbarian",
          level: 1,
          templateSnapshot:
            getTemplate(
              DEFAULT_CLASS_TEMPLATES,
              "barbarian"
            )
        }
      ];

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

    const forestGnomeLimits =
      getSpellSelectionLimits(
        creatorState.draft
      );

    record(
      "Forest Gnome Minor Illusion is innate Intelligence spell",
      {
        spell:
          getSection16InnateSpells(
            creatorState.draft
          ).map((spell) => {
            return {
              name: spell.name,
              level: spell.level,
              ability:
                spell.spellcastingAbility,
              source: spell.source
            };
          }),
        knownCantrips:
          forestGnomeLimits
            .knownCantripCount,
        knownLeveled:
          forestGnomeLimits
            .knownLeveledCount,
        prepared:
          forestGnomeLimits
            .preparedCount,
        slots:
          getSpellcastingSummary(
            creatorState.draft
          ).classes.map((entry) => {
            return entry.spellSlots || {};
          })
      },
      {
        spell: [
          {
            name: "Minor Illusion",
            level: 0,
            ability: "int",
            source:
              "subrace:forest-gnome"
          }
        ],
        knownCantrips: 0,
        knownLeveled: 0,
        prepared: 0,
        slots: [{}]
      }
    );

    chooseSection11Subrace("rock-gnome");

    record(
      "Changing gnome subrace removes Forest Gnome innate spell",
      getSection16InnateSpells(
        creatorState.draft
      ).length,
      0
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSpeciesFromTemplate("dwarf");
    chooseSection11Subrace("hill-dwarf");

    creatorState.draft
      .abilities
      .scores
      .con = 10;

    creatorState.draft
      .classProgression
      .totalLevel = 5;

    creatorState.draft
      .classProgression
      .classes = [
        {
          classId: "fighter",
          className: "Fighter",
          level: 5,
          templateSnapshot:
            getTemplate(
              DEFAULT_CLASS_TEMPLATES,
              "fighter"
            )
        }
      ];

    record(
      "Hill Dwarf adds one HP per level",
      calculateCharacterHp(
        creatorState.draft
      ),
      {
        ...calculateCharacterHp(
          creatorState.draft
        ),
        maximumHp: 39,
        speciesHpBonus: 5
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSpeciesFromTemplate("tiefling");

    creatorState.draft
      .classProgression
      .totalLevel = 5;

    creatorState.draft
      .classProgression
      .classes = [
        {
          classId: "barbarian",
          className: "Barbarian",
          level: 5,
          templateSnapshot:
            getTemplate(
              DEFAULT_CLASS_TEMPLATES,
              "barbarian"
            )
        }
      ];

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

    record(
      "Tiefling innate spells do not create class slots",
      {
        spells:
          getSection16InnateSpells(
            creatorState.draft
          ).map((spell) => {
            return {
              name: spell.name,
              level: spell.level,
              ability:
                spell.spellcastingAbility
            };
          }),
        slots:
          getSpellcastingSummary(
            creatorState.draft
          ).classes.map((entry) => {
            return entry.spellSlots || {};
          })
      },
      {
        spells: [
          {
            name: "Thaumaturgy",
            level: 0,
            ability: "cha"
          },
          {
            name: "Hellish Rebuke",
            level: 1,
            ability: "cha"
          },
          {
            name: "Darkness",
            level: 2,
            ability: "cha"
          }
        ],
        slots: [{}]
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSection14Background(
      "charlatan"
    );

    setSection14BackgroundChoiceList(
      "toolProficiencies",
      [
        "Disguise kit",
        "Forgery kit"
      ]
    );

    setSourceProficiencyList(
      "tools",
      creatorState.draft
        .background
        .featureChoices
        .toolProficiencies,
      "background:charlatan"
    );

    record(
      "Background tool choices use background source",
      ensureProficiencySources(
        creatorState.draft
      )
        .tools
        ?.[
          "Disguise kit"
        ] || [],
      ["background:charlatan"]
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSection14Background(
      "criminal"
    );

    const criminalSkillSource =
      "background:criminal";

    [
      "deception",
      "stealth"
    ].forEach((skillId) => {
      const skill =
        SKILL_DEFINITIONS.find(
          (candidate) => {
            return candidate.id ===
              skillId;
          }
        );

      setSection14SkillEntry(
        skill,
        {
          proficient: true,
          expertise: false,
          source: [criminalSkillSource]
        }
      );
    });

    const criminalToolOptions =
      getSection14BackgroundToolOptions(
        getSelectedSection14Background()
      );

    record(
      "Generic background tool choice expands to exact options",
      {
        generic:
          criminalToolOptions.includes(
            "One gaming set"
          ),
        dice:
          criminalToolOptions.includes(
            "Dice set"
          ),
        cards:
          criminalToolOptions.includes(
            "Playing card set"
          ),
        slotOneDice:
          getSection14BackgroundToolOptionsForIndex(
            getSelectedSection14Background(),
            0
          ).includes("Dice set"),
        slotTwoDice:
          getSection14BackgroundToolOptionsForIndex(
            getSelectedSection14Background(),
            1
          ).includes("Dice set"),
        slotTwoFixed:
          getSection14BackgroundToolOptionsForIndex(
            getSelectedSection14Background(),
            1
          ).includes(
            "Thieves' tools"
          )
      },
      {
        generic: false,
        dice: true,
        cards: true,
        slotOneDice: true,
        slotTwoDice: false,
        slotTwoFixed: true
      }
    );

    setSection14BackgroundChoiceList(
      "toolProficiencies",
      [
        "One gaming set",
        "Thieves' tools"
      ]
    );

    setSourceProficiencyList(
      "tools",
      creatorState.draft
        .background
        .featureChoices
        .toolProficiencies,
      criminalSkillSource
    );

    record(
      "Generic background tool value does not complete background",
      {
        valid:
          countSection14ValidBackgroundToolChoices(),
        complete:
          isSection17BackgroundComplete(
            creatorState.draft
          )
      },
      {
        valid: 1,
        complete: false
      }
    );

    setSection14BackgroundChoiceList(
      "toolProficiencies",
      [
        "Dice set",
        "Playing card set"
      ]
    );

    setSourceProficiencyList(
      "tools",
      creatorState.draft
        .background
        .featureChoices
        .toolProficiencies,
      criminalSkillSource
    );

    record(
      "Background tool choices must match their exact slots",
      {
        valid:
          countSection14ValidBackgroundToolChoices(),
        complete:
          isSection17BackgroundComplete(
            creatorState.draft
          )
      },
      {
        valid: 1,
        complete: false
      }
    );

    setSection14BackgroundChoiceList(
      "toolProficiencies",
      [
        "Dice set",
        "Thieves' tools"
      ]
    );

    setSourceProficiencyList(
      "tools",
      creatorState.draft
        .background
        .featureChoices
        .toolProficiencies,
      criminalSkillSource
    );

    record(
      "Exact background tool choices complete background",
      {
        valid:
          countSection14ValidBackgroundToolChoices(),
        complete:
          isSection17BackgroundComplete(
            creatorState.draft
          ),
        source:
          ensureProficiencySources(
            creatorState.draft
          )
            .tools
            ?.[
              "Dice set"
            ] || []
      },
      {
        valid: 2,
        complete: true,
        source: [criminalSkillSource]
      }
    );

    setSourceProficiencyList(
      "tools",
      ["Brewer's supplies"],
      "manual"
    );

    setSection14BackgroundChoiceList(
      "toolProficiencies",
      [
        "Playing card set",
        "Thieves' tools"
      ]
    );

    setSourceProficiencyList(
      "tools",
      creatorState.draft
        .background
        .featureChoices
        .toolProficiencies,
      criminalSkillSource
    );

    record(
      "Replacing background tool choice preserves manual tools",
      {
        tools:
          creatorState.draft
            .proficiencies
            .tools
            .slice()
            .sort(),
        oldSource:
          ensureProficiencySources(
            creatorState.draft
          )
            .tools
            ?.[
              "Dice set"
            ] || [],
        manualSource:
          ensureProficiencySources(
            creatorState.draft
          )
            .tools
            ?.[
              "Brewer's supplies"
            ] || [],
        newSource:
          ensureProficiencySources(
            creatorState.draft
          )
            .tools
            ?.[
              "Playing card set"
            ] || []
      },
      {
        tools: [
          "Brewer's supplies",
          "Playing card set",
          "Thieves' tools"
        ],
        oldSource: [],
        manualSource: ["manual"],
        newSource: [criminalSkillSource]
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSection14Background("acolyte");

    setSection14BackgroundChoiceList(
      "languageProficiencies",
      ["Celestial", "Infernal"]
    );

    setSourceProficiencyList(
      "languages",
      creatorState.draft
        .background
        .featureChoices
        .languageProficiencies,
      "background:acolyte"
    );

    record(
      "Background language choices use background source",
      ensureProficiencySources(
        creatorState.draft
      )
        .languages
        ?.Celestial || [],
      ["background:acolyte"]
    );

    applySection14BackgroundPackage(
      "acolyte-pack"
    );

    const acolyteItemCount =
      creatorState.draft
        .equipment
        .items
        .filter((item) => {
          return item.source ===
            "background:acolyte";
        })
        .length;

    applySection14BackgroundPackage(
      "acolyte-pack"
    );

    record(
      "Background equipment package does not duplicate",
      {
        items:
          creatorState.draft
            .equipment
            .items
            .filter((item) => {
              return item.source ===
                "background:acolyte";
            })
            .length,
        gp:
          creatorState.draft
            .equipment
            .currency
            .gp
      },
      {
        items: acolyteItemCount,
        gp: 15
      }
    );

    record(
      "Background package currency is source tracked",
      creatorState.draft
        .equipment
        .currencySources
        ["background:acolyte"]
        ?.[
          "acolyte-pack"
        ]
        ?.gp || 0,
      15
    );

    const withSection14Confirm = (
      response,
      action
    ) => {
      const hadWindow =
        typeof window !== "undefined";

      const previousConfirm =
        hadWindow
          ? window.confirm
          : null;

      let confirmMessage = "";

      const confirmMock = (message) => {
        confirmMessage =
          String(message || "");

        return response;
      };

      if (hadWindow) {
        window.confirm = confirmMock;
      } else {
        globalThis.window = {
          confirm: confirmMock
        };
      }

      try {
        action();
      } finally {
        if (hadWindow) {
          window.confirm =
            previousConfirm;
        } else {
          delete globalThis.window;
        }
      }

      return confirmMessage;
    };

    creatorState.draft =
      createEmptyCharacter();

    chooseSection14Background("acolyte");
    applySection14BackgroundPackage(
      "acolyte-pack"
    );

    const cancelItemCount =
      creatorState.draft
        .equipment
        .items
        .filter((item) => {
          return item.source ===
            "background:acolyte";
        })
        .length;

    const cancelMessage =
      withSection14Confirm(
        false,
        () => {
          chooseSection14Background(
            "charlatan"
          );
        }
      );

    record(
      "Background replacement confirmation names items and currency",
      {
        asksAboutBoth:
          cancelMessage.includes(
            "items and currency"
          ),
        itemCount:
          cancelMessage.includes(
            `Items to remove: ${cancelItemCount}`
          ),
        currency:
          cancelMessage.includes(
            "Currency to remove: 15 gp"
          ),
        cancelKeeps:
          cancelMessage.includes(
            "Cancel keeps the existing background items and currency."
          )
      },
      {
        asksAboutBoth: true,
        itemCount: true,
        currency: true,
        cancelKeeps: true
      }
    );

    record(
      "Canceling background replacement keeps old items and currency",
      {
        items:
          creatorState.draft
            .equipment
            .items
            .filter((item) => {
              return item.source ===
                "background:acolyte";
            })
            .length,
        gp:
          creatorState.draft
            .equipment
            .currency
            .gp,
        source:
          creatorState.draft
            .equipment
            .currencySources
            ["background:acolyte"]
            ?.[
              "acolyte-pack"
            ]
            ?.gp || 0
      },
      {
        items: cancelItemCount,
        gp: 15,
        source: 15
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSection14Background("acolyte");
    applySection14BackgroundPackage(
      "acolyte-pack"
    );

    withSection14Confirm(
      true,
      () => {
        chooseSection14Background(
          "charlatan"
        );
      }
    );

    record(
      "Confirming background replacement removes old items and currency",
      {
        items:
          creatorState.draft
            .equipment
            .items
            .filter((item) => {
              return item.source ===
                "background:acolyte";
            })
            .length,
        gp:
          creatorState.draft
            .equipment
            .currency
            .gp,
        source:
          Boolean(
            creatorState.draft
              .equipment
              .currencySources
              ["background:acolyte"]
          )
      },
      {
        items: 0,
        gp: 0,
        source: false
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSection14Background("acolyte");
    applySection14BackgroundPackage(
      "acolyte-pack"
    );

    creatorState.draft
      .equipment
      .currency
      .gp = 25;

    removeSection14BackgroundEquipment(
      "background:acolyte",
      "acolyte-pack"
    );

    record(
      "Removing background package preserves manual currency",
      {
        items:
          creatorState.draft
            .equipment
            .items
            .filter((item) => {
              return item.source ===
                "background:acolyte";
            })
            .length,
        gp:
          creatorState.draft
            .equipment
            .currency
            .gp,
        source:
          Boolean(
            creatorState.draft
              .equipment
              .currencySources
              ["background:acolyte"]
          )
      },
      {
        items: 0,
        gp: 10,
        source: false
      }
    );

    creatorState.draft =
      createEmptyCharacter();

    chooseSection14Background("acolyte");
    applySection14BackgroundPackage(
      "acolyte-pack"
    );

    chooseSection14Background(
      "charlatan"
    );
    applySection14BackgroundPackage(
      "charlatan-pack"
    );

    removeSection14BackgroundEquipment(
      "background:acolyte",
      "acolyte-pack"
    );

    record(
      "Removing one background package preserves other source currency",
      {
        gp:
          creatorState.draft
            .equipment
            .currency
            .gp,
        acolyte:
          Boolean(
            creatorState.draft
              .equipment
              .currencySources
              ["background:acolyte"]
          ),
        charlatan:
          creatorState.draft
            .equipment
            .currencySources
            ["background:charlatan"]
            ?.[
              "charlatan-pack"
            ]
            ?.gp || 0,
        charlatanItems:
          creatorState.draft
            .equipment
            .items
            .filter((item) => {
              return item.source ===
                "background:charlatan";
            })
            .length
      },
      {
        gp: 15,
        acolyte: false,
        charlatan: 15,
        charlatanItems: 4
      }
    );

    creatorState.draft =
      normalizeCharacter({
        background: {
          id: "acolyte",
          name: "Acolyte",
          source: "template",
          featureChoices: {
            appliedEquipmentPackageIds: [
              "acolyte-pack"
            ]
          }
        },
        equipment: {
          currency: {
            gp: 20
          },
          items: []
        }
      });

    removeSection14BackgroundEquipment(
      "background:acolyte",
      "acolyte-pack"
    );

    record(
      "Legacy background package currency is backfilled and removable",
      {
        gp:
          creatorState.draft
            .equipment
            .currency
            .gp,
        source:
          Boolean(
            creatorState.draft
              .equipment
              .currencySources
              ["background:acolyte"]
          )
      },
      {
        gp: 5,
        source: false
      }
    );

    const rolledMulticlass =
      createEmptyCharacter();

    rolledMulticlass
      .abilities
      .scores
      .con = 14;

    rolledMulticlass
      .classProgression
      .totalLevel = 5;

    rolledMulticlass
      .classProgression
      .classes = [
        {
          classId: "fighter",
          className: "Fighter",
          level: 3,
          templateSnapshot:
            getTemplate(
              DEFAULT_CLASS_TEMPLATES,
              "fighter"
            )
        },
        {
          classId: "wizard",
          className: "Wizard",
          level: 2,
          templateSnapshot:
            getTemplate(
              DEFAULT_CLASS_TEMPLATES,
              "wizard"
            )
        }
      ];

    rolledMulticlass.combat
      .hpCalculation = {
        mode: "rolled",
        levelOneValue: null,
        laterLevelValues: [
          6,
          8,
          10,
          9
        ],
        manualOverride: null,
        lastCalculatedConModifier: 2
      };

    const rolledHp =
      calculateCharacterHp(
        rolledMulticlass
      );

    record(
      "Fighter 3 Wizard 2 rolled HP caps Wizard rolls",
      {
        hp: rolledHp.maximumHp,
        rolls:
          rolledHp.rolls.map((roll) => {
            return {
              level:
                roll.characterLevel,
              classId:
                roll.classId,
              hitDie:
                roll.hitDie,
              roll:
                roll.roll
            };
          })
      },
      {
        hp: 46,
        rolls: [
          {
            level: 2,
            classId: "fighter",
            hitDie: "d10",
            roll: 6
          },
          {
            level: 3,
            classId: "fighter",
            hitDie: "d10",
            roll: 8
          },
          {
            level: 4,
            classId: "wizard",
            hitDie: "d6",
            roll: 6
          },
          {
            level: 5,
            classId: "wizard",
            hitDie: "d6",
            roll: 6
          }
        ]
      }
    );

    record(
      "Old rolled HP migration warning is recorded",
      warningTextFor(
        rolledMulticlass
      ).includes(
        "Old rolled HP values were migrated"
      ),
      true
    );

    rolledMulticlass.combat
      .hpCalculation
      .laterLevelValues =
        rolledHp.rolls;

    creatorState.draft =
      cloneData(
        rolledMulticlass
      );

    const rolledHpLevelHtml =
      renderLevelStep();

    record(
      "Rolled HP UI shows class and hit die for every level",
      {
        levelOne:
          /Level 1[\s\S]*Fighter[\s\S]*d10/.test(
            rolledHpLevelHtml
          ),
        levelFour:
          /Level 4[\s\S]*Wizard[\s\S]*d6/.test(
            rolledHpLevelHtml
          ),
        levelFive:
          /Level 5[\s\S]*Wizard[\s\S]*d6/.test(
            rolledHpLevelHtml
          )
      },
      {
        levelOne: true,
        levelFour: true,
        levelFive: true
      }
    );

    record(
      "Rolled HP UI caps inputs by each level hit die",
      {
        fighter:
          /id="ccHpRollLevel-2"[\s\S]*max="10"/.test(
            rolledHpLevelHtml
          ),
        wizard:
          /id="ccHpRollLevel-4"[\s\S]*max="6"/.test(
            rolledHpLevelHtml
          )
      },
      {
        fighter: true,
        wizard: true
      }
    );

    setSection13HpRollValue(4, 12);

    record(
      "Rolled HP input value is capped by active hit die",
      calculateCharacterHp(
        creatorState.draft
      ).rolls.find((roll) => {
        return roll.characterLevel === 4;
      })?.roll,
      6
    );

    const shiftedRolledMulticlass =
      cloneData(
        rolledMulticlass
      );

    shiftedRolledMulticlass
      .classProgression
      .classes[0]
      .level = 2;

    shiftedRolledMulticlass
      .classProgression
      .classes[1]
      .level = 3;

    shiftedRolledMulticlass
      .classProgression
      .totalLevel = 5;

    const shiftedRollState =
      getSection13HpRollState(
        shiftedRolledMulticlass,
        shiftedRolledMulticlass
          .combat
          .hpCalculation
      );

    record(
      "Changing class levels preserves compatible rolled HP",
      shiftedRollState
        .activeRolls
        .map((roll) => {
          return {
            level:
              roll.characterLevel,
            classId:
              roll.classId,
            roll:
              roll.roll
          };
        }),
      [
        {
          level: 2,
          classId: "fighter",
          roll: 6
        },
        {
          level: 3,
          classId: "wizard",
          roll: 6
        },
        {
          level: 4,
          classId: "wizard",
          roll: 6
        },
        {
          level: 5,
          classId: "wizard",
          roll: 4
        }
      ]
    );

    record(
      "Changed rolled HP levels show an adjustment warning",
      shiftedRollState
        .warnings
        .some((warning) => {
          return warning.includes(
            "Level 3 now uses Wizard d6"
          );
        }),
      true
    );

    const reducedRolledMulticlass =
      cloneData(
        rolledMulticlass
      );

    reducedRolledMulticlass
      .classProgression
      .classes[0]
      .level = 3;

    reducedRolledMulticlass
      .classProgression
      .classes[1]
      .level = 0;

    reducedRolledMulticlass
      .classProgression
      .totalLevel = 3;

    const reducedRollState =
      getSection13HpRollState(
        reducedRolledMulticlass,
        reducedRolledMulticlass
          .combat
          .hpCalculation
      );

    record(
      "Removed rolled HP levels are reported as inactive",
      reducedRollState
        .inactiveRecords
        .map((record) => {
          return record.characterLevel;
        }),
      [
        4,
        5
      ]
    );

    creatorState.draft =
      cloneData(
        reducedRolledMulticlass
      );

    setSection13HpRollValue(2, 7);

    record(
      "Editing active rolled HP preserves inactive removed levels",
      creatorState.draft
        .combat
        .hpCalculation
        .laterLevelValues
        .filter((record) => {
          return record.characterLevel > 3;
        })
        .map((record) => {
          return record.characterLevel;
        }),
      [
        4,
        5
      ]
    );

    const storedRollsBeforeConChange =
      JSON.stringify(
        rolledMulticlass
          .combat
          .hpCalculation
          .laterLevelValues
      );

    rolledMulticlass
      .abilities
      .scores
      .con = 16;

    record(
      "Constitution changes preserve multiclass HP rolls",
      calculateCharacterHp(
        rolledMulticlass
      ).rolls.map((roll) => {
        return roll.roll;
      }),
      [
        6,
        8,
        6,
        6
      ]
    );

    record(
      "Constitution changes never replace stored HP rolls",
      JSON.stringify(
        rolledMulticlass
          .combat
          .hpCalculation
          .laterLevelValues
      ),
      storedRollsBeforeConChange
    );

    record(
      "Imported equipped backpack normalizes unequipped",
      normalizeCharacter({
        equipment: {
          items: [
            {
              id: "backpack",
              name: "Backpack",
              isContainer: true,
              equipped: true
            }
          ]
        }
      }).equipment.items[0].equipped,
      false
    );

    const containedArmorCharacter =
      cloneData(fighterCharacter);

    containedArmorCharacter
      .abilities
      .scores
      .dex = 10;

    containedArmorCharacter
      .equipment
      .items = [
        normalizeSection15Item({
          id: "pack",
          name: "Pack",
          isContainer: true
        }),
        normalizeSection15Item({
          id: "mail",
          name: "Chain Mail",
          category: "armor",
          armorCategory: "heavy armor",
          baseArmorClass: 16,
          equipped: true,
          containerId: "pack"
        })
      ];

    record(
      "Contained armor does not affect AC",
      calculateArmorClassOptions(
        containedArmorCharacter
      ).selected.total,
      10
    );

    record(
      "All standard armors are present",
      catalogHas([
        "padded-armor",
        "leather-armor",
        "studded-leather-armor",
        "hide-armor",
        "chain-shirt",
        "scale-mail",
        "breastplate",
        "half-plate",
        "ring-mail",
        "chain-mail",
        "splint-armor",
        "plate-armor",
        "shield"
      ]),
      true
    );

    record(
      "All standard weapons are present",
      catalogHas([
        "club",
        "dagger",
        "greatclub",
        "handaxe",
        "javelin",
        "light-hammer",
        "mace",
        "quarterstaff",
        "sickle",
        "spear",
        "light-crossbow",
        "dart",
        "shortbow",
        "sling",
        "battleaxe",
        "flail",
        "glaive",
        "greataxe",
        "greatsword",
        "halberd",
        "lance",
        "longsword",
        "maul",
        "morningstar",
        "pike",
        "rapier",
        "scimitar",
        "shortsword",
        "trident",
        "war-pick",
        "warhammer",
        "whip",
        "blowgun",
        "hand-crossbow",
        "heavy-crossbow",
        "longbow",
        "net"
      ]),
      true
    );

    creatorState.draft =
      createEmptyCharacter();

    skipSection14Background();

    record(
      "Skipped background is complete",
      isSection17BackgroundComplete(
        creatorState.draft
      ),
      true
    );

    const failed =
      results.filter((result) => {
        return !result.pass;
      });

    return {
      passed: failed.length === 0,
      total: results.length,
      failed,
      results
    };
  }

  const STANDARD_LANGUAGE_OPTIONS = Object.freeze([
    "Common",
    "Dwarvish",
    "Elvish",
    "Giant",
    "Gnomish",
    "Goblin",
    "Halfling",
    "Orc",
    "Abyssal",
    "Celestial",
    "Draconic",
    "Deep Speech",
    "Infernal",
    "Primordial",
    "Sylvan",
    "Undercommon"
  ]);

  const DWARF_TOOL_CHOICES = Object.freeze([
    "Smith's tools",
    "Brewer's supplies",
    "Mason's tools"
  ]);

  const ARTISAN_TOOL_OPTIONS = Object.freeze([
    "Alchemist's supplies",
    "Brewer's supplies",
    "Calligrapher's supplies",
    "Carpenter's tools",
    "Cartographer's tools",
    "Cobbler's tools",
    "Cook's utensils",
    "Glassblower's tools",
    "Jeweler's tools",
    "Leatherworker's tools",
    "Mason's tools",
    "Painter's supplies",
    "Potter's tools",
    "Smith's tools",
    "Tinker's tools",
    "Weaver's tools",
    "Woodcarver's tools"
  ]);

  const GAMING_SET_OPTIONS = Object.freeze([
    "Dice set",
    "Dragonchess set",
    "Playing card set",
    "Three-Dragon Ante set"
  ]);

  const MUSICAL_INSTRUMENT_OPTIONS = Object.freeze([
    "Bagpipes",
    "Drum",
    "Dulcimer",
    "Flute",
    "Lute",
    "Lyre",
    "Horn",
    "Pan flute",
    "Shawm",
    "Viol"
  ]);

  const GENERAL_TOOL_OPTIONS = Object.freeze([
    "Disguise kit",
    "Forgery kit",
    "Herbalism kit",
    "Navigator's tools",
    "Poisoner's kit",
    "Thieves' tools",
    "Vehicles (land)",
    "Vehicles (water)"
  ]);

  const WIZARD_CANTRIP_CHOICES_2014 = Object.freeze([
    "Acid Splash",
    "Blade Ward",
    "Chill Touch",
    "Dancing Lights",
    "Fire Bolt",
    "Friends",
    "Light",
    "Mage Hand",
    "Mending",
    "Message",
    "Minor Illusion",
    "Poison Spray",
    "Prestidigitation",
    "Ray of Frost",
    "Shocking Grasp",
    "True Strike"
  ]);

  const DARK_ELF_INNATE_SPELLS_2014 = Object.freeze([
    {
      id: "dark-elf-dancing-lights",
      name: "Dancing Lights",
      level: 0,
      minimumLevel: 1,
      castingTime: "1 action",
      range: "120 feet",
      duration: "Concentration, up to 1 minute",
      components: "V, S, M",
      source: "subrace:dark-elf",
      summary:
        "Drow Magic cantrip. Charisma is your spellcasting ability."
    },
    {
      id: "dark-elf-faerie-fire",
      name: "Faerie Fire",
      level: 1,
      minimumLevel: 3,
      castingTime: "1 action",
      range: "60 feet",
      duration: "Concentration, up to 1 minute",
      components: "V",
      source: "subrace:dark-elf",
      summary:
        "Drow Magic spell, cast once per long rest. Charisma is your spellcasting ability."
    },
    {
      id: "dark-elf-darkness",
      name: "Darkness",
      level: 2,
      minimumLevel: 5,
      castingTime: "1 action",
      range: "60 feet",
      duration: "Concentration, up to 10 minutes",
      components: "V, M",
      source: "subrace:dark-elf",
      summary:
        "Drow Magic spell, cast once per long rest. Charisma is your spellcasting ability."
    }
  ]);

  const FOREST_GNOME_INNATE_SPELLS_2014 = Object.freeze([
    {
      id: "forest-gnome-minor-illusion",
      name: "Minor Illusion",
      level: 0,
      minimumLevel: 1,
      castingTime: "1 action",
      range: "30 feet",
      duration: "1 minute",
      components: "S, M",
      source: "subrace:forest-gnome",
      summary:
        "Natural Illusionist cantrip. Intelligence is your spellcasting ability."
    }
  ]);

  const TIEFLING_INNATE_SPELLS_2014 = Object.freeze([
    {
      id: "tiefling-thaumaturgy",
      name: "Thaumaturgy",
      level: 0,
      minimumLevel: 1,
      castingTime: "1 action",
      range: "30 feet",
      duration: "Up to 1 minute",
      components: "V",
      source: "species:tiefling",
      summary:
        "Infernal Legacy cantrip."
    },
    {
      id: "tiefling-hellish-rebuke",
      name: "Hellish Rebuke",
      level: 1,
      minimumLevel: 3,
      castingTime: "1 reaction",
      range: "60 feet",
      duration: "Instantaneous",
      components: "V, S",
      source: "species:tiefling",
      summary:
        "Infernal Legacy spell, cast once per long rest at 2nd level."
    },
    {
      id: "tiefling-darkness",
      name: "Darkness",
      level: 2,
      minimumLevel: 5,
      castingTime: "1 action",
      range: "60 feet",
      duration: "Concentration, up to 10 minutes",
      components: "V, M",
      source: "species:tiefling",
      summary:
        "Infernal Legacy spell, cast once per long rest."
    }
  ]);

  const DEFAULT_CLASS_TEMPLATES = Object.freeze([
    createSrdClassTemplate({
      id: "barbarian",
      name: "Barbarian",
      summary: "A Strength-first warrior with rage, toughness, and primal path features.",
      hitDie: "d12",
      primaryAbilities: ["Strength"],
      savingThrows: ["Strength", "Constitution"],
      armorProficiencies: ["Light armor", "Medium armor", "Shields"],
      weaponProficiencies: ["Simple weapons", "Martial weapons"],
      toolProficiencies: [],
      skillChoices: {
        choose: 2,
        from: ["Animal Handling", "Athletics", "Intimidation", "Nature", "Perception", "Survival"]
      },
      subclassLevel: 3,
      featuresByLevel: {
        1: ["Rage", "Unarmored Defense"],
        2: ["Reckless Attack", "Danger Sense"],
        3: ["Primal Path"],
        5: ["Extra Attack", "Fast Movement"],
        7: ["Feral Instinct"],
        9: ["Brutal Critical"],
        11: ["Relentless Rage"],
        13: ["Brutal Critical Improvement"],
        15: ["Persistent Rage"],
        17: ["Brutal Critical Mastery"],
        18: ["Indomitable Might"],
        20: ["Primal Champion"]
      },
      subclasses: [
        createSrdSubclass({
          id: "path-of-the-berserker",
          name: "Path of the Berserker",
          summary: "A rage path focused on direct offense and retaliation.",
          featuresByLevel: {
            3: ["Frenzy"],
            6: ["Mindless Rage"],
            10: ["Intimidating Presence"],
            14: ["Retaliation"]
          }
        })
      ]
    }),

    createSrdClassTemplate({
      id: "bard",
      name: "Bard",
      summary: "A Charisma full caster with inspiration, expertise, and versatile support.",
      hitDie: "d8",
      primaryAbilities: ["Charisma"],
      savingThrows: ["Dexterity", "Charisma"],
      armorProficiencies: ["Light armor"],
      weaponProficiencies: ["Simple weapons", "Hand crossbows", "Longswords", "Rapiers", "Shortswords"],
      toolProficiencies: ["Three musical instruments"],
      skillChoices: {
        choose: 3,
        from: SKILL_DEFINITIONS.map((skill) => skill.name)
      },
      subclassLevel: 3,
      progressionType: "full-caster",
      spellcastingAbility: "cha",
      spellPreparation: "known",
      cantripsKnown: { 1: 2, 4: 3, 10: 4 },
      spellsKnown: { 1: 4, 2: 5, 3: 6, 4: 7, 5: 8, 6: 9, 7: 10, 8: 11, 9: 12, 10: 14, 11: 15, 12: 15, 13: 16, 14: 18, 15: 19, 16: 19, 17: 20, 18: 22, 19: 22, 20: 22 },
      featuresByLevel: {
        1: ["Spellcasting", "Bardic Inspiration"],
        2: ["Jack of All Trades", "Song of Rest"],
        3: ["Bard College", "Expertise"],
        5: ["Bardic Inspiration Improvement", "Font of Inspiration"],
        6: ["Countercharm", "Bard College Feature"],
        9: ["Song of Rest Improvement"],
        10: ["Bardic Inspiration Improvement", "Expertise", "Magical Secrets"],
        13: ["Song of Rest Improvement"],
        14: ["Magical Secrets", "Bard College Feature"],
        15: ["Bardic Inspiration Improvement"],
        17: ["Song of Rest Improvement"],
        18: ["Magical Secrets"],
        20: ["Superior Inspiration"]
      },
      subclasses: [
        createSrdSubclass({
          id: "college-of-lore",
          name: "College of Lore",
          summary: "A bard college focused on knowledge, cutting wit, and broader magic.",
          featuresByLevel: {
            3: ["Bonus Proficiencies", "Cutting Words"],
            6: ["Additional Magical Secrets"],
            14: ["Peerless Skill"]
          }
        })
      ]
    }),

    createSrdClassTemplate({
      id: "cleric",
      name: "Cleric",
      summary: "A Wisdom full caster with divine domains, Channel Divinity, and prepared spells.",
      hitDie: "d8",
      primaryAbilities: ["Wisdom"],
      savingThrows: ["Wisdom", "Charisma"],
      armorProficiencies: ["Light armor", "Medium armor", "Shields"],
      weaponProficiencies: ["Simple weapons"],
      toolProficiencies: [],
      skillChoices: {
        choose: 2,
        from: ["History", "Insight", "Medicine", "Persuasion", "Religion"]
      },
      subclassLevel: 1,
      progressionType: "full-caster",
      spellcastingAbility: "wis",
      spellPreparation: "prepared",
      cantripsKnown: { 1: 3, 4: 4, 10: 5 },
      featuresByLevel: {
        1: ["Spellcasting", "Divine Domain"],
        2: ["Channel Divinity", "Divine Domain Feature"],
        5: ["Destroy Undead"],
        6: ["Channel Divinity Improvement", "Divine Domain Feature"],
        8: ["Destroy Undead Improvement", "Divine Domain Feature"],
        10: ["Divine Intervention"],
        11: ["Destroy Undead Improvement"],
        14: ["Destroy Undead Improvement"],
        17: ["Destroy Undead Improvement", "Divine Domain Feature"],
        18: ["Channel Divinity Improvement"],
        20: ["Divine Intervention Improvement"]
      },
      subclasses: [
        createSrdSubclass({
          id: "life-domain",
          name: "Life Domain",
          summary: "A divine domain focused on healing and protection.",
          featuresByLevel: {
            1: ["Domain Spells", "Bonus Proficiency", "Disciple of Life"],
            2: ["Preserve Life"],
            6: ["Blessed Healer"],
            8: ["Divine Strike"],
            17: ["Supreme Healing"]
          }
        })
      ]
    }),

    createSrdClassTemplate({
      id: "druid",
      name: "Druid",
      summary: "A Wisdom full caster with Wild Shape and circle features.",
      hitDie: "d8",
      primaryAbilities: ["Wisdom"],
      savingThrows: ["Intelligence", "Wisdom"],
      armorProficiencies: ["Light armor", "Medium armor", "Shields"],
      weaponProficiencies: ["Clubs", "Daggers", "Darts", "Javelins", "Maces", "Quarterstaffs", "Scimitars", "Sickles", "Slings", "Spears"],
      toolProficiencies: ["Herbalism kit"],
      skillChoices: {
        choose: 2,
        from: ["Arcana", "Animal Handling", "Insight", "Medicine", "Nature", "Perception", "Religion", "Survival"]
      },
      subclassLevel: 2,
      progressionType: "full-caster",
      spellcastingAbility: "wis",
      spellPreparation: "prepared",
      cantripsKnown: { 1: 2, 4: 3, 10: 4 },
      featuresByLevel: {
        1: ["Druidic", "Spellcasting"],
        2: ["Wild Shape", "Druid Circle"],
        4: ["Wild Shape Improvement"],
        6: ["Druid Circle Feature"],
        8: ["Wild Shape Improvement"],
        10: ["Druid Circle Feature"],
        14: ["Druid Circle Feature"],
        18: ["Timeless Body", "Beast Spells"],
        20: ["Archdruid"]
      },
      subclasses: [
        createSrdSubclass({
          id: "circle-of-the-land",
          name: "Circle of the Land",
          summary: "A druid circle with expanded spell access and natural recovery.",
          featuresByLevel: {
            2: ["Bonus Cantrip", "Natural Recovery"],
            3: ["Circle Spells"],
            6: ["Land's Stride"],
            10: ["Nature's Ward"],
            14: ["Nature's Sanctuary"]
          }
        })
      ]
    }),

    createSrdClassTemplate({
      id: "fighter",
      name: "Fighter",
      summary: "A martial class with broad weapon and armor training.",
      hitDie: "d10",
      primaryAbilities: ["Strength", "Dexterity"],
      savingThrows: ["Strength", "Constitution"],
      armorProficiencies: ["Light armor", "Medium armor", "Heavy armor", "Shields"],
      weaponProficiencies: ["Simple weapons", "Martial weapons"],
      toolProficiencies: [],
      skillChoices: {
        choose: 2,
        from: ["Acrobatics", "Animal Handling", "Athletics", "History", "Insight", "Intimidation", "Perception", "Survival"]
      },
      subclassLevel: 3,
      asiLevels: SRD_2014_FIGHTER_ASI_LEVELS,
      featuresByLevel: {
        1: ["Fighting Style", "Second Wind"],
        2: ["Action Surge"],
        3: ["Martial Archetype"],
        5: ["Extra Attack"],
        7: ["Martial Archetype Feature"],
        9: ["Indomitable"],
        10: ["Martial Archetype Feature"],
        11: ["Extra Attack Improvement"],
        13: ["Indomitable Improvement"],
        15: ["Martial Archetype Feature"],
        17: ["Action Surge Improvement", "Indomitable Improvement"],
        18: ["Martial Archetype Feature"],
        20: ["Extra Attack Mastery"]
      },
      subclasses: [
        createSrdSubclass({
          id: "champion",
          name: "Champion",
          summary: "A fighter archetype focused on simple, reliable martial improvements.",
          featuresByLevel: {
            3: ["Improved Critical"],
            7: ["Remarkable Athlete"],
            10: ["Additional Fighting Style"],
            15: ["Superior Critical"],
            18: ["Survivor"]
          }
        })
      ]
    }),

    createSrdClassTemplate({
      id: "monk",
      name: "Monk",
      summary: "A Dexterity and Wisdom martial class using martial arts and ki.",
      hitDie: "d8",
      primaryAbilities: ["Dexterity", "Wisdom"],
      savingThrows: ["Strength", "Dexterity"],
      armorProficiencies: [],
      weaponProficiencies: ["Simple weapons", "Shortswords"],
      toolProficiencies: ["One artisan's tools or one musical instrument"],
      skillChoices: {
        choose: 2,
        from: ["Acrobatics", "Athletics", "History", "Insight", "Religion", "Stealth"]
      },
      subclassLevel: 3,
      featuresByLevel: {
        1: ["Unarmored Defense", "Martial Arts"],
        2: ["Ki", "Unarmored Movement"],
        3: ["Monastic Tradition", "Deflect Missiles"],
        4: ["Slow Fall"],
        5: ["Extra Attack", "Stunning Strike"],
        6: ["Ki-Empowered Strikes", "Monastic Tradition Feature"],
        7: ["Evasion", "Stillness of Mind"],
        9: ["Unarmored Movement Improvement"],
        10: ["Purity of Body"],
        11: ["Monastic Tradition Feature"],
        13: ["Tongue of the Sun and Moon"],
        14: ["Diamond Soul"],
        15: ["Timeless Body"],
        17: ["Monastic Tradition Feature"],
        18: ["Empty Body"],
        20: ["Perfect Self"]
      },
      subclasses: [
        createSrdSubclass({
          id: "way-of-the-open-hand",
          name: "Way of the Open Hand",
          summary: "A monastic tradition focused on control, recovery, and precise strikes.",
          featuresByLevel: {
            3: ["Open Hand Technique"],
            6: ["Wholeness of Body"],
            11: ["Tranquility"],
            17: ["Quivering Palm"]
          }
        })
      ]
    }),

    createSrdClassTemplate({
      id: "paladin",
      name: "Paladin",
      summary: "A Charisma half caster with martial armor, auras, and oath features.",
      hitDie: "d10",
      primaryAbilities: ["Strength", "Charisma"],
      savingThrows: ["Wisdom", "Charisma"],
      armorProficiencies: ["Light armor", "Medium armor", "Heavy armor", "Shields"],
      weaponProficiencies: ["Simple weapons", "Martial weapons"],
      toolProficiencies: [],
      skillChoices: {
        choose: 2,
        from: ["Athletics", "Insight", "Intimidation", "Medicine", "Persuasion", "Religion"]
      },
      subclassLevel: 3,
      progressionType: "half-caster",
      spellcastingAbility: "cha",
      spellPreparation: "prepared",
      featuresByLevel: {
        1: ["Divine Sense", "Lay on Hands"],
        2: ["Fighting Style", "Spellcasting", "Divine Smite"],
        3: ["Divine Health", "Sacred Oath"],
        5: ["Extra Attack"],
        6: ["Aura of Protection"],
        7: ["Sacred Oath Feature"],
        10: ["Aura of Courage"],
        11: ["Improved Divine Smite"],
        14: ["Cleansing Touch"],
        15: ["Sacred Oath Feature"],
        18: ["Aura Improvements"],
        20: ["Sacred Oath Feature"]
      },
      subclasses: [
        createSrdSubclass({
          id: "oath-of-devotion",
          name: "Oath of Devotion",
          summary: "A sacred oath focused on protection, honesty, and radiant defense.",
          featuresByLevel: {
            3: ["Oath Spells", "Sacred Weapon", "Turn the Unholy"],
            7: ["Aura of Devotion"],
            15: ["Purity of Spirit"],
            20: ["Holy Nimbus"]
          }
        })
      ]
    }),

    createSrdClassTemplate({
      id: "ranger",
      name: "Ranger",
      summary: "A Dexterity or Strength half caster with exploration and hunting features.",
      hitDie: "d10",
      primaryAbilities: ["Dexterity", "Wisdom"],
      savingThrows: ["Strength", "Dexterity"],
      armorProficiencies: ["Light armor", "Medium armor", "Shields"],
      weaponProficiencies: ["Simple weapons", "Martial weapons"],
      toolProficiencies: [],
      skillChoices: {
        choose: 3,
        from: ["Animal Handling", "Athletics", "Insight", "Investigation", "Nature", "Perception", "Stealth", "Survival"]
      },
      subclassLevel: 3,
      progressionType: "half-caster",
      spellcastingAbility: "wis",
      spellPreparation: "known",
      spellsKnown: { 1: 0, 2: 2, 3: 3, 4: 3, 5: 4, 6: 4, 7: 5, 8: 5, 9: 6, 10: 6, 11: 7, 12: 7, 13: 8, 14: 8, 15: 9, 16: 9, 17: 10, 18: 10, 19: 11, 20: 11 },
      featuresByLevel: {
        1: ["Favored Enemy", "Natural Explorer"],
        2: ["Fighting Style", "Spellcasting"],
        3: ["Ranger Archetype", "Primeval Awareness"],
        5: ["Extra Attack"],
        6: ["Favored Enemy Improvement", "Natural Explorer Improvement"],
        7: ["Ranger Archetype Feature"],
        8: ["Land's Stride"],
        10: ["Natural Explorer Improvement", "Hide in Plain Sight"],
        11: ["Ranger Archetype Feature"],
        14: ["Favored Enemy Improvement", "Vanish"],
        15: ["Ranger Archetype Feature"],
        18: ["Feral Senses"],
        20: ["Foe Slayer"]
      },
      subclasses: [
        createSrdSubclass({
          id: "hunter",
          name: "Hunter",
          summary: "A ranger archetype focused on adaptable combat techniques.",
          featuresByLevel: {
            3: ["Hunter's Prey"],
            7: ["Defensive Tactics"],
            11: ["Multiattack"],
            15: ["Superior Hunter's Defense"]
          }
        })
      ]
    }),

    createSrdClassTemplate({
      id: "rogue",
      name: "Rogue",
      summary: "A Dexterity and skill class with expertise, sneak attack, and evasive features.",
      hitDie: "d8",
      primaryAbilities: ["Dexterity"],
      savingThrows: ["Dexterity", "Intelligence"],
      armorProficiencies: ["Light armor"],
      weaponProficiencies: ["Simple weapons", "Hand crossbows", "Longswords", "Rapiers", "Shortswords"],
      toolProficiencies: ["Thieves' tools"],
      skillChoices: {
        choose: 4,
        from: ["Acrobatics", "Athletics", "Deception", "Insight", "Intimidation", "Investigation", "Perception", "Performance", "Persuasion", "Sleight of Hand", "Stealth"]
      },
      subclassLevel: 3,
      asiLevels: SRD_2014_ROGUE_ASI_LEVELS,
      featuresByLevel: {
        1: ["Expertise", "Sneak Attack", "Thieves' Cant"],
        2: ["Cunning Action"],
        3: ["Roguish Archetype"],
        5: ["Uncanny Dodge"],
        6: ["Expertise"],
        7: ["Evasion"],
        9: ["Roguish Archetype Feature"],
        11: ["Reliable Talent"],
        13: ["Roguish Archetype Feature"],
        14: ["Blindsense"],
        15: ["Slippery Mind"],
        17: ["Roguish Archetype Feature"],
        18: ["Elusive"],
        20: ["Stroke of Luck"]
      },
      subclasses: [
        createSrdSubclass({
          id: "thief",
          name: "Thief",
          summary: "A rogue archetype focused on agility, stealth, and item use.",
          featuresByLevel: {
            3: ["Fast Hands", "Second-Story Work"],
            9: ["Supreme Sneak"],
            13: ["Use Magic Device"],
            17: ["Thief's Reflexes"]
          }
        })
      ]
    }),

    createSrdClassTemplate({
      id: "sorcerer",
      name: "Sorcerer",
      summary: "A Charisma full caster using sorcery points and metamagic.",
      hitDie: "d6",
      primaryAbilities: ["Charisma"],
      savingThrows: ["Constitution", "Charisma"],
      armorProficiencies: [],
      weaponProficiencies: ["Daggers", "Darts", "Slings", "Quarterstaffs", "Light crossbows"],
      toolProficiencies: [],
      skillChoices: {
        choose: 2,
        from: ["Arcana", "Deception", "Insight", "Intimidation", "Persuasion", "Religion"]
      },
      subclassLevel: 1,
      progressionType: "full-caster",
      spellcastingAbility: "cha",
      spellPreparation: "known",
      cantripsKnown: { 1: 4, 4: 5, 10: 6 },
      spellsKnown: { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 10: 11, 11: 12, 12: 12, 13: 13, 14: 13, 15: 14, 16: 14, 17: 15, 18: 15, 19: 15, 20: 15 },
      featuresByLevel: {
        1: ["Spellcasting", "Sorcerous Origin"],
        2: ["Font of Magic"],
        3: ["Metamagic"],
        6: ["Sorcerous Origin Feature"],
        10: ["Metamagic Improvement"],
        14: ["Sorcerous Origin Feature"],
        17: ["Metamagic Improvement"],
        18: ["Sorcerous Origin Feature"],
        20: ["Sorcerous Restoration"]
      },
      subclasses: [
        createSrdSubclass({
          id: "draconic-bloodline",
          name: "Draconic Bloodline",
          summary: "A sorcerous origin with draconic resilience and elemental affinity.",
          featuresByLevel: {
            1: ["Dragon Ancestor", "Draconic Resilience"],
            6: ["Elemental Affinity"],
            14: ["Dragon Wings"],
            18: ["Draconic Presence"]
          }
        })
      ]
    }),

    createSrdClassTemplate({
      id: "warlock",
      name: "Warlock",
      summary: "A Charisma pact caster with invocations, pact magic, and patron features.",
      hitDie: "d8",
      primaryAbilities: ["Charisma"],
      savingThrows: ["Wisdom", "Charisma"],
      armorProficiencies: ["Light armor"],
      weaponProficiencies: ["Simple weapons"],
      toolProficiencies: [],
      skillChoices: {
        choose: 2,
        from: ["Arcana", "Deception", "History", "Intimidation", "Investigation", "Nature", "Religion"]
      },
      subclassLevel: 1,
      progressionType: "pact-magic",
      spellcastingAbility: "cha",
      spellPreparation: "known",
      cantripsKnown: { 1: 2, 4: 3, 10: 4 },
      spellsKnown: { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 10: 10, 11: 11, 12: 11, 13: 12, 14: 12, 15: 13, 16: 13, 17: 14, 18: 14, 19: 15, 20: 15 },
      featuresByLevel: {
        1: ["Otherworldly Patron", "Pact Magic"],
        2: ["Eldritch Invocations"],
        3: ["Pact Boon"],
        6: ["Otherworldly Patron Feature"],
        10: ["Otherworldly Patron Feature"],
        11: ["Mystic Arcanum"],
        13: ["Mystic Arcanum Improvement"],
        14: ["Otherworldly Patron Feature"],
        15: ["Mystic Arcanum Improvement"],
        17: ["Mystic Arcanum Improvement"],
        20: ["Eldritch Master"]
      },
      subclasses: [
        createSrdSubclass({
          id: "fiend-patron",
          name: "The Fiend",
          summary: "A patron option focused on temporary durability and destructive magic.",
          featuresByLevel: {
            1: ["Expanded Spell List", "Dark One's Blessing"],
            6: ["Dark One's Own Luck"],
            10: ["Fiendish Resilience"],
            14: ["Hurl Through Hell"]
          }
        })
      ]
    }),

    createSrdClassTemplate({
      id: "wizard",
      name: "Wizard",
      summary: "An Intelligence full caster with spellbook preparation and arcane tradition features.",
      hitDie: "d6",
      primaryAbilities: ["Intelligence"],
      savingThrows: ["Intelligence", "Wisdom"],
      armorProficiencies: [],
      weaponProficiencies: ["Daggers", "Darts", "Slings", "Quarterstaffs", "Light crossbows"],
      toolProficiencies: [],
      skillChoices: {
        choose: 2,
        from: ["Arcana", "History", "Insight", "Investigation", "Medicine", "Religion"]
      },
      subclassLevel: 2,
      progressionType: "full-caster",
      spellcastingAbility: "int",
      spellPreparation: "spellbook-prepared",
      cantripsKnown: { 1: 3, 4: 4, 10: 5 },
      featuresByLevel: {
        1: ["Spellcasting", "Arcane Recovery"],
        2: ["Arcane Tradition"],
        6: ["Arcane Tradition Feature"],
        10: ["Arcane Tradition Feature"],
        14: ["Arcane Tradition Feature"],
        18: ["Spell Mastery"],
        20: ["Signature Spells"]
      },
      subclasses: [
        createSrdSubclass({
          id: "school-of-evocation",
          name: "School of Evocation",
          summary: "An arcane tradition focused on shaping and strengthening evocation spells.",
          featuresByLevel: {
            2: ["Evocation Savant", "Sculpt Spells"],
            6: ["Potent Cantrip"],
            10: ["Empowered Evocation"],
            14: ["Overchannel"]
          }
        })
      ]
    })
  ]);

  const DEFAULT_SPECIES_TEMPLATES = Object.freeze([
    {
      schemaVersion: SPECIES_SCHEMA_VERSION,
      id: "human",
      name: "Human",
      source: "template",
      summary: "Adaptable people with broad talents and no required subrace.",
      size: "medium",
      speed: 30,
      abilityBonuses: {
        str: 1,
        dex: 1,
        con: 1,
        int: 1,
        wis: 1,
        cha: 1
      },
      languages: ["Common"],
      traits: [
        {
          id: "human-ability-score-increase",
          name: "Ability Score Increase",
          summary: "Each ability score increases by 1.",
          source: "species:human"
        },
        {
          id: "human-language",
          name: "Language",
          summary: "Choose one additional language.",
          source: "species:human"
        }
      ],
      subraces: []
    },

    {
      schemaVersion: SPECIES_SCHEMA_VERSION,
      id: "dwarf",
      name: "Dwarf",
      source: "template",
      summary: "Stout folk with resilience, darkvision, and clan traditions.",
      size: "medium",
      speed: 25,
      abilityBonuses: {
        con: 2
      },
      languages: ["Common", "Dwarvish"],
      damageResistances: ["Poison"],
      toolChoices: {
        choose: 1,
        from: DWARF_TOOL_CHOICES
      },
      traits: [
        {
          id: "dwarf-darkvision",
          name: "Darkvision",
          summary: "You can see in dim light within 60 feet as if it were bright light, and darkness as dim light.",
          source: "species:dwarf"
        },
        {
          id: "dwarf-resilience",
          name: "Dwarven Resilience",
          summary: "You have advantage on saves against poison and resistance to poison damage.",
          source: "species:dwarf"
        },
        {
          id: "dwarf-combat-training",
          name: "Dwarven Combat Training",
          summary: "You are trained with axes and hammers.",
          source: "species:dwarf"
        }
      ],
      weaponProficiencies: ["Battleaxes", "Handaxes", "Light hammers", "Warhammers"],
      subraces: [
        {
          id: "hill-dwarf",
          name: "Hill Dwarf",
          abilityBonuses: {
            wis: 1
          },
          traits: [
            {
              id: "hill-dwarf-toughness",
              name: "Dwarven Toughness",
              summary: "Your hit point maximum increases by 1 per level.",
              source: "subrace:hill-dwarf"
            }
          ]
        },
        {
          id: "mountain-dwarf",
          name: "Mountain Dwarf",
          abilityBonuses: {
            str: 2
          },
          armorProficiencies: ["Light armor", "Medium armor"],
          traits: [
            {
              id: "mountain-dwarf-armor-training",
              name: "Dwarven Armor Training",
              summary: "You are trained with light and medium armor.",
              source: "subrace:mountain-dwarf"
            }
          ]
        }
      ]
    },

    {
      schemaVersion: SPECIES_SCHEMA_VERSION,
      id: "elf",
      name: "Elf",
      source: "template",
      summary: "Keen-sensed folk with trance, charm resistance, and darkvision.",
      size: "medium",
      speed: 30,
      abilityBonuses: {
        dex: 2
      },
      languages: ["Common", "Elvish"],
      skillProficiencies: ["Perception"],
      traits: [
        {
          id: "elf-darkvision",
          name: "Darkvision",
          summary: "You can see in dim light within 60 feet as if it were bright light, and darkness as dim light.",
          source: "species:elf"
        },
        {
          id: "elf-keen-senses",
          name: "Keen Senses",
          summary: "You are proficient in Perception.",
          source: "species:elf"
        },
        {
          id: "elf-fey-ancestry",
          name: "Fey Ancestry",
          summary: "You have advantage on saves against being charmed, and magic cannot put you to sleep.",
          source: "species:elf"
        },
        {
          id: "elf-trance",
          name: "Trance",
          summary: "You rest through a four-hour meditative trance instead of sleeping.",
          source: "species:elf"
        }
      ],
      subraces: [
        {
          id: "high-elf",
          name: "High Elf",
          abilityBonuses: {
            int: 1
          },
          weaponProficiencies: ["Longswords", "Shortswords", "Shortbows", "Longbows"],
          traits: [
            {
              id: "high-elf-cantrip",
              name: "Wizard Cantrip",
              summary: "Choose one wizard cantrip. Intelligence is its spellcasting ability.",
              source: "subrace:high-elf"
            }
          ]
        },
        {
          id: "wood-elf",
          name: "Wood Elf",
          speed: 35,
          abilityBonuses: {
            wis: 1
          },
          weaponProficiencies: ["Longswords", "Shortswords", "Shortbows", "Longbows"],
          traits: [
            {
              id: "wood-elf-fleet",
              name: "Fleet of Foot",
              summary: "Your walking speed is 35 feet.",
              source: "subrace:wood-elf"
            },
            {
              id: "wood-elf-mask",
              name: "Mask of the Wild",
              summary: "You can attempt to hide when lightly obscured by natural phenomena.",
              source: "subrace:wood-elf"
            }
          ]
        },
        {
          id: "dark-elf",
          name: "Dark Elf",
          abilityBonuses: {
            cha: 1
          },
          darkvision: 120,
          weaponProficiencies: ["Rapiers", "Shortswords", "Hand crossbows"],
          traits: [
            {
              id: "dark-elf-superior-darkvision",
              name: "Superior Darkvision",
              summary: "Your darkvision range is 120 feet.",
              source: "subrace:dark-elf"
            },
            {
              id: "dark-elf-magic",
              name: "Drow Magic",
              summary: "You gain Dancing Lights at level 1, Faerie Fire at level 3, and Darkness at level 5. Charisma is your spellcasting ability.",
              source: "subrace:dark-elf"
            },
            {
              id: "dark-elf-sunlight-sensitivity",
              name: "Sunlight Sensitivity",
              summary: "Bright sunlight can hinder your attacks and sight-based Perception checks.",
              source: "subrace:dark-elf"
            }
          ]
        }
      ]
    },

    {
      schemaVersion: SPECIES_SCHEMA_VERSION,
      id: "halfling",
      name: "Halfling",
      source: "template",
      summary: "Small, nimble folk with bravery and remarkable luck.",
      size: "small",
      speed: 25,
      abilityBonuses: {
        dex: 2
      },
      languages: ["Common", "Halfling"],
      traits: [
        {
          id: "halfling-lucky",
          name: "Lucky",
          summary: "When you roll a 1 on an attack, ability check, or saving throw, you may reroll it.",
          source: "species:halfling"
        },
        {
          id: "halfling-brave",
          name: "Brave",
          summary: "You have advantage on saves against being frightened.",
          source: "species:halfling"
        },
        {
          id: "halfling-nimbleness",
          name: "Halfling Nimbleness",
          summary: "You can move through the space of a creature larger than you.",
          source: "species:halfling"
        }
      ],
      subraces: [
        {
          id: "lightfoot-halfling",
          name: "Lightfoot Halfling",
          abilityBonuses: {
            cha: 1
          },
          traits: [
            {
              id: "lightfoot-naturally-stealthy",
              name: "Naturally Stealthy",
              summary: "You can attempt to hide behind creatures larger than you.",
              source: "subrace:lightfoot-halfling"
            }
          ]
        },
        {
          id: "stout-halfling",
          name: "Stout Halfling",
          abilityBonuses: {
            con: 1
          },
          damageResistances: ["Poison"],
          traits: [
            {
              id: "stout-resilience",
              name: "Stout Resilience",
              summary: "You have advantage on poison saves and resistance to poison damage.",
              source: "subrace:stout-halfling"
            }
          ]
        }
      ]
    },

    {
      schemaVersion: SPECIES_SCHEMA_VERSION,
      id: "dragonborn",
      name: "Dragonborn",
      source: "template",
      summary: "Draconic folk with a breath weapon and ancestry-linked resistance.",
      size: "medium",
      speed: 30,
      abilityBonuses: {
        str: 2,
        cha: 1
      },
      languages: ["Common", "Draconic"],
      damageResistances: ["Draconic ancestry choice"],
      traits: [
        {
          id: "dragonborn-ancestry",
          name: "Draconic Ancestry",
          summary: "Choose a dragon ancestry to define your breath weapon damage type and resistance.",
          source: "species:dragonborn"
        },
        {
          id: "dragonborn-breath-weapon",
          name: "Breath Weapon",
          summary: "You can exhale destructive energy determined by your ancestry.",
          source: "species:dragonborn"
        }
      ],
      subraces: []
    },

    {
      schemaVersion: SPECIES_SCHEMA_VERSION,
      id: "gnome",
      name: "Gnome",
      source: "template",
      summary: "Small, clever folk with darkvision and mental resilience.",
      size: "small",
      speed: 25,
      abilityBonuses: {
        int: 2
      },
      languages: ["Common", "Gnomish"],
      traits: [
        {
          id: "gnome-darkvision",
          name: "Darkvision",
          summary: "You can see in dim light within 60 feet as if it were bright light, and darkness as dim light.",
          source: "species:gnome"
        },
        {
          id: "gnome-cunning",
          name: "Gnome Cunning",
          summary: "You have advantage on Intelligence, Wisdom, and Charisma saves against magic.",
          source: "species:gnome"
        }
      ],
      subraces: [
        {
          id: "forest-gnome",
          name: "Forest Gnome",
          abilityBonuses: {
            dex: 1
          },
          traits: [
            {
              id: "forest-gnome-illusion",
              name: "Natural Illusionist",
              summary: "You know the Minor Illusion cantrip. Intelligence is your spellcasting ability.",
              source: "subrace:forest-gnome"
            },
            {
              id: "forest-gnome-small-beasts",
              name: "Speak with Small Beasts",
              summary: "You can communicate simple ideas with small beasts.",
              source: "subrace:forest-gnome"
            }
          ]
        },
        {
          id: "rock-gnome",
          name: "Rock Gnome",
          abilityBonuses: {
            con: 1
          },
          toolProficiencies: ["Tinker's tools"],
          traits: [
            {
              id: "rock-gnome-artificers-lore",
              name: "Artificer's Lore",
              summary: "You add extra knowledge to checks about magic, alchemy, and devices.",
              source: "subrace:rock-gnome"
            },
            {
              id: "rock-gnome-tinker",
              name: "Tinker",
              summary: "You can craft small clockwork devices using tinker's tools.",
              source: "subrace:rock-gnome"
            }
          ]
        }
      ]
    },

    {
      schemaVersion: SPECIES_SCHEMA_VERSION,
      id: "half-elf",
      name: "Half-Elf",
      source: "template",
      summary: "Charismatic folk with elven ancestry and flexible talents.",
      size: "medium",
      speed: 30,
      abilityBonuses: {
        cha: 2
      },
      abilityChoices: {
        mode: "manual",
        summary: "Choose two other abilities for +1 bonuses."
      },
      languages: ["Common", "Elvish"],
      skillChoices: {
        choose: 2,
        from: SKILL_DEFINITIONS.map((skill) => {
          return skill.name;
        })
      },
      traits: [
        {
          id: "half-elf-darkvision",
          name: "Darkvision",
          summary: "You can see in dim light within 60 feet as if it were bright light, and darkness as dim light.",
          source: "species:half-elf"
        },
        {
          id: "half-elf-fey-ancestry",
          name: "Fey Ancestry",
          summary: "You have advantage on saves against being charmed, and magic cannot put you to sleep.",
          source: "species:half-elf"
        },
        {
          id: "half-elf-skill-versatility",
          name: "Skill Versatility",
          summary: "Choose two skill proficiencies.",
          source: "species:half-elf"
        }
      ],
      subraces: []
    },

    {
      schemaVersion: SPECIES_SCHEMA_VERSION,
      id: "half-orc",
      name: "Half-Orc",
      source: "template",
      summary: "Powerful folk with endurance, darkvision, and ferocious strikes.",
      size: "medium",
      speed: 30,
      abilityBonuses: {
        str: 2,
        con: 1
      },
      languages: ["Common", "Orc"],
      skillProficiencies: ["Intimidation"],
      traits: [
        {
          id: "half-orc-darkvision",
          name: "Darkvision",
          summary: "You can see in dim light within 60 feet as if it were bright light, and darkness as dim light.",
          source: "species:half-orc"
        },
        {
          id: "half-orc-menacing",
          name: "Menacing",
          summary: "You are proficient in Intimidation.",
          source: "species:half-orc"
        },
        {
          id: "half-orc-relentless-endurance",
          name: "Relentless Endurance",
          summary: "When dropped to 0 hit points but not killed outright, you can drop to 1 hit point instead.",
          source: "species:half-orc"
        },
        {
          id: "half-orc-savage-attacks",
          name: "Savage Attacks",
          summary: "Your weapon critical hits can add one extra weapon damage die.",
          source: "species:half-orc"
        }
      ],
      subraces: []
    },

    {
      schemaVersion: SPECIES_SCHEMA_VERSION,
      id: "tiefling",
      name: "Tiefling",
      source: "template",
      summary: "Infernal-blooded folk with darkvision, fire resistance, and innate magic.",
      size: "medium",
      speed: 30,
      abilityBonuses: {
        int: 1,
        cha: 2
      },
      languages: ["Common", "Infernal"],
      damageResistances: ["Fire"],
      traits: [
        {
          id: "tiefling-darkvision",
          name: "Darkvision",
          summary: "You can see in dim light within 60 feet as if it were bright light, and darkness as dim light.",
          source: "species:tiefling"
        },
        {
          id: "tiefling-hellish-resistance",
          name: "Hellish Resistance",
          summary: "You have resistance to fire damage.",
          source: "species:tiefling"
        },
        {
          id: "tiefling-infernal-legacy",
          name: "Infernal Legacy",
          summary: "You gain Thaumaturgy at level 1, Hellish Rebuke at level 3, and Darkness at level 5. Charisma is your spellcasting ability.",
          source: "species:tiefling"
        }
      ],
      subraces: []
    }
  ]);

  const DEFAULT_BACKGROUND_TEMPLATES = Object.freeze([
    {
      schemaVersion: BACKGROUND_SCHEMA_VERSION,
      id: "acolyte",
      name: "Acolyte",
      source: "template",
      summary: "Raised in service to a temple, shrine, or religious order.",
      skillChoices: {
        choose: 2,
        from: ["Insight", "Religion"]
      },
      toolChoices: {
        choose: 0,
        from: []
      },
      languageChoices: {
        choose: 2,
        from: []
      },
      equipmentPackageIds: ["acolyte-pack"],
      features: [
        {
          id: "shelter-of-the-faithful",
          name: "Shelter of the Faithful",
          summary: "You can seek modest aid from people who share your faith.",
          source: "background:acolyte"
        }
      ],
      personalityTraits: ["Idealistic", "Ritual-minded"],
      ideals: ["Tradition", "Charity"],
      bonds: ["Temple", "Sacred text"],
      flaws: ["Judgmental", "Naive"]
    },

    {
      schemaVersion: BACKGROUND_SCHEMA_VERSION,
      id: "charlatan",
      name: "Charlatan",
      source: "template",
      summary: "A practiced deceiver with aliases, forged papers, and a quick exit plan.",
      skillChoices: {
        choose: 2,
        from: ["Deception", "Sleight of Hand"]
      },
      toolChoices: {
        choose: 2,
        from: ["Disguise kit", "Forgery kit"]
      },
      languageChoices: {
        choose: 0,
        from: []
      },
      equipmentPackageIds: ["charlatan-pack"],
      features: [
        {
          id: "false-identity",
          name: "False Identity",
          summary: "You maintain a convincing second identity with supporting papers.",
          source: "background:charlatan"
        }
      ],
      personalityTraits: ["Charming", "Careful liar"],
      ideals: ["Independence", "Aspiration"],
      bonds: ["Old mark", "Partner in crime"],
      flaws: ["Greedy", "Overconfident"]
    },

    {
      schemaVersion: BACKGROUND_SCHEMA_VERSION,
      id: "criminal",
      name: "Criminal",
      source: "template",
      summary: "A former or current member of the underworld with contacts and practical skills.",
      skillChoices: {
        choose: 2,
        from: ["Deception", "Stealth"]
      },
      toolChoices: {
        choose: 2,
        from: ["One gaming set", "Thieves' tools"]
      },
      languageChoices: {
        choose: 0,
        from: []
      },
      equipmentPackageIds: ["criminal-pack"],
      features: [
        {
          id: "criminal-contact",
          name: "Criminal Contact",
          summary: "You know how to pass messages through a criminal network.",
          source: "background:criminal"
        }
      ],
      personalityTraits: ["Cautious", "Suspicious"],
      ideals: ["Freedom", "Loyalty"],
      bonds: ["Crew", "Debtor"],
      flaws: ["Paranoid", "Vengeful"]
    },

    {
      schemaVersion: BACKGROUND_SCHEMA_VERSION,
      id: "entertainer",
      name: "Entertainer",
      source: "template",
      summary: "A performer who knows how to win a crowd and find a stage.",
      skillChoices: {
        choose: 2,
        from: ["Acrobatics", "Performance"]
      },
      toolChoices: {
        choose: 2,
        from: ["Disguise kit", "One musical instrument"]
      },
      languageChoices: {
        choose: 0,
        from: []
      },
      equipmentPackageIds: ["entertainer-pack"],
      features: [
        {
          id: "by-popular-demand",
          name: "By Popular Demand",
          summary: "You can often trade performance for lodging and attention.",
          source: "background:entertainer"
        }
      ],
      personalityTraits: ["Dramatic", "Warm"],
      ideals: ["Creativity", "Fame"],
      bonds: ["Old troupe", "Signature routine"],
      flaws: ["Jealous", "Craves applause"]
    },

    {
      schemaVersion: BACKGROUND_SCHEMA_VERSION,
      id: "folk-hero",
      name: "Folk Hero",
      source: "template",
      summary: "A common-born local champion known for standing against danger.",
      skillChoices: {
        choose: 2,
        from: ["Animal Handling", "Survival"]
      },
      toolChoices: {
        choose: 2,
        from: ["One artisan's tools", "Vehicles (land)"]
      },
      languageChoices: {
        choose: 0,
        from: []
      },
      equipmentPackageIds: ["folk-hero-pack"],
      features: [
        {
          id: "rustic-hospitality",
          name: "Rustic Hospitality",
          summary: "Common folk are inclined to shelter you if doing so is not too dangerous.",
          source: "background:folk-hero"
        }
      ],
      personalityTraits: ["Plainspoken", "Protective"],
      ideals: ["Fairness", "Community"],
      bonds: ["Home village", "Family farm"],
      flaws: ["Stubborn", "Distrusts authority"]
    },

    {
      schemaVersion: BACKGROUND_SCHEMA_VERSION,
      id: "guild-artisan",
      name: "Guild Artisan",
      source: "template",
      summary: "A trained craftsperson or merchant tied to a professional guild.",
      skillChoices: {
        choose: 2,
        from: ["Insight", "Persuasion"]
      },
      toolChoices: {
        choose: 1,
        from: ["One artisan's tools"]
      },
      languageChoices: {
        choose: 1,
        from: []
      },
      equipmentPackageIds: ["guild-artisan-pack"],
      features: [
        {
          id: "guild-membership",
          name: "Guild Membership",
          summary: "Your guild can provide contacts, dues-based aid, and professional standing.",
          source: "background:guild-artisan"
        }
      ],
      personalityTraits: ["Precise", "Proud"],
      ideals: ["Craft", "Community"],
      bonds: ["Guildhall", "Masterwork"],
      flaws: ["Perfectionist", "Status-conscious"]
    },

    {
      schemaVersion: BACKGROUND_SCHEMA_VERSION,
      id: "hermit",
      name: "Hermit",
      source: "template",
      summary: "A secluded seeker shaped by isolation, study, or revelation.",
      skillChoices: {
        choose: 2,
        from: ["Medicine", "Religion"]
      },
      toolChoices: {
        choose: 1,
        from: ["Herbalism kit"]
      },
      languageChoices: {
        choose: 1,
        from: []
      },
      equipmentPackageIds: ["hermit-pack"],
      features: [
        {
          id: "discovery",
          name: "Discovery",
          summary: "Your isolation revealed a meaningful truth for the campaign.",
          source: "background:hermit"
        }
      ],
      personalityTraits: ["Quiet", "Reflective"],
      ideals: ["Knowledge", "Self-mastery"],
      bonds: ["Hidden place", "Revelation"],
      flaws: ["Detached", "Blunt"]
    },

    {
      schemaVersion: BACKGROUND_SCHEMA_VERSION,
      id: "noble",
      name: "Noble",
      source: "template",
      summary: "A person of rank, title, or inherited influence.",
      skillChoices: {
        choose: 2,
        from: ["History", "Persuasion"]
      },
      toolChoices: {
        choose: 1,
        from: ["One gaming set"]
      },
      languageChoices: {
        choose: 1,
        from: []
      },
      equipmentPackageIds: ["noble-pack"],
      features: [
        {
          id: "position-of-privilege",
          name: "Position of Privilege",
          summary: "People tend to recognize your status and grant you access to high society.",
          source: "background:noble"
        }
      ],
      personalityTraits: ["Regal", "Measured"],
      ideals: ["Responsibility", "Nobility"],
      bonds: ["Family name", "Estate"],
      flaws: ["Arrogant", "Sheltered"]
    },

    {
      schemaVersion: BACKGROUND_SCHEMA_VERSION,
      id: "outlander",
      name: "Outlander",
      source: "template",
      summary: "A wilderness traveler familiar with trails, omens, and harsh places.",
      skillChoices: {
        choose: 2,
        from: ["Athletics", "Survival"]
      },
      toolChoices: {
        choose: 1,
        from: ["One musical instrument"]
      },
      languageChoices: {
        choose: 1,
        from: []
      },
      equipmentPackageIds: ["outlander-pack"],
      features: [
        {
          id: "wanderer",
          name: "Wanderer",
          summary: "You remember maps and terrain well and can help find food and water in the wild.",
          source: "background:outlander"
        }
      ],
      personalityTraits: ["Restless", "Watchful"],
      ideals: ["Change", "Nature"],
      bonds: ["Tribe", "Homeland"],
      flaws: ["Impulsive", "Distrustful"]
    },

    {
      schemaVersion: BACKGROUND_SCHEMA_VERSION,
      id: "sage",
      name: "Sage",
      source: "template",
      summary: "A scholar trained to research, reason, and preserve knowledge.",
      skillChoices: {
        choose: 2,
        from: ["Arcana", "History"]
      },
      toolChoices: {
        choose: 0,
        from: []
      },
      languageChoices: {
        choose: 2,
        from: []
      },
      equipmentPackageIds: ["sage-pack"],
      features: [
        {
          id: "researcher",
          name: "Researcher",
          summary: "When you do not know lore, you usually know where to look for it.",
          source: "background:sage"
        }
      ],
      personalityTraits: ["Curious", "Analytical"],
      ideals: ["Knowledge", "Logic"],
      bonds: ["Library", "Unanswered question"],
      flaws: ["Pedantic", "Absent-minded"]
    },

    {
      schemaVersion: BACKGROUND_SCHEMA_VERSION,
      id: "sailor",
      name: "Sailor",
      source: "template",
      summary: "A ship-trained traveler used to weather, rigging, and crew life.",
      skillChoices: {
        choose: 2,
        from: ["Athletics", "Perception"]
      },
      toolChoices: {
        choose: 2,
        from: ["Navigator's tools", "Vehicles (water)"]
      },
      languageChoices: {
        choose: 0,
        from: []
      },
      equipmentPackageIds: ["sailor-pack"],
      features: [
        {
          id: "ships-passage",
          name: "Ship's Passage",
          summary: "You can usually secure passage for yourself and companions by calling on maritime ties.",
          source: "background:sailor"
        }
      ],
      personalityTraits: ["Blunt", "Practical"],
      ideals: ["Freedom", "Crew"],
      bonds: ["Ship", "Captain"],
      flaws: ["Superstitious", "Reckless"]
    },

    {
      schemaVersion: BACKGROUND_SCHEMA_VERSION,
      id: "soldier",
      name: "Soldier",
      source: "template",
      summary: "A trained combatant shaped by discipline, rank, and battlefield experience.",
      skillChoices: {
        choose: 2,
        from: ["Athletics", "Intimidation"]
      },
      toolChoices: {
        choose: 2,
        from: ["One gaming set", "Vehicles (land)"]
      },
      languageChoices: {
        choose: 0,
        from: []
      },
      equipmentPackageIds: ["soldier-pack"],
      features: [
        {
          id: "military-rank",
          name: "Military Rank",
          summary: "Soldiers from your old organization recognize your authority and service.",
          source: "background:soldier"
        }
      ],
      personalityTraits: ["Disciplined", "Direct"],
      ideals: ["Duty", "Nation"],
      bonds: ["Unit", "Comrade"],
      flaws: ["Rigid", "Haunted"]
    },

    {
      schemaVersion: BACKGROUND_SCHEMA_VERSION,
      id: "urchin",
      name: "Urchin",
      source: "template",
      summary: "A streetwise survivor who knows city routes, hiding places, and hard lessons.",
      skillChoices: {
        choose: 2,
        from: ["Sleight of Hand", "Stealth"]
      },
      toolChoices: {
        choose: 2,
        from: ["Disguise kit", "Thieves' tools"]
      },
      languageChoices: {
        choose: 0,
        from: []
      },
      equipmentPackageIds: ["urchin-pack"],
      features: [
        {
          id: "city-secrets",
          name: "City Secrets",
          summary: "You know urban shortcuts that can speed travel through settlements.",
          source: "background:urchin"
        }
      ],
      personalityTraits: ["Scrappy", "Observant"],
      ideals: ["Independence", "People"],
      bonds: ["Old neighborhood", "Found family"],
      flaws: ["Distrustful", "Hoarding"]
    }
  ]);

  const DEFAULT_BACKGROUND_EQUIPMENT_PACKAGES = Object.freeze([
    {
      id: "acolyte-pack",
      name: "Acolyte Equipment",
      items: [
        { name: "Holy Symbol", quantity: 1, weight: 1 },
        { name: "Prayer Book", quantity: 1, weight: 5 },
        { name: "Incense", quantity: 5, weight: 0 },
        { name: "Vestments", quantity: 1, weight: 4 },
        { catalogId: "common-clothes", quantity: 1 },
        { catalogId: "belt-pouch", quantity: 1 }
      ],
      currency: { gp: 15 }
    },
    {
      id: "charlatan-pack",
      name: "Charlatan Equipment",
      items: [
        { catalogId: "fine-clothes", quantity: 1 },
        { catalogId: "disguise-kit", quantity: 1 },
        { name: "Con Tools", quantity: 1, weight: 1 },
        { catalogId: "belt-pouch", quantity: 1 }
      ],
      currency: { gp: 15 }
    },
    {
      id: "criminal-pack",
      name: "Criminal Equipment",
      items: [
        { catalogId: "crowbar", quantity: 1 },
        { catalogId: "common-clothes-dark", quantity: 1 },
        { catalogId: "belt-pouch", quantity: 1 }
      ],
      currency: { gp: 15 }
    },
    {
      id: "entertainer-pack",
      name: "Entertainer Equipment",
      items: [
        { catalogId: "musical-instrument", quantity: 1 },
        { name: "Favor of an Admirer", quantity: 1, weight: 0 },
        { catalogId: "costume-clothes", quantity: 1 },
        { catalogId: "belt-pouch", quantity: 1 }
      ],
      currency: { gp: 15 }
    },
    {
      id: "folk-hero-pack",
      name: "Folk Hero Equipment",
      items: [
        { catalogId: "artisan-tools", quantity: 1 },
        { catalogId: "shovel", quantity: 1 },
        { catalogId: "iron-pot", quantity: 1 },
        { catalogId: "common-clothes", quantity: 1 },
        { catalogId: "belt-pouch", quantity: 1 }
      ],
      currency: { gp: 10 }
    },
    {
      id: "guild-artisan-pack",
      name: "Guild Artisan Equipment",
      items: [
        { catalogId: "artisan-tools", quantity: 1 },
        { name: "Letter of Introduction", quantity: 1, weight: 0 },
        { catalogId: "traveler-clothes", quantity: 1 },
        { catalogId: "belt-pouch", quantity: 1 }
      ],
      currency: { gp: 15 }
    },
    {
      id: "hermit-pack",
      name: "Hermit Equipment",
      items: [
        { catalogId: "scroll-case", quantity: 1 },
        { catalogId: "winter-blanket", quantity: 1 },
        { catalogId: "common-clothes", quantity: 1 },
        { catalogId: "herbalism-kit", quantity: 1 }
      ],
      currency: { gp: 5 }
    },
    {
      id: "noble-pack",
      name: "Noble Equipment",
      items: [
        { catalogId: "fine-clothes", quantity: 1 },
        { name: "Signet Ring", quantity: 1, weight: 0 },
        { name: "Scroll of Pedigree", quantity: 1, weight: 0 },
        { catalogId: "purse", quantity: 1 }
      ],
      currency: { gp: 25 }
    },
    {
      id: "outlander-pack",
      name: "Outlander Equipment",
      items: [
        { catalogId: "staff", quantity: 1 },
        { catalogId: "hunting-trap", quantity: 1 },
        { catalogId: "traveler-clothes", quantity: 1 },
        { catalogId: "belt-pouch", quantity: 1 }
      ],
      currency: { gp: 10 }
    },
    {
      id: "sage-pack",
      name: "Sage Equipment",
      items: [
        { catalogId: "ink-bottle", quantity: 1 },
        { catalogId: "ink-pen", quantity: 1 },
        { catalogId: "small-knife", quantity: 1 },
        { name: "Letter from a Dead Colleague", quantity: 1, weight: 0 },
        { catalogId: "common-clothes", quantity: 1 },
        { catalogId: "belt-pouch", quantity: 1 }
      ],
      currency: { gp: 10 }
    },
    {
      id: "sailor-pack",
      name: "Sailor Equipment",
      items: [
        { catalogId: "belaying-pin", quantity: 1 },
        { catalogId: "silk-rope", quantity: 1 },
        { name: "Lucky Charm", quantity: 1, weight: 0 },
        { catalogId: "common-clothes", quantity: 1 },
        { catalogId: "belt-pouch", quantity: 1 }
      ],
      currency: { gp: 10 }
    },
    {
      id: "soldier-pack",
      name: "Soldier Equipment",
      items: [
        { name: "Insignia of Rank", quantity: 1, weight: 0 },
        { name: "Trophy from Fallen Enemy", quantity: 1, weight: 0 },
        { catalogId: "bone-dice-set", quantity: 1 },
        { catalogId: "common-clothes", quantity: 1 },
        { catalogId: "belt-pouch", quantity: 1 }
      ],
      currency: { gp: 10 }
    },
    {
      id: "urchin-pack",
      name: "Urchin Equipment",
      items: [
        { catalogId: "small-knife", quantity: 1 },
        { catalogId: "city-map", quantity: 1 },
        { catalogId: "pet-mouse", quantity: 1 },
        { name: "Token of Parents", quantity: 1, weight: 0 },
        { catalogId: "common-clothes", quantity: 1 },
        { catalogId: "belt-pouch", quantity: 1 }
      ],
      currency: { gp: 10 }
    }
  ]);

  const DEFAULT_EQUIPMENT_CATALOG = Object.freeze([
    {
      id: "padded-armor",
      name: "Padded Armor",
      category: "armor",
      cost: "5 gp",
      quantity: 1,
      weight: 8,
      armorCategory: "light armor",
      baseArmorClass: 11,
      dexterityCap: null,
      stealthDisadvantage: true,
      source: "template"
    },
    {
      id: "leather-armor",
      name: "Leather Armor",
      category: "armor",
      cost: "10 gp",
      quantity: 1,
      weight: 10,
      armorCategory: "light armor",
      baseArmorClass: 11,
      dexterityCap: null,
      source: "template"
    },
    {
      id: "studded-leather-armor",
      name: "Studded Leather Armor",
      category: "armor",
      cost: "45 gp",
      quantity: 1,
      weight: 13,
      armorCategory: "light armor",
      baseArmorClass: 12,
      dexterityCap: null,
      source: "template"
    },
    {
      id: "hide-armor",
      name: "Hide Armor",
      category: "armor",
      cost: "10 gp",
      quantity: 1,
      weight: 12,
      armorCategory: "medium armor",
      baseArmorClass: 12,
      dexterityCap: 2,
      source: "template"
    },
    {
      id: "chain-shirt",
      name: "Chain Shirt",
      category: "armor",
      cost: "50 gp",
      quantity: 1,
      weight: 20,
      armorCategory: "medium armor",
      baseArmorClass: 13,
      dexterityCap: 2,
      source: "template"
    },
    {
      id: "scale-mail",
      name: "Scale Mail",
      category: "armor",
      cost: "50 gp",
      quantity: 1,
      weight: 45,
      armorCategory: "medium armor",
      baseArmorClass: 14,
      dexterityCap: 2,
      stealthDisadvantage: true,
      source: "template"
    },
    {
      id: "breastplate",
      name: "Breastplate",
      category: "armor",
      cost: "400 gp",
      quantity: 1,
      weight: 20,
      armorCategory: "medium armor",
      baseArmorClass: 14,
      dexterityCap: 2,
      source: "template"
    },
    {
      id: "half-plate",
      name: "Half Plate",
      category: "armor",
      cost: "750 gp",
      quantity: 1,
      weight: 40,
      armorCategory: "medium armor",
      baseArmorClass: 15,
      dexterityCap: 2,
      stealthDisadvantage: true,
      source: "template"
    },
    {
      id: "ring-mail",
      name: "Ring Mail",
      category: "armor",
      cost: "30 gp",
      quantity: 1,
      weight: 40,
      armorCategory: "heavy armor",
      baseArmorClass: 14,
      dexterityCap: 0,
      stealthDisadvantage: true,
      source: "template"
    },
    {
      id: "chain-mail",
      name: "Chain Mail",
      category: "armor",
      cost: "75 gp",
      quantity: 1,
      weight: 55,
      armorCategory: "heavy armor",
      baseArmorClass: 16,
      dexterityCap: 0,
      strengthRequirement: 13,
      stealthDisadvantage: true,
      source: "template"
    },
    {
      id: "splint-armor",
      name: "Splint Armor",
      category: "armor",
      cost: "200 gp",
      quantity: 1,
      weight: 60,
      armorCategory: "heavy armor",
      baseArmorClass: 17,
      dexterityCap: 0,
      strengthRequirement: 15,
      stealthDisadvantage: true,
      source: "template"
    },
    {
      id: "plate-armor",
      name: "Plate Armor",
      category: "armor",
      cost: "1500 gp",
      quantity: 1,
      weight: 65,
      armorCategory: "heavy armor",
      baseArmorClass: 18,
      dexterityCap: 0,
      strengthRequirement: 15,
      stealthDisadvantage: true,
      source: "template"
    },
    {
      id: "shield",
      name: "Shield",
      category: "shield",
      cost: "10 gp",
      quantity: 1,
      weight: 6,
      armorCategory: "shield",
      isShield: true,
      source: "template"
    },
    {
      id: "dagger",
      name: "Dagger",
      category: "weapon",
      cost: "2 gp",
      quantity: 1,
      weight: 1,
      weaponType: "simple melee",
      attackAbility: "str",
      damageDice: "1d4",
      damageType: "piercing",
      finesse: true,
      light: true,
      thrown: true,
      rangeNormal: 20,
      rangeLong: 60,
      source: "template"
    },
    {
      id: "mace",
      name: "Mace",
      category: "weapon",
      cost: "5 gp",
      quantity: 1,
      weight: 4,
      weaponType: "simple melee",
      attackAbility: "str",
      damageDice: "1d6",
      damageType: "bludgeoning",
      source: "template"
    },
    {
      id: "quarterstaff",
      name: "Quarterstaff",
      category: "weapon",
      cost: "2 sp",
      quantity: 1,
      weight: 4,
      weaponType: "simple melee",
      attackAbility: "str",
      damageDice: "1d6",
      versatileDamageDice: "1d8",
      damageType: "bludgeoning",
      source: "template"
    },
    {
      id: "shortbow",
      name: "Shortbow",
      category: "weapon",
      cost: "25 gp",
      quantity: 1,
      weight: 2,
      weaponType: "simple ranged",
      attackAbility: "dex",
      damageDice: "1d6",
      damageType: "piercing",
      ranged: true,
      ammunition: true,
      twoHanded: true,
      rangeNormal: 80,
      rangeLong: 320,
      source: "template"
    },
    {
      id: "longsword",
      name: "Longsword",
      category: "weapon",
      cost: "15 gp",
      quantity: 1,
      weight: 3,
      weaponType: "martial melee",
      attackAbility: "str",
      damageDice: "1d8",
      versatileDamageDice: "1d10",
      damageType: "slashing",
      source: "template"
    },
    {
      id: "rapier",
      name: "Rapier",
      category: "weapon",
      cost: "25 gp",
      quantity: 1,
      weight: 2,
      weaponType: "martial melee",
      attackAbility: "dex",
      damageDice: "1d8",
      damageType: "piercing",
      finesse: true,
      source: "template"
    },
    {
      id: "greatsword",
      name: "Greatsword",
      category: "weapon",
      cost: "50 gp",
      quantity: 1,
      weight: 6,
      weaponType: "martial melee",
      attackAbility: "str",
      damageDice: "2d6",
      damageType: "slashing",
      heavy: true,
      twoHanded: true,
      source: "template"
    },
    {
      id: "longbow",
      name: "Longbow",
      category: "weapon",
      cost: "50 gp",
      quantity: 1,
      weight: 2,
      weaponType: "martial ranged",
      attackAbility: "dex",
      damageDice: "1d8",
      damageType: "piercing",
      ranged: true,
      ammunition: true,
      heavy: true,
      twoHanded: true,
      rangeNormal: 150,
      rangeLong: 600,
      source: "template"
    },
    {
      id: "backpack",
      name: "Backpack",
      category: "adventuring-gear",
      cost: "2 gp",
      quantity: 1,
      weight: 5,
      isContainer: true,
      capacityWeight: 30,
      source: "template",
      notes: "Container for carried gear."
    },
    {
      id: "pouch",
      name: "Pouch",
      category: "adventuring-gear",
      cost: "5 sp",
      quantity: 1,
      weight: 1,
      isContainer: true,
      capacityWeight: 6,
      source: "template"
    },
    {
      id: "quiver",
      name: "Quiver",
      category: "adventuring-gear",
      cost: "1 gp",
      quantity: 1,
      weight: 1,
      isContainer: true,
      capacityWeight: 2,
      source: "template"
    },
    {
      id: "arrows-20",
      name: "Arrows (20)",
      category: "adventuring-gear",
      cost: "1 gp",
      quantity: 20,
      weight: 0.05,
      source: "template"
    },
    {
      id: "rope-hempen",
      name: "Hempen Rope (50 ft.)",
      category: "adventuring-gear",
      cost: "1 gp",
      quantity: 1,
      weight: 10,
      source: "template"
    },
    {
      id: "torch",
      name: "Torch",
      category: "adventuring-gear",
      cost: "1 cp",
      quantity: 1,
      weight: 1,
      source: "template"
    },
    {
      id: "rations",
      name: "Rations (1 day)",
      category: "adventuring-gear",
      cost: "5 sp",
      quantity: 1,
      weight: 2,
      source: "template"
    },
    {
      id: "waterskin",
      name: "Waterskin",
      category: "adventuring-gear",
      cost: "2 sp",
      quantity: 1,
      weight: 5,
      source: "template"
    },
    {
      id: "club",
      name: "Club",
      category: "weapon",
      cost: "1 sp",
      quantity: 1,
      weight: 2,
      weaponType: "simple melee",
      attackAbility: "str",
      damageDice: "1d4",
      damageType: "bludgeoning",
      light: true,
      source: "template"
    },
    {
      id: "greatclub",
      name: "Greatclub",
      category: "weapon",
      cost: "2 sp",
      quantity: 1,
      weight: 10,
      weaponType: "simple melee",
      attackAbility: "str",
      damageDice: "1d8",
      damageType: "bludgeoning",
      twoHanded: true,
      source: "template"
    },
    {
      id: "handaxe",
      name: "Handaxe",
      category: "weapon",
      cost: "5 gp",
      quantity: 1,
      weight: 2,
      weaponType: "simple melee",
      attackAbility: "str",
      damageDice: "1d6",
      damageType: "slashing",
      light: true,
      thrown: true,
      rangeNormal: 20,
      rangeLong: 60,
      source: "template"
    },
    {
      id: "javelin",
      name: "Javelin",
      category: "weapon",
      cost: "5 sp",
      quantity: 1,
      weight: 2,
      weaponType: "simple melee",
      attackAbility: "str",
      damageDice: "1d6",
      damageType: "piercing",
      thrown: true,
      rangeNormal: 30,
      rangeLong: 120,
      source: "template"
    },
    {
      id: "light-hammer",
      name: "Light Hammer",
      category: "weapon",
      cost: "2 gp",
      quantity: 1,
      weight: 2,
      weaponType: "simple melee",
      attackAbility: "str",
      damageDice: "1d4",
      damageType: "bludgeoning",
      light: true,
      thrown: true,
      rangeNormal: 20,
      rangeLong: 60,
      source: "template"
    },
    {
      id: "sickle",
      name: "Sickle",
      category: "weapon",
      cost: "1 gp",
      quantity: 1,
      weight: 2,
      weaponType: "simple melee",
      attackAbility: "str",
      damageDice: "1d4",
      damageType: "slashing",
      light: true,
      source: "template"
    },
    {
      id: "spear",
      name: "Spear",
      category: "weapon",
      cost: "1 gp",
      quantity: 1,
      weight: 3,
      weaponType: "simple melee",
      attackAbility: "str",
      damageDice: "1d6",
      versatileDamageDice: "1d8",
      damageType: "piercing",
      thrown: true,
      rangeNormal: 20,
      rangeLong: 60,
      source: "template"
    },
    {
      id: "light-crossbow",
      name: "Light Crossbow",
      category: "weapon",
      cost: "25 gp",
      quantity: 1,
      weight: 5,
      weaponType: "simple ranged",
      attackAbility: "dex",
      damageDice: "1d8",
      damageType: "piercing",
      ranged: true,
      ammunition: true,
      loading: true,
      twoHanded: true,
      rangeNormal: 80,
      rangeLong: 320,
      source: "template"
    },
    {
      id: "dart",
      name: "Dart",
      category: "weapon",
      cost: "5 cp",
      quantity: 1,
      weight: 0.25,
      weaponType: "simple ranged",
      attackAbility: "dex",
      damageDice: "1d4",
      damageType: "piercing",
      finesse: true,
      thrown: true,
      ranged: true,
      rangeNormal: 20,
      rangeLong: 60,
      source: "template"
    },
    {
      id: "sling",
      name: "Sling",
      category: "weapon",
      cost: "1 sp",
      quantity: 1,
      weight: 0,
      weaponType: "simple ranged",
      attackAbility: "dex",
      damageDice: "1d4",
      damageType: "bludgeoning",
      ranged: true,
      ammunition: true,
      rangeNormal: 30,
      rangeLong: 120,
      source: "template"
    },
    {
      id: "battleaxe",
      name: "Battleaxe",
      category: "weapon",
      cost: "10 gp",
      quantity: 1,
      weight: 4,
      weaponType: "martial melee",
      attackAbility: "str",
      damageDice: "1d8",
      versatileDamageDice: "1d10",
      damageType: "slashing",
      source: "template"
    },
    {
      id: "flail",
      name: "Flail",
      category: "weapon",
      cost: "10 gp",
      quantity: 1,
      weight: 2,
      weaponType: "martial melee",
      attackAbility: "str",
      damageDice: "1d8",
      damageType: "bludgeoning",
      source: "template"
    },
    {
      id: "glaive",
      name: "Glaive",
      category: "weapon",
      cost: "20 gp",
      quantity: 1,
      weight: 6,
      weaponType: "martial melee",
      attackAbility: "str",
      damageDice: "1d10",
      damageType: "slashing",
      heavy: true,
      reach: true,
      twoHanded: true,
      source: "template"
    },
    {
      id: "greataxe",
      name: "Greataxe",
      category: "weapon",
      cost: "30 gp",
      quantity: 1,
      weight: 7,
      weaponType: "martial melee",
      attackAbility: "str",
      damageDice: "1d12",
      damageType: "slashing",
      heavy: true,
      twoHanded: true,
      source: "template"
    },
    {
      id: "halberd",
      name: "Halberd",
      category: "weapon",
      cost: "20 gp",
      quantity: 1,
      weight: 6,
      weaponType: "martial melee",
      attackAbility: "str",
      damageDice: "1d10",
      damageType: "slashing",
      heavy: true,
      reach: true,
      twoHanded: true,
      source: "template"
    },
    {
      id: "lance",
      name: "Lance",
      category: "weapon",
      cost: "10 gp",
      quantity: 1,
      weight: 6,
      weaponType: "martial melee",
      attackAbility: "str",
      damageDice: "1d12",
      damageType: "piercing",
      reach: true,
      source: "template"
    },
    {
      id: "maul",
      name: "Maul",
      category: "weapon",
      cost: "10 gp",
      quantity: 1,
      weight: 10,
      weaponType: "martial melee",
      attackAbility: "str",
      damageDice: "2d6",
      damageType: "bludgeoning",
      heavy: true,
      twoHanded: true,
      source: "template"
    },
    {
      id: "morningstar",
      name: "Morningstar",
      category: "weapon",
      cost: "15 gp",
      quantity: 1,
      weight: 4,
      weaponType: "martial melee",
      attackAbility: "str",
      damageDice: "1d8",
      damageType: "piercing",
      source: "template"
    },
    {
      id: "pike",
      name: "Pike",
      category: "weapon",
      cost: "5 gp",
      quantity: 1,
      weight: 18,
      weaponType: "martial melee",
      attackAbility: "str",
      damageDice: "1d10",
      damageType: "piercing",
      heavy: true,
      reach: true,
      twoHanded: true,
      source: "template"
    },
    {
      id: "scimitar",
      name: "Scimitar",
      category: "weapon",
      cost: "25 gp",
      quantity: 1,
      weight: 3,
      weaponType: "martial melee",
      attackAbility: "dex",
      damageDice: "1d6",
      damageType: "slashing",
      finesse: true,
      light: true,
      source: "template"
    },
    {
      id: "shortsword",
      name: "Shortsword",
      category: "weapon",
      cost: "10 gp",
      quantity: 1,
      weight: 2,
      weaponType: "martial melee",
      attackAbility: "dex",
      damageDice: "1d6",
      damageType: "piercing",
      finesse: true,
      light: true,
      source: "template"
    },
    {
      id: "trident",
      name: "Trident",
      category: "weapon",
      cost: "5 gp",
      quantity: 1,
      weight: 4,
      weaponType: "martial melee",
      attackAbility: "str",
      damageDice: "1d6",
      versatileDamageDice: "1d8",
      damageType: "piercing",
      thrown: true,
      rangeNormal: 20,
      rangeLong: 60,
      source: "template"
    },
    {
      id: "war-pick",
      name: "War Pick",
      category: "weapon",
      cost: "5 gp",
      quantity: 1,
      weight: 2,
      weaponType: "martial melee",
      attackAbility: "str",
      damageDice: "1d8",
      damageType: "piercing",
      source: "template"
    },
    {
      id: "warhammer",
      name: "Warhammer",
      category: "weapon",
      cost: "15 gp",
      quantity: 1,
      weight: 2,
      weaponType: "martial melee",
      attackAbility: "str",
      damageDice: "1d8",
      versatileDamageDice: "1d10",
      damageType: "bludgeoning",
      source: "template"
    },
    {
      id: "whip",
      name: "Whip",
      category: "weapon",
      cost: "2 gp",
      quantity: 1,
      weight: 3,
      weaponType: "martial melee",
      attackAbility: "dex",
      damageDice: "1d4",
      damageType: "slashing",
      finesse: true,
      reach: true,
      source: "template"
    },
    {
      id: "blowgun",
      name: "Blowgun",
      category: "weapon",
      cost: "10 gp",
      quantity: 1,
      weight: 1,
      weaponType: "martial ranged",
      attackAbility: "dex",
      damageDice: "1",
      damageType: "piercing",
      ranged: true,
      ammunition: true,
      loading: true,
      rangeNormal: 25,
      rangeLong: 100,
      source: "template"
    },
    {
      id: "hand-crossbow",
      name: "Hand Crossbow",
      category: "weapon",
      cost: "75 gp",
      quantity: 1,
      weight: 3,
      weaponType: "martial ranged",
      attackAbility: "dex",
      damageDice: "1d6",
      damageType: "piercing",
      ranged: true,
      ammunition: true,
      light: true,
      loading: true,
      rangeNormal: 30,
      rangeLong: 120,
      source: "template"
    },
    {
      id: "heavy-crossbow",
      name: "Heavy Crossbow",
      category: "weapon",
      cost: "50 gp",
      quantity: 1,
      weight: 18,
      weaponType: "martial ranged",
      attackAbility: "dex",
      damageDice: "1d10",
      damageType: "piercing",
      ranged: true,
      ammunition: true,
      heavy: true,
      loading: true,
      twoHanded: true,
      rangeNormal: 100,
      rangeLong: 400,
      source: "template"
    },
    {
      id: "net",
      name: "Net",
      category: "weapon",
      cost: "1 gp",
      quantity: 1,
      weight: 3,
      weaponType: "martial ranged",
      attackAbility: "dex",
      damageDice: "",
      damageType: "",
      ranged: true,
      thrown: true,
      rangeNormal: 5,
      rangeLong: 15,
      source: "template"
    },
    {
      id: "crossbow-bolts-20",
      name: "Crossbow Bolts (20)",
      category: "adventuring-gear",
      cost: "1 gp",
      quantity: 20,
      weight: 0.075,
      ammunition: true,
      source: "template"
    },
    {
      id: "sling-bullets-20",
      name: "Sling Bullets (20)",
      category: "adventuring-gear",
      cost: "4 cp",
      quantity: 20,
      weight: 0.075,
      ammunition: true,
      source: "template"
    },
    {
      id: "blowgun-needles-50",
      name: "Blowgun Needles (50)",
      category: "adventuring-gear",
      cost: "1 gp",
      quantity: 50,
      weight: 0.02,
      ammunition: true,
      source: "template"
    },
    {
      id: "belt-pouch",
      name: "Belt Pouch",
      category: "adventuring-gear",
      cost: "5 sp",
      quantity: 1,
      weight: 1,
      isContainer: true,
      capacityWeight: 6,
      source: "template"
    },
    {
      id: "purse",
      name: "Purse",
      category: "adventuring-gear",
      cost: "5 sp",
      quantity: 1,
      weight: 1,
      isContainer: true,
      capacityWeight: 6,
      source: "template"
    },
    {
      id: "common-clothes",
      name: "Common Clothes",
      category: "clothing",
      cost: "5 sp",
      quantity: 1,
      weight: 3,
      source: "template"
    },
    {
      id: "common-clothes-dark",
      name: "Common Clothes, Dark",
      category: "clothing",
      cost: "5 sp",
      quantity: 1,
      weight: 3,
      source: "template"
    },
    {
      id: "fine-clothes",
      name: "Fine Clothes",
      category: "clothing",
      cost: "15 gp",
      quantity: 1,
      weight: 6,
      source: "template"
    },
    {
      id: "costume-clothes",
      name: "Costume Clothes",
      category: "clothing",
      cost: "5 gp",
      quantity: 1,
      weight: 4,
      source: "template"
    },
    {
      id: "traveler-clothes",
      name: "Traveler's Clothes",
      category: "clothing",
      cost: "2 gp",
      quantity: 1,
      weight: 4,
      source: "template"
    },
    {
      id: "disguise-kit",
      name: "Disguise Kit",
      category: "tool",
      cost: "25 gp",
      quantity: 1,
      weight: 3,
      source: "template"
    },
    {
      id: "forgery-kit",
      name: "Forgery Kit",
      category: "tool",
      cost: "15 gp",
      quantity: 1,
      weight: 5,
      source: "template"
    },
    {
      id: "thieves-tools",
      name: "Thieves' Tools",
      category: "tool",
      cost: "25 gp",
      quantity: 1,
      weight: 1,
      source: "template"
    },
    {
      id: "herbalism-kit",
      name: "Herbalism Kit",
      category: "tool",
      cost: "5 gp",
      quantity: 1,
      weight: 3,
      source: "template"
    },
    {
      id: "artisan-tools",
      name: "Artisan's Tools",
      category: "tool",
      cost: "5 gp",
      quantity: 1,
      weight: 5,
      source: "template",
      notes: "Choose the specific artisan's tools granted by the background."
    },
    {
      id: "musical-instrument",
      name: "Musical Instrument",
      category: "tool",
      cost: "2 gp",
      quantity: 1,
      weight: 3,
      source: "template",
      notes: "Choose the specific instrument granted by the background."
    },
    {
      id: "bone-dice-set",
      name: "Bone Dice Set",
      category: "tool",
      cost: "1 sp",
      quantity: 1,
      weight: 0,
      source: "template"
    },
    {
      id: "crowbar",
      name: "Crowbar",
      category: "adventuring-gear",
      cost: "2 gp",
      quantity: 1,
      weight: 5,
      source: "template"
    },
    {
      id: "shovel",
      name: "Shovel",
      category: "adventuring-gear",
      cost: "2 gp",
      quantity: 1,
      weight: 5,
      source: "template"
    },
    {
      id: "iron-pot",
      name: "Iron Pot",
      category: "adventuring-gear",
      cost: "2 gp",
      quantity: 1,
      weight: 10,
      source: "template"
    },
    {
      id: "scroll-case",
      name: "Scroll Case",
      category: "adventuring-gear",
      cost: "1 gp",
      quantity: 1,
      weight: 1,
      source: "template"
    },
    {
      id: "winter-blanket",
      name: "Winter Blanket",
      category: "adventuring-gear",
      cost: "5 sp",
      quantity: 1,
      weight: 3,
      source: "template"
    },
    {
      id: "staff",
      name: "Staff",
      category: "adventuring-gear",
      cost: "5 sp",
      quantity: 1,
      weight: 4,
      source: "template"
    },
    {
      id: "hunting-trap",
      name: "Hunting Trap",
      category: "adventuring-gear",
      cost: "5 gp",
      quantity: 1,
      weight: 25,
      source: "template"
    },
    {
      id: "ink-bottle",
      name: "Bottle of Ink",
      category: "adventuring-gear",
      cost: "10 gp",
      quantity: 1,
      weight: 0,
      source: "template"
    },
    {
      id: "ink-pen",
      name: "Ink Pen",
      category: "adventuring-gear",
      cost: "2 cp",
      quantity: 1,
      weight: 0,
      source: "template"
    },
    {
      id: "small-knife",
      name: "Small Knife",
      category: "adventuring-gear",
      cost: "2 sp",
      quantity: 1,
      weight: 0.5,
      source: "template"
    },
    {
      id: "belaying-pin",
      name: "Belaying Pin",
      category: "adventuring-gear",
      cost: "1 sp",
      quantity: 1,
      weight: 2,
      source: "template"
    },
    {
      id: "silk-rope",
      name: "Silk Rope (50 ft.)",
      category: "adventuring-gear",
      cost: "10 gp",
      quantity: 1,
      weight: 5,
      source: "template"
    },
    {
      id: "city-map",
      name: "Map of Home City",
      category: "adventuring-gear",
      cost: "1 gp",
      quantity: 1,
      weight: 0,
      source: "template"
    },
    {
      id: "pet-mouse",
      name: "Pet Mouse",
      category: "adventuring-gear",
      cost: "1 cp",
      quantity: 1,
      weight: 0,
      source: "template"
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

    const allClasses = getAllClassTemplates();

    return (
      allClasses.find((classData) => {
        return classData.id === primaryClass?.classId;
      }) ||

      allClasses.find((classData) => {
        return classData.name === primaryClass?.className;
      }) ||
      null
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

  function recalculateClassTotalLevel(
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

    character.classProgression.totalLevel =
      clampLevel(total || 1);

    return character.classProgression.totalLevel;
  }

  function blockMulticlassEdit(actionText) {
    const message =
      `${actionText} is not available for imported multiclass characters yet. The existing class data was preserved.`;

    setStatus(message);

    if (typeof alert === "function") {
      alert(message);
    }

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
      classId: selectedClass.id,
      className: selectedClass.name,
      source: selectedClass.source,
      level:
        oldPrimaryClass?.level ||
        totalLevel,
      subclassId: "",
      subclassName: "",
      templateSnapshot: cloneData(selectedClass),
      choices: {}
    };

    creatorState.draft
      .classProgression
      .classes = [
        selectedEntry
      ];

    recalculateClassTotalLevel(
      creatorState.draft
    );

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

  function markDraftChanged() {
    creatorState.dirty = true;
    persistDraftToSession();

    if (typeof document !== "undefined") {
      renderActionBar();
      refreshBuilderChrome();
    }
  }

  function getDraftStorageKey() {
    return (
      "homebrewGodCharacterDraft:" +
      (getRoomCode() || "no-room")
    );
  }

  function persistDraftToSession() {
    if (typeof sessionStorage === "undefined") {
      return;
    }

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

    creatorState.draft
      .combat
      .proficiencyBonus =
        getGenericProficiencyBonus(level);

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

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

    setDraftValue(path, value);
    persistDraftToSession();
    renderActionBar();
    refreshBuilderChrome();
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

  function refreshBuilderChrome() {
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

    if (W.stepRail) {
      W.stepRail.innerHTML =
        renderStepRail();
    }
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

    if (
      !confirmDiscardUnsavedDraft(
        "opening another character"
      )
    ) {
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

    if (
      !confirmDiscardUnsavedDraft(
        "duplicating another character"
      )
    ) {
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

    if (
      selectedSpecies &&
      creatorState.draft
        .species
        .source !== "custom"
    ) {
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

  function getSection11SelectedSpeciesTemplate() {
    const species =
      creatorState.draft.species || {};

    return (
      species.templateSnapshot ||
      getAllSpeciesTemplates()
        .find((template) => {
          return template.id === species.id;
        }) ||
      null
    );
  }

  function getSection11SelectedSubrace(
    species = getSection11SelectedSpeciesTemplate()
  ) {
    const subraceId =
      cleanString(
        creatorState.draft
          .species
          .choices
          ?.subraceId
      );

    if (!subraceId) {
      return null;
    }

    return (
      (
        Array.isArray(species?.subraces)
          ? species.subraces
          : []
      ).find((subrace) => {
        return subrace.id === subraceId;
      }) ||
      null
    );
  }

  function clearSection11SpeciesMechanics() {
    removeAbilityBonusSourcesByPrefix([
      "species:",
      "subrace:",
      "species-choice:"
    ]);

    removeSkillProficiencySourcesByPrefix([
      "species:",
      "subrace:",
      "species-choice:"
    ]);

    removeListProficiencySourcesByPrefix([
      "species:",
      "subrace:",
      "species-choice:"
    ]);

    removeInnateSpellsBySourcePrefixes([
      "species:",
      "subrace:",
      "species-choice:"
    ]);
  }

  function addSection11SkillProficiencies(
    skillNames,
    sourceName
  ) {
    cleanArray(skillNames)
      .forEach((skillName) => {
        const skill =
          SKILL_DEFINITIONS.find((item) => {
            return (
              item.id ===
                makeSafeId(
                  skillName,
                  "skill"
                ) ||
              item.name.toLowerCase() ===
                skillName.toLowerCase()
            );
          });

        if (!skill) {
          return;
        }

        const current =
          getSection14SkillEntry(skill);

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
                sourceName
              ])
            ]
          }
        );
      });
  }

  function applySection11MechanicBlock(
    block,
    sourceName
  ) {
    if (!block || !sourceName) {
      return;
    }

    setAbilityBonusSource(
      sourceName,
      block.abilityBonuses || {}
    );

    setSourceProficiencyList(
      "languages",
      block.languages || [],
      sourceName
    );

    setSourceProficiencyList(
      "tools",
      block.toolProficiencies || [],
      sourceName
    );

    setSourceProficiencyList(
      "weapons",
      block.weaponProficiencies || [],
      sourceName
    );

    setSourceProficiencyList(
      "armor",
      block.armorProficiencies || [],
      sourceName
    );

    addSection11SkillProficiencies(
      block.skillProficiencies || [],
      sourceName
    );
  }

  function getSection11DragonbornAncestry() {
    const ancestryId =
      cleanString(
        creatorState.draft
          .species
          .choices
          ?.draconicAncestry
      );

    return (
      SECTION11_DRAGONBORN_ANCESTRIES
        .find((ancestry) => {
          return ancestry.id === ancestryId;
        }) ||
      null
    );
  }

  function getSection11ChoiceSource(
    choiceId
  ) {
    return choiceId
      ? `species-choice:${choiceId}`
      : "";
  }

  function getSection11LanguageChoices({
    exclude = []
  } = {}) {
    const excluded =
      cleanArray(exclude)
        .map((language) => {
          return language.toLowerCase();
        });

    return [
      {
        value: "",
        label: "Choose language"
      },
      ...STANDARD_LANGUAGE_OPTIONS
        .filter((language) => {
          return !excluded.includes(
            language.toLowerCase()
          );
        })
        .map((language) => {
          return {
            value: language,
            label: language
          };
        })
    ];
  }

  function getSection11SkillChoices() {
    return [
      {
        value: "",
        label: "Choose skill"
      },
      ...SKILL_DEFINITIONS.map((skill) => {
        return {
          value: skill.id,
          label: skill.name
        };
      })
    ];
  }

  function isSection11AbilityChoiceValid(
    abilityId,
    {
      allowCharisma = true
    } = {}
  ) {
    const cleanAbilityId =
      cleanString(abilityId);

    if (!cleanAbilityId) {
      return false;
    }

    if (
      !allowCharisma &&
      cleanAbilityId === "cha"
    ) {
      return false;
    }

    return ABILITY_DEFINITIONS
      .some((ability) => {
        return ability.id === cleanAbilityId;
      });
  }

  function isSection11SkillChoiceValid(
    skillId
  ) {
    const cleanSkillId =
      cleanString(skillId);

    if (!cleanSkillId) {
      return false;
    }

    return SKILL_DEFINITIONS
      .some((skill) => {
        return skill.id === cleanSkillId;
      });
  }

  function isSection11LanguageChoiceValid(
    language,
    {
      exclude = []
    } = {}
  ) {
    const cleanLanguage =
      cleanString(language);

    if (!cleanLanguage) {
      return false;
    }

    const excluded =
      cleanArray(exclude)
        .map((item) => {
          return item.toLowerCase();
        });

    if (
      excluded.includes(
        cleanLanguage.toLowerCase()
      )
    ) {
      return false;
    }

    return STANDARD_LANGUAGE_OPTIONS
      .some((option) => {
        return (
          option.toLowerCase() ===
          cleanLanguage.toLowerCase()
        );
      });
  }

  function removeInnateSpellsBySourcePrefixes(
    prefixes
  ) {
    const cleanPrefixes =
      cleanArray(prefixes);

    if (!cleanPrefixes.length) {
      return;
    }

    const magic =
      creatorState.draft.magic;

    magic.innateSpells =
      (Array.isArray(magic.innateSpells)
        ? magic.innateSpells
        : []
      ).filter((spell) => {
        const source =
          cleanString(
            spell.source ||
            spell.innateSource
          );

        return !cleanPrefixes.some(
          (prefix) => {
            return source.startsWith(prefix);
          }
        );
      });
  }

  function setInnateSpellsForSource(
    sourceName,
    spells
  ) {
    const cleanSource =
      cleanString(sourceName);

    if (!cleanSource) {
      return;
    }

    const magic =
      creatorState.draft.magic;

    magic.innateSpells =
      (Array.isArray(magic.innateSpells)
        ? magic.innateSpells
        : []
      ).filter((spell) => {
        return !sourceMatches(
          spell.source ||
          spell.innateSource,
          cleanSource
        );
      });

    (Array.isArray(spells) ? spells : [])
      .forEach((spell) => {
        magic.innateSpells.push(
          normalizeSection16Spell(
            {
              ...spell,
              id:
                spell.id ||
                makeSafeId(
                  `${cleanSource}-${spell.name}`,
                  "innate-spell"
                ),
              source: cleanSource,
              innateSource: cleanSource,
              innate: true,
              manualOverride: true,
              spellcastingAbility:
                spell.spellcastingAbility || ""
            },
            cleanSource
          )
        );
      });
  }

  function getSection11HalfElfAbilityChoices() {
    const choices =
      creatorState.draft
        .species
        .choices || {};

    return [
      cleanString(
        choices.halfElfAbilityOne
      ),
      cleanString(
        choices.halfElfAbilityTwo
      )
    ].filter((abilityId) => {
      return isSection11AbilityChoiceValid(
        abilityId
      );
    });
  }

  function applySection11SpeciesChoiceMechanics(
    traits
  ) {
    const speciesId =
      cleanString(
        creatorState.draft
          .species
          .id
      );

    if (speciesId === "half-elf") {
      const abilityChoices =
        getSection11HalfElfAbilityChoices();

      const uniqueChoices = [
        ...new Set(
          abilityChoices.filter((abilityId) => {
            return abilityId !== "cha";
          })
        )
      ];

      const bonusMap =
        createAbilityMap(0);

      if (uniqueChoices.length === 2) {
        uniqueChoices.forEach((abilityId) => {
          bonusMap[abilityId] += 1;
        });
      }

      setAbilityBonusSource(
        getSection11ChoiceSource(
          "half-elf"
        ),
        bonusMap
      );

      const choiceSource =
        getSection11ChoiceSource(
          "half-elf"
        );

      const choices =
        creatorState.draft
          .species
          .choices || {};

      const selectedSkills = [
        cleanString(
          choices.halfElfSkillOne
        ),
        cleanString(
          choices.halfElfSkillTwo
        )
      ]
        .filter(Boolean)
        .filter((skillId) => {
          return isSection11SkillChoiceValid(
            skillId
          );
        })
        .map((skillId) => {
          return SKILL_DEFINITIONS
            .find((skill) => {
              return skill.id === skillId;
            })?.name || "";
        })
        .filter(Boolean);

      if (
        new Set(selectedSkills).size === 2
      ) {
        addSection11SkillProficiencies(
          selectedSkills,
          choiceSource
        );
      }

      const language =
        cleanString(
          choices.halfElfLanguage
        );

      if (
        isSection11LanguageChoiceValid(
          language,
          {
            exclude: [
              "Common",
              "Elvish"
            ]
          }
        )
      ) {
        setSourceProficiencyList(
          "languages",
          [language],
          choiceSource
        );
      }
    }

    if (speciesId === "dwarf") {
      const tool =
        cleanString(
          creatorState.draft
            .species
            .choices
            ?.dwarfTool
        );

      if (
        DWARF_TOOL_CHOICES
          .includes(tool)
      ) {
        setSourceProficiencyList(
          "tools",
          [tool],
          getSection11ChoiceSource(
            "dwarf"
          )
        );
      }
    }

    if (speciesId === "human") {
      const language =
        cleanString(
          creatorState.draft
            .species
            .choices
            ?.humanLanguage
        );

      if (
        isSection11LanguageChoiceValid(
          language,
          {
            exclude: ["Common"]
          }
        )
      ) {
        setSourceProficiencyList(
          "languages",
          [language],
          getSection11ChoiceSource(
            "human"
          )
        );
      }
    }

    const selectedSubrace =
      getSection11SelectedSubrace();

    if (
      speciesId === "elf" &&
      selectedSubrace?.id === "high-elf"
    ) {
      const choices =
        creatorState.draft
          .species
          .choices || {};

      const choiceSource =
        getSection11ChoiceSource(
          "high-elf"
        );

      const language =
        cleanString(
          choices.highElfLanguage
        );

      if (
        isSection11LanguageChoiceValid(
          language,
          {
            exclude: [
              "Common",
              "Elvish"
            ]
          }
        )
      ) {
        setSourceProficiencyList(
          "languages",
          [language],
          choiceSource
        );
      }

      const cantrip =
        cleanString(
          choices.highElfCantrip
        );

      if (
        WIZARD_CANTRIP_CHOICES_2014
          .includes(cantrip)
      ) {
        setInnateSpellsForSource(
          choiceSource,
          [
            {
              id:
                `high-elf-${makeSafeId(
                  cantrip,
                  "cantrip"
                )}`,
              name: cantrip,
              level: 0,
              school: "Wizard cantrip",
              spellcastingAbility: "int",
              castingTime: "1 action",
              range: "See spell",
              duration: "See spell",
              components: "",
              summary:
                "High Elf wizard cantrip."
            }
          ]
        );
      }
    }

    if (
      speciesId === "elf" &&
      selectedSubrace?.id === "dark-elf"
    ) {
      const level =
        clampLevel(
          creatorState.draft
            .classProgression
            .totalLevel || 1
        );

      setInnateSpellsForSource(
        "subrace:dark-elf",
        DARK_ELF_INNATE_SPELLS_2014
          .filter((spell) => {
            return level >=
              safeNumber(
                spell.minimumLevel,
                1
              );
          })
          .map((spell) => {
            return {
              ...spell,
              spellcastingAbility: "cha"
            };
          })
      );
    }

    if (
      speciesId === "gnome" &&
      selectedSubrace?.id === "forest-gnome"
    ) {
      setInnateSpellsForSource(
        "subrace:forest-gnome",
        FOREST_GNOME_INNATE_SPELLS_2014
          .map((spell) => {
            return {
              ...spell,
              spellcastingAbility: "int"
            };
          })
      );
    }

    if (speciesId === "tiefling") {
      const level =
        clampLevel(
          creatorState.draft
            .classProgression
            .totalLevel || 1
        );

      setInnateSpellsForSource(
        "species:tiefling",
        TIEFLING_INNATE_SPELLS_2014
          .filter((spell) => {
            return level >=
              safeNumber(
                spell.minimumLevel,
                1
              );
          })
          .map((spell) => {
            return {
              ...spell,
              spellcastingAbility: "cha"
            };
          })
      );
    }

    if (speciesId === "dragonborn") {
      const ancestry =
        getSection11DragonbornAncestry();

      if (ancestry) {
        traits.push({
          id:
            `dragonborn-${ancestry.id}-ancestry`,
          name:
            `${ancestry.name} Dragon Ancestry`,
          summary:
            `Your breath weapon and damage resistance use ${ancestry.damageType.toLowerCase()} damage.`,
          source:
            "species:dragonborn"
        });

        creatorState.draft
          .species
          .damageResistances =
            [ancestry.damageType];
      } else {
        creatorState.draft
          .species
          .damageResistances = [];
      }
    }
  }

  function applySection11SpeciesMechanics() {
    const species =
      getSection11SelectedSpeciesTemplate();

    if (!species) {
      return;
    }

    const subrace =
      getSection11SelectedSubrace(
        species
      );

    const speciesSource =
      getSpeciesSourceLabel(
        species
      );

    const subraceSource =
      getSubraceSourceLabel(
        subrace
      );

    applySection11MechanicBlock(
      species,
      speciesSource
    );

    applySection11MechanicBlock(
      subrace,
      subraceSource
    );

    creatorState.draft.identity.size =
      subrace?.size ||
      species.size ||
      "medium";

    creatorState.draft
      .combat
      .speed
      .walk =
        Math.max(
          0,
          safeNumber(
            subrace?.speed ??
            species.speed,
            30
          )
        );

    const traits = [
      ...(
        Array.isArray(species.traits)
          ? species.traits
          : []
      ),
      ...(
        Array.isArray(subrace?.traits)
          ? subrace.traits
          : []
      )
    ];

    applySection11SpeciesChoiceMechanics(
      traits
    );

    creatorState.draft
      .species
      .traits =
        cloneData(traits);

    creatorState.draft
      .features
      .speciesTraits =
        cloneData(traits);

    recalculateAbilityTotals(
      creatorState.draft
    );
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

    clearSection11SpeciesMechanics();

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

      choices: {
        subraceId: ""
      },

      traits:
        cloneData(
          species.traits ||
          []
        )
    };

    applySection11SpeciesMechanics();

    applyCompatibilityAliases(
      creatorState.draft
    );

    markDraftChanged();

    return true;
  }

  function chooseSection11Subrace(
    subraceId
  ) {
    const species =
      getSection11SelectedSpeciesTemplate();

    const subrace =
      (
        Array.isArray(species?.subraces)
          ? species.subraces
          : []
      ).find((candidate) => {
        return candidate.id === subraceId;
      });

    if (!species || !subrace) {
      return false;
    }

    clearSection11SpeciesMechanics();

    creatorState.draft
      .species
      .choices =
        creatorState.draft
          .species
          .choices || {};

    creatorState.draft
      .species
      .choices
      .subraceId =
        subrace.id;

    creatorState.draft
      .species
      .choices
      .subraceName =
        subrace.name;

    applySection11SpeciesMechanics();

    applyCompatibilityAliases(
      creatorState.draft
    );

    markDraftChanged();

    return true;
  }

  function applySection11SpeciesChoices() {
    const speciesId =
      cleanString(
        creatorState.draft
          .species
          .id
      );

    creatorState.draft
      .species
      .choices =
        creatorState.draft
          .species
          .choices || {};

    if (speciesId === "dragonborn") {
      const ancestryId =
        cleanString(
          $("ccDragonbornAncestry")
            ?.value
        );

      if (!ancestryId) {
        alert(
          "Choose a dragon ancestry."
        );

        return false;
      }

      const ancestry =
        SECTION11_DRAGONBORN_ANCESTRIES
          .find((candidate) => {
            return candidate.id === ancestryId;
          });

      if (!ancestry) {
        return false;
      }

      creatorState.draft
        .species
        .choices
        .draconicAncestry =
          ancestry.id;

      creatorState.draft
        .species
        .choices
        .draconicAncestryName =
          ancestry.name;
    }

    if (speciesId === "half-elf") {
      const firstAbility =
        cleanString(
          $("ccHalfElfAbilityOne")
            ?.value
        );

      const secondAbility =
        cleanString(
          $("ccHalfElfAbilityTwo")
            ?.value
        );

      if (
        !isSection11AbilityChoiceValid(
          firstAbility,
          {
            allowCharisma: false
          }
        ) ||
        !isSection11AbilityChoiceValid(
          secondAbility,
          {
            allowCharisma: false
          }
        ) ||
        firstAbility === secondAbility ||
        firstAbility === "cha" ||
        secondAbility === "cha"
      ) {
        alert(
          "Choose two different Half-Elf ability bonuses other than Charisma."
        );

        return false;
      }

      const firstSkill =
        cleanString(
          $("ccHalfElfSkillOne")
            ?.value
        );

      const secondSkill =
        cleanString(
          $("ccHalfElfSkillTwo")
            ?.value
        );

      if (
        !isSection11SkillChoiceValid(
          firstSkill
        ) ||
        !isSection11SkillChoiceValid(
          secondSkill
        ) ||
        firstSkill === secondSkill
      ) {
        alert(
          "Choose two different Half-Elf skill proficiencies."
        );

        return false;
      }

      const language =
        cleanString(
          $("ccHalfElfLanguage")
            ?.value
        );

      if (
        !isSection11LanguageChoiceValid(
          language,
          {
            exclude: [
              "Common",
              "Elvish"
            ]
          }
        )
      ) {
        alert(
          "Choose a Half-Elf additional language."
        );

        return false;
      }

      creatorState.draft
        .species
        .choices
        .halfElfAbilityOne =
          firstAbility;

      creatorState.draft
        .species
        .choices
        .halfElfAbilityTwo =
          secondAbility;

      creatorState.draft
        .species
        .choices
        .halfElfSkillOne =
          firstSkill;

      creatorState.draft
        .species
        .choices
        .halfElfSkillTwo =
          secondSkill;

      creatorState.draft
        .species
        .choices
        .halfElfLanguage =
          language;
    }

    if (speciesId === "dwarf") {
      const tool =
        cleanString(
          $("ccDwarfToolChoice")
            ?.value
        );

      if (
        !DWARF_TOOL_CHOICES
          .includes(tool)
      ) {
        alert(
          "Choose a Dwarf tool proficiency."
        );

        return false;
      }

      creatorState.draft
        .species
        .choices
        .dwarfTool =
          tool;
    }

    if (speciesId === "human") {
      const language =
        cleanString(
          $("ccHumanLanguage")
            ?.value
        );

      if (
        !isSection11LanguageChoiceValid(
          language,
          {
            exclude: ["Common"]
          }
        )
      ) {
        alert(
          "Choose a Human additional language."
        );

        return false;
      }

      creatorState.draft
        .species
        .choices
        .humanLanguage =
          language;
    }

    if (
      speciesId === "elf" &&
      getSection11SelectedSubrace()?.id ===
        "high-elf"
    ) {
      const language =
        cleanString(
          $("ccHighElfLanguage")
            ?.value
        );

      const cantrip =
        cleanString(
          $("ccHighElfCantrip")
            ?.value
        );

      if (
        !isSection11LanguageChoiceValid(
          language,
          {
            exclude: [
              "Common",
              "Elvish"
            ]
          }
        )
      ) {
        alert(
          "Choose a High Elf additional language."
        );

        return false;
      }

      if (
        !WIZARD_CANTRIP_CHOICES_2014
          .includes(cantrip)
      ) {
        alert(
          "Choose a High Elf wizard cantrip."
        );

        return false;
      }

      creatorState.draft
        .species
        .choices
        .highElfLanguage =
          language;

      creatorState.draft
        .species
        .choices
        .highElfCantrip =
          cantrip;
    }

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

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

    clearSection11SpeciesMechanics();

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

    const selectedSpeciesTemplate =
      getSection11SelectedSpeciesTemplate();

    const selectedSubrace =
      getSection11SelectedSubrace(
        selectedSpeciesTemplate
      );

    const subraceCards =
      (
        Array.isArray(
          selectedSpeciesTemplate?.subraces
        )
          ? selectedSpeciesTemplate.subraces
          : []
      )
        .map((subrace) => {
          const selected =
            selectedSubrace?.id ===
            subrace.id;

          const abilityText =
            Object.entries(
              subrace.abilityBonuses || {}
            )
              .filter(([, value]) => {
                return safeNumber(value, 0) !== 0;
              })
              .map(([abilityId, value]) => {
                return `${abilityId.toUpperCase()} ${formatSignedNumber(value)}`;
              })
              .join(", ");

          return wizardChoiceCard(
            subrace.name ||
              "Unnamed Subrace",

            `
              <p>
                ${
                  abilityText
                    ? `<b>Ability:</b> ${escapeHtml(abilityText)}`
                    : "No ability bonus listed."
                }
              </p>
            `,

            selected
              ? "Selected"
              : "Choose Subrace",

            "choose-subrace",

            {
              "subrace-id":
                subrace.id
            },

            selected
          );
        })
        .join("");

    const abilityChoices =
      ABILITY_DEFINITIONS.map((ability) => {
        return {
          value: ability.id,
          label: ability.name
        };
      });

    const halfElfAbilityChoices =
      abilityChoices.filter((ability) => {
        return ability.value !== "cha";
      });

    const dragonbornChoiceHtml =
      selectedSpeciesId === "dragonborn"
        ? `
          <hr>

          <h3>Draconic Ancestry</h3>

          <div class="hg-character-field-grid three">
            ${wizardSelect(
              "Ancestry",
              "ccDragonbornAncestry",
              creatorState.draft
                .species
                .choices
                ?.draconicAncestry ||
                "",
              [
                {
                  value: "",
                  label: "Choose ancestry"
                },
                ...SECTION11_DRAGONBORN_ANCESTRIES
                  .map((ancestry) => {
                    return {
                      value: ancestry.id,
                      label:
                        `${ancestry.name} (${ancestry.damageType})`
                    };
                  })
              ]
            )}
          </div>

          <div class="hg-character-inline-actions">
            <button
              type="button"
              data-cc-action="apply-species-choices"
            >
              Apply Ancestry
            </button>
          </div>
        `
        : "";

    const halfElfChoiceHtml =
      selectedSpeciesId === "half-elf"
        ? `
          <hr>

          <h3>Half-Elf Ability Choices</h3>

          <div class="hg-character-field-grid three">
            ${wizardSelect(
              "First +1",
              "ccHalfElfAbilityOne",
              creatorState.draft
                .species
                .choices
                ?.halfElfAbilityOne ||
                "",
              [
                {
                  value: "",
                  label: "Choose ability"
                },
                ...halfElfAbilityChoices
              ]
            )}

            ${wizardSelect(
              "Second +1",
              "ccHalfElfAbilityTwo",
              creatorState.draft
                .species
                .choices
                ?.halfElfAbilityTwo ||
                "",
              [
                {
                  value: "",
                  label: "Choose ability"
                },
                ...halfElfAbilityChoices
              ]
            )}

            ${wizardSelect(
              "First Skill",
              "ccHalfElfSkillOne",
              creatorState.draft
                .species
                .choices
                ?.halfElfSkillOne ||
                "",
              getSection11SkillChoices()
            )}

            ${wizardSelect(
              "Second Skill",
              "ccHalfElfSkillTwo",
              creatorState.draft
                .species
                .choices
                ?.halfElfSkillTwo ||
                "",
              getSection11SkillChoices()
            )}

            ${wizardSelect(
              "Additional Language",
              "ccHalfElfLanguage",
              creatorState.draft
                .species
                .choices
                ?.halfElfLanguage ||
                "",
              getSection11LanguageChoices({
                exclude: [
                  "Common",
                  "Elvish"
                ]
              })
            )}
          </div>

          <div class="hg-character-inline-actions">
            <button
              type="button"
              data-cc-action="apply-species-choices"
            >
              Apply Half-Elf Choices
            </button>
          </div>
        `
        : "";

    const dwarfChoiceHtml =
      selectedSpeciesId === "dwarf"
        ? `
          <hr>

          <h3>Dwarf Tool Choice</h3>

          <div class="hg-character-field-grid three">
            ${wizardSelect(
              "Tool Proficiency",
              "ccDwarfToolChoice",
              creatorState.draft
                .species
                .choices
                ?.dwarfTool ||
                "",
              [
                {
                  value: "",
                  label: "Choose tool"
                },
                ...DWARF_TOOL_CHOICES.map((tool) => {
                  return {
                    value: tool,
                    label: tool
                  };
                })
              ]
            )}
          </div>

          <div class="hg-character-inline-actions">
            <button
              type="button"
              data-cc-action="apply-species-choices"
            >
              Apply Dwarf Tool
            </button>
          </div>
        `
        : "";

    const humanChoiceHtml =
      selectedSpeciesId === "human"
        ? `
          <hr>

          <h3>Human Language Choice</h3>

          <div class="hg-character-field-grid three">
            ${wizardSelect(
              "Additional Language",
              "ccHumanLanguage",
              creatorState.draft
                .species
                .choices
                ?.humanLanguage ||
                "",
              getSection11LanguageChoices({
                exclude: ["Common"]
              })
            )}
          </div>

          <div class="hg-character-inline-actions">
            <button
              type="button"
              data-cc-action="apply-species-choices"
            >
              Apply Human Language
            </button>
          </div>
        `
        : "";

    const highElfChoiceHtml =
      selectedSpeciesId === "elf" &&
      selectedSubrace?.id === "high-elf"
        ? `
          <hr>

          <h3>High Elf Choices</h3>

          <div class="hg-character-field-grid three">
            ${wizardSelect(
              "Additional Language",
              "ccHighElfLanguage",
              creatorState.draft
                .species
                .choices
                ?.highElfLanguage ||
                "",
              getSection11LanguageChoices({
                exclude: [
                  "Common",
                  "Elvish"
                ]
              })
            )}

            ${wizardSelect(
              "Wizard Cantrip",
              "ccHighElfCantrip",
              creatorState.draft
                .species
                .choices
                ?.highElfCantrip ||
                "",
              [
                {
                  value: "",
                  label: "Choose cantrip"
                },
                ...WIZARD_CANTRIP_CHOICES_2014
                  .map((cantrip) => {
                    return {
                      value: cantrip,
                      label: cantrip
                    };
                  })
              ]
            )}
          </div>

          <div class="hg-character-inline-actions">
            <button
              type="button"
              data-cc-action="apply-species-choices"
            >
              Apply High Elf Choices
            </button>
          </div>
        `
        : "";

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

      ${
        subraceCards
          ? `
            <hr>

            <h3>Subrace</h3>

            <div class="hg-character-choice-grid">
              ${subraceCards}
            </div>
          `
          : ""
      }

      ${dragonbornChoiceHtml}

      ${dwarfChoiceHtml}

      ${humanChoiceHtml}

      ${highElfChoiceHtml}

      ${halfElfChoiceHtml}

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

  function handleChooseSubraceAction(
    ...values
  ) {
    const button =
      findSection11ActionElement(
        ...values
      );

    const subraceId =
      button?.dataset
        ?.subraceId ||
      "";

    if (
      chooseSection11Subrace(
        subraceId
      )
    ) {
      setStatus(
        "Subrace selected: " +
        (
          getSection11SelectedSubrace()
            ?.name ||
          "Subrace"
        ) +
        "."
      );

      renderCreatorView();
    }
  }

  function handleApplySpeciesChoicesAction() {
    if (applySection11SpeciesChoices()) {
      setStatus(
        "Species choices applied."
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
    "choose-subrace",
    handleChooseSubraceAction
  );

  registerCharacterCreatorAction(
    "apply-species-choices",
    handleApplySpeciesChoicesAction
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

    const skillPickerChoices =
      getSection12SkillPickerChoices();

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

        ${wizardSelect(
          "Skill Picker",
          "ccCustomClassSkillPicker",
          "",
          skillPickerChoices,
          {
            wide: true
          }
        )}

        ${wizardField(
          "Selected Available Skills",
          "ccCustomClassSkills",

          formatSection12List(
            customTemplate
              ?.skillChoices
              ?.from
          ),

          {
            placeholder:
              "Use the Skill Picker to add class skill options",
            wide: true
          }
        )}

        <div class="hg-character-field hg-character-wide-field">
          <label>
            Skill Picker Actions
          </label>

          <div class="hg-character-inline-actions">
            <button
              type="button"
              data-cc-action="add-custom-class-skill"
            >
              Add Skill
            </button>

            <button
              type="button"
              data-cc-action="remove-custom-class-skill"
            >
              Remove Skill
            </button>

            <button
              type="button"
              data-cc-action="add-all-custom-class-skills"
            >
              Add All Skills
            </button>

            <button
              type="button"
              data-cc-action="clear-custom-class-skills"
            >
              Clear Skills
            </button>
          </div>
        </div>

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

  function handleSection12CustomClassSkillPicker(
    mode,
    statusMessage
  ) {
    if (
      updateSection12CustomClassSkillPicker(
        mode
      )
    ) {
      setStatus(statusMessage);
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
    "add-custom-class-skill",
    () => {
      handleSection12CustomClassSkillPicker(
        "add",
        "Skill added to custom class options."
      );
    }
  );

  registerCharacterCreatorAction(
    "remove-custom-class-skill",
    () => {
      handleSection12CustomClassSkillPicker(
        "remove",
        "Skill removed from custom class options."
      );
    }
  );

  registerCharacterCreatorAction(
    "add-all-custom-class-skills",
    () => {
      handleSection12CustomClassSkillPicker(
        "add-all",
        "All skills added to custom class options."
      );
    }
  );

  registerCharacterCreatorAction(
    "clear-custom-class-skills",
    () => {
      handleSection12CustomClassSkillPicker(
        "clear",
        "Custom class skill options cleared."
      );
    }
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

  function getSection13BaseAbilityScore(abilityId) {
    return Math.max(
      1,
      Math.min(
        30,
        Math.round(
          safeNumber(
            creatorState.draft
              .abilities
              .base[abilityId],
            10
          )
        )
      )
    );
  }

  function getSection13AbilityBonus(abilityId) {
    return safeNumber(
      creatorState.draft
        .abilities
        .bonuses?.[abilityId],
      0
    );
  }

  function renderSection13AbilityScoreDetails(
    abilityId
  ) {
    const base =
      getSection13BaseAbilityScore(
        abilityId
      );

    const bonus =
      getSection13AbilityBonus(
        abilityId
      );

    const finalScore =
      getSection13AbilityScore(
        abilityId
      );

    const modifier =
      calculateAbilityModifier(
        finalScore
      );

    return `
      <p class="small">
        Base Score:
        <b>${base}</b>

        <br>

        Species/Other Bonuses:
        <b>${formatSignedNumber(bonus)}</b>

        <br>

        Final Score:
        <b>${finalScore}</b>

        <br>

        Modifier:
        <b>${formatSignedNumber(modifier)}</b>
      </p>
    `;
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
    });

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
        .spellcastingAbility
    ) {
      calculateSection16SpellcastingValues({
        markDraft: false
      });
    }

    markDraftChanged();
    refreshSection13AbilitySummary();
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
      getSection13BaseAbilityScore(
        abilityId
      );

    const otherAbility =
      ABILITY_DEFINITIONS.find(
        (ability) => {
          return (
            ability.id !== abilityId &&
            getSection13BaseAbilityScore(
              ability.id
            ) === score
          );
        }
      );

    creatorState.draft
      .abilities
      .base[abilityId] = score;

    if (otherAbility) {
      creatorState.draft
        .abilities
        .base[otherAbility.id] =
          currentScore;
    }

    recalculateAbilityTotals(
      creatorState.draft
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
            getSection13BaseAbilityScore(
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
        getSection13BaseAbilityScore(
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

    recalculateAbilityTotals(
      creatorState.draft
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
    const selectedClass =
      getSelectedClassTemplate();

    if (!selectedClass) {
      return null;
    }

    return calculateCharacterHp(
      creatorState.draft
    ).maximumHp;
  }

  function formatSection13HpRolls(
    values
  ) {
    return Array.isArray(values)
      ? values
          .map((value) => {
            return value &&
              typeof value === "object" &&
              !Array.isArray(value)
              ? safeNumber(value.roll, 0)
              : safeNumber(value, 0);
          })
          .filter((value) => {
            return value > 0;
          })
          .join(", ")
      : "";
  }

  function parseSection13HpRolls(
    value
  ) {
    return String(value || "")
      .split(/[\n,]+/)
      .map((item) => {
        return Math.round(
          safeNumber(item.trim(), 0)
        );
      })
      .filter((item) => {
        return item > 0;
      });
  }

  function createSection13HpRollRecord(
    levelRecord,
    roll
  ) {
    const dieSize =
      getHitDieSize(
        levelRecord?.hitDie
      );

    return {
      characterLevel:
        Math.max(
          2,
          Math.round(
            safeNumber(
              levelRecord?.characterLevel,
              2
            )
          )
        ),
      classId:
        cleanString(
          levelRecord?.classId
        ),
      className:
        cleanString(
          levelRecord?.className,
          "Class"
        ),
      hitDie:
        cleanString(
          levelRecord?.hitDie,
          "d8"
        ),
      roll:
        Math.max(
          1,
          Math.min(
            dieSize,
            Math.round(
              safeNumber(
                roll,
                Math.floor(dieSize / 2) + 1
              )
            )
          )
        )
    };
  }

  function getSection13HpRollState(
    character = creatorState.draft,
    hpCalculation =
      normalizeHpCalculation(
        character?.combat?.hpCalculation,
        character?.combat?.maxHp
      )
  ) {
    const levelRecords =
      getCharacterLevelHitDieRecords(
        character
      );

    const laterLevels =
      levelRecords.slice(1);

    const rawRecords =
      getHpRollRawRecords(
        hpCalculation.laterLevelValues
      );

    const activeRolls =
      normalizeHpRollRecordsForCharacter(
        hpCalculation.laterLevelValues,
        character
      );

    const activeLevelNumbers =
      new Set(
        laterLevels.map((record) => {
          return record.characterLevel;
        })
      );

    const warnings = [];

    rawRecords.forEach((rawRecord) => {
      const activeLevel =
        laterLevels.find((record) => {
          return (
            record.characterLevel ===
            rawRecord.characterLevel
          );
        });

      if (!activeLevel) {
        warnings.push(
          `Stored rolled HP for level ${rawRecord.characterLevel} is inactive after the current class level changes.`
        );

        return;
      }

      if (
        !hpRollRawMatchesLevel(
          rawRecord,
          activeLevel
        )
      ) {
        warnings.push(
          `Level ${rawRecord.characterLevel} now uses ${activeLevel.className || "Class"} ${activeLevel.hitDie || "d8"}; the stored roll is adjusted to that Hit Die.`
        );
      }

      const dieSize =
        getHitDieSize(
          activeLevel.hitDie
        );

      if (rawRecord.roll > dieSize) {
        warnings.push(
          `Level ${rawRecord.characterLevel} rolled HP is capped at ${activeLevel.hitDie || `d${dieSize}`}.`
        );
      }
    });

    return {
      levelRecords,
      laterLevels,
      activeRolls,
      rawRecords,
      inactiveRecords:
        rawRecords.filter((record) => {
          return !activeLevelNumbers.has(
            record.characterLevel
          );
        }),
      warnings: [
        ...new Set(warnings)
      ]
    };
  }

  function setSection13HpRollValue(
    characterLevel,
    rawValue
  ) {
    const hpCalculation =
      normalizeHpCalculation(
        creatorState.draft
          .combat
          .hpCalculation,
        creatorState.draft
          .combat
          .maxHp
      );

    const levelNumber =
      Math.max(
        2,
        Math.round(
          safeNumber(characterLevel, 2)
        )
      );

    const rollState =
      getSection13HpRollState(
        creatorState.draft,
        hpCalculation
      );

    const levelRecord =
      rollState.laterLevels.find(
        (record) => {
          return (
            record.characterLevel ===
            levelNumber
          );
        }
      );

    if (!levelRecord) {
      return false;
    }

    const nextActiveRolls =
      rollState.activeRolls.map(
        (record) => {
          if (
            record.characterLevel !==
            levelNumber
          ) {
            return record;
          }

          return createSection13HpRollRecord(
            levelRecord,
            rawValue
          );
        }
      );

    const activeLevels =
      new Set(
        rollState.laterLevels.map(
          (record) => {
            return record.characterLevel;
          }
        )
      );

    const inactiveRolls =
      rollState.rawRecords
        .filter((record) => {
          return !activeLevels.has(
            record.characterLevel
          );
        })
        .map((record) => {
          return {
            characterLevel:
              record.characterLevel,
            classId:
              record.classId,
            className:
              record.className,
            hitDie:
              record.hitDie,
            roll:
              record.roll
          };
        });

    creatorState.draft
      .combat
      .hpCalculation = {
        ...hpCalculation,
        laterLevelValues: [
          ...nextActiveRolls,
          ...inactiveRolls
        ]
      };

    applyCompatibilityAliases(
      creatorState.draft
    );

    markDraftChanged();

    return true;
  }

  function renderSection13RolledHpInputs(
    hpCalculation
  ) {
    const rollState =
      getSection13HpRollState(
        creatorState.draft,
        hpCalculation
      );

    if (!rollState.levelRecords.length) {
      return `
        <div class="hg-character-placeholder">
          Choose a class before entering rolled HP.
        </div>
      `;
    }

    const rollByLevel =
      new Map(
        rollState.activeRolls.map((roll) => {
          return [
            roll.characterLevel,
            roll
          ];
        })
      );

    const warningHtml =
      rollState.warnings.length
        ? `
          <div class="hg-character-warning">
            ${rollState.warnings
              .map((warning) => {
                return `<p>${escapeHtml(warning)}</p>`;
              })
              .join("")}
          </div>
        `
        : "";

    return `
      <hr>

      <h3>Rolled HP by Level</h3>

      ${warningHtml}

      <div class="hg-character-choice-grid">
        ${rollState.levelRecords
          .map((levelRecord) => {
            const dieSize =
              getHitDieSize(
                levelRecord.hitDie
              );

            const rollRecord =
              rollByLevel.get(
                levelRecord.characterLevel
              );

            const isFirstLevel =
              levelRecord.characterLevel === 1;

            return `
              <article class="hg-character-choice-card">
                <h3>
                  Level ${levelRecord.characterLevel}
                </h3>

                <p>
                  <b>Class:</b>
                  ${escapeHtml(
                    levelRecord.className ||
                    "Class"
                  )}

                  <br>

                  <b>Hit Die:</b>
                  ${escapeHtml(
                    levelRecord.hitDie ||
                    "d8"
                  )}
                </p>

                ${
                  isFirstLevel
                    ? `
                      <p class="small">
                        Level 1 uses the full Hit Die unless the Level 1 HP Override field is set.
                      </p>
                    `
                    : `
                      <div class="hg-character-field">
                        <label for="ccHpRollLevel-${levelRecord.characterLevel}">
                          Roll
                        </label>

                        <input
                          id="ccHpRollLevel-${levelRecord.characterLevel}"
                          type="number"
                          min="1"
                          max="${dieSize}"
                          step="1"
                          value="${escapeHtml(
                            rollRecord?.roll ?? ""
                          )}"
                          data-hp-roll-level="${levelRecord.characterLevel}"
                          data-hp-roll-hit-die="${escapeHtml(
                            levelRecord.hitDie ||
                            "d8"
                          )}"
                        >

                        <p class="small">
                          Enter 1-${dieSize}; this roll is capped by ${escapeHtml(
                            levelRecord.hitDie ||
                            `d${dieSize}`
                          )}.
                        </p>
                      </div>
                    `
                }
              </article>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function applySection13SuggestedHp() {
    const selectedClass =
      getSelectedClassTemplate();

    if (!selectedClass) {
      alert(
        "Choose a class before calculating HP."
      );

      return null;
    }

    const hpSummary =
      calculateCharacterHp(
        creatorState.draft
      );

    creatorState.draft
      .combat
      .maxHp = hpSummary.maximumHp;

    creatorState.draft
      .combat
      .currentHp = hpSummary.maximumHp;

    creatorState.draft
      .combat
      .hpCalculation =
        normalizeHpCalculation(
          {
          ...creatorState.draft
            .combat
            .hpCalculation,
          lastCalculatedConModifier:
              calculateAbilityModifier(
                getSection13AbilityScore(
                  "con"
                )
              )
          },
          hpSummary.maximumHp
        );

    applyCompatibilityAliases(
      creatorState.draft
    );

    markDraftChanged();

    return hpSummary.maximumHp;
  }

  function refreshSection13LevelProgression() {
    if (isMulticlassDraft()) {
      return blockMulticlassEdit(
        "Refreshing level progression"
      );
    }

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

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

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
      calculateCharacterHitDice(
        creatorState.draft
      );

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

    const suggestedHpLabel =
      suggestedHp === null
        ? "Choose a class to calculate"
        : suggestedHp;

    const hpSummary =
      calculateCharacterHp(draft);

    const hpCalculation =
      normalizeHpCalculation(
        draft.combat.hpCalculation,
        draft.combat.maxHp
      );

    const armorClass =
      calculateArmorClassOptions(draft)
        .selected;

    const armorClassOptions =
      calculateArmorClassOptions(draft)
        .options;

    const initiative =
      calculateCharacterInitiative(draft);

    const hpModeChoices = [
      {
        value: "fixed",
        label: "Fixed Average"
      },
      {
        value: "rolled",
        label: "Rolled"
      },
      {
        value: "manual",
        label: "Manual Override"
      }
    ];

    const armorClassModeChoices = [
      {
        value: "auto",
        label: "Automatic"
      },
      {
        value: "manual",
        label: "Manual Override"
      }
    ];

    const armorClassMethodChoices =
      armorClassOptions.map((option) => {
        return {
          value: option.id,
          label:
            `${option.label} (${option.total})`
        };
      });

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

        <br>

        <b>Calculated HP:</b>

        ${hpSummary.maximumHp}

        <span class="small">
          (${escapeHtml(hpSummary.mode)}, ${escapeHtml(hpSummary.hitDie)}${
            hpSummary.speciesHpBonus
              ? `, Dwarven Toughness +${hpSummary.speciesHpBonus}`
              : ""
          })
        </span>

        <br>

        <b>Calculated AC:</b>

        ${armorClass.total}

        <span class="small">
          (${escapeHtml(armorClass.label)})
        </span>

        <br>

        <b>Calculated Initiative:</b>

        ${formatSection17Modifier(
          initiative.total
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

        ${wizardSelect(
          "HP Calculation",
          "ccHpCalculationMode",
          hpCalculation.mode,
          hpModeChoices,
          {
            path:
              "combat.hpCalculation.mode"
          }
        )}

        ${wizardField(
          "Level 1 HP Override",
          "ccHpLevelOneValue",
          hpCalculation.levelOneValue === null
            ? ""
            : hpCalculation.levelOneValue,
          {
            type: "number",
            path:
              "combat.hpCalculation.levelOneValue",
            valueType: "number",
            extra:
              'min="1" step="1"'
          }
        )}

        ${wizardField(
          "Manual HP Override",
          "ccHpManualOverride",
          hpCalculation.manualOverride === null
            ? ""
            : hpCalculation.manualOverride,
          {
            type: "number",
            path:
              "combat.hpCalculation.manualOverride",
            valueType: "number",
            extra:
              'min="1" step="1"'
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

        ${wizardSelect(
          "Armor Class Mode",
          "ccArmorClassMode",
          draft.combat.armorClassMode,
          armorClassModeChoices,
          {
            path:
              "combat.armorClassMode"
          }
        )}

        ${
          armorClassMethodChoices.length
            ? wizardSelect(
                "AC Calculation",
                "ccSelectedArmorClassMethod",
                draft.combat.selectedArmorClassMethod ||
                armorClass.id,
                armorClassMethodChoices,
                {
                  path:
                    "combat.selectedArmorClassMethod"
                }
              )
            : ""
        }

        ${wizardField(
          "Manual AC",
          "ccManualArmorClass",
          draft.combat.manualArmorClass ??
          draft.combat.armorClass,
          {
            type: "number",
            path: "combat.manualArmorClass",
            valueType: "number",
            extra:
              'min="0" step="1"'
          }
        )}

        ${wizardField(
          "AC Bonus",
          "ccArmorClassBonus",
          draft.combat.armorClassBonus,
          {
            type: "number",
            path:
              "combat.armorClassBonus",
            valueType: "number",
            extra:
              'step="1"'
          }
        )}

        ${wizardField(
          "Initiative Bonus",
          "ccInitiativeBonus",
          draft.combat.initiativeBonus,
          {
            type: "number",
            path: "combat.initiativeBonus",
            valueType: "number",
            extra:
              'step="1"'
          }
        )}
      </div>

      ${
        hpCalculation.mode === "rolled"
          ? renderSection13RolledHpInputs(
              hpCalculation
            )
          : ""
      }

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
          ${suggestedHp === null ? "disabled" : ""}
        >
          Apply Calculated HP (${hpSummary.maximumHp || suggestedHpLabel})
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
      <div class="hg-character-choice-grid">
        ${ABILITY_DEFINITIONS.map(
          (ability) => {
            return `
              <article class="hg-character-choice-card">
                <h3>
                  ${escapeHtml(
                    ability.name
                  )}
                </h3>

                ${wizardField(
                  "Base Score",
                  `ccAbility-${ability.id}`,
                  getSection13BaseAbilityScore(
                    ability.id
                  ),
                  {
                    type: "number",
                    extra:
                      `min="1" max="30" step="1" data-ability-id="${escapeHtml(
                        ability.id
                      )}"`
                  }
                )}

                ${renderSection13AbilityScoreDetails(
                  ability.id
                )}
              </article>
            `;
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

      <div class="hg-character-choice-grid">
        ${ABILITY_DEFINITIONS.map(
          (ability) => {
            return `
              <article class="hg-character-choice-card">
                <h3>
                  ${escapeHtml(
                    ability.name
                  )}
                </h3>

                ${wizardSelect(
                  "Base Score",
                  `ccStandard-${ability.id}`,
                  getSection13BaseAbilityScore(
                    ability.id
                  ),
                  choices,
                  {
                    extra:
                      `data-standard-ability-id="${escapeHtml(
                        ability.id
                      )}"`
                  }
                )}

                ${renderSection13AbilityScoreDetails(
                  ability.id
                )}
              </article>
            `;
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
            const baseScore =
              Math.max(
                8,
                Math.min(
                  15,
                  getSection13BaseAbilityScore(
                    ability.id
                  )
                )
              );

            const cost =
              SECTION13_POINT_BUY_COSTS[
                baseScore
              ];

            return `
              <article class="hg-character-choice-card">
                <h3>
                  ${escapeHtml(
                    ability.name
                  )}
                </h3>

                <p>
                  <b>Base Score:</b>
                  ${baseScore}

                  <br>

                  <b>Species/Other Bonuses:</b>
                  ${formatSignedNumber(
                    getSection13AbilityBonus(
                      ability.id
                    )
                  )}

                  <br>

                  <b>Final Score:</b>
                  ${getSection13AbilityScore(
                    ability.id
                  )}

                  <br>

                  <b>Modifier:</b>
                  ${formatSignedNumber(
                    calculateAbilityModifier(
                      getSection13AbilityScore(
                        ability.id
                      )
                    )
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
                    ${baseScore <= 8 ? "disabled" : ""}
                  >
                    −
                  </button>

                  <button
                    type="button"
                    data-cc-action="point-buy-increase"
                    data-ability-id="${escapeHtml(
                      ability.id
                    )}"
                    ${baseScore >= 15 ? "disabled" : ""}
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
        base scores manually below.
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
              getSection13AbilityBonus(
                ability.id
              );

            return `
              <article class="hg-character-choice-card">
                <h3>
                  ${escapeHtml(
                    ability.name
                  )}
                </h3>

                <p>
                  <b>Base Score:</b>
                  ${getSection13BaseAbilityScore(
                    ability.id
                  )}

                  <br>

                  <b>Species/Other Bonuses:</b>
                  ${formatSignedNumber(bonus)}

                  <br>

                  <b>Final Score:</b>
                  ${score}

                  <br>

                  <b>Modifier:</b>
                  ${formatSignedNumber(modifier)}
                </p>
              </article>
            `;
          }
        ).join("")}
      </div>
    `;
  }

  function refreshSection13AbilitySummary() {
    if (
      creatorState.currentStepId !==
      "abilities"
    ) {
      return;
    }

    const summaryElement =
      typeof document !== "undefined"
        ? document.getElementById(
            "characterAbilitySummary"
          )
        : null;

    if (!summaryElement) {
      return;
    }

    summaryElement.innerHTML =
      renderSection13AbilitySummary();
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

      <div id="characterAbilitySummary">
        ${renderSection13AbilitySummary()}
      </div>
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
    if (
      refreshSection13LevelProgression() ===
      false
    ) {
      return;
    }

    setStatus(
      "Level progression refreshed."
    );

    renderCreatorView();
  }

  function handleSection13CalculateHp() {
    const hp =
      applySection13SuggestedHp();

    if (hp === null) {
      setStatus(
        "Choose a class before calculating suggested hit points."
      );

      renderCreatorView();

      return;
    }

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
      target?.dataset
        ?.hpRollLevel
    ) {
      setSection13HpRollValue(
        target.dataset.hpRollLevel,
        target.value
      );

      renderCreatorView();

      return true;
    }

    if (
      target?.dataset
        ?.draftPath ===
      "combat.hpCalculation.laterLevelValues"
    ) {
      setDraftValue(
        "combat.hpCalculation.laterLevelValues",
        parseSection13HpRolls(
          target.value
        )
      );

      markDraftChanged();
      renderCreatorView();

      return true;
    }

    if (
      [
        "combat.hpCalculation.mode",
        "combat.hpCalculation.levelOneValue",
        "combat.hpCalculation.manualOverride",
        "combat.armorClassMode",
        "combat.selectedArmorClassMethod",
        "combat.manualArmorClass",
        "combat.armorClassBonus",
        "combat.initiativeBonus"
      ].includes(
        target?.dataset?.draftPath
      )
    ) {
      const path =
        target.dataset.draftPath;

      const blankMeansNull = [
        "combat.hpCalculation.levelOneValue",
        "combat.hpCalculation.manualOverride",
        "combat.manualArmorClass"
      ].includes(path);

      if (
        blankMeansNull &&
        String(target.value || "").trim() === ""
      ) {
        setDraftValue(path, null);
      } else {
        setSimpleDraftField(
          path,
          target.value,
          target.dataset.valueType ||
          "string"
        );
      }

      applyCompatibilityAliases(
        creatorState.draft
      );

      markDraftChanged();
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

      customEquipmentItems:
        cleanArray(
          raw.customEquipmentItems ||
          raw.equipmentItems
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

    if (
      selectedSnapshot &&
      creatorState.draft
        .background
        .source !== "custom" &&
      creatorState.draft
        .background
        .source !== "skipped"
    ) {
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

  function getSection14BackgroundChoiceList(
    choiceKey
  ) {
    const background =
      creatorState.draft.background;

    background.featureChoices =
      background.featureChoices || {};

    background.featureChoices[choiceKey] =
      cleanArray(
        background.featureChoices[choiceKey]
      );

    return background.featureChoices[
      choiceKey
    ];
  }

  function setSection14BackgroundChoiceList(
    choiceKey,
    values
  ) {
    creatorState.draft
      .background
      .featureChoices =
        creatorState.draft
          .background
          .featureChoices || {};

    creatorState.draft
      .background
      .featureChoices[choiceKey] =
        uniqueCleanArray(values);
  }

  function getSection14AllExactToolOptions() {
    return uniqueCleanArray([
      ...GENERAL_TOOL_OPTIONS,
      ...ARTISAN_TOOL_OPTIONS,
      ...GAMING_SET_OPTIONS,
      ...MUSICAL_INSTRUMENT_OPTIONS
    ]).sort((a, b) => {
      return a.localeCompare(b);
    });
  }

  function expandSection14ToolChoice(
    option
  ) {
    const cleanOption =
      cleanString(option);

    const normalized =
      cleanOption
        .toLowerCase()
        .replace(/[’']/g, "'");

    if (!cleanOption) {
      return [];
    }

    if (
      normalized.includes(
        "artisan"
      ) &&
      normalized.includes(
        "musical"
      )
    ) {
      return [
        ...ARTISAN_TOOL_OPTIONS,
        ...MUSICAL_INSTRUMENT_OPTIONS
      ];
    }

    if (
      normalized.includes(
        "artisan"
      )
    ) {
      return [
        ...ARTISAN_TOOL_OPTIONS
      ];
    }

    if (
      normalized.includes(
        "gaming set"
      )
    ) {
      return [
        ...GAMING_SET_OPTIONS
      ];
    }

    if (
      normalized.includes(
        "musical instrument"
      )
    ) {
      return [
        ...MUSICAL_INSTRUMENT_OPTIONS
      ];
    }

    return [cleanOption];
  }

  function getSection14BackgroundToolOptions(
    background
  ) {
    const options =
      cleanArray(
        background?.toolChoices?.from
      );

    const sourceOptions =
      options.length
        ? options
        : getSection14AllExactToolOptions();

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

  function getSection14BackgroundToolOptionsForIndex(
    background,
    index
  ) {
    const required =
      Math.max(
        0,
        safeNumber(
          background?.toolChoices?.choose,
          0
        )
      );

    const sourceOptions =
      cleanArray(
        background?.toolChoices?.from
      );

    if (
      sourceOptions.length === required &&
      index >= 0 &&
      index < sourceOptions.length
    ) {
      return uniqueCleanArray(
        expandSection14ToolChoice(
          sourceOptions[index]
        )
      ).sort((a, b) => {
        return a.localeCompare(b);
      });
    }

    return getSection14BackgroundToolOptions(
      background
    );
  }

  function getSection14BackgroundLanguageOptions(
    background
  ) {
    const options =
      cleanArray(
        background?.languageChoices?.from
      );

    return options.length
      ? options
      : STANDARD_LANGUAGE_OPTIONS;
  }

  function countSection14BackgroundSourceList(
    category
  ) {
    const sourceName =
      getBackgroundSourceLabel(
        creatorState.draft.background
      );

    if (!sourceName) {
      return 0;
    }

    const allSources =
      ensureProficiencySources(
        creatorState.draft
      );

    const categorySources =
      allSources[category] || {};

    return uniqueCleanArray(
      creatorState.draft
        .proficiencies[category]
    ).filter((value) => {
      return getStoredSources(
        categorySources,
        value,
        []
      ).includes(sourceName);
    }).length;
  }

  function getSection14BackgroundSourceValues(
    category
  ) {
    const sourceName =
      getBackgroundSourceLabel(
        creatorState.draft.background
      );

    if (!sourceName) {
      return [];
    }

    const allSources =
      ensureProficiencySources(
        creatorState.draft
      );

    const categorySources =
      allSources[category] || {};

    return uniqueCleanArray(
      creatorState.draft
        .proficiencies[category]
    ).filter((value) => {
      return getStoredSources(
        categorySources,
        value,
        []
      ).includes(sourceName);
    });
  }

  function countSection14ValidBackgroundToolChoices(
    background =
      getSelectedSection14Background()
  ) {
    const required =
      Math.max(
        0,
        safeNumber(
          background?.toolChoices?.choose,
          0
        )
      );

    const selectedChoices =
      cleanArray(
        creatorState.draft
          .background
          .featureChoices
          ?.toolProficiencies
      );

    const sourcedTools =
      new Set(
        getSection14BackgroundSourceValues(
          "tools"
        )
      );

    const seen = new Set();
    let validCount = 0;

    for (
      let index = 0;
      index < required;
      index += 1
    ) {
      const selected =
        cleanString(
          selectedChoices[index]
        );

      const validTools =
        new Set(
          getSection14BackgroundToolOptionsForIndex(
            background,
            index
          )
        );

      if (
        selected &&
        !seen.has(selected) &&
        sourcedTools.has(selected) &&
        validTools.has(selected)
      ) {
        seen.add(selected);
        validCount += 1;
      }
    }

    return validCount;
  }

  function applySection14BackgroundChoices() {
    const background =
      getSelectedSection14Background();

    const sourceName =
      getBackgroundSourceLabel(
        creatorState.draft.background
      );

    if (!background || !sourceName) {
      alert(
        "Choose a background first."
      );

      return false;
    }

    const toolRequired =
      Math.max(
        0,
        safeNumber(
          background.toolChoices?.choose,
          0
        )
      );

    const languageRequired =
      Math.max(
        0,
        safeNumber(
          background.languageChoices?.choose,
          0
        )
      );

    const toolChoices =
      Array.from(
        { length: toolRequired },
        (_, index) => {
          return cleanString(
            $(`ccBackgroundToolChoice-${index}`)
              ?.value
          );
        }
      ).filter(Boolean);

    const languageChoices =
      Array.from(
        { length: languageRequired },
        (_, index) => {
          return cleanString(
            $(`ccBackgroundLanguageChoice-${index}`)
              ?.value
          );
        }
      ).filter(Boolean);

    if (
      toolChoices.length !== toolRequired ||
      new Set(toolChoices).size !==
        toolChoices.length ||
      !toolChoices.every((tool, index) => {
        return getSection14BackgroundToolOptionsForIndex(
          background,
          index
        ).includes(tool);
      })
    ) {
      alert(
        "Choose the required exact background tool proficiencies."
      );

      return false;
    }

    if (
      languageChoices.length !==
        languageRequired ||
      new Set(languageChoices).size !==
        languageChoices.length
    ) {
      alert(
        "Choose the required background languages."
      );

      return false;
    }

    setSection14BackgroundChoiceList(
      "toolProficiencies",
      toolChoices
    );

    setSection14BackgroundChoiceList(
      "languageProficiencies",
      languageChoices
    );

    setSourceProficiencyList(
      "tools",
      toolChoices,
      sourceName
    );

    setSourceProficiencyList(
      "languages",
      languageChoices,
      sourceName
    );

    applyCompatibilityAliases(
      creatorState.draft
    );

    markDraftChanged();

    return true;
  }

  function getSection14BackgroundPackages(
    background
  ) {
    const packageIds =
      cleanArray(
        background?.equipmentPackageIds
      );

    const packages =
      DEFAULT_BACKGROUND_EQUIPMENT_PACKAGES
        .filter((pack) => {
          return packageIds.includes(pack.id);
        })
        .map((pack) => cloneData(pack));

    const customItems =
      cleanArray(
        background?.customEquipmentItems
      );

    if (customItems.length) {
      packages.push({
        id:
          `${background.id}-custom-pack`,
        name:
          `${background.name} Equipment`,
        items:
          customItems.map((name) => {
            return {
              name,
              quantity: 1,
              weight: null
            };
          })
      });
    }

    return packages;
  }

  function removeSection14BackgroundEquipment(
    sourceName,
    packageId = ""
  ) {
    const cleanSource =
      cleanString(sourceName);

    if (!cleanSource) {
      return;
    }

    const cleanPackageId =
      cleanString(packageId);

    creatorState.draft
      .equipment
      .items =
        getSection15Inventory()
          .filter((item) => {
            if (item.source !== cleanSource) {
              return true;
            }

            if (!cleanPackageId) {
              return false;
            }

            return (
              cleanString(
                item.backgroundPackageId
              ) !== cleanPackageId
            );
          });

    removeSection14BackgroundCurrency(
      cleanSource,
      cleanPackageId
    );

    const currentSource =
      getBackgroundSourceLabel(
        creatorState.draft.background
      );

    if (currentSource === cleanSource) {
      const choices =
        creatorState.draft
          .background
          .featureChoices =
            creatorState.draft
              .background
              .featureChoices || {};

      choices.appliedEquipmentPackageIds =
        cleanPackageId
          ? cleanArray(
              choices.appliedEquipmentPackageIds
            ).filter((id) => {
              return id !== cleanPackageId;
            })
          : [];
    }
  }

  function getSection14BackgroundCurrencyGrant(
    sourceName,
    packageId
  ) {
    const cleanSource =
      cleanString(sourceName);

    const cleanPackageId =
      cleanString(packageId);

    if (!cleanSource || !cleanPackageId) {
      return null;
    }

    const sources =
      ensureEquipmentCurrencySources(
        creatorState.draft.equipment
      );

    return (
      sources[cleanSource]?.[
        cleanPackageId
      ] || null
    );
  }

  function hasSection14BackgroundCurrency(
    sourceName
  ) {
    const cleanSource =
      cleanString(sourceName);

    if (!cleanSource) {
      return false;
    }

    const sources =
      ensureEquipmentCurrencySources(
        creatorState.draft.equipment
      );

    const packageMap =
      sources[cleanSource] || {};

    return Object.values(packageMap)
      .some((currency) => {
        return hasCurrencyValue(currency);
      });
  }

  function formatSection14CurrencySummary(
    currency
  ) {
    const clean =
      normalizeCurrencyMap(currency);

    const parts =
      CURRENCY_DENOMINATIONS
        .filter((coin) => {
          return clean[coin] > 0;
        })
        .map((coin) => {
          return `${clean[coin]} ${coin}`;
        });

    return parts.length
      ? parts.join(", ")
      : "none";
  }

  function getSection14BackgroundRemovalSummary(
    sourceName
  ) {
    const cleanSource =
      cleanString(sourceName);

    const itemCount =
      getSection15Inventory()
        .filter((item) => {
          return item.source === cleanSource;
        })
        .length;

    const sources =
      ensureEquipmentCurrencySources(
        creatorState.draft.equipment
      );

    const currency =
      Object.values(
        sources[cleanSource] || {}
      ).reduce(
        (total, packageCurrency) => {
          return addCurrencyMaps(
            total,
            packageCurrency
          );
        },
        normalizeCurrencyMap({})
      );

    return {
      itemCount,
      currency,
      hasCurrency:
        hasCurrencyValue(currency),
      hasAnything:
        itemCount > 0 ||
        hasCurrencyValue(currency)
    };
  }

  function addSection14BackgroundCurrency(
    sourceName,
    packageId,
    currency
  ) {
    const cleanSource =
      cleanString(sourceName);

    const cleanPackageId =
      cleanString(packageId);

    const cleanCurrency =
      normalizeCurrencyMap(currency);

    if (
      !cleanSource ||
      !cleanPackageId ||
      !hasCurrencyValue(cleanCurrency)
    ) {
      return false;
    }

    const equipment =
      creatorState.draft.equipment;

    const manualCurrency =
      getManualCurrencyBalance(
        equipment
      );

    const sources =
      ensureEquipmentCurrencySources(
        equipment
      );

    sources[cleanSource] =
      sources[cleanSource] || {};

    if (
      hasCurrencyValue(
        sources[cleanSource][
          cleanPackageId
        ]
      )
    ) {
      syncEquipmentCurrencyFromSources(
        equipment,
        manualCurrency
      );

      return false;
    }

    sources[cleanSource][
      cleanPackageId
    ] = cleanCurrency;

    syncEquipmentCurrencyFromSources(
      equipment,
      manualCurrency
    );

    return true;
  }

  function removeSection14BackgroundCurrency(
    sourceName,
    packageId = ""
  ) {
    const cleanSource =
      cleanString(sourceName);

    if (!cleanSource) {
      return false;
    }

    const cleanPackageId =
      cleanString(packageId);

    const equipment =
      creatorState.draft.equipment;

    const manualCurrency =
      getManualCurrencyBalance(
        equipment
      );

    const sources =
      ensureEquipmentCurrencySources(
        equipment
      );

    if (!sources[cleanSource]) {
      return false;
    }

    if (cleanPackageId) {
      delete sources[cleanSource][
        cleanPackageId
      ];

      if (
        !Object.keys(
          sources[cleanSource]
        ).length
      ) {
        delete sources[cleanSource];
      }
    } else {
      delete sources[cleanSource];
    }

    syncEquipmentCurrencyFromSources(
      equipment,
      manualCurrency
    );

    return true;
  }

  function handleSection14OldBackgroundEquipment(
    sourceName
  ) {
    const cleanSource =
      cleanString(sourceName);

    if (!cleanSource) {
      return;
    }

    const removalSummary =
      getSection14BackgroundRemovalSummary(
        cleanSource
      );

    if (!removalSummary.hasAnything) {
      return;
    }

    const removeOld =
      typeof window !== "undefined" &&
      typeof window.confirm === "function"
        ? window.confirm(
            [
              "Remove items and currency granted by the previous background?",
              "",
              `Items to remove: ${removalSummary.itemCount}`,
              `Currency to remove: ${formatSection14CurrencySummary(removalSummary.currency)}`,
              "",
              "OK removes only those previous-background items and currency.",
              "Cancel keeps the existing background items and currency."
            ].join("\n")
          )
        : false;

    if (removeOld) {
      removeSection14BackgroundEquipment(
        cleanSource
      );
    }
  }

  function applySection14BackgroundPackage(
    packageId
  ) {
    const background =
      getSelectedSection14Background();

    const sourceName =
      getBackgroundSourceLabel(
        creatorState.draft.background
      );

    if (!background || !sourceName) {
      alert(
        "Choose a background first."
      );

      return false;
    }

    const pack =
      getSection14BackgroundPackages(
        background
      ).find((candidate) => {
        return candidate.id === packageId;
      });

    if (!pack) {
      return false;
    }

    const choices =
      creatorState.draft
        .background
        .featureChoices =
          creatorState.draft
            .background
            .featureChoices || {};

    choices.appliedEquipmentPackageIds =
      cleanArray(
        choices.appliedEquipmentPackageIds
      );

    const alreadyApplied =
      choices.appliedEquipmentPackageIds
        .includes(pack.id);

    const inventory =
      getSection15Inventory();

    (Array.isArray(pack.items)
      ? pack.items
      : []
    ).forEach((packItem) => {
      const catalogItem =
        packItem.catalogId
          ? getSection15Catalog()
              .find((item) => {
                return item.id ===
                  packItem.catalogId;
              })
          : null;

      const baseItem =
        catalogItem ||
        {
          id:
            makeSafeId(
              packItem.name,
              "background-item"
            ),
          name:
            packItem.name ||
            "Background Item",
          category:
            packItem.category ||
            "adventuring-gear",
          weight:
            packItem.weight ?? null,
          quantity:
            packItem.quantity || 1
        };

      const grantKey =
        `${pack.id}:${baseItem.id || baseItem.name}`;

      const exists =
        inventory.some((item) => {
          return (
            item.source === sourceName &&
            item.backgroundGrantKey ===
              grantKey
          );
        });

      if (exists) {
        return;
      }

      inventory.push(
        normalizeSection15Item(
          {
            ...baseItem,
            id:
              makeSafeId(
                `${sourceName}-${grantKey}`,
                "background-item"
              ),
            quantity:
              packItem.quantity ||
              baseItem.quantity ||
              1,
            source: sourceName,
            backgroundPackageId:
              pack.id,
            backgroundGrantKey:
              grantKey
          },
          sourceName
        )
      );
    });

    if (!alreadyApplied) {
      addSection14BackgroundCurrency(
        sourceName,
        pack.id,
        pack.currency || {}
      );

      choices.appliedEquipmentPackageIds.push(
        pack.id
      );
    } else if (
      getSection14BackgroundCurrencyGrant(
        sourceName,
        pack.id
      )
    ) {
      syncEquipmentCurrencyFromSources(
        creatorState.draft.equipment
      );
    }

    markDraftChanged();

    return true;
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

    const oldBackgroundSource =
      getBackgroundSourceLabel(
        current
      );

    if (oldBackgroundSource) {
      handleSection14OldBackgroundEquipment(
        oldBackgroundSource
      );

      removeSkillProficiencySource(
        oldBackgroundSource
      );

      removeListProficiencySource(
        oldBackgroundSource
      );
    }

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

  function skipSection14Background() {
    const current =
      creatorState.draft.background;

    const oldBackgroundSource =
      getBackgroundSourceLabel(
        current
      );

    if (oldBackgroundSource) {
      handleSection14OldBackgroundEquipment(
        oldBackgroundSource
      );

      removeSkillProficiencySource(
        oldBackgroundSource
      );

      removeListProficiencySource(
        oldBackgroundSource
      );
    }

    creatorState.draft.background = {
      ...createEmptyCharacter()
        .background,
      source: "skipped",
      featureChoices: {
        skipped: true
      }
    };

    creatorState.draft
      .features
      .backgroundFeatures = [];

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

    const oldBackgroundSource =
      getBackgroundSourceLabel(
        current
      );

    if (oldBackgroundSource) {
      handleSection14OldBackgroundEquipment(
        oldBackgroundSource
      );

      removeSkillProficiencySource(
        oldBackgroundSource
      );

      removeListProficiencySource(
        oldBackgroundSource
      );
    }

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

          customEquipmentItems:
            parseSection14List(
              $("ccCustomBackgroundEquipment")
                ?.value
            ),

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

    const selectedToolChoices =
      getSection14BackgroundChoiceList(
        "toolProficiencies"
      );

    const selectedLanguageChoices =
      getSection14BackgroundChoiceList(
        "languageProficiencies"
      );

    const toolRequired =
      Math.max(
        0,
        safeNumber(
          selectedBackground
            ?.toolChoices
            ?.choose,
          0
        )
      );

    const languageRequired =
      Math.max(
        0,
        safeNumber(
          selectedBackground
            ?.languageChoices
            ?.choose,
          0
        )
      );

    const backgroundChoiceHtml =
      selectedBackground &&
      creatorState.draft
        .background
        .source !== "skipped"
        ? `
          <hr>

          <h3>Background Choices</h3>

          <div class="hg-character-field-grid three">
            ${Array.from(
              { length: toolRequired },
              (_, index) => {
                return wizardSelect(
                  `Exact Tool Choice ${index + 1}`,
                  `ccBackgroundToolChoice-${index}`,
                  selectedToolChoices[index] ||
                    "",
                  [
                    {
                      value: "",
                      label: "Choose exact tool"
                    },
                    ...getSection14BackgroundToolOptionsForIndex(
                      selectedBackground,
                      index
                    ).map((tool) => {
                      return {
                        value: tool,
                        label: tool
                      };
                    })
                  ]
                );
              }
            ).join("")}

            ${Array.from(
              { length: languageRequired },
              (_, index) => {
                return wizardSelect(
                  `Language Choice ${index + 1}`,
                  `ccBackgroundLanguageChoice-${index}`,
                  selectedLanguageChoices[index] ||
                    "",
                  [
                    {
                      value: "",
                      label: "Choose language"
                    },
                    ...getSection14BackgroundLanguageOptions(
                      selectedBackground
                    ).map((language) => {
                      return {
                        value: language,
                        label: language
                      };
                    })
                  ]
                );
              }
            ).join("")}
          </div>

          ${
            toolRequired ||
            languageRequired
              ? `
                <div class="hg-character-inline-actions">
                  <button
                    type="button"
                    data-cc-action="apply-background-choices"
                  >
                    Apply Background Choices
                  </button>
                </div>
              `
              : `
                <div class="hg-character-placeholder">
                  This background has no tool or language choices.
                </div>
              `
          }
        `
        : "";

    const backgroundPackages =
      selectedBackground
        ? getSection14BackgroundPackages(
            selectedBackground
          )
        : [];

    const backgroundPackageCards =
      backgroundPackages
        .map((pack) => {
          return wizardChoiceCard(
            pack.name || "Background Equipment",
            `
              <p>
                ${
                  (Array.isArray(pack.items)
                    ? pack.items
                    : []
                  ).map((item) => {
                    return escapeHtml(
                      item.name ||
                      item.catalogId ||
                      "Item"
                    );
                  }).join(", ") ||
                  "No package items listed."
                }
              </p>
            `,
            "Apply Package",
            "apply-background-package",
            {
              "package-id": pack.id
            },
            cleanArray(
              creatorState.draft
                .background
                .featureChoices
                ?.appliedEquipmentPackageIds
            ).includes(pack.id)
          );
        })
        .join("");

    return `
      <div class="hg-character-current-choice">
        <b>Current background:</b>

        ${escapeHtml(
          creatorState.draft
            .background
            .source === "skipped"
            ? "No Background Selected"
            : getSafeBackgroundName() ||
              "None selected"
        )}
      </div>

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="skip-background"
        >
          Skip Background
        </button>
      </div>

      <div class="hg-character-choice-grid">
        ${backgroundCards}
      </div>

      ${backgroundChoiceHtml}

      ${
        backgroundPackages.length
          ? `
            <hr>

            <h3>Background Equipment Packages</h3>

            <div class="hg-character-choice-grid">
              ${backgroundPackageCards}
            </div>
          `
          : ""
      }

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
          "Equipment Package Items",
          "ccCustomBackgroundEquipment",

          customSelected
            ? formatSection14List(
                selectedBackground
                  ?.customEquipmentItems
              )
            : "",

          {
            placeholder:
              "Monster journal, silver badge, travel papers",

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
          ? cleanArray(raw.source)
          : raw?.proficient === true
            ? ["legacy"]
            : []
    };
  }

  function getSection14SkillSourceLabel(
    sourceType
  ) {
    if (sourceType === "class") {
      return getClassSourceLabel(
        getPrimaryClassEntry(
          creatorState.draft
        )
      );
    }

    if (sourceType === "background") {
      return getBackgroundSourceLabel(
        creatorState.draft
          .background
      );
    }

    if (sourceType === "legacy") {
      return "legacy";
    }

    return "manual";
  }

  function getSection14SkillChoiceList(
    sourceType
  ) {
    if (sourceType === "class") {
      const primaryClass =
        getPrimaryClassEntry(
          creatorState.draft
        );

      if (!primaryClass) {
        return [];
      }

      primaryClass.choices =
        primaryClass.choices || {};

      primaryClass.choices.skillProficiencyIds =
        cleanArray(
          primaryClass.choices
            .skillProficiencyIds
        );

      return primaryClass.choices
        .skillProficiencyIds;
    }

    if (sourceType === "background") {
      const background =
        creatorState.draft
          .background;

      background.featureChoices =
        background.featureChoices || {};

      background.featureChoices.skillProficiencyIds =
        cleanArray(
          background.featureChoices
            .skillProficiencyIds
        );

      return background.featureChoices
        .skillProficiencyIds;
    }

    return [];
  }

  function setSection14StoredSkillChoice(
    sourceType,
    skillId,
    selected
  ) {
    const choices =
      getSection14SkillChoiceList(
        sourceType
      );

    const cleanSkillId =
      cleanString(skillId);

    if (!cleanSkillId) {
      return choices;
    }

    const nextChoices =
      selected
        ? [
            ...new Set([
              ...choices,
              cleanSkillId
            ])
          ]
        : choices.filter((id) => {
            return id !== cleanSkillId;
          });

    if (sourceType === "class") {
      const primaryClass =
        getPrimaryClassEntry(
          creatorState.draft
        );

      if (primaryClass) {
        primaryClass.choices =
          primaryClass.choices || {};

        primaryClass.choices
          .skillProficiencyIds =
            nextChoices;
      }
    }

    if (sourceType === "background") {
      creatorState.draft
        .background
        .featureChoices =
          creatorState.draft
            .background
            .featureChoices || {};

      creatorState.draft
        .background
        .featureChoices
        .skillProficiencyIds =
          nextChoices;
    }

    return nextChoices;
  }

  function countSection14SkillSource(
    sourceType
  ) {
    const sourceLabel =
      getSection14SkillSourceLabel(
        sourceType
      );

    if (!sourceLabel) {
      return 0;
    }

    return Object.values(
      creatorState.draft
        .proficiencies
        .skills || {}
    ).filter((entry) => {
      return cleanArray(
        entry?.source
      ).includes(sourceLabel);
    }).length;
  }

  function countSection14ValidSkillSource(
    sourceType
  ) {
    const sourceLabel =
      getSection14SkillSourceLabel(
        sourceType
      );

    if (!sourceLabel) {
      return 0;
    }

    const choices =
      sourceType === "class"
        ? getSelectedClassTemplate()
            ?.skillChoices || {}
        : getSelectedSection14Background()
            ?.skillChoices || {};

    const allowed =
      cleanArray(choices.from)
        .map((name) => {
          return name.toLowerCase();
        });

    return SKILL_DEFINITIONS.filter((skill) => {
      if (
        allowed.length &&
        !allowed.includes(
          skill.name.toLowerCase()
        )
      ) {
        return false;
      }

      const entry =
        getSection14SkillEntry(skill);

      return cleanArray(entry.source)
        .includes(sourceLabel);
    }).length;
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
    skillId,
    sourceType = "manual"
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

    const sourceLabel =
      getSection14SkillSourceLabel(
        sourceType
      );

    if (!sourceLabel) {
      return false;
    }

    const currentSources =
      cleanArray(current.source);

    const alreadySelected =
      currentSources.includes(
        sourceLabel
      );

    if (
      !alreadySelected &&
      sourceType === "class"
    ) {
      const selectedClass =
        getSelectedClassTemplate();

      const maxChoices =
        Math.max(
          0,
          safeNumber(
            selectedClass
              ?.skillChoices
              ?.choose,
            0
          )
        );

      if (
        maxChoices > 0 &&
        countSection14SkillSource(
          "class"
        ) >= maxChoices
      ) {
        alert(
          `Choose only ${maxChoices} class skill proficienc${
            maxChoices === 1
              ? "y"
              : "ies"
          }.`
        );

        return false;
      }
    }

    if (
      !alreadySelected &&
      sourceType === "background"
    ) {
      const selectedBackground =
        getSelectedSection14Background();

      const maxChoices =
        Math.max(
          0,
          safeNumber(
            selectedBackground
              ?.skillChoices
              ?.choose,
            0
          )
        );

      if (
        maxChoices > 0 &&
        countSection14SkillSource(
          "background"
        ) >= maxChoices
      ) {
        alert(
          `Choose only ${maxChoices} background skill proficienc${
            maxChoices === 1
              ? "y"
              : "ies"
          }.`
        );

        return false;
      }
    }

    const nextSources =
      alreadySelected
        ? currentSources.filter(
            (source) => {
              return source !==
                sourceLabel;
            }
          )
        : [
            ...new Set([
              ...currentSources,
              sourceLabel
            ])
          ];

    if (
      sourceType === "class" ||
      sourceType === "background"
    ) {
      setSection14StoredSkillChoice(
        sourceType,
        skill.id,
        !alreadySelected
      );
    }

    setSection14SkillEntry(
      skill,
      {
        proficient:
          nextSources.length > 0,

        expertise:
          nextSources.length > 0 &&
          current.expertise === true,

        source: nextSources
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

    if (!current.proficient) {
      if (typeof alert === "function") {
        alert(
          "Choose proficiency before adding expertise."
        );
      }

      return false;
    }

    setSection14SkillEntry(
      skill,
      {
        proficient:
          current.proficient,

        expertise:
          !current.expertise,

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
    setManualProficiencyList(
      "savingThrows",
      parseSection14List(
        $("ccSavingThrowProficiencies")
          ?.value
      )
    );

    setManualProficiencyList(
      "armor",
      parseSection14List(
        $("ccArmorProficiencies")
          ?.value
      )
    );

    setManualProficiencyList(
      "weapons",
      parseSection14List(
        $("ccWeaponProficiencies")
          ?.value
      )
    );

    setManualProficiencyList(
      "tools",
      parseSection14List(
        $("ccToolProficiencies")
          ?.value
      )
    );

    setManualProficiencyList(
      "languages",
      parseSection14List(
        $("ccLanguageProficiencies")
          ?.value
      )
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

          const classSourceLabel =
            getSection14SkillSourceLabel(
              "class"
            );

          const backgroundSourceLabel =
            getSection14SkillSourceLabel(
              "background"
            );

          const classSelected =
            Boolean(
              classSourceLabel &&
              entry.source.includes(
                classSourceLabel
              )
            );

          const backgroundSelected =
            Boolean(
              backgroundSourceLabel &&
              entry.source.includes(
                backgroundSourceLabel
              )
            );

          const manualSelected =
            entry.source.includes(
              "manual"
            );

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
                ${
                  classAvailable &&
                  classSourceLabel
                    ? `
                      <button
                        type="button"
                        data-cc-action="toggle-skill-proficiency"
                        data-skill-id="${escapeHtml(
                          skill.id
                        )}"
                        data-skill-source="class"
                      >
                        ${
                          classSelected
                            ? "Remove Class"
                            : "Add Class"
                        }
                      </button>
                    `
                    : ""
                }

                ${
                  backgroundAvailable &&
                  backgroundSourceLabel
                    ? `
                      <button
                        type="button"
                        data-cc-action="toggle-skill-proficiency"
                        data-skill-id="${escapeHtml(
                          skill.id
                        )}"
                        data-skill-source="background"
                      >
                        ${
                          backgroundSelected
                            ? "Remove Background"
                            : "Add Background"
                        }
                      </button>
                    `
                    : ""
                }

                <button
                  type="button"
                  data-cc-action="toggle-skill-proficiency"
                  data-skill-id="${escapeHtml(
                    skill.id
                  )}"
                  data-skill-source="manual"
                >
                  ${
                    manualSelected
                      ? "Remove Manual"
                      : "Add Manual"
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

        ${countSection14ValidSkillSource(
          "class"
        )} /
        ${Math.max(
          0,
          safeNumber(
            classSkillChoices.choose,
            0
          )
        )}

        <br>

        <b>Background skill choices:</b>

        ${countSection14ValidSkillSource(
          "background"
        )} /
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
            getManualProficiencyList(
              "savingThrows"
            )
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
            getManualProficiencyList(
              "armor"
            )
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
            getManualProficiencyList(
              "weapons"
            )
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
            getManualProficiencyList(
              "tools"
            )
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
            getManualProficiencyList(
              "languages"
            )
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

  function handleSection14SkipBackground() {
    if (skipSection14Background()) {
      setStatus(
        "Background skipped."
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

  function handleSection14ApplyBackgroundChoices() {
    if (
      applySection14BackgroundChoices()
    ) {
      setStatus(
        "Background choices applied."
      );

      renderCreatorView();
    }
  }

  function handleSection14ApplyBackgroundPackage(
    ...values
  ) {
    const button =
      findSection14ActionElement(
        ...values
      );

    const packageId =
      button?.dataset?.packageId ||
      "";

    if (
      applySection14BackgroundPackage(
        packageId
      )
    ) {
      setStatus(
        "Background equipment package applied."
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

    const sourceType =
      button?.dataset
        ?.skillSource ||
      "manual";

    if (
      toggleSection14Skill(
        skillId,
        sourceType
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
    "skip-background",
    handleSection14SkipBackground
  );

  registerCharacterCreatorAction(
    "use-custom-background",
    handleSection14CustomBackground
  );

  registerCharacterCreatorAction(
    "apply-background-choices",
    handleSection14ApplyBackgroundChoices
  );

  registerCharacterCreatorAction(
    "apply-background-package",
    handleSection14ApplyBackgroundPackage
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

    const category =
      safeDisplayString(
        raw.category,
        "miscellaneous"
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

    const isMagical =
      raw.isMagical === true ||
      safeDisplayString(raw.category)
        .toLowerCase() === "magic-item";

    const requiresAttunement =
      isMagical &&
      (
        raw.requiresAttunement === true ||
        raw.attuned === true
      );

    const isContainer =
      raw.isContainer === true;

    const capacityWeight =
      raw.capacityWeight === null ||
      raw.capacityWeight === undefined ||
      raw.capacityWeight === ""
        ? null
        : Math.max(
            0,
            safeNumber(
              raw.capacityWeight,
              0
            )
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
            requiresAttunement &&
            $("ccNewItemAttuned")
              ?.checked === true
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
      getSection15AttunedItemCount() >= 3
    ) {
      alert(
        "A character can normally attune to no more than three items."
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

      if (getSection15AttunedItemCount() >= 3) {
        alert(
          "A character can normally attune to no more than three items."
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
    return getSection15Inventory()
      .filter((item) => {
        return (
          item.isMagical === true &&
          item.requiresAttunement === true &&
          item.attuned === true
        );
      })
      .length;
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

  function renderEquipmentStep() {
    const currency =
      creatorState.draft
        .equipment
        .currency;

    const inventoryCount =
      getSection15InventoryCount();

    const totalWeight =
      getSection15TotalWeight();

    const unknownWeightCount =
      getSection15UnknownWeightCount();

    const attunedCount =
      getSection15AttunedItemCount();

    const carrying =
      calculateRuleCarryingCapacity({
        strength:
          creatorState.draft
            .abilities
            .scores
            .str,
        size:
          creatorState.draft
            .identity
            .size
      });

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

    const armorCategoryChoices = [
      {
        value: "",
        label: "No Armor Type"
      },
      {
        value: "light armor",
        label: "Light Armor"
      },
      {
        value: "medium armor",
        label: "Medium Armor"
      },
      {
        value: "heavy armor",
        label: "Heavy Armor"
      },
      {
        value: "shield",
        label: "Shield"
      }
    ];

    const attackAbilityChoices = [
      {
        value: "",
        label: "Auto"
      },
      ...ABILITY_DEFINITIONS.map((ability) => {
        return {
          value: ability.id,
          label: ability.name
        };
      })
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

        <br>

        <b>Carrying capacity:</b>

        ${Number(
          carrying.carryingCapacity
            .toFixed(2)
        )} lb.

        <br>

        <b>Push, drag, lift:</b>

        ${Number(
          carrying.pushDragLift
            .toFixed(2)
        )} lb.

        <br>

        <b>Unknown weights:</b>

        ${unknownWeightCount}

        <br>

        <b>Attunement:</b>

        ${attunedCount} / 3
      </div>

      ${
        attunedCount >= 3
          ? `
            <div class="hg-character-warning">
              The normal attunement limit is reached.
            </div>
          `
          : ""
      }

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="skip-equipment"
        >
          No Starting Equipment
        </button>

        <button
          type="button"
          data-cc-action="toggle-contained-items"
        >
          ${
            creatorState.showContainedItems
              ? "Hide Contained Items"
              : "Show Contained Items"
          }
        </button>
      </div>

      <h3>Inventory</h3>

      <div class="hg-character-choice-grid">
        ${renderSection15Inventory()}
      </div>

      ${renderSection15OpenContainerPanel()}

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
          "Container Capacity",
          "ccNewItemCapacityWeight",
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

        ${wizardSelect(
          "Armor Type",
          "ccNewItemArmorCategory",
          "",
          armorCategoryChoices
        )}

        ${wizardField(
          "Base Armor Class",
          "ccNewItemBaseArmorClass",
          "",
          {
            type: "number",
            valueType: "number",
            placeholder:
              "Optional",
            extra:
              'min="0" step="1"'
          }
        )}

        ${wizardField(
          "Dexterity Cap",
          "ccNewItemDexterityCap",
          "",
          {
            type: "number",
            valueType: "number",
            placeholder:
              "Medium armor usually 2",
            extra:
              'step="1"'
          }
        )}

        ${wizardField(
          "Magic AC Bonus",
          "ccNewItemMagicalArmorBonus",
          0,
          {
            type: "number",
            valueType: "number",
            extra:
              'step="1"'
          }
        )}

        ${wizardField(
          "Weapon Type",
          "ccNewItemWeaponType",
          "",
          {
            placeholder:
              "simple melee, martial ranged..."
          }
        )}

        ${wizardSelect(
          "Attack Ability",
          "ccNewItemAttackAbility",
          "",
          attackAbilityChoices
        )}

        ${wizardField(
          "Damage Dice",
          "ccNewItemDamageDice",
          "",
          {
            placeholder:
              "1d8"
          }
        )}

        ${wizardField(
          "Versatile Dice",
          "ccNewItemVersatileDamageDice",
          "",
          {
            placeholder:
              "1d10"
          }
        )}

        ${wizardField(
          "Magic Attack Bonus",
          "ccNewItemMagicalAttackBonus",
          0,
          {
            type: "number",
            valueType: "number",
            extra:
              'step="1"'
          }
        )}

        ${wizardField(
          "Magic Damage Bonus",
          "ccNewItemMagicalDamageBonus",
          0,
          {
            type: "number",
            valueType: "number",
            extra:
              'step="1"'
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
            id="ccNewItemMagical"
            type="checkbox"
          >

          Magical
        </label>

        <label>
          <input
            id="ccNewItemRequiresAttunement"
            type="checkbox"
          >

          Requires attunement
        </label>

        <label>
          <input
            id="ccNewItemAttuned"
            type="checkbox"
          >

          Start attuned
        </label>

        <label>
          <input
            id="ccNewItemContainer"
            type="checkbox"
          >

          Container
        </label>

        <label>
          <input
            id="ccNewItemShield"
            type="checkbox"
          >

          Shield
        </label>

        <label>
          <input
            id="ccNewItemFinesse"
            type="checkbox"
          >

          Finesse
        </label>

        <label>
          <input
            id="ccNewItemRanged"
            type="checkbox"
          >

          Ranged
        </label>

        <label>
          <input
            id="ccNewItemThrown"
            type="checkbox"
          >

          Thrown
        </label>

        <label>
          <input
            id="ccNewItemProficient"
            type="checkbox"
          >

          Proficient
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

  function handleSection15SkipEquipment() {
    creatorState.draft
      .equipment
      .startingPackageId = "none";

    markDraftChanged();

    setStatus(
      "Starting equipment skipped."
    );

    renderCreatorView();
  }

  function handleSection15ToggleContainedItems() {
    creatorState.showContainedItems =
      creatorState.showContainedItems !== true;

    setStatus(
      creatorState.showContainedItems
        ? "Contained items are shown in the main inventory."
        : "Contained items are hidden from the main inventory."
    );

    renderCreatorView();
  }

  function handleSection15OpenContainer(
    ...values
  ) {
    const index =
      getSection15ActionIndex(
        ...values
      );

    const item =
      getSection15Inventory()[index];

    if (
      !item ||
      item.isContainer !== true
    ) {
      return;
    }

    const itemId =
      cleanString(item.id);

    creatorState.openContainerId =
      creatorState.openContainerId === itemId
        ? ""
        : itemId;

    setStatus(
      creatorState.openContainerId
        ? `${item.name || "Container"} opened.`
        : "Container closed."
    );

    renderCreatorView();
  }

  function handleSection15CloseContainer() {
    creatorState.openContainerId = "";

    setStatus(
      "Container closed."
    );

    renderCreatorView();
  }

  function handleSection15MoveItemOut(
    ...values
  ) {
    const index =
      getSection15ActionIndex(
        ...values
      );

    if (
      moveSection15ItemToContainer(
        index,
        "",
        null
      )
    ) {
      setStatus(
        "Item moved to general inventory."
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

    const result =
      removeSection15Item(
        index
      );

    if (result === "pending") {
      setStatus(
        "Choose how to handle the container's contents."
      );

      renderCreatorView();

      return;
    }

    if (result) {
      setStatus(
        "Item removed from inventory."
      );

      renderCreatorView();
    }
  }

  function handleSection15ResolveContainerRemoval(
    ...values
  ) {
    const button =
      findSection15ActionElement(
        ...values
      );

    const containerId =
      cleanString(
        button?.dataset
          ?.containerId
      );

    const removalMode =
      cleanString(
        button?.dataset
          ?.removalMode
      );

    const inventory =
      getSection15Inventory();

    const index =
      inventory.findIndex((item) => {
        return (
          cleanString(item.id) ===
          containerId
        );
      });

    const result =
      removeSection15Item(
        index,
        removalMode
      );

    if (result === "pending") {
      setStatus(
        "Choose how to handle the container's contents."
      );

      renderCreatorView();

      return;
    }

    if (removalMode === "cancel") {
      setStatus(
        "Container removal cancelled."
      );

      renderCreatorView();

      return;
    }

    if (result) {
      setStatus(
        removalMode === "delete"
          ? "Container and contents removed."
          : "Container removed and contents moved to inventory."
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

  function handleSection15Change(event) {
    const target =
      event?.target;

    if (
      target?.dataset
        ?.ccActionChange !==
      "move-item-container" &&
      target?.dataset
        ?.ccActionChange !==
      "update-inventory-item"
    ) {
      return false;
    }

    const index =
      Math.round(
        safeNumber(
          target.dataset.index,
          -1
        )
      );

    if (
      target.dataset
        .ccActionChange ===
      "update-inventory-item"
    ) {
      if (
        updateSection15InventoryItem(
          index,
          target.dataset.itemField,
          target.value,
          target.dataset.valueType,
          target.checked
        )
      ) {
        setStatus(
          "Inventory item updated."
        );

        renderCreatorView();
      }

      return true;
    }

    const quantityInput =
      typeof document !== "undefined"
        ? document.getElementById(
            `ccItemMoveQuantity-${index}`
          )
        : null;

    const itemBeforeMove =
      getSection15Inventory()[index];

    const movingIntoContainer =
      Boolean(
        cleanString(target.value)
      );

    const clearsEquippedState =
      movingIntoContainer &&
      (
        itemBeforeMove?.equipped === true ||
        itemBeforeMove?.attuned === true
      );

    if (
      moveSection15ItemToContainer(
        index,
        target.value,
        quantityInput?.value
      )
    ) {
      setStatus(
        clearsEquippedState
          ? "Container assignment updated; stored items were unequipped and unattuned."
          : "Container assignment updated."
      );

      renderCreatorView();
    }

    return true;
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
    "skip-equipment",
    handleSection15SkipEquipment
  );

  registerCharacterCreatorAction(
    "toggle-contained-items",
    handleSection15ToggleContainedItems
  );

  registerCharacterCreatorAction(
    "open-container",
    handleSection15OpenContainer
  );

  registerCharacterCreatorAction(
    "close-container",
    handleSection15CloseContainer
  );

  registerCharacterCreatorAction(
    "move-item-out-container",
    handleSection15MoveItemOut
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

  registerCharacterCreatorAction(
    "resolve-container-removal",
    handleSection15ResolveContainerRemoval
  );

  registerCharacterCreatorChangeHandler(
    handleSection15Change
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
          raw.classId ||
          raw.spellcastingSourceId
        ),

      spellcastingSourceId:
        cleanString(
          raw.spellcastingSourceId ||
          raw.classId
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

  function getSection16KnownLimitWarning(
    spell
  ) {
    const limits =
      getSpellSelectionLimits(
        creatorState.draft
      );

    const spellLevel =
      safeNumber(spell?.level, 0);

    const sourceWarning =
      getSpellSourceWarning(
        creatorState.draft,
        spell
      );

    if (sourceWarning) {
      return sourceWarning;
    }

    if (
      spellLevel > 0 &&
      limits.maxSpellLevel !== null &&
      spellLevel > limits.maxSpellLevel &&
      spell?.manualOverride !== true
    ) {
      return "That spell is above the currently available spell level.";
    }

    if (
      spellLevel === 0 &&
      limits.cantripsKnownLimit !== null &&
      limits.knownCantripCount >=
        limits.cantripsKnownLimit
    ) {
      return "Known cantrips are already at the calculated limit.";
    }

    if (
      spellLevel > 0 &&
      limits.spellsKnownLimit !== null &&
      limits.knownLeveledCount >=
        limits.spellsKnownLimit
    ) {
      return "Known leveled spells are already at the calculated limit.";
    }

    return "";
  }

  function getSection16PreparedLimitWarning() {
    const limits =
      getSpellSelectionLimits(
        creatorState.draft
      );

    if (
      limits.preparedLimit !== null &&
      limits.preparedCount >=
        limits.preparedLimit
    ) {
      return "Prepared spells are already at the calculated limit.";
    }

    return "";
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
      const warning =
        getSection16KnownLimitWarning(
          spell
        );

      if (warning) {
        alert(warning);
        return false;
      }

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
      const warning =
        getSection16KnownLimitWarning(
          spell
        );

      if (warning) {
        alert(warning);
        return false;
      }

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
      const warning =
        getSection16PreparedLimitWarning();

      if (warning) {
        alert(warning);
        return false;
      }

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

    const spellcastingOptions =
      getSpellcastingClassOptions(
        creatorState.draft
      );

    const selectedClassId =
      cleanString(
        $("ccNewSpellClassId")
          ?.value
      ) ||
      (
        spellcastingOptions.length === 1
          ? cleanString(
              spellcastingOptions[0]
                .classId
            )
          : ""
      );

    if (
      spellcastingOptions.length > 1 &&
      !selectedClassId
    ) {
      alert(
        "Choose which class this spell belongs to."
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

          classId:
            selectedClassId,

          spellcastingSourceId:
            selectedClassId,

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
          spell
        );

      if (warning) {
        alert(warning);
        return false;
      }
    }

    if (startPrepared) {
      const preparedWarning =
        getSection16PreparedLimitWarning();

      if (preparedWarning) {
        alert(preparedWarning);
        return false;
      }
    }

    getSection16CustomSpells()
      .push(spell);

    if (
      startKnown ||
      startPrepared
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
    }

    if (startPrepared) {
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

        const sourceEntry =
          getSpellcastingEntryForSpell(
            creatorState.draft,
            spell
          );

        const sourceId =
          getSpellSourceId(spell);

        const sourceLabel =
          sourceEntry?.className ||
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

  function renderSection16InnateSpells() {
    const spells =
      getSection16InnateSpells();

    if (!spells.length) {
      return `
        <div class="hg-character-placeholder">
          No innate species spells are currently recorded.
        </div>
      `;
    }

    return spells
      .map((spell) => {
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
          <article class="hg-character-choice-card selected">
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

              <br>

              <b>Source:</b>

              ${escapeHtml(
                spell.source ||
                spell.innateSource ||
                "species"
              )}

              <br>

              <b>Spellcasting Ability:</b>

              ${escapeHtml(
                cleanString(
                  spell.spellcastingAbility
                ).toUpperCase() ||
                "None"
              )}
            </p>

            ${
              spell.summary ||
              spell.description
                ? `
                  <p class="small">
                    ${escapeHtml(
                      spell.summary ||
                      spell.description
                    )}
                  </p>
                `
                : ""
            }
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

    const selectedClass =
      getSelectedClassTemplate();

    const classSpellcastingAbility =
      selectedClass?.source !== "custom"
        ? cleanString(
            selectedClass?.spellcastingAbility
          )
        : "";

    const spellcastingAbilityLocked =
      Boolean(classSpellcastingAbility);

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

    const spellClassChoices = [
      {
        value: "",
        label: "Choose class source"
      },

      ...getSpellcastingClassOptions(
        creatorState.draft
      ).map((entry) => {
        return {
          value: entry.classId,
          label:
            entry.className ||
            entry.classId ||
            "Class"
        };
      })
    ];

    const knownCount =
      getSection16KnownSpellIds()
        .length;

    const preparedCount =
      getSection16PreparedSpellIds()
        .length;

    const spellLimits =
      getSpellSelectionLimits(
        creatorState.draft
      );

    const nonSpellcaster =
      isCharacterNonSpellcaster(
        creatorState.draft
      );

    return `
      <div class="hg-character-current-choice">
        <b>Known Spells:</b>

        ${knownCount}

        ${
          spellLimits.spellsKnownLimit === null
            ? ""
            : ` / ${spellLimits.spellsKnownLimit} leveled`
        }

        <br>

        <b>Known Cantrips:</b>

        ${spellLimits.knownCantripCount}

        ${
          spellLimits.cantripsKnownLimit === null
            ? ""
            : ` / ${spellLimits.cantripsKnownLimit}`
        }

        <br>

        <b>Prepared Spells:</b>

        ${preparedCount}

        ${
          spellLimits.preparedLimit === null
            ? ""
            : ` / ${spellLimits.preparedLimit}`
        }

        <br>

        <b>Maximum Spell Level:</b>

        ${
          spellLimits.maxSpellLevel === null
            ? "None"
            : spellLimits.maxSpellLevel
        }

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

        <br>

        <b>Progression:</b>

        ${escapeHtml(
          magic.spellcastingProgression ||
          "none"
        )}

        ${
          magic.pactMagic?.slots
            ? `
              <br>

              <b>Pact Magic:</b>

              ${safeNumber(
                magic.pactMagic.slots,
                0
              )} slot(s), level ${safeNumber(
                magic.pactMagic.slotLevel,
                0
              )}
            `
            : ""
        }
      </div>

      <div class="hg-character-choice-grid">
        ${renderSection17SpellcastingSummary()}
      </div>

      ${
        nonSpellcaster
          ? `
            <div class="hg-character-placeholder">
              This character is not a spellcaster. No spell selections are required.
            </div>
          `
          : ""
      }

      <h3>Spellcasting</h3>

      <div class="hg-character-field-grid three">
        ${wizardSelect(
          "Spellcasting Ability",
          "ccSpellcastingAbility",

          classSpellcastingAbility ||
          magic.spellcastingAbility ||
          "",

          abilityChoices,

          {
            path:
              "magic.spellcastingAbility",

            extra:
              spellcastingAbilityLocked
                ? "disabled"
                : ""
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

      <h3>Innate Species Spells</h3>

      <div class="hg-character-choice-grid">
        ${renderSection16InnateSpells()}
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
          "Class Source",
          "ccNewSpellClassId",
          spellClassChoices.length === 2
            ? spellClassChoices[1].value
            : "",
          spellClassChoices
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

        <label>
          <input
            id="ccNewSpellManualOverride"
            type="checkbox"
          >

          Manual spell-level override
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
    return calculateCharacterSkillModifier(
      creatorState.draft,
      skill
    );
  }

  function getSection17PassivePerception() {
    return (
      calculateCharacterPassiveScores(
        creatorState.draft
      ).perception?.total || 10
    );
  }

  function getSection17Initiative() {
    return calculateCharacterInitiative(
      creatorState.draft
    ).total;
  }

  function getSection17CarryingCapacity() {
    return calculateRuleCarryingCapacity({
      strength:
        creatorState.draft
          .abilities
          .scores
          .str,
      size:
        creatorState.draft
          .identity
          .size
    }).carryingCapacity;
  }

  function getSection17InventoryWeight() {
    return calculateInventoryWeightSummary(
      creatorState.draft
        .equipment
        .items
    ).knownWeight;
  }

  function getSection17SpellCount() {
    return (
      (
        Array.isArray(
          creatorState.draft
            .magic
            .customSpells
        )
          ? creatorState.draft
              .magic
              .customSpells
              .length
          : 0
      ) +
      getSection16InnateSpells(
        creatorState.draft
      ).length
    );
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

    if (!isSection17AbilitiesComplete(draft)) {
      warnings.push(
        "Review and confirm the ability scores before finishing."
      );
    }

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

    const hpSummary =
      calculateCharacterHp(draft);

    if (
      hpSummary.mode === "rolled" &&
      hpSummary.rolls.length <
        Math.max(0, hpSummary.level - 1)
    ) {
      warnings.push(
        "Rolled HP is missing one or more level-up rolls."
      );
    }

    if (
      hpSummary.mode === "manual" &&
      (
        hpSummary.manualOverride === null ||
        hpSummary.manualOverride === undefined
      )
    ) {
      warnings.push(
        "Manual HP mode needs a manual HP value."
      );
    }

    if (
      draft.combat.armorClassMode ===
        "manual" &&
      safeNumber(
        draft.combat.manualArmorClass,
        0
      ) < 1
    ) {
      warnings.push(
        "Manual armor class must be at least 1."
      );
    }

    const armorOptions =
      calculateArmorClassOptions(draft)
        .options;

    const selectedArmorMethod =
      cleanString(
        draft.combat
          .selectedArmorClassMethod
      );

    if (
      draft.combat.armorClassMode !==
        "manual" &&
      selectedArmorMethod &&
      !armorOptions.some((option) => {
        return (
          option.id === selectedArmorMethod
        );
      })
    ) {
      warnings.push(
        "Selected armor class method is no longer valid."
      );
    }

    const equippedArmor =
      (Array.isArray(
        draft.equipment.items
      )
        ? draft.equipment.items
        : []
      ).filter((item) => {
        return (
          item.equipped === true &&
          item.baseArmorClass &&
          item.isShield !== true
        );
      });

    if (equippedArmor.length > 1) {
      warnings.push(
        "More than one armor item is equipped."
      );
    }

    const equippedShields =
      (Array.isArray(
        draft.equipment.items
      )
        ? draft.equipment.items
        : []
      ).filter((item) => {
        return (
          item.equipped === true &&
          item.isShield === true &&
          !cleanString(item.containerId)
        );
      });

    if (equippedShields.length > 1) {
      warnings.push(
        "More than one shield is equipped; only one shield can add to armor class."
      );
    }

    (Array.isArray(
      draft.equipment.items
    )
      ? draft.equipment.items
      : []
    ).forEach((item) => {
      if (
        cleanString(item.containerId) &&
        item.equipped === true
      ) {
        warnings.push(
          `${item.name || "An item"} is equipped while stored inside a container.`
        );
      }
    });

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

    const selectedBackground =
      getSelectedSection14Background();

    if (!isSection17SpeciesComplete(draft)) {
      const species =
        draft.species || {};

      const template =
        species.templateSnapshot ||
        DEFAULT_SPECIES_TEMPLATES.find(
          (item) => {
            return item.id === species.id;
          }
        );

      if (
        Array.isArray(template?.subraces) &&
        template.subraces.length > 0
      ) {
        warnings.push(
          "Choose a subrace for the selected species."
        );
      } else if (species.id === "dragonborn") {
        warnings.push(
          "Choose a Dragonborn ancestry."
        );
      } else if (species.id === "half-elf") {
        warnings.push(
          "Choose Half-Elf ability, skill, and language choices."
        );
      } else if (species.id === "dwarf") {
        warnings.push(
          "Choose a Dwarf tool proficiency."
        );
      } else if (species.id === "human") {
        warnings.push(
          "Choose a Human additional language."
        );
      } else if (
        species.id === "elf" &&
        species.choices?.subraceId ===
          "high-elf"
      ) {
        warnings.push(
          "Choose a High Elf language and wizard cantrip."
        );
      } else {
        warnings.push(
          "Choose a species before finishing."
        );
      }
    }

    const requiredClassSkills =
      Math.max(
        0,
        safeNumber(
          selectedClass
            ?.skillChoices
            ?.choose,
          0
        )
      );

    const selectedClassSkills =
      countSection14ValidSkillSource(
        "class"
      );

    if (
      requiredClassSkills > 0 &&
      selectedClassSkills !==
        requiredClassSkills
    ) {
      warnings.push(
        `Choose exactly ${requiredClassSkills} valid class skill proficiencies.`
      );
    }

    const requiredBackgroundSkills =
      Math.max(
        0,
        safeNumber(
          selectedBackground
            ?.skillChoices
            ?.choose,
          0
        )
      );

    const selectedBackgroundSkills =
      countSection14ValidSkillSource(
        "background"
      );

    if (
      requiredBackgroundSkills > 0 &&
      selectedBackgroundSkills !==
        requiredBackgroundSkills
    ) {
      warnings.push(
        `Choose exactly ${requiredBackgroundSkills} valid background skill proficiencies.`
      );
    }

    const requiredBackgroundTools =
      Math.max(
        0,
        safeNumber(
          selectedBackground
            ?.toolChoices
            ?.choose,
          0
        )
      );

    if (
      requiredBackgroundTools > 0 &&
      countSection14ValidBackgroundToolChoices(
        selectedBackground
      ) !== requiredBackgroundTools
    ) {
      warnings.push(
        `Choose exactly ${requiredBackgroundTools} exact background tool proficienc${
          requiredBackgroundTools === 1
            ? "y"
            : "ies"
        }.`
      );
    }

    const requiredBackgroundLanguages =
      Math.max(
        0,
        safeNumber(
          selectedBackground
            ?.languageChoices
            ?.choose,
          0
        )
      );

    if (
      requiredBackgroundLanguages > 0 &&
      countSection14BackgroundSourceList(
        "languages"
      ) !== requiredBackgroundLanguages
    ) {
      warnings.push(
        `Choose exactly ${requiredBackgroundLanguages} background language${
          requiredBackgroundLanguages === 1
            ? ""
            : "s"
        }.`
      );
    }

    Object.values(
      draft.proficiencies
        .skills || {}
    ).forEach((entry) => {
      if (
        entry?.expertise === true &&
        entry?.proficient !== true
      ) {
        warnings.push(
          "Expertise cannot exist without proficiency."
        );
      }
    });

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

    const inventoryWeight =
      calculateInventoryWeightSummary(
        draft.equipment.items
      );

    const carrying =
      calculateRuleCarryingCapacity({
        strength:
          draft.abilities.scores.str,
        size:
          draft.identity.size
      });

    if (
      inventoryWeight.unknownCount === 0 &&
      inventoryWeight.knownWeight >
        carrying.carryingCapacity
    ) {
      warnings.push(
        "Inventory weight exceeds carrying capacity."
      );
    }

    if (
      getSection15AttunedItemCount() > 3
    ) {
      warnings.push(
        "More than three items are attuned."
      );
    }

    validateContainerState(
      draft.equipment.items
    ).forEach((warning) => {
      warnings.push(warning);
    });

    const spellLimits =
      getSpellSelectionLimits(draft);

    if (
      spellLimits.cantripsKnownLimit !== null &&
      spellLimits.knownCantripCount >
        spellLimits.cantripsKnownLimit
    ) {
      warnings.push(
        "Known cantrips exceed the calculated limit."
      );
    }

    if (
      spellLimits.spellsKnownLimit !== null &&
      spellLimits.knownLeveledCount >
        spellLimits.spellsKnownLimit
    ) {
      warnings.push(
        "Known leveled spells exceed the calculated limit."
      );
    }

    if (
      spellLimits.preparedLimit !== null &&
      spellLimits.preparedCount >
        spellLimits.preparedLimit
    ) {
      warnings.push(
        "Prepared spells exceed the calculated limit."
      );
    }

    const spellById =
      new Map(
        (
          Array.isArray(
            draft.magic.customSpells
          )
            ? draft.magic.customSpells
            : []
        ).map((spell) => {
          return [spell.id, spell];
        })
      );

    [...knownIds, ...preparedIds]
      .forEach((spellId) => {
        const spell =
          spellById.get(spellId);

        if (!spell) {
          return;
        }

        const sourceWarning =
          getSpellSourceWarning(
            draft,
            spell
          );

        if (sourceWarning) {
          warnings.push(sourceWarning);
          return;
        }

        if (
          spellLimits.maxSpellLevel !== null &&
          safeNumber(spell.level, 0) >
            spellLimits.maxSpellLevel &&
          spell.manualOverride !== true
        ) {
          warnings.push(
            `${spell.name || "A selected spell"} is above the calculated maximum spell level.`
          );
        }
      });

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
        ...(creatorState.draft
          .builder
          .validation || {}),

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
    const bonusSources =
      ensureAbilityBonusSources(
        creatorState.draft
      );

    return ABILITY_DEFINITIONS
      .map((ability) => {
        const base =
          safeNumber(
            creatorState.draft
              .abilities
              .base?.[ability.id],
            10
          );

        const bonus =
          safeNumber(
            creatorState.draft
              .abilities
              .bonuses?.[ability.id],
            0
          );

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
              <b>Base Score:</b>
              ${base}

              <br>

              <b>Bonus Total:</b>
              ${formatSection17Modifier(bonus)}

              <br>

              <b>Bonus Sources:</b>
              ${
                Object.entries(bonusSources)
                  .map(([sourceName, sourceMap]) => {
                    const sourceBonus =
                      safeNumber(
                        sourceMap?.[ability.id],
                        0
                      );

                    return sourceBonus
                      ? `${sourceName} ${formatSection17Modifier(sourceBonus)}`
                      : "";
                  })
                  .filter(Boolean)
                  .map((sourceText) => {
                    return escapeHtml(
                      sourceText
                    );
                  })
                  .join("<br>") ||
                "None"
              }

              <br>

              <b>Final Score:</b>
              ${score}

              <br>

              <b>Modifier:</b>
              ${formatSection17Modifier(modifier)}
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

  function renderSection17BackgroundChoices() {
    const background =
      creatorState.draft.background || {};

    const choices =
      background.featureChoices || {};

    const sourceTools =
      getSection14BackgroundSourceValues(
        "tools"
      );

    const sourceLanguages =
      getSection14BackgroundSourceValues(
        "languages"
      );

    const exactTools =
      uniqueCleanArray([
        ...cleanArray(
          choices.toolProficiencies
        ),
        ...sourceTools
      ]);

    const exactLanguages =
      uniqueCleanArray([
        ...cleanArray(
          choices.languageProficiencies
        ),
        ...sourceLanguages
      ]);

    return [
      renderSection17List(
        "Exact Tools, Instruments, and Gaming Sets",
        exactTools,
        "No exact background tool choices selected."
      ),
      renderSection17List(
        "Exact Background Languages",
        exactLanguages,
        "No background language choices selected."
      )
    ].join("");
  }

  function renderSection17BackgroundGrants() {
    const items =
      getSection15Inventory()
        .filter((item) => {
          return cleanString(
            item.source
          ).startsWith("background:");
        });

    const currencySources =
      ensureEquipmentCurrencySources(
        creatorState.draft.equipment
      );

    const currencyCards =
      Object.entries(currencySources)
        .filter(([sourceName]) => {
          return cleanString(sourceName)
            .startsWith("background:");
        })
        .flatMap(([sourceName, packageMap]) => {
          return Object.entries(
            packageMap || {}
          )
            .filter(([, currency]) => {
              return hasCurrencyValue(
                currency
              );
            })
            .map(([packageId, currency]) => {
              return {
                sourceName,
                packageId,
                currency
              };
            });
        });

    if (
      !items.length &&
      !currencyCards.length
    ) {
      return `
        <div class="hg-character-placeholder">
          No background-granted items or currency recorded.
        </div>
      `;
    }

    const itemCards =
      items.map((item) => {
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
                "Background Item"
              )}
            </h3>

            <p>
              <b>Quantity:</b>
              ${quantity}

              <br>

              <b>Source:</b>
              ${escapeHtml(
                item.source || "background"
              )}

              ${
                item.backgroundPackageId
                  ? `
                    <br>
                    <b>Package:</b>
                    ${escapeHtml(
                      item.backgroundPackageId
                    )}
                  `
                  : ""
              }
            </p>
          </article>
        `;
      });

    const currencyGrantCards =
      currencyCards.map((grant) => {
        return `
          <article class="hg-character-choice-card">
            <h3>Background Currency</h3>

            <p>
              <b>Amount:</b>
              ${escapeHtml(
                formatSection14CurrencySummary(
                  grant.currency
                )
              )}

              <br>

              <b>Source:</b>
              ${escapeHtml(grant.sourceName)}

              <br>

              <b>Package:</b>
              ${escapeHtml(grant.packageId)}
            </p>
          </article>
        `;
      });

    return [
      ...itemCards,
      ...currencyGrantCards
    ].join("");
  }

  function renderSection17SavingThrows() {
    return calculateCharacterSavingThrows(
      creatorState.draft
    )
      .map((save) => {
        return `
          <article class="hg-character-choice-card">
            <h3>
              ${escapeHtml(save.name)}
            </h3>

            <p>
              <b>
                ${formatSection17Modifier(
                  save.total
                )}
              </b>

              <br>

              ${
                save.proficient
                  ? "Proficient"
                  : "Not proficient"
              }
            </p>
          </article>
        `;
      })
      .join("");
  }

  function renderSection17PassiveScores() {
    const scores =
      calculateCharacterPassiveScores(
        creatorState.draft
      );

    return Object.values(scores)
      .map((score) => {
        return `
          <article class="hg-character-choice-card">
            <h3>
              ${escapeHtml(score.name)}
            </h3>

            <p>
              <b>${score.total}</b>

              <br>

              Skill
              ${formatSection17Modifier(
                score.skillModifier
              )}

              ${
                score.advantage
                  ? "<br>Advantage +5"
                  : ""
              }

              ${
                score.disadvantage
                  ? "<br>Disadvantage -5"
                  : ""
              }
            </p>
          </article>
        `;
      })
      .join("");
  }

  function renderSection17HitDice() {
    const hitDice =
      calculateCharacterHitDice(
        creatorState.draft
      );

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
                "Class"
              )}
            </h3>

            <p>
              <b>
                ${Math.max(
                  1,
                  safeNumber(
                    entry.count,
                    1
                  )
                )}
                ${escapeHtml(
                  entry.die || "d8"
                )}
              </b>
            </p>
          </article>
        `;
      })
      .join("");
  }

  function renderSection17WeaponAttacks() {
    const attacks =
      calculateEquippedWeaponAttacks(
        creatorState.draft
      );

    if (!attacks.length) {
      return `
        <div class="hg-character-placeholder">
          No equipped weapon attacks calculated.
        </div>
      `;
    }

    return attacks
      .map((attack) => {
        return `
          <article class="hg-character-choice-card">
            <h3>
              ${escapeHtml(attack.name)}
            </h3>

            <p>
              <b>Attack:</b>
              ${formatSection17Modifier(
                attack.attackBonus
              )}

              <br>

              <b>Damage:</b>
              ${escapeHtml(
                attack.damageDice || "damage"
              )}
              ${formatSection17Modifier(
                attack.damageModifier
              )}

              <br>

              ${escapeHtml(
                attack.proficient
                  ? "Proficient"
                  : "Not proficient"
              )}
            </p>
          </article>
        `;
      })
      .join("");
  }

  function renderSection17ContainerSummary() {
    const containers =
      getContainerSummaries(
        creatorState.draft
          .equipment
          .items
      );

    if (!containers.length) {
      return `
        <div class="hg-character-placeholder">
          No containers are recorded.
        </div>
      `;
    }

    return containers
      .map((container) => {
        return `
          <article class="hg-character-choice-card">
            <h3>
              ${escapeHtml(
                container.name ||
                "Container"
              )}
            </h3>

            <p>
              <b>Contents:</b>
              ${container.contents.length}

              <br>

              <b>Known Weight:</b>
              ${Number(
                container.knownWeight.toFixed(2)
              )} lb.

              <br>

              <b>Capacity:</b>
              ${
                container.capacityWeight === null
                  ? "Not set"
                  : `${Number(
                      container.capacityWeight
                        .toFixed(2)
                    )} lb.`
              }

              ${
                container.unknownCount
                  ? `<br>${container.unknownCount} unknown item weight(s)`
                  : ""
              }
            </p>
          </article>
        `;
      })
      .join("");
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

    const classCards =
      summary.classes.map((entry) => {
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
              )}
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

  function renderSection17ClassSpells() {
    const spells =
      Array.isArray(
        creatorState.draft
          .magic
          .customSpells
      )
        ? creatorState.draft
            .magic
            .customSpells
        : [];

    if (!spells.length) {
      return `
        <div class="hg-character-placeholder">
          No class spell records are currently listed.
        </div>
      `;
    }

    const knownIds =
      cleanArray(
        creatorState.draft
          .magic
          .knownSpellIds
      );

    const preparedIds =
      cleanArray(
        creatorState.draft
          .magic
          .preparedSpellIds
      );

    return spells
      .map((spell) => {
        const spellLevel =
          safeNumber(
            spell.level,
            0
          );

        const known =
          knownIds.includes(spell.id);

        const prepared =
          preparedIds.includes(spell.id);

        return `
          <article class="hg-character-choice-card">
            <h3>
              ${escapeHtml(
                spell.name ||
                "Unnamed Spell"
              )}
            </h3>

            <p>
              <b>Level:</b>
              ${
                spellLevel === 0
                  ? "Cantrip"
                  : spellLevel
              }

              <br>

              <b>Status:</b>
              ${
                prepared
                  ? "Prepared"
                  : known
                    ? "Known"
                    : "Not selected"
              }

              ${
                getSpellSourceId(spell)
                  ? `
                    <br>
                    <b>Source:</b>
                    ${escapeHtml(
                      getSpellSourceId(spell)
                    )}
                  `
                  : ""
              }
            </p>
          </article>
        `;
      })
      .join("");
  }

  function renderSection17InnateSpells() {
    const spells =
      getSection16InnateSpells(
        creatorState.draft
      );

    if (!spells.length) {
      return `
        <div class="hg-character-placeholder">
          No innate species spells are currently listed.
        </div>
      `;
    }

    return spells
      .map((spell) => {
        const spellLevel =
          safeNumber(
            spell.level,
            0
          );

        return `
          <article class="hg-character-choice-card">
            <h3>
              ${escapeHtml(
                spell.name ||
                "Innate Spell"
              )}
            </h3>

            <p>
              <b>Level:</b>
              ${
                spellLevel === 0
                  ? "Cantrip"
                  : spellLevel
              }

              <br>

              <b>Source:</b>
              ${escapeHtml(
                spell.source ||
                spell.innateSource ||
                "species"
              )}

              <br>

              <b>Spellcasting Ability:</b>
              ${escapeHtml(
                cleanString(
                  spell.spellcastingAbility
                ).toUpperCase() ||
                "None"
              )}
            </p>
          </article>
        `;
      })
      .join("");
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

  function getSection17MigrationWarnings() {
    return cleanArray(
      creatorState.draft
        ?.builder
        ?.validation
        ?.migrationWarnings
    );
  }

  function renderSection17MigrationWarnings() {
    const warnings =
      getSection17MigrationWarnings();

    if (!warnings.length) {
      return "";
    }

    return `
      <div class="hg-character-warning">
        <b>Migration Warnings Requiring Review:</b>

        <ul>
          ${warnings
            .map((warning) => {
              return `
                <li>
                  ${escapeHtml(warning)}
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

    const inventoryWeightSummary =
      calculateInventoryWeightSummary(
        draft.equipment.items
      );

    const carryingCapacity =
      getSection17CarryingCapacity();

    const initiative =
      getSection17Initiative();

    const initiativeSummary =
      calculateCharacterInitiative(draft);

    const armorClass =
      calculateArmorClassOptions(draft)
        .selected;

    const hpSummary =
      calculateCharacterHp(draft);

    const proficiencyBonus =
      getSection17ProficiencyBonus();

    const currency =
      draft.equipment
        .currency;

    return `
      ${renderSection17Warnings(
        warnings
      )}

      ${renderSection17MigrationWarnings()}

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
              ${armorClass.total}
            </b>

            <br>

            ${escapeHtml(
              armorClass.label
            )}

            <br>

            <span class="small">
              ${escapeHtml(
                armorClass.breakdown
              )}
            </span>
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
              ${hpSummary.maximumHp}
            </b>

            <br>

            <span class="small">
              ${escapeHtml(
                hpSummary.mode
              )}
              HP,
              ${escapeHtml(
                hpSummary.hitDie
              )},
              Con
              ${formatSection17Modifier(
                hpSummary.constitutionModifier
              )}
            </span>

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

            <br>

            <span class="small">
              Dex
              ${formatSection17Modifier(
                initiativeSummary.dexterityModifier
              )}
              ${
                initiativeSummary.proficiencyBonus
                  ? `, proficiency ${formatSection17Modifier(
                      initiativeSummary.proficiencyBonus
                    )}`
                  : ""
              }
              ${
                initiativeSummary.bonus
                  ? `, bonus ${formatSection17Modifier(
                      initiativeSummary.bonus
                    )}`
                  : ""
              }
            </span>
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

      <h3>Hit Dice</h3>

      <div class="hg-character-choice-grid">
        ${renderSection17HitDice()}
      </div>

      <hr>

      <h3>Equipped Weapon Attacks</h3>

      <div class="hg-character-choice-grid">
        ${renderSection17WeaponAttacks()}
      </div>

      <hr>

      <h3>Ability Scores</h3>

      <div class="hg-character-choice-grid">
        ${renderSection17Abilities()}
      </div>

      <hr>

      <h3>Saving Throws</h3>

      <div class="hg-character-choice-grid">
        ${renderSection17SavingThrows()}
      </div>

      <hr>

      <h3>Passive Scores</h3>

      <div class="hg-character-choice-grid">
        ${renderSection17PassiveScores()}
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

      <h3>Exact Background Choices</h3>

      <div class="hg-character-choice-grid">
        ${renderSection17BackgroundChoices()}
      </div>

      <hr>

      <h3>Inventory</h3>

      <div class="hg-character-current-choice">
        <b>Recorded Weight:</b>

        ${Number(
          inventoryWeightSummary
            .knownWeight
            .toFixed(2)
        )}
        lb.

        <br>

        <b>Unknown Weights:</b>

        ${inventoryWeightSummary.unknownCount}

        <br>

        <b>Carrying Capacity:</b>

        ${carryingCapacity}
        lb.

        <br>

        <b>Attunement:</b>

        ${getSection15AttunedItemCount()} / 3

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

      <h3>Background Items and Currency</h3>

      <div class="hg-character-choice-grid">
        ${renderSection17BackgroundGrants()}
      </div>

      <h3>All Inventory</h3>

      <div class="hg-character-choice-grid">
        ${renderSection17Inventory()}
      </div>

      <h3>Containers</h3>

      <div class="hg-character-choice-grid">
        ${renderSection17ContainerSummary()}
      </div>

      <hr>

      <h3>Spells and Features</h3>

      <div class="hg-character-current-choice">
        <b>Class Spell Records:</b>

        ${
          Array.isArray(
            draft.magic
              .customSpells
          )
            ? draft.magic
                .customSpells
                .length
            : 0
        }

        <br>

        <b>Innate Species Spells:</b>

        ${
          getSection16InnateSpells(
            draft
          ).length
        }

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

      <h3>Class Spells</h3>

      <div class="hg-character-choice-grid">
        ${renderSection17ClassSpells()}
      </div>

      <h3>Innate Species Spells</h3>

      <div class="hg-character-choice-grid">
        ${renderSection17InnateSpells()}
      </div>

      <h3>Spellcasting Rules</h3>

      <div class="hg-character-choice-grid">
        ${renderSection17SpellcastingSummary()}
      </div>

      <h3>Features</h3>

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
    if (
      !getSafeSpeciesName(
        character
      )
    ) {
      return false;
    }

    const species =
      character?.species || {};

    if (
      species.id === "dragonborn" &&
      !SECTION11_DRAGONBORN_ANCESTRIES
        .some((ancestry) => {
          return (
            ancestry.id ===
            cleanString(
              species.choices
                ?.draconicAncestry
            )
          );
        })
    ) {
      return false;
    }

    if (species.id === "half-elf") {
      const choices = [
        cleanString(
          species.choices
            ?.halfElfAbilityOne
        ),
        cleanString(
          species.choices
            ?.halfElfAbilityTwo
        )
      ];

      if (
        !isSection11AbilityChoiceValid(
          choices[0],
          {
            allowCharisma: false
          }
        ) ||
        !isSection11AbilityChoiceValid(
          choices[1],
          {
            allowCharisma: false
          }
        ) ||
        choices[0] === choices[1] ||
        choices.includes("cha")
      ) {
        return false;
      }

      const skillChoices = [
        cleanString(
          species.choices
            ?.halfElfSkillOne
        ),
        cleanString(
          species.choices
            ?.halfElfSkillTwo
        )
      ];

      if (
        !isSection11SkillChoiceValid(
          skillChoices[0]
        ) ||
        !isSection11SkillChoiceValid(
          skillChoices[1]
        ) ||
        skillChoices[0] ===
          skillChoices[1]
      ) {
        return false;
      }

      if (
        !isSection11LanguageChoiceValid(
          species.choices
            ?.halfElfLanguage,
          {
            exclude: [
              "Common",
              "Elvish"
            ]
          }
        )
      ) {
        return false;
      }
    }

    if (
      species.id === "dwarf" &&
      !DWARF_TOOL_CHOICES
        .includes(
          cleanString(
            species.choices?.dwarfTool
          )
        )
    ) {
      return false;
    }

    if (
      species.id === "human" &&
      !isSection11LanguageChoiceValid(
        species.choices?.humanLanguage,
        {
          exclude: ["Common"]
        }
      )
    ) {
      return false;
    }

    const template =
      species.templateSnapshot ||
      DEFAULT_SPECIES_TEMPLATES.find(
        (item) => {
          return item.id === species.id;
        }
      );

    const subraces =
      Array.isArray(template?.subraces)
        ? template.subraces
        : [];

    if (!subraces.length) {
      return true;
    }

    const selectedSubraceId =
      cleanString(
        species.choices?.subraceId
      );

    const selectedSubrace =
      subraces.find((subrace) => {
        return subrace.id === selectedSubraceId;
      }) || null;

    if (!selectedSubrace) {
      return false;
    }

    if (
      species.id === "elf" &&
      species.choices?.subraceId ===
        "high-elf"
    ) {
      return Boolean(
        isSection11LanguageChoiceValid(
          species.choices
            ?.highElfLanguage,
          {
            exclude: [
              "Common",
              "Elvish"
            ]
          }
        ) &&
        WIZARD_CANTRIP_CHOICES_2014
          .includes(
            cleanString(
              species.choices
                ?.highElfCantrip
            )
          )
      );
    }

    return true;
  }

  function isSection17ClassComplete(
    character
  ) {
    return Boolean(
      getPrimaryClassEntry(
        character
      ) &&
      getSafeClassName(character)
    );
  }

  function isSection17SubclassComplete(
    character = creatorState.draft
  ) {
    if (!isSection17ClassComplete(character)) {
      return false;
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

    const totalLevel =
      clampLevel(
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
      totalLevel < subclassLevel
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

  function isSection17AbilitiesComplete(
    character
  ) {
    const touched =
      character
        ?.builder
        ?.validation
        ?.abilitiesTouched === true ||
      (
        Array.isArray(
          character
            ?.builder
            ?.completedSteps
        ) &&
        character.builder
          .completedSteps
          .includes("abilities")
      );

    return (
      touched &&
      ABILITY_DEFINITIONS.every(
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
      )
    );
  }

  function isSection17BackgroundComplete(
    character
  ) {
    const background =
      character?.background || {};

    if (background.source === "skipped") {
      return true;
    }

    const selectedBackground =
      getSelectedSection14Background();

    if (selectedBackground) {
      const requiredSkills =
        Math.max(
          0,
          safeNumber(
            selectedBackground
              .skillChoices
              ?.choose,
            0
          )
        );

      const requiredTools =
        Math.max(
          0,
          safeNumber(
            selectedBackground
              .toolChoices
              ?.choose,
            0
          )
        );

      const requiredLanguages =
        Math.max(
          0,
          safeNumber(
            selectedBackground
              .languageChoices
              ?.choose,
            0
          )
        );

      if (
        requiredSkills > 0 &&
        countSection14ValidSkillSource(
          "background"
        ) !== requiredSkills
      ) {
        return false;
      }

      if (
        requiredTools > 0 &&
        countSection14ValidBackgroundToolChoices(
          selectedBackground
        ) !== requiredTools
      ) {
        return false;
      }

      if (
        requiredLanguages > 0 &&
        countSection14BackgroundSourceList(
          "languages"
        ) !== requiredLanguages
      ) {
        return false;
      }
    }

    return Boolean(
      getSafeBackgroundName(character) ||
      background.templateSnapshot ||
      safeDisplayString(
        background.traits
      ) ||
      safeDisplayString(
        background.ideals
      ) ||
      safeDisplayString(
        background.bonds
      ) ||
      safeDisplayString(
        background.flaws
      ) ||
      safeDisplayString(
        background.backstory
      ) ||
      (
        Array.isArray(
          character
            ?.features
            ?.backgroundFeatures
        ) &&
        character.features
          .backgroundFeatures
          .length > 0
      )
    );
  }

  function isSection17SkillsComplete(
    character = creatorState.draft
  ) {
    if (!isSection17ClassComplete(character)) {
      return false;
    }

    const selectedClass =
      getSelectedClassTemplate();

    const selectedBackground =
      getSelectedSection14Background();

    const classRequired =
      Math.max(
        0,
        safeNumber(
          selectedClass
            ?.skillChoices
            ?.choose,
          0
        )
      );

    const backgroundRequired =
      Math.max(
        0,
        safeNumber(
          selectedBackground
            ?.skillChoices
            ?.choose,
          0
        )
      );

    const classComplete =
      classRequired === 0 ||
      countSection14ValidSkillSource(
        "class"
      ) === classRequired;

    const backgroundComplete =
      backgroundRequired === 0 ||
      countSection14ValidSkillSource(
        "background"
      ) === backgroundRequired;

    const expertiseValid =
      Object.values(
        character
          ?.proficiencies
          ?.skills || {}
      ).every((entry) => {
        return (
          entry?.expertise !== true ||
          entry?.proficient === true
        );
      });

    return (
      classComplete &&
      backgroundComplete &&
      expertiseValid
    );
  }

  function isSection17EquipmentComplete(
    character
  ) {
    const equipment =
      character?.equipment || {};

    if (
      equipment.startingPackageId ===
      "none"
    ) {
      return true;
    }

    const currency =
      equipment.currency || {};

    const hasCurrency =
      Object.values(currency).some((value) => {
        return safeNumber(value, 0) > 0;
      });

    return Boolean(
      safeDisplayString(
        equipment.startingPackageId
      ) ||
      safeDisplayString(
        equipment.notes
      ) ||
      hasCurrency ||
      (
        Array.isArray(equipment.items) &&
        equipment.items.length > 0
      )
    );
  }

  function isSection17SpellsComplete(
    character
  ) {
    if (
      isCharacterNonSpellcaster(
        character
      )
    ) {
      return true;
    }

    const magic =
      character?.magic || {};

    const spellLimits =
      getSpellSelectionLimits(
        character
      );

    if (
      spellLimits.cantripsKnownLimit !== null &&
      spellLimits.knownCantripCount <
        spellLimits.cantripsKnownLimit
    ) {
      return false;
    }

    if (
      spellLimits.spellsKnownLimit !== null &&
      spellLimits.knownLeveledCount <
        spellLimits.spellsKnownLimit
    ) {
      return false;
    }

    if (
      spellLimits.preparedLimit !== null &&
      spellLimits.preparedCount <
        spellLimits.preparedLimit
    ) {
      return false;
    }

    const spellById =
      new Map(
        (
          Array.isArray(
            magic.customSpells
          )
            ? magic.customSpells
            : []
        ).map((spell) => {
          return [spell.id, spell];
        })
      );

    const selectedSpellIds = [
      ...new Set([
        ...cleanArray(
          magic.knownSpellIds
        ),
        ...cleanArray(
          magic.preparedSpellIds
        )
      ])
    ];

    if (
      selectedSpellIds.some((spellId) => {
        const spell =
          spellById.get(spellId);

        return (
          spell &&
          Boolean(
            getSpellSourceWarning(
              character,
              spell
            )
          )
        );
      })
    ) {
      return false;
    }

    return Boolean(
      safeDisplayString(
        magic.spellcastingAbility
      ) ||
      safeDisplayString(
        magic.notes
      ) ||
      Object.keys(
        magic.slots || {}
      ).length > 0 ||
      (
        Array.isArray(
          magic.knownSpellIds
        ) &&
        magic.knownSpellIds.length > 0
      ) ||
      (
        Array.isArray(
          magic.preparedSpellIds
        ) &&
        magic.preparedSpellIds.length > 0
      ) ||
      (
        Array.isArray(
          magic.customSpells
        ) &&
        magic.customSpells.length > 0
      ) ||
      safeDisplayString(
        character
          ?.features
          ?.notes
      ) ||
      (
        Array.isArray(
          character
            ?.features
            ?.customFeatures
        ) &&
        character.features
          .customFeatures
          .length > 0
      )
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
    isSection17BackgroundComplete
  );

  registerCharacterStepCompletion(
    "skills",
    isSection17SkillsComplete
  );

  registerCharacterStepCompletion(
    "equipment",
    isSection17EquipmentComplete
  );

  registerCharacterStepCompletion(
    "spells",
    isSection17SpellsComplete
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

  function getSection18CharacterCollectionName() {
    return getSection19CollectionName(
      "characterCollectionName",
      "charactersCollectionName",
      "characters"
    );
  }

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
      getSection18CharacterCollectionName()
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
      getSection18CharacterCollectionName(),
      cleanId
    );
  }

  function syncSection18DerivedValues(
    character
  ) {
    recalculateAbilityTotals(
      character
    );

    character.equipment.items =
      repairContainerState(
        character.equipment.items,
        character
      );

    character.equipment.currency =
      normalizeCurrencyMap(
        character.equipment.currency
      );

    character.equipment.currencySources =
      normalizeCurrencySourceMap(
        character.equipment.currencySources
      );

    backfillBackgroundCurrencySources(
      character
    );

    character.combat.proficiencyBonus =
      getGenericProficiencyBonus(
        character.classProgression
          .totalLevel
      );

    const armorClass =
      calculateArmorClassOptions(
        character
      ).selected;

    character.combat.armorClass =
      armorClass.total;

    const hpSummary =
      calculateCharacterHp(
        character
      );

    character.combat.hpCalculation =
      normalizeHpCalculation(
        {
          ...(character.combat
            .hpCalculation || {}),

          laterLevelValues:
            character.combat
              .hpCalculation
              ?.mode === "rolled"
              ? hpSummary.rolls
              : character.combat
                  .hpCalculation
                  ?.laterLevelValues
        },
        character.combat.maxHp
      );

    character.combat.maxHp =
      hpSummary.maximumHp;

    character.combat.currentHp =
      Math.min(
        Math.max(
          0,
          safeNumber(
            character.combat.currentHp,
            hpSummary.maximumHp
          )
        ),
        hpSummary.maximumHp
      );

    character.combat.hitDice =
      calculateCharacterHitDice(
        character
      );

    character.combat.initiative =
      calculateCharacterInitiative(
        character
      ).total;

    const spellSummary =
      getSpellcastingSummary(
        character
      );

    character.magic.slots =
      cloneData(
        spellSummary.multiclass
          ?.spellSlots || {}
      );

    const pactMagic =
      (
        spellSummary.multiclass
          ?.pactMagic || []
      ).find((entry) => {
        return safeNumber(
          entry.slots,
          0
        ) > 0;
      });

    character.magic.pactMagic =
      pactMagic
        ? {
            slots:
              safeNumber(
                pactMagic.slots,
                0
              ),
            slotLevel:
              safeNumber(
                pactMagic.slotLevel,
                0
              )
          }
        : {
            slots: 0,
            slotLevel: 0
          };

    const primarySpellcaster =
      spellSummary.classes.find((entry) => {
        return (
          cleanString(
            entry.progressionType,
            "none"
          ) !== "none" ||
          safeNumber(
            entry.pactMagic?.slots,
            0
          ) > 0
        );
      });

    if (primarySpellcaster) {
      character.magic.spellcastingProgression =
        primarySpellcaster
          .progressionType;

      character.magic.spellcastingAbility =
        primarySpellcaster
          .spellcastingAbility ||
        character.magic
          .spellcastingAbility ||
        "";

      character.magic.spellSaveDc =
        primarySpellcaster
          .spellSaveDc;

      character.magic.spellAttackBonus =
        primarySpellcaster
          .spellAttackBonus;
    } else if (
      isCharacterNonSpellcaster(
        character
      )
    ) {
      character.magic.spellcastingProgression =
        "none";
      character.magic.spellcastingAbility = "";
      character.magic.spellSaveDc = null;
      character.magic.spellAttackBonus = null;
    }

    applyCompatibilityAliases(
      character
    );

    return character;
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
        "save"
    };

    syncSection18DerivedValues(
      character
    );

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

    const savedAtMillis =
      Date.now();

    character.builder = {
      ...(character.builder || {}),
      lastSavedAtMillis:
        savedAtMillis
    };

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

    if (
      creatorState.currentCharacterId ===
        cleanId &&
      !confirmDiscardUnsavedDraft(
        "deleting this saved character"
      )
    ) {
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
    if (
      !confirmDiscardUnsavedDraft(
        "importing a character"
      )
    ) {
      return false;
    }

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
    return normalizeCharacter({
      ...record,
      id: record.id || record.docId
    });
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

  function connectSection19Listener({
    label,
    collectionName,
    roomKey,
    unsubscribeKey,
    cacheKey,
    normalizeRecord
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

            if (wizardRuntime.shellBuilt) {
              renderCreatorView();
            }
          },

          (error) => {
            console.error(
              `Could not load character creator ${label}:`,
              error
            );

            setStatus(
              `Could not load ${label}.`
            );
          }
        );

      return true;
    } catch (error) {
      console.error(
        `Could not start character creator ${label} listener:`,
        error
      );

      setStatus(
        `Could not connect ${label}.`
      );

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
        normalizeSection19ClassRecord
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
        normalizeSection19SpeciesRecord
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
        normalizeSection19BackgroundRecord
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

    save: handleSection18Save,
    saveCopy: handleSection18SaveCopy,
    copyJson: copySection18Json,
    exportJson: exportSection18Json,
    importJson: importSection18JsonText,

    connectListeners:
      connectSection19PermanentListeners,
    cleanupListeners:
      cleanupSection19PermanentListeners,

    runRulesSelfTests:
      runSrd2014RulesSelfTests
  };
}
