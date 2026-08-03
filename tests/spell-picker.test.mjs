import test from "node:test";
import assert from "node:assert/strict";
import {
  createCreatorSpellPickerState,
  CREATOR_SPELL_BATCH_SIZE,
  CREATOR_SPELL_SEARCH_DEBOUNCE_MS,
  getCreatorSpellPickerGroups,
  getCreatorSpellSearchText,
  renderCreatorSpellPickerResults
} from "../characterCreator/spellPicker.js";

function makeSpells(count = 340) {
  return Array.from({ length: count }, (_, index) => ({
    id: `spell-${index}`,
    name: `Spell ${index}`,
    level: index % 10,
    school: index === 137 ? "Evocation" : "Abjuration",
    classes: index === 137 ? ["Wizard", "Sorcerer"] : ["Wizard"],
    castingTime: index === 137 ? "1 bonus action" : "1 action",
    damageTypes: index === 137 ? ["fire"] : [],
    source: index === 137 ? "SRD 5.1" : "default"
  }));
}

test("closed spell levels do not create hundreds of spell cards", () => {
  const state = createCreatorSpellPickerState();
  let rendered = 0;
  const html = renderCreatorSpellPickerResults({
    spells: makeSpells(),
    state,
    isSelected: () => false,
    renderCard: () => {
      rendered += 1;
      return "<article>complete description</article>";
    }
  });

  assert.equal(rendered, 0);
  assert.equal((html.match(/data-cc-spell-level=/g) || []).length, 10);
  assert.doesNotMatch(html, /complete description/);
});

test("open levels render 25 at a time while keeping selected spells visible", () => {
  const spells = makeSpells();
  const state = createCreatorSpellPickerState();
  state.openLevels.add(1);
  const selectedId = "spell-331";
  const groups = getCreatorSpellPickerGroups({
    spells,
    state,
    isSelected: (spell) => spell.id === selectedId
  });
  const levelOne = groups[1];

  assert.equal(CREATOR_SPELL_BATCH_SIZE, 25);
  assert.equal(levelOne.open, true);
  assert.equal(levelOne.visibleSpells.length, 26);
  assert.equal(levelOne.visibleSpells.some((spell) => spell.id === selectedId), true);
  assert.equal(levelOne.hasMore, true);

  state.visibleByLevel.set(1, 50);
  assert.equal(getCreatorSpellPickerGroups({ spells, state, isSelected: () => false })[1].visibleSpells.length, 34);
});

test("search indexes required spell metadata and uses a 200ms debounce", () => {
  const spell = makeSpells()[137];
  const searchText = getCreatorSpellSearchText(spell);

  ["spell 137", "level 7", "evocation", "sorcerer", "bonus action", "fire", "srd 5.1"].forEach((term) => {
    assert.match(searchText, new RegExp(term));
  });
  assert.equal(CREATOR_SPELL_SEARCH_DEBOUNCE_MS, 200);

  const state = createCreatorSpellPickerState();
  state.query = "fire";
  const matches = getCreatorSpellPickerGroups({
    spells: makeSpells(),
    state,
    isSelected: () => false
  }).flatMap((group) => group.visibleSpells);
  assert.deepEqual(matches.map((entry) => entry.id), ["spell-137"]);
});
