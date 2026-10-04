import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { normalizeNpc } from "../npcs/npcModel.js";
import { applyNpcKnowledgeShare, knowledgeKnownByNpc } from "../npcs/knowledgeSharing.js";
import { normalizeNpcRelationship, validateNpcRelationship } from "../npcs/relationshipModel.js";
import { createNpcRelationshipPersistence } from "../npcs/relationshipPersistence.js";

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

test("relationship model preserves explicit link fields and rejects self-links", () => {
  const relationship = normalizeNpcRelationship({
    id: "elara-mira", sourceNpcId: "elara", targetNpcId: "mira", relationshipType: "Rival",
    direction: "mutual", trust: 37, hostility: 62, notes: "Compete for contracts.", tags: ["guild"]
  }, { now: 100 });
  assert.equal(relationship.relationshipType, "Rival");
  assert.equal(relationship.direction, "mutual");
  assert.equal(relationship.trust, 37);
  assert.deepEqual(validateNpcRelationship(relationship), []);
  assert.match(validateNpcRelationship({ sourceNpcId: "same", targetNpcId: "same" }).join(" "), /different NPCs/);
});

test("relationship persistence saves, reloads, pages, and deletes owner-scoped records", async () => {
  const store = memoryFirestore();
  let now = 100;
  const persistence = createNpcRelationshipPersistence({ ...store, getUserId: () => "user-1", now: () => ++now });
  const saved = await persistence.save({ id: "rel-1", sourceNpcId: "elara", targetNpcId: "mira", relationshipType: "Ally", direction: "directed", trust: 80, hostility: 0, notes: "", tags: [] });
  assert.equal(store.records.get("users/user-1/npcRelationships/rel-1").ownerUid, "user-1");
  assert.equal((await persistence.load(saved.id)).targetNpcId, "mira");
  assert.deepEqual((await persistence.listPage()).entries.map((entry) => entry.id), ["rel-1"]);
  await persistence.remove(saved.id);
  assert.equal(store.records.has("users/user-1/npcRelationships/rel-1"), false);
});

test("explicit knowledge sharing adds source, known-by, and world-time references without autonomous propagation", () => {
  const source = normalizeNpc({ id: "elara", name: "Elara", knowledge: [{ id: "route", title: "Secret Route", description: "A hidden path." }] });
  const target = normalizeNpc({ id: "mira", name: "Mira" });
  const bystander = normalizeNpc({ id: "orin", name: "Orin" });
  const updated = applyNpcKnowledgeShare(source, target, "route", 86400);
  assert.equal(updated.knowledge[0].sourceNpcId, "elara");
  assert.deepEqual(updated.knowledge[0].knownByNpcIds, ["elara", "mira"]);
  assert.equal(updated.knowledge[0].sharedAtWorldTime, 86400);
  assert.equal(knowledgeKnownByNpc([updated, target, bystander], "mira").length, 1);
  assert.equal(knowledgeKnownByNpc([updated, target, bystander], "orin").length, 0);
});

test("old NPC knowledge remains backward compatible and network modules are shipped", () => {
  const oldNpc = normalizeNpc({ id: "old", name: "Old NPC", knowledge: [{ id: "old-clue", title: "Old Clue" }] });
  assert.deepEqual(oldNpc.knowledge[0].knownByNpcIds, []);
  assert.equal(oldNpc.knowledge[0].sourceNpcId, "");
  assert.equal(oldNpc.knowledge[0].sharedAtWorldTime, null);
  const network = fs.readFileSync(new URL("../npcs/npcRelationshipNetwork.js", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../npcs/npcRelationshipNetwork.css", import.meta.url), "utf8");
  assert.match(network, /pointerdown/);
  assert.match(network, /wheel/);
  assert.match(network, /applyNpcKnowledgeShare/);
  assert.match(css, /@media\(max-width:650px\)/);
});

test("Firestore rules protect relationship records and mirror the authoritative rules", () => {
  const rules = fs.readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  assert.match(rules, /match \/npcRelationships\/\{relationshipId\}/);
  assert.match(rules, /request\.resource\.data\.ownerUid == userId/);
  assert.match(rules, /request\.resource\.data\.sourceNpcId != request\.resource\.data\.targetNpcId/);
  const authoritativeUrl = new URL("../../Firebase.js", import.meta.url);
  if (fs.existsSync(authoritativeUrl)) {
    const authoritative = fs.readFileSync(authoritativeUrl, "utf8");
    assert.equal(rules.replace(/\r\n/g, "\n"), authoritative.replace(/\r\n/g, "\n"));
  }
});
