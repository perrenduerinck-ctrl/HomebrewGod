const ABILITIES_STEP_ACTIONS = Object.freeze([
  "refresh-level-progression",
  "calculate-character-hp",
  "reset-standard-array",
  "point-buy-decrease",
  "point-buy-increase",
  "reset-point-buy",
  "roll-ability-scores",
  "apply-rolled-scores"
]);

export function createAbilitiesStep(dependencies = {}) {
  const {
    applyCompatibilityAliases,
    beginnerNote,
    clampLevel,
    cleanString,
    escapeHtml,
    getCreatorState,
    markDraftChanged,
    renderCreatorView,
    safeDisplayString,
    safeNumber,
    setStatus,
    wizardField,
    wizardSelect
  } = dependencies.sharedServices || dependencies;
  const {
    ABILITY_DEFINITIONS,
    ABILITY_SCORE_METHODS,
    applySection11SpeciesMechanics,
    applySection12ClassDefaults,
    calculateAbilityModifier,
    calculateArmorClassOptions,
    calculateCharacterHitDice,
    calculateCharacterHp,
    calculateCharacterInitiative,
    calculateCharacterPassiveScores,
    calculateSection16SpellcastingValues,
    clearSection11SpeciesMechanics,
    findHpRollRawRecordForLevel,
    formatSection17Modifier,
    formatSignedNumber,
    getAbilityScore,
    getCharacterLevelHitDieRecords,
    getCharacterProficiencyBonus,
    getGenericProficiencyBonus,
    getHitDieSize,
    getHpRollRawRecords,
    getPrimaryClassEntry,
    getSafeClassName,
    getSelectedClassTemplate,
    getSpellcastingSummary,
    hpRollRawMatchesLevel,
    isMulticlassDraft,
    normalizeHpCalculation,
    normalizeHpRollRecordsForCharacter,
    recalculateAbilityTotals,
    refreshClassProgressionDerivedValues,
    refreshSelectedClassFeatures,
    renderMulticlassLevelBreakdown,
    renderMulticlassProgressionEditor,
    setCharacterLevel,
    setDraftValue,
    setSimpleDraftField,
    syncClassLevelOrderToClassLevels,
  } = dependencies;

  const creatorState = getCreatorState();

  const SECTION13_POINT_BUY_COSTS = Object.freeze({
    8: 0,
    9: 1,
    10: 2,
    11: 3,
    12: 4,
    13: 5,
    14: 7,
    15: 9
  });

  function getSection13AbilityName(abilityId) {
    return (
      ABILITY_DEFINITIONS.find((ability) => {
        return ability.id === abilityId;
      })?.name ||
      String(abilityId || "").toUpperCase()
    );
  }

  function getSection13AbilityScore(abilityId) {
    return Math.max(
      1,
      Math.min(
        30,
        Math.round(
          safeNumber(
            creatorState.draft
              .abilities
              .scores[abilityId],
            10
          )
        )
      )
    );
  }

  function getSection13BaseAbilityScore(abilityId) {
    return Math.max(
      1,
      Math.min(
        30,
        Math.round(
          safeNumber(
            creatorState.draft
              .abilities
              .base[abilityId],
            10
          )
        )
      )
    );
  }

  function getSection13AbilityBonus(abilityId) {
    return safeNumber(
      creatorState.draft
        .abilities
        .bonuses?.[abilityId],
      0
    );
  }

  function renderSection13AbilityScoreDetails(
    abilityId
  ) {
    const base =
      getSection13BaseAbilityScore(
        abilityId
      );

    const bonus =
      getSection13AbilityBonus(
        abilityId
      );

    const finalScore =
      getSection13AbilityScore(
        abilityId
      );

    const modifier =
      calculateAbilityModifier(
        finalScore
      );

    return `
      <p class="small">
        Base Score:
        <b>${base}</b>

        <br>

        Species/Other Bonuses:
        <b>${formatSignedNumber(bonus)}</b>

        <br>

        Final Score:
        <b>${finalScore}</b>

        <br>

        Modifier:
        <b>${formatSignedNumber(modifier)}</b>
      </p>
    `;
  }

  function setSection13AbilityMethod(method) {
    const validMethod =
      ABILITY_SCORE_METHODS.some((item) => {
        return item.id === method;
      })
        ? method
        : "manual";

    creatorState.draft
      .abilities
      .method = validMethod;

    if (validMethod === "standard-array") {
      applySection13StandardArray();
      return;
    }

    if (validMethod === "point-buy") {
      applySection13PointBuyDefaults();
      return;
    }

    if (
      validMethod === "rolled" &&
      !Array.isArray(
        creatorState.draft
          .abilities
          .assignmentPool
      )
    ) {
      creatorState.draft
        .abilities
        .assignmentPool = [];
    }

    markDraftChanged();
  }

  function applySection13Scores(scoreMap) {
    ABILITY_DEFINITIONS.forEach((ability) => {
      const score = Math.max(
        1,
        Math.min(
          30,
          Math.round(
            safeNumber(
              scoreMap?.[ability.id],
              10
            )
          )
        )
      );

      creatorState.draft
        .abilities
        .base[ability.id] = score;
    });

    recalculateAbilityTotals(
      creatorState.draft
    );

    creatorState.draft.builder.validation = {
      ...(creatorState.draft.builder.validation || {}),
      abilitiesTouched: true
    };

    applyCompatibilityAliases(
      creatorState.draft
    );

    if (
      creatorState.draft
        .magic
        .spellcastingAbility
    ) {
      calculateSection16SpellcastingValues({
        markDraft: false
      });
    }

    markDraftChanged();
    refreshSection13AbilitySummary();
  }

  function applySection13StandardArray() {
    creatorState.draft
      .abilities
      .method = "standard-array";

    creatorState.draft
      .abilities
      .assignmentPool = [
        15,
        14,
        13,
        12,
        10,
        8
      ];

    applySection13Scores({
      str: 15,
      dex: 14,
      con: 13,
      int: 12,
      wis: 10,
      cha: 8
    });
  }

  function assignSection13StandardScore(
    abilityId,
    newScore
  ) {
    const pool = [
      15,
      14,
      13,
      12,
      10,
      8
    ];

    const score = Math.round(
      safeNumber(newScore, 10)
    );

    if (!pool.includes(score)) {
      return false;
    }

    const currentScore =
      getSection13BaseAbilityScore(
        abilityId
      );

    const otherAbility =
      ABILITY_DEFINITIONS.find(
        (ability) => {
          return (
            ability.id !== abilityId &&
            getSection13BaseAbilityScore(
              ability.id
            ) === score
          );
        }
      );

    creatorState.draft
      .abilities
      .base[abilityId] = score;

    if (otherAbility) {
      creatorState.draft
        .abilities
        .base[otherAbility.id] =
          currentScore;
    }

    recalculateAbilityTotals(
      creatorState.draft
    );

    applyCompatibilityAliases(
      creatorState.draft
    );

    markDraftChanged();

    return true;
  }

  function applySection13PointBuyDefaults() {
    creatorState.draft
      .abilities
      .method = "point-buy";

    creatorState.draft
      .abilities
      .assignmentPool = [];

    applySection13Scores({
      str: 8,
      dex: 8,
      con: 8,
      int: 8,
      wis: 8,
      cha: 8
    });
  }

  function getSection13PointBuySpent() {
    return ABILITY_DEFINITIONS.reduce(
      (total, ability) => {
        const score = Math.max(
          8,
          Math.min(
            15,
            getSection13BaseAbilityScore(
              ability.id
            )
          )
        );

        return (
          total +
          safeNumber(
            SECTION13_POINT_BUY_COSTS[
              score
            ],
            0
          )
        );
      },
      0
    );
  }

  function changeSection13PointBuyScore(
    abilityId,
    direction
  ) {
    const currentScore = Math.max(
      8,
      Math.min(
        15,
        getSection13BaseAbilityScore(
          abilityId
        )
      )
    );

    const nextScore =
      currentScore + direction;

    if (
      nextScore < 8 ||
      nextScore > 15
    ) {
      return false;
    }

    const currentCost =
      SECTION13_POINT_BUY_COSTS[
        currentScore
      ];

    const nextCost =
      SECTION13_POINT_BUY_COSTS[
        nextScore
      ];

    const spent =
      getSection13PointBuySpent();

    const nextSpent =
      spent -
      currentCost +
      nextCost;

    if (nextSpent > 27) {
      setStatus(
        "Point buy cannot exceed 27 points."
      );

      return false;
    }

    creatorState.draft
      .abilities
      .base[abilityId] = nextScore;

    recalculateAbilityTotals(
      creatorState.draft
    );

    applyCompatibilityAliases(
      creatorState.draft
    );

    markDraftChanged();

    return true;
  }

  function rollSection13AbilityScore() {
    const rolls = Array.from(
      { length: 4 },
      () => {
        return (
          Math.floor(
            Math.random() * 6
          ) + 1
        );
      }
    ).sort((a, b) => a - b);

    return rolls
      .slice(1)
      .reduce(
        (total, roll) => {
          return total + roll;
        },
        0
      );
  }

  function rollSection13ScorePool() {
    creatorState.draft
      .abilities
      .method = "rolled";

    creatorState.draft
      .abilities
      .assignmentPool =
        Array.from(
          { length: 6 },
          () => {
            return rollSection13AbilityScore();
          }
        );

    markDraftChanged();

    return creatorState.draft
      .abilities
      .assignmentPool;
  }

  function applySection13RolledScores() {
    const pool =
      Array.isArray(
        creatorState.draft
          .abilities
          .assignmentPool
      )
        ? creatorState.draft
            .abilities
            .assignmentPool
        : [];

    if (pool.length !== 6) {
      alert(
        "Roll six scores before applying them."
      );

      return false;
    }

    const scoreMap = {};

    ABILITY_DEFINITIONS.forEach(
      (ability, index) => {
        scoreMap[ability.id] =
          safeNumber(
            pool[index],
            10
          );
      }
    );

    applySection13Scores(
      scoreMap
    );

    return true;
  }

  function getSection13HitDieSize() {
    const selectedClass =
      getSelectedClassTemplate();

    const text = String(
      selectedClass?.hitDie ||
      "d8"
    );

    return Math.max(
      4,
      Math.round(
        safeNumber(
          text.replace(/[^0-9]/g, ""),
          8
        )
      )
    );
  }

  function calculateSection13SuggestedHp() {
    const selectedClass =
      getSelectedClassTemplate();

    if (!selectedClass) {
      return null;
    }

    return calculateCharacterHp(
      creatorState.draft
    ).maximumHp;
  }

  function formatSection13HpRolls(
    values
  ) {
    return Array.isArray(values)
      ? values
          .map((value) => {
            return value &&
              typeof value === "object" &&
              !Array.isArray(value)
              ? safeNumber(value.roll, 0)
              : safeNumber(value, 0);
          })
          .filter((value) => {
            return value > 0;
          })
          .join(", ")
      : "";
  }

  function parseSection13HpRolls(
    value
  ) {
    return String(value || "")
      .split(/[\n,]+/)
      .map((item) => {
        return Math.round(
          safeNumber(item.trim(), 0)
        );
      })
      .filter((item) => {
        return item > 0;
      });
  }

  function createSection13HpRollRecord(
    levelRecord,
    roll
  ) {
    const dieSize =
      getHitDieSize(
        levelRecord?.hitDie
      );

    return {
      characterLevel:
        Math.max(
          2,
          Math.round(
            safeNumber(
              levelRecord?.characterLevel,
              2
            )
          )
        ),
      classId:
        cleanString(
          levelRecord?.classId
        ),
      classEntryId:
        cleanString(
          levelRecord?.classEntryId
        ),
      className:
        cleanString(
          levelRecord?.className,
          "Class"
        ),
      hitDie:
        cleanString(
          levelRecord?.hitDie,
          "d8"
        ),
      roll:
        Math.max(
          1,
          Math.min(
            dieSize,
            Math.round(
              safeNumber(
                roll,
                Math.floor(dieSize / 2) + 1
              )
            )
          )
        )
    };
  }

  function getSection13HpRollState(
    character = creatorState.draft,
    hpCalculation =
      normalizeHpCalculation(
        character?.combat?.hpCalculation,
        character?.combat?.maxHp
      )
  ) {
    const levelRecords =
      getCharacterLevelHitDieRecords(
        character
      );

    const laterLevels =
      levelRecords.slice(1);

    const rawRecords =
      getHpRollRawRecords(
        hpCalculation.laterLevelValues
      );

    const activeRolls =
      normalizeHpRollRecordsForCharacter(
        hpCalculation.laterLevelValues,
        character
      );

    const usedIndexes = new Set();
    const matchedLevelByRawIndex =
      new Map();

    laterLevels.forEach(
      (levelRecord, laterLevelIndex) => {
        const rawRecord =
          findHpRollRawRecordForLevel({
            rawRecords,
            usedIndexes,
            levelRecord,
            laterLevelIndex
          });

        if (!rawRecord) {
          return;
        }

        usedIndexes.add(
          rawRecord.rawIndex
        );
        matchedLevelByRawIndex.set(
          rawRecord.rawIndex,
          levelRecord
        );
      }
    );

    const warnings = [];

    rawRecords.forEach((rawRecord) => {
      const activeLevel =
        matchedLevelByRawIndex.get(
          rawRecord.rawIndex
        );

      if (!activeLevel) {
        warnings.push(
          `Stored rolled HP for level ${rawRecord.characterLevel} is inactive or incompatible after the current class level changes.`
        );

        return;
      }

      if (
        !hpRollRawMatchesLevel(
          rawRecord,
          activeLevel
        )
      ) {
        warnings.push(
          `Level ${rawRecord.characterLevel} now uses ${activeLevel.className || "Class"} ${activeLevel.hitDie || "d8"}; the stored roll is adjusted to that Hit Die.`
        );
      }

      const dieSize =
        getHitDieSize(
          activeLevel.hitDie
        );

      if (rawRecord.roll > dieSize) {
        warnings.push(
          `Level ${rawRecord.characterLevel} rolled HP is capped at ${activeLevel.hitDie || `d${dieSize}`}.`
        );
      }
    });

    return {
      levelRecords,
      laterLevels,
      activeRolls,
      rawRecords,
      inactiveRecords:
        rawRecords.filter((record) => {
          return !usedIndexes.has(
            record.rawIndex
          );
        }),
      warnings: [
        ...new Set(warnings)
      ]
    };
  }

  function setSection13HpRollValue(
    characterLevel,
    rawValue
  ) {
    const hpCalculation =
      normalizeHpCalculation(
        creatorState.draft
          .combat
          .hpCalculation,
        creatorState.draft
          .combat
          .maxHp
      );

    const levelNumber =
      Math.max(
        2,
        Math.round(
          safeNumber(characterLevel, 2)
        )
      );

    const rollState =
      getSection13HpRollState(
        creatorState.draft,
        hpCalculation
      );

    const levelRecord =
      rollState.laterLevels.find(
        (record) => {
          return (
            record.characterLevel ===
            levelNumber
          );
        }
      );

    if (!levelRecord) {
      return false;
    }

    const nextActiveRolls =
      rollState.activeRolls.map(
        (record) => {
          if (
            record.characterLevel !==
            levelNumber
          ) {
            return record;
          }

          return createSection13HpRollRecord(
            levelRecord,
            rawValue
          );
        }
      );

    const inactiveRolls =
      rollState.inactiveRecords
        .map((record) => {
          return {
            characterLevel:
              record.characterLevel,
            classId:
              record.classId,
            classEntryId:
              record.classEntryId,
            className:
              record.className,
            hitDie:
              record.hitDie,
            roll:
              record.roll
          };
        });

    creatorState.draft
      .combat
      .hpCalculation = {
        ...hpCalculation,
        laterLevelValues: [
          ...nextActiveRolls,
          ...inactiveRolls
        ]
      };

    applyCompatibilityAliases(
      creatorState.draft
    );

    markDraftChanged();

    return true;
  }

  function renderSection13RolledHpInputs(
    hpCalculation
  ) {
    const rollState =
      getSection13HpRollState(
        creatorState.draft,
        hpCalculation
      );

    if (!rollState.levelRecords.length) {
      return `
        <div class="hg-character-placeholder">
          Choose a class before entering rolled HP.
        </div>
      `;
    }

    const rollByLevel =
      new Map(
        rollState.activeRolls.map((roll) => {
          return [
            roll.characterLevel,
            roll
          ];
        })
      );

    const warningHtml =
      rollState.warnings.length
        ? `
          <div class="hg-character-warning">
            ${rollState.warnings
              .map((warning) => {
                return `<p>${escapeHtml(warning)}</p>`;
              })
              .join("")}
          </div>
        `
        : "";

    return `
      <hr>

      <h3>Rolled HP by Level</h3>

      ${warningHtml}

      <div class="hg-character-choice-grid">
        ${rollState.levelRecords
          .map((levelRecord) => {
            const dieSize =
              getHitDieSize(
                levelRecord.hitDie
              );

            const rollRecord =
              rollByLevel.get(
                levelRecord.characterLevel
              );

            const isFirstLevel =
              levelRecord.characterLevel === 1;

            return `
              <article class="hg-character-choice-card">
                <h3>
                  Level ${levelRecord.characterLevel}
                </h3>

                <p>
                  <b>Class:</b>
                  ${escapeHtml(
                    levelRecord.className ||
                    "Class"
                  )}

                  <br>

                  <b>Hit Die:</b>
                  ${escapeHtml(
                    levelRecord.hitDie ||
                    "d8"
                  )}
                </p>

                ${
                  isFirstLevel
                    ? `
                      <p class="small">
                        Level 1 uses the full Hit Die unless the Level 1 HP Override field is set.
                      </p>
                    `
                    : `
                      <div class="hg-character-field">
                        <label for="ccHpRollLevel-${levelRecord.characterLevel}">
                          Roll
                        </label>

                        <input
                          id="ccHpRollLevel-${levelRecord.characterLevel}"
                          type="number"
                          min="1"
                          max="${dieSize}"
                          step="1"
                          value="${escapeHtml(
                            rollRecord?.roll ?? ""
                          )}"
                          data-hp-roll-level="${levelRecord.characterLevel}"
                          data-hp-roll-hit-die="${escapeHtml(
                            levelRecord.hitDie ||
                            "d8"
                          )}"
                        >

                        <p class="small">
                          Enter 1-${dieSize}; this roll is capped by ${escapeHtml(
                            levelRecord.hitDie ||
                            `d${dieSize}`
                          )}.
                        </p>
                      </div>
                    `
                }
              </article>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function applySection13SuggestedHp() {
    const selectedClass =
      getSelectedClassTemplate();

    if (!selectedClass) {
      alert(
        "Choose a class before calculating HP."
      );

      return null;
    }

    const hpSummary =
      calculateCharacterHp(
        creatorState.draft
      );

    creatorState.draft
      .combat
      .maxHp = hpSummary.maximumHp;

    creatorState.draft
      .combat
      .currentHp = hpSummary.maximumHp;

    creatorState.draft
      .combat
      .hpCalculation =
        normalizeHpCalculation(
          {
          ...creatorState.draft
            .combat
            .hpCalculation,
          lastCalculatedConModifier:
              calculateAbilityModifier(
                getSection13AbilityScore(
                  "con"
                )
              )
          },
          hpSummary.maximumHp
        );

    applyCompatibilityAliases(
      creatorState.draft
    );

    markDraftChanged();

    return hpSummary.maximumHp;
  }

  function refreshSection13LevelProgression() {
    if (isMulticlassDraft()) {
      refreshClassProgressionDerivedValues();
      markDraftChanged();

      return true;
    }

    const selectedClass =
      getSelectedClassTemplate();

    const level = clampLevel(
      creatorState.draft
        .classProgression
        .totalLevel
    );

    const primaryClass =
      getPrimaryClassEntry(
        creatorState.draft
      );

    if (primaryClass) {
      primaryClass.level = level;
    }

    syncClassLevelOrderToClassLevels(
      creatorState.draft
    );

    creatorState.draft
      .combat
      .proficiencyBonus =
        getGenericProficiencyBonus(
          level
        );

    clearSection11SpeciesMechanics();
    applySection11SpeciesMechanics();

    if (
      selectedClass &&
      typeof applySection12ClassDefaults ===
        "function"
    ) {
      applySection12ClassDefaults(
        selectedClass
      );
    } else if (
      typeof refreshSelectedClassFeatures ===
      "function"
    ) {
      refreshSelectedClassFeatures();
    }

    applyCompatibilityAliases(
      creatorState.draft
    );

    markDraftChanged();
  }

  function renderSection13HitDice() {
    const hitDice =
      calculateCharacterHitDice(
        creatorState.draft
      );

    if (!hitDice.length) {
      return `
        <div class="hg-character-placeholder">
          No hit dice are currently recorded.
        </div>
      `;
    }

    return hitDice
      .map((entry) => {
        return `
          <article class="hg-character-choice-card">
            <h3>
              ${escapeHtml(
                entry.className ||
                getSafeClassName() ||
                "Class"
              )}
            </h3>

            <p>
              ${Math.max(
                1,
                Math.round(
                  safeNumber(
                    entry.count,
                    1
                  )
                )
              )}

              ${escapeHtml(
                entry.die ||
                "d8"
              )}

              hit dice
            </p>
          </article>
        `;
      })
      .join("");
  }

  function renderSection13HpGuide() {
    const draft = creatorState.draft;

    const level = clampLevel(
      draft.classProgression.totalLevel
    );

    const selectedClass =
      getSelectedClassTemplate();

    const hitDie =
      selectedClass?.hitDie || "d8";

    const dieSize = getHitDieSize(hitDie);

    const constitutionModifier =
      calculateAbilityModifier(
        getAbilityScore(draft, "con")
      );

    const levelOneHp = Math.max(
      1,
      dieSize + constitutionModifier
    );

    const fixedDieAverage =
      Math.floor(dieSize / 2) + 1;

    const fixedLaterGain = Math.max(
      1,
      fixedDieAverage +
      constitutionModifier
    );

    return `
      <div class="hg-character-current-choice">
        <b>Level 1 HP:</b>
        Hit die maximum (${dieSize}) + Constitution modifier
        (${formatSignedNumber(
          constitutionModifier
        )}) = ${levelOneHp} HP.

        <br>

        <b>Later Levels:</b>
        Choose the fixed average or enter a roll for each level.
        Die averages are d6 = 4, d8 = 5, d10 = 6, and d12 = 7.
        Add your Constitution modifier each level; the minimum gain
        is 1 HP per level. Your current fixed gain is
        ${fixedLaterGain} HP per later level.

        <br>

        <b>Hit Dice:</b>
        Each class keeps its own pool. This level ${level} character
        currently has ${escapeHtml(
          calculateCharacterHitDice(draft)
            .map((entry) => {
              return `${entry.count}${entry.die} ${entry.className}`;
            })
            .join(", ") ||
            `${level}${hitDie}`
        )}.
        Hit-die count in each pool equals that class's level.
      </div>
    `;
  }

  function renderSection13ArmorClassGuide() {
    const draft = creatorState.draft;

    const dexterityModifier =
      calculateAbilityModifier(
        getAbilityScore(draft, "dex")
      );

    const constitutionModifier =
      calculateAbilityModifier(
        getAbilityScore(draft, "con")
      );

    const wisdomModifier =
      calculateAbilityModifier(
        getAbilityScore(draft, "wis")
      );

    const armorClass =
      calculateArmorClassOptions(draft)
        .selected;

    return `
      <div class="hg-character-current-choice">
        <b>Armor Class Basics:</b>
        Unarmored AC = 10 + Dexterity modifier
        (${formatSignedNumber(
          dexterityModifier
        )}). Light armor = armor base + full Dexterity modifier.
        Medium armor = armor base + Dexterity modifier, maximum +2.
        Heavy armor uses its armor base with no Dexterity modifier.

        <br>

        <b>Shields:</b>
        An equipped shield adds +2 AC before any magical bonus.

        <br>

        <b>Class Defenses:</b>
        Barbarian Unarmored Defense = 10 + Dexterity
        (${formatSignedNumber(
          dexterityModifier
        )}) + Constitution (${formatSignedNumber(
          constitutionModifier
        )}). Monk Unarmored Defense = 10 + Dexterity
        (${formatSignedNumber(
          dexterityModifier
        )}) + Wisdom (${formatSignedNumber(
          wisdomModifier
        )}) and cannot use a shield. If more than one unarmored
        formula is available, select one formula; their ability
        modifiers never combine.

        <br>

        <b>Current AC:</b>
        ${armorClass.total} using
        ${escapeHtml(armorClass.label)}
        (${escapeHtml(armorClass.breakdown)}).
        Manual override remains available in the AC controls below.
      </div>
    `;
  }

  function renderLevelStep(options = {}) {
    const draft =
      creatorState.draft;

    const hideLevelInput =
      options.hideLevelInput === true;

    const isMulticlass =
      isMulticlassDraft(draft);

    const level = clampLevel(
      draft.classProgression
        .totalLevel
    );

    const selectedClass =
      getSelectedClassTemplate();

    const suggestedHp =
      calculateSection13SuggestedHp();

    const suggestedHpLabel =
      suggestedHp === null
        ? "Choose a class to calculate"
        : suggestedHp;

    const hpSummary =
      calculateCharacterHp(draft);

    const hpCalculation =
      normalizeHpCalculation(
        draft.combat.hpCalculation,
        draft.combat.maxHp
      );

    const armorClass =
      calculateArmorClassOptions(draft)
        .selected;

    const armorClassOptions =
      calculateArmorClassOptions(draft)
        .options;

    const initiative =
      calculateCharacterInitiative(draft);

    const hpModeChoices = [
      {
        value: "fixed",
        label: "Fixed Average"
      },
      {
        value: "rolled",
        label: "Rolled"
      },
      {
        value: "manual",
        label: "Manual Override"
      }
    ];

    const armorClassModeChoices = [
      {
        value: "auto",
        label: "Automatic"
      },
      {
        value: "manual",
        label: "Manual Override"
      }
    ];

    const armorClassMethodChoices =
      armorClassOptions.map((option) => {
        return {
          value: option.id,
          label:
            `${option.label} (${option.total})`
        };
      });

    return `
      ${
        isMulticlass
          ? `
            ${renderMulticlassProgressionEditor(
              draft
            )}

            ${renderMulticlassLevelBreakdown(
              draft
            )}
          `
          : ""
      }

      ${renderSection13HpGuide()}

      ${renderSection13ArmorClassGuide()}

      <div class="hg-character-current-choice">
        <b>Current progression:</b>

        Level ${level}

        ${escapeHtml(
          getSafeClassName() ||
          "No class selected"
        )}

        <br>

        <b>Proficiency Bonus:</b>

        +${Math.max(
          0,
          getCharacterProficiencyBonus(
            draft
          )
        )}

        <br>

        <b>Calculated HP:</b>

        ${hpSummary.maximumHp}

        <span class="small">
          (${escapeHtml(hpSummary.mode)}, ${escapeHtml(hpSummary.hitDie)}${
            hpSummary.speciesHpBonus
              ? `, Dwarven Toughness +${hpSummary.speciesHpBonus}`
              : ""
          })
        </span>

        <br>

        <b>Calculated AC:</b>

        ${armorClass.total}

        <span class="small">
          (${escapeHtml(armorClass.label)})
        </span>

        <br>

        <b>Calculated Initiative:</b>

        ${formatSection17Modifier(
          initiative.total
        )}
      </div>

      <div class="hg-character-field-grid three">
        ${
          hideLevelInput
            ? ""
            : wizardField(
                isMulticlass
                  ? "Total Character Level"
                  : "Class Level",
                "ccCharacterLevel",
                level,
                {
                  type: "number",
                  valueType: "integer",
                  extra:
                    `min="1" max="20" step="1" data-level-input="true"${
                      isMulticlass
                        ? ' disabled data-multiclass-total="true"'
                        : ""
                    }`
                }
              )
        }

        ${wizardSelect(
          "HP Calculation",
          "ccHpCalculationMode",
          hpCalculation.mode,
          hpModeChoices,
          {
            path:
              "combat.hpCalculation.mode"
          }
        )}

        ${wizardField(
          "Level 1 HP Override",
          "ccHpLevelOneValue",
          hpCalculation.levelOneValue === null
            ? ""
            : hpCalculation.levelOneValue,
          {
            type: "number",
            path:
              "combat.hpCalculation.levelOneValue",
            valueType: "number",
            extra:
              'min="1" step="1"'
          }
        )}

        ${wizardField(
          "Manual HP Override",
          "ccHpManualOverride",
          hpCalculation.manualOverride === null
            ? ""
            : hpCalculation.manualOverride,
          {
            type: "number",
            path:
              "combat.hpCalculation.manualOverride",
            valueType: "number",
            extra:
              'min="1" step="1"'
          }
        )}

        ${wizardField(
          "Maximum HP",
          "ccMaximumHp",
          draft.combat.maxHp,
          {
            type: "number",
            path: "combat.maxHp",
            valueType: "number",
            extra:
              'min="1" step="1"'
          }
        )}

        ${wizardField(
          "Current HP",
          "ccCurrentHp",
          draft.combat.currentHp,
          {
            type: "number",
            path: "combat.currentHp",
            valueType: "number",
            extra:
              'min="0" step="1"'
          }
        )}

        ${wizardField(
          "Temporary HP",
          "ccTemporaryHp",
          draft.combat.temporaryHp,
          {
            type: "number",
            path: "combat.temporaryHp",
            valueType: "number",
            extra:
              'min="0" step="1"'
          }
        )}

        ${wizardSelect(
          "Armor Class Mode",
          "ccArmorClassMode",
          draft.combat.armorClassMode,
          armorClassModeChoices,
          {
            path:
              "combat.armorClassMode"
          }
        )}

        ${
          armorClassMethodChoices.length
            ? wizardSelect(
                "AC Calculation",
                "ccSelectedArmorClassMethod",
                draft.combat.selectedArmorClassMethod ||
                armorClass.id,
                armorClassMethodChoices,
                {
                  path:
                    "combat.selectedArmorClassMethod"
                }
              )
            : ""
        }

        ${wizardField(
          "Manual AC",
          "ccManualArmorClass",
          draft.combat.manualArmorClass ??
          draft.combat.armorClass,
          {
            type: "number",
            path: "combat.manualArmorClass",
            valueType: "number",
            extra:
              'min="0" step="1"'
          }
        )}

        ${wizardField(
          "AC Bonus",
          "ccArmorClassBonus",
          draft.combat.armorClassBonus,
          {
            type: "number",
            path:
              "combat.armorClassBonus",
            valueType: "number",
            extra:
              'step="1"'
          }
        )}

        ${wizardField(
          "Initiative Bonus",
          "ccInitiativeBonus",
          draft.combat.initiativeBonus,
          {
            type: "number",
            path: "combat.initiativeBonus",
            valueType: "number",
            extra:
              'step="1"'
          }
        )}
      </div>

      ${
        hpCalculation.mode === "rolled"
          ? renderSection13RolledHpInputs(
              hpCalculation
            )
          : ""
      }

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="refresh-level-progression"
        >
          Refresh Level Progression
        </button>

        <button
          type="button"
          data-cc-action="calculate-character-hp"
          ${suggestedHp === null ? "disabled" : ""}
        >
          Apply Calculated HP (${hpSummary.maximumHp || suggestedHpLabel})
        </button>
      </div>

      <hr>

      <h3>Movement Speeds</h3>

      <p class="small">
        Enter base speeds here. Class, subclass, and feat bonuses are added automatically. Final speeds are capped at 100 feet.
      </p>

      <div class="hg-character-current-choice">
        <b>Final movement:</b>
        Walk ${draft.combat.speed.walk} ft.,
        climb ${draft.combat.speed.climb} ft.,
        swim ${draft.combat.speed.swim} ft.,
        fly ${draft.combat.speed.fly} ft.,
        burrow ${draft.combat.speed.burrow} ft.
      </div>

      <div class="hg-character-field-grid three">
        ${wizardField(
          "Base Walking Speed",
          "ccWalkSpeed",
          draft.combat.baseSpeed.walk,
          {
            type: "number",
            path: "combat.baseSpeed.walk",
            valueType: "number",
            extra:
              'min="0" max="100" step="1"'
          }
        )}

        ${wizardField(
          "Base Climbing Speed",
          "ccClimbSpeed",
          draft.combat.baseSpeed.climb,
          {
            type: "number",
            path: "combat.baseSpeed.climb",
            valueType: "number",
            extra:
              'min="0" max="100" step="1"'
          }
        )}

        ${wizardField(
          "Base Swimming Speed",
          "ccSwimSpeed",
          draft.combat.baseSpeed.swim,
          {
            type: "number",
            path: "combat.baseSpeed.swim",
            valueType: "number",
            extra:
              'min="0" max="100" step="1"'
          }
        )}

        ${wizardField(
          "Base Flying Speed",
          "ccFlySpeed",
          draft.combat.baseSpeed.fly,
          {
            type: "number",
            path: "combat.baseSpeed.fly",
            valueType: "number",
            extra:
              'min="0" max="100" step="1"'
          }
        )}

        ${wizardField(
          "Base Burrowing Speed",
          "ccBurrowSpeed",
          draft.combat.baseSpeed.burrow,
          {
            type: "number",
            path: "combat.baseSpeed.burrow",
            valueType: "number",
            extra:
              'min="0" max="100" step="1"'
          }
        )}

        ${wizardField(
          "Special Movement Notes",
          "ccSpecialMovement",
          safeDisplayString(
            draft.combat.speed.special
          ),
          {
            path: "combat.baseSpeed.special",
            placeholder:
              "Hover, teleport, conditional movement..."
          }
        )}
      </div>

      <hr>

      <h3>Hit Dice</h3>

      <p>
        ${
          isMulticlass
            ? "This class progression currently uses class-specific"
            : "The selected class currently uses a"
        }
        <b>${escapeHtml(
          isMulticlass
            ? "hit dice"
            : selectedClass?.hitDie ||
              "d8"
        )}</b>
        ${isMulticlass ? "." : "hit die."}
      </p>

      <div class="hg-character-choice-grid">
        ${renderSection13HitDice()}
      </div>
    `;
  }

  function renderSection13ManualAbilities() {
    return `
      <div class="hg-character-choice-grid">
        ${ABILITY_DEFINITIONS.map(
          (ability) => {
            return `
              <article class="hg-character-choice-card">
                <h3>
                  ${escapeHtml(
                    ability.name
                  )}
                </h3>

                ${wizardField(
                  "Base Score",
                  `ccAbility-${ability.id}`,
                  getSection13BaseAbilityScore(
                    ability.id
                  ),
                  {
                    type: "number",
                    extra:
                      `min="1" max="30" step="1" data-ability-id="${escapeHtml(
                        ability.id
                      )}"`
                  }
                )}

                ${renderSection13AbilityScoreDetails(
                  ability.id
                )}
              </article>
            `;
          }
        ).join("")}
      </div>
    `;
  }

  function renderSection13StandardArray() {
    const choices = [
      15,
      14,
      13,
      12,
      10,
      8
    ].map((score) => {
      return {
        value: score,
        label: String(score)
      };
    });

    return `
      <div class="hg-character-warning">
        Each score can only be assigned once. Choosing a
        score already in use swaps the two abilities.
      </div>

      <div class="hg-character-choice-grid">
        ${ABILITY_DEFINITIONS.map(
          (ability) => {
            return `
              <article class="hg-character-choice-card">
                <h3>
                  ${escapeHtml(
                    ability.name
                  )}
                </h3>

                ${wizardSelect(
                  "Base Score",
                  `ccStandard-${ability.id}`,
                  getSection13BaseAbilityScore(
                    ability.id
                  ),
                  choices,
                  {
                    extra:
                      `data-standard-ability-id="${escapeHtml(
                        ability.id
                      )}"`
                  }
                )}

                ${renderSection13AbilityScoreDetails(
                  ability.id
                )}
              </article>
            `;
          }
        ).join("")}
      </div>

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="reset-standard-array"
        >
          Reset Standard Array
        </button>
      </div>
    `;
  }

  function renderSection13PointBuy() {
    const spent =
      getSection13PointBuySpent();

    const remaining =
      Math.max(0, 27 - spent);

    return `
      <div class="hg-character-current-choice">
        <b>Points spent:</b>
        ${spent} / 27

        <br>

        <b>Points remaining:</b>
        ${remaining}
      </div>

      <div class="hg-character-choice-grid">
        ${ABILITY_DEFINITIONS.map(
          (ability) => {
            const baseScore =
              Math.max(
                8,
                Math.min(
                  15,
                  getSection13BaseAbilityScore(
                    ability.id
                  )
                )
              );

            const cost =
              SECTION13_POINT_BUY_COSTS[
                baseScore
              ];

            return `
              <article class="hg-character-choice-card">
                <h3>
                  ${escapeHtml(
                    ability.name
                  )}
                </h3>

                <p>
                  <b>Base Score:</b>
                  ${baseScore}

                  <br>

                  <b>Species/Other Bonuses:</b>
                  ${formatSignedNumber(
                    getSection13AbilityBonus(
                      ability.id
                    )
                  )}

                  <br>

                  <b>Final Score:</b>
                  ${getSection13AbilityScore(
                    ability.id
                  )}

                  <br>

                  <b>Modifier:</b>
                  ${formatSignedNumber(
                    calculateAbilityModifier(
                      getSection13AbilityScore(
                        ability.id
                      )
                    )
                  )}

                  <br>

                  <b>Cost:</b>
                  ${cost}
                </p>

                <div class="hg-character-card-actions">
                  <button
                    type="button"
                    data-cc-action="point-buy-decrease"
                    data-ability-id="${escapeHtml(
                      ability.id
                    )}"
                    ${baseScore <= 8 ? "disabled" : ""}
                  >
                    −
                  </button>

                  <button
                    type="button"
                    data-cc-action="point-buy-increase"
                    data-ability-id="${escapeHtml(
                      ability.id
                    )}"
                    ${baseScore >= 15 ? "disabled" : ""}
                  >
                    +
                  </button>
                </div>
              </article>
            `;
          }
        ).join("")}
      </div>

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="reset-point-buy"
        >
          Reset Point Buy
        </button>
      </div>
    `;
  }

  function renderSection13RolledAbilities() {
    const pool =
      Array.isArray(
        creatorState.draft
          .abilities
          .assignmentPool
      )
        ? creatorState.draft
            .abilities
            .assignmentPool
        : [];

    return `
      <div class="hg-character-current-choice">
        <b>Rolled pool:</b>

        ${escapeHtml(
          pool.length
            ? pool.join(", ")
            : "No scores rolled yet"
        )}
      </div>

      <div class="hg-character-inline-actions">
        <button
          type="button"
          data-cc-action="roll-ability-scores"
        >
          Roll 4d6, Drop Lowest
        </button>

        <button
          type="button"
          data-cc-action="apply-rolled-scores"
          ${pool.length === 6 ? "" : "disabled"}
        >
          Apply Rolls in Order
        </button>
      </div>

      <p class="small">
        Rolls are applied in this order:
        Strength, Dexterity, Constitution,
        Intelligence, Wisdom, Charisma.
        After applying them, you can still edit the
        base scores manually below.
      </p>

      ${renderSection13ManualAbilities()}
    `;
  }

  function renderSection13AbilitySummary() {
    return `
      <div class="hg-character-choice-grid">
        ${ABILITY_DEFINITIONS.map(
          (ability) => {
            const score =
              getSection13AbilityScore(
                ability.id
              );

            const modifier =
              calculateAbilityModifier(
                score
              );

            const bonus =
              getSection13AbilityBonus(
                ability.id
              );

            return `
              <article class="hg-character-choice-card">
                <h3>
                  ${escapeHtml(
                    ability.name
                  )}
                </h3>

                <p>
                  <b>Base Score:</b>
                  ${getSection13BaseAbilityScore(
                    ability.id
                  )}

                  <br>

                  <b>Species/Other Bonuses:</b>
                  ${formatSignedNumber(bonus)}

                  <br>

                  <b>Final Score:</b>
                  ${score}

                  <br>

                  <b>Modifier:</b>
                  ${formatSignedNumber(modifier)}
                </p>
              </article>
            `;
          }
        ).join("")}
      </div>

      ${renderSection13DerivedMechanics()}
    `;
  }

  function renderSection13MechanicsGuide() {
    return `
      <div class="hg-character-current-choice">
        <b>Standard Array:</b> 15, 14, 13, 12, 10, 8.
        Assign each number once.

        <br>

        <b>Manual Entry:</b> Enter each base score directly.
        Ability modifiers update automatically using
        (score - 10) divided by 2, rounded down.

        <br>

        <b>Proficiency Bonus by Total Level:</b>
        levels 1-4: +2; 5-8: +3; 9-12: +4;
        13-16: +5; 17-20: +6.

        <br>

        <b>Common formulas:</b>
        Initiative = Dexterity modifier + bonuses.
        Passive Perception = 10 + Perception bonus.
        Spell save DC = 8 + proficiency bonus + spellcasting
        ability modifier. Spell attack = proficiency bonus +
        spellcasting ability modifier.
      </div>
    `;
  }

  function renderSection13DerivedMechanics() {
    const draft = creatorState.draft;

    const totalLevel = clampLevel(
      draft.classProgression.totalLevel
    );

    const proficiencyBonus =
      getGenericProficiencyBonus(totalLevel);

    const initiative =
      calculateCharacterInitiative(draft);

    const passivePerception =
      calculateCharacterPassiveScores(
        draft
      ).perception || {
        skillModifier: 0,
        total: 10
      };

    const spellcastingClasses =
      getSpellcastingSummary(draft)
        .classes
        .filter((entry) => {
          return (
            entry.spellSaveDc !== null &&
            entry.spellAttackBonus !== null
          );
        });

    const spellcastingSummary =
      spellcastingClasses.length
        ? spellcastingClasses
            .map((entry) => {
              return `
                <b>${escapeHtml(entry.className)}:</b>
                DC ${entry.spellSaveDc}, attack
                ${formatSignedNumber(
                  entry.spellAttackBonus
                )}
              `;
            })
            .join("<br>")
        : "No spellcasting ability selected.";

    return `
      <hr>

      <h3>Calculated Mechanics</h3>

      <div class="hg-character-choice-grid">
        <article class="hg-character-choice-card">
          <h3>Proficiency Bonus</h3>

          <p>
            <b>${formatSignedNumber(proficiencyBonus)}</b>
            at total level ${totalLevel}
          </p>
        </article>

        <article class="hg-character-choice-card">
          <h3>Initiative</h3>

          <p>
            <b>${formatSignedNumber(initiative.total)}</b>

            <br>

            Dexterity ${formatSignedNumber(
              initiative.dexterityModifier
            )} + bonuses ${formatSignedNumber(
              initiative.proficiencyBonus +
              initiative.bonus
            )}
          </p>
        </article>

        <article class="hg-character-choice-card">
          <h3>Passive Perception</h3>

          <p>
            <b>${passivePerception.total}</b>

            <br>

            10 + Perception
            ${formatSignedNumber(
              passivePerception.skillModifier
            )}
          </p>
        </article>

        <article class="hg-character-choice-card">
          <h3>Spellcasting</h3>

          <p>${spellcastingSummary}</p>
        </article>
      </div>
    `;
  }

  function refreshSection13AbilitySummary() {
    if (
      creatorState.currentStepId !==
      "abilities"
    ) {
      return;
    }

    const summaryElement =
      typeof document !== "undefined"
        ? document.getElementById(
            "characterAbilitySummary"
          )
        : null;

    if (!summaryElement) {
      return;
    }

    summaryElement.innerHTML =
      renderSection13AbilitySummary();
  }

  function renderAbilitiesStep() {
    const method =
      creatorState.draft
        .abilities
        .method ||
      "manual";

    const methodChoices =
      ABILITY_SCORE_METHODS.map(
        (item) => {
          return {
            value: item.id,
            label: item.name
          };
        }
      );

    let methodContent = "";

    if (method === "standard-array") {
      methodContent =
        renderSection13StandardArray();
    } else if (method === "point-buy") {
      methodContent =
        renderSection13PointBuy();
    } else if (method === "rolled") {
      methodContent =
        renderSection13RolledAbilities();
    } else {
      methodContent =
        renderSection13ManualAbilities();
    }

    return `
      ${beginnerNote(
        "Ability Scores",
        "Ability scores are your core stats. The modifier is the number added to most rolls. Constitution helps HP, Dexterity often helps Armor Class and initiative, and your class usually has one or two most important abilities."
      )}

      ${renderSection13MechanicsGuide()}

      <div class="hg-character-field-grid">
        ${wizardSelect(
          "Ability Score Method",
          "ccAbilityMethod",
          method,
          methodChoices,
          {
            changeAction:
              "change-ability-method"
          }
        )}
      </div>

      <div style="margin-top: 16px;">
        ${methodContent}
      </div>

      <hr>

      <h3>Current Ability Summary</h3>

      <div id="characterAbilitySummary">
        ${renderSection13AbilitySummary()}
      </div>
    `;
  }

  function findSection13ActionElement(
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

  function handleSection13RefreshLevel() {
    if (
      refreshSection13LevelProgression() ===
      false
    ) {
      return;
    }

    setStatus(
      "Level progression refreshed."
    );

    renderCreatorView();
  }

  function handleSection13CalculateHp() {
    const hp =
      applySection13SuggestedHp();

    if (hp === null) {
      setStatus(
        "Choose a class before calculating suggested hit points."
      );

      renderCreatorView();

      return;
    }

    setStatus(
      `Suggested hit points applied: ${hp}.`
    );

    renderCreatorView();
  }

  function handleSection13ResetStandardArray() {
    applySection13StandardArray();

    setStatus(
      "Standard array reset."
    );

    renderCreatorView();
  }

  function handleSection13PointBuy(
    direction,
    ...values
  ) {
    const button =
      findSection13ActionElement(
        ...values
      );

    const abilityId =
      button?.dataset
        ?.abilityId ||
      "";

    if (
      changeSection13PointBuyScore(
        abilityId,
        direction
      )
    ) {
      setStatus(
        `${getSection13AbilityName(
          abilityId
        )} updated.`
      );

      renderCreatorView();
    }
  }

  function handleSection13ResetPointBuy() {
    applySection13PointBuyDefaults();

    setStatus(
      "Point buy reset."
    );

    renderCreatorView();
  }

  function handleSection13RollScores() {
    const rolls =
      rollSection13ScorePool();

    setStatus(
      `Rolled scores: ${rolls.join(
        ", "
      )}.`
    );

    renderCreatorView();
  }

  function handleSection13ApplyRolls() {
    if (
      applySection13RolledScores()
    ) {
      setStatus(
        "Rolled scores applied."
      );

      renderCreatorView();
    }
  }

  function handleSection13Change({ target }) {
    if (
      target?.dataset
        ?.ccActionChange ===
      "change-ability-method"
    ) {
      setSection13AbilityMethod(
        target.value
      );

      setStatus(
        "Ability score method changed."
      );

      renderCreatorView();

      return true;
    }

    if (
      target?.dataset
        ?.standardAbilityId
    ) {
      assignSection13StandardScore(
        target.dataset
          .standardAbilityId,
        target.value
      );

      setStatus(
        "Standard array assignment updated."
      );

      renderCreatorView();

      return true;
    }

    if (
      target?.dataset
        ?.hpRollLevel
    ) {
      setSection13HpRollValue(
        target.dataset.hpRollLevel,
        target.value
      );

      renderCreatorView();

      return true;
    }

    if (
      target?.dataset
        ?.draftPath ===
      "combat.hpCalculation.laterLevelValues"
    ) {
      setDraftValue(
        "combat.hpCalculation.laterLevelValues",
        parseSection13HpRolls(
          target.value
        )
      );

      markDraftChanged();
      renderCreatorView();

      return true;
    }

    if (
      [
        "combat.hpCalculation.mode",
        "combat.hpCalculation.levelOneValue",
        "combat.hpCalculation.manualOverride",
        "combat.armorClassMode",
        "combat.selectedArmorClassMethod",
        "combat.manualArmorClass",
        "combat.armorClassBonus",
        "combat.initiativeBonus"
      ].includes(
        target?.dataset?.draftPath
      )
    ) {
      const path =
        target.dataset.draftPath;

      const blankMeansNull = [
        "combat.hpCalculation.levelOneValue",
        "combat.hpCalculation.manualOverride",
        "combat.manualArmorClass"
      ].includes(path);

      if (
        blankMeansNull &&
        String(target.value || "").trim() === ""
      ) {
        setDraftValue(path, null);
      } else {
        setSimpleDraftField(
          path,
          target.value,
          target.dataset.valueType ||
          "string"
        );
      }

      applyCompatibilityAliases(
        creatorState.draft
      );

      markDraftChanged();
      renderCreatorView();

      return true;
    }

    if (
      target?.id ===
      "ccCharacterLevel"
    ) {
      setCharacterLevel(
        target.value
      );

      refreshSection13LevelProgression();

      setStatus(
        `Character level set to ${clampLevel(
          target.value
        )}.`
      );

      renderCreatorView();

      return true;
    }

    return false;
  }


  function isSection17AbilitiesComplete(
    character
  ) {
    const touched =
      character
        ?.builder
        ?.validation
        ?.abilitiesTouched === true ||
      (
        Array.isArray(
          character
            ?.builder
            ?.completedSteps
        ) &&
        character.builder
          .completedSteps
          .includes("abilities")
      );

    return (
      touched &&
      ABILITY_DEFINITIONS.every(
      (ability) => {
        const score =
          safeNumber(
            character
              ?.abilities
              ?.scores
              ?.[ability.id],
            0
          );

        return (
          score >= 1 &&
          score <= 30
        );
      }
      )
    );
  }


  function getStepWarnings(character = creatorState.draft) {
    return isSection17AbilitiesComplete(character)
      ? []
      : ["Review and confirm the ability scores before finishing."];
  }

  function renderStep() {
    return renderAbilitiesStep();
  }

  function handleStepClick(context) {
    switch (cleanString(context?.action)) {
      case "refresh-level-progression":
        handleSection13RefreshLevel();
        return true;
      case "calculate-character-hp":
        handleSection13CalculateHp();
        return true;
      case "reset-standard-array":
        handleSection13ResetStandardArray();
        return true;
      case "point-buy-decrease":
        handleSection13PointBuy(-1, context);
        return true;
      case "point-buy-increase":
        handleSection13PointBuy(1, context);
        return true;
      case "reset-point-buy":
        handleSection13ResetPointBuy();
        return true;
      case "roll-ability-scores":
        handleSection13RollScores();
        return true;
      case "apply-rolled-scores":
        handleSection13ApplyRolls();
        return true;
      default:
        return false;
    }
  }

  function handleStepInput() {
    return false;
  }

  function handleStepChange(context) {
    return handleSection13Change(context || {});
  }

  function validateStep(character = creatorState.draft) {
    const blockingErrors = getStepWarnings(character);
    return { valid: blockingErrors.length === 0, blockingErrors, reminders: [] };
  }

  function normalizeStepData(character) {
    return character;
  }

  function isStepComplete(character = creatorState.draft) {
    return isSection17AbilitiesComplete(character);
  }

  return Object.freeze({
    id: "abilities",
    actions: ABILITIES_STEP_ACTIONS,
    renderStep,
    renderLevelStep,
    handleStepClick,
    handleStepInput,
    handleStepChange,
    validateStep,
    normalizeStepData,
    getStepWarnings,
    isStepComplete,
    compatibility: Object.freeze({
      SECTION13_POINT_BUY_COSTS,
      getSection13AbilityName,
      getSection13AbilityScore,
      getSection13BaseAbilityScore,
      getSection13AbilityBonus,
      renderSection13AbilityScoreDetails,
      setSection13AbilityMethod,
      applySection13Scores,
      applySection13StandardArray,
      assignSection13StandardScore,
      applySection13PointBuyDefaults,
      getSection13PointBuySpent,
      changeSection13PointBuyScore,
      rollSection13AbilityScore,
      rollSection13ScorePool,
      applySection13RolledScores,
      getSection13HitDieSize,
      calculateSection13SuggestedHp,
      formatSection13HpRolls,
      parseSection13HpRolls,
      createSection13HpRollRecord,
      getSection13HpRollState,
      setSection13HpRollValue,
      renderSection13RolledHpInputs,
      applySection13SuggestedHp,
      refreshSection13LevelProgression,
      renderSection13HitDice,
      renderSection13HpGuide,
      renderSection13ArmorClassGuide,
      renderLevelStep,
      renderSection13ManualAbilities,
      renderSection13StandardArray,
      renderSection13PointBuy,
      renderSection13RolledAbilities,
      renderSection13AbilitySummary,
      renderSection13MechanicsGuide,
      renderSection13DerivedMechanics,
      refreshSection13AbilitySummary,
      renderAbilitiesStep,
      findSection13ActionElement,
      handleSection13RefreshLevel,
      handleSection13CalculateHp,
      handleSection13ResetStandardArray,
      handleSection13PointBuy,
      handleSection13ResetPointBuy,
      handleSection13RollScores,
      handleSection13ApplyRolls,
      handleSection13Change,
      isSection17AbilitiesComplete
    })
  });
}
