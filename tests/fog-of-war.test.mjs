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
import {
  buildVisibilityPolygon,
  createExplorationGrid,
  effectiveVisionDistance,
  explorationGridToPath,
  inferCharacterDarkvision,
  markExploredPolygons,
  stableVisionDocumentId
} from "../battleMap/visionModel.js";

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
  if (existsSync(authoritativeRulesUrl)) {
    assert.equal(
      readFileSync(authoritativeRulesUrl, "utf8").replace(/\r\n/g, "\n"),
      rules.replace(/\r\n/g, "\n")
    );
  }
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
  assert.match(policy, /"visionWalls"/);
  assert.match(policy, /"visionExploration"/);
  assert.match(index, /battleMap\/fogOfWar\.css/);
  assert.match(index, /battleMap\/visionSystem\.css/);
});

test("token vision stops at a solid wall", () => {
  const polygon = buildVisibilityPolygon({
    origin: { x: 250, y: 500 },
    radius: 400,
    walls: [{
      id: "wall-one",
      start: { x: 500, y: 0 },
      end: { x: 500, y: 1000 }
    }],
    rayCount: 96
  });
  const east = polygon.reduce((furthest, point) => point.x > furthest.x ? point : furthest, polygon[0]);
  const west = polygon.reduce((furthest, point) => point.x < furthest.x ? point : furthest, polygon[0]);
  assert.ok(east.x < 501, `expected eastward sight to stop at wall, received ${east.x}`);
  assert.ok(west.x <= 0.5, `expected unobstructed westward sight to reach map edge, received ${west.x}`);
});

test("darkvision is inherited from current character data", () => {
  const character = {
    species: {
      traits: [{ id: "elf-darkvision", name: "Darkvision", summary: "See in darkness out to 60 feet." }]
    },
    featMechanics: {
      senses: [{ sense: "darkvision", range: 120 }]
    }
  };
  assert.equal(inferCharacterDarkvision(character), 120);
  assert.equal(effectiveVisionDistance({ type: "player", linkedCharacter: character }), 120);
});

test("exploration remains remembered after current vision moves", () => {
  const first = buildVisibilityPolygon({ origin: { x: 220, y: 500 }, radius: 150 });
  const second = buildVisibilityPolygon({ origin: { x: 780, y: 500 }, radius: 150 });
  const initial = createExplorationGrid({ resolution: 32 });
  const exploredFirst = markExploredPolygons(initial, [first]);
  const exploredSecond = markExploredPolygons(exploredFirst, [second]);
  const firstCount = [...exploredFirst.cells].filter((cell) => cell === "1").length;
  const secondCount = [...exploredSecond.cells].filter((cell) => cell === "1").length;
  assert.ok(firstCount > 0);
  assert.ok(secondCount > firstCount);
  assert.match(explorationGridToPath(exploredSecond), /^M/);
  assert.equal(stableVisionDocumentId("player-1", "floor-one"), stableVisionDocumentId("player-1", "floor-one"));
  assert.notEqual(stableVisionDocumentId("player-1", "floor-one"), stableVisionDocumentId("player-1", "floor-two"));
});

test("vision rules keep walls DM-authored and exploration owner-private", () => {
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const wallRules = rules.slice(
    rules.indexOf("match /visionWalls/{wallId}"),
    rules.indexOf("match /visionExploration/{explorationId}")
  );
  const explorationRules = rules.slice(
    rules.indexOf("match /visionExploration/{explorationId}"),
    rules.indexOf("match /maps/{mapId}")
  );
  assert.match(wallRules, /allow create:[\s\S]*isRoomDm\(roomCode\)/);
  assert.match(wallRules, /allow update:\s*if false/);
  assert.match(explorationRules, /resource\.data\.ownerUid == request\.auth\.uid/);
  assert.match(explorationRules, /request\.resource\.data\.ownerUid == resource\.data\.ownerUid/);
  assert.match(rules, /cells\.size\(\) == resolution \* resolution/);
});

test("secure hidden-enemy storage is explicitly documented", () => {
  const privacy = readFileSync(new URL("../docs/FOG-OF-WAR-PRIVACY.md", import.meta.url), "utf8");
  assert.match(privacy, /tokens\/{tokenId}/);
  assert.match(privacy, /dmTokens\/{tokenId}/);
  assert.match(privacy, /readable only by the room DM/i);
  assert.match(privacy, /one Firestore transaction/i);
  assert.match(privacy, /Firestore Emulator coverage/i);
});
