const MULTICLASS_STEP_ACTIONS = Object.freeze([
  "add-multiclass-class",
  "adjust-multiclass-level",
  "remove-multiclass-class",
  "move-multiclass-class",
  "move-character-level-order",
  "add-character-level",
  "remove-last-character-level",
  "toggle-multiclass-skill",
  "toggle-multiclass-tool"
]);

export function createMulticlassStep(dependencies = {}) {
  const {
    DEFAULT_FEATS,
    DEFAULT_SPELLS,
    addCharacterLevelToClass,
    adjustMulticlassClassLevel,
    calculateClassProgressionTotalLevel,
    clampLevel,
    cleanArray,
    cleanString,
    cloneData,
    escapeHtml,
    findSection12ActionElement,
    formatClassEntryProficiencySummary,
    formatMulticlassStoredChoiceValue,
    getAllClassTemplates,
    getCharacterClassEntries,
    getCharacterLevelHitDieRecords,
    getClassEntryAtIndex,
    getClassEntryLevel,
    getClassEntrySkillChoiceConfig,
    getClassEntrySubclassTemplate,
    getClassEntryToolChoiceConfig,
    getClassEntryToolChoiceOptions,
    getClassProgressionEntries,
    getClassProgressionEntryKey,
    getClassProgressionPendingChoiceWarnings,
    getCreatorState,
    getGenericProficiencyBonus,
    getMulticlassClassId,
    getMulticlassPrerequisiteResultForClass,
    getMulticlassPrerequisiteResults,
    getMulticlassSummaryEntries,
    getPrimaryClassEntry,
    getSafeClassName,
    getUnlockedFeatChoiceSlots,
    getValidClassEntrySkillIds,
    getValidClassEntryToolChoices,
    isMulticlassDraft,
    isStartingClassEntry,
    moveCharacterLevelOrder,
    moveMulticlassClass,
    normalizeClassLevelOrder,
    normalizeSection12Subclass,
    recalculateClassTotalLevel,
    removeLastCharacterLevel,
    removeMulticlassClass,
    renderCreatorView,
    renderLevelUpWorkflow,
    resolveClassTemplateForEntry,
    setMulticlassClassLevel,
    setMulticlassSubclass,
    setStatus,
    toggleMulticlassSkillChoice,
    toggleMulticlassToolChoice,
    tryAddMulticlassClass,
    uniqueCleanArray,
    wizardField,
    wizardSelect
  } = dependencies;

  const creatorState = getCreatorState();

  function renderMulticlassStoredChoices(
    classEntry
  ) {
    const groups = [
      [
        "Choices",
        classEntry?.choices
      ],
      [
        "Level Choices",
        classEntry?.levelChoices
      ],
      [
        "Selections",
        classEntry?.selections
      ],
      [
        "Class Features",
        classEntry?.features
      ]
    ].map(([label, value]) => {
      return [
        label,
        formatMulticlassStoredChoiceValue(
          value
        )
      ];
    }).filter(([, value]) => {
      return cleanString(value);
    });

    if (!groups.length) {
      return "";
    }

    return `
      <p>
        <b>Stored Class Choices:</b>
      </p>

      <ul>
        ${groups
          .map(([label, formattedValue]) => {
            return `
              <li>
                ${escapeHtml(label)}:
                ${escapeHtml(
                  formattedValue
                )}
              </li>
            `;
          })
          .join("")}
      </ul>
    `;
  }

  function renderMulticlassReadOnlyNotice(
    contextLabel = "class and level"
  ) {
    return `
      <div class="hg-character-warning">
        <b>Multiclass editing:</b>
        Use the class progression controls to update ${escapeHtml(contextLabel)}.
        Full class-feature choice automation is still limited.
      </div>
    `;
  }

  function renderMulticlassClassSummary(
    character = creatorState.draft
  ) {
    const entries =
      getMulticlassSummaryEntries(character);

    if (entries.length <= 1) {
      return "";
    }

    const totalLevel =
      entries.reduce(
        (sum, entry) => {
          return sum + entry.classLevel;
        },
        0
      );

    const classSplit = entries
      .map((entry) => {
        return `${entry.className} ${entry.classLevel}`;
      })
      .join(" / ");

    const proficiencyBonus =
      getGenericProficiencyBonus(
        totalLevel || 1
      );

    return `
      <h3>Multiclass Summary</h3>

      <div class="hg-character-current-choice">
        <b>Total Character Level:</b>
        ${clampLevel(
          character
            ?.classProgression
            ?.totalLevel ||
          totalLevel ||
          1
        )}

        <br>

        <b>Class Split:</b>
        ${escapeHtml(classSplit)}

        <br>

        <b>Proficiency Bonus:</b>
        +${proficiencyBonus}
      </div>

      <div class="hg-character-choice-grid">
        ${entries
          .map((entry, index) => {
            const prerequisiteResult =
              getMulticlassPrerequisiteResultForClass(
                entry.classEntry,
                character
              );

            const proficiencySummary =
              formatClassEntryProficiencySummary(
                entry.classEntry,
                index,
                character
              );

            const isStartingClass =
              isStartingClassEntry(
                entry.classEntry,
                character,
                index
              );

            return `
              <article class="hg-character-choice-card">
                <h3>
                  ${escapeHtml(entry.className)}
                  ${entry.classLevel}
                  ${
                    entry.subclassName
                      ? ` &mdash; ${escapeHtml(entry.subclassName)}`
                      : ""
                  }
                </h3>

                <p>
                  <b>Subclass:</b>
                  ${escapeHtml(
                    entry.subclassName ||
                    (
                      entry.classLevel >= entry.subclassLevel
                        ? "Not selected"
                        : `Unlocks at level ${entry.subclassLevel}`
                    )
                  )}

                  <br>

                  <b>Hit Die:</b>
                  ${escapeHtml(entry.hitDie)}

                  <br>

                  <b>Primary Abilities:</b>
                  ${escapeHtml(
                    entry.primaryAbilities
                  )}

                  <br>

                  <b>Proficiency Source:</b>
                  ${escapeHtml(
                    isStartingClass
                      ? "Starting class (includes saving throws)"
                      : "Multiclass grant (no saving throws)"
                  )}

                  <br>

                  <b>Granted Proficiencies:</b>
                  ${escapeHtml(proficiencySummary)}

                  <br>

                  <b>Multiclass Prerequisite:</b>
                  ${escapeHtml(prerequisiteResult.label)}
                  ${prerequisiteResult.met ? "&#10003;" : "&#9888;"}

                  <br>

                  <b>Subclass Unlock:</b>
                  Level ${entry.subclassLevel}

                  <br>

                  <b>Source:</b>
                  ${escapeHtml(entry.source)}
                </p>

                ${renderMulticlassStoredChoices(
                  entry.classEntry
                )}
              </article>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderMulticlassAdvancementChoiceSummary(
    character = creatorState.draft
  ) {
    const slots =
      getUnlockedFeatChoiceSlots(
        character
      );

    if (!slots.length) {
      return "";
    }

    return `
      <h3>ASI / Feat Choices</h3>

      <div class="hg-character-choice-grid">
        ${slots
          .map((slot) => {
            const feat =
              DEFAULT_FEATS.find((entry) => {
                return entry.id === slot.selectedFeatId;
              });

            const selection =
              slot.selectedMode === "feat"
                ? feat?.name || slot.selectedFeatId || "Pending feat selection"
                : slot.selectedMode === "asi"
                  ? "Ability Score Improvement"
                  : "Pending ASI or feat choice";
            const featChoiceSummary = feat
              ? (Array.isArray(feat.choices) ? feat.choices : [])
                  .map((featChoice) => {
                    const values = uniqueCleanArray(
                      slot.featChoices?.[featChoice.id]
                    ).map((value) => {
                      return DEFAULT_SPELLS.find((spell) => spell.id === value)?.name || value;
                    });

                    return values.length
                      ? `${featChoice.label || featChoice.id}: ${values.join(", ")}`
                      : "";
                  })
                  .filter(Boolean)
              : [];

            return `
              <article class="hg-character-choice-card">
                <h3>
                  ${escapeHtml(slot.className)} level ${slot.classLevel}
                </h3>

                <p>
                  <b>Choice:</b>
                  ${escapeHtml(selection)}
                  ${feat
                    ? `
                      <br>${escapeHtml(feat.summary || "")}
                      <br><span class="small">${escapeHtml(feat.description || "")}</span>
                    `
                    : ""}
                </p>

                ${featChoiceSummary.length
                  ? `
                    <ul class="small">
                      ${featChoiceSummary.map((summary) => {
                        return `<li>${escapeHtml(summary)}</li>`;
                      }).join("")}
                    </ul>
                  `
                  : ""}
              </article>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderMulticlassLevelBreakdown(
    character = creatorState.draft,
    options = {}
  ) {
    const readonly =
      options.readonly === true;
    const records =
      getCharacterLevelHitDieRecords(character);

    if (records.length <= 1) {
      return "";
    }

    const classLevelCounts = {};

    const levelRecords =
      records.map((record, index) => {
        const classKey =
          record.classEntryId ||
          record.classId ||
          record.className ||
          "class";

        classLevelCounts[classKey] =
          (classLevelCounts[classKey] || 0) + 1;

        return {
          ...record,
          classLevel:
            record.classLevel ||
            classLevelCounts[classKey],
          levelIndex: index
        };
      });

    const levelOrderSummary =
      levelRecords
        .map((record) => {
          return `${
            record.className ||
            "Class"
          } ${record.classLevel}`;
        })
        .join(", ");

    const levelRows =
      levelRecords
        .map((record) => {
          return `
            <div class="hg-character-level-order-row">
              <div class="hg-character-level-order-label">
                <span>
                  Character Level ${record.characterLevel}
                </span>

                <strong>
                  ${escapeHtml(
                    record.className ||
                    "Class"
                  )}
                  ${record.classLevel}
                </strong>

                <span>
                  ${escapeHtml(
                    record.hitDie ||
                    "d8"
                  )}
                </span>
              </div>

              <div class="hg-character-level-order-actions">
                <button
                  type="button"
                  data-cc-action="move-character-level-order"
                  data-level-index="${record.levelIndex}"
                  data-delta="-1"
                  ${record.levelIndex <= 0 ? "disabled" : ""}
                >
                  Move Earlier
                </button>

                <button
                  type="button"
                  data-cc-action="move-character-level-order"
                  data-level-index="${record.levelIndex}"
                  data-delta="1"
                  ${record.levelIndex >= records.length - 1 ? "disabled" : ""}
                >
                  Move Later
                </button>
              </div>
            </div>
          `;
        })
        .join("");

    return `
      <h3>Level-by-Level Class Order</h3>

      <div class="hg-character-current-choice">
        <b>Level order:</b>
        ${escapeHtml(levelOrderSummary)}

        <br>

        <span class="small">
          Advanced: this controls HP and hit dice when multiclassing. Most players do not need to change it.
        </span>
      </div>

      ${
        readonly
          ? ""
          : `
            <details class="hg-character-level-order-details">
              <summary>Show Advanced Level Order</summary>

              <div class="hg-character-level-order-rows">
                ${levelRows}
              </div>
            </details>
          `
      }
    `;
  }

  function getSection12MulticlassAddStatus() {
    const stored =
      creatorState.multiclassAddStatus;

    return {
      message: cleanString(
        stored?.message
      ),
      tone:
        stored?.tone === "success"
          ? "success"
          : "warning"
    };
  }

  function renderSection12MulticlassAddStatus() {
    const status =
      getSection12MulticlassAddStatus();
    const isSuccess =
      status.tone === "success";

    return `
      <div
        id="ccMulticlassAddStatus"
        class="${isSuccess ? "hg-character-current-choice" : "hg-character-warning"} hg-character-multiclass-add-status"
        data-status-kind="${status.tone}"
        role="${isSuccess ? "status" : "alert"}"
        aria-live="polite"
        ${status.message ? "" : "hidden"}
      >
        ${escapeHtml(status.message)}
      </div>
    `;
  }

  function setSection12MulticlassAddStatus(
    message,
    tone = "warning",
    localRoot = null
  ) {
    const cleanMessage =
      cleanString(message);
    const cleanTone =
      tone === "success"
        ? "success"
        : "warning";

    creatorState.multiclassAddStatus = {
      message: cleanMessage,
      tone: cleanTone
    };

    setStatus(cleanMessage);

    if (typeof document === "undefined") {
      return cleanMessage;
    }

    const roots = [
      localRoot,
      W.stepBody,
      W.root
    ].filter((root, index, values) => {
      return (
        root &&
        typeof root.querySelector ===
          "function" &&
        values.indexOf(root) === index
      );
    });

    let statusElement = null;

    roots.some((root) => {
      statusElement =
        root.querySelector(
          "#ccMulticlassAddStatus"
        );

      return Boolean(statusElement);
    });

    if (!statusElement) {
      statusElement =
        document.getElementById(
          "ccMulticlassAddStatus"
        );
    }

    if (!statusElement) {
      return cleanMessage;
    }

    statusElement.textContent =
      cleanMessage;
    statusElement.hidden =
      !cleanMessage;
    statusElement.className =
      `${cleanTone === "success" ? "hg-character-current-choice" : "hg-character-warning"} hg-character-multiclass-add-status`;
    statusElement.dataset.statusKind =
      cleanTone;
    statusElement.setAttribute(
      "role",
      cleanTone === "success"
        ? "status"
        : "alert"
    );

    return cleanMessage;
  }

  function renderMulticlassProgressionEditor(
    character = creatorState.draft
  ) {
    const entries =
      getMulticlassSummaryEntries(
        character
      );

    const classes =
      getClassProgressionEntries(
        character
      );

    const totalLevel =
      calculateClassProgressionTotalLevel(
        character
      );

    const levelOrder =
      normalizeClassLevelOrder(
        character
          ?.classProgression
          ?.levelOrder,
        classes
      );

    const classSplit = entries
      .map((entry) => {
        return `${entry.className} ${entry.classLevel}`;
      })
      .join(" / ");

    const proficiencyBonus =
      getGenericProficiencyBonus(
        totalLevel
      );

    const existingClassIds =
      new Set(
        classes
          .map((classEntry) => {
            const template =
              resolveClassTemplateForEntry(
                classEntry
              );

            return (
              classEntry?.classId ||
              template?.id ||
              ""
            );
          })
          .filter(Boolean)
      );

    const failedPrerequisites =
      entries.length > 1
        ? getMulticlassPrerequisiteResults(
            character
          ).filter((result) => {
            return !result.met;
          })
        : [];

    const addClassChoices = [
      {
        value: "",
        label:
          totalLevel >= 20
            ? "Total level is already 20"
            : "Choose a class to add"
      },

      ...getAllClassTemplates()
        .filter((classData) => {
          return !existingClassIds.has(
            classData.id
          );
        })
        .map((classData) => {
          return {
            value: classData.id,
            label: classData.name
          };
        })
    ];

    const classCards =
      entries
        .map((entry, index) => {
          const classEntry =
            entry.classEntry;

          const classProgressionKey =
            getClassProgressionEntryKey(
              classEntry,
              index
            );

          const orderedLevelCount =
            levelOrder.filter((key) => {
              return key === classProgressionKey;
            }).length;

          const otherLevelTotal =
            classes.reduce(
              (sum, item, itemIndex) => {
                return (
                  sum +
                  (
                    itemIndex === index
                      ? 0
                      : getClassEntryLevel(
                          item,
                          1
                        )
                  )
                );
              },
              0
            );

          const maximumLevel =
            Math.max(
              1,
              20 - otherLevelTotal
            );

          const subclassOptions =
            (
              Array.isArray(
                entry.template?.subclasses
              )
                ? entry.template.subclasses
                : []
            )
              .map((subclass) => {
                return normalizeSection12Subclass(
                  subclass,
                  entry.template?.source ||
                  "template"
                );
              });

          const subclassUnlocked =
            entry.classLevel >=
            entry.subclassLevel;

          const selectedSubclass =
            getClassEntrySubclassTemplate(
              classEntry
            );

          const prerequisiteResult =
            getMulticlassPrerequisiteResultForClass(
              classEntry,
              character
            );

          const proficiencySummary =
            formatClassEntryProficiencySummary(
              classEntry,
              index,
              character
            );

          const toolChoiceConfig =
            getClassEntryToolChoiceConfig(
              classEntry,
              index,
              character
            );

          const pendingToolChoice =
            toolChoiceConfig.choose > 0 &&
            getValidClassEntryToolChoices(
              classEntry,
              index,
              character
            ).length !== toolChoiceConfig.choose;

          const isStartingClass =
            isStartingClassEntry(
              classEntry,
              character,
              index
            );

          const subclassChoices = [
            {
              value: "",
              label:
                subclassUnlocked
                  ? `Choose ${entry.template?.subclassLabel || "Subclass"}`
                  : `${entry.template?.subclassLabel || "Subclass"} unlocks at level ${entry.subclassLevel}`
            },

            ...subclassOptions.map(
              (subclass) => {
                return {
                  value: subclass.id,
                  label: subclass.name
                };
              }
            )
          ];

          return `
            <article class="hg-character-choice-card">
              <h3>
                ${escapeHtml(entry.className)}
                ${isStartingClass ? " &mdash; Starting Class" : ""}
              </h3>

              <p>
                <b>Class Level:</b>
                ${entry.classLevel}

                <br>

                <b>Levels in Order:</b>
                ${orderedLevelCount}

                <br>

                <b>Hit Die:</b>
                ${escapeHtml(entry.hitDie)}

                <br>

                <b>Subclass:</b>
                ${escapeHtml(
                  entry.subclassName ||
                  (
                    subclassUnlocked
                      ? "None selected"
                      : `Unlocks at level ${entry.subclassLevel}`
                  )
                )}

                <br>

                <b>Multiclass Prerequisite:</b>
                ${escapeHtml(prerequisiteResult.label)}
                ${prerequisiteResult.met ? "✓" : "⚠"}

                <br>

                <b>Proficiencies:</b>
                ${escapeHtml(proficiencySummary)}
              </p>

              ${
                pendingToolChoice
                  ? `
                    <div class="hg-character-warning">
                      <b>Pending multiclass choice:</b>
                      Choose ${toolChoiceConfig.choose}
                      ${escapeHtml(toolChoiceConfig.label)}${toolChoiceConfig.choose === 1 ? "" : "s"}.
                    </div>
                  `
                  : ""
              }

              ${wizardField(
                "Class Level",
                `ccMulticlassLevel-${index}`,
                entry.classLevel,
                {
                  type: "number",
                  valueType: "integer",
                  extra:
                    `min="1" max="${maximumLevel}" step="1" data-multiclass-class-index="${index}"`
                }
              )}

              <div class="hg-character-inline-actions">
                <button
                  type="button"
                  data-cc-action="adjust-multiclass-level"
                  data-class-index="${index}"
                  data-delta="-1"
                  ${entry.classLevel <= 1 ? "disabled" : ""}
                >
                  - Level
                </button>

                <button
                  type="button"
                  data-cc-action="adjust-multiclass-level"
                  data-class-index="${index}"
                  data-delta="1"
                  ${entry.classLevel >= maximumLevel ? "disabled" : ""}
                >
                  + Level
                </button>
              </div>

              <div class="hg-character-inline-actions">
                <button
                  type="button"
                  data-cc-action="add-character-level"
                  data-class-index="${index}"
                  ${totalLevel >= 20 || entry.classLevel >= maximumLevel ? "disabled" : ""}
                >
                  Add next level to ${escapeHtml(entry.className)}
                </button>
              </div>

              ${
                subclassOptions.length
                  ? wizardSelect(
                      entry.template?.subclassLabel || "Subclass",
                      `ccMulticlassSubclass-${index}`,
                      classEntry?.subclassId ||
                        selectedSubclass?.id ||
                        "",
                      subclassChoices,
                      {
                        extra:
                          `data-multiclass-subclass-index="${index}"${
                            subclassUnlocked
                              ? ""
                              : " disabled"
                          }`
                      }
                    )
                  : `
                    <p class="small">
                      This class does not have saved subclass options.
                    </p>
                      `
              }

              ${renderMulticlassStoredChoices(
                entry.classEntry
              )}

              ${renderMulticlassSkillChoices(
                entry.classEntry,
                index,
                character
              )}

              ${renderMulticlassToolChoices(
                entry.classEntry,
                index,
                character
              )}

              <div class="hg-character-inline-actions">
                <button
                  type="button"
                  data-cc-action="move-multiclass-class"
                  data-class-index="${index}"
                  data-delta="-1"
                  ${index <= 0 ? "disabled" : ""}
                >
                  Move Up
                </button>

                <button
                  type="button"
                  data-cc-action="move-multiclass-class"
                  data-class-index="${index}"
                  data-delta="1"
                  ${index >= entries.length - 1 ? "disabled" : ""}
                >
                  Move Down
                </button>

                ${
                  !isStartingClass
                    ? `
                      <button
                        type="button"
                        data-cc-action="remove-multiclass-class"
                        data-class-index="${index}"
                      >
                        Remove Class
                      </button>
                    `
                    : ""
                }
              </div>
            </article>
          `;
        })
        .join("");

    return `
      <h3>Class Progression</h3>

      <div class="hg-character-current-choice">
        <b>Total Character Level:</b>
        ${totalLevel} / 20

        <br>

        <b>Class Split:</b>
        ${escapeHtml(classSplit || "No class selected")}

        <br>

        <b>Proficiency Bonus:</b>
        +${proficiencyBonus}

        <br>

        Add character levels through the level-up workflow below.
        Advanced class totals and the level-by-level order are still
        editable when you need to correct an imported or older character.
      </div>

      ${
        failedPrerequisites.length
          ? `
            <div class="hg-character-warning">
              <b>Multiclass prerequisites not met:</b>
              ${escapeHtml(
                failedPrerequisites
                  .map(formatMulticlassPrerequisiteFailure)
                  .join("; ")
              )}.
            </div>
          `
          : ""
      }

      ${renderLevelUpWorkflow(character)}

      <hr>

      <div class="hg-character-beginner-note">
        <strong>Add Multiclass</strong>
        <p>
          Add Selected Class adds a new class at level 1. After that, use Level Up Workflow to add more levels to that class.
        </p>
      </div>

      <div class="hg-character-field-grid three">
        ${wizardSelect(
          "Choose class to add",
          "ccMulticlassAddClass",
          "",
          addClassChoices,
          {
            wide: true,
            extra:
              totalLevel >= 20
                ? "disabled"
                : ""
          }
        )}

        <div class="hg-character-field">
          <label>
            Action
          </label>

          <button
            type="button"
            data-cc-action="add-multiclass-class"
            ${totalLevel >= 20 ? "disabled" : ""}
          >
            Add Selected Class
          </button>
        </div>
      </div>

      ${renderSection12MulticlassAddStatus()}

      <div class="hg-character-choice-grid">
        ${classCards ||
          `
            <div class="hg-character-placeholder">
              Choose a class to begin the progression.
            </div>
          `}
      </div>
    `;
  }

  function renderMulticlassSkillChoices(
    classEntry,
    classIndex = 0,
    character = creatorState.draft
  ) {
    const config =
      getClassEntrySkillChoiceConfig(
        classEntry,
        classIndex,
        character
      );

    if (
      isStartingClassEntry(
        classEntry,
        character,
        classIndex
      ) ||
      config.choose <= 0
    ) {
      return "";
    }

    const selected =
      new Set(
        getValidClassEntrySkillIds(
          classEntry,
          classIndex,
          character
        )
      );

    const allowedSkills =
      cleanArray(config.from)
        .map(getSkillDefinitionByIdOrName)
        .filter(Boolean);

    return `
      <p>
        <b>Multiclass Skill:</b>
        Choose ${config.choose}.
        Selected ${selected.size} / ${config.choose}.
      </p>

      <div class="hg-character-inline-actions">
        ${allowedSkills
          .map((skill) => {
            const isSelected =
              selected.has(skill.id);

            return `
              <button
                type="button"
                class="${isSelected ? "selected" : ""}"
                data-cc-action="toggle-multiclass-skill"
                data-class-index="${classIndex}"
                data-skill-id="${escapeHtml(skill.id)}"
              >
                ${isSelected ? "Remove" : "Choose"}
                ${escapeHtml(skill.name)}
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderMulticlassToolChoices(
    classEntry,
    classIndex = 0,
    character = creatorState.draft
  ) {
    const config =
      getClassEntryToolChoiceConfig(
        classEntry,
        classIndex,
        character
      );

    if (
      isStartingClassEntry(
        classEntry,
        character,
        classIndex
      ) ||
      config.choose <= 0
    ) {
      return "";
    }

    const selected = new Set(
      getValidClassEntryToolChoices(
        classEntry,
        classIndex,
        character
      )
    );

    const options =
      getClassEntryToolChoiceOptions(
        classEntry,
        classIndex,
        character
      );

    return `
      <p>
        <b>Multiclass Tool:</b>
        Choose ${config.choose}
        ${escapeHtml(config.label)}${config.choose === 1 ? "" : "s"}.
        Selected ${selected.size} / ${config.choose}.
      </p>

      <div class="hg-character-inline-actions">
        ${options
          .map((tool) => {
            const isSelected =
              selected.has(tool);

            return `
              <button
                type="button"
                class="${isSelected ? "selected" : ""}"
                data-cc-action="toggle-multiclass-tool"
                data-class-index="${classIndex}"
                data-tool-value="${escapeHtml(tool)}"
              >
                ${isSelected ? "Remove" : "Choose"}
                ${escapeHtml(tool)}
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function debugSection12MulticlassAdd(
    stage,
    details = {}
  ) {
    if (
      globalThis
        ?.HOMEBREW_GOD_DEBUG_MULTICLASS !==
      true
    ) {
      return;
    }

    console.debug(
      `[CharacterCreator] ${stage}`,
      details
    );
  }

  function handleSection12AddMulticlassClass(
    ...values
  ) {
    const button =
      findSection12ActionElement(
        ...values
      );

    const localRoot =
      button?.closest?.(
        ".hg-character-step-panel"
      ) || null;

    const selectCandidates =
      localRoot
        ? [
            ...localRoot.querySelectorAll(
              "#ccMulticlassAddClass"
            )
          ]
        : [];

    const select =
      selectCandidates.find(
        (candidate) => {
          return (
            candidate.hidden !== true &&
            candidate.getAttribute(
              "aria-hidden"
            ) !== "true" &&
            !candidate.closest("[hidden]")
          );
        }
      ) ||
      selectCandidates[0] ||
      null;

    const rawSelectValue =
      select?.value ?? "";
    const classId = cleanString(
      rawSelectValue
    );
    const selectedClass =
      getAllClassTemplates().find(
        (classData) => {
          return classData.id === classId;
        }
      ) || null;
    const existingClassIds =
      getClassProgressionEntries()
        .map((classEntry) => {
          return getMulticlassClassId(
            classEntry
          );
        })
        .filter(Boolean);
    const currentTotal =
      recalculateClassTotalLevel(
        creatorState.draft
      );

    debugSection12MulticlassAdd(
      "add multiclass clicked",
      {
        localRootFound:
          Boolean(localRoot),
        selectorFound:
          Boolean(select),
        selectorCount:
          selectCandidates.length,
        selectValue:
          rawSelectValue,
        classId,
        selectedClassName:
          selectedClass?.name || "",
        existingClassIds,
        currentTotal
      }
    );

    if (!select) {
      const message =
        "Multiclass class selector was not found.";

      console.warn(
        message
      );

      setSection12MulticlassAddStatus(
        message,
        "warning",
        localRoot
      );

      debugSection12MulticlassAdd(
        "add multiclass result",
        {
          localRootFound:
            Boolean(localRoot),
          selectorFound: false,
          selectorCount:
            selectCandidates.length,
          selectValue:
            rawSelectValue,
          classId,
          selectedClassName: "",
          existingClassIds,
          currentTotal,
          addResult: {
            ok: false,
            reason:
              "selector-not-found",
            message
          }
        }
      );

      return false;
    }

    const addResult =
      tryAddMulticlassClass(
        classId
      );

    debugSection12MulticlassAdd(
      "add multiclass result",
      {
        localRootFound: true,
        selectorFound: true,
        selectorCount:
          selectCandidates.length,
        selectValue:
          rawSelectValue,
        classId,
        selectedClassName:
          selectedClass?.name || "",
        existingClassIds,
        currentTotal,
        addResult:
          cloneData(addResult),
        classProgression:
          cloneData(
            creatorState.draft
              .classProgression
          )
      }
    );

    if (!addResult.ok) {
      setSection12MulticlassAddStatus(
        addResult.message,
        "warning",
        localRoot
      );

      return false;
    }

    select.value = "";

    setSection12MulticlassAddStatus(
      addResult.message,
      "success",
      localRoot
    );

    renderCreatorView();

    setSection12MulticlassAddStatus(
      addResult.message,
      "success"
    );

    return true;
  }

  function handleSection12AdjustMulticlassLevel(
    ...values
  ) {
    const button =
      findSection12ActionElement(
        ...values
      );

    if (
      adjustMulticlassClassLevel(
        button?.dataset?.classIndex,
        button?.dataset?.delta
      )
    ) {
      setStatus(
        "Class level updated."
      );

      renderCreatorView();
    }
  }

  function handleSection12RemoveMulticlassClass(
    ...values
  ) {
    const button =
      findSection12ActionElement(
        ...values
      );

    if (
      removeMulticlassClass(
        button?.dataset?.classIndex
      )
    ) {
      setStatus(
        "Class removed from progression."
      );

      renderCreatorView();
    }
  }

  function handleSection12MoveMulticlassClass(
    ...values
  ) {
    const button =
      findSection12ActionElement(
        ...values
      );

    if (
      moveMulticlassClass(
        button?.dataset?.classIndex,
        button?.dataset?.delta
      )
    ) {
      setStatus(
        "Class order updated."
      );

      renderCreatorView();
    }
  }

  function handleSection12MoveCharacterLevelOrder(
    ...values
  ) {
    const button =
      findSection12ActionElement(
        ...values
      );

    if (
      moveCharacterLevelOrder(
        button?.dataset?.levelIndex,
        button?.dataset?.delta
      )
    ) {
      setStatus(
        "Level order updated."
      );

      renderCreatorView();
    }
  }

  function handleSection12AddCharacterLevel(
    ...values
  ) {
    const button =
      findSection12ActionElement(
        ...values
      );

    const classIndex =
      button?.dataset?.classIndex !== undefined
        ? button.dataset.classIndex
        : $("ccLevelUpClassIndex")
            ?.value ||
          0;

    const classEntry =
      getClassEntryAtIndex(
        classIndex
      );

    const className =
      resolveClassTemplateForEntry(
        classEntry
      )?.name ||
      classEntry?.className ||
      "Class";

    if (
      addCharacterLevelToClass(
        classIndex
      )
    ) {
      setStatus(
        `${className} gained the next character level.`
      );

      renderCreatorView();
    }
  }

  function handleSection12RemoveLastCharacterLevel() {
    if (removeLastCharacterLevel()) {
      setStatus(
        "Last character level removed."
      );

      renderCreatorView();
    }
  }

  function handleSection12ToggleMulticlassSkill(
    ...values
  ) {
    const button =
      findSection12ActionElement(
        ...values
      );

    if (
      toggleMulticlassSkillChoice(
        button?.dataset?.classIndex,
        button?.dataset?.skillId
      )
    ) {
      setStatus(
        "Multiclass skill proficiency updated."
      );

      renderCreatorView();
    }
  }

  function handleSection12ToggleMulticlassTool(
    ...values
  ) {
    const button =
      findSection12ActionElement(
        ...values
      );

    if (
      toggleMulticlassToolChoice(
        button?.dataset?.classIndex,
        button?.dataset?.toolValue
      )
    ) {
      setStatus(
        "Multiclass tool proficiency updated."
      );

      renderCreatorView();
    }
  }

  function handleSection12MulticlassChange({
    target
  }) {
    if (
      target?.dataset?.multiclassClassIndex !==
      undefined
    ) {
      if (
        setMulticlassClassLevel(
          target.dataset.multiclassClassIndex,
          target.value
        )
      ) {
        setStatus(
          "Class level updated."
        );

        renderCreatorView();
      }

      return true;
    }

    if (
      target?.dataset?.multiclassSubclassIndex !==
      undefined
    ) {
      if (
        setMulticlassSubclass(
          target.dataset.multiclassSubclassIndex,
          target.value
        )
      ) {
        setStatus(
          "Subclass selected."
        );

        renderCreatorView();
      }

      return true;
    }

    return false;
  }

  function renderStep(character = creatorState.draft) {
    return `
      ${renderMulticlassProgressionEditor(character)}
      ${renderMulticlassLevelBreakdown(character)}
    `;
  }

  async function handleStepClick(context) {
    const action = cleanString(context?.action);

    switch (action) {
      case "add-multiclass-class":
        handleSection12AddMulticlassClass(context);
        return true;
      case "adjust-multiclass-level":
        handleSection12AdjustMulticlassLevel(context);
        return true;
      case "remove-multiclass-class":
        handleSection12RemoveMulticlassClass(context);
        return true;
      case "move-multiclass-class":
        handleSection12MoveMulticlassClass(context);
        return true;
      case "move-character-level-order":
        handleSection12MoveCharacterLevelOrder(context);
        return true;
      case "add-character-level":
        handleSection12AddCharacterLevel(context);
        return true;
      case "remove-last-character-level":
        handleSection12RemoveLastCharacterLevel();
        return true;
      case "toggle-multiclass-skill":
        handleSection12ToggleMulticlassSkill(context);
        return true;
      case "toggle-multiclass-tool":
        handleSection12ToggleMulticlassTool(context);
        return true;
      default:
        return false;
    }
  }

  function handleStepInput() {
    return false;
  }

  function handleStepChange(context) {
    return handleSection12MulticlassChange(context);
  }

  function isStepComplete(character = creatorState.draft) {
    if (
      !getPrimaryClassEntry(character) ||
      !getSafeClassName(character)
    ) {
      return false;
    }

    if (!isMulticlassDraft(character)) {
      return true;
    }

    const totalLevel = getCharacterClassEntries(character)
      .reduce((sum, classEntry) => {
        return sum + getClassEntryLevel(classEntry, 0);
      }, 0);

    return (
      totalLevel >= 1 &&
      totalLevel <= 20 &&
      getMulticlassPrerequisiteResults(character)
        .every((result) => result.met) &&
      getClassProgressionPendingChoiceWarnings(character).length === 0
    );
  }

  function validateStep(character = creatorState.draft) {
    const complete = isStepComplete(character);
    return {
      valid: complete,
      blockingErrors: complete
        ? []
        : getStepWarnings(character),
      reminders: []
    };
  }

  function normalizeStepData(character) {
    return character;
  }

  function getStepWarnings(character = creatorState.draft) {
    if (!getPrimaryClassEntry(character) || !getSafeClassName(character)) {
      return ["Choose a starting class."];
    }

    if (!isMulticlassDraft(character)) {
      return [];
    }

    const totalLevel = getCharacterClassEntries(character)
      .reduce((sum, classEntry) => {
        return sum + getClassEntryLevel(classEntry, 0);
      }, 0);
    const warnings = [];

    if (totalLevel < 1 || totalLevel > 20) {
      warnings.push("Multiclass total level must be between 1 and 20.");
    }

    getMulticlassPrerequisiteResults(character)
      .filter((result) => !result.met)
      .forEach((result) => {
        warnings.push(
          result.label ||
          `${result.className || "Class"} multiclass prerequisite is not met.`
        );
      });

    warnings.push(
      ...getClassProgressionPendingChoiceWarnings(character)
    );

    return [...new Set(warnings)];
  }

  return Object.freeze({
    id: "multiclass",
    actions: MULTICLASS_STEP_ACTIONS,
    renderStep,
    handleStepClick,
    handleStepInput,
    handleStepChange,
    validateStep,
    normalizeStepData,
    getStepWarnings,
    isStepComplete,
    compatibility: Object.freeze({
      renderMulticlassStoredChoices,
      renderMulticlassReadOnlyNotice,
      renderMulticlassClassSummary,
      renderMulticlassAdvancementChoiceSummary,
      renderMulticlassLevelBreakdown,
      getSection12MulticlassAddStatus,
      renderSection12MulticlassAddStatus,
      setSection12MulticlassAddStatus,
      renderMulticlassProgressionEditor,
      renderMulticlassSkillChoices,
      renderMulticlassToolChoices,
      debugSection12MulticlassAdd,
      handleSection12AddMulticlassClass,
      handleSection12AdjustMulticlassLevel,
      handleSection12RemoveMulticlassClass,
      handleSection12MoveMulticlassClass,
      handleSection12MoveCharacterLevelOrder,
      handleSection12AddCharacterLevel,
      handleSection12RemoveLastCharacterLevel,
      handleSection12ToggleMulticlassSkill,
      handleSection12ToggleMulticlassTool,
      handleSection12MulticlassChange
    })
  });
}
