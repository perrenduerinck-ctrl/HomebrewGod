function text(element, value) {
  if (element) element.textContent = String(value ?? "");
}

function makeButton(label, action, tokenId, title = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.dataset.initiativeAction = action;
  if (tokenId) button.dataset.tokenId = tokenId;
  if (title) button.title = title;
  return button;
}

export function createInitiativePanel({
  root,
  system,
  getTokens = () => [],
  getIsDm = () => false,
  tokenRoot = document
} = {}) {
  if (!root || !system) {
    throw new Error(
      "Initiative panel requires a root element and initiative system."
    );
  }

  const list = root.querySelector("[data-initiative-list]");
  const addSelect = root.querySelector("[data-initiative-add-select]");
  const dmControls = root.querySelector("[data-initiative-dm-controls]");
  const status = root.querySelector("[data-initiative-status]");
  let busy = false;

  function setStatus(message) {
    text(status, message || "");
  }

  function setBusy(value) {
    busy = value === true;
    root.querySelectorAll("button, input, select").forEach((element) => {
      if (element.closest("summary")) return;
      element.disabled = busy || getIsDm() !== true;
    });
  }

  function highlightActiveToken(state) {
    tokenRoot.querySelectorAll(".hg-token").forEach((token) => {
      const active =
        state.combatActive &&
        token.dataset.tokenId === state.currentCombatantId;
      token.classList.toggle("hg-token-current-turn", active);
      if (active) token.setAttribute("aria-current", "true");
      else token.removeAttribute("aria-current");
    });
  }

  function renderTokenPicker(state) {
    if (!addSelect) return;
    const selected = addSelect.value;
    const existing = new Set(
      state.initiativeOrder.map((combatant) => combatant.tokenId)
    );
    const tokens = getTokens()
      .filter((token) => token?.id && !existing.has(token.id))
      .sort((left, right) => String(left.name || "")
        .localeCompare(String(right.name || "")));

    addSelect.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = tokens.length
      ? "Choose a map token"
      : "No available map tokens";
    addSelect.appendChild(placeholder);

    tokens.forEach((token) => {
      const option = document.createElement("option");
      option.value = token.id;
      option.textContent = `${token.name || "Token"} · ${token.type || "object"}`;
      addSelect.appendChild(option);
    });
    if (tokens.some((token) => token.id === selected)) {
      addSelect.value = selected;
    }
  }

  function render(state = system.getState()) {
    const isDm = getIsDm() === true;
    const current = state.initiativeOrder.find(
      (combatant) => combatant.tokenId === state.currentCombatantId
    );

    root.dataset.combatActive = String(state.combatActive);
    text(
      root.querySelector("[data-initiative-summary]"),
      state.combatActive
        ? `Round ${state.roundNumber} · ${current?.name || "Turn"}`
        : `${state.initiativeOrder.length} combatant${state.initiativeOrder.length === 1 ? "" : "s"}`
    );
    text(
      root.querySelector("[data-initiative-round]"),
      state.combatActive ? `Round ${state.roundNumber}` : "Initiative"
    );
    text(
      root.querySelector("[data-initiative-current]"),
      state.combatActive
        ? `Current turn: ${current?.name || "Unknown combatant"}`
        : "Combat has not started."
    );
    dmControls?.classList.toggle("hidden", !isDm);

    list?.replaceChildren();
    if (list && state.initiativeOrder.length === 0) {
      const empty = document.createElement("li");
      empty.className = "initiativeEmptyState";
      empty.textContent = isDm
        ? "Add battle-map tokens to build the encounter."
        : "The DM has not added combatants yet.";
      list.appendChild(empty);
    }

    state.initiativeOrder.forEach((combatant, index) => {
      if (!list) return;
      const item = document.createElement("li");
      item.className = "initiativeCombatant";
      item.dataset.tokenId = combatant.tokenId;
      const isCurrent =
        state.combatActive &&
        combatant.tokenId === state.currentCombatantId;
      item.classList.toggle("is-current", isCurrent);

      const value = document.createElement("input");
      value.type = "number";
      value.min = "-999";
      value.max = "999";
      value.step = "1";
      value.value = String(combatant.totalInitiative);
      value.dataset.initiativeValue = combatant.tokenId;
      value.setAttribute(
        "aria-label",
        `${combatant.name} initiative`
      );
      value.readOnly = !isDm;

      const identity = document.createElement("span");
      identity.className = "initiativeIdentity";
      const name = document.createElement("strong");
      name.textContent = combatant.name;
      const detail = document.createElement("small");
      detail.textContent = `${combatant.tokenType} · bonus ${combatant.initiativeBonus >= 0 ? "+" : ""}${combatant.initiativeBonus}`;
      identity.append(name, detail);

      const marker = document.createElement("span");
      marker.className = "initiativeTurnMarker";
      marker.textContent = isCurrent ? "CURRENT" : `#${index + 1}`;

      item.append(value, identity, marker);

      if (isDm) {
        const actions = document.createElement("span");
        actions.className = "initiativeRowActions";
        actions.append(
          makeButton("🎲", "roll-one", combatant.tokenId, "Roll initiative"),
          makeButton("↑", "tie-up", combatant.tokenId, "Move up within a tie"),
          makeButton("↓", "tie-down", combatant.tokenId, "Move down within a tie"),
          makeButton("×", "remove", combatant.tokenId, "Remove from initiative")
        );
        item.appendChild(actions);
      }
      list.appendChild(item);
    });

    renderTokenPicker(state);
    highlightActiveToken(state);

    const startButton = root.querySelector(
      '[data-initiative-action="start"]'
    );
    const turnButtons = root.querySelectorAll(
      '[data-initiative-action="next"], [data-initiative-action="previous"], [data-initiative-action="end"]'
    );
    startButton?.classList.toggle("hidden", state.combatActive);
    turnButtons.forEach((button) => {
      button.classList.toggle("hidden", !state.combatActive);
    });
    setBusy(busy);
  }

  async function mutate(action, successMessage) {
    if (busy) return;
    setBusy(true);
    setStatus("Saving initiative…");
    try {
      await action();
      setStatus(successMessage || "Initiative saved.");
    } catch (error) {
      setStatus(error?.message || "Initiative could not be changed.");
    } finally {
      setBusy(false);
      render();
    }
  }

  function onClick(event) {
    const button = event.target.closest("[data-initiative-action]");
    if (!button || !root.contains(button) || getIsDm() !== true) return;
    const action = button.dataset.initiativeAction;
    const tokenId = button.dataset.tokenId;

    if (action === "add") {
      const token = getTokens().find(
        (candidate) => candidate.id === addSelect?.value
      );
      if (!token) {
        setStatus("Choose a battle-map token first.");
        return;
      }
      mutate(() => system.addToken(token), `${token.name || "Token"} added.`);
    } else if (action === "roll-all") {
      mutate(() => system.rollInitiative(), "Initiative rolled and sorted.");
    } else if (action === "roll-one") {
      mutate(() => system.rollInitiative([tokenId]), "Initiative rolled.");
    } else if (action === "tie-up" || action === "tie-down") {
      mutate(
        () => system.moveTie(tokenId, action === "tie-down" ? "down" : "up"),
        "Tie order updated."
      );
    } else if (action === "remove") {
      mutate(() => system.removeCombatant(tokenId), "Combatant removed.");
    } else if (action === "start") {
      mutate(() => system.startCombat(), "Combat started.");
    } else if (action === "next") {
      mutate(() => system.nextTurn(), "Turn advanced.");
    } else if (action === "previous") {
      mutate(() => system.previousTurn(), "Returned to the previous turn.");
    } else if (action === "end") {
      mutate(() => system.endCombat(), "Combat ended.");
    }
  }

  function onChange(event) {
    const input = event.target.closest("[data-initiative-value]");
    if (!input || getIsDm() !== true) return;
    mutate(
      () => system.setInitiative(
        input.dataset.initiativeValue,
        input.value
      ),
      "Initiative value updated."
    );
  }

  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  const unsubscribe = system.subscribe(render);
  const onTokensRendered = () => render();
  document.addEventListener(
    "homebrewgod:tokens-rendered",
    onTokensRendered
  );

  return Object.freeze({
    render,
    setStatus,
    destroy() {
      unsubscribe();
      root.removeEventListener("click", onClick);
      root.removeEventListener("change", onChange);
      document.removeEventListener(
        "homebrewgod:tokens-rendered",
        onTokensRendered
      );
    }
  });
}
