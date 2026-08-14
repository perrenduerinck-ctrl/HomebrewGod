const FINISH_STEP_ACTIONS = Object.freeze([
  "save-character",
  "save-copy",
  "finalize-character",
  "create-linked-token",
  "library",
  "open-character-sheet",
  "copy-json",
  "export-json",
  "download-draft-backup",
  "import-json-file",
  "import-json-text"
]);

export function createFinishStep(dependencies = {}) {
  const {
    beginnerNote,
    clampLevel,
    cleanString,
    escapeHtml,
    formatSavedTime,
    getCharacterBusyLabel,
    getCharacterPortraitUrl,
    getCreatorState,
    getFinalizationValidation,
    getRoomCode,
    getSafeBackgroundName,
    getSafeCharacterName,
    getSafeClassName,
    getSafeSpeciesName,
    getSafeSubclassName,
    handleCopyJson,
    handleCreateLinkedToken,
    handleDownloadDraftBackup,
    handleExportJson,
    handleFinalize,
    handleImportFile,
    handleImportText,
    handleSave,
    handleSaveCopy,
    handleStepFileChange,
    isCharacterCreatorBusy,
    isSaveComplete,
    navigateToLibrary,
    openCharacterSheet,
    renderFinalizationWarnings,
    safeNumber,
    tokenDependencies = {},
    wizardField
  } = dependencies;

  const creatorState = getCreatorState();

  function renderSection18Warnings() {
    return renderFinalizationWarnings(
      getFinalizationValidation()
    );
  }

  function renderSection18BackupNotice() {
    if (creatorState.dirty !== true) {
      return "";
    }

    return `
      <div class="hg-character-warning">
        Browser autosave is temporary. Save this character to the room
        or download a JSON backup before closing, switching browsers,
        clearing site data, or using private browsing.
      </div>
    `;
  }

  function renderSection18LinkedTokenPanel({
    isBusy,
    busyLabel
  }) {
    const isDM =
      tokenDependencies.getCurrentIsDM
        ? tokenDependencies.getCurrentIsDM() === true
        : false;

    const hasSavedCharacter = Boolean(
      creatorState.currentCharacterId
    );

    const hasPortrait = Boolean(
      getCharacterPortraitUrl()
    );

    const tokenSystemReady =
      typeof tokenDependencies.createCharacterLinkedToken ===
      "function";

    const hasUnsavedChanges =
      creatorState.dirty === true;

    const unavailableReason =
      !tokenSystemReady
        ? "The token system is not connected."
        : !isDM
          ? "Only the room DM can create tokens."
          : !hasSavedCharacter
            ? "Save this character first."
            : hasUnsavedChanges
              ? "Save the latest character changes before creating its token."
              : !hasPortrait
                ? "Add and save a character portrait first."
                : "The token will be placed at the center of the active battle or puzzle map.";

    const disabled =
      isBusy ||
      !tokenSystemReady ||
      !isDM ||
      !hasSavedCharacter ||
      hasUnsavedChanges ||
      !hasPortrait;

    return `
      <hr>

      <h3>Character-Linked Token</h3>

      <p>
        The token copies this character's portrait, name, Armor Class,
        current and maximum HP, and size. The character sheet is the
        authoritative record; saving the character refreshes every linked
        token.
      </p>

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="create-linked-token"
          ${disabled ? "disabled" : ""}
        >
          ${
            isBusy
              ? `${busyLabel}...`
              : "Create Linked Token"
          }
        </button>
      </div>

      <p class="small">
        ${escapeHtml(unavailableReason)}
      </p>
    `;
  }

  function renderSaveStep() {
    const isExisting = Boolean(
      creatorState.currentCharacterId
    );

    const isBusy =
      isCharacterCreatorBusy();

    const busyLabel =
      getCharacterBusyLabel();

    const characterName =
      getSafeCharacterName() ||
      "Unnamed Character";

    const finalizationValidation =
      getFinalizationValidation();

    const isFinalized =
      cleanString(
        creatorState.draft
          ?.builder?.status
      ).toLowerCase() === "finalized";

    return `
      ${beginnerNote(
        "Save Draft or Finalize",
        "Save Draft stores incomplete work without rule checks. Finalize Character saves only after every blocking rule error is fixed. Optional warnings do not block finalization."
      )}

      ${renderSection18Warnings()}
      ${renderSection18BackupNotice()}

      <div class="hg-character-choice-grid">
        <article class="hg-character-choice-card selected">
          <h3>
            ${escapeHtml(characterName)}
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
              isBusy
                ? `${busyLabel}...`
                : creatorState.dirty
                ? "Unsaved changes"
                : "Saved"
            }

            <br>

            <b>Character Status:</b>

            ${
              isFinalized
                ? "Finalized"
                : "Draft"
            }

            <br>

            <b>Finalization Check:</b>

            ${
              finalizationValidation.canFinalize
                ? "Ready"
                : `${finalizationValidation.blockingErrors.length} blocking rule ${finalizationValidation.blockingErrors.length === 1 ? "error" : "errors"}`
            }

            <br>

            <b>Last Saved:</b>

            ${escapeHtml(
              formatSavedTime()
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

      <h3>Save Draft or Finalize Character</h3>

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="save-character"
          ${isBusy ? "disabled" : ""}
        >
          ${
            isBusy
              ? `${busyLabel}...`
              : isExisting
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
          data-cc-action="save-copy"
          ${isBusy ? "disabled" : ""}
        >
          ${
            isBusy
              ? `${busyLabel}...`
              : "Save as Draft Copy"
          }
        </button>

        <button
          type="button"
          data-cc-action="library"
        >
          Open Character Library
        </button>

        <button
          type="button"
          data-cc-action="open-character-sheet"
        >
          Open Character Sheet
        </button>
      </div>

      ${renderSection18LinkedTokenPanel({
        isBusy,
        busyLabel
      })}

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

        <button
          type="button"
          data-cc-action="download-draft-backup"
        >
          Download Draft Backup
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
            ${isBusy ? "disabled" : ""}
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

            extra:
              isBusy
                ? "disabled"
                : "",

            wide: true
          }
        )}
      </div>

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="import-json-text"
          ${isBusy ? "disabled" : ""}
        >
          ${
            isBusy
              ? `${busyLabel}...`
              : "Import Pasted JSON"
          }
        </button>
      </div>
    `;
  }

  function renderStep() {
    return renderSaveStep();
  }

  async function handleStepClick(context = {}) {
    switch (cleanString(context.action)) {
      case "save-character":
        return await handleSave(context);
      case "save-copy":
        return await handleSaveCopy(context);
      case "finalize-character":
        return await handleFinalize(context);
      case "create-linked-token":
        return await handleCreateLinkedToken(context);
      case "library":
        return navigateToLibrary();
      case "open-character-sheet":
        return openCharacterSheet();
      case "copy-json":
        return await handleCopyJson(context);
      case "export-json":
        return handleExportJson(context);
      case "download-draft-backup":
        return handleDownloadDraftBackup(context);
      case "import-json-file":
        return await handleImportFile(context);
      case "import-json-text":
        return handleImportText(context);
      default:
        return false;
    }
  }

  function handleStepInput() {
    return false;
  }

  async function handleStepChange(context = {}) {
    return await handleStepFileChange(context);
  }

  function validateStep(character = creatorState.draft) {
    const finalization =
      getFinalizationValidation();

    return {
      valid: isSaveComplete(character),
      canFinalize: finalization.canFinalize,
      blockingErrors:
        finalization.blockingErrors,
      reminders:
        finalization.optionalWarnings
    };
  }

  function normalizeStepData(character) {
    return character;
  }

  function getStepWarnings() {
    return getFinalizationValidation()
      .allIssues;
  }

  function isStepComplete(character = creatorState.draft) {
    return isSaveComplete(character);
  }

  function isSection18SaveComplete(character = creatorState.draft) {
    return isStepComplete(character);
  }

  return Object.freeze({
    id: "save",
    actions: FINISH_STEP_ACTIONS,
    renderStep,
    handleStepClick,
    handleStepInput,
    handleStepChange,
    validateStep,
    normalizeStepData,
    getStepWarnings,
    isStepComplete,
    compatibility: Object.freeze({
      renderSaveStep,
      renderSection18Warnings,
      renderSection18BackupNotice,
      renderSection18LinkedTokenPanel,
      isSection18SaveComplete
    })
  });
}
