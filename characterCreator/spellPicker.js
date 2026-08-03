import { escapeHtml } from "./rendering.js";

export const CREATOR_SPELL_BATCH_SIZE = 25;
export const CREATOR_SPELL_SEARCH_DEBOUNCE_MS = 200;

function cleanText(value) {
  return String(value == null ? "" : value)
    .trim()
    .toLowerCase();
}

function cleanList(value) {
  return (Array.isArray(value) ? value : [value])
    .flatMap((entry) => {
      if (entry && typeof entry === "object") {
        return Object.values(entry);
      }

      return entry;
    })
    .map(cleanText)
    .filter(Boolean);
}

function spellLevel(spell) {
  const level = Number(spell?.level);

  return Number.isFinite(level)
    ? Math.max(0, Math.min(9, Math.round(level)))
    : 0;
}

export function creatorSpellLevelLabel(level) {
  if (level === 0) {
    return "Cantrips";
  }

  const suffix = level === 1
    ? "st"
    : level === 2
      ? "nd"
      : level === 3
        ? "rd"
        : "th";

  return `${level}${suffix}-Level Spells`;
}

export function createCreatorSpellPickerState() {
  return {
    query: "",
    selectedOnly: false,
    openLevels: new Set(),
    visibleByLevel: new Map(),
    expandedSpellIds: new Set(),
    searchTimerId: null
  };
}

export function getCreatorSpellSearchText(spell) {
  const level = spellLevel(spell);
  const damageTypes = cleanList([
    spell?.damageType,
    spell?.damageTypes,
    spell?.damage,
    spell?.effects,
    spell?.tags
  ]);

  return [
    spell?.name,
    level === 0 ? "cantrip" : `level ${level}`,
    creatorSpellLevelLabel(level),
    spell?.levelKey,
    spell?.school,
    spell?.classes,
    spell?.castingTime,
    spell?.source,
    spell?.sourceLabel,
    spell?.rulesSource,
    damageTypes
  ].flat(Infinity)
    .map(cleanText)
    .filter(Boolean)
    .join(" ");
}

export function getCreatorSpellPickerGroups({
  spells,
  state,
  isSelected
}) {
  const records = Array.isArray(spells)
    ? spells
    : [];
  const pickerState = state ||
    createCreatorSpellPickerState();
  const query = cleanText(pickerState.query);
  const selectedOnly =
    pickerState.selectedOnly === true;

  return Array.from(
    { length: 10 },
    (_, level) => {
      const levelSpells = records.filter((spell) => {
        return spellLevel(spell) === level;
      });
      const selectedSpells = levelSpells.filter(
        (spell) => isSelected(spell) === true
      );
      const matches = levelSpells.filter((spell) => {
        const selected =
          isSelected(spell) === true;
        const queryMatch = !query ||
          getCreatorSpellSearchText(spell)
            .includes(query);

        return queryMatch &&
          (!selectedOnly || selected);
      });
      const open = query || selectedOnly
        ? matches.length > 0
        : pickerState.openLevels.has(level) ||
          selectedSpells.length > 0;
      const visibleLimit = Math.max(
        CREATOR_SPELL_BATCH_SIZE,
        Number(
          pickerState.visibleByLevel.get(level)
        ) || CREATOR_SPELL_BATCH_SIZE
      );
      const initialVisible = open
        ? matches.slice(0, visibleLimit)
        : [];
      const visibleIds = new Set(
        initialVisible.map((spell) => spell.id)
      );
      const visibleSpells = [
        ...initialVisible,
        ...(
          open
            ? selectedSpells.filter((spell) => {
                return !visibleIds.has(spell.id) &&
                  matches.includes(spell);
              })
            : []
        )
      ];

      return {
        level,
        label: creatorSpellLevelLabel(level),
        open,
        hidden:
          (query || selectedOnly) &&
          matches.length === 0,
        selectedCount: selectedSpells.length,
        matchingCount: matches.length,
        visibleSpells,
        hasMore:
          visibleSpells.length < matches.length
      };
    }
  );
}

export function renderCreatorSpellPickerResults({
  spells,
  state,
  isSelected,
  renderCard
}) {
  const groups = getCreatorSpellPickerGroups({
    spells,
    state,
    isSelected
  });
  const visibleGroups = groups.filter((group) => {
    return !group.hidden &&
      group.matchingCount > 0;
  });

  if (!visibleGroups.length) {
    return `
      <div class="hg-character-placeholder" data-cc-default-spell-no-results="true">
        No default spells match the current filters.
      </div>
    `;
  }

  return `
    <div class="hg-spell-levels" data-cc-spell-levels>
      ${visibleGroups.map((group) => `
        <details
          class="hg-spell-level"
          data-hg-spell-level="${group.level}"
          data-cc-spell-level="${group.level}"
          ${group.open ? "open" : ""}
        >
          <summary data-cc-action="toggle-spell-level" data-spell-level="${group.level}">
            <span>${escapeHtml(group.label)}</span>
            <span class="hg-spell-level-count" data-hg-spell-selected-count>
              ${group.selectedCount} selected
            </span>
          </summary>
          <div class="hg-character-choice-grid" data-cc-spell-level-results="${group.level}">
            ${group.visibleSpells.map(renderCard).join("")}
          </div>
          ${group.open && group.hasMore ? `
            <div class="hg-character-inline-actions">
              <button
                type="button"
                data-cc-action="show-more-default-spells"
                data-spell-level="${group.level}"
              >
                Show 25 More (${group.matchingCount - group.visibleSpells.length} remaining)
              </button>
            </div>
          ` : ""}
        </details>
      `).join("")}
    </div>
  `;
}
