// =====================================================
// TOKENS SECTION 1 — TOKEN SYSTEM EXPORT / DEPENDENCIES
// =====================================================

export function createTokenSystem(options) {
  const deps = {
    db: options.db,
    doc: options.doc,
    updateDoc: options.updateDoc,
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


// =====================================================
// TOKENS SECTION 2 — DOM ELEMENTS / REFRESH
// =====================================================

  const $ = (id) => document.getElementById(id);

  const T = {
    tokenBuilderControls: null,

    tokenMediumSizeInput: null,
    tokenMediumSizeValue: null,
    saveTokenScaleButton: null,

    tokenPreviewTiny: null,
    tokenPreviewMedium: null,
    tokenPreviewLarge: null,
    tokenPreviewHuge: null,
    tokenPreviewGargantuan: null,

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

    T.tokenPreviewTiny = $("tokenPreviewTiny");
    T.tokenPreviewMedium = $("tokenPreviewMedium");
    T.tokenPreviewLarge = $("tokenPreviewLarge");
    T.tokenPreviewHuge = $("tokenPreviewHuge");
    T.tokenPreviewGargantuan = $("tokenPreviewGargantuan");

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
// TOKENS SECTION 3 — STATUS / BASIC HELPERS
// =====================================================

  function setStatus(message) {
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


// =====================================================
// TOKENS SECTION 4 — TOKEN STYLES
// =====================================================

  function ensureStyles() {
    if (document.getElementById("homebrewGodTokenStyles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "homebrewGodTokenStyles";

    style.textContent = `
      #tokenMediumSizeInput {
        width: min(360px, 100%) !important;
        display: inline-block !important;
        margin: 6px 8px !important;
        accent-color: #9d6bff;
        vertical-align: middle;
      }

      .tokenScaleCompactRow,
      .tokenAddCompactRow {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }

      .tokenScaleHint {
        margin: 6px 0 0 0 !important;
        padding: 8px 10px !important;
      }

      #tokenScalePreview {
        display: none !important;
      }

      #tokenTypeSelect,
      #tokenSizeSelect {
        display: inline-block !important;
        width: 170px !important;
        max-width: 100% !important;
        min-height: auto !important;
        height: auto !important;
        padding: 10px 12px !important;
        margin: 6px 4px !important;
        font-size: 15px !important;
        color: #f5f7ff !important;
        background: linear-gradient(180deg, rgba(19, 26, 49, 0.95), rgba(12, 17, 33, 0.96)) !important;
        border: 1px solid rgba(116, 138, 255, 0.22) !important;
        border-radius: 12px !important;
        outline: none !important;
        vertical-align: middle !important;
      }

      #tokenTypeSelect option,
      #tokenSizeSelect option {
        color: #ffffff;
        background: #101528;
      }

      #tokenLayer {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 40;
      }

      .hg-map-scale-preview {
        position: absolute;
        left: 50%;
        top: 50%;
        border-radius: 999px;
        border: 3px solid rgba(255, 255, 255, 0.96);
        background: rgba(255, 255, 255, 0.10);
        box-shadow:
          0 0 0 2px rgba(0, 0, 0, 0.72),
          0 0 26px rgba(255, 255, 255, 0.70),
          inset 0 0 20px rgba(255, 255, 255, 0.16);
        pointer-events: none;
        z-index: 9998;
        transform: translate(-50%, -50%);
      }

      .hg-map-scale-label {
        position: absolute;
        left: 50%;
        top: calc(50% + var(--preview-radius, 32px) + 8px);
        transform: translateX(-50%);
        padding: 4px 9px;
        border-radius: 999px;
        background: rgba(0, 0, 0, 0.78);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.62);
        font-size: 12px;
        font-weight: bold;
        white-space: nowrap;
        pointer-events: none;
        z-index: 9999;
        box-shadow: 0 0 14px rgba(255, 255, 255, 0.24);
      }

      .hg-token {
        position: absolute;
        border-radius: 999px;
        overflow: visible;
        pointer-events: auto;
        cursor: grab;
        user-select: none;
        transform: translateZ(0);
      }

      .hg-token img,
      .hg-token-fallback {
        width: 100%;
        height: 100%;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        object-fit: cover;
        background: #101528;
        color: white;
        font-weight: bold;
        border: 2px solid rgba(120, 160, 255, 0.9);
        box-shadow:
          0 0 0 2px rgba(0, 0, 0, 0.65),
          0 0 18px rgba(110, 130, 255, 0.45);
        pointer-events: none;
      }

      .hg-token-player img,
      .hg-token-player .hg-token-fallback {
        border-color: rgba(88, 166, 255, 0.95);
        box-shadow:
          0 0 0 2px rgba(0, 0, 0, 0.65),
          0 0 20px rgba(88, 166, 255, 0.52);
      }

      .hg-token-enemy img,
      .hg-token-enemy .hg-token-fallback {
        border-color: rgba(255, 90, 122, 0.95);
        box-shadow:
          0 0 0 2px rgba(0, 0, 0, 0.65),
          0 0 20px rgba(255, 90, 122, 0.52);
      }

      .hg-token-npc img,
      .hg-token-npc .hg-token-fallback {
        border-color: rgba(180, 140, 255, 0.95);
        box-shadow:
          0 0 0 2px rgba(0, 0, 0, 0.65),
          0 0 20px rgba(180, 140, 255, 0.48);
      }

      .hg-token-object img,
      .hg-token-object .hg-token-fallback {
        border-color: rgba(170, 190, 220, 0.95);
        box-shadow:
          0 0 0 2px rgba(0, 0, 0, 0.65),
          0 0 16px rgba(170, 190, 220, 0.35);
      }

      .hg-token-label {
        position: absolute;
        left: 50%;
        top: 100%;
        transform: translateX(-50%);
        margin-top: 4px;
        padding: 2px 6px;
        max-width: 130px;
        border-radius: 999px;
        background: rgba(5, 7, 15, 0.82);
        color: #ffffff;
        border: 1px solid rgba(130, 150, 255, 0.35);
        font-size: 11px;
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        pointer-events: none;
      }

      .hg-token-size-badge {
        position: absolute;
        left: 50%;
        bottom: 100%;
        transform: translateX(-50%);
        margin-bottom: 4px;
        padding: 2px 6px;
        border-radius: 999px;
        background: rgba(9, 12, 28, 0.82);
        color: #dfe6ff;
        border: 1px solid rgba(150, 170, 255, 0.28);
        font-size: 10px;
        line-height: 1.1;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.15s ease;
      }

      .hg-token:hover .hg-token-size-badge {
        opacity: 1;
      }

      .hg-token-delete {
        position: absolute;
        right: -8px;
        top: -8px;
        width: 22px !important;
        height: 22px !important;
        min-width: 22px !important;
        padding: 0 !important;
        margin: 0 !important;
        border-radius: 999px !important;
        font-size: 12px !important;
        line-height: 1 !important;
        background: rgba(255, 70, 100, 0.95) !important;
        border-color: rgba(255, 170, 190, 0.8) !important;
        z-index: 3;
      }

      .hg-token-dragging {
        cursor: grabbing !important;
        z-index: 9999 !important;
        filter: brightness(1.15);
      }

      @media (max-width: 900px) {
        .tokenScaleCompactRow,
        .tokenAddCompactRow {
          display: block;
        }

        #tokenMediumSizeInput,
        #tokenTypeSelect,
        #tokenSizeSelect {
          display: block !important;
          width: 100% !important;
          margin: 6px 0 !important;
        }
      }
    `;

    document.head.appendChild(style);
  }


// =====================================================
// TOKENS SECTION 5 — CONTROL CONNECTIONS
// =====================================================

  function ensureListeners() {
    if (!window.homebrewGodTokenListenersReady) {
      window.homebrewGodTokenListenersReady = true;

      document.addEventListener("pointermove", handleTokenPointerMove);
      document.addEventListener("pointerup", handleTokenPointerUp);
      document.addEventListener("pointercancel", cancelTokenDrag);
    }
  }

  function connectControls() {
    refreshElements();

    if (T.addTokenButton && T.addTokenButton.dataset.homebrewGodTokensConnected !== "yes") {
      T.addTokenButton.dataset.homebrewGodTokensConnected = "yes";
      T.addTokenButton.addEventListener("click", addToken);
    }

    if (T.saveTokenScaleButton && T.saveTokenScaleButton.dataset.homebrewGodScaleConnected !== "yes") {
      T.saveTokenScaleButton.dataset.homebrewGodScaleConnected = "yes";
      T.saveTokenScaleButton.addEventListener("click", saveTokenScale);
    }

    if (T.tokenMediumSizeInput && T.tokenMediumSizeInput.dataset.homebrewGodPreviewConnected !== "yes") {
      T.tokenMediumSizeInput.dataset.homebrewGodPreviewConnected = "yes";

      T.tokenMediumSizeInput.addEventListener("input", function () {
        const mediumSize = clampMediumSize(T.tokenMediumSizeInput.value);
        updateScaleNumber(mediumSize);
        showMapScalePreview(mediumSize, "Medium");
      });

      T.tokenMediumSizeInput.addEventListener("change", function () {
        const mediumSize = clampMediumSize(T.tokenMediumSizeInput.value);
        showMapScalePreview(mediumSize, "Medium");
      });
    }
  }


// =====================================================
// TOKENS SECTION 6 — SIZE / SCALE LOGIC
// =====================================================

  function getMediumSize(room) {
    const direct = room && Number(room.tokenMediumSize);
    const nested = room && room.tokenScale && Number(room.tokenScale.mediumSize);

    if (Number.isFinite(direct)) {
      return clampMediumSize(direct);
    }

    if (Number.isFinite(nested)) {
      return clampMediumSize(nested);
    }

    return 64;
  }

  function getTokenPixelSize(token, room) {
    const mediumSize = getMediumSize(room || {});
    const sizeCategory = normalizeSizeCategory(token.sizeCategory || token.creatureSize || "medium");
    const multiplier = SIZE_MULTIPLIERS[sizeCategory] || 1;

    return Math.round(mediumSize * multiplier);
  }

  function updateScaleControlsFromRoom(room) {
    refreshElements();

    const mediumSize = getMediumSize(room || {});

    if (T.tokenMediumSizeInput) {
      T.tokenMediumSizeInput.value = String(mediumSize);
    }

    updateScaleNumber(mediumSize);
  }

  function updateScaleNumber(mediumSizeValue) {
    refreshElements();

    const mediumSize = clampMediumSize(mediumSizeValue);

    if (T.tokenMediumSizeValue) {
      T.tokenMediumSizeValue.textContent = String(mediumSize);
    }
  }


// =====================================================
// TOKENS SECTION 7 — MAP SCALE PREVIEW
// =====================================================

  function removeMapScalePreview() {
    refreshElements();

    if (scalePreviewHideTimer) {
      clearTimeout(scalePreviewHideTimer);
      scalePreviewHideTimer = null;
    }

    if (!T.tokenLayer) {
      return;
    }

    const oldCircle = T.tokenLayer.querySelector(".hg-map-scale-preview");
    const oldLabel = T.tokenLayer.querySelector(".hg-map-scale-label");

    if (oldCircle) oldCircle.remove();
    if (oldLabel) oldLabel.remove();
  }

  function showMapScalePreview(mediumSize, labelName = "Medium") {
    refreshElements();

    const layer = prepareTokenLayer();

    if (!layer) {
      return;
    }

    if (scalePreviewHideTimer) {
      clearTimeout(scalePreviewHideTimer);
      scalePreviewHideTimer = null;
    }

    const cleanSize = clampMediumSize(mediumSize);

    let circle = layer.querySelector(".hg-map-scale-preview");
    let label = layer.querySelector(".hg-map-scale-label");

    if (!circle) {
      circle = document.createElement("div");
      circle.className = "hg-map-scale-preview";
      layer.appendChild(circle);
    }

    if (!label) {
      label = document.createElement("div");
      label.className = "hg-map-scale-label";
      layer.appendChild(label);
    }

    circle.style.width = cleanSize + "px";
    circle.style.height = cleanSize + "px";

    label.style.setProperty("--preview-radius", (cleanSize / 2) + "px");
    label.textContent = labelName + " " + cleanSize + "px";

    setStatus("Scale preview: " + labelName + " " + cleanSize + "px. Save when it fits one square.");
  }

  function hideMapScalePreviewSoon() {
    if (scalePreviewHideTimer) {
      clearTimeout(scalePreviewHideTimer);
    }

    scalePreviewHideTimer = setTimeout(function () {
      removeMapScalePreview();
    }, 900);
  }



// =====================================================
// TOKENS SECTION 8 — ROOM TOKEN DATA
// =====================================================

  function getRoomTokens(room) {
    if (!room || !Array.isArray(room.tokens)) {
      return [];
    }

    return room.tokens
      .filter(function (token) {
        return token && token.id;
      })
      .map(function (token) {
        const cleanType = ["player", "enemy", "npc", "object"].includes(String(token.type))
          ? String(token.type)
          : "object";

        const cleanSizeCategory = normalizeSizeCategory(token.sizeCategory || token.creatureSize || "medium");

        return {
          ...token,
          type: cleanType,
          x: clampPercent(token.x),
          y: clampPercent(token.y),
          sizeCategory: cleanSizeCategory,
          creatureSize: cleanSizeCategory,
          mapMode: token.mapMode || "single",
          tileKey: token.tileKey || null
        };
      });
  }

  function getCurrentTokenTarget(room) {
    const safeRoom = room || {};
    const tiles = deps.getPuzzleTiles ? deps.getPuzzleTiles(safeRoom) : [];
    const viewMode = deps.getPuzzleViewMode ? deps.getPuzzleViewMode(safeRoom) : "board";
    const activeTile = deps.getActivePuzzleTile ? deps.getActivePuzzleTile(safeRoom) : null;

    if (tiles.length > 0) {
      if (viewMode === "focus" && activeTile) {
        return {
          mapMode: "puzzle",
          tileKey: activeTile.key
        };
      }

      return {
        mapMode: "puzzle",
        tileKey: null
      };
    }

    const currentMap = deps.buildMapFromRoomFields
      ? deps.buildMapFromRoomFields(safeRoom)
      : null;

    if (currentMap && currentMap.url) {
      return {
        mapMode: "single",
        tileKey: null
      };
    }

    return {
      mapMode: null,
      tileKey: null
    };
  }

  function tokenMatchesCurrentView(token, room) {
    const target = getCurrentTokenTarget(room);

    if (!target.mapMode) {
      return false;
    }

    if ((token.mapMode || "single") !== target.mapMode) {
      return false;
    }

    if (target.mapMode === "puzzle") {
      if (target.tileKey) {
        return token.tileKey === target.tileKey;
      }

      return !token.tileKey;
    }

    return target.mapMode === "single";
  }


// =====================================================
// TOKENS SECTION 9 — TOKEN LAYER / MAP CONTAINER
// =====================================================

  function getTokenContainerForCurrentView() {
    refreshElements();

    if (T.puzzleMapBoard && !T.puzzleMapBoard.classList.contains("hidden")) {
      return T.puzzleMapBoard;
    }

    if (T.battleMapViewer && !T.battleMapViewer.classList.contains("hidden")) {
      return T.battleMapViewer;
    }

    return T.battleMapSurface || T.battleMapViewer || T.puzzleMapBoard || null;
  }

  function prepareTokenLayer() {
    refreshElements();

    if (!T.tokenLayer) {
      console.warn("Homebrew God tokens: tokenLayer was not found.");
      return null;
    }

    const container = getTokenContainerForCurrentView();

    if (!container) {
      console.warn("Homebrew God tokens: no map container found.");
      return null;
    }

    const computedPosition = window.getComputedStyle(container).position;

    if (computedPosition === "static") {
      container.style.position = "relative";
    }

    if (T.tokenLayer.parentNode !== container) {
      container.appendChild(T.tokenLayer);
    }

    T.tokenLayer.style.position = "absolute";
    T.tokenLayer.style.left = "0";
    T.tokenLayer.style.top = "0";
    T.tokenLayer.style.width = "100%";
    T.tokenLayer.style.height = "100%";
    T.tokenLayer.style.pointerEvents = "none";
    T.tokenLayer.style.zIndex = "40";

    return T.tokenLayer;
  }


// =====================================================
// TOKENS SECTION 10 — TOKEN RENDERING
// =====================================================

  function positionTokenElement(tokenEl, token, room) {
    const size = getTokenPixelSize(token, room || {});
    const x = clampPercent(token.x);
    const y = clampPercent(token.y);

    tokenEl.style.width = size + "px";
    tokenEl.style.height = size + "px";
    tokenEl.style.left = "calc(" + x + "% - " + (size / 2) + "px)";
    tokenEl.style.top = "calc(" + y + "% - " + (size / 2) + "px)";
  }

  function render(room) {
    refreshElements();
    ensureStyles();
    connectControls();

    const safeRoom = room || (deps.getCurrentRoomData ? deps.getCurrentRoomData() : {}) || {};
    lastRenderedRoom = safeRoom;

    updateScaleControlsFromRoom(safeRoom);

    if (activeTokenDrag) {
      return;
    }

    const layer = prepareTokenLayer();

    if (!layer) {
      return;
    }

    const existingScaleCircle = layer.querySelector(".hg-map-scale-preview");
    const existingScaleLabel = layer.querySelector(".hg-map-scale-label");

    layer.innerHTML = "";

    if (existingScaleCircle) {
      layer.appendChild(existingScaleCircle);
    }

    if (existingScaleLabel) {
      layer.appendChild(existingScaleLabel);
    }

    const isDM = deps.getCurrentIsDM ? deps.getCurrentIsDM() : false;

    const visibleTokens = getRoomTokens(safeRoom).filter(function (token) {
      return tokenMatchesCurrentView(token, safeRoom);
    });

    visibleTokens.forEach(function (token) {
      const tokenEl = document.createElement("div");
      tokenEl.className = "hg-token hg-token-" + token.type;
      tokenEl.dataset.tokenId = token.id;
      tokenEl.title = token.name || "Token";

      positionTokenElement(tokenEl, token, safeRoom);

      if (token.imageUrl) {
        const img = document.createElement("img");
        img.src = token.imageUrl;
        img.alt = token.name || "Token";
        tokenEl.appendChild(img);
      } else {
        const fallback = document.createElement("div");
        fallback.className = "hg-token-fallback";
        fallback.textContent = String(token.name || "?").trim().charAt(0).toUpperCase() || "?";
        tokenEl.appendChild(fallback);
      }

      const sizeBadge = document.createElement("div");
      sizeBadge.className = "hg-token-size-badge";
      sizeBadge.textContent = sizeCategoryLabel(token.sizeCategory);
      tokenEl.appendChild(sizeBadge);

      const label = document.createElement("div");
      label.className = "hg-token-label";
      label.textContent = token.name || "Token";
      tokenEl.appendChild(label);

      if (isDM) {
        tokenEl.addEventListener("pointerdown", function (event) {
          startTokenDrag(event, token, tokenEl);
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "hg-token-delete";
        deleteButton.textContent = "×";
        deleteButton.title = "Delete token";

        deleteButton.addEventListener("click", function (event) {
          event.stopPropagation();
          deleteToken(token.id);
        });

        tokenEl.appendChild(deleteButton);
      }

      layer.appendChild(tokenEl);
    });
  }


// =====================================================
// TOKENS SECTION 11 — SCALE SAVE
// =====================================================

  async function saveTokenScale() {
    try {
      refreshElements();

      const roomCode = deps.getCurrentRoomCode ? deps.getCurrentRoomCode() : null;
      const roomData = deps.getCurrentRoomData ? deps.getCurrentRoomData() : null;
      const isDM = deps.getCurrentIsDM ? deps.getCurrentIsDM() : false;

      if (!roomCode) {
        alert("Open a room first.");
        return;
      }

      if (!isDM) {
        alert("Only the DM can change token scale.");
        return;
      }

      const mediumSize = clampMediumSize(T.tokenMediumSizeInput ? T.tokenMediumSizeInput.value : 64);

      const newRoomData = {
        ...(roomData || {}),
        tokenMediumSize: mediumSize,
        tokenScale: {
          ...((roomData && roomData.tokenScale) || {}),
          mediumSize: mediumSize,
          updatedAtMillis: Date.now()
        }
      };

      if (deps.setCurrentRoomData) {
        deps.setCurrentRoomData(newRoomData);
      }

      await deps.updateDoc(deps.doc(deps.db, "rooms", roomCode), {
        tokenMediumSize: mediumSize,
        tokenScale: {
          mediumSize: mediumSize,
          updatedAtMillis: Date.now()
        },
        updatedAt: deps.serverTimestamp()
      });

      render(newRoomData);
      showMapScalePreview(mediumSize, "Saved Medium");
      hideMapScalePreviewSoon();
      setStatus("Medium token size saved at " + mediumSize + "px.");
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }


// =====================================================
// TOKENS SECTION 12 — ADD / DELETE TOKEN
// =====================================================

  async function addToken() {
    try {
      refreshElements();

      const roomCode = deps.getCurrentRoomCode ? deps.getCurrentRoomCode() : null;
      const roomData = deps.getCurrentRoomData ? deps.getCurrentRoomData() : null;
      const isDM = deps.getCurrentIsDM ? deps.getCurrentIsDM() : false;

      if (!roomCode) {
        alert("Open a room first.");
        return;
      }

      if (!isDM) {
        alert("Only the DM can add tokens.");
        return;
      }

      const target = getCurrentTokenTarget(roomData || {});

      if (!target.mapMode) {
        alert("Load a battle map or puzzle map first.");
        return;
      }

      const file = T.tokenImageUploadInput ? T.tokenImageUploadInput.files[0] : null;

      if (!file) {
        alert("Choose a token image first.");
        return;
      }

      const name = T.tokenNameInput && T.tokenNameInput.value.trim()
        ? T.tokenNameInput.value.trim()
        : "Unnamed Token";

      const type = T.tokenTypeSelect && T.tokenTypeSelect.value
        ? T.tokenTypeSelect.value
        : "object";

      const sizeCategory = T.tokenSizeSelect && T.tokenSizeSelect.value
        ? normalizeSizeCategory(T.tokenSizeSelect.value)
        : "medium";

      if (!deps.uploadImage) {
        alert("Token uploader is not connected.");
        return;
      }

      removeMapScalePreview();
      setStatus("Uploading token...");

      if (T.addTokenButton) {
        T.addTokenButton.disabled = true;
      }

      const cloudinaryResult = await deps.uploadImage(file);
      const oldTokens = getRoomTokens(roomData || {});
      const mediumSize = getMediumSize(roomData || {});

      const newToken = {
        id: crypto.randomUUID(),
        name: name,
        type: type,
        imageUrl: cloudinaryResult.secure_url,
        publicId: cloudinaryResult.public_id,
        x: 50,
        y: 50,
        mapMode: target.mapMode,
        tileKey: target.tileKey,
        sizeCategory: sizeCategory,
        creatureSize: sizeCategory,
        size: Math.round(mediumSize * (SIZE_MULTIPLIERS[sizeCategory] || 1)),
        sheetId: null,
        display: {
          name: true,
          hpBar: false,
          hpText: false,
          ac: false,
          conditions: true,
          initiative: false
        },
        createdAtMillis: Date.now()
      };

      const newTokens = oldTokens.concat(newToken);

      const newRoomData = {
        ...(roomData || {}),
        tokens: newTokens
      };

      if (deps.setCurrentRoomData) {
        deps.setCurrentRoomData(newRoomData);
      }

      await deps.updateDoc(deps.doc(deps.db, "rooms", roomCode), {
        tokens: newTokens,
        updatedAt: deps.serverTimestamp()
      });

      render(newRoomData);

      if (T.tokenNameInput) {
        T.tokenNameInput.value = "";
      }

      if (T.tokenImageUploadInput) {
        T.tokenImageUploadInput.value = "";
      }

      setStatus(sizeCategoryLabel(sizeCategory) + " token added.");
    } catch (error) {
      console.error(error);
      setStatus("Token upload failed.");
      alert(error.message);
    } finally {
      refreshElements();

      if (T.addTokenButton) {
        T.addTokenButton.disabled = false;
      }
    }
  }

  async function deleteToken(tokenId) {
    try {
      const roomCode = deps.getCurrentRoomCode ? deps.getCurrentRoomCode() : null;
      const roomData = deps.getCurrentRoomData ? deps.getCurrentRoomData() : null;
      const isDM = deps.getCurrentIsDM ? deps.getCurrentIsDM() : false;

      if (!roomCode || !isDM) {
        alert("Only the DM can delete tokens.");
        return;
      }

      if (!confirm("Delete this token? This does not delete the image from Cloudinary.")) {
        return;
      }

      const oldTokens = getRoomTokens(roomData || {});
      const newTokens = oldTokens.filter(function (token) {
        return token.id !== tokenId;
      });

      const newRoomData = {
        ...(roomData || {}),
        tokens: newTokens
      };

      if (deps.setCurrentRoomData) {
        deps.setCurrentRoomData(newRoomData);
      }

      await deps.updateDoc(deps.doc(deps.db, "rooms", roomCode), {
        tokens: newTokens,
        updatedAt: deps.serverTimestamp()
      });

      render(newRoomData);
      setStatus("Token deleted.");
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }


// =====================================================
// TOKENS SECTION 13 — TOKEN DRAGGING
// No Firebase saving while dragging.
// Saves once when the token is released.
// =====================================================

  async function saveTokenPosition(tokenId, x, y) {
    const roomCode = deps.getCurrentRoomCode ? deps.getCurrentRoomCode() : null;
    const roomData = deps.getCurrentRoomData ? deps.getCurrentRoomData() : null;
    const isDM = deps.getCurrentIsDM ? deps.getCurrentIsDM() : false;

    if (!roomCode || !isDM) {
      return;
    }

    const oldTokens = getRoomTokens(roomData || {});
    let foundToken = false;

    const newTokens = oldTokens.map(function (token) {
      if (token.id !== tokenId) {
        return token;
      }

      foundToken = true;

      return {
        ...token,
        x: clampPercent(x),
        y: clampPercent(y),
        movedAtMillis: Date.now()
      };
    });

    if (!foundToken) {
      return;
    }

    const newRoomData = {
      ...(roomData || {}),
      tokens: newTokens
    };

    if (deps.setCurrentRoomData) {
      deps.setCurrentRoomData(newRoomData);
    }

    await deps.updateDoc(deps.doc(deps.db, "rooms", roomCode), {
      tokens: newTokens,
      updatedAt: deps.serverTimestamp()
    });
  }

  function startTokenDrag(event, token, tokenEl) {
    const isDM = deps.getCurrentIsDM ? deps.getCurrentIsDM() : false;

    if (!isDM) {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    if (event.target.closest(".hg-token-delete")) {
      return;
    }

    const container = getTokenContainerForCurrentView();

    if (!container) {
      return;
    }

    const rect = container.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    event.preventDefault();

    try {
      tokenEl.setPointerCapture(event.pointerId);
    } catch (error) {
      // Some browsers do not need pointer capture here.
    }

    const roomData = deps.getCurrentRoomData ? deps.getCurrentRoomData() : {};
    const tokenPixelSize = getTokenPixelSize(token, roomData || {});

    activeTokenDrag = {
      tokenId: token.id,
      tokenEl: tokenEl,
      pointerId: event.pointerId,
      size: tokenPixelSize,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: clampPercent(token.x),
      startY: clampPercent(token.y),
      currentX: clampPercent(token.x),
      currentY: clampPercent(token.y),
      rectWidth: Math.max(1, rect.width),
      rectHeight: Math.max(1, rect.height)
    };

    tokenEl.classList.add("hg-token-dragging");
    setStatus("Dragging token...");
  }

  function queueTokenPositionSave() {
    // Intentionally disabled.
    // Saving to Firebase during drag causes room snapshots and map redraw flicker.
    // Token position saves once on pointerup instead.
  }

  function handleTokenPointerMove(event) {
    if (!activeTokenDrag) {
      return;
    }

    event.preventDefault();

    const drag = activeTokenDrag;

    const dxPercent = ((event.clientX - drag.startClientX) / drag.rectWidth) * 100;
    const dyPercent = ((event.clientY - drag.startClientY) / drag.rectHeight) * 100;

    drag.currentX = clampPercent(drag.startX + dxPercent);
    drag.currentY = clampPercent(drag.startY + dyPercent);

    const fakeTokenForPosition = {
      x: drag.currentX,
      y: drag.currentY,
      sizeCategory: "medium"
    };

    const fakeRoomForPosition = {
      tokenMediumSize: drag.size
    };

    positionTokenElement(drag.tokenEl, fakeTokenForPosition, fakeRoomForPosition);
  }

  async function handleTokenPointerUp() {
    if (!activeTokenDrag) {
      return;
    }

    const drag = activeTokenDrag;
    activeTokenDrag = null;

    drag.tokenEl.classList.remove("hg-token-dragging");

    try {
      if (drag.pointerId !== undefined && drag.pointerId !== null) {
        try {
          drag.tokenEl.releasePointerCapture(drag.pointerId);
        } catch (error) {
          // Safe to ignore.
        }
      }

      await saveTokenPosition(drag.tokenId, drag.currentX, drag.currentY);
      render(deps.getCurrentRoomData ? deps.getCurrentRoomData() : lastRenderedRoom || {});
      setStatus("Token position saved.");
    } catch (error) {
      console.error(error);
      alert(error.message);
      render(deps.getCurrentRoomData ? deps.getCurrentRoomData() : lastRenderedRoom || {});
    }
  }

  function cancelTokenDrag() {
    if (!activeTokenDrag) {
      return;
    }

    activeTokenDrag.tokenEl.classList.remove("hg-token-dragging");
    activeTokenDrag = null;

    render(deps.getCurrentRoomData ? deps.getCurrentRoomData() : lastRenderedRoom || {});
  }


// =====================================================
// TOKENS SECTION 14 — INIT / PUBLIC API
// =====================================================

  function init() {
    refreshElements();
    ensureStyles();
    ensureListeners();
    connectControls();

    window.HomebrewGodTokens = api;

    const roomData = deps.getCurrentRoomData ? deps.getCurrentRoomData() : {};
    updateScaleControlsFromRoom(roomData || {});
    render(roomData || {});

    setStatus("Token system connected.");
  }

  const api = {
    init,
    render,
    addToken,
    deleteToken,
    saveTokenScale
  };

  init();

  return api;
}
