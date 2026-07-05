// =====================================================
// APP SECTION 1 — FIREBASE IMPORTS
// =====================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  addDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  runTransaction,
  writeBatch,
  deleteField,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { createTokenSystem } from "./tokens.js";
import { createCharacterCreator } from "./characterCreator.fixed.js";
// =====================================================
// APP SECTION 2 — FIREBASE / CLOUDINARY CONFIG
// =====================================================

const firebaseConfig = {
  apiKey: "AIzaSyCT1IqS08HyXsP-o6pXJfYtz8p6BtM9Cb4",
  authDomain: "homebrewgd.firebaseapp.com",
  projectId: "homebrewgd",
  storageBucket: "homebrewgd.firebasestorage.app",
  messagingSenderId: "1067340395343",
  appId: "1:1067340395343:web:03ad344ced2aaa16c48b3a",
  measurementId: "G-HWJRCXHN8P"
};

const cloudName = "dkezxpnl6";
const uploadPreset = "homebrewgod_maps";
const cloudinaryDeleteEndpoint = "";
const CLOUDINARY_DELETE_TOKEN_MAX_AGE_MS = 9 * 60 * 1000;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// =====================================================
// APP SECTION 3 — PAGE ELEMENTS / STATE
// =====================================================

const $ = (id) => document.getElementById(id);

const E = {
  // Main screens
  authScreen: $("authScreen"),
  lobbyScreen: $("lobbyScreen"),
  roomDashboardScreen: $("roomDashboardScreen"),
  battleMapScreen: $("battleMapScreen"),
  monsterCreatorScreen: $("monsterCreatorScreen"),
  characterCreatorScreen: $("characterCreatorScreen"),

  // Auth
  guestNameInput: $("guestNameInput"),
  guestButton: $("guestButton"),
  signupNameInput: $("signupNameInput"),
  signupEmailInput: $("signupEmailInput"),
  signupPasswordInput: $("signupPasswordInput"),
  signupButton: $("signupButton"),
  loginEmailInput: $("loginEmailInput"),
  loginPasswordInput: $("loginPasswordInput"),
  loginButton: $("loginButton"),
  logoutButton: $("logoutButton"),

  userNameText: $("userNameText"),
  userTypeText: $("userTypeText"),
  userIdText: $("userIdText"),
  myRoomsList: $("myRoomsList"),

  // Lobby / room
  roomNameInput: $("roomNameInput"),
  createRoomButton: $("createRoomButton"),
  joinRoomCodeInput: $("joinRoomCodeInput"),
  joinRoomButton: $("joinRoomButton"),
  roomStatusText: $("roomStatusText"),

  backToLobbyButton: $("backToLobbyButton"),
  openBattleMapButton: $("openBattleMapButton"),
  currentRoomNameText: $("currentRoomNameText"),
  roomCodeText: $("roomCodeText"),
  copyRoomCodeButton: $("copyRoomCodeButton"),
  saveThisRoomButton: $("saveThisRoomButton"),
  deleteRoomButton: $("deleteRoomButton"),
  yourRoleText: $("yourRoleText"),
  playersList: $("playersList"),

  // Room map controls
  dmMapControls: $("dmMapControls"),
  roomMapUploadInput: $("roomMapUploadInput"),
  uploadRoomMapButton: $("uploadRoomMapButton"),
  removeRoomMapButton: $("removeRoomMapButton"),
  saveCurrentMapButton: $("saveCurrentMapButton"),
  mapUploadStatus: $("mapUploadStatus"),
  roomMapsList: $("roomMapsList"),
  currentMapNameText: $("currentMapNameText"),
  roomMapPreviewImage: $("roomMapPreviewImage"),
  noRoomMapPreviewText: $("noRoomMapPreviewText"),

  // Battle map top bar
  backToRoomButton: $("backToRoomButton"),
  zoomOutButton: $("zoomOutButton"),
  zoomResetButton: $("zoomResetButton"),
  zoomInButton: $("zoomInButton"),
  battleRoomNameText: $("battleRoomNameText"),
  battleRoomCodeText: $("battleRoomCodeText"),
  battleMapNameText: $("battleMapNameText"),
  battleZoomText: $("battleZoomText"),
  battleMapImage: $("battleMapImage"),
  noBattleMapText: $("noBattleMapText"),
  battleMapViewer: $("battleMapViewer"),

  // Old quick battle map controls, kept safe if missing
  battleDmMapControls: $("battleDmMapControls"),
  battleMapUploadInput: $("battleMapUploadInput"),
  updateBattleMapButton: $("updateBattleMapButton"),
  battleMapUpdateStatus: $("battleMapUpdateStatus"),

  // Battle manager
  battleManagerBar: $("battleManagerBar"),
  battleManagerInner: $("battleManagerInner"),
  battleMapSurface: $("battleMapSurface"),

  // Puzzle map
  puzzleMapControls: $("puzzleMapControls"),
  puzzleTileUploadInput: $("puzzleTileUploadInput"),
  addTileNorthButton: $("addTileNorthButton"),
  addTileSouthButton: $("addTileSouthButton"),
  addTileEastButton: $("addTileEastButton"),
  addTileWestButton: $("addTileWestButton"),
  centerPuzzleBoardButton: $("centerPuzzleBoardButton"),
  puzzleMapStatus: $("puzzleMapStatus"),
  puzzleMapBoard: $("puzzleMapBoard"),
  puzzleMapEmptyText: $("puzzleMapEmptyText"),

  // Tokens
  tokenBuilderControls: $("tokenBuilderControls"),
  tokenLayer: $("tokenLayer"),

  // Creator launchers
  creatorLauncherControls: $("creatorLauncherControls"),
  openMonsterCreatorButton: $("openMonsterCreatorButton"),
  openCharacterCreatorButton: $("openCharacterCreatorButton"),

  // Character creator navigation
  backFromCharacterCreatorButton: $("backFromCharacterCreatorButton")
};

let currentUser = null;
let currentRoomCode = null;
let currentRoomData = null;
let currentIsDM = false;
let currentMapId = null;
let displayedSharedMapUrl = null;

let latestMapsSnapshot = null;
let latestActivePlayersSnapshot = null;
let latestPuzzleTiles = null;
let savedRoomDocs = [];
let savedRoomsLastDoc = null;
let savedRoomsHasMore = false;
let savedRoomsLoadingMore = false;
let roomMapsLastDoc = null;
let roomMapsHasMore = false;
let roomMapsLoadingMore = false;
let roomMapsPaginationRoomCode = null;
let isMigratingLegacyPuzzleTiles = false;
let legacyPuzzleTileMigrationPromise = null;
let hasMigratedLegacyPuzzleTiles = false;

let battleZoom = 1;

let stopListeningToMyRooms = null;
let stopListeningToRoom = null;
let stopListeningToPlayers = null;
let stopListeningToMaps = null;
let stopListeningToPuzzleTiles = null;

let tokenSystem = null;
let characterCreatorSystem = null;

let activeSessionId = makeActiveSessionId();
let activeSessionRoomCode = null;
let activeSessionRole = null;
let activePlayerHeartbeatTimer = null;
const staleActivePlayerCleanupAttempts = new Map();

const ACTIVE_PLAYER_HEARTBEAT_MS = 25000;
const ACTIVE_PLAYER_STALE_MS = 120000;
const ACTIVE_PLAYER_CLEANUP_RETRY_MS = 60000;
const COLLECTION_PAGE_SIZE = 20;
const PUZZLE_COORDINATE_LIMIT = 50;
const PUZZLE_MAX_GRID_SPAN = 12;
const ROOM_DELETE_BATCH_SIZE = 400;
const ROOM_OWNED_SUBCOLLECTIONS = [
  "players",
  "maps",
  "puzzleTiles",
  "tokens",
  "characters",
  "activePlayers"
];
const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_UPLOAD_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif"
]);
const ALLOWED_IMAGE_UPLOAD_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "avif"
]);

function makeActiveSessionId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return String(Date.now()) + "-" + Math.random().toString(36).slice(2);
}

const startupParams = new URLSearchParams(window.location.search);
const startupRoomCode = String(startupParams.get("room") || "").trim().toUpperCase();
const startupView = startupParams.get("view");
let alreadyUsedStartupLink = false;

// =====================================================
// APP SECTION 4 — HELPERS
// =====================================================

function showScreen(screenName) {
  E.authScreen.classList.add("hidden");
  E.lobbyScreen.classList.add("hidden");
  E.roomDashboardScreen.classList.add("hidden");
  E.battleMapScreen.classList.add("hidden");
  E.monsterCreatorScreen.classList.add("hidden");
  E.characterCreatorScreen.classList.add("hidden");

  if (screenName === "auth") E.authScreen.classList.remove("hidden");
  if (screenName === "lobby") E.lobbyScreen.classList.remove("hidden");
  if (screenName === "room") E.roomDashboardScreen.classList.remove("hidden");
  if (screenName === "battle") E.battleMapScreen.classList.remove("hidden");
  if (screenName === "monsterCreator") E.monsterCreatorScreen.classList.remove("hidden");
  if (screenName === "characterCreator") E.characterCreatorScreen.classList.remove("hidden");
}

function text(el, value) {
  if (el) el.textContent = value;
}

function addOptionalEventListener(element, eventName, handler) {
  if (element) {
    element.addEventListener(eventName, handler);
  }
}

function normalizeRoomCode(code) {
  return String(code || "").trim().toUpperCase();
}

function makeRoomCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const numbers = "23456789";
  let a = "";
  let b = "";

  for (let i = 0; i < 3; i++) a += letters[Math.floor(Math.random() * letters.length)];
  for (let i = 0; i < 3; i++) b += numbers[Math.floor(Math.random() * numbers.length)];

  return a + "-" + b;
}

function clearRoomListeners() {
  if (stopListeningToRoom) stopListeningToRoom();
  if (stopListeningToPlayers) stopListeningToPlayers();
  if (stopListeningToMaps) stopListeningToMaps();
  if (stopListeningToPuzzleTiles) stopListeningToPuzzleTiles();

  stopListeningToRoom = null;
  stopListeningToPlayers = null;
  stopListeningToMaps = null;
  stopListeningToPuzzleTiles = null;
  latestActivePlayersSnapshot = null;
  latestPuzzleTiles = null;
  roomMapsLastDoc = null;
  roomMapsHasMore = false;
  roomMapsLoadingMore = false;
  roomMapsPaginationRoomCode = null;
  hasMigratedLegacyPuzzleTiles = false;
  staleActivePlayerCleanupAttempts.clear();
}

function getSafeMapName(fileName) {
  return fileName || "Current Battle Map";
}

function setDmControlsVisible(isVisible) {
  const controls = [E.dmMapControls, E.battleDmMapControls, E.puzzleMapControls];

  controls.forEach((el) => {
    if (!el) return;
    if (isVisible) el.classList.remove("hidden");
    else el.classList.add("hidden");
  });

  if (E.deleteRoomButton) {
    const canDeleteRoom =
      !!isVisible &&
      !!currentUser &&
      !!currentRoomCode &&
      !!currentRoomData &&
      currentRoomData.dmUid === currentUser.uid;

    E.deleteRoomButton.classList.toggle("hidden", !canDeleteRoom);
  }
}

function normalizeCurrentMapData(mapData) {
  if (!mapData || !mapData.url) {
    return null;
  }

  const normalizedMap = {
    id: mapData.id || null,
    name: mapData.name || "Current Battle Map",
    url: mapData.url,
    publicId: mapData.publicId || null,
    deleteToken: mapData.deleteToken || null,
    deleteTokenCreatedAtMillis: mapData.deleteTokenCreatedAtMillis || null,
    savedToLibrary: mapData.savedToLibrary === true
  };

  if (mapData.puzzleTileKey) {
    normalizedMap.puzzleTileKey = mapData.puzzleTileKey;
  }

  return normalizedMap;
}

function withoutLegacyCurrentMapFields(room, mapData) {
  const nextRoom = {
    ...(room || {}),
    currentMap: normalizeCurrentMapData(mapData)
  };

  delete nextRoom.currentMapUrl;
  delete nextRoom.currentMapName;
  delete nextRoom.currentMapId;
  delete nextRoom.currentMapPublicId;
  delete nextRoom.currentMapDeleteToken;
  delete nextRoom.currentMapDeleteTokenCreatedAtMillis;
  delete nextRoom.currentMapSavedToLibrary;

  return nextRoom;
}

function legacyCurrentMapFieldDeletions() {
  return {
    currentMapUrl: deleteField(),
    currentMapName: deleteField(),
    currentMapId: deleteField(),
    currentMapPublicId: deleteField(),
    currentMapDeleteToken: deleteField(),
    currentMapDeleteTokenCreatedAtMillis: deleteField(),
    currentMapSavedToLibrary: deleteField()
  };
}

function buildMapFromRoomFields(room) {
  if (!room) return null;

  if (Object.prototype.hasOwnProperty.call(room, "currentMap")) {
    return normalizeCurrentMapData(room.currentMap);
  }

  return normalizeCurrentMapData({
    id: room.currentMapId || null,
    name: room.currentMapName || "Current Battle Map",
    url: room.currentMapUrl || null,
    publicId: room.currentMapPublicId || null,
    deleteToken: room.currentMapDeleteToken || null,
    deleteTokenCreatedAtMillis: room.currentMapDeleteTokenCreatedAtMillis || null,
    savedToLibrary: room.currentMapSavedToLibrary === true
  });
}

// =====================================================
// APP SECTION 5 — AUTH
// =====================================================

async function saveUserDoc(user) {
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    displayName: user.displayName || "Unnamed",
    email: user.email || null,
    isAnonymous: user.isAnonymous,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

async function showLoggedOut() {
  showScreen("auth");

  if (stopListeningToMyRooms) {
    stopListeningToMyRooms();
    stopListeningToMyRooms = null;
  }

  await removeActivePlayerSession();
  clearRoomListeners();

  currentUser = null;
  currentRoomCode = null;
  currentRoomData = null;
  currentIsDM = false;
  currentMapId = null;
  latestMapsSnapshot = null;
  latestActivePlayersSnapshot = null;
}

function showLoggedIn(user) {
  text(E.userNameText, user.displayName || "Unnamed");
  text(E.userTypeText, user.isAnonymous ? "Guest" : "Account");
  text(E.userIdText, user.uid);
  showScreen("lobby");
}

addOptionalEventListener(E.guestButton, "click", async function () {
  try {
    const name = E.guestNameInput.value.trim() || "Guest";
    const result = await signInAnonymously(auth);
    await updateProfile(result.user, { displayName: name });
    await saveUserDoc(result.user);
  } catch (error) {
    alert(error.message);
  }
});

addOptionalEventListener(E.signupButton, "click", async function () {
  try {
    const name = E.signupNameInput.value.trim();
    const email = E.signupEmailInput.value.trim();
    const password = E.signupPasswordInput.value;

    if (!name || !email || !password) {
      alert("Fill out display name, email, and password.");
      return;
    }

    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    await saveUserDoc(result.user);
  } catch (error) {
    alert(error.message);
  }
});

addOptionalEventListener(E.loginButton, "click", async function () {
  try {
    const email = E.loginEmailInput.value.trim();
    const password = E.loginPasswordInput.value;

    if (!email || !password) {
      alert("Enter email and password.");
      return;
    }

    const result = await signInWithEmailAndPassword(auth, email, password);
    await saveUserDoc(result.user);
  } catch (error) {
    alert(error.message);
  }
});

addOptionalEventListener(E.logoutButton, "click", async function () {
  try {
    await removeActivePlayerSession();
    await signOut(auth);
  } catch (error) {
    alert(error.message);
  }
});

// =====================================================
// APP SECTION 6 — MY SAVED ROOMS
// =====================================================

async function saveRoomToMyRooms(roomCode, roomName, role) {
  if (!currentUser) return;

  const cleanCode = normalizeRoomCode(roomCode);

  await setDoc(doc(db, "users", currentUser.uid, "rooms", cleanCode), {
    roomCode: cleanCode,
    roomName: roomName || "Unnamed Room",
    role: role || "player",
    updatedAt: serverTimestamp()
  }, { merge: true });
}

function listenToMyRooms() {
  if (!currentUser) return;
  if (stopListeningToMyRooms) stopListeningToMyRooms();

  savedRoomDocs = [];
  savedRoomsLastDoc = null;
  savedRoomsHasMore = false;
  savedRoomsLoadingMore = false;

  const roomsQuery = query(
    collection(db, "users", currentUser.uid, "rooms"),
    orderBy("updatedAt", "desc"),
    limit(COLLECTION_PAGE_SIZE)
  );

  stopListeningToMyRooms = onSnapshot(roomsQuery, {
    includeMetadataChanges: true
  }, function (snap) {
    if (snap.metadata.hasPendingWrites) {
      return;
    }

    savedRoomDocs = snap.docs;
    savedRoomsLastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
    savedRoomsHasMore = snap.docs.length === COLLECTION_PAGE_SIZE;

    if (!E.myRoomsList) {
      return;
    }

    E.myRoomsList.innerHTML = "";

    if (snap.empty) {
      E.myRoomsList.textContent = "No saved rooms yet. Create or join a room and it will appear here.";
      return;
    }

    snap.forEach(function (roomDoc) {
      const room = roomDoc.data();
      const roomCode = roomDoc.id;

      const div = document.createElement("div");
      div.className = "row";

      const title = document.createElement("div");
      title.className = "row-title";
      title.textContent = (room.roomName || "Unnamed Room") + " — " + roomCode;

      const role = document.createElement("div");
      role.className = "small";
      role.textContent = "Role: " + (room.role || "player");

      const openButton = document.createElement("button");
      openButton.textContent = "Open Room";
      openButton.addEventListener("click", () => openRoom(roomCode, "room"));

      const removeButton = document.createElement("button");
      removeButton.textContent = "Remove From My List";
      removeButton.addEventListener("click", async function () {
        if (!confirm("Remove this room from your saved list? The room itself will still exist.")) return;
        await deleteDoc(doc(db, "users", currentUser.uid, "rooms", roomCode));
      });

      div.appendChild(title);
      div.appendChild(role);
      div.appendChild(openButton);
      div.appendChild(removeButton);

      E.myRoomsList.appendChild(div);
    });

    appendSavedRoomsPaginationButton();
  }, function (error) {
    text(E.myRoomsList, "Could not load saved rooms: " + error.message);
  });
}

function appendSavedRoomsPaginationButton() {
  if (!E.myRoomsList) {
    return;
  }

  const existingButton = document.getElementById("savedRoomsLoadMoreButton");

  if (existingButton) {
    existingButton.remove();
  }

  if (!savedRoomsHasMore) {
    return;
  }

  const loadMoreButton = document.createElement("button");
  loadMoreButton.id = "savedRoomsLoadMoreButton";
  loadMoreButton.type = "button";
  loadMoreButton.textContent = savedRoomsLoadingMore ? "Loading..." : "Load More Rooms";
  loadMoreButton.disabled = savedRoomsLoadingMore;
  loadMoreButton.addEventListener("click", loadMoreMyRooms);
  E.myRoomsList.appendChild(loadMoreButton);
}

function appendSavedRoomRow(roomDoc) {
  if (!E.myRoomsList) {
    return;
  }

  const room = roomDoc.data();
  const roomCode = roomDoc.id;
  const div = document.createElement("div");
  div.className = "row";

  const title = document.createElement("div");
  title.className = "row-title";
  title.textContent = (room.roomName || "Unnamed Room") + " - " + roomCode;

  const role = document.createElement("div");
  role.className = "small";
  role.textContent = "Role: " + (room.role || "player");

  const openButton = document.createElement("button");
  openButton.textContent = "Open Room";
  openButton.addEventListener("click", function () {
    openRoom(roomCode, "room");
  });

  const removeButton = document.createElement("button");
  removeButton.textContent = "Remove From My List";
  removeButton.addEventListener("click", async function () {
    if (!confirm("Remove this room from your saved list? The room itself will still exist.")) return;
    if (!currentUser) return;

    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "rooms", roomCode));
      savedRoomDocs = savedRoomDocs.filter(function (savedRoomDoc) {
        return savedRoomDoc.id !== roomCode;
      });
      div.remove();
    } catch (error) {
      alert(error.message);
    }
  });

  div.appendChild(title);
  div.appendChild(role);
  div.appendChild(openButton);
  div.appendChild(removeButton);
  E.myRoomsList.appendChild(div);
}

async function loadMoreMyRooms() {
  if (
    !currentUser ||
    !savedRoomsLastDoc ||
    !savedRoomsHasMore ||
    savedRoomsLoadingMore
  ) {
    return;
  }

  const userId = currentUser.uid;
  const cursor = savedRoomsLastDoc;
  savedRoomsLoadingMore = true;
  appendSavedRoomsPaginationButton();

  try {
    const nextPage = await getDocs(query(
      collection(db, "users", userId, "rooms"),
      orderBy("updatedAt", "desc"),
      startAfter(cursor),
      limit(COLLECTION_PAGE_SIZE)
    ));

    if (!currentUser || currentUser.uid !== userId) {
      return;
    }

    const existingButton = document.getElementById("savedRoomsLoadMoreButton");
    if (existingButton) existingButton.remove();

    const knownRoomIds = new Set(savedRoomDocs.map(function (roomDoc) {
      return roomDoc.id;
    }));
    const newRoomDocs = nextPage.docs.filter(function (roomDoc) {
      return !knownRoomIds.has(roomDoc.id);
    });

    newRoomDocs.forEach(appendSavedRoomRow);
    savedRoomDocs = savedRoomDocs.concat(newRoomDocs);

    if (nextPage.docs.length > 0) {
      savedRoomsLastDoc = nextPage.docs[nextPage.docs.length - 1];
    }

    savedRoomsHasMore = nextPage.docs.length === COLLECTION_PAGE_SIZE;
  } catch (error) {
    text(E.roomStatusText, "Could not load more saved rooms: " + error.message);
  } finally {
    savedRoomsLoadingMore = false;

    if (currentUser && currentUser.uid === userId) {
      appendSavedRoomsPaginationButton();
    }
  }
}

// =====================================================
// APP SECTION 7 — ROOM CREATE / JOIN / OPEN
// =====================================================

async function createRoom() {
  const roomName = E.roomNameInput.value.trim() || "Unnamed Room";
  let roomCode = null;

  for (let attempt = 0; attempt < 10; attempt++) {
    const candidateCode = makeRoomCode();
    const roomRef = doc(db, "rooms", candidateCode);

    const created = await runTransaction(db, async function (transaction) {
      const roomSnap = await transaction.get(roomRef);

      if (roomSnap.exists()) {
        return false;
      }

      transaction.set(roomRef, {
        roomCode: candidateCode,
        roomName,
        dmUid: currentUser.uid,
        dmName: currentUser.displayName || "Unnamed",
        currentMap: null,
        puzzleTiles: [],
        activePuzzleTileKey: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return true;
    });

    if (created) {
      roomCode = candidateCode;
      break;
    }
  }

  if (!roomCode) {
    throw new Error("Could not generate a unique room code. Please try again.");
  }

  await savePlayerHistory(roomCode, "dm");
  await saveRoomToMyRooms(roomCode, roomName, "dm");

  openRoom(roomCode, "room");
  text(E.roomStatusText, "Room created and saved to My Saved Rooms.");
}

async function joinRoom(roomCode, wantedRole = "player", screenToShow = "room") {
  const cleanCode = normalizeRoomCode(roomCode);

  if (!cleanCode) {
    alert("Enter a room code.");
    return;
  }

  const roomRef = doc(db, "rooms", cleanCode);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) {
    alert("Room not found.");
    return;
  }

  const roomData = roomSnap.data();

  if (roomData.deletingAt) {
    alert("This room is being permanently deleted.");
    return;
  }

  const finalRole = roomData.dmUid === currentUser.uid ? "dm" : wantedRole;

  await savePlayerHistory(cleanCode, finalRole);
  await saveRoomToMyRooms(cleanCode, roomData.roomName || "Unnamed Room", finalRole);

  openRoom(cleanCode, screenToShow);
}

function openRoom(roomCode, screenToShow = "room") {
  const cleanCode = normalizeRoomCode(roomCode);

  currentRoomCode = cleanCode;
  latestMapsSnapshot = null;
  latestActivePlayersSnapshot = null;
  latestPuzzleTiles = null;
  hasMigratedLegacyPuzzleTiles = false;

  clearRoomListeners();

  stopListeningToRoom = onSnapshot(doc(db, "rooms", cleanCode), {
    includeMetadataChanges: true
  }, async function (roomSnap) {
    if (roomSnap.metadata.hasPendingWrites) {
      return;
    }

    if (!roomSnap.exists()) {
      alert("This room was deleted or does not exist.");
      await leaveCurrentRoomView();
      return;
    }

    const room = mergeRoomWithPuzzleTileDocs(roomSnap.data());

    if (room.deletingAt && room.dmUid !== currentUser.uid) {
      alert("This room is being permanently deleted by the DM.");
      await leaveCurrentRoomView();
      return;
    }

    currentRoomData = room;
    currentIsDM = room.dmUid === currentUser.uid;

    text(E.currentRoomNameText, room.roomName || "Unnamed Room");
    text(E.roomCodeText, cleanCode);
    text(E.battleRoomNameText, room.roomName || "Unnamed Room");
    text(E.battleRoomCodeText, cleanCode);
    text(E.yourRoleText, currentIsDM ? "DM" : "Player");

    setDmControlsVisible(currentIsDM);

    if (room.deletingAt && currentIsDM) {
      text(E.roomStatusText, "Room deletion is incomplete. Use Delete Room Permanently to retry.");
    }

    const nextActiveSessionRole = currentIsDM ? "dm" : "player";

    if (activeSessionRoomCode !== cleanCode) {
      await setActivePlayerSession(cleanCode, nextActiveSessionRole);
    } else if (activeSessionRole !== nextActiveSessionRole) {
      activeSessionRole = nextActiveSessionRole;
      await touchActivePlayerSession();
    }

    showSharedMap(buildMapFromRoomFields(currentRoomData));
    renderPuzzleBoard(currentRoomData);
    maybeMigrateLegacyPuzzleTilesToSubcollection();

    if (latestMapsSnapshot) renderRoomMaps(latestMapsSnapshot);
    if (latestActivePlayersSnapshot) renderPlayers(latestActivePlayersSnapshot);

    openStartupViewIfNeeded();
  }, function (error) {
    alert("Room listener failed: " + error.message);
  });

  listenToPlayers(cleanCode);
  listenToRoomMaps(cleanCode);
  listenToPuzzleTiles(cleanCode);

  if (screenToShow === "battle") {
    showScreen("battle");
    applyBattleZoom();
  } else {
    showScreen("room");
  }
}

async function leaveCurrentRoomView() {
  await removeActivePlayerSession();

  clearRoomListeners();

  currentRoomCode = null;
  currentRoomData = null;
  currentIsDM = false;
  currentMapId = null;
  latestMapsSnapshot = null;
  latestActivePlayersSnapshot = null;

  setDmControlsVisible(false);

  text(E.mapUploadStatus, "");
  text(E.battleMapUpdateStatus, "");
  text(E.puzzleMapStatus, "");

  showScreen("lobby");
}

function ensureRoomDeletionControl() {
  if (!E.deleteRoomButton) {
    const parent = E.saveThisRoomButton && E.saveThisRoomButton.parentElement;

    if (!parent) {
      return;
    }

    E.deleteRoomButton = document.createElement("button");
    E.deleteRoomButton.id = "deleteRoomButton";
    E.deleteRoomButton.type = "button";
    E.deleteRoomButton.textContent = "Delete Room Permanently";
    E.deleteRoomButton.className = E.saveThisRoomButton.className;
    parent.appendChild(E.deleteRoomButton);
  }

  E.deleteRoomButton.classList.add("hidden");

  if (E.deleteRoomButton.dataset.listenerReady !== "true") {
    E.deleteRoomButton.dataset.listenerReady = "true";
    E.deleteRoomButton.addEventListener("click", deleteCurrentRoomPermanently);
  }
}

function rememberRoomCloudinaryAsset(assetMap, asset) {
  const identity = getAssetIdentity(asset);

  if (!identity.publicId && !identity.url) {
    return;
  }

  const assetKey = identity.publicId || identity.url;

  if (!assetMap.has(assetKey)) {
    assetMap.set(assetKey, {
      ...asset,
      publicId: identity.publicId || null,
      url: identity.url || null
    });
  }
}

async function deleteRoomSubcollectionInBatches(roomCode, subcollectionName, onDocument) {
  const subcollectionRef = collection(db, "rooms", roomCode, subcollectionName);

  while (true) {
    const page = await getDocs(query(
      subcollectionRef,
      limit(ROOM_DELETE_BATCH_SIZE)
    ));

    if (page.empty) {
      return;
    }

    const batch = writeBatch(db);

    page.docs.forEach(function (documentSnapshot) {
      if (onDocument) {
        onDocument(documentSnapshot);
      }

      batch.delete(documentSnapshot.ref);
    });

    await batch.commit();
  }
}

function resetDeletedRoomState() {
  currentRoomCode = null;
  currentRoomData = null;
  currentIsDM = false;
  currentMapId = null;
  displayedSharedMapUrl = null;
  latestMapsSnapshot = null;
  latestActivePlayersSnapshot = null;
  latestPuzzleTiles = null;
  setDmControlsVisible(false);
  showScreen("lobby");
}

async function deleteCurrentRoomPermanently() {
  if (
    !currentUser ||
    !currentRoomCode ||
    !currentRoomData ||
    !currentIsDM ||
    currentRoomData.dmUid !== currentUser.uid
  ) {
    alert("Only the room DM can permanently delete this room.");
    return;
  }

  const roomCode = currentRoomCode;
  const userId = currentUser.uid;
  const typedCode = prompt(
    "Type the room code " + roomCode + " to permanently delete this room and its history."
  );

  if (normalizeRoomCode(typedCode) !== roomCode) {
    alert("Room deletion cancelled. The room code did not match.");
    return;
  }

  const roomRef = doc(db, "rooms", roomCode);
  const roomAssets = new Map();
  rememberRoomCloudinaryAsset(
    roomAssets,
    buildMapFromRoomFields(currentRoomData)
  );

  if (E.deleteRoomButton) {
    E.deleteRoomButton.disabled = true;
  }

  text(E.roomStatusText, "Deleting room data and player history...");

  try {
    await removeActivePlayerSession();
    clearRoomListeners();

    await updateDoc(roomRef, {
      deletingAt: serverTimestamp()
    });

    for (const subcollectionName of ROOM_OWNED_SUBCOLLECTIONS) {
      const shouldCollectAssets =
        subcollectionName === "maps" || subcollectionName === "puzzleTiles";

      await deleteRoomSubcollectionInBatches(
        roomCode,
        subcollectionName,
        shouldCollectAssets
          ? function (documentSnapshot) {
              rememberRoomCloudinaryAsset(roomAssets, documentSnapshot.data());
            }
          : null
      );
    }

    await deleteDoc(roomRef);

    try {
      await deleteDoc(doc(db, "users", userId, "rooms", roomCode));
    } catch (error) {
      console.warn("Room deleted, but its saved-room shortcut could not be removed:", error);
    }

    currentRoomData = withoutLegacyCurrentMapFields(currentRoomData, null);
    currentRoomData.puzzleTiles = [];
    latestMapsSnapshot = [];

    for (const asset of roomAssets.values()) {
      await deleteCloudinaryAssetIfUnreferenced(asset, {
        ignoreCurrentMap: true,
        reason: "delete-room"
      });
    }

    resetDeletedRoomState();
    text(E.roomStatusText, "Room permanently deleted.");
  } catch (error) {
    try {
      const remainingRoom = await getDoc(roomRef);

      if (remainingRoom.exists()) {
        await updateDoc(roomRef, {
          deletingAt: deleteField()
        });
        openRoom(roomCode, "room");
      } else {
        resetDeletedRoomState();
      }
    } catch (recoveryError) {
      console.warn("Could not restore the room after an incomplete deletion:", recoveryError);
    }

    alert("Room deletion did not finish: " + error.message);
  } finally {
    if (E.deleteRoomButton) {
      E.deleteRoomButton.disabled = false;
    }
  }
}

ensureRoomDeletionControl();

addOptionalEventListener(E.createRoomButton, "click", async () => {
  try {
    await createRoom();
  } catch (error) {
    alert(error.message);
  }
});

addOptionalEventListener(E.joinRoomButton, "click", async () => {
  try {
    if (!E.joinRoomCodeInput.value.trim()) {
      alert("Enter a room code.");
      return;
    }

    await joinRoom(E.joinRoomCodeInput.value, "player", "room");
    text(E.roomStatusText, "Room joined and saved to My Saved Rooms.");
  } catch (error) {
    alert(error.message);
  }
});

addOptionalEventListener(E.backToLobbyButton, "click", leaveCurrentRoomView);

addOptionalEventListener(E.copyRoomCodeButton, "click", async () => {
  if (!currentRoomCode) return;

  await navigator.clipboard.writeText(currentRoomCode);
  alert("Room code copied.");
});

addOptionalEventListener(E.saveThisRoomButton, "click", async () => {
  try {
    if (!currentRoomCode || !currentRoomData) {
      alert("Open a room first.");
      return;
    }

    await saveRoomToMyRooms(
      currentRoomCode,
      currentRoomData.roomName || "Unnamed Room",
      currentIsDM ? "dm" : "player"
    );

    alert("Room saved to My Saved Rooms.");
  } catch (error) {
    alert(error.message);
  }
});


// =====================================================
// APP SECTION 8 — ACTIVE ROOM PLAYERS
// =====================================================

async function savePlayerHistory(roomCode, role) {
  if (!currentUser) return;

  await setDoc(doc(db, "rooms", roomCode, "players", currentUser.uid), {
    uid: currentUser.uid,
    displayName: currentUser.displayName || "Unnamed",
    role: role || "player",
    joinedAt: serverTimestamp()
  }, { merge: true });
}

function getActivePlayerTimestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value.seconds === "number") {
    return (value.seconds * 1000) + Math.floor((value.nanoseconds || 0) / 1000000);
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function isActivePlayerStale(player, sessionId) {
  if (sessionId === activeSessionId && activeSessionRoomCode) {
    return false;
  }

  const lastSeenMillis = getActivePlayerTimestampMillis(
    player.lastSeenAt || player.joinedAt
  );

  if (!lastSeenMillis) {
    return false;
  }

  return Date.now() - lastSeenMillis > ACTIVE_PLAYER_STALE_MS;
}

async function touchActivePlayerSession() {
  if (!currentUser || !activeSessionRoomCode) return;

  try {
    await setDoc(doc(db, "rooms", activeSessionRoomCode, "activePlayers", activeSessionId), {
      sessionId: activeSessionId,
      uid: currentUser.uid,
      displayName: currentUser.displayName || "Unnamed",
      role: activeSessionRole || (currentIsDM ? "dm" : "player"),
      lastSeenAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.warn("Could not update active player heartbeat:", error);
  }
}

function startActivePlayerHeartbeat() {
  if (activePlayerHeartbeatTimer) {
    return;
  }

  activePlayerHeartbeatTimer = window.setInterval(
    touchActivePlayerSession,
    ACTIVE_PLAYER_HEARTBEAT_MS
  );
}

function stopActivePlayerHeartbeat() {
  if (!activePlayerHeartbeatTimer) {
    return;
  }

  window.clearInterval(activePlayerHeartbeatTimer);
  activePlayerHeartbeatTimer = null;
}

function cleanupStaleActivePlayerSession(roomCode, sessionId) {
  const cleanCode = normalizeRoomCode(roomCode);

  if (!cleanCode || !sessionId) {
    return;
  }

  const cleanupKey = cleanCode + "/" + sessionId;
  const now = Date.now();
  const lastAttempt = staleActivePlayerCleanupAttempts.get(cleanupKey) || 0;

  if (now - lastAttempt < ACTIVE_PLAYER_CLEANUP_RETRY_MS) {
    return;
  }

  staleActivePlayerCleanupAttempts.set(cleanupKey, now);

  deleteDoc(doc(db, "rooms", cleanCode, "activePlayers", sessionId))
    .then(function () {
      staleActivePlayerCleanupAttempts.delete(cleanupKey);
    })
    .catch(function (error) {
      console.warn("Could not remove stale active player session:", error);
    });
}

async function setActivePlayerSession(roomCode, role) {
  if (!currentUser || !roomCode) return;

  const cleanCode = normalizeRoomCode(roomCode);

  if (activeSessionRoomCode && activeSessionRoomCode !== cleanCode) {
    await removeActivePlayerSession();
  }

  const nextRole = role || "player";
  const sessionRef = doc(db, "rooms", cleanCode, "activePlayers", activeSessionId);

  await runTransaction(db, async function (transaction) {
    const sessionSnap = await transaction.get(sessionRef);
    const sessionData = {
      sessionId: activeSessionId,
      uid: currentUser.uid,
      displayName: currentUser.displayName || "Unnamed",
      role: nextRole,
      lastSeenAt: serverTimestamp()
    };

    if (!sessionSnap.exists()) {
      sessionData.joinedAt = serverTimestamp();
    }

    transaction.set(sessionRef, sessionData, { merge: true });
  });

  activeSessionRoomCode = cleanCode;
  activeSessionRole = nextRole;
  startActivePlayerHeartbeat();
}

async function removeActivePlayerSession() {
  const roomCodeToRemove = activeSessionRoomCode;

  stopActivePlayerHeartbeat();
  activeSessionRoomCode = null;
  activeSessionRole = null;

  if (!roomCodeToRemove) return;

  try {
    await deleteDoc(doc(db, "rooms", roomCodeToRemove, "activePlayers", activeSessionId));
  } catch (error) {
    console.warn("Could not remove active player session:", error);
  }
}

function listenToPlayers(roomCode) {
  stopListeningToPlayers = onSnapshot(
    collection(db, "rooms", roomCode, "activePlayers"),
    function (playersSnap) {
      latestActivePlayersSnapshot = playersSnap;
      renderPlayers(playersSnap);
    },
    function (error) {
      E.playersList.textContent = "Could not load players: " + error.message;
    }
  );
}

function renderPlayers(playersSnap) {
  E.playersList.innerHTML = "";

  if (playersSnap.empty) {
    E.playersList.textContent = "No players in the room right now.";
    return;
  }

  const playersByUid = new Map();

  playersSnap.forEach(function (playerDoc) {
    const player = playerDoc.data();

    if (isActivePlayerStale(player, playerDoc.id)) {
      cleanupStaleActivePlayerSession(currentRoomCode, playerDoc.id);
      return;
    }

    if (!player.uid) return;

    const existingPlayer = playersByUid.get(player.uid);

    if (!existingPlayer || player.role === "dm") {
      playersByUid.set(player.uid, player);
    }
  });

  const players = Array.from(playersByUid.values());

  if (players.length === 0) {
    E.playersList.textContent = "No players in the room right now.";
    return;
  }

  players.sort(function (a, b) {
    if (a.role === "dm" && b.role !== "dm") return -1;
    if (a.role !== "dm" && b.role === "dm") return 1;
    return String(a.displayName || "").localeCompare(String(b.displayName || ""));
  });

  players.forEach(function (player) {
    const div = document.createElement("div");
    div.className = "row";

    const title = document.createElement("div");
    title.className = "row-title";

    let label = (player.displayName || "Unnamed") + " — " + (player.role || "player").toUpperCase();

    if (currentUser && player.uid === currentUser.uid) {
      label += " — YOU";
    }

    title.textContent = label;
    div.appendChild(title);
    E.playersList.appendChild(div);
  });
}


// =====================================================
// APP SECTION 9 — CLOUDINARY UPLOAD
// =====================================================

function getCloudinaryAssetMetadata(cloudinaryResult) {
  const deleteToken = cloudinaryResult.delete_token || null;

  return {
    publicId: cloudinaryResult.public_id || null,
    deleteToken,
    deleteTokenCreatedAtMillis: deleteToken ? Date.now() : null
  };
}

function validateImageUploadFile(file) {
  if (!file) {
    throw new Error("Choose an image file first.");
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    throw new Error("The selected image file is empty or unreadable.");
  }

  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error("Image files must be 10 MB or smaller.");
  }

  const mimeType = String(file.type || "").trim().toLowerCase();
  const fileNameParts = String(file.name || "").toLowerCase().split(".");
  const extension = fileNameParts.length > 1 ? fileNameParts.pop() : "";
  const hasSupportedType = ALLOWED_IMAGE_UPLOAD_TYPES.has(mimeType);
  const hasFallbackExtension =
    !mimeType && ALLOWED_IMAGE_UPLOAD_EXTENSIONS.has(extension);

  if (!hasSupportedType && !hasFallbackExtension) {
    throw new Error("Use a JPEG, PNG, WebP, GIF, or AVIF image.");
  }
}

async function postCloudinaryUpload(file, requestDeleteToken) {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const response = await fetch(
    "https://api.cloudinary.com/v1_1/" + cloudName + "/image/upload",
    {
      method: "POST",
      body: formData
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Cloudinary upload failed: " + errorText);
  }

  return await response.json();
}

async function uploadMapToCloudinary(file) {
  validateImageUploadFile(file);
  return await postCloudinaryUpload(file, false);
}

function getAssetIdentity(asset) {
  if (!asset) {
    return {
      publicId: "",
      url: ""
    };
  }

  return {
    publicId: String(asset.publicId || asset.public_id || "").trim(),
    url: String(asset.url || asset.secure_url || "").trim()
  };
}

function assetsMatch(left, right) {
  const leftIdentity = getAssetIdentity(left);
  const rightIdentity = getAssetIdentity(right);

  if (leftIdentity.publicId && rightIdentity.publicId) {
    return leftIdentity.publicId === rightIdentity.publicId;
  }

  return Boolean(leftIdentity.url && rightIdentity.url && leftIdentity.url === rightIdentity.url);
}

function hasFreshCloudinaryDeleteToken(asset) {
  if (!asset || !asset.deleteToken || !asset.deleteTokenCreatedAtMillis) {
    return false;
  }

  return Date.now() - asset.deleteTokenCreatedAtMillis < CLOUDINARY_DELETE_TOKEN_MAX_AGE_MS;
}

async function isCloudinaryAssetStillReferenced(asset, options = {}) {
  if (!asset || (!asset.publicId && !asset.url)) {
    return false;
  }

  const currentMap = buildMapFromRoomFields(currentRoomData || {});

  if (!options.ignoreCurrentMap && assetsMatch(asset, currentMap)) {
    return true;
  }

  const puzzleTiles = getPuzzleTiles(currentRoomData || {});

  if (
    puzzleTiles.some(function (tile) {
      return tile.key !== options.ignorePuzzleTileKey && assetsMatch(asset, tile);
    })
  ) {
    return true;
  }

  if (latestMapsSnapshot) {
    let isReferenced = false;

    latestMapsSnapshot.forEach(function (mapDoc) {
      if (mapDoc.id === options.ignoreSavedMapId) {
        return;
      }

      if (assetsMatch(asset, mapDoc.data())) {
        isReferenced = true;
      }
    });

    if (isReferenced) {
      return true;
    }
  }

  if (!currentRoomCode) {
    return asset.savedToLibrary === true;
  }

  const mapsRef = collection(db, "rooms", currentRoomCode, "maps");
  const identityFields = [];

  if (asset.publicId) {
    identityFields.push(["publicId", asset.publicId]);
  }

  if (asset.url) {
    identityFields.push(["url", asset.url]);
  }

  for (const identityField of identityFields) {
    const matchingMaps = await getDocs(query(
      mapsRef,
      where(identityField[0], "==", identityField[1]),
      limit(2)
    ));

    const hasMatchingMap = matchingMaps.docs.some(function (mapDoc) {
      return (
        mapDoc.id !== options.ignoreSavedMapId &&
        assetsMatch(asset, mapDoc.data())
      );
    });

    if (hasMatchingMap) {
      return true;
    }
  }

  if (!latestMapsSnapshot && asset.savedToLibrary === true) {
    return true;
  }

  return false;
}

async function deleteCloudinaryAssetWithToken(deleteToken) {
  const formData = new FormData();
  formData.append("token", deleteToken);

  const response = await fetch(
    "https://api.cloudinary.com/v1_1/" + cloudName + "/delete_by_token",
    {
      method: "POST",
      body: formData
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Cloudinary delete failed: " + errorText);
  }

  return await response.json();
}

async function deleteCloudinaryAssetWithEndpoint(asset, reason) {
  if (!cloudinaryDeleteEndpoint) {
    return false;
  }

  const response = await fetch(cloudinaryDeleteEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      cloudName,
      publicId: asset.publicId || null,
      url: asset.url || null,
      roomCode: currentRoomCode || null,
      reason: reason || "delete"
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Cloudinary delete endpoint failed: " + errorText);
  }

  return true;
}

async function deleteCloudinaryAssetIfUnreferenced(asset, options = {}) {
  if (!asset || (!asset.publicId && !asset.url)) {
    return "No Cloudinary asset metadata found.";
  }

  try {
    if (await isCloudinaryAssetStillReferenced(asset, options)) {
      return "Cloudinary image kept because another room reference still uses it.";
    }

    if (await deleteCloudinaryAssetWithEndpoint(asset, options.reason)) {
      return "Cloudinary image deleted.";
    }

    if (hasFreshCloudinaryDeleteToken(asset)) {
      await deleteCloudinaryAssetWithToken(asset.deleteToken);
      return "Cloudinary image deleted.";
    }

    console.warn(
      "Cloudinary image was not deleted. Configure a secure delete endpoint or use a fresh delete token.",
      asset.publicId || asset.url
    );
    return "Cloudinary image was not deleted; no secure delete path was available.";
  } catch (error) {
    console.warn("Could not delete Cloudinary image:", error);
    return "Cloudinary image deletion failed.";
  }
}


// =====================================================
// APP SECTION 10 — SAVED MAP LIBRARY
// =====================================================

function listenToRoomMaps(roomCode) {
  if (stopListeningToMaps) {
    stopListeningToMaps();
  }

  latestMapsSnapshot = [];
  roomMapsLastDoc = null;
  roomMapsHasMore = false;
  roomMapsLoadingMore = false;
  roomMapsPaginationRoomCode = roomCode;

  const mapsQuery = query(
    collection(db, "rooms", roomCode, "maps"),
    orderBy("createdAt", "desc"),
    limit(COLLECTION_PAGE_SIZE)
  );

  stopListeningToMaps = onSnapshot(
    mapsQuery,
    { includeMetadataChanges: true },
    function (mapsSnap) {
      if (
        mapsSnap.metadata.hasPendingWrites ||
        currentRoomCode !== roomCode
      ) {
        return;
      }

      latestMapsSnapshot = mapsSnap.docs;
      roomMapsLastDoc = mapsSnap.docs.length > 0
        ? mapsSnap.docs[mapsSnap.docs.length - 1]
        : null;
      roomMapsHasMore = mapsSnap.docs.length === COLLECTION_PAGE_SIZE;
      renderRoomMaps(latestMapsSnapshot);
    },
    function (error) {
      text(E.roomMapsList, "Could not load saved maps: " + error.message);
    }
  );
}

function renderRoomMaps(mapDocs) {
  if (!E.roomMapsList) {
    return;
  }

  const docs = Array.isArray(mapDocs) ? mapDocs : [];
  E.roomMapsList.innerHTML = "";

  if (docs.length === 0) {
    E.roomMapsList.textContent = "No saved maps in this room yet. Upload a new map as DM.";
    return;
  }

  docs.forEach(function (mapDoc) {
    const map = mapDoc.data();
    const mapId = mapDoc.id;

    const div = document.createElement("div");
    div.className = "row";

    const title = document.createElement("div");
    title.className = "row-title";
    title.textContent = map.name || "Unnamed Map";

    const url = document.createElement("div");
    url.className = "small";
    url.textContent = map.url || "";

    const openImageButton = document.createElement("button");
    openImageButton.textContent = "Open Image";
    openImageButton.addEventListener("click", function () {
      window.open(map.url, "_blank");
    });

    div.appendChild(title);
    div.appendChild(url);
    div.appendChild(openImageButton);

    if (currentIsDM) {
      const useButton = document.createElement("button");
      useButton.textContent = "Use Map";
      useButton.addEventListener("click", function () {
        useSavedMap(mapId);
      });

      const forgetButton = document.createElement("button");
      forgetButton.textContent = "Forget From List";
      forgetButton.addEventListener("click", function () {
        forgetSavedMap(mapId);
      });

      div.appendChild(useButton);
      div.appendChild(forgetButton);
    }

    E.roomMapsList.appendChild(div);
  });

  if (roomMapsHasMore) {
    const loadMoreButton = document.createElement("button");
    loadMoreButton.type = "button";
    loadMoreButton.textContent = roomMapsLoadingMore ? "Loading..." : "Load More Maps";
    loadMoreButton.disabled = roomMapsLoadingMore;
    loadMoreButton.addEventListener("click", loadMoreRoomMaps);
    E.roomMapsList.appendChild(loadMoreButton);
  }
}

async function loadMoreRoomMaps() {
  if (
    !currentRoomCode ||
    !roomMapsLastDoc ||
    !roomMapsHasMore ||
    roomMapsLoadingMore
  ) {
    return;
  }

  const roomCode = currentRoomCode;
  const cursor = roomMapsLastDoc;
  roomMapsLoadingMore = true;
  renderRoomMaps(latestMapsSnapshot || []);

  try {
    const nextPage = await getDocs(query(
      collection(db, "rooms", roomCode, "maps"),
      orderBy("createdAt", "desc"),
      startAfter(cursor),
      limit(COLLECTION_PAGE_SIZE)
    ));

    if (
      currentRoomCode !== roomCode ||
      roomMapsPaginationRoomCode !== roomCode
    ) {
      return;
    }

    const loadedMaps = latestMapsSnapshot || [];
    const knownMapIds = new Set(loadedMaps.map(function (mapDoc) {
      return mapDoc.id;
    }));
    const newMapDocs = nextPage.docs.filter(function (mapDoc) {
      return !knownMapIds.has(mapDoc.id);
    });

    latestMapsSnapshot = loadedMaps.concat(newMapDocs);

    if (nextPage.docs.length > 0) {
      roomMapsLastDoc = nextPage.docs[nextPage.docs.length - 1];
    }

    roomMapsHasMore = nextPage.docs.length === COLLECTION_PAGE_SIZE;
  } catch (error) {
    text(E.mapUploadStatus, "Could not load more saved maps: " + error.message);
  } finally {
    roomMapsLoadingMore = false;

    if (
      currentRoomCode === roomCode &&
      roomMapsPaginationRoomCode === roomCode
    ) {
      renderRoomMaps(latestMapsSnapshot || []);
    }
  }
}

async function saveMapToRoomLibrary(mapData) {
  if (!currentRoomCode || !currentIsDM) {
    alert("Only the DM can save maps.");
    return null;
  }

  const mapDocRef = await addDoc(collection(db, "rooms", currentRoomCode, "maps"), {
    name: mapData.name || "Unnamed Map",
    url: mapData.url,
    publicId: mapData.publicId || null,
    deleteToken: mapData.deleteToken || null,
    deleteTokenCreatedAtMillis: mapData.deleteTokenCreatedAtMillis || null,
    createdAt: serverTimestamp()
  });

  return mapDocRef.id;
}

async function setCurrentRoomMap(mapData) {
  if (!currentRoomCode || !currentIsDM) {
    alert("Only the DM can change maps.");
    return;
  }

  const roomRef = doc(db, "rooms", currentRoomCode);
  const currentMap = normalizeCurrentMapData(mapData);

  await updateDoc(roomRef, {
    currentMap,
    ...legacyCurrentMapFieldDeletions(),
    updatedAt: serverTimestamp()
  });
}

async function useSavedMap(mapId) {
  try {
    if (!currentRoomCode || !currentIsDM) {
      alert("Only the DM can change maps.");
      return;
    }

    const mapSnap = await getDoc(doc(db, "rooms", currentRoomCode, "maps", mapId));

    if (!mapSnap.exists()) {
      alert("Map not found.");
      return;
    }

    const map = mapSnap.data();

    const selectedMap = {
      id: mapId,
      name: map.name || "Unnamed Map",
      url: map.url,
      publicId: map.publicId || null,
      deleteToken: map.deleteToken || null,
      deleteTokenCreatedAtMillis: map.deleteTokenCreatedAtMillis || null,
      savedToLibrary: true
    };

    await setCurrentRoomMap(selectedMap);
    showSharedMap(selectedMap);

    text(E.mapUploadStatus, "Map switched.");
  } catch (error) {
    alert(error.message);
  }
}

async function forgetSavedMap(mapId) {
  try {
    if (!currentRoomCode || !currentIsDM) {
      alert("Only the DM can forget maps.");
      return;
    }

    const mapSnap = await getDoc(doc(db, "rooms", currentRoomCode, "maps", mapId));

    if (!mapSnap.exists()) {
      alert("Map not found.");
      return;
    }

    const mapData = mapSnap.data();
    const mapToForget = {
      id: mapId,
      name: mapData.name || "Unnamed Map",
      url: mapData.url,
      publicId: mapData.publicId || null,
      deleteToken: mapData.deleteToken || null,
      deleteTokenCreatedAtMillis: mapData.deleteTokenCreatedAtMillis || null,
      savedToLibrary: true
    };

    if (!confirm("Forget this map from the room list? The Cloudinary image will be deleted if no other room reference uses it.")) {
      return;
    }

    await deleteDoc(doc(db, "rooms", currentRoomCode, "maps", mapId));

    if (Array.isArray(latestMapsSnapshot)) {
      latestMapsSnapshot = latestMapsSnapshot.filter(function (mapDoc) {
        return mapDoc.id !== mapId;
      });
      renderRoomMaps(latestMapsSnapshot);
    }

    if (currentMapId === mapId) {
      await setCurrentRoomMap(null);

      currentRoomData = withoutLegacyCurrentMapFields(currentRoomData, null);

      showSharedMap(null);
    }

    const cleanupMessage = await deleteCloudinaryAssetIfUnreferenced(mapToForget, {
      ignoreSavedMapId: mapId,
      reason: "forget-saved-map"
    });

    text(E.mapUploadStatus, "Map forgotten. " + cleanupMessage);
  } catch (error) {
    alert(error.message);
  }
}


// =====================================================
// APP SECTION 11 — CURRENT MAP DISPLAY / QUICK UPDATE
// =====================================================

function showSharedMap(currentMap) {
  const map = currentMap && currentMap.url ? currentMap : null;

  if (!map) {
    currentMapId = null;
    displayedSharedMapUrl = null;

    text(E.currentMapNameText, "None");
    text(E.battleMapNameText, "None");

    if (E.roomMapPreviewImage) {
      E.roomMapPreviewImage.onload = null;
      E.roomMapPreviewImage.onerror = null;
      E.roomMapPreviewImage.removeAttribute("src");
      E.roomMapPreviewImage.style.display = "none";
    }

    text(E.noRoomMapPreviewText, "No shared map loaded yet.");

    if (E.noRoomMapPreviewText) {
      E.noRoomMapPreviewText.style.display = "block";
    }

    E.battleMapImage.onload = null;
    E.battleMapImage.onerror = null;
    E.battleMapImage.removeAttribute("src");
    E.battleMapImage.style.display = "none";

    text(E.noBattleMapText, "No battle map loaded yet.");
    E.noBattleMapText.style.display = "block";

    return;
  }

  currentMapId = map.id || null;

  let mapLabel = map.name || "Current Battle Map";

  if (map.savedToLibrary !== true) {
    mapLabel += " (Current Only)";
  }

  text(E.currentMapNameText, mapLabel);
  text(E.battleMapNameText, mapLabel);

  if (
    displayedSharedMapUrl === map.url &&
    (!E.roomMapPreviewImage || E.roomMapPreviewImage.getAttribute("src")) &&
    E.battleMapImage.getAttribute("src")
  ) {
    return;
  }

  displayedSharedMapUrl = map.url;

  const imageUrl = map.url;

  if (E.roomMapPreviewImage) {
    text(E.noRoomMapPreviewText, "Loading map preview...");

    if (E.noRoomMapPreviewText) {
      E.noRoomMapPreviewText.style.display = "block";
    }

    E.roomMapPreviewImage.style.display = "none";

    E.roomMapPreviewImage.onload = function () {
      if (E.noRoomMapPreviewText) {
        E.noRoomMapPreviewText.style.display = "none";
      }

      E.roomMapPreviewImage.style.display = "block";
    };

    E.roomMapPreviewImage.onerror = function () {
      E.roomMapPreviewImage.style.display = "none";
      text(E.noRoomMapPreviewText, "Map preview failed to load.");

      if (E.noRoomMapPreviewText) {
        E.noRoomMapPreviewText.style.display = "block";
      }
    };

    E.roomMapPreviewImage.src = imageUrl;
  }

  text(E.noBattleMapText, "Loading battle map...");
  E.noBattleMapText.style.display = "block";
  E.battleMapImage.style.display = "none";

  E.battleMapImage.onload = function () {
    E.noBattleMapText.style.display = "none";
    E.battleMapImage.style.display = "block";
    applyBattleZoom();
  };

  E.battleMapImage.onerror = function () {
    E.battleMapImage.style.display = "none";
    text(E.noBattleMapText, "Battle map failed to load.");
    E.noBattleMapText.style.display = "block";
  };

  E.battleMapImage.src = imageUrl;
}

addOptionalEventListener(E.uploadRoomMapButton, "click", async function () {
  try {
    if (!currentRoomCode) {
      alert("Create or join a room first.");
      return;
    }

    if (!currentIsDM) {
      alert("Only the DM can upload the room map.");
      return;
    }

    const file = E.roomMapUploadInput.files[0];

    if (!file) {
      alert("Choose a map image first.");
      return;
    }

    text(E.mapUploadStatus, "Uploading map and saving it...");
    E.uploadRoomMapButton.disabled = true;

    const cloudinaryResult = await uploadMapToCloudinary(file);
    const cloudinaryAsset = getCloudinaryAssetMetadata(cloudinaryResult);

    const newMap = {
      name: getSafeMapName(file.name),
      url: cloudinaryResult.secure_url,
      publicId: cloudinaryAsset.publicId,
      deleteToken: cloudinaryAsset.deleteToken,
      deleteTokenCreatedAtMillis: cloudinaryAsset.deleteTokenCreatedAtMillis
    };

    const mapId = await saveMapToRoomLibrary(newMap);

    const savedMap = {
      id: mapId,
      name: newMap.name,
      url: newMap.url,
      publicId: newMap.publicId,
      deleteToken: newMap.deleteToken,
      deleteTokenCreatedAtMillis: newMap.deleteTokenCreatedAtMillis,
      savedToLibrary: true
    };

    await setCurrentRoomMap(savedMap);

    currentRoomData = withoutLegacyCurrentMapFields(currentRoomData, savedMap);

    showSharedMap(savedMap);

    text(E.mapUploadStatus, "Map uploaded, saved to this room, and shared.");
    E.roomMapUploadInput.value = "";
  } catch (error) {
    text(E.mapUploadStatus, "Upload failed.");
    alert(error.message);
  } finally {
    E.uploadRoomMapButton.disabled = false;
  }
});

addOptionalEventListener(E.removeRoomMapButton, "click", async function () {
  try {
    if (!currentRoomCode) return;

    if (!currentIsDM) {
      alert("Only the DM can remove the room map.");
      return;
    }

    const mapToRemove = buildMapFromRoomFields(currentRoomData || {});

    if (!mapToRemove || !mapToRemove.url) {
      alert("There is no current shared map to remove.");
      return;
    }

    if (!confirm("Remove the current shared map? It will stay in Saved Maps if it was saved there.")) {
      return;
    }

    await setCurrentRoomMap(null);

    currentRoomData = withoutLegacyCurrentMapFields(currentRoomData, null);

    showSharedMap(null);

    const cleanupMessage = await deleteCloudinaryAssetIfUnreferenced(mapToRemove, {
      ignoreCurrentMap: true,
      reason: "remove-current-map"
    });

    text(E.mapUploadStatus, "Current map removed. " + cleanupMessage);
  } catch (error) {
    alert(error.message);
  }
});

addOptionalEventListener(E.saveCurrentMapButton, "click", async function () {
  try {
    if (!currentRoomCode || !currentIsDM) {
      alert("Only the DM can save the current map.");
      return;
    }

    const currentMap = buildMapFromRoomFields(currentRoomData || {});

    if (!currentMap || !currentMap.url) {
      alert("There is no current map to save.");
      return;
    }

    if (currentMap.id && currentMap.savedToLibrary === true) {
      alert("This current map is already saved in the room library.");
      return;
    }

    const mapId = await saveMapToRoomLibrary({
      name: currentMap.name || "Recovered Current Map",
      url: currentMap.url,
      publicId: currentMap.publicId || null,
      deleteToken: currentMap.deleteToken || null,
      deleteTokenCreatedAtMillis: currentMap.deleteTokenCreatedAtMillis || null
    });

    const savedMap = {
      id: mapId,
      name: currentMap.name || "Recovered Current Map",
      url: currentMap.url,
      publicId: currentMap.publicId || null,
      deleteToken: currentMap.deleteToken || null,
      deleteTokenCreatedAtMillis: currentMap.deleteTokenCreatedAtMillis || null,
      savedToLibrary: true
    };

    await setCurrentRoomMap(savedMap);

    currentRoomData = withoutLegacyCurrentMapFields(currentRoomData, savedMap);

    showSharedMap(savedMap);
    text(E.mapUploadStatus, "Current map saved to room library.");
  } catch (error) {
    alert(error.message);
  }
});

if (E.updateBattleMapButton) {
  E.updateBattleMapButton.addEventListener("click", async function () {
    let uploadedCurrentOnlyMap = null;

    try {
      if (!currentRoomCode) {
        alert("Create or join a room first.");
        return;
      }

      if (!currentIsDM) {
        alert("Only the DM can update the battle map.");
        return;
      }

      const file = E.battleMapUploadInput.files[0];

      if (!file) {
        alert("Choose the new battle map image first.");
        return;
      }

      text(E.battleMapUpdateStatus, "Uploading current-only battle map...");
      E.updateBattleMapButton.disabled = true;

      const previousMap = buildMapFromRoomFields(currentRoomData || {});

      const cloudinaryResult = await uploadMapToCloudinary(file);
      const cloudinaryAsset = getCloudinaryAssetMetadata(cloudinaryResult);

      const currentOnlyMap = {
        id: null,
        name: getSafeMapName(file.name),
        url: cloudinaryResult.secure_url,
        publicId: cloudinaryAsset.publicId,
        deleteToken: cloudinaryAsset.deleteToken,
        deleteTokenCreatedAtMillis: cloudinaryAsset.deleteTokenCreatedAtMillis,
        savedToLibrary: false
      };

      uploadedCurrentOnlyMap = currentOnlyMap;

      await setCurrentRoomMap(currentOnlyMap);

      currentRoomData = withoutLegacyCurrentMapFields(
        currentRoomData,
        currentOnlyMap
      );

      showSharedMap(currentOnlyMap);
      uploadedCurrentOnlyMap = null;

      let cleanupMessage = "";

      if (previousMap && !assetsMatch(previousMap, currentOnlyMap)) {
        cleanupMessage = await deleteCloudinaryAssetIfUnreferenced(previousMap, {
          reason: "replace-current-only-map"
        });
      }

      text(
        E.battleMapUpdateStatus,
        "Battle map updated for everyone. Not saved to Saved Maps." +
          (cleanupMessage ? " Previous image: " + cleanupMessage : "")
      );
      E.battleMapUploadInput.value = "";
    } catch (error) {
      if (uploadedCurrentOnlyMap) {
        await deleteCloudinaryAssetIfUnreferenced(uploadedCurrentOnlyMap, {
          reason: "failed-current-only-map-update"
        });
      }

      text(E.battleMapUpdateStatus, "Battle map update failed.");
      alert(error.message);
    } finally {
      E.updateBattleMapButton.disabled = false;
    }
  });
}

// =====================================================
// APP SECTION 12 — PUZZLE MAP / BATTLE MANAGER SYSTEM
// Split into 12A–12J for easier future edits
// =====================================================


// =====================================================
// APP SECTION 12A — BATTLE MANAGER DOM / SETUP
// =====================================================

E.battleManagerBar = $("battleManagerBar");
E.battleManagerInner = $("battleManagerInner");

E.puzzleMapControls = $("puzzleMapControls");
E.puzzleTileUploadInput = $("puzzleTileUploadInput");
E.addTileNorthButton = $("addTileNorthButton");
E.addTileSouthButton = $("addTileSouthButton");
E.addTileEastButton = $("addTileEastButton");
E.addTileWestButton = $("addTileWestButton");
E.centerPuzzleBoardButton = $("centerPuzzleBoardButton");
E.puzzleMapStatus = $("puzzleMapStatus");

E.tokenBuilderControls = $("tokenBuilderControls");
E.tokenLayer = $("tokenLayer");

E.battleMapSurface = $("battleMapSurface");
E.puzzleMapBoard = $("puzzleMapBoard");
E.puzzleMapEmptyText = $("puzzleMapEmptyText");

let activePuzzleDrag = null;

ensureBattleManagerPolishStyles();
syncBattleManagerVisibility();
ensurePuzzleDragListeners();


// =====================================================
// APP SECTION 12B — BATTLE MANAGER POLISH STYLES
// Keeps Battle Manager UI above map tokens
// =====================================================

function ensureBattleManagerPolishStyles() {
  if (document.getElementById("battleManagerPolishStyles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "battleManagerPolishStyles";

  style.textContent = `
    #battleTopBar {
      position: relative;
      z-index: 2000;
    }

    #battleManagerBar {
      position: relative;
      z-index: 2100;
      max-width: none !important;
    }

    #battleManagerInner {
      position: relative;
      z-index: 2110;
      display: grid;
      gap: 10px;
    }

    #puzzleMapControls,
    #tokenBuilderControls,
    #creatorLauncherControls {
      position: relative;
      z-index: 2120;
      max-width: none !important;
    }

    #battleMapSurface {
      position: relative;
      z-index: 1;
      isolation: isolate;
    }

    #battleMapViewer,
    #puzzleMapBoard {
      position: relative;
      z-index: 2;
      isolation: isolate;
    }

    #puzzleMapBoard {
      --puzzle-tile-size: 320px;
    }

    #puzzleMapControls .battleEditorInner,
    #tokenBuilderControls .battleEditorInner,
    #creatorLauncherControls .battleEditorInner {
      padding: 10px 12px 12px 12px !important;
    }

    #puzzleMapControls input[type="file"] {
      width: 260px !important;
      max-width: 100% !important;
      margin-right: 8px !important;
    }

    #puzzleMapControls button {
      width: auto !important;
      margin: 4px 4px 4px 0 !important;
      padding: 8px 11px !important;
      font-size: 14px !important;
    }

    #puzzleMapStatus {
      display: inline-block !important;
      margin: 6px 0 0 4px !important;
      vertical-align: middle !important;
    }

    #puzzleMapBoard.hidden {
      display: none !important;
    }

    #tokenLayer {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 10;
    }

    .map-tile {
      width: 320px;
      height: 320px;
      position: relative;
      overflow: hidden;
      background: #03040a;
      border: 1px solid rgba(120, 145, 255, 0.18);
      user-select: none;
      touch-action: none;
    }

    .map-tile img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
      pointer-events: none;
      user-select: none;
    }

    .map-tile.is-active {
      outline: 3px solid rgba(88, 166, 255, 0.95);
      outline-offset: -3px;
      z-index: 3;
      box-shadow:
        inset 0 0 0 2px rgba(255, 255, 255, 0.22),
        0 0 24px rgba(88, 166, 255, 0.42);
    }

    .map-tile.puzzle-dragging {
      opacity: 0.72;
      z-index: 20;
      box-shadow:
        0 0 0 3px rgba(255, 255, 255, 0.20),
        0 0 30px rgba(157, 107, 255, 0.48);
    }

    .puzzle-tile-actions {
      position: absolute;
      left: 8px;
      right: 8px;
      top: 8px;
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      opacity: 0;
      transition: opacity 0.16s ease;
      pointer-events: none;
      z-index: 6;
    }

    .map-tile:hover .puzzle-tile-actions,
    .map-tile.is-active .puzzle-tile-actions {
      opacity: 1;
      pointer-events: auto;
    }

    .puzzle-tile-actions button {
      width: auto !important;
      padding: 5px 8px !important;
      font-size: 12px !important;
      border-radius: 10px !important;
      margin: 0 !important;
      background: rgba(6, 9, 18, 0.88) !important;
      border-color: rgba(130, 160, 255, 0.38) !important;
    }

    .puzzle-tile-label {
      position: absolute;
      left: 8px;
      bottom: 8px;
      max-width: calc(100% - 16px);
      padding: 4px 8px;
      border-radius: 999px;
      color: white;
      background: rgba(0, 0, 0, 0.72);
      border: 1px solid rgba(255, 255, 255, 0.18);
      font-size: 12px;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      pointer-events: none;
      z-index: 5;
    }

    .puzzle-grid-empty-cell {
      width: 320px;
      height: 320px;
      border: 1px dashed rgba(120, 145, 255, 0.10);
      background:
        linear-gradient(135deg, rgba(90, 120, 255, 0.035), rgba(157, 107, 255, 0.025));
    }

    @media (max-width: 900px) {
      #puzzleMapBoard {
        --puzzle-tile-size: 240px;
      }

      .map-tile,
      .puzzle-grid-empty-cell {
        width: 240px;
        height: 240px;
      }

      #puzzleMapControls input[type="file"],
      #puzzleMapControls button,
      #puzzleMapStatus {
        display: block !important;
        width: 100% !important;
        margin: 6px 0 !important;
      }
    }
  `;

  document.head.appendChild(style);
}

function syncBattleManagerVisibility() {
  const showDmTools = !!currentIsDM;
  const showCharacterCreatorLauncher = !!currentUser && !!currentRoomCode;
  const showBattleManager = showDmTools || showCharacterCreatorLauncher;

  if (E.battleManagerBar) {
    E.battleManagerBar.classList.toggle("hidden", !showBattleManager);
  }

  if (E.puzzleMapControls) {
    E.puzzleMapControls.classList.toggle("hidden", !showDmTools);
  }

  if (E.tokenBuilderControls) {
    E.tokenBuilderControls.classList.toggle("hidden", !showDmTools);
  }

  if (E.creatorLauncherControls) {
    E.creatorLauncherControls.classList.toggle(
      "hidden",
      !showCharacterCreatorLauncher
    );
  }

  if (E.openCharacterCreatorButton) {
    E.openCharacterCreatorButton.classList.toggle(
      "hidden",
      !showCharacterCreatorLauncher
    );
  }

  if (E.openMonsterCreatorButton) {
    E.openMonsterCreatorButton.classList.toggle("hidden", !showDmTools);
  }
}

function disablePuzzleButtons(disabled) {
  [
    E.addTileNorthButton,
    E.addTileSouthButton,
    E.addTileEastButton,
    E.addTileWestButton,
    E.centerPuzzleBoardButton
  ].forEach(function (button) {
    if (button) {
      button.disabled = !!disabled;
    }
  });
}


// =====================================================
// APP SECTION 12C — PUZZLE MAP DATA HELPERS
// =====================================================

function makeTileKey(x, y) {
  return String(x) + "," + String(y);
}

function parseTileKey(key) {
  const parts = String(key || "0,0").split(",");

  return {
    x: Number(parts[0]) || 0,
    y: Number(parts[1]) || 0
  };
}

function getPuzzleTiles(room) {
  if (!room || !Array.isArray(room.puzzleTiles)) {
    return [];
  }

  return room.puzzleTiles
    .filter(function (tile) {
      return tile && tile.url && tile.key;
    })
    .map(function (tile) {
      const parsed = parseTileKey(tile.key);

      const x = Number.isFinite(Number(tile.x)) ? Number(tile.x) : parsed.x;
      const y = Number.isFinite(Number(tile.y)) ? Number(tile.y) : parsed.y;

      return {
        ...tile,
        x,
        y,
        key: makeTileKey(x, y),
        name: tile.name || "Puzzle Tile",
        locked: tile.locked !== false
      };
    });
}

function mergeRoomWithPuzzleTileDocs(room) {
  const safeRoom = room || {};
  const legacyTiles = getPuzzleTiles(safeRoom);
  const shouldUseTileDocs =
    Array.isArray(latestPuzzleTiles) &&
    (latestPuzzleTiles.length > 0 ||
      legacyTiles.length === 0 ||
      hasMigratedLegacyPuzzleTiles);

  return {
    ...safeRoom,
    puzzleTiles: shouldUseTileDocs ? latestPuzzleTiles : legacyTiles
  };
}

function getPuzzleTileCollection(roomCode) {
  return collection(db, "rooms", roomCode, "puzzleTiles");
}

function getPuzzleTileDocument(roomCode, tileKey) {
  return doc(db, "rooms", roomCode, "puzzleTiles", tileKey);
}

function listenToPuzzleTiles(roomCode) {
  if (stopListeningToPuzzleTiles) {
    stopListeningToPuzzleTiles();
  }

  stopListeningToPuzzleTiles = onSnapshot(
    getPuzzleTileCollection(roomCode),
    { includeMetadataChanges: true },
    function (tilesSnap) {
      if (tilesSnap.metadata.hasPendingWrites) {
        return;
      }

      const tiles = [];

      tilesSnap.forEach(function (tileDoc) {
        tiles.push({
          ...tileDoc.data(),
          key: tileDoc.data().key || tileDoc.id
        });
      });

      latestPuzzleTiles = getPuzzleTiles({ puzzleTiles: tiles });

      if (currentRoomData) {
        currentRoomData = mergeRoomWithPuzzleTileDocs(currentRoomData);
        renderPuzzleBoard(currentRoomData);
      }

      maybeMigrateLegacyPuzzleTilesToSubcollection();
    },
    function (error) {
      text(E.puzzleMapStatus, "Could not load puzzle tiles: " + error.message);
    }
  );
}

async function maybeMigrateLegacyPuzzleTilesToSubcollection(throwOnFailure = false) {
  if (isMigratingLegacyPuzzleTiles) {
    if (throwOnFailure && legacyPuzzleTileMigrationPromise) {
      await legacyPuzzleTileMigrationPromise;
    }

    return;
  }

  if (
    !currentRoomCode ||
    !currentIsDM ||
    !currentRoomData
  ) {
    return;
  }

  const legacyTiles = getPuzzleTiles(currentRoomData);

  if (
    legacyTiles.length === 0 ||
    (Array.isArray(latestPuzzleTiles) && latestPuzzleTiles.length > 0)
  ) {
    return;
  }

  const migrationRoomCode = currentRoomCode;

  isMigratingLegacyPuzzleTiles = true;
  legacyPuzzleTileMigrationPromise = (async function () {
    for (const tile of legacyTiles) {
      await setDoc(
        getPuzzleTileDocument(migrationRoomCode, tile.key),
        tile,
        { merge: true }
      );
    }

    await updateDoc(doc(db, "rooms", migrationRoomCode), {
      puzzleTiles: [],
      updatedAt: serverTimestamp()
    });

    latestPuzzleTiles = legacyTiles;
    hasMigratedLegacyPuzzleTiles = true;

    if (currentRoomCode === migrationRoomCode && currentRoomData) {
      currentRoomData = {
        ...currentRoomData,
        puzzleTiles: legacyTiles
      };
    }
  })();

  try {
    await legacyPuzzleTileMigrationPromise;
  } catch (error) {
    console.warn("Could not migrate puzzle tiles to subcollection:", error);

    if (throwOnFailure) {
      throw error;
    }
  } finally {
    isMigratingLegacyPuzzleTiles = false;
    legacyPuzzleTileMigrationPromise = null;
  }
}

async function ensurePuzzleTilesStoredInSubcollection() {
  await maybeMigrateLegacyPuzzleTilesToSubcollection(true);
}

function getPuzzleViewMode(room) {
  if (!room || room.puzzleViewMode !== "focus") {
    return "board";
  }

  return "focus";
}

function getActivePuzzleTile(room) {
  const tiles = getPuzzleTiles(room || {});

  if (tiles.length === 0) {
    return null;
  }

  const activeKey = room && room.activePuzzleTileKey;

  const activeTile = tiles.find(function (tile) {
    return tile.key === activeKey;
  });

  return activeTile || tiles[0];
}

function puzzleTileToCurrentMap(tile) {
  if (!tile) {
    return null;
  }

  return {
    id: tile.key,
    name: tile.name || "Puzzle Tile",
    url: tile.url,
    publicId: tile.publicId || null,
    deleteToken: tile.deleteToken || null,
    deleteTokenCreatedAtMillis: tile.deleteTokenCreatedAtMillis || null,
    savedToLibrary: false,
    puzzleTileKey: tile.key
  };
}

function getPuzzleBounds(tiles) {
  if (!tiles.length) {
    return {
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0
    };
  }

  let minX = tiles[0].x;
  let maxX = tiles[0].x;
  let minY = tiles[0].y;
  let maxY = tiles[0].y;

  tiles.forEach(function (tile) {
    minX = Math.min(minX, tile.x);
    maxX = Math.max(maxX, tile.x);
    minY = Math.min(minY, tile.y);
    maxY = Math.max(maxY, tile.y);
  });

  return {
    minX,
    maxX,
    minY,
    maxY
  };
}

function assertPuzzlePositionAllowed(tiles, tileKey, x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    throw new Error("Puzzle tile coordinates must be whole numbers.");
  }

  if (
    Math.abs(x) > PUZZLE_COORDINATE_LIMIT ||
    Math.abs(y) > PUZZLE_COORDINATE_LIMIT
  ) {
    throw new Error(
      "Puzzle tile coordinates must stay between -" +
      PUZZLE_COORDINATE_LIMIT +
      " and " +
      PUZZLE_COORDINATE_LIMIT +
      "."
    );
  }

  const nextTilePositions = tiles
    .filter(function (tile) {
      return tile.key !== tileKey;
    })
    .map(function (tile) {
      return { x: tile.x, y: tile.y };
    });

  nextTilePositions.push({ x, y });

  const bounds = getPuzzleBounds(nextTilePositions);
  const columnCount = bounds.maxX - bounds.minX + 1;
  const rowCount = bounds.maxY - bounds.minY + 1;

  if (
    columnCount > PUZZLE_MAX_GRID_SPAN ||
    rowCount > PUZZLE_MAX_GRID_SPAN
  ) {
    throw new Error(
      "Puzzle tiles must stay within a " +
      PUZZLE_MAX_GRID_SPAN +
      " by " +
      PUZZLE_MAX_GRID_SPAN +
      " board area."
    );
  }
}

function tileExistsAtPosition(tiles, x, y, exceptKey) {
  const key = makeTileKey(x, y);

  return tiles.some(function (tile) {
    return tile.key === key && tile.key !== exceptKey;
  });
}

function getPuzzleTileByKey(tiles, tileKey) {
  return tiles.find(function (tile) {
    return tile.key === tileKey;
  }) || null;
}

function getTargetPositionForNewTileFromTiles(tiles, direction, baseTile) {
  if (tiles.length === 0) {
    return {
      x: 0,
      y: 0
    };
  }

  const activeTile = baseTile || tiles[0];

  let x = activeTile.x;
  let y = activeTile.y;

  if (direction === "north") y -= 1;
  if (direction === "south") y += 1;
  if (direction === "east") x += 1;
  if (direction === "west") x -= 1;

  return {
    x,
    y
  };
}

function buildPuzzleRoomStateFields(tiles, activeTile, viewMode, includeUpdatedAt) {
  const safeActiveTile = activeTile || null;
  const safeViewMode = viewMode === "focus" ? "focus" : "board";
  const activeMap = safeActiveTile ? puzzleTileToCurrentMap(safeActiveTile) : null;

  const fields = {
    activePuzzleTileKey: safeActiveTile ? safeActiveTile.key : null,
    puzzleViewMode: safeViewMode,
    currentMap: normalizeCurrentMapData(activeMap)
  };

  if (includeUpdatedAt) {
    Object.assign(fields, legacyCurrentMapFieldDeletions());
    fields.updatedAt = serverTimestamp();
  }

  return fields;
}

async function updateRoomWithPuzzleTiles(mutatePuzzleState) {
  if (!currentRoomCode) {
    return null;
  }

  const roomRef = doc(db, "rooms", currentRoomCode);
  let finalResult = null;

  await runTransaction(db, async function (transaction) {
    const roomSnap = await transaction.get(roomRef);

    if (!roomSnap.exists()) {
      throw new Error("Room not found.");
    }

    const latestRoom = roomSnap.data() || {};
    const mergedRoom = mergeRoomWithPuzzleTileDocs(latestRoom);
    const latestTiles = getPuzzleTiles(mergedRoom);
    const mutation = await mutatePuzzleState({
      room: mergedRoom,
      tiles: latestTiles,
      transaction,
      roomRef
    }) || {};

    const nextTiles = getPuzzleTiles({
      puzzleTiles: mutation.tiles || latestTiles
    });

    const requestedActiveKey = mutation.activeTile ? mutation.activeTile.key : null;
    const nextActiveTile =
      requestedActiveKey
        ? getPuzzleTileByKey(nextTiles, requestedActiveKey)
        : null;

    const nextViewMode = mutation.viewMode === "focus" ? "focus" : "board";
    const updateFields = buildPuzzleRoomStateFields(
      nextTiles,
      nextActiveTile,
      nextViewMode,
      true
    );

    transaction.update(roomRef, updateFields);

    const localFields = buildPuzzleRoomStateFields(
      nextTiles,
      nextActiveTile,
      nextViewMode,
      false
    );

    finalResult = {
      ...mutation,
      tiles: nextTiles,
      activeTile: nextActiveTile,
      viewMode: nextViewMode,
      room: {
        ...withoutLegacyCurrentMapFields(mergedRoom, nextActiveTile ? puzzleTileToCurrentMap(nextActiveTile) : null),
        puzzleTiles: nextTiles,
        ...localFields
      }
    };
  });

  if (finalResult && finalResult.room) {
    latestPuzzleTiles = finalResult.tiles;
    hasMigratedLegacyPuzzleTiles = true;
    currentRoomData = finalResult.room;
  }

  return finalResult;
}


// =====================================================
// APP SECTION 12D — PUZZLE MAP VIEW MODE / TOKEN NOTIFY
// No show()/hide() helpers used here.
// Uses classList directly because app.js only has showScreen().
// =====================================================

function showPuzzleBoardView() {
  if (E.puzzleMapBoard) {
    E.puzzleMapBoard.classList.remove("hidden");
  }

  if (E.battleMapViewer) {
    E.battleMapViewer.classList.add("hidden");
  }
}

function showSingleBattleMapView() {
  if (E.puzzleMapBoard) {
    E.puzzleMapBoard.classList.add("hidden");
  }

  if (E.battleMapViewer) {
    E.battleMapViewer.classList.remove("hidden");
  }
}

function keepTokenLayerReadyForExternalFile() {
  if (!E.tokenLayer) {
    return;
  }

  const targetContainer =
    E.puzzleMapBoard && !E.puzzleMapBoard.classList.contains("hidden")
      ? E.puzzleMapBoard
      : E.battleMapViewer || E.battleMapSurface;

  if (!targetContainer) {
    return;
  }

  const computedPosition = window.getComputedStyle(targetContainer).position;

  if (computedPosition === "static") {
    targetContainer.style.position = "relative";
  }

  if (E.tokenLayer.parentNode !== targetContainer) {
    targetContainer.appendChild(E.tokenLayer);
  }
}

function notifyExternalTokenSystem(room) {
  keepTokenLayerReadyForExternalFile();

  if (
    window.HomebrewGodTokens &&
    typeof window.HomebrewGodTokens.render === "function"
  ) {
    window.HomebrewGodTokens.render(room || currentRoomData || {}, {
      roomCode: currentRoomCode,
      roomData: currentRoomData,
      isDM: currentIsDM
    });
  }
}


// =====================================================
// APP SECTION 12E — PUZZLE BOARD RENDERING
// =====================================================

function renderPuzzleBoard(room) {
  const safeRoom = room || {};
  const tiles = getPuzzleTiles(safeRoom);
  const viewMode = getPuzzleViewMode(safeRoom);
  const activeTile = getActivePuzzleTile(safeRoom);

  syncBattleManagerVisibility();

  if (!E.puzzleMapBoard) {
    notifyExternalTokenSystem(safeRoom);
    return;
  }

  if (tiles.length === 0) {
    E.puzzleMapBoard.innerHTML = "";

    if (E.puzzleMapEmptyText) {
      E.puzzleMapBoard.appendChild(E.puzzleMapEmptyText);
      text(E.puzzleMapEmptyText, "No puzzle tiles yet. Open Puzzle Map Builder to add tiles.");
    }

    showSingleBattleMapView();
    notifyExternalTokenSystem(safeRoom);
    return;
  }

  if (viewMode === "focus" && activeTile) {
    showSingleBattleMapView();
    showSharedMap(puzzleTileToCurrentMap(activeTile));
    notifyExternalTokenSystem(safeRoom);
    return;
  }

  showPuzzleBoardView();

  E.puzzleMapBoard.innerHTML = "";

  const bounds = getPuzzleBounds(tiles);
  E.puzzleMapBoard.style.gridTemplateColumns =
    "repeat(" +
    (bounds.maxX - bounds.minX + 1) +
    ", var(--puzzle-tile-size))";

  E.puzzleMapBoard.style.gridTemplateRows =
    "repeat(" +
    (bounds.maxY - bounds.minY + 1) +
    ", var(--puzzle-tile-size))";

  tiles.forEach(function (tile) {
    const tileElement = createPuzzleTileElement(tile, activeTile);
    tileElement.style.gridColumn = String(tile.x - bounds.minX + 1);
    tileElement.style.gridRow = String(tile.y - bounds.minY + 1);
    E.puzzleMapBoard.appendChild(tileElement);
  });

  keepTokenLayerReadyForExternalFile();
  notifyExternalTokenSystem(safeRoom);
}

function createPuzzleTileElement(tile, activeTile) {
  const tileDiv = document.createElement("div");
  tileDiv.className = "map-tile";

  if (activeTile && activeTile.key === tile.key) {
    tileDiv.classList.add("is-active");
  }

  tileDiv.dataset.tileKey = tile.key;
  tileDiv.dataset.tileX = String(tile.x);
  tileDiv.dataset.tileY = String(tile.y);
  tileDiv.title = tile.name + " — " + tile.key;

  const img = document.createElement("img");
  img.src = tile.url;
  img.alt = tile.name || "Puzzle tile";
  tileDiv.appendChild(img);

  const actions = document.createElement("div");
  actions.className = "puzzle-tile-actions";

  const focusButton = document.createElement("button");
  focusButton.type = "button";
  focusButton.textContent = "Focus";
  focusButton.addEventListener("click", function (event) {
    event.stopPropagation();
    focusPuzzleTile(tile.key);
  });
  actions.appendChild(focusButton);

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", function (event) {
    event.stopPropagation();
    deletePuzzleTile(tile.key);
  });
  actions.appendChild(deleteButton);

  tileDiv.appendChild(actions);

  const label = document.createElement("div");
  label.className = "puzzle-tile-label";
  label.textContent = tile.name + " / " + tile.key;
  tileDiv.appendChild(label);

  tileDiv.addEventListener("pointerdown", function (event) {
    startPuzzleTileDrag(event, tile, tileDiv);
  });

  return tileDiv;
}

function centerPuzzleBoardNow() {
  if (!E.puzzleMapBoard) {
    return;
  }

  E.puzzleMapBoard.scrollLeft =
    Math.max(0, (E.puzzleMapBoard.scrollWidth - E.puzzleMapBoard.clientWidth) / 2);

  E.puzzleMapBoard.scrollTop =
    Math.max(0, (E.puzzleMapBoard.scrollHeight - E.puzzleMapBoard.clientHeight) / 2);
}


// =====================================================
// APP SECTION 12F — PUZZLE TILE ADDING / UPLOAD
// =====================================================

function getTargetPositionForNewTile(direction) {
  const tiles = getPuzzleTiles(currentRoomData || {});
  const activeTile = getActivePuzzleTile(currentRoomData || {}) || tiles[0];
  return getTargetPositionForNewTileFromTiles(tiles, direction, activeTile);
}

async function addPuzzleTile(direction) {
  let uploadedPuzzleTile = null;
  let puzzleFailureStage = "DM preflight check";
  let attemptedPuzzleTilePath = currentRoomCode
    ? "rooms/" + currentRoomCode + "/puzzleTiles/{tileKey}"
    : null;
  let attemptedRoomPath = currentRoomCode
    ? "rooms/" + currentRoomCode
    : null;

  try {
    const isConfirmedRoomDM = !!(
      currentUser &&
      currentRoomCode &&
      currentRoomData &&
      currentRoomData.dmUid === currentUser.uid
    );

    if (!isConfirmedRoomDM) {
      alert("Only the room DM can add puzzle tiles. Reopen the room or create a new room as this account.");
      return;
    }

    if (!E.puzzleTileUploadInput || !E.puzzleTileUploadInput.files[0]) {
      alert("Choose a puzzle tile image first.");
      return;
    }

    puzzleFailureStage = "legacy puzzle tile migration";
    await ensurePuzzleTilesStoredInSubcollection();

    const file = E.puzzleTileUploadInput.files[0];
    const roomWithTiles = mergeRoomWithPuzzleTileDocs(currentRoomData || {});
    const oldTiles = getPuzzleTiles(roomWithTiles);
    const baseTile = getActivePuzzleTile(roomWithTiles) || oldTiles[0] || null;
    const baseTileKey = baseTile ? baseTile.key : null;
    const target = getTargetPositionForNewTile(direction);
    attemptedPuzzleTilePath =
      "rooms/" +
      currentRoomCode +
      "/puzzleTiles/" +
      makeTileKey(target.x, target.y);
    attemptedRoomPath = "rooms/" + currentRoomCode;

    assertPuzzlePositionAllowed(oldTiles, null, target.x, target.y);

    if (tileExistsAtPosition(oldTiles, target.x, target.y, null)) {
      alert("That puzzle grid spot is already taken. Focus another tile or move one first.");
      return;
    }

    text(
      E.puzzleMapStatus,
      oldTiles.length === 0
        ? "Uploading first puzzle tile."
        : "Uploading puzzle tile " + direction + "."
    );

    disablePuzzleButtons(true);

    puzzleFailureStage = "Cloudinary upload";
    const cloudinaryResult = await uploadMapToCloudinary(file);
    const cloudinaryAsset = getCloudinaryAssetMetadata(cloudinaryResult);

    uploadedPuzzleTile = {
      name: getSafeMapName(file.name),
      url: cloudinaryResult.secure_url,
      publicId: cloudinaryAsset.publicId,
      deleteToken: cloudinaryAsset.deleteToken,
      deleteTokenCreatedAtMillis: cloudinaryAsset.deleteTokenCreatedAtMillis,
      savedToLibrary: false
    };

    puzzleFailureStage = "Firestore puzzle tile transaction";
    const transactionResult = await updateRoomWithPuzzleTiles(async function (state) {
      const latestTiles = state.tiles;
      const latestBaseTile =
        baseTileKey
          ? getPuzzleTileByKey(latestTiles, baseTileKey)
          : null;
      const transactionTarget = getTargetPositionForNewTileFromTiles(
        latestTiles,
        direction,
        latestBaseTile || getActivePuzzleTile(state.room) || latestTiles[0] || null
      );

      assertPuzzlePositionAllowed(
        latestTiles,
        null,
        transactionTarget.x,
        transactionTarget.y
      );

      if (
        tileExistsAtPosition(
          latestTiles,
          transactionTarget.x,
          transactionTarget.y,
          null
        )
      ) {
        throw new Error("That puzzle grid spot is already taken. Try again from the updated board.");
      }

      const key = makeTileKey(transactionTarget.x, transactionTarget.y);
      attemptedPuzzleTilePath =
        "rooms/" + currentRoomCode + "/puzzleTiles/" + key;
      const targetTileRef = getPuzzleTileDocument(currentRoomCode, key);
      const targetTileSnap = await state.transaction.get(targetTileRef);

      if (targetTileSnap.exists()) {
        throw new Error("That puzzle grid spot is already taken. Try again from the updated board.");
      }

      const newTile = {
        ...uploadedPuzzleTile,
        key,
        x: transactionTarget.x,
        y: transactionTarget.y,
        locked: true,
        createdAtMillis: Date.now()
      };

      state.transaction.set(targetTileRef, newTile);

      return {
        tiles: latestTiles.concat(newTile),
        activeTile: newTile,
        viewMode: "board",
        addedTile: newTile,
        previousTileCount: latestTiles.length
      };
    });

    uploadedPuzzleTile = null;

    renderPuzzleBoard(transactionResult.room);

    if (E.puzzleTileUploadInput) {
      E.puzzleTileUploadInput.value = "";
    }

    setTimeout(function () {
      centerPuzzleBoardNow();
    }, 80);

    text(
      E.puzzleMapStatus,
      transactionResult.previousTileCount === 0
        ? "First puzzle tile placed at center 0,0."
        : "Puzzle tile added " + direction + " at " + transactionResult.addedTile.key + "."
    );
  } catch (error) {
    const currentUserUid = currentUser ? currentUser.uid : null;
    const roomDmUid = currentRoomData ? currentRoomData.dmUid : null;
    const isCurrentUserRoomDM = !!(
      currentUserUid &&
      roomDmUid &&
      roomDmUid === currentUserUid
    );
    const errorMessage = String(
      error && error.message ? error.message : error || "Unknown error"
    );

    console.error("Puzzle tile operation failed.", {
      stage: puzzleFailureStage,
      currentRoomCode,
      "currentUser.uid": currentUserUid,
      currentIsDM,
      "currentRoomData.dmUid": roomDmUid,
      "currentRoomData.dmUid === currentUser.uid": isCurrentUserRoomDM,
      permissionChecks: {
        hasCurrentUser: !!currentUser,
        hasCurrentRoomCode: !!currentRoomCode,
        hasCurrentRoomData: !!currentRoomData,
        currentIsDM,
        roomDmUidMatchesCurrentUser: isCurrentUserRoomDM
      },
      attemptedPuzzleTilePath,
      attemptedRoomPath,
      firestoreWritesAttempted: [
        attemptedPuzzleTilePath,
        attemptedRoomPath
      ],
      firebaseErrorCode: error && error.code ? error.code : null,
      firebaseError: error
    });
    console.error("Full puzzle tile Firebase error:", error);

    if (uploadedPuzzleTile) {
      try {
        const cleanupMessage = await deleteCloudinaryAssetIfUnreferenced(
          uploadedPuzzleTile,
          { reason: "failed-puzzle-tile-add" }
        );
        console.warn("Puzzle tile upload cleanup result:", cleanupMessage);
      } catch (cleanupError) {
        console.warn(
          "Could not clean up the uploaded puzzle tile image:",
          cleanupError
        );
      }
    }

    const isPermissionError =
      (error && error.code === "permission-denied") ||
      errorMessage
        .toLowerCase()
        .includes("insufficient permissions");
    const userMessage = isPermissionError
      ? "Puzzle tile could not be saved. You may not be the room DM, or Firestore rules may not be published."
      : "Puzzle tile could not be saved: " + errorMessage;

    text(E.puzzleMapStatus, userMessage);
    alert(userMessage);
  } finally {
    disablePuzzleButtons(false);
  }
}


// =====================================================
// APP SECTION 12G — PUZZLE TILE FOCUS / DELETE
// =====================================================

async function focusPuzzleTile(tileKey) {
  try {
    if (!currentRoomCode || !currentIsDM) {
      return;
    }

    await ensurePuzzleTilesStoredInSubcollection();

    const transactionResult = await updateRoomWithPuzzleTiles(async function (state) {
      const tileRef = getPuzzleTileDocument(currentRoomCode, tileKey);
      const tileSnap = await state.transaction.get(tileRef);

      if (!tileSnap.exists()) {
        throw new Error("Puzzle tile not found.");
      }

      const tile = getPuzzleTiles({
        puzzleTiles: [{ ...tileSnap.data(), key: tileSnap.data().key || tileKey }]
      })[0];

      return {
        tiles: state.tiles,
        activeTile: tile,
        viewMode: "focus",
        focusedTile: tile
      };
    });

    const tile = transactionResult.focusedTile;
    showSingleBattleMapView();
    showSharedMap(puzzleTileToCurrentMap(tile));
    renderPuzzleBoard(transactionResult.room);

    text(E.puzzleMapStatus, "Focused on tile " + tile.key + ". Press Center Board to return.");
  } catch (error) {
    alert(error.message);
  }
}

async function showFullPuzzleBoard() {
  try {
    if (!currentRoomCode || !currentIsDM) {
      return;
    }

    const roomRef = doc(db, "rooms", currentRoomCode);
    let transactionRoomData = null;

    await runTransaction(db, async function (transaction) {
      const roomSnap = await transaction.get(roomRef);

      if (!roomSnap.exists()) {
        throw new Error("Room not found.");
      }

      const latestRoom = mergeRoomWithPuzzleTileDocs(roomSnap.data() || {});
      const activeTile = getActivePuzzleTile(latestRoom);
      const activeTileKey = activeTile ? activeTile.key : null;

      transaction.update(roomRef, {
        puzzleViewMode: "board",
        activePuzzleTileKey: activeTileKey,
        updatedAt: serverTimestamp()
      });

      transactionRoomData = {
        ...latestRoom,
        activePuzzleTileKey: activeTileKey,
        puzzleViewMode: "board"
      };
    });

    currentRoomData = transactionRoomData;
    renderPuzzleBoard(currentRoomData);

    setTimeout(function () {
      centerPuzzleBoardNow();
    }, 80);

    text(E.puzzleMapStatus, "Showing full puzzle board.");
  } catch (error) {
    alert(error.message);
  }
}

async function deletePuzzleTile(tileKey) {
  try {
    if (!currentRoomCode || !currentIsDM) {
      alert("Only the DM can delete puzzle tiles.");
      return;
    }

    if (!confirm("Delete this puzzle tile from the board? The Cloudinary image will be deleted if no other room reference uses it.")) {
      return;
    }

    await ensurePuzzleTilesStoredInSubcollection();

    const transactionResult = await updateRoomWithPuzzleTiles(async function (state) {
      const tileRef = getPuzzleTileDocument(currentRoomCode, tileKey);
      const tileSnap = await state.transaction.get(tileRef);

      if (!tileSnap.exists()) {
        throw new Error("Puzzle tile not found.");
      }

      const tileToDelete = getPuzzleTiles({
        puzzleTiles: [{ ...tileSnap.data(), key: tileSnap.data().key || tileKey }]
      })[0];

      state.transaction.delete(tileRef);

      const newTiles = state.tiles.filter(function (tile) {
        return tile.key !== tileKey;
      });

      const previousActiveTile = getPuzzleTileByKey(
        newTiles,
        state.room.activePuzzleTileKey
      );
      const newActiveTile = previousActiveTile || (newTiles.length > 0 ? newTiles[0] : null);

      return {
        tiles: newTiles,
        activeTile: newActiveTile,
        viewMode: "board",
        deletedTile: tileToDelete
      };
    });

    if (transactionResult.activeTile) {
      showSharedMap(puzzleTileToCurrentMap(transactionResult.activeTile));
    } else {
      showSharedMap(null);
    }

    renderPuzzleBoard(transactionResult.room);

    const cleanupMessage = await deleteCloudinaryAssetIfUnreferenced(transactionResult.deletedTile, {
      ignorePuzzleTileKey: tileKey,
      reason: "delete-puzzle-tile"
    });

    text(E.puzzleMapStatus, "Puzzle tile deleted. " + cleanupMessage);
  } catch (error) {
    alert(error.message);
  }
}


// =====================================================
// APP SECTION 12H — PUZZLE TILE DRAGGING / GRID LOCK
// =====================================================

async function movePuzzleTileTo(tileKey, newX, newY) {
  try {
    if (!currentRoomCode || !currentIsDM) {
      return;
    }

    await ensurePuzzleTilesStoredInSubcollection();

    const transactionResult = await updateRoomWithPuzzleTiles(async function (state) {
      const oldTileRef = getPuzzleTileDocument(currentRoomCode, tileKey);
      const oldTileSnap = await state.transaction.get(oldTileRef);

      if (!oldTileSnap.exists()) {
        throw new Error("Tile not found.");
      }

      const oldTile = getPuzzleTiles({
        puzzleTiles: [{ ...oldTileSnap.data(), key: oldTileSnap.data().key || tileKey }]
      })[0];

      if (oldTile.x === newX && oldTile.y === newY) {
        return {
          tiles: state.tiles,
          activeTile: oldTile,
          viewMode: "board",
          movedTile: oldTile,
          didMove: false
        };
      }

      assertPuzzlePositionAllowed(state.tiles, tileKey, newX, newY);

      if (tileExistsAtPosition(state.tiles, newX, newY, tileKey)) {
        throw new Error("That grid spot is already taken. Tile snapped back.");
      }

      const newKey = makeTileKey(newX, newY);
      const newTileRef = getPuzzleTileDocument(currentRoomCode, newKey);
      const newTileSnap = await state.transaction.get(newTileRef);

      if (newTileSnap.exists()) {
        throw new Error("That grid spot is already taken. Tile snapped back.");
      }

      const movedTile = {
        ...oldTile,
        key: newKey,
        x: newX,
        y: newY,
        movedAtMillis: Date.now()
      };

      const newTiles = state.tiles.map(function (tile) {
        return tile.key === tileKey ? movedTile : tile;
      });

      state.transaction.delete(oldTileRef);
      state.transaction.set(newTileRef, movedTile);

      return {
        tiles: newTiles,
        activeTile: movedTile,
        viewMode: "board",
        movedTile,
        didMove: true
      };
    });

    renderPuzzleBoard(transactionResult.room);

    text(
      E.puzzleMapStatus,
      transactionResult.didMove
        ? "Tile moved and locked at " + transactionResult.movedTile.key + "."
        : "Tile stayed locked in place."
    );
  } catch (error) {
    text(E.puzzleMapStatus, error.message);
    renderPuzzleBoard(currentRoomData || {});
  }
}

function startPuzzleTileDrag(event, tile, tileDiv) {
  if (!currentIsDM) {
    return;
  }

  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }

  if (event.target.closest("button")) {
    return;
  }

  event.preventDefault();

  try {
    tileDiv.setPointerCapture(event.pointerId);
  } catch (error) {
    // Safe to ignore.
  }

  activePuzzleDrag = {
    tileKey: tile.key,
    originalX: tile.x,
    originalY: tile.y,
    startClientX: event.clientX,
    startClientY: event.clientY,
    lastClientX: event.clientX,
    lastClientY: event.clientY,
    tileWidth: Math.max(1, tileDiv.offsetWidth),
    tileHeight: Math.max(1, tileDiv.offsetHeight),
    pointerId: event.pointerId,
    tileDiv,
    moved: false
  };

  tileDiv.classList.add("puzzle-dragging");
  text(E.puzzleMapStatus, "Dragging tile. Release to lock it to the grid.");
}

function handlePuzzlePointerMove(event) {
  if (!activePuzzleDrag) {
    return;
  }

  event.preventDefault();

  const drag = activePuzzleDrag;
  drag.lastClientX = event.clientX;
  drag.lastClientY = event.clientY;
  drag.moved = true;

  const dx = event.clientX - drag.startClientX;
  const dy = event.clientY - drag.startClientY;

  drag.tileDiv.style.transform = "translate(" + dx + "px, " + dy + "px)";
}

async function handlePuzzlePointerUp(event) {
  if (!activePuzzleDrag) {
    return;
  }

  const drag = activePuzzleDrag;
  activePuzzleDrag = null;

  drag.tileDiv.classList.remove("puzzle-dragging");
  drag.tileDiv.style.transform = "";

  try {
    if (drag.pointerId !== undefined && drag.pointerId !== null) {
      try {
        drag.tileDiv.releasePointerCapture(drag.pointerId);
      } catch (error) {
        // Safe to ignore.
      }
    }

    const dx = drag.lastClientX - drag.startClientX;
    const dy = drag.lastClientY - drag.startClientY;

    const gridDx = Math.round(dx / drag.tileWidth);
    const gridDy = Math.round(dy / drag.tileHeight);

    const newX = drag.originalX + gridDx;
    const newY = drag.originalY + gridDy;

    await movePuzzleTileTo(drag.tileKey, newX, newY);
  } catch (error) {
    alert(error.message);
    renderPuzzleBoard(currentRoomData || {});
  }
}

function cancelPuzzleDrag() {
  if (!activePuzzleDrag) {
    return;
  }

  activePuzzleDrag.tileDiv.classList.remove("puzzle-dragging");
  activePuzzleDrag.tileDiv.style.transform = "";
  activePuzzleDrag = null;

  renderPuzzleBoard(currentRoomData || {});
}

function ensurePuzzleDragListeners() {
  if (window.homebrewGodPuzzleDragListenersReady) {
    return;
  }

  window.homebrewGodPuzzleDragListenersReady = true;

  document.addEventListener("pointermove", handlePuzzlePointerMove);
  document.addEventListener("pointerup", handlePuzzlePointerUp);
  document.addEventListener("pointercancel", cancelPuzzleDrag);
}


// =====================================================
// APP SECTION 12I — PUZZLE BUTTON LISTENERS
// =====================================================

if (E.addTileNorthButton) {
  E.addTileNorthButton.addEventListener("click", function () {
    addPuzzleTile("north");
  });
}

if (E.addTileSouthButton) {
  E.addTileSouthButton.addEventListener("click", function () {
    addPuzzleTile("south");
  });
}

if (E.addTileEastButton) {
  E.addTileEastButton.addEventListener("click", function () {
    addPuzzleTile("east");
  });
}

if (E.addTileWestButton) {
  E.addTileWestButton.addEventListener("click", function () {
    addPuzzleTile("west");
  });
}

if (E.centerPuzzleBoardButton) {
  E.centerPuzzleBoardButton.addEventListener("click", function () {
    showFullPuzzleBoard();
  });
}


// =====================================================
// APP SECTION 12J — TOKEN SYSTEM CONNECTION
// =====================================================

if (!tokenSystem) {
  tokenSystem = createTokenSystem({
    db,
    doc,
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    serverTimestamp,

    uploadImage: uploadMapToCloudinary,

    getCurrentRoomCode: function () {
      return currentRoomCode;
    },

    getCurrentRoomData: function () {
      return currentRoomData;
    },

    setCurrentRoomData: function (newRoomData) {
      currentRoomData = newRoomData;
    },

    getCurrentIsDM: function () {
      return currentIsDM;
    },

    getPuzzleTiles,
    getActivePuzzleTile,
    getPuzzleViewMode,
    buildMapFromRoomFields
  });
}


// =====================================================
// APP SECTION 13 — BATTLE MAP / CREATOR TAB NAVIGATION
// =====================================================

function showAnyMainScreen(screenName) {
  const screens = [
    E.authScreen,
    E.lobbyScreen,
    E.roomDashboardScreen,
    E.battleMapScreen,
    E.monsterCreatorScreen,
    E.characterCreatorScreen
  ];

  screens.forEach(function (screen) {
    if (screen) {
      screen.classList.add("hidden");
    }
  });

  const screenMap = {
    auth: E.authScreen,
    lobby: E.lobbyScreen,
    room: E.roomDashboardScreen,
    battle: E.battleMapScreen,
    monsterCreator: E.monsterCreatorScreen,
    characterCreator: E.characterCreatorScreen
  };

  if (screenMap[screenName]) {
    screenMap[screenName].classList.remove("hidden");
  }
}

function applyBattleZoom() {
  const scale = "scale(" + battleZoom + ")";

  if (E.battleMapImage) {
    E.battleMapImage.style.transform = scale;
  }

  if (E.puzzleMapBoard) {
    E.puzzleMapBoard.style.transform = scale;
    E.puzzleMapBoard.style.transformOrigin = "top left";
  }

  text(E.battleZoomText, Math.round(battleZoom * 100) + "%");
}

function openToolTab(viewName) {
  if (!currentRoomCode) {
    alert("Open a room first.");
    return;
  }

  const toolUrl = new URL(window.location.href);

  toolUrl.searchParams.set("room", currentRoomCode);
  toolUrl.searchParams.set("view", viewName);

  window.open(toolUrl.toString(), "_blank");
}

function initCharacterCreatorSystem() {
  if (characterCreatorSystem) {
    return;
  }

  characterCreatorSystem = createCharacterCreator({
    db,
    doc,
    collection,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    serverTimestamp,

    getCurrentRoomCode: function () {
      return currentRoomCode;
    },

    getCurrentRoomData: function () {
      return currentRoomData;
    },

    getCurrentIsDM: function () {
      return currentIsDM;
    }
  });
}


// =====================================================
// APP SECTION 13A — BATTLE MAP BUTTONS
// =====================================================

if (E.openBattleMapButton) {
  E.openBattleMapButton.addEventListener("click", function () {
    openToolTab("battle");
  });
}

if (E.backToRoomButton) {
  E.backToRoomButton.addEventListener("click", function () {
    showAnyMainScreen("room");
  });
}

if (E.zoomOutButton) {
  E.zoomOutButton.addEventListener("click", function () {
    battleZoom -= 0.25;

    if (battleZoom < 0.25) {
      battleZoom = 0.25;
    }

    applyBattleZoom();
  });
}

if (E.zoomResetButton) {
  E.zoomResetButton.addEventListener("click", function () {
    battleZoom = 1;
    applyBattleZoom();
  });
}

if (E.zoomInButton) {
  E.zoomInButton.addEventListener("click", function () {
    battleZoom += 0.25;

    if (battleZoom > 4) {
      battleZoom = 4;
    }

    applyBattleZoom();
  });
}


// =====================================================
// APP SECTION 13B — CREATOR TOOL LAUNCHERS
// Character opens in its own browser tab.
// Monster button is a placeholder until monsterCreator.js exists.
// =====================================================

if (E.openCharacterCreatorButton) {
  E.openCharacterCreatorButton.addEventListener("click", function () {
    openToolTab("characterCreator");
  });
}

if (E.openMonsterCreatorButton) {
  E.openMonsterCreatorButton.addEventListener("click", function () {
    alert("Monster Creator file comes next.");
  });
}


// =====================================================
// APP SECTION 13C — CREATOR BACK BUTTONS
// In tool tabs, this returns to the battle view in the same tab.
// =====================================================

if (E.backFromCharacterCreatorButton) {
  E.backFromCharacterCreatorButton.addEventListener("click", function () {
    showAnyMainScreen("battle");
    applyBattleZoom();

    if (
      window.HomebrewGodTokens &&
      typeof window.HomebrewGodTokens.render === "function"
    ) {
      window.HomebrewGodTokens.render(currentRoomData || {});
    }
  });
}


// =====================================================
// APP SECTION 13D — STARTUP VIEW ROUTING HELPERS
// Section 14 will call this after the room loads.
// =====================================================

function openStartupViewIfNeeded() {
  if (alreadyUsedStartupLink) {
    return;
  }

  if (!startupRoomCode || !startupView) {
    return;
  }

  if (!currentRoomCode || currentRoomCode !== startupRoomCode) {
    return;
  }

  if (!currentRoomData) {
    return;
  }

  alreadyUsedStartupLink = true;

  if (startupView === "battle") {
    showAnyMainScreen("battle");
    applyBattleZoom();
    return;
  }

  if (startupView === "characterCreator") {
    showAnyMainScreen("characterCreator");
    initCharacterCreatorSystem();
    return;
  }

  if (startupView === "monsterCreator") {
    alert("Monster Creator file comes next.");
    showAnyMainScreen("battle");
  }
}


// =====================================================
// APP SECTION 13E — PAGE LEAVE CLEANUP
// =====================================================

document.addEventListener("visibilitychange", function () {
  if (!document.hidden) {
    touchActivePlayerSession();
  }
});

window.addEventListener("focus", function () {
  touchActivePlayerSession();
});

window.addEventListener("pageshow", function () {
  touchActivePlayerSession();
});

window.addEventListener("pagehide", function () {
  removeActivePlayerSession();
});

// =====================================================
// APP SECTION 14 — STARTUP / AUTH WATCHER
// Supports startup tabs:
// ?room=ROOMCODE&view=battle
// ?room=ROOMCODE&view=characterCreator
// =====================================================

onAuthStateChanged(auth, async function (user) {
  currentUser = user;

  if (!user) {
    await showLoggedOut();
    return;
  }

  await saveUserDoc(user);
  showLoggedIn(user);
  listenToMyRooms();

  if (!alreadyUsedStartupLink && startupRoomCode) {
    const startupScreen =
      startupView === "battle"
        ? "battle"
        : "room";

    await joinRoom(
      startupRoomCode,
      "player",
      startupScreen
    );
  }
});
