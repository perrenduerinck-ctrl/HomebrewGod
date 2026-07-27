const MONSTER_SIZES = [
  "Tiny",
  "Small",
  "Medium",
  "Large",
  "Huge",
  "Gargantuan"
];

const MONSTER_TYPES = [
  "Aberration",
  "Beast",
  "Celestial",
  "Construct",
  "Dragon",
  "Elemental",
  "Fey",
  "Fiend",
  "Giant",
  "Humanoid",
  "Monstrosity",
  "Ooze",
  "Plant",
  "Undead"
];

const NAMED_ENTRY_FIELDS = [
  "traits",
  "actions",
  "bonusActions",
  "reactions",
  "legendaryActions",
  "lairActions"
];

const LIST_FIELDS = [
  "senses",
  "savingThrows",
  "skills",
  "damageImmunities",
  "damageResistances",
  "damageVulnerabilities",
  "conditionImmunities"
];

export const DEFAULT_MONSTER = {
  name: "",
  size: "Medium",
  type: "Beast",
  alignment: "Unaligned",
  imageUrl: "",
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
  traits: [],
  actions: [],
  bonusActions: [],
  reactions: [],
  legendaryActions: [],
  lairActions: [],
  senses: [],
  savingThrows: [],
  skills: [],
  damageImmunities: [],
  damageResistances: [],
  damageVulnerabilities: [],
  conditionImmunities: [],
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

function normalizeStringList(value) {
  const entries = Array.isArray(value)
    ? value
    : String(value == null ? "" : value).split(/\r?\n/);

  return entries
    .map(function (entry) {
      if (entry && typeof entry === "object") {
        return normalizeText(entry.name || entry.value || entry.label);
      }

      return normalizeText(entry);
    })
    .filter(Boolean);
}

function parseNamedEntry(value) {
  if (value && typeof value === "object") {
    const name = normalizeText(value.name || value.title);
    const description = normalizeText(
      value.description ||
      value.text ||
      value.details
    );

    if (!name && !description) {
      return null;
    }

    return {
      name: name || "Feature",
      description
    };
  }

  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  const separatorIndex = text.indexOf("|");

  if (separatorIndex < 0) {
    return {
      name: text,
      description: ""
    };
  }

  return {
    name: normalizeText(text.slice(0, separatorIndex), "Feature"),
    description: normalizeText(text.slice(separatorIndex + 1))
  };
}

export function parseMonsterNamedEntries(value) {
  const entries = Array.isArray(value)
    ? value
    : String(value == null ? "" : value).split(/\r?\n/);

  return entries
    .map(parseNamedEntry)
    .filter(Boolean);
}

function formatNamedEntries(entries) {
  return parseMonsterNamedEntries(entries)
    .map(function (entry) {
      return entry.description
        ? entry.name + " | " + entry.description
        : entry.name;
    })
    .join("\n");
}

function formatStringList(entries) {
  return normalizeStringList(entries).join("\n");
}

export function normalizeMonsterRecord(rawMonster) {
  const source =
    rawMonster && typeof rawMonster === "object"
      ? rawMonster
      : {};

  const abilities =
    source.abilities &&
    typeof source.abilities === "object"
      ? source.abilities
      : {};

  const normalized = {
    ...DEFAULT_MONSTER,
    name: normalizeText(source.name),
    size: normalizeChoice(
      source.size,
      MONSTER_SIZES,
      DEFAULT_MONSTER.size
    ),
    type: normalizeChoice(
      source.type,
      MONSTER_TYPES,
      DEFAULT_MONSTER.type
    ),
    alignment: normalizeText(
      source.alignment,
      DEFAULT_MONSTER.alignment
    ),
    imageUrl: normalizeText(
      source.imageUrl ||
      source.image?.url
    ),
    ac: Math.max(
      0,
      Math.round(
        normalizeNumber(
          source.ac,
          DEFAULT_MONSTER.ac
        )
      )
    ),
    hp: Math.max(
      1,
      Math.round(
        normalizeNumber(
          source.hp,
          DEFAULT_MONSTER.hp
        )
      )
    ),
    speed: normalizeText(
      source.speed,
      DEFAULT_MONSTER.speed
    ),
    cr: normalizeText(
      source.cr,
      DEFAULT_MONSTER.cr
    ),
    abilities: {
      str: normalizeNumber(abilities.str, 10),
      dex: normalizeNumber(abilities.dex, 10),
      con: normalizeNumber(abilities.con, 10),
      int: normalizeNumber(abilities.int, 10),
      wis: normalizeNumber(abilities.wis, 10),
      cha: normalizeNumber(abilities.cha, 10)
    },
    notes: normalizeText(source.notes)
  };

  NAMED_ENTRY_FIELDS.forEach(function (field) {
    normalized[field] =
      parseMonsterNamedEntries(source[field]);
  });

  LIST_FIELDS.forEach(function (field) {
    normalized[field] =
      normalizeStringList(source[field]);
  });

  [
    "id",
    "roomCode",
    "ownerUid",
    "ownerName",
    "createdAt",
    "updatedAt"
  ].forEach(function (field) {
    if (source[field] != null) {
      normalized[field] = source[field];
    }
  });

  return normalized;
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
  if (document.getElementById("monsterCreatorPhaseSeventeenStyles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "monsterCreatorPhaseSeventeenStyles";
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
    #monsterCreatorScreen .monster-field > textarea,
    #monsterCreatorScreen .creatorWidePanel > textarea {
      width: 100%;
      box-sizing: border-box;
    }

    #monsterCreatorScreen .creatorWidePanel > textarea {
      min-height: 82px;
      margin: 0 0 10px;
      resize: vertical;
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

  const elements = {
    screen,
    status: getElement("monsterCreatorStatus"),
    library: getElement("monsterLibraryList"),
    newButton: getElement("newMonsterButton"),
    saveButton,
    duplicateButton,
    deleteButton,
    tokenButton: getElement("createMonsterTokenButton"),
    copyButton: getElement("copyMonsterJsonButton"),
    exportButton: getElement("exportMonsterJsonButton"),
    importInput: getElement("importMonsterJsonInput"),
    backButton: getElement("backFromMonsterCreatorButton"),
    name: getElement("monsterNameInput"),
    size: getElement("monsterSizeSelect"),
    type,
    alignment,
    imageUrl: getElement("monsterImageUrlInput"),
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
    traits: getElement("monsterTraitsInput"),
    actions: getElement("monsterActionsInput"),
    bonusActions: getElement("monsterBonusActionsInput"),
    reactions: getElement("monsterReactionsInput"),
    legendaryActions: getElement("monsterLegendaryActionsInput"),
    lairActions: getElement("monsterLairActionsInput"),
    senses: getElement("monsterSensesInput"),
    savingThrows: getElement("monsterSavingThrowsInput"),
    skills: getElement("monsterSkillsInput"),
    damageImmunities: getElement("monsterDamageImmunitiesInput"),
    damageResistances: getElement("monsterDamageResistancesInput"),
    damageVulnerabilities: getElement("monsterDamageVulnerabilitiesInput"),
    conditionImmunities: getElement("monsterConditionImmunitiesInput"),
    notes: getElement("monsterNotesInput")
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
    [elements.imageUrl, "Token Image URL (optional)"],
    [elements.ac, "Armor Class"],
    [elements.hp, "Hit Points"],
    [elements.speed, "Speed"],
    [elements.cr, "Challenge Rating"],
    [elements.str, "Strength"],
    [elements.dex, "Dexterity"],
    [elements.con, "Constitution"],
    [elements.int, "Intelligence"],
    [elements.wis, "Wisdom"],
    [elements.cha, "Charisma"]
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
    return normalizeText(
      config.getCurrentRoomCode &&
      config.getCurrentRoomCode()
    );
  }

  function getRoomData() {
    return config.getCurrentRoomData
      ? config.getCurrentRoomData() || {}
      : {};
  }

  function canEdit() {
    return Boolean(
      config.getCurrentIsDM &&
      config.getCurrentIsDM()
    );
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
      elements.imageUrl,
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
      elements.traits,
      elements.actions,
      elements.bonusActions,
      elements.reactions,
      elements.legendaryActions,
      elements.lairActions,
      elements.senses,
      elements.savingThrows,
      elements.skills,
      elements.damageImmunities,
      elements.damageResistances,
      elements.damageVulnerabilities,
      elements.conditionImmunities,
      elements.notes
    ].filter(Boolean);
  }

  function syncPermissionState() {
    const editable = canEdit();

    getEditableControls().forEach(function (control) {
      control.disabled = !editable || isBusy;
    });

    if (elements.newButton) {
      elements.newButton.disabled = !editable || isBusy;
    }

    if (elements.saveButton) {
      elements.saveButton.disabled = !editable || isBusy;
    }

    if (elements.duplicateButton) {
      elements.duplicateButton.disabled =
        !editable ||
        isBusy ||
        !selectedMonsterId;
    }

    if (elements.deleteButton) {
      elements.deleteButton.disabled =
        !editable ||
        isBusy ||
        !selectedMonsterId;
    }

    if (elements.tokenButton) {
      elements.tokenButton.disabled =
        !editable ||
        isBusy ||
        !selectedMonsterId;
    }

    if (elements.importInput) {
      elements.importInput.disabled =
        !editable ||
        isBusy;
    }
  }

  function setBusy(busy) {
    isBusy = busy;
    syncPermissionState();
  }

  function readMonsterForm() {
    const raw = {
      name: elements.name && elements.name.value,
      size: elements.size && elements.size.value,
      type: elements.type && elements.type.value,
      alignment: elements.alignment && elements.alignment.value,
      imageUrl: elements.imageUrl && elements.imageUrl.value,
      ac: elements.ac && elements.ac.value,
      hp: elements.hp && elements.hp.value,
      speed: elements.speed && elements.speed.value,
      cr: elements.cr && elements.cr.value,
      abilities: {
        str: elements.str && elements.str.value,
        dex: elements.dex && elements.dex.value,
        con: elements.con && elements.con.value,
        int: elements.int && elements.int.value,
        wis: elements.wis && elements.wis.value,
        cha: elements.cha && elements.cha.value
      },
      traits: elements.traits && elements.traits.value,
      actions: elements.actions && elements.actions.value,
      bonusActions: elements.bonusActions && elements.bonusActions.value,
      reactions: elements.reactions && elements.reactions.value,
      legendaryActions:
        elements.legendaryActions &&
        elements.legendaryActions.value,
      lairActions: elements.lairActions && elements.lairActions.value,
      senses: elements.senses && elements.senses.value,
      savingThrows:
        elements.savingThrows &&
        elements.savingThrows.value,
      skills: elements.skills && elements.skills.value,
      damageImmunities:
        elements.damageImmunities &&
        elements.damageImmunities.value,
      damageResistances:
        elements.damageResistances &&
        elements.damageResistances.value,
      damageVulnerabilities:
        elements.damageVulnerabilities &&
        elements.damageVulnerabilities.value,
      conditionImmunities:
        elements.conditionImmunities &&
        elements.conditionImmunities.value,
      notes: elements.notes && elements.notes.value
    };

    return normalizeMonsterRecord(raw);
  }

  function writeValue(element, value) {
    if (element) {
      element.value =
        value == null
          ? ""
          : String(value);
    }
  }

  function loadMonsterIntoForm(monster, selectDocument = true) {
    const source =
      normalizeMonsterRecord(
        monster || DEFAULT_MONSTER
      );

    if (selectDocument) {
      selectedMonsterId =
        normalizeText(source.id) ||
        null;
    }

    writeValue(elements.name, source.name);
    writeValue(elements.size, source.size);
    writeValue(elements.type, source.type);
    writeValue(elements.alignment, source.alignment);
    writeValue(elements.imageUrl, source.imageUrl);
    writeValue(elements.ac, source.ac);
    writeValue(elements.hp, source.hp);
    writeValue(elements.speed, source.speed);
    writeValue(elements.cr, source.cr);
    writeValue(elements.str, source.abilities.str);
    writeValue(elements.dex, source.abilities.dex);
    writeValue(elements.con, source.abilities.con);
    writeValue(elements.int, source.abilities.int);
    writeValue(elements.wis, source.abilities.wis);
    writeValue(elements.cha, source.abilities.cha);

    NAMED_ENTRY_FIELDS.forEach(function (field) {
      writeValue(
        elements[field],
        formatNamedEntries(source[field])
      );
    });

    LIST_FIELDS.forEach(function (field) {
      writeValue(
        elements[field],
        formatStringList(source[field])
      );
    });

    writeValue(elements.notes, source.notes);

    syncPermissionState();
    renderMonsterList();
    return source;
  }

  function newMonster() {
    if (!canEdit()) {
      setStatus(
        "Players can view and export saved monsters, but only the room DM can edit."
      );
      return null;
    }

    selectedMonsterId = null;
    const monster =
      loadMonsterIntoForm(
        DEFAULT_MONSTER,
        false
      );
    setStatus("New monster ready.");
    return monster;
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
      ownerUid:
        existingMonster?.ownerUid ||
        roomData.dmUid ||
        "",
      ownerName:
        existingMonster?.ownerName ||
        roomData.dmName ||
        "Unnamed DM",
      ...formMonster
    };
  }

  async function createMonsterDocument(monsterData) {
    const roomCode = getRoomCode();

    if (!roomCode) {
      throw new Error(
        "Open a room before saving a monster."
      );
    }

    const createdRef =
      await config.addDoc(
        config.collection(
          config.db,
          "rooms",
          roomCode,
          "monsters"
        ),
        {
          ...monsterData,
          id: null,
          createdAt:
            config.serverTimestamp(),
          updatedAt:
            config.serverTimestamp()
        }
      );

    await config.updateDoc(
      createdRef,
      {
        id: createdRef.id,
        updatedAt:
          config.serverTimestamp()
      }
    );

    selectedMonsterId = createdRef.id;
    return createdRef.id;
  }

  async function saveMonster() {
    if (!canEdit()) {
      setStatus(
        "Only the room DM can save monsters."
      );
      return null;
    }

    const formMonster = readMonsterForm();

    if (!formMonster.name) {
      setStatus(
        "Enter a monster name before saving."
      );
      if (elements.name) {
        elements.name.focus();
      }
      return null;
    }

    setBusy(true);

    try {
      const existingMonster =
        getSelectedMonster();
      const monsterData =
        buildMonsterDocument(
          existingMonster
        );

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
            updatedAt:
              config.serverTimestamp()
          }
        );
        setStatus("Monster updated.");
      } else {
        await createMonsterDocument(
          monsterData
        );
        setStatus("Monster saved.");
      }

      return selectedMonsterId;
    } catch (error) {
      console.error(
        "Could not save monster:",
        error
      );
      setStatus(
        "Monster could not be saved: " +
        error.message
      );
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function duplicateMonster() {
    if (!canEdit()) {
      setStatus(
        "Only the room DM can duplicate monsters."
      );
      return null;
    }

    if (!selectedMonsterId) {
      setStatus(
        "Select a saved monster to duplicate."
      );
      return null;
    }

    setBusy(true);

    try {
      const monsterData =
        buildMonsterDocument(
          getSelectedMonster()
        );
      monsterData.name =
        normalizeText(
          monsterData.name,
          "Monster"
        ) + " Copy";

      const duplicatedId =
        await createMonsterDocument(
          monsterData
        );
      setStatus("Monster duplicated.");
      return duplicatedId;
    } catch (error) {
      console.error(
        "Could not duplicate monster:",
        error
      );
      setStatus(
        "Monster could not be duplicated: " +
        error.message
      );
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function deleteMonster(skipConfirmation = false) {
    if (!canEdit()) {
      setStatus(
        "Only the room DM can delete monsters."
      );
      return false;
    }

    const monster = getSelectedMonster();

    if (!monster || !selectedMonsterId) {
      setStatus(
        "Select a saved monster to delete."
      );
      return false;
    }

    const confirmDelete =
      typeof config.confirmDelete === "function"
        ? config.confirmDelete
        : function (message) {
            return window.confirm(message);
          };

    if (
      !skipConfirmation &&
      !confirmDelete(
        "Delete " +
        (monster.name || "this monster") +
        "?"
      )
    ) {
      return false;
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
      loadMonsterIntoForm(
        DEFAULT_MONSTER,
        false
      );
      setStatus("Monster deleted.");
      return true;
    } catch (error) {
      console.error(
        "Could not delete monster:",
        error
      );
      setStatus(
        "Monster could not be deleted: " +
        error.message
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  function getExportData() {
    const selected =
      getSelectedMonster();
    const form =
      readMonsterForm();
    const roomData =
      getRoomData();

    return {
      id:
        selected
          ? selected.id
          : null,
      roomCode: getRoomCode(),
      ownerUid:
        selected?.ownerUid ||
        roomData.dmUid ||
        null,
      ownerName:
        selected?.ownerName ||
        roomData.dmName ||
        null,
      ...form,
      createdAt:
        selected
          ? timestampToJson(
              selected.createdAt
            )
          : null,
      updatedAt:
        selected
          ? timestampToJson(
              selected.updatedAt
            )
          : null
    };
  }

  async function copyMonsterJson() {
    const json =
      JSON.stringify(
        getExportData(),
        null,
        2
      );

    try {
      if (
        typeof config.writeClipboard ===
        "function"
      ) {
        await config.writeClipboard(json);
      } else {
        await navigator.clipboard.writeText(
          json
        );
      }

      setStatus("Monster JSON copied.");
      return json;
    } catch (error) {
      console.error(
        "Could not copy monster JSON:",
        error
      );
      setStatus(
        "Monster JSON could not be copied."
      );
      return null;
    }
  }

  function exportMonsterJson() {
    const exportData = getExportData();
    const json =
      JSON.stringify(
        exportData,
        null,
        2
      );
    const fileName =
      makeJsonFileName(exportData.name);

    if (
      typeof config.downloadJson ===
      "function"
    ) {
      config.downloadJson(
        fileName,
        json
      );
    } else {
      const blob =
        new Blob(
          [json],
          {
            type: "application/json"
          }
        );
      const objectUrl =
        URL.createObjectURL(blob);
      const link =
        document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    }

    setStatus("Monster JSON exported.");

    return {
      fileName,
      json
    };
  }

  function importMonsterData(rawData) {
    if (!canEdit()) {
      setStatus(
        "Only the room DM can import monsters."
      );
      return null;
    }

    const imported =
      rawData &&
      rawData.monster
        ? rawData.monster
        : rawData;

    if (
      !imported ||
      typeof imported !== "object" ||
      Array.isArray(imported)
    ) {
      throw new Error(
        "The JSON file does not contain a monster object."
      );
    }

    selectedMonsterId = null;
    const normalized =
      loadMonsterIntoForm(
        {
          ...imported,
          id: null
        },
        false
      );
    setStatus(
      "Monster JSON imported. Save to create a new monster."
    );
    return normalized;
  }

  async function importMonsterJson(event) {
    const file =
      event.target.files &&
      event.target.files[0];

    if (!file) return null;

    try {
      const parsed =
        JSON.parse(
          await file.text()
        );
      return importMonsterData(parsed);
    } catch (error) {
      console.error(
        "Could not import monster JSON:",
        error
      );
      setStatus(
        "Monster JSON could not be imported: " +
        error.message
      );
      return null;
    } finally {
      event.target.value = "";
    }
  }

  async function createMonsterToken() {
    if (!canEdit()) {
      setStatus(
        "Only the room DM can create monster tokens."
      );
      return null;
    }

    if (!selectedMonsterId) {
      setStatus(
        "Save the monster before creating its token."
      );
      return null;
    }

    if (
      typeof config.createMonsterLinkedToken !==
      "function"
    ) {
      setStatus(
        "The monster token system is not connected."
      );
      return null;
    }

    setBusy(true);

    try {
      const monster = {
        ...buildMonsterDocument(
          getSelectedMonster()
        ),
        id: selectedMonsterId
      };
      const token =
        await config.createMonsterLinkedToken(
          monster
        );
      setStatus(
        monster.name +
        " token created on the active map."
      );
      return token;
    } catch (error) {
      console.error(
        "Could not create monster token:",
        error
      );
      setStatus(
        "Monster token could not be created: " +
        error.message
      );
      return null;
    } finally {
      setBusy(false);
    }
  }

  function renderMonsterList() {
    if (!elements.library) {
      return;
    }

    elements.library.innerHTML = "";

    if (monsters.length === 0) {
      elements.library.textContent =
        "No saved monsters yet.";
      return;
    }

    monsters.forEach(function (monster) {
      const button =
        document.createElement("button");
      button.type = "button";
      button.className =
        "monster-library-item";
      button.classList.toggle(
        "is-selected",
        monster.id === selectedMonsterId
      );
      button.setAttribute(
        "aria-pressed",
        monster.id === selectedMonsterId
          ? "true"
          : "false"
      );

      const name =
        document.createElement("span");
      name.className =
        "monster-library-name";
      name.textContent =
        monster.name ||
        "Unnamed Monster";

      const meta =
        document.createElement("span");
      meta.className =
        "monster-library-meta";
      meta.textContent =
        (monster.size || "Medium") +
        " " +
        (monster.type || "Monster") +
        " / CR " +
        (monster.cr || "0");

      button.appendChild(name);
      button.appendChild(meta);
      button.addEventListener(
        "click",
        function () {
          loadMonsterIntoForm(
            monster,
            true
          );
          setStatus(
            canEdit()
              ? "Loaded " +
                (monster.name || "monster") +
                "."
              : "Viewing " +
                (monster.name || "monster") +
                "."
          );
        }
      );
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
      setStatus(
        "Open a room before using Monster Creator."
      );
      syncPermissionState();
      return;
    }

    setStatus("Loading saved monsters...");
    stopListening =
      config.onSnapshot(
        config.collection(
          config.db,
          "rooms",
          roomCode,
          "monsters"
        ),
        function (snapshot) {
          if (getRoomCode() !== roomCode) {
            return;
          }

          monsters =
            snapshot.docs.map(function (
              monsterDoc
            ) {
              return normalizeMonsterRecord({
                ...monsterDoc.data(),
                id: monsterDoc.id
              });
            });

          monsters.sort(function (
            left,
            right
          ) {
            const nameCompare =
              normalizeText(
                left.name
              ).localeCompare(
                normalizeText(
                  right.name
                )
              );

            if (nameCompare !== 0) {
              return nameCompare;
            }

            return (
              timestampToMillis(
                right.updatedAt
              ) -
              timestampToMillis(
                left.updatedAt
              )
            );
          });

          if (
            selectedMonsterId &&
            !monsters.some(function (
              monster
            ) {
              return (
                monster.id ===
                selectedMonsterId
              );
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
          console.error(
            "Could not load saved monsters:",
            error
          );
          setStatus(
            "Saved monsters could not be loaded: " +
            error.message
          );
        }
      );
  }

  function backToBattleMap() {
    if (
      typeof config.onBack ===
      "function"
    ) {
      config.onBack();
      return;
    }

    const battleUrl =
      new URL(window.location.href);
    battleUrl.searchParams.set(
      "view",
      "battle"
    );
    window.location.assign(
      battleUrl.toString()
    );
  }

  addDomListener(
    elements.newButton,
    "click",
    newMonster
  );
  addDomListener(
    elements.saveButton,
    "click",
    saveMonster
  );
  addDomListener(
    elements.duplicateButton,
    "click",
    duplicateMonster
  );
  addDomListener(
    elements.deleteButton,
    "click",
    deleteMonster
  );
  addDomListener(
    elements.tokenButton,
    "click",
    createMonsterToken
  );
  addDomListener(
    elements.copyButton,
    "click",
    copyMonsterJson
  );
  addDomListener(
    elements.exportButton,
    "click",
    exportMonsterJson
  );
  addDomListener(
    elements.importInput,
    "change",
    importMonsterJson
  );
  addDomListener(
    elements.backButton,
    "click",
    backToBattleMap
  );

  if (canEdit()) {
    selectedMonsterId = null;
    loadMonsterIntoForm(
      DEFAULT_MONSTER,
      false
    );
    setStatus("New monster ready.");
  } else {
    loadMonsterIntoForm(
      DEFAULT_MONSTER,
      false
    );
  }

  subscribeToRoomMonsters();

  return {
    destroy: function () {
      if (stopListening) {
        stopListening();
      }
      stopListening = null;
      removeDomListeners.forEach(
        function (removeListener) {
          removeListener();
        }
      );
    },
    refresh: function () {
      if (
        listeningRoomCode !==
        getRoomCode()
      ) {
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
    createMonsterToken,
    copyMonsterJson,
    exportMonsterJson,
    importMonsterData,
    getExportData,
    loadMonsterIntoForm,
    readMonsterForm,
    getState: function () {
      return {
        selectedMonsterId,
        monsters:
          monsters.map(function (monster) {
            return {
              ...monster
            };
          }),
        canEdit: canEdit(),
        isBusy
      };
    }
  };
}
