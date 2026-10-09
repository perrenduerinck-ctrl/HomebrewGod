import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ROOM_CLIENT_CLEANUP_COLLECTIONS,
  ROOM_OWNED_COLLECTIONS,
  ROOM_RETAINED_PRIVATE_COLLECTIONS,
  createRoomDeletionProgress
} from "../rooms/roomDeletionPolicy.js";

test("room deletion inventory covers every room-owned collection", () => {
  const names = ROOM_OWNED_COLLECTIONS.map((entry) => entry.name);
  assert.deepEqual(names, [
    "players", "activePlayers", "maps", "puzzleTiles", "tokens",
    "characters", "monsters", "classes", "species", "backgrounds",
    "animations", "combatEffects", "effects", "sharedJournal",
    "personalJournal", "dmJournal", "sharedDrawings", "dmDrawings"
  ]);
  assert.equal(new Set(names).size, names.length);
  assert.deepEqual(
    ROOM_RETAINED_PRIVATE_COLLECTIONS.map((entry) => entry.name),
    ["personalJournal"]
  );
  assert.equal(
    ROOM_CLIENT_CLEANUP_COLLECTIONS.some((entry) => entry.name === "personalJournal"),
    false,
    "DM cleanup must never enumerate private player notes"
  );
});

test("room deletion progress remains explicit and resumable", () => {
  const progress = createRoomDeletionProgress(["players", "maps"], {
    status: "incomplete",
    failedCollection: "tokens",
    errorMessage: "simulated batch failure",
    updatedAtMillis: 123
  });
  assert.equal(progress.status, "incomplete");
  assert.deepEqual(progress.completedCollections, ["players", "maps"]);
  assert.equal(progress.remainingCollections.includes("tokens"), true);
  assert.equal(progress.retainedPrivateCollections.includes("personalJournal"), true);
  assert.equal(progress.failedCollection, "tokens");
  assert.equal(progress.updatedAtMillis, 123);
});

test("room deletion keeps failed campaigns locked and rules block tombstoned writes", () => {
  const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");

  assert.match(app, /ROOM_CLIENT_CLEANUP_COLLECTIONS/);
  assert.match(app, /status:\s*"incomplete"/);
  assert.match(app, /campaign remains locked/);
  assert.doesNotMatch(app, /deletingAt:\s*deleteField\(\)/);
  assert.match(rules, /function roomAcceptsWrites\(roomCode\)/);
  assert.match(rules, /function deletionLifecycleFieldsOnly\(\)/);
  assert.match(rules, /allow create:\s*if roomAcceptsWrites\(roomCode\)\s*&& isRoomMember\(roomCode\)/);
  assert.match(rules, /match \/maps\/\{mapId\}[\s\S]*?allow create, update:\s*if roomAcceptsWrites\(roomCode\)/);
  assert.match(rules, /match \/tokens\/\{tokenId\}[\s\S]*?allow update:\s*if roomAcceptsWrites\(roomCode\)/);
  assert.match(rules, /match \/personalJournal\/\{entryId\}[\s\S]*?allow read:\s*if isRoomMember\(roomCode\)\s*&& resource\.data\.ownerUid == request\.auth\.uid/);
});
