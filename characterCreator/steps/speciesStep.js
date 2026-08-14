const SPECIES_STEP_ACTIONS = Object.freeze([
  "choose-species",
  "choose-subrace",
  "apply-species-choices",
  "use-custom-species",
  "add-species-trait",
  "remove-species-trait"
]);

export function createSpeciesStep(dependencies = {}) {
  const {
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
    getCreatorState,
    getLegacy2014Metadata,
    getSafeSpeciesName,
    getSection14SkillEntry,
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
    renderCreatorView,
    renderFullCatalogDescription,
    renderRulesetMetadata,
    safeDisplayString,
    safeNumber,
    setAbilityBonusSource,
    setSection14SkillEntry,
    setSourceProficiencyList,
    setStatus,
    sourceMatches,
    synchronizeCanonicalSpellSources,
    wizardChoiceCard,
    wizardField,
    wizardSelect
  } = dependencies;

  const creatorState = getCreatorState();

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
            ...getLegacy2014Metadata(
              "species",
              speciesId,
              species
            ),
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
      if (!isActiveRulesetEntry(species)) {
        return;
      }

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
            ...getLegacy2014Metadata(
              "species",
              speciesId,
              species
            ),
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
      isActiveRulesetEntry(selectedSpecies) &&
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
          ...getLegacy2014Metadata(
            "species",
            speciesId,
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
    synchronizeCanonicalSpellSources(creatorState.draft, { fromCompatibility: true });
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
    synchronizeCanonicalSpellSources(creatorState.draft, { fromCompatibility: true });
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
              sourceType: "species",
              sourceFeatureId:
                "high-elf-cantrip",
              sourceFeatureName:
                "Wizard Cantrip",
              atWill: true,
              recharge: "none",
              canUseSpellSlots: false,
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
      .baseSpeed
      .walk =
        normalizeMovementSpeed(
          subrace?.speed ??
          species.speed,
          30
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
      .baseSpeed
      .walk =
        normalizeMovementSpeed(
          $("ccCustomSpeciesSpeed")
            ?.value,
          30
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
              ${renderRulesetMetadata(species, "species")}
            </p>

            ${renderFullCatalogDescription(
              species,
              "Full species description"
            )}

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

            <p>
              <b>Languages:</b>

              ${escapeHtml(
                formatSection12List(
                  species.languages
                ) || "None listed"
              )}

              <br>

              <b>Traits:</b>

              ${escapeHtml(
                formatSection12List(
                  (Array.isArray(species.traits)
                    ? species.traits
                    : [])
                    .map((trait) => {
                      return trait?.name || trait;
                    })
                ) || "None listed"
              )}
            </p>

            ${renderCatalogEntryDetails(
              species.traits,
              {
                label: "Species trait descriptions",
                kind: "species-trait",
                parentId: species.id
              }
            )}
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
                ${renderRulesetMetadata(
                  subrace,
                  "subrace",
                  selectedSpeciesTemplate?.id
                )}
              </p>

              ${renderFullCatalogDescription(
                subrace,
                "Full subrace description"
              )}

              <p>
                ${
                  abilityText
                    ? `<b>Ability:</b> ${escapeHtml(abilityText)}`
                    : "No ability bonus listed."
                }
              </p>

              <p>
                <b>Languages:</b>

                ${escapeHtml(
                  formatSection12List(
                    subrace.languages
                  ) || "No additional languages"
                )}

                <br>

                <b>Traits:</b>

                ${escapeHtml(
                  formatSection12List(
                    (Array.isArray(subrace.traits)
                      ? subrace.traits
                      : [])
                      .map((trait) => {
                        return trait?.name || trait;
                      })
                  ) || "No additional traits"
                )}
              </p>

              ${renderCatalogEntryDetails(
                subrace.traits,
                {
                  label: "Subrace trait descriptions",
                  kind: "subrace-trait",
                  parentId: subrace.id
                }
              )}
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

              ${
                trait.description &&
                trait.description !==
                  trait.summary
                  ? `<p>${escapeHtml(
                      trait.description
                    )}</p>`
                  : ""
              }

              <p>
                ${renderRulesetMetadata(
                  trait,
                  "species-trait",
                  selectedSpeciesTemplate?.id
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
      ${beginnerNote(
        "Species / Race",
        "Species / Race gives natural traits like size, speed, senses, special abilities, and sometimes ability score bonuses."
      )}

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
            .baseSpeed
            .walk,

          {
            type: "number",
            valueType: "number",
            extra:
              'min="0" max="100" step="1"'
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


  function getStepWarnings(character = creatorState.draft) {
    if (isSection17SpeciesComplete(character)) {
      return [];
    }

    const species = character?.species || {};
    const template = species.templateSnapshot ||
      DEFAULT_SPECIES_TEMPLATES.find((item) => item.id === species.id);

    if (Array.isArray(template?.subraces) && template.subraces.length > 0) {
      return ["Choose a subrace for the selected species."];
    }
    if (species.id === "dragonborn") {
      return ["Choose a Dragonborn ancestry."];
    }
    if (species.id === "half-elf") {
      return ["Choose Half-Elf ability, skill, and language choices."];
    }
    if (species.id === "dwarf") {
      return ["Choose a Dwarf tool proficiency."];
    }
    if (species.id === "human") {
      return ["Choose a Human additional language."];
    }
    if (species.id === "elf" && species.choices?.subraceId === "high-elf") {
      return ["Choose a High Elf language and wizard cantrip."];
    }
    return ["Choose a species before finishing."];
  }

  function renderStep() {
    return renderSpeciesStep();
  }

  function handleStepClick(context) {
    switch (cleanString(context?.action)) {
      case "choose-species":
        handleChooseSpeciesAction(context);
        return true;
      case "choose-subrace":
        handleChooseSubraceAction(context);
        return true;
      case "apply-species-choices":
        handleApplySpeciesChoicesAction();
        return true;
      case "use-custom-species":
        handleUseCustomSpeciesAction();
        return true;
      case "add-species-trait":
        handleAddSpeciesTraitAction();
        return true;
      case "remove-species-trait":
        handleRemoveSpeciesTraitAction(context);
        return true;
      default:
        return false;
    }
  }

  function handleStepInput() {
    return false;
  }

  function handleStepChange() {
    return false;
  }

  function validateStep(character = creatorState.draft) {
    const blockingErrors = getStepWarnings(character);
    return { valid: blockingErrors.length === 0, blockingErrors, reminders: [] };
  }

  function normalizeStepData(character) {
    return character;
  }

  function isStepComplete(character = creatorState.draft) {
    return isSection17SpeciesComplete(character);
  }

  return Object.freeze({
    id: "species",
    actions: SPECIES_STEP_ACTIONS,
    renderStep,
    handleStepClick,
    handleStepInput,
    handleStepChange,
    validateStep,
    normalizeStepData,
    getStepWarnings,
    isStepComplete,
    compatibility: Object.freeze({
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
    })
  });
}
