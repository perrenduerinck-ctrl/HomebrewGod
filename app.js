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
  updateDoc,
  addDoc,
  deleteDoc,
  collection,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { createTokenSystem } from "./tokens.js";
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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// =====================================================
// APP SECTION 3 — PAGE ELEMENTS / STATE
// =====================================================

const $ = (id) => document.getElementById(id);

const E = {
  authScreen: $("authScreen"),
  lobbyScreen: $("lobbyScreen"),
  roomDashboardScreen: $("roomDashboardScreen"),
  battleMapScreen: $("battleMapScreen"),

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
  yourRoleText: $("yourRoleText"),
  playersList: $("playersList"),

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
  battleMapSurface: $("battleMapSurface"),

  battleManagerBar: $("battleManagerBar"),

  battleDmMapControls: $("battleDmMapControls"),
  battleMapUploadInput: $("battleMapUploadInput"),
  updateBattleMapButton: $("updateBattleMapButton"),
  battleMapUpdateStatus: $("battleMapUpdateStatus"),

  puzzleMapControls: $("puzzleMapControls"),
  puzzleTileUploadInput: $("puzzleTileUploadInput"),
  addTileNorthButton: $("addTileNorthButton"),
  addTileSouthButton: $("addTileSouthButton"),
  addTileEastButton: $("addTileEastButton"),
  addTileWestButton: $("addTileWestButton"),
  centerPuzzleBoardButton: $("centerPuzzleBoardButton"),
  puzzleMapStatus: $("puzzleMapStatus"),
  puzzleMapBoard: $("puzzleMapBoard"),

  tokenBuilderControls: $("tokenBuilderControls"),
  tokenNameInput: $("tokenNameInput"),
  tokenTypeSelect: $("tokenTypeSelect"),
  tokenImageUploadInput: $("tokenImageUploadInput"),
  addTokenButton: $("addTokenButton"),
  tokenBuilderStatus: $("tokenBuilderStatus"),
  tokenLayer: $("tokenLayer")
};

let currentUser = null;
let currentRoomCode = null;
let currentRoomData = null;
let currentIsDM = false;
let currentMapId = null;
let latestMapsSnapshot = null;
let latestActivePlayersSnapshot = null;
let battleZoom = 1;
let tokenSystem = null;
let stopListeningToMyRooms = null;
let stopListeningToRoom = null;
let stopListeningToPlayers = null;
let stopListeningToMaps = null;
let activeSessionId = sessionStorage.getItem("homebrewGodSessionId");
let activeSessionRoomCode = null;

if (!activeSessionId) {
  activeSessionId = crypto.randomUUID();
  sessionStorage.setItem("homebrewGodSessionId", activeSessionId);
}

const startupParams = new URLSearchParams(window.location.search);
const startupRoomCode = startupParams.get("room");
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

  if (screenName === "auth") E.authScreen.classList.remove("hidden");
  if (screenName === "lobby") E.lobbyScreen.classList.remove("hidden");
  if (screenName === "room") E.roomDashboardScreen.classList.remove("hidden");
  if (screenName === "battle") E.battleMapScreen.classList.remove("hidden");
}

function text(el, value) {
  if (el) el.textContent = value;
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

  stopListeningToRoom = null;
  stopListeningToPlayers = null;
  stopListeningToMaps = null;
  latestActivePlayersSnapshot = null;
}

function getSafeMapName(fileName) {
  return fileName || "Current Battle Map";
}

function freshUrl(url) {
  if (!url) return "";
  return url + (url.includes("?") ? "&" : "?") + "homebrewGodCacheBust=" + Date.now();
}

function setDmControlsVisible(isVisible) {
  const controls = [E.dmMapControls, E.battleDmMapControls, E.puzzleMapControls];

  controls.forEach((el) => {
    if (!el) return;
    if (isVisible) el.classList.remove("hidden");
    else el.classList.add("hidden");
  });
}

function buildMapFromRoomFields(room) {
  if (!room) return null;

  if (room.currentMap && room.currentMap.url) {
    return {
      id: room.currentMap.id || null,
      name: room.currentMap.name || room.currentMapName || "Current Battle Map",
      url: room.currentMap.url,
      publicId: room.currentMap.publicId || room.currentMapPublicId || null,
      savedToLibrary: room.currentMap.savedToLibrary === true
    };
  }

  if (room.currentMapUrl) {
    return {
      id: room.currentMapId || null,
      name: room.currentMapName || "Current Battle Map",
      url: room.currentMapUrl,
      publicId: room.currentMapPublicId || null,
      savedToLibrary: room.currentMapSavedToLibrary === true
    };
  }

  return null;
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

E.guestButton.addEventListener("click", async function () {
  try {
    const name = E.guestNameInput.value.trim() || "Guest";
    const result = await signInAnonymously(auth);
    await updateProfile(result.user, { displayName: name });
    await saveUserDoc(result.user);
  } catch (error) {
    alert(error.message);
  }
});

E.signupButton.addEventListener("click", async function () {
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

E.loginButton.addEventListener("click", async function () {
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

E.logoutButton.addEventListener("click", async function () {
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

  stopListeningToMyRooms = onSnapshot(collection(db, "users", currentUser.uid, "rooms"), function (snap) {
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
  }, function (error) {
    E.myRoomsList.textContent = "Could not load saved rooms: " + error.message;
  });
}

// =====================================================
// APP SECTION 7 — ROOM CREATE / JOIN / OPEN
// =====================================================

async function createRoom() {
  const roomName = E.roomNameInput.value.trim() || "Unnamed Room";
  const roomCode = makeRoomCode();

  await setDoc(doc(db, "rooms", roomCode), {
    roomCode,
    roomName,
    dmUid: currentUser.uid,
    dmName: currentUser.displayName || "Unnamed",
    currentMap: null,
    currentMapUrl: null,
    currentMapName: null,
    currentMapId: null,
    currentMapPublicId: null,
    currentMapSavedToLibrary: false,
    puzzleTiles: [],
    activePuzzleTileKey: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

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

  clearRoomListeners();

  stopListeningToRoom = onSnapshot(doc(db, "rooms", cleanCode), async function (roomSnap) {
    if (!roomSnap.exists()) {
      alert("This room was deleted or does not exist.");
      await leaveCurrentRoomView();
      return;
    }

    const room = roomSnap.data();

    currentRoomData = room;
    currentIsDM = room.dmUid === currentUser.uid;

    text(E.currentRoomNameText, room.roomName || "Unnamed Room");
    text(E.roomCodeText, cleanCode);
    text(E.battleRoomNameText, room.roomName || "Unnamed Room");
    text(E.battleRoomCodeText, cleanCode);
    text(E.yourRoleText, currentIsDM ? "DM" : "Player");

    setDmControlsVisible(currentIsDM);

    await setActivePlayerSession(cleanCode, currentIsDM ? "dm" : "player");

    showSharedMap(buildMapFromRoomFields(room));
    renderPuzzleBoard(room);

    if (latestMapsSnapshot) renderRoomMaps(latestMapsSnapshot);
    if (latestActivePlayersSnapshot) renderPlayers(latestActivePlayersSnapshot);
  }, function (error) {
    alert("Room listener failed: " + error.message);
  });

  listenToPlayers(cleanCode);
  listenToRoomMaps(cleanCode);

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

E.createRoomButton.addEventListener("click", async () => {
  try {
    await createRoom();
  } catch (error) {
    alert(error.message);
  }
});

E.joinRoomButton.addEventListener("click", async () => {
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

E.backToLobbyButton.addEventListener("click", leaveCurrentRoomView);

E.copyRoomCodeButton.addEventListener("click", async () => {
  if (!currentRoomCode) return;

  await navigator.clipboard.writeText(currentRoomCode);
  alert("Room code copied.");
});

E.saveThisRoomButton.addEventListener("click", async () => {
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

async function setActivePlayerSession(roomCode, role) {
  if (!currentUser || !roomCode) return;

  const cleanCode = normalizeRoomCode(roomCode);

  if (activeSessionRoomCode && activeSessionRoomCode !== cleanCode) {
    await removeActivePlayerSession();
  }

  activeSessionRoomCode = cleanCode;

  await setDoc(doc(db, "rooms", cleanCode, "activePlayers", activeSessionId), {
    sessionId: activeSessionId,
    uid: currentUser.uid,
    displayName: currentUser.displayName || "Unnamed",
    role: role || "player",
    joinedAt: serverTimestamp()
  }, { merge: true });
}

async function removeActivePlayerSession() {
  if (!activeSessionRoomCode) return;

  try {
    await deleteDoc(doc(db, "rooms", activeSessionRoomCode, "activePlayers", activeSessionId));
  } catch (error) {
    console.warn("Could not remove active player session:", error);
  }

  activeSessionRoomCode = null;
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

async function uploadMapToCloudinary(file) {
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


// =====================================================
// APP SECTION 10 — SAVED MAP LIBRARY
// =====================================================

function listenToRoomMaps(roomCode) {
  stopListeningToMaps = onSnapshot(
    collection(db, "rooms", roomCode, "maps"),
    function (mapsSnap) {
      latestMapsSnapshot = mapsSnap;
      renderRoomMaps(mapsSnap);
    },
    function (error) {
      E.roomMapsList.textContent = "Could not load saved maps: " + error.message;
    }
  );
}

function renderRoomMaps(mapsSnap) {
  E.roomMapsList.innerHTML = "";

  if (mapsSnap.empty) {
    E.roomMapsList.textContent = "No saved maps in this room yet. Upload a new map as DM.";
    return;
  }

  mapsSnap.forEach(function (mapDoc) {
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

  if (!mapData || !mapData.url) {
    await updateDoc(roomRef, {
      currentMap: null,
      currentMapUrl: null,
      currentMapName: null,
      currentMapId: null,
      currentMapPublicId: null,
      currentMapSavedToLibrary: false,
      updatedAt: serverTimestamp()
    });

    return;
  }

  await updateDoc(roomRef, {
    currentMap: {
      id: mapData.id || null,
      name: mapData.name || "Current Battle Map",
      url: mapData.url,
      publicId: mapData.publicId || null,
      savedToLibrary: mapData.savedToLibrary === true
    },
    currentMapUrl: mapData.url,
    currentMapName: mapData.name || "Current Battle Map",
    currentMapId: mapData.id || null,
    currentMapPublicId: mapData.publicId || null,
    currentMapSavedToLibrary: mapData.savedToLibrary === true,
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

    if (!confirm("Forget this map from the room list? This does not delete it from Cloudinary.")) {
      return;
    }

    await deleteDoc(doc(db, "rooms", currentRoomCode, "maps", mapId));

    if (currentMapId === mapId) {
      await setCurrentRoomMap(null);
      showSharedMap(null);
    }
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

    text(E.currentMapNameText, "None");
    text(E.battleMapNameText, "None");

    E.roomMapPreviewImage.onload = null;
    E.roomMapPreviewImage.onerror = null;
    E.roomMapPreviewImage.removeAttribute("src");
    E.roomMapPreviewImage.style.display = "none";

    text(E.noRoomMapPreviewText, "No shared map loaded yet.");
    E.noRoomMapPreviewText.style.display = "block";

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

  const imageUrl = freshUrl(map.url);

  text(E.noRoomMapPreviewText, "Loading map preview...");
  E.noRoomMapPreviewText.style.display = "block";
  E.roomMapPreviewImage.style.display = "none";

  E.roomMapPreviewImage.onload = function () {
    E.noRoomMapPreviewText.style.display = "none";
    E.roomMapPreviewImage.style.display = "block";
  };

  E.roomMapPreviewImage.onerror = function () {
    E.roomMapPreviewImage.style.display = "none";
    text(E.noRoomMapPreviewText, "Map preview failed to load.");
    E.noRoomMapPreviewText.style.display = "block";
  };

  E.roomMapPreviewImage.src = imageUrl;

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

E.uploadRoomMapButton.addEventListener("click", async function () {
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

    const newMap = {
      name: getSafeMapName(file.name),
      url: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id
    };

    const mapId = await saveMapToRoomLibrary(newMap);

    const savedMap = {
      id: mapId,
      name: newMap.name,
      url: newMap.url,
      publicId: newMap.publicId,
      savedToLibrary: true
    };

    await setCurrentRoomMap(savedMap);

    currentRoomData = {
      ...(currentRoomData || {}),
      currentMap: savedMap,
      currentMapUrl: savedMap.url,
      currentMapName: savedMap.name,
      currentMapId: savedMap.id,
      currentMapPublicId: savedMap.publicId,
      currentMapSavedToLibrary: true
    };

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

E.removeRoomMapButton.addEventListener("click", async function () {
  try {
    if (!currentRoomCode) return;

    if (!currentIsDM) {
      alert("Only the DM can remove the room map.");
      return;
    }

    if (!confirm("Remove the current shared map? It will stay in Saved Maps if it was saved there.")) {
      return;
    }

    await setCurrentRoomMap(null);

    currentRoomData = {
      ...(currentRoomData || {}),
      currentMap: null,
      currentMapUrl: null,
      currentMapName: null,
      currentMapId: null,
      currentMapPublicId: null,
      currentMapSavedToLibrary: false
    };

    showSharedMap(null);
    text(E.mapUploadStatus, "Current map removed.");
  } catch (error) {
    alert(error.message);
  }
});

E.saveCurrentMapButton.addEventListener("click", async function () {
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
      publicId: currentMap.publicId || null
    });

    const savedMap = {
      id: mapId,
      name: currentMap.name || "Recovered Current Map",
      url: currentMap.url,
      publicId: currentMap.publicId || null,
      savedToLibrary: true
    };

    await setCurrentRoomMap(savedMap);

    currentRoomData = {
      ...(currentRoomData || {}),
      currentMap: savedMap,
      currentMapUrl: savedMap.url,
      currentMapName: savedMap.name,
      currentMapId: savedMap.id,
      currentMapPublicId: savedMap.publicId,
      currentMapSavedToLibrary: true
    };

    showSharedMap(savedMap);
    text(E.mapUploadStatus, "Current map saved to room library.");
  } catch (error) {
    alert(error.message);
  }
});

if (E.updateBattleMapButton) {
  E.updateBattleMapButton.addEventListener("click", async function () {
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

      const cloudinaryResult = await uploadMapToCloudinary(file);

      const currentOnlyMap = {
        id: null,
        name: getSafeMapName(file.name),
        url: cloudinaryResult.secure_url,
        publicId: cloudinaryResult.public_id,
        savedToLibrary: false
      };

      await setCurrentRoomMap(currentOnlyMap);

      currentRoomData = {
        ...(currentRoomData || {}),
        currentMap: currentOnlyMap,
        currentMapUrl: currentOnlyMap.url,
        currentMapName: currentOnlyMap.name,
        currentMapId: null,
        currentMapPublicId: currentOnlyMap.publicId,
        currentMapSavedToLibrary: false
      };

      showSharedMap(currentOnlyMap);

      text(E.battleMapUpdateStatus, "Battle map updated for everyone. Not saved to Saved Maps.");
      E.battleMapUploadInput.value = "";
    } catch (error) {
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
// =====================================================

function ensureBattleManagerPolishStyles() {
  if (document.getElementById("battleManagerPolishStyles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "battleManagerPolishStyles";

  style.textContent = `
    #battleMapSurface {
      position: relative;
    }

    #battleManagerBar {
      max-width: none !important;
    }

    #battleManagerInner {
      display: grid;
      gap: 10px;
    }

    #puzzleMapControls,
    #tokenBuilderControls {
      max-width: none !important;
    }

    #puzzleMapControls .battleEditorInner,
    #tokenBuilderControls .battleEditorInner {
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

    #puzzleMapBoard {
      position: relative;
      isolation: isolate;
    }

    #puzzleMapBoard.hidden {
      display: none !important;
    }

    #tokenLayer {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 40;
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

  if (E.battleManagerBar) {
    E.battleManagerBar.classList.toggle("hidden", !showDmTools);
  }

  if (E.puzzleMapControls) {
    E.puzzleMapControls.classList.toggle("hidden", !showDmTools);
  }

  if (E.tokenBuilderControls) {
    E.tokenBuilderControls.classList.toggle("hidden", !showDmTools);
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

function tileExistsAtPosition(tiles, x, y, exceptKey) {
  const key = makeTileKey(x, y);

  return tiles.some(function (tile) {
    return tile.key === key && tile.key !== exceptKey;
  });
}

async function updateRoomWithPuzzleTiles(tiles, activeTile, viewMode) {
  if (!currentRoomCode) {
    return;
  }

  const safeActiveTile = activeTile || null;
  const safeViewMode = viewMode === "focus" ? "focus" : "board";
  const activeMap = safeActiveTile ? puzzleTileToCurrentMap(safeActiveTile) : null;

  await updateDoc(doc(db, "rooms", currentRoomCode), {
    puzzleTiles: tiles,
    activePuzzleTileKey: safeActiveTile ? safeActiveTile.key : null,
    puzzleViewMode: safeViewMode,

    currentMap: activeMap,
    currentMapUrl: activeMap ? activeMap.url : null,
    currentMapName: activeMap ? activeMap.name : null,
    currentMapId: activeMap ? activeMap.id : null,
    currentMapPublicId: activeMap ? activeMap.publicId : null,
    currentMapSavedToLibrary: false,

    updatedAt: serverTimestamp()
  });
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
  const tileLookup = new Map();

  tiles.forEach(function (tile) {
    tileLookup.set(makeTileKey(tile.x, tile.y), tile);
  });

  E.puzzleMapBoard.style.gridTemplateColumns =
    "repeat(" + (bounds.maxX - bounds.minX + 1) + ", auto)";

  E.puzzleMapBoard.style.gridTemplateRows =
    "repeat(" + (bounds.maxY - bounds.minY + 1) + ", auto)";

  for (let y = bounds.minY; y <= bounds.maxY; y++) {
    for (let x = bounds.minX; x <= bounds.maxX; x++) {
      const key = makeTileKey(x, y);
      const tile = tileLookup.get(key);

      if (!tile) {
        const emptyCell = document.createElement("div");
        emptyCell.className = "puzzle-grid-empty-cell";
        emptyCell.title = "Empty grid spot " + key;
        E.puzzleMapBoard.appendChild(emptyCell);
        continue;
      }

      E.puzzleMapBoard.appendChild(createPuzzleTileElement(tile, activeTile));
    }
  }

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

  if (tiles.length === 0) {
    return {
      x: 0,
      y: 0
    };
  }

  const activeTile = getActivePuzzleTile(currentRoomData || {}) || tiles[0];

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

async function addPuzzleTile(direction) {
  try {
    if (!currentRoomCode) {
      alert("Create or join a room first.");
      return;
    }

    if (!currentIsDM) {
      alert("Only the DM can add puzzle map tiles.");
      return;
    }

    if (!E.puzzleTileUploadInput || !E.puzzleTileUploadInput.files[0]) {
      alert("Choose a puzzle tile image first.");
      return;
    }

    const file = E.puzzleTileUploadInput.files[0];
    const oldTiles = getPuzzleTiles(currentRoomData || {});
    const target = getTargetPositionForNewTile(direction);

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

    const cloudinaryResult = await uploadMapToCloudinary(file);
    const key = makeTileKey(target.x, target.y);

    const newTile = {
      key,
      x: target.x,
      y: target.y,
      name: getSafeMapName(file.name),
      url: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
      locked: true,
      createdAtMillis: Date.now()
    };

    const newTiles = oldTiles.concat(newTile);

    currentRoomData = {
      ...(currentRoomData || {}),
      puzzleTiles: newTiles,
      activePuzzleTileKey: newTile.key,
      puzzleViewMode: "board",
      currentMap: puzzleTileToCurrentMap(newTile),
      currentMapUrl: newTile.url,
      currentMapName: newTile.name,
      currentMapId: newTile.key,
      currentMapPublicId: newTile.publicId,
      currentMapSavedToLibrary: false
    };

    await updateRoomWithPuzzleTiles(newTiles, newTile, "board");

    renderPuzzleBoard(currentRoomData);

    if (E.puzzleTileUploadInput) {
      E.puzzleTileUploadInput.value = "";
    }

    setTimeout(function () {
      centerPuzzleBoardNow();
    }, 80);

    text(
      E.puzzleMapStatus,
      oldTiles.length === 0
        ? "First puzzle tile placed at center 0,0."
        : "Puzzle tile added " + direction + " at " + key + "."
    );
  } catch (error) {
    text(E.puzzleMapStatus, "Puzzle tile upload failed.");
    alert(error.message);
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

    const tiles = getPuzzleTiles(currentRoomData || {});
    const tile = tiles.find(function (item) {
      return item.key === tileKey;
    });

    if (!tile) {
      alert("Puzzle tile not found.");
      return;
    }

    currentRoomData = {
      ...(currentRoomData || {}),
      puzzleTiles: tiles,
      activePuzzleTileKey: tile.key,
      puzzleViewMode: "focus",
      currentMap: puzzleTileToCurrentMap(tile),
      currentMapUrl: tile.url,
      currentMapName: tile.name,
      currentMapId: tile.key,
      currentMapPublicId: tile.publicId || null,
      currentMapSavedToLibrary: false
    };

    await updateRoomWithPuzzleTiles(tiles, tile, "focus");

    showSingleBattleMapView();
    showSharedMap(puzzleTileToCurrentMap(tile));
    renderPuzzleBoard(currentRoomData);

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

    const tiles = getPuzzleTiles(currentRoomData || {});
    const activeTile = getActivePuzzleTile(currentRoomData || {});

    currentRoomData = {
      ...(currentRoomData || {}),
      puzzleTiles: tiles,
      activePuzzleTileKey: activeTile ? activeTile.key : null,
      puzzleViewMode: "board"
    };

    await updateDoc(doc(db, "rooms", currentRoomCode), {
      puzzleViewMode: "board",
      activePuzzleTileKey: activeTile ? activeTile.key : null,
      updatedAt: serverTimestamp()
    });

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

    if (!confirm("Delete this puzzle tile from the board? This does not delete the image from Cloudinary.")) {
      return;
    }

    const oldTiles = getPuzzleTiles(currentRoomData || {});
    const newTiles = oldTiles.filter(function (tile) {
      return tile.key !== tileKey;
    });

    const newActiveTile = newTiles.length > 0 ? newTiles[0] : null;

    currentRoomData = {
      ...(currentRoomData || {}),
      puzzleTiles: newTiles,
      activePuzzleTileKey: newActiveTile ? newActiveTile.key : null,
      puzzleViewMode: "board",
      currentMap: newActiveTile ? puzzleTileToCurrentMap(newActiveTile) : null,
      currentMapUrl: newActiveTile ? newActiveTile.url : null,
      currentMapName: newActiveTile ? newActiveTile.name : null,
      currentMapId: newActiveTile ? newActiveTile.key : null,
      currentMapPublicId: newActiveTile ? newActiveTile.publicId || null : null,
      currentMapSavedToLibrary: false
    };

    await updateRoomWithPuzzleTiles(newTiles, newActiveTile, "board");

    if (newActiveTile) {
      showSharedMap(puzzleTileToCurrentMap(newActiveTile));
    }

    renderPuzzleBoard(currentRoomData);

    text(E.puzzleMapStatus, "Puzzle tile deleted.");
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

    const oldTiles = getPuzzleTiles(currentRoomData || {});
    const oldTile = oldTiles.find(function (tile) {
      return tile.key === tileKey;
    });

    if (!oldTile) {
      text(E.puzzleMapStatus, "Tile not found.");
      renderPuzzleBoard(currentRoomData);
      return;
    }

    if (oldTile.x === newX && oldTile.y === newY) {
      text(E.puzzleMapStatus, "Tile stayed locked in place.");
      renderPuzzleBoard(currentRoomData);
      return;
    }

    if (tileExistsAtPosition(oldTiles, newX, newY, tileKey)) {
      text(E.puzzleMapStatus, "That grid spot is already taken. Tile snapped back.");
      renderPuzzleBoard(currentRoomData);
      return;
    }

    const newKey = makeTileKey(newX, newY);

    const movedTile = {
      ...oldTile,
      key: newKey,
      x: newX,
      y: newY,
      movedAtMillis: Date.now()
    };

    const newTiles = oldTiles.map(function (tile) {
      return tile.key === tileKey ? movedTile : tile;
    });

    currentRoomData = {
      ...(currentRoomData || {}),
      puzzleTiles: newTiles,
      activePuzzleTileKey: movedTile.key,
      puzzleViewMode: "board",
      currentMap: puzzleTileToCurrentMap(movedTile),
      currentMapUrl: movedTile.url,
      currentMapName: movedTile.name,
      currentMapId: movedTile.key,
      currentMapPublicId: movedTile.publicId || null,
      currentMapSavedToLibrary: false
    };

    await updateRoomWithPuzzleTiles(newTiles, movedTile, "board");

    renderPuzzleBoard(currentRoomData);

    text(E.puzzleMapStatus, "Tile moved and locked at " + movedTile.key + ".");
  } catch (error) {
    alert(error.message);
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
// APP SECTION 13 — BATTLE MAP SCREEN / NEW TAB
// =====================================================

function applyBattleZoom() {
  E.battleMapImage.style.transform = "scale(" + battleZoom + ")";
  text(E.battleZoomText, Math.round(battleZoom * 100) + "%");
}

E.openBattleMapButton.addEventListener("click", function () {
  if (!currentRoomCode) {
    alert("Open a room first.");
    return;
  }

  const battleUrl = new URL(window.location.href);

  battleUrl.searchParams.set("room", currentRoomCode);
  battleUrl.searchParams.set("view", "battle");

  window.open(battleUrl.toString(), "_blank");
});

E.backToRoomButton.addEventListener("click", function () {
  showScreen("room");
});

E.zoomOutButton.addEventListener("click", function () {
  battleZoom -= 0.25;

  if (battleZoom < 0.25) {
    battleZoom = 0.25;
  }

  applyBattleZoom();
});

E.zoomResetButton.addEventListener("click", function () {
  battleZoom = 1;
  applyBattleZoom();
});

E.zoomInButton.addEventListener("click", function () {
  battleZoom += 0.25;

  if (battleZoom > 4) {
    battleZoom = 4;
  }

  applyBattleZoom();
});

window.addEventListener("pagehide", function () {
  removeActivePlayerSession();
});


// =====================================================
// APP SECTION 14 — STARTUP / AUTH WATCHER
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
    alreadyUsedStartupLink = true;

    await joinRoom(
      startupRoomCode,
      "player",
      startupView === "battle" ? "battle" : "room"
    );
  }
});
