const FEATS_STEP_ACTIONS = Object.freeze([
  "set-asi-mode",
  "adjust-asi-ability",
  "choose-asi-feat"
]);

export const CREATOR_FEAT_SEARCH_DEBOUNCE_MS = 250;

export function createFeatsStep(dependencies = {}) {
  const {
    ABILITY_DEFINITIONS,
    DEFAULT_FEATS,
    DEFAULT_FEAT_ABILITY_SCORE_MAXIMUM,
    adjustSection12AsiAbility,
    cleanString,
    describeFeatSpellChoiceRestrictions,
    escapeHtml,
    findSection12ActionElement,
    getCreatorState,
    getFeatAbilityEffectMaximum,
    getFeatPrerequisiteLabel,
    getFeatPrerequisiteResult,
    getFeatSpellcastingValidationWarnings,
    getNormalAbilityScoreForCap,
    getSection12AsiChoiceState,
    getSection12FeatChoiceLimit,
    getSection12FeatChoiceOptions,
    getUnlockedFeatChoiceSlots,
    renderCreatorView,
    safeNumber,
    setFeatRestChoice,
    setSection12AsiFeat,
    setSection12AsiMode,
    setSection12FeatChoiceValues,
    setStatus,
    uniqueCleanArray
  } = dependencies;

  const creatorState = getCreatorState();
  let featSearchTimerId = null;

function formatSection12FeatEffect(effect) {
  if (effect?.summary) {
    return effect.summary;
  }

  const type = cleanString(effect?.type);

  if (type === "abilityIncrease") {
    return `${effect.ability} +${safeNumber(effect.value, 1)} (maximum ${getFeatAbilityEffectMaximum(effect)})`;
  }

  if (type === "abilityChoice") {
    return `Chosen ability +${safeNumber(effect.increase, 1)} (maximum ${getFeatAbilityEffectMaximum(effect)})`;
  }

  if (type === "abilityScoreImprovement") {
    return `${safeNumber(effect.points, 2)} ability-score increases (maximum ${getFeatAbilityEffectMaximum(effect)})`;
  }

  if (type === "hpBonus") {
    return `${safeNumber(effect.perLevel, 0)} maximum hit points per level`;
  }

  if (type === "initiativeBonus") {
    return `Initiative +${safeNumber(effect.value, 0)}`;
  }

  if (type === "speedBonus") {
    return `Walking speed +${safeNumber(effect.value, 0)} feet`;
  }

  if (type === "resource") {
    return `${effect.label || effect.id}: ${effect.uses} use(s), recharges on ${effect.recharge || "long rest"}`;
  }

  if (type === "damageResistance") {
    return `Resistance: ${uniqueCleanArray(effect.damageTypes || [effect.damageType]).join(", ")}`;
  }

  if (type === "armorProficiency") {
    return `Armor proficiency: ${uniqueCleanArray(effect.values).join(", ")}`;
  }

  if (type === "weaponProficiency") {
    return `Weapon proficiency: ${uniqueCleanArray(effect.values).join(", ")}`;
  }

  if (type === "spellGrant") {
    return `Granted spell: ${uniqueCleanArray(effect.spellIds || [effect.spellId]).join(", ")}`;
  }

  if (type === "spellChoice") {
    return "Choose the listed feat spell(s).";
  }

  if (type === "proficiencyChoice") {
    return `Choose ${safeNumber(effect.choose, 1)} proficiency option(s).`;
  }

  if (type === "savingThrowProficiencyFromAbilityChoice") {
    return "Gain the chosen ability's saving throw proficiency.";
  }

  return cleanString(type)
    .replace(/([a-z])([A-Z])/g, "$1 $2") ||
    "Structured feat effect";
}

function renderSection12FeatChoices(feature, state, feat) {
  const featChoices = Array.isArray(feat?.choices) ? feat.choices : [];

  if (!featChoices.length) {
    return "";
  }

  return `
    <div class="hg-character-field-grid">
      ${featChoices.map((featChoice) => {
        const options = getSection12FeatChoiceOptions(featChoice, state);
        const selectedValues = uniqueCleanArray(
          state.featChoices?.[featChoice.id]
        );
        const limit = getSection12FeatChoiceLimit(featChoice);
        const multiple = limit > 1;
        const choiceType = cleanString(featChoice?.type).toLowerCase();
        const restrictionText = choiceType === "spell"
          ? describeFeatSpellChoiceRestrictions(featChoice, {
              selections: state.featChoices,
              alignment: creatorState.draft?.identity?.alignment || ""
            })
          : "";

        return `
          <div class="hg-character-field">
            <label for="ccFeatChoice-${escapeHtml(feature.id)}-${escapeHtml(featChoice.id)}">
              ${escapeHtml(featChoice.label || featChoice.id)}
              ${multiple ? `(choose ${limit})` : ""}
            </label>

            ${options.length
              ? `
                <select
                  id="ccFeatChoice-${escapeHtml(feature.id)}-${escapeHtml(featChoice.id)}"
                  data-cc-action-change="set-asi-feat-choice"
                  data-feature-id="${escapeHtml(feature.id)}"
                  data-choice-id="${escapeHtml(featChoice.id)}"
                  ${multiple ? `multiple size="${Math.min(8, Math.max(3, limit + 1))}"` : ""}
                >
                  ${multiple ? "" : '<option value="">Choose...</option>'}
                  ${options.map((option) => {
                    const selected = selectedValues.includes(option.value);

                    return `
                      <option
                        value="${escapeHtml(option.value)}"
                        ${selected ? "selected" : ""}
                      >${escapeHtml(option.label)}</option>
                    `;
                  }).join("")}
                </select>
              `
              : choiceType === "spell"
                ? `
                  <select
                    id="ccFeatChoice-${escapeHtml(feature.id)}-${escapeHtml(featChoice.id)}"
                    disabled
                  >
                    <option>No eligible spells until the listed requirement is resolved.</option>
                  </select>
                `
                : `
                <input
                  id="ccFeatChoice-${escapeHtml(feature.id)}-${escapeHtml(featChoice.id)}"
                  type="text"
                  value="${escapeHtml(selectedValues.join(", "))}"
                  placeholder="Enter ${escapeHtml(featChoice.label || "choice")}"
                  data-cc-action-change="set-asi-feat-choice"
                  data-feature-id="${escapeHtml(feature.id)}"
                  data-choice-id="${escapeHtml(featChoice.id)}"
                >
              `}
            ${restrictionText
              ? `<p class="small">${escapeHtml(`${options.length} eligible catalog option${options.length === 1 ? "" : "s"}. ${restrictionText}`)}</p>`
              : ""}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderSection12CompactAsiChoice(feature) {
  const state = getSection12AsiChoiceState(feature.id);
  const pointsUsed = state.abilities.length;
  const selectedFeat = state.featId
    ? DEFAULT_FEATS.find((feat) => {
        return feat.id === state.featId;
      })
    : null;

  return `
    <p>
      <b>
        Advancement Choice — Level ${safeNumber(feature.level, 1)}
      </b>
    </p>

    <div class="hg-character-inline-actions">
      <button
        type="button"
        class="${state.mode === "asi" ? "selected" : ""}"
        data-cc-action="set-asi-mode"
        data-feature-id="${escapeHtml(feature.id)}"
        data-mode="asi"
      >
        Ability Score Improvement
      </button>

      <button
        type="button"
        class="${state.mode === "feat" ? "selected" : ""}"
        data-cc-action="set-asi-mode"
        data-feature-id="${escapeHtml(feature.id)}"
        data-mode="feat"
      >
        Feat
      </button>
    </div>

    ${state.mode === "asi"
      ? `
        <p class="small">
          <b>Ability Score Improvement selected.</b>
        </p>

        <p class="small"><b>${2 - pointsUsed}</b> increase(s) remaining</p>

        <div class="hg-character-field-grid three">
          ${ABILITY_DEFINITIONS.map((ability) => {
            const count = state.abilities.filter(
              (id) => id === ability.id
            ).length;
            const scoreForCap =
              getNormalAbilityScoreForCap(
                creatorState.draft,
                ability.id,
                {
                  excludedSource:
                    `class-asi:${feature.id}`
                }
              ) + count;

            return `
              <div class="hg-character-field">
                <label>${escapeHtml(ability.name)} +${count}</label>
                <div class="hg-character-inline-actions">
                  <button
                    type="button"
                    data-cc-action="adjust-asi-ability"
                    data-feature-id="${escapeHtml(feature.id)}"
                    data-ability-id="${escapeHtml(ability.id)}"
                    data-delta="-1"
                    ${count ? "" : "disabled"}
                    aria-label="Decrease ${escapeHtml(ability.name)}"
                  >-</button>
                  <button
                    type="button"
                    data-cc-action="adjust-asi-ability"
                    data-feature-id="${escapeHtml(feature.id)}"
                    data-ability-id="${escapeHtml(ability.id)}"
                    data-delta="1"
                    ${pointsUsed >= 2 || scoreForCap >= DEFAULT_FEAT_ABILITY_SCORE_MAXIMUM ? "disabled" : ""}
                    aria-label="Increase ${escapeHtml(ability.name)}"
                  >+</button>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `
      : state.mode === "feat"
        ? `
          <div class="hg-character-field">
            ${selectedFeat
              ? `
                <div class="hg-character-current-choice">
                  <b>Current Choice:</b>
                  Feat: ${escapeHtml(selectedFeat.name)}
                  <br>${escapeHtml(selectedFeat.summary || "")}
                  <br><span class="small">${escapeHtml(selectedFeat.description || "")}</span>
                  <ul class="small">
                    ${(Array.isArray(selectedFeat.effects) ? selectedFeat.effects : [])
                      .map((effect) => {
                        return `<li>${escapeHtml(formatSection12FeatEffect(effect))}</li>`;
                      })
                      .join("")}
                  </ul>
                  ${renderSection12FeatChoices(feature, state, selectedFeat)}
                </div>
              `
              : `
                <div class="hg-character-current-choice">
                  <b>Current Choice:</b> Pending feat choice.
                </div>
              `}

            <details
              class="hg-feat-picker-panel"
              data-cc-asi-feat-picker="true"
              data-feature-id="${escapeHtml(feature.id)}"
              ${selectedFeat ? "" : "open"}
            >
              <summary>
                ${selectedFeat ? "Change Feat" : "Choose Feat"}
              </summary>

              <div class="hg-feat-picker-toolbar">
                <label for="ccFeatSearch-${escapeHtml(feature.id)}">
                  Search Feats
                </label>

                <input
                  id="ccFeatSearch-${escapeHtml(feature.id)}"
                  type="search"
                  placeholder="Search by feat name or description..."
                  data-cc-action-input="filter-asi-feats"
                  data-feature-id="${escapeHtml(feature.id)}"
                  autocomplete="off"
                >
              </div>

              <div class="hg-feat-picker-scroll">
                <div class="hg-character-choice-grid">
                  ${DEFAULT_FEATS
                    .filter((feat) => {
                      return feat.id !==
                        "ability-score-improvement";
                    })
                    .map((feat) => {
                const prerequisite = getFeatPrerequisiteResult(
                  feat,
                  creatorState.draft,
                  { featureId: feature.id }
                );
                const selected = state.featId === feat.id;
                const alreadySelected =
                  !selected &&
                  prerequisite.reasons.includes(
                    "Already selected in another advancement slot"
                  );
                const prerequisiteFailed =
                  !selected &&
                  !alreadySelected &&
                  !prerequisite.met;
                const buttonLabel =
                  selected
                    ? "Selected"
                    : alreadySelected
                      ? "Already selected"
                      : prerequisiteFailed
                        ? "Prerequisite not met"
                        : "Choose Feat";
                const searchText = [
                  feat.name,
                  feat.summary,
                  feat.description,
                  ...(Array.isArray(feat.tags) ? feat.tags : [])
                ].join(" ").toLowerCase();

                return `
                  <article
                    class="hg-character-choice-card ${selected ? "selected" : ""} ${alreadySelected || prerequisiteFailed ? "unavailable" : ""}"
                    data-cc-feat-option="true"
                    data-feat-search-text="${escapeHtml(searchText)}"
                  >
                    <h3>${escapeHtml(feat.name)}</h3>

                    <p>
                      ${escapeHtml(feat.summary || "No summary provided.")}
                    </p>

                    <p class="small">
                      ${escapeHtml(feat.description || "No description provided.")}
                      <br><b>Prerequisite:</b>
                      ${escapeHtml(getFeatPrerequisiteLabel(feat, { featureId: feature.id }))}
                      ${prerequisite.settingRequirements.length
                        ? `<br><b>Setting:</b> ${escapeHtml(
                            `${prerequisite.settingRequirements.join(", ")} (advisory; not enforced)`
                          )}`
                        : ""}
                      ${feat.repeatable === true ? "<br><b>Repeatable:</b> Yes" : ""}
                    </p>

                    ${
                      alreadySelected ||
                      prerequisiteFailed
                        ? `
                          <p class="small hg-feat-option-status">
                            ${escapeHtml(buttonLabel)}
                          </p>
                        `
                        : ""
                    }

                    <div class="hg-character-card-actions">
                      <button
                        type="button"
                        data-cc-action="choose-asi-feat"
                        data-feature-id="${escapeHtml(feature.id)}"
                        data-feat-id="${escapeHtml(feat.id)}"
                        ${selected || alreadySelected || prerequisiteFailed ? "disabled" : ""}
                      >
                        ${buttonLabel}
                      </button>
                    </div>
                  </article>
                `;
                  }).join("")}
                </div>
              </div>

              <div
                class="hg-character-placeholder"
                data-cc-feat-no-results="true"
                hidden
              >
                No feats match that search.
              </div>
            </details>
          </div>
        `
        : ""}
  `;
}

function renderSection12AsiChoice(feature) {
  return renderSection12CompactAsiChoice(
    feature
  );
}


function handleSection12AsiAction(
  action,
  ...values
) {
  const button = findSection12ActionElement(...values);
  const featureId = button?.dataset?.featureId || "";
  let changed = false;

  if (action === "mode") {
    changed = setSection12AsiMode(
      featureId,
      button?.dataset?.mode || ""
    );
  }

  if (action === "ability") {
    changed = adjustSection12AsiAbility(
      featureId,
      button?.dataset?.abilityId || "",
      button?.dataset?.delta || 0
    );
  }

  if (changed) {
    setStatus("ASI / feat choice updated.");
    renderCreatorView();
  }
}

function handleSection12AsiChange({ target }) {
  if (
    target?.dataset
      ?.ccActionChange ===
      "set-feat-rest-choice"
  ) {
    if (
      setFeatRestChoice(
        target.dataset
          .restChoiceId ||
          "",
        target.value
      )
    ) {
      setStatus(
        "Feat rest choice updated."
      );
      renderCreatorView();
    }

    return true;
  }

  if (
    target?.dataset?.ccActionChange === "set-asi-feat-choice"
  ) {
    const selectedValues = target.multiple
      ? [...target.selectedOptions].map((option) => option.value)
      : target.tagName === "INPUT"
        ? cleanString(target.value)
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        : [target.value].filter(Boolean);

    if (
      setSection12FeatChoiceValues(
        target.dataset.featureId || "",
        target.dataset.choiceId || "",
        selectedValues
      )
    ) {
      setStatus("Feat choice updated.");
      renderCreatorView();
    } else {
      setStatus("That feat choice is unavailable or already used.");
    }

    return true;
  }

  if (
    target?.dataset?.ccActionChange !== "choose-asi-feat"
  ) {
    return false;
  }

  if (
    setSection12AsiFeat(
      target.dataset.featureId || "",
      target.value
    )
  ) {
    setStatus("ASI feat choice updated.");
    renderCreatorView();
  }

  return true;
}

function handleSection12ChooseAsiFeat(...values) {
  const button = findSection12ActionElement(...values);

  if (
    setSection12AsiFeat(
      button?.dataset?.featureId || "",
      button?.dataset?.featId || ""
    )
  ) {
    setStatus("ASI feat choice updated.");
    renderCreatorView();
  }
}

function applySection12FeatSearch(
  picker,
  rawQuery
) {
  if (
    !picker ||
    picker.isConnected === false
  ) {
    return;
  }

  const query = cleanString(rawQuery).toLowerCase();
  const featOptions = [
    ...picker.querySelectorAll("[data-cc-feat-option]")
  ];
  let visibleCount = 0;

  featOptions.forEach((option) => {
    const matches = !query || cleanString(
      option.dataset.featSearchText
    ).includes(query);

    option.hidden = !matches;

    if (matches) {
      visibleCount += 1;
    }
  });

  const noResults = picker.querySelector(
    "[data-cc-feat-no-results]"
  );

  if (noResults) {
    noResults.hidden = visibleCount > 0;
  }
}

function handleSection12FeatSearch({ target }) {
  if (
    target?.dataset?.ccActionInput !== "filter-asi-feats"
  ) {
    return false;
  }

  const picker = target.closest(
    "[data-cc-asi-feat-picker]"
  );

  if (!picker) {
    return true;
  }

  if (
    featSearchTimerId &&
    typeof clearTimeout === "function"
  ) {
    clearTimeout(featSearchTimerId);
  }

  const query = target.value;

  if (typeof setTimeout !== "function") {
    applySection12FeatSearch(picker, query);
    return true;
  }

  featSearchTimerId = setTimeout(() => {
    featSearchTimerId = null;
    applySection12FeatSearch(picker, query);
  }, CREATOR_FEAT_SEARCH_DEBOUNCE_MS);

  return true;
}


  function renderStep(character = creatorState.draft) {
    return getUnlockedFeatChoiceSlots(character)
      .map((slot) => {
        return renderSection12AsiChoice({
          ...slot,
          level: slot.classLevel
        });
      })
      .join("");
  }

  async function handleStepClick(context) {
    const action = cleanString(context?.action);

    switch (action) {
      case "set-asi-mode":
        handleSection12AsiAction("mode", context);
        return true;
      case "adjust-asi-ability":
        handleSection12AsiAction("ability", context);
        return true;
      case "choose-asi-feat":
        handleSection12ChooseAsiFeat(context);
        return true;
      default:
        return false;
    }
  }

  function handleStepInput(context) {
    return handleSection12FeatSearch(context);
  }

  function handleStepChange(context) {
    return handleSection12AsiChange(context);
  }

  function getStepWarnings(character = creatorState.draft) {
    const warnings = [];

    getUnlockedFeatChoiceSlots(character)
      .forEach((slot) => {
        const state = getSection12AsiChoiceState(slot.id);
        const label = slot.label ||
          `${slot.className || "Class"} level ${slot.classLevel}`;

        if (!state.mode) {
          warnings.push(`${label} needs an ASI or feat choice.`);
          return;
        }

        if (state.mode === "asi") {
          if (state.abilities.length !== 2) {
            warnings.push(`${label} needs two ability-score increases.`);
          }
          return;
        }

        const feat = DEFAULT_FEATS.find((entry) => {
          return entry.id === state.featId;
        });

        if (!feat) {
          warnings.push(`${label} needs a feat selection.`);
          return;
        }

        const prerequisite = getFeatPrerequisiteResult(
          feat,
          character,
          { featureId: slot.id }
        );

        prerequisite.reasons.forEach((reason) => {
          warnings.push(`${feat.name}: ${reason}.`);
        });

        (Array.isArray(feat.choices) ? feat.choices : [])
          .forEach((choice) => {
            const required = getSection12FeatChoiceLimit(choice);
            const selected = uniqueCleanArray(
              state.featChoices?.[choice.id]
            ).length;

            if (selected < required) {
              warnings.push(
                `${feat.name} still needs ${choice.label || choice.id} (${selected}/${required}).`
              );
            }
          });
      });

    warnings.push(
      ...getFeatSpellcastingValidationWarnings(character)
    );

    return [...new Set(warnings)];
  }

  function validateStep(character = creatorState.draft) {
    const blockingErrors = getStepWarnings(character);
    return {
      valid: blockingErrors.length === 0,
      blockingErrors,
      reminders: []
    };
  }

  function normalizeStepData(character) {
    return character;
  }

  function isStepComplete(character = creatorState.draft) {
    return getStepWarnings(character).length === 0;
  }

  return Object.freeze({
    id: "feats",
    actions: FEATS_STEP_ACTIONS,
    renderStep,
    handleStepClick,
    handleStepInput,
    handleStepChange,
    validateStep,
    normalizeStepData,
    getStepWarnings,
    isStepComplete,
    compatibility: Object.freeze({
      formatSection12FeatEffect,
      renderSection12FeatChoices,
      renderSection12CompactAsiChoice,
      renderSection12AsiChoice,
      handleSection12AsiAction,
      handleSection12AsiChange,
      handleSection12ChooseAsiFeat,
      handleSection12FeatSearch
    })
  });
}
