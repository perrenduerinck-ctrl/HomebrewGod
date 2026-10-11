import {
  collectCharacterActions,
  collectCharacterInventory,
  collectCharacterSpells
} from "../characterSheet/index.js";
import { getEconomyResourceForSection } from "./actionEconomy.js";

function text(value) {
  return String(value ?? "").trim();
}
function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeKey(value) {
  return text(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function entry(kind, value, extra = {}) {
  const id = text(value?.id || value?.key || value?.name || extra.id);
  return Object.freeze({
    kind,
    id,
    key: `${kind}:${id || normalizeKey(value?.name || extra.name)}`,
    name: text(value?.name || extra.name) || "Action",
    summary: text(value?.summary || value?.description || extra.summary),
    resource: extra.resource || getEconomyResourceForSection(value?.section),
    raw: value,
    ...extra
  });
}

export const UNIVERSAL_COMBAT_ACTIONS = Object.freeze([
  entry("universal", {}, { id: "move", name: "Move", summary: "Drag the token and confirm the existing movement preview.", resource: "free" }),
  entry("universal", {}, { id: "dash", name: "Dash", summary: "Gain this movement mode's speed again for the turn.", resource: "action" }),
  entry("universal", {}, { id: "disengage", name: "Disengage", summary: "Track Disengage for this turn.", resource: "action" }),
  entry("universal", {}, { id: "jump", name: "Jump", summary: "Preview a legal landing point using existing map measurement.", resource: "free" }),
  entry("universal", {}, { id: "shove", name: "Shove", summary: "Choose a target; resolve the contest manually.", resource: "action" }),
  entry("universal", {}, { id: "help", name: "Help", summary: "Track Help and optionally select its target.", resource: "action" }),
  entry("universal", {}, { id: "hide", name: "Hide", summary: "Spend an Action; stealth resolution remains manual.", resource: "action" }),
  entry("universal", {}, { id: "dodge", name: "Dodge", summary: "Track Dodge until this actor's next turn.", resource: "action" }),
  entry("universal", {}, { id: "throw", name: "Throw", summary: "Choose a throwable item, then choose a target.", resource: "action" })
]);

export function getCharacterMovementModes(character = {}, token = {}) {
  const candidates = {
    walk: character?.combat?.baseSpeed?.walk ?? character?.combat?.speed?.walk ?? character?.walkingSpeed ?? token?.movementSpeed ?? token?.baseSpeed,
    fly: character?.combat?.baseSpeed?.fly ?? character?.combat?.speed?.fly ?? character?.speed?.fly,
    swim: character?.combat?.baseSpeed?.swim ?? character?.combat?.speed?.swim ?? character?.speed?.swim,
    climb: character?.combat?.baseSpeed?.climb ?? character?.combat?.speed?.climb ?? character?.speed?.climb,
    burrow: character?.combat?.baseSpeed?.burrow ?? character?.combat?.speed?.burrow ?? character?.speed?.burrow
  };
  return Object.entries(candidates)
    .map(([id, speed]) => ({ id, label: id[0].toUpperCase() + id.slice(1), speed: Math.max(0, Math.round(number(speed, 0))) }))
    .filter((mode) => mode.speed > 0);
}

export function getLegacyJumpProfile(character = {}) {
  const strength = Math.max(1, Math.round(number(
    character?.abilities?.scores?.str ?? character?.abilities?.strength ?? character?.abilities?.str,
    10
  )));
  const modifier = Math.floor((strength - 10) / 2);
  const runningLong = strength;
  const runningHigh = Math.max(0, 3 + modifier);
  return Object.freeze({
    strength,
    modifier,
    runningLong,
    standingLong: Math.floor(runningLong / 2),
    runningHigh,
    standingHigh: Math.floor(runningHigh / 2)
  });
}

function availableSpell(spell) {
  if (number(spell.level, 0) === 0) return true;
  const statuses = new Set((spell.statuses || []).map((value) => text(value).toLowerCase()));
  return spell.prepared === true || spell.known === true || [
    "always prepared", "innate", "feat-granted", "species-granted", "subclass-granted", "custom spell"
  ].some((status) => statuses.has(status));
}

function fastItem(item, raw) {
  const searchable = `${item.name} ${item.category} ${item.description} ${raw?.tags || ""}`.toLowerCase();
  return item.quantity > 0 && (
    item.isWeapon || raw?.throwable === true || raw?.consumable === true ||
    /(potion|scroll|consumable|bomb|flask|poison|charge|usable|throw)/.test(searchable)
  );
}

function monsterEntries(monster = {}) {
  const groups = [
    ["monster-action", monster.actions, "action"],
    ["monster-bonus", monster.bonusActions, "bonus"],
    ["monster-reaction", monster.reactions, "reaction"]
  ];
  return groups.flatMap(([kind, values, resource]) => (
    (Array.isArray(values) ? values : []).map((value, index) => entry(kind, value, {
      id: text(value?.id) || `${kind}-${index}`,
      resource
    }))
  ));
}

export function buildCombatActionBarModel({ token = {}, actor = null, actorKind = "generic" } = {}) {
  const isCharacter = actorKind === "character" && actor;
  const actions = isCharacter ? collectCharacterActions(actor) : [];
  const inventory = isCharacter ? collectCharacterInventory(actor).entries : [];
  const rawItems = Array.isArray(actor?.equipment?.items) ? actor.equipment.items : [];
  const weapons = actions.filter((action) => action.contentKind === "weapon")
    .map((action) => entry("weapon", action, {
      resource: "action",
      numberOfAttacks: Math.max(1, Math.round(number(action.numberOfAttacks, 1)))
    }));
  const abilities = actions.filter((action) => action.contentKind !== "weapon")
    .map((action) => entry("ability", action));
  const spells = isCharacter
    ? collectCharacterSpells(actor).filter(availableSpell).map((spell) => entry("spell", spell, {
        resource: spell.actionKind === "bonusAction" ? "bonus" : spell.actionKind === "reaction" ? "reaction" : "action"
      }))
    : [];
  const items = inventory.filter((item) => fastItem(item, rawItems[item.index]))
    .map((item) => entry("item", item, { rawItem: rawItems[item.index], resource: "action" }));
  const monsterActions = actorKind === "monster" ? monsterEntries(actor) : [];
  const favorites = new Set((actor?.uiPreferences?.combatActionBarFavorites || []).map((favorite) => text(favorite?.key)));
  const all = [...UNIVERSAL_COMBAT_ACTIONS, ...weapons, ...spells, ...abilities, ...items, ...monsterActions];
  const favoriteEntries = all.filter((action) => favorites.has(action.key));
  return Object.freeze({
    token,
    actor,
    actorKind,
    universal: UNIVERSAL_COMBAT_ACTIONS,
    weapons,
    spells,
    abilities: actorKind === "monster" ? monsterActions : abilities,
    items,
    favorites: favoriteEntries,
    favoriteKeys: favorites,
    movementModes: getCharacterMovementModes(actor || {}, token),
    jump: isCharacter ? getLegacyJumpProfile(actor) : null
  });
}

