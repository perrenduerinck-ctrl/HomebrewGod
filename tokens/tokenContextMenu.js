const text = (value) => String(value ?? "").trim();
const ACTION_ICONS = Object.freeze({
  "open-character": "♙", "open-monster": "♜", "open-linked": "↗", move: "➠", actions: "⚔", spells: "✦",
  conditions: "◈", stats: "♥", measure: "⌁", elevation: "↕", focus: "◎", "edit-token": "✎",
  "adjust-hp": "✚", "apply-condition": "◆", "set-elevation": "↕", "move-floor": "⇅", "remove-token": "×"
});

function item(id, label, options = {}) {
  return Object.freeze({ id, label, enabled: options.enabled !== false, ...options });
}

export function getTokenStatVisibility({ token = {}, isDm = false, canControl = false } = {}) {
  const authorized = isDm === true || canControl === true;
  return Object.freeze({
    hp: authorized || token.display?.hpText === true,
    ac: authorized || token.display?.ac === true,
    authorized
  });
}

export function formatVisibleTokenStats({ token = {}, isDm = false, canControl = false } = {}) {
  const visibility = getTokenStatVisibility({ token, isDm, canControl });
  const parts = [];
  if (visibility.hp) {
    parts.push(Number(token.maxHp) > 0 ? `HP ${Number(token.currentHp) || 0}/${Number(token.maxHp)}` : "HP not tracked");
  }
  if (visibility.ac) {
    parts.push(Number(token.armorClass) > 0 ? `AC ${Number(token.armorClass)}` : "AC not tracked");
  }
  return Object.freeze({ visibility, parts, text: parts.join(" · ") });
}

export function buildTokenContextActions({
  token = {},
  isDm = false,
  canControl = false,
  combatActive = false,
  isCurrentTurn = true,
  canViewStats = getTokenStatVisibility({ token, isDm, canControl }).hp || getTokenStatVisibility({ token, isDm, canControl }).ac,
  nearbyConnections = []
} = {}) {
  const linkedCharacter = text(token.linkedCharacterId);
  const linkedMonster = text(token.linkedMonsterId || token.linkedMonster?.id);
  const linked = linkedCharacter || linkedMonster;
  const turnBlocked = combatActive && !isCurrentTurn && !isDm;
  const actions = [];

  if (linkedCharacter && (canControl || isDm)) actions.push(item("open-character", "View Character Sheet", { group: "record" }));
  if (linkedMonster && isDm) actions.push(item("open-monster", "Open Linked Monster", { group: "record" }));
  if (linked && isDm && !actions.some((entry) => entry.id.startsWith("open-"))) {
    actions.push(item("open-linked", "Open Linked Record", { group: "record" }));
  }
  if (canControl || isDm) {
    actions.push(item("move", "Move Token", {
      group: "combat",
      enabled: !turnBlocked,
      reason: turnBlocked ? "It is not this token's turn." : ""
    }));
    actions.push(item("actions", "Attack / Choose Action", {
      group: "combat",
      enabled: !turnBlocked,
      reason: turnBlocked ? "It is not this token's turn." : ""
    }));
    if (linkedCharacter) {
      actions.push(item("spells", "Cast Spell", {
        group: "combat",
        enabled: !turnBlocked,
        reason: turnBlocked ? "It is not this token's turn." : ""
      }));
    }
  }

  actions.push(item("conditions", "View Conditions", { group: "inspect" }));
  if (canViewStats) actions.push(item("stats", "View Visible Combat Stats", { group: "inspect" }));
  actions.push(item("measure", "Measure from Token", { group: "map" }));
  actions.push(item("elevation", `Elevation: ${Number(token.elevation ?? token.elevationFeet) || 0} ft`, { group: "map" }));
  actions.push(item("focus", "Focus Camera on Token", { group: "map" }));

  nearbyConnections.forEach((connection) => {
    actions.push(item(`connection:${connection.id}`, `Travel via ${connection.name || "connection"}`, {
      enabled: connection.available !== false,
      reason: connection.reason || "",
      connectionId: connection.id,
      group: "floor"
    }));
  });

  if (isDm) {
    actions.push(item("edit-token", "Edit Token", { group: "dm" }));
    actions.push(item("adjust-hp", "Adjust HP", { group: "dm" }));
    actions.push(item("apply-condition", "Apply / Remove Condition", { group: "dm" }));
    actions.push(item("set-elevation", "Set Elevation", { group: "dm" }));
    actions.push(item("move-floor", "Move to Another Floor", { group: "dm" }));
    actions.push(item("remove-token", "Remove Token", { group: "dm", danger: true }));
  }
  return actions;
}

export function createTokenContextMenu({
  surface,
  tokenSystem,
  getContext = () => ({}),
  getConnectionOptions = () => [],
  onAction = async () => {}
} = {}) {
  if (!surface || !tokenSystem) throw new Error("Token context menus need a map surface and token system.");

  const menu = document.createElement("section");
  menu.className = "hg-token-context-menu hidden";
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Token actions");
  menu.setAttribute("aria-hidden", "true");
  document.body.appendChild(menu);

  let openTokenId = "";
  let trigger = null;
  let screen = "";
  let destroyed = false;

  function close({ restoreFocus = false } = {}) {
    if (!openTokenId) return false;
    openTokenId = "";
    menu.classList.add("hidden");
    menu.setAttribute("aria-hidden", "true");
    menu.replaceChildren();
    if (restoreFocus) trigger?.focus?.();
    trigger = null;
    return true;
  }

  function positionMenu(clientX, clientY) {
    menu.style.left = "0px";
    menu.style.top = "0px";
    const rect = menu.getBoundingClientRect();
    const margin = 8;
    const left = Math.max(margin, Math.min(clientX, window.innerWidth - rect.width - margin));
    const top = Math.max(margin, Math.min(clientY, window.innerHeight - rect.height - margin));
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }

  function tokenForElement(element) {
    const id = text(element?.dataset?.tokenId);
    return tokenSystem.getRoomTokens?.().find((entry) => text(entry.id) === id) || null;
  }

  function render(token, context) {
    menu.replaceChildren();
    const heading = document.createElement("header");
    const name = document.createElement("strong");
    name.textContent = text(token.name) || "Token";
    const detail = document.createElement("span");
    const parts = [text(token.type) || "token"];
    if (context.combatActive) parts.push(context.isCurrentTurn ? "current turn" : "waiting turn");
    detail.textContent = parts.join(" · ");
    heading.append(name, detail);
    menu.appendChild(heading);

    const actions = buildTokenContextActions({
      token,
      ...context,
      nearbyConnections: getConnectionOptions(token) || []
    });
    let previousGroup = "";
    actions.forEach((action) => {
      if (previousGroup && action.group !== previousGroup) {
        const divider = document.createElement("div");
        divider.className = "hg-token-menu-divider";
        divider.setAttribute("role", "separator");
        menu.appendChild(divider);
      }
      previousGroup = action.group || previousGroup;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "hg-token-menu-item";
      button.dataset.tokenMenuAction = action.id;
      button.setAttribute("role", "menuitem");
      button.disabled = action.enabled === false;
      button.classList.toggle("is-danger", action.danger === true);
      const icon = action.id.startsWith("connection:") ? "⇅" : ACTION_ICONS[action.id] || "•";
      button.innerHTML = `<span class="hg-token-menu-icon" aria-hidden="true"></span><span class="hg-token-menu-label"></span>`;
      button.querySelector(".hg-token-menu-icon").textContent = icon;
      button.querySelector(".hg-token-menu-label").textContent = action.label;
      if (action.reason) button.title = action.reason;
      button.addEventListener("click", async () => {
        if (button.disabled) return;
        button.disabled = true;
        menu.setAttribute("aria-busy", "true");
        try {
          const completed = await onAction(action.id, { token, action, context });
          if (completed !== false) close();
        } catch (error) {
          button.disabled = false;
          button.title = error?.message || "This token action could not be completed.";
          const status = menu.querySelector("[data-token-menu-status]");
          if (status) status.textContent = button.title;
        } finally {
          menu.removeAttribute("aria-busy");
        }
      });
      menu.appendChild(button);
    });
    const status = document.createElement("p");
    status.dataset.tokenMenuStatus = "true";
    status.className = "hg-token-menu-status";
    status.setAttribute("role", "status");
    menu.appendChild(status);
  }

  function open(tokenElement, point = null) {
    if (destroyed || screen !== "battle") return false;
    const token = tokenForElement(tokenElement);
    if (!token) return false;
    const context = getContext(token) || {};
    tokenSystem.setSelectedToken?.(token.id, "context-menu");
    openTokenId = token.id;
    trigger = tokenElement;
    render(token, context);
    menu.classList.remove("hidden");
    menu.setAttribute("aria-hidden", "false");
    const tokenRect = tokenElement.getBoundingClientRect();
    positionMenu(point?.x ?? tokenRect.right + 6, point?.y ?? tokenRect.top);
    menu.querySelector("button:not(:disabled)")?.focus();
    return true;
  }

  function enhanceTokens() {
    surface.querySelectorAll(".hg-token[data-token-id]").forEach((tokenElement) => {
      if (tokenElement.querySelector(".hg-token-options")) return;
      const options = document.createElement("button");
      options.type = "button";
      options.className = "hg-token-options";
      options.textContent = "•••";
      options.title = `Options for ${tokenElement.dataset.tokenName || "token"}`;
      options.setAttribute("aria-label", options.title);
      options.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      options.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        open(tokenElement);
      });
      tokenElement.appendChild(options);
    });
  }

  const onContextMenu = (event) => {
    const tokenElement = event.target.closest?.(".hg-token[data-token-id]");
    if (!tokenElement || !surface.contains(tokenElement)) return;
    event.preventDefault();
    event.stopPropagation();
    open(tokenElement, { x: event.clientX, y: event.clientY });
  };
  const onPointerDown = (event) => {
    if (!openTokenId || menu.contains(event.target)) return;
    close();
  };
  const onKeyDown = (event) => {
    if (!openTokenId) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close({ restoreFocus: true });
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const buttons = [...menu.querySelectorAll("button:not(:disabled)")];
    if (!buttons.length) return;
    event.preventDefault();
    const current = buttons.indexOf(document.activeElement);
    const index = event.key === "Home" ? 0
      : event.key === "End" ? buttons.length - 1
        : event.key === "ArrowDown" ? (current + 1 + buttons.length) % buttons.length
          : (current - 1 + buttons.length) % buttons.length;
    buttons[index].focus();
  };
  const onTokensRendered = () => {
    enhanceTokens();
    if (openTokenId && !tokenSystem.getRoomTokens?.().some((token) => text(token.id) === openTokenId)) close();
  };

  surface.addEventListener("contextmenu", onContextMenu);
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("homebrewgod:tokens-rendered", onTokensRendered);
  const unsubscribeSelection = tokenSystem.subscribeSelection?.((token, reason) => {
    if (openTokenId && text(token?.id) !== openTokenId && reason !== "context-menu") close();
  });
  enhanceTokens();

  return Object.freeze({
    root: menu,
    open,
    close,
    refresh() {
      enhanceTokens();
      const tokenElement = openTokenId
        ? surface.querySelector(`.hg-token[data-token-id="${CSS.escape(openTokenId)}"]`)
        : null;
      if (!tokenElement) return close();
      return open(tokenElement);
    },
    setScreen(nextScreen) {
      screen = text(nextScreen);
      if (screen !== "battle") close();
      else enhanceTokens();
    },
    destroy() {
      destroyed = true;
      close();
      unsubscribeSelection?.();
      surface.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("homebrewgod:tokens-rendered", onTokensRendered);
      menu.remove();
    }
  });
}

