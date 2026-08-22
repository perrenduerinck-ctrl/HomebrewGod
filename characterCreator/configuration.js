export const BUILDER_STEPS = Object.freeze([
  {
    id: "basics",
    label: "Character Basics",
    shortLabel: "Basics",
    description: "Name, portrait, identity, appearance, and general character details.",
    required: true
  },
  {
    id: "class",
    label: "Class",
    shortLabel: "Class",
    description: "Choose a class from default, room, or imported templates.",
    required: true
  },
  {
    id: "background",
    label: "Background",
    shortLabel: "Background",
    description: "Choose or create a background and its narrative details.",
    required: false
  },
  {
    id: "species",
    label: "Species / Race",
    shortLabel: "Species",
    description: "Choose an ancestry template and make any ancestry-based choices.",
    required: true
  },
  {
    id: "abilities",
    label: "Ability Scores",
    shortLabel: "Abilities",
    description: "Use manual entry, standard array, point buy, or rolled scores.",
    required: true
  },
  {
    id: "equipment",
    label: "Equipment",
    shortLabel: "Equipment",
    description: "Choose starting gear and manage inventory and currency.",
    required: false
  },
  {
    id: "spells",
    label: "Spells / Features",
    shortLabel: "Spells",
    description: "Review class features, ancestry traits, spells, and custom abilities.",
    required: false
  },
  {
    id: "review",
    label: "Review Sheet",
    shortLabel: "Review",
    description: "Review calculated values, warnings, and unfinished selections.",
    required: true
  },
  {
    id: "save",
    label: "Save / Export / Token",
    shortLabel: "Finish",
    description: "Save, finalize, back up, and create a character-linked token.",
    required: true
  }
]);

export const BUILDER_STEP_INDEX = new Map(
  BUILDER_STEPS.map((step, index) => [
    step.id,
    index
  ])
);

export function getStepById(stepId) {
  return (
    BUILDER_STEPS.find(
      (step) => step.id === stepId
    ) || BUILDER_STEPS[0]
  );
}

export function getExactBuilderStepById(
  stepId
) {
  const cleanStepId = String(
    stepId || ""
  ).trim();

  return (
    BUILDER_STEPS.find(
      (step) => step.id === cleanStepId
    ) || null
  );
}

export function getStepIndex(stepId) {
  return BUILDER_STEP_INDEX.has(stepId)
    ? BUILDER_STEP_INDEX.get(stepId)
    : 0;
}

export function clampStepIndex(index) {
  const number = Number(index);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      BUILDER_STEPS.length - 1,
      Math.round(number)
    )
  );
}
