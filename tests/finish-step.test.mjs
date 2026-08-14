import test from "node:test";
import assert from "node:assert/strict";
import { createFinishStep } from "../characterCreator/steps/finishStep.js";

function createTestStep(overrides = {}) {
  const calls = [];
  const state = {
    currentCharacterId: "character-1",
    dirty: false,
    draft: {
      builder: {
        status: "draft",
        lastSavedAtMillis: 1234
      },
      classProgression: {
        totalLevel: 3
      }
    }
  };

  const finalization = {
    canFinalize: true,
    blockingErrors: [],
    optionalWarnings: [],
    allIssues: []
  };

  const record = (name, result = true) => {
    return async () => {
      calls.push(name);
      return result;
    };
  };

  const step = createFinishStep({
    beginnerNote: (title, body) => `<aside>${title}: ${body}</aside>`,
    clampLevel: (value) => Math.max(1, Math.min(20, Number(value) || 1)),
    cleanString: (value) => String(value ?? "").trim(),
    escapeHtml: (value) => String(value ?? ""),
    formatSavedTime: () => "January 1, 2026",
    getCharacterBusyLabel: () => "Saving character",
    getCharacterPortraitUrl: () => "https://example.com/mira.png",
    getCreatorState: () => state,
    getFinalizationValidation: () => finalization,
    getRoomCode: () => "ABC-123",
    getSafeBackgroundName: () => "Sage",
    getSafeCharacterName: () => "Mira",
    getSafeClassName: () => "Wizard",
    getSafeSpeciesName: () => "Human",
    getSafeSubclassName: () => "Evoker",
    handleCopyJson: record("copy-json"),
    handleCreateLinkedToken: record("create-linked-token"),
    handleDownloadDraftBackup: record("download-draft-backup"),
    handleExportJson: record("export-json"),
    handleFinalize: record("finalize-character"),
    handleImportFile: record("import-json-file"),
    handleImportText: record("import-json-text"),
    handleSave: record("save-character"),
    handleSaveCopy: record("save-copy"),
    handleStepFileChange: record("change"),
    isCharacterCreatorBusy: () => false,
    isSaveComplete: (character) => Boolean(
      state.currentCharacterId &&
      state.dirty === false &&
      Number(character?.builder?.lastSavedAtMillis) > 0
    ),
    navigateToLibrary: () => {
      calls.push("library");
      return true;
    },
    openCharacterSheet: () => {
      calls.push("open-character-sheet");
      return true;
    },
    renderFinalizationWarnings: (validation) => {
      return validation.allIssues.length
        ? `<div>${validation.allIssues.join("|")}</div>`
        : "";
    },
    safeNumber: (value, fallback = 0) => {
      return Number.isFinite(Number(value))
        ? Number(value)
        : fallback;
    },
    tokenDependencies: {
      getCurrentIsDM: () => true,
      createCharacterLinkedToken: () => true
    },
    wizardField: (label, id) => `<textarea id="${id}" aria-label="${label}"></textarea>`,
    ...overrides
  });

  return {
    calls,
    finalization,
    state,
    step
  };
}

test("Finish renders the existing save, finalization, library, sheet, export, and import controls", () => {
  const { step } = createTestStep();
  const html = step.renderStep();

  [
    "Save Draft or Finalize",
    "Character Summary",
    "Character-Linked Token",
    "Export Character",
    "Import Character",
    'data-cc-action="save-character"',
    'data-cc-action="finalize-character"',
    'data-cc-action="save-copy"',
    'data-cc-action="library"',
    'data-cc-action="open-character-sheet"',
    'data-cc-action="copy-json"',
    'data-cc-action="export-json"',
    'data-cc-action="download-draft-backup"',
    'data-cc-action="create-linked-token"',
    'data-cc-action="import-json-text"',
    'data-cc-import-file="true"'
  ].forEach((contract) => {
    assert.match(html, new RegExp(contract));
  });

  assert.match(html, /Mira/);
  assert.match(html, /Human/);
  assert.match(html, /Level\s+3\s+Wizard/);
  assert.match(html, /Evoker/);
  assert.match(html, /Sage/);
  assert.match(html, /ABC-123/);
});

test("Finish routes every step action through its standard interface", async () => {
  const { calls, step } = createTestStep();

  for (const action of step.actions) {
    assert.equal(
      await step.handleStepClick({ action }),
      true,
      action
    );
  }

  assert.deepEqual(calls, [
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

  assert.equal(
    await step.handleStepClick({ action: "unknown" }),
    false
  );
  assert.equal(step.handleStepInput({}), false);
  assert.equal(await step.handleStepChange({ target: {} }), true);
  assert.equal(calls.at(-1), "change");
  assert.equal(Object.isFrozen(step), true);
});

test("Finish separates saved completion from finalization validation", () => {
  const { finalization, state, step } = createTestStep();

  assert.equal(step.isStepComplete(), true);
  assert.equal(step.validateStep().valid, true);
  assert.equal(step.validateStep().canFinalize, true);

  state.dirty = true;
  assert.equal(step.isStepComplete(), false);
  assert.equal(step.validateStep().valid, false);
  assert.match(step.renderStep(), /Browser autosave is temporary/);

  finalization.canFinalize = false;
  finalization.blockingErrors.push("Choose a class.");
  finalization.allIssues.push("Choose a class.");

  const validation = step.validateStep();
  assert.equal(validation.canFinalize, false);
  assert.deepEqual(validation.blockingErrors, ["Choose a class."]);
  assert.deepEqual(step.getStepWarnings(), ["Choose a class."]);
  assert.match(step.renderStep(), /1 blocking rule error/);
  assert.match(step.renderStep(), /Choose a class/);

  assert.equal(
    step.normalizeStepData(state.draft),
    state.draft
  );
});

test("Finish keeps linked-token readiness visible without changing character data", () => {
  const { state, step } = createTestStep({
    getCharacterPortraitUrl: () => "",
    tokenDependencies: {
      getCurrentIsDM: () => true,
      createCharacterLinkedToken: () => true
    }
  });

  const before = JSON.stringify(state.draft);
  const html = step.renderStep();

  assert.match(html, /Add and save a character portrait first/);
  assert.match(
    html,
    /data-cc-action="create-linked-token"\s+disabled/
  );
  assert.equal(JSON.stringify(state.draft), before);
});
