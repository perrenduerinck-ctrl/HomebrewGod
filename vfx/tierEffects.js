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

export const EPIC_SPRITE_ASSETS = Object.freeze(Object.fromEntries([
  "psychic", "earth", "force", "cold", "acid", "lightning", "fire",
  "piercing", "poison", "necrotic", "radiant", "thunder", "slashing"
].map(theme => [theme, `./assets/vfx/tiers7-9/${theme}-cast-6x6.png`])));

// Measured dark gutters, not assumed equal-size cells. Several source sheets
// have uneven spacing / trailing padding; explicit boundaries prevent bleed.
export const EPIC_ATLAS_BOUNDS = Object.freeze({
  psychic: Object.freeze({ columns: Object.freeze([0,191,380,579,789,1007,1251]), rows: Object.freeze([0,202,395,581,769,964,1159]) }),
  earth: Object.freeze({ columns: Object.freeze([0,200,409,622,832,1041,1254]), rows: Object.freeze([0,206,415,624,830,1035,1230]) }),
  force: Object.freeze({ columns: Object.freeze([0,213,407,610,815,1027,1251]), rows: Object.freeze([0,214,417,620,824,1028,1226]) }),
  cold: Object.freeze({ columns: Object.freeze([0,210,403,604,812,1018,1244]), rows: Object.freeze([0,200,401,594,788,985,1221]) }),
  acid: Object.freeze({ columns: Object.freeze([0,201,395,594,804,1018,1248]), rows: Object.freeze([0,184,379,574,771,969,1157]) }),
  lightning: Object.freeze({ columns: Object.freeze([0,206,412,621,831,1041,1254]), rows: Object.freeze([0,190,423,638,850,1064,1242]) }),
  fire: Object.freeze({ columns: Object.freeze([0,207,411,617,824,1032,1253]), rows: Object.freeze([0,195,387,589,794,1001,1199]) }),
  piercing: Object.freeze({ columns: Object.freeze([0,210,417,625,827,1033,1248]), rows: Object.freeze([0,200,413,628,847,1056,1237]) }),
  poison: Object.freeze({ columns: Object.freeze([0,199,408,618,824,1039,1254]), rows: Object.freeze([0,199,385,581,787,989,1197]) }),
  necrotic: Object.freeze({ columns: Object.freeze([0,200,411,617,823,1034,1246]), rows: Object.freeze([0,204,398,585,769,970,1170]) }),
  radiant: Object.freeze({ columns: Object.freeze([0,208,416,622,828,1034,1250]), rows: Object.freeze([0,201,415,620,825,1025,1223]) }),
  thunder: Object.freeze({ columns: Object.freeze([0,220,423,626,827,1033,1248]), rows: Object.freeze([0,204,420,633,846,1062,1252]) }),
  slashing: Object.freeze({ columns: Object.freeze([0,207,409,616,820,1024,1234]), rows: Object.freeze([0,199,403,593,796,1000,1192]) })
});

export function getTierSpriteAsset(theme, level) {
  const tier = getSpellSpriteTier(level);
  const src = tier?.columns === 4 ? LESSER_SPRITE_ASSETS[theme]
    : tier?.columns === 5 ? TIER_SPRITE_ASSETS[theme]
    : tier?.columns === 6 ? EPIC_SPRITE_ASSETS[theme] : null;
  // Missing 5x5/6x6 art must NOT silently masquerade as a smaller grid.
  return src ? Object.freeze({ src, ...tier }) : null;
}

// The corrected sheets have slightly different flight-to-impact transitions.
const firstImpact = { fire: 9, cold: 9, lightning: 7, thunder: 6,
  necrotic: 10, radiant: 9, force: 8, psychic: 9, acid: 5, poison: 5,
  "acid-ground": 4, "acid-stream": 10, "poison-comet": 7 };
const epicImpact = { psychic: 6, earth: 6, force: 10, cold: 10, acid: 12,
  lightning: 10, fire: 9, piercing: 7, poison: 7, necrotic: 9,
  radiant: 12, thunder: 6, slashing: 15 };
export function getTierFrameWindow(theme, level, role) {
  const asset = getTierSpriteAsset(theme, level);
  if (!asset) return null;
  if (asset.columns === 6) {
    const impact = epicImpact[theme];
    if (role === "rune") return Object.freeze(theme === "psychic" ? [12,17]
      : theme === "radiant" ? [16,23] : [24,29]);
    if (role === "portal") return Object.freeze(theme === "psychic" ? [18,23] : [24,29]);
    return Object.freeze(role === "flight" ? [0,impact-1]
      : role === "beam" ? [Math.max(1,impact-4),impact-1]
      : role === "cloud" ? [theme === "psychic" ? 27 : 24,asset.frameCount-1]
      : [impact,asset.frameCount-1]);
  }
  const impact = asset.columns === 4 ? 5 : firstImpact[theme];
  return Object.freeze(role === "flight" ? [0, impact - 1]
    : role === "beam" ? [Math.max(1, impact - 4), impact - 1]
    : role === "cloud" ? [asset.columns === 4 ? 9 : 15, asset.frameCount - 1]
    : [impact, asset.frameCount - 1]);
}

function sheet(theme, role, level) {
  const [startFrame, endFrame] = getTierFrameWindow(theme, level, role);
  return Object.freeze({
    id: `${level < 3 ? "lesser" : level < 7 ? "tier" : "epic"}-${theme}-${role}`,
    kind: "sprite", className: `tier-${["rune", "portal"].includes(role) ? "cloud" : role}`,
    // The later supplied square green sheets have an opaque black background.
    blendMode: level >= 7 || level >= 3 && ["acid", "poison", "acid-stream", "poison-comet"].includes(theme)
      ? "screen" : "normal",
    sprite: Object.freeze({ ...getTierSpriteAsset(theme, level),
      ...(level >= 7 ? { atlas: { width: 1254, height: 1254, ...EPIC_ATLAS_BOUNDS[theme] } } : {}),
      frameWidth: 160, frameHeight: theme === "acid-ground" ? 128 : 160, startFrame, endFrame,
      framesPerSecond: 20, fitDuration: true, loop: false, removeOnComplete: true }),
    configureElement({ document, element }) {
      element.dataset.spriteTheme = theme;
      element.dataset.spriteRole = role;
      element.dataset.spriteTier = level >= 7 ? "epic" : level >= 3 ? "tier" : "lesser";
      const grid = getSpellSpriteTier(level);
      element.dataset.spriteColumns = String(grid.columns);
      element.dataset.spriteRows = String(grid.rows);
      element.dataset.spriteFrames = String(grid.frameCount);
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
  [0, 3, 7].flatMap(level => Object.keys(level === 0 ? LESSER_SPRITE_ASSETS
    : level === 3 ? TIER_SPRITE_ASSETS : EPIC_SPRITE_ASSETS)
    .flatMap(theme => ["flight", "beam", "burst", "cloud", "cone",
      ...(level === 7 && ["psychic", "force", "radiant"].includes(theme) ? ["rune", "portal"] : [])]
      .map(role => sheet(theme, role, level))))
);

export function getTierSpritePaths(effectIds = []) {
  const ids = new Set(effectIds);
  return [...new Set(TIER_EFFECT_DEFINITIONS.filter(effect => ids.has(effect.id))
    .map(effect => effect.sprite.src))];
}
