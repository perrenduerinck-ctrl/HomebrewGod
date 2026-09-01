// Shared storm primitives. Geometry, scheduling and disposal remain owned by
// the existing sequence/renderer/engine; these definitions only draw visuals.
import { getTierSpriteAsset, getTierFrameWindow } from "./tierEffects.js?v=status-sprites-20260831";
import { normalizeSpriteOptions, getSpriteFrameStyle } from "./spriteAnimator.js?v=2d5-animation-20260901";
export const STORM_ASSETS = Object.freeze({
  charge: "./assets/vfx/storms/lightning-charge.png",
  impact: "./assets/vfx/storms/lightning-impact.png",
  ice: "./assets/vfx/tiers3-6/cold-cast-5x5.png"
});

function sheet(id, src, startFrame = 0, endFrame = 15) {
  return Object.freeze({ id, kind: "sprite", className: "storm-lightning-sprite", blendMode: "screen",
    sprite: Object.freeze({ src, frameWidth: 160, frameHeight: 160,
      frameCount: 16, columns: 4, rows: 4, startFrame, endFrame,
      framesPerSecond: 20, fitDuration: true, loop: false, removeOnComplete: true }) });
}

function lightning({ document, element, effect }) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 1000 100");
  svg.setAttribute("preserveAspectRatio", "none");
  const reduced = effect.effectsMode === "reduced";
  const distance = Math.hypot((effect.endPosition?.x || 0) - (effect.startPosition?.x || 0),
    (effect.endPosition?.y || 0) - (effect.startPosition?.y || 0));
  const segments = Math.min(200, Math.max(64, Math.ceil(distance / 9)));
  const noise = seed => { const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return value - Math.floor(value); };
  const points = Array.from({ length: segments + 1 }, (_, i) => ({
    x: i * 1000 / segments,
    y: i === 0 || i === segments ? 50 : 50 + (noise(i) - .5) * 54
  }));
  for (let layer = 0; layer < (reduced ? 2 : 4); layer++) {
    let path = "M0 50";
    for (let i = 1; i <= segments; i++) {
      const { x, y: coreY } = points[i];
      const y = coreY + (layer === 1 && i < segments ? (noise(i + 400) - .5) * 24 : 0);
      path += ` L${x.toFixed(2)} ${y.toFixed(2)}`;
      if (layer === 2 && i % 4 === 0 && i < segments - 4) {
        const side = i % 8 ? -1 : 1;
        const reach = 25 + noise(i + 200) * 45;
        path += ` l7 ${side * reach * .4} l-3 ${side * reach * .2} l14 ${side * reach * .4}`;
        path += ` m-7 ${-side * reach * .2} l12 ${-side * reach * .12}`;
        path += ` M${x.toFixed(2)} ${y.toFixed(2)}`;
      }
    }
    const node = document.createElementNS("http://www.w3.org/2000/svg", "path");
    node.setAttribute("d", path);
    node.setAttribute("vector-effect", "non-scaling-stroke");
    node.setAttribute("class", `storm-arc storm-arc-${layer}`);
    svg.appendChild(node);
  }
  element.appendChild(svg);
}

export function stormParticleLayout(count) {
  // A bounded, deterministic sunflower distribution stays inside the circle.
  const safeCount = Math.min(32, Math.max(0, Math.floor(Number(count) || 0)));
  return Array.from({ length: safeCount }, (_, index) => {
    const angle = index * 2.399963;
    const radius = Math.sqrt((index + 0.5) / Math.max(1, safeCount)) * 40;
    return { x: 50 + Math.cos(angle) * radius, y: 50 + Math.sin(angle) * radius,
      delay: (index % 7) * 0.085, size: 0.65 + (index % 4) * 0.18 };
  });
}

function hail({ document, element, effect }) {
  const reduced = effect.effectsMode === "reduced";
  const count = reduced ? 7 : Math.min(32, 18 + effect.intensity * 4);
  stormParticleLayout(count).forEach((point, index) => {
    const stone = document.createElement("i");
    stone.className = "hg-storm-hailstone";
    stone.style.left = point.x + "%";
    stone.style.top = point.y + "%";
    stone.style.setProperty("--storm-delay", point.delay);
    stone.style.setProperty("--storm-size", point.size);
    stone.style.setProperty("--storm-drift", (index % 2 ? 13 : -11) + "px");
    element.appendChild(stone);
  });
  const animations = [];
  const sprite = normalizeSpriteOptions({ ...getTierSpriteAsset("cold", 4),
    frameWidth: 160, frameHeight: 160 });
  const [first, last] = getTierFrameWindow("cold", 4, "burst");
  stormParticleLayout(reduced ? 2 : 7).forEach((point, index) => {
    const burst = document.createElement("i");
    burst.className = "hg-storm-ice-burst";
    burst.style.left = point.x + "%";
    burst.style.top = point.y + "%";
    burst.style.backgroundImage = `url(${JSON.stringify(STORM_ASSETS.ice)})`;
    burst.style.backgroundSize = `${sprite.frameWidth * sprite.columns}px ${sprite.frameHeight * sprite.rows}px`;
    burst.style.backgroundPosition = getSpriteFrameStyle(sprite, first).backgroundPosition;
    burst.style.setProperty("--storm-delay", 0.12 + index * 0.055);
    element.appendChild(burst);
    // Native stepped animation uses the same grid math as the main player,
    // with no additional RAF loops and explicit early-cancel cleanup.
    const frames = Array.from({ length: last - first + 1 }, (_, frame) => ({
      backgroundPosition: getSpriteFrameStyle(sprite, first + frame).backgroundPosition,
      offset: frame / (last - first + 1), easing: "steps(1, end)"
    }));
    frames.push({ ...frames.at(-1), offset: 1 });
    const animation = burst.animate?.(frames, { duration: effect.duration * .42,
      delay: effect.duration * (0.12 + index * .055), fill: "both" });
    if (animation) animations.push(animation);
  });
  return () => animations.forEach(animation => animation.cancel());
}

const primitive = (id, configureElement = null, assets = []) => Object.freeze({
  id, kind: "procedural", className: id, particles: Object.freeze({ count: 0 }),
  configureElement, assets: Object.freeze(assets)
});

export const STORM_EFFECT_DEFINITIONS = Object.freeze([
  sheet("storm-lightning-charge", STORM_ASSETS.charge, 0, 3),
  sheet("storm-lightning-impact", STORM_ASSETS.impact),
  Object.freeze({ ...sheet("storm-lightning-beam", STORM_ASSETS.charge, 4, 11),
    className: "storm-lightning-beam", configureElement: lightning }),
  primitive("storm-lightning-echo", lightning),
  primitive("storm-cloud"),
  primitive("storm-hail", hail, [STORM_ASSETS.ice]),
  primitive("storm-frost")
]);

export function getStormSpritePaths(effectIds = []) {
  const ids = new Set(effectIds);
  return [...new Set(STORM_EFFECT_DEFINITIONS.filter(effect => ids.has(effect.id))
    .flatMap(effect => [effect.sprite?.src, ...(effect.assets || [])].filter(Boolean)))];
}
