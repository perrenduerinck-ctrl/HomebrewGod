import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  magicItemToInventoryCopy,
  normalizeMagicItem,
  validateMagicItem
} from "../items/magicItemModel.js";
import { createMagicItemPersistence } from "../items/magicItemPersistence.js";
import { createMagicItemLibraryAdapter } from "../library/adapters/magicItemLibraryAdapter.js";

function memoryFirestore() {
  const records = new Map();
  const path = (segments) => segments.map((part) => typeof part === "object" ? part.path : String(part)).join("/");
  const ref = (kind, value) => ({ kind, path: value, id: value.split("/").at(-1) });
  const db = {};
  const collection = (_db, ...segments) => ref("collection", path(segments));
  const doc = (_db, ...segments) => ref("document", path(segments));
  const getDoc = async (reference) => ({ id: reference.id, exists: () => records.has(reference.path), data: () => structuredClone(records.get(reference.path) || {}) });
  const setDoc = async (reference, value, options = {}) => records.set(reference.path, structuredClone(options.merge ? { ...(records.get(reference.path) || {}), ...value } : value));
  const deleteDoc = async (reference) => records.delete(reference.path);
  const orderBy = (field, direction = "asc") => ({ type: "orderBy", field, direction });
  const limit = (value) => ({ type: "limit", value });
  const startAfter = (snapshot) => ({ type: "startAfter", snapshot });
  const query = (reference, ...constraints) => ({ ...reference, constraints });
  const getDocs = async (reference) => {
    const prefix = `${reference.path}/`;
    let docs = [...records].filter(([key]) => key.startsWith(prefix) && !key.slice(prefix.length).includes("/"))
      .map(([key, value]) => ({ id: key.split("/").at(-1), data: () => structuredClone(value) }));
    for (const constraint of reference.constraints || []) {
      if (constraint.type === "orderBy") docs.sort((a, b) => (constraint.direction === "desc" ? -1 : 1) * ((a.data()[constraint.field] || 0) - (b.data()[constraint.field] || 0)));
      if (constraint.type === "startAfter") docs = docs.slice(docs.findIndex((entry) => entry.id === constraint.snapshot.id) + 1);
      if (constraint.type === "limit") docs = docs.slice(0, constraint.value);
    }
    return { docs };
  };
  return { db, records, collection, doc, getDoc, getDocs, setDoc, deleteDoc, orderBy, limit, startAfter, query, serverTimestamp: () => "SERVER" };
}

test("magic items normalize creator fields without changing source data", () => {
  const source = {
    id: "flame-tongue", name: " Flame Tongue ", type: "weapon", rarity: "very rare",
    attunement: true, maximumCharges: 7, currentCharges: 9, tags: "Fire, Sword, fire",
    imageUrl: "https://example.com/sword.png",
    effects: [{ id: "ignite", name: "Ignite", description: "Deals fire damage.", chargeCost: 1 }]
  };
  const before = structuredClone(source);
  const item = normalizeMagicItem(source, { now: 100 });
  assert.equal(item.itemType, "weapon");
  assert.equal(item.rarity, "very-rare");
  assert.equal(item.requiresAttunement, true);
  assert.equal(item.charges.current, 7);
  assert.deepEqual(item.tags, ["fire", "sword"]);
  assert.deepEqual(source, before);
  assert.deepEqual(validateMagicItem({ name: "", imageUrl: "http://unsafe.example" }), ["Give the item a name.", "Item images must use an HTTPS URL."]);
});

test("inventory copies receive independent IDs and preserve item mechanics", () => {
  const original = normalizeMagicItem({ id: "wand", name: "Wand", itemType: "wondrous-item", requiresAttunement: true, effects: [{ name: "Bolt" }] });
  const copy = magicItemToInventoryCopy(original, { idFactory: () => "inventory-copy" });
  assert.equal(copy.id, "inventory-copy");
  assert.equal(copy.sourceLibraryItemId, "wand");
  assert.equal(copy.requiresAttunement, true);
  assert.equal(copy.attuned, false);
  assert.equal(copy.effects[0].name, "Bolt");
});

test("personal magic item persistence saves, pages, reloads and deletes", async () => {
  const store = memoryFirestore();
  let now = 100;
  const persistence = createMagicItemPersistence({ ...store, getUserId: () => "user-1", now: () => ++now });
  const saved = await persistence.save({ id: "staff", name: "Staff of Tests", itemType: "weapon", rarity: "rare", description: "Reliable.", imageUrl: "", tags: ["staff"], effects: [] });
  assert.equal(saved.id, "staff");
  assert.equal(store.records.get("users/user-1/magicItems/staff").ownerUid, "user-1");
  assert.equal((await persistence.load("staff")).name, "Staff of Tests");
  assert.deepEqual((await persistence.listPage({ pageSize: 10 })).entries.map((item) => item.id), ["staff"]);
  await persistence.remove("staff");
  assert.equal(store.records.has("users/user-1/magicItems/staff"), false);
});

test("magic item Library adapter returns lightweight cards and lazily loads effects", async () => {
  const store = memoryFirestore();
  store.records.set("users/user-1/magicItems/ring", {
    id: "ring", ownerUid: "user-1", name: "Ring of Testing", itemType: "wondrous-item", rarity: "legendary",
    description: "A test ring.", imageUrl: "https://example.com/ring.png", tags: ["ring"], requiresAttunement: true,
    charges: { maximum: 3, current: 3, recharge: "dawn" }, effects: [{ name: "Assert", description: "Pass." }], updatedAtMillis: 20
  });
  const adapter = createMagicItemLibraryAdapter({ ...store, getUserId: () => "user-1", getUserName: () => "Aster" });
  const page = await adapter.listPage({ pageSize: 50 });
  assert.equal(page.entries[0].libraryId, "magic-item:ring");
  assert.equal(page.entries[0].metadata.rarity, "legendary");
  assert.equal(Object.hasOwn(page.entries[0], "effects"), false);
  assert.equal((await adapter.load("ring")).effects[0].name, "Assert");
  assert.deepEqual((await adapter.getSummariesByIds(["magic-item:ring"])).entries.map((entry) => entry.libraryId), ["magic-item:ring"]);
});

test("Firestore rules protect each user's native magic item library", () => {
  const rules = fs.readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  assert.match(rules, /match \/magicItems\/\{itemId\}/);
  assert.match(rules, /request\.resource\.data\.ownerUid == userId/);
  assert.match(rules, /'weapon', 'armor', 'consumable', 'wondrous-item'/);
});
