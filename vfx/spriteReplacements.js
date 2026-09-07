import { resolveVfxClipDefinition } from "./assetVersions.js";

// Reviewed artwork is keyed by effect id, independent of spell level. Each
// entry owns its grid, phase window, FPS, blend mode, anchor and art angle.
// Unmapped effects retain their real legacy art.
const modern = (name, original, extra = {}) => Object.freeze({
  src: `./assets/vfx/modern6x6/${name}-6x6.png`, original: `./assets/vfx/${original}`,
  columns: 6, rows: 6, frameCount: 36, frameWidth: 160, frameHeight: 160,
  startFrame: 0, endFrame: 35, framesPerSecond: 24, blendMode: "normal",
  artAngle: 0, anchor: "impact-center", loop: false, fitDuration: true,
  removeOnComplete: true, ...extra
});

export const MODERN_SPRITE_ASSETS = Object.freeze({
  lightningImpact: modern("lightning-impact", "storms/lightning-impact.png"),
  lightningBolt: modern("lightning-bolt-main", "lightning/lightning-bolt-main-5x5.png", { artAngle: -135 }),
  meteorImpact: modern("meteor-impact", "library/meteor-impact.png", {
    anchor: "ground-contact",
    // This six-row sheet has taller eruption cells; measured gutters prevent slicing the plume.
    atlas: Object.freeze({ width: 1254, height: 1254, inset: 1,
      columns: Object.freeze([0,209,418,627,836,1045,1254]),
      rows: Object.freeze([0,228,470,685,902,1110,1254]) })
  }),
  ...Object.fromEntries(["cold", "acid", "poison", "necrotic"].map(theme =>
    [theme, modern(`${theme}-cast`, `tiers3-6/${theme}-cast-5x5.png`)]))
});

export const MODERN_SPRITE_REPLACEMENTS = Object.freeze({
  "storm-lightning-impact": MODERN_SPRITE_ASSETS.lightningImpact,
  "lightning5-main": MODERN_SPRITE_ASSETS.lightningBolt,
  ...Object.fromEntries(["cold", "acid", "poison", "necrotic"].flatMap(theme => {
    const impact = theme === "cold" ? 11 : 12;
    return ["flight", "beam", "burst", "cloud", "cone"].map(role => {
      const flight = role === "flight" || role === "beam";
      return [`tier-${theme}-${role}`, Object.freeze({ ...MODERN_SPRITE_ASSETS[theme],
        startFrame: role === "flight" ? 0 : role === "beam" ? 5 : role === "cloud" ? 18 : impact,
        endFrame: flight ? impact - 1 : 35,
        artAngle: flight ? -135 : 0, anchor: flight ? "projectile-center" : "impact-center"
      })];
    });
  }))
});

export function getVersionedSprite(effectId, legacy, replacements = MODERN_SPRITE_REPLACEMENTS) {
  return { preferred: "modern6x6", legacy, modern6x6: replacements[effectId] || null };
}

export function resolveSpriteReplacement(effectId, legacy, options = {}) {
  return resolveVfxClipDefinition(getVersionedSprite(effectId, legacy, options.replacements), options);
}
