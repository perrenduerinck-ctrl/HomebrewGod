import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFloorTransitionPatch,
  createLegacyFloor,
  createStableMapScopeId,
  getConnectionsForFloor,
  getTokenHeightAboveFloor,
  normalizeConnection,
  normalizeFloor,
  resolveConnectionDestination,
  sortFloors,
  tokenMatchesFloor,
  validateFloorElevation
} from "../battleMap/sceneModel.js";
import { measureSpatialDistance } from "../battleMap/elevation.js";

const floor = (id, name, baseElevation, order = 0, mapUrl = `https://example.test/${id}.webp`) => normalizeFloor({
  id,
  sceneId: "house",
  roomCode: "ROOM-1",
  name,
  baseElevation,
  order,
  map: { id: `map-${id}`, name: `${name} map`, url: mapUrl, savedToLibrary: true }
}, id);

const stairs = normalizeConnection({
  id: "stairs-1",
  sceneId: "house",
  roomCode: "ROOM-1",
  name: "Main Stairs",
  type: "stairs",
  source: { floorId: "ground", x: 20, y: 30 },
  destination: { floorId: "second", x: 80, y: 70 },
  bidirectional: true,
  allowPlayers: true,
  movementCost: 10
}, "stairs-1");

test("a location supports ordered positive and negative floors without a hard limit", () => {
  const records = [
    floor("ground", "Ground", 0),
    floor("second", "Second", 15),
    floor("basement", "Basement", -15)
  ];
  assert.deepEqual(sortFloors(records).map((entry) => entry.id), [
    "second", "ground", "basement"
  ]);

  const dungeon = sortFloors(Array.from({ length: 20 }, (_, index) => (
    floor(`b${index + 1}`, `Dungeon B${index + 1}`, -20 * (index + 1), index)
  )));
  assert.equal(dungeon.length, 20);
  assert.equal(dungeon[0].baseElevation, -20);
  assert.equal(dungeon.at(-1).baseElevation, -400);
});

test("floors retain independent saved-map references and tolerate missing images", () => {
  const ground = floor("ground", "Ground", 0, 0, "https://example.test/ground.webp");
  const upper = floor("upper", "Upper", 10, 1, "https://example.test/upper.webp");
  const missing = floor("missing", "Missing", 20, 2, "");
  assert.notEqual(ground.map.id, upper.map.id);
  assert.notEqual(ground.map.url, upper.map.url);
  assert.equal(missing.map.url, "");
  assert.equal(missing.name, "Missing");
});

test("floor view filtering never relocates tokens and preserves legacy tokens", () => {
  const token = { id: "hero", sceneId: "house", floorId: "ground", x: 18, y: 42, elevation: 20 };
  assert.equal(tokenMatchesFloor(token, { sceneId: "house", floorId: "ground" }), true);
  assert.equal(tokenMatchesFloor(token, { sceneId: "house", floorId: "second" }), false);
  assert.deepEqual({ x: token.x, y: token.y, elevation: token.elevation }, { x: 18, y: 42, elevation: 20 });
  assert.equal(tokenMatchesFloor({ id: "legacy" }, {}), true);
  assert.equal(tokenMatchesFloor({ id: "legacy" }, { sceneId: "house", floorId: "ground" }), false);
});

test("stable drawing scope IDs isolate floors even when they reuse one image", () => {
  assert.equal(createStableMapScopeId("house", "ground"), "scene:house:floor:ground");
  assert.equal(createStableMapScopeId("house", "second"), "scene:house:floor:second");
  assert.notEqual(
    createStableMapScopeId("house", "ground"),
    createStableMapScopeId("house", "second")
  );
});

test("bidirectional stairs resolve in both directions", () => {
  assert.equal(resolveConnectionDestination(stairs, "ground").to.floorId, "second");
  assert.equal(resolveConnectionDestination(stairs, "second").to.floorId, "ground");
  assert.equal(getConnectionsForFloor([stairs], "basement").length, 0);
});

test("a confirmed connection moves the existing token and keeps its flight height", () => {
  const destination = floor("second", "Second", 15);
  const token = {
    id: "wizard",
    sceneId: "house",
    floorId: "ground",
    x: 20,
    y: 30,
    elevation: 30,
    heightAboveFloor: 30,
    currentHp: 22,
    conditions: ["blessed"]
  };
  const patch = buildFloorTransitionPatch({
    token,
    sceneId: "house",
    floor: destination,
    connection: stairs,
    now: 100
  });
  assert.deepEqual({ floorId: patch.floorId, x: patch.x, y: patch.y }, {
    floorId: "second", x: 80, y: 70
  });
  assert.equal(patch.elevation, 45);
  assert.equal(patch.heightAboveFloor, 30);
  assert.equal(token.currentHp, 22);
  assert.deepEqual(token.conditions, ["blessed"]);
});

test("canceled transitions have no mutation path and invalid routes are rejected", () => {
  assert.throws(() => buildFloorTransitionPatch({
    token: { floorId: "basement", x: 1, y: 2 },
    sceneId: "house",
    floor: floor("second", "Second", 15),
    connection: stairs
  }), /does not lead/i);
  assert.throws(() => buildFloorTransitionPatch({
    token: { floorId: "ground" },
    sceneId: "house",
    floor: floor("second", "Second", 15)
  }), /connection is required/i);
});

test("DM override changes only floor placement metadata", () => {
  const patch = buildFloorTransitionPatch({
    token: { id: "fighter", floorId: "ground", x: 9, y: 11, elevation: 0 },
    sceneId: "house",
    floor: floor("basement", "Basement", -15),
    dmOverride: true,
    now: 200
  });
  assert.equal(patch.floorId, "basement");
  assert.equal(patch.elevation, -15);
  assert.equal(patch.lastFloorConnectionId, "");
  assert.equal(Object.hasOwn(patch, "initiative"), false);
  assert.equal(Object.hasOwn(patch, "currentHp"), false);
});

test("flying changes absolute elevation without automatically changing floors", () => {
  const ground = floor("ground", "Ground", 0);
  const dragon = { sceneId: "house", floorId: "ground", elevation: 30 };
  assert.equal(getTokenHeightAboveFloor(dragon, ground), 30);
  assert.equal(tokenMatchesFloor(dragon, { sceneId: "house", floorId: "ground" }), true);
  assert.equal(tokenMatchesFloor(dragon, { sceneId: "house", floorId: "second" }), false);
});

test("cross-floor spatial distance combines horizontal and vertical distance", () => {
  const measurement = measureSpatialDistance({
    horizontalFeet: 20,
    startElevationFeet: 0,
    endElevationFeet: 15
  });
  assert.equal(measurement.verticalFeet, 15);
  assert.equal(measurement.distanceFeet, 25);
});

test("legacy conversion reuses the current map and validates supported elevation bounds", () => {
  const legacy = createLegacyFloor({
    sceneId: "house",
    roomCode: "ROOM-1",
    currentMap: { id: "map-1", name: "House", url: "https://example.test/house.webp" }
  });
  assert.equal(legacy.name, "Ground Floor");
  assert.equal(legacy.baseElevation, 0);
  assert.equal(legacy.map.id, "map-1");
  assert.equal(validateFloorElevation(-1000), -1000);
  assert.equal(validateFloorElevation(1000), 1000);
  assert.throws(() => validateFloorElevation(-1001), /between -1000 and 1000/i);
});
