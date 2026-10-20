const text = (value) => String(value ?? "").trim();
const number = (value) => Number.isFinite(Number(value)) ? Number(value) : null;

export function normalizeVerifiedCombatOutcome(value = {}) {
  const id = text(value.id || value.eventId);
  const verified = value.verified === true || value.authoritative === true;
  if (!id || !verified) return null;
  const type = ["damage", "healing", "temporary-hp", "manual-adjustment", "critical", "miss", "movement", "condition", "turn", "attack", "spell"].includes(value.type)
    ? value.type
    : "confirmed";
  const amount = number(value.amount);
  const roll = value.roll && typeof value.roll === "object"
    ? {
        die: text(value.roll.die || value.roll.expression),
        rolled: number(value.roll.rolled ?? value.roll.dieResult),
        modifier: number(value.roll.modifier),
        total: number(value.roll.total),
        label: text(value.roll.label)
      }
    : null;
  return Object.freeze({
    ...value,
    id,
    type,
    amount,
    previousHp: number(value.previousHp),
    nextHp: number(value.nextHp),
    roll,
    tokenId: text(value.tokenId || value.targetTokenId),
    actorName: text(value.actorName) || "Combatant",
    targetName: text(value.targetName),
    message: text(value.message),
    roomCode: text(value.roomCode),
    round: Math.max(0, Math.floor(number(value.round) || 0)),
    timestamp: Math.max(0, number(value.timestamp) || Date.now()),
    verified: true
  });
}

export function formatCombatOutcome(value = {}) {
  const outcome = normalizeVerifiedCombatOutcome(value);
  if (!outcome) return "";
  if (outcome.message) return outcome.message;
  const amount = outcome.amount;
  const target = outcome.targetName || "target";
  if (outcome.type === "damage" && amount != null) return `${outcome.actorName} confirmed ${amount} damage to ${target}.`;
  if (outcome.type === "healing" && amount != null) return `${target} regained ${amount} HP.`;
  if (outcome.type === "temporary-hp" && amount != null) return `${target} gained ${amount} temporary HP.`;
  if (outcome.type === "manual-adjustment" && outcome.previousHp != null && outcome.nextHp != null) {
    return `${outcome.actorName} adjusted ${target} HP from ${outcome.previousHp} to ${outcome.nextHp}.`;
  }
  if (outcome.type === "critical") return `${outcome.actorName} scored a critical hit.`;
  if (outcome.type === "miss") return `${outcome.actorName} missed.`;
  if (outcome.type === "movement" && amount != null) return `${outcome.actorName} moved ${amount} ft.`;
  if (outcome.type === "condition") return `${target} condition updated.`;
  if (outcome.type === "turn") return `${outcome.actorName}'s turn changed.`;
  return `${outcome.actorName} resolved an action.`;
}

function localStateMessage(detail = {}) {
  if (detail.message) return text(detail.message);
  const name = text(detail.actionName) || "Action";
  const messages = {
    selected: `${name} selected.`,
    processing: `${name} is being prepared.`,
    targeting: `${name} targeting started.`,
    awaiting: `${name} is awaiting confirmation.`,
    committed: `${name} was confirmed.`,
    cancelled: `${name} was cancelled.`,
    rejected: `${name} was rejected.`,
    "save-failed": `${name} could not be saved.`
  };
  return messages[detail.state] || `${name}: ${detail.state || "updated"}.`;
}

export function createCombatFeedback({
  root,
  tokenRoot,
  reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true,
  maxEntries = 80
} = {}) {
  if (!root) throw new Error("Combat feedback needs a Battle Map root.");
  const panel = document.createElement("section");
  panel.className = "hg-combat-feedback hidden";
  panel.innerHTML = `
    <div class="hg-combat-toasts" data-combat-toasts aria-live="polite" aria-atomic="false"></div>
    <details class="hg-combat-log" data-combat-log>
      <summary>Combat Log <span data-combat-log-count>0</span></summary>
      <p class="hg-combat-log-scope">Live session log on this device. It is not persistent multiplayer history.</p>
      <div class="hg-combat-log-list" data-combat-log-list role="log" aria-live="polite"></div>
    </details>`;
  root.appendChild(panel);
  const toasts = panel.querySelector("[data-combat-toasts]");
  const log = panel.querySelector("[data-combat-log-list]");
  const count = panel.querySelector("[data-combat-log-count]");
  const entries = [];
  const seen = new Set();
  const timers = new Set();
  let roomCode = "";
  let screen = "";

  function clear() {
    entries.length = 0;
    seen.clear();
    log.replaceChildren();
    toasts.replaceChildren();
    count.textContent = "0";
    timers.forEach((timer) => clearTimeout(timer));
    timers.clear();
  }

  function addToast(message, tone = "info") {
    if (!message || screen !== "battle") return;
    const toast = document.createElement("div");
    toast.className = "hg-combat-toast";
    toast.dataset.tone = tone;
    toast.textContent = message;
    toasts.appendChild(toast);
    while (toasts.childElementCount > 3) toasts.firstElementChild?.remove();
    const timer = setTimeout(() => {
      toast.remove();
      timers.delete(timer);
    }, tone === "error" ? 6500 : 3600);
    timers.add(timer);
  }

  function createLogRow(entry) {
    const row = document.createElement("article");
    row.className = "hg-combat-log-entry";
    row.dataset.state = entry.state;
    row.dataset.type = entry.type;
    const meta = document.createElement("small");
    const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    meta.textContent = `${time} · ${entry.state === "confirmed" ? "Confirmed" : "Local"}`;
    const body = document.createElement("p");
    body.textContent = entry.message;
    row.append(meta, body);
    if (entry.roll && [entry.roll.rolled, entry.roll.modifier, entry.roll.total].some((value) => value != null)) {
      const dice = document.createElement("details");
      dice.className = "hg-combat-dice-result";
      const summary = document.createElement("summary");
      summary.textContent = "Roll details";
      const result = document.createElement("div");
      result.textContent = [
        entry.roll.label || entry.roll.die || "Roll",
        entry.roll.die ? `expression: ${entry.roll.die}` : "",
        entry.roll.rolled != null ? `rolled: ${entry.roll.rolled}` : "",
        entry.roll.modifier != null ? `modifier: ${entry.roll.modifier >= 0 ? "+" : ""}${entry.roll.modifier}` : "",
        entry.roll.total != null ? `total: ${entry.roll.total}` : ""
      ].filter(Boolean).join(" · ");
      dice.append(summary, result);
      row.appendChild(dice);
    }
    return row;
  }

  function renderLog() {
    log.replaceChildren();
    const newest = [...entries].reverse();
    const groups = new Map();
    newest.forEach((entry) => {
      const key = entry.round > 0 ? `round:${entry.round}` : "recent";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(entry);
    });
    groups.forEach((groupEntries, key) => {
      const section = document.createElement("section");
      section.className = "hg-combat-log-group";
      const heading = document.createElement("h4");
      heading.textContent = key === "recent" ? "Recent activity" : `Round ${key.slice("round:".length)}`;
      section.append(heading, ...groupEntries.map(createLogRow));
      log.appendChild(section);
    });
    count.textContent = String(entries.length);
  }

  function addLogEntry({ id, message, state = "confirmed", type = "confirmed", round = 0, timestamp = Date.now(), roll = null } = {}) {
    const dedupeKey = `${id}:${state}`;
    if (!id || !message || seen.has(dedupeKey)) return false;
    seen.add(dedupeKey);
    entries.push({ id, message, state, type, round, timestamp, roll, dedupeKey });
    if (entries.length > maxEntries) {
      entries.splice(0, entries.length - maxEntries).forEach((entry) => seen.delete(entry.dedupeKey));
    }
    renderLog();
    return true;
  }

  function floatingText(outcome) {
    if (!outcome.tokenId || !tokenRoot) return;
    const token = tokenRoot.querySelector(`.hg-token[data-token-id="${CSS.escape(outcome.tokenId)}"]`);
    if (!token) return;
    const labels = {
      damage: outcome.amount != null ? `−${outcome.amount}` : "",
      healing: outcome.amount != null ? `+${outcome.amount}` : "",
      "temporary-hp": outcome.amount != null ? `+${outcome.amount} Temp HP` : "",
      critical: "CRITICAL!",
      miss: "MISS",
      condition: outcome.targetName ? "CONDITION" : "",
      turn: "TURN"
    };
    const label = labels[outcome.type];
    if (!label) return;
    const float = document.createElement("span");
    float.className = "hg-floating-combat-text";
    float.dataset.type = outcome.type;
    float.textContent = label;
    token.appendChild(float);
    if (reducedMotion) {
      const timer = setTimeout(() => { float.remove(); timers.delete(timer); }, 1300);
      timers.add(timer);
      return;
    }
    const animations = float.getAnimations?.() || [];
    if (animations.length) Promise.allSettled(animations.map((animation) => animation.finished)).then(() => float.remove());
    else {
      const timer = setTimeout(() => { float.remove(); timers.delete(timer); }, 1800);
      timers.add(timer);
    }
  }

  function recordOutcome(value) {
    const outcome = normalizeVerifiedCombatOutcome(value);
    if (!outcome || (outcome.roomCode && roomCode && outcome.roomCode !== roomCode)) return false;
    const message = formatCombatOutcome(outcome);
    if (!addLogEntry({ ...outcome, message, state: "confirmed" })) return false;
    const tone = outcome.type === "damage" ? "danger"
      : outcome.type === "manual-adjustment" ? "info" : "success";
    addToast(message, tone);
    floatingText(outcome);
    return true;
  }

  function recordLocal(detail = {}) {
    if (!detail.id) return false;
    if (detail.roomCode && roomCode && detail.roomCode !== roomCode) return false;
    const state = text(detail.state);
    const message = localStateMessage(detail);
    const tone = ["rejected", "save-failed"].includes(state) ? "error"
      : state === "committed" ? "success" : "info";
    addToast(message, tone);
    if (["selected", "processing", "targeting", "awaiting", "committed", "cancelled", "rejected", "save-failed"].includes(state)) {
      return addLogEntry({
        id: detail.id,
        message,
        state: state === "committed" ? "local-confirmed" : state,
        round: Number(detail.round) || 0,
        timestamp: Number(detail.timestamp) || Date.now()
      });
    }
    return true;
  }

  const onActionState = (event) => recordLocal(event.detail || {});
  const onLifecycle = (event) => recordLocal(event.detail || {});
  const onOutcome = (event) => recordOutcome(event.detail || {});
  document.addEventListener("homebrewgod:combat-action-state", onActionState);
  document.addEventListener("homebrewgod:combat-action-lifecycle", onLifecycle);
  document.addEventListener("homebrewgod:combat-outcome", onOutcome);

  return Object.freeze({
    root: panel,
    recordOutcome,
    recordLocal,
    clear,
    getEntries: () => entries.map((entry) => ({ ...entry })),
    setContext(context = {}) {
      const nextRoom = text(context.roomCode);
      if (nextRoom !== roomCode) clear();
      roomCode = nextRoom;
      screen = text(context.screen || screen);
      panel.classList.toggle("hidden", screen !== "battle" || !roomCode);
    },
    setScreen(nextScreen) {
      screen = text(nextScreen);
      panel.classList.toggle("hidden", screen !== "battle" || !roomCode);
    },
    destroy() {
      clear();
      document.removeEventListener("homebrewgod:combat-action-state", onActionState);
      document.removeEventListener("homebrewgod:combat-action-lifecycle", onLifecycle);
      document.removeEventListener("homebrewgod:combat-outcome", onOutcome);
      panel.remove();
    }
  });
}

