import test from "node:test";
import assert from "node:assert/strict";
import { createBasicsStep } from "../characterCreator/steps/basicsStep.js";

function createTestStep() {
  const creatorState = {
    draft: {
      identity: {
        name: "Mira",
        pronouns: "she/her",
        alignment: "Neutral Good",
        deity: "Mystra",
        age: "29",
        size: "small",
        appearance: "Silver hair"
      },
      notes: "Carries a blue journal"
    }
  };

  const step = createBasicsStep({
    beginnerNote: (title, body) => (
      `<aside>${title}: ${body}</aside>`
    ),
    createEmptyCharacter: () => ({
      identity: {
        name: "",
        pronouns: "",
        alignment: "",
        deity: "",
        age: "",
        size: "medium",
        appearance: "",
        image: { url: "", publicId: "" }
      }
    }),
    getCreatorState: () => creatorState,
    getSafeCharacterName: (
      character = creatorState.draft
    ) => String(character?.identity?.name || "").trim(),
    renderDescriptionAppearanceField: () => (
      '<field id="ccAppearance"></field>'
    ),
    renderDescriptionNameField: () => (
      '<field id="ccCharacterName"></field>'
    ),
    renderDescriptionNotesField: () => (
      '<field id="ccGeneralNotes"></field>'
    ),
    renderSection11PortraitPanel: () => (
      '<field id="ccPortraitUrl"></field>'
    ),
    safeDisplayString: (value, fallback = "") => (
      String(value ?? fallback)
    ),
    wizardField: (label, id, value, options = {}) => (
      `<field id="${id}" path="${options.path || ""}" value="${value}">${label}</field>`
    ),
    wizardSelect: (
      label,
      id,
      value,
      choices,
      options = {}
    ) => (
      `<select id="${id}" path="${options.path || ""}" value="${value}">${label}:${choices.map((choice) => `${choice.value}:${choice.label}`).join("|")}</select>`
    )
  });

  return { creatorState, step };
}

test("Basics renders the existing identity fields in their original order", () => {
  const { step } = createTestStep();
  const html = step.renderStep();
  const fieldIds = [
    "ccPortraitUrl",
    "ccCharacterName",
    "ccPronouns",
    "ccAlignment",
    "ccDeity",
    "ccAge",
    "ccIdentitySize",
    "ccAppearance",
    "ccGeneralNotes"
  ];

  fieldIds.reduce((previousIndex, fieldId) => {
    const fieldIndex = html.indexOf(`id="${fieldId}"`);
    assert.ok(fieldIndex > previousIndex, `${fieldId} should retain its position`);
    return fieldIndex;
  }, -1);

  assert.match(html, /path="identity\.pronouns"/);
  assert.match(html, /path="identity\.alignment"/);
  assert.match(html, /path="identity\.deity"/);
  assert.match(html, /path="identity\.age"/);
  assert.match(html, /path="identity\.size"/);
  assert.match(html, /value="small"/);
});

test("Basics exposes every supported size with the existing labels", () => {
  const { step } = createTestStep();

  assert.deepEqual(step.compatibility.getSizeChoices(), [
    { value: "tiny", label: "Tiny" },
    { value: "small", label: "Small" },
    { value: "medium", label: "Medium" },
    { value: "large", label: "Large" },
    { value: "huge", label: "Huge" },
    { value: "gargantuan", label: "Gargantuan" }
  ]);
});

test("Basics keeps the existing character-name completion rule", () => {
  const { creatorState, step } = createTestStep();

  assert.equal(step.isStepComplete(), true);
  assert.deepEqual(step.getStepWarnings(), []);

  creatorState.draft.identity.name = "";
  assert.equal(step.isStepComplete(), false);
  assert.deepEqual(step.getStepWarnings(), [
    "Character name is missing."
  ]);
  assert.deepEqual(step.validateStep(), {
    valid: false,
    blockingErrors: ["Character name is missing."],
    reminders: []
  });
});

test("Basics implements the standard passive step interface", () => {
  const { step } = createTestStep();

  assert.equal(step.id, "basics");
  assert.deepEqual(step.actions, []);
  assert.equal(step.handleStepClick({}), false);
  assert.equal(step.handleStepInput({}), false);
  assert.equal(step.handleStepChange({}), false);
  assert.equal(step.compatibility.renderBasicsStep, step.renderStep);
  assert.equal(
    step.compatibility.isSection17BasicsComplete,
    step.isStepComplete
  );
  assert.equal(Object.isFrozen(step), true);
});

test("Basics normalization restores only a missing identity object", () => {
  const { step } = createTestStep();
  const character = { identity: null, notes: "Keep me" };

  assert.equal(step.normalizeStepData(character), character);
  assert.equal(character.identity.size, "medium");
  assert.equal(character.notes, "Keep me");
  assert.equal(step.normalizeStepData(null), null);
});
