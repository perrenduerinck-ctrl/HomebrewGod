import { createParticleDescriptors } from "./particles.js";
import { createSpriteAnimator } from "./spriteAnimator.js?v=2d5-animation-20260901";
import {
  calculateHeightScale,
  calculateMotion25d,
  calculateShadow25d
} from "./motion25d.js";
import { getDepthSortValue, normalizeEffectLayer } from "./effectLayers.js";

function createElement(documentRef, className) {
  const element = documentRef.createElement("div");
  element.className = className;
  return element;
}

function finiteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const clamp = (value, minimum, maximum) => (
  Math.min(maximum, Math.max(minimum, value))
);

function makeResponsivePoint(point, width, height) {
  if (!point) return null;
  const x = finiteNumber(point.x);
  const y = finiteNumber(point.y);
  return {
    x,
    y,
    xRatio: Number.isFinite(point.xRatio) ? point.xRatio : x / Math.max(1, width),
    yRatio: Number.isFinite(point.yRatio) ? point.yRatio : y / Math.max(1, height)
  };
}

function projectPoint(point, width, height) {
  return point ? { x: point.xRatio * width, y: point.yRatio * height } : null;
}

function setCssNumber(element, name, value, unit = "") {
  element.style.setProperty(name, `${finiteNumber(value)}${unit}`);
}

export function resolveAttachmentGroundPoint({
  tokenRect,
  overlayRect,
  visualZ = 0,
  mapScale = 1,
  position = "centered",
  radius = 36,
  cycles = 1,
  progress = 0
} = {}) {
  const scaledVisualZ = finiteNumber(visualZ) * finiteNumber(mapScale, 1);
  let x = finiteNumber(tokenRect?.left) + finiteNumber(tokenRect?.width) / 2 -
    finiteNumber(overlayRect?.left);
  let y = finiteNumber(tokenRect?.top) + finiteNumber(tokenRect?.height) / 2 -
    finiteNumber(overlayRect?.top) + scaledVisualZ;
  if (position === "under") y += finiteNumber(tokenRect?.height) * 0.42;
  if (position === "above") y -= finiteNumber(tokenRect?.height) * 0.62;
  if (position === "overhead") y -= finiteNumber(tokenRect?.height) * 0.95;
  if (position === "orbit") {
    const angle = finiteNumber(progress) * Math.PI * 2 * finiteNumber(cycles, 1);
    x += Math.cos(angle) * finiteNumber(radius, 36) * finiteNumber(mapScale, 1);
    y += Math.sin(angle) * finiteNumber(radius, 36) * finiteNumber(mapScale, 1) * 0.45;
  }
  return Object.freeze({ x, y, z: scaledVisualZ });
}

export function createEffectRenderer({
  surface,
  getTargetElement = () => surface,
  getScale = () => 1,
  getTokenElement = (tokenId) => surface.querySelector?.(
    `.hg-token[data-token-id="${globalThis.CSS?.escape?.(tokenId) || tokenId}"]`
  ),
  requestFrame,
  cancelFrame,
  now = () => globalThis.performance?.now?.() ?? Date.now()
} = {}) {
  if (!surface?.appendChild) throw new TypeError("Battle-map VFX require a map surface.");

  const documentRef = surface.ownerDocument;
  const windowRef = documentRef.defaultView;
  const scheduleFrame = requestFrame || windowRef?.requestAnimationFrame?.bind(windowRef) ||
    ((callback) => setTimeout(() => callback(now()), 16));
  const stopFrame = cancelFrame || windowRef?.cancelAnimationFrame?.bind(windowRef) || clearTimeout;
  const overlay = createElement(documentRef, "hg-map-vfx-layer");
  const lightOverlay = createElement(documentRef, "hg-map-vfx-light-layer");
  const records = new Map();
  const debugOptions = {
    enabled: false,
    shadows: true,
    zAxis: true,
    scaling: true,
    sprites: true,
    layers: false,
    labels: false
  };
  let connected = false;
  let resizeObserver = null;
  let observedTarget = null;
  let frameHandle = null;
  let bounds = { width: 1, height: 1 };
  let mapScale = 1;

  for (const layer of [overlay, lightOverlay]) {
    layer.setAttribute("aria-hidden", "true");
    layer.dataset.effectsMode = "full";
  }

  function ensureFrame() {
    if (frameHandle === null && records.size) frameHandle = scheduleFrame(renderFrame);
  }

  function syncBounds() {
    let target = surface;
    let requestedScale = 1;
    try { target = getTargetElement() || surface; } catch { target = surface; }
    try { requestedScale = getScale(); } catch { requestedScale = 1; }
    const surfaceRect = surface.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const width = Math.max(1, targetRect.width || surfaceRect.width);
    const height = Math.max(1, targetRect.height || surfaceRect.height);
    mapScale = clamp(finiteNumber(requestedScale, 1), 0.05, 20);
    const left = targetRect.left - surfaceRect.left + surface.scrollLeft;
    const top = targetRect.top - surfaceRect.top + surface.scrollTop;
    for (const layer of [overlay, lightOverlay]) {
      layer.style.left = `${left}px`;
      layer.style.top = `${top}px`;
      layer.style.width = `${width}px`;
      layer.style.height = `${height}px`;
      layer.dataset.mapScale = String(mapScale);
    }
    bounds = { width, height };
    if (resizeObserver && observedTarget !== target) {
      if (observedTarget) resizeObserver.unobserve(observedTarget);
      resizeObserver.observe(target);
      observedTarget = target;
    }
    records.forEach((record) => positionRecord(record, now()));
  }

  function configurePath(record, start, end) {
    if (!start || !end) return;
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const length = Math.hypot(deltaX, deltaY);
    setCssNumber(record.element, "--hg-vfx-path-pixels", length);
    setCssNumber(record.element, "--hg-vfx-path-length", length, "px");
    setCssNumber(record.element, "--hg-vfx-path-rotation",
      Math.atan2(deltaY, deltaX) * 180 / Math.PI, "deg");
    record.element.classList.add("has-path");
  }

  function resolveAttachment(record, progress) {
    const requested = record.effect.attachment || (record.effect.metadata.affectedTokenId
      ? { tokenId: record.effect.metadata.affectedTokenId, position: "centered",
          radius: 36, cycles: 1 }
      : null);
    if (!requested?.tokenId) return null;
    let token = null;
    try { token = getTokenElement(requested.tokenId); } catch { token = null; }
    if (!token?.getBoundingClientRect) return null;
    const tokenRect = token.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();
    return resolveAttachmentGroundPoint({
      tokenRect,
      overlayRect,
      visualZ: token.dataset.visualZ,
      mapScale,
      position: requested.position,
      radius: requested.radius,
      cycles: requested.cycles,
      progress
    });
  }

  function positionRecord(record, timestamp) {
    const effect = record.effect;
    const position = projectPoint(record.position, bounds.width, bounds.height);
    const start = projectPoint(record.start, bounds.width, bounds.height);
    const end = projectPoint(record.end, bounds.width, bounds.height);
    const anchor = position || end || start || { x: 0, y: 0 };
    configurePath(record, start, end);
    const progress = effect.duration <= 0 ? 1 :
      clamp((timestamp - record.startedAt) / effect.duration, 0, 1);
    const attached = resolveAttachment(record, progress);
    const motionStart = attached || start || anchor;
    const motionEnd = attached || end || anchor;
    const state = calculateMotion25d({ progress, start: motionStart, end: motionEnd,
      motion: effect.motion, baseRotation: effect.rotation });
    const uses25d = Boolean(attached) || effect.motion.type !== "stationary" ||
      effect.motion.startZ !== 0 || effect.motion.endZ !== 0 || effect.motion.maxZ !== 0;
    const attachedZ = attached
      ? attached.z + (state.z - effect.motion.startZ) * mapScale
      : state.z * mapScale;
    const z = debugOptions.zAxis && uses25d ? attachedZ : 0;
    const x = uses25d ? state.x : (start && end ? start.x : anchor.x);
    const groundY = uses25d ? state.y : (start && end ? start.y : anchor.y);
    const screenY = groundY - z;
    const heightScale = debugOptions.scaling
      ? calculateHeightScale(z, effect.heightScaling) : 1;
    const visualScale = effect.scale * mapScale * heightScale;

    record.element.classList.toggle("uses-2d5-motion", uses25d);
    record.element.style.left = `${x}px`;
    record.element.style.top = `${screenY}px`;
    record.element.style.zIndex = String(getDepthSortValue({
      layer: record.layer, y: groundY, z, elevation: effect.elevation
    }));
    record.element.dataset.effectLayer = record.layer;
    record.element.dataset.elevation = String(effect.elevation);
    record.element.dataset.vfxX = String(Math.round(x * 100) / 100);
    record.element.dataset.vfxY = String(Math.round(groundY * 100) / 100);
    record.element.dataset.vfxZ = String(Math.round(z * 100) / 100);
    record.element.dataset.vfxProgress = String(Math.round(progress * 1000) / 1000);
    setCssNumber(record.element, "--hg-vfx-scale", visualScale);
    setCssNumber(record.element, "--hg-vfx-rotation",
      uses25d ? state.rotation : effect.rotation, "deg");
    if (effect.persistent && effect.fadeOut) {
      const fade = progress < 0.85 ? 1 : (1 - progress) / 0.15;
      record.element.style.opacity = String(effect.opacity * clamp(fade, 0, 1));
    }
    if (record.shadow) {
      const shadow = calculateShadow25d(z, effect.shadow);
      record.shadow.hidden = !debugOptions.shadows;
      record.shadow.style.left = `${x}px`;
      record.shadow.style.top = `${groundY}px`;
      record.shadow.style.opacity = String(shadow.opacity);
      record.shadow.style.transform =
        `translate(-50%, -50%) scale(${shadow.scale * mapScale})`;
      record.shadow.style.zIndex = String(getDepthSortValue({
        layer: "shadows", y: groundY, z: 0
      }));
    }
    if (debugOptions.sprites) record.animator?.seek?.(timestamp);
    record.current = Object.freeze({
      id: effect.id, type: effect.type, x, y: groundY, screenY, z, progress,
      frame: record.animator?.getState?.().currentFrame ?? null,
      layer: record.layer
    });
    if (record.debugLabel) {
      record.debugLabel.textContent = `${effect.id} · ${record.layer}\n` +
        `X ${x.toFixed(1)} Y ${groundY.toFixed(1)} Z ${z.toFixed(1)}\n` +
        `${Math.round(progress * 100)}% · F ${record.current.frame ?? "-"}`;
    }
  }

  function renderFrame(timestamp) {
    frameHandle = null;
    records.forEach((record) => positionRecord(record, timestamp));
    ensureFrame();
  }

  function appendParticles(element, effect) {
    const options = { ...(effect.definition.particles || {}), ...(effect.particles || {}) };
    options.count = finiteNumber(options.count) * effect.intensity;
    createParticleDescriptors(options, { mode: effect.effectsMode }).forEach((particle) => {
      const node = createElement(documentRef, "hg-vfx-particle");
      setCssNumber(node, "--hg-vfx-particle-x", particle.x, "px");
      setCssNumber(node, "--hg-vfx-particle-y", particle.y, "px");
      setCssNumber(node, "--hg-vfx-particle-size", particle.size, "px");
      setCssNumber(node, "--hg-vfx-particle-delay", particle.delay, "ms");
      setCssNumber(node, "--hg-vfx-particle-duration", particle.duration, "ms");
      setCssNumber(node, "--hg-vfx-particle-opacity", particle.opacity);
      element.appendChild(node);
    });
  }

  function appendSprite(element, effect) {
    const spriteOptions = { ...(effect.definition.sprite || {}), ...(effect.sprite || {}) };
    if (effect.definition.className === "cantrip-impact-sprite" ||
        spriteOptions.fitDuration === true) {
      const frames = (spriteOptions.endFrame ?? spriteOptions.frameCount - 1) -
        (spriteOptions.startFrame ?? 0) + 1;
      spriteOptions.framesPerSecond = Math.min(60,
        frames * 1000 / Math.max(1, effect.duration));
    }
    const sprite = createElement(documentRef, "hg-vfx-sprite");
    element.appendChild(sprite);
    const animator = createSpriteAnimator({ element: sprite, options: spriteOptions, manual: true });
    animator.start();
    return animator;
  }

  function createShadow(effect) {
    if (!effect.shadow?.enabled) return null;
    const shadow = createElement(documentRef, "hg-vfx-ground-shadow");
    shadow.dataset.parentEffectId = effect.id;
    overlay.appendChild(shadow);
    return shadow;
  }

  function render(effect) {
    if (!connected) connect();
    syncBounds();
    remove(effect.id);
    const element = createElement(documentRef,
      `hg-map-vfx-effect hg-vfx-${effect.definition.className}`);
    element.dataset.effectId = effect.id;
    element.dataset.effectType = effect.type;
    element.dataset.effectKind = effect.definition.kind;
    element.dataset.effectState = "active";
    element.dataset.effectIntensity = String(effect.intensity);
    element.style.opacity = String(effect.opacity);
    setCssNumber(element, "--hg-vfx-rotation", effect.rotation, "deg");
    setCssNumber(element, "--hg-vfx-duration", effect.duration, "ms");
    setCssNumber(element, "--hg-vfx-intensity", effect.intensity);
    const record = {
      effect, element, layer: effect.layer,
      position: makeResponsivePoint(effect.position, bounds.width, bounds.height),
      start: makeResponsivePoint(effect.startPosition, bounds.width, bounds.height),
      end: makeResponsivePoint(effect.endPosition, bounds.width, bounds.height),
      animator: null, shadow: null, debugLabel: null, current: null,
      dispose: null, startedAt: now()
    };
    if (effect.definition.kind === "sprite") record.animator = appendSprite(element, effect);
    else appendParticles(element, effect);
    if (debugOptions.labels) {
      record.debugLabel = createElement(documentRef, "hg-vfx-debug-label");
      element.appendChild(record.debugLabel);
    }
    record.shadow = createShadow(effect);
    records.set(effect.id, record);
    (effect.definition.blendMode === "screen" ? lightOverlay : overlay).appendChild(element);
    positionRecord(record, record.startedAt);
    try {
      const dispose = effect.definition.configureElement?.({ document: documentRef, effect, element });
      if (typeof dispose === "function") record.dispose = dispose;
    } catch (error) {
      remove(effect.id);
      throw error;
    }
    ensureFrame();
    return element;
  }

  function remove(id) {
    const record = records.get(String(id || ""));
    if (!record) return false;
    record.animator?.destroy?.();
    record.dispose?.();
    record.shadow?.remove();
    record.element.remove();
    records.delete(record.effect.id);
    if (!records.size && frameHandle !== null) {
      stopFrame(frameHandle);
      frameHandle = null;
    }
    return true;
  }

  function update(id, changes = {}) {
    const record = records.get(String(id || ""));
    if (!record) return false;
    if (changes.layer) record.layer = normalizeEffectLayer(changes.layer, record.layer);
    positionRecord(record, now());
    return true;
  }

  function setDebugOptions(options = {}) {
    Object.keys(debugOptions).forEach((key) => {
      if (typeof options[key] === "boolean") debugOptions[key] = options[key];
    });
    for (const layer of [overlay, lightOverlay]) {
      layer.classList.toggle("show-vfx-layers", debugOptions.layers);
    }
    records.forEach((record) => {
      if (debugOptions.labels && !record.debugLabel) {
        record.debugLabel = createElement(documentRef, "hg-vfx-debug-label");
        record.element.appendChild(record.debugLabel);
      } else if (!debugOptions.labels && record.debugLabel) {
        record.debugLabel.remove();
        record.debugLabel = null;
      }
      positionRecord(record, now());
    });
    return Object.freeze({ ...debugOptions });
  }

  function clear() { Array.from(records.keys()).forEach(remove); }

  function connect() {
    if (connected) return overlay;
    connected = true;
    surface.appendChild(overlay);
    surface.appendChild(lightOverlay);
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
    lightOverlay.dataset.effectsMode = mode;
  }

  function destroy() {
    clear();
    resizeObserver?.disconnect();
    resizeObserver = null;
    observedTarget = null;
    windowRef?.removeEventListener("resize", syncBounds);
    overlay.remove();
    lightOverlay.remove();
    connected = false;
  }

  return Object.freeze({
    clear, connect, destroy,
    getDebugState: () => Object.freeze({
      options: Object.freeze({ ...debugOptions }),
      effects: Object.freeze(Array.from(records.values())
        .map((record) => record.current).filter(Boolean))
    }),
    getEffectElement: (id) => records.get(String(id || ""))?.element || null,
    getOverlayElement: () => overlay,
    notifyTimelineEvent: (id, event) => {
      const element = records.get(String(id || ""))?.element;
      if (element) element.dataset.lastTimelineEvent = event.id;
    },
    refresh: syncBounds, remove, render, setDebugOptions, setMode, update
  });
}
