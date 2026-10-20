import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import {
  MAX_FOG_POINTS,
  createDefaultFogSettings,
  fogOperationHasArea,
  normalizeFogOperation,
  normalizeFogSettings,
  sortFogOperations,
  stableFogMapId
} from "../battleMap/fogModel.js";

test("legacy maps have fog disabled until the DM explicitly enables it", () => {
  const legacy = createDefaultFogSettings("legacy-map");
  assert.equal(legacy.enabled, false);
  assert.equal(legacy.baseState, "hidden");
  assert.equal(legacy.revision, 0);
  assert.equal(normalizeFogSettings({}, { mapId: "legacy-map" }).enabled, false);
});

test("scene floors and legacy maps receive stable independent fog scopes", () => {
  const floorOne = stableFogMapId("scene:dungeon:floor:one");
  const floorTwo = stableFogMapId("scene:dungeon:floor:two");
  const legacy = stableFogMapId("https://example.test/maps/dungeon.webp");
  assert.notEqual(floorOne, floorTwo);
  assert.notEqual(floorOne, legacy);
  assert.equal(floorOne, stableFogMapId("scene:dungeon:floor:one"));
});

test("fog operations are bounded and replay in their saved order", () => {
  const points = Array.from({ length: 900 }, (_, index) => ({
    x: index * 2,
    y: index % 2 ? 900 : 100
  }));
  const brush = normalizeFogOperation({
    id: "brush-1",
    roomCode: "ROOM",
    mapId: "floor-one",
    revision: 3,
    mode: "reveal",
    tool: "brush",
    points,
    size: 999,
    order: 20
  }, { userId: "dm-1", now: 10 });
  const hide = normalizeFogOperation({
    id: "hide-1",
    roomCode: "ROOM",
    mapId: "floor-one",
    revision: 3,
    mode: "hide",
    tool: "rectangle",
    start: { x: 20, y: 30 },
    end: { x: 80, y: 90 },
    order: 30
  }, { userId: "dm-1", now: 11 });
  assert.ok(brush.points.length <= MAX_FOG_POINTS);
  assert.equal(brush.size, 400);
  assert.equal(fogOperationHasArea(brush), true);
  assert.equal(fogOperationHasArea(hide), true);
  assert.deepEqual(sortFogOperations([hide, brush]).map((entry) => entry.id), ["brush-1", "hide-1"]);
});

test("Fog of War rules remain DM-write and room-member-read only", () => {
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const authoritativeRulesUrl = new URL("../../Firebase.js", import.meta.url);
  assert.ok(existsSync(authoritativeRulesUrl));
  assert.equal(
    readFileSync(authoritativeRulesUrl, "utf8").replace(/\r\n/g, "\n"),
    rules.replace(/\r\n/g, "\n")
  );
  const settingsRules = rules.slice(
    rules.indexOf("match /fogSettings/{mapId}"),
    rules.indexOf("match /fogOperations/{operationId}")
  );
  const operationRules = rules.slice(
    rules.indexOf("match /fogOperations/{operationId}"),
    rules.indexOf("match /maps/{mapId}")
  );
  assert.match(settingsRules, /allow read:\s*if isRoomMember\(roomCode\)/);
  assert.match(settingsRules, /isRoomDm\(roomCode\)/);
  assert.match(operationRules, /allow read:\s*if isRoomMember\(roomCode\)/);
  assert.match(operationRules, /allow create:[\s\S]*isRoomDm\(roomCode\)/);
  assert.match(operationRules, /allow update:\s*if false/);
  assert.match(rules, /request\.resource\.data\.points\.size\(\) <= 512/);
});

test("app integration cleans up Fog of War listeners and room-owned records", () => {
  const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const policy = readFileSync(new URL("../rooms/roomDeletionPolicy.js", import.meta.url), "utf8");
  const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(app, /createFogOfWarSystem/);
  assert.match(app, /fogOfWarSystem\?\.disconnect\(\)/);
  assert.match(app, /fogOfWarSystem\?\.syncContext\(\)/);
  assert.match(policy, /"fogSettings"/);
  assert.match(policy, /"fogOperations"/);
  assert.match(index, /battleMap\/fogOfWar\.css/);
});
