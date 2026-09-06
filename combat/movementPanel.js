import {
  DEFAULT_BASE_MOVEMENT_SPEED,
  normalizeMovementState
} from "./movementSystem.js?v=movement-robustness-20260906";
import {
  formatMapDistance
} from "../battleMap/measurement.js?v=stage8-20260826";

function setText(element, value) {
  if (element) element.textContent = String(value ?? "");
}

export function createMovementPanel({
  root,
  system,
  getIsDm = () => false,
  getMapElement = () => null,
  onCancel = () => {},
  onConfirmed = () => {}
} = {}) {
  if (!root || !system) {
    throw new Error("Movement panel requires a root and movement system.");
  }

  const name = root.querySelector("[data-movement-name]");
  const speed = root.querySelector("[data-movement-speed]");
  const remaining = root.querySelector("[data-movement-remaining]");
  const spent = root.querySelector("[data-movement-spent]");
  const bar = root.querySelector("[data-movement-bar]");
  const preview = root.querySelector("[data-movement-preview]");
  const proposed = root.querySelector("[data-movement-proposed]");
  const after = root.querySelector("[data-movement-after]");
  const overage = root.querySelector("[data-movement-overage]");
  const confirmButton = root.querySelector("[data-movement-action='confirm']");
  const cancelButton = root.querySelector("[data-movement-action='cancel']");
  const forceButton = root.querySelector("[data-movement-action='force']");
  const status = root.querySelector("[data-movement-status]");
  let busy = false;
  let overlay = null;

  function removeOverlay() {
    overlay?.remove();
    overlay = null;
  }

  function renderOverlay(state) {
    const pending = state.pendingMovement;
    const map = getMapElement();
    if (!pending || !map) {
      removeOverlay();
      return;
    }
    if (!overlay || overlay.parentNode !== map) {
      removeOverlay();
      overlay = document.createElement("div");
      overlay.className = "hg-movement-preview-layer";
      overlay.innerHTML = [
        '<span class="hg-movement-preview-line"></span>',
        '<span class="hg-movement-preview-dot is-start"></span>',
        '<span class="hg-movement-preview-dot is-end"></span>',
        '<span class="hg-movement-preview-label"></span>'
      ].join("");
      map.appendChild(overlay);
    }

    const start = pending.startPosition;
    const end = pending.endPosition;
    const rect = map.getBoundingClientRect();
    const startX = rect.width * start.x / 100;
    const startY = rect.height * start.y / 100;
    const endX = rect.width * end.x / 100;
    const endY = rect.height * end.y / 100;
    const dx = endX - startX;
    const dy = endY - startY;
    const line = overlay.querySelector(".hg-movement-preview-line");
    const startDot = overlay.querySelector(".is-start");
    const endDot = overlay.querySelector(".is-end");
    const label = overlay.querySelector(".hg-movement-preview-label");
    line.style.left = `${startX}px`;
    line.style.top = `${startY}px`;
    line.style.width = `${Math.hypot(dx, dy)}px`;
    line.style.transform = `rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg)`;
    startDot.style.left = `${startX}px`;
    startDot.style.top = `${startY}px`;
    endDot.style.left = `${endX}px`;
    endDot.style.top = `${endY}px`;
    label.style.left = `${(startX + endX) / 2}px`;
    label.style.top = `${(startY + endY) / 2}px`;
    label.textContent = formatMapDistance(pending.distanceFeet);
    overlay.classList.toggle("is-over-budget", pending.overage > 0);
  }

  function render(value = system.getState()) {
    const state = normalizeMovementState(value);
    const active = state.combatActive;
    const pending = state.pendingMovement;
    root.hidden = !active;
    root.dataset.hasPreview = String(Boolean(pending));
    root.dataset.overBudget = String(Boolean(pending?.overage));
    if (pending) {
      const initiativeMenu = root.closest("details");
      if (initiativeMenu) {
        initiativeMenu.open = true;
        setTimeout(() => {
          if (system.getState().pendingMovement) {
            initiativeMenu.open = true;
          }
        }, 0);
      }
    }
    setText(name, state.activeTokenName || "Current combatant");
    setText(
      speed,
      `${Number.isFinite(state.baseSpeed)
        ? state.baseSpeed
        : DEFAULT_BASE_MOVEMENT_SPEED} ft speed`
    );
    setText(
      remaining,
      `${formatMapDistance(state.movementRemaining)} / ${formatMapDistance(state.baseSpeed)} remaining`
    );
    setText(spent, `Spent: ${formatMapDistance(state.movementSpent)}`);
    if (bar) {
      const ratio = state.baseSpeed > 0
        ? state.movementRemaining / state.baseSpeed
        : 0;
      bar.style.width = `${Math.max(0, Math.min(100, ratio * 100))}%`;
      bar.parentElement?.setAttribute(
        "aria-valuenow",
        String(state.movementRemaining)
      );
      bar.parentElement?.setAttribute(
        "aria-valuemax",
        String(state.baseSpeed)
      );
    }
    preview?.classList.toggle("hidden", !pending);
    setText(proposed, pending ? `Proposed: ${formatMapDistance(pending.distanceFeet)}` : "");
    setText(after, pending ? `After: ${formatMapDistance(pending.afterMove)} remaining` : "");
    setText(
      overage,
      pending?.overage > 0
        ? `${formatMapDistance(pending.overage)} over movement`
        : ""
    );
    overage?.classList.toggle("hidden", !(pending?.overage > 0));
    if (confirmButton) {
      confirmButton.disabled = busy || !pending || pending.overage > 0;
    }
    if (cancelButton) cancelButton.disabled = busy || !pending;
    if (forceButton) {
      forceButton.hidden = getIsDm() !== true || !(pending?.overage > 0);
      forceButton.disabled = busy || !pending;
    }
    renderOverlay(state);
  }

  async function confirm(force) {
    if (busy) return;
    busy = true;
    setText(status, force ? "Forcing move…" : "Confirming move…");
    render();
    try {
      const state = await system.confirmMove({ force });
      onConfirmed(state);
      setText(status, force ? "Forced move confirmed." : "Move confirmed.");
    } catch (error) {
      setText(status, error?.message || "Move could not be confirmed.");
    } finally {
      busy = false;
      render();
    }
  }

  function onClick(event) {
    const button = event.target.closest("[data-movement-action]");
    if (!button || !root.contains(button)) return;
    const action = button.dataset.movementAction;
    if (action === "cancel") {
      system.cancelPreview();
      onCancel();
      setText(status, "Movement cancelled.");
    } else if (action === "confirm") {
      confirm(false);
    } else if (action === "force") {
      confirm(true);
    }
  }

  root.addEventListener("click", onClick);
  const unsubscribe = system.subscribe(render);

  return Object.freeze({
    render,
    destroy() {
      unsubscribe();
      root.removeEventListener("click", onClick);
      removeOverlay();
    }
  });
}
