const text = (value, fallback = "") => String(value ?? "").trim() || fallback;

export const MONSTER_ATTACK_TYPES = Object.freeze([
  "Melee Weapon Attack",
  "Ranged Weapon Attack",
  "Melee or Ranged Weapon Attack",
  "Spell Attack",
  "Save-Based",
  "Automatic"
]);

export const MONSTER_DAMAGE_TYPES = Object.freeze([
  "acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic",
  "piercing", "poison", "psychic", "radiant", "slashing", "thunder"
]);

export const MONSTER_SAVE_ABILITIES = Object.freeze(["STR", "DEX", "CON", "INT", "WIS", "CHA"]);

function numberOrBlank(value) {
  if (value === "" || value == null) return "";
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : "";
}

export function normalizeMonsterAttack(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const type = MONSTER_ATTACK_TYPES.includes(value.type) ? value.type : "Melee Weapon Attack";
  return {
    type,
    attackBonus: numberOrBlank(value.attackBonus),
    reach: text(value.reach),
    range: text(value.range),
    targetCount: Math.max(1, Math.round(Number(value.targetCount) || 1)),
    damageDice: text(value.damageDice),
    damageBonus: numberOrBlank(value.damageBonus),
    damageType: MONSTER_DAMAGE_TYPES.includes(text(value.damageType).toLowerCase())
      ? text(value.damageType).toLowerCase()
      : text(value.damageType),
    secondaryDamage: text(value.secondaryDamage),
    saveAbility: MONSTER_SAVE_ABILITIES.includes(text(value.saveAbility).toUpperCase())
      ? text(value.saveAbility).toUpperCase()
      : "DEX",
    saveDc: numberOrBlank(value.saveDc),
    halfDamage: Boolean(value.halfDamage),
    autoDescription: Boolean(value.autoDescription),
    recharge: text(value.recharge),
    legendaryCost: Math.max(0, Math.round(Number(value.legendaryCost) || 0))
  };
}

function signed(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "+0";
  return numeric >= 0 ? `+${numeric}` : String(numeric);
}

function damageText(attack) {
  const dice = text(attack.damageDice);
  const bonus = Number(attack.damageBonus);
  const hasBonus = attack.damageBonus !== "" && Number.isFinite(bonus) && bonus !== 0;
  const formula = `${dice}${hasBonus ? ` ${bonus >= 0 ? "+" : "−"} ${Math.abs(bonus)}` : ""}`.trim();
  if (!formula) return "";
  return `${formula}${attack.damageType ? ` ${attack.damageType}` : ""} damage`;
}

export function buildMonsterAttackDescription(value) {
  const attack = normalizeMonsterAttack(value) || normalizeMonsterAttack({});
  const targets = `${attack.targetCount} target${attack.targetCount === 1 ? "" : "s"}`;
  const primaryDamage = damageText(attack);
  const secondary = attack.secondaryDamage
    ? `${primaryDamage ? ", plus " : ""}${attack.secondaryDamage}`
    : "";

  if (attack.type === "Save-Based") {
    const save = `DC ${attack.saveDc || 10} ${attack.saveAbility} saving throw`;
    const result = primaryDamage
      ? `${primaryDamage}${secondary}${attack.halfDamage ? " on a failed save, or half as much damage on a successful one" : " on a failed save"}`
      : `the effect described below${attack.halfDamage ? ", with half effect on a successful save" : ""}`;
    return `${targets.charAt(0).toUpperCase() + targets.slice(1)} must make a ${save}, taking ${result}.`;
  }

  if (attack.type === "Automatic") {
    const effect = `${primaryDamage}${secondary}` || "the described effect";
    return `${targets.charAt(0).toUpperCase() + targets.slice(1)} automatically takes ${effect}.`;
  }

  const attackLabel = attack.type === "Spell Attack"
    ? "Spell Attack"
    : attack.type;
  const placement = [
    attack.reach ? `reach ${attack.reach}` : "",
    attack.range ? `range ${attack.range}` : ""
  ].filter(Boolean).join(" or ");
  const hit = `${attackLabel}: ${signed(attack.attackBonus)} to hit${placement ? `, ${placement}` : ""}, ${targets}.`;
  const result = `${primaryDamage}${secondary}`;
  return result ? `${hit} Hit: ${result}.` : hit;
}

function option(document, value, label = value) {
  const element = document.createElement("option");
  element.value = value;
  element.textContent = label;
  return element;
}

function field(document, labelText, control) {
  const label = document.createElement("label");
  label.className = "monster-attack-field";
  const caption = document.createElement("span");
  caption.textContent = labelText;
  label.append(caption, control);
  return label;
}

function input(document, name, value, type = "text") {
  const control = document.createElement("input");
  control.type = type;
  control.dataset.attackField = name;
  if (type === "checkbox") control.checked = Boolean(value);
  else control.value = value ?? "";
  return control;
}

function select(document, name, values, selected) {
  const control = document.createElement("select");
  control.dataset.attackField = name;
  control.append(...values.map((value) => option(document, value)));
  control.value = selected;
  return control;
}

export function createMonsterAttackBuilder({ document, entry, disabled = false, hasAnimation = false } = {}) {
  const attack = normalizeMonsterAttack(entry?.attack) || normalizeMonsterAttack({});
  const details = document.createElement("details");
  details.className = "monster-attack-builder";
  details.dataset.attackBuilder = "true";
  if (entry?.attack) details.open = true;

  const summary = document.createElement("summary");
  summary.textContent = entry?.attack ? "Structured Attack" : "Add Structured Attack";
  const grid = document.createElement("div");
  grid.className = "monster-attack-grid";

  const controls = [
    field(document, "Attack Type", select(document, "type", MONSTER_ATTACK_TYPES, attack.type)),
    field(document, "Attack Bonus", input(document, "attackBonus", attack.attackBonus, "number")),
    field(document, "Reach", input(document, "reach", attack.reach)),
    field(document, "Range", input(document, "range", attack.range)),
    field(document, "Target Count", input(document, "targetCount", attack.targetCount, "number")),
    field(document, "Damage Dice", input(document, "damageDice", attack.damageDice)),
    field(document, "Damage Bonus", input(document, "damageBonus", attack.damageBonus, "number")),
    field(document, "Damage Type", select(document, "damageType", ["", ...MONSTER_DAMAGE_TYPES], attack.damageType)),
    field(document, "Secondary Damage", input(document, "secondaryDamage", attack.secondaryDamage)),
    field(document, "Save Ability", select(document, "saveAbility", MONSTER_SAVE_ABILITIES, attack.saveAbility)),
    field(document, "Save DC", input(document, "saveDc", attack.saveDc, "number")),
    field(document, "Recharge (for example 5–6)", input(document, "recharge", attack.recharge)),
    field(document, "Legendary Action Cost", input(document, "legendaryCost", attack.legendaryCost, "number"))
  ];
  const halfDamage = input(document, "halfDamage", attack.halfDamage, "checkbox");
  const halfLabel = field(document, "Half Damage on Save", halfDamage);
  halfLabel.classList.add("monster-check-field");
  controls.push(halfLabel);
  controls.forEach((control) => grid.append(control));

  const actions = document.createElement("div");
  actions.className = "monster-attack-actions";
  const generate = document.createElement("button");
  generate.type = "button";
  generate.dataset.attackAction = "generate";
  generate.textContent = attack.autoDescription ? "Regenerate Description" : "Generate Description";
  const animation = document.createElement("button");
  animation.type = "button";
  animation.dataset.attackAction = "animation";
  animation.textContent = hasAnimation ? "Edit Animation" : "Add Animation";
  const note = document.createElement("small");
  note.textContent = attack.autoDescription
    ? "Description follows these fields. Typing in Description switches back to manual text."
    : "Generate readable stat-block text, or keep editing Description manually.";
  actions.append(generate, animation, note);
  details.append(summary, grid, actions);
  details.querySelectorAll("input, select, button").forEach((control) => {
    control.disabled = disabled;
  });
  return details;
}
