// =====================================================
// CHARACTER CREATOR.JS — HOMEBREW GOD CHARACTER CREATOR
// Handles character sheets, JSON import/export, saving later,
// custom classes later, and token linking later.
// =====================================================

export function createCharacterCreator(options) {
  const deps = {
    db: options.db,
    doc: options.doc,
    collection: options.collection,
    addDoc: options.addDoc,
    updateDoc: options.updateDoc,
    deleteDoc: options.deleteDoc,
    onSnapshot: options.onSnapshot,
    serverTimestamp: options.serverTimestamp,

    getCurrentRoomCode: options.getCurrentRoomCode,
    getCurrentRoomData: options.getCurrentRoomData,
    getCurrentIsDM: options.getCurrentIsDM
  };

  const $ = (id) => document.getElementById(id);

  const C = {
    screen: null,

    backButton: null,

    newButton: null,
    saveButton: null,
    copyJsonButton: null,
    exportJsonButton: null,
    importJsonInput: null,

    nameInput: null,
    raceInput: null,
    classInput: null,
    levelInput: null,
    imageInput: null,

    acInput: null,
    maxHpInput: null,
    currentHpInput: null,
    speedInput: null,

    strInput: null,
    dexInput: null,
    conInput: null,
    intInput: null,
    wisInput: null,
    chaInput: null,

    notesInput: null,
    status: null,
    libraryList: null
  };

  let currentCharacterId = null;
  let characterCache = [];
  let characterUnsubscribe = null;
  let characterRoomCode = null;


// =====================================================
// CHARACTER CREATOR SECTION 1 — DOM / STATUS
// =====================================================

  function refreshElements() {
    C.screen = $("characterCreatorScreen");

    C.backButton = $("backFromCharacterCreatorButton");

    C.newButton = $("newCharacterButton");
    C.saveButton = $("saveCharacterButton");
    C.copyJsonButton = $("copyCharacterJsonButton");
    C.exportJsonButton = $("exportCharacterJsonButton");
    C.importJsonInput = $("importCharacterJsonInput");

    C.nameInput = $("characterNameInput");
    C.raceInput = $("characterRaceInput");
    C.classInput = $("characterClassInput");
    C.levelInput = $("characterLevelInput");
    C.imageInput = $("characterImageUploadInput");

    C.acInput = $("characterAcInput");
    C.maxHpInput = $("characterMaxHpInput");
    C.currentHpInput = $("characterCurrentHpInput");
    C.speedInput = $("characterSpeedInput");

    C.strInput = $("characterStrInput");
    C.dexInput = $("characterDexInput");
    C.conInput = $("characterConInput");
    C.intInput = $("characterIntInput");
    C.wisInput = $("characterWisInput");
    C.chaInput = $("characterChaInput");

    C.notesInput = $("characterNotesInput");
    C.status = $("characterCreatorStatus");
    C.libraryList = $("characterLibraryList");
  }

  function setStatus(message) {
    refreshElements();

    if (C.status) {
      C.status.textContent = message || "";
    }
  }


// =====================================================
// CHARACTER CREATOR SECTION 2 — FORM DATA
// =====================================================

  function getNumberValue(input, fallback) {
    if (!input) {
      return fallback;
    }

    const value = Number(input.value);

    if (!Number.isFinite(value)) {
      return fallback;
    }

    return value;
  }

  function getTextValue(input, fallback) {
    if (!input) {
      return fallback || "";
    }

    const value = input.value.trim();

    if (!value) {
      return fallback || "";
    }

    return value;
  }

  function getCharacterFromForm() {
    refreshElements();

    const maxHp = getNumberValue(C.maxHpInput, 1);

    return {
      id: currentCharacterId,

      name: getTextValue(C.nameInput, "Unnamed Character"),
      race: getTextValue(C.raceInput, ""),
      className: getTextValue(C.classInput, ""),
      level: getNumberValue(C.levelInput, 1),

      armorClass: getNumberValue(C.acInput, 10),
      maxHp: maxHp,
      currentHp: getNumberValue(C.currentHpInput, maxHp),
      speed: getTextValue(C.speedInput, "30 ft."),

      stats: {
        str: getNumberValue(C.strInput, 10),
        dex: getNumberValue(C.dexInput, 10),
        con: getNumberValue(C.conInput, 10),
        int: getNumberValue(C.intInput, 10),
        wis: getNumberValue(C.wisInput, 10),
        cha: getNumberValue(C.chaInput, 10)
      },

      notes: getTextValue(C.notesInput, ""),

      sheetType: "character",
      version: 1,
      updatedAtMillis: Date.now()
    };
  }

  function setFormFromCharacter(character) {
    refreshElements();

    const data = character || {};
    const stats = data.stats || {};

    currentCharacterId = data.id || null;

    if (C.nameInput) C.nameInput.value = data.name || "";
    if (C.raceInput) C.raceInput.value = data.race || "";
    if (C.classInput) C.classInput.value = data.className || "";
    if (C.levelInput) C.levelInput.value = data.level || 1;

    if (C.acInput) C.acInput.value = data.armorClass || 10;
    if (C.maxHpInput) C.maxHpInput.value = data.maxHp || 1;
    if (C.currentHpInput) C.currentHpInput.value = data.currentHp || data.maxHp || 1;
    if (C.speedInput) C.speedInput.value = data.speed || "30 ft.";

    if (C.strInput) C.strInput.value = stats.str || 10;
    if (C.dexInput) C.dexInput.value = stats.dex || 10;
    if (C.conInput) C.conInput.value = stats.con || 10;
    if (C.intInput) C.intInput.value = stats.int || 10;
    if (C.wisInput) C.wisInput.value = stats.wis || 10;
    if (C.chaInput) C.chaInput.value = stats.cha || 10;

    if (C.notesInput) C.notesInput.value = data.notes || "";
  }

  function newCharacter() {
    currentCharacterId = null;

    setFormFromCharacter({
      name: "",
      race: "",
      className: "",
      level: 1,

      armorClass: 10,
      maxHp: 1,
      currentHp: 1,
      speed: "30 ft.",

      stats: {
        str: 10,
        dex: 10,
        con: 10,
        int: 10,
        wis: 10,
        cha: 10
      },

      notes: ""
    });

    setStatus("New character started.");
  }


// =====================================================
// CHARACTER CREATOR SECTION 3 — JSON IMPORT / EXPORT
// =====================================================

  async function copyCharacterJson() {
    try {
      const data = getCharacterFromForm();
      const json = JSON.stringify(data, null, 2);

      await navigator.clipboard.writeText(json);

      setStatus("Character JSON copied.");
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  function exportCharacterJson() {
    try {
      const data = getCharacterFromForm();
      const json = JSON.stringify(data, null, 2);

      const blob = new Blob([json], {
        type: "application/json"
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = makeSafeFileName(data.name || "character") + ".json";
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);

      setStatus("Character JSON exported.");
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  async function importCharacterJson(file) {
    if (!file) {
      return;
    }

    const text = await file.text();
    const data = JSON.parse(text);

    setFormFromCharacter(data);
    setStatus("Character JSON imported.");
  }

  function makeSafeFileName(name) {
    return String(name || "character")
      .trim()
      .replace(/[^a-z0-9_-]/gi, "_")
      .replace(/_+/g, "_")
      .slice(0, 60);
  }


// =====================================================
// CHARACTER CREATOR SECTION 4 — SAVE PLACEHOLDER
// =====================================================

  async function saveCharacter() {
    const roomCode = deps.getCurrentRoomCode ? deps.getCurrentRoomCode() : null;

    if (!roomCode) {
      alert("Open a room first.");
      return;
    }

    setStatus("Character saving comes next. JSON export already works.");
    alert("Character saving comes next. This file is connected and ready.");
  }


// =====================================================
// CHARACTER CREATOR SECTION 5 — BUTTON CONNECTIONS
// =====================================================

  function connectButtons() {
    refreshElements();

    if (C.newButton && C.newButton.dataset.creatorConnected !== "yes") {
      C.newButton.dataset.creatorConnected = "yes";
      C.newButton.addEventListener("click", newCharacter);
    }

    if (C.saveButton && C.saveButton.dataset.creatorConnected !== "yes") {
      C.saveButton.dataset.creatorConnected = "yes";
      C.saveButton.addEventListener("click", saveCharacter);
    }

    if (C.copyJsonButton && C.copyJsonButton.dataset.creatorConnected !== "yes") {
      C.copyJsonButton.dataset.creatorConnected = "yes";
      C.copyJsonButton.addEventListener("click", copyCharacterJson);
    }

    if (C.exportJsonButton && C.exportJsonButton.dataset.creatorConnected !== "yes") {
      C.exportJsonButton.dataset.creatorConnected = "yes";
      C.exportJsonButton.addEventListener("click", exportCharacterJson);
    }

    if (C.importJsonInput && C.importJsonInput.dataset.creatorConnected !== "yes") {
      C.importJsonInput.dataset.creatorConnected = "yes";

      C.importJsonInput.addEventListener("change", async function () {
        try {
          await importCharacterJson(C.importJsonInput.files[0]);
        } catch (error) {
          console.error(error);
          alert(error.message);
        } finally {
          C.importJsonInput.value = "";
        }
      });
    }
  }


// =====================================================
// CHARACTER CREATOR SECTION 6 — INIT / PUBLIC API
// =====================================================

  function init() {
    refreshElements();
    connectButtons();

    window.HomebrewGodCharacterCreator = api;

    setStatus("Character creator connected.");
  }

  const api = {
    init,
    newCharacter,
    getCharacterFromForm,
    setFormFromCharacter,
    saveCharacter,
    copyCharacterJson,
    exportCharacterJson,
    importCharacterJson
  };

  init();

  return api;
}
