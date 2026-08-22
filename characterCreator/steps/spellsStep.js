import {
  createCreatorSpellPickerState,
  CREATOR_SPELL_BATCH_SIZE,
  CREATOR_SPELL_SEARCH_DEBOUNCE_MS
} from "../spellPicker.js";
import {
  evaluateSpellChoices
} from "../spellChoices.js?v=optional-spell-choices-20260803";
import {
  SPELL_SOURCE_MODEL_VERSION
} from "../spellSources.js?v=canonical-spell-sources-20260802";
import {
  CREATOR_CATALOG_BATCH_SIZE
} from "../catalogPagination.js";

const FEAT_CATALOG_SEARCH_DEBOUNCE_MS = 250;

const SPELLS_STEP_ACTIONS = Object.freeze([
  "calculate-spellcasting-values",
  "add-custom-spell",
  "toggle-spell-known",
  "toggle-spell-prepared",
  "toggle-spell-arcanum",
  "remove-custom-spell",
  "toggle-spell-level",
  "show-more-default-spells",
  "toggle-default-spell-details",
  "add-custom-feature",
  "toggle-default-feat",
  "show-more-default-feats",
  "remove-custom-feature"
]);

export function createSpellsStep(
  dependencies = {}
) {
  const {
    beginnerNote,
    cleanString,
    escapeHtml,
    getCreatorState,
    renderCreatorView,
    safeDisplayString,
    safeNumber,
    setStatus,
    wizardField,
    wizardSelect
  } = dependencies.sharedServices || dependencies;
  const {
    ABILITY_DEFINITIONS,
    C,
    addSection16CustomFeature,
    addSection16CustomSpell,
    calculateSection16SpellcastingValues,
    formatSection16ProgressionLabel,
    getSection13AbilityName,
    getSection16CustomFeatures,
    getSection16FeatPickerPage,
    getSection16SelectedFeats,
    getCanonicalSpellSources,
    getPerClassSpellSelectionSummary,
    getSection16SpellById,
    getSelectedClassTemplate,
    getSpellSelectionLimits,
    getSpellcastingClassOptions,
    getSpellcastingSummary,
    isCharacterNonSpellcaster,
    migrateSection16LegacySpellSelections,
    refreshSection16SpellPicker:
      refreshSpellPickerView,
    removeSection16CustomFeature,
    removeSection16CustomSpell,
    renderSection16BeginnerGuide,
    renderSection16CustomSpells,
    renderSection16DefaultSpellViewer,
    renderSection16FeatureCards,
    renderSection16InnateSpells,
    renderSection16MagicalSecrets,
    renderSection16SpellSlots,
    renderSection17SpellcastingSummary,
    syncSection16ClassSourceMetadata,
    toggleSection16Feat,
    toggleSection16MysticArcanum,
    toggleSection16SpellKnown,
    toggleSection16SpellPrepared,
  } = dependencies;

  const section16SelectedSpellSourceIds =
    new Map();
  const section16SpellPickerState =
    createCreatorSpellPickerState();
  const section16FeatPickerState = {
    query: "",
    visibleLimit: CREATOR_CATALOG_BATCH_SIZE,
    pinnedFeatId: "",
    searchTimerId: null
  };

  function normalizeStepData(character) {
    migrateSection16LegacySpellSelections();
    syncSection16ClassSourceMetadata();
    return character;
  }

  function renderStep() {
    const creatorState = getCreatorState();
    const magic =
      creatorState.draft.magic;

    migrateSection16LegacySpellSelections();
    syncSection16ClassSourceMetadata();

    const selectedClass =
      getSelectedClassTemplate();

    const classSpellcastingAbility =
      selectedClass?.source !== "custom"
        ? cleanString(
            selectedClass?.spellcastingAbility
          )
        : "";

    const spellcastingAbilityLocked =
      Boolean(classSpellcastingAbility);

    const abilityChoices = [
      {
        value: "",
        label: "No Spellcasting Ability"
      },

      ...ABILITY_DEFINITIONS.map(
        (ability) => {
          return {
            value: ability.id,
            label: ability.name
          };
        }
      )
    ];

    const levelChoices = [
      {
        value: 0,
        label: "Cantrip"
      },

      ...Array.from(
        { length: 9 },
        (_, index) => {
          return {
            value: index + 1,
            label:
              `Level ${index + 1}`
          };
        }
      )
    ];

    const schoolChoices = [
      "Abjuration",
      "Conjuration",
      "Divination",
      "Enchantment",
      "Evocation",
      "Illusion",
      "Necromancy",
      "Transmutation",
      "Other"
    ].map((school) => {
      return {
        value: school,
        label: school
      };
    });

    const spellClassChoices = [
      {
        value: "",
        label: "Choose class source"
      },

      ...getSpellcastingClassOptions(
        creatorState.draft
      ).map((entry) => {
        return {
          value:
            entry.classEntryId ||
            entry.classId,
          label:
            `${
              entry.className ||
              entry.classId ||
              "Class"
            } ${entry.level || ""}`.trim()
        };
      })
    ];

    const spellLimits =
      getSpellSelectionLimits(
        creatorState.draft
      );

    const preparedCount =
      spellLimits.preparedCount;

    const nonSpellcaster =
      isCharacterNonSpellcaster(
        creatorState.draft
      );

    const spellcastingSummary =
      getSpellcastingSummary(
        creatorState.draft
      );

    const primarySpellcaster =
      spellcastingSummary.classes.find(
        (entry) => {
          return (
            entry.progressionType !== "none" ||
            Boolean(entry.spellcastingAbility)
          );
        }
      );

    const multiclassSpellcasting =
      spellcastingSummary.classes.length > 1;

    const displayedSpellcastingAbility =
      primarySpellcaster
        ?.spellcastingAbility ||
      classSpellcastingAbility ||
      magic.spellcastingAbility;

    const displayedSpellSaveDc =
      primarySpellcaster?.spellSaveDc ??
      magic.spellSaveDc;

    const displayedSpellAttackBonus =
      primarySpellcaster
        ?.spellAttackBonus ??
      magic.spellAttackBonus;

    const displayedPactMagic =
      primarySpellcaster?.pactMagic ||
      magic.pactMagic;
    const featPage =
      getSection16FeatPickerPage({
        query: section16FeatPickerState.query,
        visibleLimit:
          section16FeatPickerState.visibleLimit,
        pinnedIds:
          section16FeatPickerState.pinnedFeatId
            ? [
                section16FeatPickerState
                  .pinnedFeatId
              ]
            : []
      });

    return `
      ${beginnerNote(
        "Spells and Features",
        "Features are special abilities from your class, species, background, or feats. Spells only appear if your character has spellcasting or magic features."
      )}

      ${renderSection16BeginnerGuide()}

      ${spellcastingSummary.castingBlocked
        ? `
          <div class="hg-character-warning">
            <b>Spellcasting unavailable:</b>
            ${escapeHtml(
              spellcastingSummary.castingBlockReasons.join(", ") ||
              "A class-feature restriction is active"
            )}.
            End the active state before casting or concentrating on a spell.
          </div>
        `
        : ""}

      <div class="hg-character-current-choice">
        <b>Spellcasting Ability:</b>

        ${escapeHtml(
          displayedSpellcastingAbility
            ? getSection13AbilityName(
                displayedSpellcastingAbility
              )
            : "None"
        )}

        <br>

        <b>Known Spells:</b>

        ${spellLimits.knownLeveledCount}

        ${
          spellLimits.spellsKnownLimit === null
            ? ""
            : ` / ${spellLimits.spellsKnownLimit} leveled`
        }

        ${
          spellLimits.mysticArcanumCount
            ? `
              <br>
              <b>Mystic Arcanum:</b>
              ${spellLimits.mysticArcanumCount}
              (separate from spells known)
            `
            : ""
        }

        <br>

        <b>Known Cantrips:</b>

        ${spellLimits.knownCantripCount}

        ${
          spellLimits.cantripsKnownLimit === null
            ? ""
            : ` / ${spellLimits.cantripsKnownLimit}`
        }

        <br>

        <b>Prepared Spells:</b>

        ${preparedCount}

        ${
          spellLimits.preparedLimit === null
            ? ""
            : ` / ${spellLimits.preparedLimit}`
        }

        ${
          spellLimits.alwaysPreparedCount
            ? `
              <br>
              <b>Always Prepared:</b>
              ${spellLimits.alwaysPreparedCount}
              (does not count against the prepared limit)
            `
            : ""
        }

        <br>

        <b>Maximum Spell Level:</b>

        ${
          spellLimits.maxSpellLevel === null
            ? "None"
            : spellLimits.maxSpellLevel
        }

        <br>

        <b>Spell Save DC:</b>

        ${
          displayedSpellSaveDc === null ||
          displayedSpellSaveDc === undefined
            ? "Not calculated"
            : safeNumber(
                displayedSpellSaveDc,
                0
              )
        }

        <br>

        <b>Spell Attack Bonus:</b>

        ${
          displayedSpellAttackBonus === null ||
          displayedSpellAttackBonus === undefined
            ? "Not calculated"
            : `${
                safeNumber(
                  displayedSpellAttackBonus,
                  0
                ) >= 0
                  ? "+"
                  : ""
              }${safeNumber(
                displayedSpellAttackBonus,
                0
              )}`
        }

        <br>

        <b>Progression:</b>

        ${escapeHtml(
          formatSection16ProgressionLabel(
            primarySpellcaster
              ?.progressionType ||
            magic.spellcastingProgression
          )
        )}

        ${
          displayedPactMagic?.slots
            ? `
              <br>

              <b>Pact Magic:</b>

              ${safeNumber(
                displayedPactMagic.slots,
                0
              )} slot(s), level ${safeNumber(
                displayedPactMagic.slotLevel,
                0
              )}
            `
            : ""
        }
      </div>

      <div class="hg-character-choice-grid" data-cc-spell-source-summary="true">
        ${renderSection17SpellcastingSummary()}
      </div>

      ${
        nonSpellcaster
          ? `
            <div class="hg-character-placeholder">
              This character is not a spellcaster. No spell selections are required.
            </div>
          `
          : ""
      }

      <h3>
        ${
          multiclassSpellcasting
            ? "Primary / Legacy Spellcasting Fields"
            : "Spellcasting"
        }
      </h3>

      ${
        multiclassSpellcasting
          ? `
            <p class="small">
              The per-class spellcasting cards above are authoritative.
              These compatibility fields mirror the primary spellcasting
              class and do not replace each class's own ability, save DC,
              attack bonus, or spell selections.
            </p>
          `
          : ""
      }

      <div class="hg-character-field-grid three">
        ${wizardSelect(
          "Spellcasting Ability",
          "ccSpellcastingAbility",

          classSpellcastingAbility ||
          magic.spellcastingAbility ||
          "",

          abilityChoices,

          {
            path:
              "magic.spellcastingAbility",

            extra:
              spellcastingAbilityLocked ||
              multiclassSpellcasting
                ? "disabled"
                : ""
          }
        )}

        ${wizardField(
          "Spell Save DC",
          "ccSpellSaveDc",

          magic.spellSaveDc === null ||
          magic.spellSaveDc === undefined
            ? ""
            : magic.spellSaveDc,

          {
            type: "number",
            path: "magic.spellSaveDc",
            valueType: "number",

            extra:
              `min="0" step="1"${
                multiclassSpellcasting
                  ? " disabled"
                  : ""
              }`
          }
        )}

        ${wizardField(
          "Spell Attack Bonus",
          "ccSpellAttackBonus",

          magic.spellAttackBonus === null ||
          magic.spellAttackBonus === undefined
            ? ""
            : magic.spellAttackBonus,

          {
            type: "number",
            path:
              "magic.spellAttackBonus",

            valueType: "number",

            extra:
              `step="1"${
                multiclassSpellcasting
                  ? " disabled"
                  : ""
              }`
          }
        )}
      </div>

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="calculate-spellcasting-values"
        >
          Calculate Spell Values
        </button>
      </div>

      <hr>

      <h3>Spell Slots</h3>

      <div class="hg-character-field-grid three">
        ${renderSection16SpellSlots()}
      </div>

      <hr>

      ${renderSection16MagicalSecrets()}

      <h3>Default Spell List</h3>

      <p class="small">
        Learn class spells, prepare them, or add Wizard spells to a
        spellbook. Choices are saved to the class that owns them and
        are limited by that class's current spell level.
      </p>

      ${renderSection16DefaultSpellViewer(
        section16SpellPickerState,
        section16SelectedSpellSourceIds
      )}

      <hr>

      <h3>Innate Species Spells</h3>

      <div class="hg-character-choice-grid">
        ${renderSection16InnateSpells()}
      </div>

      <hr>

      <h3>Custom Spells</h3>

      <div class="hg-character-choice-grid">
        ${renderSection16CustomSpells()}
      </div>

      <div
        class="hg-character-field-grid three"
        style="margin-top: 12px;"
      >
        ${wizardField(
          "Spell Name",
          "ccNewSpellName",
          "",
          {
            placeholder:
              "Crimson Fireball"
          }
        )}

        ${wizardSelect(
          "Spell Level",
          "ccNewSpellLevel",
          0,
          levelChoices
        )}

        ${wizardSelect(
          "Class Source",
          "ccNewSpellClassId",
          spellClassChoices.length === 2
            ? spellClassChoices[1].value
            : "",
          spellClassChoices
        )}

        ${wizardSelect(
          "School",
          "ccNewSpellSchool",
          "Evocation",
          schoolChoices
        )}

        ${wizardField(
          "Casting Time",
          "ccNewSpellCastingTime",
          "1 action",
          {
            placeholder:
              "1 action"
          }
        )}

        ${wizardField(
          "Range",
          "ccNewSpellRange",
          "Self",
          {
            placeholder:
              "60 feet"
          }
        )}

        ${wizardField(
          "Duration",
          "ccNewSpellDuration",
          "Instantaneous",
          {
            placeholder:
              "1 minute"
          }
        )}

        ${wizardField(
          "Components",
          "ccNewSpellComponents",
          "",
          {
            placeholder:
              "V, S, M"
          }
        )}

        ${wizardField(
          "Spell Description",
          "ccNewSpellDescription",
          "",
          {
            type: "textarea",

            placeholder:
              "Describe the spell's effect, damage, saves, and scaling...",

            wide: true
          }
        )}
      </div>

      <div class="hg-character-inline-actions">
        <label>
          <input
            id="ccNewSpellRitual"
            type="checkbox"
          >

          Ritual
        </label>

        <label>
          <input
            id="ccNewSpellConcentration"
            type="checkbox"
          >

          Concentration
        </label>

        <label>
          <input
            id="ccNewSpellKnown"
            type="checkbox"
            checked
          >

          Start known
        </label>

        <label>
          <input
            id="ccNewSpellPrepared"
            type="checkbox"
          >

          Start prepared
        </label>

        <label>
          <input
            id="ccNewSpellManualOverride"
            type="checkbox"
          >

          Manual spell-level override
        </label>

        <button
          type="button"
          data-cc-action="add-custom-spell"
        >
          Add Custom Spell
        </button>
      </div>

      <hr>

      <h3>Feats</h3>

      <div class="hg-character-current-choice">
        <b>Selected feats:</b>
        ${getSection16SelectedFeats().length
          ? escapeHtml(
              getSection16SelectedFeats()
                .map((feat) => feat.name)
                .join(", ")
            )
          : "None"}
      </div>

      <div class="hg-character-field">
        <label for="ccDefaultFeatSearch">
          Search Feats
        </label>
        <input
          id="ccDefaultFeatSearch"
          type="search"
          value="${escapeHtml(
            section16FeatPickerState.query
          )}"
          placeholder="Search feat name, description, or tag..."
          data-cc-action-input="filter-default-feats"
          autocomplete="off"
        >
      </div>

      <p
        class="small"
        data-cc-default-feat-status="true"
      >
        Showing ${featPage.visibleCount} of
        ${featPage.total} matching feats.
      </p>

      <div
        class="hg-character-choice-grid"
        data-cc-default-feat-results="true"
      >
        ${featPage.html}
      </div>

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="show-more-default-feats"
          ${featPage.hasMore ? "" : "hidden"}
        >
          Load More Feats
        </button>
      </div>

      <hr>

      <h3>Class Features</h3>

      <div class="hg-character-choice-grid">
        ${renderSection16FeatureCards(
          creatorState.draft
            .features
            .classFeatures,

          "No class features are currently recorded."
        )}
      </div>

      <hr>

      <h3>Species Traits</h3>

      <div class="hg-character-choice-grid">
        ${renderSection16FeatureCards(
          creatorState.draft
            .features
            .speciesTraits,

          "No species traits are currently recorded."
        )}
      </div>

      <hr>

      <h3>Background Features</h3>

      <div class="hg-character-choice-grid">
        ${renderSection16FeatureCards(
          creatorState.draft
            .features
            .backgroundFeatures,

          "No background features are currently recorded."
        )}
      </div>

      <hr>

      <h3>Custom Features</h3>

      <div class="hg-character-choice-grid">
        ${renderSection16FeatureCards(
          getSection16CustomFeatures(),

          "No custom features have been added yet.",

          true
        )}
      </div>

      <div
        class="hg-character-field-grid three"
        style="margin-top: 12px;"
      >
        ${wizardField(
          "Feature Name",
          "ccNewFeatureName",
          "",
          {
            placeholder:
              "Blood Frenzy"
          }
        )}

        ${wizardField(
          "Feature Source",
          "ccNewFeatureSource",
          "custom",
          {
            placeholder:
              "Class, feat, item, blessing..."
          }
        )}

        ${wizardField(
          "Uses",
          "ccNewFeatureUses",
          "",
          {
            placeholder:
              "3 per long rest"
          }
        )}

        ${wizardField(
          "Recharge",
          "ccNewFeatureRecharge",
          "",
          {
            placeholder:
              "Short rest"
          }
        )}

        ${wizardField(
          "Feature Description",
          "ccNewFeatureSummary",
          "",
          {
            type: "textarea",

            placeholder:
              "Describe what the feature does...",

            wide: true
          }
        )}
      </div>

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="add-custom-feature"
        >
          Add Custom Feature
        </button>
      </div>

      <hr>

      <h3>Magic and Feature Notes</h3>

      <div class="hg-character-field-grid">
        ${wizardField(
          "Spellcasting Notes",
          "ccMagicNotes",

          safeDisplayString(
            magic.notes
          ),

          {
            type: "textarea",
            path: "magic.notes",

            placeholder:
              "Spellbook details, prepared spell rules, special casting limits...",

            wide: true
          }
        )}

        ${wizardField(
          "Feature Notes",
          "ccFeatureNotes",

          safeDisplayString(
            creatorState.draft
              .features
              .notes
          ),

          {
            type: "textarea",
            path: "features.notes",

            placeholder:
              "Extra details about features, traits, feats, or transformations...",

            wide: true
          }
        )}
      </div>
    `;
  }


  function refreshSection16SpellPicker() {
    return refreshSpellPickerView(
      section16SpellPickerState,
      section16SelectedSpellSourceIds
    );
  }

  function findSection16ActionElement(
    ...values
  ) {
    for (const value of values) {
      const candidates = [
        value,
        value?.target,
        value?.currentTarget,
        value?.element,
        value?.button,
        value?.control,
        value?.actionElement
      ];

      for (const candidate of candidates) {
        if (
          typeof Element !==
            "undefined" &&
          candidate instanceof Element
        ) {
          return (
            candidate.closest(
              "[data-cc-action]"
            ) ||
            candidate
          );
        }
      }
    }

    return null;
  }

  function handleSection16CalculateSpellcasting() {
    if (
      calculateSection16SpellcastingValues()
    ) {
      setStatus(
        "Spellcasting values calculated."
      );
    } else {
      setStatus(
        "Choose a spellcasting ability first."
      );
    }

    renderCreatorView();
  }

  function handleSection16AddSpell() {
    if (
      addSection16CustomSpell()
    ) {
      setStatus(
        "Custom spell added."
      );

      renderCreatorView();
    }
  }

  function handleSection16SpellAction(
    action,
    ...values
  ) {
    const button =
      findSection16ActionElement(
        ...values
      );

    const spellId =
      button?.dataset
        ?.spellId ||
      "";

    const sourceSelect =
      button?.closest("article")
        ?.querySelector(
          "[data-cc-spell-source-select]"
        );

    const sourceId = cleanString(
      sourceSelect?.value ||
      button?.dataset?.spellSourceId
    );

    let changed = false;

    if (
      action === "known"
    ) {
      changed =
        toggleSection16SpellKnown(
          spellId,
          sourceId
        );
    }

    if (
      action === "prepared"
    ) {
      changed =
        toggleSection16SpellPrepared(
          spellId,
          sourceId
        );
    }

    if (
      action === "arcanum"
    ) {
      changed =
        toggleSection16MysticArcanum(
          spellId,
          sourceId
        );
    }

    if (changed) {
      setStatus("Spell status updated.");
      refreshSection16SpellPicker();
    }
  }

  function handleSection16DefaultSpellSearch(
    { target, event }
  ) {
    const isSearch = target?.dataset?.ccActionInput === "filter-default-spells";
    const isSelectedOnly = target?.matches?.("[data-hg-selected-spells-only]");
    if (!isSearch && !isSelectedOnly) return false;
    if (isSelectedOnly && event?.type !== "change") return false;
    if (isSelectedOnly) {
      section16SpellPickerState.selectedOnly = target.checked;
      refreshSection16SpellPicker();
      return true;
    }
    section16SpellPickerState.query = cleanString(target.value).toLowerCase();
    clearTimeout(section16SpellPickerState.searchTimerId);
    section16SpellPickerState.searchTimerId = setTimeout(
      refreshSection16SpellPicker,
      CREATOR_SPELL_SEARCH_DEBOUNCE_MS
    );
    return true;
  }

  function refreshSection16FeatPicker() {
    if (typeof document === "undefined") {
      return;
    }

    const page = getSection16FeatPickerPage({
      query: section16FeatPickerState.query,
      visibleLimit:
        section16FeatPickerState.visibleLimit,
      pinnedIds:
        section16FeatPickerState.pinnedFeatId
          ? [
              section16FeatPickerState
                .pinnedFeatId
            ]
          : []
    });
    const results = document.querySelector(
      "[data-cc-default-feat-results]"
    );
    const status = document.querySelector(
      "[data-cc-default-feat-status]"
    );
    const loadMore = document.querySelector(
      '[data-cc-action="show-more-default-feats"]'
    );

    if (results) {
      results.innerHTML = page.html;
    }

    if (status) {
      status.textContent =
        `Showing ${page.visibleCount} of ${page.total} matching feats.`;
    }

    if (loadMore) {
      loadMore.hidden = !page.hasMore;
    }
  }

  function handleSection16DefaultFeatSearch(
    { target }
  ) {
    if (
      target?.dataset?.ccActionInput !==
      "filter-default-feats"
    ) {
      return false;
    }

    section16FeatPickerState.query =
      cleanString(target.value);
    section16FeatPickerState.visibleLimit =
      CREATOR_CATALOG_BATCH_SIZE;

    if (
      section16FeatPickerState.searchTimerId &&
      typeof clearTimeout === "function"
    ) {
      clearTimeout(
        section16FeatPickerState.searchTimerId
      );
    }

    if (typeof setTimeout !== "function") {
      refreshSection16FeatPicker();
      return true;
    }

    section16FeatPickerState.searchTimerId =
      setTimeout(() => {
        section16FeatPickerState.searchTimerId =
          null;
        refreshSection16FeatPicker();
      }, FEAT_CATALOG_SEARCH_DEBOUNCE_MS);

    return true;
  }

  function handleSection16SpellPickerAction(...values) {
    const control = findSection16ActionElement(...values);
    const action = control?.dataset?.ccAction;
    const level = Math.max(0, Math.min(9, safeNumber(control?.dataset?.spellLevel, 0)));
    if (action === "toggle-spell-level") {
      if (control.closest("details")?.open) section16SpellPickerState.openLevels.delete(level);
      else section16SpellPickerState.openLevels.add(level);
      refreshSection16SpellPicker();
      return;
    }
    if (action === "show-more-default-spells") {
      const visible = section16SpellPickerState.visibleByLevel.get(level) || CREATOR_SPELL_BATCH_SIZE;
      section16SpellPickerState.visibleByLevel.set(level, visible + CREATOR_SPELL_BATCH_SIZE);
    } else if (action === "toggle-default-spell-details") {
      const spellId = cleanString(control?.dataset?.spellId);
      if (section16SpellPickerState.expandedSpellIds.has(spellId)) section16SpellPickerState.expandedSpellIds.delete(spellId);
      else section16SpellPickerState.expandedSpellIds.add(spellId);
    }
    refreshSection16SpellPicker();
  }

  function handleSection16SpellSourceChange(
    { target }
  ) {
    const spellId = cleanString(
      target?.dataset
        ?.ccSpellSourceSelect
    );

    if (!spellId) {
      return false;
    }

    section16SelectedSpellSourceIds.set(
      spellId,
      cleanString(target.value)
    );

    refreshSection16SpellPicker();

    return true;
  }

  function handleSection16AddFeature() {
    if (
      addSection16CustomFeature()
    ) {
      setStatus(
        "Custom feature added."
      );

      renderCreatorView();
    }
  }

  function handleSection16ToggleFeat(
    ...values
  ) {
    const button = findSection16ActionElement(...values);
    const featId = button?.dataset?.featId || "";

    if (
      toggleSection16Feat(
        featId
      )
    ) {
      section16FeatPickerState.pinnedFeatId =
        featId;
      setStatus("Feat selection updated.");
      renderCreatorView();
    }
  }

  function handleSection16RemoveFeature(
    ...values
  ) {
    const button =
      findSection16ActionElement(
        ...values
      );

    const index =
      Math.round(
        safeNumber(
          button?.dataset?.index,
          -1
        )
      );

    if (
      removeSection16CustomFeature(
        index
      )
    ) {
      setStatus(
        "Custom feature removed."
      );

      renderCreatorView();
    }
  }


  function handleSection16RemoveSpell(
    ...values
  ) {
    const button =
      findSection16ActionElement(
        ...values
      );

    if (
      removeSection16CustomSpell(
        button?.dataset?.spellId || ""
      )
    ) {
      setStatus(
        "Custom spell removed."
      );
      renderCreatorView();
    }
  }

  async function handleStepClick(context) {
    const action =
      cleanString(context?.action);

    switch (action) {
      case "calculate-spellcasting-values":
        handleSection16CalculateSpellcasting();
        return true;
      case "add-custom-spell":
        handleSection16AddSpell();
        return true;
      case "toggle-spell-known":
        handleSection16SpellAction(
          "known",
          context
        );
        return true;
      case "toggle-spell-prepared":
        handleSection16SpellAction(
          "prepared",
          context
        );
        return true;
      case "toggle-spell-arcanum":
        handleSection16SpellAction(
          "arcanum",
          context
        );
        return true;
      case "remove-custom-spell":
        handleSection16RemoveSpell(
          context
        );
        return true;
      case "toggle-spell-level":
      case "show-more-default-spells":
      case "toggle-default-spell-details":
        handleSection16SpellPickerAction(
          context
        );
        return true;
      case "add-custom-feature":
        handleSection16AddFeature();
        return true;
      case "toggle-default-feat":
        handleSection16ToggleFeat(
          context
        );
        return true;
      case "show-more-default-feats":
        section16FeatPickerState.visibleLimit +=
          CREATOR_CATALOG_BATCH_SIZE;
        refreshSection16FeatPicker();
        return true;
      case "remove-custom-feature":
        handleSection16RemoveFeature(
          context
        );
        return true;
      default:
        return false;
    }
  }

  function handleStepInput(context) {
    return (
      handleSection16DefaultSpellSearch(
        context
      ) ||
      handleSection16DefaultFeatSearch(
        context
      )
    );
  }

  function handleStepChange(context) {
    if (
      handleSection16DefaultSpellSearch(
        context
      )
    ) {
      return true;
    }

    return handleSection16SpellSourceChange(
      context
    );
  }

  function validateStep(character) {
    return evaluateSpellChoices({
      classSelections:
        getPerClassSpellSelectionSummary(
          character
        ),
      spellSources:
        getCanonicalSpellSources(
          character
        ),
      rawSpellSources:
        safeNumber(
          character?.magic
            ?.spellSourceModelVersion,
          0
        ) >= SPELL_SOURCE_MODEL_VERSION
          ? character?.magic
              ?.spellSources ?? {}
          : null,
      resolveSpell: (spellId) => {
        return getSection16SpellById(
          spellId,
          character
        );
      }
    });
  }

  function getStepWarnings(character) {
    const validation =
      validateStep(character);

    return [
      ...validation.blockingErrors,
      ...validation.reminders
    ];
  }

  function isStepComplete(character) {
    return (
      validateStep(character)
        .blockingErrors.length === 0
    );
  }

  return Object.freeze({
    id: "spells",
    actions: SPELLS_STEP_ACTIONS,
    selectedSpellSourceIds:
      section16SelectedSpellSourceIds,
    spellPickerState:
      section16SpellPickerState,
    renderStep,
    handleStepClick,
    handleStepInput,
    handleStepChange,
    validateStep,
    normalizeStepData,
    getStepWarnings,
    isStepComplete,
    findActionElement:
      findSection16ActionElement,
    compatibility: Object.freeze({
      renderSpellsStep: renderStep,
      findSection16ActionElement,
      handleSection16CalculateSpellcasting,
      handleSection16AddSpell,
      handleSection16SpellAction,
      handleSection16DefaultSpellSearch,
      handleSection16SpellPickerAction,
      handleSection16SpellSourceChange,
      handleSection16AddFeature,
      handleSection16ToggleFeat,
      handleSection16RemoveFeature
    })
  });
}
