import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createWorkshopSummary,
  normalizeWorkshopAsset
} from "../workshop/workshopModel.js";

const context = Object.freeze({
  authorUid: "normal-player-uid",
  authorName: "Normal Player",
  roomCode: "MEMBER-ROOM"
});

const fixtures = Object.freeze({
  "magic-item": {
    name: "Workshop Permission Test Sword",
    description: "A valid personal magic item.",
    itemType: "weapon",
    rarity: "rare",
    imageUrl: "https://example.com/sword.png",
    tags: ["weapon", "test"],
    effects: []
  },
  spell: { name: "Glass Bolt", level: 2, school: "Evocation", classes: ["Wizard"], damageType: "Force" },
  npc: { name: "Mira", species: "Human", role: "Guide", combat: { enabled: false } },
  encounter: { name: "Harbor Ambush", difficulty: "Hard", combatants: [], mapRef: null },
  monster: { name: "Ash Drake", cr: "4", size: "Large", type: "Dragon" },
  animation: { id: "ember-burst", name: "Ember Burst", family: "magic", style: "fire", sprite: "https://example.com/fire.png" },
  map: { name: "Glass Harbor", mapType: "battle", width: 2048, height: 1536, url: "https://example.com/map.png" }
});

function workshopSummary(assetType, visibility = "PUBLIC") {
  const content = fixtures[assetType];
  const normalized = normalizeWorkshopAsset({
    assetId: `${assetType.replace(/[^a-z]/g, "_")}_permission_test`,
    assetType,
    sourceType: assetType,
    sourceRecordId: `${assetType}-personal-record`,
    sourceKey: `${assetType}:${assetType}-personal-record`,
    name: content.name,
    description: content.description || "Reusable Homebrew God content.",
    thumbnailUrl: content.imageUrl || content.url || "",
    tags: content.tags || ["test"],
    visibility,
    roomCode: visibility === "ROOM" ? context.roomCode : "",
    content
  }, context);
  return createWorkshopSummary(normalized, {
    createdAt: "SERVER_TIMESTAMP",
    updatedAt: "SERVER_TIMESTAMP",
    createdAtMillis: 100,
    updatedAtMillis: 100
  });
}

function workshopRuleContract(rules) {
  const start = rules.indexOf("function validWorkshopSummary(assetId)");
  const end = rules.indexOf("match /users/{userId}", start);
  assert.ok(start >= 0 && end > start, "validWorkshopSummary must remain present in firestore.rules");
  const body = rules.slice(start, end);
  const allowlistMatch = body.match(/keys\(\)\.hasOnly\(\[([\s\S]*?)\]\)/);
  assert.ok(allowlistMatch, "Workshop summaries must retain a strict keys().hasOnly allowlist");
  const allowedKeys = new Set([...allowlistMatch[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]));
  return { body, allowedKeys };
}

test("real Workshop summaries and the strict Firestore allowlist cannot drift apart", () => {
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const { body, allowedKeys } = workshopRuleContract(rules);
  const summaries = Object.keys(fixtures).map((assetType) => workshopSummary(assetType));
  const generatedKeys = new Set(summaries.flatMap((summary) => Object.keys(summary)));

  assert.deepEqual(
    [...generatedKeys].sort(),
    [...allowedKeys].sort(),
    "Every generated Workshop summary key must be explicitly allowed, and stale rule-only keys must be removed"
  );
  assert.equal(allowedKeys.has("content"), false, "full content belongs only in version documents");
  assert.equal(allowedKeys.has("sourceType"), true);
  assert.equal(allowedKeys.has("typeMetadata"), true);
  assert.match(body, /sourceType is string/);
  assert.match(body, /sourceType\.size\(\) <= 80/);
  assert.match(body, /typeMetadata is map/);
  assert.match(body, /isRoomMember\(request\.resource\.data\.roomCode\)/);
});

test("a normal player's Magic Item Creator request produces a valid lightweight Workshop summary", () => {
  const creatorRequest = {
    assetType: "magic-item",
    sourceRecordId: "player-sword-1",
    sourceScope: `user:${context.authorUid}`,
    name: fixtures["magic-item"].name,
    description: fixtures["magic-item"].description,
    thumbnailUrl: fixtures["magic-item"].imageUrl,
    tags: fixtures["magic-item"].tags,
    content: fixtures["magic-item"]
  };
  const summary = createWorkshopSummary(normalizeWorkshopAsset({
    ...creatorRequest,
    assetId: "asset_magic_item_player_sword",
    sourceType: creatorRequest.assetType,
    sourceKey: `${creatorRequest.assetType}:${creatorRequest.sourceRecordId}`,
    visibility: "PUBLIC"
  }, context), { createdAtMillis: 100, updatedAtMillis: 100 });
  const { allowedKeys } = workshopRuleContract(readFileSync(new URL("../firestore.rules", import.meta.url), "utf8"));

  assert.equal(summary.authorUid, context.authorUid);
  assert.equal(summary.assetType, "magic-item");
  assert.equal(summary.sourceType, "magic-item");
  assert.equal(summary.sourceRecordId, "player-sword-1");
  assert.equal(summary.sourceKey, "magic-item:player-sword-1");
  assert.deepEqual(summary.typeMetadata, { itemType: "weapon", rarity: "rare", attunement: false });
  assert.equal(Object.hasOwn(summary, "content"), false);
  assert.ok(Object.keys(summary).every((key) => allowedKeys.has(key)));
});

test("normal signed-in users can shape PRIVATE, PUBLIC, and member ROOM summaries without DM metadata", () => {
  for (const visibility of ["PRIVATE", "PUBLIC", "ROOM"]) {
    const summary = workshopSummary("magic-item", visibility);
    assert.equal(summary.authorUid, context.authorUid);
    assert.equal(summary.visibility, visibility);
    assert.equal(summary.roomCode, visibility === "ROOM" ? context.roomCode : "");
    assert.equal(Object.hasOwn(summary, "dmUid"), false);
    assert.equal(Object.hasOwn(summary, "content"), false);
  }
});

test("Workshop ownership, version separation, and malformed-summary protections stay strict", () => {
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const { allowedKeys } = workshopRuleContract(rules);
  assert.equal(allowedKeys.has("unexpectedField"), false);
  assert.equal(allowedKeys.has("content"), false);
  assert.match(rules, /request\.resource\.data\.authorUid == request\.auth\.uid/);
  assert.match(rules, /resource\.data\.authorUid == request\.auth\.uid[\s\S]*validWorkshopSummary\(assetId\)/);
  assert.match(rules, /allow delete:[\s\S]*resource\.data\.authorUid == request\.auth\.uid/);
  assert.match(rules, /getAfter\([\s\S]*workshopAssets[\s\S]*authorUid[\s\S]*== request\.auth\.uid/);
  assert.match(rules, /request\.resource\.data\.keys\(\)\.hasOnly\(\[[\s\S]*'content'[\s\S]*\]\)/);
});
