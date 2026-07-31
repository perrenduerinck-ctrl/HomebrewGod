import {
  MOVEMENT_SPEED_TYPES,
  normalizeMovementSpeed
} from "./walkingSpeed.js?v=custom-movement-speeds-20260731";

const MOVEMENT_INPUT_IDS = Object.freeze({
  walk: "ccCustomClassWalkSpeed",
  climb: "ccCustomClassClimbSpeed",
  swim: "ccCustomClassSwimSpeed",
  fly: "ccCustomClassFlySpeed",
  burrow: "ccCustomClassBurrowSpeed"
});

const MOVEMENT_DEFAULTS = Object.freeze({
  walk: 30,
  climb: 0,
  swim: 0,
  fly: 0,
  burrow: 0
});

export function getClassTemplateMovementSpeed(
  template,
  movement
) {
  const effects = (
    Array.isArray(template?.effects)
      ? template.effects
      : []
  );
  const effect =
    effects.find((candidate) => {
      return (
        String(candidate?.type || "") ===
          "speedBonus" &&
        String(candidate?.mode || "") ===
          "replace" &&
        String(
          candidate?.movement || "walk"
        ).toLowerCase() === movement
      );
    }) ||
    effects.find((candidate) => {
      return (
        String(candidate?.type || "") ===
          "speedBonus" &&
        String(
          candidate?.movement || "walk"
        ).toLowerCase() === movement
      );
    });

  return normalizeMovementSpeed(
    effect?.value,
    MOVEMENT_DEFAULTS[movement] ?? 0
  );
}

export function readCustomClassMovementEffects(
  getElementById
) {
  return Object.entries(
    MOVEMENT_INPUT_IDS
  ).flatMap(([movement, inputId]) => {
    const value = normalizeMovementSpeed(
      getElementById(inputId)?.value,
      MOVEMENT_DEFAULTS[movement] ?? 0
    );

    return value > 0
      ? [{
          type: "speedBonus",
          mode: "replace",
          movement,
          value
        }]
      : [];
  });
}

export function renderCustomClassMovementFields({
  template,
  wizardField
}) {
  const labels = {
    walk: "Walking",
    climb: "Climbing",
    swim: "Swimming",
    fly: "Flying",
    burrow: "Burrowing"
  };

  return MOVEMENT_SPEED_TYPES.map(
    (movement) => {
      return wizardField(
        `${labels[movement]} Speed`,
        MOVEMENT_INPUT_IDS[movement],
        getClassTemplateMovementSpeed(
          template,
          movement
        ),
        {
          type: "number",
          valueType: "integer",
          extra:
            'min="0" max="100" step="1"'
        }
      );
    }
  ).join("");
}

export async function deleteSelectedRoomClass({
  deps,
  isDm,
  roomCode,
  collectionName,
  documentId,
  selectedDocumentId,
  roomClassCache,
  confirmDelete
}) {
  if (!isDm) {
    throw new Error(
      "Only the room DM can delete a custom class."
    );
  }

  const selectedTemplate =
    roomClassCache.find((template) => {
      return String(
        template?.docId || ""
      ) === documentId;
    });

  if (
    !selectedTemplate ||
    selectedDocumentId !== documentId
  ) {
    throw new Error(
      "Select the exact room class before deleting it."
    );
  }

  const name = String(
    selectedTemplate.name ||
    "Unnamed Class"
  ).trim();
  const confirmed = confirmDelete(
    `Delete the custom class "${name}" from this room?\n\nCharacters already using it keep their saved class snapshot.`
  );

  if (!confirmed) {
    return {
      deleted: false,
      name,
      cache: roomClassCache
    };
  }

  await deps.deleteDoc(
    deps.doc(
      deps.db,
      "rooms",
      roomCode,
      collectionName,
      documentId
    )
  );

  return {
    deleted: true,
    name,
    cache: roomClassCache.filter(
      (template) => {
        return String(
          template?.docId || ""
        ) !== documentId;
      }
    )
  };
}
