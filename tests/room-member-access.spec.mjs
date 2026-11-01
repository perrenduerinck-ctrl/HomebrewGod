import { test, expect } from "@playwright/test";

test("DM room access removes, blocks, unblocks, and remains private on mobile", async ({ page }) => {
  await page.goto("tests/browser-pages/room-member-access-self-test.html");
  await expect(page.locator("body")).toHaveAttribute("data-test-status", "ready");

  const panel = page.locator("#roomMemberAccessPanel");
  await expect(panel).toBeVisible();
  await expect(panel.locator("[data-room-members-list] .hg-room-access-row")).toHaveCount(1);
  await panel.getByRole("button", { name: "Remove & Block Rejoin" }).click();
  await expect(panel.locator("[data-room-members-list]")).toContainText(
    "No player memberships are currently saved."
  );
  await expect(panel.locator("[data-room-bans-list]")).toContainText("Test Player");

  const blockedState = await page.evaluate(() => {
    const testState = window.__ROOM_MEMBER_ACCESS_TEST__;
    return {
      hasMembership: testState.store.players.has("player-1"),
      hasBan: testState.store.bannedUsers.has("player-1"),
      activeSessions: testState.store.activePlayers.size,
      confirmation: testState.confirmations.at(-1),
      notification: testState.notifications.at(-1)
    };
  });
  expect(blockedState).toMatchObject({
    hasMembership: false,
    hasBan: true,
    activeSessions: 0
  });
  expect(blockedState.confirmation.message).toContain("cannot rejoin");
  expect(blockedState.notification).toContain("blocked from rejoining");

  await panel.getByRole("button", { name: "Allow Rejoin" }).click();
  await expect(panel.locator("[data-room-bans-list]")).toContainText(
    "No players are blocked from this room."
  );
  const allowedState = await page.evaluate(() => ({
    hasMembership: window.__ROOM_MEMBER_ACCESS_TEST__.store.players.has("player-1"),
    hasBan: window.__ROOM_MEMBER_ACCESS_TEST__.store.bannedUsers.has("player-1")
  }));
  expect(allowedState).toEqual({ hasMembership: false, hasBan: false });

  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.evaluate(() => window.__ROOM_MEMBER_ACCESS_TEST__.setPlayerContext());
  await expect(panel).toBeHidden();
});
