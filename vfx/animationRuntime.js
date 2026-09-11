import { elevationToVisualPixels } from "../battleMap/elevation.js";

const number = (value, fallback = 0) => value != null && Number.isFinite(Number(value)) ? Number(value) : fallback;
export function animationLayerMetrics(layer, rect) {
  const box = rect || layer?.getBoundingClientRect?.() || {};
  return { left: number(box.left), top: number(box.top),
    width: number(layer?.clientWidth, number(box.width, 1)) || 1,
    height: number(layer?.clientHeight, number(box.height, 1)) || 1,
    screenWidth: number(box.width, 1) || 1, screenHeight: number(box.height, 1) || 1,
    scale: number(layer?.dataset?.mapScale, 1) || 1 };
}
export function screenToAnimationLayer(point, { layer, layerRect } = {}) {
  const m = animationLayerMetrics(layer, layerRect);
  return { x: (number(point.clientX ?? point.x) - m.left) * m.width / m.screenWidth,
    y: (number(point.clientY ?? point.y) - m.top) * m.height / m.screenHeight };
}
export function worldToAnimationLayer(point, { layer, scale } = {}) {
  const zoom = number(scale, animationLayerMetrics(layer).scale);
  return { x: number(point.x) * zoom, y: number(point.y) * zoom };
}

// Plain points are centers. Rectangular objects are top-left boxes unless they
// explicitly declare anchor:"center". Real tokens prefer their visible DOM body.
export function normalizeAnimationPoint(input, options = {}) {
  if (typeof input === "function") input = input();
  if (input == null) return null;
  const { layer, layerRect, getTokenElement } = options;
  const id = typeof input === "string" ? input : input.id ?? input.tokenId ?? input.token?.id ?? input.dataset?.tokenId ?? null;
  const element = input.getBoundingClientRect ? input : input.element || (id ? getTokenElement?.(id) : null);
  if (element?.isConnected === false) return null;
  let x, y, width = 0, height = 0;
  if (element?.getBoundingClientRect) {
    const body = element.querySelector?.(":scope > img, :scope > .hg-token-fallback") || element;
    const rect = body.getBoundingClientRect(), m = animationLayerMetrics(layer, layerRect);
    const point = screenToAnimationLayer({ x: rect.left, y: rect.top }, options);
    x = point.x; y = point.y; width = rect.width * m.width / m.screenWidth; height = rect.height * m.height / m.screenHeight;
  } else {
    if (typeof input !== "object") return null;
    const raw = input.position || input, m = animationLayerMetrics(layer, layerRect);
    let point = raw;
    if (raw.clientX != null && raw.clientY != null) point = screenToAnimationLayer(raw, options);
    else if (raw.pageX != null && raw.pageY != null) point = screenToAnimationLayer({ x: raw.pageX - number(globalThis.scrollX), y: raw.pageY - number(globalThis.scrollY) }, options);
    else if (raw.xRatio != null && raw.yRatio != null) point = { x: raw.xRatio * m.width, y: raw.yRatio * m.height };
    else if (input.coordinateSpace === "world") point = worldToAnimationLayer(raw, options);
    if (!Number.isFinite(Number(point.x ?? point.centerX)) || !Number.isFinite(Number(point.y ?? point.centerY))) return null;
    const extentScale = input.coordinateSpace === "world" ? m.scale : 1;
    width = Math.max(0, number(input.width)) * extentScale; height = Math.max(0, number(input.height)) * extentScale;
    x = number(point.centerX ?? point.x); y = number(point.centerY ?? point.y);
    if (input.anchor === "center" || point.centerX != null) { x -= width / 2; y -= height / 2; }
    y -= elevationToVisualPixels(input.elevation || 0) * m.scale;
  }
  return { id: id == null ? null : String(id), x, y, width, height, centerX: x + width / 2, centerY: y + height / 2,
    rotation: number(input.rotation ?? input.token?.rotation), element: element || null, token: input.token || (id && !input.getBoundingClientRect ? input : null) };
}
export const tokenToAnimationPoint = normalizeAnimationPoint;
const center = p => ({ x: p.centerX, y: p.centerY });

// Runtime references are deliberately separate from immutable definitions. Fixed
// points retain their map ratios; following actors are resolved fresh each frame.
export function normalizeAnimationRuntimeContext(options = {}, environment = {}) {
  const layer = () => environment.getLayer?.() || environment.layer;
  const normalize = input => {
    const value = typeof input === "function" ? input() : input;
    return environment.normalizePoint?.(value) || normalizeAnimationPoint(value, { ...environment, layer: layer() });
  };
  const legacy = (point, elevation = 0) => point ? { ...point, anchor: "center", elevation } : null;
  const worldInput = options.world || options.position || legacy({ x: options.x ?? 0, y: options.y ?? 0 }, options.elevation);
  const sourceInput = options.source ?? (options.getSourcePoint ? () => legacy(options.getSourcePoint()) : null) ?? (options.sourceTokenId ? { id: options.sourceTokenId, ...legacy(options.sourcePoint, options.sourceElevation) } : legacy(options.sourcePoint, options.sourceElevation)) ?? worldInput;
  const targetInput = options.target ?? (options.getTargetPoint ? () => legacy(options.getTargetPoint()) : null) ?? (options.targetTokenId ? { id: options.targetTokenId, ...legacy(options.targetPoint, options.targetElevation) } : legacy(options.targetPoint, options.targetElevation)) ?? options.targets?.[0] ??
    (options.targetX != null || options.targetY != null ? { x: options.targetX ?? 0, y: options.targetY ?? 0 } : sourceInput);
  const source = normalize(sourceInput) || normalize(worldInput) || normalizeAnimationPoint({x:0,y:0}), target = normalize(targetInput) || source, world = normalize(worldInput) || target;
  const initial = animationLayerMetrics(layer());
  const snapshot = { source, target, map: world };
  const targets = (options.targets || [targetInput]).slice(0, 256).map(normalize).filter(Boolean);
  const project = (p, m) => ({ ...p, centerX: p.centerX * m.width / initial.width, centerY: p.centerY * m.height / initial.height });
  return { source, target, targets, world, area: options.area || null,
    sample(placement = {}) {
      const points = {}, m = animationLayerMetrics(layer());
      for (const [key, input, follow] of [["source", sourceInput, placement.followSource], ["target", targetInput, placement.followTarget], ["map", worldInput, false]]) {
        let live;
        if (follow && !placement.fixedToMap) { try { live = normalize(input); } catch { /* Keep the last valid point. */ } }
        if (live) snapshot[key] = { ...live, centerX: live.centerX * initial.width / m.width, centerY: live.centerY * initial.height / m.height };
        points[key] = center(project(snapshot[key], m));
      }
      return points;
    }
  };
}

export function animationGeometry(source, target) {
  const dx = target.x - source.x, dy = target.y - source.y;
  return { source, target, distance: Math.hypot(dx, dy), angle: dx || dy ? Math.atan2(dy, dx) * 180 / Math.PI : 0 };
}

// Grid pixels are measured before map zoom; the renderer applies map scale.
// No targeting or combat rule consumes these visual dimensions.
export function animationAreaSize(area = {}, grid = {}) {
  const unit = area.unit === "px" ? 1 : number(grid.pixelsPerFoot, number(grid.pixelsPerSquare) / (number(grid.feetPerSquare, 5) || 5));
  if (!(unit > 0)) return null;
  const round = ["circle", "self"].includes(area.shape);
  const width = number(round ? area.radius * 2 : area.length) * unit;
  const height = number(round ? area.radius * 2 : area.width || area.length) * unit;
  return width > 0 && height > 0 ? { width, height } : null;
}

export function normalizeAnimationGrid(grid = {}, mapScale = 1) {
  const scale = grid.coordinateSpace === "layer" ? number(mapScale, 1) || 1 : 1;
  return { ...grid, pixelsPerFoot: grid.pixelsPerFoot == null ? undefined : Number(grid.pixelsPerFoot) / scale,
    pixelsPerSquare: grid.pixelsPerSquare == null ? undefined : Number(grid.pixelsPerSquare) / scale, coordinateSpace: "world" };
}
