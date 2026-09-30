import {
  magicItemToInventoryCopy,
  normalizeMagicItem
} from "../items/magicItemModel.js";

function clean(value) {
  return String(value ?? "").trim();
}

function copy(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

function characterIdOf(character) {
  return clean(
    character?.id ||
    character?.docId ||
    character?.firestoreDocumentId
  );
}

function withInventory(character) {
  const source = character && typeof character === "object"
    ? copy(character)
    : {};

  source.equipment = source.equipment && typeof source.equipment === "object"
    ? source.equipment
    : {};
  source.equipment.items = Array.isArray(source.equipment.items)
    ? source.equipment.items
    : [];

  return source;
}

function defaultInventoryId() {
  return globalThis.crypto?.randomUUID?.() ||
    `inventory-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createLibraryInventoryItem(
  rawItem,
  {
    characterId = "",
    idFactory = defaultInventoryId,
    now = Date.now()
  } = {}
) {
  const item = normalizeMagicItem(rawItem);
  const inventoryItem = magicItemToInventoryCopy(item, {
    idFactory
  });

  return {
    ...inventoryItem,
    ownerCharacterId: clean(characterId),
    copiedFromLibraryItemId: item.id,
    librarySnapshotCreatedAtMillis: now
  };
}

export function addLibraryItemToCharacter(
  character,
  rawItem,
  options = {}
) {
  const next = withInventory(character);
  const inventoryItem = createLibraryInventoryItem(rawItem, {
    ...options,
    characterId:
      options.characterId || characterIdOf(next)
  });

  next.equipment.items.push(inventoryItem);

  return {
    character: next,
    inventoryItem: copy(inventoryItem)
  };
}

export function setCharacterInventoryItemState(
  character,
  itemId,
  property,
  value,
  { attunementLimit = 3 } = {}
) {
  const next = withInventory(character);
  const cleanItemId = clean(itemId);
  const item = next.equipment.items.find((entry) => {
    return clean(entry?.id) === cleanItemId;
  });

  if (!item) {
    throw new Error("That inventory item no longer exists.");
  }

  if (!["equipped", "attuned"].includes(property)) {
    throw new Error("Only equipped and attuned item states can be changed here.");
  }

  if (
    value === true &&
    (item.isContainer === true || clean(item.containerId))
  ) {
    throw new Error("Move the item out of its container before using it.");
  }

  if (property === "attuned" && value === true) {
    if (item.isMagical !== true || item.requiresAttunement !== true) {
      throw new Error("That item does not require attunement.");
    }

    const count = next.equipment.items.filter((entry) => {
      return (
        clean(entry?.id) !== cleanItemId &&
        entry?.attuned === true
      );
    }).length;

    if (count >= Math.max(0, Number(attunementLimit) || 0)) {
      throw new Error("This character has reached their attunement limit.");
    }
  }

  item[property] = value === true;

  return next;
}

export function transferCharacterInventoryItem({
  sourceCharacter,
  targetCharacter,
  itemId,
  quantity,
  idFactory = defaultInventoryId,
  now = Date.now()
} = {}) {
  const source = withInventory(sourceCharacter);
  const target = withInventory(targetCharacter);
  const sourceCharacterId = characterIdOf(source);
  const targetCharacterId = characterIdOf(target);

  if (!sourceCharacterId || !targetCharacterId) {
    throw new Error("Both saved characters are required for a transfer.");
  }

  if (sourceCharacterId === targetCharacterId) {
    throw new Error("Choose a different character for the transfer.");
  }

  const cleanItemId = clean(itemId);
  const sourceIndex = source.equipment.items.findIndex((entry) => {
    return clean(entry?.id) === cleanItemId;
  });

  if (sourceIndex < 0) {
    throw new Error("That inventory item is no longer on the source character.");
  }

  const sourceItem = source.equipment.items[sourceIndex];
  const childItems = source.equipment.items.filter((entry) => {
    return clean(entry?.containerId) === cleanItemId;
  });

  if (sourceItem.isContainer === true && childItems.length) {
    throw new Error("Move the container's contents out before transferring it.");
  }

  const availableQuantity = Math.max(1, Math.round(Number(sourceItem.quantity) || 1));
  const requestedQuantity = quantity === undefined || quantity === null || quantity === ""
    ? availableQuantity
    : Math.max(1, Math.round(Number(quantity) || 1));
  const transferredQuantity = Math.min(availableQuantity, requestedQuantity);
  const destinationItem = {
    ...copy(sourceItem),
    id: clean(idFactory()) || defaultInventoryId(),
    quantity: transferredQuantity,
    equipped: false,
    attuned: false,
    containerId: "",
    ownerCharacterId: targetCharacterId,
    copiedFromInventoryItemId: cleanItemId,
    transferredFromCharacterId: sourceCharacterId,
    transferredAtMillis: now
  };

  if (transferredQuantity >= availableQuantity) {
    source.equipment.items.splice(sourceIndex, 1);
  } else {
    source.equipment.items[sourceIndex] = {
      ...sourceItem,
      quantity: availableQuantity - transferredQuantity
    };
  }

  target.equipment.items.push(destinationItem);

  return {
    sourceCharacter: source,
    targetCharacter: target,
    transferredItem: copy(destinationItem)
  };
}

function snapshotData(snapshot) {
  return typeof snapshot?.data === "function"
    ? snapshot.data() || {}
    : snapshot?.data || {};
}

function snapshotExists(snapshot) {
  return typeof snapshot?.exists === "function"
    ? snapshot.exists()
    : snapshot?.exists !== false;
}

export function createCharacterItemTransferPersistence({
  db,
  doc,
  runTransaction,
  serverTimestamp,
  getRoomCode = () => "",
  getUserId = () => "",
  getIsDM = () => false,
  now = () => Date.now(),
  idFactory = defaultInventoryId
} = {}) {
  async function transfer({
    sourceCharacterId,
    targetCharacterId,
    itemId,
    quantity
  } = {}) {
    const roomCode = clean(getRoomCode()).toUpperCase();
    const userId = clean(getUserId());
    const sourceId = clean(sourceCharacterId);
    const targetId = clean(targetCharacterId);

    if (!roomCode || !userId) {
      throw new Error("Open a room and sign in before transferring items.");
    }

    if (
      typeof doc !== "function" ||
      typeof runTransaction !== "function"
    ) {
      throw new Error("Character transfer persistence is unavailable.");
    }

    const sourceRef = doc(db, "rooms", roomCode, "characters", sourceId);
    const targetRef = doc(db, "rooms", roomCode, "characters", targetId);

    return runTransaction(db, async (transaction) => {
      const [sourceSnapshot, targetSnapshot] = await Promise.all([
        transaction.get(sourceRef),
        transaction.get(targetRef)
      ]);

      if (!snapshotExists(sourceSnapshot) || !snapshotExists(targetSnapshot)) {
        throw new Error("One of those saved characters no longer exists.");
      }

      const sourceRecord = {
        ...copy(snapshotData(sourceSnapshot)),
        id: sourceId
      };
      const targetRecord = {
        ...copy(snapshotData(targetSnapshot)),
        id: targetId
      };
      const canEditSource = getIsDM() === true || clean(sourceRecord.ownerUid) === userId;
      const canEditTarget = getIsDM() === true || clean(targetRecord.ownerUid) === userId;

      if (!canEditSource || !canEditTarget) {
        throw new Error("You can only transfer between characters you can edit.");
      }

      const result = transferCharacterInventoryItem({
        sourceCharacter: sourceRecord,
        targetCharacter: targetRecord,
        itemId,
        quantity,
        idFactory,
        now: now()
      });
      const updatedAtMillis = now();
      const timestamp = typeof serverTimestamp === "function"
        ? serverTimestamp()
        : new Date(updatedAtMillis);

      transaction.update(sourceRef, {
        equipment: result.sourceCharacter.equipment,
        updatedAt: timestamp,
        updatedAtMillis
      });
      transaction.update(targetRef, {
        equipment: result.targetCharacter.equipment,
        updatedAt: timestamp,
        updatedAtMillis
      });

      return result;
    });
  }

  return Object.freeze({ transfer });
}
