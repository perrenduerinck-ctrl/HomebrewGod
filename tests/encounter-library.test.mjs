import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { normalizeEncounter, duplicateEncounter, validateEncounter } from "../encounters/encounterModel.js";
import { createEncounterPersistence } from "../encounters/encounterPersistence.js";
import { prepareEncounterLoad, loadEncounter } from "../encounters/encounterLoader.js";
import { createEncounterLibraryAdapter } from "../library/adapters/encounterLibraryAdapter.js";
import { prepareWorkshopCopy } from "../workshop/workshopImport.js";

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
  id: "glass-harbor", name: "Ambush at Glass Harbor", description: "An undead boarding party attacks.", difficulty: "Hard",
  roomCode: "SEA-1", roomName: "Sea of Glass", environment: "Moonlit docks", tags: ["harbor", "undead"],
  mapRef: { libraryId: "map:docks", sourceRecordId: "docks", sourceRoomCode: "SEA-1", name: "Glass Harbor" },
  combatants: [
    { id: "wight-1", assetType: "monster", libraryId: "monster:wight", sourceRecordId: "wight", sourceRoomCode: "SEA-1", name: "Wight", x: 25, y: 40, elevation: 5, initiativePreset: 17 },
    { id: "captain", assetType: "npc", libraryId: "npc:captain", sourceRecordId: "captain", name: "Captain Elara", x: 70, y: 62, elevation: 0 }
  ],
  notes: "The bell summons reinforcements.", lighting: { phase: "night" }
};

test("Encounter model stores stable references and placement metadata without duplicating source records", () => {
  const encounter = normalizeEncounter(sample, { now: 100 });
  assert.equal(encounter.mapRef.libraryId, "map:docks");
  assert.equal(encounter.combatants[0].initiativePreset, 17);
  assert.equal(encounter.combatants[0].x, 25);
  assert.equal(Object.hasOwn(encounter.combatants[0], "hp"), false);
  assert.deepEqual(validateEncounter(sample), []);
  assert.match(validateEncounter({ name: "", combatants: [{ name: "Missing ref" }] }).join(" "), /name.*stable Library reference/i);
});

test("Encounter duplicate and Workshop import create independent IDs while preserving referenced asset IDs", () => {
  const duplicate = duplicateEncounter(sample, { idFactory: () => "glass-harbor-copy", now: 200 });
  assert.equal(duplicate.id, "glass-harbor-copy");
  assert.equal(duplicate.combatants[0].libraryId, "monster:wight");
  assert.notEqual(duplicate.combatants[0].id, sample.combatants[0].id);
  const imported = prepareWorkshopCopy({ assetId: "workshop-encounter", assetType: "encounter", version: 2, authorUid: "author", content: sample }, { idFactory: () => "native-encounter" });
  assert.equal(imported.recordId, "native-encounter");
  assert.equal(imported.content.sourceWorkshopAssetId, "workshop-encounter");
});

test("Encounter persistence saves, reloads, pages, and deletes native owner records", async () => {
  const store = memoryFirestore();
  let now = 100;
  const persistence = createEncounterPersistence({ ...store, getUserId: () => "user-1", now: () => ++now });
  const saved = await persistence.save(sample);
  assert.equal(store.records.get("users/user-1/encounters/glass-harbor").ownerUid, "user-1");
  assert.equal((await persistence.load(saved.id)).combatants[1].libraryId, "npc:captain");
  assert.deepEqual((await persistence.listPage({ pageSize: 10 })).entries.map((entry) => entry.id), ["glass-harbor"]);
  await persistence.remove(saved.id);
  assert.equal(store.records.has("users/user-1/encounters/glass-harbor"), false);
});

test("Encounter adapter keeps grids lightweight and lazily loads full records", async () => {
  const store = memoryFirestore();
  store.records.set("users/user-1/encounters/glass-harbor", { ...sample, ownerUid: "user-1", updatedAtMillis: 20 });
  const adapter = createEncounterLibraryAdapter({ ...store, getUserId: () => "user-1", getUserName: () => "Aster" });
  const page = await adapter.listPage({ pageSize: 50 });
  assert.equal(page.entries[0].libraryId, "encounter:glass-harbor");
  assert.equal(page.entries[0].metadata.combatantCount, 2);
  assert.equal(Object.hasOwn(page.entries[0], "combatants"), false);
  assert.equal((await adapter.load("glass-harbor")).notes, "The bell summons reinforcements.");
});

test("Encounter loader resolves everything before mutation and requires confirmation for existing battles", async () => {
  const summaries = sample.combatants.map((entry) => ({ libraryId: entry.libraryId, libraryRecord: true, assetType: entry.assetType, sourceType: entry.assetType, sourceRecordId: entry.sourceRecordId }));
  summaries.push({ libraryId: "map:docks", libraryRecord: true, assetType: "map", sourceType: "map", sourceRecordId: "docks" });
  const prepared = await prepareEncounterLoad(sample, {
    resolveLibraryIds: async () => ({ entries: summaries, metrics: { summaryReads: 3 } }),
    loadLibraryRecord: async (record) => ({ ...record, content: { id: record.sourceRecordId, name: record.libraryId } })
  });
  assert.equal(prepared.combatants.length, 2);
  assert.equal(prepared.map.content.id, "docks");
  let replaced = 0;
  const cancelled = await loadEncounter(sample, {
    resolveLibraryIds: async () => ({ entries: summaries }),
    loadLibraryRecord: async (record) => ({ content: { id: record.sourceRecordId } }),
    hasExistingBattle: async () => true,
    confirmReplace: async () => false,
    replaceBattleState: async () => { replaced += 1; }
  });
  assert.equal(cancelled.cancelled, true);
  assert.equal(replaced, 0);
  await assert.rejects(() => prepareEncounterLoad(sample, { resolveLibraryIds: async () => ({ entries: [] }), loadLibraryRecord: async () => ({}) }), /unavailable/);
});

test("Encounter rules and app integration stay connected and authoritative rules remain identical", () => {
  const rules = fs.readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const authoritative = fs.readFileSync(new URL("../../Firebase.js", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const sidebar = fs.readFileSync(new URL("../ui/navigation/sidebarSections.js", import.meta.url), "utf8");
  const build = fs.readFileSync(new URL("../scripts/build-pages.mjs", import.meta.url), "utf8");
  assert.match(rules, /match \/encounters\/\{encounterId\}/);
  assert.match(rules, /request\.resource\.data\.combatants\.size\(\) <= 50/);
  assert.equal(rules.replace(/\r\n/g, "\n"), authoritative.replace(/\r\n/g, "\n"));
  assert.match(index, /id="encounterCreatorScreen"/);
  assert.match(app, /createEncounterLibraryAdapter\(adapterConfig\)/);
  assert.match(app, /loadEncounterIntoCurrentRoom/);
  assert.match(sidebar, /create-encounter/);
  assert.match(build, /"encounters"/);
});
