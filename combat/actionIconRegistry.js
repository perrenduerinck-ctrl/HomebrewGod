const cleanText = (value) => String(value ?? "").trim();

const UNIVERSAL_ICONS = Object.freeze({
  move: "➤",
  dash: "➠",
  disengage: "↝",
  jump: "↥",
  shove: "↣",
  help: "✦",
  hide: "◒",
  dodge: "⬡",
  throw: "➶"
});

const KIND_ICONS = Object.freeze({
  weapon: "⚔",
  spell: "✧",
  ability: "◆",
  item: "◇",
  "monster-action": "⚔",
  "monster-bonus": "◆",
  "monster-reaction": "◈",
  universal: "◆"
});

const DAMAGE_ICONS = Object.freeze({
  acid: "◉",
  bludgeoning: "●",
  cold: "❄",
  fire: "✹",
  force: "✦",
  lightning: "ϟ",
  necrotic: "☠",
  piercing: "➶",
  poison: "☣",
  psychic: "◌",
  radiant: "☀",
  slashing: "⚔",
  thunder: "◍",
  healing: "✚"
});

const SCHOOL_ICONS = Object.freeze({
  abjuration: "⬡",
  conjuration: "◎",
  divination: "◉",
  enchantment: "◇",
  evocation: "✹",
  illusion: "◒",
  necromancy: "☠",
  transmutation: "△"
});

const WEAPON_ICONS = Object.freeze({
  bow: "➶",
  crossbow: "➶",
  sling: "◉",
  axe: "⚒",
  hammer: "⚒",
  mace: "⚒",
  sword: "⚔",
  dagger: "†",
  spear: "↟",
  staff: "⌇",
  wand: "✦",
  unarmed: "✊"
});

const ITEM_ICONS = Object.freeze({
  potion: "⚗",
  scroll: "▤",
  bomb: "✹",
  poison: "☣",
  food: "◒",
  tool: "⚒"
});

function normalize(value) {
  return cleanText(value).toLowerCase();
}

function includesKey(source, registry) {
  return Object.keys(registry).find((key) => source.includes(key)) || "";
}

export function validateCustomActionIcon(value) {
  const icon = cleanText(value);
  if (!icon || icon.length > 2048) return "";
  if (/^data:image\/(png|jpe?g|webp|gif|avif);base64,[a-z0-9+/=]+$/i.test(icon)) {
    return icon;
  }
  try {
    const url = new URL(icon, globalThis.location?.href || "https://homebrewgod.invalid/");
    if (!["https:", "http:"].includes(url.protocol)) return "";
    if (/\.svg(?:$|[?#])/i.test(url.pathname) || /image\/svg/i.test(url.search)) return "";
    return url.href;
  } catch {
    return "";
  }
}

export function resolveActionIcon(action = {}) {
  const raw = action.raw || action.rawItem || {};
  const customUrl = validateCustomActionIcon(
    action.iconUrl || raw.iconUrl || raw.imageUrl || raw.thumbnailUrl
  );
  if (customUrl) {
    return Object.freeze({ type: "image", value: customUrl, label: `${action.name || "Action"} icon` });
  }

  const id = normalize(action.id || action.key);
  if (UNIVERSAL_ICONS[id]) {
    return Object.freeze({ type: "glyph", value: UNIVERSAL_ICONS[id], label: action.name || id });
  }

  const name = normalize(`${action.name} ${raw.name} ${raw.weaponType} ${raw.category} ${raw.type}`);
  const damage = normalize(
    raw.damageType?.name || raw.damageType || raw.damage?.damage_type?.name || (raw.healing ? "healing" : "")
  );
  const damageKey = includesKey(`${damage} ${name}`, DAMAGE_ICONS);
  if (damageKey) {
    return Object.freeze({ type: "glyph", value: DAMAGE_ICONS[damageKey], label: damageKey });
  }

  if (action.kind === "spell") {
    const school = includesKey(normalize(raw.school?.name || raw.school), SCHOOL_ICONS);
    return Object.freeze({
      type: "glyph",
      value: SCHOOL_ICONS[school] || KIND_ICONS.spell,
      label: school || "spell"
    });
  }

  if (action.kind === "weapon" || normalize(action.kind).startsWith("monster-")) {
    const weapon = includesKey(name, WEAPON_ICONS);
    return Object.freeze({
      type: "glyph",
      value: WEAPON_ICONS[weapon] || KIND_ICONS[action.kind] || KIND_ICONS.weapon,
      label: weapon || "weapon"
    });
  }

  if (action.kind === "item") {
    const item = includesKey(name, ITEM_ICONS);
    return Object.freeze({
      type: "glyph",
      value: ITEM_ICONS[item] || KIND_ICONS.item,
      label: item || "item"
    });
  }

  return Object.freeze({
    type: "glyph",
    value: KIND_ICONS[action.kind] || KIND_ICONS.ability,
    label: action.kind || "action"
  });
}

export function getActionRemainingUses(action = {}, actor = {}) {
  const raw = action.raw || action.rawItem || {};
  const candidates = [
    raw.remainingUses,
    raw.usesRemaining,
    raw.currentUses,
    raw.quantity,
    action.kind === "item" ? raw.quantity : null
  ];
  const remaining = candidates.find((value) => Number.isFinite(Number(value)));
  if (remaining != null) return Math.max(0, Number(remaining));
  if (raw.resource?.id && actor?.combat?.resources?.[raw.resource.id]) {
    const resource = actor.combat.resources[raw.resource.id];
    const maximum = Number(resource.maximum ?? resource.max ?? 0);
    const used = Number(resource.used ?? 0);
    if (Number.isFinite(maximum) && Number.isFinite(used)) return Math.max(0, maximum - used);
  }
  return null;
}

export function getActionAvailability({
  action = {},
  actor = {},
  controlled = true,
  busy = false,
  turnUsable = true,
  resourceAvailable = true,
  spellSlotOptions = []
} = {}) {
  const remaining = getActionRemainingUses(action, actor);
  if (busy) return Object.freeze({ state: "processing", available: false, reason: "Another action is being processed." });
  if (!controlled) return Object.freeze({ state: "unavailable", available: false, reason: "You do not control this token." });
  if (!turnUsable) return Object.freeze({ state: "outside-turn", available: false, reason: "It is not this token's turn." });
  if (!resourceAvailable) return Object.freeze({ state: "expended", available: false, reason: `The ${action.resource || "action"} resource is already spent.` });
  if (remaining === 0) return Object.freeze({ state: "expended", available: false, reason: "No uses remain." });
  if (action.kind === "spell" && Number(action.raw?.level || 0) > 0) {
    const slots = Array.isArray(spellSlotOptions) ? spellSlotOptions : [];
    if (!slots.some((slot) => Number(slot.remaining) > 0)) {
      return Object.freeze({ state: "needs-slot", available: false, reason: "No eligible spell slot remains." });
    }
  }
  return Object.freeze({ state: "available", available: true, reason: "" });
}

function firstValue(...values) {
  return values.map(cleanText).find(Boolean) || "";
}

export function buildActionTooltip(action = {}, context = {}) {
  const raw = action.raw || action.rawItem || {};
  const availability = context.availability || getActionAvailability({ action, ...context });
  const remaining = getActionRemainingUses(action, context.actor);
  const details = [
    cleanText(action.name) || "Action",
    cleanText(action.summary || raw.description || raw.summary),
    `Cost: ${context.costLabel || action.resource || "Action"}`,
    firstValue(raw.range, raw.target?.range, raw.reach) ? `Range: ${firstValue(raw.range, raw.target?.range, raw.reach)}` : "",
    firstValue(raw.damage, raw.damageDice, raw.healing, raw.healingDice) ? `Effect: ${firstValue(raw.damage, raw.damageDice, raw.healing, raw.healingDice)}` : "",
    remaining != null ? `Remaining: ${remaining}` : "",
    availability.reason ? `Unavailable: ${availability.reason}` : ""
  ].filter(Boolean);
  return details.join("\n").slice(0, 1200);
}

