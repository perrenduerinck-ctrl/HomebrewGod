import test from "node:test";
import assert from "node:assert/strict";
import { createDescriptionStep } from "../characterCreator/steps/descriptionStep.js";

function createTestStep() {
  let changed = 0;
  let rendered = 0;
  const statuses = [];
  const deletedPortraits = [];
  const creatorState = {
    busyAction: "",
    currentCharacterId: "character-1",
    draft: {
      identity: {
        name: "Mira",
        appearance: "Silver hair",
        image: {
          url: "https://example.com/mira.png",
          publicId: "portrait-old"
        }
      },
      background: {
        traits: "Curious",
        ideals: "Knowledge",
        bonds: "The old library",
        flaws: "Reckless",
        backstory: "Raised by sages"
      },
      notes: "Carries a blue journal"
    }
  };

  const normalizeImage = (value, fallback = {}) => {
    if (typeof value === "string") {
      return { url: value.trim(), publicId: "" };
    }
    return {
      url: String(value?.url || fallback?.imageUrl || "").trim(),
      publicId: String(value?.publicId || fallback?.imagePublicId || "").trim()
    };
  };

  const step = createDescriptionStep({
    $: () => null,
    SECTION11_EMBEDDED_PORTRAIT_MAX_BYTES: 512 * 1024,
    SECTION11_UPLOADED_PORTRAIT_MAX_BYTES: 8 * 1024 * 1024,
    applyCompatibilityAliases: () => {},
    beginCharacterBusyAction: () => true,
    beginnerNote: (title, body) => `<aside>${title}: ${body}</aside>`,
    cleanString: (value, fallback = "") => String(value ?? fallback).trim(),
    createEmptyCharacter: () => ({
      identity: {
        name: "",
        appearance: "",
        image: { url: "", publicId: "" }
      }
    }),
    deleteCharacterPortrait: async (publicId) => {
      deletedPortraits.push(publicId);
    },
    endCharacterBusyAction: () => {},
    escapeHtml: (value) => String(value ?? ""),
    getCreatorState: () => creatorState,
    getRoomCode: () => "ROOM",
    getSafeCharacterName: (character = creatorState.draft) => (
      String(character?.identity?.name || "").trim()
    ),
    isCharacterCreatorBusy: () => false,
    markDraftChanged: () => {
      changed += 1;
    },
    normalizeCharacterImageValue: normalizeImage,
    renderCreatorView: () => {
      rendered += 1;
    },
    safeDisplayString: (value, fallback = "") => String(value ?? fallback),
    safeNumber: (value, fallback = 0) => (
      Number.isFinite(Number(value)) ? Number(value) : fallback
    ),
    setStatus: (message) => {
      statuses.push(message);
    },
    wizardField: (label, id, value, options = {}) => (
      `<label data-id="${id}" data-path="${options.path || ""}">${label}:${value}</label>`
    )
  });

  return {
    creatorState,
    deletedPortraits,
    getChangedCount: () => changed,
    getRenderedCount: () => rendered,
    statuses,
    step
  };
}

test("Description module owns all requested description fields without adding a screen", () => {
  const { step } = createTestStep();
  const html = step.renderStep();

  [
    "Character Name",
    "Appearance / Identity Notes",
    "Personality Traits",
    "Ideals",
    "Bonds",
    "Flaws",
    "Backstory",
    "General Notes",
    "Portrait Image URL"
  ].forEach((label) => assert.match(html, new RegExp(label)));

  assert.equal(step.id, "description");
  assert.deepEqual(step.actions, [
    "set-portrait-url",
    "remove-portrait"
  ]);
  assert.equal(step.handleStepClick({ action: "unknown" }), false);
  assert.equal(step.handleStepInput({ target: {} }), false);
  assert.equal(Object.isFrozen(step), true);
});

test("Description portrait updates and cleanup preserve the character image data path", async () => {
  const {
    creatorState,
    deletedPortraits,
    getChangedCount,
    getRenderedCount,
    step
  } = createTestStep();
  const api = step.compatibility;

  assert.equal(
    await api.replaceSection11Portrait(
      { url: "https://example.com/new.png", publicId: "portrait-new" },
      "Portrait updated."
    ),
    true
  );
  assert.deepEqual(creatorState.draft.identity.image, {
    url: "https://example.com/new.png",
    publicId: "portrait-new"
  });
  assert.deepEqual(deletedPortraits, ["portrait-old"]);
  assert.equal(getChangedCount(), 1);
  assert.equal(getRenderedCount(), 1);

  assert.equal(await api.removeSection11Portrait(), true);
  assert.deepEqual(creatorState.draft.identity.image, {
    url: "",
    publicId: ""
  });
  assert.deepEqual(deletedPortraits, ["portrait-old", "portrait-new"]);
});

test("Description validation requires only the existing character-name rule", () => {
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

test("Description normalization keeps existing identity, story, notes, and image fields", () => {
  const { step } = createTestStep();
  const character = {
    identity: {
      name: "Tarin",
      appearance: "Green cloak",
      image: "https://example.com/tarin.png"
    },
    background: {
      traits: "Patient",
      ideals: "Duty",
      bonds: "Home",
      flaws: "Stubborn",
      backstory: "A former guard"
    },
    notes: "Keeps watch"
  };

  assert.equal(step.normalizeStepData(character), character);
  assert.deepEqual(character.identity.image, {
    url: "https://example.com/tarin.png",
    publicId: ""
  });
  assert.equal(character.background.backstory, "A former guard");
  assert.equal(character.notes, "Keeps watch");
});
