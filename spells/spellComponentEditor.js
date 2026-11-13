const copy = (value) => JSON.parse(JSON.stringify(value));
const TYPES = ["", "Acid", "Bludgeoning", "Cold", "Fire", "Force", "Lightning", "Necrotic", "Piercing", "Poison", "Psychic", "Radiant", "Slashing", "Thunder"];

// Edits supported fields in each record while retaining unknown mechanics.
export function createSpellComponentEditor({ root, kind = "damage", onChange = () => {} }) {
  const document = root.ownerDocument;
  let records = [];
  function field(labelText, input) {
    const label = document.createElement("label");
    label.append(document.createTextNode(labelText), input);
    return label;
  }
  function render() {
    root.replaceChildren();
    records.forEach((record, index) => {
      const card = document.createElement("fieldset");
      card.dataset.spellComponent = `${kind}:${index}`;
      const legend = document.createElement("legend");
      legend.textContent = `Additional ${kind} ${index + 1}`;
      const dice = document.createElement("input");
      dice.value = record.dice || record.amount || "";
      dice.dataset.componentDice = "true";
      dice.addEventListener("input", () => { records[index] = { ...records[index], dice: dice.value }; onChange(); });
      card.append(legend, field("Dice or amount", dice));
      if (kind === "damage") {
        const type = document.createElement("select");
        for (const value of [...new Set([...TYPES, record.damageType || record.type || ""])]) {
          const option = document.createElement("option"); option.value = value; option.textContent = value || "None"; type.append(option);
        }
        type.value = record.damageType || record.type || "";
        type.addEventListener("change", () => { records[index].damageType = type.value; onChange(); });
        card.append(field("Damage type", type));
      }
      for (const [key, label, defaults] of [["atSlotLevel", "Slot scaling", [1,2,3,4,5,6,7,8,9]], ...(kind === "damage" ? [["atCharacterLevel", "Character scaling", [5,11,17]]] : [])]) {
        const details = document.createElement("details");
        const summary = document.createElement("summary"); summary.textContent = label; details.append(summary);
        for (const level of [...new Set([...defaults, ...Object.keys(record[key] || {}).map(Number)])].sort((a, b) => a-b)) {
          const formula = document.createElement("input"); formula.value = record[key]?.[level] || "";
          formula.dataset.componentScaling = `${key}:${level}`;
          formula.addEventListener("input", () => {
            records[index][key] = { ...(records[index][key] || {}) };
            if (formula.value.trim()) records[index][key][level] = formula.value.trim(); else delete records[index][key][level];
            onChange();
          });
          details.append(field(`Level ${level}`, formula));
        }
        card.append(details);
      }
      const remove = document.createElement("button"); remove.type = "button"; remove.textContent = `Remove additional ${kind} ${index + 1}`;
      remove.addEventListener("click", () => { records.splice(index, 1); render(); onChange(); root.dispatchEvent(new Event("input", { bubbles: true })); });
      card.append(remove); root.append(card);
    });
    const add = document.createElement("button"); add.type = "button"; add.textContent = `Add ${kind} component`;
    add.addEventListener("click", () => { records.push({ dice: "1d6", ...(kind === "damage" ? { damageType: "Force" } : {}) }); render(); onChange(); root.dispatchEvent(new Event("input", { bubbles: true })); });
    root.append(add);
  }
  render();
  return { read: () => copy(records), write(value = []) { records = copy(value); render(); } };
}
