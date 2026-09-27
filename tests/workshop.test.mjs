import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { readFileSync } from "node:fs";
import { createWorkshopPersistence } from "../workshop/workshopPersistence.js";
import { prepareWorkshopCopy } from "../workshop/workshopImport.js";
import { matchesWorkshopAsset, normalizeWorkshopAsset, sortWorkshopAssets, workshopSourceKey } from "../workshop/workshopModel.js";
import { compareWorkshopVersions } from "../workshop/workshopVersioning.js";

function memoryFirestore() {
  const records = new Map();
  const path = (segments) => segments.map((part) => typeof part === "object" ? part.path : String(part)).join("/").replace(/\/+/g, "/");
  const ref = (kind, value) => ({ kind, path: value, id: value.split("/").at(-1) });
  const db = {};
  const collection = (_db, ...segments) => ref("collection", path(segments));
  const doc = (_db, ...segments) => ref("document", path(segments));
  const getDoc = async (reference) => ({
    id: reference.id,
    ref: reference,
    exists: () => records.has(reference.path),
    data: () => structuredClone(records.get(reference.path) || {})
  });
  const setDoc = async (reference, value, options = {}) => {
    const previous = records.get(reference.path) || {};
    records.set(reference.path, structuredClone(options.merge ? { ...previous, ...value } : value));
  };
  const deleteDoc = async (reference) => { records.delete(reference.path); };
  const where = (field, operator, value) => ({ type: "where", field, operator, value });
  const limit = (value) => ({ type: "limit", value });
  const startAfter = (snapshot) => ({ type: "startAfter", snapshot });
  const query = (reference, ...constraints) => ({ kind: "query", path: reference.path, constraints });
  const getDocs = async (reference) => {
    const constraints = reference.constraints || [];
    const prefix = `${reference.path}/`;
    let documents = [...records].filter(([key]) => key.startsWith(prefix) && !key.slice(prefix.length).includes("/"))
      .map(([key, value]) => ({ id: key.split("/").at(-1), ref: ref("document", key), data: () => structuredClone(value) }));
    for (const constraint of constraints) {
      if (constraint.type === "where") documents = documents.filter((entry) => entry.data()[constraint.field] === constraint.value);
      if (constraint.type === "startAfter") {
        const index = documents.findIndex((entry) => entry.id === constraint.snapshot?.id);
        if (index >= 0) documents = documents.slice(index + 1);
      }
      if (constraint.type === "limit") documents = documents.slice(0, constraint.value);
    }
    return { docs: documents, forEach: (callback) => documents.forEach(callback) };
  };
  const writeBatch = () => {
    const writes = [];
    return { set(reference, value, options) { writes.push([reference, value, options]); }, async commit() { for (const item of writes) await setDoc(...item); } };
  };
  return { db, records, collection, doc, getDoc, getDocs, setDoc, deleteDoc, where, limit, startAfter, query, writeBatch, serverTimestamp: () => "SERVER_TIMESTAMP" };
}

function setup() {
  const store = memoryFirestore();
  const state = { uid: "author-1", name: "Aster", room: "ROOM-1" };
  let serial = 0;
  const persistence = createWorkshopPersistence({
    ...store,
    getUserId: () => state.uid,
    getUserName: () => state.name,
    getRoomCode: () => state.room,
    idFactory: () => `id-${++serial}`
  });
  return { store, state, persistence };
}

const monster = {
  id: "monster-1", name: "Ash Drake", type: "Dragon", size: "Large", notes: "Cinder hunter",
  actions: [{ id: "bite", name: "Bite", description: "Sharp.", sequence: [{ actionId: "claw", count: 2 }] }],
  actionAnimations: { bite: { family: "melee", animations: { impact: { animationId: "slash" } } } }
};

const animation = {
  id: "ember_burst", name: "Ember Burst", description: "A quick flare", sprite: "https://example.com/ember.png",
  thumbnailUrl: "https://example.com/ember-thumb.png", grid: { columns: 4, rows: 4 }, frameCount: 16,
  atlas: { width: 400, height: 400, columns: [0, 100, 200, 300, 400], rows: [0, 100, 200, 300, 400], offsetX: 2, offsetY: -3, insetX: 1, insetY: 2, inset: 0 },
  layers: [{ animationId: "spark_layer", startDelay: 0.2 }], timeline: [{ at: 0, animationId: "ember_burst" }],
  ownership: { kind: "user", scope: "user", ownerId: "author-1" }
};

test("publishes lightweight monster and animation summaries with lazy full versions", async () => {
  const { persistence, store } = setup();
  const publishedMonster = await persistence.publish({
    assetType: "monster", name: monster.name, description: monster.notes, visibility: "ROOM", roomCode: "ROOM-1",
    sourceKey: workshopSourceKey("monster", monster.id, "room:ROOM-1"), sourceRecordId: monster.id, content: monster
  });
  const publishedAnimation = await persistence.publish({
    assetType: "animation", name: animation.name, description: animation.description, visibility: "PRIVATE",
    sourceKey: workshopSourceKey("animation", animation.id, "user:author-1"), sourceRecordId: animation.id,
    thumbnailUrl: animation.thumbnailUrl, content: animation
  });
  assert.equal(store.records.get(`workshopAssets/${publishedMonster.assetId}`).content, undefined);
  assert.equal((await persistence.loadAsset(publishedMonster.assetId)).content.actionAnimations.bite.animations.impact.animationId, "slash");
  const loadedAnimation = await persistence.loadAsset(publishedAnimation.assetId);
  assert.equal(loadedAnimation.content.atlas.offsetY, -3);
  assert.deepEqual(loadedAnimation.content.layers, animation.layers);
  assert.deepEqual(loadedAnimation.content.timeline, animation.timeline);
});

test("room/private visibility and author mutation checks are enforced by the API", async () => {
  const { persistence, state } = setup();
  const roomAsset = await persistence.publish({ assetType: "monster", name: "Room Beast", visibility: "ROOM", content: monster });
  const privateAsset = await persistence.publish({ assetType: "monster", name: "Secret Beast", visibility: "PRIVATE", content: monster });
  state.uid = "member-2"; state.name = "Bryn";
  assert.equal((await persistence.loadAsset(roomAsset.assetId)).name, "Room Beast");
  await assert.rejects(() => persistence.loadAsset(privateAsset.assetId), /unavailable/);
  await assert.rejects(() => persistence.publish({ ...roomAsset, content: monster }, { assetId: roomAsset.assetId }), /Only the author/);
});

test("independent import survives source deletion and new versions never overwrite it", async () => {
  const { persistence } = setup();
  const first = await persistence.publish({ assetType: "monster", name: monster.name, visibility: "PRIVATE", content: monster });
  const imported = prepareWorkshopCopy(first, { idFactory: () => "local-monster" });
  const updated = await persistence.publish({ ...first, content: { ...monster, hp: 222 } }, { assetId: first.assetId, mode: "new-version" });
  assert.equal(updated.version, 2);
  assert.equal(imported.content.hp, undefined);
  assert.equal(imported.content.sourceWorkshopVersion, 1);
  assert.ok(compareWorkshopVersions(first.content, updated.content).some((entry) => entry.path === "hp"));
  await persistence.deleteAsset(first.assetId);
  assert.equal(imported.content.name, "Ash Drake");
});

test("remix, favorites, and mixed collections preserve references and ownership", async () => {
  const { persistence, state } = setup();
  const first = await persistence.publish({ assetType: "monster", name: monster.name, visibility: "ROOM", content: monster });
  state.uid = "member-2"; state.name = "Bryn";
  const remix = await persistence.remix(first.assetId, { name: "Blue Ash Drake" });
  assert.equal(remix.authorUid, "member-2");
  assert.equal(remix.forkedFrom, first.assetId);
  await persistence.toggleFavorite(first, true);
  assert.equal((await persistence.listAssets({ scope: "favorites" })).entries[0].assetId, first.assetId);
  let collection = await persistence.saveCollection({ name: "Dungeon Pack", visibility: "PRIVATE", assetIds: [] });
  collection = await persistence.setCollectionAsset(collection, first.assetId, true);
  collection = await persistence.setCollectionAsset(collection, remix.assetId, true);
  assert.deepEqual(new Set(collection.assetIds), new Set([first.assetId, remix.assetId]));
  assert.equal((await persistence.listCollectionAssets(collection)).length, 2);
  collection = await persistence.setCollectionAsset(collection, remix.assetId, false);
  assert.deepEqual(collection.assetIds, [first.assetId]);
  const renamed = await persistence.saveCollection({ ...collection, name: "Undead Dungeon Pack" });
  assert.equal(renamed.name, "Undead Dungeon Pack");
  await persistence.deleteCollection(collection.collectionId);
  assert.equal((await persistence.listCollections()).length, 0);
});

test("search, filtering, sorting, and 1000-summary stress stay bounded", () => {
  const context = { authorUid: "stress-author", authorName: "Stress Author", roomCode: "ROOM-1" };
  const start = performance.now();
  const assets = Array.from({ length: 1000 }, (_, index) => normalizeWorkshopAsset({
    assetId: `asset_${index}`,
    assetType: index % 2 ? "monster" : "animation",
    name: `Creation ${String(index).padStart(4, "0")}`,
    description: index % 10 === 0 ? "vampire boss" : "ordinary homebrew",
    visibility: "ROOM", roomCode: "ROOM-1", tags: index % 10 === 0 ? ["undead"] : ["general"], content: { index }
  }, context)).map((asset, index) => ({ ...asset, updatedAtMillis: index }));
  const matches = sortWorkshopAssets(assets.filter((asset) => matchesWorkshopAsset(asset, { search: "vampire", assetType: "animation", tag: "undead" })), "updated");
  assert.equal(matches.length, 100);
  assert.ok(matches[0].updatedAtMillis > matches.at(-1).updatedAtMillis);
  assert.ok(performance.now() - start < 500, "1000 summaries should filter without rendering full payloads");
});

test("sanitization rejects unsafe URLs, oversized payloads, and client author spoofing", () => {
  assert.throws(() => normalizeWorkshopAsset({ assetId: "safe", name: "Unsafe", thumbnailUrl: "javascript:alert(1)", content: {} }, { authorUid: "real" }), /HTTPS/);
  assert.throws(() => normalizeWorkshopAsset({ assetId: "safe", name: "Huge", content: { text: "x".repeat(510 * 1024) } }, { authorUid: "real" }), /too large/);
  const asset = normalizeWorkshopAsset({ assetId: "safe", name: "Spoof", authorUid: "attacker", content: {} }, { authorUid: "real", authorName: "Real" });
  assert.equal(asset.authorUid, "real");
});

test("Firestore rules scope Workshop assets, versions, favorites, imports, and collections", () => {
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  assert.match(rules, /match \/workshopAssets\/\{assetId\}/);
  assert.match(rules, /data\.authorUid == request\.auth\.uid/);
  assert.match(rules, /data\.visibility == 'ROOM'[\s\S]*isRoomMember\(data\.roomCode\)/);
  assert.match(rules, /match \/versions\/\{versionId\}/);
  assert.match(rules, /getAfter\([\s\S]*workshopAssets/);
  assert.match(rules, /match \/workshopFavorites\/\{assetId\}/);
  assert.match(rules, /match \/workshopImports\/\{assetId\}/);
  assert.match(rules, /match \/workshopCollections\/\{collectionId\}/);
});
