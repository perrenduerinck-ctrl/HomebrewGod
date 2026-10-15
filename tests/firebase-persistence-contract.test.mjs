import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  planCharacterWrite
} from "../characterCreator/persistenceContract.js";
import {
  buildSafePersistenceDiagnostic,
  friendlyServiceError
} from "../shared/securityPersistence.js";

test("new character drafts always begin at Firestore revision one", () => {
  assert.deepEqual(
    planCharacterWrite({
      currentCharacterId: null,
      loadedRevision: 0
    }),
    {
      createsDocument: true,
      savedId: null,
      expectedRevision: 0,
      writeRevision: 1
    }
  );

  assert.equal(
    planCharacterWrite({
      currentCharacterId: null,
      loadedRevision: 7
    }).writeRevision,
    1,
    "a duplicated draft must not carry the source document revision"
  );
});

test("existing character writes preserve the loaded revision for atomic comparison", () => {
  assert.deepEqual(
    planCharacterWrite({
      currentCharacterId: "character-1",
      loadedRevision: 4
    }),
    {
      createsDocument: false,
      savedId: "character-1",
      expectedRevision: 4,
      writeRevision: 4
    }
  );

  assert.equal(
    planCharacterWrite({
      currentCharacterId: "character-1",
      saveAsNew: true,
      loadedRevision: 4
    }).writeRevision,
    1
  );
});

test("the application passes atomic transaction support into Character Creator", async () => {
  const appSource = await readFile(
    new URL("../app.js", import.meta.url),
    "utf8"
  );
  const creatorSource = await readFile(
    new URL("../characterCreator/index.js", import.meta.url),
    "utf8"
  );

  assert.match(
    appSource,
    /createCharacterCreator\(\{[\s\S]*?\brunTransaction\b[\s\S]*?\}\)/
  );
  assert.match(
    creatorSource,
    /runTransaction:\s*options\.runTransaction/
  );
  assert.match(
    appSource,
    /async function openSavedRoom[\s\S]*?await joinRoom\([\s\S]*?createMembership:\s*false/
  );
  assert.match(
    appSource,
    /getCurrentMembershipState:\s*function/
  );
  assert.match(
    appSource,
    /let authStateGeneration = 0;[\s\S]*?const generation\s*=\s*\+\+authStateGeneration;[\s\S]*?previousUserId !== nextUserId[\s\S]*?await showLoggedOut\(\);[\s\S]*?currentUser = user;/
  );
  assert.match(
    appSource,
    /if \(createMembership \|\| finalRole === "dm"\) \{[\s\S]*?await savePlayerHistory/
  );
  assert.doesNotMatch(
    appSource,
    /openButton\.addEventListener\("click",\s*\(\)\s*=>\s*openRoom\(/
  );
});

test("safe Firebase diagnostics contain context but never identity or document data", () => {
  const diagnostic = buildSafePersistenceDiagnostic(
    {
      code: "permission-denied",
      message: "Missing or insufficient permissions."
    },
    {
      feature: "Character Creator",
      operation: "create",
      path: "rooms/ABC-123/characters/{new}",
      authenticated: true,
      membershipState: "member",
      expectedRole: "character owner or room DM",
      ownershipState: "owner",
      revisionState: "new",
      actorUid: "must-not-appear",
      document: { secret: "must-not-appear" }
    }
  );

  assert.deepEqual(diagnostic, {
    service: "Firebase",
    feature: "Character Creator",
    operation: "create",
    path: "rooms/ABC-123/characters/{new}",
    code: "permission-denied",
    authenticated: true,
    membershipState: "member",
    expectedRole: "character owner or room DM",
    ownershipState: "owner",
    revisionState: "new"
  });
  assert.doesNotMatch(
    JSON.stringify(diagnostic),
    /must-not-appear/
  );

  assert.equal(
    buildSafePersistenceDiagnostic(
      { code: "permission-denied" },
      {
        path: "users/private-uid/spells/spell-1"
      }
    ).path,
    "users/{current-user}/spells/spell-1"
  );
});

test("Firebase permission messages use only verified authentication, membership, ownership, and revision evidence", () => {
  const denied = {
    code: "permission-denied",
    message: "Missing or insufficient permissions."
  };

  assert.match(
    friendlyServiceError(denied, {
      action: "save this character",
      authenticated: false
    }),
    /session has expired.*sign in/i
  );
  assert.match(
    friendlyServiceError(denied, {
      membershipState: "missing"
    }),
    /rejoin/i
  );
  assert.match(
    friendlyServiceError(denied, {
      ownershipState: "mismatch",
      action: "save this character"
    }),
    /belongs to another user/i
  );
  assert.match(
    friendlyServiceError(denied),
    /access or the current server rules/i
  );
  assert.doesNotMatch(
    friendlyServiceError(denied),
    /rejoin|owner|DM/i
  );
  assert.match(
    friendlyServiceError({
      code: "aborted",
      message: "revision conflict"
    }, {
      revisionState: "stale"
    }),
    /newer version/i
  );
  assert.doesNotMatch(
    friendlyServiceError({
      code: "aborted",
      message: "transaction contention"
    }),
    /newer version/i
  );
});
