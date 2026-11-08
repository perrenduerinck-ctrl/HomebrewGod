import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  homebrewSpellToCharacterCopy,
  normalizeHomebrewSpell,
  validateHomebrewSpell
} from "../spells/spellModel.js";
import {
  createIndependentSpellCopy,
  mergeSpellCreatorDraft
} from "../spells/spellCreator.js";
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
  assert.deepEqual(spell.componentLetters, ["V", "S"]);
  assert.deepEqual(source, before);
  const invalid = validateHomebrewSpell({ name: "", level: 12 });
  assert.ok(invalid.includes("Give the spell a name."));
  assert.ok(invalid.includes("Spell level must be a whole number from 0 through 9."));
});

test("homebrew validation rejects malformed targeting, components, classes, and scaling", () => {
  const errors = validateHomebrewSpell({
    name: "Broken Bolt",
    level: 1,
    castingTime: "whenever",
    range: "60 feet",
    duration: "Instantaneous",
    componentLetters: ["V", "X"],
    classes: ["Wizard", "Space Marine"],
    damage: {
      dice: "lots",
      atCharacterLevel: { 25: "more" }
    },
    targeting: {
      schemaVersion: 999,
      range: { type: "distance", feet: -1, text: "bad" },
      target: { type: "creature" },
      area: null,
      duration: { type: "instantaneous", text: "Instantaneous", concentration: false },
      save: null,
      attack: null
    }
  });
  assert.ok(errors.some((error) => /casting time/i.test(error)));
  assert.ok(errors.some((error) => /Invalid spell component/i.test(error)));
  assert.ok(errors.some((error) => /Unknown spell class/i.test(error)));
  assert.ok(errors.some((error) => /schema version/i.test(error)));
  assert.ok(errors.some((error) => /complete dice expression/i.test(error)));
  assert.ok(errors.some((error) => /outside 1-20/i.test(error)));

  const materialErrors = validateHomebrewSpell({
    name: "Incomplete Components",
    level: 1,
    castingTime: "1 action",
    components: "V, S",
    material: "a silver bell"
  });
  assert.ok(materialErrors.some((error) => /require the M component/i.test(error)));
  assert.ok(validateHomebrewSpell({
    name: "Fractional Spell",
    level: 1.5,
    castingTime: "1 action"
  }).some((error) => /whole number/i.test(error)));
  assert.ok(validateHomebrewSpell({
    name: "Partial Dice",
    level: 1,
    castingTime: "1 action",
    damageDice: "2d6 extra text"
  }).some((error) => /complete dice expression/i.test(error)));
});

test("Spell Creator edits preserve advanced mechanics and independent copies retain provenance", async () => {
  const store = memoryFirestore();
  let now = 400;
  const persistence = createSpellPersistence({
    ...store,
    getUserId: () => "user-1",
    now: () => ++now
  });
  const advanced = {
    id: "gravity-well",
    name: "Gravity Well",
    level: 4,
    school: "Transmutation",
    classes: ["Wizard"],
    castingTime: "1 action",
    range: "90 feet",
    duration: "Concentration, up to 1 minute",
    concentration: true,
    components: "V, S, M",
    material: "a lodestone worth 50 gp",
    materialCostGp: 50,
    materialConsumed: false,
    damageType: "Force",
    damageDice: "4d8",
    damage: [{
      dice: "4d8",
      damageType: "Force",
      atSlotLevel: { 4: "4d8", 5: "5d8" }
    }],
    healing: [{ atSlotLevel: { 4: "1d8 + MOD" } }],
    scaling: {
      atCharacterLevel: {},
      atSlotLevel: { 4: "4d8", 5: "5d8" },
      healingAtSlotLevel: { 4: "1d8 + MOD" }
    },
    effects: [{ type: "condition", condition: "restrained" }],
    areaOfEffect: { type: "sphere", size: 15 },
    targeting: {
      schemaVersion: 1,
      range: { type: "distance", feet: 90, text: "90 feet" },
      target: { type: "point" },
      area: { shape: "sphere", radius: 15 },
      duration: {
        type: "timed",
        amount: 1,
        unit: "minute",
        upTo: true,
        concentration: true,
        text: "Concentration, up to 1 minute"
      },
      save: { ability: "str", success: "half" },
      attack: null
    },
    animations: { impact: { animationId: "gravity-impact" } },
    sourceWorkshopAssetId: "workshop-gravity",
    sourceWorkshopVersion: 3,
    sourceAuthorUid: "author-1"
  };

  const firstSave = await persistence.save(advanced);
  const loaded = await persistence.load(firstSave.id);
  const editable = {
    id: loaded.id,
    revision: loaded.revision,
    createdAtMillis: loaded.createdAtMillis,
    name: "Gravity Well Revised",
    level: String(loaded.level),
    school: loaded.school,
    classes: loaded.classes,
    tags: loaded.tags,
    castingTime: loaded.castingTime,
    range: loaded.range,
    duration: loaded.duration,
    components: loaded.components,
    material: loaded.material,
    concentration: loaded.concentration,
    ritual: loaded.ritual,
    damageType: loaded.damageType,
    damageDice: loaded.damageDice,
    attackType: loaded.attackType,
    saveAbility: loaded.saveAbility,
    description: loaded.description,
    higherLevel: loaded.higherLevel,
    animations: loaded.animations
  };
  const baseline = { ...editable, name: loaded.name };
  const merged = mergeSpellCreatorDraft(loaded, editable, baseline);
  const secondSave = await persistence.save(merged);
  const reloaded = await persistence.load(secondSave.id);

  assert.equal(reloaded.name, "Gravity Well Revised");
  assert.deepEqual(reloaded.targeting, loaded.targeting);
  assert.deepEqual(reloaded.damage, loaded.damage);
  assert.deepEqual(reloaded.healing, loaded.healing);
  assert.deepEqual(reloaded.scaling, loaded.scaling);
  assert.deepEqual(reloaded.effects, loaded.effects);
  assert.equal(reloaded.materialCostGp, 50);
  assert.equal(reloaded.sourceWorkshopAssetId, "workshop-gravity");
  assert.deepEqual(reloaded.animations, loaded.animations);

  const copy = createIndependentSpellCopy(reloaded);
  assert.equal(copy.id, "");
  assert.equal(copy.revision, 0);
  assert.equal(copy.sourceWorkshopAssetId, "workshop-gravity");
  assert.equal(copy.sourceWorkshopVersion, 3);
  assert.equal(copy.sourceAuthorUid, "author-1");
  assert.deepEqual(copy.damage, reloaded.damage);
  assert.deepEqual(copy.targeting, reloaded.targeting);
});

test("character spell copies get independent IDs and retain mechanics and animation stages", () => {
  const source = normalizeHomebrewSpell({
    id: "ward",
    name: "Ward",
    level: 2,
    classes: ["Wizard"],
    range: "60 feet",
    attackType: "ranged",
    animations: { sustain: "ward-loop" }
  });
  const first = homebrewSpellToCharacterCopy(source, { idFactory: () => "character-spell-1" });
  const second = homebrewSpellToCharacterCopy(source, { idFactory: () => "character-spell-2" });
  assert.notEqual(first.id, second.id);
  assert.equal(first.sourceLibrarySpellId, "ward");
  assert.equal(first.animations.sustain, "ward-loop");
  assert.equal(first.manualOverride, true);
  assert.equal(first.targeting.range.feet, 60);
  assert.equal(first.targeting.target.type, "creature");
  assert.equal(first.targeting.attack.type, "ranged");
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
