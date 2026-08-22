const BACKGROUND_STEP_ACTIONS = Object.freeze([
  "choose-background",
  "skip-background",
  "use-custom-background",
  "apply-background-choices",
  "apply-background-package",
  "add-background-feature",
  "remove-background-feature"
]);

export function createBackgroundStep(dependencies = {}) {
  const {
    $,
    applyCompatibilityAliases,
    beginnerNote,
    cleanArray,
    cleanString,
    cloneData,
    createEmptyCharacter,
    escapeHtml,
    getCreatorState,
    markDraftChanged,
    renderCreatorView,
    safeDisplayString,
    safeNumber,
    setStatus,
    uniqueCleanArray,
    wizardChoiceCard,
    wizardField,
    wizardSelect
  } = dependencies.sharedServices || dependencies;
  const {
    ARTISAN_TOOL_OPTIONS,
    CURRENCY_DENOMINATIONS,
    DEFAULT_BACKGROUND_EQUIPMENT_PACKAGES,
    DEFAULT_BACKGROUND_TEMPLATES,
    GAMING_SET_OPTIONS,
    GENERAL_TOOL_OPTIONS,
    MUSICAL_INSTRUMENT_OPTIONS,
    STANDARD_LANGUAGE_OPTIONS,
    addCurrencyMaps,
    countSection14ValidSkillSource,
    ensureEquipmentCurrencySources,
    ensureProficiencySources,
    findSection14ActionElement,
    formatSection14List,
    getBackgroundSourceLabel,
    getLegacy2014Metadata,
    getManualCurrencyBalance,
    getSafeBackgroundName,
    getSection15Catalog,
    getSection15Inventory,
    getStoredSources,
    hasCurrencyValue,
    isActiveRulesetEntry,
    makeSafeId,
    normalizeCurrencyMap,
    normalizeSection15Item,
    normalizeSpeciesBackgroundChoices,
    parseSection14List,
    removeListProficiencySource,
    removeSkillProficiencySource,
    renderCatalogEntryDetails,
    renderDescriptionStoryFields,
    renderFullCatalogDescription,
    renderRulesetMetadata,
    renderSection14ExpertiseChoices,
    renderSection14ProficiencyGuide,
    renderSection14SourceSkillChoices,
    setSourceProficiencyList,
    syncEquipmentCurrencyFromSources,
  } = dependencies;

  const creatorState = getCreatorState();

  function normalizeSection14Background(
    rawBackground,
    fallbackSource = "template"
  ) {
    const raw = rawBackground || {};
    const normalizedChoices =
      normalizeSpeciesBackgroundChoices(
        raw
      );

    const name =
      safeDisplayString(
        raw.name,
        "Custom Background"
      );
    const backgroundId = makeSafeId(
      raw.id || name,
      "custom-background"
    );

    return {
      ...cloneData(raw),
      ...getLegacy2014Metadata(
        "background",
        backgroundId,
        raw
      ),

      id: backgroundId,

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

      ...normalizedChoices,

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
      if (!isActiveRulesetEntry(background)) {
        return;
      }

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
      isActiveRulesetEntry(selectedSnapshot) &&
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

              ${renderFullCatalogDescription(
                background,
                "Full background description"
              )}

              ${renderCatalogEntryDetails(
                background.features,
                {
                  label: "Background feature description",
                  kind: "background-feature",
                  parentId: background.id
                }
              )}

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

              <p>
                ${renderRulesetMetadata(background, "background")}
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
                  "No description provided."
                )}
              </p>

              ${
                feature.description &&
                feature.description !==
                  feature.summary
                  ? `<p>${escapeHtml(
                      feature.description
                    )}</p>`
                  : ""
              }

              <p>
                ${renderRulesetMetadata(
                  feature,
                  "background-feature",
                  creatorState.draft
                    .background
                    .id
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
      ${beginnerNote(
        "Choosing a Background",
        "Background is what your character was before adventuring. It usually gives skill proficiencies, tools or languages, starting gear, and a story feature."
      )}

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

      ${selectedBackground &&
        creatorState.draft.background.source !== "skipped"
        ? `
          <hr>

          <h3>Background Skills and Proficiencies</h3>

          ${renderSection14ProficiencyGuide()}

          ${renderSection14SourceSkillChoices(
            "background"
          )}
        `
        : ""}

      ${renderSection14ExpertiseChoices()}

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

      ${renderDescriptionStoryFields()}
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


  function getStepWarnings(character = creatorState.draft) {
    const warnings = [];
    const selectedBackground = getSelectedSection14Background();
    const requiredBackgroundSkills = Math.max(
      0,
      safeNumber(selectedBackground?.skillChoices?.choose, 0)
    );
    const selectedBackgroundSkills = countSection14ValidSkillSource("background");

    if (
      requiredBackgroundSkills > 0 &&
      selectedBackgroundSkills !== requiredBackgroundSkills
    ) {
      warnings.push(
        `Choose exactly ${requiredBackgroundSkills} valid background skill proficiencies.`
      );
    }

    const requiredBackgroundTools = Math.max(
      0,
      safeNumber(selectedBackground?.toolChoices?.choose, 0)
    );

    if (
      requiredBackgroundTools > 0 &&
      countSection14ValidBackgroundToolChoices(selectedBackground) !==
        requiredBackgroundTools
    ) {
      warnings.push(
        `Choose exactly ${requiredBackgroundTools} exact background tool proficienc${
          requiredBackgroundTools === 1 ? "y" : "ies"
        }.`
      );
    }

    const requiredBackgroundLanguages = Math.max(
      0,
      safeNumber(selectedBackground?.languageChoices?.choose, 0)
    );

    if (
      requiredBackgroundLanguages > 0 &&
      countSection14BackgroundSourceList("languages") !==
        requiredBackgroundLanguages
    ) {
      warnings.push(
        `Choose exactly ${requiredBackgroundLanguages} background language${
          requiredBackgroundLanguages === 1 ? "" : "s"
        }.`
      );
    }

    return warnings;
  }

  function renderStep() {
    return renderBackgroundStep();
  }

  function handleStepClick(context) {
    switch (cleanString(context?.action)) {
      case "choose-background":
        handleSection14ChooseBackground(context);
        return true;
      case "skip-background":
        handleSection14SkipBackground(context);
        return true;
      case "use-custom-background":
        handleSection14CustomBackground(context);
        return true;
      case "apply-background-choices":
        handleSection14ApplyBackgroundChoices(context);
        return true;
      case "apply-background-package":
        handleSection14ApplyBackgroundPackage(context);
        return true;
      case "add-background-feature":
        handleSection14AddFeature(context);
        return true;
      case "remove-background-feature":
        handleSection14RemoveFeature(context);
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
    if (blockingErrors.length === 0 && !isSection17BackgroundComplete(character)) {
      blockingErrors.push("Choose a background before finishing.");
    }
    return { valid: blockingErrors.length === 0, blockingErrors, reminders: [] };
  }

  function normalizeStepData(character) {
    return character;
  }

  function isStepComplete(character = creatorState.draft) {
    return isSection17BackgroundComplete(character);
  }

  return Object.freeze({
    id: "background",
    actions: BACKGROUND_STEP_ACTIONS,
    renderStep,
    handleStepClick,
    handleStepInput,
    handleStepChange,
    validateStep,
    normalizeStepData,
    getStepWarnings,
    isStepComplete,
    compatibility: Object.freeze({
      normalizeSection14Background,
      getAllSection14Backgrounds,
      getSelectedSection14Background,
      getSection14BackgroundChoiceList,
      setSection14BackgroundChoiceList,
      getSection14AllExactToolOptions,
      expandSection14ToolChoice,
      getSection14BackgroundToolOptions,
      getSection14BackgroundToolOptionsForIndex,
      getSection14BackgroundLanguageOptions,
      countSection14BackgroundSourceList,
      getSection14BackgroundSourceValues,
      countSection14ValidBackgroundToolChoices,
      applySection14BackgroundChoices,
      getSection14BackgroundPackages,
      removeSection14BackgroundEquipment,
      getSection14BackgroundCurrencyGrant,
      hasSection14BackgroundCurrency,
      formatSection14CurrencySummary,
      getSection14BackgroundRemovalSummary,
      addSection14BackgroundCurrency,
      removeSection14BackgroundCurrency,
      handleSection14OldBackgroundEquipment,
      applySection14BackgroundPackage,
      chooseSection14Background,
      skipSection14Background,
      applySection14CustomBackground,
      syncSection14BackgroundFeatures,
      addSection14BackgroundFeature,
      removeSection14BackgroundFeature,
      renderBackgroundStep,
      handleSection14ChooseBackground,
      handleSection14SkipBackground,
      handleSection14CustomBackground,
      handleSection14ApplyBackgroundChoices,
      handleSection14ApplyBackgroundPackage,
      handleSection14AddFeature,
      handleSection14RemoveFeature,
      isSection17BackgroundComplete
    })
  });
}
