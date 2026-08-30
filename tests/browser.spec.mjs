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
  "release verification can attach a bounded image to every upload path",
  async ({ page }) => {
    await page.goto(
      "?smokeTest=1&uploadTestKind=roomMap&release=upload-verification-20260828",
      {
        waitUntil: "domcontentloaded"
      }
    );

    await expect(
      page.locator("#homebrewGodSmokeResult")
    ).toContainText(
      "SMOKE TEST PASS",
      {
        timeout: 30000
      }
    );

    await page.getByRole("button", {
      name: "Attach roomMap test image",
      exact: true
    }).click();

    const attached =
      await page.locator(
        "#roomMapUploadInput"
      ).evaluate((input) => ({
        count: input.files?.length || 0,
        name: input.files?.[0]?.name || "",
        size: input.files?.[0]?.size || 0,
        type: input.files?.[0]?.type || ""
      }));

    expect(attached).toEqual({
      count: 1,
      name:
        "ai-upload-verification-roomMap.png",
      size: 68,
      type: "image/png"
    });

    const allAttached =
      await page.evaluate(() => {
        return [
          "roomMap",
          "puzzleTile",
          "token",
          "characterPortrait"
        ].map((kind) => {
          return window
            .__HOMEBREW_GOD_RELEASE_TEST__
            .attachImageUploadTestFile(kind);
        });
      });

    expect(
      allAttached.map(({ kind }) => kind)
    ).toEqual([
      "roomMap",
      "puzzleTile",
      "token",
      "characterPortrait"
    ]);
    expect(
      allAttached.every((file) => (
        file.size === 68 &&
        file.type === "image/png"
      ))
    ).toBe(true);
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
        "64 Phase 18 security and persistence assertions"
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

    await page.locator(
      "#rulerStartElevationInput"
    ).fill("0");
    await page.locator(
      "#rulerEndElevationInput"
    ).fill("40");
    // Editing controls can scroll/reflow the toolbar. Re-measure the map,
    // then draw a real 25-ft segment rather than relying on an old drag.
    await overlay.scrollIntoViewIfNeeded();
    const elevatedBox = await overlay.boundingBox();
    const elevatedStartX = elevatedBox.x + 90;
    const elevatedStartY = elevatedBox.y + 90;
    await page.mouse.move(elevatedStartX, elevatedStartY);
    await page.mouse.down();
    await page.mouse.move(
      elevatedStartX + 320,
      elevatedStartY
    );
    await page.mouse.up();

    await expect(status).toContainText(
      "47.2 ft true"
    );
    await expect(status).toContainText(
      "25 ft horizontal"
    );
    await expect(status).toContainText(
      "40 ft vertical"
    );
    await expect(
      page.locator(".hg-map-ruler-label")
    ).toHaveText("47.2 ft");
    await expect(
      page.locator("#tokenElevationInput")
    ).toHaveAttribute("min", "-1000");
    await expect(
      page.locator("#tokenElevationInput")
    ).toHaveAttribute("max", "1000");
    await expect(
      page.locator("#tokenElevationInput")
    ).toHaveAttribute("step", "1");
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
  "battle-map templates highlight every intersecting token footprint",
  async ({ page }) => {
    await page.goto(
      "?smokeTest=1&release=token-detection-stage4-20260825",
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

    await page.locator(
      "#templateShapeSelect"
    ).selectOption("circle");
    await page.locator(
      "#templateSizeInput"
    ).fill("5");
    await page.locator(
      "#templateToggleButton"
    ).click();

    const overlay = page.locator(
      ".hg-map-template-layer"
    );
    await overlay.scrollIntoViewIfNeeded();
    const box = await overlay.boundingBox();
    expect(box).not.toBeNull();
    const localCenter = {
      x: Math.min(300, box.width / 2),
      y: Math.min(240, box.height / 2)
    };

    await page.evaluate((center) => {
      const layer = document.getElementById(
        "tokenLayer"
      );
      const templateLayer = document.querySelector(
        ".hg-map-template-layer"
      );
      const layerRect = layer.getBoundingClientRect();
      const templateRect =
        templateLayer.getBoundingClientRect();
      const offsetX =
        templateRect.left - layerRect.left;
      const offsetY =
        templateRect.top - layerRect.top;

      layer.innerHTML = "";
      function addToken({
        id,
        name,
        left,
        top,
        size,
        type
      }) {
        const token = document.createElement("div");
        token.className =
          `hg-token hg-token-${type}`;
        token.dataset.tokenId = id;
        token.dataset.tokenName = name;
        token.dataset.tokenType = type;
        token.title = name;
        token.style.left = `${offsetX + left}px`;
        token.style.top = `${offsetY + top}px`;
        token.style.width = `${size}px`;
        token.style.height = `${size}px`;
        const face = document.createElement("div");
        face.className = "hg-token-fallback";
        face.textContent = name.charAt(0);
        token.appendChild(face);
        layer.appendChild(token);
      }

      addToken({
        id: "large-ogre",
        name: "Large Ogre",
        type: "enemy",
        left: center.x + 55,
        top: center.y - 64,
        size: 128
      });
      addToken({
        id: "distant-wizard",
        name: "Distant Wizard",
        type: "player",
        left: center.x + 160,
        top: center.y - 16,
        size: 32
      });
      document.dispatchEvent(
        new CustomEvent(
          "homebrewgod:tokens-rendered",
          { detail: { count: 2 } }
        )
      );
    }, localCenter);

    await page.mouse.move(
      box.x + localCenter.x,
      box.y + localCenter.y
    );

    const ogre = page.locator(
      '[data-token-id="large-ogre"]'
    );
    const wizard = page.locator(
      '[data-token-id="distant-wizard"]'
    );
    await expect(ogre).toHaveClass(
      /hg-token-template-affected/
    );
    await expect(ogre).toHaveAttribute(
      "data-template-affected",
      "true"
    );
    await expect(wizard).not.toHaveClass(
      /hg-token-template-affected/
    );
    await expect(
      page.locator("#templateStatus")
    ).toContainText(
      "Affected tokens (1): Large Ogre"
    );

    await page.mouse.click(
      box.x + localCenter.x,
      box.y + localCenter.y
    );
    await page.mouse.move(
      box.x + localCenter.x - 180,
      box.y + localCenter.y
    );
    await expect(ogre).toHaveClass(
      /hg-token-template-affected/
    );

    await page.locator(
      "#templateClearButton"
    ).click();
    await expect(ogre).not.toHaveClass(
      /hg-token-template-affected/
    );
    await expect(ogre).not.toHaveAttribute(
      "data-template-affected"
    );
  }
);

test(
  "sphere templates include tokens by true 3D position",
  async ({ page }) => {
    await page.goto(
      "?smokeTest=1&release=true-2-5d-targeting-stage8-20260826",
      { waitUntil: "domcontentloaded" }
    );
    await page.waitForFunction(() => Boolean(
      window.__HOMEBREW_GOD_RELEASE_TEST__
    ));
    await page.evaluate(() => window
      .__HOMEBREW_GOD_RELEASE_TEST__
      .openScreen("battle"));

    await page.locator(
      "#templateShapeSelect"
    ).selectOption("sphere");
    await page.locator(
      "#templateSizeInput"
    ).fill("20");
    await page.locator(
      "#rulerEndElevationInput"
    ).fill("20");
    await page.locator(
      "#templateToggleButton"
    ).click();

    const overlay = page.locator(
      ".hg-map-template-layer"
    );
    await overlay.scrollIntoViewIfNeeded();
    const box = await overlay.boundingBox();
    expect(box).not.toBeNull();
    const center = {
      x: Math.min(300, box.width / 2),
      y: Math.min(240, box.height / 2)
    };

    await page.evaluate((point) => {
      const layer = document.getElementById(
        "tokenLayer"
      );
      const templateLayer = document.querySelector(
        ".hg-map-template-layer"
      );
      const layerRect = layer.getBoundingClientRect();
      const templateRect =
        templateLayer.getBoundingClientRect();
      const offsetX =
        templateRect.left - layerRect.left;
      const offsetY =
        templateRect.top - layerRect.top;

      layer.innerHTML = "";
      [
        ["ground-token", "Ground Token", 0],
        ["center-token", "Center Token", 20],
        ["high-token", "High Token", 41]
      ].forEach(([id, name, elevation]) => {
        const token = document.createElement("div");
        token.className = "hg-token hg-token-enemy";
        token.dataset.tokenId = id;
        token.dataset.tokenName = name;
        token.dataset.tokenType = "enemy";
        token.dataset.tokenElevation = String(elevation);
        token.style.left = `${offsetX + point.x - 16}px`;
        token.style.top = `${offsetY + point.y - 16}px`;
        token.style.width = "32px";
        token.style.height = "32px";
        layer.appendChild(token);
      });
    }, center);

    await page.mouse.move(
      box.x + center.x,
      box.y + center.y
    );
    await expect(page.locator(
      '[data-token-id="ground-token"]'
    )).toHaveClass(/hg-token-template-affected/);
    await expect(page.locator(
      '[data-token-id="center-token"]'
    )).toHaveClass(/hg-token-template-affected/);
    await expect(page.locator(
      '[data-token-id="high-token"]'
    )).not.toHaveClass(/hg-token-template-affected/);
    await expect(page.locator(
      "#templateStatus"
    )).toContainText(
      "Sphere · 20-ft radius · center +20 ft"
    );

    await page.locator(
      "#rulerEndElevationInput"
    ).fill("50");
    await expect(page.locator(
      '[data-token-id="ground-token"]'
    )).not.toHaveClass(/hg-token-template-affected/);
    await expect(page.locator(
      '[data-token-id="high-token"]'
    )).toHaveClass(/hg-token-template-affected/);
  }
);

test(
  "structured spell data drives Fire Bolt and area spell templates",
  async ({ page }) => {
    await page.goto(
      "?smokeTest=1&release=spell-templates-stage5-20260825",
      { waitUntil: "domcontentloaded" }
    );
    await page.waitForFunction(() => Boolean(
      window.__HOMEBREW_GOD_RELEASE_TEST__
    ));
    await page.evaluate(() => window
      .__HOMEBREW_GOD_RELEASE_TEST__
      .openScreen("battle"));
    await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.setDmRole(true));

    const spellSelect = page.locator(
      "#spellTemplateSelect"
    );
    const loadButton = page.locator(
      "#loadSpellTemplateButton"
    );
    const shapeSelect = page.locator(
      "#templateShapeSelect"
    );
    const sizeInput = page.locator(
      "#templateSizeInput"
    );
    const widthInput = page.locator(
      "#templateWidthInput"
    );
    const status = page.locator(
      "#templateStatus"
    );
    const overlay = page.locator(
      ".hg-map-template-layer"
    );

    for (const selector of [
      "#battleManagerBar",
      "#puzzleMapControls",
      "#tokenBuilderControls",
      "#creatorLauncherControls"
    ]) {
      await expect(page.locator(selector))
        .toHaveJSProperty("open", false);
    }

    await expect(spellSelect.locator(
      'option[value="fire-bolt"]'
    )).toHaveText("Fire Bolt");
    await spellSelect.selectOption("fire-bolt");
    await loadButton.click();
    await expect(shapeSelect).toHaveValue("circle");
    await expect(sizeInput).toHaveValue("2.5");
    await expect(status).toContainText(
      "Fire Bolt · Range 120 feet · single target"
    );

    await spellSelect.selectOption("fireball");
    await loadButton.click();
    await expect(shapeSelect).toHaveValue("sphere");
    await expect(sizeInput).toHaveValue("20");
    await expect(status).toContainText(
      "Fireball · Range 150 feet · 20-ft radius"
    );
    await expect(status).toContainText(
      "Preview only — no spell slot is spent"
    );

    await spellSelect.selectOption("flame-strike");
    await loadButton.click();
    await expect(shapeSelect).toHaveValue("cylinder");
    await expect(sizeInput).toHaveValue("10");
    await expect(page.locator(
      "#templateHeightInput"
    )).toHaveValue("40");
    await expect(page.locator(
      "#templateHeightControl"
    )).not.toHaveClass(/hidden/);
    await expect(status).toContainText(
      "Flame Strike · Range 60 feet · 10-ft radius × 40 ft high"
    );

    await spellSelect.selectOption("burning-hands");
    await loadButton.click();
    await expect(shapeSelect).toHaveValue("cone");
    await expect(sizeInput).toHaveValue("15");
    await expect(status).toContainText(
      "Burning Hands · Range Self · 15 ft"
    );
    await overlay.scrollIntoViewIfNeeded();
    const box = await overlay.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.click(box.x + 120, box.y + 140);
    await page.mouse.move(box.x + 280, box.y + 140);
    await expect(overlay).toHaveAttribute(
      "data-template-phase",
      "aiming"
    );

    await spellSelect.selectOption("lightning-bolt");
    await loadButton.click();
    await expect(shapeSelect).toHaveValue("line");
    await expect(sizeInput).toHaveValue("100");
    await expect(widthInput).toHaveValue("5");
    await expect(status).toContainText(
      "Lightning Bolt · Range Self · 100 ft × 5 ft"
    );
  }
);

async function openDmSpellPreview(page) {
  await page.goto("?smokeTest=1&release=unified-preview-20260829",
    { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.__HOMEBREW_GOD_RELEASE_TEST__));
  await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen("battle"));
  for (const id of ["spellPreviewControl", "loadSpellTemplateButton",
    "playSpellPreviewVfxButton", "resetSpellPreviewButton", "lightningVfxTestControl"]) {
    await expect(page.locator("#" + id)).toBeHidden();
  }
  // Even a programmatic click on the hidden button cannot start a player preview.
  await page.locator("#loadSpellTemplateButton").evaluate((button) => button.click());
  expect(await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__
    .getSpellPreviewVfxState().preview)).toBeNull();
  await page.evaluate(() => {
    window.__PREVIEW_CONFIRMED_EVENTS__ = 0;
    document.addEventListener("homebrewgod:spell-cast-confirmed",
      () => { window.__PREVIEW_CONFIRMED_EVENTS__ += 1; });
    window.__HOMEBREW_GOD_RELEASE_TEST__.setDmRole(true);
  });
  const overlay = page.locator(".hg-map-template-layer");
  const play = page.locator("#playSpellPreviewVfxButton");
  const reset = page.locator("#resetSpellPreviewButton");
  const status = page.locator("#templateStatus");
  async function select(spell) {
    await page.locator("#spellTemplateSelect").selectOption(spell);
    await page.locator("#loadSpellTemplateButton").click();
    await expect(status).toContainText("Click caster position.");
    await expect(play).toBeDisabled();
  }
  async function point(x, y, hover = false) {
    const options = { force: true, position: { x, y } };
    if (hover) await overlay.hover(options);
    else await overlay.click(options);
  }
  const state = () => page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.getSpellPreviewVfxState());
  return { overlay, play, reset, status, select, point, state };
}

test("cantrip sprite batch plays in preview while targeting hides temporarily and restores unchanged", async ({ page }) => {
  const ui = await openDmSpellPreview(page);
  await page.locator("#battleVfxModeSelect").selectOption("full");
  await page.evaluate(() => {
    window.__CANTRIP_SPRITES__ = [];
    new MutationObserver((records) => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node.nodeType !== 1 || node.dataset.effectKind !== "sprite") continue;
        window.__CANTRIP_SPRITES__.push({
          type: node.dataset.effectType,
          path: node.classList.contains("has-path"),
          image: node.querySelector(".hg-vfx-sprite")?.style.backgroundImage
        });
      }
    }).observe(document.querySelector(".hg-map-vfx-layer"), { childList: true });
  });
  for (const [spell, sprite, hasPath] of [
    ["ray-of-frost", "frost-projectile-sprite", true],
    ["eldritch-blast", "force-projectile-sprite", true],
    ["frostbite", "frost-impact-sprite", false],
    ["shocking-grasp", "lightning-impact-sprite", false],
    ["sacred-flame", "radiant-strike-sprite", false]
  ]) {
    await ui.select(spell);
    await ui.point(240, 180);
    await ui.point(spell === "shocking-grasp" ? 280 : 420, 180);
    const locked = (await ui.state()).preview;
    await page.evaluate(() => { window.__CANTRIP_SPRITES__ = []; });
    await ui.play.click();
    await expect(ui.overlay).toHaveCSS("opacity", "0");
    await expect.poll(() => page.evaluate((type) =>
      window.__CANTRIP_SPRITES__.some((entry) => entry.type === type), sprite)).toBe(true);
    const rendered = await page.evaluate((type) =>
      window.__CANTRIP_SPRITES__.find((entry) => entry.type === type), sprite);
    expect(rendered.path).toBe(hasPath);
    expect(rendered.image).toContain("assets/vfx/cantrips/");
    expect((await ui.state()).event.casterTokenId).toBe("");
    await expect(ui.overlay).toHaveCSS("opacity", "1", { timeout: 5000 });
    expect((await ui.state()).preview).toEqual(locked);
    await expect(page.locator(".hg-map-vfx-effect")).toHaveCount(0);
    await expect(ui.play).toBeEnabled();
  }
  await ui.play.click();
  await expect(ui.overlay).toHaveCSS("opacity", "0");
  await ui.reset.click();
  await expect(ui.overlay).toHaveCSS("opacity", "1");
  await expect(page.locator(".hg-map-vfx-effect")).toHaveCount(0);
  expect((await ui.state()).preview.phase).toBe("caster");
  await ui.select("ray-of-frost");
  await ui.point(240, 180);
  await ui.point(420, 180);
  await ui.play.click();
  await page.locator("#battleVfxModeSelect").selectOption("off");
  await expect(ui.overlay).toHaveCSS("opacity", "1");
  await ui.play.click();
  await expect(ui.overlay).toHaveCSS("opacity", "1");
  expect((await ui.state()).result.reason).toBe("effects-off");
  expect(await page.evaluate(() => window.__PREVIEW_CONFIRMED_EVENTS__)).toBe(0);
});

test("profile preview sample covers projectile, impact, touch, beam, utility, ground, and weapon families", async ({ page }) => {
  const ui = await openDmSpellPreview(page);
  await page.locator("#battleVfxModeSelect").selectOption("full");
  await page.evaluate(() => {
    window.__PROFILE_SAMPLE__ = [];
    new MutationObserver((records) => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node.nodeType !== 1 || !node.matches(".hg-map-vfx-effect")) continue;
        window.__PROFILE_SAMPLE__.push({ type: node.dataset.effectType,
          path: node.classList.contains("has-path"),
          glyph: Boolean(node.querySelector("svg path")),
          x: parseFloat(node.style.left), y: parseFloat(node.style.top),
          length: parseFloat(node.style.getPropertyValue("--hg-vfx-path-length")),
          rotation: parseFloat(node.style.getPropertyValue("--hg-vfx-path-rotation")) });
      }
    }).observe(document.querySelector(".hg-map-vfx-layer"), { childList: true });
  });
  for (const [spell, type, path, glyph] of [
    ["acid-splash", "profile-orb", true, false],
    ["toll-the-dead", "profile-glyph", false, true],
    ["mending", "profile-glyph", false, true],
    ["lightning-lure", "profile-beam", true, false],
    ["mage-hand", "profile-hand", false, true],
    ["create-bonfire", "fire-flames", false, false],
    ["booming-blade", "profile-slash", false, false]
  ]) {
    await ui.select(spell);
    await ui.point(240, 180);
    await ui.point(270, 180);
    await expect(ui.play).toBeEnabled();
    const locked = (await ui.state()).preview;
    await page.evaluate(() => { window.__PROFILE_SAMPLE__ = []; });
    await ui.play.click();
    await expect(ui.overlay).toHaveCSS("opacity", "0");
    await expect.poll(() => page.evaluate((type) =>
      window.__PROFILE_SAMPLE__.some(e => e.type === type), type)).toBe(true);
    const rendered = await page.evaluate((type) =>
      window.__PROFILE_SAMPLE__.find(e => e.type === type), type);
    expect(rendered.path).toBe(path); expect(rendered.glyph).toBe(glyph);
    const event = (await ui.state()).event;
    expect(event.preview).toBe(true); expect(event.casterTokenId).toBe("");
    if (path) {
      expect(rendered.x).toBeCloseTo(event.casterPoint.x, 0);
      expect(rendered.length).toBeCloseTo(30, 0);
      expect(rendered.rotation).toBeCloseTo(0, 0);
    } else {
      expect(rendered.x).toBeCloseTo(event.targetPoint.x, 0);
      expect(rendered.y).toBeCloseTo(event.targetPoint.y, 0);
    }
    await expect(ui.overlay).toHaveCSS("opacity", "1", { timeout: 5000 });
    expect((await ui.state()).preview).toEqual(locked);
    await expect(page.locator(".hg-map-vfx-effect")).toHaveCount(0);
  }
  // A self utility spell locks at one click and never asks for a character.
  await ui.select("blade-ward"); await ui.point(240, 180);
  await expect(ui.play).toBeEnabled(); await ui.play.click();
  await ui.reset.click(); await expect(ui.overlay).toHaveCSS("opacity", "1");
  await expect(page.locator(".hg-map-vfx-effect")).toHaveCount(0);
  expect(await page.evaluate(() => window.__PREVIEW_CONFIRMED_EVENTS__)).toBe(0);
});

test("Lightning Bolt 5x5 comparison is DM-only, aligned, bounded and cleanup-safe", async ({ page }) => {
  const ui = await openDmSpellPreview(page);
  const variant = page.locator("#lightningVfxTestSelect");
  await expect(variant).toBeHidden();
  await page.locator("#battleVfxModeSelect").selectOption("full");
  await ui.select("lightning-bolt");
  await expect(variant).toBeVisible(); await expect(variant).toHaveValue("5x5");
  await page.evaluate(() => {
    window.__BOLT5_RENDERED__ = [];
    const observer = new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node.nodeType !== 1 || !node.matches(".hg-map-vfx-effect")) continue;
        const sprite = node.querySelector(".hg-vfx-sprite");
        const matrix = sprite ? new DOMMatrix(getComputedStyle(sprite).transform) : null;
        window.__BOLT5_RENDERED__.push({ type: node.dataset.effectType,
          rotation: parseFloat(node.style.getPropertyValue("--hg-vfx-path-rotation")),
          length: parseFloat(node.style.getPropertyValue("--hg-vfx-path-length")),
          x: parseFloat(node.style.left), y: parseFloat(node.style.top),
          size: sprite?.style.backgroundSize, src: sprite?.style.backgroundImage,
          artAngle: matrix ? Math.atan2(matrix.b, matrix.a) * 180 / Math.PI : null,
          artX: matrix?.e, artY: matrix?.f,
          children: node.querySelectorAll(".hg-vfx-sprite").length });
      }
    });
    for (const layer of document.querySelectorAll(".hg-map-vfx-layer, .hg-map-vfx-light-layer")) {
      observer.observe(layer, {childList:true});
    }
  });
  const rendered = () => page.evaluate(() => window.__BOLT5_RENDERED__);
  for (const [dx,dy,angle] of [[1,0,0],[-1,0,180],[0,1,90],[0,-1,-90],[1,1,45],[-1,1,135],[1,-1,-45],[-1,-1,-135]]) {
    await ui.reset.click(); await ui.point(240,220); await ui.point(240+dx*30,220+dy*30);
    const locked = (await ui.state()).preview;
    await page.evaluate(() => { window.__BOLT5_RENDERED__ = []; });
    await ui.play.click(); await expect(ui.overlay).toHaveCSS("opacity", "0");
    await expect.poll(async () => (await rendered()).length).toBe(2);
    const main = (await rendered()).find(e => e.type === "lightning5-main");
    expect(main.size).toBe("800px 800px"); expect(main.children).toBe(1);
    expect(main.src).toContain("lightning-bolt-main-5x5.png");
    expect(main.rotation).toBeCloseTo(angle, 2);
    expect(main.artAngle).toBeCloseTo(-135, 2);
    expect(main.artX).toBeCloseTo(-80, 2); expect(main.artY).toBeCloseTo(-80, 2);
    expect(main.x).toBeCloseTo(locked.previewCasterPoint.x, 0);
    expect(main.y).toBeCloseTo(locked.previewCasterPoint.y, 0);
    expect(main.length).toBeCloseTo(locked.previewGeometry.sizePixels, 0);
    await expect(ui.overlay).toHaveCSS("opacity", "1", {timeout:4000});
    await expect(page.locator(".hg-map-vfx-effect")).toHaveCount(0);
    expect((await ui.state()).preview).toEqual(locked);
  }
  await page.locator("#battleVfxModeSelect").selectOption("reduced");
  await page.evaluate(() => { window.__BOLT5_RENDERED__ = []; });
  await ui.play.click(); await expect(ui.overlay).toHaveCSS("opacity", "0");
  await expect(ui.overlay).toHaveCSS("opacity", "1", {timeout:4000});
  expect((await rendered()).map(e=>e.type)).toEqual(["lightning5-main"]);
  await page.locator("#battleVfxModeSelect").selectOption("off");
  await page.evaluate(() => { window.__BOLT5_RENDERED__ = []; });
  await ui.play.click(); expect(await rendered()).toEqual([]);
  expect((await ui.state()).result.reason).toBe("effects-off");
  await page.locator("#battleVfxModeSelect").selectOption("full");
  await variant.selectOption("4x4"); await ui.play.click();
  await expect.poll(async () => (await rendered()).some(e=>e.type === "storm-lightning-beam")).toBe(true);
  await variant.selectOption("5x5"); await expect(page.locator(".hg-map-vfx-effect")).toHaveCount(0);
  for (let i=0; i<5; i++) await ui.play.click();
  await ui.reset.click(); await expect(page.locator(".hg-map-vfx-effect")).toHaveCount(0);
  expect(await page.evaluate(() => window.__PREVIEW_CONFIRMED_EVENTS__)).toBe(0);
  await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.setDmRole(false));
  await expect(variant).toBeHidden();
});

test("storm profiles render full-line lightning and area-local hail with bounded cleanup", async ({ page }) => {
  const ui = await openDmSpellPreview(page);
  await page.locator("#battleVfxModeSelect").selectOption("full");
  await page.evaluate(() => {
    window.__STORM_RENDERED__ = [];
    const observer = new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node.nodeType !== 1 || !node.matches(".hg-map-vfx-effect")) continue;
        window.__STORM_RENDERED__.push({ type: node.dataset.effectType,
          x: parseFloat(node.style.left), y: parseFloat(node.style.top),
          length: parseFloat(node.style.getPropertyValue("--hg-vfx-path-length")),
          scale: parseFloat(node.style.getPropertyValue("--hg-vfx-scale")),
          width: parseFloat(getComputedStyle(node).width),
          height: parseFloat(getComputedStyle(node).height),
          branches: node.querySelectorAll("svg path").length,
          sprite: Boolean(node.querySelector(".hg-vfx-sprite")),
          stones: node.querySelectorAll(".hg-storm-hailstone").length,
          bursts: node.querySelectorAll(".hg-storm-ice-burst").length,
          blend: getComputedStyle(node.parentElement).mixBlendMode });
      }
    });
    for (const layer of document.querySelectorAll(".hg-map-vfx-layer, .hg-map-vfx-light-layer")) {
      observer.observe(layer, { childList: true });
    }
  });
  const captured = type => page.evaluate(type => window.__STORM_RENDERED__.find(e => e.type === type), type);
  await ui.select("lightning-bolt"); await ui.point(100, 220); await ui.point(150, 220);
  await page.locator("#lightningVfxTestSelect").selectOption("4x4");
  const line = (await ui.state()).preview;
  await ui.play.click(); await expect(ui.overlay).toHaveCSS("opacity", "0");
  await expect.poll(() => captured("storm-lightning-beam")).toBeTruthy();
  const beam = await captured("storm-lightning-beam");
  expect(beam.branches).toBe(4);
  expect(beam.sprite).toBe(true);
  expect(beam.blend).toBe("screen");
  expect(beam.height).toBe(42);
  expect(beam.length).toBeCloseTo(line.previewGeometry.sizePixels, 0);
  expect(beam.length).toBeGreaterThan(50);
  await expect.poll(() => captured("storm-lightning-impact")).toBeTruthy();
  expect((await captured("storm-lightning-impact")).blend).toBe("screen");
  await expect(ui.overlay).toHaveCSS("opacity", "1", { timeout: 6000 });
  await expect(page.locator(".hg-map-vfx-effect")).toHaveCount(0);
  expect((await ui.state()).preview).toEqual(line);
  await ui.select("ice-storm"); await ui.point(160, 180); await ui.point(360, 220);
  const area = (await ui.state()).preview;
  await ui.play.click(); await expect(ui.overlay).toHaveCSS("opacity", "0");
  await expect.poll(() => captured("storm-hail")).toBeTruthy();
  const hail = await captured("storm-hail");
  expect(hail.stones).toBeGreaterThan(15); expect(hail.stones).toBeLessThanOrEqual(32);
  expect(hail.bursts).toBe(7);
  expect(hail.width).toBe(160);
  expect(hail.x).toBeCloseTo(area.previewTargetPoint.x, 0);
  expect(hail.y).toBeCloseTo(area.previewTargetPoint.y, 0);
  expect(hail.scale * 160).toBeCloseTo(area.previewGeometry.sizePixels * 2, 0);
  await expect.poll(() => captured("storm-frost")).toBeTruthy();
  await expect(ui.overlay).toHaveCSS("opacity", "1", { timeout: 6000 });
  expect((await ui.state()).preview).toEqual(area);
  await expect(page.locator(".hg-map-vfx-effect")).toHaveCount(0);
  await page.locator("#battleVfxModeSelect").selectOption("reduced");
  await page.evaluate(() => { window.__STORM_RENDERED__ = []; });
  await ui.play.click();
  await expect.poll(() => captured("storm-hail")).toBeTruthy();
  expect((await captured("storm-hail")).stones).toBe(7);
  expect((await captured("storm-hail")).bursts).toBe(2);
  await ui.reset.click(); await expect(page.locator(".hg-map-vfx-effect")).toHaveCount(0);
  await page.locator("#battleVfxModeSelect").selectOption("off");
  await ui.select("lightning-bolt"); await ui.point(100, 220); await ui.point(150, 220);
  await ui.play.click(); await expect(page.locator(".hg-map-vfx-effect")).toHaveCount(0);
  expect((await ui.state()).result.reason).toBe("effects-off");
  expect(await page.evaluate(() => window.__PREVIEW_CONFIRMED_EVENTS__)).toBe(0);
});

test("DM Spell Preview Fire Bolt travels in all eight directions after two clicks", async ({ page }) => {
  const ui = await openDmSpellPreview(page);
  await ui.select("fire-bolt");
  await page.locator("#battleVfxModeSelect").selectOption("full");
  // Capture the real rendered element when inserted. Polling for a 420-ms
  // animation can miss its entire lifetime on a busy CI worker.
  await page.evaluate(() => {
    window.__PREVIEW_RENDERED_PATHS__ = [];
    const observer = new MutationObserver((records) => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node.nodeType !== 1 ||
            !node.matches('.hg-vfx-fire-bolt-projectile-sprite.has-path')) continue;
        window.__PREVIEW_RENDERED_PATHS__.push({
          rotation: parseFloat(node.style.getPropertyValue('--hg-vfx-path-rotation')),
          length: parseFloat(node.style.getPropertyValue('--hg-vfx-path-length')),
          kind: node.dataset.effectKind
        });
      }
    });
    observer.observe(document.querySelector('.hg-map-vfx-layer'), { childList: true });
  });
  for (const [dx, dy] of [[140,0],[-140,0],[0,100],[0,-100],
    [100,100],[-100,100],[100,-100],[-100,-100]]) {
    await ui.reset.click();
    await ui.point(240, 180);
    await expect(ui.status).toContainText("Caster set. Click target.");
    await expect(ui.play).toBeDisabled();
    await ui.point(240 + dx, 180 + dy, true);
    await expect(ui.status).toContainText("/ 120 ft");
    await ui.point(240 + dx, 180 + dy);
    await expect(ui.play).toBeEnabled();
    await expect(ui.overlay).toHaveAttribute("data-preview-phase", "locked");
    const locked = (await ui.state()).preview;
    await ui.point(20, 20);
    expect((await ui.state()).preview.previewTargetPoint).toEqual(locked.previewTargetPoint);
    await page.evaluate(() => { window.__PREVIEW_RENDERED_PATHS__ = []; });
    await ui.play.click();
    const played = await ui.state();
    expect(played.event.preview).toBe(true);
    expect(played.event.casterTokenId).toBe("");
    expect(played.event.deliveryType).toBe("projectile");
    expect(played.event.targetPoint.x - played.event.casterPoint.x).toBeCloseTo(dx, 0);
    expect(played.event.targetPoint.y - played.event.casterPoint.y).toBeCloseTo(dy, 0);
    expect(played.result.ok).toBe(true);
    // Check the actual rendered path, not only event data (the old null-ratio
    // normalization bug passed event-only checks but rendered toward 0,0).
    await expect.poll(() => page.evaluate(() => window.__PREVIEW_RENDERED_PATHS__.length)).toBe(1);
    const path = await page.evaluate(() => window.__PREVIEW_RENDERED_PATHS__[0]);
    expect(path.kind).toBe("sprite");
    expect(path.rotation).toBeCloseTo(Math.atan2(dy, dx) * 180 / Math.PI, 0);
    expect(path.length).toBeCloseTo(Math.hypot(dx, dy), 0);
    await expect(page.locator('.hg-vfx-fire-bolt-projectile-sprite.has-path')).toHaveCount(0);
  }
});

test("DM Spell Preview areas, directions and target-only effects use existing geometry", async ({ page }) => {
  const ui = await openDmSpellPreview(page);
  for (const [spell, delivery, shape, size] of [
    ["fireball","burst","sphere",20], ["flame-strike","burst","cylinder",10],
    ["ice-storm","burst","cylinder",20], ["burning-hands","cone","cone",15],
    ["lightning-bolt","line","line",100], ["sacred-flame","impact","circle",2.5]
  ]) {
    await ui.select(spell);
    await expect(page.locator("#templateSizeInput")).toBeDisabled();
    await ui.point(200, 180);
    await ui.point(300, 100, true);
    await ui.point(300, 100);
    await ui.play.click();
    const state = await ui.state();
    expect(state.event.spellId).toBe(spell);
    expect(state.event.deliveryType).toBe(delivery);
    expect(state.event.geometry.shape).toBe(shape);
    expect(state.event.geometry.sizeFeet).toBe(size);
    const directional = ["cone","line"].includes(shape);
    const center = directional ? state.event.casterPoint : state.event.targetPoint;
    expect(state.event.geometry.anchor.x).toBeCloseTo(center.x, 1);
    expect(state.event.geometry.anchor.y).toBeCloseTo(center.y, 1);
    if (directional) {
      expect(state.event.geometry.directionRadians).toBeCloseTo(Math.atan2(-80, 100), 2);
      const endpoint = state.event.geometry.directionPoint;
      expect(Math.hypot(endpoint.x - center.x, endpoint.y - center.y))
        .toBeCloseTo(state.event.geometry.sizePixels, 1);
    }
    expect(state.event.affectedTokens).toEqual([]);
  }
  await ui.reset.click();
  expect((await ui.state()).preview).toMatchObject({
    previewCasterPoint: null, previewTargetPoint: null, previewLocked: false, phase: "caster"
  });
  await expect(ui.play).toBeDisabled();
  await expect(page.locator(".hg-spell-preview-caster")).toHaveCount(0);
  await expect(page.locator(".hg-spell-preview-range")).toHaveCount(0);
  await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.setDmRole(false));
  await expect(ui.play).toBeHidden();
  await expect(ui.overlay).toBeHidden();
});

test("DM Spell Preview validates live range/elevation and never resolves gameplay; modes and cleanup remain bounded", async ({ page }) => {
  const ui = await openDmSpellPreview(page);
  // Prepare a real pending cast, then switch to preview. Its resource-spending
  // confirmation callback must never run.
  await page.evaluate(() => {
    const token = document.createElement('div');
    token.className = 'hg-token hg-token-player';
    token.dataset.tokenId = 'preview-isolation-token';
    token.dataset.tokenType = 'player';
    token.dataset.linkedCharacterId = 'release-test-character';
    Object.assign(token.style, {
      position: 'absolute', left: '100px', top: '110px', width: '64px', height: '64px'
    });
    document.getElementById('tokenLayer').appendChild(token);
  });
  await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.beginSpellCast({ spellId: "fireball" }));
  await ui.select("fire-bolt");
  await expect(page.locator("#spellCastingPanel")).toBeHidden();
  await ui.point(100, 160);
  await ui.point(400, 160, true);
  const near = (await ui.state()).preview.rangeFeet;
  await ui.point(500, 160, true);
  expect((await ui.state()).preview.rangeFeet).toBeGreaterThan(near);
  await page.locator("#rulerEndElevationInput").fill("150");
  await expect(ui.status).toContainText("Out of range");
  await expect(ui.overlay).toHaveClass(/is-invalid-target/);
  await ui.point(500, 160);
  await expect(ui.play).toBeDisabled();
  await page.locator("#rulerEndElevationInput").fill("0");
  await expect(ui.play).toBeEnabled();
  await ui.reset.click();
  await expect(ui.status).toContainText("Click caster position.");
  await ui.point(100, 160);
  await ui.point(400, 160);
  for (const mode of ["full", "reduced", "off"]) {
    await page.locator("#battleVfxModeSelect").selectOption(mode);
    await ui.play.click();
    expect((await ui.state()).result.ok).toBe(true);
    if (mode === "off") {
      expect((await ui.state()).result.reason).toBe("effects-off");
      expect(await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.getVfxState().activeCount)).toBe(0);
      await expect(page.locator(".hg-map-vfx-effect")).toHaveCount(0);
    }
  }
  await page.locator("#battleVfxModeSelect").selectOption("full");
  for (let i = 0; i < 24; i += 1) await ui.play.click();
  const getCounts = () => page.evaluate(() => ({
    effects: window.__HOMEBREW_GOD_RELEASE_TEST__.getVfxState().activeCount,
    sequences: window.__HOMEBREW_GOD_RELEASE_TEST__.getVfxSequenceState().activeCount
  }));
  const counts = await getCounts();
  expect(counts.effects).toBeLessThanOrEqual(64);
  expect(counts.sequences).toBeLessThanOrEqual(16);
  await expect.poll(getCounts, { timeout: 8000 }).toEqual({ effects: 0, sequences: 0 });
  expect(await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.getSpellCastState())).toBeNull();
  expect(await page.evaluate(() => window.__PREVIEW_CONFIRMED_EVENTS__)).toBe(0);
  await expect(page.locator("body")).toHaveAttribute("data-test-cast-confirmed", "0");
  // Returning to real casting clears all preview points and restores its UI.
  await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.beginSpellCast({ spellId: "fireball" }));
  expect((await ui.state()).preview).toBeNull();
  await expect(ui.play).toBeDisabled();
  await expect(page.locator("#spellCastingPanel")).toBeVisible();
  await page.locator("#cancelSpellCastButton").click();
});

test(
  "Class step keeps starting-class selection after Abilities and rerenders multiclass success immediately",
  async ({ page }) => {
    await page.goto(
      "?smokeTest=1&release=class-state-regressions-20260829",
      { waitUntil: "domcontentloaded" }
    );
    await page.waitForFunction(() => Boolean(
      window.__HOMEBREW_GOD_RELEASE_TEST__
    ));
    await page.evaluate(() => window
      .__HOMEBREW_GOD_RELEASE_TEST__
      .openScreen("characterCreator"));
    await page.evaluate(() => window
      .__HOMEBREW_GOD_RELEASE_TEST__
      .prepareCharacterCreatorClassTest({
        totalLevel: 2,
        stepId: "abilities"
      }));

    const strength = page.locator(
      "#ccAbility-str"
    );
    await expect(strength).toBeVisible();
    await strength.fill("13");
    await strength.blur();
    await page.evaluate(() => window
      .__HOMEBREW_GOD_RELEASE_TEST__
      .setCharacterCreatorTestStep("class"));

    await expect(page.locator(
      '[data-starting-class-selector="true"]'
    )).toBeVisible();
    const beforeClass = await page.evaluate(() => window
      .__HOMEBREW_GOD_RELEASE_TEST__
      .getCharacterCreatorTestState());
    expect(beforeClass.classProgression.classes).toEqual([]);

    await page.locator(
      "#ccCharacterLevel"
    ).fill("2");
    await page.locator(
      "#ccCharacterLevel"
    ).blur();
    await expect(page.locator(
      "#ccCharacterLevel"
    )).toHaveValue("2");

    await page.locator(
      '[data-cc-action="choose-class"][data-class-id="artificer"]'
    ).click();
    await expect(page.locator(
      "[data-level-first-panel]"
    )).toContainText("Artificer 2");

    await page.getByRole("button", {
      name: "Add a Multiclass"
    }).click();
    let dialog = page.getByRole("dialog");
    await dialog.getByRole("button", {
      name: "Split 1 Level Into Selected Class"
    }).click();
    await expect(dialog.locator(
      "#ccMulticlassAddStatus"
    )).toContainText("Choose a class to add first");
    await dialog.locator(
      "#ccMulticlassAddClass"
    ).selectOption("wizard");
    await dialog.getByRole("button", {
      name: "Split 1 Level Into Selected Class"
    }).click();

    await expect(page.locator(
      "[data-level-first-panel]"
    )).toContainText("Artificer 1 / Wizard 1");
    await expect(page.getByRole("heading", {
      name: /Artificer.*Starting Class/,
      exact: false
    }).locator("..")).toContainText("Class Level: 1");
    await expect(page.getByRole("heading", {
      name: "Wizard",
      exact: true
    }).first().locator("..")).toContainText("Class Level: 1");
    await expect(page.locator(
      "#ccMulticlassAddStatus"
    )).not.toContainText("Choose a class to add first");
    await expect(page.locator(
      "#ccMulticlassAddStatus"
    )).not.toContainText(
      "That class is already in this character's progression"
    );
    await expect(page.locator(
      "#ccMulticlassAddClass"
    )).toHaveValue("");
    await expect(page.locator(
      "#ccMulticlassAddClass option"
    ).first()).toHaveText("Add another character level first");
    await expect(page.locator(
      '[data-cc-action="add-multiclass-class"]'
    )).toBeDisabled();

    const classState = await page.evaluate(() => window
      .__HOMEBREW_GOD_RELEASE_TEST__
      .getCharacterCreatorTestState());
    expect(classState.classProgression.classes.map((entry) => ({
      classId: entry.classId,
      level: entry.level
    }))).toEqual([
      { classId: "artificer", level: 1 },
      { classId: "wizard", level: 1 }
    ]);

    await page.evaluate(() => window
      .__HOMEBREW_GOD_RELEASE_TEST__
      .setCharacterCreatorTestStep("review"));
    await expect(page.locator(
      "#characterWizardStepBody"
    )).toContainText("Artificer 1");
    await expect(page.locator(
      "#characterWizardStepBody"
    )).toContainText("Wizard 1");
    await page.evaluate(() => window
      .__HOMEBREW_GOD_RELEASE_TEST__
      .setCharacterCreatorTestStep("class"));
    await expect(page.locator(
      "[data-level-first-panel]"
    )).toContainText("Artificer 1 / Wizard 1");
  }
);

test(
  "character-sheet area spells expose Target on Map without spending resources",
  async ({ page }) => {
    await page.goto(
      "tests/browser-pages/playable-character-sheet.html",
      { waitUntil: "domcontentloaded" }
    );
    await expect(page.locator("body"))
      .toHaveAttribute("data-test-status", "pass");
    await page.locator(
      '[data-character-sheet-tab="spells"]'
    ).click();
    await page.locator(
      '[data-character-sheet-input="spell-search"]'
    ).fill("Fireball");

    const fireball = page.locator(
      '[data-sheet-spell-id="fireball"]'
    ).first();
    await expect(fireball).toContainText(
      "Target on Map"
    );
    await fireball.locator(
      '[data-character-sheet-action="target-spell"]'
    ).click();
    await expect(page.locator("body"))
      .toHaveAttribute(
        "data-targeted-spell-id",
        "fireball"
      );
    await expect(page.locator("body"))
      .toHaveAttribute(
        "data-targeted-character-id",
        "playable-sheet-fixture"
      );
    await expect(fireball).toContainText(
      "no slot is spent until Confirm Cast"
    );
  }
);

test(
  "character spell targeting anchors to its linked token and confirms exactly once",
  async ({ page }) => {
    await page.goto(
      "?smokeTest=1&release=vfx-cast-stage2-20260827",
      { waitUntil: "domcontentloaded" }
    );
    await page.waitForFunction(() => Boolean(
      window.__HOMEBREW_GOD_RELEASE_TEST__
    ));
    await page.evaluate(() => window
      .__HOMEBREW_GOD_RELEASE_TEST__
      .openScreen("battle"));
    await page.evaluate(() => {
      window.__RELEASE_TEST_CAST_VFX_EVENTS__ = [];
      document.addEventListener(
        "homebrewgod:spell-cast-confirmed",
        (event) => {
          window.__RELEASE_TEST_CAST_VFX_EVENTS__.push(
            JSON.parse(JSON.stringify(event.detail))
          );
        }
      );
      const layer = document.getElementById(
        "tokenLayer"
      );
      const token =
        document.createElement("div");
      token.className =
        "hg-token hg-token-player";
      token.dataset.tokenId =
        "release-test-wizard-token";
      token.dataset.tokenName =
        "Release Test Wizard";
      token.dataset.tokenType = "player";
      token.dataset.linkedCharacterId =
        "release-test-character";
      token.style.position = "absolute";
      token.style.left = "100px";
      token.style.top = "110px";
      token.style.width = "64px";
      token.style.height = "64px";
      layer.appendChild(token);
    });
    await page.evaluate(() => window
      .__HOMEBREW_GOD_RELEASE_TEST__
      .beginSpellCast({
        spellId: "burning-hands",
        characterId:
          "release-test-character"
      }));

    const panel = page.locator(
      "#spellCastingPanel"
    );
    const overlay = page.locator(
      ".hg-map-template-layer"
    );
    const confirm = page.locator(
      "#confirmSpellCastButton"
    );

    await expect(panel).toBeVisible();
    await expect(panel).toContainText(
      "Burning Hands"
    );
    await expect(overlay).toHaveAttribute(
      "data-template-shape",
      "cone"
    );
    await expect(overlay).toHaveAttribute(
      "data-template-phase",
      "aiming"
    );
    await expect(confirm).toBeDisabled();
    await expect(page.locator("body"))
      .toHaveAttribute(
        "data-test-cast-confirmed",
        "0"
      );
    expect(await page.evaluate(() => ({
      events:
        window.__RELEASE_TEST_CAST_VFX_EVENTS__.length,
      activeEffects:
        window.__HOMEBREW_GOD_RELEASE_TEST__
          .getVfxState()?.activeCount || 0
    }))).toEqual({
      events: 0,
      activeEffects: 0
    });

    await overlay.scrollIntoViewIfNeeded();
    const box = await overlay.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(
      box.x + 330,
      box.y + 150
    );
    await page.mouse.click(
      box.x + 330,
      box.y + 150
    );
    await expect(overlay).toHaveAttribute(
      "data-template-phase",
      "confirmed"
    );
    await expect(confirm).toBeEnabled();
    await expect(page.locator("body"))
      .toHaveAttribute(
        "data-test-cast-confirmed",
        "0"
      );
    expect(await page.evaluate(() => ({
      events:
        window.__RELEASE_TEST_CAST_VFX_EVENTS__.length,
      activeEffects:
        window.__HOMEBREW_GOD_RELEASE_TEST__
          .getVfxState()?.activeCount || 0
    }))).toEqual({
      events: 0,
      activeEffects: 0
    });

    await confirm.click();
    await expect(page.locator("body"))
      .toHaveAttribute(
        "data-test-cast-confirmed",
        "1"
      );
    await expect(confirm).toHaveText(
      "Cast Confirmed"
    );
    await expect(
      page.locator(
        "#spellCastingResolution"
      )
    ).toContainText("DEX save DC 15");
    await expect(
      page.locator(
        "#spellCastingResolution"
      )
    ).toContainText("3d6 fire");
    const confirmedVfx = await page.evaluate(() => ({
      events:
        window.__RELEASE_TEST_CAST_VFX_EVENTS__,
      state:
        window.__HOMEBREW_GOD_RELEASE_TEST__
          .getVfxState(),
      sequenceState:
        window.__HOMEBREW_GOD_RELEASE_TEST__
          .getVfxSequenceState()
    }));
    expect(confirmedVfx.events).toHaveLength(1);
    expect(confirmedVfx.events[0]).toMatchObject({
      schemaVersion: 1,
      spellId: "burning-hands",
      spellName: "Burning Hands",
      casterTokenId:
        "release-test-wizard-token",
      casterElevation: 0,
      targetElevation: 0,
      damageTypes: ["fire"],
      spellLevel: 1,
      intensity: 1,
      deliveryType: "cone",
      geometry: {
        shape: "cone"
      }
    });
    expect(
      Number.isFinite(
        confirmedVfx.events[0].casterPoint.x
      )
    ).toBe(true);
    expect(
      Number.isFinite(
        confirmedVfx.events[0].targetPoint.x
      )
    ).toBe(true);
    expect(
      Array.isArray(
        confirmedVfx.events[0].affectedTokens
      )
    ).toBe(true);
    expect(confirmedVfx.state.activeCount)
      .toBeGreaterThan(0);
    expect(confirmedVfx.sequenceState.activeCount)
      .toBe(1);
    expect(
      confirmedVfx.sequenceState
        .sequences[0].definitionId
    ).toBe("fire-directional");
    expect([
      "charge",
      "release",
      "travel",
      "impact",
      "aftermath"
    ]).toContain(
      confirmedVfx.sequenceState
        .sequences[0].phase
    );
    expect(confirmedVfx.state.effects.every(
      ({ type }) => type.startsWith("fire-")
    )).toBe(true);
    expect(await page.locator(
      '.hg-map-vfx-effect[data-effect-type^="fire-"]'
    ).count()).toBeGreaterThan(0);
    await expect(page.locator(
      ".hg-map-vfx-effect"
    )).toHaveCount(0, { timeout: 5000 });
    await expect.poll(() => page.evaluate(() => (
      window.__HOMEBREW_GOD_RELEASE_TEST__
        .getVfxSequenceState()?.activeCount || 0
    ))).toBe(0);
    expect(await page.evaluate(() => (
      window.__RELEASE_TEST_CAST_VFX_EVENTS__.length
    ))).toBe(1);
  }
);

test(
  "spell range uses token and target elevation for true distance",
  async ({ page }) => {
    await page.goto(
      "?smokeTest=1&release=token-elevation-stage7-20260826",
      { waitUntil: "domcontentloaded" }
    );
    await page.waitForFunction(() => Boolean(
      window.__HOMEBREW_GOD_RELEASE_TEST__
    ));
    await page.evaluate(() => window
      .__HOMEBREW_GOD_RELEASE_TEST__
      .openScreen("battle"));
    await page.locator(
      "#mapFeetPerSquareInput"
    ).fill("50");
    await page.evaluate(() => {
      const layer = document.getElementById(
        "tokenLayer"
      );
      const token =
        document.createElement("div");
      token.className =
        "hg-token hg-token-player is-elevated";
      token.dataset.tokenId =
        "elevated-wizard-token";
      token.dataset.tokenName =
        "Elevated Wizard";
      token.dataset.tokenType = "player";
      token.dataset.tokenElevation = "100";
      token.dataset.linkedCharacterId =
        "elevated-character";
      token.style.position = "absolute";
      token.style.left = "100px";
      token.style.top = "110px";
      token.style.width = "64px";
      token.style.height = "64px";
      layer.appendChild(token);
    });
    await page.evaluate(() => window
      .__HOMEBREW_GOD_RELEASE_TEST__
      .beginSpellCast({
        spellId: "fireball",
        characterId: "elevated-character",
        characterName: "Elevated Wizard"
      }));

    await expect(page.locator(
      "#rulerStartElevationInput"
    )).toHaveValue("100");
    await expect(page.locator(
      "#spellCastingCaster"
    )).toContainText("+100 ft");

    const overlay = page.locator(
      ".hg-map-template-layer"
    );
    const token = page.locator(
      '[data-token-id="elevated-wizard-token"]'
    );
    await overlay.scrollIntoViewIfNeeded();
    const overlayBox = await overlay.boundingBox();
    const tokenBox = await token.boundingBox();
    expect(overlayBox).not.toBeNull();
    expect(tokenBox).not.toBeNull();

    const targetX = Math.min(
      overlayBox.x + overlayBox.width - 20,
      tokenBox.x + tokenBox.width / 2 + 154
    );
    const targetY =
      tokenBox.y + tokenBox.height / 2;
    await page.mouse.click(targetX, targetY);

    await expect(page.locator(
      "#spellCastingInstructions"
    )).toContainText("out of range");
    await expect(page.locator(
      "#confirmSpellCastButton"
    )).toBeDisabled();
    const elevatedState = await page.evaluate(() => window
      .__HOMEBREW_GOD_RELEASE_TEST__
      .getSpellCastState());
    expect(elevatedState.target.verticalFeet)
      .toBe(100);
    expect(elevatedState.target.distanceFeet)
      .toBeGreaterThan(150);

    await page.locator(
      "#rulerEndElevationInput"
    ).fill("100");
    await expect(page.locator(
      "#confirmSpellCastButton"
    )).toBeEnabled();
    const levelState = await page.evaluate(() => window
      .__HOMEBREW_GOD_RELEASE_TEST__
      .getSpellCastState());
    expect(levelState.target.verticalFeet).toBe(0);
    expect(levelState.target.distanceFeet)
      .toBeLessThanOrEqual(150);
  }
);

test(
  "battle-map VFX stay aligned, click through, honor modes, and clean themselves up",
  async ({ page }) => {
    await page.goto(
      "?smokeTest=1&release=vfx-core-stage1-20260827",
      { waitUntil: "domcontentloaded" }
    );
    await page.waitForFunction(() => Boolean(
      window.__HOMEBREW_GOD_RELEASE_TEST__
    ));
    await page.evaluate(() => window
      .__HOMEBREW_GOD_RELEASE_TEST__
      .openScreen("battle"));

    const layer = page.locator(
      ".hg-map-vfx-layer"
    );
    const viewer = page.locator(
      "#battleMapViewer"
    );
    const modeSelect = page.locator(
      "#battleVfxModeSelect"
    );

    await expect(layer).toHaveCount(1);
    await modeSelect.selectOption("full");
    const presentation = await layer.evaluate(
      (element) => {
        const style = getComputedStyle(element);
        return {
          ariaHidden:
            element.getAttribute("aria-hidden"),
          pointerEvents: style.pointerEvents,
          zIndex: style.zIndex
        };
      }
    );
    expect(presentation).toEqual({
      ariaHidden: "true",
      pointerEvents: "none",
      zIndex: "50"
    });

    await page.evaluate(() => {
      window.__VFX_CLICK_THROUGH__ = 0;
      document.getElementById("battleMapViewer")
        .addEventListener("click", () => {
          window.__VFX_CLICK_THROUGH__ += 1;
        }, { once: true });
    });
    const layerBox = await layer.boundingBox();
    expect(layerBox).not.toBeNull();
    await page.mouse.click(
      layerBox.x + layerBox.width / 2,
      layerBox.y + layerBox.height / 2
    );
    await expect.poll(() => page.evaluate(
      () => window.__VFX_CLICK_THROUGH__
    )).toBe(1);

    const played = await page.evaluate(() => window
      .__HOMEBREW_GOD_RELEASE_TEST__
      .playVfxTest({
        duration: 120,
        intensity: 3
      }));
    expect(played.ok).toBe(true);
    const effect = layer.locator(
      `[data-effect-id="${played.id}"]`
    );
    await expect(effect).toHaveCount(1);
    await expect(effect).toHaveAttribute(
      "data-effect-state",
      "active"
    );
    await expect(effect).toHaveCount(0, {
      timeout: 2000
    });
    await expect.poll(async () => (
      await page.evaluate(() => window
        .__HOMEBREW_GOD_RELEASE_TEST__
        .getVfxState().activeCount)
    )).toBe(0);

    await page.setViewportSize({
      width: 900,
      height: 700
    });
    await expect.poll(async () => {
      const [vfxBox, viewerBox] = await Promise.all([
        layer.boundingBox(),
        viewer.boundingBox()
      ]);
      return Math.max(
        Math.abs(vfxBox.x - viewerBox.x),
        Math.abs(vfxBox.y - viewerBox.y),
        Math.abs(vfxBox.width - viewerBox.width),
        Math.abs(vfxBox.height - viewerBox.height)
      );
    }).toBeLessThanOrEqual(1);

    const zoomPlayed = await page.evaluate(() => window
      .__HOMEBREW_GOD_RELEASE_TEST__
      .playVfxTest({ duration: 2000 }));
    const zoomEffect = layer.locator(
      `[data-effect-id="${zoomPlayed.id}"]`
    );
    await expect(zoomEffect).toHaveCSS(
      "--hg-vfx-scale",
      "1"
    );
    await page.locator("#zoomInButton").click();
    await expect(zoomEffect).toHaveCSS(
      "--hg-vfx-scale",
      "1.25"
    );

    const spritePlayed = await page.evaluate(() => window
      .__HOMEBREW_GOD_RELEASE_TEST__
      .playVfxTest({
        type: "fire-impact-sprite",
        duration: 2000,
        scale: 1.2,
        rotation: 30,
        opacity: 0.6
      }));
    expect(spritePlayed.ok).toBe(true);
    const spriteEffect = layer.locator(
      `[data-effect-id="${spritePlayed.id}"]`
    );
    await expect(spriteEffect).toHaveAttribute(
      "data-effect-kind",
      "sprite"
    );
    await expect(spriteEffect).toHaveCSS(
      "--hg-vfx-scale",
      "1.5"
    );
    await expect(spriteEffect).toHaveCSS(
      "--hg-vfx-rotation",
      "30deg"
    );
    await expect(spriteEffect).toHaveCSS(
      "opacity",
      "0.6"
    );
    const spriteNode = spriteEffect.locator(
      ".hg-vfx-sprite"
    );
    await expect(spriteNode).toHaveCount(1);
    await expect(spriteNode).toHaveCSS(
      "background-size",
      "640px 640px"
    );
    await expect(spriteNode).toHaveCount(0, {
      timeout: 1500
    });
    await expect(spriteEffect).toHaveCount(1);

    const fireBoltProjectile = await page.evaluate(() => window
      .__HOMEBREW_GOD_RELEASE_TEST__
      .playVfxTest({
        type: "fire-bolt-projectile-sprite",
        startPosition: { x: 90, y: 140 },
        endPosition: { x: 420, y: 240 },
        duration: 800
      }));
    expect(fireBoltProjectile.ok).toBe(true);
    const fireBoltProjectileEffect = layer.locator(
      `[data-effect-id="${fireBoltProjectile.id}"]`
    );
    await expect(fireBoltProjectileEffect).toHaveClass(
      /has-path/
    );
    const fireBoltProjectileNode = fireBoltProjectileEffect.locator(
      ".hg-vfx-sprite"
    );
    await expect(fireBoltProjectileNode).toHaveCSS(
      "background-size",
      "512px 192px"
    );
    await expect(fireBoltProjectileNode).toHaveCSS(
      "animation-name",
      "hg-vfx-fire-bolt-projectile"
    );
    expect(await fireBoltProjectileNode.evaluate((element) => (
      getComputedStyle(element).backgroundImage
    ))).toContain("fire-bolt-projectile.png");

    const fireBoltImpact = await page.evaluate(() => window
      .__HOMEBREW_GOD_RELEASE_TEST__
      .playVfxTest({
        type: "fire-bolt-impact-sprite",
        duration: 700
      }));
    expect(fireBoltImpact.ok).toBe(true);
    const fireBoltImpactNode = layer.locator(
      `[data-effect-id="${fireBoltImpact.id}"] .hg-vfx-sprite`
    );
    await expect(fireBoltImpactNode).toHaveCSS(
      "background-size",
      "512px 512px"
    );
    await expect(fireBoltImpactNode).toHaveCSS(
      "animation-name",
      "hg-vfx-fire-bolt-impact"
    );
    expect(await fireBoltImpactNode.evaluate((element) => (
      getComputedStyle(element).backgroundImage
    ))).toContain("fire-bolt-impact.png");

    const fireballProjectile = await page.evaluate(() => window
      .__HOMEBREW_GOD_RELEASE_TEST__
      .playVfxTest({
        type: "fireball-projectile-sprite",
        startPosition: { x: 90, y: 180 },
        endPosition: { x: 470, y: 260 },
        duration: 1000
      }));
    expect(fireballProjectile.ok).toBe(true);
    const fireballProjectileEffect = layer.locator(
      `[data-effect-id="${fireballProjectile.id}"]`
    );
    await expect(fireballProjectileEffect).toHaveClass(/has-path/);
    const fireballProjectileNode = fireballProjectileEffect.locator(
      ".hg-vfx-sprite"
    );
    await expect(fireballProjectileNode).toHaveCSS(
      "background-size",
      "1254px 1254px"
    );
    await expect(fireballProjectileNode).toHaveCSS(
      "animation-name",
      "hg-vfx-fireball-projectile"
    );
    expect(await fireballProjectileNode.evaluate((element) => (
      getComputedStyle(element).backgroundImage
    ))).toContain("fireball-projectile.png");
    await expect(fireBoltProjectileEffect).toHaveCount(0, {
      timeout: 2000
    });
    await expect(fireBoltImpactNode).toHaveCount(0, {
      timeout: 2000
    });
    await expect(fireballProjectileEffect).toHaveCount(0, {
      timeout: 2500
    });

    await expect.poll(async () => {
      const [vfxBox, viewerBox] = await Promise.all([
        layer.boundingBox(),
        viewer.boundingBox()
      ]);
      return Math.max(
        Math.abs(vfxBox.x - viewerBox.x),
        Math.abs(vfxBox.y - viewerBox.y),
        Math.abs(vfxBox.width - viewerBox.width),
        Math.abs(vfxBox.height - viewerBox.height)
      );
    }).toBeLessThanOrEqual(1);

    await modeSelect.selectOption("reduced");
    await expect(layer).toHaveAttribute(
      "data-effects-mode",
      "reduced"
    );
    const reduced = await page.evaluate(() => window
      .__HOMEBREW_GOD_RELEASE_TEST__
      .playVfxTest({
        duration: 5000,
        intensity: 5,
        particles: { count: 999 }
      }));
    const reducedEffect = layer.locator(
      `[data-effect-id="${reduced.id}"]`
    );
    await expect(reducedEffect).toHaveCSS(
      "--hg-vfx-duration",
      "1000ms"
    );
    await expect(
      reducedEffect.locator(".hg-vfx-particle")
    ).toHaveCount(24);

    await modeSelect.selectOption("off");
    await expect(layer).toHaveAttribute(
      "data-effects-mode",
      "off"
    );
    await expect(reducedEffect).toHaveCount(0);
    const skipped = await page.evaluate(() => window
      .__HOMEBREW_GOD_RELEASE_TEST__
      .playVfxTest());
    expect(skipped).toMatchObject({
      ok: true,
      skipped: true,
      reason: "effects-off"
    });
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

