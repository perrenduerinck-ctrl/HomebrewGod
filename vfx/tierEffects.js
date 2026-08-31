// Owner-supplied sheets; keep pixels intact and select windows in the player.
// Tiers refer to the spell's base level, not an upcast slot.
export function getSpellSpriteTier(level) {
  if (level === null || level === "" || typeof level === "boolean") return null;
  const n = Number(level);
  if (!Number.isInteger(n) || n < 0 || n > 9) return null;
  const grid = n <= 2 ? 4 : n <= 6 ? 5 : 6;
  return Object.freeze({ columns: grid, rows: grid, frameCount: grid * grid });
}

export const LESSER_SPRITE_ASSETS = Object.freeze(Object.fromEntries([
  "fire", "acid", "cold", "lightning", "poison", "necrotic", "radiant",
  "force", "thunder", "psychic"
].map(theme => [theme, `./assets/vfx/tiers0-2/${theme}-cast-4x4.png`])));

export const TIER_SPRITE_ASSETS = Object.freeze(Object.fromEntries([
  "fire", "cold", "lightning", "thunder", "necrotic", "radiant", "force", "psychic",
  "acid", "poison", "acid-ground", "acid-stream", "poison-comet"
].map(theme => [theme, `./assets/vfx/tiers3-6/${theme}-cast-5x5.png`])));

export function getTierSpriteAsset(theme, level) {
  const tier = getSpellSpriteTier(level);
  const src = tier?.columns === 4 ? LESSER_SPRITE_ASSETS[theme]
    : tier?.columns === 5 ? TIER_SPRITE_ASSETS[theme] : null;
  // Missing 5x5/6x6 art must NOT silently masquerade as a smaller grid.
  return src ? Object.freeze({ src, ...tier }) : null;
}

// The corrected sheets have slightly different flight-to-impact transitions.
const firstImpact = { fire: 9, cold: 9, lightning: 7, thunder: 6,
  necrotic: 10, radiant: 9, force: 8, psychic: 9, acid: 5, poison: 5,
  "acid-ground": 4, "acid-stream": 10, "poison-comet": 7 };
export function getTierFrameWindow(theme, level, role) {
  const asset = getTierSpriteAsset(theme, level);
  if (!asset) return null;
  const impact = asset.columns === 4 ? 5 : firstImpact[theme];
  return Object.freeze(role === "flight" ? [0, impact - 1]
    : role === "beam" ? [Math.max(1, impact - 4), impact - 1]
    : role === "cloud" ? [asset.columns === 4 ? 9 : 15, asset.frameCount - 1]
    : [impact, asset.frameCount - 1]);
}

function sheet(theme, role, level) {
  const [startFrame, endFrame] = getTierFrameWindow(theme, level, role);
  return Object.freeze({
    id: `${level < 3 ? "lesser" : "tier"}-${theme}-${role}`, kind: "sprite", className: `tier-${role}`,
    // The later supplied square green sheets have an opaque black background.
    blendMode: level >= 3 && ["acid", "poison", "acid-stream", "poison-comet"].includes(theme)
      ? "screen" : "normal",
    sprite: Object.freeze({ ...getTierSpriteAsset(theme, level),
      frameWidth: 160, frameHeight: theme === "acid-ground" ? 128 : 160, startFrame, endFrame,
      framesPerSecond: 20, fitDuration: true, loop: false, removeOnComplete: true }),
    configureElement({ document, element }) {
      element.dataset.spriteTheme = theme;
      element.dataset.spriteRole = role;
      // The projectile head is southwest, so -135 degrees points it right.
      // Only the renderer rotates that right-facing path into map direction.
      element.style.setProperty("--hg-tier-art-angle", "-135deg");
      if (role === "beam" || role === "cone") {
        const stage = document.createElement("div");
        stage.className = "hg-tier-stage";
        stage.appendChild(element.querySelector(".hg-vfx-sprite"));
        element.appendChild(stage);
      }
    }
  });
}

export const TIER_EFFECT_DEFINITIONS = Object.freeze(
  [0, 3].flatMap(level => Object.keys(level === 0 ? LESSER_SPRITE_ASSETS : TIER_SPRITE_ASSETS)
    .flatMap(theme => ["flight", "beam", "burst", "cloud", "cone"].map(role => sheet(theme, role, level))))
);

export function getTierSpritePaths(effectIds = []) {
  const ids = new Set(effectIds);
  return [...new Set(TIER_EFFECT_DEFINITIONS.filter(effect => ids.has(effect.id))
    .map(effect => effect.sprite.src))];
}
