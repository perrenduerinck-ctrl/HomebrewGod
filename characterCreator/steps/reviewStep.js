import {
  createDerivedSignature,
  createScopedDerivedCache
} from "../derivedCache.js";

const REVIEW_STEP_ACTIONS = Object.freeze([
  "refresh-review",
  "open-character-sheet"
]);

export function createReviewStep(dependencies = {}) {
  const {
    ABILITY_DEFINITIONS,
    BUILDER_STEPS,
    DEFAULT_FEATS,
    DEFAULT_SPELLS,
    SKILL_DEFINITIONS,
    abilitiesStep,
    applyCompatibilityAliases,
    backgroundStep,
    beginnerNote,
    calculateAbilityModifier,
    calculateArmorClassOptions,
    calculateCharacterCarryingCapacity,
    calculateCharacterHitDice,
    calculateCharacterHp,
    calculateCharacterInitiative,
    calculateCharacterPassiveScores,
    calculateCharacterSavingThrows,
    calculateCharacterSkillModifier,
    calculateEquippedWeaponAttacks,
    calculateInventoryWeightSummary,
    clampLevel,
    cleanArray,
    cleanString,
    countValidClassEntrySkillChoices,
    ensureEquipmentCurrencySources,
    escapeHtml,
    formatMulticlassPrerequisiteFailure,
    formatSection12ClassChoiceValues,
    formatSection12List,
    formatSection14CurrencySummary,
    formatSection17ClassEntryLabel,
    formatSection17ClassLevelSummary,
    formatSection17Modifier,
    getCharacterAttunementLimit,
    getCharacterBusyLabel,
    getCharacterProficiencyBonus,
    getClassEntryLevel,
    getClassEntrySkillChoiceConfig,
    getClassProgressionEntries,
    getContainerSummaries,
    getCreatorState,
    getReviewRevision,
    getFeatPrerequisiteResult,
    getFeatSpellcastingValidationWarnings,
    getMulticlassPendingSkillChoiceWarnings,
    getMulticlassPendingToolChoiceWarnings,
    getMulticlassPrerequisiteResults,
    getMulticlassSummaryEntries,
    getPendingClassFeatureChoiceWarnings,
    getPrimaryClassEntry,
    getSafeBackgroundName,
    getSafeCharacterName,
    getSafeClassName,
    getSafeSpeciesName,
    getSafeSubclassName,
    getSection12ClassFeaturesThroughLevel,
    getSection12FeatureChoiceKey,
    getSection12FeatureStoredChoices,
    getSection13AbilityName,
    getSection14BackgroundSourceValues,
    getSection15AttunedItemCount,
    getSection15Inventory,
    getSection16ClassSourceStore,
    getSection16InnateSpells,
    getSection16SelectedFeats,
    getSection16SourceKey,
    getSection17ClassProgressionEntries,
    getSection17SpellChoiceValidation,
    getSelectedClassTemplate,
    getSelectedDefaultFeatInstances,
    getSpellcastingClassOptions,
    getSpellcastingEntryForSpell,
    getSpellSlotCastingOptions,
    getSpellSourceId,
    getSpellSourceWarning,
    getUnlockedFeatChoiceSlots,
    getValidationWarnings,
    hasCurrencyValue,
    isCharacterCreatorBusy,
    isMulticlassDraft,
    isPlainObject,
    isSection17ClassComplete,
    isStepComplete: isBuilderStepComplete,
    migrateSection16LegacySpellSelections,
    openCharacterSheet,
    persistDraftToSession,
    renderClassFeatureMetadata,
    renderCreatorView,
    renderInnateSpellCards,
    renderMulticlassAdvancementChoiceSummary,
    renderMulticlassClassSummary,
    renderMulticlassLevelBreakdown,
    renderSection17SpellcastingSummary,
    renderSelectedClassMechanicsSummary,
    renderSelectedFeatSummary,
    safeDisplayString,
    safeNumber,
    setStatus,
    skillsStep,
    speciesStep,
    syncSection16ClassSourceMetadata,
    uniqueCleanArray,
    validateContainerState
  } = dependencies;

  const creatorState = getCreatorState();

  const reviewCache = createScopedDerivedCache({
    maximumEntriesPerScope: 12
  });

  const reviewMetrics = {
    cheapCompletionChecks: 0,
    fullValidationRuns: 0,
    reviewHtmlBuilds: 0
  };

  let lastFullValidation = null;

  function getReviewDependencyKey() {
    if (typeof getReviewRevision === "function") {
      return String(getReviewRevision());
    }

    return createDerivedSignature(
      creatorState.draft
    );
  }

  function invalidateReviewCache() {
    reviewCache.clear();
    lastFullValidation = null;
  }

  function getReviewCacheMetrics() {
    return {
      ...reviewMetrics,
      cache: reviewCache.getMetrics()
    };
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
      getCharacterProficiencyBonus(
        creatorState.draft
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
    return calculateCharacterCarryingCapacity(
      creatorState.draft
    ).carryingCapacity;
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


  function getSection17Warnings(
    spellChoiceValidation =
      getSection17SpellChoiceValidation()
  ) {
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

    warnings.push(...abilitiesStep.getStepWarnings(draft));

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

    if (isMulticlassDraft(draft)) {
      getMulticlassPrerequisiteResults(
        draft
      )
        .filter((result) => {
          return !result.met;
        })
        .forEach((result) => {
          warnings.push(
            `Multiclass prerequisite not met: ${formatMulticlassPrerequisiteFailure(result)}.`
          );
        });

      getMulticlassPendingToolChoiceWarnings(
        draft
      ).forEach((warning) => {
        warnings.push(warning);
      });

      getMulticlassPendingSkillChoiceWarnings(
        draft
      ).forEach((warning) => {
        warnings.push(warning);
      });

      getPendingClassFeatureChoiceWarnings(
        draft
      ).forEach((warning) => {
        warnings.push(warning);
      });

      getMulticlassSummaryEntries(draft)
        .forEach((entry, index) => {
          const subclassOptions =
            Array.isArray(
              entry.template?.subclasses
            )
              ? entry.template.subclasses
              : [];

          if (
            entry.classLevel >=
              entry.subclassLevel &&
            subclassOptions.length > 0 &&
            !entry.subclassName
          ) {
            warnings.push(
              `${entry.className} normally chooses a subclass at class level ${entry.subclassLevel}.`
            );
          }
        });

    } else {
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

      const primaryClassLevel =
        getClassEntryLevel(
          getPrimaryClassEntry(draft),
          level
        );

      if (
        primaryClassLevel >= subclassLevel &&
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
    }

    getUnlockedFeatChoiceSlots(draft)
      .filter((slot) => {
        return (
          !slot.selectedMode ||
          (
            slot.selectedMode === "feat" &&
            !slot.selectedFeatId
          )
        );
      })
      .forEach((slot) => {
        warnings.push(
          `${slot.className} class level ${slot.classLevel} has a pending ASI or feat choice.`
        );
      });

    getUnlockedFeatChoiceSlots(draft)
      .filter((slot) => {
        return slot.selectedMode === "feat" && slot.selectedFeatId;
      })
      .forEach((slot) => {
        const feat = DEFAULT_FEATS.find((entry) => {
          return entry.id === slot.selectedFeatId;
        });

        (Array.isArray(feat?.choices) ? feat.choices : [])
          .forEach((featChoice) => {
            const required = featChoice.chooseFormula === "proficiencyBonus"
              ? getCharacterProficiencyBonus(draft)
              : Math.max(1, safeNumber(featChoice.choose, 1));
            const selected = uniqueCleanArray(
              slot.featChoices?.[featChoice.id]
            ).length;

            if (selected < required) {

              warnings.push(
                `${feat.name} at ${slot.className} level ${slot.classLevel} still needs ${featChoice.label || featChoice.id} (${selected}/${required}).`
              );
            }
          });
      });

    warnings.push(
      ...getFeatSpellcastingValidationWarnings(
        draft
      )
    );

    warnings.push(...speciesStep.getStepWarnings(draft));

    if (isMulticlassDraft(draft)) {
      getClassProgressionEntries(draft)
        .forEach((classEntry, index) => {
          const config =
            getClassEntrySkillChoiceConfig(
              classEntry,
              index,
              draft
            );

          if (config.choose <= 0) {
            return;
          }

          const selectedCount =
            countValidClassEntrySkillChoices(
              classEntry,
              index,
              draft
            );

          if (
            selectedCount !==
            config.choose
          ) {
            warnings.push(
              `Choose exactly ${config.choose} valid ${classEntry.className || "class"} skill proficienc${config.choose === 1 ? "y" : "ies"}.`
            );
          }
        });
    }

    warnings.push(
      ...skillsStep.getStepWarnings(draft)
    );

    warnings.push(...backgroundStep.getStepWarnings(draft));

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
      calculateCharacterCarryingCapacity(
        draft
      );

    if (
      inventoryWeight.unknownCount === 0 &&
      inventoryWeight.knownWeight >
        carrying.carryingCapacity
    ) {
      warnings.push(
        "Inventory weight exceeds carrying capacity."
      );
    }

    const attunementLimit =
      getCharacterAttunementLimit(
        draft
      );

    if (
      getSection15AttunedItemCount() >
        attunementLimit
    ) {
      warnings.push(
        `More than ${attunementLimit} ` +
        `${attunementLimit === 1 ? "item is" : "items are"} attuned.`
      );
    }

    validateContainerState(
      draft.equipment.items
    ).forEach((warning) => {
      warnings.push(warning);
    });

    warnings.push(
      ...spellChoiceValidation.blockingErrors
    );

    const customSpellById = new Map(
      (Array.isArray(draft.magic.customSpells)
        ? draft.magic.customSpells
        : []).map((spell) => [spell.id, spell])
    );
    [...knownIds, ...preparedIds].forEach((spellId) => {
      const spell = customSpellById.get(spellId);
      const warning = spell
        ? getSpellSourceWarning(draft, spell)
        : "";
      if (warning) {
        warnings.push(warning);
      }
    });

    getSelectedDefaultFeatInstances(
      draft
    ).forEach((instance) => {
      const prerequisite =
        getFeatPrerequisiteResult(
          instance.feat,
          draft,
          {
            featureId:
              instance.slotId
          }
        );

      if (!prerequisite.met) {
        warnings.push(
          `${instance.featName || instance.feat?.name || "A selected feat"} no longer meets its prerequisites: ${prerequisite.reasons.join("; ")}.`
        );
      }
    });

    return [
      ...new Set(
        warnings.filter(Boolean)
      )
    ];
  }

  function isSection17OptionalFinalizationWarning(
    warning
  ) {
    return [
      "Inventory weight exceeds carrying capacity."
    ].includes(cleanString(warning));
  }

  function calculateSection17FinalizationValidation() {
    reviewMetrics.fullValidationRuns += 1;

    const spellChoiceValidation =
      getSection17SpellChoiceValidation();
    const ruleIssues = getSection17Warnings(
      spellChoiceValidation
    );

    const optionalRuleWarnings =
      ruleIssues.filter((warning) => {
        return isSection17OptionalFinalizationWarning(
          warning
        );
      });

    const blockingErrors =
      ruleIssues.filter((warning) => {
        return !isSection17OptionalFinalizationWarning(
          warning
        );
      });

    const optionalWarnings = [
      ...new Set([
        ...optionalRuleWarnings,
        ...spellChoiceValidation.reminders,
        ...getSection17MigrationWarnings()
      ].filter(Boolean))
    ];

    return {
      blockingErrors,
      optionalWarnings,
      allIssues: [
        ...blockingErrors,
        ...optionalWarnings
      ],
      canFinalize:
        blockingErrors.length === 0,
      checkedAtMillis: Date.now()
    };
  }

  function getSection17FinalizationValidation() {
    const dependencyKey =
      getReviewDependencyKey();

    const validation = reviewCache.get(
      "full-validation",
      dependencyKey,
      calculateSection17FinalizationValidation
    );

    lastFullValidation = {
      dependencyKey,
      validation
    };

    return validation;
  }

  function getSection17CompletedStepIds() {
    return BUILDER_STEPS
      .filter((step) => {
        return isBuilderStepComplete(
          step.id
        );
      })
      .map((step) => {
        return step.id;
      });
  }

  function syncSection17CompletedSteps() {
    const finalizationValidation =
      getSection17FinalizationValidation();

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
          finalizationValidation.allIssues,

        blockingErrors:
          finalizationValidation.blockingErrors,

        optionalWarnings:
          finalizationValidation.optionalWarnings,

        canFinalize:
          finalizationValidation.canFinalize,

        checkedAtMillis:
          finalizationValidation.checkedAtMillis
      };

    applyCompatibilityAliases(
      creatorState.draft
    );

    persistDraftToSession();
  }


  function renderSection17Abilities() {
    const bonusSources =
      isPlainObject(
        creatorState.draft
          ?.abilities
          ?.bonusSources
      )
        ? creatorState.draft
            .abilities
            .bonusSources
        : {};

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
    return SKILL_DEFINITIONS
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
                entry?.expertise === true
                  ? "Expertise"
                  : entry?.proficient === true
                    ? "Proficient"
                    : "Not proficient"
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


  function renderSection17ClassSpells() {
    migrateSection16LegacySpellSelections();
    syncSection16ClassSourceMetadata();

    const customSpells = Array.isArray(
      creatorState.draft
        .magic
        .customSpells
    )
      ? creatorState.draft.magic.customSpells
      : [];

    const knownIds = cleanArray(
      creatorState.draft.magic.knownSpellIds
    );

    const preparedIds = cleanArray(
      creatorState.draft.magic.preparedSpellIds
    );

    const selectedIds = new Set([
      ...knownIds,
      ...preparedIds
    ]);

    const activeSourceKeys = new Set(
      getSpellcastingClassOptions(
        creatorState.draft
      )
        .map((entry) => {
          return getSection16SourceKey(entry);
        })
        .filter(Boolean)
    );

    const spells = [
      ...DEFAULT_SPELLS.filter((spell) => {
        return selectedIds.has(spell.id);
      }),
      ...customSpells
    ].sort((a, b) => {
      return (
        safeNumber(a.level, 0) -
          safeNumber(b.level, 0) ||
        String(a.name || "").localeCompare(
          String(b.name || "")
        )
      );
    });

    if (!spells.length) {
      return `
        <div class="hg-character-placeholder">
          No class spell records are currently listed.
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

        const known =
          knownIds.includes(spell.id);

        const prepared =
          preparedIds.includes(spell.id);

        const sourceRecord = Object.values(
          getSection16ClassSourceStore()
        )
        .filter((source) => {
          return activeSourceKeys.has(
            cleanString(
              source?.classEntryId
            )
          );
        })
        .find((source) => {
          return [
            ...cleanArray(source.cantripIds),
            ...cleanArray(source.knownSpellIds),
            ...cleanArray(source.preparedSpellIds),
            ...cleanArray(source.spellbookSpellIds),
            ...cleanArray(
              source.alwaysPreparedSpellIds
            ),
            ...Object.values(
              source.mysticArcanumSpellIds ||
              {}
            )
          ].includes(spell.id);
        });

        const sourceEntry = sourceRecord
          ? getSpellcastingClassOptions(
              creatorState.draft
            ).find((entry) => {
              return (
                getSection16SourceKey(entry) ===
                sourceRecord.classEntryId
              );
            })
          : getSpellcastingEntryForSpell(
              creatorState.draft,
              spell
            );
        const castingOptions =
          sourceEntry && spellLevel > 0
            ? getSpellSlotCastingOptions(
                creatorState.draft,
                spell,
                getSection16SourceKey(
                  sourceEntry
                )
              )
            : null;
        const castingSlotLabels = [
          ...(
            castingOptions?.normalSlotLevels ||
            []
          ).map((level) => {
            return `level ${level}`;
          }),
          ...(
            castingOptions?.pactMagic || []
          ).map((source) => {
            return `Pact level ${safeNumber(
              source.slotLevel,
              0
            )}`;
          })
        ];

        const inSpellbook = Boolean(
          sourceRecord?.spellbookSpellIds
            ?.includes(spell.id)
        );

        const alwaysPrepared = Boolean(
          sourceRecord
            ?.alwaysPreparedSpellIds
            ?.includes(spell.id)
        );

        const mysticArcanum = Boolean(
          Object.values(
            sourceRecord
              ?.mysticArcanumSpellIds ||
              {}
          ).includes(spell.id)
        );

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
                 alwaysPrepared
                   ? "Always prepared"
                   : mysticArcanum
                     ? "Mystic Arcanum"
                     : prepared
                       ? "Prepared"
                       : inSpellbook
                         ? "In spellbook"
                         : known
                           ? "Known"
                           : "Not selected"
              }

              ${
                sourceEntry ||
                getSpellSourceId(spell)
                  ? `
                    <br>
                    <b>Source:</b>
                    ${escapeHtml(
                       sourceEntry
                         ? `${
                             sourceEntry.className ||
                             sourceEntry.classId
                           }${
                             sourceEntry.subclassName
                               ? ` — ${sourceEntry.subclassName}`
                               : ""
                           }`
                         :
                       getSpellSourceId(spell)
                     )}
                   `
                   : ""
               }

              ${
                sourceEntry
                  ? `
                    <br>
                    <b>Spellcasting Ability:</b>
                    ${escapeHtml(
                      getSection13AbilityName(
                        sourceEntry.spellcastingAbility
                      ) ||
                      sourceEntry.spellcastingAbility ||
                      "None"
                    )}

                    <br>
                    <b>Save DC:</b>
                    ${
                      sourceEntry.spellSaveDc ??
                      "Not calculated"
                    }

                    <br>
                    <b>Attack Bonus:</b>
                    ${
                      sourceEntry.spellAttackBonus === null ||
                      sourceEntry.spellAttackBonus === undefined
                        ? "Not calculated"
                        : formatSection17Modifier(
                            sourceEntry.spellAttackBonus
                          )
                    }

                    ${
                      castingSlotLabels.length
                        ? `
                          <br>
                          <b>Cast With:</b>
                          ${escapeHtml(
                            castingSlotLabels.join(", ")
                          )}${
                            castingOptions.canUpcast
                              ? " (higher slots upcast this spell)"
                              : ""
                          }
                        `
                        : ""
                    }
                  `
                  : ""
              }
            </p>

            ${
              spell.summary || spell.description
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

  function renderSection17InnateSpells() {
    return renderInnateSpellCards(
      getSection16InnateSpells(
        creatorState.draft
      ),
      {
        emptyMessage:
          "No innate species or background spells are currently listed."
      }
    );
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

  function renderSection17FeatureReviewItem(
    feature,
    levelLabel = ""
  ) {
    const description = safeDisplayString(
      feature?.description
    );

    return `
      <div class="hg-character-review-feature">
        <b>
          ${escapeHtml(
            levelLabel
              ? `${levelLabel}: ${feature?.name || "Unnamed Feature"}`
              : feature?.name || "Unnamed Feature"
          )}
        </b>

        ${
          feature?.summary
            ? `
              <br>
              <span class="small">
                ${escapeHtml(
                  feature.summary
                )}
              </span>
            `
            : ""
        }

        ${
          description
            ? `
              <br>
              <span
                class="small"
                data-feature-full-description="true"
              >
                ${escapeHtml(
                  description
                )}
              </span>
            `
            : ""
        }

        ${
          feature?.sourceLabel ||
          feature?.rulesEdition
            ? `
              <br>
              ${renderClassFeatureMetadata(
                feature
              )}
            `
            : ""
        }
      </div>
    `;
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
                  <div>
                    ${values
                      .map((feature) => {
                        return renderSection17FeatureReviewItem(
                          feature
                        );
                      })
                      .join("<hr>")}
                  </div>
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
    validation
  ) {
    const blockingErrors = Array.isArray(
      validation?.blockingErrors
    )
      ? validation.blockingErrors
      : Array.isArray(validation)
        ? validation
        : [];

    const optionalWarnings = Array.isArray(
      validation?.optionalWarnings
    )
      ? validation.optionalWarnings
      : [];

    const migrationWarnings = new Set(
      getSection17MigrationWarnings()
    );

    const migrationWarningCount =
      optionalWarnings.filter((warning) => {
        return migrationWarnings.has(warning);
      }).length;

    const hasMigrationWarnings =
      migrationWarningCount > 0;

    const readyHtml =
      !blockingErrors.length
        ? `
        <div class="hg-character-current-choice">
          <b>Ready to finalize:</b>

          No blocking rule errors were found.
        </div>
      `
        : "";

    const blockingHtml =
      blockingErrors.length
        ? `
      <div class="hg-character-warning" role="alert">
        <b>
          Cannot finalize: ${blockingErrors.length}
          ${
            blockingErrors.length === 1
              ? "rule error"
              : "rule errors"
          }
          must be fixed. Saving a draft is still allowed.
        </b>

        <ul>
          ${blockingErrors
            .map((error) => {
              return `
                <li>
                  ${escapeHtml(
                    error
                  )}
                </li>
              `;
            })
            .join("")}
        </ul>
      </div>
    `
        : "";

    const optionalHtml =
      optionalWarnings.length
        ? `
      <div class="hg-character-warning">
        <b>
          ${
            hasMigrationWarnings
              ? `Migration Warnings Requiring Review${optionalWarnings.length > migrationWarningCount ? " and other optional warnings" : ""}`
              : `${optionalWarnings.length} optional ${optionalWarnings.length === 1 ? "warning" : "warnings"}`
          }
          do not block finalization:
        </b>

        <ul>
          ${optionalWarnings
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
    `
        : "";

    return `
      ${readyHtml}
      ${blockingHtml}
      ${optionalHtml}
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


  function renderSection17ClassAndFeatSummary() {
    const draft = creatorState.draft;
    const selectedClass = getSelectedClassTemplate();
    const level = clampLevel(
      draft.classProgression.totalLevel
    );
    const classEntries =
      getSection17ClassProgressionEntries(
        draft
      );
    const classSummaryLabel =
      formatSection17ClassLevelSummary(
        draft
      );
    const features =
      getSection12ClassFeaturesThroughLevel();
    const featureById = new Map(
      features.flatMap((feature) => {
        return [
          [feature.id, feature],
          [getSection12FeatureChoiceKey(feature), feature]
        ];
      })
    );
    const choiceEntries = features
      .map((feature) => {
        return [
          getSection12FeatureChoiceKey(feature),
          getSection12FeatureStoredChoices(feature)
        ];
      })
      .filter(([, values]) => values.length > 0)
      .filter(([featureId], index, values) => {
        return values.findIndex(([candidateId]) => {
          return candidateId === featureId;
        }) === index;
      });
    const feats = getSection16SelectedFeats();
    const savingThrowSummary =
      formatSection12List(
        draft.proficiencies
          ?.savingThrows
      ) || "None";

    return `
      <h3>Class, Level, and Feats</h3>

      <div class="hg-character-choice-grid">
        <article class="hg-character-choice-card">
          <h3>
            ${escapeHtml(
              classSummaryLabel
            )}
          </h3>

          <p>
            <b>Total Level:</b> ${level}
            <br><b>Class Breakdown:</b>
            <br>
            ${classEntries.length
              ? classEntries
                  .map((entry) => {
                    return escapeHtml(
                      formatSection17ClassEntryLabel(entry)
                    );
                  })
                  .join("<br>")
              : "No class"}
            <br><b>Hit Die:</b> ${escapeHtml(selectedClass?.hitDie || draft.classData?.hitDie || "Not set")}
            <br><b>Saving Throws:</b> ${escapeHtml(savingThrowSummary)}
          </p>
        </article>

        <article class="hg-character-choice-card">
          <h3>Class Features</h3>

          <div>
            ${features.length
              ? features.map((feature) => {
                  const levelLabel =
                    feature.className
                      ? `${feature.className} ${safeNumber(feature.level, 1)}`
                      : `Level ${safeNumber(feature.level, 1)}`;

                  return renderSection17FeatureReviewItem(
                    feature,
                    levelLabel
                  );
                }).join("<hr>")
              : "None recorded."}
          </div>
        </article>

        <article class="hg-character-choice-card">
          <h3>Class Choices</h3>

          <p>
            ${choiceEntries.length
              ? choiceEntries.map(([featureId, values]) => {
                  const feature = featureById.get(featureId);
                  const featureName = feature?.name || featureId;
                  const classLabel = feature?.className
                    ? `${feature.className}: `
                    : "";
                  return `<b>${escapeHtml(`${classLabel}${featureName}`)}:</b> ${escapeHtml(formatSection12ClassChoiceValues(values))}`;
                }).join("<br>")
              : "None selected."}
          </p>
        </article>

        <article class="hg-character-choice-card">
          <h3>Feats</h3>

          ${feats.length
            ? feats.map((feat) => {
                return `
                  <p>
                    <b>${escapeHtml(feat.name)}</b>
                    <br><span class="small">${escapeHtml(feat.summary || "")}</span>
                    ${feat.description
                      ? `<br><span class="small">${escapeHtml(feat.description)}</span>`
                      : ""}
                  </p>
                `;
              }).join("")
            : "<p>None selected.</p>"}
        </article>
      </div>

      <hr>
    `;
  }

  function buildReviewStepHtml() {
    reviewMetrics.reviewHtmlBuilds += 1;

    const draft =
      creatorState.draft;

    const finalizationValidation =
      getSection17FinalizationValidation();

    const isBusy =
      isCharacterCreatorBusy();

    const busyLabel =
      getCharacterBusyLabel();

    const level =
      clampLevel(
        draft.classProgression
          .totalLevel
      );

    const inventoryWeight =
      getSection17InventoryWeight();
    const attunementLimit =
      getCharacterAttunementLimit(
        draft
      );

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
      ${beginnerNote(
        "Review Your Character",
        "Review is where you check the sheet before saving. Look for missing choices, then confirm Armor Class, hit points, proficiency bonus, initiative, skills, features, and spells."
      )}

      ${renderSection17Warnings(
        finalizationValidation
      )}

      ${
        isMulticlassDraft(draft)
          ? `
            ${renderMulticlassClassSummary(
              draft
            )}

            ${renderMulticlassLevelBreakdown(
              draft,
              { readonly: true }
            )}
          `
          : ""
      }

      ${renderMulticlassAdvancementChoiceSummary(draft)}

      ${renderSelectedFeatSummary(
        draft,
        { readonly: true }
      )}

      ${renderSelectedClassMechanicsSummary(
        draft,
        { readonly: true }
      )}

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="save-character"
          ${isBusy ? "disabled" : ""}
        >
          ${
            isBusy
              ? `${busyLabel}...`
              : creatorState.currentCharacterId
                ? "Update Draft"
                : "Save Draft"
          }
        </button>

        <button
          type="button"
          data-cc-action="finalize-character"
          ${isBusy ? "disabled" : ""}
        >
          ${
            isBusy
              ? `${busyLabel}...`
              : "Finalize Character"
          }
        </button>

        <button
          type="button"
          data-cc-action="open-character-sheet"
        >
          Open Character Sheet
        </button>

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
            <b>Name:</b>
            ${escapeHtml(
              getSafeCharacterName() ||
              "Unnamed Character"
            )}

            <br>

            <b>Class and Level:</b>
            ${escapeHtml(
              formatSection17ClassLevelSummary(
                draft
              )
            )}

            <br>

            <b>Background:</b>
            ${escapeHtml(
              getSafeBackgroundName() ||
              "No background"
            )}

            <br>

            <b>Species:</b>
            ${escapeHtml(
              getSafeSpeciesName() ||
              "No species"
            )}
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

      ${renderSection17ClassAndFeatSummary()}

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
              ${
                initiativeSummary.featBonus
                  ? `, feats ${formatSection17Modifier(
                      initiativeSummary.featBonus
                    )}`
                  : ""
              }
            </span>
          </p>
        </article>

        <article class="hg-character-choice-card">
          <h3>Proficiency Bonus</h3>

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
          <h3>Speed</h3>

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

            ${safeNumber(
              draft.combat.speed.climb,
              0
            ) > 0
              ? `<br>Climb: ${safeNumber(
                  draft.combat.speed.climb,
                  0
                )} ft.`
              : ""}

            ${safeNumber(
              draft.combat.speed.swim,
              0
            ) > 0
              ? `<br>Swim: ${safeNumber(
                  draft.combat.speed.swim,
                  0
                )} ft.`
              : ""}

            ${safeNumber(
              draft.combat.speed.fly,
              0
            ) > 0
              ? `<br>Fly: ${safeNumber(
                  draft.combat.speed.fly,
                  0
                )} ft.`
              : ""}
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

      <h3>Skills</h3>

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

      <h3>Equipment</h3>

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

        ${getSection15AttunedItemCount()} / ${attunementLimit}

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

      <h3>All Equipment</h3>

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
          new Set([
            ...cleanArray(
              draft.magic.knownSpellIds
            ),
            ...cleanArray(
              draft.magic.preparedSpellIds
            ),
            ...(
              Array.isArray(
                draft.magic.customSpells
              )
                ? draft.magic.customSpells
                    .map((spell) => spell.id)
                : []
            )
          ]).size
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

      <h3>Class Features, Species Traits, and Background Features</h3>

      <div class="hg-character-choice-grid">
        ${renderSection17FeatureSummary()}
      </div>

      <hr>

      <h3>Character Story</h3>

      <div class="hg-character-choice-grid">
        <article class="hg-character-choice-card">
          <h3>Appearance</h3>
          <p class="small">
            ${escapeHtml(
              safeDisplayString(
                draft.identity
                  .appearance
              ) ||
              "No appearance details yet."
            )}
          </p>
        </article>

        <article class="hg-character-choice-card">
          <h3>Backstory</h3>
          <p class="small">
            ${escapeHtml(
              safeDisplayString(
                draft.background
                  .backstory
              ) ||
              "No backstory yet."
            )}
          </p>
        </article>

        <article class="hg-character-choice-card">
          <h3>General Notes</h3>
          <p class="small">
            ${escapeHtml(
              safeDisplayString(
                draft.notes
              ) ||
              "No general notes yet."
            )}
          </p>
        </article>
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

  function renderReviewStep() {
    const dependencyKey =
      getReviewDependencyKey();
    const busyKey = isCharacterCreatorBusy()
      ? `busy:${getCharacterBusyLabel()}`
      : "ready";

    return reviewCache.get(
      "review-html",
      `${dependencyKey}:${busyKey}`,
      buildReviewStepHtml
    );
  }


  function isSection17ReviewComplete() {
    return getSection17FinalizationValidation()
      .canFinalize;
  }

  function isSection17ReviewCheaplyComplete() {
    reviewMetrics.cheapCompletionChecks += 1;

    const draft = creatorState.draft;
    const scores =
      draft?.abilities?.scores || {};
    const abilityScoresAreValid =
      ABILITY_DEFINITIONS.every((ability) => {
        const score = Number(scores[ability.id]);

        return (
          Number.isFinite(score) &&
          Number.isInteger(score) &&
          score >= 1 &&
          score <= 30
        );
      });
    const maximumHp = Number(
      draft?.combat?.maxHp
    );
    const currentHp = Number(
      draft?.combat?.currentHp
    );

    return Boolean(
      getSafeCharacterName(draft) &&
      getSafeClassName(draft) &&
      getSafeSpeciesName(draft) &&
      isSection17ClassComplete(draft) &&
      abilityScoresAreValid &&
      Number.isFinite(maximumHp) &&
      maximumHp >= 1 &&
      Number.isFinite(currentHp) &&
      currentHp >= 0 &&
      currentHp <= maximumHp
    );
  }

  function getCachedOrCheapReviewCompletion() {
    const dependencyKey =
      getReviewDependencyKey();

    if (
      lastFullValidation?.dependencyKey ===
      dependencyKey
    ) {
      return lastFullValidation.validation
        .canFinalize;
    }

    return isSection17ReviewCheaplyComplete();
  }

  function handleSection17RefreshReview() {
    invalidateReviewCache();

    setStatus(
      "Character review refreshed."
    );

    renderCreatorView();
  }

  function renderStep() {
    return renderReviewStep();
  }

  function handleStepClick(context) {
    switch (cleanString(context?.action)) {
      case "refresh-review":
        handleSection17RefreshReview();
        return true;
      case "open-character-sheet":
        openCharacterSheet();
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

  function validateStep() {
    const validation =
      getSection17FinalizationValidation();

    return {
      valid: validation.canFinalize,
      blockingErrors:
        validation.blockingErrors,
      reminders:
        validation.optionalWarnings
    };
  }

  function normalizeStepData(character) {
    return character;
  }

  function getStepWarnings() {
    return getSection17FinalizationValidation()
      .allIssues;
  }

  function isStepComplete() {
    return getCachedOrCheapReviewCompletion();
  }

  return Object.freeze({
    id: "review",
    actions: REVIEW_STEP_ACTIONS,
    renderStep,
    handleStepClick,
    handleStepInput,
    handleStepChange,
    validateStep,
    normalizeStepData,
    getStepWarnings,
    isStepComplete,
    compatibility: Object.freeze({
      getSection17AbilityName,
      getSection17ProficiencyBonus,
      getSection17SkillEntry,
      getSection17SkillModifier,
      getSection17PassivePerception,
      getSection17Initiative,
      getSection17CarryingCapacity,
      getSection17InventoryWeight,
      getSection17SpellCount,
      getSection17FeatureCount,
      getSection17Warnings,
      isSection17OptionalFinalizationWarning,
      getSection17FinalizationValidation,
      isSection17ReviewCheaplyComplete,
      getCachedOrCheapReviewCompletion,
      invalidateReviewCache,
      getReviewCacheMetrics,
      getSection17CompletedStepIds,
      syncSection17CompletedSteps,
      renderSection17Abilities,
      renderSection17Skills,
      renderSection17List,
      renderSection17BackgroundChoices,
      renderSection17BackgroundGrants,
      renderSection17SavingThrows,
      renderSection17PassiveScores,
      renderSection17HitDice,
      renderSection17WeaponAttacks,
      renderSection17ContainerSummary,
      renderSection17ClassSpells,
      renderSection17InnateSpells,
      renderSection17Inventory,
      renderSection17FeatureReviewItem,
      renderSection17FeatureSummary,
      renderSection17Warnings,
      getSection17MigrationWarnings,
      renderSection17MigrationWarnings,
      renderSection17ClassAndFeatSummary,
      renderReviewStep,
      isSection17ReviewComplete,
      handleSection17RefreshReview
    })
  });
}
