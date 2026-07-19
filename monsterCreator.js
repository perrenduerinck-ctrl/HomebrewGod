const MONSTER_SIZES = [
  "Tiny",
  "Small",
  "Medium",
  "Large",
  "Huge",
  "Gargantuan"
];

const MONSTER_TYPES = [
  "Beast",
  "Humanoid",
  "Undead",
  "Fiend",
  "Celestial",
  "Dragon",
  "Giant",
  "Monstrosity",
  "Construct",
  "Elemental",
  "Fey",
  "Ooze",
  "Plant",
  "Aberration"
];

const DEFAULT_MONSTER = {
  name: "",
  size: "Medium",
  type: "Beast",
  alignment: "Unaligned",
  ac: 10,
  hp: 1,
  speed: "30 ft.",
  cr: "0",
  abilities: {
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10
  },
  notes: ""
};

function getElement(id) {
  return document.getElementById(id);
}

function setElementText(element, value) {
  if (element) {
    element.textContent = value;
  }
}

function normalizeText(value, fallback = "") {
  const text = String(value == null ? "" : value).trim();
  return text || fallback;
}

function normalizeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeChoice(value, choices, fallback) {
  const requested = normalizeText(value).toLowerCase();
  return choices.find(function (choice) {
    return choice.toLowerCase() === requested;
  }) || fallback;
}

function timestampToMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value.seconds === "number") return value.seconds * 1000;

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function timestampToJson(value) {
  const millis = timestampToMillis(value);
  return millis ? new Date(millis).toISOString() : null;
}

function makeJsonFileName(name) {
  const safeName = normalizeText(name, "monster")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return (safeName || "monster") + ".json";
}

function ensureStyles() {
  if (document.getElementById("monsterCreatorPhaseOneStyles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "monsterCreatorPhaseOneStyles";
  style.textContent = `
    #monsterCreatorScreen .monster-field {
      display: grid;
      gap: 5px;
      margin: 0 0 10px;
      color: #cbd5e1;
      font-size: 12px;
      font-weight: 700;
    }

    #monsterCreatorScreen .monster-field > input,
    #monsterCreatorScreen .monster-field > select,
    #monsterCreatorScreen .monster-field > textarea {
      width: 100%;
      box-sizing: border-box;
    }

    #monsterCreatorScreen .statMiniGrid .monster-field {
      min-width: 0;
      margin: 0;
    }

    #monsterCreatorScreen .monster-library-item {
      width: 100%;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 6px 12px;
      align-items: center;
      margin: 0 0 7px;
      padding: 9px 10px;
      border: 1px solid rgba(96, 165, 250, 0.28);
      border-radius: 6px;
      color: #e5e7eb;
      background: #111827;
      text-align: left;
      cursor: pointer;
    }

    #monsterCreatorScreen .monster-library-item:hover,
    #monsterCreatorScreen .monster-library-item.is-selected {
      border-color: #60a5fa;
      background: #172033;
    }

    #monsterCreatorScreen .monster-library-name {
      min-width: 0;
      overflow-wrap: anywhere;
      font-weight: 800;
    }

    #monsterCreatorScreen .monster-library-meta {
      color: #a7f3d0;
      font-size: 12px;
      white-space: nowrap;
    }

    #monsterCreatorScreen #deleteMonsterButton {
      border-color: rgba(248, 113, 113, 0.55);
      color: #fecaca;
    }

    #monsterCreatorScreen [disabled] {
      cursor: not-allowed;
      opacity: 0.58;
    }
  `;
  document.head.appendChild(style);
}

function ensureButton(actionBar, id, label, afterElement) {
  let button = getElement(id);

  if (button || !actionBar) {
    return button;
  }

  button = document.createElement("button");
  button.id = id;
  button.type = "button";
  button.textContent = label;

  if (afterElement && afterElement.parentNode === actionBar) {
    afterElement.insertAdjacentElement("afterend", button);
  } else {
    actionBar.appendChild(button);
  }

  return button;
}

function ensureSelect(existingControl, id, choices, fallback) {
  let select = existingControl;
  const previousValue = existingControl ? existingControl.value : "";

  if (!select || select.tagName !== "SELECT") {
    select = document.createElement("select");
    select.id = id;

    if (existingControl && existingControl.parentNode) {
      existingControl.replaceWith(select);
    }
  }

  select.innerHTML = "";

  choices.forEach(function (choice) {
    const option = document.createElement("option");
    option.value = choice;
    option.textContent = choice;
    select.appendChild(option);
  });

  select.value = normalizeChoice(previousValue, choices, fallback);
  return select;
}

function ensureLabeledControl(control, labelText) {
  if (!control || control.closest(".monster-field")) {
    return;
  }

  const label = document.createElement("label");
  label.className = "monster-field";
  const caption = document.createElement("span");
  caption.textContent = labelText;

  control.parentNode.insertBefore(label, control);
  label.appendChild(caption);
  label.appendChild(control);
}

function ensureMonsterCreatorUi() {
  const screen = getElement("monsterCreatorScreen");

  if (!screen) {
    return null;
  }

  ensureStyles();

  const actionBar = screen.querySelector(".creatorActionBar");
  const saveButton = getElement("saveMonsterButton");
  const duplicateButton = ensureButton(
    actionBar,
    "duplicateMonsterButton",
    "Duplicate Monster",
    saveButton
  );
  const deleteButton = ensureButton(
    actionBar,
    "deleteMonsterButton",
    "Delete Monster",
    duplicateButton
  );

  const basicsPanel = getElement("monsterNameInput")
    ? getElement("monsterNameInput").closest(".toolPanelMini")
    : null;
  const type = ensureSelect(
    getElement("monsterTypeInput"),
    "monsterTypeInput",
    MONSTER_TYPES,
    DEFAULT_MONSTER.type
  );

  let alignment = getElement("monsterAlignmentInput");
  if (!alignment && basicsPanel) {
    alignment = document.createElement("input");
    alignment.id = "monsterAlignmentInput";
    alignment.type = "text";
    alignment.placeholder = "Alignment";
    basicsPanel.appendChild(alignment);
  }

  const imageInput = getElement("monsterImageUploadInput");
  if (imageInput) {
    imageInput.hidden = true;
  }

  const notes = getElement("monsterNotesInput");
  if (notes) {
    notes.placeholder = "Short description, traits, attacks, reactions, and notes...";
    const panelHeading = notes.closest(".toolPanelMini")?.querySelector("h3");
    if (panelHeading) panelHeading.textContent = "Description / Notes";
  }

  const elements = {
    screen,
    status: getElement("monsterCreatorStatus"),
    library: getElement("monsterLibraryList"),
    newButton: getElement("newMonsterButton"),
    saveButton,
    duplicateButton,
    deleteButton,
    copyButton: getElement("copyMonsterJsonButton"),
    exportButton: getElement("exportMonsterJsonButton"),
    importInput: getElement("importMonsterJsonInput"),
    backButton: getElement("backFromMonsterCreatorButton"),
    name: getElement("monsterNameInput"),
    size: getElement("monsterSizeSelect"),
    type,
    alignment,
    ac: getElement("monsterAcInput"),
    hp: getElement("monsterHpInput"),
    speed: getElement("monsterSpeedInput"),
    cr: getElement("monsterCrInput"),
    str: getElement("monsterStrInput"),
    dex: getElement("monsterDexInput"),
    con: getElement("monsterConInput"),
    int: getElement("monsterIntInput"),
    wis: getElement("monsterWisInput"),
    cha: getElement("monsterChaInput"),
    notes
  };

  elements.size = ensureSelect(
    elements.size,
    "monsterSizeSelect",
    MONSTER_SIZES,
    DEFAULT_MONSTER.size
  );

  [
    [elements.name, "Monster Name"],
    [elements.size, "Size"],
    [elements.type, "Type"],
    [elements.alignment, "Alignment"],
    [elements.ac, "Armor Class"],
    [elements.hp, "Hit Points"],
    [elements.speed, "Speed"],
    [elements.cr, "Challenge Rating"],
    [elements.str, "Strength"],
    [elements.dex, "Dexterity"],
    [elements.con, "Constitution"],
    [elements.int, "Intelligence"],
    [elements.wis, "Wisdom"],
    [elements.cha, "Charisma"],
    [elements.notes, "Short Description / Notes"]
  ].forEach(function (entry) {
    ensureLabeledControl(entry[0], entry[1]);
  });

  return elements;
}

export function createMonsterCreator(config) {
  const elements = ensureMonsterCreatorUi();

  if (!elements) {
    console.warn("Monster Creator screen was not found.");
    return {
      destroy: function () {},
      refresh: function () {}
    };
  }

  let selectedMonsterId = null;
  let monsters = [];
  let stopListening = null;
  let listeningRoomCode = null;
  let isBusy = false;
  const removeDomListeners = [];

  function getRoomCode() {
    return normalizeText(config.getCurrentRoomCode && config.getCurrentRoomCode());
  }

  function getRoomData() {
    return config.getCurrentRoomData ? config.getCurrentRoomData() || {} : {};
  }

  function canEdit() {
    return Boolean(config.getCurrentIsDM && config.getCurrentIsDM());
  }

  function setStatus(message) {
    setElementText(elements.status, message);
  }

  function addDomListener(element, eventName, handler) {
    if (!element) return;
    element.addEventListener(eventName, handler);
    removeDomListeners.push(function () {
      element.removeEventListener(eventName, handler);
    });
  }

  function getEditableControls() {
    return [
      elements.name,
      elements.size,
      elements.type,
      elements.alignment,
      elements.ac,
      elements.hp,
      elements.speed,
      elements.cr,
      elements.str,
      elements.dex,
      elements.con,
      elements.int,
      elements.wis,
      elements.cha,
      elements.notes
    ].filter(Boolean);
  }

  function syncPermissionState() {
    const editable = canEdit();

    getEditableControls().forEach(function (control) {
      control.disabled = !editable || isBusy;
    });

    if (elements.newButton) elements.newButton.disabled = !editable || isBusy;
    if (elements.saveButton) elements.saveButton.disabled = !editable || isBusy;
    if (elements.duplicateButton) {
      elements.duplicateButton.disabled = !editable || isBusy || !selectedMonsterId;
    }
    if (elements.deleteButton) {
      elements.deleteButton.disabled = !editable || isBusy || !selectedMonsterId;
    }
    if (elements.importInput) elements.importInput.disabled = !editable || isBusy;
  }

  function setBusy(busy) {
    isBusy = busy;
    syncPermissionState();
  }

  function readMonsterForm() {
    return {
      name: normalizeText(elements.name && elements.name.value),
      size: normalizeChoice(
        elements.size && elements.size.value,
        MONSTER_SIZES,
        DEFAULT_MONSTER.size
      ),
      type: normalizeChoice(
        elements.type && elements.type.value,
        MONSTER_TYPES,
        DEFAULT_MONSTER.type
      ),
      alignment: normalizeText(
        elements.alignment && elements.alignment.value,
        DEFAULT_MONSTER.alignment
      ),
      ac: normalizeNumber(elements.ac && elements.ac.value, DEFAULT_MONSTER.ac),
      hp: normalizeNumber(elements.hp && elements.hp.value, DEFAULT_MONSTER.hp),
      speed: normalizeText(
        elements.speed && elements.speed.value,
        DEFAULT_MONSTER.speed
      ),
      cr: normalizeText(elements.cr && elements.cr.value, DEFAULT_MONSTER.cr),
      abilities: {
        str: normalizeNumber(elements.str && elements.str.value, 10),
        dex: normalizeNumber(elements.dex && elements.dex.value, 10),
        con: normalizeNumber(elements.con && elements.con.value, 10),
        int: normalizeNumber(elements.int && elements.int.value, 10),
        wis: normalizeNumber(elements.wis && elements.wis.value, 10),
        cha: normalizeNumber(elements.cha && elements.cha.value, 10)
      },
      notes: normalizeText(elements.notes && elements.notes.value)
    };
  }

  function writeValue(element, value) {
    if (element) element.value = value == null ? "" : String(value);
  }

  function loadMonsterIntoForm(monster, selectDocument = true) {
    const source = monster || DEFAULT_MONSTER;
    const abilities = source.abilities || {};

    if (selectDocument) {
      selectedMonsterId = source.id || null;
    }

    writeValue(elements.name, source.name || "");
    writeValue(
      elements.size,
      normalizeChoice(source.size, MONSTER_SIZES, DEFAULT_MONSTER.size)
    );
    writeValue(
      elements.type,
      normalizeChoice(source.type, MONSTER_TYPES, DEFAULT_MONSTER.type)
    );
    writeValue(elements.alignment, source.alignment || DEFAULT_MONSTER.alignment);
    writeValue(elements.ac, normalizeNumber(source.ac, DEFAULT_MONSTER.ac));
    writeValue(elements.hp, normalizeNumber(source.hp, DEFAULT_MONSTER.hp));
    writeValue(elements.speed, source.speed || DEFAULT_MONSTER.speed);
    writeValue(elements.cr, source.cr || DEFAULT_MONSTER.cr);
    writeValue(elements.str, normalizeNumber(abilities.str, 10));
    writeValue(elements.dex, normalizeNumber(abilities.dex, 10));
    writeValue(elements.con, normalizeNumber(abilities.con, 10));
    writeValue(elements.int, normalizeNumber(abilities.int, 10));
    writeValue(elements.wis, normalizeNumber(abilities.wis, 10));
    writeValue(elements.cha, normalizeNumber(abilities.cha, 10));
    writeValue(elements.notes, source.notes || "");

    syncPermissionState();
    renderMonsterList();
  }

  function newMonster() {
    selectedMonsterId = null;
    loadMonsterIntoForm(DEFAULT_MONSTER, false);
    setStatus(canEdit() ? "New monster ready." : "Select a saved monster to view it.");
  }

  function getSelectedMonster() {
    return monsters.find(function (monster) {
      return monster.id === selectedMonsterId;
    }) || null;
  }

  function buildMonsterDocument(existingMonster) {
    const roomCode = getRoomCode();
    const roomData = getRoomData();
    const formMonster = readMonsterForm();

    return {
      roomCode,
      ownerUid: existingMonster?.ownerUid || roomData.dmUid || "",
      ownerName: existingMonster?.ownerName || roomData.dmName || "Unnamed DM",
      name: formMonster.name,
      size: formMonster.size,
      type: formMonster.type,
      alignment: formMonster.alignment,
      ac: formMonster.ac,
      hp: formMonster.hp,
      speed: formMonster.speed,
      cr: formMonster.cr,
      abilities: formMonster.abilities,
      notes: formMonster.notes
    };
  }

  async function createMonsterDocument(monsterData) {
    const roomCode = getRoomCode();

    if (!roomCode) {
      throw new Error("Open a room before saving a monster.");
    }

    const createdRef = await config.addDoc(
      config.collection(config.db, "rooms", roomCode, "monsters"),
      {
        ...monsterData,
        id: null,
        createdAt: config.serverTimestamp(),
        updatedAt: config.serverTimestamp()
      }
    );

    await config.updateDoc(createdRef, {
      id: createdRef.id,
      updatedAt: config.serverTimestamp()
    });

    selectedMonsterId = createdRef.id;
    return createdRef.id;
  }

  async function saveMonster() {
    if (!canEdit()) {
      setStatus("Only the room DM can save monsters.");
      return;
    }

    const formMonster = readMonsterForm();

    if (!formMonster.name) {
      setStatus("Enter a monster name before saving.");
      if (elements.name) elements.name.focus();
      return;
    }

    setBusy(true);

    try {
      const existingMonster = getSelectedMonster();
      const monsterData = buildMonsterDocument(existingMonster);

      if (selectedMonsterId) {
        await config.updateDoc(
          config.doc(
            config.db,
            "rooms",
            getRoomCode(),
            "monsters",
            selectedMonsterId
          ),
          {
            ...monsterData,
            id: selectedMonsterId,
            updatedAt: config.serverTimestamp()
          }
        );
        setStatus("Monster updated.");
      } else {
        await createMonsterDocument(monsterData);
        setStatus("Monster saved.");
      }
    } catch (error) {
      console.error("Could not save monster:", error);
      setStatus("Monster could not be saved: " + error.message);
    } finally {
      setBusy(false);
    }
  }

  async function duplicateMonster() {
    if (!canEdit()) {
      setStatus("Only the room DM can duplicate monsters.");
      return;
    }

    if (!selectedMonsterId) {
      setStatus("Select a saved monster to duplicate.");
      return;
    }

    setBusy(true);

    try {
      const monsterData = buildMonsterDocument(getSelectedMonster());
      monsterData.name = normalizeText(monsterData.name, "Monster") + " Copy";
      await createMonsterDocument(monsterData);
      setStatus("Monster duplicated.");
    } catch (error) {
      console.error("Could not duplicate monster:", error);
      setStatus("Monster could not be duplicated: " + error.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteMonster() {
    if (!canEdit()) {
      setStatus("Only the room DM can delete monsters.");
      return;
    }

    const monster = getSelectedMonster();

    if (!monster || !selectedMonsterId) {
      setStatus("Select a saved monster to delete.");
      return;
    }

    if (!confirm("Delete " + (monster.name || "this monster") + "?")) {
      return;
    }

    setBusy(true);

    try {
      await config.deleteDoc(
        config.doc(
          config.db,
          "rooms",
          getRoomCode(),
          "monsters",
          selectedMonsterId
        )
      );
      selectedMonsterId = null;
      loadMonsterIntoForm(DEFAULT_MONSTER, false);
      setStatus("Monster deleted.");
    } catch (error) {
      console.error("Could not delete monster:", error);
      setStatus("Monster could not be deleted: " + error.message);
    } finally {
      setBusy(false);
    }
  }

  function getExportData() {
    const selected = getSelectedMonster();
    const form = readMonsterForm();
    const roomData = getRoomData();

    return {
      id: selected ? selected.id : null,
      roomCode: getRoomCode(),
      ownerUid: selected?.ownerUid || roomData.dmUid || null,
      ownerName: selected?.ownerName || roomData.dmName || null,
      ...form,
      createdAt: selected ? timestampToJson(selected.createdAt) : null,
      updatedAt: selected ? timestampToJson(selected.updatedAt) : null
    };
  }

  async function copyMonsterJson() {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(getExportData(), null, 2)
      );
      setStatus("Monster JSON copied.");
    } catch (error) {
      console.error("Could not copy monster JSON:", error);
      setStatus("Monster JSON could not be copied.");
    }
  }

  function exportMonsterJson() {
    const exportData = getExportData();
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json"
    });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = makeJsonFileName(exportData.name);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
    setStatus("Monster JSON exported.");
  }

  async function importMonsterJson(event) {
    const file = event.target.files && event.target.files[0];

    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      const imported = parsed && parsed.monster ? parsed.monster : parsed;

      if (!imported || typeof imported !== "object") {
        throw new Error("The JSON file does not contain a monster object.");
      }

      selectedMonsterId = null;
      loadMonsterIntoForm({
        ...DEFAULT_MONSTER,
        ...imported,
        id: null,
        abilities: {
          ...DEFAULT_MONSTER.abilities,
          ...(imported.abilities || {})
        }
      }, false);
      setStatus("Monster JSON imported. Save to create a new monster.");
    } catch (error) {
      console.error("Could not import monster JSON:", error);
      setStatus("Monster JSON could not be imported: " + error.message);
    } finally {
      event.target.value = "";
    }
  }

  function renderMonsterList() {
    if (!elements.library) return;

    elements.library.innerHTML = "";

    if (monsters.length === 0) {
      elements.library.textContent = "No saved monsters yet.";
      return;
    }

    monsters.forEach(function (monster) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "monster-library-item";
      button.classList.toggle("is-selected", monster.id === selectedMonsterId);
      button.setAttribute(
        "aria-pressed",
        monster.id === selectedMonsterId ? "true" : "false"
      );

      const name = document.createElement("span");
      name.className = "monster-library-name";
      name.textContent = monster.name || "Unnamed Monster";

      const meta = document.createElement("span");
      meta.className = "monster-library-meta";
      meta.textContent =
        (monster.size || "Medium") +
        " " +
        (monster.type || "Monster") +
        " / CR " +
        (monster.cr || "0");

      button.appendChild(name);
      button.appendChild(meta);
      button.addEventListener("click", function () {
        loadMonsterIntoForm(monster, true);
        setStatus(
          canEdit()
            ? "Loaded " + (monster.name || "monster") + "."
            : "Viewing " + (monster.name || "monster") + "."
        );
      });
      elements.library.appendChild(button);
    });
  }

  function subscribeToRoomMonsters() {
    const roomCode = getRoomCode();

    if (stopListening) {
      stopListening();
      stopListening = null;
    }

    listeningRoomCode = roomCode;
    monsters = [];
    renderMonsterList();

    if (!roomCode) {
      setStatus("Open a room before using Monster Creator.");
      syncPermissionState();
      return;
    }

    setStatus("Loading saved monsters...");
    stopListening = config.onSnapshot(
      config.collection(config.db, "rooms", roomCode, "monsters"),
      function (snapshot) {
        if (getRoomCode() !== roomCode) return;

        monsters = snapshot.docs.map(function (monsterDoc) {
          return {
            ...monsterDoc.data(),
            id: monsterDoc.id
          };
        });

        monsters.sort(function (left, right) {
          const nameCompare = normalizeText(left.name).localeCompare(
            normalizeText(right.name)
          );

          if (nameCompare !== 0) return nameCompare;
          return timestampToMillis(right.updatedAt) - timestampToMillis(left.updatedAt);
        });

        if (
          selectedMonsterId &&
          !monsters.some(function (monster) {
            return monster.id === selectedMonsterId;
          })
        ) {
          selectedMonsterId = null;
        }

        renderMonsterList();
        syncPermissionState();
        setStatus(
          canEdit()
            ? "Monster Creator ready."
            : "Viewing saved monsters. Only the room DM can edit."
        );
      },
      function (error) {
        console.error("Could not load saved monsters:", error);
        setStatus("Saved monsters could not be loaded: " + error.message);
      }
    );
  }

  function backToBattleMap() {
    if (typeof config.onBack === "function") {
      config.onBack();
      return;
    }

    const battleUrl = new URL(window.location.href);
    battleUrl.searchParams.set("view", "battle");
    window.location.assign(battleUrl.toString());
  }

  addDomListener(elements.newButton, "click", newMonster);
  addDomListener(elements.saveButton, "click", saveMonster);
  addDomListener(elements.duplicateButton, "click", duplicateMonster);
  addDomListener(elements.deleteButton, "click", deleteMonster);
  addDomListener(elements.copyButton, "click", copyMonsterJson);
  addDomListener(elements.exportButton, "click", exportMonsterJson);
  addDomListener(elements.importInput, "change", importMonsterJson);
  addDomListener(elements.backButton, "click", backToBattleMap);

  newMonster();
  subscribeToRoomMonsters();

  return {
    destroy: function () {
      if (stopListening) stopListening();
      stopListening = null;
      removeDomListeners.forEach(function (removeListener) {
        removeListener();
      });
    },
    refresh: function () {
      if (listeningRoomCode !== getRoomCode()) {
        subscribeToRoomMonsters();
      } else {
        syncPermissionState();
        renderMonsterList();
      }
    },
    newMonster,
    saveMonster,
    duplicateMonster,
    deleteMonster,
    exportMonsterJson
  };
}
