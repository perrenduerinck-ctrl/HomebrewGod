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
// APP SECTION 3 — PAGE ELEMENTS
// =====================================================

const authScreen = document.getElementById("authScreen");
const lobbyScreen = document.getElementById("lobbyScreen");
const roomDashboardScreen = document.getElementById("roomDashboardScreen");
const battleMapScreen = document.getElementById("battleMapScreen");

const guestNameInput = document.getElementById("guestNameInput");
const guestButton = document.getElementById("guestButton");

const signupNameInput = document.getElementById("signupNameInput");
const signupEmailInput = document.getElementById("signupEmailInput");
const signupPasswordInput = document.getElementById("signupPasswordInput");
const signupButton = document.getElementById("signupButton");

const loginEmailInput = document.getElementById("loginEmailInput");
const loginPasswordInput = document.getElementById("loginPasswordInput");
const loginButton = document.getElementById("loginButton");

const logoutButton = document.getElementById("logoutButton");

const userNameText = document.getElementById("userNameText");
const userTypeText = document.getElementById("userTypeText");
const userIdText = document.getElementById("userIdText");

const myRoomsList = document.getElementById("myRoomsList");

const roomNameInput = document.getElementById("roomNameInput");
const createRoomButton = document.getElementById("createRoomButton");

const joinRoomCodeInput = document.getElementById("joinRoomCodeInput");
const joinRoomButton = document.getElementById("joinRoomButton");
const roomStatusText = document.getElementById("roomStatusText");

const backToLobbyButton = document.getElementById("backToLobbyButton");
const openBattleMapButton = document.getElementById("openBattleMapButton");

const currentRoomNameText = document.getElementById("currentRoomNameText");
const roomCodeText = document.getElementById("roomCodeText");
const copyRoomCodeButton = document.getElementById("copyRoomCodeButton");
const saveThisRoomButton = document.getElementById("saveThisRoomButton");
const yourRoleText = document.getElementById("yourRoleText");
const playersList = document.getElementById("playersList");

const dmMapControls = document.getElementById("dmMapControls");
const roomMapUploadInput = document.getElementById("roomMapUploadInput");
const uploadRoomMapButton = document.getElementById("uploadRoomMapButton");
const removeRoomMapButton = document.getElementById("removeRoomMapButton");
const saveCurrentMapButton = document.getElementById("saveCurrentMapButton");
const mapUploadStatus = document.getElementById("mapUploadStatus");

const roomMapsList = document.getElementById("roomMapsList");

const currentMapNameText = document.getElementById("currentMapNameText");
const roomMapPreviewImage = document.getElementById("roomMapPreviewImage");
const noRoomMapPreviewText = document.getElementById("noRoomMapPreviewText");

const backToRoomButton = document.getElementById("backToRoomButton");
const zoomOutButton = document.getElementById("zoomOutButton");
const zoomResetButton = document.getElementById("zoomResetButton");
const zoomInButton = document.getElementById("zoomInButton");

const battleRoomNameText = document.getElementById("battleRoomNameText");
const battleRoomCodeText = document.getElementById("battleRoomCodeText");
const battleMapNameText = document.getElementById("battleMapNameText");
const battleZoomText = document.getElementById("battleZoomText");
const battleMapImage = document.getElementById("battleMapImage");
const noBattleMapText = document.getElementById("noBattleMapText");


// =====================================================
// APP SECTION 4 — APP STATE
// =====================================================

let currentUser = null;
let currentRoomCode = null;
let currentRoomData = null;
let currentIsDM = false;
let currentMapId = null;
let latestMapsSnapshot = null;
let latestPlayersSnapshot = null;
let battleZoom = 1;

let stopListeningToMyRooms = null;
let stopListeningToRoom = null;
let stopListeningToPlayers = null;
let stopListeningToMaps = null;

let heartbeatTimer = null;
let heartbeatRoomCode = null;
let playersRerenderTimer = null;

const HEARTBEAT_EVERY_MS = 5000;
const ONLINE_TIMEOUT_MS = 20000;
const PLAYER_LIST_RERENDER_MS = 5000;

const startupParams = new URLSearchParams(window.location.search);
const startupRoomCode = startupParams.get("room");
const startupView = startupParams.get("view");
let alreadyUsedStartupLink = false;


// =====================================================
// APP SECTION 5 — SCREEN / HELPER FUNCTIONS
// =====================================================

function showScreen(screenName) {
  authScreen.classList.add("hidden");
  lobbyScreen.classList.add("hidden");
  roomDashboardScreen.classList.add("hidden");
  battleMapScreen.classList.add("hidden");

  if (screenName === "auth") {
    authScreen.classList.remove("hidden");
  }

  if (screenName === "lobby") {
    lobbyScreen.classList.remove("hidden");
  }

  if (screenName === "room") {
    roomDashboardScreen.classList.remove("hidden");
  }

  if (screenName === "battle") {
    battleMapScreen.classList.remove("hidden");
  }
}

function normalizeRoomCode(code) {
  return String(code || "").trim().toUpperCase();
}

function makeRoomCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const numbers = "23456789";

  let partOne = "";
  let partTwo = "";

  for (let i = 0; i < 3; i++) {
    partOne += letters[Math.floor(Math.random() * letters.length)];
  }

  for (let i = 0; i < 3; i++) {
    partTwo += numbers[Math.floor(Math.random() * numbers.length)];
  }

  return partOne + "-" + partTwo;
}

function clearRoomListeners() {
  if (stopListeningToRoom) {
    stopListeningToRoom();
    stopListeningToRoom = null;
  }

  if (stopListeningToPlayers) {
    stopListeningToPlayers();
    stopListeningToPlayers = null;
  }

  if (stopListeningToMaps) {
    stopListeningToMaps();
    stopListeningToMaps = null;
  }

  latestPlayersSnapshot = null;
}

function getTimestampMillis(value) {
  if (!value) {
    return 0;
  }

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (typeof value.seconds === "number") {
    return value.seconds * 1000;
  }

  if (typeof value === "number") {
    return value;
  }

  return 0;
}

function isPlayerOnline(player) {
  const lastSeenMillis = getTimestampMillis(player.lastSeen);

  if (!lastSeenMillis) {
    return false;
  }

  return Date.now() - lastSeenMillis <= ONLINE_TIMEOUT_MS;
}

function buildMapFromRoomFields(room) {
  if (room.currentMap && room.currentMap.url) {
    return room.currentMap;
  }

  if (room.currentMapUrl) {
    return {
      id: room.currentMapId || null,
      name: room.currentMapName || "Current Map",
      url: room.currentMapUrl,
      publicId: room.currentMapPublicId || null
    };
  }

  return null;
}


// =====================================================
// APP SECTION 6 — AUTH / LOGIN SYSTEM
// =====================================================

async function saveUserDoc(user) {
  const userRef = doc(db, "users", user.uid);

  await setDoc(userRef, {
    uid: user.uid,
    displayName: user.displayName || "Unnamed",
    email: user.email || null,
    isAnonymous: user.isAnonymous,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

function showLoggedOut() {
  showScreen("auth");

  if (stopListeningToMyRooms) {
    stopListeningToMyRooms();
    stopListeningToMyRooms = null;
  }

  stopHeartbeat();
  stopPlayersRerenderTimer();
  clearRoomListeners();

  currentUser = null;
  currentRoomCode = null;
  currentRoomData = null;
  currentIsDM = false;
  currentMapId = null;
  latestMapsSnapshot = null;
}

function showLoggedIn(user) {
  userNameText.textContent = user.displayName || "Unnamed";
  userTypeText.textContent = user.isAnonymous ? "Guest" : "Account";
  userIdText.textContent = user.uid;

  showScreen("lobby");
}

guestButton.addEventListener("click", async function () {
  try {
    const name = guestNameInput.value.trim() || "Guest";

    const result = await signInAnonymously(auth);
    await updateProfile(result.user, { displayName: name });
    await saveUserDoc(result.user);
  } catch (error) {
    alert(error.message);
  }
});

signupButton.addEventListener("click", async function () {
  try {
    const name = signupNameInput.value.trim();
    const email = signupEmailInput.value.trim();
    const password = signupPasswordInput.value;

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

loginButton.addEventListener("click", async function () {
  try {
    const email = loginEmailInput.value.trim();
    const password = loginPasswordInput.value;

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

logoutButton.addEventListener("click", async function () {
  await signOut(auth);
});


// =====================================================
// APP SECTION 7 — MY SAVED ROOMS
// =====================================================

async function saveRoomToMyRooms(roomCode, roomName, role) {
  if (!currentUser) {
    return;
  }

  const cleanCode = normalizeRoomCode(roomCode);
  const myRoomRef = doc(db, "users", currentUser.uid, "rooms", cleanCode);

  await setDoc(myRoomRef, {
    roomCode: cleanCode,
    roomName: roomName || "Unnamed Room",
    role: role || "player",
    updatedAt: serverTimestamp()
  }, { merge: true });
}

function listenToMyRooms() {
  if (!currentUser) {
    return;
  }

  if (stopListeningToMyRooms) {
    stopListeningToMyRooms();
  }

  const myRoomsRef = collection(db, "users", currentUser.uid, "rooms");

  stopListeningToMyRooms = onSnapshot(myRoomsRef, function (roomsSnap) {
    myRoomsList.innerHTML = "";

    if (roomsSnap.empty) {
      myRoomsList.textContent = "No saved rooms yet. Create or join a room and it will appear here.";
      return;
    }

    roomsSnap.forEach(function (roomDoc) {
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
      openButton.addEventListener("click", function () {
        openRoom(roomCode, "room");
      });

      const removeButton = document.createElement("button");
      removeButton.textContent = "Remove From My List";
      removeButton.addEventListener("click", async function () {
        const yesRemove = confirm("Remove this room from your saved list? The room itself will still exist.");

        if (!yesRemove) {
          return;
        }

        const myRoomRef = doc(db, "users", currentUser.uid, "rooms", roomCode);
        await deleteDoc(myRoomRef);
      });

      div.appendChild(title);
      div.appendChild(role);
      div.appendChild(openButton);
      div.appendChild(removeButton);

      myRoomsList.appendChild(div);
    });
  }, function (error) {
    myRoomsList.textContent = "Could not load saved rooms: " + error.message;
  });
}


// =====================================================
// APP SECTION 8 — ROOM CREATE / JOIN / OPEN
// =====================================================

async function createRoom() {
  const roomName = roomNameInput.value.trim() || "Unnamed Room";
  const roomCode = makeRoomCode();

  const roomRef = doc(db, "rooms", roomCode);

  await setDoc(roomRef, {
    roomCode: roomCode,
    roomName: roomName,
    dmUid: currentUser.uid,
    dmName: currentUser.displayName || "Unnamed",
    currentMap: null,
    currentMapUrl: null,
    currentMapName: null,
    currentMapId: null,
    currentMapPublicId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  const playerRef = doc(db, "rooms", roomCode, "players", currentUser.uid);

  await setDoc(playerRef, {
    uid: currentUser.uid,
    displayName: currentUser.displayName || "Unnamed",
    role: "dm",
    joinedAt: serverTimestamp(),
    lastSeen: serverTimestamp()
  }, { merge: true });

  await saveRoomToMyRooms(roomCode, roomName, "dm");

  openRoom(roomCode, "room");

  roomStatusText.textContent = "Room created and saved to My Saved Rooms.";
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

  let finalRole = wantedRole || "player";

  if (roomData.dmUid === currentUser.uid) {
    finalRole = "dm";
  }

  const playerRef = doc(db, "rooms", cleanCode, "players", currentUser.uid);

  await setDoc(playerRef, {
    uid: currentUser.uid,
    displayName: currentUser.displayName || "Unnamed",
    role: finalRole,
    joinedAt: serverTimestamp(),
    lastSeen: serverTimestamp()
  }, { merge: true });

  await saveRoomToMyRooms(cleanCode, roomData.roomName || "Unnamed Room", finalRole);

  openRoom(cleanCode, screenToShow);
}

function openRoom(roomCode, screenToShow = "room") {
  const cleanCode = normalizeRoomCode(roomCode);

  currentRoomCode = cleanCode;
  latestMapsSnapshot = null;
  latestPlayersSnapshot = null;

  stopHeartbeat();
  stopPlayersRerenderTimer();
  clearRoomListeners();

  const roomRef = doc(db, "rooms", cleanCode);

  stopListeningToRoom = onSnapshot(roomRef, function (roomSnap) {
    if (!roomSnap.exists()) {
      alert("This room was deleted or does not exist.");
      leaveCurrentRoomView();
      return;
    }

    const room = roomSnap.data();

    currentRoomData = room;
    currentIsDM = room.dmUid === currentUser.uid;

    currentRoomNameText.textContent = room.roomName || "Unnamed Room";
    roomCodeText.textContent = cleanCode;

    battleRoomNameText.textContent = room.roomName || "Unnamed Room";
    battleRoomCodeText.textContent = cleanCode;

    if (currentIsDM) {
      yourRoleText.textContent = "DM";
      dmMapControls.classList.remove("hidden");
    } else {
      yourRoleText.textContent = "Player";
      dmMapControls.classList.add("hidden");
    }

    startHeartbeat(cleanCode);
    showSharedMap(buildMapFromRoomFields(room));

    if (latestMapsSnapshot) {
      renderRoomMaps(latestMapsSnapshot);
    }

    if (latestPlayersSnapshot) {
      renderPlayers(latestPlayersSnapshot);
    }
  }, function (error) {
    alert("Room listener failed: " + error.message);
  });

  listenToPlayers(cleanCode);
  listenToRoomMaps(cleanCode);
  startPlayersRerenderTimer();

  if (screenToShow === "battle") {
    showScreen("battle");
    applyBattleZoom();
  } else {
    showScreen("room");
  }
}

function leaveCurrentRoomView() {
  stopHeartbeat();
  stopPlayersRerenderTimer();
  clearRoomListeners();

  currentRoomCode = null;
  currentRoomData = null;
  currentIsDM = false;
  currentMapId = null;
  latestMapsSnapshot = null;
  latestPlayersSnapshot = null;

  dmMapControls.classList.add("hidden");
  mapUploadStatus.textContent = "";

  showScreen("lobby");
}

createRoomButton.addEventListener("click", async function () {
  try {
    await createRoom();
  } catch (error) {
    alert(error.message);
  }
});

joinRoomButton.addEventListener("click", async function () {
  try {
    const roomCode = joinRoomCodeInput.value;

    if (!roomCode.trim()) {
      alert("Enter a room code.");
      return;
    }

    await joinRoom(roomCode, "player", "room");

    roomStatusText.textContent = "Room joined and saved to My Saved Rooms.";
  } catch (error) {
    alert(error.message);
  }
});

backToLobbyButton.addEventListener("click", function () {
  leaveCurrentRoomView();
});

copyRoomCodeButton.addEventListener("click", async function () {
  if (!currentRoomCode) {
    return;
  }

  await navigator.clipboard.writeText(currentRoomCode);
  alert("Room code copied.");
});

saveThisRoomButton.addEventListener("click", async function () {
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
// APP SECTION 9 — HEARTBEAT PRESENCE / PLAYERS LIST
// =====================================================

async function updatePlayerHeartbeat() {
  if (!currentUser || !currentRoomCode) {
    return;
  }

  const playerRef = doc(db, "rooms", currentRoomCode, "players", currentUser.uid);

  await setDoc(playerRef, {
    uid: currentUser.uid,
    displayName: currentUser.displayName || "Unnamed",
    role: currentIsDM ? "dm" : "player",
    lastSeen: serverTimestamp()
  }, { merge: true });
}

function startHeartbeat(roomCode) {
  if (!currentUser || !roomCode) {
    return;
  }

  if (heartbeatTimer && heartbeatRoomCode === roomCode) {
    return;
  }

  stopHeartbeat();

  heartbeatRoomCode = roomCode;

  updatePlayerHeartbeat().catch(function (error) {
    console.warn("Heartbeat failed:", error);
  });

  heartbeatTimer = setInterval(function () {
    updatePlayerHeartbeat().catch(function (error) {
      console.warn("Heartbeat failed:", error);
    });
  }, HEARTBEAT_EVERY_MS);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  heartbeatRoomCode = null;
}

function startPlayersRerenderTimer() {
  stopPlayersRerenderTimer();

  playersRerenderTimer = setInterval(function () {
    if (latestPlayersSnapshot) {
      renderPlayers(latestPlayersSnapshot);
    }
  }, PLAYER_LIST_RERENDER_MS);
}

function stopPlayersRerenderTimer() {
  if (playersRerenderTimer) {
    clearInterval(playersRerenderTimer);
    playersRerenderTimer = null;
  }
}

function listenToPlayers(roomCode) {
  const playersRef = collection(db, "rooms", roomCode, "players");

  stopListeningToPlayers = onSnapshot(playersRef, function (playersSnap) {
    latestPlayersSnapshot = playersSnap;
    renderPlayers(playersSnap);
  }, function (error) {
    playersList.textContent = "Could not load players: " + error.message;
  });
}

function renderPlayers(playersSnap) {
  playersList.innerHTML = "";

  if (playersSnap.empty) {
    playersList.textContent = "No players yet.";
    return;
  }

  const players = [];

  playersSnap.forEach(function (playerDoc) {
    players.push(playerDoc.data());
  });

  players.sort(function (a, b) {
    if (a.role === "dm" && b.role !== "dm") {
      return -1;
    }

    if (a.role !== "dm" && b.role === "dm") {
      return 1;
    }

    return String(a.displayName || "").localeCompare(String(b.displayName || ""));
  });

  players.forEach(function (player) {
    const online = isPlayerOnline(player);
    const lastSeenMillis = getTimestampMillis(player.lastSeen);

    const div = document.createElement("div");
    div.className = "row";

    const title = document.createElement("div");
    title.className = "row-title";
    title.textContent = (player.displayName || "Unnamed") + " — " + (player.role || "player").toUpperCase();

    const status = document.createElement("div");
    status.className = "small";

    if (online) {
      status.textContent = "🟢 Online";
    } else if (lastSeenMillis) {
      status.textContent = "⚫ Offline — last seen " + new Date(lastSeenMillis).toLocaleTimeString();
    } else {
      status.textContent = "⚫ Offline — no heartbeat yet";
    }

    div.appendChild(title);
    div.appendChild(status);

    playersList.appendChild(div);
  });
}


// =====================================================
// APP SECTION 10 — CLOUDINARY MAP UPLOAD
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
// APP SECTION 11 — ROOM MAP LIBRARY
// =====================================================

function listenToRoomMaps(roomCode) {
  const mapsRef = collection(db, "rooms", roomCode, "maps");

  stopListeningToMaps = onSnapshot(mapsRef, function (mapsSnap) {
    latestMapsSnapshot = mapsSnap;
    renderRoomMaps(mapsSnap);
  }, function (error) {
    roomMapsList.textContent = "Could not load saved maps: " + error.message;
  });
}

function renderRoomMaps(mapsSnap) {
  roomMapsList.innerHTML = "";

  if (mapsSnap.empty) {
    roomMapsList.textContent = "No saved maps in this room yet. Upload a new map as DM.";
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

    roomMapsList.appendChild(div);
  });
}

async function saveMapToRoomLibrary(mapData) {
  if (!currentRoomCode || !currentIsDM) {
    alert("Only the DM can save maps.");
    return null;
  }

  const mapsRef = collection(db, "rooms", currentRoomCode, "maps");

  const mapDocRef = await addDoc(mapsRef, {
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
      updatedAt: serverTimestamp()
    });

    return;
  }

  await updateDoc(roomRef, {
    currentMap: {
      id: mapData.id || null,
      name: mapData.name || "Unnamed Map",
      url: mapData.url,
      publicId: mapData.publicId || null
    },
    currentMapUrl: mapData.url,
    currentMapName: mapData.name || "Unnamed Map",
    currentMapId: mapData.id || null,
    currentMapPublicId: mapData.publicId || null,
    updatedAt: serverTimestamp()
  });
}

async function useSavedMap(mapId) {
  try {
    if (!currentRoomCode || !currentIsDM) {
      alert("Only the DM can change maps.");
      return;
    }

    const mapRef = doc(db, "rooms", currentRoomCode, "maps", mapId);
    const mapSnap = await getDoc(mapRef);

    if (!mapSnap.exists()) {
      alert("Map not found.");
      return;
    }

    const map = mapSnap.data();

    await setCurrentRoomMap({
      id: mapId,
      name: map.name || "Unnamed Map",
      url: map.url,
      publicId: map.publicId || null
    });

    mapUploadStatus.textContent = "Map switched.";
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

    const yesForget = confirm("Forget this map from the room list? This does not delete it from Cloudinary.");

    if (!yesForget) {
      return;
    }

    const mapRef = doc(db, "rooms", currentRoomCode, "maps", mapId);

    await deleteDoc(mapRef);

    if (currentMapId === mapId) {
      await setCurrentRoomMap(null);
    }
  } catch (error) {
    alert(error.message);
  }
}


// =====================================================
// APP SECTION 12 — CURRENT MAP DISPLAY
// =====================================================

function showSharedMap(currentMap) {
  if (!currentMap || !currentMap.url) {
    currentMapId = null;

    currentMapNameText.textContent = "None";
    battleMapNameText.textContent = "None";

    roomMapPreviewImage.src = "";
    roomMapPreviewImage.style.display = "none";
    noRoomMapPreviewText.style.display = "block";

    battleMapImage.src = "";
    battleMapImage.style.display = "none";
    noBattleMapText.style.display = "block";

    return;
  }

  currentMapId = currentMap.id || null;

  currentMapNameText.textContent = currentMap.name || "Unnamed Map";
  battleMapNameText.textContent = currentMap.name || "Unnamed Map";

  roomMapPreviewImage.src = currentMap.url;
  roomMapPreviewImage.style.display = "block";
  noRoomMapPreviewText.style.display = "none";

  battleMapImage.src = currentMap.url;
  battleMapImage.style.display = "block";
  noBattleMapText.style.display = "none";

  applyBattleZoom();
}

uploadRoomMapButton.addEventListener("click", async function () {
  try {
    if (!currentRoomCode) {
      alert("Create or join a room first.");
      return;
    }

    if (!currentIsDM) {
      alert("Only the DM can upload the room map.");
      return;
    }

    const file = roomMapUploadInput.files[0];

    if (!file) {
      alert("Choose a map image first.");
      return;
    }

    mapUploadStatus.textContent = "Uploading map...";
    uploadRoomMapButton.disabled = true;

    const cloudinaryResult = await uploadMapToCloudinary(file);

    const newMap = {
      name: file.name,
      url: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id
    };

    const mapId = await saveMapToRoomLibrary(newMap);

    await setCurrentRoomMap({
      id: mapId,
      name: newMap.name,
      url: newMap.url,
      publicId: newMap.publicId
    });

    mapUploadStatus.textContent = "Map uploaded, saved to this room, and shared.";
    roomMapUploadInput.value = "";
  } catch (error) {
    mapUploadStatus.textContent = "Upload failed.";
    alert(error.message);
  } finally {
    uploadRoomMapButton.disabled = false;
  }
});

removeRoomMapButton.addEventListener("click", async function () {
  try {
    if (!currentRoomCode) {
      return;
    }

    if (!currentIsDM) {
      alert("Only the DM can remove the room map.");
      return;
    }

    const yesRemove = confirm("Remove the current shared map? It will stay in Saved Maps if it was saved there.");

    if (!yesRemove) {
      return;
    }

    await setCurrentRoomMap(null);

    mapUploadStatus.textContent = "Current map removed.";
  } catch (error) {
    alert(error.message);
  }
});

saveCurrentMapButton.addEventListener("click", async function () {
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

    if (currentMap.id) {
      alert("This current map is already saved in the room library.");
      return;
    }

    const mapId = await saveMapToRoomLibrary({
      name: currentMap.name || "Recovered Current Map",
      url: currentMap.url,
      publicId: currentMap.publicId || null
    });

    await setCurrentRoomMap({
      id: mapId,
      name: currentMap.name || "Recovered Current Map",
      url: currentMap.url,
      publicId: currentMap.publicId || null
    });

    mapUploadStatus.textContent = "Current map saved to room library.";
  } catch (error) {
    alert(error.message);
  }
});


// =====================================================
// APP SECTION 13 — BATTLE MAP SCREEN / NEW TAB
// =====================================================

function applyBattleZoom() {
  battleMapImage.style.transform = "scale(" + battleZoom + ")";
  battleZoomText.textContent = Math.round(battleZoom * 100) + "%";
}

openBattleMapButton.addEventListener("click", function () {
  if (!currentRoomCode) {
    alert("Open a room first.");
    return;
  }

  const battleUrl = new URL(window.location.href);

  battleUrl.searchParams.set("room", currentRoomCode);
  battleUrl.searchParams.set("view", "battle");

  window.open(battleUrl.toString(), "_blank");
});

backToRoomButton.addEventListener("click", function () {
  showScreen("room");
});

zoomOutButton.addEventListener("click", function () {
  battleZoom -= 0.25;

  if (battleZoom < 0.25) {
    battleZoom = 0.25;
  }

  applyBattleZoom();
});

zoomResetButton.addEventListener("click", function () {
  battleZoom = 1;
  applyBattleZoom();
});

zoomInButton.addEventListener("click", function () {
  battleZoom += 0.25;

  if (battleZoom > 4) {
    battleZoom = 4;
  }

  applyBattleZoom();
});

window.addEventListener("beforeunload", function () {
  stopHeartbeat();
});


// =====================================================
// APP SECTION 14 — STARTUP / AUTH WATCHER
// =====================================================

onAuthStateChanged(auth, async function (user) {
  currentUser = user;

  if (!user) {
    showLoggedOut();
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
