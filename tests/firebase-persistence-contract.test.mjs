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
    /async function openSavedRoom[\s\S]*?await joinRoom\(/
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

test("Firebase permission messages distinguish sign-in, membership, DM, and stale revisions", () => {
  const denied = {
    code: "permission-denied",
    message: "Missing or insufficient permissions."
  };

  assert.match(
    friendlyServiceError(denied, {
      action: "save this character",
      authenticated: false
    }),
    /Sign in again/i
  );
  assert.match(
    friendlyServiceError(denied, {
      membershipState: "missing"
    }),
    /rejoin/i
  );
  assert.match(
    friendlyServiceError(denied, {
      expectedRole: "room DM"
    }),
    /room DM/i
  );
  assert.match(
    friendlyServiceError(denied),
    /ownership|membership/i
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
});
