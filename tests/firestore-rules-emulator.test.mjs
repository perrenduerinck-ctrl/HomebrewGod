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
  updateDoc,
  writeBatch
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

const fogSettings = (mapId, revision = 1, overrides = {}) => ({
  mapId,
  roomCode: ROOM,
  enabled: true,
  baseState: "hidden",
  revision,
  updatedByUid: "dm-1",
  updatedAtMillis: revision,
  ...overrides
});

const fogOperation = (id, mapId, revision = 1, overrides = {}) => ({
  id,
  roomCode: ROOM,
  mapId,
  revision,
  authorUid: "dm-1",
  mode: "reveal",
  tool: "rectangle",
  size: 60,
  points: [],
  start: { x: 10, y: 10 },
  end: { x: 40, y: 30 },
  order: 1000,
  createdAtMillis: 1,
  ...overrides
});

const visionWall = (id, authorUid = "dm-1", overrides = {}) => ({
  id,
  roomCode: ROOM,
  mapId: "floor-one",
  authorUid,
  start: { x: 500, y: 0 },
  end: { x: 500, y: 1000 },
  createdAtMillis: 1,
  updatedAtMillis: 1,
  ...overrides
});

const visionExploration = (ownerUid, overrides = {}) => ({
  roomCode: ROOM,
  mapId: "floor-one",
  ownerUid,
  resolution: 64,
  cells: "0".repeat(64 * 64),
  updatedAtMillis: 1,
  ...overrides
});

function databaseFor(uid) {
  return environment.authenticatedContext(uid, { email: `${uid}@example.test` }).firestore();
}

function characterRecord(ownerUid, revision = 1, overrides = {}) {
  return {
    roomCode: ROOM,
    ownerUid,
    revision,
    identity: { name: "Rules Hero" },
    schemaVersion: 13,
    updatedAtMillis: revision,
    ...overrides
  };
}

function sceneRecord(id = "house") {
  return {
    id,
    roomCode: ROOM,
    name: "Abandoned House",
    description: "A two-story test location.",
    schemaVersion: 1,
    createdAtMillis: 1,
    updatedAtMillis: 1
  };
}

function floorRecord(sceneId, id, baseElevation) {
  return {
    id,
    sceneId,
    roomCode: ROOM,
    name: id === "ground" ? "Ground Floor" : "Second Floor",
    description: "",
    baseElevation,
    order: baseElevation,
    grid: {},
    lighting: {},
    map: {
      id: `map-${id}`,
      name: `${id} map`,
      url: `https://example.test/${id}.webp`,
      publicId: null,
      savedToLibrary: true,
      timeVariants: {}
    },
    schemaVersion: 1,
    createdAtMillis: 1,
    updatedAtMillis: 1
  };
}

function connectionRecord() {
  return {
    id: "stairs-1",
    sceneId: "house",
    roomCode: ROOM,
    name: "Main Stairs",
    description: "",
    type: "stairs",
    source: { floorId: "ground", x: 20, y: 30 },
    destination: { floorId: "second", x: 80, y: 70 },
    bidirectional: true,
    allowPlayers: true,
    movementCost: 10,
    schemaVersion: 1,
    createdAtMillis: 1,
    updatedAtMillis: 1
  };
}

function mapObjectRecord(id = "door-1", visibility = "shared", overrides = {}) {
  return {
    id,
    roomCode: ROOM,
    kind: "object",
    type: "door",
    name: "Rules Door",
    description: "",
    imageUrl: "",
    imagePublicId: "",
    icon: "D",
    sceneId: "",
    floorId: "",
    mapId: "map-one",
    transform: { x: 12, y: 20, width: 8, height: 12, rotation: 0 },
    stateId: "closed",
    locked: false,
    allowPlayers: true,
    visibility,
    interactionDistanceFeet: 10,
    interactionRadius: { x: 5, y: 5 },
    blocksMovement: true,
    blocksVision: true,
    hitPoints: { current: 20, maximum: 20 },
    animationId: "",
    revision: 1,
    createdByUid: "dm-1",
    updatedByUid: "dm-1",
    lastInteractedByUid: "",
    lastInteractorTokenId: "",
    createdAtMillis: 1,
    updatedAtMillis: 1,
    schemaVersion: 1,
    ...overrides
  };
}

function puzzleRecord(id = "puzzle-1", revision = 1, overrides = {}) {
  return {
    id,
    roomCode: ROOM,
    name: "Rules Puzzle",
    description: "A private lever and door connection.",
    enabled: true,
    hiddenState: true,
    allowCrossFloor: false,
    triggerMode: "all",
    triggers: [{ id: "trigger-1", objectId: "lever-1", stateId: "active" }],
    actions: [{ id: "action-1", objectId: "door-1", stateId: "open", lockMode: "unlock" }],
    resetActions: [
      { id: "reset-1", objectId: "lever-1", stateId: "inactive", lockMode: "unlock" },
      { id: "reset-2", objectId: "door-1", stateId: "closed", lockMode: "lock" }
    ],
    runtime: {
      status: "idle",
      sequenceIndex: 0,
      executionId: "",
      lastObjectId: "",
      solvedAtMillis: 0,
      message: ""
    },
    revision,
    createdByUid: "dm-1",
    updatedByUid: "dm-1",
    createdAtMillis: 1,
    updatedAtMillis: revision,
    schemaVersion: 1,
    ...overrides
  };
}

const personalLibraryFixtures = Object.freeze([
  {
    collection: "magicItems",
    id: "item-1",
    record: {
      id: "item-1",
      name: "Rules Blade",
      itemType: "weapon",
      rarity: "common",
      description: "",
      imageUrl: "",
      tags: [],
      effects: [],
      updatedAtMillis: 1
    }
  },
  {
    collection: "spells",
    id: "spell-1",
    record: {
      id: "spell-1",
      name: "Rules Spark",
      level: 0,
      school: "Evocation",
      classes: ["Wizard"],
      description: "",
      tags: [],
      animations: {},
      updatedAtMillis: 1
    }
  },
  {
    collection: "npcs",
    id: "npc-1",
    record: {
      id: "npc-1",
      name: "Rules NPC",
      portraitUrl: "",
      roomCode: ROOM,
      description: "",
      notes: "",
      tags: [],
      relationshipIds: [],
      factionIds: [],
      knowledge: [],
      combat: {},
      updatedAtMillis: 1
    }
  },
  {
    collection: "npcRelationships",
    id: "relationship-1",
    record: {
      id: "relationship-1",
      sourceNpcId: "npc-1",
      targetNpcId: "npc-2",
      relationshipType: "Ally",
      direction: "mutual",
      trust: 60,
      hostility: 0,
      notes: "",
      tags: [],
      createdAtMillis: 1,
      updatedAtMillis: 1
    }
  },
  {
    collection: "encounters",
    id: "encounter-1",
    record: {
      id: "encounter-1",
      name: "Rules Encounter",
      description: "",
      notes: "",
      environment: "",
      roomCode: ROOM,
      tags: [],
      mapRef: null,
      combatants: [],
      lighting: {},
      updatedAtMillis: 1
    }
  },
  {
    collection: "summons",
    id: "summon-1",
    record: {
      id: "summon-1",
      name: "Rules Summon",
      description: "",
      sourceLibraryId: "monster:source-1",
      source: {
        assetType: "monster",
        libraryId: "monster:source-1",
        sourceRecordId: "source-1"
      },
      count: 1,
      placement: {},
      ownership: {},
      initiative: {},
      duration: {},
      endBehavior: {},
      tags: [],
      updatedAtMillis: 1
    }
  }
]);

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

test("character creates require authentication, membership, room identity, ownership, and revision one", async () => {
  const signedOut = environment.unauthenticatedContext().firestore();
  const owner = databaseFor("player-1");
  const outsider = databaseFor("outside-user");

  await assertFails(setDoc(
    doc(signedOut, "rooms", ROOM, "characters", "signed-out"),
    characterRecord("signed-out")
  ));
  await assertFails(setDoc(
    doc(outsider, "rooms", ROOM, "characters", "outsider"),
    characterRecord("outside-user")
  ));
  await assertFails(setDoc(
    doc(owner, "rooms", ROOM, "characters", "revision-zero"),
    characterRecord("player-1", 0)
  ));
  await assertFails(setDoc(
    doc(owner, "rooms", ROOM, "characters", "wrong-room"),
    characterRecord("player-1", 1, { roomCode: "OTHER-ROOM" })
  ));
  await assertFails(setDoc(
    doc(owner, "rooms", ROOM, "characters", "wrong-owner"),
    characterRecord("player-2")
  ));
  await assertSucceeds(setDoc(
    doc(owner, "rooms", ROOM, "characters", "owned-hero"),
    characterRecord("player-1")
  ));
});

test("character updates enforce sequential revisions while allowing the owner or room DM", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(
      doc(db, "rooms", ROOM, "characters", "owned-hero"),
      characterRecord("player-1")
    );
  });

  const owner = databaseFor("player-1");
  const nonOwner = databaseFor("player-2");
  const dm = databaseFor("dm-1");
  const ownerRef = doc(owner, "rooms", ROOM, "characters", "owned-hero");

  await assertSucceeds(setDoc(
    ownerRef,
    characterRecord("player-1", 2, { identity: { name: "Owner Update" } })
  ));
  await assertFails(setDoc(
    ownerRef,
    characterRecord("player-1", 2, { identity: { name: "Stale Update" } })
  ));
  await assertFails(setDoc(
    doc(nonOwner, "rooms", ROOM, "characters", "owned-hero"),
    characterRecord("player-1", 3, { identity: { name: "Hijacked" } })
  ));
  await assertSucceeds(setDoc(
    doc(dm, "rooms", ROOM, "characters", "owned-hero"),
    characterRecord("player-1", 3, { identity: { name: "DM Update" } })
  ));
  await assertFails(setDoc(
    doc(dm, "rooms", ROOM, "characters", "owned-hero"),
    characterRecord("dm-1", 4, { identity: { name: "Ownership Rewrite" } })
  ));
});

test("only the room DM can claim a legacy character without ownership metadata", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    await setDoc(
      doc(context.firestore(), "rooms", ROOM, "characters", "legacy-hero"),
      characterRecord("", 0)
    );
  });

  await assertFails(setDoc(
    doc(databaseFor("player-1"), "rooms", ROOM, "characters", "legacy-hero"),
    characterRecord("player-1", 1)
  ));
  await assertSucceeds(setDoc(
    doc(databaseFor("dm-1"), "rooms", ROOM, "characters", "legacy-hero"),
    characterRecord("dm-1", 1)
  ));
});

test("personal creator libraries are owner-only and revisioned", async () => {
  const owner = databaseFor("player-1");
  const other = databaseFor("player-2");

  for (const fixture of personalLibraryFixtures) {
    const ownerRef = doc(
      owner,
      "users",
      "player-1",
      fixture.collection,
      fixture.id
    );
    const initial = {
      ...fixture.record,
      ownerUid: "player-1",
      revision: 1
    };
    await assertSucceeds(setDoc(ownerRef, initial));
    await assertFails(getDoc(doc(
      other,
      "users",
      "player-1",
      fixture.collection,
      fixture.id
    )));
    await assertFails(setDoc(doc(
      other,
      "users",
      "player-1",
      fixture.collection,
      fixture.id
    ), {
      ...initial,
      revision: 2
    }));
    await assertFails(setDoc(ownerRef, initial));
    await assertSucceeds(setDoc(ownerRef, {
      ...initial,
      revision: 2,
      updatedAtMillis: 2
    }));
  }
});

test("personal animations and account indexes cannot cross account boundaries", async () => {
  const owner = databaseFor("player-1");
  const other = databaseFor("player-2");
  const animation = {
    id: "animation-1",
    ownerId: "player-1",
    ownership: {
      scope: "user",
      ownerId: "player-1"
    },
    sprite: "https://example.test/sprite.png",
    sound: null
  };
  const index = {
    libraryId: "monster:monster-1",
    assetType: "monster",
    sourceRecordId: "monster-1",
    sourceRoomCode: ROOM,
    ownerUid: "player-1",
    name: "Indexed Monster",
    updatedAtMillis: 1
  };

  await assertSucceeds(setDoc(
    doc(owner, "users", "player-1", "animations", "animation-1"),
    animation
  ));
  await assertFails(getDoc(doc(
    other,
    "users",
    "player-1",
    "animations",
    "animation-1"
  )));
  await assertFails(setDoc(
    doc(owner, "users", "player-1", "animations", "spoofed"),
    {
      ...animation,
      id: "spoofed",
      ownerId: "player-2"
    }
  ));

  await assertSucceeds(setDoc(
    doc(owner, "users", "player-1", "libraryIndex", index.libraryId),
    index
  ));
  await assertFails(getDoc(doc(
    other,
    "users",
    "player-1",
    "libraryIndex",
    index.libraryId
  )));
});

test("room-scoped DM content stays writable only by the room DM", async () => {
  const dm = databaseFor("dm-1");
  const player = databaseFor("player-1");
  const records = [
    {
      collection: "monsters",
      id: "monster-1",
      value: {
        id: "monster-1",
        roomCode: ROOM,
        ownerUid: "dm-1",
        revision: 1,
        name: "Rules Monster"
      }
    },
    {
      collection: "maps",
      id: "map-1",
      value: { id: "map-1", roomCode: ROOM }
    },
    {
      collection: "classes",
      id: "class-1",
      value: { id: "class-1", name: "Rules Class" }
    },
    {
      collection: "species",
      id: "species-1",
      value: { id: "species-1", name: "Rules Species" }
    },
    {
      collection: "backgrounds",
      id: "background-1",
      value: { id: "background-1", name: "Rules Background" }
    }
  ];

  for (const record of records) {
    await assertFails(setDoc(
      doc(player, "rooms", ROOM, record.collection, record.id),
      record.value
    ));
    await assertSucceeds(setDoc(
      doc(dm, "rooms", ROOM, record.collection, record.id),
      record.value
    ));
  }
});

test("room animations, gameplay effects, and combat effects retain their intended roles", async () => {
  const dm = databaseFor("dm-1");
  const player = databaseFor("player-1");
  const roomAnimation = {
    id: "room-animation",
    roomCode: ROOM,
    ownerId: ROOM,
    ownership: {
      scope: "room",
      ownerId: ROOM
    },
    sprite: "https://example.test/room-sprite.png",
    sound: null
  };
  const gameplayEffect = {
    id: "effect-1",
    definitionId: "bless",
    name: "Bless",
    type: "buff",
    icon: "",
    description: "",
    roomCode: ROOM,
    sourceId: "spell-1",
    sourceType: "spell",
    targetTokenId: "hero",
    targetCharacterId: "owned-hero",
    duration: {},
    timing: {},
    modifiers: [],
    tags: [],
    animation: {},
    createdByUid: "dm-1",
    createdAtMillis: 1,
    updatedAtMillis: 1
  };
  const combatEffect = {
    id: "combat-effect-1",
    roomCode: ROOM,
    createdByUid: "player-1",
    createdAtMillis: 1
  };

  await assertFails(setDoc(
    doc(player, "rooms", ROOM, "animations", "room-animation"),
    roomAnimation
  ));
  await assertSucceeds(setDoc(
    doc(dm, "rooms", ROOM, "animations", "room-animation"),
    roomAnimation
  ));
  await assertFails(setDoc(
    doc(player, "rooms", ROOM, "effects", "effect-1"),
    { ...gameplayEffect, createdByUid: "player-1" }
  ));
  await assertSucceeds(setDoc(
    doc(dm, "rooms", ROOM, "effects", "effect-1"),
    gameplayEffect
  ));
  await assertSucceeds(setDoc(
    doc(player, "rooms", ROOM, "combatEffects", "combat-effect-1"),
    combatEffect
  ));
  await assertFails(setDoc(
    doc(databaseFor("player-2"), "rooms", ROOM, "combatEffects", "spoofed-effect"),
    {
      ...combatEffect,
      id: "spoofed-effect"
    }
  ));
});

test("Workshop visibility protects private content and permits authenticated public reads", async () => {
  const author = databaseFor("player-1");
  const peer = databaseFor("player-2");
  const signedOut = environment.unauthenticatedContext().firestore();
  const base = {
    assetId: "public-asset",
    assetType: "spell",
    name: "Rules Asset",
    nameSearch: "rules asset",
    description: "",
    authorUid: "player-1",
    authorName: "Player One",
    visibility: "PUBLIC",
    roomCode: "",
    tags: [],
    thumbnailUrl: "",
    version: 1,
    forkedFrom: null,
    sourceKey: "spell:rules-asset",
    sourceType: "spell",
    sourceRecordId: "spell-1",
    typeMetadata: {},
    collectionIds: [],
    saveCount: 0,
    createdAtMillis: 1,
    updatedAtMillis: 1
  };

  await assertSucceeds(setDoc(
    doc(author, "workshopAssets", "public-asset"),
    base
  ));
  await assertSucceeds(getDoc(
    doc(peer, "workshopAssets", "public-asset")
  ));
  await assertFails(getDoc(
    doc(signedOut, "workshopAssets", "public-asset")
  ));

  await assertSucceeds(setDoc(
    doc(author, "workshopAssets", "private-asset"),
    {
      ...base,
      assetId: "private-asset",
      sourceKey: "spell:private-asset",
      visibility: "PRIVATE"
    }
  ));
  await assertFails(getDoc(
    doc(peer, "workshopAssets", "private-asset")
  ));
  await assertFails(updateDoc(
    doc(peer, "workshopAssets", "public-asset"),
    { name: "Hijacked" }
  ));
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

test("Fog of War is readable by room members but writable only by the DM", async () => {
  const dm = databaseFor("dm-1");
  const player = databaseFor("player-1");
  const stranger = databaseFor("stranger");
  const settingsPath = ["rooms", ROOM, "fogSettings", "floor-one"];
  const operationPath = ["rooms", ROOM, "fogOperations", "reveal-one"];

  await assertFails(setDoc(doc(player, ...settingsPath), {
    ...fogSettings("floor-one"),
    updatedByUid: "player-1"
  }));
  await assertSucceeds(setDoc(doc(dm, ...settingsPath), fogSettings("floor-one")));
  await assertSucceeds(getDoc(doc(player, ...settingsPath)));
  await assertFails(getDoc(doc(stranger, ...settingsPath)));

  await assertFails(setDoc(doc(player, ...operationPath), {
    ...fogOperation("reveal-one", "floor-one"),
    authorUid: "player-1"
  }));
  await assertSucceeds(setDoc(doc(dm, ...operationPath), fogOperation("reveal-one", "floor-one")));
  await assertSucceeds(getDoc(doc(player, ...operationPath)));

  await assertSucceeds(setDoc(doc(dm, ...settingsPath), fogSettings("floor-one", 2, {
    baseState: "revealed"
  })));
  await assertFails(setDoc(
    doc(dm, "rooms", ROOM, "fogOperations", "stale-reveal"),
    fogOperation("stale-reveal", "floor-one", 1)
  ));
  await assertSucceeds(setDoc(
    doc(dm, "rooms", ROOM, "fogOperations", "hide-one"),
    fogOperation("hide-one", "floor-one", 2, { mode: "hide", tool: "circle" })
  ));
  await assertFails(updateDoc(doc(player, ...settingsPath), { enabled: false }));
});

test("vision walls are DM-authored while explored maps remain owner-private", async () => {
  const dm = databaseFor("dm-1");
  const player = databaseFor("player-1");
  const peer = databaseFor("player-2");
  const stranger = databaseFor("stranger");
  const wallPath = ["rooms", ROOM, "visionWalls", "wall-one"];
  const explorationPath = ["rooms", ROOM, "visionExploration", "vision-player-1"];

  await assertFails(setDoc(doc(player, ...wallPath), visionWall("wall-one", "player-1")));
  await assertSucceeds(setDoc(doc(dm, ...wallPath), visionWall("wall-one")));
  await assertSucceeds(getDoc(doc(player, ...wallPath)));
  await assertFails(getDoc(doc(stranger, ...wallPath)));
  await assertFails(updateDoc(doc(dm, ...wallPath), { end: { x: 600, y: 1000 } }));

  await assertSucceeds(setDoc(doc(player, ...explorationPath), visionExploration("player-1")));
  await assertSucceeds(getDoc(doc(player, ...explorationPath)));
  await assertSucceeds(getDoc(doc(dm, ...explorationPath)));
  await assertFails(getDoc(doc(peer, ...explorationPath)));
  await assertFails(getDoc(doc(stranger, ...explorationPath)));
  await assertSucceeds(updateDoc(doc(player, ...explorationPath), {
    cells: `1${"0".repeat(64 * 64 - 1)}`,
    updatedAtMillis: 2
  }));
  await assertFails(updateDoc(doc(player, ...explorationPath), {
    ownerUid: "player-2",
    updatedAtMillis: 3
  }));
  await assertFails(setDoc(
    doc(peer, "rooms", ROOM, "visionExploration", "spoofed"),
    visionExploration("player-1")
  ));
});

test("DM-only tokens are physically unreadable and unwritable for players", async () => {
  const dm = databaseFor("dm-1");
  const player = databaseFor("player-1");
  const stranger = databaseFor("stranger");
  const privateTokenPath = ["rooms", ROOM, "dmTokens", "hidden-goblin"];
  const privateToken = {
    id: "hidden-goblin",
    name: "Hidden Goblin",
    type: "enemy",
    visibility: "dm",
    x: 25,
    y: 35,
    updatedAtMillis: 1
  };

  await assertSucceeds(setDoc(doc(dm, ...privateTokenPath), privateToken));
  await assertSucceeds(getDoc(doc(dm, ...privateTokenPath)));
  await assertFails(getDoc(doc(player, ...privateTokenPath)));
  await assertFails(getDoc(doc(stranger, ...privateTokenPath)));
  await assertFails(setDoc(doc(player, "rooms", ROOM, "dmTokens", "spoofed"), {
    ...privateToken,
    id: "spoofed"
  }));
  await assertFails(updateDoc(doc(player, ...privateTokenPath), { x: 50 }));
  await assertFails(setDoc(doc(dm, "rooms", ROOM, "dmTokens", "not-private"), {
    ...privateToken,
    id: "not-private",
    visibility: "shared"
  }));
  await assertFails(setDoc(doc(dm, "rooms", ROOM, "tokens", "misfiled-private"), {
    ...privateToken,
    id: "misfiled-private"
  }));
  await assertSucceeds(setDoc(doc(dm, "rooms", ROOM, "tokens", "revealed-goblin"), {
    ...privateToken,
    id: "revealed-goblin",
    visibility: "shared"
  }));
  await assertSucceeds(getDoc(doc(player, "rooms", ROOM, "tokens", "revealed-goblin")));
});

test("map objects synchronize safely while DM-only objects stay physically private", async () => {
  const dm = databaseFor("dm-1");
  const owner = databaseFor("player-1");
  const peer = databaseFor("player-2");
  const sharedRef = doc(dm, "rooms", ROOM, "objects", "door-1");
  const privateRef = doc(dm, "rooms", ROOM, "dmObjects", "trap-1");

  await assertSucceeds(setDoc(sharedRef, mapObjectRecord()));
  await assertSucceeds(getDoc(doc(owner, "rooms", ROOM, "objects", "door-1")));
  await assertFails(setDoc(doc(owner, "rooms", ROOM, "objects", "spoofed"), mapObjectRecord("spoofed", "shared", {
    createdByUid: "player-1",
    updatedByUid: "player-1"
  })));

  await assertSucceeds(setDoc(privateRef, mapObjectRecord("trap-1", "dm", {
    type: "trap",
    name: "Hidden Trap",
    stateId: "armed"
  })));
  await assertSucceeds(getDoc(privateRef));
  await assertFails(getDoc(doc(owner, "rooms", ROOM, "dmObjects", "trap-1")));
  await assertFails(getDoc(doc(peer, "rooms", ROOM, "dmObjects", "trap-1")));

  await assertSucceeds(updateDoc(doc(owner, "rooms", ROOM, "objects", "door-1"), {
    stateId: "open",
    blocksMovement: false,
    blocksVision: false,
    revision: 2,
    lastInteractedByUid: "player-1",
    lastInteractorTokenId: "hero",
    lastPuzzleExecutionId: "",
    updatedByUid: "player-1",
    updatedAtMillis: 2
  }));
  await assertSucceeds(setDoc(doc(dm, "rooms", ROOM, "objects", "far-door"), mapObjectRecord("far-door", "shared", {
    transform: { x: 80, y: 80, width: 8, height: 12, rotation: 0 }
  })));
  await assertFails(updateDoc(doc(owner, "rooms", ROOM, "objects", "far-door"), {
    stateId: "open",
    blocksMovement: false,
    blocksVision: false,
    revision: 2,
    lastInteractedByUid: "player-1",
    lastInteractorTokenId: "hero",
    updatedByUid: "player-1",
    updatedAtMillis: 2
  }));
  await assertFails(updateDoc(doc(peer, "rooms", ROOM, "objects", "door-1"), {
    stateId: "closed",
    blocksMovement: true,
    blocksVision: true,
    revision: 3,
    lastInteractedByUid: "player-2",
    lastInteractorTokenId: "hero",
    updatedByUid: "player-2",
    updatedAtMillis: 3
  }));
  await assertFails(updateDoc(doc(owner, "rooms", ROOM, "objects", "door-1"), {
    name: "Player Rewrite",
    revision: 3,
    updatedByUid: "player-1",
    updatedAtMillis: 3
  }));
  await assertSucceeds(updateDoc(sharedRef, { locked: true, revision: 3, updatedByUid: "dm-1", updatedAtMillis: 3 }));
  await assertFails(updateDoc(doc(owner, "rooms", ROOM, "objects", "door-1"), {
    stateId: "closed",
    blocksMovement: true,
    blocksVision: true,
    revision: 4,
    lastInteractedByUid: "player-1",
    lastInteractorTokenId: "hero",
    updatedByUid: "player-1",
    updatedAtMillis: 4
  }));
});

test("puzzle configuration and hidden progress remain DM-only and revisioned", async () => {
  const dm = databaseFor("dm-1");
  const owner = databaseFor("player-1");
  const peer = databaseFor("player-2");
  const stranger = databaseFor("stranger");
  const reference = doc(dm, "rooms", ROOM, "dmPuzzles", "puzzle-1");

  await assertSucceeds(setDoc(reference, puzzleRecord()));
  await assertSucceeds(getDoc(reference));
  await assertFails(getDoc(doc(owner, "rooms", ROOM, "dmPuzzles", "puzzle-1")));
  await assertFails(getDoc(doc(peer, "rooms", ROOM, "dmPuzzles", "puzzle-1")));
  await assertFails(getDoc(doc(stranger, "rooms", ROOM, "dmPuzzles", "puzzle-1")));
  await assertFails(setDoc(doc(owner, "rooms", ROOM, "dmPuzzles", "spoofed"), puzzleRecord("spoofed", 1, {
    createdByUid: "player-1",
    updatedByUid: "player-1"
  })));
  await assertFails(updateDoc(doc(owner, "rooms", ROOM, "dmPuzzles", "puzzle-1"), {
    runtime: { ...puzzleRecord().runtime, status: "solved", solvedAtMillis: 2 },
    revision: 2,
    updatedByUid: "player-1",
    updatedAtMillis: 2
  }));
  await assertSucceeds(updateDoc(reference, {
    runtime: { ...puzzleRecord().runtime, status: "progress", sequenceIndex: 1, message: "Sequence 1/2." },
    revision: 2,
    updatedByUid: "dm-1",
    updatedAtMillis: 2
  }));
  await assertFails(updateDoc(reference, { revision: 4, updatedAtMillis: 4 }));
  await assertFails(setDoc(doc(dm, "rooms", ROOM, "dmPuzzles", "invalid"), puzzleRecord("invalid", 1, { triggers: [] })));
});

test("players can move only their token while exploration is active", async () => {
  const owner = databaseFor("player-1");
  const stranger = databaseFor("player-2");
  const ownerToken = doc(owner, "rooms", ROOM, "tokens", "hero");
  await assertSucceeds(updateDoc(ownerToken, { x: 30, y: 40, movedAtMillis: 2, updatedAtMillis: 2 }));
  await assertFails(updateDoc(doc(stranger, "rooms", ROOM, "tokens", "hero"), { x: 80, y: 90, movedAtMillis: 3, updatedAtMillis: 3 }));
});

test("only the DM manages scene definitions while every room member can read them", async () => {
  const dm = databaseFor("dm-1");
  const player = databaseFor("player-1");
  await assertFails(setDoc(doc(player, "rooms", ROOM, "scenes", "house"), sceneRecord()));
  await assertSucceeds(setDoc(doc(dm, "rooms", ROOM, "scenes", "house"), sceneRecord()));
  await assertSucceeds(setDoc(
    doc(dm, "rooms", ROOM, "scenes", "house", "floors", "ground"),
    floorRecord("house", "ground", 0)
  ));
  await assertSucceeds(setDoc(
    doc(dm, "rooms", ROOM, "scenes", "house", "floors", "second"),
    floorRecord("house", "second", 15)
  ));
  await assertSucceeds(getDoc(doc(player, "rooms", ROOM, "scenes", "house")));
  await assertSucceeds(getDoc(doc(player, "rooms", ROOM, "scenes", "house", "floors", "second")));
  await assertSucceeds(setDoc(
    doc(dm, "rooms", ROOM, "scenes", "house", "dmFloorNotes", "second"),
    {
      floorId: "second",
      sceneId: "house",
      roomCode: ROOM,
      notes: "The trap is under the rug.",
      updatedAtMillis: 2
    }
  ));
  await assertFails(getDoc(doc(player, "rooms", ROOM, "scenes", "house", "dmFloorNotes", "second")));
  await assertFails(updateDoc(
    doc(player, "rooms", ROOM, "scenes", "house", "floors", "second"),
    { name: "Player Rewrite" }
  ));
});

test("players may use an enabled floor connection only for their own token outside combat", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    const admin = context.firestore();
    await setDoc(doc(admin, "rooms", ROOM, "scenes", "house"), sceneRecord());
    await setDoc(doc(admin, "rooms", ROOM, "scenes", "house", "floors", "ground"), floorRecord("house", "ground", 0));
    await setDoc(doc(admin, "rooms", ROOM, "scenes", "house", "floors", "second"), floorRecord("house", "second", 15));
    await setDoc(doc(admin, "rooms", ROOM, "scenes", "house", "connections", "stairs-1"), connectionRecord());
    await updateDoc(doc(admin, "rooms", ROOM, "tokens", "hero"), {
      sceneId: "house",
      floorId: "ground",
      elevation: 0,
      elevationFeet: 0,
      heightAboveFloor: 0
    });
  });
  const owner = databaseFor("player-1");
  const stranger = databaseFor("player-2");
  const validPatch = {
    sceneId: "house",
    floorId: "second",
    x: 80,
    y: 70,
    elevation: 15,
    elevationFeet: 15,
    heightAboveFloor: 0,
    lastFloorConnectionId: "stairs-1",
    floorChangedAtMillis: 2,
    movedAtMillis: 2,
    updatedAtMillis: 2
  };
  await assertFails(updateDoc(doc(stranger, "rooms", ROOM, "tokens", "hero"), validPatch));
  await assertFails(updateDoc(doc(owner, "rooms", ROOM, "tokens", "hero"), {
    ...validPatch,
    x: 50
  }));
  await assertSucceeds(updateDoc(doc(owner, "rooms", ROOM, "tokens", "hero"), validPatch));
  await environment.withSecurityRulesDisabled(async (context) => {
    await updateDoc(doc(context.firestore(), "rooms", ROOM), {
      initiativeState: {
        combatActive: true,
        roundNumber: 1,
        turnCounter: 0,
        currentCombatantId: "hero"
      }
    });
  });
  await assertFails(updateDoc(doc(owner, "rooms", ROOM, "tokens", "hero"), {
    ...validPatch,
    floorId: "ground",
    x: 20,
    y: 30,
    elevation: 0,
    elevationFeet: 0,
    floorChangedAtMillis: 3,
    movedAtMillis: 3,
    updatedAtMillis: 3
  }));
});

test("a former member loses room reads until deliberately rejoining with the room code", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    await deleteDoc(doc(context.firestore(), "rooms", ROOM, "players", "player-1"));
  });
  const formerMember = databaseFor("player-1");
  await assertFails(getDoc(doc(formerMember, "rooms", ROOM)));
  await assertSucceeds(setDoc(doc(formerMember, "rooms", ROOM, "players", "player-1"), {
    uid: "player-1",
    role: "player"
  }));
  await assertSucceeds(getDoc(doc(formerMember, "rooms", ROOM)));
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

test("off-turn reactions spend once and the DM atomically refreshes the next turn", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    const admin = context.firestore();
    await setDoc(doc(admin, "rooms", ROOM, "tokens", "ally"), {
      id: "ally",
      ownerUid: "player-1",
      sourceType: "character",
      x: 20,
      y: 20,
      updatedAtMillis: 1
    });
    await updateDoc(doc(admin, "rooms", ROOM), {
      initiativeState: {
        combatActive: true,
        roundNumber: 1,
        turnCounter: 0,
        currentCombatantId: "hero",
        initiativeOrder: [
          { tokenId: "hero" },
          { tokenId: "ally" }
        ]
      }
    });
  });

  const owner = databaseFor("player-1");
  const stranger = databaseFor("player-2");
  const dm = databaseFor("dm-1");
  const reaction = {
    schemaVersion: 1,
    tokenId: "ally",
    combatActive: true,
    turnKey: "reaction:1:0:ally",
    roundNumber: 1,
    turnCounter: 0,
    actionsRemaining: 0,
    bonusActionsRemaining: 0,
    reactionAvailable: false,
    attackActionStarted: false,
    attacksRemaining: 0,
    actionSurgeUsed: false,
    dashUsed: false,
    disengaged: false,
    dodging: false,
    hidden: false,
    helping: false,
    lastCommand: "shield",
    lastResource: "reaction",
    lastCommandByUid: "player-1",
    revision: 1,
    updatedAtMillis: 2,
    updatedAt: 2
  };
  const turnRef = doc(owner, "rooms", ROOM, "combatTurns", "ally");
  await assertSucceeds(setDoc(turnRef, reaction));
  await assertFails(setDoc(doc(stranger, "rooms", ROOM, "combatTurns", "ally"), {
    ...reaction,
    lastCommandByUid: "player-2"
  }));
  await assertFails(setDoc(turnRef, {
    ...reaction,
    revision: 2,
    updatedAtMillis: 3
  }));

  const dmTurnRef = doc(dm, "rooms", ROOM, "combatTurns", "ally");
  const batch = writeBatch(dm);
  batch.update(doc(dm, "rooms", ROOM), {
    initiativeState: {
      combatActive: true,
      roundNumber: 1,
      turnCounter: 1,
      currentCombatantId: "ally",
      initiativeOrder: [
        { tokenId: "hero" },
        { tokenId: "ally" }
      ]
    },
    updatedAt: 4
  });
  batch.set(dmTurnRef, {
    ...reaction,
    turnKey: "1:1:ally",
    turnCounter: 1,
    actionsRemaining: 1,
    bonusActionsRemaining: 1,
    reactionAvailable: true,
    lastCommand: "turn-start",
    lastResource: "free",
    lastCommandByUid: "dm-1",
    revision: 2,
    updatedAtMillis: 4,
    updatedAt: 4
  });
  await assertSucceeds(batch.commit());

  await assertFails(setDoc(turnRef, {
    ...reaction,
    turnKey: "forged-reset",
    turnCounter: 1,
    actionsRemaining: 1,
    bonusActionsRemaining: 1,
    reactionAvailable: true,
    lastCommand: "turn-start",
    lastResource: "free",
    revision: 3,
    updatedAtMillis: 5,
    updatedAt: 5
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
