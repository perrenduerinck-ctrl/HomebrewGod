import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, beforeEach, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from "@firebase/rules-unit-testing";
import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc
} from "firebase/firestore";

const PROJECT_ID = "demo-homebrew-god";
const ROOM = "RULES-ROOM";
let environment;

const journalEntry = (id, ownerUid, visibility) => ({
  id,
  roomCode: ROOM,
  ownerUid,
  ownerName: ownerUid,
  title: `${visibility} note`,
  category: "Lore",
  visibility,
  contentHtml: "<p>Private campaign text</p>",
  searchText: `${visibility} note lore private campaign text`,
  revision: 1,
  createdAtMillis: 1,
  updatedAtMillis: 1
});

const drawingStroke = (id, authorUid, overrides = {}) => ({
  id,
  roomCode: ROOM,
  mapId: "map-one",
  authorUid,
  authorName: authorUid,
  originalAuthorUid: "",
  originalAuthorName: "",
  restoredByUid: "",
  layer: "shared",
  tool: "line",
  color: "#ff3b5c",
  size: 4,
  points: [],
  start: { x: 10, y: 10 },
  end: { x: 100, y: 100 },
  createdAtMillis: 1,
  updatedAtMillis: 1,
  ...overrides
});

function databaseFor(uid) {
  return environment.authenticatedContext(uid, { email: `${uid}@example.test` }).firestore();
}

async function seedRoom() {
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "rooms", ROOM), {
      roomCode: ROOM,
      dmUid: "dm-1",
      drawingSettings: { playersEnabled: true },
      initiativeState: { combatActive: false },
      movementState: {}
    });
    for (const uid of ["player-1", "player-2"]) {
      await setDoc(doc(db, "rooms", ROOM, "players", uid), { uid, role: "player" });
    }
    await setDoc(doc(db, "rooms", ROOM, "personalJournal", "private-1"), journalEntry("private-1", "player-1", "personal"));
    await setDoc(doc(db, "rooms", ROOM, "dmJournal", "dm-1"), journalEntry("dm-1", "dm-1", "dm"));
    await setDoc(doc(db, "rooms", ROOM, "sharedJournal", "shared-1"), journalEntry("shared-1", "player-1", "shared"));
    await setDoc(doc(db, "rooms", ROOM, "tokens", "hero"), {
      id: "hero",
      ownerUid: "player-1",
      sourceType: "character",
      x: 10,
      y: 20,
      movedAtMillis: 1,
      updatedAtMillis: 1
    });
  });
}

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "Run this test through the Firestore emulator script.");
  environment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: await readFile(new URL("../firestore.rules", import.meta.url), "utf8") }
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
  await seedRoom();
});

after(async () => {
  await environment?.cleanup();
});

test("personal and DM journal contents are physically private", async () => {
  const dm = databaseFor("dm-1");
  const owner = databaseFor("player-1");
  const stranger = databaseFor("player-2");

  await assertSucceeds(getDoc(doc(owner, "rooms", ROOM, "personalJournal", "private-1")));
  await assertFails(getDoc(doc(dm, "rooms", ROOM, "personalJournal", "private-1")));
  await assertFails(getDoc(doc(stranger, "rooms", ROOM, "personalJournal", "private-1")));
  await assertSucceeds(getDoc(doc(dm, "rooms", ROOM, "dmJournal", "dm-1")));
  await assertFails(getDoc(doc(owner, "rooms", ROOM, "dmJournal", "dm-1")));
  await assertSucceeds(getDoc(doc(owner, "rooms", ROOM, "sharedJournal", "shared-1")));
  await assertSucceeds(getDoc(doc(dm, "rooms", ROOM, "sharedJournal", "shared-1")));
});

test("journal revisions and ownership prevent silent cross-user replacement", async () => {
  const owner = databaseFor("player-1");
  const stranger = databaseFor("player-2");
  const reference = doc(owner, "rooms", ROOM, "sharedJournal", "shared-1");
  await assertSucceeds(setDoc(reference, { ...journalEntry("shared-1", "player-1", "shared"), revision: 2, title: "Owner revision" }));
  await assertFails(setDoc(reference, { ...journalEntry("shared-1", "player-1", "shared"), revision: 2, title: "Stale revision" }));
  await assertFails(setDoc(doc(stranger, "rooms", ROOM, "sharedJournal", "shared-1"), {
    ...journalEntry("shared-1", "player-1", "shared"), revision: 3, title: "Other player overwrite"
  }));
});

test("drawing ownership permits explicit DM restoration without impersonation", async () => {
  const player = databaseFor("player-1");
  const dm = databaseFor("dm-1");
  const playerStroke = doc(player, "rooms", ROOM, "sharedDrawings", "player-stroke");
  await assertSucceeds(setDoc(playerStroke, drawingStroke("player-stroke", "player-1")));
  await assertSucceeds(deleteDoc(doc(dm, "rooms", ROOM, "sharedDrawings", "player-stroke")));
  await assertSucceeds(setDoc(doc(dm, "rooms", ROOM, "sharedDrawings", "restored-stroke"), drawingStroke("restored-stroke", "dm-1", {
    originalAuthorUid: "player-1",
    originalAuthorName: "player-1",
    restoredByUid: "dm-1"
  })));
  await assertFails(setDoc(doc(dm, "rooms", ROOM, "sharedDrawings", "impersonated-stroke"), drawingStroke("impersonated-stroke", "player-1")));
});

test("players can move only their token while exploration is active", async () => {
  const owner = databaseFor("player-1");
  const stranger = databaseFor("player-2");
  const ownerToken = doc(owner, "rooms", ROOM, "tokens", "hero");
  await assertSucceeds(updateDoc(ownerToken, { x: 30, y: 40, movedAtMillis: 2, updatedAtMillis: 2 }));
  await assertFails(updateDoc(doc(stranger, "rooms", ROOM, "tokens", "hero"), { x: 80, y: 90, movedAtMillis: 3, updatedAtMillis: 3 }));
});

test("combat turn economy is owner-scoped, revisioned, and bound to the active turn", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    await updateDoc(doc(context.firestore(), "rooms", ROOM), {
      initiativeState: {
        combatActive: true,
        roundNumber: 1,
        turnCounter: 0,
        currentCombatantId: "hero"
      },
      movementState: {
        combatActive: true,
        activeTokenId: "hero",
        activeTokenName: "Hero",
        baseSpeed: 30,
        movementMode: "walk",
        movementModeBaseSpeed: 30,
        dashCount: 0,
        movementRemaining: 30,
        movementSpent: 0,
        movementTurnKey: "1:hero",
        turnRoundNumber: 1,
        lastConfirmedPosition: { x: 10, y: 20, elevation: 0 },
        lastMoveForced: false,
        movementOverage: 0
      }
    });
  });
  const owner = databaseFor("player-1");
  const stranger = databaseFor("player-2");
  const turn = {
    schemaVersion: 1,
    tokenId: "hero",
    combatActive: true,
    turnKey: "1:0:hero",
    roundNumber: 1,
    turnCounter: 0,
    actionsRemaining: 0,
    bonusActionsRemaining: 1,
    reactionAvailable: true,
    attackActionStarted: false,
    attacksRemaining: 0,
    actionSurgeUsed: false,
    dashUsed: false,
    disengaged: false,
    dodging: true,
    hidden: false,
    helping: false,
    lastCommand: "dodge",
    lastResource: "action",
    lastCommandByUid: "player-1",
    revision: 1,
    updatedAtMillis: 2,
    updatedAt: 2
  };
  await assertSucceeds(setDoc(doc(owner, "rooms", ROOM, "combatTurns", "hero"), turn));
  await assertFails(setDoc(doc(stranger, "rooms", ROOM, "combatTurns", "hero"), {
    ...turn,
    lastCommandByUid: "player-2"
  }));
  await assertFails(setDoc(doc(owner, "rooms", ROOM, "combatTurns", "hero"), {
    ...turn,
    actionsRemaining: 1,
    revision: 2,
    updatedAtMillis: 3
  }));
});

test("owned active token can request but cannot directly forge an initiative advance", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    await updateDoc(doc(context.firestore(), "rooms", ROOM), {
      initiativeState: {
        combatActive: true,
        roundNumber: 1,
        turnCounter: 4,
        currentCombatantId: "hero"
      }
    });
  });
  const owner = databaseFor("player-1");
  const stranger = databaseFor("player-2");
  const request = {
    requestId: "4:hero:player-1",
    tokenId: "hero",
    requestedByUid: "player-1",
    turnCounter: 4,
    requestedAtMillis: 10
  };
  await assertSucceeds(updateDoc(doc(owner, "rooms", ROOM), {
    turnAdvanceRequest: request,
    updatedAt: 10
  }));
  await assertFails(updateDoc(doc(stranger, "rooms", ROOM), {
    turnAdvanceRequest: { ...request, requestedByUid: "player-2" },
    updatedAt: 11
  }));
  await assertFails(updateDoc(doc(owner, "rooms", ROOM), {
    initiativeState: {
      combatActive: true,
      roundNumber: 1,
      turnCounter: 5,
      currentCombatantId: "hero"
    }
  }));
});

test("room tombstones stop joins and content writes without exposing personal notes", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    await updateDoc(doc(context.firestore(), "rooms", ROOM), {
      deletingAt: 10,
      deletionState: { status: "pending" }
    });
  });
  const dm = databaseFor("dm-1");
  const newcomer = databaseFor("new-player");
  await assertFails(setDoc(doc(newcomer, "rooms", ROOM, "players", "new-player"), { uid: "new-player", role: "player" }));
  await assertFails(setDoc(doc(dm, "rooms", ROOM, "maps", "new-map"), { id: "new-map" }));
  await assertFails(setDoc(doc(dm, "rooms", ROOM, "dmJournal", "new-note"), journalEntry("new-note", "dm-1", "dm")));
  await assertFails(getDoc(doc(dm, "rooms", ROOM, "personalJournal", "private-1")));
});
