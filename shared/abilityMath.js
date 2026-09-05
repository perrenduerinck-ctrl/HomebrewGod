export function calculateAbilityModifier(score) {
  const numeric = Number(score);
  const normalized = Number.isFinite(numeric)
    ? numeric
    : 10;
  return Math.floor((normalized - 10) / 2);
}
