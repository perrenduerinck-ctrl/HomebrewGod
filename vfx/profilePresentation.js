// Visual roles, independent of spell rules and of legacy sprite sheet tiers.
export const FAMILY_PRESENTATION = Object.freeze({
  "projectile-impact": { preset: "impact", travel: "projectile", maximumScale: 2.4 },
  "target-impact": { preset: "impact", maximumScale: 2.4 },
  beam: { preset: "impact", travel: "beam", maximumScale: 1.5 },
  line: { preset: "impact", travel: "beam", maximumScale: 1.5 },
  cone: { preset: "impact", travel: "impact", maximumScale: 2 },
  burst: { preset: "explosion", maximumScale: 2.4 },
  "ground-effect": { preset: "ground-effect", maximumScale: 3 },
  aura: { preset: "aura", maximumScale: 1.5 },
  self: { preset: "attached", maximumScale: 1.5 },
  touch: { preset: "attached", maximumScale: 1.4 },
  "weapon-strike": { preset: "impact", maximumScale: 1.5 },
  "utility-glyph": { preset: "attached", maximumScale: 1.4 },
  "utility-hand": { preset: "attached", maximumScale: 1.4 },
  "utility-ripple": { preset: "ground", maximumScale: 1.6 },
  weather: { preset: "weather", maximumScale: 3 }
});

export function profileEffectPresentation(profile, type, anchor, event = {}) {
  const family = FAMILY_PRESENTATION[profile.family] || FAMILY_PRESENTATION["target-impact"];
  const tokenId = anchor === "caster" ? event.casterTokenId : event.affectedTokens?.[0]?.id;
  let preset = anchor === "path" ? family.travel || "beam" : family.preset;
  if (["profile-ground", "storm-frost", "fire-scorch"].includes(type)) preset = "ground";
  else if (["profile-weather", "storm-cloud", "storm-hail"].includes(type)) preset = "overhead";
  else if (type.startsWith("status-")) preset = "attached-status";
  else if (anchor === "caster" && profile.family !== "self") preset = "attached";
  if (profile.family === "utility-ripple" && tokenId && !type.includes("ground")) preset = "attached";
  const layer = ["ground", "ground-effect"].includes(preset) ? "ground"
    : ["weather", "overhead"].includes(preset) ? "overhead" : "airborne";
  return { preset, layer,
    ...(tokenId && ["aura", "attached", "attached-status"].includes(preset)
      ? { attachment: { tokenId, position: "centered" } } : {}),
    ...(preset === "beam" ? { motion: { type: "stationary" } } : {}) };
}
