const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

const DEFAULT_POINTS = Object.freeze({
  source: Object.freeze({ xRatio: 0.24, yRatio: 0.56 }),
  target: Object.freeze({ xRatio: 0.76, yRatio: 0.44 }),
});

function copyPoint(point, fallback) {
  return {
    xRatio: clamp(finite(point?.xRatio, fallback.xRatio), 0.04, 0.96),
    yRatio: clamp(finite(point?.yRatio, fallback.yRatio), 0.08, 0.92),
  };
}
/**
 * Shared, draggable Source/Target stage used by both animation authoring surfaces.
 * The animation runtime remains responsible for resolving the visible center of
 * each marker; this controller only owns their normalized positions.
 */
export function createAnimationPreviewStage({
  surface,
  source,
  target,
  swapButton = null,
  resetButton = null,
  distanceSelect = null,
  widthFeet = 150,
  onChange = () => {},
  ResizeObserverClass = globalThis.ResizeObserver,
} = {}) {
  if (!surface || !source || !target) throw new Error("A preview surface, Source, and Target are required.");

  const listeners = [];
  const points = {
    source: copyPoint(DEFAULT_POINTS.source, DEFAULT_POINTS.source),
    target: copyPoint(DEFAULT_POINTS.target, DEFAULT_POINTS.target),
  };
  // Distance is separation between actors, not the width of the entire stage.
  const stageWidthFeet = Math.max(5, finite(widthFeet, 150));

  function listen(node, type, handler, options) {
    if (!node?.addEventListener) return;
    node.addEventListener(type, handler, options);
    listeners.push(() => node.removeEventListener(type, handler, options));
  }

  function render() {
    for (const [key, node] of [["source", source], ["target", target]]) {
      node.style.left = `${points[key].xRatio * 100}%`;
      node.style.top = `${points[key].yRatio * 100}%`;
      node.dataset.pointRole = key;
    }
    onChange(getState());
  }

  function move(role, clientX, clientY) {
    const rect = surface.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    if (distanceSelect) distanceSelect.value = "custom";
    points[role] = copyPoint({
      xRatio: (clientX - rect.left) / rect.width,
      yRatio: (clientY - rect.top) / rect.height,
    }, DEFAULT_POINTS[role]);
    render();
  }

  function bindMarker(node, role) {
    listen(node, "pointerdown", (event) => {
      if (event.button != null && event.button !== 0) return;
      event.preventDefault();
      node.setPointerCapture?.(event.pointerId);
      move(role, event.clientX, event.clientY);
    });
    listen(node, "pointermove", (event) => {
      if (node.hasPointerCapture?.(event.pointerId)) move(role, event.clientX, event.clientY);
    });
    listen(node, "keydown", (event) => {
      const movement = event.shiftKey ? 0.05 : 0.015;
      const delta = {
        ArrowLeft: [-movement, 0],
        ArrowRight: [movement, 0],
        ArrowUp: [0, -movement],
        ArrowDown: [0, movement],
      }[event.key];
      if (!delta) return;
      event.preventDefault();
      if (distanceSelect) distanceSelect.value = "custom";
      points[role] = copyPoint({
        xRatio: points[role].xRatio + delta[0],
        yRatio: points[role].yRatio + delta[1],
      }, DEFAULT_POINTS[role]);
      render();
    });
  }

  function reset() {
    if (distanceSelect) distanceSelect.value = "custom";
    points.source = copyPoint(DEFAULT_POINTS.source, DEFAULT_POINTS.source);
    points.target = copyPoint(DEFAULT_POINTS.target, DEFAULT_POINTS.target);
    render();
  }

  function swap() {
    const sourcePoint = points.source;
    points.source = points.target;
    points.target = sourcePoint;
    render();
  }

  function setDistance(value) {
    if (value === "custom") return;
    const distance = clamp(finite(value === "adjacent" ? 5 : value, 30), 0, stageWidthFeet * 0.9);
    const separation = distance / stageWidthFeet;
    points.source = { xRatio: 0.5 - separation / 2, yRatio: 0.5 };
    points.target = { xRatio: 0.5 + separation / 2, yRatio: 0.5 };
    if (distanceSelect && String(distanceSelect.value) !== String(value)) distanceSelect.value = String(value);
    render();
  }

  function getState() {
    const width = Math.max(1, finite(surface.clientWidth, surface.getBoundingClientRect?.().width || 1));
    const height = Math.max(1, finite(surface.clientHeight, surface.getBoundingClientRect?.().height || 1));
    return {
      source: { ...points.source, x: points.source.xRatio * width, y: points.source.yRatio * height },
      target: { ...points.target, x: points.target.xRatio * width, y: points.target.yRatio * height },
      width,
      height,
      widthFeet: stageWidthFeet,
      pixelsPerFoot: width / stageWidthFeet,
      distanceFeet: Math.hypot((points.target.xRatio - points.source.xRatio) * width, (points.target.yRatio - points.source.yRatio) * height) / (width / stageWidthFeet),
    };
  }

  function getContext({ debugPoints = false } = {}) {
    const state = getState();
    return {
      source,
      target,
      sourceElement: source,
      targetElement: target,
      sourcePoint: state.source,
      targetPoint: state.target,
      grid: { pixelsPerFoot: state.pixelsPerFoot },
      debugPoints,
    };
  }

  bindMarker(source, "source");
  bindMarker(target, "target");
  listen(swapButton, "click", swap);
  listen(resetButton, "click", reset);
  listen(distanceSelect, "change", () => setDistance(distanceSelect.value));

  const resizeObserver = typeof ResizeObserverClass === "function"
    ? new ResizeObserverClass(() => render())
    : null;
  resizeObserver?.observe?.(surface);
  render();

  return {
    getState,
    getContext,
    reset,
    swap,
    setDistance,
    destroy() {
      resizeObserver?.disconnect?.();
      listeners.splice(0).forEach((remove) => remove());
    },
  };
}
