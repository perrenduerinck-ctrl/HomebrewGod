import test from "node:test";
import assert from "node:assert/strict";
import { createLibraryAggregator } from "../library/libraryAggregator.js";
import { createLibraryRecord, libraryIdFor } from "../library/libraryRecord.js";
import { createMonsterLibraryAdapter } from "../library/adapters/monsterLibraryAdapter.js";
import { createAnimationLibraryAdapter } from "../library/adapters/animationLibraryAdapter.js";
import { createMapLibraryAdapter } from "../library/adapters/mapLibraryAdapter.js";
import { filterWorkshopAssets } from "../workshop/workshopFilters.js";
import { normalizeWorkshopCollection, updateCollectionEntries } from "../workshop/workshopCollections.js";

const native = (assetType, count) => Array.from({ length: count }, (_, index) => createLibraryRecord({
  assetType,
  sourceType: assetType,
  sourceRecordId: `${assetType}_${index + 1}`,
  name: `${assetType} ${index + 1}`,
  ownerUid: "owner-1",
  ownerName: "Aster",
  metadata: assetType === "monster" ? { cr: String(index + 1), type: "Undead" } : assetType === "animation" ? { family: "magic" } : { mapType: "Dungeon" }
}));

const adapter = (sourceType, records) => ({
  sourceType,
  async listSummaries() { return records; },
  async load(sourceRecordId) { return { id: sourceRecordId, name: records.find((record) => record.sourceRecordId === sourceRecordId)?.name }; }
});

function persistence({ publications = [], imports = [], collections = [] } = {}) {
  return {
    async listOwnedSummaries() { return publications; },
    async listLibraryState() {
      return { favoriteIds: new Set(), imports: new Map(imports.map((entry) => [entry.assetId, entry])), collections };
    },
    async loadAsset(assetId) { return { ...publications.find((entry) => entry.assetId === assetId), content: { id: assetId } }; }
  };
}

test("My Library automatically aggregates 3 monsters, 4 animations, and 2 maps without Workshop records", async () => {
  const monsters = native("monster", 3);
  const animations = native("animation", 4);
  const maps = native("map", 2);
  const aggregator = createLibraryAggregator({
    adapters: [adapter("monster", monsters), adapter("animation", animations), adapter("map", maps)],
    persistence: persistence(),
    getUserId: () => "owner-1"
  });
  const records = await aggregator.list({ scope: "library" });
  assert.equal(records.length, 9);
  assert.equal(filterWorkshopAssets(records, { assetType: "monster" }).length, 3);
  assert.equal(filterWorkshopAssets(records, { assetType: "animation" }).length, 4);
  assert.equal(filterWorkshopAssets(records, { assetType: "map" }).length, 2);
  assert.ok(records.every((record) => !Object.hasOwn(record, "content")));
  assert.deepEqual(new Set(records.map((record) => record.libraryId)), new Set([...monsters, ...animations, ...maps].map((record) => record.libraryId)));
});

test("a native record and its Workshop publication deduplicate to one published library card", async () => {
  const [monster] = native("monster", 1);
  const publication = {
    assetId: "asset_monster_1",
    assetType: "monster",
    sourceType: "monster",
    sourceRecordId: monster.sourceRecordId,
    sourceKey: monster.sourceKey,
    name: monster.name,
    authorUid: "owner-1",
    authorName: "Aster",
    visibility: "PUBLIC",
    version: 3
  };
  const aggregator = createLibraryAggregator({ adapters: [adapter("monster", [monster])], persistence: persistence({ publications: [publication] }), getUserId: () => "owner-1" });
  const records = await aggregator.list({ scope: "library" });
  assert.equal(records.length, 1);
  assert.equal(records[0].libraryId, monster.libraryId);
  assert.equal(records[0].publishedAssetId, publication.assetId);
  assert.equal(records[0].publicationVisibility, "PUBLIC");
});

test("an imported Workshop monster resolves to its one authoritative native copy with provenance", async () => {
  const monster = createLibraryRecord({
    assetType: "monster",
    sourceType: "monster",
    sourceRecordId: "local_monster",
    name: "Imported Wight",
    ownerUid: "owner-1",
    sourceWorkshopAssetId: "asset_wight",
    sourceWorkshopVersion: 4,
    sourceAuthorUid: "other-author"
  });
  const importRecord = { assetId: "asset_wight", assetType: "monster", localRecordId: "local_monster", sourceWorkshopVersion: 4, sourceAuthorUid: "other-author", summary: { assetId: "asset_wight", assetType: "monster", name: "Imported Wight" } };
  const aggregator = createLibraryAggregator({ adapters: [adapter("monster", [monster])], persistence: persistence({ imports: [importRecord] }), getUserId: () => "owner-1" });
  const records = await aggregator.list({ scope: "library" });
  assert.equal(records.length, 1);
  assert.equal(records[0].libraryId, "monster:local_monster");
  assert.equal(records[0].importedFromWorkshop, true);
  assert.equal(records[0].sourceWorkshopAssetId, "asset_wight");
  assert.equal(records[0].sourceWorkshopVersion, 4);
  assert.equal(records[0].sourceAuthorUid, "other-author");
  assert.equal((await aggregator.load(records[0])).content.id, "local_monster");
});

test("collections support mixed library IDs, multiple membership, removal, and legacy Workshop IDs", () => {
  const legacy = normalizeWorkshopCollection({ collectionId: "legacy", name: "Legacy", assetIds: ["asset_old"] }, "owner-1");
  assert.deepEqual(legacy.assetIds, ["asset_old"]);
  assert.deepEqual(legacy.entries, []);
  let mixed = normalizeWorkshopCollection({ collectionId: "mixed", name: "Mixed", description: "Campaign set", entries: [] }, "owner-1");
  for (const id of [libraryIdFor("monster", "m1"), libraryIdFor("animation", "a1"), libraryIdFor("map", "map1")]) mixed = updateCollectionEntries(mixed, id, true);
  assert.equal(mixed.entries.length, 3);
  const second = updateCollectionEntries(normalizeWorkshopCollection({ collectionId: "bosses", name: "Bosses" }, "owner-1"), "monster:m1", true);
  assert.equal(second.entries.includes("monster:m1"), true);
  mixed = updateCollectionEntries(mixed, "monster:m1", false);
  assert.equal(mixed.entries.includes("monster:m1"), false);
  assert.equal(second.entries.includes("monster:m1"), true);
  assert.equal(mixed.description, "Campaign set");
});

test("native adapters read lightweight summaries and defer full records until load", async () => {
  const records = new Map([
    ["rooms/ROOM-1/monsters", [{ id: "monster_1", value: { name: "Wight", description: "Large full description", actions: [{ name: "Sword" }], cr: "3", size: "Medium", type: "Undead" } }]],
    ["users/owner-1/animations", [{ id: "animation_1", value: { definition: { id: "animation_1", name: "Soul Fire", description: "Blue flames", sprite: "https://example.com/large-sheet.png", family: "magic", style: "burst", ownership: { ownerId: "owner-1" } } } }]],
    ["rooms/ROOM-1/maps", [{ id: "map_1", value: { name: "Crypt", description: "Burial chamber", url: "https://example.com/large-map.png", mapType: "Dungeon", width: 30, height: 20 } }]]
  ]);
  const path = (...segments) => segments.join("/");
  const getDocs = async (reference) => ({
    docs: (records.get(reference) || []).map((entry) => ({ id: entry.id, data: () => entry.value }))
  });
  const getDoc = async (reference) => {
    const parent = reference.split("/").slice(0, -1).join("/");
    const id = reference.split("/").at(-1);
    const match = (records.get(parent) || []).find((entry) => entry.id === id);
    return { id, exists: () => Boolean(match), data: () => match?.value };
  };
  const options = {
    db: {}, collection: (_db, ...segments) => path(...segments), doc: (_db, ...segments) => path(...segments),
    getDocs, getDoc, getRoomCode: () => "ROOM-1", getUserId: () => "owner-1", getUserName: () => "Aster", getIsDM: () => true
  };
  const adapters = [createMonsterLibraryAdapter(options), createAnimationLibraryAdapter(options), createMapLibraryAdapter(options)];
  const summaries = (await Promise.all(adapters.map((entry) => entry.listSummaries()))).flat();
  assert.deepEqual(summaries.map((entry) => entry.libraryId), ["monster:monster_1", "animation:animation_1", "map:map_1"]);
  assert.ok(summaries.every((entry) => !Object.hasOwn(entry, "content") && !Object.hasOwn(entry, "actions") && !Object.hasOwn(entry, "sprite")));
  assert.equal((await adapters[0].load("monster_1")).actions[0].name, "Sword");
  assert.equal((await adapters[1].load("animation_1")).sprite, "https://example.com/large-sheet.png");
  assert.equal((await adapters[2].load("map_1")).url, "https://example.com/large-map.png");
});
