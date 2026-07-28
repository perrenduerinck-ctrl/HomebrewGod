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
        "ai-testing/character-creator-self-test.html?release=phase20-20260727"
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
      /Adding a class requires both existing and new class prerequisites/i,
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
  "playable character sheet tracks combat and remains usable at phone width",
  async ({ page }) => {
    await page.goto(
      "ai-testing/playable-character-sheet.html?release=playable-sheet-20260727",
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
  }
);

test(
  "Phase 19 module contracts remain green under the Phase 20 runner",
  async ({ page }) => {
    await page.goto(
      "ai-testing/character-modules-self-test.html?release=phase20-20260727",
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
        "ai-testing/ruleset-policy-test.html?release=phase20-20260727",
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
      "ai-testing/monster-creator-self-test.html?release=phase20-20260727",
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
      "ai-testing/security-persistence-self-test.html?release=phase20-20260727",
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
