import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildMapObjectInteractionPatch,
  findBlockingMapObject,
  findBlockingMapObjectOnPath,
  getNextMapObjectState,
  mapObjectMatchesContext,
  mapObjectToVisionWalls,
  measureMapObjectDistanceFeet,
  normalizeMapObject,
  objectCollectionForRecord,
  validateMapObjectInteraction
} from "../battleMap/objectModel.js";

const door = (overrides = {}) => normalizeMapObject({
  id: "door-1",
  roomCode: "ROOM-1",
  name: "Vault Door",
  type: "door",
  sceneId: "keep",
  floorId: "ground",
  mapId: "scene:keep:floor:ground",
  transform: { x: 50, y: 50, width: 10, height: 20, rotation: 0 },
  stateId: "closed",
  visibility: "shared",
  allowPlayers: true,
  interactionDistanceFeet: 10,
  revision: 3,
  ...overrides
}, "door-1");

test("map objects normalize into the shared object contract", () => {
  const object = door({ transform: { x: 120, y: -5, width: 0, height: 150, rotation: 500 } });
  assert.deepEqual(object.transform, { x: 100, y: 0, width: 1, height: 100, rotation: 360 });
  assert.equal(object.kind, "object");
  assert.equal(object.blocksMovement, true);
  assert.equal(object.blocksVision, true);
  assert.equal(object.schemaVersion, 1);
});

test("floor-scoped objects never appear or interact across floors", () => {
  const object = door();
  assert.equal(mapObjectMatchesContext(object, {
    mapId: object.mapId, sceneId: "keep", floorId: "ground"
  }), true);
  assert.equal(mapObjectMatchesContext(object, {
    mapId: "scene:keep:floor:upper", sceneId: "keep", floorId: "upper"
  }), false);
  const result = validateMapObjectInteraction({
    object,
    token: { id: "hero", sceneId: "keep", floorId: "upper" },
    context: { sceneId: "keep", floorId: "ground", mapId: object.mapId, distanceFeet: 0 }
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /another floor/i);
});

test("distance and locking gate players while the DM can override", () => {
  const object = door({ locked: true });
  const token = { id: "hero", sceneId: "keep", floorId: "ground", x: 52, y: 50 };
  const far = validateMapObjectInteraction({
    object: door(), token,
    context: { sceneId: "keep", floorId: "ground", mapId: object.mapId, distanceFeet: 15 }
  });
  assert.equal(far.ok, false);
  assert.match(far.reason, /within 10 ft/i);
  const locked = validateMapObjectInteraction({
    object, token,
    context: { sceneId: "keep", floorId: "ground", mapId: object.mapId, distanceFeet: 5 }
  });
  assert.equal(locked.ok, false);
  assert.match(locked.reason, /locked/i);
  assert.equal(validateMapObjectInteraction({
    object,
    isDm: true,
    context: { sceneId: "keep", floorId: "ground", mapId: object.mapId }
  }).ok, true);
});

test("door interactions are revisioned and update collision flags", () => {
  const object = door();
  assert.equal(getNextMapObjectState(object), "open");
  const patch = buildMapObjectInteractionPatch(object, {
    nextStateId: "open", userUid: "player-1", tokenId: "hero", now: 12
  });
  assert.equal(patch.revision, 4);
  assert.equal(patch.blocksMovement, false);
  assert.equal(patch.blocksVision, false);
  assert.equal(patch.lastInteractorTokenId, "hero");
  const context = { sceneId: "keep", floorId: "ground", mapId: object.mapId };
  assert.equal(findBlockingMapObject([object], { x: 50, y: 50 }, context)?.id, object.id);
  assert.equal(findBlockingMapObject([{ ...object, stateId: "open", blocksMovement: false }], { x: 50, y: 50 }, context), null);
  assert.equal(findBlockingMapObjectOnPath([object], { x: 30, y: 50 }, { x: 70, y: 50 }, context)?.id, object.id);
  assert.equal(findBlockingMapObjectOnPath([{ ...object, stateId: "open" }], { x: 30, y: 50 }, { x: 70, y: 50 }, context), null);
});

test("object distance honors the current grid scale", () => {
  assert.equal(measureMapObjectDistanceFeet(door(), { x: 60, y: 50 }, {
    viewportWidth: 640,
    viewportHeight: 640,
    pixelsPerSquare: 64,
    feetPerSquare: 5
  }), 5);
});

test("DM-only objects use a physically private collection", () => {
  assert.equal(objectCollectionForRecord(door()), "objects");
  assert.equal(objectCollectionForRecord(door({ visibility: "dm" })), "dmObjects");
});

test("closed sight-blocking objects become rotated vision-wall segments", () => {
  const walls = mapObjectToVisionWalls(door({
    transform: { x: 50, y: 50, width: 10, height: 20, rotation: 90 }
  }));
  assert.equal(walls.length, 4);
  assert.equal(walls.every((wall) => wall.id.startsWith("object-door-1-")), true);
  assert.equal(mapObjectToVisionWalls(door({ stateId: "open" })).length, 0);
});

test("interactive object integration keeps private storage, cleanup, and vision hooks wired", async () => {
  const [app, rules, deletionPolicy, vision] = await Promise.all([
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../firestore.rules", import.meta.url), "utf8"),
    readFile(new URL("../rooms/roomDeletionPolicy.js", import.meta.url), "utf8"),
    readFile(new URL("../battleMap/visionSystem.js", import.meta.url), "utf8")
  ]);
  assert.match(app, /createMapObjectSystem/);
  assert.match(app, /getAdditionalWalls:\s*\(\) => mapObjectSystem/);
  assert.match(app, /Map object animation was skipped/);
  assert.match(rules, /match \/objects\/\{objectId\}/);
  assert.match(rules, /match \/dmObjects\/\{objectId\}/);
  assert.match(rules, /interactionRadius/);
  assert.match(deletionPolicy, /name: "objects"/);
  assert.match(deletionPolicy, /name: "dmObjects"/);
  assert.match(vision, /getAdditionalWalls/);
});
