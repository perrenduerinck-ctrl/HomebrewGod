import {
  expect,
  test
} from "@playwright/test";

test(
  "deployed GitHub Pages build loads every application module",
  async ({ page }) => {
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
        timeout: 60000
      }
    );
    await expect(page.locator("html"))
      .toContainText(
        "Homebrew God"
      );
  }
);

test(
  "deployed GitHub Pages build passes the module contract suite",
  async ({ page }) => {
    await page.goto(
      "tests/browser-pages/character-modules-self-test.html?release=phase20-20260727",
      {
        waitUntil: "commit"
      }
    );

    await expect(
      page.locator("#result")
    ).toContainText(
      "PASS — 88",
      {
        timeout: 60000
      }
    );
  }
);

test(
  "deployed Library, Monster Creator, Animation Creator and summon modules load without import errors",
  async ({ page }) => {
    const importErrors = [];
    page.on("pageerror", (error) => importErrors.push(error.message));
    await page.goto("?smokeTest=1&release=unified-library", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#homebrewGodSmokeResult")).toContainText("SMOKE TEST PASS", { timeout: 60000 });
    const modules = await page.evaluate(async () => {
      const paths = [
        "workshop/index.js",
        "library/libraryAggregator.js",
        "library/accountLibraryIndex.js",
        "library/adapters/accountLibraryAdapter.js",
        "library/adapters/monsterLibraryAdapter.js",
        "library/adapters/animationLibraryAdapter.js",
        "library/adapters/mapLibraryAdapter.js",
        "library/adapters/npcLibraryAdapter.js",
        "library/copyToRoom.js",
        "monsters/creator.js",
        "npcs/npcCreator.js",
        "npcs/npcModel.js",
        "npcs/npcPersistence.js",
        "npcs/npcPreview.js",
        "encounters/encounterModel.js",
        "encounters/encounterPersistence.js",
        "encounters/encounterLoader.js",
        "encounters/encounterCreator.js",
        "library/adapters/encounterLibraryAdapter.js",
        "vfx/animationWorkspace.js",
        "vfx/summonAutomation.js",
        "vfx/summonAutomationPanel.js"
      ];
      return Promise.all(paths.map(async (path) => ({
        path,
        exports: Object.keys(await import(new URL(path, document.baseURI).href))
      })));
    });
    expect(modules.every((entry) => entry.exports.length > 0)).toBe(true);
    await page.waitForFunction(() => Boolean(window.__HOMEBREW_GOD_RELEASE_TEST__));
    expect((await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen("workshop"))).visible).toBe(true);
    expect((await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen("monsterCreator"))).visible).toBe(true);
    expect((await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen("npcCreator"))).visible).toBe(true);
    expect((await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen("encounterCreator"))).visible).toBe(true);
    await page.evaluate(() => document.getElementById("animationCreatorButton")?.click());
    await expect(page.getByRole("dialog", { name: "Animation Creator" })).toBeVisible();
    expect(importErrors).toEqual([]);
  }
);

const deployedSelfTests = [
  {
    name:
      "character creator",
    path:
      "tests/browser-pages/character-creator-self-test.html?release=phase20-20260727",
    selector: "#result",
    expected: "\"total\": 460"
  },
  {
    name:
      "ruleset policy",
    path:
      "tests/browser-pages/ruleset-policy-test.html?release=phase20-20260727",
    selector: "#result",
    expected: "\"passed\": true"
  },
  {
    name:
      "monster creator",
    path:
      "tests/browser-pages/monster-creator-self-test.html?release=phase20-20260727",
    selector: "#testResult",
    expected: "97 Phase 20"
  },
  {
    name:
      "security and persistence",
    path:
      "tests/browser-pages/security-persistence-self-test.html?release=phase20-20260727",
    selector: "#testResult",
    expected: "64 Phase 18"
  }
];

for (const suite of deployedSelfTests) {
  test(
    `deployed GitHub Pages build passes the ${suite.name} suite`,
    async ({ page }) => {
      await page.goto(
        suite.path,
        {
          waitUntil:
            "domcontentloaded"
        }
      );

      await expect(
        page.locator("body")
      ).toHaveAttribute(
        "data-test-status",
        "pass",
        {
          timeout: 120000
        }
      );
      await expect(
        page.locator(
          suite.selector
        )
      ).toContainText(
        suite.expected
      );
    }
  );
}
