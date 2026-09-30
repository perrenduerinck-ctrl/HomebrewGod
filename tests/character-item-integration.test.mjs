import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  addLibraryItemToCharacter,
  createCharacterItemTransferPersistence,
  setCharacterInventoryItemState,
  transferCharacterInventoryItem
} from "../characterCreator/itemLibraryIntegration.js";

function character(id, ownerUid = "user-1", items = []) {
  return {
    id,
    ownerUid,
    identity: { name: id },
    equipment: {
      currency: {},
      notes: "preserve me",
      items
    }
  };
}

function libraryItem(overrides = {}) {
  return {
    id: "ember-blade",
    name: "Ember Blade",
    itemType: "weapon",
    rarity: "rare",
    description: "A warm blade.",
    requiresAttunement: true,
    attunementRequirements: "By a fighter",
    charges: { maximum: 3, current: 2, recharge: "dawn" },
    effects: [{ id: "ember", name: "Ember", description: "Fire damage." }],
    ...overrides
  };
}

test("Library magic items become independent character inventory copies", () => {
  const sourceCharacter = character("hero");
  const originalItem = libraryItem();
  const beforeCharacter = structuredClone(sourceCharacter);
  const beforeItem = structuredClone(originalItem);
  const result = addLibraryItemToCharacter(sourceCharacter, originalItem, {
    idFactory: () => "inventory-copy",
    now: 50
  });

  assert.deepEqual(sourceCharacter, beforeCharacter);
  assert.deepEqual(originalItem, beforeItem);
  assert.equal(result.inventoryItem.id, "inventory-copy");
  assert.equal(result.inventoryItem.category, "weapon");
  assert.equal(result.inventoryItem.sourceLibraryItemId, "ember-blade");
  assert.equal(result.inventoryItem.ownerCharacterId, "hero");
  assert.equal(result.inventoryItem.attunementRequirements, "By a fighter");
  assert.equal(result.inventoryItem.equipped, false);
  assert.equal(result.inventoryItem.attuned, false);
  result.inventoryItem.effects[0].name = "Changed copy";
  assert.equal(originalItem.effects[0].name, "Ember");
});

test("character inventory copies equip, unequip, attune and unattune safely", () => {
  const added = addLibraryItemToCharacter(character("hero"), libraryItem(), {
    idFactory: () => "copy"
  }).character;
  const equipped = setCharacterInventoryItemState(
    added,
    "copy",
    "equipped",
    true
  );
  const attuned = setCharacterInventoryItemState(
    equipped,
    "copy",
    "attuned",
    true,
    { attunementLimit: 3 }
  );
  const unequipped = setCharacterInventoryItemState(
    attuned,
    "copy",
    "equipped",
    false
  );
  const unattuned = setCharacterInventoryItemState(
    unequipped,
    "copy",
    "attuned",
    false
  );

  assert.equal(equipped.equipment.items[0].equipped, true);
  assert.equal(attuned.equipment.items[0].attuned, true);
  assert.equal(unequipped.equipment.items[0].equipped, false);
  assert.equal(unattuned.equipment.items[0].attuned, false);
  assert.equal(added.equipment.items[0].equipped, false);

  assert.throws(() => {
    setCharacterInventoryItemState(
      character("full", "user-1", [
        { id: "one", attuned: true },
        { id: "two", isMagical: true, requiresAttunement: true, attuned: false }
      ]),
      "two",
      "attuned",
      true,
      { attunementLimit: 1 }
    );
  }, /attunement limit/i);
});

test("transfers create a new unequipped independent copy and preserve provenance", () => {
  const sourceItem = {
    id: "source-copy",
    name: "Ember Blade",
    quantity: 2,
    equipped: true,
    attuned: true,
    effects: [{ name: "Ember" }],
    sourceLibraryItemId: "ember-blade"
  };
  const source = character("hero-a", "user-1", [sourceItem]);
  const target = character("hero-b", "user-1", []);
  const result = transferCharacterInventoryItem({
    sourceCharacter: source,
    targetCharacter: target,
    itemId: "source-copy",
    quantity: 1,
    idFactory: () => "destination-copy",
    now: 200
  });

  assert.equal(result.sourceCharacter.equipment.items[0].quantity, 1);
  assert.equal(result.targetCharacter.equipment.items[0].id, "destination-copy");
  assert.equal(result.targetCharacter.equipment.items[0].quantity, 1);
  assert.equal(result.targetCharacter.equipment.items[0].equipped, false);
  assert.equal(result.targetCharacter.equipment.items[0].attuned, false);
  assert.equal(result.targetCharacter.equipment.items[0].sourceLibraryItemId, "ember-blade");
  assert.equal(result.targetCharacter.equipment.items[0].copiedFromInventoryItemId, "source-copy");
  assert.equal(result.targetCharacter.equipment.items[0].transferredFromCharacterId, "hero-a");
  assert.equal(result.targetCharacter.equipment.items[0].ownerCharacterId, "hero-b");
  result.targetCharacter.equipment.items[0].effects[0].name = "Changed";
  assert.equal(sourceItem.effects[0].name, "Ember");
  assert.equal(source.equipment.notes, "preserve me");
});

test("saved-character transfer persistence updates both inventories atomically", async () => {
  const records = new Map([
    ["rooms/ROOM/characters/hero-a", character("hero-a", "user-1", [
      { id: "wand-copy", name: "Wand", quantity: 1, equipped: true, attuned: true }
    ])],
    ["rooms/ROOM/characters/hero-b", character("hero-b", "user-1", [])]
  ]);
  const writes = [];
  const doc = (_db, ...segments) => ({ path: segments.join("/") });
  const runTransaction = async (_db, callback) => callback({
    get: async (reference) => ({
      exists: () => records.has(reference.path),
      data: () => structuredClone(records.get(reference.path))
    }),
    update(reference, patch) {
      writes.push({ path: reference.path, patch: structuredClone(patch) });
      records.set(reference.path, {
        ...records.get(reference.path),
        ...structuredClone(patch)
      });
    }
  });
  const persistence = createCharacterItemTransferPersistence({
    db: {},
    doc,
    runTransaction,
    serverTimestamp: () => "SERVER",
    getRoomCode: () => "room",
    getUserId: () => "user-1",
    getIsDM: () => false,
    idFactory: () => "transferred-copy",
    now: () => 300
  });
  const result = await persistence.transfer({
    sourceCharacterId: "hero-a",
    targetCharacterId: "hero-b",
    itemId: "wand-copy"
  });

  assert.equal(writes.length, 2);
  assert.equal(writes[0].patch.equipment.items.length, 0);
  assert.equal(writes[1].patch.equipment.items[0].id, "transferred-copy");
  assert.equal(writes[1].patch.equipment.items[0].equipped, false);
  assert.equal(result.transferredItem.attuned, false);
  assert.equal(records.get("rooms/ROOM/characters/hero-a").identity.name, "hero-a");
  assert.equal(records.get("rooms/ROOM/characters/hero-b").equipment.notes, "preserve me");
});

test("Character Creator and Library quick actions expose the item integration", () => {
  const creator = fs.readFileSync(new URL("../characterCreator/index.js", import.meta.url), "utf8");
  const step = fs.readFileSync(new URL("../characterCreator/steps/equipmentStep.js", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");

  assert.match(creator, /queueMagicItem:\s*queueMagicItemForCharacter/);
  assert.match(creator, /createCharacterItemTransferPersistence/);
  assert.match(step, /My Magic Item Library/);
  assert.match(step, /add-library-magic-item/);
  assert.match(step, /transfer-inventory-item/);
  assert.match(app, /getMagicItemLibrary/);
  assert.match(app, /creator\.queueMagicItem\(content\)/);
});
