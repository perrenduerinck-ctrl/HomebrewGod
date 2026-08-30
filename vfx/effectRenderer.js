import {
  createParticleDescriptors
} from "./particles.js";
import {
  createSpriteAnimator
} from "./spriteAnimator.js?v=vfx-sprite-phase-a-20260828";

function createElement(
  documentRef,
  className
) {
  const element = documentRef.createElement("div");
  element.className = className;
  return element;
}

function finiteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function makeResponsivePoint(
  point,
  width,
  height
) {
  if (!point) return null;
  const x = finiteNumber(point.x);
  const y = finiteNumber(point.y);
  return {
    x,
    y,
    xRatio: Number.isFinite(point.xRatio)
      ? point.xRatio
      : x / Math.max(1, width),
    yRatio: Number.isFinite(point.yRatio)
      ? point.yRatio
      : y / Math.max(1, height)
  };
}

function projectPoint(point, width, height) {
  if (!point) return null;
  return {
    x: point.xRatio * width,
    y: point.yRatio * height
  };
}

function setCssNumber(
  element,
  name,
  value,
  unit = ""
) {
  element.style.setProperty(
    name,
    `${finiteNumber(value)}${unit}`
  );
}

export function createEffectRenderer({
  surface,
  getTargetElement = () => surface,
  getScale = () => 1
} = {}) {
  if (!surface?.appendChild) {
    throw new TypeError(
      "Battle-map VFX require a map surface."
    );
  }

  const documentRef = surface.ownerDocument;
  const windowRef = documentRef.defaultView;
  const overlay = createElement(
    documentRef,
    "hg-map-vfx-layer"
  );
  const records = new Map();
  let connected = false;
  let resizeObserver = null;
  let observedTarget = null;
  let bounds = {
    width: 1,
    height: 1
  };
  let mapScale = 1;

  overlay.setAttribute("aria-hidden", "true");
  overlay.dataset.effectsMode = "full";

  function syncBounds() {
    let target = surface;
    let requestedScale = 1;
    try {
      target = getTargetElement() || surface;
    } catch {
      target = surface;
    }
    try {
      requestedScale = getScale();
    } catch {
      requestedScale = 1;
    }
    const surfaceRect = surface.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const width = Math.max(
      1,
      targetRect.width || surfaceRect.width
    );
    const height = Math.max(
      1,
      targetRect.height || surfaceRect.height
    );
    mapScale = Math.min(
      20,
      Math.max(
        0.05,
        finiteNumber(requestedScale, 1)
      )
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
    overlay.dataset.mapScale = String(mapScale);
    bounds = { width, height };

    if (
      resizeObserver &&
      observedTarget !== target
    ) {
      if (observedTarget) {
        resizeObserver.unobserve(observedTarget);
      }
      resizeObserver.observe(target);
      observedTarget = target;
    }

    records.forEach((record) => {
      positionRecord(record);
    });
  }

  function positionRecord(record) {
    const effect = record.effect;
    const position = projectPoint(
      record.position,
      bounds.width,
      bounds.height
    );
    const start = projectPoint(
      record.start,
      bounds.width,
      bounds.height
    );
    const end = projectPoint(
      record.end,
      bounds.width,
      bounds.height
    );
    const anchor = position || end || start || {
      x: 0,
      y: 0
    };

    record.element.style.left = `${anchor.x}px`;
    record.element.style.top = `${anchor.y}px`;

    if (start && end) {
      const deltaX = end.x - start.x;
      const deltaY = end.y - start.y;
      const length = Math.hypot(deltaX, deltaY);
      record.element.style.left = `${start.x}px`;
      record.element.style.top = `${start.y}px`;
      setCssNumber(
        record.element,
        "--hg-vfx-path-length",
        length,
        "px"
      );
      setCssNumber(
        record.element,
        "--hg-vfx-path-rotation",
        Math.atan2(deltaY, deltaX) * 180 / Math.PI,
        "deg"
      );
      record.element.classList.add("has-path");
    }

    record.element.dataset.elevation = String(
      effect.elevation
    );
    setCssNumber(
      record.element,
      "--hg-vfx-scale",
      effect.scale * mapScale
    );
  }

  function appendParticles(
    element,
    effect
  ) {
    const options = {
      ...(effect.definition.particles || {}),
      ...(effect.particles || {})
    };
    options.count = finiteNumber(
      options.count
    ) * effect.intensity;
    const descriptors = createParticleDescriptors(
      options,
      { mode: effect.effectsMode }
    );

    descriptors.forEach((particle) => {
      const node = createElement(
        documentRef,
        "hg-vfx-particle"
      );
      setCssNumber(node, "--hg-vfx-particle-x", particle.x, "px");
      setCssNumber(node, "--hg-vfx-particle-y", particle.y, "px");
      setCssNumber(node, "--hg-vfx-particle-size", particle.size, "px");
      setCssNumber(node, "--hg-vfx-particle-delay", particle.delay, "ms");
      setCssNumber(node, "--hg-vfx-particle-duration", particle.duration, "ms");
      setCssNumber(node, "--hg-vfx-particle-opacity", particle.opacity);
      element.appendChild(node);
    });
  }

  function appendSprite(
    element,
    effect
  ) {
    const spriteOptions = {
      ...(effect.definition.sprite || {}),
      ...(effect.sprite || {})
    };
    // New cantrip sheets finish their full frame cycle in the scaled lifetime.
    // Existing sprites retain their own timing contracts.
    if (effect.definition.className === "cantrip-impact-sprite") {
      spriteOptions.framesPerSecond = Math.min(60,
        spriteOptions.frameCount * 1000 / Math.max(1, effect.duration));
    }
    const sprite = createElement(
      documentRef,
      "hg-vfx-sprite"
    );
    element.appendChild(sprite);
    const animator = createSpriteAnimator({
      element: sprite,
      options: spriteOptions
    });
    animator.start();
    return animator;
  }

  function render(effect) {
    if (!connected) connect();
    syncBounds();
    remove(effect.id);

    const element = createElement(
      documentRef,
      `hg-map-vfx-effect hg-vfx-${effect.definition.className}`
    );
    element.dataset.effectId = effect.id;
    element.dataset.effectType = effect.type;
    element.dataset.effectKind = effect.definition.kind;
    element.dataset.effectState = "active";
    element.dataset.effectIntensity = String(
      effect.intensity
    );
    element.style.opacity = String(effect.opacity);
    setCssNumber(element, "--hg-vfx-rotation", effect.rotation, "deg");
    setCssNumber(element, "--hg-vfx-duration", effect.duration, "ms");
    setCssNumber(element, "--hg-vfx-intensity", effect.intensity);

    const record = {
      effect,
      element,
      position: makeResponsivePoint(
        effect.position,
        bounds.width,
        bounds.height
      ),
      start: makeResponsivePoint(
        effect.startPosition,
        bounds.width,
        bounds.height
      ),
      end: makeResponsivePoint(
        effect.endPosition,
        bounds.width,
        bounds.height
      ),
      animator: null
    };

    if (effect.definition.kind === "sprite") {
      record.animator = appendSprite(
        element,
        effect
      );
    } else {
      appendParticles(element, effect);
    }

    records.set(effect.id, record);
    overlay.appendChild(element);
    positionRecord(record);
    try {
      effect.definition.configureElement?.({
        document: documentRef,
        effect,
        element
      });
    } catch (error) {
      remove(effect.id);
      throw error;
    }
    return element;
  }

  function remove(id) {
    const record = records.get(String(id || ""));
    if (!record) return false;
    record.animator?.destroy?.();
    record.element.remove();
    records.delete(record.effect.id);
    return true;
  }

  function clear() {
    Array.from(records.keys()).forEach(remove);
  }

  function connect() {
    if (connected) return overlay;
    connected = true;
    surface.appendChild(overlay);
    windowRef?.addEventListener("resize", syncBounds);
    if (typeof windowRef?.ResizeObserver === "function") {
      resizeObserver = new windowRef.ResizeObserver(syncBounds);
      resizeObserver.observe(surface);
    }
    syncBounds();
    return overlay;
  }

  function setMode(mode) {
    overlay.dataset.effectsMode = mode;
  }

  function destroy() {
    clear();
    resizeObserver?.disconnect();
    resizeObserver = null;
    observedTarget = null;
    windowRef?.removeEventListener("resize", syncBounds);
    overlay.remove();
    connected = false;
  }

  return Object.freeze({
    clear,
    connect,
    destroy,
    getEffectElement: (id) => (
      records.get(String(id || ""))?.element || null
    ),
    getOverlayElement: () => overlay,
    refresh: syncBounds,
    remove,
    render,
    setMode
  });
}
