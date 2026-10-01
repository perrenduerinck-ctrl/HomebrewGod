import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { normalizeNpc, duplicateNpc, validateNpc } from "../npcs/npcModel.js";
import { createNpcPersistence } from "../npcs/npcPersistence.js";
import { createNpcLibraryAdapter } from "../library/adapters/npcLibraryAdapter.js";
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
  id: "captain-elara", name: "Captain Elara", portraitUrl: "https://example.com/elara.webp",
  species: "Human", occupation: "Harbor Captain", disposition: "Wary", roomCode: "SEA-1", roomName: "Sea of Glass",
  description: "Keeps the harbor safe.", tags: ["ally", "harbor"], relationshipIds: ["dockmaster"],
  factionIds: ["harbor-watch"], locationId: "glass-port", knowledge: [{ id: "route", title: "Secret Route", description: "Knows a safe passage.", tags: ["sea"], secret: true, learnedAt: "Session 4" }],
  combat: { enabled: true, ac: 15, hp: 44, speed: "30 ft.", abilities: { str: 14, dex: 12, con: 13, int: 11, wis: 15, cha: 16 }, actions: [{ id: "saber", name: "Saber", description: "Melee attack.", attackBonus: 5, damage: "1d8 + 3 slashing" }] }
};

test("NPC model preserves campaign, relationship, knowledge, and optional combat fields", () => {
  const npc = normalizeNpc(sample, { now: 100 });
  assert.equal(npc.scope, "campaign");
  assert.equal(npc.roomCode, "SEA-1");
  assert.deepEqual(npc.relationshipIds, ["dockmaster"]);
  assert.equal(npc.knowledge[0].secret, true);
  assert.equal(npc.combat.actions[0].damage, "1d8 + 3 slashing");
  assert.deepEqual(validateNpc(sample), []);
  assert.match(validateNpc({ name: "", portraitUrl: "http://unsafe.example" }).join(" "), /name.*HTTPS/i);
});

test("NPC duplicates and Workshop imports are independent native copies with provenance", () => {
  const copy = duplicateNpc(sample, { idFactory: () => "elara-copy", roomCode: "", roomName: "" });
  assert.equal(copy.id, "elara-copy");
  assert.equal(copy.scope, "personal");
  assert.equal(copy.copiedFromNpcId, "captain-elara");
  const imported = prepareWorkshopCopy({ assetId: "workshop-npc", assetType: "npc", version: 3, authorUid: "author", content: sample }, { idFactory: () => "native-npc" });
  assert.equal(imported.recordId, "native-npc");
  assert.equal(imported.content.sourceWorkshopAssetId, "workshop-npc");
  assert.notEqual(imported.recordId, sample.id);
});

test("personal NPC persistence saves, reloads, pages, and deletes the complete record", async () => {
  const store = memoryFirestore();
  let now = 100;
  const persistence = createNpcPersistence({ ...store, getUserId: () => "user-1", now: () => ++now });
  const saved = await persistence.save(sample);
  assert.equal(saved.id, "captain-elara");
  assert.equal(store.records.get("users/user-1/npcs/captain-elara").ownerUid, "user-1");
  assert.equal((await persistence.load(saved.id)).knowledge[0].title, "Secret Route");
  assert.deepEqual((await persistence.listPage({ pageSize: 10 })).entries.map((npc) => npc.id), ["captain-elara"]);
  await persistence.remove(saved.id);
  assert.equal(store.records.has("users/user-1/npcs/captain-elara"), false);
});

test("NPC Library adapter returns lightweight searchable metadata and lazily loads full content", async () => {
  const store = memoryFirestore();
  store.records.set("users/user-1/npcs/captain-elara", { ...sample, ownerUid: "user-1", updatedAtMillis: 20 });
  const adapter = createNpcLibraryAdapter({ ...store, getUserId: () => "user-1", getUserName: () => "Aster" });
  const page = await adapter.listPage({ pageSize: 50 });
  assert.equal(page.entries[0].libraryId, "npc:captain-elara");
  assert.equal(page.entries[0].sourceKind, "campaign");
  assert.equal(page.entries[0].metadata.role, "Harbor Captain");
  assert.equal(Object.hasOwn(page.entries[0], "knowledge"), false);
  assert.equal((await adapter.load("captain-elara")).knowledge[0].id, "route");
  assert.deepEqual(await adapter.listCampaigns(), [{ roomCode: "SEA-1", roomName: "Sea of Glass" }]);
});

test("Firestore rules protect native NPCs and match the authoritative Firebase rules file", () => {
  const rules = fs.readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const authoritative = fs.readFileSync(new URL("../../Firebase.js", import.meta.url), "utf8");
  assert.match(rules, /match \/npcs\/\{npcId\}/);
  assert.match(rules, /request\.resource\.data\.ownerUid == userId/);
  assert.match(rules, /request\.resource\.data\.knowledge is list/);
  assert.match(rules, /isRoomMember\(request\.resource\.data\.roomCode\)/);
  assert.equal(rules.replace(/\r\n/g, "\n"), authoritative.replace(/\r\n/g, "\n"));
});

test("NPC navigation, build, app registration, Workshop actions, and token integration stay connected", () => {
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const build = fs.readFileSync(new URL("../scripts/build-pages.mjs", import.meta.url), "utf8");
  const sidebar = fs.readFileSync(new URL("../ui/navigation/sidebarSections.js", import.meta.url), "utf8");
  const tokens = fs.readFileSync(new URL("../tokens/index.js", import.meta.url), "utf8");
  assert.match(index, /id="npcCreatorScreen"/);
  assert.match(app, /createNpcLibraryAdapter\(adapterConfig\)/);
  assert.match(app, /copy\.assetType === "npc"/);
  assert.match(app, /createNpcMapToken/);
  assert.match(sidebar, /create-npc/);
  assert.match(build, /"npcs"/);
  assert.match(tokens, /linkedNpcId/);
});
