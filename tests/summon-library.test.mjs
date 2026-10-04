import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  duplicateSummonPreset,
  normalizeSummonPreset,
  summonPresetAutomation,
  validateSummonPreset
} from "../summons/summonPresetModel.js";
import { createSummonPersistence } from "../summons/summonPersistence.js";
import { createSummonLibraryAdapter } from "../library/adapters/summonLibraryAdapter.js";

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

const sample = {
  id: "forest-wolves",
  name: "Conjure Forest Wolves",
  description: "Four wolves around the target.",
  sourceLibraryId: "monster:wolf",
  source: { assetType: "monster", libraryId: "monster:wolf", sourceRecordId: "wolf", sourceRoomCode: "OLD-ROOM", name: "Wolf", thumbnailUrl: "https://example.test/wolf.webp", sizeCategory: "medium", tokenType: "enemy" },
  count: 4,
  placement: { mode: "around-target", radius: 2, preventOverlap: true, nearestFree: true, allowDmOverride: true },
  ownership: { mode: "caster" },
  initiative: { mode: "after-caster" },
  duration: { mode: "turns", value: 3 },
  endBehavior: { mode: "dismiss", animationId: "poof" },
  spawnTiming: "event",
  eventName: "summon-now",
  summonAnimationId: "green-circle",
  tags: ["beast", "forest"]
};

test("Summon preset normalizes reusable source, placement, duration, and runtime automation", () => {
  const preset = normalizeSummonPreset(sample, { now: 100 });
  assert.equal(preset.sourceLibraryId, "monster:wolf");
  assert.equal(preset.count, 4);
  assert.equal(preset.duration.mode, "turns");
  assert.equal(validateSummonPreset(sample).length, 0);
  const automation = summonPresetAutomation(preset);
  assert.equal(automation.sourceId, "wolf");
  assert.equal(automation.spawnLocation, "around-target");
  assert.equal(automation.duration.mode, "turns");
  assert.equal(automation.onEnd.dismissAnimationId, "poof");
});

test("Summon preset supports world-time duration and creates independent duplicates", () => {
  const preset = normalizeSummonPreset({ ...sample, duration: { mode: "world-time", value: 2, unit: "hours" } });
  const automation = summonPresetAutomation(preset);
  assert.deepEqual(automation.duration, { mode: "world-time", value: 2, unit: "hours" });
  const duplicate = duplicateSummonPreset(sample, { idFactory: () => "forest-wolves-copy", now: 200 });
  assert.equal(duplicate.id, "forest-wolves-copy");
  assert.equal(duplicate.sourceLibraryId, sample.sourceLibraryId);
  assert.notEqual(duplicate.id, sample.id);
});

test("Imported summon preset can use its stored source snapshot independently", () => {
  const automation = summonPresetAutomation(sample, {
    source: {
      ...sample.source,
      assetType: "custom",
      libraryId: "",
      sourceRecordId: "",
      ac: 13,
      maxHp: 11,
      speed: "40 ft.",
      combatEnabled: true
    }
  });
  assert.equal(automation.sourceType, "custom");
  assert.equal(automation.sourceId, "");
  assert.equal(automation.ac, 13);
  assert.equal(automation.maxHp, 11);
  assert.equal(automation.speed, "40 ft.");
});

test("Summon persistence saves, reloads, pages, and deletes owner records", async () => {
  const store = memoryFirestore();
  let now = 100;
  const persistence = createSummonPersistence({ ...store, getUserId: () => "user-1", now: () => ++now });
  const saved = await persistence.save(sample);
  assert.equal(store.records.get("users/user-1/summons/forest-wolves").ownerUid, "user-1");
  assert.equal((await persistence.load(saved.id)).source.libraryId, "monster:wolf");
  assert.deepEqual((await persistence.listPage({ pageSize: 10 })).entries.map((entry) => entry.id), ["forest-wolves"]);
  await persistence.remove(saved.id);
  assert.equal(store.records.has("users/user-1/summons/forest-wolves"), false);
});

test("Summon Library adapter keeps grids lightweight and lazily loads presets", async () => {
  const store = memoryFirestore();
  store.records.set("users/user-1/summons/forest-wolves", { ...sample, ownerUid: "user-1", updatedAtMillis: 20 });
  const adapter = createSummonLibraryAdapter({ ...store, getUserId: () => "user-1", getUserName: () => "Aster" });
  const page = await adapter.listPage({ pageSize: 50 });
  assert.equal(page.entries[0].libraryId, "summon:forest-wolves");
  assert.equal(page.entries[0].metadata.count, 4);
  assert.equal(Object.hasOwn(page.entries[0], "placement"), false);
  assert.equal((await adapter.load("forest-wolves")).eventName, "summon-now");
});

test("Summon rules, routes, adapter, and authoritative mirror stay connected", () => {
  const rules = fs.readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const authoritative = fs.readFileSync(new URL("../../Firebase.js", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const sidebar = fs.readFileSync(new URL("../ui/navigation/sidebarSections.js", import.meta.url), "utf8");
  const build = fs.readFileSync(new URL("../scripts/build-pages.mjs", import.meta.url), "utf8");
  assert.match(rules, /match \/summons\/\{summonId\}/);
  assert.match(rules, /request\.resource\.data\.count <= 20/);
  assert.equal(rules.replace(/\r\n/g, "\n"), authoritative.replace(/\r\n/g, "\n"));
  assert.match(index, /id="summonCreatorScreen"/);
  assert.match(app, /createSummonLibraryAdapter\(adapterConfig\)/);
  assert.match(app, /prepareSummonPresetForCurrentRoom/);
  assert.match(sidebar, /create-summon/);
  assert.match(build, /"summons"/);
});
