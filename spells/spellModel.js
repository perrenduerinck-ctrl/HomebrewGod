import { normalizeSpellAnimations } from "../vfx/animationReferences.js";
import {
  createSpellTargetingData,
  validateSpellTargetingData
} from "../data/spellTargeting.js";

export const SPELL_SCHOOLS = Object.freeze([
  "Abjuration", "Conjuration", "Divination", "Enchantment", "Evocation",
  "Illusion", "Necromancy", "Transmutation", "Other"
]);

export const SPELL_CLASSES = Object.freeze([
  "Artificer", "Bard", "Cleric", "Druid", "Paladin",
  "Ranger", "Sorcerer", "Warlock", "Wizard"
]);

export const SPELL_DAMAGE_TYPES = Object.freeze([
  "", "Acid", "Bludgeoning", "Cold", "Fire", "Force", "Lightning",
  "Necrotic", "Piercing", "Poison", "Psychic", "Radiant", "Slashing", "Thunder"
]);

const clean = (value, maximum = 2000) => String(value ?? "").trim().slice(0, maximum);
const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));

function cleanList(value, maximum = 20) {
  const source = Array.isArray(value) ? value : String(value ?? "").split(",");
  return [...new Set(source.map((entry) => clean(entry, 80)).filter(Boolean))].slice(0, maximum);
}

function normalizeComponentLetters(source = {}) {
  const explicit = Array.isArray(source.componentLetters)
    ? source.componentLetters
    : clean(source.componentLetters, 80)
      ? String(source.componentLetters).split(/[\s,/]+/)
      : clean(source.components, 500)
        ? String(source.components).split(/[\s,/]+/)
        : [];
  return [...new Set(
    explicit
      .map((entry) => clean(entry, 20).toUpperCase())
      .filter(Boolean)
  )].slice(0, 5);
}

function normalizedSchool(value) {
  const selected = SPELL_SCHOOLS.find((school) => school.toLowerCase() === clean(value, 40).toLowerCase());
  return selected || "Other";
}

function normalizedDamageType(value) {
  const selected = SPELL_DAMAGE_TYPES.find((type) => type.toLowerCase() === clean(value, 40).toLowerCase());
  return selected || clean(value, 40);
}

function spellId(value, fallback) {
  const id = clean(value, 160).toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return id || clean(fallback, 160);
}

export function normalizeHomebrewSpell(raw = {}, {
  idFactory = () => globalThis.crypto?.randomUUID?.() || `spell-${Date.now()}`,
  now = Date.now()
} = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const name = clean(source.name, 120) || "Unnamed Spell";
  const rawLevel = Number(source.level ?? source.spellLevel ?? 0);
  const level = Math.max(0, Math.min(9, Math.round(Number.isFinite(rawLevel) ? rawLevel : 0)));
  const classes = cleanList(source.classes || source.classNames || (source.classId ? [source.classId] : []), 20);
  const componentLetters = normalizeComponentLetters(source);
  const components = clean(source.components || componentLetters.join(", "), 500);
  const description = clean(source.description || source.summary, 12000);
  const damageType = normalizedDamageType(source.damageType || source.damage?.type || source.damage?.damage_type?.name);
  const createdAtMillis = Number(source.createdAtMillis) || now;
  const animations = normalizeSpellAnimations(source.animations || {});
  const range = clean(source.range, 160) || "Self";
  const duration = clean(source.duration, 160) || "Instantaneous";
  const attackType = clean(source.attackType, 40).toLowerCase();
  const saveAbility = clean(source.saveAbility, 20).toLowerCase();
  const saveSuccess = clean(source.saveSuccess, 40).toLowerCase();
  const targeting =
    source.targeting &&
    typeof source.targeting === "object"
      ? clone(source.targeting)
      : createSpellTargetingData({
          ...source,
          id: spellId(source.id, name),
          name,
          range,
          duration,
          attackType,
          saveAbility,
          saveSuccess
        });

  return Object.freeze({
    id: spellId(source.id, idFactory()),
    revision: Math.max(0, Math.trunc(Number(source.revision) || 0)),
    name,
    level,
    school: normalizedSchool(source.school),
    classes: Object.freeze(classes),
    castingTime: clean(source.castingTime, 160) || "1 action",
    range,
    duration,
    components,
    componentLetters: Object.freeze(componentLetters),
    material: clean(source.material, 1000),
    description,
    summary: description,
    higherLevel: clean(source.higherLevel || source.atHigherLevels, 6000),
    damageType,
    damageDice: clean(source.damageDice || source.damage?.dice, 120),
    attackType,
    saveAbility,
    saveSuccess,
    concentration: source.concentration === true,
    ritual: source.ritual === true,
    manualOverride: source.manualOverride === true,
    tags: Object.freeze([...new Set(cleanList(source.tags, 20).map((entry) => entry.toLowerCase()))]),
    animations: Object.freeze(clone(animations)),
    targeting: Object.freeze(targeting),
    areaOfEffect: source.areaOfEffect && typeof source.areaOfEffect === "object" ? Object.freeze(clone(source.areaOfEffect)) : null,
    damage: source.damage && typeof source.damage === "object" ? Object.freeze(clone(source.damage)) : null,
    source: clean(source.source, 80) || "custom",
    createdAtMillis,
    updatedAtMillis: Number(source.updatedAtMillis) || now,
    sourceWorkshopAssetId: clean(source.sourceWorkshopAssetId, 200),
    sourceWorkshopVersion: Number(source.sourceWorkshopVersion) || null,
    sourceAuthorUid: clean(source.sourceAuthorUid, 200),
    copiedFromLibraryId: clean(source.copiedFromLibraryId, 240),
    copiedFromLibrarySpellId: clean(source.copiedFromLibrarySpellId, 160)
  });
}

export function validateHomebrewSpell(raw = {}) {
  const errors = [];
  const normalized = normalizeHomebrewSpell(raw);
  if (!clean(raw.name, 120)) errors.push("Give the spell a name.");
  const level = Number(raw.level ?? raw.spellLevel ?? 0);
  if (!Number.isFinite(level) || level < 0 || level > 9) errors.push("Spell level must be between 0 and 9.");
  const castingTime = normalized.castingTime;
  if (!/(action|reaction|minute|hour)/i.test(castingTime)) {
    errors.push("Casting time must identify an action, reaction, minute, or hour duration.");
  }

  const letters = [...normalized.componentLetters];
  const invalidComponents = letters.filter((entry) => !["V", "S", "M"].includes(entry));
  if (invalidComponents.length) errors.push(`Invalid spell component: ${invalidComponents.join(", ")}.`);
  if (clean(raw.material, 1000) && !letters.includes("M")) {
    errors.push("Material details require the M component.");
  }

  const classes = [...normalized.classes];
  const validClasses = new Set(SPELL_CLASSES.map((entry) => entry.toLowerCase()));
  const invalidClasses = classes.filter((entry) => !validClasses.has(entry.toLowerCase()));
  if (invalidClasses.length) errors.push(`Unknown spell class: ${invalidClasses.join(", ")}.`);

  const targeting = normalized.targeting;
  const targetingValidation = validateSpellTargetingData(targeting, "Spell targeting");
  errors.push(...targetingValidation.errors);

  const formulas = [];
  const addFormula = (label, value, maximumLevel) => {
    if (value == null || value === "") return;
    if (typeof value === "object" && !Array.isArray(value)) {
      Object.entries(value).forEach(([threshold, formula]) => {
        const parsedThreshold = Number(threshold);
        if (!Number.isInteger(parsedThreshold) || parsedThreshold < 1 || parsedThreshold > maximumLevel) {
          errors.push(`${label} level ${threshold} is outside 1-${maximumLevel}.`);
        }
        formulas.push([`${label} level ${threshold}`, formula]);
      });
      return;
    }
    formulas.push([label, value]);
  };
  addFormula("Damage", raw.damageDice || raw.damage?.dice, 9);
  addFormula("Character scaling", raw.damage?.atCharacterLevel || raw.scaling?.atCharacterLevel, 20);
  addFormula("Slot scaling", raw.damage?.atSlotLevel || raw.scaling?.atSlotLevel, 9);
  formulas.forEach(([label, formula]) => {
    const value = clean(formula, 240);
    if (value && !/\b\d+d\d+\b/i.test(value) && !/^\d+(?:\.\d+)?$/.test(value)) {
      errors.push(`${label} must contain a valid dice expression such as 2d6 or a numeric amount.`);
    }
  });
  try { normalizeSpellAnimations(raw.animations || {}, { strict: true }); }
  catch (error) { errors.push(error.message); }
  return Object.freeze(errors);
}

export function spellLevelLabel(value) {
  const level = Math.max(0, Math.min(9, Math.round(Number(value) || 0)));
  return level === 0 ? "Cantrip" : `Level ${level}`;
}

export function homebrewSpellToCharacterCopy(raw, {
  idFactory = () => globalThis.crypto?.randomUUID?.() || `custom-spell-${Date.now()}`
} = {}) {
  const spell = normalizeHomebrewSpell(raw);
  return {
    ...clone(spell),
    id: spellId(idFactory(), `custom-spell-${Date.now()}`),
    source: "library",
    sourceLibrarySpellId: spell.id,
    copiedFromLibrarySpellId: spell.id,
    classId: "",
    classEntryId: "",
    spellcastingSourceId: "",
    manualOverride: true,
    innate: false
  };
}
