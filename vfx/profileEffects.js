import { getDamageTypeVisual } from "./damageTypes/index.js";

const PALETTES = Object.freeze({
  arcane: "#b9a0ff", nature: "#99e780", verdant: "#57ff8d", earth: "#d7a675",
  water: "#73dfff", wind: "#b6edf5", rose: "#fba3cf", healing: "#a3ffe4"
});
// Code-native vector accents are intentionally small. No image downloads or
// generated bitmap assets are required for utility spells.
const GLYPHS = Object.freeze({
  rune: "M32 5 54 18 54 46 32 59 10 46 10 18Z M32 14V50 M19 23 45 41 M45 23 19 41",
  shield: "M32 5 53 13V30Q53 48 32 59Q11 48 11 30V13Z M21 31 29 39 44 23",
  star: "M32 5 38 24 58 32 38 39 32 59 25 39 6 32 25 24Z",
  heart: "M32 54C4 38 3 14 19 12Q28 10 32 21Q36 10 45 12C61 14 60 38 32 54Z",
  repair: "M27 8 20 24 31 32 22 43 27 56 M37 8 32 24 43 32 34 43 37 56 M11 32H20 M46 32H55",
  voice: "M8 25H19L33 13V51L19 39H8Z M41 22Q51 32 41 42 M48 14Q64 32 48 50",
  bell: "M17 43V28Q17 11 32 11Q47 11 47 28V43L54 48H10Z M26 53Q32 62 38 53 M32 5V11",
  staff: "M24 57 40 7 M33 14Q19 5 19 19Q20 29 35 24 M27 44 41 36",
  target: "M32 3V17 M32 47V61 M3 32H17 M47 32H61 M32 13A19 19 0 1 0 32 51A19 19 0 1 0 32 13 M28 32H36",
  blade: "M12 52 42 10 52 6 52 17 20 56Z M10 41 29 57",
  claw: "M12 8Q34 31 14 57 M29 6Q51 31 31 58 M46 8Q64 31 49 55",
  lock: "M17 29V21Q17 7 32 7Q47 7 47 21V29 M12 29H52V57H12Z M32 38A5 5 0 1 0 32 48A5 5 0 1 0 32 38 M32 47V52",
  eye: "M4 32Q16 13 32 13Q48 13 60 32Q48 51 32 51Q16 51 4 32Z M32 21A11 11 0 1 0 32 43A11 11 0 1 0 32 21 M32 28A4 4 0 1 0 32 36A4 4 0 1 0 32 28",
  chain: "M23 39 17 45Q9 53 3 47Q-3 41 5 33L12 26Q20 18 27 25 M37 39Q44 46 52 38L59 31Q67 23 61 17Q55 11 47 19L41 25 M20 44 44 20",
  portal: "M32 5A27 27 0 1 0 32 59A27 27 0 1 0 32 5 M32 14A18 18 0 1 1 19 45Q39 51 46 32Q42 18 32 14Z M32 24A8 8 0 1 0 32 40A8 8 0 1 0 32 24",
  web: "M32 4V60 M4 32H60 M12 12 52 52 M52 12 12 52 M32 14Q45 14 50 32Q45 50 32 50Q14 45 14 32Q14 14 32 14 M32 23Q41 23 41 32Q41 41 32 41Q23 41 23 32Q23 23 32 23",
  skull: "M13 30Q13 9 32 7Q51 9 51 30Q51 43 43 48V58H36V49H28V58H21V48Q13 43 13 30Z M22 28A5 6 0 1 0 22 40A5 6 0 1 0 22 28 M42 28A5 6 0 1 0 42 40A5 6 0 1 0 42 28 M28 44 32 39 36 44",
  cancel: "M32 5A27 27 0 1 0 32 59A27 27 0 1 0 32 5 M13 13 51 51",
  ward: "M32 4 39 23 60 24 44 37 50 58 32 46 14 58 20 37 4 24 25 23Z M32 17V42 M20 31H44",
  spiral: "M32 31Q42 19 49 30Q56 43 42 51Q24 61 11 47Q-2 32 11 16Q28 -3 48 9Q65 19 61 39",
  horse: "M13 55 17 36 12 23 24 8 45 12 53 27 44 35 47 55H38L35 39H24L22 55Z M25 18 30 24 M42 21H43",
  waves: "M5 20Q16 9 27 20Q38 31 59 16 M5 34Q16 23 27 34Q38 45 59 30 M5 48Q16 37 27 48Q38 59 59 44",
  elements: "M32 5 38 17 32 25 26 17Z M8 28 21 28 21 41 8 41Z M43 27A8 8 0 1 0 43 43A8 8 0 1 0 43 27 M25 50 32 42 39 50 32 59Z",
  paw: "M32 29Q46 29 50 43Q53 56 40 57Q32 53 24 57Q11 56 14 43Q18 29 32 29Z M12 18A6 8 0 1 0 12 34A6 8 0 1 0 12 18 M26 8A6 9 0 1 0 26 26A6 9 0 1 0 26 8 M42 8A6 9 0 1 0 42 26A6 9 0 1 0 42 8 M55 18A6 8 0 1 0 55 34A6 8 0 1 0 55 18",
  chest: "M8 27H56V57H8Z M12 13Q32 4 52 13L56 27H8Z M27 33H37V47H27Z M32 33V47",
  objects: "M7 11H25V29H7Z M39 7 57 16 48 34 30 25Z M10 39 28 34 35 53 17 59Z M40 41H57V58H40Z",
  tree: "M29 58V38H21L13 30 20 20 19 11 30 4 38 12 47 13 51 25 45 36H36V58Z M21 58H45",
  book: "M7 12Q21 8 31 17V56Q21 47 7 51Z M57 12Q43 8 33 17V56Q43 47 57 51Z M32 17V56",
  mind: "M15 47Q5 35 13 25Q10 11 25 10Q33 0 42 11Q57 12 52 27Q61 39 49 48Q39 61 28 52Q19 58 15 47Z M22 21Q33 13 42 22 M20 32Q32 24 45 33 M24 43Q33 36 41 43",
  wings: "M31 34Q20 9 4 12Q5 34 26 41 M33 34Q44 9 60 12Q59 34 38 41 M29 31Q32 25 35 31V55H29Z",
  path: "M7 52Q17 37 28 43Q41 50 55 28 M47 28H55V36 M10 56H23 M31 56H45 M32 8 38 20 32 27 26 20Z",
  feast: "M9 31Q32 51 55 31Q52 56 32 58Q12 56 9 31Z M6 27H58 M18 18Q21 8 25 18 M31 18Q34 5 37 18 M44 18Q47 8 51 18",
  music: "M20 11V45Q12 39 7 45Q3 52 12 56Q22 57 25 48V22L50 17V39Q42 33 37 39Q33 46 42 50Q52 51 55 42V6Z",
  jar: "M19 7H45V15L50 24V52Q50 59 43 59H21Q14 59 14 52V24L19 15Z M19 18H45 M17 30Q32 24 47 30 M24 7V3H40V7",
  door: "M13 58V18Q13 5 32 5Q51 5 51 18V58Z M21 58V20Q21 13 32 13Q43 13 43 20V58 M36 35A2 2 0 1 0 36 39A2 2 0 1 0 36 35 M8 58H56",
  mirror: "M32 4Q49 4 52 32Q49 60 32 60Q15 60 12 32Q15 4 32 4Z M32 12Q23 18 21 33Q23 48 32 52 M38 15Q46 23 45 34Q44 42 39 48",
  twins: "M22 9A9 9 0 1 0 22 27A9 9 0 1 0 22 9 M42 9A9 9 0 1 0 42 27A9 9 0 1 0 42 9 M6 57Q8 34 22 34Q31 35 32 46Q33 35 42 34Q56 34 58 57Z",
  magnet: "M10 8V37Q10 56 32 56Q54 56 54 37V8H42V37Q42 44 32 44Q22 44 22 37V8Z M10 18H22 M42 18H54",
  astral: "M32 4 38 23 58 31 38 39 32 59 25 39 6 31 25 23Z M9 55Q25 45 41 52Q51 56 59 45",
  transmute: "M14 21Q22 8 39 10L48 4V20L39 14Q25 12 19 25 M50 43Q42 56 25 54L16 60V44L25 50Q39 52 45 39 M24 28 32 20 40 28 32 36Z"
});
const HAND = "M18 36V17Q18 11 23 13V30 9Q23 3 28 7V29 5Q28 0 33 5V29 10Q33 5 38 10V31 18Q38 13 43 18V39L49 33Q55 29 57 35L45 55Q41 61 31 61Q21 61 16 51L7 34Q5 29 10 28Q13 28 18 36Z";
const LEAF = "M9 53Q1 14 55 8Q60 54 9 53Z M9 53 46 18 M23 39V24 M34 29H45";

function appendGlyph(document, element, path) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 64 64");
  svg.setAttribute("class", "hg-profile-glyph");
  const node = document.createElementNS("http://www.w3.org/2000/svg", "path");
  node.setAttribute("d", path);
  svg.appendChild(node);
  element.appendChild(svg);
}

function procedural(name, { path = null, count = 0, blendMode = "" } = {}) {
  return Object.freeze({
    id: `profile-${name}`, kind: "procedural", className: `profile-${name}`,
    ...(blendMode ? { blendMode } : {}),
    particles: { count: 0 },
    configureElement({ document, element, effect }) {
      const palette = effect.metadata.palette;
      const color = PALETTES[palette] || getDamageTypeVisual(palette)?.palette.primary || PALETTES.arcane;
      element.classList.add("hg-vfx-profile");
      element.style.setProperty("--hg-profile-color", color);
      element.dataset.profileId = effect.metadata.profileId || "";
      element.dataset.vfxFamily = effect.metadata.family || "";
      element.dataset.variant = effect.metadata.variant || "rune";
      if (path || name === "glyph") appendGlyph(document, element,
        path || GLYPHS[effect.metadata.variant] || GLYPHS.rune);
      for (let i = 0; i < count; i++) {
        const child = document.createElement("i");
        child.style.setProperty("--hg-profile-index", i);
        child.style.setProperty("--hg-profile-count", count);
        element.appendChild(child);
      }
    }
  });
}

export const PROFILE_EFFECT_DEFINITIONS = Object.freeze([
  ...["orb", "message", "beam", "cone", "splash", "mist", "ripple", "glyph",
    "sparkles", "slash", "ground", "shimmer", "glow", "shard", "wind", "rays"].map((name) => procedural(name)),
  procedural("fire-wall", { blendMode: "screen" }),
  procedural("force-wall", { blendMode: "screen" }),
  procedural("stone-wall"),
  procedural("blade-wall", { blendMode: "screen" }),
  procedural("ice-wall", { blendMode: "screen" }),
  procedural("thorn-wall"),
  procedural("prismatic-cone", { blendMode: "screen" }),
  procedural("prismatic-wall", { blendMode: "screen" }),
  procedural("weather", { blendMode: "screen" }),
  procedural("hand", { path: HAND }), procedural("leaves", { path: LEAF }),
  procedural("swarm", { count: 8 }), procedural("lights", { count: 4 }),
  procedural("stones", { count: 3 }), procedural("blades", { count: 6 })
]);
