// Organization and authoring defaults only. All families use the same player.
export const ANIMATION_FAMILIES = Object.freeze(["melee", "ranged", "magic"]);
export const MAGIC_SUBTYPES = Object.freeze(["cast", "projectile", "beam", "impact", "area", "aura", "healing", "buff", "debuff", "summoning", "transformation", "sustain", "end", "custom"]);
export function inferAnimationFamily(animation = {}) {
  if (ANIMATION_FAMILIES.includes(animation.family)) return animation.family;
  const words = `${animation.type || ""} ${animation.category || ""} ${(Array.isArray(animation.tags) ? animation.tags : [animation.tags || ""]).join(" ")}`.toLowerCase();
  if (/\b(magic|spell|healing|buff|debuff|aura)\b/.test(words)) return "magic";
  if (/\b(bow|arrow|crossbow|javelin|sling|gun|ranged|thrown)\b/.test(words)) return "ranged";
  if (animation.behavior === "melee" || /\b(melee|sword|axe|hammer|dagger|claw|bite|tail|unarmed|spear)\b/.test(words)) return "melee";
  return "magic";
}
export function inferMagicSubtype(animation = {}) {
  if (MAGIC_SUBTYPES.includes(animation.style)) return animation.style;
  if (MAGIC_SUBTYPES.includes(animation.subtype)) return animation.subtype;
  const words = `${animation.type || ""} ${animation.behavior || ""} ${(animation.tags || []).join?.(" ") || animation.tags || ""}`.toLowerCase();
  for (const [pattern, subtype] of [[/summon/, "summoning"], [/persistent|sustain/, "sustain"], [/ground|area|environment/, "area"], [/explosion|impact/, "impact"], [/cast/, "cast"]]) if (pattern.test(words)) return subtype;
  return MAGIC_SUBTYPES.find(type => type !== "custom" && words.includes(type)) || "custom";
}
const meleeNames = ["Sword Slash", "Sword Stab", "Spear Thrust", "Axe Swing", "Hammer Swing", "Dagger Stab", "Claw", "Bite", "Tail", "Unarmed", "Custom Melee"];
const rangedNames = ["Bow", "Crossbow", "Thrown Knife", "Thrown Axe", "Spear / Javelin", "Sling", "Gun / Future Projectile", "Custom Projectile"];
const magicNames = ["Cast", "Projectile", "Beam", "Impact", "Area", "Aura", "Healing", "Buff", "Debuff", "Summon", "Transformation", "Sustain", "End", "Custom"];
const key = name => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "");
export const FAMILY_TEMPLATES = Object.freeze([
  ...meleeNames.map(name => ({ id: "melee-" + key(name), name, family: "melee", style: key(name), type: "Melee Attack", subtype: "", behavior: "melee", tags: [name.split(" ")[0].toLowerCase(), "melee", "weapon"], direction: { mode: "face-target" }, placement: { spawnAt: "source-toward-target", followSource: true, followTarget: false, persist: false, duration: 0 } })),
  ...rangedNames.map(name => ({ id: "ranged-" + key(name), name, family: "ranged", style: key(name), type: "Projectile", subtype: "", behavior: "projectile", tags: [name.split(" ")[0].toLowerCase(), "ranged", "weapon"], direction: { mode: "face-target" }, placement: { spawnAt: "source-to-target", followSource: false, followTarget: false, persist: false, duration: 0 }, projectile: { speed: 300, startOffset: 0, endOffset: 0, arcHeight: 0 } })),
  ...MAGIC_SUBTYPES.map((subtype, index) => {
    const behavior = ({ cast: "source-effect", projectile: "projectile", beam: "beam", area: "ground", aura: "aura", summoning: "summon", sustain: "attached" })[subtype] || "target-effect";
    return { id: "magic-" + subtype, name: magicNames[index], family: "magic", style: subtype, subtype, type: ({ cast: "Spell Effect", projectile: "Projectile", beam: "Beam", impact: "Explosion", area: "Environment", aura: "Aura", healing: "Healing", buff: "Buff", debuff: "Debuff", summoning: "Summoning", transformation: "Transformation", sustain: "Persistent Effect", end: "Spell Effect", custom: "Spell Effect" })[subtype], behavior, tags: ["magic"], direction: { mode: "face-target" }, placement: { spawnAt: subtype === "cast" || subtype === "aura" ? "source" : subtype === "projectile" ? "source-to-target" : subtype === "beam" ? "between" : "target", followSource: subtype === "aura", followTarget: subtype === "sustain", persist: subtype === "sustain", duration: 0 }, ...(subtype === "sustain" || subtype === "aura" ? { playback: "loop", timing: { loopCount: 0 } } : {}) };
  })
]);
export const getFamilyTemplates = family => FAMILY_TEMPLATES.filter(template => template.family === family);
export const getAnimationStyles = family => getFamilyTemplates(family).map(template => Object.freeze({
  value: template.style,
  label: template.name,
  type: template.type
}));

export function inferAnimationStyle(animation = {}, family = inferAnimationFamily(animation)) {
  const styles = getAnimationStyles(family);
  if (styles.some(style => style.value === animation.style)) return animation.style;
  if (family === "magic") return inferMagicSubtype(animation);
  const words = `${animation.name || ""} ${animation.type || ""} ${animation.category || ""} ${(Array.isArray(animation.tags) ? animation.tags : [animation.tags || ""]).join(" ")}`.toLowerCase();
  const patterns = family === "melee"
    ? [[/\bsword\b.*\b(slash|swing)\b|\bslash\b.*\bsword\b/, "sword-slash"], [/\bsword\b.*\b(stab|thrust)\b/, "sword-stab"], [/\bspear\b|\bjavelin\b/, "spear-thrust"], [/\baxe\b/, "axe-swing"], [/\bhammer\b|\bmace\b/, "hammer-swing"], [/\bdagger\b|\bknife\b/, "dagger-stab"], [/\bclaw\b/, "claw"], [/\bbite\b/, "bite"], [/\btail\b/, "tail"], [/\bunarmed\b|\bpunch\b|\bkick\b/, "unarmed"]]
    : [[/\bcrossbow\b/, "crossbow"], [/\bbow\b|\barrow\b/, "bow"], [/\bknife\b|\bdagger\b/, "thrown-knife"], [/\baxe\b/, "thrown-axe"], [/\bspear\b|\bjavelin\b/, "spear-javelin"], [/\bsling\b/, "sling"], [/\bgun\b|\bfirearm\b/, "gun-future-projectile"]];
  return patterns.find(([pattern]) => pattern.test(words))?.[1] || (family === "melee" ? "custom-melee" : "custom-projectile");
}

export function deriveAnimationType(family, style, fallback = "Other") {
  return getFamilyTemplates(family).find(template => template.style === style)?.type || fallback;
}

export function getAnimationStyleLabel(animation = {}) {
  const family = inferAnimationFamily(animation);
  const style = inferAnimationStyle(animation, family);
  return getAnimationStyles(family).find(option => option.value === style)?.label || style.replaceAll("-", " ").replace(/\b\w/g, letter => letter.toUpperCase());
}
