export const MONSTER_ABILITY_KEYS = Object.freeze(["str", "dex", "con", "int", "wis", "cha"]);

export const MONSTER_ABILITY_LABELS = Object.freeze({
  str: "STR",
  dex: "DEX",
  con: "CON",
  int: "INT",
  wis: "WIS",
  cha: "CHA"
});

export function monsterAbilityModifier(score) {
  const numeric = Number(score);
  return Math.floor(((Number.isFinite(numeric) ? numeric : 10) - 10) / 2);
}

export function formatMonsterModifier(score) {
  const modifier = monsterAbilityModifier(score);
  return modifier >= 0 ? `+${modifier}` : String(modifier);
}

const CR_GUIDANCE = Object.freeze({
  0: [1, 6, 0, 1, 3, 13],
  0.125: [7, 35, 2, 3, 3, 13],
  0.25: [36, 49, 4, 5, 3, 13],
  0.5: [50, 70, 6, 8, 3, 13],
  1: [71, 85, 9, 14, 3, 13],
  2: [86, 100, 15, 20, 3, 13],
  3: [101, 115, 21, 26, 4, 13],
  4: [116, 130, 27, 32, 5, 14],
  5: [131, 145, 33, 38, 6, 15],
  6: [146, 160, 39, 44, 6, 15],
  7: [161, 175, 45, 50, 6, 15],
  8: [176, 190, 51, 56, 7, 16],
  9: [191, 205, 57, 62, 7, 16],
  10: [206, 220, 63, 68, 7, 16],
  11: [221, 235, 69, 74, 8, 17],
  12: [236, 250, 75, 80, 8, 17],
  13: [251, 265, 81, 86, 8, 18],
  14: [266, 280, 87, 92, 8, 18],
  15: [281, 295, 93, 98, 8, 18],
  16: [296, 310, 99, 104, 9, 18],
  17: [311, 325, 105, 110, 10, 19],
  18: [326, 340, 111, 116, 10, 19],
  19: [341, 355, 117, 122, 10, 19],
  20: [356, 400, 123, 140, 10, 19],
  21: [401, 445, 141, 158, 11, 20],
  22: [446, 490, 159, 176, 11, 20],
  23: [491, 535, 177, 194, 11, 20],
  24: [536, 580, 195, 212, 12, 21],
  25: [581, 625, 213, 230, 12, 21],
  26: [626, 670, 231, 248, 12, 21],
  27: [671, 715, 249, 266, 13, 22],
  28: [716, 760, 267, 284, 13, 22],
  29: [761, 805, 285, 302, 13, 22],
  30: [806, 850, 303, 320, 14, 23]
});

export function parseMonsterChallengeRating(value) {
  const source = String(value ?? "0").trim();
  if (/^\d+\s*\/\s*\d+$/.test(source)) {
    const [top, bottom] = source.split("/").map(Number);
    return bottom ? top / bottom : 0;
  }
  const number = Number(source);
  return Math.max(0, Math.min(30, Number.isFinite(number) ? number : 0));
}

export function monsterProficiencyBonus(challengeRating) {
  const cr = parseMonsterChallengeRating(challengeRating);
  if (cr <= 4) return 2;
  return Math.min(9, 2 + Math.ceil((cr - 4) / 4));
}

function nearestGuidance(cr) {
  const keys = Object.keys(CR_GUIDANCE).map(Number).sort((a, b) => a - b);
  const key = keys.reduce((best, candidate) => (
    Math.abs(candidate - cr) < Math.abs(best - cr) ? candidate : best
  ), keys[0]);
  return CR_GUIDANCE[key];
}

export function getMonsterMathRecommendations(monster = {}) {
  const cr = parseMonsterChallengeRating(monster.cr);
  const [hpMin, hpMax, damageMin, damageMax, attackBonus, saveDc] = nearestGuidance(cr);
  const proficiencyBonus = monsterProficiencyBonus(cr);
  const abilities = monster.abilities || {};
  return {
    challengeRating: cr,
    proficiencyBonus,
    averageHp: Math.round((hpMin + hpMax) / 2),
    hpRange: [hpMin, hpMax],
    expectedAttackBonus: attackBonus,
    expectedSaveDc: saveDc,
    expectedDamageRange: [damageMin, damageMax],
    abilityModifiers: Object.fromEntries(MONSTER_ABILITY_KEYS.map((key) => [key, monsterAbilityModifier(abilities[key])])),
    saveModifiers: Object.fromEntries(MONSTER_ABILITY_KEYS.map((key) => [key, monsterAbilityModifier(abilities[key]) + proficiencyBonus]))
  };
}
