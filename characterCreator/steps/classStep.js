import {
  createClassBuildPlan,
  normalizeClassBuildPlan,
  setClassBuildLevel,
  setClassBuildMode,
  setClassBuildSelection,
  summarizeClassBuildChanges,
  validateClassBuildPlan
} from "../classBuildPlanner.js?v=class-workflow-20261024";

const CLASS_STEP_ACTIONS = Object.freeze([
  "set-class-build-mode",
  "toggle-class-build-class",
  "set-class-build-starting",
  "adjust-class-build-level",
  "confirm-class-build",
  "cancel-class-build",
  "choose-class",
  "delete-room-class",
  "use-custom-class",
  "toggle-class-feature-choice",
  "toggle-artificer-infusion-known",
  "toggle-artificer-infusion-active",
  "add-custom-class-skill",
  "remove-custom-class-skill",
  "add-all-custom-class-skills",
  "clear-custom-class-skills",
  "choose-subclass",
  "use-custom-subclass",
  "clear-subclass"
]);

export function createClassStep(dependencies = {}) {
  const {
    applyCompatibilityAliases,
    beginnerNote,
    clampLevel,
    cleanString,
    escapeHtml,
    getCreatorState,
    markDraftChanged,
    renderCreatorView,
    safeDisplayString,
    safeNumber,
    setStatus,
    wizardChoiceCard,
    wizardField,
    wizardSelect
  } = dependencies.sharedServices || dependencies;
  const {
    applySection12CustomClass,
    applyGuidedClassBuildPlan,
    applySection12CustomSubclass,
    applySelectedClassFeatureMechanics,
    chooseSection12Class,
    chooseSection12Subclass,
    clearSection12Subclass,
    creatorDependencies: deps,
    deleteSelectedRoomClass,
    formatSection12List,
    friendlyServiceError,
    getAllClassTemplates,
    getCharacterClassEntries,
    getClassEntryLevel,
    getClassProgressionPendingChoiceWarnings,
    getMulticlassPrerequisiteResults,
    getMulticlassPrerequisiteResultForClass,
    getGenericProficiencyBonus,
    getPrimaryClassEntry,
    getRoomCode,
    getSafeClassName,
    getSafeSubclassName,
    getSection12ClassFeaturesThroughLevel,
    getSection12FeatureChoiceKey,
    getSection12FeatureChoiceOptions,
    getSection12FeatureChooseCount,
    getSection12PrimaryClass,
    getSection12SkillPickerChoices,
    getSection12SubclassTemplates,
    getSection19CollectionName,
    getSelectedClassTemplate,
    getSelectedSection12Subclass,
    isMulticlassDraft,
    renderCustomClassMovementFields,
    renderLevelStep,
    renderMulticlassLevelBreakdown,
    renderMulticlassProgressionEditor,
    renderRulesetMetadata,
    renderSection12SelectedClassDetails,
    renderSection14ProficiencyGuide,
    renderSection14SourceSkillChoices,
    setSection12ArtificerInfusionTarget,
    setSection12FeatureStoredChoices,
    toggleSection12ArtificerInfusion,
    toggleSection12ClassFeatureChoice,
    updateSection12CustomClassSkillPicker,
  } = dependencies;

  const creatorState = getCreatorState();
  let pendingClassBuild = null;
  let pendingClassBuildBaseSignature = "";

  function getClassBuildDraftSignature() {
    const progression = creatorState.draft?.classProgression || {};
    return JSON.stringify({
      characterId:
        creatorState.currentCharacterId ||
        creatorState.draft?.id ||
        "new-character",
      totalLevel: progression.totalLevel || 1,
      classes: getCharacterClassEntries(creatorState.draft).map((entry) => ({
        entryId: entry?.entryId || "",
        classId: entry?.classId || entry?.className || "",
        level: entry?.level || 0
      })),
      levelOrder: Array.isArray(progression.levelOrder)
        ? progression.levelOrder
        : []
    });
  }

  function getPendingClassBuild() {
    const currentSignature = getClassBuildDraftSignature();
    if (
      !pendingClassBuild ||
      pendingClassBuildBaseSignature !== currentSignature
    ) {
      pendingClassBuildBaseSignature = currentSignature;
      pendingClassBuild = createClassBuildPlan(
        creatorState.draft
      );
    }

    return pendingClassBuild;
  }

  function classBuildName(classId) {
    return getAllClassTemplates().find((entry) => {
      return cleanString(entry?.id) === cleanString(classId);
    })?.name || classId || "Class";
  }

  function renderGuidedClassBuildWorkflow() {
    const plan = getPendingClassBuild();
    const validation = validateClassBuildPlan(plan);
    const changes = summarizeClassBuildChanges(
      creatorState.draft,
      plan
    );
    const selectedSet = new Set(plan.selectedClassIds);
    const classCards = getAllClassTemplates()
      .map((classData) => {
        const selected = selectedSet.has(classData.id);
        const prerequisite = getMulticlassPrerequisiteResultForClass?.(
          classData.id,
          creatorState.draft
        );
        const actionLabel = plan.mode === "single"
          ? selected ? "Selected" : "Choose Class"
          : selected ? "Remove Class" : "Add Class";

        return `
          <article class="hg-character-choice-card hg-class-build-card ${selected ? "selected" : ""}">
            <h3>${escapeHtml(classData.name || "Unnamed Class")}</h3>
            <p>${escapeHtml(classData.summary || "No description provided.")}</p>
            <p class="small">
              <b>Hit Die:</b> ${escapeHtml(classData.hitDie || "d8")}
              <br>
              <b>Multiclass prerequisite:</b>
              ${escapeHtml(prerequisite?.label || "No listed prerequisite")}
              ${prerequisite?.met === false ? " · Set the required ability scores before finishing." : ""}
            </p>
            <button
              type="button"
              data-cc-action="toggle-class-build-class"
              data-class-id="${escapeHtml(classData.id)}"
              aria-pressed="${selected ? "true" : "false"}"
            >${escapeHtml(actionLabel)}</button>
          </article>
        `;
      })
      .join("");
    const allocationRows = plan.selectedClassIds
      .map((classId) => {
        const level = Number(plan.levels[classId] || 1);
        return `
          <div class="hg-class-build-allocation-row">
            <b>${escapeHtml(classBuildName(classId))}</b>
            <div class="hg-character-inline-actions">
              <button type="button" data-cc-action="adjust-class-build-level" data-class-id="${escapeHtml(classId)}" data-level-delta="-1" aria-label="Remove one ${escapeHtml(classBuildName(classId))} level">−</button>
              <output>${level}</output>
              <button type="button" data-cc-action="adjust-class-build-level" data-class-id="${escapeHtml(classId)}" data-level-delta="1" aria-label="Add one ${escapeHtml(classBuildName(classId))} level">+</button>
            </div>
          </div>
        `;
      })
      .join("");
    const summary = plan.selectedClassIds.length
      ? plan.selectedClassIds.map((classId) => {
          return `${classBuildName(classId)} ${plan.levels[classId] || 1}`;
        }).join(" / ")
      : "No class selected";
    const changeLines = [
      ...changes.addedClassIds.map((id) => `Add ${classBuildName(id)}`),
      ...changes.removedClassIds.map((id) => `Remove ${classBuildName(id)} and deactivate its class-owned spells`),
      ...changes.changedLevels.map((entry) => `${classBuildName(entry.classId)} ${entry.before} → ${entry.after}`)
    ];

    return `
      <section class="hg-class-build-workflow" data-class-build-workflow="true">
        <header>
          <p class="small">Guided class setup · changes are not applied until confirmed</p>
          <h3>1. What level is your character?</h3>
        </header>

        ${wizardField("Total Character Level", "ccClassBuildTotalLevel", plan.totalLevel, {
          type: "number",
          valueType: "integer",
          extra: 'min="1" max="20" step="1" data-class-build-total="true"'
        })}

        <h3>2. Build Type</h3>
        <div class="hg-class-build-mode" role="group" aria-label="Class build type">
          <button type="button" data-cc-action="set-class-build-mode" data-build-mode="single" aria-pressed="${plan.mode === "single"}">Single Class</button>
          <button type="button" data-cc-action="set-class-build-mode" data-build-mode="multiclass" aria-pressed="${plan.mode === "multiclass"}" ${plan.totalLevel < 2 ? "disabled" : ""}>Multiclass</button>
        </div>
        <p class="small">
          <b>Single Class:</b> All your levels belong to one class.
          <br><b>Multiclass:</b> Split your levels between two or more classes.
        </p>
        ${plan.totalLevel < 2 ? '<p class="small">Multiclassing requires at least character level 2.</p>' : ""}

        <h3>3. Choose ${plan.mode === "single" ? "a Class" : "Classes"}</h3>
        <div class="hg-character-choice-grid hg-class-build-cards">${classCards}</div>

        ${plan.mode === "multiclass" && plan.selectedClassIds.length ? `
          <h3>4. Choose Starting Class</h3>
          <p class="small">Your starting class controls its first-level saving throws and proficiencies.</p>
          <div class="hg-class-build-starting-options">
            ${plan.selectedClassIds.map((classId) => `
              <label class="hg-ui-check">
                <input type="radio" name="ccClassBuildStarting" value="${escapeHtml(classId)}" data-class-build-starting="true" ${plan.startingClassId === classId ? "checked" : ""}>
                ${escapeHtml(classBuildName(classId))}
              </label>
            `).join("")}
          </div>
        ` : ""}

        ${plan.mode === "multiclass" && plan.selectedClassIds.length ? `
          <h3>5. Allocate Class Levels</h3>
          <div class="hg-class-build-allocations">${allocationRows}</div>
          <p class="small"><b>Allocated:</b> ${validation.allocated} / ${plan.totalLevel}</p>
        ` : ""}

        <div class="hg-character-current-choice hg-class-build-summary">
          <b>Your Character</b>
          <br><b>Total Level:</b> ${plan.totalLevel}
          <br><b>Starting Class:</b> ${escapeHtml(classBuildName(plan.startingClassId) || "Not selected")}
          <br><b>Class Breakdown:</b> ${escapeHtml(summary)}
          <br><b>Proficiency bonus:</b> +${getGenericProficiencyBonus(plan.totalLevel)}
          <br><b>Changes on confirm:</b> ${escapeHtml(changeLines.join("; ") || "No class changes")}
        </div>

        ${validation.errors.length ? `<div class="hg-character-warning">${validation.errors.map(escapeHtml).join("<br>")}</div>` : ""}

        <div class="hg-character-inline-actions">
          <button type="button" data-cc-action="cancel-class-build">Back / Cancel Changes</button>
          <button type="button" class="primary" data-cc-action="confirm-class-build" ${validation.valid ? "" : "disabled"}>Confirm Classes</button>
        </div>
      </section>
    `;
  }

  function renderLevelFirstPanel() {
    const character = creatorState.draft;
    const totalLevel = clampLevel(
      character
        ?.classProgression
        ?.totalLevel
    );
    const classEntries =
      getCharacterClassEntries(
        character
      );
    const multiclass =
      isMulticlassDraft(character);
    const classSplit = classEntries
      .map((classEntry) => {
        return `${
          cleanString(
            classEntry?.className
          ) || "Class"
        } ${getClassEntryLevel(
          classEntry,
          1
        )}`;
      })
      .join(" / ");

    return `
      <section class="hg-character-level-first" data-level-first-panel="true">
        <div class="hg-character-level-first-heading">
          <span class="hg-character-level-first-number">1</span>

          <div>
            <h3>Choose Total Character Level</h3>
            <p class="small">
              Set the character's overall level before choosing classes.
              Multiclass characters split this total between two or more classes.
            </p>
          </div>
        </div>

        <div class="hg-character-field-grid three">
          ${wizardField(
            "Total Character Level",
            "ccCharacterLevel",
            totalLevel,
            {
              type: "number",
              valueType: "integer",
              extra:
                `min="1" max="20" step="1" data-level-input="true"${
                  multiclass
                    ? ' disabled data-multiclass-total="true"'
                    : ""
                }`
            }
          )}
        </div>

        <div class="hg-character-current-choice">
          <b>Total level:</b>
          ${totalLevel}

          <br>

          <b>Class split:</b>
          ${escapeHtml(
            classSplit ||
            "Choose a starting class next"
          )}

          <br>

          <span class="small">
            ${
              multiclass
                ? "The total is calculated from the class split. Use the Level Up Workflow below to add levels."
                : totalLevel >= 2
                  ? "Multiclassing is available after you choose a starting class."
                  : "Set this to level 2 or higher if you want to multiclass."
            }
          </span>
        </div>
      </section>
    `;
  }

  function renderStep() {
    const progressionEntries =
      getCharacterClassEntries(
        creatorState.draft
      );
    const hasStartingClass = Boolean(
      progressionEntries.length > 0 &&
      getPrimaryClassEntry(
        creatorState.draft
      )
    );

    const primaryClass =
      getSection12PrimaryClass();

    const selectedClass =
      getSelectedClassTemplate();

    const selectedClassLevel = clampLevel(
      creatorState.draft.classProgression.totalLevel
    );

    const subclassUnlockLevel = Math.max(
      1,
      Math.round(
        safeNumber(
          selectedClass?.subclassLevel,
          3
        )
      )
    );

    const subclassUnlocked = Boolean(
      selectedClass &&
      selectedClassLevel >= subclassUnlockLevel
    );

    const subclassLabel =
      selectedClass?.subclassLabel ||
      (
        Array.isArray(selectedClass?.subclasses)
          ? selectedClass.subclasses
              .find((subclass) => {
                return cleanString(
                  subclass?.subclassLabel
                );
              })
              ?.subclassLabel
          : ""
      ) ||
      "Subclass";

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
          const isRoomTemplate = Boolean(
            classData.docId &&
            creatorState.roomClassCache.some(
              (cachedClass) => {
                return cleanString(cachedClass?.docId) ===
                  cleanString(classData.docId);
              }
            )
          );
          const canDeleteSelectedTemplate =
            selected &&
            isRoomTemplate &&
            deps.getCurrentIsDM?.() === true;

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

              <p>
                ${renderRulesetMetadata(classData, "class")}
              </p>

              ${
                canDeleteSelectedTemplate
                  ? `
                    <button type="button" class="danger"
                      data-cc-action="delete-room-class"
                      data-class-doc-id="${escapeHtml(classData.docId)}"
                      data-class-name="${escapeHtml(classData.name || "Unnamed Class")}">
                      Delete ${escapeHtml(classData.name || "Unnamed Class")}
                    </button>
                  `
                  : ""
              }
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
      ${renderGuidedClassBuildWorkflow()}

      ${beginnerNote(
        "Choosing a Class",
        "Class is your biggest rules choice. It decides your hit die, armor and weapon training, saving throws, class features, and sometimes spellcasting. Your level belongs here because each level unlocks new class features."
      )}

      ${selectedClass
        ? `
          <hr>

          <details class="hg-character-advanced-level-settings">
            <summary>Advanced level-by-level progression, HP, AC, movement, and hit dice</summary>

            <div class="hg-character-advanced-level-content">
              ${renderMulticlassProgressionEditor()}
              ${hasStartingClass && progressionEntries.length > 1 ? renderMulticlassLevelBreakdown() : ""}
              ${renderLevelStep({
                hideLevelInput: true
              })}
            </div>
          </details>
        `
        : `
          <div class="hg-character-placeholder">
            Choose a class to set its level and advancement.
          </div>
        `}

      ${selectedClass
        ? `
          <hr>

          <div class="hg-character-current-choice">
            <b>${escapeHtml(subclassLabel)}:</b>
            ${subclassUnlocked
              ? escapeHtml(
                  primaryClass?.subclassName ||
                  "Pending selection"
                )
              : `${escapeHtml(
                  subclassLabel
                )} unlocks at ${escapeHtml(
                  selectedClass.name ||
                  "class"
                )} level ${subclassUnlockLevel}.`}

            <br>

            <span class="small">
              Choose or change subclasses in each Class Progression card above.
            </span>
          </div>
        `
        : ""}

      ${selectedClass
        ? `
          <hr>

          <h3>Class Skill Choices</h3>

          ${renderSection14ProficiencyGuide()}

          ${renderSection14SourceSkillChoices("class")}
        `
        : ""}

      ${renderSection12SelectedClassDetails()}

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

        ${renderCustomClassMovementFields({
          template: customTemplate,
          wizardField
        })}

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

    const subclassLabel =
      selectedClass?.subclassLabel ||
      selectedSubclass?.subclassLabel ||
      (
        Array.isArray(selectedClass?.subclasses)
          ? selectedClass.subclasses
              .find((subclass) => {
                return cleanString(
                  subclass?.subclassLabel
                );
              })
              ?.subclassLabel
          : ""
      ) ||
      "Subclass";

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

    const currentLevel = clampLevel(
      creatorState.draft.classProgression.totalLevel
    );

    const subclassUnlocked =
      currentLevel >= subclassLevel;

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
                ${escapeHtml(
                  subclass.description ||
                  "No description provided."
                )}

                <br><br>

                ${renderRulesetMetadata(
                  subclass,
                  "subclass",
                  selectedClass?.id
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
        ${subclassUnlocked
          ? `Choose a ${escapeHtml(subclassLabel)} for this class.`
          : `This class gains its ${escapeHtml(subclassLabel)} at level ${subclassLevel}. Current class level: ${currentLevel}.`}
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

  async function handleSection12DeleteRoomClass(
    ...values
  ) {
    try {
      const button = findSection12ActionElement(...values);
      const result = await deleteSelectedRoomClass({
        deps,
        isDm: deps.getCurrentIsDM?.() === true,
        roomCode: getRoomCode(),
        collectionName: getSection19CollectionName(
          "classCollectionName",
          "classTemplatesCollectionName",
          "classes"
        ),
        documentId: cleanString(button?.dataset?.classDocId),
        selectedDocumentId: cleanString(
          getSelectedClassTemplate()?.docId
        ),
        roomClassCache: creatorState.roomClassCache,
        confirmDelete: (message) => window.confirm(message)
      });

      if (!result.deleted) {
        return false;
      }

      creatorState.roomClassCache = result.cache;
      setStatus(
        `Deleted room class "${result.name}". Existing character snapshots were kept.`
      );
      renderCreatorView();
      return true;
    } catch (error) {
      console.error(
        "Could not delete room class:",
        error
      );
      setStatus(
        /^(Only|Select)/.test(error?.message || "")
          ? error.message
          : friendlyServiceError(error, {
              service: "class library",
              action: "delete the selected room class"
            })
      );
      renderCreatorView();
      return false;
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

  function handleSection12ClassFeatureChoice(
    ...values
  ) {
    const button = findSection12ActionElement(...values);

    if (
      toggleSection12ClassFeatureChoice(
        button?.dataset?.featureKey ||
          button?.dataset?.featureId || "",
        button?.dataset?.option || ""
      )
    ) {
      setStatus("Class feature choice updated.");
      renderCreatorView();
    }
  }

  function handleSection12ClassFeatureSelectChange(event) {
    const select = event?.target?.closest?.(
      "select[data-cc-class-feature-select='true']"
    );

    if (!select) {
      return false;
    }

    const featureKey = select.dataset.featureKey || "";
    const feature = getSection12ClassFeaturesThroughLevel()
      .find((entry) => {
        return getSection12FeatureChoiceKey(entry) === featureKey;
      });

    if (!feature) {
      return false;
    }

    const allowed = new Set(
      getSection12FeatureChoiceOptions(feature)
    );
    const limit = getSection12FeatureChooseCount(feature);
    const selected = Array.from(select.selectedOptions || [])
      .map((option) => option.value)
      .filter((value) => allowed.has(value))
      .slice(0, limit);

    setSection12FeatureStoredChoices(feature, selected);
    applySelectedClassFeatureMechanics();
    applyCompatibilityAliases(creatorState.draft);
    markDraftChanged();
    setStatus("Class feature spell choices updated.");
    renderCreatorView();

    return true;
  }

  function handleSection12ArtificerInfusion(
    mode,
    ...values
  ) {
    const button = findSection12ActionElement(...values);

    if (
      toggleSection12ArtificerInfusion(
        button?.dataset?.featureKey || "infuse-item",
        button?.dataset?.infusionId || "",
        mode
      )
    ) {
      setStatus("Artificer infusions updated.");
      renderCreatorView();
    }
  }

  function handleSection12ArtificerInfusionTargetChange(event) {
    const select = event?.target?.closest?.(
      "select[data-cc-infusion-target='true']"
    );

    if (!select) {
      return false;
    }

    if (
      setSection12ArtificerInfusionTarget(
        select.dataset.featureKey || "",
        select.dataset.infusionId || "",
        select.value || ""
      )
    ) {
      setStatus("Infused item target updated.");
      renderCreatorView();
    }

    return true;
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

  function updatePendingClassBuild(nextPlan) {
    pendingClassBuild = normalizeClassBuildPlan(nextPlan);
    renderCreatorView();
  }

  function handleGuidedClassBuildAction(action, context) {
    const button = findSection12ActionElement(context);
    const plan = getPendingClassBuild();

    if (action === "set-class-build-mode") {
      updatePendingClassBuild(
        setClassBuildMode(plan, button?.dataset?.buildMode)
      );
      return true;
    }

    if (action === "toggle-class-build-class") {
      const classId = cleanString(button?.dataset?.classId);
      const selected = plan.selectedClassIds.includes(classId);
      updatePendingClassBuild(
        setClassBuildSelection(plan, classId, !selected)
      );
      return true;
    }

    if (action === "adjust-class-build-level") {
      const classId = cleanString(button?.dataset?.classId);
      const delta = Math.round(safeNumber(button?.dataset?.levelDelta, 0));
      updatePendingClassBuild(
        setClassBuildLevel(
          plan,
          classId,
          safeNumber(plan.levels[classId], 1) + delta
        )
      );
      return true;
    }

    if (action === "cancel-class-build") {
      pendingClassBuild = createClassBuildPlan(creatorState.draft);
      pendingClassBuildBaseSignature = getClassBuildDraftSignature();
      setStatus("Unconfirmed class changes discarded.");
      renderCreatorView();
      return true;
    }

    if (action === "confirm-class-build") {
      const validation = validateClassBuildPlan(plan);
      if (!validation.valid) {
        setStatus(validation.errors.join(" "), true);
        renderCreatorView();
        return true;
      }

      const result = applyGuidedClassBuildPlan?.(validation.plan);
      if (!result?.ok) {
        setStatus(result?.message || "The class plan could not be applied.", true);
        renderCreatorView();
        return true;
      }

      pendingClassBuild = createClassBuildPlan(creatorState.draft);
      pendingClassBuildBaseSignature = getClassBuildDraftSignature();
      const removedSpells = result.deactivatedSpellIds?.length || 0;
      setStatus(
        `Classes confirmed: ${result.summary}.${removedSpells ? ` ${removedSpells} removed-class spell selection${removedSpells === 1 ? "" : "s"} deactivated.` : ""}`
      );
      renderCreatorView();
      return true;
    }

    return false;
  }


  async function handleStepClick(context) {
    const action = cleanString(context?.action);

    if (CLASS_STEP_ACTIONS.slice(0, 6).includes(action)) {
      return handleGuidedClassBuildAction(action, context);
    }

    switch (action) {
      case "choose-class":
        handleSection12ChooseClass(context);
        return true;
      case "delete-room-class":
        await handleSection12DeleteRoomClass(context);
        return true;
      case "use-custom-class":
        handleSection12CustomClass();
        return true;
      case "toggle-class-feature-choice":
        handleSection12ClassFeatureChoice(context);
        return true;
      case "toggle-artificer-infusion-known":
        handleSection12ArtificerInfusion("known", context);
        return true;
      case "toggle-artificer-infusion-active":
        handleSection12ArtificerInfusion("active", context);
        return true;
      case "add-custom-class-skill":
        handleSection12CustomClassSkillPicker(
          "add",
          "Skill added to custom class options."
        );
        return true;
      case "remove-custom-class-skill":
        handleSection12CustomClassSkillPicker(
          "remove",
          "Skill removed from custom class options."
        );
        return true;
      case "add-all-custom-class-skills":
        handleSection12CustomClassSkillPicker(
          "add-all",
          "All skills added to custom class options."
        );
        return true;
      case "clear-custom-class-skills":
        handleSection12CustomClassSkillPicker(
          "clear",
          "Custom class skill options cleared."
        );
        return true;
      case "choose-subclass":
        handleSection12ChooseSubclass(context);
        return true;
      case "use-custom-subclass":
        handleSection12CustomSubclass();
        return true;
      case "clear-subclass":
        handleSection12ClearSubclass();
        return true;
      default:
        return false;
    }
  }

  function handleStepInput(context) {
    const input = context?.target?.closest?.(
      "input[data-class-build-total='true']"
    );
    if (!input) {
      return false;
    }

    const plan = getPendingClassBuild();
    pendingClassBuild = normalizeClassBuildPlan({
      ...plan,
      totalLevel: input.value
    });
    return true;
  }

  function handleStepChange(context) {
    const totalInput = context?.target?.closest?.(
      "input[data-class-build-total='true']"
    );
    if (totalInput) {
      updatePendingClassBuild({
        ...getPendingClassBuild(),
        totalLevel: totalInput.value
      });
      return true;
    }

    const startingInput = context?.target?.closest?.(
      "input[data-class-build-starting='true']"
    );
    if (startingInput) {
      updatePendingClassBuild({
        ...getPendingClassBuild(),
        startingClassId: startingInput.value
      });
      return true;
    }

    return (
      handleSection12ClassFeatureSelectChange(context) ||
      handleSection12ArtificerInfusionTargetChange(context)
    );
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

    const entries = getCharacterClassEntries(character);
    const totalLevel = entries
      .reduce((sum, classEntry) => {
        return sum + getClassEntryLevel(classEntry, 0);
      }, 0);

    return (
      entries.length >= 2 &&
      entries.every((entry) => getClassEntryLevel(entry, 0) >= 1) &&
      totalLevel === Number(character?.classProgression?.totalLevel || 0) &&
      totalLevel >= 2 &&
      totalLevel <= 20 &&
      getClassProgressionPendingChoiceWarnings(character).length === 0
    );
  }

  function validateStep(character = creatorState.draft) {
    const complete = isStepComplete(character);
    const prerequisiteReminders =
      isMulticlassDraft(character)
        ? getMulticlassPrerequisiteResults(
            character
          )
            .filter((result) => {
              return !result.met;
            })
            .map((result) => {
              return `Set ability scores later to meet ${result.className || "class"}: ${result.label}.`;
            })
        : [];

    return {
      valid: complete,
      blockingErrors: complete
        ? []
        : ["Choose a class and complete its required progression choices."],
      reminders: prerequisiteReminders
    };
  }

  function normalizeStepData(character) {
    return character;
  }

  function getStepWarnings(character = creatorState.draft) {
    const validation = validateStep(character);
    return [
      ...validation.blockingErrors,
      ...validation.reminders
    ];
  }

  return Object.freeze({
    id: "class",
    actions: CLASS_STEP_ACTIONS,
    renderStep,
    renderSubclassStep,
    handleStepClick,
    handleStepInput,
    handleStepChange,
    validateStep,
    normalizeStepData,
    getStepWarnings,
    isStepComplete,
    findActionElement: findSection12ActionElement,
    compatibility: Object.freeze({
      renderClassStep: renderStep,
      renderSubclassStep,
      findSection12ActionElement,
      handleSection12ChooseClass,
      handleSection12DeleteRoomClass,
      handleSection12CustomClass,
      handleSection12ClassFeatureChoice,
      handleSection12ClassFeatureSelectChange,
      handleSection12ArtificerInfusion,
      handleSection12ArtificerInfusionTargetChange,
      handleSection12CustomClassSkillPicker,
      handleSection12ChooseSubclass,
      handleSection12CustomSubclass,
      handleSection12ClearSubclass
    })
  });
}
