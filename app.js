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
  puzzleMapBoard: $("puzzleMapBoard")
};

let currentUser = null;
let currentRoomCode = null;
let currentRoomData = null;
let currentIsDM = false;
let currentMapId = null;
let latestMapsSnapshot = null;
let latestActivePlayersSnapshot = null;
let battleZoom = 1;
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
// APP SECTION 12 — PUZZLE MAP SYSTEM V1
// =====================================================

ensurePuzzleMapPolishStyles();

function ensurePuzzleMapPolishStyles() {
  if (document.getElementById("puzzleMapPolishStyles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "puzzleMapPolishStyles";

  style.textContent = `
    #puzzleMapControls {
      max-width: none !important;
      padding: 9px 10px !important;
      margin-top: 9px !important;
    }

    #puzzleMapControls h2 {
      display: inline-block !important;
      font-size: 18px !important;
      margin: 0 12px 0 0 !important;
      vertical-align: middle !important;
    }

    #puzzleMapControls .small {
      display: none !important;
    }

    #puzzleMapControls input[type="file"] {
      display: inline-block !important;
      width: 260px !important;
      max-width: 100% !important;
      margin: 0 8px 0 0 !important;
      padding: 7px 8px !important;
      font-size: 14px !important;
      vertical-align: middle !important;
    }

    #puzzleMapControls button {
      display: inline-block !important;
      width: auto !important;
      margin: 0 6px 0 0 !important;
      padding: 8px 12px !important;
      font-size: 14px !important;
      vertical-align: middle !important;
    }

    #puzzleMapStatus {
      display: inline-block !important;
      margin: 0 0 0 4px !important;
      font-size: 14px !important;
      vertical-align: middle !important;
    }

    #puzzleMapBoard {
      gap: 0 !important;
      padding: 0 !important;
      min-height: 520px !important;
      background: #050508 !important;
      border-radius: 14px !important;
      overflow: auto !important;
    }

    #puzzleMapBoard .map-tile {
      border: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      background: #000 !important;
    }

    #puzzleMapBoard .map-tile.locked {
      border: 0 !important;
      box-shadow: none !important;
    }

    #puzzleMapBoard .map-tile img {
      border-radius: 0 !important;
      object-fit: cover !important;
    }

    @media (max-width: 900px) {
      #puzzleMapControls h2,
      #puzzleMapControls input[type="file"],
      #puzzleMapControls button,
      #puzzleMapStatus {
        display: block !important;
        width: 100% !important;
        margin: 5px 0 !important;
      }
    }
  `;

  document.head.appendChild(style);
}

function makeTileKey(x, y) {
  return String(x) + "," + String(y);
}

function getPuzzleTiles(room) {
  if (!room || !Array.isArray(room.puzzleTiles)) {
    return [];
  }

  return room.puzzleTiles.filter(function (tile) {
    return tile && tile.url && Number.isFinite(tile.x) && Number.isFinite(tile.y);
  });
}

function getActivePuzzleTile(room) {
  const tiles = getPuzzleTiles(room);

  if (tiles.length === 0) {
    return null;
  }

  const activeKey = room.activePuzzleTileKey || makeTileKey(0, 0);

  return tiles.find(function (tile) {
    return tile.key === activeKey;
  }) || tiles[0];
}

function getPuzzleViewMode(room) {
  if (room && room.puzzleViewMode === "focus") {
    return "focus";
  }

  return "board";
}

function puzzleTileToCurrentMap(tile) {
  if (!tile) {
    return null;
  }

  return {
    id: tile.key || makeTileKey(tile.x, tile.y),
    name: tile.name || "Puzzle Tile " + makeTileKey(tile.x, tile.y),
    url: tile.url,
    publicId: tile.publicId || null,
    savedToLibrary: false
  };
}

function getTargetPositionForDirection(direction) {
  const tiles = getPuzzleTiles(currentRoomData || {});
  const activeTile = getActivePuzzleTile(currentRoomData || {});

  if (tiles.length === 0 || !activeTile) {
    return {
      x: 0,
      y: 0
    };
  }

  let x = activeTile.x;
  let y = activeTile.y;

  if (direction === "north") {
    y -= 1;
  }

  if (direction === "south") {
    y += 1;
  }

  if (direction === "east") {
    x += 1;
  }

  if (direction === "west") {
    x -= 1;
  }

  return {
    x: x,
    y: y
  };
}

function tileExistsAtPosition(tiles, x, y) {
  return tiles.some(function (tile) {
    return tile.x === x && tile.y === y;
  });
}

function disablePuzzleButtons(isDisabled) {
  [
    E.addTileNorthButton,
    E.addTileSouthButton,
    E.addTileEastButton,
    E.addTileWestButton,
    E.centerPuzzleBoardButton
  ].forEach(function (button) {
    if (button) {
      button.disabled = isDisabled;
    }
  });
}

async function updateRoomWithPuzzleTiles(newTiles, activeTile, viewMode = "board") {
  if (!currentRoomCode || !currentIsDM) {
    alert("Only the DM can change puzzle maps.");
    return;
  }

  const currentMap = activeTile ? puzzleTileToCurrentMap(activeTile) : null;

  const updateData = {
    puzzleTiles: newTiles,
    activePuzzleTileKey: activeTile ? activeTile.key : null,
    puzzleViewMode: viewMode,
    updatedAt: serverTimestamp()
  };

  if (currentMap && currentMap.url) {
    updateData.currentMap = {
      id: currentMap.id,
      name: currentMap.name,
      url: currentMap.url,
      publicId: currentMap.publicId || null,
      savedToLibrary: false
    };

    updateData.currentMapUrl = currentMap.url;
    updateData.currentMapName = currentMap.name;
    updateData.currentMapId = currentMap.id;
    updateData.currentMapPublicId = currentMap.publicId || null;
    updateData.currentMapSavedToLibrary = false;
  } else {
    updateData.currentMap = null;
    updateData.currentMapUrl = null;
    updateData.currentMapName = null;
    updateData.currentMapId = null;
    updateData.currentMapPublicId = null;
    updateData.currentMapSavedToLibrary = false;
  }

  await updateDoc(doc(db, "rooms", currentRoomCode), updateData);
}

async function addPuzzleTile(direction) {
  try {
    if (!currentRoomCode) {
      alert("Open a room first.");
      return;
    }

    if (!currentIsDM) {
      alert("Only the DM can add puzzle tiles.");
      return;
    }

    const file = E.puzzleTileUploadInput ? E.puzzleTileUploadInput.files[0] : null;

    if (!file) {
      alert("Choose a puzzle tile image first.");
      return;
    }

    const oldTiles = getPuzzleTiles(currentRoomData || {});
    const target = getTargetPositionForDirection(direction);

    if (tileExistsAtPosition(oldTiles, target.x, target.y)) {
      alert("That puzzle spot already has a tile. Focus another tile or delete the old one first.");
      return;
    }

    text(
      E.puzzleMapStatus,
      oldTiles.length === 0
        ? "Uploading first puzzle tile at center..."
        : "Uploading puzzle tile " + direction + "..."
    );

    disablePuzzleButtons(true);

    const cloudinaryResult = await uploadMapToCloudinary(file);
    const key = makeTileKey(target.x, target.y);

    const newTile = {
      key: key,
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

    showSharedMap(puzzleTileToCurrentMap(newTile));
    renderPuzzleBoard(currentRoomData);

    E.puzzleTileUploadInput.value = "";

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

    showSharedMap(newActiveTile ? puzzleTileToCurrentMap(newActiveTile) : null);
    renderPuzzleBoard(currentRoomData);

    text(E.puzzleMapStatus, "Puzzle tile deleted.");
  } catch (error) {
    alert(error.message);
  }
}

function centerPuzzleBoardNow() {
  if (!E.puzzleMapBoard) {
    return;
  }

  E.puzzleMapBoard.scrollLeft = Math.max(0, (E.puzzleMapBoard.scrollWidth - E.puzzleMapBoard.clientWidth) / 2);
  E.puzzleMapBoard.scrollTop = Math.max(0, (E.puzzleMapBoard.scrollHeight - E.puzzleMapBoard.clientHeight) / 2);

  text(E.puzzleMapStatus, "Puzzle board centered.");
}

async function centerPuzzleBoard() {
  if (getPuzzleViewMode(currentRoomData || {}) === "focus") {
    await showFullPuzzleBoard();
    return;
  }

  centerPuzzleBoardNow();
}

function renderPuzzleBoard(room) {
  if (!E.puzzleMapBoard) {
    return;
  }

  ensurePuzzleMapPolishStyles();

  const tiles = getPuzzleTiles(room || {});
  const activeTile = getActivePuzzleTile(room || {});
  const viewMode = getPuzzleViewMode(room || {});

  E.puzzleMapBoard.innerHTML = "";

  if (tiles.length === 0) {
    E.puzzleMapBoard.classList.add("hidden");

    if (E.battleMapViewer) {
      E.battleMapViewer.classList.remove("hidden");
    }

    return;
  }

  if (viewMode === "focus" && activeTile) {
    E.puzzleMapBoard.classList.add("hidden");

    if (E.battleMapViewer) {
      E.battleMapViewer.classList.remove("hidden");
    }

    showSharedMap(puzzleTileToCurrentMap(activeTile));

    if (currentIsDM) {
      text(E.puzzleMapStatus, "Focused on tile " + activeTile.key + ". Press Center Board to return.");
    }

    return;
  }

  if (E.battleMapViewer) {
    E.battleMapViewer.classList.add("hidden");
  }

  E.puzzleMapBoard.classList.remove("hidden");

  const minX = Math.min(...tiles.map(function (tile) { return tile.x; }));
  const maxX = Math.max(...tiles.map(function (tile) { return tile.x; }));
  const minY = Math.min(...tiles.map(function (tile) { return tile.y; }));
  const maxY = Math.max(...tiles.map(function (tile) { return tile.y; }));

  const columns = maxX - minX + 1;

  E.puzzleMapBoard.style.gridTemplateColumns = "repeat(" + columns + ", minmax(280px, 420px))";
  E.puzzleMapBoard.style.alignItems = "start";
  E.puzzleMapBoard.style.justifyContent = "center";

  const tileByPosition = new Map();

  tiles.forEach(function (tile) {
    tileByPosition.set(makeTileKey(tile.x, tile.y), tile);
  });

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const positionKey = makeTileKey(x, y);
      const tile = tileByPosition.get(positionKey);

      if (!tile) {
        const emptyTile = document.createElement("div");
        emptyTile.className = "map-tile";
        emptyTile.style.height = "280px";
        emptyTile.style.border = "0";
        emptyTile.style.opacity = "0.18";
        emptyTile.style.background = "#08080c";

        E.puzzleMapBoard.appendChild(emptyTile);
        continue;
      }

      const tileDiv = document.createElement("div");
      tileDiv.className = "map-tile";
      tileDiv.style.position = "relative";
      tileDiv.style.height = "280px";
      tileDiv.style.cursor = currentIsDM ? "pointer" : "default";
      tileDiv.style.border = "0";
      tileDiv.style.borderRadius = "0";
      tileDiv.style.overflow = "hidden";
      tileDiv.style.outline = "none";
      tileDiv.style.boxShadow = "none";

      const img = document.createElement("img");
      img.src = tile.url;
      img.alt = tile.name || "Puzzle map tile";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      img.style.display = "block";

      tileDiv.appendChild(img);

      if (currentIsDM) {
        tileDiv.addEventListener("click", function () {
          focusPuzzleTile(tile.key);
        });

        const actions = document.createElement("div");
        actions.style.position = "absolute";
        actions.style.top = "6px";
        actions.style.right = "6px";
        actions.style.display = "flex";
        actions.style.gap = "4px";
        actions.style.opacity = "0.85";

        const focusButton = document.createElement("button");
        focusButton.textContent = "Focus";
        focusButton.style.padding = "5px 7px";
        focusButton.style.fontSize = "12px";
        focusButton.style.margin = "0";
        focusButton.addEventListener("click", function (event) {
          event.stopPropagation();
          focusPuzzleTile(tile.key);
        });

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "X";
        deleteButton.style.padding = "5px 7px";
        deleteButton.style.fontSize = "12px";
        deleteButton.style.margin = "0";
        deleteButton.addEventListener("click", function (event) {
          event.stopPropagation();
          deletePuzzleTile(tile.key);
        });

        actions.appendChild(focusButton);
        actions.appendChild(deleteButton);
        tileDiv.appendChild(actions);
      }

      E.puzzleMapBoard.appendChild(tileDiv);
    }
  }
}

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
    centerPuzzleBoard();
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
