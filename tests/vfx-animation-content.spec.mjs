import { test, expect } from "@playwright/test";
import { mockAnimationServices, animationRecords } from "./helpers/animation-services.mjs";
test.use({ actionTimeout: 20000 });

const field = (dialog, key) => dialog.locator(`[data-animation-${key}]`);
async function battle(page, room = "UXA-123") {
  await page.goto(`?smokeTest=1&vfxTest=1&room=${room}&view=battle`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.__HOMEBREW_GOD_RELEASE_TEST__));
  await expect(page.locator("#roomCodeText")).toContainText(room);
  await page.evaluate(async () => { await window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen("battle"); window.__HOMEBREW_GOD_RELEASE_TEST__.setDmRole(true); });
  await page.locator("#battleToolsMenu").evaluate(el => { el.open = true; });
  await page.locator("#battleVfxModeSelect").selectOption("full");
}
async function creator(page) {
  await page.evaluate(async () => { const api = window.__HOMEBREW_GOD_RELEASE_TEST__; await api.openScreen("characterCreator"); api.prepareCharacterCreatorClassTest({ stepId: "spells" }); });
}
async function choose(page, row, id) {
  await row.locator('[data-animation-action="choose"], [data-slot-action="choose"]').click();
  const dialog = page.locator("#animationLibraryDialog");
  await dialog.getByRole("tab", { name: "All", exact: true }).click();
  await field(dialog, "select").selectOption(id); await field(dialog, "use-selected").click();
}
const records = page => page.evaluate(() => JSON.parse(localStorage.getItem("acceptance-firestore") || "{}"));
async function saveCharacter(page) {
  await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.setCharacterCreatorTestStep("basics"));
  await page.locator("#ccCharacterName").fill("Gary UX Wizard"); await page.locator("#characterWizardSaveButton").click();
  await expect.poll(async () => Object.values(await records(page)).flatMap(x => x.magic?.customSpells || []).length).toBe(1);
}

test("Library and Creator are distinct, family templates save/filter correctly and magic subtype is separate from tags", async ({ page }, info) => {
  const services = await mockAnimationServices(page, { room: "UXA-123" }); await battle(page);
  await page.locator("#battleToolsMenu").evaluate(el => { el.open = true; }); await page.locator("#animationLibraryButton").click(); const dialog = page.locator("#animationLibraryDialog");
  await expect(dialog).toHaveAttribute("aria-label", "Animation Library");
  await expect(dialog.getByRole("tab")).toHaveCount(7); await expect(field(dialog, "assign")).toHaveCount(0);
  await field(dialog, "close").click(); await page.locator("#animationCreatorButton").click();
  await expect(dialog).toHaveAttribute("aria-label", "Animation Creator"); await expect(field(dialog, "form")).not.toBeVisible();
  for (const [family, name] of [["Melee", "Sword Slash UX"], ["Ranged", "Arrow Flight UX"]]) {
    await dialog.getByRole("button", { name: family, exact: true }).click();
    await expect(field(dialog, "family")).toHaveValue(family.toLowerCase());
    await field(dialog, "name").fill(name);
    await field(dialog, "file").setInputFiles({ name: "sheet.png", mimeType: "image/png", buffer: services.sheet });
    await dialog.getByRole("button", { name: "Save Animation", exact: true }).click();
    await expect(field(dialog, "status")).toContainText("personal library");
    await dialog.getByRole("tab", { name: family, exact: true }).click();
    await expect(dialog.locator(".hg-animation-card").filter({ hasText: name })).toHaveCount(1);
    await dialog.getByRole("tab", { name: "Magic", exact: true }).click();
    await expect(dialog.locator(".hg-animation-card").filter({ hasText: name })).toHaveCount(0);
    if (family === "Melee") await field(dialog, "tool-creator").click();
  }
  const saved = await animationRecords(page);
  expect(saved.find(x => x.family === "melee").placement.mode).toBe("SOURCE_TOWARD_TARGET");
  expect(saved.find(x => x.family === "melee").placement.followSource).toBe(true);
  expect(saved.find(x => x.family === "ranged").placement.mode).toBe("SOURCE_TO_TARGET");
  await field(dialog, "filter-subtype").selectOption("impact");
  await expect(dialog.locator(".hg-animation-card")).toContainText(["Fireball explosion"]);
  await page.screenshot({ path: info.outputPath("family-library.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
});

test("Gary Fireball normal spell save/reopen restores stages and both directions of editing preserve content", async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 1400 });
  const services = await mockAnimationServices(page, { room: "UXA-123" }); await battle(page); await creator(page);
  await page.locator("#ccNewSpellName").fill("Gary Fireball");
  await page.locator("#ccNewSpellRange").fill("120 feet"); await page.locator("#ccNewSpellDescription").fill("Gary mechanics stay intact.");
  const section = page.locator('[data-cc-animation-section=""]');
  await expect(section.locator("[data-content-stage]")).toHaveCount(5);
  await section.locator('[data-content-stage="travel"] [data-animation-action="create"]').click();
  const dialog = page.locator("#animationLibraryDialog");
  await field(dialog, "name").fill("Gary Missile");
  await field(dialog, "file").setInputFiles({ name: "gary.png", mimeType: "image/png", buffer: services.sheet });
  await dialog.getByRole("button", { name: "Save Animation", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  for (const [slot, id] of [["cast", "cold_burst_01"], ["impact", "fireball_explosion_01"]]) await choose(page, section.locator(`[data-content-stage="${slot}"]`), id);
  await expect(page.locator("#ccNewSpellDescription")).toHaveValue("Gary mechanics stay intact.");
  await page.locator("#ccNewSpellKnown").uncheck(); await page.getByRole("button", { name: "Save Spell", exact: true }).click();
  await expect(page.locator("#characterCreatorStatus")).toContainText("Custom spell added");
  await expect(page.locator(".hg-content-animation-saved")).toContainText("cast → travel → impact");
  await saveCharacter(page);
  const [path, original] = Object.entries(await records(page)).find(([path, x]) => path.includes("/characters/") && x.magic?.customSpells?.length);
  await page.reload(); await page.waitForFunction(() => Boolean(window.__HOMEBREW_GOD_RELEASE_TEST__));
  await page.evaluate(async () => window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen("characterCreator"));
  page.on("dialog", dialog => dialog.accept());
  await page.locator('[data-cc-action="library"]').first().click();
  await page.locator(`[data-cc-action="edit-character"][data-character-id="${path.split("/").at(-1)}"]`).click();
  await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.setCharacterCreatorTestStep("spells"));
  await page.locator('[data-cc-action="edit-custom-spell"]').click();
  await expect(section.locator('[data-content-stage="cast"]')).toContainText("Cold burst");
  await expect(section.locator('[data-content-stage="travel"]')).toContainText("Gary Missile");
  await expect(section.locator('[data-content-stage="impact"]')).toContainText("Fireball explosion");
  await section.getByRole("button", { name: "Preview Full Spell", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Spell animations", exact: true });
  await panel.locator("[data-spell-play]").click(); await expect(panel.locator('[data-animation-id="cold_burst_01"]')).toBeVisible();
  await panel.locator("[data-spell-cancel]").click();
  await page.locator("#ccNewSpellRange").fill("150 feet"); await page.getByRole("button", { name: "Save Spell", exact: true }).click();
  await saveCharacter(page);
  let current = (await records(page))[path].magic.customSpells[0];
  expect(current.animations).toEqual(original.magic.customSpells[0].animations); expect(current.range).toBe("150 feet");
  await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.setCharacterCreatorTestStep("spells"));
  await page.locator('[data-cc-action="edit-custom-spell"]').click();
  await choose(page, section.locator('[data-content-stage="impact"]'), "healing_burst_01");
  await page.getByRole("button", { name: "Save Spell", exact: true }).click(); await saveCharacter(page);
  current = (await records(page))[path].magic.customSpells[0];
  expect(current.animations.impact.animationId).toBe("healing_burst_01"); expect(current.range).toBe("150 feet"); expect(current.description).toBe("Gary mechanics stay intact.");
  await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.setCharacterCreatorTestStep("spells"));
  await page.locator('[data-cc-action="edit-custom-spell"]').click();
  await section.scrollIntoViewIfNeeded(); await page.screenshot({ path: info.outputPath("saved-spell-stages.png") });
});

test("built-in Fireball appearance saves, reloads, casts, clears and isolates accounts without changing canonical data", async ({ page }) => {
  await mockAnimationServices(page, { room: "UXA-123" }); await battle(page);
  const canonical = await page.evaluate(async () => (await import("/data/defaultSpells.js?v=stage8-20260826")).getDefaultSpellById("fireball"));
  await page.locator("#spellTemplateSelect").selectOption("fireball"); await page.locator("#battleToolsMenu").evaluate(el => { el.open = true; }); await page.locator("#editSpellPresentationButton").click();
  const panel = page.getByRole("dialog", { name: "Spell animations", exact: true });
  await choose(page, panel.locator('[data-spell-animation-slot="impact"]'), "cold_burst_01");
  await panel.getByRole("button", { name: "Save Animation Setup", exact: true }).click(); await expect(panel).toHaveCount(0);
  expect((await records(page))["users/animation-acceptance-user"].spellAnimationOverrides.fireball.animations.impact.animationId).toBe("cold_burst_01");
  await page.reload(); await battle(page);
  await page.locator("#spellTemplateSelect").selectOption("fireball"); await page.locator("#battleToolsMenu").evaluate(el => { el.open = true; }); await page.locator("#editSpellPresentationButton").click();
  await expect(panel.locator('[data-spell-animation-slot="impact"] [data-slot-name]')).toHaveText("Cold burst"); await panel.locator("[data-spell-cancel]").click();
  await page.locator("#battleToolsMenu").evaluate(el => { el.open = true; }); await page.locator("#battleVfxTestFireballButton").click(); await expect(page.locator('#battleMapSurface [data-animation-id="cold_burst_01"]')).toBeVisible();
  expect(await page.evaluate(async () => (await import("/data/defaultSpells.js?v=stage8-20260826")).getDefaultSpellById("fireball"))).toEqual(canonical);
  await page.evaluate(() => window.__ANIMATION_ACCEPTANCE_SWITCH_USER__("other-owner"));
  await expect.poll(() => page.evaluate(async () => (await import("/vfx/animationWorkspace.js")).getAnimationSession(document).presentation.get("fireball"))).toBe(null);
  await page.evaluate(() => window.__ANIMATION_ACCEPTANCE_SWITCH_USER__("animation-acceptance-user"));
  await expect.poll(() => page.evaluate(async () => (await import("/vfx/animationWorkspace.js")).getAnimationSession(document).presentation.get("fireball")?.animations?.impact?.animationId)).toBe("cold_burst_01");
  await page.evaluate(async () => { await window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen("battle"); window.__HOMEBREW_GOD_RELEASE_TEST__.setDmRole(true); });
  await page.locator("#battleToolsMenu").evaluate(el => { el.open = true; }); await page.locator("#spellTemplateSelect").selectOption("fireball");
  await page.locator("#battleToolsMenu").evaluate(el => { el.open = true; }); await page.locator("#editSpellPresentationButton").click(); await panel.locator('[data-spell-animation-slot="impact"] [data-slot-action="clear"]').click();
  await panel.getByRole("button", { name: "Save Animation Setup", exact: true }).click(); await expect(panel).toHaveCount(0);
  await page.reload(); await battle(page); await page.locator("#battleToolsMenu").evaluate(el => { el.open = true; }); await page.locator("#battleVfxTestFireballButton").click();
  await expect(page.locator('#battleMapSurface [data-effect-type="fireball-clip-sprite"]')).not.toHaveCount(0);
});

test("temporary remixes cannot become saved spell references and normal character save catches replacements", async ({ page }) => {
  await mockAnimationServices(page, { room: "UXA-123" }); await battle(page); await creator(page);
  await page.locator("#ccNewSpellName").fill("Temporary guard spell");
  const section = page.locator('[data-cc-animation-section=""]');
  await choose(page, section.locator('[data-content-stage="impact"]'), "cold_burst_01");
  await page.locator("#ccNewSpellKnown").uncheck(); await page.getByRole("button", { name: "Save Spell", exact: true }).click();
  const copyId = await page.evaluate(async () => {
    const { library } = (await import("/vfx/animationWorkspace.js")).getAnimationSession(document);
    const copy = library.duplicateAnimation("cold_burst_01");
    // A cancelled remix of an existing secure hosted sheet is still session-only.
    library.updateAnimation(copy.id, { sprite: "https://res.cloudinary.com/acceptance/image/upload/guard-remix.png" });
    return copy.id;
  });
  await page.locator('[data-cc-action="edit-custom-spell"]').click();
  await section.locator('[data-content-stage="impact"] [data-animation-action="choose"]').click();
  const dialog = page.locator("#animationLibraryDialog");
  await dialog.getByRole("tab", { name: "All", exact: true }).click();
  await field(dialog, "select").selectOption(copyId); await field(dialog, "use-selected").click();
  await expect(field(dialog, "status")).toContainText("temporary"); await expect(dialog).toBeVisible();
  await field(dialog, "close").click();
  await page.evaluate(async copyId => {
    const { library } = (await import("/vfx/animationWorkspace.js")).getAnimationSession(document);
    library.replaceKnownReferences("cold_burst_01", copyId);
  }, copyId);
  await page.locator('[data-cc-action="edit-custom-spell"]').click();
  await page.locator("#ccNewSpellRange").fill("90 feet"); await page.getByRole("button", { name: "Save Spell", exact: true }).click();
  await expect(page.locator("#characterCreatorStatus")).toContainText("temporary");
  await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.setCharacterCreatorTestStep("basics"));
  await page.locator("#ccCharacterName").fill("Guard Wizard"); await page.locator("#characterWizardSaveButton").click();
  await expect(page.locator("#characterCreatorStatus")).toContainText("temporary");
  expect(Object.keys(await records(page)).some(path => path.includes("/characters/"))).toBe(false);
  // Save the existing hosted sheet; no re-upload is required to promote a remix.
  await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.setCharacterCreatorTestStep("spells"));
  await page.locator('[data-cc-action="edit-custom-spell"]').click();
  await section.locator('[data-content-stage="impact"] [data-animation-action="choose"]').click();
  await dialog.getByRole("tab", { name: "All", exact: true }).click(); await field(dialog, "select").selectOption(copyId);
  await field(dialog, "edit").click(); await dialog.getByRole("button", { name: "Save Animation", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "Save Spell", exact: true }).click(); await saveCharacter(page);
  expect(Object.values(await records(page)).flatMap(x => x.magic?.customSpells || [])[0].animations.impact.animationId).toBe(copyId);
});

test("reusable attack stage UI writes content refs, not global assignments, and preserves attack mechanics", async ({ page }) => {
  await mockAnimationServices(page, { room: "UXA-123" }); await battle(page);
  await page.evaluate(async () => {
    const { openAttackAnimationPanel } = await import("/vfx/attackAnimationPanel.js");
    window.attackDraft = { name: "Longbow", damage: "1d8 piercing", range: 150, animation: { family: "ranged", stages: {} } };
    window.attackResult = openAttackAnimationPanel({ attack: window.attackDraft, onChange: attack => { window.savedAttack = structuredClone(attack); } });
  });
  const panel = page.getByRole("dialog", { name: "Attack animations", exact: true });
  await expect(panel.locator("[data-spell-animation-sync]")).toContainText("Prepare → Projectile → Impact");
  for (const [slot, id] of [["cast", "cold_burst_01"], ["travel", "cold_burst_01"], ["impact", "fireball_explosion_01"]]) await choose(page, panel.locator(`[data-spell-animation-slot="${slot}"]`), id);
  await panel.getByRole("button", { name: "Use attack stages", exact: true }).click(); await expect(panel).toHaveCount(0);
  const saved = await page.evaluate(() => window.savedAttack);
  expect(Object.keys(saved.animation.stages)).toEqual(["prepare", "projectile", "impact"]); expect(saved.damage).toBe("1d8 piercing"); expect(saved.range).toBe(150);
  expect(await page.evaluate(async () => (await import("/vfx/animationWorkspace.js")).getAnimationSession(document).library.getAnimationUsage("cold_burst_01").map(x => x.name))).toEqual(["Longbow"]);
  expect(await page.evaluate(async () => (await import("/vfx/animationWorkspace.js")).getAnimationSession(document).bindings.exportAssignments())).toEqual({});
});

test("generic combat content exposes duration, targets, paths, layers, camera and token automation", async ({ page }) => {
  await mockAnimationServices(page, { room: "UXA-123" });
  await battle(page);
  await page.evaluate(async () => {
    const { openCombatAnimationPanel } = await import("/vfx/combatAnimationPanel.js");
    window.combatContent = {
      id: "dragon-breath",
      name: "Dragon Breath",
      kind: "monster action",
      damage: "12d6 fire"
    };
    window.combatPanelResult = openCombatAnimationPanel({
      content: window.combatContent,
      family: "magic",
      contentLabel: "Monster Action"
    });
  });
  const stages = page.getByRole("dialog", { name: "Monster Action animations", exact: true });
  await choose(page, stages.locator('[data-spell-animation-slot="impact"]'), "fireball_explosion_01");
  await stages.getByRole("button", { name: "Continue monster action setup", exact: true }).click();
  await expect(stages).toHaveCount(0);

  const behavior = page.getByRole("dialog", { name: "Combat animation behavior", exact: true });
  await behavior.locator("[data-combat-target-mode]").selectOption("all");
  await behavior.locator("[data-combat-duration-unit]").selectOption("rounds");
  await behavior.locator("[data-combat-duration-value]").fill("3");
  await behavior.locator("[data-combat-concentration]").check();
  await behavior.locator("[data-combat-motion-kind]").selectOption("curve");
  await behavior.locator("[data-combat-curvature]").fill("0.5");
  await behavior.locator("[data-combat-camera-enabled]").check();
  await behavior.locator("[data-combat-camera-shake]").fill("0.4");
  await behavior.locator("[data-combat-automation-kind]").selectOption("summon");
  await behavior.locator("[data-combat-automation-name]").fill("Flame Spirit");
  await behavior.locator("details").evaluate(element => { element.open = true; });
  await behavior.locator("[data-combat-add-layer]").click();
  await behavior.locator('[data-layer-animation-slot="impact"]').selectOption("cold_burst_01");
  await behavior.locator("[data-layer-delay]").fill("150");
  await behavior.getByRole("button", { name: "Save combat behavior", exact: true }).click();
  await expect(behavior).toHaveCount(0);
  await page.evaluate(() => window.combatPanelResult);

  const saved = await page.evaluate(() => window.combatContent);
  expect(saved.damage).toBe("12d6 fire");
  expect(saved.animation.family).toBe("magic");
  expect(saved.animation.targetMode).toBe("all");
  expect(saved.animation.duration).toMatchObject({ unit: "rounds", value: 3, concentration: true });
  expect(saved.animation.motion).toMatchObject({ kind: "curve", curvature: 0.5 });
  expect(saved.animation.camera.shake).toBe(0.4);
  expect(saved.animation.automation.summon.name).toBe("Flame Spirit");
  expect(saved.animation.layers[0].stages.impact.animationId).toBe("cold_burst_01");
  expect(saved.animation.layers[0].delay).toBe(150);
});

test("a DM can share a saved custom animation with the room and reload it", async ({ page }) => {
  await mockAnimationServices(page, { room: "UXA-123" });
  await battle(page);
  await page.evaluate(async () => {
    const { library } = (await import("/vfx/animationWorkspace.js")).getAnimationSession(document);
    library.registerAnimation({
      id: "shared-spark",
      name: "Shared Spark",
      sprite: "https://res.cloudinary.com/acceptance/image/upload/shared-spark.png",
      grid: { columns: 1, rows: 1 },
      frameCount: 1,
      ownership: { kind: "user", scope: "user", ownerId: "animation-acceptance-user" }
    });
  });
  await page.locator("#battleToolsMenu").evaluate(element => { element.open = true; });
  await page.locator("#animationLibraryButton").click();
  const libraryDialog = page.locator("#animationLibraryDialog");
  await libraryDialog.locator("[data-animation-select]").selectOption("shared-spark");
  await libraryDialog.locator("[data-animation-share-room]").click();
  await expect(libraryDialog.locator("[data-animation-status]")).toContainText("current room");
  expect((await records(page))["rooms/UXA-123/animations/room_shared-spark"].ownership.scope).toBe("room");
  await libraryDialog.locator("[data-animation-close]").click();

  await page.reload();
  await battle(page);
  await page.locator("#battleToolsMenu").evaluate(element => { element.open = true; });
  await page.locator("#animationLibraryButton").click();
  await expect.poll(() => page.evaluate(async () => (
    await import("/vfx/animationWorkspace.js")
  ).getAnimationSession(document).library.getAnimation("room_shared-spark")?.ownership?.scope)).toBe("room");
});
