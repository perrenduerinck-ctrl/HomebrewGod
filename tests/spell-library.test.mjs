import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  homebrewSpellToCharacterCopy,
  normalizeHomebrewSpell,
  validateHomebrewSpell
} from "../spells/spellModel.js";
import { createSpellPersistence } from "../spells/spellPersistence.js";
import { createSpellLibraryAdapter } from "../library/adapters/spellLibraryAdapter.js";

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

test("homebrew spells normalize mechanics and animation references without mutating input", () => {
  const source = {
    id: "cinder-lance", name: " Cinder Lance ", level: 3, school: "evocation",
    classes: "Wizard, Sorcerer, Wizard", damageType: "fire", damageDice: "6d6",
    components: "V, S", concentration: true, tags: "Fire, Projectile, fire",
    animations: { cast: { animationId: "magic-cast" }, impact: "fire-impact" }
  };
  const before = structuredClone(source);
  const spell = normalizeHomebrewSpell(source, { now: 100 });
  assert.equal(spell.school, "Evocation");
  assert.deepEqual(spell.classes, ["Wizard", "Sorcerer"]);
  assert.deepEqual(spell.tags, ["fire", "projectile"]);
  assert.equal(spell.animations.cast.animationId, "magic-cast");
  assert.equal(spell.animations.impact, "fire-impact");
  assert.deepEqual(source, before);
  assert.deepEqual(validateHomebrewSpell({ name: "", level: 12 }), ["Give the spell a name.", "Spell level must be between 0 and 9."]);
});

test("character spell copies get independent IDs and retain mechanics and animation stages", () => {
  const source = normalizeHomebrewSpell({ id: "ward", name: "Ward", level: 2, classes: ["Wizard"], animations: { sustain: "ward-loop" } });
  const first = homebrewSpellToCharacterCopy(source, { idFactory: () => "character-spell-1" });
  const second = homebrewSpellToCharacterCopy(source, { idFactory: () => "character-spell-2" });
  assert.notEqual(first.id, second.id);
  assert.equal(first.sourceLibrarySpellId, "ward");
  assert.equal(first.animations.sustain, "ward-loop");
  assert.equal(first.manualOverride, true);
});

test("personal spell persistence saves, pages, reloads and deletes", async () => {
  const store = memoryFirestore();
  let now = 100;
  const persistence = createSpellPersistence({ ...store, getUserId: () => "user-1", now: () => ++now });
  const saved = await persistence.save({ id: "burst", name: "Grave Burst", level: 3, school: "Necromancy", classes: ["Wizard"], description: "A pulse.", tags: ["necrotic"], animations: { impact: "grave-impact" } });
  assert.equal(saved.id, "burst");
  assert.equal(store.records.get("users/user-1/spells/burst").ownerUid, "user-1");
  assert.equal((await persistence.load("burst")).animations.impact, "grave-impact");
  assert.deepEqual((await persistence.listPage({ pageSize: 10 })).entries.map((spell) => spell.id), ["burst"]);
  await persistence.remove("burst");
  assert.equal(store.records.has("users/user-1/spells/burst"), false);
});

test("spell Library adapter exposes filter metadata and lazily loads full rules text", async () => {
  const store = memoryFirestore();
  store.records.set("users/user-1/spells/frost-chain", {
    id: "frost-chain", ownerUid: "user-1", name: "Frost Chain", level: 2, school: "Evocation",
    classes: ["Wizard"], damageType: "Cold", description: "A long rules description.", tags: ["cold"],
    animations: { travel: "ice-chain" }, updatedAtMillis: 20
  });
  const adapter = createSpellLibraryAdapter({ ...store, getUserId: () => "user-1", getUserName: () => "Aster" });
  const page = await adapter.listPage({ pageSize: 50 });
  assert.equal(page.entries[0].libraryId, "spell:frost-chain");
  assert.equal(page.entries[0].metadata.level, 2);
  assert.deepEqual(page.entries[0].metadata.classNames, ["Wizard"]);
  assert.equal(Object.hasOwn(page.entries[0], "animations"), false);
  assert.equal((await adapter.load("frost-chain")).animations.travel, "ice-chain");
  assert.deepEqual((await adapter.getSummariesByIds(["spell:frost-chain"])).entries.map((entry) => entry.libraryId), ["spell:frost-chain"]);
});

test("Firestore rules protect each user's native spell library", () => {
  const rules = fs.readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  assert.match(rules, /match \/spells\/\{spellId\}/);
  assert.match(rules, /request\.resource\.data\.ownerUid == userId/);
  assert.match(rules, /request\.resource\.data\.animations is map/);
});
