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
      "ai-testing/character-modules-self-test.html?release=phase20-20260727",
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
