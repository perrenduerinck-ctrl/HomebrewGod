// =====================================================
// APP SECTION 1 â€” FIREBASE IMPORTS
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
import { createMonsterCreator } from "./monsterCreator.js";

console.log("Homebrew God app.js loaded");

// =====================================================
// APP SECTION 2 â€” FIREBASE / CLOUDINARY CONFIG
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

console.log("Firebase initialized");

if (window.__HOMEBREW_GOD_SMOKE__) {
  window.__HOMEBREW_GOD_SMOKE__.moduleLoaded = true;
  window.__HOMEBREW_GOD_SMOKE__.render();
}

// =====================================================
// APP SECTION 3 â€” PAGE ELEMENTS / STATE
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
let monsterCreatorSystem = null;

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
// APP SECTION 4 â€” HELPERS
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
// APP SECTION 5 â€” AUTH
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
    const password = E.signupPaÛÏ9ŞÚ$z{-®éÜj×öÆEF–ÆU6ææFF‚’Â¶W“¢öÆEF–ÆU6ææFF‚’æ¶W’ÇÂF–ÆT¶W’ÕĞĞ¢Ò•³Ó°Ğ Ğ¢–b†öÆEF–ÆRç‚ÓÓÒæWu‚bböÆEF–ÆRç’ÓÓÒæWu’’°Ğ¢&WGW&â°Ğ¢F–ÆW3¢7FFRçF–ÆW2ÀĞ¢7F—fUF–ÆS¢öÆEF–ÆRÀĞ¢f–WtÖöFS¢&&ö&B"ÀĞ¢Ö÷fVEF–ÆS¢öÆEF–ÆRÀĞ¢F–DÖ÷fS¢fÇ6PĞ¢Ó°Ğ¢ĞĞ Ğ¢76W'EW§¦ÆU÷6—F–öäÆÆ÷vVB‡7FFRçF–ÆW2ÂF–ÆT¶W’ÂæWu‚ÂæWu’“°Ğ Ğ¢–b‡F–ÆTW†—7G4E÷6—F–öâ‡7FFRçF–ÆW2ÂæWu‚ÂæWu’ÂF–ÆT¶W’’’°Ğ¢F‡&÷ræWrW'&÷"‚%F†Bw&–B7÷B—2Ç&VG’F¶VââF–ÆR6æVB&6²â"“°Ğ¢ĞĞ Ğ¢6öç7BæWt¶W’ÒÖ¶UF–ÆT¶W’†æWu‚ÂæWu’“°Ğ¢6öç7BæWuF–ÆU&VbÒvWEW§¦ÆUF–ÆTFö7VÖVçB†7W'&VçE&ööÔ6öFRÂæWt¶W’“°Ğ¢6öç7BæWuF–ÆU6æÒv—B7FFRçG&ç67F–öâævWB†æWuF–ÆU&Vb“°Ğ Ğ¢–b†æWuF–ÆU6ææW†—7G2‚’’°Ğ¢F‡&÷ræWrW'&÷"‚%F†Bw&–B7÷B—2Ç&VG’F¶VââF–ÆR6æVB&6²â"“°Ğ¢ĞĞ Ğ¢6öç7BÖ÷fVEF–ÆRÒ°Ğ¢ââæöÆEF–ÆRÀĞ¢¶W“¢æWt¶W’ÀĞ¢ƒ¢æWu‚ÀĞ¢“¢æWu’ÀĞ¢Ö÷fVDDÖ–ÆÆ—3¢FFRææ÷r‚Ğ¢Ó°Ğ Ğ¢6öç7BæWuF–ÆW2Ò7FFRçF–ÆW2æÖ†gVæ7F–öâ‡F–ÆR’°Ğ¢&WGW&âF–ÆRæ¶W’ÓÓÒF–ÆT¶W’òÖ÷fVEF–ÆR¢F–ÆS°Ğ¢Ò“°Ğ Ğ¢7FFRçG&ç67F–öâæFVÆWFR†öÆEF–ÆU&Vb“°Ğ¢7FFRçG&ç67F–öâç6WB†æWuF–ÆU&VbÂÖ÷fVEF–ÆR“°Ğ Ğ¢&WGW&â°Ğ¢F–ÆW3¢æWuF–ÆW2ÀĞ¢7F—fUF–ÆS¢Ö÷fVEF–ÆRÀĞ¢f–WtÖöFS¢&&ö&B"ÀĞ¢Ö÷fVEF–ÆRÀĞ¢F–DÖ÷fS¢G'VPĞ¢Ó°Ğ¢Ò“°Ğ Ğ¢&VæFW%W§¦ÆT&ö&B‡G&ç67F–öå&W7VÇBç&ööÒ“°Ğ Ğ¢FW‡B€Ğ¢RçW§¦ÆTÖ7FGW2ÀĞ¢G&ç67F–öå&W7VÇBæF–DÖ÷fPĞ¢ò%F–ÆRÖ÷fVBæBÆö6¶VBB"²G&ç67F–öå&W7VÇBæÖ÷fVEF–ÆRæ¶W’²"â Ğ¢¢%F–ÆR7F–VBÆö6¶VB–âÆ6Râ Ğ¢“°Ğ¢Ò6F6‚†W'&÷"’°Ğ¢FW‡B„RçW§¦ÆTÖ7FGW2ÂW'&÷"æÖW76vR“°Ğ¢&VæFW%W§¦ÆT&ö&B†7W'&VçE&ööÔFFÇÂ·Ò“°Ğ¢ĞĞ§ĞĞ Ğ¦gVæ7F–öâ7F'EW§¦ÆUF–ÆTG&r†WfVçBÂF–ÆRÂF–ÆTF—b’°Ğ¢–b‚7W'&VçD—4DÒ’°Ğ¢&WGW&ã°Ğ¢ĞĞ Ğ¢–b†WfVçBçö–çFW%G—RÓÓÒ&Ö÷W6R"bbWfVçBæ'WGFöâÓÒ’°Ğ¢&WGW&ã°Ğ¢ĞĞ Ğ¢–b†WfVçBçF&vWBæ6Æ÷6W7B‚&'WGFöâ"’’°Ğ¢&WGW&ã°Ğ¢ĞĞ Ğ¢WfVçBç&WfVçDFVfVÇB‚“°Ğ Ğ¢G'’°Ğ¢F–ÆTF—bç6WEö–çFW$6GW&R†WfVçBçö–çFW$–B“°Ğ¢Ò6F6‚†W'&÷"’°Ğ¢òò6fRFò–væ÷&RàĞ¢ĞĞ Ğ¢7F—fUW§¦ÆTG&rÒ°Ğ¢F–ÆT¶W“¢F–ÆRæ¶W’ÀĞ¢÷&–v–æÅƒ¢F–ÆRç‚ÀĞ¢÷&–v–æÅ“¢F–ÆRç’ÀĞ¢7F'D6Æ–VçEƒ¢WfVçBæ6Æ–VçE‚ÀĞ¢7F'D6Æ–VçE“¢WfVçBæ6Æ–VçE’ÀĞ¢Æ7D6Æ–VçEƒ¢WfVçBæ6Æ–VçE‚ÀĞ¢Æ7D6Æ–VçE“¢WfVçBæ6Æ–VçE’ÀĞ¢F–ÆUv–GFƒ¢ÖF‚æÖ‚ƒÂF–ÆTF—bæöfg6WEv–GF‚’ÀĞ¢F–ÆT†V–v‡C¢ÖF‚æÖ‚ƒÂF–ÆTF—bæöfg6WD†V–v‡B’ÀĞ¢ö–çFW$–C¢WfVçBçö–çFW$–BÀĞ¢F–ÆTF—bÀĞ¢Ö÷fVC¢fÇ6PĞ¢Ó°Ğ Ğ¢F–ÆTF—bæ6Æ74Æ—7BæFB‚'W§¦ÆRÖG&vv–ær"“°Ğ¢FW‡B„RçW§¦ÆTÖ7FGW2Â$G&vv–ærF–ÆRâ&VÆV6RFòÆö6²—BFòF†Rw&–Bâ"“°Ğ§ĞĞ Ğ¦gVæ7F–öâ†æFÆUW§¦ÆUö–çFW$Ö÷fR†WfVçB’°Ğ¢–b‚7F—fUW§¦ÆTG&r’°Ğ¢&WGW&ã°Ğ¢ĞĞ Ğ¢WfVçBç&WfVçDFVfVÇB‚“°Ğ Ğ¢6öç7BG&rÒ7F—fUW§¦ÆTG&s°Ğ¢G&ræÆ7D6Æ–VçE‚ÒWfVçBæ6Æ–VçEƒ°Ğ¢G&ræÆ7D6Æ–VçE’ÒWfVçBæ6Æ–VçE“°Ğ¢G&ræÖ÷fVBÒG'VS°Ğ Ğ¢6öç7BG‚ÒWfVçBæ6Æ–VçE‚ÒG&rç7F'D6Æ–VçEƒ°Ğ¢6öç7BG’ÒWfVçBæ6Æ–VçE’ÒG&rç7F'D6Æ–VçE“°Ğ Ğ¢G&rçF–ÆTF—bç7G–ÆRçG&ç6f÷&ÒÒ'G&ç6ÆFR‚"²G‚²'‚Â"²G’²'‚’#°Ğ§ĞĞ Ğ¦7–æ2gVæ7F–öâ†æFÆUW§¦ÆUö–çFW%W†WfVçB’°Ğ¢–b‚7F—fUW§¦ÆTG&r’°Ğ¢&WGW&ã°Ğ¢ĞĞ Ğ¢6öç7BG&rÒ7F—fUW§¦ÆTG&s°Ğ¢7F—fUW§¦ÆTG&rÒçVÆÃ°Ğ Ğ¢G&rçF–ÆTF—bæ6Æ74Æ—7Bç&VÖ÷fR‚'W§¦ÆRÖG&vv–ær"“°Ğ¢G&rçF–ÆTF—bç7G–ÆRçG&ç6f÷&ÒÒ"#°Ğ Ğ¢G'’°Ğ¢–b†G&rçö–çFW$–BÓÒVæFVf–æVBbbG&rçö–çFW$–BÓÒçVÆÂ’°Ğ¢G'’°Ğ¢G&rçF–ÆTF—bç&VÆV6Uö–çFW$6GW&R†G&rçö–çFW$–B“°Ğ¢Ò6F6‚†W'&÷"’°Ğ¢òò6fRFò–væ÷&RàĞ¢ĞĞ¢ĞĞ Ğ¢6öç7BG‚ÒG&ræÆ7D6Æ–VçE‚ÒG&rç7F'D6Æ–VçEƒ°Ğ¢6öç7BG’ÒG&ræÆ7D6Æ–VçE’ÒG&rç7F'D6Æ–VçE“°Ğ Ğ¢6öç7Bw&–DG‚ÒÖF‚ç&÷VæB†G‚òG&rçF–ÆUv–GF‚“°Ğ¢6öç7Bw&–DG’ÒÖF‚ç&÷VæB†G’òG&rçF–ÆT†V–v‡B“°Ğ Ğ¢6öç7BæWu‚ÒG&ræ÷&–v–æÅ‚²w&–DGƒ°Ğ¢6öç7BæWu’ÒG&ræ÷&–v–æÅ’²w&–DG“°Ğ Ğ¢v—BÖ÷fUW§¦ÆUF–ÆUFò†G&rçF–ÆT¶W’ÂæWu‚ÂæWu’“°Ğ¢Ò6F6‚†W'&÷"’°Ğ¢ÆW'B†W'&÷"æÖW76vR“°Ğ¢&VæFW%W§¦ÆT&ö&B†7W'&VçE&ööÔFFÇÂ·Ò“°Ğ¢ĞĞ§ĞĞ Ğ¦gVæ7F–öâ6æ6VÅW§¦ÆTG&r‚’°Ğ¢–b‚7F—fUW§¦ÆTG&r’°Ğ¢&WGW&ã°Ğ¢ĞĞ Ğ¢7F—fUW§¦ÆTG&rçF–ÆTF—bæ6Æ74Æ—7Bç&VÖ÷fR‚'W§¦ÆRÖG&vv–ær"“°Ğ¢7F—fUW§¦ÆTG&rçF–ÆTF—bç7G–ÆRçG&ç6f÷&ÒÒ"#°Ğ¢7F—fUW§¦ÆTG&rÒçVÆÃ°Ğ Ğ¢&VæFW%W§¦ÆT&ö&B†7W'&VçE&ööÔFFÇÂ·Ò“°Ğ§ĞĞ Ğ¦gVæ7F–öâVç7W&UW§¦ÆTG&tÆ—7FVæW'2‚’°Ğ¢–b‡v–æF÷ræ†öÖV'&WtvöEW§¦ÆTG&tÆ—7FVæW'5&VG’’°Ğ¢&WGW&ã°Ğ¢ĞĞ Ğ¢v–æF÷ræ†öÖV'&WtvöEW§¦ÆTG&tÆ—7FVæW'5&VG’ÒG'VS°Ğ Ğ¢Fö7VÖVçBæFDWfVçDÆ—7FVæW"‚'ö–çFW&Ö÷fR"Â†æFÆUW§¦ÆUö–çFW$Ö÷fR“°Ğ¢Fö7VÖVçBæFDWfVçDÆ—7FVæW"‚'ö–çFW'W"Â†æFÆUW§¦ÆUö–çFW%W“°Ğ¢Fö7VÖVçBæFDWfVçDÆ—7FVæW"‚'ö–çFW&6æ6VÂ"Â6æ6VÅW§¦ÆTG&r“°Ğ§ĞĞ Ğ Ğ¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞĞ¢òò4T5D”ôâ$’(	BU¥¤ÄR%UEDôâÄ•5DTäU%0Ğ¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞĞ Ğ¦–b„RæFEF–ÆTæ÷'F„'WGFöâ’°Ğ¢RæFEF–ÆTæ÷'F„'WGFöâæFDWfVçDÆ—7FVæW"‚&6Æ–6²"ÂgVæ7F–öâ‚’°Ğ¢FEW§¦ÆUF–ÆR‚&æ÷'F‚"“°Ğ¢Ò“°Ğ§ĞĞ Ğ¦–b„RæFEF–ÆU6÷WF„'WGFöâ’°Ğ¢RæFEF–ÆU6÷WF„'WGFöâæFDWfVçDÆ—7FVæW"‚&6Æ–6²"ÂgVæ7F–öâ‚’°Ğ¢FEW§¦ÆUF–ÆR‚'6÷WF‚"“°Ğ¢Ò“°Ğ§ĞĞ Ğ¦–b„RæFEF–ÆTV7D'WGFöâ’°Ğ¢RæFEF–ÆTV7D'WGFöâæFDWfVçDÆ—7FVæW"‚&6Æ–6²"ÂgVæ7F–öâ‚’°Ğ¢FEW§¦ÆUF–ÆR‚&V7B"“°Ğ¢Ò“°Ğ§ĞĞ Ğ¦–b„RæFEF–ÆUvW7D'WGFöâ’°Ğ¢RæFEF–ÆUvW7D'WGFöâæFDWfVçDÆ—7FVæW"‚&6Æ–6²"ÂgVæ7F–öâ‚’°Ğ¢FEW§¦ÆUF–ÆR‚'vW7B"“°Ğ¢Ò“°Ğ§ĞĞ Ğ¦–b„Ræ6VçFW%W§¦ÆT&ö&D'WGFöâ’°Ğ¢Ræ6VçFW%W§¦ÆT&ö&D'WGFöâæFDWfVçDÆ—7FVæW"‚&6Æ–6²"ÂgVæ7F–öâ‚’°Ğ¢6†÷tgVÆÅW§¦ÆT&ö&B‚“°Ğ¢Ò“°Ğ§ĞĞ Ğ Ğ¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞĞ¢òò4T5D”ôâ$¢(	BDô´Tâ5•5DTÒ4ôääT5D”ôàĞ¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞĞ Ğ¦–b‚Fö¶Vå7—7FVÒ’°Ğ¢Fö¶Vå7—7FVÒÒ7&VFUFö¶Vå7—7FVÒ‡°Ğ¢F"ÀĞ¢Fö2ÀĞ¢6öÆÆV7F–öâÀĞ¢FDFö2ÀĞ¢WFFTFö2ÀĞ¢FVÆWFTFö2ÀĞ¢vWDFö72ÀĞ¢VW'’ÀĞ¢v†W&RÀĞ¢öå6æ6†÷BÀĞ¢6W'fW%F–ÖW7F×ÀĞ Ğ¢WÆöD–ÖvS¢WÆöDÖFô6Æ÷VF–æ'’ÀĞ Ğ¢vWD7W'&VçE&ööÔ6öFS¢gVæ7F–öâ‚’°Ğ¢&WGW&â7W'&VçE&ööÔ6öFS°Ğ¢ÒÀĞ Ğ¢vWD7W'&VçE&ööÔFF¢gVæ7F–öâ‚’°Ğ¢&WGW&â7W'&VçE&ööÔFF°Ğ¢ÒÀĞ Ğ¢6WD7W'&VçE&ööÔFF¢gVæ7F–öâ†æWu&ööÔFF’°Ğ¢7W'&VçE&ööÔFFÒæWu&ööÔFF°Ğ¢ÒÀĞ Ğ¢vWD7W'&VçD—4DÓ¢gVæ7F–öâ‚’°Ğ¢&WGW&â7W'&VçD—4DÓ°Ğ¢ÒÀĞ Ğ¢vWEW§¦ÆUF–ÆW2ÀĞ¢vWD7F—fUW§¦ÆUF–ÆRÀĞ¢vWEW§¦ÆUf–WtÖöFRÀĞ¢'V–ÆDÖg&öÕ&ööÔf–VÆG0Ğ¢Ò“°Ğ§ĞĞ Ğ Ğ¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞĞ¢òò4T5D”ôâ2(	B$EDÄRÔò5$TDõ"D"äd”tD”ôàĞ¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞĞ Ğ¦gVæ7F–öâ6†÷tç”Ö–å67&VVâ‡67&VVäæÖR’°Ğ¢6öç7B67&VVç2Ò°Ğ¢RæWF…67&VVâÀĞ¢RæÆö&'•67&VVâÀĞ¢Rç&ööÔF6†&ö&E67&VVâÀĞ¢Ræ&GFÆTÖ67&VVâÀĞ¢RæÖöç7FW$7&VF÷%67&VVâÀĞ¢Ræ6†&7FW$7&VF÷%67&VVàĞ¢Ó°Ğ Ğ¢67&VVç2æf÷$V6‚†gVæ7F–öâ‡67&VVâ’°Ğ¢–b‡67&VVâ’°Ğ¢67&VVâæ6Æ74Æ—7BæFB‚&†–FFVâ"“°Ğ¢ĞĞ¢Ò“°Ğ Ğ¢6öç7B67&VVäÖÒ°Ğ¢WFƒ¢RæWF…67&VVâÀĞ¢Æö&'“¢RæÆö&'•67&VVâÀĞ¢&ööÓ¢Rç&ööÔF6†&ö&E67&VVâÀĞ¢&GFÆS¢Ræ&GFÆTÖ67&VVâÀĞ¢Ööç7FW$7&VF÷#¢RæÖöç7FW$7&VF÷%67&VVâÀĞ¢6†&7FW$7&VF÷#¢Ræ6†&7FW$7&VF÷%67&VVàĞ¢Ó°Ğ Ğ¢–b‡67&VVäÖ·67&VVäæÖUÒ’°Ğ¢67&VVäÖ·67&VVäæÖUÒæ6Æ74Æ—7Bç&VÖ÷fR‚&†–FFVâ"“°Ğ¢ĞĞ§ĞĞ Ğ¦gVæ7F–öâÇ”&GFÆU¦ööÒ‚’°Ğ¢6öç7B66ÆRÒ'66ÆR‚"²&GFÆU¦ööÒ²"’#°Ğ Ğ¢–b„Ræ&GFÆTÖ–ÖvR’°Ğ¢Ræ&GFÆTÖ–ÖvRç7G–ÆRçG&ç6f÷&ÒÒ66ÆS°Ğ¢ĞĞ Ğ¢–b„RçW§¦ÆTÖ&ö&B’°Ğ¢RçW§¦ÆTÖ&ö&Bç7G–ÆRçG&ç6f÷&ÒÒ66ÆS°Ğ¢RçW§¦ÆTÖ&ö&Bç7G–ÆRçG&ç6f÷&Ô÷&–v–âÒ'F÷ÆVgB#°Ğ¢ĞĞ Ğ¢FW‡B„Ræ&GFÆU¦ööÕFW‡BÂÖF‚ç&÷VæB†&GFÆU¦ööÒ¢’²"R"“°Ğ§ĞĞ Ğ¦gVæ7F–öâ÷VåFööÅF"‡f–WtæÖR’°Ğ¢–b‚7W'&VçE&ööÔ6öFR’°Ğ¢ÆW'B‚$÷Vâ&ööÒf—'7Bâ"“°Ğ¢&WGW&ã°Ğ¢ĞĞ Ğ¢6öç7BFööÅW&ÂÒæWrU$Â‡v–æF÷ræÆö6F–öâæ‡&Vb“°Ğ Ğ¢FööÅW&Âç6V&6…&×2ç6WB‚'&ööÒ"Â7W'&VçE&ööÔ6öFR“°Ğ¢FööÅW&Âç6V&6…&×2ç6WB‚'f–Wr"Âf–WtæÖR“°Ğ Ğ¢v–æF÷ræ÷Vâ‡FööÅW&ÂçFõ7G&–ær‚’Â%ö&Ææ²"“°Ğ§ĞĞ Ğ¦gVæ7F–öâ–æ—D6†&7FW$7&VF÷%7—7FVÒ‚’°¢–b†6†&7FW$7&VF÷%7—7FVÒ’°Ğ¢&WGW&ã°Ğ¢ĞĞ Ğ¢6†&7FW$7&VF÷%7—7FVÒÒ7&VFT6†&7FW$7&VF÷"‡°Ğ¢F"ÀĞ¢Fö2ÀĞ¢6öÆÆV7F–öâÀĞ¢vWDFö2ÀĞ¢FDFö2ÀĞ¢WFFTFö2ÀĞ¢FVÆWFTFö2ÀĞ¢öå6æ6†÷BÀĞ¢6W'fW%F–ÖW7F×ÀĞ Ğ¢vWD7W'&VçE&ööÔ6öFS¢gVæ7F–öâ‚’°Ğ¢&WGW&â7W'&VçE&ööÔ6öFS°Ğ¢ÒÀĞ Ğ¢vWD7W'&VçE&ööÔFF¢gVæ7F–öâ‚’°Ğ¢&WGW&â7W'&VçE&ööÔFF°Ğ¢ÒÀĞ Ğ¢vWD7W'&VçD—4DÓ¢gVæ7F–öâ‚’°Ğ¢&WGW&â7W'&VçD—4DÓ°Ğ¢ÒÀĞ Ğ¢7&VFT6†&7FW$Æ–æ¶VEFö¶Vã¢gVæ7F–öâ†6†&7FW"’°Ğ¢–b€Ğ¢Fö¶Vå7—7FVÒÇÀĞ¢G—VöbFö¶Vå7—7FVÒæ7&VFT6†&7FW$Æ–æ¶VEFö¶VâÓÒ&gVæ7F–öâ Ğ¢’°Ğ¢F‡&÷ræWrW'&÷"€Ğ¢%F†RFö¶Vâ7—7FVÒ—2æ÷B&VG’â Ğ¢“°Ğ¢ĞĞ Ğ¢&WGW&âFö¶Vå7—7FVÒæ7&VFT6†&7FW$Æ–æ¶VEFö¶Vâ€Ğ¢6†&7FW Ğ¢“°Ğ¢ÒÀĞ Ğ¢7–æ4Æ–æ¶VD6†&7FW%Fö¶Vç3¢gVæ7F–öâ†6†&7FW"’°Ğ¢–b€Ğ¢Fö¶Vå7—7FVÒÇÀĞ¢G—VöbFö¶Vå7—7FVÒç7–æ4Æ–æ¶VD6†&7FW%Fö¶Vç2ÓÒ&gVæ7F–öâ Ğ¢’°Ğ¢&WGW&â°Ğ¢6†&7FW$–C Ğ¢6†&7FW#òæ–BÇÂçVÆÂÀĞ¢WFFVD6÷VçC¢ Ğ¢Ó°Ğ¢ĞĞ Ğ¢&WGW&âFö¶Vå7—7FVÒç7–æ4Æ–æ¶VD6†&7FW%Fö¶Vç2€Ğ¢6†&7FW Ğ¢“°Ğ¢ĞĞ¢Ò“°§Ğ ¦gVæ7F–öâ–æ—DÖöç7FW$7&VF÷%7—7FVÒ‚’°¢–b†Ööç7FW$7&VF÷%7—7FVÒ’°¢Ööç7FW$7&VF÷%7—7FVÒç&Vg&W6‚‚“°¢&WGW&ã°¢Ğ ¢Ööç7FW$7&VF÷%7—7FVÒÒ7&VFTÖöç7FW$7&VF÷"‡°¢F"À¢Fö2À¢6öÆÆV7F–öâÀ¢FDFö2À¢WFFTFö2À¢FVÆWFTFö2À¢öå6æ6†÷BÀ¢6W'fW%F–ÖW7F×À ¢vWD7W'&VçE&ööÔ6öFS¢gVæ7F–öâ‚’°¢&WGW&â7W'&VçE&ööÔ6öFS°¢ÒÀ ¢vWD7W'&VçE&ööÔFF¢gVæ7F–öâ‚’°¢&WGW&â7W'&VçE&ööÔFF°¢ÒÀ ¢vWD7W'&VçD—4DÓ¢gVæ7F–öâ‚’°¢&WGW&â7W'&VçD—4DÓ°¢ÒÀ ¢7&VFTÖöç7FW$Æ–æ¶VEFö¶Vã¢gVæ7F–öâ†Ööç7FW"’°¢–b€¢Fö¶Vå7—7FVÒÇÀ¢G—VöbFö¶Vå7—7FVÒæ7&VFTÖöç7FW$Æ–æ¶VEFö¶VâÓÒ&gVæ7F–öâ ¢’°¢F‡&÷ræWrW'&÷"€¢%F†RFö¶Vâ7—7FVÒ—2æ÷B&VG’â ¢“°¢Ğ ¢&WGW&âFö¶Vå7—7FVÒæ7&VFTÖöç7FW$Æ–æ¶VEFö¶Vâ€¢Ööç7FW ¢“°¢ÒÀ ¢öä&6³¢gVæ7F–öâ‚’°¢6†÷tç”Ö–å67&VVâ‚&&GFÆR"“°¢Ç”&GFÆU¦ööÒ‚“° ¢–b€¢Fö¶Vå7—7FVÒb`¢G—VöbFö¶Vå7—7FVÒç&VæFW"ÓÓÒ&gVæ7F–öâ ¢’°¢Fö¶Vå7—7FVÒç&VæFW"†7W'&VçE&ööÔFFÇÂ·Ò“°¢Ğ¢Ğ¢Ò“°§Ğ Ğ Ğ¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞĞ¢òò4T5D”ôâ4(	B$EDÄRÔ%UEDôå0Ğ¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞĞ Ğ¦–b„Ræ÷Vä&GFÆTÖ'WGFöâ’°Ğ¢Ræ÷Vä&GFÆTÖ'WGFöâæFDWfVçDÆ—7FVæW"‚&6Æ–6²"ÂgVæ7F–öâ‚’°Ğ¢÷VåFööÅF"‚&&GFÆR"“°Ğ¢Ò“°Ğ§ĞĞ Ğ¦–b„Ræ&6µFõ&ööÔ'WGFöâ’°Ğ¢Ræ&6µFõ&ööÔ'WGFöâæFDWfVçDÆ—7FVæW"‚&6Æ–6²"ÂgVæ7F–öâ‚’°Ğ¢6†÷tç”Ö–å67&VVâ‚'&ööÒ"“°Ğ¢Ò“°Ğ§ĞĞ Ğ¦–b„Rç¦ööÔ÷WD'WGFöâ’°Ğ¢Rç¦ööÔ÷WD'WGFöâæFDWfVçDÆ—7FVæW"‚&6Æ–6²"ÂgVæ7F–öâ‚’°Ğ¢&GFÆU¦ööÒÓÒã#S°Ğ Ğ¢–b†&GFÆU¦ööÒÂã#R’°Ğ¢&GFÆU¦ööÒÒã#S°Ğ¢ĞĞ Ğ¢Ç”&GFÆU¦ööÒ‚“°Ğ¢Ò“°Ğ§ĞĞ Ğ¦–b„Rç¦ööÕ&W6WD'WGFöâ’°Ğ¢Rç¦ööÕ&W6WD'WGFöâæFDWfVçDÆ—7FVæW"‚&6Æ–6²"ÂgVæ7F–öâ‚’°Ğ¢&GFÆU¦ööÒÒ°Ğ¢Ç”&GFÆU¦ööÒ‚“°Ğ¢Ò“°Ğ§ĞĞ Ğ¦–b„Rç¦ööÔ–ä'WGFöâ’°Ğ¢Rç¦ööÔ–ä'WGFöâæFDWfVçDÆ—7FVæW"‚&6Æ–6²"ÂgVæ7F–öâ‚’°Ğ¢&GFÆU¦ööÒ³Òã#S°Ğ Ğ¢–b†&GFÆU¦ööÒâB’°Ğ¢&GFÆU¦ööÒÒC°Ğ¢ĞĞ Ğ¢Ç”&GFÆU¦ööÒ‚“°Ğ¢Ò“°Ğ§ĞĞ Ğ Ğ¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞ¢òò4T5D”ôâ4"(	B5$TDõ"DôôÂÄTä4„U%0¢òò7&VF÷"FööÇ2÷Vâ–âF†V—"÷vâ'&÷w6W"F'2à¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞ Ğ¦–b„Ræ÷Vä6†&7FW$7&VF÷$'WGFöâ’°Ğ¢Ræ÷Vä6†&7FW$7&VF÷$'WGFöâæFDWfVçDÆ—7FVæW"‚&6Æ–6²"ÂgVæ7F–öâ‚’°Ğ¢÷VåFööÅF"‚&6†&7FW$7&VF÷""“°Ğ¢Ò“°Ğ§ĞĞ Ğ¦–b„Ræ÷VäÖöç7FW$7&VF÷$'WGFöâ’°¢Ræ÷VäÖöç7FW$7&VF÷$'WGFöâæFDWfVçDÆ—7FVæW"‚&6Æ–6²"ÂgVæ7F–öâ‚’°¢÷VåFööÅF"‚&Ööç7FW$7&VF÷""“°¢Ò“°§Ğ Ğ Ğ¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞĞ¢òò4T5D”ôâ42(	B5$TDõ"$4²%UEDôå0Ğ¢òò–âFööÂF'2ÂF†—2&WGW&ç2FòF†R&GFÆRf–Wr–âF†R6ÖRF"àĞ¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞĞ Ğ¦–b„Ræ&6´g&öÔ6†&7FW$7&VF÷$'WGFöâ’°Ğ¢Ræ&6´g&öÔ6†&7FW$7&VF÷$'WGFöâæFDWfVçDÆ—7FVæW"‚&6Æ–6²"ÂgVæ7F–öâ‚’°Ğ¢6†÷tç”Ö–å67&VVâ‚&&GFÆR"“°Ğ¢Ç”&GFÆU¦ööÒ‚“°Ğ Ğ¢–b€Ğ¢v–æF÷rä†öÖV'&WtvöEFö¶Vç2b`Ğ¢G—Vöbv–æF÷rä†öÖV'&WtvöEFö¶Vç2ç&VæFW"ÓÓÒ&gVæ7F–öâ Ğ¢’°Ğ¢v–æF÷rä†öÖV'&WtvöEFö¶Vç2ç&VæFW"†7W'&VçE&ööÔFFÇÂ·Ò“°Ğ¢ĞĞ¢Ò“°Ğ§ĞĞ Ğ Ğ¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞĞ¢òò4T5D”ôâ4B(	B5D%EUd”Ur$õUD”är„TÅU%0Ğ¢òò6V7F–öâBv–ÆÂ6ÆÂF†—2gFW"F†R&ööÒÆöG2àĞ¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞĞ Ğ¦gVæ7F–öâ÷Vå7F'GWf–Wt–dæVVFVB‚’°Ğ¢–b†Ç&VG•W6VE7F'GWÆ–æ²’°Ğ¢&WGW&ã°Ğ¢ĞĞ Ğ¢–b‚7F'GW&ööÔ6öFRÇÂ7F'GWf–Wr’°Ğ¢&WGW&ã°Ğ¢ĞĞ Ğ¢–b‚7W'&VçE&ööÔ6öFRÇÂ7W'&VçE&ööÔ6öFRÓÒ7F'GW&ööÔ6öFR’°Ğ¢&WGW&ã°Ğ¢ĞĞ Ğ¢–b‚7W'&VçE&ööÔFF’°Ğ¢&WGW&ã°Ğ¢ĞĞ Ğ¢Ç&VG•W6VE7F'GWÆ–æ²ÒG'VS°Ğ Ğ¢–b‡7F'GWf–WrÓÓÒ&&GFÆR"’°Ğ¢6†÷tç”Ö–å67&VVâ‚&&GFÆR"“°Ğ¢Ç”&GFÆU¦ööÒ‚“°Ğ¢&WGW&ã°Ğ¢ĞĞ Ğ¢–b‡7F'GWf–WrÓÓÒ&6†&7FW$7&VF÷""’°Ğ¢6†÷tç”Ö–å67&VVâ‚&6†&7FW$7&VF÷""“°Ğ¢–æ—D6†&7FW$7&VF÷%7—7FVÒ‚“°Ğ¢&WGW&ã°Ğ¢ĞĞ Ğ¢–b‡7F'GWf–WrÓÓÒ&Ööç7FW$7&VF÷""’°¢6†÷tç”Ö–å67&VVâ‚&Ööç7FW$7&VF÷""“°¢–æ—DÖöç7FW$7&VF÷%7—7FVÒ‚“°¢&WGW&ã°¢Ğ§Ğ Ğ Ğ¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞĞ¢òò4T5D”ôâ4R(	BtRÄTdR4ÄTåU Ğ¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞĞ Ğ¦Fö7VÖVçBæFDWfVçDÆ—7FVæW"‚'f—6–&–Æ—G–6†ævR"ÂgVæ7F–öâ‚’°Ğ¢–b‚Fö7VÖVçBæ†–FFVâ’°Ğ¢F÷V6„7F—fUÆ–W%6W76–öâ‚“°Ğ¢ĞĞ§Ò“°Ğ Ğ§v–æF÷ræFDWfVçDÆ—7FVæW"‚&fö7W2"ÂgVæ7F–öâ‚’°Ğ¢F÷V6„7F—fUÆ–W%6W76–öâ‚“°Ğ§Ò“°Ğ Ğ§v–æF÷ræFDWfVçDÆ—7FVæW"‚'vW6†÷r"ÂgVæ7F–öâ‚’°Ğ¢F÷V6„7F—fUÆ–W%6W76–öâ‚“°Ğ§Ò“°Ğ Ğ§v–æF÷ræFDWfVçDÆ—7FVæW"‚'vV†–FR"ÂgVæ7F–öâ‚’°Ğ¢&VÖ÷fT7F—fUÆ–W%6W76–öâ‚“°Ğ§Ò“°Ğ Ğ¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞĞ¢òò4T5D”ôâB(	B5D%EUòUD‚tD4„U Ğ¢òò7W÷'G27F'GWF'3 ¢òò÷&ööÓÕ$ôôÔ4ôDRgf–WsÖ&GFÆP¢òò÷&ööÓÕ$ôôÔ4ôDRgf–WsÖ6†&7FW$7&VF÷ ¢òò÷&ööÓÕ$ôôÔ4ôDRgf–WsÖÖöç7FW$7&VF÷ ¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓĞ Ğ¦6öç6öÆRæÆör‚%&Vv—7FW&–ærWF‚Æ—7FVæW""“°Ğ Ğ¦öäWF…7FFT6†ævVB†WF‚Â7–æ2gVæ7F–öâ‡W6W"’°Ğ¢6öç6öÆRæÆör‚$WF‚7FFR6†ævVC¢"ÂW6W"òW6W"çV–B¢&æòW6W""“°Ğ Ğ¢7W'&VçEW6W"ÒW6W#°Ğ Ğ¢–b‚W6W"’°Ğ¢v—B6†÷tÆövvVD÷WB‚“°Ğ¢&WGW&ã°Ğ¢ĞĞ Ğ¢6†÷tÆövvVD–â‡W6W"“°Ğ Ğ¢G'’°Ğ¢v—B6fUW6W$Fö2‡W6W"“°Ğ¢Ò6F6‚†W'&÷"’°Ğ¢6öç6öÆRæW'&÷"€Ğ¢$WF†VçF–6FVBÂ'WBF†RW6W"&öf–ÆR6÷VÆBæ÷B&R6fVBFòf—&W7F÷&S¢"ÀĞ¢W'&÷ Ğ¢“°Ğ¢ĞĞ Ğ¢Æ—7FVåFô×•&öö×2‚“°Ğ Ğ¢–b‚Ç&VG•W6VE7F'GWÆ–æ²bb7F'GW&ööÔ6öFR’°Ğ¢6öç7B7F'GW67&VVâĞĞ¢7F'GWf–WrÓÓÒ&&GFÆR Ğ¢ò&&GFÆR Ğ¢¢'&ööÒ#°Ğ Ğ¢v—B¦ö–å&ööÒ€Ğ¢7F'GW&ööÔ6öFRÀĞ¢'Æ–W""ÀĞ¢7F'GW67&VVàĞ¢“°Ğ¢ĞĞ§Ò“°Ğ