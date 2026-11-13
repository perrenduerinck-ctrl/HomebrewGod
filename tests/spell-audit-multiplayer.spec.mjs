import { test, expect } from "@playwright/test";
const firebase = "https://www.gstatic.com/firebasejs/10.12.5/";
async function signIn(page, name) {
  await page.goto("?firebaseEmulator=1&smokeTest=1");
  await expect(page.locator("#homebrewGodSmokeResult")).toContainText("SMOKE TEST PASS", { timeout: 60000 });
  await page.locator("#guestNameInput").fill(name);
  await page.locator("#guestButton").click();
  await expect(page.locator("#lobbyScreen")).toBeVisible();
  return page.evaluate(async (base) => (await import(base + "firebase-auth.js")).getAuth().currentUser.uid, firebase);
}
async function record(page, path, value) {
  return page.evaluate(async ({ base, path, value }) => {
    const { getFirestore, doc, setDoc, getDoc } = await import(base + "firebase-firestore.js");
    const ref = doc(getFirestore(), ...path);
    if (value) await setDoc(ref, value);
    return (await getDoc(ref)).data();
  }, { base: firebase, path, value });
}
test("player and DM confirm real spells, synchronize resources and concentration, and retain them after refresh", async ({ browser }) => {
  test.setTimeout(120000);
  const dmContext = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const playerContext = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const dm = await dmContext.newPage(); const player = await playerContext.newPage();
  try {
    for (const page of [dm, player]) {
      page.setDefaultTimeout(15000);
      await page.route("https://example.test/spell-map.svg", (route) => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><rect width="1600" height="1000" fill="#334455"/></svg>' }));
    }
    const [dmUid, playerUid] = await Promise.all([signIn(dm, "Spell DM"), signIn(player, "Spell Player")]);
    await dm.locator("#roomNameInput").fill("Spell regression");
    await dm.locator("#createRoomButton").click();
    await expect(dm.locator("#roomCodeText")).toHaveText(/^[A-Z0-9]+-[A-Z0-9]+$/);
    const roomCode = (await dm.locator("#roomCodeText").textContent()).trim();
    await player.locator("#joinRoomCodeInput").fill(roomCode);
    await player.locator("#joinRoomButton").click();
    await expect(player.locator("#roomDashboardScreen")).toBeVisible();
    const room = ["rooms", roomCode];
    await dm.evaluate(async ({ base, room }) => {
      const { getFirestore, doc, updateDoc } = await import(base + "firebase-firestore.js");
      await updateDoc(doc(getFirestore(), ...room), { currentMap: { id: "spell-map", name: "Spell map", url: "https://example.test/spell-map.svg" } });
    }, { base: firebase, room });
    const hero = { roomCode, ownerUid: playerUid, revision: 1, schemaVersion: 13, identity: { name: "Spell Hero" }, combat: { maxHp: 20, currentHp: 20 }, magic: { knownSpellIds: ["blur"], classSources: { wizard: { classId: "wizard", className: "Wizard", spellbookSpellIds: ["blur"] }, sorcerer: { classId: "sorcerer", className: "Sorcerer", knownSpellIds: ["blur"] } }, slots: { 2: 1 } } };
    await record(player, [...room, "characters", "hero"], hero);
    await record(dm, [...room, "monsters", "mage"], { roomCode, ownerUid: dmUid, revision: 1, name: "Spell Mage", spellcasting: { enabled: true, slotPools: { 1: { maximum: 1, used: 0 }, 2: { maximum: 2, used: 1 }, 3: { maximum: 1, used: 0 } }, spells: [{ id: "mirror-entry", source: "library", sourceId: "mirror-image", name: "Mirror Image", level: 2, castingTime: "1 action", range: "Self", usage: "slot" }, { id: "shield-entry", source: "library", sourceId: "shield", name: "Shield", level: 1, castingTime: "1 reaction", range: "Self", usage: "slot" }, { id: "blur-entry", source: "library", sourceId: "blur", name: "Blur", level: 2, castingTime: "1 action", range: "Self", usage: "daily", uses: 1 }] } });
    for (const [id, linked, uid, type, x] of [["hero-token", { linkedCharacterId: "hero" }, playerUid, "player", 25], ["mage-token", { linkedMonsterId: "mage" }, dmUid, "enemy", 70]]) {
      await record(dm, [...room, "tokens", id], { id, name: id, ownerUid: uid, ...linked, type, sourceType: type === "player" ? "character" : "monster", visibility: "shared", mapMode: "single", x, y: 50, currentHp: 20, maxHp: 20, movementSpeed: 30 });
    }
    for (const page of [dm, player]) await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen("battle"));
    await player.locator('.hg-token[data-token-id="hero-token"]').click();
    await player.locator("#combatActionBar").getByRole("tab", { name: /^Spells/ }).click();
    await player.locator('#combatActionBar [data-action-list]').getByRole("button", { name: /Blur/ }).click();
    await expect(player.locator("#confirmSpellCastButton")).toBeEnabled();
    await expect(player.locator("#spellCastingSlotSelect option:disabled")).toContainText("Wizard");
    await player.locator("#confirmSpellCastButton").click();
    await expect(player.locator("#confirmSpellCastButton")).toHaveText("Cast Confirmed");
    await expect.poll(() => record(dm, [...room, "characters", "hero"])).toMatchObject({ magic: { slotUsage: { normal: { 2: 1 } } }, combat: { concentration: { spellId: "blur" } } });
    await dm.locator('.hg-token[data-token-id="mage-token"]').click();
    await dm.locator("#combatActionBar").getByRole("tab", { name: /^Spells/ }).click();
    await dm.locator('#combatActionBar [data-action-list]').getByRole("button", { name: /Blur/ }).click();
    await expect(dm.locator("#confirmSpellCastButton")).toBeEnabled();
    await dm.locator("#confirmSpellCastButton").click();
    await expect(dm.locator("#confirmSpellCastButton")).toHaveText("Cast Confirmed");
    await expect.poll(() => record(player, [...room, "monsters", "mage"])).toMatchObject({ spellcasting: { concentration: { spellId: "blur" }, spells: expect.arrayContaining([expect.objectContaining({ id: "blur-entry", usesUsed: 1 })]) } });
    await dm.locator("#cancelSpellCastButton").click();
    const originalConcentration = (await record(dm, [...room, "monsters", "mage"])).spellcasting.concentration;
    const editMage = async (hp, hidden) => {
      await dm.locator('.hg-token[data-token-id="mage-token"]').click({ button: "right" });
      await dm.getByRole("menuitem", { name: "Edit Token", exact: true }).click();
      await dm.getByRole('spinbutton', { name: 'Current HP', exact: true }).fill(String(hp));
      await dm.getByRole('checkbox', { name: 'DM-only hidden token', exact: true }).setChecked(hidden);
      await dm.getByRole("button", { name: "Save Token", exact: true }).click();
      await expect(dm.getByRole("button", { name: "Save Token", exact: true })).not.toBeVisible();
      await expect.poll(async () => (await record(dm, [...room, hidden ? "dmTokens" : "tokens", "mage-token"]))?.currentHp).toBe(hp);
    };
    await editMage(19, false);
    await expect.poll(() => record(player, [...room, "monsters", "mage"])).toMatchObject({ spellcasting: { pendingConcentrationCheck: { dc: 10 } } });
    await editMage(18, true);
    await expect(player.locator('.hg-token[data-token-id="mage-token"]')).toHaveCount(0);
    await editMage(17, false);
    await expect(player.locator('.hg-token[data-token-id="mage-token"]')).toBeVisible();
    await expect.poll(async () => (await record(player, [...room, "monsters", "mage"])).spellcasting.pendingConcentrationChecks.length).toBe(3);
    await dm.locator('.hg-token[data-token-id="mage-token"]').click({ button: "right" });
    dm.once("dialog", (dialog) => dialog.accept("5"));
    await dm.getByRole("menuitem", { name: "Adjust HP", exact: true }).click();
    await expect.poll(() => record(player, [...room, "monsters", "mage"])).toMatchObject({ spellcasting: { pendingConcentrationCheck: { dc: 10 } } });
    await dm.locator('.hg-token[data-token-id="mage-token"]').click({ button: "right" });
    dm.once("dialog", (dialog) => dialog.accept("9"));
    await dm.getByRole("menuitem", { name: "Resolve Concentration Save", exact: true }).click();
    await expect.poll(() => record(player, [...room, "monsters", "mage"])).toMatchObject({ spellcasting: { concentration: null, pendingConcentrationCheck: null } });
    await dm.evaluate(async ({ base, room, concentration }) => {
      const { getFirestore, doc, getDoc, updateDoc, serverTimestamp } = await import(base + "firebase-firestore.js");
      const ref = doc(getFirestore(), ...room, "monsters", "mage");
      const current = (await getDoc(ref)).data();
      await updateDoc(ref, { revision: current.revision + 1, "spellcasting.concentration": concentration, updatedAt: serverTimestamp(), updatedAtMillis: Date.now() });
    }, { base: firebase, room, concentration: originalConcentration });
    await editMage(0, true);
    await expect.poll(() => record(player, [...room, "monsters", "mage"])).toMatchObject({ spellcasting: { concentration: null, pendingConcentrationCheck: null, pendingConcentrationChecks: [] } });
    await editMage(20, false);
    const beforeRest = (await record(dm, room)).worldTime || 0;
    await dm.locator('[data-time-rest="short"]').first().evaluate((button) => button.click());
    await expect.poll(async () => (await record(dm, room)).worldTime || 0).toBeGreaterThanOrEqual(beforeRest + 3600);
    expect((await record(player, [...room, "monsters", "mage"])).spellcasting.spells.find((entry) => entry.id === "blur-entry").usesUsed).toBe(1);
    await dm.locator('[data-time-rest="long"]').first().evaluate((button) => button.click());
    await expect.poll(() => record(player, [...room, "monsters", "mage"])).toMatchObject({ spellcasting: { slotPools: { 2: { used: 0 } }, spells: expect.arrayContaining([expect.objectContaining({ id: "blur-entry", usesUsed: 0 })]) } });
    await Promise.all([dm.reload(), player.reload()]);
    await expect.poll(() => record(player, [...room, "characters", "hero"])).toMatchObject({ magic: { slotUsage: { normal: { 2: 1 } } }, combat: { concentration: { spellId: "blur" } } });
    await expect.poll(() => record(dm, [...room, "monsters", "mage"])).toMatchObject({ spellcasting: { concentration: null, slotPools: { 2: { used: 0 } }, spells: expect.arrayContaining([expect.objectContaining({ id: "blur-entry", usesUsed: 0 })]) } });

    for (const page of [dm, player]) await page.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen("battle"));
    const editHero = async (hp, hidden = false) => {
      await dm.locator('.hg-token[data-token-id="hero-token"]').click({ button: "right" });
      await dm.getByRole("menuitem", { name: "Edit Token", exact: true }).click();
      await dm.getByRole("spinbutton", { name: "Current HP", exact: true }).fill(String(hp));
      await dm.getByRole("checkbox", { name: "DM-only hidden token", exact: true }).setChecked(hidden);
      await dm.getByRole("button", { name: "Save Token", exact: true }).click();
      await expect.poll(async () => (await record(player, [...room, "characters", "hero"])).combat.currentHp).toBe(hp);
      await expect.poll(async () => (await record(dm, [...room, hidden ? "dmTokens" : "tokens", "hero-token"]))?.currentHp).toBe(hp);
    };
    await editHero(19);
    await expect.poll(() => record(player, [...room, "characters", "hero"])).toMatchObject({ combat: { concentration: { spellId: "blur" }, pendingConcentrationCheck: { dc: 10 } } });
    await editHero(18, true);
    await expect(player.locator('.hg-token[data-token-id="hero-token"]')).toHaveCount(0);
    await expect.poll(async () => (await record(player, [...room, "characters", "hero"])).combat.pendingConcentrationChecks.length).toBe(2);
    await editHero(0, false);
    await expect.poll(() => record(player, [...room, "characters", "hero"])).toMatchObject({ combat: { concentration: null, pendingConcentrationChecks: [] } });
    await editHero(20);
    await expect(player.locator('.hg-token[data-token-id="hero-token"]')).toBeVisible();

    // A real monster upcast must offer and charge the chosen shared pool.
    await dm.locator('.hg-token[data-token-id="mage-token"]').click();
    await dm.locator("#combatActionBar").getByRole("tab", { name: /^Spells/ }).click();
    await dm.locator('#combatActionBar [data-action-list]').getByRole("button", { name: /^Mirror Image/ }).click();
    await dm.locator("#spellCastingSlotSelect").selectOption({ label: "Level 3 shared slot (1 remaining)" });
    await dm.locator("#confirmSpellCastButton").click();
    await expect(dm.locator("#confirmSpellCastButton")).toHaveText("Cast Confirmed");
    await expect.poll(() => record(player, [...room, "monsters", "mage"])).toMatchObject({ spellcasting: { slotPools: { 2: { used: 0 }, 3: { used: 1 } } } });
    await dm.locator("#cancelSpellCastButton").click();

    // An entry that keeps its ID but changes resource type cannot confirm stale targeting.
    await dm.locator('#combatActionBar [data-action-list]').getByRole("button", { name: /^Mirror Image/ }).click();
    await dm.locator("#spellCastingSlotSelect").selectOption({ label: "Level 2 shared slot (2 remaining)" });
    await expect(dm.locator("#confirmSpellCastButton")).toBeEnabled();
    const changedMageRevision = await dm.evaluate(async ({ base, room }) => {
      const { getFirestore, doc, getDoc, updateDoc } = await import(base + "firebase-firestore.js");
      const ref = doc(getFirestore(), ...room, "monsters", "mage");
      const current = (await getDoc(ref)).data();
      await updateDoc(ref, { revision: current.revision + 1, "spellcasting.spells": current.spellcasting.spells.map((entry) => entry.id === "mirror-entry" ? { ...entry, usage: "atWill" } : entry) });
      return current.revision + 1;
    }, { base: firebase, room });
    await dm.locator("#confirmSpellCastButton").click();
    await expect(dm.locator("#spellCastingResolution")).toContainText("reference changed");
    expect((await record(player, [...room, "monsters", "mage"])).revision).toBe(changedMageRevision);
    expect((await record(player, [...room, "monsters", "mage"])).spellcasting.slotPools[2].used).toBe(0);
    await dm.locator("#cancelSpellCastButton").click();

    // Start a real one-minute cast, persist it across refresh, then complete ten distinct turns.
    await player.evaluate(async ({ base, room }) => {
      const { getFirestore, doc, getDoc, updateDoc } = await import(base + "firebase-firestore.js");
      const ref = doc(getFirestore(), ...room, "characters", "hero");
      const current = (await getDoc(ref)).data();
      await updateDoc(ref, { revision: current.revision + 1, "magic.slots.1": 1, "magic.customSpells": [{ id: "long-spell", name: "Long Ward", level: 1, range: "Self", castingTime: "1 minute", known: true, manualOverride: true }, { id: "ritual-spell", name: "Ritual Ward", level: 1, range: "Self", castingTime: "1 action", ritual: true, known: true, manualOverride: true }], "magic.classSources.wizard.spellbookSpellIds": ["blur", "ritual-spell"] });
    }, { base: firebase, room });
    // Complete exploration casting only after the persisted campaign clock advances.
    await player.locator('.hg-token[data-token-id="hero-token"]').click();
    await player.locator("#combatActionBar").getByRole("tab", { name: /^Spells/ }).click();
    await player.locator('#combatActionBar [data-action-list]').getByRole("button", { name: /Long Ward/ }).click();
    await player.getByRole("button", { name: "Begin Casting", exact: true }).click();
    await expect.poll(() => record(dm, [...room, "characters", "hero"])).toMatchObject({ combat: { longCasting: { mode: "elapsed", requiredSeconds: 60 } } });
    await expect(player.locator('[data-long-casting-command="continue"]')).toBeDisabled();
    const elapsedAttempt = (await record(dm, [...room, "characters", "hero"])).combat.longCasting;
    await dm.evaluate(async ({ base, room, worldTime }) => {
      const { getFirestore, doc, updateDoc } = await import(base + "firebase-firestore.js");
      await updateDoc(doc(getFirestore(), ...room), { worldTime });
    }, { base: firebase, room, worldTime: elapsedAttempt.startedWorldTime + 60 });
    await expect(player.locator('[data-long-casting-command="continue"]')).toBeEnabled();
    await player.locator('[data-long-casting-command="continue"]').click();
    await player.locator("#confirmSpellCastButton").click();
    await expect(player.locator("#confirmSpellCastButton")).toHaveText("Cast Confirmed");
    await expect.poll(() => record(dm, [...room, "characters", "hero"])).toMatchObject({ magic: { slotUsage: { normal: { 1: 1 } } }, combat: { longCasting: { status: "completed" } } });
    await player.locator("#cancelSpellCastButton").click();
    await player.evaluate(async ({ base, room }) => {
      const { getFirestore, doc, getDoc, updateDoc } = await import(base + "firebase-firestore.js");
      const ref = doc(getFirestore(), ...room, "characters", "hero");
      const current = (await getDoc(ref)).data();
      await updateDoc(ref, { revision: current.revision + 1, "magic.slotUsage.normal.1": 0 });
    }, { base: firebase, room });
    const ritualResource = player.locator('[data-long-casting-resource="ritual-spell"]');
    await expect(ritualResource).toBeVisible();
    const ritualValue = await ritualResource.locator("option").filter({ hasText: /Ritual/i }).first().getAttribute("value");
    await ritualResource.selectOption(ritualValue);
    await player.locator('#combatActionBar [data-action-list]').getByRole("button", { name: /^Ritual Ward/ }).click();
    await player.getByRole("button", { name: "Begin Casting", exact: true }).click();
    await expect.poll(() => record(dm, [...room, "characters", "hero"])).toMatchObject({ combat: { longCasting: { requiredSeconds: 606, status: "casting" } } });
    let ritualAttempt = (await record(dm, [...room, "characters", "hero"])).combat.longCasting;
    expect(ritualAttempt.requiredSeconds).toBe(606);
    // The real map Effects path ends a player's casting concentration atomically.
    await dm.locator('.hg-token[data-token-id="hero-token"]').click({ button: "right" });
    await dm.getByRole("menuitem", { name: "Apply / Remove Condition", exact: true }).click();
    await dm.locator('[data-effect-field="definitionId"]').selectOption("stunned");
    await dm.locator('[data-effect-field="targetTokenId"]').selectOption("hero-token");
    await dm.getByRole("button", { name: "Apply Effect", exact: true }).click();
    await expect.poll(() => record(player, [...room, "characters", "hero"])).toMatchObject({ combat: { concentration: null } });
    await expect.poll(async () => Object.values((await record(dm, [...room, "tokens", "hero-token"])).effectConditions || {})).toContain("stunned");
    await dm.locator(".hg-gameplay-effect-card").filter({ hasText: "Stunned" }).getByRole("button", { name: "Remove", exact: true }).click();
    await expect.poll(async () => Object.values((await record(dm, [...room, "tokens", "hero-token"])).effectConditions || {})).toHaveLength(0);
    await dm.keyboard.press("Escape");
    await player.locator('[data-long-casting-command="cancel"]').click();
    await expect.poll(() => record(dm, [...room, "characters", "hero"])).toMatchObject({ combat: { longCasting: { status: "cancelled" } } });
    await ritualResource.selectOption(ritualValue);
    await player.locator('#combatActionBar [data-action-list]').getByRole("button", { name: /^Ritual Ward/ }).click();
    await player.getByRole("button", { name: "Begin Casting", exact: true }).click();
    await expect.poll(() => record(dm, [...room, "characters", "hero"])).toMatchObject({ combat: { longCasting: { status: "casting", requiredSeconds: 606 } } });
    ritualAttempt = (await record(dm, [...room, "characters", "hero"])).combat.longCasting;

    await dm.evaluate(async ({ base, room, worldTime }) => {
      const { getFirestore, doc, updateDoc } = await import(base + "firebase-firestore.js");
      await updateDoc(doc(getFirestore(), ...room), { worldTime });
    }, { base: firebase, room, worldTime: ritualAttempt.startedWorldTime + ritualAttempt.requiredSeconds });
    await expect(player.locator('[data-long-casting-command="continue"]')).toBeEnabled();
    await player.locator('[data-long-casting-command="continue"]').click();
    await player.locator("#confirmSpellCastButton").click();
    await expect(player.locator("#confirmSpellCastButton")).toHaveText("Cast Confirmed");
    expect((await record(dm, [...room, "characters", "hero"])).magic.slotUsage.normal[1]).toBe(0);
    await player.locator("#cancelSpellCastButton").click();
    const setRound = (round) => dm.evaluate(async ({ base, room, round }) => {
      const { getFirestore, doc, updateDoc } = await import(base + "firebase-firestore.js");
      await updateDoc(doc(getFirestore(), ...room), { initiativeState: { combatActive: true, roundNumber: round, turnCounter: round - 1, currentCombatantId: "hero-token", initiativeOrder: [{ tokenId: "hero-token", initiative: 18 }, { tokenId: "mage-token", initiative: 10 }] } });
    }, { base: firebase, room, round });
    await setRound(1);
    // Off-turn monster reactions store restrictions under the actual active turn.
    await dm.locator('.hg-token[data-token-id="mage-token"]').click();
    await dm.locator("#combatActionBar").getByRole("tab", { name: /^Spells/ }).click();
    await dm.locator('#combatActionBar [data-action-list]').getByRole("button", { name: /^Shield/ }).click();
    await dm.locator("#confirmSpellCastButton").click();
    await dm.getByRole("button", { name: "DM confirmed trigger" }).click();
    await expect(dm.locator("#confirmSpellCastButton")).toHaveText("Cast Confirmed");
    await expect.poll(() => record(player, [...room, "monsters", "mage"])).toMatchObject({ spellcasting: { slotPools: { 1: { used: 1 } }, spellTurnState: { turnKey: "1:0:hero-token", spellCastCount: 1 } } });
    await dm.locator("#cancelSpellCastButton").click();

    await player.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen("battle"));
    await player.locator('.hg-token[data-token-id="hero-token"]').click();
    await player.locator("#combatActionBar").getByRole("tab", { name: /^Spells/ }).click();
    await player.locator('#combatActionBar [data-action-list]').getByRole("button", { name: /Long Ward/ }).click();
    await player.getByRole("button", { name: "Begin Casting", exact: true }).click();
    await expect.poll(() => record(dm, [...room, "characters", "hero"])).toMatchObject({ combat: { longCasting: { completedRounds: 1, status: "casting" } } });
    expect((await record(dm, [...room, "characters", "hero"])).magic.slotUsage?.normal?.[1] || 0).toBe(0);
    await player.reload();
    await player.evaluate(() => window.__HOMEBREW_GOD_RELEASE_TEST__.openScreen("battle"));
    await player.locator('.hg-token[data-token-id="hero-token"]').click();
    await expect(player.locator('[data-long-casting-panel]')).toContainText("1/10 rounds");
    for (let round = 2; round <= 10; round += 1) {
      await setRound(round);
      const next = player.locator('[data-long-casting-command="continue"]');
      await expect(next).toBeEnabled();
      await next.click();
      await expect.poll(() => record(dm, [...room, "characters", "hero"])).toMatchObject({ combat: { longCasting: { completedRounds: round } } });
    }
    await expect(player.locator("#confirmSpellCastButton")).toBeEnabled();
    expect((await record(dm, [...room, "characters", "hero"])).magic.slotUsage?.normal?.[1] || 0).toBe(0);
    await player.locator("#confirmSpellCastButton").click();
    await expect(player.locator("#confirmSpellCastButton")).toHaveText("Cast Confirmed");
    await expect.poll(() => record(dm, [...room, "characters", "hero"])).toMatchObject({ magic: { slotUsage: { normal: { 1: 1 } } }, combat: { longCasting: { status: "completed" }, concentration: null } });

    await player.locator("#cancelSpellCastButton").click();
    await player.evaluate(async ({ base, room }) => {
      const { getFirestore, doc, getDoc, updateDoc } = await import(base + "firebase-firestore.js");
      const ref = doc(getFirestore(), ...room, "characters", "hero");
      const current = (await getDoc(ref)).data();
      await updateDoc(ref, { revision: current.revision + 1, "magic.knownSpellIds": ["blur", "fire-bolt"] });
    }, { base: firebase, room });
    await setRound(11);
    const beforeInvalidTargets = await record(player, [...room, "combatTurns", "hero-token"]);
    await player.locator("#combatActionBar").getByRole("tab", { name: /^Spells/ }).click();
    const fireBolt = player.locator('#combatActionBar [data-action-list]').getByRole("button", { name: /^Fire Bolt/ });
    const target = player.locator('.hg-token[data-token-id="mage-token"]');
    const lockTarget = async () => { const rect = await target.boundingBox(); if (rect) await player.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2); };
    const moveMage = (patch) => dm.evaluate(async ({ base, room, patch }) => {
      const { getFirestore, doc, updateDoc } = await import(base + "firebase-firestore.js");
      await updateDoc(doc(getFirestore(), ...room, "tokens", "mage-token"), patch);
    }, { base: firebase, room, patch });
    await expect(fireBolt).toBeEnabled(); await fireBolt.click(); await lockTarget();
    await expect(player.locator("#confirmSpellCastButton")).toBeEnabled();
    const setHeroConditions = (conditions) => dm.evaluate(async ({ base, room, conditions }) => {
      const { getFirestore, doc, getDoc, updateDoc } = await import(base + "firebase-firestore.js");
      const ref = doc(getFirestore(), ...room, "characters", "hero");
      const current = (await getDoc(ref)).data();
      await updateDoc(ref, { revision: current.revision + 1, "combat.conditions": conditions });
    }, { base: firebase, room, conditions });
    await setHeroConditions(["Stunned"]);
    await player.locator("#confirmSpellCastButton").click();
    await expect(player.locator("#spellCastingResolution")).toContainText("incapacitated");
    expect((await record(player, [...room, "combatTurns", "hero-token"])).revision).toBe(beforeInvalidTargets.revision);
    await player.locator("#cancelSpellCastButton").click();
    await expect(fireBolt).toBeDisabled();
    await setHeroConditions([]);
    await expect(fireBolt).toBeEnabled(); await fireBolt.click(); await lockTarget();
    await moveMage({ x: 90 });
    await expect.poll(() => target.evaluateAll((elements) => elements.length === 0 || elements.some((element) => /left:\s*calc\(90%/.test(element.getAttribute("style") || "")))).toBe(true);
    if (await player.locator("#confirmSpellCastButton").isEnabled()) await player.locator("#confirmSpellCastButton").click();
    await expect(player.locator("#confirmSpellCastButton")).toBeDisabled();
    expect((await record(player, [...room, "combatTurns", "hero-token"])).revision).toBe(beforeInvalidTargets.revision);
    await player.locator("#cancelSpellCastButton").click();
    await moveMage({ x: 70, elevation: 200, elevationFeet: 200 });
    await expect.poll(async () => (await target.getAttribute("data-token-elevation"))).toBe("200");
    await fireBolt.click(); await lockTarget();
    await expect(player.locator("#confirmSpellCastButton")).toBeDisabled();
    await player.locator("#cancelSpellCastButton").click();
    await moveMage({ elevation: 0, elevationFeet: 0 });
    await expect(target).toHaveAttribute("data-token-elevation", "0");
    await fireBolt.click(); await lockTarget();
    await expect(player.locator("#confirmSpellCastButton")).toBeEnabled();
    await dm.evaluate(async ({ base, room }) => {
      const { getFirestore, doc, updateDoc } = await import(base + "firebase-firestore.js");
      await updateDoc(doc(getFirestore(), ...room), { "currentMap.id": "different-map", "currentMap.name": "Different map" });
    }, { base: firebase, room });
    await expect(player.locator("#battleMapNameText")).toContainText("Different map");
    // The map switch may cancel the panel outright; otherwise the captured scope must reject confirmation.
    if (await player.locator("#confirmSpellCastButton").isVisible() && await player.locator("#confirmSpellCastButton").isEnabled()) await player.locator("#confirmSpellCastButton").click();
    expect((await record(player, [...room, "combatTurns", "hero-token"])).revision).toBe(beforeInvalidTargets.revision);

    if (await player.locator("#cancelSpellCastButton").isVisible()) await player.locator("#cancelSpellCastButton").click();
    await record(dm, [...room, "scenes", "spell-floors"], { id: "spell-floors", roomCode, name: "Spell floors", schemaVersion: 1 });
    for (const [id, name, elevation] of [["ground", "Ground", 0], ["upper", "Upper", 20]]) {
      await record(dm, [...room, "scenes", "spell-floors", "floors", id], { id, roomCode, sceneId: "spell-floors", name, description: "", baseElevation: elevation, order: elevation, grid: {}, lighting: {}, map: { id: "same-map", name, url: "https://example.test/spell-map.svg", timeVariants: {} }, schemaVersion: 1 });
    }
    await dm.evaluate(async ({ base, room }) => {
      const { getFirestore, doc, updateDoc } = await import(base + "firebase-firestore.js");
      const db = getFirestore();
      await updateDoc(doc(db, ...room, "tokens", "hero-token"), { sceneId: "spell-floors", floorId: "ground" });
      await updateDoc(doc(db, ...room, "tokens", "mage-token"), { sceneId: "spell-floors", floorId: "ground" });
      await updateDoc(doc(db, ...room), { activeSceneId: "spell-floors", activeFloorId: "ground" });
    }, { base: firebase, room });
    await dm.locator('[data-floor-manage-toggle]').click();
    await dm.locator('[data-floor-location]').selectOption("spell-floors");
    await dm.keyboard.press("Escape");
    await expect(dm.locator('[data-floor-jump]')).toBeEnabled();
    await expect(player.locator('[data-floor-active]')).toContainText("Ground");
    await player.locator('.hg-token[data-token-id="hero-token"]').click();
    await player.locator("#combatActionBar").getByRole("tab", { name: /^Spells/ }).click();
    await fireBolt.click(); await lockTarget();
    await expect(player.locator("#confirmSpellCastButton")).toBeEnabled();
    await dm.locator('[data-floor-jump]').selectOption("upper");
    await expect(player.locator('[data-floor-active]')).toContainText("Upper");
    if (await player.locator("#confirmSpellCastButton").isVisible() && await player.locator("#confirmSpellCastButton").isEnabled()) await player.locator("#confirmSpellCastButton").click();
    expect((await record(player, [...room, "combatTurns", "hero-token"])).revision).toBe(beforeInvalidTargets.revision);
  } finally { await dmContext.close(); await playerContext.close(); }
});
