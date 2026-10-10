import assert from "node:assert/strict";
import test from "node:test";
import { performance } from "node:perf_hooks";
import {
  createAccountLibraryIndex,
  createAccountLibraryIndexEntry
} from "../library/accountLibraryIndex.js";
import { createAccountLibraryAdapter } from "../library/adapters/accountLibraryAdapter.js";
import { createLibraryAggregator } from "../library/libraryAggregator.js";
import { copyLibraryRecordToRoom } from "../library/copyToRoom.js";
import { filterWorkshopAssets } from "../workshop/workshopFilters.js";

function memoryFirestore() {
  const records = new Map();
  let generated = 0;
  let documentReads = 0;
  const path = (segments) => segments.map((part) => typeof part === "object" ? part.path : String(part)).join("/").replace(/\/+/g, "/");
  const ref = (kind, value) => ({ kind, path: value, id: value.split("/").at(-1) });
  const db = {};
  const collection = (_db, ...segments) => ref("collection", path(segments));
  const doc = (_db, ...segments) => ref("document", path(segments));
  const getDoc = async (reference) => {
    documentReads += 1;
    return {
      id: reference.id,
      ref: reference,
      exists: () => records.has(reference.path),
      data: () => structuredClone(records.get(reference.path) || {})
    };
  };
  const setDoc = async (reference, value, options = {}) => {
    const previous = records.get(reference.path) || {};
    records.set(reference.path, structuredClone(options.merge ? { ...previous, ...value } : value));
  };
  const updateDoc = async (reference, value) => setDoc(reference, value, { merge: true });
  const deleteDoc = async (reference) => { records.delete(reference.path); };
  const orderBy = (field, direction = "asc") => ({ type: "orderBy", field, direction });
  const limit = (value) => ({ type: "limit", value });
  const startAfter = (snapshot) => ({ type: "startAfter", snapshot });
  const query = (reference, ...constraints) => ({ ...reference, kind: "query", constraints });
  const getDocs = async (reference) => {
    const prefix = `${reference.path}/`;
    let documents = [...records]
      .filter(([key]) => key.startsWith(prefix) && !key.slice(prefix.length).includes("/"))
      .map(([key, value]) => ({ id: key.split("/").at(-1), ref: ref("document", key), data: () => structuredClone(value) }));
    for (const constraint of reference.constraints || []) {
      if (constraint.type === "orderBy") {
        const direction = constraint.direction === "desc" ? -1 : 1;
        documents.sort((left, right) => direction * ((Number(left.data()[constraint.field]) || 0) - (Number(right.data()[constraint.field]) || 0)) || left.id.localeCompare(right.id));
      }
      if (constraint.type === "startAfter") {
        const index = documents.findIndex((entry) => entry.id === constraint.snapshot?.id);
        documents = index >= 0 ? documents.slice(index + 1) : documents;
      }
      if (constraint.type === "limit") documents = documents.slice(0, constraint.value);
    }
    return { docs: documents };
  };
  const addDoc = async (reference, value) => {
    const created = ref("document", `${reference.path}/copy-${++generated}`);
    await setDoc(created, value);
    return created;
  };
  const writeBatch = () => {
    const operations = [];
    return {
      set(reference, value, options) { operations.push(() => setDoc(reference, value, options)); },
      delete(reference) { operations.push(() => deleteDoc(reference)); },
      async commit() { for (const operation of operations) await operation(); }
    };
  };
  return {
    db, records, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
    orderBy, limit, startAfter, query, addDoc, writeBatch,
    serverTimestamp: () => "SERVER_TIMESTAMP",
    get documentReads() { return documentReads; }
  };
}

test("account index stores only lightweight campaign summaries", () => {
  const entry = createAccountLibraryIndexEntry({
    assetType: "monster",
    sourceRecordId: "lich-1",
    roomCode: "ROOM-2",
    roomName: "Night Campaign",
    ownerUid: "user-1",
    ownerName: "Aster",
    now: 200,
    record: {
      name: "Ash Lich", description: "Ancient foe", imageUrl: "https://example.com/lich.png",
      type: "Undead", size: "Medium", cr: "12", hp: 190,
      actions: [{ name: "Soul Drain", description: "A deliberately large full record." }]
    }
  });
  assert.equal(entry.libraryId, "monster:lich-1");
  assert.equal(entry.sourceRoomCode, "ROOM-2");
  assert.deepEqual(entry.metadata, { cr: "12", size: "Medium", type: "Undead" });
  assert.equal(Object.hasOwn(entry, "hp"), false);
  assert.equal(Object.hasOwn(entry, "actions"), false);
});

test("backfill repairs missing and stale entries once, then create/edit/delete keep the index synchronized", async () => {
  const store = memoryFirestore();
  store.records.set("users/user-1/rooms/ROOM-1", { role: "dm", roomCode: "ROOM-1", roomName: "First Campaign" });
  store.records.set("users/user-1/rooms/ROOM-X", { role: "player", roomCode: "ROOM-X", roomName: "Someone Else's Campaign" });
  store.records.set("rooms/ROOM-1", { roomCode: "ROOM-1", dmUid: "user-1" });
  store.records.set("rooms/ROOM-1/monsters/monster-1", { name: "Skeleton", type: "Undead", updatedAtMillis: 10 });
  store.records.set("rooms/ROOM-1/maps/map-1", { name: "Crypt", url: "https://example.com/full-map.png", updatedAtMillis: 11 });
  store.records.set("users/user-1/libraryIndex/monster:stale", { assetType: "monster", sourceRoomCode: "ROOM-1", sourceRecordId: "stale" });
  let clock = 100;
  const index = createAccountLibraryIndex({
    ...store, getUserId: () => "user-1", getUserName: () => "Aster", now: () => clock
  });
  const repaired = await index.repair({ force: true });
  assert.deepEqual({ rooms: repaired.rooms, records: repaired.records }, { rooms: 1, records: 2 });
  assert.equal(store.records.has("users/user-1/libraryIndex/monster:monster-1"), true);
  assert.equal(store.records.has("users/user-1/libraryIndex/map:map-1"), true);
  assert.equal(store.records.get("users/user-1/libraryIndex/map:map-1").thumbnailUrl, "", "the card index must not fall back to loading the full map image");
  assert.equal(store.records.has("users/user-1/libraryIndex/monster:stale"), false);
  assert.equal((await index.ensure()).reason, "fresh");

  clock = 200;
  await index.syncNative({ assetType: "monster", sourceRecordId: "monster-1", roomCode: "ROOM-1", roomName: "First Campaign", record: { name: "Skeleton Captain", updatedAtMillis: clock } });
  assert.equal(store.records.get("users/user-1/libraryIndex/monster:monster-1").name, "Skeleton Captain");
  await index.removeNative("monster", "monster-1");
  assert.equal(store.records.has("users/user-1/libraryIndex/monster:monster-1"), false);
});

test("account index removes proven-deleted campaigns and keeps incomplete repairs stale", async () => {
  const store = memoryFirestore();
  store.records.set("users/user-1/rooms/ROOM-DELETED", {
    role: "dm",
    roomCode: "ROOM-DELETED"
  });
  store.records.set("users/user-1/rooms/ROOM-OFFLINE", {
    role: "dm",
    roomCode: "ROOM-OFFLINE"
  });
  store.records.set("rooms/ROOM-OFFLINE", {
    roomCode: "ROOM-OFFLINE",
    dmUid: "user-1"
  });
  store.records.set("users/user-1/libraryIndex/monster:deleted", {
    assetType: "monster",
    sourceRoomCode: "ROOM-DELETED",
    sourceRecordId: "deleted"
  });
  store.records.set("users/user-1/libraryIndex/map:offline", {
    assetType: "map",
    sourceRoomCode: "ROOM-OFFLINE",
    sourceRecordId: "offline"
  });
  const getDocs = async (reference) => {
    if (reference.path === "rooms/ROOM-OFFLINE/maps") {
      const error = new Error("network unavailable");
      error.code = "unavailable";
      throw error;
    }
    return store.getDocs(reference);
  };
  const index = createAccountLibraryIndex({
    ...store,
    getDocs,
    getUserId: () => "user-1",
    getUserName: () => "Aster",
    now: () => 500
  });

  const result = await index.repair({ force: true });

  assert.equal(result.incomplete, true);
  assert.deepEqual(result.deletedRooms, ["ROOM-DELETED"]);
  assert.deepEqual(result.incompleteRooms, ["ROOM-OFFLINE"]);
  assert.equal(
    store.records.has("users/user-1/libraryIndex/monster:deleted"),
    false
  );
  assert.equal(
    store.records.has("users/user-1/libraryIndex/map:offline"),
    true
  );
  assert.equal(
    store.records.get("users/user-1").libraryIndexRepairIncomplete,
    true
  );
  assert.equal(
    Object.hasOwn(
      store.records.get("users/user-1"),
      "libraryIndexRepairedAtMillis"
    ),
    false
  );
});

test("cross-campaign copy creates a new independent record and preserves provenance", async () => {
  const store = memoryFirestore();
  const source = { id: "monster-1", name: "Ash Drake", hp: 99, roomCode: "ROOM-OLD" };
  const before = structuredClone(source);
  const copied = await copyLibraryRecordToRoom({
    ...store,
    asset: { libraryId: "monster:monster-1", assetType: "monster", sourceRecordId: "monster-1", sourceRoomCode: "ROOM-OLD" },
    content: source,
    roomCode: "ROOM-NEW",
    roomData: { dmUid: "dm-1", dmName: "Aster" },
    user: { uid: "dm-1", displayName: "Aster" },
    now: 1234
  });
  assert.equal(copied.recordId, "copy-1");
  assert.equal(copied.record.roomCode, "ROOM-NEW");
  assert.equal(copied.record.copiedFromLibraryId, "monster:monster-1");
  assert.equal(copied.record.copiedFromRoomCode, "ROOM-OLD");
  assert.equal(copied.record.copiedFromRecordId, "monster-1");
  assert.equal(copied.record.revision, 2);
  assert.deepEqual(source, before, "the original campaign record must remain untouched");
  assert.equal(store.records.get("rooms/ROOM-NEW/monsters/copy-1").id, "copy-1");
  assert.equal(store.records.get("rooms/ROOM-NEW/monsters/copy-1").revision, 2);
});

test("account adapter paginates 100, 500, 1000 and 5000 summaries without loading full assets", async () => {
  for (const total of [100, 500, 1000, 5000]) {
    const store = memoryFirestore();
    for (let index = 0; index < total; index += 1) {
      const assetType = index % 2 ? "monster" : "map";
      const sourceRecordId = `${assetType}-${index}`;
      store.records.set(`users/user-1/libraryIndex/${assetType}:${sourceRecordId}`, {
        libraryId: `${assetType}:${sourceRecordId}`, assetType, sourceRecordId,
        sourceRoomCode: `ROOM-${index % 5}`, sourceRoomName: `Campaign ${index % 5}`,
        name: `Asset ${index}`, ownerUid: "user-1", updatedAtMillis: index + 1,
        thumbnailUrl: `https://example.com/thumb-${index}.png`
      });
    }
    const adapter = createAccountLibraryAdapter({ ...store, getUserId: () => "user-1", ensureIndex: async () => null });
    let cursor = null;
    let readCount = 0;
    let loaded = 0;
    const started = performance.now();
    do {
      const page = await adapter.listPage({ cursor, pageSize: 50 });
      assert.ok(page.entries.every((entry) => !Object.hasOwn(entry, "content") && !Object.hasOwn(entry, "actions") && !Object.hasOwn(entry, "url")));
      loaded += page.entries.length;
      readCount += page.readCount;
      cursor = page.hasMore ? page.cursor : null;
      if (!page.hasMore) break;
    } while (cursor);
    assert.equal(loaded, total);
    assert.equal(readCount, total);
    assert.equal(store.documentReads, 0, "card pagination must not load authoritative records");
    assert.ok(performance.now() - started < 5000, `${total} lightweight summaries should paginate within the regression budget`);
  }
});

test("collections resolve referenced summaries beyond the first page without scanning the full library", async () => {
  const store = memoryFirestore();
  for (let index = 0; index < 75; index += 1) {
    store.records.set(`users/user-1/libraryIndex/monster:monster-${index}`, {
      libraryId: `monster:monster-${index}`, assetType: "monster", sourceRecordId: `monster-${index}`,
      sourceRoomCode: "ROOM-1", sourceRoomName: "Campaign", name: `Monster ${index}`,
      ownerUid: "user-1", updatedAtMillis: 1000 - index
    });
  }
  const adapter = createAccountLibraryAdapter({ ...store, getUserId: () => "user-1", ensureIndex: async () => null });
  const aggregator = createLibraryAggregator({
    adapters: [adapter],
    persistence: {
      async listOwnedSummaries() { return []; },
      async listLibraryState() { return { favoriteIds: new Set(), imports: new Map(), collections: [] }; }
    },
    getUserId: () => "user-1"
  });
  const first = await aggregator.listPage({ pageSize: 50 });
  assert.equal(first.entries.some((entry) => entry.libraryId === "monster:monster-70"), false);
  const resolved = await aggregator.resolveLibraryIds(["monster:monster-70"]);
  assert.deepEqual(resolved.entries.map((entry) => entry.libraryId), ["monster:monster-70"]);
  assert.equal(resolved.metrics.summaryReads, 1);
});

test("search, type, campaign and collection filters compose", () => {
  const assets = [
    { assetId: "monster:m1", assetType: "monster", name: "Ash Lich", description: "Undead boss", tags: ["boss"], sourceKind: "campaign", sourceRoomCode: "ROOM-2", collectionIds: ["villains"] },
    { assetId: "map:m1", assetType: "map", name: "Ash Crypt", description: "Undead lair", tags: ["boss"], sourceKind: "campaign", sourceRoomCode: "ROOM-2", collectionIds: ["villains"] },
    { assetId: "monster:m2", assetType: "monster", name: "Ash Knight", description: "Mortal guard", tags: ["boss"], sourceKind: "campaign", sourceRoomCode: "ROOM-1", collectionIds: ["villains"] },
    { assetId: "animation:a1", assetType: "animation", name: "Ash Burst", description: "Personal effect", tags: ["boss"], sourceKind: "personal", collectionIds: ["villains"] }
  ];
  const filtered = filterWorkshopAssets(assets, {
    search: "ash undead", assetType: "monster", campaign: "room:ROOM-2",
    collectionId: "villains", tags: "boss", currentRoomCode: "ROOM-1"
  });
  assert.deepEqual(filtered.map((entry) => entry.assetId), ["monster:m1"]);
});
