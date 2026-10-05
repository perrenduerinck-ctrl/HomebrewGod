import { test, expect } from "@playwright/test";

const screens = [
  "auth",
  "lobby",
  "room",
  "battle",
  "characterCreator",
  "monsterCreator",
  "magicItemCreator",
  "spellCreator",
  "npcCreator",
  "encounterCreator",
  "summonCreator",
  "workshop"
];

async function openSmokeApp(page) {
  await page.goto("?smokeTest=1&release=visual-ui", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#homebrewGodSmokeResult")).toContainText("SMOKE TEST PASS", { timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.__HOMEBREW_GOD_RELEASE_TEST__));
}

async function auditScreens(page, viewport) {
  await page.setViewportSize(viewport);
  const results = [];
  for (const screenName of screens) {
    await page.evaluate((name) => window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen(name), screenName);
    results.push(await page.evaluate((name) => {
      const visible = [...document.querySelectorAll("main.screen")]
        .find((element) => !element.classList.contains("hidden"));
      return {
        requested: name,
        visible: visible?.id || "",
        overflow: document.documentElement.scrollWidth - window.innerWidth
      };
    }, screenName));
  }
  return results;
}

test("major screens fit phone and table-laptop viewports", async ({ page }) => {
  await openSmokeApp(page);
  const laptop = await auditScreens(page, { width: 1366, height: 768 });
  const phone = await auditScreens(page, { width: 390, height: 844 });

  for (const result of [...laptop, ...phone]) {
    expect(result.overflow, `${result.requested} overflowed horizontally`).toBeLessThanOrEqual(1);
  }
});

test("mobile actions wrap and Library tabs keep readable intrinsic widths", async ({ page }) => {
  await openSmokeApp(page);
  await page.setViewportSize({ width: 390, height: 844 });

  await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen("summonCreator"));
  await expect(page.locator(".summon-actions")).toHaveCSS("flex-wrap", "wrap");
  const summonSizing = await page.locator(".summon-actions").evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth
  }));
  expect(summonSizing.scrollWidth).toBeLessThanOrEqual(summonSizing.clientWidth + 1);

  await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen("workshop"));
  const tabs = await page.locator(".workshop-tabs > button").evaluateAll((buttons) => buttons.map((button) => ({
    width: button.getBoundingClientRect().width,
    scrollWidth: button.scrollWidth,
    flex: getComputedStyle(button).flex
  })));
  expect(tabs.length).toBeGreaterThan(4);
  for (const tab of tabs) {
    expect(tab.width + 1).toBeGreaterThanOrEqual(tab.scrollWidth);
    expect(tab.flex).toBe("0 0 auto");
  }
});
