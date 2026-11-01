import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildRoomMembershipBan,
  normalizeRoomMember
} from "../rooms/memberAccessManager.js";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("membership records and deny-list entries stay bounded and preserve stable identity", () => {
  assert.deepEqual(
    normalizeRoomMember({
      uid: "player-1",
      displayName: "  Test Player  ",
      role: "player"
    }),
    {
      uid: "player-1",
      displayName: "Test Player",
      role: "player"
    }
  );

  assert.deepEqual(
    buildRoomMembershipBan({
      roomCode: "ABC-123",
      member: {
        uid: "player-1",
        displayName: "Test Player",
        role: "player"
      },
      bannedByUid: "dm-1",
      bannedByName: "Game Master",
      createdAtMillis: 123
    }),
    {
      uid: "player-1",
      displayName: "Test Player",
      bannedByUid: "dm-1",
      bannedByName: "Game Master",
      reason: "Removed by the room DM",
      createdAtMillis: 123
    }
  );

  assert.throws(
    () => buildRoomMembershipBan({
      roomCode: "ABC-123",
      member: { uid: "dm-1", displayName: "DM", role: "dm" },
      bannedByUid: "dm-1",
      bannedByName: "DM"
    }),
    /cannot be blocked/
  );
});

test("room membership bans are private, DM-managed, enforced on joins, and cleaned with the room", () => {
  const rules = read("../firestore.rules");
  const app = read("../app.js");
  const index = read("../index.html");
  const deletionPolicy = read("../rooms/roomDeletionPolicy.js");

  assert.match(rules, /function membershipBanPath\(roomCode, uid\)/);
  assert.match(
    rules,
    /exists\(membershipPath\(roomCode, request\.auth\.uid\)\)[\s\S]*!exists\(membershipBanPath\(roomCode, request\.auth\.uid\)\)/
  );
  assert.match(
    rules,
    /match \/players\/\{playerUid\}[\s\S]*allow create:[\s\S]*!exists\(membershipBanPath\(roomCode, playerUid\)\)/
  );
  assert.match(
    rules,
    /match \/bannedUsers\/\{bannedUid\}[\s\S]*allow read:[\s\S]*if isRoomDm\(roomCode\)/
  );
  assert.match(app, /createRoomMemberAccessManager/);
  assert.match(app, /roomMemberAccessManager\.setContext/);
  assert.match(app, /roomMemberAccessManager\.disconnect/);
  assert.match(app, /You no longer have access to this campaign/);
  assert.match(index, /id="roomMemberAccessPanel"/);
  assert.match(index, /Remove a saved player membership and block that account/);
  assert.match(deletionPolicy, /name: "bannedUsers"/);
});
