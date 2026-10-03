import { getMonsterMathRecommendations } from "./monsterMath.js";

function signed(value) {
  return Number(value) >= 0 ? `+${Number(value)}` : String(Number(value));
}

export function createMonsterMathPanel({ root } = {}) {
  if (!root) return null;
  const document = root.ownerDocument || globalThis.document;

  function render(monster = {}) {
    const guidance = getMonsterMathRecommendations(monster);
    root.replaceChildren();
    root.className = "monster-advanced-card monster-math-panel";
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = `CR ${monster.cr || "0"} Balance Guidance`;
    const note = document.createElement("p");
    note.textContent = "Recommendations only — your monster values are never changed.";
    const grid = document.createElement("dl");
    grid.className = "monster-math-grid";
    const rows = [
      ["Proficiency", signed(guidance.proficiencyBonus)],
      ["Suggested HP", `${guidance.averageHp} (${guidance.hpRange[0]}–${guidance.hpRange[1]})`],
      ["Expected Attack", signed(guidance.expectedAttackBonus)],
      ["Expected Save DC", String(guidance.expectedSaveDc)],
      ["Damage / Round", `${guidance.expectedDamageRange[0]}–${guidance.expectedDamageRange[1]}`],
      ["Suggested Saves", Object.entries(guidance.saveModifiers).map(([key, value]) => `${key.toUpperCase()} ${signed(value)}`).join(" · ")]
    ];
    for (const [label, value] of rows) {
      const term = document.createElement("dt");
      term.textContent = label;
      const description = document.createElement("dd");
      description.textContent = value;
      grid.append(term, description);
    }
    details.append(summary, note, grid);
    root.append(details);
    return guidance;
  }

  return Object.freeze({ render });
}
