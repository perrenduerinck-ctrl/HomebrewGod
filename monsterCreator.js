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
      elements.chÛ_w¶‰žËkºwµçU˜¹¥°(€€€€€€€ÕÁ‘…Ñ•‘Ðè(€€€€€€€€€½¹™¥œ¹Í•ÉÙ•ÉQ¥µ•ÍÑ…µÀ ¤(€€€€€ô(€€€€¤ì((€€€Í•±•Ñ•‘5½¹ÍÑ•É%€ôÉ•…Ñ•‘I•˜¹¥ì(€€€É•ÑÕÉ¸É•…Ñ•‘I•˜¹¥ì(€ô((€…Íå¹Œ™Õ¹Ñ¥½¸Í…Ù•5½¹ÍÑ•È ¤ì(€€€¥˜€ ……¹‘¥Ð ¤¤ì(€€€€€Í•ÑMÑ…ÑÕÌ (€€€€€€€€‰=¹±äÑ¡”É½½´4…¸Í…Ù”µ½¹ÍÑ•ÉÌ¸ˆ(€€€€€€¤ì(€€€€€É•ÑÕÉ¸¹Õ±°ì(€€€ô((€€€½¹ÍÐ™½Éµ5½¹ÍÑ•È€ôÉ•…‘5½¹ÍÑ•É½É´ ¤ì((€€€¥˜€ …™½Éµ5½¹ÍÑ•È¹¹…µ”¤ì(€€€€€Í•ÑMÑ…ÑÕÌ (€€€€€€€€‰¹Ñ•È„µ½¹ÍÑ•È¹…µ”‰•™½É”Í…Ù¥¹œ¸ˆ(€€€€€€¤ì(€€€€€¥˜€¡•±•µ•¹ÑÌ¹¹…µ”¤ì(€€€€€€€•±•µ•¹ÑÌ¹¹…µ”¹™½ÕÌ ¤ì(€€€€€ô(€€€€€É•ÑÕÉ¸¹Õ±°ì(€€€ô((€€€Í•Ñ	ÕÍä¡ÑÉÕ”¤ì((€€€ÑÉäì(€€€€€½¹ÍÐ•á¥ÍÑ¥¹5½¹ÍÑ•È€ô(€€€€€€€•ÑM•±•Ñ•‘5½¹ÍÑ•È ¤ì(€€€€€½¹ÍÐµ½¹ÍÑ•É…Ñ„€ô(€€€€€€€‰Õ¥±‘5½¹ÍÑ•É½Õµ•¹Ð (€€€€€€€€€•á¥ÍÑ¥¹5½¹ÍÑ•È(€€€€€€€€¤ì((€€€€€¥˜€¡Í•±•Ñ•‘5½¹ÍÑ•É%¤ì(€€€€€€€…Ý…¥Ð½¹™¥œ¹ÕÁ‘…Ñ•½Œ (€€€€€€€€€½¹™¥œ¹‘½Œ (€€€€€€€€€€€½¹™¥œ¹‘ˆ°(€€€€€€€€€€€€‰É½½µÌˆ°(€€€€€€€€€€€•ÑI½½µ½‘” ¤°(€€€€€€€€€€€€‰µ½¹ÍÑ•ÉÌˆ°(€€€€€€€€€€€Í•±•Ñ•‘5½¹ÍÑ•É%(€€€€€€€€€€¤°(€€€€€€€€€ì(€€€€€€€€€€€€¸¸¹µ½¹ÍÑ•É…Ñ„°(€€€€€€€€€€€¥èÍ•±•Ñ•‘5½¹ÍÑ•É%°(€€€€€€€€€€€ÕÁ‘…Ñ•‘Ðè(€€€€€€€€€€€€€½¹™¥œ¹Í•ÉÙ•ÉQ¥µ•ÍÑ…µÀ ¤(€€€€€€€€€ô(€€€€€€€€¤ì(€€€€€€€Í•ÑMÑ…ÑÕÌ ‰5½¹ÍÑ•ÈÕÁ‘…Ñ•¸ˆ¤ì(€€€€€ô•±Í”ì(€€€€€€€…Ý…¥ÐÉ•…Ñ•5½¹ÍÑ•É½Õµ•¹Ð (€€€€€€€€€µ½¹ÍÑ•É…Ñ„(€€€€€€€€¤ì(€€€€€€€Í•ÑMÑ…ÑÕÌ ‰5½¹ÍÑ•ÈÍ…Ù•¸ˆ¤ì(€€€€€ô((€€€€€É•ÑÕÉ¸Í•±•Ñ•‘5½¹ÍÑ•É%ì(€€€ô…Ñ €¡•ÉÉ½È¤ì(€€€€€½¹Í½±”¹•ÉÉ½È (€€€€€€€€‰½Õ±¹½ÐÍ…Ù”µ½¹ÍÑ•Èèˆ°(€€€€€€€•ÉÉ½È(€€€€€€¤ì(€€€€€Í•ÑMÑ…ÑÕÌ (€€€€€€€€‰5½¹ÍÑ•È½Õ±¹½Ð‰”Í…Ù•è€ˆ€¬(€€€€€€€•ÉÉ½È¹µ•ÍÍ…”(€€€€€€¤ì(€€€€€É•ÑÕÉ¸¹Õ±°ì(€€€ô™¥¹…±±äì(€€€€€Í•Ñ	ÕÍä¡™…±Í”¤ì(€€€ô(€ô((€…Íå¹Œ™Õ¹Ñ¥½¸‘ÕÁ±¥…Ñ•5½¹ÍÑ•È ¤ì(€€€¥˜€ ……¹‘¥Ð ¤¤ì(€€€€€Í•ÑMÑ…ÑÕÌ (€€€€€€€€‰=¹±äÑ¡”É½½´4…¸‘ÕÁ±¥…Ñ”µ½¹ÍÑ•ÉÌ¸ˆ(€€€€€€¤ì(€€€€€É•ÑÕÉ¸¹Õ±°ì(€€€ô((€€€¥˜€ …Í•±•Ñ•‘5½¹ÍÑ•É%¤ì(€€€€€Í•ÑMÑ…ÑÕÌ (€€€€€€€€‰M•±•Ð„Í…Ù•µ½¹ÍÑ•ÈÑ¼‘ÕÁ±¥…Ñ”¸ˆ(€€€€€€¤ì(€€€€€É•ÑÕÉ¸¹Õ±°ì(€€€ô((€€€Í•Ñ	ÕÍä¡ÑÉÕ”¤ì((€€€ÑÉäì(€€€€€½¹ÍÐµ½¹ÍÑ•É…Ñ„€ô(€€€€€€€‰Õ¥±‘5½¹ÍÑ•É½Õµ•¹Ð (€€€€€€€€€•ÑM•±•Ñ•‘5½¹ÍÑ•È ¤(€€€€€€€€¤ì(€€€€€µ½¹ÍÑ•É…Ñ„¹¹…µ”€ô(€€€€€€€¹½Éµ…±¥é•Q•áÐ (€€€€€€€€€µ½¹ÍÑ•É…Ñ„¹¹…µ”°(€€€€€€€€€€‰5½¹ÍÑ•Èˆ(€€€€€€€€¤€¬€ˆ½Áäˆì((€€€€€½¹ÍÐ‘ÕÁ±¥…Ñ•‘%€ô(€€€€€€€…Ý…¥ÐÉ•…Ñ•5½¹ÍÑ•É½Õµ•¹Ð (€€€€€€€€€µ½¹ÍÑ•É…Ñ„(€€€€€€€€¤ì(€€€€€Í•ÑMÑ…ÑÕÌ ‰5½¹ÍÑ•È‘ÕÁ±¥…Ñ•¸ˆ¤ì(€€€€€É•ÑÕÉ¸‘ÕÁ±¥…Ñ•‘%ì(€€€ô…Ñ €¡•ÉÉ½È¤ì(€€€€€½¹Í½±”¹•ÉÉ½È (€€€€€€€€‰½Õ±¹½Ð‘ÕÁ±¥…Ñ”µ½¹ÍÑ•Èèˆ°(€€€€€€€•ÉÉ½È(€€€€€€¤ì(€€€€€Í•ÑMÑ…ÑÕÌ (€€€€€€€€‰5½¹ÍÑ•È½Õ±¹½Ð‰”‘ÕÁ±¥…Ñ•è€ˆ€¬(€€€€€€€•ÉÉ½È¹µ•ÍÍ…”(€€€€€€¤ì(€€€€€É•ÑÕÉ¸¹Õ±°ì(€€€ô™¥¹…±±äì(€€€€€Í•Ñ	ÕÍä¡™…±Í”¤ì(€€€ô(€ô((€…Íå¹Œ™Õ¹Ñ¥½¸‘•±•Ñ•5½¹ÍÑ•È¡Í­¥Á½¹™¥Éµ…Ñ¥½¸€ô™…±Í”¤ì(€€€¥˜€ ……¹‘¥Ð ¤¤ì(€€€€€Í•ÑMÑ…ÑÕÌ (€€€€€€€€‰=¹±äÑ¡”É½½´4…¸‘•±•Ñ”µ½¹ÍÑ•ÉÌ¸ˆ(€€€€€€¤ì(€€€€€É•ÑÕÉ¸™…±Í”ì(€€€ô((€€€½¹ÍÐµ½¹ÍÑ•È€ô•ÑM•±•Ñ•‘5½¹ÍÑ•È ¤ì((€€€¥˜€ …µ½¹ÍÑ•Èñð€…Í•±•Ñ•‘5½¹ÍÑ•É%¤ì(€€€€€Í•ÑMÑ…ÑÕÌ (€€€€€€€€‰M•±•Ð„Í…Ù•µ½¹ÍÑ•ÈÑ¼‘•±•Ñ”¸ˆ(€€€€€€¤ì(€€€€€É•ÑÕÉ¸™…±Í”ì(€€€ô((€€€½¹ÍÐ½¹™¥Éµ•±•Ñ”€ô(€€€€€ÑåÁ•½˜½¹™¥œ¹½¹™¥Éµ•±•Ñ”€ôôô€‰™Õ¹Ñ¥½¸ˆ(€€€€€€€€ü½¹™¥œ¹½¹™¥Éµ•±•Ñ”(€€€€€€€€è™Õ¹Ñ¥½¸€¡µ•ÍÍ…”¤ì(€€€€€€€€€€€É•ÑÕÉ¸Ý¥¹‘½Ü¹½¹™¥É´¡µ•ÍÍ…”¤ì(€€€€€€€€€ôì((€€€¥˜€ (€€€€€€…Í­¥Á½¹™¥Éµ…Ñ¥½¸€˜˜(€€€€€€…½¹™¥Éµ•±•Ñ” (€€€€€€€€‰•±•Ñ”€ˆ€¬(€€€€€€€€¡µ½¹ÍÑ•È¹¹…µ”ñð€‰Ñ¡¥Ìµ½¹ÍÑ•Èˆ¤€¬(€€€€€€€€ˆüˆ(€€€€€€¤(€€€€¤ì(€€€€€É•ÑÕÉ¸™…±Í”ì(€€€ô((€€€Í•Ñ	ÕÍä¡ÑÉÕ”¤ì((€€€ÑÉäì(€€€€€…Ý…¥Ð½¹™¥œ¹‘•±•Ñ•½Œ (€€€€€€€½¹™¥œ¹‘½Œ (€€€€€€€€€½¹™¥œ¹‘ˆ°(€€€€€€€€€€‰É½½µÌˆ°(€€€€€€€€€•ÑI½½µ½‘” ¤°(€€€€€€€€€€‰µ½¹ÍÑ•ÉÌˆ°(€€€€€€€€€Í•±•Ñ•‘5½¹ÍÑ•É%(€€€€€€€€¤(€€€€€€¤ì(€€€€€Í•±•Ñ•‘5½¹ÍÑ•É%€ô¹Õ±°ì(€€€€€±½…‘5½¹ÍÑ•É%¹Ñ½½É´ (€€€€€€€U1Q}5=9MQH°(€€€€€€€™…±Í”(€€€€€€¤ì(€€€€€Í•ÑMÑ…ÑÕÌ ‰5½¹ÍÑ•È‘•±•Ñ•¸ˆ¤ì(€€€€€É•ÑÕÉ¸ÑÉÕ”ì(€€€ô…Ñ €¡•ÉÉ½È¤ì(€€€€€½¹Í½±”¹•ÉÉ½È (€€€€€€€€‰½Õ±¹½Ð‘•±•Ñ”µ½¹ÍÑ•Èèˆ°(€€€€€€€•ÉÉ½È(€€€€€€¤ì(€€€€€Í•ÑMÑ…ÑÕÌ (€€€€€€€€‰5½¹ÍÑ•È½Õ±¹½Ð‰”‘•±•Ñ•è€ˆ€¬(€€€€€€€•ÉÉ½È¹µ•ÍÍ…”(€€€€€€¤ì(€€€€€É•ÑÕÉ¸™…±Í”ì(€€€ô™¥¹…±±äì(€€€€€Í•Ñ	ÕÍä¡™…±Í”¤ì(€€€ô(€ô((€™Õ¹Ñ¥½¸•ÑáÁ½ÉÑ…Ñ„ ¤ì(€€€½¹ÍÐÍ•±•Ñ•€ô(€€€€€•ÑM•±•Ñ•‘5½¹ÍÑ•È ¤ì(€€€½¹ÍÐ™½É´€ô(€€€€€É•…‘5½¹ÍÑ•É½É´ ¤ì(€€€½¹ÍÐÉ½½µ…Ñ„€ô(€€€€€•ÑI½½µ…Ñ„ ¤ì((€€€É•ÑÕÉ¸ì(€€€€€¥è(€€€€€€€Í•±•Ñ•(€€€€€€€€€€üÍ•±•Ñ•¹¥(€€€€€€€€€€è¹Õ±°°(€€€€€É½½µ½‘”è•ÑI½½µ½‘” ¤°(€€€€€½Ý¹•ÉU¥è(€€€€€€€Í•±•Ñ•ü¹½Ý¹•ÉU¥ñð(€€€€€€€É½½µ…Ñ„¹‘µU¥ñð(€€€€€€€¹Õ±°°(€€€€€½Ý¹•É9…µ”è(€€€€€€€Í•±•Ñ•ü¹½Ý¹•É9…µ”ñð(€€€€€€€É½½µ…Ñ„¹‘µ9…µ”ñð(€€€€€€€¹Õ±°°(€€€€€€¸¸¹™½É´°(€€€€€É•…Ñ•‘Ðè(€€€€€€€Í•±•Ñ•(€€€€€€€€€€üÑ¥µ•ÍÑ…µÁQ½)Í½¸ (€€€€€€€€€€€€€Í•±•Ñ•¹É•…Ñ•‘Ð(€€€€€€€€€€€€¤(€€€€€€€€€€è¹Õ±°°(€€€€€ÕÁ‘…Ñ•‘Ðè(€€€€€€€Í•±•Ñ•(€€€€€€€€€€üÑ¥µ•ÍÑ…µÁQ½)Í½¸ (€€€€€€€€€€€€€Í•±•Ñ•¹ÕÁ‘…Ñ•‘Ð(€€€€€€€€€€€€¤(€€€€€€€€€€è¹Õ±°(€€€ôì(€ô((€…Íå¹Œ™Õ¹Ñ¥½¸½Áå5½¹ÍÑ•É)Í½¸ ¤ì(€€€½¹ÍÐ©Í½¸€ô(€€€€€)M=8¹ÍÑÉ¥¹¥™ä (€€€€€€€•ÑáÁ½ÉÑ…Ñ„ ¤°(€€€€€€€¹Õ±°°(€€€€€€€€È(€€€€€€¤ì((€€€ÑÉäì(€€€€€¥˜€ (€€€€€€€ÑåÁ•½˜½¹™¥œ¹ÝÉ¥Ñ•±¥Á‰½…É€ôôô(€€€€€€€€‰™Õ¹Ñ¥½¸ˆ(€€€€€€¤ì(€€€€€€€…Ý…¥Ð½¹™¥œ¹ÝÉ¥Ñ•±¥Á‰½…É¡©Í½¸¤ì(€€€€€ô•±Í”ì(€€€€€€€…Ý…¥Ð¹…Ù¥…Ñ½È¹±¥Á‰½…É¹ÝÉ¥Ñ•Q•áÐ (€€€€€€€€€©Í½¸(€€€€€€€€¤ì(€€€€€ô((€€€€€Í•ÑMÑ…ÑÕÌ ‰5½¹ÍÑ•È)M=8½Á¥•¸ˆ¤ì(€€€€€É•ÑÕÉ¸©Í½¸ì(€€€ô…Ñ €¡•ÉÉ½È¤ì(€€€€€½¹Í½±”¹•ÉÉ½È (€€€€€€€€‰½Õ±¹½Ð½Áäµ½¹ÍÑ•È)M=8èˆ°(€€€€€€€•ÉÉ½È(€€€€€€¤ì(€€€€€Í•ÑMÑ…ÑÕÌ (€€€€€€€€‰5½¹ÍÑ•È)M=8½Õ±¹½Ð‰”½Á¥•¸ˆ(€€€€€€¤ì(€€€€€É•ÑÕÉ¸¹Õ±°ì(€€€ô(€ô((€™Õ¹Ñ¥½¸•áÁ½ÉÑ5½¹ÍÑ•É)Í½¸ ¤ì(€€€½¹ÍÐ•áÁ½ÉÑ…Ñ„€ô•ÑáÁ½ÉÑ…Ñ„ ¤ì(€€€½¹ÍÐ©Í½¸€ô(€€€€€)M=8¹ÍÑÉ¥¹¥™ä (€€€€€€€•áÁ½ÉÑ…Ñ„°(€€€€€€€¹Õ±°°(€€€€€€€€È(€€€€€€¤ì(€€€½¹ÍÐ™¥±•9…µ”€ô(€€€€€µ…­•)Í½¹¥±•9…µ”¡•áÁ½ÉÑ…Ñ„¹¹…µ”¤ì((€€€¥˜€ (€€€€€ÑåÁ•½˜½¹™¥œ¹‘½Ý¹±½…‘)Í½¸€ôôô(€€€€€€‰™Õ¹Ñ¥½¸ˆ(€€€€¤ì(€€€€€½¹™¥œ¹‘½Ý¹±½…‘)Í½¸ (€€€€€€€™¥±•9…µ”°(€€€€€€€©Í½¸(€€€€€€¤ì(€€€ô•±Í”ì(€€€€€½¹ÍÐ‰±½ˆ€ô(€€€€€€€¹•Ü	±½ˆ (€€€€€€€€€m©Í½¹t°(€€€€€€€€€ì(€€€€€€€€€€€ÑåÁ”è€‰…ÁÁ±¥…Ñ¥½¸½©Í½¸ˆ(€€€€€€€€€ô(€€€€€€€€¤ì(€€€€€½¹ÍÐ½‰©•ÑUÉ°€ô(€€€€€€€UI0¹É•…Ñ•=‰©•ÑUI0¡‰±½ˆ¤ì(€€€€€½¹ÍÐ±¥¹¬€ô(€€€€€€€‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰„ˆ¤ì(€€€€€±¥¹¬¹¡É•˜€ô½‰©•ÑUÉ°ì(€€€€€±¥¹¬¹‘½Ý¹±½…€ô™¥±•9…µ”ì(€€€€€‘½Õµ•¹Ð¹‰½‘ä¹…ÁÁ•¹‘¡¥±¡±¥¹¬¤ì(€€€€€±¥¹¬¹±¥¬ ¤ì(€€€€€±¥¹¬¹É•µ½Ù” ¤ì(€€€€€UI0¹É•Ù½­•=‰©•ÑUI0¡½‰©•ÑUÉ°¤ì(€€€ô((€€€Í•ÑMÑ…ÑÕÌ ‰5½¹ÍÑ•È)M=8•áÁ½ÉÑ•¸ˆ¤ì((€€€É•ÑÕÉ¸ì(€€€€€™¥±•9…µ”°(€€€€€©Í½¸(€€€ôì(€ô((€™Õ¹Ñ¥½¸¥µÁ½ÉÑ5½¹ÍÑ•É…Ñ„¡É…Ý…Ñ„¤ì(€€€¥˜€ ……¹‘¥Ð ¤¤ì(€€€€€Í•ÑMÑ…ÑÕÌ (€€€€€€€€‰=¹±äÑ¡”É½½´4…¸¥µÁ½ÉÐµ½¹ÍÑ•ÉÌ¸ˆ(€€€€€€¤ì(€€€€€É•ÑÕÉ¸¹Õ±°ì(€€€ô((€€€½¹ÍÐ¥µÁ½ÉÑ•€ô(€€€€€É…Ý…Ñ„€˜˜(€€€€€É…Ý…Ñ„¹µ½¹ÍÑ•È(€€€€€€€€üÉ…Ý…Ñ„¹µ½¹ÍÑ•È(€€€€€€€€èÉ…Ý…Ñ„ì((€€€¥˜€ (€€€€€€…¥µÁ½ÉÑ•ñð(€€€€€ÑåÁ•½˜¥µÁ½ÉÑ•€„ôô€‰½‰©•Ðˆñð(€€€€€ÉÉ…ä¹¥ÍÉÉ…ä¡¥µÁ½ÉÑ•¤(€€€€¤ì(€€€€€Ñ¡É½Ü¹•ÜÉÉ½È (€€€€€€€€‰Q¡”)M=8™¥±”‘½•Ì¹½Ð½¹Ñ…¥¸„µ½¹ÍÑ•È½‰©•Ð¸ˆ(€€€€€€¤ì(€€€ô((€€€Í•±•Ñ•‘5½¹ÍÑ•É%€ô¹Õ±°ì(€€€½¹ÍÐ¹½Éµ…±¥é•€ô(€€€€€±½…‘5½¹ÍÑ•É%¹Ñ½½É´ (€€€€€€€ì(€€€€€€€€€€¸¸¹¥µÁ½ÉÑ•°(€€€€€€€€€¥è¹Õ±°(€€€€€€€ô°(€€€€€€€™…±Í”(€€€€€€¤ì(€€€Í•ÑMÑ…ÑÕÌ (€€€€€€‰5½¹ÍÑ•È)M=8¥µÁ½ÉÑ•¸M…Ù”Ñ¼É•…Ñ”„¹•Üµ½¹ÍÑ•È¸ˆ(€€€€¤ì(€€€É•ÑÕÉ¸¹½Éµ…±¥é•ì(€ô((€…Íå¹Œ™Õ¹Ñ¥½¸¥µÁ½ÉÑ5½¹ÍÑ•É)Í½¸¡•Ù•¹Ð¤ì(€€€½¹ÍÐ™¥±”€ô(€€€€€•Ù•¹Ð¹Ñ…É•Ð¹™¥±•Ì€˜˜(€€€€€•Ù•¹Ð¹Ñ…É•Ð¹™¥±•ÍlÁtì((€€€¥˜€ …™¥±”¤É•ÑÕÉ¸¹Õ±°ì((€€€ÑÉäì(€€€€€½¹ÍÐÁ…ÉÍ•€ô(€€€€€€€)M=8¹Á…ÉÍ” (€€€€€€€€€…Ý…¥Ð™¥±”¹Ñ•áÐ ¤(€€€€€€€€¤ì(€€€€€É•ÑÕÉ¸¥µÁ½ÉÑ5½¹ÍÑ•É…Ñ„¡Á…ÉÍ•¤ì(€€€ô…Ñ €¡•ÉÉ½È¤ì(€€€€€½¹Í½±”¹•ÉÉ½È (€€€€€€€€‰½Õ±¹½Ð¥µÁ½ÉÐµ½¹ÍÑ•È)M=8èˆ°(€€€€€€€•ÉÉ½È(€€€€€€¤ì(€€€€€Í•ÑMÑ…ÑÕÌ (€€€€€€€€‰5½¹ÍÑ•È)M=8½Õ±¹½Ð‰”¥µÁ½ÉÑ•è€ˆ€¬(€€€€€€€•ÉÉ½È¹µ•ÍÍ…”(€€€€€€¤ì(€€€€€É•ÑÕÉ¸¹Õ±°ì(€€€ô™¥¹…±±äì(€€€€€•Ù•¹Ð¹Ñ…É•Ð¹Ù…±Õ”€ô€ˆˆì(€€€ô(€ô((€…Íå¹Œ™Õ¹Ñ¥½¸É•…Ñ•5½¹ÍÑ•ÉQ½­•¸ ¤ì(€€€¥˜€ ……¹‘¥Ð ¤¤ì(€€€€€Í•ÑMÑ…ÑÕÌ (€€€€€€€€‰=¹±äÑ¡”É½½´4…¸É•…Ñ”µ½¹ÍÑ•ÈÑ½­•¹Ì¸ˆ(€€€€€€¤ì(€€€€€É•ÑÕÉ¸¹Õ±°ì(€€€ô((€€€¥˜€ …Í•±•Ñ•‘5½¹ÍÑ•É%¤ì(€€€€€Í•ÑMÑ…ÑÕÌ (€€€€€€€€‰M…Ù”Ñ¡”µ½¹ÍÑ•È‰•™½É”É•…Ñ¥¹œ¥ÑÌÑ½­•¸¸ˆ(€€€€€€¤ì(€€€€€É•ÑÕÉ¸¹Õ±°ì(€€€ô((€€€¥˜€ (€€€€€ÑåÁ•½˜½¹™¥œ¹É•…Ñ•5½¹ÍÑ•É1¥¹­•‘Q½­•¸€„ôô(€€€€€€‰™Õ¹Ñ¥½¸ˆ(€€€€¤ì(€€€€€Í•ÑMÑ…ÑÕÌ (€€€€€€€€‰Q¡”µ½¹ÍÑ•ÈÑ½­•¸ÍåÍÑ•´¥Ì¹½Ð½¹¹•Ñ•¸ˆ(€€€€€€¤ì(€€€€€É•ÑÕÉ¸¹Õ±°ì(€€€ô((€€€Í•Ñ	ÕÍä¡ÑÉÕ”¤ì((€€€ÑÉäì(€€€€€½¹ÍÐµ½¹ÍÑ•È€ôì(€€€€€€€€¸¸¹‰Õ¥±‘5½¹ÍÑ•É½Õµ•¹Ð (€€€€€€€€€•ÑM•±•Ñ•‘5½¹ÍÑ•È ¤(€€€€€€€€¤°(€€€€€€€¥èÍ•±•Ñ•‘5½¹ÍÑ•É%(€€€€€ôì(€€€€€½¹ÍÐÑ½­•¸€ô(€€€€€€€…Ý…¥Ð½¹™¥œ¹É•…Ñ•5½¹ÍÑ•É1¥¹­•‘Q½­•¸ (€€€€€€€€€µ½¹ÍÑ•È(€€€€€€€€¤ì(€€€€€Í•ÑMÑ…ÑÕÌ (€€€€€€€µ½¹ÍÑ•È¹¹…µ”€¬(€€€€€€€€ˆÑ½­•¸É•…Ñ•½¸Ñ¡”…Ñ¥Ù”µ…À¸ˆ(€€€€€€¤ì(€€€€€É•ÑÕÉ¸Ñ½­•¸ì(€€€ô…Ñ €¡•ÉÉ½È¤ì(€€€€€½¹Í½±”¹•ÉÉ½È (€€€€€€€€‰½Õ±¹½ÐÉ•…Ñ”µ½¹ÍÑ•ÈÑ½­•¸èˆ°(€€€€€€€•ÉÉ½È(€€€€€€¤ì(€€€€€Í•ÑMÑ…ÑÕÌ (€€€€€€€€‰5½¹ÍÑ•ÈÑ½­•¸½Õ±¹½Ð‰”É•…Ñ•è€ˆ€¬(€€€€€€€•ÉÉ½È¹µ•ÍÍ…”(€€€€€€¤ì(€€€€€É•ÑÕÉ¸¹Õ±°ì(€€€ô™¥¹…±±äì(€€€€€Í•Ñ	ÕÍä¡™…±Í”¤ì(€€€ô(€ô((€™Õ¹Ñ¥½¸É•¹‘•É5½¹ÍÑ•É1¥ÍÐ ¤ì(€€€¥˜€ …•±•µ•¹ÑÌ¹±¥‰É…Éä¤ì(€€€€€É•ÑÕÉ¸ì(€€€ô((€€€•±•µ•¹ÑÌ¹±¥‰É…Éä¹¥¹¹•É!Q50€ô€ˆˆì((€€€¥˜€¡µ½¹ÍÑ•ÉÌ¹±•¹Ñ €ôôô€À¤ì(€€€€€•±•µ•¹ÑÌ¹±¥‰É…Éä¹Ñ•áÑ½¹Ñ•¹Ð€ô(€€€€€€€€‰9¼Í…Ù•µ½¹ÍÑ•ÉÌå•Ð¸ˆì(€€€€€É•ÑÕÉ¸ì(€€€ô((€€€µ½¹ÍÑ•ÉÌ¹™½É… ¡™Õ¹Ñ¥½¸€¡µ½¹ÍÑ•È¤ì(€€€€€½¹ÍÐ‰ÕÑÑ½¸€ô(€€€€€€€‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰‰ÕÑÑ½¸ˆ¤ì(€€€€€‰ÕÑÑ½¸¹ÑåÁ”€ô€‰‰ÕÑÑ½¸ˆì(€€€€€‰ÕÑÑ½¸¹±…ÍÍ9…µ”€ô(€€€€€€€€‰µ½¹ÍÑ•Èµ±¥‰É…Éäµ¥Ñ•´ˆì(€€€€€‰ÕÑÑ½¸¹±…ÍÍ1¥ÍÐ¹Ñ½±” (€€€€€€€€‰¥ÌµÍ•±•Ñ•ˆ°(€€€€€€€µ½¹ÍÑ•È¹¥€ôôôÍ•±•Ñ•‘5½¹ÍÑ•É%(€€€€€€¤ì(€€€€€‰ÕÑÑ½¸¹Í•ÑÑÑÉ¥‰ÕÑ” (€€€€€€€€‰…É¥„µÁÉ•ÍÍ•ˆ°(€€€€€€€µ½¹ÍÑ•È¹¥€ôôôÍ•±•Ñ•‘5½¹ÍÑ•É%(€€€€€€€€€€ü€‰ÑÉÕ”ˆ(€€€€€€€€€€è€‰™…±Í”ˆ(€€€€€€¤ì((€€€€€½¹ÍÐ¹…µ”€ô(€€€€€€€‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰ÍÁ…¸ˆ¤ì(€€€€€¹…µ”¹±…ÍÍ9…µ”€ô(€€€€€€€€‰µ½¹ÍÑ•Èµ±¥‰É…Éäµ¹…µ”ˆì(€€€€€¹…µ”¹Ñ•áÑ½¹Ñ•¹Ð€ô(€€€€€€€µ½¹ÍÑ•È¹¹…µ”ñð(€€€€€€€€‰U¹¹…µ•5½¹ÍÑ•Èˆì((€€€€€½¹ÍÐµ•Ñ„€ô(€€€€€€€‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰ÍÁ…¸ˆ¤ì(€€€€€µ•Ñ„¹±…ÍÍ9…µ”€ô(€€€€€€€€‰µ½¹ÍÑ•Èµ±¥‰É…Éäµµ•Ñ„ˆì(€€€€€µ•Ñ„¹Ñ•áÑ½¹Ñ•¹Ð€ô(€€€€€€€€¡µ½¹ÍÑ•È¹Í¥é”ñð€‰5•‘¥Õ´ˆ¤€¬(€€€€€€€€ˆ€ˆ€¬(€€€€€€€€¡µ½¹ÍÑ•È¹ÑåÁ”ñð€‰5½¹ÍÑ•Èˆ¤€¬(€€€€€€€€ˆ€¼H€ˆ€¬(€€€€€€€€¡µ½¹ÍÑ•È¹Èñð€ˆÀˆ¤ì((€€€€€‰ÕÑÑ½¸¹…ÁÁ•¹‘¡¥±¡¹…µ”¤ì(€€€€€‰ÕÑÑ½¸¹…ÁÁ•¹‘¡¥±¡µ•Ñ„¤ì(€€€€€‰ÕÑÑ½¸¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È (€€€€€€€€‰±¥¬ˆ°(€€€€€€€™Õ¹Ñ¥½¸€ ¤ì(€€€€€€€€€±½…‘5½¹ÍÑ•É%¹Ñ½½É´ (€€€€€€€€€€€µ½¹ÍÑ•È°(€€€€€€€€€€€ÑÉÕ”(€€€€€€€€€€¤ì(€€€€€€€€€Í•ÑMÑ…ÑÕÌ (€€€€€€€€€€€…¹‘¥Ð ¤(€€€€€€€€€€€€€€ü€‰1½…‘•€ˆ€¬(€€€€€€€€€€€€€€€€¡µ½¹ÍÑ•È¹¹…µ”ñð€‰µ½¹ÍÑ•Èˆ¤€¬(€€€€€€€€€€€€€€€€ˆ¸ˆ(€€€€€€€€€€€€€€è€‰Y¥•Ý¥¹œ€ˆ€¬(€€€€€€€€€€€€€€€€¡µ½¹ÍÑ•È¹¹…µ”ñð€‰µ½¹ÍÑ•Èˆ¤€¬(€€€€€€€€€€€€€€€€ˆ¸ˆ(€€€€€€€€€€¤ì(€€€€€€€ô(€€€€€€¤ì(€€€€€•±•µ•¹ÑÌ¹±¥‰É…Éä¹…ÁÁ•¹‘¡¥±¡‰ÕÑÑ½¸¤ì(€€€ô¤ì(€ô((€™Õ¹Ñ¥½¸ÍÕ‰ÍÉ¥‰•Q½I½½µ5½¹ÍÑ•ÉÌ ¤ì(€€€½¹ÍÐÉ½½µ½‘”€ô•ÑI½½µ½‘” ¤ì((€€€¥˜€¡ÍÑ½Á1¥ÍÑ•¹¥¹œ¤ì(€€€€€ÍÑ½Á1¥ÍÑ•¹¥¹œ ¤ì(€€€€€ÍÑ½Á1¥ÍÑ•¹¥¹œ€ô¹Õ±°ì(€€€ô((€€€±¥ÍÑ•¹¥¹I½½µ½‘”€ôÉ½½µ½‘”ì(€€€µ½¹ÍÑ•ÉÌ€ômtì(€€€É•¹‘•É5½¹ÍÑ•É1¥ÍÐ ¤ì((€€€¥˜€ …É½½µ½‘”¤ì(€€€€€Í•ÑMÑ…ÑÕÌ (€€€€€€€€‰=Á•¸„É½½´‰•™½É”ÕÍ¥¹œ5½¹ÍÑ•ÈÉ•…Ñ½È¸ˆ(€€€€€€¤ì(€€€€€Íå¹A•Éµ¥ÍÍ¥½¹MÑ…Ñ” ¤ì(€€€€€É•ÑÕÉ¸ì(€€€ô((€€€Í•ÑMÑ…ÑÕÌ ‰1½…‘¥¹œÍ…Ù•µ½¹ÍÑ•ÉÌ¸¸¸ˆ¤ì(€€€ÍÑ½Á1¥ÍÑ•¹¥¹œ€ô(€€€€€½¹™¥œ¹½¹M¹…ÁÍ¡½Ð (€€€€€€€½¹™¥œ¹½±±•Ñ¥½¸ (€€€€€€€€€½¹™¥œ¹‘ˆ°(€€€€€€€€€€‰É½½µÌˆ°(€€€€€€€€€É½½µ½‘”°(€€€€€€€€€€‰µ½¹ÍÑ•ÉÌˆ(€€€€€€€€¤°(€€€€€€€™Õ¹Ñ¥½¸€¡Í¹…ÁÍ¡½Ð¤ì(€€€€€€€€€¥˜€¡•ÑI½½µ½‘” ¤€„ôôÉ½½µ½‘”¤ì(€€€€€€€€€€€É•ÑÕÉ¸ì(€€€€€€€€€ô((€€€€€€€€€µ½¹ÍÑ•ÉÌ€ô(€€€€€€€€€€€Í¹…ÁÍ¡½Ð¹‘½Ì¹µ…À¡™Õ¹Ñ¥½¸€ (€€€€€€€€€€€€€µ½¹ÍÑ•É½Œ(€€€€€€€€€€€€¤ì(€€€€€€€€€€€€€É•ÑÕÉ¸¹½Éµ…±¥é•5½¹ÍÑ•ÉI•½É¡ì(€€€€€€€€€€€€€€€€¸¸¹µ½¹ÍÑ•É½Œ¹‘…Ñ„ ¤°(€€€€€€€€€€€€€€€¥èµ½¹ÍÑ•É½Œ¹¥(€€€€€€€€€€€€€ô¤ì(€€€€€€€€€€€ô¤ì((€€€€€€€€€µ½¹ÍÑ•ÉÌ¹Í½ÉÐ¡™Õ¹Ñ¥½¸€ (€€€€€€€€€€€±•™Ð°(€€€€€€€€€€€É¥¡Ð(€€€€€€€€€€¤ì(€€€€€€€€€€€½¹ÍÐ¹…µ•½µÁ…É”€ô(€€€€€€€€€€€€€¹½Éµ…±¥é•Q•áÐ (€€€€€€€€€€€€€€€±•™Ð¹¹…µ”(€€€€€€€€€€€€€€¤¹±½…±•½µÁ…É” (€€€€€€€€€€€€€€€¹½Éµ…±¥é•Q•áÐ (€€€€€€€€€€€€€€€€€É¥¡Ð¹¹…µ”(€€€€€€€€€€€€€€€€¤(€€€€€€€€€€€€€€¤ì((€€€€€€€€€€€¥˜€¡¹…µ•½µÁ…É”€„ôô€À¤ì(€€€€€€€€€€€€€É•ÑÕÉ¸¹…µ•½µÁ…É”ì(€€€€€€€€€€€ô((€€€€€€€€€€€É•ÑÕÉ¸€ (€€€€€€€€€€€€€Ñ¥µ•ÍÑ…µÁQ½5¥±±¥Ì (€€€€€€€€€€€€€€€É¥¡Ð¹ÕÁ‘…Ñ•‘Ð(€€€€€€€€€€€€€€¤€´(€€€€€€€€€€€€€Ñ¥µ•ÍÑ…µÁQ½5¥±±¥Ì (€€€€€€€€€€€€€€€±•™Ð¹ÕÁ‘…Ñ•‘Ð(€€€€€€€€€€€€€€¤(€€€€€€€€€€€€¤ì(€€€€€€€€€ô¤ì((€€€€€€€€€¥˜€ (€€€€€€€€€€€Í•±•Ñ•‘5½¹ÍÑ•É%€˜˜(€€€€€€€€€€€€…µ½¹ÍÑ•ÉÌ¹Í½µ”¡™Õ¹Ñ¥½¸€ (€€€€€€€€€€€€€µ½¹ÍÑ•È(€€€€€€€€€€€€¤ì(€€€€€€€€€€€€€É•ÑÕÉ¸€ (€€€€€€€€€€€€€€€µ½¹ÍÑ•È¹¥€ôôô(€€€€€€€€€€€€€€€Í•±•Ñ•‘5½¹ÍÑ•É%(€€€€€€€€€€€€€€¤ì(€€€€€€€€€€€ô¤(€€€€€€€€€€¤ì(€€€€€€€€€€€Í•±•Ñ•‘5½¹ÍÑ•É%€ô¹Õ±°ì(€€€€€€€€€ô((€€€€€€€€€É•¹‘•É5½¹ÍÑ•É1¥ÍÐ ¤ì(€€€€€€€€€Íå¹A•Éµ¥ÍÍ¥½¹MÑ…Ñ” ¤ì(€€€€€€€€€Í•ÑMÑ…ÑÕÌ (€€€€€€€€€€€…¹‘¥Ð ¤(€€€€€€€€€€€€€€ü€‰5½¹ÍÑ•ÈÉ•…Ñ½ÈÉ•…‘ä¸ˆ(€€€€€€€€€€€€€€è€‰Y¥•Ý¥¹œÍ…Ù•µ½¹ÍÑ•ÉÌ¸=¹±äÑ¡”É½½´4…¸•‘¥Ð¸ˆ(€€€€€€€€€€¤ì(€€€€€€€ô°(€€€€€€€™Õ¹Ñ¥½¸€¡•ÉÉ½È¤ì(€€€€€€€€€½¹Í½±”¹•ÉÉ½È (€€€€€€€€€€€€‰½Õ±¹½Ð±½…Í…Ù•µ½¹ÍÑ•ÉÌèˆ°(€€€€€€€€€€€•ÉÉ½È(€€€€€€€€€€¤ì(€€€€€€€€€Í•ÑMÑ…ÑÕÌ (€€€€€€€€€€€€‰M…Ù•µ½¹ÍÑ•ÉÌ½Õ±¹½Ð‰”±½…‘•è€ˆ€¬(€€€€€€€€€€€•ÉÉ½È¹µ•ÍÍ…”(€€€€€€€€€€¤ì(€€€€€€€ô(€€€€€€¤ì(€ô((€™Õ¹Ñ¥½¸‰…­Q½	…ÑÑ±•5…À ¤ì(€€€¥˜€ (€€€€€ÑåÁ•½˜½¹™¥œ¹½¹	…¬€ôôô(€€€€€€‰™Õ¹Ñ¥½¸ˆ(€€€€¤ì(€€€€€½¹™¥œ¹½¹	…¬ ¤ì(€€€€€É•ÑÕÉ¸ì(€€€ô((€€€½¹ÍÐ‰…ÑÑ±•UÉ°€ô(€€€€€¹•ÜUI0¡Ý¥¹‘½Ü¹±½…Ñ¥½¸¹¡É•˜¤ì(€€€‰…ÑÑ±•UÉ°¹Í•…É¡A…É…µÌ¹Í•Ð (€€€€€€‰Ù¥•Üˆ°(€€€€€€‰‰…ÑÑ±”ˆ(€€€€¤ì(€€€Ý¥¹‘½Ü¹±½…Ñ¥½¸¹…ÍÍ¥¸ (€€€€€‰…ÑÑ±•UÉ°¹Ñ½MÑÉ¥¹œ ¤(€€€€¤ì(€ô((€…‘‘½µ1¥ÍÑ•¹•È (€€€•±•µ•¹ÑÌ¹¹•Ý	ÕÑÑ½¸°(€€€€‰±¥¬ˆ°(€€€¹•Ý5½¹ÍÑ•È(€€¤ì(€…‘‘½µ1¥ÍÑ•¹•È (€€€•±•µ•¹ÑÌ¹Í…Ù•	ÕÑÑ½¸°(€€€€‰±¥¬ˆ°(€€€Í…Ù•5½¹ÍÑ•È(€€¤ì(€…‘‘½µ1¥ÍÑ•¹•È (€€€•±•µ•¹ÑÌ¹‘ÕÁ±¥…Ñ•	ÕÑÑ½¸°(€€€€‰±¥¬ˆ°(€€€‘ÕÁ±¥…Ñ•5½¹ÍÑ•È(€€¤ì(€…‘‘½µ1¥ÍÑ•¹•È (€€€•±•µ•¹ÑÌ¹‘•±•Ñ•	ÕÑÑ½¸°(€€€€‰±¥¬ˆ°(€€€‘•±•Ñ•5½¹ÍÑ•È(€€¤ì(€…‘‘½µ1¥ÍÑ•¹•È (€€€•±•µ•¹ÑÌ¹Ñ½­•¹	ÕÑÑ½¸°(€€€€‰±¥¬ˆ°(€€€É•…Ñ•5½¹ÍÑ•ÉQ½­•¸(€€¤ì(€…‘‘½µ1¥ÍÑ•¹•È (€€€•±•µ•¹ÑÌ¹½Áå	ÕÑÑ½¸°(€€€€‰±¥¬ˆ°(€€€½Áå5½¹ÍÑ•É)Í½¸(€€¤ì(€…‘‘½µ1¥ÍÑ•¹•È (€€€•±•µ•¹ÑÌ¹•áÁ½ÉÑ	ÕÑÑ½¸°(€€€€‰±¥¬ˆ°(€€€•áÁ½ÉÑ5½¹ÍÑ•É)Í½¸(€€¤ì(€…‘‘½µ1¥ÍÑ•¹•È (€€€•±•µ•¹ÑÌ¹¥µÁ½ÉÑ%¹ÁÕÐ°(€€€€‰¡…¹”ˆ°(€€€¥µÁ½ÉÑ5½¹ÍÑ•É)Í½¸(€€¤ì(€…‘‘½µ1¥ÍÑ•¹•È (€€€•±•µ•¹ÑÌ¹‰…­	ÕÑÑ½¸°(€€€€‰±¥¬ˆ°(€€€‰…­Q½	…ÑÑ±•5…À(€€¤ì((€¥˜€¡…¹‘¥Ð ¤¤ì(€€€Í•±•Ñ•‘5½¹ÍÑ•É%€ô¹Õ±°ì(€€€±½…‘5½¹ÍÑ•É%¹Ñ½½É´ (€€€€€U1Q}5=9MQH°(€€€€€™…±Í”(€€€€¤ì(€€€Í•ÑMÑ…ÑÕÌ ‰9•Üµ½¹ÍÑ•ÈÉ•…‘ä¸ˆ¤ì(€ô•±Í”ì(€€€±½…‘5½¹ÍÑ•É%¹Ñ½½É´ (€€€€€U1Q}5=9MQH°(€€€€€™…±Í”(€€€€¤ì(€ô((€ÍÕ‰ÍÉ¥‰•Q½I½½µ5½¹ÍÑ•ÉÌ ¤ì((€É•ÑÕÉ¸ì(€€€‘•ÍÑÉ½äè™Õ¹Ñ¥½¸€ ¤ì(€€€€€¥˜€¡ÍÑ½Á1¥ÍÑ•¹¥¹œ¤ì(€€€€€€€ÍÑ½Á1¥ÍÑ•¹¥¹œ ¤ì(€€€€€ô(€€€€€ÍÑ½Á1¥ÍÑ•¹¥¹œ€ô¹Õ±°ì(€€€€€É•µ½Ù•½µ1¥ÍÑ•¹•ÉÌ¹™½É…  (€€€€€€€™Õ¹Ñ¥½¸€¡É•µ½Ù•1¥ÍÑ•¹•È¤ì(€€€€€€€€€É•µ½Ù•1¥ÍÑ•¹•È ¤ì(€€€€€€€ô(€€€€€€¤ì(€€€ô°(€€€É•™É•Í è™Õ¹Ñ¥½¸€ ¤ì(€€€€€¥˜€ (€€€€€€€±¥ÍÑ•¹¥¹I½½µ½‘”€„ôô(€€€€€€€•ÑI½½µ½‘” ¤(€€€€€€¤ì(€€€€€€€ÍÕ‰ÍÉ¥‰•Q½I½½µ5½¹ÍÑ•ÉÌ ¤ì(€€€€€ô•±Í”ì(€€€€€€€Íå¹A•Éµ¥ÍÍ¥½¹MÑ…Ñ” ¤ì(€€€€€€€É•¹‘•É5½¹ÍÑ•É1¥ÍÐ ¤ì(€€€€€ô(€€€ô°(€€€¹•Ý5½¹ÍÑ•È°(€€€Í…Ù•5½¹ÍÑ•È°(€€€‘ÕÁ±¥…Ñ•5½¹ÍÑ•È°(€€€‘•±•Ñ•5½¹ÍÑ•È°(€€€É•…Ñ•5½¹ÍÑ•ÉQ½­•¸°(€€€½Áå5½¹ÍÑ•É)Í½¸°(€€€•áÁ½ÉÑ5½¹ÍÑ•É)Í½¸°(€€€¥µÁ½ÉÑ5½¹ÍÑ•É…Ñ„°(€€€•ÑáÁ½ÉÑ…Ñ„°(€€€±½…‘5½¹ÍÑ•É%¹Ñ½½É´°(€€€É•…‘5½¹ÍÑ•É½É´°(€€€•ÑMÑ…Ñ”è™Õ¹Ñ¥½¸€ ¤ì(€€€€€É•ÑÕÉ¸ì(€€€€€€€Í•±•Ñ•‘5½¹ÍÑ•É%°(€€€€€€€µ½¹ÍÑ•ÉÌè(€€€€€€€€€µ½¹ÍÑ•ÉÌ¹µ…À¡™Õ¹Ñ¥½¸€¡µ½¹ÍÑ•È¤ì(€€€€€€€€€€€É•ÑÕÉ¸ì(€€€€€€€€€€€€€€¸¸¹µ½¹ÍÑ•È(€€€€€€€€€€€ôì(€€€€€€€€€ô¤°(€€€€€€€…¹‘¥Ðè…¹‘¥Ð ¤°(€€€€€€€¥Í	ÕÍä(€€€€€ôì(€€€ô(€ôì)ô