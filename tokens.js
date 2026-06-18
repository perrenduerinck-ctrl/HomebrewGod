// =====================================================
// TOKENS.JS — HOMEBREW GOD TOKEN SYSTEM V1
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

  let activeTokenDrag = null;
  let lastRenderedRoom = null;

  const $ = (id) => document.getElementById(id);

  const T = {
    tokenBuilderControls: null,
    tokenNameInput: null,
    tokenTypeSelect: null,
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
    T.tokenNameInput = $("tokenNameInput");
    T.tokenTypeSelect = $("tokenTypeSelect");
    T.tokenImageUploadInput = $("tokenImageUploadInput");
    T.addTokenButton = $("addTokenButton");
    T.tokenBuilderStatus = $("tokenBuilderStatus");
    T.tokenLayer = $("tokenLayer");
    T.battleMapSurface = $("battleMapSurface");
    T.battleMapViewer = $("battleMapViewer");
    T.puzzleMapBoard = $("puzzleMapBoard");
  }

  function setStatus(message) {
    refreshElements();

    if (T.tokenBuilderStatus) {
      T.tokenBuilderStatus.textContent = message || "";
    }
  }

  function ensureStyles() {
    if (document.getElementById("homebrewGodTokenStyles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "homebrewGodTokenStyles";

    style.textContent = `
      #tokenTypeSelect {
        padding: 11px 12px;
        margin: 6px 8px 6px 0;
        font-size: 16px;
        color: #f5f7ff;
        background: linear-gradient(180deg, rgba(19, 26, 49, 0.95), rgba(12, 17, 33, 0.96));
        border: 1px solid rgba(116, 138, 255, 0.22);
        border-radius: 12px;
        outline: none;
      }

      #tokenLayer {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 40;
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
        #tokenTypeSelect {
          display: block;
          width: 100%;
          margin: 6px 0;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function ensureListeners() {
    document.addEventListener("pointermove", handleTokenPointerMove);
    document.addEventListener("pointerup", handleTokenPointerUp);
    document.addEventListener("pointercancel", cancelTokenDrag);
  }

  function connectButton() {
    refreshElements();

    if (!T.addTokenButton) {
      console.warn("Homebrew God tokens: addTokenButton was not found.");
      return;
    }

    if (T.addTokenButton.dataset.homebrewGodTokensConnected === "yes") {
      return;
    }

    T.addTokenButton.dataset.homebrewGodTokensConnected = "yes";
    T.addTokenButton.addEventListener("click", addToken);

    setStatus("Token system connected.");
  }

  function clampPercent(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return 50;
    }

    return Math.max(0, Math.min(100, number));
  }

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

        const cleanSize = Number.isFinite(Number(token.size))
          ? Number(token.size)
          : 64;

        return {
          ...token,
          type: cleanType,
          x: clampPercent(token.x),
          y: clampPercent(token.y),
          size: Math.max(32, Math.min(160, cleanSize)),
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

  function positionTokenElement(tokenEl, token) {
    const size = Number.isFinite(Number(token.size)) ? Number(token.size) : 64;
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

    const safeRoom = room || deps.getCurrentRoomData?.() || {};
    lastRenderedRoom = safeRoom;

    if (activeTokenDrag) {
      return;
    }

    const layer = prepareTokenLayer();

    if (!layer) {
      return;
    }

    layer.innerHTML = "";

    const isDM = deps.getCurrentIsDM ? deps.getCurrentIsDM() : false;

    const visibleTokens = getRoomTokens(safeRoom).filter(function (token) {
      return tokenMatchesCurrentView(token, safeRoom);
    });

    visibleTokens.forEach(function (token) {
      const tokenEl = document.createElement("div");
      tokenEl.className = "hg-token hg-token-" + token.type;
      tokenEl.dataset.tokenId = token.id;
      tokenEl.title = token.name || "Token";

      positionTokenElement(tokenEl, token);

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

      if (!deps.uploadImage) {
        alert("Token uploader is not connected.");
        return;
      }

      setStatus("Uploading token...");

      if (T.addTokenButton) {
        T.addTokenButton.disabled = true;
      }

      const cloudinaryResult = await deps.uploadImage(file);
      const oldTokens = getRoomTokens(roomData || {});

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
        size: 64,
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

      setStatus("Token added. Drag it around the map.");
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

    activeTokenDrag = {
      tokenId: token.id,
      tokenEl: tokenEl,
      size: token.size || 64,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: clampPercent(token.x),
      startY: clampPercent(token.y),
      currentX: clampPercent(token.x),
      currentY: clampPercent(token.y),
      rectWidth: Math.max(1, rect.width),
      rectHeight: Math.max(1, rect.height),
      lastSaveAt: 0
    };

    tokenEl.classList.add("hg-token-dragging");
    setStatus("Dragging token...");
  }

  function queueTokenPositionSave() {
    if (!activeTokenDrag) {
      return;
    }

    const now = Date.now();

    if (now - activeTokenDrag.lastSaveAt < 350) {
      return;
    }

    activeTokenDrag.lastSaveAt = now;

    saveTokenPosition(
      activeTokenDrag.tokenId,
      activeTokenDrag.currentX,
      activeTokenDrag.currentY
    ).catch(function (error) {
      console.warn("Token position save failed:", error);
    });
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

    positionTokenElement(drag.tokenEl, {
      x: drag.currentX,
      y: drag.currentY,
      size: drag.size
    });

    queueTokenPositionSave();
  }

  async function handleTokenPointerUp() {
    if (!activeTokenDrag) {
      return;
    }

    const drag = activeTokenDrag;
    activeTokenDrag = null;

    drag.tokenEl.classList.remove("hg-token-dragging");

    try {
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

  function init() {
    refreshElements();
    ensureStyles();
    ensureListeners();
    connectButton();

    window.HomebrewGodTokens = api;

    render(deps.getCurrentRoomData ? deps.getCurrentRoomData() : {});
  }

  const api = {
    init,
    render,
    addToken,
    deleteToken
  };

  init();

  return api;
}
