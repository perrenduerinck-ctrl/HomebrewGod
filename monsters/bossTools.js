const text = (value, fallback = "") => String(value ?? "").trim() || fallback;

export function normalizeMonsterBossTools(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    legendaryActionBudget: Math.max(0, Math.round(Number(source.legendaryActionBudget) || 0)),
    mythicPhaseNotes: text(source.mythicPhaseNotes),
    secondPhaseNotes: text(source.secondPhaseNotes)
  };
}

export function createMonsterBossTools({ root, onChange = () => {} } = {}) {
  if (!root) return null;
  const document = root.ownerDocument || globalThis.document;
  let state = normalizeMonsterBossTools();
  let disabled = false;
  const listeners = [];
  const listen = (event, handler) => {
    root.addEventListener(event, handler);
    listeners.push(() => root.removeEventListener(event, handler));
  };

  function render() {
    root.replaceChildren();
    root.className = "monster-advanced-card monster-boss-tools";
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "Advanced Boss Tools";
    const note = document.createElement("p");
    note.textContent = "Optional. Recharge and legendary costs are set on individual action cards.";
    const grid = document.createElement("div");
    grid.className = "monster-boss-grid";
    for (const [key, label, type] of [
      ["legendaryActionBudget", "Legendary Action Budget", "number"],
      ["mythicPhaseNotes", "Mythic Phase Notes", "textarea"],
      ["secondPhaseNotes", "Second-Phase Notes", "textarea"]
    ]) {
      const wrapper = document.createElement("label");
      const caption = document.createElement("span");
      caption.textContent = label;
      const control = document.createElement(type === "textarea" ? "textarea" : "input");
      if (type === "number") {
        control.type = "number";
        control.min = "0";
      }
      control.value = state[key];
      control.dataset.bossField = key;
      wrapper.append(caption, control);
      grid.append(wrapper);
    }
    details.append(summary, note, grid);
    root.append(details);
    root.querySelectorAll("input, textarea").forEach((control) => control.disabled = disabled);
  }

  listen("input", (event) => {
    const control = event.target.closest("[data-boss-field]");
    if (!control) return;
    state[control.dataset.bossField] = control.value;
    state = normalizeMonsterBossTools(state);
    onChange(state);
  });
  render();
  return Object.freeze({
    read: () => normalizeMonsterBossTools(state),
    write(value, { silent = false } = {}) {
      state = normalizeMonsterBossTools(value);
      render();
      if (!silent) onChange(state);
    },
    setDisabled(value) {
      disabled = Boolean(value);
      render();
    },
    destroy() {
      listeners.splice(0).forEach((remove) => remove());
    }
  });
}
