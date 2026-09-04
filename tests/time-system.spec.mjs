import {
  expect,
  test
} from "@playwright/test";

async function openTimePanel(page) {
  const panel = page.locator(
    "#battleCampaignTimePanel"
  );

  if (!await panel.evaluate((element) => element.open)) {
    await panel.locator("summary").click();
  }
  await expect(panel).toHaveJSProperty(
    "open",
    true
  );
  return panel;
}

test("campaign clock is compact, role-aware, and advances once per full combat round", async ({ page }) => {
  await page.goto(
    "?smokeTest=1&release=campaign-time-20260904",
    { waitUntil: "domcontentloaded" }
  );

  await expect(
    page.locator("#homebrewGodSmokeResult")
  ).toContainText(
    "SMOKE TEST PASS",
    { timeout: 30000 }
  );

  await page.evaluate(async () => {
    const release =
      window.__HOMEBREW_GOD_RELEASE_TEST__;
    await release.openScreen("battle");
    release.setCampaignTimeTestState({
      worldTime: 12 * 3600,
      timeMode: "exploration"
    });
    release.setDmRole(false);
  });

  const timePanel = await openTimePanel(page);
  await expect(
    timePanel.locator("summary")
  ).toContainText("Day 1 · 12:00:00");
  await expect(
    timePanel.locator(
      "[data-time-dm-controls]"
    )
  ).toBeHidden();

  const playerMutation =
    await page.evaluate(async () => {
      try {
        await window
          .__HOMEBREW_GOD_RELEASE_TEST__
          .advanceCampaignTimeForTest(60);
        return "allowed";
      } catch (error) {
        return error.code || error.message;
      }
    });
  expect(playerMutation).toBe(
    "time/permission-denied"
  );

  await page.evaluate(() => {
    window.__HOMEBREW_GOD_RELEASE_TEST__
      .setDmRole(true);
  });
  await expect(
    timePanel.locator(
      "[data-time-dm-controls]"
    )
  ).toBeVisible();

  await timePanel.locator(
    "[data-time-start-combat]"
  ).click();
  await expect(
    timePanel.locator(
      "[data-time-mode-label]"
    ).first()
  ).toContainText("Combat");
  await expect(
    timePanel.locator("[data-time-clock]")
  ).toHaveText("12:00:00");

  await timePanel.locator(
    "[data-time-complete-round]"
  ).click();
  await expect(
    timePanel.locator("[data-time-clock]")
  ).toHaveText("12:00:06");
  await expect(
    timePanel.locator("[data-time-round]")
  ).toHaveText("2");
  await expect(
    timePanel.locator(
      "[data-time-combat-elapsed]"
    )
  ).toHaveText("6 seconds");

  await timePanel.locator(
    "[data-time-end-combat]"
  ).click();
  await expect(
    timePanel.locator("[data-time-clock]")
  ).toHaveText("12:00:06");
  await expect(
    timePanel.locator(
      "[data-time-complete-round]"
    )
  ).toBeHidden();
});
