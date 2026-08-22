const SKILLS_STEP_ACTIONS = Object.freeze([
  "toggle-skill-proficiency",
  "toggle-skill-expertise",
  "apply-proficiency-lists"
]);

export function createSkillsStep(dependencies = {}) {
  const {
    $,
    applyCompatibilityAliases,
    cleanArray,
    cleanString,
    escapeHtml,
    getCreatorState,
    markDraftChanged,
    renderCreatorView,
    safeNumber,
    setStatus,
    uniqueCleanArray,
    wizardField
  } = dependencies.sharedServices || dependencies;
  const {
    SKILL_DEFINITIONS,
    calculateAbilityModifier,
    formatSection14List,
    getBackgroundSourceLabel,
    getCharacterProficiencyBonus,
    getClassSourceLabel,
    getManualProficiencyList,
    getPrimaryClassEntry,
    getSelectedClassTemplate,
    getSelectedSection14Background,
    isMulticlassDraft,
    isSection17ClassComplete,
    parseSection14List,
    setManualProficiencyList,
  } = dependencies;

  const creatorState = getCreatorState();

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

      expertiseSources:
        Array.isArray(raw?.expertiseSources)
          ? uniqueCleanArray(raw.expertiseSources)
          : raw?.expertise === true
            ? ["legacy"]
            : [],

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

      expertiseSources:
        entry.expertise === true
          ? uniqueCleanArray(
              entry.expertiseSources || ["manual"]
            )
          : [],

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

        expertiseSources:
          current.expertise
            ? current.expertiseSources.filter(
                (source) => source !== "manual"
              )
            : uniqueCleanArray([
                ...current.expertiseSources,
                "manual"
              ]),

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
      getCharacterProficiencyBonus(
        creatorState.draft
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

  function renderSection14ProficiencyGuide() {
    return `
      <div class="hg-character-current-choice">
        <b>How proficiency works:</b>
        Your proficiency bonus is added when you are trained.
        Expertise doubles that bonus. Saving throw proficiency
        comes mostly from your class. Armor, weapon, tool, and
        language proficiencies are separate from skills.
      </div>
    `;
  }

  function renderSection14SourceSkillChoices(
    sourceType
  ) {
    const isClass = sourceType === "class";

    const sourceTemplate = isClass
      ? getSelectedClassTemplate()
      : getSelectedSection14Background();

    if (!sourceTemplate) {
      return `
        <div class="hg-character-placeholder">
          Choose a ${isClass ? "class" : "background"}
          before selecting its skills.
        </div>
      `;
    }

    const skillChoices =
      sourceTemplate.skillChoices || {};

    const required = Math.max(
      0,
      Math.round(
        safeNumber(skillChoices.choose, 0)
      )
    );

    if (!required) {
      return `
        <div class="hg-character-placeholder">
          This ${isClass ? "class" : "background"}
          does not grant a skill choice.
        </div>
      `;
    }

    const allowedNames = cleanArray(
      skillChoices.from
    ).map((name) => {
      return String(name).toLowerCase();
    });

    const sourceLabel =
      getSection14SkillSourceLabel(
        sourceType
      );

    const availableSkills =
      SKILL_DEFINITIONS.filter((skill) => {
        return (
          !allowedNames.length ||
          allowedNames.includes(
            skill.name.toLowerCase()
          )
        );
      });

    const skillCards = availableSkills
      .map((skill) => {
        const entry =
          getSection14SkillEntry(skill);

        const selected = Boolean(
          sourceLabel &&
          entry.source.includes(sourceLabel)
        );

        const modifier =
          getSection14SkillModifier(skill);

        return `
          <article class="hg-character-choice-card ${selected ? "selected" : ""}">
            <h3>${escapeHtml(skill.name)}</h3>

            <p>
              <b>Ability:</b>
              ${escapeHtml(
                String(skill.ability).toUpperCase()
              )}

              <br>

              <b>Current modifier:</b>
              ${modifier >= 0 ? "+" : ""}${modifier}
            </p>

            <div class="hg-character-card-actions">
              <button
                type="button"
                data-cc-action="toggle-skill-proficiency"
                data-skill-id="${escapeHtml(skill.id)}"
                data-skill-source="${escapeHtml(sourceType)}"
              >
                ${selected ? "Remove" : "Choose"}
              </button>
            </div>
          </article>
        `;
      })
      .join("");

    return `
      <div class="hg-character-current-choice">
        <b>${isClass ? "Class" : "Background"} skill choices:</b>
        ${countSection14ValidSkillSource(sourceType)} / ${required}

        <br>

        <b>Proficiency Bonus:</b>
        +${Math.max(
          0,
          getCharacterProficiencyBonus(
            creatorState.draft
          )
        )}
      </div>

      <div class="hg-character-choice-grid">
        ${skillCards}
      </div>
    `;
  }

  function renderSection14ExpertiseChoices() {
    const proficientSkills =
      SKILL_DEFINITIONS.filter((skill) => {
        return getSection14SkillEntry(
          skill
        ).proficient;
      });

    return `
      <hr>

      <h3>Expertise</h3>

      <p class="small">
        Expertise doubles the proficiency bonus for a trained
        skill. Choose it only when a feature grants expertise.
      </p>

      <div class="hg-character-choice-grid">
        ${proficientSkills.length
          ? proficientSkills
              .map((skill) => {
                const entry =
                  getSection14SkillEntry(skill);

                return `
                  <article class="hg-character-choice-card ${entry.expertise ? "selected" : ""}">
                    <h3>${escapeHtml(skill.name)}</h3>

                    <p>
                      ${entry.expertise
                        ? "Expertise selected"
                        : "Proficient"}
                    </p>

                    <div class="hg-character-card-actions">
                      <button
                        type="button"
                        data-cc-action="toggle-skill-expertise"
                        data-skill-id="${escapeHtml(skill.id)}"
                      >
                        ${entry.expertise
                          ? "Remove Expertise"
                          : "Add Expertise"}
                      </button>
                    </div>
                  </article>
                `;
              })
              .join("")
          : `
            <div class="hg-character-placeholder">
              Choose at least one skill proficiency before
              assigning expertise.
            </div>
          `}
      </div>
    `;
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

  function getStepWarnings(
    character = creatorState.draft
  ) {
    const warnings = [];

    if (!isMulticlassDraft(character)) {
      const selectedClass =
        getSelectedClassTemplate();

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
    }

    Object.values(
      character
        ?.proficiencies
        ?.skills || {}
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

    return warnings;
  }

  function renderStep() {
    return renderSkillsStep();
  }

  function handleStepClick(context) {
    switch (cleanString(context?.action)) {
      case "toggle-skill-proficiency":
        handleSection14ToggleSkill(context);
        return true;
      case "toggle-skill-expertise":
        handleSection14ToggleExpertise(context);
        return true;
      case "apply-proficiency-lists":
        handleSection14ApplyLists();
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

  function validateStep(
    character = creatorState.draft
  ) {
    const blockingErrors =
      getStepWarnings(character);

    return {
      valid: blockingErrors.length === 0,
      blockingErrors,
      reminders: []
    };
  }

  function normalizeStepData(character) {
    return character;
  }

  function isStepComplete(
    character = creatorState.draft
  ) {
    return isSection17SkillsComplete(
      character
    );
  }

  return Object.freeze({
    id: "skills",
    actions: SKILLS_STEP_ACTIONS,
    renderStep,
    handleStepClick,
    handleStepInput,
    handleStepChange,
    validateStep,
    normalizeStepData,
    getStepWarnings,
    isStepComplete,
    compatibility: Object.freeze({
      getSection14SkillEntry,
      getSection14SkillSourceLabel,
      getSection14SkillChoiceList,
      setSection14StoredSkillChoice,
      countSection14SkillSource,
      countSection14ValidSkillSource,
      setSection14SkillEntry,
      toggleSection14Skill,
      toggleSection14Expertise,
      getSection14SkillModifier,
      applySection14ProficiencyLists,
      renderSection14ProficiencyGuide,
      renderSection14SourceSkillChoices,
      renderSection14ExpertiseChoices,
      renderSkillsStep,
      findSection14ActionElement,
      handleSection14ToggleSkill,
      handleSection14ToggleExpertise,
      handleSection14ApplyLists,
      isSection17SkillsComplete
    })
  });
}
