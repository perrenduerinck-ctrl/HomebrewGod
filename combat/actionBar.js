import { buildCombatActionBarModel } from "./actionBarModel.js";
import {
  createEmptyActionEconomy,
  synchronizeActionEconomy
} from "./actionEconomy.js";

const TABS = Object.freeze([
  ["main", "Main"],
  ["weapons", "Weapons"],
  ["spells", "Spells"],
  ["abilities", "Abilities"],
  ["items", "Items"]
]);
const DISPLAY_MODES = new Set(["expanded", "compact", "hidden"]);
const DISPLAY_MODE_STORAGE_KEY = "homebrewGodCombatActionBarDisplay";

function text(value) {
  return String(value ?? "").trim();
}
function button(label, className = "") {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.textContent = label;
  return element;
}

function sectionLabel(resource) {
  if (resource === "bonus") return "Bonus Action";
  if (resource === "reaction") return "Reaction";
  if (resource === "free") return "Free";
  return "Action";
}

function resourceAvailable(resource, economy, combatActive) {
  if (!combatActive || resource === "free") return true;
  if (resource === "bonus") return Number(economy?.bonusActionsRemaining) > 0;
  if (resource === "reaction") return economy?.reactionAvailable === true;
  return Number(economy?.actionsRemaining) > 0;
}

export function createCombatActionBar({
  root,
  tokenSystem,
  initiativeSystem,
  movementSystem,
  watchActor,
  watchEconomy,
  getEffects = () => [],
  canControl = () => false,
  onExecute = async () => {},
  onToggleFavorite = async () => {},
  onEndTurn = async () => {},
  onMovementMode = async () => {},
  onStatus = null,
  storage = globalThis.localStorage
} = {}) {
  if (!root) throw new Error("The Combat Action Bar needs a Battle Map root.");

  const dock = document.createElement("section");
  dock.id = "combatActionBar";
  dock.className = "hg-combat-action-bar hidden";
  dock.setAttribute("aria-label", "Combat Action Bar");
  dock.innerHTML = `
    <div class="hg-action-bar-chrome">
      <button type="button" data-action-bar-collapse aria-expanded="true" title="Collapse hotbar">⌄</button>
      <button type="button" data-action-bar-hide title="Hide hotbar" aria-label="Hide hotbar">×</button>
    </div>
    <div class="hg-action-bar-actor" data-action-actor></div>
    <div class="hg-action-bar-center">
      <div class="hg-action-bar-tabs" role="tablist" aria-label="Action sections" data-action-tabs></div>
      <div class="hg-action-bar-tools">
        <label class="hg-action-bar-search-label"><span>Filter</span><input type="search" data-action-search placeholder="Search actions"></label>
        <div class="hg-action-bar-modes" data-movement-modes></div>
      </div>
      <div class="hg-action-bar-actions" role="tabpanel" data-action-list></div>
      <p class="hg-action-bar-status" data-action-status aria-live="polite"></p>
    </div>
    <div class="hg-action-bar-turn" data-action-turn></div>`;
  root.appendChild(dock);
  const reopen = button("Actions", "hg-action-bar-reopen hidden");
  reopen.type = "button";
  reopen.setAttribute("aria-label", "Show Combat Action Bar");
  reopen.title = "Show Combat Action Bar";
  root.appendChild(reopen);

  const actorRoot = dock.querySelector("[data-action-actor]");
  const tabsRoot = dock.querySelector("[data-action-tabs]");
  const listRoot = dock.querySelector("[data-action-list]");
  const turnRoot = dock.querySelector("[data-action-turn]");
  const modesRoot = dock.querySelector("[data-movement-modes]");
  const searchInput = dock.querySelector("[data-action-search]");
  const statusRoot = dock.querySelector("[data-action-status]");
  const collapseButton = dock.querySelector("[data-action-bar-collapse]");
  const hideButton = dock.querySelector("[data-action-bar-hide]");

  let selectedToken = null;
  let actor = null;
  let actorKind = "generic";
  let actorPrivate = false;
  let economy = createEmptyActionEconomy();
  let initiative = initiativeSystem?.getState?.() || {};
  let movement = movementSystem?.getState?.() || {};
  let activeTab = "main";
  let search = "";
  let busy = false;
  let screen = "";
  let displayMode = "expanded";
  let stopActorWatch = null;
  let stopEconomyWatch = null;
  const unsubscribers = [];

  try {
    const savedMode = storage?.getItem?.(DISPLAY_MODE_STORAGE_KEY);
    if (DISPLAY_MODES.has(savedMode)) displayMode = savedMode;
  } catch {
    // Browsers that block local storage still get a fully working hotbar.
  }

  function setDisplayMode(mode) {
    displayMode = DISPLAY_MODES.has(mode) ? mode : "expanded";
    try {
      storage?.setItem?.(DISPLAY_MODE_STORAGE_KEY, displayMode);
    } catch {
      // Display preferences are optional and never block combat.
    }
    render();
  }

  function setStatus(message, tone = "") {
    statusRoot.textContent = message || "";
    statusRoot.dataset.tone = tone;
    if (typeof onStatus === "function") onStatus(message, tone);
  }

  function currentModel() {
    return buildCombatActionBarModel({ token: selectedToken || {}, actor, actorKind });
  }

  function isTurnUsable() {
    return initiative.combatActive !== true || (
      text(initiative.currentCombatantId) === text(selectedToken?.id)
    );
  }

  function renderActor() {
    actorRoot.replaceChildren();
    if (!selectedToken) return;
    const image = selectedToken.imageUrl
      ? document.createElement("img")
      : document.createElement("span");
    image.className = "hg-action-bar-portrait";
    if (image.tagName === "IMG") {
      image.src = selectedToken.imageUrl;
      image.alt = "";
    } else {
      image.textContent = text(selectedToken.name).charAt(0).toUpperCase() || "?";
      image.setAttribute("aria-hidden", "true");
    }
    const details = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = selectedToken.name || "Token";
    const stats = document.createElement("span");
    const values = [];
    if (Number(selectedToken.maxHp) > 0) values.push(`HP ${selectedToken.currentHp}/${selectedToken.maxHp}`);
    if (Number(selectedToken.armorClass) > 0) values.push(`AC ${selectedToken.armorClass}`);
    const modeSpeed = Number(movement.baseSpeed || selectedToken.movementSpeed || selectedToken.baseSpeed || 0);
    if (modeSpeed > 0) values.push(`Speed ${modeSpeed} ft`);
    stats.textContent = values.join(" · ");
    details.append(name, stats);
    const effects = getEffects(selectedToken.id) || [];
    const badges = document.createElement("div");
    badges.className = "hg-action-bar-badges";
    if (actor?.combat?.concentration) {
      const concentration = document.createElement("span");
      concentration.textContent = "Concentration";
      concentration.title = text(actor.combat.concentration.spellName) || "Concentrating";
      badges.appendChild(concentration);
    }
    effects.slice(0, 3).forEach((effect) => {
      const badge = document.createElement("span");
      badge.textContent = text(effect.name) || "Effect";
      badges.appendChild(badge);
    });
    details.appendChild(badges);
    actorRoot.append(image, details);
  }

  function renderTabs(model) {
    tabsRoot.replaceChildren();
    const counts = {
      main: model.universal.length + model.favorites.length,
      weapons: model.weapons.length,
      spells: model.spells.length,
      abilities: model.abilities.length,
      items: model.items.length
    };
    TABS.forEach(([id, label]) => {
      const tab = button(`${label}${counts[id] ? ` ${counts[id]}` : ""}`, "hg-action-bar-tab");
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", String(activeTab === id));
      tab.dataset.active = activeTab === id ? "true" : "false";
      tab.addEventListener("click", () => {
        activeTab = id;
        render();
      });
      tabsRoot.appendChild(tab);
    });
  }

  function tabEntries(model) {
    if (activeTab === "main") {
      const seen = new Set();
      return [...model.favorites, ...model.universal].filter((entry) => {
        if (seen.has(entry.key)) return false;
        seen.add(entry.key);
        return true;
      });
    }
    return model[activeTab] || [];
  }

  function renderActions(model) {
    listRoot.replaceChildren();
    const controlled = canControl(selectedToken);
    const query = search.toLowerCase();
    const entries = tabEntries(model).filter((action) => (
      !query || `${action.name} ${action.summary}`.toLowerCase().includes(query)
    ));
    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "hg-action-bar-empty";
      empty.textContent = actorPrivate
        ? "This token's private character details are not available to you."
        : `No ${activeTab === "main" ? "actions" : activeTab} match this view.`;
      listRoot.appendChild(empty);
      return;
    }
    entries.forEach((action) => {
      const wrapper = document.createElement("div");
      wrapper.className = "hg-action-button-wrap";
      const actionButton = button(action.name, "hg-action-button");
      actionButton.title = action.summary || action.name;
      actionButton.setAttribute("aria-label", `${action.name}. ${action.summary || sectionLabel(action.resource)}`);
      actionButton.dataset.resourceAvailable = String(resourceAvailable(
        action.resource,
        economy,
        initiative.combatActive === true
      ));
      actionButton.disabled = busy || !controlled || !isTurnUsable();
      const economyLabel = document.createElement("small");
      economyLabel.textContent = sectionLabel(action.resource);
      actionButton.appendChild(economyLabel);
      actionButton.addEventListener("click", async () => {
        if (busy) return;
        busy = true;
        render();
        setStatus(`${action.name} ready…`);
        try {
          const result = await onExecute(action, {
            token: selectedToken,
            actor,
            actorKind,
            model,
            economy,
            initiative,
            movement
          });
          if (result?.message) setStatus(result.message, "success");
        } catch (error) {
          setStatus(error?.message || "That action could not be completed.", "error");
        } finally {
          busy = false;
          render();
        }
      });
      wrapper.appendChild(actionButton);
      if (actorKind === "character" && action.kind !== "universal") {
        const pinned = model.favoriteKeys.has(action.key);
        const favorite = button(pinned ? "★" : "☆", "hg-action-favorite");
        favorite.title = pinned ? "Remove from Main" : "Pin to Main";
        favorite.setAttribute("aria-label", favorite.title);
        favorite.setAttribute("aria-pressed", String(pinned));
        favorite.disabled = busy || !controlled;
        favorite.addEventListener("click", async () => {
          busy = true;
          render();
          try {
            await onToggleFavorite(action, !pinned, { token: selectedToken, actor });
            setStatus(!pinned ? `${action.name} pinned to Main.` : `${action.name} removed from Main.`, "success");
          } catch (error) {
            setStatus(error?.message || "The favorite could not be saved.", "error");
          } finally {
            busy = false;
            render();
          }
        });
        wrapper.appendChild(favorite);
      }
      listRoot.appendChild(wrapper);
    });
  }

  function renderModes(model) {
    modesRoot.replaceChildren();
    if (!model.movementModes.length || !canControl(selectedToken)) return;
    const label = document.createElement("span");
    label.textContent = "Movement";
    modesRoot.appendChild(label);
    model.movementModes.forEach((mode) => {
      const modeButton = button(`${mode.label} ${mode.speed}`, "hg-action-mode");
      const active = text(movement.movementMode || "walk") === mode.id;
      modeButton.setAttribute("aria-pressed", String(active));
      modeButton.dataset.active = active ? "true" : "false";
      modeButton.disabled = busy || !isTurnUsable();
      modeButton.addEventListener("click", async () => {
        busy = true;
        render();
        try {
          await onMovementMode(mode, { token: selectedToken, actor, movement, initiative });
          setStatus(`${mode.label} movement selected.`, "success");
        } catch (error) {
          setStatus(error?.message || "Movement mode could not be changed.", "error");
        } finally {
          busy = false;
          render();
        }
      });
      modesRoot.appendChild(modeButton);
    });
  }

  function resourceMeter(label, available, detail = "") {
    const meter = document.createElement("div");
    meter.className = "hg-action-resource";
    meter.dataset.available = available ? "true" : "false";
    const dot = document.createElement("span");
    dot.setAttribute("aria-hidden", "true");
    const value = document.createElement("span");
    value.textContent = `${label}${detail ? ` ${detail}` : ""}`;
    meter.append(dot, value);
    return meter;
  }

  function renderTurn() {
    turnRoot.replaceChildren();
    if (!selectedToken) return;
    if (initiative.combatActive === true) {
      turnRoot.append(
        resourceMeter("Action", economy.actionsRemaining > 0),
        resourceMeter("Bonus", economy.bonusActionsRemaining > 0),
        resourceMeter("Reaction", economy.reactionAvailable),
        resourceMeter("Movement", movement.movementRemaining > 0, `${movement.movementRemaining || 0}/${movement.baseSpeed || 0} ft`)
      );
      const active = text(initiative.currentCombatantId) === text(selectedToken.id);
      const end = button("End Turn", "hg-action-end-turn");
      end.disabled = busy || !active || !canControl(selectedToken);
      end.addEventListener("click", async () => {
        if (busy) return;
        busy = true;
        end.disabled = true;
        try {
          await onEndTurn({ token: selectedToken, initiative });
          setStatus("Turn advance requested.", "success");
        } catch (error) {
          setStatus(error?.message || "The turn could not be ended.", "error");
        } finally {
          busy = false;
          render();
        }
      });
      turnRoot.appendChild(end);
    } else {
      const free = document.createElement("p");
      free.textContent = "Free exploration";
      turnRoot.appendChild(free);
    }
  }

  function render() {
    const visible = screen === "battle" && Boolean(selectedToken);
    const dockVisible = visible && displayMode !== "hidden";
    dock.classList.toggle("hidden", !dockVisible);
    dock.classList.toggle("is-compact", displayMode === "compact");
    reopen.classList.toggle("hidden", !visible || displayMode !== "hidden");
    document.body.classList.toggle("hg-combat-action-bar-visible", dockVisible);
    if (!visible) return;
    collapseButton.textContent = displayMode === "compact" ? "⌃" : "⌄";
    collapseButton.title = displayMode === "compact" ? "Expand hotbar" : "Collapse hotbar";
    collapseButton.setAttribute("aria-label", collapseButton.title);
    collapseButton.setAttribute("aria-expanded", String(displayMode === "expanded"));
    const model = currentModel();
    renderActor();
    renderTabs(model);
    renderModes(model);
    renderActions(model);
    renderTurn();
  }

  function stopRecordWatches() {
    stopActorWatch?.();
    stopEconomyWatch?.();
    stopActorWatch = null;
    stopEconomyWatch = null;
  }

  function selectToken(token) {
    stopRecordWatches();
    selectedToken = token || null;
    actor = null;
    actorKind = "generic";
    actorPrivate = false;
    economy = createEmptyActionEconomy(token?.id);
    activeTab = "main";
    search = "";
    searchInput.value = "";
    setStatus("");
    if (selectedToken && typeof watchActor === "function") {
      stopActorWatch = watchActor(selectedToken, (snapshot = {}) => {
        actor = snapshot.actor || null;
        actorKind = snapshot.kind || "generic";
        actorPrivate = snapshot.private === true;
        render();
      });
    }
    if (selectedToken && typeof watchEconomy === "function") {
      stopEconomyWatch = watchEconomy(selectedToken, (snapshot) => {
        economy = snapshot || createEmptyActionEconomy(selectedToken.id);
        render();
      });
    }
    render();
  }

  searchInput.addEventListener("input", () => {
    search = searchInput.value.trim();
    render();
  });
  collapseButton.addEventListener("click", () => {
    setDisplayMode(displayMode === "compact" ? "expanded" : "compact");
  });
  hideButton.addEventListener("click", () => setDisplayMode("hidden"));
  reopen.addEventListener("click", () => setDisplayMode("compact"));
  unsubscribers.push(tokenSystem?.subscribeSelection?.(selectToken));
  unsubscribers.push(initiativeSystem?.subscribe?.((state) => {
    initiative = state;
    economy = synchronizeActionEconomy(economy, state, selectedToken?.id || "");
    render();
  }));
  unsubscribers.push(movementSystem?.subscribe?.((state) => {
    movement = state;
    render();
  }));

  return Object.freeze({
    root: dock,
    setScreen(nextScreen) {
      const next = text(nextScreen);
      const enteringBattle = screen !== "battle" && next === "battle";
      if (screen === "battle" && next !== "battle") stopRecordWatches();
      screen = next;
      if (enteringBattle && selectedToken) {
        selectToken(selectedToken);
        return;
      }
      render();
    },
    openTab(tabId) {
      if (TABS.some(([id]) => id === tabId)) {
        activeTab = tabId;
        render();
      }
    },
    refresh() {
      selectedToken = tokenSystem?.getSelectedToken?.() || selectedToken;
      render();
    },
    setStatus,
    setDisplayMode,
    getDisplayMode() {
      return displayMode;
    },
    destroy() {
      stopRecordWatches();
      unsubscribers.filter(Boolean).forEach((unsubscribe) => unsubscribe());
      dock.remove();
      reopen.remove();
      document.body.classList.remove("hg-combat-action-bar-visible");
    }
  });
}

