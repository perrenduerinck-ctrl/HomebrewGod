import {
  DAY_PHASES,
  getCrossedTimeBoundaries,
  getDayPhase,
  getPhaseProgress
} from "../timeOfDay.js";

const PHASE_KEYS = Object.freeze({
  [DAY_PHASES.DAWN]: "dawn",
  [DAY_PHASES.DAY]: "day",
  [DAY_PHASES.DUSK]: "dusk",
  [DAY_PHASES.NIGHT]: "night"
});

function cleanUrl(value) {
  const raw = typeof value === "object"
    ? value?.url
    : value;
  return String(raw || "").trim();
}

export function normalizeMapTimeVariants(map = {}) {
  map = map || {};
  const nested =
    map.timeVariants ||
    map.timeOfDayVariants ||
    map.variants ||
    {};
  const result = {};

  for (const phase of Object.values(DAY_PHASES)) {
    const key = PHASE_KEYS[phase];
    const url = cleanUrl(
      nested[key] ??
      nested[phase] ??
      map[`${key}Url`] ??
      map[`${key}ImageUrl`]
    );
    if (url) result[key] = url;
  }

  return result;
}

export function getMapVariantUrl(map, phase) {
  const baseUrl = cleanUrl(map?.url);
  const key = PHASE_KEYS[phase] || "day";
  return normalizeMapTimeVariants(map)[key] || baseUrl;
}

function removeAfterTransition(element, transitionMs) {
  if (!element) return;
  const remove = () => element.remove();
  element.addEventListener("transitionend", remove, { once: true });
  window.setTimeout(remove, transitionMs + 100);
}

export function createMapLighting({
  surface,
  mapImage = null,
  transitionMs = 1500,
  onBoundaryCrossed = null
} = {}) {
  if (!surface) {
    throw new Error("Map lighting requires a battle-map surface.");
  }

  const layer = document.createElement("div");
  layer.className = "hg-map-lighting-layer";
  layer.setAttribute("aria-hidden", "true");
  surface.appendChild(layer);

  let currentMap = null;
  let currentWorldTime = 0;
  let currentPhase = getDayPhase(0);
  let currentVariantUrl = "";
  let transitionGeneration = 0;

  function crossfadeMapVariant(url) {
    if (!mapImage || !url || url === currentVariantUrl) {
      currentVariantUrl = url || "";
      return;
    }
    currentVariantUrl = url;
    const generation = ++transitionGeneration;
    const priorUrl = mapImage.currentSrc || mapImage.getAttribute("src") || "";

    if (
      !priorUrl ||
      mapImage.style.display === "none" ||
      !mapImage.complete
    ) {
      mapImage.src = url;
      return;
    }

    const viewer = mapImage.parentElement;
    const ghost = mapImage.cloneNode(false);
    ghost.removeAttribute("id");
    ghost.className = "hg-map-variant-crossfade";
    ghost.setAttribute("aria-hidden", "true");
    ghost.style.left = `${mapImage.offsetLeft}px`;
    ghost.style.top = `${mapImage.offsetTop}px`;
    ghost.style.width = `${mapImage.offsetWidth}px`;
    ghost.style.height = `${mapImage.offsetHeight}px`;
    ghost.style.transform = mapImage.style.transform;
    viewer?.appendChild(ghost);

    mapImage.style.opacity = "0";
    const reveal = () => {
      if (generation !== transitionGeneration) {
        ghost.remove();
        return;
      }
      mapImage.style.opacity = "1";
      requestAnimationFrame(() => {
        ghost.style.opacity = "0";
      });
      removeAfterTransition(ghost, transitionMs);
    };
    mapImage.addEventListener("load", reveal, { once: true });
    mapImage.addEventListener("error", () => {
      if (generation !== transitionGeneration) return;
      currentVariantUrl = cleanUrl(currentMap?.url);
      mapImage.src = currentVariantUrl;
      mapImage.style.opacity = "1";
      ghost.remove();
    }, { once: true });
    mapImage.src = url;
  }

  function render() {
    currentPhase = getDayPhase(currentWorldTime);
    layer.dataset.dayPhase = currentPhase.toLowerCase();
    layer.style.setProperty(
      "--hg-day-phase-progress",
      String(getPhaseProgress(currentWorldTime))
    );
    surface.dataset.dayPhase = currentPhase.toLowerCase();
    crossfadeMapVariant(
      getMapVariantUrl(currentMap, currentPhase)
    );
  }

  function applyWorldTime(worldTime) {
    const nextWorldTime = Math.max(
      0,
      Math.floor(Number(worldTime) || 0)
    );
    const boundaries = getCrossedTimeBoundaries(
      currentWorldTime,
      nextWorldTime
    );
    currentWorldTime = nextWorldTime;
    render();
    if (boundaries.length && typeof onBoundaryCrossed === "function") {
      onBoundaryCrossed(boundaries);
    }
    return getState();
  }

  function setMap(map) {
    currentMap = map?.url ? { ...map } : null;
    currentVariantUrl = mapImage?.getAttribute("src") || "";
    render();
    return getState();
  }

  function refresh() {
    layer.style.width = `${surface.clientWidth}px`;
    layer.style.height = `${surface.clientHeight}px`;
  }

  function getState() {
    return {
      worldTime: currentWorldTime,
      phase: currentPhase,
      phaseProgress: getPhaseProgress(currentWorldTime),
      variantUrl: currentVariantUrl,
      hasVariant:
        currentVariantUrl !== "" &&
        currentVariantUrl !== cleanUrl(currentMap?.url)
    };
  }

  render();

  return Object.freeze({
    applyWorldTime,
    setMap,
    refresh,
    getState,
    getLayerElement: () => layer,
    destroy() {
      transitionGeneration += 1;
      delete surface.dataset.dayPhase;
      surface.querySelectorAll(
        ".hg-map-variant-crossfade"
      ).forEach((element) => element.remove());
      layer.remove();
    }
  });
}
