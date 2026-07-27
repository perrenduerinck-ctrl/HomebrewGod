export function createCharacterCatalogs(context) {
  const {
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
  } = context;

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

  const DEFAULT_CLASS_TEMPLATES = Object.freeze(
    Object.values(DEFAULT_CLASSES).map((classData) => {
      return createDefaultClassTemplate(classData);
    })
  );

  const RAW_DEFAULT_SPECIES_TEMPLATES = [
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
  ];

  const DEFAULT_SPECIES_TEMPLATES =
    Object.freeze(
      RAW_DEFAULT_SPECIES_TEMPLATES
        .map(
          enrichBuiltinSpeciesTemplate
        )
    );

  const RAW_DEFAULT_BACKGROUND_TEMPLATES = [
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
  ];

  const DEFAULT_BACKGROUND_TEMPLATES =
    Object.freeze(
      RAW_DEFAULT_BACKGROUND_TEMPLATES
        .map(
          enrichBuiltinBackgroundTemplate
        )
    );

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

  return {
    ARTISAN_TOOL_OPTIONS, DARK_ELF_INNATE_SPELLS_2014, DEFAULT_BACKGROUND_EQUIPMENT_PACKAGES, DEFAULT_BACKGROUND_TEMPLATES, DEFAULT_CLASS_TEMPLATES, DEFAULT_EQUIPMENT_CATALOG,
    DEFAULT_SPECIES_TEMPLATES, DWARF_TOOL_CHOICES, FOREST_GNOME_INNATE_SPELLS_2014, GAMING_SET_OPTIONS, GENERAL_TOOL_OPTIONS, MUSICAL_INSTRUMENT_OPTIONS,
    RAW_DEFAULT_BACKGROUND_TEMPLATES, RAW_DEFAULT_SPECIES_TEMPLATES, STANDARD_LANGUAGE_OPTIONS, TIEFLING_INNATE_SPELLS_2014, WIZARD_CANTRIP_CHOICES_2014
  };
}
