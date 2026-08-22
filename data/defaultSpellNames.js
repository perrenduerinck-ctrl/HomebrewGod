import { SRD_SPELL_DETAILS } from "./defaultSpellDetails.js";

// These existing cantrips are outside the SRD 5.1 catalog. Keep them in the
// app's name list so expanding levels 1-9 never removes an existing option.
export const EXTRA_CANTRIP_NAMES = Object.freeze([
  "Blade Ward",
  "Booming Blade",
  "Control Flames",
  "Create Bonfire",
  "Encode Thoughts",
  "Friends",
  "Frostbite",
  "Green-Flame Blade",
  "Gust",
  "Infestation",
  "Lightning Lure",
  "Magic Stone",
  "Mind Sliver",
  "Mold Earth",
  "Primal Savagery",
  "Sapping Sting",
  "Shape Water",
  "Sword Burst",
  "Thunderclap",
  "Toll the Dead",
  "Word of Radiance"
]);

const uniqueSortedNames = (names) => Object.freeze(
  [...new Set(names.map((name) => String(name || "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b))
);

const namesForLevel = (level) => SRD_SPELL_DETAILS
  .filter((spell) => Number(spell.level) === level)
  .map((spell) => spell.name);

export const SPELL_NAME_LIST = Object.freeze({
  cantrip: uniqueSortedNames([
    ...namesForLevel(0),
    ...EXTRA_CANTRIP_NAMES
  ]),
  level1: uniqueSortedNames(namesForLevel(1)),
  level2: uniqueSortedNames(namesForLevel(2)),
  level3: uniqueSortedNames(namesForLevel(3)),
  level4: uniqueSortedNames(namesForLevel(4)),
  level5: uniqueSortedNames(namesForLevel(5)),
  level6: uniqueSortedNames(namesForLevel(6)),
  level7: uniqueSortedNames(namesForLevel(7)),
  level8: uniqueSortedNames(namesForLevel(8)),
  level9: uniqueSortedNames(namesForLevel(9))
});

export default SPELL_NAME_LIST;
