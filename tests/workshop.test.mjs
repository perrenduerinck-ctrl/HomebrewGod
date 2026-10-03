import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { readFileSync } from "node:fs";
import { createWorkshopPersistence } from "../workshop/workshopPersistence.js";
import { prepareWorkshopCopy } from "../workshop/workshopImport.js";
import { matchesWorkshopAsset, normalizeWorkshopAsset, sortWorkshopAssets, workshopSourceKey } from "../workshop/workshopModel.js";
import { compareWorkshopVersions } from "../workshop/workshopVersioning.js";
import { filterWorkshopAssets } from "../workshop/workshopFilters.js";
import { createWorkshopRecentStore, applyWorkshopRecent } from "../workshop/workshopRecent.js";
import { WORKSHOP_ASSET_TYPES, createWorkshopTypeRegistry, getWorkshopTypeDefinition, matchesWorkshopType } from "../workshop/workshopTypeRegistry.js";
import { createWorkshopCardModel } from "../workshop/workshopBrowser.js";

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

test("a normal signed-in player can publish their personal magic item as PUBLIC or ROOM", async () => {
  const { persistence, store, state } = setup();
  state.uid = "normal-player";
  state.name = "Bryn";
  state.room = "MEMBER-ROOM";
  const content = {
    id: "permission-test-sword",
    name: "Workshop Permission Test Sword",
    itemType: "weapon",
    rarity: "rare",
    description: "A personal reusable item.",
    imageUrl: "https://example.com/test-sword.png",
    tags: ["weapon", "permission-test"],
    effects: []
  };
  const creatorRequest = {
    assetType: "magic-item",
    sourceRecordId: content.id,
    sourceKey: `magic-item:${content.id}`,
    sourceType: "magic-item",
    name: content.name,
    description: content.description,
    thumbnailUrl: content.imageUrl,
    tags: content.tags,
    content
  };

  const published = await persistence.publish({ ...creatorRequest, visibility: "PUBLIC" });
  const publicSummary = store.records.get(`workshopAssets/${published.assetId}`);
  assert.equal(publicSummary.authorUid, "normal-player");
  assert.equal(publicSummary.assetType, "magic-item");
  assert.equal(publicSummary.sourceType, "magic-item");
  assert.equal(publicSummary.sourceRecordId, content.id);
  assert.equal(publicSummary.sourceKey, `magic-item:${content.id}`);
  assert.deepEqual(publicSummary.typeMetadata, { itemType: "weapon", rarity: "rare", attunement: false });
  assert.equal(Object.hasOwn(publicSummary, "content"), false);
  assert.deepEqual(store.records.get(`workshopAssets/${published.assetId}/versions/1`).content, content);

  const roomPublished = await persistence.publish(
    { ...creatorRequest, visibility: "ROOM", roomCode: state.room },
    { assetId: published.assetId, mode: "new-version" }
  );
  assert.equal(roomPublished.authorUid, "normal-player");
  assert.equal(roomPublished.visibility, "ROOM");
  assert.equal(roomPublished.roomCode, "MEMBER-ROOM");
  assert.equal(Object.hasOwn(roomPublished, "dmUid"), false);
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

test("search, filtering, sorting, and 5000-summary stress stay bounded", () => {
  const context = { authorUid: "stress-author", authorName: "Stress Author", roomCode: "ROOM-1" };
  const start = performance.now();
  const assets = Array.from({ length: 5000 }, (_, index) => normalizeWorkshopAsset({
    assetId: `asset_${index}`,
    assetType: index % 2 ? "monster" : "animation",
    name: `Creation ${String(index).padStart(4, "0")}`,
    description: index % 10 === 0 ? "vampire boss" : "ordinary homebrew",
    visibility: "ROOM", roomCode: "ROOM-1", tags: index % 10 === 0 ? ["undead"] : ["general"], content: { index }
  }, context)).map((asset, index) => ({ ...asset, updatedAtMillis: index }));
  const matches = sortWorkshopAssets(assets.filter((asset) => matchesWorkshopAsset(asset, { search: "vampire", assetType: "animation", tag: "undead" })), "updated");
  assert.equal(matches.length, 500);
  assert.ok(matches[0].updatedAtMillis > matches.at(-1).updatedAtMillis);
  assert.ok(performance.now() - start < 1500, "5000 summaries should filter without rendering full payloads");
});

test("the unified registry supports current and future reusable content without one schema", () => {
  for (const type of ["monster", "magic-item", "weapon", "armor", "spell", "animation", "npc", "map", "encounter", "summon", "feat", "class", "subclass", "background", "species", "condition", "effect", "other"]) {
    assert.ok(WORKSHOP_ASSET_TYPES.includes(type), type);
    assert.equal(getWorkshopTypeDefinition(type).id, type);
  }
  assert.equal(matchesWorkshopType("weapon", "item"), true);
  assert.equal(matchesWorkshopType("armor", "item"), true);
  assert.equal(matchesWorkshopType("spell", "item"), false);
  const monsterAsset = normalizeWorkshopAsset({ assetId: "library_monster", assetType: "monster", name: "Skeleton King", description: "Undead ruler", tags: ["boss", "necrotic"], visibility: "ROOM", content: { cr: "9", size: "Large", type: "Undead" } }, { authorUid: "author", authorName: "Aster", roomCode: "ROOM-1" });
  assert.deepEqual(monsterAsset.typeMetadata, { cr: "9", size: "Large", creatureType: "Undead" });
  const card = createWorkshopCardModel(monsterAsset);
  assert.match(card.typeSummary, /CR 9/);
  assert.ok(card.quickActions.some((entry) => entry.id === "create-token"));
  assert.equal(createWorkshopTypeRegistry([{ id: "vehicle", label: "Vehicles", singular: "Vehicle", icon: "⛵", preview: "card" }]).get("vehicle").label, "Vehicles");
});

test("combined unified search, type, tags, collection and type-specific filters narrow results", () => {
  const base = { authorUid: "author", authorName: "Aster", roomCode: "ROOM-1" };
  const monsterAsset = { ...normalizeWorkshopAsset({ assetId: "skeleton_king", assetType: "monster", name: "Skeleton King", description: "Undead necrotic boss", tags: ["boss", "necrotic"], visibility: "ROOM", content: { cr: "9", size: "Large", type: "Undead" } }, base), collectionIds: ["undead_dungeon"], collectionNames: ["Undead Dungeon"] };
  const animationAsset = { ...normalizeWorkshopAsset({ assetId: "soul_portal", assetType: "animation", name: "Soul Portal", description: "Undead gateway", tags: ["necrotic"], visibility: "ROOM", content: { family: "magic", style: "portal" } }, base), collectionIds: ["undead_dungeon"], collectionNames: ["Undead Dungeon"] };
  const spellAsset = { ...normalizeWorkshopAsset({ assetId: "grave_burst", assetType: "spell", name: "Grave Burst", description: "A necrotic pulse", tags: ["necrotic"], visibility: "ROOM", content: { level: 3, school: "Necromancy", classes: ["Wizard"], damageType: "Necrotic" } }, base), collectionIds: ["undead_dungeon"], collectionNames: ["Undead Dungeon"] };
  const result = filterWorkshopAssets([monsterAsset, animationAsset], { search: "undead aster", assetType: "monster", tags: "boss, necrotic", collectionId: "undead_dungeon", cr: "9", creatureType: "undead", currentUserId: "author" });
  assert.deepEqual(result.map((entry) => entry.assetId), ["skeleton_king"]);
  assert.equal(filterWorkshopAssets([monsterAsset, animationAsset, spellAsset], { search: "Undead Dungeon" }).length, 3);
  assert.deepEqual(filterWorkshopAssets([monsterAsset, animationAsset, spellAsset], { assetType: "spell", level: "3", school: "necro", className: "wizard", damageType: "necrotic" }).map((entry) => entry.assetId), ["grave_burst"]);
});

test("recently used records stay lightweight and account-scoped", () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) || null, setItem: (key, entry) => values.set(key, entry) };
  let uid = "user-a";
  const recent = createWorkshopRecentStore({ storage, getUserId: () => uid, limit: 3 });
  recent.record({ assetId: "monster-1", assetType: "monster", content: { huge: "not stored" } }, "create-token");
  assert.equal(recent.list()[0].assetId, "monster-1");
  assert.equal("content" in recent.list()[0], false);
  assert.equal(applyWorkshopRecent([{ assetId: "monster-1" }], recent.list())[0].recentlyUsed, true);
  uid = "user-b";
  assert.deepEqual(recent.list(), []);
});

test("My Library combines owned creations and independent imported summaries", async () => {
  const { persistence, state } = setup();
  const original = await persistence.publish({ assetType: "monster", name: monster.name, visibility: "ROOM", content: monster });
  state.uid = "member-2"; state.name = "Bryn";
  await persistence.recordImport(original, "local-copy-1");
  const owned = await persistence.publish({ assetType: "spell", name: "Grave Burst", visibility: "PRIVATE", content: { level: 3, school: "Necromancy" } });
  let library = await persistence.listAssets({ scope: "library" });
  assert.deepEqual(new Set(library.entries.map((entry) => entry.assetId)), new Set([original.assetId, owned.assetId]));
  assert.equal(library.entries.find((entry) => entry.assetId === original.assetId).localRecordId, "local-copy-1");
  state.uid = "author-1"; await persistence.deleteAsset(original.assetId); state.uid = "member-2";
  library = await persistence.listAssets({ scope: "library" });
  assert.equal(library.entries.some((entry) => entry.assetId === original.assetId), true, "saved summary survives source deletion");
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
