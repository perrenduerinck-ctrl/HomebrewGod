import { createParticleDescriptors } from "./particles.js";
import { createSpriteAnimator } from "./spriteAnimator.js?v=2d5-vfx-polish-20260902";
import { createVfxClipController } from "./clipController.js?v=clip-vfx-20260902";
import { createVfxAssetCache } from "./vfxAssetManifest.js?v=clip-vfx-20260902";
import {
  calculateHeightScale,
  calculateMotion25d,
  calculateShadow25d
} from "./motion25d.js";
import {
  EFFECT_LAYER_ORDER,
  getEffectLayer,
  getLocalDepthSortValue,
  normalizeEffectLayer
} from "./effectLayers.js";

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
  assetCache = null,
  now = () => globalThis.performance?.now?.() ?? Date.now()
} = {}) {
  if (!surface?.appendChild) throw new TypeError("Battle-map VFX require a map surface.");

  const documentRef = surface.ownerDocument;
  const windowRef = documentRef.defaultView;
  const scheduleFrame = requestFrame || windowRef?.requestAnimationFrame?.bind(windowRef) ||
    ((callback) => setTimeout(() => callback(now()), 16));
  const stopFrame = cancelFrame || windowRef?.cancelAnimationFrame?.bind(windowRef) || clearTimeout;
  const clipAssetCache = assetCache || createVfxAssetCache({
    createImage: () => new windowRef.Image()
  });
  const depthLayers = new Map(EFFECT_LAYER_ORDER.map((layerId) => {
    const legacyClass = layerId === "airborne" ? " hg-map-vfx-layer" : "";
    const layer = createElement(documentRef,
      `hg-map-vfx-depth-layer hg-map-vfx-${layerId}-layer${legacyClass}`);
    layer.dataset.effectLayerContainer = layerId;
    layer.dataset.depthZ = String(getEffectLayer(layerId).zIndex);
    layer.style.zIndex = layer.dataset.depthZ;
    layer.setAttribute("aria-hidden", "true");
    layer.dataset.effectsMode = "full";
    return [layerId, layer];
  }));
  const overlay = depthLayers.get("airborne");
  const layerElements = Array.from(depthLayers.values());
  const records = new Map();
  const debugOptions = {
    enabled: false,
    shadows: true,
    zAxis: true,
    scaling: true,
    sprites: true,
    particles: true,
    trails: true,
    glows: true,
    layers: false,
    labels: false
  };
  let connected = false;
  let resizeObserver = null;
  let observedTarget = null;
  let frameHandle = null;
  let bounds = { width: 1, height: 1 };
  let mapScale = 1;
  let activeTarget = surface;

  function getDynamicNodeCount() {
    let count = 0;
    records.forEach((record) => {
      count += record.trailPoints.length + record.debrisParticles.length;
    });
    return count;
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
    const canContainLayers = !/^(IMG|CANVAS|VIDEO|SVG)$/i.test(target.tagName || "");
    const layerHost = canContainLayers ? target : (target.parentElement || surface);
    const hostRect = layerHost.getBoundingClientRect();
    const width = Math.max(1, targetRect.width || surfaceRect.width);
    const height = Math.max(1, targetRect.height || surfaceRect.height);
    mapScale = clamp(finiteNumber(requestedScale, 1), 0.05, 20);
    if (activeTarget !== layerHost || layerElements.some((layer) => layer.parentNode !== layerHost)) {
      activeTarget = layerHost;
      layerElements.forEach((layer) => layerHost.appendChild(layer));
    }
    const layerLeft = target === layerHost
      ? 0
      : targetRect.left - hostRect.left + finiteNumber(layerHost.scrollLeft);
    const layerTop = target === layerHost
      ? 0
      : targetRect.top - hostRect.top + finiteNumber(layerHost.scrollTop);
    for (const layer of layerElements) {
      layer.style.left = `${layerLeft}px`;
      layer.style.top = `${layerTop}px`;
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
    const overlayRect = record.container.getBoundingClientRect();
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

  function updateMotionTrail(record, timestamp, point) {
    const options = record.effect.trail;
    const enabled = options?.enabled && debugOptions.trails;
    const lifetime = clamp(finiteNumber(options?.lifetime, 180), 60, 1200);
    const requestedMaximum = Math.round(clamp(finiteNumber(options?.maxPoints, 12), 1, 32));
    const maximum = record.effect.effectsMode === "reduced"
      ? Math.min(4, requestedMaximum)
      : requestedMaximum;
    record.trailPoints = record.trailPoints.filter((trailPoint) => {
      const age = timestamp - trailPoint.bornAt;
      if (!enabled || age >= lifetime) {
        trailPoint.element.remove();
        return false;
      }
      const remaining = 1 - age / lifetime;
      trailPoint.element.style.opacity = String(remaining * finiteNumber(options.opacity, .72));
      trailPoint.element.style.transform =
        `translate(-50%, -50%) scale(${(.35 + remaining * .65) * mapScale})`;
      return true;
    });
    if (!enabled) {
      record.lastTrailSample = point;
      return;
    }
    const prior = record.lastTrailSample;
    const spacing = clamp(finiteNumber(options.spacing, 12), 2, 96) * mapScale;
    const interval = clamp(finiteNumber(options.interval, 28), 12, 180);
    if (prior && getDynamicNodeCount() < 320 && (
      Math.hypot(point.x - prior.x, point.y - prior.y) >= spacing ||
      timestamp - finiteNumber(record.lastTrailAt, 0) >= interval
    )) {
      const trail = createElement(documentRef, "hg-vfx-motion-trail");
      trail.classList.toggle("has-smoke", options.smoke === true);
      trail.style.left = `${prior.x}px`;
      trail.style.top = `${prior.y}px`;
      trail.style.mixBlendMode = record.element.style.mixBlendMode;
      setCssNumber(trail, "--hg-vfx-trail-size",
        clamp(finiteNumber(options.size, 18), 2, 96) * mapScale, "px");
      record.container.appendChild(trail);
      record.trailPoints.push({ element: trail, bornAt: timestamp });
      while (record.trailPoints.length > maximum) {
        record.trailPoints.shift().element.remove();
      }
      record.lastTrailAt = timestamp;
    }
    record.lastTrailSample = point;
  }

  function createDebris(record) {
    const options = record.effect.debris;
    if (!options?.enabled || record.effect.effectsMode === "reduced" && options.reduced !== true) {
      return [];
    }
    const count = Math.min(
      Math.round(clamp(finiteNumber(options.count, 8), 0, 16)),
      Math.max(0, 320 - getDynamicNodeCount())
    );
    const speed = clamp(finiteNumber(options.speed, 105), 8, 600);
    return Array.from({ length: count }, (_, index) => {
      const element = createElement(documentRef, "hg-vfx-debris");
      const angle = -Math.PI * (.12 + .76 * ((index * .61803398875) % 1));
      const velocity = speed * (.62 + (index % 5) * .095);
      setCssNumber(element, "--hg-vfx-debris-size",
        clamp(finiteNumber(options.size, 6) * (.7 + index % 3 * .16), 2, 18), "px");
      record.container.appendChild(element);
      return {
        element,
        origin: null,
        velocityX: Math.cos(angle) * velocity,
        velocityY: Math.sin(angle) * velocity,
        rotation: index * 47,
        rotationSpeed: (index % 2 ? -1 : 1) * (160 + index * 19)
      };
    });
  }

  function updateDebris(record, timestamp, anchor) {
    const options = record.effect.debris;
    const duration = clamp(finiteNumber(options?.lifetime, record.effect.duration), 80, 1800);
    const gravity = clamp(finiteNumber(options?.gravity, 360), 0, 1600);
    const elapsed = Math.max(0, timestamp - record.startedAt);
    const seconds = elapsed / 1000;
    record.debrisParticles.forEach((particle) => {
      particle.origin ||= { ...anchor };
      const x = particle.origin.x + particle.velocityX * seconds * mapScale;
      const y = particle.origin.y + (
        particle.velocityY * seconds + gravity * seconds * seconds * .5
      ) * mapScale;
      particle.element.style.left = `${x}px`;
      particle.element.style.top = `${y}px`;
      particle.element.style.opacity = String(clamp(1 - elapsed / duration, 0, 1));
      particle.element.style.transform = `translate(-50%, -50%) rotate(${(
        particle.rotation + particle.rotationSpeed * seconds
      ).toFixed(1)}deg)`;
    });
  }

  function updateZLine(record, { x, screenY, groundY, z }) {
    if (!record.zLine) return;
    record.zLine.hidden = !debugOptions.labels || Math.abs(z) < .5;
    record.zLine.style.left = `${x}px`;
    record.zLine.style.top = `${Math.min(screenY, groundY)}px`;
    record.zLine.style.height = `${Math.abs(z)}px`;
  }

  function applyScreenShake(timestamp) {
    let shakeX = 0;
    let shakeY = 0;
    records.forEach((record) => {
      const options = record.effect.shake;
      if (!options?.enabled || record.effect.effectsMode !== "full") return;
      const duration = clamp(finiteNumber(options.duration, 110), 40, 240);
      const elapsed = timestamp - record.startedAt;
      if (elapsed < 0 || elapsed > duration) return;
      const amplitude = clamp(finiteNumber(options.amplitude, 3), 0, 6) *
        (1 - elapsed / duration);
      shakeX += Math.sin(elapsed * .22 + record.effect.id.length) * amplitude;
      shakeY += Math.cos(elapsed * .27 + record.effect.id.length) * amplitude * .65;
    });
    surface.classList.toggle("hg-vfx-screen-shake", Math.abs(shakeX) + Math.abs(shakeY) > .05);
    setCssNumber(surface, "--hg-vfx-shake-x", shakeX, "px");
    setCssNumber(surface, "--hg-vfx-shake-y", shakeY, "px");
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
    const punchDuration = clamp(finiteNumber(
      effect.impactPunch?.durationRatio, .2
    ), .05, .6);
    const punch = effect.impactPunch?.enabled && progress < punchDuration
      ? Math.sin(progress / punchDuration * Math.PI) * clamp(
          finiteNumber(effect.impactPunch.amount, .14), 0, .5
        )
      : 0;
    const visualScale = effect.scale * mapScale * heightScale * (1 + punch);

    record.element.classList.toggle("uses-2d5-motion", uses25d);
    record.element.style.left = `${x}px`;
    record.element.style.top = `${screenY}px`;
    record.element.style.zIndex = String(getLocalDepthSortValue({
      y: groundY, z, elevation: effect.elevation
    }));
    record.element.dataset.effectLayer = record.layer;
    record.element.dataset.elevation = String(effect.elevation);
    record.element.dataset.vfxX = String(Math.round(x * 100) / 100);
    record.element.dataset.vfxY = String(Math.round(groundY * 100) / 100);
    record.element.dataset.vfxZ = String(Math.round(z * 100) / 100);
    record.element.dataset.vfxProgress = String(Math.round(progress * 1000) / 1000);
    setCssNumber(record.element, "--hg-vfx-scale", visualScale);
    const heightGlow = effect.heightGlow?.enabled
      ? clamp(Math.abs(z) / Math.max(1, finiteNumber(effect.motion.maxZ, 80)), 0, 1)
      : 0;
    setCssNumber(record.element, "--hg-vfx-height-glow", heightGlow);
    setCssNumber(record.element, "--hg-vfx-height-glow-radius", 5 + heightGlow * 9, "px");
    record.element.classList.toggle("has-height-glow",
      debugOptions.glows && heightGlow > 0);
    record.element.classList.toggle("hide-vfx-sprite", !debugOptions.sprites);
    record.element.classList.toggle("hide-vfx-particles", !debugOptions.particles);
    setCssNumber(record.element, "--hg-vfx-rotation",
      uses25d ? state.rotation : effect.rotation, "deg");
    if (effect.persistent && effect.fadeOut) {
      const fade = progress < 0.85 ? 1 : (1 - progress) / 0.15;
      record.element.style.opacity = String(effect.opacity * clamp(fade, 0, 1));
    }
    if (record.shadow) {
      const shadow = calculateShadow25d(z, effect.shadow);
      record.shadow.hidden = !debugOptions.shadows;
      record.shadow.style.left = `${x + shadow.offsetX * mapScale}px`;
      record.shadow.style.top = `${groundY + shadow.offsetY * mapScale}px`;
      record.shadow.style.opacity = String(shadow.opacity);
      record.shadow.style.transform =
        `translate(-50%, -50%) scale(${shadow.scale * mapScale})`;
      record.shadow.style.zIndex = String(getLocalDepthSortValue({
        y: groundY, z: 0
      }));
    }
    updateMotionTrail(record, timestamp, { x, y: screenY });
    updateDebris(record, timestamp, { x, y: groundY });
    updateZLine(record, { x, screenY, groundY, z });
    if (debugOptions.sprites) record.animator?.seek?.(timestamp);
    const animationState = record.animator?.getState?.();
    record.current = Object.freeze({
      id: effect.id, type: effect.type, x, y: groundY, screenY, z, progress,
      frame: animationState?.currentFrame ?? null,
      clip: animationState?.clipName || "",
      layer: record.layer
    });
    if (record.debugLabel) {
      record.debugLabel.textContent = `${effect.id} · ${record.layer}\n` +
        `X ${x.toFixed(1)} Y ${groundY.toFixed(1)} Z ${z.toFixed(1)}\n` +
        `${Math.round(progress * 100)}% · ${record.current.clip || "sprite"} ` +
        `F ${record.current.frame ?? "-"}`;
    }
  }

  function renderFrame(timestamp) {
    frameHandle = null;
    records.forEach((record) => positionRecord(record, timestamp));
    applyScreenShake(timestamp);
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

  function appendSprite(element, effect, hooks = {}) {
    if (effect.clips && Object.keys(effect.clips).length) {
      const sprite = createElement(documentRef, "hg-vfx-sprite hg-vfx-clip-sprite");
      element.appendChild(sprite);
      return createVfxClipController({
        element: sprite,
        clips: effect.clips,
        initialClip: effect.clip,
        assetCache: clipAssetCache,
        requestFrame: scheduleFrame,
        cancelFrame: stopFrame,
        now,
        manual: true,
        onEvent: (event) => {
          element.dataset.lastClipEvent = event.id;
          hooks.onClipEvent?.(event);
        }
      });
    }
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
    depthLayers.get("shadows").appendChild(shadow);
    return shadow;
  }

  function render(effect, hooks = {}) {
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
    if (effect.definition.blendMode) {
      element.style.mixBlendMode = effect.definition.blendMode;
    }
    setCssNumber(element, "--hg-vfx-rotation", effect.rotation, "deg");
    setCssNumber(element, "--hg-vfx-duration", effect.duration, "ms");
    setCssNumber(element, "--hg-vfx-intensity", effect.intensity);
    const container = depthLayers.get(effect.layer) || overlay;
    const record = {
      effect, element, layer: effect.layer,
      container,
      position: makeResponsivePoint(effect.position, bounds.width, bounds.height),
      start: makeResponsivePoint(effect.startPosition, bounds.width, bounds.height),
      end: makeResponsivePoint(effect.endPosition, bounds.width, bounds.height),
      animator: null, shadow: null, debugLabel: null, zLine: null, current: null,
      trailPoints: [], lastTrailSample: null, lastTrailAt: 0,
      debrisParticles: [],
      dispose: null, startedAt: now()
    };
    if (effect.definition.kind === "sprite") {
      record.animator = appendSprite(element, effect, hooks);
    }
    else appendParticles(element, effect);
    if (debugOptions.labels) {
      record.debugLabel = createElement(documentRef, "hg-vfx-debug-label");
      element.appendChild(record.debugLabel);
    }
    record.zLine = createElement(documentRef, "hg-vfx-z-line");
    record.zLine.dataset.parentEffectId = effect.id;
    record.zLine.hidden = true;
    container.appendChild(record.zLine);
    record.shadow = createShadow(effect);
    records.set(effect.id, record);
    container.appendChild(element);
    record.debrisParticles = createDebris(record);
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
    record.zLine?.remove();
    record.trailPoints.forEach((trailPoint) => trailPoint.element.remove());
    record.debrisParticles.forEach((particle) => particle.element.remove());
    record.element.remove();
    records.delete(record.effect.id);
    applyScreenShake(now());
    if (!records.size && frameHandle !== null) {
      stopFrame(frameHandle);
      frameHandle = null;
    }
    return true;
  }

  function update(id, changes = {}) {
    const record = records.get(String(id || ""));
    if (!record) return false;
    if (changes.layer) {
      record.layer = normalizeEffectLayer(changes.layer, record.layer);
      record.container = depthLayers.get(record.layer) || overlay;
      record.container.appendChild(record.element);
      record.container.appendChild(record.zLine);
      record.trailPoints.forEach(({ element }) => record.container.appendChild(element));
      record.debrisParticles.forEach(({ element }) => record.container.appendChild(element));
    }
    if (changes.clip) record.animator?.playClip?.(changes.clip);
    positionRecord(record, now());
    return true;
  }

  function setDebugOptions(options = {}) {
    Object.keys(debugOptions).forEach((key) => {
      if (typeof options[key] === "boolean") debugOptions[key] = options[key];
    });
    for (const layer of layerElements) {
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
    windowRef?.addEventListener("resize", syncBounds);
    if (typeof windowRef?.ResizeObserver === "function") {
      resizeObserver = new windowRef.ResizeObserver(syncBounds);
      resizeObserver.observe(surface);
    }
    syncBounds();
    return overlay;
  }

  function setMode(mode) {
    layerElements.forEach((layer) => { layer.dataset.effectsMode = mode; });
  }

  function destroy() {
    clear();
    resizeObserver?.disconnect();
    resizeObserver = null;
    observedTarget = null;
    windowRef?.removeEventListener("resize", syncBounds);
    layerElements.forEach((layer) => layer.remove());
    clipAssetCache.clear?.();
    surface.classList.remove("hg-vfx-screen-shake");
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
    getLayerElement: (layer) => depthLayers.get(normalizeEffectLayer(layer)) || null,
    getOverlayElement: () => overlay,
    notifyTimelineEvent: (id, event) => {
      const element = records.get(String(id || ""))?.element;
      if (element) element.dataset.lastTimelineEvent = event.id;
    },
    refresh: syncBounds, remove, render, setDebugOptions, setMode, update
  });
}
