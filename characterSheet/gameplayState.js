// Play-session state is intentionally isolated from permanent character choices.
// These helpers mutate only the supplied character snapshot/draft.

import {
  countCharacterAttunedItems,
  getCharacterAttunementLimit
} from "../characterCreator/inventoryEquipment.js";

export const STANDARD_CONDITIONS = Object.freeze([
  "Blinded",
  "Charmed",
  "Deafened",
  "Exhaustion",
  "Frightened",
  "Grappled",
  "Incapacitated",
  "Invisible",
  "Paralyzed",
  "Petrified",
  "Poisoned",
  "Prone",
  "Restrained",
  "Stunned",
  "Unconscious"
]);

function isRecord(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function integer(value, fallback = 0, minimum = 0) {
  const number = Number(value);
  return Math.max(
    minimum,
    Math.round(Number.isFinite(number) ? number : fallback)
  );
}

function uniqueConditions(values) {
  const seen = new Set();

  return (Array.isArray(values) ? values : [])
    .map(cleanText)
    .filter((value) => {
      const key = value.toLowerCase();

      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

export function ensureGameplayState(character) {
  if (!isRecord(character)) {
    return null;
  }

  if (!isRecord(character.combat)) {
    character.combat = {};
  }

  const combat = character.combat;
  const maxHp = integer(
    combat.maxHp ?? character.maxHp,
    1,
    1
  );

  combat.maxHp = maxHp;
  combat.currentHp = Math.min(
    maxHp,
    integer(
      combat.currentHp ?? character.currentHp,
      maxHp,
      0
    )
  );
  combat.temporaryHp = integer(
    combat.temporaryHp,
    0,
    0
  );
  combat.inspiration =
    combat.inspiration === true;
  combat.conditions =
    uniqueConditions(combat.conditions);
  combat.deathSaves = {
    successes: Math.min(
      3,
      integer(
        combat.deathSaves?.successes,
        0,
        0
      )
    ),
    failures: Math.min(
      3,
      integer(
        combat.deathSaves?.failures,
        0,
        0
      )
    )
  };

  return combat;
}

function findInventoryItem(character, itemId, itemIndex) {
  const items =
    Array.isArray(character?.equipment?.items)
      ? character.equipment.items
      : [];
  const id = cleanText(itemId);
  const index = Number(itemIndex);

  if (id) {
    return items.find((item) => {
      return cleanText(item?.id) === id;
    }) || null;
  }

  return Number.isInteger(index) &&
    index >= 0 &&
    index < items.length
    ? items[index]
    : null;
}

function toggleEquipmentState(character, action) {
  const items =
    Array.isArray(character?.equipment?.items)
      ? character.equipment.items
      : [];
  const item = findInventoryItem(
    character,
    action.itemId,
    action.itemIndex
  );

  if (!item) {
    return {
      changed: false,
      message: "That inventory item is no longer available."
    };
  }

  if (action.type === "toggle-item-attuned") {
    if (
      item.isMagical !== true ||
      item.requiresAttunement !== true
    ) {
      return {
        changed: false,
        message: "This item does not require attunement."
      };
    }

    if (
      item.attuned !== true &&
      countCharacterAttunedItems(
        character
      ) >=
        getCharacterAttunementLimit(
          character
        )
    ) {
      const limit =
        getCharacterAttunementLimit(
          character
        );

      return {
        changed: false,
        message:
          `The attunement limit of ${limit} ` +
          `${limit === 1 ? "item is" : "items are"} already reached.`
      };
    }

    item.attuned = item.attuned !== true;

    return {
      changed: true,
      message: item.attuned
        ? `${cleanText(item.name) || "Item"} attuned.`
        : `${cleanText(item.name) || "Item"} is no longer attuned.`
    };
  }

  if (item.isContainer === true) {
    return {
      changed: false,
      message: "Containers cannot be equipped."
    };
  }

  if (cleanText(item.containerId)) {
    return {
      changed: false,
      message: "Move the item out of its container before equipping it."
    };
  }

  if (
    item.isShield === true &&
    item.equipped !== true &&
    items.some((candidate) => {
      return (
        candidate !== item &&
        candidate?.isShield === true &&
        candidate?.equipped === true &&
        !cleanText(candidate?.containerId)
      );
    })
  ) {
    return {
      changed: false,
      message: "Only one shield can be equipped at a time."
    };
  }

  item.equipped = item.equipped !== true;

  return {
    changed: true,
    message: item.equipped
      ? `${cleanText(item.name) || "Item"} equipped.`
      : `${cleanText(item.name) || "Item"} unequipped.`
  };
}

export function applyGameplayAction(character, action = {}) {
  const combat = ensureGameplayState(character);

  if (!combat) {
    return {
      changed: false,
      message: "Character gameplay data is unavailable."
    };
  }

  const amount = integer(action.amount, 0, 0);

  if (action.type === "damage") {
    if (amount <= 0) {
      return {
        changed: false,
        message: "Enter damage greater than zero."
      };
    }

    const absorbed = Math.min(
      combat.temporaryHp,
      amount
    );
    const remaining = amount - absorbed;
    combat.temporaryHp -= absorbed;
    combat.currentHp = Math.max(
      0,
      combat.currentHp - remaining
    );

    return {
      changed: true,
      message: `${amount} damage applied.`
    };
  }

  if (action.type === "heal") {
    if (amount <= 0) {
      return {
        changed: false,
        message: "Enter healing greater than zero."
      };
    }

    const next = Math.min(
      combat.maxHp,
      combat.currentHp + amount
    );
    const changed = next !== combat.currentHp;
    combat.currentHp = next;

    return {
      changed,
      message: changed
        ? `${amount} healing applied.`
        : "Hit points are already full."
    };
  }

  if (action.type === "set-current-hp") {
    const next = Math.min(
      combat.maxHp,
      integer(action.amount, combat.currentHp, 0)
    );
    const changed = next !== combat.currentHp;
    combat.currentHp = next;

    return {
      changed,
      message: changed
        ? "Current hit points updated."
        : "Current hit points were unchanged."
    };
  }

  if (action.type === "set-temp-hp") {
    const next = integer(
      action.amount,
      combat.temporaryHp,
      0
    );
    const changed =
      next !== combat.temporaryHp;
    combat.temporaryHp = next;

    return {
      changed,
      message: changed
        ? "Temporary hit points updated."
        : "Temporary hit points were unchanged."
    };
  }

  if (action.type === "toggle-inspiration") {
    combat.inspiration =
      combat.inspiration !== true;

    return {
      changed: true,
      message: combat.inspiration
        ? "Inspiration gained."
        : "Inspiration spent."
    };
  }

  if (action.type === "adjust-death-save") {
    const field =
      action.kind === "failure"
        ? "failures"
        : "successes";
    const next = Math.min(
      3,
      Math.max(
        0,
        combat.deathSaves[field] +
          Math.round(Number(action.delta) || 0)
      )
    );
    const changed =
      next !== combat.deathSaves[field];
    combat.deathSaves[field] = next;

    return {
      changed,
      message: changed
        ? "Death saves updated."
        : "Death saves were unchanged."
    };
  }

  if (action.type === "reset-death-saves") {
    const changed =
      combat.deathSaves.successes !== 0 ||
      combat.deathSaves.failures !== 0;
    combat.deathSaves = {
      successes: 0,
      failures: 0
    };

    return {
      changed,
      message: changed
        ? "Death saves reset."
        : "Death saves were already clear."
    };
  }

  if (action.type === "toggle-condition") {
    const condition = cleanText(action.condition);

    if (!condition) {
      return {
        changed: false,
        message: "Choose or enter a condition first."
      };
    }

    const key = condition.toLowerCase();
    const existingIndex =
      combat.conditions.findIndex((value) => {
        return value.toLowerCase() === key;
      });

    if (existingIndex >= 0) {
      combat.conditions.splice(existingIndex, 1);

      return {
        changed: true,
        message: `${condition} removed.`
      };
    }

    combat.conditions.push(condition);

    return {
      changed: true,
      message: `${condition} added.`
    };
  }

  if (
    action.type === "toggle-item-equipped" ||
    action.type === "toggle-item-attuned"
  ) {
    return toggleEquipmentState(
      character,
      action
    );
  }

  if (action.type === "long-rest-cleanup") {
    const changed =
      combat.deathSaves.successes !== 0 ||
      combat.deathSaves.failures !== 0;
    combat.deathSaves = {
      successes: 0,
      failures: 0
    };

    return {
      changed,
      message: "Long-rest gameplay state updated."
    };
  }

  return {
    changed: false,
    message: "Unknown character-sheet action."
  };
}
