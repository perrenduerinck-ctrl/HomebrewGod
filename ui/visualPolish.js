const STATUS_SELECTOR = [
  ".status",
  "[role='status']",
  ".magic-item-status",
  ".spell-status",
  ".spell-creator-status",
  ".npc-status",
  ".encounter-status",
  ".summon-status",
  ".workshop-status"
].join(",");

const PANEL_SELECTOR = [
  ".box",
  ".toolPanelMini",
  ".magic-item-panel",
  ".spell-panel",
  ".spell-creator-panel",
  ".npc-panel",
  ".encounter-panel",
  ".summon-panel",
  ".effect-panel"
].join(",");

const EMPTY_CONTAINER_SELECTOR = [
  "#myRoomsList",
  "#playersList",
  "#roomMapsList",
  ".creatorLibraryList",
  ".magic-item-library",
  ".spell-library",
  ".spell-creator-library",
  ".npc-library",
  ".encounter-library",
  ".summon-library",
  ".workshop-grid"
].join(",");

const PRIMARY_ACTION = /^(save|create room|join room|open battle map|confirm move|load encounter|publish|add to|use preset)/i;
const DANGER_ACTION = /^(delete|remove|discard|end combat|clear all|leave room)/i;
const GHOST_ACTION = /^(back|close|cancel|log out|refresh)/i;
const SUCCESS_WORDS = /\b(saved|published|created|added|copied|ready|complete|connected|loaded|success)\b/i;
const DANGER_WORDS = /\b(error|failed|couldn['’]?t|cannot|can['’]?t|denied|invalid|missing|offline)\b/i;
const LOADING_WORDS = /\b(loading|connecting|uploading|saving|publishing|preparing|working)\b/i;

function textLabel(value) {
  return String(value || "")
    .replace(/[—–].*$/, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\b(like|such as)\b.*$/i, "")
    .replace(/\.{2,}$/g, "")
    .trim();
}

function labelFromId(id) {
  return String(id || "")
    .replace(/(?:Input|Select|Textarea|Field|Control)$/i, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^monster\s+/i, "")
    .replace(/^character\s+/i, "")
    .replace(/\bAc\b/i, "Armor Class")
    .replace(/\bHp\b/i, "Hit Points")
    .replace(/\bUrl\b/i, "URL")
    .replace(/^./, (character) => character.toUpperCase())
    .trim();
}

function actionText(button) {
  return String(button?.textContent || button?.getAttribute?.("aria-label") || "").replace(/\s+/g, " ").trim();
}

function classifyButton(button) {
  if (!(button instanceof globalThis.HTMLElement) || button.dataset.hgButtonPolished === "true") return;
  button.dataset.hgButtonPolished = "true";
  const action = actionText(button);
  const dataAction = Object.entries(button.dataset || {}).map(([, value]) => value).join(" ");
  const identity = `${button.id || ""} ${dataAction} ${action}`;
  if (/delete|remove|discard|danger/i.test(identity) || DANGER_ACTION.test(action)) {
    button.classList.add("hg-button-danger");
  } else if (button.classList.contains("magic-item-primary") ||
    button.classList.contains("spell-primary") ||
    button.classList.contains("spell-creator-primary") ||
    button.classList.contains("npc-primary") ||
    button.classList.contains("encounter-primary") ||
    button.classList.contains("summon-primary") ||
    PRIMARY_ACTION.test(action)) {
    button.classList.add("hg-button-primary");
  } else if (GHOST_ACTION.test(action)) {
    button.classList.add("hg-button-ghost");
  }
  if (button.hasAttribute("aria-label") && action.length <= 2) button.classList.add("hg-button-icon");
}

function statusTone(text) {
  if (!text) return "neutral";
  if (DANGER_WORDS.test(text)) return "danger";
  if (LOADING_WORDS.test(text)) return "loading";
  if (SUCCESS_WORDS.test(text)) return "success";
  return "neutral";
}

function updateStatus(element) {
  if (!(element instanceof globalThis.HTMLElement)) return;
  const message = String(element.textContent || "").trim();
  element.classList.add("hg-status-message");
  element.dataset.tone = statusTone(message);
  if (element.dataset.tone === "loading") element.setAttribute("aria-busy", "true");
  else element.removeAttribute("aria-busy");
}

function updateEmptyState(element) {
  if (!(element instanceof globalThis.HTMLElement)) return;
  const hasStructuredChildren = [...element.children].some((child) => !child.matches("br"));
  const message = String(element.textContent || "").replace(/\s+/g, " ").trim();
  const isEmptyMessage = !hasStructuredChildren && /^(no\b|nothing\b|your .* is empty\b)/i.test(message);
  element.classList.toggle("hg-empty-state", isEmptyMessage);
  if (!/loading/i.test(message)) {
    element.classList.remove("hg-skeleton");
    element.removeAttribute("aria-busy");
  }
}

function enhanceLegacyField(control, document) {
  if (!(control instanceof globalThis.HTMLElement) || control.dataset.hgFieldPolished === "true") return;
  control.dataset.hgFieldPolished = "true";
  if (control.closest("label") || control.type === "hidden") return;
  const labelText = textLabel(control.getAttribute("placeholder")) || labelFromId(control.id);
  if (!labelText) return;
  if (!control.id) control.id = `hg-field-${Math.random().toString(36).slice(2)}`;
  const wrapper = document.createElement("label");
  wrapper.className = "hg-generated-field";
  wrapper.htmlFor = control.id;
  const label = document.createElement("span");
  label.textContent = labelText;
  control.parentNode?.insertBefore(wrapper, control);
  wrapper.append(label, control);
}

function enhanceRoot(root, document) {
  if (!(root instanceof globalThis.Element) && root !== document) return;
  const query = (selector) => root === document
    ? [...document.querySelectorAll(selector)]
    : [root.matches?.(selector) ? root : null, ...root.querySelectorAll(selector)].filter(Boolean);

  for (const screen of query("main.screen")) screen.dataset.hgScreen = screen.id || "screen";
  for (const panel of query(PANEL_SELECTOR)) panel.classList.add("hg-panel");
  for (const button of query("button")) classifyButton(button);
  for (const status of query(STATUS_SELECTOR)) updateStatus(status);
  for (const container of query(EMPTY_CONTAINER_SELECTOR)) updateEmptyState(container);
  for (const field of query("#characterCreatorScreen .toolPanelMini > input, #characterCreatorScreen .toolPanelMini > textarea, #monsterCreatorScreen .toolPanelMini > input, #monsterCreatorScreen .toolPanelMini > select, #monsterCreatorScreen .toolPanelMini > textarea, #characterCreatorScreen .statMiniGrid > input, #monsterCreatorScreen .statMiniGrid > input")) {
    if (field.closest("main.screen:not(.hidden)")) enhanceLegacyField(field, document);
  }
  for (const dialog of query("dialog")) dialog.classList.add("hg-dialog");
}

function ensureToastRegion(document) {
  let region = document.querySelector("[data-hg-toast-region]");
  if (region) return region;
  region = document.createElement("section");
  region.className = "hg-toast-region";
  region.dataset.hgToastRegion = "true";
  region.setAttribute("aria-label", "Notifications");
  region.setAttribute("aria-live", "polite");
  document.body.append(region);
  return region;
}

export function createNotifier(document = globalThis.document) {
  return function notify(message, options = {}) {
    const text = String(message || "").trim();
    if (!document?.body || !text) return null;
    const region = ensureToastRegion(document);
    const toast = document.createElement("article");
    toast.className = "hg-toast";
    toast.dataset.tone = options.tone || statusTone(text);
    toast.setAttribute("role", toast.dataset.tone === "danger" ? "alert" : "status");
    const content = document.createElement("span");
    content.textContent = text;
    const close = document.createElement("button");
    close.type = "button";
    close.className = "hg-button-icon hg-button-ghost";
    close.setAttribute("aria-label", "Dismiss notification");
    close.textContent = "×";
    close.addEventListener("click", () => toast.remove(), { once: true });
    toast.append(content, close);
    region.append(toast);
    const timeout = Math.max(2500, Number(options.timeout) || (toast.dataset.tone === "danger" ? 7000 : 4500));
    globalThis.setTimeout?.(() => toast.remove(), timeout);
    return toast;
  };
}

export function createConfirmation(document = globalThis.document) {
  return function requestConfirmation(message, options = {}) {
    if (!document?.body || typeof globalThis.HTMLDialogElement !== "function") {
      return Promise.resolve(globalThis.confirm?.(String(message || "")) ?? false);
    }
    return new Promise((resolve) => {
      const dialog = document.createElement("dialog");
      dialog.className = "hg-confirm-dialog";
      dialog.innerHTML = `
        <header class="hg-dialog-header">
          <div><span class="hg-eyebrow">Please confirm</span><h2></h2></div>
        </header>
        <div class="hg-dialog-body"><p></p></div>
        <footer class="hg-dialog-footer">
          <button type="button" class="hg-button-ghost" data-hg-confirm-cancel>Cancel</button>
          <button type="button" data-hg-confirm-accept>Confirm</button>
        </footer>`;
      const heading = dialog.querySelector("h2");
      const headingId = `hg-confirm-title-${globalThis.crypto?.randomUUID?.() || Date.now()}`;
      heading.id = headingId;
      heading.textContent = options.title || "Confirm action";
      dialog.setAttribute("aria-labelledby", headingId);
      dialog.querySelector("p").textContent = String(message || "Are you sure?");
      const accept = dialog.querySelector("[data-hg-confirm-accept]");
      accept.textContent = options.confirmLabel || "Confirm";
      accept.className = options.danger === false ? "hg-button-primary" : "hg-button-danger";
      const finish = (value) => {
        if (dialog.open) dialog.close();
        dialog.remove();
        resolve(value);
      };
      dialog.querySelector("[data-hg-confirm-cancel]").addEventListener("click", () => finish(false), { once: true });
      accept.addEventListener("click", () => finish(true), { once: true });
      dialog.addEventListener("cancel", (event) => { event.preventDefault(); finish(false); }, { once: true });
      document.body.append(dialog);
      dialog.showModal();
      accept.focus();
    });
  };
}

export function requestAppConfirmation(message, options = {}) {
  if (typeof globalThis.homebrewGodConfirm === "function") {
    return Promise.resolve(globalThis.homebrewGodConfirm(message, options));
  }
  if (globalThis.document?.body) {
    return createConfirmation(globalThis.document)(message, options);
  }
  return Promise.resolve(globalThis.confirm?.(String(message || "")) ?? false);
}

export function installVisualPolish({ document = globalThis.document, window = globalThis.window } = {}) {
  if (!document?.body || document.documentElement.dataset.hgVisualPolish === "true") return null;
  document.documentElement.dataset.hgVisualPolish = "true";
  const notify = createNotifier(document);
  const confirmAction = createConfirmation(document);
  enhanceRoot(document, document);

  let frame = 0;
  const pendingRoots = new Set();
  const flush = () => {
    frame = 0;
    for (const root of pendingRoots) enhanceRoot(root, document);
    pendingRoots.clear();
  };
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.target instanceof globalThis.Element) {
        const status = mutation.target.closest?.(STATUS_SELECTOR);
        if (status) updateStatus(status);
        const empty = mutation.target.closest?.(EMPTY_CONTAINER_SELECTOR);
        if (empty) updateEmptyState(empty);
      }
      for (const node of mutation.addedNodes) {
        if (node instanceof globalThis.Element) pendingRoots.add(node);
      }
    }
    if (pendingRoots.size && !frame) frame = globalThis.requestAnimationFrame?.(flush) || globalThis.setTimeout(flush, 0);
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  if (window) {
    window.homebrewGodNotify = notify;
    window.homebrewGodConfirm = confirmAction;
    if (!window.__HOMEBREW_GOD_SMOKE__) window.alert = (message) => { notify(message); };
  }
  return Object.freeze({ notify, confirmAction, observer, refresh: () => enhanceRoot(document, document) });
}
