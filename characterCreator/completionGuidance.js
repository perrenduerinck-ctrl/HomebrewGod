import { getStepById } from "./configuration.js";

// Locations describe existing controls; they do not introduce new completion rules.
const LOCATIONS = [
  [/archived|unresolved.*source|spell.*ownership/i, "spells", "Spell-source recovery", "[data-cc-spell-source-recovery]"],
  [/spellbook.*(choice|history)|free spellbook/i, "spells", "Wizard spellbook progression", "[data-cc-spellbook-progress]"],
  [/custom spell/i, "spells", "Custom spells", "#ccCustomSpellsSection"],
  [/magic initiate|fey touched|shadow touched|spell sniper|ritual caster|artificer initiate|divinely favored|aberrant dragonmark|wood elf magic|drow high magic|strixhaven/i, "spells", "Feat spell choices", "#ccFeatureSection"],
  [/dragonborn|draconic ancestry/i, "species", "Draconic Ancestry", "#ccDragonbornAncestry"],
  [/subrace/i, "species", "Subrace", '[data-cc-action="choose-subrace"]'],
  [/half-elf.*abilit/i, "species", "Half-Elf Ability Choices", "#ccHalfElfAbilityOne"],
  [/half-elf.*skill/i, "species", "Half-Elf Skill Choices", "#ccHalfElfSkillOne"],
  [/half-elf.*language/i, "species", "Half-Elf Language", "#ccHalfElfLanguage"],
  [/dwarf.*tool/i, "species", "Dwarf Tool Choice", "#ccDwarfToolChoice"],
  [/human.*language/i, "species", "Human Language", "#ccHumanLanguage"],
  [/high elf.*cantrip/i, "species", "High Elf Cantrip", "#ccHighElfCantrip"],
  [/high elf.*language/i, "species", "High Elf Language", "#ccHighElfLanguage"],
  [/character name|name is missing/i, "basics", "Character name", '[data-draft-path="identity.name"]'],
  [/species|subrace|ancestry|dragonborn|half-elf|high elf|dwarf|human additional/i, "species", "Species choices", '[data-cc-action="apply-species-choices"], [data-cc-action="choose-species"]'],
  [/background/i, "background", "Background choices", ""],
  [/subclass/i, "class", "Subclass", '[data-cc-action="choose-subclass"]'],
  [/class skill|class.*skill proficien|choose exactly \d+ valid .* skill proficien/i, "class", "Class skill choices", ""],
  [/multiclass|progression|fighting style|invocation|metamagic|ability score improvement|advancement|class level/i, "class", "Class choices", ""],
  [/hit point|\bhp\b|level-up rolls/i, "abilities", "Hit points", '[data-draft-path="combat.maxHp"], [data-draft-path^="combat.hpCalculation."]'],
  [/equipped|shield.*equipped/i, "equipment", "Equipment", ""],
  [/armor class/i, "abilities", "Armor Class", '[data-draft-path="combat.armorClassMode"]'],
  [/spell|cantrip|prepared|arcanum|feat/i, "spells", "Spells and feature choices", ""],
  [/ability|score|point.buy|standard array|strength|dexterity|constitution|intelligence|wisdom|charisma/i, "abilities", "Ability scores", '[data-draft-path^="abilities.base."]'],
  [/class/i, "class", "Class choices", ""],
  [/equipment|inventory|attun|container|currency|armor|shield|weapon/i, "equipment", "Equipment", ""],
  [/skill|proficien|language|tool/i, "background", "Skills and proficiencies", ""]
];
export function getCompletionLocation(message, fallbackStepId = "review") {
  const match = LOCATIONS.find(([pattern]) => pattern.test(String(message || "")));
  const step = getStepById(match?.[1] || fallbackStepId);
  return { stepId: step.id, stepLabel: step.label, section: match?.[2] || step.label, selector: match?.[3] || "" };
}
export function renderCompletionIssue(message, escapeHtml, fallbackStepId = "review") {
  const location = getCompletionLocation(message, fallbackStepId);
  return `<span>${escapeHtml(message)}</span>
    <button type="button" class="hg-character-small-button" style="white-space:normal; max-width:100%; text-align:left" data-cc-action="go-step"
      data-step-id="${escapeHtml(location.stepId)}" data-cc-issue="${escapeHtml(message)}">
      Show in ${escapeHtml(location.stepLabel)}: ${escapeHtml(location.section)}
    </button>`;
}
