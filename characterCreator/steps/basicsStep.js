const BASICS_STEP_ACTIONS = Object.freeze([]);

export function createBasicsStep(dependencies = {}) {
  const {
    beginnerNote,
    createEmptyCharacter,
    getCreatorState,
    getSafeCharacterName,
    renderDescriptionAppearanceField,
    renderDescriptionNameField,
    renderDescriptionNotesField,
    renderSection11PortraitPanel,
    safeDisplayString,
    wizardField,
    wizardSelect
  } = dependencies;

  const creatorState = getCreatorState();

  function getSizeChoices() {
    return [
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
  }

  function renderStep() {
    const identity =
      creatorState.draft.identity;

    return `
      ${beginnerNote(
        "Character Identity",
        "Start with who your character is. Name, age, pronouns, deity, and appearance are mostly story details. Size can matter for some rules, but most player characters are Small or Medium."
      )}

      <div class="hg-character-field-grid">
        ${renderSection11PortraitPanel()}

        ${renderDescriptionNameField()}

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
          getSizeChoices(),
          {
            path: "identity.size"
          }
        )}

        ${renderDescriptionAppearanceField()}

        ${renderDescriptionNotesField()}
      </div>
    `;
  }

  function handleStepClick() {
    return false;
  }

  function handleStepInput() {
    return false;
  }

  function handleStepChange() {
    return false;
  }

  function getStepWarnings(
    character = creatorState.draft
  ) {
    return getSafeCharacterName(character)
      ? []
      : ["Character name is missing."];
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
    if (!character || typeof character !== "object") {
      return character;
    }

    character.identity =
      character.identity &&
      typeof character.identity === "object"
        ? character.identity
        : { ...createEmptyCharacter().identity };

    return character;
  }

  function isStepComplete(
    character = creatorState.draft
  ) {
    return getStepWarnings(character).length === 0;
  }

  return Object.freeze({
    id: "basics",
    actions: BASICS_STEP_ACTIONS,
    renderStep,
    handleStepClick,
    handleStepInput,
    handleStepChange,
    validateStep,
    normalizeStepData,
    getStepWarnings,
    isStepComplete,
    compatibility: Object.freeze({
      getSizeChoices,
      renderBasicsStep: renderStep,
      isSection17BasicsComplete: isStepComplete
    })
  });
}
