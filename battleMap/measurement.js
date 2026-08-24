export const DEFAULT_FEET_PER_SQUARE = 5;
export const MIN_FEET_PER_SQUARE = 1;
export const MAX_FEET_PER_SQUARE = 1000;
export const DEFAULT_GRID_PIXEL_SIZE = 64;

const finiteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed
    : null;
};

const clamp = (value, minimum, maximum) => (
  Math.min(maximum, Math.max(minimum, value))
);

export function normalizeFeetPerSquare(
  value,
  fallback = DEFAULT_FEET_PER_SQUARE
) {
  const parsed = finiteNumber(value);
  const safeFallback = finiteNumber(fallback) ??
    DEFAULT_FEET_PER_SQUARE;

  if (parsed === null) {
    return clamp(
      Math.round(safeFallback),
      MIN_FEET_PER_SQUARE,
      MAX_FEET_PER_SQUARE
    );
  }

  return clamp(
    Math.round(parsed),
    MIN_FEET_PER_SQUARE,
    MAX_FEET_PER_SQUARE
  );
}

export function normalizeGridPixelSize(
  value,
  fallback = DEFAULT_GRID_PIXEL_SIZE
) {
  const parsed = finiteNumber(value);
  const safeFallback = finiteNumber(fallback) ??
    DEFAULT_GRID_PIXEL_SIZE;

  return parsed !== null && parsed > 0
    ? parsed
    : Math.max(1, safeFallback);
}

function normalizePoint(point = {}) {
  return Object.freeze({
    x: finiteNumber(point.x) ?? 0,
    y: finiteNumber(point.y) ?? 0
  });
}

export function measureMapDistance(
  startPoint,
  endPoint,
  {
    pixelsPerSquare =
      DEFAULT_GRID_PIXEL_SIZE,
    feetPerSquare =
      DEFAULT_FEET_PER_SQUARE
  } = {}
) {
  const start = normalizePoint(startPoint);
  const end = normalizePoint(endPoint);
  const safePixelsPerSquare =
    normalizeGridPixelSize(
      pixelsPerSquare
    );
  const safeFeetPerSquare =
    normalizeFeetPerSquare(
      feetPerSquare
    );
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const pixelDistance = Math.hypot(
    deltaX,
    deltaY
  );
  const squares =
    pixelDistance /
    safePixelsPerSquare;
  const feet =
    squares *
    safeFeetPerSquare;

  return Object.freeze({
    deltaX,
    deltaY,
    pixelDistance,
    pixelsPerSquare:
      safePixelsPerSquare,
    feetPerSquare:
      safeFeetPerSquare,
    squares,
    feet
  });
}

function roundToTenth(value) {
  return Math.round(value * 10) / 10;
}

export function formatMapDistance(feet) {
  const safeFeet = finiteNumber(feet);
  if (safeFeet === null || safeFeet < 0) {
    return "0 ft";
  }

  const rounded = roundToTenth(safeFeet);
  return `${
    Number.isInteger(rounded)
      ? rounded
      : rounded.toFixed(1)
  } ft`;
}

export function formatMapSquares(squares) {
  const safeSquares = finiteNumber(squares);
  if (safeSquares === null || safeSquares < 0) {
    return "0 squares";
  }

  const rounded = roundToTenth(safeSquares);
  const amount = Number.isInteger(rounded)
    ? rounded
    : rounded.toFixed(1);

  return `${amount} ${
    rounded === 1
      ? "square"
      : "squares"
  }`;
}

function createElement(
  documentRef,
  className
) {
  const element =
    documentRef.createElement("div");
  element.className = className;
  return element;
}

export function createMapRuler({
  surface,
  getTargetElement = () => surface,
  getPixelsPerSquare = () => (
    DEFAULT_GRID_PIXEL_SIZE
  ),
  getFeetPerSquare = () => (
    DEFAULT_FEET_PER_SQUARE
  ),
  onStateChange = () => {}
} = {}) {
  if (
    !surface ||
    typeof surface.appendChild !== "function"
  ) {
    throw new TypeError(
      "Map ruler requires a map surface element."
    );
  }

  const documentRef = surface.ownerDocument;
  const windowRef =
    documentRef.defaultView;
  const overlay = createElement(
    documentRef,
    "hg-map-ruler-layer"
  );
  const line = createElement(
    documentRef,
    "hg-map-ruler-line"
  );
  const startDot = createElement(
    documentRef,
    "hg-map-ruler-dot hg-map-ruler-start"
  );
  const endDot = createElement(
    documentRef,
    "hg-map-ruler-dot hg-map-ruler-end"
  );
  const label = createElement(
    documentRef,
    "hg-map-ruler-label"
  );
  let enabled = false;
  let connected = false;
  let dragging = false;
  let pointerId = null;
  let start = null;
  let end = null;

  overlay.hidden = true;
  overlay.setAttribute(
    "aria-label",
    "Battle map ruler"
  );
  overlay.append(
    line,
    startDot,
    endDot,
    label
  );

  function getMeasurement() {
    if (!start || !end) return null;

    return measureMapDistance(
      start,
      end,
      {
        pixelsPerSquare:
          getPixelsPerSquare(),
        feetPerSquare:
          getFeetPerSquare()
      }
    );
  }

  function getState() {
    const measurement =
      getMeasurement();

    return Object.freeze({
      enabled,
      dragging,
      start: start
        ? Object.freeze({
            x: start.x,
            y: start.y
          })
        : null,
      end: end
        ? Object.freeze({
            x: end.x,
            y: end.y
          })
        : null,
      measurement,
      label: measurement
        ? formatMapDistance(
            measurement.feet
          )
        : ""
    });
  }

  function emitState() {
    onStateChange(getState());
  }

  function projectPoint(point) {
    if (!point) return;

    const width =
      Math.max(1, overlay.clientWidth);
    const height =
      Math.max(1, overlay.clientHeight);

    point.x = point.xRatio * width;
    point.y = point.yRatio * height;
  }

  function syncBounds() {
    const target =
      getTargetElement() ||
      surface;
    const surfaceRect =
      surface.getBoundingClientRect();
    const targetRect =
      target.getBoundingClientRect();
    const width = Math.max(
      1,
      targetRect.width ||
        surfaceRect.width
    );
    const height = Math.max(
      1,
      targetRect.height ||
        surfaceRect.height
    );

    overlay.style.left = `${
      targetRect.left -
      surfaceRect.left +
      surface.scrollLeft
    }px`;
    overlay.style.top = `${
      targetRect.top -
      surfaceRect.top +
      surface.scrollTop
    }px`;
    overlay.style.width = `${width}px`;
    overlay.style.height = `${height}px`;
    projectPoint(start);
    projectPoint(end);
  }

  function positionElement(element, point) {
    element.style.left = `${point.x}px`;
    element.style.top = `${point.y}px`;
  }

  function render() {
    const measurement =
      getMeasurement();

    overlay.classList.toggle(
      "has-measurement",
      Boolean(measurement)
    );

    if (!measurement) {
      label.textContent = "";
      emitState();
      return;
    }

    const angle = Math.atan2(
      measurement.deltaY,
      measurement.deltaX
    ) * 180 / Math.PI;
    const midX =
      (start.x + end.x) / 2;
    const midY =
      (start.y + end.y) / 2;

    positionElement(line, start);
    positionElement(startDot, start);
    positionElement(endDot, end);
    positionElement(label, {
      x: midX,
      y: midY
    });
    line.style.width = `${
      measurement.pixelDistance
    }px`;
    line.style.transform =
      `rotate(${angle}deg)`;
    label.textContent =
      formatMapDistance(
        measurement.feet
      );
    label.title =
      formatMapSquares(
        measurement.squares
      );
    emitState();
  }

  function pointFromEvent(event) {
    const rect =
      overlay.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const x = clamp(
      event.clientX - rect.left,
      0,
      width
    );
    const y = clamp(
      event.clientY - rect.top,
      0,
      height
    );

    return {
      x,
      y,
      xRatio: x / width,
      yRatio: y / height
    };
  }

  function releasePointerCapture() {
    if (pointerId === null) return;

    try {
      overlay.releasePointerCapture(
        pointerId
      );
    } catch {
      // The browser may already have released it.
    }
  }

  function handlePointerDown(event) {
    if (
      !enabled ||
      event.isPrimary === false ||
      (
        event.pointerType === "mouse" &&
        event.button !== 0
      )
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    syncBounds();
    pointerId = event.pointerId;
    start = pointFromEvent(event);
    end = { ...start };
    dragging = true;
    overlay.classList.add("is-dragging");

    try {
      overlay.setPointerCapture(pointerId);
    } catch {
      // Pointer capture is an enhancement, not a requirement.
    }

    render();
  }

  function handlePointerMove(event) {
    if (
      !enabled ||
      !dragging ||
      event.pointerId !== pointerId
    ) {
      return;
    }

    event.preventDefault();
    end = pointFromEvent(event);
    render();
  }

  function finishPointer(event) {
    if (
      !dragging ||
      event.pointerId !== pointerId
    ) {
      return;
    }

    event.preventDefault();
    end = pointFromEvent(event);
    dragging = false;
    overlay.classList.remove("is-dragging");
    releasePointerCapture();
    pointerId = null;
    render();
  }

  function handleKeyDown(event) {
    if (enabled && event.key === "Escape") {
      clear();
    }
  }

  function connect() {
    if (connected) return overlay;

    connected = true;
    surface.appendChild(overlay);
    overlay.addEventListener(
      "pointerdown",
      handlePointerDown
    );
    overlay.addEventListener(
      "pointermove",
      handlePointerMove
    );
    overlay.addEventListener(
      "pointerup",
      finishPointer
    );
    overlay.addEventListener(
      "pointercancel",
      finishPointer
    );
    documentRef.addEventListener(
      "keydown",
      handleKeyDown
    );
    windowRef?.addEventListener(
      "resize",
      refresh
    );
    emitState();
    return overlay;
  }

  function clear() {
    releasePointerCapture();
    pointerId = null;
    dragging = false;
    start = null;
    end = null;
    overlay.classList.remove(
      "is-dragging"
    );
    render();
  }

  function refresh() {
    if (!enabled) return;
    syncBounds();
    render();
  }

  function setEnabled(nextEnabled) {
    enabled = nextEnabled === true;
    overlay.hidden = !enabled;
    overlay.classList.toggle(
      "is-enabled",
      enabled
    );

    if (enabled) {
      syncBounds();
      render();
    } else {
      clear();
    }

    emitState();
    return enabled;
  }

  function toggle() {
    return setEnabled(!enabled);
  }

  function destroy() {
    if (!connected) return;

    clear();
    connected = false;
    overlay.removeEventListener(
      "pointerdown",
      handlePointerDown
    );
    overlay.removeEventListener(
      "pointermove",
      handlePointerMove
    );
    overlay.removeEventListener(
      "pointerup",
      finishPointer
    );
    overlay.removeEventListener(
      "pointercancel",
      finishPointer
    );
    documentRef.removeEventListener(
      "keydown",
      handleKeyDown
    );
    windowRef?.removeEventListener(
      "resize",
      refresh
    );
    overlay.remove();
  }

  return Object.freeze({
    connect,
    clear,
    destroy,
    getState,
    refresh,
    setEnabled,
    toggle
  });
}

