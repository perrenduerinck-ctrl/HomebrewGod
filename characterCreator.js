// =====================================================
// CHARACTER CREATOR.JS — HOMEBREW GOD CHARACTER CREATOR
// Plain HTML/CSS/JS module.
// Characters live at rooms/{roomCode}/characters/{characterId}
// Room class templates can live at rooms/{roomCode}/classes/{classDocId}
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

  const BUILDER_STEPS = [
    { id: "basics", label: "1. Character Basics", status: "ready" },
    { id: "species", label: "2. Species / Race", status: "later" },
    { id: "class", label: "3. Class", status: "active" },
    { id: "subclass", label: "4. Subclass", status: "later" },
    { id: "level", label: "5. Level", status: "ready" },
    { id: "abilities", label: "6. Ability Scores", status: "ready" },
    { id: "background", label: "7. Background", status: "later" },
    { id: "skills", label: "8. Skills / Proficiencies", status: "later" },
    { id: "equipment", label: "9. Equipment", status: "later" },
    { id: "spells", label: "10. Spells / Features", status: "later" },
    { id: "review", label: "11. Review Sheet", status: "later" },
    { id: "save", label: "12. Save / Export / Token", status: "ready" }
  ];

  const DEFAULT_CLASS_TEMPLATES = [
    {
      id: "fighter",
      name: "Fighter",
      source: "template",
      summary: "Weapon-focused warrior template. Placeholder text only.",
      hitDie: "d10",
      primaryAbilities: ["Strength", "Dexterity"],
      savingThrows: ["Strength", "Constitution"],
      armorProficiencies: ["Light armor", "Medium armor", "Heavy armor", "Shields"],
      weaponProficiencies: ["Simple weapons", "Martial weapons"],
      skillChoices: {
        choose: 2,
        from: ["Athletics", "Acrobatics", "Survival", "Intimidation", "Perception"]
      },
      levels: {
        1: {
          proficiencyBonus: 2,
          features: [
            {
              id: "fighter-level-1-placeholder",
              name: "Level 1 Martial Feature",
              summary: "Placeholder feature slot. Add your own class rule text here."
            }
          ]
        }
      },
      subclasses: []
    },
    {
      id: "wizard",
      name: "Wizard",
      source: "template",
      summary: "Intelligence-based spellcaster template. Placeholder text only.",
      hitDie: "d6",
      primaryAbilities: ["Intelligence"],
      savingThrows: ["Intelligence", "Wisdom"],
      armorProficiencies: [],
      weaponProficiencies: ["Simple weapon placeholders"],
      skillChoices: {
        choose: 2,
        from: ["Arcana", "History", "Investigation", "Insight", "Medicine"]
      },
      levels: {
        1: {
          proficiencyBonus: 2,
          features: [
            {
              id: "wizard-level-1-placeholder",
              name: "Level 1 Spellcasting Feature",
              summary: "Placeholder feature slot. Add your own spell rules here."
            }
          ]
        }
      },
      subclasses: []
    },
    {
      id: "rogue",
      name: "Rogue",
      source: "template",
      summary: "Skill-focused trickster template. Placeholder text only.",
      hitDie: "d8",
      primaryAbilities: ["Dexterity"],
      savingThrows: ["Dexterity", "Intelligence"],
      armorProficiencies: ["Light armor"],
      weaponProficiencies: ["Simple weapons", "Finesse weapon placeholders"],
      skillChoices: {
        choose: 4,
        from: ["Acrobatics", "Athletics", "Deception", "Insight", "Perception", "Stealth"]
      },
      levels: {
        1: {
          proficiencyBonus: 2,
          features: [
            {
              id: "rogue-level-1-placeholder",
              name: "Level 1 Skill Feature",
              summary: "Placeholder feature slot. Add your own rogue-style rule text here."
            }
          ]
        }
      },
      subclasses: []
    },
    {
      id: "cleric",
      name: "Cleric",
      source: "template",
      summary: "Wisdom-based divine caster template. Placeholder text only.",
      hitDie: "d8",
      primaryAbilities: ["Wisdom"],
      savingThrows: ["Wisdom", "Charisma"],
      armorProficiencies: ["Light armor", "Medium armor", "Shields"],
      weaponProficiencies: ["Simple weapons"],
      skillChoices: {
        choose: 2,
        from: ["History", "Insight", "Medicine", "Persuasion", "Religion"]
      },
      levels: {
        1: {
          proficiencyBonus: 2,
          features: [
            {
              id: "cleric-level-1-placeholder",
              name: "Level 1 Divine Feature",
              summary: "Placeholder feature slot. Add your own divine class rule text here."
            }
          ]
        }
      },
      subclasses: []
    }
  ];

  const C = {
    screen: null,
    grid: null,

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
    libraryList: null,

    stepList: null,
    classLibraryList: null,
    classPreview: null,
    classJsonEditor: null,

    useSelectedClassButton: null,
    copySelectedClassJsonButton: null,
    applyClassJsonButton: null,
    saveClassTemplateButton: null
  };

  let currentCharacterId = null;

  let characterCache = [];
  let characterUnsubscribe = null;
  let characterRoomCode = null;

  let roomClassCache = [];
  let localEditedClassCache = [];
  let classUnsubscribe = null;
  let classRoomCode = null;

  let selectedClassId = "fighter";


// =====================================================
// CHARACTER CREATOR SECTION 1 — DOM / SHELL
// =====================================================

  function refreshElements() {
    C.screen = $("characterCreatorScreen");
    C.grid = C.screen ? C.screen.querySelector(".creatorFullGrid") : null;

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

    C.stepList = $("characterBuilderStepList");
    C.classLibraryList = $("characterClassLibraryList");
    C.classPreview = $("characterClassPreview");
    C.classJsonEditor = $("characterClassJsonEditor");

    C.useSelectedClassButton = $("useSelectedClassButton");
    C.copySelectedClassJsonButton = $("copySelectedClassJsonButton");
    C.applyClassJsonButton = $("applyClassJsonButton");
    C.saveClassTemplateButton = $("saveClassTemplateButton");
  }

  function renderShell() {
    refreshElements();

    if (!C.grid) {
      return;
    }

    if (C.grid.dataset.characterCreatorShell === "v2") {
      return;
    }

    C.grid.dataset.characterCreatorShell = "v2";

    C.grid.innerHTML = `
      <section class="toolPanelMini characterBuilderStepsPanel">
        <h3>Builder Steps</h3>
        <div id="characterBuilderStepList" class="characterBuilderStepList"></div>
        <p class="small">
          We are building this one step at a time. Class is the first real guided step.
        </p>
      </section>

      <section class="toolPanelMini">
        <h3>Character Basics</h3>

        <input id="characterNameInput" type="text" placeholder="Character name">
        <input id="characterRaceInput" type="text" placeholder="Species / race">
        <input id="characterClassInput" type="text" placeholder="Selected class" readonly>
        <input id="characterLevelInput" type="number" min="1" max="20" placeholder="Level" value="1">
        <input id="characterImageUploadInput" type="file" accept="image/*">

        <p class="small">
          The class field is driven by the class library below.
        </p>
      </section>

      <section class="toolPanelMini">
        <h3>Class Library</h3>

        <div id="characterClassLibraryList" class="characterClassLibraryList">
          Loading classes...
        </div>
      </section>

      <section class="toolPanelMini creatorWidePanel">
        <h3>Selected Class Preview</h3>

        <div id="characterClassPreview" class="characterClassPreview">
          Pick a class.
        </div>

        <div class="creatorButtonRow">
          <button id="useSelectedClassButton" type="button">Use This Class</button>
          <button id="copySelectedClassJsonButton" type="button">Copy Class JSON</button>
        </div>
      </section>

      <section class="toolPanelMini creatorWidePanel">
        <h3>Edit Class Data</h3>

        <p class="small">
          This is the class object. Edit it here, then apply it as a draft or save it to this room.
        </p>

        <textarea id="characterClassJsonEditor" class="characterJsonEditor" spellcheck="false"></textarea>

        <div class="creatorButtonRow">
          <button id="applyClassJsonButton" type="button">Apply JSON As Draft</button>
          <button id="saveClassTemplateButton" type="button">Save Class Template To Room</button>
        </div>
      </section>

      <section class="toolPanelMini">
        <h3>Combat Basics</h3>

        <input id="characterAcInput" type="number" placeholder="Armor Class" value="10">
        <input id="characterMaxHpInput" type="number" placeholder="Max HP" value="1">
        <input id="characterCurrentHpInput" type="number" placeholder="Current HP" value="1">
        <input id="characterSpeedInput" type="text" placeholder="Speed, like 30 ft." value="30 ft.">
      </section>

      <section class="toolPanelMini">
        <h3>Ability Scores</h3>

        <div class="statMiniGrid">
          <input id="characterStrInput" type="number" placeholder="STR" value="10">
          <input id="characterDexInput" type="number" placeholder="DEX" value="10">
          <input id="characterConInput" type="number" placeholder="CON" value="10">
          <input id="characterIntInput" type="number" placeholder="INT" value="10">
          <input id="characterWisInput" type="number" placeholder="WIS" value="10">
          <input id="characterChaInput" type="number" placeholder="CHA" value="10">
        </div>
      </section>

      <section class="toolPanelMini creatorWidePanel">
        <h3>Notes / Inventory / Spells</h3>

        <textarea id="characterNotesInput" placeholder="Backstory, attacks, spells, inventory, notes..."></textarea>

        <p id="characterCreatorStatus" class="status">
          Character creator ready.
        </p>
      </section>

      <section class="toolPanelMini creatorLibraryPanel">
        <h3>Saved Characters</h3>

        <div id="characterLibraryList" class="creatorLibraryList">
          No saved characters yet.
        </div>
      </section>
    `;

    refreshElements();
  }

  function ensureStyles() {
    if (document.getElementById("homebrewGodCharacterCreatorStyles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "homebrewGodCharacterCreatorStyles";

    style.textContent = `
      .characterBuilderStepList,
      .characterClassLibraryList,
      .characterClassPreview,
      .creatorLibraryList {
        display: grid;
        gap: 8px;
      }

      .characterBuilderStep {
        padding: 8px 10px;
        border-radius: 12px;
        border: 1px solid rgba(116, 138, 255, 0.18);
        background: rgba(255, 255, 255, 0.025);
        color: #dfe6ff;
        font-size: 13px;
      }

      .characterBuilderStep.active {
        border-color: rgba(88, 166, 255, 0.65);
        background:
          radial-gradient(circle at top left, rgba(88, 166, 255, 0.18), transparent 45%),
          rgba(88, 166, 255, 0.08);
        color: #ffffff;
        font-weight: bold;
      }

      .characterBuilderStep.later {
        opacity: 0.55;
      }

      .characterClassCard,
      .characterSavedCard {
        padding: 10px;
        border-radius: 14px;
        border: 1px solid rgba(116, 138, 255, 0.18);
        background:
          linear-gradient(180deg, rgba(13, 18, 36, 0.92), rgba(7, 10, 22, 0.92));
      }

      .characterClassCard.active {
        border-color: rgba(157, 107, 255, 0.75);
        box-shadow: 0 0 18px rgba(157, 107, 255, 0.14);
      }

      .characterClassCard button,
      .characterSavedCard button {
        width: auto !important;
        padding: 7px 10px !important;
        margin: 6px 6px 0 0 !important;
        font-size: 13px !important;
      }

      .characterClassTitle,
      .characterSavedTitle {
        font-weight: bold;
        color: #ffffff;
        margin-bottom: 4px;
      }

      .characterClassMeta,
      .characterSavedMeta {
        color: #aeb8df;
        font-size: 12px;
        line-height: 1.35;
      }

      .characterClassPreviewGrid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 8px;
        margin-top: 8px;
      }

      .characterPreviewBlock {
        border-radius: 12px;
        padding: 9px;
        border: 1px solid rgba(116, 138, 255, 0.16);
        background: rgba(255, 255, 255, 0.025);
      }

      .characterPreviewBlock b {
        display: block;
        margin-bottom: 4px;
      }

      .characterJsonEditor {
        width: 100% !important;
        min-height: 280px !important;
        font-family: Consolas, Monaco, monospace !important;
        font-size: 13px !important;
        line-height: 1.35 !important;
        white-space: pre !important;
        overflow: auto !important;
      }

      #characterCreatorScreen input[readonly] {
        opacity: 0.9;
        cursor: default;
      }
    `;

    document.head.appendChild(style);
  }

  function setStatus(message) {
    refreshElements();

    if (C.status) {
      C.status.textContent = message || "";
    }
  }


// =====================================================
// CHARACTER CREATOR SECTION 2 — HELPERS
// =====================================================

  function cloneData(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function makeSafeId(value, fallback) {
    const clean = String(value || fallback || "custom")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return clean || fallback || "custom";
  }

  function makeSafeFileName(name) {
    return String(name || "character")
      .trim()
      .replace(/[^a-z0-9_-]/gi, "_")
      .replace(/_+/g, "_")
      .slice(0, 60);
  }

  function cleanArray(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

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

  function clampLevel(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return 1;
    }

    return Math.max(1, Math.min(20, Math.round(number)));
  }

  function joinList(list, fallback) {
    const clean = cleanArray(list);

    if (clean.length === 0) {
      return fallback || "None yet";
    }

    return clean.join(", ");
  }

  function getGenericProficiencyBonus(level) {
    const safeLevel = clampLevel(level);

    if (safeLevel >= 17) return 6;
    if (safeLevel >= 13) return 5;
    if (safeLevel >= 9) return 4;
    if (safeLevel >= 5) return 3;

    return 2;
  }


// =====================================================
// CHARACTER CREATOR SECTION 3 — CLASS DATA
// =====================================================

  function normalizeClassTemplate(classData, fallbackSource) {
    const raw = classData || {};
    const name = String(raw.name || "Custom Class").trim();
    const id = makeSafeId(raw.id || name, "custom-class");

    const skillChoices = raw.skillChoices || {};
    const levels =
      raw.levels && typeof raw.levels === "object" && !Array.isArray(raw.levels)
        ? cloneData(raw.levels)
        : {
            1: {
              proficiencyBonus: 2,
              features: []
            }
          };

    return {
      id,
      docId: raw.docId || null,
      name,
      source: String(raw.source || fallbackSource || "template"),
      summary: String(raw.summary || raw.description || "No summary yet."),
      hitDie: String(raw.hitDie || "d8"),
      primaryAbilities: cleanArray(raw.primaryAbilities),
      savingThrows: cleanArray(raw.savingThrows),
      armorProficiencies: cleanArray(raw.armorProficiencies),
      weaponProficiencies: cleanArray(raw.weaponProficiencies),
      toolProficiencies: cleanArray(raw.toolProficiencies),
      skillChoices: {
        choose: Number.isFinite(Number(skillChoices.choose)) ? Number(skillChoices.choose) : 0,
        from: cleanArray(skillChoices.from)
      },
      levels,
      subclasses: Array.isArray(raw.subclasses) ? cloneData(raw.subclasses) : []
    };
  }

  function getAllClassTemplates() {
    const classMap = new Map();

    DEFAULT_CLASS_TEMPLATES.forEach(function (classData) {
      const normalized = normalizeClassTemplate(classData, "template");
      classMap.set(normalized.id, normalized);
    });

    roomClassCache.forEach(function (classData) {
      const normalized = normalizeClassTemplate(classData, "homebrew");
      classMap.set(normalized.id, normalized);
    });

    localEditedClassCache.forEach(function (classData) {
      const normalized = normalizeClassTemplate(classData, "draft");
      classMap.set(normalized.id, normalized);
    });

    return Array.from(classMap.values()).sort(function (a, b) {
      if (a.source === "template" && b.source !== "template") return -1;
      if (a.source !== "template" && b.source === "template") return 1;
      return a.name.localeCompare(b.name);
    });
  }

  function getClassById(classId) {
    return getAllClassTemplates().find((classData) => classData.id === classId) || null;
  }

  function getSelectedClassTemplate() {
    let selectedClass = getClassById(selectedClassId);

    if (!selectedClass) {
      const allClasses = getAllClassTemplates();
      selectedClass = allClasses[0] || null;
      selectedClassId = selectedClass ? selectedClass.id : "";
    }

    return selectedClass;
  }

  function upsertLocalClassTemplate(classData) {
    const normalized = normalizeClassTemplate(classData, "draft");

    localEditedClassCache = localEditedClassCache.filter(function (item) {
      return item.id !== normalized.id;
    });

    localEditedClassCache.push({
      ...normalized,
      source: "draft"
    });

    selectedClassId = normalized.id;
  }

  function selectClass(classId) {
    selectedClassId = classId;

    const selectedClass = getSelectedClassTemplate();

    if (C.classInput && selectedClass) {
      C.classInput.value = selectedClass.name;
    }

    renderClassLibrary();
    renderClassPreview();
    connectButtons();

    setStatus("Selected class: " + (selectedClass ? selectedClass.name : "None"));
  }

  function getLevelDataForSelectedClass() {
    const selectedClass = getSelectedClassTemplate();
    const level = clampLevel(getNumberValue(C.levelInput, 1));

    if (!selectedClass) {
      return {
        proficiencyBonus: getGenericProficiencyBonus(level),
        features: []
      };
    }

    const levels = selectedClass.levels || {};
    const exactLevel = levels[String(level)] || levels[level];

    if (exactLevel) {
      return {
        proficiencyBonus: exactLevel.proficiencyBonus || getGenericProficiencyBonus(level),
        features: Array.isArray(exactLevel.features) ? exactLevel.features : []
      };
    }

    return {
      proficiencyBonus: getGenericProficiencyBonus(level),
      features: []
    };
  }


// =====================================================
// CHARACTER CREATOR SECTION 4 — RENDERING
// =====================================================

  function renderStepList() {
    refreshElements();

    if (!C.stepList) {
      return;
    }

    C.stepList.innerHTML = "";

    BUILDER_STEPS.forEach(function (step) {
      const div = document.createElement("div");
      div.className = "characterBuilderStep " + step.status;
      div.textContent = step.label;

      if (step.status === "later") {
        div.textContent += " — later";
      }

      if (step.status === "active") {
        div.textContent += " — now";
      }

      C.stepList.appendChild(div);
    });
  }

  function renderClassLibrary() {
    refreshElements();

    if (!C.classLibraryList) {
      return;
    }

    const classes = getAllClassTemplates();

    C.classLibraryList.innerHTML = "";

    if (classes.length === 0) {
      C.classLibraryList.textContent = "No class templates yet.";
      return;
    }

    classes.forEach(function (classData) {
      const card = document.createElement("div");
      card.className = "characterClassCard";

      if (classData.id === selectedClassId) {
        card.classList.add("active");
      }

      const title = document.createElement("div");
      title.className = "characterClassTitle";
      title.textContent = classData.name;

      const meta = document.createElement("div");
      meta.className = "characterClassMeta";
      meta.textContent =
        "Source: " +
        classData.source +
        " | Hit Die: " +
        classData.hitDie +
        " | Main: " +
        joinList(classData.primaryAbilities, "Any");

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = classData.id === selectedClassId ? "Selected" : "Select";
      button.dataset.characterClassId = classData.id;

      card.appendChild(title);
      card.appendChild(meta);
      card.appendChild(button);

      C.classLibraryList.appendChild(card);
    });
  }

  function renderClassPreview() {
    refreshElements();

    const selectedClass = getSelectedClassTemplate();

    if (!C.classPreview) {
      return;
    }

    if (!selectedClass) {
      C.classPreview.textContent = "No class selected.";
      return;
    }

    const level = clampLevel(getNumberValue(C.levelInput, 1));
    const levelData = getLevelDataForSelectedClass();
    const features = Array.isArray(levelData.features) ? levelData.features : [];

    C.classPreview.innerHTML = `
      <div class="characterClassTitle">${escapeHtml(selectedClass.name)}</div>
      <div class="characterClassMeta">${escapeHtml(selectedClass.summary)}</div>

      <div class="characterClassPreviewGrid">
        <div class="characterPreviewBlock">
          <b>Hit Die</b>
          ${escapeHtml(selectedClass.hitDie)}
        </div>

        <div class="characterPreviewBlock">
          <b>Primary Abilities</b>
          ${escapeHtml(joinList(selectedClass.primaryAbilities, "Any"))}
        </div>

        <div class="characterPreviewBlock">
          <b>Saving Throws</b>
          ${escapeHtml(joinList(selectedClass.savingThrows, "None yet"))}
        </div>

        <div class="characterPreviewBlock">
          <b>Armor</b>
          ${escapeHtml(joinList(selectedClass.armorProficiencies, "None yet"))}
        </div>

        <div class="characterPreviewBlock">
          <b>Weapons</b>
          ${escapeHtml(joinList(selectedClass.weaponProficiencies, "None yet"))}
        </div>

        <div class="characterPreviewBlock">
          <b>Skills</b>
          Choose ${escapeHtml(selectedClass.skillChoices.choose)} from:
          ${escapeHtml(joinList(selectedClass.skillChoices.from, "None yet"))}
        </div>

        <div class="characterPreviewBlock">
          <b>Level ${escapeHtml(level)} Bonus</b>
          +${escapeHtml(levelData.proficiencyBonus)}
        </div>

        <div class="characterPreviewBlock">
          <b>Level ${escapeHtml(level)} Features</b>
          ${
            features.length
              ? features.map((feature) => escapeHtml(feature.name || "Unnamed Feature")).join("<br>")
              : "No level feature added yet."
          }
        </div>
      </div>
    `;

    if (C.classJsonEditor) {
      C.classJsonEditor.value = JSON.stringify(selectedClass, null, 2);
    }

    if (C.classInput) {
      C.classInput.value = selectedClass.name;
    }
  }

  function renderCharacterLibrary() {
    refreshElements();

    if (!C.libraryList) {
      return;
    }

    C.libraryList.innerHTML = "";

    if (characterCache.length === 0) {
      C.libraryList.textContent = "No saved characters yet.";
      return;
    }

    characterCache.forEach(function (character) {
      const card = document.createElement("div");
      card.className = "characterSavedCard";

      const title = document.createElement("div");
      title.className = "characterSavedTitle";
      title.textContent = character.name || "Unnamed Character";

      const meta = document.createElement("div");
      meta.className = "characterSavedMeta";
      meta.textContent =
        "Level " +
        (character.level || 1) +
        " " +
        (character.className || "No class") +
        " | " +
        (character.race || character.species || "No species");

      const loadButton = document.createElement("button");
      loadButton.type = "button";
      loadButton.textContent = "Load";
      loadButton.addEventListener("click", function () {
        setFormFromCharacter(character);
        setStatus("Loaded " + (character.name || "character") + ".");
      });

      const copyButton = document.createElement("button");
      copyButton.type = "button";
      copyButton.textContent = "Copy JSON";
      copyButton.addEventListener("click", async function () {
        await navigator.clipboard.writeText(JSON.stringify(character, null, 2));
        setStatus("Saved character JSON copied.");
      });

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", function () {
        deleteCharacter(character.id);
      });

      card.appendChild(title);
      card.appendChild(meta);
      card.appendChild(loadButton);
      card.appendChild(copyButton);
      card.appendChild(deleteButton);

      C.libraryList.appendChild(card);
    });
  }

  function renderAll() {
    ensureStyles();
    renderShell();
    refreshRoomListeners();
    renderStepList();
    renderClassLibrary();
    renderClassPreview();
    renderCharacterLibrary();
    connectButtons();
  }


// =====================================================
// CHARACTER CREATOR SECTION 5 — FORM DATA
// =====================================================

  function getCharacterFromForm() {
    refreshElements();

    const maxHp = getNumberValue(C.maxHpInput, 1);
    const level = clampLevel(getNumberValue(C.levelInput, 1));
    const selectedClass = getSelectedClassTemplate();
    const selectedClassSnapshot = selectedClass ? cloneData(selectedClass) : null;

    const species = getTextValue(C.raceInput, "");

    return {
      id: currentCharacterId,

      name: getTextValue(C.nameInput, "Unnamed Character"),
      species: species,
      race: species,

      classId: selectedClass ? selectedClass.id : "",
      className: selectedClass ? selectedClass.name : getTextValue(C.classInput, ""),
      level: level,

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

      builder: {
        currentStep: "class",
        selectedClassId: selectedClass ? selectedClass.id : "",
        selectedClassSnapshot: selectedClassSnapshot,
        completedSteps: ["class"]
      },

      sheetType: "character",
      version: 2,
      updatedAtMillis: Date.now()
    };
  }

  function setFormFromCharacter(character) {
    renderShell();
    refreshElements();

    const data = character || {};
    const stats = data.stats || {};
    const builder = data.builder || {};

    currentCharacterId = data.id || null;

    if (builder.selectedClassSnapshot) {
      upsertLocalClassTemplate(builder.selectedClassSnapshot);
    }

    selectedClassId =
      data.classId ||
      builder.selectedClassId ||
      selectedClassId ||
      "fighter";

    if (C.nameInput) C.nameInput.value = data.name || "";
    if (C.raceInput) C.raceInput.value = data.species || data.race || "";
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

    renderClassLibrary();
    renderClassPreview();
    connectButtons();
  }

  function newCharacter() {
    currentCharacterId = null;
    selectedClassId = "fighter";

    setFormFromCharacter({
      name: "",
      species: "",
      race: "",
      classId: "fighter",
      className: "Fighter",
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
// CHARACTER CREATOR SECTION 6 — CHARACTER FIRESTORE
// =====================================================

  function normalizeSavedCharacter(character, fallbackId) {
    const data = character || {};

    return {
      ...data,
      id: data.id || fallbackId || null,
      name: data.name || "Unnamed Character",
      level: clampLevel(data.level || 1),
      className: data.className || "",
      race: data.race || data.species || "",
      species: data.species || data.race || ""
    };
  }

  function stopCharacterListener() {
    if (typeof characterUnsubscribe === "function") {
      characterUnsubscribe();
    }

    characterUnsubscribe = null;
    characterRoomCode = null;
    characterCache = [];
  }

  function startCharacterListenerForRoom(roomCode) {
    if (!roomCode) {
      stopCharacterListener();
      return;
    }

    if (characterRoomCode === roomCode && characterUnsubscribe) {
      return;
    }

    stopCharacterListener();

    characterRoomCode = roomCode;

    const characterCollectionRef = deps.collection(
      deps.db,
      "rooms",
      roomCode,
      "characters"
    );

    characterUnsubscribe = deps.onSnapshot(
      characterCollectionRef,
      function (snapshot) {
        characterCache = snapshot.docs
          .map(function (characterDoc) {
            return normalizeSavedCharacter(
              {
                ...characterDoc.data(),
                id: characterDoc.id
              },
              characterDoc.id
            );
          })
          .sort(function (a, b) {
            return String(a.name || "").localeCompare(String(b.name || ""));
          });

        renderCharacterLibrary();
      },
      function (error) {
        console.error(error);
        setStatus("Could not load characters: " + error.message);
      }
    );
  }

  function buildCharacterPayload(character) {
    const payload = {
      ...character,
      updatedAt: deps.serverTimestamp()
    };

    delete payload.id;

    return payload;
  }

  async function createCharacterDocument(statusMessage) {
    const roomCode = deps.getCurrentRoomCode ? deps.getCurrentRoomCode() : null;

    if (!roomCode) {
      alert("Open a room first.");
      return;
    }

    const character = getCharacterFromForm();
    const payload = buildCharacterPayload(character);

    const newDoc = await deps.addDoc(
      deps.collection(deps.db, "rooms", roomCode, "characters"),
      {
        ...payload,
        createdAt: deps.serverTimestamp()
      }
    );

    currentCharacterId = newDoc.id;

    renderCharacterLibrary();
    connectButtons();

    setStatus(statusMessage || "Character saved as new.");
  }

  async function updateCharacterDocument() {
    const roomCode = deps.getCurrentRoomCode ? deps.getCurrentRoomCode() : null;

    if (!roomCode) {
      alert("Open a room first.");
      return;
    }

    if (!currentCharacterId) {
      await createCharacterDocument("Character saved as new.");
      return;
    }

    const character = getCharacterFromForm();
    const payload = buildCharacterPayload(character);

    await deps.updateDoc(
      deps.doc(deps.db, "rooms", roomCode, "characters", currentCharacterId),
      payload
    );

    renderCharacterLibrary();
    connectButtons();

    setStatus("Character updated.");
  }

  async function saveCharacter() {
    try {
      if (currentCharacterId) {
        await updateCharacterDocument();
        return;
      }

      await createCharacterDocument("Character saved as new.");
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  async function saveCharacterAsNew() {
    try {
      await createCharacterDocument("Character saved as a new character.");
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  async function deleteCharacter(characterId) {
    try {
      const roomCode = deps.getCurrentRoomCode ? deps.getCurrentRoomCode() : null;

      if (!roomCode || !characterId) {
        return;
      }

      if (!confirm("Delete this saved character?")) {
        return;
      }

      await deps.deleteDoc(
        deps.doc(deps.db, "rooms", roomCode, "characters", characterId)
      );

      if (currentCharacterId === characterId) {
        currentCharacterId = null;
      }

      renderCharacterLibrary();
      connectButtons();

      setStatus("Character deleted.");
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }


// =====================================================
// CHARACTER CREATOR SECTION 7 — CLASS FIRESTORE
// =====================================================

  function stopClassListener() {
    if (typeof classUnsubscribe === "function") {
      classUnsubscribe();
    }

    classUnsubscribe = null;
    classRoomCode = null;
    roomClassCache = [];
  }

  function startClassListenerForRoom(roomCode) {
    if (!roomCode) {
      stopClassListener();
      return;
    }

    if (classRoomCode === roomCode && classUnsubscribe) {
      return;
    }

    stopClassListener();

    classRoomCode = roomCode;

    const classCollectionRef = deps.collection(
      deps.db,
      "rooms",
      roomCode,
      "classes"
    );

    classUnsubscribe = deps.onSnapshot(
      classCollectionRef,
      function (snapshot) {
        roomClassCache = snapshot.docs.map(function (classDoc) {
          return normalizeClassTemplate(
            {
              ...classDoc.data(),
              docId: classDoc.id,
              source: classDoc.data().source || "homebrew"
            },
            "homebrew"
          );
        });

        renderClassLibrary();
        renderClassPreview();
        connectButtons();
      },
      function (error) {
        console.error(error);
        setStatus("Could not load room classes: " + error.message);
      }
    );
  }

  async function saveClassTemplateToRoom() {
    try {
      refreshElements();

      const roomCode = deps.getCurrentRoomCode ? deps.getCurrentRoomCode() : null;

      if (!roomCode) {
        alert("Open a room first.");
        return;
      }

      if (!C.classJsonEditor) {
        return;
      }

      const parsed = JSON.parse(C.classJsonEditor.value);
      const normalized = normalizeClassTemplate(
        {
          ...parsed,
          source: "homebrew"
        },
        "homebrew"
      );

      const existingRoomClass = roomClassCache.find(function (classData) {
        return classData.id === normalized.id && classData.docId;
      });

      const payload = {
        ...cloneData(normalized),
        source: "homebrew",
        updatedAt: deps.serverTimestamp()
      };

      delete payload.docId;

      if (existingRoomClass) {
        await deps.updateDoc(
          deps.doc(deps.db, "rooms", roomCode, "classes", existingRoomClass.docId),
          payload
        );

        selectedClassId = normalized.id;
        setStatus("Room class template updated: " + normalized.name);
        return;
      }

      await deps.addDoc(
        deps.collection(deps.db, "rooms", roomCode, "classes"),
        {
          ...payload,
          createdAt: deps.serverTimestamp()
        }
      );

      selectedClassId = normalized.id;
      setStatus("Room class template saved: " + normalized.name);
    } catch (error) {
      console.error(error);
      alert("Class JSON problem: " + error.message);
    }
  }

  function applyClassJsonAsDraft() {
    try {
      refreshElements();

      if (!C.classJsonEditor) {
        return;
      }

      const parsed = JSON.parse(C.classJsonEditor.value);
      const normalized = normalizeClassTemplate(
        {
          ...parsed,
          source: "draft"
        },
        "draft"
      );

      upsertLocalClassTemplate(normalized);
      renderClassLibrary();
      renderClassPreview();
      connectButtons();

      setStatus("Draft class applied: " + normalized.name);
    } catch (error) {
      console.error(error);
      alert("Class JSON problem: " + error.message);
    }
  }


// =====================================================
// CHARACTER CREATOR SECTION 8 — JSON IMPORT / EXPORT
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
    try {
      if (!file) {
        return;
      }

      const text = await file.text();
      const data = JSON.parse(text);

      setFormFromCharacter(data);
      setStatus("Character JSON imported.");
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  async function copySelectedClassJson() {
    try {
      const selectedClass = getSelectedClassTemplate();

      if (!selectedClass) {
        return;
      }

      await navigator.clipboard.writeText(JSON.stringify(selectedClass, null, 2));
      setStatus("Selected class JSON copied.");
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }


// =====================================================
// CHARACTER CREATOR SECTION 9 — BUTTONS / LISTENERS
// =====================================================

  function refreshRoomListeners() {
    const roomCode = deps.getCurrentRoomCode ? deps.getCurrentRoomCode() : null;

    startCharacterListenerForRoom(roomCode);
    startClassListenerForRoom(roomCode);
  }

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
        await importCharacterJson(C.importJsonInput.files[0]);
        C.importJsonInput.value = "";
      });
    }

    if (C.classLibraryList && C.classLibraryList.dataset.creatorConnected !== "yes") {
      C.classLibraryList.dataset.creatorConnected = "yes";

      C.classLibraryList.addEventListener("click", function (event) {
        const button = event.target.closest("[data-character-class-id]");

        if (!button) {
          return;
        }

        selectClass(button.dataset.characterClassId);
      });
    }

    if (C.levelInput && C.levelInput.dataset.creatorConnected !== "yes") {
      C.levelInput.dataset.creatorConnected = "yes";

      C.levelInput.addEventListener("input", function () {
        renderClassPreview();
        connectButtons();
      });
    }

    if (C.useSelectedClassButton && C.useSelectedClassButton.dataset.creatorConnected !== "yes") {
      C.useSelectedClassButton.dataset.creatorConnected = "yes";

      C.useSelectedClassButton.addEventListener("click", function () {
        const selectedClass = getSelectedClassTemplate();

        if (selectedClass && C.classInput) {
          C.classInput.value = selectedClass.name;
        }

        setStatus("Using class: " + (selectedClass ? selectedClass.name : "None"));
      });
    }

    if (C.copySelectedClassJsonButton && C.copySelectedClassJsonButton.dataset.creatorConnected !== "yes") {
      C.copySelectedClassJsonButton.dataset.creatorConnected = "yes";
      C.copySelectedClassJsonButton.addEventListener("click", copySelectedClassJson);
    }

    if (C.applyClassJsonButton && C.applyClassJsonButton.dataset.creatorConnected !== "yes") {
      C.applyClassJsonButton.dataset.creatorConnected = "yes";
      C.applyClassJsonButton.addEventListener("click", applyClassJsonAsDraft);
    }

    if (C.saveClassTemplateButton && C.saveClassTemplateButton.dataset.creatorConnected !== "yes") {
      C.saveClassTemplateButton.dataset.creatorConnected = "yes";
      C.saveClassTemplateButton.addEventListener("click", saveClassTemplateToRoom);
    }
  }


// =====================================================
// CHARACTER CREATOR SECTION 10 — INIT / PUBLIC API
// =====================================================

  function init() {
    renderAll();

    window.HomebrewGodCharacterCreator = api;

    setStatus("Character creator connected. Class builder foundation ready.");
  }

  function stop() {
    stopCharacterListener();
    stopClassListener();
  }

  const api = {
    init,
    stop,

    render: renderAll,

    newCharacter,
    getCharacterFromForm,
    setFormFromCharacter,
    saveCharacter,
    deleteCharacter,

    getAllClassTemplates,
    selectClass,
    getSelectedClassTemplate,
    applyClassJsonAsDraft,
    saveClassTemplateToRoom,

    copyCharacterJson,
    exportCharacterJson,
    importCharacterJson,
    copySelectedClassJson
  };

  init();

  return api;
}
