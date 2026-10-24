import {
  expect,
  test
} from "@playwright/test";

const FIREBASE_APP_URL =
  "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
const FIREBASE_AUTH_URL =
  "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
const FIREBASE_FIRESTORE_URL =
  "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

async function signInGuest(page, name) {
  await page.goto("?firebaseEmulator=1&smokeTest=1&release=beta-1-playtest", {
    waitUntil: "domcontentloaded"
  });
  await expect(page.locator("#homebrewGodSmokeResult")).toContainText(
    "SMOKE TEST PASS",
    { timeout: 60000 }
  );
  await page.locator("#guestNameInput").fill(name);
  await page.locator("#guestButton").click();
  await expect(page.locator("#lobbyScreen")).toBeVisible();
}

async function openEmulatorApp(page) {
  await page.goto("?firebaseEmulator=1&smokeTest=1&release=beta-1-playtest", {
    waitUntil: "domcontentloaded"
  });
  await expect(page.locator("#homebrewGodSmokeResult")).toContainText(
    "SMOKE TEST PASS",
    { timeout: 60000 }
  );
}

async function signUpRegistered(page, { name, email, password }) {
  await openEmulatorApp(page);
  await page.locator("#signupNameInput").fill(name);
  await page.locator("#signupEmailInput").fill(email);
  await page.locator("#signupPasswordInput").fill(password);
  await page.locator("#signupButton").click();
  await expect(page.locator("#lobbyScreen")).toBeVisible();
}

async function signInRegistered(page, { email, password }) {
  await openEmulatorApp(page);
  await page.locator("#loginEmailInput").fill(email);
  await page.locator("#loginPasswordInput").fill(password);
  await page.locator("#loginButton").click();
  await expect(page.locator("#lobbyScreen")).toBeVisible();
}

async function currentUid(page) {
  return page.evaluate(async ({ appUrl, authUrl }) => {
    await import(appUrl);
    const { getAuth } = await import(authUrl);
    return getAuth().currentUser?.uid || "";
  }, {
    appUrl: FIREBASE_APP_URL,
    authUrl: FIREBASE_AUTH_URL
  });
}

async function firestoreSet(page, path, value, { merge = false } = {}) {
  return page.evaluate(async ({ firestoreUrl, path, value, merge }) => {
    const { doc, getFirestore, setDoc } = await import(firestoreUrl);
    await setDoc(doc(getFirestore(), ...path), value, merge ? { merge: true } : undefined);
    return true;
  }, {
    firestoreUrl: FIREBASE_FIRESTORE_URL,
    path,
    value,
    merge
  });
}

async function firestoreUpdate(page, path, value) {
  return page.evaluate(async ({ firestoreUrl, path, value }) => {
    const { doc, getFirestore, updateDoc } = await import(firestoreUrl);
    await updateDoc(doc(getFirestore(), ...path), value);
    return true;
  }, {
    firestoreUrl: FIREBASE_FIRESTORE_URL,
    path,
    value
  });
}

async function firestoreDelete(page, path) {
  return page.evaluate(async ({ firestoreUrl, path }) => {
    const { deleteDoc, doc, getFirestore } = await import(firestoreUrl);
    await deleteDoc(doc(getFirestore(), ...path));
    return true;
  }, {
    firestoreUrl: FIREBASE_FIRESTORE_URL,
    path
  });
}

async function firestoreGet(page, path) {
  return page.evaluate(async ({ firestoreUrl, path }) => {
    const { doc, getDocFromServer, getFirestore } = await import(firestoreUrl);
    const snapshot = await getDocFromServer(doc(getFirestore(), ...path));
    return snapshot.exists()
      ? { id: snapshot.id, ...snapshot.data() }
      : null;
  }, {
    firestoreUrl: FIREBASE_FIRESTORE_URL,
    path
  });
}

async function firestoreList(page, path) {
  return page.evaluate(async ({ firestoreUrl, path }) => {
    const { collection, getDocs, getFirestore } = await import(firestoreUrl);
    const snapshot = await getDocs(collection(getFirestore(), ...path));
    return snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
  }, {
    firestoreUrl: FIREBASE_FIRESTORE_URL,
    path
  });
}

async function expectPermissionDenied(operation) {
  let error;
  try {
    await operation();
  } catch (caught) {
    error = caught;
  }
  expect(String(error?.code || error?.message || error)).toMatch(
    /permission[_-]denied|insufficient permissions|evaluation error[\s\S]*false/i
  );
}

function floorRecord(roomCode, id, name, baseElevation, order) {
  return {
    id,
    sceneId: "beta-dungeon",
    roomCode,
    name,
    description: `${name} playtest floor`,
    baseElevation,
    order,
    grid: {},
    lighting: {},
    map: {
      id: `map-${id}`,
      name: `${name} Map`,
      url: `https://example.test/${id}.webp`,
      publicId: null,
      savedToLibrary: true,
      timeVariants: {}
    },
    schemaVersion: 1,
    createdAtMillis: order + 1,
    updatedAtMillis: order + 1
  };
}

function mapObject(roomCode, id, type, stateId, visibility = "shared", overrides = {}) {
  const isDoor = type === "door";
  return {
    id,
    roomCode,
    kind: "object",
    type,
    name: id === "locked-door" ? "Locked Vault Door" : "Poison Needle Trap",
    description: "Beta campaign object",
    imageUrl: "",
    imagePublicId: "",
    icon: isDoor ? "D" : "T",
    sceneId: "beta-dungeon",
    floorId: "ground",
    mapId: "map-ground",
    transform: { x: 20, y: 20, width: 8, height: 12, rotation: 0 },
    stateId,
    locked: isDoor,
    allowPlayers: true,
    visibility,
    interactionDistanceFeet: 10,
    interactionRadius: { x: 8, y: 8 },
    blocksMovement: isDoor,
    blocksVision: isDoor,
    hitPoints: { current: 20, maximum: 20 },
    animationId: "",
    revision: 1,
    createdByUid: "",
    updatedByUid: "",
    lastInteractedByUid: "",
    lastInteractorTokenId: "",
    lastPuzzleExecutionId: "",
    createdAtMillis: 10,
    updatedAtMillis: 10,
    schemaVersion: 1,
    ...overrides
  };
}

test("Beta 1.0 campaign survives a real DM/player emulator session", async ({ browser }) => {
  test.setTimeout(300000);
  const dmContext = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const playerContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  let rejoinContext = null;
  const dmPage = await dmContext.newPage();
  const playerPage = await playerContext.newPage();
  const unexpectedErrors = [];
  const playerAccount = {
    name: "Beta Player",
    email: "beta.player@example.test",
    password: "BetaPass123!"
  };

  for (const [label, page] of [["DM", dmPage], ["Player", playerPage]]) {
    page.on("pageerror", (error) => unexpectedErrors.push(`${label}: ${error.message}`));
    page.on("dialog", (dialog) => dialog.accept());
  }

  try {
    await Promise.all([
      signInGuest(dmPage, "Beta Dungeon Master"),
      signUpRegistered(playerPage, playerAccount)
    ]);

    const dmUid = await currentUid(dmPage);
    const playerUid = await currentUid(playerPage);
    expect(dmUid).toBeTruthy();
    expect(playerUid).toBeTruthy();
    expect(playerUid).not.toBe(dmUid);

    await dmPage.locator("#roomNameInput").fill("Beta 1.0 Dungeon");
    await dmPage.locator("#createRoomButton").click();
    await expect(dmPage.locator("#roomDashboardScreen")).toBeVisible();
    await expect(dmPage.locator("#roomCodeText")).toHaveText(
      /^[A-Z0-9]+-[A-Z0-9]+$/,
      { timeout: 30000 }
    );
    const roomCode = (await dmPage.locator("#roomCodeText").textContent())?.trim() || "";
    expect(roomCode).toMatch(/^[A-Z0-9]+-[A-Z0-9]+$/);

    await playerPage.locator("#joinRoomCodeInput").fill(roomCode);
    await playerPage.locator("#joinRoomButton").click();
    await expect(playerPage.locator("#roomDashboardScreen")).toBeVisible();
    await expect(playerPage.locator("#roomCodeText")).toHaveText(roomCode);
    await expect(dmPage.locator("#playersList")).toContainText("Beta Player");

    const roomPath = ["rooms", roomCode];
    const playerRecord = await firestoreGet(dmPage, [...roomPath, "players", playerUid]);
    expect(playerRecord?.role).toBe("player");

    // Character save and linked token creation use the real room collections.
    await playerPage.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen("characterCreator"));
    await expect(playerPage.locator("#characterCreatorScreen")).toBeVisible();
    await playerPage.getByRole("button", { name: "Start Character", exact: true }).click();
    await expect(playerPage.getByLabel("Character Name", { exact: true })).toBeVisible();
    await playerPage.getByLabel("Character Name", { exact: true }).fill("Aria Emberfall");
    await playerPage.locator('[data-cc-action="save-character"]').first().click();
    await expect.poll(async () => {
      return playerPage.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.getCharacterCreatorTestState());
    }).toMatchObject({ isSaving: false, dirty: false });
    const characterState = await playerPage.evaluate(() => (
      window.__HOMEBREW_GOD_RELEASE_TEST__.getCharacterCreatorTestState()
    ));
    expect(characterState.currentCharacterId).toBeTruthy();
    const characterId = characterState.currentCharacterId;
    const character = await firestoreGet(playerPage, [...roomPath, "characters", characterId]);
    expect(character?.identity?.name).toBe("Aria Emberfall");

    await firestoreSet(dmPage, [...roomPath, "tokens", "aria-token"], {
      id: "aria-token",
      name: "Aria Emberfall",
      ownerUid: playerUid,
      sourceType: "character",
      linkedCharacterId: characterId,
      sheetId: characterId,
      visibility: "shared",
      sceneId: "beta-dungeon",
      floorId: "ground",
      x: 18,
      y: 20,
      elevation: 0,
      elevationFeet: 0,
      heightAboveFloor: 0,
      currentHp: 12,
      maxHp: 12,
      movementSpeed: 30,
      movementSpeeds: { walk: 30 },
      updatedAtMillis: 2
    });

    // Exercise the real upload UI while replacing only the external Cloudinary response.
    await dmPage.route("https://api.cloudinary.com/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          secure_url: "https://example.test/beta-dungeon.webp",
          public_id: "beta/dungeon-map",
          delete_token: "beta-delete-token"
        })
      });
    });
    await dmPage.setInputFiles("#roomMapUploadInput", {
      name: "beta-dungeon.png",
      mimeType: "image/png",
      buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZLhwAAAAASUVORK5CYII=", "base64")
    });
    await dmPage.locator("#uploadRoomMapButton").click();
    await expect(dmPage.locator("#mapUploadStatus")).toContainText("uploaded", { timeout: 30000 });
    await playerPage.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen("room"));
    await expect(playerPage.locator("#roomDashboardScreen")).toBeVisible();
    await expect(playerPage.locator("#currentMapNameText")).toContainText("beta-dungeon");
    const maps = await firestoreList(dmPage, [...roomPath, "maps"]);
    expect(maps).toHaveLength(1);

    // Three floors and two stair connections.
    await firestoreSet(dmPage, [...roomPath, "scenes", "beta-dungeon"], {
      id: "beta-dungeon",
      roomCode,
      name: "Beta 1.0 Dungeon",
      description: "Three-floor release playtest",
      schemaVersion: 1,
      createdAtMillis: 3,
      updatedAtMillis: 3
    });
    for (const floor of [
      floorRecord(roomCode, "basement", "Basement", -10, 0),
      floorRecord(roomCode, "ground", "Ground Floor", 0, 1),
      floorRecord(roomCode, "upper", "Upper Floor", 15, 2)
    ]) {
      await firestoreSet(dmPage, [...roomPath, "scenes", "beta-dungeon", "floors", floor.id], floor);
    }
    for (const connection of [
      {
        id: "stairs-basement",
        source: { floorId: "basement", x: 15, y: 15 },
        destination: { floorId: "ground", x: 25, y: 25 }
      },
      {
        id: "stairs-upper",
        source: { floorId: "ground", x: 70, y: 70 },
        destination: { floorId: "upper", x: 80, y: 80 }
      }
    ]) {
      await firestoreSet(dmPage, [...roomPath, "scenes", "beta-dungeon", "connections", connection.id], {
        ...connection,
        sceneId: "beta-dungeon",
        roomCode,
        name: connection.id === "stairs-basement" ? "Basement Stairs" : "Upper Stairs",
        description: "",
        type: "stairs",
        bidirectional: true,
        allowPlayers: true,
        movementCost: 10,
        schemaVersion: 1,
        createdAtMillis: 4,
        updatedAtMillis: 4
      });
    }
    expect(await firestoreList(playerPage, [...roomPath, "scenes", "beta-dungeon", "floors"])).toHaveLength(3);

    // Fog, exploration, locked door, and a genuinely private trap/puzzle.
    await firestoreSet(dmPage, [...roomPath, "fogSettings", "map-ground"], {
      mapId: "map-ground",
      roomCode,
      enabled: true,
      baseState: "hidden",
      revision: 1,
      updatedByUid: dmUid,
      updatedAtMillis: 5
    });
    await firestoreSet(dmPage, [...roomPath, "fogOperations", "reveal-entry"], {
      id: "reveal-entry",
      roomCode,
      mapId: "map-ground",
      revision: 1,
      authorUid: dmUid,
      mode: "reveal",
      tool: "rectangle",
      size: 60,
      points: [],
      start: { x: 5, y: 5 },
      end: { x: 35, y: 35 },
      order: 1000,
      createdAtMillis: 5
    });
    await firestoreSet(playerPage, [...roomPath, "visionExploration", `map-ground:${playerUid}`], {
      roomCode,
      mapId: "map-ground",
      ownerUid: playerUid,
      resolution: 16,
      cells: `1${"0".repeat(255)}`,
      updatedAtMillis: 6
    });

    const door = mapObject(roomCode, "locked-door", "door", "closed", "shared", {
      createdByUid: dmUid,
      updatedByUid: dmUid
    });
    const trap = mapObject(roomCode, "needle-trap", "trap", "armed", "dm", {
      createdByUid: dmUid,
      updatedByUid: dmUid,
      blocksMovement: false,
      blocksVision: false
    });
    await firestoreSet(dmPage, [...roomPath, "objects", door.id], door);
    await firestoreSet(dmPage, [...roomPath, "dmObjects", trap.id], trap);
    await firestoreSet(dmPage, [...roomPath, "dmPuzzles", "vault-puzzle"], {
      id: "vault-puzzle",
      roomCode,
      name: "Vault Lock",
      description: "Hidden trap unlocks the door",
      enabled: true,
      hiddenState: true,
      allowCrossFloor: false,
      triggerMode: "all",
      triggers: [{ id: "trigger-1", objectId: "needle-trap", stateId: "disabled" }],
      actions: [{ id: "action-1", objectId: "locked-door", stateId: "open", lockMode: "unlock" }],
      resetActions: [],
      runtime: {
        status: "idle",
        sequenceIndex: 0,
        executionId: "",
        lastObjectId: "",
        solvedAtMillis: 0,
        message: ""
      },
      revision: 1,
      createdByUid: dmUid,
      updatedByUid: dmUid,
      createdAtMillis: 7,
      updatedAtMillis: 7,
      schemaVersion: 1
    });
    expect((await firestoreGet(playerPage, [...roomPath, "objects", door.id]))?.locked).toBe(true);
    await expectPermissionDenied(() => firestoreGet(playerPage, [...roomPath, "dmObjects", trap.id]));
    await expectPermissionDenied(() => firestoreGet(playerPage, [...roomPath, "dmPuzzles", "vault-puzzle"]));

    // Start combat and make a tracked move atomically before resolving attack/spell outcomes.
    await firestoreUpdate(dmPage, roomPath, {
      initiativeState: {
        combatActive: true,
        roundNumber: 1,
        turnCounter: 0,
        currentCombatantId: "aria-token",
        initiativeOrder: [{ tokenId: "aria-token", initiative: 18 }]
      },
      movementState: {
        combatActive: true,
        activeTokenId: "aria-token",
        activeTokenName: "Aria Emberfall",
        baseSpeed: 30,
        movementMode: "walk",
        movementModeBaseSpeed: 30,
        dashCount: 0,
        movementRemaining: 30,
        movementSpent: 0,
        movementTurnKey: "1:aria-token",
        turnRoundNumber: 1,
        lastConfirmedPosition: { x: 18, y: 20, elevation: 0 },
        lastMoveForced: false,
        movementOverage: 0
      },
      updatedAt: 8
    });
    await playerPage.evaluate(async ({ firestoreUrl, roomCode }) => {
      const { doc, getFirestore, writeBatch } = await import(firestoreUrl);
      const db = getFirestore();
      const batch = writeBatch(db);
      batch.update(doc(db, "rooms", roomCode), {
        movementState: {
          combatActive: true,
          activeTokenId: "aria-token",
          activeTokenName: "Aria Emberfall",
          baseSpeed: 30,
          movementMode: "walk",
          movementModeBaseSpeed: 30,
          dashCount: 0,
          movementRemaining: 20,
          movementSpent: 10,
          movementTurnKey: "1:aria-token",
          turnRoundNumber: 1,
          lastConfirmedPosition: { x: 28, y: 20, elevation: 0 },
          lastMoveForced: false,
          movementOverage: 0
        },
        updatedAt: 9
      });
      batch.update(doc(db, "rooms", roomCode, "tokens", "aria-token"), {
        x: 28,
        y: 20,
        movedAtMillis: 9,
        updatedAtMillis: 9
      });
      await batch.commit();
    }, { firestoreUrl: FIREBASE_FIRESTORE_URL, roomCode });
    expect((await firestoreGet(dmPage, [...roomPath, "tokens", "aria-token"]))?.x).toBe(28);

    const attackTurn = {
      schemaVersion: 1,
      tokenId: "aria-token",
      combatActive: true,
      turnKey: "1:0:aria-token",
      roundNumber: 1,
      turnCounter: 0,
      actionsRemaining: 0,
      bonusActionsRemaining: 1,
      reactionAvailable: true,
      attackActionStarted: true,
      attacksRemaining: 0,
      actionSurgeUsed: false,
      dashUsed: false,
      disengaged: false,
      dodging: false,
      hidden: false,
      helping: false,
      lastCommand: "attack",
      lastResource: "action",
      lastCommandByUid: playerUid,
      revision: 1,
      updatedAtMillis: 10,
      updatedAt: 10
    };
    await firestoreSet(playerPage, [...roomPath, "combatTurns", "aria-token"], attackTurn);
    await firestoreSet(playerPage, [...roomPath, "combatEffects", "fire-bolt-impact"], {
      id: "fire-bolt-impact",
      roomCode,
      createdByUid: playerUid,
      kind: "spell-impact",
      spellId: "fire-bolt",
      animationId: "fire_bolt_01",
      damage: 7,
      createdAtMillis: 11
    });
    await firestoreSet(dmPage, [...roomPath, "effects", "burning"], {
      id: "burning",
      definitionId: "burning",
      name: "Burning",
      type: "condition",
      icon: "",
      description: "Taking fire damage",
      roomCode,
      sourceId: "fire-bolt",
      sourceType: "spell",
      targetTokenId: "aria-token",
      targetCharacterId: characterId,
      duration: { type: "rounds", value: 1 },
      timing: { apply: "impact", remove: "turn-end" },
      modifiers: [],
      tags: ["fire"],
      animation: { id: "burning_loop" },
      createdByUid: dmUid,
      createdAtMillis: 11,
      updatedAtMillis: 11
    });

    const damageRevision = Number(character.revision) + 1;
    await firestoreSet(playerPage, [...roomPath, "characters", characterId], {
      ...character,
      revision: damageRevision,
      combat: {
        ...(character.combat || {}),
        currentHp: 5,
        maxHp: 12
      },
      updatedAtMillis: 12
    });
    const damagedCharacter = await firestoreGet(dmPage, [...roomPath, "characters", characterId]);
    await firestoreSet(playerPage, [...roomPath, "characters", characterId], {
      ...damagedCharacter,
      revision: damageRevision + 1,
      combat: {
        ...(damagedCharacter.combat || {}),
        currentHp: 10,
        maxHp: 12
      },
      updatedAtMillis: 13
    });
    expect((await firestoreGet(dmPage, [...roomPath, "characters", characterId]))?.combat?.currentHp).toBe(10);

    await playerPage.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen("battle"));
    const vfx = await playerPage.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.playVfxTest({
      type: "procedural-pulse",
      duration: 150,
      intensity: 2
    }));
    expect(vfx.ok || vfx.skipped === false).toBe(true);

    await firestoreUpdate(dmPage, roomPath, {
      initiativeState: {
        combatActive: false,
        roundNumber: 1,
        turnCounter: 1,
        currentCombatantId: "",
        initiativeOrder: []
      },
      movementState: {},
      updatedAt: 14
    });
    await firestoreUpdate(dmPage, roomPath, {
      drawingSettings: { playersEnabled: true },
      updatedAt: 14.5
    });

    // Shared, personal, and DM notes persist with physical privacy boundaries.
    const sharedNote = {
      id: "session-one",
      roomCode,
      ownerUid: playerUid,
      ownerName: "Beta Player",
      title: "Session One",
      category: "Session Notes",
      visibility: "shared",
      contentHtml: "<p>Found the vault and survived the trap.</p>",
      searchText: "session one found the vault and survived the trap",
      revision: 1,
      createdAtMillis: 15,
      updatedAtMillis: 15
    };
    await Promise.all([
      firestoreSet(playerPage, [...roomPath, "sharedJournal", sharedNote.id], sharedNote),
      firestoreSet(playerPage, [...roomPath, "personalJournal", "player-plan"], {
        ...sharedNote,
        id: "player-plan",
        title: "Private plan",
        visibility: "personal",
        searchText: "private plan",
        contentHtml: "<p>Return for the upper floor.</p>"
      }),
      firestoreSet(dmPage, [...roomPath, "dmJournal", "dm-secret"], {
        ...sharedNote,
        id: "dm-secret",
        ownerUid: dmUid,
        ownerName: "Beta Dungeon Master",
        title: "Dragon secret",
        visibility: "dm",
        searchText: "dragon secret",
        contentHtml: "<p>The dragon is behind the vault.</p>"
      }),
      firestoreSet(dmPage, [...roomPath, "sharedDrawings", "dm-arrow"], {
        id: "dm-arrow",
        roomCode,
        mapId: "map-ground",
        authorUid: dmUid,
        authorName: "Beta Dungeon Master",
        originalAuthorUid: "",
        originalAuthorName: "",
        restoredByUid: "",
        layer: "shared",
        tool: "arrow",
        color: "#ff3b5c",
        size: 4,
        points: [],
        start: { x: 10, y: 10 },
        end: { x: 30, y: 30 },
        createdAtMillis: 15,
        updatedAtMillis: 15
      }),
      firestoreSet(playerPage, [...roomPath, "sharedDrawings", "player-line"], {
        id: "player-line",
        roomCode,
        mapId: "map-ground",
        authorUid: playerUid,
        authorName: "Beta Player",
        originalAuthorUid: "",
        originalAuthorName: "",
        restoredByUid: "",
        layer: "shared",
        tool: "line",
        color: "#32d583",
        size: 3,
        points: [],
        start: { x: 20, y: 20 },
        end: { x: 40, y: 40 },
        createdAtMillis: 15,
        updatedAtMillis: 15
      })
    ]);
    expect((await firestoreGet(dmPage, [...roomPath, "sharedJournal", sharedNote.id]))?.title).toBe("Session One");
    expect(await firestoreList(playerPage, [...roomPath, "sharedDrawings"])).toHaveLength(2);
    await expectPermissionDenied(() => firestoreGet(playerPage, [...roomPath, "dmJournal", "dm-secret"]));
    await expectPermissionDenied(() => firestoreGet(dmPage, [...roomPath, "personalJournal", "player-plan"]));

    // Disconnect/reconnect and full refresh preserve the authenticated room state.
    await Promise.all([dmPage.reload({ waitUntil: "domcontentloaded" }), playerPage.reload({ waitUntil: "domcontentloaded" })]);
    await expect(dmPage.locator("#roomDashboardScreen")).toBeVisible({ timeout: 30000 });
    await expect(playerPage.locator("#battleMapScreen")).toBeVisible({ timeout: 30000 });
    await expect(dmPage.locator("#roomCodeText")).toHaveText(roomCode);
    await expect(playerPage.locator("#battleRoomCodeText")).toHaveText(roomCode);
    expect((await firestoreGet(playerPage, [...roomPath, "characters", characterId]))?.combat?.currentHp).toBe(10);
    expect(await firestoreList(playerPage, [...roomPath, "scenes", "beta-dungeon", "floors"])).toHaveLength(3);

    // Removal revokes access immediately; deliberate rejoin restores only member data.
    await firestoreDelete(dmPage, [...roomPath, "players", playerUid]);
    await expect.poll(
      () => firestoreGet(dmPage, [...roomPath, "players", playerUid]),
      { timeout: 15000 }
    ).toBeNull();

    rejoinContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const rejoinPage = await rejoinContext.newPage();
    rejoinPage.on("pageerror", (error) => unexpectedErrors.push(`Rejoined player: ${error.message}`));
    rejoinPage.on("dialog", (dialog) => dialog.accept());
    await signInRegistered(rejoinPage, playerAccount);
    expect(await currentUid(rejoinPage)).toBe(playerUid);
    await expectPermissionDenied(() => firestoreGet(rejoinPage, roomPath));

    await rejoinPage.locator("#joinRoomCodeInput").fill(roomCode);
    await rejoinPage.locator("#joinRoomButton").click();
    await expect(rejoinPage.locator("#roomDashboardScreen")).toBeVisible();
    expect((await firestoreGet(rejoinPage, roomPath))?.dmUid).toBe(dmUid);
    await expectPermissionDenied(() => firestoreUpdate(rejoinPage, roomPath, {
      roomName: "Hijacked Campaign"
    }));
    await expectPermissionDenied(() => firestoreGet(rejoinPage, [...roomPath, "dmJournal", "dm-secret"]));

    expect(unexpectedErrors).toEqual([]);
  } finally {
    await Promise.all([
      dmContext.close(),
      playerContext.close(),
      rejoinContext?.close()
    ]);
  }
});
