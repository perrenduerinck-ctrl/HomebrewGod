import {
  expect,
  test
} from "@playwright/test";

async function readJsonResult(
  page,
  relativeUrl,
  selector = "#result",
  timeout = 180000
) {
  await page.goto(
    relativeUrl,
    {
      waitUntil: "commit"
    }
  );
  const result =
    page.locator(selector);

  await expect(result)
    .not.toHaveText(
      "RUNNING",
      {
        timeout
      }
    );

  const text =
    await result.textContent();

  expect(text).not.toMatch(
    /^FAIL/
  );

  return JSON.parse(text);
}

test(
  "internal character tests run as automated end-to-end character and multiclass coverage",
  async ({ page }) => {
    const result =
      await readJsonResult(
        page,
        "tests/browser-pages/character-creator-self-test.html?release=phase20-20260727"
      );

    expect(result.failed)
      .toEqual([]);
    expect(result.passed)
      .toBe(true);
    expect(result.total)
      .toBeGreaterThanOrEqual(458);

    const names =
      result.results.map(
        (entry) => entry.name
      );
    const requiredFlows = [
      /Basics portrait workflow/i,
      /Multiclass add returns/i,
      /Save screen separates/i,
      /Finalization status persists/i,
      /removing a Spells-step feat clears/i,
      /Adding a class reports existing and new class requirements/i,
      /Lowering or removing a class prunes/i
    ];

    requiredFlows.forEach(
      (pattern) => {
        expect(
          names.some((name) => {
            return pattern.test(name);
          })
        ).toBe(true);
      }
    );
  }
);

test(
  "Spells-step Remove Feat clears the feat instead of re-adding its compatibility alias",
  async ({ page }) => {
    await page.goto(
      "tests/browser-pages/character-feat-removal-self-test.html?release=feat-remove-20260730",
      {
        waitUntil:
          "domcontentloaded"
      }
    );
    await expect(page.locator("body"))
      .toHaveAttribute(
        "data-test-status",
        "ready"
      );

    const button =
      page.locator(
        '[data-cc-action="toggle-default-feat"][data-feat-id="lucky"]'
      );

    await expect(button)
      .toHaveText("Remove Feat");
    await button.click();
    await expect(button)
      .toHaveText("Add Feat");

    const featState =
      await page.evaluate(() => {
        const draft =
          window
            .__FEAT_REMOVAL_TEST__
            .getDraft();

        return {
          feats:
            draft.feats,
          selectedFeats:
            draft.selectedFeats
        };
      });

    expect(featState)
      .toEqual({
        feats: [],
        selectedFeats: []
      });
  }
);

test(
  "ordinary Character Creator typing preserves the active DOM and avoids full rerenders",
  async ({ page }) => {
    await page.goto(
      "tests/browser-pages/character-feat-removal-self-test.html?release=creator-rerender-priority2-20260816",
      {
        waitUntil:
          "domcontentloaded"
      }
    );
    await expect(page.locator("body"))
      .toHaveAttribute(
        "data-test-status",
        "ready"
      );

    await page.evaluate(() => {
      window
        .__FEAT_REMOVAL_TEST__
        .navigateToStep("basics");

      window.__CREATOR_RENDER_NODES__ = {
        root:
          document.getElementById(
            "characterWizardRoot"
          ),
        rail:
          document.getElementById(
            "characterWizardStepRail"
          ),
        body:
          document.getElementById(
            "characterWizardStepBody"
          )
      };
      window.__CREATOR_RENDER_METRICS_BEFORE__ =
        window
          .__FEAT_REMOVAL_TEST__
          .getRenderMetrics();
    });

    const startedAt = Date.now();

    await page.locator("#ccCharacterName")
      .fill("");
    await page.locator("#ccCharacterName")
      .pressSequentially(
        "Priority Two Hero",
        { delay: 0 }
      );
    await page.locator("#ccAppearance")
      .pressSequentially(
        "A practical adventurer with a weathered cloak.",
        { delay: 0 }
      );

    await expect(
      page.locator("#ccCharacterName")
    ).toHaveValue("Priority Two Hero");
    await expect(
      page.locator("#characterBuilderTitle")
    ).toHaveText("Priority Two Hero");
    await expect(
      page.locator("#ccAppearance")
    ).toHaveValue(
      "A practical adventurer with a weathered cloak."
    );
    await expect(
      page.locator("#ccDefaultSpellSearch")
    ).toHaveCount(0);

    const result = await page.evaluate(() => {
      const nodes =
        window.__CREATOR_RENDER_NODES__;
      const before =
        window.__CREATOR_RENDER_METRICS_BEFORE__;
      const after = window
        .__FEAT_REMOVAL_TEST__
        .getRenderMetrics();

      return {
        after,
        before,
        sameRoot:
          nodes.root === document.getElementById(
            "characterWizardRoot"
          ),
        sameRail:
          nodes.rail === document.getElementById(
            "characterWizardStepRail"
          ),
        sameBody:
          nodes.body === document.getElementById(
            "characterWizardStepBody"
          ),
        name:
          window
            .__FEAT_REMOVAL_TEST__
            .getDraft()
            .identity.name,
        appearance:
          window
            .__FEAT_REMOVAL_TEST__
            .getDraft()
            .identity.appearance
      };
    });

    expect(result.sameRoot).toBe(true);
    expect(result.sameRail).toBe(true);
    expect(result.sameBody).toBe(true);
    expect(result.name)
      .toBe("Priority Two Hero");
    expect(result.appearance)
      .toBe(
        "A practical adventurer with a weathered cloak."
      );
    expect(result.after.fullRenderCount)
      .toBe(result.before.fullRenderCount);
    expect(result.after.currentStepRenderCount)
      .toBe(result.before.currentStepRenderCount);
    expect(result.after.stepRailRebuildCount)
      .toBe(result.before.stepRailRebuildCount);
    expect(
      result.after.lightweightFieldUpdateCount
    ).toBeGreaterThan(
      result.before.lightweightFieldUpdateCount
    );
    expect(Date.now() - startedAt)
      .toBeLessThan(3000);
  }
);

test(
  "Character Creator typing debounces draft writes and expensive score recalculation",
  async ({ page }) => {
    await page.goto(
      "tests/browser-pages/character-feat-removal-self-test.html?release=creator-debounce-priority3-20260820",
      {
        waitUntil: "domcontentloaded"
      }
    );
    await expect(page.locator("body"))
      .toHaveAttribute(
        "data-test-status",
        "ready"
      );

    await page.evaluate(() => {
      window
        .__FEAT_REMOVAL_TEST__
        .navigateToStep("basics");
    });
    await page.waitForTimeout(350);

    const beforeTyping = await page.evaluate(() => {
      return window
        .__FEAT_REMOVAL_TEST__
        .getRenderMetrics();
    });

    await page.locator("#ccCharacterName")
      .fill("");
    await page.locator("#ccCharacterName")
      .pressSequentially(
        "Debounced Hero",
        { delay: 0 }
      );

    const whileTyping = await page.evaluate(() => {
      return window
        .__FEAT_REMOVAL_TEST__
        .getRenderMetrics();
    });

    expect(whileTyping.draftStorageWriteCount)
      .toBe(beforeTyping.draftStorageWriteCount);
    expect(whileTyping.pendingDraftPersistence)
      .toBe(true);

    await page.waitForTimeout(350);

    const afterTyping = await page.evaluate(() => {
      return window
        .__FEAT_REMOVAL_TEST__
        .getRenderMetrics();
    });

    expect(afterTyping.draftFlushCount)
      .toBe(beforeTyping.draftFlushCount + 1);
    expect(afterTyping.draftStorageWriteCount)
      .toBe(beforeTyping.draftStorageWriteCount + 2);
    expect(afterTyping.pendingDraftPersistence)
      .toBe(false);

    await page.evaluate(() => {
      window
        .__FEAT_REMOVAL_TEST__
        .navigateToStep("abilities");
    });

    const strengthInput = page.locator(
      '[data-ability-id="str"]'
    );
    await expect(strengthInput).toBeVisible();

    const beforeAbility = await page.evaluate(() => {
      const creator =
        window.__FEAT_REMOVAL_TEST__;

      return {
        metrics: creator.getRenderMetrics(),
        score: creator.getDraft()
          .abilities.base.str
      };
    });

    await strengthInput.fill("18");

    const pendingAbility = await page.evaluate(() => {
      const creator =
        window.__FEAT_REMOVAL_TEST__;

      return {
        metrics: creator.getRenderMetrics(),
        score: creator.getDraft()
          .abilities.base.str
      };
    });

    expect(pendingAbility.score)
      .toBe(beforeAbility.score);
    expect(pendingAbility.metrics.pendingInputCount)
      .toBe(1);

    await page.waitForTimeout(300);

    const afterAbility = await page.evaluate(() => {
      const creator =
        window.__FEAT_REMOVAL_TEST__;

      return {
        metrics: creator.getRenderMetrics(),
        score: creator.getDraft()
          .abilities.base.str
      };
    });

    expect(afterAbility.score).toBe(18);
    expect(afterAbility.metrics.inputFlushCount)
      .toBe(
        beforeAbility.metrics.inputFlushCount + 1
      );
    expect(afterAbility.metrics.pendingInputCount)
      .toBe(0);
  }
);

test(
  "Character Creator large catalogs render bounded batches and filter before adding cards",
  async ({ page }) => {
    await page.goto(
      "tests/browser-pages/character-feat-removal-self-test.html?release=creator-catalog-priority4-20260821",
      {
        waitUntil: "domcontentloaded"
      }
    );
    await expect(page.locator("body"))
      .toHaveAttribute(
        "data-test-status",
        "ready"
      );

    const featCards = page.locator(
      "[data-cc-default-feat-results] .hg-character-choice-card"
    );

    await expect(featCards).toHaveCount(25);
    await expect(
      page.locator("[data-hg-feat-search]")
    ).toHaveCount(0);
    await page.locator(
      '[data-cc-action="show-more-default-feats"]'
    ).click();
    await expect(featCards).toHaveCount(50);

    await page.locator("#ccDefaultFeatSearch")
      .fill("Lucky");
    await expect.poll(async () => {
      return featCards.count();
    }).toBeLessThan(25);
    expect(await featCards.count())
      .toBeGreaterThan(0);
    await expect(featCards.first())
      .toContainText("Lucky");

    await page.evaluate(() => {
      window
        .__FEAT_REMOVAL_TEST__
        .navigateToStep("equipment");
    });

    const equipmentCards = page.locator(
      "[data-cc-equipment-catalog-results] .hg-character-choice-card"
    );
    const initialEquipmentCount =
      await equipmentCards.count();
    const firstEquipmentName =
      await equipmentCards.first()
        .locator("h3")
        .textContent();

    expect(initialEquipmentCount)
      .toBeLessThanOrEqual(25);
    expect(initialEquipmentCount)
      .toBeGreaterThan(0);

    const loadMoreEquipment = page.locator(
      '[data-cc-action="show-more-equipment"]'
    );

    if (await loadMoreEquipment.isVisible()) {
      await loadMoreEquipment.click();
      expect(await equipmentCards.count())
        .toBeLessThanOrEqual(50);
      expect(await equipmentCards.count())
        .toBeGreaterThan(initialEquipmentCount);
    }

    await page.locator("#ccEquipmentCatalogSearch")
      .fill(firstEquipmentName || "");
    await expect
      .poll(() => equipmentCards.count())
      .toBeLessThanOrEqual(25);
    await expect(equipmentCards.first())
      .toContainText(firstEquipmentName || "");
    await expect(
      page.locator(
        "[data-cc-equipment-catalog-status]"
      )
    ).toContainText("matching items");
  }
);

test(
  "playable character sheet prioritizes play controls, tracks combat, and remains usable at phone width",
  async ({ page }) => {
    await page.goto(
      "tests/browser-pages/playable-character-sheet.html?release=playable-priority8-20260728",
      {
        waitUntil:
          "domcontentloaded"
      }
    );

    await expect(page.locator("body"))
      .toHaveAttribute(
        "data-test-status",
        "pass"
      );
    await expect(
      page.getByRole("heading", {
        name: "Aster Vale"
      })
    ).toBeVisible();
    await expect(page.locator(
      ".hg-sheet-class-line"
    )).toContainText(
      "Fighter 2"
    );
    await expect(page.locator(
      ".hg-sheet-class-line"
    )).toContainText(
      "Wizard 5"
    );
    await expect(
      page.locator(
        ".hg-sheet-identity-meta"
      )
    ).toContainText(
      "High Elf"
    );
    await expect(
      page.locator(
        ".hg-sheet-identity-meta"
      )
    ).toContainText(
      "Sage"
    );
    await expect(
      page.locator(
        ".hg-sheet-screen-panel .hg-sheet-combat-stats .hg-sheet-stat-card--core"
      )
    ).toHaveCount(3);
    await expect(
      page.locator(
        ".hg-sheet-screen-panel .hg-sheet-combat-control-grid > .hg-sheet-survival-card"
      )
    ).toBeVisible();
    await expect(
      page.locator(
        ".hg-sheet-screen-panel .hg-sheet-combat-control-grid > .hg-sheet-conditions-card"
      )
    ).toContainText(
      "Poisoned"
    );

    const presentation =
      await page.evaluate(() => {
        const portrait =
          document.querySelector(
            ".hg-character-sheet-portrait-placeholder"
          );
        const saved =
          document.querySelector(
            '[data-sheet-save-status="saved"]'
          );
        const longRest =
          document.querySelector(
            '[data-character-sheet-action="long-rest"]'
          );
        const edit =
          document.querySelector(
            '[data-character-sheet-action="edit"]'
          );
        const deleteButton =
          document.querySelector(
            '[data-character-sheet-action="delete"]'
          );

        return {
          portraitWidth:
            portrait?.getBoundingClientRect()
              .width,
          savedOpacity:
            Number(
              getComputedStyle(saved)
                .opacity
            ),
          longRestBackground:
            getComputedStyle(longRest)
              .backgroundImage,
          editBackground:
            getComputedStyle(edit)
              .backgroundColor,
          deleteBackground:
            getComputedStyle(deleteButton)
              .backgroundColor
        };
      });

    expect(presentation.portraitWidth)
      .toBeGreaterThanOrEqual(100);
    expect(presentation.savedOpacity)
      .toBeLessThan(0.9);
    expect(
      presentation.longRestBackground
    ).toContain("gradient");
    expect(presentation.editBackground)
      .not.toEqual(
        presentation.deleteBackground
      );

    const moreMenu = page.locator(
      ".hg-sheet-more-menu"
    );
    await moreMenu.locator("summary")
      .click();
    await expect(
      moreMenu.getByRole("button", {
        name: "Delete Character",
        exact: true
      })
    ).toBeVisible();
    await moreMenu.locator("summary")
      .click();

    for (
      const tabName of [
        "Actions",
        "Abilities",
        "Inventory",
        "Features",
        "Spells",
        "Description"
      ]
    ) {
      await expect(
        page.getByRole("button", {
          name: tabName,
          exact: true
        })
      ).toBeVisible();
    }

    const screenPanel = page.locator(
      ".hg-sheet-screen-panel"
    );
    const actionSections =
      screenPanel.locator(
        ".hg-sheet-action-sections"
      );

    for (
      const sectionName of [
        "Actions",
        "Bonus Actions",
        "Reactions",
        "Other Actions"
      ]
    ) {
      await expect(
        actionSections.getByRole(
          "heading",
          {
            name: sectionName,
            exact: true
          }
        )
      ).toBeVisible();
    }

    await expect(
      actionSections.locator(
        '[data-sheet-action-key="moon-blade"]'
      )
    ).toHaveCount(1);
    await expect(
      actionSections.locator(
        '[data-sheet-action-key="fire-bolt"]'
      )
    ).toContainText("+7");
    await expect(
      actionSections.locator(
        '[data-sheet-action-key="second-wind"]'
      )
    ).toContainText("1d10 + 2");
    await expect(
      actionSections.locator(
        '[data-sheet-action-key="war-caster-opportunity-spell"]'
      )
    ).toContainText("Reaction");
    await expect(
      actionSections
        .getByText(
          "Gain advantage on concentration saving throws.",
          {
            exact: true
          }
        )
    ).toHaveCount(0);
    await expect(
      actionSections.locator(
        '[data-sheet-action-key="war-caster"]'
      )
    ).toHaveCount(0);

    const actionSurgeCard =
      actionSections.locator(
        '[data-sheet-action-key="action-surge"]'
      );
    await expect(actionSurgeCard)
      .toContainText(
        "1 / 1 uses remaining"
      );
    await actionSurgeCard
      .getByRole("button", {
        name: "Spend",
        exact: true
      })
      .click();
    await expect(
      actionSections.locator(
        '[data-sheet-action-key="action-surge"]'
      )
    ).toContainText(
      "0 / 1 uses remaining"
    );

    const fireBoltDetails =
      actionSections
        .locator(
          '[data-sheet-action-key="fire-bolt"]'
        )
        .locator("details");
    await expect(fireBoltDetails)
      .not.toHaveAttribute(
        "open",
        ""
      );
    await fireBoltDetails
      .locator("summary")
      .click();
    await expect(
      fireBoltDetails.locator("p")
    ).toBeVisible();

    const hpInput = screenPanel.locator(
      '[data-character-sheet-input="hp-amount"]'
    );
    await hpInput.fill("8");
    await screenPanel.getByRole("button", {
      name: "Damage",
      exact: true
    }).click();
    await expect(
      screenPanel.locator(
        ".hg-sheet-hp-display strong"
      )
    ).toHaveText("32");
    await expect(
      screenPanel.locator(
        ".hg-sheet-hp-display small"
      )
    ).toContainText(
      "0 temporary"
    );

    await page.getByRole("button", {
      name: "Inventory",
      exact: true
    }).click();
    await expect(
      screenPanel.getByText(
        "Equipment & Containers"
      )
    ).toBeVisible();
    await expect(
      screenPanel.getByText(
        "Carried Weight",
        { exact: true }
      ).locator("..")
    ).toContainText(
      "43 lb."
    );
    await expect(
      screenPanel.getByText(
        "Capacity",
        { exact: true }
      ).locator("..")
    ).toContainText(
      "150 lb."
    );
    await expect(
      screenPanel.getByText(
        "Remaining Capacity",
        { exact: true }
      ).locator("..")
    ).toContainText(
      "107 lb."
    );
    await expect(
      screenPanel.getByText(
        "Encumbrance",
        { exact: true }
      ).locator("..")
    ).toContainText(
      "Within capacity"
    );
    const packContainer =
      screenPanel.locator(
        '[data-inventory-container="pack"]'
      );
    await expect(packContainer)
      .not.toHaveAttribute(
        "open",
        ""
      );
    await packContainer.locator(
      ":scope > summary"
    ).click();

    const pouchContainer =
      packContainer.locator(
        '[data-inventory-container="belt-pouch"]'
      );
    await expect(pouchContainer)
      .toBeVisible();
    await expect(pouchContainer)
      .not.toHaveAttribute(
        "open",
        ""
      );
    await pouchContainer.locator(
      ":scope > summary"
    ).click();

    const healingPotion =
      pouchContainer.locator(
        '[data-inventory-item-id="healing-potion"]'
      );
    await expect(healingPotion)
      .toBeVisible();
    await expect(healingPotion)
      .toContainText("Quantity");
    await expect(healingPotion)
      .toContainText("0.5 lb.");
    await expect(healingPotion)
      .toContainText("1 lb.");
    await expect(healingPotion)
      .toContainText(
        "Inside Belt Pouch"
      );
    await expect(healingPotion)
      .toContainText("Magical");
    await expect(
      screenPanel.locator(
        '[data-inventory-item-id="healing-potion"]'
      )
    ).toHaveCount(1);
    await expect(
      healingPotion.getByRole(
        "button",
        {
          name: "Equip",
          exact: true
        }
      )
    ).toBeDisabled();

    const potionDetails =
      healingPotion.locator(
        ".hg-sheet-item-details"
      );
    await expect(potionDetails)
      .not.toHaveAttribute(
        "open",
        ""
      );
    await potionDetails.locator(
      "summary"
    ).click();
    await expect(potionDetails)
      .toContainText(
        "Two crimson healing draughts."
      );
    await expect(potionDetails)
      .toContainText(
        "A creature that drinks one potion"
      );

    const inventorySearch =
      screenPanel.locator(
        '[data-character-sheet-input="inventory-search"]'
      );
    await inventorySearch.fill(
      "Healing Potion"
    );
    await expect(
      screenPanel.locator(
        '[data-inventory-container="pack"]'
      )
    ).toHaveAttribute(
      "open",
      ""
    );
    await expect(
      screenPanel.locator(
        '[data-inventory-container="belt-pouch"]'
      )
    ).toHaveAttribute(
      "open",
      ""
    );
    await expect(
      screenPanel.locator(
        '[data-inventory-item-id="healing-potion"]'
      )
    ).toBeVisible();
    await expect(
      screenPanel.locator(
        '[data-inventory-item-id="moon-blade"]'
      )
    ).toHaveCount(0);
    await inventorySearch.fill("");

    const filters =
      screenPanel.locator(
        ".hg-sheet-inventory-filters"
      );

    for (
      const [
        filterName,
        expectedItem,
        hiddenItem
      ] of [
        [
          "Containers",
          "pack",
          "moon-blade"
        ],
        [
          "Weapons",
          "moon-blade",
          "chain-shirt"
        ],
        [
          "Armor",
          "chain-shirt",
          "moon-blade"
        ],
        [
          "Magical",
          "focus",
          "chain-shirt"
        ],
        [
          "Equipped",
          "moon-blade",
          "chain-shirt"
        ],
        [
          "Attuned",
          "focus",
          "moon-blade"
        ]
      ]
    ) {
      const filterButton =
        filters.getByRole("button", {
          name: filterName,
          exact: true
        });

      await filterButton.click();
      await expect(filterButton)
        .toHaveAttribute(
          "aria-pressed",
          "true"
        );
      await expect(
        screenPanel.locator(
          `[data-inventory-item-id="${expectedItem}"]`
        )
      ).toBeVisible();
      await expect(
        screenPanel.locator(
          `[data-inventory-item-id="${hiddenItem}"]`
        )
      ).toHaveCount(0);
      await filterButton.click();
    }

    await screenPanel.getByRole("button", {
      name: "Unattune",
      exact: true
    }).click();
    await expect(
      screenPanel.getByRole("button", {
        name: "Attune",
        exact: true
      })
    ).toBeVisible();

    await page.getByRole("button", {
      name: "Features",
      exact: true
    }).click();

    for (
      const groupName of [
        "Class Features",
        "Subclass Features",
        "Species Traits",
        "Background Features",
        "Feats",
        "Custom Features"
      ]
    ) {
      await expect(
        screenPanel.getByRole(
          "heading",
          {
            name: groupName,
            exact: true
          }
        )
      ).toBeVisible();
    }

    const actionSurgeFeature =
      screenPanel.locator(
        '[data-feature-group="class"] [data-sheet-feature-id="action-surge"]'
      );
    await expect(actionSurgeFeature)
      .toContainText("Fighter 2");
    await expect(actionSurgeFeature)
      .toContainText("Level 2");
    await expect(actionSurgeFeature)
      .toContainText(
        "0 / 1 uses remaining"
      );
    await actionSurgeFeature
      .getByRole("button", {
        name: "Restore",
        exact: true
      })
      .click();
    await expect(
      screenPanel.locator(
        '[data-feature-group="class"] [data-sheet-feature-id="action-surge"]'
      )
    ).toContainText(
      "1 / 1 uses remaining"
    );

    const actionSurgeDetails =
      screenPanel.locator(
        '[data-feature-group="class"] [data-sheet-feature-id="action-surge"] details'
      );
    await expect(actionSurgeDetails)
      .not.toHaveAttribute(
        "open",
        ""
      );
    await expect(
      actionSurgeDetails.locator(
        "summary"
      )
    ).toHaveText(
      "Additional details"
    );
    await actionSurgeDetails
      .locator("summary")
      .click();
    await expect(
      actionSurgeDetails.locator("p")
    ).toHaveText(
      "You can use only one Action Surge on a turn."
    );

    await expect(
      screenPanel.locator(
        '[data-feature-group="species"] [data-sheet-feature-id="fey-ancestry"] details'
      )
    ).toHaveCount(0);
    await expect(
      screenPanel.locator(
        '[data-feature-group="background"] [data-sheet-feature-id="researcher"]'
      )
    ).toContainText(
      "Specialty: Lost civilizations"
    );

    const warCasterFeature =
      screenPanel.locator(
        '[data-feature-group="feats"] [data-sheet-feature-id="war-caster"]'
      );
    await expect(warCasterFeature)
      .toContainText("Level 4");
    await expect(warCasterFeature)
      .toContainText("Level 4 feat");
    await expect(warCasterFeature)
      .toContainText(
        "Concentration Technique: Arcane focus"
      );
    await expect(warCasterFeature)
      .toContainText(
        "1 / 1 uses remaining"
      );

    const sheetHeader =
      page.locator(
        ".hg-character-sheet-header"
      );
    await sheetHeader.evaluate(
      (element) => {
        element.dataset
          .performanceSentinel =
            "stable";
      }
    );
    await expect(
      page.locator(
        ".hg-sheet-spell-library"
      )
    ).toHaveCount(0);
    await expect(
      page.locator(
        "[data-character-sheet-print-area]"
      )
    ).toHaveCount(0);

    await page.getByRole("button", {
      name: "Spells",
      exact: true
    }).click();

    const spellLibrary =
      screenPanel.locator(
        ".hg-sheet-spell-library"
      );
    await expect(
      page.locator(
        ".hg-sheet-spell-library"
      )
    ).toHaveCount(1);
    await expect(
      page.locator(
        "[data-character-sheet-print-area]"
      )
    ).toHaveCount(0);
    await expect(sheetHeader)
      .toHaveAttribute(
        "data-performance-sentinel",
        "stable"
      );
    const levelOneSlots =
      screenPanel.locator(
        '[data-normal-spell-slot="1"]'
      );
    await expect(levelOneSlots)
      .toContainText("3 / 4");
    await levelOneSlots
      .getByRole("button", {
        name: "Spend",
        exact: true
      })
      .click();
    await expect(
      screenPanel.locator(
        '[data-normal-spell-slot="1"]'
      )
    ).toContainText("2 / 4");
    await expect(
      spellLibrary.getByRole(
        "heading",
        {
          name: "Cantrips",
          exact: true
        }
      )
    ).toBeVisible();
    await expect(
      spellLibrary.getByRole(
        "heading",
        {
          name: "Level 1",
          exact: true
        }
      )
    ).toBeVisible();
    await expect(
      spellLibrary.locator(
        '[data-sheet-spell-id="fire-bolt"]'
      )
    ).toHaveCount(1);

    const shieldCard =
      spellLibrary.locator(
        '[data-sheet-spell-id="shield"]'
      );
    await expect(shieldCard)
      .toContainText(
        "Always prepared"
      );
    await expect(shieldCard)
      .toContainText(
        "Subclass-granted"
      );
    await expect(shieldCard)
      .toContainText(
        "Casting Time"
      );
    await expect(shieldCard)
      .toContainText(
        "Components"
      );
    await expect(shieldCard)
      .toContainText(
        "Concentration"
      );
    await expect(shieldCard)
      .toContainText("Ritual");
    await expect(
      shieldCard.locator("details")
    ).not.toHaveAttribute(
      "open",
      ""
    );
    await expect(
      shieldCard.locator(
        "[data-spell-description-body]"
      )
    ).toHaveText("");
    await shieldCard.locator(
      "details summary"
    ).click();
    await expect(
      shieldCard.locator(
        "details p"
      )
    ).toBeVisible();

    const spellSearch =
      spellLibrary.locator(
        '[data-character-sheet-input="spell-search"]'
      );
    await spellSearch.evaluate(
      (element) => {
        element.dataset
          .performanceSentinel =
            "stable";
      }
    );
    await spellSearch.fill("M");
    await spellSearch.fill("Misty");
    await spellSearch.fill(
      "Misty Step"
    );
    await expect(
      spellLibrary.locator(
        ".hg-sheet-spell-card"
      )
    ).toHaveCount(1);
    await expect(
      spellLibrary.locator(
        '[data-sheet-spell-id="misty-step"]'
      )
    ).toBeVisible();
    await expect(spellSearch)
      .toBeFocused();
    await expect(spellSearch)
      .toHaveAttribute(
        "data-performance-sentinel",
        "stable"
      );
    await expect(sheetHeader)
      .toHaveAttribute(
        "data-performance-sentinel",
        "stable"
      );
    await spellSearch.fill("");

    for (
      const [
        filterName,
        expectedSpellId
      ] of [
        ["Prepared", "magic-missile"],
        ["Known", "fire-bolt"],
        ["Concentration", "web"],
        ["Ritual", "detect-magic"],
        ["Action", "fire-bolt"],
        ["Bonus Action", "misty-step"],
        ["Reaction", "shield"],
        ["Damage", "fire-bolt"],
        ["Healing", "healing-word"]
      ]
    ) {
      const filterButton =
        spellLibrary.getByRole(
          "button",
          {
            name: filterName,
            exact: true
          }
        );

      await filterButton.click();
      await expect(filterButton)
        .toHaveAttribute(
          "aria-pressed",
          "true"
        );
      await expect(
        spellLibrary.locator(
          `[data-sheet-spell-id="${expectedSpellId}"]`
        )
      ).toBeVisible();
      await filterButton.click();
      await expect(filterButton)
        .toHaveAttribute(
          "aria-pressed",
          "false"
        );
      await expect(sheetHeader)
        .toHaveAttribute(
          "data-performance-sentinel",
          "stable"
        );
    }

    await page.locator(
      ".hg-sheet-more-menu summary"
    ).click();
    await page.getByRole("button", {
      name: "Print",
      exact: true
    }).click();
    await expect(
      page.locator(
        ".hg-sheet-more-menu"
      )
    ).not.toHaveAttribute(
      "open",
      ""
    );
    await expect(
      page.locator(
        "[data-character-sheet-print-area]"
      )
    ).toHaveCount(1);
    await expect(
      page.locator(
        "[data-character-sheet-print-area] .hg-sheet-spell-library"
      )
    ).toHaveCount(1);
    await page.evaluate(() => {
      window.dispatchEvent(
        new Event("afterprint")
      );
    });
    await expect(
      page.locator(
        "[data-character-sheet-print-area]"
      )
    ).toHaveCount(0);
    await expect(
      page.locator(
        ".hg-sheet-spell-library"
      )
    ).toHaveCount(1);
    await expect(spellSearch)
      .toHaveValue("");

    const featSpellResource =
      screenPanel.locator(
        '[data-feat-spell-resource="magic-initiate:spell:healing-word"]'
      );
    await expect(featSpellResource)
      .toContainText(
        "1 / 1 use remaining"
      );
    await featSpellResource
      .getByRole("button", {
        name: "Spend",
        exact: true
      })
      .click();
    await expect(
      screenPanel.locator(
        '[data-feat-spell-resource="magic-initiate:spell:healing-word"]'
      )
    ).toContainText(
      "0 / 1 use remaining"
    );

    await page.setViewportSize({
      width: 390,
      height: 844
    });
    await expect(
      page.getByRole("button", {
        name: "Spells",
        exact: true
      })
    ).toBeVisible();
    const hasPageOverflow =
      await page.evaluate(() => {
        return (
          document.documentElement
            .scrollWidth >
          window.innerWidth
        );
      });

    expect(hasPageOverflow)
      .toBe(false);
    await expect(
      spellLibrary.locator(
        '[data-character-sheet-input="spell-search"]'
      )
    ).toBeVisible();
    await expect(
      spellLibrary.getByRole(
        "button",
        {
          name: "Prepared",
          exact: true
        }
      )
    ).toBeVisible();

    await page.getByRole("button", {
      name: "Features",
      exact: true
    }).click();
    await expect(
      screenPanel.locator(
        '[data-feature-group="feats"]'
      )
    ).toBeVisible();
    const hasFeatureOverflow =
      await page.evaluate(() => {
        return (
          document.documentElement
            .scrollWidth >
          window.innerWidth
        );
      });

    expect(hasFeatureOverflow)
      .toBe(false);

    await page.getByRole("button", {
      name: "Inventory",
      exact: true
    }).click();
    await expect(
      screenPanel.locator(
        '[data-character-sheet-input="inventory-search"]'
      )
    ).toBeVisible();
    await expect(
      screenPanel.getByRole(
        "button",
        {
          name: "Containers",
          exact: true
        }
      )
    ).toBeVisible();
    const hasInventoryOverflow =
      await page.evaluate(() => {
        return (
          document.documentElement
            .scrollWidth >
          window.innerWidth
        );
      });

    expect(hasInventoryOverflow)
      .toBe(false);
  }
);

test(
  "playable sheet keeps mobile gameplay controls and long content touch-friendly",
  async ({ page }) => {
    await page.setViewportSize({
      width: 390,
      height: 844
    });
    await page.goto(
      "tests/browser-pages/playable-character-sheet.html?fixture=mobile-stress&release=playable-priority8-20260728",
      {
        waitUntil:
          "domcontentloaded"
      }
    );

    await expect(page.locator("body"))
      .toHaveAttribute(
        "data-test-status",
        "pass"
      );
    await expect(
      page.getByRole("heading", {
        name:
          "Seraphina Aster Vale of the Endless Astral Archive"
      })
    ).toBeVisible();

    const mobileMetrics =
      await page.evaluate(() => {
        const visibleElements =
          (selector) => {
            return [
              ...document.querySelectorAll(
                `.hg-sheet-screen-panel ${selector}`
              )
            ].filter((element) => {
              return (
                element.getClientRects()
                  .length > 0
              );
            });
          };
        const heights =
          (selector) => {
            return visibleElements(
              selector
            ).map((element) => {
              return element
                .getBoundingClientRect()
                .height;
            });
          };
        const tabs =
          document.querySelector(
            ".hg-character-sheet-tabs"
          );

        return {
          hasPageOverflow:
            document.documentElement
              .scrollWidth >
            window.innerWidth,
          tabsScrollable:
            tabs.scrollWidth >
            tabs.clientWidth,
          tabOverflow:
            getComputedStyle(tabs)
              .overflowX,
          tabHeights:
            [
              ...tabs.querySelectorAll(
                ".hg-character-sheet-tab"
              )
            ].map((element) => {
              return element
                .getBoundingClientRect()
                .height;
            }),
          hpButtonHeights:
            heights(
              ".hg-sheet-value-control button"
            ),
          deathSaveButtonHeights:
            heights(
              ".hg-sheet-death-saves button"
            ),
          conditionButtonHeights:
            heights(
              ".hg-sheet-condition-controls button"
            )
        };
      });

    expect(mobileMetrics.hasPageOverflow)
      .toBe(false);
    expect(mobileMetrics.tabsScrollable)
      .toBe(true);
    expect(mobileMetrics.tabOverflow)
      .toMatch(/auto|scroll/);
    for (
      const heights of [
        mobileMetrics.tabHeights,
        mobileMetrics.hpButtonHeights,
        mobileMetrics.deathSaveButtonHeights,
        mobileMetrics.conditionButtonHeights
      ]
    ) {
      expect(heights.length)
        .toBeGreaterThan(0);
      expect(
        heights.every(
          (height) => height >= 44
        )
      ).toBe(true);
    }

    const moreMenu = page.locator(
      ".hg-sheet-more-menu"
    );
    await moreMenu.locator(
      ":scope > summary"
    ).click();
    await expect(
      moreMenu.getByRole("button", {
        name: "Delete Character",
        exact: true
      })
    ).toBeVisible();
    const menuBounds =
      await moreMenu.locator(
        ":scope > div"
      ).evaluate((menu) => {
        const rect =
          menu.getBoundingClientRect();

        return {
          left: rect.left,
          right: rect.right,
          viewportWidth:
            window.innerWidth,
          hasPageOverflow:
            document.documentElement
              .scrollWidth >
            window.innerWidth
        };
      });

    expect(menuBounds.left)
      .toBeGreaterThanOrEqual(0);
    expect(menuBounds.right)
      .toBeLessThanOrEqual(
        menuBounds.viewportWidth
      );
    expect(menuBounds.hasPageOverflow)
      .toBe(false);
    await moreMenu.locator(
      ":scope > summary"
    ).click();

    const screenPanel = page.locator(
      ".hg-sheet-screen-panel"
    );
    const hpInput = screenPanel.locator(
      '[data-character-sheet-input="hp-amount"]'
    );
    await hpInput.fill("5");
    await screenPanel.getByRole(
      "button",
      {
        name: "Damage",
        exact: true
      }
    ).click();
    await expect(
      screenPanel.locator(
        ".hg-sheet-hp-display strong"
      )
    ).toHaveText("35");
    await hpInput.fill("99");
    await screenPanel.getByRole(
      "button",
      {
        name: "Heal",
        exact: true
      }
    ).click();
    await expect(
      screenPanel.locator(
        ".hg-sheet-hp-display strong"
      )
    ).toHaveText("48");

    await screenPanel.locator(
      [
        '[data-character-sheet-action="adjust-death-save"]',
        '[data-death-save-kind="success"]',
        '[data-delta="1"]'
      ].join("")
    ).click();
    await expect(
      screenPanel.locator(
        'strong[aria-label="Successes: 2"]'
      )
    ).toBeVisible();
    await screenPanel.locator(
      '[data-character-sheet-action="reset-death-saves"]'
    ).click();
    await expect(
      screenPanel.locator(
        'strong[aria-label="Successes: 0"]'
      )
    ).toBeVisible();

    await screenPanel.locator(
      '[data-character-sheet-input="standard-condition"]'
    ).selectOption("Blinded");
    await screenPanel.locator(
      '[data-character-sheet-action="add-standard-condition"]'
    ).click();
    await expect(
      screenPanel.locator(
        '[data-condition="Blinded"]'
      )
    ).toBeVisible();
    const longCondition =
      "Restrained by an Unusually Long Arcane Condition";
    await screenPanel.locator(
      '[data-character-sheet-input="custom-condition"]'
    ).fill(longCondition);
    await screenPanel.locator(
      '[data-character-sheet-action="add-custom-condition"]'
    ).click();
    await expect(
      screenPanel.locator(
        `[data-condition="${longCondition}"]`
      )
    ).toBeVisible();

    const fireBoltDetails =
      screenPanel.locator(
        '[data-sheet-action-key="fire-bolt"] details'
      );
    await fireBoltDetails.locator(
      "summary"
    ).click();
    await expect(
      fireBoltDetails.locator("p")
    ).toBeVisible();
    expect(
      await fireBoltDetails.locator(
        "summary"
      ).evaluate((summary) => {
        return summary
          .getBoundingClientRect()
          .height;
      })
    ).toBeGreaterThanOrEqual(44);

    await page.getByRole("button", {
      name: "Features",
      exact: true
    }).click();
    const longFeature =
      screenPanel.locator(
        '[data-sheet-feature-id="impossibly-long-mobile-feature"]'
      );
    await expect(longFeature)
      .toContainText(
        "Chronicle of the Converging Celestial Pathways"
      );
    await longFeature.locator(
      "details summary"
    ).click();
    await expect(
      longFeature.locator(
        "details p"
      )
    ).toBeVisible();

    for (
      const tabName of [
        "Actions",
        "Abilities",
        "Inventory",
        "Features",
        "Spells",
        "Description"
      ]
    ) {
      await page.getByRole("button", {
        name: tabName,
        exact: true
      }).click();
      await expect(
        screenPanel.locator(
          ".hg-sheet-panel"
        )
      ).toBeVisible();
      const layout =
        await page.evaluate(() => {
          const visibleCards = [
            ...document.querySelectorAll(
              [
                ".hg-sheet-screen-panel .hg-sheet-action-card",
                ".hg-sheet-screen-panel .hg-sheet-inventory-item",
                ".hg-sheet-screen-panel .hg-sheet-spell-card",
                ".hg-sheet-screen-panel .hg-sheet-feature-card"
              ].join(",")
            )
          ].filter((element) => {
            return (
              element.getClientRects()
                .length > 0
            );
          });

          return {
            hasPageOverflow:
              document.documentElement
                .scrollWidth >
              window.innerWidth,
            cardsFit:
              visibleCards.every(
                (card) => {
                  const rect =
                    card.getBoundingClientRect();

                  return (
                    rect.left >= 0 &&
                    rect.right <=
                      window.innerWidth
                  );
                }
              )
          };
        });

      expect(layout.hasPageOverflow)
        .toBe(false);
      expect(layout.cardsFit)
        .toBe(true);
    }
  }
);

test(
  "playable sheet uses feature-adjusted attunement limits for display and validation",
  async ({ page }) => {
    await page.goto(
      "tests/browser-pages/playable-character-sheet.html?fixture=attunement-master&release=playable-attunement-20260728",
      {
        waitUntil:
          "domcontentloaded"
      }
    );

    await expect(page.locator("body"))
      .toHaveAttribute(
        "data-test-status",
        "pass"
      );
    await page.getByRole("button", {
      name: "Inventory",
      exact: true
    }).click();

    const screenPanel = page.locator(
      ".hg-sheet-screen-panel"
    );
    const attunementCard =
      screenPanel.getByText(
        "Attunement",
        { exact: true }
      ).locator("..");

    await expect(attunementCard)
      .toContainText("4 / 4");
    await expect(
      screenPanel.getByText(
        "The attunement limit is reached.",
        { exact: true }
      )
    ).toBeVisible();

    const obsidianRing =
      screenPanel.locator(
        '[data-inventory-item-id="obsidian-ring"]'
      );

    await obsidianRing.getByRole(
      "button",
      {
        name: "Attune",
        exact: true
      }
    ).click();
    await expect(page.locator("body"))
      .toHaveAttribute(
        "data-last-mutation",
        /attunement limit of 4 items/i
      );
    await expect(
      screenPanel.locator(
        '[data-inventory-item-id="obsidian-ring"]'
      ).getByRole("button", {
        name: "Attune",
        exact: true
      })
    ).toBeVisible();

    await screenPanel.locator(
      '[data-inventory-item-id="copper-ring"]'
    ).getByRole("button", {
      name: "Unattune",
      exact: true
    }).click();
    await expect(attunementCard)
      .toContainText("3 / 4");

    await screenPanel.locator(
      '[data-inventory-item-id="obsidian-ring"]'
    ).getByRole("button", {
      name: "Attune",
      exact: true
    }).click();
    await expect(
      screenPanel.locator(
        '[data-inventory-item-id="obsidian-ring"]'
      ).getByRole("button", {
        name: "Unattune",
        exact: true
      })
    ).toBeVisible();
    await expect(attunementCard)
      .toContainText("4 / 4");
  }
);

test(
  "playable sheet hides the Spells tab for a non-spellcaster",
  async ({ page }) => {
    await page.goto(
      "tests/browser-pages/playable-character-sheet.html?fixture=non-spellcaster&release=playable-inventory-20260728",
      {
        waitUntil:
          "domcontentloaded"
      }
    );

    await expect(page.locator("body"))
      .toHaveAttribute(
        "data-test-status",
        "pass"
      );
    await expect(
      page.getByRole("heading", {
        name: "Brann Stone"
      })
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Spells",
        exact: true
      })
    ).toHaveCount(0);
    await expect(
      page.locator(
        '[aria-label="Spell character sheet"]'
      )
    ).toHaveCount(0);
  }
);

test(
  "Phase 19 module contracts remain green under the Phase 20 runner",
  async ({ page }) => {
    await page.goto(
      "tests/browser-pages/character-modules-self-test.html?release=phase20-20260727",
      {
        waitUntil: "commit"
      }
    );
    const status =
      page.locator("#result");

    await expect(status)
      .toContainText(
        "PASS",
        {
          timeout: 30000
        }
      );
    await expect(status)
      .toContainText(
        "88 Phase 19 character module assertions"
      );
  }
);

test(
  "ruleset and schema policy tests are automated",
  async ({ page }) => {
    const result =
      await readJsonResult(
        page,
        "tests/browser-pages/ruleset-policy-test.html?release=phase20-20260727",
        "#result",
        60000
      );

    expect(result.passed)
      .toBe(true);
    expect(result.counts.classes)
      .toBe(13);
    expect(result.counts.subclasses)
      .toBe(118);
    expect(result.spellCatalog.total)
      .toBe(340);
  }
);

test(
  "monster creator end-to-end operations remain green",
  async ({ page }) => {
    await page.goto(
      "tests/browser-pages/monster-creator-self-test.html?release=phase20-20260727",
      {
        waitUntil: "commit"
      }
    );
    const status =
      page.getByRole("status");

    await expect(status)
      .toContainText(
        "PASS",
        {
          timeout: 60000
        }
      );
    await expect(status)
      .toContainText(
        "97 Phase 20 Monster Creator regression assertions"
      );
  }
);

test(
  "security and persistence regression suite is automated",
  async ({ page }) => {
    await page.goto(
      "tests/browser-pages/security-persistence-self-test.html?release=phase20-20260727",
      {
        waitUntil: "commit"
      }
    );
    const status =
      page.locator(
        "#testResult"
      );

    await expect(status)
      .toContainText(
        "PASS",
        {
          timeout: 60000
        }
      );
    await expect(status)
      .toContainText(
        "60 Phase 18 security and persistence assertions"
      );
  }
);

test(
  "lobby startup defers both creator module graphs until each creator opens",
  async ({ page }) => {
    const creatorRequests = [];

    page.on(
      "request",
      (request) => {
        const requestUrl =
          new URL(request.url());
        const pathname =
          requestUrl.pathname;

        if (
          pathname.endsWith(
            "/characterCreator/index.js"
          ) ||
          pathname.includes(
            "/characterCreator/"
          ) ||
          pathname.endsWith(
            "/monsters/creator.js"
          )
        ) {
          creatorRequests.push(
            pathname
          );
        }
      }
    );

    await page.goto(
      "?smokeTest=1&release=priority1-lazy-creators",
      {
        waitUntil:
          "domcontentloaded"
      }
    );
    await expect(
      page.locator(
        "#homebrewGodSmokeResult"
      )
    ).toContainText(
      "SMOKE TEST PASS",
      {
        timeout: 30000
      }
    );

    expect(creatorRequests)
      .toEqual([]);

    await page.evaluate(() => {
      return window
        .__HOMEBREW_GOD_RELEASE_TEST__
        .openScreen("battle");
    });

    expect(creatorRequests)
      .toEqual([]);

    await page.evaluate(() => {
      return window
        .__HOMEBREW_GOD_RELEASE_TEST__
        .openScreen(
          "characterCreator"
        );
    });

    expect(
      creatorRequests.some(
        (pathname) => {
          return pathname.endsWith(
            "/characterCreator/index.js"
          );
        }
      )
    ).toBe(true);
    expect(
      creatorRequests.some(
        (pathname) => {
          return pathname.endsWith(
            "/monsters/creator.js"
          );
        }
      )
    ).toBe(false);

    await page.evaluate(() => {
      return window
        .__HOMEBREW_GOD_RELEASE_TEST__
        .openScreen(
          "monsterCreator"
        );
    });

    expect(
      creatorRequests.some(
        (pathname) => {
          return pathname.endsWith(
            "/monsters/creator.js"
          );
        }
      )
    ).toBe(true);
  }
);

test(
  "app smoke mode exercises room, battle-map, character, and monster screens",
  async ({ page }) => {
    await page.goto(
      "?smokeTest=1&release=phase20-20260727",
      {
        waitUntil:
          "domcontentloaded"
      }
    );
    const smoke =
      page.locator(
        "#homebrewGodSmokeResult"
      );

    await expect(smoke)
      .toContainText(
        "SMOKE TEST PASS",
        {
          timeout: 30000
        }
      );
    await page.waitForFunction(
      () => {
        return Boolean(
          window
            .__HOMEBREW_GOD_RELEASE_TEST__
        );
      }
    );

    for (
      const screenName of
      [
        "room",
        "battle",
        "characterCreator",
        "monsterCreator"
      ]
    ) {
      const state =
        await page.evaluate(
          (name) => {
            return window
              .__HOMEBREW_GOD_RELEASE_TEST__
              .openScreen(name);
          },
          screenName
        );

      expect(state.visible)
        .toBe(true);
      expect(
        await page.evaluate(() => {
          return window
            .__HOMEBREW_GOD_RELEASE_TEST__
            .getVisibleScreen();
        })
      ).toBe(screenName);
    }

    const finalState =
      await page.evaluate(() => {
        return window
          .__HOMEBREW_GOD_RELEASE_TEST__
          .openScreen(
            "characterCreator"
          );
      });

    expect(
      finalState.tokenSystemReady
    ).toBe(true);
    expect(
      finalState.characterCreatorReady
    ).toBe(true);

    const monsterState =
      await page.evaluate(() => {
        return window
          .__HOMEBREW_GOD_RELEASE_TEST__
          .openScreen(
            "monsterCreator"
          );
      });

    expect(
      monsterState.monsterCreatorReady
    ).toBe(true);
  }
);

test(
  "battle-map ruler measures horizontal and diagonal grid distance",
  async ({ page }) => {
    await page.goto(
      "?smokeTest=1&release=map-ruler-stage2-20260824",
      {
        waitUntil: "domcontentloaded"
      }
    );
    await page.waitForFunction(() => {
      return Boolean(
        window.__HOMEBREW_GOD_RELEASE_TEST__
      );
    });
    await page.evaluate(() => {
      return window
        .__HOMEBREW_GOD_RELEASE_TEST__
        .openScreen("battle");
    });

    const toggle = page.locator(
      "#rulerToggleButton"
    );
    const overlay = page.locator(
      ".hg-map-ruler-layer"
    );
    const status = page.locator(
      "#rulerStatus"
    );

    await toggle.click();
    await expect(toggle).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await overlay.scrollIntoViewIfNeeded();

    const box = await overlay.boundingBox();
    expect(box).not.toBeNull();

    const startX = box.x + 90;
    const startY = box.y + 90;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(
      startX + 384,
      startY
    );
    await page.mouse.up();

    await expect(status).toContainText("30 ft");
    await expect(status).toContainText("6 squares");

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(
      startX + 192,
      startY + 256
    );
    await page.mouse.up();

    await expect(status).toContainText("25 ft");
    await expect(status).toContainText("5 squares");
    await expect(
      page.locator(".hg-map-ruler-label")
    ).toHaveText("25 ft");
  }
);

test(
  "battle-map templates preview and lock reusable basic shapes",
  async ({ page }) => {
    await page.goto(
      "?smokeTest=1&release=map-templates-stage3-20260825",
      {
        waitUntil: "domcontentloaded"
      }
    );
    await page.waitForFunction(() => {
      return Boolean(
        window.__HOMEBREW_GOD_RELEASE_TEST__
      );
    });
    await page.evaluate(() => {
      return window
        .__HOMEBREW_GOD_RELEASE_TEST__
        .openScreen("battle");
    });

    const toggle = page.locator(
      "#templateToggleButton"
    );
    const clear = page.locator(
      "#templateClearButton"
    );
    const shapeSelect = page.locator(
      "#templateShapeSelect"
    );
    const status = page.locator(
      "#templateStatus"
    );
    const overlay = page.locator(
      ".hg-map-template-layer"
    );
    const templatePath = page.locator(
      ".hg-map-template-shape"
    );

    await shapeSelect.selectOption("cone");
    await toggle.click();
    await expect(toggle).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await overlay.scrollIntoViewIfNeeded();

    const box = await overlay.boundingBox();
    expect(box).not.toBeNull();
    const startX = box.x + 120;
    const startY = box.y + 150;

    await page.mouse.move(startX, startY);
    await page.mouse.click(startX, startY);
    await page.mouse.move(
      startX + 180,
      startY + 40
    );

    await expect(overlay).toHaveAttribute(
      "data-template-shape",
      "cone"
    );
    await expect(overlay).toHaveAttribute(
      "data-template-phase",
      "aiming"
    );
    await expect(status).toContainText(
      "move to aim"
    );
    await expect(templatePath).toHaveAttribute(
      "d",
      /^M /
    );

    await page.mouse.click(
      startX + 180,
      startY + 40
    );
    await expect(overlay).toHaveAttribute(
      "data-template-phase",
      "confirmed"
    );
    await expect(status).toContainText("locked");
    await expect(clear).toBeEnabled();

    await clear.click();
    await expect(overlay).not.toHaveClass(
      /has-template/
    );

    await shapeSelect.selectOption("line");
    await page.locator("#templateSizeInput").fill("30");
    await page.locator("#templateWidthInput").fill("10");
    await page.mouse.move(startX, startY);
    await page.mouse.click(startX, startY);
    await page.mouse.move(startX, startY + 200);
    await expect(overlay).toHaveAttribute(
      "data-template-shape",
      "line"
    );
    await expect(status).toContainText(
      "Line · 30 ft × 10 ft"
    );

    await page.locator("#rulerToggleButton").click();
    await expect(toggle).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    await expect(
      page.locator("#rulerToggleButton")
    ).toHaveAttribute("aria-pressed", "true");
  }
);

test(
  "mobile layout does not overflow at a phone viewport",
  async ({ page }) => {
    await page.setViewportSize({
      width: 390,
      height: 844
    });
    await page.goto(
      "?smokeTest=1&release=phase20-20260727",
      {
        waitUntil:
          "domcontentloaded"
      }
    );
    await expect(
      page.locator(
        "#homebrewGodSmokeResult"
      )
    ).toContainText(
      "SMOKE TEST PASS",
      {
        timeout: 30000
      }
    );

    const dimensions =
      await page.evaluate(() => {
        return {
          viewport:
            window.innerWidth,
          document:
            document.documentElement
              .scrollWidth,
          body:
            document.body
              .scrollWidth
        };
      });

    expect(
      dimensions.document
    ).toBeLessThanOrEqual(
      dimensions.viewport + 1
    );
    expect(
      dimensions.body
    ).toBeLessThanOrEqual(
      dimensions.viewport + 1
    );
  }
);

test(
  "spell stress fixture keeps all 340 catalog spells and stale sources responsive",
  async ({ page }) => {
    await page.goto(
      "tests/browser-pages/playable-character-sheet-spell-stress.html?release=spell-performance-final-20260730",
      {
        waitUntil:
          "domcontentloaded"
      }
    );
    await expect(page.locator("body"))
      .toHaveAttribute(
        "data-test-status",
        "pass"
      );
    await expect(
      page.locator(
        ".hg-sheet-spell-library"
      )
    ).toHaveCount(0);
    await expect(
      page.locator(
        "[data-character-sheet-print-area]"
      )
    ).toHaveCount(0);

    const totalSpells =
      await page.evaluate(() => {
        return window
          .__SPELL_STRESS_TEST__
          .totalSpells;
      });

    expect(totalSpells).toBe(340);
    await expect.poll(
      async () => {
        return page.evaluate(() => {
          return window
            .__SPELL_STRESS_TEST__
            .staleSourceCount;
        });
      }
    ).toBe(1500);

    const header =
      page.locator(
        ".hg-character-sheet-header"
      );
    await header.evaluate((element) => {
      element.dataset
        .stressSentinel = "stable";
    });

    const spellOpenDuration =
      await page.evaluate(async () => {
        const button =
          Array.from(
            document.querySelectorAll(
              "button"
            )
          ).find((candidate) => {
            return (
              candidate.textContent
                ?.trim() ===
              "Spells"
            );
          });
        const startedAt =
          performance.now();

        button.click();

        await new Promise((resolve) => {
          requestAnimationFrame(
            () => resolve()
          );
        });

        return (
          performance.now() -
          startedAt
        );
      });

    test.info().annotations.push({
      type:
        "spell-open-duration",
      description:
        `${spellOpenDuration.toFixed(1)} ms`
    });

    const library =
      page.locator(
        ".hg-sheet-spell-library"
      );
    await expect(library)
      .toHaveCount(1);
    await expect(
      library.locator(
        ".hg-sheet-spell-card"
      )
    ).toHaveCount(12);
    await expect(
      library.locator(
        "[data-spell-results-meta]"
      )
    ).toContainText(
      "12 shown"
    );
    await expect(
      library.locator(
        "[data-spell-results-meta]"
      )
    ).toContainText(
      "343 matching"
    );

    expect(
      spellOpenDuration
    ).toBeLessThan(1500);

    await library.getByRole(
      "button",
      {
        name: "Show 12 more spells",
        exact: true
      }
    ).click();
    await expect(
      library.locator(
        ".hg-sheet-spell-card"
      )
    ).toHaveCount(24);
    await expect(
      page.getByRole("heading", {
        name: "Catalog Arcanist"
      })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Wizard",
        exact: true
      })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Archived spell sources",
        exact: true
      })
    ).toBeVisible();

    const search =
      library.locator(
        '[data-character-sheet-input="spell-search"]'
      );
    await search.evaluate((element) => {
      element.dataset
        .stressSentinel = "stable";
    });
    await search.fill("w");
    await search.fill("wi");
    await search.fill("wish");
    await expect(
      library.locator(
        '[data-sheet-spell-id="wish"]'
      )
    ).toBeVisible();
    await expect(search).toBeFocused();
    await expect(search)
      .toHaveAttribute(
        "data-stress-sentinel",
        "stable"
      );
    await expect(header)
      .toHaveAttribute(
        "data-stress-sentinel",
        "stable"
      );

    await search.fill("");
    await expect(
      library.locator(
        ".hg-sheet-spell-card"
      )
    ).toHaveCount(12);

    await page.setViewportSize({
      width: 390,
      height: 844
    });
    const hasOverflow =
      await page.evaluate(() => {
        return (
          document.documentElement
            .scrollWidth >
          window.innerWidth
        );
      });

    expect(hasOverflow).toBe(false);
  }
);

