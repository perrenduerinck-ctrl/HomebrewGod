// =====================================================
// TOKENS SECTION 1 β€” TOKEN SYSTEM EXPORT / DEPENDENCIES
// Firestore subcollection version.
// Tokens live at rooms/{roomCode}/tokens/{tokenId}
// =====================================================

export function createTokenSystem(options) {
  const deps = {
    db: options.db,
    doc: options.doc,
    collection: options.collection,
    addDoc: options.addDoc,
    updateDoc: options.updateDoc,
    deleteDoc: options.deleteDoc,
    getDocs: options.getDocs,
    query: options.query,
    where: options.where,
    onSnapshot: options.onSnapshot,
    serverTimestamp: options.serverTimestamp,

    uploadImage: options.uploadImage,

    getCurrentRoomCode: options.getCurrentRoomCode,
    getCurrentRoomData: options.getCurrentRoomData,
    setCurrentRoomData: options.setCurrentRoomData,
    getCurrentIsDM: options.getCurrentIsDM,

    getPuzzleTiles: options.getPuzzleTiles,
    getActivePuzzleTile: options.getActivePuzzleTile,
    getPuzzleViewMode: options.getPuzzleViewMode,
    buildMapFromRoomFields: options.buildMapFromRoomFields
  };

  const SIZE_MULTIPLIERS = {
    tiny: 0.5,
    small: 1,
    medium: 1,
    large: 2,
    huge: 3,
    gargantuan: 4
  };

  let activeTokenDrag = null;
  let lastRenderedRoom = null;
  let scalePreviewHideTimer = null;

  let tokenUnsubscribe = null;
  let tokenRoomCode = null;
  let tokenCache = [];


// =====================================================
// TOKENS SECTION 2 β€” DOM ELEMENTS / REFRESH
// =====================================================

  const $ = (id) => document.getElementById(id);

  const T = {
    tokenBuilderControls: null,

    tokenMediumSizeInput: null,
    tokenMediumSizeValue: null,
    saveTokenScaleButton: null,

    tokenNameInput: null,
    tokenTypeSelect: null,
    tokenSizeSelect: null,
    tokenImageUploadInput: null,
    addTokenButton: null,
    tokenBuilderStatus: null,

    tokenLayer: null,
    battleMapSurface: null,
    battleMapViewer: null,
    puzzleMapBoard: null
  };

  function refreshElements() {
    T.tokenBuilderControls = $("tokenBuilderControls");

    T.tokenMediumSizeInput = $("tokenMediumSizeInput");
    T.tokenMediumSizeValue = $("tokenMediumSizeValue");
    T.saveTokenScaleButton = $("saveTokenScaleButton");

    T.tokenNameInput = $("tokenNameInput");
    T.tokenTypeSelect = $("tokenTypeSelect");
    T.tokenSizeSelect = $("tokenSizeSelect");
    T.tokenImageUploadInput = $("tokenImageUploadInput");
    T.addTokenButton = $("addTokenButton");
    T.tokenBuilderStatus = $("tokenBuilderStatus");

    T.tokenLayer = $("tokenLayer");
    T.battleMapSurface = $("battleMapSurface");
    T.battleMapViewer = $("battleMapViewer");
    T.puzzleMapBoard = $("puzzleMapBoard");
  }


// =====================================================
// TOKENS SECTION 3 β€” STATUS / BASIC HELPERS
// =====================================================

  function setStatus(message) {
    if (typeof document === "undefined") {
      return;
    }

    refreshElements();

    if (T.tokenBuilderStatus) {
      T.tokenBuilderStatus.textContent = message || "";
    }
  }

  function clampPercent(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return 50;
    }

    return Math.max(0, Math.min(100, number));
  }

  function clampMediumSize(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return 64;
    }

    return Math.max(24, Math.min(240, Math.round(number)));
  }

  function normalizeSizeCategory(sizeCategory) {
    const clean = String(sizeCategory || "").toLowerCase();

    if (SIZE_MULTIPLIERS[clean]) {
      return clean;
    }

    return "medium";
  }

  function sizeCategoryLabel(sizeCategory) {
    const clean = normalizeSizeCategory(sizeCategory);

    if (clean === "tiny") return "Tiny";
    if (clean === "small") return "Small";
    if (clean === "medium") return "Medium";
    if (clean === "large") return "Large";
    if (clean === "huge") return "Huge";
    if (clean === "gargantuan") return "Gargantuan";

    return "Medium";
  }

  function safeTokenType(type) {
    const clean = String(type || "");

    if (["player", "enemy", "npc", "object"].includes(clean)) {
      return clean;
    }

    return "object";
  }

  function safeNumber(value, fallback) {
    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : fallback;
  }

  function getLinkedCharacterId(character) {
    return String(
      character?.firestoreDocumentId ||
      character?.docId ||
      character?.id ||
      ""
    ).trim();
  }

  function getCharacterPortrait(character) {
    const image =
      character?.identity?.image ||
      character?.image ||
      {};

    return {
      url: String(
        image.url ||
        character?.imageUrl ||
        character?.portraitUrl ||
        ""
      ).trim(),
      publicId: String(
        image.publicId ||
        character?.imagePublicId ||
        character?.portraitPublicId ||
        ""
      ).trim()
    };
  }

  function getCharacterLinkedTokenFields(character, roomData) {
    const characterId =
      getLinkedCharacterId(character);

    const portrait =
      getCharacterPortrait(character);

    const name = String(
      character?.identity?.name ||
      character?.name ||
      "Unnamed Character"
    ).trim() || "Unnamed Character";

    const sizeCategory =
      normalizeSizeCategory(
        character?.identity?.size ||
        character?.size ||
        "medium"
      );

    const maximumHp = Math.max(
      1,
      Math.round(
        safeNumber(
          character?.combat?.maxHp ??
          character?.maxHp,
          1
        )
      )
    );

    const currentHp = Math.max(
      0,
      Math.min(
        maximumHp,
        Math.round(
          safeNumber(
            character?.combat?.currentHp ??
            character?.currentHp,
            maximumHp
          )
        )
      )
    );

    const armorClass = Math.max(
      0,
      Math.round(
        safeNumber(
          character?.combat?.armorClass ??
          character?.armorClass,
          10
        )
      )
    );

    const mediumSize =
      getMediumSize(roomData || {});

    return {
      characterId,
      name,
      portrait,
      sizeCategory,
      pixelSize:
        Math.round(
          mediumSize *
          (SIZE_MULTIPLIERS[sizeCategory] || 1)
        ),
      currentHp,
      maximumHp,
      armorClass
    };
  }

  function buildCharacterLinkedTokenPatch(
    character,
    roomData
  ) {
    const fields =
      getCharacterLinkedTokenFields(
        character,
        roomData
      );

    return {
      name: fields.name,
      imageUrl: fields.portrait.url,
      publicId:
        fields.portrait.publicId || null,
      sizeCategory: fields.sizeCategory,
      creatureSize: fields.sizeCategory,
      size: fields.pixelSize,
      armorClass: fields.armorClass,
      ac: fields.armorClass,
      currentHp: fields.currentHp,
      maxHp: fields.maximumHp,
      hp: {
        current: fields.currentHp,
        maximum: fields.maximumHp
      },
      hpAuthority: "character",
      linkedCharacterId:
        fields.characterId,
      sheetId: fields.characterId,
      sourceType: "character",
      linkedCharacter: {
        id: fields.characterId,
        hpAuthority: "character"
      }
    };
  }

  function getLinkedMonsterId(monster) {
    return String(
      monster?.firestoreDocumentId ||
      monster?.docId ||
      monster?.id ||
      ""
    ).trim();
  }

  function buildMonsterLinkedTokenPatch(
    monster,
    roomData
  ) {
    const monsterId =
      getLinkedMonsterId(monster);

    const name = String(
      monster?.name ||
      "Unnamed Monster"
    ).trim() || "Unnamed Monster";

    const sizeCategory =
      normalizeSizeCategory(
        monster?.size ||
        "medium"
      );

    const maximumHp = Math.max(
      1,
      Math.round(
        safeNumber(
          monster?.hp,
          1
        )
      )
    );

    const armorClass = Math.max(
      0,
      Math.round(
        safeNumber(
          monster?.ac,
          10
        )
      )
    );

    const mediumSize =
      getMediumSize(roomData || {});

    return {
      name,
      imageUrl: String(
        monster?.imageUrl ||
        monster?.image?.url ||
        ""
      ).trim(),
      publicId: String(
        monster?.imagePublicId ||
        monster?.image?.publicId ||
        ""
      ).trim() || null,
      sizeCategory,
      creatureSize: sizeCategory,
      size:
        Math.round(
          mediumSize *
          (SIZE_MULTIPLIERS[sizeCategory] || 1)
        ),
      armorClass,
      ac: armorClass,
      currentHp: maximumHp,
      maxHp: maximumHp,
      hp: {
        current: maximumHp,
        maximum: maximumHp
      },
      hpAuthority: "token",
      linkedMonsterId: monsterId,
      sheetId: monsterId,
      sourceType: "monster",
      linkedMonster: {
        id: monsterId,
        hpAuthority: "token"
      }
    };
  }


// =====================================================
// TOKENS SECTION 4 β€” TOKEN STYLES
// Compact token UI + creator menu shell polish
// =====================================================

  function ensureStyles() {
    if (document.getElementById("homebrewGodTokenStyles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "homebrewGodTokenStyles";

    style.textContent = `
      /* =====================================================
         COMPACT BATTLE MANAGER PANELS
      ===================================================== */

      .compactEditorInner {
        padding: 10px !important;
      }

      .toolPanelMini {
        padding: 10px;
        margin: 8px 0;
        border-radius: 14px;
        background:
          radial-gradient(circle at top left, rgba(88, 166, 255, 0.08), transparent 42%),
          linear-gradient(180deg, rgba(12, 17, 35, 0.92), rgba(7, 10, 22, 0.94));
        border: 1px solid rgba(116, 138, 255, 0.20);
        box-shadow:
          inset 0 0 0 1px rgba(255, 255, 255, 0.025),
          0 8px 20px rgba(0, 0, 0, 0.22);
      }

      .toolPanelMini h3 {
        margin: 0 0 8px 0 !important;
        font-size: 15px !important;
        letter-spacing: 0.02em;
        color: #e7ecff;
      }

      .toolPanelMini .small,
      .tokenScaleHint {
        margin: 5px 0 !important;
        color: #aeb8df !important;
        font-size: 12px !important;
        line-height: 1.35 !important;
      }

      .toolPanelMini hr,
      .compactEditorInner hr {
        width: 100%;
        border: 0;
        border-top: 1px solid rgba(116, 138, 255, 0.16);
        margin: 8px 0;
      }

      /* =====================================================
         TOKEN BUILDER COMPACT ROWS
      ===================================================== */

      .tokenScaleCompactRow,
      .tokenAddCompactRow {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }

      #tokenMediumSizeInput {
        width: min(320px, 100%) !important;
        display: inline-block !important;
        margin: 4px 6px !important;
        accent-color: #9d6bff;
        vertical-align: middle;
      }

      #saveTokenScaleButton,
      #addTokenButton {
        width: auto !important;
        min-width: 110px !important;
        padding: 8px 12px !important;
        margin: 4px !important;
        font-size: 14px !important;
      }

      #tokenNameInput {
        width: 180px !important;
        max-width: 100% !important;
      }

      #tokenImageUploadInput {
        width: 220px !important;
        max-width: 100% !important;
      }

      #tokenTypeSelect,
      #tokenSizeSelect {
        display: inline-block !important;
        width: 150px !important;
        max-width: 100% !important;
        min-height: auto !important;
        height: auto !important;
        padding: 9px 10px !important;
        margin: 4px !important;
        font-size: 14px !important;
        color: #f5f7ff !important;
        background: linear-gradient(180deg, rgba(19, 26, 49, 0.95), rgba(12, 17, 33, 0.96)) !important;
        border: 1px solid rgba(116, 138, 255, 0.24) !important;
        border-radius: 12px !important;
        outline: none !important;
        vertical-align: middle !important;
      }

      #tokenTypeSelect option,
      #tokenSizeSelect option {
        color: #ffffff;
        background: #101528;
      }

      #tokenScalePreview {
        display: none !important;
      }

      #tokenBuilderStatus,
      #monsterCreatorStatus,
      #characterCreatorStatus {
        margin: 7px 0 0 0 !important;
        font-size: 12px !important;
      }

      /* =====================================================
         MONSTER / CHARACTER CREATOR SHELLS
      ===================================================== */

      .creatorMenuGrid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
        gap: 10px;
        align-items: start;
      }

      #monsterCreatorControls input,
      #monsterCreatorControls select,
      #monsterCreatorControls textarea,
      #characterCreatorControls input,
      #characterCreatorControls select,
      #characterCreatorControls textarea {
        width: 100% !important;
        box-sizing: border-box !important;
        margin: 4px 0 !important;
      }

      #monsterCreatorControls textarea,
      #characterCreatorControls textarea {
        min-height: 105px;
        resize: vertical;
      }

      .statMiniGrid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
      }

      .statMiniGrid input {
        text-align: center;
      }

      .creatorButtonRow {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 8px;
      }

      .creatorButtonRow button {
        width: auto !important;
        flex: 1 1 150px;
        padding: 8px 10px !important;
        margin: 0 !important;
        font-size: 13px !important;
      }

      /* =====================================================
         TOKEN LAYER / MAP SCALE PREVIEW
      ===================================================== */

      #tokenLayer {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: nonοήω¶‰ΛkΊwµη@€€τ4(4(€€€€€½ΉΝΠΉ…µ”€τPΉΡ½­•Ή9…µ•%ΉΑΥΠ€PΉΡ½­•Ή9…µ•%ΉΑΥΠΉΩ…±Υ”ΉΡΙ¥΄ ¤4(€€€€€€€€όPΉΡ½­•Ή9…µ•%ΉΑΥΠΉΩ…±Υ”ΉΡΙ¥΄ ¤4(€€€€€€€€θ€‰UΉΉ…µ•Q½­•Έμ4(4(€€€€€½ΉΝΠΡεΑ”€τPΉΡ½­•ΉQεΑ•M•±•Π€PΉΡ½­•ΉQεΑ•M•±•ΠΉΩ…±Υ”4(€€€€€€€€όΝ…™•Q½­•ΉQεΑ”΅PΉΡ½­•ΉQεΑ•M•±•ΠΉΩ…±Υ”¤4(€€€€€€€€θ€‰½‰©•Πμ4(4(€€€€€½ΉΝΠΝ¥ι•…Ρ•½Ιδ€τPΉΡ½­•ΉM¥ι•M•±•Π€PΉΡ½­•ΉM¥ι•M•±•ΠΉΩ…±Υ”4(€€€€€€€€όΉ½Ιµ…±¥ι•M¥ι•…Ρ•½Ιδ΅PΉΡ½­•ΉM¥ι•M•±•ΠΉΩ…±Υ”¤4(€€€€€€€€θ€‰µ•‘¥Υ΄μ4(4(€€€€€¥€ …‘•ΑΜΉΥΑ±½…‘%µ…”¤μ4(€€€€€€€…±•ΙΠ ‰Q½­•ΈΥΑ±½…‘•Θ¥ΜΉ½Π½ΉΉ•Ρ•Έ¤μ4(€€€€€€€Ι•ΡΥΙΈμ4(€€€€€τ4(4(€€€€€Ι•µ½Ω•5…ΑM…±•AΙ•Ω¥•ά ¤μ4(€€€€€Ν•ΡMΡ…ΡΥΜ ‰UΑ±½…‘¥ΉΡ½­•ΈΈΈΈ¤μ4(4(€€€€€¥€΅PΉ…‘‘Q½­•Ή	ΥΡΡ½Έ¤μ4(€€€€€€€PΉ…‘‘Q½­•Ή	ΥΡΡ½ΈΉ‘¥Ν…‰±•€τΡΙΥ”μ4(€€€€€τ4(4(€€€€€½ΉΝΠ±½Υ‘¥Ή…ΙεI•ΝΥ±Π€τ…έ…¥Π‘•ΑΜΉΥΑ±½…‘%µ…”΅™¥±”¤μ4(€€€€€½ΉΝΠµ•‘¥ΥµM¥ι”€τ•Ρ5•‘¥ΥµM¥ι”΅Ι½½µ…Ρ„ρπντ¤μ4(4(€€€€€½ΉΝΠΉ•έQ½­•Έ€τμ4(€€€€€€€Ή…µ”°4(€€€€€€€ΡεΑ”°4(€€€€€€€¥µ…•UΙ°θ±½Υ‘¥Ή…ΙεI•ΝΥ±ΠΉΝ•ΥΙ•}ΥΙ°°4(€€€€€€€ΑΥ‰±¥%θ±½Υ‘¥Ή…ΙεI•ΝΥ±ΠΉΑΥ‰±¥}¥°4(€€€€€€€ΰθ€Τΐ°4(€€€€€€€δθ€Τΐ°4(€€€€€€€µ…Α5½‘”θΡ…Ι•ΠΉµ…Α5½‘”°4(€€€€€€€Ρ¥±•-•δθΡ…Ι•ΠΉΡ¥±•-•δ°4(€€€€€€€Ν¥ι•…Ρ•½Ιδ°4(€€€€€€€Ι•…ΡΥΙ•M¥ι”θΝ¥ι•…Ρ•½Ιδ°4(€€€€€€€Ν¥ι”θ5…Ρ ΉΙ½ΥΉ΅µ•‘¥ΥµM¥ι”€¨€΅M%i}5U1Q%A1%IMmΝ¥ι•…Ρ•½Ιεtρπ€Δ¤¤°4(€€€€€€€Ν΅••Ρ%θΉΥ±°°4(€€€€€€€‘¥ΝΑ±…δθμ4(€€€€€€€€€Ή…µ”θΡΙΥ”°4(€€€€€€€€€΅Α	…Θθ™…±Ν”°4(€€€€€€€€€΅ΑQ•αΠθ™…±Ν”°4(€€€€€€€€€…θ™…±Ν”°4(€€€€€€€€€½Ή‘¥Ρ¥½ΉΜθΡΙΥ”°4(€€€€€€€€€¥Ή¥Ρ¥…Ρ¥Ω”θ™…±Ν”4(€€€€€€€τ°4(€€€€€€€Ι•…Ρ•‘Ρ5¥±±¥Μθ…Ρ”ΉΉ½ά ¤°4(€€€€€€€ΥΑ‘…Ρ•‘Ρ5¥±±¥Μθ…Ρ”ΉΉ½ά ¤°4(€€€€€€€Ι•…Ρ•‘Πθ‘•ΑΜΉΝ•ΙΩ•ΙQ¥µ•ΝΡ…µΐ ¤°4(€€€€€€€ΥΑ‘…Ρ•‘Πθ‘•ΑΜΉΝ•ΙΩ•ΙQ¥µ•ΝΡ…µΐ ¤4(€€€€€τμ4(4(€€€€€…έ…¥Π‘•ΑΜΉ…‘‘½ 4(€€€€€€€‘•ΑΜΉ½±±•Ρ¥½Έ΅‘•ΑΜΉ‘°€‰Ι½½µΜ°Ι½½µ½‘”°€‰Ρ½­•ΉΜ¤°4(€€€€€€€Ή•έQ½­•Έ4(€€€€€€¤μ4(4(€€€€€¥€΅PΉΡ½­•Ή9…µ•%ΉΑΥΠ¤μ4(€€€€€€€PΉΡ½­•Ή9…µ•%ΉΑΥΠΉΩ…±Υ”€τ€μ4(€€€€€τ4(4(€€€€€¥€΅PΉΡ½­•Ή%µ…•UΑ±½…‘%ΉΑΥΠ¤μ4(€€€€€€€PΉΡ½­•Ή%µ…•UΑ±½…‘%ΉΑΥΠΉΩ…±Υ”€τ€μ4(€€€€€τ4(4(€€€€€Ν•ΡMΡ…ΡΥΜ΅Ν¥ι•…Ρ•½Ιε1…‰•°΅Ν¥ι•…Ρ•½Ιδ¤€¬€Ρ½­•Έ…‘‘•Έ¤μ4(€€€τ…Ρ €΅•ΙΙ½Θ¤μ4(€€€€€½ΉΝ½±”Ή•ΙΙ½Θ΅•ΙΙ½Θ¤μ4(€€€€€Ν•ΡMΡ…ΡΥΜ ‰Q½­•ΈΥΑ±½…™…¥±•Έ¤μ4(€€€€€…±•ΙΠ΅•ΙΙ½ΘΉµ•ΝΝ…”¤μ4(€€€τ™¥Ή…±±δμ4(€€€€€Ι•™Ι•Ν΅±•µ•ΉΡΜ ¤μ4(4(€€€€€¥€΅PΉ…‘‘Q½­•Ή	ΥΡΡ½Έ¤μ4(€€€€€€€PΉ…‘‘Q½­•Ή	ΥΡΡ½ΈΉ‘¥Ν…‰±•€τ™…±Ν”μ4(€€€€€τ4(€€€τ4(€τ4(4(€…ΝεΉ™ΥΉΡ¥½ΈΙ•…Ρ•΅…Ι…Ρ•Ι1¥Ή­•‘Q½­•Έ (€€€΅…Ι…Ρ•Θ(€€¤μ(€€€½ΉΝΠΙ½½µ½‘”€τ4(€€€€€‘•ΑΜΉ•ΡΥΙΙ•ΉΡI½½µ½‘”4(€€€€€€€€ό‘•ΑΜΉ•ΡΥΙΙ•ΉΡI½½µ½‘” ¤4(€€€€€€€€θΉΥ±°μ4(4(€€€½ΉΝΠΙ½½µ…Ρ„€τ4(€€€€€‘•ΑΜΉ•ΡΥΙΙ•ΉΡI½½µ…Ρ„4(€€€€€€€€ό‘•ΑΜΉ•ΡΥΙΙ•ΉΡI½½µ…Ρ„ ¤4(€€€€€€€€θΉΥ±°μ4(4(€€€½ΉΝΠ¥Ν4€τ4(€€€€€‘•ΑΜΉ•ΡΥΙΙ•ΉΡ%Ν44(€€€€€€€€ό‘•ΑΜΉ•ΡΥΙΙ•ΉΡ%Ν4 ¤4(€€€€€€€€θ™…±Ν”μ4(4(€€€¥€ …Ι½½µ½‘”¤μ4(€€€€€Ρ΅Ι½άΉ•άΙΙ½Θ 4(€€€€€€€€‰=Α•Έ„Ι½½΄‰•™½Ι”Ι•…Ρ¥Ή„±¥Ή­•Ρ½­•ΈΈ4(€€€€€€¤μ4(€€€τ4(4(€€€¥€ …¥Ν4¤μ4(€€€€€Ρ΅Ι½άΉ•άΙΙ½Θ 4(€€€€€€€€‰=Ή±δΡ΅”4…ΈΙ•…Ρ”΅…Ι…Ρ•Θµ±¥Ή­•Ρ½­•ΉΜΈ4(€€€€€€¤μ4(€€€τ4(4(€€€½ΉΝΠ™¥•±‘Μ€τ4(€€€€€•Ρ΅…Ι…Ρ•Ι1¥Ή­•‘Q½­•Ή¥•±‘Μ 4(€€€€€€€΅…Ι…Ρ•Θ°4(€€€€€€€Ι½½µ…Ρ„ρπντ4(€€€€€€¤μ4(4(€€€¥€ …™¥•±‘ΜΉ΅…Ι…Ρ•Ι%¤μ4(€€€€€Ρ΅Ι½άΉ•άΙΙ½Θ 4(€€€€€€€€‰M…Ω”Ρ΅”΅…Ι…Ρ•Θ‰•™½Ι”Ι•…Ρ¥Ή¥ΡΜ±¥Ή­•Ρ½­•ΈΈ4(€€€€€€¤μ4(€€€τ4(4(€€€¥€ …™¥•±‘ΜΉΑ½ΙΡΙ…¥ΠΉΥΙ°¤μ4(€€€€€Ρ΅Ι½άΉ•άΙΙ½Θ 4(€€€€€€€€‰‘…ΉΝ…Ω”„΅…Ι…Ρ•ΘΑ½ΙΡΙ…¥Π‰•™½Ι”Ι•…Ρ¥Ή¥ΡΜ±¥Ή­•Ρ½­•ΈΈ4(€€€€€€¤μ4(€€€τ4(4(€€€½ΉΝΠΡ…Ι•Π€τ4(€€€€€•ΡΥΙΙ•ΉΡQ½­•ΉQ…Ι•Π 4(€€€€€€€Ι½½µ…Ρ„ρπντ4(€€€€€€¤μ4(4(€€€¥€ …Ρ…Ι•ΠΉµ…Α5½‘”¤μ4(€€€€€Ρ΅Ι½άΉ•άΙΙ½Θ 4(€€€€€€€€‰1½…„‰…ΡΡ±”µ…ΐ½ΘΑΥιι±”µ…ΐ‰•™½Ι”Ι•…Ρ¥ΉΡ΅”±¥Ή­•Ρ½­•ΈΈ4(€€€€€€¤μ4(€€€τ4(4(€€€½ΉΝΠΡ¥µ•ΝΡ…µΑ5¥±±¥Μ€τ…Ρ”ΉΉ½ά ¤μ4(4(€€€½ΉΝΠΉ•έQ½­•Έ€τμ4(€€€€€€ΈΈΉ‰Υ¥±‘΅…Ι…Ρ•Ι1¥Ή­•‘Q½­•ΉA…Ρ  4(€€€€€€€΅…Ι…Ρ•Θ°4(€€€€€€€Ι½½µ…Ρ„ρπντ4(€€€€€€¤°4(€€€€€ΡεΑ”θ€‰Α±…ε•Θ°4(€€€€€ΰθ€Τΐ°4(€€€€€δθ€Τΐ°4(€€€€€µ…Α5½‘”θΡ…Ι•ΠΉµ…Α5½‘”°4(€€€€€Ρ¥±•-•δθΡ…Ι•ΠΉΡ¥±•-•δ°4(€€€€€‘¥ΝΑ±…δθμ4(€€€€€€€Ή…µ”θΡΙΥ”°4(€€€€€€€΅Α	…ΘθΡΙΥ”°4(€€€€€€€΅ΑQ•αΠθΡΙΥ”°4(€€€€€€€…θΡΙΥ”°4(€€€€€€€½Ή‘¥Ρ¥½ΉΜθΡΙΥ”°4(€€€€€€€¥Ή¥Ρ¥…Ρ¥Ω”θ™…±Ν”4(€€€€€τ°4(€€€€€Ι•…Ρ•‘Ρ5¥±±¥ΜθΡ¥µ•ΝΡ…µΑ5¥±±¥Μ°4(€€€€€ΥΑ‘…Ρ•‘Ρ5¥±±¥ΜθΡ¥µ•ΝΡ…µΑ5¥±±¥Μ°4(€€€€€Ι•…Ρ•‘Πθ‘•ΑΜΉΝ•ΙΩ•ΙQ¥µ•ΝΡ…µΐ ¤°4(€€€€€ΥΑ‘…Ρ•‘Πθ‘•ΑΜΉΝ•ΙΩ•ΙQ¥µ•ΝΡ…µΐ ¤4(€€€τμ4(4(€€€½ΉΝΠΙ•…Ρ•‘½Υµ•ΉΠ€τ4(€€€€€…έ…¥Π‘•ΑΜΉ…‘‘½ 4(€€€€€€€‘•ΑΜΉ½±±•Ρ¥½Έ 4(€€€€€€€€€‘•ΑΜΉ‘°4(€€€€€€€€€€‰Ι½½µΜ°4(€€€€€€€€€Ι½½µ½‘”°4(€€€€€€€€€€‰Ρ½­•ΉΜ4(€€€€€€€€¤°4(€€€€€€€Ή•έQ½­•Έ4(€€€€€€¤μ4(4(€€€Ν•ΡMΡ…ΡΥΜ 4(€€€€€™¥•±‘ΜΉΉ…µ”€¬4(€€€€€€±¥Ή­•Ρ½­•ΈΙ•…Ρ•Έ΅…Ι…Ρ•Θ!@¥Μ…ΥΡ΅½Ι¥Ρ…Ρ¥Ω”Έ4(€€€€¤μ4(4(€€€Ι•ΡΥΙΈΉ½Ιµ…±¥ι•Q½­•Έ΅μ(€€€€€€ΈΈΉΉ•έQ½­•Έ°(€€€€€¥θΙ•…Ρ•‘½Υµ•ΉΠόΉ¥ρπΉΥ±°(€€€τ¤μ(€τ((€…ΝεΉ™ΥΉΡ¥½ΈΙ•…Ρ•5½ΉΝΡ•Ι1¥Ή­•‘Q½­•Έ (€€€µ½ΉΝΡ•Θ(€€¤μ(€€€½ΉΝΠΙ½½µ½‘”€τ(€€€€€‘•ΑΜΉ•ΡΥΙΙ•ΉΡI½½µ½‘”(€€€€€€€€ό‘•ΑΜΉ•ΡΥΙΙ•ΉΡI½½µ½‘” ¤(€€€€€€€€θΉΥ±°μ((€€€½ΉΝΠΙ½½µ…Ρ„€τ(€€€€€‘•ΑΜΉ•ΡΥΙΙ•ΉΡI½½µ…Ρ„(€€€€€€€€ό‘•ΑΜΉ•ΡΥΙΙ•ΉΡI½½µ…Ρ„ ¤(€€€€€€€€θΉΥ±°μ((€€€½ΉΝΠ¥Ν4€τ(€€€€€‘•ΑΜΉ•ΡΥΙΙ•ΉΡ%Ν4(€€€€€€€€ό‘•ΑΜΉ•ΡΥΙΙ•ΉΡ%Ν4 ¤(€€€€€€€€θ™…±Ν”μ((€€€¥€ …Ι½½µ½‘”¤μ(€€€€€Ρ΅Ι½άΉ•άΙΙ½Θ (€€€€€€€€‰=Α•Έ„Ι½½΄‰•™½Ι”Ι•…Ρ¥Ή„µ½ΉΝΡ•ΘΡ½­•ΈΈ(€€€€€€¤μ(€€€τ((€€€¥€ …¥Ν4¤μ(€€€€€Ρ΅Ι½άΉ•άΙΙ½Θ (€€€€€€€€‰=Ή±δΡ΅”4…ΈΙ•…Ρ”µ½ΉΝΡ•ΘΡ½­•ΉΜΈ(€€€€€€¤μ(€€€τ((€€€½ΉΝΠΑ…Ρ €τ(€€€€€‰Υ¥±‘5½ΉΝΡ•Ι1¥Ή­•‘Q½­•ΉA…Ρ  (€€€€€€€µ½ΉΝΡ•Θ°(€€€€€€€Ι½½µ…Ρ„ρπντ(€€€€€€¤μ((€€€¥€ …Α…Ρ Ή±¥Ή­•‘5½ΉΝΡ•Ι%¤μ(€€€€€Ρ΅Ι½άΉ•άΙΙ½Θ (€€€€€€€€‰M…Ω”Ρ΅”µ½ΉΝΡ•Θ‰•™½Ι”Ι•…Ρ¥Ή¥ΡΜΡ½­•ΈΈ(€€€€€€¤μ(€€€τ((€€€½ΉΝΠΡ…Ι•Π€τ(€€€€€•ΡΥΙΙ•ΉΡQ½­•ΉQ…Ι•Π (€€€€€€€Ι½½µ…Ρ„ρπντ(€€€€€€¤μ((€€€¥€ …Ρ…Ι•ΠΉµ…Α5½‘”¤μ(€€€€€Ρ΅Ι½άΉ•άΙΙ½Θ (€€€€€€€€‰1½…„‰…ΡΡ±”µ…ΐ½ΘΑΥιι±”µ…ΐ‰•™½Ι”Ι•…Ρ¥ΉΡ΅”µ½ΉΝΡ•ΘΡ½­•ΈΈ(€€€€€€¤μ(€€€τ((€€€½ΉΝΠΡ¥µ•ΝΡ…µΑ5¥±±¥Μ€τ…Ρ”ΉΉ½ά ¤μ((€€€½ΉΝΠΉ•έQ½­•Έ€τμ(€€€€€€ΈΈΉΑ…Ρ °(€€€€€ΡεΑ”θ€‰•Ή•µδ°(€€€€€ΰθ€Τΐ°(€€€€€δθ€Τΐ°(€€€€€µ…Α5½‘”θΡ…Ι•ΠΉµ…Α5½‘”°(€€€€€Ρ¥±•-•δθΡ…Ι•ΠΉΡ¥±•-•δ°(€€€€€‘¥ΝΑ±…δθμ(€€€€€€€Ή…µ”θΡΙΥ”°(€€€€€€€΅Α	…ΘθΡΙΥ”°(€€€€€€€΅ΑQ•αΠθΡΙΥ”°(€€€€€€€…θΡΙΥ”°(€€€€€€€½Ή‘¥Ρ¥½ΉΜθΡΙΥ”°(€€€€€€€¥Ή¥Ρ¥…Ρ¥Ω”θ™…±Ν”(€€€€€τ°(€€€€€Ι•…Ρ•‘Ρ5¥±±¥ΜθΡ¥µ•ΝΡ…µΑ5¥±±¥Μ°(€€€€€ΥΑ‘…Ρ•‘Ρ5¥±±¥ΜθΡ¥µ•ΝΡ…µΑ5¥±±¥Μ°(€€€€€Ι•…Ρ•‘Πθ‘•ΑΜΉΝ•ΙΩ•ΙQ¥µ•ΝΡ…µΐ ¤°(€€€€€ΥΑ‘…Ρ•‘Πθ‘•ΑΜΉΝ•ΙΩ•ΙQ¥µ•ΝΡ…µΐ ¤(€€€τμ((€€€½ΉΝΠΙ•…Ρ•‘½Υµ•ΉΠ€τ(€€€€€…έ…¥Π‘•ΑΜΉ…‘‘½ (€€€€€€€‘•ΑΜΉ½±±•Ρ¥½Έ (€€€€€€€€€‘•ΑΜΉ‘°(€€€€€€€€€€‰Ι½½µΜ°(€€€€€€€€€Ι½½µ½‘”°(€€€€€€€€€€‰Ρ½­•ΉΜ(€€€€€€€€¤°(€€€€€€€Ή•έQ½­•Έ(€€€€€€¤μ((€€€Ν•ΡMΡ…ΡΥΜ (€€€€€Α…Ρ ΉΉ…µ”€¬(€€€€€€µ½ΉΝΡ•ΘΡ½­•ΈΙ•…Ρ•Έ(€€€€¤μ((€€€Ι•ΡΥΙΈΉ½Ιµ…±¥ι•Q½­•Έ΅μ(€€€€€€ΈΈΉΉ•έQ½­•Έ°(€€€€€¥θΙ•…Ρ•‘½Υµ•ΉΠόΉ¥ρπΉΥ±°(€€€τ¤μ(€τ(4(€…ΝεΉ™ΥΉΡ¥½ΈΝεΉ1¥Ή­•‘΅…Ι…Ρ•ΙQ½­•ΉΜ 4(€€€΅…Ι…Ρ•Θ4(€€¤μ4(€€€½ΉΝΠΙ½½µ½‘”€τ4(€€€€€‘•ΑΜΉ•ΡΥΙΙ•ΉΡI½½µ½‘”4(€€€€€€€€ό‘•ΑΜΉ•ΡΥΙΙ•ΉΡI½½µ½‘” ¤4(€€€€€€€€θΉΥ±°μ4(4(€€€½ΉΝΠΙ½½µ…Ρ„€τ4(€€€€€‘•ΑΜΉ•ΡΥΙΙ•ΉΡI½½µ…Ρ„4(€€€€€€€€ό‘•ΑΜΉ•ΡΥΙΙ•ΉΡI½½µ…Ρ„ ¤4(€€€€€€€€θΉΥ±°μ4(4(€€€½ΉΝΠ΅…Ι…Ρ•Ι%€τ4(€€€€€•Ρ1¥Ή­•‘΅…Ι…Ρ•Ι%΅΅…Ι…Ρ•Θ¤μ4(4(€€€¥€ …Ι½½µ½‘”ρπ€…΅…Ι…Ρ•Ι%¤μ4(€€€€€Ι•ΡΥΙΈμ4(€€€€€€€΅…Ι…Ρ•Ι%°4(€€€€€€€ΥΑ‘…Ρ•‘½ΥΉΠθ€ΐ4(€€€€€τμ4(€€€τ4(4(€€€¥€ 4(€€€€€ΡεΑ•½‘•ΑΜΉ•Ρ½Μ€„ττ€‰™ΥΉΡ¥½Έρπ4(€€€€€ΡεΑ•½‘•ΑΜΉΕΥ•Ιδ€„ττ€‰™ΥΉΡ¥½Έρπ4(€€€€€ΡεΑ•½‘•ΑΜΉέ΅•Ι”€„ττ€‰™ΥΉΡ¥½Έ4(€€€€¤μ4(€€€€€Ρ΅Ι½άΉ•άΙΙ½Θ 4(€€€€€€€€‰1¥Ή­•µΡ½­•ΈΝεΉ΅Ι½Ή¥ι…Ρ¥½Έ¥Μµ¥ΝΝ¥Ή¥ΡΜ¥Ι•ΝΡ½Ι”ΕΥ•ΙδΡ½½±ΜΈ4(€€€€€€¤μ4(€€€τ4(4(€€€½ΉΝΠ±¥Ή­•‘Q½­•ΉΝMΉ…ΑΝ΅½Π€τ4(€€€€€…έ…¥Π‘•ΑΜΉ•Ρ½Μ 4(€€€€€€€‘•ΑΜΉΕΥ•Ιδ 4(€€€€€€€€€‘•ΑΜΉ½±±•Ρ¥½Έ 4(€€€€€€€€€€€‘•ΑΜΉ‘°4(€€€€€€€€€€€€‰Ι½½µΜ°4(€€€€€€€€€€€Ι½½µ½‘”°4(€€€€€€€€€€€€‰Ρ½­•ΉΜ4(€€€€€€€€€€¤°4(€€€€€€€€€‘•ΑΜΉέ΅•Ι” 4(€€€€€€€€€€€€‰±¥Ή­•‘΅…Ι…Ρ•Ι%°4(€€€€€€€€€€€€ττ°4(€€€€€€€€€€€΅…Ι…Ρ•Ι%4(€€€€€€€€€€¤4(€€€€€€€€¤4(€€€€€€¤μ4(4(€€€½ΉΝΠ±¥Ή­•‘Q½­•Ή½Υµ•ΉΡΜ€τ4(€€€€€ΙΙ…δΉ¥ΝΙΙ…δ 4(€€€€€€€±¥Ή­•‘Q½­•ΉΝMΉ…ΑΝ΅½ΠόΉ‘½Μ4(€€€€€€¤4(€€€€€€€€ό±¥Ή­•‘Q½­•ΉΝMΉ…ΑΝ΅½ΠΉ‘½Μ4(€€€€€€€€θmtμ4(4(€€€¥€ …±¥Ή­•‘Q½­•Ή½Υµ•ΉΡΜΉ±•ΉΡ ¤μ4(€€€€€Ι•ΡΥΙΈμ4(€€€€€€€΅…Ι…Ρ•Ι%°4(€€€€€€€ΥΑ‘…Ρ•‘½ΥΉΠθ€ΐ4(€€€€€τμ4(€€€τ4(4(€€€½ΉΝΠΥΑ‘…Ρ•‘Ρ5¥±±¥Μ€τ…Ρ”ΉΉ½ά ¤μ4(4(€€€½ΉΝΠΥΑ‘…Ρ•A…Ρ €τμ4(€€€€€€ΈΈΉ‰Υ¥±‘΅…Ι…Ρ•Ι1¥Ή­•‘Q½­•ΉA…Ρ  4(€€€€€€€΅…Ι…Ρ•Θ°4(€€€€€€€Ι½½µ…Ρ„ρπντ4(€€€€€€¤°4(€€€€€ΥΑ‘…Ρ•‘Ρ5¥±±¥Μ°4(€€€€€ΥΑ‘…Ρ•‘Πθ‘•ΑΜΉΝ•ΙΩ•ΙQ¥µ•ΝΡ…µΐ ¤4(€€€τμ4(4(€€€…έ…¥ΠAΙ½µ¥Ν”Ή…±° 4(€€€€€±¥Ή­•‘Q½­•Ή½Υµ•ΉΡΜΉµ…ΐ ΅Ρ½­•Ή½Υµ•ΉΠ¤€τψμ4(€€€€€€€Ι•ΡΥΙΈ‘•ΑΜΉΥΑ‘…Ρ•½ 4(€€€€€€€€€Ρ½­•Ή½Υµ•ΉΠΉΙ•ρπ4(€€€€€€€€€‘•ΑΜΉ‘½ 4(€€€€€€€€€€€‘•ΑΜΉ‘°4(€€€€€€€€€€€€‰Ι½½µΜ°4(€€€€€€€€€€€Ι½½µ½‘”°4(€€€€€€€€€€€€‰Ρ½­•ΉΜ°4(€€€€€€€€€€€Ρ½­•Ή½Υµ•ΉΠΉ¥4(€€€€€€€€€€¤°4(€€€€€€€€€ΥΑ‘…Ρ•A…Ρ 4(€€€€€€€€¤μ4(€€€€€τ¤4(€€€€¤μ4(4(€€€Ρ½­•Ή…΅”€τΡ½­•Ή…΅”Ήµ…ΐ ΅Ρ½­•Έ¤€τψμ4(€€€€€¥€ 4(€€€€€€€MΡΙ¥Ή 4(€€€€€€€€€Ρ½­•ΈόΉ±¥Ή­•‘΅…Ι…Ρ•Ι%ρπ4(€€€€€€€€€Ρ½­•ΈόΉ±¥Ή­•‘΅…Ι…Ρ•ΘόΉ¥ρπ4(€€€€€€€€€Ρ½­•ΈόΉΝ΅••Ρ%ρπ4(€€€€€€€€€€4(€€€€€€€€¤ΉΡΙ¥΄ ¤€„ττ4(€€€€€€€΅…Ι…Ρ•Ι%4(€€€€€€¤μ4(€€€€€€€Ι•ΡΥΙΈΡ½­•Έμ4(€€€€€τ4(4(€€€€€Ι•ΡΥΙΈΉ½Ιµ…±¥ι•Q½­•Έ΅μ4(€€€€€€€€ΈΈΉΡ½­•Έ°4(€€€€€€€€ΈΈΉΥΑ‘…Ρ•A…Ρ 4(€€€€€τ¤μ4(€€€τ¤μ4(4(€€€Ι•ΡΥΙΈμ4(€€€€€΅…Ι…Ρ•Ι%°4(€€€€€ΥΑ‘…Ρ•‘½ΥΉΠθ4(€€€€€€€±¥Ή­•‘Q½­•Ή½Υµ•ΉΡΜΉ±•ΉΡ 4(€€€τμ4(€τ4(4(€…ΝεΉ™ΥΉΡ¥½Έ‘•±•Ρ•Q½­•Έ΅Ρ½­•Ή%¤μ4(€€€ΡΙδμ4(€€€€€½ΉΝΠΙ½½µ½‘”€τ‘•ΑΜΉ•ΡΥΙΙ•ΉΡI½½µ½‘”€ό‘•ΑΜΉ•ΡΥΙΙ•ΉΡI½½µ½‘” ¤€θΉΥ±°μ4(€€€€€½ΉΝΠ¥Ν4€τ‘•ΑΜΉ•ΡΥΙΙ•ΉΡ%Ν4€ό‘•ΑΜΉ•ΡΥΙΙ•ΉΡ%Ν4 ¤€θ™…±Ν”μ4(4(€€€€€¥€ …Ι½½µ½‘”ρπ€…¥Ν4¤μ4(€€€€€€€…±•ΙΠ ‰=Ή±δΡ΅”4…Έ‘•±•Ρ”Ρ½­•ΉΜΈ¤μ4(€€€€€€€Ι•ΡΥΙΈμ4(€€€€€τ4(4(€€€€€¥€ …½Ή™¥Ι΄ ‰•±•Ρ”Ρ΅¥ΜΡ½­•ΈόQ΅¥Μ‘½•ΜΉ½Π‘•±•Ρ”Ρ΅”¥µ…”™Ι½΄±½Υ‘¥Ή…ΙδΈ¤¤μ4(€€€€€€€Ι•ΡΥΙΈμ4(€€€€€τ4(4(€€€€€…έ…¥Π‘•ΑΜΉ‘•±•Ρ•½ 4(€€€€€€€‘•ΑΜΉ‘½΅‘•ΑΜΉ‘°€‰Ι½½µΜ°Ι½½µ½‘”°€‰Ρ½­•ΉΜ°Ρ½­•Ή%¤4(€€€€€€¤μ4(4(€€€€€Ν•ΡMΡ…ΡΥΜ ‰Q½­•Έ‘•±•Ρ•Έ¤μ4(€€€τ…Ρ €΅•ΙΙ½Θ¤μ4(€€€€€½ΉΝ½±”Ή•ΙΙ½Θ΅•ΙΙ½Θ¤μ4(€€€€€…±•ΙΠ΅•ΙΙ½ΘΉµ•ΝΝ…”¤μ4(€€€τ4(€τ4(4(4(ΌΌ€τττττττττττττττττττττττττττττττττττττττττττττττττττττ4(ΌΌQ=-9LMQ%=8€ΔΜƒPQ=-8I%94(ΌΌ9ΌΙ½½΄‘½Υµ•ΉΠΥΑ‘…Ρ•ΜΈ4(ΌΌM…Ω•Μ½Ή±δΙ½½µΜ½νΙ½½µ½‘•τ½Ρ½­•ΉΜ½νΡ½­•Ή%‘τ4(ΌΌ€τττττττττττττττττττττττττττττττττττττττττττττττττττττ4(4(€…ΝεΉ™ΥΉΡ¥½ΈΝ…Ω•Q½­•ΉA½Ν¥Ρ¥½Έ΅Ρ½­•Ή%°ΰ°δ¤μ4(€€€½ΉΝΠΙ½½µ½‘”€τ‘•ΑΜΉ•ΡΥΙΙ•ΉΡI½½µ½‘”€ό‘•ΑΜΉ•ΡΥΙΙ•ΉΡI½½µ½‘” ¤€θΉΥ±°μ4(€€€½ΉΝΠ¥Ν4€τ‘•ΑΜΉ•ΡΥΙΙ•ΉΡ%Ν4€ό‘•ΑΜΉ•ΡΥΙΙ•ΉΡ%Ν4 ¤€θ™…±Ν”μ4(4(€€€¥€ …Ι½½µ½‘”ρπ€…¥Ν4ρπ€…Ρ½­•Ή%¤μ4(€€€€€Ι•ΡΥΙΈμ4(€€€τ4(4(€€€…έ…¥Π‘•ΑΜΉΥΑ‘…Ρ•½ 4(€€€€€‘•ΑΜΉ‘½΅‘•ΑΜΉ‘°€‰Ι½½µΜ°Ι½½µ½‘”°€‰Ρ½­•ΉΜ°Ρ½­•Ή%¤°4(€€€€€μ4(€€€€€€€ΰθ±…µΑA•Ι•ΉΠ΅ΰ¤°4(€€€€€€€δθ±…µΑA•Ι•ΉΠ΅δ¤°4(€€€€€€€µ½Ω•‘Ρ5¥±±¥Μθ…Ρ”ΉΉ½ά ¤°4(€€€€€€€ΥΑ‘…Ρ•‘Ρ5¥±±¥Μθ…Ρ”ΉΉ½ά ¤°4(€€€€€€€ΥΑ‘…Ρ•‘Πθ‘•ΑΜΉΝ•ΙΩ•ΙQ¥µ•ΝΡ…µΐ ¤4(€€€€€τ4(€€€€¤μ4(€τ4(4(€™ΥΉΡ¥½ΈΝΡ…ΙΡQ½­•ΉΙ…΅•Ω•ΉΠ°Ρ½­•Έ°Ρ½­•Ή°¤μ4(€€€½ΉΝΠ¥Ν4€τ‘•ΑΜΉ•ΡΥΙΙ•ΉΡ%Ν4€ό‘•ΑΜΉ•ΡΥΙΙ•ΉΡ%Ν4 ¤€θ™…±Ν”μ4(4(€€€¥€ …¥Ν4¤μ4(€€€€€Ι•ΡΥΙΈμ4(€€€τ4(4(€€€¥€΅•Ω•ΉΠΉΑ½¥ΉΡ•ΙQεΑ”€τττ€‰µ½ΥΝ”€•Ω•ΉΠΉ‰ΥΡΡ½Έ€„ττ€ΐ¤μ4(€€€€€Ι•ΡΥΙΈμ4(€€€τ4(4(€€€¥€΅•Ω•ΉΠΉΡ…Ι•ΠΉ±½Ν•ΝΠ Ή΅µΡ½­•Έµ‘•±•Ρ”¤¤μ4(€€€€€Ι•ΡΥΙΈμ4(€€€τ4(4(€€€½ΉΝΠ½ΉΡ…¥Ή•Θ€τ•ΡQ½­•Ή½ΉΡ…¥Ή•Ι½ΙΥΙΙ•ΉΡY¥•ά ¤μ4(4(€€€¥€ …½ΉΡ…¥Ή•Θ¤μ4(€€€€€Ι•ΡΥΙΈμ4(€€€τ4(4(€€€½ΉΝΠΙ•Π€τ½ΉΡ…¥Ή•ΘΉ•Ρ	½ΥΉ‘¥Ή±¥•ΉΡI•Π ¤μ4(4(€€€¥€΅Ι•ΠΉέ¥‘Ρ €πτ€ΐρπΙ•ΠΉ΅•¥΅Π€πτ€ΐ¤μ4(€€€€€Ι•ΡΥΙΈμ4(€€€τ4(4(€€€•Ω•ΉΠΉΑΙ•Ω•ΉΡ•™…Υ±Π ¤μ4(4(€€€ΡΙδμ4(€€€€€Ρ½­•Ή°ΉΝ•ΡA½¥ΉΡ•Ι…ΑΡΥΙ”΅•Ω•ΉΠΉΑ½¥ΉΡ•Ι%¤μ4(€€€τ…Ρ €΅•ΙΙ½Θ¤μ4(€€€€€€ΌΌM…™”ΡΌ¥Ή½Ι”Έ4(€€€τ4(4(€€€½ΉΝΠΙ½½µ…Ρ„€τ‘•ΑΜΉ•ΡΥΙΙ•ΉΡI½½µ…Ρ„€ό‘•ΑΜΉ•ΡΥΙΙ•ΉΡI½½µ…Ρ„ ¤€θντμ4(€€€½ΉΝΠΡ½­•ΉA¥α•±M¥ι”€τ•ΡQ½­•ΉA¥α•±M¥ι”΅Ρ½­•Έ°Ι½½µ…Ρ„ρπντ¤μ4(4(€€€…Ρ¥Ω•Q½­•ΉΙ…€τμ4(€€€€€Ρ½­•Ή%θΡ½­•ΈΉ¥°4(€€€€€Ρ½­•Ή°°4(€€€€€Α½¥ΉΡ•Ι%θ•Ω•ΉΠΉΑ½¥ΉΡ•Ι%°4(€€€€€Ν¥ι”θΡ½­•ΉA¥α•±M¥ι”°4(€€€€€ΝΡ…ΙΡ±¥•ΉΡ`θ•Ω•ΉΠΉ±¥•ΉΡ`°4(€€€€€ΝΡ…ΙΡ±¥•ΉΡdθ•Ω•ΉΠΉ±¥•ΉΡd°4(€€€€€ΝΡ…ΙΡ`θ±…µΑA•Ι•ΉΠ΅Ρ½­•ΈΉΰ¤°4(€€€€€ΝΡ…ΙΡdθ±…µΑA•Ι•ΉΠ΅Ρ½­•ΈΉδ¤°4(€€€€€ΥΙΙ•ΉΡ`θ±…µΑA•Ι•ΉΠ΅Ρ½­•ΈΉΰ¤°4(€€€€€ΥΙΙ•ΉΡdθ±…µΑA•Ι•ΉΠ΅Ρ½­•ΈΉδ¤°4(€€€€€Ι•Ρ]¥‘Ρ θ5…Ρ Ήµ…ΰ Δ°Ι•ΠΉέ¥‘Ρ ¤°4(€€€€€Ι•Ρ!•¥΅Πθ5…Ρ Ήµ…ΰ Δ°Ι•ΠΉ΅•¥΅Π¤4(€€€τμ4(4(€€€Ρ½­•Ή°Ή±…ΝΝ1¥ΝΠΉ…‘ ‰΅µΡ½­•Έµ‘Ι…¥Ή¤μ4(€€€Ν•ΡMΡ…ΡΥΜ ‰Ι…¥ΉΡ½­•ΈΈΈΈ¤μ4(€τ4(4(€™ΥΉΡ¥½Έ΅…Ή‘±•Q½­•ΉA½¥ΉΡ•Ι5½Ω”΅•Ω•ΉΠ¤μ4(€€€¥€ ……Ρ¥Ω•Q½­•ΉΙ…¤μ4(€€€€€Ι•ΡΥΙΈμ4(€€€τ4(4(€€€•Ω•ΉΠΉΑΙ•Ω•ΉΡ•™…Υ±Π ¤μ4(4(€€€½ΉΝΠ‘Ι…€τ…Ρ¥Ω•Q½­•ΉΙ…μ4(4(€€€½ΉΝΠ‘αA•Ι•ΉΠ€τ€ ΅•Ω•ΉΠΉ±¥•ΉΡ`€΄‘Ι…ΉΝΡ…ΙΡ±¥•ΉΡ`¤€Ό‘Ι…ΉΙ•Ρ]¥‘Ρ ¤€¨€Δΐΐμ4(€€€½ΉΝΠ‘εA•Ι•ΉΠ€τ€ ΅•Ω•ΉΠΉ±¥•ΉΡd€΄‘Ι…ΉΝΡ…ΙΡ±¥•ΉΡd¤€Ό‘Ι…ΉΙ•Ρ!•¥΅Π¤€¨€Δΐΐμ4(4(€€€‘Ι…ΉΥΙΙ•ΉΡ`€τ±…µΑA•Ι•ΉΠ΅‘Ι…ΉΝΡ…ΙΡ`€¬‘αA•Ι•ΉΠ¤μ4(€€€‘Ι…ΉΥΙΙ•ΉΡd€τ±…µΑA•Ι•ΉΠ΅‘Ι…ΉΝΡ…ΙΡd€¬‘εA•Ι•ΉΠ¤μ4(4(€€€½ΉΝΠ™…­•Q½­•Ή½ΙA½Ν¥Ρ¥½Έ€τμ4(€€€€€ΰθ‘Ι…ΉΥΙΙ•ΉΡ`°4(€€€€€δθ‘Ι…ΉΥΙΙ•ΉΡd°4(€€€€€Ν¥ι•…Ρ•½Ιδθ€‰µ•‘¥Υ΄4(€€€τμ4(4(€€€½ΉΝΠ™…­•I½½µ½ΙA½Ν¥Ρ¥½Έ€τμ4(€€€€€Ρ½­•Ή5•‘¥ΥµM¥ι”θ‘Ι…ΉΝ¥ι”4(€€€τμ4(4(€€€Α½Ν¥Ρ¥½ΉQ½­•Ή±•µ•ΉΠ΅‘Ι…ΉΡ½­•Ή°°™…­•Q½­•Ή½ΙA½Ν¥Ρ¥½Έ°™…­•I½½µ½ΙA½Ν¥Ρ¥½Έ¤μ4(€τ4(4(€…ΝεΉ™ΥΉΡ¥½Έ΅…Ή‘±•Q½­•ΉA½¥ΉΡ•ΙUΐ ¤μ4(€€€¥€ ……Ρ¥Ω•Q½­•ΉΙ…¤μ4(€€€€€Ι•ΡΥΙΈμ4(€€€τ4(4(€€€½ΉΝΠ‘Ι…€τ…Ρ¥Ω•Q½­•ΉΙ…μ4(€€€…Ρ¥Ω•Q½­•ΉΙ…€τΉΥ±°μ4(4(€€€‘Ι…ΉΡ½­•Ή°Ή±…ΝΝ1¥ΝΠΉΙ•µ½Ω” ‰΅µΡ½­•Έµ‘Ι…¥Ή¤μ4(4(€€€ΡΙδμ4(€€€€€¥€΅‘Ι…ΉΑ½¥ΉΡ•Ι%€„ττΥΉ‘•™¥Ή•€‘Ι…ΉΑ½¥ΉΡ•Ι%€„ττΉΥ±°¤μ4(€€€€€€€ΡΙδμ4(€€€€€€€€€‘Ι…ΉΡ½­•Ή°ΉΙ•±•…Ν•A½¥ΉΡ•Ι…ΑΡΥΙ”΅‘Ι…ΉΑ½¥ΉΡ•Ι%¤μ4(€€€€€€€τ…Ρ €΅•ΙΙ½Θ¤μ4(€€€€€€€€€€ΌΌM…™”ΡΌ¥Ή½Ι”Έ4(€€€€€€€τ4(€€€€€τ4(4(€€€€€…έ…¥ΠΝ…Ω•Q½­•ΉA½Ν¥Ρ¥½Έ΅‘Ι…ΉΡ½­•Ή%°‘Ι…ΉΥΙΙ•ΉΡ`°‘Ι…ΉΥΙΙ•ΉΡd¤μ4(4(€€€€€½ΉΝΠ…΅•‘Q½­•Έ€τΡ½­•Ή…΅”Ή™¥Ή΅™ΥΉΡ¥½Έ€΅Ρ½­•Έ¤μ4(€€€€€€€Ι•ΡΥΙΈΡ½­•ΈΉ¥€τττ‘Ι…ΉΡ½­•Ή%μ4(€€€€€τ¤μ4(4(€€€€€¥€΅…΅•‘Q½­•Έ¤μ4(€€€€€€€…΅•‘Q½­•ΈΉΰ€τ‘Ι…ΉΥΙΙ•ΉΡ`μ4(€€€€€€€…΅•‘Q½­•ΈΉδ€τ‘Ι…ΉΥΙΙ•ΉΡdμ4(€€€€€τ4(4(€€€€€Ι•Ή‘•Θ΅‘•ΑΜΉ•ΡΥΙΙ•ΉΡI½½µ…Ρ„€ό‘•ΑΜΉ•ΡΥΙΙ•ΉΡI½½µ…Ρ„ ¤€θ±…ΝΡI•Ή‘•Ι•‘I½½΄ρπντ¤μ4(€€€€€Ν•ΡMΡ…ΡΥΜ ‰Q½­•ΈΑ½Ν¥Ρ¥½ΈΝ…Ω•Έ¤μ4(€€€τ…Ρ €΅•ΙΙ½Θ¤μ4(€€€€€½ΉΝ½±”Ή•ΙΙ½Θ΅•ΙΙ½Θ¤μ4(€€€€€…±•ΙΠ΅•ΙΙ½ΘΉµ•ΝΝ…”¤μ4(€€€€€Ι•Ή‘•Θ΅‘•ΑΜΉ•ΡΥΙΙ•ΉΡI½½µ…Ρ„€ό‘•ΑΜΉ•ΡΥΙΙ•ΉΡI½½µ…Ρ„ ¤€θ±…ΝΡI•Ή‘•Ι•‘I½½΄ρπντ¤μ4(€€€τ4(€τ4(4(€™ΥΉΡ¥½Έ…Ή•±Q½­•ΉΙ… ¤μ4(€€€¥€ ……Ρ¥Ω•Q½­•ΉΙ…¤μ4(€€€€€Ι•ΡΥΙΈμ4(€€€τ4(4(€€€…Ρ¥Ω•Q½­•ΉΙ…ΉΡ½­•Ή°Ή±…ΝΝ1¥ΝΠΉΙ•µ½Ω” ‰΅µΡ½­•Έµ‘Ι…¥Ή¤μ4(€€€…Ρ¥Ω•Q½­•ΉΙ…€τΉΥ±°μ4(4(€€€Ι•Ή‘•Θ΅‘•ΑΜΉ•ΡΥΙΙ•ΉΡI½½µ…Ρ„€ό‘•ΑΜΉ•ΡΥΙΙ•ΉΡI½½µ…Ρ„ ¤€θ±…ΝΡI•Ή‘•Ι•‘I½½΄ρπντ¤μ4(€τ4(4(4(ΌΌ€τττττττττττττττττττττττττττττττττττττττττττττττττττττ4(ΌΌQ=-9LMQ%=8€ΔΠƒP%9%P€ΌAU	1%A$4(ΌΌ€τττττττττττττττττττττττττττττττττττττττττττττττττττττ4(4(€™ΥΉΡ¥½Έ¥Ή¥Π ¤μ4(€€€Ι•™Ι•Ν΅±•µ•ΉΡΜ ¤μ4(€€€•ΉΝΥΙ•MΡε±•Μ ¤μ4(€€€•ΉΝΥΙ•1¥ΝΡ•Ή•ΙΜ ¤μ4(€€€½ΉΉ•Ρ½ΉΡΙ½±Μ ¤μ4(4(€€€έ¥Ή‘½άΉ!½µ•‰Ι•έ½‘Q½­•ΉΜ€τ…Α¤μ4(4(€€€½ΉΝΠΙ½½µ…Ρ„€τ‘•ΑΜΉ•ΡΥΙΙ•ΉΡI½½µ…Ρ„€ό‘•ΑΜΉ•ΡΥΙΙ•ΉΡI½½µ…Ρ„ ¤€θντμ4(€€€½ΉΝΠΙ½½µ½‘”€τ‘•ΑΜΉ•ΡΥΙΙ•ΉΡI½½µ½‘”€ό‘•ΑΜΉ•ΡΥΙΙ•ΉΡI½½µ½‘” ¤€θΉΥ±°μ4(4(€€€ΝΡ…ΙΡQ½­•Ή1¥ΝΡ•Ή•Ι½ΙI½½΄΅Ι½½µ½‘”¤μ4(€€€ΥΑ‘…Ρ•M…±•½ΉΡΙ½±ΝΙ½µI½½΄΅Ι½½µ…Ρ„ρπντ¤μ4(€€€Ι•Ή‘•Θ΅Ι½½µ…Ρ„ρπντ¤μ4(4(€€€Ν•ΡMΡ…ΡΥΜ ‰Q½­•ΈΝεΝΡ•΄½ΉΉ•Ρ•Έ¤μ4(€τ4(4(€½ΉΝΠ…Α¤€τμ4(€€€¥Ή¥Π°4(€€€Ι•Ή‘•Θ°4(€€€…‘‘Q½­•Έ°(€€€‰Υ¥±‘΅…Ι…Ρ•Ι1¥Ή­•‘Q½­•ΉA…Ρ °(€€€‰Υ¥±‘5½ΉΝΡ•Ι1¥Ή­•‘Q½­•ΉA…Ρ °(€€€Ι•…Ρ•΅…Ι…Ρ•Ι1¥Ή­•‘Q½­•Έ°(€€€Ι•…Ρ•5½ΉΝΡ•Ι1¥Ή­•‘Q½­•Έ°(€€€ΝεΉ1¥Ή­•‘΅…Ι…Ρ•ΙQ½­•ΉΜ°(€€€‘•±•Ρ•Q½­•Έ°4(€€€Ν…Ω•Q½­•ΉM…±”°4(€€€ΝΡ…ΙΡQ½­•Ή1¥ΝΡ•Ή•Ι½ΙI½½΄°4(€€€ΝΡ½ΑQ½­•Ή1¥ΝΡ•Ή•Θ4(€τμ4(4(€¥€΅½ΑΡ¥½ΉΜΉ…ΥΡ½%Ή¥Π€„ττ™…±Ν”¤μ4(€€€¥Ή¥Π ¤μ4(€τ4(4(€Ι•ΡΥΙΈ…Α¤μ4)τ4