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
